#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/03_extract_assets.py
Deterministische Asset-Extraktion aus dem RAM-Image von Zone X.
Erzeugt das strukturierte Bundle zonex-web/assets/zonex_rom_bundle.json.
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
    ram = open("build/ram_relocated.bin", "rb").read()

    assets_dir = Path("zonex-web/assets")
    assets_dir.mkdir(exist_ok=True, parents=True)

    # 1. Charsets (1024-byte font at $706C)
    font_ingame = list(ram[0x706C : 0x706C + 1024])

    # 2. Meta-Tiles (32 Tiles à 4 Zeichen ab $6D42)
    meta_tiles = []
    tile_table_raw = ram[0x6D42 : 0x6D42 + 32 * 4]
    tile_names = [
        "FLOOR", "WALL", "DOOR", "WALL_ALT", "CRUMBLY", "BLOCK",
        "PLUTONIUM", "KEY", "LASER_H", "AIRDOORS", "SLAM", "SPADE",
        "WARP", "MATS", "MATS_2", "MATS_3", "LOCKED", "TIME",
        "LASER_V", "LOCK", "CONTAINER", "BONUS", "DOOR_SPECIAL",
        "DECOR_1", "DECOR_2", "LASER_GEN", "EMPTY_26", "EMPTY_27",
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

    # 4. Zonen-Daten (1 bis 12) inkl. Zone-Farbpaletten ($A2C4) & Roboter ($A438/$A450/$A468)
    zones = []
    for z in range(12):
        zdata = unpack_zone(ram, z, difficulty=2)
        zdata["colors"] = list(ram[0xA2C4 + z * 4 : 0xA2C4 + (z + 1) * 4])

        p0 = ram[0xA438 + z * 2] | (ram[0xA438 + z * 2 + 1] << 8)
        p1 = ram[0xA450 + z * 2] | (ram[0xA450 + z * 2 + 1] << 8)
        p2 = ram[0xA468 + z * 2] | (ram[0xA468 + z * 2 + 1] << 8)

        robots = []
        for ptr in [p0, p1, p2]:
            cnt = ram[ptr]
            for r in range(cnt):
                rx = ram[ptr + 1 + r * 4]
                ry = ram[ptr + 1 + r * 4 + 1]
                rdir = ram[ptr + 1 + r * 4 + 2]
                rspd = ram[ptr + 1 + r * 4 + 3]
                robots.append({
                    "x": rx,
                    "y": ry,
                    "dir": rdir,
                    "speed": rspd
                })

        zdata["robots"] = robots
        zones.append(zdata)

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
        "screens_data": screens_data,
        "audio_tables": audio_tables,
        "atari_pal_palette": palette
    }

    out_file = assets_dir / "zonex_rom_bundle.json"
    json_text = json.dumps(bundle, indent=2)
    out_file.write_text(json_text, encoding="utf-8")

    js_bundle_file = assets_dir / "zonex_rom_bundle.js"
    js_bundle_file.write_text(f"window.ZONEX_ROM_BUNDLE = {json.dumps(bundle)};\n", encoding="utf-8")

    # Build classic script bundle zonex-web/js/zonex_standalone.js for file:// compatibility
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
