// Procedural assets: everything here is drawn from math (noise, recursion, polar curves, sampling),
// then finished by the same crayon filter as the rest of the engine. Each asset is a compose element type.
// Every asset takes `t` (0..1, default 0) so the animation renderer can move it deterministically.
import { GLYPHFILL_ASSETS } from './glyphfill.mjs';
import { box, ellipse } from './pen.mjs';
import { SOFT_ASSETS } from './ribbon.mjs';
import { SOFT3D_ASSETS } from './soft3d.mjs';
import { CHART_ASSETS } from './charts.mjs';
import { PERSON_ASSETS } from './person.mjs';
import { DITHER_ASSETS } from './dither.mjs';
import { TYPE_ASSETS } from './type.mjs';
import { MESHGRAD_ASSETS } from './meshgrad.mjs';
import { ENGRAVE_ASSETS } from './engrave.mjs';
import { SEAL_ASSETS } from './seal.mjs';
import { PRINT_ASSETS } from './print.mjs';
import { SHAPES_ASSETS } from './shapes.mjs';

const f = (n) => Math.round(n * 10) / 10;

// Seeded 2D gradient noise (Perlin-style), enough for flow fields and wobble.
export function makeNoise(r) {
  const perm = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r.next() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const p = [...perm, ...perm];
  const grad = (h, x, y) => { const a = (h / 256) * Math.PI * 2; return Math.cos(a) * x + Math.sin(a) * y; };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = p[p[X] + Y], ab = p[p[X] + Y + 1], ba = p[p[X + 1] + Y], bb = p[p[X + 1] + Y + 1];
    const l1 = grad(aa, xf, yf) + u * (grad(ba, xf - 1, yf) - grad(aa, xf, yf));
    const l2 = grad(ab, xf, yf - 1) + u * (grad(bb, xf - 1, yf - 1) - grad(ab, xf, yf - 1));
    return l1 + v * (l2 - l1); // about -0.7..0.7
  };
}

// Bridson Poisson-disc sampling: even, natural spacing for confetti, rain, stars, dots.
export function poisson(r, x0, y0, w, h, minDist, k = 20) {
  const cell = minDist / Math.SQRT2, gw = Math.ceil(w / cell), gh = Math.ceil(h / cell);
  const grid = new Array(gw * gh).fill(-1), pts = [], active = [];
  const add = (p) => { pts.push(p); active.push(p); grid[Math.floor((p[1] - y0) / cell) * gw + Math.floor((p[0] - x0) / cell)] = pts.length - 1; };
  add([x0 + r.next() * w, y0 + r.next() * h]);
  while (active.length) {
    const i = Math.floor(r.next() * active.length), [px, py] = active[i];
    let found = false;
    for (let n = 0; n < k; n++) {
      const a = r.next() * Math.PI * 2, d = minDist * (1 + r.next());
      const q = [px + Math.cos(a) * d, py + Math.sin(a) * d];
      if (q[0] < x0 || q[0] >= x0 + w || q[1] < y0 || q[1] >= y0 + h) continue;
      const gx = Math.floor((q[0] - x0) / cell), gy = Math.floor((q[1] - y0) / cell);
      let ok = true;
      for (let yy = Math.max(0, gy - 2); yy <= Math.min(gh - 1, gy + 2) && ok; yy++)
        for (let xx = Math.max(0, gx - 2); xx <= Math.min(gw - 1, gx + 2); xx++) {
          const j = grid[yy * gw + xx];
          if (j >= 0 && Math.hypot(pts[j][0] - q[0], pts[j][1] - q[1]) < minDist) { ok = false; break; }
        }
      if (ok) { add(q); found = true; break; }
    }
    if (!found) active.splice(i, 1);
  }
  return pts;
}

// Gielis superformula: leaves, petals, seeds, blobs from four numbers.
export function superformula(cx, cy, size, { m = 2, n1 = 1, n2 = 1, n3 = 1, a = 1, b = 1, rot = 0, steps = 72 } = {}) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const phi = (i / steps) * Math.PI * 2;
    const t1 = Math.abs(Math.cos((m * phi) / 4) / a) ** n2, t2 = Math.abs(Math.sin((m * phi) / 4) / b) ** n3;
    const rr = (t1 + t2) ** (-1 / n1) || 0;
    pts.push([cx + Math.cos(phi + rot) * rr * size, cy + Math.sin(phi + rot) * rr * size]);
  }
  const max = Math.max(...pts.map(([x, y]) => Math.hypot(x - cx, y - cy))) || 1;
  return pts.map(([x, y]) => [cx + ((x - cx) * size) / max, cy + ((y - cy) * size) / max]);
}

