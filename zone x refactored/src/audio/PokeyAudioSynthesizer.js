/**
 * src/audio/PokeyAudioSynthesizer.js
 * Clean 4-Channel Atari 800XL POKEY (CO12294) Audio Synthesizer.
 * Features sample-locked frame timing, polynomial LFSR noise generators,
 * non-linear 4-channel DAC mixing, AC-coupling high-pass / RC low-pass filters,
 * and automatic 55ms zero-volume transition muting with smooth fade-in.
 */

import { RefreshStandard, SystemAddressMap } from "../config/Constants.js";

const LFSR_TABLES = (() => {
  const poly4 = new Uint8Array(15);
  let s4 = 0x00;
  for (let i = 0; i < 15; i++) {
    const bit0 = s4 & 1;
    const bit1 = (s4 >> 1) & 1;
    const feedback = (bit0 ^ bit1 ^ 1) & 1;
    poly4[i] = bit0;
    s4 = (s4 >> 1) | (feedback << 3);
  }

  const poly5 = new Uint8Array(31);
  let s5 = 0x00;
  for (let i = 0; i < 31; i++) {
    const bit0 = s5 & 1;
    const bit2 = (s5 >> 2) & 1;
    const feedback = (bit0 ^ bit2 ^ 1) & 1;
    poly5[i] = bit0;
    s5 = (s5 >> 1) | (feedback << 4);
  }

  const poly9 = new Uint8Array(511);
  let s9 = 0x1FF;
  for (let i = 0; i < 511; i++) {
    poly9[i] = s9 & 1;
    const feedback = ((s9 & 1) ^ ((s9 >> 5) & 1)) & 1;
    s9 = (s9 >> 1) | (feedback << 8);
  }

  const poly17 = new Uint8Array(131071);
  let s17 = 0x1FFFF;
  for (let i = 0; i < 131071; i++) {
    poly17[i] = s17 & 1;
    const feedback = ((s17 & 1) ^ ((s17 >> 5) & 1)) & 1;
    s17 = (s17 >> 1) | (feedback << 16);
  }

  return { poly4, poly5, poly9, poly17 };
})();

export class PokeyAudioSynthesizer {
  constructor(gameState) {
    this.state = gameState;
    this.audioCtx = null;
    this.scriptNode = null;
    this.muted = false;

    this.targetHz = RefreshStandard.PAL_50HZ.hz;
    this.masterClockHz = RefreshStandard.PAL_50HZ.masterClockHz;

    this.registers = new Uint8Array(16);
    this.dividers = new Int32Array([1, 1, 1, 1]);
    this.outputBits = new Uint8Array([0, 0, 0, 0]);
    this.highPassFlipFlops = new Uint8Array([1, 1]);

    this.poly4Cursor = 0;
    this.poly5Cursor = 0;
    this.poly9Cursor = 0;
    this.poly17Cursor = 0;
    this.prescalerCounter = 28;
    this.masterClockRemainder = 0.0;
    this.currentDacLevel = 0.0;

    // Analog output filter state
    this.hpPrevInput = 0.0;
    this.hpPrevOutput = 0.0;
    this.lpOutput = 0.0;

    // Sample-locked frame stepping & sub-frame register write queue
    this.frameStepCallback = null;
    this.sampleInFrame = 0.0;
    this.pendingEvents = [];
    this.eventCursor = 0;
    this.currentFrameTotalCycles = 27000;
    this.lastAudioCallbackTime = 0;
    this.framesSteppedSinceRender = 0;

    // Transition envelope state
    this.transitionMuteSamples = 0;
    this.fadeInSamples = 0;
    this.fadeInTotal = 240;
  }

  setRefreshRate(hz) {
    const std = hz === 60 ? RefreshStandard.NTSC_60HZ : RefreshStandard.PAL_50HZ;
    this.targetHz = std.hz;
    this.masterClockHz = std.masterClockHz;
  }

  setFrameStepper(callback) {
    this.frameStepCallback = callback;
  }

  isAudioClockActive() {
    if (!this.audioCtx || this.audioCtx.state !== "running") return false;
    return (
      this.lastAudioCallbackTime > 0 &&
      performance.now() - this.lastAudioCallbackTime < 55.0
    );
  }

  consumeRenderedFrameFlag() {
    if (this.framesSteppedSinceRender > 0) {
      this.framesSteppedSinceRender = 0;
      return true;
    }
    return false;
  }

  /**
   * Immediately zeroes all POKEY hardware registers, clears queued sub-frame events,
   * resets analog filters, and mutes output for `muteMs` milliseconds.
   */
  silenceAll(muteMs = 55) {
    const ram = this.state.ram;
    for (let i = 0; i < 16; i++) {
      ram[SystemAddressMap.POKEY_BASE + i] = 0x00;
      this.registers[i] = 0x00;
    }
    this.dividers.fill(1);
    this.outputBits.fill(0);
    this.highPassFlipFlops.fill(0);
    this.currentDacLevel = 0.0;
    this.hpPrevInput = 0.0;
    this.hpPrevOutput = 0.0;
    this.lpOutput = 0.0;
    this.pendingEvents = [];
    this.eventCursor = 0;
    this.triggerTransitionMute(muteMs);
  }

