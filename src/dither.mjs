// Ordered dither, two ways.
//  1. `dither` element: a vector field of Bayer cells (squares, dots, lines, plus signs) whose ink coverage
//     follows a ramp (linear, radial, noise or flat). Stays SVG, scales cleanly, takes the crayon filter.
//  2. `screen`: a raster pass over the finished picture. The image is averaged into cells, each cell is
//     dithered to the nearest ink in a small palette with a Bayer threshold, then scaled back up with hard edges.
//     It turns any scene into a 1-bit / riso-screen print (spec.screen, applied by export).
import sharp from 'sharp';

const f = (n) => Math.round(n * 10) / 10;

// Bayer index matrix of size n (2, 4 or 8), values 0..n²-1.
export function bayer(n = 4) {
  let m = [[0]];
  while (m.length < n) {
    const s = m.length, out = Array.from({ length: s * 2 }, () => new Array(s * 2));
    for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
      const v = m[y][x] * 4;
      out[y][x] = v; out[y][x + s] = v + 2; out[y + s][x] = v + 3; out[y + s][x + s] = v + 1;
    }
    m = out;
  }
  return m;
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Ink coverage (0..1) at a point for the element's ramp.
function rampAt(e, x, y, noise, t) {
  const from = e.from ?? 1, to = e.to ?? 0;
  let u;
  if (e.mode === 'flat') u = 0;
  else if (e.mode === 'radial') {
    const cx = e.cx ?? (e.r ? e.x : e.x + e.w / 2), cy = e.cy ?? (e.r ? e.y : e.y + e.h / 2);
    const R = e.radius ?? (e.r ?? Math.hypot(e.w, e.h) / 2);
    u = Math.hypot(x - cx, y - cy) / R;
  } else if (e.mode === 'noise') {
    const s = e.scale ?? 0.006;
    u = noise(x * s + Math.cos(t * Math.PI * 2) * 0.3, y * s + Math.sin(t * Math.PI * 2) * 0.3) / 1.4 + 0.5; // ~0..1
  } else {
    // linear, `angle` in degrees: 90 = top (from) to bottom (to), 0 = left to right
    const a = ((e.angle ?? 90) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const x0 = e.r ? e.x - e.r : e.x, y0 = e.r ? e.y - e.r : e.y, w = e.r ? e.r * 2 : e.w, h = e.r ? e.r * 2 : e.h;
    const span = Math.abs(w * dx) + Math.abs(h * dy) || 1;
    const start = (dx < 0 ? w : 0) * dx + (dy < 0 ? h : 0) * dy;
    u = ((x - x0) * dx + (y - y0) * dy - start) / span;
  }
  return clamp01(from + (to - from) * clamp01(u)) * (e.level ?? 1);
}

function ditherAsset(e, { c, noise, t = 0 }) {
  const m = bayer([2, 4, 8].includes(e.matrix) ? e.matrix : 4), n = m.length, nn = n * n;
  const circle = e.r != null;
  const x0 = circle ? e.x - e.r : e.x, y0 = circle ? e.y - e.r : e.y, w = Math.max(1, circle ? e.r * 2 : e.w), h = Math.max(1, circle ? e.r * 2 : e.h);
  // cells: at least 3 px, and never more than ~30k of them (a huge field silently gets coarser cells)
  const cell = Math.max(3, Number(e.cell) || 12, Math.sqrt((w * h) / 30000));
  const pattern = ['square', 'dot', 'line', 'plus'].includes(e.pattern) ? e.pattern : 'square';
  const gap = clamp01(e.gap ?? (pattern === 'square' ? 0 : 0.18));
  // inks from light to dark: coverage 0..1 walks through them; one ink = classic 1-bit
  const inks = (Array.isArray(e.colors) && e.colors.length ? e.colors : [e.color || 'blue']).map((k) => c(k, '#0B57D0'));
  const levels = inks.length;
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const groups = inks.map(() => []);
  for (let j = 0; j < rows; j++) {
    const runs = inks.map(() => -1);
    const flush = (k, i) => { if (runs[k] > -1) { groups[k].push(`<rect x="${f(x0 + runs[k] * cell)}" y="${f(y0 + j * cell)}" width="${f((i - runs[k]) * cell)}" height="${f(cell)}"/>`); runs[k] = -1; } };
    for (let i = 0; i < cols; i++) {
      const px = x0 + (i + 0.5) * cell, py = y0 + (j + 0.5) * cell;
      const inside = !circle || Math.hypot(px - e.x, py - e.y) <= e.r;
      const v = inside ? rampAt(e, px, py, noise, t) * levels : 0;
      const T = (m[j % n][i % n] + 0.5) / nn;
      const lv = Math.min(levels, Math.floor(v) + (v - Math.floor(v) > T ? 1 : 0)); // 0 = paper, 1..levels = inks
      const k = lv - 1;
      if (pattern === 'square') {
        for (let q = 0; q < levels; q++) if (q !== k) flush(q, i);
        if (k >= 0 && runs[k] < 0) runs[k] = i;
        continue;
      }
      if (k < 0) continue;
      const s = cell * (1 - gap), g = groups[k];
      if (pattern === 'dot') g.push(`<circle cx="${f(px)}" cy="${f(py)}" r="${f(s / 2)}"/>`);
      else if (pattern === 'line') g.push(`<rect x="${f(px - cell / 2)}" y="${f(py - s * 0.22)}" width="${f(cell)}" height="${f(s * 0.44)}"/>`);
      else g.push(`<rect x="${f(px - s / 2)}" y="${f(py - s * 0.14)}" width="${f(s)}" height="${f(s * 0.28)}"/><rect x="${f(px - s * 0.14)}" y="${f(py - s / 2)}" width="${f(s * 0.28)}" height="${f(s)}"/>`);
    }
    if (pattern === 'square') for (let q = 0; q < levels; q++) flush(q, cols);
  }
  const svg = groups.map((g, k) => (g.length ? `<g fill="${inks[k]}" shape-rendering="crispEdges">${g.join('')}</g>` : '')).join('');
  return { svg, bbox: [x0, y0, w, h] };
}

export const DITHER_ASSETS = { dither: ditherAsset };

// ---------- raster screen ----------

const dist = ([pr, pg, pb], r, g, b) => (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11;
const nearest = (pal, r, g, b) => { let best = 0, bd = Infinity; for (let p = 0; p < pal.length; p++) { const dd = dist(pal[p], r, g, b); if (dd < bd) { bd = dd; best = p; } } return best; };
const hex = (s) => { const v = s.replace('#', ''); return [0, 2, 4].map((k) => parseInt(v.slice(k, k + 2), 16)); };

// Named looks for spec.screen: a string picks one, an object may start from one with `preset` and override fields.
export const SCREEN_PRESETS = {
  '1bit': { cell: 4, matrix: 8, inks: ['#14181F'], paper: '#F4F2EC' },
  riso: { cell: 5, matrix: 4, inks: ['#0A3FB0', '#F2603F'], paper: '#F4F2EC' },
  blueprint: { cell: 4, matrix: 8, inks: ['#F4F2EC'], paper: '#0B57D0' },
  gameboy: { cell: 6, matrix: 4, inks: ['#8BAC0F', '#306230', '#0F380F'], paper: '#9BBC0F' },
  newsprint: { cell: 3, matrix: 8, inks: ['#1A1A1A'], paper: '#EDE6D6', spread: 1 },
};
export function resolveScreen(screen) {
  if (!screen) return null;
  if (typeof screen === 'string') return SCREEN_PRESETS[screen] || null;
  return { ...(SCREEN_PRESETS[screen.preset] || {}), ...screen };
}

// opts: { cell = 6, matrix = 4, inks = ['#0A3FB0'], paper = '#F4F2EC', spread = 0.8 } or a preset name
// inks + paper form the palette; each cell's average colour, nudged by the Bayer threshold, snaps to the nearest one.
export async function screenRaster(input, screen = {}) {
  const opts = resolveScreen(screen);
  if (!opts) throw new Error(`unknown screen preset "${screen}" (use ${Object.keys(SCREEN_PRESETS).join(', ')} or an object)`);
  const cell = Math.max(2, Math.min(64, Math.round(Number(opts.cell) || 6))), m = bayer([2, 4, 8].includes(opts.matrix) ? opts.matrix : 4), n = m.length, nn = n * n;
  const okHex = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
  const inkList = (Array.isArray(opts.inks) ? opts.inks : ['#0A3FB0']).filter(okHex).slice(0, 8);
  const pal = [okHex(opts.paper) ? opts.paper : '#F4F2EC', ...(inkList.length ? inkList : ['#0A3FB0'])].map(hex);
  const spread = Math.max(0, Math.min(2, Number(opts.spread ?? 0.8))) * 255 / Math.max(1, pal.length - 1);
  const img = sharp(input).removeAlpha();
  const { width, height } = await img.metadata();
  const gw = Math.ceil(width / cell), gh = Math.ceil(height / cell);
  const { data } = await img.resize(gw, gh, { kernel: 'cubic', fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  const outSmall = Buffer.alloc(gw * gh * 3);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    const k = (y * gw + x) * 3, d = ((m[y % n][x % n] + 0.5) / nn - 0.5) * spread;
    // a cell already in a palette colour (flat paper, flat ink) stays solid; only in-between tones get the pattern
    let best = nearest(pal, data[k], data[k + 1], data[k + 2]);
    if (dist(pal[best], data[k], data[k + 1], data[k + 2]) > 18 * 18) best = nearest(pal, data[k] + d, data[k + 1] + d, data[k + 2] + d);
    outSmall[k] = pal[best][0]; outSmall[k + 1] = pal[best][1]; outSmall[k + 2] = pal[best][2];
  }
  return sharp(outSmall, { raw: { width: gw, height: gh, channels: 3 } })
    .resize(gw * cell, gh * cell, { kernel: 'nearest' })
    .extract({ left: 0, top: 0, width, height })
    .png()
    .toBuffer();
}
