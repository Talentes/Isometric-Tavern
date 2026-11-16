import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { cyl, xf, merge, beam, boxFromTo, mergedMesh, instanced } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import { TABLES, BAR, HEARTH, Z0, LOFT_Y } from '../building/layout.js';
import { SHELF_Y } from './furniture.js';

function lathe(profile, seg = 14) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
}

const GEO = {
  tankard: () => merge([
    cyl(0.11, 0.12, 0.26, 12, [0, 0.13, 0]),
    cyl(0.125, 0.125, 0.03, 12, [0, 0.05, 0]),
    cyl(0.12, 0.12, 0.03, 12, [0, 0.22, 0]),
    xf(new THREE.TorusGeometry(0.075, 0.018, 5, 10, Math.PI), [0.12, 0.13, 0], [0, 0, -Math.PI / 2]),
  ]),
  bottle: () => lathe([[0, 0], [0.075, 0], [0.078, 0.02], [0.078, 0.22], [0.06, 0.27], [0.026, 0.31], [0.024, 0.4], [0.03, 0.41], [0, 0.42]], 10),
  jug: () => merge([
    lathe([[0, 0], [0.12, 0], [0.16, 0.1], [0.15, 0.22], [0.09, 0.32], [0.1, 0.38], [0, 0.38]], 14),
    xf(new THREE.TorusGeometry(0.09, 0.02, 5, 10, Math.PI * 1.1), [0.14, 0.22, 0], [0, 0, -Math.PI / 2]),
  ]),
  mug: () => merge([
    cyl(0.085, 0.075, 0.18, 10, [0, 0.09, 0]),
    xf(new THREE.TorusGeometry(0.05, 0.015, 4, 8, Math.PI), [0.085, 0.09, 0], [0, 0, -Math.PI / 2]),
  ]),
  plate: () => lathe([[0, 0], [0.12, 0], [0.18, 0.025], [0.19, 0.035], [0, 0.015]], 16),
  bread: () => xf(new THREE.SphereGeometry(0.5, 12, 8), [0, 0.06, 0], [0, 0, 0], [0.3, 0.17, 0.18]),
  candle: () => merge([cyl(0.04, 0.042, 1, 8, [0, 0.5, 0])]),
  holder: () => merge([cyl(0.09, 0.1, 0.03, 12, [0, 0.015, 0]), cyl(0.05, 0.05, 0.05, 8, [0, 0.05, 0])]),
};

