/**
 * src/models/LevelMap.js
 * Clean object-oriented domain model for a 62x32 Zone X Level Map.
 * Provides chainable geometry builders, Warp Gate placement, validation, and JSON serialization.
 */

import { GridConfig, TileType, PalettePreset } from "../config/Constants.js";

export class LevelMap {
  constructor({
    zoneNumber = 13,
    title = "CUSTOM ZONE",
    subtitle = "",
    palette = PalettePreset.TWIN_REACTORS,
    fillTile = TileType.FLOOR,
    playerSpawn = { x: 6, y: 6 },
    exitPortal = { x: 55, y: 25 },
    warpGates = [],
    tiles = null,
  } = {}) {
    this.width = GridConfig.WIDTH;
    this.height = GridConfig.HEIGHT;
    this.zoneNumber = zoneNumber;
    this.title = title;
    this.subtitle = subtitle;
    this.palette = Array.isArray(palette)
      ? palette.slice(0, 4)
      : PalettePreset.TWIN_REACTORS.slice();
    this.playerSpawn = { x: playerSpawn.x | 0, y: playerSpawn.y | 0 };
    this.exitPortal = { x: exitPortal.x | 0, y: exitPortal.y | 0 };
    this.warpGates = Array.isArray(warpGates) ? warpGates.map((w) => ({ ...w })) : [];
    this.tiles = new Uint8Array(this.width * this.height);

    if (tiles && tiles.length === this.tiles.length) {
      this.tiles.set(tiles);
    } else {
      this.initializeBlankWithOuterWalls(fillTile);
    }
  }

  initializeBlankWithOuterWalls(fillTile = TileType.FLOOR) {
    this.tiles.fill(fillTile & 0x1F);
    for (let x = 0; x < this.width; x++) {
      this.tiles[0 * this.width + x] = TileType.WALL;
      this.tiles[(this.height - 1) * this.width + x] = TileType.WALL;
    }
    for (let y = 0; y < this.height; y++) {
      this.tiles[y * this.width + 0] = TileType.WALL;
      this.tiles[y * this.width + (this.width - 1)] = TileType.WALL;
    }
    return this;
  }

  isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  getTile(x, y) {
    if (!this.isInBounds(x, y)) return TileType.WALL;
    return this.tiles[y * this.width + x];
  }

  setTile(x, y, tileType) {
    if (!this.isInBounds(x, y)) return this;
    this.tiles[y * this.width + x] = tileType & 0x1F;
    return this;
  }

  fillRect(x0, y0, x1, y1, tileType = TileType.FLOOR) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        this.setTile(x, y, tileType);
      }
    }
    return this;
  }

  drawBorder(x0, y0, x1, y1, tileType = TileType.WALL) {
    for (let x = x0; x <= x1; x++) {
      this.setTile(x, y0, tileType);
      this.setTile(x, y1, tileType);
    }
    for (let y = y0; y <= y1; y++) {
      this.setTile(x0, y, tileType);
      this.setTile(x1, y, tileType);
    }
    return this;
  }

  drawHorizontalLine(x0, x1, y, tileType) {
    const minX = Math.min(x0, x1);
    const maxX = Math.max(x0, x1);
    for (let x = minX; x <= maxX; x++) {
      this.setTile(x, y, tileType);
    }
    return this;
  }

  drawVerticalLine(x, y0, y1, tileType) {
    const minY = Math.min(y0, y1);
    const maxY = Math.max(y0, y1);
    for (let y = minY; y <= maxY; y++) {
      this.setTile(x, y, tileType);
    }
    return this;
  }

  placeWarpStructure(centerX, y) {
    this.setTile(centerX - 1, y, TileType.WARP_FRAME_LEFT);
    this.setTile(centerX, y, TileType.WARP_PAD);
    this.setTile(centerX + 1, y, TileType.WARP_FRAME_RIGHT);
    return this;
  }

  addWarpLink(srcX, srcY, dstX, dstY) {
    this.warpGates.push({
      src_x: srcX | 0,
      src_y: srcY | 0,
      dst_x: dstX | 0,
      dst_y: dstY | 0,
    });
    return this;
  }

  setPlayerSpawn(x, y) {
    if (!this.isInBounds(x, y)) return this;
    this.playerSpawn = { x: x | 0, y: y | 0 };
    this.setTile(this.playerSpawn.x, this.playerSpawn.y, TileType.PLAYER_START);
    return this;
  }

  setExitPortal(x, y) {
    if (!this.isInBounds(x, y)) return this;
    this.exitPortal = { x: x | 0, y: y | 0 };
    this.setTile(this.exitPortal.x, this.exitPortal.y, TileType.EXIT_PORTAL);
    return this;
  }

  toZoneData() {
    this.setTile(this.playerSpawn.x, this.playerSpawn.y, TileType.PLAYER_START);
    this.setTile(this.exitPortal.x, this.exitPortal.y, TileType.EXIT_PORTAL);

    let plutoniumCount = 0;
    let containerCount = 0;
    let doorCount = 0;
    const robots = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.tiles[y * this.width + x];
        if (t === TileType.PLUTONIUM) plutoniumCount++;
        else if (t === TileType.CONTAINER) containerCount++;
        else if (t === TileType.DOOR_MARKER_A || t === TileType.LOCKED_DOOR) doorCount++;
        else if (t === TileType.ALIEN_DROID_NORMAL || t === TileType.ALIEN_DROID_FAST) {
          const etype = t === TileType.ALIEN_DROID_NORMAL ? 0 : 1;
          robots.push({
            x,
            y,
            type: etype,
            dir: (etype & 1) * 2 + 1,
            speed: etype === 0 ? 2 : 3,
          });
        }
      }
    }

    return {
      zone: this.zoneNumber,
      title: this.title,
      subtitle: this.subtitle,
      isBonus: true,
      internal_zone_idx: (this.zoneNumber - 1) % 12,
      difficulty: 0,
      width: this.width,
      height: this.height,
      fill_tile: TileType.FLOOR,
      colors: this.palette.slice(0, 4),
      plutonium_count: Math.max(1, plutoniumCount),
      container_count: Math.max(1, containerCount),
      door_count: doorCount,
      player_start: {
        x: this.playerSpawn.x,
        y: this.playerSpawn.y,
        offset: this.playerSpawn.y * this.width + this.playerSpawn.x,
      },
      exit_pos: {
        x: this.exitPortal.x,
        y: this.exitPortal.y,
        offset: this.exitPortal.y * this.width + this.exitPortal.x,
      },
      warps: this.warpGates.map((w) => ({ ...w })),
      robots,
      playfield_bytes: Array.from(this.tiles),
    };
  }
}
