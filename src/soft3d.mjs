// Soft 3D (v2): a small real 3D renderer for the "soft" finish, in plain math and SVG.
// Shapes are tessellated into small quads, lit (key light with wrap-around Lambert, ambient, soft Blinn specular,
// fresnel rim), coloured through a per-material ramp (shadow -> base -> highlight) and depth-sorted back to front
// (painter's algorithm), so a ribbon passes behind itself and interlocking rings really interlock. Every quad is
// overdrawn with its own colour as a thin stroke, so neighbours never show a seam.
//
// Coordinates: canvas pixels. x right, y down (as everywhere in Levni), z toward the viewer; z = 0 is the picture
// plane, where a point lands exactly on its x, y. One perspective camera looks at the canvas centre; `fov` sets how
// strong the perspective is. A shape placed with x, y, size is built in a unit space (radius 1) and scaled so its
// diameter is `size` px. `rotate: [rx, ry, rz]` (degrees) turns it about its own centre.
import { rng } from './style.mjs';
import { flattenPath } from './ink.mjs';
import { expandProp } from './props.mjs';
import { SOFT_ASSETS } from './ribbon.mjs';

const PI = Math.PI, DEG = PI / 180;
const f = (n) => Math.round(n * 10) / 10;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

// ---- vectors and matrices (3x3, row-major arrays of 9)
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mv = (m, v) => [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
const mm = (a, b) => { const o = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o.push(a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j]); return o; };
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, c, -s, 0, s, c]; };
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, 0, s, 0, 1, 0, -s, 0, c]; };
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return [c, -s, 0, s, c, 0, 0, 0, 1]; };
const I3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];
// rotate [rx, ry, rz] in degrees: x first, then y, then z
const euler = (r = [0, 0, 0]) => mm(rotZ((r[2] || 0) * DEG), mm(rotY((r[1] || 0) * DEG), rotX((r[0] || 0) * DEG)));

// ---- colour
const rgbOf = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const alongc = (stops, t) => {
  if (stops.length === 1) return stops[0];
  const x = clamp(t) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
  return mixc(stops[i], stops[i + 1], x - i);
};
const lum = (c) => (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255;
const WHITE = [255, 255, 255], WARM = [255, 250, 242];

// A material: colour stops (a gradient along the shape), each with its own shadow and highlight tone.
// shadow goes toward a deep indigo (cool shadows read as premium), highlight toward white.
function material(stops, o = {}, c = (x) => x) {
  const base = stops.map((s) => rgbOf(c(s)));
  const deep = rgbOf(c(o.shadowTint || '#1a1550'));
  return {
    base,
    shadow: o.shadow ? [rgbOf(c(o.shadow))] : base.map((b) => mixc(b, deep, 0.62)),
    hi: o.highlight ? [rgbOf(c(o.highlight))] : base.map((b) => mixc(b, WHITE, 0.5)),
    gloss: o.gloss ?? 0.55, shine: o.shine ?? 34, rim: o.rim ?? 0.3,
    rimCol: o.rimColor ? rgbOf(c(o.rimColor)) : null, ambient: o.ambient ?? 0.1, mid: o.mid ?? 0.58,
  };
}

// lights live in camera space so the lighting stays the same whatever the view: key from the upper left front
const KEY = nrm([-0.5, 0.68, 0.55]);
function shade(n, v, m, g) {
  const ndl = dot(n, KEY), diff = clamp((ndl + 0.45) / 1.45);
  const I = m.ambient + (1 - m.ambient) * diff * diff * (3 - 2 * diff) * 0.55 + (1 - m.ambient) * diff * 0.45;
  const base = alongc(m.base, g), sh = alongc(m.shadow, g), hi = alongc(m.hi, g);
  let col = I < m.mid ? mixc(sh, base, I / m.mid) : mixc(base, hi, ((I - m.mid) / (1 - m.mid)) * 0.8);
  const h = nrm(add(KEY, v)), spec = Math.pow(Math.max(0, dot(n, h)), m.shine) * m.gloss;
  col = mixc(col, WARM, clamp(spec));
  if (m.rim) {
    const fr = Math.pow(1 - clamp(dot(n, v)), 3) * m.rim;
    col = mixc(col, m.rimCol || mixc(base, WHITE, 0.65), clamp(fr));
  }
  return col;
}

// ---- camera: perspective about the canvas centre; yaw / pitch orbit the whole scene
function camera(canvas, o = {}) {
  const W = canvas?.w ?? 1200, H = canvas?.h ?? 673;
  const fov = clamp(o.fov ?? 28, 5, 100), d = (H / 2) / Math.tan((fov * DEG) / 2);
  const R = mm(rotX((o.pitch ?? 0) * DEG), rotY(-(o.yaw ?? 0) * DEG));
  const cx = W / 2, cy = H / 2;
  return {
    W, H, cx, cy, d, R,
    world: (x, y, z = 0) => [x - cx, cy - y, z],
    proj: (q) => { const k = d / Math.max(1, d - q[2]); return [cx + q[0] * k, cy - q[1] * k]; },
  };
}

// ---- meshes. A mesh is a list of faces in local (unit) space: { v: [p...], n: [n...], g, two?, mat? }
// grid(): a parametric surface sampled nu x nv; fn(u, v) -> { p, n, g }
function grid(nu, nv, fn, { wrapU = false, wrapV = false, two = false } = {}) {
  const cols = wrapU ? nu : nu + 1, rows = wrapV ? nv : nv + 1, pts = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) pts.push(fn(i / nu, j / nv, i, j));
  const at = (i, j) => pts[(i % cols) * rows + (j % rows)];
  const faces = [];
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = at(i, j), b = at(i + 1, j), c = at(i + 1, j + 1), d = at(i, j + 1);
    faces.push({ v: [a.p, b.p, c.p, d.p], n: [a.n, b.n, c.n, d.n], g: (a.g + b.g + c.g + d.g) / 4, two });
  }
  return faces;
}
const tri = (u) => 1 - Math.abs(2 * (u - Math.floor(u)) - 1); // 0 -> 1 -> 0 over a loop: seamless gradients

// detail: quads about `px` pixels on screen for a shape `size` px across
const segs = (size, frac, px = 7, lo = 8, hi = 260) => Math.round(clamp((size * frac) / px, lo, hi));