/** Tankards, plates, bottles, jugs, mugs, bread and candles — all instanced. */
export function buildTableware(ctx) {
  const m = materials();
  const L = { tankard: [], bottle: [], jug: [], mug: [], plate: [], bread: [], candle: [], holder: [] };
  const spin = () => [0, rand() * Math.PI * 2, 0];
  const candle = (x, y, z, h = randRange(0.18, 0.34), holder = true) => {
    const hy = holder ? y + 0.03 : y;
    if (holder) L.holder.push({ p: [x, y, z] });
    L.candle.push({ p: [x, hy, z], s: [1, h, 1] });
    ctx.flames.push({ pos: [x, hy + h + 0.075, z], size: 0.085, phase: rand() * 100 });
  };

  // Trestle table
  const T = TABLES.trestle;
  for (let i = 0; i < 6; i++) {
    const x = T.x - T.len / 2 + 0.55 + i * 0.7;
    const side = i % 2 ? 1 : -1;
    L.plate.push({ p: [x, T.h, T.z + side * 0.3], r: spin() });
    L.tankard.push({ p: [x + 0.22, T.h, T.z + side * 0.22 - side * 0.12], r: spin() });
  }
  L.bread.push({ p: [T.x - 0.5, T.h, T.z], r: [0, 0.4, 0] }, { p: [T.x + 1.2, T.h, T.z + 0.05], r: [0, -0.3, 0] });
  L.jug.push({ p: [T.x + 0.4, T.h, T.z - 0.05], r: spin() });
  candle(T.x - 1.2, T.h, T.z);
  candle(T.x + 1.8, T.h, T.z - 0.05);

  // Round tables
  for (const rt of TABLES.rounds) {
    candle(rt.x, rt.h, rt.z);
    for (let k = 0; k < 2; k++) {
      const a = rand() * Math.PI * 2;
      L.tankard.push({ p: [rt.x + Math.cos(a) * 0.38, rt.h, rt.z + Math.sin(a) * 0.38], r: spin() });
    }
    L.plate.push({ p: [rt.x + 0.25, rt.h, rt.z - 0.28], r: spin() });
    if (rand() < 0.6) L.bread.push({ p: [rt.x + 0.25, rt.h + 0.02, rt.z - 0.28], r: spin(), s: 0.7 });
  }

  // Bar counter and mantel
  for (const x of [2.3, 2.75, 4.4]) L.tankard.push({ p: [x, BAR.h, BAR.z0 + 0.4], r: spin() });
  L.jug.push({ p: [3.6, BAR.h, BAR.z0 + 0.35], r: spin() });
  candle(3.1, BAR.h, BAR.z0 + 0.3);
  const mx = HEARTH.x1 + 0.1, my = 2.2 + 1.03;
  L.jug.push({ p: [mx, my, HEARTH.z0 + 0.3], r: spin() }, { p: [mx, my, HEARTH.z1 - 0.4], r: spin(), s: 0.8 });
  L.mug.push({ p: [mx, my, HEARTH.z1 - 0.15], r: spin() });
  candle(mx, my, 1.6, 0.3);

  // Shelves behind the bar
  const sz = Z0 + 0.24;
  const bottleColors = ['#1f4a2a', '#3a2412', '#5a3a14', '#24382a', '#2a2a40'];
  for (const y of [SHELF_Y[0], SHELF_Y[1], SHELF_Y[3]]) {
    for (let x = BAR.x0 + 0.15; x < BAR.x1 - 0.3; x += randRange(0.17, 0.26)) {
      L.bottle.push({ p: [x, y, sz + randRange(-0.08, 0.08)], r: spin(), s: randRange(0.85, 1.1), color: bottleColors[Math.floor(rand() * 5)] });
    }
  }
  for (let x = BAR.x0 + 0.2; x < BAR.x1 - 0.3; x += 0.42) {
    (rand() < 0.5 ? L.jug : L.mug).push({ p: [x, SHELF_Y[2], sz], r: spin() });
  }
  L.mug.push({ p: [4.9, 0, -4.9], r: [Math.PI / 2, 0, 0.4] }); // dropped mug behind the bar

  // Loft table
  const LT = TABLES.loft;
  candle(LT.x + 0.2, LOFT_Y + LT.h, LT.z - 0.05, 0.28);
  L.mug.push({ p: [LT.x - 0.25, LOFT_Y + LT.h, LT.z + 0.1], r: spin() });

  // Hanging rack of tankards over the bar, chained to the roof beam
  const rackY = 3.45, rackX = 3.0, rz0 = Z0 + 0.3, rz1 = BAR.z1 + 0.1;
  const rack = [
    boxFromTo(rackX - 0.04, rackY - 0.04, rz0, rackX + 0.04, rackY + 0.04, rz1),
    beam([rackX, rackY, rz0 + 0.1], [rackX, 5.62, rz0 + 0.1], 0.025, 0.025),
    beam([rackX, rackY, rz1 - 0.1], [rackX, 5.62, rz1 - 0.1], 0.025, 0.025),
  ];
  for (let z = rz0 + 0.25; z < rz1 - 0.1; z += 0.36) {
    L.tankard.push({ p: [rackX, rackY - 0.05, z], r: [randRange(-0.15, 0.15), randRange(-0.3, 0.3), Math.PI] });
  }
  ctx.scene.add(mergedMesh(rack, m.iron));

  // Build instanced meshes
  const mats = {
    tankard: m.pewter, bottle: m.bottle, jug: m.clay, mug: m.clay, plate: m.lightWood,
    bread: m.bread, candle: m.wax, holder: m.pewter,
  };
  for (const [k, list] of Object.entries(L)) {
    if (!list.length) continue;
    const items = list.map((it) => ({ ...it, color: it.color ?? new THREE.Color().setScalar(randRange(0.85, 1.1)) }));
    ctx.scene.add(instanced(GEO[k](), mats[k], items, { cast: k !== 'candle' }));
  }
}
