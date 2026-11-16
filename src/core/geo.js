import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const X = new THREE.Vector3(1, 0, 0);

/**
 * Box whose UVs are in world units (divided by uvScale) so textures keep a
 * constant density. U follows the box's X axis on top/front faces, so wood
 * grain runs along the length of a beam built along local X.
 */
export function box(w, h, d, uvScale = 1) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / uvScale, (uv.getY(k) * dims[f][1]) / uvScale);
    }
  }
  return g;
}

/** Apply position / rotation (euler, radians) / scale to a geometry in place. */
export function xf(geo, p = [0, 0, 0], r = [0, 0, 0], s = 1) {
  _e.set(r[0], r[1], r[2]);
  _q.setFromEuler(_e);
  if (typeof s === 'number') _s.setScalar(s);
  else _s.set(s[0], s[1], s[2]);
  _m.compose(_p.set(p[0], p[1], p[2]), _q, _s);
  geo.applyMatrix4(_m);
  return geo;
}

/** Axis-aligned box given min and max corners. */
export function boxFromTo(x0, y0, z0, x1, y1, z1, uvScale = 1) {
  return xf(box(x1 - x0, y1 - y0, z1 - z0, uvScale), [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2]);
}

/** Square-section beam from point a to point b (arrays). */
export function beam(a, b, thick = 0.3, depth = thick, uvScale = 1) {
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va);
  const len = dir.length();
  const g = box(len, thick, depth, uvScale);
  _q.setFromUnitVectors(X, dir.normalize());
  _m.compose(va.add(vb).multiplyScalar(0.5), _q, _s.setScalar(1));
  return g.applyMatrix4(_m);
}

/** Cylinder helper with a translated base (y0 is the bottom). */
export function cyl(rt, rb, h, seg = 12, p = [0, 0, 0], r = [0, 0, 0]) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg);
  return xf(g, p, r);
}

/** Merge geometries (mixing indexed and non-indexed is handled). */
export function merge(geos) {
  const anyNonIndexed = geos.some((g) => !g.index);
  const list = geos.map((g) => {
    let out = anyNonIndexed && g.index ? g.toNonIndexed() : g;
    for (const name of Object.keys(out.attributes)) {
      if (!['position', 'normal', 'uv'].includes(name)) out.deleteAttribute(name);
    }
    out.clearGroups();
    return out;
  });
  return mergeGeometries(list, false);
}

/** Merge a list of geometries into a single shadowed mesh. */
export function mergedMesh(geos, material, { cast = true, receive = true } = {}) {
  const mesh = new THREE.Mesh(merge(geos), material);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

/** Build an InstancedMesh from an array of { p, r, s, color } placements. */
export function instanced(geo, material, items, { cast = true, receive = true } = {}) {
  const mesh = new THREE.InstancedMesh(geo, material, items.length);
  const col = new THREE.Color();
  items.forEach((it, i) => {
    _e.set(...(it.r || [0, 0, 0]));
    _q.setFromEuler(_e);
    const s = it.s ?? 1;
    typeof s === 'number' ? _s.setScalar(s) : _s.set(...s);
    _m.compose(_p.set(...it.p), _q, _s);
    mesh.setMatrixAt(i, _m);
    if (it.color !== undefined) mesh.setColorAt(i, col.set(it.color));
  });
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  mesh.computeBoundingSphere();
  return mesh;
}
