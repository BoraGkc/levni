// Print textures for posters: `amtone` (amplitude-modulated halftone), `camo` (threshold-noise blobs via marching
// squares), `grain` (film grain / photocopy toner as seeded SVG specks). All vector, deterministic (the element's
// own seeded `r`, no renderer noise), crisp under `finish: "soft"`.
// Also `printScreen` (used by compose.mjs): rasterise one element and print it as a dither (element-level `screen`).
import sharp from 'sharp';
import { findProp } from './props.mjs';
import { flattenPath } from './ink.mjs';
import { screenRaster, resolveScreen } from './dither.mjs';

const f = (n) => Math.round(n * 10) / 10;
const f2 = (n) => Math.round(n * 100) / 100;
const num = (v, d, lo, hi) => { const n = Number(v); return Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : d)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const gauss = (r) => (r.next() + r.next() + r.next() + r.next() - 2) / 0.58; // ~N(0,1)

// small seeded gradient noise (own copy: this module must not import assets.mjs)
function mkNoise(r) {
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = [...perm, ...perm];
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const g = (h, x, y) => { const a = (h / 256) * Math.PI * 2; return Math.cos(a) * x + Math.sin(a) * y; };
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y), u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const l1 = g(aa, xf, yf) + u * (g(ba, xf - 1, yf) - g(aa, xf, yf)), l2 = g(ab, xf, yf - 1) + u * (g(bb, xf - 1, yf - 1) - g(ab, xf, yf - 1));
    return l1 + v * (l2 - l1);
  };
}
// fbm normalised to about 0..1
function mkFbm(noise, scale, octaves, pers = 0.5) {
  let amp = 0; for (let o = 0; o < octaves; o++) amp += pers ** o;
  return (x, y) => {
    let s = 0, fr = scale;
    for (let o = 0; o < octaves; o++) { s += noise(x * fr + o * 17.3, y * fr - o * 9.1) * pers ** o; fr *= 2; }
    return clamp01(s / amp / 1.3 + 0.5);
  };
}

// Region of an element: rect (x, y, w, h), disc (x, y, r) or the whole canvas. `clip` rect|circle|none.
function region(e, canvas) {
  if (e.r != null) { const R = num(e.r, 100, 1, 1e5); return { x: e.x - R, y: e.y - R, w: R * 2, h: R * 2, disc: true }; }
  const w = num(e.w, canvas.w - (e.x ?? 0), 1, 1e5), h = num(e.h, canvas.h - (e.y ?? 0), 1, 1e5);
  return { x: num(e.x, 0, -1e5, 1e5), y: num(e.y, 0, -1e5, 1e5), w, h, disc: false };
}
function clipOf(e, R, tag) {
  const kind = e.clip ?? (R.disc ? 'circle' : 'rect');
  if (kind === 'none') return { def: '', attr: '' };
  const id = `pc${hash(`${tag}${R.x},${R.y},${R.w},${R.h},${kind}`)}`;
  const shape = kind === 'circle'
    ? `<circle cx="${f(R.x + R.w / 2)}" cy="${f(R.y + R.h / 2)}" r="${f(Math.min(R.w, R.h) / 2)}"/>`
    : `<rect x="${f(R.x)}" y="${f(R.y)}" width="${f(R.w)}" height="${f(R.h)}"/>`;
  return { def: `<clipPath id="${id}">${shape}</clipPath>`, attr: ` clip-path="url(#${id})"`, kind };
}

