/**
 * zonex-web/js/engine/screens.js
 * Configures the 64KB RAM state for Title Screen ($3CE5), Feature Showcase ($939C),
 * and Hall of Fame ($3CE5) so AnticGtiaRenderer renders them bit-accurately.
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
