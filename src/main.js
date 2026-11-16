import * as THREE from 'three';
import { createSetup } from './core/setup.js';
import { buildShell } from './building/shell.js';
import { buildWindows } from './building/windows.js';
import { buildFurniture } from './props/furniture.js';
import { buildTableware } from './props/tableware.js';
import { buildBarrels } from './props/barrels.js';
import { buildHearth } from './props/hearth.js';
import { buildDecor } from './props/decor.js';

const ctx = createSetup(document.getElementById('app'));

buildShell(ctx);
buildWindows(ctx);
buildFurniture(ctx);
buildTableware(ctx);
buildBarrels(ctx);
buildHearth(ctx);
buildDecor(ctx);

// Temporary fill light until the lighting module exists.
ctx.scene.add(new THREE.HemisphereLight('#8090c0', '#302010', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 1.5);
sun.position.set(10, 20, 8);
ctx.scene.add(sun);

window.__tavernInfo = () => ({ calls: ctx.renderer.info.render.calls, tris: ctx.renderer.info.render.triangles, flames: ctx.flames.length });

const timer = new THREE.Timer();
timer.connect(document);
let frames = 0;
function frame(time) {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  for (const fn of ctx.updaters) fn(t, dt);
  ctx.renderer.render(ctx.scene, ctx.camera);
  if (++frames === 3) window.__tavernReady = true;
}
ctx.renderer.setAnimationLoop(frame);
