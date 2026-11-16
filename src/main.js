import * as THREE from 'three';
import { createSetup } from './core/setup.js';
import { buildShell } from './building/shell.js';
import { buildWindows } from './building/windows.js';
import { buildFurniture } from './props/furniture.js';
import { buildTableware } from './props/tableware.js';
import { buildBarrels } from './props/barrels.js';
import { buildHearth } from './props/hearth.js';
import { buildDecor } from './props/decor.js';
import { buildLights } from './lighting/lights.js';
import { buildFire } from './effects/fire.js';
import { createNightEnvironment } from './exterior/envmap.js';
import { buildGround } from './exterior/ground.js';
import { buildStreetProps } from './exterior/streetProps.js';
import { buildSkyline } from './exterior/skyline.js';
import { buildRain } from './effects/rain.js';
import { buildParticles } from './effects/particles.js';
import { buildVolumetrics } from './lighting/volumetrics.js';
import { createComposer } from './post/composer.js';

const ctx = createSetup(document.getElementById('app'));

buildShell(ctx);
buildWindows(ctx);
buildFurniture(ctx);
buildTableware(ctx);
buildBarrels(ctx);
buildHearth(ctx);
buildDecor(ctx);

buildLights(ctx);
const envMap = createNightEnvironment(ctx.renderer);
buildGround(ctx, envMap);
buildStreetProps(ctx, envMap);
buildSkyline(ctx);
buildRain(ctx);
buildFire(ctx);
buildParticles(ctx);
buildVolumetrics(ctx);

const { composer } = createComposer(ctx);
ctx.renderer.info.autoReset = false;

window.__tavern = ctx;
window.__tavernInfo = () => ({ calls: ctx.renderer.info.render.calls, tris: ctx.renderer.info.render.triangles, flames: ctx.flames.length });

const timer = new THREE.Timer();
timer.connect(document);
let frames = 0;
function frame(time) {
  timer.update(time);
  const dt = Math.min(timer.getDelta(), 0.1);
  const t = timer.getElapsed();
  for (const fn of ctx.updaters) fn(t, dt);
  ctx.renderer.info.reset();
  composer.render(dt);
  if (++frames === 3) window.__tavernReady = true;
}
ctx.renderer.setAnimationLoop(frame);
