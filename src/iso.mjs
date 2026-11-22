// Mini 3D: isometric "little worlds" (rooms, desks, stages, streets) built from boxes, cylinders, floors and walls,
// with three tones per face and house props standing inside them. An `iso` element is a macro: it expands into
// ordinary compose elements (shape, hatch, disc, prop), so every face still gets the hand-inked line, riso plates
// and paper grain. Coordinates are world units (≈ px at scale 1): x to the lower right, y to the lower left, z up.
import { findProp } from './props.mjs';
import { flattenPath } from './ink.mjs';

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;

// lowest drawn point of a 0..100 drawing, so objects stand exactly on the surface instead of floating
const baseCache = new Map();
function baseOf(paths) {
  const key = JSON.stringify(paths).slice(0, 2000);
  if (!baseCache.has(key)) {
    let maxY = 0;
    for (const p of paths || []) for (const poly of flattenPath(p.d, 4)) for (const [, y] of poly) maxY = Math.max(maxY, y);
    baseCache.set(key, maxY || 90);
  }
  return baseCache.get(key);
}

// Three tones per ink: top (lit), left face (mid, faces the light), right face (shade). Shadows lean blue, as riso does.
const TONES = {
  paper: ['paper', '#E6E1D5', '#D3CCBE'],
  white: ['white', '#E9E5DA', '#D5CFC2'],
  blue: ['#5B8DEB', 'blue', 'ink'],
  tone: ['#A9C3F5', 'tone', '#5B8DEB'],
  coral: ['#FF9677', 'coral', '#D4472B'],
  mustard: ['#FFD866', 'mustard', '#D6A21A'],
  green: ['#5DB277', 'green', '#145A2B'],
  ink: ['#2D63C9', 'ink', '#082E85'],
};
const tones = (name) => TONES[name] || [name, name, name];

