import * as THREE from 'three';
import { CONFIG, PALETTE } from '../config.js';
import { HEARTH, CHIMNEY_TOP } from '../building/layout.js';
import { NOISE_GLSL } from './fire.js';

// Two small GPU particle systems: embers rising from the hearth and smoke
// drifting from the chimney. Particles are stateless: each one's position is
// a function of time and its random seed, so the CPU only updates uniforms.

/** Pixels per world unit for the orthographic camera (keeps sizes in world units). */
export function worldToPixels(ctx) {
  const { camera, renderer } = ctx;
  const h = renderer.domElement.height; // device pixels
  return (h / (camera.top - camera.bottom)) * camera.zoom;
}

function seeds(n) {
  const a = new Float32Array(n * 4);
  for (let i = 0; i < a.length; i++) a[i] = Math.random();
  return a;
}

function points(n, origin, material) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(0), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seeds(n), 4));
  const p = new THREE.Points(g, material);
  p.position.set(...origin);
  p.frustumCulled = false;
  return p;
}

export function buildParticles(ctx) {
  const scale = { value: 1 };

  // --- Embers ---------------------------------------------------------------
  const emberMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uScale: scale, uColor: { value: new THREE.Color(PALETTE.fireHigh) } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      uniform float uTime, uScale;
      attribute vec4 aSeed;
      varying float vLife;
      varying float vTw;
      void main() {
        float life = fract(uTime * (0.25 + aSeed.w * 0.3) + aSeed.x);
        vec3 p = vec3((aSeed.y - 0.5) * 0.7, 0.0, (aSeed.z - 0.5) * 1.6);
        p.y += life * (1.6 + aSeed.w * 2.4);
        // some embers are drawn up the flue, others drift out into the room
        p.x += life * life * (aSeed.w > 0.55 ? 1.6 : -0.2);
        p.x += sin(uTime * 3.0 + aSeed.x * 40.0) * 0.12 * life;
        p.z += cos(uTime * 2.3 + aSeed.y * 30.0) * 0.15 * life;
        vLife = life;
        vTw = 0.6 + 0.4 * sin(uTime * 18.0 + aSeed.z * 50.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = max(uScale * 0.045 * (1.0 - life * 0.6), 1.5);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      varying float vLife;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (1.0 - vLife) * smoothstep(0.0, 0.05, vLife);
        vec3 c = mix(uColor * 3.0, vec3(1.0, 0.25, 0.05) * 1.5, vLife);
        gl_FragColor = vec4(c * a * vTw, 1.0);
      }`,
  });
  const embers = points(CONFIG.particles.embers, [HEARTH.fire[0], 0.4, HEARTH.fire[2]], emberMat);
  embers.renderOrder = 7;
  ctx.scene.add(embers);

  // --- Chimney smoke --------------------------------------------------------
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: scale,
      uColor: { value: new THREE.Color('#5a6478') },
      uMoon: { value: new THREE.Color(PALETTE.moon) },
    },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float uTime, uScale;
      attribute vec4 aSeed;
      varying float vLife;
      varying float vSeed;
      void main() {
        float life = fract(uTime * 0.07 + aSeed.x);
        vec3 p = vec3(0.0);
        p.y = life * 7.0;
        p.x = life * life * 4.5 + sin(life * 6.0 + aSeed.y * 6.28) * 0.5 * life;
        p.z = (aSeed.z - 0.5) * 0.6 + cos(life * 5.0 + aSeed.w * 6.28) * 0.4 * life;
        vLife = life;
        vSeed = aSeed.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uScale * (0.7 + life * 3.2);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor, uMoon;
      uniform float uTime;
      varying float vLife;
      varying float vSeed;
      ${NOISE_GLSL}
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float n = fbm(c * 3.0 + vSeed * 10.0 + vec2(0.0, uTime * 0.1));
        float d = length(c) + (n - 0.5) * 0.25;
        float a = smoothstep(0.5, 0.1, d) * smoothstep(0.0, 0.08, vLife) * (1.0 - vLife) * 0.32;
        vec3 col = mix(uColor, uMoon, 0.25 + 0.3 * (0.5 - c.y));
        gl_FragColor = vec4(col * 0.25, a);
      }`,
  });
  const smoke = points(CONFIG.particles.smoke, CHIMNEY_TOP, smokeMat);
  smoke.renderOrder = 4;
  ctx.scene.add(smoke);

  const speed = CONFIG.flicker.speed;
  ctx.updaters.push((t) => {
    scale.value = worldToPixels(ctx);
    emberMat.uniforms.uTime.value = t * speed;
    smokeMat.uniforms.uTime.value = t;
  });
  return { embers, smoke, scale };
}
