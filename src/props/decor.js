import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { cyl, xf, merge, beam, boxFromTo, mergedMesh, instanced } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import { LOFT_Y, LOFT_EDGE, HEARTH, CHANDELIER, LANTERNS, STAIRS } from '../building/layout.js';
import { PALETTE } from '../config.js';

let paneMat = null;
/** Warm translucent lantern glass (shared). */
export function lanternGlass() {
  paneMat ??= new THREE.MeshStandardMaterial({
    color: '#3a2a18', emissive: PALETTE.candle, emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 0.2,
  });
  return paneMat;
}

/** Iron lantern cage centred at p (bottom of the cage). Pushes into lists. */
export function lanternParts(p, s, iron, glass, flames) {
  const [x, y, z] = p;
  const w = 0.24 * s, h = 0.42 * s;
  iron.push(boxFromTo(x - w, y, z - w, x + w, y + 0.04 * s, z + w));
  iron.push(boxFromTo(x - w * 1.1, y + h, z - w * 1.1, x + w * 1.1, y + h + 0.04 * s, z + w * 1.1));
  iron.push(cyl(0, w * 1.05, 0.2 * s, 4, [x, y + h + 0.13 * s, z], [0, Math.PI / 4, 0]));
  iron.push(xf(new THREE.TorusGeometry(0.06 * s, 0.012 * s, 4, 10), [x, y + h + 0.28 * s, z]));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    iron.push(boxFromTo(x + dx * w - 0.02 * s, y, z + dz * w - 0.02 * s, x + dx * w + 0.02 * s, y + h, z + dz * w + 0.02 * s));
  }
  glass.push(boxFromTo(x - w * 0.95, y + 0.04 * s, z - w * 0.95, x + w * 0.95, y + h, z + w * 0.95));
  iron.push(cyl(0.035 * s, 0.035 * s, 0.14 * s, 6, [x, y + 0.11 * s, z]));
  flames.push({ pos: [x, y + 0.27 * s, z], size: 0.08 * s, phase: rand() * 100, lantern: true });
}

