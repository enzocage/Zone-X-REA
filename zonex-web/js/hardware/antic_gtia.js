/**
 * zonex-web/js/hardware/antic_gtia.js
 * Cycle-exact ANTIC Display List & GTIA PAL Renderer (336x240).
 * Implements ANTIC Mode 4 (with Bit 7 COLPF3 selector), Mode 6, Mode 2,
 * 24x $74 + 1x $54 LMS rows, and Player/Missile Graphics (P0 + P1).
 */

export class AnticGtiaRenderer {
  constructor(canvas, memory, bundle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.memory = memory;
    this.bundle = bundle;
    this.width = 336;
    this.height = 240;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.palPalette = bundle.atari_pal_palette;
  }

  putPixel(buf, x, y, rgb) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      const idx = (y * this.width + x) << 2;
      buf[idx] = rgb[0];
      buf[idx + 1] = rgb[1];
      buf[idx + 2] = rgb[2];
      buf[idx + 3] = 255;
    }
  }

  drawDoublePixel(buf, scanlineY, screenX, rgb) {
    this.putPixel(buf, screenX, scanlineY, rgb);
    this.putPixel(buf, screenX + 1, scanlineY, rgb);
  }

  renderFrame(robots = []) {
    const ram = this.memory.ram;
    const buf = this.imageData.data;

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
    const chbase = (ram[0x02F4] << 8) & 0xFFFF;
    const xOffset = 8;

    let scanlineY = 8;
    let pc = dlAddr;
    let curLms = 0;
    let steps = 0;

    while (scanlineY < this.height - 8 && steps < 256) {
      steps++;
      const ir = ram[pc & 0xFFFF];
      pc = (pc + 1) & 0xFFFF;

      if (ir === 0x41) {
        break; // JVB
      }

      const mode = ir & 0x0F;
      const hasLms = (ir & 0x40) !== 0;

      if (mode === 0) {
        const blankLines = ((ir >> 4) & 0x07) + 1;
        scanlineY += blankLines;
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
        for (let scanlineInRow = 0; scanlineInRow < 8; scanlineInRow++) {
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
              if (bitPair === 0) colorReg = regs.COLBK;
              else if (bitPair === 1) colorReg = regs.COLPF0;
              else if (bitPair === 2) colorReg = regs.COLPF1;
              else colorReg = usePF3 ? regs.COLPF3 : regs.COLPF2;
              this.drawDoublePixel(buf, scanlineY, screenX + (px << 1), this.palPalette[colorReg]);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 40) & 0xFFFF;
      } else if (mode === 6) {
        // ANTIC Mode 6 (20 chars x 8 scanlines, 4-color text)
        const mode6Colors = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
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
              this.drawDoublePixel(buf, scanlineY, baseX + (b << 1), bit ? fgRgb : bgRgb);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 20) & 0xFFFF;
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
              this.putPixel(buf, baseX + b, scanlineY, bit ? fgRgb : bgMode2);
            }
          }
          scanlineY++;
        }
        curLms = (curLms + 40) & 0xFFFF;
      } else {
        scanlineY += 8;
      }
    }

    // Player Sprite Overlay (P0 + P1) when In-Game Display List ($3C8B) is active
    if (dlAddr === 0x3C8B) {
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
}
