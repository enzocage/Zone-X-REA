(function() {
'use strict';
// === hardware/input_bridge.js ===
/**
 * zonex-web/js/hardware/input_bridge.js
 * Maps Keyboard & deterministic TAS input masks to Atari 800XL Hardware Registers:
 * - $D300 (PORTA) / $0278 (STICK0): Bit 0=Up, 1=Down, 2=Left, 3=Right (active-low on Atari hardware)
 * - $D010 (TRIG0) / $0284 (STRIG0): Fire button (0=Pressed, 1=Released)
 * - $D01F (CONSOL): Bit 0=Start, 1=Select, 2=Option
 * - $D209 (KBCODE) / $02FC (CH): Keyboard action keys ('C'=CH ITEM, 'P'=PAUSE, 'A'=ABORT)
 */

const INPUT_BITS = {
  UP: 0x01,
  DOWN: 0x02,
  LEFT: 0x04,
  RIGHT: 0x08,
  FIRE: 0x10,
  CH_ITEM: 0x20,
  PAUSE: 0x40,
  ABORT: 0x80,
};

class InputBridge {
  constructor(memory) {
    this.memory = memory;
    this.liveMask = 0;
    this.oneShotMask = 0;
    this.bindKeyboard();
  }

  bindKeyboard() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask |= INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask |= INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask |= INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask |= INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ") {
        this.liveMask |= INPUT_BITS.FIRE;
        this.oneShotMask |= INPUT_BITS.FIRE;
      }
      if (e.code === "KeyC") this.oneShotMask |= INPUT_BITS.CH_ITEM;
      if (e.code === "KeyP") this.oneShotMask |= INPUT_BITS.PAUSE;
      if (e.code === "KeyK") this.oneShotMask |= INPUT_BITS.ABORT;
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask &= ~INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask &= ~INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask &= ~INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask &= ~INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ") this.liveMask &= ~INPUT_BITS.FIRE;
    });
  }

  applyMaskToRegisters(mask) {
    const ram = this.memory.ram;
    // Active-low nibble inSTICK0 ($0278) & PORTA ($D300)
    let stick = 0x0F;
    if (mask & INPUT_BITS.UP) stick &= ~0x01;
    if (mask & INPUT_BITS.DOWN) stick &= ~0x02;
    if (mask & INPUT_BITS.LEFT) stick &= ~0x04;
    if (mask & INPUT_BITS.RIGHT) stick &= ~0x08;

    ram[0x0278] = stick;
    ram[0xD300] = (stick << 4) | stick;

    const trig = (mask & INPUT_BITS.FIRE) ? 0x00 : 0x01;
    ram[0x0284] = trig;
    ram[0xD010] = trig;
  }

  consumeFrameInput(overrideMask = null) {
    if (overrideMask !== null && overrideMask !== undefined) {
      this.applyMaskToRegisters(overrideMask);
      return overrideMask;
    }
    const combined = this.liveMask | this.oneShotMask;
    this.oneShotMask = 0;
    this.applyMaskToRegisters(combined);
    return combined;
  }
}

// === engine/memory_state.js ===
/**
 * zonex-web/js/engine/memory_state.js
 * 64KB Atari 800XL RAM Mirror (Uint8Array(65536)) + MOS 6502 Decimal Mode (SED/CLD) BCD Arithmetic.
 */

function bcdAdd8(a, b, carryIn = 0) {
  let lo = (a & 0x0F) + (b & 0x0F) + (carryIn ? 1 : 0);
  if (lo > 9) lo += 6;
  let hi = (a >> 4) + (b >> 4) + (lo > 0x0F ? 1 : 0);
  if (hi > 9) hi += 6;
  return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), carry: hi > 0x0F ? 1 : 0 };
}

function bcdSub8(a, b, borrowIn = 0) {
  let lo = (a & 0x0F) - (b & 0x0F) - (borrowIn ? 1 : 0);
  let borrowLo = 0;
  if (lo < 0) {
    lo -= 6;
    borrowLo = 1;
  }
  let hi = (a >> 4) - (b >> 4) - borrowLo;
  let borrowHi = 0;
  if (hi < 0) {
    hi -= 6;
    borrowHi = 1;
  }
  return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), borrow: borrowHi };
}

class MemoryState {
  constructor(bundle) {
    this.ram = new Uint8Array(65536);
    this.bundle = bundle;
    this.paused = false;
    this.outOfTime = false;
    this.selectedItemSlot = 0; // 0=MATS, 1=KEY, 2=SPADE
    this.initStaticRomTables();
  }

  initStaticRomTables() {
    const { charsets, meta_tiles, screens_data } = this.bundle;

    // 1. Load 1024-byte charset at $706C and $1800
    const font = charsets.in_game;
    for (let i = 0; i < font.length; i++) {
      this.ram[0x706C + i] = font[i];
      this.ram[0x1800 + i] = font[i];
    }
    this.ram[0x02F4] = 0x18;
    this.ram[0xD409] = 0x18;

    // 2. Load 32 Meta-Tiles (4 chars each) at $6D42
    for (let t = 0; t < meta_tiles.length; t++) {
      const chars = meta_tiles[t].chars;
      for (let c = 0; c < 4; c++) {
        this.ram[0x6D42 + t * 4 + c] = chars[c];
      }
    }

    // 3. Load Display Lists & Screen Templates ($3C8B, $3CE5, $939C, $3DB3, $3E53, $3E67)
    if (screens_data) {
      const copyAt = (addr, arr) => {
        if (!arr) return;
        for (let i = 0; i < arr.length; i++) {
          this.ram[addr + i] = arr[i];
        }
      };
      copyAt(0x3DB3, screens_data.title_text_3db3);
      copyAt(0x3E53, screens_data.hud_line1_3e53);
      copyAt(0x3E67, screens_data.hud_line2_3e67);
      copyAt(0x3C8B, screens_data.dl_ingame_3c8b);
      copyAt(0x3CE5, screens_data.dl_menu_3ce5);
      copyAt(0x939C, screens_data.dl_features_939c);
      copyAt(0x93DC, screens_data.features_screen_mem_93dc);
    }
  }

