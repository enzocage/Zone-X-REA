/**
 * src/engine/GameEngine.js
 * Clean Game Execution Engine for Zone X.
 * Encapsulates screen lifecycle transitions, level unpacking, custom/bonus level injection,
 * VBI timing, automatic laser doors, enemy movement, and transition audio silencing.
 */

import { GridConfig, TileType, SystemAddressMap } from "../config/Constants.js";

const INSTRUCTION_SET = Object.freeze({
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
});

const TRANSITION_ENTRY_POINTS = new Set([
  0x6054, // Title Screen Init
  0x60B3, // Exit Title -> Features Showcase
  0x9325, // Features Showcase Init
  0x6580, // Disable VBI / Exit Features -> In-Game
  0x60B9, // New Game Init
  0x60E5, // Zone Unpack Init
  0x6113, // Zone Load / Next Zone Init
  0x62D7, // Player Respawn After Life Loss
  0x6491, // Hall of Fame / Game Over Init
  0x654D, // Zone Exit Portal / Level Complete
]);

export class GameEngine {
  constructor(gameState, assetBundle) {
    this.state = gameState;
    this.ram = gameState.ram;
    this.bundle = assetBundle;
    this.activeCustomZone = null;

    this.rom3c80 = null;
    if (assetBundle && assetBundle.ram_3c80_bfff_b64) {
      const binStr = atob(assetBundle.ram_3c80_bfff_b64);
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
    this.rng = 0x1FFFF;
    this.hofInitialized = false;
    this.totalCycles = 0;
    this.frameCycles = 0;
    this.lastFrameTotalCycles = 27000;
    this.recordingPokey = false;
    this.pokeyEvents = [];
    this.transitionOccurred = false;
  }

  loadBaseBinary() {
    if (!this.rom3c80) return;
    for (let i = 0; i < this.rom3c80.length && 0x3C80 + i < 0xC000; i++) {
      this.ram[0x3C80 + i] = this.rom3c80[i];
    }

    for (let i = 0; i < 6; i++) {
      this.ram[0xCFFA + i] = 0x00;
      this.ram[0xFFFA + i] = 0xE4;
    }

    this.ram[0x00C0] = 0x22;
    this.ram[0x00C1] = 0x34;
    this.ram[0x00C2] = 0x80;
    this.ram[0x00C3] = 0x38;
    this.ram[0x3E99] = 0xEA;
    this.ram[0x7F90] = 0xEA;
    this.ram[0x96AD] = 0xEA;

    this.ram[0xE45C] = 0x60;
    this.ram[0xE462] = 0x60;
    this.ram[0xE465] = 0x60;

    this.ram[SystemAddressMap.CONSOL] = 0x07;
    this.ram[SystemAddressMap.STICK0] = 0x0F;
    this.ram[SystemAddressMap.STRIG0] = 0x01;
    this.ram[SystemAddressMap.CH_KEY] = 0xFF;
    this.silencePokeyAndSfx();

    for (let i = 0; i < 1024; i++) {
      this.ram[0x1800 + i] = this.ram[0x706C + i];
    }

    if (!this.hofInitialized) {
      this.hofInitialized = true;
      this.callSubroutine(0x8F36, 5000);
    }
  }

  silencePokeyAndSfx() {
    for (let i = 0; i < 16; i++) {
      this.ram[SystemAddressMap.POKEY_BASE + i] = 0x00;
    }
    this.ram[SystemAddressMap.POKEY_BASE + 0x0F] = 0x03;

    for (
      let addr = SystemAddressMap.SFX_STATE_START;
      addr <= SystemAddressMap.SFX_STATE_END;
      addr++
    ) {
      this.ram[addr] = 0x00;
    }

    this.pokeyEvents = [];
    if (this.recordingPokey) {
      for (let i = 0; i < 9; i++) {
        this.pokeyEvents.push({
          cycle: this.frameCycles,
          addr: SystemAddressMap.POKEY_BASE + i,
          val: 0x00,
        });
      }
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
    this.flagN = val & 0x80 ? 1 : 0;
    this.flagV = val & 0x40 ? 1 : 0;
    this.flagD = val & 0x08 ? 1 : 0;
    this.flagI = val & 0x04 ? 1 : 0;
    this.flagZ = val & 0x02 ? 1 : 0;
    this.flagC = val & 0x01 ? 1 : 0;
  }

  setZN(val) {
    val &= 0xFF;
    this.flagZ = val === 0 ? 1 : 0;
    this.flagN = val & 0x80 ? 1 : 0;
  }

  push(val) {
    this.ram[0x0100 + (this.sp & 0xFF)] = val & 0xFF;
    this.sp = (this.sp - 1) & 0xFF;
  }

  pull() {
    this.sp = (this.sp + 1) & 0xFF;
    return this.ram[0x0100 + (this.sp & 0xFF)];
  }

  read8(addr) {
    addr &= 0xFFFF;
    if (addr === 0xD20A) {
      for (let i = 0; i < 8; i++) {
        const bit = ((this.rng & 1) ^ ((this.rng >> 5) & 1)) & 1;
        this.rng = (this.rng >> 1) | (bit << 16);
      }
      return this.rng & 0xFF;
    }
    if (addr === 0xD004) return (this.state.collisionP0PF ?? this.ram[0xD004]) & 0x0F;
    if (addr === 0xD005) return (this.state.collisionP1PF ?? this.ram[0xD005]) & 0x0F;
    if (addr === 0xD010) return this.ram[SystemAddressMap.STRIG0] & 0x01;
    if (addr === 0xD300) return this.ram[SystemAddressMap.STICK0] & 0x0F;
    if (addr === 0xD40B) return ((this.frameCycles / 228) | 0) & 0xFF;
    return this.ram[addr];
  }

  write8(addr, val) {
    addr &= 0xFFFF;
    val &= 0xFF;
    if (addr === 0xD01E) {
      this.state.collisionP0PF = 0;
      this.state.collisionP1PF = 0;
    } else if (this.recordingPokey && addr >= 0xD200 && addr <= 0xD20F) {
      this.pokeyEvents.push({
        cycle: this.frameCycles,
        addr,
        val,
      });
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

    if (TRANSITION_ENTRY_POINTS.has(pc)) {
      this.silencePokeyAndSfx();
      this.transitionOccurred = true;
    }

    if (pc === 0xE45C) {
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
      if (pc === 0xE465) {
        this.silencePokeyAndSfx();
      }
      const lo = this.pull();
      const hi = this.pull();
      this.pc = (((hi << 8) | lo) + 1) & 0xFFFF;
      this.cycles += 6;
      return 6;
    }

    const op = this.read8(pc);
    const entry = INSTRUCTION_SET[op];
    if (!entry) {
      this.pc = (pc + 1) & 0xFFFF;
      this.cycles += 2;
      return 2;
    }

    const [mnem, mode, length, baseCycles] = entry;
    const addr = mode !== "imp" && mode !== "acc" ? this.resolveAddr(mode, pc) : 0;
    this.pc = (pc + length) & 0xFFFF;
    this.cycles += baseCycles;
    this.totalCycles += baseCycles;
    this.frameCycles += baseCycles;

    switch (mnem) {
      case "LDA":
        this.a = this.read8(addr);
        this.setZN(this.a);
        break;
      case "LDX":
        this.x = this.read8(addr);
        this.setZN(this.x);
        break;
      case "LDY":
        this.y = this.read8(addr);
        this.setZN(this.y);
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
        this.x = this.a;
        this.setZN(this.x);
        break;
      case "TAY":
        this.y = this.a;
        this.setZN(this.y);
        break;
      case "TXA":
        this.a = this.x;
        this.setZN(this.a);
        break;
      case "TYA":
        this.a = this.y;
        this.setZN(this.a);
        break;
      case "TSX":
        this.x = this.sp;
        this.setZN(this.x);
        break;
      case "TXS":
        this.sp = this.x;
        break;
      case "INX":
        this.x = (this.x + 1) & 0xFF;
        this.setZN(this.x);
        break;
      case "INY":
        this.y = (this.y + 1) & 0xFF;
        this.setZN(this.y);
        break;
      case "DEX":
        this.x = (this.x - 1) & 0xFF;
        this.setZN(this.x);
        break;
      case "DEY":
        this.y = (this.y - 1) & 0xFF;
        this.setZN(this.y);
        break;
      case "INC": {
        const v = (this.read8(addr) + 1) & 0xFF;
        this.write8(addr, v);
        this.setZN(v);
        break;
      }
      case "DEC": {
        const v = (this.read8(addr) - 1) & 0xFF;
        this.write8(addr, v);
        this.setZN(v);
        break;
      }
      case "AND":
        this.a &= this.read8(addr);
        this.setZN(this.a);
        break;
      case "ORA":
        this.a |= this.read8(addr);
        this.setZN(this.a);
        break;
      case "EOR":
        this.a ^= this.read8(addr);
        this.setZN(this.a);
        break;
      case "BIT": {
        const v = this.read8(addr);
        this.flagZ = (this.a & v) === 0 ? 1 : 0;
        this.flagN = v & 0x80 ? 1 : 0;
        this.flagV = v & 0x40 ? 1 : 0;
        break;
      }
      case "CMP":
        this.compare(this.a, this.read8(addr));
        break;
      case "CPX":
        this.compare(this.x, this.read8(addr));
        break;
      case "CPY":
        this.compare(this.y, this.read8(addr));
        break;
      case "ADC":
        this.adc(this.read8(addr));
        break;
      case "SBC":
        this.sbc(this.read8(addr));
        break;
      case "ASL":
        if (mode === "acc") {
          this.flagC = (this.a >> 7) & 1;
          this.a = (this.a << 1) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          this.flagC = (v >> 7) & 1;
          v = (v << 1) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "LSR":
        if (mode === "acc") {
          this.flagC = this.a & 1;
          this.a = (this.a >> 1) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          this.flagC = v & 1;
          v = (v >> 1) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "ROL":
        if (mode === "acc") {
          const oldC = this.flagC;
          this.flagC = (this.a >> 7) & 1;
          this.a = ((this.a << 1) | oldC) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          const oldC = this.flagC;
          this.flagC = (v >> 7) & 1;
          v = ((v << 1) | oldC) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "ROR":
        if (mode === "acc") {
          const oldC = this.flagC;
          this.flagC = this.a & 1;
          this.a = ((this.a >> 1) | (oldC << 7)) & 0xFF;
          this.setZN(this.a);
        } else {
          let v = this.read8(addr);
          const oldC = this.flagC;
          this.flagC = v & 1;
          v = ((v >> 1) | (oldC << 7)) & 0xFF;
          this.write8(addr, v);
          this.setZN(v);
        }
        break;
      case "PHA":
        this.push(this.a);
        break;
      case "PLA":
        this.a = this.pull();
        this.setZN(this.a);
        break;
      case "PHP":
        this.push(this.getP() | 0x10);
        break;
      case "PLP":
        this.setP(this.pull());
        break;
      case "CLC":
        this.flagC = 0;
        break;
      case "SEC":
        this.flagC = 1;
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
      case "CLD":
        this.flagD = 0;
        break;
      case "SED":
        this.flagD = 1;
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
      case "NOP":
        break;
      case "BRK":
        this.stopped = true;
        break;
    }

    return baseCycles;
  }

  compare(reg, val) {
    const diff = reg - val;
    this.flagC = reg >= val ? 1 : 0;
    this.setZN(diff & 0xFF);
  }

  adc(v) {
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
      this.a = ((hi & 0x0F) << 4) | (lo & 0x0F);
      this.setZN(this.a);
    } else {
      const sum = this.a + v + this.flagC;
      this.flagV = (~(this.a ^ v) & (this.a ^ sum) & 0x80) !== 0 ? 1 : 0;
      this.flagC = sum > 0xFF ? 1 : 0;
      this.a = sum & 0xFF;
      this.setZN(this.a);
    }
  }

  sbc(v) {
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
      this.a = ((hi & 0x0F) << 4) | (lo & 0x0F);
      this.setZN(this.a);
    } else {
      const diff = this.a - v - (this.flagC ? 0 : 1);
      this.flagV = ((this.a ^ v) & (this.a ^ diff) & 0x80) !== 0 ? 1 : 0;
      this.flagC = diff < 0 ? 0 : 1;
      this.a = diff & 0xFF;
      this.setZN(this.a);
    }
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
    return steps;
  }

  syncShadowRegisters() {
    this.ram[0xD400] = this.ram[0x022F];
    this.ram[0xD402] = this.ram[SystemAddressMap.DLIST_PTR_LO];
    this.ram[0xD403] = this.ram[SystemAddressMap.DLIST_PTR_HI];
    this.ram[0xD409] = this.ram[0x02F4];
    this.ram[0xD01B] = this.ram[0x026F];
    for (let i = 0; i < 4; i++) {
      this.ram[0xD012 + i] = this.ram[0x02C0 + i];
    }
    for (let i = 0; i < 5; i++) {
      this.ram[0xD016 + i] = this.ram[SystemAddressMap.COLOR0_SHADOW + i];
    }
  }

  runVbi() {
    const nmiEn = this.ram[0xD40E];
    if ((nmiEn & 0x40) === 0) {
      this.syncShadowRegisters();
      return;
    }
    const vbiAddr = this.ram[0x0224] | (this.ram[0x0225] << 8);
    if (vbiAddr !== 0 && vbiAddr !== 0xE462) {
      this.callSubroutine(vbiAddr, 30000);
    }
    this.syncShadowRegisters();
  }

  runFrame(mainCycles = 23500) {
    this.frameCycles = 0;
    this.pokeyEvents = [];
    this.recordingPokey = true;
    this.transitionOccurred = false;

    const prevZoneIdx = this.ram[SystemAddressMap.SELECTED_ZONE_IDX];
    let used = 0;
    let guard = 0;
    while (!this.stopped && used < mainCycles && guard < 25000) {
      if (this.pc === 0x60E5) {
        let unpackSteps = 0;
        while (!this.stopped && this.pc !== 0x6447 && unpackSteps < 1000000) {
          this.step();
          unpackSteps++;
        }
        this.state.collisionP0PF = 0;
        this.state.collisionP1PF = 0;
        if (this.activeCustomZone && this.ram[SystemAddressMap.SELECTED_ZONE_IDX] === prevZoneIdx) {
          this.applyCustomZoneOverlay(this.activeCustomZone);
        } else {
          this.activeCustomZone = null;
        }
        break;
      }
      if (this.pc === 0x62D7 && this.activeCustomZone) {
        let respawnSteps = 0;
        while (!this.stopped && this.pc !== 0x6447 && respawnSteps < 50000) {
          this.step();
          respawnSteps++;
        }
        this.state.collisionP0PF = 0;
        this.state.collisionP1PF = 0;
        if (Array.isArray(this.activeCustomZone.colors) && this.activeCustomZone.colors.length >= 4) {
          for (let i = 0; i < 4; i++) {
            this.ram[SystemAddressMap.COLOR0_SHADOW + i] = this.activeCustomZone.colors[i] & 0xFF;
          }
        }
        const zNum = this.activeCustomZone.zone || 13;
        const bcdZone = ((((zNum / 10) | 0) << 4) | (zNum % 10)) & 0xFF;
        this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
        this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
        break;
      }
      used += this.step();
      guard++;
    }
    this.runVbi();

    this.recordingPokey = false;
    this.lastFrameTotalCycles = Math.max(1, this.frameCycles);
  }

  startZone(zoneNumber = 1, optionLevel = 1, resetLivesAndScore = true) {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[SystemAddressMap.SELECTED_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.ACTIVE_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] = this.ram[0xA3CC + zIdx];
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.SELECTED_DIFFICULTY] = diffIdx;
    this.ram[SystemAddressMap.ACTIVE_DIFFICULTY] = diffIdx;
    this.ram[0x05A9] = 0x00;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = resetLivesAndScore ? 0x60B9 : 0x60E5;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x6447 && steps < 1000000) {
      this.step();
      steps++;
    }
    this.state.collisionP0PF = 0;
    this.state.collisionP1PF = 0;
    this.silencePokeyAndSfx();
    this.ram[SystemAddressMap.DOOR_TIMER_A] = 0x16;
    this.ram[SystemAddressMap.DOOR_TIMER_B] = 0x0C;
    this.runVbi();
    this.runVbi();
  }

  startCustomZone(zoneData, optionLevel = 1, resetLivesAndScore = false) {
    this.startZone(1, optionLevel, resetLivesAndScore);
    this.activeCustomZone = zoneData;
    this.applyCustomZoneOverlay(zoneData);
  }

  applyCustomZoneOverlay(zoneData) {
    if (!zoneData || !zoneData.playfield_bytes) return;
    const W = GridConfig.WIDTH;
    const H = GridConfig.HEIGHT;

    for (let r = 0; r < 64; r++) {
      const rowBase = 0x1C00 + r * GridConfig.PLAYFIELD_ROW_STRIDE;
      this.ram[rowBase + 0] = 0x81;
      this.ram[rowBase + 1] = 0x81;
      this.ram[rowBase + 126] = 0x81;
      this.ram[rowBase + 127] = 0x81;
    }

    const writeTileToRam = (tx, ty, tileId) => {
      if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
      const t = tileId & 0x1F;
      this.ram[0x0B00 + ty * W + tx] = t;
      const mb = 0x6D42 + t * 4;
      const charCol = (tx + 1) * 2;
      const r0 = 0x1C00 + ty * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
      const r1 = 0x1C00 + (ty * 2 + 1) * GridConfig.PLAYFIELD_ROW_STRIDE + charCol;
      this.ram[r0] = this.ram[mb];
      this.ram[r0 + 1] = this.ram[mb + 1];
      this.ram[r1] = this.ram[mb + 2];
      this.ram[r1 + 1] = this.ram[mb + 3];
    };

    let plutoniumCount = 0;
    let containerCount = 0;
    let doorCount = 0;
    const robots = [];

    for (let ty = 0; ty < H; ty++) {
      for (let tx = 0; tx < W; tx++) {
        const rawTile = zoneData.playfield_bytes[ty * W + tx] & 0x1F;
        if (rawTile === TileType.ALIEN_DROID_NORMAL || rawTile === TileType.ALIEN_DROID_FAST) {
          writeTileToRam(tx, ty, TileType.FLOOR);
          robots.push({
            x: tx,
            y: ty,
            type: rawTile === TileType.ALIEN_DROID_NORMAL ? 0 : 1,
          });
        } else {
          writeTileToRam(tx, ty, rawTile);
          if (rawTile === TileType.PLUTONIUM) plutoniumCount++;
          else if (rawTile === TileType.CONTAINER) containerCount++;
          else if (rawTile === TileType.DOOR_MARKER_A || rawTile === TileType.LOCKED_DOOR) {
            doorCount++;
          }
        }
      }
    }

    const px = zoneData.player_start ? zoneData.player_start.x : 30;
    const py = zoneData.player_start ? zoneData.player_start.y : 15;
    const ex = zoneData.exit_pos ? zoneData.exit_pos.x : 31;
    const ey = zoneData.exit_pos ? zoneData.exit_pos.y : 15;

    writeTileToRam(px, py, TileType.PLAYER_START);
    writeTileToRam(ex, ey, TileType.EXIT_PORTAL);

    const startOffset = (py * W + px) & 0xFFFF;
    const exitOffset = (ey * W + ex) & 0xFFFF;
    const charX = ((px + 1) * 2) & 0xFF;
    const charY = (py * 2) & 0xFF;

    const lmsX = charX < 0x16 ? 0 : Math.min(0x54, charX - 0x14);
    const lmsY = charY < 0x0C ? 0 : Math.min(0x28, charY - 0x0A);
    const hpos = (40 + (charX - lmsX) * 4) & 0xFF;
    const pmgY = (32 + (charY - lmsY) * 8) & 0xFF;

    this.ram[0x05B4] = startOffset & 0xFF;
    this.ram[0x05B5] = (startOffset >> 8) & 0xFF;
    this.ram[0x05B6] = hpos;
    this.ram[0x05B7] = pmgY;
    this.ram[0x05B8] = exitOffset & 0xFF;
    this.ram[0x05B9] = (exitOffset >> 8) & 0xFF;

    const exitScr = (0x1C00 + ey * 2 * GridConfig.PLAYFIELD_ROW_STRIDE + (ex + 1) * 2) & 0xFFFF;
    this.ram[0x05BA] = exitScr & 0xFF;
    this.ram[0x05BB] = (exitScr >> 8) & 0xFF;

    this.ram[0x055B] = startOffset & 0xFF;
    this.ram[0x055C] = (startOffset >> 8) & 0xFF;
    this.ram[0x055D] = hpos;
    this.ram[0xD000] = hpos;
    this.ram[0xD001] = hpos;
    this.ram[0x055E] = pmgY;
    this.ram[SystemAddressMap.PLAYER_CHAR_X] = charX;
    this.ram[SystemAddressMap.PLAYER_CHAR_Y] = charY;
    this.ram[0x0568] = 0x00;
    this.ram[0x056B] = 0x08;
    this.ram[0x056C] = 0x00;
    this.ram[SystemAddressMap.HSCROL] = 0x08;
    this.ram[SystemAddressMap.VSCROL] = 0x00;

    this.ram[SystemAddressMap.PLUTONIUM_REMAINING] = Math.max(1, plutoniumCount);
    this.ram[SystemAddressMap.CONTAINERS_REMAINING] = Math.max(1, containerCount);
    this.ram[SystemAddressMap.DOOR_COUNT] = doorCount & 0xFF;
    this.ram[0x05C1] = 0x09;

    if (Array.isArray(zoneData.colors) && zoneData.colors.length >= 4) {
      for (let i = 0; i < 4; i++) {
        this.ram[SystemAddressMap.COLOR0_SHADOW + i] = zoneData.colors[i] & 0xFF;
      }
    }

    for (let i = 0; i < 0x0300; i++) {
      this.ram[0x0600 + i] = 0;
    }
    this.ram[0x05A3] = 0x00;
    this.ram[0x05A4] = 0x00;
    this.ram[0x05A5] = 0xFF;
    this.ram[0x05A6] = 0xFF;
    const maxRobots = Math.min(GridConfig.MAX_MOVING_ENEMIES, robots.length);
    this.ram[SystemAddressMap.ACTIVE_ROBOT_COUNT] = maxRobots;
    for (let i = 0; i < maxRobots; i++) {
      const r = robots[i];
      const base = 0x0600 + i * 8;
      const rCharX = ((r.x + 1) * 2) & 0xFF;
      const rCharY = (r.y * 2) & 0xFF;
      const scrPtr = (0x1C00 + rCharY * GridConfig.PLAYFIELD_ROW_STRIDE + rCharX) & 0xFFFF;
      const etype = r.type & 1;

      this.ram[base + 0] = etype;
      this.ram[base + 1] = 1;
      this.ram[base + 2] = 0xFF;
      this.ram[base + 3] = rCharX;
      this.ram[base + 4] = rCharY;
      this.ram[base + 5] = scrPtr & 0xFF;
      this.ram[base + 6] = (scrPtr >> 8) & 0xFF;
      this.ram[base + 7] = 0;

      const cBase = etype === 0 ? 0xC8 : 0x4C;
      this.ram[scrPtr] = cBase;
      this.ram[scrPtr + 1] = cBase + 1;
      this.ram[scrPtr + 128] = cBase + 2;
      this.ram[scrPtr + 129] = cBase + 3;
    }

    const warps = Array.isArray(zoneData.warps) ? zoneData.warps : [];
    const internalZ = this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] & 0x0F;
    const warpTableAddr = 0x0900;
    this.ram[0xA3D8 + internalZ * 2] = warpTableAddr & 0xFF;
    this.ram[0xA3D8 + internalZ * 2 + 1] = (warpTableAddr >> 8) & 0xFF;
    this.ram[SystemAddressMap.WARP_COUNT] = warps.length & 0xFF;

    for (let w = 0; w < warps.length && w < GridConfig.MAX_WARP_GATES; w++) {
      const wp = warps[w];
      const sOff = (wp.src_y * W + wp.src_x) & 0xFFFF;
      const dOff = (wp.dst_y * W + wp.dst_x) & 0xFFFF;
      const dCharX = ((wp.dst_x + 1) * 2) & 0xFF;
      const dCharY = (wp.dst_y * 2) & 0xFF;
      const dLmsX = dCharX < 0x16 ? 0 : Math.min(0x54, dCharX - 0x14);
      const dLmsY = dCharY < 0x0C ? 0 : Math.min(0x28, dCharY - 0x0A);
      const dHpos = (40 + (dCharX - dLmsX) * 4) & 0xFF;
      const dPmgY = (32 + (dCharY - dLmsY) * 8) & 0xFF;

      const p = warpTableAddr + w * 6;
      this.ram[p + 0] = sOff & 0xFF;
      this.ram[p + 1] = (sOff >> 8) & 0xFF;
      this.ram[p + 2] = dOff & 0xFF;
      this.ram[p + 3] = (dOff >> 8) & 0xFF;
      this.ram[p + 4] = dHpos;
      this.ram[p + 5] = dPmgY;
    }

    const zNum = zoneData.zone || 13;
    const bcdZone = ((((zNum / 10) | 0) << 4) | (zNum % 10)) & 0xFF;
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;

    this.callSubroutine(0x43BF, 5000);
    this.callSubroutine(0x435F, 5000);
    this.callSubroutine(0x4462, 5000);
    this.callSubroutine(0x47A0, 5000);
    this.state.collisionP0PF = 0;
    this.state.collisionP1PF = 0;
    this.silencePokeyAndSfx();
    this.runVbi();
    this.runVbi();
  }

  bootTitleScreen(zoneNumber = 1, optionLevel = 1) {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    const zIdx = Math.max(0, Math.min(11, (zoneNumber | 0) - 1));
    const diffIdx = Math.max(0, Math.min(2, (optionLevel | 0) - 1));
    const bcdZone = ((((zIdx + 1) / 10) | 0) << 4) | ((zIdx + 1) % 10);

    this.ram[SystemAddressMap.SELECTED_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.ACTIVE_ZONE_IDX] = zIdx;
    this.ram[SystemAddressMap.INTERNAL_ROM_ZONE_IDX] = this.ram[0xA3CC + zIdx];
    this.ram[SystemAddressMap.HUD_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.ACTIVE_ZONE_BCD] = bcdZone;
    this.ram[SystemAddressMap.SELECTED_DIFFICULTY] = diffIdx;
    this.ram[SystemAddressMap.ACTIVE_DIFFICULTY] = diffIdx;

    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x6054;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x75F2 && steps < 250000) {
      this.step();
      steps++;
    }
    this.runVbi();
  }

  bootFeaturesScreen() {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    this.sp = 0xFF;
    this.stopped = false;
    this.pc = 0x60B3;

    let steps = 0;
    while (!this.stopped && this.pc !== 0x9368 && steps < 250000) {
      this.step();
      steps++;
    }
    this.silencePokeyAndSfx();
    this.runVbi();
    this.runVbi();
  }

  bootHallOfFameScreen() {
    this.activeCustomZone = null;
    this.loadBaseBinary();
    this.ram[0x05D5] = 0x01;
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
