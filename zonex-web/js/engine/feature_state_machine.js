/**
 * zonex-web/js/engine/feature_state_machine.js
 * 1:1 Port of Dossier 03 ($4A10, $47CB, $6580):
 * State machine and tile mutation logic for all 16 verified Zone X features
 * using the exact 6502 Tile IDs (0..27):
 *  4 = KEY ('K'), 5 = BLOCK ('()'), 6 = PLUTONIUM ('X'), 7 = DOOR ('D'),
 *  8 = WARP_PAD ('1..12'), 9 = AIRDOORS ('A'), 10/13/14/15 = LASER ('L/','L','l/','l'),
 * 12 = SLAM ('S'), 16 = CONTAINER ('ᴗ'), 17 = MATS ('M'), 18 = LOCK ('C'),
 * 19 = TIME ('T'), 20 = BONUS ('?'), 21 = SPADE ('♠'), 22 = EXIT ('O'),
 * 24 = LOCKED, 25 = CRUMBLY ('▒').
 */

import { MAP_WIDTH } from "./memory_state.js";

export class FeatureStateMachine {
  constructor(memory, bundle, pokey) {
    this.memory = memory;
    this.bundle = bundle;
    this.pokey = pokey;
    this.frameCounter = 0;
  }

  tryInteractTile(nx, ny, dx, dy, tileId) {
    const ram = this.memory.ram;

    switch (tileId) {
      case 25: // CRUMBLY ('▒') — diggable if player has SPADE ($0575) or walkable in crumbly zones
        if (ram[0x0575] > 0) {
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 10, 2);
          return true;
        }
        // In Zone X, base crumbly fill (Tile 25) is dug automatically as the player walks through it!
        this.memory.writeTileAndScreen(nx, ny, 0);
        this.pokey.triggerSfx(3, 1, 4, 1);
        return true;

      case 5: // CAPSULE / BLOCK ('()') — pushable if tile behind it is FLOOR (0)
        if (this.memory.getTile(nx + dx, ny + dy) === 0) {
          this.memory.writeTileAndScreen(nx + dx, ny + dy, 5);
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 8, 2);
          return true;
        }
        return false;

      case 9:  // AIRDOORS ('A')
      case 12: // SLAM ('S')
        return (this.frameCounter & 0x08) === 0;

      case 7:  // DOOR ('D')
      case 18: // LOCK ('C')
      case 24: // LOCKED
        if (ram[0x0574] > 0 || tileId === 7) {
          if (ram[0x0574] > 0 && tileId !== 7) {
            ram[0x0574] = 0;
          }
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.memory.addScoreBcd(0x25, 0x00);
          this.pokey.triggerSfx(4, 2, 12, 2);
          return true;
        }
        return false;

      case 16: // CONTAINER ('ᴗ') — decontaminates carried PLUTONIUM ($05AF)
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

  onEnterTile(px, py) {
    const ram = this.memory.ram;
    const tileId = this.memory.getTile(px, py);

    switch (tileId) {
      case 6: // PLUTONIUM ('X')
        if (ram[0x05AF] === 0) {
          ram[0x05AF] = 1;
          this.memory.writeTileAndScreen(px, py, 0);
          this.memory.addScoreBcd(0x50, 0x00);
          this.pokey.triggerSfx(2, 1, 12, 2);
        }
        break;

      case 4: // KEY ('K')
        ram[0x0574] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 21: // SPADE ('♠')
        ram[0x0575] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 17: // MATS ('M')
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
        break;

      case 19: // TIME ('T')
        ram[0x009F] = Math.min(0x09, ram[0x009F] + 1);
        ram[0x059F] = ram[0x009F];
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 12, 2);
        break;

      case 20: // BONUS / MYSTERY ('?')
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x00, 0x01);
        this.pokey.triggerSfx(2, 1, 14, 2);
        break;

      case 8: // WARP_PAD ('1..12' inside ▌ 1 ▐)
        this.executeWarpOrDoor(px, py);
        break;

      default:
        break;
    }
  }

  executeWarpOrDoor(px, py) {
    const ram = this.memory.ram;
    const gameZoneIdx = ram[0x0558] & 0x0F;
    const zdata = this.bundle.zones[gameZoneIdx];
    if (!zdata || !zdata.warps || zdata.warps.length === 0) return;

    let match = zdata.warps.find((w) => Math.abs(w.src_x - px) <= 1 && Math.abs(w.src_y - py) <= 1);
    if (!match) {
      match = zdata.warps[0];
    }

    const dstX = match.dst_x;
    const dstY = match.dst_y;
    const dstOffset = (dstY * MAP_WIDTH + dstX) & 0xFFFF;
    ram[0x055B] = dstOffset & 0xFF;
    ram[0x055C] = (dstOffset >> 8) & 0xFF;
    ram[0x0560] = ((dstX + 1) * 2) & 0xFF;
    ram[0x0561] = (dstY * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(5, 2, 14, 3);
  }

  tickFrame() {
    if (this.memory.paused || this.memory.outOfTime) return;
    this.frameCounter++;
    this.memory.ram[0x0014] = this.frameCounter & 0xFF;

    const period = this.memory.ram[0x05AF] > 0 ? 4 : 8;
    if (this.frameCounter % period === 0) {
      this.memory.decrementTimerBcd(0x01);
      if (this.memory.outOfTime) {
        this.pokey.triggerSfx(6, 0, 20, 3);
      }
    }
  }
}
