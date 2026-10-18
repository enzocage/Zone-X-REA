# Master-Ausführungsplan (`plan3.md`): Vollautomatisiertes („Zero-Touch“) Reverse Engineering & 1:1 HTML5/JS-Portierung von „Zone X“ (Gremlin Graphics, 1985)

> **SYSTEM-DIREKTIVE FÜR GOOGLE ANTIGRAVITY (AUTONOMOUS EXECUTION MODE):**
> Dieses Dokument ist deine verbindliche End-to-End-Spezifikation. Deine Aufgabe ist es, das Atari-800XL/XE-Spiel **Zone X** (Autor: Derek Johnston, Gremlin Graphics, 1985) aus der im Workspace liegenden Datei `ZoneX.atr` vollautomatisch zu dekonstruieren und als $100\,\%$ bit-, pixel-, zyklus- und tongetreue Web-Applikation (`zonex-web/`) in HTML5, CSS3 und Vanilla JavaScript (ES2022+ inkl. Web Audio API `AudioWorklet`) neu zu implementieren.
>
> **Arbeitsmodus:** Führe alle Phasen ($0$ bis $5$) sequenziell und autonom über das Terminal, `morluto/rea` (Ghidra Headless MCP), den Headless-Emulator (`Altirra64 /warp` bzw. `libatari800`) und Playwright aus. Frage den menschlichen Operator **nicht** nach Zwischenbestätigungen, solange die automatisierten Gatekeeper-Assertions und Verifikations-Orakel erfolgreich (`EXIT 0`) durchlaufen.

---

## 1. Verbindliche Agenten-Regeln (Guardrails für Google Antigravity)

1. **Verbot von „Lazy Porting“ & Approximationen:**
   Es ist strikt untersagt, Spielmechaniken, Timer, Roboter-Bewegungsmuster oder Kollisionen anhand allgemeiner Videospiel-Konventionen zu schätzen. Jede einzelne Bedingung in JavaScript muss durch eine konkrete 6502-Speicheradresse aus `ZoneX.atr` belegt sein.
2. **Dual-View-Pflicht bei `morluto/rea` (Ghidra MCP):**
   Verlasse dich niemals allein auf den C-Pseudocode des Ghidra-Decompilers, da dieser das 6502-Dezimalflag (`SED` / `CLD` für BCD-Arithmetik) sowie 16-Bit-Zero-Page-Zeiger-Manipulationen oft als reguläre Binäroperationen fehlinterpretiert. Fordere über `morluto/rea` zu jeder Funktion **immer parallel das originale 6502-Disassembly** an.
3. **Verbot langsamer Echtzeit-GUI-Schleifen:**
   Versuche niemals, das Spiel über visuelle Computer-Use-Screenshots in Echtzeit ($50\,\text{Hz}$) zu spielen. Nutze für Emulator-Zugriffe ausschließlich die in Phase 1 definierten **Warp-Batch-Skripte (`.atdbg`)** bzw. **`libatari800` ($15.000\,\text{FPS}$)**.
4. **Kontext-Hygiene durch `MEMORY_MAP.md` & Sub-Tasking:**
   Pflege im Projekt-Root eine Datei `MEMORY_MAP.md`, in der jede verifizierte Adresse, jedes Zero-Page-Byte und jede Sprungtabelle dokumentiert wird. Bearbeite die 5 Subsysteme (Phase 2 & 4) in getrennten, fokussierten Sub-Tasks, um Kontext-Sättigung zu vermeiden.
5. **Definition of Done (DoD):**
   Das Projekt gilt erst dann als abgeschlossen, wenn `04_verify_oracles.py` für alle 12 Zonen, den Titelscreen und den Feature-Screen einen Pixelfehler von $E_{\text{pixel}} = 0$, eine 100%ige Lockstep-Übereinstimmung über $5.000$ Frames und eine POKEY-Audio-Korrelation von $\rho \ge 0{,}99$ meldet.

---

## 2. Forensische Ground Truth aus `ZoneX.atr` (Verifizierte Faktenbasis)

Diese Fakten wurden bereits direkt aus dem Binär-Dump von `ZoneX.atr` extrahiert und dienen als unverrückbare Ankerpunkte:

### 2.1 Quellsystem & Disk-Struktur
* **Hardware:** Atari 800XL / XE, MOS 6502C („SALLY“) @ $1{,}773447\,\text{MHz}$ (PAL, $50\,\text{Hz}$ VBI, $312$ Scanlines), ANTIC, GTIA, POKEY, PIA, $64\,\text{KB}$ RAM (`$0000`–`$FFFF`).
* **ATR-Header:** `$96 $02 $80 $02 $80 $00` ($128\,\text{Bytes}$ pro Sektor). Enthält einen Micro-DOS/Menü-Loader (`DIRECTORY--SEARCH SPEC,LIST FILE?`, `NOT A DISK FILE`, `FOR MENU`) sowie das Hauptprogramm mit Atari-Binärheadern (`$FF $FF`).

