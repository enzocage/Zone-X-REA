(function () {
  "use strict";

  // =========================================================================
  // Module: config/Constants.js
  // =========================================================================
/**
 * src/config/Constants.js
 * Central domain constants, enumerations, and system configuration for Zone X.
 */
const GridConfig = Object.freeze({
  WIDTH: 62,
  HEIGHT: 32,
  TOTAL_TILES: 62 * 32,
  SCREEN_WIDTH_PX: 320,
  SCREEN_HEIGHT_PX: 208,
  PLAYFIELD_ROW_STRIDE: 128,
  MAX_MOVING_ENEMIES: 32,
  MAX_WARP_GATES: 24,
  CUSTOM_SLOT_COUNT: 5,
  FIRST_BONUS_ZONE: 13,
  FIRST_CUSTOM_ZONE: 23,
});
const ScreenMode = Object.freeze({
  TITLE: "title",
  FEATURES: "features",
  IN_GAME: "ingame",
  HALL_OF_FAME: "halloffame",
});
const DisplayListAddress = Object.freeze({
  [ScreenMode.TITLE]: 0x3CE5,
  [ScreenMode.FEATURES]: 0x939C,
  [ScreenMode.IN_GAME]: 0x3C8B,
  [ScreenMode.HALL_OF_FAME]: 0x8F08,
});
const RefreshStandard = Object.freeze({
  PAL_50HZ: {
    hz: 50,
    frameDurationMs: 20.0,
    mainLoopCycles: 23500,
    masterClockHz: 1773447.0,
    buttonLabel: "Mode: 50 Hz (PAL)",
    badgeLabel: "ATARI 800XL PAL (50.00 Hz)",
  },
  NTSC_60HZ: {
    hz: 60,
    frameDurationMs: 1000.0 / 60.0,
    mainLoopCycles: 19500,
    masterClockHz: 1789772.5,
    buttonLabel: "Mode: 60 Hz (NTSC)",
    badgeLabel: "ATARI 800XL NTSC (60.00 Hz)",
  },
});
const TileType = Object.freeze({
  FLOOR: 0,
  WALL: 1,
  WARP_FRAME_LEFT: 2,
  WARP_FRAME_RIGHT: 3,
  KEY: 4,
  RADIATION_CAPSULE: 5,
  PLUTONIUM: 6,
  DOOR_MARKER_A: 7,
  WARP_PAD: 8,
  LOCKED_DOOR: 9,
  LASER_DOOR_1A: 10,
  PLAYER_START: 11,
  LASER_DOOR_1B: 13,
  LASER_DOOR_2A: 14,
  LASER_DOOR_2B: 15,
  CONTAINER: 16,
  INSULATING_MAT: 17,
  EXTRA_TIME: 19,
  MYSTERY_BOX: 20,
  SPADE: 21,
  EXIT_PORTAL: 22,
  FORCEFIELD: 23,
  SKULL_HAZARD: 24,
  CRUMBLY_DIRT: 25,
  ALIEN_DROID_NORMAL: 26,
  ALIEN_DROID_FAST: 27,
});
const PalettePreset = Object.freeze({
  TWIN_REACTORS: [0x28, 0xCA, 0x94, 0x46],
  EXCAVATION_GOLD: [0x36, 0xEA, 0x24, 0x88],
  LASER_GAUNTLET: [0x44, 0x1E, 0x82, 0xC8],
  QUANTUM_LABYRINTH: [0x94, 0xAC, 0x72, 0x1A],
  SWARM_ARENA: [0xB4, 0xEC, 0x32, 0x46],
  BRIDGE_BUILDER: [0x74, 0xCE, 0x16, 0x58],
  CHRONO_VAULT: [0x16, 0xBC, 0x84, 0x2A],
  CRUMBLY_CATACOMBS: [0x24, 0xDA, 0x36, 0x98],
  FORTRESS_CITADEL: [0x64, 0xEC, 0xB6, 0x3A],
  OMEGA_CORE: [0x46, 0xFE, 0x96, 0x1C],
});
const SystemAddressMap = Object.freeze({
  DLIST_PTR_LO: 0x0230,
  DLIST_PTR_HI: 0x0231,
  IN_GAME_LMS0_LO: 0x3C94,
  IN_GAME_LMS0_HI: 0x3C95,
  HSCROL: 0xD404,
  VSCROL: 0xD405,
  COLOR0_SHADOW: 0x02C4,

  STICK0: 0x0278,
  STRIG0: 0x0284,
  CH_KEY: 0x02FC,
  CONSOL: 0xD01F,

  SELECTED_ZONE_IDX: 0x0554,
  INTERNAL_ROM_ZONE_IDX: 0x0555,
  SELECTED_DIFFICULTY: 0x0556,
  ACTIVE_DIFFICULTY: 0x0557,
  ACTIVE_ZONE_IDX: 0x0558,
  ACTIVE_ZONE_BCD: 0x0559,
  PLAYER_CHAR_X: 0x0560,
  PLAYER_CHAR_Y: 0x0561,
  WARP_COUNT: 0x056F,
  DOOR_COUNT: 0x0570,
  INV_HAS_KEY: 0x0574,
  INV_HAS_MASK: 0x0575,
  INV_MAT_COUNT: 0x0576,
  DOOR_TIMER_A: 0x058D,
  DOOR_TIMER_B: 0x058E,
  SCORE_BCD_0: 0x0591,
  SCORE_BCD_1: 0x0592,
  SCORE_BCD_2: 0x0593,
  LIVES_COUNT: 0x059A,
  HUD_ZONE_BCD: 0x0597,
  PLUTONIUM_REMAINING: 0x0598,
  RADIATION_TIMER_LO: 0x059E,
  RADIATION_TIMER_HI: 0x059F,
  ACTIVE_ROBOT_COUNT: 0x05A0,
  INV_HAS_SPADE: 0x05AF,
  CONTAINERS_REMAINING: 0x05B3,

  POKEY_BASE: 0xD200,
  SFX_STATE_START: 0x05C3,
  SFX_STATE_END: 0x05D4,
});


  // =========================================================================
  // Module: config/TileCatalog.js
  // =========================================================================
/**
 * src/config/TileCatalog.js
 * Structured palette catalog of all playable tiles and entities in Zone X.
 */
const EDITOR_PALETTE_CATALOG = Object.freeze([
  { id: TileType.FLOOR, label: "Boden (Floor)", category: "Terrain" },
  { id: TileType.WALL, label: "Mauer (Wall)", category: "Terrain" },
  { id: TileType.CRUMBLY_DIRT, label: "Erde (Crumbly)", category: "Terrain" },
  { id: TileType.FORCEFIELD, label: "Energiefeld (Laser Beam)", category: "Hazard" },
  { id: TileType.SKULL_HAZARD, label: "Todeszone (Skull)", category: "Hazard" },
  { id: TileType.LASER_DOOR_1A, label: "Laser-Tür 1A (Auf/Zu)", category: "Doors" },
  { id: TileType.LASER_DOOR_1B, label: "Laser-Tür 1B (Zu/Auf)", category: "Doors" },
  { id: TileType.LASER_DOOR_2A, label: "Laser-Tür 2A (Schnell)", category: "Doors" },
  { id: TileType.LASER_DOOR_2B, label: "Laser-Tür 2B (Schnell)", category: "Doors" },
  { id: TileType.LOCKED_DOOR, label: "Schlüssel-Tür (Locked)", category: "Doors" },
  { id: TileType.WARP_PAD, label: "Warp-Teleporter [3 Tiles]", category: "Doors" },
  { id: TileType.PLUTONIUM, label: "Plutonium-Kern", category: "Mission" },
  { id: TileType.CONTAINER, label: "Plutonium-Container", category: "Mission" },
  { id: TileType.PLAYER_START, label: "Spieler-Start (I)", category: "Mission" },
  { id: TileType.EXIT_PORTAL, label: "Ausgang (Exit O)", category: "Mission" },
  { id: TileType.KEY, label: "Schlüssel (Key)", category: "Items" },
  { id: TileType.SPADE, label: "Spaten (Spade)", category: "Items" },
  { id: TileType.INSULATING_MAT, label: "Isoliermatte (Mat)", category: "Items" },
  { id: TileType.RADIATION_CAPSULE, label: "Strahlenschutz (Capsule)", category: "Items" },
  { id: TileType.EXTRA_TIME, label: "Extra-Zeit (Time)", category: "Items" },
  { id: TileType.MYSTERY_BOX, label: "Mystery-Box (?)", category: "Items" },
  { id: TileType.ALIEN_DROID_NORMAL, label: "Alien-Droide R (Normal)", category: "Enemies" },
  { id: TileType.ALIEN_DROID_FAST, label: "Alien-Droide r (Schnell)", category: "Enemies" },
]);


  // =========================================================================
  // Module: models/LevelMap.js
  // =========================================================================
/**
 * src/models/LevelMap.js
 * Clean object-oriented domain model for a 62x32 Zone X Level Map.
 * Provides chainable geometry builders, Warp Gate placement, validation, and JSON serialization.
 */
class LevelMap {
  constructor({
    zoneNumber = 13,
    title = "CUSTOM ZONE",
    subtitle = "",
    palette = PalettePreset.TWIN_REACTORS,
    fillTile = TileType.FLOOR,
    playerSpawn = { x: 6, y: 6 },
    exitPortal = { x: 55, y: 25 },
    warpGates = [],
    tiles = null,
  } = {}) {
    this.width = GridConfig.WIDTH;
    this.height = GridConfig.HEIGHT;
    this.zoneNumber = zoneNumber;
    this.title = title;
    this.subtitle = subtitle;
    this.palette = Array.isArray(palette)
      ? palette.slice(0, 4)
      : PalettePreset.TWIN_REACTORS.slice();
    this.playerSpawn = { x: playerSpawn.x | 0, y: playerSpawn.y | 0 };
    this.exitPortal = { x: exitPortal.x | 0, y: exitPortal.y | 0 };
    this.warpGates = Array.isArray(warpGates) ? warpGates.map((w) => ({ ...w })) : [];
    this.tiles = new Uint8Array(this.width * this.height);

    if (tiles && tiles.length === this.tiles.length) {
      this.tiles.set(tiles);
    } else {
      this.initializeBlankWithOuterWalls(fillTile);
    }
  }

  initializeBlankWithOuterWalls(fillTile = TileType.FLOOR) {
    this.tiles.fill(fillTile & 0x1F);
    for (let x = 0; x < this.width; x++) {
      this.tiles[0 * this.width + x] = TileType.WALL;
      this.tiles[(this.height - 1) * this.width + x] = TileType.WALL;
    }
    for (let y = 0; y < this.height; y++) {
      this.tiles[y * this.width + 0] = TileType.WALL;
      this.tiles[y * this.width + (this.width - 1)] = TileType.WALL;
    }
    return this;
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x, y) {
    if (!this.isInBounds(x, y)) return TileType.WALL;
    return this.tiles[y * this.width + x];
  }

  setTile(x, y, tileType) {
    if (!this.isInBounds(x, y)) return this;
    this.tiles[y * this.width + x] = tileType & 0x1F;
    return this;
  }

  fillRect(x0, y0, x1, y1, tileType = TileType.FLOOR) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.setTile(x, y, tileType);
      }
    }
    return this;
  }

  drawBorder(x0, y0, x1, y1, tileType = TileType.WALL) {
    for (let x = x0; x <= x1; x++) {
      this.setTile(x, y0, tileType);
      this.setTile(x, y1, tileType);
    }
    for (let y = y0; y <= y1; y++) {
      this.setTile(x0, y, tileType);
      this.setTile(x1, y, tileType);
    }
    return this;
  }

  drawHorizontalLine(x0, x1, y, tileType) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    for (let x = minX; x <= maxX; x++) {
      this.setTile(x, y, tileType);
    }
    return this;
  }

  drawVerticalLine(x, y0, y1, tileType) {
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (let y = minY; y <= maxY; y++) {
      this.setTile(x, y, tileType);
    }
    return this;
  }

  placeWarpStructure(centerX, y) {
    this.setTile(centerX - 1, y, TileType.WARP_FRAME_LEFT);
    this.setTile(centerX, y, TileType.WARP_PAD);
    this.setTile(centerX + 1, y, TileType.WARP_FRAME_RIGHT);
    return this;
  }

  addWarpLink(srcX, srcY, dstX, dstY) {
    this.warpGates.push({
      src_x: srcX | 0,
      src_y: srcY | 0,
      dst_x: dstX | 0,
      dst_y: dstY | 0,
    });
    return this;
  }

  setPlayerSpawn(x, y) {
    if (!this.isInBounds(x, y)) return this;
    this.playerSpawn = { x: x | 0, y: y | 0 };
    this.setTile(this.playerSpawn.x, this.playerSpawn.y, TileType.PLAYER_START);
    return this;
  }

  setExitPortal(x, y) {
    if (!this.isInBounds(x, y)) return this;
    this.exitPortal = { x: x | 0, y: y | 0 };
    this.setTile(this.exitPortal.x, this.exitPortal.y, TileType.EXIT_PORTAL);
    return this;
  }

  toZoneData() {
    this.setTile(this.playerSpawn.x, this.playerSpawn.y, TileType.PLAYER_START);
    this.setTile(this.exitPortal.x, this.exitPortal.y, TileType.EXIT_PORTAL);

    let plutoniumCount = 0;
    let containerCount = 0;
    let doorCount = 0;
    const robots = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.tiles[y * this.width + x];
        if (t === TileType.PLUTONIUM) plutoniumCount++;
        else if (t === TileType.CONTAINER) containerCount++;
        else if (t === TileType.DOOR_MARKER_A || t === TileType.LOCKED_DOOR) doorCount++;
        else if (t === TileType.ALIEN_DROID_NORMAL || t === TileType.ALIEN_DROID_FAST) {
          const etype = t === TileType.ALIEN_DROID_NORMAL ? 0 : 1;
          robots.push({
            x,
            y,
            type: etype,
            dir: (etype & 1) * 2 + 1,
            speed: etype === 0 ? 2 : 3,
          });
        }
      }
    }

    return {
      zone: this.zoneNumber,
      title: this.title,
      subtitle: this.subtitle,
      isBonus: true,
      internal_zone_idx: (this.zoneNumber - 1) % 12,
      difficulty: 0,
      width: this.width,
      height: this.height,
      fill_tile: TileType.FLOOR,
      colors: this.palette.slice(0, 4),
      plutonium_count: Math.max(1, plutoniumCount),
      container_count: Math.max(1, containerCount),
      door_count: doorCount,
      player_start: {
        x: this.playerSpawn.x,
        y: this.playerSpawn.y,
        offset: this.playerSpawn.y * this.width + this.playerSpawn.x,
      },
      exit_pos: {
        x: this.exitPortal.x,
        y: this.exitPortal.y,
        offset: this.exitPortal.y * this.width + this.exitPortal.x,
      },
      warps: this.warpGates.map((w) => ({ ...w })),
      robots,
      playfield_bytes: Array.from(this.tiles),
    };
  }
}


  // =========================================================================
  // Module: models/GameState.js
  // =========================================================================
/**
 * src/models/GameState.js
 * Clean high-level domain state facade over the Atari 800XL system memory & telemetry.
 * Eliminates raw hex addresses from UI, controller, and editor layers.
 */
class GameState {
  constructor(assetBundle) {
    this.bundle = assetBundle;
    this.ram = new Uint8Array(65536);

    // Hardware shadow registers
    this.hscrol = 8;
    this.vscrol = 0;
    this.chbase = 0x18;
    this.pmbase = 0x10;
    this.dmactl = 0x3E;
    this.gractl = 0x03;
    this.prior = 0x01;
    this.hposp = new Uint8Array([0, 0, 0, 0]);
    this.hposm = new Uint8Array([0, 0, 0, 0]);
    this.sizep = new Uint8Array([0, 0, 0, 0]);
    this.sizem = 0;
    this.colpm = new Uint8Array([0x58, 0xEC, 0x00, 0x00]);
    this.colpf = new Uint8Array([0x26, 0xCA, 0x94, 0x44]);
    this.colbk = 0x00;

    this.collisionP0PF = 0;
    this.collisionP1PF = 0;

    this.initializeCharsets();
  }

  initializeCharsets() {
    this.ram.fill(0);
    if (!this.bundle || !this.bundle.charsets) return;

    const inGame = this.bundle.charsets.in_game;
    const hud4000 = this.bundle.charsets.hud_4000;
    if (Array.isArray(inGame)) {
      for (let i = 0; i < 1024; i++) {
        const val = inGame[i] & 0xFF;
        this.ram[0x706C + i] = val;
        this.ram[0x1800 + i] = val;
      }
    }
    if (Array.isArray(hud4000)) {
      for (let i = 0; i < 1024; i++) {
        this.ram[0x4000 + i] = hud4000[i] & 0xFF;
      }
    }

    this.ram[SystemAddressMap.COLOR0_SHADOW + 0] = 0x26;
    this.ram[SystemAddressMap.COLOR0_SHADOW + 1] = 0xCA;
    this.ram[SystemAddressMap.COLOR0_SHADOW + 2] = 0x94;
    this.ram[SystemAddressMap.COLOR0_SHADOW + 3] = 0x44;
    this.ram[0x02C8] = 0x00;
    this.ram[0x02C0] = 0x58;
    this.ram[0x02C1] = 0xEC;
    this.ram[0x02F4] = 0x18;
    this.ram[SystemAddressMap.HSCROL] = 0x08;
    this.ram[SystemAddressMap.VSCROL] = 0x00;
  }

  get displayListAddress() {
    return (
      (this.ram[SystemAddressMap.DLIST_PTR_HI] << 8) |
      this.ram[SystemAddressMap.DLIST_PTR_LO]
    );
  }

  get currentScreenMode() {
    const dl = this.displayListAddress;
    if (dl === DisplayListAddress[ScreenMode.TITLE]) return ScreenMode.TITLE;
    if (dl === DisplayListAddress[ScreenMode.FEATURES]) return ScreenMode.FEATURES;
    if (dl === DisplayListAddress[ScreenMode.HALL_OF_FAME]) return ScreenMode.HALL_OF_FAME;
    return ScreenMode.IN_GAME;
  }

  get cameraLmsAddress() {
    return (
      (this.ram[SystemAddressMap.IN_GAME_LMS0_HI] << 8) |
      this.ram[SystemAddressMap.IN_GAME_LMS0_LO]
    );
  }

  get playerPosition() {
    const charX = this.ram[SystemAddressMap.PLAYER_CHAR_X];
    const charY = this.ram[SystemAddressMap.PLAYER_CHAR_Y];
    return {
      tileX: Math.floor(charX / 2) - 1,
      tileY: Math.floor(charY / 2),
      charX,
      charY,
    };
  }

  get scrollValues() {
    return {
      hscrol: this.ram[SystemAddressMap.HSCROL],
      vscrol: this.ram[SystemAddressMap.VSCROL],
    };
  }

  get radiationTimerHex() {
    const lo = this.ram[SystemAddressMap.RADIATION_TIMER_LO] & 0xFF;
    const hi = this.ram[SystemAddressMap.RADIATION_TIMER_HI] & 0xFF;
    return ((hi << 8) | lo).toString(16).toUpperCase().padStart(4, "0");
  }

  get scoreHex() {
    return [
      this.ram[SystemAddressMap.SCORE_BCD_0],
      this.ram[SystemAddressMap.SCORE_BCD_1],
      this.ram[SystemAddressMap.SCORE_BCD_2],
    ]
      .map((b) => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0"))
      .join("");
  }

  get remainingPlutonium() {
    return this.ram[SystemAddressMap.PLUTONIUM_REMAINING];
  }

  get remainingContainers() {
    return this.ram[SystemAddressMap.CONTAINERS_REMAINING];
  }

  get insulatingMatsCount() {
    return this.ram[SystemAddressMap.INV_MAT_COUNT];
  }

  get inventoryItems() {
    const items = [];
    if (this.ram[SystemAddressMap.INV_HAS_KEY]) items.push("KEY");
    if (this.ram[SystemAddressMap.INV_HAS_MASK]) items.push("MASK");
    if (this.ram[SystemAddressMap.INV_HAS_SPADE]) items.push("SPADE");
    return items;
  }

  get romZoneIndex() {
    return this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] & 0x0F;
  }

  get selectedZoneNumber() {
    return (this.ram[SystemAddressMap.SELECTED_ZONE_IDX] & 0x0F) + 1;
  }

  setInGameViewportLms(baseAddr) {
    let addr = baseAddr & 0xFFFF;
    let dliAddr = 0x3C93;
    for (let row = 0; row < 20; row++) {
      this.ram[dliAddr + 1] = addr & 0xFF;
      this.ram[dliAddr + 2] = (addr >> 8) & 0xFF;
      addr = (addr + 128) & 0xFFFF;
      dliAddr += 3;
    }
  }
}


  // =========================================================================
  // Module: levels/BonusLevelPack.js
  // =========================================================================
/**
 * src/levels/BonusLevelPack.js
 * Clean, declarative level builders for the 10 Expansion Zones (Zones 13–22)
 * using the LevelMap domain model and semantic TileType enumerations.
 * Produces 1:1 identical level layouts to the original expansion pack.
 */


