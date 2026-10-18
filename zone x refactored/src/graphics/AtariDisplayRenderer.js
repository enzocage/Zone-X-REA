/**
 * src/graphics/AtariDisplayRenderer.js
 * Clean Atari 800XL Display List, Fine-Scroll (HSCROL/VSCROL), Player/Missile Sprite,
 * and Full 62x32 Map Overview Renderer.
 */

import { DisplayListAddress, ScreenMode, SystemAddressMap } from "../config/Constants.js";

export class AtariDisplayRenderer {
  constructor(canvas, gameState, assetBundle) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { willReadFrequently: true });
    this.state = gameState;
    this.bundle = assetBundle;
    this.width = 336;
    this.height = 240;
    this.xOffset = 8;
    this.imageData = this.ctx.createImageData(this.width, this.height);
    this.palPalette = assetBundle.atari_pal_palette;
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

  readActivePaletteRegisters() {
    const ram = this.state.ram;
    return {
      COLPF0: ram[SystemAddressMap.COLOR0_SHADOW + 0],
      COLPF1: ram[SystemAddressMap.COLOR0_SHADOW + 1],
      COLPF2: ram[SystemAddressMap.COLOR0_SHADOW + 2],
      COLPF3: ram[SystemAddressMap.COLOR0_SHADOW + 3],
      COLBK: ram[SystemAddressMap.COLOR0_SHADOW + 4],
    };
  }

  renderFrame() {
    const ram = this.state.ram;
    const buf = this.imageData.data;
    this.pfColorIndexBuf.fill(0);

    const regs = this.readActivePaletteRegisters();
    const bgRgb = this.palPalette[regs.COLBK] || [0, 0, 0];

    for (let i = 0; i < buf.length; i += 4) {
      buf[i] = bgRgb[0];
      buf[i + 1] = bgRgb[1];
      buf[i + 2] = bgRgb[2];
      buf[i + 3] = 255;
    }

    const dlAddr = this.state.displayListAddress;
    let chbase = (ram[0x02F4] << 8) & 0xFFFF;
    let dliIndex = 0;
    const hscrol = ram[SystemAddressMap.HSCROL] & 0x0F;
    const vscrol = ram[SystemAddressMap.VSCROL] & 0x07;

    const applyDisplayListInterrupt = () => {
      if (dlAddr === DisplayListAddress[ScreenMode.IN_GAME]) {
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        dliIndex++;
      } else if (dlAddr === DisplayListAddress[ScreenMode.FEATURES]) {
        chbase = (ram[0x3E7B + (dliIndex & 1)] << 8) & 0xFFFF;
        regs.COLPF2 = dliIndex & 1 ? 0x00 : 0x86;
        dliIndex++;
      } else if (dlAddr === DisplayListAddress[ScreenMode.TITLE]) {
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

      if (ir === 0x41) break; // Jump and Wait for Vertical Blank

      const mode = ir & 0x0F;
      const hasHscrol = (ir & 0x10) !== 0;
      const hasVscrol = (ir & 0x20) !== 0;
      const hasLms = (ir & 0x40) !== 0;
      const hasDli = (ir & 0x80) !== 0;

      if (mode === 0) {
        inVscrolRegion = false;
        const blankLines = ((ir >> 4) & 0x07) + 1;
        scanlineY += blankLines;
        if (hasDli) applyDisplayListInterrupt();
        continue;
      }

      if (hasLms) {
        const lo = ram[pc & 0xFFFF];
        const hi = ram[(pc + 1) & 0xFFFF];
        pc = (pc + 2) & 0xFFFF;
        curLms = (hi << 8) | lo;
      }

      if (mode === 4) {
        let startScan = 0;
        let endScan = 8;
        if (!inVscrolRegion && hasVscrol) {
          startScan = vscrol;
          endScan = 8;
          inVscrolRegion = true;
        } else if (inVscrolRegion && !hasVscrol) {
          startScan = 0;
          endScan = vscrol;
          inVscrolRegion = false;
        }
        ({ scanlineY, curLms } = this.renderMode4Row(
          buf,
          ram,
          regs,
          chbase,
          curLms,
          scanlineY,
          startScan,
          endScan,
          hasHscrol,
          hscrol
        ));
      } else if (mode === 6) {
        ({ scanlineY, curLms } = this.renderMode6Or7Row(
          buf,
          ram,
          regs,
          bgRgb,
          chbase,
          curLms,
          scanlineY,
          hasHscrol,
          hscrol,
          8
        ));
      } else if (mode === 7) {
        ({ scanlineY, curLms } = this.renderMode6Or7Row(
          buf,
          ram,
          regs,
          bgRgb,
          chbase,
          curLms,
          scanlineY,
          hasHscrol,
          hscrol,
          16
        ));
      } else if (mode === 14) {
        ({ scanlineY, curLms } = this.renderMode14Row(buf, ram, regs, curLms, scanlineY));
      } else if (mode === 2) {
        ({ scanlineY, curLms } = this.renderMode2Row(buf, ram, regs, chbase, curLms, scanlineY));
      } else {
        scanlineY += 8;
      }

      if (hasDli) {
        applyDisplayListInterrupt();
      }
    }

    if (this.fullMapPanel) {
      this.fullMapPanel.style.display =
        dlAddr === DisplayListAddress[ScreenMode.IN_GAME] ? "" : "none";
    }

    this.renderPlayerMissileSprites(buf, ram);

    if (dlAddr === DisplayListAddress[ScreenMode.IN_GAME] && this.fullMapCtx) {
      this.renderFullZoneMap(regs, 0x1800);
    }

    this.ctx.putImageData(this.imageData, 0, 0);
  }

  renderMode4Row(buf, ram, regs, chbase, curLms, scanlineY, startScan, endScan, hasHscrol, hscrol) {
    if (hasHscrol) {
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

          const { colorReg, pfType } = this.resolveMode4Color(regs, bitPair, usePF3);
          this.drawDoublePixel(buf, scanlineY, this.xOffset + dx, this.palPalette[colorReg], pfType);
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
          const screenX = this.xOffset + (chCol << 3);

          for (let px = 0; px < 4; px++) {
            const bitPair = (glyphByte >> (6 - (px << 1))) & 0x03;
            const { colorReg, pfType } = this.resolveMode4Color(regs, bitPair, usePF3);
            this.drawDoublePixel(
              buf,
              scanlineY,
              screenX + (px << 1),
              this.palPalette[colorReg],
              pfType
            );
          }
        }
        scanlineY++;
      }
      curLms = (curLms + 40) & 0xFFFF;
    }
    return { scanlineY, curLms };
  }

  resolveMode4Color(regs, bitPair, usePF3) {
    if (bitPair === 0) return { colorReg: regs.COLBK, pfType: 0 };
    if (bitPair === 1) return { colorReg: regs.COLPF0, pfType: 1 };
    if (bitPair === 2) return { colorReg: regs.COLPF1, pfType: 2 };
    return {
      colorReg: usePF3 ? regs.COLPF3 : regs.COLPF2,
      pfType: usePF3 ? 4 : 3,
    };
  }

  renderMode6Or7Row(
    buf,
    ram,
    regs,
    bgRgb,
    chbase,
    curLms,
    scanlineY,
    hasHscrol,
    hscrol,
    rowHeight
  ) {
    const colorTable = [regs.COLPF0, regs.COLPF1, regs.COLPF2, regs.COLPF3];
    const isDoubleHeight = rowHeight === 16;

    if (hasHscrol) {
      const hShiftPx = (16 - hscrol) * 2;
      for (let s = 0; s < rowHeight; s++) {
        if (scanlineY >= this.height) break;
        const glyphRow = isDoubleHeight ? s >> 1 : s;
        for (let dx = 0; dx < 320; dx += 2) {
          const srcX = dx + hShiftPx;
          const chCol = srcX >> 4;
          const b = (srcX >> 1) & 7;
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x3F;
          const colorSel = (charCode >> 6) & 0x03;
          const fgRgb = this.palPalette[colorTable[colorSel]];
          const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
          const bit = (glyphByte >> (7 - b)) & 1;
          this.drawDoublePixel(
            buf,
            scanlineY,
            this.xOffset + dx,
            bit ? fgRgb : bgRgb,
            bit ? colorSel + 1 : 0
          );
        }
        scanlineY++;
      }
      curLms = (curLms + 24) & 0xFFFF;
    } else {
      for (let s = 0; s < rowHeight; s++) {
        if (scanlineY >= this.height) break;
        const glyphRow = isDoubleHeight ? s >> 1 : s;
        for (let chCol = 0; chCol < 20; chCol++) {
          const charCode = ram[(curLms + chCol) & 0xFFFF];
          const charIndex = charCode & 0x3F;
          const colorSel = (charCode >> 6) & 0x03;
          const fgRgb = this.palPalette[colorTable[colorSel]];
          const glyphByte = ram[(chbase + (charIndex << 3) + glyphRow) & 0xFFFF];
          const baseX = this.xOffset + (chCol << 4);
          for (let b = 0; b < 8; b++) {
            const bit = (glyphByte >> (7 - b)) & 1;
            this.drawDoublePixel(
              buf,
              scanlineY,
              baseX + (b << 1),
              bit ? fgRgb : bgRgb,
              bit ? colorSel + 1 : 0
            );
          }
        }
        scanlineY++;
      }
      curLms = (curLms + 20) & 0xFFFF;
    }
    return { scanlineY, curLms };
  }

  renderMode14Row(buf, ram, regs, curLms, scanlineY) {
    if (scanlineY < this.height) {
      const mode14Colors = [regs.COLBK, regs.COLPF0, regs.COLPF1, regs.COLPF2];
      for (let byteCol = 0; byteCol < 40; byteCol++) {
        const bval = ram[(curLms + byteCol) & 0xFFFF];
        const baseX = this.xOffset + (byteCol << 3);
        for (let px = 0; px < 4; px++) {
          const bp = (bval >> (6 - (px << 1))) & 0x03;
          const rgb = this.palPalette[mode14Colors[bp]];
          this.drawDoublePixel(buf, scanlineY, baseX + (px << 1), rgb, bp);
        }
      }
    }
    return {
      scanlineY: scanlineY + 1,
      curLms: (curLms + 40) & 0xFFFF,
    };
  }

  renderMode2Row(buf, ram, regs, chbase, curLms, scanlineY) {
    const fgRgb = this.palPalette[regs.COLPF1];
    const bgMode2 = this.palPalette[regs.COLPF2];
    for (let s = 0; s < 8; s++) {
      if (scanlineY >= this.height) break;
      for (let chCol = 0; chCol < 40; chCol++) {
        const charCode = ram[(curLms + chCol) & 0xFFFF];
        const charIndex = charCode & 0x7F;
        const inv = (charCode & 0x80) !== 0;
        const glyphByte = ram[(chbase + (charIndex << 3) + s) & 0xFFFF];
        const baseX = this.xOffset + (chCol << 3);
        for (let b = 0; b < 8; b++) {
          const bit = ((glyphByte >> (7 - b)) & 1) ^ (inv ? 1 : 0);
          this.putPixel(buf, baseX + b, scanlineY, bit ? fgRgb : bgMode2, bit ? 2 : 3);
        }
      }
      scanlineY++;
    }
    return {
      scanlineY,
      curLms: (curLms + 40) & 0xFFFF,
    };
  }

  renderPlayerMissileSprites(buf, ram) {
    const dmactl = ram[0x022F] || ram[0xD400];
    const gractl = ram[0xD01D];
    const pmbase = (ram[0xD407] & 0xF8) << 8;

    if ((dmactl & 0x08) === 0 || (gractl & 0x02) === 0 || pmbase === 0) return;

    for (let playerIdx = 3; playerIdx >= 0; playerIdx--) {
      const hpos = ram[0xD000 + playerIdx];
      if (hpos === 0) continue;

      const playerColor = this.palPalette[ram[0x02C0 + playerIdx]] || [255, 255, 255];
      const sizeCode = ram[0xD008 + playerIdx] & 0x03;
      const bitWidth = sizeCode === 1 ? 4 : sizeCode === 3 ? 8 : 2;
      const baseScreenX = this.xOffset + (hpos - 48) * 2;
      const playerBaseAddr = pmbase + 0x0400 + (playerIdx << 8);

      for (let sy = 8; sy < this.height; sy++) {
        const shapeByte = ram[(playerBaseAddr + sy) & 0xFFFF];
        if (shapeByte === 0) continue;

        for (let b = 0; b < 8; b++) {
          if (((shapeByte >> (7 - b)) & 1) === 0) continue;
          const pxStart = baseScreenX + b * bitWidth;

          for (let w = 0; w < bitWidth; w++) {
            const px = pxStart + w;
            if (px >= this.xOffset && px < this.xOffset + 320) {
              const pfType = this.pfColorIndexBuf[sy * this.width + px];
              if (pfType >= 1 && pfType <= 4) {
                const collBit = 1 << (pfType - 1);
                if (playerIdx === 0) {
                  this.state.collisionP0PF = (this.state.collisionP0PF || 0) | collBit;
                } else if (playerIdx === 1) {
                  this.state.collisionP1PF = (this.state.collisionP1PF || 0) | collBit;
                }
              }
            }
            if (px >= 0 && px < this.width) {
              const idx = (sy * this.width + px) << 2;
              buf[idx] = playerColor[0];
              buf[idx + 1] = playerColor[1];
              buf[idx + 2] = playerColor[2];
              buf[idx + 3] = 255;
            }
          }
        }
      }
    }
  }

  renderFullZoneMapIfPresent() {
    if (!this.fullMapCtx) return;
    const regs = this.readActivePaletteRegisters();
    this.renderFullZoneMap(regs, 0x1800);
  }

  renderFullZoneMap(regs, chbase = 0x1800) {
    const ram = this.state.ram;
    const fbuf = this.fullMapImageData.data;
    const mapWidthPx = 992;

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
            const { colorReg } = this.resolveMode4Color(regs, bitPair, usePF3);
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

    const p0Col = this.palPalette[ram[0x02C0]] || [255, 255, 255];
    const p1Col = this.palPalette[ram[0x02C1]] || [255, 128, 0];
    const p0Shape = this.bundle.sprites.p0_shapes[0];
    const p1Shape = this.bundle.sprites.p1_shapes[0];
    const mapPxX = Math.max(0, (ram[SystemAddressMap.PLAYER_CHAR_X] - 2) * 8);
    const mapPxY = Math.max(0, ram[SystemAddressMap.PLAYER_CHAR_Y] * 8);

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
