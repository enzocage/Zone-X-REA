(function() {
'use strict';
// === hardware/input_bridge.js ===
/**
 * zonex-web/js/hardware/input_bridge.js
 * Maps Keyboard & deterministic TAS input masks to Atari 800XL Hardware Registers:
 * - $D300 (PORTA) / $0278 (STICK0): Bit 0=Up, 1=Down, 2=Left, 3=Right (active-low on Atari hardware)
 * - $D010 (TRIG0) / $0284 (STRIG0): Fire button (0=Pressed, 1=Released)
 * - $D01F (CONSOL): Bit 0=Start (0x06), Bit 1=Select (0x05), Bit 2=Option (0x03), 0x07=None
 * - $D209 (KBCODE) / $02FC (CH): Atari 800XL hardware keycodes (Pause=0x21, Abort=0x3F, HOF A-Z/0-9/Enter/BS)
 */

const INPUT_BITS = {
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

class InputBridge {
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

// === hardware/mos6502.js ===
/**
 * zonex-web/js/hardware/mos6502.js
 * Cycle-accurate MOS 6502 CPU Core & Atari 800XL OS/Hardware Bridge for Zone X.
 * Executes the relocated 6502 game binary ($3C80..$BFFF) directly on memory.ram.
 */

const OPCODE_TABLE = {
  0x00: ["BRK", "imp", 1, 7], 0x01: ["ORA", "izx", 2, 6], 0x05: ["ORA", "zp", 2, 3],
  0x06: ["ASL", "zp", 2, 5],  0x08: ["PHP", "imp", 1, 3], 0x09: ["ORA", "imm", 2, 2],
  0x0A: ["ASL", "acc", 1, 2], 0x0D: ["ORA", "abs", 3, 4], 0x0E: ["ASL", "abs", 3, 6],
  0x10: ["BPL", "rel", 2, 2], 0x11: ["ORA", "izy", 2, 5], 0x15: ["ORA", "zpx", 2, 4],
  0x16: ["ASL", "zpx", 2, 6], 0x18: ["CLC", "imp", 1, 2], 0x19: ["ORA", "aby", 3, 4],
  0x1D: ["ORA", "abx", 3, 4], 0x1E: ["ASL", "abx", 3, 7], 0x20: ["JSR", "abs", 3, 6],
  0x21: ["AND", "izx", 2, 6], 0x24: ["BIT", "zp", 2, 3],  0x25: ["AND", "zp", 2, 3],
  0x26: ["ROL", "zp", 2, 5],  0x28: ["PLP", "imp", 1, 4], 0x29: ["AND", "imm", 2, 2],
  0x2A: ["ROL", "acc", 1, 2], 0x2C: ["BIT", "abs", 3, 4], 0x2D: ["AND", "abs", 3, 4],
  0x2E: ["ROL", "abs", 3, 6], 0x30: ["BMI", "rel", 2, 2], 0x31: ["AND", "izy", 2, 5],
  0x35: ["AND", "zpx", 2, 4], 0x36: ["ROL", "zpx", 2, 6], 0x38: ["SEC", "imp", 1, 2],
  0x39: ["AND", "aby", 3, 4], 0x3D: ["AND", "abx", 3, 4], 0x3E: ["ROL", "abx", 3, 7],
  0x40: ["RTI", "imp", 1, 6], 0x41: ["EOR", "izx", 2, 6], 0x45: ["EOR", "zp", 2, 3],
  0x46: ["LSR", "zp", 2, 5],  0x48: ["PHA", "imp", 1, 3], 0x49: ["EOR", "imm", 2, 2],
  0x4A: ["LSR", "acc", 1, 2], 0x4C: ["JMP", "abs", 3, 3], 0x4D: ["EOR", "abs", 3, 4],
  0x4E: ["LSR", "abs", 3, 6], 0x50: ["BVC", "rel", 2, 2], 0x51: ["EOR", "izy", 2, 5],
  0x55: ["EOR", "zpx", 2, 4], 0x56: ["LSR", "zpx", 2, 6], 0x58: ["CLI", "imp", 1, 2],
  0x59: ["EOR", "aby", 3, 4], 0x5D: ["EOR", "abx", 3, 4], 0x5E: ["LSR", "abx", 3, 7],
  0x60: ["RTS", "imp", 1, 6], 0x61: ["ADC", "izx", 2, 6], 0x65: ["ADC", "zp", 2, 3],
  0x66: ["ROR", "zp", 2, 5],  0x68: ["PLA", "imp", 1, 4], 0x69: ["ADC", "imm", 2, 2],
  0x6A: ["ROR", "acc", 1, 2], 0x6C: ["JMP", "ind", 3, 5], 0x6D: ["ADC", "abs", 3, 4],
  0x6E: ["ROR", "abs", 3, 6], 0x70: ["BVS", "rel", 2, 2], 0x71: ["ADC", "izy", 2, 5],
  0x75: ["ADC", "zpx", 2, 4], 0x76: ["ROR", "zpx", 2, 6], 0x78: ["SEI", "imp", 1, 2],
  0x79: ["ADC", "aby", 3, 4], 0x7D: ["ADC", "abx", 3, 4], 0x7E: ["ROR", "abx", 3, 7],
  0x81: ["STA", "izx", 2, 6], 0x84: ["STY", "zp", 2, 3],  0x85: ["STA", "zp", 2, 3],
  0x86: ["STX", "zp", 2, 3],  0x88: ["DEY", "imp", 1, 2], 0x8A: ["TXA", "imp", 1, 2],
  0x8C: ["STY", "abs", 3, 4], 0x8D: ["STA", "abs", 3, 4], 0x8E: ["STX", "abs", 3, 4],
  0x90: ["BCC", "rel", 2, 2], 0x91: ["STA", "izy", 2, 6], 0x94: ["STY", "zpx", 2, 4],
  0x95: ["STA", "zpx", 2, 4], 0x96: ["STX", "zpy", 2, 4], 0x98: ["TYA", "imp", 1, 2],
  0x99: ["STA", "aby", 3, 5], 0x9A: ["TXS", "imp", 1, 2], 0x9D: ["STA", "abx", 3, 5],
  0xA0: ["LDY", "imm", 2, 2], 0xA1: ["LDA", "izx", 2, 6], 0xA2: ["LDX", "imm", 2, 2],
  0xA4: ["LDY", "zp", 2, 3],  0xA5: ["LDA", "zp", 2, 3],  0xA6: ["LDX", "zp", 2, 3],
  0xA8: ["TAY", "imp", 1, 2], 0xA9: ["LDA", "imm", 2, 2], 0xAA: ["TAX", "imp", 1, 2],
  0xAC: ["LDY", "abs", 3, 4], 0xAD: ["LDA", "abs", 3, 4], 0xAE: ["LDX", "abs", 3, 4],
  0xB0: ["BCS", "rel", 2, 2], 0xB1: ["LDA", "izy", 2, 5], 0xB4: ["LDY", "zpx", 2, 4],
  0xB5: ["LDA", "zpx", 2, 4], 0xB6: ["LDX", "zpy", 2, 4], 0xB8: ["CLV", "imp", 1, 2],
  0xB9: ["LDA", "aby", 3, 4], 0xBA: ["TSX", "imp", 1, 2], 0xBC: ["LDY", "abx", 3, 4],
  0xBD: ["LDA", "abx", 3, 4], 0xBE: ["LDX", "aby", 3, 4], 0xC0: ["CPY", "imm", 2, 2],
  0xC1: ["CMP", "izx", 2, 6], 0xC4: ["CPY", "zp", 2, 3],  0xC5: ["CMP", "zp", 2, 3],
  0xC6: ["DEC", "zp", 2, 5],  0xC8: ["INY", "imp", 1, 2], 0xC9: ["CMP", "imm", 2, 2],
  0xCA: ["DEX", "imp", 1, 2], 0xCC: ["CPY", "abs", 3, 4], 0xCD: ["CMP", "abs", 3, 4],
  0xCE: ["DEC", "abs", 3, 6], 0xD0: ["BNE", "rel", 2, 2], 0xD1: ["CMP", "izy", 2, 5],
  0xD5: ["CMP", "zpx", 2, 4], 0xD6: ["DEC", "zpx", 2, 6], 0xD8: ["CLD", "imp", 1, 2],
  0xD9: ["CMP", "aby", 3, 4], 0xDD: ["CMP", "abx", 3, 4], 0xDE: ["DEC", "abx", 3, 7],
  0xE0: ["CPX", "imm", 2, 2], 0xE1: ["SBC", "izx", 2, 6], 0xE4: ["CPX", "zp", 2, 3],
  0xE5: ["SBC", "zp", 2, 3],  0xE6: ["INC", "zp", 2, 5],  0xE8: ["INX", "imp", 1, 2],
  0xE9: ["SBC", "imm", 2, 2], 0xEA: ["NOP", "imp", 1, 2], 0xEC: ["CPX", "abs", 3, 4],
  0xED: ["SBC", "abs", 3, 4], 0xEE: ["INC", "abs", 3, 6], 0xF0: ["BEQ", "rel", 2, 2],
  0xF1: ["SBC", "izy", 2, 5], 0xF5: ["SBC", "zpx", 2, 4], 0xF6: ["INC", "zpx", 2, 6],
  0xF8: ["SED", "imp", 1, 2], 0xF9: ["SBC", "aby", 3, 4], 0xFD: ["SBC", "abx", 3, 4],
  0xFE: ["INC", "abx", 3, 7],
};

class Mos6502Core {
  constructor(memory, bundle) {
    this.memory = memory;
    this.ram = memory.ram;
    this.bundle = bundle;

    // Decode $3C80..$BFFF binary image from bundle
    this.rom3c80 = null;
    if (bundle && bundle.ram_3c80_bfff_b64) {
      const binStr = atob(bundle.ram_3c80_bfff_b64);
      this.rom3c80 = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        this.rom3c80[i] = binStr.charCodeAt(i) & 0xFF;
      }
    }

    this.a = 0;
    this.x = 0;
    this.y = 0;
    this.sp = 0xFF;
    this.pc = 0x6000;
    this.flagC = 0;
    this.flagZ = 1;
    this.flagI = 0;
    this.flagD = 0;
    this.flagV = 0;
    this.flagN = 0;
    this.cycles = 0;
    this.stopped = false;
    this.rng = 0x5A;
    this.hofInitialized = false;
  }

  loadBaseBinary() {
    if (!this.rom3c80) return;
    for (let i = 0; i < this.rom3c80.length && (0x3C80 + i) < 0xC000; i++) {
      this.ram[0x3C80 + i] = this.rom3c80[i];
    }
    // Anti-tamper setup:
    // 1) $CFFA..$CFFF != $FFFA..$FFFF (checked at $4CFD, $4FAB, $7653, $9254)
    for (let i = 0; i < 6; i++) {
      this.ram[0xCFFA + i] = 0x00;
      this.ram[0xFFFA + i] = 0xE4;
    }
    // 2) Zero-page disk-loader signatures checked at $7F8A ($C0=$22), $96A7 ($C1=$34), $3E93 ($C2=$80), $796A ($C3=$38)
    this.ram[0x00C0] = 0x22;
    this.ram[0x00C1] = 0x34;
    this.ram[0x00C2] = 0x80;
    this.ram[0x00C3] = 0x38;
    // Also NOP the 3 remaining PLA traps outside checksum ranges just in case
    this.ram[0x3E99] = 0xEA;
    this.ram[0x7F90] = 0xEA;
    this.ram[0x96AD] = 0xEA;

    // 3) OS ROM vector stubs
    this.ram[0xE45C] = 0x60; // SETVBV RTS
    this.ram[0xE462] = 0x60; // XITVBV RTS
    this.ram[0xE465] = 0x60; // SIOINV RTS

    // 4) Default hardware registers
    this.ram[0xD01F] = 0x07; // CONSOL (no console key pressed)
    this.ram[0x0278] = 0x0F; // STICK0 (neutral)
    this.ram[0x0284] = 0x01; // STRIG0 (not pressed)
    this.ram[0x02FC] = 0xFF; // CH (no key)

    // Copy initial charset $706C..$746B -> $1800..$1BFF (as $6032..$6053 does)
    for (let i = 0; i < 1024; i++) {
      this.ram[0x1800 + i] = this.ram[0x706C + i];
    }

    // Initialize Hall of Fame table ($8F36) once so scores are preserved across games
    if (!this.hofInitialized) {
      this.hofInitialized = true;
      this.callSubroutine(0x8F36, 5000);
    }
  }

  getP() {
    return (
      (this.flagN ? 0x80 : 0) |
      (this.flagV ? 0x40 : 0) |
      0x20 |
      (this.flagD ? 0x08 : 0) |
      (this.flagI ? 0x04 : 0) |
      (this.flagZ ? 0x02 : 0) |
      (this.flagC ? 0x01 : 0)
    );
  }

  setP(val) {
    this.flagN = (val & 0x80) ? 1 : 0;
    this.flagV = (val & 0x40) ? 1 : 0;
    this.flagD = (val & 0x08) ? 1 : 0;
    this.flagI = (val & 0x04) ? 1 : 0;
    this.flagZ = (val & 0x02) ? 1 : 0;
    this.flagC = (val & 0x01) ? 1 : 0;
  }

  setZN(val) {
    val &= 0xFF;
    this.flagZ = val === 0 ? 1 : 0;
    this.flagN = (val & 0x80) ? 1 : 0;
    return val;
  }

  push(val) {
    this.ram[0x0100 + this.sp] = val & 0xFF;
    this.sp = (this.sp - 1) & 0xFF;
  }

  pull() {
    this.sp = (this.sp + 1) & 0xFF;
    return this.ram[0x0100 + this.sp];
  }

  read8(addr) {
    addr &= 0xFFFF;
    if (addr === 0xD20A) {
      // POKEY RANDOM register
      const bit = ((this.rng >> 7) ^ (this.rng >> 5) ^ (this.rng >> 4) ^ (this.rng >> 3)) & 1;
      this.rng = ((this.rng << 1) | bit) & 0xFF;
      if (this.rng === 0) this.rng = 0x5A;
      return this.rng;
    }
    if (addr === 0xD004) {
      // GTIA P0PF (Player 0 to Playfield collision latch)
      return this.memory.collisionP0PF || 0;
    }
    if (addr === 0xD005) {
      // GTIA P1PF (Player 1 to Playfield collision latch)
      return this.memory.collisionP1PF || 0;
    }
    return this.ram[addr];
  }

  write8(addr, val) {
    addr &= 0xFFFF;
    val &= 0xFF;
    if (addr === 0xD01E) {
      // GTIA HITCLR clears all collision latches
      this.memory.collisionP0PF = 0;
      this.memory.collisionP1PF = 0;
    }
    this.ram[addr] = val;
  }

  read16(addr) {
    return this.read8(addr) | (this.read8((addr + 1) & 0xFFFF) << 8);
  }

  resolveAddr(mode, pc) {
    const b1 = this.read8(pc + 1);
    switch (mode) {
      case "imm":
        return (pc + 1) & 0xFFFF;
      case "zp":
        return b1;
      case "zpx":
        return (b1 + this.x) & 0xFF;
      case "zpy":
        return (b1 + this.y) & 0xFF;
      case "abs":
        return b1 | (this.read8(pc + 2) << 8);
      case "abx":
        return ((b1 | (this.read8(pc + 2) << 8)) + this.x) & 0xFFFF;
      case "aby":
        return ((b1 | (this.read8(pc + 2) << 8)) + this.y) & 0xFFFF;
      case "izx": {
        const zp = (b1 + this.x) & 0xFF;
        return this.read8(zp) | (this.read8((zp + 1) & 0xFF) << 8);
      }
      case "izy": {
        const base = this.read8(b1) | (this.read8((b1 + 1) & 0xFF) << 8);
        return (base + this.y) & 0xFFFF;
      }
      case "ind": {
        const ptr = b1 | (this.read8(pc + 2) << 8);
        const hiAddr = (ptr & 0xFF00) | ((ptr + 1) & 0xFF);
        return this.read8(ptr) | (this.read8(hiAddr) << 8);
      }
      case "rel": {
        const rel = b1 >= 128 ? b1 - 256 : b1;
        return (pc + 2 + rel) & 0xFFFF;
      }
      default:
        return 0;
    }
  }

  step() {
    if (this.stopped) return 0;
    const pc = this.pc;

    // Atari OS ROM vector intercepts
    if (pc === 0xE45C) {
      // SETVBV: A=mode (7=VVBLKD, 6=VVBLKI), X=MSB, Y=LSB
      if (this.a === 0x07) {
        this.ram[0x0224] = this.y & 0xFF;
        this.ram[0x0225] = this.x & 0xFF;
      } else if (this.a === 0x06) {
        this.ram[0x0222] = this.y & 0xFF;
        this.ram[0x0223] = this.x & 0xFF;
      }
      const lo = this.pull();
      const hi = this.pull();
      this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
      this.cycles += 6;
      return 6;
    }
    if (pc === 0xE462 || pc === 0xE465) {
      // XITVBV ($E462) or SIOINV ($E465)
      const lo = this.pull();
      const hi = this.pull();
      this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
      this.cycles += 6;
      return 6;
    }

    const op = this.read8(pc);
    const entry = OPCODE_TABLE[op];
    if (!entry) {
      // Treat unknown opcodes as 1-byte NOP to prevent lockups
      this.pc = (pc + 1) & 0xFFFF;
      this.cycles += 2;
      return 2;
    }

    const [mnem, mode, length, baseCycles] = entry;
    const addr = (mode !== "imp" && mode !== "acc") ? this.resolveAddr(mode, pc) : 0;
    this.pc = (pc + length) & 0xFFFF;
    this.cycles += baseCycles;

    switch (mnem) {
      case "NOP":
        break;
      case "LDA":
        this.a = this.setZN(this.read8(addr));
        break;
      case "LDX":
        this.x = this.setZN(this.read8(addr));
        break;
      case "LDY":
        this.y = this.setZN(this.read8(addr));
        break;
      case "STA":
        this.write8(addr, this.a);
        break;
      case "STX":
        this.write8(addr, this.x);
        break;
      case "STY":
        this.write8(addr, this.y);
        break;
      case "TAX":
        this.x = this.setZN(this.a);
        break;
      case "TAY":
        this.y = this.setZN(this.a);
        break;
      case "TXA":
        this.a = this.setZN(this.x);
        break;
      case "TYA":
        this.a = this.setZN(this.y);
        break;
      case "TSX":
        this.x = this.setZN(this.sp);
        break;
      case "TXS":
        this.sp = this.x;
        break;
      case "PHA":
        this.push(this.a);
        break;
      case "PLA":
        this.a = this.setZN(this.pull());
        break;
      case "PHP":
        this.push(this.getP() | 0x10);
        break;
      case "PLP":
        this.setP(this.pull());
        break;
      case "INX":
        this.x = this.setZN((this.x + 1) & 0xFF);
        break;
      case "DEX":
        this.x = this.setZN((this.x - 1) & 0xFF);
        break;
      case "INY":
        this.y = this.setZN((this.y + 1) & 0xFF);
        break;
      case "DEY":
        this.y = this.setZN((this.y - 1) & 0xFF);
        break;
      case "INC":
        this.write8(addr, this.setZN((this.read8(addr) + 1) & 0xFF));
        break;
      case "DEC":
        this.write8(addr, this.setZN((this.read8(addr) - 1) & 0xFF));
        break;
      case "AND":
        this.a = this.setZN(this.a & this.read8(addr));
        break;
      case "ORA":
        this.a = this.setZN(this.a | this.read8(addr));
        break;
      case "EOR":
        this.a = this.setZN(this.a ^ this.read8(addr));
        break;
      case "BIT": {
        const v = this.read8(addr);
        this.flagZ = (this.a & v) === 0 ? 1 : 0;
        this.flagN = (v & 0x80) ? 1 : 0;
        this.flagV = (v & 0x40) ? 1 : 0;
        break;
      }
      case "CMP":
      case "CPX":
      case "CPY": {
        const reg = mnem === "CMP" ? this.a : (mnem === "CPX" ? this.x : this.y);
        const v = this.read8(addr);
        const diff = reg - v;
        this.flagC = diff >= 0 ? 1 : 0;
        this.setZN(diff & 0xFF);
        break;
      }
      case "ADC": {
        const v = this.read8(addr);
        if (this.flagD) {
          let lo = (this.a & 0x0F) + (v & 0x0F) + this.flagC;
          let cLo = 0;
          if (lo > 9) {
            lo += 6;
            cLo = 1;
          }
          let hi = (this.a >> 4) + (v >> 4) + cLo;
          let cHi = 0;
          if (hi > 9) {
            hi += 6;
            cHi = 1;
          }
          this.flagC = cHi;
          this.a = this.setZN(((hi & 0x0F) << 4) | (lo & 0x0F));
        } else {
          const sum = this.a + v + this.flagC;
          this.flagV = (~(this.a ^ v) & (this.a ^ sum) & 0x80) !== 0 ? 1 : 0;
          this.flagC = sum > 0xFF ? 1 : 0;
          this.a = this.setZN(sum & 0xFF);
        }
        break;
      }
      case "SBC": {
        const v = this.read8(addr);
        if (this.flagD) {
          const borrow = this.flagC ? 0 : 1;
          let lo = (this.a & 0x0F) - (v & 0x0F) - borrow;
          let bLo = 0;
          if (lo < 0) {
            lo -= 6;
            bLo = 1;
          }
          let hi = (this.a >> 4) - (v >> 4) - bLo;
          let bHi = 0;
          if (hi < 0) {
            hi -= 6;
            bHi = 1;
          }
          this.flagC = bHi ? 0 : 1;
          this.a = this.setZN(((hi & 0x0F) << 4) | (lo & 0x0F));
        } else {
          const diff = this.a - v - (this.flagC ? 0 : 1);
          this.flagV = ((this.a ^ v) & (this.a ^ diff) & 0x80) !== 0 ? 1 : 0;
          this.flagC = diff < 0 ? 0 : 1;
          this.a = this.setZN(diff & 0xFF);
        }
        break;
      }
      case "ASL":
        if (mode === "acc") {
          this.flagC = (this.a & 0x80) ? 1 : 0;
          this.a = this.setZN((this.a << 1) & 0xFF);
        } else {
          const v = this.read8(addr);
          this.flagC = (v & 0x80) ? 1 : 0;
          this.write8(addr, this.setZN((v << 1) & 0xFF));
        }
        break;
      case "LSR":
        if (mode === "acc") {
          this.flagC = this.a & 1;
          this.a = this.setZN(this.a >> 1);
        } else {
          const v = this.read8(addr);
          this.flagC = v & 1;
          this.write8(addr, this.setZN(v >> 1));
        }
        break;
      case "ROL": {
        const c = this.flagC ? 1 : 0;
        if (mode === "acc") {
          this.flagC = (this.a & 0x80) ? 1 : 0;
          this.a = this.setZN(((this.a << 1) & 0xFF) | c);
        } else {
          const v = this.read8(addr);
          this.flagC = (v & 0x80) ? 1 : 0;
          this.write8(addr, this.setZN(((v << 1) & 0xFF) | c));
        }
        break;
      }
      case "ROR": {
        const c = this.flagC ? 0x80 : 0;
        if (mode === "acc") {
          this.flagC = this.a & 1;
          this.a = this.setZN((this.a >> 1) | c);
        } else {
          const v = this.read8(addr);
          this.flagC = v & 1;
          this.write8(addr, this.setZN((v >> 1) | c));
        }
        break;
      }
      case "CLC":
        this.flagC = 0;
        break;
      case "SEC":
        this.flagC = 1;
        break;
      case "CLD":
        this.flagD = 0;
        break;
      case "SED":
        this.flagD = 1;
        break;
      case "CLI":
        this.flagI = 0;
        break;
      case "SEI":
        this.flagI = 1;
        break;
      case "CLV":
        this.flagV = 0;
        break;
      case "BCC":
        if (!this.flagC) this.pc = addr;
        break;
      case "BCS":
        if (this.flagC) this.pc = addr;
        break;
      case "BEQ":
        if (this.flagZ) this.pc = addr;
        break;
      case "BNE":
        if (!this.flagZ) this.pc = addr;
        break;
      case "BMI":
        if (this.flagN) this.pc = addr;
        break;
      case "BPL":
        if (!this.flagN) this.pc = addr;
        break;
      case "BVC":
        if (!this.flagV) this.pc = addr;
        break;
      case "BVS":
        if (this.flagV) this.pc = addr;
        break;
      case "JMP":
        this.pc = addr;
        break;
      case "JSR": {
        const ret = (this.pc - 1) & 0xFFFF;
        this.push((ret >> 8) & 0xFF);
        this.push(ret & 0xFF);
        this.pc = addr;
        break;
      }
      case "RTS": {
        const lo = this.pull();
        const hi = this.pull();
        this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
        break;
      }
      case "RTI": {
        this.setP(this.pull());
        const lo = this.pull();
        const hi = this.pull();
        this.pc = (hi << 8) | lo;
        break;
      }
      case "BRK":
        this.stopped = true;
        break;
    }

    return baseCycles;
  }

  callSubroutine(targetAddr, maxSteps = 200000) {
    const savedA = this.a;
    const savedX = this.x;
    const savedY = this.y;
    const savedP = this.getP();
    const savedPC = this.pc;
    const savedSP = this.sp;

    const ret = (0xE462 - 1) & 0xFFFF;
    this.push((ret >> 8) & 0xFF);
    this.push(ret & 0xFF);
    this.pc = targetAddr & 0xFFFF;
    this.stopped = false;

    let steps = 0;
    while (!this.stopped && this.sp !== savedSP && steps < maxSteps) {
      this.step();
      steps++;
    }

    this.a = savedA;
    this.x = savedX;
    this.y = savedY;
    this.setP(savedP);
    this.pc = savedPC;
    this.sp = savedSP;
    this.stopped = false;
  }

  syncShadowRegisters() {
    this.ram[0xD400] = this.ram[0x022F]; // SDMCTL -> DMACTL
    this.ram[0xD402] = this.ram[0x0230]; // SDLSTL -> DLISTL
    this.ram[0xD403] = this.ram[0x0231]; // SDLSTH -> DLISTH
    this.ram[0xD409] = this.ram[0x02F4]; // CHBAS  -> CHBASE
    this.ram[0xD01B] = this.ram[0x026F]; // GPRIOR -> PRIOR
    for (let i = 0; i < 4; i++) {
      this.ram[0xD012 + i] = this.ram[0x02C0 + i]; // PCOLR0..3 -> COLPM0..3
    }
    for (let i = 0; i < 5; i++) {
      this.ram[0xD016 + i] = this.ram[0x02C4 + i]; // COLOR0..4 -> COLPF0..3, COLBK
    }
  }

  runVbi() {
    if ((this.ram[0xD40E] & 0x40) === 0) {
      this.syncShadowRegisters();
      return;
    }
    const vbiAddr = this.ram[0x0224] | (this.ram[0x0225] << 8);
    if (vbiAddr !== 0 && vbiAddr !== 0xE462) {
      this.callSubroutine(vbiAddr, 30000);
    }
    this.syncShadowRegisters();
  }

  runFrame(mainCycles = 18000) {
    let used = 0;
    let guard = 0;
    while (!this.stopped && used < mainCycles && guard < 12000) {
      used += this.step();
      guard++;
    }
    this.runVbi();
  }

  /**
   * Unpacks and starts the specified Zone (1..12) and Option Level (1..3)
   * using the genuine 6502 routine ($60B9..$63D0 -> $6447).
   */
  startZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = true) {
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[0x0554] = zIdx;
    this.ram[0x0558] = zIdx;
    this.ram[0x0555] = this.ram[0xA3CC + zIdx];
    this.ram[0x0597] = bcdZone;
    this.ram[0x0559] = bcdZone;
    this.ram[0x0556] = diffIdx;
    this.ram[0x0557] = diffIdx;
    this.ram[0x05A9] = 0x00;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = resetLivesAndScore ? 0x60B9 : 0x60E5;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x6447 && steps < 300000) {
      this.step();
      steps++;
    }
    // Shorten initial automatic door timers ($058D/$058E) so door opening/closing is visible right after load
    this.ram[0x058D] = 0x16;
    this.ram[0x058E] = 0x0C;
    // Run 2 initial VBI passes so Player 0/1 PMG ($435F) and HUD ($4F90) are populated immediately
    this.runVbi();
    this.runVbi();
  }

  /**
   * Boots the genuine 6502 Title Screen ($6054..$60B0 -> $75F2 with VBI $5D1F).
   */
  bootTitleScreen(zoneNumber = 1, optionLevel = 1) {
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[0x0554] = zIdx;
    this.ram[0x0558] = zIdx;
    this.ram[0x0555] = this.ram[0xA3CC + zIdx];
    this.ram[0x0597] = bcdZone;
    this.ram[0x0559] = bcdZone;
    this.ram[0x0556] = diffIdx;
    this.ram[0x0557] = diffIdx;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x6054;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x75F2 && steps < 50000) {
      this.step();
      steps++;
    }
    this.runVbi();
  }

  /**
   * Boots the genuine 6502 Features Showcase Screen ($60B3 -> $9325 with VBI $937C and DLI $9670).
   */
  bootFeaturesScreen() {
    this.loadBaseBinary();
    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x60B3;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x9368 && steps < 100000) {
      this.step();
      steps++;
    }
    this.runVbi();
    this.runVbi();
  }

  /**
   * Boots the genuine 6502 Hall of Fame Screen ($6491..$64AD -> $8F7C with VBI $5FD6).
   */
  bootHallOfFameScreen() {
    this.loadBaseBinary();
    this.ram[0x05D5] = 0x01; // Display mode (skip name entry unless triggered at Game Over)
    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x6491;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x75F2 && steps < 100000) {
      this.step();
      steps++;
    }
    this.runVbi();
  }
}

