/**
 * zonex-web/js/engine/player_physics.js
 * 1:1 Port of Dossier 02 & 03 ($4800, $4846, $4B30, $4C50, $4DCC, $4462):
 * Handles player movement across the 62x32 ($3E x $20) playfield, collision detection,
 * fine/coarse scrolling across the 25 LMS rows at $3C94, CH ITEM, and MATS.
 */

import { INPUT_BITS } from "../hardware/input_bridge.js";
import { MAP_WIDTH, MAP_HEIGHT } from "./memory_state.js";

const SOLID_TILES = new Set([
  1,  // WALL (█)
  2,  // WARP_L (▌)
  3,  // WARP_R (▐)
  5,  // CAPSULE / BLOCK (())
  10, // LASER_LU (L/)
  13, // LASER_U (L)
  14, // LASER_DR (l/)
  15, // LASER_D (l)
  24, // LOCKED door (unless player has KEY)
  25, // CRUMBLY (▒) (unless player has SPADE)
]);

export class PlayerPhysics {
  constructor(memory, featureMachine, pokey) {
    this.memory = memory;
    this.featureMachine = featureMachine;
    this.pokey = pokey;
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

    if (inputMask & INPUT_BITS.CH_ITEM) {
      this.memory.selectedItemSlot = (this.memory.selectedItemSlot + 1) % 3;
      this.pokey.triggerSfx(2, 1, 6, 1);
    }

    let px = Math.floor(ram[0x0560] / 2) - 1;
    let py = Math.floor(ram[0x0561] / 2);

    // FIRE action: place or pick up MATS (Tile 17 = 'M')
    if (inputMask & INPUT_BITS.FIRE) {
      const curTile = this.memory.getTile(px, py);
      if (curTile === 17) {
        this.memory.writeTileAndScreen(px, py, 0);
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
      } else if (curTile === 0 && ram[0x0576] > 0) {
        this.memory.writeTileAndScreen(px, py, 17);
        ram[0x0576] = (ram[0x0576] - 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(3, 1, 8, 2);
      }
    }

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
    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return;

    const targetTile = this.memory.getTile(nx, ny);
    const canEnter = this.featureMachine.tryInteractTile(nx, ny, dx, dy, targetTile);
    if (!canEnter && SOLID_TILES.has(targetTile)) {
      return;
    }

    px = nx;
    py = ny;
    const newOffset = (py * MAP_WIDTH + px) & 0xFFFF;
    ram[0x055B] = newOffset & 0xFF;
    ram[0x055C] = (newOffset >> 8) & 0xFF;
    ram[0x0560] = ((px + 1) * 2) & 0xFF;
    ram[0x0561] = (py * 2) & 0xFF;
    ram[0x055E] = ((ram[0x055E] || 0) + 1) % 3;

    ram[0xD404] = (0x06 + dx * 2) & 0x0F;
    ram[0xD405] = (0x06 + dy * 2) & 0x0F;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(1, 0, 4, 1);

    this.featureMachine.onEnterTile(px, py);
  }
}
