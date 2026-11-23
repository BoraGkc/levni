// Poster shape kits: crisp, print-sharp geometry for branding posters (use with "finish": "soft").
//  shapegrid  Bauhaus / Swiss modular grid: pills, half circles, quarters, arches ... with exact gaps, seeded or explicit.
//  echo       one silhouette repeated N times with an offset and stepped tones, the last copy on top (the "head stack").
//  dotmatrix  a dot grid whose mask (prop, built-in world map, noise, pattern rows) decides filled / hollow / faint dots.
//  furniture  poster furniture: dotted border, corner marks, plus-sign row, mono credits row, code tag, thin rules.
import { flattenPath } from './ink.mjs';
import { findProp } from './props.mjs';
import { propSource } from './glyphfill.mjs';

const f = (n) => Math.round(n * 100) / 100;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const int = (v, d, lo, hi) => Math.round(num(v, d, lo, hi));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;

// ---------- shapegrid ----------

const ORIENT = ['up', 'down', 'left', 'right'], CORNERS = ['tl', 'tr', 'bl', 'br'];
export const GRID_MODULES = ['pill-left', 'pill-right', 'pill-up', 'pill-down', 'half-circle', 'quarter', 'circle', 'square', 'diamond', 'arch', 'blank'];
const GROUPS = { pill: ORIENT.map((o) => 'pill-' + o), 'half-circle': ORIENT.map((o) => 'half-circle-' + o), quarter: CORNERS.map((q) => 'quarter-' + q), arch: ORIENT.map((o) => 'arch-' + o) };

// rectangle with a radius per corner [tl, tr, br, bl]
function rrect(x, y, w, h, radii) {
  const m = Math.min(w, h) / 2;
  const [a, b, c, d] = radii.map((v) => Math.max(0, Math.min(m, v)));
  let s = `M${f(x + a)} ${f(y)}H${f(x + w - b)}`;
  if (b) s += `A${f(b)} ${f(b)} 0 0 1 ${f(x + w)} ${f(y + b)}`;
  s += `V${f(y + h - c)}`;
  if (c) s += `A${f(c)} ${f(c)} 0 0 1 ${f(x + w - c)} ${f(y + h)}`;
  s += `H${f(x + d)}`;
  if (d) s += `A${f(d)} ${f(d)} 0 0 1 ${f(x)} ${f(y + h - d)}`;
  s += `V${f(y + a)}`;
  if (a) s += `A${f(a)} ${f(a)} 0 0 1 ${f(x + a)} ${f(y)}`;
  return s + 'Z';
}

// one module drawn flush in the rectangle X, Y, W, H; returns a path string ('' = blank)
export function modulePath(name, X, Y, W, H, { radius = 0, round = 1 } = {}) {
  const side = name.split('-').pop(), kind = name.replace(/-(up|down|left|right|tl|tr|bl|br)$/, '');
  const cx = X + W / 2, cy = Y + H / 2, mn = Math.min(W, H), o = Math.min(radius, mn / 2);
  if (kind === 'pill') {
    const r = (mn / 2) * clamp01(round);
    return rrect(X, Y, W, H, { left: [r, o, o, r], right: [o, r, r, o], up: [r, r, o, o], down: [o, o, r, r] }[side] || [r, r, r, r]);
  }
  if (kind === 'arch') { // the round end is as wide as the module (a gateway), whatever its height
    const r = ({ up: W, down: W, left: H, right: H }[side] / 2) * clamp01(round);
    return rrect(X, Y, W, H, { up: [r, r, o, o], down: [o, o, r, r], left: [r, o, o, r], right: [o, r, r, o] }[side] || [r, r, o, o]);
  }
  if (kind === 'half-circle') {
    if (side === 'up' || side === 'down') {
      const r = Math.min(W / 2, H);
      return side === 'up' ? `M${f(cx - r)} ${f(Y + H)}A${f(r)} ${f(r)} 0 0 1 ${f(cx + r)} ${f(Y + H)}Z` : `M${f(cx + r)} ${f(Y)}A${f(r)} ${f(r)} 0 0 1 ${f(cx - r)} ${f(Y)}Z`;
    }
    const r = Math.min(H / 2, W);
    return side === 'left' ? `M${f(X + W)} ${f(cy - r)}A${f(r)} ${f(r)} 0 0 0 ${f(X + W)} ${f(cy + r)}Z` : `M${f(X)} ${f(cy + r)}A${f(r)} ${f(r)} 0 0 0 ${f(X)} ${f(cy - r)}Z`;
  }
  if (kind === 'quarter') {
    const r = mn;
    if (side === 'tl') return `M${f(X)} ${f(Y)}H${f(X + r)}A${f(r)} ${f(r)} 0 0 1 ${f(X)} ${f(Y + r)}Z`;
    if (side === 'tr') return `M${f(X + W)} ${f(Y)}V${f(Y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(X + W - r)} ${f(Y)}Z`;
    if (side === 'br') return `M${f(X + W)} ${f(Y + H)}H${f(X + W - r)}A${f(r)} ${f(r)} 0 0 1 ${f(X + W)} ${f(Y + H - r)}Z`;
    return `M${f(X)} ${f(Y + H)}V${f(Y + H - r)}A${f(r)} ${f(r)} 0 0 1 ${f(X + r)} ${f(Y + H)}Z`;
  }
  if (kind === 'circle') { const r = mn / 2; return `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 1 ${f(cx - r)} ${f(cy)}Z`; }
  if (kind === 'diamond') return `M${f(cx)} ${f(Y)}L${f(X + W)} ${f(cy)}L${f(cx)} ${f(Y + H)}L${f(X)} ${f(cy)}Z`;
  if (kind === 'square') return rrect(X, Y, W, H, [o, o, o, o]);
  return '';
}

