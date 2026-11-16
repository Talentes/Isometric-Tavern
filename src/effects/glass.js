import * as THREE from 'three';
import { NOISE_GLSL } from './fire.js';
import { CONFIG, PALETTE } from '../config.js';

// Leaded diamond-pane window glass. Pane UVs are in world units, so drop and
// came sizes stay constant across windows. The exterior side (front face)
// shows the warm, flickering interior; the interior side (back face, the one
// the camera sees through the cutaway) shows the cold moonlit street. Rain
// drops and rivulets refract whichever view is behind them.

const fragmentShader = /* glsl */ `
  uniform float uTime, uDensity, uWarmLevel;
  uniform vec3 uWarm, uCold, uMoon;
  varying vec2 vUv;
  varying vec2 vSeed;
  ${NOISE_GLSL}

  // Static beads of water that slowly appear and evaporate.
  vec3 staticDrops(vec2 uv, float t) {
    vec2 g = uv * 24.0;
    vec2 id = floor(g), f = fract(g) - 0.5;
    float h = hash12(id);
    vec2 c = (vec2(hash12(id + 1.7), hash12(id + 5.3)) - 0.5) * 0.7;
    float life = fract(t * 0.07 + h);
    float r = mix(0.12, 0.32, hash12(id + 9.1)) * smoothstep(0.0, 0.1, life) * smoothstep(1.0, 0.75, life);
    vec2 d = f - c;
    float m = smoothstep(r, r * 0.6, length(d)) * step(0.45, h * uDensity);
    return vec3(d * m * 1.6, m);
  }

  // Drops sliding down in columns, leaving a trail of small beads.
  vec3 slidingDrops(vec2 uv, float t) {
    float colW = 0.085;
    float col = floor(uv.x / colW);
    float h = hash12(vec2(col, 3.1));
    float speed = mix(0.08, 0.22, hash12(vec2(col, 7.7)));
    float period = 2.6;
    float y = 1.4 - mod(t * speed + h * period, period); // drop head height (world units)
    float wig = sin(uv.y * 18.0 + h * 6.28) * 0.012 + sin(uv.y * 41.0 + h) * 0.004;
    float cx = (col + 0.5) * colW + (h - 0.5) * colW * 0.5 + wig;
    vec2 d = vec2(uv.x - cx, (uv.y - y) * 0.75);
    float isOn = step(0.35, hash12(vec2(col, 11.0)) * uDensity);
    float head = smoothstep(0.02, 0.011, length(d)) * isOn;
    float above = uv.y - y;
    float trail = smoothstep(0.004, 0.0015, abs(d.x)) * step(0.0, above) * smoothstep(0.45, 0.0, above) * isOn;
    // beads left behind in the trail
    float bead = fract(uv.y * 26.0 + h * 3.0) - 0.5;
    float beads = smoothstep(0.006, 0.003, length(vec2(d.x, bead / 26.0))) * step(0.0, above) * smoothstep(0.6, 0.05, above) * isOn;
    float m = max(head, max(trail * 0.6, beads));
    return vec3(d * 22.0 * head + vec2(d.x * 40.0, 0.0) * beads, m);
  }

  // Moonlit street seen from inside: sky gradient, rooftops, a warm far window.
  vec3 outsideView(vec2 p) {
    vec3 c = mix(uCold * 0.25, uCold * 0.7, smoothstep(-0.2, 1.3, p.y));
    float roof = 0.35 + 0.18 * sin(p.x * 3.1 + 1.0) + 0.12 * step(0.5, fract(p.x * 1.3));
    c = mix(c, uCold * 0.18, smoothstep(roof + 0.03, roof - 0.03, p.y));
    c += uMoon * exp(-length(p - vec2(0.2, 1.2)) * 3.0) * 0.4;
    c += vec3(1.0, 0.6, 0.25) * smoothstep(0.06, 0.0, length(p - vec2(0.62, 0.22))) * 0.35;
    return c;
  }

  // Warm interior seen from the street.
  vec3 insideView(vec2 p) {
    vec3 c = mix(uWarm * 0.45, uWarm * 0.95, smoothstep(1.2, -0.1, p.y));
    c *= 0.85 + 0.15 * vnoise(p * 3.0 + uTime * 0.5);
    return c * uWarmLevel;
  }

  void main() {
    vec2 uv = vUv + fract(vSeed * 0.37) * 10.0; // decorrelate windows
    float t = uTime;
    vec3 sd = staticDrops(uv, t);
    vec3 sl = slidingDrops(uv, t);
    vec2 offs = sd.xy * 0.05 + sl.xy * 0.03;
    float water = max(sd.z, sl.z);

    // old crown glass: slightly wavy, uneven tint
    vec2 wav = vec2(vnoise(vUv * 6.0), vnoise(vUv * 6.0 + 7.0)) - 0.5;
    vec2 p = vUv + offs + wav * 0.04;

    vec3 col = gl_FrontFacing ? insideView(p) : outsideView(p);
    col *= mix(vec3(0.92, 1.0, 0.94), vec3(1.0), vnoise(vUv * 2.5));
    // drops gather light: brighter, with a small specular glint
    vec3 glint = gl_FrontFacing ? uWarm : uMoon;
    col += glint * water * 0.18;
    col += glint * smoothstep(0.55, 1.0, water) * max(offs.y * 14.0, 0.0) * 0.25;

    // diamond lead cames
    vec2 q = vec2(vUv.x + vUv.y, vUv.x - vUv.y) / 0.16;
    vec2 gq = abs(fract(q) - 0.5);
    float lead = smoothstep(0.43, 0.47, max(gq.x, gq.y));
    col = mix(col, vec3(0.03, 0.03, 0.035), lead);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uDensity: { value: CONFIG.glass.dropDensity },
      uWarmLevel: { value: 1 },
      uWarm: { value: new THREE.Color(CONFIG.glass.warmColor) },
      uCold: { value: new THREE.Color(CONFIG.glass.coldColor) },
      uMoon: { value: new THREE.Color(PALETTE.moonGlow) },
    },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec2 vSeed;
      void main() {
        vUv = uv;
        vSeed = modelMatrix[3].xz + modelMatrix[3].y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader,
  });
}
