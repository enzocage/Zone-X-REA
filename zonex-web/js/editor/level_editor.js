/**
 * zonex-web/js/editor/level_editor.js
 * Interactive 62x32 Atari 800XL Zone X Level Editor with Procedural Level Generator,
 * Authentic Tile Renderer, Warp Gate Linker, LocalStorage Slots, and JSON Import/Export.
 */

const W = 62;
const H = 32;

export const EDITOR_PALETTE_ITEMS = [
  { id: 0, label: "Boden (Floor)", cat: "Terrain" },
  { id: 1, label: "Mauer (Wall)", cat: "Terrain" },
  { id: 25, label: "Erde (Crumbly)", cat: "Terrain" },
  { id: 23, label: "Energiefeld (Laser Beam)", cat: "Hazard" },
  { id: 24, label: "Todeszone (Skull)", cat: "Hazard" },
  { id: 10, label: "Laser-Tür 1A (Auf/Zu)", cat: "Doors" },
  { id: 13, label: "Laser-Tür 1B (Zu/Auf)", cat: "Doors" },
  { id: 14, label: "Laser-Tür 2A (Schnell)", cat: "Doors" },
  { id: 15, label: "Laser-Tür 2B (Schnell)", cat: "Doors" },
  { id: 9, label: "Schlüssel-Tür (Locked)", cat: "Doors" },
  { id: 8, label: "Warp-Teleporter [3 Tiles]", cat: "Doors" },
  { id: 6, label: "Plutonium-Kern", cat: "Mission" },
  { id: 16, label: "Plutonium-Container", cat: "Mission" },
  { id: 11, label: "Spieler-Start (I)", cat: "Mission" },
  { id: 22, label: "Ausgang (Exit O)", cat: "Mission" },
  { id: 4, label: "Schlüssel (Key)", cat: "Items" },
  { id: 21, label: "Spaten (Spade)", cat: "Items" },
  { id: 17, label: "Isoliermatte (Mat)", cat: "Items" },
  { id: 5, label: "Strahlenschutz (Capsule)", cat: "Items" },
  { id: 19, label: "Extra-Zeit (Time)", cat: "Items" },
  { id: 20, label: "Mystery-Box (?)", cat: "Items" },
  { id: 26, label: "Alien-Droide R (Normal)", cat: "Enemies" },
  { id: 27, label: "Alien-Droide r (Schnell)", cat: "Enemies" },
];