function buildZone13TwinReactors() {
  const map = new LevelMap({
    zoneNumber: 13,
    title: "ZONE 13: THE TWIN REACTORS",
    subtitle: "Synchronisiere West- & Ost-Reaktor durch die Wechsellaser-Schleusen",
    palette: PalettePreset.TWIN_REACTORS,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 31, y: 24 },
  });

  map.drawBorder(4, 3, 24, 28, TileType.WALL);
  map.drawBorder(37, 3, 57, 28, TileType.WALL);
  map.drawBorder(26, 6, 35, 25, TileType.WALL);

  map.drawHorizontalLine(4, 57, 14, TileType.WALL);
  map.drawHorizontalLine(4, 57, 16, TileType.WALL);
  map.drawHorizontalLine(5, 56, 15, TileType.FLOOR);

  map.setTile(14, 15, TileType.LASER_DOOR_1A);
  map.setTile(24, 15, TileType.LASER_DOOR_1B);
  map.setTile(37, 15, TileType.LASER_DOOR_2A);
  map.setTile(47, 15, TileType.LASER_DOOR_2B);

  for (const x of [9, 19, 42, 52]) {
    map.setTile(x, 14, TileType.FLOOR);
    map.setTile(x, 16, TileType.FLOOR);
  }

  map.setTile(30, 14, TileType.LOCKED_DOOR);
  map.setTile(31, 16, TileType.LOCKED_DOOR);

  map.setTile(7, 6, TileType.PLUTONIUM);
  map.setTile(21, 25, TileType.PLUTONIUM);
  map.setTile(40, 6, TileType.PLUTONIUM);
  map.setTile(54, 25, TileType.PLUTONIUM);

  map.setTile(21, 6, TileType.KEY);
  map.setTile(40, 25, TileType.KEY);
  map.setTile(7, 25, TileType.RADIATION_CAPSULE);
  map.setTile(54, 6, TileType.EXTRA_TIME);

  map.setTile(28, 9, TileType.CONTAINER);
  map.setTile(33, 9, TileType.CONTAINER);
  map.setTile(28, 22, TileType.CONTAINER);
  map.setTile(33, 22, TileType.CONTAINER);

  map.placeWarpStructure(14, 5);
  map.placeWarpStructure(47, 26);
  map.addWarpLink(14, 5, 47, 26);
  map.addWarpLink(47, 26, 14, 5);

  map.setTile(14, 9, TileType.ALIEN_DROID_NORMAL);
  map.setTile(14, 22, TileType.ALIEN_DROID_FAST);
  map.setTile(47, 9, TileType.ALIEN_DROID_FAST);
  map.setTile(47, 22, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone14ExcavationSiteAlpha() {
  const map = new LevelMap({
    zoneNumber: 14,
    title: "ZONE 14: EXCAVATION SITE ALPHA",
    subtitle: "Schnapp dir den Spaten und grabe Stollen zu den verschütteten Kavernen",
    palette: PalettePreset.EXCAVATION_GOLD,
    fillTile: TileType.CRUMBLY_DIRT,
    playerSpawn: { x: 5, y: 5 },
    exitPortal: { x: 56, y: 15 },
  });

  map.fillRect(2, 2, 12, 8, TileType.FLOOR);
  map.setTile(10, 4, TileType.RADIATION_CAPSULE);
  map.setTile(10, 6, TileType.EXTRA_TIME);

  map.drawBorder(16, 3, 28, 13, TileType.WALL);
  map.fillRect(17, 4, 27, 12, TileType.FLOOR);
  map.setTile(16, 8, TileType.CRUMBLY_DIRT);
  map.setTile(22, 13, TileType.CRUMBLY_DIRT);

  map.drawBorder(34, 3, 46, 13, TileType.WALL);
  map.fillRect(35, 4, 45, 12, TileType.FLOOR);
  map.setTile(34, 8, TileType.CRUMBLY_DIRT);
  map.setTile(40, 13, TileType.CRUMBLY_DIRT);

  map.drawBorder(16, 18, 28, 28, TileType.WALL);
  map.fillRect(17, 19, 27, 27, TileType.FLOOR);
  map.setTile(22, 18, TileType.CRUMBLY_DIRT);
  map.setTile(28, 23, TileType.CRUMBLY_DIRT);

  map.drawBorder(34, 18, 46, 28, TileType.WALL);
  map.fillRect(35, 19, 45, 27, TileType.FLOOR);
  map.setTile(40, 18, TileType.CRUMBLY_DIRT);
  map.setTile(46, 23, TileType.CRUMBLY_DIRT);

  map.drawBorder(50, 5, 59, 26, TileType.WALL);
  map.fillRect(51, 6, 58, 25, TileType.FLOOR);
  map.setTile(50, 15, TileType.LOCKED_DOOR);
  map.setTile(22, 8, TileType.KEY);

  map.setTile(25, 6, TileType.PLUTONIUM);
  map.setTile(42, 6, TileType.PLUTONIUM);
  map.setTile(20, 25, TileType.PLUTONIUM);
  map.setTile(42, 25, TileType.PLUTONIUM);

  map.setTile(54, 9, TileType.CONTAINER);
  map.setTile(56, 9, TileType.CONTAINER);
  map.setTile(54, 22, TileType.CONTAINER);
  map.setTile(56, 22, TileType.CONTAINER);

  map.setTile(22, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(40, 10, TileType.ALIEN_DROID_FAST);
  map.setTile(22, 21, TileType.ALIEN_DROID_FAST);
  map.setTile(40, 21, TileType.ALIEN_DROID_NORMAL);
  map.setTile(55, 15, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone15LaserGauntlet() {
  const map = new LevelMap({
    zoneNumber: 15,
    title: "ZONE 15: LASER GAUNTLET",
    subtitle: "Überquere die dreistufige Laser-Rennstrecke mit perfektem Timing & Matten",
    palette: PalettePreset.LASER_GAUNTLET,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 4, y: 5 },
    exitPortal: { x: 57, y: 26 },
  });

  map.drawHorizontalLine(1, 52, 10, TileType.WALL);
  map.drawHorizontalLine(9, 60, 21, TileType.WALL);

  for (let x = 10; x <= 46; x += 6) {
    map.drawVerticalLine(x, 1, 9, TileType.WALL);
    map.setTile(x, 5, x % 12 === 4 ? TileType.LASER_DOOR_1A : TileType.LASER_DOOR_2A);
  }

  map.setTile(55, 3, TileType.INSULATING_MAT);
  map.setTile(57, 3, TileType.INSULATING_MAT);
  map.setTile(55, 5, TileType.INSULATING_MAT);
  map.setTile(57, 5, TileType.KEY);
  map.setTile(58, 7, TileType.PLUTONIUM);

  for (let x = 16; x <= 44; x += 14) {
    map.drawVerticalLine(x, 11, 20, TileType.FORCEFIELD);
    map.setTile(x, 15, TileType.LASER_DOOR_1B);
  }
  map.setTile(30, 13, TileType.PLUTONIUM);
  map.setTile(22, 18, TileType.PLUTONIUM);
  map.setTile(4, 15, TileType.EXTRA_TIME);

  map.drawVerticalLine(25, 22, 30, TileType.WALL);
  map.setTile(25, 26, TileType.LOCKED_DOOR);
  map.drawVerticalLine(40, 22, 30, TileType.WALL);
  map.setTile(40, 26, TileType.LASER_DOOR_2B);

  map.setTile(15, 26, TileType.PLUTONIUM);
  map.setTile(48, 24, TileType.CONTAINER);
  map.setTile(52, 24, TileType.CONTAINER);
  map.setTile(48, 28, TileType.CONTAINER);
  map.setTile(52, 28, TileType.CONTAINER);

  map.setTile(35, 15, TileType.ALIEN_DROID_FAST);
  map.setTile(20, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(32, 26, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone16QuantumLabyrinth() {
  const map = new LevelMap({
    zoneNumber: 16,
    title: "ZONE 16: QUANTUM LABYRINTH",
    subtitle: "Nutze das 6-Insel-Warp-Netzwerk (FIRE auf Teleporter), um alle Kerne zu bergen",
    palette: PalettePreset.QUANTUM_LABYRINTH,
    fillTile: TileType.WALL,
    playerSpawn: { x: 7, y: 8 },
    exitPortal: { x: 57, y: 23 },
  });

  const islands = [
    { x0: 3, y0: 3, x1: 18, y1: 13 },
    { x0: 23, y0: 3, x1: 38, y1: 13 },
    { x0: 43, y0: 3, x1: 58, y1: 13 },
    { x0: 3, y0: 18, x1: 18, y1: 28 },
    { x0: 23, y0: 18, x1: 38, y1: 28 },
    { x0: 43, y0: 18, x1: 58, y1: 28 },
  ];

  for (const isl of islands) {
    map.fillRect(isl.x0, isl.y0, isl.x1, isl.y1, TileType.FLOOR);
    map.drawBorder(isl.x0 - 1, isl.y0 - 1, isl.x1 + 1, isl.y1 + 1, TileType.SKULL_HAZARD);
  }

  const warpCoords = [
    { x: 14, y: 8 },
    { x: 27, y: 8 },
    { x: 50, y: 8 },
    { x: 10, y: 23 },
    { x: 30, y: 23 },
    { x: 50, y: 23 },
  ];
  for (let i = 0; i < warpCoords.length; i++) {
    const src = warpCoords[i];
    const dst = warpCoords[(i + 1) % warpCoords.length];
    map.placeWarpStructure(src.x, src.y);
    map.addWarpLink(src.x, src.y, dst.x, dst.y);
  }

  map.setTile(33, 6, TileType.PLUTONIUM);
  map.setTile(33, 11, TileType.KEY);
  map.setTile(54, 6, TileType.PLUTONIUM);
  map.setTile(54, 11, TileType.EXTRA_TIME);
  map.setTile(14, 20, TileType.PLUTONIUM);
  map.setTile(14, 26, TileType.RADIATION_CAPSULE);
  map.setTile(35, 20, TileType.PLUTONIUM);

  map.drawVerticalLine(53, 18, 28, TileType.WALL);
  map.setTile(53, 23, TileType.LOCKED_DOOR);
  map.setTile(55, 20, TileType.CONTAINER);
  map.setTile(55, 22, TileType.CONTAINER);
  map.setTile(55, 24, TileType.CONTAINER);
  map.setTile(55, 26, TileType.CONTAINER);

  map.setTile(29, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(46, 10, TileType.ALIEN_DROID_FAST);
  map.setTile(6, 25, TileType.ALIEN_DROID_NORMAL);
  map.setTile(26, 25, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone17SwarmContainment() {
  const map = new LevelMap({
    zoneNumber: 17,
    title: "ZONE 17: SWARM CONTAINMENT",
    subtitle: "Dringe durch drei konzentrische Sicherheitsringe bis zum inneren Plutonium-Kern vor",
    palette: PalettePreset.SWARM_ARENA,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 2 },
    exitPortal: { x: 30, y: 15 },
  });

  map.drawBorder(6, 4, 55, 27, TileType.WALL);
  map.drawBorder(14, 8, 47, 23, TileType.WALL);
  map.drawBorder(22, 12, 39, 19, TileType.WALL);

  map.setTile(30, 4, TileType.LASER_DOOR_1A);
  map.setTile(30, 27, TileType.LASER_DOOR_1B);
  map.setTile(6, 15, TileType.FLOOR);
  map.setTile(55, 15, TileType.FLOOR);

  map.setTile(14, 15, TileType.LASER_DOOR_2A);
  map.setTile(47, 15, TileType.LASER_DOOR_2B);
  map.setTile(30, 8, TileType.FLOOR);
  map.setTile(30, 23, TileType.FLOOR);

  map.setTile(22, 15, TileType.LOCKED_DOOR);
  map.setTile(39, 15, TileType.LOCKED_DOOR);

  map.setTile(3, 3, TileType.KEY);
  map.setTile(58, 28, TileType.KEY);
  map.setTile(3, 28, TileType.EXTRA_TIME);
  map.setTile(58, 3, TileType.MYSTERY_BOX);

  map.setTile(26, 14, TileType.PLUTONIUM);
  map.setTile(34, 14, TileType.PLUTONIUM);
  map.setTile(26, 17, TileType.PLUTONIUM);
  map.setTile(34, 17, TileType.PLUTONIUM);

  map.setTile(9, 6, TileType.CONTAINER);
  map.setTile(52, 6, TileType.CONTAINER);
  map.setTile(9, 25, TileType.CONTAINER);
  map.setTile(52, 25, TileType.CONTAINER);

  map.setTile(10, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(51, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(30, 6, TileType.ALIEN_DROID_FAST);
  map.setTile(30, 25, TileType.ALIEN_DROID_FAST);
  map.setTile(18, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(43, 21, TileType.ALIEN_DROID_NORMAL);
  map.setTile(18, 21, TileType.ALIEN_DROID_FAST);
  map.setTile(43, 10, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone18TheBridgeBuilder() {
  const map = new LevelMap({
    zoneNumber: 18,
    title: "ZONE 18: THE BRIDGE BUILDER",
    subtitle: "Baue mit Isoliermatten (FIRE) sichere Brücken über die tödlichen Energiefelder",
    palette: PalettePreset.BRIDGE_BUILDER,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 30, y: 27 },
  });

  for (let y = 1; y < 31; y++) {
    map.setTile(20, y, TileType.FORCEFIELD);
    map.setTile(21, y, TileType.FORCEFIELD);
    map.setTile(40, y, TileType.FORCEFIELD);
    map.setTile(41, y, TileType.FORCEFIELD);
  }
  for (const y of [10, 15, 21]) {
    map.setTile(20, y, TileType.CRUMBLY_DIRT);
    map.setTile(21, y, TileType.CRUMBLY_DIRT);
    map.setTile(40, y, TileType.CRUMBLY_DIRT);
    map.setTile(41, y, TileType.CRUMBLY_DIRT);
  }

  for (const x of [28, 30, 32]) {
    map.setTile(x, 12, TileType.INSULATING_MAT);
    map.setTile(x, 18, TileType.INSULATING_MAT);
  }
  map.setTile(30, 6, TileType.EXTRA_TIME);

  map.drawBorder(4, 4, 16, 27, TileType.WALL);
  map.setTile(16, 10, TileType.LASER_DOOR_1A);
  map.setTile(16, 21, TileType.LASER_DOOR_2A);
  map.setTile(8, 8, TileType.PLUTONIUM);
  map.setTile(8, 15, TileType.PLUTONIUM);
  map.setTile(8, 23, TileType.PLUTONIUM);
  map.setTile(12, 15, TileType.ALIEN_DROID_NORMAL);

  map.drawBorder(45, 4, 57, 27, TileType.WALL);
  map.setTile(45, 10, TileType.LASER_DOOR_1B);
  map.setTile(45, 21, TileType.LASER_DOOR_2B);
  map.setTile(52, 8, TileType.CONTAINER);
  map.setTile(52, 15, TileType.CONTAINER);
  map.setTile(52, 23, TileType.CONTAINER);
  map.setTile(49, 15, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone19ChronoVault() {
  const map = new LevelMap({
    zoneNumber: 19,
    title: "ZONE 19: CHRONO VAULT",
    subtitle: "Öffne alle 4 Sicherheitsebenen rechtzeitig und sammle die Zeit-Kapseln",
    palette: PalettePreset.CHRONO_VAULT,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 6, y: 4 },
    exitPortal: { x: 56, y: 28 },
  });

  for (const y of [8, 16, 24]) {
    map.drawHorizontalLine(1, 60, y, TileType.WALL);
  }

  map.setTile(15, 8, TileType.LOCKED_DOOR);
  map.setTile(45, 8, TileType.LASER_DOOR_1A);
  map.setTile(30, 16, TileType.LOCKED_DOOR);
  map.setTile(10, 16, TileType.LASER_DOOR_2A);
  map.setTile(20, 24, TileType.LOCKED_DOOR);
  map.setTile(50, 24, TileType.LASER_DOOR_2B);

  map.setTile(52, 4, TileType.KEY);
  map.setTile(55, 4, TileType.EXTRA_TIME);
  map.setTile(25, 4, TileType.PLUTONIUM);

  map.setTile(8, 12, TileType.KEY);
  map.setTile(50, 12, TileType.EXTRA_TIME);
  map.setTile(38, 12, TileType.PLUTONIUM);

  map.setTile(54, 20, TileType.KEY);
  map.setTile(12, 20, TileType.EXTRA_TIME);
  map.setTile(30, 20, TileType.PLUTONIUM);

  map.setTile(10, 28, TileType.PLUTONIUM);
  for (const x of [40, 43, 46, 49]) {
    map.setTile(x, 28, TileType.CONTAINER);
  }

  map.setTile(35, 4, TileType.ALIEN_DROID_NORMAL);
  map.setTile(22, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 20, TileType.ALIEN_DROID_FAST);
  map.setTile(28, 28, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone20CrumblyCatacombs() {
  const map = new LevelMap({
    zoneNumber: 20,
    title: "ZONE 20: CRUMBLY CATACOMBS",
    subtitle: "Grabe taktische Abkürzungen durch die Katakomben, um den Droiden auszuweichen",
    palette: PalettePreset.CRUMBLY_CATACOMBS,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 4, y: 4 },
    exitPortal: { x: 58, y: 28 },
  });

  for (let rx = 12; rx <= 48; rx += 12) {
    map.drawVerticalLine(rx, 1, 30, TileType.WALL);
    for (let ry = 4; ry <= 28; ry += 8) {
      map.setTile(
        rx,
        ry,
        (rx + ry) % 16 === 0 ? TileType.LASER_DOOR_1A : TileType.CRUMBLY_DIRT
      );
    }
  }
  for (let ry = 8; ry <= 24; ry += 8) {
    map.drawHorizontalLine(1, 60, ry, TileType.WALL);
    for (let rx = 6; rx <= 54; rx += 12) {
      map.setTile(
        rx,
        ry,
        (rx + ry) % 24 === 0 ? TileType.LASER_DOOR_2A : TileType.CRUMBLY_DIRT
      );
    }
  }

  map.setTile(8, 4, TileType.RADIATION_CAPSULE);
  map.setTile(18, 4, TileType.EXTRA_TIME);

  map.setTile(30, 4, TileType.PLUTONIUM);
  map.setTile(54, 4, TileType.PLUTONIUM);
  map.setTile(6, 20, TileType.PLUTONIUM);
  map.setTile(30, 20, TileType.PLUTONIUM);
  map.setTile(54, 20, TileType.PLUTONIUM);

  for (const x of [18, 30, 42, 52, 55]) {
    map.setTile(x, 28, TileType.CONTAINER);
  }

  map.setTile(18, 12, TileType.ALIEN_DROID_NORMAL);
  map.setTile(42, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(18, 20, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 20, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone21FortressGremlin() {
  const map = new LevelMap({
    zoneNumber: 21,
    title: "ZONE 21: FORTRESS GREMLIN",
    subtitle: "Erobere alle vier Festungsflügel (Spaten, Matten, Schlüssel & Teleporter)",
    palette: PalettePreset.FORTRESS_CITADEL,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 57, y: 24 },
  });

  map.drawVerticalLine(28, 1, 30, TileType.WALL);
  map.drawVerticalLine(33, 1, 30, TileType.WALL);
  map.drawHorizontalLine(1, 60, 13, TileType.WALL);
  map.drawHorizontalLine(1, 60, 18, TileType.WALL);
  map.fillRect(29, 14, 32, 17, TileType.FLOOR);

  map.setTile(28, 7, TileType.LASER_DOOR_1A);
  map.setTile(33, 7, TileType.LOCKED_DOOR);
  map.setTile(28, 24, TileType.LASER_DOOR_2A);
  map.setTile(33, 24, TileType.LOCKED_DOOR);

  map.fillRect(4, 3, 16, 10, TileType.CRUMBLY_DIRT);
  map.setTile(22, 4, TileType.RADIATION_CAPSULE);
  map.setTile(8, 6, TileType.KEY);
  map.setTile(12, 6, TileType.PLUTONIUM);

  map.drawVerticalLine(16, 19, 30, TileType.FORCEFIELD);
  map.setTile(16, 24, TileType.CRUMBLY_DIRT);
  map.setTile(22, 22, TileType.INSULATING_MAT);
  map.setTile(24, 22, TileType.INSULATING_MAT);
  map.setTile(8, 22, TileType.KEY);
  map.setTile(8, 26, TileType.PLUTONIUM);

  map.placeWarpStructure(45, 5);
  map.setTile(54, 5, TileType.PLUTONIUM);
  map.setTile(54, 10, TileType.PLUTONIUM);
  map.setTile(45, 10, TileType.EXTRA_TIME);

  map.placeWarpStructure(45, 27);
  map.addWarpLink(45, 5, 45, 27);
  map.addWarpLink(45, 27, 45, 5);

  map.setTile(48, 21, TileType.CONTAINER);
  map.setTile(52, 21, TileType.CONTAINER);
  map.setTile(48, 25, TileType.CONTAINER);
  map.setTile(52, 25, TileType.CONTAINER);

  map.setTile(20, 9, TileType.ALIEN_DROID_NORMAL);
  map.setTile(42, 9, TileType.ALIEN_DROID_FAST);
  map.setTile(20, 26, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 23, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone22OmegaCoreMeltdown() {
  const map = new LevelMap({
    zoneNumber: 22,
    title: "ZONE 22: OMEGA CORE MELTDOWN",
    subtitle: "Das große Finale: 6 Plutonium-Stäbe im hochgesicherten Omega-Reaktor!",
    palette: PalettePreset.OMEGA_CORE,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 4 },
    exitPortal: { x: 31, y: 15 },
  });

  map.drawBorder(3, 2, 58, 29, TileType.SKULL_HAZARD);
  map.drawBorder(18, 7, 43, 24, TileType.WALL);
  map.drawBorder(25, 11, 36, 20, TileType.WALL);

  map.setTile(18, 15, TileType.LASER_DOOR_1A);
  map.setTile(43, 15, TileType.LASER_DOOR_1B);
  map.setTile(30, 7, TileType.LASER_DOOR_2A);
  map.setTile(30, 24, TileType.LASER_DOOR_2B);

  map.setTile(25, 15, TileType.LOCKED_DOOR);
  map.setTile(36, 15, TileType.LOCKED_DOOR);

  map.fillRect(6, 4, 13, 9, TileType.CRUMBLY_DIRT);
  map.setTile(9, 6, TileType.PLUTONIUM);
  map.setTile(11, 6, TileType.KEY);

  map.fillRect(48, 4, 55, 9, TileType.CRUMBLY_DIRT);
  map.setTile(51, 6, TileType.PLUTONIUM);
  map.setTile(53, 6, TileType.KEY);

  map.fillRect(6, 22, 13, 27, TileType.CRUMBLY_DIRT);
  map.setTile(9, 25, TileType.PLUTONIUM);
  map.setTile(11, 25, TileType.EXTRA_TIME);

  map.fillRect(48, 22, 55, 27, TileType.CRUMBLY_DIRT);
  map.setTile(51, 25, TileType.PLUTONIUM);
  map.setTile(53, 25, TileType.RADIATION_CAPSULE);

  map.setTile(21, 9, TileType.RADIATION_CAPSULE);
  map.setTile(39, 9, TileType.INSULATING_MAT);
  map.setTile(39, 22, TileType.INSULATING_MAT);
  map.setTile(21, 22, TileType.PLUTONIUM);
  map.setTile(39, 18, TileType.PLUTONIUM);

  for (const x of [28, 31, 34]) {
    map.setTile(x, 13, TileType.CONTAINER);
    map.setTile(x, 18, TileType.CONTAINER);
  }

  map.placeWarpStructure(9, 15);
  map.placeWarpStructure(52, 15);
  map.addWarpLink(9, 15, 52, 15);
  map.addWarpLink(52, 15, 9, 15);

  map.setTile(15, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(46, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(15, 19, TileType.ALIEN_DROID_NORMAL);
  map.setTile(46, 19, TileType.ALIEN_DROID_NORMAL);
  map.setTile(22, 15, TileType.ALIEN_DROID_FAST);
  map.setTile(39, 12, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}
function buildBonusLevels() {
  return [
    buildZone13TwinReactors(),
    buildZone14ExcavationSiteAlpha(),
    buildZone15LaserGauntlet(),
    buildZone16QuantumLabyrinth(),
    buildZone17SwarmContainment(),
    buildZone18TheBridgeBuilder(),
    buildZone19ChronoVault(),
    buildZone20CrumblyCatacombs(),
    buildZone21FortressGremlin(),
    buildZone22OmegaCoreMeltdown(),
  ];
}


  // =========================================================================
  // Module: audio/PokeyAudioSynthesizer.js
  // =========================================================================
/**
 * src/audio/PokeyAudioSynthesizer.js
 * Clean 4-Channel Atari 800XL POKEY (CO12294) Audio Synthesizer.
 * Features sample-locked frame timing, polynomial LFSR noise generators,
 * non-linear 4-channel DAC mixing, AC-coupling high-pass / RC low-pass filters,
 * and automatic 55ms zero-volume transition muting with smooth fade-in.
 */

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
class PokeyAudioSynthesizer {
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


  // =========================================================================
  // Module: audio/FmSynthesizerEngine.js
  // =========================================================================
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
class FmSynthesizerEngine {
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


  // =========================================================================
  // Module: graphics/AtariDisplayRenderer.js
  // =========================================================================
/**
 * src/graphics/AtariDisplayRenderer.js
 * Clean Atari 800XL Display List, Fine-Scroll (HSCROL/VSCROL), Player/Missile Sprite,
 * and Full 62x32 Map Overview Renderer.
 */
class AtariDisplayRenderer {
  constructor(canvas, gameState, assetBundle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.state = gameState;
    this.bundle = assetBundle;
    this.width = 336;
    this.height = 240;
    this.xOffset = 8;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.palPalette = assetBundle.atari_pal_palette;
    this.pfColorIndexBuf = new Uint8Array(this.width * this.height);

    this.fullMapCanvas = document.getElementById("full-map-canvas");
    this.fullMapPanel = document.querySelector(".full-map-panel");
    if (this.fullMapCanvas) {
      this.fullMapCtx = this.fullMapCanvas.getContext("2d");
      this.fullMapImageData = this.fullMapCtx.createImageData(992, 512);
    }
  }

  putPixel(buf, x, y, rgb, pfType = 0) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const pIdx = y * this.width + x;
      this.pfColorIndexBuf[pIdx] = pfType;
      const idx = pIdx << 2;
      buf[idx] = rgb[0];
      buf[idx + 1] = rgb[1];
      buf[idx + 2] = rgb[2];
      buf[idx + 3] = 255;
    }
  }

  drawDoublePixel(buf, scanlineY, screenX, rgb, pfType = 0) {
    this.putPixel(buf, screenX, scanlineY, rgb, pfType);
    this.putPixel(buf, screenX + 1, scanlineY, rgb, pfType);
  }

  readActivePaletteRegisters() {
    const ram = this.state.ram;
    return {
      COLPF0: ram[SystemAddressMap.COLOR0_SHADOW + 0],
      COLPF1: ram[SystemAddressMap.COLOR0_SHADOW + 1],
      COLPF2: ram[SystemAddressMap.COLOR0_SHADOW + 2],
      COLPF3: ram[SystemAddressMap.COLOR0_SHADOW + 3],
      COLBK: ram[SystemAddressMap.COLOR0_SHADOW + 4],
    };
  }

  renderFrame() {
    const ram = this.state.ram;
    const buf = this.imageData.data;
    this.pfColorIndexBuf.fill(0);

    const regs = this.readActivePaletteRegisters();
    const bgRgb = this.palPalette[regs.COLBK] || [0, 0, 0];

    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = bgRgb[0];
      buf[i + 1] = bgRgb[1];
      buf[i + 2] = bgRgb[2];
      buf[i + 3] = 255;
    }

    const dlAddr = this.state.displayListAddress;
    let chbase = (ram[0x02F4] << 8) & 0xFFFF;
    let dliIndex = 0;
    const hscrol = ram[SystemAddressMap.HSCROL] & 0x0F;
    const vscrol = ram[SystemAddressMap.VSCROL] & 0x07;

    const applyDisplayListInterrupt = () => {
      if (dlAddr === DisplayListAddress[ScreenMode.IN_GAME]) {
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        dliIndex++;
      } else if (dlAddr === DisplayListAddress[ScreenMode.FEATURES]) {
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        regs.COLPF2 = dliIndex & 1 ? 0x00 : 0x86;
        dliIndex++;
      } else if (dlAddr === DisplayListAddress[ScreenMode.TITLE]) {
        regs.COLPF0 = 0xB8;
        regs.COLPF1 = 0x88;
        regs.COLPF2 = 0xA8;
        regs.COLPF3 = 0xD8;
        dliIndex++;
      }
    };

    let scanlineY = 8;
    let pc = dlAddr;
    let curLms = 0;
    let steps = 0;
    let inVscrolRegion = false;

    while (scanlineY < this.height && steps < 256) {
      steps++;
      const ir = ram[pc & 0xFFFF];
      pc = (pc + 1) & 0xFFFF;

      if (ir === 0x41) break; // Jump and Wait for Vertical Blank

      const mode = ir & 0x0F;
      const hasHscrol = (ir & 0x10) !== 0;
      const hasVscrol = (ir & 0x20) !== 0;
      const hasLms = (ir & 0x40) !== 0;
      const hasDli = (ir & 0x80) !== 0;

      if (mode === 0) {
        inVscrolRegion = false;
        const blankLines = ((ir >> 4) & 0x07) + 1;
        scanlineY += blankLines;
        if (hasDli) applyDisplayListInterrupt();
        continue;
      }

      if (hasLms) {
        const lo = ram[pc & 0xFFFF];
        const hi = ram[(pc + 1) & 0xFFFF];
        pc = (pc + 2) & 0xFFFF;
        curLms = (hi << 8) | lo;
      }

      if (mode === 4) {
        let startScan = 0;
        let endScan = 8;
        if (!inVscrolRegion && hasVscrol) {
          startScan = vscrol;
          endScan = 8;
          inVscrolRegion = true;
        } else if (inVscrolRegion && !hasVscrol) {
          startScan = 0;
          endScan = vscrol;
          inVscrolRegion = false;
        }
        ({ scanlineY, curLms } = this.renderMode4Row(
          buf,
          ram,
          regs,
          chbase,
          curLms,
          scanlineY,
          startScan,
          endScan,
          hasHscrol,
          hscrol
        ));
      } else if (mode === 6) {
        ({ scanlineY, curLms } = this.renderMode6Or7Row(
          buf,
          ram,
          regs,
          bgRgb,
          chbase,
          curLms,
          scanlineY,
          hasHscrol,
          hscrol,
          8
        ));
      } else if (mode === 7) {
        ({ scanlineY, curLms } = this.renderMode6Or7Row(
          buf,
          ram,
          regs,
          bgRgb,
          chbase,
          curLms,
          scanlineY,
          hasHscrol,
          hscrol,
          16
        ));
      } else if (mode === 14) {
        ({ scanlineY, curLms } = this.renderMode14Row(buf, ram, regs, curLms, scanlineY));
      } else if (mode === 2) {
        ({ scanlineY, curLms } = this.renderMode2Row(buf, ram, regs, chbase, curLms, scanlineY));
      } else {
        scanlineY += 8;
      }

      if (hasDli) {
        applyDisplayListInterrupt();
      }
    }

    if (this.fullMapPanel) {
      this.fullMapPanel.style.display =
        dlAddr === DisplayListAddress[ScreenMode.IN_GAME] ? "" : "none";
    }

    this.renderPlayerMissileSprites(buf, ram);

    if (dlAddr === DisplayListAddress[ScreenMode.IN_GAME] && this.fullMapCtx) {
      this.renderFullZoneMap(regs, 0x1800);
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  renderMode4Row(buf, ram, regs, chbase, curLms, scanlineY, startScan, endScan, hasHscrol, hscrol) {
    if (hasHscrol) {
      const hShiftPx = (16 - hscrol) * 2;
      for (let scanlineInRow = startScan; scanlineInRow < endScan; scanlineInRow++) {
        if (scanlineY >= this.height) break;
        for (let dx = 0; dx < 320; dx += 2) {
          const srcX = dx + hShiftPx;
          const chCol = srcX >> 3;
          const px = (srcX & 7) >> 1;
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x7F;
          const usePF3 = (charCode & 0x80) !== 0;
          const glyphByte = ram[(chbase + (charIndex << 3) + (scanlineInRow & 0x07)) & 0xFFFF];
          const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;

          const { colorReg, pfType } = this.resolveMode4Color(regs, bitPair, usePF3, charIndex);
          this.drawDoublePixel(buf, scanlineY, this.xOffset + dx, this.palPalette[colorReg], pfType);
        }
        scanlineY++;
      }
      curLms = (curLms + 48) & 0xFFFF;
    } else {
      for (let scanlineInRow = startScan; scanlineInRow < endScan; scanlineInRow++) {
        if (scanlineY >= this.height) break;
        for (let chCol = 0; chCol < 40; chCol++) {
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x7F;
          const usePF3 = (charCode & 0x80) !== 0;
          const glyphByte = ram[(chbase + (charIndex << 3) + (scanlineInRow & 0x07)) & 0xFFFF];
          const screenX = this.xOffset + (chCol << 3);

          for (let px = 0; px < 4; px++) {
            const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
            const { colorReg, pfType } = this.resolveMode4Color(regs, bitPair, usePF3, charIndex);
            this.drawDoublePixel(
              buf,
              scanlineY,
              screenX + (px << 1),
              this.palPalette[colorReg],
              pfType
            );
          }
        }
        scanlineY++;
      }
      curLms = (curLms + 40) & 0xFFFF;
    }
    return { scanlineY, curLms };
  }

  resolveMode4Color(regs, bitPair, usePF3, charIndex = 0) {
    if (bitPair === 0) return { colorReg: regs.COLBK, pfType: 0 };
    if (bitPair === 1) return { colorReg: regs.COLPF0, pfType: 1 };
    if (bitPair === 2) {
      const isLethalHazard =
        (charIndex >= 0x20 && charIndex <= 0x27) ||
        (charIndex >= 0x48 && charIndex <= 0x7F);
      return { colorReg: regs.COLPF1, pfType: isLethalHazard ? 2 : 0 };
    }
    return {
      colorReg: usePF3 ? regs.COLPF3 : regs.COLPF2,
      pfType: usePF3 ? 4 : 3,
    };
  }

  renderMode6Or7Row(
    buf,
    ram,
    regs,
    bgRgb,
    chbase,
    curLms,
    scanlineY,
    hasHscrol,
    hscrol,
    rowHeight
  ) {
    const colorTable = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
    const isDoubleHeight = rowHeight === 16;

    if (hasHscrol) {
      const hShiftPx = (16 - hscrol) * 2;
      for (let s = 0; s < rowHeight; s++) {
        if (scanlineY >= this.height) break;
        const glyphRow = isDoubleHeight ? s >> 1 : s;
        for (let dx = 0; dx < 320; dx += 2) {
          const srcX = dx + hShiftPx;
          const chCol = srcX >> 4;
          const b = (srcX >> 1) & 7;
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x3F;
          const colorSel = (charCode >> 6) & 0x03;
          const fgRgb = this.palPalette[colorTable[colorSel]];
          const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
          const bit = (glyphByte >> (7 - b)) & 1;
          this.drawDoublePixel(
            buf,
            scanlineY,
            this.xOffset + dx,
            bit ? fgRgb : bgRgb,
            bit ? colorSel + 1 : 0
          );
        }
        scanlineY++;
      }
      curLms = (curLms + 24) & 0xFFFF;
    } else {
      for (let s = 0; s < rowHeight; s++) {
        if (scanlineY >= this.height) break;
        const glyphRow = isDoubleHeight ? s >> 1 : s;
        for (let chCol = 0; chCol < 20; chCol++) {
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x3F;
          const colorSel = (charCode >> 6) & 0x03;
          const fgRgb = this.palPalette[colorTable[colorSel]];
          const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
          const baseX = this.xOffset + (chCol << 4);
          for (let b = 0; b < 8; b++) {
            const bit = (glyphByte >> (7 - b)) & 1;
            this.drawDoublePixel(
              buf,
              scanlineY,
              baseX + (b << 1),
              bit ? fgRgb : bgRgb,
              bit ? colorSel + 1 : 0
            );
          }
        }
        scanlineY++;
      }
      curLms = (curLms + 20) & 0xFFFF;
    }
    return { scanlineY, curLms };
  }

  renderMode14Row(buf, ram, regs, curLms, scanlineY) {
    if (scanlineY < this.height) {
      const mode14Colors = [regs.COLBK, regs.COLPF0, regs.COLPF1, regs.COLPF2];
      for (let byteCol = 0; byteCol < 40; byteCol++) {
        const bval = ram[(curLms + byteCol) & 0xFFFF];
        const baseX = this.xOffset + (byteCol << 3);
        for (let px = 0; px < 4; px++) {
          const bp = (bval >> (6 - (px << 1))) & 0x03;
          const rgb = this.palPalette[mode14Colors[bp]];
          this.drawDoublePixel(buf, scanlineY, baseX + (px << 1), rgb, bp);
        }
      }
    }
    return {
      scanlineY: scanlineY + 1,
      curLms: (curLms + 40) & 0xFFFF,
    };
  }

  renderMode2Row(buf, ram, regs, chbase, curLms, scanlineY) {
    const fgRgb = this.palPalette[regs.COLPF1];
    const bgMode2 = this.palPalette[regs.COLPF2];
    for (let s = 0; s < 8; s++) {
      if (scanlineY >= this.height) break;
      for (let chCol = 0; chCol < 40; chCol++) {
        const charCode = ram[(curLms + chCol) & 0xFFFF];
        const charIndex = charCode & 0x7F;
        const inv = (charCode & 0x80) !== 0;
        const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
        const baseX = this.xOffset + (chCol << 3);
        for (let b = 0; b < 8; b++) {
          const bit = ((glyphByte >> (7 - b)) & 1) ^ (inv ? 1 : 0);
          this.putPixel(buf, baseX + b, scanlineY, bit ? fgRgb : bgMode2, bit ? 2 : 3);
        }
      }
      scanlineY++;
    }
    return {
      scanlineY,
      curLms: (curLms + 40) & 0xFFFF,
    };
  }

  renderPlayerMissileSprites(buf, ram) {
    const dmactl = ram[0x022F] || ram[0xD400];
    const gractl = ram[0xD01D];
    const pmbase = (ram[0xD407] & 0xF8) << 8;

    if ((dmactl & 0x08) === 0 || (gractl & 0x02) === 0 || pmbase === 0) return;

    for (let playerIdx = 3; playerIdx >= 0; playerIdx--) {
      const hpos = ram[0xD000 + playerIdx];
      if (hpos === 0) continue;

      const playerColor = this.palPalette[ram[0x02C0 + playerIdx]] || [255, 255, 255];
      const sizeCode = ram[0xD008 + playerIdx] & 0x03;
      const bitWidth = sizeCode === 1 ? 4 : sizeCode === 3 ? 8 : 2;
      const baseScreenX = this.xOffset + (hpos - 48) * 2;
      const playerBaseAddr = pmbase + 0x0400 + (playerIdx << 8);

      for (let sy = 8; sy < this.height; sy++) {
        const shapeByte = ram[(playerBaseAddr + sy) & 0xFFFF];
        if (shapeByte === 0) continue;

        for (let b = 0; b < 8; b++) {
          if (((shapeByte >> (7 - b)) & 1) === 0) continue;
          const pxStart = baseScreenX + b * bitWidth;

          for (let w = 0; w < bitWidth; w++) {
            const px = pxStart + w;
            if (px >= this.xOffset && px < this.xOffset + 320) {
              const pfType = this.pfColorIndexBuf[sy * this.width + px];
              if (pfType >= 1 && pfType <= 4) {
                const collBit = 1 << (pfType - 1);
                if (playerIdx === 0) {
                  this.state.collisionP0PF = (this.state.collisionP0PF || 0) | collBit;
                } else if (playerIdx === 1) {
                  this.state.collisionP1PF = (this.state.collisionP1PF || 0) | collBit;
                }
              }
            }
            if (px >= 0 && px < this.width) {
              const idx = (sy * this.width + px) << 2;
              buf[idx] = playerColor[0];
              buf[idx + 1] = playerColor[1];
              buf[idx + 2] = playerColor[2];
              buf[idx + 3] = 255;
            }
          }
        }
      }
    }
  }

  renderFullZoneMapIfPresent() {
    if (!this.fullMapCtx) return;
    const regs = this.readActivePaletteRegisters();
    this.renderFullZoneMap(regs, 0x1800);
  }

  renderFullZoneMap(regs, chbase = 0x1800) {
    const ram = this.state.ram;
    const fbuf = this.fullMapImageData.data;
    const mapWidthPx = 992;

    for (let chRow = 0; chRow < 64; chRow++) {
      const rowBaseAddr = 0x1C00 + chRow * 128;
      for (let s = 0; s < 8; s++) {
        const py = chRow * 8 + s;
        const rowPixelOffset = py * mapWidthPx;
        for (let chCol = 0; chCol < 124; chCol++) {
          const charCode = ram[(rowBaseAddr + chCol + 2) & 0xFFFF];
          const charIndex = charCode & 0x7F;
          const usePF3 = (charCode & 0x80) !== 0;
          const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
          const basePx = chCol * 8;

          for (let px = 0; px < 4; px++) {
            const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
            const { colorReg } = this.resolveMode4Color(regs, bitPair, usePF3);
            const rgb = this.palPalette[colorReg];

            const idx0 = (rowPixelOffset + basePx + (px << 1)) << 2;
            fbuf[idx0] = rgb[0];
            fbuf[idx0 + 1] = rgb[1];
            fbuf[idx0 + 2] = rgb[2];
            fbuf[idx0 + 3] = 255;

            const idx1 = idx0 + 4;
            fbuf[idx1] = rgb[0];
            fbuf[idx1 + 1] = rgb[1];
            fbuf[idx1 + 2] = rgb[2];
            fbuf[idx1 + 3] = 255;
          }
        }
      }
    }

    const p0Col = this.palPalette[ram[0x02C0]] || [255, 255, 255];
    const p1Col = this.palPalette[ram[0x02C1]] || [255, 128, 0];
    const p0Shape = this.bundle.sprites.p0_shapes[0];
    const p1Shape = this.bundle.sprites.p1_shapes[0];
    const mapPxX = Math.max(0, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 8);
    const mapPxY = Math.max(0, ram[SystemAddressMap.PLAYER_CHAR_Y] * 8);

    for (let sy = 0; sy < 16; sy++) {
      const py = mapPxY + sy;
      if (py >= 512) break;
      const b0 = p0Shape[sy];
      const b1 = p1Shape[sy];
      for (let sx = 0; sx < 8; sx++) {
        const bit0 = (b0 >> (7 - sx)) & 1;
        const bit1 = (b1 >> (7 - sx)) & 1;
        if (!bit0 && !bit1) continue;
        const col = bit0 ? p0Col : p1Col;
        const px = mapPxX + sx * 2;
        if (px + 1 < mapWidthPx) {
          const idx = (py * mapWidthPx + px) << 2;
          fbuf[idx] = col[0];
          fbuf[idx + 1] = col[1];
          fbuf[idx + 2] = col[2];
          fbuf[idx + 3] = 255;
          fbuf[idx + 4] = col[0];
          fbuf[idx + 5] = col[1];
          fbuf[idx + 6] = col[2];
          fbuf[idx + 7] = 255;
        }
      }
    }

    this.fullMapCtx.putImageData(this.fullMapImageData, 0, 0);
  }
}


  // =========================================================================
  // Module: graphics/MeshGeometryBuilder.js
  // =========================================================================
/**
 * @fileoverview Procedural 3D Mesh Geometry Builder for Zone X GFX Redesign.
 *
 * Generates indexed/non-indexed 3D triangle meshes with per-vertex:
 * - Position (x, y, z) where X = East/West, Y = Height (Up), Z = North/South
 * - Normal (nx, ny, nz) for real-time Blinn-Phong + Point Light shading
 * - Base Color (r, g, b)
 * - Specular/Emissive factor (emissive: 0.0 = matte/metallic, 1.0 = pure neon glow)
 *
 * Each vertex packs 10 floats: [x, y, z, nx, ny, nz, r, g, b, emissive].
 */
class MeshGeometryBuilder {
  constructor() {
    /** @type {number[]} */
    this.verts = [];
  }

  clear() {
    this.verts = [];
    return this;
  }

  /**
   * Pushes a single triangle with auto-computed facet normal.
   */
  addTriangle(p1, p2, p3, color, emissive = 0.0) {
    const ux = p2[0] - p1[0];
    const uy = p2[1] - p1[1];
    const uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0];
    const vy = p3[1] - p1[1];
    const vz = p3[2] - p1[2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1.0;
    nx /= len;
    ny /= len;
    nz /= len;

    const [r, g, b] = color;
    this.verts.push(
      p1[0], p1[1], p1[2], nx, ny, nz, r, g, b, emissive,
      p2[0], p2[1], p2[2], nx, ny, nz, r, g, b, emissive,
      p3[0], p3[1], p3[2], nx, ny, nz, r, g, b, emissive
    );
    return this;
  }

  /**
   * Adds a quad (two triangles) with outward normal.
   */
  addQuad(p1, p2, p3, p4, color, emissive = 0.0) {
    this.addTriangle(p1, p2, p3, color, emissive);
    this.addTriangle(p1, p3, p4, color, emissive);
    return this;
  }

  /**
   * Adds an axis-aligned 3D box centered at (cx, cy, cz) with dimensions (sx, sy, sz).
   */
  addBox(cx, cy, cz, sx, sy, sz, color, emissive = 0.0, topColor = null) {
    const hx = sx * 0.5;
    const hy = sy * 0.5;
    const hz = sz * 0.5;

    const x0 = cx - hx, x1 = cx + hx;
    const y0 = cy - hy, y1 = cy + hy;
    const z0 = cz - hz, z1 = cz + hz;

    const tc = topColor || [
      Math.min(1, color[0] * 1.15),
      Math.min(1, color[1] * 1.15),
      Math.min(1, color[2] * 1.15),
    ];

    // Top (+Y)
    this.addQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], tc, emissive);
    // Bottom (-Y)
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], color, emissive);
    // Front (+Z)
    this.addQuad([x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], color, emissive);
    // Back (-Z)
    this.addQuad([x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], color, emissive);
    // Left (-X)
    this.addQuad([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], color, emissive);
    // Right (+X)
    this.addQuad([x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], color, emissive);
    return this;
  }

  /**
   * Adds a bevelled 3D sci-fi pillar/block (frustum + main body + bevel cap).
   */
  addBevelledBox(cx, cy, cz, sx, sy, sz, bevel, color, capColor, emissive = 0.0) {
    const bodyH = Math.max(0.02, sy - bevel * 2);
    this.addBox(cx, cy, cz, sx, bodyH, sz, color, emissive);

    // Top bevel frustum
    const yMid = cy + bodyH * 0.5;
    const yTop = cy + sy * 0.5;
    this.addFrustumY(cx, yMid, yTop, cz, sx * 0.5, sz * 0.5, sx * 0.5 - bevel, sz * 0.5 - bevel, capColor || color, emissive);
    return this;
  }

  /**
   * Adds a rectangular frustum along the Y axis from y0 to y1.
   */
  addFrustumY(cx, y0, y1, cz, rx0, rz0, rx1, rz1, color, emissive = 0.0) {
    const b0 = [cx - rx0, y0, cz - rz0];
    const b1 = [cx - rx0, y0, cz + rz0];
    const b2 = [cx + rx0, y0, cz + rz0];
    const b3 = [cx + rx0, y0, cz - rz0];

    const t0 = [cx - rx1, y1, cz - rz1];
    const t1 = [cx - rx1, y1, cz + rz1];
    const t2 = [cx + rx1, y1, cz + rz1];
    const t3 = [cx + rx1, y1, cz - rz1];

    // Top cap
    this.addQuad(t0, t1, t2, t3, color, emissive);
    // 4 sloped sides
    this.addQuad(t1, b1, b2, t2, color, emissive);
    this.addQuad(t3, b3, b0, t0, color, emissive);
    this.addQuad(t0, b0, b1, t1, color, emissive);
    this.addQuad(t2, b2, b3, t3, color, emissive);
    return this;
  }

  /**
   * Adds a vertical cylinder / prism along Y axis.
   */
  addCylinderY(cx, y0, y1, cz, rBottom, rTop, segments, color, emissive = 0.0, capTop = true) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);

      const p00 = [cx + c0 * rBottom, y0, cz + s0 * rBottom];
      const p10 = [cx + c1 * rBottom, y0, cz + s1 * rBottom];
      const p11 = [cx + c1 * rTop, y1, cz + s1 * rTop];
      const p01 = [cx + c0 * rTop, y1, cz + s0 * rTop];

      this.addQuad(p01, p00, p10, p11, color, emissive);

      if (capTop && rTop > 0.001) {
        this.addTriangle([cx, y1, cz], p01, p11, color, emissive);
      }
    }
    return this;
  }

  /**
   * Adds a horizontal cylinder along the X axis (great for laser beams & pipes).
   */
  addCylinderX(x0, x1, cy, cz, radius, segments, color, emissive = 0.0) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0) * radius, s0 = Math.sin(a0) * radius;
      const c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;

      const p00 = [x0, cy + c0, cz + s0];
      const p10 = [x1, cy + c0, cz + s0];
      const p11 = [x1, cy + c1, cz + s1];
      const p01 = [x0, cy + c1, cz + s1];

      this.addQuad(p00, p10, p11, p01, color, emissive);
    }
    return this;
  }

  /**
   * Adds a 3D octahedron / crystal diamond centered at (cx, cy, cz).
   */
  addOctahedron(cx, cy, cz, rx, ry, rz, color, emissive = 0.0) {
    const top = [cx, cy + ry, cz];
    const bot = [cx, cy - ry, cz];
    const pN = [cx, cy, cz - rz];
    const pS = [cx, cy, cz + rz];
    const pE = [cx + rx, cy, cz];
    const pW = [cx - rx, cy, cz];

    // Upper pyramid
    this.addTriangle(top, pW, pS, color, emissive);
    this.addTriangle(top, pS, pE, color, emissive);
    this.addTriangle(top, pE, pN, color, emissive);
    this.addTriangle(top, pN, pW, color, emissive);

    // Lower pyramid
    this.addTriangle(bot, pS, pW, color, emissive);
    this.addTriangle(bot, pE, pS, color, emissive);
    this.addTriangle(bot, pN, pE, color, emissive);
    this.addTriangle(bot, pW, pN, color, emissive);
    return this;
  }

  /**
   * Adds a 3D torus ring in the XZ plane centered at (cx, cy, cz).
   */
  addTorusXZ(cx, cy, cz, majorR, minorR, majorSegs, minorSegs, color, emissive = 0.0) {
    for (let i = 0; i < majorSegs; i++) {
      const u0 = (i / majorSegs) * Math.PI * 2;
      const u1 = ((i + 1) / majorSegs) * Math.PI * 2;
      const cu0 = Math.cos(u0), su0 = Math.sin(u0);
      const cu1 = Math.cos(u1), su1 = Math.sin(u1);

      for (let j = 0; j < minorSegs; j++) {
        const v0 = (j / minorSegs) * Math.PI * 2;
        const v1 = ((j + 1) / minorSegs) * Math.PI * 2;

        const p00 = [
          cx + (majorR + minorR * Math.cos(v0)) * cu0,
          cy + minorR * Math.sin(v0),
          cz + (majorR + minorR * Math.cos(v0)) * su0,
        ];
        const p10 = [
          cx + (majorR + minorR * Math.cos(v0)) * cu1,
          cy + minorR * Math.sin(v0),
          cz + (majorR + minorR * Math.cos(v0)) * su1,
        ];
        const p11 = [
          cx + (majorR + minorR * Math.cos(v1)) * cu1,
          cy + minorR * Math.sin(v1),
          cz + (majorR + minorR * Math.cos(v1)) * su1,
        ];
        const p01 = [
          cx + (majorR + minorR * Math.cos(v1)) * cu0,
          cy + minorR * Math.sin(v1),
          cz + (majorR + minorR * Math.cos(v1)) * su0,
        ];

        this.addQuad(p00, p10, p11, p01, color, emissive);
      }
    }
    return this;
  }

  toFloat32Array() {
    return new Float32Array(this.verts);
  }

  /**
   * Builds the complete dictionary of static/dynamic 3D meshes used by the renderer.
   */
  static buildAllGameMeshes() {
    const b = new MeshGeometryBuilder();
    const meshes = {};

    const compile = (name) => {
      const arr = b.toFloat32Array();
      meshes[name] = {
        data: arr,
        vertexCount: arr.length / 10,
      };
      b.clear();
    };

    // 1. Sci-Fi Floor Tile (1x1 unit)
    b.addBox(0, -0.04, 0, 0.96, 0.08, 0.96, [0.09, 0.12, 0.18], 0.0, [0.11, 0.15, 0.22]);
    b.addBox(0, 0.005, 0, 0.72, 0.01, 0.72, [0.13, 0.18, 0.27], 0.05);
    compile("floorTile");

    // 2. Wall Bulkhead (3D Reactor Armor Block with Bevel & Neon Conduit)
    b.addBevelledBox(0, 0.36, 0, 0.98, 0.72, 0.98, 0.09, [0.22, 0.35, 0.56], [0.34, 0.52, 0.78], 0.05);
    b.addBox(0, 0.73, 0, 0.62, 0.05, 0.62, [0.16, 0.26, 0.42], 0.05, [0.42, 0.65, 0.92]);
    b.addBox(0, 0.42, 0, 1.0, 0.06, 1.0, [0.2, 0.75, 1.0], 0.55);
    compile("wallBlock");

    // 3. Plutonium Core (Unmistakable Radioactive Plutonium Fuel Rod Cluster + Black/Yellow Hazard Base)
    // High-contrast Black & Yellow octagonal radiation containment pad on the floor
    b.addCylinderY(0, 0.0, 0.1, 0, 0.46, 0.44, 8, [0.95, 0.78, 0.02], 0.35);
    b.addCylinderY(0, 0.1, 0.16, 0, 0.39, 0.37, 8, [0.05, 0.06, 0.08], 0.02);
    // 3-Blade Yellow-on-Black Radiation Trefoil Symbol (☢) on the pedestal
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      b.addBox(Math.cos(a) * 0.23, 0.17, Math.sin(a) * 0.23, 0.17, 0.04, 0.17, [0.98, 0.82, 0.02], 0.45);
    }
    // Cluster of 4 Vivid Radioactive Neon-Green Plutonium Fuel Rods (low R/B so they stay pure neon-green!)
    b.addCylinderY(0, 0.16, 0.78, 0, 0.17, 0.17, 10, [0.02, 0.95, 0.04], 0.65);
    b.addCylinderY(-0.15, 0.16, 0.6, 0.11, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addCylinderY(0.15, 0.16, 0.6, 0.11, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addCylinderY(0.0, 0.16, 0.6, -0.17, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addOctahedron(0, 0.52, 0, 0.28, 0.36, 0.28, [0.04, 0.98, 0.06], 0.7);
    // Dark Lead/Steel Cap Rings on top of the fuel rods for crisp contrast
    b.addTorusXZ(0, 0.76, 0, 0.17, 0.04, 10, 6, [0.08, 0.1, 0.12], 0.05);
    compile("plutoniumCore");

    // 3b. Rotating Radioactive Trefoil Rotor (☢) + Orbiting Atomic Electrons (⚛) around Plutonium
    b.addTorusXZ(0, 0.44, 0, 0.44, 0.04, 16, 6, [0.02, 0.92, 0.04], 0.65);
    b.addTorusXZ(0, 0.24, 0, 0.38, 0.032, 14, 6, [0.96, 0.8, 0.02], 0.5);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      // High-contrast Black & Yellow Trefoil Warning Fin
      const fx = Math.cos(a) * 0.35;
      const fz = Math.sin(a) * 0.35;
      b.addBox(fx, 0.24, fz, 0.18, 0.06, 0.18, [0.06, 0.07, 0.09], 0.05);
      b.addBox(fx, 0.28, fz, 0.13, 0.03, 0.13, [0.98, 0.84, 0.02], 0.55);
      // Vivid Radioactive Neon-Green Electron Sphere
      const ex = Math.cos(a + 0.52) * 0.44;
      const ez = Math.sin(a + 0.52) * 0.44;
      b.addOctahedron(ex, 0.44 + (i - 1) * 0.1, ez, 0.12, 0.12, 0.12, [0.02, 0.98, 0.05], 0.75);
    }
    compile("plutoniumBeacon");

    // 4. Plutonium Container (Unmistakable Yellow & Black Striped Radioactive Waste Barrel / Atommüll-Tonne with Open Glowing Receptor Mouth)
    // Main Signal-Yellow cylindrical steel barrel body
    b.addCylinderY(0, 0.0, 0.68, 0, 0.44, 0.44, 14, [0.96, 0.78, 0.02], 0.35);
    // 3 Bold Black Hazard Stripes / Barrel Hoops (bottom, middle, upper)
    b.addTorusXZ(0, 0.1, 0, 0.445, 0.042, 14, 6, [0.06, 0.07, 0.09], 0.02);
    b.addTorusXZ(0, 0.35, 0, 0.45, 0.048, 14, 6, [0.06, 0.07, 0.09], 0.02);
    b.addTorusXZ(0, 0.6, 0, 0.445, 0.042, 14, 6, [0.06, 0.07, 0.09], 0.02);
    // Radioactive hazard emblem plates on the N/S/E/W sides of the yellow drum
    b.addBox(0, 0.35, 0.43, 0.24, 0.2, 0.05, [0.06, 0.07, 0.09], 0.02);
    b.addOctahedron(0, 0.35, 0.46, 0.1, 0.1, 0.04, [0.02, 0.95, 0.04], 0.65);
    b.addBox(0, 0.35, -0.43, 0.24, 0.2, 0.05, [0.06, 0.07, 0.09], 0.02);
    // Heavy Top Receptor Rim + Vivid Radioactive Neon-Green Open Funnel Mouth (matches Plutonium color!)
    b.addTorusXZ(0, 0.69, 0, 0.38, 0.065, 14, 6, [0.08, 0.09, 0.11], 0.05);
    b.addCylinderY(0, 0.66, 0.72, 0, 0.31, 0.28, 12, [0.02, 0.25, 0.04], 0.15);
    b.addCylinderY(0, 0.69, 0.74, 0, 0.24, 0.24, 12, [0.02, 0.95, 0.04], 0.65);
    compile("containerVault");

    // 4b. Floating 3D Downward Delivery Target Arrow above every Container Barrel
    b.addCylinderY(0, 0.88, 1.18, 0, 0.03, 0.22, 8, [0.02, 0.95, 0.04], 0.65); // Vivid green arrow head cone
    b.addBox(0, 1.28, 0, 0.11, 0.22, 0.11, [0.98, 0.84, 0.02], 0.55); // Gold arrow shaft
    compile("containerArrow");

    // 5. Golden Key (True 3D Key Shape: Round Bow Ring + Long Shaft + Double Key Teeth)
    b.addTorusXZ(0, 0.36, -0.22, 0.16, 0.055, 12, 6, [1.0, 0.85, 0.12], 0.85); // Key ring bow
    b.addBox(0, 0.36, 0.08, 0.09, 0.08, 0.44, [1.0, 0.88, 0.18], 0.85); // Key shaft
    b.addBox(0.11, 0.36, 0.14, 0.14, 0.08, 0.07, [1.0, 0.92, 0.28], 0.95); // Tooth 1
    b.addBox(0.13, 0.36, 0.26, 0.18, 0.08, 0.07, [1.0, 0.92, 0.28], 0.95); // Tooth 2
    compile("keyItem");

    // 6. Excavator Spade / Shovel (True 3D Shovel: T-Grip Handle + Shaft + Wide Pointed Steel Scoop Blade)
    b.addBox(0, 0.36, -0.32, 0.26, 0.08, 0.08, [1.0, 0.65, 0.12], 0.8); // Orange/Gold T-handle grip
    b.addBox(0, 0.36, -0.08, 0.07, 0.07, 0.44, [0.85, 0.62, 0.22], 0.55); // Wooden/alloy shaft
    b.addBevelledBox(0, 0.35, 0.2, 0.36, 0.06, 0.26, 0.02, [0.75, 0.88, 1.0], [0.9, 0.96, 1.0], 0.75); // Wide steel shovel scoop
    b.addOctahedron(0, 0.35, 0.33, 0.18, 0.04, 0.14, [0.3, 0.95, 1.0], 0.9); // Pointed digging tip
    compile("spadeItem");

    // 6b. Radiation Shield / Med-Pod Capsule (White/Emerald Hazmat Pod with Bold 3D Cross)
    b.addCylinderY(0, 0.12, 0.56, 0, 0.24, 0.24, 12, [0.9, 0.96, 1.0], 0.5);
    b.addTorusXZ(0, 0.34, 0, 0.25, 0.035, 12, 6, [0.1, 0.95, 0.55], 0.85);
    b.addBox(0, 0.59, 0, 0.28, 0.06, 0.1, [0.1, 1.0, 0.45], 0.95); // 3D Cross bar 1
    b.addBox(0, 0.59, 0, 0.1, 0.06, 0.28, [0.1, 1.0, 0.45], 0.95); // 3D Cross bar 2
    compile("capsuleItem");

    // 7. Insulating Mat / Radiation Shield Mat (Ribbed Golden-Copper Hazard Tread Platform)
    b.addBevelledBox(0, 0.12, 0, 0.82, 0.14, 0.62, 0.04, [0.95, 0.55, 0.1], [1.0, 0.78, 0.22], 0.65);
    b.addBox(-0.24, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    b.addBox(0.0, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    b.addBox(0.24, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    compile("matItem");

    // 8. Extra Time Chrono Hourglass (Distinct 3D Golden Hourglass with Glowing Cyan Sand Bulbs)
    b.addBox(0, 0.1, 0, 0.56, 0.07, 0.56, [1.0, 0.82, 0.18], 0.65); // Bottom gold plate
    b.addCylinderY(0, 0.14, 0.42, 0, 0.26, 0.04, 10, [0.2, 0.92, 1.0], 0.95); // Lower sand bulb
    b.addCylinderY(0, 0.42, 0.7, 0, 0.04, 0.26, 10, [0.2, 0.92, 1.0], 0.95); // Upper sand bulb
    b.addBox(0, 0.73, 0, 0.56, 0.07, 0.56, [1.0, 0.82, 0.18], 0.65); // Top gold plate
    compile("extraTimeItem");

    // 9. Bonus / Mystery Box (3D Treasure Crate with Bold Golden '?' Question Emblem on Top)
    b.addBevelledBox(0, 0.32, 0, 0.68, 0.58, 0.68, 0.06, [0.62, 0.18, 0.88], [0.8, 0.35, 1.0], 0.5);
    b.addBox(0, 0.32, 0, 0.72, 0.1, 0.14, [1.0, 0.85, 0.15], 0.9);
    b.addBox(0, 0.32, 0, 0.14, 0.1, 0.72, [1.0, 0.85, 0.15], 0.9);
    // 3D '?' symbol raised above the crate top
    b.addBox(0, 0.64, -0.14, 0.26, 0.07, 0.08, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0.09, 0.64, -0.05, 0.08, 0.07, 0.14, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0, 0.64, 0.02, 0.16, 0.07, 0.08, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0, 0.64, 0.18, 0.09, 0.07, 0.09, [1.0, 0.95, 0.25], 1.0);
    compile("mysteryBox");

    // 10. Locked Key-Door & Airlock Door (Heavy Armored Gate with Giant 3D Golden Padlock / Keyhole)
    b.addBevelledBox(0, 0.42, 0, 0.96, 0.84, 0.42, 0.05, [0.78, 0.32, 0.12], [0.95, 0.52, 0.18], 0.3);
    // Giant Golden Padlock Shackle + Body on Top & Front so player knows it needs a Key
    b.addTorusXZ(0, 0.92, 0, 0.18, 0.05, 10, 6, [1.0, 0.88, 0.15], 0.95);
    b.addBox(0, 0.62, 0, 0.38, 0.48, 0.52, [1.0, 0.84, 0.12], 0.85);
    b.addCylinderY(0, 0.65, 0.9, 0, 0.08, 0.08, 8, [0.08, 0.08, 0.1], 0.0); // Keyhole center
    compile("lockedDoor");

    // Airlock / Proximity Door (Cyan-Armored Bulkhead Gate with Glowing Sensor Wheel)
    b.addBevelledBox(0, 0.42, 0, 0.96, 0.84, 0.42, 0.05, [0.16, 0.58, 0.78], [0.28, 0.82, 0.98], 0.35);
    b.addTorusXZ(0, 0.88, 0, 0.24, 0.05, 12, 6, [0.2, 1.0, 0.7], 0.95);
    b.addOctahedron(0, 0.88, 0, 0.16, 0.16, 0.16, [1.0, 0.9, 0.25], 0.95);
    compile("proximityDoor");

    // 11. Automatic Laser/Blast Door:
    // Low-profile floor threshold rails at North (-Z) and South (+Z) edges so OPEN doors are 100% clear!
    b.addBox(0, 0.05, -0.43, 0.94, 0.1, 0.12, [0.28, 0.36, 0.48], 0.15);
    b.addBox(0, 0.05, 0.43, 0.94, 0.1, 0.12, [0.28, 0.36, 0.48], 0.15);
    compile("laserPylons");

    // OPEN / SAFE indicator: Flat emerald-green walkthrough floor pad + high-visibility overhead green beacons
    b.addBox(0, 0.03, 0, 0.88, 0.04, 0.72, [0.1, 1.0, 0.45], 0.95);
    b.addBox(-0.28, 0.06, 0, 0.12, 0.03, 0.68, [0.4, 1.0, 0.75], 1.0);
    b.addBox(0.28, 0.06, 0, 0.12, 0.03, 0.68, [0.4, 1.0, 0.75], 1.0);
    b.addOctahedron(0, 0.88, -0.42, 0.15, 0.15, 0.15, [0.15, 1.0, 0.5], 1.0);
    b.addOctahedron(0, 0.88, 0.42, 0.15, 0.15, 0.15, [0.15, 1.0, 0.5], 1.0);
    compile("laserSafeOpen");

    // CLOSED / CLOSING DANGER indicator: Crimson floor warning pad + high-visibility overhead red alarm diamonds
    b.addBox(0, 0.03, 0, 0.88, 0.04, 0.72, [1.0, 0.08, 0.18], 0.95);
    b.addOctahedron(0, 0.92, -0.42, 0.18, 0.2, 0.18, [1.0, 0.12, 0.2], 1.0);
    b.addOctahedron(0, 0.92, 0.42, 0.18, 0.2, 0.18, [1.0, 0.12, 0.2], 1.0);
    compile("laserDangerClosed");

    // Sliding Deadly Door Leaf (slides from North -Z and South +Z sills to seal the corridor up to Y=0.84)
    b.addBevelledBox(0, 0.44, 0, 0.9, 0.8, 0.36, 0.03, [0.95, 0.12, 0.22], [1.0, 0.35, 0.2], 0.85);
    b.addBox(0, 0.24, 0, 0.94, 0.09, 0.38, [1.0, 0.55, 0.1], 1.0);
    b.addBox(0, 0.5, 0, 0.94, 0.09, 0.38, [1.0, 0.9, 0.2], 1.0);
    b.addBox(0, 0.74, 0, 0.94, 0.09, 0.38, [1.0, 0.55, 0.1], 1.0);
    compile("laserBeams");

    // 12. Warp Pad & Warp Frame
    b.addCylinderY(0, 0.0, 0.1, 0, 0.46, 0.42, 14, [0.2, 0.3, 0.5], 0.2);
    b.addTorusXZ(0, 0.14, 0, 0.36, 0.045, 14, 6, [0.2, 0.95, 1.0], 0.95);
    b.addTorusXZ(0, 0.26, 0, 0.24, 0.035, 12, 6, [0.75, 0.35, 1.0], 0.95);
    compile("warpPad");

    b.addBevelledBox(0, 0.42, 0, 0.85, 0.84, 0.85, 0.08, [0.28, 0.22, 0.55], [0.48, 0.38, 0.88], 0.35);
    b.addTorusXZ(0, 0.55, 0, 0.35, 0.05, 10, 6, [0.3, 0.9, 1.0], 0.9);
    compile("warpFrame");

    // 13. Crumbly Diggable Dirt Mound (Rich Earthy Brown Soil & Golden Pebbles — clearly diggable!)
    b.addBevelledBox(0, 0.16, 0, 0.86, 0.32, 0.86, 0.08, [0.55, 0.36, 0.16], [0.68, 0.46, 0.22], 0.12);
    b.addOctahedron(-0.2, 0.36, -0.16, 0.28, 0.28, 0.28, [0.65, 0.44, 0.2], 0.15);
    b.addOctahedron(0.2, 0.4, 0.14, 0.26, 0.32, 0.26, [0.74, 0.52, 0.26], 0.18);
    b.addOctahedron(0.0, 0.34, 0.02, 0.32, 0.26, 0.32, [0.48, 0.32, 0.14], 0.1);
    compile("crumblyDirt");

    b.addOctahedron(0, 0.38, 0, 0.44, 0.48, 0.44, [0.45, 0.5, 0.58], 0.08);
    b.addOctahedron(0.16, 0.26, 0.16, 0.28, 0.32, 0.28, [0.35, 0.4, 0.48], 0.05);
    compile("rockBlock");

    // 14. Forcefield / Closed Slam Door Barrier & Skull Hazard / Open Slam Door Threshold
    b.addBevelledBox(0, 0.38, 0, 0.92, 0.76, 0.92, 0.06, [0.65, 0.08, 0.16], [0.95, 0.18, 0.25], 0.55);
    b.addTorusXZ(0, 0.78, 0, 0.36, 0.045, 12, 6, [1.0, 0.35, 0.15], 0.95);
    b.addOctahedron(0, 0.85, 0, 0.2, 0.24, 0.2, [1.0, 0.75, 0.15], 0.95);
    compile("hazardField");

    // 14b. 3D White Skull & Crossbones / One-Way Slam Door Threshold
    b.addBox(0, 0.04, 0, 0.88, 0.06, 0.88, [0.45, 0.08, 0.14], 0.35);
    b.addBevelledBox(0, 0.22, -0.04, 0.36, 0.22, 0.34, 0.05, [0.92, 0.92, 0.95], [1.0, 1.0, 1.0], 0.75); // Skull cranium
    b.addBox(0, 0.14, 0.16, 0.22, 0.12, 0.14, [0.88, 0.88, 0.92], 0.7); // Skull jaw
    b.addBox(-0.09, 0.28, 0.06, 0.08, 0.08, 0.08, [1.0, 0.1, 0.15], 1.0); // Red eye socket L
    b.addBox(0.09, 0.28, 0.06, 0.08, 0.08, 0.08, [1.0, 0.1, 0.15], 1.0); // Red eye socket R
    compile("skullHazard");

    // 15. Exit Extraction Portal (Giant Glowing Emerald/Gold Stargate Archway + Extraction Beacon)
    b.addCylinderY(0, 0.0, 0.14, 0, 0.48, 0.44, 14, [0.15, 0.55, 0.45], 0.45);
    b.addBox(-0.38, 0.48, 0, 0.12, 0.92, 0.22, [1.0, 0.84, 0.18], 0.75); // Left gold portal pillar
    b.addBox(0.38, 0.48, 0, 0.12, 0.92, 0.22, [1.0, 0.84, 0.18], 0.75); // Right gold portal pillar
    b.addBox(0, 0.92, 0, 0.9, 0.14, 0.26, [1.0, 0.88, 0.22], 0.85); // Top gold portal lintel
    b.addTorusXZ(0, 0.52, 0, 0.38, 0.055, 14, 6, [0.2, 1.0, 0.65], 1.0);
    b.addOctahedron(0, 1.15, 0, 0.24, 0.32, 0.24, [0.35, 1.0, 0.75], 1.0);
    compile("exitPortal");

    // 16. Articulated 3D Astronaut Player Meshes
    // Torso + Hazmat Backpack + Glowing Reactor Core
    b.addBevelledBox(0, 0, 0, 0.44, 0.42, 0.28, 0.04, [0.92, 0.95, 1.0], [1.0, 1.0, 1.0], 0.25);
    b.addBox(0, 0.04, 0.15, 0.32, 0.22, 0.06, [0.15, 0.75, 1.0], 0.85); // Chest telemetry plate
    b.addBox(0, 0.02, -0.2, 0.36, 0.36, 0.16, [0.35, 0.45, 0.58], 0.15); // Backpack
    b.addCylinderY(0, -0.1, 0.16, -0.26, 0.09, 0.09, 8, [0.2, 1.0, 0.65], 0.95); // Backpack core
    compile("playerTorso");

    // Helmet + Panoramic Cyan Visor + Antenna
    b.addBevelledBox(0, 0, 0, 0.36, 0.34, 0.36, 0.06, [0.95, 0.97, 1.0], [1.0, 1.0, 1.0], 0.3);
    b.addBox(0, 0.0, 0.15, 0.3, 0.18, 0.12, [0.1, 0.92, 1.0], 0.95); // Glowing visor
    b.addCylinderY(0.16, 0.15, 0.34, -0.05, 0.025, 0.015, 6, [1.0, 0.75, 0.2], 0.85);
    compile("playerHead");

    // Articulated Limb (Arm / Leg segment)
    b.addBevelledBox(0, -0.14, 0, 0.15, 0.3, 0.15, 0.02, [0.82, 0.88, 0.96], [0.92, 0.95, 1.0], 0.2);
    b.addBox(0, -0.28, 0.03, 0.17, 0.1, 0.2, [0.25, 0.68, 0.95], 0.55); // Boot / gauntlet cuff
    compile("playerLimb");

    // 17. Creepy Multi-Part 3D Alien Hunters (Normal = Xenomorph-Arachnid Stalker, Fast = Eldritch Shadow-Reaper)
    // 17a. Xenomorph-Arachnid Stalker Body (Obsidian-Crimson Carapace, Pulsing Abdomen Sac, Dorsal Spines & 6 Venom-Green Eyes)
    // Elongated cephalothorax & predator skull
    b.addBevelledBox(0, 0.06, 0.08, 0.34, 0.24, 0.42, 0.05, [0.16, 0.03, 0.06], [0.28, 0.05, 0.1], 0.15);
    // Swollen ribbed rear abdomen sac with glowing bioluminescent blood-orange core
    b.addOctahedron(0, 0.14, -0.26, 0.26, 0.24, 0.32, [0.24, 0.04, 0.08], 0.2);
    b.addOctahedron(0, 0.2, -0.26, 0.18, 0.18, 0.22, [1.0, 0.18, 0.05], 0.95);
    // 3 Jagged dorsal chitin spines along the back
    b.addCylinderY(0, 0.16, 0.42, 0.12, 0.06, 0.01, 6, [0.85, 0.1, 0.18], 0.75);
    b.addCylinderY(0, 0.18, 0.48, -0.04, 0.07, 0.01, 6, [0.95, 0.15, 0.22], 0.85);
    b.addCylinderY(0, 0.2, 0.44, -0.2, 0.06, 0.01, 6, [0.85, 0.1, 0.18], 0.75);
    // 6 Glowing Venom-Green Arachnid Eyes on the front of the skull
    b.addBox(-0.09, 0.1, 0.3, 0.06, 0.06, 0.05, [0.35, 1.0, 0.12], 1.0);
    b.addBox(0.09, 0.1, 0.3, 0.06, 0.06, 0.05, [0.35, 1.0, 0.12], 1.0);
    b.addBox(-0.15, 0.14, 0.26, 0.05, 0.05, 0.05, [0.2, 1.0, 0.25], 1.0);
    b.addBox(0.15, 0.14, 0.26, 0.05, 0.05, 0.05, [0.2, 1.0, 0.25], 1.0);
    b.addBox(-0.04, 0.15, 0.31, 0.04, 0.04, 0.04, [0.75, 1.0, 0.15], 1.0);
    b.addBox(0.04, 0.15, 0.31, 0.04, 0.04, 0.04, [0.75, 1.0, 0.15], 1.0);
    compile("droidCore");

    // 17b. Articulated Alien Spider Leg (Upper Femur + Spiked Knee + Razor Claw Tip)
    // Extends in +X so it can be rotated around Y for all 6 left/right legs!
    b.addBox(0.14, 0.14, 0, 0.26, 0.06, 0.06, [0.22, 0.04, 0.09], 0.2);
    b.addOctahedron(0.27, 0.2, 0, 0.06, 0.09, 0.06, [0.9, 0.12, 0.2], 0.85); // Spiked knee joint
    b.addCylinderY(0.36, -0.26, 0.2, 0, 0.015, 0.05, 5, [0.35, 0.06, 0.12], 0.35);
    b.addOctahedron(0.36, -0.26, 0, 0.04, 0.08, 0.04, [1.0, 0.15, 0.2], 0.95); // Glowing blood-red claw tip
    compile("alienSpiderLeg");

    // 17c. Articulated Serrated Mandible / Fang Jaw
    b.addBox(0, 0.0, 0.12, 0.06, 0.05, 0.22, [0.3, 0.05, 0.1], 0.3);
    b.addOctahedron(0, 0.0, 0.24, 0.04, 0.04, 0.09, [0.4, 1.0, 0.18], 1.0); // Venomous fang tip
    compile("alienMandible");

    // 17d. Eldritch Shadow-Reaper Body (Fast Alien: Hunched Abyssal Horror, Xenomorph Cranium, Horns & Glowing Chest Maw)
    // Elongated Xenomorph-like biomechanical cranium & hunched ribcage
    b.addBevelledBox(0, 0.16, 0.02, 0.38, 0.34, 0.46, 0.06, [0.11, 0.02, 0.18], [0.2, 0.05, 0.32], 0.2);
    b.addOctahedron(0, 0.32, -0.22, 0.22, 0.18, 0.38, [0.16, 0.03, 0.26], 0.25); // Elongated rear skull dome
    // Twin curved devilish cranial horns
    b.addCylinderY(-0.18, 0.26, 0.54, -0.1, 0.05, 0.01, 6, [0.95, 0.08, 0.45], 0.9);
    b.addCylinderY(0.18, 0.26, 0.54, -0.1, 0.05, 0.01, 6, [0.95, 0.08, 0.45], 0.9);
    // Glowing radioactive magenta-crimson chest maw & piercing red eyes
    b.addOctahedron(0, 0.14, 0.24, 0.14, 0.16, 0.1, [1.0, 0.06, 0.38], 1.0);
    b.addBox(-0.1, 0.28, 0.26, 0.07, 0.05, 0.06, [1.0, 0.05, 0.12], 1.0);
    b.addBox(0.1, 0.28, 0.26, 0.07, 0.05, 0.06, [1.0, 0.05, 0.12], 1.0);
    b.addBox(0, 0.33, 0.27, 0.05, 0.05, 0.05, [0.4, 1.0, 0.2], 1.0); // Third hunter eye
    compile("fastDroidBody");

    // 17e. Articulated Praying-Mantis / Necromorph Scythe Claw Arm
    b.addBox(0, 0.14, 0.16, 0.07, 0.08, 0.32, [0.22, 0.04, 0.32], 0.3);
    b.addOctahedron(0, 0.04, 0.34, 0.05, 0.24, 0.18, [1.0, 0.08, 0.42], 0.95); // Giant glowing scythe blade
    compile("alienScytheClaw");

    // 17f. Whipping Scorpion / Xenomorph Tail with Venom Stinger
    b.addCylinderY(0, 0.08, 0.48, -0.32, 0.06, 0.025, 6, [0.24, 0.04, 0.35], 0.35);
    b.addOctahedron(0, 0.5, -0.26, 0.06, 0.08, 0.14, [0.35, 1.0, 0.18], 1.0); // Glowing toxic stinger barb
    compile("alienTailStinger");

    // 17g. Pulsing Dark Bio-Aura Ring (for Showcase / Boss Aura)
    b.addTorusXZ(0, 0.04, 0, 0.42, 0.03, 12, 6, [0.85, 0.1, 0.25], 0.75);
    compile("droidRing");

    // 18. 3D Particle Crystal Shard, Volumetric Fireball, Armor Shrapnel & Shockwave Ring
    b.addOctahedron(0, 0, 0, 0.12, 0.12, 0.12, [1.0, 1.0, 1.0], 0.95);
    compile("particleShard");

    b.addTorusXZ(0, 0, 0, 0.5, 0.04, 16, 6, [1.0, 1.0, 1.0], 1.0);
    compile("shockwaveRing");

    // 19. Volumetric 3D Explosion Fireball (Multi-spike plasma core + equatorial blast corona)
    b.addOctahedron(0, 0, 0, 0.42, 0.42, 0.42, [1.0, 0.92, 0.55], 0.95);
    b.addBox(0, 0, 0, 0.54, 0.3, 0.3, [1.0, 0.55, 0.12], 0.9);
    b.addBox(0, 0, 0, 0.3, 0.54, 0.3, [1.0, 0.55, 0.12], 0.9);
    b.addBox(0, 0, 0, 0.3, 0.3, 0.54, [1.0, 0.55, 0.12], 0.9);
    b.addTorusXZ(0, 0, 0, 0.46, 0.07, 12, 6, [1.0, 0.32, 0.08], 0.95);
    compile("explosionFireball");

    // 20. Jagged 3D Hull / Door / Suit Shrapnel Plate with Molten Edges
    b.addBevelledBox(0, 0, 0, 0.28, 0.08, 0.22, 0.02, [0.75, 0.82, 0.95], [1.0, 0.58, 0.18], 0.65);
    b.addOctahedron(0.08, 0.04, 0, 0.12, 0.08, 0.1, [1.0, 0.35, 0.1], 0.85);
    compile("debrisArmorChunk");

    // 21. Exploded Alien Chitin Carapace & Glowing Bio-Plasma Fragment
    b.addBevelledBox(0, 0, 0, 0.24, 0.12, 0.28, 0.03, [0.35, 0.05, 0.14], [0.85, 0.12, 0.28], 0.55);
    b.addOctahedron(0, 0.06, 0, 0.14, 0.14, 0.14, [0.15, 1.0, 0.18], 0.95);
    compile("alienBioChunk");

    return meshes;
  }
}


  // =========================================================================
  // Module: graphics/SmoothAnimationTracker.js
  // =========================================================================
/**
 * @fileoverview Butter-Smooth 60fps Sub-Frame Animation, Entity Interpolation,
 * 3D Particle Physics, and Gameplay Event Detector for Zone X GFX Redesign.
 */
class SmoothAnimationTracker {
  /**
   * @param {import("../audio/FmSynthesizerEngine.js").FmSynthesizerEngine} fmSynth
   */
  constructor(fmSynth) {
    this.fmSynth = fmSynth;
    this.time = 0;

    // Smoothly interpolated player state in 3D tile space (X: 0..61, Z: 0..31)
    this.player = {
      x: 30,
      z: 15,
      targetX: 30,
      targetZ: 15,
      facingAngle: 0, // radians (0 = +Z South, PI = -Z North, PI/2 = +X East, -PI/2 = -X West)
      targetAngle: 0,
      walkCycle: 0,
      strideAmplitude: 0,
      bobY: 0,
      hurtFlash: 0,
      teleportFlash: 0,
      plutoniumGlow: 0,
      isExploding: false,
      explosionTimer: 0,
      explosionX: 30,
      explosionZ: 15,
      colliderX: 30,
      colliderZ: 15,
      chainPulse1: false,
      chainPulse2: false,
    };

    // Smoothly interpolated 3D camera target + explosion camera shake
    this.camera = {
      x: 30,
      z: 15,
      pitchDeg: 54, // Bird's-eye angle (90 = pure top-down, 45 = isometric tilt)
      distance: 14.5,
      fovDeg: 44,
      preset: "birdseye_tactical",
      shakeIntensity: 0,
      shakeX: 0,
      shakeY: 0,
      shakeZ: 0,
    };

    /**
     * Smoothly interpolated Alien Droid states keyed by slot index (0..119).
     */
    this.droids = Array.from({ length: 120 }, () => ({
      active: false,
      type: 0,
      x: 0,
      z: 0,
      targetX: 0,
      targetZ: 0,
      facingAngle: 0,
      ringSpin: 0,
      bankAngle: 0,
      explodedTimer: 0,
    }));

    /**
     * Smoothly interpolated laser beam intensity (0..1) per tile index.
     * @type {Float32Array}
     */
    this.laserIntensity = new Float32Array(GridConfig.TOTAL_TILES);

    /**
     * Snapshot of previous frame's effective tile states for diff/event detection.
     * @type {Uint8Array}
     */
    this.prevTileOccupied = new Uint8Array(GridConfig.TOTAL_TILES);
    /** @type {Uint8Array} */
    this.prevLogicalTiles = new Uint8Array(GridConfig.TOTAL_TILES);

    this.initializedZone = -1;
    this.prevLives = -1;
    this.prevDeathFlag = 0;
    this.prevPlutonium = -1;
    this.prevContainers = -1;
    this.prevHasKey = 0;
    this.prevHasMask = 0;
    this.prevHasSpade = 0;
    this.prevMatCount = 0;

    /**
     * Active 3D Mesh Particles (crystalline shards, plasma sparks, radiation embers).
     */
    this.particles = [];

    /**
     * Active 3D Expanding Shockwave Torus Rings.
     */
    this.shockwaves = [];

    /**
     * Active 3D Tumbling Debris Chunks (Astronaut helmet/torso/limbs, Alien legs/claws/tail/thorax, Door gates, Hull shrapnel).
     * @type {Array<{
     *   meshName: string,
     *   x: number, y: number, z: number,
     *   vx: number, vy: number, vz: number,
     *   rx: number, ry: number, rz: number,
     *   vrx: number, vry: number, vrz: number,
     *   scale: number, color: number[],
     *   life: number, maxLife: number, gravity: number
     * }>}
     */
    this.debrisChunks = [];

    /**
     * Active 3D Volumetric Plasma Fireballs.
     * @type {Array<{
     *   x: number, y: number, z: number,
     *   vy: number,
     *   rx: number, ry: number, rz: number,
     *   vrx: number, vry: number, vrz: number,
     *   scale: number, maxScale: number,
     *   color: number[], life: number, maxLife: number
     * }>}
     */
    this.fireballs = [];

    /**
     * Tiles temporarily shattered by a player collision explosion.
     * @type {Array<{ tx: number, tz: number, timer: number }>}
     */
    this.explodedTiles = [];
  }

  /**
   * Selects a 3D camera perspective preset.
   * @param {"birdseye_tactical"|"action_close"|"isometric_wide"|"topdown_ortho"} preset
   */
  setCameraPreset(preset) {
    this.camera.preset = preset;
    if (preset === "birdseye_tactical") {
      this.camera.pitchDeg = 55;
      this.camera.distance = 14.5;
      this.camera.fovDeg = 44;
    } else if (preset === "action_close") {
      this.camera.pitchDeg = 44;
      this.camera.distance = 10.2;
      this.camera.fovDeg = 48;
    } else if (preset === "isometric_wide") {
      this.camera.pitchDeg = 50;
      this.camera.distance = 20.5;
      this.camera.fovDeg = 40;
    } else if (preset === "topdown_ortho") {
      this.camera.pitchDeg = 82;
      this.camera.distance = 16.5;
      this.camera.fovDeg = 42;
    }
  }

  /**
   * Adjusts camera zoom distance.
   * @param {number} delta
   */
  adjustZoom(delta) {
    this.camera.distance = Math.max(7.5, Math.min(28.0, this.camera.distance + delta));
  }

  /**
   * Adjusts camera tilt pitch angle in degrees.
   * @param {number} deltaDeg
   */
  adjustPitch(deltaDeg) {
    this.camera.pitchDeg = Math.max(32, Math.min(86, this.camera.pitchDeg + deltaDeg));
  }

  /**
   * Spawns a 3D particle burst at tile coordinates (tx, ty).
   */
  spawnParticleBurst(tx, tz, count, color, speed = 3.2, yBase = 0.35, gravity = 7.5, scale = 1.0) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 360) this.particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() * 0.7 + 0.15) * Math.PI * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.75);
      this.particles.push({
        x: tx + (Math.random() - 0.5) * 0.35,
        y: yBase + Math.random() * 0.2,
        z: tz + (Math.random() - 0.5) * 0.35,
        vx: Math.cos(angle) * Math.cos(elev) * spd,
        vy: Math.sin(elev) * spd + 1.2,
        vz: Math.sin(angle) * Math.cos(elev) * spd,
        scale: scale * (0.65 + Math.random() * 0.7),
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 12,
        color,
        life: 0,
        maxLife: 0.38 + Math.random() * 0.35,
        gravity,
      });
    }
  }

  /**
   * Spawns an expanding 3D shockwave ring at (tx, tz).
   */
  spawnShockwave(tx, tz, color, maxRadius = 2.4, duration = 0.48, y = 0.18) {
    if (this.shockwaves.length > 36) this.shockwaves.shift();
    this.shockwaves.push({
      x: tx,
      y,
      z: tz,
      radius: 0.2,
      maxRadius,
      color,
      life: 0,
      maxLife: duration,
    });
  }

  /**
   * Spawns a 3D tumbling debris chunk (body part, helmet, spider leg, claw, door gate, or armor shrapnel)
   * with full 3-axis angular velocity and floor-bouncing physics.
   */
  spawnDebrisChunk(
    meshName,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    scale = 1.0,
    color = [1, 1, 1],
    maxLife = 1.75,
    gravity = 11.5
  ) {
    if (this.debrisChunks.length > 160) this.debrisChunks.shift();
    this.debrisChunks.push({
      meshName,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      rx: (Math.random() - 0.5) * 1.2,
      ry: Math.random() * Math.PI * 2,
      rz: (Math.random() - 0.5) * 1.2,
      vrx: (Math.random() - 0.5) * 18.0,
      vry: (Math.random() - 0.5) * 18.0,
      vrz: (Math.random() - 0.5) * 18.0,
      scale,
      color,
      life: 0,
      maxLife,
      gravity,
    });
  }

  /**
   * Spawns an expanding 3D volumetric plasma fireball sphere (`explosionFireball`).
   */
  spawnFireball(x, y, z, maxScale = 2.2, duration = 0.65, color = [1.0, 0.72, 0.2], vy = 1.1) {
    if (this.fireballs.length > 48) this.fireballs.shift();
    this.fireballs.push({
      x,
      y,
      z,
      vy,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      vrx: (Math.random() - 0.5) * 9.0,
      vry: (Math.random() - 0.5) * 9.0,
      vrz: (Math.random() - 0.5) * 9.0,
      scale: 0.25,
      maxScale,
      color,
      life: 0,
      maxLife: duration,
    });
  }

  /**
   * Returns true if a tile at (tx, tz) is currently shattered by a collision explosion.
   */
  isTileExploded(tx, tz) {
    for (let i = 0; i < this.explodedTiles.length; i++) {
      const et = this.explodedTiles[i];
      if (et.tx === tx && et.tz === tz && et.timer > 0) return true;
    }
    return false;
  }

  /**
   * Triggers a spectacular 3D disintegration & explosion of BOTH the Player (3D Astronaut)
   * AND whatever the Player collided with (Alien Hunter, Laser Door, Skull/Forcefield Hazard, or Reactor Wall).
   */
  triggerSpectacularCollisionExplosion(ram) {
    const px = this.player.x;
    const pz = this.player.z;

    this.player.isExploding = true;
    this.player.explosionTimer = 1.85;
    this.player.explosionX = px;
    this.player.explosionZ = pz;
    this.player.colliderX = px;
    this.player.colliderZ = pz;
    this.player.chainPulse1 = false;
    this.player.chainPulse2 = false;
    this.player.hurtFlash = 1.0;
    this.camera.shakeIntensity = 0.78;

    // =========================================================================
    // 1. SPECTACULAR 3D PLAYER (ASTRONAUT) DISINTEGRATION
    // =========================================================================
    // Blast the Astronaut's Helmet high into the air, spinning wildly in 3D
    this.spawnDebrisChunk(
      "playerHead",
      px,
      0.85,
      pz,
      (Math.random() - 0.5) * 3.8,
      6.6,
      (Math.random() - 0.5) * 3.8,
      1.18,
      [1.0, 0.92, 0.85],
      1.85
    );
    // Blast the Astronaut's Torso & Plutonium Backpack outward
    this.spawnDebrisChunk(
      "playerTorso",
      px,
      0.48,
      pz,
      (Math.random() - 0.5) * 3.2,
      5.2,
      (Math.random() - 0.5) * 3.2,
      1.12,
      [1.0, 0.8, 0.65],
      1.85
    );
    // Blast all 4 Astronaut Limbs (2 Arms + 2 Legs) in 4 radial directions
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + (Math.random() - 0.5) * 0.45;
      const spd = 3.2 + Math.random() * 2.4;
      this.spawnDebrisChunk(
        "playerLimb",
        px + Math.cos(a) * 0.18,
        0.42,
        pz + Math.sin(a) * 0.18,
        Math.cos(a) * spd,
        4.4 + Math.random() * 2.0,
        Math.sin(a) * spd,
        1.1,
        [0.95, 0.88, 1.0],
        1.8
      );
    }
    // Spawn 14 jagged 3D suit/hull shrapnel plates from the player
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 2.8 + Math.random() * 4.2;
      this.spawnDebrisChunk(
        "debrisArmorChunk",
        px,
        0.38 + Math.random() * 0.3,
        pz,
        Math.cos(a) * spd,
        3.5 + Math.random() * 4.2,
        Math.sin(a) * spd,
        0.85 + Math.random() * 0.55,
        i % 2 === 0 ? [1.0, 0.78, 0.35] : [0.35, 0.92, 1.0],
        1.55
      );
    }

    // Multi-layered Volumetric 3D Fireballs + Concentric Shockwaves + 75 Sparks at Player
    this.spawnFireball(px, 0.45, pz, 2.55, 0.72, [1.0, 0.88, 0.35], 1.1);
    this.spawnFireball(px + 0.18, 0.62, pz - 0.14, 1.95, 0.62, [1.0, 0.42, 0.12], 1.6);
    this.spawnFireball(px - 0.18, 0.35, pz + 0.16, 1.85, 0.58, [0.35, 0.95, 1.0], 0.9);
    this.spawnShockwave(px, pz, [1.0, 0.85, 0.25], 4.4, 0.72, 0.16);
    this.spawnShockwave(px, pz, [1.0, 0.22, 0.18], 3.4, 0.56, 0.42);
    this.spawnShockwave(px, pz, [0.25, 0.95, 1.0], 2.6, 0.45, 0.68);
    this.spawnParticleBurst(px, pz, 48, [1.0, 0.62, 0.15], 6.4, 0.45, 8.5, 1.35);
    this.spawnParticleBurst(px, pz, 32, [0.3, 0.95, 1.0], 5.6, 0.52, 7.5, 1.15);

    // =========================================================================
    // 2. DETECT & SPECTACULARLY EXPLODE WHAT THE PLAYER COLLIDED WITH!
    // =========================================================================
    let collidedWithSomething = false;

    // 2A. Check if the player collided with any active Alien Hunter (within 2.6 tiles)
    for (let i = 0; i < this.droids.length; i++) {
      const d = this.droids[i];
      if (!d.active) continue;
      const dist = Math.hypot(d.x - px, d.z - pz);
      if (dist <= 2.6) {
        collidedWithSomething = true;
        d.explodedTimer = 1.95;
        const ax = d.x;
        const az = d.z;
        this.player.colliderX = ax;
        this.player.colliderZ = az;
        const isFast = d.type !== 0;

        // Explode Alien Central Thorax / Horned Skull into the air
        this.spawnDebrisChunk(
          isFast ? "fastDroidBody" : "droidCore",
          ax,
          0.42,
          az,
          (ax - px) * 2.2 + (Math.random() - 0.5) * 2.5,
          5.8,
          (az - pz) * 2.2 + (Math.random() - 0.5) * 2.5,
          1.15,
          [1.0, 1.0, 1.0],
          1.85
        );

        // Blast all 6 Articulated Spider Legs outward in 6 directions, spinning in 3D!
        for (let leg = 0; leg < 6; leg++) {
          const la = (leg * Math.PI) / 3 + (Math.random() - 0.5) * 0.3;
          const lSpd = 3.5 + Math.random() * 3.0;
          this.spawnDebrisChunk(
            "alienSpiderLeg",
            ax + Math.cos(la) * 0.2,
            0.35,
            az + Math.sin(la) * 0.2,
            Math.cos(la) * lSpd,
            4.2 + Math.random() * 2.8,
            Math.sin(la) * lSpd,
            1.25,
            isFast ? [0.95, 0.4, 1.0] : [1.0, 0.45, 0.45],
            1.8
          );
        }

        // Blast Mandibles or Scythe Claws + Scorpion Stinger Tail outward
        if (!isFast) {
          for (let m = 0; m < 2; m++) {
            const ma = (m === 0 ? -0.7 : 0.7) + d.facingAngle;
            this.spawnDebrisChunk(
              "alienMandible",
              ax,
              0.38,
              az,
              Math.sin(ma) * 4.2,
              4.8,
              Math.cos(ma) * 4.2,
              1.35,
              [1, 1, 1],
              1.7
            );
          }
        } else {
          for (let c = 0; c < 2; c++) {
            const ca = (c === 0 ? -0.8 : 0.8) + d.facingAngle;
            this.spawnDebrisChunk(
              "alienScytheClaw",
              ax,
              0.42,
              az,
              Math.sin(ca) * 4.6,
              5.2,
              Math.cos(ca) * 4.6,
              1.3,
              [1, 1, 1],
              1.75
            );
          }
          this.spawnDebrisChunk(
            "alienTailStinger",
            ax,
            0.52,
            az,
            (Math.random() - 0.5) * 4.0,
            6.2,
            (Math.random() - 0.5) * 4.0,
            1.3,
            [1, 1, 1],
            1.8
          );
        }

        // 14 Chitin & Bio-Plasma Fragments + Volumetric Bio-Fireballs + Shockwaves at Alien
        for (let k = 0; k < 14; k++) {
          const ba = (k / 14) * Math.PI * 2;
          const bSpd = 2.6 + Math.random() * 4.0;
          this.spawnDebrisChunk(
            "alienBioChunk",
            ax,
            0.35,
            az,
            Math.cos(ba) * bSpd,
            3.4 + Math.random() * 3.8,
            Math.sin(ba) * bSpd,
            0.95 + Math.random() * 0.5,
            [1, 1, 1],
            1.6
          );
        }
        this.spawnFireball(ax, 0.45, az, 2.45, 0.72, [0.25, 1.0, 0.2], 1.2);
        this.spawnFireball(ax, 0.6, az, 2.1, 0.64, isFast ? [1.0, 0.15, 0.65] : [1.0, 0.22, 0.12], 1.6);
        this.spawnShockwave(ax, az, [0.2, 1.0, 0.25], 4.2, 0.68, 0.2);
        this.spawnShockwave(ax, az, [1.0, 0.15, 0.35], 3.3, 0.55, 0.45);
        this.spawnParticleBurst(ax, az, 45, [0.2, 1.0, 0.18], 6.2, 0.42, 8.5, 1.3);
        this.spawnParticleBurst(ax, az, 35, [1.0, 0.15, 0.28], 5.8, 0.45, 8.0, 1.2);
      }
    }

    // 2B. Check if the player collided with a Laser Door, Skull Hazard, Forcefield, or Obstacle Tile
    const baseTx = Math.round(px);
    const baseTz = Math.round(pz);
    let bestTileDist = 999;
    let hitTx = -1;
    let hitTz = -1;
    let hitTileType = 0;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = baseTx + dx;
        const tz = baseTz + dz;
        if (tx < 0 || tx >= GridConfig.WIDTH || tz < 0 || tz >= GridConfig.HEIGHT) continue;
        const t = ram[0x0b00 + tz * GridConfig.WIDTH + tx] & 0x1f;
        const isLaserDoor =
          t === TileType.LASER_DOOR_1A ||
          t === TileType.LASER_DOOR_1B ||
          t === TileType.LASER_DOOR_2A ||
          t === TileType.LASER_DOOR_2B;
        const isHazard = t === TileType.FORCEFIELD || t === TileType.SKULL_HAZARD;
        if (isLaserDoor || isHazard) {
          const d = Math.hypot(tx - px, tz - pz);
          if (d < bestTileDist) {
            bestTileDist = d;
            hitTx = tx;
            hitTz = tz;
            hitTileType = t;
          }
        }
      }
    }

    // Fallback: if neither an Alien nor a Laser/Hazard tile was within range (e.g. radiation overload or wall),
    // explode the tile directly in front of the player so the environment visibly blasts apart too!
    if (!collidedWithSomething && hitTx === -1) {
      hitTx = Math.max(0, Math.min(GridConfig.WIDTH - 1, Math.round(px + Math.sin(this.player.facingAngle) * 0.85)));
      hitTz = Math.max(0, Math.min(GridConfig.HEIGHT - 1, Math.round(pz + Math.cos(this.player.facingAngle) * 0.85)));
      hitTileType = ram[0x0b00 + hitTz * GridConfig.WIDTH + hitTx] & 0x1f;
    }

    if (hitTx !== -1) {
      this.player.colliderX = hitTx;
      this.player.colliderZ = hitTz;
      this.explodedTiles.push({ tx: hitTx, tz: hitTz, timer: 1.9 });

      const isLaser =
        hitTileType === TileType.LASER_DOOR_1A ||
        hitTileType === TileType.LASER_DOOR_1B ||
        hitTileType === TileType.LASER_DOOR_2A ||
        hitTileType === TileType.LASER_DOOR_2B;

      if (isLaser) {
        // Blast the North & South 3D Laser Blast Gate Leaves + Danger Beacons into the air!
        this.spawnDebrisChunk("laserBeams", hitTx, 0.45, hitTz - 0.25, -2.4, 5.6, -3.2, 0.95, [1, 1, 1], 1.8);
        this.spawnDebrisChunk("laserBeams", hitTx, 0.45, hitTz + 0.25, 2.4, 5.6, 3.2, 0.95, [1, 1, 1], 1.8);
        this.spawnDebrisChunk("laserDangerClosed", hitTx, 0.7, hitTz, (Math.random() - 0.5) * 3.5, 6.2, (Math.random() - 0.5) * 3.5, 1.0, [1, 1, 1], 1.75);
      } else if (hitTileType === TileType.SKULL_HAZARD) {
        this.spawnDebrisChunk("skullHazard", hitTx, 0.35, hitTz, (Math.random() - 0.5) * 3.5, 6.0, (Math.random() - 0.5) * 3.5, 1.15, [1, 1, 1], 1.8);
      } else if (hitTileType === TileType.FORCEFIELD) {
        this.spawnDebrisChunk("hazardField", hitTx, 0.45, hitTz, (Math.random() - 0.5) * 3.5, 5.8, (Math.random() - 0.5) * 3.5, 0.95, [1, 1, 1], 1.8);
      }

      // 16 Heavy 3D Door/Reactor Shrapnel Chunks + Volumetric Fireballs + Shockwaves at Colliding Tile
      for (let k = 0; k < 16; k++) {
        const ka = (k / 16) * Math.PI * 2;
        const kSpd = 2.8 + Math.random() * 4.4;
        this.spawnDebrisChunk(
          "debrisArmorChunk",
          hitTx,
          0.4,
          hitTz,
          Math.cos(ka) * kSpd,
          3.8 + Math.random() * 4.0,
          Math.sin(ka) * kSpd,
          0.95 + Math.random() * 0.55,
          [1.0, 0.45, 0.2],
          1.65
        );
      }
      this.spawnFireball(hitTx, 0.48, hitTz, 2.5, 0.72, [1.0, 0.35, 0.12], 1.25);
      this.spawnFireball(hitTx, 0.65, hitTz, 2.0, 0.62, [1.0, 0.85, 0.2], 1.65);
      this.spawnShockwave(hitTx, hitTz, [1.0, 0.25, 0.15], 4.2, 0.7, 0.2);
      this.spawnShockwave(hitTx, hitTz, [1.0, 0.85, 0.2], 3.2, 0.54, 0.48);
      this.spawnParticleBurst(hitTx, hitTz, 50, [1.0, 0.35, 0.15], 6.4, 0.45, 8.5, 1.35);
    }
  }

  /**
   * Determines whether a tile at (tx, ty) still has visible graphics in playfield RAM
   * (`0x1C00`). When an item is collected or dirt is dug, the 6502 engine clears the
   * 2x2 character block in `0x1C00` to zeros.
   */
  isTileVisuallyPresent(ram, tx, ty) {
    const charCol = (tx + 1) * 2;
    const r0 = 0x1c00 + ty * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
    const r1 = r0 + GridConfig.PLAYFIELD_ROW_STRIDE;
    return (ram[r0] | ram[r0 + 1] | ram[r1] | ram[r1 + 1]) !== 0;
  }

  /**
   * Computes the exact continuous sub-pixel player and camera coordinates in 3D tile space
   * directly from the Atari ANTIC Display List LMS0 ($3C94/$3C95), fine scroll registers
   * HSCROL ($D404) & VSCROL ($D405), and logical Player position $055D & PMGY ($055E).
   */
  readExactHardwarePlayerAndCamera(ram) {
    const lms0 =
      ram[SystemAddressMap.IN_GAME_LMS0_LO] |
      (ram[SystemAddressMap.IN_GAME_LMS0_HI] << 8);
    if (lms0 >= 0x1c00 && lms0 < 0x3c00) {
      const lmsCharX = (lms0 - 0x1c00) & 0x7f;
      const lmsCharY = (lms0 - 0x1c00) >> 7;
      const hscrol = ram[SystemAddressMap.HSCROL] & 0x0f;
      const vscrol = ram[SystemAddressMap.VSCROL] & 0x07;
      // Prefer $055D over $D000 so the 2D PMG death-explosion registers ($04C5->$D000) never shift playerX!
      const hpos = ram[0x055d] || ram[0xd000] || 120;
      const pmgY = ram[0x055e] || 112;

      const vpLeftPx = lmsCharX * 8 + (16 - hscrol) * 2 - 16;
      const vpTopPx = lmsCharY * 8 + vscrol;

      const playerX = Math.max(0, Math.min(61, (vpLeftPx + (hpos - 48) * 2) / 16.0));
      const playerZ = Math.max(0, Math.min(31, (vpTopPx + (pmgY - 32)) / 16.0));
      const camX = Math.max(0, Math.min(61, (vpLeftPx + 144) / 16.0));
      const camZ = Math.max(0, Math.min(31, (vpTopPx + 80) / 16.0));

      return { playerX, playerZ, camX, camZ };
    }

    const fallbackX = Math.max(0, Math.min(61, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 0.5));
    const fallbackZ = Math.max(0, Math.min(31, ram[SystemAddressMap.PLAYER_CHAR_Y] * 0.5));
    return { playerX: fallbackX, playerZ: fallbackZ, camX: fallbackX, camZ: fallbackZ };
  }

  /**
   * Resets tracking snapshot when a new Zone starts or respawns.
   */
  resetZoneSnapshot(ram) {
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const idx = ty * W + tx;
        const t = ram[0x0b00 + idx] & 0x1f;
        this.prevLogicalTiles[idx] = t;
        const vis = this.isTileVisuallyPresent(ram, tx, ty) ? 1 : 0;
        this.prevTileOccupied[idx] = vis;
        this.laserIntensity[idx] = vis ? 1.0 : 0.0;
      }
    }

    const hw = this.readExactHardwarePlayerAndCamera(ram);
    this.player.x = hw.playerX;
    this.player.z = hw.playerZ;
    this.player.targetX = hw.playerX;
    this.player.targetZ = hw.playerZ;
    this.player.isExploding = false;
    this.player.explosionTimer = 0;
    this.camera.x = hw.camX;
    this.camera.z = hw.camZ;
    this.camera.shakeIntensity = 0;
    this.debrisChunks.length = 0;
    this.fireballs.length = 0;
    this.explodedTiles.length = 0;

    this.prevLives = ram[SystemAddressMap.LIVES_COUNT];
    this.prevDeathFlag = ram[0x059b] | ram[0x05ab];
    this.prevPlutonium = ram[SystemAddressMap.PLUTONIUM_REMAINING];
    this.prevContainers = ram[SystemAddressMap.CONTAINERS_REMAINING];
    this.prevHasKey = ram[SystemAddressMap.INV_HAS_KEY];
    this.prevHasMask = ram[SystemAddressMap.INV_HAS_MASK];
    this.prevHasSpade = ram[SystemAddressMap.INV_HAS_SPADE];
    this.prevMatCount = ram[SystemAddressMap.INV_MAT_COUNT];
    this.initializedZone = ram[SystemAddressMap.HUD_ZONE_BCD];
  }

  /**
   * Advances all 3D animations, interpolations, particle physics, and event triggers.
   * @param {Uint8Array} ram
   * @param {number} dtSeconds
   * @param {boolean} isInGame
   */
  update(ram, dtSeconds, isInGame) {
    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
    this.time += dt;

    if (!isInGame) {
      this.initializedZone = -1;
      return;
    }

    const curZoneBcd = ram[SystemAddressMap.HUD_ZONE_BCD];
    if (this.initializedZone !== curZoneBcd) {
      this.resetZoneSnapshot(ram);
      this.spawnShockwave(this.player.x, this.player.z, [0.2, 0.95, 1.0], 3.2, 0.65);
    }

    // 1. Update & Interpolate Continuous Hardware-Scrolled Player & Camera Position
    const hw = this.readExactHardwarePlayerAndCamera(ram);
    const rawX = hw.playerX;
    const rawZ = hw.playerZ;

    const jumpDist = Math.hypot(rawX - this.player.targetX, rawZ - this.player.targetZ);
    if (jumpDist > 3.5) {
      // Player warped via teleporter or respawned after death!
      this.player.isExploding = false;
      this.player.explosionTimer = 0;
      this.explodedTiles.length = 0;
      this.spawnShockwave(this.player.x, this.player.z, [0.75, 0.35, 1.0], 2.8, 0.5);
      this.spawnParticleBurst(this.player.x, this.player.z, 22, [0.3, 0.95, 1.0], 4.0);
      this.player.x = rawX;
      this.player.z = rawZ;
      this.camera.x = hw.camX;
      this.camera.z = hw.camZ;
      this.player.teleportFlash = 1.0;
      this.spawnShockwave(rawX, rawZ, [0.2, 0.95, 1.0], 3.0, 0.55);
      this.spawnParticleBurst(rawX, rawZ, 26, [0.75, 0.4, 1.0], 4.2);
      if (this.fmSynth) this.fmSynth.playTeleportSound();
    }

    const stepDx = rawX - this.player.targetX;
    const stepDz = rawZ - this.player.targetZ;
    this.player.targetX = rawX;
    this.player.targetZ = rawZ;

    const moveDx = rawX - this.player.x;
    const moveDz = rawZ - this.player.z;
    const distToTarget = Math.hypot(moveDx, moveDz);

    // Constant-velocity linear interpolation across the 2-frame (0.125 tile) Atari scroll steps
    if (distToTarget > 0.0001) {
      const linearSpeed = 3.45 + Math.max(0, distToTarget - 0.125) * 20.0;
      const step = Math.min(distToTarget, linearSpeed * dt);
      this.player.x += (moveDx / distToTarget) * step;
      this.player.z += (moveDz / distToTarget) * step;
    }

    // Continuous 3D Camera Scroll synchronized 1:1 with the Atari viewport scroll
    const camDx = hw.camX - this.camera.x;
    const camDz = hw.camZ - this.camera.z;
    const camDist = Math.hypot(camDx, camDz);
    if (camDist > 0.0001) {
      const camLinearSpeed = 3.45 + Math.max(0, camDist - 0.125) * 20.0;
      const camStep = Math.min(camDist, camLinearSpeed * dt);
      this.camera.x += (camDx / camDist) * camStep;
      this.camera.z += (camDz / camDist) * camStep;
    }

    if (distToTarget > 0.002 || Math.hypot(stepDx, stepDz) > 0.001) {
      this.player.targetAngle = Math.atan2(moveDx, moveDz);
      this.player.walkCycle += dt * 16.5;
      this.player.strideAmplitude = Math.min(1.0, this.player.strideAmplitude + dt * 12.0);
      this.player.bobY = Math.abs(Math.sin(this.player.walkCycle)) * 0.09;
      if (this.fmSynth) this.fmSynth.playFootstep();
    } else {
      this.player.strideAmplitude = Math.max(0.0, this.player.strideAmplitude - dt * 8.5);
      this.player.bobY = Math.sin(this.time * 3.2) * 0.02;
    }

    // Shortest-arc angular interpolation for player facing direction
    let angleDiff = this.player.targetAngle - this.player.facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.player.facingAngle += angleDiff * (1.0 - Math.exp(-20.0 * dt));

    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 1.4);
    this.player.teleportFlash = Math.max(0, this.player.teleportFlash - dt * 2.5);

    // Update 3D Camera Shake
    if (this.camera.shakeIntensity > 0.001) {
      this.camera.shakeIntensity = Math.max(0, this.camera.shakeIntensity - dt * 0.95);
      const s = this.camera.shakeIntensity * 0.42;
      this.camera.shakeX = Math.sin(this.time * 62.0) * s;
      this.camera.shakeY = Math.cos(this.time * 78.0) * s * 0.7;
      this.camera.shakeZ = Math.sin(this.time * 54.0 + 1.4) * s;
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
      this.camera.shakeZ = 0;
    }

    // Check if carrying hot plutonium (radiation timer counting down)
    const radLo = ram[SystemAddressMap.RADIATION_TIMER_LO];
    const radHi = ram[SystemAddressMap.RADIATION_TIMER_HI];
    const isCarryingPlutonium = radLo > 0 || radHi > 0;
    this.player.plutoniumGlow = isCarryingPlutonium
      ? 0.65 + 0.35 * Math.sin(this.time * 12.0)
      : 0.0;

    // 3. Detect Gameplay Events (Lives / Death Explosion, Plutonium, Containers, Inventory, Dug Tiles)
    const curLives = ram[SystemAddressMap.LIVES_COUNT];
    const curDeathFlag = ram[0x059b] | ram[0x05ab];
    if (
      (this.prevLives !== -1 && curLives < this.prevLives) ||
      (curDeathFlag !== 0 && this.prevDeathFlag === 0 && !this.player.isExploding)
    ) {
      this.triggerSpectacularCollisionExplosion(ram);
      if (this.fmSynth) this.fmSynth.playPlayerDeath();
    }
    this.prevLives = curLives;
    this.prevDeathFlag = curDeathFlag;

    // Step active player & collider explosion sequence (secondary chain detonations!)
    if (this.player.isExploding) {
      this.player.explosionTimer -= dt;
      if (!this.player.chainPulse1 && this.player.explosionTimer <= 1.62) {
        this.player.chainPulse1 = true;
        const ex = this.player.explosionX;
        const ez = this.player.explosionZ;
        const cx = this.player.colliderX;
        const cz = this.player.colliderZ;
        this.spawnFireball(ex, 0.55, ez, 2.2, 0.58, [1.0, 0.52, 0.15], 1.4);
        this.spawnFireball(cx, 0.55, cz, 2.2, 0.58, [1.0, 0.25, 0.35], 1.4);
        this.spawnShockwave((ex + cx) * 0.5, (ez + cz) * 0.5, [1.0, 0.65, 0.2], 4.8, 0.65, 0.28);
        this.spawnParticleBurst(ex, ez, 30, [1.0, 0.85, 0.25], 5.8, 0.55, 8.0, 1.25);
      }
      if (!this.player.chainPulse2 && this.player.explosionTimer <= 1.32) {
        this.player.chainPulse2 = true;
        const mx = (this.player.explosionX + this.player.colliderX) * 0.5;
        const mz = (this.player.explosionZ + this.player.colliderZ) * 0.5;
        this.spawnFireball(mx, 0.65, mz, 2.65, 0.65, [1.0, 0.9, 0.4], 1.6);
        this.spawnShockwave(mx, mz, [0.3, 0.95, 1.0], 5.2, 0.7, 0.35);
        this.spawnParticleBurst(mx, mz, 36, [1.0, 0.35, 0.2], 6.0, 0.6, 8.5, 1.3);
      }
      if (this.player.explosionTimer <= 0 && curDeathFlag === 0) {
        this.player.isExploding = false;
      }
    }

    const curPlutonium = ram[SystemAddressMap.PLUTONIUM_REMAINING];
    if (this.prevPlutonium !== -1 && curPlutonium < this.prevPlutonium) {
      this.spawnParticleBurst(this.player.x, this.player.z, 28, [0.2, 1.0, 0.65], 4.2, 0.45);
      this.spawnShockwave(this.player.x, this.player.z, [0.2, 1.0, 0.65], 2.8, 0.52);
      if (this.fmSynth) this.fmSynth.playPlutoniumPickup();
    }
    this.prevPlutonium = curPlutonium;

    const curContainers = ram[SystemAddressMap.CONTAINERS_REMAINING];
    if (this.prevContainers !== -1 && curContainers < this.prevContainers) {
      this.spawnParticleBurst(this.player.x, this.player.z, 30, [0.2, 0.9, 1.0], 4.0, 0.45);
      this.spawnShockwave(this.player.x, this.player.z, [1.0, 0.85, 0.2], 3.2, 0.58);
      if (this.fmSynth) {
        if (curContainers === 0) {
          this.fmSynth.playLevelComplete();
        } else {
          this.fmSynth.playContainerDeposit();
        }
      }
    }
    this.prevContainers = curContainers;

    const hasKey = ram[SystemAddressMap.INV_HAS_KEY];
    const hasMask = ram[SystemAddressMap.INV_HAS_MASK];
    const hasSpade = ram[SystemAddressMap.INV_HAS_SPADE];
    const matCount = ram[SystemAddressMap.INV_MAT_COUNT];
    if (
      hasKey > this.prevHasKey ||
      hasMask > this.prevHasMask ||
      hasSpade > this.prevHasSpade ||
      matCount > this.prevMatCount
    ) {
      this.spawnParticleBurst(this.player.x, this.player.z, 20, [1.0, 0.85, 0.25], 3.5, 0.4);
      this.spawnShockwave(this.player.x, this.player.z, [1.0, 0.88, 0.25], 2.2, 0.42);
      if (this.fmSynth) this.fmSynth.playItemPickup();
    }
    this.prevHasKey = hasKey;
    this.prevHasMask = hasMask;
    this.prevHasSpade = hasSpade;
    this.prevMatCount = matCount;

    // 4. Scan Map Tiles for Digging, Door Unlocks, and Smooth Laser Beam Interpolation
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const idx = ty * W + tx;
        const origTile = this.prevLogicalTiles[idx];
        const isVis = this.isTileVisuallyPresent(ram, tx, ty) ? 1 : 0;

        if (
          origTile === TileType.LASER_DOOR_1A ||
          origTile === TileType.LASER_DOOR_1B ||
          origTile === TileType.LASER_DOOR_2A ||
          origTile === TileType.LASER_DOOR_2B
        ) {
          // Read exact hardware closure state (0 = 100% OPEN/SAFE, 1..6 = CLOSING/CLOSED & DEADLY)
          let rawClosure = 0;
          if (origTile === TileType.LASER_DOOR_1A) rawClosure = ram[0x0587] & 0x07;
          else if (origTile === TileType.LASER_DOOR_1B) rawClosure = ram[0x0588] & 0x07;
          else if (origTile === TileType.LASER_DOOR_2A) rawClosure = ram[0x0589] & 0x07;
          else if (origTile === TileType.LASER_DOOR_2B) rawClosure = ram[0x058a] & 0x07;

          const targetClosure = Math.min(1.0, rawClosure / 6.0);
          if (rawClosure === 0 && this.laserIntensity[idx] < 0.12) {
            this.laserIntensity[idx] = 0.0;
          } else {
            const diff = targetClosure - this.laserIntensity[idx];
            const step = Math.min(Math.abs(diff), 4.8 * dt);
            this.laserIntensity[idx] += Math.sign(diff) * step;
          }
        } else if (this.prevTileOccupied[idx] === 1 && isVis === 0) {
          // A tile at (tx, ty) was just dug, collected, or unlocked!
          this.prevTileOccupied[idx] = 0;
          if (origTile === TileType.CRUMBLY_DIRT) {
            this.spawnParticleBurst(tx, ty, 12, [0.68, 0.48, 0.26], 2.8, 0.25, 9.5, 0.85);
            if (this.fmSynth) this.fmSynth.playDigSound();
          } else if (origTile === TileType.LOCKED_DOOR || origTile === TileType.DOOR_MARKER_A) {
            this.spawnParticleBurst(tx, ty, 20, [1.0, 0.55, 0.2], 3.6, 0.4, 6.0, 1.0);
            this.spawnShockwave(tx, ty, [1.0, 0.6, 0.2], 2.0, 0.4);
            if (this.fmSynth) this.fmSynth.playDoorUnlock();
          } else if (origTile === TileType.EXTRA_TIME || origTile === TileType.MYSTERY_BOX) {
            this.spawnParticleBurst(tx, ty, 22, [0.4, 0.9, 1.0], 3.8, 0.4, 5.0, 1.0);
            this.spawnShockwave(tx, ty, [0.4, 0.9, 1.0], 2.4, 0.45);
            if (this.fmSynth) this.fmSynth.playItemPickup();
          }
        }
      }
    }

    // 5. Update & Smoothly Interpolate Moving Alien Patrol Droids ($0600..$06FF)
    const robotCount = Math.min(
      this.droids.length,
      ram[SystemAddressMap.ACTIVE_ROBOT_COUNT]
    );

    for (let i = 0; i < this.droids.length; i++) {
      const droid = this.droids[i];
      if (droid.explodedTimer > 0) {
        droid.explodedTimer = Math.max(0, droid.explodedTimer - dt);
      }
      if (i >= robotCount) {
        droid.active = false;
        continue;
      }
      const base = 0x0600 + i * 8;
      const rType = ram[base + 0] & 1;
      const rActive = ram[base + 1];
      const rCharX = ram[base + 3];
      const rCharY = ram[base + 4];

      if (!rActive || rCharX < 2) {
        droid.active = false;
        continue;
      }

      const targetX = (rCharX - 2) * 0.5;
      const targetZ = rCharY * 0.5;

      if (!droid.active || Math.hypot(targetX - droid.x, targetZ - droid.z) > 4.0) {
        droid.x = targetX;
        droid.z = targetZ;
        droid.active = true;
      }

      const dx = targetX - droid.x;
      const dz = targetZ - droid.z;
      const dDist = Math.hypot(dx, dz);
      droid.type = rType;
      droid.targetX = targetX;
      droid.targetZ = targetZ;

      if (dDist > 0.0001) {
        const baseDroidSpeed = rType === 0 ? 3.35 : 6.6;
        const droidSpeed = baseDroidSpeed + Math.max(0, dDist - 0.5) * 16.0;
        const dStep = Math.min(dDist, droidSpeed * dt);
        droid.x += (dx / dDist) * dStep;
        droid.z += (dz / dDist) * dStep;
      }

      if (dDist > 0.005) {
        const targetAngle = Math.atan2(dx, dz);
        let aDiff = targetAngle - droid.facingAngle;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        droid.facingAngle += aDiff * (1.0 - Math.exp(-15.0 * dt));
      }

      droid.ringSpin += dt * (rType === 0 ? 4.5 : 8.5);
    }

    // 6. Step 3D Particles, Tumbling 3D Debris Chunks, Volumetric Fireballs & Shockwaves
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.04) {
        p.y = 0.04;
        p.vy = Math.abs(p.vy) * 0.48;
        p.vx *= 0.78;
        p.vz *= 0.78;
      }
      p.rot += p.vrot * dt;
    }

    for (let i = this.debrisChunks.length - 1; i >= 0; i--) {
      const dc = this.debrisChunks[i];
      dc.life += dt;
      if (dc.life >= dc.maxLife) {
        this.debrisChunks.splice(i, 1);
        continue;
      }
      dc.vy -= dc.gravity * dt;
      dc.x += dc.vx * dt;
      dc.y += dc.vy * dt;
      dc.z += dc.vz * dt;
      if (dc.y < 0.1) {
        dc.y = 0.1;
        dc.vy = Math.abs(dc.vy) * 0.54;
        dc.vx *= 0.8;
        dc.vz *= 0.8;
      }
      dc.rx += dc.vrx * dt;
      dc.ry += dc.vry * dt;
      dc.rz += dc.vrz * dt;
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.life += dt;
      if (fb.life >= fb.maxLife) {
        this.fireballs.splice(i, 1);
        continue;
      }
      const ratio = fb.life / fb.maxLife;
      // Fast explosive expansion followed by dissipation
      fb.scale = fb.maxScale * Math.sin(ratio * Math.PI * 0.85);
      fb.y += fb.vy * dt;
      fb.rx += fb.vrx * dt;
      fb.ry += fb.vry * dt;
      fb.rz += fb.vrz * dt;
    }

    for (let i = this.explodedTiles.length - 1; i >= 0; i--) {
      this.explodedTiles[i].timer -= dt;
      if (this.explodedTiles[i].timer <= 0) {
        this.explodedTiles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = sw.life / sw.maxLife;
      sw.radius = 0.2 + (sw.maxRadius - 0.2) * (1.0 - Math.pow(1.0 - t, 2.5));
    }
  }
}


  // =========================================================================
  // Module: graphics/WebGL3DMeshRenderer.js
  // =========================================================================
