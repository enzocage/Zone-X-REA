/**
 * zonex-web/js/main.js
 * Main entry point & 50.00 Hz PAL Timestep Accumulator (dt = 20.0 ms).
 */

import { MemoryState } from "./engine/memory_state.js";
import { ZoneLoader } from "./engine/zone_loader.js";
import { PlayerPhysics } from "./engine/player_physics.js";
import { FeatureStateMachine } from "./engine/feature_state_machine.js";
import { RobotAI } from "./engine/robot_ai.js";
import { ScreenManager } from "./engine/screens.js";
import { AnticGtiaRenderer } from "./hardware/antic_gtia.js";
import { PokeyDriver } from "./hardware/pokey_driver.js";
import { InputBridge } from "./hardware/input_bridge.js";
import { installLockstepAPI } from "./verify/lockstep_api.js";

class ZoneXApplication {
  constructor(bundle) {
    this.bundle = bundle;
    this.canvas = document.getElementById("atari-canvas");

    this.memory = new MemoryState(bundle);
    this.pokey = new PokeyDriver(this.memory, bundle);
    this.inputBridge = new InputBridge(this.memory);
    this.zoneLoader = new ZoneLoader(this.memory, bundle);
    this.featureMachine = new FeatureStateMachine(this.memory, bundle, this.pokey);
    this.playerPhysics = new PlayerPhysics(this.memory, this.featureMachine, this.pokey);
    this.robotAI = new RobotAI(this.memory, bundle);
    this.screens = new ScreenManager(this.memory, bundle, this.zoneLoader);
    this.renderer = new AnticGtiaRenderer(this.canvas, this.memory, bundle);

    this.autoLoopEnabled = true;
    this.lastTime = performance.now();
    this.accumulator = 0.0;
    this.FRAME_DT = 20.0; // 50.00 Hz PAL VBI (20.0 ms)

    this.bindUI();
    this.api = installLockstepAPI(this);

    // Load Zone 1 initially
    this.api.loadZone(1, 3);
  }

  bindUI() {
    const screenSelect = document.getElementById("ui-screen-select");
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const btnAudio = document.getElementById("btn-audio-toggle");
    const btnCrt = document.getElementById("btn-crt-toggle");
    const crtOverlay = document.getElementById("crt-overlay");

    if (screenSelect) {
      screenSelect.addEventListener("change", () => {
        const val = screenSelect.value;
        if (val === "ingame") {
          this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
        } else {
          this.api.loadScreen(val);
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
      });
    }

    if (btnAudio) {
      btnAudio.addEventListener("click", async () => {
        await this.pokey.enableAudio();
        btnAudio.textContent = "POKEY Audio Active";
      });
    }

    if (btnCrt && crtOverlay) {
      btnCrt.addEventListener("click", () => {
        crtOverlay.classList.toggle("active");
      });
    }
  }

  updateTelemetryUI() {
    const ram = this.memory.ram;
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const px = Math.floor(ram[0x0560] / 2);
    const py = Math.floor(ram[0x0561] / 2);
    const dl = (ram[0x0231] << 8) | ram[0x0230];
    const lms0 = (ram[0x3C95] << 8) | ram[0x3C94];
    const timerHex = (((ram[0x009F] & 0xFF) << 8) | (ram[0x009E] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");
    const scoreHex = (((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");

    setTxt("dbg-zone", `${(ram[0x0555] & 0x0F) + 1}`);
    setTxt("dbg-player-xy", `(${px}, ${py})`);
    setTxt("dbg-char-xy", `(${ram[0x0560]}, ${ram[0x0561]})`);
    setTxt("dbg-dlist", `$${dl.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt("dbg-lms0", `$${lms0.toString(16).toUpperCase().padStart(4, "0")}`);
    setTxt("dbg-scroll", `$${ram[0xD404].toString(16).padStart(2, "0")} / $${ram[0xD405].toString(16).padStart(2, "0")}`);
    setTxt("dbg-timer", timerHex);
    setTxt("dbg-score", scoreHex);
    setTxt("dbg-plutonium", `${ram[0x0598]}`);
    setTxt("dbg-mats", `${ram[0x0576]}`);

    const items = [];
    if (ram[0x0574]) items.push("KEY");
    if (ram[0x0575]) items.push("SPADE");
    if (ram[0x05AF]) items.push("PLUTONIUM");
    setTxt("dbg-inv", items.length ? items.join("+") : "NONE");

    const pRegs = this.pokey.getPokeyRegs().slice(0, 8).map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    setTxt("dbg-pokey", pRegs);
  }

  startLoop() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("lockstep") === "1") {
      // Disable background RAF loop during deterministic Playwright Oracle testing
      this.autoLoopEnabled = false;
      return;
    }

    const tick = (now) => {
      if (this.autoLoopEnabled) {
        let delta = now - this.lastTime;
        if (delta > 100) delta = 100;
        this.lastTime = now;
        this.accumulator += delta;

        while (this.accumulator >= this.FRAME_DT) {
          this.api.stepFrame(null);
          this.accumulator -= this.FRAME_DT;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

async function bootstrap() {
  const res = await fetch("assets/zonex_rom_bundle.json");
  const bundle = await res.json();
  const app = new ZoneXApplication(bundle);
  app.startLoop();
}

bootstrap();
