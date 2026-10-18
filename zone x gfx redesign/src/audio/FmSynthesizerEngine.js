/**
 * @fileoverview Multi-Operator FM Synthesizer & Hybrid POKEY Sound System.
 *
 * Wraps and extends `PokeyAudioSynthesizer` on a single shared Web Audio graph:
 * 1. `fm_remaster` (Default):
 *    - Real-time 4-Voice Dual-Operator FM Synthesizer driven by the game's
 *      POKEY register stream (transforming 8-bit dividers into lush DX7-style
 *      FM brass, crystalline bells, cyber-bass, and sci-fi pads)
 *    - Polyphonic Event-Driven FM Sound Effects (plutonium crystal chime,
 *      containment lock-in, airlock release, regolith shatter, warp hyperspace
 *      sweep, servo footsteps, radiation overload, and victory fanfare)
 *    - Stereo Space Chorus/Delay FX Bus, Lowpass Filter, and Master Compressor
 * 2. `hybrid`:
 *    - Layers the cycle-accurate Atari XL POKEY chip (`PokeyAudioSynthesizer`)
 *      together with the Multi-Operator FM Synthesizer & Stereo FX bus
 * 3. `classic_pokey`:
 *    - Pure 100% hardware-accurate 1.7734 MHz Atari XL POKEY emulation
 */

import { ScreenMode, SystemAddressMap } from "../config/Constants.js";
import { PokeyAudioSynthesizer } from "./PokeyAudioSynthesizer.js";

export class FmSynthesizerEngine {
  /**
   * @param {import("../models/GameState.js").GameState} gameState
   */
  constructor(gameState) {
    this.state = gameState;
    this.pokey = new PokeyAudioSynthesizer(gameState);

    /** @type {"fm_remaster"|"hybrid"|"classic_pokey"} */
    this.synthMode = "fm_remaster";

    /** @type {AudioContext|null} */
    this.audioCtx = null;

    /** @type {GainNode|null} */
    this.fmMasterGain = null;

    /** @type {GainNode|null} */
    this.pokeyMixGain = null;

    /** @type {DynamicsCompressorNode|null} */
    this.compressor = null;

    /** @type {AnalyserNode|null} */
    this.analyser = null;

    /** @type {GainNode|null} */
    this.fxSendGain = null;

    /** @type {Array<Object>} */
    this.fmVoices = [];

    /** @type {Uint8Array} */
    this.freqData = new Uint8Array(64);
    /** @type {Uint8Array} */
    this.waveData = new Uint8Array(64);

    /** @type {boolean} */
    this.muted = false;

    /** @type {boolean} */
    this.fmGraphBuilt = false;

    /** @type {number} */
    this.lastFootstepTime = 0;
  }

  setRefreshRate(hz) {
    this.pokey.setRefreshRate(hz);
  }

  setFrameStepper(callback) {
    this.pokey.setFrameStepper(() => {
      const res = callback();
      this.syncFmVoicesFromRam();
      return res;
    });
  }

  isAudioClockActive() {
    return this.pokey.isAudioClockActive();
  }

  consumeRenderedFrameFlag() {
    return this.pokey.consumeRenderedFrameFlag();
  }

  getActiveRegisters() {
    return this.pokey.getActiveRegisters();
  }

  /**
   * Unlocks and initializes the shared Web Audio graph (FM Synth + POKEY + Analyser).
   * @returns {Promise<boolean>}
   */
  async enableAudio() {
    const ok = await this.pokey.enableAudio();
    this.audioCtx = this.pokey.audioCtx;
    if (this.audioCtx && !this.fmGraphBuilt) {
      this._buildFmAudioGraph(this.audioCtx);
    }
    this._applyModeVolumes();
    this.syncFmVoicesFromRam();
    return ok;
  }

