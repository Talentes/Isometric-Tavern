import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, PALETTE, IS_STATIC } from '../config.js';

const DEG = Math.PI / 180;
const ISO_AZIMUTH = 45 * DEG;
// True isometric: the view direction is (1,1,1), elevation atan(1/sqrt2).
const ISO_POLAR = Math.PI / 2 - Math.atan(1 / Math.SQRT2);

/** Creates renderer, scene, orthographic camera and constrained controls. */
export function createSetup(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = CONFIG.exposure;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.night);

  const cam = CONFIG.camera;
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
  const target = new THREE.Vector3(...cam.target);
  const offset = new THREE.Vector3().setFromSphericalCoords(cam.distance, ISO_POLAR, ISO_AZIMUTH);
  camera.position.copy(target).add(offset);
  camera.lookAt(target);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enablePan = false;
  controls.rotateSpeed = 0.4;
  controls.zoomSpeed = 0.8;
  controls.minZoom = cam.minZoom;
  controls.maxZoom = cam.maxZoom;
  controls.minAzimuthAngle = ISO_AZIMUTH - cam.azimuthRange * DEG;
  controls.maxAzimuthAngle = ISO_AZIMUTH + cam.azimuthRange * DEG;
  controls.minPolarAngle = ISO_POLAR - cam.polarRange * DEG;
  controls.maxPolarAngle = ISO_POLAR + cam.polarRange * DEG;
  controls.update();

  // Idle sway: after the user stops interacting, ease back towards the
  // isometric angle and drift gently by a few degrees.
  let lastInteraction = -Infinity;
  let clockTime = 0;
  controls.addEventListener('start', () => (lastInteraction = Infinity));
  controls.addEventListener('end', () => (lastInteraction = clockTime));
  const spherical = new THREE.Spherical();
  const tmp = new THREE.Vector3();

  function updateCamera(t, dt) {
    clockTime = t;
    if (!IS_STATIC && t - lastInteraction > cam.idleDelay) {
      tmp.copy(camera.position).sub(controls.target);
      spherical.setFromVector3(tmp);
      const sway = Math.sin(t * cam.swaySpeed) * cam.swayDegrees * DEG;
      const k = 1 - Math.exp(-dt * 0.6);
      spherical.theta += (ISO_AZIMUTH + sway - spherical.theta) * k;
      spherical.phi += (ISO_POLAR + Math.sin(t * cam.swaySpeed * 0.7) * 0.6 * DEG - spherical.phi) * k;
      tmp.setFromSpherical(spherical);
      camera.position.copy(controls.target).add(tmp);
    }
    controls.update();
  }

  const resizeHandlers = [];
  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    const halfH = Math.max(cam.viewHeight / 2, cam.minViewWidth / 2 / aspect);
    camera.left = -halfH * aspect;
    camera.right = halfH * aspect;
    camera.top = halfH;
    camera.bottom = -halfH;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, CONFIG.maxPixelRatio));
    renderer.setSize(w, h);
    for (const fn of resizeHandlers) fn(w, h, renderer.getPixelRatio());
  }
  window.addEventListener('resize', resize);
  resize();

  return {
    renderer,
    scene,
    camera,
    controls,
    updaters: [updateCamera],
    resizeHandlers,
    flames: [], // candle/lantern flame descriptors: { pos, size, phase }
    lights: {}, // named lights, filled by the lighting module
    anchors: {}, // named positions shared between modules
    resize,
  };
}
