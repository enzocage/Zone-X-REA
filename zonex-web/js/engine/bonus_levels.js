/**
 * zonex-web/js/engine/bonus_levels.js
 * 10 Super Exciting & Innovative Bonus Levels (Zones 13–22) for Zone X.
 * Every level is 62x32 meta-tiles, 100% compatible with the genuine 6502 engine ($0B00..$12BF,
 * $1C00..$3BFF, $0600..$0AFF robots, $47CB warp gates, $654D exit portal, $4BE1 laser doors).
 */

import { MAP_WIDTH, MAP_HEIGHT } from "./memory_state.js";

function createBlankGrid(fillTile = 0) {
  const g = new Uint8Array(MAP_WIDTH * MAP_HEIGHT);
  g.fill(fillTile);
  // Outer solid walls
  for (let x = 0; x < MAP_WIDTH; x++) {
    g[0 * MAP_WIDTH + x] = 1;
    g[(MAP_HEIGHT - 1) * MAP_WIDTH + x] = 1;
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    g[y * MAP_WIDTH + 0] = 1;
    g[y * MAP_WIDTH + (MAP_WIDTH - 1)] = 1;
  }
  return g;
}

function setTile(g, x, y, t) {
  if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
    g[y * MAP_WIDTH + x] = t;
  }
}

function rectFill(g, x0, y0, x1, y1, t) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      setTile(g, x, y, t);
    }
  }
}

function rectBorder(g, x0, y0, x1, y1, t) {
  for (let x = x0; x <= x1; x++) {
    setTile(g, x, y0, t);
    setTile(g, x, y1, t);
  }
  for (let y = y0; y <= y1; y++) {
    setTile(g, x0, y, t);
    setTile(g, x1, y, t);
  }
}

function hLine(g, x0, x1, y, t) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) setTile(g, x, y, t);
}

function vLine(g, x, y0, y1, t) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) setTile(g, x, y, t);
}

function placeWarpGate(g, x, y) {
  setTile(g, x - 1, y, 2);
  setTile(g, x, y, 8);
  setTile(g, x + 1, y, 3);
}

function finalizeZone(zoneNumber, title, subtitle, colors, g, startXY, exitXY, warps = []) {
  setTile(g, startXY.x, startXY.y, 11);
  setTile(g, exitXY.x, exitXY.y, 22);

  let plutoniumCount = 0;
  let containerCount = 0;
  let doorCount = 0;
  const robots = [];

  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const t = g[y * MAP_WIDTH + x];
      if (t === 6) plutoniumCount++;
      else if (t === 16) containerCount++;
      else if (t === 7 || t === 9) doorCount++;
      else if (t === 26 || t === 27) {
        const etype = t === 26 ? 0 : 1;
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
    zone: zoneNumber,
    title,
    subtitle,
    isBonus: true,
    internal_zone_idx: (zoneNumber - 1) % 12,
    difficulty: 0,
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    fill_tile: 0,
    colors,
    plutonium_count: plutoniumCount,
    container_count: containerCount,
    door_count: doorCount,
    player_start: {
      x: startXY.x,
      y: startXY.y,
      offset: startXY.y * MAP_WIDTH + startXY.x,
    },
    exit_pos: {
      x: exitXY.x,
      y: exitXY.y,
      offset: exitXY.y * MAP_WIDTH + exitXY.x,
    },
    warps,
    robots,
    playfield_bytes: Array.from(g),
  };
}

