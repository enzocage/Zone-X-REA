/**
 * zonex-web/js/main.js
 * Main entry point & 50.00 Hz PAL / 60.00 Hz NTSC Timestep Engine.
 * - Boots into the authentic Atari 800XL Title / Intro Screen ($3CE5, $75F2 music) by default,
 *   transitioning through the Features Intro ($939C) into the game on START / FIRE.
 * - Includes 10 new innovative Bonus Levels (Zones 13–22) + Interactive Level Editor (Zones 23–27),
 *   all playable directly via the level selector or in-game progression.
 * - Preserves deterministic Lockstep API (?lockstep=1) for Phase 5 Oracle verification.
 */

import { MemoryState, MAP_WIDTH, MAP_HEIGHT } from "./engine/memory_state.js";
import { ZoneLoader } from "./engine/zone_loader.js";
import { PlayerPhysics } from "./engine/player_physics.js";
import { FeatureStateMachine } from "./engine/feature_state_machine.js";
import { RobotAI } from "./engine/robot_ai.js";
import { ScreenManager } from "./engine/screens.js";
import { generateBonusLevels } from "./engine/bonus_levels.js";
import { LevelEditor } from "./editor/level_editor.js";
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

    this.bonusLevels = generateBonusLevels();
    this.levelEditor = new LevelEditor(this);
    this.currentSelectedZone = 1;

    this.autoLoopEnabled = true;
    this.lastTime = performance.now();
    this.accumulator = 0.0;
    this.targetHz = 50;
    this.FRAME_DT = 1000.0 / this.targetHz;

    if (!this.isLockstep) {
      this.pokey.setFrameStepper(() => this.stepInteractiveCpuFrame());
    }

    this.refreshZoneDropdown();
    this.bindUI();
    this.api = installLockstepAPI(this);

    if (this.isLockstep) {
      this.api.loadZone(1, 1);
    } else {
      // Boot into the original Atari 800XL Intro / Title Screen first!
      this.loadInteractiveScreen("title");
    }
  }

  getZoneDataByNumber(zoneNumber) {
    const z = zoneNumber | 0;
    if (z >= 1 && z <= 12) {
      return this.bundle.zones[z - 1];
    }
    if (z >= 13 && z <= 22) {
      return this.bonusLevels[z - 13];
    }
    if (z >= 23 && z <= 27 && this.levelEditor) {
      const slot = this.levelEditor.customSlots[z - 23];
      if (slot) return slot;
    }
    return this.bundle.zones[0];
  }

  refreshZoneDropdown(selectZoneNum = null) {
    const group = document.getElementById("ui-custom-zones-group");
    const zoneSelect = document.getElementById("ui-zone-select");
    if (group && this.levelEditor) {
      group.innerHTML = "";
      this.levelEditor.customSlots.forEach((slot, idx) => {
        if (slot) {
          const opt = document.createElement("option");
          const zNum = 23 + idx;
          opt.value = String(zNum);
          opt.textContent = `Zone ${zNum} 🛠 ${slot.title || "Custom Level " + (idx + 1)}`;
          group.appendChild(opt);
        }
      });
    }
    if (selectZoneNum !== null && zoneSelect) {
      zoneSelect.value = String(selectZoneNum);
      this.currentSelectedZone = selectZoneNum;
    }
  }

  stepInteractiveCpuFrame() {
    this.inputBridge.consumeFrameInput(null);
    const prevDl = (this.memory.ram[0x0231] << 8) | this.memory.ram[0x0230];
    const prevZone = this.memory.ram[0x0554];
    const mainCycles = this.targetHz === 60 ? 19500 : 23500;
    this.cpu.runFrame(mainCycles);
    const newDl = (this.memory.ram[0x0231] << 8) | this.memory.ram[0x0230];
    const newZone = this.memory.ram[0x0554];

    // If the 6502 transitioned natively from Intro/Features ($3CE5/$939C) into In-Game ($3C8B)
    // while a Bonus/Custom Zone (13..27) was selected in the UI, apply that Bonus/Custom Zone!
    if (prevDl !== 0x3C8B && newDl === 0x3C8B && this.currentSelectedZone >= 13) {
      const zData = this.getZoneDataByNumber(this.currentSelectedZone);
      if (zData) {
        this.cpu.activeCustomZone = zData;
        this.cpu.applyCustomZoneOverlay(zData);
      }
    }

    // Apply brief zero-volume transition mute whenever a section, screen, or level transition occurred
    if (this.cpu.transitionOccurred || prevDl !== newDl || (newDl === 0x3C8B && prevZone !== newZone)) {
      this.pokey.triggerTransitionMute(55);
      this.pokey.syncRegistersFromRam();
    }

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

  loadAnyZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = false) {
    this.currentSelectedZone = zoneNumber | 0;
    const screenSelect = document.getElementById("ui-screen-select");
    if (screenSelect) screenSelect.value = "ingame";
    this.screens.activeScreen = "ingame";

    // Briefly zero POKEY output and clear hanging registers before switching zones
    this.pokey.silenceAll(55);

    if (this.currentSelectedZone >= 13) {
      const zData = this.getZoneDataByNumber(this.currentSelectedZone);
      this.cpu.startCustomZone(zData, optionLevel, resetLivesAndScore);
    } else {
      this.cpu.startZone(this.currentSelectedZone, optionLevel, resetLivesAndScore);
    }
    this.pokey.syncRegistersFromRam();
    this.renderer.renderFrame();
    this.renderer.renderFullZoneMapIfPresent();
    this.updateTelemetryUI();
  }

  loadInteractiveZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = false) {
    this.loadAnyZone(zoneNumber, optionLevel, resetLivesAndScore);
  }

  loadInteractiveScreen(screenName) {
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const zNum = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
    const lNum = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
    this.currentSelectedZone = zNum;

    if (screenName !== "title" && screenName !== "features" && screenName !== "halloffame" && screenName !== "hof") {
      this.loadAnyZone(zNum, lNum, false);
      return;
    }

    // Briefly zero POKEY output and clear hanging registers before switching screens
    this.pokey.silenceAll(55);

    this.screens.activeScreen = screenName;
    if (screenName === "title") {
      this.cpu.bootTitleScreen(Math.min(12, zNum), lNum);
    } else if (screenName === "features") {
      this.cpu.bootFeaturesScreen();
    } else if (screenName === "halloffame" || screenName === "hof") {
      this.cpu.bootHallOfFameScreen();
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
    const btnSelect = document.getElementById("btn-console-select");
    const btnOption = document.getElementById("btn-console-option");
    const btnStart = document.getElementById("btn-console-start");

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
            this.loadAnyZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10), false);
          } else {
            this.loadInteractiveScreen(val);
          }
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        const z = parseInt(zoneSelect.value, 10) || 1;
        const l = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
        this.currentSelectedZone = z;
        if (this.isLockstep) {
          this.api.loadZone(Math.min(12, z), l);
        } else {
          this.loadAnyZone(z, l, false);
        }
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        const z = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
        const l = parseInt(levelSelect.value, 10) || 1;
        if (this.isLockstep) {
          this.api.loadZone(Math.min(12, z), l);
        } else {
          const dl = (this.memory.ram[0x0231] << 8) | this.memory.ram[0x0230];
          if (dl === 0x3C8B) {
            this.loadAnyZone(z, l, false);
          } else {
            this.memory.ram[0x0556] = Math.max(0, Math.min(2, l - 1));
            this.memory.ram[0x0557] = this.memory.ram[0x0556];
          }
        }
      });
    }

    // Physical Atari 800XL Console Deck Buttons (SELECT, OPTION, START)
    if (btnSelect && zoneSelect) {
      btnSelect.addEventListener("click", () => {
        const opts = Array.from(zoneSelect.options);
        const nextIdx = (zoneSelect.selectedIndex + 1) % opts.length;
        zoneSelect.selectedIndex = nextIdx;
        const z = parseInt(zoneSelect.value, 10) || 1;
        this.currentSelectedZone = z;
        const dl = (this.memory.ram[0x0231] << 8) | this.memory.ram[0x0230];
        if (dl === 0x3CE5 && z <= 12) {
          // Update Title Screen Zone display ($4EBD) natively
          const zIdx = z - 1;
          const bcd = ((((z / 10) | 0) << 4) | (z % 10)) & 0xFF;
          this.memory.ram[0x0554] = zIdx;
          this.memory.ram[0x0558] = zIdx;
          this.memory.ram[0x0555] = this.memory.ram[0xA3CC + zIdx];
          this.memory.ram[0x0597] = bcd;
          this.memory.ram[0x0559] = bcd;
          this.cpu.callSubroutine(0x4FC5, 5000);
          this.renderer.renderFrame();
        } else {
          const l = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
          this.loadAnyZone(z, l, false);
        }
        this.updateTelemetryUI();
      });
    }

    if (btnOption && levelSelect) {
      btnOption.addEventListener("click", () => {
        levelSelect.selectedIndex = (levelSelect.selectedIndex + 1) % 3;
        const l = parseInt(levelSelect.value, 10) || 1;
        this.memory.ram[0x0556] = l - 1;
        this.memory.ram[0x0557] = l - 1;
        const dl = (this.memory.ram[0x0231] << 8) | this.memory.ram[0x0230];
        if (dl === 0x3CE5) {
          this.cpu.callSubroutine(0x4FEA, 5000);
          this.renderer.renderFrame();
        }
        this.updateTelemetryUI();
      });
    }

    if (btnStart) {
      btnStart.addEventListener("click", () => {
        const z = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
        const l = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
        this.loadAnyZone(z, l, true);
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

    const activeCustom = !this.isLockstep && this.cpu.activeCustomZone;
    const gameZoneNum = activeCustom
      ? activeCustom.zone
      : ((this.isLockstep ? ram[0x0558] : ram[0x0554]) & 0x0F) + 1;
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
        this.currentSelectedZone = gameZoneNum;
      }

      const banner = document.getElementById("ui-zone-banner");
      if (banner) {
        if (dl === 0x3CE5) {
          banner.textContent = "INTRO / TITELBILDSCHIRM — DRÜCKE [SPACE / START], UM ZU STARTEN ODER WÄHLE OBEN EIN LEVEL";
        } else if (dl === 0x939C) {
          banner.textContent = "FEATURES INTRO-SCHAU — DRÜCKE [SPACE / START], UM ZONE ZU STARTEN";
        } else if (dl === 0x8F08) {
          banner.textContent = "HALL OF FAME — HIGH SCORES";
        } else if (activeCustom) {
          banner.textContent = `${activeCustom.title} — ${activeCustom.subtitle || ""} (Verbleibendes Plutonium: ${ram[0x0598]})`;
        } else {
          banner.textContent = `ORIGINAL ZONE ${String(gameZoneNum).padStart(2, "0")} — Verbleibendes Plutonium: ${ram[0x0598]} | Matten: ${ram[0x0576]}`;
        }
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
