/**
 * zonex-web/js/verify/lockstep_api.js
 * Exposes window.ZoneXTestAPI for deterministic Playwright Verification Oracles (Phase 5).
 */

export function installLockstepAPI(app) {
  const { memory, zoneLoader, screens, playerPhysics, featureMachine, robotAI, pokey, renderer, inputBridge } = app;

  const api = {
    isReady: true,

    loadZone(zoneNumber = 1, optionLevel = 1) {
      screens.activeScreen = "ingame";
      const zdata = zoneLoader.loadZone(zoneNumber, optionLevel);
      robotAI.initZoneRobots(zoneNumber - 1);
      featureMachine.frameCounter = 0;
      renderer.renderFrame(robotAI.robots);
      renderer.renderFullZoneMapIfPresent();
      app.updateTelemetryUI();
      return zdata;
    },

    loadScreen(screenName) {
      screens.loadScreen(screenName);
      renderer.renderFrame([]);
      app.updateTelemetryUI();
      return screenName;
    },

    stepFrame(inputMask = 0) {
      const mask = inputBridge.consumeFrameInput(inputMask);
      if (screens.activeScreen === "ingame") {
        playerPhysics.step(mask);
        featureMachine.tickFrame();
        robotAI.stepFrame();
      }
      pokey.tickFrame();
      renderer.renderFrame(robotAI.robots);
      app.updateTelemetryUI();
      return this.getStateSnapshot();
    },

    getStateSnapshot() {
      const ram = memory.ram;
      const playerX = Math.floor(ram[0x0560] / 2) - 1;
      const playerY = Math.floor(ram[0x0561] / 2);
      const timerBcd = ((ram[0x009F] & 0xFF) << 8) | (ram[0x009E] & 0xFF);
      const scoreBcd = ((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF);
      return {
        zone: (ram[0x0558] & 0x0F) + 1,
        internalZone: ram[0x0555] & 0x0F,
        playerX,
        playerY,
        charX: ram[0x0560],
        charY: ram[0x0561],
        hscrol: ram[0xD404],
        vscrol: ram[0xD405],
        timerBcd,
        scoreBcd,
        matsCount: ram[0x0576],
        hasKey: ram[0x0574],
        hasSpade: ram[0x0575],
        hasPlutonium: ram[0x05AF],
        plutoniumRemaining: ram[0x0598],
        outOfTime: memory.outOfTime ? 1 : 0,
        pokeyRegs: pokey.getPokeyRegs(),
        lmsPointers: memory.get25LmsPointers(),
      };
    },

    getCanvasImageData() {
      return renderer.ctx.getImageData(0, 0, renderer.width, renderer.height).data;
    },

    synthesizePokeySamples(regs, numSamples = 512, sampleRate = 44100) {
      const baseClock = 63920.4;
      const phases = new Float64Array(4);
      const outputs = new Int8Array(4);
      let lfsr17 = 0x1FFFF;
      let lfsr5 = 0x1F;
      let lfsr4 = 0x0F;
      const out = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const bit17 = ((lfsr17 >> 16) ^ (lfsr17 >> 11)) & 1;
        lfsr17 = ((lfsr17 << 1) | bit17) & 0x1FFFF;
        const bit5 = ((lfsr5 >> 4) ^ (lfsr5 >> 2)) & 1;
        lfsr5 = ((lfsr5 << 1) | bit5) & 0x1F;
        const bit4 = ((lfsr4 >> 3) ^ (lfsr4 >> 2)) & 1;
        lfsr4 = ((lfsr4 << 1) | bit4) & 0x0F;

        let mix = 0.0;
        for (let ch = 0; ch < 4; ch++) {
          const audf = regs[ch * 2] & 0xFF;
          const audc = regs[ch * 2 + 1] & 0xFF;
          const vol = (audc & 0x0F) / 15.0;
          const dist = (audc >> 4) & 0x0F;
          if (vol === 0) continue;
          if ((audc & 0x10) !== 0) {
            mix += (vol - 0.5) * 0.25;
            continue;
          }
          const freq = baseClock / (2.0 * (audf + 1));
          phases[ch] += freq / sampleRate;
          if (phases[ch] >= 0.5) {
            phases[ch] -= 0.5;
            if (dist === 0x0A || dist === 0x0E) {
              outputs[ch] = outputs[ch] ? 0 : 1;
            } else if (dist === 0x08) {
              outputs[ch] = lfsr17 & 1;
            } else if (dist === 0x0C || dist === 0x04) {
              outputs[ch] = (lfsr4 ^ lfsr5) & 1;
            } else {
              outputs[ch] = (lfsr17 ^ (outputs[ch] ^ 1)) & 1;
            }
          }
          mix += (outputs[ch] ? vol : -vol) * 0.22;
        }
        out[i] = Math.max(-1.0, Math.min(1.0, mix));
      }
      return Array.from(out);
    },

    triggerSfxForTest(sfxId, ch = 0, duration = 12, priority = 2) {
      pokey.triggerSfx(sfxId, ch, duration, priority);
    },
  };

  window.ZoneXTestAPI = api;
  return api;
}