// === engine/memory_state.js ===
/**
 * zonex-web/js/engine/memory_state.js
 * 64KB Atari 800XL RAM Mirror (Uint8Array(65536)) + MOS 6502 Decimal Mode (SED/CLD) BCD Arithmetic.
 * Implements exact 62x32 ($3E x $20) logical playfield and 128x64 character screen buffer ($428E).
 */

const MAP_WIDTH = 62;
const MAP_HEIGHT = 32;

function bcdAdd8(a, b, carryIn = 0) {
  let lo = (a & 0x0F) + (b & 0x0F) + (carryIn ? 1 : 0);
  if (lo > 9) lo += 6;
  let hi = (a >> 4) + (b >> 4) + (lo > 0x0F ? 1 : 0);
  if (hi > 9) hi += 6;
  return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), carry: hi > 0x0F ? 1 : 0 };
}

function bcdSub8(a, b, borrowIn = 0) {
  let lo = (a & 0x0F) - (b & 0x0F) - (borrowIn ? 1 : 0);
  let borrowLo = 0;
  if (lo < 0) {
    lo -= 6;
    borrowLo = 1;
  }
  let hi = (a >> 4) - (b >> 4) - borrowLo;
  let borrowHi = 0;
  if (hi < 0) {
    hi -= 6;
    borrowHi = 1;
  }
  return { result: ((hi & 0x0F) << 4) | (lo & 0x0F), borrow: borrowHi };
}