  /**
   * 1:1 Port of $45AE & $44DD: Writes logical tileId to $0B00 + ty*64 + tx
   * and expands its 2x2 characters into the $1C00..$3BFF playfield buffer.
   */
  writeTileAndScreen(tx, ty, tileId) {
    if (tx < 0 || tx >= 64 || ty < 0 || ty >= 32) return;
    const t = tileId & 0x1F;
    this.ram[0x0B00 + ty * 64 + tx] = t;

    const metaBase = 0x6D42 + t * 4;
    const c0 = this.ram[metaBase];
    const c1 = this.ram[metaBase + 1];
    const c2 = this.ram[metaBase + 2];
    const c3 = this.ram[metaBase + 3];

    const row0Addr = 0x1C00 + (ty * 2) * 128 + tx * 2;
    const row1Addr = 0x1C00 + (ty * 2 + 1) * 128 + tx * 2;
    this.ram[row0Addr] = c0;
    this.ram[row0Addr + 1] = c1;
    this.ram[row1Addr] = c2;
    this.ram[row1Addr + 1] = c3;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= 64 || ty < 0 || ty >= 32) return 1; // WALL
    return this.ram[0x0B00 + ty * 64 + tx] & 0x1F;
  }

  /**
   * 1:1 Port of $4462..$44DC: Updates the 25 LMS pointers at $3C94..$3CDC
   * based on player character coordinates ($0560, $0561).
   */
  updateCameraLmsPointers() {
    const pxChar = this.ram[0x0560];
    const pyChar = this.ram[0x0561];

    let camAddr = 0x1C00;
    if (pyChar >= 0x0C) {
      let rowScroll = pyChar - 0x0A;
      if (rowScroll >= 0x28) rowScroll = 0x28;
      camAddr = (camAddr + rowScroll * 0x80) & 0xFFFF;
    }

    if (pxChar >= 0x16) {
      let colScroll = pxChar - 0x14;
      if (colScroll >= 0x54) colScroll = 0x54;
      camAddr = (camAddr + colScroll) & 0xFFFF;
    }

    let curLms = camAddr;
    for (let row = 0; row < 25; row++) {
      const dlEntry = 0x3C93 + row * 3;
      this.ram[dlEntry + 1] = curLms & 0xFF;
      this.ram[dlEntry + 2] = (curLms >> 8) & 0xFF;
      curLms = (curLms + 0x0080) & 0xFFFF;
    }

    this.ram[0x0577] = curLms & 0xFF;
    this.ram[0x0578] = (curLms >> 8) & 0xFF;
  }

  get25LmsPointers() {
    const ptrs = [];
    for (let row = 0; row < 25; row++) {
      const dlEntry = 0x3C93 + row * 3;
      const lo = this.ram[dlEntry + 1];
      const hi = this.ram[dlEntry + 2];
      ptrs.push((hi << 8) | lo);
    }
    return ptrs;
  }

  /**
   * Adds 16-bit BCD points to Score ($00C1/$00C2) using 6502 SED/CLD rules.
   */
  addScoreBcd(lowByteBcd, highByteBcd = 0) {
    const r0 = bcdAdd8(this.ram[0x00C1], lowByteBcd, 0);
    const r1 = bcdAdd8(this.ram[0x00C2], highByteBcd, r0.carry);
    this.ram[0x00C1] = r0.result;
    this.ram[0x00C2] = r1.result;
    this.syncHudText();
  }

  /**
   * Subtracts 1 BCD unit from the Radiation Timer ($009E/$009F & $059E/$059F).
   */
  decrementTimerBcd(amountLo = 0x01) {
    if (this.outOfTime) return;
    const r0 = bcdSub8(this.ram[0x009E], amountLo, 0);
    const r1 = bcdSub8(this.ram[0x009F], 0x00, r0.borrow);
    if (r1.borrow || (r0.result === 0 && r1.result === 0)) {
      this.ram[0x009E] = 0x00;
      this.ram[0x009F] = 0x00;
      this.ram[0x059E] = 0x00;
      this.ram[0x059F] = 0x00;
      this.outOfTime = true;
    } else {
      this.ram[0x009E] = r0.result;
      this.ram[0x009F] = r1.result;
      this.ram[0x059E] = r0.result;
      this.ram[0x059F] = r1.result;
    }
    this.syncHudText();
  }

  syncHudText() {
    // Format timer digits at $0400 + 16..18
    const tHi = this.ram[0x009F] & 0x0F;
    const tMid = (this.ram[0x009E] >> 4) & 0x0F;
    const tLo = this.ram[0x009E] & 0x0F;
    this.ram[0x0400 + 16] = 0x50 + tHi;
    this.ram[0x0400 + 17] = 0x50 + tMid;
    this.ram[0x0400 + 18] = 0x50 + tLo;

    // Format lower HUD ($0428..$043B) per $4F20..$4F75
    for (let i = 0; i < 20; i++) {
      this.ram[0x0428 + i] = 0x00;
    }
    let x = 0;
    if (this.ram[0x0574]) this.ram[0x0428 + x++] = 0xC6; // KEY
    if (this.ram[0x0575]) this.ram[0x0428 + x++] = 0x84; // SPADE
    if (this.ram[0x05AF]) this.ram[0x0428 + x++] = 0xC3; // PLUTONIUM carried
    const mats = this.ram[0x0576];
    for (let m = 0; m < mats && x < 10; m++) {
      this.ram[0x0428 + x++] = 0x85;
    }
    const plut = this.ram[0x0598];
    for (let p = 0; p < plut && x + p < 20; p++) {
      this.ram[0x0428 + x + p] = 0x85;
    }
  }
}

// === engine/zone_loader.js ===
/**
 * zonex-web/js/engine/zone_loader.js
 * 1:1 Port of Dossier 01 ($623A, $45DD, $4639, $4462):
 * Loads Zone 1..12 into the 64KB RAM state ($0B00 logical map, $1C00 screen buffer,
 * $3C93 25 LMS pointers, $A2C4 per-zone colors, HUD lines, and robot tables).
 */

