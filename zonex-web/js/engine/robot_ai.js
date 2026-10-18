/**
 * zonex-web/js/engine/robot_ai.js
 * 1:1 Port of Dossier 04 ($55D4, $5600, $5720):
 * Patrols zone robots and bounces off walls and player-laid MATS (tile_id 13..15).
 */

export class RobotAI {
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
