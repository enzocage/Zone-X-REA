/**
 * zonex-web/js/hardware/input_bridge.js
 * Maps Keyboard & deterministic TAS input masks to Atari 800XL Hardware Registers:
 * - $D300 (PORTA) / $0278 (STICK0): Bit 0=Up, 1=Down, 2=Left, 3=Right (active-low on Atari hardware)
 * - $D010 (TRIG0) / $0284 (STRIG0): Fire button (0=Pressed, 1=Released)
 * - $D01F (CONSOL): Bit 0=Start, 1=Select, 2=Option
 * - $D209 (KBCODE) / $02FC (CH): Keyboard action keys ('C'=CH ITEM, 'P'=PAUSE, 'A'=ABORT)
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

export class InputBridge {
  constructor(memory) {
    this.memory = memory;
    this.liveMask = 0;
    this.oneShotMask = 0;
    this.bindKeyboard();
  }

  bindKeyboard() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask |= INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask |= INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask |= INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask |= INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ") {
        this.liveMask |= INPUT_BITS.FIRE;
        this.oneShotMask |= INPUT_BITS.FIRE;
      }
      if (e.code === "KeyC") this.oneShotMask |= INPUT_BITS.CH_ITEM;
      if (e.code === "KeyP") this.oneShotMask |= INPUT_BITS.PAUSE;
      if (e.code === "KeyK") this.oneShotMask |= INPUT_BITS.ABORT;
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowUp" || e.code === "KeyW") this.liveMask &= ~INPUT_BITS.UP;
      if (e.code === "ArrowDown" || e.code === "KeyS") this.liveMask &= ~INPUT_BITS.DOWN;
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.liveMask &= ~INPUT_BITS.LEFT;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.liveMask &= ~INPUT_BITS.RIGHT;
      if (e.code === "Space" || e.code === "KeyZ") this.liveMask &= ~INPUT_BITS.FIRE;
    });
  }

  applyMaskToRegisters(mask) {
    const ram = this.memory.ram;
    // Active-low nibble inSTICK0 ($0278) & PORTA ($D300)
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
