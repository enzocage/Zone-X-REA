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

    // 1. Sci-Fi Floor Tile (1x1 unit)
    b.addBox(0, -0.04, 0, 0.96, 0.08, 0.96, [0.09, 0.12, 0.18], 0.0, [0.11, 0.15, 0.22]);
    b.addBox(0, 0.005, 0, 0.72, 0.01, 0.72, [0.13, 0.18, 0.27], 0.05);
    compile("floorTile");

    // 2. Wall Bulkhead (3D Reactor Armor Block with Bevel & Neon Conduit)
    b.addBevelledBox(0, 0.36, 0, 0.98, 0.72, 0.98, 0.09, [0.22, 0.35, 0.56], [0.34, 0.52, 0.78], 0.05);
    b.addBox(0, 0.73, 0, 0.62, 0.05, 0.62, [0.16, 0.26, 0.42], 0.05, [0.42, 0.65, 0.92]);
    b.addBox(0, 0.42, 0, 1.0, 0.06, 1.0, [0.2, 0.75, 1.0], 0.55);
    compile("wallBlock");

    // 3. Plutonium Core (Unmistakable Radioactive Plutonium Fuel Rod Cluster + Black/Yellow Hazard Base)
    // High-contrast Black & Yellow octagonal radiation containment pad on the floor
    b.addCylinderY(0, 0.0, 0.1, 0, 0.46, 0.44, 8, [0.95, 0.78, 0.02], 0.35);
    b.addCylinderY(0, 0.1, 0.16, 0, 0.39, 0.37, 8, [0.05, 0.06, 0.08], 0.02);
    // 3-Blade Yellow-on-Black Radiation Trefoil Symbol (☢) on the pedestal
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      b.addBox(Math.cos(a) * 0.23, 0.17, Math.sin(a) * 0.23, 0.17, 0.04, 0.17, [0.98, 0.82, 0.02], 0.45);
    }
    // Cluster of 4 Vivid Radioactive Neon-Green Plutonium Fuel Rods (low R/B so they stay pure neon-green!)
    b.addCylinderY(0, 0.16, 0.78, 0, 0.17, 0.17, 10, [0.02, 0.95, 0.04], 0.65);
    b.addCylinderY(-0.15, 0.16, 0.6, 0.11, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addCylinderY(0.15, 0.16, 0.6, 0.11, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addCylinderY(0.0, 0.16, 0.6, -0.17, 0.1, 0.1, 8, [0.03, 0.88, 0.05], 0.55);
    b.addOctahedron(0, 0.52, 0, 0.28, 0.36, 0.28, [0.04, 0.98, 0.06], 0.7);
    // Dark Lead/Steel Cap Rings on top of the fuel rods for crisp contrast
    b.addTorusXZ(0, 0.76, 0, 0.17, 0.04, 10, 6, [0.08, 0.1, 0.12], 0.05);
    compile("plutoniumCore");

    // 3b. Rotating Radioactive Trefoil Rotor (☢) + Orbiting Atomic Electrons (⚛) around Plutonium
    b.addTorusXZ(0, 0.44, 0, 0.44, 0.04, 16, 6, [0.02, 0.92, 0.04], 0.65);
    b.addTorusXZ(0, 0.24, 0, 0.38, 0.032, 14, 6, [0.96, 0.8, 0.02], 0.5);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      // High-contrast Black & Yellow Trefoil Warning Fin
      const fx = Math.cos(a) * 0.35;
      const fz = Math.sin(a) * 0.35;
      b.addBox(fx, 0.24, fz, 0.18, 0.06, 0.18, [0.06, 0.07, 0.09], 0.05);
      b.addBox(fx, 0.28, fz, 0.13, 0.03, 0.13, [0.98, 0.84, 0.02], 0.55);
      // Vivid Radioactive Neon-Green Electron Sphere
      const ex = Math.cos(a + 0.52) * 0.44;
      const ez = Math.sin(a + 0.52) * 0.44;
      b.addOctahedron(ex, 0.44 + (i - 1) * 0.1, ez, 0.12, 0.12, 0.12, [0.02, 0.98, 0.05], 0.75);
    }
    compile("plutoniumBeacon");

    // 4. Plutonium Container (Unmistakable Yellow & Black Striped Radioactive Waste Barrel / Atommüll-Tonne with Open Glowing Receptor Mouth)
    // Main Signal-Yellow cylindrical steel barrel body
    b.addCylinderY(0, 0.0, 0.68, 0, 0.44, 0.44, 14, [0.96, 0.78, 0.02], 0.35);
    // 3 Bold Black Hazard Stripes / Barrel Hoops (bottom, middle, upper)
    b.addTorusXZ(0, 0.1, 0, 0.445, 0.042, 14, 6, [0.06, 0.07, 0.09], 0.02);
    b.addTorusXZ(0, 0.35, 0, 0.45, 0.048, 14, 6, [0.06, 0.07, 0.09], 0.02);
    b.addTorusXZ(0, 0.6, 0, 0.445, 0.042, 14, 6, [0.06, 0.07, 0.09], 0.02);
    // Radioactive hazard emblem plates on the N/S/E/W sides of the yellow drum
    b.addBox(0, 0.35, 0.43, 0.24, 0.2, 0.05, [0.06, 0.07, 0.09], 0.02);
    b.addOctahedron(0, 0.35, 0.46, 0.1, 0.1, 0.04, [0.02, 0.95, 0.04], 0.65);
    b.addBox(0, 0.35, -0.43, 0.24, 0.2, 0.05, [0.06, 0.07, 0.09], 0.02);
    // Heavy Top Receptor Rim + Vivid Radioactive Neon-Green Open Funnel Mouth (matches Plutonium color!)
    b.addTorusXZ(0, 0.69, 0, 0.38, 0.065, 14, 6, [0.08, 0.09, 0.11], 0.05);
    b.addCylinderY(0, 0.66, 0.72, 0, 0.31, 0.28, 12, [0.02, 0.25, 0.04], 0.15);
    b.addCylinderY(0, 0.69, 0.74, 0, 0.24, 0.24, 12, [0.02, 0.95, 0.04], 0.65);
    compile("containerVault");

    // 4b. Floating 3D Downward Delivery Target Arrow above every Container Barrel
    b.addCylinderY(0, 0.88, 1.18, 0, 0.03, 0.22, 8, [0.02, 0.95, 0.04], 0.65); // Vivid green arrow head cone
    b.addBox(0, 1.28, 0, 0.11, 0.22, 0.11, [0.98, 0.84, 0.02], 0.55); // Gold arrow shaft
    compile("containerArrow");

    // 5. Golden Key (True 3D Key Shape: Round Bow Ring + Long Shaft + Double Key Teeth)
    b.addTorusXZ(0, 0.36, -0.22, 0.16, 0.055, 12, 6, [1.0, 0.85, 0.12], 0.85); // Key ring bow
    b.addBox(0, 0.36, 0.08, 0.09, 0.08, 0.44, [1.0, 0.88, 0.18], 0.85); // Key shaft
    b.addBox(0.11, 0.36, 0.14, 0.14, 0.08, 0.07, [1.0, 0.92, 0.28], 0.95); // Tooth 1
    b.addBox(0.13, 0.36, 0.26, 0.18, 0.08, 0.07, [1.0, 0.92, 0.28], 0.95); // Tooth 2
    compile("keyItem");

    // 6. Excavator Spade / Shovel (True 3D Shovel: T-Grip Handle + Shaft + Wide Pointed Steel Scoop Blade)
    b.addBox(0, 0.36, -0.32, 0.26, 0.08, 0.08, [1.0, 0.65, 0.12], 0.8); // Orange/Gold T-handle grip
    b.addBox(0, 0.36, -0.08, 0.07, 0.07, 0.44, [0.85, 0.62, 0.22], 0.55); // Wooden/alloy shaft
    b.addBevelledBox(0, 0.35, 0.2, 0.36, 0.06, 0.26, 0.02, [0.75, 0.88, 1.0], [0.9, 0.96, 1.0], 0.75); // Wide steel shovel scoop
    b.addOctahedron(0, 0.35, 0.33, 0.18, 0.04, 0.14, [0.3, 0.95, 1.0], 0.9); // Pointed digging tip
    compile("spadeItem");

    // 6b. Radiation Shield / Med-Pod Capsule (White/Emerald Hazmat Pod with Bold 3D Cross)
    b.addCylinderY(0, 0.12, 0.56, 0, 0.24, 0.24, 12, [0.9, 0.96, 1.0], 0.5);
    b.addTorusXZ(0, 0.34, 0, 0.25, 0.035, 12, 6, [0.1, 0.95, 0.55], 0.85);
    b.addBox(0, 0.59, 0, 0.28, 0.06, 0.1, [0.1, 1.0, 0.45], 0.95); // 3D Cross bar 1
    b.addBox(0, 0.59, 0, 0.1, 0.06, 0.28, [0.1, 1.0, 0.45], 0.95); // 3D Cross bar 2
    compile("capsuleItem");

    // 7. Insulating Mat / Radiation Shield Mat (Ribbed Golden-Copper Hazard Tread Platform)
    b.addBevelledBox(0, 0.12, 0, 0.82, 0.14, 0.62, 0.04, [0.95, 0.55, 0.1], [1.0, 0.78, 0.22], 0.65);
    b.addBox(-0.24, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    b.addBox(0.0, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    b.addBox(0.24, 0.2, 0, 0.1, 0.04, 0.52, [0.15, 0.95, 1.0], 0.9);
    compile("matItem");

    // 8. Extra Time Chrono Hourglass (Distinct 3D Golden Hourglass with Glowing Cyan Sand Bulbs)
    b.addBox(0, 0.1, 0, 0.56, 0.07, 0.56, [1.0, 0.82, 0.18], 0.65); // Bottom gold plate
    b.addCylinderY(0, 0.14, 0.42, 0, 0.26, 0.04, 10, [0.2, 0.92, 1.0], 0.95); // Lower sand bulb
    b.addCylinderY(0, 0.42, 0.7, 0, 0.04, 0.26, 10, [0.2, 0.92, 1.0], 0.95); // Upper sand bulb
    b.addBox(0, 0.73, 0, 0.56, 0.07, 0.56, [1.0, 0.82, 0.18], 0.65); // Top gold plate
    compile("extraTimeItem");

    // 9. Bonus / Mystery Box (3D Treasure Crate with Bold Golden '?' Question Emblem on Top)
    b.addBevelledBox(0, 0.32, 0, 0.68, 0.58, 0.68, 0.06, [0.62, 0.18, 0.88], [0.8, 0.35, 1.0], 0.5);
    b.addBox(0, 0.32, 0, 0.72, 0.1, 0.14, [1.0, 0.85, 0.15], 0.9);
    b.addBox(0, 0.32, 0, 0.14, 0.1, 0.72, [1.0, 0.85, 0.15], 0.9);
    // 3D '?' symbol raised above the crate top
    b.addBox(0, 0.64, -0.14, 0.26, 0.07, 0.08, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0.09, 0.64, -0.05, 0.08, 0.07, 0.14, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0, 0.64, 0.02, 0.16, 0.07, 0.08, [1.0, 0.95, 0.25], 1.0);
    b.addBox(0, 0.64, 0.18, 0.09, 0.07, 0.09, [1.0, 0.95, 0.25], 1.0);
    compile("mysteryBox");

    // 10. Locked Key-Door & Airlock Door (Heavy Armored Gate with Giant 3D Golden Padlock / Keyhole)
    b.addBevelledBox(0, 0.42, 0, 0.96, 0.84, 0.42, 0.05, [0.78, 0.32, 0.12], [0.95, 0.52, 0.18], 0.3);
    // Giant Golden Padlock Shackle + Body on Top & Front so player knows it needs a Key
    b.addTorusXZ(0, 0.92, 0, 0.18, 0.05, 10, 6, [1.0, 0.88, 0.15], 0.95);
    b.addBox(0, 0.62, 0, 0.38, 0.48, 0.52, [1.0, 0.84, 0.12], 0.85);
    b.addCylinderY(0, 0.65, 0.9, 0, 0.08, 0.08, 8, [0.08, 0.08, 0.1], 0.0); // Keyhole center
    compile("lockedDoor");

    // Airlock / Proximity Door (Cyan-Armored Bulkhead Gate with Glowing Sensor Wheel)
    b.addBevelledBox(0, 0.42, 0, 0.96, 0.84, 0.42, 0.05, [0.16, 0.58, 0.78], [0.28, 0.82, 0.98], 0.35);
    b.addTorusXZ(0, 0.88, 0, 0.24, 0.05, 12, 6, [0.2, 1.0, 0.7], 0.95);
    b.addOctahedron(0, 0.88, 0, 0.16, 0.16, 0.16, [1.0, 0.9, 0.25], 0.95);
    compile("proximityDoor");

    // 11. Automatic Laser/Blast Door:
    // Low-profile floor threshold rails at North (-Z) and South (+Z) edges so OPEN doors are 100% clear!
    b.addBox(0, 0.05, -0.43, 0.94, 0.1, 0.12, [0.28, 0.36, 0.48], 0.15);
    b.addBox(0, 0.05, 0.43, 0.94, 0.1, 0.12, [0.28, 0.36, 0.48], 0.15);
    compile("laserPylons");

    // OPEN / SAFE indicator: Flat emerald-green walkthrough floor pad + high-visibility overhead green beacons
    b.addBox(0, 0.03, 0, 0.88, 0.04, 0.72, [0.1, 1.0, 0.45], 0.95);
    b.addBox(-0.28, 0.06, 0, 0.12, 0.03, 0.68, [0.4, 1.0, 0.75], 1.0);
    b.addBox(0.28, 0.06, 0, 0.12, 0.03, 0.68, [0.4, 1.0, 0.75], 1.0);
    b.addOctahedron(0, 0.88, -0.42, 0.15, 0.15, 0.15, [0.15, 1.0, 0.5], 1.0);
    b.addOctahedron(0, 0.88, 0.42, 0.15, 0.15, 0.15, [0.15, 1.0, 0.5], 1.0);
    compile("laserSafeOpen");

    // CLOSED / CLOSING DANGER indicator: Crimson floor warning pad + high-visibility overhead red alarm diamonds
    b.addBox(0, 0.03, 0, 0.88, 0.04, 0.72, [1.0, 0.08, 0.18], 0.95);
    b.addOctahedron(0, 0.92, -0.42, 0.18, 0.2, 0.18, [1.0, 0.12, 0.2], 1.0);
    b.addOctahedron(0, 0.92, 0.42, 0.18, 0.2, 0.18, [1.0, 0.12, 0.2], 1.0);
    compile("laserDangerClosed");

    // Sliding Deadly Door Leaf (slides from North -Z and South +Z sills to seal the corridor up to Y=0.84)
    b.addBevelledBox(0, 0.44, 0, 0.9, 0.8, 0.36, 0.03, [0.95, 0.12, 0.22], [1.0, 0.35, 0.2], 0.85);
    b.addBox(0, 0.24, 0, 0.94, 0.09, 0.38, [1.0, 0.55, 0.1], 1.0);
    b.addBox(0, 0.5, 0, 0.94, 0.09, 0.38, [1.0, 0.9, 0.2], 1.0);
    b.addBox(0, 0.74, 0, 0.94, 0.09, 0.38, [1.0, 0.55, 0.1], 1.0);
    compile("laserBeams");

    // 12. Warp Pad & Warp Frame
    b.addCylinderY(0, 0.0, 0.1, 0, 0.46, 0.42, 14, [0.2, 0.3, 0.5], 0.2);
    b.addTorusXZ(0, 0.14, 0, 0.36, 0.045, 14, 6, [0.2, 0.95, 1.0], 0.95);
    b.addTorusXZ(0, 0.26, 0, 0.24, 0.035, 12, 6, [0.75, 0.35, 1.0], 0.95);
    compile("warpPad");

    b.addBevelledBox(0, 0.42, 0, 0.85, 0.84, 0.85, 0.08, [0.28, 0.22, 0.55], [0.48, 0.38, 0.88], 0.35);
    b.addTorusXZ(0, 0.55, 0, 0.35, 0.05, 10, 6, [0.3, 0.9, 1.0], 0.9);
    compile("warpFrame");

    // 13. Crumbly Diggable Dirt Mound (Rich Earthy Brown Soil & Golden Pebbles — clearly diggable!)
    b.addBevelledBox(0, 0.16, 0, 0.86, 0.32, 0.86, 0.08, [0.55, 0.36, 0.16], [0.68, 0.46, 0.22], 0.12);
    b.addOctahedron(-0.2, 0.36, -0.16, 0.28, 0.28, 0.28, [0.65, 0.44, 0.2], 0.15);
    b.addOctahedron(0.2, 0.4, 0.14, 0.26, 0.32, 0.26, [0.74, 0.52, 0.26], 0.18);
    b.addOctahedron(0.0, 0.34, 0.02, 0.32, 0.26, 0.32, [0.48, 0.32, 0.14], 0.1);
    compile("crumblyDirt");

    b.addOctahedron(0, 0.38, 0, 0.44, 0.48, 0.44, [0.45, 0.5, 0.58], 0.08);
    b.addOctahedron(0.16, 0.26, 0.16, 0.28, 0.32, 0.28, [0.35, 0.4, 0.48], 0.05);
    compile("rockBlock");

    // 14. Forcefield / Closed Slam Door Barrier & Skull Hazard / Open Slam Door Threshold
    b.addBevelledBox(0, 0.38, 0, 0.92, 0.76, 0.92, 0.06, [0.65, 0.08, 0.16], [0.95, 0.18, 0.25], 0.55);
    b.addTorusXZ(0, 0.78, 0, 0.36, 0.045, 12, 6, [1.0, 0.35, 0.15], 0.95);
    b.addOctahedron(0, 0.85, 0, 0.2, 0.24, 0.2, [1.0, 0.75, 0.15], 0.95);
    compile("hazardField");

    // 14b. 3D White Skull & Crossbones / One-Way Slam Door Threshold
    b.addBox(0, 0.04, 0, 0.88, 0.06, 0.88, [0.45, 0.08, 0.14], 0.35);
    b.addBevelledBox(0, 0.22, -0.04, 0.36, 0.22, 0.34, 0.05, [0.92, 0.92, 0.95], [1.0, 1.0, 1.0], 0.75); // Skull cranium
    b.addBox(0, 0.14, 0.16, 0.22, 0.12, 0.14, [0.88, 0.88, 0.92], 0.7); // Skull jaw
    b.addBox(-0.09, 0.28, 0.06, 0.08, 0.08, 0.08, [1.0, 0.1, 0.15], 1.0); // Red eye socket L
    b.addBox(0.09, 0.28, 0.06, 0.08, 0.08, 0.08, [1.0, 0.1, 0.15], 1.0); // Red eye socket R
    compile("skullHazard");

    // 15. Exit Extraction Portal (Giant Glowing Emerald/Gold Stargate Archway + Extraction Beacon)
    b.addCylinderY(0, 0.0, 0.14, 0, 0.48, 0.44, 14, [0.15, 0.55, 0.45], 0.45);
    b.addBox(-0.38, 0.48, 0, 0.12, 0.92, 0.22, [1.0, 0.84, 0.18], 0.75); // Left gold portal pillar
    b.addBox(0.38, 0.48, 0, 0.12, 0.92, 0.22, [1.0, 0.84, 0.18], 0.75); // Right gold portal pillar
    b.addBox(0, 0.92, 0, 0.9, 0.14, 0.26, [1.0, 0.88, 0.22], 0.85); // Top gold portal lintel
    b.addTorusXZ(0, 0.52, 0, 0.38, 0.055, 14, 6, [0.2, 1.0, 0.65], 1.0);
    b.addOctahedron(0, 1.15, 0, 0.24, 0.32, 0.24, [0.35, 1.0, 0.75], 1.0);
    compile("exitPortal");

    // 16. Articulated 3D Astronaut Player Meshes
    // Torso + Hazmat Backpack + Glowing Reactor Core
    b.addBevelledBox(0, 0, 0, 0.44, 0.42, 0.28, 0.04, [0.92, 0.95, 1.0], [1.0, 1.0, 1.0], 0.25);
    b.addBox(0, 0.04, 0.15, 0.32, 0.22, 0.06, [0.15, 0.75, 1.0], 0.85); // Chest telemetry plate
    b.addBox(0, 0.02, -0.2, 0.36, 0.36, 0.16, [0.35, 0.45, 0.58], 0.15); // Backpack
    b.addCylinderY(0, -0.1, 0.16, -0.26, 0.09, 0.09, 8, [0.2, 1.0, 0.65], 0.95); // Backpack core
    compile("playerTorso");

    // Helmet + Panoramic Cyan Visor + Antenna
    b.addBevelledBox(0, 0, 0, 0.36, 0.34, 0.36, 0.06, [0.95, 0.97, 1.0], [1.0, 1.0, 1.0], 0.3);
    b.addBox(0, 0.0, 0.15, 0.3, 0.18, 0.12, [0.1, 0.92, 1.0], 0.95); // Glowing visor
    b.addCylinderY(0.16, 0.15, 0.34, -0.05, 0.025, 0.015, 6, [1.0, 0.75, 0.2], 0.85);
    compile("playerHead");

    // Articulated Limb (Arm / Leg segment)
    b.addBevelledBox(0, -0.14, 0, 0.15, 0.3, 0.15, 0.02, [0.82, 0.88, 0.96], [0.92, 0.95, 1.0], 0.2);
    b.addBox(0, -0.28, 0.03, 0.17, 0.1, 0.2, [0.25, 0.68, 0.95], 0.55); // Boot / gauntlet cuff
    compile("playerLimb");

    // 17. Creepy Multi-Part 3D Alien Hunters (Normal = Xenomorph-Arachnid Stalker, Fast = Eldritch Shadow-Reaper)
    // 17a. Xenomorph-Arachnid Stalker Body (Obsidian-Crimson Carapace, Pulsing Abdomen Sac, Dorsal Spines & 6 Venom-Green Eyes)
    // Elongated cephalothorax & predator skull
    b.addBevelledBox(0, 0.06, 0.08, 0.34, 0.24, 0.42, 0.05, [0.16, 0.03, 0.06], [0.28, 0.05, 0.1], 0.15);
    // Swollen ribbed rear abdomen sac with glowing bioluminescent blood-orange core
    b.addOctahedron(0, 0.14, -0.26, 0.26, 0.24, 0.32, [0.24, 0.04, 0.08], 0.2);
    b.addOctahedron(0, 0.2, -0.26, 0.18, 0.18, 0.22, [1.0, 0.18, 0.05], 0.95);
    // 3 Jagged dorsal chitin spines along the back
    b.addCylinderY(0, 0.16, 0.42, 0.12, 0.06, 0.01, 6, [0.85, 0.1, 0.18], 0.75);
    b.addCylinderY(0, 0.18, 0.48, -0.04, 0.07, 0.01, 6, [0.95, 0.15, 0.22], 0.85);
    b.addCylinderY(0, 0.2, 0.44, -0.2, 0.06, 0.01, 6, [0.85, 0.1, 0.18], 0.75);
    // 6 Glowing Venom-Green Arachnid Eyes on the front of the skull
    b.addBox(-0.09, 0.1, 0.3, 0.06, 0.06, 0.05, [0.35, 1.0, 0.12], 1.0);
    b.addBox(0.09, 0.1, 0.3, 0.06, 0.06, 0.05, [0.35, 1.0, 0.12], 1.0);
    b.addBox(-0.15, 0.14, 0.26, 0.05, 0.05, 0.05, [0.2, 1.0, 0.25], 1.0);
    b.addBox(0.15, 0.14, 0.26, 0.05, 0.05, 0.05, [0.2, 1.0, 0.25], 1.0);
    b.addBox(-0.04, 0.15, 0.31, 0.04, 0.04, 0.04, [0.75, 1.0, 0.15], 1.0);
    b.addBox(0.04, 0.15, 0.31, 0.04, 0.04, 0.04, [0.75, 1.0, 0.15], 1.0);
    compile("droidCore");

    // 17b. Articulated Alien Spider Leg (Upper Femur + Spiked Knee + Razor Claw Tip)
    // Extends in +X so it can be rotated around Y for all 6 left/right legs!
    b.addBox(0.14, 0.14, 0, 0.26, 0.06, 0.06, [0.22, 0.04, 0.09], 0.2);
    b.addOctahedron(0.27, 0.2, 0, 0.06, 0.09, 0.06, [0.9, 0.12, 0.2], 0.85); // Spiked knee joint
    b.addCylinderY(0.36, -0.26, 0.2, 0, 0.015, 0.05, 5, [0.35, 0.06, 0.12], 0.35);
    b.addOctahedron(0.36, -0.26, 0, 0.04, 0.08, 0.04, [1.0, 0.15, 0.2], 0.95); // Glowing blood-red claw tip
    compile("alienSpiderLeg");

    // 17c. Articulated Serrated Mandible / Fang Jaw
    b.addBox(0, 0.0, 0.12, 0.06, 0.05, 0.22, [0.3, 0.05, 0.1], 0.3);
    b.addOctahedron(0, 0.0, 0.24, 0.04, 0.04, 0.09, [0.4, 1.0, 0.18], 1.0); // Venomous fang tip
    compile("alienMandible");

    // 17d. Eldritch Shadow-Reaper Body (Fast Alien: Hunched Abyssal Horror, Xenomorph Cranium, Horns & Glowing Chest Maw)
    // Elongated Xenomorph-like biomechanical cranium & hunched ribcage
    b.addBevelledBox(0, 0.16, 0.02, 0.38, 0.34, 0.46, 0.06, [0.11, 0.02, 0.18], [0.2, 0.05, 0.32], 0.2);
    b.addOctahedron(0, 0.32, -0.22, 0.22, 0.18, 0.38, [0.16, 0.03, 0.26], 0.25); // Elongated rear skull dome
    // Twin curved devilish cranial horns
    b.addCylinderY(-0.18, 0.26, 0.54, -0.1, 0.05, 0.01, 6, [0.95, 0.08, 0.45], 0.9);
    b.addCylinderY(0.18, 0.26, 0.54, -0.1, 0.05, 0.01, 6, [0.95, 0.08, 0.45], 0.9);
    // Glowing radioactive magenta-crimson chest maw & piercing red eyes
    b.addOctahedron(0, 0.14, 0.24, 0.14, 0.16, 0.1, [1.0, 0.06, 0.38], 1.0);
    b.addBox(-0.1, 0.28, 0.26, 0.07, 0.05, 0.06, [1.0, 0.05, 0.12], 1.0);
    b.addBox(0.1, 0.28, 0.26, 0.07, 0.05, 0.06, [1.0, 0.05, 0.12], 1.0);
    b.addBox(0, 0.33, 0.27, 0.05, 0.05, 0.05, [0.4, 1.0, 0.2], 1.0); // Third hunter eye
    compile("fastDroidBody");

    // 17e. Articulated Praying-Mantis / Necromorph Scythe Claw Arm
    b.addBox(0, 0.14, 0.16, 0.07, 0.08, 0.32, [0.22, 0.04, 0.32], 0.3);
    b.addOctahedron(0, 0.04, 0.34, 0.05, 0.24, 0.18, [1.0, 0.08, 0.42], 0.95); // Giant glowing scythe blade
    compile("alienScytheClaw");

    // 17f. Whipping Scorpion / Xenomorph Tail with Venom Stinger
    b.addCylinderY(0, 0.08, 0.48, -0.32, 0.06, 0.025, 6, [0.24, 0.04, 0.35], 0.35);
    b.addOctahedron(0, 0.5, -0.26, 0.06, 0.08, 0.14, [0.35, 1.0, 0.18], 1.0); // Glowing toxic stinger barb
    compile("alienTailStinger");

    // 17g. Pulsing Dark Bio-Aura Ring (for Showcase / Boss Aura)
    b.addTorusXZ(0, 0.04, 0, 0.42, 0.03, 12, 6, [0.85, 0.1, 0.25], 0.75);
    compile("droidRing");

    // 18. 3D Particle Crystal Shard & Expanding Shockwave Ring
    b.addOctahedron(0, 0, 0, 0.12, 0.12, 0.12, [1.0, 1.0, 1.0], 0.95);
    compile("particleShard");

    b.addTorusXZ(0, 0, 0, 0.5, 0.04, 16, 6, [1.0, 1.0, 1.0], 1.0);
    compile("shockwaveRing");

    return meshes;
  }
}