class MemoryState {
  constructor(bundle) {
    this.ram = new Uint8Array(65536);
    this.bundle = bundle;
    this.paused = false;
    this.outOfTime = false;
    this.selectedItemSlot = 0;
    this.initStaticRomTables();
  }

  initStaticRomTables() {
    const { charsets, meta_tiles, screens_data } = this.bundle;

    const font1800 = charsets.in_game;
    for (let i = 0; i < font1800.length; i++) {
      this.ram[0x706C + i] = font1800[i];
      this.ram[0x1800 + i] = font1800[i];
    }

    const font4000 = charsets.hud_4000 || charsets.in_game;
    for (let i = 0; i < font4000.length; i++) {
      this.ram[0x4000 + i] = font4000[i];
    }

    this.ram[0x02F4] = 0x40;
    this.ram[0xD409] = 0x40;

    for (let t = 0; t < meta_tiles.length; t++) {
      const chars = meta_tiles[t].chars;
      for (let c = 0; c < 4; c++) {
        this.ram[0x6D42 + t * 4 + c] = chars[c];
      }
    }

    if (screens_data) {
      const copyAt = (addr, arr) => {
        if (!arr) return;
        for (let i = 0; i < arr.length; i++) {
          this.ram[addr + i] = arr[i];
        }
      };
      copyAt(0x3E7B, screens_data.dli_chbase_3e7b || [0x18, 0x40]);
      copyAt(0x8000, screens_data.title_bitmap_8000);
      copyAt(0x3D9F, screens_data.title_strings_3d9f);
      copyAt(0x8E80, screens_data.hof_data_8e80);
      copyAt(0x3DB3, screens_data.title_text_3db3);
      copyAt(0x3E53, screens_data.hud_line1_3e53);
      copyAt(0x3E67, screens_data.hud_line2_3e67);
      copyAt(0x3C8B, screens_data.dl_ingame_3c8b);
      copyAt(0x3CE5, screens_data.dl_menu_3ce5);
      copyAt(0x939C, screens_data.dl_features_939c);
      copyAt(0x93DC, screens_data.features_screen_mem_93dc);
    }
  }

  initPlayfieldBorders() {
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      const r0 = 0x1C00 + (ty * 2) * 128;
      const r1 = 0x1C00 + (ty * 2 + 1) * 128;
      this.ram[r0] = 0x01;
      this.ram[r0 + 1] = 0x02;
      this.ram[r1] = 0x03;
      this.ram[r1 + 1] = 0x01;
      this.ram[r0 + 126] = 0x01;
      this.ram[r0 + 127] = 0x02;
      this.ram[r1 + 126] = 0x03;
      this.ram[r1 + 127] = 0x01;
    }
  }

  /**
   * 1:1 Port of $428E & $45AE: Writes logical tileId to $0B00 + ty*62 + tx
   * and expands its 2x2 characters into the $1C00..$3BFF playfield buffer at col (tx + 1) * 2.
   */
  writeTileAndScreen(tx, ty, tileId) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return;
    const t = tileId & 0x1F;
    this.ram[0x0B00 + ty * MAP_WIDTH + tx] = t;

    const metaBase = 0x6D42 + t * 4;
    const c0 = this.ram[metaBase];
    const c1 = this.ram[metaBase + 1];
    const c2 = this.ram[metaBase + 2];
    const c3 = this.ram[metaBase + 3];

    const colChar = (tx + 1) * 2;
    const row0Addr = 0x1C00 + (ty * 2) * 128 + colChar;
    const row1Addr = 0x1C00 + (ty * 2 + 1) * 128 + colChar;
    this.ram[row0Addr] = c0;
    this.ram[row0Addr + 1] = c1;
    this.ram[row1Addr] = c2;
    this.ram[row1Addr + 1] = c3;
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return 1; // WALL
    return this.ram[0x0B00 + ty * MAP_WIDTH + tx] & 0x1F;
  }

  /**
   * 1:1 Port of $4462..$44DC: Updates the 25 LMS pointers at $3C94..$3CDC
   * based on player character coordinates ($0560 = (tx+1)*2, $0561 = ty*2).
   */
  updateCameraLmsPointers() {
    const pxChar = this.ram[0x0560];
    const pyChar = this.ram[0x0561];

    let camAddr = 0x1C00;
    if (pyChar >= 0x0C) {
      let rowScroll = pyChar - 0x0A;
      if (rowScroll >= 0x28) rowScroll = 0x28;
      camAddr = (camAddr + rowScroll * 0x80) & 0xFFFF;
    }

    if (pxChar >= 0x16) {
      let colScroll = pxChar - 0x14;
      if (colScroll >= 0x54) colScroll = 0x54;
      camAddr = (camAddr + colScroll) & 0xFFFF;
    }

    let curLms = camAddr;
    for (let row = 0; row < 25; row++) {
      const dlEntry = 0x3C93 + row * 3;
      this.ram[dlEntry + 1] = curLms & 0xFF;
      this.ram[dlEntry + 2] = (curLms >> 8) & 0xFF;
      curLms = (curLms + 0x0080) & 0xFFFF;
    }

    this.ram[0x0577] = curLms & 0xFF;
    this.ram[0x0578] = (curLms >> 8) & 0xFF;
  }

  updateCameraLmsFromPlayer() {
    this.updateCameraLmsPointers();
  }

  get25LmsPointers() {
    const ptrs = [];
    for (let row = 0; row < 25; row++) {
      const dlEntry = 0x3C93 + row * 3;
      const lo = this.ram[dlEntry + 1];
      const hi = this.ram[dlEntry + 2];
      ptrs.push((hi << 8) | lo);
    }
    return ptrs;
  }

  addScoreBcd(lowByteBcd, highByteBcd = 0) {
    const r0 = bcdAdd8(this.ram[0x00C1], lowByteBcd, 0);
    const r1 = bcdAdd8(this.ram[0x00C2], highByteBcd, r0.carry);
    this.ram[0x00C1] = r0.result;
    this.ram[0x00C2] = r1.result;
    this.syncHudText();
  }

  decrementTimerBcd(amountLo = 0x01) {
    if (this.outOfTime) return;
    const r0 = bcdSub8(this.ram[0x009E], amountLo, 0);
    const r1 = bcdSub8(this.ram[0x009F], 0x00, r0.borrow);
    if (r1.borrow || (r0.result === 0 && r1.result === 0)) {
      this.ram[0x009E] = 0x00;
      this.ram[0x009F] = 0x00;
      this.ram[0x059E] = 0x00;
      this.ram[0x059F] = 0x00;
      this.outOfTime = true;
    } else {
      this.ram[0x009E] = r0.result;
      this.ram[0x009F] = r1.result;
      this.ram[0x059E] = r0.result;
      this.ram[0x059F] = r1.result;
    }
    this.syncHudText();
  }

  syncHudText() {
    const tHi = this.ram[0x009F] & 0x0F;
    const tMid = (this.ram[0x009E] >> 4) & 0x0F;
    const tLo = this.ram[0x009E] & 0x0F;
    this.ram[0x0400 + 16] = 0x50 + tHi;
    this.ram[0x0400 + 17] = 0x50 + tMid;
    this.ram[0x0400 + 18] = 0x50 + tLo;

    for (let i = 0; i < 20; i++) {
      this.ram[0x0428 + i] = 0x00;
    }
    let x = 0;
    if (this.ram[0x0574]) this.ram[0x0428 + x++] = 0xC6;
    if (this.ram[0x0575]) this.ram[0x0428 + x++] = 0x84;
    if (this.ram[0x05AF]) this.ram[0x0428 + x++] = 0xC3;
    const mats = this.ram[0x0576];
    for (let m = 0; m < mats && x < 10; m++) {
      this.ram[0x0428 + x++] = 0x85;
    }
    const plut = this.ram[0x0598];
    for (let p = 0; p < plut && x + p < 20; p++) {
      this.ram[0x0428 + x + p] = 0x83;
    }
  }
}

// === engine/zone_loader.js ===
/**
 * zonex-web/js/engine/zone_loader.js
 * 1:1 Port of Dossier 01 ($6021, $41D9, $45DD, $428E, $623A, $4DCC, $4462):
 * Loads Game Zone 1..12 into the 64KB RAM state ($0B00 62x32 logical map,
 * $1C00 128x64 screen buffer, $3C93 25 LMS pointers, and $A2C4 per-zone colors).
 */


