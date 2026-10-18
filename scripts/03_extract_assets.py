#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/03_extract_assets.py
Deterministische Asset-Extraktion aus dem RAM-Image von Zone X.
Erzeugt zonex-web/assets/zonex_rom_bundle.json, zonex_rom_bundle.js und zonex_standalone.js.
"""

import json
import math
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent))
from unpack_all_zones import unpack_zone


def generate_atari_pal_palette():
    palette = []
    for c in range(256):
        hue = (c >> 4) & 0x0F
        lum = c & 0x0F
        y = lum / 15.0
        if hue == 0:
            val = int(y * 255)
            palette.append([val, val, val])
        else:
            angle = (hue - 1) * (2.0 * math.pi / 15.0) - 0.2
            sat = 0.35 if lum > 0 else 0.0
            u = sat * math.cos(angle)
            v = sat * math.sin(angle)
            r = y + 1.13983 * v
            g = y - 0.39465 * u - 0.58060 * v
            b = y + 2.03211 * u
            rc = max(0, min(255, int(r * 255)))
            gc = max(0, min(255, int(g * 255)))
            bc = max(0, min(255, int(b * 255)))
            palette.append([rc, gc, bc])
    return palette


def main():
    ram = bytearray(open("build/ram_relocated.bin", "rb").read())

    # Populate R ($5575: $C8..$CB) and r ($557C: $4C..$4F) into Meta-Tile slots 26 & 27
    ram[0x6D42 + 26 * 4 : 0x6D42 + 27 * 4] = bytes([0xC8, 0xC9, 0xCA, 0xCB])
    ram[0x6D42 + 27 * 4 : 0x6D42 + 28 * 4] = bytes([0x4C, 0x4D, 0x4E, 0x4F])

    assets_dir = Path("zonex-web/assets")
    assets_dir.mkdir(exist_ok=True, parents=True)

    # 1. Charsets (1024-byte font at $706C)
    font_ingame = list(ram[0x706C : 0x706C + 1024])

    # 2. Meta-Tiles (32 Tiles à 4 Zeichen ab $6D42)
    meta_tiles = []
    tile_table_raw = ram[0x6D42 : 0x6D42 + 32 * 4]
    tile_names = [
        "FLOOR", "WALL", "WARP_L", "WARP_R", "KEY", "CAPSULE",
        "PLUTONIUM", "DOOR", "WARP_PAD", "AIRDOORS", "LASER_LU", "PLAYER_START_I",
        "SLAM", "LASER_U", "LASER_DR", "LASER_D", "CONTAINER", "MATS",
        "LOCK_C", "TIME", "MYSTERY", "SPADE", "EXIT_O", "LASER_BEAM",
        "LOCKED", "CRUMBLY", "ROBOT_R", "ROBOT_r",
        "EMPTY_28", "EMPTY_29", "EMPTY_30", "EMPTY_31"
    ]
    for t in range(32):
        chars = list(tile_table_raw[t * 4 : (t + 1) * 4])
        meta_tiles.append({
            "id": t,
            "name": tile_names[t],
            "chars": chars,
            "use_pf3": any(c >= 0x80 for c in chars)
        })

    # 3. Player Sprites (P0 und P1 Shapes)
    sprites = {
        "p0_shapes": [
            list(ram[0x69D2:0x69E2]),
            list(ram[0x69E2:0x69F2]),
            list(ram[0x69F2:0x6A02])
        ],
        "p1_shapes": [
            list(ram[0x6B12:0x6B22]),
            list(ram[0x6B22:0x6B32]),
            list(ram[0x6B32:0x6B42])
        ],
        "pcolr0": 0xA6,
        "pcolr1": 0x18
    }

    # 4. Zonen-Daten (1 bis 12) für alle 3 Option Levels (0=Level 1, 1=Level 2, 2=Level 3)
    zones_by_level = []
    for diff in range(3):
        level_zones = [unpack_zone(ram, z, difficulty=diff) for z in range(12)]
        zones_by_level.append(level_zones)

    # Default zones = Option Level 1 (matching the Excel sheets and game boot default)
    zones = zones_by_level[0]

    # 5. Screen & Display List Templates (Title, Features $939C, Hall of Fame, HUD)
    screens_data = {
        "title_text_3db3": list(ram[0x3DB3 : 0x3DB3 + 160]),
        "hud_line1_3e53": list(ram[0x3E53 : 0x3E53 + 20]),
        "hud_line2_3e67": list(ram[0x3E67 : 0x3E67 + 20]),
        "dl_ingame_3c8b": list(ram[0x3C8B : 0x3CE5]),
        "dl_menu_3ce5": list(ram[0x3CE5 : 0x3D66]),
        "dl_features_939c": list(ram[0x939C : 0x93DC]),
        "features_screen_mem_93dc": list(ram[0x93DC : 0x9680]),
    }

    # 6. Audio-Tabellen aus $7500..$7800
    audio_tables = {
        "freq_sweep": list(ram[0x7500:0x7520]),
        "envelope": list(ram[0x7520:0x7540]),
        "notes": list(ram[0x7560:0x7580]),
        "sfx_patterns": list(ram[0x75E0:0x7600])
    }

    # 7. PAL Farbpalette
    palette = generate_atari_pal_palette()

    bundle = {
        "metadata": {
            "title": "Zone X",
            "author": "Derek Johnston",
            "publisher": "Gremlin Graphics",
            "year": 1985,
            "platform": "Atari 800XL / XE",
            "extracted_by": "Google Antigravity Autonomous Re-Engineering"
        },
        "charsets": {
            "in_game": font_ingame
        },
        "meta_tiles": meta_tiles,
        "sprites": sprites,
        "zones": zones,
        "zones_by_level": zones_by_level,
        "screens_data": screens_data,
        "audio_tables": audio_tables,
        "atari_pal_palette": palette
    }

    out_file = assets_dir / "zonex_rom_bundle.json"
    out_file.write_text(json.dumps(bundle, indent=2), encoding="utf-8")

    js_bundle_file = assets_dir / "zonex_rom_bundle.js"
    js_bundle_file.write_text(f"window.ZONEX_ROM_BUNDLE = {json.dumps(bundle)};\n", encoding="utf-8")

    js_root = Path("zonex-web/js")
    module_order = [
        "hardware/input_bridge.js",
        "engine/memory_state.js",
        "engine/zone_loader.js",
        "engine/feature_state_machine.js",
        "engine/player_physics.js",
        "engine/robot_ai.js",
        "engine/screens.js",
        "hardware/antic_gtia.js",
        "hardware/pokey_driver.js",
        "verify/lockstep_api.js",
        "main.js",
    ]
    standalone_lines = ["(function() {\n'use strict';\n"]
    for rel_mod in module_order:
        mod_path = js_root / rel_mod
        if mod_path.exists():
            standalone_lines.append(f"// === {rel_mod} ===\n")
            for line in mod_path.read_text(encoding="utf-8").splitlines():
                stripped = line.strip()
                if stripped.startswith("import "):
                    continue
                if stripped.startswith("export class "):
                    line = line.replace("export class ", "class ", 1)
                elif stripped.startswith("export function "):
                    line = line.replace("export function ", "function ", 1)
                elif stripped.startswith("export const "):
                    line = line.replace("export const ", "const ", 1)
                standalone_lines.append(line + "\n")
            standalone_lines.append("\n")
    standalone_lines.append("})();\n")
    (js_root / "zonex_standalone.js").write_text("".join(standalone_lines), encoding="utf-8")

    print(f"[PHASE 3 OK] Bundle erfolgreich generiert: {out_file}, {js_bundle_file} & zonex_standalone.js")


if __name__ == "__main__":
    main()
