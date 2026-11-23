// glyphfill: fill a silhouette with a character grid whose density follows tone (the "@%#*+=-:." look).
// Silhouette = a library prop (point-in-polygon on its flattened paths, strokes by distance to the segments, so it
// stays synchronous and needs no raster pass) or a primitive (circle, sphere, rect, ring, star).
// Tone = paint (darkness for ink glyphs, brightness for light glyphs) x optional light ramp; a `sphere` is shaded
// with a real light (terminator, core shadow, rim light) and optional land. Ink outlines and silhouette rims are
// drawn by a separate outline pass that picks `- \ | /` from the local stroke angle, so line art stays readable.
// Output modes: glyph (characters), block (squares in opacity steps), dot (dot matrix, radius follows tone).
import { flattenPath } from './ink.mjs';
import { findProp } from './props.mjs';

const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n) => Math.round(n * 10) / 10;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const RAMP = ' .:-=+*#%@';
const MAX_CELLS = 30000;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function lum(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 0.5;
  const n = parseInt(m[1], 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

// winding-number point in polygon (closed implicitly)
function inside(poly, x, y) {
  let w = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [x1, y1] = poly[j], [x2, y2] = poly[i];
    if (y1 <= y) { if (y2 > y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) > 0) w++; }
    else if (y2 <= y && (x2 - x1) * (y - y1) - (x - x1) * (y2 - y1) < 0) w--;
  }
  return w !== 0;
}
function segDist2(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? clamp01(((px - ax) * dx + (py - ay) * dy) / l2) : 0;
  return (px - ax - t * dx) ** 2 + (py - ay - t * dy) ** 2;
}

// ---------- silhouette sources: each returns { hit(x, y) -> null | {lum, line?, ang?, score?, shade?}, box: [x, y, w, h] } ----------

export function propSource(e, c, size, cell) {
  const p = findProp(e.prop);
  if (!p) throw new Error(`glyphfill: no prop "${e.prop}" (levni list)`);
  const v = p.variants[Math.min(p.variants.length - 1, Math.max(0, Math.floor(num(e.variant, 0, 0, 99))))];
  const k = size / 100;
  const only = Array.isArray(e.paths) ? new Set(e.paths) : null; // paths: indices of the prop's paths to keep (drop a stand, a shadow)
  const layers = v.paths.filter((_, i) => !only || only.has(i)).map((pt) => {
    const polys = flattenPath(pt.d, 1.6).map((poly) => { const q = poly.map(([x, y]) => [e.flip ? 100 - x : x, y]); q.closed = poly.closed; return q; });
    const fillCol = pt.fill && pt.fill !== 'none' ? c(pt.fill) : null;
    const strokeCol = pt.stroke !== 'none' ? c(pt.stroke || 'ink') : null;
    const sw = ((pt.weight ?? 10) / k) / 2; // weight is in screen px in the engine: half-width in the 0..100 box
    const bb = polys.flat().reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [1e9, 1e9, -1e9, -1e9]);
    return { polys, fill: fillCol, stroke: strokeCol, sw, bb, fl: fillCol ? lum(fillCol) : 0, sl: strokeCol ? lum(strokeCol) : 0 };
  });
  if (!layers.length) throw new Error('glyphfill: no paths left (check "paths")');
  let ox, oy, s = k;
  if (e.fit !== false) { // scale the visible ink (not the 0..100 box) to `size` on its longer side
    const bb = layers.reduce((b, l) => [Math.min(b[0], l.bb[0] - l.sw), Math.min(b[1], l.bb[1] - l.sw), Math.max(b[2], l.bb[2] + l.sw), Math.max(b[3], l.bb[3] + l.sw)], [1e9, 1e9, -1e9, -1e9]);
    const m = Math.max(bb[2] - bb[0], bb[3] - bb[1], 1);
    s = size / m;
    ox = e.x - ((bb[0] + bb[2]) / 2) * s; oy = e.y - ((bb[1] + bb[3]) / 2) * s;
    for (const l of layers) l.sw = (l.sw * k) / s; // strokes were sized for k, re-express in the new scale
  } else { ox = e.x - size / 2; oy = e.y - size / 2; }
  // outlines thinner than ~1 cell would vanish in a character grid: widen them to `minLine` cells
  const minSw = (num(e.minLine, 0.9, 0.3, 3) * cell) / 2 / s;
  for (const l of layers) if (l.stroke && l.sw < minSw) l.sw = minSw;
  for (const l of layers) l.sw2 = l.sw * l.sw;
  const full = e.fit !== false ? layers.reduce((b, l) => [Math.min(b[0], l.bb[0]), Math.min(b[1], l.bb[1]), Math.max(b[2], l.bb[2]), Math.max(b[3], l.bb[3])], [1e9, 1e9, -1e9, -1e9]) : [0, 0, 100, 100];
  const box = [ox + full[0] * s, oy + full[1] * s, (full[2] - full[0]) * s, (full[3] - full[1]) * s];
  const hit = (X, Y) => {
    const x = (X - ox) / s, y = (Y - oy) / s;
    for (let li = layers.length - 1; li >= 0; li--) {
      const l = layers[li];
      if (x < l.bb[0] - l.sw || x > l.bb[2] + l.sw || y < l.bb[1] - l.sw || y > l.bb[3] + l.sw) continue;
      if (l.stroke && l.sw > 0) {
        let best = Infinity, ba = 0;
        for (const poly of l.polys) {
          const n = poly.length + (poly.closed ? 1 : 0);
          for (let i = 1; i < n; i++) {
            const a = poly[i - 1], b = poly[i % poly.length];
            const d2 = segDist2(x, y, a, b);
            if (d2 < best) { best = d2; ba = Math.atan2(b[1] - a[1], b[0] - a[0]); }
          }
        }
        if (best <= l.sw2) return { lum: l.sl, line: true, ang: ba, score: 1 - Math.sqrt(best) / l.sw };
      }
      if (l.fill && l.polys.some((poly) => poly.length > 2 && inside(poly, x, y))) return { lum: l.fl };
    }
    return null;
  };
  return { hit, box };
}

