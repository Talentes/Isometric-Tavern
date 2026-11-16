import * as THREE from 'three';
import { merge, xf, boxFromTo } from '../core/geo.js';
import { rand, randRange } from '../core/textures.js';
import { NOISE_GLSL } from '../effects/fire.js';
import { CONFIG, PALETTE } from '../config.js';

// Background silhouettes are placed in "screen space" of the isometric view:
// (sx, sy) on screen plus a depth behind the diorama, then converted to world
// coordinates, so the composition stays put however the diorama is sized.
const target = new THREE.Vector3(...CONFIG.camera.target);
const R = new THREE.Vector3(1, 0, -1).normalize();
const U = new THREE.Vector3(-1, 2, -1).normalize();
const FWD = new THREE.Vector3(-1, -1, -1).normalize();
const toWorld = (sx, sy, depth) =>
  target.clone().addScaledVector(R, sx).addScaledVector(U, sy).addScaledVector(FWD, depth);

/** Paint a vertical fog fade into vertex colours (dark at roofline, fog at base). */
function fadeColors(geo, baseY, fadeH) {
  const pos = geo.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  const top = new THREE.Color(PALETTE.silhouette), fog = new THREE.Color(PALETTE.fog), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const k = THREE.MathUtils.smoothstep(pos.getY(i), baseY, baseY + fadeH);
    c.copy(fog).lerp(top, k);
    cols.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}

function gable(w, h, d) {
  // triangular prism roof along local Z, base at y = 0
  const s = new THREE.Shape();
  s.moveTo(-w / 2 - 0.2, 0);
  s.lineTo(w / 2 + 0.2, 0);
  s.lineTo(0, h);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + 0.4, bevelEnabled: false });
  return g.translate(0, 0, -(d + 0.4) / 2);
}

/** Neighbouring rooftops, a distant castle tower, haze, clouds and moon glow. */
export function buildSkyline(ctx) {
  const { scene } = ctx;
  scene.fog = new THREE.Fog(PALETTE.fog, 100, 200);

  const houses = [];
  const windows = [];
  const addWindows = (cx, cz, yaw, w, y0, y1, faceOff, count) => {
    for (let i = 0; i < count; i++) {
      if (rand() > 0.45) continue;
      const u = randRange(-w / 2 + 0.6, w / 2 - 0.6), v = randRange(y0 + 1, y1 - 0.8);
      const off = new THREE.Vector3(u, 0, faceOff).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      windows.push({ p: [cx + off.x, v, cz + off.z], yaw, warm: randRange(0.6, 1.6) });
    }
  };

  // Two rows of houses: a nearer row at the sides, a farther row across the back.
  const rows = [
    { depth: 48, syBase: [-3, 1], step: [3.0, 4.2], height: [3.5, 6] },
    { depth: 72, syBase: [2, 5], step: [3.4, 4.8], height: [3.5, 6.5] },
  ];
  for (const row of rows) {
    for (let sx = -34; sx < 34; sx += randRange(...row.step)) {
      if (row.depth < 60 && (Math.abs(sx) < 12 || (sx > 13 && sx < 22))) continue; // keep the tower clear
      const base = toWorld(sx, randRange(...row.syBase), row.depth);
      const w = randRange(3, 5.2), d = randRange(3, 4.5), h = randRange(...row.height);
      const yaw = Math.PI / 4 + (rand() < 0.5 ? 0 : Math.PI / 2) + randRange(-0.08, 0.08);
      const parts = [
        boxFromTo(-w / 2, -6, -d / 2, w / 2, h, d / 2),
        xf(gable(w, randRange(1.8, 3.2), d), [0, h, 0]),
      ];
      if (rand() < 0.7) parts.push(boxFromTo(w * 0.2, h, -0.3, w * 0.2 + 0.5, h + 2.6, 0.3));
      const g = merge(parts);
      xf(g, [base.x, base.y, base.z], [0, yaw, 0]);
      fadeColors(g, base.y - 1, 5.5);
      houses.push(g);
      addWindows(base.x, base.z, yaw, w, base.y, base.y + h, d / 2 + 0.05, 4);
      addWindows(base.x, base.z, yaw + Math.PI / 2, d, base.y, base.y + h, w / 2 + 0.05, 3);
    }
  }

  // Castle tower on a rise, far away on the right
  const tb = toWorld(17.5, 3.2, 80);
  const tower = [
    new THREE.CylinderGeometry(2.4, 2.8, 16, 14).translate(0, 8 - 6, 0),
    new THREE.CylinderGeometry(2.9, 2.6, 1.2, 14).translate(0, 10.6, 0),
    new THREE.ConeGeometry(3.1, 5, 14).translate(0, 13.7, 0),
    new THREE.CylinderGeometry(1.2, 1.4, 9, 10).translate(4, 1, 1),
    new THREE.ConeGeometry(1.6, 3, 10).translate(4, 6.9, 1),
    boxFromTo(-9, -6, -3, 4, 3.5, 3),
  ];
  for (let i = 0; i < 6; i++) tower.push(boxFromTo(-9 + i * 2.2, 3.5, -3, -8 + i * 2.2, 4.3, 3));
  const tg = merge(tower).toNonIndexed();
  xf(tg, [tb.x, tb.y, tb.z], [0, Math.PI / 4, 0]);
  fadeColors(tg, tb.y - 2, 6);
  houses.push(tg);
  windows.push({ p: [tb.x + 1.9, tb.y + 7.5, tb.z + 1.9], yaw: Math.PI / 4, warm: 1.8 });
  windows.push({ p: [tb.x + 1.9, tb.y + 3.5, tb.z + 1.9], yaw: Math.PI / 4, warm: 1.2 });

  const silMat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: true });
  const colors = mergeColors(houses);
  const sil = new THREE.Mesh(merge(houses), silMat);
  sil.geometry.setAttribute('color', colors);
  scene.add(sil);

  // Glowing windows (instanced quads, HDR so the nearest ones bloom faintly)
  const winGeo = new THREE.PlaneGeometry(0.45, 0.65);
  const winMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.windowGlow).multiplyScalar(1.1), fog: true });
  const winMesh = new THREE.InstancedMesh(winGeo, winMat, windows.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
  windows.forEach((w, i) => {
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), w.yaw);
    m4.compose(new THREE.Vector3(...w.p), q, new THREE.Vector3(1, 1, 1));
    winMesh.setMatrixAt(i, m4);
    winMesh.setColorAt(i, c.setScalar(w.warm));
  });
  scene.add(winMesh);

  buildSky(ctx);
}