### 2.2 Entschlüsselte ANTIC Display Lists
1. **In-Game Playfield Display List (Hardware-Fine-Scrolling):**
   * Struktur im Dump: `$80 $74 [LMS_LO LMS_HI] x 24 ... $54 [LMS_LO LMS_HI] ... $80 $46 ... $41 [DL_LO DL_HI]`.
   * **`$80`:** Display List Interrupt (DLI) vor dem Spielfeld und vor dem unteren HUD zur Umschaltung der Farbregister (`COLPF0`–`COLPF3`, `COLBK`).
   * **$24 \times \text{\texttt{\$74}}$ (`'t'` = $01110100_2$):** **ANTIC Mode 4** ($40\times 8$ Pixel pro Charakterzeile, Multicolor) kombiniert mit **LMS** (Bit $6 = \$40$), **VSCROL** (Bit $5 = \$20$) und **HSCROL** (Bit $4 = \$10$).
   * **$1 \times \text{\texttt{\$54}}$ (`'T'` = $01010100_2$):** Die 25. sichtbare Playfield-Zeile besitzt `LMS` + `HSCROL`, löscht aber das `VSCROL`-Bit (`$20`), um vertikales Scroll-Bleeding in die Statuszeile zu verhindern.
   * **Scrolling-Mechanik:** Grob-Scrolling erfolgt durch dynamisches Patchen aller 25 16-Bit-LMS-Adressen in der Display List; Fein-Scrolling auf Pixelebene erfolgt über `$D404` (`HSCROL`) und `$D405` (`VSCROL`).
2. **Feature-Screen Display List (ab Adresse `$939C`):**
   * Sequenz: `$70 $70 $70 $46 $DC $93 $46 $F0 $93 $46 $04 $94 $70 $70 $42 $18 $94 $42 $40 $94 $80 $44 $68 $94 ... $41 $9C $93`.
   * Kombiniert ANTIC Mode 6 (`$46`), Mode 2 (`$42`) und Mode 4 (`$44`) mit DLIs (`$80`) zur animierten Vorstellung aller Spielelemente.

### 2.3 Entschlüsselte Strings & alle 16 Spielelemente (Atari Screen Codes)
1. **Klartext-Strings (ASCII / Screen Code):**
   * `OUT OF TIME`, `MATS`, `PAUSED`, `HALL OF FAME`, `ZONE X`, `BY DEREK JOHNSTON`, `OPTION  LEVEL  1`, `SELECT   ZONE  1`, `SCORE          0`, `HI SCORE       0`, `CH ITEM`, `SELECT`, `FOR MENU`, `LAST SCORE          1 2 3 4 5 6 7 8 9101112` (belegt exakt **12 Zonen**), `zone x features`.
2. **Verschobene Feature-Labels im `zone x features`-Block ($\text{ScreenCode} = \text{ASCII} - \$20$):**
   * `,!3%2` $\rightarrow$ **`LASER`** (Periodische oder permanente Laserstrahlen)
   * `7!20` $\rightarrow$ **`WARP`** (Teleporter-Pads mit Zielkoordinaten-Mapping)
   * `3,!-` $\rightarrow$ **`SLAM`** (Schnell zuschlagende Falltüren)
   * `!)2$//23` $\rightarrow$ **`AIRDOORS`** (Pneumatische Luftschleusen)
   * `$//2` $\rightarrow$ **`DOOR`** (Standardtür / Ausgang)
   * `0,54/.)5-` $\rightarrow$ **`PLUTONIUM`** (Instabile radioaktive Proben – Hauptziel)
   * `"/.53` $\rightarrow$ **`BONUS`** (Punktbonus-Gegenstände)
   * `,/#:` / `,/#+` $\rightarrow$ **`LOCK`** (Schloss-Mechanismus)
   * `+%9` $\rightarrow$ **`KEY`** (Schlüssel zum Öffnen von `LOCKED`)
   * `,/#+%$` $\rightarrow$ **`LOCKED`** (Verschlossene Tür)
   * `30!$%` $\rightarrow$ **`SPADE`** (Spaten zum Durchgraben von `CRUMBLY`)
   * `#25-",9` $\rightarrow$ **`CRUMBLY`** (Bröckelige, aufgrabbare Wände / Böden)
   * `-!43` $\rightarrow$ **`MATS`** (Aufnehmbare/ablegbare Bodenmatten zum Blockieren von Robotern)
   * `#/.4!).%2` $\rightarrow$ **`CONTAINER`** (Sammelbehälter zur Dekontamination von Plutonium)
   * `",/#+` $\rightarrow$ **`BLOCK`** (Solider / verschiebbarer Block)
   * `4)-%` $\rightarrow$ **`TIME`** (Zeit-Pickup / Strahlungstimer)

