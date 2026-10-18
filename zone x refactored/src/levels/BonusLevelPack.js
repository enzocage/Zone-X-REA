/**
 * src/levels/BonusLevelPack.js
 * Clean, declarative level builders for the 10 Expansion Zones (Zones 13–22)
 * using the LevelMap domain model and semantic TileType enumerations.
 * Produces 1:1 identical level layouts to the original expansion pack.
 */

import { TileType, PalettePreset } from "../config/Constants.js";
import { LevelMap } from "../models/LevelMap.js";

function buildZone13TwinReactors() {
  const map = new LevelMap({
    zoneNumber: 13,
    title: "ZONE 13: THE TWIN REACTORS",
    subtitle: "Synchronisiere West- & Ost-Reaktor durch die Wechsellaser-Schleusen",
    palette: PalettePreset.TWIN_REACTORS,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 31, y: 24 },
  });

  map.drawBorder(4, 3, 24, 28, TileType.WALL);
  map.drawBorder(37, 3, 57, 28, TileType.WALL);
  map.drawBorder(26, 6, 35, 25, TileType.WALL);

  map.drawHorizontalLine(4, 57, 14, TileType.WALL);
  map.drawHorizontalLine(4, 57, 16, TileType.WALL);
  map.drawHorizontalLine(5, 56, 15, TileType.FLOOR);

  map.setTile(14, 15, TileType.LASER_DOOR_1A);
  map.setTile(24, 15, TileType.LASER_DOOR_1B);
  map.setTile(37, 15, TileType.LASER_DOOR_2A);
  map.setTile(47, 15, TileType.LASER_DOOR_2B);

  for (const x of [9, 19, 42, 52]) {
    map.setTile(x, 14, TileType.FLOOR);
    map.setTile(x, 16, TileType.FLOOR);
  }

  map.setTile(30, 14, TileType.LOCKED_DOOR);
  map.setTile(31, 16, TileType.LOCKED_DOOR);

  map.setTile(7, 6, TileType.PLUTONIUM);
  map.setTile(21, 25, TileType.PLUTONIUM);
  map.setTile(40, 6, TileType.PLUTONIUM);
  map.setTile(54, 25, TileType.PLUTONIUM);

  map.setTile(21, 6, TileType.KEY);
  map.setTile(40, 25, TileType.KEY);
  map.setTile(7, 25, TileType.RADIATION_CAPSULE);
  map.setTile(54, 6, TileType.EXTRA_TIME);

  map.setTile(28, 9, TileType.CONTAINER);
  map.setTile(33, 9, TileType.CONTAINER);
  map.setTile(28, 22, TileType.CONTAINER);
  map.setTile(33, 22, TileType.CONTAINER);

  map.placeWarpStructure(14, 5);
  map.placeWarpStructure(47, 26);
  map.addWarpLink(14, 5, 47, 26);
  map.addWarpLink(47, 26, 14, 5);

  map.setTile(14, 9, TileType.ALIEN_DROID_NORMAL);
  map.setTile(14, 22, TileType.ALIEN_DROID_FAST);
  map.setTile(47, 9, TileType.ALIEN_DROID_FAST);
  map.setTile(47, 22, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone14ExcavationSiteAlpha() {
  const map = new LevelMap({
    zoneNumber: 14,
    title: "ZONE 14: EXCAVATION SITE ALPHA",
    subtitle: "Schnapp dir den Spaten und grabe Stollen zu den verschütteten Kavernen",
    palette: PalettePreset.EXCAVATION_GOLD,
    fillTile: TileType.CRUMBLY_DIRT,
    playerSpawn: { x: 5, y: 5 },
    exitPortal: { x: 56, y: 15 },
  });

  map.fillRect(2, 2, 12, 8, TileType.FLOOR);
  map.setTile(10, 4, TileType.SPADE);
  map.setTile(10, 6, TileType.EXTRA_TIME);

  map.drawBorder(16, 3, 28, 13, TileType.WALL);
  map.fillRect(17, 4, 27, 12, TileType.FLOOR);
  map.setTile(16, 8, TileType.CRUMBLY_DIRT);
  map.setTile(22, 13, TileType.CRUMBLY_DIRT);

  map.drawBorder(34, 3, 46, 13, TileType.WALL);
  map.fillRect(35, 4, 45, 12, TileType.FLOOR);
  map.setTile(34, 8, TileType.CRUMBLY_DIRT);
  map.setTile(40, 13, TileType.CRUMBLY_DIRT);

  map.drawBorder(16, 18, 28, 28, TileType.WALL);
  map.fillRect(17, 19, 27, 27, TileType.FLOOR);
  map.setTile(22, 18, TileType.CRUMBLY_DIRT);
  map.setTile(28, 23, TileType.CRUMBLY_DIRT);

  map.drawBorder(34, 18, 46, 28, TileType.WALL);
  map.fillRect(35, 19, 45, 27, TileType.FLOOR);
  map.setTile(40, 18, TileType.CRUMBLY_DIRT);
  map.setTile(46, 23, TileType.CRUMBLY_DIRT);

  map.drawBorder(50, 5, 59, 26, TileType.WALL);
  map.fillRect(51, 6, 58, 25, TileType.FLOOR);
  map.setTile(50, 15, TileType.LOCKED_DOOR);
  map.setTile(22, 8, TileType.KEY);

  map.setTile(25, 6, TileType.PLUTONIUM);
  map.setTile(42, 6, TileType.PLUTONIUM);
  map.setTile(20, 25, TileType.PLUTONIUM);
  map.setTile(42, 25, TileType.PLUTONIUM);

  map.setTile(54, 9, TileType.CONTAINER);
  map.setTile(56, 9, TileType.CONTAINER);
  map.setTile(54, 22, TileType.CONTAINER);
  map.setTile(56, 22, TileType.CONTAINER);

  map.setTile(22, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(40, 10, TileType.ALIEN_DROID_FAST);
  map.setTile(22, 21, TileType.ALIEN_DROID_FAST);
  map.setTile(40, 21, TileType.ALIEN_DROID_NORMAL);
  map.setTile(55, 15, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone15LaserGauntlet() {
  const map = new LevelMap({
    zoneNumber: 15,
    title: "ZONE 15: LASER GAUNTLET",
    subtitle: "Überquere die dreistufige Laser-Rennstrecke mit perfektem Timing & Matten",
    palette: PalettePreset.LASER_GAUNTLET,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 4, y: 5 },
    exitPortal: { x: 57, y: 26 },
  });

  map.drawHorizontalLine(1, 52, 10, TileType.WALL);
  map.drawHorizontalLine(9, 60, 21, TileType.WALL);

  for (let x = 10; x <= 46; x += 6) {
    map.drawVerticalLine(x, 1, 9, TileType.WALL);
    map.setTile(x, 5, x % 12 === 4 ? TileType.LASER_DOOR_1A : TileType.LASER_DOOR_2A);
  }

  map.setTile(55, 3, TileType.INSULATING_MAT);
  map.setTile(57, 3, TileType.INSULATING_MAT);
  map.setTile(55, 5, TileType.INSULATING_MAT);
  map.setTile(57, 5, TileType.KEY);
  map.setTile(58, 7, TileType.PLUTONIUM);

  for (let x = 16; x <= 44; x += 14) {
    map.drawVerticalLine(x, 11, 20, TileType.FORCEFIELD);
    map.setTile(x, 15, TileType.LASER_DOOR_1B);
  }
  map.setTile(30, 13, TileType.PLUTONIUM);
  map.setTile(22, 18, TileType.PLUTONIUM);
  map.setTile(4, 15, TileType.EXTRA_TIME);

  map.drawVerticalLine(25, 22, 30, TileType.WALL);
  map.setTile(25, 26, TileType.LOCKED_DOOR);
  map.drawVerticalLine(40, 22, 30, TileType.WALL);
  map.setTile(40, 26, TileType.LASER_DOOR_2B);

  map.setTile(15, 26, TileType.PLUTONIUM);
  map.setTile(48, 24, TileType.CONTAINER);
  map.setTile(52, 24, TileType.CONTAINER);
  map.setTile(48, 28, TileType.CONTAINER);
  map.setTile(52, 28, TileType.CONTAINER);

  map.setTile(35, 15, TileType.ALIEN_DROID_FAST);
  map.setTile(20, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(32, 26, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone16QuantumLabyrinth() {
  const map = new LevelMap({
    zoneNumber: 16,
    title: "ZONE 16: QUANTUM LABYRINTH",
    subtitle: "Nutze das 6-Insel-Warp-Netzwerk (FIRE auf Teleporter), um alle Kerne zu bergen",
    palette: PalettePreset.QUANTUM_LABYRINTH,
    fillTile: TileType.WALL,
    playerSpawn: { x: 7, y: 8 },
    exitPortal: { x: 57, y: 23 },
  });

  const islands = [
    { x0: 3, y0: 3, x1: 18, y1: 13 },
    { x0: 23, y0: 3, x1: 38, y1: 13 },
    { x0: 43, y0: 3, x1: 58, y1: 13 },
    { x0: 3, y0: 18, x1: 18, y1: 28 },
    { x0: 23, y0: 18, x1: 38, y1: 28 },
    { x0: 43, y0: 18, x1: 58, y1: 28 },
  ];

  for (const isl of islands) {
    map.fillRect(isl.x0, isl.y0, isl.x1, isl.y1, TileType.FLOOR);
    map.drawBorder(isl.x0 - 1, isl.y0 - 1, isl.x1 + 1, isl.y1 + 1, TileType.SKULL_HAZARD);
  }

  const warpCoords = [
    { x: 14, y: 8 },
    { x: 27, y: 8 },
    { x: 50, y: 8 },
    { x: 10, y: 23 },
    { x: 30, y: 23 },
    { x: 50, y: 23 },
  ];
  for (let i = 0; i < warpCoords.length; i++) {
    const src = warpCoords[i];
    const dst = warpCoords[(i + 1) % warpCoords.length];
    map.placeWarpStructure(src.x, src.y);
    map.addWarpLink(src.x, src.y, dst.x, dst.y);
  }

  map.setTile(33, 6, TileType.PLUTONIUM);
  map.setTile(33, 11, TileType.KEY);
  map.setTile(54, 6, TileType.PLUTONIUM);
  map.setTile(54, 11, TileType.EXTRA_TIME);
  map.setTile(14, 20, TileType.PLUTONIUM);
  map.setTile(14, 26, TileType.RADIATION_CAPSULE);
  map.setTile(35, 20, TileType.PLUTONIUM);

  map.drawVerticalLine(53, 18, 28, TileType.WALL);
  map.setTile(53, 23, TileType.LOCKED_DOOR);
  map.setTile(55, 20, TileType.CONTAINER);
  map.setTile(55, 22, TileType.CONTAINER);
  map.setTile(55, 24, TileType.CONTAINER);
  map.setTile(55, 26, TileType.CONTAINER);

  map.setTile(29, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(46, 10, TileType.ALIEN_DROID_FAST);
  map.setTile(6, 25, TileType.ALIEN_DROID_NORMAL);
  map.setTile(26, 25, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone17SwarmContainment() {
  const map = new LevelMap({
    zoneNumber: 17,
    title: "ZONE 17: SWARM CONTAINMENT",
    subtitle: "Dringe durch drei konzentrische Sicherheitsringe bis zum inneren Plutonium-Kern vor",
    palette: PalettePreset.SWARM_ARENA,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 2 },
    exitPortal: { x: 30, y: 15 },
  });

  map.drawBorder(6, 4, 55, 27, TileType.WALL);
  map.drawBorder(14, 8, 47, 23, TileType.WALL);
  map.drawBorder(22, 12, 39, 19, TileType.WALL);

  map.setTile(30, 4, TileType.LASER_DOOR_1A);
  map.setTile(30, 27, TileType.LASER_DOOR_1B);
  map.setTile(6, 15, TileType.FLOOR);
  map.setTile(55, 15, TileType.FLOOR);

  map.setTile(14, 15, TileType.LASER_DOOR_2A);
  map.setTile(47, 15, TileType.LASER_DOOR_2B);
  map.setTile(30, 8, TileType.FLOOR);
  map.setTile(30, 23, TileType.FLOOR);

  map.setTile(22, 15, TileType.LOCKED_DOOR);
  map.setTile(39, 15, TileType.LOCKED_DOOR);

  map.setTile(3, 3, TileType.KEY);
  map.setTile(58, 28, TileType.KEY);
  map.setTile(3, 28, TileType.EXTRA_TIME);
  map.setTile(58, 3, TileType.MYSTERY_BOX);

  map.setTile(26, 14, TileType.PLUTONIUM);
  map.setTile(34, 14, TileType.PLUTONIUM);
  map.setTile(26, 17, TileType.PLUTONIUM);
  map.setTile(34, 17, TileType.PLUTONIUM);

  map.setTile(9, 6, TileType.CONTAINER);
  map.setTile(52, 6, TileType.CONTAINER);
  map.setTile(9, 25, TileType.CONTAINER);
  map.setTile(52, 25, TileType.CONTAINER);

  map.setTile(10, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(51, 15, TileType.ALIEN_DROID_NORMAL);
  map.setTile(30, 6, TileType.ALIEN_DROID_FAST);
  map.setTile(30, 25, TileType.ALIEN_DROID_FAST);
  map.setTile(18, 10, TileType.ALIEN_DROID_NORMAL);
  map.setTile(43, 21, TileType.ALIEN_DROID_NORMAL);
  map.setTile(18, 21, TileType.ALIEN_DROID_FAST);
  map.setTile(43, 10, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone18TheBridgeBuilder() {
  const map = new LevelMap({
    zoneNumber: 18,
    title: "ZONE 18: THE BRIDGE BUILDER",
    subtitle: "Baue mit Isoliermatten (FIRE) sichere Brücken über die tödlichen Energiefelder",
    palette: PalettePreset.BRIDGE_BUILDER,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 30, y: 27 },
  });

  for (let y = 1; y < 31; y++) {
    map.setTile(20, y, TileType.FORCEFIELD);
    map.setTile(21, y, TileType.FORCEFIELD);
    map.setTile(40, y, TileType.FORCEFIELD);
    map.setTile(41, y, TileType.FORCEFIELD);
  }

  for (const x of [28, 30, 32]) {
    map.setTile(x, 12, TileType.INSULATING_MAT);
    map.setTile(x, 18, TileType.INSULATING_MAT);
  }
  map.setTile(30, 6, TileType.EXTRA_TIME);

  map.drawBorder(4, 4, 16, 27, TileType.WALL);
  map.setTile(16, 10, TileType.LASER_DOOR_1A);
  map.setTile(16, 21, TileType.LASER_DOOR_2A);
  map.setTile(8, 8, TileType.PLUTONIUM);
  map.setTile(8, 15, TileType.PLUTONIUM);
  map.setTile(8, 23, TileType.PLUTONIUM);
  map.setTile(12, 15, TileType.ALIEN_DROID_NORMAL);

  map.drawBorder(45, 4, 57, 27, TileType.WALL);
  map.setTile(45, 10, TileType.LASER_DOOR_1B);
  map.setTile(45, 21, TileType.LASER_DOOR_2B);
  map.setTile(52, 8, TileType.CONTAINER);
  map.setTile(52, 15, TileType.CONTAINER);
  map.setTile(52, 23, TileType.CONTAINER);
  map.setTile(49, 15, TileType.ALIEN_DROID_FAST);

  return map.toZoneData();
}

function buildZone19ChronoVault() {
  const map = new LevelMap({
    zoneNumber: 19,
    title: "ZONE 19: CHRONO VAULT",
    subtitle: "Öffne alle 4 Sicherheitsebenen rechtzeitig und sammle die Zeit-Kapseln",
    palette: PalettePreset.CHRONO_VAULT,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 6, y: 4 },
    exitPortal: { x: 56, y: 28 },
  });

  for (const y of [8, 16, 24]) {
    map.drawHorizontalLine(1, 60, y, TileType.WALL);
  }

  map.setTile(15, 8, TileType.LOCKED_DOOR);
  map.setTile(45, 8, TileType.LASER_DOOR_1A);
  map.setTile(30, 16, TileType.LOCKED_DOOR);
  map.setTile(10, 16, TileType.LASER_DOOR_2A);
  map.setTile(20, 24, TileType.LOCKED_DOOR);
  map.setTile(50, 24, TileType.LASER_DOOR_2B);

  map.setTile(52, 4, TileType.KEY);
  map.setTile(55, 4, TileType.EXTRA_TIME);
  map.setTile(25, 4, TileType.PLUTONIUM);

  map.setTile(8, 12, TileType.KEY);
  map.setTile(50, 12, TileType.EXTRA_TIME);
  map.setTile(38, 12, TileType.PLUTONIUM);

  map.setTile(54, 20, TileType.KEY);
  map.setTile(12, 20, TileType.EXTRA_TIME);
  map.setTile(30, 20, TileType.PLUTONIUM);

  map.setTile(10, 28, TileType.PLUTONIUM);
  for (const x of [40, 43, 46, 49]) {
    map.setTile(x, 28, TileType.CONTAINER);
  }

  map.setTile(35, 4, TileType.ALIEN_DROID_NORMAL);
  map.setTile(22, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 20, TileType.ALIEN_DROID_FAST);
  map.setTile(28, 28, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone20CrumblyCatacombs() {
  const map = new LevelMap({
    zoneNumber: 20,
    title: "ZONE 20: CRUMBLY CATACOMBS",
    subtitle: "Grabe taktische Abkürzungen durch die Katakomben, um den Droiden auszuweichen",
    palette: PalettePreset.CRUMBLY_CATACOMBS,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 4, y: 4 },
    exitPortal: { x: 58, y: 28 },
  });

  for (let rx = 12; rx <= 48; rx += 12) {
    map.drawVerticalLine(rx, 1, 30, TileType.WALL);
    for (let ry = 4; ry <= 28; ry += 8) {
      map.setTile(
        rx,
        ry,
        (rx + ry) % 16 === 0 ? TileType.LASER_DOOR_1A : TileType.CRUMBLY_DIRT
      );
    }
  }
  for (let ry = 8; ry <= 24; ry += 8) {
    map.drawHorizontalLine(1, 60, ry, TileType.WALL);
    for (let rx = 6; rx <= 54; rx += 12) {
      map.setTile(
        rx,
        ry,
        (rx + ry) % 24 === 0 ? TileType.LASER_DOOR_2A : TileType.CRUMBLY_DIRT
      );
    }
  }

  map.setTile(8, 4, TileType.SPADE);
  map.setTile(18, 4, TileType.EXTRA_TIME);

  map.setTile(30, 4, TileType.PLUTONIUM);
  map.setTile(54, 4, TileType.PLUTONIUM);
  map.setTile(6, 20, TileType.PLUTONIUM);
  map.setTile(30, 20, TileType.PLUTONIUM);
  map.setTile(54, 20, TileType.PLUTONIUM);

  for (const x of [18, 30, 42, 52, 55]) {
    map.setTile(x, 28, TileType.CONTAINER);
  }

  map.setTile(18, 12, TileType.ALIEN_DROID_NORMAL);
  map.setTile(42, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(18, 20, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 20, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone21FortressGremlin() {
  const map = new LevelMap({
    zoneNumber: 21,
    title: "ZONE 21: FORTRESS GREMLIN",
    subtitle: "Erobere alle vier Festungsflügel (Spaten, Matten, Schlüssel & Teleporter)",
    palette: PalettePreset.FORTRESS_CITADEL,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 15 },
    exitPortal: { x: 57, y: 24 },
  });

  map.drawVerticalLine(28, 1, 30, TileType.WALL);
  map.drawVerticalLine(33, 1, 30, TileType.WALL);
  map.drawHorizontalLine(1, 60, 13, TileType.WALL);
  map.drawHorizontalLine(1, 60, 18, TileType.WALL);
  map.fillRect(29, 14, 32, 17, TileType.FLOOR);

  map.setTile(28, 7, TileType.LASER_DOOR_1A);
  map.setTile(33, 7, TileType.LOCKED_DOOR);
  map.setTile(28, 24, TileType.LASER_DOOR_2A);
  map.setTile(33, 24, TileType.LOCKED_DOOR);

  map.fillRect(4, 3, 16, 10, TileType.CRUMBLY_DIRT);
  map.setTile(22, 4, TileType.SPADE);
  map.setTile(8, 6, TileType.KEY);
  map.setTile(12, 6, TileType.PLUTONIUM);

  map.drawVerticalLine(16, 19, 30, TileType.FORCEFIELD);
  map.setTile(22, 22, TileType.INSULATING_MAT);
  map.setTile(24, 22, TileType.INSULATING_MAT);
  map.setTile(8, 22, TileType.KEY);
  map.setTile(8, 26, TileType.PLUTONIUM);

  map.placeWarpStructure(45, 5);
  map.setTile(54, 5, TileType.PLUTONIUM);
  map.setTile(54, 10, TileType.PLUTONIUM);
  map.setTile(45, 10, TileType.EXTRA_TIME);

  map.placeWarpStructure(45, 27);
  map.addWarpLink(45, 5, 45, 27);
  map.addWarpLink(45, 27, 45, 5);

  map.setTile(48, 21, TileType.CONTAINER);
  map.setTile(52, 21, TileType.CONTAINER);
  map.setTile(48, 25, TileType.CONTAINER);
  map.setTile(52, 25, TileType.CONTAINER);

  map.setTile(20, 9, TileType.ALIEN_DROID_NORMAL);
  map.setTile(42, 9, TileType.ALIEN_DROID_FAST);
  map.setTile(20, 26, TileType.ALIEN_DROID_FAST);
  map.setTile(42, 23, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

function buildZone22OmegaCoreMeltdown() {
  const map = new LevelMap({
    zoneNumber: 22,
    title: "ZONE 22: OMEGA CORE MELTDOWN",
    subtitle: "Das große Finale: 6 Plutonium-Stäbe im hochgesicherten Omega-Reaktor!",
    palette: PalettePreset.OMEGA_CORE,
    fillTile: TileType.FLOOR,
    playerSpawn: { x: 30, y: 4 },
    exitPortal: { x: 31, y: 15 },
  });

  map.drawBorder(3, 2, 58, 29, TileType.SKULL_HAZARD);
  map.drawBorder(18, 7, 43, 24, TileType.WALL);
  map.drawBorder(25, 11, 36, 20, TileType.WALL);

  map.setTile(18, 15, TileType.LASER_DOOR_1A);
  map.setTile(43, 15, TileType.LASER_DOOR_1B);
  map.setTile(30, 7, TileType.LASER_DOOR_2A);
  map.setTile(30, 24, TileType.LASER_DOOR_2B);

  map.setTile(25, 15, TileType.LOCKED_DOOR);
  map.setTile(36, 15, TileType.LOCKED_DOOR);

  map.fillRect(6, 4, 13, 9, TileType.CRUMBLY_DIRT);
  map.setTile(9, 6, TileType.PLUTONIUM);
  map.setTile(11, 6, TileType.KEY);

  map.fillRect(48, 4, 55, 9, TileType.CRUMBLY_DIRT);
  map.setTile(51, 6, TileType.PLUTONIUM);
  map.setTile(53, 6, TileType.KEY);

  map.fillRect(6, 22, 13, 27, TileType.CRUMBLY_DIRT);
  map.setTile(9, 25, TileType.PLUTONIUM);
  map.setTile(11, 25, TileType.EXTRA_TIME);

  map.fillRect(48, 22, 55, 27, TileType.CRUMBLY_DIRT);
  map.setTile(51, 25, TileType.PLUTONIUM);
  map.setTile(53, 25, TileType.RADIATION_CAPSULE);

  map.setTile(21, 9, TileType.SPADE);
  map.setTile(39, 9, TileType.INSULATING_MAT);
  map.setTile(39, 22, TileType.INSULATING_MAT);
  map.setTile(21, 22, TileType.PLUTONIUM);
  map.setTile(39, 18, TileType.PLUTONIUM);

  for (const x of [28, 31, 34]) {
    map.setTile(x, 13, TileType.CONTAINER);
    map.setTile(x, 18, TileType.CONTAINER);
  }

  map.placeWarpStructure(9, 15);
  map.placeWarpStructure(52, 15);
  map.addWarpLink(9, 15, 52, 15);
  map.addWarpLink(52, 15, 9, 15);

  map.setTile(15, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(46, 12, TileType.ALIEN_DROID_FAST);
  map.setTile(15, 19, TileType.ALIEN_DROID_NORMAL);
  map.setTile(46, 19, TileType.ALIEN_DROID_NORMAL);
  map.setTile(22, 15, TileType.ALIEN_DROID_FAST);
  map.setTile(39, 12, TileType.ALIEN_DROID_NORMAL);

  return map.toZoneData();
}

export function buildBonusLevels() {
  return [
    buildZone13TwinReactors(),
    buildZone14ExcavationSiteAlpha(),
    buildZone15LaserGauntlet(),
    buildZone16QuantumLabyrinth(),
    buildZone17SwarmContainment(),
    buildZone18TheBridgeBuilder(),
    buildZone19ChronoVault(),
    buildZone20CrumblyCatacombs(),
    buildZone21FortressGremlin(),
    buildZone22OmegaCoreMeltdown(),
  ];
}
