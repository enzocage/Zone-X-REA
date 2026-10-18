/**
 * src/editor/LevelEditorController.js
 * Clean MVC Level Editor Controller for Zone X.
 * Uses LevelMap, EDITOR_PALETTE_CATALOG, and TileType enumerations
 * for structured 62x32 level design, procedural generation, and JSON Import/Export.
 */

import { GridConfig, TileType, PalettePreset } from "../config/Constants.js";
import { EDITOR_PALETTE_CATALOG } from "../config/TileCatalog.js";
import { LevelMap } from "../models/LevelMap.js";

const STORAGE_KEY = "zonex_custom_levels_v1";

export class LevelEditorController {
  constructor(app) {
    this.app = app;
    this.bundle = app.bundle;
    this.width = GridConfig.WIDTH;
    this.height = GridConfig.HEIGHT;

    this.selectedTile = TileType.WALL;
    this.paintTile = TileType.WALL;
    this.isPointerDown = false;
    this.customSlots = this.loadCustomSlotsFromStorage();

    this.modal = document.getElementById("editor-modal");
    this.canvas = document.getElementById("editor-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.paletteContainer = document.getElementById("editor-palette");
    this.statusEl = document.getElementById("editor-status");

    this.levelMap = new LevelMap({
      zoneNumber: GridConfig.FIRST_CUSTOM_ZONE,
      title: "CUSTOM LEVEL 1",
      subtitle: "Erstellt im Zone X Level-Editor",
      palette: PalettePreset.TWIN_REACTORS,
      playerSpawn: { x: 6, y: 6 },
      exitPortal: { x: 55, y: 25 },
    });

    this.initBlankLevel();
    this.bindEditorUI();
  }

  initUI() {
    this.renderPaletteButtons();
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  loadCustomSlotsFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === GridConfig.CUSTOM_SLOT_COUNT) {
          return parsed;
        }
      }
    } catch (_) {
      // Ignore storage access errors
    }
    return [null, null, null, null, null];
  }

  saveCustomSlotsToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.customSlots));
    } catch (_) {
      // Ignore storage access errors
    }
  }

  initBlankLevel() {
    this.levelMap.initializeBlankWithOuterWalls(TileType.FLOOR);
    this.levelMap.setPlayerSpawn(6, 6);
    this.levelMap.setExitPortal(55, 25);
    this.levelMap.setTile(15, 6, TileType.PLUTONIUM);
    this.levelMap.setTile(45, 25, TileType.CONTAINER);
  }

  loadZoneIntoEditor(zoneData) {
    if (!zoneData || !zoneData.playfield_bytes) return;
    this.levelMap.tiles.set(zoneData.playfield_bytes.map((b) => b & 0x1F));
    if (Array.isArray(zoneData.colors) && zoneData.colors.length >= 4) {
      this.levelMap.palette = zoneData.colors.slice(0, 4);
    }
    if (zoneData.player_start) {
      this.levelMap.setPlayerSpawn(zoneData.player_start.x, zoneData.player_start.y);
    }
    if (zoneData.exit_pos) {
      this.levelMap.setExitPortal(zoneData.exit_pos.x, zoneData.exit_pos.y);
    }
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  buildZoneData(zoneNumber = GridConfig.FIRST_CUSTOM_ZONE, title = "CUSTOM EDITOR ZONE") {
    this.levelMap.zoneNumber = zoneNumber;
    this.levelMap.title = title;
    this.levelMap.subtitle = "Erstellt im Zone X Level-Editor";

    const warpPads = [];
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.levelMap.getTile(x, y) === TileType.WARP_PAD) {
          warpPads.push({ x, y });
        }
      }
    }

    this.levelMap.warpGates = [];
    if (warpPads.length >= 2) {
      for (let i = 0; i < warpPads.length; i++) {
        const src = warpPads[i];
        const dst = warpPads[(i + 1) % warpPads.length];
        this.levelMap.addWarpLink(src.x, src.y, dst.x, dst.y);
      }
    }

    return this.levelMap.toZoneData();
  }

  generateProceduralLevel() {
    this.initBlankLevel();
    const palettes = [
      PalettePreset.TWIN_REACTORS,
      PalettePreset.EXCAVATION_GOLD,
      PalettePreset.QUANTUM_LABYRINTH,
      PalettePreset.BRIDGE_BUILDER,
      PalettePreset.OMEGA_CORE,
    ];
    this.levelMap.palette = palettes[Math.floor(Math.random() * palettes.length)].slice();

    for (const vx of [20, 41]) {
      this.levelMap.drawVerticalLine(vx, 1, this.height - 2, TileType.WALL);
      this.levelMap.setTile(vx, 7, TileType.LASER_DOOR_1A);
      this.levelMap.setTile(vx, 15, TileType.LOCKED_DOOR);
      this.levelMap.setTile(vx, 24, TileType.LASER_DOOR_2A);
    }

    for (const hy of [11, 21]) {
      this.levelMap.drawHorizontalLine(1, this.width - 2, hy, TileType.WALL);
      this.levelMap.setTile(10, hy, TileType.CRUMBLY_DIRT);
      this.levelMap.setTile(30, hy, TileType.LASER_DOOR_1B);
      this.levelMap.setTile(51, hy, TileType.LASER_DOOR_2B);
    }

    for (let y = 3; y <= 8; y++) {
      for (let x = 23; x <= 38; x++) {
        if ((x + y) % 2 === 0) this.levelMap.setTile(x, y, TileType.CRUMBLY_DIRT);
      }
    }
    this.levelMap.setTile(14, 5, TileType.SPADE);

    this.levelMap.drawVerticalLine(30, 22, this.height - 2, TileType.FORCEFIELD);
    this.levelMap.setTile(26, 16, TileType.INSULATING_MAT);
    this.levelMap.setTile(28, 16, TileType.INSULATING_MAT);

    this.levelMap.placeWarpStructure(10, 4);
    this.levelMap.placeWarpStructure(51, 27);

    for (const [px, py] of [
      [10, 8],
      [30, 5],
      [50, 6],
      [10, 26],
    ]) {
      this.levelMap.setTile(px, py, TileType.PLUTONIUM);
    }

    for (const [cx, cy] of [
      [48, 24],
      [52, 24],
      [48, 28],
      [52, 28],
    ]) {
      this.levelMap.setTile(cx, cy, TileType.CONTAINER);
    }

    this.levelMap.setTile(10, 16, TileType.KEY);
    this.levelMap.setTile(54, 6, TileType.KEY);
    this.levelMap.setTile(50, 16, TileType.EXTRA_TIME);
    this.levelMap.setTile(25, 26, TileType.RADIATION_CAPSULE);

    this.levelMap.setTile(15, 15, TileType.ALIEN_DROID_NORMAL);
    this.levelMap.setTile(35, 15, TileType.ALIEN_DROID_FAST);
    this.levelMap.setTile(48, 15, TileType.ALIEN_DROID_NORMAL);
    this.levelMap.setTile(15, 25, TileType.ALIEN_DROID_FAST);

    this.levelMap.setPlayerSpawn(5, 5);
    this.levelMap.setExitPortal(56, 26);

    this.renderEditorCanvas();
    this.updateEditorStats("Zufalls-Level erfolgreich generiert!");
  }

  applyPaintAt(tx, ty, tileId) {
    if (!this.levelMap.isInBounds(tx, ty)) return;
    const spawn = this.levelMap.playerSpawn;
    const exit = this.levelMap.exitPortal;

    if (tileId === TileType.PLAYER_START) {
      this.levelMap.setTile(spawn.x, spawn.y, TileType.FLOOR);
      this.levelMap.setPlayerSpawn(tx, ty);
    } else if (tileId === TileType.EXIT_PORTAL) {
      this.levelMap.setTile(exit.x, exit.y, TileType.FLOOR);
      this.levelMap.setExitPortal(tx, ty);
    } else if (tileId === TileType.WARP_PAD) {
      const cx = Math.max(2, Math.min(this.width - 3, tx));
      this.levelMap.placeWarpStructure(cx, ty);
    } else {
      if (tx === spawn.x && ty === spawn.y && tileId !== TileType.PLAYER_START) return;
      if (tx === exit.x && ty === exit.y && tileId !== TileType.EXIT_PORTAL) return;
      this.levelMap.setTile(tx, ty, tileId);
    }
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  drawSingleMetaTile(ctx, tileId, destX, destY, scale = 1) {
    const ram = this.app.state.ram;
    const pal = this.bundle.atari_pal_palette;
    const colors = this.levelMap.palette;
    const cMap = [
      pal[0x00],
      pal[colors[0] & 0xFE],
      pal[colors[1] & 0xFE],
      pal[colors[2] & 0xFE],
      pal[colors[3] & 0xFE],
    ];

    const mb = 0x6D42 + (tileId & 0x1F) * 4;
    const chars = [ram[mb], ram[mb + 1], ram[mb + 2], ram[mb + 3]];

    for (let cy = 0; cy < 2; cy++) {
      for (let cx = 0; cx < 2; cx++) {
        const ch = chars[cy * 2 + cx];
        const usePf3 = (ch & 0x80) !== 0;
        const glyphIdx = ch & 0x7F;
        for (let row = 0; row < 8; row++) {
          const byte = this.bundle.charsets.in_game[glyphIdx * 8 + row] || 0;
          for (let px = 0; px < 4; px++) {
            const bp = (byte >> (6 - px * 2)) & 0x03;
            const rgb =
              bp === 0
                ? cMap[0]
                : bp === 1
                  ? cMap[1]
                  : bp === 2
                    ? cMap[2]
                    : usePf3
                      ? cMap[4]
                      : cMap[3];
            ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
            ctx.fillRect(
              destX + (cx * 8 + px * 2) * scale,
              destY + (cy * 8 + row) * scale,
              2 * scale,
              1 * scale
            );
          }
        }
      }
    }
  }

  renderEditorCanvas() {
    if (!this.ctx || !this.canvas) return;
    const w = this.width * 16;
    const h = this.height * 16;
    const img = this.ctx.createImageData(w, h);
    const data = img.data;
    const pal = this.bundle.atari_pal_palette;
    const ram = this.app.state.ram;
    const colors = this.levelMap.palette;

    const c0 = pal[0x00];
    const c1 = pal[colors[0] & 0xFE];
    const c2 = pal[colors[1] & 0xFE];
    const c3 = pal[colors[2] & 0xFE];
    const c4 = pal[colors[3] & 0xFE];

    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const t = this.levelMap.getTile(tx, ty) & 0x1F;
        const mb = 0x6D42 + t * 4;
        for (let cy = 0; cy < 2; cy++) {
          for (let cx = 0; cx < 2; cx++) {
            const ch = ram[mb + cy * 2 + cx];
            const usePf3 = (ch & 0x80) !== 0;
            const glyphBase = (ch & 0x7F) * 8;
            for (let row = 0; row < 8; row++) {
              const byte = this.bundle.charsets.in_game[glyphBase + row] || 0;
              const py = ty * 16 + cy * 8 + row;
              for (let px = 0; px < 4; px++) {
                const bp = (byte >> (6 - px * 2)) & 0x03;
                const rgb =
                  bp === 0 ? c0 : bp === 1 ? c1 : bp === 2 ? c2 : usePf3 ? c4 : c3;
                const x0 = tx * 16 + cx * 8 + px * 2;
                const idx = (py * w + x0) * 4;
                data[idx] = rgb[0];
                data[idx + 1] = rgb[1];
                data[idx + 2] = rgb[2];
                data[idx + 3] = 255;
                data[idx + 4] = rgb[0];
                data[idx + 5] = rgb[1];
                data[idx + 6] = rgb[2];
                data[idx + 7] = 255;
              }
            }
          }
        }
      }
    }
    this.ctx.putImageData(img, 0, 0);

    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= this.width; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * 16, 0);
      this.ctx.lineTo(x * 16, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= this.height; y++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y * 16);
      this.ctx.lineTo(w, y * 16);
      this.ctx.stroke();
    }
  }

  updateEditorStats(customMsg = "") {
    if (!this.statusEl) return;
    let plut = 0;
    let cont = 0;
    let robs = 0;
    let warps = 0;

    for (let i = 0; i < this.levelMap.tiles.length; i++) {
      const t = this.levelMap.tiles[i];
      if (t === TileType.PLUTONIUM) plut++;
      else if (t === TileType.CONTAINER) cont++;
      else if (t === TileType.ALIEN_DROID_NORMAL || t === TileType.ALIEN_DROID_FAST) robs++;
      else if (t === TileType.WARP_PAD) warps++;
    }

    const spawn = this.levelMap.playerSpawn;
    const exit = this.levelMap.exitPortal;
    const base =
      `Plutonium: ${plut} | Container: ${cont} | Gegner: ${robs} | ` +
      `Teleporter: ${warps} | Start: (${spawn.x},${spawn.y}) | Exit: (${exit.x},${exit.y})`;
    this.statusEl.textContent = customMsg ? `${customMsg}  —  ${base}` : base;
  }

  renderPaletteButtons() {
    if (!this.paletteContainer) return;
    this.paletteContainer.innerHTML = "";
    EDITOR_PALETTE_CATALOG.forEach((item) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-tile-btn" + (item.id === this.selectedTile ? " active" : "");
      const iconCanvas = document.createElement("canvas");
      iconCanvas.width = 24;
      iconCanvas.height = 24;
      const ictx = iconCanvas.getContext("2d");
      this.drawSingleMetaTile(ictx, item.id, 4, 4, 1);
      const span = document.createElement("span");
      span.textContent = item.label;
      btn.appendChild(iconCanvas);
      btn.appendChild(span);
      btn.addEventListener("click", () => {
        this.selectedTile = item.id;
        Array.from(this.paletteContainer.querySelectorAll(".editor-tile-btn")).forEach((b) =>
          b.classList.remove("active")
        );
        btn.classList.add("active");
      });
      this.paletteContainer.appendChild(btn);
    });
  }

  openEditor() {
    if (!this.modal) return;
    this.modal.classList.remove("hidden");
    this.renderPaletteButtons();
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  closeEditor() {
    if (!this.modal) return;
    this.modal.classList.add("hidden");
  }

  bindEditorUI() {
    const btnOpen = document.getElementById("btn-open-editor");
    const btnClose = document.getElementById("btn-editor-close");
    const btnPlay = document.getElementById("btn-editor-play");
    const btnClear = document.getElementById("btn-editor-clear");
    const btnRandom = document.getElementById("btn-editor-random");
    const btnSaveSlot = document.getElementById("btn-editor-save-slot");
    const btnExport = document.getElementById("btn-editor-export");
    const btnImport = document.getElementById("btn-editor-import");
    const fileImport = document.getElementById("editor-file-import");
    const templateSelect = document.getElementById("editor-template-select");
    const slotSelect = document.getElementById("editor-slot-select");

    if (btnOpen) {
      btnOpen.addEventListener("click", () => this.openEditor());
    }
    if (btnClose) {
      btnClose.addEventListener("click", () => this.closeEditor());
    }
    if (btnClear) {
      btnClear.addEventListener("click", () => {
        this.initBlankLevel();
        this.renderEditorCanvas();
        this.updateEditorStats("Leeres Level initialisiert.");
      });
    }
    if (btnRandom) {
      btnRandom.addEventListener("click", () => {
        this.generateProceduralLevel();
      });
    }
    if (templateSelect) {
      templateSelect.addEventListener("change", () => {
        const val = parseInt(templateSelect.value, 10);
        if (!val) return;
        const zData = this.app.getZoneDataByNumber(val);
        if (zData) {
          this.loadZoneIntoEditor(zData);
          this.renderPaletteButtons();
          this.updateEditorStats(`Vorlage Zone ${val} geladen.`);
        }
      });
    }
    if (btnSaveSlot && slotSelect) {
      btnSaveSlot.addEventListener("click", () => {
        const slotIdx = Math.max(0, Math.min(4, parseInt(slotSelect.value, 10) || 0));
        const zNum = GridConfig.FIRST_CUSTOM_ZONE + slotIdx;
        const zData = this.buildZoneData(zNum, `CUSTOM LEVEL ${slotIdx + 1}`);
        this.customSlots[slotIdx] = zData;
        this.saveCustomSlotsToStorage();
        this.app.refreshZoneDropdown();
        this.updateEditorStats(`Gespeichert in Custom Slot ${slotIdx + 1} (Zone ${zNum})!`);
      });
    }
    if (btnPlay) {
      btnPlay.addEventListener("click", () => {
        const slotIdx = slotSelect
          ? Math.max(0, Math.min(4, parseInt(slotSelect.value, 10) || 0))
          : 0;
        const zNum = GridConfig.FIRST_CUSTOM_ZONE + slotIdx;
        const zData = this.buildZoneData(zNum, `CUSTOM LEVEL ${slotIdx + 1}`);
        this.customSlots[slotIdx] = zData;
        this.saveCustomSlotsToStorage();
        this.app.refreshZoneDropdown(zNum);
        this.closeEditor();
        this.app.loadAnyZone(zNum, 1, true);
      });
    }
    if (btnExport) {
      btnExport.addEventListener("click", () => {
        const zData = this.buildZoneData(GridConfig.FIRST_CUSTOM_ZONE, "CUSTOM EXPORT LEVEL");
        const blob = new Blob([JSON.stringify(zData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "zonex_custom_level.json";
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    if (btnImport && fileImport) {
      btnImport.addEventListener("click", () => fileImport.click());
      fileImport.addEventListener("change", (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const parsed = JSON.parse(String(reader.result));
            this.loadZoneIntoEditor(parsed);
            this.renderPaletteButtons();
            this.updateEditorStats("Level-JSON erfolgreich importiert!");
          } catch (_) {
            this.updateEditorStats("Fehler beim Lesen der JSON-Datei.");
          }
        };
        reader.readAsText(file);
      });
    }

    if (this.canvas) {
      const getTileCoords = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const tx = Math.floor(((e.clientX - rect.left) * scaleX) / 16);
        const ty = Math.floor(((e.clientY - rect.top) * scaleY) / 16);
        return { tx, ty };
      };

      this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      this.canvas.addEventListener("mousedown", (e) => {
        e.preventDefault();
        this.isPointerDown = true;
        this.paintTile = e.button === 2 ? TileType.FLOOR : this.selectedTile;
        const { tx, ty } = getTileCoords(e);
        this.applyPaintAt(tx, ty, this.paintTile);
      });
      this.canvas.addEventListener("mousemove", (e) => {
        if (!this.isPointerDown) return;
        const { tx, ty } = getTileCoords(e);
        this.applyPaintAt(tx, ty, this.paintTile);
      });
      window.addEventListener("mouseup", () => {
        this.isPointerDown = false;
      });
    }
  }
}