/** Chandelier, wall lanterns, shield and swords, herbs, sausages, lute, broom and cat. */
export function buildDecor(ctx) {
  const m = materials();
  const P = { iron: [], oak: [], lightWood: [], steel: [], brass: [], shield: [], wax: [], sack: [] };
  const glass = [];

  // --- Chandelier ----------------------------------------------------------
  const [cx, cy, cz] = CHANDELIER;
  P.iron.push(xf(new THREE.TorusGeometry(0.9, 0.045, 6, 32), [cx, cy, cz], [Math.PI / 2, 0, 0]));
  P.iron.push(xf(new THREE.TorusGeometry(0.32, 0.03, 6, 20), [cx, cy - 0.1, cz], [Math.PI / 2, 0, 0]));
  P.iron.push(cyl(0.05, 0.03, 0.7, 8, [cx, cy - 0.05, cz]));
  P.iron.push(xf(new THREE.SphereGeometry(0.08, 8, 6), [cx, cy - 0.42, cz]));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * 0.9, pz = cz + Math.sin(a) * 0.9;
    P.iron.push(beam([cx + Math.cos(a) * 0.32, cy - 0.1, cz + Math.sin(a) * 0.32], [px, cy, pz], 0.03, 0.03));
    P.iron.push(cyl(0.07, 0.05, 0.05, 8, [px, cy + 0.04, pz]));
    const h = randRange(0.2, 0.32);
    P.wax.push(cyl(0.035, 0.038, h, 8, [px, cy + 0.06 + h / 2, pz]));
    ctx.flames.push({ pos: [px, cy + 0.06 + h + 0.07, pz], size: 0.08, phase: rand() * 100 });
    if (i % 2 === 0) P.iron.push(beam([px, cy + 0.02, pz], [cx, 6.0, cz], 0.012, 0.012));
  }

  // --- Wall lanterns on iron brackets ----------------------------------------
  for (const { pos, wall } of LANTERNS) {
    const [x, y, z] = pos;
    const out = wall === 'west' ? [1, 0] : [0, 1];
    const wx = x - out[0] * 0.3, wz = z - out[1] * 0.3;
    P.iron.push(boxFromTo(wx - 0.05, y + 0.25, wz - 0.05, wx + 0.05, y + 0.85, wz + 0.05));
    P.iron.push(beam([wx, y + 0.78, wz], [x, y + 0.78, z], 0.05, 0.05));
    P.iron.push(beam([wx, y + 0.4, wz], [x - out[0] * 0.05, y + 0.76, z - out[1] * 0.05], 0.03, 0.03));
    P.iron.push(beam([x, y + 0.78, z], [x, y + 0.6, z], 0.015, 0.015));
    lanternParts([x, y, z], 1, P.iron, glass, ctx.flames);
  }

  // --- Shield and crossed swords on the chimney breast ---------------------
  const sx = HEARTH.x1 - 0.22, sy = 4.75, sz = (HEARTH.z0 + HEARTH.z1) / 2;
  for (const dir of [-1, 1]) {
    const rot = (g) => xf(xf(g, [0, 0, 0], [dir * 0.75, 0, 0]), [sx + 0.02, sy, sz]);
    P.steel.push(rot(boxFromTo(-0.012, -0.2, -0.05, 0.012, 1.6, 0.05)));
    P.iron.push(rot(boxFromTo(-0.03, -0.24, -0.3, 0.03, -0.18, 0.3)));
    P.oak.push(rot(cyl(0.035, 0.035, 0.4, 6, [0, -0.44, 0])));
    P.brass.push(rot(xf(new THREE.SphereGeometry(0.06, 8, 6), [0, -0.68, 0])));
  }
  const shape = new THREE.Shape();
  shape.moveTo(-0.55, 0.6);
  shape.lineTo(0.55, 0.6);
  shape.quadraticCurveTo(0.6, -0.2, 0, -0.75);
  shape.quadraticCurveTo(-0.6, -0.2, -0.55, 0.6);
  const sg = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
  P.shield.push(xf(sg, [sx + 0.1, sy, sz], [0, Math.PI / 2, 0]));
  P.brass.push(xf(new THREE.SphereGeometry(0.12, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), [sx + 0.2, sy + 0.05, sz], [0, 0, -Math.PI / 2]));
  P.brass.push(boxFromTo(sx + 0.17, sy - 0.65, sz - 0.05, sx + 0.2, sy + 0.58, sz + 0.05));
  P.brass.push(boxFromTo(sx + 0.17, sy + 0.12, sz - 0.5, sx + 0.2, sy + 0.22, sz + 0.5));

  // --- Herbs and sausages hanging from the loft beam -----------------------
  const beamY = LOFT_Y - 0.62, hz = LOFT_EDGE;
  const herbs = [];
  for (let i = 0; i < 6; i++) {
    const x = -6.6 + i * 0.42, len = randRange(0.25, 0.45);
    P.sack.push(cyl(0.008, 0.008, len, 3, [x, beamY - len / 2, hz]));
    herbs.push({ p: [x, beamY - len, hz], r: [randRange(-0.1, 0.1), rand() * 3, 0], s: randRange(0.8, 1.15),
      color: new THREE.Color().setHSL(randRange(0.16, 0.26), 0.35, randRange(0.22, 0.34)) });
  }
  const herbGeo = merge([cyl(0.13, 0.02, 0.5, 7, [0, -0.25, 0]), cyl(0.025, 0.025, 0.1, 5, [0, 0.03, 0])]);
  ctx.scene.add(instanced(herbGeo, m.herb, herbs));
  const sausages = [];
  for (const [x0, x1, sag] of [[-3.3, -2.0, 0.5], [-1.8, -0.7, 0.4]]) {
    const n = 6;
    for (let i = 0; i < n; i++) {
      const t0 = (i + 0.5) / n;
      const pt = (t) => [x0 + (x1 - x0) * t, beamY - 0.05 - sag * 4 * t * (1 - t), hz];
      const a = pt(t0 - 0.02), b = pt(t0 + 0.02), p = pt(t0);
      sausages.push({ p, r: [0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2], color: new THREE.Color().setScalar(randRange(0.8, 1.1)) });
    }
  }
  const sausageGeo = xf(new THREE.CapsuleGeometry(0.05, 0.13, 3, 8), [0, 0, 0]);
  ctx.scene.add(instanced(sausageGeo, m.sausage, sausages));

  // --- Lute leaning under the west window ------------------------------------
  const lute = [];
  lute.push(xf(new THREE.SphereGeometry(0.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), [0, 0.42, 0], [-Math.PI / 2, 0, 0], [0.62, 0.36, 0.86]));
  lute.push(xf(new THREE.CircleGeometry(0.5, 20), [0, 0.42, 0.001], [0, 0, 0], [0.62, 0.86, 1]));
  lute.push(boxFromTo(-0.05, 0.75, -0.04, 0.05, 1.35, 0.03));
  lute.push(xf(boxFromTo(-0.055, 0, -0.03, 0.055, 0.28, 0.02), [0, 1.35, 0], [-0.7, 0, 0]));
  const luteGeo = xf(xf(merge(lute), [0, 0, 0], [0, Math.PI / 2, 0]), [0, 0, 0], [0, 0, 0.22]);
  P.lightWood.push(xf(luteGeo, [-6.62, 0.02, 5.0]));
  P.oak.push(xf(new THREE.CircleGeometry(0.07, 12), [-6.62 + 0.12, 0.57, 5.0], [0, Math.PI / 2, 0.22]));

  // --- Broom leaning on the stair stringer -----------------------------------
  const broom = [cyl(0.025, 0.025, 2.1, 6, [0, 1.25, 0]), cyl(0.07, 0.07, 0.08, 8, [0, 0.42, 0])];
  const broomAt = [STAIRS.x1 + 0.25, 0, STAIRS.zBottom - 0.6];
  P.oak.push(xf(merge(broom), broomAt, [0, 0, 0.2]));
  P.sack.push(xf(cyl(0.07, 0.2, 0.42, 10, [0, 0.21, 0]), broomAt, [0, 0, 0.2]));

  for (const [k, list] of Object.entries(P)) if (list.length) ctx.scene.add(mergedMesh(list, m[k]));
  const gm = mergedMesh(glass, lanternGlass(), { cast: false, receive: false });
  ctx.scene.add(gm);

  buildCat(ctx, m);
}