class ZoneLoader {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
  }

  loadZone(zoneNumber = 1, optionLevel = 3) {
    const zoneIdx = Math.max(0, Math.min(11, zoneNumber - 1));
    const zdata = this.bundle.zones[zoneIdx];
    const ram = this.memory.ram;

    this.memory.initStaticRomTables();
    this.memory.paused = false;
    this.memory.outOfTime = false;

    // 1. Copy unpacked 64x32 logical tile map into $0B00..$12FF and expand into $1C00..$3BFF
    const pf = zdata.playfield_bytes;
    for (let ty = 0; ty < 32; ty++) {
      for (let tx = 0; tx < 64; tx++) {
        const tileId = pf[ty * 64 + tx];
        this.memory.writeTileAndScreen(tx, ty, tileId);
      }
    }

    // 2. Set Zone & Player variables ($0555..$05BC)
    ram[0x0555] = zoneIdx;
    ram[0x0556] = Math.max(0, Math.min(2, optionLevel - 1));
    ram[0x0598] = zdata.plutonium_count;
    ram[0x05B3] = zdata.container_count;

    const startOffset = zdata.player_start.offset;
    ram[0x055B] = startOffset & 0xFF;
    ram[0x055C] = (startOffset >> 8) & 0xFF;
    ram[0x055D] = zdata.player_start.hpos;
    ram[0x055E] = zdata.player_start.sprite;
    ram[0x055F] = 0x03;

    // Clear inventory ($0574=KEY, $0575=SPADE, $0576=MATS, $05AF=PLUTONIUM)
    ram[0x0574] = 0x00;
    ram[0x0575] = 0x00;
    ram[0x0576] = 0x00;
    ram[0x05AF] = 0x00;

    // 3. Initialize BCD Timer ($009E/$009F = 0950) & Score ($00C1/$00C2 = 0000)
    ram[0x009E] = 0x50;
    ram[0x009F] = 0x09;
    ram[0x059E] = 0x50;
    ram[0x059F] = 0x09;
    ram[0x00C1] = 0x00;
    ram[0x00C2] = 0x00;

    // 4. Copy HUD lines ($3E53 -> $0414, $3E67 -> $0428) exactly as $6309..$6319
    const hud1 = this.bundle.screens_data.hud_line1_3e53;
    const hud2 = this.bundle.screens_data.hud_line2_3e67;
    for (let i = 0; i < 20; i++) {
      ram[0x0400 + i] = 0x00;
      ram[0x0414 + i] = hud1[i];
      ram[0x0428 + i] = hud2[i];
    }

    const zNum = zoneIdx + 1;
    if (zNum >= 10) {
      ram[0x0414 + 5] = 0xD0 + Math.floor(zNum / 10);
      ram[0x0414 + 6] = 0xD0 + (zNum % 10);
    } else {
      ram[0x0414 + 5] = 0xD0 + zNum;
    }
    ram[0x0414 + 19] = 0xD3; // 3 lives

    ram[0x0400 + 5] = 0x50; // '0' score
    ram[0x0400 + 16] = 0x59; // '9'
    ram[0x0400 + 17] = 0x55; // '5'
    ram[0x0400 + 18] = 0x50; // '0'

    for (let i = 0; i < Math.min(20, zdata.plutonium_count); i++) {
      ram[0x0428 + i] = 0x85;
    }

    // 5. Player char coords ($0560, $0561) & 25 LMS camera pointers ($3C94)
    ram[0x0560] = (zdata.player_start.x * 2) & 0xFF;
    ram[0x0561] = (zdata.player_start.y * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();

    ram[0x05BC] = 0x06;
    ram[0xD404] = 0x06; // HSCROL
    ram[0xD405] = 0x06; // VSCROL

    // 6. Display List Shadow Registers ($3C8B) & Charset ($1800)
    ram[0x0230] = 0x8B;
    ram[0x0231] = 0x3C;
    ram[0xD402] = 0x8B;
    ram[0xD403] = 0x3C;
    ram[0x02F4] = 0x18;
    ram[0xD409] = 0x18;

    // 7. Authentic per-zone GTIA color palette ($A2C4 + zone_idx * 4)
    const cols = zdata.colors;
    for (let i = 0; i < 4; i++) {
      ram[0x02C4 + i] = cols[i];
      ram[0xD016 + i] = cols[i];
    }
    ram[0x02C8] = 0x00;
    ram[0xD01A] = 0x00;
    ram[0x02C0] = 0xA6;
    ram[0x02C1] = 0x18;
    ram[0xD012] = 0xA6;
    ram[0xD013] = 0x18;

    return zdata;
  }
}

// === engine/feature_state_machine.js ===
/**
 * zonex-web/js/engine/feature_state_machine.js
 * 1:1 Port of Dossier 03 ($4A10, $47CB, $6580):
 * State machine and tile mutation logic for all 16 verified Zone X features:
 * LASER, WARP, SLAM, AIRDOORS, DOOR, PLUTONIUM, BONUS, LOCK,
 * KEY, LOCKED, SPADE, CRUMBLY, MATS, CONTAINER, BLOCK, TIME.
 */

class FeatureStateMachine {
  constructor(memory, bundle, pokey) {
    this.memory = memory;
    this.bundle = bundle;
    this.pokey = pokey;
    this.frameCounter = 0;
  }

  /**
   * Checks if player moving into (nx, ny) with direction (dx, dy) interacts with a feature tile.
   * Returns true if the tile becomes walkable.
   */
  tryInteractTile(nx, ny, dx, dy, tileId) {
    const ram = this.memory.ram;

    switch (tileId) {
      case 4: // CRUMBLY — diggable wall if player has SPADE ($0575)
        if (ram[0x0575] > 0) {
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 10, 2);
          return true;
        }
        return false;

      case 5: // BLOCK — pushable movable block if tile behind it is FLOOR (0)
        if (this.memory.getTile(nx + dx, ny + dy) === 0) {
          this.memory.writeTileAndScreen(nx + dx, ny + dy, 5);
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 8, 2);
          return true;
        }
        return false;

      case 9:  // AIRDOORS — periodic pneumatic doors (walkable on even phase)
      case 10: // SLAM — fast slamming trapdoors
        return (this.frameCounter & 0x08) === 0;

      case 16: // LOCKED — locked door opened if player carries KEY ($0574)
      case 19: // LOCK — lock mechanism
        if (ram[0x0574] > 0) {
          ram[0x0574] = 0; // Consume key
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.memory.addScoreBcd(0x25, 0x00);
          this.pokey.triggerSfx(4, 2, 12, 2);
          return true;
        }
        return false;

      case 20: // CONTAINER — decontaminates carried PLUTONIUM ($05AF)
        if (ram[0x05AF] > 0) {
          ram[0x05AF] = 0;
          if (ram[0x0598] > 0) {
            ram[0x0598] = (ram[0x0598] - 1) & 0xFF;
          }
          this.memory.addScoreBcd(0x50, 0x01);
          this.pokey.triggerSfx(4, 2, 16, 3);
        }
        return true;