  /**
   * Applies a brief zero-volume mute window and smooth 6ms fade-in across transitions.
   */
  triggerTransitionMute(muteMs = 55) {
    this.hpPrevInput = 0.0;
    this.hpPrevOutput = 0.0;
    this.lpOutput = 0.0;
    const sr = this.audioCtx && this.audioCtx.sampleRate ? this.audioCtx.sampleRate : 48000;
    this.transitionMuteSamples = Math.max(0, Math.round((sr * muteMs) / 1000.0));
    this.fadeInTotal = Math.max(1, Math.round((sr * 6.0) / 1000.0));
    this.fadeInSamples = this.fadeInTotal;
  }

  enqueueFrameEvents(events, totalCycles) {
    this.pendingEvents = events ? events.slice() : [];
    this.eventCursor = 0;
    this.currentFrameTotalCycles = Math.max(1, totalCycles || 27000);
    this.sampleInFrame = 0.0;
    this.syncRegistersFromRam();
  }

  syncRegistersFromRam() {
    const ram = this.state.ram;
    for (let i = 0; i < 9; i++) {
      this.writeRegister(SystemAddressMap.POKEY_BASE + i, ram[SystemAddressMap.POKEY_BASE + i]);
    }
  }

  writeRegister(addr, val) {
    const reg = addr & 0x0F;
    val &= 0xFF;
    const prev = this.registers[reg];
    this.registers[reg] = val;

    if (reg < 8 && (reg & 1) === 0) {
      const ch = reg >> 1;
      if (this.dividers[ch] > val + 1 || prev !== val) {
        this.dividers[ch] = Math.min(this.dividers[ch], val + 1);
      }
    }
    this.updateDacLevel();
  }

  getActiveRegisters() {
    return Array.from(this.registers.slice(0, 9));
  }

  clockChannelPulse(ch, p4Bit, p5Bit, polyBit) {
    const audc = this.registers[(ch << 1) + 1];
    if ((audc & 0x10) !== 0) return;

    if ((audc & 0x80) === 0) {
      if (p5Bit === 0) return;
    }

    const dist = (audc >> 5) & 0x07;
    if (dist === 0x01 || dist === 0x03 || dist === 0x05 || dist === 0x07) {
      this.outputBits[ch] ^= 1;
    } else if (dist === 0x02 || dist === 0x06) {
      this.outputBits[ch] = p4Bit;
    } else {
      this.outputBits[ch] = polyBit;
    }
  }

  tickBaseClockDividers() {
    const audctl = this.registers[8];
    const p4Bit = LFSR_TABLES.poly4[this.poly4Cursor];
    const p5Bit = LFSR_TABLES.poly5[this.poly5Cursor];
    const polyBit =
      (audctl & 0x80) !== 0
        ? LFSR_TABLES.poly9[this.poly9Cursor]
        : LFSR_TABLES.poly17[this.poly17Cursor];

    const underflow = [false, false, false, false];

    if ((audctl & 0x10) !== 0) {
      this.dividers[0]--;
      if (this.dividers[0] <= 0) {
        this.dividers[0] = ((this.registers[2] << 8) | this.registers[0]) + 1;
        underflow[0] = true;
        underflow[1] = true;
        this.clockChannelPulse(0, p4Bit, p5Bit, polyBit);
        this.clockChannelPulse(1, p4Bit, p5Bit, polyBit);
      }
    } else {
      for (let ch = 0; ch < 2; ch++) {
        this.dividers[ch]--;
        if (this.dividers[ch] <= 0) {
          this.dividers[ch] = this.registers[ch << 1] + 1;
          underflow[ch] = true;
          this.clockChannelPulse(ch, p4Bit, p5Bit, polyBit);
        }
      }
    }

    if ((audctl & 0x08) !== 0) {
      this.dividers[2]--;
      if (this.dividers[2] <= 0) {
        this.dividers[2] = ((this.registers[6] << 8) | this.registers[4]) + 1;
        underflow[2] = true;
        underflow[3] = true;
        this.clockChannelPulse(2, p4Bit, p5Bit, polyBit);
        this.clockChannelPulse(3, p4Bit, p5Bit, polyBit);
      }
    } else {
      for (let ch = 2; ch < 4; ch++) {
        this.dividers[ch]--;
        if (this.dividers[ch] <= 0) {
          this.dividers[ch] = this.registers[ch << 1] + 1;
          underflow[ch] = true;
          this.clockChannelPulse(ch, p4Bit, p5Bit, polyBit);
        }
      }
    }

    if ((audctl & 0x04) !== 0) {
      if (underflow[2]) this.highPassFlipFlops[0] = this.outputBits[0];
    } else {
      this.highPassFlipFlops[0] = 0;
    }
    if ((audctl & 0x02) !== 0) {
      if (underflow[3]) this.highPassFlipFlops[1] = this.outputBits[1];
    } else {
      this.highPassFlipFlops[1] = 0;
    }

    this.updateDacLevel();
  }

