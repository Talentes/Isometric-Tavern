import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, beam, cyl, xf, merge, mergedMesh } from '../core/geo.js';
import { randRange } from '../core/textures.js';
import { X0, WALL_H, HEARTH } from '../building/layout.js';
import { CONFIG } from '../config.js';

/** Stone fireplace, chimney, logs, cauldron, firewood, rug and fireside chairs. */
export function buildHearth(ctx) {
  const m = materials();
  const P = { hearthStone: [], soot: [], oak: [], iron: [], cloth: [], lightWood: [] };
  const { x1, z0, z1 } = HEARTH;
  const o0 = z0 + 0.55, o1 = z1 - 0.55; // firebox opening (z)
  const oh = 2.2; // opening height
  const back = -6.75;

  // Chimney breast with firebox opening
  P.hearthStone.push(boxFromTo(X0, 0, z0, x1, oh, o0, 0.9));
  P.hearthStone.push(boxFromTo(X0, 0, o1, x1, oh, z1, 0.9));
  P.hearthStone.push(boxFromTo(X0, 0, o0, back, oh, o1, 0.9));
  P.hearthStone.push(boxFromTo(X0, oh, z0, x1, 3.3, z1, 0.9));
  P.hearthStone.push(boxFromTo(X0, 3.3, z0 + 0.3, x1 - 0.25, WALL_H, z1 - 0.3, 0.9));
  // soot lining
  P.soot.push(boxFromTo(back - 0.01, 0.1, o0, back + 0.02, oh, o1));
  P.soot.push(boxFromTo(back, oh - 0.02, o0, x1 - 0.05, oh + 0.01, o1));
  P.soot.push(boxFromTo(back, 0.1, o0 - 0.01, x1 - 0.1, oh, o0 + 0.02));
  P.soot.push(boxFromTo(back, 0.1, o1 - 0.02, x1 - 0.1, oh, o1 + 0.01));
  // hearthstone slab + firebed
  P.hearthStone.push(boxFromTo(back, 0, o0, x1 + 1.0, 0.1, o1, 0.7));
  P.hearthStone.push(boxFromTo(x1, 0, z0 - 0.1, x1 + 1.1, 0.06, z1 + 0.1, 0.7));
  // mantel beam and shelf
  P.oak.push(boxFromTo(x1 - 0.1, oh, z0 - 0.15, x1 + 0.22, oh + 0.38, z1 + 0.15));
  P.lightWood.push(boxFromTo(x1 - 0.1, oh + 0.95, z0 - 0.1, x1 + 0.3, oh + 1.03, z1 + 0.1));
  // chimney stack above the wall top
  P.hearthStone.push(boxFromTo(-7.45, WALL_H, 0.4, -5.85, 9.4, 2.8, 0.9));
  P.hearthStone.push(boxFromTo(-7.6, 9.4, 0.25, -5.7, 9.6, 2.95, 0.9));
  P.soot.push(boxFromTo(-7.2, 9.4, 0.65, -6.1, 9.61, 2.55));

  // Andirons + burning logs
  const fx = HEARTH.fire[0], fz = HEARTH.fire[2];
  for (const dz of [-0.45, 0.45]) {
    P.iron.push(boxFromTo(fx - 0.45, 0.1, fz + dz - 0.04, fx + 0.35, 0.2, fz + dz + 0.04));
    P.iron.push(boxFromTo(fx + 0.3, 0.1, fz + dz - 0.04, fx + 0.38, 0.55, fz + dz + 0.04));
  }
  const coalMat = new THREE.MeshStandardMaterial({ color: '#2a1408', emissive: '#ff4a10', emissiveIntensity: 1.6, roughness: 1 });
  const logs = [
    beam([fx - 0.2, 0.28, fz - 0.75], [fx - 0.05, 0.28, fz + 0.75], 0.24, 0.24),
    beam([fx + 0.1, 0.32, fz - 0.7], [fx - 0.25, 0.42, fz + 0.65], 0.2, 0.2),
    beam([fx - 0.4, 0.2, fz - 0.4], [fx + 0.25, 0.48, fz + 0.1], 0.18, 0.18),
  ];
  P.soot.push(...logs);
  const coals = new THREE.Mesh(merge([
    xf(new THREE.SphereGeometry(0.55, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), [fx, 0.1, fz], [0, 0, 0], [0.8, 0.22, 1.3]),
  ]), coalMat);
  ctx.scene.add(coals);

  // Crane with hanging cauldron, swung a little aside so the flames show
  const cxp = fx + 0.08, czp = fz - 0.5;
  P.iron.push(cyl(0.035, 0.035, 2.0, 6, [back + 0.12, 1.1, o0 + 0.15]));
  P.iron.push(beam([back + 0.12, 1.95, o0 + 0.15], [cxp, 1.95, czp], 0.06, 0.06));
  P.iron.push(beam([back + 0.12, 1.4, o0 + 0.15], [cxp - 0.2, 1.95, czp - 0.2], 0.04, 0.04));
  P.iron.push(cyl(0.015, 0.015, 0.55, 4, [cxp, 1.68, czp]));
  const cauldron = [
    xf(new THREE.SphereGeometry(0.42, 18, 10, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.58), [cxp, 1.08, czp]),
    xf(new THREE.TorusGeometry(0.38, 0.03, 6, 20), [cxp, 1.15, czp], [Math.PI / 2, 0, 0]),
    xf(new THREE.TorusGeometry(0.38, 0.015, 4, 16, Math.PI), [cxp, 1.15, czp], [0, Math.PI / 2, 0]),
  ];
  P.iron.push(...cauldron);
  const stew = new THREE.Mesh(new THREE.CircleGeometry(0.36, 16), new THREE.MeshStandardMaterial({ color: '#4a3018', roughness: 0.3 }));
  stew.rotation.x = -Math.PI / 2;
  stew.position.set(cxp, 1.1, czp);
  ctx.scene.add(stew);

  // Stacked firewood beside the breast
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 4 - row; i++) {
      const x = X0 + 0.2 + i * 0.27 + row * 0.135, y = 0.13 + row * 0.24;
      const g = cyl(0.13, 0.13, randRange(0.95, 1.1), 7, [x, y, -0.85 + randRange(-0.05, 0.05)], [Math.PI / 2, randRange(0, 3), 0]);
      P.oak.push(g);
    }
  }

  // Rug
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 1.8), m.rug);
  rug.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  rug.position.set(-3.9, 0.012, 1.6);
  rug.receiveShadow = true;
  ctx.scene.add(rug);

  // Pair of high-backed chairs angled towards the fire
  for (const [cx, cz] of [[-3.3, 0.35], [-3.3, 2.85]]) {
    const yaw = Math.atan2(fx - cx, fz - cz);
    const { wood, cushion } = chairParts();
    P.oak.push(xf(merge(wood), [cx, 0, cz], [0, yaw, 0]));
    P.cloth.push(xf(merge(cushion), [cx, 0, cz], [0, yaw, 0]));
  }

  for (const [k, list] of Object.entries(P)) if (list.length) ctx.scene.add(mergedMesh(list, m[k]));
  ctx.anchors.coalMat = coalMat;

  const sp = CONFIG.flicker.speed;
  ctx.updaters.push((t) => {
    coalMat.emissiveIntensity = 1.3 + 0.35 * Math.sin(t * 2.1 * sp) + 0.2 * Math.sin(t * 5.3 * sp + 1.2);
  });
}

