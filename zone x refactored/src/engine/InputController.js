/**
 * src/engine/InputController.js
 * Clean Keyboard, Joystick & Atari Console Button Input Controller.
 */

import { SystemAddressMap } from "../config/Constants.js";

const KEY_TO_ATARI_SCAN_CODE = Object.freeze({
  KeyP: 0x0A,
  KeyA: 0x3F,
  KeyB: 0x15,
  KeyC: 0x12,
  KeyD: 0x3A,
  KeyE: 0x2A,
  KeyF: 0x38,
  KeyG: 0x3D,
  KeyH: 0x39,
  KeyI: 0x0D,
  KeyJ: 0x01,
  KeyK: 0x05,
  KeyL: 0x00,
  KeyM: 0x25,
  KeyN: 0x23,
  KeyO: 0x08,
  KeyQ: 0x2F,
  KeyR: 0x28,
  KeyS: 0x3E,
  KeyT: 0x2D,
  KeyU: 0x0B,
  KeyV: 0x10,
  KeyW: 0x2E,
  KeyX: 0x16,
  KeyY: 0x2B,
  KeyZ: 0x17,
  Enter: 0x0C,
  Backspace: 0x34,
  Escape: 0x1C,
});

export class InputController {
  constructor(gameState) {
    this.state = gameState;
    this.pressedKeys = new Set();
    this.lastKeyCode = 0xFF;
    this.consoleState = 0x07;
    this.bindBrowserEvents();
  }

  isEditorModalActive() {
    if (typeof document === "undefined") return false;
    const modal = document.getElementById("editor-modal");
    return Boolean(modal && !modal.classList.contains("hidden"));
  }

  bindBrowserEvents() {
    if (typeof window === "undefined") return;

    window.addEventListener("keydown", (e) => {
      if (this.isEditorModalActive()) return;

      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "F2",
          "F3",
          "F4",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
      this.pressedKeys.add(e.code);

      if (e.code === "F2") {
        this.consoleState &= ~0x02; // SELECT
      } else if (e.code === "F3") {
        this.consoleState &= ~0x04; // OPTION
      } else if (e.code === "F4") {
        this.consoleState &= ~0x01; // START
      } else if (KEY_TO_ATARI_SCAN_CODE[e.code] !== undefined) {
        this.lastKeyCode = KEY_TO_ATARI_SCAN_CODE[e.code];
        this.state.ram[SystemAddressMap.CH_KEY] = this.lastKeyCode;
      }
    });

    window.addEventListener("keyup", (e) => {
      this.pressedKeys.delete(e.code);
      if (e.code === "F2") {
        this.consoleState |= 0x02;
      } else if (e.code === "F3") {
        this.consoleState |= 0x04;
      } else if (e.code === "F4") {
        this.consoleState |= 0x01;
      }
    });
  }

  readJoystickState() {
    let stick = 0x0F;
    if (this.pressedKeys.has("ArrowUp") || this.pressedKeys.has("KeyW")) stick &= ~0x01;
    if (this.pressedKeys.has("ArrowDown") || this.pressedKeys.has("KeyS")) stick &= ~0x02;
    if (this.pressedKeys.has("ArrowLeft") || this.pressedKeys.has("KeyA")) stick &= ~0x04;
    if (this.pressedKeys.has("ArrowRight") || this.pressedKeys.has("KeyD")) stick &= ~0x08;

    const strig =
      this.pressedKeys.has("Space") ||
      this.pressedKeys.has("ControlLeft") ||
      this.pressedKeys.has("ControlRight") ||
      this.pressedKeys.has("KeyZ")
        ? 0
        : 1;

    return { stick, strig, consol: this.consoleState & 0x07 };
  }

  updateHardwareInputRegisters() {
    const { stick, strig, consol } = this.readJoystickState();
    const ram = this.state.ram;
    ram[SystemAddressMap.STICK0] = stick;
    ram[0xD300] = (ram[0xD300] & 0xF0) | (stick & 0x0F);
    ram[SystemAddressMap.STRIG0] = strig;
    ram[0xD010] = strig;
    ram[SystemAddressMap.CONSOL] = consol;
  }
}