  updateDacLevel() {
    const audctl = this.registers[8];
    let sumVolume = 0;

    for (let ch = 0; ch < 4; ch++) {
      const audc = this.registers[(ch << 1) + 1];
      const vol = audc & 0x0F;
      if (vol === 0) continue;

      if ((audc & 0x10) !== 0) {
        sumVolume += vol;
      } else {
        let bit = this.outputBits[ch];
        if (ch === 0 && (audctl & 0x04) !== 0) bit ^= this.highPassFlipFlops[0];
        if (ch === 1 && (audctl & 0x02) !== 0) bit ^= this.highPassFlipFlops[1];
        if (bit !== 0) {
          sumVolume += vol;
        }
      }
    }

    const normalized = sumVolume / 60.0;
    this.currentDacLevel = normalized * (1.25 - 0.25 * normalized);
  }

  synthesizeBuffer(outputChannel, sampleRate, allowFrameStep = false) {
    if (allowFrameStep) {
      this.lastAudioCallbackTime = performance.now();
    }
    const sr = sampleRate || 48000;
    const samplesPerFrame = sr / this.targetHz;
    const masterPerSample = this.masterClockHz / sr;

    const hpCoeff = Math.exp((-2.0 * Math.PI * 22.0) / sr);
    const lpAlpha = 1.0 - Math.exp((-2.0 * Math.PI * 13000.0) / sr);

    if (!allowFrameStep || !this.frameStepCallback) {
      this.syncRegistersFromRam();
    }

    for (let i = 0; i < outputChannel.length; i++) {
      if (allowFrameStep && this.frameStepCallback) {
        if (this.sampleInFrame >= samplesPerFrame) {
          this.sampleInFrame -= samplesPerFrame;
          const frameInfo = this.frameStepCallback();
          if (frameInfo) {
            this.pendingEvents = frameInfo.events || [];
            this.eventCursor = 0;
            this.currentFrameTotalCycles = Math.max(1, frameInfo.totalCycles || 27000);
            this.framesSteppedSinceRender++;
          } else {
            this.syncRegistersFromRam();
          }
        }

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
      }

      this.masterClockRemainder += masterPerSample;
      let remainingTicks = this.masterClockRemainder | 0;
      this.masterClockRemainder -= remainingTicks;
      if (remainingTicks < 1) remainingTicks = 1;

      const totalTicks = remainingTicks;
      let dacAccumulator = 0.0;

      while (remainingTicks > 0) {
        const step =
          remainingTicks < this.prescalerCounter ? remainingTicks : this.prescalerCounter;
        dacAccumulator += this.currentDacLevel * step;
        remainingTicks -= step;
        this.prescalerCounter -= step;

        this.poly4Cursor = (this.poly4Cursor + step) % 15;
        this.poly5Cursor = (this.poly5Cursor + step) % 31;
        this.poly9Cursor = (this.poly9Cursor + step) % 511;
        this.poly17Cursor = (this.poly17Cursor + step) % 131071;

        if (this.prescalerCounter <= 0) {
          this.prescalerCounter = (this.registers[8] & 0x01) !== 0 ? 114 : 28;
          this.tickBaseClockDividers();
        }
      }

      const rawUnipolar = dacAccumulator / totalTicks;
      const hpOut = rawUnipolar - this.hpPrevInput + hpCoeff * this.hpPrevOutput;
      this.hpPrevInput = rawUnipolar;
      this.hpPrevOutput = hpOut;
      this.lpOutput += lpAlpha * (hpOut - this.lpOutput);

      if (this.muted || this.transitionMuteSamples > 0) {
        if (this.transitionMuteSamples > 0) {
          this.transitionMuteSamples--;
          this.hpPrevInput = rawUnipolar;
          this.hpPrevOutput = 0.0;
          this.lpOutput = 0.0;
        }
        outputChannel[i] = 0.0;
      } else {
        let gain = 1.65;
        if (this.fadeInSamples > 0) {
          const progress = 1.0 - this.fadeInSamples / Math.max(1, this.fadeInTotal);
          gain *= progress;
          this.fadeInSamples--;
        }
        const sample = this.lpOutput * gain;
        outputChannel[i] = Math.max(-0.98, Math.min(0.98, sample));
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
    } catch (_) {
      return false;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return !this.muted;
  }
}
