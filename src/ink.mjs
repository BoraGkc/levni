// Hand inking: turns SVG path outlines into filled pressure-brush shapes, the way a pen line actually looks:
// width breathes along the line, open ends taper, closed shapes overshoot a little where the pen lifts.
// Also the riso plate model: every ink colour is printed from its own slightly misaligned plate.
import { brushStroke } from './assets.mjs';

// ---- SVG path data -> polylines (absolute and relative M L H V Q T C S A Z).
export function flattenPath(d, step = 2.5) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
  const polys = [];
  let cur = [], x = 0, y = 0, sx = 0, sy = 0, cmd = '', lcx = null, lcy = null, i = 0;
  const num = () => parseFloat(toks[i++]);
  const push = (px, py) => cur.push([px, py]);
  const seg = (n) => Math.max(4, Math.ceil(n / step));
  while (i < toks.length) {
    if (/[a-zA-Z]/.test(toks[i])) cmd = toks[i++];
    const rel = cmd === cmd.toLowerCase(), C = cmd.toUpperCase();
    if (C === 'Z') { if (cur.length) { cur.closed = true; polys.push(cur); } cur = []; x = sx; y = sy; lcx = null; continue; }
    if (C === 'M') { if (cur.length > 1) polys.push(cur); cur = []; x = num() + (rel ? x : 0); y = num() + (rel ? y : 0); sx = x; sy = y; push(x, y); cmd = rel ? 'l' : 'L'; lcx = null; continue; }
    if (C === 'L' || C === 'H' || C === 'V') {
      const nx = C === 'V' ? x : num() + (rel ? x : 0), ny = C === 'H' ? y : num() + (rel ? y : 0);
      if (C === 'V' && rel) { /* handled: x stays */ }
      const len = Math.hypot(nx - x, ny - y), n = seg(len);
      for (let k = 1; k <= n; k++) push(x + ((nx - x) * k) / n, y + ((ny - y) * k) / n);
      x = nx; y = ny; lcx = null; continue;
    }
    if (C === 'Q' || C === 'T') {
      let qx, qy;
      if (C === 'Q') { qx = num() + (rel ? x : 0); qy = num() + (rel ? y : 0); } else { qx = lcx != null ? 2 * x - lcx : x; qy = lcy != null ? 2 * y - lcy : y; }
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0), n = seg(Math.hypot(qx - x, qy - y) + Math.hypot(nx - qx, ny - qy));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u * u * x + 2 * u * t * qx + t * t * nx, u * u * y + 2 * u * t * qy + t * t * ny); }
      lcx = qx; lcy = qy; x = nx; y = ny; continue;
    }
    if (C === 'C' || C === 'S') {
      let c1x, c1y;
      if (C === 'C') { c1x = num() + (rel ? x : 0); c1y = num() + (rel ? y : 0); } else { c1x = lcx != null ? 2 * x - lcx : x; c1y = lcy != null ? 2 * y - lcy : y; }
      const c2x = num() + (rel ? x : 0), c2y = num() + (rel ? y : 0), nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0);
      const n = seg(Math.hypot(c1x - x, c1y - y) + Math.hypot(c2x - c1x, c2y - c1y) + Math.hypot(nx - c2x, ny - c2y));
      for (let k = 1; k <= n; k++) { const t = k / n, u = 1 - t; push(u ** 3 * x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * nx, u ** 3 * y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * ny); }
      lcx = c2x; lcy = c2y; x = nx; y = ny; continue;
    }
    if (C === 'A') {
      let rx = Math.abs(num()), ry = Math.abs(num());
      const phi = (num() * Math.PI) / 180, large = num(), sweep = num();
      const nx = num() + (rel ? x : 0), ny = num() + (rel ? y : 0);
      if (!rx || !ry) { push(nx, ny); x = nx; y = ny; continue; }
      // endpoint -> centre parameterisation (SVG spec F.6.5)
      const cp = Math.cos(phi), sp = Math.sin(phi), dx = (x - nx) / 2, dy = (y - ny) / 2;
      const x1 = cp * dx + sp * dy, y1 = -sp * dx + cp * dy;
      const lam = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sign = large === sweep ? -1 : 1;
      const co = sign * Math.sqrt(Math.max(0, (rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1) / (rx * rx * y1 * y1 + ry * ry * x1 * x1)));
      const cxp = (co * rx * y1) / ry, cyp = (-co * ry * x1) / rx;
      const cx = cp * cxp - sp * cyp + (x + nx) / 2, cy = sp * cxp + cp * cyp + (y + ny) / 2;
      const ang = (ux, uy, vx, vy) => Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
      const t1 = ang(1, 0, (x1 - cxp) / rx, (y1 - cyp) / ry);
      let dt = ang((x1 - cxp) / rx, (y1 - cyp) / ry, (-x1 - cxp) / rx, (-y1 - cyp) / ry);
      if (!sweep && dt > 0) dt -= Math.PI * 2; else if (sweep && dt < 0) dt += Math.PI * 2;
      const n = seg(Math.abs(dt) * Math.max(rx, ry));
      for (let k = 1; k <= n; k++) { const t = t1 + (dt * k) / n; push(cx + rx * Math.cos(t) * cp - ry * Math.sin(t) * sp, cy + rx * Math.cos(t) * sp + ry * Math.sin(t) * cp); }
      x = nx; y = ny; lcx = null; continue;
    }
    i++; // unknown token: skip
  }
  if (cur.length > 1) polys.push(cur);
  return polys;
}