function torusMesh(o, size) {
  const k = o.thickness ?? 0.36, R = 1 / (1 + k), r = k * R;
  const nu = segs(size, PI * 1.05, 10, 72, 180), nv = segs(size * k, PI * 1.1, 4, 48, 90);
  return grid(nu, nv, (u, v) => {
    const a = u * 2 * PI, b = v * 2 * PI, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    return { p: [(R + r * cb) * ca, (R + r * cb) * sa, r * sb], n: [cb * ca, cb * sa, sb], g: tri(u + 0.125) };
  }, { wrapU: true, wrapV: true });
}
function sphereMesh(o, size, bump) {
  const nu = segs(size, PI, 7, 64, 200), nv = Math.max(32, Math.round(nu / 2));
  const pos = (u, v) => { const a = u * 2 * PI, b = (v - 0.5) * PI; return [Math.cos(b) * Math.cos(a), Math.sin(b), Math.cos(b) * Math.sin(a)]; };
  return grid(nu, nv, (u, v) => {
    const d = pos(u, v), k = bump ? bump(d) : 1, p = scl(d, k);
    let n = d;
    if (bump && v > 0 && v < 1) { // numeric normal of the displaced surface
      const e = 0.004, pu = scl(pos(u + e, v), bump(pos(u + e, v))), pv = scl(pos(u, v + e), bump(pos(u, v + e)));
      n = nrm(cross(sub(pv, p), sub(pu, p)));
      if (dot(n, d) < 0) n = scl(n, -1);
    }
    return { p, n, g: clamp(0.5 + d[1] * 0.42 - d[0] * 0.18) };
  }, { wrapU: true });
}
function blobBump(seed, amp = 0.2) {
  const r = rng(seed * 7 + 11), lobes = Array.from({ length: 5 }, () => ({ w: nrm([r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)]), f: r.range(1.4, 2.8), ph: r.range(0, 6.28), a: r.range(0.5, 1) }));
  const tot = lobes.reduce((s, l) => s + l.a, 0);
  return (d) => (1 + (amp * lobes.reduce((s, l) => s + l.a * Math.sin(l.f * dot(d, l.w) * 2 + l.ph), 0)) / tot) / (1 + amp * 0.6);
}
function capsuleMesh(o, size) {
  const rad = clamp(o.radius ?? 0.42, 0.05, 1), half = 1 - rad; // total length 2 along y
  const arc = (PI / 2) * rad, L = 2 * arc + 2 * half; // profile arc length: bottom cap, side, top cap
  const nu = segs(size * rad, PI * 2, 7, 48, 160), nv = segs(size, 1.6, 7, 48, 200);
  return grid(nu, nv, (u, v) => {
    const s = v * L, a = u * 2 * PI;
    let y, rr, ny;
    if (s < arc) { const t = -PI / 2 + (s / arc) * (PI / 2); y = -half + Math.sin(t) * rad; rr = Math.cos(t) * rad; ny = Math.sin(t); }
    else if (s < arc + 2 * half) { y = -half + (s - arc); rr = rad; ny = 0; }
    else { const t = ((s - arc - 2 * half) / arc) * (PI / 2); y = half + Math.sin(t) * rad; rr = Math.cos(t) * rad; ny = Math.sin(t); }
    const nr = Math.sqrt(Math.max(0, 1 - ny * ny));
    return { p: [rr * Math.cos(a), y, rr * Math.sin(a)], n: [nr * Math.cos(a), ny, nr * Math.sin(a)], g: clamp(v * 0.85 + 0.15 * tri(u)) };
  }, { wrapU: true });
}

// rounded box of half extents h and corner radius rr: a subdivided cube pushed onto the rounded surface
function boxMesh(h, rr, size) {
  const faces = [], ax = [[0, 1, 2], [1, 2, 0], [2, 0, 1]];
  const samples = (hh) => {
    const r0 = Math.min(rr, hh * 0.98), inner = hh - r0, out = [-hh];
    const zone = r0 > 0 ? 4 : 0, mid = Math.max(1, Math.round((inner * 2 * size) / 26));
    for (let k = 1; k <= zone; k++) out.push(-hh + (r0 * k) / zone);
    for (let k = 1; k < mid; k++) out.push(-inner + (2 * inner * k) / mid);
    for (let k = zone; k >= 1; k--) out.push(hh - (r0 * k) / zone);
    out.push(hh);
    return [...new Set(out.map((x) => Math.round(x * 1e6) / 1e6))].sort((a, b) => a - b);
  };
  const inn = h.map((x) => Math.max(0, x - Math.min(rr, x * 0.98)));
  const put = (p) => {
    const q = p.map((x, i) => clamp(x, -inn[i], inn[i])), d = sub(p, q), l = Math.hypot(...d);
    if (l < 1e-9) return null;
    const n = scl(d, 1 / l), r0 = Math.min(rr, Math.min(...h) * 0.98);
    return { p: add(q, scl(n, r0 > 0 ? r0 : l)), n };
  };
  for (const [a, b, c] of ax) for (const s of [-1, 1]) {
    const sb = samples(h[b]), sc = samples(h[c]);
    const P = sb.map((yb) => sc.map((yc) => { const p = [0, 0, 0]; p[a] = s * h[a]; p[b] = yb; p[c] = yc; return put(p) || { p, n: (() => { const n = [0, 0, 0]; n[a] = s; return n; })() }; }));
    for (let i = 0; i < sb.length - 1; i++) for (let j = 0; j < sc.length - 1; j++) {
      const q = s > 0 ? [P[i][j], P[i + 1][j], P[i + 1][j + 1], P[i][j + 1]] : [P[i][j], P[i][j + 1], P[i + 1][j + 1], P[i + 1][j]];
      faces.push({ v: q.map((x) => x.p), n: q.map((x) => x.n), g: 0 });
    }
  }
  return faces;
}