export function generateBonusLevels() {
  const levels = [];

  // =========================================================================
  // ZONE 13: THE TWIN REACTORS (Dual-Core Synchronization)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // West Reactor Core & East Reactor Core + Central Containment Vault
    rectBorder(g, 4, 3, 24, 28, 1);
    rectBorder(g, 37, 3, 57, 28, 1);
    rectBorder(g, 26, 6, 35, 25, 1);

    // Central horizontal corridor at y = 15
    hLine(g, 4, 57, 14, 1);
    hLine(g, 4, 57, 16, 1);
    hLine(g, 5, 56, 15, 0);

    // Alternating Laser Doors guarding West & East reactor entries
    setTile(g, 14, 15, 10); // Laser 1A
    setTile(g, 24, 15, 13); // Laser 1B
    setTile(g, 37, 15, 14); // Laser 2A
    setTile(g, 47, 15, 15); // Laser 2B

    // Open vertical passages inside West & East chambers
    setTile(g, 9, 14, 0); setTile(g, 9, 16, 0);
    setTile(g, 19, 14, 0); setTile(g, 19, 16, 0);
    setTile(g, 42, 14, 0); setTile(g, 42, 16, 0);
    setTile(g, 52, 14, 0); setTile(g, 52, 16, 0);

    // Central vault doors (Key Doors)
    setTile(g, 30, 14, 9);
    setTile(g, 31, 16, 9);

    // Plutonium in the 4 reactor sub-chambers
    setTile(g, 7, 6, 6);
    setTile(g, 21, 25, 6);
    setTile(g, 40, 6, 6);
    setTile(g, 54, 25, 6);

    // Keys & Masks & Time
    setTile(g, 21, 6, 4);
    setTile(g, 40, 25, 4);
    setTile(g, 7, 25, 5);
    setTile(g, 54, 6, 19);

    // 4 Containers inside the Central Containment Vault (north & south)
    setTile(g, 28, 9, 16);
    setTile(g, 33, 9, 16);
    setTile(g, 28, 22, 16);
    setTile(g, 33, 22, 16);

    // Warp Gates connecting West Core (14, 5) <-> East Core (47, 26)
    placeWarpGate(g, 14, 5);
    placeWarpGate(g, 47, 26);

    // Patrol Robots
    setTile(g, 14, 9, 26);
    setTile(g, 14, 22, 27);
    setTile(g, 47, 9, 27);
    setTile(g, 47, 22, 26);

    levels.push(
      finalizeZone(
        13,
        "ZONE 13: THE TWIN REACTORS",
        "Synchronisiere West- & Ost-Reaktor durch die Wechsellaser-Schleusen",
        [0x28, 0xCA, 0x94, 0x46],
        g,
        { x: 30, y: 15 },
        { x: 31, y: 24 },
        [
          { src_x: 14, src_y: 5, dst_x: 47, dst_y: 26 },
          { src_x: 47, src_y: 26, dst_x: 14, dst_y: 5 },
        ]
      )
    );
  }

  // =========================================================================
  // ZONE 14: EXCAVATION SITE ALPHA (Subterranean Spade Dig)
  // =========================================================================
  {
    const g = createBlankGrid(25); // Filled with diggable Crumbly Dirt!
    // Clear starting shaft & Spade chamber
    rectFill(g, 2, 2, 12, 8, 0);
    setTile(g, 10, 4, 21); // SPADE!
    setTile(g, 10, 6, 19); // Extra Time

    // Carved underground caverns separated by Crumbly Dirt walls
    rectBorder(g, 16, 3, 28, 13, 1);
    rectFill(g, 17, 4, 27, 12, 0);
    setTile(g, 16, 8, 25); // Diggable entry
    setTile(g, 22, 13, 25);

    rectBorder(g, 34, 3, 46, 13, 1);
    rectFill(g, 35, 4, 45, 12, 0);
    setTile(g, 34, 8, 25);
    setTile(g, 40, 13, 25);

    rectBorder(g, 16, 18, 28, 28, 1);
    rectFill(g, 17, 19, 27, 27, 0);
    setTile(g, 22, 18, 25);
    setTile(g, 28, 23, 25);

    rectBorder(g, 34, 18, 46, 28, 1);
    rectFill(g, 35, 19, 45, 27, 0);
    setTile(g, 40, 18, 25);
    setTile(g, 46, 23, 25);

    // Eastern Processing Chamber with Containers
    rectBorder(g, 50, 5, 59, 26, 1);
    rectFill(g, 51, 6, 58, 25, 0);
    setTile(g, 50, 15, 9); // Key door into processing hub
    setTile(g, 22, 8, 4);  // Key in NW cavern

    // Plutonium in the caverns + buried in dirt pockets
    setTile(g, 25, 6, 6);
    setTile(g, 42, 6, 6);
    setTile(g, 20, 25, 6);
    setTile(g, 42, 25, 6);

    // Containers in Eastern Processing Chamber
    setTile(g, 54, 9, 16);
    setTile(g, 56, 9, 16);
    setTile(g, 54, 22, 16);
    setTile(g, 56, 22, 16);

    // Robots patrolling inside the caverns
    setTile(g, 22, 10, 26);
    setTile(g, 40, 10, 27);
    setTile(g, 22, 21, 27);
    setTile(g, 40, 21, 26);
    setTile(g, 55, 15, 26);

    levels.push(
      finalizeZone(
        14,
        "ZONE 14: EXCAVATION SITE ALPHA",
        "Schnapp dir den Spaten und grabe Stollen zu den verschütteten Kavernen",
        [0x36, 0xEA, 0x24, 0x88],
        g,
        { x: 5, y: 5 },
        { x: 56, y: 15 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 15: LASER GAUNTLET (Precision Timing & Forcefield Bridges)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // 3 horizontal racing lanes
    hLine(g, 1, 52, 10, 1);
    hLine(g, 9, 60, 21, 1);

    // Top Lane (Eastbound): series of alternating Laser Doors
    for (let x = 10; x <= 46; x += 6) {
      vLine(g, x, 1, 9, 1);
      setTile(g, x, 5, (x % 12 === 4) ? 10 : 14);
    }
    // Collect Mats & Key at top-right turnaround
    setTile(g, 55, 3, 17);
    setTile(g, 57, 3, 17);
    setTile(g, 55, 5, 17);
    setTile(g, 57, 5, 4);
    setTile(g, 58, 7, 6);

    // Middle Lane (Westbound): Forcefield Beams (23) that can be bridged with Mats or bypassed via timing alcoves
    for (let x = 16; x <= 44; x += 14) {
      vLine(g, x, 11, 20, 23);
      setTile(g, x, 15, 13); // Laser door in the middle of the beam wall
    }
    setTile(g, 30, 13, 6);
    setTile(g, 22, 18, 6);
    setTile(g, 4, 15, 19); // Extra Time at west turnaround

    // Bottom Lane (Eastbound to Reactor Exit):
    vLine(g, 25, 22, 30, 1);
    setTile(g, 25, 26, 9); // Key door
    vLine(g, 40, 22, 30, 1);
    setTile(g, 40, 26, 15); // Laser door 2B

    setTile(g, 15, 26, 6);
    // 4 Containers in SE Sanctuary
    setTile(g, 48, 24, 16);
    setTile(g, 52, 24, 16);
    setTile(g, 48, 28, 16);
    setTile(g, 52, 28, 16);

    // Fast patrol robots in each lane
    setTile(g, 35, 15, 27);
    setTile(g, 20, 15, 26);
    setTile(g, 32, 26, 27);

    levels.push(
      finalizeZone(
        15,
        "ZONE 15: LASER GAUNTLET",
        "Überquere die dreistufige Laser-Rennstrecke mit perfektem Timing & Matten",
        [0x44, 0x1E, 0x82, 0xC8],
        g,
        { x: 4, y: 5 },
        { x: 57, y: 26 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 16: QUANTUM LABYRINTH (The 6-Island Teleport Matrix)
  // =========================================================================
  {
    const g = createBlankGrid(1);
    const islands = [
      { x0: 3, y0: 3, x1: 18, y1: 13 },   // Island 0 (NW - Start)
      { x0: 23, y0: 3, x1: 38, y1: 13 },  // Island 1 (N - Key & Plutonium 1)
      { x0: 43, y0: 3, x1: 58, y1: 13 },  // Island 2 (NE - Plutonium 2 & Time)
      { x0: 3, y0: 18, x1: 18, y1: 28 },  // Island 3 (SW - Plutonium 3 & Masks)
      { x0: 23, y0: 18, x1: 38, y1: 28 }, // Island 4 (S - Plutonium 4)
      { x0: 43, y0: 18, x1: 58, y1: 28 }, // Island 5 (SE - Containers & Exit)
    ];
    for (const isl of islands) {
      rectFill(g, isl.x0, isl.y0, isl.x1, isl.y1, 0);
      rectBorder(g, isl.x0 - 1, isl.y0 - 1, isl.x1 + 1, isl.y1 + 1, 24); // Surrounded by Skull Hazard
    }

    // Place Warp Gates on each island (2 gates per island for forward/back loop)
    const warpCoords = [
      { x: 14, y: 8 },  // 0 -> 1
      { x: 27, y: 8 },  // 1 -> 2
      { x: 50, y: 8 },  // 2 -> 3
      { x: 10, y: 23 }, // 3 -> 4
      { x: 30, y: 23 }, // 4 -> 5
      { x: 50, y: 23 }, // 5 -> 0
    ];
    for (const wc of warpCoords) placeWarpGate(g, wc.x, wc.y);

    // Items & Plutonium on Islands 1..4
    setTile(g, 33, 6, 6);
    setTile(g, 33, 11, 4); // Key
    setTile(g, 54, 6, 6);
    setTile(g, 54, 11, 19);
    setTile(g, 14, 20, 6);
    setTile(g, 14, 26, 5);
    setTile(g, 35, 20, 6);

    // Containers & Key Door on Island 5
    vLine(g, 53, 18, 28, 1);
    setTile(g, 53, 23, 9);
    setTile(g, 55, 20, 16);
    setTile(g, 55, 22, 16);
    setTile(g, 55, 24, 16);
    setTile(g, 55, 26, 16);

    // Robots on Islands 1..4
    setTile(g, 29, 10, 26);
    setTile(g, 46, 10, 27);
    setTile(g, 6, 25, 26);
    setTile(g, 26, 25, 27);

    const warps = [];
    for (let i = 0; i < warpCoords.length; i++) {
      const src = warpCoords[i];
      const dst = warpCoords[(i + 1) % warpCoords.length];
      warps.push({ src_x: src.x, src_y: src.y, dst_x: dst.x, dst_y: dst.y });
    }

    levels.push(
      finalizeZone(
        16,
        "ZONE 16: QUANTUM LABYRINTH",
        "Nutze das 6-Insel-Warp-Netzwerk (FIRE auf Teleporter), um alle Kerne zu bergen",
        [0x94, 0xAC, 0x72, 0x1A],
        g,
        { x: 7, y: 8 },
        { x: 57, y: 23 },
        warps
      )
    );
  }

  // =========================================================================
  // ZONE 17: SWARM CONTAINMENT (Concentric Ring Arena)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    rectBorder(g, 6, 4, 55, 27, 1);
    rectBorder(g, 14, 8, 47, 23, 1);
    rectBorder(g, 22, 12, 39, 19, 1);

    // Gates in each concentric ring
    setTile(g, 30, 4, 10);
    setTile(g, 30, 27, 13);
    setTile(g, 6, 15, 0);
    setTile(g, 55, 15, 0);

    setTile(g, 14, 15, 14);
    setTile(g, 47, 15, 15);
    setTile(g, 30, 8, 0);
    setTile(g, 30, 23, 0);

    setTile(g, 22, 15, 9); // Inner core Key Door
    setTile(g, 39, 15, 9);

    // Keys in outer corners
    setTile(g, 3, 3, 4);
    setTile(g, 58, 28, 4);
    setTile(g, 3, 28, 19);
    setTile(g, 58, 3, 20);

    // 4 Plutonium inside the innermost core
    setTile(g, 26, 14, 6);
    setTile(g, 34, 14, 6);
    setTile(g, 26, 17, 6);
    setTile(g, 34, 17, 6);

    // 4 Containers in the outer corners
    setTile(g, 9, 6, 16);
    setTile(g, 52, 6, 16);
    setTile(g, 9, 25, 16);
    setTile(g, 52, 25, 16);

    // 8 Patrol Robots in the concentric rings
    setTile(g, 10, 15, 26);
    setTile(g, 51, 15, 26);
    setTile(g, 30, 6, 27);
    setTile(g, 30, 25, 27);
    setTile(g, 18, 10, 26);
    setTile(g, 43, 21, 26);
    setTile(g, 18, 21, 27);
    setTile(g, 43, 10, 27);

    levels.push(
      finalizeZone(
        17,
        "ZONE 17: SWARM CONTAINMENT",
        "Dringe durch drei konzentrische Sicherheitsringe bis zum inneren Plutonium-Kern vor",
        [0xB4, 0xEC, 0x32, 0x46],
        g,
        { x: 30, y: 2 },
        { x: 30, y: 15 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 18: THE BRIDGE BUILDER (Tactical Mat Engineering Puzzle)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // Central safe hub (x = 24..37) separated from West & East chambers by Forcefield moats (Tile 23)
    for (let y = 1; y < 31; y++) {
      setTile(g, 20, y, 23);
      setTile(g, 21, y, 23);
      setTile(g, 40, y, 23);
      setTile(g, 41, y, 23);
    }

    // Supply of Mats in Central Hub
    setTile(g, 28, 12, 17);
    setTile(g, 30, 12, 17);
    setTile(g, 32, 12, 17);
    setTile(g, 28, 18, 17);
    setTile(g, 30, 18, 17);
    setTile(g, 32, 18, 17);
    setTile(g, 30, 6, 19);

    // West Chamber: Plutonium vaults guarded by Laser Doors
    rectBorder(g, 4, 4, 16, 27, 1);
    setTile(g, 16, 10, 10);
    setTile(g, 16, 21, 14);
    setTile(g, 8, 8, 6);
    setTile(g, 8, 15, 6);
    setTile(g, 8, 23, 6);
    setTile(g, 12, 15, 26);

    // East Chamber: Containers guarded by Laser Doors
    rectBorder(g, 45, 4, 57, 27, 1);
    setTile(g, 45, 10, 13);
    setTile(g, 45, 21, 15);
    setTile(g, 52, 8, 16);
    setTile(g, 52, 15, 16);
    setTile(g, 52, 23, 16);
    setTile(g, 49, 15, 27);

    levels.push(
      finalizeZone(
        18,
        "ZONE 18: THE BRIDGE BUILDER",
        "Baue mit Isoliermatten (FIRE) sichere Brücken über die tödlichen Energiefelder",
        [0x74, 0xCE, 0x16, 0x58],
        g,
        { x: 30, y: 15 },
        { x: 30, y: 27 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 19: CHRONO VAULT (Multi-Tier Airlock Sprint)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // 4 horizontal tiers separated by solid walls with Key Doors & Laser Doors
    for (const y of [8, 16, 24]) {
      hLine(g, 1, 60, y, 1);
    }
    // Tier 1 -> Tier 2 doors
    setTile(g, 15, 8, 9);
    setTile(g, 45, 8, 10);
    // Tier 2 -> Tier 3 doors
    setTile(g, 30, 16, 9);
    setTile(g, 10, 16, 14);
    // Tier 3 -> Tier 4 doors
    setTile(g, 20, 24, 9);
    setTile(g, 50, 24, 15);

    // Keys, Time Pickups & Plutonium on each tier
    setTile(g, 52, 4, 4);
    setTile(g, 55, 4, 19);
    setTile(g, 25, 4, 6);

    setTile(g, 8, 12, 4);
    setTile(g, 50, 12, 19);
    setTile(g, 38, 12, 6);

    setTile(g, 54, 20, 4);
    setTile(g, 12, 20, 19);
    setTile(g, 30, 20, 6);

    setTile(g, 10, 28, 6);
    setTile(g, 40, 28, 16);
    setTile(g, 43, 28, 16);
    setTile(g, 46, 28, 16);
    setTile(g, 49, 28, 16);

    // Patrol robots on each tier
    setTile(g, 35, 4, 26);
    setTile(g, 22, 12, 27);
    setTile(g, 42, 20, 27);
    setTile(g, 28, 28, 26);

    levels.push(
      finalizeZone(
        19,
        "ZONE 19: CHRONO VAULT",
        "Öffne alle 4 Sicherheitsebenen rechtzeitig und sammle die Zeit-Kapseln",
        [0x16, 0xBC, 0x84, 0x2A],
        g,
        { x: 6, y: 4 },
        { x: 56, y: 28 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 20: CRUMBLY CATACOMBS (Spade + Laser Hybrid Maze)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // Checkerboard of rooms separated by alternating Brick Walls (1), Crumbly Dirt (25), and Laser Doors
    for (let rx = 12; rx <= 48; rx += 12) {
      vLine(g, rx, 1, 30, 1);
      for (let ry = 4; ry <= 28; ry += 8) {
        setTile(g, rx, ry, ((rx + ry) % 16 === 0) ? 10 : 25);
      }
    }
    for (let ry = 8; ry <= 24; ry += 8) {
      hLine(g, 1, 60, ry, 1);
      for (let rx = 6; rx <= 54; rx += 12) {
        setTile(g, rx, ry, ((rx + ry) % 24 === 0) ? 14 : 25);
      }
    }

    // Spade in top-left room
    setTile(g, 8, 4, 21);
    setTile(g, 18, 4, 19);

    // 5 Plutonium scattered across the catacomb chambers
    setTile(g, 30, 4, 6);
    setTile(g, 54, 4, 6);
    setTile(g, 6, 20, 6);
    setTile(g, 30, 20, 6);
    setTile(g, 54, 20, 6);

    // 5 Containers in the bottom rooms
    setTile(g, 18, 28, 16);
    setTile(g, 30, 28, 16);
    setTile(g, 42, 28, 16);
    setTile(g, 52, 28, 16);
    setTile(g, 55, 28, 16);

    // Robots in the catacomb chambers
    setTile(g, 18, 12, 26);
    setTile(g, 42, 12, 27);
    setTile(g, 18, 20, 27);
    setTile(g, 42, 20, 26);

    levels.push(
      finalizeZone(
        20,
        "ZONE 20: CRUMBLY CATACOMBS",
        "Grabe taktische Abkürzungen durch die Katakomben, um den Droiden auszuweichen",
        [0x24, 0xDA, 0x36, 0x98],
        g,
        { x: 4, y: 4 },
        { x: 58, y: 28 },
        []
      )
    );
  }

  // =========================================================================
  // ZONE 21: FORTRESS GREMLIN (The 4-Wing Citadel)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // Cross corridors dividing the map into 4 Citadel Wings
    vLine(g, 28, 1, 30, 1);
    vLine(g, 33, 1, 30, 1);
    hLine(g, 1, 60, 13, 1);
    hLine(g, 1, 60, 18, 1);
    rectFill(g, 29, 14, 32, 17, 0);

    // Entry doors from central crossroads into the 4 wings
    setTile(g, 28, 7, 10);  // NW Wing
    setTile(g, 33, 7, 9);   // NE Wing (Key Door)
    setTile(g, 28, 24, 14); // SW Wing
    setTile(g, 33, 24, 9);  // SE Wing (Key Door)

    // NW Wing: Spade + Crumbly Vault containing Key #1 & Plutonium #1
    rectFill(g, 4, 3, 16, 10, 25);
    setTile(g, 22, 4, 21); // Spade
    setTile(g, 8, 6, 4);   // Key #1
    setTile(g, 12, 6, 6);  // Plutonium #1

    // SW Wing: Forcefield Bridge + Mats containing Key #2 & Plutonium #2
    vLine(g, 16, 19, 30, 23);
    setTile(g, 22, 22, 17);
    setTile(g, 24, 22, 17);
    setTile(g, 8, 22, 4);  // Key #2
    setTile(g, 8, 26, 6);  // Plutonium #2

    // NE Wing: Warp Gate & Laser Chamber containing Plutonium #3 & #4
    placeWarpGate(g, 45, 5);
    setTile(g, 54, 5, 6);
    setTile(g, 54, 10, 6);
    setTile(g, 45, 10, 19);

    // SE Wing: Reactor Core with 4 Containers & Exit
    placeWarpGate(g, 45, 27);
    setTile(g, 48, 21, 16);
    setTile(g, 52, 21, 16);
    setTile(g, 48, 25, 16);
    setTile(g, 52, 25, 16);

    // Citadel Guards
    setTile(g, 20, 9, 26);
    setTile(g, 42, 9, 27);
    setTile(g, 20, 26, 27);
    setTile(g, 42, 23, 26);

    levels.push(
      finalizeZone(
        21,
        "ZONE 21: FORTRESS GREMLIN",
        "Erobere alle vier Festungsflügel (Spaten, Matten, Schlüssel & Teleporter)",
        [0x64, 0xEC, 0xB6, 0x3A],
        g,
        { x: 30, y: 15 },
        { x: 57, y: 24 },
        [
          { src_x: 45, src_y: 5, dst_x: 45, dst_y: 27 },
          { src_x: 45, src_y: 27, dst_x: 45, dst_y: 5 },
        ]
      )
    );
  }

  // =========================================================================
  // ZONE 22: OMEGA CORE MELTDOWN (The Ultimate Finale)
  // =========================================================================
  {
    const g = createBlankGrid(0);
    // Outer perimeter hazard wall with inner chambers
    rectBorder(g, 3, 2, 58, 29, 24);
    rectBorder(g, 18, 7, 43, 24, 1);
    rectBorder(g, 25, 11, 36, 20, 1);

    // Laser airlocks into the Omega Core
    setTile(g, 18, 15, 10);
    setTile(g, 43, 15, 13);
    setTile(g, 30, 7, 14);
    setTile(g, 30, 24, 15);

    // Inner sanctum Key Doors
    setTile(g, 25, 15, 9);
    setTile(g, 36, 15, 9);

    // Crumbly pockets in the 4 outer corners protecting Plutonium & Keys
    rectFill(g, 6, 4, 13, 9, 25);
    setTile(g, 9, 6, 6);
    setTile(g, 11, 6, 4);

    rectFill(g, 48, 4, 55, 9, 25);
    setTile(g, 51, 6, 6);
    setTile(g, 53, 6, 4);

    rectFill(g, 6, 22, 13, 27, 25);
    setTile(g, 9, 25, 6);
    setTile(g, 11, 25, 19);

    rectFill(g, 48, 22, 55, 27, 25);
    setTile(g, 51, 25, 6);
    setTile(g, 53, 25, 5);

    // Spade & Mats in middle ring
    setTile(g, 21, 9, 21); // Spade
    setTile(g, 39, 9, 17); // Mat
    setTile(g, 39, 22, 17);
    setTile(g, 21, 22, 6); // 5th Plutonium
    setTile(g, 39, 18, 6); // 6th Plutonium

    // 6 Containers inside the Inner Sanctum
    setTile(g, 28, 13, 16);
    setTile(g, 31, 13, 16);
    setTile(g, 34, 13, 16);
    setTile(g, 28, 18, 16);
    setTile(g, 31, 18, 16);
    setTile(g, 34, 18, 16);

    // Warp Gates between West & East outer corridors
    placeWarpGate(g, 9, 15);
    placeWarpGate(g, 52, 15);

    // Elite Robot Patrols
    setTile(g, 15, 12, 27);
    setTile(g, 46, 12, 27);
    setTile(g, 15, 19, 26);
    setTile(g, 46, 19, 26);
    setTile(g, 22, 15, 27);
    setTile(g, 39, 12, 26);

    levels.push(
      finalizeZone(
        22,
        "ZONE 22: OMEGA CORE MELTDOWN",
        "Das große Finale: 6 Plutonium-Stäbe im hochgesicherten Omega-Reaktor!",
        [0x46, 0xFE, 0x96, 0x1C],
        g,
        { x: 30, y: 4 },
        { x: 31, y: 15 },
        [
          { src_x: 9, src_y: 15, dst_x: 52, dst_y: 15 },
          { src_x: 52, src_y: 15, dst_x: 9, dst_y: 15 },
        ]
      )
    );
  }

  return levels;
}