/**
 * @fileoverview True WebGL 3D Bird's-Eye Mesh Renderer for Zone X GFX Redesign.
 *
 * Renders the entire Zone X world from a customizable 3D bird's-eye perspective:
 * - Procedural 3D meshes for all 28 tile types (bevelled reactor bulkheads, rotating
 *   Cherenkov plutonium crystals, containment silos, plasma laser barriers, warp gates,
 *   crystalline regolith, and extraction beacons)
 * - Articulated 3D Astronaut Player with swinging arms/legs, glowing visor, and
 *   plutonium backpack light
 * - Smoothly interpolated 3D Alien Patrol Droids (hovering sentinel spheres &
 *   multi-thruster interceptor mechs)
 * - 3D Particle Shards & Expanding Torus Shockwaves
 * - Dynamic Blinn-Phong lighting with 8 real-time point lights + specular highlights
 *
 * Also maintains the underlying `AtariDisplayRenderer` so hardware P/M collision
 * registers (`collisionP0PF`, `collisionP1PF`), Title/Features screens, and the
 * full tactical zone map remain 100% cycle-accurate.
 */



const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aEmissive;

  uniform mat4 uViewProj;
  uniform mat4 uModel;
  uniform vec3 uTint;
  uniform float uEmissiveBoost;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vEmissive;

  void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(uModel) * aNormal);
    vColor = aColor * uTint;
    vEmissive = clamp(aEmissive + uEmissiveBoost, 0.0, 1.5);
    gl_Position = uViewProj * worldPos;
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vEmissive;

  uniform vec3 uCameraPos;
  uniform vec3 uAmbientColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec4 uPointLights[8]; // xyz = pos, w = radius
  uniform vec3 uPointColors[8];

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);

    // Hemisphere ambient + Directional key light
    float hemi = 0.5 + 0.5 * N.y;
    vec3 lighting = uAmbientColor * (0.65 + 0.55 * hemi);

    float ndotl = max(dot(N, uSunDir), 0.0);
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 28.0) * 0.38;
    lighting += uSunColor * (ndotl * 0.85 + spec);

    // 8 Dynamic Point Lights (Player, Plutonium, Lasers, Portals, Droids)
    for (int i = 0; i < 8; i++) {
      vec3 lVec = uPointLights[i].xyz - vWorldPos;
      float radius = uPointLights[i].w;
      if (radius > 0.01) {
        float dist = length(lVec);
        if (dist < radius) {
          vec3 L = lVec / max(dist, 0.001);
          float atten = pow(1.0 - dist / radius, 1.8);
          float diff = max(dot(N, L), 0.0);
          vec3 Hp = normalize(L + V);
          float pSpec = pow(max(dot(N, Hp), 0.0), 20.0) * 0.45;
          lighting += uPointColors[i] * atten * (diff + pSpec + 0.2);
        }
      }
    }

    vec3 baseLit = vColor * lighting;
    vec3 emissiveGlow = vColor * (1.35 * vEmissive);
    vec3 finalRgb = mix(baseLit, emissiveGlow, clamp(vEmissive * 0.72, 0.0, 1.0)) + emissiveGlow * 0.35;

    // Subtle distance depth fog toward deep cyber-indigo
    float camDist = length(uCameraPos - vWorldPos);
    float fogFactor = clamp((camDist - 20.0) / 26.0, 0.0, 0.55);
    vec3 fogColor = vec3(0.03, 0.05, 0.10);
    finalRgb = mix(finalRgb, fogColor, fogFactor);

    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;