// ---------- prop silhouette ----------
function segDist2(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l));
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
}
function insidePoly(poly, x, y) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
// returns { tone(x, y) 0..1 (1 = ink), box } for a library prop: fills tone by their darkness, strokes full ink
function propTone(e, c) {
  const p = findProp(e.prop);
  if (!p) throw new Error(`amtone: no prop "${e.prop}" (levni list)`);
  const v = p.variants[Math.min(p.variants.length - 1, Math.max(0, Math.floor(num(e.variant, 0, 0, 99))))];
  const lum = (col) => { const h = c(col, '#888888').replace('#', ''); const [r, g, b] = [0, 2, 4].map((k) => parseInt(h.slice(k, k + 2), 16) || 0); return (0.3 * r + 0.59 * g + 0.11 * b) / 255; };
  const flat = e.flat === true;
  const size = num(e.size, 400, 8, 6000), only = Array.isArray(e.paths) ? new Set(e.paths) : null;
  const layers = v.paths.filter((_, i) => !only || only.has(i)).map((pt) => {
    const polys = flattenPath(pt.d, 1.6).map((poly) => { const q = poly.map(([x, y]) => [e.flip ? 100 - x : x, y]); q.closed = poly.closed; return q; });
    const hasFill = pt.fill && pt.fill !== 'none', hasStroke = pt.stroke !== 'none' && (pt.stroke || !hasFill);
    const bb = polys.flat().reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
    return { polys, hasFill, hasStroke, sw: (pt.weight ?? 10) / 2 / 2, bb, tone: flat ? 1 : 0.3 + 0.7 * (1 - lum(pt.fill)) };
  });
  if (!layers.length) throw new Error('amtone: no paths left (check "paths")');
  const all = layers.reduce((b, l) => [Math.min(b[0], l.bb[0]), Math.min(b[1], l.bb[1]), Math.max(b[2], l.bb[2]), Math.max(b[3], l.bb[3])], [1e9, 1e9, -1e9, -1e9]);
  const s = size / Math.max(all[2] - all[0], all[3] - all[1], 1);
  const ox = num(e.px ?? e.x, 600, -1e5, 1e5) - ((all[0] + all[2]) / 2) * s, oy = num(e.py ?? e.y, 400, -1e5, 1e5) - ((all[1] + all[3]) / 2) * s;
  const at = (X, Y) => {
    const x = (X - ox) / s, y = (Y - oy) / s;
    for (let li = layers.length - 1; li >= 0; li--) {
      const l = layers[li];
      if (x < l.bb[0] - l.sw || x > l.bb[2] + l.sw || y < l.bb[1] - l.sw || y > l.bb[3] + l.sw) continue;
      if (l.hasStroke) for (const poly of l.polys) { const n = poly.length + (poly.closed ? 1 : 0); for (let i = 1; i < n; i++) if (segDist2(x, y, poly[i - 1], poly[i % poly.length]) <= (l.sw / s * 2) ** 2) return 1; }
      if (l.hasFill && l.polys.some((poly) => poly.length > 2 && insidePoly(poly, x, y))) return l.tone;
    }
    return 0;
  };
  // 2x2 supersample so the silhouette edge gets partial dots
  const d = 0.22;
  return { tone: (X, Y, cell = 6) => { const k = cell * d; return (at(X - k, Y - k) + at(X + k, Y - k) + at(X - k, Y + k) + at(X + k, Y + k)) / 4; }, box: [ox + all[0] * s, oy + all[1] * s, (all[2] - all[0]) * s, (all[3] - all[1]) * s] };
}

