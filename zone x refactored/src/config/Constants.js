/**
 * src/config/Constants.js
 * Central domain constants, enumerations, and system configuration for Zone X.
 */

export const GridConfig = Object.freeze({
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

export const ScreenMode = Object.freeze({
  TITLE: "title",
  FEATURES: "features",
  IN_GAME: "ingame",
  HALL_OF_FAME: "halloffame",
});

export const DisplayListAddress = Object.freeze({
  [ScreenMode.TITLE]: 0x3CE5,
  [ScreenMode.FEATURES]: 0x939C,
  [ScreenMode.IN_GAME]: 0x3C8B,
  [ScreenMode.HALL_OF_FAME]: 0x8F08,
});

export const RefreshStandard = Object.freeze({
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

export const TileType = Object.freeze({
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

export const PalettePreset = Object.freeze({
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

export const SystemAddressMap = Object.freeze({
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
