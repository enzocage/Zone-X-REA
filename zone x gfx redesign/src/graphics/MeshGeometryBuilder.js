/**
 * @fileoverview Procedural 3D Mesh Geometry Builder for Zone X GFX Redesign.
 *
 * Generates indexed/non-indexed 3D triangle meshes with per-vertex:
 * - Position (x, y, z) where X = East/West, Y = Height (Up), Z = North/South
 * - Normal (nx, ny, nz) for real-time Blinn-Phong + Point Light shading
 * - Base Color (r, g, b)
 * - Specular/Emissive factor (emissive: 0.0 = matte/metallic, 1.0 = pure neon glow)
 *
 * Each vertex packs 10 floats: [x, y, z, nx, ny, nz, r, g, b, emissive].
 */

export class MeshGeometryBuilder {
  constructor() {
    /** @type {number[]} */
    this.verts = [];
  }

  clear() {
    this.verts = [];
    return this;
  }

  /**
   * Pushes a single triangle with auto-computed facet normal.
   */
  addTriangle(p1, p2, p3, color, emissive = 0.0) {
    const ux = p2[0] - p1[0];
    const uy = p2[1] - p1[1];
    const uz = p2[2] - p1[2];
    const vx = p3[0] - p1[0];
    const vy = p3[1] - p1[1];
    const vz = p3[2] - p1[2];

    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1.0;
    nx /= len;
    ny /= len;
    nz /= len;

    const [r, g, b] = color;
    this.verts.push(
      p1[0], p1[1], p1[2], nx, ny, nz, r, g, b, emissive,
      p2[0], p2[1], p2[2], nx, ny, nz, r, g, b, emissive,
      p3[0], p3[1], p3[2], nx, ny, nz, r, g, b, emissive
    );
    return this;
  }

  /**
   * Adds a quad (two triangles) with outward normal.
   */
  addQuad(p1, p2, p3, p4, color, emissive = 0.0) {
    this.addTriangle(p1, p2, p3, color, emissive);
    this.addTriangle(p1, p3, p4, color, emissive);
    return this;
  }

  /**
   * Adds an axis-aligned 3D box centered at (cx, cy, cz) with dimensions (sx, sy, sz).
   */
  addBox(cx, cy, cz, sx, sy, sz, color, emissive = 0.0, topColor = null) {
    const hx = sx * 0.5;
    const hy = sy * 0.5;
    const hz = sz * 0.5;

    const x0 = cx - hx, x1 = cx + hx;
    const y0 = cy - hy, y1 = cy + hy;
    const z0 = cz - hz, z1 = cz + hz;

    const tc = topColor || [
      Math.min(1, color[0] * 1.15),
      Math.min(1, color[1] * 1.15),
      Math.min(1, color[2] * 1.15),
    ];

    // Top (+Y)
    this.addQuad([x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], tc, emissive);
    // Bottom (-Y)
    this.addQuad([x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], color, emissive);
    // Front (+Z)
    this.addQuad([x0, y1, z1], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], color, emissive);
    // Back (-Z)
    this.addQuad([x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [x0, y1, z0], color, emissive);
    // Left (-X)
    this.addQuad([x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], color, emissive);
    // Right (+X)
    this.addQuad([x1, y1, z1], [x1, y0, z1], [x1, y0, z0], [x1, y1, z0], color, emissive);
    return this;
  }

  /**
   * Adds a bevelled 3D sci-fi pillar/block (frustum + main body + bevel cap).
   */
  addBevelledBox(cx, cy, cz, sx, sy, sz, bevel, color, capColor, emissive = 0.0) {
    const bodyH = Math.max(0.02, sy - bevel * 2);
    this.addBox(cx, cy, cz, sx, bodyH, sz, color, emissive);

    // Top bevel frustum
    const yMid = cy + bodyH * 0.5;
    const yTop = cy + sy * 0.5;
    this.addFrustumY(cx, yMid, yTop, cz, sx * 0.5, sz * 0.5, sx * 0.5 - bevel, sz * 0.5 - bevel, capColor || color, emissive);
    return this;
  }

  /**
   * Adds a rectangular frustum along the Y axis from y0 to y1.
   */
  addFrustumY(cx, y0, y1, cz, rx0, rz0, rx1, rz1, color, emissive = 0.0) {
    const b0 = [cx - rx0, y0, cz - rz0];
    const b1 = [cx - rx0, y0, cz + rz0];
    const b2 = [cx + rx0, y0, cz + rz0];
    const b3 = [cx + rx0, y0, cz - rz0];

    const t0 = [cx - rx1, y1, cz - rz1];
    const t1 = [cx - rx1, y1, cz + rz1];
    const t2 = [cx + rx1, y1, cz + rz1];
    const t3 = [cx + rx1, y1, cz - rz1];

    // Top cap
    this.addQuad(t0, t1, t2, t3, color, emissive);
    // 4 sloped sides
    this.addQuad(t1, b1, b2, t2, color, emissive);
    this.addQuad(t3, b3, b0, t0, color, emissive);
    this.addQuad(t0, b0, b1, t1, color, emissive);
    this.addQuad(t2, b2, b3, t3, color, emissive);
    return this;
  }

