"""
build_bundle.py
Combines the clean ES6 modules under `zone x gfx redesign/src/` into
`zone x gfx redesign/src/bundle/zonex_gfx_redesign.bundle.js` so `index.html`
works both via HTTP server and directly via `file://` without CORS limits.
"""

import pathlib
import re

MODULE_ORDER = [
    "config/Constants.js",
    "config/TileCatalog.js",
    "models/LevelMap.js",
    "models/GameState.js",
    "levels/BonusLevelPack.js",
    "audio/PokeyAudioSynthesizer.js",
    "audio/FmSynthesizerEngine.js",
    "graphics/AtariDisplayRenderer.js",
    "graphics/MeshGeometryBuilder.js",
    "graphics/SmoothAnimationTracker.js",
    "graphics/WebGL3DMeshRenderer.js",
    "engine/InputController.js",
    "engine/GameEngine.js",
    "editor/LevelEditorController.js",
    "app/ZoneXApp.js",
]


def build() -> None:
    src_dir = pathlib.Path(__file__).resolve().parent / "src"
    parts = ['(function () {\n  "use strict";\n']

    for rel in MODULE_ORDER:
        text = (src_dir / rel).read_text(encoding="utf-8")
        text = re.sub(
            r'^\s*import\s+[\s\S]*?from\s+["\'].*?["\'];?\s*$',
            "",
            text,
            flags=re.MULTILINE,
        )
        text = re.sub(
            r"^\s*export\s+(default\s+)?",
            "",
            text,
            flags=re.MULTILINE,
        )
        parts.append(
            f"  // =========================================================================\n"
            f"  // Module: {rel}\n"
            f"  // =========================================================================\n"
            f"{text}\n"
        )

    parts.append("})();\n")
    out_path = src_dir / "bundle" / "zonex_gfx_redesign.bundle.js"
    out_path.write_text("\n".join(parts), encoding="utf-8")
    print(f"[BUILD OK] Generated {out_path} ({out_path.stat().st_size} bytes)")


if __name__ == "__main__":
    build()