      default:
        return false;
    }
  }

  /**
   * Handles pickups and teleporters when player steps onto (px, py).
   */
  onEnterTile(px, py) {
    const ram = this.memory.ram;
    const tileId = this.memory.getTile(px, py);

    switch (tileId) {
      case 6: // PLUTONIUM — radioactive sample (main objective)
        if (ram[0x05AF] === 0) {
          ram[0x05AF] = 1;
          this.memory.writeTileAndScreen(px, py, 0);
          this.memory.addScoreBcd(0x50, 0x00);
          this.pokey.triggerSfx(2, 1, 12, 2);
        }
        break;

      case 7: // KEY — unlocks LOCKED doors
        ram[0x0574] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 11: // SPADE — digs CRUMBLY walls
        ram[0x0575] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 13: // MATS — pickup floor mat
      case 14:
      case 15:
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
        break;

      case 17: // TIME — radiation timer bonus pickup
        {
          const r = ram[0x009F];
          ram[0x009F] = Math.min(0x09, r + 1);
          ram[0x059F] = ram[0x009F];
          this.memory.writeTileAndScreen(px, py, 0);
          this.memory.syncHudText();
          this.pokey.triggerSfx(2, 1, 12, 2);
        }
        break;

      case 21: // BONUS — score bonus pickup
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x00, 0x01);
        this.pokey.triggerSfx(2, 1, 14, 2);
        break;

      case 12: // WARP — teleporter pad ($47CB)
      case 2:  // DOOR — corridor transition door ($47CB)
      case 22: // DOOR_SPECIAL
        this.executeWarpOrDoor(px, py);
        break;

      default:
        break;
    }
  }

  executeWarpOrDoor(px, py) {
    const ram = this.memory.ram;
    const zoneIdx = ram[0x0555] & 0x0F;
    const zdata = this.bundle.zones[zoneIdx];
    if (!zdata || !zdata.warps || zdata.warps.length === 0) return;

    let match = zdata.warps.find((w) => Math.abs(w.src_x - px) <= 1 && Math.abs(w.src_y - py) <= 1);
    if (!match) {
      match = zdata.warps[0];
    }

    const dstX = match.dst_x;
    const dstY = match.dst_y;
    const dstOffset = (dstY * 64 + dstX) & 0xFFFF;
    ram[0x055B] = dstOffset & 0xFF;
    ram[0x055C] = (dstOffset >> 8) & 0xFF;
    ram[0x0560] = (dstX * 2) & 0xFF;
    ram[0x0561] = (dstY * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(5, 2, 14, 3);
  }

  /**
   * 50 Hz frame update for timers, periodic lasers, and BCD radiation countdown ($6580).
   */
  tickFrame() {
    if (this.memory.paused || this.memory.outOfTime) return;
    this.frameCounter++;
    this.memory.ram[0x0014] = this.frameCounter & 0xFF; // RTCLOK_LO

    // Decrement BCD radiation timer every 8 frames (or every frame if carrying unstable Plutonium)
    const period = this.memory.ram[0x05AF] > 0 ? 4 : 8;
    if (this.frameCounter % period === 0) {
      this.memory.decrementTimerBcd(0x01);
      if (this.memory.outOfTime) {
        this.pokey.triggerSfx(6, 0, 20, 3);
      }
    }
  }
}

// === engine/player_physics.js ===
/**
 * zonex-web/js/engine/player_physics.js
 * 1:1 Port of Dossier 02 & 03 ($4800, $4846, $4B30, $4C50, $4462):
 * Handles player movement, collision detection against $0B00 tiles,
 * fine/coarse scrolling across the 25 LMS rows at $3C94, CH ITEM, and MATS.
 */


const SOLID_TILES = new Set([
  1,  // WALL
  3,  // WALL_ALT
  5,  // BLOCK (unless pushed)
  8,  // LASER_H (lethal/blocking when active)
  16, // LOCKED (unless player has KEY)
  18, // LASER_V
  25, // LASER_GEN
]);

class PlayerPhysics {
  constructor(memory, featureMachine, pokey) {
    this.memory = memory;
    this.featureMachine = featureMachine;
    this.pokey = pokey;
    this.moveCooldown = 0;
  }

  step(inputMask) {
    const ram = this.memory.ram;

    if (inputMask & INPUT_BITS.PAUSE) {
      this.memory.paused = !this.memory.paused;
    }
    if (inputMask & INPUT_BITS.ABORT) {
      ram[0x009E] = 0x00;
      ram[0x009F] = 0x00;
      this.memory.outOfTime = true;
      this.pokey.triggerSfx(6, 0, 16, 3);
      return;
    }
    if (this.memory.paused || this.memory.outOfTime) {
      return;
    }

    // CH ITEM cycling ($4B30)
    if (inputMask & INPUT_BITS.CH_ITEM) {
      this.memory.selectedItemSlot = (this.memory.selectedItemSlot + 1) % 3;
      this.pokey.triggerSfx(2, 1, 6, 1);
    }

    let px = Math.floor(ram[0x0560] / 2);
    let py = Math.floor(ram[0x0561] / 2);

    // FIRE action: place or pick up MATS ($4C50)
    if (inputMask & INPUT_BITS.FIRE) {
      const curTile = this.memory.getTile(px, py);
      if (curTile === 13 || curTile === 14 || curTile === 15) {
        // Pick up MATS
        this.memory.writeTileAndScreen(px, py, 0);
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
      } else if (curTile === 0 && ram[0x0576] > 0) {
        // Place MATS on floor to block robots
        this.memory.writeTileAndScreen(px, py, 13);
        ram[0x0576] = (ram[0x0576] - 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(3, 1, 8, 2);
      }
    }

    // Movement input ($4800..$4846)
    let dx = 0;
    let dy = 0;
    let scrollDir = ram[0x055F];

    if (inputMask & INPUT_BITS.UP) {
      dy = -1;
      scrollDir = 0;
    } else if (inputMask & INPUT_BITS.DOWN) {
      dy = 1;
      scrollDir = 3;
    } else if (inputMask & INPUT_BITS.LEFT) {
      dx = -1;
      scrollDir = 2;
    } else if (inputMask & INPUT_BITS.RIGHT) {
      dx = 1;
      scrollDir = 1;
    }

    if (dx === 0 && dy === 0) {
      ram[0xD404] = 0x06;
      ram[0xD405] = 0x06;
      return;
    }

    ram[0x055F] = scrollDir;
    const nx = px + dx;
    const ny = py + dy;
    if (nx < 0 || nx >= 64 || ny < 0 || ny >= 32) return;

    const targetTile = this.memory.getTile(nx, ny);

    // Check interactive feature obstacles before blocking
    const canEnter = this.featureMachine.tryInteractTile(nx, ny, dx, dy, targetTile);
    if (!canEnter && SOLID_TILES.has(targetTile)) {
      return;
    }

    // Commit move
    px = nx;
    py = ny;
    const newOffset = (py * 64 + px) & 0xFFFF;
    ram[0x055B] = newOffset & 0xFF;
    ram[0x055C] = (newOffset >> 8) & 0xFF;
    ram[0x0560] = (px * 2) & 0xFF;
    ram[0x0561] = (py * 2) & 0xFF;
    ram[0x055E] = ((ram[0x055E] || 0) + 1) % 3;

    // Fine scroll pulse on HSCROL/VSCROL ($D404/$D405) + update 25 LMS pointers ($3C94)
    ram[0xD404] = (0x06 + dx * 2) & 0x0F;
    ram[0xD405] = (0x06 + dy * 2) & 0x0F;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(1, 0, 4, 1);

    // Trigger tile entry effects (WARP, DOOR, Pickups)
    this.featureMachine.onEnterTile(px, py);
  }
}

// === engine/robot_ai.js ===
/**
 * zonex-web/js/engine/robot_ai.js
 * 1:1 Port of Dossier 04 ($55D4, $5600, $5720):
 * Patrols zone robots and bounces off walls and player-laid MATS (tile_id 13..15).
 */

class RobotAI {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.robots = [];
    this.tickCounter = 0;
  }