// ---- sweeps: a band (ribbon) or a round tube along a smooth 3D centre line
function catmull3(points, closed, n) {
  const P = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  const dense = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < 40; k++) {
      const t = k / 40, t2 = t * t, t3 = t2 * t;
      dense.push([0, 1, 2].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  dense.push(closed ? dense[0] : points[points.length - 1]);
  // resample evenly by arc length so quads are even
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum.push(cum[i - 1] + Math.hypot(...sub(dense[i], dense[i - 1])));
  const total = cum[cum.length - 1], out = [];
  const m = closed ? n : n + 1;
  for (let k = 0, j = 0; k < m; k++) {
    const s = (k / n) * total;
    while (j < cum.length - 2 && cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    out.push(add(dense[j], scl(sub(dense[j + 1], dense[j]), t)));
  }
  return { pts: out, length: total };
}
// rotation-minimising frames (double reflection, Wang et al. 2008)
function frames(pts, closed) {
  const n = pts.length, T = pts.map((p, i) => {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    return nrm(sub(b, a));
  });
  let r = cross(T[0], [0, 0, 1]);
  if (Math.hypot(...r) < 0.1) r = cross(T[0], [0, 1, 0]);
  const Rr = [nrm(r)];
  const step = (ri, i, j) => {
    const v1 = sub(pts[j], pts[i]), c1 = dot(v1, v1) || 1e-9;
    const rL = sub(ri, scl(v1, (2 / c1) * dot(v1, ri))), tL = sub(T[i], scl(v1, (2 / c1) * dot(v1, T[i])));
    const v2 = sub(T[j], tL), c2 = dot(v2, v2);
    return nrm(c2 < 1e-12 ? rL : sub(rL, scl(v2, (2 / c2) * dot(v2, rL))));
  };
  for (let i = 0; i < n - 1; i++) Rr.push(step(Rr[i], i, i + 1));
  let defect = 0;
  if (closed) { // angle between the transported frame and the start frame, spread along the loop
    const back = step(Rr[n - 1], n - 1, 0), b0 = cross(T[0], Rr[0]);
    defect = Math.atan2(dot(back, b0), dot(back, Rr[0]));
  }
  return { T, R: Rr, defect };
}
function sweepMesh(o, ppu, kind) { // ppu: screen pixels per unit, for the tessellation
  const closed = !!o.closed, twist = o.twist ?? (kind === 'tube' ? 0 : 1);
  const mobius = closed && kind === 'ribbon' && Math.abs((twist * 2) % 2) === 1;
  const ctrl = o.points;
  const est = ctrl.reduce((s, p, i) => (i ? s + Math.hypot(...sub(p, ctrl[i - 1])) : s), 0) * (closed ? 1.15 : 1);
  const n = segs(est * ppu, 1, kind === 'tube' ? 3.5 : 2.6, 40, 1400);
  const { pts } = catmull3(ctrl, closed, n);
  const { T, R, defect } = frames(pts, closed);
  const w = (o.width ?? 0.32) / 2, roll = (o.roll ?? 0) * DEG, curl = mobius ? 0 : o.curl ?? 0.22; // a one-sided band cannot be cupped consistently
  const N = pts.length, stops = o.stopsN ?? 1;
  const g = (u) => (closed ? tri(u) : u);
  const ring = (i) => {
    const u = i / (closed ? N : N - 1);
    const th = roll + 2 * PI * twist * u - (closed ? defect * u : 0);
    let r = R[i % N];
    if (o.hint) r = nrm(sub(o.hint, scl(T[i % N], dot(o.hint, T[i % N])))); // a fixed 'up' instead of a transported frame (spirals)
    const b = cross(T[i % N], r), side = add(scl(r, Math.cos(th)), scl(b, Math.sin(th)));
    const up = add(scl(b, Math.cos(th)), scl(r, -Math.sin(th)));
    return { c: pts[i % N], side, up, u };
  };
  const rings = Array.from({ length: N }, (_, i) => ring(i));
  const faces = [];
  if (kind === 'tube') {
    const rad = o.radius ?? w, m = segs(ppu * rad, 2 * PI, 6, 28, 64);
    const at = (i, j) => { const k = rings[i], a = (j / m) * 2 * PI, d = add(scl(k.side, Math.cos(a)), scl(k.up, Math.sin(a))); return { p: add(k.c, scl(d, rad)), n: d, g: g(k.u) }; };
    const last = closed ? N : N - 1;
    for (let i = 0; i < last; i++) for (let j = 0; j < m; j++) {
      const i2 = (i + 1) % N, q = [at(i, j), at(i2, j), at(i2, j + 1), at(i, j + 1)];
      faces.push({ v: q.map((x) => x.p), n: q.map((x) => x.n), g: (q[0].g + q[1].g) / 2 });
    }
    if (!closed) for (const [i, s] of [[0, -1], [N - 1, 1]]) { // flat round caps
      const k = rings[i], tn = scl(T[i], s);
      for (let j = 0; j < m; j++) { const a = at(i, j), b = at(i, j + 1); faces.push({ v: [k.c, a.p, b.p, k.c], n: [tn, tn, tn, tn], g: a.g }); }
    }
    return faces;
  }
  const m = o.across ?? 14; // across the band
  const at = (k, j, flip = false) => {
    const s = -1 + (2 * j) / m, ss = flip ? -s : s;
    return { p: add(k.c, scl(k.side, ss * w)), n: nrm(add(scl(k.up, flip ? -1 : 1), scl(k.side, ss * curl))), g: g(k.u) };
  };
  const last = closed ? N : N - 1;
  for (let i = 0; i < last; i++) for (let j = 0; j < m; j++) {
    const k1 = rings[i], wrap = closed && i === N - 1, k2 = rings[(i + 1) % N];
    // a half-twisted closed band (Möbius) meets itself flipped: connect across
    const b1 = at(k1, j), b2 = at(k2, j, wrap && mobius), c2 = at(k2, j + 1, wrap && mobius), c1 = at(k1, j + 1);
    faces.push({ v: [b1.p, b2.p, c2.p, c1.p], n: [b1.n, b2.n, c2.n, c1.n], g: (b1.g + b2.g) / 2, two: true });
  }
  return faces;
}

// preset centre lines in unit space (fit in radius ~1), varied by seed
const CURVES = {
  // a curl: a prolate cycloid, the two strands pass each other at opposite depths so they never touch
  loop: () => Array.from({ length: 15 }, (_, k) => { const t = -0.1 * PI + (k / 14) * 2.2 * PI; return [0.45 * (t - PI) + 0.95 * Math.sin(t), -1.0 * Math.cos(t) + 0.1 * (t - PI), 0.55 * Math.sin(t)]; }),
  's-curve': () => [[-1.6, 0.85, -0.2], [-0.8, 0.95, 0.35], [-0.15, 0.4, 0.2], [0.15, -0.35, -0.2], [0.8, -0.9, 0.3], [1.6, -0.8, -0.1]],
  wave: () => Array.from({ length: 9 }, (_, k) => { const s = k / 8; return [-1.7 + 3.4 * s, 0.42 * Math.sin(s * 2 * PI * 1.25), 0.45 * Math.cos(s * 2 * PI * 1.25)]; }),
  spiral: () => Array.from({ length: 22 }, (_, k) => { const s = k / 21, a = s * 2 * PI * 2.4; return [0.72 * Math.cos(a), -1.15 + 2.3 * s, 0.72 * Math.sin(a)]; }),
  mobius: () => Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * 2 * PI; return [Math.cos(a), Math.sin(a) * 0.92, 0.12 * Math.sin(2 * a)]; }),
  knot: () => Array.from({ length: 48 }, (_, k) => { const t = (k / 48) * 2 * PI; return [(Math.sin(t) + 2 * Math.sin(2 * t)) / 3, (Math.cos(t) - 2 * Math.cos(2 * t)) / 3, -Math.sin(3 * t) / 3]; }),
  ring: () => Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * 2 * PI; return [Math.cos(a), Math.sin(a), 0]; }),
};
const CLOSED = new Set(['mobius', 'knot', 'ring']);
export const RIBBON_PRESETS = Object.keys(CURVES);
function presetCurve(name, seed, jitter = 0.12) {
  const make = CURVES[name] || CURVES.loop, r = rng((seed ?? 1) * 13 + 5);
  // variation is a smooth, low-frequency bend of the whole curve (per-point noise would make it lumpy)
  const waves = [0, 1, 2].map(() => ({ w: nrm([r.range(-1, 1), r.range(-1, 1), r.range(-1, 1)]), f: r.range(1.2, 2.2), ph: r.range(0, 6.28) }));
  const pts = make().map((p) => (seed ? p.map((x, k) => x + jitter * 2.5 * Math.sin(dot(p, waves[k].w) * waves[k].f + waves[k].ph)) : p));
  const m = Math.max(...pts.flat().map(Math.abs)) || 1; // fit in radius 1
  return { points: pts.map((p) => scl(p, 1 / m)), closed: CLOSED.has(name) };
}