export const ASSETS = {
  // Recursive branching tree (an L-system without the strings): trunk, forks, a leaf blob at each tip.
  tree(e, { pen, r, c, t }) {
    const out = [], tips = [];
    const sway = Math.sin(t * Math.PI * 2) * 0.05;
    const grow = (x, y, len, ang, depth) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      out.push(pen.line([[x, y], [x + (x2 - x) * 0.5 + r.jitter(len * 0.06), y + (y2 - y) * 0.5], [x2, y2]], { color: c(e.color, '#0A3FB0'), w: Math.max(3, depth * (e.weight ?? 2.6)), amp: 0.6 }));
      if (depth <= 1) return tips.push([x2, y2]);
      const n = r.chance(0.3) ? 3 : 2;
      for (let k = 0; k < n; k++) grow(x2, y2, len * r.range(0.62, 0.78), ang + (k - (n - 1) / 2) * r.range(0.35, 0.6) + r.jitter(0.12) + sway, depth - 1);
    };
    grow(e.x, e.y, e.size * 0.32, -Math.PI / 2, e.depth ?? 6);
    if (e.leaves !== false) for (const [x, y] of tips) out.push(pen.shape(superformula(x, y, e.size * r.range(0.035, 0.06), { m: 2, n1: 1.2, n2: 1, n3: 1, rot: r.next() * 6 }), { fill: c(r.pick(e.leafColors || ['green', 'green', 'mustard'])), stroke: null, offset: 0, amp: 0.6 }));
    return { svg: out.join(''), bbox: [e.x - e.size / 2, e.y - e.size, e.size, e.size] };
  },

  // Plant: a stem with superformula leaves alternating up it, optional pot.
  plant(e, { pen, r, c, t }) {
    const out = [], h = e.size, sway = Math.sin(t * Math.PI * 2) * 8;
    const top = [e.x + sway, e.y - h];
    out.push(pen.line([[e.x, e.y], [e.x + sway * 0.4, e.y - h * 0.5], top], { color: c(e.color, '#1E783F'), w: 6 }));
    const n = e.leaves ?? 7;
    for (let k = 1; k <= n; k++) {
      const s = k / (n + 1), side = k % 2 ? 1 : -1;
      const x = e.x + sway * s, y = e.y - h * s, L = h * (0.22 - s * 0.08);
      const leaf = superformula(x + side * L * 0.8, y - L * 0.25, L, { m: 2, n1: 1.4, n2: 1, n3: 1, rot: side > 0 ? -0.5 : Math.PI + 0.5 });
      out.push(pen.shape(leaf, { fill: c(e.leafColor || 'green'), stroke: c('ink'), w: 4, offset: 2, amp: 0.6 }));
      out.push(pen.line([[x, y], [x + side * L * 1.3, y - L * 0.45]], { color: c('ink'), w: 3, amp: 0.3 }));
    }
    if (e.pot !== false) out.push(pen.shape([[e.x - h * 0.2, e.y - 4], [e.x + h * 0.2, e.y - 4], [e.x + h * 0.15, e.y + h * 0.28], [e.x - h * 0.15, e.y + h * 0.28]], { fill: c(e.potColor || 'coral'), w: 6, offset: 2 }));
    return { svg: out.join(''), bbox: [e.x - h * 0.4, e.y - h, h * 0.8, h * 1.3] };
  },

  // Cloud: union of circles. Outlines first, fills on top, so only the outer edge keeps its line.
  cloud(e, { pen, r, c, t }) {
    const w = e.size, cx = e.x + Math.sin(t * Math.PI * 2) * (e.drift ?? 0);
    const nb = e.bumps ?? 5;
    const bumps = Array.from({ length: nb }, (_, k) => [cx - w / 2 + (w * (k + 0.5)) / nb, e.y - r.range(0.05, 0.35) * w * (1 - Math.abs(k - (nb - 1) / 2) / nb), w * r.range(0.16, 0.24)]);
    bumps.push([cx, e.y, w * 0.28]);
    const fill = c(e.color, '#FBFAF6'), line = c(e.outline || 'ink');
    const outline = bumps.map(([x, y, rr]) => pen.shape(ellipse(x, y, rr, rr, 12), { fill: line, stroke: null, offset: 0, amp: 0.8 })).join('');
    const inner = bumps.map(([x, y, rr]) => pen.shape(ellipse(x, y, rr - 6, rr - 6, 12), { fill, stroke: null, offset: 0, amp: 0.8 })).join('');
    const base = pen.shape(box(cx - w / 2 + 6, e.y, cx + w / 2 - 6, e.y + w * 0.12, 30), { fill, stroke: null, offset: 0 });
    // flat bottom: clip the circles at the base line so no half-discs hang below it
    const id = `cl${Math.floor(r.next() * 1e9)}`;
    const clip = `<clipPath id="${id}"><rect x="${f(cx - w)}" y="${f(e.y - w)}" width="${f(w * 2)}" height="${f(w + w * 0.12)}"/></clipPath>`;
    return { svg: `${clip}<g clip-path="url(#${id})">${outline + inner + base}</g>` + pen.line([[cx - w / 2 + 4, e.y + w * 0.12], [cx + w / 2 - 4, e.y + w * 0.12]], { color: line, w: 6 }), bbox: [cx - w / 2, e.y - w * 0.4, w, w * 0.55] };
  },

  // Sun with rays; rays rotate slowly with t.
  sunburst(e, { pen, r, c, t }) {
    const rr = e.size / 2, n = e.rays ?? 14, spin = t * ((Math.PI * 2) / n);
    let s = pen.shape(ellipse(e.x, e.y, rr * 0.55, rr * 0.55, 16), { fill: c(e.color, '#F2C230'), stroke: e.outline ? c(e.outline) : null, w: 6, offset: 0 });
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + spin, l0 = rr * 0.68, l1 = rr * (k % 2 ? 0.9 : 1);
      s += pen.line([[e.x + Math.cos(a) * l0, e.y + Math.sin(a) * l0], [e.x + Math.cos(a) * l1, e.y + Math.sin(a) * l1]], { color: c(e.rayColor || e.color, '#F2C230'), w: e.weight ?? 7, amp: 0.5 });
    }
    return { svg: s, bbox: [e.x - rr, e.y - rr, rr * 2, rr * 2] };
  },

  // Flow field (after Tyler Hobbs): streamlines following Perlin noise angles. A living texture.
  flowfield(e, { pen, r, c, noise, t }) {
    const out = [], scale = e.scale ?? 0.004, step = e.step ?? 10, len = e.length ?? 24; // defaults: thick, sparse lines (thin dense ones read as mud when small)
    const starts = poisson(r, e.x, e.y, e.w, e.h, e.spacing ?? 52);
    for (const [sx, sy] of starts) {
      let x = sx, y = sy;
      const pts = [[x, y]];
      for (let k = 0; k < len; k++) {
        // move through noise space on a circle, so the loop closes seamlessly at t = 1
        const a = noise(x * scale + Math.cos(t * Math.PI * 2) * 0.35, y * scale + Math.sin(t * Math.PI * 2) * 0.35) * Math.PI * (e.turn ?? 2.4) + (e.angle ?? 0);
        x += Math.cos(a) * step; y += Math.sin(a) * step;
        if (x < e.x || x > e.x + e.w || y < e.y || y > e.y + e.h) break;
        pts.push([x, y]);
      }
      if (pts.length > 3) out.push(pen.line(pts, { color: c(r.pick(e.colors || [e.color || 'ink'])), w: e.weight ?? 6.5, amp: 0.3 }));
    }
    return { svg: out.join(''), bbox: [e.x, e.y, e.w, e.h] };
  },

  // Halftone: a dot grid whose dot size follows a radial or linear ramp, like a riso screen.
  halftone(e, { c, t }) {
    const g = e.gap ?? 16, out = [];
    const cx = e.cx ?? e.x + e.w / 2, cy = e.cy ?? e.y + e.h / 2, R = Math.hypot(e.w, e.h) / 2;
    for (let y = e.y + g / 2, row = 0; y < e.y + e.h; y += g * 0.866, row++)
      for (let x = e.x + g / 2 + (row % 2) * (g / 2); x < e.x + e.w; x += g) {
        const v = e.mode === 'linear' ? 1 - (y - e.y) / e.h : 1 - Math.hypot(x - cx, y - cy) / R;
        const rr = Math.max(0, (g / 2) * Math.min(1, v * (e.level ?? 1.2) + Math.sin(t * Math.PI * 2 + x * 0.01) * 0.08));
        if (rr > 0.6) out.push(`<circle cx="${f(x)}" cy="${f(y)}" r="${f(rr)}"/>`);
      }
    return { svg: `<g fill="${c(e.color, '#0B57D0')}">${out.join('')}</g>`, bbox: [e.x, e.y, e.w, e.h] };
  },

  // Rose curve r = cos(k θ): flowers, emblems, ornaments.
  rose(e, { pen, c, t }) {
    const k = e.petals ?? 5, rr = e.size / 2, rot = t * Math.PI * 0.4;
    const pts = Array.from({ length: 220 }, (_, i) => { const th = (i / 220) * Math.PI * (k % 2 ? 1 : 2); const q = rr * Math.cos(k * th); return [e.x + q * Math.cos(th + rot), e.y + q * Math.sin(th + rot)]; });
    return { svg: pen.shape(pts, { fill: c(e.fill || 'coral'), stroke: c(e.color, '#0A3FB0'), w: e.weight ?? 6, offset: 3, amp: 0.4 }) + pen.shape(ellipse(e.x, e.y, rr * 0.16, rr * 0.16, 10), { fill: c(e.center || 'mustard'), stroke: c('ink'), w: 5, offset: 0 }), bbox: [e.x - rr, e.y - rr, rr * 2, rr * 2] };
  },

  // Hypotrochoid (spirograph): an ornamental seal for money, guarantees, stamps.
  spiro(e, { pen, c, t }) {
    const R = e.R ?? 5, rr = e.r ?? 3, d = e.d ?? 5, s = e.size / (2 * (R - rr + d)), turns = (e.turns ?? 3) * Math.PI * 2;
    const pts = Array.from({ length: 600 }, (_, i) => { const th = (i / 600) * turns * Math.min(1, 0.15 + (e.animate ? t : 1)); return [e.x + s * ((R - rr) * Math.cos(th) + d * Math.cos(((R - rr) / rr) * th)), e.y + s * ((R - rr) * Math.sin(th) - d * Math.sin(((R - rr) / rr) * th))]; });
    return { svg: pen.line(pts, { color: c(e.color, '#0A3FB0'), w: e.weight ?? 3.5, amp: 0.2 }), bbox: [e.x - e.size / 2, e.y - e.size / 2, e.size, e.size] };
  },

  // Confetti / rain / stars on Poisson-disc spacing; falls with t.
  confetti(e, { pen, r, c, t }) {
    const out = [], kind = e.kind || 'confetti';
    for (const [x, y0] of poisson(r, e.x, e.y, e.w, e.h, e.spacing ?? 46)) {
      const y = e.y + ((y0 - e.y + t * e.h) % e.h); // one full fall per loop
      const col = c(r.pick(e.colors || ['coral', 'mustard', 'green', 'blue']));
      if (kind === 'rain') out.push(pen.line([[x, y], [x - 5, y + 18]], { color: col, w: 4, amp: 0.2 }));
      else if (kind === 'stars') out.push(pen.line([[x - 6, y], [x + 6, y]], { color: col, w: 3.5 }) + pen.line([[x, y - 6], [x, y + 6]], { color: col, w: 3.5 }));
      else { const a = r.next() * 3 + t * Math.PI * 2; out.push(pen.line([[x - Math.cos(a) * 8, y - Math.sin(a) * 8], [x + Math.cos(a) * 8, y + Math.sin(a) * 8]], { color: col, w: 6, amp: 0.3 })); }
    }
    return { svg: out.join(''), bbox: [e.x, e.y, e.w, e.h] };
  },

  // Waving flag: horizontal stripes displaced by a travelling sine wave; optional canton.
  flag(e, { pen, c, t }) {
    const out = [], stripes = e.stripes || ['coral', 'paper', 'coral', 'paper', 'coral'], sh = e.h / stripes.length;
    const yAt = (x, y) => y + Math.sin((x - e.x) / (e.w / 2.2) * Math.PI - t * Math.PI * 2) * e.h * 0.06 * ((x - e.x) / e.w);
    stripes.forEach((col, k) => {
      const top = [], bot = [];
      for (let x = e.x; x <= e.x + e.w; x += e.w / 12) { top.push([x, yAt(x, e.y + k * sh)]); bot.push([x, yAt(x, e.y + (k + 1) * sh)]); }
      out.push(pen.shape([...top, ...bot.reverse()], { fill: c(col), stroke: null, offset: 0, amp: 0.5 }));
    });
    if (e.canton) out.push(pen.shape([[e.x, yAt(e.x, e.y)], [e.x + e.w * 0.4, yAt(e.x + e.w * 0.4, e.y)], [e.x + e.w * 0.4, yAt(e.x + e.w * 0.4, e.y + e.h * 0.55)], [e.x, yAt(e.x, e.y + e.h * 0.55)]], { fill: c(e.canton), stroke: null, offset: 0 }));
    const outline = []; for (let x = e.x; x <= e.x + e.w; x += e.w / 12) outline.push([x, yAt(x, e.y)]);
    for (let x = e.x + e.w; x >= e.x; x -= e.w / 12) outline.push([x, yAt(x, e.y + e.h)]);
    out.push(pen.shape(outline, { fill: null, stroke: c('ink'), w: 7, offset: 0, amp: 0.5 }));
    out.push(pen.line([[e.x, e.y - 10], [e.x, e.y + e.h * 2.2]], { color: c('ink'), w: 8 }));
    return { svg: out.join(''), bbox: [e.x, e.y, e.w, e.h * 2.2] };
  },

  // Paper stack / books: offset sheets, the top one written on.
  stack(e, { pen, r, c }) {
    const out = [], n = e.count ?? 5;
    for (let k = n - 1; k >= 0; k--) {
      const dx = k * 7 + r.jitter(3), dy = -k * 9;
      out.push(`<g transform="rotate(${f(r.jitter(4))} ${e.x} ${e.y})">` + pen.shape(box(e.x - e.w / 2 + dx, e.y - e.h / 2 + dy, e.x + e.w / 2 + dx, e.y + e.h / 2 + dy, 30), { fill: c(k ? r.pick(e.colors || ['paper', 'tone', 'paper']) : e.color || 'paper'), w: 6, offset: 0 }) + '</g>');
    }
    for (let l = 0; l < Math.floor(e.h / 26) - 1; l++) out.push(pen.line([[e.x - e.w / 2 + 22, e.y - e.h / 2 + 28 + l * 24], [e.x + e.w / 2 - 22 - r.range(0, 60), e.y - e.h / 2 + 28 + l * 24]], { color: c('ink'), w: 4, amp: 1 }));
    return { svg: out.join(''), bbox: [e.x - e.w / 2, e.y - e.h / 2 - n * 9, e.w + n * 7, e.h + n * 9] };
  },
};

