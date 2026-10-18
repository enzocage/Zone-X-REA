/**
 * src/app/ZoneXApp.js
 * Clean Application Controller & UI View-Binder for Zone X.
 * Connects GameState, GameEngine, AtariDisplayRenderer, PokeyAudioSynthesizer,
 * InputController, BonusLevelPack, and LevelEditorController.
 */

import {
  GridConfig,
  ScreenMode,
  RefreshStandard,
} from "../config/Constants.js";
import { GameState } from "../models/GameState.js";
import { buildBonusLevels } from "../levels/BonusLevelPack.js";
import { PokeyAudioSynthesizer } from "../audio/PokeyAudioSynthesizer.js";
import { AtariDisplayRenderer } from "../graphics/AtariDisplayRenderer.js";
import { InputController } from "../engine/InputController.js";
import { GameEngine } from "../engine/GameEngine.js";
import { LevelEditorController } from "../editor/LevelEditorController.js";

export class ZoneXApp {
  constructor(assetBundle) {
    this.bundle = assetBundle;
    this.state = new GameState(assetBundle);
    this.canvas = document.getElementById("atari-canvas");
    this.renderer = new AtariDisplayRenderer(this.canvas, this.state, assetBundle);
    this.pokey = new PokeyAudioSynthesizer(this.state);
    this.input = new InputController(this.state);
    this.engine = new GameEngine(this.state, assetBundle);
    this.bonusLevels = buildBonusLevels();
    this.currentSelectedZone = 1;

    this.refreshStandard = RefreshStandard.PAL_50HZ;
    this.targetHz = this.refreshStandard.hz;
    this.frameDurationMs = this.refreshStandard.frameDurationMs;
    this.lastFrameTimestamp = performance.now();
    this.accumulatorMs = 0.0;
    this.autoLoopEnabled = true;

    this.pokey.setFrameStepper(() => this.stepFrame());

    this.levelEditor = new LevelEditorController(this);
    this.levelEditor.initUI();
    this.refreshZoneDropdown();
    this.bindUIControls();

    // Start authentically on the Atari 800XL Intro / Title Screen
    this.loadInteractiveScreen(ScreenMode.TITLE);
  }