class WebGL3DMeshRenderer {
  /**
   * @param {Object} romBundle
   * @param {import("../models/GameState.js").GameState} gameState
   * @param {HTMLCanvasElement} screenCanvas2d
   * @param {HTMLCanvasElement} fullMapCanvas
   * @param {HTMLElement} fullMapPanel
   * @param {HTMLCanvasElement} webglCanvas
   * @param {import("./SmoothAnimationTracker.js").SmoothAnimationTracker} animTracker
   */
  constructor(
    romBundle,
    gameState,
    screenCanvas2d,
    fullMapCanvas,
    fullMapPanel,
    webglCanvas,
    animTracker
  ) {
    this.romBundle = romBundle;
    this.state = gameState;
    this.screenCanvas2d = screenCanvas2d;
    this.webglCanvas = webglCanvas;
    this.anim = animTracker;

    // Underlying cycle-accurate 2D Atari renderer (keeps hardware P/M collision registers exact)
    this.atari2d = new AtariDisplayRenderer(
      screenCanvas2d,
      gameState,
      romBundle
    );

    /** @type {"3d_birdseye"|"hybrid_pip"|"classic_2d"} */
    this.renderMode = "3d_birdseye";

    /** @type {WebGLRenderingContext|null} */
    this.gl = null;
    this.program = null;
    this.gpuMeshes = {};
    this.uniforms = {};
    this.attribs = {};

    this.modelMatrix = new Float32Array(16);
    this.viewMatrix = new Float32Array(16);
    this.projMatrix = new Float32Array(16);
    this.viewProjMatrix = new Float32Array(16);
    this.pointLightsFlat = new Float32Array(32);
    this.pointColorsFlat = new Float32Array(24);

    this._initWebGL();
  }