  /**
   * Adds a vertical cylinder / prism along Y axis.
   */
  addCylinderY(cx, y0, y1, cz, rBottom, rTop, segments, color, emissive = 0.0, capTop = true) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0), s0 = Math.sin(a0);
      const c1 = Math.cos(a1), s1 = Math.sin(a1);

      const p00 = [cx + c0 * rBottom, y0, cz + s0 * rBottom];
      const p10 = [cx + c1 * rBottom, y0, cz + s1 * rBottom];
      const p11 = [cx + c1 * rTop, y1, cz + s1 * rTop];
      const p01 = [cx + c0 * rTop, y1, cz + s0 * rTop];

      this.addQuad(p01, p00, p10, p11, color, emissive);

      if (capTop && rTop > 0.001) {
        this.addTriangle([cx, y1, cz], p01, p11, color, emissive);
      }
    }
    return this;
  }

  /**
   * Adds a horizontal cylinder along the X axis (great for laser beams & pipes).
   */
  addCylinderX(x0, x1, cy, cz, radius, segments, color, emissive = 0.0) {
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const c0 = Math.cos(a0) * radius, s0 = Math.sin(a0) * radius;
      const c1 = Math.cos(a1) * radius, s1 = Math.sin(a1) * radius;

      const p00 = [x0, cy + c0, cz + s0];
      const p10 = [x1, cy + c0, cz + s0];
      const p11 = [x1, cy + c1, cz + s1];
      const p01 = [x0, cy + c1, cz + s1];

      this.addQuad(p00, p10, p11, p01, color, emissive);
    }
    return this;
  }

  /**
   * Adds a 3D octahedron / crystal diamond centered at (cx, cy, cz).
   */
  addOctahedron(cx, cy, cz, rx, ry, rz, color, emissive = 0.0) {
    const top = [cx, cy + ry, cz];
    const bot = [cx, cy - ry, cz];
    const pN = [cx, cy, cz - rz];
    const pS = [cx, cy, cz + rz];
    const pE = [cx + rx, cy, cz];
    const pW = [cx - rx, cy, cz];

    // Upper pyramid
    this.addTriangle(top, pW, pS, color, emissive);
    this.addTriangle(top, pS, pE, color, emissive);
    this.addTriangle(top, pE, pN, color, emissive);
    this.addTriangle(top, pN, pW, color, emissive);

    // Lower pyramid
    this.addTriangle(bot, pS, pW, color, emissive);
    this.addTriangle(bot, pE, pS, color, emissive);
    this.addTriangle(bot, pN, pE, color, emissive);
    this.addTriangle(bot, pW, pN, color, emissive);
    return this;
  }

  /**
   * Adds a 3D torus ring in the XZ plane centered at (cx, cy, cz).
   */
  addTorusXZ(cx, cy, cz, majorR, minorR, majorSegs, minorSegs, color, emissive = 0.0) {
    for (let i = 0; i < majorSegs; i++) {
      const u0 = (i / majorSegs) * Math.PI * 2;
      const u1 = ((i + 1) / majorSegs) * Math.PI * 2;
      const cu0 = Math.cos(u0), su0 = Math.sin(u0);
      const cu1 = Math.cos(u1), su1 = Math.sin(u1);

      for (let j = 0; j < minorSegs; j++) {
        const v0 = (j / minorSegs) * Math.PI * 2;
        const v1 = ((j + 1) / minorSegs) * Math.PI * 2;

        const p00 = [
          cx + (majorR + minorR * Math.cos(v0)) * cu0,
          cy + minorR * Math.sin(v0),
          cz + (majorR + minorR * Math.cos(v0)) * su0,
        ];
        const p10 = [
          cx + (majorR + minorR * Math.cos(v0)) * cu1,
          cy + minorR * Math.sin(v0),
          cz + (majorR + minorR * Math.cos(v0)) * su1,
        ];
        const p11 = [
          cx + (majorR + minorR * Math.cos(v1)) * cu1,
          cy + minorR * Math.sin(v1),
          cz + (majorR + minorR * Math.cos(v1)) * su1,
        ];
        const p01 = [
          cx + (majorR + minorR * Math.cos(v1)) * cu0,
          cy + minorR * Math.sin(v1),
          cz + (majorR + minorR * Math.cos(v1)) * su0,
        ];

        this.addQuad(p00, p10, p11, p01, color, emissive);
      }
    }
    return this;
  }

  toFloat32Array() {
    return new Float32Array(this.verts);
  }

  /**
   * Builds the complete dictionary of static/dynamic 3D meshes used by the renderer.
   */
  static buildAllGameMeshes() {
    const b = new MeshGeometryBuilder();
    const meshes = {};

    const compile = (name) => {
      const arr = b.toFloat32Array();
      meshes[name] = {
        data: arr,
        vertexCount: arr.length / 10,
      };
      b.clear();
    };

    // =========================================================================
    // MINIMALIST ARCHITECTURAL PALETTE ("Clean Light-Grey & White Diorama")
    // - Base Palette (90% of scene): Crisp Porcelain White, Alabaster Off-White,
    //   Architectural Light-Grey & Brushed Silver-Grey.
    // - Primary Gameplay Attention Accent: Luminous Mint-Emerald (exclusively
    //   for Plutonium crystals & Active Delivery Barrels when timer runs).
    // - Secondary Subtle Accents:
    //   * Warm Sand-Gold (subtle detail on Keys, Locks, Spade, Mat & Crumbly Blocks)
    //   * Soft Sky-Blue (subtle detail on Warp Pads, Portals, Time & Shield)
    //   * Crisp Coral-Red (exclusively for closed/closing Laser Barriers & Lethal Hazards)
    // =========================================================================
    const PURE_WHITE    = [0.96, 0.97, 0.99]; // Crisp porcelain white (top caps, highlights)
    const OFF_WHITE     = [0.87, 0.89, 0.92]; // Alabaster white (walls, clean geometric blocks)
    const LIGHT_GREY    = [0.75, 0.78, 0.82]; // Soft architectural light-grey (pedestals, frames, barrels)
    const SILVER_GREY   = [0.62, 0.65, 0.70]; // Brushed silver-grey (floor plates, robot armor)
    const SLATE_GREY    = [0.45, 0.48, 0.53]; // Calm medium slate-grey (grooves, joints, normal aliens)
    const CHARCOAL_DARK = [0.22, 0.25, 0.30]; // Deep anthracite contrast (robot face screen, keyholes)

    // Focal Gameplay Attention Accents
    const PLUT_EMERALD  = [0.10, 0.92, 0.46]; // Primary Focus: Plutonium & Active Barrels
    const PLUT_MINT     = [0.58, 1.00, 0.78]; // Bright mint crystal core
    const PLUT_MUTED    = [0.22, 0.56, 0.38]; // Subtle standby barrel indicator

    const ACCENT_GOLD   = [0.92, 0.72, 0.22]; // Subtle warm gold for tools/locks
    const ACCENT_SAND   = [0.78, 0.72, 0.62]; // Warm sand-grey for diggable regolith cubes
    const ACCENT_SKY    = [0.30, 0.75, 0.96]; // Soft sky-blue for warp/exit/shield
    const ACCENT_CORAL  = [0.95, 0.24, 0.28]; // Crisp coral-red for closed laser barriers & hazards

    // Helper: Minimalist round white/light-grey base disc for items
    const addCleanDiscBase = (radius = 0.34, height = 0.05, accentColor = LIGHT_GREY, accentEmissive = 0.05) => {
      b.addCylinderY(0, 0.0, height, 0, radius, radius * 0.95, 12, OFF_WHITE, 0.02);
      b.addTorusXZ(0, height, 0, radius * 0.82, 0.018, 12, 6, accentColor, accentEmissive);
    };

    // 1. Minimalist Light-Grey Architectural Floor Tile (1x1 unit with clean recessed border)
    b.addBox(0, -0.04, 0, 0.96, 0.08, 0.96, SILVER_GREY, 0.0, LIGHT_GREY);
    b.addBox(0, 0.004, 0, 0.84, 0.008, 0.84, LIGHT_GREY, 0.0);
    compile("floorTile");

    // 2. Clean White & Light-Grey Architectural Wall Block (Simple, sculptural bevelled monolith)
    b.addBox(0, 0.04, 0, 0.96, 0.08, 0.96, LIGHT_GREY, 0.0);
    b.addBevelledBox(0, 0.34, 0, 0.92, 0.56, 0.92, 0.06, OFF_WHITE, PURE_WHITE, 0.02);
    b.addBox(0, 0.63, 0, 0.76, 0.03, 0.76, PURE_WHITE, 0.03);
    compile("wallBlock");

    // 3. PLUTONIUM CORE — #1 Gameplay Attention Magnet (Simple, iconic floating Emerald Diamond on White Socket)
    addCleanDiscBase(0.40, 0.06, PLUT_EMERALD, 0.65);
    b.addOctahedron(0, 0.50, 0, 0.28, 0.38, 0.28, PLUT_EMERALD, 0.90);
    b.addOctahedron(0, 0.50, 0, 0.16, 0.24, 0.16, PLUT_MINT, 1.00);
    compile("plutoniumCore");

    // 3b. Plutonium Minimalist Orbital Ring (Single clean white & emerald ring)
    b.addTorusXZ(0, 0.50, 0, 0.38, 0.024, 16, 6, PURE_WHITE, 0.55);
    b.addOctahedron(0.38, 0.50, 0, 0.06, 0.06, 0.06, PLUT_MINT, 0.95);
    b.addOctahedron(-0.38, 0.50, 0, 0.06, 0.06, 0.06, PLUT_MINT, 0.95);
    compile("plutoniumBeacon");

    // 3c. Plutonium Clean Floor Halo Ring
    b.addTorusXZ(0, 0.02, 0, 0.44, 0.025, 16, 6, PLUT_EMERALD, 0.85);
    compile("plutoniumHalo");

    // 4. PLUTONIUM CONTAINER / BARREL (Simple, iconic White/Light-Grey Cylindrical Barrel)
    // Standby: Calm white/light-grey cylinder with two subtle slate hoops and a dark top opening
    addCleanDiscBase(0.42, 0.05, LIGHT_GREY, 0.04);
    b.addCylinderY(0, 0.05, 0.64, 0, 0.36, 0.36, 16, OFF_WHITE, 0.04);
    b.addTorusXZ(0, 0.22, 0, 0.37, 0.026, 16, 6, SLATE_GREY, 0.04);
    b.addTorusXZ(0, 0.48, 0, 0.37, 0.026, 16, 6, SLATE_GREY, 0.04);
    b.addTorusXZ(0, 0.64, 0, 0.34, 0.042, 16, 6, PURE_WHITE, 0.08);
    b.addCylinderY(0, 0.60, 0.66, 0, 0.25, 0.25, 14, CHARCOAL_DARK, 0.02);
    b.addTorusXZ(0, 0.65, 0, 0.18, 0.020, 12, 6, PLUT_MUTED, 0.35);
    compile("containerVault");

    // 4b. Container ACTIVE Ignition Overlay (Illuminates the Barrel in Mint-Emerald when player carries Plutonium!)
    b.addTorusXZ(0, 0.025, 0, 0.48, 0.032, 16, 6, PLUT_EMERALD, 0.95);
    b.addTorusXZ(0, 0.35, 0, 0.385, 0.034, 16, 6, PLUT_EMERALD, 0.90);
    b.addTorusXZ(0, 0.66, 0, 0.35, 0.042, 16, 6, PLUT_MINT, 1.00);
    b.addCylinderY(0, 0.62, 0.70, 0, 0.23, 0.23, 14, PLUT_EMERALD, 0.95);
    compile("containerActiveGlow");

    // 4c. Clean Abstract Floating Downward Chevron/Cone above Active Container Barrel
    b.addCylinderY(0, 0.88, 1.18, 0, 0.02, 0.20, 8, PLUT_EMERALD, 0.90);
    b.addTorusXZ(0, 0.88, 0, 0.22, 0.022, 12, 6, PURE_WHITE, 0.80);
    compile("containerArrow");

    // 5. Security Key (Simple, recognizable 3D Key in White & Warm Gold)
    addCleanDiscBase(0.32, 0.04, ACCENT_GOLD, 0.25);
    b.addTorusXZ(0, 0.28, -0.18, 0.14, 0.042, 12, 6, ACCENT_GOLD, 0.45);
    b.addBox(0, 0.28, 0.08, 0.07, 0.06, 0.38, PURE_WHITE, 0.20);
    b.addBox(0.09, 0.28, 0.14, 0.11, 0.06, 0.055, ACCENT_GOLD, 0.45);
    b.addBox(0.09, 0.28, 0.24, 0.11, 0.06, 0.055, ACCENT_GOLD, 0.45);
    compile("keyItem");

    // 6. Excavator Spade (Clean, simple Shovel Blade in White/Light-Grey + Gold Handle)
    addCleanDiscBase(0.32, 0.04, ACCENT_GOLD, 0.25);
    b.addBox(0, 0.28, -0.26, 0.22, 0.06, 0.06, ACCENT_GOLD, 0.40);
    b.addBox(0, 0.28, -0.04, 0.06, 0.05, 0.38, LIGHT_GREY, 0.10);
    b.addBevelledBox(0, 0.28, 0.20, 0.30, 0.05, 0.24, 0.02, PURE_WHITE, OFF_WHITE, 0.20);
    compile("spadeItem");

    // 6b. Radiation Shield Pod (Simple White Capsule with a clean Sky-Blue Cross)
    addCleanDiscBase(0.32, 0.04, ACCENT_SKY, 0.25);
    b.addCylinderY(0, 0.08, 0.46, 0, 0.20, 0.20, 12, PURE_WHITE, 0.15);
    b.addBox(0, 0.48, 0, 0.22, 0.04, 0.07, ACCENT_SKY, 0.65);
    b.addBox(0, 0.48, 0, 0.07, 0.04, 0.22, ACCENT_SKY, 0.65);
    compile("capsuleItem");

    // 7. Insulating Mat (Simple White/Light-Grey Floor Tile with 3 Warm Gold Stripes)
    b.addBevelledBox(0, 0.08, 0, 0.76, 0.10, 0.56, 0.03, OFF_WHITE, PURE_WHITE, 0.08);
    b.addBox(-0.20, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
    b.addBox( 0.00, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
    b.addBox( 0.20, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
    compile("matItem");

    // 8. Extra Time Hourglass (Clean Minimalist White & Sky-Blue Hourglass)
    addCleanDiscBase(0.32, 0.04, ACCENT_SKY, 0.25);
    b.addBox(0, 0.10, 0, 0.38, 0.05, 0.38, PURE_WHITE, 0.15);
    b.addCylinderY(0, 0.13, 0.36, 0, 0.18, 0.03, 10, ACCENT_SKY, 0.55);
    b.addCylinderY(0, 0.36, 0.59, 0, 0.03, 0.18, 10, ACCENT_SKY, 0.55);
    b.addBox(0, 0.61, 0, 0.38, 0.05, 0.38, PURE_WHITE, 0.15);
    compile("extraTimeItem");

    // 9. Supply / Mystery Cube (Clean White Bevelled Cube with Light-Grey Cross & Gold Emblem)
    b.addBevelledBox(0, 0.28, 0, 0.58, 0.48, 0.58, 0.05, OFF_WHITE, PURE_WHITE, 0.08);
    b.addBox(0, 0.28, 0, 0.61, 0.07, 0.10, LIGHT_GREY, 0.05);
    b.addBox(0, 0.28, 0, 0.10, 0.07, 0.61, LIGHT_GREY, 0.05);
    b.addOctahedron(0, 0.58, 0, 0.10, 0.10, 0.10, ACCENT_GOLD, 0.55);
    compile("mysteryBox");

    // 10. Locked Key-Door (Clean Light-Grey/White Gate Block with a clear Warm-Gold Lock Symbol)
    b.addBevelledBox(0, 0.36, 0, 0.92, 0.68, 0.38, 0.05, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.78, 0, 0.14, 0.038, 10, 6, ACCENT_GOLD, 0.50);
    b.addBevelledBox(0, 0.52, 0, 0.32, 0.36, 0.46, 0.03, ACCENT_GOLD, PURE_WHITE, 0.40);
    b.addBox(0, 0.52, 0, 0.08, 0.16, 0.49, CHARCOAL_DARK, 0.0);
    compile("lockedDoor");

    // Airlock / Proximity Door (Clean White Gate with Sky-Blue Ring)
    b.addBevelledBox(0, 0.36, 0, 0.92, 0.68, 0.38, 0.05, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.76, 0, 0.18, 0.036, 12, 6, ACCENT_SKY, 0.55);
    compile("proximityDoor");

    // 11. Automatic Laser/Blast Door (Clean White Thresholds + Coral-Red Laser Bar when closed):
    b.addBox(0, 0.04, -0.43, 0.92, 0.08, 0.10, OFF_WHITE, 0.04);
    b.addBox(0, 0.04,  0.43, 0.92, 0.08, 0.10, OFF_WHITE, 0.04);
    compile("laserPylons");

    // OPEN / SAFE state: Calm white/light-grey walkthrough strips (unobstructed!)
    b.addBox(-0.24, 0.02, 0, 0.08, 0.02, 0.64, PURE_WHITE, 0.35);
    b.addBox( 0.24, 0.02, 0, 0.08, 0.02, 0.64, PURE_WHITE, 0.35);
    compile("laserSafeOpen");

    // CLOSED / DANGER state: Crisp Coral-Red floor warning strip + top indicator nodes
    b.addBox(0, 0.025, 0, 0.84, 0.03, 0.64, ACCENT_CORAL, 0.65);
    b.addOctahedron(0, 0.78, -0.42, 0.11, 0.11, 0.11, ACCENT_CORAL, 0.85);
    b.addOctahedron(0, 0.78,  0.42, 0.11, 0.11, 0.11, ACCENT_CORAL, 0.85);
    compile("laserDangerClosed");

    // Sliding Door Leaf (Clean White/Light-Grey Barrier Block + Single Bold Coral-Red Laser Bar)
    b.addBevelledBox(0, 0.34, 0, 0.88, 0.62, 0.32, 0.03, OFF_WHITE, PURE_WHITE, 0.08);
    b.addBox(0, 0.38, 0, 0.92, 0.12, 0.35, ACCENT_CORAL, 0.90);
    compile("laserBeams");

    // 12. Warp Pad & Warp Frame (Minimalist White Ring Pad with Soft Sky-Blue Core)
    addCleanDiscBase(0.42, 0.05, ACCENT_SKY, 0.45);
    b.addTorusXZ(0, 0.10, 0, 0.26, 0.032, 14, 6, PURE_WHITE, 0.50);
    b.addCylinderY(0, 0.05, 0.09, 0, 0.18, 0.18, 12, ACCENT_SKY, 0.65);
    compile("warpPad");

    b.addBevelledBox(0, 0.34, 0, 0.82, 0.68, 0.82, 0.06, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.44, 0, 0.30, 0.035, 10, 6, ACCENT_SKY, 0.45);
    compile("warpFrame");

    // 13. Crumbly Diggable Regolith (Abstract cluster of 3 rounded Warm Sand-Grey & Light-Grey Cubes)
    b.addBevelledBox(0, 0.14, 0, 0.78, 0.26, 0.78, 0.05, ACCENT_SAND, OFF_WHITE, 0.03);
    b.addBevelledBox(-0.16, 0.30, -0.12, 0.34, 0.22, 0.34, 0.04, LIGHT_GREY, PURE_WHITE, 0.04);
    b.addBevelledBox( 0.16, 0.32,  0.14, 0.32, 0.24, 0.32, 0.04, ACCENT_SAND, OFF_WHITE, 0.04);
    compile("crumblyDirt");

    b.addBevelledBox(0, 0.28, 0, 0.68, 0.52, 0.68, 0.06, LIGHT_GREY, OFF_WHITE, 0.02);
    compile("rockBlock");

    // 14. Forcefield Barrier & Skull Hazard (Minimalist White Base + Crisp Coral-Red Hazard Symbol)
    b.addBevelledBox(0, 0.32, 0, 0.84, 0.60, 0.84, 0.05, OFF_WHITE, PURE_WHITE, 0.06);
    b.addOctahedron(0, 0.74, 0, 0.18, 0.22, 0.18, ACCENT_CORAL, 0.85);
    compile("hazardField");

    // 14b. Abstract Minimalist 3D Block-Skull (Clean White Cranium + Coral-Red Eyes)
    addCleanDiscBase(0.38, 0.05, ACCENT_CORAL, 0.40);
    b.addBevelledBox(0, 0.22, -0.02, 0.34, 0.22, 0.30, 0.04, PURE_WHITE, OFF_WHITE, 0.15);
    b.addBox(0, 0.12, 0.12, 0.20, 0.10, 0.12, OFF_WHITE, 0.10);
    b.addBox(-0.08, 0.24, 0.08, 0.07, 0.07, 0.07, ACCENT_CORAL, 0.85);
    b.addBox( 0.08, 0.24, 0.08, 0.07, 0.07, 0.07, ACCENT_CORAL, 0.85);
    compile("skullHazard");

    // 15. Exit Extraction Portal (Clean White Architectural Archway + Sky-Blue Portal Ring)
    addCleanDiscBase(0.44, 0.06, ACCENT_SKY, 0.50);
    b.addBox(-0.34, 0.42, 0, 0.12, 0.78, 0.18, PURE_WHITE, 0.15);
    b.addBox( 0.34, 0.42, 0, 0.12, 0.78, 0.18, PURE_WHITE, 0.15);
    b.addBox(0, 0.82, 0, 0.82, 0.12, 0.22, PURE_WHITE, 0.20);
    b.addTorusXZ(0, 0.44, 0, 0.30, 0.04, 14, 6, ACCENT_SKY, 0.75);
    compile("exitPortal");

    // 16. Articulated 3D Light-Grey & White Player Robot (With Friendly 3D Robot Face)
    const ROBOT_GREY_DARK  = [0.34, 0.37, 0.42]; // Slate-grey joints & boots
    const ROBOT_GREY_MID   = [0.64, 0.68, 0.73]; // Clean light-grey robot chassis
    const ROBOT_GREY_LIGHT = [0.88, 0.90, 0.94]; // Crisp off-white bevel highlights & brow/nose
    const ROBOT_FACE_DARK  = [0.14, 0.16, 0.20]; // Dark face screen & pupils
    const ROBOT_EYE_GLOW   = [0.92, 0.98, 1.00]; // Crisp white-cyan robot eyes & mouth

    // 16A. Light-Grey & White Robot Torso
    b.addBevelledBox(0, 0, 0, 0.42, 0.40, 0.26, 0.04, ROBOT_GREY_MID, ROBOT_GREY_LIGHT, 0.12);
    b.addBox(0, 0.04, 0.14, 0.30, 0.20, 0.03, PURE_WHITE, 0.18);
    b.addBox(0, 0.02, -0.17, 0.30, 0.30, 0.12, ROBOT_GREY_DARK, 0.08);
    b.addCylinderY(0, -0.24, -0.15, 0, 0.13, 0.15, 8, ROBOT_GREY_DARK, 0.10);
    compile("playerTorso");

    // 16B. Light-Grey & White Robot Head with Simple, Recognizable 3D Robot Face
    b.addCylinderY(0, -0.21, -0.12, 0, 0.10, 0.10, 8, ROBOT_GREY_DARK, 0.10);
    b.addBevelledBox(0, 0.02, 0, 0.42, 0.38, 0.36, 0.05, ROBOT_GREY_MID, PURE_WHITE, 0.15);
    // Simple top antenna
    b.addCylinderY(0, 0.21, 0.34, -0.02, 0.022, 0.015, 6, ROBOT_GREY_LIGHT, 0.20);
    b.addOctahedron(0, 0.37, -0.02, 0.042, 0.042, 0.042, PURE_WHITE, 0.70);
    // Side ear bolts
    b.addBox(-0.23, 0.02, 0, 0.05, 0.12, 0.12, ROBOT_GREY_DARK, 0.12);
    b.addBox( 0.23, 0.02, 0, 0.05, 0.12, 0.12, ROBOT_GREY_DARK, 0.12);
    // Dark recessed face screen on +Z
    b.addBox(0, 0.02, 0.175, 0.34, 0.28, 0.03, ROBOT_FACE_DARK, 0.05);
    // Left & Right 3D Eyes, Pupils & Brow Ridges
    b.addBox(-0.095, 0.075, 0.195, 0.10, 0.09, 0.03, ROBOT_EYE_GLOW, 0.90);
    b.addBox( 0.095, 0.075, 0.195, 0.10, 0.09, 0.03, ROBOT_EYE_GLOW, 0.90);
    b.addBox(-0.090, 0.078, 0.212, 0.038, 0.042, 0.015, ROBOT_FACE_DARK, 0.02);
    b.addBox( 0.090, 0.078, 0.212, 0.038, 0.042, 0.015, ROBOT_FACE_DARK, 0.02);
    b.addBox(-0.095, 0.140, 0.200, 0.12, 0.03, 0.04, PURE_WHITE, 0.30);
    b.addBox( 0.095, 0.140, 0.200, 0.12, 0.03, 0.04, PURE_WHITE, 0.30);
    // Nose bridge & clean vocoder mouth
    b.addBox(0, 0.015, 0.200, 0.04, 0.07, 0.04, PURE_WHITE, 0.25);
    b.addBox(0, -0.075, 0.195, 0.20, 0.046, 0.025, ROBOT_EYE_GLOW, 0.85);
    b.addBox(-0.05, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    b.addBox( 0.00, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    b.addBox( 0.05, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    compile("playerHead");

    // 16C. Light-Grey Robot Limb
    b.addBox(0, -0.02, 0, 0.15, 0.07, 0.15, ROBOT_GREY_DARK, 0.12);
    b.addBevelledBox(0, -0.15, 0, 0.13, 0.25, 0.13, 0.02, ROBOT_GREY_MID, ROBOT_GREY_LIGHT, 0.15);
    b.addBox(0, -0.28, 0.02, 0.16, 0.09, 0.18, ROBOT_GREY_DARK, 0.15);
    compile("playerLimb");

    // 17. Abstract, Compact 3D Alien Hunters:
    // - Normal Alien (Type 0): Monochrome "Grau-in-Grau" (Slate-Grey & Light-Grey)
    // - Fast Alien   (Type 1): "Dunkelblau" (Muted Deep Steel-Blue & Ice-White Eyes)
    const ALIEN_GREY_DARK  = [0.34, 0.37, 0.42];
    const ALIEN_GREY_MID   = [0.54, 0.58, 0.63];
    const ALIEN_GREY_LIGHT = [0.78, 0.81, 0.86];
    const ALIEN_GREY_EYE   = [0.96, 0.98, 1.00];

    const ALIEN_BLUE_DEEP  = [0.12, 0.22, 0.44];
    const ALIEN_BLUE_MID   = [0.20, 0.36, 0.64];
    const ALIEN_BLUE_HI    = [0.34, 0.52, 0.82];
    const ALIEN_BLUE_EYE   = [0.75, 0.90, 1.00];

    // 17a. Normal Alien Body (Clean Abstract Grey-on-Grey Spider Pod)
    b.addBevelledBox(0, 0.06, 0.02, 0.24, 0.16, 0.28, 0.035, ALIEN_GREY_DARK, ALIEN_GREY_MID, 0.08);
    b.addOctahedron(0, 0.12, -0.14, 0.16, 0.14, 0.18, ALIEN_GREY_LIGHT, 0.12);
    b.addBox(-0.06, 0.08, 0.17, 0.05, 0.04, 0.03, ALIEN_GREY_EYE, 0.70);
    b.addBox( 0.06, 0.08, 0.17, 0.05, 0.04, 0.03, ALIEN_GREY_EYE, 0.70);
    compile("droidCore");

    // 17b. Clean Minimalist Articulated Spider Leg
    b.addBox(0.10, 0.09, 0, 0.16, 0.038, 0.038, [0.58, 0.62, 0.67], 0.08);
    b.addCylinderY(0.22, -0.16, 0.11, 0, 0.014, 0.028, 5, [0.44, 0.47, 0.52], 0.08);
    compile("alienSpiderLeg");

    // 17c. Clean Minimalist Pincer
    b.addBox(0, 0.0, 0.07, 0.038, 0.035, 0.12, ALIEN_GREY_LIGHT, 0.15);
    compile("alienMandible");

    // 17d. Fast Alien Body (Clean Abstract Deep-Blue Hunter Pod)
    b.addBevelledBox(0, 0.09, 0.0, 0.25, 0.20, 0.30, 0.04, ALIEN_BLUE_DEEP, ALIEN_BLUE_MID, 0.12);
    b.addOctahedron(0, 0.18, -0.14, 0.14, 0.12, 0.22, ALIEN_BLUE_HI, 0.18);
    b.addBox(-0.06, 0.14, 0.16, 0.055, 0.04, 0.035, ALIEN_BLUE_EYE, 0.80);
    b.addBox( 0.06, 0.14, 0.16, 0.055, 0.04, 0.035, ALIEN_BLUE_EYE, 0.80);
    compile("fastDroidBody");

    // 17e. Fast Alien Blade Arm
    b.addBox(0, 0.08, 0.10, 0.04, 0.045, 0.18, ALIEN_BLUE_MID, 0.15);
    b.addOctahedron(0, 0.03, 0.20, 0.03, 0.12, 0.09, ALIEN_BLUE_HI, 0.40);
    compile("alienScytheClaw");

    // 17f. Fast Alien Tail Fin
    b.addCylinderY(0, 0.06, 0.28, -0.18, 0.032, 0.014, 6, ALIEN_BLUE_MID, 0.15);
    b.addOctahedron(0, 0.30, -0.16, 0.035, 0.045, 0.08, ALIEN_BLUE_EYE, 0.55);
    compile("alienTailStinger");

    // 17g. Subtle Base Ring
    b.addTorusXZ(0, 0.02, 0, 0.24, 0.016, 12, 6, ALIEN_GREY_LIGHT, 0.20);
    compile("droidRing");

    // 18. 3D Particle Crystal Shard, Volumetric Fireball, Armor Shrapnel & Shockwave Ring
    b.addOctahedron(0, 0, 0, 0.12, 0.12, 0.12, [1.0, 1.0, 1.0], 0.95);
    compile("particleShard");

    b.addTorusXZ(0, 0, 0, 0.5, 0.04, 16, 6, [1.0, 1.0, 1.0], 1.0);
    compile("shockwaveRing");

    // 19. Volumetric 3D Explosion Fireball
    b.addOctahedron(0, 0, 0, 0.42, 0.42, 0.42, [1.0, 0.92, 0.55], 0.95);
    b.addBox(0, 0, 0, 0.54, 0.30, 0.30, [1.0, 0.55, 0.12], 0.9);
    b.addBox(0, 0, 0, 0.30, 0.54, 0.30, [1.0, 0.55, 0.12], 0.9);
    b.addBox(0, 0, 0, 0.30, 0.30, 0.54, [1.0, 0.55, 0.12], 0.9);
    b.addTorusXZ(0, 0, 0, 0.46, 0.07, 12, 6, ACCENT_CORAL, 0.95);
    compile("explosionFireball");

    // 20. Clean Light-Grey/White 3D Shrapnel Plate
    b.addBevelledBox(0, 0, 0, 0.26, 0.08, 0.22, 0.02, LIGHT_GREY, OFF_WHITE, 0.35);
    b.addOctahedron(0.06, 0.04, 0, 0.10, 0.07, 0.09, ACCENT_CORAL, 0.65);
    compile("debrisArmorChunk");

    // 21. Exploded Alien Carapace Fragment (Neutral Grey/Steel so tinting matches Grey or Dark-Blue alien)
    b.addBevelledBox(0, 0, 0, 0.20, 0.10, 0.22, 0.025, [0.52, 0.55, 0.60], [0.74, 0.78, 0.84], 0.25);
    b.addOctahedron(0, 0.05, 0, 0.11, 0.11, 0.11, [0.85, 0.88, 0.94], 0.40);
    compile("alienBioChunk");

    return meshes;
  }
}
