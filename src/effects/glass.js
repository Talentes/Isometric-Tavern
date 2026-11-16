import * as THREE from 'three';

// Placeholder leaded-glass material; replaced by the rain shader in stage 5.
export function createGlassMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `varying vec2 vUv; void main(){ gl_FragColor = vec4(0.25,0.32,0.5,0.6); }`,
  });
}