// ---- Hand-made fills and strokes, written after rough.js (hachure) and perfect-freehand (pressure brush), no dependency.

// Parallel hatch lines across a box, clipped to any shape: the hand-coloured "pencil fill".
export function hatchLines(r, pen, [x, y, w, h], { angle = -0.7, gap = 11, color, weight = 3.5, cross = false } = {}) {
  const out = [];
  const pass = (a) => {
    const diag = Math.hypot(w, h), cx = x + w / 2, cy = y + h / 2, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    for (let d = -diag / 2; d <= diag / 2; d += gap + r.jitter(gap * 0.25)) {
      const ox = cx + nx * d, oy = cy + ny * d;
      out.push(pen.line([[ox - ux * diag / 2, oy - uy * diag / 2], [ox + ux * diag / 2 + r.jitter(6), oy + uy * diag / 2 + r.jitter(6)]], { color, w: weight, amp: 1.2 }));
    }
  };
  pass(angle);
  if (cross) pass(angle + Math.PI / 2.4);
  return out.join('');
}

let hatchSeq = 0;
// Wrap hatch lines in a clip of `clipD` (path data in the same coordinates).
export function hatchIn(r, pen, clipD, bbox, o) {
  const id = `h${++hatchSeq}`;
  return `<clipPath id="${id}"><path d="${clipD}"/></clipPath><g clip-path="url(#${id})">${hatchLines(r, pen, bbox, o)}</g>`;
}

