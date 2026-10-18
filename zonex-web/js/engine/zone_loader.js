/**
 * zonex-web/js/engine/zone_loader.js
 * 1:1 Port of Dossier 01 ($6021, $41D9, $45DD, $428E, $623A, $4DCC, $4462):
 * Loads Game Zone 1..12 into the 64KB RAM state ($0B00 62x32 logical map,
 * $1C00 128x64 screen buffer, $3C93 25 LMS pointers, and $A2C4 per-zone colors).
 */

import { MAP_WIDTH, MAP_HEIGHT } from "./memory_state.js";

export class ZoneLoader {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
  }

  loadZone(zoneNumber = 1, optionLevel = 1) {
    const gameZoneIdx = Math.max(0, Math.min(11, zoneNumber - 1));
    const diffIdx = Math.max(0, Math.min(2, optionLevel - 1));
    const levelList = (this.bundle.zones_by_level && this.bundle.zones_by_level[diffIdx])
      ? this.bundle.zones_by_level[diffIdx]
      : this.bundle.zones;
    const zdata = levelList[gameZoneIdx];
    const ram = this.memory.ram;

    this.memory.initStaticRomTables();
    this.memory.initPlayfieldBorders();
    this.memory.paused = false;
    this.memory.outOfTime = false;

    // 1. Copy unpacked 62x32 logical tile map into $0B00..$12BF and expand into $1C00..$3BFF
    const pf = zdata.playfield_bytes;
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const tileId = pf[ty * MAP_WIDTH + tx];
        this.memory.writeTileAndScreen(tx, ty, tileId);
      }
    }

    // 2. Set Zone & Player variables ($0558 = Game Zone 0..11, $0555 = internal_zone_idx)
    ram[0x0558] = gameZoneIdx;
    ram[0x0555] = zdata.internal_zone_idx !== undefined ? zdata.internal_zone_idx : gameZoneIdx;
    ram[0x0556] = diffIdx;
    ram[0x055A] = MAP_WIDTH;
    ram[0x0598] = zdata.plutonium_count;
    ram[0x05B3] = zdata.container_count;

    const startOffset = zdata.player_start.offset;
    ram[0x055B] = startOffset & 0xFF;
    ram[0x055C] = (startOffset >> 8) & 0xFF;
    ram[0x055D] = zdata.player_start.hpos;
    ram[0x055E] = zdata.player_start.sprite;
    ram[0x055F] = 0x03;

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

    // 4. Copy HUD lines ($3E53 -> $0414, $3E67 -> $0428)
    const hud1 = this.bundle.screens_data.hud_line1_3e53;
    const hud2 = this.bundle.screens_data.hud_line2_3e67;
    for (let i = 0; i < 20; i++) {
      ram[0x0400 + i] = 0x00;
      ram[0x0414 + i] = hud1[i];
      ram[0x0428 + i] = hud2[i];
    }

    const zNum = gameZoneIdx + 1;
    if (zNum >= 10) {
      ram[0x0414 + 5] = 0xD0 + Math.floor(zNum / 10);
      ram[0x0414 + 6] = 0xD0 + (zNum % 10);
    } else {
      ram[0x0414 + 5] = 0xD0 + zNum;
      ram[0x0414 + 6] = 0x00;
    }
    ram[0x0414 + 19] = 0xD3;

    ram[0x0400 + 5] = 0x50;
    ram[0x0400 + 16] = 0x59;
    ram[0x0400 + 17] = 0x55;
    ram[0x0400 + 18] = 0x50;

    for (let i = 0; i < Math.min(20, zdata.plutonium_count); i++) {
      ram[0x0428 + i] = 0x83;
    }

    // 5. Player char coords ($4DCC: $0560 = (player_x + 1) * 2, $0561 = player_y * 2)
    ram[0x0560] = ((zdata.player_start.x + 1) * 2) & 0xFF;
    ram[0x0561] = (zdata.player_start.y * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();

    ram[0x05BC] = 0x06;
    ram[0xD404] = 0x06;
    ram[0xD405] = 0x06;

    // 6. Display List Shadow Registers ($3C8B), DLI ($64CD), & Charset ($4000 -> DLI switches to $1800)
    ram[0x0230] = 0x8B;
    ram[0x0231] = 0x3C;
    ram[0xD402] = 0x8B;
    ram[0xD403] = 0x3C;
    ram[0x0200] = 0xCD;
    ram[0x0201] = 0x64;
    ram[0x02F4] = 0x40;
    ram[0xD409] = 0x40;

    // 7. Authentic per-zone GTIA color palette ($A2C4 + internal_zone_idx * 4)
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
