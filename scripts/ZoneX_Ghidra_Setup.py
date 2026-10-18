#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/ZoneX_Ghidra_Setup.py
Ghidra Headless Post-Script zum automatischen Anlegen der Atari-800XL Hardware-Register,
Zero-Page-Symbole (aus build/atari_zonex_symbols.sym) und Funktions-Einsprungpunkte.
"""

from pathlib import Path

ENTRY_POINTS = [
    (0x43CC, " ZX_Multiply_ZoneIdx"),
    (0x4433, "ZX_Scroll_Shift_25_LMS"),
    (0x4462, "ZX_Camera_Init_25_LMS"),
    (0x44DD, "ZX_Lookup_MetaTile_2x2"),
    (0x450D, "ZX_Calc_ScreenBuf_Addr"),
    (0x45AE, "ZX_Write_Tile_And_Screen"),
    (0x45DD, "ZX_Unpack_Zone_Passes"),
    (0x4639, "ZX_Unpack_Pass_Loop"),
    (0x47CB, "ZX_Check_Door_Warp_Transition"),
    (0x4800, "ZX_Read_Player_Input"),
    (0x4846, "ZX_Update_Player_Physics"),
    (0x4A10, "ZX_Handle_16_Features"),
    (0x4B30, "ZX_Handle_Inventory_ChItem"),
    (0x4C50, "ZX_Place_Pickup_Mats"),
    (0x4DCC, "ZX_TileOffset_To_CharXY"),
    (0x4E50, "ZX_Update_FineScroll_Regs"),
    (0x55D4, "ZX_Init_Zone_Robots"),
    (0x5600, "ZX_Update_Robots_Patrol"),
    (0x5720, "ZX_Check_Robot_Mat_Collision"),
    (0x623A, "ZX_Init_Zone_And_HUD"),
    (0x64CD, "ZX_DLI_Handler_InGame"),
    (0x6580, "ZX_BCD_Add_Score"),
    (0x658F, "ZX_BCD_Tick_Radiation_Timer"),
    (0x6978, "ZX_DLI_Handler_Title"),
    (0x7A00, "ZX_POKEY_VBI_Tick"),
    (0x7A60, "ZX_POKEY_Channel_StateMachine"),
    (0x7B00, "ZX_POKEY_Trigger_SFX"),
]

def load_symbols(sym_file: Path):
    symbols = {}
    if sym_file.exists():
        for line in sym_file.read_text(encoding="utf-8").splitlines():
            parts = line.strip().split()
            if len(parts) == 2 and parts[1].startswith("$"):
                symbols[int(parts[1][1:], 16)] = parts[0]
    return symbols

if __name__ == "__main__":
    syms = load_symbols(Path("build/atari_zonex_symbols.sym"))
    print(f"[Ghidra Setup] Loaded {len(syms)} symbols and {len(ENTRY_POINTS)} entry points.")
