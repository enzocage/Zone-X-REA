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
      isExploding: false,
      explosionTimer: 0,
      explosionX: 30,
      explosionZ: 15,
      colliderX: 30,
      colliderZ: 15,
      chainPulse1: false,
      chainPulse2: false,
    };

    // Smoothly interpolated 3D camera target + explosion camera shake
    this.camera = {
      x: 30,
      z: 15,
      pitchDeg: 54, // Bird's-eye angle (90 = pure top-down, 45 = isometric tilt)
      distance: 14.5,
      fovDeg: 44,
      preset: "birdseye_tactical",
      shakeIntensity: 0,
      shakeX: 0,
      shakeY: 0,
      shakeZ: 0,
    };

    /**
     * Smoothly interpolated Alien Droid states keyed by slot index (0..119).
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
      explodedTimer: 0,
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
    this.prevDeathFlag = 0;
    this.prevPlutonium = -1;
    this.prevContainers = -1;
    this.prevHasKey = 0;
    this.prevHasMask = 0;
    this.prevHasSpade = 0;
    this.prevMatCount = 0;

    /**
     * Active 3D Mesh Particles (crystalline shards, plasma sparks, radiation embers).
     */
    this.particles = [];

    /**
     * Active 3D Expanding Shockwave Torus Rings.
     */
    this.shockwaves = [];

    /**
     * Active 3D Tumbling Debris Chunks (Astronaut helmet/torso/limbs, Alien legs/claws/tail/thorax, Door gates, Hull shrapnel).
     * @type {Array<{
     *   meshName: string,
     *   x: number, y: number, z: number,
     *   vx: number, vy: number, vz: number,
     *   rx: number, ry: number, rz: number,
     *   vrx: number, vry: number, vrz: number,
     *   scale: number, color: number[],
     *   life: number, maxLife: number, gravity: number
     * }>}
     */
    this.debrisChunks = [];

    /**
     * Active 3D Volumetric Plasma Fireballs.
     * @type {Array<{
     *   x: number, y: number, z: number,
     *   vy: number,
     *   rx: number, ry: number, rz: number,
     *   vrx: number, vry: number, vrz: number,
     *   scale: number, maxScale: number,
     *   color: number[], life: number, maxLife: number
     * }>}
     */
    this.fireballs = [];

    /**
     * Tiles temporarily shattered by a player collision explosion.
     * @type {Array<{ tx: number, tz: number, timer: number }>}
     */
    this.explodedTiles = [];
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
    if (this.shockwaves.length > 36) this.shockwaves.shift();
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
   * Spawns a 3D tumbling debris chunk (body part, helmet, spider leg, claw, door gate, or armor shrapnel)
   * with full 3-axis angular velocity and floor-bouncing physics.
   */
  spawnDebrisChunk(
    meshName,
    x,
    y,
    z,
    vx,
    vy,
    vz,
    scale = 1.0,
    color = [1, 1, 1],
    maxLife = 1.75,
    gravity = 11.5
  ) {
    if (this.debrisChunks.length > 160) this.debrisChunks.shift();
    this.debrisChunks.push({
      meshName,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      rx: (Math.random() - 0.5) * 1.2,
      ry: Math.random() * Math.PI * 2,
      rz: (Math.random() - 0.5) * 1.2,
      vrx: (Math.random() - 0.5) * 18.0,
      vry: (Math.random() - 0.5) * 18.0,
      vrz: (Math.random() - 0.5) * 18.0,
      scale,
      color,
      life: 0,
      maxLife,
      gravity,
    });
  }

  /**
   * Spawns an expanding 3D volumetric plasma fireball sphere (`explosionFireball`).
   */
  spawnFireball(x, y, z, maxScale = 2.2, duration = 0.65, color = [1.0, 0.72, 0.2], vy = 1.1) {
    if (this.fireballs.length > 48) this.fireballs.shift();
    this.fireballs.push({
      x,
      y,
      z,
      vy,
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      vrx: (Math.random() - 0.5) * 9.0,
      vry: (Math.random() - 0.5) * 9.0,
      vrz: (Math.random() - 0.5) * 9.0,
      scale: 0.25,
      maxScale,
      color,
      life: 0,
      maxLife: duration,
    });
  }

  /**
   * Returns true if a tile at (tx, tz) is currently shattered by a collision explosion.
   */
  isTileExploded(tx, tz) {
    for (let i = 0; i < this.explodedTiles.length; i++) {
      const et = this.explodedTiles[i];
      if (et.tx === tx && et.tz === tz && et.timer > 0) return true;
    }
    return false;
  }

  /**
   * Triggers a spectacular 3D disintegration & explosion of BOTH the Player (3D Astronaut)
   * AND whatever the Player collided with (Alien Hunter, Laser Door, Skull/Forcefield Hazard, or Reactor Wall).
   */
  triggerSpectacularCollisionExplosion(ram) {
    const px = this.player.x;
    const pz = this.player.z;

    this.player.isExploding = true;
    this.player.explosionTimer = 1.85;
    this.player.explosionX = px;
    this.player.explosionZ = pz;
    this.player.colliderX = px;
    this.player.colliderZ = pz;
    this.player.chainPulse1 = false;
    this.player.chainPulse2 = false;
    this.player.hurtFlash = 1.0;
    this.camera.shakeIntensity = 0.78;

    // =========================================================================
    // 1. SPECTACULAR 3D PLAYER (ASTRONAUT) DISINTEGRATION
    // =========================================================================
    // Blast the Astronaut's Helmet high into the air, spinning wildly in 3D
    this.spawnDebrisChunk(
      "playerHead",
      px,
      0.85,
      pz,
      (Math.random() - 0.5) * 3.8,
      6.6,
      (Math.random() - 0.5) * 3.8,
      1.18,
      [1.0, 0.92, 0.85],
      1.85
    );
    // Blast the Astronaut's Torso & Plutonium Backpack outward
    this.spawnDebrisChunk(
      "playerTorso",
      px,
      0.48,
      pz,
      (Math.random() - 0.5) * 3.2,
      5.2,
      (Math.random() - 0.5) * 3.2,
      1.12,
      [1.0, 0.8, 0.65],
      1.85
    );
    // Blast all 4 Astronaut Limbs (2 Arms + 2 Legs) in 4 radial directions
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2 + (Math.random() - 0.5) * 0.45;
      const spd = 3.2 + Math.random() * 2.4;
      this.spawnDebrisChunk(
        "playerLimb",
        px + Math.cos(a) * 0.18,
        0.42,
        pz + Math.sin(a) * 0.18,
        Math.cos(a) * spd,
        4.4 + Math.random() * 2.0,
        Math.sin(a) * spd,
        1.1,
        [0.95, 0.88, 1.0],
        1.8
      );
    }
    // Spawn 14 jagged 3D suit/hull shrapnel plates from the player
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
      const spd = 2.8 + Math.random() * 4.2;
      this.spawnDebrisChunk(
        "debrisArmorChunk",
        px,
        0.38 + Math.random() * 0.3,
        pz,
        Math.cos(a) * spd,
        3.5 + Math.random() * 4.2,
        Math.sin(a) * spd,
        0.85 + Math.random() * 0.55,
        i % 2 === 0 ? [1.0, 0.78, 0.35] : [0.35, 0.92, 1.0],
        1.55
      );
    }

    // Multi-layered Volumetric 3D Fireballs + Concentric Shockwaves + 75 Sparks at Player
    this.spawnFireball(px, 0.45, pz, 2.55, 0.72, [1.0, 0.88, 0.35], 1.1);
    this.spawnFireball(px + 0.18, 0.62, pz - 0.14, 1.95, 0.62, [1.0, 0.42, 0.12], 1.6);
    this.spawnFireball(px - 0.18, 0.35, pz + 0.16, 1.85, 0.58, [0.35, 0.95, 1.0], 0.9);
    this.spawnShockwave(px, pz, [1.0, 0.85, 0.25], 4.4, 0.72, 0.16);
    this.spawnShockwave(px, pz, [1.0, 0.22, 0.18], 3.4, 0.56, 0.42);
    this.spawnShockwave(px, pz, [0.25, 0.95, 1.0], 2.6, 0.45, 0.68);
    this.spawnParticleBurst(px, pz, 48, [1.0, 0.62, 0.15], 6.4, 0.45, 8.5, 1.35);
    this.spawnParticleBurst(px, pz, 32, [0.3, 0.95, 1.0], 5.6, 0.52, 7.5, 1.15);

    // =========================================================================
    // 2. DETECT & SPECTACULARLY EXPLODE WHAT THE PLAYER COLLIDED WITH!
    // =========================================================================
    let collidedWithSomething = false;

    // 2A. Check if the player collided with any active Alien Hunter (within 2.6 tiles)
    for (let i = 0; i < this.droids.length; i++) {
      const d = this.droids[i];
      if (!d.active) continue;
      const dist = Math.hypot(d.x - px, d.z - pz);
      if (dist <= 2.6) {
        collidedWithSomething = true;
        d.explodedTimer = 1.95;
        const ax = d.x;
        const az = d.z;
        this.player.colliderX = ax;
        this.player.colliderZ = az;
        const isFast = d.type !== 0;

        // Explode Alien Central Thorax / Horned Skull into the air
        this.spawnDebrisChunk(
          isFast ? "fastDroidBody" : "droidCore",
          ax,
          0.42,
          az,
          (ax - px) * 2.2 + (Math.random() - 0.5) * 2.5,
          5.8,
          (az - pz) * 2.2 + (Math.random() - 0.5) * 2.5,
          1.15,
          [1.0, 1.0, 1.0],
          1.85
        );

        // Blast all 6 Articulated Spider Legs outward in 6 directions, spinning in 3D!
        const alienTint = isFast ? [0.24, 0.44, 0.86] : [0.88, 0.90, 0.94];
        for (let leg = 0; leg < 6; leg++) {
          const la = (leg * Math.PI) / 3 + (Math.random() - 0.5) * 0.3;
          const lSpd = 3.5 + Math.random() * 3.0;
          this.spawnDebrisChunk(
            "alienSpiderLeg",
            ax + Math.cos(la) * 0.2,
            0.35,
            az + Math.sin(la) * 0.2,
            Math.cos(la) * lSpd,
            4.2 + Math.random() * 2.8,
            Math.sin(la) * lSpd,
            1.0,
            alienTint,
            1.8
          );
        }

        // Blast Mandibles or Scythe Claws + Scorpion Stinger Tail outward
        if (!isFast) {
          for (let m = 0; m < 2; m++) {
            const ma = (m === 0 ? -0.7 : 0.7) + d.facingAngle;
            this.spawnDebrisChunk(
              "alienMandible",
              ax,
              0.38,
              az,
              Math.sin(ma) * 4.2,
              4.8,
              Math.cos(ma) * 4.2,
              1.05,
              [1, 1, 1],
              1.7
            );
          }
        } else {
          for (let c = 0; c < 2; c++) {
            const ca = (c === 0 ? -0.8 : 0.8) + d.facingAngle;
            this.spawnDebrisChunk(
              "alienScytheClaw",
              ax,
              0.42,
              az,
              Math.sin(ca) * 4.6,
              5.2,
              Math.cos(ca) * 4.6,
              1.05,
              [1, 1, 1],
              1.75
            );
          }
          this.spawnDebrisChunk(
            "alienTailStinger",
            ax,
            0.52,
            az,
            (Math.random() - 0.5) * 4.0,
            6.2,
            (Math.random() - 0.5) * 4.0,
            1.05,
            [1, 1, 1],
            1.8
          );
        }

        // 14 Chitin Fragments + Volumetric Fireballs + Shockwaves at Alien
        for (let k = 0; k < 14; k++) {
          const ba = (k / 14) * Math.PI * 2;
          const bSpd = 2.6 + Math.random() * 4.0;
          this.spawnDebrisChunk(
            "alienBioChunk",
            ax,
            0.35,
            az,
            Math.cos(ba) * bSpd,
            3.4 + Math.random() * 3.8,
            Math.sin(ba) * bSpd,
            0.85 + Math.random() * 0.45,
            alienTint,
            1.6
          );
        }
        this.spawnFireball(ax, 0.45, az, 2.35, 0.70, isFast ? [0.22, 0.52, 1.0] : [0.78, 0.82, 0.90], 1.2);
        this.spawnFireball(ax, 0.6, az, 2.0, 0.62, [1.0, 0.55, 0.18], 1.6);
        this.spawnShockwave(ax, az, alienTint, 4.0, 0.65, 0.2);
        this.spawnShockwave(ax, az, [1.0, 0.65, 0.25], 3.2, 0.52, 0.45);
        this.spawnParticleBurst(ax, az, 45, alienTint, 6.0, 0.42, 8.5, 1.25);
        this.spawnParticleBurst(ax, az, 35, [1.0, 0.72, 0.25], 5.6, 0.45, 8.0, 1.15);
      }
    }

    // 2B. Check if the player collided with a Laser Door, Skull Hazard, Forcefield, or Obstacle Tile
    const baseTx = Math.round(px);
    const baseTz = Math.round(pz);
    let bestTileDist = 999;
    let hitTx = -1;
    let hitTz = -1;
    let hitTileType = 0;

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const tx = baseTx + dx;
        const tz = baseTz + dz;
        if (tx < 0 || tx >= GridConfig.WIDTH || tz < 0 || tz >= GridConfig.HEIGHT) continue;
        const t = ram[0x0b00 + tz * GridConfig.WIDTH + tx] & 0x1f;
        const isLaserDoor =
          t === TileType.LASER_DOOR_1A ||
          t === TileType.LASER_DOOR_1B ||
          t === TileType.LASER_DOOR_2A ||
          t === TileType.LASER_DOOR_2B;
        const isHazard = t === TileType.FORCEFIELD || t === TileType.SKULL_HAZARD;
        if (isLaserDoor || isHazard) {
          const d = Math.hypot(tx - px, tz - pz);
          if (d < bestTileDist) {
            bestTileDist = d;
            hitTx = tx;
            hitTz = tz;
            hitTileType = t;
          }
        }
      }
    }

    // Fallback: if neither an Alien nor a Laser/Hazard tile was within range (e.g. radiation overload or wall),
    // explode the tile directly in front of the player so the environment visibly blasts apart too!
    if (!collidedWithSomething && hitTx === -1) {
      hitTx = Math.max(0, Math.min(GridConfig.WIDTH - 1, Math.round(px + Math.sin(this.player.facingAngle) * 0.85)));
      hitTz = Math.max(0, Math.min(GridConfig.HEIGHT - 1, Math.round(pz + Math.cos(this.player.facingAngle) * 0.85)));
      hitTileType = ram[0x0b00 + hitTz * GridConfig.WIDTH + hitTx] & 0x1f;
    }

    if (hitTx !== -1) {
      this.player.colliderX = hitTx;
      this.player.colliderZ = hitTz;
      this.explodedTiles.push({ tx: hitTx, tz: hitTz, timer: 1.9 });

      const isLaser =
        hitTileType === TileType.LASER_DOOR_1A ||
        hitTileType === TileType.LASER_DOOR_1B ||
        hitTileType === TileType.LASER_DOOR_2A ||
        hitTileType === TileType.LASER_DOOR_2B;

      if (isLaser) {
        // Blast the North & South 3D Laser Blast Gate Leaves + Danger Beacons into the air!
        this.spawnDebrisChunk("laserBeams", hitTx, 0.45, hitTz - 0.25, -2.4, 5.6, -3.2, 0.95, [1, 1, 1], 1.8);
        this.spawnDebrisChunk("laserBeams", hitTx, 0.45, hitTz + 0.25, 2.4, 5.6, 3.2, 0.95, [1, 1, 1], 1.8);
        this.spawnDebrisChunk("laserDangerClosed", hitTx, 0.7, hitTz, (Math.random() - 0.5) * 3.5, 6.2, (Math.random() - 0.5) * 3.5, 1.0, [1, 1, 1], 1.75);
      } else if (hitTileType === TileType.SKULL_HAZARD) {
        this.spawnDebrisChunk("skullHazard", hitTx, 0.35, hitTz, (Math.random() - 0.5) * 3.5, 6.0, (Math.random() - 0.5) * 3.5, 1.15, [1, 1, 1], 1.8);
      } else if (hitTileType === TileType.FORCEFIELD) {
        this.spawnDebrisChunk("hazardField", hitTx, 0.45, hitTz, (Math.random() - 0.5) * 3.5, 5.8, (Math.random() - 0.5) * 3.5, 0.95, [1, 1, 1], 1.8);
      }

      // 16 Heavy 3D Door/Reactor Shrapnel Chunks + Volumetric Fireballs + Shockwaves at Colliding Tile
      for (let k = 0; k < 16; k++) {
        const ka = (k / 16) * Math.PI * 2;
        const kSpd = 2.8 + Math.random() * 4.4;
        this.spawnDebrisChunk(
          "debrisArmorChunk",
          hitTx,
          0.4,
          hitTz,
          Math.cos(ka) * kSpd,
          3.8 + Math.random() * 4.0,
          Math.sin(ka) * kSpd,
          0.95 + Math.random() * 0.55,
          [1.0, 0.45, 0.2],
          1.65
        );
      }
      this.spawnFireball(hitTx, 0.48, hitTz, 2.5, 0.72, [1.0, 0.35, 0.12], 1.25);
      this.spawnFireball(hitTx, 0.65, hitTz, 2.0, 0.62, [1.0, 0.85, 0.2], 1.65);
      this.spawnShockwave(hitTx, hitTz, [1.0, 0.25, 0.15], 4.2, 0.7, 0.2);
      this.spawnShockwave(hitTx, hitTz, [1.0, 0.85, 0.2], 3.2, 0.54, 0.48);
      this.spawnParticleBurst(hitTx, hitTz, 50, [1.0, 0.35, 0.15], 6.4, 0.45, 8.5, 1.35);
    }
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
   * Computes the exact continuous sub-pixel player and camera coordinates in 3D tile space
   * directly from the Atari ANTIC Display List LMS0 ($3C94/$3C95), fine scroll registers
   * HSCROL ($D404) & VSCROL ($D405), and logical Player position $055D & PMGY ($055E).
   */
  readExactHardwarePlayerAndCamera(ram) {
    const lms0 =
      ram[SystemAddressMap.IN_GAME_LMS0_LO] |
      (ram[SystemAddressMap.IN_GAME_LMS0_HI] << 8);
    if (lms0 >= 0x1c00 && lms0 < 0x3c00) {
      const lmsCharX = (lms0 - 0x1c00) & 0x7f;
      const lmsCharY = (lms0 - 0x1c00) >> 7;
      const hscrol = ram[SystemAddressMap.HSCROL] & 0x0f;
      const vscrol = ram[SystemAddressMap.VSCROL] & 0x07;
      // Prefer $055D over $D000 so the 2D PMG death-explosion registers ($04C5->$D000) never shift playerX!
      const hpos = ram[0x055d] || ram[0xd000] || 120;
      const pmgY = ram[0x055e] || 112;

      const vpLeftPx = lmsCharX * 8 + (16 - hscrol) * 2 - 16;
      const vpTopPx = lmsCharY * 8 + vscrol;

      const playerX = Math.max(0, Math.min(61, (vpLeftPx + (hpos - 48) * 2) / 16.0));
      const playerZ = Math.max(0, Math.min(31, (vpTopPx + (pmgY - 32)) / 16.0));
      const camX = Math.max(0, Math.min(61, (vpLeftPx + 144) / 16.0));
      const camZ = Math.max(0, Math.min(31, (vpTopPx + 80) / 16.0));

      return { playerX, playerZ, camX, camZ };
    }

    const fallbackX = Math.max(0, Math.min(61, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 0.5));
    const fallbackZ = Math.max(0, Math.min(31, ram[SystemAddressMap.PLAYER_CHAR_Y] * 0.5));
    return { playerX: fallbackX, playerZ: fallbackZ, camX: fallbackX, camZ: fallbackZ };
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

    const hw = this.readExactHardwarePlayerAndCamera(ram);
    this.player.x = hw.playerX;
    this.player.z = hw.playerZ;
    this.player.targetX = hw.playerX;
    this.player.targetZ = hw.playerZ;
    this.player.isExploding = false;
    this.player.explosionTimer = 0;
    this.camera.x = hw.camX;
    this.camera.z = hw.camZ;
    this.camera.shakeIntensity = 0;
    this.debrisChunks.length = 0;
    this.fireballs.length = 0;
    this.explodedTiles.length = 0;

    this.prevLives = ram[SystemAddressMap.LIVES_COUNT];
    this.prevDeathFlag = ram[0x059b] | ram[0x05ab];
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

    // 1. Update & Interpolate Continuous Hardware-Scrolled Player & Camera Position
    const hw = this.readExactHardwarePlayerAndCamera(ram);
    const rawX = hw.playerX;
    const rawZ = hw.playerZ;

    const jumpDist = Math.hypot(rawX - this.player.targetX, rawZ - this.player.targetZ);
    if (jumpDist > 3.5) {
      // Player warped via teleporter or respawned after death!
      this.player.isExploding = false;
      this.player.explosionTimer = 0;
      this.explodedTiles.length = 0;
      this.spawnShockwave(this.player.x, this.player.z, [0.75, 0.35, 1.0], 2.8, 0.5);
      this.spawnParticleBurst(this.player.x, this.player.z, 22, [0.3, 0.95, 1.0], 4.0);
      this.player.x = rawX;
      this.player.z = rawZ;
      this.camera.x = hw.camX;
      this.camera.z = hw.camZ;
      this.player.teleportFlash = 1.0;
      this.spawnShockwave(rawX, rawZ, [0.2, 0.95, 1.0], 3.0, 0.55);
      this.spawnParticleBurst(rawX, rawZ, 26, [0.75, 0.4, 1.0], 4.2);
      if (this.fmSynth) this.fmSynth.playTeleportSound();
    }

    const stepDx = rawX - this.player.targetX;
    const stepDz = rawZ - this.player.targetZ;
    this.player.targetX = rawX;
    this.player.targetZ = rawZ;

    const moveDx = rawX - this.player.x;
    const moveDz = rawZ - this.player.z;
    const distToTarget = Math.hypot(moveDx, moveDz);

    // Constant-velocity linear interpolation across the 2-frame (0.125 tile) Atari scroll steps
    if (distToTarget > 0.0001) {
      const linearSpeed = 3.45 + Math.max(0, distToTarget - 0.125) * 20.0;
      const step = Math.min(distToTarget, linearSpeed * dt);
      this.player.x += (moveDx / distToTarget) * step;
      this.player.z += (moveDz / distToTarget) * step;
    }

    // Continuous 3D Camera Scroll synchronized 1:1 with the Atari viewport scroll
    const camDx = hw.camX - this.camera.x;
    const camDz = hw.camZ - this.camera.z;
    const camDist = Math.hypot(camDx, camDz);
    if (camDist > 0.0001) {
      const camLinearSpeed = 3.45 + Math.max(0, camDist - 0.125) * 20.0;
      const camStep = Math.min(camDist, camLinearSpeed * dt);
      this.camera.x += (camDx / camDist) * camStep;
      this.camera.z += (camDz / camDist) * camStep;
    }

    if (distToTarget > 0.002 || Math.hypot(stepDx, stepDz) > 0.001) {
      this.player.targetAngle = Math.atan2(moveDx, moveDz);
      this.player.walkCycle += dt * 16.5;
      this.player.strideAmplitude = Math.min(1.0, this.player.strideAmplitude + dt * 12.0);
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
    this.player.facingAngle += angleDiff * (1.0 - Math.exp(-20.0 * dt));

    this.player.hurtFlash = Math.max(0, this.player.hurtFlash - dt * 1.4);
    this.player.teleportFlash = Math.max(0, this.player.teleportFlash - dt * 2.5);

    // Update 3D Camera Shake
    if (this.camera.shakeIntensity > 0.001) {
      this.camera.shakeIntensity = Math.max(0, this.camera.shakeIntensity - dt * 0.95);
      const s = this.camera.shakeIntensity * 0.42;
      this.camera.shakeX = Math.sin(this.time * 62.0) * s;
      this.camera.shakeY = Math.cos(this.time * 78.0) * s * 0.7;
      this.camera.shakeZ = Math.sin(this.time * 54.0 + 1.4) * s;
    } else {
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
      this.camera.shakeZ = 0;
    }

    // Check if carrying hot plutonium & radiation timer is actively counting down
    // In 6502 ROM ($4909 INC $0576 on pickup, $4941 DEC $0576 on deposit, $4D8F LDA $0576 timer gate):
    // $0576 > 0 means the player is carrying active Plutonium and the countdown timer is running!
    const carriedPlutoniumCount = ram[0x0576];
    const isCarryingPlutonium = carriedPlutoniumCount > 0;
    this.player.plutoniumGlow = isCarryingPlutonium
      ? 0.65 + 0.35 * Math.sin(this.time * 12.0)
      : 0.0;

    // 3. Detect Gameplay Events (Lives / Death Explosion, Plutonium, Containers, Inventory, Dug Tiles)
    const curLives = ram[SystemAddressMap.LIVES_COUNT];
    const curDeathFlag = ram[0x059b] | ram[0x05ab];
    if (
      (this.prevLives !== -1 && curLives < this.prevLives) ||
      (curDeathFlag !== 0 && this.prevDeathFlag === 0 && !this.player.isExploding)
    ) {
      this.triggerSpectacularCollisionExplosion(ram);
      if (this.fmSynth) this.fmSynth.playPlayerDeath();
    }
    this.prevLives = curLives;
    this.prevDeathFlag = curDeathFlag;

    // Step active player & collider explosion sequence (secondary chain detonations!)
    if (this.player.isExploding) {
      this.player.explosionTimer -= dt;
      if (!this.player.chainPulse1 && this.player.explosionTimer <= 1.62) {
        this.player.chainPulse1 = true;
        const ex = this.player.explosionX;
        const ez = this.player.explosionZ;
        const cx = this.player.colliderX;
        const cz = this.player.colliderZ;
        this.spawnFireball(ex, 0.55, ez, 2.2, 0.58, [1.0, 0.52, 0.15], 1.4);
        this.spawnFireball(cx, 0.55, cz, 2.2, 0.58, [1.0, 0.25, 0.35], 1.4);
        this.spawnShockwave((ex + cx) * 0.5, (ez + cz) * 0.5, [1.0, 0.65, 0.2], 4.8, 0.65, 0.28);
        this.spawnParticleBurst(ex, ez, 30, [1.0, 0.85, 0.25], 5.8, 0.55, 8.0, 1.25);
      }
      if (!this.player.chainPulse2 && this.player.explosionTimer <= 1.32) {
        this.player.chainPulse2 = true;
        const mx = (this.player.explosionX + this.player.colliderX) * 0.5;
        const mz = (this.player.explosionZ + this.player.colliderZ) * 0.5;
        this.spawnFireball(mx, 0.65, mz, 2.65, 0.65, [1.0, 0.9, 0.4], 1.6);
        this.spawnShockwave(mx, mz, [0.3, 0.95, 1.0], 5.2, 0.7, 0.35);
        this.spawnParticleBurst(mx, mz, 36, [1.0, 0.35, 0.2], 6.0, 0.6, 8.5, 1.3);
      }
      if (this.player.explosionTimer <= 0 && curDeathFlag === 0) {
        this.player.isExploding = false;
      }
    }

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
          // Read exact hardware closure state (0 = 100% OPEN/SAFE, 1..6 = CLOSING/CLOSED & DEADLY)
          let rawClosure = 0;
          if (origTile === TileType.LASER_DOOR_1A) rawClosure = ram[0x0587] & 0x07;
          else if (origTile === TileType.LASER_DOOR_1B) rawClosure = ram[0x0588] & 0x07;
          else if (origTile === TileType.LASER_DOOR_2A) rawClosure = ram[0x0589] & 0x07;
          else if (origTile === TileType.LASER_DOOR_2B) rawClosure = ram[0x058a] & 0x07;

          const targetClosure = Math.min(1.0, rawClosure / 6.0);
          if (rawClosure === 0 && this.laserIntensity[idx] < 0.12) {
            this.laserIntensity[idx] = 0.0;
          } else {
            const diff = targetClosure - this.laserIntensity[idx];
            const step = Math.min(Math.abs(diff), 4.8 * dt);
            this.laserIntensity[idx] += Math.sign(diff) * step;
          }
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

    for (let i = 0; i < this.droids.length; i++) {
      const droid = this.droids[i];
      if (droid.explodedTimer > 0) {
        droid.explodedTimer = Math.max(0, droid.explodedTimer - dt);
      }
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
      const dDist = Math.hypot(dx, dz);
      droid.type = rType;
      droid.targetX = targetX;
      droid.targetZ = targetZ;

      if (dDist > 0.0001) {
        const baseDroidSpeed = rType === 0 ? 3.35 : 6.6;
        const droidSpeed = baseDroidSpeed + Math.max(0, dDist - 0.5) * 16.0;
        const dStep = Math.min(dDist, droidSpeed * dt);
        droid.x += (dx / dDist) * dStep;
        droid.z += (dz / dDist) * dStep;
      }

      if (dDist > 0.005) {
        const targetAngle = Math.atan2(dx, dz);
        let aDiff = targetAngle - droid.facingAngle;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        droid.facingAngle += aDiff * (1.0 - Math.exp(-15.0 * dt));
      }

      droid.ringSpin += dt * (rType === 0 ? 4.5 : 8.5);
    }

    // 6. Step 3D Particles, Tumbling 3D Debris Chunks, Volumetric Fireballs & Shockwaves
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
        p.vy = Math.abs(p.vy) * 0.48;
        p.vx *= 0.78;
        p.vz *= 0.78;
      }
      p.rot += p.vrot * dt;
    }

    for (let i = this.debrisChunks.length - 1; i >= 0; i--) {
      const dc = this.debrisChunks[i];
      dc.life += dt;
      if (dc.life >= dc.maxLife) {
        this.debrisChunks.splice(i, 1);
        continue;
      }
      dc.vy -= dc.gravity * dt;
      dc.x += dc.vx * dt;
      dc.y += dc.vy * dt;
      dc.z += dc.vz * dt;
      if (dc.y < 0.1) {
        dc.y = 0.1;
        dc.vy = Math.abs(dc.vy) * 0.54;
        dc.vx *= 0.8;
        dc.vz *= 0.8;
      }
      dc.rx += dc.vrx * dt;
      dc.ry += dc.vry * dt;
      dc.rz += dc.vrz * dt;
    }

    for (let i = this.fireballs.length - 1; i >= 0; i--) {
      const fb = this.fireballs[i];
      fb.life += dt;
      if (fb.life >= fb.maxLife) {
        this.fireballs.splice(i, 1);
        continue;
      }
      const ratio = fb.life / fb.maxLife;
      // Fast explosive expansion followed by dissipation
      fb.scale = fb.maxScale * Math.sin(ratio * Math.PI * 0.85);
      fb.y += fb.vy * dt;
      fb.rx += fb.vrx * dt;
      fb.ry += fb.vry * dt;
      fb.rz += fb.vrz * dt;
    }

    for (let i = this.explodedTiles.length - 1; i >= 0; i--) {
      this.explodedTiles[i].timer -= dt;
      if (this.explodedTiles[i].timer <= 0) {
        this.explodedTiles.splice(i, 1);
      }
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