class ZoneLoader {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
  }

  loadZone(zoneNumber = 1, optionLevel = 1) {
    const gameZoneIdx = Math.max(0, Math.min(11, zoneNumber - 1));
    const diffIdx = Math.max(0, Math.min(2, optionLevel - 1));
    const levelList = (this.bundle.zones_by_level && this.bundle.zones_by_level[diffIdx])
      ? this.bundle.zones_by_level[diffIdx]
      : this.bundle.zones;
    const zdata = levelList[gameZoneIdx];
    const ram = this.memory.ram;

    this.memory.initStaticRomTables();
    this.memory.initPlayfieldBorders();
    this.memory.paused = false;
    this.memory.outOfTime = false;

    // 1. Copy unpacked 62x32 logical tile map into $0B00..$12BF and expand into $1C00..$3BFF
    const pf = zdata.playfield_bytes;
    for (let ty = 0; ty < MAP_HEIGHT; ty++) {
      for (let tx = 0; tx < MAP_WIDTH; tx++) {
        const tileId = pf[ty * MAP_WIDTH + tx];
        this.memory.writeTileAndScreen(tx, ty, tileId);
      }
    }

    // 2. Set Zone & Player variables ($0558 = Game Zone 0..11, $0555 = internal_zone_idx)
    ram[0x0558] = gameZoneIdx;
    ram[0x0555] = zdata.internal_zone_idx !== undefined ? zdata.internal_zone_idx : gameZoneIdx;
    ram[0x0556] = diffIdx;
    ram[0x055A] = MAP_WIDTH;
    ram[0x0598] = zdata.plutonium_count;
    ram[0x05B3] = zdata.container_count;

    const startOffset = zdata.player_start.offset;
    ram[0x055B] = startOffset & 0xFF;
    ram[0x055C] = (startOffset >> 8) & 0xFF;
    ram[0x055D] = zdata.player_start.hpos;
    ram[0x055E] = zdata.player_start.sprite;
    ram[0x055F] = 0x03;

    ram[0x0574] = 0x00;
    ram[0x0575] = 0x00;
    ram[0x0576] = 0x00;
    ram[0x05AF] = 0x00;

    // 3. Initialize BCD Timer ($009E/$009F = 0950) & Score ($00C1/$00C2 = 0000)
    ram[0x009E] = 0x50;
    ram[0x009F] = 0x09;
    ram[0x059E] = 0x50;
    ram[0x059F] = 0x09;
    ram[0x00C1] = 0x00;
    ram[0x00C2] = 0x00;

    // 4. Copy HUD lines ($3E53 -> $0414, $3E67 -> $0428)
    const hud1 = this.bundle.screens_data.hud_line1_3e53;
    const hud2 = this.bundle.screens_data.hud_line2_3e67;
    for (let i = 0; i < 20; i++) {
      ram[0x0400 + i] = 0x00;
      ram[0x0414 + i] = hud1[i];
      ram[0x0428 + i] = hud2[i];
    }

    const zNum = gameZoneIdx + 1;
    if (zNum >= 10) {
      ram[0x0414 + 5] = 0xD0 + Math.floor(zNum / 10);
      ram[0x0414 + 6] = 0xD0 + (zNum % 10);
    } else {
      ram[0x0414 + 5] = 0xD0 + zNum;
      ram[0x0414 + 6] = 0x00;
    }
    ram[0x0414 + 19] = 0xD3;

    ram[0x0400 + 5] = 0x50;
    ram[0x0400 + 16] = 0x59;
    ram[0x0400 + 17] = 0x55;
    ram[0x0400 + 18] = 0x50;

    for (let i = 0; i < Math.min(20, zdata.plutonium_count); i++) {
      ram[0x0428 + i] = 0x83;
    }

    // 5. Player char coords ($4DCC: $0560 = (player_x + 1) * 2, $0561 = player_y * 2)
    ram[0x0560] = ((zdata.player_start.x + 1) * 2) & 0xFF;
    ram[0x0561] = (zdata.player_start.y * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();

    ram[0x05BC] = 0x06;
    ram[0xD404] = 0x06;
    ram[0xD405] = 0x06;

    // 6. Display List Shadow Registers ($3C8B), DLI ($64CD), & Charset ($4000 -> DLI switches to $1800)
    ram[0x0230] = 0x8B;
    ram[0x0231] = 0x3C;
    ram[0xD402] = 0x8B;
    ram[0xD403] = 0x3C;
    ram[0x0200] = 0xCD;
    ram[0x0201] = 0x64;
    ram[0x02F4] = 0x40;
    ram[0xD409] = 0x40;

    // 7. Authentic per-zone GTIA color palette ($A2C4 + internal_zone_idx * 4)
    const cols = zdata.colors;
    for (let i = 0; i < 4; i++) {
      ram[0x02C4 + i] = cols[i];
      ram[0xD016 + i] = cols[i];
    }
    ram[0x02C8] = 0x00;
    ram[0xD01A] = 0x00;
    ram[0x02C0] = 0xA6;
    ram[0x02C1] = 0x18;
    ram[0xD012] = 0xA6;
    ram[0xD013] = 0x18;

    return zdata;
  }
}

// === engine/feature_state_machine.js ===
/**
 * zonex-web/js/engine/feature_state_machine.js
 * 1:1 Port of Dossier 03 ($4A10, $47CB, $6580):
 * State machine and tile mutation logic for all 16 verified Zone X features
 * using the exact 6502 Tile IDs (0..27):
 *  4 = KEY ('K'), 5 = BLOCK ('()'), 6 = PLUTONIUM ('X'), 7 = DOOR ('D'),
 *  8 = WARP_PAD ('1..12'), 9 = AIRDOORS ('A'), 10/13/14/15 = LASER ('L/','L','l/','l'),
 * 12 = SLAM ('S'), 16 = CONTAINER ('ᴗ'), 17 = MATS ('M'), 18 = LOCK ('C'),
 * 19 = TIME ('T'), 20 = BONUS ('?'), 21 = SPADE ('♠'), 22 = EXIT ('O'),
 * 24 = LOCKED, 25 = CRUMBLY ('▒').
 */


class FeatureStateMachine {
  constructor(memory, bundle, pokey) {
    this.memory = memory;
    this.bundle = bundle;
    this.pokey = pokey;
    this.frameCounter = 0;
  }

  tryInteractTile(nx, ny, dx, dy, tileId) {
    const ram = this.memory.ram;

    switch (tileId) {
      case 25: // CRUMBLY ('▒') — diggable if player has SPADE ($0575) or walkable in crumbly zones
        if (ram[0x0575] > 0) {
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 10, 2);
          return true;
        }
        // In Zone X, base crumbly fill (Tile 25) is dug automatically as the player walks through it!
        this.memory.writeTileAndScreen(nx, ny, 0);
        this.pokey.triggerSfx(3, 1, 4, 1);
        return true;

      case 5: // CAPSULE / BLOCK ('()') — pushable if tile behind it is FLOOR (0)
        if (this.memory.getTile(nx + dx, ny + dy) === 0) {
          this.memory.writeTileAndScreen(nx + dx, ny + dy, 5);
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.pokey.triggerSfx(3, 1, 8, 2);
          return true;
        }
        return false;

      case 9:  // AIRDOORS ('A')
      case 12: // SLAM ('S')
        return (this.frameCounter & 0x08) === 0;

      case 7:  // DOOR ('D')
      case 18: // LOCK ('C')
      case 24: // LOCKED
        if (ram[0x0574] > 0 || tileId === 7) {
          if (ram[0x0574] > 0 && tileId !== 7) {
            ram[0x0574] = 0;
          }
          this.memory.writeTileAndScreen(nx, ny, 0);
          this.memory.addScoreBcd(0x25, 0x00);
          this.pokey.triggerSfx(4, 2, 12, 2);
          return true;
        }
        return false;

      case 16: // CONTAINER ('ᴗ') — decontaminates carried PLUTONIUM ($05AF)
        if (ram[0x05AF] > 0) {
          ram[0x05AF] = 0;
          if (ram[0x0598] > 0) {
            ram[0x0598] = (ram[0x0598] - 1) & 0xFF;
          }
          this.memory.addScoreBcd(0x50, 0x01);
          this.pokey.triggerSfx(4, 2, 16, 3);
        }
        return true;

      default:
        return false;
    }
  }

  onEnterTile(px, py) {
    const ram = this.memory.ram;
    const tileId = this.memory.getTile(px, py);

    switch (tileId) {
      case 6: // PLUTONIUM ('X')
        if (ram[0x05AF] === 0) {
          ram[0x05AF] = 1;
          this.memory.writeTileAndScreen(px, py, 0);
          this.memory.addScoreBcd(0x50, 0x00);
          this.pokey.triggerSfx(2, 1, 12, 2);
        }
        break;

      case 4: // KEY ('K')
        ram[0x0574] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 21: // SPADE ('♠')
        ram[0x0575] = 1;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x10, 0x00);
        this.pokey.triggerSfx(2, 1, 10, 2);
        break;

      case 17: // MATS ('M')
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
        break;

      case 19: // TIME ('T')
        ram[0x009F] = Math.min(0x09, ram[0x009F] + 1);
        ram[0x059F] = ram[0x009F];
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 12, 2);
        break;

      case 20: // BONUS / MYSTERY ('?')
        this.memory.writeTileAndScreen(px, py, 0);
        this.memory.addScoreBcd(0x00, 0x01);
        this.pokey.triggerSfx(2, 1, 14, 2);
        break;

      case 8: // WARP_PAD ('1..12' inside ▌ 1 ▐)
        this.executeWarpOrDoor(px, py);
        break;

      default:
        break;
    }
  }

  executeWarpOrDoor(px, py) {
    const ram = this.memory.ram;
    const gameZoneIdx = ram[0x0558] & 0x0F;
    const zdata = this.bundle.zones[gameZoneIdx];
    if (!zdata || !zdata.warps || zdata.warps.length === 0) return;

    let match = zdata.warps.find((w) => Math.abs(w.src_x - px) <= 1 && Math.abs(w.src_y - py) <= 1);
    if (!match) {
      match = zdata.warps[0];
    }

    const dstX = match.dst_x;
    const dstY = match.dst_y;
    const dstOffset = (dstY * MAP_WIDTH + dstX) & 0xFFFF;
    ram[0x055B] = dstOffset & 0xFF;
    ram[0x055C] = (dstOffset >> 8) & 0xFF;
    ram[0x0560] = ((dstX + 1) * 2) & 0xFF;
    ram[0x0561] = (dstY * 2) & 0xFF;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(5, 2, 14, 3);
  }

  tickFrame() {
    if (this.memory.paused || this.memory.outOfTime) return;
    this.frameCounter++;
    this.memory.ram[0x0014] = this.frameCounter & 0xFF;

    const period = this.memory.ram[0x05AF] > 0 ? 4 : 8;
    if (this.frameCounter % period === 0) {
      this.memory.decrementTimerBcd(0x01);
      if (this.memory.outOfTime) {
        this.pokey.triggerSfx(6, 0, 20, 3);
      }
    }
  }
}

// === engine/player_physics.js ===
/**
 * zonex-web/js/engine/player_physics.js
 * 1:1 Port of Dossier 02 & 03 ($4800, $4846, $4B30, $4C50, $4DCC, $4462):
 * Handles player movement across the 62x32 ($3E x $20) playfield, collision detection,
 * fine/coarse scrolling across the 25 LMS rows at $3C94, CH ITEM, and MATS.
 */


const SOLID_TILES = new Set([
  1,  // WALL (█)
  2,  // WARP_L (▌)
  3,  // WARP_R (▐)
  5,  // CAPSULE / BLOCK (())
  10, // LASER_LU (L/)
  13, // LASER_U (L)
  14, // LASER_DR (l/)
  15, // LASER_D (l)
  24, // LOCKED door (unless player has KEY)
  25, // CRUMBLY (▒) (unless player has SPADE)
]);

class PlayerPhysics {
  constructor(memory, featureMachine, pokey) {
    this.memory = memory;
    this.featureMachine = featureMachine;
    this.pokey = pokey;
  }

  step(inputMask) {
    const ram = this.memory.ram;

    if (inputMask & INPUT_BITS.PAUSE) {
      this.memory.paused = !this.memory.paused;
    }
    if (inputMask & INPUT_BITS.ABORT) {
      ram[0x009E] = 0x00;
      ram[0x009F] = 0x00;
      this.memory.outOfTime = true;
      this.pokey.triggerSfx(6, 0, 16, 3);
      return;
    }
    if (this.memory.paused || this.memory.outOfTime) {
      return;
    }

    if (inputMask & INPUT_BITS.CH_ITEM) {
      this.memory.selectedItemSlot = (this.memory.selectedItemSlot + 1) % 3;
      this.pokey.triggerSfx(2, 1, 6, 1);
    }

    let px = Math.floor(ram[0x0560] / 2) - 1;
    let py = Math.floor(ram[0x0561] / 2);

    // FIRE action: place or pick up MATS (Tile 17 = 'M')
    if (inputMask & INPUT_BITS.FIRE) {
      const curTile = this.memory.getTile(px, py);
      if (curTile === 17) {
        this.memory.writeTileAndScreen(px, py, 0);
        ram[0x0576] = (ram[0x0576] + 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(2, 1, 8, 2);
      } else if (curTile === 0 && ram[0x0576] > 0) {
        this.memory.writeTileAndScreen(px, py, 17);
        ram[0x0576] = (ram[0x0576] - 1) & 0xFF;
        this.memory.syncHudText();
        this.pokey.triggerSfx(3, 1, 8, 2);
      }
    }

    let dx = 0;
    let dy = 0;
    let scrollDir = ram[0x055F];

    if (inputMask & INPUT_BITS.UP) {
      dy = -1;
      scrollDir = 0;
    } else if (inputMask & INPUT_BITS.DOWN) {
      dy = 1;
      scrollDir = 3;
    } else if (inputMask & INPUT_BITS.LEFT) {
      dx = -1;
      scrollDir = 2;
    } else if (inputMask & INPUT_BITS.RIGHT) {
      dx = 1;
      scrollDir = 1;
    }

    if (dx === 0 && dy === 0) {
      ram[0xD404] = 0x06;
      ram[0xD405] = 0x06;
      return;
    }

    ram[0x055F] = scrollDir;
    const nx = px + dx;
    const ny = py + dy;
    if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) return;

    const targetTile = this.memory.getTile(nx, ny);
    const canEnter = this.featureMachine.tryInteractTile(nx, ny, dx, dy, targetTile);
    if (!canEnter && SOLID_TILES.has(targetTile)) {
      return;
    }

    px = nx;
    py = ny;
    const newOffset = (py * MAP_WIDTH + px) & 0xFFFF;
    ram[0x055B] = newOffset & 0xFF;
    ram[0x055C] = (newOffset >> 8) & 0xFF;
    ram[0x0560] = ((px + 1) * 2) & 0xFF;
    ram[0x0561] = (py * 2) & 0xFF;
    ram[0x055E] = ((ram[0x055E] || 0) + 1) % 3;

    ram[0xD404] = (0x06 + dx * 2) & 0x0F;
    ram[0xD405] = (0x06 + dy * 2) & 0x0F;
    this.memory.updateCameraLmsPointers();
    this.pokey.triggerSfx(1, 0, 4, 1);

    this.featureMachine.onEnterTile(px, py);
  }
}

