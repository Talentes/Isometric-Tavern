import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, beam, mergedMesh, instanced, box } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import {
  X0, X1, Z0, Z1, WALL_T, WALL_H, STONE_H, LOFT_Y, LOFT_EDGE, GROUND_Y, SLAB, WINDOWS,
} from './layout.js';

/** Foundation, floors, the two remaining walls and the heavy oak frame. */
export function buildShell(ctx) {
  const m = materials();
  const group = new THREE.Group();
  group.name = 'shell';

  // --- Diorama slab and building plinth -------------------------------
  const slab = boxFromTo(SLAB.x0, SLAB.y0, SLAB.z0, SLAB.x1, GROUND_Y - 0.06, SLAB.z1, 1.4);
  group.add(mergedMesh([slab], m.foundation, { cast: false }));
  const plinth = boxFromTo(X0 - WALL_T - 0.1, GROUND_Y - 0.1, Z0 - WALL_T - 0.1, X1 + 0.08, -0.08, Z1 + 0.08, 1.2);
  group.add(mergedMesh([plinth], m.foundation));

  // --- Walls ----------------------------------------------------------
  const stone = [];
  const plaster = [];
  const wallBox = (wall, u0, u1, y0, y1, inset = 0) => {
    const d0 = -inset, d1 = WALL_T;
    const g = wall === 'west'
      ? boxFromTo(X0 - d1, y0, u0, X0 - d0, y1, u1, 1.6)
      : boxFromTo(u0, y0, Z0 - d1, u1, y1, Z0 - d0, 1.6);
    (y1 <= STONE_H + 0.001 ? stone : plaster).push(g);
  };
  buildWall('west', Z0 - WALL_T, Z1, wallBox);
  buildWall('north', X0, X1, wallBox);
  group.add(mergedMesh(stone, m.stone));
  group.add(mergedMesh(plaster, m.plaster));

  // --- Timber frame on the interior faces -----------------------------
  const oak = [];
  const T = 0.24; // timber width
  const P = 0.07; // how far timber protrudes from plaster
  const post = (wall, u, y0, y1) => {
    const [a, b] = [wallPointArr(wall, u, y0, -P / 2 + 0.05), wallPointArr(wall, u, y1, -P / 2 + 0.05)];
    oak.push(beam(a, b, T, wall === 'west' ? T : T));
  };
  const rail = (wall, u0, u1, y, h = T) => {
    oak.push(beam(wallPointArr(wall, u0, y, -P / 2 + 0.05), wallPointArr(wall, u1, y, -P / 2 + 0.05), h, T));
  };
  // west wall (u = z)
  for (const z of [Z0 + 0.12, -2.0, 3.6, Z1 - 0.12]) post('west', z, STONE_H, WALL_H);
  rail('west', Z0, Z1, STONE_H + 0.1, 0.26);
  rail('west', Z0, Z1, LOFT_Y - 0.15, 0.3);
  rail('west', Z0, Z1, WALL_H - 0.15, 0.3);
  oak.push(beam(wallPointArr('west', Z0 + 0.2, STONE_H + 0.2, 0), wallPointArr('west', -2.1, LOFT_Y - 0.3, 0), 0.2, 0.2));
  oak.push(beam(wallPointArr('west', -1.9, LOFT_Y, 0), wallPointArr('west', -0.25, WALL_H - 0.3, 0), 0.2, 0.2));
  oak.push(beam(wallPointArr('west', 3.7, WALL_H - 0.3, 0), wallPointArr('west', Z1 - 0.2, LOFT_Y, 0), 0.2, 0.2));
  // north wall (u = x)
  for (const x of [X0 + 0.12, -3.0, 0.5, 3.8, X1 - 0.12]) post('north', x, STONE_H, WALL_H);
  rail('north', X0, X1, STONE_H + 0.1, 0.26);
  rail('north', X0, X1, LOFT_Y - 0.15, 0.3);
  rail('north', X0, X1, WALL_H - 0.15, 0.3);
  oak.push(beam(wallPointArr('north', -2.9, LOFT_Y, 0), wallPointArr('north', 0.4, WALL_H - 0.3, 0), 0.2, 0.2));
  oak.push(beam(wallPointArr('north', 3.9, WALL_H - 0.3, 0), wallPointArr('north', X1 - 0.2, LOFT_Y, 0), 0.2, 0.2));
  oak.push(beam(wallPointArr('north', 0.6, STONE_H + 0.2, 0), wallPointArr('north', 3.7, LOFT_Y - 0.3, 0), 0.2, 0.2));
  oak.push(beam(wallPointArr('north', 3.9, LOFT_Y - 0.3, 0), wallPointArr('north', X1 - 0.2, STONE_H + 0.2, 0), 0.2, 0.2));
  // corner post (full height, through the wall thickness) and cut-edge posts
  oak.push(boxFromTo(X0 - WALL_T - 0.05, STONE_H, Z0 - WALL_T - 0.05, X0 - WALL_T + 0.3, WALL_H + 0.05, Z0 - WALL_T + 0.3));
  oak.push(boxFromTo(X0 - WALL_T - 0.04, STONE_H, Z1 - 0.3, X0 + 0.04, WALL_H + 0.05, Z1 + 0.02));
  oak.push(boxFromTo(X1 - 0.3, STONE_H, Z0 - WALL_T - 0.04, X1 + 0.02, WALL_H + 0.05, Z0 + 0.04));
  // top wall plates sitting on the walls
  oak.push(boxFromTo(X0 - WALL_T - 0.05, WALL_H, Z0 - WALL_T - 0.05, X0 + 0.05, WALL_H + 0.3, Z1 + 0.02));
  oak.push(boxFromTo(X0, WALL_H, Z0 - WALL_T - 0.05, X1 + 0.02, WALL_H + 0.3, Z0 + 0.05));

  // --- Loft structure --------------------------------------------------
  oak.push(boxFromTo(X0, LOFT_Y - 0.62, LOFT_EDGE - 0.2, X1, LOFT_Y - 0.1, LOFT_EDGE + 0.18)); // edge beam
  for (let x = X0 + 1.2; x < X1; x += 1.4) {
    oak.push(boxFromTo(x - 0.1, LOFT_Y - 0.42, Z0, x + 0.1, LOFT_Y - 0.1, LOFT_EDGE)); // joists
  }
  for (const x of [-3.6, 0.6]) {
    oak.push(boxFromTo(x - 0.17, 0, LOFT_EDGE - 0.17, x + 0.17, LOFT_Y - 0.6, LOFT_EDGE + 0.17)); // posts
    oak.push(beam([x - 0.9, LOFT_Y - 0.6, LOFT_EDGE], [x, LOFT_Y - 1.4, LOFT_EDGE], 0.16, 0.16));
    oak.push(beam([x + 0.9, LOFT_Y - 0.6, LOFT_EDGE], [x, LOFT_Y - 1.4, LOFT_EDGE], 0.16, 0.16));
  }

  // --- Roof tie beams spanning the open hall ---------------------------
  oak.push(boxFromTo(X0, 6.0, -1.08, X1 + 0.3, 6.38, -0.72));
  oak.push(boxFromTo(X0, 6.0, 4.12, X1 + 0.3, 6.38, 4.48));
  oak.push(boxFromTo(0.62, 5.62, Z0, 0.98, 6.0, Z1 + 0.3));
  group.add(mergedMesh(oak, m.oak));

  // Loft deck sub-floor (solid, so it blocks light properly)
  group.add(mergedMesh([boxFromTo(X0, LOFT_Y - 0.14, Z0, X1, LOFT_Y - 0.06, LOFT_EDGE + 0.15)], m.plank));

  // --- Floor planks (instanced) ----------------------------------------
  group.add(plankFloor(X0, X1, Z0, Z1, 0, m.plank));
  group.add(plankFloor(X0, X1, Z0, LOFT_EDGE + 0.15, LOFT_Y, m.plank));

  ctx.scene.add(group);
  return group;
}