export class LevelEditor {
  constructor(app) {
    this.app = app;
    this.bundle = app.bundle;
    this.grid = new Uint8Array(W * H);
    this.colors = [0x28, 0xCA, 0x94, 0x46];
    this.playerStart = { x: 6, y: 6 };
    this.exitPos = { x: 55, y: 25 };
    this.selectedTile = 1;
    this.isPointerDown = false;
    this.paintTile = 1;
    this.customSlots = this.loadCustomSlotsFromStorage();

    this.modal = document.getElementById("editor-modal");
    this.canvas = document.getElementById("editor-canvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.paletteContainer = document.getElementById("editor-palette");
    this.statusEl = document.getElementById("editor-status");

    this.initBlankLevel();
    this.bindEditorUI();
  }

  loadCustomSlotsFromStorage() {
    try {
      const raw = localStorage.getItem("zonex_custom_levels_v1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 5) return parsed;
      }
    } catch (_e) {
      // ignore storage errors
    }
    return [null, null, null, null, null];
  }

  saveCustomSlotsToStorage() {
    try {
      localStorage.setItem("zonex_custom_levels_v1", JSON.stringify(this.customSlots));
    } catch (_e) {
      // ignore storage errors
    }
  }

  initBlankLevel() {
    this.grid.fill(0);
    for (let x = 0; x < W; x++) {
      this.grid[0 * W + x] = 1;
      this.grid[(H - 1) * W + x] = 1;
    }
    for (let y = 0; y < H; y++) {
      this.grid[y * W + 0] = 1;
      this.grid[y * W + (W - 1)] = 1;
    }
    this.playerStart = { x: 6, y: 6 };
    this.exitPos = { x: 55, y: 25 };
    this.grid[this.playerStart.y * W + this.playerStart.x] = 11;
    this.grid[this.exitPos.y * W + this.exitPos.x] = 22;
    this.grid[6 * W + 15] = 6; // At least 1 Plutonium
    this.grid[25 * W + 45] = 16; // At least 1 Container
  }

  loadZoneIntoEditor(zoneData) {
    if (!zoneData || !zoneData.playfield_bytes) return;
    for (let i = 0; i < W * H; i++) {
      this.grid[i] = zoneData.playfield_bytes[i] & 0x1F;
    }
    if (Array.isArray(zoneData.colors) && zoneData.colors.length >= 4) {
      this.colors = zoneData.colors.slice(0, 4);
    }
    if (zoneData.player_start) {
      this.playerStart = { x: zoneData.player_start.x, y: zoneData.player_start.y };
    }
    if (zoneData.exit_pos) {
      this.exitPos = { x: zoneData.exit_pos.x, y: zoneData.exit_pos.y };
    }
    this.grid[this.playerStart.y * W + this.playerStart.x] = 11;
    this.grid[this.exitPos.y * W + this.exitPos.x] = 22;
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  buildZoneData(zoneNumber = 23, title = "CUSTOM EDITOR ZONE") {
    this.grid[this.playerStart.y * W + this.playerStart.x] = 11;
    this.grid[this.exitPos.y * W + this.exitPos.x] = 22;

    let plutoniumCount = 0;
    let containerCount = 0;
    let doorCount = 0;
    const robots = [];
    const warpPads = [];

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const t = this.grid[y * W + x];
        if (t === 6) plutoniumCount++;
        else if (t === 16) containerCount++;
        else if (t === 7 || t === 9) doorCount++;
        else if (t === 8) warpPads.push({ x, y });
        else if (t === 26 || t === 27) {
          const etype = t === 26 ? 0 : 1;
          robots.push({ x, y, type: etype, dir: 1, speed: etype === 0 ? 2 : 3 });
        }
      }
    }

    // Link all Warp Pads (Tile 8) in a loop so every teleporter works automatically
    const warps = [];
    if (warpPads.length >= 2) {
      for (let i = 0; i < warpPads.length; i++) {
        const src = warpPads[i];
        const dst = warpPads[(i + 1) % warpPads.length];
        warps.push({ src_x: src.x, src_y: src.y, dst_x: dst.x, dst_y: dst.y });
      }
    }

    return {
      zone: zoneNumber,
      title,
      subtitle: "Erstellt im Zone X Level-Editor",
      isBonus: true,
      internal_zone_idx: 0,
      difficulty: 0,
      width: W,
      height: H,
      fill_tile: 0,
      colors: this.colors.slice(0, 4),
      plutonium_count: Math.max(1, plutoniumCount),
      container_count: Math.max(1, containerCount),
      door_count: doorCount,
      player_start: {
        x: this.playerStart.x,
        y: this.playerStart.y,
        offset: this.playerStart.y * W + this.playerStart.x,
      },
      exit_pos: {
        x: this.exitPos.x,
        y: this.exitPos.y,
        offset: this.exitPos.y * W + this.exitPos.x,
      },
      warps,
      robots,
      playfield_bytes: Array.from(this.grid),
    };
  }

