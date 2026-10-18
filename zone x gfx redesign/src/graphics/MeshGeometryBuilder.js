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

    // 3. Plutonium Core (Cherenkov Crystal + Containment Rings)
    b.addOctahedron(0, 0.42, 0, 0.24, 0.36, 0.24, [0.25, 1.0, 0.65], 0.95);
    b.addTorusXZ(0, 0.42, 0, 0.34, 0.035, 12, 6, [0.1, 0.85, 1.0], 0.8);
    b.addCylinderY(0, 0.04, 0.12, 0, 0.28, 0.22, 8, [0.25, 0.35, 0.48], 0.15);
    compile("plutoniumCore");

    // 4. Plutonium Container (Heavy Containment Silo + Glowing Core Slot)
    b.addCylinderY(0, 0.0, 0.52, 0, 0.42, 0.38, 12, [0.26, 0.34, 0.46], 0.05);
    b.addTorusXZ(0, 0.52, 0, 0.32, 0.06, 12, 6, [0.45, 0.62, 0.82], 0.2);
    b.addCylinderY(0, 0.5, 0.55, 0, 0.24, 0.24, 10, [0.1, 0.95, 0.55], 0.85);
    b.addTorusXZ(0, 0.26, 0, 0.41, 0.03, 12, 6, [1.0, 0.75, 0.15], 0.7);
    compile("containerVault");

    // 5. Keycard (Floating Golden/Cyan Holo-Key)
    b.addBox(0, 0.38, 0, 0.46, 0.06, 0.28, [1.0, 0.82, 0.18], 0.65);
    b.addBox(0.08, 0.42, 0, 0.22, 0.03, 0.16, [0.15, 0.95, 1.0], 0.95);
    b.addTorusXZ(-0.14, 0.38, 0, 0.07, 0.025, 8, 6, [1.0, 0.9, 0.4], 0.8);
    compile("keyItem");

    // 6. Radiation Capsule / Plasma Spade (Excavator Module)
    b.addCylinderY(0, 0.15, 0.58, 0, 0.18, 0.18, 10, [0.2, 0.88, 0.45], 0.7);
    b.addCylinderY(0, 0.58, 0.7, 0, 0.18, 0.04, 10, [0.65, 1.0, 0.8], 0.9);
    b.addTorusXZ(0, 0.25, 0, 0.21, 0.03, 10, 6, [0.9, 0.95, 1.0], 0.4);
    b.addTorusXZ(0, 0.48, 0, 0.21, 0.03, 10, 6, [0.9, 0.95, 1.0], 0.4);
    compile("capsuleItem");

    // 7. Insulating Mat (Dielectric Shield Platform)
    b.addBevelledBox(0, 0.12, 0, 0.72, 0.14, 0.52, 0.04, [0.95, 0.58, 0.12], [1.0, 0.78, 0.25], 0.55);
    b.addBox(0, 0.2, 0, 0.52, 0.03, 0.32, [0.2, 0.95, 1.0], 0.85);
    compile("matItem");

    // 8. Extra Time Chrono Crystal (3D Dual Hourglass)
    b.addCylinderY(0, 0.12, 0.38, 0, 0.26, 0.04, 8, [0.35, 0.85, 1.0], 0.8);
    b.addCylinderY(0, 0.38, 0.64, 0, 0.04, 0.26, 8, [0.35, 0.85, 1.0], 0.8);
    b.addBox(0, 0.1, 0, 0.56, 0.05, 0.56, [0.95, 0.78, 0.25], 0.5);
    b.addBox(0, 0.66, 0, 0.56, 0.05, 0.56, [0.95, 0.78, 0.25], 0.5);
    compile("extraTimeItem");

    // 9. Mystery Box (3D Supply Vault with Neon Cross)
    b.addBevelledBox(0, 0.32, 0, 0.64, 0.56, 0.64, 0.06, [0.58, 0.25, 0.85], [0.75, 0.42, 0.98], 0.45);
    b.addBox(0, 0.32, 0, 0.68, 0.1, 0.14, [1.0, 0.85, 0.2], 0.9);
    b.addBox(0, 0.32, 0, 0.14, 0.1, 0.68, [1.0, 0.85, 0.2], 0.9);
    compile("mysteryBox");

    // 10. Locked Door & Proximity Door (Armored Blast Gate)
    b.addBevelledBox(0, 0.4, 0, 0.96, 0.8, 0.36, 0.05, [0.75, 0.28, 0.18], [0.95, 0.45, 0.25], 0.25);
    b.addOctahedron(0, 0.45, 0, 0.18, 0.18, 0.24, [1.0, 0.88, 0.2], 0.95);
    b.addBox(-0.42, 0.4, 0, 0.12, 0.82, 0.44, [0.3, 0.38, 0.48], 0.1);
    b.addBox(0.42, 0.4, 0, 0.12, 0.82, 0.44, [0.3, 0.38, 0.48], 0.1);
    compile("lockedDoor");

    b.addBevelledBox(0, 0.4, 0, 0.96, 0.8, 0.36, 0.05, [0.18, 0.62, 0.75], [0.3, 0.82, 0.95], 0.3);
    b.addOctahedron(0, 0.45, 0, 0.18, 0.18, 0.24, [0.2, 1.0, 0.65], 0.95);
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

    // 13. Crumbly Regolith Dirt & Rock
    b.addOctahedron(-0.18, 0.24, -0.14, 0.28, 0.32, 0.28, [0.58, 0.42, 0.24], 0.05);
    b.addOctahedron(0.18, 0.28, 0.12, 0.26, 0.38, 0.26, [0.66, 0.48, 0.28], 0.08);
    b.addOctahedron(0.0, 0.18, -0.05, 0.34, 0.24, 0.34, [0.48, 0.34, 0.18], 0.02);
    compile("crumblyDirt");

    b.addOctahedron(0, 0.38, 0, 0.44, 0.48, 0.44, [0.45, 0.5, 0.58], 0.08);
    b.addOctahedron(0.16, 0.26, 0.16, 0.28, 0.32, 0.28, [0.35, 0.4, 0.48], 0.05);
    compile("rockBlock");

    // 14. Forcefield & Skull Hazard
    b.addBox(0, 0.04, 0, 0.92, 0.08, 0.92, [0.35, 0.1, 0.18], 0.3);
    b.addTorusXZ(0, 0.22, 0, 0.36, 0.04, 12, 6, [1.0, 0.18, 0.32], 0.95);
    b.addOctahedron(0, 0.36, 0, 0.2, 0.28, 0.2, [1.0, 0.45, 0.15], 0.95);
    compile("hazardField");

    // 15. Exit Extraction Portal
    b.addCylinderY(0, 0, 0.85, 0, 0.36, 0.24, 12, [0.2, 0.75, 0.95], 0.65);
    b.addTorusXZ(0, 0.65, 0, 0.42, 0.06, 14, 6, [0.35, 1.0, 0.75], 1.0);
    b.addOctahedron(0, 0.95, 0, 0.22, 0.28, 0.22, [1.0, 0.95, 0.4], 1.0);
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

    // 17. Alien Patrol Droids (Normal & Fast)
    // Normal Droid Core (Hovering Sentinel Sphere/Octahedron + Red Scanner Eye)
    b.addOctahedron(0, 0, 0, 0.34, 0.32, 0.34, [0.85, 0.22, 0.28], 0.55);
    b.addBox(0, 0.04, 0.26, 0.24, 0.1, 0.14, [1.0, 0.95, 0.2], 1.0); // Glowing scanner eye
    compile("droidCore");

    // Normal Droid Gyroscope Ring
    b.addTorusXZ(0, 0, 0, 0.46, 0.05, 12, 6, [1.0, 0.45, 0.15], 0.9);
    compile("droidRing");

    // Fast Alien Interceptor Mech (Aggressive Violet/Cyan Twin-Thruster Stalker)
    b.addOctahedron(0, 0, 0, 0.42, 0.26, 0.46, [0.75, 0.2, 0.95], 0.65);
    b.addTorusXZ(0, 0, 0, 0.5, 0.045, 10, 6, [0.2, 0.95, 1.0], 0.95);
    b.addBox(-0.32, -0.08, 0, 0.12, 0.24, 0.56, [0.95, 0.25, 0.65], 0.8);
    b.addBox(0.32, -0.08, 0, 0.12, 0.24, 0.56, [0.95, 0.25, 0.65], 0.8);
    compile("fastDroidBody");

    // 18. 3D Particle Crystal Shard & Expanding Shockwave Ring
    b.addOctahedron(0, 0, 0, 0.12, 0.12, 0.12, [1.0, 1.0, 1.0], 0.95);
    compile("particleShard");

    b.addTorusXZ(0, 0, 0, 0.5, 0.04, 16, 6, [1.0, 1.0, 1.0], 1.0);
    compile("shockwaveRing");

    return meshes;
  }
}
