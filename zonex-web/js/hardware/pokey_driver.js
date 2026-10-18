/**
 * zonex-web/js/hardware/pokey_driver.js
 * Cycle-Exact 1.773447 MHz (PAL) / 1.7897725 MHz (NTSC) Atari 800XL CO12294 POKEY Chip Emulator
 * with Sample-Locked VBI Clocking and Sub-Frame Register Write Replay.
 *
 * Key Hardware Accuracy Features:
 * 1. Exact CO12294 Polynomial Shift Registers:
 *    - 4-bit poly (15 steps: XNOR bits 2,3)
 *    - 5-bit poly (31 steps: XNOR bits 2,4)
 *    - 9-bit poly (511 steps) & 17-bit poly (131,071 steps)
 *    All clocked at the exact 1.773447 MHz master clock (28 master ticks per 63.3374 kHz divider tick),
 *    preserving the exact integer harmonic ratios between (AUDF + 1) * 28 and 15 / 31.
 * 2. Exact Channel Logic & AUDCTL ($D208) Support:
 *    - 5-bit poly clock gating (when AUDC bit 7 == 0)
 *    - Toggle flip-flop in pure tone modes ($20, $60, $A0, $E0) vs D-latch in poly modes ($00, $40, $80, $C0)
 *    - 16-bit linked channels (1+2, 3+4), 1.79 MHz clock selection, and high-pass filters (ch1 by ch3, ch2 by ch4)
 *    - Phase-continuous AUDF reload latches (no artificial phase-reset clicks during frequency sweeps)
 * 3. Zero-Jitter Sample-Locked VBI & Cycle-Timestamped Sub-Frame Register Queue:
 *    - Eliminates the 60 Hz requestAnimationFrame vs 50 Hz PAL VBI beat-frequency stutter (16.7ms / 33.3ms gaps).
 *    - Replays every sub-frame 6502 write to $D200..$D20F ($75F2 music envelopes/vibrato, $57FE explosion,
 *      $59F9 VBI SFX) at its exact microsecond audio sample offset.
 * 4. Sub-Sample Box-Filtered Integration & Atari 800XL Analog Output Stage:
 *    - Anti-aliased master-clock box-filter integration across each output sample
 *    - Authentic non-linear 4-channel open-drain MOSFET DAC curve + 20 Hz AC-coupling + 13 kHz RC low-pass.
 */

const POLY4_TABLE = new Uint8Array([0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1]);
const POLY5_TABLE = new Uint8Array([
  0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1,
  0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1,
]);

const POLY9_TABLE = (() => {
  const arr = new Uint8Array(511);
  let sr = 0x1FF;
  for (let i = 0; i < 511; i++) {
    arr[i] = sr & 1;
    const fb = (((sr >> 8) ^ (sr >> 3)) & 1) ^ 1;
    sr = ((sr << 1) | fb) & 0x1FF;
    if (sr === 0) sr = 0x1FF;
  }
  return arr;
})();

const POLY17_TABLE = (() => {
  const arr = new Uint8Array(131071);
  let sr = 0x1FFFF;
  for (let i = 0; i < 131071; i++) {
    arr[i] = sr & 1;
    const fb = (((sr >> 16) ^ (sr >> 11)) & 1) ^ 1;
    sr = ((sr << 1) | fb) & 0x1FFFF;
    if (sr === 0) sr = 0x1FFFF;
  }
  return arr;
})();

export class PokeyDriver {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.audioCtx = null;
    this.scriptNode = null;
    this.muted = false;
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";

    // Target VBI refresh rate (50 Hz PAL or 60 Hz NTSC)
    this.targetHz = 50;
    this.masterClockHz = 1773447.0; // PAL 1.773447 MHz (NTSC: 1789772.5 Hz)

    // Exact POKEY hardware state
    this.regs = new Uint8Array(16);
    this.div = new Int32Array([1, 1, 1, 1]);
    this.outBit = new Uint8Array([0, 0, 0, 0]);
    this.hpFlop = new Uint8Array([1, 1]);
    this.p4 = 0;
    this.p5 = 0;
    this.p9 = 0;
    this.p17 = 0;
    this.prescalerCount = 28;
    this.clockFrac = 0.0;
    this.currentDac = 0.0;

    // Analog output stage state (AC-coupling high-pass + RC low-pass)
    this.hpPrevIn = 0.0;
    this.hpPrevOut = 0.0;
    this.lpOut = 0.0;

    // Sample-locked VBI & sub-frame register event queue
    this.frameStepper = null;
    this.sampleInFrame = 0.0;
    this.pendingEvents = [];
    this.eventCursor = 0;
    this.currentFrameTotalCycles = 27000;
    this.lastAudioCallbackTime = 0;
    this.framesSteppedSinceRender = 0;
    this.transitionMuteSamples = 0;
    this.fadeInSamples = 0;
    this.fadeInTotal = 240;