function primSource(e, c, size, noise, t, ink) {
  const w = num(e.w, size, 4, 6000), h = num(e.h, size, 4, 6000), cx = e.x, cy = e.y;
  const box = [cx - w / 2, cy - h / 2, w, h];
  const shape = e.shape || 'circle';
  if (!['circle', 'sphere', 'ring', 'rect', 'star'].includes(shape)) throw new Error(`glyphfill: unknown shape "${shape}" (circle, sphere, ring, rect, star)`);
  let sp = null;
  if (shape === 'star') {
    const n = Math.round(num(e.points, 5, 3, 24)), inner = num(e.inner, 0.45, 0.1, 0.95);
    sp = [];
    for (let i = 0; i < n * 2; i++) { const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? inner : 1; sp.push([cx + Math.cos(a) * rr * w / 2, cy + Math.sin(a) * rr * h / 2]); }
  }
  // sphere: Lambert light with a soft terminator, a touch of rim light, optional land (seamless noise on lon/lat)
  const L = e.light || {};
  const la = (num(L.angle, 225, -720, 720) * Math.PI) / 180, le = (num(L.elev, 30, 0, 85) * Math.PI) / 180;
  const lx = Math.cos(la) * Math.cos(le), ly = Math.sin(la) * Math.cos(le), lz = Math.sin(le);
  const land = num(e.land, 0, 0, 1), rot = num(e.spin, 0.9, -20, 20) + t * Math.PI * 2;
  const landN = (lon, lat) => {
    const a = Math.cos(lon) * 1.15, b = Math.sin(lon) * 1.15 + lat * 1.7;
    return (noise(a, b) + 0.5 * noise(a * 2.1 + 9, b * 2.1 + 3)) / 1.5;
  };
  let thr = 0;
  if (shape === 'sphere' && land > 0) { // pick the threshold so `land` is the share of the surface that is land
    const vals = [];
    for (let i = 0; i < 24; i++) for (let j = 1; j < 24; j++) vals.push(landN((i / 24) * Math.PI * 2, Math.asin(-1 + (2 * j) / 24)));
    vals.sort((a, b) => a - b);
    thr = vals[Math.min(vals.length - 1, Math.floor((1 - land) * vals.length))];
  }
  const hit = (x, y) => {
    const u = (x - cx) / (w / 2), v = (y - cy) / (h / 2), r2 = u * u + v * v;
    if (shape === 'circle') return r2 <= 1 ? { lum: 0.5 } : null;
    if (shape === 'ring') { const d = Math.sqrt(r2); return d <= 1 && d >= num(e.hole, 0.62, 0.05, 0.98) ? { lum: 0.5 } : null; }
    if (shape === 'rect') return Math.abs(u) <= 1 && Math.abs(v) <= 1 ? { lum: 0.5 } : null;
    if (shape === 'star') return inside(sp, x, y) ? { lum: 0.5 } : null;
    if (r2 > 1) return null;
    const nz = Math.sqrt(1 - r2), lam = u * lx + v * ly + nz * lz;
    const core = smooth(-0.07, 0.1, lam); // terminator: lit side switches on within a few cells
    let b = 0.05 + 0.95 * core * (0.3 + 0.7 * clamp01(lam)) + 0.12 * Math.pow(1 - nz, 2.6) * (1 - core);
    const m = land > 0 ? smooth(thr - 0.035, thr + 0.035, landN(Math.atan2(u, nz) + rot, Math.asin(Math.max(-1, Math.min(1, v))))) : 0.5;
    return { lum: clamp01(b), land: m, shade: true };
  };
  return { hit, box, rim: shape !== 'rect' };
}

