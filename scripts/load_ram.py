#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/load_ram.py
Rekonstruiert das exakte Speicherabbild nach dem Laden der Atari-Binärchunks aus dem ATR.
"""

from pathlib import Path

def main():
    raw = open("build/ZoneX_unprotected.atr", "rb").read()[16:]
    stream = raw[384:]
    ram = bytearray(65536)
    pos = 0
    chunks = []
    while pos < len(stream) - 4:
        if stream[pos] == 0xFF and stream[pos+1] == 0xFF:
            pos += 2
        if pos + 4 > len(stream):
            break
        start = stream[pos] | (stream[pos+1] << 8)
        end = stream[pos+2] | (stream[pos+3] << 8)
        pos += 4
        if end < start:
            break
        length = end - start + 1
        data = stream[pos:pos+length]
        pos += length
        chunks.append((start, end, length))
        for i in range(min(len(data), 65536 - start)):
            ram[start + i] = data[i]

    out_path = Path("build/ram_loaded_image.bin")
    out_path.write_bytes(ram)
    print(f"Loaded {len(chunks)} chunks into RAM image: {len(ram)} bytes.")
    for s, e, l in chunks:
        print(f"  Chunk: 0x{s:04X} .. 0x{e:04X} ({l} bytes)")

if __name__ == "__main__":
    main()