// ---- extrusion: a Folio prop or `paths` (0..100 box) as a thick object, front faces keep their colours
function ringArea(r) { let a = 0; for (let i = 0; i < r.length; i++) { const p = r[i], q = r[(i + 1) % r.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; }
function inside(pt, r) {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < ((r[j][0] - r[i][0]) * (pt[1] - r[i][1])) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
  return c;
}
const dedupe = (r) => r.filter((p, i) => { const q = r[(i + 1) % r.length]; return i === r.length - 1 ? Math.hypot(p[0] - r[0][0], p[1] - r[0][1]) > 1e-6 : Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; });
// outline of a stroked polyline as rings (closed line -> outer + inner ring, open -> one ring with round caps)
function strokeRings(poly, w) {
  const hw = w / 2, n = poly.length, closed = !!poly.closed;
  if (n < 2) return [];
  const off = (s) => poly.map((p, i) => {
    const a = poly[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = poly[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const p0 = closed || i > 0 ? a : p, p1 = closed || i < n - 1 ? b : p;
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy) || 1;
    return [p[0] - (dy / l) * hw * s, p[1] + (dx / l) * hw * s];
  });
  const L = off(1), Rt = off(-1);
  if (closed) return [L, Rt];
  const cap = (p, q, from) => Array.from({ length: 5 }, (_, k) => { const a = from + (PI * (k + 1)) / 6; return [p[0] + Math.cos(a) * hw, p[1] + Math.sin(a) * hw]; });
  const end = poly[n - 1], prev = poly[n - 2], start = poly[0], next = poly[1];
  const ae = Math.atan2(end[1] - prev[1], end[0] - prev[0]), as = Math.atan2(start[1] - next[1], start[0] - next[0]);
  return [[...L, ...cap(end, prev, ae - PI / 2), ...Rt.reverse(), ...cap(start, next, as - PI / 2)]];
}

function extrudeParts(e, c, size) {
  let paths = e.paths;
  if (e.name) {
    const x = expandProp({ type: 'prop', name: e.name, variant: e.variant, recolor: e.recolor, palette: e.palette });
    if (x.type !== 'draw') throw new Error(`extrude3d: no prop named "${e.name}" (levni list ${e.name})`);
    paths = x.paths;
  }
  if (!paths?.length) throw new Error('extrude3d needs a prop `name` or `paths`');
  const step = clamp(500 / size, 0.6, 3), lines = e.lines ?? 'raised', parts = [];
  // fit the visible ink into the box (like `fit` on a draw), so every prop fills its size
  const all = paths.flatMap((p) => flattenPath(p.d, 4).flat());
  const xs = all.map((q) => q[0]), ys = all.map((q) => q[1]);
  const bx = Math.min(...xs), by = Math.min(...ys), span = Math.max(Math.max(...xs) - bx, Math.max(...ys) - by, 1);
  const ox = bx + (Math.max(...xs) - bx) / 2, oy = by + (Math.max(...ys) - by) / 2;
  const toUnit = (p) => [((p[0] - ox) / span) * 2, -((p[1] - oy) / span) * 2];
  for (const p of paths) {
    const fill = p.fill && p.fill !== 'none' ? c(p.fill) : null;
    if (fill && fill !== 'none') {
      const rings = flattenPath(p.d, step).map(dedupe).filter((r) => r.length > 2);
      if (rings.length) parts.push({ kind: 'fill', col: fill, rule: p.rule === 'evenodd' ? 'evenodd' : 'nonzero', rings: rings.map((r) => r.map(toUnit)) });
    }
    const hasStroke = p.stroke !== 'none' && (p.stroke || !fill);
    if (hasStroke && lines !== 'none') {
      const col = e.ink ? c(e.ink) : c(p.stroke, '#0A3FB0'), w = ((p.weight ?? 10) * 100) / (e.lineScale ? size / e.lineScale : 300);
      const rings = [];
      for (const poly of flattenPath(p.d, step)) {
        const pl = dedupe(poly); pl.closed = poly.closed;
        if (pl.length < 2) continue;
        rings.push(...strokeRings(pl, w).map((r) => r.map(toUnit)));
      }
      // line sides a step lighter than the ink, so outlines read as a rim, not a heavy wall
      if (rings.length) parts.push({ kind: 'line', col, side: hexOf(mixc(rgbOf(col), WHITE, 0.28)), rule: 'evenodd', rings });
    }
  }
  return parts;
}

// ---- the renderer: objects -> sorted SVG quads
// obj: { mesh: faces (unit space), M: rotation, t: world translation (px), unit: px per unit, mat, back?, sort: 'faces'|'object' }
function renderObjects(objs, cam, { seam = 1.1 } = {}) {
  const items = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const box = (p) => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
  const pts = []; // projected face centres, for layout
  for (const o of objs) {
    const CM = mm(cam.R, o.M), group = [];
    for (const fc of o.mesh) {
      const q = fc.v.map((p) => mv(cam.R, add(o.t, scl(mv(o.M, p), o.unit))));
      const cen = scl(q.reduce(add, [0, 0, 0]), 1 / q.length);
      let n = nrm(fc.n.reduce((s, x) => add(s, mv(CM, x)), [0, 0, 0]));
      const v = nrm([-cen[0], -cen[1], cam.d - cen[2]]);
      let mat = fc.mat || o.mat;
      const facing = dot(n, v);
      if (facing < 0) {
        if (!fc.two) continue;
        n = scl(n, -1); mat = o.back || mat;
      }
      const col = hexOf(shade(n, v, mat, fc.g));
      const P = q.map(cam.proj);
      P.forEach(box);
      pts.push(cam.proj(cen));
      const d = 'M' + P.map((p) => `${f(p[0])} ${f(p[1])}`).join('L') + 'Z';
      const item = { z: cen[2], s: `<path d="${d}" fill="${col}" stroke="${col}"/>` };
      if (o.sort === 'object') group.push(item); else items.push(item);
    }
    if (o.sort === 'object' && group.length) {
      group.sort((a, b) => a.z - b.z);
      const zc = mv(cam.R, o.t)[2];
      items.push({ z: zc, s: group.map((g) => g.s).join('') });
    }
  }
  items.sort((a, b) => a.z - b.z);
  return { svg: `<g stroke-width="${seam}" stroke-linejoin="round">${items.map((i) => i.s).join('')}</g>`, bbox: x0 < Infinity ? [x0, y0, x1 - x0, y1 - y0] : null, pts };
}

// extruded objects use a layered order: walls (sorted), then front faces in drawing order, then raised lines
function renderExtrude(o, cam, parts, { depth, seam = 1.1, sheenId }) {
  const D = depth, CM = mm(cam.R, o.M);
  const toCam = (p) => mv(cam.R, add(o.t, scl(mv(o.M, p), o.unit)));
  // which side faces the camera? draw that one as the front
  const fz = nrm(mv(CM, [0, 0, 1])), cz = toCam([0, 0, 0]);
  const s = dot(fz, nrm([-cz[0], -cz[1], cam.d - cz[2]])) >= 0 ? 1 : -1;
  const top = (s * D) / 2, lift = s * Math.max(D * 0.16, 0.012);
  const walls = [], raised = [];
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const box = (p) => { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; };
  // bevel profile: bands from the front edge to the back edge, with normals rolling from front to side to back
  const bands = [[0, 0.07, 28], [0.07, 0.2, 62], [0.2, 0.8, 90], [0.8, 0.93, 118], [0.93, 1, 152]];
  const front = [0, 0, s];
  const mats = new Map();
  const matOf = (col, side) => {
    const k = col + side;
    if (!mats.has(k)) {
      const fi = dot(nrm(mv(CM, front)), KEY);
      const If = 0.16 + 0.84 * clamp((fi + 0.45) / 1.45);
      mats.set(k, material([side ? hexOf(mixc(rgbOf(col), [26, 21, 80], 0.18)) : col], { mid: clamp(If, 0.3, 0.9), gloss: side ? 0.3 : 0.12, rim: side ? 0.12 : 0, shine: 20 }));
    }
    return mats.get(k);
  };
  const wallRing = (ring, part, z0, z1, list, profile) => {
    const A = ringArea(ring), sign = A > 0 ? 1 : -1;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const E = [(dy / l) * sign * part.hole, (-dx / l) * sign * part.hole, 0];
      const Ec = mv(CM, E), mid = toCam([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (z0 + z1) / 2]);
      if (dot(Ec, [-mid[0], -mid[1], cam.d - mid[2]]) <= 0) continue; // the wall faces away
      for (const [t0, t1, ang] of profile) {
        const za = z0 + (z1 - z0) * t0, zb = z0 + (z1 - z0) * t1, th = ang * DEG;
        const n = nrm(add(scl(front, Math.cos(th)), scl(E, Math.sin(th))));
        const q = [[a[0], a[1], za], [b[0], b[1], za], [b[0], b[1], zb], [a[0], a[1], zb]].map(toCam);
        const cen = scl(q.reduce(add, [0, 0, 0]), 0.25), v = nrm([-cen[0], -cen[1], cam.d - cen[2]]);
        const col = hexOf(shade(nrm(mv(CM, n)), v, matOf(part.side || part.col, 1), 0));
        const P = q.map(cam.proj); P.forEach(box);
        list.push({ z: cen[2], s: `<path d="M${P.map((p) => `${f(p[0])} ${f(p[1])}`).join('L')}Z" fill="${col}" stroke="${col}"/>` });
      }
    }
  };
  // hole rings (inside an odd number of the part's other rings) face inward
  for (const part of parts) {
    part.holes = part.rings.map((r, i) => (part.rings.reduce((k, o2, j) => k + (j !== i && inside(r[0], o2) ? 1 : 0), 0) % 2 ? -1 : 1));
  }
  const wallProfile = bands.map(([a, b, ang]) => [a, b, s > 0 ? ang : 180 - ang]);
  for (const part of parts) part.rings.forEach((r, i) => wallRing(r, { ...part, hole: part.holes[i] }, top, -top, walls, wallProfile));
  walls.sort((a, b) => a.z - b.z);
  const faceD = (rings, z) => rings.map((r) => 'M' + r.map((p) => { const P = cam.proj(toCam([p[0], p[1], z])); box(P); return `${f(P[0])} ${f(P[1])}`; }).join('L') + 'Z').join('');
  let fronts = '', lines = '';
  const fn = nrm(mv(CM, front)), vc = nrm([-cz[0], -cz[1], cam.d - cz[2]]);
  for (const part of parts) {
    if (part.kind === 'line') continue;
    const col = hexOf(shade(fn, vc, matOf(part.col, 0), 0));
    const d = faceD(part.rings, top);
    fronts += `<path d="${d}" fill="${col}" fill-rule="${part.rule}"/>`;
    if (sheenId) fronts += `<path d="${d}" fill="url(#${sheenId})" fill-rule="${part.rule}"/>`;
  }
  const lineParts = parts.filter((p) => p.kind === 'line');
  for (const part of lineParts) part.rings.forEach((r, i) => wallRing(r, { ...part, hole: part.holes[i] }, top + lift, top, raised, [[0, 0.5, 35], [0.5, 1, 80]].map(([a, b, g]) => [a, b, s > 0 ? g : 180 - g])));
  raised.sort((a, b) => a.z - b.z);
  for (const part of lineParts) {
    const col = hexOf(shade(fn, vc, matOf(part.col, 0), 0));
    lines += `<path d="${faceD(part.rings, top + lift)}" fill="${col}" fill-rule="evenodd"/>`;
  }
  const svg = `<g stroke-width="${seam}" stroke-linejoin="round">${walls.map((w) => w.s).join('')}</g>${fronts}<g stroke-width="${seam}" stroke-linejoin="round">${raised.map((w) => w.s).join('')}</g>${lines}`;
  return { svg, bbox: x0 < Infinity ? [x0, y0, x1 - x0, y1 - y0] : null };
}

// ---- building objects from element fields
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };
const stopsOf = (o, fallback) => (Array.isArray(o.colors) && o.colors.length ? o.colors : o.color ? [o.color] : fallback);

function buildObject(o, cam, c, extra = {}) {
  const type = String(o.type || '').replace(/3d$/, '');
  const size = o.size ?? 300, unit = size / 2, detail = extra.detail ?? 1, ts = size * detail; // ts: tessellation size
  const t = cam.world(o.x ?? cam.cx, o.y ?? cam.cy, o.z ?? 0);
  const spin = (extra.t || 0) * 360 * (o.spin ?? 0);
  let M = euler(o.rotate || (extra.G || extra.inScene ? null : DEFAULT_ROT[type]) || [0, 0, 0]);
  if (spin) M = mm(rotY(spin * DEG), M);
  if (extra.G) { // group rotation about the group pivot
    M = mm(extra.G, M);
    const rel = sub(t, extra.pivot), r2 = mv(extra.G, rel);
    t[0] = extra.pivot[0] + r2[0]; t[1] = extra.pivot[1] + r2[1]; t[2] = extra.pivot[2] + r2[2];
  }
  const gloss = { gloss: o.gloss, shine: o.shine, rim: o.rim, rimColor: o.rimColor, shadowTint: o.shadowTint, highlight: o.highlight, shadow: o.shadowColor };
  const mat = material(stopsOf(o, DEFAULT_COL[type] || ['#7FA6F2']), gloss, c);
  const base = { M, t, unit, mat, type, size };
  if (type === 'torus') return { ...base, mesh: torusMesh(o, ts) };
  if (type === 'sphere') return { ...base, mesh: sphereMesh(o, ts) };
  if (type === 'blob') return { ...base, mesh: sphereMesh(o, ts, blobBump(o.seed ?? extra.seed ?? 1, o.wobble ?? 0.22)) };
  if (type === 'capsule') return { ...base, mesh: capsuleMesh(o, ts) };
  if (type === 'ribbon' || type === 'tube') {
    let pts, closed = !!o.closed, unitR = unit, width, hint = null;
    if (Array.isArray(o.points) && o.points.length >= 2) {
      // explicit centre line in canvas pixels [x, y, z]: the object is the picture itself
      pts = o.points.map(([x, y, z = 0]) => cam.world(x, y, z));
      t[0] = 0; t[1] = 0; t[2] = 0; unitR = 1; base.M = I3;
      width = o.width ?? 140;
    } else {
      const pc = presetCurve(o.preset || 'loop', o.seed ?? extra.seed, o.jitter ?? (['spiral', 'knot', 'mobius', 'ring'].includes(o.preset) ? 0.04 : 0.1));
      pts = pc.points; closed = o.closed ?? pc.closed; hint = o.preset === 'spiral' ? [0, 1, 0] : null;
      width = (o.width ?? size * (type === 'tube' ? 0.14 : 0.24)) / unit;
    }
    const twist = o.twist ?? (type === 'tube' || o.preset === 'spiral' || o.preset === 'ring' ? 0 : o.preset === 'mobius' ? 0.5 : 1);
    const stops = stopsOf(o, DEFAULT_COL[type]);
    const m2 = material(stops, gloss, c);
    // the back side: the same hues, a little deeper (a Möbius band has one side, so it keeps one material)
    const mob = closed && Math.abs((twist * 2) % 2) === 1;
    const back = mob && !o.back ? m2 : material(o.back ? [o.back] : stops.map((s) => hexOf(mixc(rgbOf(c(s)), [26, 21, 80], 0.22))), gloss, c);
    const mesh = sweepMesh({ points: pts, closed, twist, width, roll: o.roll, curl: o.curl, hint, radius: type === 'tube' ? width / 2 : undefined }, unitR * detail, type);
    return { ...base, unit: unitR, mesh, mat: m2, back };
  }
  if (type === 'cubes') {
    const r = rng((o.seed ?? extra.seed ?? 1) * 3 + 1);
    let blocks = o.blocks;
    if (!blocks) {
      const heights = o.heights || Array.from({ length: (o.rows ?? 3) }, () => Array.from({ length: o.cols ?? 3 }, () => r.int(1, o.maxHeight ?? 4)));
      blocks = [];
      heights.forEach((row, j) => row.forEach((hgt, i) => { for (let k = 0; k < hgt; k++) blocks.push([i - (row.length - 1) / 2, k, j - (heights.length - 1) / 2]); }));
    }
    const gap = o.gap ?? 0.08, round = o.round ?? 0.18, stops = stopsOf(o, DEFAULT_COL.cubes);
    const ext = blocks.reduce((m, b) => Math.max(m, Math.abs(b[0]) + 0.5, Math.abs(b[2]) + 0.5), 0.5);
    const ys = blocks.map((b) => b[1]), ymid = (Math.min(...ys) + Math.max(...ys)) / 2;
    const k = 1 / Math.max(ext * 1.2, (Math.max(...ys) - Math.min(...ys) + 1) * 0.62);
    const hgtMax = Math.max(...ys) || 1;
    return blocks.map((b, i) => {
      const s3 = (1 - gap) / 2, local = scl([b[0], b[1] - ymid, b[2]], k);
      const pw = add(t, scl(mv(M, local), unit));
      const col = o.colors?.length > 1 && o.colorBy !== 'height' ? stops[i % stops.length] : null;
      const m3 = col ? material([col], gloss, c) : material([hexOf(alongc(stops.map((x) => rgbOf(c(x))), b[1] / hgtMax))], gloss, c);
      return { ...base, t: pw, unit: unit * k, mat: m3, mesh: boxMesh([s3, s3, s3], round * s3 * 2, unit * k * detail), sort: 'object' };
    });
  }
  throw new Error(`soft3d: unknown object type "${o.type}"`);
}
const DEFAULT_ROT = { torus: [-38, 18, 0], sphere: [0, 0, 0], blob: [10, 20, 0], capsule: [0, 0, -35], cubes: [24, -38, 0], ribbon: [12, -10, 0], tube: [12, -10, 0], extrude: [-16, -26, 3] };
const DEFAULT_COL = { torus: ['#3FDDB0', '#2BA8E0'], sphere: ['#FFB0C8', '#8E7CF0'], blob: ['#9EE6FF', '#6C7CFF'], capsule: ['#FFD27A', '#FF7A59'], cubes: ['#B9D3FF', '#3D6BFF'], ribbon: ['#2ED3B7', '#1F7BFF', '#3A33D6'], tube: ['#3FDDB0', '#1F9BFF'] };

// soft drop shadow under the drawing: the same group, blurred and offset (cheap: one <use>)
function withShadow(inner, id, o, size) {
  if (!o) return inner;
  const sh = { color: '#1a1550', opacity: 0.2, blur: size * 0.045, dx: size * 0.02, dy: size * 0.07, ...(o === true ? {} : o) };
  return `<defs><g id="${id}">${inner}</g><filter id="${id}s" x="-40%" y="-40%" width="180%" height="180%" color-interpolation-filters="sRGB"><feFlood flood-color="${sh.color}" flood-opacity="${sh.opacity}"/><feComposite in2="SourceAlpha" operator="in"/><feGaussianBlur stdDeviation="${f(sh.blur)}"/><feOffset dx="${f(sh.dx)}" dy="${f(sh.dy)}"/></filter></defs><use href="#${id}" filter="url(#${id}s)"/><use href="#${id}"/>`;
}

// ---- themes and composition presets
export const THEMES = {
  aqua: { bg: ['#E4EEF9', '#CFDDF3'], glow: '#F7FBFF', stops: ['#2ED3B7', '#1F9BFF', '#3A33D6'], solids: [['#7CF0D2', '#2BB5E0'], ['#7FB2FF', '#3A4BE0'], ['#C9F3FF', '#58C8F0']], cubes: ['#DDE9FF', '#3D6BFF'], shadowTint: '#141a5a', dark: false },
  sunset: { bg: ['#FCEDE2', '#F6D3C4'], glow: '#FFF8F1', stops: ['#FFC36B', '#FF6B6B', '#9B3FD1'], solids: [['#FFD08A', '#FF7262'], ['#FF9AA8', '#B34BD8'], ['#FFE3B3', '#FFA36B']], cubes: ['#FFE7CC', '#FF6B6B'], shadowTint: '#4a1240', dark: false },
  'mint-night': { bg: ['#251257', '#140A35'], glow: '#3A1F7A', stops: ['#5BF0C2', '#2BC6D9', '#3F7BFF'], solids: [['#6BF5C8', '#20B7A4'], ['#A7FFE6', '#3FC8D9'], ['#7C8CFF', '#4A3FD1']], cubes: ['#A9FFE4', '#2BB59A'], shadowTint: '#0b0526', dark: true },
  lilac: { bg: ['#EEE9FA', '#DCD3F5'], glow: '#FAF8FF', stops: ['#D7C8FF', '#9A86F5', '#5B47D6'], solids: [['#E2D6FF', '#8E7CF0'], ['#FFC8E6', '#A06BEA'], ['#C3E4FF', '#7D8CF5']], cubes: ['#F1EBFF', '#7A66E8'], shadowTint: '#2a1a66', dark: false },
  'mono-blue': { bg: ['#0B2A8C', '#071A5C'], glow: '#1C46C2', stops: ['#BFD6FF', '#5B8CFF', '#1E46D8'], solids: [['#D6E4FF', '#5B8CFF'], ['#9CC0FF', '#2A55E0'], ['#E8F0FF', '#7FA6FF']], cubes: ['#E2ECFF', '#2F5BE8'], shadowTint: '#040f3a', dark: true },
};
export const LAYOUTS = ['ribbon', 'rings', 'knot', 'orbit', 'stack', 'pebbles', 'spiral', 'mobius', 'wave'];
const AUTO_ORDER = ['ribbon', 'orbit', 'rings', 'spiral', 'pebbles', 'knot', 'wave', 'stack', 'mobius'];
// the layout `preset: "auto"` picks for a seed
export const autoLayout = (seed = 1) => AUTO_ORDER[((((seed | 0) - 1) % AUTO_ORDER.length) + AUTO_ORDER.length) % AUTO_ORDER.length];

function themeOf(p, c) {
  if (p && typeof p === 'object') {
    const stops = p.stops || p.colors || THEMES.aqua.stops;
    const bg = Array.isArray(p.background) ? p.background : [p.background || '#E8EEF8', p.background2 || p.background || '#D9E3F4'];
    const dark = p.dark ?? lum(rgbOf(c(bg[0]))) < 0.4;
    return { bg, glow: p.glow || (dark ? hexOf(mixc(rgbOf(c(bg[0])), WHITE, 0.12)) : '#FFFFFF'), stops, solids: p.solids || [[stops[0], stops[stops.length - 1]], [stops[Math.floor(stops.length / 2)], stops[stops.length - 1]], [stops[0], stops[Math.floor(stops.length / 2)]]], cubes: p.cubes || [stops[0], stops[stops.length - 1]], shadowTint: p.shadowTint || '#1a1550', dark };
  }
  return THEMES[p] || THEMES.aqua;
}

// one layout = objects in a hero frame (centre hx, hy, scale S px), side +1 (hero right) or -1 (hero left)
function layoutObjects(kind, r, th, S, seed) {
  const pick = (a) => a[Math.floor(r.next() * a.length)];
  const sol = () => pick(th.solids);
  const jitter = (a) => r.range(-a, a);
  // a small satellite sphere beside a ribbon, sometimes
  const accent = (objs) => (r.chance(0.55) ? [...objs, { type: 'sphere', x: -S * r.range(0.75, 0.95), y: S * r.range(-0.75, 0.75), z: S * 0.3, size: S * r.range(0.16, 0.24), colors: sol() }] : objs);
  switch (kind) {
    case 'ribbon': return accent([{ type: 'ribbon', preset: pick(['loop', 's-curve', 'loop']), seed, x: 0, y: 0, size: S * 2.1, width: S * 0.36, twist: r.range(0.8, 1.25), colors: th.stops, rotate: [jitter(20), jitter(25), jitter(30)] }]);
    case 'wave': return accent([{ type: 'ribbon', preset: 'wave', seed, x: 0, y: 0, size: S * 2.3, width: S * 0.38, twist: r.range(0.8, 1.6), colors: th.stops, rotate: [jitter(15) + 10, jitter(20), -25 + jitter(20)] }]);
    case 'mobius': return [{ type: 'ribbon', preset: 'mobius', seed, x: 0, y: 0, size: S * 1.55, width: S * 0.5, twist: 0.5, colors: th.stops, rotate: [55 + jitter(15), jitter(25), jitter(40)] }];
    case 'spiral': return accent([{ type: 'ribbon', preset: 'spiral', seed, x: 0, y: 0, size: S * 1.75, width: S * 0.32, twist: 0, colors: th.stops, rotate: [15 + jitter(10), jitter(30), -30 + jitter(25)] }]);
    case 'knot': return [{ type: 'tube', preset: 'knot', seed, x: 0, y: 0, size: S * 1.55, width: S * 0.24, colors: th.stops, rotate: [jitter(30), jitter(30), jitter(180)] }];
    case 'rings': {
      // two links: the second runs through the first one's centre. Three: thinner tubes, links between R + r and
      // 2 (R - r) apart, so each passes its neighbour's hole and never touches the next-but-one
      const three = r.chance(0.5), k = three ? 0.32 : 0.38, R = 1 / (1 + k), rr = k * R, s0 = S * 1.05, u = s0 / 2, base = [-25 + jitter(15), 20 + jitter(20), jitter(40)];
      const d = (three ? (3 * R - rr) / 2 : R) * u;
      const out = [{ type: 'torus', x: -d * 0.5, y: 0, z: 0, size: s0, thickness: k, colors: sol(), rotate: [0, 0, 0] }, { type: 'torus', x: d * 0.5, y: 0, z: 0, size: s0, thickness: k, colors: sol(), rotate: [90, 0, 0] }];
      if (three) out.push({ type: 'torus', x: d * 1.5, y: 0, z: 0, size: s0, thickness: k, colors: sol(), rotate: [0, 0, 0] });
      return { objects: out, rotate: base };
    }
    case 'orbit': return { objects: [
      { type: 'sphere', x: 0, y: 0, size: S * 1.05, colors: sol() },
      { type: 'torus', x: 0, y: 0, size: S * 1.75, thickness: 0.12, colors: sol(), rotate: [72 + jitter(8), 0, 0] },
      { type: 'sphere', x: S * 0.95, y: -S * 0.62, size: S * 0.22, colors: sol() },
    ], rotate: [jitter(10), 0, -18 + jitter(20)] };
    case 'pebbles': return [
      { type: 'blob', x: 0, y: 0, size: S * 1.25, colors: sol(), seed },
      { type: 'capsule', x: -S * 0.62, y: S * 0.5, z: S * 0.4, size: S * 0.62, radius: 0.4, colors: sol(), rotate: [20, 0, 50 + jitter(30)] },
      { type: 'sphere', x: S * 0.55, y: -S * 0.62, z: S * 0.2, size: S * 0.3, colors: sol() },
    ];
    case 'stack': return [{ type: 'cubes', x: 0, y: 0, size: S * 1.55, seed, colors: th.cubes, colorBy: 'height', rows: 3, cols: 3, maxHeight: 4, rotate: [26 + jitter(6), -40 + jitter(15), 0] }];
    default: return [];
  }
}

function soft3dPreset(e, ctx) {
  const { c, canvas } = ctx;
  const W = canvas?.w ?? 1200, H = canvas?.h ?? 673;
  const seed = e.seed ?? 1, r = rng(seed * 101 + 7), th = themeOf(e.palette ?? e.theme ?? 'aqua', c);
  // auto: consecutive seeds walk through every layout before one repeats (and a repeat gets another side and palette mood)
  const name = e.preset === 'auto' || !e.preset ? autoLayout(seed) : e.preset;
  if (!LAYOUTS.includes(name)) throw new Error(`soft3d: unknown preset "${e.preset}". Use auto or one of: ${LAYOUTS.join(', ')}`);
  const cam = camera(canvas, { fov: e.fov ?? 30 });
  const titleZone = e.titleSpace ?? 'bottom';
  // the hero sits opposite the (left-aligned) title; without a title it may take either side
  const side = e.side === 'left' ? -1 : e.side === 'right' ? 1 : titleZone === 'none' && r.chance(0.5) ? -1 : 1;
  const lay = layoutObjects(name, rng(seed * 17 + 3), th, Math.min(W, H) * 0.62, seed);
  const objs0 = Array.isArray(lay) ? lay : lay.objects, groupRot = Array.isArray(lay) ? null : lay.rotate;
  // zones (fractions): the title area on the far side, the badge corner, scored on a coarse grid
  const zones = {
    // the title layer is left-aligned: bottom and top titles use the left ~3/4, a left title a column
    title: titleZone === 'left' ? [0, 0, 0.46, 1] : titleZone === 'top' ? [0, 0, 0.72, 0.4] : titleZone === 'none' ? null : [0, 0.58, 0.72, 0.42],
  };
  const corners = { 'top-left': [0, 0, 0.2, 0.3], 'top-right': [0.8, 0, 0.2, 0.3], 'bottom-left': [0, 0.7, 0.2, 0.3], 'bottom-right': [0.8, 0.7, 0.2, 0.3] };
  const inZone = (p, z) => z && p[0] >= z[0] * W && p[0] <= (z[0] + z[2]) * W && p[1] >= z[1] * H && p[1] <= (z[1] + z[3]) * H;
  // candidates: hero centre and scale; keep the one with the best balance
  const cands = [];
  for (const k of [0.8, 0.92, 1.05, 1.2]) for (const [ax, ay] of [[0.76, 0.42], [0.72, 0.56], [0.82, 0.3], [0.8, 0.62], [0.68, 0.34], [0.86, 0.5], [0.78, 0.22], [0.88, 0.32]]) cands.push({ k, hx: side > 0 ? ax * W : (1 - ax) * W, hy: ay * H });
  const build = (cd, detail = 1) => {
    const pivot = cam.world(cd.hx, cd.hy, 0);
    const G = groupRot ? euler(groupRot) : null;
    return objs0.flatMap((o) => buildObject({ ...o, x: cd.hx + (o.x || 0) * cd.k * side, y: cd.hy + (o.y || 0) * cd.k, z: (o.z || 0) * cd.k, size: o.size * cd.k, width: o.width ? o.width * cd.k : undefined, rotate: o.rotate && side < 0 ? [o.rotate[0], -o.rotate[1], -o.rotate[2]] : o.rotate }, cam, c, { seed, detail, G: G && side < 0 ? euler([groupRot[0], -groupRot[1], -groupRot[2]]) : G, pivot }));
  };
  let best = null;
  const wantCorner = e.badgeCorner;
  // a coarse mesh per scale is enough to measure the layout; other positions shift its projection (perspective drift is small)
  const probe = new Map();
  for (const cd of cands) {
    if (!probe.has(cd.k)) probe.set(cd.k, { cd, pts: renderObjects(build(cd, 0.25), cam).pts });
    const ref = probe.get(cd.k), dx = cd.hx - ref.cd.hx, dy = cd.hy - ref.cd.hy;
    const pts = ref.pts.map((p) => [p[0] + dx, p[1] + dy]);
    if (!pts.length) continue;
    const n = pts.length, on = pts.filter((p) => p[0] >= 0 && p[0] <= W && p[1] >= 0 && p[1] <= H);
    const cover = on.length / n;
    const titleHit = zones.title ? on.filter((p) => inZone(p, zones.title)).length / n : 0;
    const cornerHits = Object.fromEntries(Object.entries(corners).map(([k, z]) => [k, on.filter((p) => inZone(p, z)).length / n]));
    const corner = wantCorner && corners[wantCorner] ? wantCorner : Object.entries(cornerHits).filter(([k]) => !(zones.title && overlapsZone(corners[k], zones.title))).sort((a, b) => a[1] - b[1])[0]?.[0] || 'top-left';
    const edges = [pts.some((p) => p[0] < 0), pts.some((p) => p[0] > W), pts.some((p) => p[1] < 0), pts.some((p) => p[1] > H)].filter(Boolean).length;
    // extent on canvas: bigger is better up to ~half the canvas
    const xs = on.map((p) => p[0]), ys = on.map((p) => p[1]);
    const extent = on.length ? ((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))) / (W * H) : 0;
    const score = -Math.abs(extent - 0.42) * 2 - titleHit * 40 - cornerHits[corner] * 8 - (edges === 0 ? 0.6 : edges > 2 ? 0.4 * (edges - 2) : 0) - (1 - cover) * 0.8 + r.next() * 0.05;
    if (!best || score > best.score) best = { cd, score, corner };
  }
  const objs = build(best.cd);
  const { svg, bbox } = renderObjects(objs, cam, { seam: e.seam ?? 1.1 });
  const id = 's3' + hash(JSON.stringify([e.preset, seed, e.palette, W, H]));
  let s = '';
  // background: a soft studio gradient with a glow behind the hero
  if (e.background !== false) {
    const [b0, b1] = th.bg.map((x) => c(x));
    const gx = f(best.cd.hx), gy = f(best.cd.hy);
    s += `<defs><linearGradient id="${id}b" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${b0}"/><stop offset="1" stop-color="${b1}"/></linearGradient><radialGradient id="${id}g" gradientUnits="userSpaceOnUse" cx="${gx}" cy="${gy}" r="${f(Math.max(W, H) * 0.55)}"><stop offset="0" stop-color="${c(th.glow)}" stop-opacity="${th.dark ? 0.7 : 0.85}"/><stop offset="1" stop-color="${c(th.glow)}" stop-opacity="0"/></radialGradient></defs>`;
    s += `<rect width="${W}" height="${H}" fill="url(#${id}b)"/><rect width="${W}" height="${H}" fill="url(#${id}g)"/>`;
  }
  s += withShadow(svg, id + 'm', e.shadow ?? { color: c(th.shadowTint), opacity: th.dark ? 0.35 : 0.16 }, Math.min(W, H) * 0.7);
  // optional badge in the clear corner
  if (e.badge) {
    const b = typeof e.badge === 'string' ? { src: e.badge } : e.badge, z = corners[best.corner], bs = b.size ?? Math.min(W, H) * 0.15;
    const pad = Math.min(W, H) * 0.07 + bs * 0.72;
    const bx = z[0] < 0.5 ? pad : W - pad, by = z[1] < 0.5 ? pad : H - pad;
    s += SOFT_ASSETS.image({ ...b, x: bx, y: by, size: bs }, { c }).svg;
  }
  e._corner = best.corner;
  return { svg: s, bbox: clipBox(bbox, W, H) };
}
const overlapsZone = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const clipBox = (b, W, H) => {
  if (!b) return null;
  const x0 = Math.max(0, b[0]), y0 = Math.max(0, b[1]), x1 = Math.min(W, b[0] + b[2]), y1 = Math.min(H, b[1] + b[3]);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
};

