# Zone X (Gremlin Graphics, 1985) — Forensic Memory Map & Execution Tracker

## Master-Checkliste (Sequenzieller Abarbeitungs-Tracker)

- [x] **Schritt 1:** `python scripts/00_bootstrap_and_patch.py ZoneX.atr` ausführen $\rightarrow$ Prüfen, ob `build/ZoneX_unprotected.atr` ($4/4$ Kopierschutz-Patches) und `build/atari_zonex_symbols.sym` erstellt wurden.
- [x] **Schritt 2:** `python scripts/01_fast_dump.py` (bzw. `Altirra64 /warp`) ausführen $\rightarrow$ Prüfen, ob `ram_title.bin`, `ram_features.bin`, `ram_halloffame.bin` und `ram_zone_01.bin`..`12.bin` inkl. Referenz-PNGs vorliegen und der Gatekeeper-Check (`24x $74` LMS-Zeilen, 12 unterschiedliche Zonen-Hashes) bestanden ist.
- [x] **Schritt 3:** Ghidra Headless Projekt mit `ZoneX_Ghidra_Setup.py` initialisieren und über `morluto/rea` alle 5 JSON-Dossiers unter `build/rea_dossiers/` generieren.
- [x] **Schritt 4:** `MEMORY_MAP.md` mit allen exakten Einsprungadressen, Zero-Page-Variablen und Daten-Tabellen aus den 5 Dossiers befüllen.
- [x] **Schritt 5:** `python scripts/03_extract_assets.py` ausführen $\rightarrow$ `zonex-web/assets/zonex_rom_bundle.json` generieren und auf Vollständigkeit prüfen (Fonts, Meta-Tiles, Sprites, 12 Zonen-Maps, POKEY-Tabellen, PAL-Palette).
- [x] **Schritt 6:** Implementierung von `zonex-web/` (HTML, CSS, `antic_gtia.js`, `pokey_worklet.js`, `pokey_driver.js`, `memory_state.js`, `zone_loader.js`, `player_physics.js`, `feature_state_machine.js`, `robot_ai.js`, `screens.js`, `lockstep_api.js`).
- [x] **Schritt 7:** `python scripts/04_verify_oracles.py` starten und alle gemeldeten Pixel-, State- oder Audio-Differenzen iterativ beheben, bis `ALL 3 ORACLES PASSED (0 ERRORS)` ausgegeben wird.

---

## 1. Zero-Page Variables (`$0000`–`$00FF`)

| Address | Symbol | Purpose |
| :--- | :--- | :--- |
| `$0014` | `RTCLOK_LO` | Atari OS Real-Time Clock (50 Hz PAL frame counter) |
| `$0097` | `ZX_BCD_TEMP_97` | Temporary BCD arithmetic register |
| `$009A`–`$009B` | `ZX_PTR_9A_LO/HI` | Entity / working pointer |
| `$009C`–`$009D` | `ZX_PTR_9C_LO/HI` | Timer / working pointer |
| `$009E`–`$009F` | `ZX_TIMER_OR_SCORE_BCD_LO/HI` | BCD accumulator for radiation countdown / score |
| `$00A0`–`$00A1` | `ZX_PTR_A0_LO/HI` | Tile map pointer |
| `$00A4`–`$00A5` | `ZX_PTR_TILE_A4_LO/HI` | Tile collision / map lookup pointer (`$0B00 + offset`) |
| `$00A8`–`$00A9` | `ZX_PTR_SCREEN_A8_LO/HI` | Meta-tile lookup pointer (`$6D42 + tile_id * 4`) |
| `$00AA`–`$00AB` | `ZX_PTR_AA_LO/HI` | Playfield character screen buffer pointer (`$1C00 + offset`) |
| `$00AC`–`$00AD` | `ZX_PTR_AC_LO/HI` | Level / table pointer |
| `$00AE`–`$00AF` | `ZX_PTR_AE_LO/HI` | HUD / Sprite pointer |
| `$00B0`–`$00B7` | `ZX_PTR_B0..B7` | Entity, Zone Start, and Robot table pointers |
| `$00B8`–`$00B9` | `ZX_CHKSUM_PTR_LO/HI` | 4-stage copy-protection checksum pointer |
| `$00BA`–`$00BD` | `ZX_CHKSUM_RES_*` | Checksum verification bytes (`$43`, `$AC`, `$46`, `$B7`) |
| `$00C1`–`$00C2` | `ZX_BCD_VAR_C1/C2` | BCD score / timer variables |

---

## 2. Work RAM & Game State Variables (`$0400`–`$3FFF`)

