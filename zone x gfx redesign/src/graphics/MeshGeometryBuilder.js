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
   * All 16 Zone X Gameplay Element Categories that can be individually selected and mixed-and-matched
   * across all 20 3D Mesh Sources.
   */
  static get ELEMENT_CATEGORIES() {
    return [
      { id: "wall",           label: "1. Wand-Block (Wall)",              tileHint: "WALL" },
      { id: "floor",          label: "2. Boden-Platte (Floor)",           tileHint: "FLOOR" },
      { id: "plutonium",      label: "3. Plutonium-Kern (Fokus #1)",      tileHint: "PLUTONIUM" },
      { id: "container",      label: "4. Tonne / Container (Fokus #2)",   tileHint: "CONTAINER" },
      { id: "player",         label: "5. Spieler-Roboter (mit Gesicht)",  tileHint: "PLAYER" },
      { id: "alienNormal",    label: "6. Alien Normal (Grau-in-Grau)",    tileHint: "ALIEN_NORMAL" },
      { id: "alienFast",      label: "7. Alien Schnell (Dunkelblau)",     tileHint: "ALIEN_FAST" },
      { id: "laserDoor",      label: "8. Automatische Laser-Tür",         tileHint: "LASER_DOOR" },
      { id: "key",            label: "9. Sicherheits-Schlüssel (Key)",    tileHint: "KEY" },
      { id: "lockedDoor",     label: "10. Schloss-Tür (Locked Door)",     tileHint: "LOCKED_DOOR" },
      { id: "spade",          label: "11. Spaten / Schaufel (Spade)",     tileHint: "SPADE" },
      { id: "crumblyDirt",    label: "12. Grabbares Erdreich (Dirt)",     tileHint: "CRUMBLY_DIRT" },
      { id: "mat",            label: "13. Isoliermatte (Mat)",            tileHint: "INSULATING_MAT" },
      { id: "capsule",        label: "14. Strahlenschutz-Kapsel",         tileHint: "RADIATION_CAPSULE" },
      { id: "extraTimeBox",   label: "15. Extra-Zeit & Mystery-Box",      tileHint: "EXTRA_TIME" },
      { id: "hazardsPortals", label: "16. Gefahren, Warp & Ausgang",      tileHint: "EXIT_PORTAL" },
    ];
  }

  /**
   * Curated catalog of the 20 Best 3D Mesh Sources (including GitHub repositories & CC0 asset libraries),
   * each providing a complete, stylistically distinct 16-element Zone X 3D Mesh Set on a unified
   * Light-Grey & White base with focused Gameplay Attention Accents (Plutonium / Containers).
   */
  static get MESH_SOURCES() {
    return [
      {
        id: 1,
        name: "01. Kenney.nl — Space Kit & Modular Station",
        url: "https://github.com/KenneyNL",
        webUrl: "https://kenney.nl/assets/space-kit",
        license: "CC0 Public Domain",
        styleTag: "Low-Poly Chamfered Hex/Block",
        summary: "Klare, gefaste Sechskant- & Block-Geometrie im berühmten Kenney-Low-Poly-Stil.",
        setPreview: "Gefaste Oktogon-Wände, sechseckige Tonnen, kompakter Rover-Bot mit breitem Visier-Gesicht, flach-facettierter Smaragd-Kristall.",
      },
      {
        id: 2,
        name: "02. KayKit — Space Base Bits & Stylized Bots",
        url: "https://github.com/KayKit-Game-Assets",
        webUrl: "https://kaylousberg.itch.io/kaykit-space-base-bits",
        license: "CC0 / Free Commercial",
        styleTag: "Stylized Toy-Bot & Chunky Props",
        summary: "Charismatische Toy-Proportionen mit großem Roboter-Kopf, dicken Fassringen und markanten Silhouetten.",
        setPreview: "Weich gefaste Toy-Blöcke, bauchige Doppelfalz-Tonne, großer Roboterkopf mit Kulleraugen & Ohren, kräftiger Gold-Schlüssel.",
      },
      {
        id: 3,
        name: "03. Quaternius — Ultimate Modular Sci-Fi Kit",
        url: "https://quaternius.com/packs/ultimatemodularscifi.html",
        webUrl: "https://quaternius.com",
        license: "CC0 Public Domain",
        styleTag: "Angular Faceted Sci-Fi",
        summary: "Scharfkantige, facettierte Sci-Fi-Module mit Kühlrippen-Tonnen und Doppelspindel-Kristallen.",
        setPreview: "Kantige Architektur-Blöcke, 4-Rippen-Reaktortonne, Doppelpyramiden-Plutonium, kantige Spinnen-Mechs.",
      },
      {
        id: 4,
        name: "04. Khronos Group — glTF-Sample-Assets (GitHub)",
        url: "https://github.com/KhronosGroup/glTF-Sample-Assets",
        webUrl: "https://github.com/KhronosGroup/glTF-Sample-Models",
        license: "CC-BY / Apache 2.0",
        styleTag: "Precision Gimbal & Reference CAD",
        summary: "Offizieller Khronos WebGL/glTF-Referenzstil mit kardanischen Gyro-Ringen und präzisen Flansch-Zylindern.",
        setPreview: "Präzisions-Wände mit Deckplatte, 2-Achsen-Gimbal-Plutonium, Flansch-Zylinder-Tonne, humanoider Referenz-Roboter.",
      },
      {
        id: 5,
        name: "05. Three.js Official — RobotExpressive & Primitives (GitHub)",
        url: "https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf",
        webUrl: "https://threejs.org",
        license: "MIT / CC0",
        styleTag: "TV-Head Expressive Bot & WebGL Geo",
        summary: "Inspiriert von RobotExpressive.glb aus dem offiziellen Three.js-GitHub-Repo mit V-Antennen und Monitor-Gesicht.",
        setPreview: "Monitor-Kopf-Roboter mit Doppel-Antenne, gekreuzte Orbit-Ringe ums Plutonium, glatte WebGL-Zylinder-Tonnen.",
      },
      {
        id: 6,
        name: "06. Poly Pizza & Google Poly Toolkit (GitHub)",
        url: "https://github.com/googlearchive/poly-toolkit-unity",
        webUrl: "https://poly.pizza",
        license: "CC0 / CC-BY",
        styleTag: "Origami Triangulated Low-Poly",
        summary: "Kristallin-faltiger Origami-Low-Poly-Look (Google Blocks Stil) aus reinen Oktaeder- und Prismen-Clustern.",
        setPreview: "Kristalline Oktaeder-Wände, Diamant-Tonne, Mehrkern-Plutonium-Kristall, Origami-Spinnen-Aliens.",
      },
      {
        id: 7,
        name: "07. MagicaVoxel — ephtracy/voxel-model (GitHub)",
        url: "https://github.com/ephtracy/voxel-model",
        webUrl: "https://ephtracy.github.io",
        license: "MIT / Free Voxel Repo",
        styleTag: "3D Isometric Voxel Cube Stack",
        summary: "Echter gestufter 3D-Voxel-Look aus präzisen Mikro-Würfeln in Hellgrau-Weiß mit Smaragd-Voxel-Kern.",
        setPreview: "Gestufte 3D-Voxel-Wände, Voxel-Plutonium-Kreuz, gestufte Voxel-Tonne, Pixel-Voxel-Robotergesicht & Voxel-Spinnen.",
      },
      {
        id: 8,
        name: "08. Pmndrs — drei-assets & Poimandres Market (GitHub)",
        url: "https://github.com/pmndrs/drei-assets",
        webUrl: "https://market.pmnd.rs",
        license: "MIT / CC0",
        styleTag: "Scandinavian Porcelain Studio",
        summary: "Ultra-reduziertes skandinavisches Studio-Design mit schwebenden dünnen Ringen und glatten Monolithen.",
        setPreview: "Nahtlose Porzellan-Monolithen, hauchdünne Schweberinge, minimalistische Kapsel-Tonne, cleaner Studio-Bot.",
      },
      {
        id: 9,
        name: "09. Evan Wallace — csg.js Boolean Solid CAD (GitHub)",
        url: "https://github.com/evanw/csg.js",
        webUrl: "https://evanw.github.io/csg.js/",
        license: "MIT License",
        styleTag: "Constructive Solid Geometry (CSG)",
        summary: "Boolesche CAD-Körper (ausgefräste Rahmenblöcke, gekreuzte Zylinder-Schnitte, gefräste Schlitze).",
        setPreview: "Ausgehöhlte CSG-Rahmenwände, Kreuzschnitt-Reaktortonne, oktaedrischer Würfel-Schnitt-Kristall, CAD-Roboter.",
      },
      {
        id: 10,
        name: "10. NASA 3D Resources — Apollo / ISS Modules (GitHub)",
        url: "https://github.com/nasa/NASA-3D-Resources",
        webUrl: "https://nasa3d.arc.nasa.gov",
        license: "NASA Public Domain",
        styleTag: "Hard-Surface Spaceflight & RTG",
        summary: "Authentische Raumfahrt-Formensprache: RTG-Kühlrippen-Plutonium, ISS-Tank-Tonne & Mars-Rover-Kamerakopf.",
        setPreview: "ISS-Modulwände, RTG-Isotopenkern mit 4 Kühlrippen, Raumfahrt-Kanistertonne, Rover-Bot mit Dual-Optik-Kopf.",
      },
      {
        id: 11,
        name: "11. OpenGameArt.org — CC0 Sci-Fi Tactical Board",
        url: "https://opengameart.org",
        webUrl: "https://opengameart.org/art-search-advanced?field_art_type_tid%5B%5D=10",
        license: "CC0 Public Domain",
        styleTag: "Tactical Tabletop Miniatures",
        summary: "Klassischer 3D-Brettspiel-Miniaturen-Look mit runden Standbasen und stark betonten Gameplay-Symbolen.",
        setPreview: "Tabletop-Sockel unter allen Figuren & Items, hohe Leuchtfeuer-Säulen, Retro-Bot mit seitlichen Parabol-Ohren.",
      },
      {
        id: 12,
        name: "12. Poly Haven — Brutalist Ceramic & Architecture (GitHub)",
        url: "https://github.com/Poly-Haven",
        webUrl: "https://polyhaven.com/models",
        license: "CC0 Public Domain",
        styleTag: "Architectural Stepped Plinths",
        summary: "Architektonischer Stufen-Monolith-Stil mit massiven Sockelplatten und schweren Tresor-Behältern.",
        setPreview: "Dreistufige Zikkurat-Wände, dickwandiges Tresor-Fass, Kristall-Obelisk, schwer gepanzerter Industrie-Bot.",
      },
      {
        id: 13,
        name: "13. Polygon Sci-Fi Minimal (Synty-Inspired Low-Poly)",
        url: "https://github.com/topics/low-poly-models",
        webUrl: "https://syntystore.com",
        license: "Custom Procedural Low-Poly",
        styleTag: "Sharp Chevron & Blade Facets",
        summary: "Dynamische, angeschrägte Chevron-Kanten, Sechskant-Zellen und schnittige Klingen-Drohnen.",
        setPreview: "Chevron-Wandblöcke, sechseckige Energietonne, schwebendes Kristall-Prisma, schneidige Klingen-Aliens.",
      },
      {
        id: 14,
        name: "14. Little Workshop — Isometric WebGL Diorama (GitHub)",
        url: "https://github.com/littleworkshop",
        webUrl: "https://www.littleworkshop.fr",
        license: "MIT / WebGL Showcase",
        styleTag: "Delicate Miniature Diorama",
        summary: "Feingliedrige Miniatur-Architektur mit mehrschichtigen Bodenkacheln, schlanken Säulen und kompaktem Bot.",
        setPreview: "Mehrschicht-Kacheln, Doppelsäulen-Wände, filigraner Schwebe-Kristall, zierliche Fass-Kapsel & Mini-Bot.",
      },
      {
        id: 15,
        name: "15. Bruno Simon — Three.js Journey Stylized Kit (GitHub)",
        url: "https://github.com/brunosimon",
        webUrl: "https://threejs-journey.com",
        license: "MIT / Community Style",
        styleTag: "Playful Isometric Playground",
        summary: "Verspielter, einladender 3D-Playground-Look mit weichen Phasen, Leuchtring-Tonnen und großen Roboteraugen.",
        setPreview: "Weiche Kissen-Fase-Wände, Ring-Portal-Tonne, schwebendes Kristall-Totem, freundlicher Rover-Bot.",
      },
      {
        id: 16,
        name: "16. LDraw / Mecabricks — 3D Stud Brick System",
        url: "https://github.com/ldraw",
        webUrl: "https://www.ldraw.org",
        license: "CC-BY / Open Brick Standard",
        styleTag: "3D Interlocking Stud Bricks (LEGO-Look)",
        summary: "Alle Gameplay-Elemente als echte 3D-Klemmbausteine mit zylindrischen Noppen in Weiß, Hellgrau & Transparent-Grün!",
        setPreview: "2×2 Noppen-Wandsteine, 1×1 Noppen-Bodenplatten, runde Noppen-Tonne, Klemmbaustein-Roboter & Smaragd-Kristallstein.",
      },
      {
        id: 17,
        name: "17. Bauhaus / Monument Valley — Sacred Geometry",
        url: "https://github.com/topics/isometric-game",
        webUrl: "https://www.monumentvalleygame.com",
        license: "Bauhaus Procedural 3D",
        styleTag: "Monumental Colonnade & Obelisks",
        summary: "Reine Bauhaus-Architektur: schlanke Kolonnaden, verschachtelte Platonische Körper und Obelisk-Tonnen.",
        setPreview: "Architektur-Säulenblöcke, verschachtelte Doppel-Oktaeder, zylindrischer Stufen-Obelisk, geometrischer Totem-Bot.",
      },
      {
        id: 18,
        name: "18. Portal 2 Aperture — Clean Test Chamber Panels",
        url: "https://github.com/topics/portal",
        webUrl: "https://sketchfab.com/features/cc0",
        license: "Clean Test-Chamber Homage",
        styleTag: "2×2 White Chamber Panels & Companion Cube",
        summary: "Weiße 2×2-Testkammer-Kacheln mit dunklen Fugen, Companion-Cube-Tonne/Box und Aperture-Test-Roboter.",
        setPreview: "2×2 geteilte weiße Kammerwände mit dunkler Fuge, Companion-Flansch-Tonne, Testkammer-Laser & Optik-Bot.",
      },
      {
        id: 19,
        name: "19. Teenage Engineering / Braun — Industrial Audio-CAD",
        url: "https://github.com/openscad/openscad",
        webUrl: "https://teenage.engineering",
        license: "Industrial Design Minimal",
        styleTag: "Rotary Dials, Keycaps & Speaker Grille",
        summary: "Edles Hardware-Synthesizer-Design (Dieter Rams / Teenage Engineering) mit Drehregler-Tonnen & Keycap-Kacheln.",
        setPreview: "Keycap-Wände & -Matten, Drehregler-Encoder-Tonne, LED-Punkt-Plutonium, Hi-Fi-Lautsprechergitter-Roboter.",
      },
      {
        id: 20,
        name: "20. Zone X Classic — Atari 800XL to 3D Extrusion",
        url: "https://github.com/enzocage/Zone-X-REA",
        webUrl: "https://github.com/enzocage/Zone-X-REA",
        license: "Zone X Native Engine",
        styleTag: "Retro-Arcade 3D Remaster",
        summary: "Direkte 3D-Extrusion der Original-Atari-800XL-Silhouetten in modernem Hellgrau-Weiß mit Smaragd-Akzent.",
        setPreview: "Stufenpyramiden-Wände, klassische Zweiring-Tonne, kultiger grauer Zone-X-Roboter mit 3D-Gesicht & Vocoder.",
      },
    ];
  }

  /**
   * Builds the complete dictionary of static/dynamic 3D meshes used by the renderer.
   * Supports picking any of the 20 3D Mesh Sources (`1..20`) globally or individually per element category!
   * @param {Object} [mixConfig] Optional mapping `{ wall: 1..20, floor: 1..20, plutonium: 1..20, container: 1..20, ... }`
   */
  static buildAllGameMeshes(mixConfig = {}) {
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

    const getStyle = (catId) => {
      const v = mixConfig[catId] || mixConfig.defaultSourceId || 1;
      return Math.max(1, Math.min(20, v | 0));
    };

    // =========================================================================
    // MINIMALIST ARCHITECTURAL PALETTE ("Clean Light-Grey & White Diorama")
    // =========================================================================
    const PURE_WHITE    = [0.96, 0.97, 0.99];
    const OFF_WHITE     = [0.87, 0.89, 0.92];
    const LIGHT_GREY    = [0.75, 0.78, 0.82];
    const SILVER_GREY   = [0.62, 0.65, 0.70];
    const SLATE_GREY    = [0.45, 0.48, 0.53];
    const CHARCOAL_DARK = [0.22, 0.25, 0.30];

    const PLUT_EMERALD  = [0.10, 0.92, 0.46];
    const PLUT_MINT     = [0.58, 1.00, 0.78];
    const PLUT_MUTED    = [0.22, 0.56, 0.38];

    const ACCENT_GOLD   = [0.92, 0.72, 0.22];
    const ACCENT_SAND   = [0.78, 0.72, 0.62];
    const ACCENT_SKY    = [0.30, 0.75, 0.96];
    const ACCENT_CORAL  = [0.95, 0.24, 0.28];

    const addCleanDiscBase = (radius = 0.34, height = 0.05, accentColor = LIGHT_GREY, accentEmissive = 0.05, segs = 12) => {
      b.addCylinderY(0, 0.0, height, 0, radius, radius * 0.95, segs, OFF_WHITE, 0.02);
      b.addTorusXZ(0, height, 0, radius * 0.82, 0.018, segs, 6, accentColor, accentEmissive);
    };

    // =========================================================================
    // 1. FLOOR TILE ("floor") — 20 Source Variations
    // =========================================================================
    const sFloor = getStyle("floor");
    b.addBox(0, -0.04, 0, 0.96, 0.08, 0.96, SILVER_GREY, 0.0, LIGHT_GREY);
    if (sFloor === 16) {
      // #16 LDraw / LEGO Stud Floor Tile (center hollow stud)
      b.addBox(0, 0.004, 0, 0.84, 0.008, 0.84, LIGHT_GREY, 0.0);
      b.addCylinderY(0, 0.008, 0.022, 0, 0.14, 0.14, 10, OFF_WHITE, 0.0);
    } else if (sFloor === 18) {
      // #18 Portal 2 Aperture 2x2 Sub-Panel Floor
      for (let ix = -1; ix <= 1; ix += 2) {
        for (let iz = -1; iz <= 1; iz += 2) {
          b.addBox(ix * 0.22, 0.005, iz * 0.22, 0.41, 0.01, 0.41, LIGHT_GREY, 0.0);
        }
      }
    } else if (sFloor === 1 || sFloor === 13) {
      // #1 Kenney / #13 Polygon Hexagonal Inlay Floor
      b.addCylinderY(0, 0.002, 0.010, 0, 0.42, 0.42, 6, LIGHT_GREY, 0.0);
    } else if (sFloor === 19) {
      // #19 Teenage Engineering Keycap Floor Tile
      b.addBevelledBox(0, 0.005, 0, 0.82, 0.016, 0.82, 0.03, LIGHT_GREY, OFF_WHITE, 0.0);
    } else {
      b.addBox(0, 0.004, 0, 0.84, 0.008, 0.84, LIGHT_GREY, 0.0);
    }
    compile("floorTile");

    // =========================================================================
    // 2. WALL BLOCK ("wall") — 20 Source Variations
    // =========================================================================
    const sWall = getStyle("wall");
    b.addBox(0, 0.04, 0, 0.96, 0.08, 0.96, LIGHT_GREY, 0.0);
    if (sWall === 1) {
      // #01 Kenney Chamfered Octagonal Module
      b.addBevelledBox(0, 0.34, 0, 0.92, 0.56, 0.92, 0.12, OFF_WHITE, PURE_WHITE, 0.02);
      b.addCylinderY(0, 0.62, 0.66, 0, 0.34, 0.30, 8, PURE_WHITE, 0.03);
    } else if (sWall === 6) {
      // #06 Poly Pizza Origami Low-Poly Faceted Wall
      b.addBevelledBox(0, 0.28, 0, 0.90, 0.44, 0.90, 0.08, OFF_WHITE, PURE_WHITE, 0.02);
      b.addOctahedron(0, 0.50, 0, 0.42, 0.20, 0.42, PURE_WHITE, 0.03);
    } else if (sWall === 7) {
      // #07 MagicaVoxel 3-Tier Voxel Stack Wall
      b.addBox(0, 0.22, 0, 0.92, 0.28, 0.92, LIGHT_GREY, 0.01, OFF_WHITE);
      b.addBox(0, 0.46, 0, 0.82, 0.22, 0.82, OFF_WHITE, 0.02, PURE_WHITE);
      b.addBox(0, 0.61, 0, 0.66, 0.10, 0.66, PURE_WHITE, 0.03, PURE_WHITE);
    } else if (sWall === 9) {
      // #09 CSG Hollowed Frame Block
      b.addBevelledBox(0, 0.34, 0, 0.92, 0.56, 0.92, 0.04, OFF_WHITE, PURE_WHITE, 0.02);
      b.addBox(0, 0.63, 0, 0.54, 0.04, 0.54, SLATE_GREY, 0.0);
      b.addBox(0, 0.65, 0, 0.34, 0.04, 0.34, PURE_WHITE, 0.03);
    } else if (sWall === 12 || sWall === 20) {
      // #12 Poly Haven / #20 Classic Zone X Stepped Ziggurat Pyramid Wall
      b.addBox(0, 0.20, 0, 0.92, 0.24, 0.92, LIGHT_GREY, 0.01, OFF_WHITE);
      b.addBox(0, 0.40, 0, 0.78, 0.18, 0.78, OFF_WHITE, 0.02, PURE_WHITE);
      b.addBox(0, 0.56, 0, 0.60, 0.14, 0.60, PURE_WHITE, 0.03, PURE_WHITE);
    } else if (sWall === 16) {
      // #16 LDraw / LEGO 2x2 Stud Brick Wall!
      b.addBox(0, 0.32, 0, 0.92, 0.52, 0.92, OFF_WHITE, 0.02, PURE_WHITE);
      for (let sx = -0.23; sx <= 0.24; sx += 0.46) {
        for (let sz = -0.23; sz <= 0.24; sz += 0.46) {
          b.addCylinderY(sx, 0.58, 0.68, sz, 0.13, 0.13, 12, PURE_WHITE, 0.04);
        }
      }
    } else if (sWall === 17) {
      // #17 Bauhaus / Monument Valley Colonnade Block
      b.addBox(0, 0.14, 0, 0.92, 0.16, 0.92, OFF_WHITE, 0.02);
      for (let sx = -0.30; sx <= 0.31; sx += 0.60) {
        for (let sz = -0.30; sz <= 0.31; sz += 0.60) {
          b.addCylinderY(sx, 0.22, 0.56, sz, 0.10, 0.10, 8, LIGHT_GREY, 0.02);
        }
      }
      b.addBevelledBox(0, 0.62, 0, 0.92, 0.14, 0.92, 0.03, PURE_WHITE, PURE_WHITE, 0.03);
    } else if (sWall === 18) {
      // #18 Portal 2 Aperture 2x2 Divided Test-Chamber Wall with Dark Seam
      b.addBox(0, 0.32, 0, 0.88, 0.52, 0.88, CHARCOAL_DARK, 0.0);
      for (let ix = -1; ix <= 1; ix += 2) {
        for (let iz = -1; iz <= 1; iz += 2) {
          b.addBevelledBox(ix * 0.22, 0.34, iz * 0.22, 0.42, 0.54, 0.42, 0.02, OFF_WHITE, PURE_WHITE, 0.03);
        }
      }
    } else {
      // Default Clean Architectural Monolith (#2, #3, #4, #5, #8, #10, #11, #13, #14, #15, #19)
      b.addBevelledBox(0, 0.34, 0, 0.92, 0.56, 0.92, 0.06, OFF_WHITE, PURE_WHITE, 0.02);
      b.addBox(0, 0.63, 0, 0.76, 0.03, 0.76, PURE_WHITE, 0.03);
    }
    compile("wallBlock");

    // =========================================================================
    // 3. PLUTONIUM CORE ("plutonium") — 20 Source Variations (Mint-Emerald Focus!)
    // =========================================================================
    const sPlut = getStyle("plutonium");
    addCleanDiscBase(0.40, 0.06, PLUT_EMERALD, 0.65, sPlut === 1 || sPlut === 13 ? 6 : 12);
    if (sPlut === 7) {
      // #07 MagicaVoxel 3D Voxel Crystal Cross
      b.addBox(0, 0.50, 0, 0.22, 0.56, 0.22, PLUT_MINT, 0.98);
      b.addBox(0, 0.50, 0, 0.44, 0.24, 0.22, PLUT_EMERALD, 0.90);
      b.addBox(0, 0.50, 0, 0.22, 0.24, 0.44, PLUT_EMERALD, 0.90);
    } else if (sPlut === 10) {
      // #10 NASA RTG Isotope Core with 4 White Radiator Fins
      b.addCylinderY(0, 0.10, 0.78, 0, 0.16, 0.16, 12, PLUT_EMERALD, 0.92);
      b.addCylinderY(0, 0.78, 0.86, 0, 0.12, 0.08, 12, PLUT_MINT, 1.0);
      b.addBox(0, 0.44, 0, 0.56, 0.46, 0.04, PURE_WHITE, 0.35);
      b.addBox(0, 0.44, 0, 0.04, 0.46, 0.56, PURE_WHITE, 0.35);
    } else if (sPlut === 16) {
      // #16 LDraw / LEGO Translucent-Emerald Stud Cylinder & Gem
      b.addCylinderY(0, 0.08, 0.68, 0, 0.24, 0.24, 12, PLUT_EMERALD, 0.90);
      b.addCylinderY(0, 0.68, 0.80, 0, 0.13, 0.13, 12, PLUT_MINT, 1.0);
      b.addTorusXZ(0, 0.38, 0, 0.25, 0.025, 12, 6, PURE_WHITE, 0.5);
    } else if (sPlut === 3 || sPlut === 6 || sPlut === 17) {
      // #03/#06/#17 Multi-Shard / Sacred Geometry Nested Octahedra
      b.addOctahedron(0, 0.52, 0, 0.30, 0.44, 0.30, PLUT_EMERALD, 0.90);
      b.addOctahedron(0, 0.52, 0, 0.18, 0.28, 0.18, PLUT_MINT, 1.00);
      b.addOctahedron(0, 0.92, 0, 0.10, 0.14, 0.10, PURE_WHITE, 0.85);
    } else if (sPlut === 19) {
      // #19 Teenage Engineering Minimalist LED Pillar & White Ring Cap
      b.addCylinderY(0, 0.08, 0.72, 0, 0.22, 0.22, 16, PURE_WHITE, 0.15);
      b.addCylinderY(0, 0.22, 0.58, 0, 0.23, 0.23, 16, PLUT_EMERALD, 0.95);
      b.addCylinderY(0, 0.72, 0.78, 0, 0.15, 0.15, 16, PLUT_MINT, 1.0);
    } else {
      // Classic Clean Floating Emerald Diamond on White Socket
      b.addOctahedron(0, 0.50, 0, 0.28, 0.38, 0.28, PLUT_EMERALD, 0.90);
      b.addOctahedron(0, 0.50, 0, 0.16, 0.24, 0.16, PLUT_MINT, 1.00);
    }
    compile("plutoniumCore");

    // 3b. Plutonium Orbital Ring ("plutoniumBeacon")
    b.addTorusXZ(0, 0.50, 0, 0.38, 0.024, sPlut === 7 ? 4 : 16, 6, PURE_WHITE, 0.55);
    if (sPlut === 4 || sPlut === 5) {
      // #04 Khronos / #05 Three.js Dual Gimbal Ring
      b.addTorusXZ(0, 0.28, 0, 0.32, 0.020, 14, 6, PLUT_MINT, 0.85);
    }
    b.addOctahedron(0.38, 0.50, 0, 0.06, 0.06, 0.06, PLUT_MINT, 0.95);
    b.addOctahedron(-0.38, 0.50, 0, 0.06, 0.06, 0.06, PLUT_MINT, 0.95);
    compile("plutoniumBeacon");

    // 3c. Plutonium Floor Halo ("plutoniumHalo")
    b.addTorusXZ(0, 0.02, 0, 0.44, 0.025, sPlut === 1 || sPlut === 13 ? 6 : 16, 6, PLUT_EMERALD, 0.85);
    compile("plutoniumHalo");

    // =========================================================================
    // 4. CONTAINER / BARREL ("container") — 20 Source Variations
    // =========================================================================
    const sCont = getStyle("container");
    const contSegs = sCont === 1 || sCont === 13 ? 6 : sCont === 7 ? 4 : 16;
    addCleanDiscBase(0.42, 0.05, LIGHT_GREY, 0.04, contSegs);
    if (sCont === 7) {
      // #07 MagicaVoxel Stepped Cube Barrel
      b.addBox(0, 0.35, 0, 0.62, 0.58, 0.62, OFF_WHITE, 0.04, PURE_WHITE);
      b.addBox(0, 0.22, 0, 0.66, 0.07, 0.66, SLATE_GREY, 0.04);
      b.addBox(0, 0.48, 0, 0.66, 0.07, 0.66, SLATE_GREY, 0.04);
      b.addBox(0, 0.65, 0, 0.42, 0.04, 0.42, CHARCOAL_DARK, 0.02);
      b.addBox(0, 0.66, 0, 0.26, 0.04, 0.26, PLUT_MUTED, 0.35);
    } else if (sCont === 16) {
      // #16 LDraw / LEGO Round Brick Barrel with Top Open Stud Rim
      b.addCylinderY(0, 0.05, 0.62, 0, 0.36, 0.36, 14, OFF_WHITE, 0.04);
      b.addTorusXZ(0, 0.34, 0, 0.37, 0.03, 14, 6, LIGHT_GREY, 0.04);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) * 0.5 + Math.PI * 0.25;
        b.addCylinderY(Math.cos(a) * 0.22, 0.62, 0.70, Math.sin(a) * 0.22, 0.08, 0.08, 8, PURE_WHITE, 0.05);
      }
      b.addCylinderY(0, 0.60, 0.65, 0, 0.20, 0.20, 12, CHARCOAL_DARK, 0.02);
      b.addTorusXZ(0, 0.65, 0, 0.16, 0.02, 12, 6, PLUT_MUTED, 0.35);
    } else if (sCont === 18) {
      // #18 Portal 2 Aperture Companion-Flanged Silo
      b.addCylinderY(0, 0.05, 0.64, 0, 0.35, 0.35, 16, OFF_WHITE, 0.04);
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) * 0.5;
        b.addBox(Math.cos(a) * 0.34, 0.35, Math.sin(a) * 0.34, 0.12, 0.54, 0.12, PURE_WHITE, 0.05);
      }
      b.addTorusXZ(0, 0.64, 0, 0.33, 0.04, 16, 6, PURE_WHITE, 0.08);
      b.addCylinderY(0, 0.60, 0.66, 0, 0.24, 0.24, 14, CHARCOAL_DARK, 0.02);
      b.addTorusXZ(0, 0.65, 0, 0.18, 0.020, 12, 6, PLUT_MUTED, 0.35);
    } else {
      // Clean White/Light-Grey Cylindrical Barrel (Hexagonal for #1/#13, Smooth 16-seg for others)
      b.addCylinderY(0, 0.05, 0.64, 0, 0.36, 0.36, contSegs, OFF_WHITE, 0.04);
      b.addTorusXZ(0, 0.22, 0, 0.37, 0.026, contSegs, 6, SLATE_GREY, 0.04);
      b.addTorusXZ(0, 0.48, 0, 0.37, 0.026, contSegs, 6, SLATE_GREY, 0.04);
      b.addTorusXZ(0, 0.64, 0, 0.34, 0.042, contSegs, 6, PURE_WHITE, 0.08);
      b.addCylinderY(0, 0.60, 0.66, 0, 0.25, 0.25, contSegs, CHARCOAL_DARK, 0.02);
      b.addTorusXZ(0, 0.65, 0, 0.18, 0.020, 12, 6, PLUT_MUTED, 0.35);
    }
    compile("containerVault");

    // 4b. Container ACTIVE Ignition Overlay
    b.addTorusXZ(0, 0.025, 0, 0.48, 0.032, contSegs, 6, PLUT_EMERALD, 0.95);
    b.addTorusXZ(0, 0.35, 0, 0.385, 0.034, contSegs, 6, PLUT_EMERALD, 0.90);
    b.addTorusXZ(0, 0.66, 0, 0.35, 0.042, contSegs, 6, PLUT_MINT, 1.00);
    b.addCylinderY(0, 0.62, 0.70, 0, 0.23, 0.23, contSegs, PLUT_EMERALD, 0.95);
    compile("containerActiveGlow");

    // 4c. Floating Downward Target Chevron/Cone above Active Container Barrel
    b.addCylinderY(0, 0.88, 1.18, 0, 0.02, 0.20, 8, PLUT_EMERALD, 0.90);
    b.addTorusXZ(0, 0.88, 0, 0.22, 0.022, 12, 6, PURE_WHITE, 0.80);
    compile("containerArrow");

    // =========================================================================
    // 5. SECURITY KEY ("key") — 20 Source Variations
    // =========================================================================
    const sKey = getStyle("key");
    addCleanDiscBase(0.32, 0.04, ACCENT_GOLD, 0.25, sKey === 1 || sKey === 13 ? 6 : 12);
    if (sKey === 7) {
      // #07 MagicaVoxel Block Key
      b.addBox(0, 0.28, -0.18, 0.24, 0.07, 0.20, ACCENT_GOLD, 0.45);
      b.addBox(0, 0.28, -0.18, 0.10, 0.08, 0.08, CHARCOAL_DARK, 0.0);
    } else {
      b.addTorusXZ(0, 0.28, -0.18, 0.14, 0.042, sKey === 1 ? 6 : 12, 6, ACCENT_GOLD, 0.45);
    }
    b.addBox(0, 0.28, 0.08, 0.07, 0.06, 0.38, PURE_WHITE, 0.20);
    b.addBox(0.09, 0.28, 0.14, 0.11, 0.06, 0.055, ACCENT_GOLD, 0.45);
    b.addBox(0.09, 0.28, 0.24, 0.11, 0.06, 0.055, ACCENT_GOLD, 0.45);
    compile("keyItem");

    // =========================================================================
    // 6. EXCAVATOR SPADE ("spade") — 20 Source Variations
    // =========================================================================
    const sSpade = getStyle("spade");
    addCleanDiscBase(0.32, 0.04, ACCENT_GOLD, 0.25, sSpade === 1 || sSpade === 13 ? 6 : 12);
    b.addBox(0, 0.28, -0.26, 0.22, 0.06, 0.06, ACCENT_GOLD, 0.40);
    b.addBox(0, 0.28, -0.04, 0.06, 0.05, 0.38, LIGHT_GREY, 0.10);
    b.addBevelledBox(0, 0.28, 0.20, 0.30, 0.05, 0.24, 0.02, PURE_WHITE, OFF_WHITE, 0.20);
    compile("spadeItem");

    // =========================================================================
    // 6b. RADIATION SHIELD POD ("capsule")
    // =========================================================================
    const sCap = getStyle("capsule");
    addCleanDiscBase(0.32, 0.04, ACCENT_SKY, 0.25, sCap === 1 ? 6 : 12);
    b.addCylinderY(0, 0.08, 0.46, 0, 0.20, 0.20, sCap === 7 ? 4 : 12, PURE_WHITE, 0.15);
    b.addBox(0, 0.48, 0, 0.22, 0.04, 0.07, ACCENT_SKY, 0.65);
    b.addBox(0, 0.48, 0, 0.07, 0.04, 0.22, ACCENT_SKY, 0.65);
    compile("capsuleItem");

    // =========================================================================
    // 7. INSULATING MAT ("mat")
    // =========================================================================
    const sMat = getStyle("mat");
    b.addBevelledBox(0, 0.08, 0, 0.76, 0.10, 0.56, 0.03, OFF_WHITE, PURE_WHITE, 0.08);
    if (sMat === 16) {
      // #16 LEGO Stud Mat
      for (let ix = -0.22; ix <= 0.23; ix += 0.22) {
        b.addCylinderY(ix, 0.13, 0.18, -0.12, 0.07, 0.07, 8, ACCENT_GOLD, 0.40);
        b.addCylinderY(ix, 0.13, 0.18,  0.12, 0.07, 0.07, 8, ACCENT_GOLD, 0.40);
      }
    } else {
      b.addBox(-0.20, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
      b.addBox( 0.00, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
      b.addBox( 0.20, 0.14, 0, 0.08, 0.025, 0.44, ACCENT_GOLD, 0.40);
    }
    compile("matItem");

    // =========================================================================
    // 8 & 9. EXTRA TIME & MYSTERY BOX ("extraTimeBox")
    // =========================================================================
    const sTime = getStyle("extraTimeBox");
    addCleanDiscBase(0.32, 0.04, ACCENT_SKY, 0.25);
    b.addBox(0, 0.10, 0, 0.38, 0.05, 0.38, PURE_WHITE, 0.15);
    b.addCylinderY(0, 0.13, 0.36, 0, 0.18, 0.03, sTime === 7 ? 4 : 10, ACCENT_SKY, 0.55);
    b.addCylinderY(0, 0.36, 0.59, 0, 0.03, 0.18, sTime === 7 ? 4 : 10, ACCENT_SKY, 0.55);
    b.addBox(0, 0.61, 0, 0.38, 0.05, 0.38, PURE_WHITE, 0.15);
    compile("extraTimeItem");

    b.addBevelledBox(0, 0.28, 0, 0.58, 0.48, 0.58, 0.05, OFF_WHITE, PURE_WHITE, 0.08);
    b.addBox(0, 0.28, 0, 0.61, 0.07, 0.10, LIGHT_GREY, 0.05);
    b.addBox(0, 0.28, 0, 0.10, 0.07, 0.61, LIGHT_GREY, 0.05);
    b.addOctahedron(0, 0.58, 0, 0.10, 0.10, 0.10, ACCENT_GOLD, 0.55);
    compile("mysteryBox");

    // =========================================================================
    // 10. LOCKED KEY-DOOR ("lockedDoor")
    // =========================================================================
    b.addBevelledBox(0, 0.36, 0, 0.92, 0.68, 0.38, 0.05, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.78, 0, 0.14, 0.038, 10, 6, ACCENT_GOLD, 0.50);
    b.addBevelledBox(0, 0.52, 0, 0.32, 0.36, 0.46, 0.03, ACCENT_GOLD, PURE_WHITE, 0.40);
    b.addBox(0, 0.52, 0, 0.08, 0.16, 0.49, CHARCOAL_DARK, 0.0);
    compile("lockedDoor");

    b.addBevelledBox(0, 0.36, 0, 0.92, 0.68, 0.38, 0.05, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.76, 0, 0.18, 0.036, 12, 6, ACCENT_SKY, 0.55);
    compile("proximityDoor");

    // =========================================================================
    // 11. AUTOMATIC LASER DOOR ("laserDoor")
    // =========================================================================
    const sLaser = getStyle("laserDoor");
    b.addBox(0, 0.04, -0.43, 0.92, 0.08, 0.10, OFF_WHITE, 0.04);
    b.addBox(0, 0.04,  0.43, 0.92, 0.08, 0.10, OFF_WHITE, 0.04);
    compile("laserPylons");

    b.addBox(-0.24, 0.02, 0, 0.08, 0.02, 0.64, PURE_WHITE, 0.35);
    b.addBox( 0.24, 0.02, 0, 0.08, 0.02, 0.64, PURE_WHITE, 0.35);
    compile("laserSafeOpen");

    b.addBox(0, 0.025, 0, 0.84, 0.03, 0.64, ACCENT_CORAL, 0.65);
    b.addOctahedron(0, 0.78, -0.42, 0.11, 0.11, 0.11, ACCENT_CORAL, 0.85);
    b.addOctahedron(0, 0.78,  0.42, 0.11, 0.11, 0.11, ACCENT_CORAL, 0.85);
    compile("laserDangerClosed");

    if (sLaser === 4 || sLaser === 10 || sLaser === 18) {
      // Multi-beam Aperture / ISS Laser Grid
      b.addBevelledBox(0, 0.34, 0, 0.88, 0.62, 0.28, 0.03, OFF_WHITE, PURE_WHITE, 0.06);
      b.addBox(0, 0.22, 0, 0.92, 0.06, 0.32, ACCENT_CORAL, 0.90);
      b.addBox(0, 0.48, 0, 0.92, 0.06, 0.32, ACCENT_CORAL, 0.90);
    } else {
      b.addBevelledBox(0, 0.34, 0, 0.88, 0.62, 0.32, 0.03, OFF_WHITE, PURE_WHITE, 0.08);
      b.addBox(0, 0.38, 0, 0.92, 0.12, 0.35, ACCENT_CORAL, 0.90);
    }
    compile("laserBeams");

    // =========================================================================
    // 12, 14 & 15. WARP, HAZARDS & EXIT PORTAL ("hazardsPortals")
    // =========================================================================
    const sHaz = getStyle("hazardsPortals");
    addCleanDiscBase(0.42, 0.05, ACCENT_SKY, 0.45);
    b.addTorusXZ(0, 0.10, 0, 0.26, 0.032, 14, 6, PURE_WHITE, 0.50);
    b.addCylinderY(0, 0.05, 0.09, 0, 0.18, 0.18, 12, ACCENT_SKY, 0.65);
    compile("warpPad");

    b.addBevelledBox(0, 0.34, 0, 0.82, 0.68, 0.82, 0.06, OFF_WHITE, PURE_WHITE, 0.05);
    b.addTorusXZ(0, 0.44, 0, 0.30, 0.035, 10, 6, ACCENT_SKY, 0.45);
    compile("warpFrame");

    b.addBevelledBox(0, 0.32, 0, 0.84, 0.60, 0.84, 0.05, OFF_WHITE, PURE_WHITE, 0.06);
    b.addOctahedron(0, 0.74, 0, 0.18, 0.22, 0.18, ACCENT_CORAL, 0.85);
    compile("hazardField");

    addCleanDiscBase(0.38, 0.05, ACCENT_CORAL, 0.40);
    b.addBevelledBox(0, 0.22, -0.02, 0.34, 0.22, 0.30, 0.04, PURE_WHITE, OFF_WHITE, 0.15);
    b.addBox(0, 0.12, 0.12, 0.20, 0.10, 0.12, OFF_WHITE, 0.10);
    b.addBox(-0.08, 0.24, 0.08, 0.07, 0.07, 0.07, ACCENT_CORAL, 0.85);
    b.addBox( 0.08, 0.24, 0.08, 0.07, 0.07, 0.07, ACCENT_CORAL, 0.85);
    compile("skullHazard");

    addCleanDiscBase(0.44, 0.06, ACCENT_SKY, 0.50);
    b.addBox(-0.34, 0.42, 0, 0.12, 0.78, 0.18, PURE_WHITE, 0.15);
    b.addBox( 0.34, 0.42, 0, 0.12, 0.78, 0.18, PURE_WHITE, 0.15);
    b.addBox(0, 0.82, 0, 0.82, 0.12, 0.22, PURE_WHITE, 0.20);
    b.addTorusXZ(0, 0.44, 0, 0.30, 0.04, sHaz === 7 ? 4 : 14, 6, ACCENT_SKY, 0.75);
    compile("exitPortal");

    // =========================================================================
    // 13. CRUMBLY DIGGABLE REGOLITH ("crumblyDirt") — 20 Source Variations
    // =========================================================================
    const sDirt = getStyle("crumblyDirt");
    if (sDirt === 6 || sDirt === 17) {
      // #06 Poly Pizza / #17 Bauhaus Octahedron Crystal Cluster
      b.addOctahedron(0, 0.22, 0, 0.38, 0.26, 0.38, ACCENT_SAND, 0.03);
      b.addOctahedron(-0.18, 0.32, -0.14, 0.22, 0.24, 0.22, LIGHT_GREY, 0.04);
      b.addOctahedron( 0.18, 0.30,  0.14, 0.22, 0.24, 0.22, OFF_WHITE, 0.04);
    } else if (sDirt === 16) {
      // #16 LDraw / LEGO Loose 1x1 Stud Bricks
      b.addBox(0, 0.14, 0, 0.78, 0.24, 0.78, ACCENT_SAND, 0.03, OFF_WHITE);
      b.addCylinderY(-0.18, 0.26, 0.34, -0.18, 0.12, 0.12, 10, OFF_WHITE, 0.04);
      b.addCylinderY( 0.18, 0.26, 0.34,  0.18, 0.12, 0.12, 10, LIGHT_GREY, 0.04);
    } else {
      b.addBevelledBox(0, 0.14, 0, 0.78, 0.26, 0.78, 0.05, ACCENT_SAND, OFF_WHITE, 0.03);
      b.addBevelledBox(-0.16, 0.30, -0.12, 0.34, 0.22, 0.34, 0.04, LIGHT_GREY, PURE_WHITE, 0.04);
      b.addBevelledBox( 0.16, 0.32,  0.14, 0.32, 0.24, 0.32, 0.04, ACCENT_SAND, OFF_WHITE, 0.04);
    }
    compile("crumblyDirt");

    b.addBevelledBox(0, 0.28, 0, 0.68, 0.52, 0.68, 0.06, LIGHT_GREY, OFF_WHITE, 0.02);
    compile("rockBlock");

    // =========================================================================
    // 16. ARTICULATED 3D GREY/WHITE PLAYER ROBOT ("player") — 20 Source Variations
    // =========================================================================
    const sPlayer = getStyle("player");
    const ROBOT_GREY_DARK  = [0.34, 0.37, 0.42];
    const ROBOT_GREY_MID   = [0.64, 0.68, 0.73];
    const ROBOT_GREY_LIGHT = [0.88, 0.90, 0.94];
    const ROBOT_FACE_DARK  = [0.14, 0.16, 0.20];
    const ROBOT_EYE_GLOW   = [0.92, 0.98, 1.00];

    // 16A. Player Robot Torso
    b.addBevelledBox(0, 0, 0, 0.42, 0.40, 0.26, 0.04, ROBOT_GREY_MID, ROBOT_GREY_LIGHT, 0.12);
    b.addBox(0, 0.04, 0.14, 0.30, 0.20, 0.03, PURE_WHITE, 0.18);
    b.addBox(0, 0.02, -0.17, 0.30, 0.30, 0.12, ROBOT_GREY_DARK, 0.08);
    b.addCylinderY(0, -0.24, -0.15, 0, 0.13, 0.15, 8, ROBOT_GREY_DARK, 0.10);
    compile("playerTorso");

    // 16B. Player Robot Head with 3D Robot Face (Styled per Source!)
    b.addCylinderY(0, -0.21, -0.12, 0, 0.10, 0.10, 8, ROBOT_GREY_DARK, 0.10);
    if (sPlayer === 2 || sPlayer === 5 || sPlayer === 15) {
      // #02 KayKit / #05 Three.js RobotExpressive Wide TV-Monitor Head with Twin V-Antennae
      b.addBevelledBox(0, 0.03, 0, 0.48, 0.36, 0.34, 0.05, PURE_WHITE, PURE_WHITE, 0.16);
      b.addCylinderY(-0.10, 0.21, 0.36, -0.02, 0.018, 0.012, 6, ROBOT_GREY_DARK, 0.15);
      b.addCylinderY( 0.10, 0.21, 0.36, -0.02, 0.018, 0.012, 6, ROBOT_GREY_DARK, 0.15);
      b.addOctahedron(-0.10, 0.38, -0.02, 0.038, 0.038, 0.038, ACCENT_SKY, 0.80);
      b.addOctahedron( 0.10, 0.38, -0.02, 0.038, 0.038, 0.038, ACCENT_SKY, 0.80);
    } else if (sPlayer === 10) {
      // #10 NASA Rover Twin-Lens Optical Mast Head
      b.addBevelledBox(0, 0.02, 0, 0.44, 0.32, 0.34, 0.04, PURE_WHITE, PURE_WHITE, 0.16);
      b.addCylinderY(0.12, 0.18, 0.34, 0, 0.03, 0.03, 8, ROBOT_GREY_MID, 0.15);
    } else if (sPlayer === 16) {
      // #16 LDraw / LEGO Minifig-Bot Cylindrical Stud Head
      b.addCylinderY(0, -0.15, 0.20, 0, 0.23, 0.23, 14, ROBOT_GREY_LIGHT, 0.15);
      b.addCylinderY(0, 0.20, 0.28, 0, 0.12, 0.12, 12, PURE_WHITE, 0.20);
    } else {
      // Standard Sculpted Grey-White Robot Head with Antenna & Ear Bolts
      b.addBevelledBox(0, 0.02, 0, 0.42, 0.38, 0.36, 0.05, ROBOT_GREY_MID, PURE_WHITE, 0.15);
      b.addCylinderY(0, 0.21, 0.34, -0.02, 0.022, 0.015, 6, ROBOT_GREY_LIGHT, 0.20);
      b.addOctahedron(0, 0.37, -0.02, 0.042, 0.042, 0.042, PURE_WHITE, 0.70);
      b.addBox(-0.23, 0.02, 0, 0.05, 0.12, 0.12, ROBOT_GREY_DARK, 0.12);
      b.addBox( 0.23, 0.02, 0, 0.05, 0.12, 0.12, ROBOT_GREY_DARK, 0.12);
    }
    // Expressive 3D Robot Face on +Z (Dark Screen, 2 Glowing Eyes + Pupils + Brow Ridges + Nose + Mouth Grille)
    b.addBox(0, 0.02, 0.175, 0.34, 0.28, 0.03, ROBOT_FACE_DARK, 0.05);
    b.addBox(-0.095, 0.075, 0.195, 0.10, 0.09, 0.03, ROBOT_EYE_GLOW, 0.90);
    b.addBox( 0.095, 0.075, 0.195, 0.10, 0.09, 0.03, ROBOT_EYE_GLOW, 0.90);
    b.addBox(-0.090, 0.078, 0.212, 0.038, 0.042, 0.015, ROBOT_FACE_DARK, 0.02);
    b.addBox( 0.090, 0.078, 0.212, 0.038, 0.042, 0.015, ROBOT_FACE_DARK, 0.02);
    b.addBox(-0.095, 0.140, 0.200, 0.12, 0.03, 0.04, PURE_WHITE, 0.30);
    b.addBox( 0.095, 0.140, 0.200, 0.12, 0.03, 0.04, PURE_WHITE, 0.30);
    b.addBox(0, 0.015, 0.200, 0.04, 0.07, 0.04, PURE_WHITE, 0.25);
    b.addBox(0, -0.075, 0.195, 0.20, 0.046, 0.025, ROBOT_EYE_GLOW, 0.85);
    b.addBox(-0.05, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    b.addBox( 0.00, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    b.addBox( 0.05, -0.075, 0.208, 0.016, 0.05, 0.015, ROBOT_FACE_DARK, 0.05);
    compile("playerHead");

    // 16C. Player Robot Limb
    b.addBox(0, -0.02, 0, 0.15, 0.07, 0.15, ROBOT_GREY_DARK, 0.12);
    b.addBevelledBox(0, -0.15, 0, 0.13, 0.25, 0.13, 0.02, ROBOT_GREY_MID, ROBOT_GREY_LIGHT, 0.15);
    b.addBox(0, -0.28, 0.02, 0.16, 0.09, 0.18, ROBOT_GREY_DARK, 0.15);
    compile("playerLimb");

    // =========================================================================
    // 17. COMPACT 3D ALIEN HUNTERS ("alienNormal" = Grey, "alienFast" = Dark Blue)
    // =========================================================================
    const sAlienN = getStyle("alienNormal");
    const sAlienF = getStyle("alienFast");
    const ALIEN_GREY_DARK  = [0.34, 0.37, 0.42];
    const ALIEN_GREY_MID   = [0.54, 0.58, 0.63];
    const ALIEN_GREY_LIGHT = [0.78, 0.81, 0.86];
    const ALIEN_GREY_EYE   = [0.96, 0.98, 1.00];

    const ALIEN_BLUE_DEEP  = [0.12, 0.22, 0.44];
    const ALIEN_BLUE_MID   = [0.20, 0.36, 0.64];
    const ALIEN_BLUE_HI    = [0.34, 0.52, 0.82];
    const ALIEN_BLUE_EYE   = [0.75, 0.90, 1.00];

    // 17a. Normal Alien Body ("Grau-in-Grau")
    if (sAlienN === 6 || sAlienN === 13 || sAlienN === 17) {
      b.addOctahedron(0, 0.08, 0.02, 0.18, 0.14, 0.22, ALIEN_GREY_DARK, 0.08);
    } else {
      b.addBevelledBox(0, 0.06, 0.02, 0.24, 0.16, 0.28, 0.035, ALIEN_GREY_DARK, ALIEN_GREY_MID, 0.08);
    }
    b.addOctahedron(0, 0.12, -0.14, 0.16, 0.14, 0.18, ALIEN_GREY_LIGHT, 0.12);
    b.addBox(-0.06, 0.08, 0.17, 0.05, 0.04, 0.03, ALIEN_GREY_EYE, 0.70);
    b.addBox( 0.06, 0.08, 0.17, 0.05, 0.04, 0.03, ALIEN_GREY_EYE, 0.70);
    compile("droidCore");

    // 17b. Articulated Spider Leg
    b.addBox(0.10, 0.09, 0, 0.16, 0.038, 0.038, [0.58, 0.62, 0.67], 0.08);
    b.addCylinderY(0.22, -0.16, 0.11, 0, 0.014, 0.028, 5, [0.44, 0.47, 0.52], 0.08);
    compile("alienSpiderLeg");

    // 17c. Mandible
    b.addBox(0, 0.0, 0.07, 0.038, 0.035, 0.12, ALIEN_GREY_LIGHT, 0.15);
    compile("alienMandible");

    // 17d. Fast Alien Body ("Dunkelblau")
    if (sAlienF === 6 || sAlienF === 13 || sAlienF === 17) {
      b.addOctahedron(0, 0.10, 0.0, 0.19, 0.16, 0.24, ALIEN_BLUE_DEEP, 0.12);
    } else {
      b.addBevelledBox(0, 0.09, 0.0, 0.25, 0.20, 0.30, 0.04, ALIEN_BLUE_DEEP, ALIEN_BLUE_MID, 0.12);
    }
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

    // 21. Exploded Alien Carapace Fragment
    b.addBevelledBox(0, 0, 0, 0.20, 0.10, 0.22, 0.025, [0.52, 0.55, 0.60], [0.74, 0.78, 0.84], 0.25);
    b.addOctahedron(0, 0.05, 0, 0.11, 0.11, 0.11, [0.85, 0.88, 0.94], 0.40);
    compile("alienBioChunk");

    return meshes;
  }
}