  _initWebGL() {
    if (!this.webglCanvas) return;
    const gl =
      this.webglCanvas.getContext("webgl2", { antialias: true, alpha: false }) ||
      this.webglCanvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return;
    this.gl = gl;

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("WebGL shader link error:", gl.getProgramInfoLog(prog));
      return;
    }
    this.program = prog;
    gl.useProgram(prog);

    this.attribs = {
      aPosition: gl.getAttribLocation(prog, "aPosition"),
      aNormal: gl.getAttribLocation(prog, "aNormal"),
      aColor: gl.getAttribLocation(prog, "aColor"),
      aEmissive: gl.getAttribLocation(prog, "aEmissive"),
    };

    this.uniforms = {
      uViewProj: gl.getUniformLocation(prog, "uViewProj"),
      uModel: gl.getUniformLocation(prog, "uModel"),
      uTint: gl.getUniformLocation(prog, "uTint"),
      uEmissiveBoost: gl.getUniformLocation(prog, "uEmissiveBoost"),
      uCameraPos: gl.getUniformLocation(prog, "uCameraPos"),
      uAmbientColor: gl.getUniformLocation(prog, "uAmbientColor"),
      uSunDir: gl.getUniformLocation(prog, "uSunDir"),
      uSunColor: gl.getUniformLocation(prog, "uSunColor"),
      uPointLights: gl.getUniformLocation(prog, "uPointLights"),
      uPointColors: gl.getUniformLocation(prog, "uPointColors"),
    };