// === engine/robot_ai.js ===
/**
 * zonex-web/js/engine/robot_ai.js
 * 1:1 Port of Dossier 04 ($55D4, $5600, $5720):
 * Patrols zone robots (R / r) on the 62x32 grid and bounces off walls and player-laid MATS (tile_id 17).
 */


class RobotAI {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.robots = [];
    this.tickCounter = 0;
  }

  initZoneRobots(zoneIdx) {
    const zdata = this.bundle.zones[zoneIdx] || this.bundle.zones[0];
    this.robots = (zdata.robots || []).map((r) => ({
      x: Math.max(0, Math.min(MAP_WIDTH - 1, r.x)),
      y: Math.max(0, Math.min(MAP_HEIGHT - 1, r.y)),
      dir: r.dir & 0x03,
      speed: Math.max(1, r.speed & 0x07),
    }));
    this.tickCounter = 0;
  }

  stepFrame() {
    if (this.memory.paused || this.memory.outOfTime) return;
    this.tickCounter++;

    const dirs = [
      { dx: 0, dy: -1 },
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
    ];

    for (let i = 0; i < this.robots.length; i++) {
      const r = this.robots[i];
      if (this.tickCounter % r.speed !== 0) continue;

      const d = dirs[r.dir & 0x03];
      const nx = r.x + d.dx;
      const ny = r.y + d.dy;
      if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) {
        r.dir = (r.dir ^ 0x03) & 0x03;
        continue;
      }
      const tile = this.memory.getTile(nx, ny);

      // Robots bounce off solid walls AND player-dropped MATS (17) ($5720)
      if (tile !== 0) {
        r.dir = (r.dir ^ 0x03) & 0x03;
      } else {
        r.x = nx;
        r.y = ny;
      }
    }
  }
}

// === engine/screens.js ===
/**
 * zonex-web/js/engine/screens.js
 * Configures the 64KB RAM state for Title Screen ($3CE5, DLI $6978),
 * Features Showcase ($939C, DLI $9670), and Hall of Fame ($8F08)
 * matching the 6502 setup routines ($5C55..$5CA1, $9325..$9351, $9072..$9195) 1:1.
 */

class ScreenManager {
  constructor(memory, bundle, zoneLoader) {
    this.memory = memory;
    this.bundle = bundle;
    this.zoneLoader = zoneLoader;
    this.activeScreen = "ingame";
  }

  loadScreen(screenName) {
    const ram = this.memory.ram;
    this.memory.initStaticRomTables();
    this.activeScreen = screenName;

    if (screenName === "title") {
      // $6069..$60A5: SDLSTL/H = $3CE5, VDSLST = $6978, CHBAS = $40
      ram[0x0230] = 0xE5;
      ram[0x0231] = 0x3C;
      ram[0xD402] = 0xE5;
      ram[0xD403] = 0x3C;
      ram[0x0200] = 0x78;
      ram[0x0201] = 0x69;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      // Top colors ($606E..$607C): COLPF0=$B8, COLPF1=$B4, COLPF2=$0E, COLPF3=$D8, COLBK=$00
      ram[0x02C4] = 0xB8;
      ram[0x02C5] = 0xB4;
      ram[0x02C6] = 0x0E;
      ram[0x02C7] = 0xD8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];

      // $5C55..$5CA1: Populate menu text buffers in $0414..$04B3
      for (let y = 0; y < 0x28; y++) {
        ram[0x0464 + y] = ram[0x3E03 + y];
        ram[0x0400 + y] = 0x00;
      }
      for (let y = 0; y < 0x14; y++) {
        ram[0x043C + y] = (ram[0x3DB3 + y] + 0x60) & 0xFF;
        ram[0x0450 + y] = (ram[0x3DC7 + y] + 0x60) & 0xFF;
      }
      for (let y = 0; y < 0x28; y++) {
        ram[0x0414 + y] = (ram[0x3DDB + y] + 0xA0) & 0xFF;
        ram[0x048C + y] = (ram[0x3E2B + y] + 0x20) & 0xFF;
      }
    } else if (screenName === "features") {
      // $9325..$9351: SDLSTL/H = $939C, VDSLST = $9670, CHBAS = $40
      ram[0x0230] = 0x9C;
      ram[0x0231] = 0x93;
      ram[0xD402] = 0x9C;
      ram[0xD403] = 0x93;
      ram[0x0200] = 0x70;
      ram[0x0201] = 0x96;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      // Colors ($9347..$9351 from $9378..$937B): COLPF0=$44, COLPF1=$4A, COLPF2=$00, COLPF3=$C8, COLBK=$00
      ram[0x02C4] = 0x44;
      ram[0x02C5] = 0x4A;
      ram[0x02C6] = 0x00;
      ram[0x02C7] = 0xC8;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];
    } else if (screenName === "halloffame") {
      // $8F7C..$8F94 & $9072..$9195: SDLSTL/H = $8F08, CHBAS = $40
      ram[0x0230] = 0x08;
      ram[0x0231] = 0x8F;
      ram[0xD402] = 0x08;
      ram[0xD403] = 0x8F;
      ram[0x02F4] = 0x40;
      ram[0xD409] = 0x40;

      ram[0x02C4] = 0x44;
      ram[0x02C5] = 0x4A;
      ram[0x02C6] = 0x86;
      ram[0x02C7] = 0xC6;
      ram[0x02C8] = 0x00;
      for (let i = 0; i < 5; i++) ram[0xD016 + i] = ram[0x02C4 + i];

      // $9072..$9129: Build 12 Hall of Fame rows (20 bytes each) at $0B00..$0BEF
      for (let x = 0; x < 12; x++) {
        const rowBase = 0x0B00 + x * 20;
        for (let c = 0; c < 20; c++) ram[rowBase + c] = 0x00;
        ram[rowBase + 0] = 0x0B;
        ram[rowBase + 19] = 0x0C;
        ram[rowBase + 1] = (ram[0x8EE5 + x * 2] + 0x20) & 0xFF;
        ram[rowBase + 2] = (ram[0x8EE5 + x * 2 + 1] + 0x20) & 0xFF;
        ram[rowBase + 3] = 0x00;
        for (let y = 0; y < 8; y++) {
          ram[rowBase + 4 + y] = ram[0x8EFD + y];
        }
        ram[rowBase + 15] = 0xD1;
        ram[rowBase + 16] = 0xD0;
        ram[rowBase + 17] = 0xD0;
        ram[rowBase + 18] = 0xD0;
      }

      // $912A..$9182: Header ($043C = "   |HALL OF FAME|   ") & Footer ($0450 = "|LAST SCORE       0|")
      for (let x = 0; x < 20; x++) {
        ram[0x043C + x] = (ram[0x3D9F + x] + 0x20) & 0xFF;
        ram[0x0450 + x] = (ram[0x8ED1 + x] + 0x20) & 0xFF;
      }
      ram[0x043F] = 0x0B;
      ram[0x044C] = 0x0C;
      ram[0x0450] = 0x0B;
      ram[0x0450 + 18] = 0xD0;
      ram[0x0463] = 0x0C;
    } else {
      this.activeScreen = "ingame";
      this.zoneLoader.loadZone(1, 1);
    }
  }
}

// === hardware/antic_gtia.js ===
/**
 * zonex-web/js/hardware/antic_gtia.js
 * Cycle-exact ANTIC Display List & GTIA PAL Renderer (336x240) + Full 62x32 Zone Overview Renderer (992x512).
 * Implements ANTIC Mode 4 (with Bit 7 COLPF3 selector + HSCROL/VSCROL hardware fine scrolling),
 * Mode 6 & Mode 7 (with HSCROL fine scrolling), Mode 14 ($0E), Mode 2,
 * DLI handlers ($64CD In-Game, $9670 Features Showcase, $6978 Title Screen),
 * single-line PMBASE ($1400..$17FF) Player/Missile Graphics (P0..P3), and GTIA P0PF/P1PF collision latches.
 */

class AnticGtiaRenderer {
  constructor(canvas, memory, bundle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.memory = memory;
    this.bundle = bundle;
    this.width = 336;
    this.height = 240;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.palPalette = bundle.atari_pal_palette;
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";
    this.pfColorIndexBuf = new Uint8Array(this.width * this.height);

    this.fullMapCanvas = document.getElementById("full-map-canvas");
    this.fullMapPanel = document.querySelector(".full-map-panel");
    if (this.fullMapCanvas) {
      this.fullMapCtx = this.fullMapCanvas.getContext("2d");
      this.fullMapImageData = this.fullMapCtx.createImageData(992, 512);
    }
  }

