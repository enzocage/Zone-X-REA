/**
 * @fileoverview True WebGL 3D Bird's-Eye Mesh Renderer for Zone X GFX Redesign.
 *
 * Renders the entire Zone X world from a customizable 3D bird's-eye perspective:
 * - Procedural 3D meshes for all 28 tile types (bevelled reactor bulkheads, rotating
 *   Cherenkov plutonium crystals, containment silos, plasma laser barriers, warp gates,
 *   crystalline regolith, and extraction beacons)
 * - Articulated 3D Astronaut Player with swinging arms/legs, glowing visor, and
 *   plutonium backpack light
 * - Smoothly interpolated 3D Alien Patrol Droids (hovering sentinel spheres &
 *   multi-thruster interceptor mechs)
 * - 3D Particle Shards & Expanding Torus Shockwaves
 * - Dynamic Blinn-Phong lighting with 8 real-time point lights + specular highlights
 *
 * Also maintains the underlying `AtariDisplayRenderer` so hardware P/M collision
 * registers (`collisionP0PF`, `collisionP1PF`), Title/Features screens, and the
 * full tactical zone map remain 100% cycle-accurate.
 */

import { DisplayListAddress, GridConfig, ScreenMode, SystemAddressMap, TileType } from "../config/Constants.js";
import { AtariDisplayRenderer } from "./AtariDisplayRenderer.js";
import { MeshGeometryBuilder } from "./MeshGeometryBuilder.js";

const VERTEX_SHADER_SRC = `
  attribute vec3 aPosition;
  attribute vec3 aNormal;
  attribute vec3 aColor;
  attribute float aEmissive;

  uniform mat4 uViewProj;
  uniform mat4 uModel;
  uniform vec3 uTint;
  uniform float uEmissiveBoost;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vEmissive;

  void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(mat3(uModel) * aNormal);
    vColor = aColor * uTint;
    vEmissive = clamp(aEmissive + uEmissiveBoost, 0.0, 1.5);
    gl_Position = uViewProj * worldPos;
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec3 vColor;
  varying float vEmissive;

  uniform vec3 uCameraPos;
  uniform vec3 uAmbientColor;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec4 uPointLights[8]; // xyz = pos, w = radius
  uniform vec3 uPointColors[8];

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraPos - vWorldPos);

    // Sculptural architectural hemisphere + side-face contrast so white/light-grey blocks have crisp 3D depth
    float hemi = 0.5 + 0.5 * N.y;
    float faceContrast = 0.90 + 0.10 * abs(N.z);
    vec3 lighting = uAmbientColor * (0.62 + 0.46 * hemi) * faceContrast;

    float ndotl = max(dot(N, uSunDir), 0.0);
    vec3 H = normalize(uSunDir + V);
    float spec = pow(max(dot(N, H), 0.0), 34.0) * 0.22;
    lighting += uSunColor * (ndotl * 0.68 + spec);

    // 8 Dynamic Point Lights (subtle colored accents from Plutonium, Active Barrels, Lasers & Portals)
    for (int i = 0; i < 8; i++) {
      vec3 lVec = uPointLights[i].xyz - vWorldPos;
      float radius = uPointLights[i].w;
      if (radius > 0.01) {
        float dist = length(lVec);
        if (dist < radius) {
          vec3 L = lVec / max(dist, 0.001);
          float atten = pow(1.0 - dist / radius, 2.0);
          float diff = max(dot(N, L), 0.0);
          vec3 Hp = normalize(L + V);
          float pSpec = pow(max(dot(N, Hp), 0.0), 22.0) * 0.25;
          lighting += uPointColors[i] * atten * (diff * 0.42 + pSpec + 0.08);
        }
      }
    }

    vec3 baseLit = vColor * lighting;
    vec3 emissiveGlow = vColor * (1.18 * vEmissive);
    vec3 finalRgb = mix(baseLit, emissiveGlow, clamp(vEmissive * 0.68, 0.0, 1.0)) + emissiveGlow * 0.24;

    // Subtle distance depth fog toward calm studio slate-grey
    float camDist = length(uCameraPos - vWorldPos);
    float fogFactor = clamp((camDist - 22.0) / 28.0, 0.0, 0.45);
    vec3 fogColor = vec3(0.20, 0.22, 0.26);
    finalRgb = mix(finalRgb, fogColor, fogFactor);

    gl_FragColor = vec4(finalRgb, 1.0);
  }
`;

export class WebGL3DMeshRenderer {
  /**
   * @param {Object} romBundle
   * @param {import("../models/GameState.js").GameState} gameState
   * @param {HTMLCanvasElement} screenCanvas2d
   * @param {HTMLCanvasElement} fullMapCanvas
   * @param {HTMLElement} fullMapPanel
   * @param {HTMLCanvasElement} webglCanvas
   * @param {import("./SmoothAnimationTracker.js").SmoothAnimationTracker} animTracker
   */
  constructor(
    romBundle,
    gameState,
    screenCanvas2d,
    fullMapCanvas,
    fullMapPanel,
    webglCanvas,
    animTracker
  ) {
    this.romBundle = romBundle;
    this.state = gameState;
    this.screenCanvas2d = screenCanvas2d;
    this.webglCanvas = webglCanvas;
    this.anim = animTracker;

    // Underlying cycle-accurate 2D Atari renderer (keeps hardware P/M collision registers exact)
    this.atari2d = new AtariDisplayRenderer(
      screenCanvas2d,
      gameState,
      romBundle
    );

    /** @type {"3d_birdseye"|"hybrid_pip"|"classic_2d"} */
    this.renderMode = "3d_birdseye";

    /** @type {WebGLRenderingContext|null} */
    this.gl = null;
    this.program = null;
    this.gpuMeshes = {};
    this.uniforms = {};
    this.attribs = {};

    this.modelMatrix = new Float32Array(16);
    this.viewMatrix = new Float32Array(16);
    this.projMatrix = new Float32Array(16);
    this.viewProjMatrix = new Float32Array(16);
    this.pointLightsFlat = new Float32Array(32);
    this.pointColorsFlat = new Float32Array(24);

    this._initWebGL();
  }

  _initWebGL() {
    if (!this.webglCanvas) return;
    const gl =
      this.webglCanvas.getContext("webgl2", { antialias: true, alpha: false }) ||
      this.webglCanvas.getContext("webgl", { antialias: true, alpha: false });
    if (!gl) return;
    this.gl = gl;

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("WebGL shader link error:", gl.getProgramInfoLog(prog));
      return;
    }
    this.program = prog;
    gl.useProgram(prog);

    this.attribs = {
      aPosition: gl.getAttribLocation(prog, "aPosition"),
      aNormal: gl.getAttribLocation(prog, "aNormal"),
      aColor: gl.getAttribLocation(prog, "aColor"),
      aEmissive: gl.getAttribLocation(prog, "aEmissive"),
    };

    this.uniforms = {
      uViewProj: gl.getUniformLocation(prog, "uViewProj"),
      uModel: gl.getUniformLocation(prog, "uModel"),
      uTint: gl.getUniformLocation(prog, "uTint"),
      uEmissiveBoost: gl.getUniformLocation(prog, "uEmissiveBoost"),
      uCameraPos: gl.getUniformLocation(prog, "uCameraPos"),
      uAmbientColor: gl.getUniformLocation(prog, "uAmbientColor"),
      uSunDir: gl.getUniformLocation(prog, "uSunDir"),
      uSunColor: gl.getUniformLocation(prog, "uSunColor"),
      uPointLights: gl.getUniformLocation(prog, "uPointLights"),
      uPointColors: gl.getUniformLocation(prog, "uPointColors"),
    };

