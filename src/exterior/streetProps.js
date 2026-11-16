import * as THREE from 'three';
import { materials } from '../core/materials.js';
import { boxFromTo, beam, cyl, xf, mergedMesh } from '../core/geo.js';
import { signTexture, softSprite } from '../core/textures.js';
import { lanternParts, lanternGlass } from '../props/decor.js';
import { flicker } from '../lighting/lights.js';
import { CONFIG, PALETTE } from '../config.js';
import { X0, WALL_T, GROUND_Y, WINDOWS } from '../building/layout.js';

/** Street lantern post, water trough, awning, hanging tavern sign and window spill. */
export function buildStreetProps(ctx, envMap) {
  const m = materials();
  const P = { iron: [], oak: [], hearthStone: [], plank: [] };
  const glass = [];
  const g = GROUND_Y;
  const wallOut = X0 - WALL_T;

  // --- Lantern post -----------------------------------------------------
  const [px, pz] = [8.3, 7.4];
  P.hearthStone.push(boxFromTo(px - 0.3, g, pz - 0.3, px + 0.3, g + 0.45, pz + 0.3));
  P.iron.push(cyl(0.07, 0.09, 4.2, 8, [px, g + 2.5, pz]));
  P.iron.push(cyl(0.12, 0.12, 0.12, 8, [px, g + 4.6, pz]));
  P.iron.push(beam([px, g + 4.35, pz], [px - 1.0, g + 4.35, pz - 1.0], 0.06, 0.06));
  P.iron.push(beam([px, g + 3.7, pz], [px - 0.6, g + 4.33, pz - 0.6], 0.035, 0.035));
  const lx = px - 0.95, lz = pz - 0.95, ly = g + 3.55;
  P.iron.push(beam([lx, g + 4.35, lz], [lx, ly + 0.55, lz], 0.02, 0.02));
  lanternParts([lx, ly, lz], 1.25, P.iron, glass, ctx.flames);
  const post = new THREE.PointLight(CONFIG.lights.candleColor, CONFIG.lights.streetLanternIntensity, 16, CONFIG.lights.decay);
  post.position.set(lx, ly + 0.35, lz);
  ctx.scene.add(post);
  ctx.anchors.streetLamp = post.position.clone();

  // --- Stone water trough -------------------------------------------------
  const tx = -9.9, tz = 7.4, tw = 1.25, td = 0.42, th = 0.8;
  P.hearthStone.push(boxFromTo(tx - tw, g, tz - td, tx + tw, g + 0.15, tz + td, 0.7));
  P.hearthStone.push(boxFromTo(tx - tw, g, tz - td, tx + tw, g + th, tz - td + 0.12, 0.7));
  P.hearthStone.push(boxFromTo(tx - tw, g, tz + td - 0.12, tx + tw, g + th, tz + td, 0.7));
  P.hearthStone.push(boxFromTo(tx - tw, g, tz - td, tx - tw + 0.12, g + th, tz + td, 0.7));
  P.hearthStone.push(boxFromTo(tx + tw - 0.12, g, tz - td, tx + tw, g + th, tz + td, 0.7));
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(tw * 2 - 0.24, td * 2 - 0.24),
    new THREE.MeshPhysicalMaterial({ color: '#0a1220', roughness: 0.05, ior: 1.8, specularColor: new THREE.Color(2, 2, 2), envMap, envMapIntensity: 1.2 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(tx, g + th - 0.12, tz);
  ctx.scene.add(water);
  const waterRipples = new THREE.Mesh(water.geometry, ctx.puddleOverlay);
  waterRipples.rotation.x = -Math.PI / 2;
  waterRipples.position.set(tx, g + th - 0.115, tz);
  ctx.scene.add(waterRipples);

  // --- Awning over the rain barrel ------------------------------------------
  const az0 = 3.2, az1 = 5.35;
  for (let i = 0; i < 6; i++) {
    const z0 = az0 + i * ((az1 - az0) / 6);
    P.plank.push(xf(boxFromTo(-1.7, -0.03, z0 + 0.01, 0, 0.03, z0 + (az1 - az0) / 6 - 0.01, 0.6), [wallOut, 3.35, 0], [0, 0, 0.32]));
  }
  for (const z of [az0 + 0.1, az1 - 0.1]) P.oak.push(beam([wallOut, 2.4, z], [wallOut - 1.45, 2.9, z], 0.1, 0.1));

  // --- Hanging tavern sign on an iron bracket --------------------------------
  const sz = 5.05, by = 4.75, bx0 = wallOut, bx1 = wallOut - 2.2;
  P.iron.push(beam([bx0, by, sz], [bx1, by, sz], 0.07, 0.07));
  P.iron.push(beam([bx0, by - 0.9, sz], [bx0 - 1.3, by - 0.03, sz], 0.05, 0.05));
  P.iron.push(xf(new THREE.TorusGeometry(0.22, 0.025, 5, 14, Math.PI * 1.5), [bx0 - 0.95, by - 0.32, sz]));
  P.iron.push(xf(new THREE.SphereGeometry(0.06, 8, 6), [bx1, by, sz]));
  const sign = new THREE.Group();
  sign.position.set(bx0 - 1.15, by - 0.04, sz);
  const signTex = signTexture();
  const faceMat = new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.7 });
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.0, 0.07), [m.oak, m.oak, m.oak, m.oak, faceMat, faceMat]);
  board.position.y = -0.82;
  board.castShadow = true;
  const rings = new THREE.Mesh(
    xf(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 4), [0, -0.17, 0]),
    m.iron,
  );
  const r2 = rings.clone();
  rings.position.x = -0.5;
  r2.position.x = 0.5;
  sign.add(board, rings, r2);
  ctx.scene.add(sign);

  for (const [k, list] of Object.entries(P)) if (list.length) ctx.scene.add(mergedMesh(list, m[k]));
  ctx.scene.add(mergedMesh(glass, lanternGlass(), { cast: false, receive: false }));

  // --- Warm light pooling on the cobbles under the ground-floor window -------
  const win = WINDOWS[0];
  const pool = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, (win.u1 - win.u0) * 2.2),
    new THREE.MeshBasicMaterial({
      map: softSprite(), color: new THREE.Color(PALETTE.windowGlow).multiplyScalar(0.35),
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
  pool.rotation.x = -Math.PI / 2;
  pool.position.set(wallOut - 1.3, g + 0.03, (win.u0 + win.u1) / 2);
  ctx.scene.add(pool);

  const overlay = ctx.puddleOverlay;
  overlay.uniforms.uLightPos.value.copy(post.position);
  ctx.updaters.push((t) => {
    const k = 1 + 0.12 * flicker(t, 21.7, 0.9);
    post.intensity = CONFIG.lights.streetLanternIntensity * k;
    overlay.uniforms.uLightLevel.value = k;
    const lvl = ctx.lights.fireLevel ?? 1;
    pool.material.opacity = 0.75 + 0.25 * (lvl - 1) / CONFIG.flicker.fireAmount;
    sign.rotation.x = Math.sin(t * 0.9) * 0.05 + Math.sin(t * 2.3) * 0.015;
  });
}
