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

export class Mos6502Core {
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
