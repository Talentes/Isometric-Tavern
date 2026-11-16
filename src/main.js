import * as THREE from 'three';
import { createSetup } from './core/setup.js';
import { buildShell } from './building/shell.js';
import { buildWindows } from './building/windows.js';

const ctx = createSetup(document.getElementById('app'));

buildShell(ctx);
buildWindows(ctx);

// Temporary fill light until the lighting module exists.
ctx.scene.add(new THREE.HemisphereLight('#8090c0', '#302010', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 1.5);
sun.position.set(10, 20, 8);
ctx.scene.add(sun);

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
