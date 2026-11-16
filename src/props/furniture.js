import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, beam, cyl, xf, merge, mergedMesh, instanced } from '../core/geo.js';
import { randRange } from '../core/textures.js';
import { X0, Z0, LOFT_Y, LOFT_EDGE, LOFT_X1, STAIRS, TABLES, BAR } from '../building/layout.js';

export const SHELF_Y = [1.3, 2.1, 2.9, 3.7];

/** Tables, benches, stools, chairs, bar counter, shelves, stairs, railing, bed, chest. */
export function buildFurniture(ctx) {
  const m = materials();
  const P = { oak: [], lightWood: [], plank: [], iron: [], linen: [], blanket: [] };
  const stools = [];

  // --- Long trestle table with benches ---------------------------------
  const T = TABLES.trestle;
  const tx0 = T.x - T.len / 2, tx1 = T.x + T.len / 2;
  P.lightWood.push(boxFromTo(tx0, T.h - 0.12, T.z - T.width / 2, tx1, T.h, T.z + T.width / 2, 1.2));
  for (const x of [tx0 + 0.55, tx1 - 0.55]) {
    for (const s of [-1, 1]) P.oak.push(beam([x, 0.02, T.z + s * 0.42], [x, T.h - 0.12, T.z + s * 0.1], 0.13, 0.13));
    P.oak.push(boxFromTo(x - 0.08, 0, T.z - 0.5, x + 0.08, 0.12, T.z + 0.5));
  }
  P.oak.push(boxFromTo(tx0 + 0.5, 0.5, T.z - 0.06, tx1 - 0.5, 0.64, T.z + 0.06)); // stretcher
  for (const s of [-1, 1]) {
    const bz = T.z + s * 1.0;
    P.lightWood.push(boxFromTo(tx0 + 0.15, 0.66, bz - 0.2, tx1 - 0.15, 0.76, bz + 0.2, 1.2));
    for (const x of [tx0 + 0.45, tx1 - 0.45]) P.oak.push(boxFromTo(x - 0.06, 0, bz - 0.17, x + 0.06, 0.66, bz + 0.17));
  }

  // --- Round tables with stools ----------------------------------------
  TABLES.rounds.forEach((rt, i) => {
    P.lightWood.push(cyl(rt.r, rt.r, 0.1, 20, [rt.x, rt.h - 0.05, rt.z]));
    P.oak.push(cyl(0.09, 0.12, rt.h - 0.1, 8, [rt.x, (rt.h - 0.1) / 2, rt.z]));
    P.oak.push(boxFromTo(rt.x - 0.45, 0, rt.z - 0.07, rt.x + 0.45, 0.1, rt.z + 0.07));
    P.oak.push(boxFromTo(rt.x - 0.07, 0, rt.z - 0.45, rt.x + 0.07, 0.1, rt.z + 0.45));
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + i * 0.9 + randRange(-0.3, 0.3);
      stools.push([rt.x + Math.cos(a) * (rt.r + 0.42), rt.z + Math.sin(a) * (rt.r + 0.42)]);
    }
  });
  stools.push([TABLES.loft.x - 0.2, TABLES.loft.z + 0.75]);
  const stoolGeo = stoolGeometry();
  const stoolItems = stools.map(([x, z], i) => ({
    p: [x, i === stools.length - 1 ? LOFT_Y : 0, z],
    r: [0, randRange(0, Math.PI), 0],
    color: new THREE.Color().setScalar(randRange(0.8, 1.05)),
  }));
  ctx.scene.add(instanced(stoolGeo, m.lightWood, stoolItems));

  // --- Bar counter and back shelves ------------------------------------
  const B = BAR;
  P.oak.push(boxFromTo(B.x0, 0, B.z0 + 0.1, B.x1, B.h - 0.1, B.z1 - 0.05, 0.8));
  P.lightWood.push(boxFromTo(B.x0 - 0.1, B.h - 0.1, B.z0, B.x1 + 0.12, B.h, B.z1 + 0.12, 1.4));
  for (let x = B.x0 + 0.05; x < B.x1; x += 0.42) { // vertical front boards
    P.plank.push(boxFromTo(x, 0.05, B.z1 - 0.05, x + 0.38, B.h - 0.12, B.z1 + 0.01, 0.8));
  }
  P.oak.push(boxFromTo(B.x0, 0, B.z1 - 0.06, B.x1, 0.14, B.z1 + 0.05)); // kick rail
  P.oak.push(boxFromTo(B.x0 - 0.1, 0, B.z0, B.x0 + 0.1, B.h - 0.1, B.z1 + 0.05)); // end post
  P.oak.push(boxFromTo(B.x1 - 0.1, 0, B.z0, B.x1 + 0.1, B.h - 0.1, B.z1 + 0.05)); // end post
  for (const y of SHELF_Y) P.lightWood.push(boxFromTo(B.x0, y - 0.06, Z0, B.x1 - 0.1, y, Z0 + 0.45, 1.2));
  for (const x of [B.x0, B.x1 - 0.1]) P.oak.push(boxFromTo(x - 0.06, 0, Z0 + 0.02, x + 0.06, SHELF_Y[3] + 0.3, Z0 + 0.45));

  // --- Stairs to the loft (rising towards -z) ---------------------------
  const S = STAIRS;
  const rise = LOFT_Y / S.steps;
  const run = (S.zBottom - S.zTop) / (S.steps - 1);
  for (let i = 0; i < S.steps - 1; i++) {
    const z = S.zBottom - i * run;
    P.plank.push(boxFromTo(S.x0 + 0.06, (i + 1) * rise - 0.07, z - run - 0.06, S.x1 - 0.06, (i + 1) * rise, z + 0.02, 0.8));
  }
  for (const x of [S.x0 + 0.05, S.x1 - 0.05]) {
    P.oak.push(beam([x, 0.05, S.zBottom + 0.25], [x, LOFT_Y - 0.15, S.zTop - 0.05], 0.3, 0.1));
  }
  const hx = S.x0 + 0.03;
  for (let i = 0; i <= 5; i++) {
    const z = S.zBottom - 0.1 - i * ((S.zBottom - S.zTop) / 5);
    const y = ((S.zBottom - z) / (S.zBottom - S.zTop)) * (LOFT_Y - rise) + rise;
    P.oak.push(boxFromTo(hx - 0.05, y, z - 0.05, hx + 0.05, y + 1.05, z + 0.05));
  }
  P.oak.push(beam([hx, rise + 1.05, S.zBottom], [hx, LOFT_Y + 1.05, S.zTop], 0.1, 0.12));

  // --- Loft railing (front edge and the end overlooking the bar) --------
  const rz = LOFT_EDGE + 0.05;
  for (let x = X0 + 0.5; x < S.x0; x += 0.62) {
    P.oak.push(boxFromTo(x - 0.05, LOFT_Y, rz - 0.05, x + 0.05, LOFT_Y + 1.05, rz + 0.05));
  }
  P.oak.push(boxFromTo(X0, LOFT_Y + 1.0, rz - 0.08, S.x0 + 0.08, LOFT_Y + 1.12, rz + 0.08));
  P.oak.push(boxFromTo(X0, LOFT_Y + 0.45, rz - 0.04, S.x0, LOFT_Y + 0.53, rz + 0.04));
  const rx = LOFT_X1 - 0.05;
  for (let z = Z0 + 0.4; z < LOFT_EDGE; z += 0.62) {
    P.oak.push(boxFromTo(rx - 0.05, LOFT_Y, z - 0.05, rx + 0.05, LOFT_Y + 1.05, z + 0.05));
  }
  P.oak.push(boxFromTo(rx - 0.08, LOFT_Y + 1.0, Z0, rx + 0.08, LOFT_Y + 1.12, LOFT_EDGE + 0.1));
  P.oak.push(boxFromTo(rx - 0.04, LOFT_Y + 0.45, Z0, rx + 0.04, LOFT_Y + 0.53, LOFT_EDGE));
  P.oak.push(boxFromTo(rx - 0.1, LOFT_Y, LOFT_EDGE - 0.1, rx + 0.1, LOFT_Y + 1.2, LOFT_EDGE + 0.1));

  // --- Bed, chest and loft table ----------------------------------------
  const by = LOFT_Y;
  P.oak.push(boxFromTo(X0 + 0.05, by, Z0 + 0.1, X0 + 2.5, by + 0.55, Z0 + 1.45, 0.8)); // frame
  P.oak.push(boxFromTo(X0 + 0.05, by, Z0 + 0.05, X0 + 0.22, by + 1.35, Z0 + 1.5)); // headboard
  P.oak.push(boxFromTo(X0 + 2.4, by, Z0 + 0.05, X0 + 2.55, by + 0.85, Z0 + 1.5)); // footboard
  P.linen.push(roundedSlab(2.2, 0.28, 1.25, [X0 + 1.33, by + 0.66, Z0 + 0.78]));
  P.linen.push(roundedSlab(0.42, 0.18, 0.95, [X0 + 0.5, by + 0.86, Z0 + 0.78]));
  P.blanket.push(roundedSlab(1.5, 0.12, 1.36, [X0 + 1.62, by + 0.83, Z0 + 0.78]));
  const cx = X0 + 3.3, cz = Z0 + 0.6;
  P.oak.push(boxFromTo(cx - 0.6, by, cz - 0.35, cx + 0.6, by + 0.62, cz + 0.35, 0.7));
  P.oak.push(xf(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12, 1, false, 0, Math.PI), [cx, by + 0.62, cz], [0, 0, Math.PI / 2]));
  for (const dx of [-0.42, 0.42]) {
    P.iron.push(boxFromTo(cx + dx - 0.04, by - 0.01, cz - 0.37, cx + dx + 0.04, by + 0.64, cz + 0.37));
    P.iron.push(xf(new THREE.CylinderGeometry(0.37, 0.37, 0.08, 12, 1, true, 0, Math.PI), [cx + dx, by + 0.62, cz], [0, 0, Math.PI / 2]));
  }
  const L = TABLES.loft;
  P.lightWood.push(boxFromTo(L.x - L.w / 2, by + L.h - 0.08, L.z - L.d / 2, L.x + L.w / 2, by + L.h, L.z + L.d / 2, 1));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const x = L.x + dx * (L.w / 2 - 0.08), z = L.z + dz * (L.d / 2 - 0.08);
    P.oak.push(boxFromTo(x - 0.05, by, z - 0.05, x + 0.05, by + L.h - 0.08, z + 0.05));
  }

  for (const [k, list] of Object.entries(P)) if (list.length) ctx.scene.add(mergedMesh(list, m[k]));
}

function stoolGeometry() {
  const parts = [cyl(0.26, 0.25, 0.08, 14, [0, 0.72, 0])];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    parts.push(beam([Math.cos(a) * 0.24, 0, Math.sin(a) * 0.24], [Math.cos(a) * 0.12, 0.7, Math.sin(a) * 0.12], 0.06, 0.06));
  }
  return merge(parts);
}

function roundedSlab(w, h, d, p) {
  const g = new THREE.SphereGeometry(0.5, 16, 8);
  return xf(g, p, [0, 0, 0], [w, h, d]);
}

