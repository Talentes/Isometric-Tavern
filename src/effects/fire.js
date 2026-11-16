import * as THREE from 'three';
import { HEARTH } from '../building/layout.js';
import { CONFIG } from '../config.js';

// Noise-driven flame billboards. One instanced mesh draws the hearth fire and
// every candle / lantern flame; each instance has its own phase, turbulence
// and HDR intensity so only the hot cores exceed the bloom threshold.

export const NOISE_GLSL = /* glsl */ `
  float hash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
               mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
    return v;
  }
`;

const vertexShader = /* glsl */ `
  attribute float aPhase;
  attribute float aTurb;
  attribute float aIntensity;
  varying vec2 vUv;
  varying float vPhase;
  varying float vTurb;
  varying float vIntensity;
  void main() {
    vUv = uv;
    vPhase = aPhase; vTurb = aTurb; vIntensity = aIntensity;
    vec4 origin = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vec2 scale = vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
    origin.xy += position.xy * scale;
    origin.z += 0.05; // nudge towards the camera so it sits in front of its wick
    gl_Position = projectionMatrix * origin;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vPhase;
  varying float vTurb;
  varying float vIntensity;
  ${NOISE_GLSL}
  void main() {
    float h = vUv.y;
    float t = uTime * (1.0 + vTurb * 1.5);
    float n = fbm(vec2(vUv.x * 3.0 + vPhase, h * 2.5 - t * 2.2 + vPhase));
    float sway = sin(uTime * (2.0 + vTurb * 3.0) + vPhase) * 0.04 + (n - 0.5) * 0.45 * vTurb;
    float x = vUv.x - 0.5 - sway * h;
    float width = 0.36 * pow(max(1.0 - h, 0.0), 0.9) * smoothstep(-0.05, 0.22, h) + 0.02;
    float d = abs(x) / width;
    float top = 1.0 - smoothstep(0.55 - n * 0.35 * vTurb, 1.0, h + (n - 0.5) * 0.25 * vTurb);
    float body = (1.0 - smoothstep(0.55, 1.0, d)) * top;
    float core = (1.0 - smoothstep(0.0, 0.65, d)) * (1.0 - smoothstep(0.08, 0.55, h));
    vec3 red = vec3(0.9, 0.18, 0.03);
    vec3 orange = vec3(1.0, 0.48, 0.1);
    vec3 yellow = vec3(1.0, 0.86, 0.55);
    vec3 col = mix(red, orange, smoothstep(0.0, 0.7, body));
    col = mix(col, yellow, core);
    // blue base for candle flames
    col = mix(col, vec3(0.25, 0.35, 1.0), (1.0 - vTurb) * (1.0 - smoothstep(0.0, 0.12, h)) * 0.6);
    float a = body * (0.65 + 0.35 * core);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col * a * vIntensity * (0.8 + 0.6 * core), 1.0);
  }
`;

export function buildFire(ctx) {
  const items = [];
  // Hearth: a cluster of large turbulent tongues over the logs.
  const [fx, fy, fz] = HEARTH.fire;
  const tongues = [
    [0.0, 0.0, 1.0, 1.55], [-0.1, -0.45, 0.8, 1.1], [0.05, 0.42, 0.85, 1.2], [0.12, -0.2, 0.6, 0.95],
    [-0.05, 0.22, 0.7, 1.3], [0.15, 0.65, 0.5, 0.7], [0.1, -0.7, 0.5, 0.65], [0.2, 0.0, 0.55, 0.8],
  ];
  tongues.forEach(([dx, dz, w, h], i) => {
    items.push({ p: [fx + dx, fy - 0.12, fz + dz], s: [w, h], phase: i * 3.7, turb: 1.0, intensity: 3.2 });
  });
  for (const f of ctx.flames) {
    items.push({ p: f.pos.map((v, i) => (i === 1 ? v - f.size * 0.9 : v)), s: [f.size * 1.3, f.size * 3.2], phase: f.phase, turb: 0.12, intensity: 2.6 });
  }

  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);
  const phase = new Float32Array(items.length);
  const turb = new Float32Array(items.length);
  const inten = new Float32Array(items.length);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const m4 = new THREE.Matrix4();
  items.forEach((it, i) => {
    m4.makeScale(it.s[0], it.s[1], 1).setPosition(...it.p);
    mesh.setMatrixAt(i, m4);
    phase[i] = it.phase;
    turb[i] = it.turb;
    inten[i] = it.intensity;
  });
  geo.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
  geo.setAttribute('aTurb', new THREE.InstancedBufferAttribute(turb, 1));
  geo.setAttribute('aIntensity', new THREE.InstancedBufferAttribute(inten, 1));
  mesh.frustumCulled = false;
  mesh.renderOrder = 5;
  ctx.scene.add(mesh);

  const speed = CONFIG.flicker.speed;
  ctx.updaters.push((t) => (mat.uniforms.uTime.value = t * speed));
  return mesh;
}
