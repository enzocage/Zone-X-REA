/**
 * @fileoverview Next-Gen Application Controller & Holographic UI Binder for Zone X GFX Redesign.
 *
 * Connects:
 * - `GameState` & `GameEngine` (Cycle-accurate Atari 800XL core + custom/bonus zones)
 * - `FmSynthesizerEngine` (Multi-Operator Web Audio FM Synthesizer + Hybrid POKEY + Spectrum Analyser)
 * - `SmoothAnimationTracker` (60/120fps sub-pixel entity interpolation + 3D particles & shockwaves)
 * - `WebGL3DMeshRenderer` (True 3D Bird's-Eye WebGL mesh renderer + dynamic lighting + articulated player/droids)
 * - `LevelEditorController` & `BonusLevelPack`
 */

import {
  GridConfig,
  RefreshStandard,
  ScreenMode,
  SystemAddressMap,
} from "../config/Constants.js";
import { FmSynthesizerEngine } from "../audio/FmSynthesizerEngine.js";
import { LevelEditorController } from "../editor/LevelEditorController.js";
import { GameEngine } from "../engine/GameEngine.js";
import { InputController } from "../engine/InputController.js";
import { SmoothAnimationTracker } from "../graphics/SmoothAnimationTracker.js";
import { MeshGeometryBuilder } from "../graphics/MeshGeometryBuilder.js";
import { WebGL3DMeshRenderer } from "../graphics/WebGL3DMeshRenderer.js";
import { buildBonusLevels } from "../levels/BonusLevelPack.js";
import { GameState } from "../models/GameState.js";

