import * as THREE from 'three';
import { PALETTE } from '../config.js';
import { woodTexture, plasterTexture, stoneTexture, rugTexture, staveTexture } from './textures.js';

// Shared, cached materials. Textures use world-unit UVs (see geo.box).
let cache = null;

export function materials() {
  if (cache) return cache;
  const oakTex = woodTexture('#4a301c', { contrast: 1.3 });
  const plankTex = woodTexture(PALETTE.plank, { knots: 2 });
  const lightTex = woodTexture(PALETTE.lightWood, { knots: 1, contrast: 0.8 });
  const stone = stoneTexture(PALETTE.stone, { rows: 5 });
  const hearth = stoneTexture('#7a746a', { rows: 7 });
  const found = stoneTexture('#5a5650', { rows: 4 });

  const std = (o) => new THREE.MeshStandardMaterial(o);

  cache = {
    oak: std({ map: oakTex, color: '#a08a78', roughness: 0.85 }),
    plank: std({ map: plankTex, roughness: 0.8 }),
    lightWood: std({ map: lightTex, roughness: 0.75 }),
    plaster: std({ map: plasterTexture(), roughness: 0.95 }),
    stone: std({ map: stone.map, bumpMap: stone.bump, bumpScale: 2.5, roughness: 0.9 }),
    hearthStone: std({ map: hearth.map, bumpMap: hearth.bump, bumpScale: 2, roughness: 0.92 }),
    foundation: std({ map: found.map, bumpMap: found.bump, bumpScale: 3, roughness: 0.85 }),
    soot: std({ color: '#141210', roughness: 1 }),
    iron: std({ color: PALETTE.iron, roughness: 0.55, metalness: 0.7 }),
    pewter: std({ color: '#8d8f94', roughness: 0.4, metalness: 0.8 }),
    brass: std({ color: '#a8803a', roughness: 0.35, metalness: 0.9 }),
    steel: std({ color: '#b8bcc4', roughness: 0.25, metalness: 0.95 }),
    rug: std({ map: rugTexture(), roughness: 1 }),
    cloth: std({ color: PALETTE.cloth, roughness: 1 }),
    linen: std({ color: '#cfc4a8', roughness: 1 }),
    blanket: std({ color: '#4a5a3a', roughness: 1 }),
    sack: std({ color: '#9a8560', roughness: 1 }),
    staves: std({ map: staveTexture(), roughness: 0.75 }),
    wax: std({ color: PALETTE.wax, roughness: 0.6, emissive: '#3a2a10', emissiveIntensity: 0.2 }),
    clay: std({ color: '#8a5a3a', roughness: 0.7 }),
    bread: std({ color: '#b07838', roughness: 0.9 }),
    bottle: std({ color: '#ffffff', roughness: 0.15, metalness: 0.1 }),
    herb: std({ color: '#5a6a34', roughness: 1 }),
    sausage: std({ color: '#7a3424', roughness: 0.6 }),
    shield: std({ color: '#6a1c1a', roughness: 0.6 }),
    fur: std({ color: '#c07a3a', roughness: 1 }),
    lead: std({ color: '#1c1c20', roughness: 0.5, metalness: 0.6 }),
  };
  return cache;
}