// ---- element handlers
function single(e, ctx) {
  const cam = camera(ctx.canvas, { fov: e.fov });
  const objs = [].concat(buildObject({ ...e, x: e.x, y: e.y }, cam, ctx.c, { seed: e.seed, t: ctx.t }));
  const { svg, bbox } = renderObjects(objs, cam, { seam: e.seam ?? 1.1 });
  const size = e.size ?? 300;
  return { svg: withShadow(svg, 's3' + hash(JSON.stringify(e)), e.shadow ?? true, size), bbox: clipBox(bbox, cam.W, cam.H) };
}

function extrude(e, { c, canvas, t }) {
  const cam = camera(canvas, { fov: e.fov });
  const size = e.size ?? 300, unit = size / 2;
  const parts = extrudeParts(e, c, size);
  let M = euler(e.rotate || DEFAULT_ROT.extrude);
  if (e.spin) M = mm(rotY((t || 0) * 2 * PI * e.spin), M);
  const o = { M, t: cam.world(e.x ?? cam.cx, e.y ?? cam.cy, e.z ?? 0), unit };
  const id = 's3' + hash(JSON.stringify(e));
  const { svg, bbox } = renderExtrude(o, cam, parts, { depth: (e.depth ?? 0.16) * 2, seam: e.seam ?? 1.1, sheenId: e.sheen === false ? null : id + 'h' });
  let s = '';
  if (bbox && e.sheen !== false) {
    const [x, y, w, h] = bbox;
    s += `<defs><linearGradient id="${id}h" gradientUnits="userSpaceOnUse" x1="${f(x)}" y1="${f(y)}" x2="${f(x + w)}" y2="${f(y + h)}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.26"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#1a1550" stop-opacity="0.12"/></linearGradient></defs>`;
  }
  return { svg: s + withShadow(svg, id + 'm', e.shadow ?? true, size), bbox: clipBox(bbox, cam.W, cam.H) };
}