// "pill", "half-circle", "quarter", "arch" pick an orientation; unknown names fall back to a square
function resolveModule(name, r) {
  const n = String(name || 'square').toLowerCase();
  if (GROUPS[n]) return r.pick(GROUPS[n]);
  if (n === 'blank' || n === 'none') return 'blank';
  if (['circle', 'square', 'diamond'].includes(n) || /^(pill|half-circle|arch)-(up|down|left|right)$/.test(n) || /^quarter-(tl|tr|bl|br)$/.test(n)) return n;
  return 'square';
}

function shapegridAsset(e, { r, c }) {
  const x = num(e.x, 0, -1e5, 1e5), y = num(e.y, 0, -1e5, 1e5), w = num(e.w, 600, 4, 6000), h = num(e.h, 600, 4, 6000);
  const cols = int(e.cols, 4, 1, 60), rows = int(e.rows, 4, 1, 60);
  const gap = num(e.gap, 12, 0, Math.min(w, h) / 4);
  const cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
  const radius = num(e.radius, 0, 0, 1e4), round = num(e.round, 1, 0, 1);
  const pool = (Array.isArray(e.modules) && e.modules.length ? e.modules : GRID_MODULES.filter((m) => m !== 'blank')).map(String).slice(0, 40);
  // colours with weights: ["ink", "coral"] + weights [9, 1], or [{ color, weight }]
  const raw = Array.isArray(e.colors) && e.colors.length ? e.colors.slice(0, 12) : ['ink'];
  const ws = raw.map((k, i) => (k && typeof k === 'object' ? { col: k.color, w: num(k.weight, 1, 0, 1e6) } : { col: k, w: num(e.weights?.[i], i === 0 ? 8 : 1, 0, 1e6) }));
  const total = ws.reduce((a, k) => a + k.w, 0) || 1;
  const pickColor = () => { let t = r.next() * total; for (const k of ws) { t -= k.w; if (t < 0) return k.col; } return ws[0].col; };
  const blank = num(e.blank, 0, 0, 1);
  const taken = Array.from({ length: rows }, () => new Array(cols).fill(false));
  const placed = [];
  const put = (c0, r0, sw, sh, module, color) => {
    c0 = int(c0, 0, 0, cols - 1); r0 = int(r0, 0, 0, rows - 1); sw = int(sw, 1, 1, cols - c0); sh = int(sh, 1, 1, rows - r0);
    for (let j = r0; j < r0 + sh; j++) for (let i = c0; i < c0 + sw; i++) if (taken[j][i]) return false;
    for (let j = r0; j < r0 + sh; j++) for (let i = c0; i < c0 + sw; i++) taken[j][i] = true;
    placed.push({ c0, r0, sw, sh, module, color });
    return true;
  };
  // 1. merged spans: { col, row, cols, rows, module, color }
  for (const s of Array.isArray(e.spans) ? e.spans.slice(0, 200) : []) if (s && typeof s === 'object') put(s.col, s.row, s.cols ?? s.w ?? 1, s.rows ?? s.h ?? 1, resolveModule(s.module, r), s.color ?? pickColor());
  // 2. explicit cells, row-major: "module" | ["module", "color"] | ["module", "color", [sw, sh]] | null (blank)
  const explicit = Array.isArray(e.cells) ? e.cells : null;
  if (explicit) explicit.slice(0, cols * rows).forEach((cell, k) => {
    if (cell == null) return;
    const [m, col, span] = Array.isArray(cell) ? cell : [cell];
    const [sw, sh] = Array.isArray(span) ? span : [1, 1];
    put(k % cols, Math.floor(k / cols), sw, sh, resolveModule(m, r), col ?? pickColor());
  });
  // 3. the rest from the seed (with explicit cells, only if `fill` is true)
  if (!explicit || e.fill) for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    if (taken[j][i]) continue;
    taken[j][i] = true;
    placed.push({ c0: i, r0: j, sw: 1, sh: 1, module: r.chance(blank) ? 'blank' : resolveModule(r.pick(pool), r), color: pickColor() });
  }
  const byColor = new Map();
  for (const p of placed) {
    if (p.module === 'blank') continue;
    const d = modulePath(p.module, x + p.c0 * (cw + gap), y + p.r0 * (ch + gap), p.sw * cw + (p.sw - 1) * gap, p.sh * ch + (p.sh - 1) * gap, { radius, round });
    const key = c(p.color, '#14181F');
    byColor.set(key, (byColor.get(key) || '') + d);
  }
  let svg = e.bg ? `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${c(e.bg, '#F4F2EC')}"/>` : '';
  for (const [col, d] of byColor) svg += `<path d="${d}" fill="${col}"/>`;
  return { svg, bbox: [x, y, w, h] };
}