export class ZoneXApp {
  constructor(assetBundle) {
    this.bundle = assetBundle;
    this.state = new GameState(assetBundle);

    this.canvas = document.getElementById("atari-canvas");
    this.webglCanvas = document.getElementById("webgl-3d-canvas");
    this.fullMapCanvas = document.getElementById("full-map-canvas");
    this.fullMapPanel = document.querySelector(".full-map-panel");
    this.spectrumCanvas = document.getElementById("fm-spectrum-canvas");
    this.spectrumCtx = this.spectrumCanvas ? this.spectrumCanvas.getContext("2d") : null;

    // Multi-Operator FM Synthesizer + Hybrid POKEY Engine
    this.pokey = new FmSynthesizerEngine(this.state);

    // 60/120fps Smooth Sub-Frame Animation & 3D Particle Tracker
    this.animTracker = new SmoothAnimationTracker(this.pokey);

    // True WebGL 3D Bird's-Eye Mesh Renderer + Atari 2D Collision/Hologram Pass
    this.renderer = new WebGL3DMeshRenderer(
      assetBundle,
      this.state,
      this.canvas,
      this.fullMapCanvas,
      this.fullMapPanel,
      this.webglCanvas,
      this.animTracker
    );

    this.input = new InputController(this.state);
    this.engine = new GameEngine(this.state, assetBundle);
    this.bonusLevels = buildBonusLevels();
    this.currentSelectedZone = 1;

    this.refreshStandard = RefreshStandard.PAL_50HZ;
    this.targetHz = this.refreshStandard.hz;
    this.frameDurationMs = this.refreshStandard.frameDurationMs;
    this.lastFrameTimestamp = performance.now();
    this.lastRenderTimestamp = performance.now();
    this.accumulatorMs = 0.0;
    this.autoLoopEnabled = true;

    this.meshMixConfig = { defaultSourceId: 20 };
    for (const cat of MeshGeometryBuilder.ELEMENT_CATEGORIES) {
      this.meshMixConfig[cat.id] = 20;
    }

    this.pokey.setFrameStepper(() => this.stepFrame());

    this.levelEditor = new LevelEditorController(this);
    this.levelEditor.initUI();
    this.refreshZoneDropdown();
    this.bindUIControls();
    this.initMeshStudioUI();

    // Boot authentically into the Title Screen with 3D Showcase Backdrop
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

    // Run Atari 2D collision + display pass
    this.renderer.atari2d.renderFrame();

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
      badgeHz.textContent = `3D WEBGL + FM SYNTH (${this.targetHz}Hz)`;
    }
    this._updateAudioButtonLabel();
  }

  _updateAudioButtonLabel() {
    const btnAudio = document.getElementById("btn-audio-toggle");
    if (!btnAudio) return;
    if (!this.pokey.audioCtx || this.pokey.muted) {
      btnAudio.textContent = "🔇 Audio Muted";
    } else {
      const modeName =
        this.pokey.synthMode === "fm_remaster"
          ? "FM Synth"
          : this.pokey.synthMode === "hybrid"
            ? "Hybrid FM+POKEY"
            : "Classic POKEY";
      btnAudio.textContent = `🔊 ${modeName} (${this.targetHz}Hz)`;
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
    this.animTracker.resetZoneSnapshot(this.state.ram);
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
    const synthModeSelect = document.getElementById("ui-synth-mode");
    const renderModeSelect = document.getElementById("ui-render-mode");
    const cameraPresetSelect = document.getElementById("ui-camera-preset");
    const btnCamZoomIn = document.getElementById("btn-cam-zoom-in");
    const btnCamZoomOut = document.getElementById("btn-cam-zoom-out");
    const btnCamTiltUp = document.getElementById("btn-cam-tilt-up");
    const btnCamTiltDown = document.getElementById("btn-cam-tilt-down");
    const btnCrt = document.getElementById("btn-crt-toggle");
    const crtOverlay = document.getElementById("crt-overlay");
    const btnSelect = document.getElementById("btn-console-select");
    const btnOption = document.getElementById("btn-console-option");
    const btnStart = document.getElementById("btn-console-start");

    const autoUnlockAudio = async (e) => {
      if (e && e.target && e.target.closest && e.target.closest("#btn-audio-toggle")) {
        return;
      }
      const active = await this.pokey.enableAudio();
      if (active) {
        this._updateAudioButtonLabel();
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

    if (synthModeSelect) {
      synthModeSelect.addEventListener("change", () => {
        this.pokey.setSynthMode(synthModeSelect.value);
        this._updateAudioButtonLabel();
      });
    }

    if (renderModeSelect) {
      renderModeSelect.addEventListener("change", () => {
        this.renderer.setRenderMode(renderModeSelect.value);
      });
    }

    if (cameraPresetSelect) {
      cameraPresetSelect.addEventListener("change", () => {
        this.animTracker.setCameraPreset(cameraPresetSelect.value);
      });
    }

    if (btnCamZoomIn) {
      btnCamZoomIn.addEventListener("click", () => this.animTracker.adjustZoom(-1.8));
    }
    if (btnCamZoomOut) {
      btnCamZoomOut.addEventListener("click", () => this.animTracker.adjustZoom(1.8));
    }
    if (btnCamTiltUp) {
      btnCamTiltUp.addEventListener("click", () => this.animTracker.adjustPitch(6));
    }
    if (btnCamTiltDown) {
      btnCamTiltDown.addEventListener("click", () => this.animTracker.adjustPitch(-6));
    }

    if (this.webglCanvas) {
      this.webglCanvas.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          this.animTracker.adjustZoom(e.deltaY > 0 ? 1.2 : -1.2);
        },
        { passive: false }
      );
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
        } else {
          this.pokey.toggleMute();
        }
        this._updateAudioButtonLabel();
      });
    }

    if (btnCrt && crtOverlay) {
      btnCrt.addEventListener("click", () => {
        crtOverlay.classList.toggle("active");
      });
    }

    const crtContainer = document.getElementById("crt-container");
    const btnFullscreen = document.getElementById("btn-fullscreen-toggle");
    const btnCamFullscreen = document.getElementById("btn-cam-fullscreen");

    const updateFullscreenUI = () => {
      const nativeFs =
        document.fullscreenElement === crtContainer ||
        document.webkitFullscreenElement === crtContainer;
      const cssFs = crtContainer ? crtContainer.classList.contains("is-fullscreen") : false;
      const isFs = Boolean(nativeFs || cssFs);
      if (crtContainer && nativeFs && !cssFs) {
        crtContainer.classList.add("is-fullscreen");
      } else if (crtContainer && !nativeFs && this._wasNativeFs) {
        crtContainer.classList.remove("is-fullscreen");
      }
      this._wasNativeFs = Boolean(nativeFs);
      const activeFs = crtContainer ? crtContainer.classList.contains("is-fullscreen") : false;
      document.body.classList.toggle("fullscreen-active", activeFs);
      if (btnFullscreen) {
        btnFullscreen.textContent = activeFs ? "✕ Vollbild beenden" : "⛶ Vollbild";
      }
      if (btnCamFullscreen) {
        btnCamFullscreen.textContent = activeFs ? "✕ Beenden" : "⛶ Vollbild";
      }
      this.renderer.render3DPass();
    };

    this.toggleFullscreen = async () => {
      if (!crtContainer) return;
      const isCurrentlyFs =
        document.fullscreenElement === crtContainer ||
        document.webkitFullscreenElement === crtContainer ||
        crtContainer.classList.contains("is-fullscreen");

      if (isCurrentlyFs) {
        crtContainer.classList.remove("is-fullscreen");
        document.body.classList.remove("fullscreen-active");
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          try {
            if (document.exitFullscreen) await document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          } catch (_) {
            // Fallback already handled via CSS class removal
          }
        }
      } else {
        crtContainer.classList.add("is-fullscreen");
        document.body.classList.add("fullscreen-active");
        try {
          if (crtContainer.requestFullscreen) {
            await crtContainer.requestFullscreen();
          } else if (crtContainer.webkitRequestFullscreen) {
            crtContainer.webkitRequestFullscreen();
          }
        } catch (_) {
          // CSS .is-fullscreen fallback expands viewport to 100vw x 100vh
        }
      }
      updateFullscreenUI();
    };

    if (btnFullscreen) {
      btnFullscreen.addEventListener("click", () => this.toggleFullscreen());
    }
    if (btnCamFullscreen) {
      btnCamFullscreen.addEventListener("click", () => this.toggleFullscreen());
    }

    document.addEventListener("fullscreenchange", updateFullscreenUI);
    document.addEventListener("webkitfullscreenchange", updateFullscreenUI);

    window.addEventListener("keydown", (e) => {
      const tag = e.target && e.target.tagName ? e.target.tagName.toLowerCase() : "";
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.key === "Escape" && crtContainer && crtContainer.classList.contains("is-fullscreen")) {
        crtContainer.classList.remove("is-fullscreen");
        document.body.classList.remove("fullscreen-active");
        updateFullscreenUI();
      }
    });
  }

  /**
   * Initializes the 20-Source 3D Mesh Studio & 16-Element Mix-and-Match Configurator UI.
   */
  initMeshStudioUI() {
    const topSelect = document.getElementById("ui-mesh-source-select");
    const btnOpenStudio = document.getElementById("btn-open-mesh-studio");
    const btnCamShowcase = document.getElementById("btn-cam-showcase-toggle");
    const drawer = document.getElementById("mesh-studio-drawer");
    const btnViewToggle = document.getElementById("btn-mesh-view-toggle");
    const btnPlayLive = document.getElementById("btn-mesh-play-live");
    const btnClose = document.getElementById("btn-mesh-studio-close");
    const sourcesListEl = document.getElementById("mesh-sources-list");
    const mixGridEl = document.getElementById("mesh-mix-grid");

    // Populate the 20 3D Mesh Sources cards
    if (sourcesListEl) {
      sourcesListEl.innerHTML = "";
      for (const src of MeshGeometryBuilder.MESH_SOURCES) {
        const card = document.createElement("div");
        card.className = "mesh-source-card" + (src.id === 20 ? " active" : "");
        card.dataset.sourceId = String(src.id);
        card.innerHTML = `
          <div class="mesh-source-top">
            <strong>#${String(src.id).padStart(2, "0")} ${src.name}</strong>
            <span class="mesh-source-badge">${src.license} &bull; ${src.styleTag}</span>
          </div>
          <div class="mesh-source-summary">${src.summary}</div>
          <div class="mesh-source-preview"><strong>Komplettsatz:</strong> ${src.setPreview}</div>
          <div class="mesh-source-links">
            <a href="${src.url}" target="_blank" rel="noopener noreferrer">🔗 GitHub / 3D-Repo</a>
            ${src.webUrl ? `<a href="${src.webUrl}" target="_blank" rel="noopener noreferrer">🌐 Katalog</a>` : ""}
            <button type="button" class="btn-apply-set" data-sid="${src.id}">✓ Komplettsatz #${src.id} laden</button>
          </div>
        `;
        card.addEventListener("click", (e) => {
          if (e.target && e.target.tagName && e.target.tagName.toLowerCase() === "a") return;
          this.selectCompleteMeshSet(src.id);
        });
        sourcesListEl.appendChild(card);
      }
    }

    // Populate the 16 Gameplay Element Mix-and-Match selectors
    if (mixGridEl) {
      mixGridEl.innerHTML = "";
      for (const cat of MeshGeometryBuilder.ELEMENT_CATEGORIES) {
        const row = document.createElement("div");
        row.className = "mesh-mix-item";
        const optionsHtml = MeshGeometryBuilder.MESH_SOURCES.map(
          (s) =>
            `<option value="${s.id}" ${s.id === 20 ? "selected" : ""}>#${String(s.id).padStart(2, "0")} ${s.name}</option>`
        ).join("");
        row.innerHTML = `
          <div class="mesh-mix-label">
            <strong>${cat.label}</strong>
            <span>Slot: ${cat.tileHint}</span>
          </div>
          <select class="mesh-mix-select" data-cat-key="${cat.id}">
            ${optionsHtml}
          </select>
        `;
        const sel = row.querySelector("select");
        if (sel) {
          sel.addEventListener("change", () => {
            this.setCategoryMeshSource(cat.id, parseInt(sel.value, 10) || 20);
          });
        }
        mixGridEl.appendChild(row);
      }
    }

    if (topSelect) {
      topSelect.addEventListener("change", () => {
        const val = parseInt(topSelect.value, 10);
        if (val >= 1 && val <= 20) {
          this.selectCompleteMeshSet(val);
        }
      });
    }

    if (btnOpenStudio && drawer) {
      btnOpenStudio.addEventListener("click", () => {
        const willOpen = drawer.classList.contains("hidden");
        drawer.classList.toggle("hidden", !willOpen);
        if (willOpen) {
          this.setShowcaseCompleteSetMode(true);
        }
      });
    }

    if (btnClose && drawer) {
      btnClose.addEventListener("click", () => {
        drawer.classList.add("hidden");
      });
    }

    if (btnCamShowcase) {
      btnCamShowcase.addEventListener("click", () => {
        this.setShowcaseCompleteSetMode(!this.renderer.showcaseCompleteSetMode);
      });
    }

    if (btnViewToggle) {
      btnViewToggle.addEventListener("click", () => {
        this.setShowcaseCompleteSetMode(!this.renderer.showcaseCompleteSetMode);
      });
    }

    if (btnPlayLive) {
      btnPlayLive.addEventListener("click", () => {
        this.setShowcaseCompleteSetMode(false);
        if (drawer) drawer.classList.add("hidden");
        if (this.state.currentScreenMode !== ScreenMode.IN_GAME) {
          this.loadAnyZone(this.currentSelectedZone || 1, 1, false);
        }
      });
    }
  }

  /**
   * Applies one of the 20 3D Mesh Sources across all 16 Zone X gameplay elements.
   */
  selectCompleteMeshSet(sourceId) {
    const sid = Math.max(1, Math.min(20, sourceId | 0));
    this.meshMixConfig.defaultSourceId = sid;
    for (const cat of MeshGeometryBuilder.ELEMENT_CATEGORIES) {
      this.meshMixConfig[cat.id] = sid;
    }
    this.renderer.rebuildMeshes(this.meshMixConfig);
    this._syncMeshStudioUI();
    this.renderer.render3DPass();
  }

  /**
   * Mix-and-match: sets the 3D Mesh Source (1..20) for a single gameplay element category.
   */
  setCategoryMeshSource(categoryKey, sourceId) {
    const sid = Math.max(1, Math.min(20, sourceId | 0));
    this.meshMixConfig[categoryKey] = sid;
    this.renderer.rebuildMeshes(this.meshMixConfig);
    this._syncMeshStudioUI();
    this.renderer.render3DPass();
  }

  /**
   * Toggles the 4x4 16-Element 3D Diorama Showcase mode vs. live level view.
   */
  setShowcaseCompleteSetMode(enabled) {
    this.renderer.showcaseCompleteSetMode = Boolean(enabled);
    const overlay = document.getElementById("mesh-showcase-overlay");
    const btnCamShowcase = document.getElementById("btn-cam-showcase-toggle");
    const btnViewToggle = document.getElementById("btn-mesh-view-toggle");
    if (overlay) {
      overlay.classList.toggle("hidden", !this.renderer.showcaseCompleteSetMode);
    }
    if (btnCamShowcase) {
      btnCamShowcase.classList.toggle("active", this.renderer.showcaseCompleteSetMode);
      btnCamShowcase.textContent = this.renderer.showcaseCompleteSetMode
        ? "🎮 Zurück zum Level"
        : "🧩 16-Elemente-Schau";
    }
    if (btnViewToggle) {
      btnViewToggle.textContent = this.renderer.showcaseCompleteSetMode
        ? "🧩 16-Elemente-Schau (Ein)"
        : "🧩 16-Elemente-Schau (Aus)";
    }
    this._syncMeshStudioUI();
    this.renderer.render3DPass();
  }

  _syncMeshStudioUI() {
    const cats = MeshGeometryBuilder.ELEMENT_CATEGORIES;
    const firstSid = this.meshMixConfig[cats[0].id] || 20;
    const isUniform = cats.every((c) => (this.meshMixConfig[c.id] || 20) === firstSid);

    const topSelect = document.getElementById("ui-mesh-source-select");
    if (topSelect && isUniform) {
      topSelect.value = String(firstSid);
    }

    const cards = document.querySelectorAll(".mesh-source-card");
    cards.forEach((card) => {
      const cid = parseInt(card.dataset.sourceId, 10);
      card.classList.toggle("active", isUniform && cid === firstSid);
    });

    const selects = document.querySelectorAll(".mesh-mix-select");
    selects.forEach((sel) => {
      const key = sel.dataset.catKey;
      if (key && this.meshMixConfig[key]) {
        sel.value = String(this.meshMixConfig[key]);
      }
    });

    const titleEl = document.getElementById("mesh-showcase-title");
    const subEl = document.getElementById("mesh-showcase-sub");
    if (titleEl && subEl) {
      if (isUniform) {
        const srcObj =
          MeshGeometryBuilder.MESH_SOURCES.find((s) => s.id === firstSid) ||
          MeshGeometryBuilder.MESH_SOURCES[19];
        titleEl.textContent = `KOMPLETTSATZ #${String(srcObj.id).padStart(2, "0")}: ${srcObj.name} (${srcObj.license})`;
        subEl.textContent = `${srcObj.setPreview} — [${srcObj.url}]`;
      } else {
        titleEl.textContent = `INDIVIDUELLER MIX & MATCH 3D-SATZ (AUS 20 QUELLEN ZUSAMMENGESTELLT)`;
        subEl.textContent = `Alle 16 Zone-X Gameplay-Elemente im einheitlichen Hellgrau-Weiß Design + Gameplay-Akzente`;
      }
    }
  }

  /**
   * Updates both the Holographic Sci-Fi HUD overlay and the diagnostic telemetry panel.
   */
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

    const zoneStr = `ZONE ${String(gameZoneNum).padStart(2, "0")}`;
    const livesStr = `${this.state.ram[SystemAddressMap.LIVES_COUNT]}`;
    const plutStr = `${this.state.remainingPlutonium}`;
    const contStr = `${this.state.ram[SystemAddressMap.CONTAINERS_REMAINING]}`;
    const matsStr = `${this.state.insulatingMatsCount}`;

    // Holographic HUD cards
    setTxt("hud-zone-val", zoneStr);
    setTxt("hud-score-val", this.state.scoreHex);
    setTxt("hud-lives-val", livesStr);
    setTxt("hud-plutonium-val", plutStr);
    setTxt("hud-containers-val", contStr);
    setTxt("hud-mats-val", matsStr);

    // Compact Fullscreen HUD bar
    setTxt("fs-hud-zone", zoneStr);
    setTxt("fs-hud-score", this.state.scoreHex);
    setTxt("fs-hud-lives", livesStr);
    setTxt("fs-hud-plutonium", plutStr);
    setTxt("fs-hud-containers", contStr);

    // Radiation & Sector Countdown Gauge (4-digit BCD at $059D:$059E)
    const bcdHi = this.state.ram[0x059d] & 0xff;
    const bcdLo = this.state.ram[0x059e] & 0xff;
    const timerVal =
      ((bcdHi >> 4) & 0x0f) * 1000 +
      (bcdHi & 0x0f) * 100 +
      ((bcdLo >> 4) & 0x0f) * 10 +
      (bcdLo & 0x0f);
    const timerHexStr =
      bcdHi.toString(16).toUpperCase().padStart(2, "0") +
      bcdLo.toString(16).toUpperCase().padStart(2, "0");

    setTxt("fs-hud-timer", screenMode === ScreenMode.IN_GAME && timerVal > 0 ? timerHexStr : "SAFE");

    const radBar = document.getElementById("hud-radiation-fill");
    const radText = document.getElementById("hud-radiation-text");
    if (radBar && radText) {
      if (screenMode === ScreenMode.IN_GAME && timerVal > 0) {
        const pct = Math.max(5, Math.min(100, (timerVal / 3000) * 100));
        radBar.style.width = `${pct}%`;
        radBar.className = pct < 25 ? "rad-fill danger" : pct < 55 ? "rad-fill active" : "rad-fill safe";
        radText.textContent = `ZEIT-RESERVE: ${timerHexStr}`;
      } else {
        radBar.style.width = "100%";
        radBar.className = "rad-fill safe";
        radText.textContent = "STABLE (SAFE)";
      }
    }

    // Inventory Holographic Badges
    const toggleBadge = (id, active) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle("active", Boolean(active));
    };
    const hasKey = this.state.ram[SystemAddressMap.INV_HAS_KEY] > 0;
    const hasMask = this.state.ram[SystemAddressMap.INV_HAS_MASK] > 0;
    const hasSpade = this.state.ram[SystemAddressMap.INV_HAS_SPADE] > 0;
    const hasMats = this.state.insulatingMatsCount > 0;
    toggleBadge("badge-inv-key", hasKey);
    toggleBadge("badge-inv-mask", hasMask);
    toggleBadge("badge-inv-spade", hasSpade);
    toggleBadge("badge-inv-mats", hasMats);

    const fsInvIcons = [];
    if (hasKey) fsInvIcons.push("🔑");
    if (hasMask) fsInvIcons.push("🛡️");
    if (hasSpade) fsInvIcons.push("⛏️");
    if (hasMats) fsInvIcons.push(`🟨×${this.state.insulatingMatsCount}`);
    setTxt("fs-hud-inv", fsInvIcons.join(" "));

    // Hardware Diagnostics Telemetry
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
          "3D ORBITAL SHOWCASE / INTRO — DRÜCKE [SPACE / START], UM DIE MISSION ZU STARTEN";
      } else if (screenMode === ScreenMode.FEATURES) {
        banner.textContent =
          "FEATURES HOLOGRAMM-SCHAU — DRÜCKE [SPACE / START], UM ZONE ZU STARTEN";
      } else if (screenMode === ScreenMode.HALL_OF_FAME) {
        banner.textContent = "HALL OF FAME — KOMMANDANTEN-HIGHSCORES";
      } else if (activeCustom) {
        banner.textContent = `${activeCustom.title} — ${activeCustom.subtitle || ""} | Plutonium: ${this.state.remainingPlutonium}`;
      } else {
        banner.textContent = `ZONE ${String(gameZoneNum).padStart(2, "0")} [3D VOGELPERSPEKTIVE] — Plutonium: ${this.state.remainingPlutonium} | Matten: ${this.state.insulatingMatsCount}`;
      }
    }
  }

  /**
   * Renders the real-time FM Synthesizer Spectrum & Waveform Oscilloscope in the HUD.
   */
  renderAudioSpectrumHUD() {
    if (!this.spectrumCtx || !this.spectrumCanvas) return;
    const ctx = this.spectrumCtx;
    const w = this.spectrumCanvas.width;
    const h = this.spectrumCanvas.height;

    ctx.fillStyle = "rgba(6, 11, 24, 0.85)";
    ctx.fillRect(0, 0, w, h);

    const freq = this.pokey.getSpectrumData();
    const wave = this.pokey.getWaveformData();

    // Draw glowing frequency bars
    const barCount = 24;
    const barW = w / barCount;
    for (let i = 0; i < barCount; i++) {
      const val = freq[i] / 255.0;
      const barH = Math.max(2, val * (h - 6));
      const hue = 175 + i * 5;
      ctx.fillStyle = `hsla(${hue}, 95%, 60%, 0.85)`;
      ctx.fillRect(i * barW + 1, h - barH, barW - 2, barH);
    }

    // Draw FM waveform oscilloscope line on top
    ctx.strokeStyle = "#5fffe0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < wave.length; i++) {
      const x = (i / (wave.length - 1)) * w;
      const y = ((wave[i] - 128) / 128.0) * (h * 0.38) + h * 0.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  startLoop() {
    const tick = (now) => {
      const dtRenderSec = Math.min(0.05, Math.max(0.001, (now - this.lastRenderTimestamp) * 0.001));
      this.lastRenderTimestamp = now;

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

      // Advance butter-smooth 60/120fps 3D animations & render 3D Bird's-Eye Mesh pass every frame!
      const isInGame = this.state.currentScreenMode === ScreenMode.IN_GAME;
      this.animTracker.update(this.state.ram, dtRenderSec, isInGame);
      this.renderer.render3DPass();
      this.renderAudioSpectrumHUD();

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export async function bootstrapGfxRedesignZoneX() {
  let bundle = window.ZONEX_ROM_BUNDLE;
  if (!bundle) {
    const res = await fetch("assets/zonex_rom_bundle.json");
    bundle = await res.json();
  }
  const app = new ZoneXApp(bundle);
  window.zoneXApp = app;
  app.startLoop();
}

bootstrapGfxRedesignZoneX();