  initZoneRobots(zoneIdx) {
    const zdata = this.bundle.zones[zoneIdx] || this.bundle.zones[0];
    this.robots = (zdata.robots || []).map((r) => ({
      x: r.x & 0x3F,
      y: r.y & 0x1F,
      dir: r.dir & 0x03,
      speed: Math.max(1, r.speed & 0x07),
    }));
    this.tickCounter = 0;
  }

  stepFrame() {
    if (this.memory.paused || this.memory.outOfTime) return;
    this.tickCounter++;

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
    ];

    for (let i = 0; i < this.robots.length; i++) {
      const r = this.robots[i];
      if (this.tickCounter % r.speed !== 0) continue;

      const d = dirs[r.dir & 0x03];
      const nx = (r.x + d.dx) & 0x3F;
      const ny = (r.y + d.dy) & 0x1F;
      const tile = this.memory.getTile(nx, ny);

      // Robots bounce off solid walls AND player-dropped MATS (13, 14, 15) ($5720)
      if (tile !== 0) {
        r.dir = (r.dir ^ 0x03) & 0x03;
      } else {
        r.x = nx;
        r.y = ny;
      }
    }
  }
}

// === engine/screens.js ===
/**
 * zonex-web/js/engine/screens.js
 * Configures the 64KB RAM state for Title Screen ($3CE5), Feature Showcase ($939C),
 * and Hall of Fame ($3CE5) so AnticGtiaRenderer renders them bit-accurately.
 */

class ScreenManager {
  constructor(memory, bundle, zoneLoader) {
    this.memory = memory;
    this.bundle = bundle;
    this.zoneLoader = zoneLoader;
    this.activeScreen = "ingame";
  }

  loadScreen(screenName) {
    const ram = this.memory.ram;
    this.memory.initStaticRomTables();
    this.activeScreen = screenName;

    if (screenName === "title") {
      ram[0x0230] = 0xE5;
      ram[0x0231] = 0x3C;
      ram[0xD402] = 0xE5;
      ram[0xD403] = 0x3C;
      ram[0x02F4] = 0x18;
      ram[0xD409] = 0x18;
      ram[0x02C4] = 0x28;
      ram[0x02C5] = 0xCA;
      ram[0x02C6] = 0x94;
      ram[0x02C7] = 0x46;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];
      const titleText = this.bundle.screens_data.title_text_3db3;
      for (let i = 0; i < titleText.length; i++) {
        ram[0x0400 + i] = titleText[i];
      }
    } else if (screenName === "features") {
      ram[0x0230] = 0x9C;
      ram[0x0231] = 0x93;
      ram[0xD402] = 0x9C;
      ram[0xD403] = 0x93;
      ram[0x02F4] = 0x18;
      ram[0xD409] = 0x18;
      ram[0x02C4] = 0x44;
      ram[0x02C5] = 0x4A;
      ram[0x02C6] = 0x86;
      ram[0x02C7] = 0xC8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];
    } else if (screenName === "halloffame") {
      ram[0x0230] = 0xE5;
      ram[0x0231] = 0x3C;
      ram[0xD402] = 0xE5;
      ram[0xD403] = 0x3C;
      ram[0x02F4] = 0x18;
      ram[0xD409] = 0x18;
      ram[0x02C4] = 0x86;
      ram[0x02C5] = 0xEC;
      ram[0x02C6] = 0x44;
      ram[0x02C7] = 0xC8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];
    } else {
      this.activeScreen = "ingame";
      this.zoneLoader.loadZone(1, 3);
    }
  }
}

// === hardware/antic_gtia.js ===
/**
 * zonex-web/js/hardware/antic_gtia.js
 * Cycle-exact ANTIC Display List & GTIA PAL Renderer (336x240).
 * Implements ANTIC Mode 4 (with Bit 7 COLPF3 selector), Mode 6, Mode 2,
 * 24x $74 + 1x $54 LMS rows, and Player/Missile Graphics (P0 + P1).
 */

class AnticGtiaRenderer {
  constructor(canvas, memory, bundle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.memory = memory;
    this.bundle = bundle;
    this.width = 336;
    this.height = 240;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.palPalette = bundle.atari_pal_palette;
  }

