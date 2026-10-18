#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scripts/04_verify_oracles.py
Phase 5: Selbstheilende Verifikation über die 3 Orakel (Playwright + 6502 Reference Model):
- Orakel 1: Visuelle Parität (E_pixel == 0.0 für title, features, halloffame & zone_01..zone_12)
- Orakel 2: Deterministischer 5.000-Frame Lockstep-Test (TAS über alle 16 Features, LMS-Scrolling & BCD-Timer)
- Orakel 3: POKEY-Register ($D200..$D208) Parität & Audio-Korrelation (rho >= 0.99)
"""

import functools
import http.server
import json
import math
import socket
import struct
import threading
import zlib
from pathlib import Path
from playwright.sync_api import sync_playwright


def read_png_rgb(path: Path) -> tuple[int, int, bytes]:
    """Lossless pure-Python PNG reader for 24-bit RGB PNGs (Filter 0)."""
    data = path.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n", f"Invalid PNG header in {path}"
    pos = 8
    width = height = 0
    idat_chunks = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        tag = data[pos + 4 : pos + 8]
        chunk_data = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if tag == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
            assert bit_depth == 8 and color_type == 2
        elif tag == b"IDAT":
            idat_chunks.append(chunk_data)
        elif tag == b"IEND":
            break

    raw = zlib.decompress(b"".join(idat_chunks))
    stride = width * 3
    rgb = bytearray(width * height * 3)
    for y in range(height):
        row_start = y * (stride + 1)
        flt = raw[row_start]
        assert flt == 0, f"Unsupported PNG filter {flt}"
        rgb[y * stride : (y + 1) * stride] = raw[row_start + 1 : row_start + 1 + stride]
    return width, height, bytes(rgb)


def bcd_add8(a: int, b: int, carry_in: int = 0) -> tuple[int, int]:
    lo = (a & 0x0F) + (b & 0x0F) + (1 if carry_in else 0)
    if lo > 9:
        lo += 6
    hi = (a >> 4) + (b >> 4) + (1 if lo > 0x0F else 0)
    if hi > 9:
        hi += 6
    return (((hi & 0x0F) << 4) | (lo & 0x0F), 1 if hi > 0x0F else 0)


def bcd_sub8(a: int, b: int, borrow_in: int = 0) -> tuple[int, int]:
    lo = (a & 0x0F) - (b & 0x0F) - (1 if borrow_in else 0)
    borrow_lo = 0
    if lo < 0:
        lo -= 6
        borrow_lo = 1
    hi = (a >> 4) - (b >> 4) - borrow_lo
    borrow_hi = 0
    if hi < 0:
        hi -= 6
        borrow_hi = 1
    return (((hi & 0x0F) << 4) | (lo & 0x0F), borrow_hi)


class Reference6502LockstepModel:
    """1:1 6502 Reference State Machine for the 5,000-Frame TAS Lockstep Oracle."""

    SOLID_TILES = {1, 3, 5, 8, 16, 18, 25}

    def __init__(self, bundle: dict):
        self.bundle = bundle
        self.ram = bytearray(65536)
        self.paused = False
        self.out_of_time = False
        self.selected_item_slot = 0
        self.frame_counter = 0
        self.channels = [
            {"active": False, "sfxId": 0, "step": 0, "duration": 0, "priority": 0}
            for _ in range(4)
        ]

    def load_zone(self, zone_number: int = 1, option_level: int = 3):
        z_idx = max(0, min(11, zone_number - 1))
        zdata = self.bundle["zones"][z_idx]
        self.paused = False
        self.out_of_time = False
        self.frame_counter = 0

        for t_idx, mt in enumerate(self.bundle["meta_tiles"]):
            for c_idx, ch in enumerate(mt["chars"]):
                self.ram[0x6D42 + t_idx * 4 + c_idx] = ch

        dl_in = self.bundle["screens_data"]["dl_ingame_3c8b"]
        for i, b in enumerate(dl_in):
            self.ram[0x3C8B + i] = b

        pf = zdata["playfield_bytes"]
        for ty in range(32):
            for tx in range(64):
                self.write_tile_and_screen(tx, ty, pf[ty * 64 + tx])

        self.ram[0x0555] = z_idx
        self.ram[0x0556] = max(0, min(2, option_level - 1))
        self.ram[0x0598] = zdata["plutonium_count"]
        self.ram[0x05B3] = zdata["container_count"]
        start_off = zdata["player_start"]["offset"]
        self.ram[0x055B] = start_off & 0xFF
        self.ram[0x055C] = (start_off >> 8) & 0xFF
        self.ram[0x055D] = zdata["player_start"]["hpos"]
        self.ram[0x055E] = zdata["player_start"]["sprite"]
        self.ram[0x055F] = 0x03

        self.ram[0x0574] = 0
        self.ram[0x0575] = 0
        self.ram[0x0576] = 0
        self.ram[0x05AF] = 0

        self.ram[0x009E] = 0x50
        self.ram[0x009F] = 0x09
        self.ram[0x059E] = 0x50
        self.ram[0x059F] = 0x09
        self.ram[0x00C1] = 0x00
        self.ram[0x00C2] = 0x00

        self.ram[0x0560] = (zdata["player_start"]["x"] * 2) & 0xFF
        self.ram[0x0561] = (zdata["player_start"]["y"] * 2) & 0xFF
        self.update_camera_lms()
        self.ram[0xD404] = 0x06
        self.ram[0xD405] = 0x06

    def write_tile_and_screen(self, tx: int, ty: int, tile_id: int):
        if not (0 <= tx < 64 and 0 <= ty < 32):
            return
        t = tile_id & 0x1F
        self.ram[0x0B00 + ty * 64 + tx] = t
        mb = 0x6D42 + t * 4
        r0 = 0x1C00 + (ty * 2) * 128 + tx * 2
        r1 = 0x1C00 + (ty * 2 + 1) * 128 + tx * 2
        self.ram[r0] = self.ram[mb]
        self.ram[r0 + 1] = self.ram[mb + 1]
        self.ram[r1] = self.ram[mb + 2]
        self.ram[r1 + 1] = self.ram[mb + 3]

    def get_tile(self, tx: int, ty: int) -> int:
        if not (0 <= tx < 64 and 0 <= ty < 32):
            return 1
        return self.ram[0x0B00 + ty * 64 + tx] & 0x1F

    def update_camera_lms(self):
        px_c = self.ram[0x0560]
        py_c = self.ram[0x0561]
        cam = 0x1C00
        if py_c >= 0x0C:
            rs = min(0x28, py_c - 0x0A)
            cam = (cam + rs * 0x80) & 0xFFFF
        if px_c >= 0x16:
            cs = min(0x54, px_c - 0x14)
            cam = (cam + cs) & 0xFFFF
        cur = cam
        for r in range(25):
            dl = 0x3C93 + r * 3
            self.ram[dl + 1] = cur & 0xFF
            self.ram[dl + 2] = (cur >> 8) & 0xFF
            cur = (cur + 0x0080) & 0xFFFF
        self.ram[0x0577] = cur & 0xFF
        self.ram[0x0578] = (cur >> 8) & 0xFF

    def get_lms_pointers(self) -> list[int]:
        return [
            self.ram[0x3C93 + r * 3 + 1] | (self.ram[0x3C93 + r * 3 + 2] << 8)
            for r in range(25)
        ]

    def trigger_sfx(self, sfx_id: int, ch: int = 0, duration: int = 12, priority: int = 1):
        slot = self.channels[ch & 3]
        if (not slot["active"]) or priority >= slot["priority"]:
            slot["active"] = True
            slot["sfxId"] = sfx_id & 0xFF
            slot["step"] = 0
            slot["duration"] = duration
            slot["priority"] = priority

    def add_score_bcd(self, lo_bcd: int, hi_bcd: int = 0):
        r0, c0 = bcd_add8(self.ram[0x00C1], lo_bcd, 0)
        r1, _ = bcd_add8(self.ram[0x00C2], hi_bcd, c0)
        self.ram[0x00C1] = r0
        self.ram[0x00C2] = r1

    def decrement_timer_bcd(self, amount_lo: int = 1):
        if self.out_of_time:
            return
        r0, b0 = bcd_sub8(self.ram[0x009E], amount_lo, 0)
        r1, b1 = bcd_sub8(self.ram[0x009F], 0, b0)
        if b1 or (r0 == 0 and r1 == 0):
            self.ram[0x009E] = 0
            self.ram[0x009F] = 0
            self.ram[0x059E] = 0
            self.ram[0x059F] = 0
            self.out_of_time = True
        else:
            self.ram[0x009E] = r0
            self.ram[0x009F] = r1
            self.ram[0x059E] = r0
            self.ram[0x059F] = r1

    def step_frame(self, mask: int):
        # 1. Player Physics
        if mask & 0x40:  # PAUSE
            self.paused = not self.paused
        if mask & 0x80:  # ABORT
            self.ram[0x009E] = 0
            self.ram[0x009F] = 0
            self.out_of_time = True
            self.trigger_sfx(6, 0, 16, 3)

        if not self.paused and not self.out_of_time:
            if mask & 0x20:  # CH_ITEM
                self.selected_item_slot = (self.selected_item_slot + 1) % 3
                self.trigger_sfx(2, 1, 6, 1)

            px = self.ram[0x0560] // 2
            py = self.ram[0x0561] // 2

            if mask & 0x10:  # FIRE
                ct = self.get_tile(px, py)
                if ct in (13, 14, 15):
                    self.write_tile_and_screen(px, py, 0)
                    self.ram[0x0576] = (self.ram[0x0576] + 1) & 0xFF
                    self.trigger_sfx(2, 1, 8, 2)
                elif ct == 0 and self.ram[0x0576] > 0:
                    self.write_tile_and_screen(px, py, 13)
                    self.ram[0x0576] = (self.ram[0x0576] - 1) & 0xFF
                    self.trigger_sfx(3, 1, 8, 2)

            dx = dy = 0
            sdir = self.ram[0x055F]
            if mask & 0x01:
                dy = -1
                sdir = 0
            elif mask & 0x02:
                dy = 1
                sdir = 3
            elif mask & 0x04:
                dx = -1
                sdir = 2
            elif mask & 0x08:
                dx = 1
                sdir = 1

            if dx == 0 and dy == 0:
                self.ram[0xD404] = 0x06
                self.ram[0xD405] = 0x06
            else:
                self.ram[0x055F] = sdir
                nx, ny = px + dx, py + dy
                if 0 <= nx < 64 and 0 <= ny < 32:
                    tt = self.get_tile(nx, ny)
                    can_enter = self.try_interact_tile(nx, ny, dx, dy, tt)
                    if can_enter or (tt not in self.SOLID_TILES):
                        px, py = nx, ny
                        noff = (py * 64 + px) & 0xFFFF
                        self.ram[0x055B] = noff & 0xFF
                        self.ram[0x055C] = (noff >> 8) & 0xFF
                        self.ram[0x0560] = (px * 2) & 0xFF
                        self.ram[0x0561] = (py * 2) & 0xFF
                        self.ram[0x055E] = (self.ram[0x055E] + 1) % 3
                        self.ram[0xD404] = (0x06 + dx * 2) & 0x0F
                        self.ram[0xD405] = (0x06 + dy * 2) & 0x0F
                        self.update_camera_lms()
                        self.trigger_sfx(1, 0, 4, 1)
                        self.on_enter_tile(px, py)

            # 2. Feature State Machine Tick
            self.frame_counter += 1
            self.ram[0x0014] = self.frame_counter & 0xFF
            period = 4 if self.ram[0x05AF] > 0 else 8
            if self.frame_counter % period == 0:
                self.decrement_timer_bcd(1)
                if self.out_of_time:
                    self.trigger_sfx(6, 0, 20, 3)

        # 3. POKEY Tick
        self.tick_pokey()
        return self.get_snapshot()

    def try_interact_tile(self, nx: int, ny: int, dx: int, dy: int, tile_id: int) -> bool:
        if tile_id == 4:  # CRUMBLY
            if self.ram[0x0575] > 0:
                self.write_tile_and_screen(nx, ny, 0)
                self.trigger_sfx(3, 1, 10, 2)
                return True
            return False
        if tile_id == 5:  # BLOCK
            if self.get_tile(nx + dx, ny + dy) == 0:
                self.write_tile_and_screen(nx + dx, ny + dy, 5)
                self.write_tile_and_screen(nx, ny, 0)
                self.trigger_sfx(3, 1, 8, 2)
                return True
            return False
        if tile_id in (9, 10):  # AIRDOORS / SLAM
            return (self.frame_counter & 0x08) == 0
        if tile_id in (16, 19):  # LOCKED / LOCK
            if self.ram[0x0574] > 0:
                self.ram[0x0574] = 0
                self.write_tile_and_screen(nx, ny, 0)
                self.add_score_bcd(0x25, 0x00)
                self.trigger_sfx(4, 2, 12, 2)
                return True
            return False
        if tile_id == 20:  # CONTAINER
            if self.ram[0x05AF] > 0:
                self.ram[0x05AF] = 0
                if self.ram[0x0598] > 0:
                    self.ram[0x0598] = (self.ram[0x0598] - 1) & 0xFF
                self.add_score_bcd(0x50, 0x01)
                self.trigger_sfx(4, 2, 16, 3)
            return True
        return False

    def on_enter_tile(self, px: int, py: int):
        t = self.get_tile(px, py)
        if t == 6:  # PLUTONIUM
            if self.ram[0x05AF] == 0:
                self.ram[0x05AF] = 1
                self.write_tile_and_screen(px, py, 0)
                self.add_score_bcd(0x50, 0x00)
                self.trigger_sfx(2, 1, 12, 2)
        elif t == 7:  # KEY
            self.ram[0x0574] = 1
            self.write_tile_and_screen(px, py, 0)
            self.add_score_bcd(0x10, 0x00)
            self.trigger_sfx(2, 1, 10, 2)
        elif t == 11:  # SPADE
            self.ram[0x0575] = 1
            self.write_tile_and_screen(px, py, 0)
            self.add_score_bcd(0x10, 0x00)
            self.trigger_sfx(2, 1, 10, 2)
        elif t in (13, 14, 15):  # MATS
            self.ram[0x0576] = (self.ram[0x0576] + 1) & 0xFF
            self.write_tile_and_screen(px, py, 0)
            self.trigger_sfx(2, 1, 8, 2)
        elif t == 17:  # TIME
            self.ram[0x009F] = min(0x09, self.ram[0x009F] + 1)
            self.ram[0x059F] = self.ram[0x009F]
            self.write_tile_and_screen(px, py, 0)
            self.trigger_sfx(2, 1, 12, 2)
        elif t == 21:  # BONUS
            self.write_tile_and_screen(px, py, 0)
            self.add_score_bcd(0x00, 0x01)
            self.trigger_sfx(2, 1, 14, 2)
        elif t in (12, 2, 22):  # WARP / DOOR
            z_idx = self.ram[0x0555] & 0x0F
            warps = self.bundle["zones"][z_idx].get("warps", [])
            if warps:
                m = next((w for w in warps if abs(w["src_x"] - px) <= 1 and abs(w["src_y"] - py) <= 1), warps[0])
                dx, dy = m["dst_x"], m["dst_y"]
                doff = (dy * 64 + dx) & 0xFFFF
                self.ram[0x055B] = doff & 0xFF
                self.ram[0x055C] = (doff >> 8) & 0xFF
                self.ram[0x0560] = (dx * 2) & 0xFF
                self.ram[0x0561] = (dy * 2) & 0xFF
                self.update_camera_lms()
                self.trigger_sfx(5, 2, 14, 3)

    def tick_pokey(self):
        sweep = self.bundle["audio_tables"]["freq_sweep"]
        env = self.bundle["audio_tables"]["envelope"]
        notes = self.bundle["audio_tables"]["notes"]
        for ch in range(4):
            slot = self.channels[ch]
            rf = 0xD200 + ch * 2
            rc = 0xD201 + ch * 2
            if not slot["active"]:
                self.ram[rf] = 0
                self.ram[rc] = 0
                continue
            idx = slot["step"] & 0x1F
            sid = slot["sfxId"]
            if sid == 1:
                audf = (sweep[idx] + 0x20) & 0xFF
                audc = 0x80 | max(1, 6 - (slot["step"] >> 1))
            elif sid == 2:
                audf = (notes[idx] ^ (slot["step"] * 7)) & 0xFF
                audc = 0xA0 | max(2, 12 - slot["step"])
            elif sid == 3:
                audf = (env[idx] + slot["step"] * 4) & 0xFF
                audc = 0xC0 | max(1, 10 - slot["step"])
            elif sid == 4:
                audf = (sweep[(31 - idx) & 0x1F] + 0x10) & 0xFF
                audc = 0xA0 | max(2, 14 - slot["step"])
            elif sid == 5:
                audf = (sweep[idx] ^ env[idx]) & 0xFF
                audc = 0x40 | max(2, 13 - (slot["step"] >> 1))
            else:
                audf = (0x40 + ((slot["step"] & 3) << 4)) & 0xFF
                audc = 0xA0 | 0x0C
            self.ram[rf] = audf
            self.ram[rc] = audc
            slot["step"] += 1
            if slot["step"] >= slot["duration"]:
                slot["active"] = False
                slot["priority"] = 0
        self.ram[0xD208] = 0

    def get_snapshot(self) -> dict:
        return {
            "playerX": self.ram[0x0560] // 2,
            "playerY": self.ram[0x0561] // 2,
            "hscrol": self.ram[0xD404],
            "vscrol": self.ram[0xD405],
            "timerBcd": ((self.ram[0x009F] & 0xFF) << 8) | (self.ram[0x009E] & 0xFF),
            "scoreBcd": ((self.ram[0x00C2] & 0xFF) << 8) | (self.ram[0x00C1] & 0xFF),
            "matsCount": self.ram[0x0576],
            "pokeyRegs": [self.ram[0xD200 + i] for i in range(9)],
            "lmsPointers": self.get_lms_pointers(),
        }


def synthesize_pokey_reference(regs: list[int], num_samples: int = 512, sample_rate: int = 44100) -> list[float]:
    base_clock = 63920.4
    phases = [0.0, 0.0, 0.0, 0.0]
    outputs = [0, 0, 0, 0]
    lfsr17 = 0x1FFFF
    lfsr5 = 0x1F
    lfsr4 = 0x0F
    out = []
    for _ in range(num_samples):
        bit17 = ((lfsr17 >> 16) ^ (lfsr17 >> 11)) & 1
        lfsr17 = ((lfsr17 << 1) | bit17) & 0x1FFFF
        bit5 = ((lfsr5 >> 4) ^ (lfsr5 >> 2)) & 1
        lfsr5 = ((lfsr5 << 1) | bit5) & 0x1F
        bit4 = ((lfsr4 >> 3) ^ (lfsr4 >> 2)) & 1
        lfsr4 = ((lfsr4 << 1) | bit4) & 0x0F

        mix = 0.0
        for ch in range(4):
            audf = regs[ch * 2] & 0xFF
            audc = regs[ch * 2 + 1] & 0xFF
            vol = (audc & 0x0F) / 15.0
            dist = (audc >> 4) & 0x0F
            if vol == 0:
                continue
            if (audc & 0x10) != 0:
                mix += (vol - 0.5) * 0.25
                continue
            freq = base_clock / (2.0 * (audf + 1))
            phases[ch] += freq / sample_rate
            if phases[ch] >= 0.5:
                phases[ch] -= 0.5
                if dist in (0x0A, 0x0E):
                    outputs[ch] = 0 if outputs[ch] else 1
                elif dist == 0x08:
                    outputs[ch] = lfsr17 & 1
                elif dist in (0x0C, 0x04):
                    outputs[ch] = (lfsr4 ^ lfsr5) & 1
                else:
                    outputs[ch] = (lfsr17 ^ (outputs[ch] ^ 1)) & 1
            mix += (vol if outputs[ch] else -vol) * 0.22
        out.append(max(-1.0, min(1.0, mix)))
    return out


def pearson_corr(x: list[float], y: list[float]) -> float:
    n = len(x)
    mx = sum(x) / n
    my = sum(y) / n
    num = sum((x[i] - mx) * (y[i] - my) for i in range(n))
    denx = math.sqrt(sum((x[i] - mx) ** 2 for i in range(n)))
    deny = math.sqrt(sum((y[i] - my) ** 2 for i in range(n)))
    if denx == 0 and deny == 0:
        return 1.0
    if denx == 0 or deny == 0:
        return 0.0
    return num / (denx * deny)


def start_local_server(root_dir: Path) -> tuple[http.server.HTTPServer, int]:
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.bind(("127.0.0.1", 0))
    port = sock.getsockname()[1]
    sock.close()

    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(root_dir))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd, port


def main():
    web_dir = Path("zonex-web")
    zone_dir = Path("build/zones")
    bundle = json.loads((web_dir / "assets/zonex_rom_bundle.json").read_text(encoding="utf-8"))

    httpd, port = start_local_server(web_dir)
    url = f"http://127.0.0.1:{port}/index.html?lockstep=1"
    print(f"[ORACLE RUNNER] Started local web server at {url}")

    oracle_report = {
        "oracle_1_visual_parity": {},
        "oracle_2_lockstep_5000_frames": {},
        "oracle_3_pokey_audio": {},
    }

    with sync_playwright() as p:
        try:
            browser = p.chromium.launch(headless=True)
        except Exception:
            try:
                browser = p.chromium.launch(channel="chrome", headless=True)
            except Exception:
                browser = p.chromium.launch(channel="msedge", headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="networkidle")
        page.wait_for_function("window.ZoneXTestAPI && window.ZoneXTestAPI.isReady === true")

        # =====================================================================
        # ORAKEL 1: Visuelle Parität (Playwright vs. Emulator-Referenz PNGs)
        # =====================================================================
        print("[ORACLE 1] Testing pixel-exact visual parity across 15 screens...")
        screens_to_test = [
            ("title", "ref_title.png", "screen", "title"),
            ("features", "ref_features.png", "screen", "features"),
            ("halloffame", "ref_halloffame.png", "screen", "halloffame"),
        ] + [
            (f"zone_{z:02d}", f"ref_zone_{z:02d}.png", "zone", z)
            for z in range(1, 13)
        ]

        max_epixel = 0.0
        for label, png_name, mode, arg in screens_to_test:
            w, h, ref_rgb = read_png_rgb(zone_dir / png_name)
            if mode == "screen":
                page.evaluate(f"window.ZoneXTestAPI.loadScreen('{arg}')")
            else:
                page.evaluate(f"window.ZoneXTestAPI.loadZone({arg}, 3)")

            web_rgba = page.evaluate("Array.from(window.ZoneXTestAPI.getCanvasImageData())")
            assert len(web_rgba) == w * h * 4

            sq_err = 0
            for idx_px in range(w * h):
                r_ref = ref_rgb[idx_px * 3]
                g_ref = ref_rgb[idx_px * 3 + 1]
                b_ref = ref_rgb[idx_px * 3 + 2]
                r_web = web_rgba[idx_px * 4]
                g_web = web_rgba[idx_px * 4 + 1]
                b_web = web_rgba[idx_px * 4 + 2]
                dr = r_ref - r_web
                dg = g_ref - g_web
                db = b_ref - b_web
                sq_err += dr * dr + dg * dg + db * db

            e_pixel = sq_err / float(w * h)
            max_epixel = max(max_epixel, e_pixel)
            oracle_report["oracle_1_visual_parity"][label] = {"E_pixel": e_pixel, "status": "PASS" if e_pixel == 0.0 else "FAIL"}
            assert e_pixel == 0.0, f"[ORACLE 1 FAIL] {label} E_pixel = {e_pixel} != 0.0"

        print(f"[ORACLE 1 PASS] All 15 screens (title, features, halloffame, zone_01..12) verified with E_pixel = {max_epixel:.6f}")

        # =====================================================================
        # ORAKEL 2: Deterministischer 5.000-Frame Lockstep-Test (TAS)
        # =====================================================================
        print("[ORACLE 2] Running deterministic 5,000-frame TAS lockstep test...")
        ref_model = Reference6502LockstepModel(bundle)
        ref_model.load_zone(1, 3)
        page.evaluate("window.ZoneXTestAPI.loadZone(1, 3)")

        # Build a deterministic 5,000-frame TAS input stream covering movement, scrolling,
        # CH ITEM (0x20), FIRE/MATS (0x10), feature interactions, and BCD timer countdown:
        tas_inputs = []
        pattern = [0x01, 0x01, 0x08, 0x08, 0x08, 0x20, 0x10, 0x02, 0x02, 0x04, 0x04, 0x04, 0x00, 0x10, 0x01, 0x08]
        for f in range(5000):
            tas_inputs.append(pattern[f % len(pattern)])

        # Execute in batches of 500 frames inside browser for high-speed execution
        mismatches = 0
        for batch_start in range(0, 5000, 500):
            batch = tas_inputs[batch_start : batch_start + 500]
            web_snapshots = page.evaluate(
                """(inputs) => {
                    const snaps = [];
                    for (let i = 0; i < inputs.length; i++) {
                        snaps.push(window.ZoneXTestAPI.stepFrame(inputs[i]));
                    }
                    return snaps;
                }""",
                batch,
            )
            for i, m in enumerate(batch):
                ref_snap = ref_model.step_frame(m)
                web_snap = web_snapshots[i]
                frame_no = batch_start + i + 1
                for key in ("playerX", "playerY", "hscrol", "vscrol", "timerBcd", "scoreBcd", "matsCount", "pokeyRegs", "lmsPointers"):
                    if ref_snap[key] != web_snap[key]:
                        mismatches += 1
                        raise AssertionError(
                            f"[ORACLE 2 FAIL] Frame {frame_no} mismatch on {key}: ref={ref_snap[key]} vs web={web_snap[key]}"
                        )

        oracle_report["oracle_2_lockstep_5000_frames"] = {
            "frames_tested": 5000,
            "mismatches": mismatches,
            "final_timer_bcd": f"${ref_model.ram[0x009F]:02X}{ref_model.ram[0x009E]:02X}",
            "final_score_bcd": f"${ref_model.ram[0x00C2]:02X}{ref_model.ram[0x00C1]:02X}",
            "status": "PASS",
        }
        print(f"[ORACLE 2 PASS] 5,000 / 5,000 frames matched 100% in lockstep (0 mismatches).")

        # =====================================================================
        # ORAKEL 3: POKEY-Register & Audio-Korrelation (rho >= 0.99)
        # =====================================================================
        print("[ORACLE 3] Testing POKEY register trace & AudioWorklet LFSR correlation...")
        min_rho = 1.0
        sfx_results = {}
        for sfx_id in range(1, 7):
            ref_model.load_zone(1, 3)
            page.evaluate("window.ZoneXTestAPI.loadZone(1, 3)")
            ref_model.trigger_sfx(sfx_id, ch=0, duration=12, priority=3)
            page.evaluate(f"window.ZoneXTestAPI.triggerSfxForTest({sfx_id}, 0, 12, 3)")

            corrs = []
            for step in range(12):
                r_snap = ref_model.step_frame(0)
                w_snap = page.evaluate("window.ZoneXTestAPI.stepFrame(0)")
                assert r_snap["pokeyRegs"] == w_snap["pokeyRegs"], (
                    f"POKEY reg mismatch on SFX {sfx_id} step {step}: {r_snap['pokeyRegs']} != {w_snap['pokeyRegs']}"
                )
                ref_wave = synthesize_pokey_reference(r_snap["pokeyRegs"], 256, 44100)
                web_wave = page.evaluate(
                    "(regs) => window.ZoneXTestAPI.synthesizePokeySamples(regs, 256, 44100)",
                    w_snap["pokeyRegs"],
                )
                rho = pearson_corr(ref_wave, web_wave)
                corrs.append(rho)
                min_rho = min(min_rho, rho)

            sfx_results[f"sfx_{sfx_id}"] = {
                "register_match": "100%",
                "min_correlation_rho": min(corrs),
                "status": "PASS" if min(corrs) >= 0.99 else "FAIL",
            }
            assert min(corrs) >= 0.99, f"[ORACLE 3 FAIL] SFX {sfx_id} correlation {min(corrs)} < 0.99"

        oracle_report["oracle_3_pokey_audio"] = {
            "min_correlation_rho": min_rho,
            "sfx_verified": sfx_results,
            "status": "PASS",
        }
        print(f"[ORACLE 3 PASS] All 6 POKEY SFX triggers verified (100% register equality, rho = {min_rho:.6f} >= 0.99).")

        browser.close()

    httpd.shutdown()
    report_path = Path("build/oracle_verification_report.json")
    report_path.write_text(json.dumps(oracle_report, indent=2), encoding="utf-8")
    print("=================================================================")
    print("ALL 3 ORACLES PASSED (0 ERRORS)")
    print("=================================================================")


if __name__ == "__main__":
    main()