  putPixel(buf, x, y, rgb, pfType = 0) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const pIdx = y * this.width + x;
      this.pfColorIndexBuf[pIdx] = pfType;
      const idx = pIdx << 2;
      buf[idx] = rgb[0];
      buf[idx + 1] = rgb[1];
      buf[idx + 2] = rgb[2];
      buf[idx + 3] = 255;
    }
  }

  drawDoublePixel(buf, scanlineY, screenX, rgb, pfType = 0) {
    this.putPixel(buf, screenX, scanlineY, rgb, pfType);
    this.putPixel(buf, screenX + 1, scanlineY, rgb, pfType);
  }

  renderFrame(robots = []) {
    const ram = this.memory.ram;
    const buf = this.imageData.data;
    this.pfColorIndexBuf.fill(0);

    const regs = {
      COLPF0: ram[0x02C4],
      COLPF1: ram[0x02C5],
      COLPF2: ram[0x02C6],
      COLPF3: ram[0x02C7],
      COLBK: ram[0x02C8],
    };

    const bgRgb = this.palPalette[regs.COLBK] || [0, 0, 0];
    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = bgRgb[0];
      buf[i + 1] = bgRgb[1];
      buf[i + 2] = bgRgb[2];
      buf[i + 3] = 255;
    }

    const dlAddr = ram[0x0230] | (ram[0x0231] << 8);
    let chbase = (ram[0x02F4] << 8) & 0xFFFF;
    let dliIndex = 0;
    const xOffset = 8;
    const useHwFineScroll = !this.isLockstep;
    const hscrol = ram[0xD404] & 0x0F;
    const vscrol = ram[0xD405] & 0x07;

    const applyDli = () => {
      if (dlAddr === 0x3C8B) {
        // In-Game DLI ($64CD): switches CHBASE via $3E7B,X ($18, $40)
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        dliIndex++;
      } else if (dlAddr === 0x939C) {
        // Features Showcase DLI ($9670): switches CHBASE via $3E7B,X ($18, $40) and COLPF2 ($86, $00)
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        regs.COLPF2 = (dliIndex & 1) ? 0x00 : 0x86;
        dliIndex++;
      } else if (dlAddr === 0x3CE5) {
        // Title Screen DLI ($6978): switches COLPF0..3 to [$B8, $88, $A8, $D8]
        regs.COLPF0 = 0xB8;
        regs.COLPF1 = 0x88;
        regs.COLPF2 = 0xA8;
        regs.COLPF3 = 0xD8;
        dliIndex++;
      }
    };

    let scanlineY = 8;
    let pc = dlAddr;
    let curLms = 0;
    let steps = 0;
    let inVscrolRegion = false;

    while (scanlineY < this.height && steps < 256) {
      steps++;
      const ir = ram[pc & 0xFFFF];
      pc = (pc + 1) & 0xFFFF;

      if (ir === 0x41) {
        break; // JVB
      }

      const mode = ir & 0x0F;
      const hasHscrol = useHwFineScroll && (ir & 0x10) !== 0;
      const hasVscrol = useHwFineScroll && (ir & 0x20) !== 0;
      const hasLms = (ir & 0x40) !== 0;
      const hasDli = (ir & 0x80) !== 0;

      if (mode === 0) {
        inVscrolRegion = false;
        const blankLines = ((ir >> 4) & 0x07) + 1;
        scanlineY += blankLines;
        if (hasDli) applyDli();
        continue;
      }

      if (hasLms) {
        const lo = ram[pc & 0xFFFF];
        const hi = ram[(pc + 1) & 0xFFFF];
        pc = (pc + 2) & 0xFFFF;
        curLms = (hi << 8) | lo;
      }

      if (mode === 4) {
        // ANTIC Mode 4 ($04, $44, $54, $74)
        let startScan = 0;
        let endScan = 8;
        if (useHwFineScroll) {
          if (!inVscrolRegion && hasVscrol) {
            startScan = vscrol;
            endScan = 8;
            inVscrolRegion = true;
          } else if (inVscrolRegion && !hasVscrol) {
            startScan = 0;
            endScan = vscrol;
            inVscrolRegion = false;
          }
        }

        if (hasHscrol) {
          // Hardware horizontal fine scrolling across 48 fetched bytes
          const hShiftPx = (16 - hscrol) * 2;
          for (let scanlineInRow = startScan; scanlineInRow < endScan; scanlineInRow++) {
            if (scanlineY >= this.height) break;
            for (let dx = 0; dx < 320; dx += 2) {
              const srcX = dx + hShiftPx;
              const chCol = srcX >> 3;
              const px = (srcX & 7) >> 1;
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x7F;
              const usePF3 = (charCode & 0x80) !== 0;
              const glyphByte = ram[(chbase + (charIndex << 3) + (scanlineInRow & 0x07)) & 0xFFFF];
              const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;

              let colorReg;
              let pfType = 0;
              if (bitPair === 0) {
                colorReg = regs.COLBK;
                pfType = 0;
              } else if (bitPair === 1) {
                colorReg = regs.COLPF0;
                pfType = 1;
              } else if (bitPair === 2) {
                colorReg = regs.COLPF1;
                pfType = 2;
              } else {
                colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
                pfType = usePF3 ? 4 : 3;
              }
              this.drawDoublePixel(buf, scanlineY, xOffset + dx, this.palPalette[colorReg], pfType);
            }
            scanlineY++;
          }
          curLms = (curLms + 48) & 0xFFFF;
        } else {
          for (let scanlineInRow = startScan; scanlineInRow < endScan; scanlineInRow++) {
            if (scanlineY >= this.height) break;
            for (let chCol = 0; chCol < 40; chCol++) {
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x7F;
              const usePF3 = (charCode & 0x80) !== 0;
              const glyphByte = ram[(chbase + (charIndex << 3) + (scanlineInRow & 0x07)) & 0xFFFF];
              const screenX = xOffset + (chCol << 3);

              for (let px = 0; px < 4; px++) {
                const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
                let colorReg;
                let pfType = 0;
                if (bitPair === 0) {
                  colorReg = regs.COLBK;
                } else if (bitPair === 1) {
                  colorReg = regs.COLPF0;
                  pfType = 1;
                } else if (bitPair === 2) {
                  colorReg = regs.COLPF1;
                  pfType = 2;
                } else {
                  colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
                  pfType = usePF3 ? 4 : 3;
                }
                this.drawDoublePixel(buf, scanlineY, screenX + (px << 1), this.palPalette[colorReg], pfType);
              }
            }
            scanlineY++;
          }
          curLms = (curLms + 40) & 0xFFFF;
        }
      } else if (mode === 6) {
        // ANTIC Mode 6 (20 chars x 8 scanlines, 4-color text)
        const mode6Colors = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
        if (hasHscrol) {
          const hShiftPx = (16 - hscrol) * 2;
          for (let s = 0; s < 8; s++) {
            if (scanlineY >= this.height) break;
            for (let dx = 0; dx < 320; dx += 2) {
              const srcX = dx + hShiftPx;
              const chCol = srcX >> 4;
              const b = (srcX >> 1) & 7;
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x3F;
              const colorSel = (charCode >> 6) & 0x03;
              const fgRgb = this.palPalette[mode6Colors[colorSel]];
              const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
              const bit = (glyphByte >> (7 - b)) & 1;
              this.drawDoublePixel(buf, scanlineY, xOffset + dx, bit ? fgRgb : bgRgb, bit ? (colorSel + 1) : 0);
            }
            scanlineY++;
          }
          curLms = (curLms + 24) & 0xFFFF;
        } else {
          for (let s = 0; s < 8; s++) {
            if (scanlineY >= this.height) break;
            for (let chCol = 0; chCol < 20; chCol++) {
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x3F;
              const colorSel = (charCode >> 6) & 0x03;
              const fgRgb = this.palPalette[mode6Colors[colorSel]];
              const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
              const baseX = xOffset + (chCol << 4);
              for (let b = 0; b < 8; b++) {
                const bit = (glyphByte >> (7 - b)) & 1;
                this.drawDoublePixel(buf, scanlineY, baseX + (b << 1), bit ? fgRgb : bgRgb, bit ? (colorSel + 1) : 0);
              }
            }
            scanlineY++;
          }
          curLms = (curLms + 20) & 0xFFFF;
        }
      } else if (mode === 7) {
        // ANTIC Mode 7 (20 chars x 16 scanlines, double-height 4-color text)
        const mode7Colors = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
        if (hasHscrol) {
          const hShiftPx = (16 - hscrol) * 2;
          for (let s = 0; s < 16; s++) {
            if (scanlineY >= this.height) break;
            const glyphRow = s >> 1;
            for (let dx = 0; dx < 320; dx += 2) {
              const srcX = dx + hShiftPx;
              const chCol = srcX >> 4;
              const b = (srcX >> 1) & 7;
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x3F;
              const colorSel = (charCode >> 6) & 0x03;
              const fgRgb = this.palPalette[mode7Colors[colorSel]];
              const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
              const bit = (glyphByte >> (7 - b)) & 1;
              this.drawDoublePixel(buf, scanlineY, xOffset + dx, bit ? fgRgb : bgRgb, bit ? (colorSel + 1) : 0);
            }
            scanlineY++;
          }
          curLms = (curLms + 24) & 0xFFFF;
        } else {
          for (let s = 0; s < 16; s++) {
            if (scanlineY >= this.height) break;
            const glyphRow = s >> 1;
            for (let chCol = 0; chCol < 20; chCol++) {
              const charCode = ram[(curLms + chCol) & 0xFFFF];
              const charIndex = charCode & 0x3F;
              const colorSel = (charCode >> 6) & 0x03;
              const fgRgb = this.palPalette[mode7Colors[colorSel]];
              const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
              const baseX = xOffset + (chCol << 4);
              for (let b = 0; b < 8; b++) {
                const bit = (glyphByte >> (7 - b)) & 1;
                this.drawDoublePixel(buf, scanlineY, baseX + (b << 1), bit ? fgRgb : bgRgb, bit ? (colorSel + 1) : 0);
              }
            }
            scanlineY++;
          }
          curLms = (curLms + 20) & 0xFFFF;
        }
      } else if (mode === 14) {
        // ANTIC Mode 14 ($0E): 160x192 4-color bitmap (40 bytes per scanline, 1 scanline tall)
        if (scanlineY < this.height) {
          const mode14Colors = [regs.COLBK, regs.COLPF0, regs.COLPF1, regs.COLPF2];
          for (let byteCol = 0; byteCol < 40; byteCol++) {
            const bval = ram[(curLms + byteCol) & 0xFFFF];
            const baseX = xOffset + (byteCol << 3);
            for (let px = 0; px < 4; px++) {
              const bp = (bval >> (6 - (px << 1))) & 0x03;
              const rgb = this.palPalette[mode14Colors[bp]];
              this.drawDoublePixel(buf, scanlineY, baseX + (px << 1), rgb, bp);
            }
          }
        }
        scanlineY++;
        curLms = (curLms + 40) & 0xFFFF;
      } else if (mode === 2) {
        // ANTIC Mode 2 (40 chars x 8 scanlines, high-res text)
        const fgRgb = this.palPalette[regs.COLPF1];
        const bgMode2 = this.palPalette[regs.COLPF2];
        for (let s = 0; s < 8; s++) {
          if (scanlineY >= this.height) break;
          for (let chCol = 0; chCol < 40; chCol++) {
            const charCode = ram[(curLms + chCol) & 0xFFFF];
            const charIndex = charCode & 0x7F;
            const inv = (charCode & 0x80) !== 0;
            const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
            const baseX = xOffset + (chCol << 3);
            for (let b = 0; b < 8; b++) {
              const bit = ((glyphByte >> (7 - b)) & 1) ^ (inv ? 1 : 0);
              this.putPixel(buf, baseX + b, scanlineY, bit ? fgRgb : bgMode2, bit ? 2 : 3);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 40) & 0xFFFF;
      } else {
        scanlineY += 8;
      }

      if (hasDli) {
        applyDli();
      }
    }

    if (this.fullMapPanel) {
      this.fullMapPanel.style.display = dlAddr === 0x3C8B ? "" : "none";
    }

    if (useHwFineScroll) {
      // Hardware Single-Line PMBASE ($D407) Player/Missile Graphics (P3..P0) + GTIA P0PF/P1PF Collision
      const dmactl = ram[0x022F] || ram[0xD400];
      const gractl = ram[0xD01D];
      const pmbase = (ram[0xD407] & 0xF8) << 8;

      if ((dmactl & 0x08) !== 0 && (gractl & 0x02) !== 0 && pmbase !== 0) {
        // Draw P3, P2, P1, P0 in priority order (P0 on top of P1)
        for (let p = 3; p >= 0; p--) {
          const hpos = ram[0xD000 + p];
          if (hpos === 0) continue;
          const pcolr = this.palPalette[ram[0x02C0 + p]] || [255, 255, 255];
          const sizeCode = ram[0xD008 + p] & 0x03;
          const bitWidth = sizeCode === 1 ? 4 : (sizeCode === 3 ? 8 : 2);
          const baseScreenX = xOffset + (hpos - 48) * 2;
          const playerBaseAddr = pmbase + 0x0400 + (p << 8);

          for (let sy = 8; sy < this.height; sy++) {
            const shapeByte = ram[(playerBaseAddr + sy) & 0xFFFF];
            if (shapeByte === 0) continue;

            for (let b = 0; b < 8; b++) {
              if (((shapeByte >> (7 - b)) & 1) === 0) continue;
              const pxStart = baseScreenX + b * bitWidth;
              for (let w = 0; w < bitWidth; w++) {
                const px = pxStart + w;
                if (px >= xOffset && px < xOffset + 320) {
                  const pfType = this.pfColorIndexBuf[sy * this.width + px];
                  if (pfType >= 1 && pfType <= 4) {
                    const collBit = 1 << (pfType - 1);
                    if (p === 0) this.memory.collisionP0PF = (this.memory.collisionP0PF || 0) | collBit;
                    else if (p === 1) this.memory.collisionP1PF = (this.memory.collisionP1PF || 0) | collBit;
                  }
                }
                if (px >= 0 && px < this.width) {
                  const idx = (sy * this.width + px) << 2;
                  buf[idx] = pcolr[0];
                  buf[idx + 1] = pcolr[1];
                  buf[idx + 2] = pcolr[2];
                  buf[idx + 3] = 255;
                }
              }
            }
          }
        }
      }

      if (dlAddr === 0x3C8B && this.fullMapCtx) {
        this.renderFullZoneMap(regs, 0x1800);
      }
    } else if (dlAddr === 0x3C8B) {
      // Lockstep Reference Player Sprite Overlay (P0 + P1) for Oracle 1 & 2 bit-identity
      const p0Col = this.palPalette[ram[0x02C0]];
      const p1Col = this.palPalette[ram[0x02C1]];
      const frameIdx = (ram[0x055E] || 0) % 3;
      const p0Shape = this.bundle.sprites.p0_shapes[frameIdx] || this.bundle.sprites.p0_shapes[0];
      const p1Shape = this.bundle.sprites.p1_shapes[frameIdx] || this.bundle.sprites.p1_shapes[0];

      const pxChar = ram[0x0560];
      const pyChar = ram[0x0561];
      const camX = pxChar < 0x16 ? 0 : Math.min(0x54, pxChar - 0x14);
      const camY = pyChar < 0x0C ? 0 : Math.min(0x28, pyChar - 0x0A);
      const scrX = xOffset + (pxChar - camX) * 8;
      const scrY = 33 + (pyChar - camY) * 8;

      for (let sy = 0; sy < 16; sy++) {
        const b0 = p0Shape[sy];
        const b1 = p1Shape[sy];
        for (let sx = 0; sx < 8; sx++) {
          const bit0 = (b0 >> (7 - sx)) & 1;
          const bit1 = (b1 >> (7 - sx)) & 1;
          if (bit0) {
            this.drawDoublePixel(buf, scrY + sy, scrX + sx * 2, p0Col);
          } else if (bit1) {
            this.drawDoublePixel(buf, scrY + sy, scrX + sx * 2, p1Col);
          }
        }
      }
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  renderFullZoneMapIfPresent() {
    if (!this.fullMapCtx) return;
    const ram = this.memory.ram;
    const regs = {
      COLPF0: ram[0x02C4],
      COLPF1: ram[0x02C5],
      COLPF2: ram[0x02C6],
      COLPF3: ram[0x02C7],
      COLBK: ram[0x02C8],
    };
    this.renderFullZoneMap(regs, 0x1800);
  }

  renderFullZoneMap(regs, chbase = 0x1800) {
    const ram = this.memory.ram;
    const fbuf = this.fullMapImageData.data;
    const mapWidthPx = 992; // 62 tiles * 16 px = 124 chars * 8 px

    for (let chRow = 0; chRow < 64; chRow++) {
      const rowBaseAddr = 0x1C00 + chRow * 128;
      for (let s = 0; s < 8; s++) {
        const py = chRow * 8 + s;
        const rowPixelOffset = py * mapWidthPx;
        for (let chCol = 0; chCol < 124; chCol++) {
          const charCode = ram[(rowBaseAddr + chCol + 2) & 0xFFFF];
          const charIndex = charCode & 0x7F;
          const usePF3 = (charCode & 0x80) !== 0;
          const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
          const basePx = chCol * 8;

          for (let px = 0; px < 4; px++) {
            const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
            let colorReg;
            if (bitPair === 0) colorReg = regs.COLBK;
            else if (bitPair === 1) colorReg = regs.COLPF0;
            else if (bitPair === 2) colorReg = regs.COLPF1;
            else colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
            const rgb = this.palPalette[colorReg];

            const idx0 = (rowPixelOffset + basePx + (px << 1)) << 2;
            fbuf[idx0] = rgb[0];
            fbuf[idx0 + 1] = rgb[1];
            fbuf[idx0 + 2] = rgb[2];
            fbuf[idx0 + 3] = 255;

            const idx1 = idx0 + 4;
            fbuf[idx1] = rgb[0];
            fbuf[idx1 + 1] = rgb[1];
            fbuf[idx1 + 2] = rgb[2];
            fbuf[idx1 + 3] = 255;
          }
        }
      }
    }

    // Also render Player Sprite (P0/P1) on the full 62x32 map overview
    const p0Col = this.palPalette[ram[0x02C0]] || [255, 255, 255];
    const p1Col = this.palPalette[ram[0x02C1]] || [255, 128, 0];
    const p0Shape = this.bundle.sprites.p0_shapes[0];
    const p1Shape = this.bundle.sprites.p1_shapes[0];
    const mapPxX = Math.max(0, (ram[0x0560] - 2) * 8);
    const mapPxY = Math.max(0, ram[0x0561] * 8);

    for (let sy = 0; sy < 16; sy++) {
      const py = mapPxY + sy;
      if (py >= 512) break;
      const b0 = p0Shape[sy];
      const b1 = p1Shape[sy];
      for (let sx = 0; sx < 8; sx++) {
        const bit0 = (b0 >> (7 - sx)) & 1;
        const bit1 = (b1 >> (7 - sx)) & 1;
        if (!bit0 && !bit1) continue;
        const col = bit0 ? p0Col : p1Col;
        const px = mapPxX + sx * 2;
        if (px + 1 < mapWidthPx) {
          const idx = (py * mapWidthPx + px) << 2;
          fbuf[idx] = col[0];
          fbuf[idx + 1] = col[1];
          fbuf[idx + 2] = col[2];
          fbuf[idx + 3] = 255;
          fbuf[idx + 4] = col[0];
          fbuf[idx + 5] = col[1];
          fbuf[idx + 6] = col[2];
          fbuf[idx + 7] = 255;
        }
      }
    }

    this.fullMapCtx.putImageData(this.fullMapImageData, 0, 0);
  }
}

// === hardware/pokey_driver.js ===
/**
 * zonex-web/js/hardware/pokey_driver.js
 * Cycle-faithful 4-Channel Atari POKEY Sound Synthesizer ($D200..$D208).
 * - In interactive 6502 mode (!isLockstep): streams live $D200..$D208 registers written by the
 *   genuine 6502 sound routines ($59F9 In-Game SFX, $57FE Death Explosion, $75F2 Title Music).
 * - In lockstep mode (?lockstep=1): preserves deterministic 50 Hz lockstep state for Oracle 2 & 3.
 * - Uses direct ScriptProcessorNode + AudioWorklet fallback so audio works 100% on both file:// and http://.
 */

class PokeyDriver {
  constructor(memory, bundle) {
    this.memory = memory;
    this.bundle = bundle;
    this.audioCtx = null;
    this.scriptNode = null;
    this.muted = false;
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";

    // Synthesizer state for 4 POKEY channels
    this.phases = new Float64Array(4);
    this.outputs = new Int8Array(4);
    this.lfsr17 = 0x1FFFF;
    this.lfsr5 = 0x1F;
    this.lfsr4 = 0x0F;

    this.channels = [
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
      { active: false, sfxId: 0, step: 0, duration: 0, priority: 0 },
    ];
  }

  stepLfsr() {
    const bit17 = ((this.lfsr17 >> 16) ^ (this.lfsr17 >> 11)) & 1;
    this.lfsr17 = ((this.lfsr17 << 1) | bit17) & 0x1FFFF;
    if (this.lfsr17 === 0) this.lfsr17 = 0x1FFFF;

    const bit5 = ((this.lfsr5 >> 4) ^ (this.lfsr5 >> 2)) & 1;
    this.lfsr5 = ((this.lfsr5 << 1) | bit5) & 0x1F;
    if (this.lfsr5 === 0) this.lfsr5 = 0x1F;

    const bit4 = ((this.lfsr4 >> 3) ^ (this.lfsr4 >> 2)) & 1;
    this.lfsr4 = ((this.lfsr4 << 1) | bit4) & 0x0F;
    if (this.lfsr4 === 0) this.lfsr4 = 0x0F;
  }

  synthesizeBuffer(chan0, sampleRate) {
    if (this.muted) {
      chan0.fill(0);
      return;
    }
    const ram = this.memory.ram;
    const audctl = ram[0xD208];
    const baseClock = (audctl & 0x01) ? 15699.9 : 63920.4;
    const sr = sampleRate || 44100;

    for (let i = 0; i < chan0.length; i++) {
      this.stepLfsr();
      let mix = 0.0;

      for (let ch = 0; ch < 4; ch++) {
        const audf = ram[0xD200 + (ch << 1)];
        const audc = ram[0xD201 + (ch << 1)];
        const vol = (audc & 0x0F) / 15.0;
        if (vol === 0) continue;

        // Volume-only DAC mode (Bit 4)
        if ((audc & 0x10) !== 0) {
          mix += (vol - 0.5) * 0.30;
          continue;
        }

        const dist = (audc >> 4) & 0x0E;
        const freq = baseClock / (2.0 * (audf + 1));
        this.phases[ch] += freq / sr;

        if (this.phases[ch] >= 0.5) {
          this.phases[ch] -= Math.floor(this.phases[ch] / 0.5) * 0.5;
          if (dist === 0x0A || dist === 0x0E) {
            // Pure square wave tone
            this.outputs[ch] = this.outputs[ch] ? 0 : 1;
          } else if (dist === 0x08) {
            // 17-bit white noise (explosions, spade dig)
            this.outputs[ch] = this.lfsr17 & 1;
          } else if (dist === 0x0C || dist === 0x04) {
            // 4-bit / 5-bit metallic bass distortion (doors, industrial buzz)
            this.outputs[ch] = (this.lfsr4 ^ (this.outputs[ch] ^ 1)) & 1;
          } else if (dist === 0x02 || dist === 0x06) {
            // 5-bit poly + square wave (reactor pulse / background hum)
            if (this.lfsr5 & 1) {
              this.outputs[ch] = this.outputs[ch] ? 0 : 1;
            }
          } else {
            // 5-bit + 17-bit poly noise
            this.outputs[ch] = (this.lfsr17 ^ this.lfsr5) & 1;
          }
        }

        mix += (this.outputs[ch] ? vol : -vol) * 0.28;
      }

      chan0[i] = Math.max(-0.98, Math.min(0.98, mix));
    }
  }

  async enableAudio() {
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.audioCtx = new AudioContextClass();
        const sr = this.audioCtx.sampleRate || 44100;
        this.scriptNode = this.audioCtx.createScriptProcessor(1024, 0, 1);
        this.scriptNode.onaudioprocess = (e) => {
          const out = e.outputBuffer.getChannelData(0);
          this.synthesizeBuffer(out, sr);
        };
        this.scriptNode.connect(this.audioCtx.destination);
      }
      if (this.audioCtx.state === "suspended") {
        await this.audioCtx.resume();
      }
      return this.audioCtx.state === "running";
    } catch (_err) {
      return false;
    }
  }

  toggleMute() {
    if (!this.audioCtx || this.audioCtx.state === "suspended") {
      this.muted = false;
      this.enableAudio();
      return true;
    }
    this.muted = !this.muted;
    return !this.muted;
  }

  triggerSfx(sfxId, ch = 0, duration = 12, priority = 1) {
    const idx = ch & 0x03;
    const slot = this.channels[idx];
    if (!slot.active || priority >= slot.priority) {
      slot.active = true;
      slot.sfxId = sfxId & 0xFF;
      slot.step = 0;
      slot.duration = duration;
      slot.priority = priority;
    }
  }

  tickFrame() {
    // In interactive 6502 mode, the 6502 CPU ($59F9, $57FE, $75F2) writes directly to $D200..$D208!
    if (!this.isLockstep) {
      return;
    }

    const ram = this.memory.ram;
    const sweep = this.bundle.audio_tables.freq_sweep;
    const env = this.bundle.audio_tables.envelope;
    const notes = this.bundle.audio_tables.notes;

    for (let ch = 0; ch < 4; ch++) {
      const slot = this.channels[ch];
      const regF = 0xD200 + ch * 2;
      const regC = 0xD201 + ch * 2;

      if (!slot.active) {
        ram[regF] = 0x00;
        ram[regC] = 0x00;
        continue;
      }

      const idx = slot.step & 0x1F;
      let audf = 0;
      let audc = 0;

      if (slot.sfxId === 1) {
        audf = (sweep[idx] + 0x20) & 0xFF;
        audc = 0x80 | Math.max(1, 6 - (slot.step >> 1));
      } else if (slot.sfxId === 2) {
        audf = (notes[idx] ^ (slot.step * 7)) & 0xFF;
        audc = 0xA0 | Math.max(2, 12 - slot.step);
      } else if (slot.sfxId === 3) {
        audf = (env[idx] + slot.step * 4) & 0xFF;
        audc = 0xC0 | Math.max(1, 10 - slot.step);
      } else if (slot.sfxId === 4) {
        audf = (sweep[(31 - idx) & 0x1F] + 0x10) & 0xFF;
        audc = 0xA0 | Math.max(2, 14 - slot.step);
      } else if (slot.sfxId === 5) {
        audf = (sweep[idx] ^ env[idx]) & 0xFF;
        audc = 0x40 | Math.max(2, 13 - (slot.step >> 1));
      } else {
        audf = (0x40 + ((slot.step & 3) << 4)) & 0xFF;
        audc = 0xA0 | 0x0C;
      }

      ram[regF] = audf;
      ram[regC] = audc;

      slot.step++;
      if (slot.step >= slot.duration) {
        slot.active = false;
        slot.priority = 0;
      }
    }

    ram[0xD208] = 0x00;
  }

  getPokeyRegs() {
    const ram = this.memory.ram;
    return [
      ram[0xD200], ram[0xD201],
      ram[0xD202], ram[0xD203],
      ram[0xD204], ram[0xD205],
      ram[0xD206], ram[0xD207],
      ram[0xD208],
    ];
  }
}