// Pressure brush: a filled outline around a centre line, thin at both ends, swelling in the middle.
export function brushStroke(points, { width = 16, taper = 0.6, wobble = 0.15, r } = {}) {
  if (points.length < 2) return '';
  const n = points.length, left = [], right = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = points[i], [ax, ay] = points[Math.max(0, i - 1)], [bx, by] = points[Math.min(n - 1, i + 1)];
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const s = i / (n - 1), press = Math.sin(Math.PI * s) ** taper * (1 + (r ? r.jitter(wobble) : 0));
    const hw = (width / 2) * Math.max(0.12, press);
    left.push([x + nx * hw, y + ny * hw]);
    right.push([x - nx * hw, y - ny * hw]);
  }
  return [...left, ...right.reverse()];
}

// Resample a polyline into smooth evenly spaced points (Catmull-Rom), so brushes swell smoothly.
export function smooth(points, per = 8) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)], p1 = points[i], p2 = points[i + 1], p3 = points[Math.min(points.length - 1, i + 2)];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

Object.assign(ASSETS, {
  // Hatched area: rect, circle or polygon filled with hand pencil lines (optionally cross-hatched).
  hatch(e, { pen, r, c }) {
    let d, bbox;
    if (e.points) {
      d = pen.d(e.points, { amp: 0, closed: true });
      const xs = e.points.map((p) => p[0]), ys = e.points.map((p) => p[1]);
      bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
    } else if (e.r) {
      d = pen.d(ellipse(e.x, e.y, e.r, e.ry ?? e.r, 18), { amp: 0, closed: true });
      bbox = [e.x - e.r, e.y - (e.ry ?? e.r), e.r * 2, (e.ry ?? e.r) * 2];
    } else {
      d = pen.d(box(e.x, e.y, e.x + e.w, e.y + e.h, 40), { amp: 0, closed: true });
      bbox = [e.x, e.y, e.w, e.h];
    }
    let s = hatchIn(r, pen, d, bbox, { angle: e.angle ?? -0.7, gap: e.gap ?? 11, color: c(e.color, '#F2603F'), weight: e.weight ?? 3.5, cross: !!e.cross });
    if (e.outline) s += `<path d="${d}" fill="none" stroke="${c(e.outline)}" stroke-width="${e.outlineWeight ?? 7}" stroke-linejoin="round"/>`;
    return { svg: s, bbox };
  },

  // Brush stroke: a swelling, tapering calligraphic line through `points` (swashes, underlines, hair, smoke).
  brush(e, { pen, r, c }) {
    const outline = brushStroke(smooth(e.points, 10), { width: e.width ?? 18, taper: e.taper ?? 0.6, r });
    const xs = e.points.map((p) => p[0]), ys = e.points.map((p) => p[1]);
    return { svg: pen.shape(outline, { fill: c(e.color, '#0A3FB0'), stroke: null, offset: 0, amp: 0.3 }), bbox: [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs) || 1, Math.max(...ys) - Math.min(...ys) || 1] };
  },

  // Speech bubble (the most common prop after paper in the 600 covers): body, tail, and lines / dots / an icon-free mark.
  bubble(e, { pen, r, c }) {
    const { x, y, w, h } = e, side = e.tail === 'right' ? 1 : -1, tx = x + w / 2 + side * w * 0.22;
    const body = [...box(x, y, x + w, y + h, 30)];
    // insert the tail on the bottom edge
    const tw = Math.min(26, w * 0.14);
    const tail = [[tx + side * tw, y + h], [tx + side * tw * 0.2, y + h + h * 0.38], [tx - side * tw * 0.7, y + h]];
    // drop bottom-edge points under the tail, but never the corners
    const pts = body.filter(([px, py]) => !(py === y + h && Math.abs(px - tx) < tw * 1.2 && px > x + 4 && px < x + w - 4));
    const iBottom = pts.findIndex(([px, py]) => py === y + h && px < tx) ;
    const poly = iBottom > 0 ? [...pts.slice(0, iBottom), ...(side > 0 ? tail : tail.slice().reverse()), ...pts.slice(iBottom)] : [...pts, ...tail];
    let s = pen.shape(poly, { fill: c(e.color, '#FBFAF6'), stroke: c(e.outline || 'ink'), w: e.weight ?? 7, offset: e.color && e.color !== 'paper' ? 3 : 0 });
    const ink = c(e.ink || 'ink');
    if (e.content === 'dots') for (let k = 0; k < 3; k++) s += pen.dot(x + w / 2 + (k - 1) * w * 0.17, y + h / 2, Math.min(w, h) * 0.07, ink);
    else if (e.content === 'heart') s += pen.shape(Array.from({ length: 40 }, (_, k) => { const t = (k / 40) * Math.PI * 2; return [x + w / 2 + (h * 0.022) * 16 * Math.sin(t) ** 3, y + h / 2 - (h * 0.022) * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]; }), { fill: c(e.accent || 'coral'), stroke: null, offset: 0, amp: 0.4 });
    else if (e.content !== 'none') for (let l = 0; l < Math.max(1, Math.floor(h / 30) - 1); l++) s += pen.line([[x + 22, y + 30 + l * 26], [x + w - 22 - r.range(0, w * 0.35), y + 30 + l * 26]], { color: ink, w: 5, amp: 1 });
    return { svg: s, bbox: [x, y, w, h * 1.38] };
  },
});

