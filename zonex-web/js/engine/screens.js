/**
 * zonex-web/js/engine/screens.js
 * Configures the 64KB RAM state for Title Screen ($3CE5, DLI $6978),
 * Features Showcase ($939C, DLI $9670), and Hall of Fame ($8F08)
 * matching the 6502 setup routines ($5C55..$5CA1, $9325..$9351, $9072..$9195) 1:1.
 */

export class ScreenManager {
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
      // $6069..$60A5: SDLSTL/H = $3CE5, VDSLST = $6978, CHBAS = $40
      ram[0x0230] = 0xE5;
      ram[0x0231] = 0x3C;
      ram[0xD402] = 0xE5;
      ram[0xD403] = 0x3C;
      ram[0x0200] = 0x78;
      ram[0x0201] = 0x69;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      // Top colors ($606E..$607C): COLPF0=$B8, COLPF1=$B4, COLPF2=$0E, COLPF3=$D8, COLBK=$00
      ram[0x02C4] = 0xB8;
      ram[0x02C5] = 0xB4;
      ram[0x02C6] = 0x0E;
      ram[0x02C7] = 0xD8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];

      // $5C55..$5CA1: Populate menu text buffers in $0414..$04B3
      for (let y = 0; y < 0x28; y++) {
        ram[0x0464 + y] = ram[0x3E03 + y];
        ram[0x0400 + y] = 0x00;
      }
      for (let y = 0; y < 0x14; y++) {
        ram[0x043C + y] = (ram[0x3DB3 + y] + 0x60) & 0xFF;
        ram[0x0450 + y] = (ram[0x3DC7 + y] + 0x60) & 0xFF;
      }
      for (let y = 0; y < 0x28; y++) {
        ram[0x0414 + y] = (ram[0x3DDB + y] + 0xA0) & 0xFF;
        ram[0x048C + y] = (ram[0x3E2B + y] + 0x20) & 0xFF;
      }
    } else if (screenName === "features") {
      // $9325..$9351: SDLSTL/H = $939C, VDSLST = $9670, CHBAS = $40
      ram[0x0230] = 0x9C;
      ram[0x0231] = 0x93;
      ram[0xD402] = 0x9C;
      ram[0xD403] = 0x93;
      ram[0x0200] = 0x70;
      ram[0x0201] = 0x96;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      // Colors ($9347..$9351 from $9378..$937B): COLPF0=$44, COLPF1=$4A, COLPF2=$00, COLPF3=$C8, COLBK=$00
      ram[0x02C4] = 0x44;
      ram[0x02C5] = 0x4A;
      ram[0x02C6] = 0x00;
      ram[0x02C7] = 0xC8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];
    } else if (screenName === "halloffame") {
      // $8F7C..$8F94 & $9072..$9195: SDLSTL/H = $8F08, CHBAS = $40
      ram[0x0230] = 0x08;
      ram[0x0231] = 0x8F;
      ram[0xD402] = 0x08;
      ram[0xD403] = 0x8F;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      ram[0x02C4] = 0x44;
      ram[0x02C5] = 0x4A;
      ram[0x02C6] = 0x86;
      ram[0x02C7] = 0xC6;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];

      // $9072..$9129: Build 12 Hall of Fame rows (20 bytes each) at $0B00..$0BEF
      for (let x = 0; x < 12; x++) {
        const rowBase = 0x0B00 + x * 20;
        for (let c = 0; c < 20; c++) ram[rowBase + c] = 0x00;
        ram[rowBase + 0] = 0x0B;
        ram[rowBase + 19] = 0x0C;
        ram[rowBase + 1] = (ram[0x8EE5 + x * 2] + 0x20) & 0xFF;
        ram[rowBase + 2] = (ram[0x8EE5 + x * 2 + 1] + 0x20) & 0xFF;
        ram[rowBase + 3] = 0x00;
        for (let y = 0; y < 8; y++) {
          ram[rowBase + 4 + y] = ram[0x8EFD + y];
        }
        ram[rowBase + 15] = 0xD1;
        ram[rowBase + 16] = 0xD0;
        ram[rowBase + 17] = 0xD0;
        ram[rowBase + 18] = 0xD0;
      }

      // $912A..$9182: Header ($043C = "   |HALL OF FAME|   ") & Footer ($0450 = "|LAST SCORE       0|")
      for (let x = 0; x < 20; x++) {
        ram[0x043C + x] = (ram[0x3D9F + x] + 0x20) & 0xFF;
        ram[0x0450 + x] = (ram[0x8ED1 + x] + 0x20) & 0xFF;
      }
      ram[0x043F] = 0x0B;
      ram[0x044C] = 0x0C;
      ram[0x0450] = 0x0B;
      ram[0x0450 + 18] = 0xD0;
      ram[0x0463] = 0x0C;
    } else {
      this.activeScreen = "ingame";
      this.zoneLoader.loadZone(1, 1);
    }
  }
}
