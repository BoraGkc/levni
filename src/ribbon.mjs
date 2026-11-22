// Soft 3D-feel elements for the "soft" finish: twisting gradient ribbons, shaded tubes and image badges.
// A ribbon is a band of the given width swept along a smooth centre line. Where it twists, the band narrows
// to its edge and shows its back side in a darker tone, which reads as a real folded strip in space.
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

const f = (n) => Math.round(n * 10) / 10;

// hex helpers: colour names are resolved by compose's c() before they reach us
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (rgb) => '#' + rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t));
function along(stops, t) {
  if (stops.length === 1) return stops[0];
  const x = Math.max(0, Math.min(1, t)) * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(x));
  return mix(stops[i], stops[i + 1], x - i);
}

// Catmull-Rom through the control points, sampled evenly-ish: returns [[x, y], ...]
function centreLine(points, closed, per = 60) {
  const P = closed ? [points[points.length - 1], ...points, points[0], points[1]] : [points[0], ...points, points[points.length - 1]];
  const out = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    for (let k = 0; k < per; k++) {
      const t = k / per, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((d) => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(closed ? out[0] : points[points.length - 1]);
  return out;
}
// circle: [cx, cy, r] (or [cx, cy, rx, ry, rotationDeg]) instead of points
function pointsOf(e) {
  if (!e.circle) return e.points;
  const [cx, cy, rx, ry = rx, rot = 0] = e.circle, a0 = (rot * Math.PI) / 180;
  return Array.from({ length: 16 }, (_, k) => { const a = (k / 16) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(a0) - y * Math.sin(a0), cy + x * Math.sin(a0) + y * Math.cos(a0)]; });
}
const normals = (pts) => pts.map((p, i) => {
  const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
  return [-dy / l, dx / l];
});
const bboxOf = (pts, pad) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2];
};

export const SOFT_ASSETS = {
  // { points: [[x,y]...] or circle, width, colors: [a, b, ...] along the length, back?, twists?, phase?, closed?, highlight? }
  ribbon(e, { c, t }) {
    const pts = centreLine(pointsOf(e), !!e.closed || !!e.circle, e.detail ?? 90), ns = normals(pts), n = pts.length;
    const stops = (e.colors || ['blue', 'tone']).map((k) => c(k));
    const back = e.back ? c(e.back) : null;
    const W = e.width ?? 160, twists = e.twists ?? 1, phase = ((e.phase ?? 0) + (t || 0) * 2) * Math.PI;
    const light = e.highlight ?? 0.35;
    let s = '';
    for (let i = 0; i < n - 1; i++) {
      const u = i / (n - 1), u2 = (i + 1) / (n - 1);
      const k1 = Math.cos(phase + twists * Math.PI * u), k2 = Math.cos(phase + twists * Math.PI * u2);
      // visible half-width follows |cos|, softened so the band stays generous between twists
      const h1 = (W / 2) * (0.18 + 0.82 * Math.pow(Math.abs(k1), 0.6)), h2 = (W / 2) * (0.18 + 0.82 * Math.pow(Math.abs(k2), 0.6));
      const front = k1 + k2 >= 0, face = (Math.abs(k1) + Math.abs(k2)) / 2;
      const base = along(stops, u);
      const side = front ? base : back ? back : mix(base, '#0b1030', 0.4);
      // lit when facing us, darker as it turns edge-on: a smooth fold without any outline
      const col = mix(mix(side, '#0b1030', (1 - face) * 0.28), '#ffffff', face * light * 0.35);
      const [a, b] = [pts[i], pts[i + 1]], [na, nb] = [ns[i], ns[i + 1]];
      const q = [[a[0] + na[0] * h1, a[1] + na[1] * h1], [b[0] + nb[0] * h2, b[1] + nb[1] * h2], [b[0] - nb[0] * h2, b[1] - nb[1] * h2], [a[0] - na[0] * h1, a[1] - na[1] * h1]];
      s += `<path d="M${q.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L')} Z" fill="${col}" stroke="${col}" stroke-width="1.5" stroke-linejoin="round"/>`;
    }
    return { svg: s, bbox: bboxOf(pts, W / 2) };
  },

  // { points or circle: [cx, cy, r], width, color, light?, closed? }: a round tube, shaded from its dark rim to a light core
  tube(e, { c }) {
    const closed = !!e.closed || !!e.circle, pts = centreLine(pointsOf(e), closed, e.detail ?? 40);
    const d = 'M' + pts.map((p) => `${f(p[0])} ${f(p[1])}`).join(' L') + (closed ? ' Z' : '');
    const base = c(e.color, '#2ED3B7'), dark = mix(base, '#0b1030', 0.45), light = e.light ? c(e.light) : mix(base, '#ffffff', 0.55);
    const W = e.width ?? 90, steps = 30;
    let s = '';
    for (let k = 0; k < steps; k++) {
      const u = k / (steps - 1), w = W * (1 - u * 0.82);
      const col = u < 0.35 ? mix(dark, base, u / 0.35) : mix(base, light, (u - 0.35) / 0.65);
      s += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${f(-u * W * 0.12)} ${f(-u * W * 0.14)})"/>`;
    }
    return { svg: s, bbox: bboxOf(pts, W / 2) };
  },

  // { src: local .png/.jpg/.svg/.webp, x, y (centre), size, card?: true, cardColor?, radius? }: a picture on a rounded card
  image(e, { c }) {
    if (!e.src || !existsSync(e.src)) throw new Error(`image element: file not found: ${e.src}`);
    const type = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[extname(e.src).toLowerCase()];
    if (!type) throw new Error(`image element: use png, jpg, svg or webp (${e.src})`);
    const size = e.size ?? 160, pad = e.card === false ? 0 : size * 0.22, R = e.radius ?? size * 0.22;
    const x0 = e.x - size / 2 - pad, y0 = e.y - size / 2 - pad, W = size + pad * 2;
    let s = '';
    if (e.card !== false) {
      s += `<rect x="${f(x0 + 3)}" y="${f(y0 + 8)}" width="${f(W)}" height="${f(W)}" rx="${f(R)}" fill="#0b1030" opacity="0.14"/>`;
      s += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(W)}" rx="${f(R)}" fill="${c(e.cardColor, '#F3F4F8')}" fill-opacity="0.92" stroke="#ffffff" stroke-opacity="0.8" stroke-width="2"/>`;
    }
    const data = readFileSync(e.src).toString('base64');
    s += `<image x="${f(e.x - size / 2)}" y="${f(e.y - size / 2)}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet" href="data:${type};base64,${data}"/>`;
    return { svg: s, bbox: [x0, y0, W, W] };
  },
};
