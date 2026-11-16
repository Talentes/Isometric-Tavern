import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { CONFIG } from '../config.js';

// Linear HDR render (half-float, MSAA) → restrained bloom on values above the
// threshold (flames, candle tips) → subtle vignette → OutputPass, which applies
// ACES filmic tone mapping and the sRGB transfer exactly once.

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uStrength: { value: CONFIG.vignette.strength },
    uSoftness: { value: CONFIG.vignette.softness },
    uAspect: { value: 1 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uStrength, uSoftness, uAspect;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
      float v = smoothstep(0.85, 0.85 - uSoftness, length(p) / max(uAspect, 1.0) * 1.35);
      c.rgb *= mix(1.0 - uStrength, 1.0, v);
      gl_FragColor = c;
    }`,
};

export function createComposer(ctx) {
  const { renderer, scene, camera } = ctx;
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: renderer.getPixelRatio() >= 2 ? CONFIG.msaaSamplesHiDPI : CONFIG.msaaSamples,
  });
  const composer = new EffectComposer(renderer, target);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(window.innerWidth, window.innerHeight);

  composer.addPass(new RenderPass(scene, camera));
  const b = CONFIG.bloom;
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), b.strength, b.radius, b.threshold);
  composer.addPass(bloom);
  const vignette = new ShaderPass(VignetteShader);
  composer.addPass(vignette);
  composer.addPass(new OutputPass());

  const onResize = (w, h, pr) => {
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    vignette.uniforms.uAspect.value = w / h;
  };
  onResize(window.innerWidth, window.innerHeight, renderer.getPixelRatio());
  ctx.resizeHandlers.push(onResize);
  return { composer, bloom, vignette };
}
