/**
 * zonex-web/js/main.js
 * Main entry point & 50.00 Hz PAL Timestep Accumulator (dt = 20.0 ms).
 * Runs the cycle-accurate Mos6502Core ($3C80..$BFFF) in interactive mode for 100% authentic
 * gameplay, hardware HSCROL/VSCROL soft-scrolling, animated moving enemies, and live POKEY audio,
 * while preserving the deterministic Lockstep API (?lockstep=1) for Phase 5 Oracle verification.
 */

import { MemoryState, MAP_WIDTH, MAP_HEIGHT } from "./engine/memory_state.js";
import { ZoneLoader } from "./engine/zone_loader.js";
import { PlayerPhysics } from "./engine/player_physics.js";
import { FeatureStateMachine } from "./engine/feature_state_machine.js";
import { RobotAI } from "./engine/robot_ai.js";
import { ScreenManager } from "./engine/screens.js";
import { AnticGtiaRenderer } from "./hardware/antic_gtia.js";
import { PokeyDriver } from "./hardware/pokey_driver.js";
import { InputBridge } from "./hardware/input_bridge.js";
import { Mos6502Core } from "./hardware/mos6502.js";
import { installLockstepAPI } from "./verify/lockstep_api.js";

export class ZoneXApplication {
  constructor(bundle) {
    this.bundle = bundle;
    this.canvas = document.getElementById("atari-canvas");
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";

    this.memory = new MemoryState(bundle);
    this.pokey = new PokeyDriver(this.memory, bundle);
    this.inputBridge = new InputBridge(this.memory);
    this.zoneLoader = new ZoneLoader(this.memory, bundle);
    this.featureMachine = new FeatureStateMachine(this.memory, bundle, this.pokey);
    this.playerPhysics = new PlayerPhysics(this.memory, this.featureMachine, this.pokey);
    this.robotAI = new RobotAI(this.memory, bundle);
    this.screens = new ScreenManager(this.memory, bundle, this.zoneLoader);
    this.renderer = new AnticGtiaRenderer(this.canvas, this.memory, bundle);
    this.cpu = new Mos6502Core(this.memory, bundle);

    this.autoLoopEnabled = true;
    this.lastTime = performance.now();
    this.accumulator = 0.0;
    this.targetHz = 50;
    this.FRAME_DT = 1000.0 / this.targetHz; // 50.00 Hz PAL VBI (20.0 ms) or 60.00 Hz NTSC (16.67 ms)

    if (!this.isLockstep) {
      this.pokey.setFrameStepper(() => this.stepInteractiveCpuFrame());
    }

    this.bindUI();
    this.api = installLockstepAPI(this);

    // Load Zone 1 (Option Level 1) initially
    if (this.isLockstep) {
      this.api.loadZone(1, 1);
    } else {
      this.loadInteractiveZone(1, 1, true);
    }
  }

  stepInteractiveCpuFrame() {
    this.inputBridge.consumeFrameInput(null);
    const mainCycles = this.targetHz === 60 ? 19500 : 23500;
    this.cpu.runFrame(mainCycles);
    this.renderer.renderFrame();
    return {
      events: this.cpu.pokeyEvents,
      totalCycles: this.cpu.lastFrameTotalCycles,
    };
  }

  setRefreshRate(hz) {
    this.targetHz = hz === 60 ? 60 : 50;
    this.FRAME_DT = 1000.0 / this.targetHz;
    this.accumulator = 0.0;
    this.pokey.setTargetHz(this.targetHz);

    const btnHz = document.getElementById("btn-hz-toggle");
    if (btnHz) {
      btnHz.textContent = this.targetHz === 60 ? "Mode: 60 Hz (NTSC)" : "Mode: 50 Hz (PAL)";
    }
    const badgeHz = document.getElementById("ui-hz-badge");
    if (badgeHz) {
      badgeHz.textContent = this.targetHz === 60 ? "ATARI 800XL NTSC (60.00 Hz)" : "ATARI 800XL PAL (50.00 Hz)";
    }
    const btnAudio = document.getElementById("btn-audio-toggle");
    if (btnAudio && this.pokey.audioCtx && !this.pokey.muted) {
      btnAudio.textContent = `POKEY Audio Active (${this.targetHz}Hz)`;
    }
  }

  loadInteractiveZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = false) {
    this.screens.activeScreen = "ingame";
    this.cpu.startZone(zoneNumber, optionLevel, resetLivesAndScore);
    this.pokey.syncRegistersFromRam();
    this.renderer.renderFrame();
    this.renderer.renderFullZoneMapIfPresent();
    this.updateTelemetryUI();
  }

  loadInteractiveScreen(screenName) {
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const zNum = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
    const lNum = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;

    this.screens.activeScreen = screenName;
    if (screenName === "title") {
      this.cpu.bootTitleScreen(zNum, lNum);
    } else if (screenName === "features") {
      this.cpu.bootFeaturesScreen();
    } else if (screenName === "halloffame" || screenName === "hof") {
      this.cpu.bootHallOfFameScreen();
    } else {
      this.cpu.startZone(zNum, lNum, false);
    }
    this.pokey.syncRegistersFromRam();
    this.renderer.renderFrame();
    this.updateTelemetryUI();
  }

  bindUI() {
    const screenSelect = document.getElementById("ui-screen-select");
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const btnHz = document.getElementById("btn-hz-toggle");
    const btnAudio = document.getElementById("btn-audio-toggle");
    const btnCrt = document.getElementById("btn-crt-toggle");
    const crtOverlay = document.getElementById("crt-overlay");
    const fullMapCanvas = document.getElementById("full-map-canvas");

    const autoUnlockAudio = async () => {
      if (this.isLockstep) return;
      const active = await this.pokey.enableAudio();
      if (active && btnAudio) {
        btnAudio.textContent = this.pokey.muted ? "POKEY Audio Muted" : `POKEY Audio Active (${this.targetHz}Hz)`;
      }
    };

    if (typeof window !== "undefined" && !this.isLockstep) {
      window.addEventListener("keydown", autoUnlockAudio, { passive: true });
      window.addEventListener("pointerdown", autoUnlockAudio, { passive: true });
      window.addEventListener("mousedown", autoUnlockAudio, { passive: true });
    }

    if (btnHz) {
      btnHz.addEventListener("click", () => {
        this.setRefreshRate(this.targetHz === 50 ? 60 : 50);
      });
    }

    if (screenSelect) {
      screenSelect.addEventListener("change", () => {
        const val = screenSelect.value;
        if (this.isLockstep) {
          if (val === "ingame") {
            this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
          } else {
            this.api.loadScreen(val);
          }
        } else {
          if (val === "ingame") {
            this.loadInteractiveZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10), false);
          } else {
            this.loadInteractiveScreen(val);
          }
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        const z = parseInt(zoneSelect.value, 10);
        const l = parseInt(levelSelect.value, 10);
        if (this.isLockstep) {
          this.api.loadZone(z, l);
        } else {
          this.loadInteractiveZone(z, l, false);
        }
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        const z = parseInt(zoneSelect.value, 10);
        const l = parseInt(levelSelect.value, 10);
        if (this.isLockstep) {
          this.api.loadZone(z, l);
        } else {
          this.loadInteractiveZone(z, l, false);
        }
      });
    }

    if (btnAudio) {
      btnAudio.addEventListener("click", async () => {
        if (!this.pokey.audioCtx) {
          await this.pokey.enableAudio();
          btnAudio.textContent = `POKEY Audio Active (${this.targetHz}Hz)`;
        } else {
          const isUnmuted = this.pokey.toggleMute();
          btnAudio.textContent = isUnmuted ? `POKEY Audio Active (${this.targetHz}Hz)` : "POKEY Audio Muted";
        }
      });
    }

    if (btnCrt && crtOverlay) {
      btnCrt.addEventListener("click", () => {
        crtOverlay.classList.toggle("active");
      });
    }

    if (fullMapCanvas) {
      fullMapCanvas.addEventListener("click", (e) => {
        const rect = fullMapCanvas.getBoundingClientRect();
        const scaleX = fullMapCanvas.width / rect.width;
        const scaleY = fullMapCanvas.height / rect.height;
        const tx = Math.max(0, Math.min(MAP_WIDTH - 1, Math.floor(((e.clientX - rect.left) * scaleX) / 16)));
        const ty = Math.max(0, Math.min(MAP_HEIGHT - 1, Math.floor(((e.clientY - rect.top) * scaleY) / 16)));
        const ram = this.memory.ram;
        const newOffset = (ty * MAP_WIDTH + tx) & 0xFFFF;
        const charX = ((tx + 1) * 2) & 0xFF;
        const charY = (ty * 2) & 0xFF;

        ram[0x055B] = newOffset & 0xFF;
        ram[0x055C] = (newOffset >> 8) & 0xFF;
        ram[0x0560] = charX;
        ram[0x0561] = charY;
        ram[0x0568] = 0x00; // reset sub-tile step
        ram[0x056B] = 0x08; // neutral HSCROL
        ram[0x056C] = 0x00; // neutral VSCROL
        ram[0xD404] = 0x08;
        ram[0xD405] = 0x00;

        const lmsX = charX < 0x16 ? 0 : Math.min(0x54, charX - 0x14);
        const lmsY = charY < 0x0C ? 0 : Math.min(0x28, charY - 0x0A);
        const hpos = (40 + (charX - lmsX) * 4) & 0xFF;
        const pmgY = (32 + (charY - lmsY) * 8) & 0xFF;
        ram[0x055D] = hpos;
        ram[0xD000] = hpos;
        ram[0xD001] = hpos;
        ram[0x055E] = pmgY;

        if (!this.isLockstep) {
          this.cpu.callSubroutine(0x43BF, 5000); // Clear PMG $1400..$15FF
          this.cpu.callSubroutine(0x435F, 5000); // Draw P0/P1 at new $055E
          this.cpu.callSubroutine(0x4462, 5000); // Update 25 LMS pointers
          this.cpu.callSubroutine(0x47A0, 5000); // Update $056D/$056E scroll flags
        } else {
          this.memory.updateCameraLmsFromPlayer();
        }
        this.renderer.renderFrame(this.robotAI.robots);
        this.updateTelemetryUI();
      });
    }
  }

  updateTelemetryUI() {
    const ram = this.memory.ram;
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const px = Math.floor(ram[0x0560] / 2) - 1;
    const py = Math.floor(ram[0x0561] / 2);
    const dl = (ram[0x0231] << 8) | ram[0x0230];
    const lms0 = (ram[0x3C95] << 8) | ram[0x3C94];

    const tLo = this.isLockstep ? ram[0x009E] : ram[0x059E];
    const tHi = this.isLockstep ? ram[0x009F] : ram[0x059F];
    const timerHex = (((tHi & 0xFF) << 8) | (tLo & 0xFF)).toString(16).toUpperCase().padStart(4, "0");

    let scoreHex;
    if (this.isLockstep) {
      scoreHex = (((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");
    } else {
      scoreHex = [ram[0x0591], ram[0x0592], ram[0x0593]]
        .map((b) => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0"))
        .join("");
    }

    const gameZoneNum = ((this.isLockstep ? ram[0x0558] : ram[0x0554]) & 0x0F) + 1;
    const internalZoneIdx = ram[0x0555] & 0x0F;
    setTxt("dbg-zone", `${gameZoneNum} (ROM #$${internalZoneIdx.toString(16).toUpperCase()})`);
    setTxt("dbg-player-xy", `(${px}, ${py})`);
    setTxt("dbg-char-xy", `(${ram[0x0560]}, ${ram[0x0561]})`);
    setTxt("dbg-dlist", `$${dl.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt("dbg-lms0", `$${lms0.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt("dbg-scroll", `$${ram[0xD404].toString(16).padStart(2, "0")} / $${ram[0xD405].toString(16).padStart(2, "0")}`);
    setTxt("dbg-timer", timerHex);
    setTxt("dbg-score", scoreHex);
    setTxt("dbg-plutonium", `${ram[0x0598]}`);
    setTxt("dbg-mats", `${ram[0x0576]}`);

    const items = [];
    if (ram[0x0574]) items.push("KEY");
    if (ram[0x0575]) items.push("MASK");
    if (ram[0x05AF]) items.push("SPADE");
    setTxt("dbg-inv", items.length ? items.join("+") : "NONE");

    const pRegs = this.pokey.getPokeyRegs().slice(0, 8).map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    setTxt("dbg-pokey", pRegs);

    // Sync UI dropdowns if the 6502 engine transitioned screens or zones natively
    if (!this.isLockstep) {
      const screenSelect = document.getElementById("ui-screen-select");
      if (screenSelect) {
        if (dl === 0x3C8B && screenSelect.value !== "ingame") screenSelect.value = "ingame";
        else if (dl === 0x3CE5 && screenSelect.value !== "title") screenSelect.value = "title";
        else if (dl === 0x939C && screenSelect.value !== "features") screenSelect.value = "features";
        else if (dl === 0x8F08 && screenSelect.value !== "halloffame") screenSelect.value = "halloffame";
      }
      const zoneSelect = document.getElementById("ui-zone-select");
      if (zoneSelect && dl === 0x3C8B && parseInt(zoneSelect.value, 10) !== gameZoneNum) {
        zoneSelect.value = String(gameZoneNum);
      }
    }
  }

  startLoop() {
    if (this.isLockstep) {
      this.autoLoopEnabled = false;
      return;
    }

    const tick = (now) => {
      if (this.autoLoopEnabled) {
        if (this.pokey.isAudioClockActive()) {
          // Sample-locked audio clock is driving stepInteractiveCpuFrame() at exact 20.000ms (50Hz) / 16.667ms (60Hz) boundaries
          this.lastTime = now;
          this.accumulator = 0.0;
          if (this.pokey.consumeRenderedFrameFlag()) {
            this.updateTelemetryUI();
          }
        } else {
          let delta = now - this.lastTime;
          if (delta > 100) delta = 100;
          this.lastTime = now;
          this.accumulator += delta;

          while (this.accumulator >= this.FRAME_DT) {
            const info = this.stepInteractiveCpuFrame();
            this.pokey.enqueueFrameEvents(info.events, info.totalCycles);
            this.updateTelemetryUI();
            this.accumulator -= this.FRAME_DT;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

async function bootstrap() {
  if (window.ZoneXTestAPI) return;
  let bundle = window.ZONEX_ROM_BUNDLE;
  if (!bundle) {
    const res = await fetch("assets/zonex_rom_bundle.json");
    bundle = await res.json();
  }
  const app = new ZoneXApplication(bundle);
  window.zoneXApp = app;
  app.startLoop();
}

bootstrap();