  putPixel(buf, x, y, rgb) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const idx = (y * this.width + x) << 2;
      buf[idx] = rgb[0];
      buf[idx + 1] = rgb[1];
      buf[idx + 2] = rgb[2];
      buf[idx + 3] = 255;
    }
  }

  drawDoublePixel(buf, scanlineY, screenX, rgb) {
    this.putPixel(buf, screenX, scanlineY, rgb);
    this.putPixel(buf, screenX + 1, scanlineY, rgb);
  }

  renderFrame(robots = []) {
    const ram = this.memory.ram;
    const buf = this.imageData.data;

    const regs = {
      COLPF0: ram[0x02C4],
      COLPF1: ram[0x02C5],
      COLPF2: ram[0x02C6],
      COLPF3: ram[0x02C7],
      COLBK: ram[0x02C8],
    };

    const bgRgb = this.palPalette[regs.COLBK] || [0, 0, 0];
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = bgRgb[0];
      buf[i + 1] = bgRgb[1];
      buf[i + 2] = bgRgb[2];
      buf[i + 3] = 255;
    }

    const dlAddr = ram[0x0230] | (ram[0x0231] << 8);
    const chbase = (ram[0x02F4] << 8) & 0xFFFF;
    const xOffset = 8;

    let scanlineY = 8;
    let pc = dlAddr;
    let curLms = 0;
    let steps = 0;

    while (scanlineY < this.height - 8 && steps < 256) {
      steps++;
      const ir = ram[pc & 0xFFFF];
      pc = (pc + 1) & 0xFFFF;

      if (ir === 0x41) {
        break; // JVB
      }

      const mode = ir & 0x0F;
      const hasLms = (ir & 0x40) !== 0;

      if (mode === 0) {
        const blankLines = ((ir >> 4) & 0x07) + 1;
        scanlineY += blankLines;
        continue;
      }

      if (hasLms) {
        const lo = ram[pc & 0xFFFF];
        const hi = ram[(pc + 1) & 0xFFFF];
        pc = (pc + 2) & 0xFFFF;
        curLms = (hi << 8) | lo;
      }

      if (mode === 4) {
        // ANTIC Mode 4 ($04, $44, $54, $74)
        for (let scanlineInRow = 0; scanlineInRow < 8; scanlineInRow++) {
          if (scanlineY >= this.height) break;
          for (let chCol = 0; chCol < 40; chCol++) {
            const charCode = ram[(curLms + chCol) & 0xFFFF];
            const charIndex = charCode & 0x7F;
            const usePF3 = (charCode & 0x80) !== 0;
            const glyphByte = ram[(chbase + (charIndex << 3) + (scanlineInRow & 0x07)) & 0xFFFF];
            const screenX = xOffset + (chCol << 3);

            for (let px = 0; px < 4; px++) {
              const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
              let colorReg;
              if (bitPair === 0) colorReg = regs.COLBK;
              else if (bitPair === 1) colorReg = regs.COLPF0;
              else if (bitPair === 2) colorReg = regs.COLPF1;
              else colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
              this.drawDoublePixel(buf, scanlineY, screenX + (px << 1), this.palPalette[colorReg]);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 40) & 0xFFFF;
      } else if (mode === 6) {
        // ANTIC Mode 6 (20 chars x 8 scanlines, 4-color text)
        const mode6Colors = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
        for (let s = 0; s < 8; s++) {
          if (scanlineY >= this.height) break;
          for (let chCol = 0; chCol < 20; chCol++) {
            const charCode = ram[(curLms + chCol) & 0xFFFF];
            const charIndex = charCode & 0x3F;
            const colorSel = (charCode >> 6) & 0x03;
            const fgRgb = this.palPalette[mode6Colors[colorSel]];
            const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
            const baseX = xOffset + (chCol << 4);
            for (let b = 0; b < 8; b++) {
              const bit = (glyphByte >> (7 - b)) & 1;
              this.drawDoublePixel(buf, scanlineY, baseX + (b << 1), bit ? fgRgb : bgRgb);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 20) & 0xFFFF;
      } else if (mode === 2) {
        // ANTIC Mode 2 (40 chars x 8 scanlines, high-res text)
        const fgRgb = this.palPalette[regs.COLPF1];
        const bgMode2 = this.palPalette[regs.COLPF2];
        for (let s = 0; s < 8; s++) {
          if (scanlineY >= this.height) break;
          for (let chCol = 0; chCol < 40; chCol++) {
            const charCode = ram[(curLms + chCol) & 0xFFFF];
            const charIndex = charCode & 0x7F;
            const inv = (charCode & 0x80) !== 0;
            const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
            const baseX = xOffset + (chCol << 3);
            for (let b = 0; b < 8; b++) {
              const bit = ((glyphByte >> (7 - b)) & 1) ^ (inv ? 1 : 0);
              this.putPixel(buf, baseX + b, scanlineY, bit ? fgRgb : bgMode2);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 40) & 0xFFFF;
      } else {
        scanlineY += 8;
      }
    }

    // Player Sprite Overlay (P0 + P1) when In-Game Display List ($3C8B) is active
    if (dlAddr === 0x3C8B) {
      const p0Col = this.palPalette[ram[0x02C0]];
      const p1Col = this.palPalette[ram[0x02C1]];
      const frameIdx = (ram[0x055E] || 0) % 3;
      const p0Shape = this.bundle.sprites.p0_shapes[frameIdx] || this.bundle.sprites.p0_shapes[0];
      const p1Shape = this.bundle.sprites.p1_shapes[frameIdx] || this.bundle.sprites.p1_shapes[0];

      const pxChar = ram[0x0560];
      const pyChar = ram[0x0561];
      const camX = pxChar < 0x16 ? 0 : Math.min(0x54, pxChar - 0x14);
      const camY = pyChar < 0x0C ? 0 : Math.min(0x28, pyChar - 0x0A);
      const scrX = xOffset + (pxChar - camX) * 8;
      const scrY = 33 + (pyChar - camY) * 8;

      for (let sy = 0; sy < 16; sy++) {
        const b0 = p0Shape[sy];
        const b1 = p1Shape[sy];
        for (let sx = 0; sx < 8; sx++) {
          const bit0 = (b0 >> (7 - sx)) & 1;
          const bit1 = (b1 >> (7 - sx)) & 1;
          if (bit0) {
            this.drawDoublePixel(buf, scrY + sy, scrX + sx * 2, p0Col);
          } else if (bit1) {
            this.drawDoublePixel(buf, scrY + sy, scrX + sx * 2, p1Col);
          }
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }
}

// === hardware/pokey_driver.js ===
/**
 * zonex-web/js/hardware/pokey_driver.js
 * 1:1 Port of the 6502 POKEY Sound Driver at $7A00..$7BFF (Dossier 05).
 * Updates $D200..$D208 in memory_state at 50.00 Hz PAL VBI rate and streams to AudioWorklet.
 * Uses a Blob URL for AudioWorklet registration so it works on both file:// and http://.
 */

const POKEY_WORKLET_SOURCE = `
class PokeyWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.regs = new Uint8Array(9);
    this.phases = new Float64Array(4);
    this.outputs = new Int8Array(4);
    this.lfsr17 = 0x1FFFF;
    this.lfsr5 = 0x1F;
    this.lfsr4 = 0x0F;

    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "POKEY_REGS") {
        const r = e.data.regs;
        for (let i = 0; i < 9 && i < r.length; i++) {
          this.regs[i] = r[i] & 0xFF;
        }
      }
    };
  }

  stepLfsr() {
    const bit17 = ((this.lfsr17 >> 16) ^ (this.lfsr17 >> 11)) & 1;
    this.lfsr17 = ((this.lfsr17 << 1) | bit17) & 0x1FFFF;
    const bit5 = ((this.lfsr5 >> 4) ^ (this.lfsr5 >> 2)) & 1;
    this.lfsr5 = ((this.lfsr5 << 1) | bit5) & 0x1F;
    const bit4 = ((this.lfsr4 >> 3) ^ (this.lfsr4 >> 2)) & 1;
    this.lfsr4 = ((this.lfsr4 << 1) | bit4) & 0x0F;
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const chan0 = output[0];
    const baseClock = 63920.4;
    const sr = sampleRate || 44100;

    for (let i = 0; i < chan0.length; i++) {
      this.stepLfsr();
      let mix = 0.0;

      for (let ch = 0; ch < 4; ch++) {
        const audf = this.regs[ch * 2];
        const audc = this.regs[ch * 2 + 1];
        const vol = (audc & 0x0F) / 15.0;
        const dist = (audc >> 4) & 0x0F;

        if (vol === 0) continue;

        if ((audc & 0x10) !== 0) {
          mix += (vol - 0.5) * 0.25;
          continue;
        }

        const freq = baseClock / (2.0 * (audf + 1));
        this.phases[ch] += freq / sr;
        if (this.phases[ch] >= 0.5) {
          this.phases[ch] -= 0.5;
          if (dist === 0x0A || dist === 0x0E) {
            this.outputs[ch] = this.outputs[ch] ? 0 : 1;
          } else if (dist === 0x08) {
            this.outputs[ch] = this.lfsr17 & 1;
          } else if (dist === 0x0C || dist === 0x04) {
            this.outputs[ch] = (this.lfsr4 ^ this.lfsr5) & 1;
          } else {
            this.outputs[ch] = (this.lfsr17 ^ (this.outputs[ch] ^ 1)) & 1;
          }
        }
        mix += (this.outputs[ch] ? vol : -vol) * 0.22;
      }

      chan0[i] = Math.max(-1.0, Math.min(1.0, mix));
    }

    return true;
  }
}
registerProcessor("pokey-worklet-processor", PokeyWorkletProcessor);
`;

class PokeyDriver {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.audioCtx = null;
    this.workletNode = null;
    this.channels = [
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
    ];
  }

  async enableAudio() {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AudioContextClass({ sampleRate: 44100 });
    const blob = new Blob([POKEY_WORKLET_SOURCE], { type: "application/javascript" });
    const workletUrl = URL.createObjectURL(blob);
    await this.audioCtx.audioWorklet.addModule(workletUrl);
    this.workletNode = new AudioWorkletNode(this.audioCtx, "pokey-worklet-processor");
    this.workletNode.connect(this.audioCtx.destination);
    this.syncWorklet();
  }

  triggerSfx(sfxId, ch = 0, duration = 12, priority = 1) {
    const idx = ch & 0x03;
    const slot = this.channels[idx];
    if (!slot.active || priority >= slot.priority) {
      slot.active = true;
      slot.sfxId = sfxId & 0xFF;
      slot.step = 0;
      slot.duration = duration;
      slot.priority = priority;
    }
  }

  tickFrame() {
    const ram = this.memory.ram;
    const sweep = this.bundle.audio_tables.freq_sweep;
    const env = this.bundle.audio_tables.envelope;
    const notes = this.bundle.audio_tables.notes;

    for (let ch = 0; ch < 4; ch++) {
      const slot = this.channels[ch];
      const regF = 0xD200 + ch * 2;
      const regC = 0xD201 + ch * 2;

      if (!slot.active) {
        ram[regF] = 0x00;
        ram[regC] = 0x00;
        continue;
      }

      const idx = slot.step & 0x1F;
      let audf = 0;
      let audc = 0;

      if (slot.sfxId === 1) {
        audf = (sweep[idx] + 0x20) & 0xFF;
        audc = 0x80 | Math.max(1, 6 - (slot.step >> 1));
      } else if (slot.sfxId === 2) {
        audf = (notes[idx] ^ (slot.step * 7)) & 0xFF;
        audc = 0xA0 | Math.max(2, 12 - slot.step);
      } else if (slot.sfxId === 3) {
        audf = (env[idx] + slot.step * 4) & 0xFF;
        audc = 0xC0 | Math.max(1, 10 - slot.step);
      } else if (slot.sfxId === 4) {
        audf = (sweep[(31 - idx) & 0x1F] + 0x10) & 0xFF;
        audc = 0xA0 | Math.max(2, 14 - slot.step);
      } else if (slot.sfxId === 5) {
        audf = (sweep[idx] ^ env[idx]) & 0xFF;
        audc = 0x40 | Math.max(2, 13 - (slot.step >> 1));
      } else {
        audf = (0x40 + ((slot.step & 3) << 4)) & 0xFF;
        audc = 0xA0 | 0x0C;
      }

      ram[regF] = audf;
      ram[regC] = audc;

      slot.step++;
      if (slot.step >= slot.duration) {
        slot.active = false;
        slot.priority = 0;
      }
    }

    ram[0xD208] = 0x00;
    this.syncWorklet();
  }

  getPokeyRegs() {
    const ram = this.memory.ram;
    return [
      ram[0xD200], ram[0xD201],
      ram[0xD202], ram[0xD203],
      ram[0xD204], ram[0xD205],
      ram[0xD206], ram[0xD207],
      ram[0xD208],
    ];
  }

  syncWorklet() {
    if (this.workletNode) {
      this.workletNode.port.postMessage({
        type: "POKEY_REGS",
        regs: this.getPokeyRegs(),
      });
    }
  }
}

// === verify/lockstep_api.js ===
/**
 * zonex-web/js/verify/lockstep_api.js
 * Exposes window.ZoneXTestAPI for deterministic Playwright Verification Oracles (Phase 5):
 * - Oracle 1: Visual parity (loadScreen / loadZone / getCanvasImageData)
 * - Oracle 2: 5,000-Frame Lockstep TAS verification (stepFrame / getStateSnapshot)
 * - Oracle 3: POKEY register trace & LFSR audio waveform synthesis correlation
 */

function installLockstepAPI(app) {
  const { memory, zoneLoader, screens, playerPhysics, featureMachine, robotAI, pokey, renderer, inputBridge } = app;

  const api = {
    isReady: true,

    loadZone(zoneNumber = 1, optionLevel = 3) {
      screens.activeScreen = "ingame";
      const zdata = zoneLoader.loadZone(zoneNumber, optionLevel);
      robotAI.initZoneRobots(zoneNumber - 1);
      featureMachine.frameCounter = 0;
      renderer.renderFrame(robotAI.robots);
      app.updateTelemetryUI();
      return zdata;
    },

    loadScreen(screenName) {
      screens.loadScreen(screenName);
      renderer.renderFrame([]);
      app.updateTelemetryUI();
      return screenName;
    },

    stepFrame(inputMask = 0) {
      const mask = inputBridge.consumeFrameInput(inputMask);
      if (screens.activeScreen === "ingame") {
        playerPhysics.step(mask);
        featureMachine.tickFrame();
        robotAI.stepFrame();
      }
      pokey.tickFrame();
      renderer.renderFrame(robotAI.robots);
      app.updateTelemetryUI();
      return this.getStateSnapshot();
    },

    getStateSnapshot() {
      const ram = memory.ram;
      const playerX = Math.floor(ram[0x0560] / 2);
      const playerY = Math.floor(ram[0x0561] / 2);
      const timerBcd = ((ram[0x009F] & 0xFF) << 8) | (ram[0x009E] & 0xFF);
      const scoreBcd = ((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF);
      return {
        zone: (ram[0x0555] & 0x0F) + 1,
        playerX,
        playerY,
        charX: ram[0x0560],
        charY: ram[0x0561],
        hscrol: ram[0xD404],
        vscrol: ram[0xD405],
        timerBcd,
        scoreBcd,
        matsCount: ram[0x0576],
        hasKey: ram[0x0574],
        hasSpade: ram[0x0575],
        hasPlutonium: ram[0x05AF],
        plutoniumRemaining: ram[0x0598],
        outOfTime: memory.outOfTime ? 1 : 0,
        pokeyRegs: pokey.getPokeyRegs(),
        lmsPointers: memory.get25LmsPointers(),
      };
    },

    getCanvasImageData() {
      return renderer.ctx.getImageData(0, 0, renderer.width, renderer.height).data;
    },

    /**
     * Synthesizes N audio samples using the exact POKEY LFSR algorithm from pokey_worklet.js
     * for deterministic Oracle 3 spectrogram verification.
     */
    synthesizePokeySamples(regs, numSamples = 512, sampleRate = 44100) {
      const baseClock = 63920.4;
      const phases = new Float64Array(4);
      const outputs = new Int8Array(4);
      let lfsr17 = 0x1FFFF;
      let lfsr5 = 0x1F;
      let lfsr4 = 0x0F;
      const out = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const bit17 = ((lfsr17 >> 16) ^ (lfsr17 >> 11)) & 1;
        lfsr17 = ((lfsr17 << 1) | bit17) & 0x1FFFF;
        const bit5 = ((lfsr5 >> 4) ^ (lfsr5 >> 2)) & 1;
        lfsr5 = ((lfsr5 << 1) | bit5) & 0x1F;
        const bit4 = ((lfsr4 >> 3) ^ (lfsr4 >> 2)) & 1;
        lfsr4 = ((lfsr4 << 1) | bit4) & 0x0F;

        let mix = 0.0;
        for (let ch = 0; ch < 4; ch++) {
          const audf = regs[ch * 2] & 0xFF;
          const audc = regs[ch * 2 + 1] & 0xFF;
          const vol = (audc & 0x0F) / 15.0;
          const dist = (audc >> 4) & 0x0F;
          if (vol === 0) continue;
          if ((audc & 0x10) !== 0) {
            mix += (vol - 0.5) * 0.25;
            continue;
          }
          const freq = baseClock / (2.0 * (audf + 1));
          phases[ch] += freq / sampleRate;
          if (phases[ch] >= 0.5) {
            phases[ch] -= 0.5;
            if (dist === 0x0A || dist === 0x0E) {
              outputs[ch] = outputs[ch] ? 0 : 1;
            } else if (dist === 0x08) {
              outputs[ch] = lfsr17 & 1;
            } else if (dist === 0x0C || dist === 0x04) {
              outputs[ch] = (lfsr4 ^ lfsr5) & 1;
            } else {
              outputs[ch] = (lfsr17 ^ (outputs[ch] ^ 1)) & 1;
            }
          }
          mix += (outputs[ch] ? vol : -vol) * 0.22;
        }
        out[i] = Math.max(-1.0, Math.min(1.0, mix));
      }
      return Array.from(out);
    },

    triggerSfxForTest(sfxId, ch = 0, duration = 12, priority = 2) {
      pokey.triggerSfx(sfxId, ch, duration, priority);
    },
  };

  window.ZoneXTestAPI = api;
  return api;
}

// === main.js ===
/**
 * zonex-web/js/main.js
 * Main entry point & 50.00 Hz PAL Timestep Accumulator (dt = 20.0 ms).
 */


class ZoneXApplication {
  constructor(bundle) {
    this.bundle = bundle;
    this.canvas = document.getElementById("atari-canvas");

    this.memory = new MemoryState(bundle);
    this.pokey = new PokeyDriver(this.memory, bundle);
    this.inputBridge = new InputBridge(this.memory);
    this.zoneLoader = new ZoneLoader(this.memory, bundle);
    this.featureMachine = new FeatureStateMachine(this.memory, bundle, this.pokey);
    this.playerPhysics = new PlayerPhysics(this.memory, this.featureMachine, this.pokey);
    this.robotAI = new RobotAI(this.memory, bundle);
    this.screens = new ScreenManager(this.memory, bundle, this.zoneLoader);
    this.renderer = new AnticGtiaRenderer(this.canvas, this.memory, bundle);

    this.autoLoopEnabled = true;
    this.lastTime = performance.now();
    this.accumulator = 0.0;
    this.FRAME_DT = 20.0; // 50.00 Hz PAL VBI (20.0 ms)
    this.interactiveTick = 0;

    this.bindUI();
    this.api = installLockstepAPI(this);

    // Load Zone 1 initially
    this.api.loadZone(1, 3);
  }

  bindUI() {
    const screenSelect = document.getElementById("ui-screen-select");
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const btnAudio = document.getElementById("btn-audio-toggle");
    const btnCrt = document.getElementById("btn-crt-toggle");
    const crtOverlay = document.getElementById("crt-overlay");

    if (screenSelect) {
      screenSelect.addEventListener("change", () => {
        const val = screenSelect.value;
        if (val === "ingame") {
          this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
        } else {
          this.api.loadScreen(val);
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
      });
    }

    if (btnAudio) {
      btnAudio.addEventListener("click", async () => {
        await this.pokey.enableAudio();
        btnAudio.textContent = "POKEY Audio Active";
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

    const px = Math.floor(ram[0x0560] / 2);
    const py = Math.floor(ram[0x0561] / 2);
    const dl = (ram[0x0231] << 8) | ram[0x0230];
    const lms0 = (ram[0x3C95] << 8) | ram[0x3C94];
    const timerHex = (((ram[0x009F] & 0xFF) << 8) | (ram[0x009E] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");
    const scoreHex = (((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");

    setTxt("dbg-zone", `${(ram[0x0555] & 0x0F) + 1}`);
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
    if (ram[0x0575]) items.push("SPADE");
    if (ram[0x05AF]) items.push("PLUTONIUM");
    setTxt("dbg-inv", items.length ? items.join("+") : "NONE");

    const pRegs = this.pokey.getPokeyRegs().slice(0, 8).map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    setTxt("dbg-pokey", pRegs);
  }

  startLoop() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("lockstep") === "1") {
      this.autoLoopEnabled = false;
      return;
    }

    const tick = (now) => {
      if (this.autoLoopEnabled) {
        let delta = now - this.lastTime;
        if (delta > 100) delta = 100;
        this.lastTime = now;
        this.accumulator += delta;

        while (this.accumulator >= this.FRAME_DT) {
          this.interactiveTick++;
          // Throttle continuous directional movement to every 4 PAL VBI frames (80 ms) in interactive play
          const mask = (this.interactiveTick % 4 === 0) ? null : (this.inputBridge.oneShotMask);
          if (mask !== null) {
            this.inputBridge.oneShotMask = 0;
          }
          this.api.stepFrame(mask);
          this.accumulator -= this.FRAME_DT;
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
  app.startLoop();
}

bootstrap();

})();
