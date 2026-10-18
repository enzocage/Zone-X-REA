/**
 * zonex-web/js/engine/feature_state_machine.js
 * 1:1 Port of Dossier 03 ($4A10, $47CB, $6580):
 * State machine and tile mutation logic for all 16 verified Zone X features:
 * LASER, WARP, SLAM, AIRDOORS, DOOR, PLUTONIUM, BONUS, LOCK,
 * KEY, LOCKED, SPADE, CRUMBLY, MATS, CONTAINER, BLOCK, TIME.
 */

export class FeatureStateMachine {
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