/** A sleeping ginger cat curled up on the hearthstone; it breathes slowly. */
function buildCat(ctx, m) {
  const cat = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10), m.fur);
  body.scale.set(0.5, 0.26, 0.38);
  body.position.y = 0.13;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), m.fur);
  head.position.set(0.2, 0.12, 0.12);
  head.scale.set(1, 0.85, 1.05);
  const ear = new THREE.ConeGeometry(0.045, 0.09, 4);
  const e1 = new THREE.Mesh(ear, m.fur);
  e1.position.set(0.24, 0.22, 0.08);
  e1.rotation.z = -0.4;
  const e2 = e1.clone();
  e2.position.set(0.17, 0.22, 0.2);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.045, 6, 16, Math.PI * 1.1), m.fur);
  tail.rotation.set(Math.PI / 2, 0, 0.3);
  tail.position.set(0, 0.05, 0);
  cat.add(body, head, e1, e2, tail);
  cat.traverse((o) => { o.castShadow = true; o.receiveShadow = true; });
  cat.position.set(HEARTH.x1 + 0.55, 0.06, HEARTH.z1 - 0.35);
  cat.rotation.y = 0.8;
  ctx.scene.add(cat);
  ctx.updaters.push((t) => {
    const b = 1 + Math.sin(t * 1.6) * 0.035;
    body.scale.set(0.5, 0.26 * b, 0.38 * b);
  });
}