/** Chair built facing local +Z (seat front) with the high back at -Z. */
function chairParts() {
  const wood = [];
  const sy = 0.78;
  wood.push(boxFromTo(-0.42, sy - 0.08, -0.4, 0.42, sy, 0.4, 0.6));
  for (const [x, z] of [[-0.36, 0.34], [0.36, 0.34]]) wood.push(boxFromTo(x - 0.05, 0, z - 0.05, x + 0.05, sy, z + 0.05));
  for (const x of [-0.36, 0.36]) {
    wood.push(boxFromTo(x - 0.06, 0, -0.42, x + 0.06, 2.45, -0.3)); // back posts
    wood.push(cyl(0.05, 0.08, 0.16, 8, [x, 2.53, -0.36]));
    wood.push(boxFromTo(x - 0.06, sy + 0.45, -0.36, x + 0.06, sy + 0.53, 0.38)); // arms
    wood.push(boxFromTo(x - 0.04, sy, 0.3, x + 0.04, sy + 0.47, 0.36));
  }
  wood.push(boxFromTo(-0.32, sy + 0.1, -0.4, 0.32, 2.3, -0.34, 0.6)); // back panel
  wood.push(boxFromTo(-0.36, 2.25, -0.43, 0.36, 2.4, -0.3));
  wood.push(boxFromTo(-0.36, 0.2, -0.38, 0.36, 0.26, -0.33));
  const cushion = [xf(new THREE.SphereGeometry(0.5, 12, 6), [0, sy + 0.05, 0.02], [0, 0, 0], [0.74, 0.14, 0.7])];
  return { wood, cushion };
}
