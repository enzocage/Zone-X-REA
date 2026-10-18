#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/00_bootstrap_and_patch.py
Extrahiert ZoneX.atr, neutralisiert die 4-Stufen-Kopierschutz-Prüfsumme ($B8/$B9 -> $BA..$BD),
dekodiert die 16 Feature-Screen-Strings und generiert die Ghidra/Altirra-Symboltabelle.
"""

import json
import struct
import sys
from pathlib import Path

ATARI_SYMBOLS = {
    0x0014: "RTCLOK_LO",
    0x0097: "ZX_BCD_TEMP_97",
    0x009A: "ZX_PTR_9A_LO",
    0x009B: "ZX_PTR_9B_HI",
    0x009C: "ZX_PTR_9C_LO",
    0x009D: "ZX_PTR_9D_HI",
    0x009E: "ZX_TIMER_OR_SCORE_BCD_LO",
    0x009F: "ZX_TIMER_OR_SCORE_BCD_HI",
    0x00A0: "ZX_PTR_A0_LO",
    0x00A1: "ZX_PTR_A0_HI",
    0x00A4: "ZX_PTR_TILE_A4_LO",
    0x00A5: "ZX_PTR_TILE_A4_HI",
    0x00A8: "ZX_PTR_SCREEN_A8_LO",
    0x00A9: "ZX_PTR_SCREEN_A8_HI",
    0x00AA: "ZX_PTR_AA_LO",
    0x00AB: "ZX_PTR_AA_HI",
    0x00AC: "ZX_PTR_AC_LO",
    0x00AD: "ZX_PTR_AC_HI",
    0x00AE: "ZX_PTR_AE_LO",
    0x00AF: "ZX_PTR_AE_HI",
    0x00B0: "ZX_PTR_B0_LO",
    0x00B1: "ZX_PTR_B0_HI",
    0x00B2: "ZX_PTR_B2_LO",
    0x00B3: "ZX_PTR_B2_HI",
    0x00B4: "ZX_PTR_B4_LO",
    0x00B5: "ZX_PTR_B5_HI",
    0x00B6: "ZX_PTR_B6_LO",
    0x00B7: "ZX_PTR_B7_HI",
    0x00B8: "ZX_CHKSUM_PTR_LO",
    0x00B9: "ZX_CHKSUM_PTR_HI",
    0x00BA: "ZX_CHKSUM_RES_75F2",
    0x00BB: "ZX_CHKSUM_RES_4CFD",
    0x00BC: "ZX_CHKSUM_RES_4F12",
    0x00BD: "ZX_CHKSUM_RES_9211",
    0x00C1: "ZX_BCD_VAR_C1",
    0x00C2: "ZX_BCD_VAR_C2",
    0x0200: "VDSLST_LO",
    0x0201: "VDSLST_HI",
    0x0222: "VVBLKI_LO",
    0x0223: "VVBLKI_HI",
    0x0224: "VVBLKD_LO",
    0x0225: "VVBLKD_HI",
    0x022F: "SDMCTL",
    0x0230: "SDLSTL",
    0x0231: "SDLSTH",
    0x026F: "GPRIOR",
    0x0278: "STICK0",
    0x0284: "STRIG0",
    0x02C0: "PCOLR0",
    0x02C1: "PCOLR1",
    0x02C2: "PCOLR2",
    0x02C3: "PCOLR3",
    0x02C4: "COLOR0",
    0x02C5: "COLOR1",
    0x02C6: "COLOR2",
    0x02C7: "COLOR3",
    0x02C8: "COLOR4",
    0x02F4: "CHBAS",
    0x02FC: "CH",
    0xD000: "HPOSP0_M0PF",
    0xD001: "HPOSP1_M1PF",
    0xD002: "HPOSP2_M2PF",
    0xD003: "HPOSP3_M3PF",
    0xD004: "HPOSM0_P0PF",
    0xD005: "HPOSM1_P1PF",
    0xD006: "HPOSM2_P2PF",
    0xD007: "HPOSM3_P3PF",
    0xD008: "SIZEP0_M0PL",
    0xD009: "SIZEP1_M1PL",
    0xD00A: "SIZEP2_M2PL",
    0xD00B: "SIZEP3_M3PL",
    0xD00C: "SIZEM_P0PL",
    0xD00D: "GRAFP0_P1PL",
    0xD00E: "GRAFP1_P2PL",
    0xD00F: "GRAFP2_P3PL",
    0xD010: "GRAFP3_TRIG0",
    0xD011: "GRAFM_TRIG1",
    0xD012: "COLPM0",
    0xD013: "COLPM1",
    0xD014: "COLPM2",
    0xD015: "COLPM3",
    0xD016: "COLPF0",
    0xD017: "COLPF1",
    0xD018: "COLPF2",
    0xD019: "COLPF3",
    0xD01A: "COLBK",
    0xD01B: "PRIOR",
    0xD01D: "GRACTL",
    0xD01E: "HITCLR",
    0xD01F: "CONSOL",
    0xD200: "AUDF1_POT0",
    0xD201: "AUDC1_POT1",
    0xD202: "AUDF2_POT2",
    0xD203: "AUDC2_POT3",
    0xD204: "AUDF3_POT4",
    0xD205: "AUDC3_POT5",
    0xD206: "AUDF4_POT6",
    0xD207: "AUDC4_POT7",
    0xD208: "AUDCTL_ALLPOT",
    0xD209: "STIMER_KBCODE",
    0xD20A: "SKREST_RANDOM",
    0xD20E: "IRQEN_IRQST",
    0xD20F: "SKCTL_SKSTAT",
    0xD300: "PORTA",
    0xD301: "PORTB",
    0xD302: "PACTL",
    0xD303: "PBCTL",
    0xD400: "DMACTL",
    0xD401: "CHACTL",
    0xD402: "DLISTL",
    0xD403: "DLISTH",
    0xD404: "HSCROL",
    0xD405: "VSCROL",
    0xD407: "PMBASE",
    0xD409: "CHBASE",
    0xD40A: "WSYNC",
    0xD40B: "VCOUNT",
    0xD40E: "NMIEN",
    0xD40F: "NMIRES_NMIST",
}


def screencode_to_ascii(code: int) -> str:
    c = code & 0x7F
    if 0 <= c <= 63:
        return chr(c + 32)
    if 64 <= c <= 95:
        return chr(c - 64)
    return chr(c)


def patch_checksum_routine(buf: bytearray) -> int:
    checks = [
        bytes([0xA5, 0xBA, 0xC9, 0x43, 0xF0, 0x01, 0x68]),
        bytes([0xA5, 0xBB, 0xC9, 0xAC, 0xF0, 0x01, 0x68]),
        bytes([0xA5, 0xBC, 0xC9, 0x46, 0xF0, 0x01, 0x68]),
        bytes([0xA5, 0xBD, 0xC9, 0xB7, 0xF0, 0x01, 0x68]),
    ]
    count = 0
    for seq in checks:
        pos = buf.find(seq)
        if pos != -1:
            buf[pos + 6] = 0xEA  # PLA ($68) -> NOP ($EA)
            count += 1
    return count


def main():
    atr_file = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("ZoneX.atr")
    if not atr_file.exists():
        raise FileNotFoundError(f"Quell-Image {atr_file} wurde nicht gefunden.")

    build = Path("build")
    build.mkdir(exist_ok=True)
    (build / "rea_dossiers").mkdir(exist_ok=True)
    (build / "zones").mkdir(exist_ok=True)

    raw = bytearray(atr_file.read_bytes())
    magic, pars, sec_size, pars_hi = struct.unpack("<HHHB", raw[:7])
    assert magic == 0x0296, f"Ungültiger ATR-Header: ${magic:04X}"

    # 1. Kopierschutz-Prüfsumme für automatisierte Emulator-Tests neutralisieren
    unprot = bytearray(raw)
    patched = patch_checksum_routine(unprot)
    unprot_path = build / "ZoneX_unprotected.atr"
    unprot_path.write_bytes(unprot)

    # 2. Symboltabelle für Ghidra und Altirra schreiben
    sym_path = build / "atari_zonex_symbols.sym"
    with sym_path.open("w", encoding="utf-8") as f:
        for addr, name in sorted(ATARI_SYMBOLS.items()):
            f.write(f"{name} ${addr:04X}\n")

    # 3. Feature-Screen-Labels verifizieren
    raw_features = [
        b",!3%2", b"7!20", b"3,!-", b"!)2$//23", b"$//2", b"0,54/.)5-",
        b'"/.53', b",/#+", b"+%9", b",/#+%$", b"30!$%", b'#25-",9',
        b"-!43", b"#/.4!).%2", b'",/#+', b"4)-%"
    ]
    decoded_features = ["".join(screencode_to_ascii(b) for b in item) for item in raw_features]

    summary = {
        "sector_size": sec_size,
        "checksum_patches_applied": patched,
        "unprotected_atr": str(unprot_path),
        "symbols_file": str(sym_path),
        "verified_features": decoded_features,
    }
    (build / "bootstrap_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print("[PHASE 0 OK]", json.dumps(summary))


if __name__ == "__main__":
    main()
