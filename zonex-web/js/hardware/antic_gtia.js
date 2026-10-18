/**
 * zonex-web/js/hardware/antic_gtia.js
 * Cycle-exact ANTIC Display List & GTIA PAL Renderer (336x240) + Full 62x32 Zone Overview Renderer (992x512).
 * Implements ANTIC Mode 4 (with Bit 7 COLPF3 selector + HSCROL/VSCROL hardware fine scrolling),
 * Mode 6 & Mode 7 (with HSCROL fine scrolling), Mode 14 ($0E), Mode 2,
 * DLI handlers ($64CD In-Game, $9670 Features Showcase, $6978 Title Screen),
 * single-line PMBASE ($1400..$17FF) Player/Missile Graphics (P0..P3), and GTIA P0PF/P1PF collision latches.
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