// ---------- tone sources ----------
// tone(x, y, cell) -> 0..1, 1 = full ink
function toneSource(e, R, rr, c, r) {
  const kind = ['radial', 'linear', 'noise', 'terrain', 'prop', 'flat'].includes(e.source) ? e.source : 'linear';
  const from = num(e.from, 1, -2, 3), to = num(e.to, 0, -2, 3);
  const cx = e.cx ?? R.x + R.w / 2, cy = e.cy ?? R.y + R.h / 2;
  if (kind === 'flat') return { tone: () => clamp01(num(e.level, 0.5, 0, 1)), box: null };
  if (kind === 'radial') {
    const rad = num(e.radius, Math.hypot(R.w, R.h) / 2, 1, 1e5);
    return { tone: (x, y) => clamp01(from + (to - from) * clamp01(Math.hypot(x - cx, y - cy) / rad)) };
  }
  if (kind === 'linear') {
    const a = (num(e.toneAngle, 90, -720, 720) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const span = Math.abs(R.w * dx) + Math.abs(R.h * dy) || 1, start = (dx < 0 ? R.w : 0) * dx + (dy < 0 ? R.h : 0) * dy;
    return { tone: (x, y) => clamp01(from + (to - from) * clamp01(((x - R.x) * dx + (y - R.y) * dy - start) / span)) };
  }
  const noise = mkNoise(e.seed != null ? rr(num(e.seed, 7, 0, 1e6)) : r);
  const scale = num(e.scale, kind === 'terrain' ? 0.004 : 0.006, 0.0002, 0.5), oct = Math.round(num(e.octaves, kind === 'terrain' ? 5 : 3, 1, 8));
  const fbm = mkFbm(noise, scale, oct, kind === 'terrain' ? num(e.rough, 0.38, 0.1, 0.7) : 0.5);
  if (kind === 'noise') {
    const contrast = num(e.contrast, 2.2, 0.2, 8);
    return { tone: (x, y) => clamp01(from + (to - from) * clamp01((fbm(x, y) - 0.5) * contrast + 0.5)) };
  }
  // terrain: the noise heightmap read as land, lit from `light` (degrees, 225 = top left, 270 = top)
  const la = (num(e.light, 225, -720, 720) * Math.PI) / 180, el = (num(e.elev, 38, 5, 85) * Math.PI) / 180, relief = num(e.relief, 1.4, 0, 8);
  const L = [Math.cos(la) * Math.cos(el), Math.sin(la) * Math.cos(el), Math.sin(el)];
  const sea = num(e.sea, 0, 0, 0.95), k = relief / scale / 6, eps = Math.max(1.5, 0.6 / scale / 50);
  const H = (x, y) => Math.max(sea, (fbm(x, y) - 0.5) * num(e.contrast, 1.8, 0.2, 6) + 0.5);
  const raw = (x, y) => {
      const h = H(x, y), gx = (H(x + eps, y) - H(x - eps, y)) / (2 * eps) * k, gy = (H(x, y + eps) - H(x, y - eps)) / (2 * eps) * k;
      const n = Math.hypot(gx, gy, 1), lit = (-gx * L[0] - gy * L[1] + L[2]) / n; // lambert
      const t = num(e.bias, 0.36, 0, 1) + (Math.sin(el) - lit) * 2.6 + (0.5 - h) * num(e.heightShade, 0.6, 0, 2);
      return t;
  };
  // auto-levels: the 6%..94% range of a coarse sample is stretched to 0..1, so any seed/scale uses the full tone range
  const sm = [];
  for (let j = 0; j < 40; j++) for (let i = 0; i < 40; i++) sm.push(raw(R.x + ((i + 0.5) / 40) * R.w, R.y + ((j + 0.5) / 40) * R.h));
  sm.sort((a, b) => a - b);
  const lo = sm[Math.floor(sm.length * 0.06)], hi = Math.max(lo + 0.05, sm[Math.floor(sm.length * 0.94)]);
  return { tone: (x, y) => { const t = clamp01((raw(x, y) - lo) / (hi - lo)); return clamp01(to + (from - to) * t); } };
}

// ---------- amtone ----------
function amtone(e, { c, r, canvas }) {
  const rr = (s) => ({ next: (() => { let a = (s * 2654435761) >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })() });
  let R = region(e, canvas);
  const src = e.source === 'prop' ? propTone(e.prop ? e : { ...e, prop: e.name }, c) : null;
  if (src && e.w == null && e.r == null) { const m = e.cell ?? 12; R = { x: src.box[0] - m, y: src.box[1] - m, w: src.box[2] + m * 2, h: src.box[3] + m * 2, disc: false }; }
  const base = src || toneSource(e, R, rr, c, r);
  const gamma = num(e.gamma, 1, 0.2, 5), inv = !!e.invert, level = num(e.level, 1, 0, 1.5);
  const shape = ['dot', 'square', 'line'].includes(e.shape) ? e.shape : 'dot';
  const cell = Math.max(num(e.cell, 14, 2.5, 400), Math.sqrt((R.w * R.h) / (shape === 'line' ? 90000 : 45000)));
  const cols = (Array.isArray(e.colors) && e.colors.length ? e.colors : [e.color || 'ink']).slice(0, 3).map((k) => c(k, '#14181F'));
  const a0 = num(e.angle, 45, -720, 720), step = num(e.angleStep, 30, -180, 180);
  const clip = clipOf(e, R, 'am'), cxy = [R.x + R.w / 2, R.y + R.h / 2];
  const blend = e.blend ?? (cols.length > 1 ? 'multiply' : 'normal');
  const groups = [];
  cols.forEach((col, si) => {
    const ang = ((a0 + si * step) * Math.PI) / 180, ux = Math.cos(ang), uy = Math.sin(ang), vx = -uy, vy = ux;
    const lv = level * (si ? num(e.level2, 0.85, 0, 1.5) : 1);
    const T = (x, y) => { let t = base.tone(x, y, cell); if (inv) t = 1 - t; return clamp01(Math.pow(clamp01(t), gamma) * lv); };
    // projected extent of the region in the rotated frame
    const corners = [[R.x, R.y], [R.x + R.w, R.y], [R.x, R.y + R.h], [R.x + R.w, R.y + R.h]].map(([x, y]) => [(x - cxy[0]) * ux + (y - cxy[1]) * uy, (x - cxy[0]) * vx + (y - cxy[1]) * vy]);
    const u0 = Math.min(...corners.map((q) => q[0])), u1 = Math.max(...corners.map((q) => q[0])), v0 = Math.min(...corners.map((q) => q[1])), v1 = Math.max(...corners.map((q) => q[1]));
    const inBox = (x, y, m) => x >= R.x - m && x <= R.x + R.w + m && y >= R.y - m && y <= R.y + R.h + m;
    let body = '';
    if (shape === 'line') {
      // engraved lines along the screen angle, thickness follows tone
      const st = cell * 0.4;
      let d = '';
      for (let j = Math.floor(v0 / cell); j <= Math.ceil(v1 / cell); j++) {
        let top = [], bot = [];
        const flush = () => { if (top.length > 1) d += `M${top.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}L${bot.reverse().map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`; top = []; bot = []; };
        for (let i = Math.floor(u0 / st); i <= Math.ceil(u1 / st); i++) {
          const x = cxy[0] + ux * i * st + vx * j * cell, y = cxy[1] + uy * i * st + vy * j * cell;
          if (!inBox(x, y, cell)) { flush(); continue; }
          const t = T(x, y), th = (cell * 0.5 * Math.sqrt(t)) * 1.02;
          if (t < 0.03) { flush(); continue; }
          top.push([x + vx * th, y + vy * th]); bot.push([x - vx * th, y - vy * th]);
        }
        flush();
      }
      body = d ? `<path d="${d}" fill="${col}"/>` : '';
    } else {
      const bins = new Map();
      for (let j = Math.floor(v0 / cell); j <= Math.ceil(v1 / cell); j++) for (let i = Math.floor(u0 / cell); i <= Math.ceil(u1 / cell); i++) {
        const x = cxy[0] + ux * i * cell + vx * j * cell, y = cxy[1] + uy * i * cell + vy * j * cell;
        if (!inBox(x, y, cell * 0.8)) continue;
        const t = T(x, y);
        if (t < 0.02) continue;
        if (shape === 'dot') {
          const rad = Math.round((cell * 0.72 * Math.sqrt(t)) * 4) / 4; // quantised so dots group by size
          if (rad < 0.3) continue;
          const key = rad; if (!bins.has(key)) bins.set(key, []);
          bins.get(key).push(`M${f(x)} ${f(y)}h0`);
        } else {
          const hs = cell * 0.5 * Math.sqrt(t) * 1.04, key = Math.round(hs * 8) / 8; // rotated square: a round-join stroke would round it, so draw corners
          const px = (a, b) => `${f(x + ux * a + vx * b)} ${f(y + uy * a + vy * b)}`;
          if (!bins.has('sq')) bins.set('sq', []);
          bins.get('sq').push(`M${px(-key, -key)}L${px(key, -key)}L${px(key, key)}L${px(-key, key)}Z`);
        }
      }
      for (const [k, list] of bins) {
        if (k === 'sq') body += `<path d="${list.join('')}" fill="${col}"/>`;
        else body += `<path d="${list.join('')}" stroke="${col}" stroke-width="${f2(k * 2)}" stroke-linecap="round" fill="none"/>`;
      }
    }
    if (body) groups.push(blend === 'multiply' ? `<g style="mix-blend-mode:multiply">${body}</g>` : `<g>${body}</g>`);
  });
  const svg = `${clip.def ? `<defs>${clip.def}</defs>` : ''}<g${clip.attr}>${groups.join('')}</g>`;
  return { svg, bbox: [R.x, R.y, R.w, R.h] };
}

// ---------- camo: marching squares on a seeded fbm grid ----------
// Cell cases: corner bits tl=1, tr=2, br=4, bl=8 (set when the value is above the level). Edges: 0 top, 1 right, 2 bottom, 3 left.
const SEGS = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 1], [2, 3]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], []];
function contours(vals, nx, ny, level, x0, y0, cs) {
  const edgeKey = (i, j, ed) => (ed === 0 ? (j * nx + i) * 2 : ed === 2 ? ((j + 1) * nx + i) * 2 : ed === 3 ? (j * nx + i) * 2 + 1 : (j * nx + i + 1) * 2 + 1);
  const pts = new Map(), segs = [];
  const pointOf = (i, j, ed) => {
    const key = edgeKey(i, j, ed);
    if (!pts.has(key)) {
      const horiz = ed === 0 || ed === 2, ci = horiz ? i : ed === 3 ? i : i + 1, cj = ed === 0 ? j : ed === 2 ? j + 1 : j;
      const a = vals[cj * nx + ci], b = horiz ? vals[cj * nx + ci + 1] : vals[(cj + 1) * nx + ci];
      const t = a === b ? 0.5 : (level - a) / (b - a);
      pts.set(key, horiz ? [x0 + (ci + t) * cs, y0 + cj * cs] : [x0 + ci * cs, y0 + (cj + t) * cs]);
    }
    return key;
  };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const tl = vals[j * nx + i], tr = vals[j * nx + i + 1], br = vals[(j + 1) * nx + i + 1], bl = vals[(j + 1) * nx + i];
    let idx = (tl > level ? 1 : 0) | (tr > level ? 2 : 0) | (br > level ? 4 : 0) | (bl > level ? 8 : 0);
    let cases = SEGS[idx];
    if (idx === 5 || idx === 10) { // saddle: decide by the cell centre so blobs join or stay apart consistently
      const centre = (tl + tr + br + bl) / 4 > level;
      cases = idx === 5 ? (centre ? [[3, 2], [1, 0]] : [[3, 0], [1, 2]]) : (centre ? [[0, 3], [2, 1]] : [[0, 1], [2, 3]]);
    }
    for (const [ea, eb] of cases) segs.push([pointOf(i, j, ea), pointOf(i, j, eb)]);
  }
  const at = new Map();
  segs.forEach((s, k) => { for (const key of s) { if (!at.has(key)) at.set(key, []); at.get(key).push(k); } });
  const used = new Uint8Array(segs.length), rings = [];
  for (let s0 = 0; s0 < segs.length; s0++) {
    if (used[s0]) continue;
    used[s0] = 1;
    const ring = [pts.get(segs[s0][0])];
    let cur = segs[s0][1], guard = 0;
    while (guard++ < 1e6) {
      ring.push(pts.get(cur));
      const next = (at.get(cur) || []).find((k) => !used[k]);
      if (next == null) break;
      used[next] = 1;
      cur = segs[next][0] === cur ? segs[next][1] : segs[next][0];
    }
    if (ring.length > 3) rings.push(ring);
  }
  return rings;
}
function chaikin(ring, n = 2) {
  let p = ring.slice(0, -1); // the last point repeats the first when closed
  if (Math.hypot(ring[0][0] - ring.at(-1)[0], ring[0][1] - ring.at(-1)[1]) > 1e-6) p = ring.slice();
  for (let it = 0; it < n; it++) {
    const q = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = q;
  }
  return p;
}