function wallPointArr(wall, u, y, inward) {
  return wall === 'west' ? [X0 + inward, y, u] : [u, y, Z0 + inward];
}

/** Split a wall into solid boxes around its window openings. */
function buildWall(wall, uStart, uEnd, emit) {
  const holes = WINDOWS.filter((w) => w.wall === wall);
  const cuts = [uStart, uEnd];
  holes.forEach((h) => cuts.push(h.u0, h.u1));
  cuts.sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i++) {
    const u0 = cuts[i], u1 = cuts[i + 1];
    if (u1 - u0 < 1e-4) continue;
    const mid = (u0 + u1) / 2;
    const ys = [0, STONE_H, WALL_H];
    const inHoles = holes.filter((h) => mid > h.u0 && mid < h.u1);
    inHoles.forEach((h) => ys.push(h.y0, h.y1));
    ys.sort((a, b) => a - b);
    for (let j = 0; j < ys.length - 1; j++) {
      const y0 = ys[j], y1 = ys[j + 1];
      if (y1 - y0 < 1e-4) continue;
      const ym = (y0 + y1) / 2;
      if (inHoles.some((h) => ym > h.y0 && ym < h.y1)) continue;
      emit(wall, u0, u1, y0, y1, y1 <= STONE_H + 0.001 ? 0.06 : 0);
    }
  }
}

/** Worn plank floor: rows of planks with random lengths and tones. */
function plankFloor(x0, x1, z0, z1, y, material) {
  const items = [];
  const width = 0.36;
  for (let z = z0; z < z1 - 0.01; z += width) {
    let x = x0 - rand() * 1.5;
    while (x < x1) {
      const len = randRange(1.4, 3.4);
      const a = Math.max(x, x0), b = Math.min(x + len, x1);
      if (b - a > 0.05) {
        const tone = randRange(0.72, 1.12);
        const c = new THREE.Color(tone, tone * randRange(0.95, 1.0), tone * randRange(0.88, 1.0));
        items.push({
          p: [(a + b) / 2, y - 0.04 + randRange(-0.008, 0.008), Math.min(z + width / 2, z1 - width / 2)],
          s: [b - a - 0.02, 1, Math.min(width, z1 - z) - 0.025],
          r: [randRange(-0.004, 0.004), 0, 0],
          color: c,
        });
      }
      x += len;
    }
  }
  const geo = box(1, 0.08, 1, 1);
  return instanced(geo, material, items, { cast: false });
}