  _buildFmAudioGraph(ctx) {
    this.fmGraphBuilt = true;

    // Master dynamics compressor & spectrum analyser
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.knee.value = 18;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.18;

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 128;
    this.analyser.smoothingTimeConstant = 0.76;
    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.waveData = new Uint8Array(this.analyser.frequencyBinCount);

    this.fmMasterGain = ctx.createGain();
    this.pokeyMixGain = ctx.createGain();

    // Re-route POKEY ScriptProcessorNode into pokeyMixGain -> compressor -> analyser
    if (this.pokey.scriptNode) {
      try {
        this.pokey.scriptNode.disconnect();
      } catch (_) {}
      this.pokey.scriptNode.connect(this.pokeyMixGain);
      this.pokeyMixGain.connect(this.compressor);
    }

    // Stereo Space Chorus / Echo FX Bus for FM Synth
    this.fxSendGain = ctx.createGain();
    this.fxSendGain.gain.value = 0.28;

    const delayL = ctx.createDelay(1.0);
    const delayR = ctx.createDelay(1.0);
    delayL.delayTime.value = 0.11;
    delayR.delayTime.value = 0.165;

    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.value = 0.28;
    fbR.gain.value = 0.28;

    const fxFilter = ctx.createBiquadFilter();
    fxFilter.type = "lowpass";
    fxFilter.frequency.value = 3400;

    const panL = ctx.createStereoPanner();
    const panR = ctx.createStereoPanner();
    panL.pan.value = -0.65;
    panR.pan.value = 0.65;

    this.fxSendGain.connect(fxFilter);
    fxFilter.connect(delayL);
    fxFilter.connect(delayR);
    delayL.connect(fbL);
    fbL.connect(delayR);
    delayR.connect(fbR);
    fbR.connect(delayL);
    delayL.connect(panL);
    delayR.connect(panR);
    panL.connect(this.fmMasterGain);
    panR.connect(this.fmMasterGain);

    this.fmMasterGain.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(ctx.destination);

    // Create 4 persistent 2-Operator FM Voices mirroring the 4 Atari channels
    const panPositions = [-0.45, 0.45, -0.22, 0.22];
    const carrierWaves = ["sine", "triangle", "sine", "triangle"];

    for (let ch = 0; ch < 4; ch++) {
      const carrier = ctx.createOscillator();
      const modulator = ctx.createOscillator();
      const modGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const voiceGain = ctx.createGain();
      const panner = ctx.createStereoPanner();

      carrier.type = carrierWaves[ch];
      modulator.type = "sine";
      carrier.frequency.value = 220;
      modulator.frequency.value = 440;
      modGain.gain.value = 0;

      filter.type = "lowpass";
      filter.frequency.value = 4600;
      filter.Q.value = 1.35;

      voiceGain.gain.value = 0;
      panner.pan.value = panPositions[ch];

      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      carrier.connect(filter);
      filter.connect(voiceGain);
      voiceGain.connect(panner);
      panner.connect(this.fmMasterGain);
      panner.connect(this.fxSendGain);

      carrier.start();
      modulator.start();

      this.fmVoices.push({
        carrier,
        modulator,
        modGain,
        voiceGain,
        filter,
        panner,
      });
    }
  }

  /**
   * Switches between `"fm_remaster"`, `"hybrid"`, and `"classic_pokey"`.
   * @param {"fm_remaster"|"hybrid"|"classic_pokey"} mode
   */
  setSynthMode(mode) {
    if (!["fm_remaster", "hybrid", "classic_pokey"].includes(mode)) return;
    this.synthMode = mode;
    this._applyModeVolumes();
    this.syncFmVoicesFromRam();
  }

  _applyModeVolumes() {
    if (!this.audioCtx || !this.fmGraphBuilt) return;
    const now = this.audioCtx.currentTime;

    if (this.muted) {
      this.pokey.muted = true;
      this.fmMasterGain.gain.setTargetAtTime(0.0, now, 0.01);
      this.pokeyMixGain.gain.setTargetAtTime(0.0, now, 0.01);
      return;
    }

    if (this.synthMode === "fm_remaster") {
      this.pokey.muted = false; // keep POKEY audio clock running!
      this.pokeyMixGain.gain.setTargetAtTime(0.0, now, 0.015);
      this.fmMasterGain.gain.setTargetAtTime(0.85, now, 0.015);
    } else if (this.synthMode === "hybrid") {
      this.pokey.muted = false;
      this.pokeyMixGain.gain.setTargetAtTime(0.38, now, 0.015);
      this.fmMasterGain.gain.setTargetAtTime(0.62, now, 0.015);
    } else {
      // classic_pokey
      this.pokey.muted = false;
      this.pokeyMixGain.gain.setTargetAtTime(0.9, now, 0.015);
      this.fmMasterGain.gain.setTargetAtTime(0.0, now, 0.015);
    }
  }

  /**
   * Toggles master mute state.
   * @returns {boolean} True if unmuted (audio active).
   */
  toggleMute() {
    this.muted = !this.muted;
    this._applyModeVolumes();
    return !this.muted;
  }