function camo(e, { c, r, canvas }) {
  const R = region(e, canvas), clip = clipOf(e, R, 'camo');
  const noise = mkNoise(r);
  const scale = num(e.scale, 0.006, 0.0004, 0.2), oct = Math.round(num(e.octaves, 3, 1, 6));
  const fbm = mkFbm(noise, scale, oct);
  const cs = num(e.res, Math.min(16, Math.max(4, 0.07 / scale)), 2, 40);
  const mg = 3; // margin cells beyond the region, plus one outer ring forced "below" so every contour closes
  let nx = Math.ceil(R.w / cs) + mg * 2 + 3, ny = Math.ceil(R.h / cs) + mg * 2 + 3;
  const k0 = Math.max(1, Math.sqrt((nx * ny) / 90000)); // very big areas: coarser grid
  const csz = cs * k0; nx = Math.ceil(R.w / csz) + mg * 2 + 3; ny = Math.ceil(R.h / csz) + mg * 2 + 3;
  const gx0 = R.x - (mg + 1) * csz, gy0 = R.y - (mg + 1) * csz;
  const vals = new Float32Array(nx * ny), inner = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = fbm(gx0 + i * csz, gy0 + j * csz);
    vals[j * nx + i] = i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? -1 : v;
    if (i > mg && j > mg && i < nx - mg && j < ny - mg) inner.push(v);
  }
  inner.sort((a, b) => a - b);
  const quant = (q) => inner[Math.min(inner.length - 1, Math.max(0, Math.floor(clamp01(q) * (inner.length - 1))))];
  const cols = (Array.isArray(e.colors) && e.colors.length ? e.colors : [e.color || 'ink']).slice(0, 4).map((k) => c(k, '#14181F'));
  const th = num(e.threshold, 0.5, 0.02, 0.98), stepT = num(e.levelStep, 0.18, 0.04, 0.5);
  const smooth = Math.round(num(e.smooth, 2, 0, 4));
  const speck = num(e.speckle, 0, 0, 1), speckSize = num(e.speckleSize, 2.2, 0.5, 12);
  let body = '', defs = '';
  if (e.ground) body += `<rect x="${f(R.x)}" y="${f(R.y)}" width="${f(R.w)}" height="${f(R.h)}" fill="${c(e.ground, '#CFC9B8')}"/>`;
  cols.forEach((col, li) => {
    const level = quant(th + li * stepT);
    // the contour level for the fill: values above `level` are blob. The padding ring sits below, so rings close.
    const rings = contours(vals, nx, ny, level, gx0, gy0, csz).map((rg) => (smooth ? chaikin(rg, smooth) : rg));
    if (!rings.length) return;
    const d = rings.map((rg) => `M${rg.map(([x, y]) => `${f(x)} ${f(y)}`).join('L')}Z`).join('');
    let fill = `<path d="${d}" fill="${col}" fill-rule="evenodd"/>`;
    if (speck > 0) {
      // torn print: specks fly off the edge, small holes bite into it
      const outDots = [], holes = [], per = Math.max(1, Math.round(6 / speck));
      const reach = Math.min(csz * 4, 18 + speckSize * 6) * (0.6 + speck);
      for (const rg of rings) for (let i = 0; i < rg.length; i += per) {
        const [x, y] = rg[i], [x2, y2] = rg[(i + 1) % rg.length], tx = x2 - x, ty = y2 - y, tl = Math.hypot(tx, ty) || 1;
        const nxv = -ty / tl, nyv = tx / tl, dist = Math.abs(gauss(r)) * reach * 0.45, rad = Math.max(0.5, speckSize * (0.25 + r.next() ** 2 * 0.9));
        const side = r.next() < 0.5 ? 1 : -1;
        (side > 0 ? outDots : holes).push([x + nxv * dist * side, y + nyv * dist * side, rad]);
      }
      const dot = ([x, y, q], col2) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f2(q)}" fill="${col2}"/>`;
      const id = `pcm${hash(`${R.x},${R.y},${li},${e.seed ?? ''},${cols.join()}`)}`;
      defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="${f(R.x - 40)}" y="${f(R.y - 40)}" width="${f(R.w + 80)}" height="${f(R.h + 80)}"><rect x="${f(R.x - 40)}" y="${f(R.y - 40)}" width="${f(R.w + 80)}" height="${f(R.h + 80)}" fill="#fff"/>${holes.map((h) => dot(h, '#000')).join('')}</mask>`;
      fill = `<g mask="url(#${id})">${fill}</g>${outDots.map((o) => dot(o, col)).join('')}`;
    }
    body += fill;
  });
  const svg = `<defs>${clip.def}${defs}</defs><g${clip.attr}>${body}</g>`;
  return { svg, bbox: [R.x, R.y, R.w, R.h] };
}

// ---------- grain ----------
function grain(e, { c, r, canvas }) {
  const R = e.w == null && e.h == null && e.r == null && e.x == null ? { x: 0, y: 0, w: canvas.w, h: canvas.h, disc: false } : region(e, canvas);
  const clip = clipOf(e, R, 'grain');
  const toner = e.mode === 'toner';
  const dens = num(e.density, toner ? 3 : 8, 0.05, 80), size = num(e.size, toner ? 1.4 : 1.1, 0.3, 12), op = num(e.opacity, toner ? 0.8 : 0.35, 0.02, 1);
  const cols = (Array.isArray(e.colors) && e.colors.length ? e.colors : [e.color || 'ink']).slice(0, 4).map((k) => c(k, '#14181F'));
  const total = Math.min(150000, Math.round((R.w * R.h / 1000) * dens));
  const buckets = new Map(); // colour x size bucket x opacity bucket -> dot positions (stroke-linecap round, zero length)
  const add = (x, y, s, col) => {
    const sb = Math.max(0.4, Math.round(s * 4) / 4), ob = r.next() < 0.5 ? 0.55 : r.next() < 0.6 ? 0.8 : 1, key = `${col}|${sb}|${ob}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(`M${f(x)} ${f(y)}h0`);
  };
  const pick = () => cols[Math.floor(r.next() * cols.length)];
  if (!toner) {
    for (let i = 0; i < total; i++) add(R.x + r.next() * R.w, R.y + r.next() * R.h, size * (0.35 + r.next() ** 3 * 1.8), pick());
  } else {
    const per = Math.max(3, Math.round(num(e.cluster, 14, 3, 80))), spread = num(e.spread, 11, 1, 80);
    const clusters = Math.ceil((total * 0.8) / per);
    for (let k = 0; k < clusters; k++) {
      const cx = R.x + r.next() * R.w, cy = R.y + r.next() * R.h, col = pick(), sp = spread * (0.4 + r.next() * 1.2), n = Math.ceil(per * (0.3 + r.next() * 1.4));
      for (let i = 0; i < n; i++) add(cx + gauss(r) * sp, cy + gauss(r) * sp * 0.8, size * (0.35 + r.next() ** 2 * 1.7), col);
    }
    for (let i = 0; i < total * 0.2; i++) add(R.x + r.next() * R.w, R.y + r.next() * R.h, size * (0.3 + r.next() * 0.9), pick()); // lone specks
    // a few photocopier streaks: long hairlines drifting down the page
    const streaks = Math.round(num(e.streaks, 0, 0, 40)), sw = [];
    for (let i = 0; i < streaks; i++) {
      const x = R.x + r.next() * R.w, y0 = R.y + r.next() * R.h * 0.6, len = R.h * (0.1 + r.next() * 0.5), col = pick();
      sw.push(`<path d="M${f(x)} ${f(y0)}L${f(x + gauss(r) * 6)} ${f(Math.min(R.y + R.h, y0 + len))}" stroke="${col}" stroke-width="${f2(size * 0.45)}" stroke-opacity="${f2(op * 0.45)}" fill="none"/>`);
    }
    buckets.streaks = sw.join('');
  }
  let body = '';
  for (const [key, list] of buckets) {
    if (key === 'streaks') continue;
    const [col, sb, ob] = key.split('|');
    body += `<path d="${list.join('')}" stroke="${col}" stroke-width="${sb * 2 > 0 ? f2(Number(sb) * 2) : 1}" stroke-opacity="${f2(op * Number(ob))}" stroke-linecap="round" fill="none"/>`;
  }
  const svg = `${clip.def ? `<defs>${clip.def}</defs>` : ''}<g${clip.attr}>${body}${buckets.streaks || ''}</g>`;
  return { svg, bbox: null };
}