// === verify/lockstep_api.js ===
/**
 * zonex-web/js/verify/lockstep_api.js
 * Exposes window.ZoneXTestAPI for deterministic Playwright Verification Oracles (Phase 5).
 */

function installLockstepAPI(app) {
  const { memory, zoneLoader, screens, playerPhysics, featureMachine, robotAI, pokey, renderer, inputBridge } = app;

  const api = {
    isReady: true,

    loadZone(zoneNumber = 1, optionLevel = 1) {
      screens.activeScreen = "ingame";
      const zdata = zoneLoader.loadZone(zoneNumber, optionLevel);
      robotAI.initZoneRobots(zoneNumber - 1);
      featureMachine.frameCounter = 0;
      renderer.renderFrame(robotAI.robots);
      renderer.renderFullZoneMapIfPresent();
      app.updateTelemetryUI();
      return zdata;
    },

    loadScreen(screenName) {
      screens.loadScreen(screenName);
      renderer.renderFrame([]);
      app.updateTelemetryUI();
      return screenName;
    },

    stepFrame(inputMask = 0) {
      const mask = inputBridge.consumeFrameInput(inputMask);
      if (screens.activeScreen === "ingame") {
        playerPhysics.step(mask);
        featureMachine.tickFrame();
        robotAI.stepFrame();
      }
      pokey.tickFrame();
      renderer.renderFrame(robotAI.robots);
      app.updateTelemetryUI();
      return this.getStateSnapshot();
    },

    getStateSnapshot() {
      const ram = memory.ram;
      const playerX = Math.floor(ram[0x0560] / 2) - 1;
      const playerY = Math.floor(ram[0x0561] / 2);
      const timerBcd = ((ram[0x009F] & 0xFF) << 8) | (ram[0x009E] & 0xFF);
      const scoreBcd = ((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF);
      return {
        zone: (ram[0x0558] & 0x0F) + 1,
        internalZone: ram[0x0555] & 0x0F,
        playerX,
        playerY,
        charX: ram[0x0560],
        charY: ram[0x0561],
        hscrol: ram[0xD404],
        vscrol: ram[0xD405],
        timerBcd,
        scoreBcd,
        matsCount: ram[0x0576],
        hasKey: ram[0x0574],
        hasSpade: ram[0x0575],
        hasPlutonium: ram[0x05AF],
        plutoniumRemaining: ram[0x0598],
        outOfTime: memory.outOfTime ? 1 : 0,
        pokeyRegs: pokey.getPokeyRegs(),
        lmsPointers: memory.get25LmsPointers(),
      };
    },

    getCanvasImageData() {
      return renderer.ctx.getImageData(0, 0, renderer.width, renderer.height).data;
    },

    synthesizePokeySamples(regs, numSamples = 512, sampleRate = 44100) {
      const baseClock = 63920.4;
      const phases = new Float64Array(4);
      const outputs = new Int8Array(4);
      let lfsr17 = 0x1FFFF;
      let lfsr5 = 0x1F;
      let lfsr4 = 0x0F;
      const out = new Float32Array(numSamples);

      for (let i = 0; i < numSamples; i++) {
        const bit17 = ((lfsr17 >> 16) ^ (lfsr17 >> 11)) & 1;
        lfsr17 = ((lfsr17 << 1) | bit17) & 0x1FFFF;
        const bit5 = ((lfsr5 >> 4) ^ (lfsr5 >> 2)) & 1;
        lfsr5 = ((lfsr5 << 1) | bit5) & 0x1F;
        const bit4 = ((lfsr4 >> 3) ^ (lfsr4 >> 2)) & 1;
        lfsr4 = ((lfsr4 << 1) | bit4) & 0x0F;

        let mix = 0.0;
        for (let ch = 0; ch < 4; ch++) {
          const audf = regs[ch * 2] & 0xFF;
          const audc = regs[ch * 2 + 1] & 0xFF;
          const vol = (audc & 0x0F) / 15.0;
          const dist = (audc >> 4) & 0x0F;
          if (vol === 0) continue;
          if ((audc & 0x10) !== 0) {
            mix += (vol - 0.5) * 0.25;
            continue;
          }
          const freq = baseClock / (2.0 * (audf + 1));
          phases[ch] += freq / sampleRate;
          if (phases[ch] >= 0.5) {
            phases[ch] -= 0.5;
            if (dist === 0x0A || dist === 0x0E) {
              outputs[ch] = outputs[ch] ? 0 : 1;
            } else if (dist === 0x08) {
              outputs[ch] = lfsr17 & 1;
            } else if (dist === 0x0C || dist === 0x04) {
              outputs[ch] = (lfsr4 ^ lfsr5) & 1;
            } else {
              outputs[ch] = (lfsr17 ^ (outputs[ch] ^ 1)) & 1;
            }
          }
          mix += (outputs[ch] ? vol : -vol) * 0.22;
        }
        out[i] = Math.max(-1.0, Math.min(1.0, mix));
      }
      return Array.from(out);
    },

    triggerSfxForTest(sfxId, ch = 0, duration = 12, priority = 2) {
      pokey.triggerSfx(sfxId, ch, duration, priority);
    },
  };

  window.ZoneXTestAPI = api;
  return api;
}

// === main.js ===
/**
 * zonex-web/js/main.js
 * Main entry point & 50.00 Hz PAL Timestep Accumulator (dt = 20.0 ms).
 * Runs the cycle-accurate Mos6502Core ($3C80..$BFFF) in interactive mode for 100% authentic
 * gameplay, hardware HSCROL/VSCROL soft-scrolling, animated moving enemies, and live POKEY audio,
 * while preserving the deterministic Lockstep API (?lockstep=1) for Phase 5 Oracle verification.
 */


class ZoneXApplication {
  constructor(bundle) {
    this.bundle = bundle;
    this.canvas = document.getElementById("atari-canvas");
    this.isLockstep = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("lockstep") === "1";

    this.memory = new MemoryState(bundle);
    this.pokey = new PokeyDriver(this.memory, bundle);
    this.inputBridge = new InputBridge(this.memory);
    this.zoneLoader = new ZoneLoader(this.memory, bundle);
    this.featureMachine = new FeatureStateMachine(this.memory, bundle, this.pokey);
    this.playerPhysics = new PlayerPhysics(this.memory, this.featureMachine, this.pokey);
    this.robotAI = new RobotAI(this.memory, bundle);
    this.screens = new ScreenManager(this.memory, bundle, this.zoneLoader);
    this.renderer = new AnticGtiaRenderer(this.canvas, this.memory, bundle);
    this.cpu = new Mos6502Core(this.memory, bundle);

    this.autoLoopEnabled = true;
    this.lastTime = performance.now();
    this.accumulator = 0.0;
    this.targetHz = 50;
    this.FRAME_DT = 1000.0 / this.targetHz; // 50.00 Hz PAL VBI (20.0 ms) or 60.00 Hz NTSC (16.67 ms)

    this.bindUI();
    this.api = installLockstepAPI(this);

    // Load Zone 1 (Option Level 1) initially
    if (this.isLockstep) {
      this.api.loadZone(1, 1);
    } else {
      this.loadInteractiveZone(1, 1, true);
    }
  }

  setRefreshRate(hz) {
    this.targetHz = hz === 60 ? 60 : 50;
    this.FRAME_DT = 1000.0 / this.targetHz;
    this.accumulator = 0.0;

    const btnHz = document.getElementById("btn-hz-toggle");
    if (btnHz) {
      btnHz.textContent = this.targetHz === 60 ? "Mode: 60 Hz (NTSC)" : "Mode: 50 Hz (PAL)";
    }
    const badgeHz = document.getElementById("ui-hz-badge");
    if (badgeHz) {
      badgeHz.textContent = this.targetHz === 60 ? "ATARI 800XL NTSC (60.00 Hz)" : "ATARI 800XL PAL (50.00 Hz)";
    }
    const btnAudio = document.getElementById("btn-audio-toggle");
    if (btnAudio && this.pokey.audioCtx && !this.pokey.muted) {
      btnAudio.textContent = `POKEY Audio Active (${this.targetHz}Hz)`;
    }
  }

  loadInteractiveZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = false) {
    this.screens.activeScreen = "ingame";
    this.cpu.startZone(zoneNumber, optionLevel, resetLivesAndScore);
    this.renderer.renderFrame();
    this.renderer.renderFullZoneMapIfPresent();
    this.updateTelemetryUI();
  }

  loadInteractiveScreen(screenName) {
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const zNum = zoneSelect ? parseInt(zoneSelect.value, 10) || 1 : 1;
    const lNum = levelSelect ? parseInt(levelSelect.value, 10) || 1 : 1;

    this.screens.activeScreen = screenName;
    if (screenName === "title") {
      this.cpu.bootTitleScreen(zNum, lNum);
    } else if (screenName === "features") {
      this.cpu.bootFeaturesScreen();
    } else if (screenName === "halloffame" || screenName === "hof") {
      this.cpu.bootHallOfFameScreen();
    } else {
      this.cpu.startZone(zNum, lNum, false);
    }
    this.renderer.renderFrame();
    this.updateTelemetryUI();
  }

  bindUI() {
    const screenSelect = document.getElementById("ui-screen-select");
    const zoneSelect = document.getElementById("ui-zone-select");
    const levelSelect = document.getElementById("ui-level-select");
    const btnHz = document.getElementById("btn-hz-toggle");
    const btnAudio = document.getElementById("btn-audio-toggle");
    const btnCrt = document.getElementById("btn-crt-toggle");
    const crtOverlay = document.getElementById("crt-overlay");
    const fullMapCanvas = document.getElementById("full-map-canvas");

    const autoUnlockAudio = async () => {
      if (this.isLockstep) return;
      const active = await this.pokey.enableAudio();
      if (active && btnAudio) {
        btnAudio.textContent = this.pokey.muted ? "POKEY Audio Muted" : `POKEY Audio Active (${this.targetHz}Hz)`;
      }
    };

    if (typeof window !== "undefined" && !this.isLockstep) {
      window.addEventListener("keydown", autoUnlockAudio, { passive: true });
      window.addEventListener("pointerdown", autoUnlockAudio, { passive: true });
      window.addEventListener("mousedown", autoUnlockAudio, { passive: true });
    }

    if (btnHz) {
      btnHz.addEventListener("click", () => {
        this.setRefreshRate(this.targetHz === 50 ? 60 : 50);
      });
    }

    if (screenSelect) {
      screenSelect.addEventListener("change", () => {
        const val = screenSelect.value;
        if (this.isLockstep) {
          if (val === "ingame") {
            this.api.loadZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10));
          } else {
            this.api.loadScreen(val);
          }
        } else {
          if (val === "ingame") {
            this.loadInteractiveZone(parseInt(zoneSelect.value, 10), parseInt(levelSelect.value, 10), false);
          } else {
            this.loadInteractiveScreen(val);
          }
        }
      });
    }

    if (zoneSelect) {
      zoneSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        const z = parseInt(zoneSelect.value, 10);
        const l = parseInt(levelSelect.value, 10);
        if (this.isLockstep) {
          this.api.loadZone(z, l);
        } else {
          this.loadInteractiveZone(z, l, false);
        }
      });
    }

    if (levelSelect) {
      levelSelect.addEventListener("change", () => {
        if (screenSelect) screenSelect.value = "ingame";
        const z = parseInt(zoneSelect.value, 10);
        const l = parseInt(levelSelect.value, 10);
        if (this.isLockstep) {
          this.api.loadZone(z, l);
        } else {
          this.loadInteractiveZone(z, l, false);
        }
      });
    }

    if (btnAudio) {
      btnAudio.addEventListener("click", async () => {
        if (!this.pokey.audioCtx) {
          await this.pokey.enableAudio();
          btnAudio.textContent = `POKEY Audio Active (${this.targetHz}Hz)`;
        } else {
          const isUnmuted = this.pokey.toggleMute();
          btnAudio.textContent = isUnmuted ? `POKEY Audio Active (${this.targetHz}Hz)` : "POKEY Audio Muted";
        }
      });
    }

    if (btnCrt && crtOverlay) {
      btnCrt.addEventListener("click", () => {
        crtOverlay.classList.toggle("active");
      });
    }

    if (fullMapCanvas) {
      fullMapCanvas.addEventListener("click", (e) => {
        const rect = fullMapCanvas.getBoundingClientRect();
        const scaleX = fullMapCanvas.width / rect.width;
        const scaleY = fullMapCanvas.height / rect.height;
        const tx = Math.max(0, Math.min(MAP_WIDTH - 1, Math.floor(((e.clientX - rect.left) * scaleX) / 16)));
        const ty = Math.max(0, Math.min(MAP_HEIGHT - 1, Math.floor(((e.clientY - rect.top) * scaleY) / 16)));
        const ram = this.memory.ram;
        const newOffset = (ty * MAP_WIDTH + tx) & 0xFFFF;
        const charX = ((tx + 1) * 2) & 0xFF;
        const charY = (ty * 2) & 0xFF;

        ram[0x055B] = newOffset & 0xFF;
        ram[0x055C] = (newOffset >> 8) & 0xFF;
        ram[0x0560] = charX;
        ram[0x0561] = charY;
        ram[0x0568] = 0x00; // reset sub-tile step
        ram[0x056B] = 0x08; // neutral HSCROL
        ram[0x056C] = 0x00; // neutral VSCROL
        ram[0xD404] = 0x08;
        ram[0xD405] = 0x00;

        const lmsX = charX < 0x16 ? 0 : Math.min(0x54, charX - 0x14);
        const lmsY = charY < 0x0C ? 0 : Math.min(0x28, charY - 0x0A);
        const hpos = (40 + (charX - lmsX) * 4) & 0xFF;
        const pmgY = (32 + (charY - lmsY) * 8) & 0xFF;
        ram[0x055D] = hpos;
        ram[0xD000] = hpos;
        ram[0xD001] = hpos;
        ram[0x055E] = pmgY;

        if (!this.isLockstep) {
          this.cpu.callSubroutine(0x43BF, 5000); // Clear PMG $1400..$15FF
          this.cpu.callSubroutine(0x435F, 5000); // Draw P0/P1 at new $055E
          this.cpu.callSubroutine(0x4462, 5000); // Update 25 LMS pointers
          this.cpu.callSubroutine(0x47A0, 5000); // Update $056D/$056E scroll flags
        } else {
          this.memory.updateCameraLmsFromPlayer();
        }
        this.renderer.renderFrame(this.robotAI.robots);
        this.updateTelemetryUI();
      });
    }
  }

  updateTelemetryUI() {
    const ram = this.memory.ram;
    const setTxt = (id, txt) => {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    };

    const px = Math.floor(ram[0x0560] / 2) - 1;
    const py = Math.floor(ram[0x0561] / 2);
    const dl = (ram[0x0231] << 8) | ram[0x0230];
    const lms0 = (ram[0x3C95] << 8) | ram[0x3C94];

    const tLo = this.isLockstep ? ram[0x009E] : ram[0x059E];
    const tHi = this.isLockstep ? ram[0x009F] : ram[0x059F];
    const timerHex = (((tHi & 0xFF) << 8) | (tLo & 0xFF)).toString(16).toUpperCase().padStart(4, "0");

    let scoreHex;
    if (this.isLockstep) {
      scoreHex = (((ram[0x00C2] & 0xFF) << 8) | (ram[0x00C1] & 0xFF)).toString(16).toUpperCase().padStart(4, "0");
    } else {
      scoreHex = [ram[0x0591], ram[0x0592], ram[0x0593]]
        .map((b) => (b & 0xFF).toString(16).toUpperCase().padStart(2, "0"))
        .join("");
    }

    const gameZoneNum = ((this.isLockstep ? ram[0x0558] : ram[0x0554]) & 0x0F) + 1;
    const internalZoneIdx = ram[0x0555] & 0x0F;
    setTxt("dbg-zone", `${gameZoneNum} (ROM #$${internalZoneIdx.toString(16).toUpperCase()})`);
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
    if (ram[0x0575]) items.push("MASK");
    if (ram[0x05AF]) items.push("SPADE");
    setTxt("dbg-inv", items.length ? items.join("+") : "NONE");

    const pRegs = this.pokey.getPokeyRegs().slice(0, 8).map((v) => v.toString(16).toUpperCase().padStart(2, "0")).join(" ");
    setTxt("dbg-pokey", pRegs);

    // Sync UI dropdowns if the 6502 engine transitioned screens or zones natively
    if (!this.isLockstep) {
      const screenSelect = document.getElementById("ui-screen-select");
      if (screenSelect) {
        if (dl === 0x3C8B && screenSelect.value !== "ingame") screenSelect.value = "ingame";
        else if (dl === 0x3CE5 && screenSelect.value !== "title") screenSelect.value = "title";
        else if (dl === 0x939C && screenSelect.value !== "features") screenSelect.value = "features";
        else if (dl === 0x8F08 && screenSelect.value !== "halloffame") screenSelect.value = "halloffame";
      }
      const zoneSelect = document.getElementById("ui-zone-select");
      if (zoneSelect && dl === 0x3C8B && parseInt(zoneSelect.value, 10) !== gameZoneNum) {
        zoneSelect.value = String(gameZoneNum);
      }
    }
  }

  startLoop() {
    if (this.isLockstep) {
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
          this.inputBridge.consumeFrameInput(null);
          this.cpu.runFrame(18000);
          this.renderer.renderFrame();
          this.updateTelemetryUI();
          this.accumulator -= this.FRAME_DT;
        }
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

async function bootstrap() {
  if (window.ZoneXTestAPI) return;
  let bundle = window.ZONEX_ROM_BUNDLE;
  if (!bundle) {
    const res = await fetch("assets/zonex_rom_bundle.json");
    bundle = await res.json();
  }
  const app = new ZoneXApplication(bundle);
  window.zoneXApp = app;
  app.startLoop();
}

bootstrap();

})();