  /**
   * Immediately silences all FM operators and POKEY channels during screen/zone jumps.
   * @param {number} muteMs
   */
  silenceAll(muteMs = 55) {
    this.pokey.silenceAll(muteMs);
    if (!this.audioCtx || !this.fmGraphBuilt) return;
    const now = this.audioCtx.currentTime;
    for (let ch = 0; ch < this.fmVoices.length; ch++) {
      const v = this.fmVoices[ch];
      v.voiceGain.gain.cancelScheduledValues(now);
      v.voiceGain.gain.setValueAtTime(0, now);
      v.modGain.gain.cancelScheduledValues(now);
      v.modGain.gain.setValueAtTime(0, now);
    }
  }

  triggerTransitionMute(muteMs = 55) {
    this.pokey.triggerTransitionMute(muteMs);
    if (!this.audioCtx || !this.fmGraphBuilt) return;
    const now = this.audioCtx.currentTime;
    for (let ch = 0; ch < this.fmVoices.length; ch++) {
      this.fmVoices[ch].voiceGain.gain.setTargetAtTime(0, now, 0.008);
    }
  }

  enqueueFrameEvents(events, totalCycles) {
    this.pokey.enqueueFrameEvents(events, totalCycles);
    this.syncFmVoicesFromRam();
  }

  syncRegistersFromRam() {
    this.pokey.syncRegistersFromRam();
    this.syncFmVoicesFromRam();
  }

  /**
   * Maps the 4 Atari POKEY channels (`$D200..$D208`) to the 4 Dual-Operator FM Voices.
   */
  syncFmVoicesFromRam() {
    if (!this.audioCtx || !this.fmGraphBuilt) return;
    const now = this.audioCtx.currentTime;

    if (this.muted || this.synthMode === "classic_pokey" || this.pokey.transitionMuteSamples > 0) {
      for (let ch = 0; ch < this.fmVoices.length; ch++) {
        this.fmVoices[ch].voiceGain.gain.setTargetAtTime(0, now, 0.01);
      }
      return;
    }

    const ram = this.state.ram;
    const screenMode = this.state.currentScreenMode;
    const isPlaying = screenMode === ScreenMode.IN_GAME;
    const audctl = ram[SystemAddressMap.POKEY_BASE + 8] || 0;
    const baseClock = audctl & 0x01 ? 15699.9 : 63921.0;

    for (let ch = 0; ch < 4; ch++) {
      const audf = ram[SystemAddressMap.POKEY_BASE + ch * 2] & 0xff;
      const audc = ram[SystemAddressMap.POKEY_BASE + ch * 2 + 1] & 0xff;
      const vol = audc & 0x0f;
      const dist = (audc >> 5) & 0x07;
      const voice = this.fmVoices[ch];

      if (vol === 0 || (audf === 0 && vol < 2) || (audc & 0x10) !== 0) {
        voice.voiceGain.gain.setTargetAtTime(0, now, 0.012);
        voice.modGain.gain.setTargetAtTime(0, now, 0.015);
        continue;
      }

      let freq = baseClock / (2 * (audf + 1));
      freq = Math.max(38, Math.min(3200, freq));

      let ratio = 2.0;
      let modIndex = 1.4;
      let filterCutoff = 3800;

      if (dist === 5 || dist === 7) {
        // Pure tone -> Lush DX7 FM Brass / Electric Piano / Lead
        ratio = ch === 0 ? 1.0 : ch === 1 ? 2.0 : 0.5;
        modIndex = isPlaying ? 1.15 : 1.85;
        filterCutoff = 4400;
        voice.carrier.type = ch % 2 === 0 ? "sine" : "triangle";
        voice.modulator.type = "sine";
      } else if (dist === 6 || dist === 2) {
        // Poly4 bass -> Deep FM Cyber-Bass
        freq = Math.max(42, freq * 0.5);
        ratio = 1.0;
        modIndex = 2.4;
        filterCutoff = 1900;
        voice.carrier.type = "triangle";
        voice.modulator.type = "sine";
      } else if (dist === 1 || dist === 3) {
        // Poly5 metallic pulse -> Crystalline FM Bell / Plasma resonance
        ratio = 2.75;
        modIndex = 2.6;
        filterCutoff = 5200;
        voice.carrier.type = "sine";
        voice.modulator.type = "triangle";
      } else {
        // Poly17/Poly9 noise -> Inharmonic FM Percussion / Thruster
        ratio = 3.414;
        modIndex = 4.0;
        filterCutoff = 2600;
        voice.carrier.type = "triangle";
        voice.modulator.type = "sawtooth";
      }

      const glideTau = isPlaying ? 0.008 : 0.005;
      voice.carrier.frequency.setTargetAtTime(freq, now, glideTau);
      voice.modulator.frequency.setTargetAtTime(freq * ratio, now, glideTau);

      const modDepthHz = freq * modIndex * (vol / 15);
      voice.modGain.gain.setTargetAtTime(modDepthHz, now, 0.01);
      voice.filter.frequency.setTargetAtTime(filterCutoff, now, 0.015);

      const gainLevel = (vol / 15) * (isPlaying ? 0.085 : 0.135);
      voice.voiceGain.gain.setTargetAtTime(gainLevel, now, 0.008);
    }
  }

