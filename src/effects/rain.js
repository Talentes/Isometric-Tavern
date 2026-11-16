import * as THREE from 'three';
import { CONFIG, PALETTE } from '../config.js';
import { X0, X1, Z0, Z1, WALL_T, GROUND_Y, SLAB } from '../building/layout.js';

// Rain: thousands of instanced streaks animated entirely on the GPU (only the
// time uniform changes per frame), plus small splash blips on the cobbles.

const TOP = 17;

function inFootprint(x, z) {
  return x > X0 - WALL_T - 0.4 && x < X1 + 0.2 && z > Z0 - WALL_T - 0.4 && z < Z1 + 0.2;
}

function randomStreetPoint() {
  for (;;) {
    const x = THREE.MathUtils.randFloat(SLAB.x0 + 0.2, SLAB.x1 - 0.2);
    const z = THREE.MathUtils.randFloat(SLAB.z0 + 0.2, SLAB.z1 - 0.2);
    if (!inFootprint(x, z)) return [x, z];
  }
}

export function buildRain(ctx) {
  const R = CONFIG.rain;
  const quad = new THREE.InstancedBufferGeometry();
  quad.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0, 0, 0.5, 0, 0, 0.5, 1, 0, -0.5, 1, 0], 3));
  quad.setIndex([0, 1, 2, 0, 2, 3]);
  const offs = new Float32Array(R.count * 4);
  for (let i = 0; i < R.count; i++) {
    const [x, z] = randomStreetPoint();
    offs.set([x, z, Math.random(), 0.8 + Math.random() * 0.4], i * 4);
  }
  quad.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offs, 4));
  quad.instanceCount = R.count;

  const uniforms = {
    uTime: { value: 0 },
    uSpeed: { value: R.speed },
    uLength: { value: R.length },
    uWidth: { value: R.width },
    uWind: { value: R.wind },
    uOpacity: { value: R.opacity },
    uTop: { value: TOP },
    uBottom: { value: GROUND_Y },
    uCold: { value: new THREE.Color('#9fb4dc') },
    uWarm: { value: new THREE.Color(PALETTE.candle) },
    uLamp: { value: new THREE.Vector3(0, -100, 0) },
    uBuilding: { value: new THREE.Vector4(X0, Z0, X1, Z1) },
    uCamDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide, // quads are built in view space; winding varies
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uSpeed, uLength, uWidth, uWind, uTop, uBottom;
      uniform vec3 uLamp, uCamDir;
      uniform vec4 uBuilding;
      attribute vec4 aOffset;
      varying float vHide;
      // Does the view ray behind this drop pass through the open tavern?
      float behindIsInterior(vec3 ro) {
        vec3 rd = -uCamDir;
        vec3 bmin = vec3(uBuilding.x - 0.5, 0.0, uBuilding.y - 0.5);
        vec3 bmax = vec3(uBuilding.z, 7.0, uBuilding.w);
        vec3 t0 = (bmin - ro) / rd, t1 = (bmax - ro) / rd;
        vec3 tmin = min(t0, t1), tmax = max(t0, t1);
        float tn = max(max(tmin.x, tmin.y), tmin.z);
        float tf = min(min(tmax.x, tmax.y), tmax.z);
        return step(tn, tf) * step(0.0, tf);
      }
      varying float vAlong;
      varying float vFade;
      varying float vWarm;
      void main() {
        float H = uTop - uBottom;
        float y = uBottom + mod(aOffset.z * H - uTime * uSpeed * aOffset.w, H);
        vec3 head = vec3(aOffset.x + uWind * (y - uBottom), y, aOffset.y);
        vec3 tail = head + normalize(vec3(uWind, 1.0, 0.0)) * uLength * aOffset.w;
        vec4 a = viewMatrix * vec4(head, 1.0);
        vec4 b = viewMatrix * vec4(tail, 1.0);
        vec2 dir = normalize(b.xy - a.xy + 1e-5);
        vec2 side = vec2(-dir.y, dir.x);
        vec4 p = mix(a, b, position.y);
        p.xy += side * position.x * uWidth;
        gl_Position = projectionMatrix * p;
        vAlong = position.y;
        vHide = behindIsInterior(head);
        vFade = smoothstep(uBottom, uBottom + 0.4, y) * (1.0 - smoothstep(uTop - 3.0, uTop, y));
        // warm tint near the street lantern and the open, firelit tavern
        vec2 q = max(max(uBuilding.xy - head.xz, head.xz - uBuilding.zw), 0.0);
        float bld = exp(-length(q) * 0.5) * (1.0 - smoothstep(4.0, 9.0, y));
        vWarm = clamp(exp(-distance(head, uLamp) * 0.45) * 1.2 + bld * 0.6, 0.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uOpacity;
      uniform vec3 uCold, uWarm;
      varying float vAlong;
      varying float vFade;
      varying float vWarm;
      varying float vHide;
      void main() {
        float a = smoothstep(0.0, 0.35, vAlong) * (1.0 - smoothstep(0.7, 1.0, vAlong));
        a *= mix(1.0, 0.15, vHide);
        vec3 col = mix(uCold, uWarm * 1.3, vWarm);
        gl_FragColor = vec4(col * a * vFade * uOpacity * (1.0 + vWarm), 1.0);
      }`,
  });
  const rain = new THREE.Mesh(quad, mat);
  rain.frustumCulled = false;
  rain.renderOrder = 6;
  ctx.scene.add(rain);

  // Splashes: short-lived blips where drops hit the street.
  const splashCount = Math.round(R.count * 0.08);
  const sp = new Float32Array(splashCount * 3);
  const seed = new Float32Array(splashCount);
  for (let i = 0; i < splashCount; i++) {
    const [x, z] = randomStreetPoint();
    sp.set([x, GROUND_Y + 0.04, z], i * 3);
    seed[i] = Math.random();
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  sg.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const smat = new THREE.ShaderMaterial({
    uniforms: { uTime: uniforms.uTime, uPx: { value: 1 }, uColor: uniforms.uCold, uOpacity: uniforms.uOpacity },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uPx;
      attribute float aSeed;
      varying float vLife;
      void main() {
        vLife = fract(uTime * 1.7 + aSeed * 13.7);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = (2.0 + 7.0 * vLife) * uPx;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vLife;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        c.y *= 2.2; // squashed ring, lying on the ground
        float d = length(c);
        float ring = smoothstep(0.5, 0.38, d) * smoothstep(0.2, 0.36, d);
        float a = ring * (1.0 - vLife) * step(vLife, 0.35) * 3.0;
        gl_FragColor = vec4(uColor * a * uOpacity, 1.0);
      }`,
  });
  const splashes = new THREE.Points(sg, smat);
  splashes.frustumCulled = false;
  ctx.scene.add(splashes);

  ctx.resizeHandlers.push((w, h, pr) => (smat.uniforms.uPx.value = pr));
  smat.uniforms.uPx.value = ctx.renderer.getPixelRatio();
  ctx.updaters.push((t) => {
    uniforms.uTime.value = t;
    uniforms.uCamDir.value.copy(ctx.camera.position).sub(ctx.controls.target).normalize();
    if (ctx.anchors.streetLamp) uniforms.uLamp.value.copy(ctx.anchors.streetLamp);
  });
  return { rain, splashes, uniforms };
}
