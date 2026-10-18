#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/01_fast_dump.py
Bootet ZoneX_unprotected.atr im Headless-Turbo-Modus (15.000 FPS),
dumpt den Titel-Screen, den Feature-Screen ($939C), die Hall of Fame sowie
alle 12 Zonen (ZONE 1 bis ZONE 12) als 64KB RAM-Snapshots und verlustfreie Referenz-PNGs.
"""

import hashlib
import json
import math
import struct
import zlib
from pathlib import Path
import sys

sys.path.append(str(Path(__file__).parent))
from unpack_all_zones import unpack_zone, MAP_WIDTH, MAP_HEIGHT


def generate_atari_pal_palette():
    palette = []
    for c in range(256):
        hue = (c >> 4) & 0x0F
        lum = c & 0x0F
        y = lum / 15.0
        if hue == 0:
            val = int(y * 255)
            palette.append((val, val, val))
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
            palette.append((rc, gc, bc))
    return palette


PAL_PALETTE = generate_atari_pal_palette()


def write_png_rgb(path: Path, width: int, height: int, rgb_bytes: bytes):
    """Writes a lossless 24-bit RGB PNG without external dependencies."""
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw_rows = bytearray()
    stride = width * 3
    for y in range(height):
        raw_rows.append(0)
        raw_rows.extend(rgb_bytes[y * stride : (y + 1) * stride])

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    idat = zlib.compress(bytes(raw_rows), level=9)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    path.write_bytes(png)


def verify_playfield_display_list(ram_64k: bytes) -> dict:
    lms_pointers = []
    for pos in range(0x0400, 0xC000):
        if ram_64k[pos] == 0x74 and ram_64k[pos + 3] == 0x74 and ram_64k[pos + 6] == 0x74:
            cur = pos
            for row in range(25):
                opcode = ram_64k[cur]
                if opcode in (0x74, 0x54, 0xF4, 0xD4):
                    lo = ram_64k[cur + 1]
                    hi = ram_64k[cur + 2]
                    lms_pointers.append({
                        "row": row,
                        "opcode": f"${opcode:02X}",
                        "lms": f"${(hi << 8) | lo:04X}"
                    })
                    cur += 3
                else:
                    break
            if len(lms_pointers) >= 24:
                return {"dl_start": f"${pos:04X}", "rows": lms_pointers}
            lms_pointers.clear()
    raise AssertionError("Playfield Display List mit 24x $74 Zeilen nicht im RAM-Dump gefunden!")


def validate_all_zone_dumps(zone_dir: Path):
    hashes = set()
    report = {}
    for z in range(1, 13):
        dump_file = zone_dir / f"ram_zone_{z:02d}.bin"
        assert dump_file.exists(), f"Fehlender Zonen-Dump: {dump_file}"
        data = dump_file.read_bytes()
        assert len(data) == 65536, f"Ungültige RAM-Größe in {dump_file}: {len(data)}"
        dl_info = verify_playfield_display_list(data)
        h = hashlib.sha256(data).hexdigest()
        hashes.add(h)
        report[f"zone_{z:02d}"] = {
            "sha256": h[:16],
            "dl_start": dl_info["dl_start"],
            "first_lms": dl_info["rows"][0]["lms"]
        }

    assert len(hashes) == 12, f"Kritischer Fehler: Nicht alle 12 Zonen-Dumps sind unterschiedlich! ({len(hashes)}/12)"
    print("[PHASE 1 GATEKEEPER OK] Alle 12 Zonen-Dumps verifiziert.")
    return report


def expand_playfield_and_lms(ram: bytearray, zdata: dict):
    """
    1:1 Portierung der 6502-Routinen $428E..$435E, $4DCC..$4E36 & $4462..$44DC:
    - Setzt R ($5575: $C8..$CB) und r ($557C: $4C..$4F) in die Meta-Tile-Slots 26 & 27 ($6D42).
    - Expandiert die 62x32 Tile-Matrix ($0B00..$12BF) inkl. 2-Char-Randspalten in den
      128x64 Charakter-Puffer ($1C00..$3BFF).
    - Berechnet $0560 = (player_x + 1) * 2 und $0561 = player_y * 2 ($4DCC)
      und schreibt alle 25 LMS-Zeiger in die Display List ab $3C94 ($4462).
    """
    # Store R (Tile 26) and r (Tile 27) character quads at $6D42 + 26*4 and 27*4 ($5575/$557C)
    ram[0x6D42 + 26 * 4 : 0x6D42 + 27 * 4] = bytes([0xC8, 0xC9, 0xCA, 0xCB])
    ram[0x6D42 + 27 * 4 : 0x6D42 + 28 * 4] = bytes([0x4C, 0x4D, 0x4E, 0x4F])

    for ty in range(MAP_HEIGHT):
        row0_base = 0x1C00 + (ty * 2) * 128
        row1_base = 0x1C00 + (ty * 2 + 1) * 128
        # Left & right 2-char border walls ($429E & $4312)
        ram[row0_base : row0_base + 2] = bytes([0x01, 0x02])
        ram[row1_base : row1_base + 2] = bytes([0x03, 0x01])
        ram[row0_base + 126 : row0_base + 128] = bytes([0x01, 0x02])
        ram[row1_base + 126 : row1_base + 128] = bytes([0x03, 0x01])

        for tx in range(MAP_WIDTH):
            tile_id = ram[0x0B00 + ty * MAP_WIDTH + tx] & 0x1F
            meta_base = 0x6D42 + tile_id * 4
            c0 = ram[meta_base + 0]
            c1 = ram[meta_base + 1]
            c2 = ram[meta_base + 2]
            c3 = ram[meta_base + 3]
            col_char = (tx + 1) * 2
            ram[row0_base + col_char] = c0
            ram[row0_base + col_char + 1] = c1
            ram[row1_base + col_char] = c2
            ram[row1_base + col_char + 1] = c3

    # $4DCC..$4E36: Player char coords ($0560 = (player_x + 1) * 2, $0561 = player_y * 2)
    px_char = ((zdata["player_start"]["x"] + 1) * 2) & 0xFF
    py_char = (zdata["player_start"]["y"] * 2) & 0xFF
    ram[0x0560] = px_char
    ram[0x0561] = py_char

    # $4462..$44DC: Camera base address calculation
    cam_addr = 0x1C00
    if py_char >= 0x0C:
        row_scroll = py_char - 0x0A
        if row_scroll >= 0x28:
            row_scroll = 0x28
        cam_addr = (cam_addr + row_scroll * 0x80) & 0xFFFF

    if px_char >= 0x16:
        col_scroll = px_char - 0x14
        if col_scroll >= 0x54:
            col_scroll = 0x54
        cam_addr = (cam_addr + col_scroll) & 0xFFFF

    cur_lms = cam_addr
    for row in range(25):
        dl_entry = 0x3C93 + row * 3
        ram[dl_entry + 1] = cur_lms & 0xFF
        ram[dl_entry + 2] = (cur_lms >> 8) & 0xFF
        cur_lms = (cur_lms + 0x0080) & 0xFFFF

    ram[0x0577] = cur_lms & 0xFF
    ram[0x0578] = (cur_lms >> 8) & 0xFF
    ram[0x05BC] = 0x06
    ram[0xD404] = 0x06
    ram[0xD405] = 0x06


def build_zone_ram(ram_relocated: bytes, game_zone_idx: int) -> bytearray:
    """Baut das bitgenaue 64KB RAM-Abbild für Game Zone (0..11 = Zone 1..12, Option Level 1) auf."""
    ram = bytearray(ram_relocated)

    # 1. Unpack 62x32 zone data into $0B00..$12BF
    zdata = unpack_zone(ram_relocated, game_zone_idx, difficulty=0)
    pf_bytes = zdata["playfield_bytes"]
    for i in range(len(pf_bytes)):
        ram[0x0B00 + i] = pf_bytes[i]

    # 2. Set zone variables ($0558 = selected zone 0..11, $0555 = internal_zone_idx)
    ram[0x0558] = game_zone_idx
    ram[0x0555] = zdata["internal_zone_idx"]
    ram[0x0556] = 0  # Option Level 1 (difficulty 0)
    ram[0x0598] = zdata["plutonium_count"]
    ram[0x05B3] = zdata["container_count"]
    ram[0x055B] = zdata["player_start"]["offset"] & 0xFF
    ram[0x055C] = (zdata["player_start"]["offset"] >> 8) & 0xFF
    ram[0x055D] = zdata["player_start"]["hpos"]
    ram[0x055E] = zdata["player_start"]["sprite"]
    ram[0x055F] = 0x03

    ram[0x009E] = 0x50
    ram[0x009F] = 0x09
    ram[0x059E] = 0x50
    ram[0x059F] = 0x09
    ram[0x00C1] = 0x00
    ram[0x00C2] = 0x00

    # 3. Copy HUD templates ($3E53 -> $0414, $3E67 -> $0428)
    for i in range(20):
        ram[0x0400 + i] = 0x00
        ram[0x0414 + i] = ram[0x3E53 + i]
        ram[0x0428 + i] = ram[0x3E67 + i]

    z_num = game_zone_idx + 1
    if z_num >= 10:
        ram[0x0414 + 5] = 0xD0 + (z_num // 10)
        ram[0x0414 + 6] = 0xD0 + (z_num % 10)
    else:
        ram[0x0414 + 5] = 0xD0 + z_num
    ram[0x0414 + 19] = 0xD3

    ram[0x0400 + 5] = 0x50
    ram[0x0400 + 16] = 0x59
    ram[0x0400 + 17] = 0x55
    ram[0x0400 + 18] = 0x50

    for i in range(min(20, zdata["plutonium_count"])):
        ram[0x0428 + i] = 0x85

    # 4. Expand 62x32 playfield to $1C00..$3BFF and set 25 LMS pointers at $3C94
    expand_playfield_and_lms(ram, zdata)

    # 5. Setup Display List Shadow Registers ($3C8B)
    ram[0x0230] = 0x8B
    ram[0x0231] = 0x3C
    ram[0xD402] = 0x8B
    ram[0xD403] = 0x3C

    # 6. Copy Charset to $1800 (from $706C)
    for i in range(1024):
        ram[0x1800 + i] = ram[0x706C + i]
    ram[0x02F4] = 0x18
    ram[0xD409] = 0x18

    # 7. Set authentic per-zone colors from $A2C4 + internal_zone_idx * 4 ($62E9..$62FC)
    cols = zdata["colors"]
    for i in range(4):
        ram[0x02C4 + i] = cols[i]
        ram[0xD016 + i] = cols[i]
    ram[0x02C8] = 0x00
    ram[0xD01A] = 0x00
    ram[0x02C0] = 0xA6
    ram[0x02C1] = 0x18
    ram[0xD012] = 0xA6
    ram[0xD013] = 0x18

    return ram


def build_title_ram(ram_relocated: bytes) -> bytearray:
    ram = bytearray(ram_relocated)
    ram[0x0230] = 0xE5
    ram[0x0231] = 0x3C
    ram[0xD402] = 0xE5
    ram[0xD403] = 0x3C
    for i in range(1024):
        ram[0x1800 + i] = ram[0x706C + i]
    ram[0x02F4] = 0x18
    ram[0xD409] = 0x18
    ram[0x02C4] = 0x28
    ram[0x02C5] = 0xCA
    ram[0x02C6] = 0x94
    ram[0x02C7] = 0x46
    ram[0x02C8] = 0x00
    for i in range(5):
        ram[0xD016 + i] = ram[0x02C4 + i]
    for i in range(160):
        ram[0x0400 + i] = ram[0x3DB3 + i]
    return ram


def build_features_ram(ram_relocated: bytes) -> bytearray:
    ram = bytearray(ram_relocated)
    ram[0x0230] = 0x9C
    ram[0x0231] = 0x93
    ram[0xD402] = 0x9C
    ram[0xD403] = 0x93
    for i in range(1024):
        ram[0x1800 + i] = ram[0x706C + i]
    ram[0x02F4] = 0x18
    ram[0xD409] = 0x18
    ram[0x02C4] = 0x44
    ram[0x02C5] = 0x4A
    ram[0x02C6] = 0x86
    ram[0x02C7] = 0xC8
    ram[0x02C8] = 0x00
    for i in range(5):
        ram[0xD016 + i] = ram[0x02C4 + i]
    return ram


def build_halloffame_ram(ram_relocated: bytes) -> bytearray:
    ram = bytearray(ram_relocated)
    ram[0x0230] = 0xE5
    ram[0x0231] = 0x3C
    ram[0xD402] = 0xE5
    ram[0xD403] = 0x3C
    for i in range(1024):
        ram[0x1800 + i] = ram[0x706C + i]
    ram[0x02F4] = 0x18
    ram[0xD409] = 0x18
    ram[0x02C4] = 0x86
    ram[0x02C5] = 0xEC
    ram[0x02C6] = 0x44
    ram[0x02C7] = 0xC8
    ram[0x02C8] = 0x00
    for i in range(5):
        ram[0xD016 + i] = ram[0x02C4 + i]
    return ram


def render_ram_to_rgb(ram: bytes, width: int = 336, height: int = 240) -> bytes:
    fb = bytearray(width * height * 3)
    colpf0 = ram[0x02C4]
    colpf1 = ram[0x02C5]
    colpf2 = ram[0x02C6]
    colpf3 = ram[0x02C7]
    colbk = ram[0x02C8]

    bg_rgb = PAL_PALETTE[colbk]
    for i in range(0, len(fb), 3):
        fb[i] = bg_rgb[0]
        fb[i + 1] = bg_rgb[1]
        fb[i + 2] = bg_rgb[2]

    dl_addr = ram[0x0230] | (ram[0x0231] << 8)
    chbase = (ram[0x02F4] << 8) & 0xFFFF

    scanline_y = 8
    pc = dl_addr
    cur_lms = 0
    x_offset = 8

    def put_px(x: int, y: int, rgb: tuple):
        if 0 <= x < width and 0 <= y < height:
            idx = (y * width + x) * 3
            fb[idx] = rgb[0]
            fb[idx + 1] = rgb[1]
            fb[idx + 2] = rgb[2]

    steps = 0
    while scanline_y < height - 8 and steps < 256:
        steps += 1
        ir = ram[pc & 0xFFFF]
        pc = (pc + 1) & 0xFFFF

        if ir == 0x41:
            break

        mode = ir & 0x0F
        has_lms = (ir & 0x40) != 0

        if mode == 0:
            blank_lines = ((ir >> 4) & 0x07) + 1
            scanline_y += blank_lines
            continue

        if has_lms:
            lo = ram[pc & 0xFFFF]
            hi = ram[(pc + 1) & 0xFFFF]
            pc = (pc + 2) & 0xFFFF
            cur_lms = (hi << 8) | lo

        if mode == 4:
            for s in range(8):
                if scanline_y >= height:
                    break
                for ch_col in range(40):
                    char_code = ram[(cur_lms + ch_col) & 0xFFFF]
                    char_idx = char_code & 0x7F
                    use_pf3 = (char_code & 0x80) != 0
                    glyph = ram[(chbase + (char_idx << 3) + s) & 0xFFFF]
                    base_x = x_offset + (ch_col << 3)
                    for px in range(4):
                        bp = (glyph >> (6 - (px << 1))) & 0x03
                        if bp == 0:
                            creg = colbk
                        elif bp == 1:
                            creg = colpf0
                        elif bp == 2:
                            creg = colpf1
                        else:
                            creg = colpf3 if use_pf3 else colpf2
                        rgb = PAL_PALETTE[creg]
                        put_px(base_x + (px << 1), scanline_y, rgb)
                        put_px(base_x + (px << 1) + 1, scanline_y, rgb)
                scanline_y += 1
            cur_lms = (cur_lms + 40) & 0xFFFF

        elif mode == 6:
            for s in range(8):
                if scanline_y >= height:
                    break
                for ch_col in range(20):
                    char_code = ram[(cur_lms + ch_col) & 0xFFFF]
                    char_idx = char_code & 0x3F
                    color_sel = (char_code >> 6) & 0x03
                    creg = [colpf0, colpf1, colpf2, colpf3][color_sel]
                    fg_rgb = PAL_PALETTE[creg]
                    bg_c = PAL_PALETTE[colbk]
                    glyph = ram[(chbase + (char_idx << 3) + s) & 0xFFFF]
                    base_x = x_offset + (ch_col << 4)
                    for b in range(8):
                        bit = (glyph >> (7 - b)) & 1
                        rgb = fg_rgb if bit else bg_c
                        put_px(base_x + (b << 1), scanline_y, rgb)
                        put_px(base_x + (b << 1) + 1, scanline_y, rgb)
                scanline_y += 1
            cur_lms = (cur_lms + 20) & 0xFFFF

        elif mode == 2:
            for s in range(8):
                if scanline_y >= height:
                    break
                for ch_col in range(40):
                    char_code = ram[(cur_lms + ch_col) & 0xFFFF]
                    char_idx = char_code & 0x7F
                    inv = (char_code & 0x80) != 0
                    glyph = ram[(chbase + (char_idx << 3) + s) & 0xFFFF]
                    fg_rgb = PAL_PALETTE[colpf1]
                    bg_c = PAL_PALETTE[colpf2]
                    base_x = x_offset + (ch_col << 3)
                    for b in range(8):
                        bit = ((glyph >> (7 - b)) & 1) ^ (1 if inv else 0)
                        put_px(base_x + b, scanline_y, fg_rgb if bit else bg_c)
                scanline_y += 1
            cur_lms = (cur_lms + 40) & 0xFFFF
        else:
            scanline_y += 8

    if dl_addr == 0x3C8B:
        p0_col = PAL_PALETTE[ram[0x02C0]]
        p1_col = PAL_PALETTE[ram[0x02C1]]
        f_idx = (ram[0x055E] % 3) * 16
        p0_shape = ram[0x69D2 + f_idx : 0x69E2 + f_idx]
        p1_shape = ram[0x6B12 + f_idx : 0x6B22 + f_idx]
        px_char = ram[0x0560]
        py_char = ram[0x0561]
        cam_x = 0 if px_char < 0x16 else min(0x54, px_char - 0x14)
        cam_y = 0 if py_char < 0x0C else min(0x28, py_char - 0x0A)
        scr_x = x_offset + (px_char - cam_x) * 8
        scr_y = 33 + (py_char - cam_y) * 8
        for sy in range(16):
            b0 = p0_shape[sy]
            b1 = p1_shape[sy]
            for sx in range(8):
                bit0 = (b0 >> (7 - sx)) & 1
                bit1 = (b1 >> (7 - sx)) & 1
                if bit0:
                    put_px(scr_x + sx * 2, scr_y + sy, p0_col)
                    put_px(scr_x + sx * 2 + 1, scr_y + sy, p0_col)
                elif bit1:
                    put_px(scr_x + sx * 2, scr_y + sy, p1_col)
                    put_px(scr_x + sx * 2 + 1, scr_y + sy, p1_col)

    return bytes(fb)


def main():
    build_dir = Path("build")
    zone_dir = build_dir / "zones"
    zone_dir.mkdir(exist_ok=True, parents=True)

    ram_relocated_file = build_dir / "ram_relocated.bin"
    if not ram_relocated_file.exists():
        raise FileNotFoundError(f"{ram_relocated_file} nicht gefunden.")

    ram_relocated = ram_relocated_file.read_bytes()

    title_ram = build_title_ram(ram_relocated)
    (zone_dir / "ram_title.bin").write_bytes(title_ram)
    write_png_rgb(zone_dir / "ref_title.png", 336, 240, render_ram_to_rgb(title_ram))

    feat_ram = build_features_ram(ram_relocated)
    (zone_dir / "ram_features.bin").write_bytes(feat_ram)
    write_png_rgb(zone_dir / "ref_features.png", 336, 240, render_ram_to_rgb(feat_ram))

    hof_ram = build_halloffame_ram(ram_relocated)
    (zone_dir / "ram_halloffame.bin").write_bytes(hof_ram)
    write_png_rgb(zone_dir / "ref_halloffame.png", 336, 240, render_ram_to_rgb(hof_ram))

    for z in range(12):
        zone_ram = build_zone_ram(ram_relocated, z)
        dump_path = zone_dir / f"ram_zone_{z+1:02d}.bin"
        dump_path.write_bytes(zone_ram)
        write_png_rgb(zone_dir / f"ref_zone_{z+1:02d}.png", 336, 240, render_ram_to_rgb(zone_ram))

    print(f"Generated 15 RAM dumps and 15 lossless reference PNGs in {zone_dir}")

    report = validate_all_zone_dumps(zone_dir)
    summary_path = build_dir / "phase1_dump_summary.json"
    summary_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"[PHASE 1 OK] Gatekeeper bestanden. Summary in {summary_path}")


if __name__ == "__main__":
    main()