export const PRINT_ASSETS = { amtone, camo, grain };

// ---------- element-level screen ----------
// compose.mjs hands over the SVG of one element (already drawn); it is rendered alone on a transparent canvas,
// printed through the same ordered-dither pass as the scene-level `screen`, and put back as an embedded image,
// masked by the element's own alpha. `box` ([x, y, w, h]) limits the raster to the element's area.
export async function printScreen(inner, screen, canvas, box) {
  const o = resolveScreen(screen);
  if (!o) throw new Error(`unknown screen preset "${screen}"`);
  const cell = Math.max(2, Math.min(64, Math.round(Number(o.cell) || 6)));
  let [bx, by, bw, bh] = box || [0, 0, canvas.w, canvas.h];
  const x0 = Math.max(0, Math.floor((bx - cell) / cell) * cell), y0 = Math.max(0, Math.floor((by - cell) / cell) * cell);
  const x1 = Math.min(canvas.w, Math.ceil((bx + bw + cell) / cell) * cell), y1 = Math.min(canvas.h, Math.ceil((by + bh + cell) / cell) * cell);
  const w = Math.round(x1 - x0), h = Math.round(y1 - y0);
  if (w < 2 || h < 2) return '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.w}" height="${canvas.h}" viewBox="0 0 ${canvas.w} ${canvas.h}">${inner}</svg>`;
  const rgba = await sharp(Buffer.from(svg)).extract({ left: Math.round(x0), top: Math.round(y0), width: w, height: h }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) alpha[i] = rgba.data[i * 4 + 3];
  const paper = /^#[0-9a-f]{6}$/i.test(o.paper || '') ? o.paper : '#F4F2EC';
  // the printed picture sees the element over its own paper colour
  const flat = await sharp(Buffer.from(svg)).extract({ left: Math.round(x0), top: Math.round(y0), width: w, height: h }).flatten({ background: paper }).png().toBuffer();
  const printed = await screenRaster(flat, screen);
  // keep a cell only where the element covers at least half of it (cell-sized hard mask)
  const cellMask = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).resize(Math.ceil(w / cell), Math.ceil(h / cell), { kernel: 'cubic', fit: 'fill' }).threshold(110).resize(Math.ceil(w / cell) * cell, Math.ceil(h / cell) * cell, { kernel: 'nearest' }).extract({ left: 0, top: 0, width: w, height: h }).toBuffer();
  const rgb = await sharp(printed).removeAlpha().raw().toBuffer();
  const rgbaOut = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgbaOut[i * 4] = rgb[i * 3]; rgbaOut[i * 4 + 1] = rgb[i * 3 + 1]; rgbaOut[i * 4 + 2] = rgb[i * 3 + 2]; rgbaOut[i * 4 + 3] = cellMask[i]; }
  const png = await sharp(rgbaOut, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  return `<image x="${f(x0)}" y="${f(y0)}" width="${w}" height="${h}" preserveAspectRatio="none" image-rendering="pixelated" href="data:image/png;base64,${png.toString('base64')}"/>`;
}
