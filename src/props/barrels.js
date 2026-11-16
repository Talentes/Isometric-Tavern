import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, cyl, xf, merge, mergedMesh, instanced } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import { BAR, GROUND_Y, Z0 } from '../building/layout.js';

const H = 1.3; // barrel height
const R = 0.5; // barrel radius at the bulge

/** Barrel body (lathe, closed with lids) and its hoops, both unit-scale. */
function barrelGeometries() {
  const pts = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const y = (t - 0.5) * H;
    pts.push(new THREE.Vector2(R * (0.84 + 0.16 * Math.sin(Math.PI * t)), y));
  }
  const lathe = new THREE.LatheGeometry(pts, 20);
  const uv = lathe.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i));
  const lidR = R * 0.84;
  const lid = (y, flip) => xf(new THREE.CircleGeometry(lidR, 20), [0, y, 0], [flip ? Math.PI / 2 : -Math.PI / 2, 0, 0]);
  const body = merge([lathe, lid(H / 2 - 0.03, false), lid(-H / 2 + 0.03, true)]);
  const hoops = [];
  for (const t of [0.1, 0.3, 0.7, 0.9]) {
    const r = R * (0.84 + 0.16 * Math.sin(Math.PI * t)) + 0.012;
    hoops.push(xf(new THREE.CylinderGeometry(r, r, 0.06, 20, 1, true), [0, (t - 0.5) * H, 0]));
  }
  return { body, hoops: merge(hoops) };
}

function sackGeometry() {
  const g = new THREE.SphereGeometry(0.5, 14, 10);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const top = Math.max(0, y);
    const pinch = 1 - top * top * 2.4; // gather into a neck at the top
    x *= pinch * (1 + 0.05 * Math.sin(y * 13 + z * 7));
    z *= pinch * (1 + 0.05 * Math.cos(x * 11));
    y = y < 0 ? y * 0.75 : y * 1.2;
    p.setXYZ(i, x * 0.9, y + 0.38, z * 0.75);
  }
  g.computeVertexNormals();
  return merge([g, cyl(0.06, 0.09, 0.14, 8, [0, 0.98, 0])]);
}

function crateGeometry() {
  const s = 0.8, f = 0.07, parts = [];
  for (const y of [0.04, s - 0.04]) { // rims
    parts.push(boxFromTo(-s / 2, y - f / 2, -s / 2 - 0.01, s / 2, y + f / 2, -s / 2 + f));
    parts.push(boxFromTo(-s / 2, y - f / 2, s / 2 - f, s / 2, y + f / 2, s / 2 + 0.01));
    parts.push(boxFromTo(-s / 2 - 0.01, y - f / 2, -s / 2, -s / 2 + f, y + f / 2, s / 2));
    parts.push(boxFromTo(s / 2 - f, y - f / 2, -s / 2, s / 2 + 0.01, y + f / 2, s / 2));
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    parts.push(boxFromTo(x * s / 2 - f / 2, 0, z * s / 2 - f / 2, x * s / 2 + f / 2, s, z * s / 2 + f / 2));
  }
  for (const y of [0.22, 0.42, 0.62]) { // side slats, slightly inset
    parts.push(boxFromTo(-s / 2 + 0.02, y - 0.07, -s / 2 + 0.01, s / 2 - 0.02, y + 0.07, s / 2 - 0.01, 0.6));
  }
  parts.push(boxFromTo(-s / 2 + 0.02, s - 0.07, -s / 2 + 0.02, s / 2 - 0.02, s - 0.02, s / 2 - 0.02, 0.6));
  return merge(parts);
}

/** Ale barrels behind the bar, kegs, sacks, crates and the rain barrel outside. */
export function buildBarrels(ctx) {
  const m = materials();
  const { body, hoops } = barrelGeometries();
  const lie = [Math.PI / 2, 0, 0];
  const bx = 6.35;
  const lying = [[bx, 0.68, Z0 + 0.72], [bx, 0.68, Z0 + 2.08], [bx, 1.72, Z0 + 0.72]];
  const items = [
    ...lying.map((p) => ({ p, r: lie })),
    { p: [bx, 1.72, Z0 + 2.08], r: [0, 0.2, 0], s: 0.6 },
    { p: [BAR.x1 - 0.45, BAR.h + 0.25, BAR.z0 + 0.32], r: [0, 0, Math.PI / 2], s: 0.45 },
    { p: [2.5, 0.4, Z0 + 0.45], s: 0.6 }, { p: [3.2, 0.4, Z0 + 0.45], s: 0.6 },
    { p: [-8.25, GROUND_Y + H / 2 + 0.02, 4.25] }, // rain barrel under the eaves
    { p: [6.1, H * 0.35, -2.2], s: 0.55 },
  ].map((it) => ({ ...it, color: new THREE.Color().setScalar(randRange(0.75, 1.05)) }));
  ctx.scene.add(instanced(body, m.staves, items));
  ctx.scene.add(instanced(hoops, m.iron, items.map(({ p, r, s }) => ({ p, r, s }))));
  ctx.anchors.rainBarrel = items[7].p;

  const P = { oak: [], brass: [], plank: [] };
  // Cradle for the lying barrels and taps facing the counter
  for (const dx of [-0.38, 0.38]) P.oak.push(boxFromTo(bx + dx - 0.08, 0, Z0 + 0.05, bx + dx + 0.08, 0.16, Z0 + 2.75));
  P.plank.push(boxFromTo(bx - 0.6, 1.17, Z0 + 0.1, bx + 0.6, 1.22, Z0 + 1.35));
  for (const [x, y, z] of lying) {
    if (z > Z0 + 1) continue;
    P.brass.push(cyl(0.035, 0.035, 0.2, 6, [x, y - 0.18, z + H / 2 + 0.08], [Math.PI / 2, 0, 0]));
    P.brass.push(cyl(0.025, 0.025, 0.14, 6, [x, y - 0.26, z + H / 2 + 0.16]));
  }
  P.brass.push(cyl(0.035, 0.035, 0.2, 6, [bx, 0.5, Z0 + 2.08 + H / 2 + 0.08], [Math.PI / 2, 0, 0]));
  // stand for the keg on the counter
  P.oak.push(boxFromTo(BAR.x1 - 0.8, BAR.h, BAR.z0 + 0.12, BAR.x1 - 0.1, BAR.h + 0.06, BAR.z0 + 0.52));
  for (const [k, list] of Object.entries(P)) if (list.length) ctx.scene.add(mergedMesh(list, m[k]));

  // Sacks and crates
  const sacks = [
    [6.5, 0, -1.4], [6.45, 0, -0.65], [6.5, 0.62, -1.05], [-4.9, 0, -4.9], [-5.5, 0, -4.7], [-6.3, 0, 4.9],
  ].map((p) => ({ p, r: [randRange(-0.08, 0.08), rand() * 6, randRange(-0.08, 0.08)], s: randRange(0.8, 1.0) }));
  ctx.scene.add(instanced(sackGeometry(), m.sack, sacks));
  const crates = [
    [-6.45, 0, -3.15, 0.1], [-6.4, 0.8, -3.2, 0.3], [0.85, 0, -0.75, 0.05], [0.85, 0.8, -0.9, -0.2],
  ].map(([x, y, z, ry]) => ({ p: [x, y, z], r: [0, ry, 0], color: new THREE.Color().setScalar(randRange(0.8, 1.1)) }));
  ctx.scene.add(instanced(crateGeometry(), m.lightWood, crates));
}
