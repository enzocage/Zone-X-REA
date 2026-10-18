/**
 * src/models/GameState.js
 * Clean high-level domain state facade over the Atari 800XL system memory & telemetry.
 * Eliminates raw hex addresses from UI, controller, and editor layers.
 */

import { DisplayListAddress, ScreenMode, SystemAddressMap } from "../config/Constants.js";

export class GameState {
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