  // ===========================================================================
  // Polyphonic Event-Driven FM Sound Effects (Triggered by Gameplay Events)
  // ===========================================================================

  _triggerFmNote({
    freq = 440,
    endFreq = null,
    modRatio = 2.0,
    modIndexStart = 3.0,
    modIndexEnd = 0.2,
    carrierType = "sine",
    modType = "sine",
    attack = 0.005,
    decay = 0.22,
    peakGain = 0.18,
    pan = 0,
    delayOffset = 0,
    fxSend = 0.35,
  }) {
    if (!this.audioCtx || !this.fmGraphBuilt || this.muted) return;
    if (this.synthMode === "classic_pokey") return;

    const ctx = this.audioCtx;
    const t0 = ctx.currentTime + delayOffset;
    const tAttack = t0 + attack;
    const tEnd = tAttack + decay;

    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    const modGain = ctx.createGain();
    const ampGain = ctx.createGain();
    const panner = ctx.createStereoPanner();

    carrier.type = carrierType;
    modulator.type = modType;

    carrier.frequency.setValueAtTime(freq, t0);
    modulator.frequency.setValueAtTime(freq * modRatio, t0);

    if (endFreq !== null && endFreq > 20) {
      carrier.frequency.exponentialRampToValueAtTime(endFreq, tEnd);
      modulator.frequency.exponentialRampToValueAtTime(endFreq * modRatio, tEnd);
    }

    modGain.gain.setValueAtTime(freq * modIndexStart, t0);
    modGain.gain.exponentialRampToValueAtTime(Math.max(1, freq * modIndexEnd), tEnd);

    ampGain.gain.setValueAtTime(0.0001, t0);
    ampGain.gain.linearRampToValueAtTime(peakGain, tAttack);
    ampGain.gain.exponentialRampToValueAtTime(0.0001, tEnd);

    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), t0);

    modulator.connect(modGain);
    modGain.connect(carrier.frequency);
    carrier.connect(ampGain);
    ampGain.connect(panner);
    panner.connect(this.fmMasterGain);

    if (fxSend > 0 && this.fxSendGain) {
      const sendNode = ctx.createGain();
      sendNode.gain.value = fxSend;
      panner.connect(sendNode);
      sendNode.connect(this.fxSendGain);
    }

    carrier.start(t0);
    modulator.start(t0);
    carrier.stop(tEnd + 0.02);
    modulator.stop(tEnd + 0.02);
  }

  playPlutoniumPickup() {
    const notes = [587.33, 880.0, 1174.66, 1760.0];
    notes.forEach((f, idx) => {
      this._triggerFmNote({
        freq: f,
        modRatio: 3.5,
        modIndexStart: 4.2,
        modIndexEnd: 0.3,
        carrierType: "sine",
        modType: "sine",
        attack: 0.004,
        decay: 0.36,
        peakGain: 0.16,
        pan: (idx - 1.5) * 0.35,
        delayOffset: idx * 0.048,
        fxSend: 0.55,
      });
    });
  }

  playContainerDeposit() {
    this._triggerFmNote({
      freq: 220,
      endFreq: 55,
      modRatio: 1.0,
      modIndexStart: 3.5,
      modIndexEnd: 0.5,
      carrierType: "triangle",
      modType: "sine",
      attack: 0.005,
      decay: 0.42,
      peakGain: 0.24,
      pan: 0,
      delayOffset: 0,
      fxSend: 0.2,
    });
    [523.25, 659.25, 1046.5].forEach((f, i) => {
      this._triggerFmNote({
        freq: f,
        modRatio: 2.0,
        modIndexStart: 2.5,
        modIndexEnd: 0.2,
        carrierType: "sine",
        modType: "triangle",
        attack: 0.01,
        decay: 0.45,
        peakGain: 0.13,
        pan: (i - 1) * 0.4,
        delayOffset: 0.08 + i * 0.04,
        fxSend: 0.5,
      });
    });
  }

  playItemPickup() {
    [523.25, 783.99, 1046.5].forEach((f, i) => {
      this._triggerFmNote({
        freq: f,
        modRatio: 2.0,
        modIndexStart: 3.0,
        modIndexEnd: 0.15,
        carrierType: "triangle",
        modType: "sine",
        attack: 0.003,
        decay: 0.22,
        peakGain: 0.15,
        pan: (i - 1) * 0.3,
        delayOffset: i * 0.04,
        fxSend: 0.4,
      });
    });
  }

  playDoorUnlock() {
    this._triggerFmNote({
      freq: 160,
      endFreq: 480,
      modRatio: 1.5,
      modIndexStart: 4.0,
      modIndexEnd: 0.5,
      carrierType: "triangle",
      modType: "sawtooth",
      attack: 0.008,
      decay: 0.26,
      peakGain: 0.16,
      pan: 0,
      delayOffset: 0,
      fxSend: 0.35,
    });
  }

  playDigSound() {
    this._triggerFmNote({
      freq: 310,
      endFreq: 95,
      modRatio: 3.73,
      modIndexStart: 6.5,
      modIndexEnd: 0.8,
      carrierType: "triangle",
      modType: "sawtooth",
      attack: 0.002,
      decay: 0.11,
      peakGain: 0.15,
      pan: (Math.random() - 0.5) * 0.4,
      delayOffset: 0,
      fxSend: 0.15,
    });
  }

  playTeleportSound() {
    this._triggerFmNote({
      freq: 180,
      endFreq: 1480,
      modRatio: 2.5,
      modIndexStart: 5.0,
      modIndexEnd: 0.4,
      carrierType: "sine",
      modType: "sine",
      attack: 0.01,
      decay: 0.38,
      peakGain: 0.19,
      pan: -0.35,
      delayOffset: 0,
      fxSend: 0.6,
    });
    this._triggerFmNote({
      freq: 1480,
      endFreq: 360,
      modRatio: 1.5,
      modIndexStart: 3.5,
      modIndexEnd: 0.2,
      carrierType: "triangle",
      modType: "sine",
      attack: 0.02,
      decay: 0.38,
      peakGain: 0.15,
      pan: 0.35,
      delayOffset: 0.06,
      fxSend: 0.6,
    });
  }

  playPlayerDeath() {
    this._triggerFmNote({
      freq: 140,
      endFreq: 32,
      modRatio: 3.14,
      modIndexStart: 8.0,
      modIndexEnd: 1.0,
      carrierType: "sawtooth",
      modType: "sawtooth",
      attack: 0.003,
      decay: 0.65,
      peakGain: 0.26,
      pan: 0,
      delayOffset: 0,
      fxSend: 0.45,
    });
    [660, 554, 440, 311].forEach((f, i) => {
      this._triggerFmNote({
        freq: f,
        endFreq: f * 0.5,
        modRatio: 2.41,
        modIndexStart: 4.5,
        modIndexEnd: 0.8,
        carrierType: "triangle",
        modType: "sine",
        attack: 0.005,
        decay: 0.22,
        peakGain: 0.14,
        pan: (i % 2 === 0 ? -1 : 1) * 0.45,
        delayOffset: i * 0.08,
        fxSend: 0.5,
      });
    });
  }

  playLevelComplete() {
    [440, 554.37, 659.25, 880, 1108.73, 1318.51].forEach((f, i) => {
      this._triggerFmNote({
        freq: f,
        modRatio: 2.0,
        modIndexStart: 3.2,
        modIndexEnd: 0.25,
        carrierType: "sine",
        modType: "triangle",
        attack: 0.008,
        decay: 0.55,
        peakGain: 0.15,
        pan: ((i % 3) - 1) * 0.45,
        delayOffset: i * 0.065,
        fxSend: 0.6,
      });
    });
  }

  playFootstep() {
    if (!this.audioCtx) return;
    const now = this.audioCtx.currentTime;
    if (now - this.lastFootstepTime < 0.14) return;
    this.lastFootstepTime = now;

    this._triggerFmNote({
      freq: 115,
      endFreq: 58,
      modRatio: 2.8,
      modIndexStart: 2.2,
      modIndexEnd: 0.2,
      carrierType: "sine",
      modType: "triangle",
      attack: 0.002,
      decay: 0.045,
      peakGain: 0.06,
      pan: (Math.random() - 0.5) * 0.2,
      delayOffset: 0,
      fxSend: 0.05,
    });
  }

  getSpectrumData() {
    if (this.analyser && !this.muted) {
      this.analyser.getByteFrequencyData(this.freqData);
    } else {
      this.freqData.fill(0);
    }
    return this.freqData;
  }

  getWaveformData() {
    if (this.analyser && !this.muted) {
      this.analyser.getByteTimeDomainData(this.waveData);
    } else {
      this.waveData.fill(128);
    }
    return this.waveData;
  }
}