// ---------- echo ----------

const hexRgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const rgbHex = (a) => '#' + a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A.map((v, i) => v + (B[i] - v) * t)); };

// the silhouette source of an echo, in a 0..100 box: [{ d, fill, stroke, weight }]
function echoPaths(e) {
  if (e.prop) {
    const p = findProp(e.prop);
    if (!p) throw new Error(`echo: no prop "${e.prop}" (levni list)`);
    const v = p.variants[Math.min(p.variants.length - 1, Math.max(0, int(e.variant, 0, 0, 99)))];
    const only = Array.isArray(e.paths) ? new Set(e.paths) : null;
    return v.paths.filter((_, i) => !only || only.has(i));
  }
  if (e.d) return [{ d: String(e.d), fill: 'ink', stroke: 'none' }];
  if (Array.isArray(e.paths) && e.paths.length) return e.paths.filter((p) => p && typeof p.d === 'string');
  const shape = e.shape || 'circle', ar = num(e.aspect, 1, 0.1, 10);
  const w = ar >= 1 ? 100 : 100 * ar, h = ar >= 1 ? 100 / ar : 100, x0 = (100 - w) / 2, y0 = (100 - h) / 2;
  const ell = `M${f(x0)} 50a${f(w / 2)} ${f(h / 2)} 0 1 0 ${f(w)} 0a${f(w / 2)} ${f(h / 2)} 0 1 0 ${f(-w)} 0Z`;
  let d;
  if (shape === 'circle') d = ell;
  else if (shape === 'rect') d = rrect(x0, y0, w, h, new Array(4).fill((num(e.radius, 0, 0, 1) * Math.min(w, h)) / 2));
  else if (shape === 'pill') d = rrect(x0, y0, w, h, new Array(4).fill(Math.min(w, h) / 2));
  else if (shape === 'triangle') d = `M50 ${f(y0)}L${f(x0 + w)} ${f(y0 + h)}L${f(x0)} ${f(y0 + h)}Z`;
  else throw new Error(`echo: unknown shape "${shape}" (circle, rect, pill, triangle, or use prop / paths / d)`);
  return [{ d, fill: 'ink', stroke: 'none' }];
}

