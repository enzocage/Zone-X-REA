/**
 * zonex-web/js/engine/zone_loader.js
 * 1:1 Port of Dossier 01 ($623A, $45DD, $4639, $4462):
 * Loads Zone 1..12 into the 64KB RAM state ($0B00 logical map, $1C00 screen buffer,
 * $3C93 25 LMS pointers, $A2C4 per-zone colors, HUD lines, and robot tables).
 */

export class ZoneLoader {
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