  getZoneDataByNumber(zoneNumber) {
    const z = zoneNumber | 0;
    if (z >= 1 && z <= 12) {
      return this.bundle.zones[z - 1];
    }
    if (z >= GridConfig.FIRST_BONUS_ZONE && z <= 22) {
      return this.bonusLevels[z - GridConfig.FIRST_BONUS_ZONE];
    }
    if (
      z >= GridConfig.FIRST_CUSTOM_ZONE &&
      z < GridConfig.FIRST_CUSTOM_ZONE + GridConfig.CUSTOM_SLOT_COUNT &&
      this.levelEditor
    ) {
      const slot = this.levelEditor.customSlots[z - GridConfig.FIRST_CUSTOM_ZONE];
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
          const zNum = GridConfig.FIRST_CUSTOM_ZONE + idx;
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

  stepFrame() {
    this.input.updateHardwareInputRegisters();
    const prevScreenMode = this.state.currentScreenMode;
    const prevZone = this.state.selectedZoneNumber;

    this.engine.runFrame(this.refreshStandard.mainLoopCycles);

    const newScreenMode = this.state.currentScreenMode;
    const newZone = this.state.selectedZoneNumber;

    if (
      prevScreenMode !== ScreenMode.IN_GAME &&
      newScreenMode === ScreenMode.IN_GAME &&
      this.currentSelectedZone >= GridConfig.FIRST_BONUS_ZONE
    ) {
      const customZoneData = this.getZoneDataByNumber(this.currentSelectedZone);
      if (customZoneData) {
        this.engine.activeCustomZone = customZoneData;
        this.engine.applyCustomZoneOverlay(customZoneData);
      }
    }

    if (
      this.engine.transitionOccurred ||
      prevScreenMode !== newScreenMode ||
      (newScreenMode === ScreenMode.IN_GAME && prevZone !== newZone)
    ) {
      this.pokey.triggerTransitionMute(55);
      this.pokey.syncRegistersFromRam();
    }

    this.renderer.renderFrame();
    return {
      events: this.engine.pokeyEvents,
      totalCycles: this.engine.lastFrameTotalCycles,
    };
  }

  setRefreshRate(hz) {
    this.refreshStandard =
      hz === 60 ? RefreshStandard.NTSC_60HZ : RefreshStandard.PAL_50HZ;
    this.targetHz = this.refreshStandard.hz;
    this.frameDurationMs = this.refreshStandard.frameDurationMs;
    this.accumulatorMs = 0.0;
    this.pokey.setRefreshRate(this.targetHz);

    const btnHz = document.getElementById("btn-hz-toggle");
    if (btnHz) {
      btnHz.textContent = this.refreshStandard.buttonLabel;
    }
    const badgeHz = document.getElementById("ui-hz-badge");
    if (badgeHz) {
      badgeHz.textContent = this.refreshStandard.badgeLabel;
    }
    const btnAudio = document.getElementById("btn-audio-toggle");
    if (btnAudio && this.pokey.audioCtx && !this.pokey.muted) {
      btnAudio.textContent = `POKEY Audio Active (${this.targetHz}Hz)`;
    }
  }

  loadAnyZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = false) {
    this.currentSelectedZone = zoneNumber | 0;
    const screenSelect = document.getElementById("ui-screen-select");
    if (screenSelect) screenSelect.value = ScreenMode.IN_GAME;

    this.pokey.silenceAll(55);

    if (this.currentSelectedZone >= GridConfig.FIRST_BONUS_ZONE) {
      const zData = this.getZoneDataByNumber(this.currentSelectedZone);
      this.engine.startCustomZone(zData, optionLevel, resetLivesAndScore);
    } else {
      this.engine.startZone(this.currentSelectedZone, optionLevel, resetLivesAndScore);
    }
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
    this.currentSelectedZone = zNum;

    if (
      screenName !== ScreenMode.TITLE &&
      screenName !== ScreenMode.FEATURES &&
      screenName !== ScreenMode.HALL_OF_FAME &&
      screenName !== "hof"
    ) {
      this.loadAnyZone(zNum, lNum, false);
      return;
    }

    this.pokey.silenceAll(55);

    if (screenName === ScreenMode.TITLE) {
      this.engine.bootTitleScreen(Math.min(12, zNum), lNum);
    } else if (screenName === ScreenMode.FEATURES) {
      this.engine.bootFeaturesScreen();
    } else {
      this.engine.bootHallOfFameScreen();
    }
    this.pokey.syncRegistersFromRam();
    this.renderer.renderFrame();
    this.updateTelemetryUI();
  }

  bindUIControls() {
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
      const active = await this.pokey.enableAudio();
      if (active && btnAudio) {
        btnAudio.textContent = this.pokey.muted
          ? "POKEY Audio Muted"
          : `POKEY Audio Active (${this.targetHz}Hz)`;
      }
    };

    if (typeof window !== "undefined") {
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
        if (val === ScreenMode.IN_GAME) {
          this.loadAnyZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10), false);
        } else {
          this.loadInteractiveScreen(val);
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        const z = parseInt(zoneSelect.value, 10) || 1;
        const l = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
        this.currentSelectedZone = z;
        this.loadAnyZone(z, l, false);
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        const z = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
        const l = parseInt(levelSelect.value, 10) || 1;
        this.loadAnyZone(z, l, false);
      });
    }

    if (btnSelect) {
      btnSelect.addEventListener("click", () => {
        if (!zoneSelect) return;
        let z = parseInt(zoneSelect.value, 10) + 1;
        const maxOpts = zoneSelect.options.length;
        if (z > maxOpts) z = 1;
        zoneSelect.value = String(z);
        this.currentSelectedZone = z;
        const l = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;
        if (this.state.currentScreenMode === ScreenMode.TITLE && z <= 12) {
          this.loadInteractiveScreen(ScreenMode.TITLE);
        } else {
          this.loadAnyZone(z, l, false);
        }
      });
    }

    if (btnOption) {
      btnOption.addEventListener("click", () => {
        if (!levelSelect) return;
        let l = parseInt(levelSelect.value, 10) + 1;
        if (l > 3) l = 1;
        levelSelect.value = String(l);
        const z = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
        if (this.state.currentScreenMode === ScreenMode.TITLE && z <= 12) {
          this.loadInteractiveScreen(ScreenMode.TITLE);
        } else {
          this.loadAnyZone(z, l, false);
        }
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
          btnAudio.textContent = isUnmuted
            ? `POKEY Audio Active (${this.targetHz}Hz)`
            : "POKEY Audio Muted";
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
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const pos = this.state.playerPosition;
    const dl = this.state.displayListAddress;
    const lms0 = this.state.cameraLmsAddress;
    const scroll = this.state.scrollValues;
    const screenMode = this.state.currentScreenMode;

    const activeCustom = this.engine.activeCustomZone;
    const gameZoneNum = activeCustom
      ? activeCustom.zone
      : this.state.selectedZoneNumber;
    const romZoneIdx = this.state.romZoneIndex;

    setTxt("dbg-zone", `${gameZoneNum} (ROM #$${romZoneIdx.toString(16).toUpperCase()})`);
    setTxt("dbg-player-xy", `(${pos.tileX}, ${pos.tileY})`);
    setTxt("dbg-char-xy", `(${pos.charX}, ${pos.charY})`);
    setTxt("dbg-dlist", `$${dl.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt("dbg-lms0", `$${lms0.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt(
      "dbg-scroll",
      `$${scroll.hscrol.toString(16).padStart(2, "0")} / $${scroll.vscrol.toString(16).padStart(2, "0")}`
    );
    setTxt("dbg-timer", this.state.radiationTimerHex);
    setTxt("dbg-score", this.state.scoreHex);
    setTxt("dbg-plutonium", `${this.state.remainingPlutonium}`);
    setTxt("dbg-mats", `${this.state.insulatingMatsCount}`);

    const items = this.state.inventoryItems;
    setTxt("dbg-inv", items.length ? items.join("+") : "NONE");

    const pRegs = this.pokey
      .getActiveRegisters()
      .slice(0, 8)
      .map((v) => v.toString(16).toUpperCase().padStart(2, "0"))
      .join(" ");
    setTxt("dbg-pokey", pRegs);

    const screenSelect = document.getElementById("ui-screen-select");
    if (screenSelect && screenSelect.value !== screenMode) {
      screenSelect.value = screenMode;
    }

    const zoneSelect = document.getElementById("ui-zone-select");
    if (
      zoneSelect &&
      screenMode === ScreenMode.IN_GAME &&
      parseInt(zoneSelect.value, 10) !== gameZoneNum
    ) {
      zoneSelect.value = String(gameZoneNum);
      this.currentSelectedZone = gameZoneNum;
    }

    const banner = document.getElementById("ui-zone-banner");
    if (banner) {
      if (screenMode === ScreenMode.TITLE) {
        banner.textContent =
          "INTRO / TITELBILDSCHIRM — DRÜCKE [SPACE / START], UM ZU STARTEN ODER WÄHLE OBEN EIN LEVEL";
      } else if (screenMode === ScreenMode.FEATURES) {
        banner.textContent =
          "FEATURES INTRO-SCHAU — DRÜCKE [SPACE / START], UM ZONE ZU STARTEN";
      } else if (screenMode === ScreenMode.HALL_OF_FAME) {
        banner.textContent = "HALL OF FAME — HIGH SCORES";
      } else if (activeCustom) {
        banner.textContent = `${activeCustom.title} — ${activeCustom.subtitle || ""} (Verbleibendes Plutonium: ${this.state.remainingPlutonium})`;
      } else {
        banner.textContent = `ORIGINAL ZONE ${String(gameZoneNum).padStart(2, "0")} — Verbleibendes Plutonium: ${this.state.remainingPlutonium} | Matten: ${this.state.insulatingMatsCount}`;
      }
    }
  }

  startLoop() {
    const tick = (now) => {
      if (this.autoLoopEnabled) {
        if (this.pokey.isAudioClockActive()) {
          this.lastFrameTimestamp = now;
          this.accumulatorMs = 0.0;
          if (this.pokey.consumeRenderedFrameFlag()) {
            this.updateTelemetryUI();
          }
        } else {
          let delta = now - this.lastFrameTimestamp;
          if (delta > 100) delta = 100;
          this.lastFrameTimestamp = now;
          this.accumulatorMs += delta;

          while (this.accumulatorMs >= this.frameDurationMs) {
            const info = this.stepFrame();
            this.pokey.enqueueFrameEvents(info.events, info.totalCycles);
            this.updateTelemetryUI();
            this.accumulatorMs -= this.frameDurationMs;
          }
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export async function bootstrapRefactoredZoneX() {
  let bundle = window.ZONEX_ROM_BUNDLE;
  if (!bundle) {
    const res = await fetch("assets/zonex_rom_bundle.json");
    bundle = await res.json();
  }
  const app = new ZoneXApp(bundle);
  window.zoneXApp = app;
  app.startLoop();
}

bootstrapRefactoredZoneX();