// ---- Two signatures from the Ortak Alan icon set: excitement ticks and round badges.
Object.assign(ASSETS, {
  // Three short dashes fanning out from a corner of an object, in mixed accent colours ("it's alive").
  ticks(e, { pen, r, c }) {
    const n = e.count ?? 3, a0 = ((e.angle ?? -45) * Math.PI) / 180, spread = ((e.spread ?? 80) * Math.PI) / 180, len = e.size ?? 26;
    const cols = (e.colors || ['mustard', 'coral', 'green']).map((k) => c(k));
    let s = '';
    for (let k = 0; k < n; k++) {
      const a = a0 + (n > 1 ? (k / (n - 1) - 0.5) * spread : 0) + r.jitter(0.08);
      // dashes start away from the anchor (they radiate from the object, they do not meet)
      const r0 = len * 0.7, r1 = len * (k % 2 ? 1.45 : 1.65);
      s += pen.line([[e.x + Math.cos(a) * r0, e.y + Math.sin(a) * r0], [e.x + Math.cos(a) * r1, e.y + Math.sin(a) * r1]], { color: cols[k % cols.length], w: e.weight ?? 6, amp: 0.3 });
    }
    return { svg: s, bbox: [e.x - len, e.y - len, len * 2, len * 2] };
  },
  // Round badge frame: a hand-drawn ring (optionally filled), for rosettes, stamps, category marks.
  badge(e, { pen, c }) {
    const rr = e.size / 2;
    return { svg: pen.shape(ellipse(e.x, e.y, rr, rr * (e.squash ?? 0.98), 22), { fill: e.fill ? c(e.fill) : null, stroke: c(e.color, '#0A3FB0'), w: e.weight ?? 9, offset: 0, amp: 1.2 }), bbox: [e.x - rr, e.y - rr, rr * 2, rr * 2] };
  },
});

