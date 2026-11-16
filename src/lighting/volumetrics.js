import * as THREE from 'three';
import { CONFIG, PALETTE } from '../config.js';
import { NOISE_GLSL } from '../effects/fire.js';
import { worldToPixels } from '../effects/particles.js';
import { X0, X1, Z0, Z1, WINDOWS, HEARTH } from '../building/layout.js';

// Fake volumetrics with additive geometry: soft glows around flames, moonlight
// shafts through the west windows and a thin layer of smoke under the beams.
// All intensities stay below the bloom threshold so they read as haze, not glare.

export function buildVolumetrics(ctx) {
  buildGlows(ctx);
  buildMoonShafts(ctx);
  buildHaze(ctx);
}

function buildGlows(ctx) {
  const list = ctx.flames.map((f) => ({ p: f.pos, size: f.lantern ? 1.4 : 0.9, k: f.lantern ? 0.09 : 0.06, phase: f.phase }));
  const [fx, , fz] = HEARTH.fire;
  list.push({ p: [fx + 0.55, 0.9, fz], size: 4.2, k: 0.07, phase: -1 }); // hearth glow
  const n = list.length;
  const pos = new Float32Array(n * 3), attr = new Float32Array(n * 3);
  list.forEach((g, i) => {
    pos.set(g.p, i * 3);
    attr.set([g.size, g.k, g.phase], i * 3);
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aGlow', new THREE.BufferAttribute(attr, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: { value: 1 }, uFire: { value: 1 }, uColor: { value: new THREE.Color(PALETTE.candle) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScale, uFire;
      attribute vec3 aGlow;
      varying float vK;
      void main() {
        float fl = aGlow.z < 0.0 ? uFire : 1.0 + 0.12 * sin(uTime * 9.0 + aGlow.z) + 0.08 * sin(uTime * 23.0 + aGlow.z * 2.0);
        vK = aGlow.y * fl;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        mv.z += 0.3;
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aGlow.x * uScale * (0.92 + 0.08 * fl);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vK;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = exp(-d * d * 5.0) * (1.0 - smoothstep(0.8, 1.0, d));
        gl_FragColor = vec4(uColor * a * vK, 1.0);
      }`,
  });
  const glows = new THREE.Points(geo, mat);
  glows.frustumCulled = false;
  glows.renderOrder = 8;
  ctx.scene.add(glows);
  ctx.updaters.push((t) => {
    mat.uniforms.uTime.value = t * CONFIG.flicker.speed;
    mat.uniforms.uScale.value = worldToPixels(ctx);
    mat.uniforms.uFire.value = ctx.lights.fireLevel ?? 1;
  });
}

function buildMoonShafts(ctx) {
  const dir = ctx.lights.moonDir.clone();
  const len = 6.5;
  const positions = [], along = [], across = [];
  for (const w of WINDOWS) {
    const inward = w.wall === 'west' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1);
    if (dir.dot(inward) < 0.3) continue; // moon too oblique for this wall
    const pt = (u, y) => (w.wall === 'west' ? new THREE.Vector3(X0 - 0.2, y, u) : new THREE.Vector3(u, y, Z0 - 0.2));
    const c = [pt(w.u0 + 0.1, w.y0 + 0.1), pt(w.u1 - 0.1, w.y0 + 0.1), pt(w.u1 - 0.1, w.y1 - 0.1), pt(w.u0 + 0.1, w.y1 - 0.1)];
    for (let i = 0; i < 4; i++) {
      const a = c[i], b = c[(i + 1) % 4];
      const a2 = a.clone().addScaledVector(dir, len), b2 = b.clone().addScaledVector(dir, len);
      for (const [p, t, s] of [[a, 0, 0], [b, 0, 1], [b2, 1, 1], [a, 0, 0], [b2, 1, 1], [a2, 1, 0]]) {
        positions.push(p.x, p.y, p.z);
        along.push(t);
        across.push(s);
      }
    }
  }
  if (!positions.length) return;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aAlong', new THREE.Float32BufferAttribute(along, 1));
  geo.setAttribute('aAcross', new THREE.Float32BufferAttribute(across, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color(PALETTE.moonGlow) }, uStrength: { value: 0.028 } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aAlong, aAcross;
      varying float vAlong, vAcross;
      varying vec3 vWorld;
      void main() {
        vAlong = aAlong; vAcross = aAcross;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uStrength;
      uniform vec3 uColor;
      varying float vAlong, vAcross;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      void main() {
        float fall = pow(1.0 - vAlong, 1.6) * smoothstep(0.0, 0.08, vAlong);
        float edge = smoothstep(0.0, 0.3, vAcross) * smoothstep(1.0, 0.7, vAcross);
        float dust = 0.7 + 0.6 * fbm(vWorld.xz * 1.5 + vWorld.y * 0.8 + vec2(uTime * 0.05, -uTime * 0.03));
        gl_FragColor = vec4(uColor * fall * (0.35 + 0.65 * edge) * dust * uStrength, 1.0);
      }`,
  });
  const shafts = new THREE.Mesh(geo, mat);
  shafts.renderOrder = 9;
  ctx.scene.add(shafts);
  ctx.updaters.push((t) => (mat.uniforms.uTime.value = t));
}

function buildHaze(ctx) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uFire: { value: 1 }, uColor: { value: new THREE.Color('#8a6a50') } },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uFire;
      uniform vec3 uColor;
      varying vec2 vUv; varying vec3 vWorld;
      ${NOISE_GLSL}
      void main() {
        vec2 p = vWorld.xz * 0.35 + vec2(uTime * 0.03, uTime * 0.017) + vWorld.y;
        float n = fbm(p) * 0.7 + fbm(p * 2.7 - uTime * 0.02) * 0.3;
        float edge = smoothstep(0.0, 0.18, vUv.x) * smoothstep(1.0, 0.82, vUv.x) * smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
        float heat = 0.7 + 0.3 * smoothstep(8.0, 0.0, distance(vWorld.xz, vec2(-5.5, 1.6)));
        float a = smoothstep(0.35, 0.8, n) * edge * heat * uFire;
        gl_FragColor = vec4(uColor * a * 0.035, 1.0);
      }`,
  });
  for (const y of [5.25, 5.75, 6.2]) {
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set((X0 + X1) / 2 + (y - 5.7) * 0.6, y, (Z0 + Z1) / 2);
    plane.renderOrder = 9;
    ctx.scene.add(plane);
  }
  ctx.updaters.push((t) => {
    mat.uniforms.uTime.value = t;
    mat.uniforms.uFire.value = 0.85 + 0.15 * (ctx.lights.fireLevel ?? 1);
  });
}
