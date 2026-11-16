import * as THREE from 'three';
import { PALETTE } from '../config.js';

// Procedural canvas textures. Everything is drawn at load time; no images.

let seed = 1337;
export function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
export const randRange = (a, b) => a + (b - a) * rand();

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { srgb = true, repeat = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(f);
  return `#${c.getHexString()}`;
}

function speckle(ctx, w, h, n, alpha, light = '255,255,255', dark = '0,0,0') {
  for (let i = 0; i < n; i++) {
    const s = rand() < 0.5 ? light : dark;
    ctx.fillStyle = `rgba(${s},${rand() * alpha})`;
    const r = randRange(0.5, 2.5);
    ctx.fillRect(rand() * w, rand() * h, r, r);
  }
}

/** Wood with grain running along U (horizontal). */
export function woodTexture(base = PALETTE.oak, { size = 256, knots = 3, contrast = 1 } = {}) {
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 70; i++) {
    const y0 = rand() * size;
    const amp = randRange(1, 5);
    const freq = randRange(0.005, 0.03);
    const ph = rand() * 10;
    ctx.strokeStyle = rand() < 0.6
      ? `rgba(0,0,0,${0.12 * contrast * rand() + 0.04})`
      : `rgba(255,220,170,${0.07 * contrast * rand()})`;
    ctx.lineWidth = randRange(0.5, 2.2);
    ctx.beginPath();
    for (let x = -2; x <= size + 2; x += 4) {
      const y = y0 + Math.sin(x * freq + ph) * amp;
      x < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  for (let k = 0; k < knots; k++) {
    const x = rand() * size, y = rand() * size, r = randRange(3, 7);
    for (let j = 4; j > 0; j--) {
      ctx.strokeStyle = `rgba(20,10,5,${0.25})`;
      ctx.beginPath();
      ctx.ellipse(x, y, r * j * 0.6 + 2, r * j * 0.25 + 1, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  speckle(ctx, size, size, 900, 0.08);
  return toTexture(c);
}

/** Rough plaster with darker blotches and soot near the top. */
export function plasterTexture() {
  const size = 256;
  const [c, ctx] = canvas(size, size);
  ctx.fillStyle = PALETTE.plaster;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 160; i++) {
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const dark = rand() < 0.6;
    g.addColorStop(0, dark ? 'rgba(80,60,40,0.10)' : 'rgba(255,250,235,0.10)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.translate(rand() * size, rand() * size);
    ctx.scale(randRange(8, 40), randRange(6, 30));
    ctx.fillStyle = g;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.restore();
  }
  speckle(ctx, size, size, 2500, 0.12);
  return toTexture(c);
}

/** Irregular stone courses with mortar. Returns { map, bump }. */
export function stoneTexture(base = PALETTE.stone, { size = 256, rows = 6 } = {}) {
  const [c, ctx] = canvas(size, size);
  const [b, btx] = canvas(size, size);
  ctx.fillStyle = PALETTE.mortar;
  ctx.fillRect(0, 0, size, size);
  btx.fillStyle = '#000';
  btx.fillRect(0, 0, size, size);
  const rh = size / rows;
  for (let r = 0; r < rows; r++) {
    let x = -rand() * rh;
    while (x < size) {
      const w = randRange(rh * 0.9, rh * 1.9);
      const pad = 2.5;
      const tone = randRange(0.75, 1.2);
      const drawStone = (dx) => {
        ctx.fillStyle = shade(base, tone);
        roundRect(ctx, x + dx + pad, r * rh + pad, w - pad * 2, rh - pad * 2, 5);
        ctx.fill();
        const gB = btx.createLinearGradient(0, r * rh, 0, r * rh + rh);
        gB.addColorStop(0, '#bbb');
        gB.addColorStop(0.5, '#fff');
        gB.addColorStop(1, '#999');
        btx.fillStyle = gB;
        roundRect(btx, x + dx + pad, r * rh + pad, w - pad * 2, rh - pad * 2, 5);
        btx.fill();
      };
      drawStone(0);
      if (x + w > size) drawStone(-size);
      x += w;
    }
  }
  speckle(ctx, size, size, 3000, 0.18);
  speckle(btx, size, size, 1500, 0.25);
  return { map: toTexture(c), bump: toTexture(b, { srgb: false }) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Woven rug with border and a simple diamond motif; worn in the middle. */
export function rugTexture() {
  const w = 256, h = 160;
  const [c, ctx] = canvas(w, h);
  ctx.fillStyle = PALETTE.rug;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = PALETTE.rugTrim;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);
  ctx.fillStyle = '#3a1a16';
  for (let i = 0; i < 5; i++) {
    const cx = 48 + i * 40, cy = h / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 26); ctx.lineTo(cx + 16, cy); ctx.lineTo(cx, cy + 26); ctx.lineTo(cx - 16, cy);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PALETTE.rugTrim;
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2);
  g.addColorStop(0, 'rgba(200,170,130,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 2) {
    ctx.fillStyle = `rgba(0,0,0,${0.05 + rand() * 0.06})`;
    ctx.fillRect(0, y, w, 1);
  }
  speckle(ctx, w, h, 1500, 0.15);
  return toTexture(c, { repeat: false });
}

/** Tavern sign emblem: a foaming tankard and wheat on a green field. */
export function signTexture() {
  const s = 256;
  const [c, ctx] = canvas(s, s);
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(0, 0, s, s);
  ctx.fillStyle = '#23402e';
  roundRect(ctx, 14, 14, s - 28, s - 28, 18);
  ctx.fill();
  ctx.strokeStyle = '#c9a04a';
  ctx.lineWidth = 6;
  ctx.stroke();
  // wheat ears
  ctx.strokeStyle = '#d8b45a';
  ctx.lineWidth = 4;
  for (const dir of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(128 + dir * 20, 210);
    ctx.quadraticCurveTo(128 + dir * 80, 150, 128 + dir * 70, 60);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(128 + dir * (72 + i * 0.5), 70 + i * 18, 6, 11, dir * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = '#d8b45a';
      ctx.fill();
    }
  }
  // tankard
  ctx.fillStyle = '#b07a3c';
  roundRect(ctx, 92, 96, 66, 96, 8);
  ctx.fill();
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 5;
  ctx.strokeRect(92, 120, 66, 0.1);
  ctx.strokeRect(92, 168, 66, 0.1);
  ctx.beginPath();
  ctx.arc(166, 140, 22, -Math.PI / 2, Math.PI / 2);
  ctx.lineWidth = 9;
  ctx.strokeStyle = '#b07a3c';
  ctx.stroke();
  ctx.fillStyle = '#f2ead2';
  for (const [x, y, r] of [[100, 94, 14], [122, 86, 18], [146, 92, 14], [158, 100, 9]]) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  speckle(ctx, s, s, 2500, 0.25);
  return toTexture(c, { repeat: false });
}

/** Barrel staves: vertical boards (along V) with dark gaps. */
export function staveTexture() {
  const [c, ctx] = canvas(256, 128);
  ctx.fillStyle = PALETTE.lightWood;
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = shade(PALETTE.lightWood, randRange(0.7, 1.1));
    ctx.fillRect(i * 16 + 1, 0, 14, 128);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(i * 16, 0, 1.5, 128);
  }
  speckle(ctx, 256, 128, 1200, 0.15);
  return toTexture(c);
}

/** Soft radial sprite used for glows, smoke and embers. */
export function softSprite(size = 64) {
  const [c, ctx] = canvas(size, size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return toTexture(c, { srgb: false, repeat: false });
}
