/**
 * src/config/TileCatalog.js
 * Structured palette catalog of all playable tiles and entities in Zone X.
 */

import { TileType } from "./Constants.js";

export const EDITOR_PALETTE_CATALOG = Object.freeze([
  { id: TileType.FLOOR, label: "Boden (Floor)", category: "Terrain" },
  { id: TileType.WALL, label: "Mauer (Wall)", category: "Terrain" },
  { id: TileType.CRUMBLY_DIRT, label: "Erde (Crumbly)", category: "Terrain" },
  { id: TileType.FORCEFIELD, label: "Energiefeld (Laser Beam)", category: "Hazard" },
  { id: TileType.SKULL_HAZARD, label: "Todeszone (Skull)", category: "Hazard" },
  { id: TileType.LASER_DOOR_1A, label: "Laser-Tür 1A (Auf/Zu)", category: "Doors" },
  { id: TileType.LASER_DOOR_1B, label: "Laser-Tür 1B (Zu/Auf)", category: "Doors" },
  { id: TileType.LASER_DOOR_2A, label: "Laser-Tür 2A (Schnell)", category: "Doors" },
  { id: TileType.LASER_DOOR_2B, label: "Laser-Tür 2B (Schnell)", category: "Doors" },
  { id: TileType.LOCKED_DOOR, label: "Schlüssel-Tür (Locked)", category: "Doors" },
  { id: TileType.WARP_PAD, label: "Warp-Teleporter [3 Tiles]", category: "Doors" },
  { id: TileType.PLUTONIUM, label: "Plutonium-Kern", category: "Mission" },
  { id: TileType.CONTAINER, label: "Plutonium-Container", category: "Mission" },
  { id: TileType.PLAYER_START, label: "Spieler-Start (I)", category: "Mission" },
  { id: TileType.EXIT_PORTAL, label: "Ausgang (Exit O)", category: "Mission" },
  { id: TileType.KEY, label: "Schlüssel (Key)", category: "Items" },
  { id: TileType.SPADE, label: "Spaten (Spade)", category: "Items" },
  { id: TileType.INSULATING_MAT, label: "Isoliermatte (Mat)", category: "Items" },
  { id: TileType.RADIATION_CAPSULE, label: "Strahlenschutz (Capsule)", category: "Items" },
  { id: TileType.EXTRA_TIME, label: "Extra-Zeit (Time)", category: "Items" },
  { id: TileType.MYSTERY_BOX, label: "Mystery-Box (?)", category: "Items" },
  { id: TileType.ALIEN_DROID_NORMAL, label: "Alien-Droide R (Normal)", category: "Enemies" },
  { id: TileType.ALIEN_DROID_FAST, label: "Alien-Droide r (Schnell)", category: "Enemies" },
]);
