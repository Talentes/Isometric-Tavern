// Central place for the look of the scene: palette, light colours and
// intensities, effect strengths and quality switches.

export const PALETTE = {
  night: '#070b1a',
  fog: '#0d1426',
  moon: '#8fa8d8',
  moonGlow: '#c9d6f0',
  fireCore: '#ff8a3d',
  fireHigh: '#ffb366',
  fireLow: '#d9541c',
  candle: '#ffc070',
  windowGlow: '#ffa24a',
  oak: '#3b2616',
  plank: '#6b4a2e',
  lightWood: '#8a6440',
  plaster: '#cdbb98',
  stone: '#6e6a63',
  mortar: '#3a3632',
  cobble: '#3c3f47',
  puddle: '#1a2030',
  iron: '#2a2a2e',
  rug: '#7a2a22',
  rugTrim: '#c09040',
  silhouette: '#121828',
  wax: '#e8dcc0',
  cloth: '#8a7a5a',
};

export const CONFIG = {
  // Rendering
  maxPixelRatio: 2,
  msaaSamples: 4,
  exposure: 1.0,
  shadowMapSize: { fire: 1024, moon: 2048 },

  // Camera / controls
  camera: {
    viewHeight: 27, // world units visible vertically at zoom 1
    minViewWidth: 34, // keep the whole diorama visible on narrow screens
    target: [0, 1.5, 0],
    distance: 80,
    azimuthRange: 18, // degrees either side of the isometric 45°
    polarRange: 7, // degrees either side of the isometric elevation
    minZoom: 0.75,
    maxZoom: 2.6,
    swayDegrees: 3.5, // idle auto-rotate sway amplitude
    swaySpeed: 0.12,
    idleDelay: 4, // seconds after interaction before sway resumes
  },

  // Lights
  lights: {
    hemiSky: '#2a3a66',
    hemiGround: '#1a1208',
    hemiIntensity: 0.45,
    moonColor: PALETTE.moon,
    moonIntensity: 1.6,
    fireColor: PALETTE.fireCore,
    fireIntensity: 60,
    fireDistance: 22,
    candleColor: PALETTE.candle,
    candleIntensity: 5,
    chandelierIntensity: 24,
    lanternIntensity: 11,
    streetLanternIntensity: 22,
  },

  flicker: {
    speed: 1.0, // global multiplier for every flicker
    fireAmount: 0.28, // relative intensity variation of the hearth
    fireJitter: 0.06, // positional wobble of the fire light (world units)
    candleAmount: 0.15,
  },

  // Post-processing
  bloom: {
    strength: 0.55,
    radius: 0.35,
    threshold: 1.0, // only HDR emissives (flames, candle tips) bloom
  },
  vignette: { strength: 0.35, softness: 0.55 },

  // Weather
  rain: {
    count: 5000,
    speed: 22,
    length: 0.55,
    width: 0.018,
    wind: 0.18,
    opacity: 0.32,
  },

  particles: { embers: 90, smoke: 46 },

  // Glass shader
  glass: {
    dropDensity: 1.0,
    warmColor: PALETTE.windowGlow,
    coldColor: '#6f88bd',
  },
};

export const IS_STATIC = new URLSearchParams(location.search).has('static');