  generateProceduralLevel() {
    this.initBlankLevel();
    const palettes = [
      [0x28, 0xCA, 0x94, 0x46],
      [0x36, 0xEA, 0x24, 0x88],
      [0x94, 0xAC, 0x72, 0x1A],
      [0x74, 0xCE, 0x16, 0x58],
      [0x46, 0xFE, 0x96, 0x1C],
    ];
    this.colors = palettes[Math.floor(Math.random() * palettes.length)];

    // Create 3x2 grid of chambers connected by doors, laser gates, and crumbly passages
    for (const vx of [20, 41]) {
      for (let y = 1; y < H - 1; y++) this.grid[y * W + vx] = 1;
      this.grid[7 * W + vx] = 10;
      this.grid[15 * W + vx] = 9;
      this.grid[24 * W + vx] = 14;
    }
    for (const hy of [11, 21]) {
      for (let x = 1; x < W - 1; x++) this.grid[hy * W + x] = 1;
      this.grid[hy * W + 10] = 25;
      this.grid[hy * W + 30] = 13;
      this.grid[hy * W + 51] = 15;
    }

    // Add Crumbly Dirt pockets & Spade
    for (let y = 3; y <= 8; y++) {
      for (let x = 23; x <= 38; x++) {
        if ((x + y) % 2 === 0) this.grid[y * W + x] = 25;
      }
    }
    this.grid[5 * W + 14] = 21; // Spade

    // Add Forcefield trench & Mats in bottom-center chamber
    for (let y = 22; y < H - 1; y++) {
      this.grid[y * W + 30] = 23;
    }
    this.grid[16 * W + 26] = 17;
    this.grid[16 * W + 28] = 17;

    // Place Warp Gates in NW and SE chambers
    this.grid[4 * W + 9] = 2; this.grid[4 * W + 10] = 8; this.grid[4 * W + 11] = 3;
    this.grid[27 * W + 50] = 2; this.grid[27 * W + 51] = 8; this.grid[27 * W + 52] = 3;

    // Place 4 Plutonium, 4 Containers, Keys, Time, and Patrol Robots
    const plutCoords = [[10, 8], [30, 5], [50, 6], [10, 26]];
    for (const [px, py] of plutCoords) this.grid[py * W + px] = 6;

    const contCoords = [[48, 24], [52, 24], [48, 28], [52, 28]];
    for (const [cx, cy] of contCoords) this.grid[cy * W + cx] = 16;

    this.grid[16 * W + 10] = 4; // Key 1
    this.grid[6 * W + 54] = 4;  // Key 2
    this.grid[16 * W + 50] = 19; // Extra Time
    this.grid[26 * W + 25] = 5;  // Capsule

    // Robots
    this.grid[15 * W + 15] = 26;
    this.grid[15 * W + 35] = 27;
    this.grid[15 * W + 48] = 26;
    this.grid[25 * W + 15] = 27;

    this.playerStart = { x: 5, y: 5 };
    this.exitPos = { x: 56, y: 26 };
    this.grid[this.playerStart.y * W + this.playerStart.x] = 11;
    this.grid[this.exitPos.y * W + this.exitPos.x] = 22;

    this.renderEditorCanvas();
    this.updateEditorStats("Zufalls-Level erfolgreich generiert!");
  }

  applyPaintAt(tx, ty, tileId) {
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
    if (tileId === 11) {
      // Move single Player Start
      this.grid[this.playerStart.y * W + this.playerStart.x] = 0;
      this.playerStart = { x: tx, y: ty };
      this.grid[ty * W + tx] = 11;
    } else if (tileId === 22) {
      // Move single Exit Pos
      this.grid[this.exitPos.y * W + this.exitPos.x] = 0;
      this.exitPos = { x: tx, y: ty };
      this.grid[ty * W + tx] = 22;
    } else if (tileId === 8) {
      // Stamp 3-tile Warp Gate [2, 8, 3]
      const cx = Math.max(2, Math.min(W - 3, tx));
      this.grid[ty * W + (cx - 1)] = 2;
      this.grid[ty * W + cx] = 8;
      this.grid[ty * W + (cx + 1)] = 3;
    } else {
      if (tx === this.playerStart.x && ty === this.playerStart.y && tileId !== 11) return;
      if (tx === this.exitPos.x && ty === this.exitPos.y && tileId !== 22) return;
      this.grid[ty * W + tx] = tileId;
    }
    this.renderEditorCanvas();
    this.updateEditorStats();
  }