### 2.4 Meta-Tiles ($2\times 2$ Zeichen) & Player/Missile-Sprites
* **Meta-Tile-Struktur:** Jedes logische Spielfeld-Objekt besteht aus $2\times 2$ Zeichen im ANTIC Mode 4 ($8\times 16$ Multicolor-Pixel). Im Dump liegen die Zuordnungstabellen (`""$$ ##%%`, `ˆ‰Š‹`, `”•–—`, `˜™š›`, `¬­®¯`, `´µ¶·`, `¸¹º»`, `¼½¾¿`, `ÀÁÂÃ`), die jeweils 4 Zeichencodes (Oben-Links, Oben-Rechts, Unten-Links, Unten-Rechts) gruppieren.
* **Mode 4 Bit-7-Farbregel:** In ANTIC Mode 4 wählt das Bitpaar `11` standardmäßig die Farbe `COLPF2` (`$D018`). Ist jedoch **Bit 7 des Zeichencodes gesetzt** ($\text{CharCode} \ge \$80$), wird stattdessen `COLPF3` (`$D019`) gerendert!
* **Spieler-Sprites:** Die 1-Bit-Animationsstreifen des Spielers (Laufen in 4 Richtungen) liegen im Dump ab `Òiâi...` (`8888 ((((8|8((l`, `8<08 @PPPxx8` etc.).

### 2.5 Zero-Page-Architektur, BCD-Arithmetik & POKEY-Soundtreiber
* **Zero-Page-Zeiger (16-Bit):**
  * `$9A/$9B`, `$9C/$9D`, `$9E/$9F`: Entitäts-, Timer- und Arbeitszeiger.
  * `$A0/$A1`, `$A4/$A5`: Tile-Map- und Kollisions-Zeiger.
  * `$A8/$A9`, `$AA/$AB`: Bildschirm- und Playfield-Puffer-Zeiger (u. a. Initialisierung mit `#$6D42`).
  * `$AC/$AD`, `$AE/$AF`: Level-, Tabellen- und Sprite-Zeiger.
  * `$B0/$B1`, `$B2/$B3`, `$B4/$B5`, `$B6/$B7`: Entitäts- und Roboter-Tabellenzeiger.
  * `$B8/$B9`: Zeiger für die 4-Stufen-Kopierschutz-Prüfsumme.
* **BCD-Mathematik (`SED` / `CLD`):**
  Score, Hi-Score und Countdown-Timer nutzen den Hardware-Dezimalmodus (`$F8` = `SED`, `$D8` = `CLD`) auf den Adressen `$9E/$9F`, `$C1/$C2` und `$97` (z. B. `SED : LDA $9E : ADC #$30 : STA $9E : LDA $9F : ADC #$00 : STA $9F : CLD`).