    // Upload all procedural 3D meshes to GPU VBOs
    const rawMeshes = MeshGeometryBuilder.buildAllGameMeshes();
    for (const [name, mesh] of Object.entries(rawMeshes)) {
      const vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      this.gpuMeshes[name] = {
        vbo,
        vertexCount: mesh.vertexCount,
      };
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
  }

  _compileShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("WebGL shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  /**
   * Switches between `"3d_birdseye"`, `"hybrid_pip"`, and `"classic_2d"`.
   * @param {"3d_birdseye"|"hybrid_pip"|"classic_2d"} mode
   */
  setRenderMode(mode) {
    this.renderMode = mode;
    this._syncCanvasVisibility();
  }

  _syncCanvasVisibility() {
    if (!this.webglCanvas || !this.screenCanvas2d) return;
    const dlAddr =
      this.state.ram[SystemAddressMap.DLIST_PTR_LO] |
      (this.state.ram[SystemAddressMap.DLIST_PTR_HI] << 8);
    const isInGame = dlAddr === DisplayListAddress[ScreenMode.IN_GAME];

    if (this.renderMode === "classic_2d") {
      this.webglCanvas.style.display = "none";
      this.screenCanvas2d.className = "viewport-2d-full";
    } else if (!isInGame) {
      // On Title / Features / Hall of Fame: show 3D showcase background + holographic 2D overlay!
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-hologram";
    } else if (this.renderMode === "hybrid_pip") {
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-pip";
    } else {
      // Pure 3D Bird's-Eye Mode during gameplay
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-hidden";
    }
  }

  renderFullZoneMapIfPresent() {
    this.atari2d.renderFullZoneMapIfPresent();
  }

  /**
   * Renders the cycle-accurate 2D frame (for P/M collisions & radar) and
   * updates the 3D WebGL scene.
   */
  renderFrame() {
    this.atari2d.renderFrame();
    this.render3DPass();
  }

  /**
   * Renders the 3D WebGL Bird's-Eye pass at full display refresh rate (60Hz/120Hz/144Hz).
   */
  render3DPass() {
    this._syncCanvasVisibility();
    if (!this.gl || !this.program || this.renderMode === "classic_2d") return;

    const dlAddr =
      this.state.ram[SystemAddressMap.DLIST_PTR_LO] |
      (this.state.ram[SystemAddressMap.DLIST_PTR_HI] << 8);
    const isInGame = dlAddr === DisplayListAddress[ScreenMode.IN_GAME];

    if (isInGame) {
      this._render3DInGameScene();
    } else {
      this._render3DShowcaseBackdrop();
    }
  }

  // ===========================================================================
  // 3D In-Game Bird's-Eye Scene Renderer
  // ===========================================================================

  _render3DInGameScene() {
    const gl = this.gl;
    const ram = this.state.ram;
    const t = this.anim.time;

    gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
    gl.clearColor(0.03, 0.05, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Compute Camera Position from SmoothAnimationTracker + 3D Explosion Shake
    const camTargetX = this.anim.camera.x + (this.anim.camera.shakeX || 0);
    const camTargetZ = this.anim.camera.z + (this.anim.camera.shakeZ || 0);
    const pitchRad = (this.anim.camera.pitchDeg * Math.PI) / 180;
    const dist = this.anim.camera.distance;

    const eyeX = camTargetX;
    const eyeY = Math.sin(pitchRad) * dist + (this.anim.camera.shakeY || 0);
    const eyeZ = camTargetZ + Math.cos(pitchRad) * dist;

    const aspect = this.webglCanvas.width / Math.max(1, this.webglCanvas.height);
    this._perspective(this.projMatrix, (this.anim.camera.fovDeg * Math.PI) / 180, aspect, 0.5, 65.0);
    this._lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [camTargetX, 0.15, camTargetZ], [0, 1, 0]);
    this._multiplyMat4(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, this.viewProjMatrix);
    gl.uniform3f(this.uniforms.uCameraPos, eyeX, eyeY, eyeZ);

    // Extract Zone's Atari Palette tint for dynamic level theming
    const wallPalIdx = ram[SystemAddressMap.COLOR0_SHADOW] & 0xfe;
    const wallRgb = this.atari2d.palPalette[wallPalIdx] || [70, 130, 210];
    const wallTint = [
      0.55 + (wallRgb[0] / 255) * 0.75,
      0.55 + (wallRgb[1] / 255) * 0.75,
      0.55 + (wallRgb[2] / 255) * 0.75,
    ];

    // Global directional + ambient lights
    const hurtFlash = this.anim.player.hurtFlash;
    gl.uniform3f(
      this.uniforms.uAmbientColor,
      0.34 + hurtFlash * 0.45,
      0.38 - hurtFlash * 0.15,
      0.48 - hurtFlash * 0.15
    );
    gl.uniform3f(this.uniforms.uSunDir, 0.36, 0.84, 0.41);
    gl.uniform3f(this.uniforms.uSunColor, 0.95, 0.97, 1.0);

    // Gather up to 8 dynamic point lights (Player + closest Plutonium/Lasers/Portals/Droids)
    this._populateDynamicPointLights(ram, t);
    gl.uniform4fv(this.uniforms.uPointLights, this.pointLightsFlat);
    gl.uniform3fv(this.uniforms.uPointColors, this.pointColorsFlat);

    // Visible tile frustum bounds around camera target
    const minTx = Math.max(-1, Math.floor(camTargetX - 15));
    const maxTx = Math.min(GridConfig.WIDTH, Math.ceil(camTargetX + 15));
    const minTz = Math.max(-1, Math.floor(camTargetZ - 11));
    const maxTz = Math.min(GridConfig.HEIGHT, Math.ceil(camTargetZ + 10));

    // 1. Render 3D Floor Grid & Playfield Tiles
    for (let tz = minTz; tz <= maxTz; tz++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        // Outer border walls around the 62x32 arena
        if (tx < 0 || tx >= GridConfig.WIDTH || tz < 0 || tz >= GridConfig.HEIGHT) {
          this._drawMesh("wallBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0.05);
          continue;
        }

        // Floor plate
        const checker = (tx + tz) & 1 ? 1.04 : 0.96;
        this._drawMesh("floorTile", tx, 0, tz, 0, 1, 1, 1, [checker, checker, checker], 0);

        const idx = tz * GridConfig.WIDTH + tx;
        const rawTile = ram[0x0b00 + idx] & 0x1f;
        if (
          rawTile === TileType.FLOOR ||
          rawTile === TileType.PLAYER_START ||
          rawTile === TileType.ALIEN_DROID_NORMAL ||
          rawTile === TileType.ALIEN_DROID_FAST
        ) {
          continue;
        }

        const isVis = this.anim.isTileVisuallyPresent(ram, tx, tz);
        const isExploded = this.anim.isTileExploded(tx, tz);
        if (isExploded) continue;

        switch (rawTile) {
          case TileType.WALL:
            this._drawMesh("wallBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0);
            break;

          case TileType.PLUTONIUM:
            if (isVis) {
              const bob = Math.sin(t * 4.2 + tx * 0.7 + tz * 0.5) * 0.08;
              const pulse = 0.45 + 0.35 * Math.sin(t * 7.5 + tx);
              this._drawMesh("plutoniumCore", tx, bob, tz, t * 1.8 + tx, 1.15, 1.15, 1.15, [1, 1, 1], pulse);
              this._drawMesh("plutoniumBeacon", tx, bob, tz, -t * 3.4 + tz, 1.15, 1.15, 1.15, [1, 1, 1], 0.65);
            }
            break;

          case TileType.CONTAINER: {
            const carryingPlutonium = this.anim.player.plutoniumGlow > 0.05;
            const barrelPulse = carryingPlutonium
              ? 0.45 + 0.35 * Math.sin(t * 9.0 + tx)
              : 0.2 + 0.15 * Math.sin(t * 4.0 + tx);
            this._drawMesh(
              "containerVault",
              tx,
              0,
              tz,
              0,
              1.08,
              1.08,
              1.08,
              [1, 1, 1],
              barrelPulse
            );
            // Bobbing 3D Target Arrow above the barrel opening ("Deliver Plutonium Here!")
            const arrowBob = Math.sin(t * (carryingPlutonium ? 8.5 : 4.5) + tx) * 0.14;
            const arrowScale = carryingPlutonium ? 1.28 : 1.0;
            this._drawMesh(
              "containerArrow",
              tx,
              arrowBob,
              tz,
              t * 3.2,
              arrowScale,
              arrowScale,
              arrowScale,
              carryingPlutonium ? [0.4, 1.0, 0.3] : [1.0, 0.95, 0.3],
              carryingPlutonium ? 0.85 : 0.45
            );
            break;
          }

          case TileType.KEY:
            if (isVis) {
              const bob = Math.sin(t * 3.8 + tx) * 0.09;
              this._drawMesh("keyItem", tx, bob, tz, t * 2.1, 1.18, 1.18, 1.18, [1, 1, 1], 0.35);
            }
            break;

          case TileType.RADIATION_CAPSULE:
          case TileType.SPADE:
            if (isVis) {
              const bob = Math.sin(t * 3.5 + tz) * 0.08;
              this._drawMesh("spadeItem", tx, bob, tz, t * 1.9, 1.2, 1.2, 1.2, [1, 1, 1], 0.35);
            }
            break;

          case TileType.INSULATING_MAT:
            if (isVis) {
              const bob = Math.sin(t * 3.0 + tx) * 0.05;
              this._drawMesh("matItem", tx, bob, tz, t * 1.2, 1.08, 1.08, 1.08, [1, 1, 1], 0.25);
            }
            break;

          case TileType.EXTRA_TIME:
            if (isVis) {
              const bob = Math.sin(t * 4.0 + tx) * 0.09;
              this._drawMesh("extraTimeItem", tx, bob, tz, t * 2.2, 1.12, 1.12, 1.12, [1, 1, 1], 0.35);
            }
            break;

          case TileType.MYSTERY_BOX:
            if (isVis) {
              const bob = Math.sin(t * 3.2 + tx) * 0.06;
              this._drawMesh("mysteryBox", tx, bob, tz, t * 1.1, 1.08, 1.08, 1.08, [1, 1, 1], 0.3);
            }
            break;

          case TileType.LOCKED_DOOR:
          case TileType.DOOR_MARKER_A:
            if (isVis) {
              // Both Tile 7 (Original Key-Locked Door) and Tile 9 (Security/Airlock Door)
              const meshId = rawTile === TileType.DOOR_MARKER_A ? "lockedDoor" : "lockedDoor";
              this._drawMesh(meshId, tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.25);
            }
            break;

          case TileType.LASER_DOOR_1A:
          case TileType.LASER_DOOR_1B:
          case TileType.LASER_DOOR_2A:
          case TileType.LASER_DOOR_2B: {
            // 1. Low-profile North & South floor threshold rails
            this._drawMesh("laserPylons", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.15);

            // Check exact hardware state (0 = SAFE/OPEN, 1..6 = DEADLY/CLOSING-OR-CLOSED)
            let rawClosure = 0;
            if (rawTile === TileType.LASER_DOOR_1A) rawClosure = ram[0x0587] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_1B) rawClosure = ram[0x0588] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_2A) rawClosure = ram[0x0589] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_2B) rawClosure = ram[0x058a] & 0x07;

            if (rawClosure === 0) {
              // 100% OPEN & SAFE: Completely unobstructed corridor with glowing emerald-green walkway + overhead green beacons
              this._drawMesh("laserSafeOpen", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.65);
            } else {
              // CLOSING OR CLOSED & DEADLY: Flashing crimson danger beacons + North/South 3D laser blast gates sliding shut
              this._drawMesh("laserDangerClosed", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.75);
              const closure = Math.max(0.22, this.anim.laserIntensity[idx]);
              const northZ = tz - 0.36 + closure * 0.18;
              const southZ = tz + 0.36 - closure * 0.18;
              this._drawMesh("laserBeams", tx, 0, northZ, 0, 1.0, 1.0, closure, [1, 1, 1], 0.65);
              this._drawMesh("laserBeams", tx, 0, southZ, 0, 1.0, 1.0, closure, [1, 1, 1], 0.65);
            }
            break;
          }

          case TileType.WARP_PAD:
            this._drawMesh("warpPad", tx, 0, tz, t * 2.8, 1, 1, 1, [1, 1, 1], 0.3);
            break;

          case TileType.WARP_FRAME_LEFT:
          case TileType.WARP_FRAME_RIGHT:
            this._drawMesh("warpFrame", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.2);
            break;

          case 18: // Original Atari Crumbly Block (0x12) dug with Spade
          case TileType.CRUMBLY_DIRT:
            if (isVis) {
              this._drawMesh("crumblyDirt", tx, 0, tz, (tx * 1.7 + tz * 2.3) % 6.28, 1, 1, 1, [1, 1, 1], 0.08);
            }
            break;

          case TileType.FORCEFIELD:
            if (isVis) {
              this._drawMesh("hazardField", tx, 0, tz, t * 3.2, 1, 1, 1, [1, 1, 1], 0.45);
            }
            break;

          case TileType.SKULL_HAZARD:
            if (isVis) {
              this._drawMesh("skullHazard", tx, 0, tz, Math.sin(t * 2.5 + tx) * 0.2, 1, 1, 1, [1, 1, 1], 0.4);
            }
            break;

          case TileType.EXIT_PORTAL: {
            const plutLeft = ram[SystemAddressMap.PLUTONIUM_REMAINING];
            const exitBoost = plutLeft === 0 ? 0.65 + 0.35 * Math.sin(t * 8.0) : 0.25;
            this._drawMesh("exitPortal", tx, 0, tz, t * 1.8, 1.12, 1.12, 1.12, [1, 1, 1], exitBoost);
            break;
          }

          default:
            if (isVis) {
              this._drawMesh("rockBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0);
            }
            break;
        }
      }
    }

    // 2. Render Articulated 3D Astronaut Player (hidden while disintegrated in 3D explosion!)
    if (!this.anim.player.isExploding) {
      this._renderArticulatedPlayer(t);
    }

    // 3. Render Creepy Articulated 3D Alien Hunters (hidden if currently blasted apart!)
    for (let i = 0; i < this.anim.droids.length; i++) {
      const d = this.anim.droids[i];
      if (!d.active || d.explodedTimer > 0) continue;
      if (d.x < minTx - 1 || d.x > maxTx + 1 || d.z < minTz - 1 || d.z > maxTz + 1) continue;
      this._renderCreepyAlien(d, i, t);
    }

    // 4. Render 3D Tumbling Explosion Debris Chunks (Astronaut Helmet/Torso/Limbs, Alien Legs/Claws/Thorax, Door Gates, Shrapnel)
    for (let i = 0; i < this.anim.debrisChunks.length; i++) {
      const dc = this.anim.debrisChunks[i];
      const lifeRatio = 1.0 - dc.life / dc.maxLife;
      const s = dc.scale * Math.min(1.0, lifeRatio * 1.45);
      this._drawMesh3DRot(
        dc.meshName,
        dc.x,
        dc.y,
        dc.z,
        dc.rx,
        dc.ry,
        dc.rz,
        s,
        s,
        s,
        dc.color,
        0.55 * lifeRatio
      );
    }

    // 5. Render Volumetric 3D Plasma Fireballs
    for (let i = 0; i < this.anim.fireballs.length; i++) {
      const fb = this.anim.fireballs[i];
      const lifeRatio = 1.0 - fb.life / fb.maxLife;
      const s = fb.scale;
      this._drawMesh3DRot(
        "explosionFireball",
        fb.x,
        fb.y,
        fb.z,
        fb.rx,
        fb.ry,
        fb.rz,
        s,
        s * 0.85,
        s,
        fb.color,
        0.95 * lifeRatio
      );
    }

    // 6. Render 3D Particle Shards & Expanding Shockwave Torus Rings
    for (let i = 0; i < this.anim.particles.length; i++) {
      const p = this.anim.particles[i];
      const lifeRatio = 1.0 - p.life / p.maxLife;
      const s = p.scale * lifeRatio;
      this._drawMesh("particleShard", p.x, p.y, p.z, p.rot, s, s, s, p.color, 0.85);
    }

    for (let i = 0; i < this.anim.shockwaves.length; i++) {
      const sw = this.anim.shockwaves[i];
      const lifeRatio = 1.0 - sw.life / sw.maxLife;
      this._drawMesh(
        "shockwaveRing",
        sw.x,
        sw.y,
        sw.z,
        t * 2.0,
        sw.radius,
        lifeRatio * 0.9,
        sw.radius,
        sw.color,
        0.95
      );
    }
  }

  /**
   * Renders the articulated 3D Astronaut mesh (Torso, Helmet, Left/Right Arms & Legs).
   */
  _renderArticulatedPlayer(t) {
    const p = this.anim.player;
    const px = p.x;
    const pz = p.z;
    const baseY = p.bobY;
    const yaw = p.facingAngle;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const suitTint =
      p.hurtFlash > 0.05
        ? [1.0, 0.35, 0.35]
        : p.teleportFlash > 0.05
          ? [0.45, 0.98, 1.0]
          : [1.0, 1.0, 1.0];
    const boost = Math.max(p.hurtFlash * 0.6, p.teleportFlash * 0.7, p.plutoniumGlow * 0.35);

    // 1. Torso & Backpack
    this._drawMesh("playerTorso", px, baseY + 0.44, pz, yaw, 1, 1, 1, suitTint, boost);

    // 2. Helmet + Visor (subtle head scan oscillation)
    const headYaw = yaw + Math.sin(t * 2.5) * 0.08;
    this._drawMesh("playerHead", px, baseY + 0.82, pz, headYaw, 1, 1, 1, suitTint, boost + 0.1);

    // 3. Articulated Arms & Legs with smooth walk-cycle swing
    const swing = Math.sin(p.walkCycle) * 0.48 * p.strideAmplitude;
    const strideZ = Math.sin(p.walkCycle) * 0.14 * p.strideAmplitude;
    const liftL = Math.max(0, Math.cos(p.walkCycle)) * 0.08 * p.strideAmplitude;
    const liftR = Math.max(0, -Math.cos(p.walkCycle)) * 0.08 * p.strideAmplitude;

    // Left & Right Legs
    const legOffsetX = 0.13;
    const lLegX = px - cosY * legOffsetX + sinY * strideZ;
    const lLegZ = pz + sinY * legOffsetX + cosY * strideZ;
    const rLegX = px + cosY * legOffsetX - sinY * strideZ;
    const rLegZ = pz - sinY * legOffsetX - cosY * strideZ;

    this._drawMesh("playerLimb", lLegX, baseY + 0.3 + liftL, lLegZ, yaw + swing * 0.3, 1, 1, 1, suitTint, boost);
    this._drawMesh("playerLimb", rLegX, baseY + 0.3 + liftR, rLegZ, yaw - swing * 0.3, 1, 1, 1, suitTint, boost);

    // Left & Right Arms (counter-swinging for natural human gait)
    const armOffsetX = 0.28;
    const armStride = -strideZ * 1.15;
    const lArmX = px - cosY * armOffsetX + sinY * armStride;
    const lArmZ = pz + sinY * armOffsetX + cosY * armStride;
    const rArmX = px + cosY * armOffsetX - sinY * armStride;
    const rArmZ = pz - sinY * armOffsetX - cosY * armStride;

    this._drawMesh("playerLimb", lArmX, baseY + 0.56, lArmZ, yaw - swing * 0.4, 0.88, 0.9, 0.88, suitTint, boost);
    this._drawMesh("playerLimb", rArmX, baseY + 0.56, rArmZ, yaw + swing * 0.4, 0.88, 0.9, 0.88, suitTint, boost);
  }

  /**
   * Renders a creepy, articulated 3D Alien Hunter:
   * - Type 0: Xenomorph-Arachnid Stalker (obsidian-crimson carapace, pulsing bio-sac abdomen,
   *   6 venom-green eyes, 6 scuttling spider legs in alternating tripod gait, and 2 snapping mandibles).
   * - Type 1: Eldritch Shadow-Reaper (hunched biomechanical horror with exposed toxic-green ribcage,
   *   horned Xenomorph cranium, 6 fast-scuttling spider legs, 2 slashing mantis scythe-claws, and whipping scorpion stinger tail).
   */
  _renderCreepyAlien(d, index, t) {
    const ax = d.x;
    const az = d.z;
    const isFast = d.type !== 0;

    // Predatory player-stalking: subtly orient toward the player when within hunting range
    let yaw = d.facingAngle;
    const p = this.anim.player;
    if (p) {
      const toPlayerX = p.x - ax;
      const toPlayerZ = p.z - az;
      const distToPlayer = Math.hypot(toPlayerX, toPlayerZ);
      if (distToPlayer > 0.1 && distToPlayer < 10.0) {
        const angleToPlayer = Math.atan2(toPlayerX, toPlayerZ);
        let diff = angleToPlayer - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const stalkBlend = (1.0 - distToPlayer / 10.0) * 0.45;
        yaw += diff * stalkBlend;
      }
    }

    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const gaitFreq = isFast ? 22.0 : 16.0;
    const gaitPhaseBase = t * gaitFreq + index * 1.9;
    const scuttleBob = Math.abs(Math.sin(gaitPhaseBase)) * 0.06;
    const baseY = 0.22 + scuttleBob;
    const breathe = 1.0 + 0.06 * Math.sin(t * 9.0 + index);
    const pulseBoost = 0.25 + 0.25 * Math.sin(t * (isFast ? 14.0 : 8.5) + index);

    // 1. Render Central Alien Thorax / Abdomen / Skull
    if (!isFast) {
      this._drawMesh(
        "droidCore",
        ax,
        baseY,
        az,
        yaw,
        1.12 * breathe,
        1.12,
        1.12 / breathe,
        [1, 1, 1],
        pulseBoost
      );

      // 2. Snapping Razor Mandible Pincers (Left & Right)
      const jawOpen = 0.12 + 0.34 * Math.abs(Math.sin(t * 10.5 + index * 1.3));
      const lJawX = ax - rightX * 0.11 + fwdX * 0.05;
      const lJawZ = az - rightZ * 0.11 + fwdZ * 0.05;
      const rJawX = ax + rightX * 0.11 + fwdX * 0.05;
      const rJawZ = az + rightZ * 0.11 + fwdZ * 0.05;
      this._drawMesh("alienMandible", lJawX, baseY, lJawZ, yaw - jawOpen, 1.15, 1.15, 1.15, [1, 1, 1], 0.35);
      this._drawMesh("alienMandible", rJawX, baseY, rJawZ, yaw + jawOpen, 1.15, 1.15, 1.15, [1, 1, 1], 0.35);
    } else {
      // Eldritch Shadow-Reaper Torso & Horned Xenomorph Skull
      this._drawMesh(
        "fastDroidBody",
        ax,
        baseY + 0.03,
        az,
        yaw,
        1.16 * breathe,
        1.16,
        1.16,
        [1, 1, 1],
        pulseBoost + 0.1
      );

      // 2. Giant Slashing Praying-Mantis / Necromorph Scythe Claws (Left & Right)
      const slash = Math.sin(t * 15.0 + index) * 0.48;
      const lClawX = ax - rightX * 0.22 + fwdX * 0.04;
      const lClawZ = az - rightZ * 0.22 + fwdZ * 0.04;
      const rClawX = ax + rightX * 0.22 + fwdX * 0.04;
      const rClawZ = az + rightZ * 0.22 + fwdZ * 0.04;
      this._drawMesh("alienScytheClaw", lClawX, baseY + 0.04, lClawZ, yaw + 0.18 + slash, 1.18, 1.18, 1.18, [1, 1, 1], 0.55);
      this._drawMesh("alienScytheClaw", rClawX, baseY + 0.04, rClawZ, yaw - 0.18 - slash, 1.18, 1.18, 1.18, [1, 1, 1], 0.55);

      // 3. Whipping Scorpion Stinger Tail
      const tailWhip = Math.sin(t * 12.5 + index * 0.7) * 0.42;
      this._drawMesh("alienTailStinger", ax, baseY + 0.05, az, yaw + tailWhip, 1.2, 1.2, 1.2, [1, 1, 1], 0.5);
    }

    // 4. 6 Articulated Spider Legs in Alternating Tripod Gait (3 Left, 3 Right)
    const zOffsets = [0.16, 0.0, -0.16];
    const spreadAngles = [-0.46, 0.0, 0.46];
    const legTint = isFast ? [0.85, 0.45, 1.0] : [1.0, 0.65, 0.65];

    for (let pair = 0; pair < 3; pair++) {
      const zOff = zOffsets[pair];
      const spread = spreadAngles[pair];

      // Tripod group A vs B (alternating phase by PI)
      const rPhase = gaitPhaseBase + (pair % 2 === 0 ? 0 : Math.PI);
      const lPhase = gaitPhaseBase + (pair % 2 === 0 ? Math.PI : 0);

      const rSwing = Math.sin(rPhase) * 0.36;
      const lSwing = Math.sin(lPhase) * 0.36;
      const rLift = Math.max(0, Math.cos(rPhase)) * 0.09;
      const lLift = Math.max(0, Math.cos(lPhase)) * 0.09;

      const rLegX = ax + rightX * 0.08 + fwdX * zOff;
      const rLegZ = az + rightZ * 0.08 + fwdZ * zOff;
      const lLegX = ax - rightX * 0.08 + fwdX * zOff;
      const lLegZ = az - rightZ * 0.08 + fwdZ * zOff;

      this._drawMesh(
        "alienSpiderLeg",
        rLegX,
        baseY + rLift,
        rLegZ,
        yaw + spread + rSwing,
        1.12,
        1.12,
        1.12,
        legTint,
        0.2
      );
      this._drawMesh(
        "alienSpiderLeg",
        lLegX,
        baseY + lLift,
        lLegZ,
        yaw + Math.PI - spread - lSwing,
        1.12,
        1.12,
        1.12,
        legTint,
        0.2
      );
    }
  }

