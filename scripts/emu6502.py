#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/emu6502.py
Präziser 6502-Emulator für den Relocator/Depacker und State-Dumping.
"""

from pathlib import Path

class CPU6502:
    def __init__(self, mem):
        self.mem = bytearray(mem)
        if len(self.mem) < 65536:
            self.mem.extend(b"\x00" * (65536 - len(self.mem)))
        self.a = 0
        self.x = 0
        self.y = 0
        self.sp = 0xFF
        self.pc = 0
        self.flag_c = 0
        self.flag_z = 1
        self.flag_i = 0
        self.flag_d = 0
        self.flag_v = 0
        self.flag_n = 0
        self.cycles = 0
        self.stopped = False

    def get_p(self):
        return (
            (0x80 if self.flag_n else 0)
            | (0x40 if self.flag_v else 0)
            | 0x20
            | (0x08 if self.flag_d else 0)
            | (0x04 if self.flag_i else 0)
            | (0x02 if self.flag_z else 0)
            | (0x01 if self.flag_c else 0)
        )

    def set_p(self, val):
        self.flag_n = 1 if (val & 0x80) else 0
        self.flag_v = 1 if (val & 0x40) else 0
        self.flag_d = 1 if (val & 0x08) else 0
        self.flag_i = 1 if (val & 0x04) else 0
        self.flag_z = 1 if (val & 0x02) else 0
        self.flag_c = 1 if (val & 0x01) else 0

    def set_zn(self, val):
        val = val & 0xFF
        self.flag_z = 1 if val == 0 else 0
        self.flag_n = 1 if (val & 0x80) else 0
        return val

    def push(self, val):
        self.mem[0x0100 + self.sp] = val & 0xFF
        self.sp = (self.sp - 1) & 0xFF

    def pull(self):
        self.sp = (self.sp + 1) & 0xFF
        return self.mem[0x0100 + self.sp]

    def read8(self, addr):
        return self.mem[addr & 0xFFFF]

    def write8(self, addr, val):
        addr = addr & 0xFFFF
        self.mem[addr] = val & 0xFF

    def read16(self, addr):
        lo = self.read8(addr)
        hi = self.read8(addr + 1)
        return (hi << 8) | lo

    def step(self):
        if self.stopped:
            return
        pc = self.pc
        op = self.read8(pc)
        self.pc = (self.pc + 1) & 0xFFFF

        if op == 0xEA:
            pass
        elif op == 0xA9:
            self.a = self.set_zn(self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op == 0xA5:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xB5:
            addr = (self.read8(self.pc) + self.x) & 0xFF
            self.pc = (self.pc + 1) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xAD:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xBD:
            addr = (self.read16(self.pc) + self.x) & 0xFFFF
            self.pc = (self.pc + 2) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xB9:
            addr = (self.read16(self.pc) + self.y) & 0xFFFF
            self.pc = (self.pc + 2) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xB1:
            zp = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            base = self.read16(zp)
            addr = (base + self.y) & 0xFFFF
            self.a = self.set_zn(self.read8(addr))
        elif op == 0xA2:
            self.x = self.set_zn(self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op == 0xA6:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.x = self.set_zn(self.read8(addr))
        elif op == 0xAE:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.x = self.set_zn(self.read8(addr))
        elif op == 0xA0:
            self.y = self.set_zn(self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op == 0xA4:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.y = self.set_zn(self.read8(addr))
        elif op == 0xAC:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.y = self.set_zn(self.read8(addr))
        elif op == 0x85:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.write8(addr, self.a)
        elif op == 0x8D:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.write8(addr, self.a)
        elif op == 0x9D:
            addr = (self.read16(self.pc) + self.x) & 0xFFFF
            self.pc = (self.pc + 2) & 0xFFFF
            self.write8(addr, self.a)
        elif op == 0x99:
            addr = (self.read16(self.pc) + self.y) & 0xFFFF
            self.pc = (self.pc + 2) & 0xFFFF
            self.write8(addr, self.a)
        elif op == 0x91:
            zp = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            base = self.read16(zp)
            addr = (base + self.y) & 0xFFFF
            self.write8(addr, self.a)
        elif op == 0x86:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.write8(addr, self.x)
        elif op == 0x8E:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.write8(addr, self.x)
        elif op == 0x84:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            self.write8(addr, self.y)
        elif op == 0x8C:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            self.write8(addr, self.y)
        elif op == 0xAA:
            self.x = self.set_zn(self.a)
        elif op == 0x8A:
            self.a = self.set_zn(self.x)
        elif op == 0xA8:
            self.y = self.set_zn(self.a)
        elif op == 0x98:
            self.a = self.set_zn(self.y)
        elif op == 0xBA:
            self.x = self.set_zn(self.sp)
        elif op == 0x9A:
            self.sp = self.x
        elif op == 0xE8:
            self.x = self.set_zn(self.x + 1)
        elif op == 0xCA:
            self.x = self.set_zn(self.x - 1)
        elif op == 0xC8:
            self.y = self.set_zn(self.y + 1)
        elif op == 0x88:
            self.y = self.set_zn(self.y - 1)
        elif op == 0xE6:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.set_zn(self.read8(addr) + 1)
            self.write8(addr, val)
        elif op == 0xEE:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            val = self.set_zn(self.read8(addr) + 1)
            self.write8(addr, val)
        elif op == 0xC6:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.set_zn(self.read8(addr) - 1)
            self.write8(addr, val)
        elif op == 0xCE:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            val = self.set_zn(self.read8(addr) - 1)
            self.write8(addr, val)
        elif op == 0xC9:
            val = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            diff = self.a - val
            self.flag_c = 1 if diff >= 0 else 0
            self.set_zn(diff)
        elif op == 0xE0:
            val = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            diff = self.x - val
            self.flag_c = 1 if diff >= 0 else 0
            self.set_zn(diff)
        elif op == 0xC0:
            val = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            diff = self.y - val
            self.flag_c = 1 if diff >= 0 else 0
            self.set_zn(diff)
        elif op == 0xD0:
            rel = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            if not self.flag_z:
                if rel >= 0x80: rel -= 256
                self.pc = (self.pc + rel) & 0xFFFF
        elif op == 0xF0:
            rel = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            if self.flag_z:
                if rel >= 0x80: rel -= 256
                self.pc = (self.pc + rel) & 0xFFFF
        elif op == 0x90:
            rel = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            if not self.flag_c:
                if rel >= 0x80: rel -= 256
                self.pc = (self.pc + rel) & 0xFFFF
        elif op == 0xB0:
            rel = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            if self.flag_c:
                if rel >= 0x80: rel -= 256
                self.pc = (self.pc + rel) & 0xFFFF
        elif op == 0x4C:
            addr = self.read16(self.pc)
            self.pc = addr
        elif op == 0x6C:
            ptr = self.read16(self.pc)
            lo = self.read8(ptr)
            hi = self.read8((ptr & 0xFF00) | ((ptr + 1) & 0xFF))
            self.pc = (hi << 8) | lo
        elif op == 0x20:
            addr = self.read16(self.pc)
            ret = (self.pc + 1) & 0xFFFF
            self.push((ret >> 8) & 0xFF)
            self.push(ret & 0xFF)
            self.pc = addr
        elif op == 0x60:
            lo = self.pull()
            hi = self.pull()
            self.pc = (((hi << 8) | lo) + 1) & 0xFFFF
        elif op == 0x18:
            self.flag_c = 0
        elif op == 0x38:
            self.flag_c = 1
        elif op == 0xD8:
            self.flag_d = 0
        elif op == 0xF8:
            self.flag_d = 1
        elif op == 0x58:
            self.flag_i = 0
        elif op == 0x78:
            self.flag_i = 1
        elif op == 0x48:
            self.push(self.a)
        elif op == 0x68:
            self.a = self.set_zn(self.pull())
        elif op == 0x29:
            self.a = self.set_zn(self.a & self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op == 0x09:
            self.a = self.set_zn(self.a | self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op == 0x49:
            self.a = self.set_zn(self.a ^ self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
        elif op in (0x69, 0x65, 0x75, 0x6D, 0x7D, 0x79, 0x61, 0x71):
            if op == 0x69:
                val = self.read8(self.pc)
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0x65:
                val = self.read8(self.read8(self.pc))
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0x75:
                val = self.read8((self.read8(self.pc) + self.x) & 0xFF)
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0x6D:
                addr = self.read16(self.pc)
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0x7D:
                addr = (self.read16(self.pc) + self.x) & 0xFFFF
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0x79:
                addr = (self.read16(self.pc) + self.y) & 0xFFFF
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0x71:
                zp = self.read8(self.pc)
                self.pc = (self.pc + 1) & 0xFFFF
                addr = (self.read16(zp) + self.y) & 0xFFFF
                val = self.read8(addr)
            else:
                zp = (self.read8(self.pc) + self.x) & 0xFF
                self.pc = (self.pc + 1) & 0xFFFF
                addr = self.read16(zp)
                val = self.read8(addr)

            if self.flag_d:
                lo = (self.a & 0x0F) + (val & 0x0F) + (1 if self.flag_c else 0)
                if lo > 9:
                    lo += 6
                hi = (self.a >> 4) + (val >> 4) + (1 if lo > 0x0F else 0)
                if hi > 9:
                    hi += 6
                self.flag_c = 1 if hi > 0x0F else 0
                res = ((hi & 0x0F) << 4) | (lo & 0x0F)
                self.a = self.set_zn(res)
            else:
                res = self.a + val + (1 if self.flag_c else 0)
                self.flag_v = 1 if ((~(self.a ^ val) & (self.a ^ res) & 0x80) != 0) else 0
                self.flag_c = 1 if res > 0xFF else 0
                self.a = self.set_zn(res & 0xFF)

        elif op in (0xE9, 0xE5, 0xF5, 0xED, 0xFD, 0xF9, 0xE1, 0xF1):
            if op == 0xE9:
                val = self.read8(self.pc)
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0xE5:
                val = self.read8(self.read8(self.pc))
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0xF5:
                val = self.read8((self.read8(self.pc) + self.x) & 0xFF)
                self.pc = (self.pc + 1) & 0xFFFF
            elif op == 0xED:
                addr = self.read16(self.pc)
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0xFD:
                addr = (self.read16(self.pc) + self.x) & 0xFFFF
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0xF9:
                addr = (self.read16(self.pc) + self.y) & 0xFFFF
                self.pc = (self.pc + 2) & 0xFFFF
                val = self.read8(addr)
            elif op == 0xF1:
                zp = self.read8(self.pc)
                self.pc = (self.pc + 1) & 0xFFFF
                addr = (self.read16(zp) + self.y) & 0xFFFF
                val = self.read8(addr)
            else:
                zp = (self.read8(self.pc) + self.x) & 0xFF
                self.pc = (self.pc + 1) & 0xFFFF
                addr = self.read16(zp)
                val = self.read8(addr)

            if self.flag_d:
                borrow = 1 if not self.flag_c else 0
                lo = (self.a & 0x0F) - (val & 0x0F) - borrow
                borrow_lo = 0
                if lo < 0:
                    lo -= 6
                    borrow_lo = 1
                hi = (self.a >> 4) - (val >> 4) - borrow_lo
                borrow_hi = 0
                if hi < 0:
                    hi -= 6
                    borrow_hi = 1
                self.flag_c = 0 if borrow_hi else 1
                res = ((hi & 0x0F) << 4) | (lo & 0x0F)
                self.a = self.set_zn(res)
            else:
                diff = self.a - val - (0 if self.flag_c else 1)
                self.flag_v = 1 if (((self.a ^ val) & (self.a ^ diff) & 0x80) != 0) else 0
                self.flag_c = 0 if diff < 0 else 1
                self.a = self.set_zn(diff & 0xFF)

        elif op == 0x24:
            val = self.read8(self.read8(self.pc))
            self.pc = (self.pc + 1) & 0xFFFF
            self.flag_z = 1 if (self.a & val) == 0 else 0
            self.flag_n = 1 if (val & 0x80) else 0
            self.flag_v = 1 if (val & 0x40) else 0
        elif op == 0x2C:
            val = self.read8(self.read16(self.pc))
            self.pc = (self.pc + 2) & 0xFFFF
            self.flag_z = 1 if (self.a & val) == 0 else 0
            self.flag_n = 1 if (val & 0x80) else 0
            self.flag_v = 1 if (val & 0x40) else 0
        elif op == 0x08:
            self.push(self.get_p() | 0x10)
        elif op == 0x28:
            self.set_p(self.pull())
        elif op == 0x06:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.read8(addr)
            self.flag_c = 1 if (val & 0x80) else 0
            val = self.set_zn((val << 1) & 0xFF)
            self.write8(addr, val)
        elif op == 0x0E:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            val = self.read8(addr)
            self.flag_c = 1 if (val & 0x80) else 0
            val = self.set_zn((val << 1) & 0xFF)
            self.write8(addr, val)
        elif op == 0x46:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.read8(addr)
            self.flag_c = val & 1
            val = self.set_zn(val >> 1)
            self.write8(addr, val)
        elif op == 0x4E:
            addr = self.read16(self.pc)
            self.pc = (self.pc + 2) & 0xFFFF
            val = self.read8(addr)
            self.flag_c = val & 1
            val = self.set_zn(val >> 1)
            self.write8(addr, val)
        elif op == 0x6A:
            c = 0x80 if self.flag_c else 0
            self.flag_c = self.a & 1
            self.a = self.set_zn((self.a >> 1) | c)
        elif op == 0x66:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.read8(addr)
            c = 0x80 if self.flag_c else 0
            self.flag_c = val & 1
            val = self.set_zn((val >> 1) | c)
            self.write8(addr, val)
        elif op == 0x2A:
            c = 1 if self.flag_c else 0
            self.flag_c = 1 if (self.a & 0x80) else 0
            self.a = self.set_zn(((self.a << 1) & 0xFF) | c)
        elif op == 0x26:
            addr = self.read8(self.pc)
            self.pc = (self.pc + 1) & 0xFFFF
            val = self.read8(addr)
            c = 1 if self.flag_c else 0
            self.flag_c = 1 if (val & 0x80) else 0
            val = self.set_zn(((val << 1) & 0xFF) | c)
            self.write8(addr, val)
        else:
            print(f"[CPU STOP] Unhandled opcode 0x{op:02X} at PC=0x{pc:04X}")
            self.stopped = True

def main():
    ram = open("build/ram_loaded_image.bin", "rb").read()
    cpu = CPU6502(ram)
    cpu.pc = 0x3006
    print(f"Starting 6502 at PC=0x{cpu.pc:04X}...")
    
    count = 0
    while not cpu.stopped and count < 1_000_000:
        old_pc = cpu.pc
        if old_pc == 0x012E:
            print(f"Reached 0x012E after relocation! Steps: {count}")
        if old_pc >= 0x4000 and old_pc < 0xA000 and count > 100000:
            print(f"Executed inside game code: PC=0x{old_pc:04X}")
            break
        cpu.step()
        count += 1
        
    print(f"Stopped at PC=0x{cpu.pc:04X} after {count} instructions.")
    Path("build/ram_relocated.bin").write_bytes(cpu.mem)
    print("Saved build/ram_relocated.bin (65536 bytes).")

if __name__ == "__main__":
    main()
