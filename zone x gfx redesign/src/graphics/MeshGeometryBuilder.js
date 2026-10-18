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
    // UNIFIED DESIGN SYSTEM PALETTE ("Zone X Industrial Reactor Architecture")
    // - Base Chassis / Structural Metal: Dark Gunmetal-Slate & Titanium
    // - Role 1 (Primary Objective): Radioactive Emerald-Lime (ONLY Plutonium & Active Barrels)
    // - Role 2 (Tools, Collectibles & Locks): Titanium-Silver + Warm Amber-Gold
    // - Role 3 (Player, Safe Passages, Warp & Exit): Ceramic-White + Cryo-Cyan
    // - Role 4 (Lethal Hazards, Closed Lasers & Aliens): Obsidian-Graphite + Crimson-Red
    // =========================================================================
    const SLATE_DARK   = [0.10, 0.13, 0.18];
    const SLATE_MID    = [0.16, 0.21, 0.29];
    const SLATE_LIGHT  = [0.25, 0.32, 0.42];
    const TITANIUM     = [0.76, 0.82, 0.90];
    const TITANIUM_HI  = [0.92, 0.95, 1.00];

    const PLUT_GREEN   = [0.06, 1.00, 0.26];
    const PLUT_CORE    = [0.22, 1.00, 0.42];
    const PLUT_DEEP    = [0.03, 0.48, 0.14];

    const AMBER_GOLD   = [0.98, 0.74, 0.14];
    const AMBER_MUTED  = [0.68, 0.50, 0.12];
    const AMBER_DARK   = [0.32, 0.24, 0.08];

    const CRYO_CYAN    = [0.16, 0.84, 1.00];
    const CRYO_DEEP    = [0.08, 0.42, 0.58];

    const CRIMSON_RED  = [1.00, 0.14, 0.20];
    const CRIMSON_DEEP = [0.46, 0.06, 0.10];
    const OBSIDIAN     = [0.09, 0.10, 0.14];
    const OBSIDIAN_HI  = [0.18, 0.20, 0.26];

    // Helper: Uniform octagonal industrial floor socket for collectibles & mechanisms
    const addIndustrialPedestal = (radius = 0.36, height = 0.08, rimColor = SLATE_LIGHT, rimEmissive = 0.12) => {
      b.addCylinderY(0, 0.0, height * 0.65, 0, radius, radius * 0.94, 8, SLATE_DARK, 0.02);
      b.addCylinderY(0, height * 0.65, height, 0, radius * 0.90, radius * 0.84, 8, SLATE_MID, 0.05);
      b.addTorusXZ(0, height, 0, radius * 0.82, 0.022, 8, 6, rimColor, rimEmissive);
    };

    // 1. Sci-Fi Floor Tile (1x1 unit — Calm Matte Dark Reactor Slate Grid)
    b.addBox(0, -0.04, 0, 0.96, 0.08, 0.96, [0.08, 0.11, 0.16], 0.0, [0.10, 0.14, 0.20]);
    b.addBox(0, 0.005, 0, 0.74, 0.01, 0.74, [0.12, 0.16, 0.23], 0.02);
    compile("floorTile");

    // 2. Wall Bulkhead (Clean Bevelled Industrial Reactor Armor Block)
    b.addBevelledBox(0, 0.35, 0, 0.96, 0.70, 0.96, 0.08, [0.18, 0.25, 0.36], [0.26, 0.35, 0.48], 0.02);
    b.addBox(0, 0.71, 0, 0.64, 0.04, 0.64, [0.14, 0.19, 0.28], 0.02, [0.28, 0.38, 0.52]);
    b.addBox(0, 0.38, 0, 0.98, 0.04, 0.98, [0.22, 0.56, 0.78], 0.22);
    compile("wallBlock");

    // 3. PLUTONIUM CORE — Primary Visual Focal Point (Ultra-Luminescent Radioactive Emerald-Lime)
    // Octagonal heavy containment socket with glowing emerald containment ring
    addIndustrialPedestal(0.46, 0.10, PLUT_GREEN, 0.85);
    // 4 Symmetrical Outer Fuel Rods + Tall Central Crystalline Plutonium Core
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) * 0.5 + Math.PI * 0.25;
      const rx = Math.cos(a) * 0.17;
      const rz = Math.sin(a) * 0.17;
      b.addCylinderY(rx, 0.10, 0.66, rz, 0.075, 0.075, 8, PLUT_GREEN, 0.82);
      b.addTorusXZ(rx, 0.64, rz, 0.078, 0.02, 8, 6, SLATE_DARK, 0.05);
    }
    b.addCylinderY(0, 0.10, 0.88, 0, 0.14, 0.12, 10, PLUT_CORE, 0.95);
    b.addOctahedron(0, 0.56, 0, 0.30, 0.40, 0.30, PLUT_GREEN, 0.92);
    b.addOctahedron(0, 0.98, 0, 0.16, 0.22, 0.16, PLUT_CORE, 1.0); // Floating crown crystal
    b.addTorusXZ(0, 0.82, 0, 0.16, 0.032, 10, 6, TITANIUM, 0.25);
    compile("plutoniumCore");

    // 3b. Plutonium Orbital Gyro-Rings & 3-Blade Radiation Trefoil (☢)
    b.addTorusXZ(0, 0.48, 0, 0.44, 0.036, 16, 6, PLUT_GREEN, 0.92);
    b.addTorusXZ(0, 0.24, 0, 0.40, 0.028, 16, 6, PLUT_CORE, 0.85);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      const fx = Math.cos(a) * 0.34;
      const fz = Math.sin(a) * 0.34;
      b.addBevelledBox(fx, 0.24, fz, 0.16, 0.05, 0.16, 0.015, SLATE_DARK, PLUT_GREEN, 0.75);
      const ex = Math.cos(a + 0.52) * 0.44;
      const ez = Math.sin(a + 0.52) * 0.44;
      b.addOctahedron(ex, 0.48, ez, 0.11, 0.11, 0.11, PLUT_CORE, 1.0);
    }
    compile("plutoniumBeacon");

    // 3c. Plutonium Floor Aura Halo (Makes every Plutonium location pop against the dark floor!)
    b.addTorusXZ(0, 0.025, 0, 0.49, 0.032, 16, 6, PLUT_GREEN, 0.95);
    b.addTorusXZ(0, 0.035, 0, 0.36, 0.02, 12, 6, PLUT_CORE, 0.85);
    compile("plutoniumHalo");

    // 4. PLUTONIUM CONTAINER / BARREL (Standby = Calm Industrial Gunmetal/Amber Drum; Active = Blazing Emerald/Gold Beacon!)
    // Base octagonal pedestal
    addIndustrialPedestal(0.46, 0.08, SLATE_LIGHT, 0.1);
    // Main heavy cylindrical gunmetal-slate containment drum
    b.addCylinderY(0, 0.08, 0.68, 0, 0.40, 0.40, 14, SLATE_MID, 0.08);
    // 3 Recessed Industrial Amber-Gold Structural Ribs / Hoops
    b.addTorusXZ(0, 0.16, 0, 0.41, 0.035, 14, 6, AMBER_MUTED, 0.18);
    b.addTorusXZ(0, 0.38, 0, 0.415, 0.040, 14, 6, AMBER_GOLD, 0.28);
    b.addTorusXZ(0, 0.60, 0, 0.41, 0.035, 14, 6, AMBER_MUTED, 0.18);
    // 4 Vertical Titanium Structural Stiffeners around the barrel
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) * 0.5;
      b.addBox(Math.cos(a) * 0.39, 0.38, Math.sin(a) * 0.39, 0.07, 0.52, 0.07, SLATE_LIGHT, 0.1);
    }
    // Heavy Top Receptor Collar + Inner Containment Well
    b.addTorusXZ(0, 0.68, 0, 0.35, 0.055, 14, 6, SLATE_LIGHT, 0.12);
    b.addCylinderY(0, 0.64, 0.71, 0, 0.28, 0.26, 12, PLUT_DEEP, 0.35);
    b.addCylinderY(0, 0.68, 0.73, 0, 0.20, 0.20, 12, PLUT_GREEN, 0.55);
    compile("containerVault");

    // 4b. Container ACTIVE Ignition Overlay (Rendered when player is carrying Plutonium & timer is running!)
    // Glowing emerald/amber energy shroud around the barrel + blazing open receptor core + dual floor/rim target rings
    b.addTorusXZ(0, 0.03, 0, 0.52, 0.04, 16, 6, PLUT_GREEN, 1.0);
    b.addTorusXZ(0, 0.38, 0, 0.44, 0.048, 14, 6, PLUT_GREEN, 0.95);
    b.addTorusXZ(0, 0.72, 0, 0.38, 0.05, 14, 6, PLUT_CORE, 1.0);
    b.addCylinderY(0, 0.68, 0.78, 0, 0.24, 0.24, 12, PLUT_CORE, 1.0);
    compile("containerActiveGlow");

    // 4c. Floating 3D Downward Delivery Target Chevron/Arrow above Container Barrel
    b.addCylinderY(0, 0.90, 1.22, 0, 0.03, 0.24, 8, PLUT_GREEN, 0.85);
    b.addBox(0, 1.32, 0, 0.11, 0.22, 0.11, AMBER_GOLD, 0.75);
    b.addTorusXZ(0, 0.92, 0, 0.26, 0.028, 12, 6, PLUT_CORE, 0.9);
    compile("containerArrow");

    // 5. Security Key (Unified Industrial Pedestal + Warm Amber-Gold & Titanium Key)
    addIndustrialPedestal(0.34, 0.07, AMBER_GOLD, 0.35);
    b.addTorusXZ(0, 0.34, -0.20, 0.15, 0.05, 12, 6, AMBER_GOLD, 0.65);
    b.addBox(0, 0.34, 0.08, 0.08, 0.07, 0.42, TITANIUM_HI, 0.45);
    b.addBox(0.10, 0.34, 0.14, 0.13, 0.07, 0.06, AMBER_GOLD, 0.75);
    b.addBox(0.12, 0.34, 0.25, 0.16, 0.07, 0.06, AMBER_GOLD, 0.75);
    compile("keyItem");

    // 6. Excavator Spade (Unified Industrial Pedestal + Titanium Scoop Blade & Amber-Gold Grip)
    addIndustrialPedestal(0.34, 0.07, AMBER_GOLD, 0.35);
    b.addBox(0, 0.34, -0.30, 0.24, 0.07, 0.07, AMBER_GOLD, 0.65); // Amber T-grip
    b.addBox(0, 0.34, -0.06, 0.07, 0.06, 0.42, SLATE_LIGHT, 0.25); // Gunmetal shaft
    b.addBevelledBox(0, 0.34, 0.20, 0.34, 0.06, 0.24, 0.02, TITANIUM, TITANIUM_HI, 0.45); // Titanium scoop
    b.addOctahedron(0, 0.34, 0.32, 0.17, 0.04, 0.12, AMBER_GOLD, 0.7); // Cutting edge
    compile("spadeItem");

    // 6b. Radiation Shield / Med-Pod Capsule (Unified Titanium & Cryo-Cyan Pod)
    addIndustrialPedestal(0.34, 0.07, CRYO_CYAN, 0.35);
    b.addCylinderY(0, 0.12, 0.54, 0, 0.22, 0.22, 12, TITANIUM_HI, 0.35);
    b.addTorusXZ(0, 0.33, 0, 0.23, 0.032, 12, 6, CRYO_CYAN, 0.75);
    b.addBox(0, 0.56, 0, 0.24, 0.05, 0.08, CRYO_CYAN, 0.85);
    b.addBox(0, 0.56, 0, 0.08, 0.05, 0.24, CRYO_CYAN, 0.85);
    compile("capsuleItem");

    // 7. Insulating Mat (Harmonized Gunmetal-Slate Deck Plate with Warm Amber-Gold Insulated Ribs)
    b.addBevelledBox(0, 0.10, 0, 0.80, 0.12, 0.60, 0.04, SLATE_MID, SLATE_LIGHT, 0.15);
    b.addBox(-0.22, 0.17, 0, 0.10, 0.035, 0.50, AMBER_GOLD, 0.6);
    b.addBox(0.0, 0.17, 0, 0.10, 0.035, 0.50, AMBER_GOLD, 0.6);
    b.addBox(0.22, 0.17, 0, 0.10, 0.035, 0.50, AMBER_GOLD, 0.6);
    compile("matItem");

    // 8. Extra Time Chrono Hourglass (Titanium-Silver & Amber-Gold Frame with Cryo-Cyan Stasis Core)
    addIndustrialPedestal(0.34, 0.07, AMBER_GOLD, 0.35);
    b.addBox(0, 0.12, 0, 0.46, 0.06, 0.46, AMBER_GOLD, 0.55);
    b.addCylinderY(0, 0.15, 0.42, 0, 0.22, 0.04, 10, CRYO_CYAN, 0.75);
    b.addCylinderY(0, 0.42, 0.68, 0, 0.04, 0.22, 10, CRYO_CYAN, 0.75);
    b.addBox(0, 0.70, 0, 0.46, 0.06, 0.46, AMBER_GOLD, 0.55);
    compile("extraTimeItem");

    // 9. Supply / Mystery Crate (Dark Gunmetal-Slate & Titanium Crate with Warm Amber-Gold '?' Emblem — No Clash!)
    b.addBevelledBox(0, 0.30, 0, 0.66, 0.54, 0.66, 0.06, SLATE_MID, SLATE_LIGHT, 0.15);
    b.addBox(0, 0.30, 0, 0.70, 0.08, 0.12, TITANIUM, 0.3);
    b.addBox(0, 0.30, 0, 0.12, 0.08, 0.70, TITANIUM, 0.3);
    b.addBox(0, 0.60, -0.13, 0.24, 0.06, 0.07, AMBER_GOLD, 0.85);
    b.addBox(0.08, 0.60, -0.05, 0.07, 0.06, 0.13, AMBER_GOLD, 0.85);
    b.addBox(0, 0.60, 0.02, 0.15, 0.06, 0.07, AMBER_GOLD, 0.85);
    b.addBox(0, 0.60, 0.16, 0.08, 0.06, 0.08, AMBER_GOLD, 0.85);
    compile("mysteryBox");

    // 10. Locked Key-Door (Dark Gunmetal-Slate Bulkhead with Warm Amber-Gold Padlock matching the Key!)
    b.addBevelledBox(0, 0.40, 0, 0.94, 0.80, 0.40, 0.05, SLATE_MID, SLATE_LIGHT, 0.12);
    b.addTorusXZ(0, 0.88, 0, 0.16, 0.045, 10, 6, AMBER_GOLD, 0.75);
    b.addBevelledBox(0, 0.58, 0, 0.36, 0.44, 0.50, 0.03, AMBER_GOLD, TITANIUM_HI, 0.65);
    b.addCylinderY(0, 0.62, 0.84, 0, 0.07, 0.07, 8, SLATE_DARK, 0.0);
    compile("lockedDoor");

    // Airlock / Proximity Door (Dark Gunmetal-Slate Gate with Cryo-Cyan Sensor Ring)
    b.addBevelledBox(0, 0.40, 0, 0.94, 0.80, 0.40, 0.05, SLATE_MID, SLATE_LIGHT, 0.15);
    b.addTorusXZ(0, 0.86, 0, 0.22, 0.045, 12, 6, CRYO_CYAN, 0.8);
    b.addOctahedron(0, 0.86, 0, 0.14, 0.14, 0.14, TITANIUM_HI, 0.75);
    compile("proximityDoor");

    // 11. Automatic Laser/Blast Door:
    // Low-profile floor threshold rails at North (-Z) and South (+Z) edges
    b.addBox(0, 0.05, -0.43, 0.94, 0.10, 0.12, SLATE_MID, 0.08);
    b.addBox(0, 0.05, 0.43, 0.94, 0.10, 0.12, SLATE_MID, 0.08);
    compile("laserPylons");

    // OPEN / SAFE indicator: Clean Cryo-Cyan walkthrough guide strips (reserves green 100% for Plutonium & Barrels!)
    b.addBox(0, 0.025, 0, 0.84, 0.03, 0.66, CRYO_DEEP, 0.45);
    b.addBox(-0.26, 0.045, 0, 0.10, 0.025, 0.62, CRYO_CYAN, 0.85);
    b.addBox(0.26, 0.045, 0, 0.10, 0.025, 0.62, CRYO_CYAN, 0.85);
    b.addOctahedron(0, 0.86, -0.42, 0.12, 0.12, 0.12, CRYO_CYAN, 0.85);
    b.addOctahedron(0, 0.86, 0.42, 0.12, 0.12, 0.12, CRYO_CYAN, 0.85);
    compile("laserSafeOpen");

    // CLOSED / CLOSING DANGER indicator: Crimson-Red alarm pad + overhead Crimson beacons
    b.addBox(0, 0.03, 0, 0.86, 0.04, 0.68, CRIMSON_DEEP, 0.65);
    b.addOctahedron(0, 0.90, -0.42, 0.16, 0.18, 0.16, CRIMSON_RED, 0.95);
    b.addOctahedron(0, 0.90, 0.42, 0.16, 0.18, 0.16, CRIMSON_RED, 0.95);
    compile("laserDangerClosed");

    // Sliding Deadly Door Leaf (Dark Gunmetal Blast Frame + Pure Crimson-Red Plasma Laser Bars)
    b.addBevelledBox(0, 0.42, 0, 0.88, 0.76, 0.34, 0.03, OBSIDIAN_HI, SLATE_LIGHT, 0.25);
    b.addBox(0, 0.22, 0, 0.92, 0.08, 0.36, CRIMSON_RED, 0.95);
    b.addBox(0, 0.46, 0, 0.92, 0.08, 0.36, CRIMSON_RED, 0.95);
    b.addBox(0, 0.70, 0, 0.92, 0.08, 0.36, CRIMSON_RED, 0.95);
    compile("laserBeams");

    // 12. Warp Pad & Warp Frame (Unified Gunmetal-Slate & Cryo-Cyan)
    addIndustrialPedestal(0.45, 0.08, CRYO_CYAN, 0.65);
    b.addTorusXZ(0, 0.14, 0, 0.34, 0.04, 14, 6, CRYO_CYAN, 0.85);
    b.addTorusXZ(0, 0.24, 0, 0.22, 0.03, 12, 6, TITANIUM_HI, 0.8);
    compile("warpPad");

    b.addBevelledBox(0, 0.40, 0, 0.84, 0.80, 0.84, 0.08, SLATE_MID, SLATE_LIGHT, 0.18);
    b.addTorusXZ(0, 0.52, 0, 0.34, 0.045, 10, 6, CRYO_CYAN, 0.75);
    compile("warpFrame");

    // 13. Crumbly Diggable Regolith (Harmonized Dark Basalt-Slate & Warm Amber Mineral Seams)
    b.addBevelledBox(0, 0.15, 0, 0.84, 0.30, 0.84, 0.07, [0.22, 0.20, 0.18], [0.32, 0.28, 0.24], 0.05);
    b.addOctahedron(-0.18, 0.34, -0.14, 0.26, 0.26, 0.26, [0.38, 0.32, 0.24], 0.08);
    b.addOctahedron(0.18, 0.38, 0.14, 0.24, 0.28, 0.24, AMBER_MUTED, 0.18);
    b.addOctahedron(0.0, 0.32, 0.02, 0.28, 0.24, 0.28, [0.28, 0.24, 0.20], 0.06);
    compile("crumblyDirt");

    b.addOctahedron(0, 0.36, 0, 0.42, 0.46, 0.42, SLATE_MID, 0.05);
    b.addOctahedron(0.15, 0.24, 0.15, 0.26, 0.30, 0.26, SLATE_DARK, 0.04);
    compile("rockBlock");

    // 14. Forcefield Barrier & Skull Hazard (Unified Obsidian-Graphite + Crimson-Red)
    b.addBevelledBox(0, 0.38, 0, 0.90, 0.74, 0.90, 0.06, OBSIDIAN_HI, CRIMSON_DEEP, 0.35);
    b.addTorusXZ(0, 0.76, 0, 0.34, 0.04, 12, 6, CRIMSON_RED, 0.9);
    b.addOctahedron(0, 0.84, 0, 0.18, 0.22, 0.18, CRIMSON_RED, 0.95);
    compile("hazardField");

    // 14b. 3D Titanium Skull & Crimson Eyes on Obsidian Threshold
    addIndustrialPedestal(0.44, 0.06, CRIMSON_RED, 0.55);
    b.addBevelledBox(0, 0.22, -0.04, 0.34, 0.22, 0.32, 0.05, TITANIUM, TITANIUM_HI, 0.45);
    b.addBox(0, 0.14, 0.15, 0.20, 0.11, 0.13, TITANIUM, 0.4);
    b.addBox(-0.08, 0.26, 0.06, 0.07, 0.07, 0.07, CRIMSON_RED, 0.95);
    b.addBox(0.08, 0.26, 0.06, 0.07, 0.07, 0.07, CRIMSON_RED, 0.95);
    compile("skullHazard");

    // 15. Exit Extraction Portal (Monumental Dark Titanium & Cryo-Cyan Stargate Archway)
    addIndustrialPedestal(0.46, 0.10, CRYO_CYAN, 0.75);
    b.addBox(-0.36, 0.46, 0, 0.12, 0.88, 0.20, TITANIUM, 0.45);
    b.addBox(0.36, 0.46, 0, 0.12, 0.88, 0.20, TITANIUM, 0.45);
    b.addBox(0, 0.90, 0, 0.86, 0.13, 0.24, TITANIUM_HI, 0.55);
    b.addTorusXZ(0, 0.50, 0, 0.36, 0.05, 14, 6, CRYO_CYAN, 0.95);
    b.addOctahedron(0, 1.12, 0, 0.22, 0.28, 0.22, CRYO_CYAN, 0.95);
    compile("exitPortal");

    // 16. Articulated 3D Astronaut Player Meshes (Ceramic-White + Gunmetal-Slate + Cryo-Cyan Visor)
    b.addBevelledBox(0, 0, 0, 0.44, 0.42, 0.28, 0.04, TITANIUM_HI, [1.0, 1.0, 1.0], 0.22);
    b.addBox(0, 0.04, 0.15, 0.30, 0.20, 0.06, CRYO_CYAN, 0.8);
    b.addBox(0, 0.02, -0.20, 0.34, 0.34, 0.15, SLATE_MID, 0.12);
    b.addCylinderY(0, -0.08, 0.14, -0.25, 0.08, 0.08, 8, CRYO_CYAN, 0.85);
    compile("playerTorso");

    b.addBevelledBox(0, 0, 0, 0.36, 0.34, 0.36, 0.06, TITANIUM_HI, [1.0, 1.0, 1.0], 0.25);
    b.addBox(0, 0.0, 0.15, 0.28, 0.16, 0.12, CRYO_CYAN, 0.95);
    b.addCylinderY(0.15, 0.15, 0.32, -0.05, 0.022, 0.014, 6, AMBER_GOLD, 0.75);
    compile("playerHead");

    b.addBevelledBox(0, -0.14, 0, 0.15, 0.30, 0.15, 0.02, TITANIUM, TITANIUM_HI, 0.18);
    b.addBox(0, -0.28, 0.03, 0.17, 0.10, 0.20, SLATE_LIGHT, 0.35);
    compile("playerLimb");

    // 17. Compact, Agile 3D Alien Hunters:
    // - Normal Alien (Type 0): Monochrome "Grau-in-Grau" (Anthracite / Ash-Grey / Brushed Silver-Grey)
    // - Fast Alien   (Type 1): "Dunkelblau" (Deep Navy / Midnight Cobalt / Steel-Blue)
    const ALIEN_GREY_DARK  = [0.28, 0.30, 0.33];
    const ALIEN_GREY_MID   = [0.46, 0.49, 0.53];
    const ALIEN_GREY_LIGHT = [0.68, 0.71, 0.76];
    const ALIEN_GREY_EYE   = [0.88, 0.91, 0.95];

    const ALIEN_BLUE_DEEP  = [0.07, 0.14, 0.32];
    const ALIEN_BLUE_MID   = [0.13, 0.25, 0.52];
    const ALIEN_BLUE_HI    = [0.22, 0.40, 0.74];
    const ALIEN_BLUE_EYE   = [0.48, 0.74, 0.98];

    // 17a. Normal Alien Body ("Grau-in-Grau" Compact Arachnid Stalker)
    b.addBevelledBox(0, 0.05, 0.06, 0.24, 0.17, 0.30, 0.035, ALIEN_GREY_DARK, ALIEN_GREY_MID, 0.10);
    b.addOctahedron(0, 0.10, -0.18, 0.18, 0.16, 0.22, ALIEN_GREY_MID, 0.14);
    b.addOctahedron(0, 0.14, -0.18, 0.11, 0.11, 0.14, ALIEN_GREY_LIGHT, 0.28);
    b.addCylinderY(0, 0.11, 0.28, 0.08, 0.035, 0.008, 6, ALIEN_GREY_LIGHT, 0.22);
    b.addCylinderY(0, 0.13, 0.32, -0.03, 0.04, 0.008, 6, ALIEN_GREY_EYE, 0.30);
    b.addCylinderY(0, 0.14, 0.29, -0.14, 0.035, 0.008, 6, ALIEN_GREY_LIGHT, 0.22);
    // 6 Pale Silver-Grey Arachnid Eyes
    b.addBox(-0.06, 0.07, 0.21, 0.04, 0.035, 0.035, ALIEN_GREY_EYE, 0.65);
    b.addBox(0.06, 0.07, 0.21, 0.04, 0.035, 0.035, ALIEN_GREY_EYE, 0.65);
    b.addBox(-0.10, 0.10, 0.18, 0.035, 0.03, 0.035, ALIEN_GREY_LIGHT, 0.55);
    b.addBox(0.10, 0.10, 0.18, 0.035, 0.03, 0.035, ALIEN_GREY_LIGHT, 0.55);
    b.addBox(-0.03, 0.11, 0.22, 0.03, 0.03, 0.03, [0.95, 0.97, 1.0], 0.75);
    b.addBox(0.03, 0.11, 0.22, 0.03, 0.03, 0.03, [0.95, 0.97, 1.0], 0.75);
    compile("droidCore");

    // 17b. Compact Articulated Alien Spider Leg (Neutral Grey-Steel base so tinting yields Grey-on-Grey or Dark-Blue)
    b.addBox(0.10, 0.10, 0, 0.18, 0.04, 0.04, [0.50, 0.53, 0.57], 0.12);
    b.addOctahedron(0.19, 0.13, 0, 0.04, 0.055, 0.04, [0.70, 0.74, 0.79], 0.22);
    b.addCylinderY(0.25, -0.18, 0.13, 0, 0.012, 0.032, 5, [0.38, 0.41, 0.45], 0.12);
    b.addOctahedron(0.25, -0.18, 0, 0.028, 0.055, 0.028, [0.82, 0.85, 0.90], 0.35);
    compile("alienSpiderLeg");

    // 17c. Compact Serrated Mandible ("Grau-in-Grau")
    b.addBox(0, 0.0, 0.08, 0.04, 0.035, 0.14, ALIEN_GREY_MID, 0.15);
    b.addOctahedron(0, 0.0, 0.16, 0.03, 0.03, 0.055, ALIEN_GREY_EYE, 0.45);
    compile("alienMandible");

    // 17d. Fast Alien Body ("Dunkelblau" — Deep Navy / Midnight Cobalt Hunter)
    b.addBevelledBox(0, 0.11, 0.02, 0.26, 0.23, 0.32, 0.04, ALIEN_BLUE_DEEP, ALIEN_BLUE_MID, 0.15);
    b.addOctahedron(0, 0.22, -0.15, 0.15, 0.12, 0.26, ALIEN_BLUE_MID, 0.20);
    b.addCylinderY(-0.12, 0.18, 0.36, -0.07, 0.032, 0.008, 6, ALIEN_BLUE_HI, 0.35);
    b.addCylinderY(0.12, 0.18, 0.36, -0.07, 0.032, 0.008, 6, ALIEN_BLUE_HI, 0.35);
    b.addOctahedron(0, 0.10, 0.17, 0.09, 0.10, 0.07, ALIEN_BLUE_HI, 0.55);
    b.addBox(-0.07, 0.19, 0.18, 0.05, 0.035, 0.04, ALIEN_BLUE_EYE, 0.80);
    b.addBox(0.07, 0.19, 0.18, 0.05, 0.035, 0.04, ALIEN_BLUE_EYE, 0.80);
    b.addBox(0, 0.23, 0.19, 0.035, 0.035, 0.035, [0.72, 0.88, 1.0], 0.85);
    compile("fastDroidBody");

    // 17e. Compact Scythe Claw Arm ("Dunkelblau" Cobalt Blade)
    b.addBox(0, 0.10, 0.11, 0.045, 0.05, 0.21, ALIEN_BLUE_MID, 0.18);
    b.addOctahedron(0, 0.03, 0.23, 0.032, 0.15, 0.11, ALIEN_BLUE_HI, 0.55);
    compile("alienScytheClaw");

    // 17f. Compact Scorpion Tail ("Dunkelblau" Cobalt Stinger)
    b.addCylinderY(0, 0.06, 0.32, -0.21, 0.038, 0.016, 6, ALIEN_BLUE_MID, 0.20);
    b.addOctahedron(0, 0.34, -0.17, 0.038, 0.05, 0.09, ALIEN_BLUE_EYE, 0.65);
    compile("alienTailStinger");

    // 17g. Subtle Dark Aura Ring
    b.addTorusXZ(0, 0.03, 0, 0.28, 0.02, 12, 6, ALIEN_GREY_MID, 0.35);
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
    b.addTorusXZ(0, 0, 0, 0.46, 0.07, 12, 6, CRIMSON_RED, 0.95);
    compile("explosionFireball");

    // 20. Jagged 3D Hull / Door / Suit Shrapnel Plate
    b.addBevelledBox(0, 0, 0, 0.28, 0.08, 0.22, 0.02, TITANIUM, AMBER_GOLD, 0.65);
    b.addOctahedron(0.08, 0.04, 0, 0.12, 0.08, 0.10, CRIMSON_RED, 0.85);
    compile("debrisArmorChunk");

    // 21. Exploded Alien Chitin Carapace Fragment (Neutral Grey/Steel so tinting matches Grey or Dark-Blue alien)
    b.addBevelledBox(0, 0, 0, 0.20, 0.10, 0.22, 0.025, [0.52, 0.55, 0.60], [0.74, 0.78, 0.84], 0.35);
    b.addOctahedron(0, 0.05, 0, 0.11, 0.11, 0.11, [0.85, 0.88, 0.94], 0.55);
    compile("alienBioChunk");

    return meshes;
  }
}
