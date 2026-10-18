/**
 * @fileoverview Butter-Smooth 60fps Sub-Frame Animation, Entity Interpolation,
 * 3D Particle Physics, and Gameplay Event Detector for Zone X GFX Redesign.
 */

import { GridConfig, SystemAddressMap, TileType } from "../config/Constants.js";

export class SmoothAnimationTracker {
  /**
   * @param {import("../audio/FmSynthesizerEngine.js").FmSynthesizerEngine} fmSynth
   */
  constructor(fmSynth) {
    this.fmSynth = fmSynth;
    this.time = 0;

    // Smoothly interpolated player state in 3D tile space (X: 0..61, Z: 0..31)
    this.player = {
      x: 30,
      z: 15,
      targetX: 30,
      targetZ: 15,
      facingAngle: 0, // radians (0 = +Z South, PI = -Z North, PI/2 = +X East, -PI/2 = -X West)
      targetAngle: 0,
      walkCycle: 0,
      strideAmplitude: 0,
      bobY: 0,
      hurtFlash: 0,
      teleportFlash: 0,
      plutoniumGlow: 0,
    };

    // Smoothly interpolated 3D camera target
    this.camera = {
      x: 30,
      z: 15,
      pitchDeg: 54, // Bird's-eye angle (90 = pure top-down, 45 = isometric tilt)
      distance: 14.5,
      fovDeg: 44,
      preset: "birdseye_tactical",
    };

    /**
     * Smoothly interpolated Alien Droid states keyed by slot index (0..31).
     * @type {Array<{
     *   active: boolean,
     *   type: number,
     *   x: number,
     *   z: number,
     *   targetX: number,
     *   targetZ: number,
     *   facingAngle: number,
     *   ringSpin: number,
     *   bankAngle: number
     * }>}
     */
    this.droids = Array.from({ length: 120 }, () => ({
      active: false,
      type: 0,
      x: 0,
      z: 0,
      targetX: 0,
      targetZ: 0,
      facingAngle: 0,
      ringSpin: 0,
      bankAngle: 0,
    }));

    /**
     * Smoothly interpolated laser beam intensity (0..1) per tile index.
     * @type {Float32Array}
     */
    this.laserIntensity = new Float32Array(GridConfig.TOTAL_TILES);

    /**
     * Snapshot of previous frame's effective tile states for diff/event detection.
     * @type {Uint8Array}
     */
    this.prevTileOccupied = new Uint8Array(GridConfig.TOTAL_TILES);
    /** @type {Uint8Array} */
    this.prevLogicalTiles = new Uint8Array(GridConfig.TOTAL_TILES);

    this.initializedZone = -1;
    this.prevLives = -1;
    this.prevPlutonium = -1;
    this.prevContainers = -1;
    this.prevHasKey = 0;
    this.prevHasMask = 0;
    this.prevHasSpade = 0;
    this.prevMatCount = 0;

    /**
     * Active 3D Mesh Particles (crystalline shards, plasma sparks, radiation embers).
     * @type {Array<{
     *   x: number, y: number, z: number,
     *   vx: number, vy: number, vz: number,
     *   scale: number, rot: number, vrot: number,
     *   color: number[], life: number, maxLife: number, gravity: number
     * }>}
     */
    this.particles = [];

    /**
     * Active 3D Expanding Shockwave Torus Rings.
     * @type {Array<{
     *   x: number, y: number, z: number,
     *   radius: number, maxRadius: number,
     *   color: number[], life: number, maxLife: number
     * }>}
     */
    this.shockwaves = [];
  }

  /**
   * Selects a 3D camera perspective preset.
   * @param {"birdseye_tactical"|"action_close"|"isometric_wide"|"topdown_ortho"} preset
   */
  setCameraPreset(preset) {
    this.camera.preset = preset;
    if (preset === "birdseye_tactical") {
      this.camera.pitchDeg = 55;
      this.camera.distance = 14.5;
      this.camera.fovDeg = 44;
    } else if (preset === "action_close") {
      this.camera.pitchDeg = 44;
      this.camera.distance = 10.2;
      this.camera.fovDeg = 48;
    } else if (preset === "isometric_wide") {
      this.camera.pitchDeg = 50;
      this.camera.distance = 20.5;
      this.camera.fovDeg = 40;
    } else if (preset === "topdown_ortho") {
      this.camera.pitchDeg = 82;
      this.camera.distance = 16.5;
      this.camera.fovDeg = 42;
    }
  }