export function expandIso(e) {
  if (e.type !== 'iso') return [e];
  const s = e.scale ?? 1, ox = e.x ?? 600, oy = e.y ?? 400, lw = e.weight ?? 7;
  // projection: 'iso' (30° isometric, default) or 'oblique' (cabinet: front face flat, depth at 45° and half scale).
  // One projection per scene (research: never mix). In oblique, y is depth going back, x to the right.
  const obl = e.projection === 'oblique', K = 0.5 * Math.SQRT1_2;
  const P = obl
    ? ([x, y, z]) => [ox + x * s + y * K * s, oy - z * s - y * K * s]
    : ([x, y, z]) => [ox + (x - y) * C30 * s, oy + (x + y) * S30 * s - z * s];
  const out = [];
  // dense points along each edge, so the engine's smoothing keeps faces flat and corners sharp
  const dense = (pts, step = 14) => pts.flatMap((a, i) => {
    const b = pts[(i + 1) % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
  const face = (pts, fill, extra = {}) => ({ type: 'shape', points: dense(pts.map(P)), fill, stroke: 'ink', weight: extra.weight ?? lw, offset: extra.offset ?? 1.2, amp: 0.7 });
  const hatchOn = (pts, o = {}) => ({ type: 'hatch', points: pts.map(P), color: o.color ?? 'ink', gap: o.gap ?? 7, weight: o.weight ?? 2.2, angle: o.angle ?? -1.1 });

  // painter's order: floors and walls first, then objects far-to-near (smaller x+y is further away), then by height
  const kindRank = { floor: 0, wall: 1 };
  const objs = (e.objects || []).map((o, i) => ({ ...o, _i: i })).sort((a, b) =>
    (kindRank[a.kind] ?? 2) - (kindRank[b.kind] ?? 2) ||
    (obl ? (b.y + (b.d ?? 0) / 2) - (a.y + (a.d ?? 0) / 2) || (a.x - b.x) : (a.x + (a.w ?? 0) / 2 + a.y + (a.d ?? 0) / 2) - (b.x + (b.w ?? 0) / 2 + b.y + (b.d ?? 0) / 2)) ||
    (a.z ?? 0) - (b.z ?? 0) || a._i - b._i);

  for (const o of objs) {
    const z = o.z ?? 0, [top, mid, dark] = tones(o.color ?? 'paper');
    if (o.kind === 'floor') {
      const pts = [[o.x, o.y, z], [o.x + o.w, o.y, z], [o.x + o.w, o.y + o.d, z], [o.x, o.y + o.d, z]];
      out.push(face(pts, top));
      const step = o.step ?? 40;
      if (o.pattern === 'boards' || o.pattern === 'tiles')
        for (let k = step; k < o.d; k += step) out.push({ type: 'line', points: [P([o.x, o.y + k, z]), P([o.x + o.w, o.y + k, z])], color: mid === top ? 'tone' : mid, weight: 3 });
      if (o.pattern === 'tiles')
        for (let k = step; k < o.w; k += step) out.push({ type: 'line', points: [P([o.x + k, o.y, z]), P([o.x + k, o.y + o.d, z])], color: mid === top ? 'tone' : mid, weight: 3 });
      if (o.pattern === 'hatch') out.push(hatchOn(pts, { color: o.hatchColor ?? 'tone', gap: 12, angle: -0.5 }));
    } else if (o.kind === 'wall') {
      // axis 'x': a wall along x at this y (we see its front, +y side); axis 'y': along y at this x (+x side)
      const pts = o.axis === 'y'
        ? [[o.x, o.y, z], [o.x, o.y + o.d, z], [o.x, o.y + o.d, z + o.h], [o.x, o.y, z + o.h]]
        : [[o.x, o.y, z], [o.x + o.w, o.y, z], [o.x + o.w, o.y, z + o.h], [o.x, o.y, z + o.h]];
      // the two walls of a corner get different tones (left lighter), so the room reads as a volume
      out.push(face(pts, o.axis === 'y' ? top : mid));
      if (o.window) {
        const [u, v, ww, wh] = o.window; // position along the wall and height, size
        const wp = o.axis === 'y'
          ? [[o.x, o.y + u, z + v], [o.x, o.y + u + ww, z + v], [o.x, o.y + u + ww, z + v + wh], [o.x, o.y + u, z + v + wh]]
          : [[o.x + u, o.y, z + v], [o.x + u + ww, o.y, z + v], [o.x + u + ww, o.y, z + v + wh], [o.x + u, o.y, z + v + wh]];
        out.push(face(wp, o.windowColor ?? 'tone', { weight: lw * 0.8 }));
      }
    } else if (o.kind === 'box') {
      const { x, y, w, d, h } = o;
      const T = [[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]];
      const L = obl
        ? [[x, y, z], [x + w, y, z], [x + w, y, z + h], [x, y, z + h]] // oblique: the flat front face (y = near side)
        : [[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]]; // iso: +y face, front-left
      const R = [[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]]; // +x face, front-right
      // cast shadow on the floor, to the side away from the light (offset ≈ 20–35 % of height)
      if (o.shadow !== false && z === 0) out.push({ type: 'shape', points: dense((obl
        ? [[x + w, y, 0], [x + w + h * 0.3, y, 0], [x + w + h * 0.3, y + d, 0], [x + w, y + d, 0]]
        : [[x + w, y, 0], [x + w + h * 0.35, y + h * 0.1, 0], [x + w + h * 0.35, y + d + h * 0.1, 0], [x + w, y + d, 0]]).map(P)), fill: 'tone', stroke: 'none', offset: 0, amp: 0.7 });
      out.push(face(L, mid), face(R, dark), face(T, top));
      if (o.hatch !== false && (o.h ?? 0) > 20) out.push(hatchOn(R, { color: dark === 'ink' ? 'blue' : 'ink', weight: 1.8, gap: 6 }));
      if (o.windows) {
        // window grid on both visible faces: [cols, rows]
        const [cols, rows] = o.windows, wc = o.windowColor ?? (o.color === 'paper' ? 'tone' : 'paper');
        for (let r2 = 0; r2 < rows; r2++) for (let c2 = 0; c2 < cols; c2++) {
          const zz = z + h * (0.15 + (0.75 * r2) / rows), hh = (h * 0.75) / rows * 0.55;
          const ux = x + w * (0.12 + (0.8 * c2) / cols), uw = (w * 0.8) / cols * 0.55;
          const fy = obl ? y : y + d;
          out.push(face([[ux, fy, zz], [ux + uw, fy, zz], [ux + uw, fy, zz + hh], [ux, fy, zz + hh]], wc, { weight: lw * 0.55, offset: 0.6 }));
          const vy = y + d * (0.12 + (0.8 * c2) / cols), vd = (d * 0.8) / cols * 0.55;
          if (c2 < Math.max(1, Math.round((cols * d) / w))) out.push(face([[x + w, vy, zz], [x + w, vy + vd, zz], [x + w, vy + vd, zz + hh], [x + w, vy, zz + hh]], wc, { weight: lw * 0.55, offset: 0.6 }));
        }
      }
      if (o.stripe) { const fy = obl ? y : y + d; out.push(face([[x, fy, z + h * 0.45], [x + w, fy, z + h * 0.45], [x + w, fy, z + h * 0.6], [x, fy, z + h * 0.6]], o.stripe, { weight: lw * 0.6 })); }
    } else if (o.kind === 'cylinder') {
      const [cx, cy] = P([o.x, o.y, z]), [, ty] = P([o.x, o.y, z + o.h]);
      const rx = o.r * s * (obl ? 1 : 1.2247), ry = o.r * s * (obl ? 0.36 : 0.7071), n = 24;
      const side = [[cx + rx, ty]];
      for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI; side.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); }
      side.push([cx - rx, ty]);
      out.push({ type: 'shape', points: side, fill: mid, stroke: 'ink', weight: lw, offset: 1.2 });
      out.push({ type: 'hatch', points: [[cx + rx * 0.35, ty], [cx + rx, ty], [cx + rx, cy], ...Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * (Math.PI / 2.4); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }).reverse(), [cx + rx * 0.35, cy + ry * 0.9]], color: 'ink', gap: 6, weight: 1.8, angle: -1.1 });
      out.push({ type: 'shape', points: Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + rx * Math.cos(a), ty + ry * Math.sin(a)]; }), fill: top, stroke: 'ink', weight: lw, offset: 1.2 });
    } else if (o.kind === 'prop' || o.kind === 'draw') {
      // a house prop (or a custom drawing) standing on a world point: its lowest drawn point sits on the surface,
      // with a soft contact shadow under it
      const [sx, sy] = P([o.x, o.y, z]), size = (o.size ?? 120) * s;
      const found = o.kind === 'prop' ? findProp(o.name) : null;
      const paths = o.kind === 'draw' ? o.paths : found ? found.variants[Math.min(found.variants.length - 1, o.variant ?? 0)].paths : null;
      const base = paths ? baseOf(paths) : 92;
      const cy = sy - ((base - 50) / 100) * size;
      if (o.contact !== false) out.push({ type: 'disc', x: sx + size * 0.05, y: sy, r: size * 0.3, ry: size * 0.07, color: 'tone' });
      const common = { x: sx, y: cy, size, flip: o.flip, rot: o.rot, recolor: o.recolor, palette: o.palette ?? e.palette, shade: o.shade, extrude: o.extrude, shadow: o.shadow };
      out.push(o.kind === 'draw' ? { type: 'draw', paths: o.paths, name: o.name, tags: o.tags, ...common } : { type: 'prop', name: o.name, variant: o.variant, ...common });
    }
  }
  return out;
}
