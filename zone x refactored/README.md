# Zone X — Refactored Clean JavaScript Architecture

Diese Edition im Ordner `zone x refactored/` ist **1:1 funktions-, pixel- und klangidentisch** mit der Hauptversion, bildet das gesamte Spiel jedoch in einer sauberen, modernen, objektorientierten JavaScript-Architektur ab.

## Architektur & Modul-Struktur

```text
zone x refactored/
├── index.html                           # Semantische HTML5-Oberfläche + Level-Editor-Modal
├── css/
│   └── style.css                        # UI- & CRT-Styling
├── assets/
│   ├── zonex_rom_bundle.js              # Offline-fähiges Asset-Bundle (direkter file:// Start)
│   └── zonex_rom_bundle.json            # JSON-Asset-Daten
└── src/
    ├── config/
    │   ├── Constants.js                 # Semantische Enums: TileType, ScreenMode, RefreshStandard, GridConfig, SystemAddressMap
    │   └── TileCatalog.js               # Strukturierter Katalog aller Bausteine, Gefahren, Items & Gegner
    ├── models/
    │   ├── GameState.js                 # Domänen-Modell für Spielerposition, Inventar, Scroll-Offsets, Timer & Highscores
    │   └── LevelMap.js                  # Objektorientiertes 62x32 Level-Modell mit Geometrie-Methoden & Serialisierung
    ├── levels/
    │   └── BonusLevelPack.js            # Deklarative Definitionen der 10 Bonus-Zonen (Zonen 13–22) über LevelMap & TileType
    ├── audio/
    │   └── PokeyAudioSynthesizer.js     # 4-Kanal POKEY Synthesizer inkl. 55ms Übergangs-Stummschaltung & 6ms Fade-In
    ├── graphics/
    │   └── AtariDisplayRenderer.js      # Modularer Display-Renderer (Mode 2/4/6/7/14, HSCROL/VSCROL Soft-Scroll, PMG-Sprites)
    ├── engine/
    │   ├── InputController.js           # Tastatur-, Joystick- & Konsolentasten-Steuerung
    │   └── GameEngine.js                # Ausführungs-Engine für Intro, Features-Showcase, Zonen-Logik & Übergangs-Hooks
    ├── editor/
    │   └── LevelEditorController.js     # MVC-Controller für den interaktiven 62x32 Level-Editor & Zufallsgenerator
    ├── app/
    │   └── ZoneXApp.js                  # Haupt-Applikations-Controller & UI-Binding
    └── bundle/
        └── zonex_refactored.bundle.js   # Gebündelte Laufzeitdatei für direkten Browser-Start ohne Build-Server
```

## Design-Richtlinien

1. **Keine Magic Numbers oder verstreuten Hex-Adressen:** Alle Tile-IDs (`TileType.PLUTONIUM`, `TileType.CONTAINER`, `TileType.LASER_DOOR_1A`, `TileType.ALIEN_DROID_NORMAL` usw.), Bildschirm-Modi (`ScreenMode.TITLE`, `ScreenMode.FEATURES`, `ScreenMode.IN_GAME`, `ScreenMode.HALL_OF_FAME`), Bildwiederholraten (`RefreshStandard.PAL_50HZ`, `RefreshStandard.NTSC_60HZ`) und Hardware-Register (`SystemAddressMap`) sind zentral in [`src/config/Constants.js`](src/config/Constants.js) kapsuliert.
2. **Saubere Domänen-Modelle (`GameState` & `LevelMap`):** UI-Controller, Level-Generator und Level-Editor greifen ausschließlich über sprechende Getter und Methoden auf den Spielzustand und die Level-Geometrie zu.
3. **100% Trennung von Produktions-Code und Reverse-Engineering-Scaffolding:** Alle historischen Lockstep-/Verifikations-Stubs aus der Reverse-Engineering-Phase wurden entfernt, sodass nur klarer, wartbarer Produktionscode verbleibt.