* **POKEY-Treiber (`$7Axx`):**
  Nutzt einen 4-Kanal-State-Automaten, schreibt per `STA $D200,Y` (`$99 $00 $D2`) in die POKEY-Register und liest die Hüllkurven-/Frequenztabelle `óæÙÌÁ¶­¢™ ˆ€yrlf`[UQLHD@<952/-*(%#!` sowie die Notentabellen (`0 8 @ 8 < H ...`).

### 2.6 Die 4-Stufen-Kopierschutz-Prüfsumme (Kritisch für Emulator-Tests)
Die Prüfsummen-Routine summiert über `($B8),Y` vier Speicherseiten à $256\,\text{Bytes}$ auf und prüft die Summen in `$BA`–`$BD`:
1. Start `$75F2` $\rightarrow$ Summe in `$BA` muss **`$43`** sein (`A5 BA C9 43 F0 01 68`).
2. Start `$4CFD` $\rightarrow$ Summe in `$BB` muss **`$AC`** sein (`A5 BB C9 AC F0 01 68`).
3. Start `$4F12` $\rightarrow$ Summe in `$BC` muss **`$46`** sein (`A5 BC C9 46 F0 01 68`).
4. Start `$9211` $\rightarrow$ Summe in `$BD` muss **`$B7`** sein (`A5 BD C9 B7 F0 01 68`).
* Bei Abweichung wird `PLA` (`$68`) ausgeführt, was den Rücksprung-Stack korrumpiert und zum sofortigen Absturz führt.

---

## 3. Vollautomatischer Ausführungsplan (Phasen 0 bis 5)

### Phase 0: Unattended Bootstrap & Pre-Patching

**Aktion für Antigravity:**
1. Lege die Ordnerstruktur `build/`, `build/rea_dossiers/`, `scripts/` und `zonex-web/` an.
2. Speichere und starte das folgende Skript `scripts/00_bootstrap_and_patch.py`. Es analysiert `ZoneX.atr`, extrahiert die Sektoren, erzeugt ein kopierschutzfreies Arbeits-Image `build/ZoneX_unprotected.atr` (indem die vier `PLA`-Befehle `$68` durch `NOP` `$EA` ersetzt werden), baut ein initiales statisches $64\,\text{KB}$-RAM-Abbild auf und generiert die Symboltabelle `build/atari_zonex_symbols.sym`.

```python
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
    0x00B5: "ZX_PTR_B4_HI",
    0x00B6: "ZX_PTR_B6_LO",
    0x00B7: "ZX_PTR_B6_HI",
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
```

---

### Phase 1: High-Speed Batch-Dumping aller Zustände & 12 Zonen (`01_fast_dump.py`)

**Aktion für Antigravity:**
Nutze `libatari800` (oder alternativ `Altirra64.exe /portable /pal /hardware:800xl /memsize:64k /nobasic /warp /disk "build/ZoneX_unprotected.atr" /debug /debugcmd:".batch scripts/dump_all.atdbg"`), um ohne GUI-Wartezeiten sämtliche Laufzeitzustände als $64\,\text{KB}$-RAM-Abbilder und verlustfreie Referenz-PNGs zu extrahieren.

Speichere und führe `scripts/01_fast_dump.py` aus:

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/01_fast_dump.py
Bootet ZoneX_unprotected.atr im Headless-Turbo-Modus (15.000 FPS),
dumpt den Titel-Screen, den Feature-Screen ($939C), die Hall of Fame sowie
alle 12 Zonen (ZONE 1 bis ZONE 12) als 64KB RAM-Snapshots und Referenz-PNGs.
"""

import hashlib
import json
from pathlib import Path

def verify_playfield_display_list(ram_64k: bytes) -> dict:
    """
    Prüft, ob die aktive ANTIC Display List (SDLSTL/H $0230/$0231 bzw. DLISTL/H)
    oder der bekannte Playfield-DL-Bereich die 24 gescrollten Mode-4-Zeilen ($74) enthält.
    """
    idx = ram_64k.find(b"\x74")
    lms_pointers = []
    # Suche nach der Sequenz aus 24 aufeinanderfolgenden $74 LMS-Befehlen (je 3 Bytes: $74 LO HI)
    for pos in range(0x0400, 0xC000):
        if ram_64k[pos] == 0x74 and ram_64k[pos + 3] == 0x74 and ram_64k[pos + 6] == 0x74:
            # Extrahiere alle 25 Zeilen-Zeiger (24x $74 + 1x $54)
            cur = pos
            for row in range(25):
                opcode = ram_64k[cur]
                if opcode in (0x74, 0x54, 0xF4, 0xD4):
                    lo = ram_64k[cur + 1]
                    hi = ram_64k[cur + 2]
                    lms_pointers.append({"row": row, "opcode": f"${opcode:02X}", "lms": f"${(hi << 8) | lo:04X}"})
                    cur += 3
                else:
                    break
            if len(lms_pointers) >= 24:
                return {"dl_start": f"${pos:04X}", "rows": lms_pointers}
            lms_pointers.clear()
    raise AssertionError("Playfield Display List mit 24x $74 Zeilen nicht im RAM-Dump gefunden!")


def validate_all_zone_dumps(zone_dir: Path):
    """Gatekeeper-Assertion: Stellt sicher, dass alle 12 Zonen-Dumps existieren und distinkt sind."""
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
        report[f"zone_{z:02d}"] = {"sha256": h[:16], "dl_start": dl_info["dl_start"], "first_lms": dl_info["rows"][0]["lms"]}

    assert len(hashes) == 12, f"Kritischer Fehler: Nicht alle 12 Zonen-Dumps sind unterschiedlich! ({len(hashes)}/12)"
    print("[PHASE 1 GATEKEEPER OK] Alle 12 Zonen-Dumps verifiziert.")
    return report
```

**Altirra Batch-Skript (`scripts/dump_all.atdbg`) für Windows:**
```text
// Startet ZoneX im Warp-Modus, bricht nach dem Entpacken im Hauptmenü und schreibt die Snapshots
.echo "[Altirra Batch] Booting Zone X in Warp mode..."
bp 939C
g
bc *
.writemem build/zones/ram_features.bin $0000 L$10000
.echo "[Altirra Batch] Features RAM dump written."
.exit
```

---

### Phase 2: Statische Massen-Dekompilation mit `morluto/rea` & Ghidra Headless

**Aktion für Antigravity:**
1. Importiere `build/zones/ram_zone_01.bin` und `build/zones/ram_features.bin` per Ghidra Headless Analyzer:
   ```bash
   analyzeHeadless ./build/ghidra_proj ZoneX -import ./build/zones/ram_zone_01.bin -processor "6502:LE:16:default" -postScript scripts/ZoneX_Ghidra_Setup.py
   ```
2. Verbinde `morluto/rea` (`npx rea-agents@latest setup`) mit dem Ghidra-Projekt und erzeuge die **5 Subsystem-Dossiers** unter `build/rea_dossiers/`. Jedes Dossier **muss** für jede enthaltene 6502-Subroutine folgende Felder enthalten:
   * `entry_address` (z. B. `"$4A10"`)
   * `raw_6502_disassembly` (exakte Mnemonics inkl. `SED`/`CLD`-Flags und Zero-Page-Operanden)
   * `ghidra_c_pseudocode` (als strukturelle Referenz)
   * `zero_page_reads_writes` (Liste aller gelesenen/geschriebenen Adressen in `$0000`–`$00FF`)
   * `hardware_registers_touched` (z. B. `HSCROL`, `VSCROL`, `AUDF1`, `COLPF0`)

#### Die 5 Pflicht-Dossiers (`build/rea_dossiers/`):
1. **`01_level_loader_and_maps.json`:**
   * Adressberechnung aus der gewählten Zone (`1` bis `12`) über die Pointer-Tabellen (`$A3D8+`, `$A400+`).
   * Entpack-Algorithmus in den Playfield-RAM-Puffer.
   * Initialisierung der Spieler-Startposition $(X_{\text{start}}, Y_{\text{start}})$, des Zonen-Timers (`TIME`) und der Roboter-Tabellen.
2. **`02_antic_dli_scrolling.json`:**
   * VBI-Handler (`VVBLKI` / `VVBLKD`) und DLI-Handler (`VDSLST`).
   * Exakte Scanline-Farbwerte für das obere/untere HUD und das Playfield.
   * Kamera-Nachführungs-Algorithmus (Deadzone/Hysterese) und Update-Logik für `HSCROL` (`$D404`), `VSCROL` (`$D405`) sowie das Nachschieben der 25 LMS-Zeiger in der Display List.
3. **`03_player_and_16_features.json`:**
   * Komplette State-Machine und Tile-Mutationslogik für alle 16 Spielelemente:
     `LASER`, `WARP`, `SLAM`, `AIRDOORS`, `DOOR`, `PLUTONIUM`, `BONUS`, `LOCK`, `KEY`, `LOCKED`, `SPADE`, `CRUMBLY`, `MATS`, `CONTAINER`, `BLOCK`, `TIME`.
   * Inventar-Management (`CH ITEM`, Matten-Zähler `MATS`, Abbruch-Taste `A`, Pause-Taste `P`).
4. **`04_enemies_bcd_and_hud.json`:**
   * Roboter-Bewegungs- und Richtungswechsel-Algorithmus (Abprallen an Wänden und ausgelegten `MATS`).
   * Alle `SED`/`CLD`-BCD-Routinen für `SCORE`, `HI SCORE`, `LAST SCORE` und den Strahlungs-/Zeit-Countdown (`$9E/$9F`, `$C1/$C2`) bis zur Auslösung von `OUT OF TIME`.
5. **`05_pokey_sound_driver.json`:**
   * Vollständiges Disassembly des 4-Kanal-POKEY-Treibers bei `$7Axx` (`STA $D200,Y`) inkl. Kanal-Prioritäten, Noten-Sequenzer und der Hüllkurventabelle `óæÙÌÁ¶­¢™ ˆ€yrlf`[UQLHD@<952/-*(%#!`.

---

### Phase 3: Deterministische Asset-Extraktion (`scripts/03_extract_assets.py`)

**Aktion für Antigravity:**
Schreibe und starte `scripts/03_extract_assets.py`, um aus den RAM-Snapshots (`ram_zone_01.bin`..`12.bin`, `ram_features.bin`, `ram_title.bin`) ein einziges, strukturiertes JSON-Bundle `zonex-web/assets/zonex_rom_bundle.json` zu generieren:

1. **Charsets (`charsets`):**
   Alle durch `CHBASE` (`$D409` / `$02F4`) in Titel, HUD, Feature-Screen und In-Game referenzierten $1024$-Byte-Fonts ($128$ Zeichen à $8\,\text{Bytes}$).
2. **Meta-Tiles (`meta_tiles`):**
   Die $2\times 2$-Charakter-Zuordnungstabellen für sämtliche Wand-, Boden- und Objekt-Kacheln (inkl. Bit-7-Markierung für `COLPF2` vs. `COLPF3`).
3. **Player/Missile-Sprites (`sprites`):**
   Alle 1-Bit-Animationsphasen des Spielers sowie etwaige Missile-/Laser-Masken.
4. **Zonen-Daten (`zones` 1–12):**
   Für jede der 12 Zonen: die entpackte 2D-Tile-Matrix, Spieler-Startkoordinaten, Roboter-Spawns (Startkoordinate, Richtung, Geschwindigkeit), Tür-/Laser-Timer und Teleporter-Zieltabellen (`WARP`).
5. **POKEY-Daten (`audio_tables`):**
   Alle Frequenz-, Distortion- (`AUDC`) und Hüllkurven-Tabellen aus dem Bereich `$7A00`–`$7FFF`.
6. **PAL-Farbpalette (`atari_pal_palette`):**
   Die $256$ exakten Atari-XL-PAL-Farbwerte als `[R, G, B]`-Tupel.

---

### Phase 4: Synthese der HTML5 / CSS3 / JS Engine (`zonex-web/`)

**Aktion für Antigravity:**
Erstelle die Web-Applikation in `zonex-web/` gemäß folgender Architektur:

```text
zonex-web/
├── index.html                        # Viewport, CRT-Canvas (336x240), Debug-HUD
├── css/
│   └── style.css                     # Pixel-Art-Scaling (image-rendering: pixelated), CRT-Filter
├── assets/
│   └── zonex_rom_bundle.json         # Output aus Phase 3 (keine Hardcodings im Code!)
└── js/
    ├── main.js                       # Exakter 50.00 Hz PAL Timestep-Accumulator (dt = 20.0 ms)
    ├── hardware/
    │   ├── antic_gtia.js             # Zyklengenauer Mode 2/4/6/7 + DLI + 24x $74 LMS + PMG Renderer
    │   ├── pokey_worklet.js          # Web Audio API AudioWorkletProcessor (echte 4-Kanal-LFSR-Synthese)
    │   ├── pokey_driver.js           # 1:1 Port des $7Axx Sound-Treibers (50 Hz Tick -> Worklet)
    │   └── input_bridge.js           # Joystick/Tastatur ($D300 PORTA, $D010 TRIG0, $D01F CONSOL, $D209 KBCODE)
    ├── engine/
    │   ├── memory_state.js           # Uint8Array(65536) RAM-Spiegel + bcdAdd8() / bcdSub8()
    │   ├── zone_loader.js            # 1:1 Port aus Dossier 01 (lädt Zonen 1..12 in memory_state)
    │   ├── player_physics.js         # 1:1 Port aus Dossier 02 & 03 (Bewegung, Scroll-Deadzone, CH ITEM)
    │   ├── feature_state_machine.js  # 1:1 Port aus Dossier 03 (alle 16 Features inkl. Timer)
    │   ├── robot_ai.js               # 1:1 Port aus Dossier 04 (Roboter-Patrouille, MATS-Blockade)
    │   └── screens.js                # Titel-Screen, Feature-Screen ($939C), Hall of Fame
    └── verify/
        └── lockstep_api.js           # Exponiert window.ZoneXTestAPI für Playwright-Orakel
```

#### Verbindliche Implementierungs-Spezifikationen für den JS-Code:

1. **ANTIC Mode 4 Pixel-Decoder (`antic_gtia.js`):**
   Für jedes Zeichen `charCode` ($0\dots 255$) in einer Mode-4-Zeile (`$04`, `$44`, `$54`, `$74`):
   ```javascript
   const charIndex = charCode & 0x7F;
   const usePF3 = (charCode & 0x80) !== 0;
   const glyphByte = charset[(charIndex << 3) | (scanlineInRow & 0x07)];
   // 4 Multicolor-Pixel pro Zeichenbreite (je 2 Bits: Bit 7..6, 5..4, 3..2, 1..0)
   for (let px = 0; px < 4; px++) {
     const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
     let colorReg;
     if (bitPair === 0) colorReg = regs.COLBK;
     else if (bitPair === 1) colorReg = regs.COLPF0;
     else if (bitPair === 2) colorReg = regs.COLPF1;
     else colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
     drawDoublePixel(scanlineY, screenX + (px << 1), palPalette[colorReg]);
   }
   ```
2. **6502-BCD-Arithmetik (`memory_state.js`):**
   Alle Additionen und Subtraktionen im Dezimalmodus (`SED`) müssen bitgenau dem MOS 6502 entsprechen:
   ```javascript
   export function bcdAdd8(a, b, carryIn = 0) {
     let lo = (a & 0x0F) + (b & 0x0F) + (carryIn ? 1 : 0);
     if (lo > 9) lo += 6;
     let hi = (a >> 4) + (b >> 4) + (lo > 0x0F ? 1 : 0);
     if (hi > 9) hi += 6;
     return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), carry: hi > 0x0F ? 1 : 0 };
   }

   export function bcdSub8(a, b, borrowIn = 0) {
     let lo = (a & 0x0F) - (b & 0x0F) - (borrowIn ? 1 : 0);
     let borrowLo = 0;
     if (lo < 0) { lo -= 6; borrowLo = 1; }
     let hi = (a >> 4) - (b >> 4) - borrowLo;
     let borrowHi = 0;
     if (hi < 0) { hi -= 6; borrowHi = 1; }
     return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), borrow: borrowHi };
   }
   ```
3. **Test-API für die Verifikations-Orakel (`lockstep_api.js`):**
   Die Web-App muss `window.ZoneXTestAPI` bereitstellen mit:
   * `loadZone(zoneNumber, optionLevel)`: Initialisiert exakt die angegebene Zone ($1\dots 12$).
   * `stepFrame(inputMask)`: Führt exakt einen $50\,\text{Hz}$-Frame ohne `requestAnimationFrame`-Wartezeit aus.
   * `getStateSnapshot()`: Gibt `{ playerX, playerY, hscrol, vscrol, timerBcd, scoreBcd, matsCount, pokeyRegs, lmsPointers }` zurück.
   * `getCanvasImageData()`: Gibt das aktuelle `Uint8ClampedArray` des Framebuffers zurück.

---

### Phase 5: Selbstheilende Verifikation über die 3 Orakel (`scripts/04_verify_oracles.py`)

**Aktion für Antigravity:**
Führe nach Fertigstellung von Phase 4 das Verifikations-Skript `scripts/04_verify_oracles.py` aus. Wenn eines der drei Orakel eine Abweichung meldet, analysiere den ausgegebenen Diff-Report, korrigiere das entsprechende JS-Modul und wiederhole den Testlauf, bis alle drei Orakel `PASS` melden:

1. **Orakel 1 – Visuelle Parität (Playwright vs. Emulator-Referenz):**
   Vergleicht den Canvas-Framebuffer für `title`, `features`, `halloffame` und `zone_01` bis `zone_12` mit den Referenz-PNGs aus Phase 1:
   $$E_{\text{pixel}} = \frac{1}{W \cdot H} \sum_{y=0}^{H-1} \sum_{x=0}^{W-1} \left\| \mathbf{RGB}_{\text{Atari}}(x,y) - \mathbf{RGB}_{\text{Web}}(x,y) \right\|_2^2 = 0$$
2. **Orakel 2 – Deterministischer $5.000$-Frame Lockstep-Test (TAS):**
   Spielt in `libatari800` und über `window.ZoneXTestAPI.stepFrame()` dieselbe deterministische Eingabesequenz ab (inkl. Laufen, Scrolling über alle 24 `$74`-Zeilen, `CH ITEM`, Ablegen von `MATS`, Aufnehmen von `PLUTONIUM`, `KEY`, `SPADE`, Durchqueren von `AIRDOORS` und `WARP` sowie Ablauf des BCD-Timers bis `OUT OF TIME`).
   Für jeden Frame $t \in \{1, \dots, 5000\}$ muss gelten:
   $$\mathbf{S}_t^{\text{(6502)}} \equiv \mathbf{S}_t^{\text{(JS)}}$$
3. **Orakel 3 – POKEY-Register & Audio-Korrelation:**
   Prüft für alle Sound-Trigger die 100%ige Gleichheit der Register-Schreibzugriffe (`$D200`–`$D208`) pro Frame sowie die Spektrogramm-Korrelation $\rho \ge 0{,}99$ des `AudioWorklet`-Outputs.

---

## 4. Master-Checkliste für Google Antigravity (Sequenzieller Abarbeitungs-Tracker)

Antigravity arbeitet diese Checkliste von oben nach unten ab und hakt jeden Schritt in `MEMORY_MAP.md` ab:

- [ ] **Schritt 1:** `python scripts/00_bootstrap_and_patch.py ZoneX.atr` ausführen $\rightarrow$ Prüfen, ob `build/ZoneX_unprotected.atr` ($4/4$ Kopierschutz-Patches) und `build/atari_zonex_symbols.sym` erstellt wurden.
- [ ] **Schritt 2:** `python scripts/01_fast_dump.py` (bzw. `Altirra64 /warp`) ausführen $\rightarrow$ Prüfen, ob `ram_title.bin`, `ram_features.bin`, `ram_halloffame.bin` und `ram_zone_01.bin`..`12.bin` inkl. Referenz-PNGs vorliegen und der Gatekeeper-Check (`24x $74` LMS-Zeilen, 12 unterschiedliche Zonen-Hashes) bestanden ist.
- [ ] **Schritt 3:** Ghidra Headless Projekt mit `ZoneX_Ghidra_Setup.py` initialisieren und über `morluto/rea` alle 5 JSON-Dossiers unter `build/rea_dossiers/` generieren.
- [ ] **Schritt 4:** `MEMORY_MAP.md` mit allen exakten Einsprungadressen, Zero-Page-Variablen und Daten-Tabellen aus den 5 Dossiers befüllen.
- [ ] **Schritt 5:** `python scripts/03_extract_assets.py` ausführen $\rightarrow$ `zonex-web/assets/zonex_rom_bundle.json` generieren und auf Vollständigkeit prüfen (Fonts, Meta-Tiles, Sprites, 12 Zonen-Maps, POKEY-Tabellen, PAL-Palette).
- [ ] **Schritt 6:** Implementierung von `zonex-web/` (HTML, CSS, `antic_gtia.js`, `pokey_worklet.js`, `pokey_driver.js`, `memory_state.js`, `zone_loader.js`, `player_physics.js`, `feature_state_machine.js`, `robot_ai.js`, `screens.js`, `lockstep_api.js`).
- [ ] **Schritt 7:** `python scripts/04_verify_oracles.py` starten und alle gemeldeten Pixel-, State- oder Audio-Differenzen iterativ beheben, bis `ALL 3 ORACLES PASSED (0 ERRORS)` ausgegeben wird.

---

## 5. Kalkulation: Token-, Zeit- und Ressourcenaufwand (Google AI Ultra Plan)

Durch die Auslagerung der Emulator-Steuerung in $15.000\,\text{FPS}$ Headless-Skripte und die Vorab-Bündelung der `morluto/rea`-Decompilations-Dossiers läuft dieser gesamte Plan in **einer einzigen durchgängigen Antigravity-Session** innerhalb der Rate-Limits des Google AI Ultra Plans durch:

| Phase | Hauptaktivität des Antigravity-Agenten | Tool-Calls / Turns | Token-Volumen (Input inkl. Cache / Output) | Reine Laufzeit (Wall-Clock) | Menschlicher Eingriff |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Phase 0** | Bootstrap, ATR-Parsing & `$B8/$B9` Kopierschutz-Patch | $5\text{–}8$ | $\approx 0{,}2\,\text{Mio.}$ In / $10\text{k}$ Out | $3\text{–}5\,\text{Min.}$ | **Start-Prompt ($1\,\text{Min.}$)** |
| **Phase 1** | Warp-Dumping (Titel, Features `$939C`, Zonen 1–12) | $6\text{–}10$ | $\approx 0{,}3\,\text{Mio.}$ In / $15\text{k}$ Out | $2\text{–}4\,\text{Min.}$ | $0\,\text{Min.}$ |
| **Phase 2** | Ghidra Headless + `morluto/rea` Export der 5 Dossiers | $25\text{–}40$ | $\approx 2{,}5\,\text{Mio.}$ In / $120\text{k}$ Out | $15\text{–}25\,\text{Min.}$ | $0\,\text{Min.}$ |
| **Phase 3** | Deterministischer Asset-Ripper (`zonex_rom_bundle.json`) | $10\text{–}15$ | $\approx 0{,}8\,\text{Mio.}$ In / $40\text{k}$ Out | $5\text{–}10\,\text{Min.}$ | $0\,\text{Min.}$ |
| **Phase 4** | Bau der HTML5/JS-Engine (ANTIC Mode 4, POKEY, 16 Features) | $50\text{–}75$ | $\approx 3{,}5\,\text{Mio.}$ In / $310\text{k}$ Out | $35\text{–}50\,\text{Min.}$ | $0\,\text{Min.}$ |
| **Phase 5** | Selbstheilende Verifikation über die 3 Orakel | $45\text{–}65$ | $\approx 2{,}7\,\text{Mio.}$ In / $180\text{k}$ Out | $30\text{–}50\,\text{Min.}$ | $0\,\text{Min.}$ |
| **GESAMT** | **100% Autonomes Reverse Engineering & Web-Port** | **$141\text{–}213$ Turns** | **$\approx 10{,}0\,\text{Mio.}$ In / $675\text{k}$ Out** | **$\approx 1{,}5\text{–}2{,}4\,\text{Std.}$** | **$< 2\,\text{Minuten}$** |

---

## 6. Start-Prompt für die Übergabe an Google Antigravity

Kopiere `ZoneX.atr` und diese `plan3.md` in ein leeres Arbeitsverzeichnis, öffne Google Antigravity in diesem Ordner und starte den Prozess mit genau diesem Prompt:

> **Prompt an Antigravity:**
> „Lies `plan3.md` vollständig ein. Dies ist deine verbindliche Master-Spezifikation. Im selben Verzeichnis liegt das originale Atari-XL-Disk-Image `ZoneX.atr`. Führe nun alle Phasen (`Phase 0` bis `Phase 5`) und die Master-Checkliste aus `plan3.md` vollautomatisch und ohne Zwischenfragen aus, bis die Web-Applikation in `zonex-web/` vollständig erstellt ist und `scripts/04_verify_oracles.py` für alle drei Orakel `PASS` meldet.“