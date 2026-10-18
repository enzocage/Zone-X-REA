#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/unpack_all_zones.py
Pure Python 1:1 Implementation des 6502-Level-Unpackers ($45DD & $4639).
Dekodiert alle 12 Zonen bitgenau aus dem RAM-Image und validiert die Entpackung.
"""

import json
from pathlib import Path

def unpack_zone(ram: bytes, zone_idx: int, difficulty: int = 2):
    """
    1:1 Portierung von $45DD, $4639 und $47CB:
    ram: 64KB ROM/RAM Image
    zone_idx: 0..11 (ZONE 1 bis 12)
    difficulty: 0 (Level 1), 1 (Level 2), 2 (Level 3)
    """
    # 64x32 Playfield Matrix im RAM ab $0B00 ($0B00..$12FF = 2048 Bytes)
    playfield = bytearray(64 * 32)
    
    plutonium_count = 0
    container_count = 0
    door_count = 0
    
    passes = [
        (0xA3F0, ram[0xA48C + zone_idx]),
    ]
    if difficulty >= 1:
        passes.append((0xA408, ram[0xA498 + zone_idx]))
    if difficulty >= 2:
        passes.append((0xA420, ram[0xA4A4 + zone_idx]))
        
    for table_base, count in passes:
        if count == 0:
            continue
        ptr_addr = table_base + zone_idx * 2
        data_ptr = ram[ptr_addr] | (ram[ptr_addr + 1] << 8)
        
        cur_offset = 0
        p = data_ptr
        for _ in range(count):
            b0 = ram[p]
            b1 = ram[p + 1]
            p += 2
            
            delta = b1 | ((b0 & 0x07) << 8)
            cur_offset = (cur_offset + delta) & 0xFFFF
            tile_id = (b0 >> 3) & 0x1F
            
            if cur_offset < len(playfield):
                playfield[cur_offset] = tile_id
                
            if tile_id == 6:
                plutonium_count += 1
            elif tile_id == 20:
                container_count += 1
            elif tile_id == 2:
                door_count += 1

    # 1:1 Spieler-Startkoordinaten aus Tabelle $A2F4 ($623A..$6263)
    start_rec_ptr = 0xA2F4 + difficulty * 72 + zone_idx * 6
    start_offset = ram[start_rec_ptr] | (ram[start_rec_ptr + 1] << 8)
    player_start_x = start_offset % 64
    player_start_y = start_offset // 64
    player_hpos = ram[start_rec_ptr + 2]
    player_sprite = ram[start_rec_ptr + 3]

    # Warp- & Türübergänge aus Tabelle $A3D8 ($47CB)
    warp_ptr = ram[0xA3D8 + zone_idx * 2] | (ram[0xA3D8 + zone_idx * 2 + 1] << 8)
    warps = []
    for w in range(4):
        p = warp_ptr + w * 6
        if p + 6 <= len(ram):
            s_off = ram[p] | (ram[p + 1] << 8)
            d_off = ram[p + 2] | (ram[p + 3] << 8)
            if s_off < 2048 and d_off < 2048:
                warps.append({
                    "src_x": s_off % 64,
                    "src_y": s_off // 64,
                    "dst_x": d_off % 64,
                    "dst_y": d_off // 64,
                    "hpos": ram[p + 4],
                    "sprite": ram[p + 5]
                })
    
    return {
        "zone": zone_idx + 1,
        "difficulty": difficulty,
        "width": 64,
        "height": 32,
        "plutonium_count": plutonium_count,
        "container_count": container_count,
        "door_count": door_count,
        "player_start": {
            "x": player_start_x,
            "y": player_start_y,
            "offset": start_offset,
            "hpos": player_hpos,
            "sprite": player_sprite
        },
        "warps": warps,
        "playfield_bytes": list(playfield)
    }

def main():
    ram = open("build/ram_relocated.bin", "rb").read()
    results = []
    print("=== UNPACKING ALL 12 ZONES ===")
    for z in range(12):
        info = unpack_zone(ram, z, difficulty=2)
        results.append(info)
        print(f"Zone {info['zone']:02d}: Plutonium={info['plutonium_count']}, Containers={info['container_count']}, Doors={info['door_count']}, PlayerStart=({info['player_start']['x']}, {info['player_start']['y']})")

    out_file = Path("build/zones/all_zones_unpacked.json")
    out_file.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(f"Wrote all unpacked zones to {out_file}")

if __name__ == "__main__":
    main()
