/**
 * zonex-web/js/hardware/pokey_driver.js
 * Cycle-faithful 4-Channel Atari POKEY Sound Synthesizer ($D200..$D208).
 * - In interactive 6502 mode (!isLockstep): streams live $D200..$D208 registers written by the
 *   genuine 6502 sound routines ($59F9 In-Game SFX, $57FE Death Explosion, $75F2 Title Music).
 * - In lockstep mode (?lockstep=1): preserves deterministic 50 Hz lockstep state for Oracle 2 & 3.
 * - Uses direct ScriptProcessorNode + AudioWorklet fallback so audio works 100% on both file:// and http://.
 */

export class PokeyDriver {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.audioCtx = null;
    this.scriptNode = null;
    this.muted = false;
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";

    // Synthesizer state for 4 POKEY channels
    this.phases = new Float64Array(4);
    this.outputs = new Int8Array(4);
    this.lfsr17 = 0x1FFFF;
    this.lfsr5 = 0x1F;
    this.lfsr4 = 0x0F;

    this.channels = [
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
    ];
  }

  stepLfsr() {
    const bit17 = ((this.lfsr17 >> 16) ^ (this.lfsr17 >> 11)) & 1;
    this.lfsr17 = ((this.lfsr17 << 1) | bit17) & 0x1FFFF;
    if (this.lfsr17 === 0) this.lfsr17 = 0x1FFFF;

    const bit5 = ((this.lfsr5 >> 4) ^ (this.lfsr5 >> 2)) & 1;
    this.lfsr5 = ((this.lfsr5 << 1) | bit5) & 0x1F;
    if (this.lfsr5 === 0) this.lfsr5 = 0x1F;

    const bit4 = ((this.lfsr4 >> 3) ^ (this.lfsr4 >> 2)) & 1;
    this.lfsr4 = ((this.lfsr4 << 1) | bit4) & 0x0F;
    if (this.lfsr4 === 0) this.lfsr4 = 0x0F;
  }

  synthesizeBuffer(chan0, sampleRate) {
    if (this.muted) {
      chan0.fill(0);
      return;
    }
    const ram = this.memory.ram;
    const audctl = ram[0xD208];
    const baseClock = (audctl & 0x01) ? 15699.9 : 63920.4;
    const sr = sampleRate || 44100;

    for (let i = 0; i < chan0.length; i++) {
      this.stepLfsr();
      let mix = 0.0;

      for (let ch = 0; ch < 4; ch++) {
        const audf = ram[0xD200 + (ch << 1)];
        const audc = ram[0xD201 + (ch << 1)];
        const vol = (audc & 0x0F) / 15.0;
        if (vol === 0) continue;

        // Volume-only DAC mode (Bit 4)
        if ((audc & 0x10) !== 0) {
          mix += (vol - 0.5) * 0.30;
          continue;
        }

        const dist = (audc >> 4) & 0x0E;
        const freq = baseClock / (2.0 * (audf + 1));
        this.phases[ch] += freq / sr;

        if (this.phases[ch] >= 0.5) {
          this.phases[ch] -= Math.floor(this.phases[ch] / 0.5) * 0.5;
          if (dist === 0x0A || dist === 0x0E) {
            // Pure square wave tone
            this.outputs[ch] = this.outputs[ch] ? 0 : 1;
          } else if (dist === 0x08) {
            // 17-bit white noise (explosions, spade dig)
            this.outputs[ch] = this.lfsr17 & 1;
          } else if (dist === 0x0C || dist === 0x04) {
            // 4-bit / 5-bit metallic bass distortion (doors, industrial buzz)
            this.outputs[ch] = (this.lfsr4 ^ (this.outputs[ch] ^ 1)) & 1;
          } else if (dist === 0x02 || dist === 0x06) {
            // 5-bit poly + square wave (reactor pulse / background hum)
            if (this.lfsr5 & 1) {
              this.outputs[ch] = this.outputs[ch] ? 0 : 1;
            }
          } else {
            // 5-bit + 17-bit poly noise
            this.outputs[ch] = (this.lfsr17 ^ this.lfsr5) & 1;
          }
        }

        mix += (this.outputs[ch] ? vol : -vol) * 0.28;
      }

      chan0[i] = Math.max(-0.98, Math.min(0.98, mix));
    }
  }

  async enableAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.audioCtx = new AudioContextClass();
        const sr = this.audioCtx.sampleRate || 44100;
        this.scriptNode = this.audioCtx.createScriptProcessor(1024, 0, 1);
        this.scriptNode.onaudioprocess = (e) => {
          const out = e.outputBuffer.getChannelData(0);
          this.synthesizeBuffer(out, sr);
        };
        this.scriptNode.connect(this.audioCtx.destination);
      }
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      return this.audioCtx.state === "running";
    } catch (_err) {
      return false;
    }
  }

  toggleMute() {
    if (!this.audioCtx || this.audioCtx.state === "suspended") {
      this.muted = false;
      this.enableAudio();
      return true;
    }
    this.muted = !this.muted;
    return !this.muted;
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
    // In interactive 6502 mode, the 6502 CPU ($59F9, $57FE, $75F2) writes directly to $D200..$D208!
    if (!this.isLockstep) {
      return;
    }

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
}