// light ramp over the silhouette box: radial (highlight at cx, cy in 0..1 of the box) or linear (angle, 90 = top to bottom)
function lightAt(L, box, x, y, t) {
  if (!L) return 1;
  const [bx, by, bw, bh] = box, from = num(L.from, 1, 0, 2), to = num(L.to, 0.25, 0, 2), sw = Math.sin(t * Math.PI * 2);
  let u;
  if (L.mode === 'linear') {
    const a = ((num(L.angle, 90, -720, 720) + 25 * sw) * Math.PI) / 180, dx = Math.cos(a), dy = Math.sin(a);
    const span = Math.abs(bw * dx) + Math.abs(bh * dy) || 1;
    const start = (dx < 0 ? bw : 0) * dx + (dy < 0 ? bh : 0) * dy;
    u = ((x - bx) * dx + (y - by) * dy - start) / span;
  } else {
    const cx = bx + bw * (num(L.cx, 0.35, -1, 2) + 0.1 * sw), cy = by + bh * num(L.cy, 0.3, -1, 2);
    u = Math.hypot(x - cx, y - cy) / (num(L.radius, 0, 0, 1e5) || Math.hypot(bw, bh) * 0.62);
  }
  return from + (to - from) * clamp01(u);
}

// stroke angle (radians, y down) -> glyph. Junctions and curls with no clear direction become '+'.
function lineGlyph(ang, coh, set) {
  if (coh < 0.42) return set[4];
  const d = ((ang * 180) / Math.PI + 360) % 180; // 0 = flat, 90 = upright, 45 = down-right
  if (d < 22.5 || d >= 157.5) return set[0];
  if (d < 67.5) return set[1];
  if (d < 112.5) return set[2];
  return set[3];
}

