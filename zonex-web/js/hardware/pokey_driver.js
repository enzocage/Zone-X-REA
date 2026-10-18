/**
 * zonex-web/js/hardware/pokey_driver.js
 * 1:1 Port of the 6502 POKEY Sound Driver at $7A00..$7BFF (Dossier 05).
 * Updates $D200..$D208 in memory_state at 50.00 Hz PAL VBI rate and streams to AudioWorklet.
 */

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
    this.registerLog = [];
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
    await this.audioCtx.audioWorklet.addModule("js/hardware/pokey_worklet.js");
    this.workletNode = new AudioWorkletNode(this.audioCtx, "pokey-worklet-processor");
    this.workletNode.connect(this.audioCtx.destination);
    this.syncWorklet();
  }

  /**
   * Triggers a sound effect ($7B00) on one of the 4 POKEY channels:
   * sfxId:
   *   1 = Footstep / Walk tick
   *   2 = Pickup item (KEY, SPADE, MATS, PLUTONIUM, BONUS, TIME)
   *   3 = Mat drop / Spade dig CRUMBLY
   *   4 = Container decontamination / Door unlock
   *   5 = Warp teleport / Air-door cycle
   *   6 = Radiation timer warning / Out of Time
   */
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

  /**
   * Executes one 50 Hz VBI tick of the $7A00 POKEY driver and writes $D200..$D208.
   */
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
        // Walk tick
        audf = (sweep[idx] + 0x20) & 0xFF;
        audc = 0x80 | Math.max(1, 6 - (slot.step >> 1));
      } else if (slot.sfxId === 2) {
        // Pickup chime
        audf = (notes[idx] ^ (slot.step * 7)) & 0xFF;
        audc = 0xA0 | Math.max(2, 12 - slot.step);
      } else if (slot.sfxId === 3) {
        // Dig / Mat placement
        audf = (env[idx] + slot.step * 4) & 0xFF;
        audc = 0xC0 | Math.max(1, 10 - slot.step);
      } else if (slot.sfxId === 4) {
        // Decontamination container
        audf = (sweep[(31 - idx) & 0x1F] + 0x10) & 0xFF;
        audc = 0xA0 | Math.max(2, 14 - slot.step);
      } else if (slot.sfxId === 5) {
        // Warp / Airdoor
        audf = (sweep[idx] ^ env[idx]) & 0xFF;
        audc = 0x40 | Math.max(2, 13 - (slot.step >> 1));
      } else {
        // Alarm / Out of Time
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

    ram[0xD208] = 0x00; // AUDCTL
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