// a scene of several objects with one camera and one depth sort (interlocking shapes), or a composed cover preset
function soft3d(e, ctx) {
  if (e.preset) return soft3dPreset(e, ctx);
  const cam = camera(ctx.canvas, { fov: e.fov, yaw: e.yaw, pitch: e.pitch });
  const pivot = cam.world(e.x ?? cam.cx, e.y ?? cam.cy, 0), G = e.rotate ? euler(e.rotate) : null;
  const objs = (e.objects || []).flatMap((o, i) => buildObject(o, cam, ctx.c, { seed: (e.seed ?? 1) * 10 + i, G, pivot, t: ctx.t, inScene: true }));
  const { svg, bbox } = renderObjects(objs, cam, { seam: e.seam ?? 1.1 });
  return { svg: withShadow(svg, 's3' + hash(JSON.stringify(e)), e.shadow ?? true, Math.max(...(e.objects || [{ size: 300 }]).map((o) => o.size ?? 300))), bbox: clipBox(bbox, cam.W, cam.H) };
}

export const SOFT3D_ASSETS = {
  soft3d,
  ribbon3d: (e, ctx) => single({ ...e, type: 'ribbon' }, ctx),
  tube3d: (e, ctx) => single({ ...e, type: 'tube' }, ctx),
  torus3d: (e, ctx) => single({ ...e, type: 'torus' }, ctx),
  sphere3d: (e, ctx) => single({ ...e, type: 'sphere' }, ctx),
  capsule3d: (e, ctx) => single({ ...e, type: 'capsule' }, ctx),
  blob3d: (e, ctx) => single({ ...e, type: 'blob' }, ctx),
  cubes3d: (e, ctx) => single({ ...e, type: 'cubes' }, ctx),
  extrude3d: extrude,
};

// internals for tests
export const _internals = { sweepMesh, presetCurve, frames, catmull3, torusMesh, boxMesh, extrudeParts, camera, euler };
