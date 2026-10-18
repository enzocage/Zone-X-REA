/**
 * zonex-web/js/engine/memory_state.js
 * 64KB Atari 800XL RAM Mirror (Uint8Array(65536)) + MOS 6502 Decimal Mode (SED/CLD) BCD Arithmetic.
 * Implements exact 62x32 ($3E x $20) logical playfield and 128x64 character screen buffer ($428E).
 */

export const MAP_WIDTH = 62;
export const MAP_HEIGHT = 32;

export function bcdAdd8(a, b, carryIn = 0) {
  let lo = (a & 0x0F) + (b & 0x0F) + (carryIn ? 1 : 0);
  if (lo > 9) lo += 6;
  let hi = (a >> 4) + (b >> 4) + (lo > 0x0F ? 1 : 0);
  if (hi > 9) hi += 6;
  return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), carry: hi > 0x0F ? 1 : 0 };
}

export function bcdSub8(a, b, borrowIn = 0) {
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

export class MemoryState {
  constructor(bundle) {
    this.ram = new Uint8Array(65536);
    this.bundle = bundle;
    this.paused = false;
    this.outOfTime = false;
    this.selectedItemSlot = 0;
    this.initStaticRomTables();
  }

  initStaticRomTables() {
    const { charsets, meta_tiles, screens_data } = this.bundle;

    const font1800 = charsets.in_game;
    for (let i = 0; i < font1800.length; i++) {
      this.ram[0x706C + i] = font1800[i];
      this.ram[0x1800 + i] = font1800[i];
    }

    const font4000 = charsets.hud_4000 || charsets.in_game;
    for (let i = 0; i < font4000.length; i++) {
      this.ram[0x4000 + i] = font4000[i];
    }

    this.ram[0x02F4] = 0x40;
    this.ram[0xD409] = 0x40;

    for (let t = 0; t < meta_tiles.length; t++) {
      const chars = meta_tiles[t].chars;
      for (let c = 0; c < 4; c++) {
        this.ram[0x6D42 + t * 4 + c] = chars[c];
      }
    }

    if (screens_data) {
      const copyAt = (addr, arr) => {
        if (!arr) return;
        for (let i = 0; i < arr.length; i++) {
          this.ram[addr + i] = arr[i];
        }
      };
      copyAt(0x3E7B, screens_data.dli_chbase_3e7b || [0x18, 0x40]);
      copyAt(0x8000, screens_data.title_bitmap_8000);
      copyAt(0x3D9F, screens_data.title_strings_3d9f);
      copyAt(0x8E80, screens_data.hof_data_8e80);
      copyAt(0x3DB3, screens_data.title_text_3db3);
      copyAt(0x3E53, screens_data.hud_line1_3e53);
      copyAt(0x3E67, screens_data.hud_line2_3e67);
      copyAt(0x3C8B, screens_data.dl_ingame_3c8b);
      copyAt(0x3CE5, screens_data.dl_menu_3ce5);
      copyAt(0x939C, screens_data.dl_features_939c);
      copyAt(0x93DC, screens_data.features_screen_mem_93dc);
    }
  }

  initPlayfieldBorders() {
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      const r0 = 0x1C00 + (ty * 2) * 128;
      const r1 = 0x1C00 + (ty * 2 + 1) * 128;
      this.ram[r0] = 0x01;
      this.ram[r0 + 1] = 0x02;
      this.ram[r1] = 0x03;
      this.ram[r1 + 1] = 0x01;
      this.ram[r0 + 126] = 0x01;
      this.ram[r0 + 127] = 0x02;
      this.ram[r1 + 126] = 0x03;
      this.ram[r1 + 127] = 0x01;
    }
  }

  /**
   * 1:1 Port of $428E & $45AE: Writes logical tileId to $0B00 + ty*62 + tx
   * and expands its 2x2 characters into the $1C00..$3BFF playfield buffer at col (tx + 1) * 2.
   */
  writeTileAndScreen(tx, ty, tileId) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
    const t = tileId & 0x1F;
    this.ram[0x0B00 + ty * MAP_WIDTH + tx] = t;

    const metaBase = 0x6D42 + t * 4;
    const c0 = this.ram[metaBase];
    const c1 = this.ram[metaBase + 1];
    const c2 = this.ram[metaBase + 2];
    const c3 = this.ram[metaBase + 3];

    const colChar = (tx + 1) * 2;
    const row0Addr = 0x1C00 + (ty * 2) * 128 + colChar;
    const row1Addr = 0x1C00 + (ty * 2 + 1) * 128 + colChar;
    this.ram[row0Addr] = c0;
    this.ram[row0Addr + 1] = c1;
    this.ram[row1Addr] = c2;
    this.ram[row1Addr + 1] = c3;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return 1; // WALL
    return this.ram[0x0B00 + ty * MAP_WIDTH + tx] & 0x1F;
  }

  /**
   * 1:1 Port of $4462..$44DC: Updates the 25 LMS pointers at $3C94..$3CDC
   * based on player character coordinates ($0560 = (tx+1)*2, $0561 = ty*2).
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

  updateCameraLmsFromPlayer() {
    this.updateCameraLmsPointers();
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

  addScoreBcd(lowByteBcd, highByteBcd = 0) {
    const r0 = bcdAdd8(this.ram[0x00C1], lowByteBcd, 0);
    const r1 = bcdAdd8(this.ram[0x00C2], highByteBcd, r0.carry);
    this.ram[0x00C1] = r0.result;
    this.ram[0x00C2] = r1.result;
    this.syncHudText();
  }

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
    const tHi = this.ram[0x009F] & 0x0F;
    const tMid = (this.ram[0x009E] >> 4) & 0x0F;
    const tLo = this.ram[0x009E] & 0x0F;
    this.ram[0x0400 + 16] = 0x50 + tHi;
    this.ram[0x0400 + 17] = 0x50 + tMid;
    this.ram[0x0400 + 18] = 0x50 + tLo;

    for (let i = 0; i < 20; i++) {
      this.ram[0x0428 + i] = 0x00;
    }
    let x = 0;
    if (this.ram[0x0574]) this.ram[0x0428 + x++] = 0xC6;
    if (this.ram[0x0575]) this.ram[0x0428 + x++] = 0x84;
    if (this.ram[0x05AF]) this.ram[0x0428 + x++] = 0xC3;
    const mats = this.ram[0x0576];
    for (let m = 0; m < mats && x < 10; m++) {
      this.ram[0x0428 + x++] = 0x85;
    }
    const plut = this.ram[0x0598];
    for (let p = 0; p < plut && x + p < 20; p++) {
      this.ram[0x0428 + x + p] = 0x83;
    }
  }
}