| Address | Symbol | Description |
| :--- | :--- | :--- |
| `$0400`–`$0413` | `HUD_LINE_0` | Upper HUD Line 0 (20 bytes Mode 6: Score & Radiation Timer) |
| `$0414`–`$0427` | `HUD_LINE_1` | Upper HUD Line 1 (20 bytes Mode 6: `ZONE XX`, `MEN X`) |
| `$0428`–`$043B` | `HUD_LINE_2` | Lower HUD Line 2 (20 bytes Mode 6: Held items `KEY`/`SPADE`/`LOCK`/`MATS` & Plutonium bars) |
| `$0550`–`$0553` | `META_TILE_SCRATCH` | 4-byte scratch buffer for $2\times 2$ character block |
| `$0555` | `CURRENT_ZONE_IDX` | Active zone index (`0`..`11` corresponding to Zone 1..12) |
| `$0556` | `OPTION_LEVEL_IDX` | Difficulty option level (`0`..`2` corresponding to Level 1..3) |
| `$055B`–`$055C` | `PLAYER_TILE_OFFSET` | 16-bit logical tile offset (`ty * 64 + tx`) |
| `$055D` | `PLAYER_HPOS` | Player horizontal hardware sprite position (`HPOSP0`/`HPOSP1`) |
| `$055E` | `PLAYER_SPRITE_FRAME` | Player animation frame index |
| `$055F` | `SCROLL_DIR` | Active scroll direction (`0`=Up, `1`=Right, `2`=Left, `3`=Down) |
| `$0560` | `PLAYER_CHAR_X` | Player character X coordinate (`tx * 2`, `0`..`126`) |
| `$0561` | `PLAYER_CHAR_Y` | Player character Y coordinate (`ty * 2`, `0`..`62`) |
| `$0574` | `INV_HAS_KEY` | Non-zero if player carries `KEY` (`$C6` in lower HUD) |
| `$0575` | `INV_HAS_SPADE` | Non-zero if player carries `SPADE` (`$84` in lower HUD) |
| `$0576` | `INV_MATS_COUNT` | Number of `MATS` carried by player (`$85` icons in lower HUD) |
| `$0577`–`$0578` | `WORK_COORD_16` | 16-bit working coordinate / LMS camera address |
| `$0598` | `PLUTONIUM_REMAINING` | Remaining unstable Plutonium samples to decontaminate in `CONTAINER` |
| `$059E`–`$059F` | `RADIATION_TIMER_BCD` | 16-bit BCD countdown timer (`SED`/`CLD`) |
| `$05AF` | `INV_HAS_PLUTONIUM` | Non-zero if player currently carries an active `PLUTONIUM` sample (`$C3` in HUD) |
| `$05B3` | `CONTAINER_COUNT` | Number of decontamination containers in current zone |
| `$05BC` | `FINE_SCROLL_STATE` | Fine-scroll step counter (`$06` neutral) |
| `$0B00`–`$12FF` | `LOGICAL_TILE_MAP` | $64\times 32$ byte logical playfield map (`2048` bytes, Tile IDs `0`..`31`) |
| `$1800`–`$1BFF` | `ACTIVE_CHARSET` | Active 1024-byte character set (`CHBAS = $18`, copied from `$706C`) |
| `$1C00`–`$3BFF` | `SCREEN_CHAR_BUFFER` | Expanded $128\times 64$ Mode 4 character playfield (`8192` bytes) |
| `$3C8B`–`$3CE4` | `DL_INGAME` | Active In-Game Display List (`24x $74` + `1x $54` LMS rows at `$3C93`..`$3CDD`) |
| `$3CE5`–`$3D1F` | `DL_MENU` | Title / Hall of Fame Display List |

---

## 3. Verified 6502 Subroutines & Data Tables (`$4000`–`$BFFF`)

### 3.1 Subsystem 01 — Level Loader & Maps (`01_level_loader_and_maps.json`)
* **`$43CC` (`ZX_Multiply_ZoneIdx`):** Multiplies `CURRENT_ZONE_IDX` (`$0555`) by `X` (`2`, `4`, or `6`) for table indexing.
* **`$45DD` (`ZX_Unpack_Zone_Passes`):** Orchestrates up to 3 delta-decompression passes based on `OPTION_LEVEL_IDX` (`$0556`):
  * Pass 0 (Base): Pointer table `$A3F0`, item counts `$A48C` (12 bytes).
  * Pass 1 (Level $\ge 2$): Pointer table `$A408`, item counts `$A498` (12 bytes).
  * Pass 2 (Level $3$): Pointer table `$A420`, item counts `$A4A4` (12 bytes).
