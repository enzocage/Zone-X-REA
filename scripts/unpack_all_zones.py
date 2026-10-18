#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/unpack_all_zones.py
100% bitgenaue 1:1 Portierung der kompletten 6502-Level-Entpackungs-Pipeline:
- $6021: Zonen-Reihenfolge-Mapping über $A3CC (Game Zone 1..12 -> Internal Index)
- $41D9..$428D: 62x32 ($3E x $20 = 1984 Tiles) Basis-Geometrie aus $9700 + internal_idx * $F8
  über die 16 2x2-Makroblock-Vorlagen ($6D02) und den Zonen-Fülltyp ($A2B8: 0=Boden, 25=Crumbly)
- $45DD & $4639..$468C: 11-Bit-Offset Item-Overlays ($A3F0, $A408, $A420) inkl. 3-Tile Warp-Gate [2, 8, 3]
- $623A..$628C: Spieler-Startposition 'I' (Tile 11) und Ausgang 'O' (Tile 22) aus $A2F4
- $6168..$61CF & $55D4..$55A5: Platzierung der 'R' (Tile 26) und 'r' (Tile 27) Einheiten aus $A438/$A450/$A468
- $47CB: Warp-Gate-Verbindungen aus $A3D8 & $A480
"""

import json
from pathlib import Path

MAP_WIDTH = 62
MAP_HEIGHT = 32
MAP_SIZE = MAP_WIDTH * MAP_HEIGHT  # 1984 ($07C0)


def unpack_zone(ram: bytes, game_zone_idx: int, difficulty: int = 0) -> dict:
    """
    Entpackt Game Zone (0..11 = Zone 1..12) für Option Level difficulty (0=Level 1, 1=Level 2, 2=Level 3).
    """
    internal_z = ram[0xA3CC + game_zone_idx]
    fill_tile = ram[0xA2B8 + internal_z]
    playfield = bytearray(MAP_SIZE)

    # 1. $41D9..$428D: 31 Makro-Spalten à 8 Bytes (16 Nibbles = 32 Zeilen) -> 62x32 Basis-Map
    a4 = 0x9700 + internal_z * 0xF8
    ac = 0
    for _ in range(31):
        a8 = ac
        for _ in range(8):
            b = ram[a4]
            a4 += 1
            for nib in ((b >> 4) & 0x0F, b & 0x0F):
                mb = [ram[0x6D02 + nib * 4 + i] for i in range(4)]
                mb = [fill_tile if x == 0 else x for x in mb]
                playfield[a8] = mb[0]
                playfield[a8 + 1] = mb[1]
                playfield[a8 + MAP_WIDTH] = mb[2]
                playfield[a8 + MAP_WIDTH + 1] = mb[3]
                a8 += MAP_WIDTH * 2
        ac += 2

    # 2. $45DD & $4639..$468C: Item-Overlays für gewählten Option Level (0, 1, 2)
    passes = [(0xA3F0, ram[0xA48C + internal_z])]
    if difficulty >= 1:
        passes.append((0xA408, ram[0xA498 + internal_z]))
    if difficulty >= 2:
        passes.append((0xA420, ram[0xA4A4 + internal_z]))

    plutonium_count = 0
    container_count = 0
    door_count = 0

    for table_base, count in passes:
        if count == 0:
            continue
        ptr_addr = table_base + internal_z * 2
        p = ram[ptr_addr] | (ram[ptr_addr + 1] << 8)
        for _ in range(count):
            b0 = ram[p]
            b1 = ram[p + 1]
            p += 2
            # $4639 sets $A4/$A5 = $0B00 every iteration!
            offset = b1 | ((b0 & 0x07) << 8)
            tile_id = (b0 >> 3) & 0x1F
            if offset < MAP_SIZE:
                playfield[offset] = tile_id
                if tile_id == 2 and offset + 2 < MAP_SIZE:
                    # $466E..$467A: Warp Gate [2, 8, 3] (▌ 1 ▐)
                    playfield[offset + 1] = 8
                    playfield[offset + 2] = 3

    # 3. $6168..$61CF & $55D4: 'R' (type 0 -> Tile 26) und 'r' (type 1 -> Tile 27) Einheiten
    entity_passes = [(0xA438, ram[0xA4B0 + internal_z])]
    if difficulty >= 1:
        entity_passes.append((0xA450, ram[0xA4BC + internal_z]))
    if difficulty >= 2:
        entity_passes.append((0xA468, ram[0xA4C8 + internal_z]))

    robots = []
    for etable_base, ecount in entity_passes:
        if ecount == 0:
            continue
        eptr = ram[etable_base + internal_z * 2] | (ram[etable_base + internal_z * 2 + 1] << 8)
        for _ in range(ecount):
            b0 = ram[eptr]
            b1 = ram[eptr + 1]
            eptr += 2
            etype = (b0 >> 3) & 0x1F
            eoff = b1 | ((b0 & 0x07) << 8)
            if eoff < MAP_SIZE:
                ex = eoff % MAP_WIDTH
                ey = eoff // MAP_WIDTH
                tile_code = 26 if etype == 0 else 27
                playfield[eoff] = tile_code
                robots.append({
                    "x": ex,
                    "y": ey,
                    "type": etype,
                    "dir": (etype & 1) * 2 + 1,
                    "speed": 2 if etype == 0 else 3,
                })

    # 4. $623A..$628C: Spieler-Startposition 'I' (Tile 11) und Ausgang 'O' (Tile 22) aus $A2F4
    start_rec_ptr = 0xA2F4 + difficulty * 72 + internal_z * 6
    start_offset = ram[start_rec_ptr] | (ram[start_rec_ptr + 1] << 8)
    player_hpos = ram[start_rec_ptr + 2]
    player_sprite = ram[start_rec_ptr + 3]
    exit_offset = ram[start_rec_ptr + 4] | (ram[start_rec_ptr + 5] << 8)

    player_start_x = start_offset % MAP_WIDTH
    player_start_y = start_offset // MAP_WIDTH
    exit_x = exit_offset % MAP_WIDTH
    exit_y = exit_offset // MAP_WIDTH

    if exit_offset < MAP_SIZE:
        playfield[exit_offset] = 22  # 'O' Exit tile ($44..$47)
    if start_offset < MAP_SIZE:
        playfield[start_offset] = 11  # 'I' Player Start pad ($98..$9B) per $6278: LDA #$0B : JSR $45AE

    # Count actual active Plutonium (6), Containers (16), and Doors (7)
    for t in playfield:
        if t == 6:
            plutonium_count += 1
        elif t == 16:
            container_count += 1
        elif t == 7:
            door_count += 1

    # 5. Warp-Gate-Verbindungen aus $A3D8 & $A480 ($47CB)
    warp_ptr = ram[0xA3D8 + internal_z * 2] | (ram[0xA3D8 + internal_z * 2 + 1] << 8)
    warp_cnt = ram[0xA480 + internal_z]
    warps = []
    for w in range(warp_cnt):
        p = warp_ptr + w * 6
        if p + 6 <= len(ram):
            s_off = ram[p] | (ram[p + 1] << 8)
            d_off = ram[p + 2] | (ram[p + 3] << 8)
            if s_off < MAP_SIZE and d_off < MAP_SIZE:
                warps.append({
                    "src_x": s_off % MAP_WIDTH,
                    "src_y": s_off // MAP_WIDTH,
                    "dst_x": d_off % MAP_WIDTH,
                    "dst_y": d_off // MAP_WIDTH,
                    "hpos": ram[p + 4],
                    "sprite": ram[p + 5],
                })

    # Per-zone color palette at $A2C4 + internal_z * 4 ($62E2..$62F3)
    colors = list(ram[0xA2C4 + internal_z * 4 : 0xA2C4 + (internal_z + 1) * 4])

    return {
        "zone": game_zone_idx + 1,
        "internal_zone_idx": internal_z,
        "difficulty": difficulty,
        "width": MAP_WIDTH,
        "height": MAP_HEIGHT,
        "fill_tile": fill_tile,
        "colors": colors,
        "plutonium_count": plutonium_count,
        "container_count": container_count,
        "door_count": door_count,
        "player_start": {
            "x": player_start_x,
            "y": player_start_y,
            "offset": start_offset,
            "hpos": player_hpos,
            "sprite": player_sprite,
        },
        "exit_pos": {
            "x": exit_x,
            "y": exit_y,
            "offset": exit_offset,
        },
        "warps": warps,
        "robots": robots,
        "playfield_bytes": list(playfield),
    }


def main():
    ram = open("build/ram_relocated.bin", "rb").read()
    results = []
    print("=== UNPACKING ALL 12 ZONES (62x32 TRUE GEOMETRY) ===")
    for z in range(12):
        info = unpack_zone(ram, z, difficulty=0)
        results.append(info)
        print(
            f"Zone {info['zone']:02d} (internal {info['internal_zone_idx']:2d}): "
            f"Fill={info['fill_tile']:2d}, Plutonium={info['plutonium_count']:2d}, "
            f"Containers={info['container_count']:2d}, Warps={len(info['warps']):2d}, "
            f"Start=({info['player_start']['x']:2d},{info['player_start']['y']:2d}), "
            f"Exit=({info['exit_pos']['x']:2d},{info['exit_pos']['y']:2d})"
        )

    out_file = Path("build/zones/all_zones_unpacked.json")
    out_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote all unpacked zones to {out_file}")


if __name__ == "__main__":
    main()