function echoAsset(e, { c }) {
  const paths = echoPaths(e);
  if (!paths.length) throw new Error('echo: no paths left (check "paths")');
  const size = num(e.size, 400, 8, 6000), n = int(e.n, 8, 1, 60);
  const dx = num(e.dx, 0, -2000, 2000), dy = num(e.dy, 24, -2000, 2000), step = num(e.scaleStep, 0, -0.5, 0.5);
  // fit: the visible ink (not the 0..100 box) is scaled to `size` on its longer side, centred on (x, y)
  const pts = paths.flatMap((p) => flattenPath(p.d, 3).flat());
  if (!pts.length) throw new Error('echo: empty path');
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
  const k = size / Math.max(bw, bh, 1e-6), flip = !!e.flip;
  const x = num(e.x, 600, -1e5, 1e5), y = num(e.y, 800, -1e5, 1e5);
  const from = c(e.from, '#C7D3F0'), to = c(e.to, '#0B57D0');
  const steps = int(e.steps, n, 1, 60); // distinct tones (fewer than n repeats a tone)
  const tone = (i) => { const q = n === 1 ? 1 : i / (n - 1); return mix(from, to, steps === 1 ? 1 : Math.round(q * (steps - 1)) / (steps - 1)); };
  const ow = num(e.weight, 6, 0, 80), outline = e.outline ? c(e.outline, '#14181F') : null;
  const scaleOf = (i) => Math.max(0.05, 1 - (n - 1 - i) * step);
  const place = (i) => {
    const back = n - 1 - i, s = k * scaleOf(i);
    return `translate(${f(x - back * dx)} ${f(y - back * dy)}) scale(${f(flip ? -s : s)} ${f(s)}) translate(${f(-(bx + bw / 2))} ${f(-(by + bh / 2))})`;
  };
  // the silhouette in one colour (`grow` px widens it all round); `solid` also fills line art
  const sil = (col, grow, s) => paths.map((p) => {
    const filled = e.solid || (p.fill && p.fill !== 'none');
    const stroked = p.stroke !== 'none' && (p.stroke || !p.fill);
    const wt = ((stroked ? (p.weight ?? 10) : 0) + grow) / (k * s);
    return `<path d="${esc(p.d)}" fill="${filled ? col : 'none'}" stroke="${wt > 0 ? col : 'none'}" stroke-width="${f(wt)}" stroke-linejoin="round" stroke-linecap="round"/>`;
  }).join('');
  let svg = '';
  for (let i = 0; i < n; i++) {
    const last = i === n - 1, s = scaleOf(i);
    let inner;
    if (last && (e.final === 'prop' || e.final === 'paint')) { // the top copy in the prop's own colours
      inner = (outline ? sil(outline, ow * 2, s) : '') + paths.map((p) => `<path d="${esc(p.d)}" fill="${p.fill && p.fill !== 'none' ? c(p.fill) : 'none'}" stroke="${p.stroke === 'none' || (p.fill && !p.stroke) ? 'none' : c(p.stroke, '#14181F')}" stroke-width="${f((p.weight ?? 10) / (k * s))}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
    } else if (last) inner = (outline ? sil(outline, ow * 2, s) : '') + sil(e.top ? c(e.top, to) : tone(i), 0, s);
    else inner = (e.outlineAll && outline ? sil(outline, ow * 2, s) : '') + sil(tone(i), 0, s);
    svg += `<g transform="${place(i)}">${inner}</g>`;
  }
  const w0 = bw * k, h0 = bh * k, ax = Math.abs((n - 1) * dx), ay = Math.abs((n - 1) * dy);
  return { svg, bbox: [x - w0 / 2 - (dx > 0 ? ax : 0), y - h0 / 2 - (dy > 0 ? ay : 0), w0 + ax, h0 + ay] };
}

// ---------- dotmatrix ----------

// 120 x 48 land bitmap, equirectangular, 3 degrees per cell, lon -180..180, lat 84..-60 (Antarctica left out)
const WORLD = { cols: 120, rows: 48, top: 84, s: 3, data: 'AAAAAfwP8AAAAAAAAAAAAAAAD////ADwAAAYAAAAAAAPL8f/+AAAAAAHwAAAAAAeu4B/+AAAAgH/9hAAA8A32/g/8AAOAD/////Af//////////8cAgAAAAAF////74+DgH////////+B///+DAMAAPf///////8AYP/+D4AACPP/////+BAAAD//z8AACGf/////8DAAAB///+AAFf//////+CAAAA///9AAD////////AAAAAf//4AAB///////8AAAAAf//gAAH/8d////5AAAAAf//AAAHB/+////gAAAAAf/+AAAHAX+///8iAAAAAP/8AAAD8A////8MAAAAAH/4AAAH/b////+AAAAAAD8IAAAP//9///+AAAAAAA8AAAAf//+f//8AAAAAAAcAAAA///fx//4AAAAAAAdggAAf///g+fAAAAAAAAHgAAA///vA4fCAAAAAAAAwAAA///8AYHAAAAAAAAAR8AAf//+AYBAAAAAAAAAD8AAP//+AAEBAAAAAAAAD/gAEP/8AAMMAAAAAAAAH/gAAH/4AAG4AAAAAAAAH/4AAH/wAAG6IAAAAAAAH//AAD/gAACAHAAAAAAAH//AAD/gAAAgDgAAAAAAD//AAD/gAAAAAAAAAAAAD/+AAD/yAAAAdAAAAAAAB/+AAD/+AAAD/gAAAAAAAf+AAD/EAAAD/gAAAAAAAf8AAB/MAAAP/wAAAAAAA/wAAB+AAAAP/4AAAAAAA/wAAB+AAAAP/4AAAAAAA/gAAA8AAAAP/4AAAAAAA/AAAAgAAAAEHwAAAAAAB+AAAAAAAAAABwCAAAAAB4AAAAAAAAAAAACAAAAAB4AAAAAAAAAAAAMAAAAABwAAAAAAAAAAAAIAAAAABgAAAAAAAAAAAAAAAAAABgAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' };
let worldBits = null;
function world(i, j) {
  if (!worldBits) worldBits = Buffer.from(WORLD.data, 'base64');
  const k = j * WORLD.cols + i;
  return (worldBits[k >> 3] >> (7 - (k & 7))) & 1;
}
// land coverage at lon/lat: bilinear over the cell centres, so coasts do not look stair-stepped
function landAt(lon, lat) {
  const u = (lon + 180) / WORLD.s - 0.5, v = (WORLD.top - lat) / WORLD.s - 0.5;
  const i = Math.floor(u), j = Math.floor(v), a = u - i, b = v - j;
  const g = (ii, jj) => (jj < 0 || jj >= WORLD.rows ? 0 : world(((ii % WORLD.cols) + WORLD.cols) % WORLD.cols, jj));
  return (g(i, j) * (1 - a) + g(i + 1, j) * a) * (1 - b) + (g(i, j + 1) * (1 - a) + g(i + 1, j + 1) * a) * b;
}

const FILLED = new Set(['o', '#', 'x', '1', '@']), HOLLOW = new Set(['O', '0', 'h', '*']);

function dotmatrixAsset(e, { r, c, noise }) {
  const x = num(e.x, 0, -1e5, 1e5), y = num(e.y, 0, -1e5, 1e5), w = num(e.w, 800, 4, 6000), h = num(e.h, 500, 4, 6000);
  const pattern = Array.isArray(e.pattern) && e.pattern.length ? e.pattern.map(String).slice(0, 400) : null;
  const kind = e.mask || (pattern ? 'pattern' : e.prop ? 'prop' : 'full');
  if (!['world', 'noise', 'prop', 'pattern', 'full'].includes(kind)) throw new Error(`dotmatrix: unknown mask "${kind}" (world, noise, prop, pattern)`);
  if (kind === 'pattern' && !pattern) throw new Error('dotmatrix: mask "pattern" needs pattern rows like ["..o..", ".ooo."]');
  // grid: cols / rows or cell; the grid is centred in the area; a pattern sets the grid by its own size
  const pw = pattern ? Math.max(...pattern.map((p) => p.length), 1) : 0;
  let cols = e.cols ? int(e.cols, 40, 1, 400) : 0, rows = e.rows ? int(e.rows, 20, 1, 400) : 0, cell;
  if (!e.cell && pattern) { cols = cols || pw; rows = rows || (e.cols ? 0 : pattern.length); }
  if (cols && rows) cell = Math.min(w / cols, h / rows);
  else if (cols) { cell = w / cols; rows = Math.max(1, Math.floor(h / cell)); }
  else if (rows) { cell = h / rows; cols = Math.max(1, Math.floor(w / cell)); }
  else { cell = num(e.cell, 14, 3, 400); cols = Math.max(1, Math.floor(w / cell)); rows = Math.max(1, Math.floor(h / cell)); }
  while (cols * rows > 40000) { cell *= 1.1; cols = Math.max(1, Math.floor(w / cell)); rows = Math.max(1, Math.floor(h / cell)); }
  const gw = cols * cell, gh = rows * cell, gx = x + (w - gw) / 2, gy = y + (h - gh) / 2;
  const px = (i) => gx + (i + 0.5) * cell, py = (j) => gy + (j + 0.5) * cell;
  const pat = (i, j) => pattern[Math.min(pattern.length - 1, Math.floor(((j + 0.5) / rows) * pattern.length))][Math.min(pw - 1, Math.floor(((i + 0.5) / cols) * pw))] || ' ';

  // mask: coverage 0..1 per cell
  let cov;
  const thr = num(e.threshold, 0.5, 0.01, 1);
  if (kind === 'full') cov = () => 1;
  else if (kind === 'pattern') cov = (i, j) => { const ch = pat(i, j); return FILLED.has(ch) || HOLLOW.has(ch) ? 1 : 0; };
  else if (kind === 'noise') {
    const sc = num(e.scale, 0.11, 0.005, 2), ox = r.range(0, 50), oy = r.range(0, 50), lv = num(e.level, 0, -0.6, 0.6);
    cov = (i, j) => ((noise(i * sc + ox, j * sc + oy) + noise(i * sc * 2.1 + oy, j * sc * 2.1 + ox) * 0.4) / 1.4 > lv ? 1 : 0);
  } else if (kind === 'world') {
    const view = Array.isArray(e.view) && e.view.length === 4 && e.view.every(Number.isFinite) ? e.view.map(Number) : [-180, 84, 180, -60]; // lon0, lat0, lon1, lat1
    const vw = Math.abs(view[2] - view[0]) || 1, vh = Math.abs(view[1] - view[3]) || 1, fit = e.fit || 'contain';
    const sx = fit === 'stretch' ? gw / vw : (fit === 'cover' ? Math.max : Math.min)(gw / vw, gh / vh), sy = fit === 'stretch' ? gh / vh : sx;
    const clon = (view[0] + view[2]) / 2, clat = (view[1] + view[3]) / 2;
    cov = (i, j) => landAt(clon + (px(i) - (gx + gw / 2)) / sx, clat - (py(j) - (gy + gh / 2)) / sy);
  } else { // prop silhouette, fitted into the grid (`scale` 0.1..2)
    const size = Math.min(gw, gh) * num(e.scale, 1, 0.1, 2);
    const src = propSource({ prop: e.prop, variant: e.variant, flip: e.flip, paths: e.paths, x: gx + gw / 2, y: gy + gh / 2, minLine: 1.4 }, c, size, cell);
    cov = (i, j) => { let s = 0; for (const [a, b] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]]) if (src.hit(px(i) + a * cell, py(j) + b * cell)) s++; return s / 4; };
  }
  const on = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const v = cov(i, j); on[j * cols + i] = v >= thr && v > 0 ? 1 : 0; }
  if (e.invert) for (let k = 0; k < on.length; k++) on[k] ^= 1;

  // which dots are hollow
  const hollow = new Uint8Array(cols * rows), at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? 0 : on[j * cols + i]);
  const share = num(e.hollow, 0.2, 0, 1), mode = e.hollowMode || 'noise';
  const inside = [];
  for (let k = 0; k < on.length; k++) if (on[k]) inside.push(k);
  if (kind === 'pattern') { for (const k of inside) hollow[k] = HOLLOW.has(pat(k % cols, Math.floor(k / cols))) ? 1 : 0; }
  else if (mode === 'edge') { for (const k of inside) { const i = k % cols, j = Math.floor(k / cols); if (!at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1)) hollow[k] = 1; } }
  else {
    const sc = num(e.hollowScale, 0.22, 0.02, 3), ox = r.range(100, 200), oy = r.range(100, 200);
    const order = inside.map((k) => [mode === 'random' ? r.next() : noise((k % cols) * sc + ox, Math.floor(k / cols) * sc + oy), k]).sort((a, b) => b[0] - a[0]);
    for (let q = 0; q < Math.round(inside.length * share); q++) hollow[order[q][1]] = 1;
  }
  const accentCol = e.accent ? c(e.accent, '#F2603F') : null, accentShare = num(e.accentShare, 0.06, 0, 1);
  const filledCol = c(e.filled ?? e.color, '#14181F'), ringCol = c(e.hollowColor, filledCol);
  const dot = num(e.dot, 0.64, 0.05, 1) * cell, ringW = num(e.ring, 0.14, 0.03, 0.5) * cell;
  const fo = e.faint && typeof e.faint === 'object' ? e.faint : { color: e.faint };
  const faintCol = fo.color ? c(fo.color, '#B8C2DD') : null, faintDot = num(fo.size ?? e.faintSize, 0.34, 0.05, 1) * cell;
  const circ = (cx, cy, rr) => `M${f(cx - rr)} ${f(cy)}a${f(rr)} ${f(rr)} 0 1 0 ${f(rr * 2)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-rr * 2)} 0Z`;
  let fd = '', rd = '', ad = '', bd = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i;
    if (!on[k]) { if (faintCol) bd += circ(px(i), py(j), faintDot / 2); continue; }
    if (hollow[k]) rd += circ(px(i), py(j), (dot - ringW) / 2);
    else if (accentCol && r.chance(accentShare)) ad += circ(px(i), py(j), dot / 2);
    else fd += circ(px(i), py(j), dot / 2);
  }
  let svg = '';
  if (bd) svg += `<path d="${bd}" fill="${faintCol}"/>`;
  if (fd) svg += `<path d="${fd}" fill="${filledCol}"/>`;
  if (ad) svg += `<path d="${ad}" fill="${accentCol}"/>`;
  if (rd) svg += `<path d="${rd}" fill="none" stroke="${ringCol}" stroke-width="${f(ringW)}"/>`;
  return { svg, bbox: [gx, gy, gw, gh] };
}

// ---------- furniture ----------

const textW = (s, size, sp = 1) => s.length * (size * 0.6 + sp);

function furnitureAsset(e, { c, canvas }) {
  const W = canvas?.w ?? 1200, H = canvas?.h ?? 1600;
  const x = num(e.x, 0, -1e5, 1e5), y = num(e.y, 0, -1e5, 1e5), w = num(e.w, W - x, 4, 1e5), h = num(e.h, H - y, 4, 1e5);
  const col0 = c(e.color, '#14181F');
  const up = (s) => (e.upper === false ? String(s) : String(s).toLocaleUpperCase('en'));
  let svg = '';

  // dotted border, dots land exactly on the corners; fade: 'down' | 'up' | 'mid' | 'ends' | 'none'
  if (e.border) {
    const b = e.border === true ? {} : e.border;
    const ins = num(b.inset, 24, 0, Math.min(w, h) / 2 - 2), gap = num(b.gap, 11, 3, 200), dd = num(b.dot, 3, 0.5, 40), col = c(b.color, col0);
    const x0 = x + ins, y0 = y + ins, x1 = x + w - ins, y1 = y + h - ins;
    const fade = ['down', 'up', 'mid', 'ends'].includes(b.fade) ? b.fade : b.fade ? 'down' : 'none', minF = num(b.min, 0.18, 0, 1);
    const side = (ax, ay, bx, by) => {
      const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / gap));
      return Array.from({ length: n }, (_, i) => [ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n, i / n]);
    };
    const dots = [...side(x0, y0, x1, y0), ...side(x1, y0, x1, y1), ...side(x1, y1, x0, y1), ...side(x0, y1, x0, y0)];
    let s = '';
    for (const [qx, qy, u] of dots) {
      let t = 1;
      if (fade === 'down') t = 1 - (qy - y0) / Math.max(1, y1 - y0);
      else if (fade === 'up') t = (qy - y0) / Math.max(1, y1 - y0);
      else if (fade === 'mid') t = Math.abs(2 * u - 1);
      else if (fade === 'ends') t = 1 - Math.abs(2 * u - 1);
      const k = fade === 'none' ? 1 : minF + (1 - minF) * clamp01(t);
      s += `<circle cx="${f(qx)}" cy="${f(qy)}" r="${f((dd / 2) * k)}"/>`;
    }
    svg += `<g fill="${col}">${s}</g>`;
  }

  // corner marks: squares | registration | brackets | plus
  if (e.corners) {
    const k = e.corners === true ? {} : e.corners;
    const style = ['squares', 'registration', 'brackets', 'plus'].includes(k.style) ? k.style : 'squares', s = num(k.size, 14, 2, 200), ins = num(k.inset, 24, 0, 1000), col = c(k.color, col0), sw = num(k.weight, 2, 0.5, 20);
    for (const [cx, cy, sx, sy] of [[x + ins, y + ins, 1, 1], [x + w - ins, y + ins, -1, 1], [x + ins, y + h - ins, 1, -1], [x + w - ins, y + h - ins, -1, -1]]) {
      if (style === 'squares') svg += `<rect x="${f(cx - s / 2)}" y="${f(cy - s / 2)}" width="${f(s)}" height="${f(s)}" fill="${col}"/>`;
      else if (style === 'registration') svg += `<g fill="none" stroke="${col}" stroke-width="${f(sw)}"><circle cx="${f(cx)}" cy="${f(cy)}" r="${f(s * 0.32)}"/><path d="M${f(cx - s * 0.7)} ${f(cy)}H${f(cx + s * 0.7)}M${f(cx)} ${f(cy - s * 0.7)}V${f(cy + s * 0.7)}"/></g>`;
      else if (style === 'plus') svg += `<path d="M${f(cx - s / 2)} ${f(cy)}H${f(cx + s / 2)}M${f(cx)} ${f(cy - s / 2)}V${f(cy + s / 2)}" stroke="${col}" stroke-width="${f(sw)}" fill="none"/>`;
      else svg += `<path d="M${f(cx + sx * s)} ${f(cy)}H${f(cx)}V${f(cy + sy * s)}" stroke="${col}" stroke-width="${f(sw)}" fill="none" stroke-linecap="square"/>`;
    }
  }

  // row of plus signs: { n, size, gap, weight, at: [x, y] or edge: top | bottom, inset, align: start | center | end }
  for (const p of Array.isArray(e.plus) ? e.plus.slice(0, 8) : e.plus ? [e.plus] : []) {
    const q = p === true ? {} : p, n = int(q.n, 4, 1, 80), s = num(q.size, 14, 2, 200), g = num(q.gap, s * 1.4, 0, 400), sw = num(q.weight, 2.2, 0.5, 20), col = c(q.color, col0);
    const rowW = n * s + (n - 1) * g, ins = num(q.inset, 40, 0, 2000), al = q.align || 'start';
    const px = Array.isArray(q.at) ? num(q.at[0], x, -1e5, 1e5) : al === 'center' ? x + (w - rowW) / 2 : al === 'end' ? x + w - ins - rowW : x + ins;
    const py = Array.isArray(q.at) ? num(q.at[1], y, -1e5, 1e5) : q.edge === 'bottom' ? y + h - ins : y + ins + s / 2;
    let d = '';
    for (let i = 0; i < n; i++) { const cx = px + s / 2 + i * (s + g); d += `M${f(cx - s / 2)} ${f(py)}H${f(cx + s / 2)}M${f(cx)} ${f(py - s / 2)}V${f(py + s / 2)}`; }
    svg += `<path d="${d}" stroke="${col}" stroke-width="${f(sw)}" fill="none"/>`;
  }

  // thin rules: { x0, y0, x1, y1 } or { y, inset } (horizontal across the area) or { x, inset } (vertical); weight, color, dash
  for (const q of Array.isArray(e.rules) ? e.rules.slice(0, 40) : []) {
    if (!q || typeof q !== 'object') continue;
    const ins = num(q.inset, 40, 0, 5000);
    let [ax, ay, bx, by] = [q.x0, q.y0, q.x1, q.y1].map((v) => (v == null ? NaN : Number(v)));
    if (q.y != null && !Number.isFinite(ax)) [ax, ay, bx, by] = [x + ins, Number(q.y), x + w - ins, Number(q.y)];
    else if (q.x != null && !Number.isFinite(ay)) [ax, ay, bx, by] = [Number(q.x), y + ins, Number(q.x), y + h - ins];
    if (![ax, ay, bx, by].every(Number.isFinite)) continue;
    const dash = Array.isArray(q.dash) ? q.dash.map((v) => num(v, 4, 0.5, 200)).join(' ') : q.dash ? `${num(q.dash, 4, 0.5, 200)} ${num(q.dash, 4, 0.5, 200)}` : '';
    svg += `<path d="M${f(ax)} ${f(ay)}L${f(bx)} ${f(by)}" stroke="${c(q.color, col0)}" stroke-width="${f(num(q.weight, 1.5, 0.25, 40))}" fill="none"${dash ? ` stroke-dasharray="${dash}"` : ''}/>`;
  }

  // credits: { left, centre / center, right, size, edge: bottom | top, inset, y, color }, or an array of rows
  for (const q of Array.isArray(e.credits) ? e.credits.slice(0, 12) : e.credits ? [e.credits] : []) {
    if (!q || typeof q !== 'object') continue;
    const size = num(q.size, 13, 6, 80), ins = num(q.inset, 40, 0, 2000), sp = num(q.spacing, 1, 0, 12), col = c(q.color, col0);
    const by = q.y != null ? num(q.y, 0, -1e5, 1e5) : q.edge === 'top' ? y + ins + size : y + h - ins;
    const t = (s, ax, anchor) => (s ? `<text x="${f(ax)}" y="${f(by)}" ${MONO} font-size="${f(size)}" fill="${col}" text-anchor="${anchor}" letter-spacing="${sp}">${esc(up(s))}</text>` : '');
    svg += t(q.left, x + ins, 'start') + t(q.centre ?? q.center, x + w / 2, 'middle') + t(q.right, x + w - ins, 'end');
  }

  // code tag: { text, at: [x, y] top-left or corner: tl | tr | bl | br, size, box: outline | fill | none, pad, color }
  for (const q of Array.isArray(e.tag) ? e.tag.slice(0, 12) : e.tag ? [e.tag] : []) {
    if (!q || typeof q !== 'object' || q.text == null) continue;
    const size = num(q.size, 14, 6, 120), pad = num(q.pad, size * 0.55, 0, 100), col = c(q.color, col0), sp = 1.5, ins = num(q.inset, 40, 0, 2000);
    const tw = textW(String(q.text), size, sp) + pad * 2, th = size + pad * 1.1, corner = q.corner || 'tr';
    const tx = Array.isArray(q.at) ? num(q.at[0], x, -1e5, 1e5) : corner.endsWith('r') ? x + w - ins - tw : x + ins;
    const ty = Array.isArray(q.at) ? num(q.at[1], y, -1e5, 1e5) : corner.startsWith('b') ? y + h - ins - th : y + ins;
    const mode = q.box || 'outline', rx = f(num(q.radius, 0, 0, th / 2));
    if (mode === 'fill') svg += `<rect x="${f(tx)}" y="${f(ty)}" width="${f(tw)}" height="${f(th)}" rx="${rx}" fill="${col}"/>`;
    else if (mode === 'outline') svg += `<rect x="${f(tx + 0.75)}" y="${f(ty + 0.75)}" width="${f(tw - 1.5)}" height="${f(th - 1.5)}" rx="${rx}" fill="none" stroke="${col}" stroke-width="1.5"/>`;
    svg += `<text x="${f(tx + tw / 2)}" y="${f(ty + th / 2 + size * 0.35)}" ${MONO} font-size="${f(size)}" fill="${mode === 'fill' ? c(q.textColor, '#F4F2EC') : col}" text-anchor="middle" letter-spacing="${sp}">${esc(up(q.text))}</text>`;
  }
  return { svg, bbox: [x, y, w, h] };
}

export { landAt };
export const SHAPES_ASSETS = { shapegrid: shapegridAsset, echo: echoAsset, dotmatrix: dotmatrixAsset, furniture: furnitureAsset };
