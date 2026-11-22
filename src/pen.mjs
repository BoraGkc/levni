// Drawing primitives: hand-wobbled lines and blobs. Everything returns SVG strings.
// With `hand` (default) every stroke is drawn as a filled pressure-brush shape (ink.mjs) instead of a
// uniform SVG stroke. Ink randomness is seeded from the points themselves, so switching it on or off
// does not change any other random choice in a scene.
import { PALETTE, rng } from './style.mjs';
import { inkLine } from './ink.mjs';
import { smooth } from './assets.mjs';

const f = (n) => Math.round(n * 10) / 10;

export function makePen(r, { hand = true } = {}) {
  // Catmull-Rom through jittered points -> cubic Bezier path data.
  function d(pts, { amp = 1.6, closed = false } = {}) {
    const p = pts.map(([x, y]) => [x + r.jitter(amp), y + r.jitter(amp)]);
    const n = p.length;
    if (n < 2) return '';
    const at = (i) => (closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]);
    let s = `M${f(p[0][0])},${f(p[0][1])}`;
    const segs = closed ? n : n - 1;
    for (let i = 0; i < segs; i++) {
      const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
      s += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
    }
    return closed ? s + 'Z' : s;
  }

  // Same jitter as d(), so hand and plain modes consume the scene RNG identically.
  const jittered = (pts, amp = 1.6) => pts.map(([x, y]) => [x + r.jitter(amp), y + r.jitter(amp)]);

  function inkPath(p, w, closed, color) {
    const seed = Math.floor(Math.abs(p[0][0] * 7.3 + p[0][1] * 13.1 + p.length * 31.7 + w * 3)) + 1;
    const sm = closed ? smooth([...p, p[0]], 5).slice(0, -1) : smooth(p, 5);
    return `<path d="${inkLine(sm, { width: w * 1.14, closed, r: rng(seed), jit: 0.8 })}" fill="${color}"/>`;
  }

  function line(pts, { color = PALETTE.ink, w = 10, amp, closed = false } = {}) {
    if (hand && w >= 2.5 && pts.length > 1) return inkPath(jittered(pts, amp), w, closed, color);
    return `<path d="${d(pts, { amp, closed })}" fill="none" stroke="${color}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // Filled shape. Fill and outline are jittered separately and the fill is nudged a little,
  // like two passes of a hand that never quite line up.
  function shape(pts, { fill = PALETTE.white, stroke = PALETTE.ink, w = 10, amp = 1.4, offset = 2.5 } = {}) {
    let out = '';
    if (fill && fill !== 'none') {
      const dx = r.jitter(offset), dy = r.jitter(offset);
      out += `<path d="${d(pts.map(([x, y]) => [x + dx, y + dy]), { amp, closed: true })}" fill="${fill}"/>`;
    }
    if (stroke) {
      if (hand && w >= 2.5) out += inkPath(jittered(pts, amp), w, true, stroke);
      else out += `<path d="${d(pts, { amp, closed: true })}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linejoin="round"/>`;
    }
    return out;
  }

  const dot = (x, y, rad, color = PALETTE.ink) => `<circle cx="${f(x + r.jitter(0.6))}" cy="${f(y + r.jitter(0.6))}" r="${f(rad)}" fill="${color}"/>`;

  return { d, line, shape, dot };
}

// Points on an ellipse; `k` controls how lumpy it looks once jittered.
export const ellipse = (cx, cy, rx, ry, k = 12, rot = 0) =>
  Array.from({ length: k }, (_, i) => {
    const t = (i / k) * Math.PI * 2 + rot;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  });

// Points along an arc from angle a0 to a1 (radians).
export const arc = (cx, cy, rx, ry, a0, a1, k = 8) =>
  Array.from({ length: k + 1 }, (_, i) => {
    const t = a0 + ((a1 - a0) * i) / k;
    return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)];
  });

// Rectangle as dense points, so smoothing keeps the corners crisp (panels, papers, screens).
export function box(x0, y0, x1, y1, step = 28) {
  const pts = [];
  const edge = (ax, ay, bx, by) => {
    const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
    for (let i = 0; i < n; i++) pts.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
  };
  edge(x0, y0, x1, y0); edge(x1, y0, x1, y1); edge(x1, y1, x0, y1); edge(x0, y1, x0, y0);
  return pts;
}
