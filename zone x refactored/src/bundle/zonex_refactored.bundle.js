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
  LIVES_COUNT: 0x0596,
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
 * src/app/ZoneXApp.js
 * Clean Application Controller & UI View-Binder for Zone X.
 * Connects GameState, GameEngine, AtariDisplayRenderer, PokeyAudioSynthesizer,
 * InputController, BonusLevelPack, and LevelEditorController.
 */
class ZoneXApp {
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
async function bootstrapRefactoredZoneX() {
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


})();
