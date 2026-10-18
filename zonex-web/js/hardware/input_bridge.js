/**
 * zonex-web/js/hardware/input_bridge.js
 * Maps Keyboard & deterministic TAS input masks to Atari 800XL Hardware Registers:
 * - $D300 (PORTA) / $0278 (STICK0): Bit 0=Up, 1=Down, 2=Left, 3=Right (active-low on Atari hardware)
 * - $D010 (TRIG0) / $0284 (STRIG0): Fire button (0=Pressed, 1=Released)
 * - $D01F (CONSOL): Bit 0=Start (0x06), Bit 1=Select (0x05), Bit 2=Option (0x03), 0x07=None
 * - $D209 (KBCODE) / $02FC (CH): Atari 800XL hardware keycodes (Pause=0x21, Abort=0x3F, HOF A-Z/0-9/Enter/BS)
 */

export const INPUT_BITS = {
  UP: 0x01,
  DOWN: 0x02,
  LEFT: 0x04,
  RIGHT: 0x08,
  FIRE: 0x10,
  CH_ITEM: 0x20,
  PAUSE: 0x40,
  ABORT: 0x80,
};

const ATARI_AZ_KEYCODES = [
  0x3F, 0x15, 0x12, 0x3A, 0x2A, 0x38, 0x3D, 0x39, 0x0D, 0x01, 0x05, 0x00, 0x25,
  0x23, 0x08, 0x0A, 0x2F, 0x28, 0x3E, 0x2D, 0x0B, 0x10, 0x2E, 0x16, 0x2B, 0x17,
];

const ATARI_09_KEYCODES = [
  0x32, 0x1F, 0x1E, 0x1A, 0x18, 0x1D, 0x1B, 0x33, 0x35, 0x30,
];

export class InputBridge {
  constructor(memory) {
    this.memory = memory;
    this.liveMask = 0;
    this.oneShotMask = 0;
    this.consolState = 0x07;
    this.bindKeyboard();
  }

  bindKeyboard() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "F2", "F3", "F4"].includes(e.code)) {
        if (document.activeElement && document.activeElement.tagName !== "SELECT") {
          e.preventDefault();
        }
      }

      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask |= INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask |= INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask |= INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask |= INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ" || e.code === "KeyX" || e.code === "ControlLeft" || e.code === "ControlRight") {
        this.liveMask |= INPUT_BITS.FIRE;
        this.oneShotMask |= INPUT_BITS.FIRE;
      }
      if (e.code === "KeyC") this.oneShotMask |= INPUT_BITS.CH_ITEM;
      if (e.code === "KeyP") {
        this.oneShotMask |= INPUT_BITS.PAUSE;
        this.memory.ram[0x02FC] = 0x21; // Atari Spacebar code -> Pause toggle in $63E0
      }
      if (e.code === "KeyK") {
        this.oneShotMask |= INPUT_BITS.ABORT;
        this.memory.ram[0x02FC] = 0x3F; // Atari 'A' code -> Abort life in $63E7
      }

      // Console keys F2=Select, F3=Option, F4=Start
      if (e.code === "F2") this.consolState = 0x05;
      if (e.code === "F3") this.consolState = 0x03;
      if (e.code === "F4") this.consolState = 0x06;

      // Hall of Fame ($8F08) keyboard name entry ($91C8..$923D)
      const dlAddr = this.memory.ram[0x0230] | (this.memory.ram[0x0231] << 8);
      if (dlAddr === 0x8F08 && this.memory.ram[0x05D5] === 0) {
        if (e.code === "Enter") {
          this.memory.ram[0x02FC] = 0x0C;
        } else if (e.code === "Backspace") {
          this.memory.ram[0x02FC] = 0x34;
        } else if (e.code === "Space") {
          this.memory.ram[0x02FC] = 0x21;
        } else if (e.code.startsWith("Key") && e.code.length === 4) {
          const chIdx = e.code.charCodeAt(3) - 65;
          if (chIdx >= 0 && chIdx < 26) {
            this.memory.ram[0x02FC] = ATARI_AZ_KEYCODES[chIdx];
          }
        } else if (e.code.startsWith("Digit") && e.code.length === 6) {
          const dIdx = e.code.charCodeAt(5) - 48;
          if (dIdx >= 0 && dIdx < 10) {
            this.memory.ram[0x02FC] = ATARI_09_KEYCODES[dIdx];
          }
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask &= ~INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask &= ~INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask &= ~INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask &= ~INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ" || e.code === "KeyX" || e.code === "ControlLeft" || e.code === "ControlRight") {
        this.liveMask &= ~INPUT_BITS.FIRE;
      }
      if (e.code === "F2" || e.code === "F3" || e.code === "F4") {
        this.consolState = 0x07;
      }
    });
  }

  applyMaskToRegisters(mask) {
    const ram = this.memory.ram;
    // Active-low nibble in STICK0 ($0278) & PORTA ($D300)
    let stick = 0x0F;
    if (mask & INPUT_BITS.UP) stick &= ~0x01;
    if (mask & INPUT_BITS.DOWN) stick &= ~0x02;
    if (mask & INPUT_BITS.LEFT) stick &= ~0x04;
    if (mask & INPUT_BITS.RIGHT) stick &= ~0x08;

    ram[0x0278] = stick;
    ram[0xD300] = (stick << 4) | stick;

    const trig = (mask & INPUT_BITS.FIRE) ? 0x00 : 0x01;
    ram[0x0284] = trig;
    ram[0xD010] = trig;
    ram[0xD01F] = this.consolState;
  }

  consumeFrameInput(overrideMask = null) {
    if (overrideMask !== null && overrideMask !== undefined) {
      this.applyMaskToRegisters(overrideMask);
      return overrideMask;
    }
    const combined = this.liveMask | this.oneShotMask;
    this.oneShotMask = 0;
    this.applyMaskToRegisters(combined);
    return combined;
  }
}