const f = (n) => Math.round(n * 10) / 10;
const toD = (pts) => 'M' + pts.map(([px, py]) => `${f(px)},${f(py)}`).join('L') + 'Z';

// One hand-inked outline for a polyline (already in canvas pixels).
export function inkLine(pts, { width = 9, closed = false, r, jit = 1.2, taper }) {
  if (pts.length < 2) return '';
  let line = pts;
  // smooth breathing of the pen: two slow sines with random phase along the length
  const p1 = r.next() * 6.28, p2 = r.next() * 6.28;
  if (closed) {
    // start somewhere random and overshoot ~6% past the start, like a pen that does not land exactly
    const k = Math.floor(r.next() * pts.length), rot = [...pts.slice(k), ...pts.slice(0, k)];
    const extra = Math.max(2, Math.round(rot.length * 0.06));
    line = [...rot, ...rot.slice(0, extra)].map(([px, py], i) => (i >= rot.length ? [px + r.jitter(jit), py + r.jitter(jit)] : [px, py]));
  }
  const n = line.length;
  const outline = brushStroke(line, { width, taper: taper ?? (closed ? 0.18 : 0.32), wobble: 0, r: null });
  // modulate width with the breathing curve by scaling each side point around the centre line
  const half = outline.length / 2;
  const mod = (i) => 0.86 + 0.14 * Math.sin((i / n) * 6.0 + p1) + 0.08 * Math.sin((i / n) * 17 + p2);
  const left = outline.slice(0, half).map(([px, py], i) => { const [cx, cy] = line[i]; const m = mod(i); return [cx + (px - cx) * m, cy + (py - cy) * m]; });
  const right = outline.slice(half).map(([px, py], j) => { const i = n - 1 - j; const [cx, cy] = line[i]; const m = mod(i); return [cx + (px - cx) * m, cy + (py - cy) * m]; });
  return toD([...left, ...right]);
}

// Riso plates: each ink colour gets one offset for the whole scene (seeded), so misregistration is consistent
// across every object, as on a real print. Outline ink is the key plate (no offset); paper is unprinted.
export function plateOffsets(r, strength = 3.2) {
  const plates = {};
  for (const name of ['coral', 'mustard', 'green', 'tone', 'tone-coral', 'tone-green', 'tone-mustard', 'blue']) {
    const a = r.next() * Math.PI * 2, m = strength * (0.6 + 0.4 * r.next());
    plates[name] = [Math.cos(a) * m, Math.sin(a) * m];
  }
  return plates;
}