  drawSingleMetaTile(ctx, tileId, destX, destY, scale = 1) {
    const ram = this.app.memory.ram;
    const pal = this.bundle.atari_pal_palette;
    const cMap = [
      pal[0x00],
      pal[this.colors[0] & 0xFE],
      pal[this.colors[1] & 0xFE],
      pal[this.colors[2] & 0xFE],
      pal[this.colors[3] & 0xFE],
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
            const rgb = bp === 0 ? cMap[0] : bp === 1 ? cMap[1] : bp === 2 ? cMap[2] : usePf3 ? cMap[4] : cMap[3];
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
    const w = W * 16;
    const h = H * 16;
    const img = this.ctx.createImageData(w, h);
    const data = img.data;
    const pal = this.bundle.atari_pal_palette;
    const ram = this.app.memory.ram;

    const c0 = pal[0x00];
    const c1 = pal[this.colors[0] & 0xFE];
    const c2 = pal[this.colors[1] & 0xFE];
    const c3 = pal[this.colors[2] & 0xFE];
    const c4 = pal[this.colors[3] & 0xFE];

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const t = this.grid[ty * W + tx] & 0x1F;
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
                const rgb = bp === 0 ? c0 : bp === 1 ? c1 : bp === 2 ? c2 : usePf3 ? c4 : c3;
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

    // Subtle 16x16 grid lines
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    this.ctx.lineWidth = 1;
    for (let x = 0; x <= W; x++) {
      this.ctx.beginPath();
      this.ctx.moveTo(x * 16, 0);
      this.ctx.lineTo(x * 16, h);
      this.ctx.stroke();
    }
    for (let y = 0; y <= H; y++) {
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
    for (let i = 0; i < W * H; i++) {
      const t = this.grid[i];
      if (t === 6) plut++;
      else if (t === 16) cont++;
      else if (t === 26 || t === 27) robs++;
      else if (t === 8) warps++;
    }
    const base = `Plutonium: ${plut} | Container: ${cont} | Gegner: ${robs} | Teleporter: ${warps} | Start: (${this.playerStart.x},${this.playerStart.y}) | Exit: (${this.exitPos.x},${this.exitPos.y})`;
    this.statusEl.textContent = customMsg ? `${customMsg}  —  ${base}` : base;
  }

  renderPaletteButtons() {
    if (!this.paletteContainer) return;
    this.paletteContainer.innerHTML = "";
    EDITOR_PALETTE_ITEMS.forEach((item) => {
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
        const zNum = 23 + slotIdx;
        const zData = this.buildZoneData(zNum, `CUSTOM LEVEL ${slotIdx + 1}`);
        this.customSlots[slotIdx] = zData;
        this.saveCustomSlotsToStorage();
        this.app.refreshZoneDropdown();
        this.updateEditorStats(`Gespeichert in Custom Slot ${slotIdx + 1} (Zone ${zNum})!`);
      });
    }
    if (btnPlay) {
      btnPlay.addEventListener("click", () => {
        const slotIdx = slotSelect ? Math.max(0, Math.min(4, parseInt(slotSelect.value, 10) || 0)) : 0;
        const zNum = 23 + slotIdx;
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
        const zData = this.buildZoneData(23, "CUSTOM EXPORT LEVEL");
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
            this.updateEditorStats("JSON-Level erfolgreich importiert!");
          } catch (_err) {
            this.updateEditorStats("Fehler beim JSON-Import.");
          }
        };
        reader.readAsText(file);
      });
    }

    if (this.canvas) {
      const getCoords = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const tx = Math.floor(((e.clientX - rect.left) * scaleX) / 16);
        const ty = Math.floor(((e.clientY - rect.top) * scaleY) / 16);
        return { tx, ty };
      };

      this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      this.canvas.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        this.isPointerDown = true;
        this.paintTile = e.button === 2 ? 0 : this.selectedTile;
        const { tx, ty } = getCoords(e);
        this.applyPaintAt(tx, ty, this.paintTile);
      });
      this.canvas.addEventListener("pointermove", (e) => {
        const { tx, ty } = getCoords(e);
        if (this.isPointerDown) {
          this.applyPaintAt(tx, ty, this.paintTile);
        } else if (this.statusEl && tx >= 0 && tx < W && ty >= 0 && ty < H) {
          const tId = this.grid[ty * W + tx];
          this.updateEditorStats(`Cursor: (${tx}, ${ty}) [Tile #${tId}]`);
        }
      });
      window.addEventListener("pointerup", () => {
        this.isPointerDown = false;
      });
    }
  }
}