  /**
   * Adjusts camera zoom distance.
   * @param {number} delta
   */
  adjustZoom(delta) {
    this.camera.distance = Math.max(7.5, Math.min(28.0, this.camera.distance + delta));
  }

  /**
   * Adjusts camera tilt pitch angle in degrees.
   * @param {number} deltaDeg
   */
  adjustPitch(deltaDeg) {
    this.camera.pitchDeg = Math.max(32, Math.min(86, this.camera.pitchDeg + deltaDeg));
  }

  /**
   * Spawns a 3D particle burst at tile coordinates (tx, ty).
   */
  spawnParticleBurst(tx, tz, count, color, speed = 3.2, yBase = 0.35, gravity = 7.5, scale = 1.0) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length > 360) this.particles.shift();
      const angle = Math.random() * Math.PI * 2;
      const elev = (Math.random() * 0.7 + 0.15) * Math.PI * 0.5;
      const spd = speed * (0.45 + Math.random() * 0.75);
      this.particles.push({
        x: tx + (Math.random() - 0.5) * 0.35,
        y: yBase + Math.random() * 0.2,
        z: tz + (Math.random() - 0.5) * 0.35,
        vx: Math.cos(angle) * Math.cos(elev) * spd,
        vy: Math.sin(elev) * spd + 1.2,
        vz: Math.sin(angle) * Math.cos(elev) * spd,
        scale: scale * (0.65 + Math.random() * 0.7),
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 12,
        color,
        life: 0,
        maxLife: 0.38 + Math.random() * 0.35,
        gravity,
      });
    }
  }

  /**
   * Spawns an expanding 3D shockwave ring at (tx, tz).
   */
  spawnShockwave(tx, tz, color, maxRadius = 2.4, duration = 0.48, y = 0.18) {
    if (this.shockwaves.length > 24) this.shockwaves.shift();
    this.shockwaves.push({
      x: tx,
      y,
      z: tz,
      radius: 0.2,
      maxRadius,
      color,
      life: 0,
      maxLife: duration,
    });
  }

  /**
   * Determines whether a tile at (tx, ty) still has visible graphics in playfield RAM
   * (`0x1C00`). When an item is collected or dirt is dug, the 6502 engine clears the
   * 2x2 character block in `0x1C00` to zeros.
   */
  isTileVisuallyPresent(ram, tx, ty) {
    const charCol = (tx + 1) * 2;
    const r0 = 0x1c00 + ty * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
    const r1 = r0 + GridConfig.PLAYFIELD_ROW_STRIDE;
    return (ram[r0] | ram[r0 + 1] | ram[r1] | ram[r1 + 1]) !== 0;
  }

  /**
   * Resets tracking snapshot when a new Zone starts or respawns.
   */
  resetZoneSnapshot(ram) {
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;
    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const idx = ty * W + tx;
        const t = ram[0x0b00 + idx] & 0x1f;
        this.prevLogicalTiles[idx] = t;
        const vis = this.isTileVisuallyPresent(ram, tx, ty) ? 1 : 0;
        this.prevTileOccupied[idx] = vis;
        this.laserIntensity[idx] = vis ? 1.0 : 0.0;
      }
    }

    const rawX = Math.max(0, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 0.5);
    const rawZ = Math.max(0, ram[SystemAddressMap.PLAYER_CHAR_Y] * 0.5);
    this.player.x = rawX;
    this.player.z = rawZ;
    this.player.targetX = rawX;
    this.player.targetZ = rawZ;
    this.camera.x = rawX;
    this.camera.z = rawZ;

    this.prevLives = ram[SystemAddressMap.LIVES_COUNT];
    this.prevPlutonium = ram[SystemAddressMap.PLUTONIUM_REMAINING];
    this.prevContainers = ram[SystemAddressMap.CONTAINERS_REMAINING];
    this.prevHasKey = ram[SystemAddressMap.INV_HAS_KEY];
    this.prevHasMask = ram[SystemAddressMap.INV_HAS_MASK];
    this.prevHasSpade = ram[SystemAddressMap.INV_HAS_SPADE];
    this.prevMatCount = ram[SystemAddressMap.INV_MAT_COUNT];
    this.initializedZone = ram[SystemAddressMap.HUD_ZONE_BCD];
  }

  /**
   * Advances all 3D animations, interpolations, particle physics, and event triggers.
   * @param {Uint8Array} ram
   * @param {number} dtSeconds
   * @param {boolean} isInGame
   */
  update(ram, dtSeconds, isInGame) {
    const dt = Math.min(0.05, Math.max(0.001, dtSeconds));
    this.time += dt;

    if (!isInGame) {
      this.initializedZone = -1;
      return;
    }

    const curZoneBcd = ram[SystemAddressMap.HUD_ZONE_BCD];
    if (this.initializedZone !== curZoneBcd) {
      this.resetZoneSnapshot(ram);
      this.spawnShockwave(this.player.x, this.player.z, [0.2, 0.95, 1.0], 3.2, 0.65);
    }

    // 1. Update & Interpolate Player Position, Facing Angle, and Walk Cycle
    const rawX = Math.max(0, Math.min(61, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 0.5));
    const rawZ = Math.max(0, Math.min(31, ram[SystemAddressMap.PLAYER_CHAR_Y] * 0.5));

    const jumpDist = Math.hypot(rawX - this.player.targetX, rawZ - this.player.targetZ);
    if (jumpDist > 3.5) {
      // Player warped via teleporter or respawned!
      this.spawnShockwave(this.player.x, this.player.z, [0.75, 0.35, 1.0], 2.8, 0.5);
      this.spawnParticleBurst(this.player.x, this.player.z, 22, [0.3, 0.95, 1.0], 4.0);
      this.player.x = rawX;
      this.player.z = rawZ;
      this.player.teleportFlash = 1.0;
      this.spawnShockwave(rawX, rawZ, [0.2, 0.95, 1.0], 3.0, 0.55);
      this.spawnParticleBurst(rawX, rawZ, 26, [0.75, 0.4, 1.0], 4.2);
      if (this.fmSynth) this.fmSynth.playTeleportSound();
    }

    const moveDx = rawX - this.player.x;
    const moveDz = rawZ - this.player.z;
    const distToTarget = Math.hypot(moveDx, moveDz);

    this.player.targetX = rawX;
    this.player.targetZ = rawZ;

    // Butter-smooth exponential position interpolation
    const lerpFactor = 1.0 - Math.exp(-22.0 * dt);
    this.player.x += moveDx * lerpFactor;
    this.player.z += moveDz * lerpFactor;

    if (distToTarget > 0.015) {
      this.player.targetAngle = Math.atan2(moveDx, moveDz);
      this.player.walkCycle += dt * 15.5;
      this.player.strideAmplitude = Math.min(1.0, this.player.strideAmplitude + dt * 10.0);
      this.player.bobY = Math.abs(Math.sin(this.player.walkCycle)) * 0.09;
      if (this.fmSynth) this.fmSynth.playFootstep();
    } else {
      this.player.strideAmplitude = Math.max(0.0, this.player.strideAmplitude - dt * 8.5);
      this.player.bobY = Math.sin(this.time * 3.2) * 0.02;
    }

    // Shortest-arc angular interpolation for player facing direction
    let angleDiff = this.player.targetAngle - this.player.facingAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.player.facingAngle += angleDiff * (1.0 - Math.exp(-18.0 * dt));

    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 2.5);
    this.player.teleportFlash = Math.max(0, this.player.teleportFlash - dt * 2.5);

    // Check if carrying hot plutonium (radiation timer counting down)
    const radLo = ram[SystemAddressMap.RADIATION_TIMER_LO];
    const radHi = ram[SystemAddressMap.RADIATION_TIMER_HI];
    const isCarryingPlutonium = radLo > 0 || radHi > 0;
    this.player.plutoniumGlow = isCarryingPlutonium
      ? 0.65 + 0.35 * Math.sin(this.time * 12.0)
      : 0.0;

    // 2. Smoothly Follow Player with 3D Camera (damped spring follow)
    const camLerp = 1.0 - Math.exp(-8.5 * dt);
    this.camera.x += (this.player.x - this.camera.x) * camLerp;
    this.camera.z += (this.player.z - this.camera.z) * camLerp;

    // 3. Detect Gameplay Events (Lives, Plutonium, Containers, Inventory, Dug Tiles)
    const curLives = ram[SystemAddressMap.LIVES_COUNT];
    if (this.prevLives !== -1 && curLives < this.prevLives) {
      this.player.hurtFlash = 1.0;
      this.spawnParticleBurst(this.player.x, this.player.z, 36, [1.0, 0.25, 0.2], 5.2, 0.4);
      this.spawnShockwave(this.player.x, this.player.z, [1.0, 0.2, 0.25], 3.8, 0.65);
      if (this.fmSynth) this.fmSynth.playPlayerDeath();
    }
    this.prevLives = curLives;

    const curPlutonium = ram[SystemAddressMap.PLUTONIUM_REMAINING];
    if (this.prevPlutonium !== -1 && curPlutonium < this.prevPlutonium) {
      this.spawnParticleBurst(this.player.x, this.player.z, 28, [0.2, 1.0, 0.65], 4.2, 0.45);
      this.spawnShockwave(this.player.x, this.player.z, [0.2, 1.0, 0.65], 2.8, 0.52);
      if (this.fmSynth) this.fmSynth.playPlutoniumPickup();
    }
    this.prevPlutonium = curPlutonium;

    const curContainers = ram[SystemAddressMap.CONTAINERS_REMAINING];
    if (this.prevContainers !== -1 && curContainers < this.prevContainers) {
      this.spawnParticleBurst(this.player.x, this.player.z, 30, [0.2, 0.9, 1.0], 4.0, 0.45);
      this.spawnShockwave(this.player.x, this.player.z, [1.0, 0.85, 0.2], 3.2, 0.58);
      if (this.fmSynth) {
        if (curContainers === 0) {
          this.fmSynth.playLevelComplete();
        } else {
          this.fmSynth.playContainerDeposit();
        }
      }
    }
    this.prevContainers = curContainers;

    const hasKey = ram[SystemAddressMap.INV_HAS_KEY];
    const hasMask = ram[SystemAddressMap.INV_HAS_MASK];
    const hasSpade = ram[SystemAddressMap.INV_HAS_SPADE];
    const matCount = ram[SystemAddressMap.INV_MAT_COUNT];
    if (
      hasKey > this.prevHasKey ||
      hasMask > this.prevHasMask ||
      hasSpade > this.prevHasSpade ||
      matCount > this.prevMatCount
    ) {
      this.spawnParticleBurst(this.player.x, this.player.z, 20, [1.0, 0.85, 0.25], 3.5, 0.4);
      this.spawnShockwave(this.player.x, this.player.z, [1.0, 0.88, 0.25], 2.2, 0.42);
      if (this.fmSynth) this.fmSynth.playItemPickup();
    }
    this.prevHasKey = hasKey;
    this.prevHasMask = hasMask;
    this.prevHasSpade = hasSpade;
    this.prevMatCount = matCount;

    // 4. Scan Map Tiles for Digging, Door Unlocks, and Smooth Laser Beam Interpolation
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;
    const laserLerp = 1.0 - Math.exp(-16.0 * dt);

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const idx = ty * W + tx;
        const origTile = this.prevLogicalTiles[idx];
        const isVis = this.isTileVisuallyPresent(ram, tx, ty) ? 1 : 0;

        if (
          origTile === TileType.LASER_DOOR_1A ||
          origTile === TileType.LASER_DOOR_1B ||
          origTile === TileType.LASER_DOOR_2A ||
          origTile === TileType.LASER_DOOR_2B
        ) {
          // Check if the inner beam characters are active
          const charCol = (tx + 1) * 2;
          const r0 = 0x1c00 + ty * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
          const beamActive = (ram[r0] !== 0 || ram[r0 + 1] !== 0) ? 1.0 : 0.0;
          this.laserIntensity[idx] += (beamActive - this.laserIntensity[idx]) * laserLerp;
        } else if (this.prevTileOccupied[idx] === 1 && isVis === 0) {
          // A tile at (tx, ty) was just dug, collected, or unlocked!
          this.prevTileOccupied[idx] = 0;
          if (origTile === TileType.CRUMBLY_DIRT) {
            this.spawnParticleBurst(tx, ty, 12, [0.68, 0.48, 0.26], 2.8, 0.25, 9.5, 0.85);
            if (this.fmSynth) this.fmSynth.playDigSound();
          } else if (origTile === TileType.LOCKED_DOOR || origTile === TileType.DOOR_MARKER_A) {
            this.spawnParticleBurst(tx, ty, 20, [1.0, 0.55, 0.2], 3.6, 0.4, 6.0, 1.0);
            this.spawnShockwave(tx, ty, [1.0, 0.6, 0.2], 2.0, 0.4);
            if (this.fmSynth) this.fmSynth.playDoorUnlock();
          } else if (origTile === TileType.EXTRA_TIME || origTile === TileType.MYSTERY_BOX) {
            this.spawnParticleBurst(tx, ty, 22, [0.4, 0.9, 1.0], 3.8, 0.4, 5.0, 1.0);
            this.spawnShockwave(tx, ty, [0.4, 0.9, 1.0], 2.4, 0.45);
            if (this.fmSynth) this.fmSynth.playItemPickup();
          }
        }
      }
    }

    // 5. Update & Smoothly Interpolate Moving Alien Patrol Droids ($0600..$06FF)
    const robotCount = Math.min(
      this.droids.length,
      ram[SystemAddressMap.ACTIVE_ROBOT_COUNT]
    );
    const droidLerp = 1.0 - Math.exp(-18.0 * dt);

    for (let i = 0; i < this.droids.length; i++) {
      const droid = this.droids[i];
      if (i >= robotCount) {
        droid.active = false;
        continue;
      }
      const base = 0x0600 + i * 8;
      const rType = ram[base + 0] & 1;
      const rActive = ram[base + 1];
      const rCharX = ram[base + 3];
      const rCharY = ram[base + 4];

      if (!rActive || rCharX < 2) {
        droid.active = false;
        continue;
      }

      const targetX = (rCharX - 2) * 0.5;
      const targetZ = rCharY * 0.5;

      if (!droid.active || Math.hypot(targetX - droid.x, targetZ - droid.z) > 4.0) {
        droid.x = targetX;
        droid.z = targetZ;
        droid.active = true;
      }

      const dx = targetX - droid.x;
      const dz = targetZ - droid.z;
      droid.type = rType;
      droid.targetX = targetX;
      droid.targetZ = targetZ;
      droid.x += dx * droidLerp;
      droid.z += dz * droidLerp;

      if (Math.hypot(dx, dz) > 0.01) {
        const targetAngle = Math.atan2(dx, dz);
        let aDiff = targetAngle - droid.facingAngle;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        droid.facingAngle += aDiff * (1.0 - Math.exp(-15.0 * dt));
      }

      droid.ringSpin += dt * (rType === 0 ? 4.5 : 8.5);
    }

    // 6. Step 3D Particles & Expanding Shockwaves
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.04) {
        p.y = 0.04;
        p.vy = Math.abs(p.vy) * 0.45;
        p.vx *= 0.75;
        p.vz *= 0.75;
      }
      p.rot += p.vrot * dt;
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life += dt;
      if (sw.life >= sw.maxLife) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      const t = sw.life / sw.maxLife;
      sw.radius = 0.2 + (sw.maxRadius - 0.2) * (1.0 - Math.pow(1.0 - t, 2.5));
    }
  }
}
