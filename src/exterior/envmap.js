import * as THREE from 'three';
import { PALETTE } from '../config.js';

/**
 * Tiny procedural environment for wet surfaces: a night-sky gradient, a moon
 * glow and warm patches where the tavern interior and lanterns would be seen
 * in reflections. Pre-filtered with PMREM so puddles and cobbles pick it up.
 */
export function createNightEnvironment(renderer) {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(50, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#03050c') },
        uHorizon: { value: new THREE.Color('#1a2644') },
        uMoon: { value: new THREE.Color(PALETTE.moonGlow) },
        uMoonDir: { value: new THREE.Vector3(-0.61, 0.78, -0.09).normalize() },
      },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 uTop, uHorizon, uMoon, uMoonDir; varying vec3 vDir;
        void main(){
          float h = clamp(vDir.y, -1.0, 1.0);
          vec3 c = mix(uHorizon * 1.3, uTop, smoothstep(0.1, 0.95, h));
          c = mix(c, uHorizon * 0.4, smoothstep(0.0, -0.4, h));
          float m = max(dot(normalize(vDir), uMoonDir), 0.0);
          c += uMoon * (pow(m, 60.0) * 2.0 + pow(m, 6.0) * 0.12);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  scene.add(sky);

  // Warm glowing panels: the open tavern behind the street (seen in puddles)
  const warm = (w, h, pos, color, k) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), side: THREE.DoubleSide }),
    );
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  warm(26, 10, [-24, 6, -24], PALETTE.windowGlow, 0.9);
  warm(10, 6, [-30, 12, -8], PALETTE.fireCore, 0.7);
  warm(4, 4, [20, 10, 20], PALETTE.candle, 2.0);
  warm(3, 3, [-10, 9, 30], PALETTE.candle, 1.2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.02);
  pmrem.dispose();
  return rt.texture;
}