// Soft 3D-feel elements (ribbon, tube, image): see ribbon.mjs
Object.assign(ASSETS, SOFT_ASSETS);
// Soft 3D v2 (real 3D: ribbon3d, torus3d, extrude3d, soft3d covers …): see soft3d.mjs
Object.assign(ASSETS, SOFT3D_ASSETS);

// Data charts (bars, linechart, pie, donut, isochart): see charts.mjs
Object.assign(ASSETS, CHART_ASSETS);
// Faceless pictogram people (person, people): see person.mjs
Object.assign(ASSETS, PERSON_ASSETS);
// Ordered dither field (Bayer squares, dots, lines): see dither.mjs
Object.assign(ASSETS, DITHER_ASSETS);
// Grainy mesh gradients and blurred orbs (meshgrad): see meshgrad.mjs
Object.assign(ASSETS, MESHGRAD_ASSETS);

// Line-art landscapes (terrain, ridgelines, engrave): see engrave.mjs
Object.assign(ASSETS, ENGRAVE_ASSETS);

// Text on a circle, seals, ticket stubs (ringtext, seal, stub): see seal.mjs
Object.assign(ASSETS, SEAL_ASSETS);

// Character-grid silhouettes (prop or primitive filled with glyphs/blocks/dots): see glyphfill.mjs
Object.assign(ASSETS, GLYPHFILL_ASSETS);
// Display type from bundled fonts, drawn as paths: see type.mjs
Object.assign(ASSETS, TYPE_ASSETS);

// Print textures (amtone halftone, camo blobs, grain): see print.mjs
Object.assign(ASSETS, PRINT_ASSETS);

// Poster shape kits (shapegrid, echo, dotmatrix, furniture): see shapes.mjs
Object.assign(ASSETS, SHAPES_ASSETS);
