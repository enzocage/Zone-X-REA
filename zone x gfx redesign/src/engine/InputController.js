/**
 * src/engine/InputController.js
 * Clean Keyboard, Joystick & Atari Console Button Input Controller.
 */

import { DisplayListAddress, ScreenMode, SystemAddressMap } from "../config/Constants.js";

const ATARI_AZ_KEYCODES = Object.freeze([
  0x3F, 0x15, 0x12, 0x3A, 0x2A, 0x38, 0x3D, 0x39, 0x0D, 0x01, 0x05, 0x00, 0x25,
  0x23, 0x08, 0x0A, 0x2F, 0x28, 0x3E, 0x2D, 0x0B, 0x10, 0x2E, 0x16, 0x2B, 0x17,
]);

const ATARI_09_KEYCODES = Object.freeze([
  0x32, 0x1F, 0x1E, 0x1A, 0x18, 0x1D, 0x1B, 0x33, 0x35, 0x30,
]);

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
        if (document.activeElement && document.activeElement.tagName !== "SELECT") {
          e.preventDefault();
        }
      }
      this.pressedKeys.add(e.code);

      if (e.code === "F2") {
        this.consoleState = 0x05; // SELECT
      } else if (e.code === "F3") {
        this.consoleState = 0x03; // OPTION
      } else if (e.code === "F4") {
        this.consoleState = 0x06; // START
      }

      // In-game special keys: P = Pause ($21), K = Abort Life ($3F)
      if (e.code === "KeyP") {
        this.lastKeyCode = 0x21;
        this.state.ram[SystemAddressMap.CH_KEY] = 0x21;
      } else if (e.code === "KeyK") {
        this.lastKeyCode = 0x3F;
        this.state.ram[SystemAddressMap.CH_KEY] = 0x3F;
      }

      // Hall of Fame ($8F08) keyboard name entry ($91C8..$923D)
      const dlAddr = this.state.displayListAddress;
      if (
        dlAddr === DisplayListAddress[ScreenMode.HALL_OF_FAME] &&
        this.state.ram[0x05D5] === 0
      ) {
        if (e.code === "Enter") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x0C;
        } else if (e.code === "Backspace") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x34;
        } else if (e.code === "Space") {
          this.state.ram[SystemAddressMap.CH_KEY] = 0x21;
        } else if (e.code.startsWith("Key") && e.code.length === 4) {
          const chIdx = e.code.charCodeAt(3) - 65;
          if (chIdx >= 0 && chIdx < 26) {
            this.state.ram[SystemAddressMap.CH_KEY] = ATARI_AZ_KEYCODES[chIdx];
          }
        } else if (e.code.startsWith("Digit") && e.code.length === 6) {
          const dIdx = e.code.charCodeAt(5) - 48;
          if (dIdx >= 0 && dIdx < 10) {
            this.state.ram[SystemAddressMap.CH_KEY] = ATARI_09_KEYCODES[dIdx];
          }
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.pressedKeys.delete(e.code);
      if (e.code === "F2" || e.code === "F3" || e.code === "F4") {
        this.consoleState = 0x07;
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
      this.pressedKeys.has("KeyZ") ||
      this.pressedKeys.has("KeyX")
        ? 0
        : 1;

    return { stick, strig, consol: this.consoleState & 0x07 };
  }

  updateHardwareInputRegisters() {
    const { stick, strig, consol } = this.readJoystickState();
    const ram = this.state.ram;
    ram[SystemAddressMap.STICK0] = stick;
    ram[0xD300] = (stick << 4) | (stick & 0x0F);
    ram[SystemAddressMap.STRIG0] = strig;
    ram[0xD010] = strig;
    ram[SystemAddressMap.CONSOL] = consol;
  }
}