    this.currentMixConfig = { defaultSourceId: 20 };
    this.showcaseCompleteSetMode = false;
    this.rebuildMeshes(this.currentMixConfig);

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
  }

  /**
   * Dynamically rebuilds and uploads all 3D GPU VBO meshes from the selected 3D Mesh Source (`1..20`)
   * or a custom Mix-and-Match configuration across all 16 Zone X gameplay elements.
   * @param {Object} mixConfig
   */
  rebuildMeshes(mixConfig = {}) {
    const gl = this.gl;
    if (!gl) return;
    this.currentMixConfig = { ...this.currentMixConfig, ...mixConfig };
    const rawMeshes = MeshGeometryBuilder.buildAllGameMeshes(this.currentMixConfig);
    for (const [name, mesh] of Object.entries(rawMeshes)) {
      let entry = this.gpuMeshes[name];
      if (!entry) {
        const vbo = gl.createBuffer();
        entry = { vbo, vertexCount: 0 };
        this.gpuMeshes[name] = entry;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, entry.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, mesh.data, gl.STATIC_DRAW);
      entry.vertexCount = mesh.vertexCount;
    }
  }

  _compileShader(gl, type, source) {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error("WebGL shader compile error:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }

  /**
   * Switches between `"3d_birdseye"`, `"hybrid_pip"`, and `"classic_2d"`.
   * @param {"3d_birdseye"|"hybrid_pip"|"classic_2d"} mode
   */
  setRenderMode(mode) {
    this.renderMode = mode;
    this._syncCanvasVisibility();
  }

  _syncCanvasVisibility() {
    if (!this.webglCanvas || !this.screenCanvas2d) return;
    const dlAddr =
      this.state.ram[SystemAddressMap.DLIST_PTR_LO] |
      (this.state.ram[SystemAddressMap.DLIST_PTR_HI] << 8);
    const isInGame = dlAddr === DisplayListAddress[ScreenMode.IN_GAME];

    if (this.showcaseCompleteSetMode) {
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-hidden";
      return;
    }

    if (this.renderMode === "classic_2d") {
      this.webglCanvas.style.display = "none";
      this.screenCanvas2d.className = "viewport-2d-full";
    } else if (!isInGame) {
      // On Title / Features / Hall of Fame: show 3D showcase background + holographic 2D overlay!
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-hologram";
    } else if (this.renderMode === "hybrid_pip") {
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-pip";
    } else {
      // Pure 3D Bird's-Eye Mode during gameplay
      this.webglCanvas.style.display = "block";
      this.screenCanvas2d.className = "viewport-2d-hidden";
    }
  }

  renderFullZoneMapIfPresent() {
    this.atari2d.renderFullZoneMapIfPresent();
  }

  /**
   * Renders the cycle-accurate 2D frame (for P/M collisions & radar) and
   * updates the 3D WebGL scene.
   */
  renderFrame() {
    this.atari2d.renderFrame();
    this.render3DPass();
  }

  /**
   * Keeps the WebGL drawingbuffer resolution synchronized 1:1 with the actual CSS display size
   * (including when entering or exiting Fullscreen mode on 16:9 / ultrawide monitors).
   */
  _syncCanvasResolution() {
    if (!this.webglCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.max(320, Math.round(this.webglCanvas.clientWidth * dpr));
    const targetH = Math.max(200, Math.round(this.webglCanvas.clientHeight * dpr));
    if (this.webglCanvas.width !== targetW || this.webglCanvas.height !== targetH) {
      this.webglCanvas.width = targetW;
      this.webglCanvas.height = targetH;
    }
  }

  /**
   * Renders the 3D WebGL Bird's-Eye pass at full display refresh rate (60Hz/120Hz/144Hz).
   */
  render3DPass() {
    this._syncCanvasVisibility();
    if (!this.gl || !this.program || this.renderMode === "classic_2d") return;
    this._syncCanvasResolution();

    if (this.showcaseCompleteSetMode) {
      this._renderCompleteSetShowcase();
      return;
    }

    const dlAddr =
      this.state.ram[SystemAddressMap.DLIST_PTR_LO] |
      (this.state.ram[SystemAddressMap.DLIST_PTR_HI] << 8);
    const isInGame = dlAddr === DisplayListAddress[ScreenMode.IN_GAME];

    if (isInGame) {
      this._render3DInGameScene();
    } else {
      this._render3DShowcaseBackdrop();
    }
  }

  /**
   * Renders a 4x4 3D Diorama Pedestal Board showing ALL 16 Zone X Gameplay Elements side-by-side
   * so the user can inspect the complete 3D Mesh Set of any of the 20 sources (or their custom mix)!
   */
  _renderCompleteSetShowcase() {
    const gl = this.gl;
    const t = performance.now() * 0.001;
    this.anim.time = t;

    gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
    gl.clearColor(0.18, 0.20, 0.24, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const aspect = this.webglCanvas.width / Math.max(1, this.webglCanvas.height);
    const eyeX = 0;
    const eyeY = 8.4;
    const eyeZ = 7.4;
    this._perspective(this.projMatrix, (38 * Math.PI) / 180, aspect, 0.5, 45.0);
    this._lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [0, 0.1, 0.3], [0, 1, 0]);
    this._multiplyMat4(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, this.viewProjMatrix);
    gl.uniform3f(this.uniforms.uCameraPos, eyeX, eyeY, eyeZ);
    gl.uniform3f(this.uniforms.uAmbientColor, 0.56, 0.58, 0.62);
    gl.uniform3f(this.uniforms.uSunDir, 0.36, 0.84, 0.41);
    gl.uniform3f(this.uniforms.uSunColor, 0.55, 0.56, 0.58);

    this.pointLightsFlat.fill(0);
    this.pointColorsFlat.fill(0);
    // Highlight Plutonium & Active Barrel on Row 1
    this.pointLightsFlat.set([-1.2, 1.2, -2.5, 4.5, 3.6, 1.2, -2.5, 4.5], 0);
    this.pointColorsFlat.set([0.12, 0.95, 0.48, 0.12, 0.95, 0.48], 0);
    gl.uniform4fv(this.uniforms.uPointLights, this.pointLightsFlat);
    gl.uniform3fv(this.uniforms.uPointColors, this.pointColorsFlat);

    // Draw 9x7 Diorama Floor Stage
    for (let gz = -3; gz <= 3; gz++) {
      for (let gx = -5; gx <= 5; gx++) {
        const chk = (gx + gz) & 1 ? 1.02 : 0.98;
        this._drawMesh("floorTile", gx, 0, gz, 0, 1, 1, 1, [chk, chk, chk], 0);
      }
    }

    const xs = [-3.6, -1.2, 1.2, 3.6];
    const zs = [-2.3, -0.7, 0.9, 2.5];
    const bob = Math.sin(t * 3.5) * 0.06;

    // Row 1 (z = -2.3): 1. Wall Block, 2. Floor Tile Pedestal, 3. Plutonium Core, 4. Container (Standby & Active)
    this._drawMesh("wallBlock", xs[0], 0, zs[0], t * 0.4, 1, 1, 1, [1, 1, 1], 0.02);
    this._drawMesh("floorTile", xs[1], 0.22, zs[0], t * 0.4, 0.95, 2.2, 0.95, [1.05, 1.05, 1.05], 0.02);
    this._drawMesh("plutoniumHalo", xs[2], 0, zs[0], t * 1.2, 1.08, 1, 1.08, [1, 1, 1], 0.45);
    this._drawMesh("plutoniumCore", xs[2], bob, zs[0], t * 1.8, 1.18, 1.18, 1.18, [1, 1, 1], 0.45);
    this._drawMesh("plutoniumBeacon", xs[2], bob, zs[0], -t * 2.8, 1.18, 1.18, 1.18, [1, 1, 1], 0.25);
    // Container Standby (left half) + Container Active (right half)
    this._drawMesh("containerVault", xs[3] - 0.52, 0, zs[0], 0, 0.92, 0.92, 0.92, [1, 1, 1], 0.0);
    this._drawMesh("containerVault", xs[3] + 0.52, 0, zs[0], 0, 0.96, 0.96, 0.96, [0.95, 1.08, 0.98], 0.25);
    this._drawMesh("containerActiveGlow", xs[3] + 0.52, 0, zs[0], -t * 3.2, 1.0, 0.96, 1.0, [1, 1, 1], 0.65);
    this._drawMesh("containerArrow", xs[3] + 0.52, bob, zs[0], t * 3.5, 1.05, 1.05, 1.05, [1, 1, 1], 0.65);

    // Row 2 (z = -0.7): 5. Player Robot (with Face), 6. Alien Normal (Grey), 7. Alien Fast (Dark Blue), 8. Laser Door
    this._drawMesh("playerTorso", xs[0], 0.44, zs[1], Math.sin(t * 1.5) * 0.25, 1.05, 1.05, 1.05, [1, 1, 1], 0.02);
    this._drawMesh3DRot("playerHead", xs[0], 0.86, zs[1], -0.32, Math.sin(t * 2.0) * 0.22, 0, 1.12, 1.12, 1.12, [1, 1, 1], 0.06);
    this._drawMesh("playerLimb", xs[0] - 0.14, 0.30, zs[1], 0, 1, 1, 1, [1, 1, 1], 0);
    this._drawMesh("playerLimb", xs[0] + 0.14, 0.30, zs[1], 0, 1, 1, 1, [1, 1, 1], 0);
    this._drawMesh("playerLimb", xs[0] - 0.28, 0.56, zs[1], 0, 0.9, 0.9, 0.9, [1, 1, 1], 0);
    this._drawMesh("playerLimb", xs[0] + 0.28, 0.56, zs[1], 0, 0.9, 0.9, 0.9, [1, 1, 1], 0);

    this._renderCreepyAlien({ x: xs[1], z: zs[1], type: 0, facingAngle: Math.sin(t * 1.4) * 0.35 }, 0, t);
    this._renderCreepyAlien({ x: xs[2], z: zs[1], type: 1, facingAngle: Math.sin(t * 1.4) * 0.35 }, 1, t);

    this._drawMesh("laserPylons", xs[3], 0, zs[1], 0, 1, 1, 1, [1, 1, 1], 0);
    this._drawMesh("laserDangerClosed", xs[3], 0, zs[1], 0, 1, 1, 1, [1, 1, 1], 0.35);
    this._drawMesh("laserBeams", xs[3], 0, zs[1] - 0.18, 0, 1, 1, 0.85, [1, 1, 1], 0.08);
    this._drawMesh("laserBeams", xs[3], 0, zs[1] + 0.18, 0, 1, 1, 0.85, [1, 1, 1], 0.08);

    // Row 3 (z = +0.9): 9. Key, 10. Locked Door, 11. Spade, 12. Crumbly Dirt
    this._drawMesh("keyItem", xs[0], bob, zs[2], t * 1.8, 1.25, 1.25, 1.25, [1, 1, 1], 0.04);
    this._drawMesh("lockedDoor", xs[1], 0, zs[2], Math.sin(t * 0.8) * 0.2, 1, 1, 1, [1, 1, 1], 0.02);
    this._drawMesh("spadeItem", xs[2], bob, zs[2], t * 1.8, 1.25, 1.25, 1.25, [1, 1, 1], 0.04);
    this._drawMesh("crumblyDirt", xs[3], 0, zs[2], t * 0.5, 1.05, 1.05, 1.05, [1, 1, 1], 0);

    // Row 4 (z = +2.5): 13. Insulating Mat, 14. Shield Capsule, 15. Extra-Time & Mystery Box, 16. Exit Portal & Skull
    this._drawMesh("matItem", xs[0], bob * 0.5, zs[3], t * 0.8, 1.12, 1.12, 1.12, [1, 1, 1], 0.02);
    this._drawMesh("capsuleItem", xs[1], bob, zs[3], t * 1.6, 1.20, 1.20, 1.20, [1, 1, 1], 0.04);
    this._drawMesh("extraTimeItem", xs[2] - 0.45, bob, zs[3], t * 1.8, 1.05, 1.05, 1.05, [1, 1, 1], 0.05);
    this._drawMesh("mysteryBox", xs[2] + 0.45, bob * 0.6, zs[3], t * 1.1, 0.92, 0.92, 0.92, [1, 1, 1], 0.02);
    this._drawMesh("exitPortal", xs[3] - 0.45, 0, zs[3], t * 1.4, 0.95, 0.95, 0.95, [1, 1, 1], 0.15);
    this._drawMesh("skullHazard", xs[3] + 0.48, 0, zs[3], Math.sin(t * 2.2) * 0.25, 1.0, 1.0, 1.0, [1, 1, 1], 0.06);
  }

  // ===========================================================================
  // 3D In-Game Bird's-Eye Scene Renderer
  // ===========================================================================

  _render3DInGameScene() {
    const gl = this.gl;
    const ram = this.state.ram;
    const t = this.anim.time;

    gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
    gl.clearColor(0.20, 0.22, 0.26, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Compute Camera Position from SmoothAnimationTracker + 3D Explosion Shake
    const camTargetX = this.anim.camera.x + (this.anim.camera.shakeX || 0);
    const camTargetZ = this.anim.camera.z + (this.anim.camera.shakeZ || 0);
    const pitchRad = (this.anim.camera.pitchDeg * Math.PI) / 180;
    const dist = this.anim.camera.distance;

    const eyeX = camTargetX;
    const eyeY = Math.sin(pitchRad) * dist + (this.anim.camera.shakeY || 0);
    const eyeZ = camTargetZ + Math.cos(pitchRad) * dist;

    const aspect = this.webglCanvas.width / Math.max(1, this.webglCanvas.height);
    this._perspective(this.projMatrix, (this.anim.camera.fovDeg * Math.PI) / 180, aspect, 0.5, 65.0);
    this._lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [camTargetX, 0.15, camTargetZ], [0, 1, 0]);
    this._multiplyMat4(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, this.viewProjMatrix);
    gl.uniform3f(this.uniforms.uCameraPos, eyeX, eyeY, eyeZ);

    // Keep walls crisp Alabaster-White & Light-Grey across all zones
    const wallTint = [1.0, 1.0, 1.0];

    // Balanced architectural studio lighting (sculptural top/front/side shading without blowing out white)
    const hurtFlash = this.anim.player.hurtFlash;
    gl.uniform3f(
      this.uniforms.uAmbientColor,
      0.54 + hurtFlash * 0.35,
      0.56 - hurtFlash * 0.12,
      0.59 - hurtFlash * 0.12
    );
    gl.uniform3f(this.uniforms.uSunDir, 0.38, 0.82, 0.42);
    gl.uniform3f(this.uniforms.uSunColor, 0.54, 0.55, 0.57);

    // Gather up to 8 dynamic point lights (Player + closest Plutonium/Active Barrels/Lasers/Portals/Droids)
    this._populateDynamicPointLights(ram, t);
    gl.uniform4fv(this.uniforms.uPointLights, this.pointLightsFlat);
    gl.uniform3fv(this.uniforms.uPointColors, this.pointColorsFlat);

    // Visible tile frustum bounds around camera target (scales with zoom & widescreen aspect ratio)
    const halfSpanZ = Math.max(11, Math.ceil(dist * 0.82));
    const halfSpanX = Math.max(15, Math.ceil(halfSpanZ * aspect + 3));
    const minTx = Math.max(-1, Math.floor(camTargetX - halfSpanX));
    const maxTx = Math.min(GridConfig.WIDTH, Math.ceil(camTargetX + halfSpanX));
    const minTz = Math.max(-1, Math.floor(camTargetZ - halfSpanZ));
    const maxTz = Math.min(GridConfig.HEIGHT, Math.ceil(camTargetZ + halfSpanZ));

    // 1. Render 3D Floor Grid & Playfield Tiles
    for (let tz = minTz; tz <= maxTz; tz++) {
      for (let tx = minTx; tx <= maxTx; tx++) {
        // Outer border walls around the 62x32 arena
        if (tx < 0 || tx >= GridConfig.WIDTH || tz < 0 || tz >= GridConfig.HEIGHT) {
          this._drawMesh("wallBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0.02);
          continue;
        }

        // Subtle light-grey floor checkerboard
        const checker = (tx + tz) & 1 ? 1.02 : 0.98;
        this._drawMesh("floorTile", tx, 0, tz, 0, 1, 1, 1, [checker, checker, checker], 0);

        const idx = tz * GridConfig.WIDTH + tx;
        const rawTile = ram[0x0b00 + idx] & 0x1f;
        if (
          rawTile === TileType.FLOOR ||
          rawTile === TileType.PLAYER_START ||
          rawTile === TileType.ALIEN_DROID_NORMAL ||
          rawTile === TileType.ALIEN_DROID_FAST
        ) {
          continue;
        }

        const isVis = this.anim.isTileVisuallyPresent(ram, tx, tz);
        const isExploded = this.anim.isTileExploded(tx, tz);
        if (isExploded) continue;

        switch (rawTile) {
          case TileType.WALL:
            this._drawMesh("wallBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0);
            break;

          case TileType.PLUTONIUM:
            if (isVis) {
              const bob = Math.sin(t * 4.2 + tx * 0.7 + tz * 0.5) * 0.08;
              const pulse = 0.35 + 0.25 * Math.sin(t * 7.5 + tx);
              const haloScale = 1.06 + 0.08 * Math.sin(t * 6.0 + tx);
              this._drawMesh("plutoniumHalo", tx, 0, tz, t * 1.2, haloScale, 1.0, haloScale, [1, 1, 1], 0.45);
              this._drawMesh("plutoniumCore", tx, bob, tz, t * 1.8 + tx, 1.15, 1.15, 1.15, [1, 1, 1], pulse);
              this._drawMesh("plutoniumBeacon", tx, bob, tz, -t * 3.0 + tz, 1.15, 1.15, 1.15, [1, 1, 1], 0.25);
            }
            break;

          case TileType.CONTAINER: {
            const carryingPlutonium = this.anim.player.plutoniumGlow > 0.05;
            if (carryingPlutonium) {
              // ACTIVE COUNTDOWN MODE: Plutonium is picked up & timer is running!
              // Barrel illuminates with Mint-Emerald rings & floating target arrow!
              const activePulse = 0.20 + 0.20 * Math.sin(t * 10.5 + tx);
              const ringScale = 1.06 + 0.10 * Math.sin(t * 9.0 + tx);
              this._drawMesh(
                "containerVault",
                tx,
                0,
                tz,
                0,
                1.08,
                1.08,
                1.08,
                [0.95, 1.08, 0.98],
                activePulse
              );
              this._drawMesh(
                "containerActiveGlow",
                tx,
                0,
                tz,
                -t * 3.5,
                ringScale,
                1.08,
                ringScale,
                [1, 1, 1],
                0.65
              );
              const arrowBob = Math.sin(t * 9.5 + tx) * 0.14;
              const arrowScale = 1.18 + 0.10 * Math.sin(t * 9.5 + tx);
              this._drawMesh(
                "containerArrow",
                tx,
                arrowBob,
                tz,
                t * 3.8,
                arrowScale,
                arrowScale,
                arrowScale,
                [1, 1, 1],
                0.65
              );
            } else {
              // STANDBY MODE: Clean, calm white/light-grey barrel
              this._drawMesh(
                "containerVault",
                tx,
                0,
                tz,
                0,
                1.04,
                1.04,
                1.04,
                [1, 1, 1],
                0.0
              );
            }
            break;
          }

          case TileType.KEY:
            if (isVis) {
              const bob = Math.sin(t * 3.8 + tx) * 0.07;
              this._drawMesh("keyItem", tx, bob, tz, t * 2.1, 1.12, 1.12, 1.12, [1, 1, 1], 0.04);
            }
            break;

          case TileType.RADIATION_CAPSULE:
            if (isVis) {
              const bob = Math.sin(t * 3.5 + tz) * 0.07;
              this._drawMesh("capsuleItem", tx, bob, tz, t * 1.9, 1.12, 1.12, 1.12, [1, 1, 1], 0.04);
            }
            break;

          case TileType.SPADE:
            if (isVis) {
              const bob = Math.sin(t * 3.5 + tz) * 0.07;
              this._drawMesh("spadeItem", tx, bob, tz, t * 1.9, 1.12, 1.12, 1.12, [1, 1, 1], 0.04);
            }
            break;

          case TileType.INSULATING_MAT:
            if (isVis) {
              const bob = Math.sin(t * 3.0 + tx) * 0.04;
              this._drawMesh("matItem", tx, bob, tz, t * 1.2, 1.06, 1.06, 1.06, [1, 1, 1], 0.02);
            }
            break;

          case TileType.EXTRA_TIME:
            if (isVis) {
              const bob = Math.sin(t * 4.0 + tx) * 0.07;
              this._drawMesh("extraTimeItem", tx, bob, tz, t * 2.2, 1.10, 1.10, 1.10, [1, 1, 1], 0.05);
            }
            break;

          case TileType.MYSTERY_BOX:
            if (isVis) {
              const bob = Math.sin(t * 3.2 + tx) * 0.05;
              this._drawMesh("mysteryBox", tx, bob, tz, t * 1.1, 1.06, 1.06, 1.06, [1, 1, 1], 0.02);
            }
            break;

          case TileType.LOCKED_DOOR:
          case TileType.DOOR_MARKER_A:
            if (isVis) {
              this._drawMesh("lockedDoor", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.02);
            }
            break;

          case TileType.LASER_DOOR_1A:
          case TileType.LASER_DOOR_1B:
          case TileType.LASER_DOOR_2A:
          case TileType.LASER_DOOR_2B: {
            // 1. Clean White North & South floor threshold rails
            this._drawMesh("laserPylons", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.0);

            // Check exact hardware state (0 = SAFE/OPEN, 1..6 = DEADLY/CLOSING-OR-CLOSED)
            let rawClosure = 0;
            if (rawTile === TileType.LASER_DOOR_1A) rawClosure = ram[0x0587] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_1B) rawClosure = ram[0x0588] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_2A) rawClosure = ram[0x0589] & 0x07;
            else if (rawTile === TileType.LASER_DOOR_2B) rawClosure = ram[0x058a] & 0x07;

            if (rawClosure === 0) {
              // 100% OPEN & SAFE: Calm unobstructed corridor with white guide lines
              this._drawMesh("laserSafeOpen", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.15);
            } else {
              // CLOSING OR CLOSED & DEADLY: Coral-Red warning strip + sliding White/Coral-Red barrier blocks
              this._drawMesh("laserDangerClosed", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.35);
              const closure = Math.max(0.22, this.anim.laserIntensity[idx]);
              const northZ = tz - 0.36 + closure * 0.18;
              const southZ = tz + 0.36 - closure * 0.18;
              this._drawMesh("laserBeams", tx, 0, northZ, 0, 1.0, 1.0, closure, [1, 1, 1], 0.08);
              this._drawMesh("laserBeams", tx, 0, southZ, 0, 1.0, 1.0, closure, [1, 1, 1], 0.08);
            }
            break;
          }

          case TileType.WARP_PAD:
            this._drawMesh("warpPad", tx, 0, tz, t * 2.8, 1, 1, 1, [1, 1, 1], 0.06);
            break;

          case TileType.WARP_FRAME_LEFT:
          case TileType.WARP_FRAME_RIGHT:
            this._drawMesh("warpFrame", tx, 0, tz, 0, 1, 1, 1, [1, 1, 1], 0.02);
            break;

          case 18: // Original Atari Crumbly Block (0x12) dug with Spade
          case TileType.CRUMBLY_DIRT:
            if (isVis) {
              this._drawMesh("crumblyDirt", tx, 0, tz, (tx * 1.7 + tz * 2.3) % 6.28, 1, 1, 1, [1, 1, 1], 0.0);
            }
            break;

          case TileType.FORCEFIELD:
            if (isVis) {
              this._drawMesh("hazardField", tx, 0, tz, t * 3.2, 1, 1, 1, [1, 1, 1], 0.08);
            }
            break;

          case TileType.SKULL_HAZARD:
            if (isVis) {
              this._drawMesh("skullHazard", tx, 0, tz, Math.sin(t * 2.5 + tx) * 0.2, 1, 1, 1, [1, 1, 1], 0.06);
            }
            break;

          case TileType.EXIT_PORTAL: {
            const plutLeft = ram[SystemAddressMap.PLUTONIUM_REMAINING];
            const exitBoost = plutLeft === 0 ? 0.35 + 0.25 * Math.sin(t * 8.0) : 0.04;
            this._drawMesh("exitPortal", tx, 0, tz, t * 1.8, 1.10, 1.10, 1.10, [1, 1, 1], exitBoost);
            break;
          }

          default:
            if (isVis) {
              this._drawMesh("rockBlock", tx, 0, tz, 0, 1, 1, 1, wallTint, 0);
            }
            break;
        }
      }
    }

    // 2. Render Articulated 3D Astronaut Player (hidden while disintegrated in 3D explosion!)
    if (!this.anim.player.isExploding) {
      this._renderArticulatedPlayer(t);
    }

    // 3. Render Creepy Articulated 3D Alien Hunters (hidden if currently blasted apart!)
    for (let i = 0; i < this.anim.droids.length; i++) {
      const d = this.anim.droids[i];
      if (!d.active || d.explodedTimer > 0) continue;
      if (d.x < minTx - 1 || d.x > maxTx + 1 || d.z < minTz - 1 || d.z > maxTz + 1) continue;
      this._renderCreepyAlien(d, i, t);
    }

    // 4. Render 3D Tumbling Explosion Debris Chunks (Astronaut Helmet/Torso/Limbs, Alien Legs/Claws/Thorax, Door Gates, Shrapnel)
    for (let i = 0; i < this.anim.debrisChunks.length; i++) {
      const dc = this.anim.debrisChunks[i];
      const lifeRatio = 1.0 - dc.life / dc.maxLife;
      const s = dc.scale * Math.min(1.0, lifeRatio * 1.45);
      this._drawMesh3DRot(
        dc.meshName,
        dc.x,
        dc.y,
        dc.z,
        dc.rx,
        dc.ry,
        dc.rz,
        s,
        s,
        s,
        dc.color,
        0.55 * lifeRatio
      );
    }

    // 5. Render Volumetric 3D Plasma Fireballs
    for (let i = 0; i < this.anim.fireballs.length; i++) {
      const fb = this.anim.fireballs[i];
      const lifeRatio = 1.0 - fb.life / fb.maxLife;
      const s = fb.scale;
      this._drawMesh3DRot(
        "explosionFireball",
        fb.x,
        fb.y,
        fb.z,
        fb.rx,
        fb.ry,
        fb.rz,
        s,
        s * 0.85,
        s,
        fb.color,
        0.95 * lifeRatio
      );
    }

    // 6. Render 3D Particle Shards & Expanding Shockwave Torus Rings
    for (let i = 0; i < this.anim.particles.length; i++) {
      const p = this.anim.particles[i];
      const lifeRatio = 1.0 - p.life / p.maxLife;
      const s = p.scale * lifeRatio;
      this._drawMesh("particleShard", p.x, p.y, p.z, p.rot, s, s, s, p.color, 0.85);
    }

    for (let i = 0; i < this.anim.shockwaves.length; i++) {
      const sw = this.anim.shockwaves[i];
      const lifeRatio = 1.0 - sw.life / sw.maxLife;
      this._drawMesh(
        "shockwaveRing",
        sw.x,
        sw.y,
        sw.z,
        t * 2.0,
        sw.radius,
        lifeRatio * 0.9,
        sw.radius,
        sw.color,
        0.95
      );
    }
  }

  /**
   * Renders the articulated 3D Astronaut mesh (Torso, Helmet, Left/Right Arms & Legs).
   */
  _renderArticulatedPlayer(t) {
    const p = this.anim.player;
    const px = p.x;
    const pz = p.z;
    const baseY = p.bobY;
    const yaw = p.facingAngle;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);

    const suitTint =
      p.hurtFlash > 0.05
        ? [1.0, 0.35, 0.35]
        : p.teleportFlash > 0.05
          ? [0.45, 0.98, 1.0]
          : [1.0, 1.0, 1.0];
    const boost = Math.max(p.hurtFlash * 0.6, p.teleportFlash * 0.7, p.plutoniumGlow * 0.35);

    // 1. Grey Robot Torso & Backpack
    this._drawMesh("playerTorso", px, baseY + 0.44, pz, yaw, 1, 1, 1, suitTint, boost);

    // 2. Grey Robot Head with 3D Robot Face:
    // Tilted slightly upward (rx = -0.35) toward the bird's-eye camera and swiveled (headYaw)
    // so the robot's eyes, nose bridge, and vocoder mouth are always clearly visible!
    const headYaw = Math.sin(yaw) * 0.45 + Math.sin(t * 2.5) * 0.08;
    const headPitch = -0.35 + Math.cos(t * 3.0) * 0.03;
    this._drawMesh3DRot(
      "playerHead",
      px,
      baseY + 0.84,
      pz,
      headPitch,
      headYaw,
      0,
      1.05,
      1.05,
      1.05,
      suitTint,
      boost + 0.06
    );

    // 3. Articulated Arms & Legs with smooth walk-cycle swing
    const swing = Math.sin(p.walkCycle) * 0.48 * p.strideAmplitude;
    const strideZ = Math.sin(p.walkCycle) * 0.14 * p.strideAmplitude;
    const liftL = Math.max(0, Math.cos(p.walkCycle)) * 0.08 * p.strideAmplitude;
    const liftR = Math.max(0, -Math.cos(p.walkCycle)) * 0.08 * p.strideAmplitude;

    // Left & Right Legs
    const legOffsetX = 0.13;
    const lLegX = px - cosY * legOffsetX + sinY * strideZ;
    const lLegZ = pz + sinY * legOffsetX + cosY * strideZ;
    const rLegX = px + cosY * legOffsetX - sinY * strideZ;
    const rLegZ = pz - sinY * legOffsetX - cosY * strideZ;

    this._drawMesh("playerLimb", lLegX, baseY + 0.3 + liftL, lLegZ, yaw + swing * 0.3, 1, 1, 1, suitTint, boost);
    this._drawMesh("playerLimb", rLegX, baseY + 0.3 + liftR, rLegZ, yaw - swing * 0.3, 1, 1, 1, suitTint, boost);

    // Left & Right Arms (counter-swinging for natural human gait)
    const armOffsetX = 0.28;
    const armStride = -strideZ * 1.15;
    const lArmX = px - cosY * armOffsetX + sinY * armStride;
    const lArmZ = pz + sinY * armOffsetX + cosY * armStride;
    const rArmX = px + cosY * armOffsetX - sinY * armStride;
    const rArmZ = pz - sinY * armOffsetX - cosY * armStride;

    this._drawMesh("playerLimb", lArmX, baseY + 0.56, lArmZ, yaw - swing * 0.4, 0.88, 0.9, 0.88, suitTint, boost);
    this._drawMesh("playerLimb", rArmX, baseY + 0.56, rArmZ, yaw + swing * 0.4, 0.88, 0.9, 0.88, suitTint, boost);
  }

  /**
   * Renders a creepy, articulated 3D Alien Hunter:
   * - Type 0: Xenomorph-Arachnid Stalker (obsidian-crimson carapace, pulsing bio-sac abdomen,
   *   6 venom-green eyes, 6 scuttling spider legs in alternating tripod gait, and 2 snapping mandibles).
   * - Type 1: Eldritch Shadow-Reaper (hunched biomechanical horror with exposed toxic-green ribcage,
   *   horned Xenomorph cranium, 6 fast-scuttling spider legs, 2 slashing mantis scythe-claws, and whipping scorpion stinger tail).
   */
  _renderCreepyAlien(d, index, t) {
    const ax = d.x;
    const az = d.z;
    const isFast = d.type !== 0;

    // Predatory player-stalking: subtly orient toward the player when within hunting range
    let yaw = d.facingAngle;
    const p = this.anim.player;
    if (p) {
      const toPlayerX = p.x - ax;
      const toPlayerZ = p.z - az;
      const distToPlayer = Math.hypot(toPlayerX, toPlayerZ);
      if (distToPlayer > 0.1 && distToPlayer < 10.0) {
        const angleToPlayer = Math.atan2(toPlayerX, toPlayerZ);
        let diff = angleToPlayer - yaw;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        const stalkBlend = (1.0 - distToPlayer / 10.0) * 0.45;
        yaw += diff * stalkBlend;
      }
    }

    const fwdX = Math.sin(yaw);
    const fwdZ = Math.cos(yaw);
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);

    const gaitFreq = isFast ? 24.0 : 17.0;
    const gaitPhaseBase = t * gaitFreq + index * 1.9;
    const scuttleBob = Math.abs(Math.sin(gaitPhaseBase)) * 0.04;
    const baseY = 0.15 + scuttleBob;
    const breathe = 1.0 + 0.05 * Math.sin(t * 9.0 + index);
    const pulseBoost = 0.12 + 0.12 * Math.sin(t * (isFast ? 14.0 : 8.5) + index);

    // 1. Render Compact Central Alien Thorax / Abdomen / Skull (Normal = Grau-in-Grau, Fast = Dunkelblau)
    if (!isFast) {
      this._drawMesh(
        "droidCore",
        ax,
        baseY,
        az,
        yaw,
        0.86 * breathe,
        0.86,
        0.86 / breathe,
        [1, 1, 1],
        pulseBoost
      );

      // 2. Snapping Mandible Pincers (Left & Right, Grau-in-Grau)
      const jawOpen = 0.10 + 0.28 * Math.abs(Math.sin(t * 10.5 + index * 1.3));
      const lJawX = ax - rightX * 0.075 + fwdX * 0.04;
      const lJawZ = az - rightZ * 0.075 + fwdZ * 0.04;
      const rJawX = ax + rightX * 0.075 + fwdX * 0.04;
      const rJawZ = az + rightZ * 0.075 + fwdZ * 0.04;
      this._drawMesh("alienMandible", lJawX, baseY, lJawZ, yaw - jawOpen, 0.88, 0.88, 0.88, [1, 1, 1], 0.18);
      this._drawMesh("alienMandible", rJawX, baseY, rJawZ, yaw + jawOpen, 0.88, 0.88, 0.88, [1, 1, 1], 0.18);
    } else {
      // Fast Alien Torso & Skull (Dunkelblau)
      this._drawMesh(
        "fastDroidBody",
        ax,
        baseY + 0.02,
        az,
        yaw,
        0.88 * breathe,
        0.88,
        0.88,
        [1, 1, 1],
        pulseBoost + 0.06
      );

      // 2. Slashing Scythe Claws (Left & Right, Dunkelblau)
      const slash = Math.sin(t * 15.0 + index) * 0.44;
      const lClawX = ax - rightX * 0.14 + fwdX * 0.03;
      const lClawZ = az - rightZ * 0.14 + fwdZ * 0.03;
      const rClawX = ax + rightX * 0.14 + fwdX * 0.03;
      const rClawZ = az + rightZ * 0.14 + fwdZ * 0.03;
      this._drawMesh("alienScytheClaw", lClawX, baseY + 0.02, lClawZ, yaw + 0.16 + slash, 0.88, 0.88, 0.88, [1, 1, 1], 0.25);
      this._drawMesh("alienScytheClaw", rClawX, baseY + 0.02, rClawZ, yaw - 0.16 - slash, 0.88, 0.88, 0.88, [1, 1, 1], 0.25);

      // 3. Whipping Scorpion Stinger Tail (Dunkelblau)
      const tailWhip = Math.sin(t * 12.5 + index * 0.7) * 0.38;
      this._drawMesh("alienTailStinger", ax, baseY + 0.03, az, yaw + tailWhip, 0.88, 0.88, 0.88, [1, 1, 1], 0.25);
    }

    // 4. 6 Compact Articulated Spider Legs in Alternating Tripod Gait (Normal = Grau-in-Grau, Fast = Dunkelblau)
    const zOffsets = [0.11, 0.0, -0.11];
    const spreadAngles = [-0.46, 0.0, 0.46];
    const legTint = isFast ? [0.24, 0.44, 0.86] : [0.92, 0.94, 0.97];

    for (let pair = 0; pair < 3; pair++) {
      const zOff = zOffsets[pair];
      const spread = spreadAngles[pair];

      // Tripod group A vs B (alternating phase by PI)
      const rPhase = gaitPhaseBase + (pair % 2 === 0 ? 0 : Math.PI);
      const lPhase = gaitPhaseBase + (pair % 2 === 0 ? Math.PI : 0);

      const rSwing = Math.sin(rPhase) * 0.34;
      const lSwing = Math.sin(lPhase) * 0.34;
      const rLift = Math.max(0, Math.cos(rPhase)) * 0.06;
      const lLift = Math.max(0, Math.cos(lPhase)) * 0.06;

      const rLegX = ax + rightX * 0.055 + fwdX * zOff;
      const rLegZ = az + rightZ * 0.055 + fwdZ * zOff;
      const lLegX = ax - rightX * 0.055 + fwdX * zOff;
      const lLegZ = az - rightZ * 0.055 + fwdZ * zOff;

      this._drawMesh(
        "alienSpiderLeg",
        rLegX,
        baseY + rLift,
        rLegZ,
        yaw + spread + rSwing,
        0.86,
        0.86,
        0.86,
        legTint,
        0.10
      );
      this._drawMesh(
        "alienSpiderLeg",
        lLegX,
        baseY + lLift,
        lLegZ,
        yaw + Math.PI - spread - lSwing,
        0.86,
        0.86,
        0.86,
        legTint,
        0.10
      );
    }
  }

  /**
   * Populates the 8 dynamic WebGL point lights around the player and nearby active emitters.
   */
  _populateDynamicPointLights(ram, t) {
    this.pointLightsFlat.fill(0);
    this.pointColorsFlat.fill(0);

    const p = this.anim.player;
    const carryingPlutonium = p.plutoniumGlow > 0.05;
    // Light 0: Player suit & plutonium backpack light (or blazing Explosion Flash Light!)
    if (p.isExploding) {
      this.pointLightsFlat[0] = (p.explosionX + p.colliderX) * 0.5;
      this.pointLightsFlat[1] = 1.65;
      this.pointLightsFlat[2] = (p.explosionZ + p.colliderZ) * 0.5;
      this.pointLightsFlat[3] = 11.5;
      this.pointColorsFlat[0] = 1.0;
      this.pointColorsFlat[1] = 0.65;
      this.pointColorsFlat[2] = 0.22;
    } else {
      this.pointLightsFlat[0] = p.x;
      this.pointLightsFlat[1] = 1.25;
      this.pointLightsFlat[2] = p.z;
      this.pointLightsFlat[3] = carryingPlutonium ? 7.2 : 6.0;

      if (carryingPlutonium) {
        this.pointColorsFlat[0] = 0.12;
        this.pointColorsFlat[1] = 1.0;
        this.pointColorsFlat[2] = 0.32;
      } else {
        this.pointColorsFlat[0] = 0.70;
        this.pointColorsFlat[1] = 0.74;
        this.pointColorsFlat[2] = 0.80;
      }
    }

    let lightSlot = 1;
    // Add nearest active droids as subtle cool grey (Normal) or deep blue (Fast) point lights
    for (let i = 0; i < this.anim.droids.length && lightSlot < 3; i++) {
      const d = this.anim.droids[i];
      if (!d.active) continue;
      if (Math.hypot(d.x - p.x, d.z - p.z) < 12.0) {
        const b4 = lightSlot * 4;
        const b3 = lightSlot * 3;
        this.pointLightsFlat[b4] = d.x;
        this.pointLightsFlat[b4 + 1] = 0.7;
        this.pointLightsFlat[b4 + 2] = d.z;
        this.pointLightsFlat[b4 + 3] = 2.8;
        if (d.type === 0) {
          this.pointColorsFlat[b3] = 0.55;
          this.pointColorsFlat[b3 + 1] = 0.58;
          this.pointColorsFlat[b3 + 2] = 0.64;
        } else {
          this.pointColorsFlat[b3] = 0.18;
          this.pointColorsFlat[b3 + 1] = 0.38;
          this.pointColorsFlat[b3 + 2] = 0.85;
        }
        lightSlot++;
      }
    }

    // Add nearby glowing Plutonium Cores, Active Container Barrels (when timer runs!), or Portals
    const minTx = Math.max(0, Math.floor(p.x - 11));
    const maxTx = Math.min(GridConfig.WIDTH - 1, Math.ceil(p.x + 11));
    const minTz = Math.max(0, Math.floor(p.z - 8));
    const maxTz = Math.min(GridConfig.HEIGHT - 1, Math.ceil(p.z + 8));

    for (let tz = minTz; tz <= maxTz && lightSlot < 8; tz++) {
      for (let tx = minTx; tx <= maxTx && lightSlot < 8; tx++) {
        const idx = tz * GridConfig.WIDTH + tx;
        const tile = ram[0x0b00 + idx] & 0x1f;
        if (carryingPlutonium && tile === TileType.CONTAINER) {
          // When carrying Plutonium & timer is running, Container Barrels emit a strong pulsing emerald beacon light!
          const b4 = lightSlot * 4;
          const b3 = lightSlot * 3;
          this.pointLightsFlat[b4] = tx;
          this.pointLightsFlat[b4 + 1] = 1.05;
          this.pointLightsFlat[b4 + 2] = tz;
          this.pointLightsFlat[b4 + 3] = 6.2 + 0.8 * Math.sin(t * 9.0 + tx);
          this.pointColorsFlat[b3] = 0.14;
          this.pointColorsFlat[b3 + 1] = 1.0;
          this.pointColorsFlat[b3 + 2] = 0.34;
          lightSlot++;
        } else if (tile === TileType.PLUTONIUM && this.anim.isTileVisuallyPresent(ram, tx, tz)) {
          const b4 = lightSlot * 4;
          const b3 = lightSlot * 3;
          this.pointLightsFlat[b4] = tx;
          this.pointLightsFlat[b4 + 1] = 0.95;
          this.pointLightsFlat[b4 + 2] = tz;
          this.pointLightsFlat[b4 + 3] = 5.6 + 0.6 * Math.sin(t * 6.5);
          this.pointColorsFlat[b3] = 0.12;
          this.pointColorsFlat[b3 + 1] = 1.0;
          this.pointColorsFlat[b3 + 2] = 0.32;
          lightSlot++;
        } else if (tile === TileType.WARP_PAD || tile === TileType.EXIT_PORTAL) {
          const b4 = lightSlot * 4;
          const b3 = lightSlot * 3;
          this.pointLightsFlat[b4] = tx;
          this.pointLightsFlat[b4 + 1] = 1.0;
          this.pointLightsFlat[b4 + 2] = tz;
          this.pointLightsFlat[b4 + 3] = 4.6;
          this.pointColorsFlat[b3] = 0.2;
          this.pointColorsFlat[b3 + 1] = 0.88;
          this.pointColorsFlat[b3 + 2] = 1.0;
          lightSlot++;
        }
      }
    }
  }

  // ===========================================================================
  // 3D Orbital Showcase Backdrop for Title / Features / Hall of Fame
  // ===========================================================================

  _render3DShowcaseBackdrop() {
    const gl = this.gl;
    const t = performance.now() * 0.001;
    this.anim.time = t;

    gl.viewport(0, 0, this.webglCanvas.width, this.webglCanvas.height);
    gl.clearColor(0.02, 0.04, 0.09, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const camRadius = 9.5;
    const eyeX = Math.sin(t * 0.32) * camRadius;
    const eyeY = 6.2 + Math.sin(t * 0.5) * 0.8;
    const eyeZ = Math.cos(t * 0.32) * camRadius;

    const aspect = this.webglCanvas.width / Math.max(1, this.webglCanvas.height);
    this._perspective(this.projMatrix, (42 * Math.PI) / 180, aspect, 0.5, 50.0);
    this._lookAt(this.viewMatrix, [eyeX, eyeY, eyeZ], [0, 0.4, 0], [0, 1, 0]);
    this._multiplyMat4(this.viewProjMatrix, this.projMatrix, this.viewMatrix);

    gl.uniformMatrix4fv(this.uniforms.uViewProj, false, this.viewProjMatrix);
    gl.uniform3f(this.uniforms.uCameraPos, eyeX, eyeY, eyeZ);
    gl.uniform3f(this.uniforms.uAmbientColor, 0.3, 0.38, 0.52);
    gl.uniform3f(this.uniforms.uSunDir, 0.4, 0.85, 0.35);
    gl.uniform3f(this.uniforms.uSunColor, 0.9, 0.95, 1.0);

    this.pointLightsFlat.fill(0);
    this.pointColorsFlat.fill(0);
    this.pointLightsFlat.set([0, 1.5, 0, 8.0, 3.0, 1.2, 3.0, 6.0], 0);
    this.pointColorsFlat.set([0.2, 1.0, 0.7, 0.9, 0.3, 1.0], 0);
    gl.uniform4fv(this.uniforms.uPointLights, this.pointLightsFlat);
    gl.uniform3fv(this.uniforms.uPointColors, this.pointColorsFlat);

    // Draw circular reactor platform in 3D
    for (let z = -5; z <= 5; z++) {
      for (let x = -5; x <= 5; x++) {
        const d = Math.hypot(x, z);
        if (d > 5.4) continue;
        this._drawMesh("floorTile", x, 0, z, 0, 1, 1, 1, [1, 1, 1], 0);
        if (d > 4.4) {
          this._drawMesh("wallBlock", x, 0, z, 0, 1, 1, 1, [0.7, 0.85, 1.0], 0.1);
        }
      }
    }

    // Centerpiece: Giant Rotating Plutonium Core + Radioactive Beacon + Prowling 3D Aliens
    this._drawMesh("warpPad", 0, 0, 0, t * 1.8, 1.8, 1.5, 1.8, [1, 1, 1], 0.35);
    this._drawMesh("plutoniumCore", 0, 0.25 + Math.sin(t * 3.0) * 0.1, 0, t * 2.2, 1.5, 1.5, 1.5, [1, 1, 1], 0.45);
    this._drawMesh("plutoniumBeacon", 0, 0.25 + Math.sin(t * 3.0) * 0.1, 0, -t * 3.2, 1.5, 1.5, 1.5, [1, 1, 1], 0.65);

    for (let i = 0; i < 4; i++) {
      const a = t * 1.1 + (i * Math.PI) / 2;
      const rx = Math.cos(a) * 3.1;
      const rz = Math.sin(a) * 3.1;
      this._renderCreepyAlien(
        { x: rx, z: rz, type: i % 2, facingAngle: a + Math.PI * 0.5 },
        i,
        t
      );
    }
  }

  // ===========================================================================
  // Low-Level WebGL Draw & Matrix Helpers
  // ===========================================================================

  _drawMesh(meshName, tx, ty, tz, rotY, sx, sy, sz, tint, emissiveBoost) {
    const mesh = this.gpuMeshes[meshName];
    if (!mesh) return;
    const gl = this.gl;

    const c = Math.cos(rotY);
    const s = Math.sin(rotY);
    const m = this.modelMatrix;
    m[0] = c * sx;  m[1] = 0;  m[2] = -s * sx; m[3] = 0;
    m[4] = 0;       m[5] = sy; m[6] = 0;       m[7] = 0;
    m[8] = s * sz;  m[9] = 0;  m[10] = c * sz; m[11] = 0;
    m[12] = tx;     m[13] = ty; m[14] = tz;    m[15] = 1;

    gl.uniformMatrix4fv(this.uniforms.uModel, false, m);
    gl.uniform3f(this.uniforms.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(this.uniforms.uEmissiveBoost, emissiveBoost);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    const stride = 10 * 4;
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.aNormal);
    gl.vertexAttribPointer(this.attribs.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride, 6 * 4);

    gl.enableVertexAttribArray(this.attribs.aEmissive);
    gl.vertexAttribPointer(this.attribs.aEmissive, 1, gl.FLOAT, false, stride, 9 * 4);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  /**
   * Draws a 3D mesh with full 3-axis Euler rotation (rx, ry, rz) for tumbling 3D explosion debris & fireballs.
   */
  _drawMesh3DRot(meshName, tx, ty, tz, rx, ry, rz, sx, sy, sz, tint, emissiveBoost) {
    const mesh = this.gpuMeshes[meshName];
    if (!mesh) return;
    const gl = this.gl;

    const cx = Math.cos(rx), sxr = Math.sin(rx);
    const cy = Math.cos(ry), syr = Math.sin(ry);
    const cz = Math.cos(rz), szr = Math.sin(rz);

    const m = this.modelMatrix;
    m[0] = cy * cz * sx;
    m[1] = (cx * szr + sxr * syr * cz) * sx;
    m[2] = (sxr * szr - cx * syr * cz) * sx;
    m[3] = 0;

    m[4] = -cy * szr * sy;
    m[5] = (cx * cz - sxr * syr * szr) * sy;
    m[6] = (sxr * cz + cx * syr * szr) * sy;
    m[7] = 0;

    m[8] = syr * sz;
    m[9] = -sxr * cy * sz;
    m[10] = cx * cy * sz;
    m[11] = 0;

    m[12] = tx;
    m[13] = ty;
    m[14] = tz;
    m[15] = 1;

    gl.uniformMatrix4fv(this.uniforms.uModel, false, m);
    gl.uniform3f(this.uniforms.uTint, tint[0], tint[1], tint[2]);
    gl.uniform1f(this.uniforms.uEmissiveBoost, emissiveBoost);

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.vbo);
    const stride = 10 * 4;
    gl.enableVertexAttribArray(this.attribs.aPosition);
    gl.vertexAttribPointer(this.attribs.aPosition, 3, gl.FLOAT, false, stride, 0);

    gl.enableVertexAttribArray(this.attribs.aNormal);
    gl.vertexAttribPointer(this.attribs.aNormal, 3, gl.FLOAT, false, stride, 3 * 4);

    gl.enableVertexAttribArray(this.attribs.aColor);
    gl.vertexAttribPointer(this.attribs.aColor, 3, gl.FLOAT, false, stride, 6 * 4);

    gl.enableVertexAttribArray(this.attribs.aEmissive);
    gl.vertexAttribPointer(this.attribs.aEmissive, 1, gl.FLOAT, false, stride, 9 * 4);

    gl.drawArrays(gl.TRIANGLES, 0, mesh.vertexCount);
  }

  _perspective(out, fovy, aspect, near, far) {
    const f = 1.0 / Math.tan(fovy * 0.5);
    const nf = 1.0 / (near - far);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
  }

  _lookAt(out, eye, center, up) {
    let zx = eye[0] - center[0];
    let zy = eye[1] - center[1];
    let zz = eye[2] - center[2];
    let len = Math.hypot(zx, zy, zz) || 1;
    zx /= len; zy /= len; zz /= len;

    let xx = up[1] * zz - up[2] * zy;
    let xy = up[2] * zx - up[0] * zz;
    let xz = up[0] * zy - up[1] * zx;
    len = Math.hypot(xx, xy, xz) || 1;
    xx /= len; xy /= len; xz /= len;

    const yx = zy * xz - zz * xy;
    const yy = zz * xx - zx * xz;
    const yz = zx * xy - zy * xx;

    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * eye[0] + xy * eye[1] + xz * eye[2]);
    out[13] = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
    out[14] = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);
    out[15] = 1;
  }

  _multiplyMat4(out, a, b) {
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        out[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
  }
}
