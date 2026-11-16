import * as THREE from 'three';
import { instanced } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import { NOISE_GLSL } from '../effects/fire.js';
import { PALETTE, CONFIG } from '../config.js';
import { X0, X1, Z0, Z1, WALL_T, GROUND_Y, SLAB } from '../building/layout.js';

// Puddles: [x, z, radius, stretch, angle]
const PUDDLES = [
  [10.5, 9.6, 1.25, 1.4, 0.8], [9.6, 2.6, 1.5, 1.3, 0.3], [3.8, 8.2, 1.9, 1.5, -0.4],
  [-3.4, 8.9, 1.3, 1.6, 0.2], [10.2, -4.5, 1.2, 1.3, 1.2], [-10.6, 1.4, 1.0, 1.5, 0.5],
  [-0.6, 6.9, 0.7, 1.2, 1.0], [7.6, 6.3, 0.8, 1.3, -0.6], [-9.0, 9.5, 0.9, 1.4, 0.1],
];

/** Wet cobblestone street with reflective puddles. */
export function buildGround(ctx, envMap) {
  const group = new THREE.Group();
  group.name = 'ground';

  // Dark wet mortar bed
  const bed = new THREE.Mesh(
    new THREE.PlaneGeometry(SLAB.x1 - SLAB.x0, SLAB.z1 - SLAB.z0),
    new THREE.MeshStandardMaterial({ color: '#15171c', roughness: 0.45, envMap, envMapIntensity: 0.6 }),
  );
  bed.rotation.x = -Math.PI / 2;
  bed.position.set((SLAB.x0 + SLAB.x1) / 2, GROUND_Y - 0.055, (SLAB.z0 + SLAB.z1) / 2);
  bed.receiveShadow = true;
  group.add(bed);

  // Instanced cobbles on a jittered running-bond grid around the building
  const cobbleGeo = new THREE.SphereGeometry(0.5, 9, 4, 0, Math.PI * 2, 0, Math.PI / 2);
  const items = [];
  const base = new THREE.Color(PALETTE.cobble);
  const sx = 0.38, sz = 0.34;
  for (let row = 0, z = SLAB.z0 + sz / 2; z < SLAB.z1; z += sz, row++) {
    for (let x = SLAB.x0 + (row % 2 ? sx / 2 : sx / 4); x < SLAB.x1 - 0.12; x += sx) {
      if (x > X0 - WALL_T - 0.3 && x < X1 + 0.25 && z > Z0 - WALL_T - 0.3 && z < Z1 + 0.25) continue;
      const tone = randRange(0.7, 1.25);
      items.push({
        p: [x + randRange(-0.03, 0.03), GROUND_Y - 0.06, z + randRange(-0.03, 0.03)],
        r: [randRange(-0.06, 0.06), rand() * Math.PI, randRange(-0.06, 0.06)],
        s: [sx * randRange(0.84, 0.98), randRange(0.07, 0.11), sz * randRange(0.84, 0.98)],
        color: base.clone().multiplyScalar(tone).offsetHSL(randRange(-0.02, 0.03), 0, 0),
      });
    }
  }
  const cobbleMat = new THREE.MeshStandardMaterial({ roughness: 0.38, metalness: 0.0, envMap, envMapIntensity: 0.8 });
  const cobbles = instanced(cobbleGeo, cobbleMat, items, { cast: false });
  group.add(cobbles);

  // Puddles: mirror-like physical surface + an additive overlay for ripples
  // and the stretched reflection of the street lantern.
  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: '#05070d', roughness: 0.2, metalness: 0, ior: 1.8, specularIntensity: 0.3,
    specularColor: new THREE.Color(1.6, 1.6, 1.6), envMap, envMapIntensity: 1.0,
  });
  const overlayMat = createPuddleOverlay();
  for (const [x, z, r, stretch, ang] of PUDDLES) {
    const geo = puddleGeometry(r, stretch);
    const puddle = new THREE.Mesh(geo, puddleMat);
    puddle.rotation.set(-Math.PI / 2, 0, ang);
    puddle.position.set(x, GROUND_Y + 0.012, z);
    puddle.receiveShadow = true;
    const overlay = new THREE.Mesh(geo, overlayMat);
    overlay.rotation.copy(puddle.rotation);
    overlay.position.set(x, GROUND_Y + 0.016, z);
    overlay.renderOrder = 3;
    group.add(puddle, overlay);
  }

  ctx.scene.add(group);
  ctx.puddleOverlay = overlayMat;
  ctx.updaters.push((t) => {
    overlayMat.uniforms.uTime.value = t;
    overlayMat.uniforms.uWarmLevel.value = ctx.lights.fireLevel ?? 1;
    overlayMat.uniforms.uCamDir.value.copy(ctx.camera.position).sub(ctx.controls.target).normalize();
  });
  return group;
}

