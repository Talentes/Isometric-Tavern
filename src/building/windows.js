import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, mergedMesh } from '../core/geo.js';
import { createGlassMaterial } from '../effects/glass.js';
import { X0, Z0, WALL_T, WINDOWS } from './layout.js';

/** Oak frames, sills and shader glass panes for every window opening. */
export function buildWindows(ctx) {
  const m = materials();
  const glassMat = createGlassMaterial();
  const frames = [];
  const group = new THREE.Group();
  group.name = 'windows';
  const F = 0.1; // frame thickness

  for (const w of WINDOWS) {
    const { u0, u1, y0, y1 } = w;
    const west = w.wall === 'west';
    // Box spanning the wall thickness at a given u/y range.
    const part = (a0, a1, b0, b1, d0 = -0.02, d1 = WALL_T + 0.02) =>
      west
        ? boxFromTo(X0 - d1, b0, a0, X0 - d0, b1, a1, 0.6)
        : boxFromTo(a0, b0, Z0 - d1, a1, b1, Z0 - d0, 0.6);
    frames.push(part(u0, u1, y0 - 0.02, y0 + F)); // sill
    frames.push(part(u0 - 0.12, u1 + 0.12, y0 - 0.14, y0 - 0.02, -0.14, WALL_T + 0.04)); // ledge
    frames.push(part(u0, u1, y1 - F, y1 + 0.02)); // lintel
    frames.push(part(u0 - 0.08, u1 + 0.08, y1 + 0.02, y1 + 0.24, -0.07, WALL_T)); // header beam
    frames.push(part(u0, u0 + F, y0, y1)); // jambs
    frames.push(part(u1 - F, u1, y0, y1));
    frames.push(part((u0 + u1) / 2 - 0.035, (u0 + u1) / 2 + 0.035, y0, y1, WALL_T * 0.45, WALL_T * 0.55)); // mullion

    const gw = u1 - u0 - F * 2;
    const gh = y1 - y0 - F * 2;
    const geo = new THREE.PlaneGeometry(gw, gh);
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * gw, uv.getY(i) * gh);
    const pane = new THREE.Mesh(geo, glassMat);
    const uc = (u0 + u1) / 2, yc = (y0 + y1) / 2;
    if (west) {
      pane.position.set(X0 - WALL_T * 0.5, yc, uc);
      pane.rotation.y = -Math.PI / 2;
    } else {
      pane.position.set(uc, yc, Z0 - WALL_T * 0.5);
      pane.rotation.y = Math.PI;
    }
    pane.renderOrder = 2;
    group.add(pane);
  }
  group.add(mergedMesh(frames, m.oak));
  ctx.scene.add(group);
  ctx.updaters.push((t) => {
    glassMat.uniforms.uTime.value = t;
    glassMat.uniforms.uWarmLevel.value = ctx.lights.fireLevel ?? 1;
  });
  return group;
}
