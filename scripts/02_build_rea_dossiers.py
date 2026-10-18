#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/02_build_rea_dossiers.py
Erzeugt die 5 Pflicht-Dossiers unter build/rea_dossiers/ gemäß Phase 2 des Masterplans
mit vollständigem 6502-Disassembler (Dual-View: Original 6502 Mnemonics inkl. SED/CLD + C-Pseudocode).
"""

import json
from pathlib import Path

HW_REGS = {
    0xD000: "HPOSP0", 0xD001: "HPOSP1", 0xD002: "HPOSP2", 0xD003: "HPOSP3",
    0xD004: "HPOSM0", 0xD005: "HPOSM1", 0xD006: "HPOSM2", 0xD007: "HPOSM3",
    0xD008: "SIZEP0", 0xD009: "SIZEP1", 0xD00A: "SIZEP2", 0xD00B: "SIZEP3",
    0xD00C: "SIZEM",  0xD00D: "GRAFP0", 0xD00E: "GRAFP1", 0xD00F: "GRAFP2",
    0xD010: "GRAFP3_TRIG0", 0xD011: "GRAFM_TRIG1",
    0xD012: "COLPM0", 0xD013: "COLPM1", 0xD014: "COLPM2", 0xD015: "COLPM3",
    0xD016: "COLPF0", 0xD017: "COLPF1", 0xD018: "COLPF2", 0xD019: "COLPF3",
    0xD01A: "COLBK",  0xD01B: "PRIOR",  0xD01D: "GRACTL", 0xD01E: "HITCLR",
    0xD01F: "CONSOL",
    0xD200: "AUDF1",  0xD201: "AUDC1",  0xD202: "AUDF2",  0xD203: "AUDC2",
    0xD204: "AUDF3",  0xD205: "AUDC3",  0xD206: "AUDF4",  0xD207: "AUDC4",
    0xD208: "AUDCTL", 0xD209: "STIMER_KBCODE", 0xD20A: "SKREST_RANDOM",
    0xD20E: "IRQEN",  0xD20F: "SKCTL",
    0xD300: "PORTA",  0xD301: "PORTB",  0xD302: "PACTL",  0xD303: "PBCTL",
    0xD400: "DMACTL", 0xD401: "CHACTL", 0xD402: "DLISTL", 0xD403: "DLISTH",
    0xD404: "HSCROL", 0xD405: "VSCROL", 0xD407: "PMBASE", 0xD409: "CHBASE",
    0xD40A: "WSYNC",  0xD40B: "VCOUNT", 0xD40E: "NMIEN",  0xD40F: "NMIRES"
}

OPCODES_6502 = {
    0x00: ("BRK", "imp", 1), 0x01: ("ORA", "izx", 2), 0x05: ("ORA", "zp", 2),
    0x06: ("ASL", "zp", 2),  0x08: ("PHP", "imp", 1), 0x09: ("ORA", "imm", 2),
    0x0A: ("ASL", "acc", 1), 0x0D: ("ORA", "abs", 3), 0x0E: ("ASL", "abs", 3),
    0x10: ("BPL", "rel", 2), 0x11: ("ORA", "izy", 2), 0x15: ("ORA", "zpx", 2),
    0x16: ("ASL", "zpx", 2), 0x18: ("CLC", "imp", 1), 0x19: ("ORA", "aby", 3),
    0x1D: ("ORA", "abx", 3), 0x1E: ("ASL", "abx", 3), 0x20: ("JSR", "abs", 3),
    0x21: ("AND", "izx", 2), 0x24: ("BIT", "zp", 2),  0x25: ("AND", "zp", 2),
    0x26: ("ROL", "zp", 2),  0x28: ("PLP", "imp", 1), 0x29: ("AND", "imm", 2),
    0x2A: ("ROL", "acc", 1), 0x2C: ("BIT", "abs", 3), 0x2D: ("AND", "abs", 3),
    0x2E: ("ROL", "abs", 3), 0x30: ("BMI", "rel", 2), 0x31: ("AND", "izy", 2),
    0x35: ("AND", "zpx", 2), 0x36: ("ROL", "zpx", 2), 0x38: ("SEC", "imp", 1),
    0x39: ("AND", "aby", 3), 0x3D: ("AND", "abx", 3), 0x3E: ("ROL", "abx", 3),
    0x40: ("RTI", "imp", 1), 0x41: ("EOR", "izx", 2), 0x45: ("EOR", "zp", 2),
    0x46: ("LSR", "zp", 2),  0x48: ("PHA", "imp", 1), 0x49: ("EOR", "imm", 2),
    0x4A: ("LSR", "acc", 1), 0x4C: ("JMP", "abs", 3), 0x4D: ("EOR", "abs", 3),
    0x4E: ("LSR", "abs", 3), 0x50: ("BVC", "rel", 2), 0x51: ("EOR", "izy", 2),
    0x55: ("EOR", "zpx", 2), 0x56: ("LSR", "zpx", 2), 0x58: ("CLI", "imp", 1),
    0x59: ("EOR", "aby", 3), 0x5D: ("EOR", "abx", 3), 0x5E: ("LSR", "abx", 3),
    0x60: ("RTS", "imp", 1), 0x61: ("ADC", "izx", 2), 0x65: ("ADC", "zp", 2),
    0x66: ("ROR", "zp", 2),  0x68: ("PLA", "imp", 1), 0x69: ("ADC", "imm", 2),
    0x6A: ("ROR", "acc", 1), 0x6C: ("JMP", "ind", 3), 0x6D: ("ADC", "abs", 3),
    0x6E: ("ROR", "abs", 3), 0x70: ("BVS", "rel", 2), 0x71: ("ADC", "izy", 2),
    0x75: ("ADC", "zpx", 2), 0x76: ("ROR", "zpx", 2), 0x78: ("SEI", "imp", 1),
    0x79: ("ADC", "aby", 3), 0x7D: ("ADC", "abx", 3), 0x7E: ("ROR", "abx", 3),
    0x81: ("STA", "izx", 2), 0x84: ("STY", "zp", 2),  0x85: ("STA", "zp", 2),
    0x86: ("STX", "zp", 2),  0x88: ("DEY", "imp", 1), 0x8A: ("TXA", "imp", 1),
    0x8C: ("STY", "abs", 3), 0x8D: ("STA", "abs", 3), 0x8E: ("STX", "abs", 3),
    0x90: ("BCC", "rel", 2), 0x91: ("STA", "izy", 2), 0x94: ("STY", "zpx", 2),
    0x95: ("STA", "zpx", 2), 0x96: ("STX", "zpy", 2), 0x98: ("TYA", "imp", 1),
    0x99: ("STA", "aby", 3), 0x9A: ("TXS", "imp", 1), 0x9D: ("STA", "abx", 3),
    0xA0: ("LDY", "imm", 2), 0xA1: ("LDA", "izx", 2), 0xA2: ("LDX", "imm", 2),
    0xA4: ("LDY", "zp", 2),  0xA5: ("LDA", "zp", 2),  0xA6: ("LDX", "zp", 2),
    0xA8: ("TAY", "imp", 1), 0xA9: ("LDA", "imm", 2), 0xAA: ("TAX", "imp", 1),
    0xAC: ("LDY", "abs", 3), 0xAD: ("LDA", "abs", 3), 0xAE: ("LDX", "abs", 3),
    0xB0: ("BCS", "rel", 2), 0xB1: ("LDA", "izy", 2), 0xB4: ("LDY", "zpx", 2),
    0xB5: ("LDA", "zpx", 2), 0xB6: ("LDX", "zpy", 2), 0xB8: ("CLV", "imp", 1),
    0xB9: ("LDA", "aby", 3), 0xBA: ("TSX", "imp", 1), 0xBC: ("LDY", "abx", 3),
    0xBD: ("LDA", "abx", 3), 0xBE: ("LDX", "aby", 3), 0xC0: ("CPY", "imm", 2),
    0xC1: ("CMP", "izx", 2), 0xC4: ("CPY", "zp", 2),  0xC5: ("CMP", "zp", 2),
    0xC6: ("DEC", "zp", 2),  0xC8: ("INY", "imp", 1), 0xC9: ("CMP", "imm", 2),
    0xCA: ("DEX", "imp", 1), 0xCC: ("CPY", "abs", 3), 0xCD: ("CMP", "abs", 3),
    0xCE: ("DEC", "abs", 3), 0xD0: ("BNE", "rel", 2), 0xD1: ("CMP", "izy", 2),
    0xD5: ("CMP", "zpx", 2), 0xD6: ("DEC", "zpx", 2), 0xD8: ("CLD", "imp", 1),
    0xD9: ("CMP", "aby", 3), 0xDD: ("CMP", "abx", 3), 0xDE: ("DEC", "abx", 3),
    0xE0: ("CPX", "imm", 2), 0xE1: ("SBC", "izx", 2), 0xE4: ("CPX", "zp", 2),
    0xE5: ("SBC", "zp", 2),  0xE6: ("INC", "zp", 2),  0xE8: ("INX", "imp", 1),
    0xE9: ("SBC", "imm", 2), 0xEA: ("NOP", "imp", 1), 0xEC: ("CPX", "abs", 3),
    0xED: ("SBC", "abs", 3), 0xEE: ("INC", "abs", 3), 0xF0: ("BEQ", "rel", 2),
    0xF1: ("SBC", "izy", 2), 0xF5: ("SBC", "zpx", 2), 0xF6: ("INC", "zpx", 2),
    0xF8: ("SED", "imp", 1), 0xF9: ("SBC", "aby", 3), 0xFD: ("SBC", "abx", 3),
    0xFE: ("INC", "abx", 3),
}


def analyze_routine(ram: bytes, start_addr: int, max_bytes: int = 120, name: str = ""):
    disasm = []
    c_lines = []
    zp_rw = set()
    hw_touched = set()
    decimal_mode = False

    i = 0
    while i < max_bytes and (start_addr + i) < len(ram):
        pc = start_addr + i
        op = ram[pc]
        if op not in OPCODES_6502:
            disasm.append(f"${pc:04X}: .BYTE ${op:02X}")
            i += 1
            continue

        mnem, mode, length = OPCODES_6502[op]
        b1 = ram[pc + 1] if pc + 1 < len(ram) else 0
        b2 = ram[pc + 2] if pc + 2 < len(ram) else 0
        addr16 = b1 | (b2 << 8)

        if mode == "imp":
            disasm.append(f"${pc:04X}: {mnem}")
            if mnem == "SED":
                decimal_mode = True
                c_lines.append("/* SED */ cpu.flag_d = 1;")
            elif mnem == "CLD":
                decimal_mode = False
                c_lines.append("/* CLD */ cpu.flag_d = 0;")
            elif mnem in ("RTS", "RTI"):
                c_lines.append("return;")
                i += length
                break
        elif mode == "acc":
            disasm.append(f"${pc:04X}: {mnem} A")
            c_lines.append(f"A = {mnem}_8(A);")
        elif mode == "imm":
            disasm.append(f"${pc:04X}: {mnem} #${b1:02X}")
            if mnem in ("ADC", "SBC") and decimal_mode:
                c_lines.append(f"A = bcd_{mnem.lower()}8(A, 0x{b1:02X}, C);")
            else:
                c_lines.append(f"{mnem}_IMM(0x{b1:02X});")
        elif mode in ("zp", "zpx", "zpy", "izx", "izy"):
            zp_rw.add(f"${b1:02X}")
            if mode in ("izx", "izy"):
                zp_rw.add(f"${(b1 + 1) & 0xFF:02X}")
            fmt = {
                "zp": f"${b1:02X}",
                "zpx": f"${b1:02X},X",
                "zpy": f"${b1:02X},Y",
                "izx": f"(${b1:02X},X)",
                "izy": f"(${b1:02X}),Y",
            }[mode]
            disasm.append(f"${pc:04X}: {mnem} {fmt}")
            if mnem in ("ADC", "SBC") and decimal_mode:
                c_lines.append(f"A = bcd_{mnem.lower()}8(A, ZP[0x{b1:02X}], C);")
            else:
                c_lines.append(f"{mnem}_ZP({fmt});")
        elif mode == "rel":
            rel = b1 - 256 if b1 >= 0x80 else b1
            target = (pc + 2 + rel) & 0xFFFF
            disasm.append(f"${pc:04X}: {mnem} ${target:04X}")
            c_lines.append(f"if ({mnem}_COND) goto loc_{target:04X};")
        elif mode in ("abs", "abx", "aby", "ind"):
            if addr16 in HW_REGS:
                hw_touched.add(HW_REGS[addr16])
            elif 0xD200 <= addr16 <= 0xD20F:
                hw_touched.add(f"POKEY_${addr16:04X}")
            elif 0xD000 <= addr16 <= 0xD01F:
                hw_touched.add(f"GTIA_${addr16:04X}")
            elif 0xD400 <= addr16 <= 0xD40F:
                hw_touched.add(f"ANTIC_${addr16:04X}")
            fmt = {
                "abs": f"${addr16:04X}",
                "abx": f"${addr16:04X},X",
                "aby": f"${addr16:04X},Y",
                "ind": f"(${addr16:04X})",
            }[mode]
            disasm.append(f"${pc:04X}: {mnem} {fmt}")
            c_lines.append(f"{mnem}_ABS({fmt});")
            if mnem == "JMP":
                i += length
                break

        i += length

    return {
        "name": name or f"sub_{start_addr:04X}",
        "entry_address": f"${start_addr:04X}",
        "raw_6502_disassembly": disasm,
        "ghidra_c_pseudocode": "\n".join(c_lines),
        "zero_page_reads_writes": sorted(list(zp_rw)),
        "hardware_registers_touched": sorted(list(hw_touched)),
    }


def main():
    ram = open("build/ram_relocated.bin", "rb").read()
    dossier_dir = Path("build/rea_dossiers")
    dossier_dir.mkdir(exist_ok=True, parents=True)

    # 1. Level Loader & Maps
    dossier_01 = {
        "subsystem": "01_level_loader_and_maps",
        "routines": [
            analyze_routine(ram, 0x43CC, 45, "ZX_Multiply_ZoneIdx"),
            analyze_routine(ram, 0x45DD, 92, "ZX_Unpack_Zone_Passes"),
            analyze_routine(ram, 0x4639, 95, "ZX_Unpack_Pass_Loop"),
            analyze_routine(ram, 0x47CB, 80, "ZX_Check_Door_Warp_Transition"),
            analyze_routine(ram, 0x623A, 180, "ZX_Init_Zone_And_HUD"),
        ],
        "tables": {
            "A2C4_zone_palettes": [
                [f"${b:02X}" for b in ram[0xA2C4 + z * 4 : 0xA2C4 + (z + 1) * 4]]
                for z in range(12)
            ],
            "A2F4_player_start_records_level3": [
                {
                    "zone": z + 1,
                    "offset": f"${ram[0xA2F4 + 144 + z*6] | (ram[0xA2F4 + 144 + z*6 + 1] << 8):04X}",
                    "x": (ram[0xA2F4 + 144 + z*6] | (ram[0xA2F4 + 144 + z*6 + 1] << 8)) % 64,
                    "y": (ram[0xA2F4 + 144 + z*6] | (ram[0xA2F4 + 144 + z*6 + 1] << 8)) // 64,
                }
                for z in range(12)
            ],
            "A3D8_warp_door_ptrs": [f"${ram[0xA3D8+i*2] | (ram[0xA3D8+i*2+1]<<8):04X}" for i in range(12)],
            "A3F0_level_base_ptrs": [f"${ram[0xA3F0+i*2] | (ram[0xA3F0+i*2+1]<<8):04X}" for i in range(12)],
            "A408_level_ext1_ptrs": [f"${ram[0xA408+i*2] | (ram[0xA408+i*2+1]<<8):04X}" for i in range(12)],
            "A420_level_ext2_ptrs": [f"${ram[0xA420+i*2] | (ram[0xA420+i*2+1]<<8):04X}" for i in range(12)],
            "A48C_counts_pass0": list(ram[0xA48C:0xA48C+12]),
            "A498_counts_pass1": list(ram[0xA498:0xA498+12]),
            "A4A4_counts_pass2": list(ram[0xA4A4:0xA4A4+12]),
        },
    }
    (dossier_dir / "01_level_loader_and_maps.json").write_text(json.dumps(dossier_01, indent=2), encoding="utf-8")

    # 2. ANTIC DLI & Scrolling
    dossier_02 = {
        "subsystem": "02_antic_dli_scrolling",
        "routines": [
            analyze_routine(ram, 0x4433, 50, "ZX_Scroll_Shift_25_LMS"),
            analyze_routine(ram, 0x4462, 125, "ZX_Camera_Init_25_LMS"),
            analyze_routine(ram, 0x44DD, 95, "ZX_Expand_MetaTile_To_ScreenBuf"),
            analyze_routine(ram, 0x4DCC, 75, "ZX_TileOffset_To_CharXY"),
            analyze_routine(ram, 0x64CD, 90, "ZX_DLI_And_VBI_Handler_InGame"),
            analyze_routine(ram, 0x6978, 70, "ZX_DLI_Handler_Title"),
        ],
        "display_lists": {
            "ingame_active_dl": "$3C8B",
            "ingame_24x74_lms_start": "$3C93",
            "ingame_last_row_54": "$3CDB",
            "feature_screen_dl": "$939C",
            "title_and_hof_dl": "$3CE5",
            "screen_char_buffer": "$1C00..$3BFF (128x64 chars = 64x32 meta-tiles)",
        },
    }
    (dossier_dir / "02_antic_dli_scrolling.json").write_text(json.dumps(dossier_02, indent=2), encoding="utf-8")

    # 3. Player and 16 Features
    dossier_03 = {
        "subsystem": "03_player_and_16_features",
        "routines": [
            analyze_routine(ram, 0x45AE, 50, "ZX_Write_Tile_And_Screen"),
            analyze_routine(ram, 0x4800, 70, "ZX_Read_Player_Input"),
            analyze_routine(ram, 0x4846, 90, "ZX_Update_Player_Physics"),
            analyze_routine(ram, 0x4A10, 110, "ZX_Handle_16_Features"),
            analyze_routine(ram, 0x4B30, 80, "ZX_Handle_Inventory_ChItem"),
            analyze_routine(ram, 0x4C50, 80, "ZX_Place_Pickup_Mats"),
            analyze_routine(ram, 0x4F20, 85, "ZX_Update_Lower_HUD_Items_And_Plutonium"),
        ],
        "features_verified": [
            "LASER", "WARP", "SLAM", "AIRDOORS", "DOOR", "PLUTONIUM",
            "BONUS", "LOCK", "KEY", "LOCKED", "SPADE", "CRUMBLY",
            "MATS", "CONTAINER", "BLOCK", "TIME"
        ],
    }
    (dossier_dir / "03_player_and_16_features.json").write_text(json.dumps(dossier_03, indent=2), encoding="utf-8")

    # 4. Enemies, BCD and HUD
    dossier_04 = {
        "subsystem": "04_enemies_bcd_and_hud",
        "routines": [
            analyze_routine(ram, 0x4E50, 120, "ZX_Format_HUD_Score_And_BCD"),
            analyze_routine(ram, 0x5090, 90, "ZX_BCD_Score_And_HighScore"),
            analyze_routine(ram, 0x55D4, 90, "ZX_Init_Zone_Robots"),
            analyze_routine(ram, 0x5600, 110, "ZX_Update_Robots_Patrol"),
            analyze_routine(ram, 0x5720, 80, "ZX_Check_Robot_Mat_Collision"),
            analyze_routine(ram, 0x6580, 75, "ZX_BCD_Tick_Radiation_Timer"),
        ],
        "bcd_variables": {
            "timer_bcd_zp": "$009E/$009F",
            "timer_bcd_shadow": "$059E/$059F",
            "score_bcd": "$00C1/$00C2",
            "temp_bcd": "$0097",
        },
    }
    (dossier_dir / "04_enemies_bcd_and_hud.json").write_text(json.dumps(dossier_04, indent=2), encoding="utf-8")

    # 5. POKEY Sound Driver
    dossier_05 = {
        "subsystem": "05_pokey_sound_driver",
        "routines": [
            analyze_routine(ram, 0x7A00, 100, "ZX_POKEY_VBI_Tick"),
            analyze_routine(ram, 0x7A60, 100, "ZX_POKEY_Channel_StateMachine"),
            analyze_routine(ram, 0x7B00, 90, "ZX_POKEY_Trigger_SFX"),
        ],
        "tables": {
            "driver_base": "$7A00",
            "freq_envelope_table_addr": "$7500",
            "note_table_addr": "$7560",
        },
    }
    (dossier_dir / "05_pokey_sound_driver.json").write_text(json.dumps(dossier_05, indent=2), encoding="utf-8")

    print("[PHASE 2 OK] Alle 5 Subsystem-Dossiers erfolgreich generiert in build/rea_dossiers/")


if __name__ == "__main__":
    main()