function puddleGeometry(r, stretch) {
  const shape = new THREE.Shape();
  const ph = rand() * 10;
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.16 * Math.sin(a * 3 + ph) + 0.08 * Math.sin(a * 5 + ph * 2) + 0.05 * Math.sin(a * 9 + ph);
    const px = Math.cos(a) * r * k * stretch, py = Math.sin(a) * r * k;
    i === 0 ? shape.moveTo(px, py) : shape.lineTo(px, py);
  }
  return new THREE.ShapeGeometry(shape, 1);
}

function createPuddleOverlay() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uRain: { value: CONFIG.rain.count > 0 ? 1 : 0 },
      uCamDir: { value: new THREE.Vector3(1, 1, 1).normalize() },
      uLightPos: { value: new THREE.Vector3(0, -100, 0) },
      uLightColor: { value: new THREE.Color(PALETTE.candle) },
      uLightLevel: { value: 1 },
      uGround: { value: GROUND_Y },
      uWarm: { value: new THREE.Color(PALETTE.windowGlow) },
      uWarmLevel: { value: 1 },
      uBuilding: { value: new THREE.Vector4(X0, Z0, X1, Z1) },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime, uRain, uLightLevel, uGround, uWarmLevel;
      uniform vec3 uCamDir, uLightPos, uLightColor, uWarm;
      uniform vec4 uBuilding;
      varying vec3 vWorld;
      ${NOISE_GLSL}
      // Expanding rain rings in a grid of randomly timed cells.
      float ripples(vec2 p) {
        float acc = 0.0;
        for (int k = 0; k < 2; k++) {
          vec2 q = p * (2.2 + float(k) * 1.3) + float(k) * 7.31;
          vec2 id = floor(q), f = fract(q) - 0.5;
          float h = hash12(id);
          vec2 c = vec2(hash12(id + 3.1), hash12(id + 9.7)) - 0.5;
          float t = fract(uTime * 0.9 + h);
          float d = length(f - c * 0.6);
          float ring = smoothstep(0.035, 0.0, abs(d - t * 0.45)) * (1.0 - t);
          acc += ring;
        }
        return acc;
      }
      void main() {
        vec2 p = vWorld.xz;
        float rip = ripples(p) * uRain;
        // where the street lantern appears mirrored on the wet ground
        float h = uLightPos.y - uGround;
        vec2 mirror = uLightPos.xz + uCamDir.xz * h / max(uCamDir.y, 0.2);
        vec2 toCam = normalize(uCamDir.xz);
        vec2 d = p - mirror;
        float along = dot(d, toCam);
        float across = dot(d, vec2(-toCam.y, toCam.x));
        across += (vnoise(vec2(along * 3.0, uTime * 4.0)) - 0.5) * 0.12 + rip * 0.03;
        float streak = exp(-across * across / 0.02) * exp(-along * along / 0.9);
        vec3 col = uLightColor * streak * 0.45 * uLightLevel;
        col += vec3(0.35, 0.42, 0.55) * rip * 0.08;
        // warm interior glow spilling out of the open tavern onto nearby water
        vec2 q = max(max(uBuilding.xy - p, p - uBuilding.zw), 0.0);
        float spill = exp(-length(q) * 0.45);
        float shimmer = 0.8 + 0.2 * vnoise(p * 1.7 + uTime * 0.6) + rip * 0.4;
        col += uWarm * spill * 0.035 * uWarmLevel * shimmer;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}