function glyphfillAsset(e, { r, c, noise, t = 0 }) {
  const mode = ['glyph', 'block', 'dot'].includes(e.mode) ? e.mode : 'glyph';
  const size = num(e.size, 400, 8, 4000);
  const color = c(e.color, '#E8E4D8');
  const shape = e.prop ? null : (e.shape || 'circle');
  const glow = e.shade === 'glow' ? true : e.shade === 'ink' ? false : lum(color) >= 0.5; // light glyphs glow, dark glyphs ink
  let cell = num(e.cell, 9, 3, 200);
  const approx = (size * size * (shape === 'rect' || e.prop ? 1.3 : 1)) / (cell * cell * (mode === 'glyph' ? 1.75 : 1));
  if (approx > MAX_CELLS * 0.8) cell *= Math.sqrt(approx / (MAX_CELLS * 0.8)); // silly sizes: coarsen instead of looping forever
  const src = e.prop ? propSource(e, c, size, cell) : primSource({ shape: 'circle', ...e, shape }, c, size, noise, t, !glow);
  const [bx, by, bw, bh] = src.box;
  const cw = cell, ch = mode === 'glyph' ? cell * num(e.aspect, 1.75, 1, 3) : cell;
  const ramp = String(e.chars ?? e.ramp ?? RAMP) || RAMP;
  const accent = e.accent ? c(e.accent) : null, share = num(e.accentShare, 0.05, 0, 1);
  const tone = e.tone === 'flat' ? 'flat' : 'prop';
  const sphere = shape === 'sphere';
  const edge = num(e.edge, sphere ? 0 : 0.2, 0, 1);
  const lineBoost = num(e.lines, 0.35, 0, 1);
  const outline = e.outline !== false;
  const rimOn = e.rim ?? !!src.rim; // silhouette rim of primitives (props already have inked outlines)
  const lineSet = (typeof e.lineChars === 'string' && e.lineChars.length >= 5 ? e.lineChars : '-\\|/+');
  const field = num(e.field, 0, 0, 1);
  const gamma = num(e.gamma, 1, 0.2, 5);
  const jitter = num(e.jitter, 0.03, 0, 0.5);
  const pad = Math.max(cw, ch) * 2;
  const gx0 = Math.floor((bx - (field ? 0 : pad)) / cw) * cw, gy0 = Math.floor((by - (field ? 0 : pad)) / ch) * ch;
  const cols = Math.min(400, Math.ceil((bw + pad * 2) / cw)), rows = Math.min(400, Math.ceil((bh + pad * 2) / ch));
  const N = cols * rows;
  // pass 1: tone grid (3x3 supersample for coverage so edges stay smooth) + stroke direction
  const T = new Float32Array(N), COV = new Float32Array(N), LN = new Float32Array(N), LS = new Float32Array(N);
  const C2 = new Float32Array(N), S2 = new Float32Array(N);
  const ss = [-1 / 3, 0, 1 / 3];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let n = 0, sum = 0, ln = 0, ls = 0, c2 = 0, s2 = 0;
    for (const a of ss) for (const b of ss) {
      const h = src.hit(gx0 + (i + 0.5 + a) * cw, gy0 + (j + 0.5 + b) * ch);
      if (!h) continue;
      n++;
      if (tone === 'flat') sum += 0.75;
      else if (h.shade) sum += clamp01(0.14 + 0.72 * (glow ? h.lum : 1 - h.lum) + 0.2 * h.land - 0.1); // land is denser: darker ink, brighter glow
      else sum += clamp01(0.22 + 0.7 * clamp01(((glow ? h.lum : 1 - h.lum) - 0.15) * 1.5) + (h.line ? lineBoost : 0));
      if (h.line) { ln++; ls += h.score; c2 += Math.cos(2 * h.ang); s2 += Math.sin(2 * h.ang); }
    }
    const k = j * cols + i;
    COV[k] = n / 9; T[k] = n ? sum / n : 0; LN[k] = ln; LS[k] = ls; C2[k] = c2; S2[k] = s2;
  }
  // cleanup: cells less than a quarter (primitives: a third) covered are dropped, so no stray half-glyphs hang off the edge
  for (let k = 0; k < N; k++) if (COV[k] < (rimOn ? 0.34 : 0.25)) { COV[k] = 0; T[k] = 0; LN[k] = 0; }
  const at = (i, j) => (i < 0 || j < 0 || i >= cols || j >= rows ? 0 : COV[j * cols + i]);
  // outline pass: GL[k] = a direction glyph for cells that sit on an inked stroke or on the silhouette rim
  const lineCell = (k) => LN[k] >= 3 && LN[k] >= COV[k] * 9 * 0.3;
  const GL = new Array(N).fill(null);
  if (outline && mode === 'glyph') {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      if (COV[k] <= 0.12) continue;
      if (lineCell(k)) {
        const coh = Math.hypot(C2[k], S2[k]) / LN[k], ang = 0.5 * Math.atan2(S2[k], C2[k]);
        const g = lineGlyph(ang, coh, lineSet);
        // thin out double-thick runs: keep the cell closest to the stroke centre among its cross-direction neighbours
        const nb = g === lineSet[0] ? [[0, -1], [0, 1]] : g === lineSet[2] ? [[-1, 0], [1, 0]] : g === lineSet[4] ? [[0, -1], [0, 1], [-1, 0], [1, 0]] : [];
        let keep = true;
        for (const [di, dj] of nb) {
          const ii = i + di, jj = j + dj;
          if (ii < 0 || jj < 0 || ii >= cols || jj >= rows) continue;
          const o = LS[jj * cols + ii] / Math.max(1, LN[jj * cols + ii]), me = LS[k] / LN[k];
          if (lineCell(jj * cols + ii) && (o > me + 1e-6 || (Math.abs(o - me) < 1e-6 && (dj < 0 || di < 0)))) keep = false;
        }
        if (g === lineSet[4] && LN[k] < 5) keep = false; // a '+' needs a real junction
        // a thinned-out cell inside the shape falls back to the fill glyph; a fringe cell stays empty (its neighbour owns the line)
        GL[k] = keep ? g : COV[k] < 0.9 ? '' : null;
      } else if (rimOn && (at(i - 1, j) <= 0.12 || at(i + 1, j) <= 0.12 || at(i, j - 1) <= 0.12 || at(i, j + 1) <= 0.12)) {
        // tangent of the silhouette from the coverage gradient (px space); keep one cell per step, not a double line
        const gx = (at(i + 1, j - 1) + 2 * at(i + 1, j) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i - 1, j) - at(i - 1, j + 1)) / cw;
        const gy = (at(i - 1, j + 1) + 2 * at(i, j + 1) + at(i + 1, j + 1) - at(i - 1, j - 1) - 2 * at(i, j - 1) - at(i + 1, j - 1)) / ch;
        if (Math.hypot(gx, gy) <= 1e-6) continue;
        const sideEmpty = at(i - 1, j) <= 0.12 || at(i + 1, j) <= 0.12, topEmpty = at(i, j - 1) <= 0.12 || at(i, j + 1) <= 0.12;
        if (Math.abs(gx) > Math.abs(gy) * 1.4 ? !sideEmpty : Math.abs(gy) > Math.abs(gx) * 1.4 ? !topEmpty : false) continue;
        GL[k] = lineGlyph(Math.atan2(gx, -gy), 1, lineSet);
      }
    }
  }
  const isLine = (k) => (outline && mode === 'glyph' ? !!GL[k] : lineCell(k));
  const dens = (i, j) => {
    const k = j * cols + i, cov = COV[k];
    const x = gx0 + (i + 0.5) * cw, y = gy0 + (j + 0.5) * ch;
    if (cov <= 0.12) {
      if (!field) return 0;
      const nz = noise(x * 0.01, y * 0.01) * 0.5 + 0.5;
      return field * (0.4 + 0.6 * nz) * (0.6 + 0.8 * r.next());
    }
    if (isLine(k) && !sphere) return 1; // an inked outline is always full strength
    let d = T[k] * (sphere ? 1 : lightAt(e.light, src.box, x, y, t));
    if (edge) {
      let nb = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (at(i + di, j + dj) <= 0.12) nb++;
      if (nb) d = d + (1 - d) * edge * Math.min(1, nb / 3);
    }
    d *= 0.6 + 0.4 * cov; // partial cells fade
    d += ((BAYER[(j & 3) * 4 + (i & 3)] + 0.5) / 16 - 0.5) * jitter; // ordered dither: stable bands, no random speckle
    return Math.pow(clamp01(d), gamma);
  };
  // accents: a handful of cells, evenly spread (minimum spacing), never on outlines. Few and deliberate, not noise.
  const accentCells = new Set();
  const D = new Float32Array(N);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) D[j * cols + i] = dens(i, j);
  if (accent && share > 0 && mode !== 'block') {
    const cand = [];
    for (let k = 0; k < N; k++) if (D[k] > 0.4 && COV[k] > 0.9 && GL[k] === null && !isLine(k)) cand.push(k);
    const want = Math.min(Math.round(num(e.accentMax, 14, 0, 200)), Math.max(1, Math.round(cand.length * share * 0.3)));
    const gap = num(e.accentGap, 6, 2, 50), picked = [];
    for (let n = cand.length - 1; n > 0; n--) { const m = Math.floor(r.next() * (n + 1)); [cand[n], cand[m]] = [cand[m], cand[n]]; }
    for (const k of cand) {
      if (picked.length >= want) break;
      const i = k % cols, j = (k / cols) | 0;
      if (picked.every(([pi, pj]) => Math.hypot(i - pi, (j - pj) * (ch / cw)) >= gap)) { picked.push([i, j]); accentCells.add(k); }
    }
  } else if (accent && share > 0 && mode === 'block') {
    // blocks: accent a few cells the same way
    const cand = [];
    for (let k = 0; k < N; k++) if (D[k] > 0.4 && COV[k] > 0.9) cand.push(k);
    for (let n = Math.min(cand.length, Math.round(num(e.accentMax, 14, 0, 200))); n > 0; n--) accentCells.add(cand[Math.floor(r.next() * cand.length)]);
  }
  const out = [];
  if (mode === 'glyph') {
    const fs = num(e.font, cell / 0.6, 4, 400), base = ch / 2 + 0.33 * fs;
    const rowsOut = [], accents = [];
    const lenAdj = ` lengthAdjust="spacing"`;
    for (let j = 0; j < rows; j++) {
      let line = '';
      for (let i = 0; i < cols; i++) {
        const k = j * cols + i, d = D[k];
        let chr = ' ';
        if (GL[k] !== null) chr = GL[k] || ' ';
        else if (d > 0.04) chr = ramp[Math.min(ramp.length - 1, Math.floor(clamp01(d) * ramp.length))];
        if (accentCells.has(k) && chr !== ' ') { accents.push(`<text x="${f(gx0 + i * cw)}" y="${f(gy0 + j * ch + base)}">${esc(chr)}</text>`); chr = ' '; }
        line += chr;
      }
      const trimmed = line.replace(/\s+$/, ''), lead = trimmed.length - trimmed.replace(/^\s+/, '').length, body = trimmed.slice(lead);
      // textLength pins the advance to the cell width, so the grid stays exact at any zoom and in any fallback font
      if (body) rowsOut.push(`<text x="${f(gx0 + lead * cw)}" y="${f(gy0 + j * ch + base)}" textLength="${f(body.length * cw)}"${lenAdj} xml:space="preserve">${esc(body)}</text>`);
    }
    out.push(`<!--crisp--><g ${MONO} font-size="${f(fs)}" fill="${color}">${rowsOut.join('')}</g>${accents.length ? `<g ${MONO} font-size="${f(fs)}" fill="${accent}">${accents.join('')}</g>` : ''}<!--/crisp-->`);
  } else {
    // block / dot: quantise tone into steps so equal cells merge into one group
    const steps = Math.round(num(e.steps, 5, 2, 12)), groups = Array.from({ length: steps + 1 }, () => []), acc = [];
    const g = num(e.gap, 0.12, 0, 0.8);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, line = isLine(k) && !sphere;
      const d = D[k];
      if (d < 0.07 && !line) continue;
      const q = line ? steps : Math.max(1, Math.round(clamp01(d) * steps));
      const px = gx0 + (i + 0.5) * cw, py = gy0 + (j + 0.5) * ch;
      let s;
      // dot fills stay smaller than the outline dots, so the outline reads
      if (mode === 'dot') { const rad = (cell / 2) * (line || accentCells.has(k) ? 1 : 0.2 + 0.55 * (q / steps)) * (1 - g * 0.5); s = `<circle cx="${f(px)}" cy="${f(py)}" r="${f(rad)}"/>`; }
      else { const sz = cell * (1 - g); s = `<rect x="${f(px - sz / 2)}" y="${f(py - sz / 2)}" width="${f(sz)}" height="${f(sz)}"/>`; }
      (accentCells.has(k) ? acc : groups[q]).push(s);
    }
    groups.forEach((gr, q) => {
      if (!gr.length) return;
      const op = mode === 'dot' ? 1 : 0.22 + 0.78 * (q / steps);
      out.push(`<g fill="${color}" fill-opacity="${f(op * 100) / 100}">${gr.join('')}</g>`);
    });
    if (acc.length) out.push(`<g fill="${accent}">${acc.join('')}</g>`);
  }
  return { svg: `<g shape-rendering="${mode === 'block' ? 'crispEdges' : 'auto'}">${out.join('')}</g>`, bbox: [bx, by, bw, bh] };
}

export const GLYPHFILL_ASSETS = { glyphfill: glyphfillAsset };
