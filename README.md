# Isometric Tavern

A rainy-night medieval tavern rendered as a floating isometric diorama with
Three.js. Two walls and the roof are cut away to show the firelit common room,
the bar, the hearth and the loft. The scene is fully procedural: it uses only
geometry, canvas-generated textures and shaders, with no model or image files.

## Running it

```bash
npm install
```

```bash
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). For a production build:

```bash
npm run build
```

```bash
npm run preview
```

### Controls

- **Drag** to rotate. Rotation is clamped to ±18° azimuth and ±7° elevation
  around the true isometric angle, so the view always stays isometric.
- **Scroll / pinch** to zoom.
- When you stop interacting, the camera eases back and sways gently by a few
  degrees.

### URL options (handy for screenshots)

| Parameter | Effect |
|---|---|
| `?static` | Disables the idle sway |
| `?zoom=3` | Starts at that orthographic zoom |
| `?look=x,y,z` | Centres the view on a world position, e.g. `?zoom=4&look=-5.5,1,1.6` for the hearth |

## Tuning the look

Almost everything you'd want to adjust is in **`src/config.js`**:

| Key | What it controls |
|---|---|
| `PALETTE` | All named colours: night sky, fog, moonlight, fire, candles, wood, plaster, stone, cobbles |
| `CONFIG.exposure` | Overall brightness (ACES filmic tone mapping exposure) |
| `CONFIG.bloom` | `strength`, `radius`, `threshold`. Only HDR values above `threshold` bloom, so flames and candle tips glow while wood and stone stay crisp |
| `CONFIG.vignette` | Vignette `strength` and `softness` (set strength to 0 to disable it) |
| `CONFIG.lights` | Light colours and intensities: hearth, candles, chandelier, lanterns, street lamp, moon, sky fill, plus the shared falloff `decay` |
| `CONFIG.flicker` | `speed` (global multiplier), `fireAmount`, `fireJitter` (positional wobble), `candleAmount` |
| `CONFIG.rain` | `count`, `speed`, `length`, `width`, `wind`, `opacity` |
| `CONFIG.particles` | Number of embers and chimney smoke puffs |
| `CONFIG.glass` | Rain density on the windows and the warm/cold colours seen through them |
| `CONFIG.camera` | Framing, rotation limits, zoom limits, idle sway amplitude and speed |
| `CONFIG.maxPixelRatio`, `msaaSamples`, `msaaSamplesHiDPI`, `shadowMapSize` | Quality and performance |

`src/building/layout.js` holds the floor plan: wall sizes, window openings,
hearth, loft, stairs, bar, tables and lantern positions.

## Project structure

```
src/
  main.js                  bootstrap + render loop (each module registers an update(t, dt))
  config.js                palette and tunable parameters
  core/
    setup.js               renderer, orthographic iso camera, limited OrbitControls, sway, resize
    textures.js            canvas textures: wood, plaster, stone (+bump), rug, sign emblem, staves
    materials.js           shared, cached materials
    geo.js                 box/beam helpers with world-unit UVs, merging, instancing
  building/
    layout.js              dimensions and positions shared by all modules
    shell.js               diorama slab, plinth, stone/plaster walls, timber frame, loft, floors
    windows.js             window frames and panes (glass shader)
  props/
    furniture.js           tables, benches, stools, bar counter and shelves, stairs, railings, bed, chest
    tableware.js           instanced tankards, bottles, jugs, mugs, plates, bread, candles, tankard rack
    barrels.js             instanced barrels and hoops, kegs, sacks, crates
    hearth.js              fireplace, chimney, glowing coals, cauldron on a crane, firewood, rug, chairs
    decor.js               chandelier, wall lanterns, shield and swords, herbs, sausages, lute, broom, cat
  lighting/
    lights.js              shadowed fire and moon lights, flickering candle/lantern lights
    volumetrics.js         flame glows, moonlight shafts, smoke haze under the beams
  effects/
    fire.js                noise-driven flame billboards (hearth and all candles, one instanced mesh)
    glass.js               leaded diamond-pane shader with drops, rivulets and refraction
    rain.js                GPU-animated instanced rain streaks and ground splashes
    particles.js           rising embers and chimney smoke
  exterior/
    envmap.js              procedural night environment (PMREM) for wet reflections
    ground.js              instanced cobbles, reflective puddles with ripples and lamp reflections
    streetProps.js         lantern post, water trough, awning, hanging sign, window light spill
    skyline.js             fogged rooftops, castle tower, lit windows, clouds and moon glow
  post/
    composer.js            HDR render → bloom → vignette → OutputPass (ACES + sRGB)
```

## Performance notes

- Only two lights cast shadows: the hearth (point light) and the moon
  (directional). Candle, lantern and street lights do not cast shadows.
- Rain, cobbles, floor planks, bottles, tankards, barrels, stools and candle
  flames are instanced. Static timber and stone are merged per material.
- Rain, embers, smoke, flames, glass and puddle ripples are animated entirely in
  shaders. Each frame the CPU only updates uniforms and a few light intensities.
- Pixel ratio is capped at 2. On high-DPI screens the MSAA sample count drops to
  `msaaSamplesHiDPI`.
- If frame rate is tight, lower `rain.count`, `shadowMapSize.fire`,
  `msaaSamples` or `maxPixelRatio`, in that order.