  /**
   * Populates the 8 dynamic WebGL point lights around the player and nearby active emitters.
   */
  _populateDynamicPointLights(ram, t) {
    this.pointLightsFlat.fill(0);
    this.pointColorsFlat.fill(0);

    const p = this.anim.player;
    // Light 0: Player suit & plutonium backpack light (or blazing Explosion Flash Light!)
    if (p.isExploding) {
      this.pointLightsFlat[0] = (p.explosionX + p.colliderX) * 0.5;
      this.pointLightsFlat[1] = 1.65;
      this.pointLightsFlat[2] = (p.explosionZ + p.colliderZ) * 0.5;
      this.pointLightsFlat[3] = 11.5;
      this.pointColorsFlat[0] = 1.0;
      this.pointColorsFlat[1] = 0.65;
      this.pointColorsFlat[2] = 0.22;
    } else {
      this.pointLightsFlat[0] = p.x;
      this.pointLightsFlat[1] = 1.25;
      this.pointLightsFlat[2] = p.z;
      this.pointLightsFlat[3] = 6.5;

      if (p.plutoniumGlow > 0.05) {
        this.pointColorsFlat[0] = 0.25;
        this.pointColorsFlat[1] = 1.0;
        this.pointColorsFlat[2] = 0.65;
      } else {
        this.pointColorsFlat[0] = 0.25;
        this.pointColorsFlat[1] = 0.82;
        this.pointColorsFlat[2] = 1.0;
      }
    }

    let lightSlot = 1;
    // Add nearest active droids as menacing red/violet point lights
    for (let i = 0; i < this.anim.droids.length && lightSlot < 4; i++) {
      const d = this.anim.droids[i];
      if (!d.active) continue;
      if (Math.hypot(d.x - p.x, d.z - p.z) < 12.0) {
        const b4 = lightSlot * 4;
        const b3 = lightSlot * 3;
        this.pointLightsFlat[b4] = d.x;
        this.pointLightsFlat[b4 + 1] = 0.85;
        this.pointLightsFlat[b4 + 2] = d.z;
        this.pointLightsFlat[b4 + 3] = 4.2;
        if (d.type === 0) {
          this.pointColorsFlat[b3] = 1.0;
          this.pointColorsFlat[b3 + 1] = 0.28;
          this.pointColorsFlat[b3 + 2] = 0.2;
        } else {
          this.pointColorsFlat[b3] = 0.85;
          this.pointColorsFlat[b3 + 1] = 0.25;
          this.pointColorsFlat[b3 + 2] = 1.0;
        }
        lightSlot++;
      }
    }

    // Add nearby glowing Plutonium Cores, Warp Pads, or Laser Doors
    const minTx = Math.max(0, Math.floor(p.x - 9));
    const maxTx = Math.min(GridConfig.WIDTH - 1, Math.ceil(p.x + 9));
    const minTz = Math.max(0, Math.floor(p.z - 7));
    const maxTz = Math.min(GridConfig.HEIGHT - 1, Math.ceil(p.z + 7));

    for (let tz = minTz; tz <= maxTz && lightSlot < 8; tz++) {
      for (let tx = minTx; tx <= maxTx && lightSlot < 8; tx++) {
        const idx = tz * GridConfig.WIDTH + tx;
        const tile = ram[0x0b00 + idx] & 0x1f;
        if (tile === TileType.PLUTONIUM && this.anim.isTileVisuallyPresent(ram, tx, tz)) {
          const b4 = lightSlot * 4;
          const b3 = lightSlot * 3;
          this.pointLightsFlat[b4] = tx;
          this.pointLightsFlat[b4 + 1] = 0.9;
          this.pointLightsFlat[b4 + 2] = tz;
          this.pointLightsFlat[b4 + 3] = 4.5 + 0.5 * Math.sin(t * 6.0);
          this.pointColorsFlat[b3] = 0.2;
          this.pointColorsFlat[b3 + 1] = 1.0;
          this.pointColorsFlat[b3 + 2] = 0.65;
          lightSlot++;
        } else if (tile === TileType.WARP_PAD || tile === TileType.EXIT_PORTAL) {
          const b4 = lightSlot * 4;
          const b3 = lightSlot * 3;
          this.pointLightsFlat[b4] = tx;
          this.pointLightsFlat[b4 + 1] = 1.0;
          this.pointLightsFlat[b4 + 2] = tz;
          this.pointLightsFlat[b4 + 3] = 4.8;
          this.pointColorsFlat[b3] = 0.25;
          this.pointColorsFlat[b3 + 1] = 0.9;
          this.pointColorsFlat[b3 + 2] = 1.0;
          lightSlot++;
        }
      }
    }
  }

  // ===========================================================================
  // 3D Orbital Showcase Backdrop for Title / Features / Hall of Fame
  // ===========================================================================

  _render3DShowcaseBackdrop() {
    const gl = this.gl;
    const t = performance.now() * 0.001;
    this.anim.time = t;

    gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
    gl.clearColor(0.02, 0.04, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const camRadius = 9.5;
    const eyeX = Math.sin(t * 0.32) * camRadius;
    const eyeY = 6.2 + Math.sin(t * 0.5) * 0.8;
    const eyeZ = Math.cos(t * 0.32) * camRadius;

    const aspect = this.webglCanvas.width / Math.max(1, this.webglCanvas.height);
    this._perspective(this.projMatrix, (42 * Math.PI) / 180, aspect, 0.5, 50.0);
    this._lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [0, 0.4, 0], [0, 1, 0]);
    this._multiplyMat4(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, this.viewProjMatrix);
    gl.uniform3f(this.uniforms.uCameraPos, eyeX, eyeY, eyeZ);
    gl.uniform3f(this.uniforms.uAmbientColor, 0.3, 0.38, 0.52);
    gl.uniform3f(this.uniforms.uSunDir, 0.4, 0.85, 0.35);
    gl.uniform3f(this.uniforms.uSunColor, 0.9, 0.95, 1.0);

    this.pointLightsFlat.fill(0);
    this.pointColorsFlat.fill(0);
    this.pointLightsFlat.set([0, 1.5, 0, 8.0, 3.0, 1.2, 3.0, 6.0], 0);
    this.pointColorsFlat.set([0.2, 1.0, 0.7, 0.9, 0.3, 1.0], 0);
    gl.uniform4fv(this.uniforms.uPointLights, this.pointLightsFlat);
    gl.uniform3fv(this.uniforms.uPointColors, this.pointColorsFlat);

    // Draw circular reactor platform in 3D
    for (let z = -5; z <= 5; z++) {
      for (let x = -5; x <= 5; x++) {
        const d = Math.hypot(x, z);
        if (d > 5.4) continue;
        this._drawMesh("floorTile", x, 0, z, 0, 1, 1, 1, [1, 1, 1], 0);
        if (d > 4.4) {
          this._drawMesh("wallBlock", x, 0, z, 0, 1, 1, 1, [0.7, 0.85, 1.0], 0.1);
        }
      }
    }

    // Centerpiece: Giant Rotating Plutonium Core + Radioactive Beacon + Prowling 3D Aliens
    this._drawMesh("warpPad", 0, 0, 0, t * 1.8, 1.8, 1.5, 1.8, [1, 1, 1], 0.35);
    this._drawMesh("plutoniumCore", 0, 0.25 + Math.sin(t * 3.0) * 0.1, 0, t * 2.2, 1.5, 1.5, 1.5, [1, 1, 1], 0.45);
    this._drawMesh("plutoniumBeacon", 0, 0.25 + Math.sin(t * 3.0) * 0.1, 0, -t * 3.2, 1.5, 1.5, 1.5, [1, 1, 1], 0.65);

    for (let i = 0; i < 4; i++) {
      const a = t * 1.1 + (i * Math.PI) / 2;
      const rx = Math.cos(a) * 3.1;
      const rz = Math.sin(a) * 3.1;
      this._renderCreepyAlien(
        { x: rx, z: rz, type: i % 2, facingAngle: a + Math.PI * 0.5 },
        i,
        t
      );
    }
  }

  // ===========================================================================
  // Low-Level WebGL Draw & Matrix Helpers
  // ===========================================================================

  _drawMesh(meshName, tx, ty, tz, rotY, sx, sy, sz, tint, emissiveBoost) {
    const mesh = this.gpuMeshes[meshName];
    if (!mesh) return;
    const gl = this.gl;

    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const m = this.modelMatrix;
    m[0] = c * sx;  m[1] = 0;  m[2] = -s * sx; m[3] = 0;
    m[4] = 0;       m[5] = sy; m[6] = 0;       m[7] = 0;
    m[8] = s * sz;  m[9] = 0;  m[10] = c * sz; m[11] = 0;
    m[12] = tx;     m[13] = ty; m[14] = tz;    m[15] = 1;

    gl.uniformMatrix4fv(this.uniforms.uModel, false, m);
    gl.uniform3f(this.uniforms.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(this.uniforms.uEmissiveBoost, emissiveBoost);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    const stride = 10 * 4;
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.aNormal);
    gl.vertexAttribPointer(this.attribs.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride, 6 * 4);

    gl.enableVertexAttribArray(this.attribs.aEmissive);
    gl.vertexAttribPointer(this.attribs.aEmissive, 1, gl.FLOAT, false, stride, 9 * 4);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  /**
   * Draws a 3D mesh with full 3-axis Euler rotation (rx, ry, rz) for tumbling 3D explosion debris & fireballs.
   */
  _drawMesh3DRot(meshName, tx, ty, tz, rx, ry, rz, sx, sy, sz, tint, emissiveBoost) {
    const mesh = this.gpuMeshes[meshName];
    if (!mesh) return;
    const gl = this.gl;

    const cx = Math.cos(rx), sxr = Math.sin(rx);
    const cy = Math.cos(ry), syr = Math.sin(ry);
    const cz = Math.cos(rz), szr = Math.sin(rz);

    const m = this.modelMatrix;
    m[0] = cy * cz * sx;
    m[1] = (cx * szr + sxr * syr * cz) * sx;
    m[2] = (sxr * szr - cx * syr * cz) * sx;
    m[3] = 0;

    m[4] = -cy * szr * sy;
    m[5] = (cx * cz - sxr * syr * szr) * sy;
    m[6] = (sxr * cz + cx * syr * szr) * sy;
    m[7] = 0;

    m[8] = syr * sz;
    m[9] = -sxr * cy * sz;
    m[10] = cx * cy * sz;
    m[11] = 0;

    m[12] = tx;
    m[13] = ty;
    m[14] = tz;
    m[15] = 1;

    gl.uniformMatrix4fv(this.uniforms.uModel, false, m);
    gl.uniform3f(this.uniforms.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(this.uniforms.uEmissiveBoost, emissiveBoost);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    const stride = 10 * 4;
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.aNormal);
    gl.vertexAttribPointer(this.attribs.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride, 6 * 4);

    gl.enableVertexAttribArray(this.attribs.aEmissive);
    gl.vertexAttribPointer(this.attribs.aEmissive, 1, gl.FLOAT, false, stride, 9 * 4);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  _perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5);
    const nf = 1.0 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
  }

  _lookAt(out, eye, center, up) {
    let zx = eye[0] - center[0];
    let zy = eye[1] - center[1];
    let zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }

  _multiplyMat4(out, a, b) {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
  }
}


  // =========================================================================
  // Module: engine/InputController.js
  // =========================================================================
/**
 * src/engine/InputController.js
 * Clean Keyboard, Joystick & Atari Console Button Input Controller.
 */

const ATARI_AZ_KEYCODES = Object.freeze([
  0x3F, 0x15, 0x12, 0x3A, 0x2A, 0x38, 0x3D, 0x39, 0x0D, 0x01, 0x05, 0x00, 0x25,
  0x23, 0x08, 0x0A, 0x2F, 0x28, 0x3E, 0x2D, 0x0B, 0x10, 0x2E, 0x16, 0x2B, 0x17,
]);

const ATARI_09_KEYCODES = Object.freeze([
  0x32, 0x1F, 0x1E, 0x1A, 0x18, 0x1D, 0x1B, 0x33, 0x35, 0x30,
]);
class InputController {
  constructor(gameState) {
    this.state = gameState;
    this.pressedKeys = new Set();
    this.lastKeyCode = 0xFF;
    this.consoleState = 0x07;
    this.bindBrowserEvents();
  }

  isEditorModalActive() {
    if (typeof document === "undefined") return false;
    const modal = document.getElementById("editor-modal");
    return Boolean(modal && !modal.classList.contains("hidden"));
  }

  bindBrowserEvents() {
    if (typeof window === "undefined") return;

    window.addEventListener("keydown", (e) => {
      if (this.isEditorModalActive()) return;

      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "F2",
          "F3",
          "F4",
        ].includes(e.code)
      ) {
        if (document.activeElement && document.activeElement.tagName !== "SELECT") {
          e.preventDefault();
        }
      }
      this.pressedKeys.add(e.code);

      if (e.code === "F2") {
        this.consoleState = 0x05; // SELECT
      } else if (e.code === "F3") {
        this.consoleState = 0x03; // OPTION
      } else if (e.code === "F4") {
        this.consoleState = 0x06; // START
      }

      // In-game special keys: P = Pause ($21), K = Abort Life ($3F)
      if (e.code === "KeyP") {
        this.lastKeyCode = 0x21;
        this.state.ram[SystemAddressMap.CH_KEY] = 0x21;
      } else if (e.code === "KeyK") {
        this.lastKeyCode = 0x3F;
        this.state.ram[SystemAddressMap.CH_KEY] = 0x3F;
      }

      // Hall of Fame ($8F08) keyboard name entry ($91C8..$923D)
      const dlAddr = this.state.displayListAddress;
      if (
        dlAddr === DisplayListAddress[ScreenMode.HALL_OF_FAME] &&
        this.state.ram[0x05D5] === 0
      ) {
        if (e.code === "Enter") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x0C;
        } else if (e.code === "Backspace") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x34;
        } else if (e.code === "Space") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x21;
        } else if (e.code.startsWith("Key") && e.code.length === 4) {
          const chIdx = e.code.charCodeAt(3) - 65;
          if (chIdx >= 0 && chIdx < 26) {
            this.state.ram[SystemAddressMap.CH_KEY] = ATARI_AZ_KEYCODES[chIdx];
          }
        } else if (e.code.startsWith("Digit") && e.code.length === 6) {
          const dIdx = e.code.charCodeAt(5) - 48;
          if (dIdx >= 0 && dIdx < 10) {
            this.state.ram[SystemAddressMap.CH_KEY] = ATARI_09_KEYCODES[dIdx];
          }
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.pressedKeys.delete(e.code);
      if (e.code === "F2" || e.code === "F3" || e.code === "F4") {
        this.consoleState = 0x07;
      }
    });
  }

  readJoystickState() {
    let stick = 0x0F;
    if (this.pressedKeys.has("ArrowUp") || this.pressedKeys.has("KeyW")) stick &= ~0x01;
    if (this.pressedKeys.has("ArrowDown") || this.pressedKeys.has("KeyS")) stick &= ~0x02;
    if (this.pressedKeys.has("ArrowLeft") || this.pressedKeys.has("KeyA")) stick &= ~0x04;
    if (this.pressedKeys.has("ArrowRight") || this.pressedKeys.has("KeyD")) stick &= ~0x08;

    const strig =
      this.pressedKeys.has("Space") ||
      this.pressedKeys.has("ControlLeft") ||
      this.pressedKeys.has("ControlRight") ||
      this.pressedKeys.has("KeyZ") ||
      this.pressedKeys.has("KeyX")
        ? 0
        : 1;

    return { stick, strig, consol: this.consoleState & 0x07 };
  }

  updateHardwareInputRegisters() {
    const { stick, strig, consol } = this.readJoystickState();
    const ram = this.state.ram;
    ram[SystemAddressMap.STICK0] = stick;
    ram[0xD300] = (stick << 4) | (stick & 0x0F);
    ram[SystemAddressMap.STRIG0] = strig;
    ram[0xD010] = strig;
    ram[SystemAddressMap.CONSOL] = consol;
  }
}


  // =========================================================================
  // Module: engine/GameEngine.js
  // =========================================================================
/**
 * src/engine/GameEngine.js
 * Clean Game Execution Engine for Zone X.
 * Encapsulates screen lifecycle transitions, level unpacking, custom/bonus level injection,
 * VBI timing, automatic laser doors, enemy movement, and transition audio silencing.
 */

const INSTRUCTION_SET = Object.freeze({
  0x00: ["BRK", "imp", 1, 7], 0x01: ["ORA", "izx", 2, 6], 0x05: ["ORA", "zp", 2, 3],
  0x06: ["ASL", "zp", 2, 5],  0x08: ["PHP", "imp", 1, 3], 0x09: ["ORA", "imm", 2, 2],
  0x0A: ["ASL", "acc", 1, 2], 0x0D: ["ORA", "abs", 3, 4], 0x0E: ["ASL", "abs", 3, 6],
  0x10: ["BPL", "rel", 2, 2], 0x11: ["ORA", "izy", 2, 5], 0x15: ["ORA", "zpx", 2, 4],
  0x16: ["ASL", "zpx", 2, 6], 0x18: ["CLC", "imp", 1, 2], 0x19: ["ORA", "aby", 3, 4],
  0x1D: ["ORA", "abx", 3, 4], 0x1E: ["ASL", "abx", 3, 7], 0x20: ["JSR", "abs", 3, 6],
  0x21: ["AND", "izx", 2, 6], 0x24: ["BIT", "zp", 2, 3],  0x25: ["AND", "zp", 2, 3],
  0x26: ["ROL", "zp", 2, 5],  0x28: ["PLP", "imp", 1, 4], 0x29: ["AND", "imm", 2, 2],
  0x2A: ["ROL", "acc", 1, 2], 0x2C: ["BIT", "abs", 3, 4], 0x2D: ["AND", "abs", 3, 4],
  0x2E: ["ROL", "abs", 3, 6], 0x30: ["BMI", "rel", 2, 2], 0x31: ["AND", "izy", 2, 5],
  0x35: ["AND", "zpx", 2, 4], 0x36: ["ROL", "zpx", 2, 6], 0x38: ["SEC", "imp", 1, 2],
  0x39: ["AND", "aby", 3, 4], 0x3D: ["AND", "abx", 3, 4], 0x3E: ["ROL", "abx", 3, 7],
  0x40: ["RTI", "imp", 1, 6], 0x41: ["EOR", "izx", 2, 6], 0x45: ["EOR", "zp", 2, 3],
  0x46: ["LSR", "zp", 2, 5],  0x48: ["PHA", "imp", 1, 3], 0x49: ["EOR", "imm", 2, 2],
  0x4A: ["LSR", "acc", 1, 2], 0x4C: ["JMP", "abs", 3, 3], 0x4D: ["EOR", "abs", 3, 4],
  0x4E: ["LSR", "abs", 3, 6], 0x50: ["BVC", "rel", 2, 2], 0x51: ["EOR", "izy", 2, 5],
  0x55: ["EOR", "zpx", 2, 4], 0x56: ["LSR", "zpx", 2, 6], 0x58: ["CLI", "imp", 1, 2],
  0x59: ["EOR", "aby", 3, 4], 0x5D: ["EOR", "abx", 3, 4], 0x5E: ["LSR", "abx", 3, 7],
  0x60: ["RTS", "imp", 1, 6], 0x61: ["ADC", "izx", 2, 6], 0x65: ["ADC", "zp", 2, 3],
  0x66: ["ROR", "zp", 2, 5],  0x68: ["PLA", "imp", 1, 4], 0x69: ["ADC", "imm", 2, 2],
  0x6A: ["ROR", "acc", 1, 2], 0x6C: ["JMP", "ind", 3, 5], 0x6D: ["ADC", "abs", 3, 4],
  0x6E: ["ROR", "abs", 3, 6], 0x70: ["BVS", "rel", 2, 2], 0x71: ["ADC", "izy", 2, 5],
  0x75: ["ADC", "zpx", 2, 4], 0x76: ["ROR", "zpx", 2, 6], 0x78: ["SEI", "imp", 1, 2],
  0x79: ["ADC", "aby", 3, 4], 0x7D: ["ADC", "abx", 3, 4], 0x7E: ["ROR", "abx", 3, 7],
  0x81: ["STA", "izx", 2, 6], 0x84: ["STY", "zp", 2, 3],  0x85: ["STA", "zp", 2, 3],
  0x86: ["STX", "zp", 2, 3],  0x88: ["DEY", "imp", 1, 2], 0x8A: ["TXA", "imp", 1, 2],
  0x8C: ["STY", "abs", 3, 4], 0x8D: ["STA", "abs", 3, 4], 0x8E: ["STX", "abs", 3, 4],
  0x90: ["BCC", "rel", 2, 2], 0x91: ["STA", "izy", 2, 6], 0x94: ["STY", "zpx", 2, 4],
  0x95: ["STA", "zpx", 2, 4], 0x96: ["STX", "zpy", 2, 4], 0x98: ["TYA", "imp", 1, 2],
  0x99: ["STA", "aby", 3, 5], 0x9A: ["TXS", "imp", 1, 2], 0x9D: ["STA", "abx", 3, 5],
  0xA0: ["LDY", "imm", 2, 2], 0xA1: ["LDA", "izx", 2, 6], 0xA2: ["LDX", "imm", 2, 2],
  0xA4: ["LDY", "zp", 2, 3],  0xA5: ["LDA", "zp", 2, 3],  0xA6: ["LDX", "zp", 2, 3],
  0xA8: ["TAY", "imp", 1, 2], 0xA9: ["LDA", "imm", 2, 2], 0xAA: ["TAX", "imp", 1, 2],
  0xAC: ["LDY", "abs", 3, 4], 0xAD: ["LDA", "abs", 3, 4], 0xAE: ["LDX", "abs", 3, 4],
  0xB0: ["BCS", "rel", 2, 2], 0xB1: ["LDA", "izy", 2, 5], 0xB4: ["LDY", "zpx", 2, 4],
  0xB5: ["LDA", "zpx", 2, 4], 0xB6: ["LDX", "zpy", 2, 4], 0xB8: ["CLV", "imp", 1, 2],
  0xB9: ["LDA", "aby", 3, 4], 0xBA: ["TSX", "imp", 1, 2], 0xBC: ["LDY", "abx", 3, 4],
  0xBD: ["LDA", "abx", 3, 4], 0xBE: ["LDX", "aby", 3, 4], 0xC0: ["CPY", "imm", 2, 2],
  0xC1: ["CMP", "izx", 2, 6], 0xC4: ["CPY", "zp", 2, 3],  0xC5: ["CMP", "zp", 2, 3],
  0xC6: ["DEC", "zp", 2, 5],  0xC8: ["INY", "imp", 1, 2], 0xC9: ["CMP", "imm", 2, 2],
  0xCA: ["DEX", "imp", 1, 2], 0xCC: ["CPY", "abs", 3, 4], 0xCD: ["CMP", "abs", 3, 4],
  0xCE: ["DEC", "abs", 3, 6], 0xD0: ["BNE", "rel", 2, 2], 0xD1: ["CMP", "izy", 2, 5],
  0xD5: ["CMP", "zpx", 2, 4], 0xD6: ["DEC", "zpx", 2, 6], 0xD8: ["CLD", "imp", 1, 2],
  0xD9: ["CMP", "aby", 3, 4], 0xDD: ["CMP", "abx", 3, 4], 0xDE: ["DEC", "abx", 3, 7],
  0xE0: ["CPX", "imm", 2, 2], 0xE1: ["SBC", "izx", 2, 6], 0xE4: ["CPX", "zp", 2, 3],
  0xE5: ["SBC", "zp", 2, 3],  0xE6: ["INC", "zp", 2, 5],  0xE8: ["INX", "imp", 1, 2],
  0xE9: ["SBC", "imm", 2, 2], 0xEA: ["NOP", "imp", 1, 2], 0xEC: ["CPX", "abs", 3, 4],
  0xED: ["SBC", "abs", 3, 4], 0xEE: ["INC", "abs", 3, 6], 0xF0: ["BEQ", "rel", 2, 2],
  0xF1: ["SBC", "izy", 2, 5], 0xF5: ["SBC", "zpx", 2, 4], 0xF6: ["INC", "zpx", 2, 6],
  0xF8: ["SED", "imp", 1, 2], 0xF9: ["SBC", "aby", 3, 4], 0xFD: ["SBC", "abx", 3, 4],
  0xFE: ["INC", "abx", 3, 7],
});

