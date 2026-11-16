import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { HEARTH, CHANDELIER, LANTERNS, TABLES, BAR, LOFT_Y } from '../building/layout.js';

const L = CONFIG.lights;
const F = CONFIG.flicker;

/** Smooth pseudo-random flicker in roughly [-1, 1] built from detuned sines. */
export function flicker(t, phase, speed = 1) {
  const s = t * speed * F.speed;
  return (
    Math.sin(s * 7.3 + phase) * 0.45 +
    Math.sin(s * 13.1 + phase * 1.7) * 0.3 +
    Math.sin(s * 23.7 + phase * 2.3) * 0.15 +
    Math.sin(s * 2.1 + phase * 0.3) * 0.25
  ) / 1.15;
}

function point(color, intensity, distance, pos) {
  const l = new THREE.PointLight(color, intensity, distance, L.decay);
  l.position.set(...pos);
  return l;
}

/**
 * Light rig: shadowed firelight, shadowed moonlight, a dim sky/ground fill and
 * a handful of non-shadowed candle and lantern lights that flicker independently.
 */
export function buildLights(ctx) {
  const { scene } = ctx;
  const target = new THREE.Vector3(...CONFIG.camera.target);

  scene.add(new THREE.HemisphereLight(L.hemiSky, L.hemiGround, L.hemiIntensity));

  // Moon: cold key light from behind the back walls, through the windows.
  const moon = new THREE.DirectionalLight(L.moonColor, L.moonIntensity);
  moon.position.copy(target).add(new THREE.Vector3(-26, 18, -2));
  moon.target.position.copy(target);
  moon.castShadow = true;
  moon.shadow.mapSize.setScalar(CONFIG.shadowMapSize.moon);
  const sc = moon.shadow.camera;
  sc.left = -17; sc.right = 17; sc.top = 17; sc.bottom = -17; sc.near = 5; sc.far = 70;
  moon.shadow.bias = -0.0006;
  moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  // Hearth: main light just in front of the firebox mouth, with shadows.
  const firePos = new THREE.Vector3(HEARTH.fire[0] + 0.85, 1.0, HEARTH.fire[2]);
  const fire = point(L.fireColor, L.fireIntensity, L.fireDistance, firePos.toArray());
  fire.castShadow = true;
  fire.shadow.mapSize.setScalar(CONFIG.shadowMapSize.fire);
  fire.shadow.camera.near = 0.2;
  fire.shadow.camera.far = L.fireDistance;
  fire.shadow.bias = -0.002;
  fire.shadow.normalBias = 0.03;
  fire.shadow.radius = 3;
  scene.add(fire);
  // Small fill inside the firebox to light the cauldron and soot.
  const ember = point(L.fireColor, 4, 3.2, [HEARTH.fire[0], 0.6, HEARTH.fire[2]]);
  scene.add(ember);

  const fireHigh = new THREE.Color(CONFIG.lights.fireColor);
  const fireLow = new THREE.Color('#d9541c');
  const fireCol = new THREE.Color();

  // Candles and lanterns (no shadows).
  const small = [];
  const add = (pos, intensity, distance) => {
    const l = point(L.candleColor, intensity, distance, pos);
    scene.add(l);
    small.push({ light: l, base: intensity, phase: Math.random() * 100, speed: 0.8 + Math.random() * 0.5 });
  };
  add([CHANDELIER[0], CHANDELIER[1] + 0.2, CHANDELIER[2]], L.chandelierIntensity, 13);
  for (const { pos, wall } of LANTERNS) {
    const out = wall === 'west' ? [0.35, 0] : [0, 0.35];
    add([pos[0] + out[0], pos[1] + 0.3, pos[2] + out[1]], L.lanternIntensity, 9);
  }
  add([TABLES.loft.x + 0.2, LOFT_Y + TABLES.loft.h + 0.45, TABLES.loft.z + 0.1], L.candleIntensity, 7);
  add([3.1, BAR.h + 0.5, BAR.z0 + 0.4], L.candleIntensity, 6);

  ctx.lights = { moon, fire, ember, small, fireLevel: 1, moonDir: moon.target.position.clone().sub(moon.position).normalize() };

  ctx.updaters.push((t) => {
    const n = flicker(t, 0.0, 1.0);
    const n2 = flicker(t, 4.1, 1.7);
    const level = 1 + F.fireAmount * (0.7 * n + 0.3 * n2);
    fire.intensity = L.fireIntensity * level;
    ember.intensity = 4 * (1 + 0.4 * n2);
    fireCol.copy(fireLow).lerp(fireHigh, THREE.MathUtils.clamp(0.55 + n * 0.45, 0, 1));
    fire.color.copy(fireCol);
    const j = F.fireJitter;
    fire.position.set(firePos.x + n2 * j, firePos.y + n * j * 1.5, firePos.z + flicker(t, 9.3, 1.3) * j);
    ctx.lights.fireLevel = level;
    for (const s of small) {
      s.light.intensity = s.base * (1 + F.candleAmount * flicker(t, s.phase, s.speed));
    }
  });
  return ctx.lights;
}