* **`$4639` (`ZX_Unpack_Pass_Loop`):** Reads 2-byte records `(b0, b1)`, adds 11-bit delta `((b0 & 0x07) << 8) | b1` to `$A4/$A5` (base `$0B00`), extracts `tile_id = (b0 >> 3) & 0x1F`, writes `tile_id` to `$0B00`, and increments `PLUTONIUM_REMAINING` (`$0598`) if `tile_id == 6` or `CONTAINER_COUNT` (`$05B3`) if `tile_id == 20`.
* **`$47CB` (`ZX_Check_Door_Warp_Transition`):** Looks up 6-byte warp/door transition records via pointer table `$A3D8` (12 words).
* **`$623A` (`ZX_Init_Zone_And_HUD`):** Reads 6-byte player spawn record from `$A2F4 + difficulty * 72 + zone_idx * 6`, loads the 4-byte per-zone GTIA color palette from `$A2C4 + zone_idx * 4` into `$02C4..$02C7`, copies HUD strings from `$3E53`/`$3E67` into `$0414`/`$0428`, and initializes camera LMS pointers via `$4462`.

### 3.2 Subsystem 02 — ANTIC DLI & Scrolling (`02_antic_dli_scrolling.json`)
* **`$4433` (`ZX_Scroll_Shift_25_LMS`):** Shifts all 25 16-bit LMS addresses at `$3C94 + row * 3` by `(-128, +2, -2, +128)` according to `$055F` (`SCROLL_DIR`).
* **`$4462` (`ZX_Camera_Init_25_LMS`):** Computes camera top-left address in `$1C00..$3BFF` from player character coordinates `$0560`/`$0561` (clamping vertical scroll at `$28` rows and horizontal scroll at `$54` columns) and writes 25 consecutive LMS pointers (stride `+$0080`) into `$3C94`.
* **`$44DD` (`ZX_Expand_MetaTile_To_ScreenBuf`):** Expands a logical `tile_id` (`0`..`31`) via `$6D42 + tile_id * 4` into a $2\times 2$ character block in `$1C00..$3BFF`.
* **`$4DCC` (`ZX_TileOffset_To_CharXY`):** Converts a 16-bit tile offset (`0`..`2047`) into `(char_x, char_y) = ((offset % 64) * 2, (offset // 64) * 2)`.
* **`$64CD` (`ZX_DLI_And_VBI_Handler_InGame`):** Switches hardware color registers between upper HUD, Mode 4 playfield, and lower HUD.
* **`$939C` (`Feature_Screen_DL`):** Display List for the animated `zone x features` showcase screen.

### 3.3 Subsystem 03 — Player Physics & 16 Features (`03_player_and_16_features.json`)
* **`$45AE` (`ZX_Write_Tile_And_Screen`):** Mutates a logical tile in `$0B00` AND immediately updates its $2\times 2$ Mode 4 characters in `$1C00`.
* **`$4800` / `$4846` (`ZX_Read_Player_Input` / `ZX_Update_Player_Physics`):** Reads `PORTA` (`$D300`) and `TRIG0` (`$D010`), checks tile walkability in `$0B00`, updates player coordinates and sprite frames (`$69D2`/`$6B12`), and triggers camera scrolling.
* **`$4A10` (`ZX_Handle_16_Features`):** Implements state transitions and interactions for all 16 verified features (`LASER`, `WARP`, `SLAM`, `AIRDOORS`, `DOOR`, `PLUTONIUM`, `BONUS`, `LOCK`, `KEY`, `LOCKED`, `SPADE`, `CRUMBLY`, `MATS`, `CONTAINER`, `BLOCK`, `TIME`).
* **`$4B30` / `$4C50` / `$4F20`:** Handles `CH ITEM` selection, placing/picking up `MATS` (`$0576`), and rendering the lower HUD bar (`$0428..$043B`).

### 3.4 Subsystem 04 — Enemies (Robots), BCD & HUD (`04_enemies_bcd_and_hud.json`)
* **`$55D4` / `$5600` / `$5720` (`ZX_Init_Zone_Robots` / `ZX_Update_Robots_Patrol`):** Loads per-zone robot tables from `$A438`, `$A450`, and `$A468` (4 bytes per robot: `x, y, dir, speed`), patrols corridors, and reverses direction upon hitting walls or player-placed `MATS` (`tile_id` 13/14/15).
* **`$4E50` / `$5090` / `$6580`:** Hardware `SED`/`CLD` BCD arithmetic routines for adding score (`$00C1/$00C2`), updating `HI SCORE`, and decrementing the radiation timer (`$009E/$009F`, `$059E/$059F`) until `OUT OF TIME`.

### 3.5 Subsystem 05 — POKEY 4-Channel Sound Driver (`05_pokey_sound_driver.json`)
* **`$7A00` / `$7A60` / `$7B00`:** 50 Hz VBI state machine writing to `$D200,Y` (`AUDF1`–`AUDC4`, `AUDCTL`) using the frequency sweep/envelope tables at `$7500`–`$75FF`.