const TRANSITION_ENTRY_POINTS = new Set([
  0x6054, // Title Screen Init
  0x60B3, // Exit Title -> Features Showcase
  0x9325, // Features Showcase Init
  0x6580, // Disable VBI / Exit Features -> In-Game
  0x60B9, // New Game Init
  0x60E5, // Zone Unpack Init
  0x6113, // Zone Load / Next Zone Init
  0x62D7, // Player Respawn After Life Loss
  0x6491, // Hall of Fame / Game Over Init
  0x654D, // Zone Exit Portal / Level Complete
]);
class GameEngine {
  constructor(gameState, assetBundle) {
    this.state = gameState;
    this.ram = gameState.ram;
    this.bundle = assetBundle;
    this.activeCustomZone = null;

    this.rom3c80 = null;
    if (assetBundle && assetBundle.ram_3c80_bfff_b64) {
      const binStr = atob(assetBundle.ram_3c80_bfff_b64);
      this.rom3c80 = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        this.rom3c80[i] = binStr.charCodeAt(i) & 0xFF;
      }
    }

    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xFF;
    this.pc = 0x6000;
    this.flagC = 0;
    this.flagZ = 1;
    this.flagI = 0;
    this.flagD = 0;
    this.flagV = 0;
    this.flagN = 0;
    this.cycles = 0;
    this.stopped = false;
    this.rng = 0x1FFFF;
    this.hofInitialized = false;
    this.totalCycles = 0;
    this.frameCycles = 0;
    this.lastFrameTotalCycles = 27000;
    this.recordingPokey = false;
    this.pokeyEvents = [];
    this.transitionOccurred = false;
  }

  loadBaseBinary() {
    if (!this.rom3c80) return;
    for (let i = 0; i < this.rom3c80.length && 0x3C80 + i < 0xC000; i++) {
      this.ram[0x3C80 + i] = this.rom3c80[i];
    }

    for (let i = 0; i < 6; i++) {
      this.ram[0xCFFA + i] = 0x00;
      this.ram[0xFFFA + i] = 0xE4;
    }

    this.ram[0x00C0] = 0x22;
    this.ram[0x00C1] = 0x34;
    this.ram[0x00C2] = 0x80;
    this.ram[0x00C3] = 0x38;
    this.ram[0x3E99] = 0xEA;
    this.ram[0x7F90] = 0xEA;
    this.ram[0x96AD] = 0xEA;

    this.ram[0xE45C] = 0x60;
    this.ram[0xE462] = 0x60;
    this.ram[0xE465] = 0x60;

    this.ram[SystemAddressMap.CONSOL] = 0x07;
    this.ram[SystemAddressMap.STICK0] = 0x0F;
    this.ram[SystemAddressMap.STRIG0] = 0x01;
    this.ram[SystemAddressMap.CH_KEY] = 0xFF;
    this.silencePokeyAndSfx();

    for (let i = 0; i < 1024; i++) {
      this.ram[0x1800 + i] = this.ram[0x706C + i];
    }

    if (!this.hofInitialized) {
      this.hofInitialized = true;
      this.callSubroutine(0x8F36, 5000);
    }
  }

  silencePokeyAndSfx() {
    for (let i = 0; i < 16; i++) {
      this.ram[SystemAddressMap.POKEY_BASE + i] = 0x00;
    }
    this.ram[SystemAddressMap.POKEY_BASE + 0x0F] = 0x03;

    for (
      let addr = SystemAddressMap.SFX_STATE_START;
      addr <= SystemAddressMap.SFX_STATE_END;
      addr++
    ) {
      this.ram[addr] = 0x00;
    }

    this.pokeyEvents = [];
    if (this.recordingPokey) {
      for (let i = 0; i < 9; i++) {
        this.pokeyEvents.push({
          cycle: this.frameCycles,
          addr: SystemAddressMap.POKEY_BASE + i,
          val: 0x00,
        });
      }
    }
  }

  getP() {
    return (
      (this.flagN ? 0x80 : 0) |
      (this.flagV ? 0x40 : 0) |
      0x20 |
      (this.flagD ? 0x08 : 0) |
      (this.flagI ? 0x04 : 0) |
      (this.flagZ ? 0x02 : 0) |
      (this.flagC ? 0x01 : 0)
    );
  }

  setP(val) {
    this.flagN = val & 0x80 ? 1 : 0;
    this.flagV = val & 0x40 ? 1 : 0;
    this.flagD = val & 0x08 ? 1 : 0;
    this.flagI = val & 0x04 ? 1 : 0;
    this.flagZ = val & 0x02 ? 1 : 0;
    this.flagC = val & 0x01 ? 1 : 0;
  }

  setZN(val) {
    val &= 0xFF;
    this.flagZ = val === 0 ? 1 : 0;
    this.flagN = val & 0x80 ? 1 : 0;
  }

  push(val) {
    this.ram[0x0100 + (this.sp & 0xFF)] = val & 0xFF;
    this.sp = (this.sp - 1) & 0xFF;
  }

  pull() {
    this.sp = (this.sp + 1) & 0xFF;
    return this.ram[0x0100 + (this.sp & 0xFF)];
  }

  read8(addr) {
    addr &= 0xFFFF;
    if (addr === 0xD20A) {
      for (let i = 0; i < 8; i++) {
        const bit = ((this.rng & 1) ^ ((this.rng >> 5) & 1)) & 1;
        this.rng = (this.rng >> 1) | (bit << 16);
      }
      return this.rng & 0xFF;
    }
    if (addr === 0xD004) return (this.state.collisionP0PF ?? this.ram[0xD004]) & 0x0F;
    if (addr === 0xD005) return (this.state.collisionP1PF ?? this.ram[0xD005]) & 0x0F;
    if (addr === 0xD010) return this.ram[SystemAddressMap.STRIG0] & 0x01;
    if (addr === 0xD300) return this.ram[SystemAddressMap.STICK0] & 0x0F;
    if (addr === 0xD40B) return ((this.frameCycles / 228) | 0) & 0xFF;
    return this.ram[addr];
  }

  write8(addr, val) {
    addr &= 0xFFFF;
    val &= 0xFF;
    if (addr === 0xD01E) {
      this.state.collisionP0PF = 0;
      this.state.collisionP1PF = 0;
    } else if (this.recordingPokey && addr >= 0xD200 && addr <= 0xD20F) {
      this.pokeyEvents.push({
        cycle: this.frameCycles,
        addr,
        val,
      });
    }
    this.ram[addr] = val;
  }

  read16(addr) {
    return this.read8(addr) | (this.read8((addr + 1) & 0xFFFF) << 8);
  }

  resolveAddr(mode, pc) {
    const b1 = this.read8(pc + 1);
    switch (mode) {
      case "imm":
        return (pc + 1) & 0xFFFF;
      case "zp":
        return b1;
      case "zpx":
        return (b1 + this.x) & 0xFF;
      case "zpy":
        return (b1 + this.y) & 0xFF;
      case "abs":
        return b1 | (this.read8(pc + 2) << 8);
      case "abx":
        return ((b1 | (this.read8(pc + 2) << 8)) + this.x) & 0xFFFF;
      case "aby":
        return ((b1 | (this.read8(pc + 2) << 8)) + this.y) & 0xFFFF;
      case "izx": {
        const zp = (b1 + this.x) & 0xFF;
        return this.read8(zp) | (this.read8((zp + 1) & 0xFF) << 8);
      }
      case "izy": {
        const base = this.read8(b1) | (this.read8((b1 + 1) & 0xFF) << 8);
        return (base + this.y) & 0xFFFF;
      }
      case "ind": {
        const ptr = b1 | (this.read8(pc + 2) << 8);
        const hiAddr = (ptr & 0xFF00) | ((ptr + 1) & 0xFF);
        return this.read8(ptr) | (this.read8(hiAddr) << 8);
      }
      case "rel": {
        const rel = b1 >= 128 ? b1 - 256 : b1;
        return (pc + 2 + rel) & 0xFFFF;
      }
      default:
        return 0;
    }
  }

  step() {
    if (this.stopped) return 0;
    const pc = this.pc;

    if (TRANSITION_ENTRY_POINTS.has(pc)) {
      this.silencePokeyAndSfx();
      this.transitionOccurred = true;
    }

    if (pc === 0xE45C) {
      if (this.a === 0x07) {
        this.ram[0x0224] = this.y & 0xFF;
        this.ram[0x0225] = this.x & 0xFF;
      } else if (this.a === 0x06) {
        this.ram[0x0222] = this.y & 0xFF;
        this.ram[0x0223] = this.x & 0xFF;
      }
      const lo = this.pull();
      const hi = this.pull();
      this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
      this.cycles += 6;
      return 6;
    }

    if (pc === 0xE462 || pc === 0xE465) {
      if (pc === 0xE465) {
        this.silencePokeyAndSfx();
      }
      const lo = this.pull();
      const hi = this.pull();
      this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
      this.cycles += 6;
      return 6;
    }

    const op = this.read8(pc);
    const entry = INSTRUCTION_SET[op];
    if (!entry) {
      this.pc = (pc + 1) & 0xFFFF;
      this.cycles += 2;
      return 2;
    }

    const [mnem, mode, length, baseCycles] = entry;
    const addr = mode !== "imp" && mode !== "acc" ? this.resolveAddr(mode, pc) : 0;
    this.pc = (pc + length) & 0xFFFF;
    this.cycles += baseCycles;
    this.totalCycles += baseCycles;
    this.frameCycles += baseCycles;

    switch (mnem) {
      case "LDA":
        this.a = this.read8(addr);
        this.setZN(this.a);
        break;
      case "LDX":
        this.x = this.read8(addr);
        this.setZN(this.x);
        break;
      case "LDY":
        this.y = this.read8(addr);
        this.setZN(this.y);
        break;
      case "STA":
        this.write8(addr, this.a);
        break;
      case "STX":
        this.write8(addr, this.x);
        break;
      case "STY":
        this.write8(addr, this.y);
        break;
      case "TAX":
        this.x = this.a;
        this.setZN(this.x);
        break;
      case "TAY":
        this.y = this.a;
        this.setZN(this.y);
        break;
      case "TXA":
        this.a = this.x;
        this.setZN(this.a);
        break;
      case "TYA":
        this.a = this.y;
        this.setZN(this.a);
        break;
      case "TSX":
        this.x = this.sp;
        this.setZN(this.x);
        break;
      case "TXS":
        this.sp = this.x;
        break;
      case "INX":
        this.x = (this.x + 1) & 0xFF;
        this.setZN(this.x);
        break;
      case "INY":
        this.y = (this.y + 1) & 0xFF;
        this.setZN(this.y);
        break;
      case "DEX":
        this.x = (this.x - 1) & 0xFF;
        this.setZN(this.x);
        break;
      case "DEY":
        this.y = (this.y - 1) & 0xFF;
        this.setZN(this.y);
        break;
      case "INC": {
        const v = (this.read8(addr) + 1) & 0xFF;
        this.write8(addr, v);
        this.setZN(v);
        break;
      }
      case "DEC": {
        const v = (this.read8(addr) - 1) & 0xFF;
        this.write8(addr, v);
        this.setZN(v);
        break;
      }
      case "AND":
        this.a &= this.read8(addr);
        this.setZN(this.a);
        break;
      case "ORA":
        this.a |= this.read8(addr);
        this.setZN(this.a);
        break;
      case "EOR":
        this.a ^= this.read8(addr);
        this.setZN(this.a);
        break;
      case "BIT": {
        const v = this.read8(addr);
        this.flagZ = (this.a & v) === 0 ? 1 : 0;
        this.flagN = v & 0x80 ? 1 : 0;
        this.flagV = v & 0x40 ? 1 : 0;
        break;
      }
      case "CMP":
        this.compare(this.a, this.read8(addr));
        break;
      case "CPX":
        this.compare(this.x, this.read8(addr));
        break;
      case "CPY":
        this.compare(this.y, this.read8(addr));
        break;
      case "ADC":
        this.adc(this.read8(addr));
        break;
      case "SBC":
        this.sbc(this.read8(addr));
        break;
      case "ASL":
        if (mode === "acc") {
          this.flagC = (this.a >> 7) & 1;
          this.a = (this.a << 1) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          this.flagC = (v >> 7) & 1;
          v = (v << 1) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "LSR":
        if (mode === "acc") {
          this.flagC = this.a & 1;
          this.a = (this.a >> 1) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          this.flagC = v & 1;
          v = (v >> 1) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "ROL":
        if (mode === "acc") {
          const oldC = this.flagC;
          this.flagC = (this.a >> 7) & 1;
          this.a = ((this.a << 1) | oldC) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          const oldC = this.flagC;
          this.flagC = (v >> 7) & 1;
          v = ((v << 1) | oldC) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "ROR":
        if (mode === "acc") {
          const oldC = this.flagC;
          this.flagC = this.a & 1;
          this.a = ((this.a >> 1) | (oldC << 7)) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          const oldC = this.flagC;
          this.flagC = v & 1;
          v = ((v >> 1) | (oldC << 7)) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "PHA":
        this.push(this.a);
        break;
      case "PLA":
        this.a = this.pull();
        this.setZN(this.a);
        break;
      case "PHP":
        this.push(this.getP() | 0x10);
        break;
      case "PLP":
        this.setP(this.pull());
        break;
      case "CLC":
        this.flagC = 0;
        break;
      case "SEC":
        this.flagC = 1;
        break;
      case "CLI":
        this.flagI = 0;
        break;
      case "SEI":
        this.flagI = 1;
        break;
      case "CLV":
        this.flagV = 0;
        break;
      case "CLD":
        this.flagD = 0;
        break;
      case "SED":
        this.flagD = 1;
        break;
      case "JMP":
        this.pc = addr;
        break;
      case "JSR": {
        const ret = (this.pc - 1) & 0xFFFF;
        this.push((ret >> 8) & 0xFF);
        this.push(ret & 0xFF);
        this.pc = addr;
        break;
      }
      case "RTS": {
        const lo = this.pull();
        const hi = this.pull();
        this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
        break;
      }
      case "RTI": {
        this.setP(this.pull());
        const lo = this.pull();
        const hi = this.pull();
        this.pc = (hi << 8) | lo;
        break;
      }
      case "BCC":
        if (!this.flagC) this.pc = addr;
        break;
      case "BCS":
        if (this.flagC) this.pc = addr;
        break;
      case "BEQ":
        if (this.flagZ) this.pc = addr;
        break;
      case "BNE":
        if (!this.flagZ) this.pc = addr;
        break;
      case "BMI":
        if (this.flagN) this.pc = addr;
        break;
      case "BPL":
        if (!this.flagN) this.pc = addr;
        break;
      case "BVC":
        if (!this.flagV) this.pc = addr;
        break;
      case "BVS":
        if (this.flagV) this.pc = addr;
        break;
      case "NOP":
        break;
      case "BRK":
        this.stopped = true;
        break;
    }

    return baseCycles;
  }

  compare(reg, val) {
    const diff = reg - val;
    this.flagC = reg >= val ? 1 : 0;
    this.setZN(diff & 0xFF);
  }

  adc(v) {
    if (this.flagD) {
      let lo = (this.a & 0x0F) + (v & 0x0F) + this.flagC;
      let cLo = 0;
      if (lo > 9) {
        lo += 6;
        cLo = 1;
      }
      let hi = (this.a >> 4) + (v >> 4) + cLo;
      let cHi = 0;
      if (hi > 9) {
        hi += 6;
        cHi = 1;
      }
      this.flagC = cHi;
      this.a = ((hi & 0x0F) << 4) | (lo & 0x0F);
      this.setZN(this.a);
    } else {
      const sum = this.a + v + this.flagC;
      this.flagV = (~(this.a ^ v) & (this.a ^ sum) & 0x80) !== 0 ? 1 : 0;
      this.flagC = sum > 0xFF ? 1 : 0;
      this.a = sum & 0xFF;
      this.setZN(this.a);
    }
  }

  sbc(v) {
    if (this.flagD) {
      const borrow = this.flagC ? 0 : 1;
      let lo = (this.a & 0x0F) - (v & 0x0F) - borrow;
      let bLo = 0;
      if (lo < 0) {
        lo -= 6;
        bLo = 1;
      }
      let hi = (this.a >> 4) - (v >> 4) - bLo;
      let bHi = 0;
      if (hi < 0) {
        hi -= 6;
        bHi = 1;
      }
      this.flagC = bHi ? 0 : 1;
      this.a = ((hi & 0x0F) << 4) | (lo & 0x0F);
      this.setZN(this.a);
    } else {
      const diff = this.a - v - (this.flagC ? 0 : 1);
      this.flagV = ((this.a ^ v) & (this.a ^ diff) & 0x80) !== 0 ? 1 : 0;
      this.flagC = diff < 0 ? 0 : 1;
      this.a = diff & 0xFF;
      this.setZN(this.a);
    }
  }

  callSubroutine(targetAddr, maxSteps = 200000) {
    const savedA = this.a;
    const savedX = this.x;
    const savedY = this.y;
    const savedP = this.getP();
    const savedPC = this.pc;
    const savedSP = this.sp;

    const ret = (0xE462 - 1) & 0xFFFF;
    this.push((ret >> 8) & 0xFF);
    this.push(ret & 0xFF);
    this.pc = targetAddr & 0xFFFF;
    this.stopped = false;

    let steps = 0;
    while (!this.stopped && this.sp !== savedSP && steps < maxSteps) {
      this.step();
      steps++;
    }

    this.a = savedA;
    this.x = savedX;
    this.y = savedY;
    this.setP(savedP);
    this.pc = savedPC;
    this.sp = savedSP;
    this.stopped = false;
    return steps;
  }

  syncShadowRegisters() {
    this.ram[0xD400] = this.ram[0x022F];
    this.ram[0xD402] = this.ram[SystemAddressMap.DLIST_PTR_LO];
    this.ram[0xD403] = this.ram[SystemAddressMap.DLIST_PTR_HI];
    this.ram[0xD409] = this.ram[0x02F4];
    this.ram[0xD01B] = this.ram[0x026F];
    for (let i = 0; i < 4; i++) {
      this.ram[0xD012 + i] = this.ram[0x02C0 + i];
    }
    for (let i = 0; i < 5; i++) {
      this.ram[0xD016 + i] = this.ram[SystemAddressMap.COLOR0_SHADOW + i];
    }
  }

  runVbi() {
    const nmiEn = this.ram[0xD40E];
    if ((nmiEn & 0x40) === 0) {
      this.syncShadowRegisters();
      return;
    }
    const vbiAddr = this.ram[0x0224] | (this.ram[0x0225] << 8);
    if (vbiAddr !== 0 && vbiAddr !== 0xE462) {
      this.callSubroutine(vbiAddr, 30000);
    }
    this.syncShadowRegisters();
  }

  runFrame(mainCycles = 23500) {
    this.frameCycles = 0;
    this.pokeyEvents = [];
    this.recordingPokey = true;
    this.transitionOccurred = false;

    const prevZoneIdx = this.ram[SystemAddressMap.SELECTED_ZONE_IDX];
    let used = 0;
    let guard = 0;
    while (!this.stopped && used < mainCycles && guard < 25000) {
      if (this.pc === 0x60E5) {
        let unpackSteps = 0;
        while (!this.stopped && this.pc !== 0x6447 && unpackSteps < 1000000) {
          this.step();
          unpackSteps++;
        }
        this.state.collisionP0PF = 0;
        this.state.collisionP1PF = 0;
        if (this.activeCustomZone && this.ram[SystemAddressMap.SELECTED_ZONE_IDX] === prevZoneIdx) {
          this.applyCustomZoneOverlay(this.activeCustomZone);
        } else {
          this.activeCustomZone = null;
        }
        break;
      }
      if (this.pc === 0x62D7 && this.activeCustomZone) {
        let respawnSteps = 0;
        while (!this.stopped && this.pc !== 0x6447 && respawnSteps < 50000) {
          this.step();
          respawnSteps++;
        }
        this.state.collisionP0PF = 0;
        this.state.collisionP1PF = 0;
        if (Array.isArray(this.activeCustomZone.colors) && this.activeCustomZone.colors.length >= 4) {
          for (let i = 0; i < 4; i++) {
            this.ram[SystemAddressMap.COLOR0_SHADOW + i] = this.activeCustomZone.colors[i] & 0xFF;
          }
        }
        const zNum = this.activeCustomZone.zone || 13;
        const bcdZone = ((((zNum / 10) | 0) << 4) | (zNum % 10)) & 0xFF;
        this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
        this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
        break;
      }
      used += this.step();
      guard++;
    }
    this.runVbi();

    this.recordingPokey = false;
    this.lastFrameTotalCycles = Math.max(1, this.frameCycles);
  }

  startZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = true) {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[SystemAddressMap.SELECTED_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.ACTIVE_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] = this.ram[0xA3CC + zIdx];
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.SELECTED_DIFFICULTY] = diffIdx;
    this.ram[SystemAddressMap.ACTIVE_DIFFICULTY] = diffIdx;
    this.ram[0x05A9] = 0x00;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = resetLivesAndScore ? 0x60B9 : 0x60E5;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x6447 && steps < 1000000) {
      this.step();
      steps++;
    }
    this.state.collisionP0PF = 0;
    this.state.collisionP1PF = 0;
    this.silencePokeyAndSfx();
    this.ram[SystemAddressMap.DOOR_TIMER_A] = 0x16;
    this.ram[SystemAddressMap.DOOR_TIMER_B] = 0x0C;
    this.runVbi();
    this.runVbi();
  }

  startCustomZone(zoneData, optionLevel = 1, resetLivesAndScore = false) {
    this.startZone(1, optionLevel, resetLivesAndScore);
    this.activeCustomZone = zoneData;
    this.applyCustomZoneOverlay(zoneData);
  }

  applyCustomZoneOverlay(zoneData) {
    if (!zoneData || !zoneData.playfield_bytes) return;
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;

    for (let r = 0; r < 64; r++) {
      const rowBase = 0x1C00 + r * GridConfig.PLAYFIELD_ROW_STRIDE;
      this.ram[rowBase + 0] = 0x81;
      this.ram[rowBase + 1] = 0x81;
      this.ram[rowBase + 126] = 0x81;
      this.ram[rowBase + 127] = 0x81;
    }

    const writeTileToRam = (tx, ty, tileId) => {
      if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
      const t = tileId & 0x1F;
      this.ram[0x0B00 + ty * W + tx] = t;
      const mb = 0x6D42 + t * 4;
      const charCol = (tx + 1) * 2;
      const r0 = 0x1C00 + ty * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
      const r1 = 0x1C00 + (ty * 2 + 1) * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
      this.ram[r0] = this.ram[mb];
      this.ram[r0 + 1] = this.ram[mb + 1];
      this.ram[r1] = this.ram[mb + 2];
      this.ram[r1 + 1] = this.ram[mb + 3];
    };

    let plutoniumCount = 0;
    let containerCount = 0;
    let doorCount = 0;
    const robots = [];

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const rawTile = zoneData.playfield_bytes[ty * W + tx] & 0x1F;
        if (rawTile === TileType.ALIEN_DROID_NORMAL || rawTile === TileType.ALIEN_DROID_FAST) {
          writeTileToRam(tx, ty, TileType.FLOOR);
          robots.push({
            x: tx,
            y: ty,
            type: rawTile === TileType.ALIEN_DROID_NORMAL ? 0 : 1,
          });
        } else {
          writeTileToRam(tx, ty, rawTile);
          if (rawTile === TileType.PLUTONIUM) plutoniumCount++;
          else if (rawTile === TileType.CONTAINER) containerCount++;
          else if (rawTile === TileType.DOOR_MARKER_A || rawTile === TileType.LOCKED_DOOR) {
            doorCount++;
          }
        }
      }
    }

    const px = zoneData.player_start ? zoneData.player_start.x : 30;
    const py = zoneData.player_start ? zoneData.player_start.y : 15;
    const ex = zoneData.exit_pos ? zoneData.exit_pos.x : 31;
    const ey = zoneData.exit_pos ? zoneData.exit_pos.y : 15;

    writeTileToRam(px, py, TileType.PLAYER_START);
    writeTileToRam(ex, ey, TileType.EXIT_PORTAL);

    const startOffset = (py * W + px) & 0xFFFF;
    const exitOffset = (ey * W + ex) & 0xFFFF;
    const charX = ((px + 1) * 2) & 0xFF;
    const charY = (py * 2) & 0xFF;

    const lmsX = charX < 0x16 ? 0 : Math.min(0x54, charX - 0x14);
    const lmsY = charY < 0x0C ? 0 : Math.min(0x28, charY - 0x0A);
    const hpos = (40 + (charX - lmsX) * 4) & 0xFF;
    const pmgY = (32 + (charY - lmsY) * 8) & 0xFF;

    this.ram[0x05B4] = startOffset & 0xFF;
    this.ram[0x05B5] = (startOffset >> 8) & 0xFF;
    this.ram[0x05B6] = hpos;
    this.ram[0x05B7] = pmgY;
    this.ram[0x05B8] = exitOffset & 0xFF;
    this.ram[0x05B9] = (exitOffset >> 8) & 0xFF;

    const exitScr = (0x1C00 + ey * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + (ex + 1) * 2) & 0xFFFF;
    this.ram[0x05BA] = exitScr & 0xFF;
    this.ram[0x05BB] = (exitScr >> 8) & 0xFF;

    this.ram[0x055B] = startOffset & 0xFF;
    this.ram[0x055C] = (startOffset >> 8) & 0xFF;
    this.ram[0x055D] = hpos;
    this.ram[0xD000] = hpos;
    this.ram[0xD001] = hpos;
    this.ram[0x055E] = pmgY;
    this.ram[SystemAddressMap.PLAYER_CHAR_X] = charX;
    this.ram[SystemAddressMap.PLAYER_CHAR_Y] = charY;
    this.ram[0x0568] = 0x00;
    this.ram[0x056B] = 0x08;
    this.ram[0x056C] = 0x00;
    this.ram[SystemAddressMap.HSCROL] = 0x08;
    this.ram[SystemAddressMap.VSCROL] = 0x00;

    this.ram[SystemAddressMap.PLUTONIUM_REMAINING] = Math.max(1, plutoniumCount);
    this.ram[SystemAddressMap.CONTAINERS_REMAINING] = Math.max(1, containerCount);
    this.ram[SystemAddressMap.DOOR_COUNT] = doorCount & 0xFF;
    this.ram[0x05C1] = 0x09;

    if (Array.isArray(zoneData.colors) && zoneData.colors.length >= 4) {
      for (let i = 0; i < 4; i++) {
        this.ram[SystemAddressMap.COLOR0_SHADOW + i] = zoneData.colors[i] & 0xFF;
      }
    }

    for (let i = 0; i < 0x0300; i++) {
      this.ram[0x0600 + i] = 0;
    }
    this.ram[0x05A3] = 0x00;
    this.ram[0x05A4] = 0x00;
    this.ram[0x05A5] = 0xFF;
    this.ram[0x05A6] = 0xFF;
    const maxRobots = Math.min(GridConfig.MAX_MOVING_ENEMIES, robots.length);
    this.ram[SystemAddressMap.ACTIVE_ROBOT_COUNT] = maxRobots;
    for (let i = 0; i < maxRobots; i++) {
      const r = robots[i];
      const base = 0x0600 + i * 8;
      const rCharX = ((r.x + 1) * 2) & 0xFF;
      const rCharY = (r.y * 2) & 0xFF;
      const scrPtr = (0x1C00 + rCharY * GridConfig.PLAYFIELD_ROW_STRIDE + rCharX) & 0xFFFF;
      const etype = r.type & 1;

      this.ram[base + 0] = etype;
      this.ram[base + 1] = 1;
      this.ram[base + 2] = 0xFF;
      this.ram[base + 3] = rCharX;
      this.ram[base + 4] = rCharY;
      this.ram[base + 5] = scrPtr & 0xFF;
      this.ram[base + 6] = (scrPtr >> 8) & 0xFF;
      this.ram[base + 7] = 0;

      const cBase = etype === 0 ? 0xC8 : 0x4C;
      this.ram[scrPtr] = cBase;
      this.ram[scrPtr + 1] = cBase + 1;
      this.ram[scrPtr + 128] = cBase + 2;
      this.ram[scrPtr + 129] = cBase + 3;
    }

    const warps = Array.isArray(zoneData.warps) ? zoneData.warps : [];
    const internalZ = this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] & 0x0F;
    const warpTableAddr = 0x0900;
    this.ram[0xA3D8 + internalZ * 2] = warpTableAddr & 0xFF;
    this.ram[0xA3D8 + internalZ * 2 + 1] = (warpTableAddr >> 8) & 0xFF;
    this.ram[SystemAddressMap.WARP_COUNT] = warps.length & 0xFF;

    for (let w = 0; w < warps.length && w < GridConfig.MAX_WARP_GATES; w++) {
      const wp = warps[w];
      const sOff = (wp.src_y * W + wp.src_x) & 0xFFFF;
      const dOff = (wp.dst_y * W + wp.dst_x) & 0xFFFF;
      const dCharX = ((wp.dst_x + 1) * 2) & 0xFF;
      const dCharY = (wp.dst_y * 2) & 0xFF;
      const dLmsX = dCharX < 0x16 ? 0 : Math.min(0x54, dCharX - 0x14);
      const dLmsY = dCharY < 0x0C ? 0 : Math.min(0x28, dCharY - 0x0A);
      const dHpos = (40 + (dCharX - dLmsX) * 4) & 0xFF;
      const dPmgY = (32 + (dCharY - dLmsY) * 8) & 0xFF;

      const p = warpTableAddr + w * 6;
      this.ram[p + 0] = sOff & 0xFF;
      this.ram[p + 1] = (sOff >> 8) & 0xFF;
      this.ram[p + 2] = dOff & 0xFF;
      this.ram[p + 3] = (dOff >> 8) & 0xFF;
      this.ram[p + 4] = dHpos;
      this.ram[p + 5] = dPmgY;
    }

    const zNum = zoneData.zone || 13;
    const bcdZone = ((((zNum / 10) | 0) << 4) | (zNum % 10)) & 0xFF;
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;

    this.callSubroutine(0x43BF, 5000);
    this.callSubroutine(0x435F, 5000);
    this.callSubroutine(0x4462, 5000);
    this.callSubroutine(0x47A0, 5000);
    this.state.collisionP0PF = 0;
    this.state.collisionP1PF = 0;
    this.silencePokeyAndSfx();
    this.runVbi();
    this.runVbi();
  }

  bootTitleScreen(zoneNumber = 1, optionLevel = 1) {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[SystemAddressMap.SELECTED_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.ACTIVE_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] = this.ram[0xA3CC + zIdx];
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.SELECTED_DIFFICULTY] = diffIdx;
    this.ram[SystemAddressMap.ACTIVE_DIFFICULTY] = diffIdx;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x6054;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x75F2 && steps < 250000) {
      this.step();
      steps++;
    }
    this.runVbi();
  }

  bootFeaturesScreen() {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x60B3;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x9368 && steps < 250000) {
      this.step();
      steps++;
    }
    this.silencePokeyAndSfx();
    this.runVbi();
    this.runVbi();
  }

  bootHallOfFameScreen() {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    this.ram[0x05D5] = 0x01;
    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x6491;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x75F2 && steps < 100000) {
      this.step();
      steps++;
    }
    this.runVbi();
  }
}


  // =========================================================================
  // Module: editor/LevelEditorController.js
  // =========================================================================
/**
 * src/editor/LevelEditorController.js
 * Clean MVC Level Editor Controller for Zone X.
 * Uses LevelMap, EDITOR_PALETTE_CATALOG, and TileType enumerations
 * for structured 62x32 level design, procedural generation, and JSON Import/Export.
 */



const STORAGE_KEY = "zonex_custom_levels_v1";
class LevelEditorController {
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


  // =========================================================================
  // Module: app/ZoneXApp.js
  // =========================================================================
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
class ZoneXApp {
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

    this.pokey.setFrameStepper(() => this.stepFrame());

    this.levelEditor = new LevelEditorController(this);
    this.levelEditor.initUI();
    this.refreshZoneDropdown();
    this.bindUIControls();

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

    // Holographic HUD cards
    setTxt("hud-zone-val", `ZONE ${String(gameZoneNum).padStart(2, "0")}`);
    setTxt("hud-score-val", this.state.scoreHex);
    setTxt("hud-lives-val", `${this.state.ram[SystemAddressMap.LIVES_COUNT]}`);
    setTxt("hud-plutonium-val", `${this.state.remainingPlutonium}`);
    setTxt("hud-containers-val", `${this.state.ram[SystemAddressMap.CONTAINERS_REMAINING]}`);
    setTxt("hud-mats-val", `${this.state.insulatingMatsCount}`);

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
    toggleBadge("badge-inv-key", this.state.ram[SystemAddressMap.INV_HAS_KEY] > 0);
    toggleBadge("badge-inv-mask", this.state.ram[SystemAddressMap.INV_HAS_MASK] > 0);
    toggleBadge("badge-inv-spade", this.state.ram[SystemAddressMap.INV_HAS_SPADE] > 0);
    toggleBadge("badge-inv-mats", this.state.insulatingMatsCount > 0);

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
async function bootstrapGfxRedesignZoneX() {
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


})();
