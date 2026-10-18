/**
 * zonex-web/js/hardware/pokey_driver.js
 * 1:1 Port of the 6502 POKEY Sound Driver at $7A00..$7BFF (Dossier 05).
 * Updates $D200..$D208 in memory_state at 50.00 Hz PAL VBI rate and streams to AudioWorklet.
 * Uses a Blob URL for AudioWorklet registration so it works on both file:// and http://.
 */

const POKEY_WORKLET_SOURCE = `
class PokeyWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.regs = new Uint8Array(9);
    this.phases = new Float64Array(4);
    this.outputs = new Int8Array(4);
    this.lfsr17 = 0x1FFFF;
    this.lfsr5 = 0x1F;
    this.lfsr4 = 0x0F;

    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "POKEY_REGS") {
        const r = e.data.regs;
        for (let i = 0; i < 9 && i < r.length; i++) {
          this.regs[i] = r[i] & 0xFF;
        }
      }
    };
  }

  stepLfsr() {
    const bit17 = ((this.lfsr17 >> 16) ^ (this.lfsr17 >> 11)) & 1;
    this.lfsr17 = ((this.lfsr17 << 1) | bit17) & 0x1FFFF;
    const bit5 = ((this.lfsr5 >> 4) ^ (this.lfsr5 >> 2)) & 1;
    this.lfsr5 = ((this.lfsr5 << 1) | bit5) & 0x1F;
    const bit4 = ((this.lfsr4 >> 3) ^ (this.lfsr4 >> 2)) & 1;
    this.lfsr4 = ((this.lfsr4 << 1) | bit4) & 0x0F;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const chan0 = output[0];
    const baseClock = 63920.4;
    const sr = sampleRate || 44100;

    for (let i = 0; i < chan0.length; i++) {
      this.stepLfsr();
      let mix = 0.0;

      for (let ch = 0; ch < 4; ch++) {
        const audf = this.regs[ch * 2];
        const audc = this.regs[ch * 2 + 1];
        const vol = (audc & 0x0F) / 15.0;
        const dist = (audc >> 4) & 0x0F;

        if (vol === 0) continue;

        if ((audc & 0x10) !== 0) {
          mix += (vol - 0.5) * 0.25;
          continue;
        }

        const freq = baseClock / (2.0 * (audf + 1));
        this.phases[ch] += freq / sr;
        if (this.phases[ch] >= 0.5) {
          this.phases[ch] -= 0.5;
          if (dist === 0x0A || dist === 0x0E) {
            this.outputs[ch] = this.outputs[ch] ? 0 : 1;
          } else if (dist === 0x08) {
            this.outputs[ch] = this.lfsr17 & 1;
          } else if (dist === 0x0C || dist === 0x04) {
            this.outputs[ch] = (this.lfsr4 ^ this.lfsr5) & 1;
          } else {
            this.outputs[ch] = (this.lfsr17 ^ (this.outputs[ch] ^ 1)) & 1;
          }
        }
        mix += (this.outputs[ch] ? vol : -vol) * 0.22;
      }

      chan0[i] = Math.max(-1.0, Math.min(1.0, mix));
    }

    return true;
  }
}
registerProcessor("pokey-worklet-processor", PokeyWorkletProcessor);
`;

export class PokeyDriver {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.audioCtx = null;
    this.workletNode = null;
    this.channels = [
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
    ];
  }

  async enableAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 44100 });
    const blob = new Blob([POKEY_WORKLET_SOURCE], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);
    await this.audioCtx.audioWorklet.addModule(workletUrl);
    this.workletNode = new AudioWorkletNode(this.audioCtx, "pokey-worklet-processor");
    this.workletNode.connect(this.audioCtx.destination);
    this.syncWorklet();
  }

  triggerSfx(sfxId, ch = 0, duration = 12, priority = 1) {
    const idx = ch & 0x03;
    const slot = this.channels[idx];
    if (!slot.active || priority >= slot.priority) {
      slot.active = true;
      slot.sfxId = sfxId & 0xFF;
      slot.step = 0;
      slot.duration = duration;
      slot.priority = priority;
    }
  }

  tickFrame() {
    const ram = this.memory.ram;
    const sweep = this.bundle.audio_tables.freq_sweep;
    const env = this.bundle.audio_tables.envelope;
    const notes = this.bundle.audio_tables.notes;

    for (let ch = 0; ch < 4; ch++) {
      const slot = this.channels[ch];
      const regF = 0xD200 + ch * 2;
      const regC = 0xD201 + ch * 2;

      if (!slot.active) {
        ram[regF] = 0x00;
        ram[regC] = 0x00;
        continue;
      }

      const idx = slot.step & 0x1F;
      let audf = 0;
      let audc = 0;

      if (slot.sfxId === 1) {
        audf = (sweep[idx] + 0x20) & 0xFF;
        audc = 0x80 | Math.max(1, 6 - (slot.step >> 1));
      } else if (slot.sfxId === 2) {
        audf = (notes[idx] ^ (slot.step * 7)) & 0xFF;
        audc = 0xA0 | Math.max(2, 12 - slot.step);
      } else if (slot.sfxId === 3) {
        audf = (env[idx] + slot.step * 4) & 0xFF;
        audc = 0xC0 | Math.max(1, 10 - slot.step);
      } else if (slot.sfxId === 4) {
        audf = (sweep[(31 - idx) & 0x1F] + 0x10) & 0xFF;
        audc = 0xA0 | Math.max(2, 14 - slot.step);
      } else if (slot.sfxId === 5) {
        audf = (sweep[idx] ^ env[idx]) & 0xFF;
        audc = 0x40 | Math.max(2, 13 - (slot.step >> 1));
      } else {
        audf = (0x40 + ((slot.step & 3) << 4)) & 0xFF;
        audc = 0xA0 | 0x0C;
      }

      ram[regF] = audf;
      ram[regC] = audc;

      slot.step++;
      if (slot.step >= slot.duration) {
        slot.active = false;
        slot.priority = 0;
      }
    }

    ram[0xD208] = 0x00;
    this.syncWorklet();
  }

  getPokeyRegs() {
    const ram = this.memory.ram;
    return [
      ram[0xD200], ram[0xD201],
      ram[0xD202], ram[0xD203],
      ram[0xD204], ram[0xD205],
      ram[0xD206], ram[0xD207],
      ram[0xD208],
    ];
  }

  syncWorklet() {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: "POKEY_REGS",
        regs: this.getPokeyRegs(),
      });
    }
  }
}