    // Lockstep test state for Oracle 2 & 3
    this.channels = [
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
    ];
  }

  /**
   * Immediately zeroes all POKEY hardware registers ($D200..$D20F), clears queued sub-frame events,
   * resets analog filter state, and applies a brief silence window (default 55 ms) so screen/level
   * transitions never leave hanging tones or clicks.
   */
  silenceAll(muteMs = 55) {
    const ram = this.memory.ram;
    for (let i = 0; i < 16; i++) {
      ram[0xD200 + i] = 0x00;
      this.regs[i] = 0x00;
    }
    this.div.fill(1);
    this.outBit.fill(0);
    this.hpFlop.fill(0);
    this.currentDac = 0.0;
    this.hpPrevIn = 0.0;
    this.hpPrevOut = 0.0;
    this.lpOut = 0.0;
    this.pendingEvents = [];
    this.eventCursor = 0;
    const sr = (this.audioCtx && this.audioCtx.sampleRate) ? this.audioCtx.sampleRate : 48000;
    this.transitionMuteSamples = Math.max(0, Math.round((sr * muteMs) / 1000.0));
    this.fadeInTotal = Math.max(1, Math.round((sr * 6.0) / 1000.0));
    this.fadeInSamples = this.fadeInTotal;
  }

  /**
   * Applies a brief zero-volume mute window and filter reset across native 6502 section/level transitions
   * while preserving the newly initialized screen's POKEY register state.
   */
  triggerTransitionMute(muteMs = 55) {
    this.hpPrevIn = 0.0;
    this.hpPrevOut = 0.0;
    this.lpOut = 0.0;
    const sr = (this.audioCtx && this.audioCtx.sampleRate) ? this.audioCtx.sampleRate : 48000;
    this.transitionMuteSamples = Math.max(0, Math.round((sr * muteMs) / 1000.0));
    this.fadeInTotal = Math.max(1, Math.round((sr * 6.0) / 1000.0));
    this.fadeInSamples = this.fadeInTotal;
  }

  setTargetHz(hz) {
    this.targetHz = hz === 60 ? 60 : 50;
    this.masterClockHz = this.targetHz === 60 ? 1789772.5 : 1773447.0;
  }

  setFrameStepper(fn) {
    this.frameStepper = fn;
  }

  enqueueFrameEvents(events, totalCycles) {
    this.pendingEvents = events ? events.slice() : [];
    this.eventCursor = 0;
    this.currentFrameTotalCycles = Math.max(1, totalCycles || 27000);
    this.sampleInFrame = 0.0;
    this.syncRegistersFromRam();
  }

  isAudioClockActive() {
    if (!this.audioCtx || this.audioCtx.state !== "running") return false;
    return this.lastAudioCallbackTime > 0 && (performance.now() - this.lastAudioCallbackTime) < 55.0;
  }

  consumeRenderedFrameFlag() {
    if (this.framesSteppedSinceRender > 0) {
      this.framesSteppedSinceRender = 0;
      return true;
    }
    return false;
  }

  syncRegistersFromRam() {
    const ram = this.memory.ram;
    for (let i = 0; i < 9; i++) {
      this.writeRegister(0xD200 + i, ram[0xD200 + i]);
    }
  }

  writeRegister(addr, val) {
    const reg = addr & 0x0F;
    val &= 0xFF;
    const prev = this.regs[reg];
    this.regs[reg] = val;

    if (reg < 8) {
      const ch = reg >> 1;
      if ((reg & 1) === 0) {
        // AUDF1..4 ($D200, $D202, $D204, $D206):
        // Phase-continuous reload latch; only clamp if current down-counter exceeds new period
        const period = val + 1;
        if (this.div[ch] > period) {
          this.div[ch] = period;
        }
      } else {
        // AUDC1..4 ($D201, $D203, $D205, $D207):
        // If channel was previously silent (vol == 0) and now turns on, reload divider immediately for crisp attack
        if ((prev & 0x0F) === 0 && (val & 0x0F) !== 0) {
          this.div[ch] = this.regs[ch << 1] + 1;
        }
      }
    } else if (reg === 0x09) {
      // STIMER ($D209): Reset all 4 channel dividers to AUDF + 1
      for (let ch = 0; ch < 4; ch++) {
        this.div[ch] = this.regs[ch << 1] + 1;
      }
    }
    this.updateDacLevel();
  }

  clockChannelPulse(ch, p4Bit, p5Bit, polyBit) {
    const audc = this.regs[(ch << 1) + 1];
    // Bit 7 (0x80): when 0, clock pulse is gated by 5-bit polynomial counter
    if ((audc & 0x80) !== 0 || p5Bit !== 0) {
      if ((audc & 0x20) !== 0) {
        // Bit 5 (0x20): Pure tone flip-flop toggle ($20, $60, $A0, $E0)
        this.outBit[ch] ^= 1;
      } else {
        // Bit 5 == 0: Noise D-flip-flop samples 4-bit poly (bit 6 = 1) or 9/17-bit poly (bit 6 = 0)
        this.outBit[ch] = (audc & 0x40) !== 0 ? p4Bit : polyBit;
      }
    }
  }

  tickBaseClockDividers() {
    const audctl = this.regs[8];
    const p4Bit = POLY4_TABLE[this.p4];
    const p5Bit = POLY5_TABLE[this.p5];
    const polyBit = (audctl & 0x80) !== 0 ? POLY9_TABLE[this.p9] : POLY17_TABLE[this.p17];

    const underflow = [false, false, false, false];

    // Channel 1 & 2 (either independent 8-bit or linked 16-bit when AUDCTL bit 4 = 0x10)
    if ((audctl & 0x10) !== 0) {
      this.div[0]--;
      if (this.div[0] <= 0) {
        const period16 = ((this.regs[2] << 8) | this.regs[0]) + 1;
        this.div[0] = period16;
        underflow[0] = true;
        underflow[1] = true;
        this.clockChannelPulse(0, p4Bit, p5Bit, polyBit);
        this.clockChannelPulse(1, p4Bit, p5Bit, polyBit);
      }
    } else {
      for (let ch = 0; ch < 2; ch++) {
        this.div[ch]--;
        if (this.div[ch] <= 0) {
          this.div[ch] = this.regs[ch << 1] + 1;
          underflow[ch] = true;
          this.clockChannelPulse(ch, p4Bit, p5Bit, polyBit);
        }
      }
    }

    // Channel 3 & 4 (either independent 8-bit or linked 16-bit when AUDCTL bit 3 = 0x08)
    if ((audctl & 0x08) !== 0) {
      this.div[2]--;
      if (this.div[2] <= 0) {
        const period16 = ((this.regs[6] << 8) | this.regs[4]) + 1;
        this.div[2] = period16;
        underflow[2] = true;
        underflow[3] = true;
        this.clockChannelPulse(2, p4Bit, p5Bit, polyBit);
        this.clockChannelPulse(3, p4Bit, p5Bit, polyBit);
      }
    } else {
      for (let ch = 2; ch < 4; ch++) {
        this.div[ch]--;
        if (this.div[ch] <= 0) {
          this.div[ch] = this.regs[ch << 1] + 1;
          underflow[ch] = true;
          this.clockChannelPulse(ch, p4Bit, p5Bit, polyBit);
        }
      }
    }

    // High-pass filters (AUDCTL bit 2 = ch1 clocked by ch3; bit 1 = ch2 clocked by ch4)
    if ((audctl & 0x04) !== 0) {
      if (underflow[2]) this.hpFlop[0] = this.outBit[0];
    } else {
      this.hpFlop[0] = 0;
    }
    if ((audctl & 0x02) !== 0) {
      if (underflow[3]) this.hpFlop[1] = this.outBit[1];
    } else {
      this.hpFlop[1] = 0;
    }

    this.updateDacLevel();
  }

  updateDacLevel() {
    const audctl = this.regs[8];
    let sumVol = 0;

    for (let ch = 0; ch < 4; ch++) {
      const audc = this.regs[(ch << 1) + 1];
      const vol = audc & 0x0F;
      if (vol === 0) continue;

      if ((audc & 0x10) !== 0) {
        // Volume-only DAC mode (Bit 4)
        sumVol += vol;
      } else {
        let bit = this.outBit[ch];
        if (ch === 0 && (audctl & 0x04) !== 0) bit ^= this.hpFlop[0];
        if (ch === 1 && (audctl & 0x02) !== 0) bit ^= this.hpFlop[1];
        if (bit !== 0) {
          sumVol += vol;
        }
      }
    }

    // Authentic Atari 800XL non-linear 4-channel open-drain MOSFET DAC curve (0..60 -> 0..1)
    const norm = sumVol / 60.0;
    this.currentDac = norm * (1.25 - 0.25 * norm);
  }

  synthesizeBuffer(chan0, sampleRate, allowFrameStep = false) {
    if (allowFrameStep) {
      this.lastAudioCallbackTime = performance.now();
    }
    const sr = sampleRate || 48000;
    const samplesPerFrame = sr / this.targetHz;
    const masterPerSample = this.masterClockHz / sr;

    // Analog filter coefficients (22 Hz AC-coupling high-pass + 13 kHz RC low-pass)
    const hpR = Math.exp((-2.0 * Math.PI * 22.0) / sr);
    const lpAlpha = 1.0 - Math.exp((-2.0 * Math.PI * 13000.0) / sr);

    if (!allowFrameStep || !this.frameStepper) {
      this.syncRegistersFromRam();
    }

    for (let i = 0; i < chan0.length; i++) {
      if (allowFrameStep && this.frameStepper) {
        if (this.sampleInFrame >= samplesPerFrame) {
          this.sampleInFrame -= samplesPerFrame;
          const frameInfo = this.frameStepper();
          if (frameInfo) {
            this.pendingEvents = frameInfo.events || [];
            this.eventCursor = 0;
            this.currentFrameTotalCycles = Math.max(1, frameInfo.totalCycles || 27000);
            this.framesSteppedSinceRender++;
          } else {
            this.syncRegistersFromRam();
          }
        }

        // Replay all sub-frame 6502 POKEY register writes up to the current sample's CPU cycle
        if (this.pendingEvents && this.eventCursor < this.pendingEvents.length) {
          const targetCycle = (this.sampleInFrame / samplesPerFrame) * this.currentFrameTotalCycles;
          while (
            this.eventCursor < this.pendingEvents.length &&
            this.pendingEvents[this.eventCursor].cycle <= targetCycle
          ) {
            const ev = this.pendingEvents[this.eventCursor++];
            this.writeRegister(ev.addr, ev.val);
          }
        }
        this.sampleInFrame += 1.0;
      } else if (this.pendingEvents && this.eventCursor < this.pendingEvents.length) {
        const targetCycle = (this.sampleInFrame / samplesPerFrame) * this.currentFrameTotalCycles;
        while (
          this.eventCursor < this.pendingEvents.length &&
          this.pendingEvents[this.eventCursor].cycle <= targetCycle
        ) {
          const ev = this.pendingEvents[this.eventCursor++];
          this.writeRegister(ev.addr, ev.val);
        }
        this.sampleInFrame += 1.0;
      }

      // Advance 1.773447 MHz POKEY master clock across this audio sample with sub-sample box integration
      this.clockFrac += masterPerSample;
      let remTicks = this.clockFrac | 0;
      this.clockFrac -= remTicks;
      if (remTicks < 1) remTicks = 1;

      const totalTicks = remTicks;
      let dacAccum = 0.0;

      while (remTicks > 0) {
        const step = remTicks < this.prescalerCount ? remTicks : this.prescalerCount;
        dacAccum += this.currentDac * step;
        remTicks -= step;
        this.prescalerCount -= step;

        this.p4 = (this.p4 + step) % 15;
        this.p5 = (this.p5 + step) % 31;
        this.p9 = (this.p9 + step) % 511;
        this.p17 = (this.p17 + step) % 131071;

        if (this.prescalerCount <= 0) {
          this.prescalerCount = (this.regs[8] & 0x01) !== 0 ? 114 : 28;
          this.tickBaseClockDividers();
        }
      }

      const rawUnipolar = dacAccum / totalTicks;

      // 1-pole AC-coupling high-pass filter (removes DC offset smoothly without step clicks)
      const hpOut = rawUnipolar - this.hpPrevIn + hpR * this.hpPrevOut;
      this.hpPrevIn = rawUnipolar;
      this.hpPrevOut = hpOut;

      // 1-pole analog RC low-pass filter (~13 kHz Atari monitor rolloff)
      this.lpOut += lpAlpha * (hpOut - this.lpOut);

      if (this.muted || this.transitionMuteSamples > 0) {
        if (this.transitionMuteSamples > 0) {
          this.transitionMuteSamples--;
          this.hpPrevIn = rawUnipolar;
          this.hpPrevOut = 0.0;
          this.lpOut = 0.0;
        }
        chan0[i] = 0.0;
      } else {
        let gain = 1.65;
        if (this.fadeInSamples > 0) {
          const progress = 1.0 - (this.fadeInSamples / Math.max(1, this.fadeInTotal));
          gain *= progress;
          this.fadeInSamples--;
        }
        const sample = this.lpOut * gain;
        chan0[i] = Math.max(-0.98, Math.min(0.98, sample));
      }
    }
  }

  async enableAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.audioCtx = new AudioContextClass({ latencyHint: "interactive" });
        const sr = this.audioCtx.sampleRate || 48000;
        this.syncRegistersFromRam();
        this.sampleInFrame = sr / this.targetHz;
        // 512-sample buffer (~10.6ms at 48kHz) for ultra-low input-to-sound latency
        this.scriptNode = this.audioCtx.createScriptProcessor(512, 0, 1);
        this.scriptNode.onaudioprocess = (e) => {
          const out = e.outputBuffer.getChannelData(0);
          this.synthesizeBuffer(out, sr, true);
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