function mergeColors(geos) {
  const arrays = geos.map((g) => g.attributes.color.array);
  const out = new Float32Array(arrays.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of arrays) { out.set(a, o); o += a.length; }
  return new THREE.BufferAttribute(out, 3);
}

/** Haze gradient backdrop, drifting cloud layer and the moon glowing through it. */
function buildSky(ctx) {
  const facing = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(R, U, FWD.clone().negate()));
  const plane = (w, h, sx, sy, depth, mat) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    mesh.position.copy(toWorld(sx, sy, depth));
    mesh.quaternion.copy(facing);
    mesh.frustumCulled = false;
    ctx.scene.add(mesh);
    return mesh;
  };
  const moonScreen = new THREE.Vector2(-12.5, 11.5 - 4); // relative to the plane centre
  const skyMat = new THREE.ShaderMaterial({
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uNight: { value: new THREE.Color(PALETTE.night) },
      uFog: { value: new THREE.Color(PALETTE.fog) },
      uMoon: { value: new THREE.Color(PALETTE.moonGlow) },
      uMoonPos: { value: moonScreen },
    },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uNight, uFog, uMoon; uniform vec2 uMoonPos; varying vec2 vP;
      ${NOISE_GLSL}
      void main(){
        vec3 col = mix(uFog, uNight, smoothstep(-6.0, 14.0, vP.y));
        float dm = length(vP - uMoonPos);
        float glow = exp(-dm * 0.25) * 0.35 + exp(-dm * 1.1) * 0.45;
        float disc = smoothstep(0.8, 0.7, dm);
        vec2 cp = vP * vec2(0.09, 0.2) + vec2(uTime * 0.012, 0.0);
        float cl = fbm(cp) * 0.65 + fbm(cp * 2.3 + 4.0) * 0.35;
        float cover = smoothstep(0.38, 0.68, cl) * smoothstep(-4.0, 6.0, vP.y);
        vec3 moon = uMoon * (glow + disc * 0.9);
        col += moon * (1.0 - cover * 0.85);
        vec3 cloudCol = mix(vec3(0.05, 0.07, 0.13), uMoon * 0.45, exp(-dm * 0.18));
        col = mix(col, cloudCol, cover * 0.75);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  plane(150, 70, 0, 4, 140, skyMat);
  skyMat.fog = false;
  ctx.updaters.push((t) => (skyMat.uniforms.uTime.value = t));
}
