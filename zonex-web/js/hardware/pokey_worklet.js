/**
 * zonex-web/js/hardware/pokey_worklet.js
 * True 4-Channel Atari POKEY Web Audio API AudioWorkletProcessor.
 * Synthesizes polynomial counter (LFSR 4-bit, 5-bit, 17-bit) + pure tone dividers
 * driven by registers $D200..$D208 (AUDF1..4, AUDC1..4, AUDCTL).
 */

class PokeyWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.regs = new Uint8Array(9); // AUDF1, AUDC1, AUDF2, AUDC2, AUDF3, AUDC3, AUDF4, AUDC4, AUDCTL
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
    const baseClock = 63920.4; // PAL 64kHz POKEY horizontal line clock
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
          // Volume-only DAC mode
          mix += (vol - 0.5) * 0.25;
          continue;
        }

        const freq = baseClock / (2.0 * (audf + 1));
        this.phases[ch] += freq / sr;
        if (this.phases[ch] >= 0.5) {
          this.phases[ch] -= 0.5;
          if (dist === 0x0A || dist === 0x0E) {
            // Pure square wave
            this.outputs[ch] = this.outputs[ch] ? 0 : 1;
          } else if (dist === 0x08) {
            // White noise (17-bit poly)
            this.outputs[ch] = this.lfsr17 & 1;
          } else if (dist === 0x0C || dist === 0x04) {
            // 4-bit / 5-bit Metallic POKEY poly
            this.outputs[ch] = (this.lfsr4 ^ this.lfsr5) & 1;
          } else {
            this.outputs[ch] = (this.lfsr17 ^ (this. outputs[ch] ^ 1)) & 1;
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
