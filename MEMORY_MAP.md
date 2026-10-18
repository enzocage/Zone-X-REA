# Zone X (Gremlin Graphics, 1985) — Forensic Memory Map & Execution Tracker

## Master-Checkliste (Sequenzieller Abarbeitungs-Tracker)

- [x] **Schritt 1:** `python scripts/00_bootstrap_and_patch.py ZoneX.atr` ausführen $\rightarrow$ Prüfen, ob `build/ZoneX_unprotected.atr` ($4/4$ Kopierschutz-Patches) und `build/atari_zonex_symbols.sym` erstellt wurden.
- [ ] **Schritt 2:** `python scripts/01_fast_dump.py` (bzw. `Altirra64 /warp`) ausführen $\rightarrow$ Prüfen, ob `ram_title.bin`, `ram_features.bin`, `ram_halloffame.bin` und `ram_zone_01.bin`..`12.bin` inkl. Referenz-PNGs vorliegen und der Gatekeeper-Check (`24x $74` LMS-Zeilen, 12 unterschiedliche Zonen-Hashes) bestanden ist.
- [ ] **Schritt 3:** Ghidra Headless Projekt mit `ZoneX_Ghidra_Setup.py` initialisieren und über `morluto/rea` alle 5 JSON-Dossiers unter `build/rea_dossiers/` generieren.
- [ ] **Schritt 4:** `MEMORY_MAP.md` mit allen exakten Einsprungadressen, Zero-Page-Variablen und Daten-Tabellen aus den 5 Dossiers befüllen.
- [ ] **Schritt 5:** `python scripts/03_extract_assets.py` ausführen $\rightarrow$ `zonex-web/assets/zonex_rom_bundle.json` generieren und auf Vollständigkeit prüfen (Fonts, Meta-Tiles, Sprites, 12 Zonen-Maps, POKEY-Tabellen, PAL-Palette).
- [ ] **Schritt 6:** Implementierung von `zonex-web/` (HTML, CSS, `antic_gtia.js`, `pokey_worklet.js`, `pokey_driver.js`, `memory_state.js`, `zone_loader.js`, `player_physics.js`, `feature_state_machine.js`, `robot_ai.js`, `screens.js`, `lockstep_api.js`).
- [ ] **Schritt 7:** `python scripts/04_verify_oracles.py` starten und alle gemeldeten Pixel-, State- oder Audio-Differenzen iterativ beheben, bis `ALL 3 ORACLES PASSED (0 ERRORS)` ausgegeben wird.

---

## 1. Zero-Page Variables (`$0000`–`$00FF`)

| Address | Symbol | Purpose |
| :--- | :--- | :--- |
| `$0014` | `RTCLOK_LO` | Atari OS Real-Time Clock (50 Hz PAL frame counter) |
| `$0097` | `ZX_BCD_TEMP_97` | Temporary BCD arithmetic register |
| `$009A`–`$009B` | `ZX_PTR_9A_LO/HI` | Entity / working pointer |
| `$009C`–`$009D` | `ZX_PTR_9C_LO/HI` | Timer / working pointer |
| `$009E`–`$009F` | `ZX_TIMER_OR_SCORE_BCD_LO/HI` | BCD accumulator for score / radiation timer |
| `$00A0`–`$00A1` | `ZX_PTR_A0_LO/HI` | Tile map pointer |
| `$00A4`–`$00A5` | `ZX_PTR_TILE_A4_LO/HI` | Tile collision / map lookup pointer |
| `$00A8`–`$00A9` | `ZX_PTR_SCREEN_A8_LO/HI` | Screen / playfield buffer pointer |
| `$00AA`–`$00AB` | `ZX_PTR_AA_LO/HI` | Playfield buffer pointer (initialized e.g. `#$6D42`) |
| `$00AC`–`$00AD` | `ZX_PTR_AC_LO/HI` | Level / table pointer |
| `$00AE`–`$00AF` | `ZX_PTR_AE_LO/HI` | Sprite / animation pointer |
| `$00B0`–`$00B7` | `ZX_PTR_B0..B7` | Entity and robot table pointers |
| `$00B8`–`$00B9` | `ZX_CHKSUM_PTR_LO/HI` | 4-stage copy-protection checksum pointer |
| `$00BA`–`$00BD` | `ZX_CHKSUM_RES_*` | Checksum verification bytes (`$43`, `$AC`, `$46`, `$B7`) |
| `$00C1`–`$00C2` | `ZX_BCD_VAR_C1/C2` | BCD timer / score variables |
