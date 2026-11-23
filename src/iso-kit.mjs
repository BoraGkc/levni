// Iso kit: the second-generation renderer behind the `iso` element. iso.mjs hands a world to this module as soon
// as it uses anything new (a diorama `base`, a `preset`, `style: "soft"`, `ao`, or an object kind the first
// renderer does not know), so older scenes keep their exact output.
//
// What it adds: a diorama slab under the world, many more object kinds (stairs, ramps, roofs, openings, fences,
// ponds, roads, trees, lamps, benches, rugs, people, wall-mounted props...), true painter's ordering by 3D
// bounding boxes, soft ambient occlusion, and a second look: `style: "soft"` (smooth shading, no ink outline).
// Everything still expands into ordinary compose elements, plus one internal raw-SVG element (`iso-svg`) for
// gradients and blurred shadows.
import { findProp, expandProp } from './props.mjs';
import { flattenPath } from './ink.mjs';
import { PALETTE, rng } from './style.mjs';
import { ASSETS } from './assets.mjs';
import { buildPreset, PALETTES } from './iso-presets.mjs';

const C30 = Math.cos(Math.PI / 6);
const f1 = (n) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------- colour
export const KIT_HEX = {
  ...PALETTE, tone: '#7FA6F2', 'tone-coral': '#FFB49A', 'tone-green': '#86C796', 'tone-mustard': '#FFE08A',
  wood: '#C98B55', 'wood-light': '#E2B07E', soil: '#C9804F', 'soil-dark': '#9A5A36', grass: '#7DC07A', stone: '#D8D0C0',
  asphalt: '#5B647C', water: '#5B8DEB', glass: '#CFE0FB', light: '#FFE6A0', brick: '#D9714E', sand: '#EBD9B0',
  pink: '#F6B3C2', lilac: '#B9A7F0', teal: '#5FC2B5', chalk: '#2F5D4A', night: '#1C2440',
};
const HOUSE_NAMES = new Set(['paper', 'white', 'ink', 'blue', 'coral', 'green', 'mustard', 'dark', 'tone', 'tone-coral', 'tone-green', 'tone-mustard']);
// three tones per house ink (same table as the first renderer): top, mid, shade
const TONES = {
  paper: ['paper', '#E6E1D5', '#D3CCBE'], white: ['white', '#E9E5DA', '#D5CFC2'], blue: ['#5B8DEB', 'blue', 'ink'],
  tone: ['#A9C3F5', 'tone', '#5B8DEB'], coral: ['#FF9677', 'coral', '#D4472B'], mustard: ['#FFD866', 'mustard', '#D6A21A'],
  green: ['#5DB277', 'green', '#145A2B'], ink: ['#2D63C9', 'ink', '#082E85'],
};
// palette "blue" (hard news): every accent folds into the blue family, like props do
const BLUE_FOLD = { coral: 'blue', mustard: 'tone', green: 'tone', 'tone-coral': 'tone', 'tone-mustard': '#D8E2F5', 'tone-green': 'tone', dark: 'ink', chalk: 'ink', light: '#D8E2F5', wood: '#A9C3F5', brick: 'blue', grass: '#A9C3F5', soil: '#5B8DEB', 'soil-dark': '#2D63C9', '#5DB277': '#7FA6F2', '#FFE08A': '#D8E2F5', '#2E8A4E': '#2D63C9' };
const isHex = (c) => /^#[0-9a-f]{6}$/i.test(c || '');
export const hexOf = (c) => KIT_HEX[c] || (isHex(c) ? c : PALETTE.paper);
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export function mix(a, b, t) {
  const A = rgb(hexOf(a)), B = rgb(hexOf(b));
  return '#' + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, '0')).join('');
}
const lighten = (c, t) => mix(c, '#FFFFFF', t);
const darken = (c, t) => mix(c, '#1A2547', t); // shadows lean blue, as riso does
// a colour as the compose element should receive it: house names stay names (so style packs recolour them)
const ink = (c) => (c === 'none' || HOUSE_NAMES.has(c) ? c : hexOf(c));
const tones3 = (c) => TONES[c] || [lighten(hexOf(c), 0.24), hexOf(c), darken(hexOf(c), 0.34)];

// ---------------------------------------------------------------- geometry
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((k) => k / l); };
const avg = (pts) => pts.reduce((a, p) => a.map((v, i) => v + p[i] / pts.length), pts[0].map(() => 0));
// brightness of a face from its normal: top 1.0, front-left (+y) 0.84, front-right (+x) 0.47
const lumOf = (n) => 0.62 + 0.38 * n[2] + 0.22 * Math.max(0, n[1]) - 0.15 * Math.max(0, n[0]);
const VIEW = [1, 1, 1];

// convex clip (Sutherland-Hodgman) of a polygon by a convex polygon, 2D
function clipPoly(subj, clipper) {
  let out = subj;
  const area = clipper.reduce((a, p, i) => { const q = clipper[(i + 1) % clipper.length]; return a + p[0] * q[1] - q[0] * p[1]; }, 0);
  const inside = (p, a, b) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) * Math.sign(area) >= 0;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i], b = clipper[(i + 1) % clipper.length], inp = out;
    out = [];
    for (let j = 0; j < inp.length; j++) {
      const p = inp[j], q = inp[(j + 1) % inp.length], pin = inside(p, a, b), qin = inside(q, a, b);
      if (pin) out.push(p);
      if (pin !== qin) {
        const d1 = [q[0] - p[0], q[1] - p[1]], d2 = [b[0] - a[0], b[1] - a[1]];
        const den = d1[0] * d2[1] - d1[1] * d2[0];
        if (Math.abs(den) > 1e-9) { const t = ((a[0] - p[0]) * d2[1] - (a[1] - p[1]) * d2[0]) / den; out.push([p[0] + d1[0] * t, p[1] + d1[1] * t]); }
      }
    }
  }
  return out;
}

const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return (h >>> 0).toString(36); };

// lowest drawn point of a 0..100 drawing (same as iso.mjs), so props stand on the surface
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

// kinds the first renderer draws; anything else, or a world option, routes the element here
const LEGACY = new Set(['floor', 'wall', 'box', 'cylinder', 'prop', 'draw']);
export function wantsKit(e) {
  return !!(e.preset || e.base || e.style === 'soft' || e.ao || e.fit ||
    (e.objects || []).some((o) => !LEGACY.has(o.kind) || o.wall || o.door || o.arch || o.windows2 || o.roof || o.light || Array.isArray(o.windows?.[0])));
}

function registerRaw() {
  if (!ASSETS['iso-svg']) ASSETS['iso-svg'] = (e) => ({ svg: e.svg, bbox: e.bbox });
}

// ---------------------------------------------------------------- the renderer
export function expandKit(e) {
  registerRaw();
  const soft = e.style === 'soft';
  const blue = e.palette === 'blue';
  const F = (c) => (blue && BLUE_FOLD[c] ? BLUE_FOLD[c] : c);
  const pal = PALETTES[e.palette] || PALETTES.house;
  const seed = e.seed ?? 1;
  let objects = (e.objects || []).map((o) => ({ ...o }));
  let base = e.base;
  if (e.preset) {
    const pre = buildPreset(e.preset, { seed, palette: pal, paletteName: e.palette, size: e.size });
    const byId = new Map(pre.objects.map((o) => [o.id, o]));
    const extra = [];
    for (const o of objects) {
      if (o.id && byId.has(o.id)) { if (o.remove) byId.delete(o.id); else Object.assign(byId.get(o.id), o); }
      else if (!o.remove) extra.push(o);
    }
    objects = [...[...byId.values()], ...extra];
    if (base === undefined) base = pre.base;
  }
  const ao = e.ao ?? true;
  const pfx = 'k' + hashStr(JSON.stringify([e.x, e.y, e.scale, e.preset, seed, (e.objects || []).length, e.style]));
  let uid = 0;
  const id = (k) => `${pfx}${k}${++uid}`;

  // ---- world bounds (for the base and the auto-fit)
  const wb = worldBounds(objects);
  const B = base ? resolveBase(base, wb, pal, seed, e.preset) : null;

  // ---- projection, auto-fit into a box on the canvas
  let s = e.scale ?? 1, ox = e.x ?? 600, oy = e.y ?? 400;
  const fit = e.fit ?? (e.scale == null && e.x == null && e.y == null ? true : null); // no placement given: fit the canvas
  if (fit) {
    const [fx, fy, fw, fh] = Array.isArray(fit) ? fit : [70, 50, 1060, 573];
    const pts = boundsPoints(objects, wb, B);
    const PX = ([x, y, z]) => [(x - y) * C30, (x + y) * 0.5 - z];
    const sp = pts.map(PX), xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    const bw = Math.max(...xs) - Math.min(...xs), bh = Math.max(...ys) - Math.min(...ys);
    s = e.scale ?? Math.min(fw / bw, fh / bh, 1.6);
    ox = fx + fw / 2 - ((Math.max(...xs) + Math.min(...xs)) / 2) * s;
    oy = fy + fh / 2 - ((Math.max(...ys) + Math.min(...ys)) / 2) * s;
  }
  const P = ([x, y, z]) => [ox + (x - y) * C30 * s, oy + (x + y) * 0.5 * s - z * s];
  const lw = e.weight ?? Math.max(3.2, Math.min(7, 7 * Math.sqrt(s)));

  // ---- emitters
  const dense = (pts, step = 14) => pts.flatMap((a, i) => {
    const b = pts[(i + 1) % pts.length], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  });
  const dpath = (pts, closed = true) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join(' L') + (closed ? 'Z' : '');
  const bboxOf = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
  const raw = (svg, pts) => ({ type: 'iso-svg', svg, bbox: pts ? bboxOf(pts) : undefined });
  const grad = (stops, x1, y1, x2, y2) => {
    const g = id('g');
    return [g, `<linearGradient id="${g}" gradientUnits="userSpaceOnUse" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}">${stops.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('')}</linearGradient>`];
  };
  // a flat 2D shape in screen space. riso: hand-inked outline; soft: clean fill (optional gradient)
  const shape2 = (pts, fill0, o = {}) => {
    const fill = F(fill0);
    if (!soft) return { type: 'shape', points: o.smooth ? pts : dense(pts), fill: ink(fill), stroke: o.outline === false ? 'none' : 'ink', weight: o.weight ?? lw, offset: o.offset ?? 1.2, amp: o.amp ?? 0.7 };
    const d = dpath(pts);
    if (o.grad) {
      const [g, defs] = grad(o.grad.stops, ...o.grad.v);
      return raw(`${defs}<path d="${d}" fill="url(#${g})" stroke="url(#${g})" stroke-width="0.9" stroke-linejoin="round"/>`, pts);
    }
    const h = hexOf(fill);
    return raw(`<path d="${d}" fill="${h}" stroke="${h}" stroke-width="0.9" stroke-linejoin="round"${o.opacity != null ? ` opacity="${o.opacity}"` : ''}/>`, pts);
  };
  const line2 = (pts, color0, w, color = F(color0)) => (soft
    ? raw(`<path d="${dpath(pts, false)}" fill="none" stroke="${hexOf(color)}" stroke-width="${f1(w)}" stroke-linecap="round" stroke-linejoin="round"/>`, pts)
    : { type: 'line', points: pts, color: ink(color), weight: w });
  const hatch2 = (pts, o = {}) => ({ type: 'hatch', points: o.smooth ? pts : dense(pts, 8), color: o.color ?? 'ink', gap: o.gap ?? 6, weight: o.weight ?? 1.8, angle: o.angle ?? -1.1 });

  // a planar face from world points: colour picked from its normal (3 tones in riso, continuous in soft)
  const faceColor = (color0, n, color = F(color0)) => {
    const L = lumOf(n);
    if (!soft) { const t = tones3(color); return L >= 0.92 ? t[0] : L >= 0.7 ? t[1] : t[2]; }
    const h = hexOf(color);
    return L > 0.86 ? lighten(h, (L - 0.86) * 1.3) : darken(h, (0.86 - L) * 0.75);
  };
  function face(pts3, color, n, o = {}) {
    const pts = pts3.map(P), col = faceColor(color, n), out = [];
    if (!soft) {
      out.push(shape2(pts, col, { weight: o.weight ?? lw, outline: o.outline }));
      const [, , bw, bh] = bboxOf(pts);
      if (o.hatch !== false && lumOf(n) < 0.7 && bh > 20 && bw > 10) out.push(hatch2(pts, { color: col === 'ink' || col === '#082E85' ? 'blue' : 'ink' }));
      return out;
    }
    const ys = pts.map((p) => p[1]), xs = pts.map((p) => p[0]);
    const y0 = Math.min(...ys), y1 = Math.max(...ys), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    if (Math.abs(n[2]) < 0.5) {
      // walls and sides: a touch lighter at the top, darker toward the ground (soft ambient occlusion)
      out.push(shape2(pts, col, { grad: { stops: [[0, lighten(col, 0.06)], [0.7, col], [1, darken(col, o.aoBottom ?? 0.12)]], v: [cx, y0, cx, y1] } }));
    } else {
      out.push(shape2(pts, col, { grad: { stops: [[0, lighten(col, 0.05)], [1, darken(col, 0.03)]], v: [cx, y0, cx, y1] } }));
      if (n[2] > 0.9 && o.rim !== false) out.push(raw(`<path d="${dpath(pts)}" fill="none" stroke="${lighten(col, 0.5)}" stroke-width="${f1(Math.max(1, 1.4 * s))}" stroke-linejoin="round" opacity="0.55"/>`, pts));
    }
    return out;
  }
  // convex solid: vertices + faces (index lists); draws only the faces turned toward the viewer
  function solid(verts, faces, color, o = {}) {
    const c0 = avg(verts), out = [];
    for (const fi of faces) {
      const fp = fi.map((i) => verts[i]);
      let n = norm(cross(sub(fp[1], fp[0]), sub(fp[2], fp[0])));
      if ((n[0] * (avg(fp)[0] - c0[0]) + n[1] * (avg(fp)[1] - c0[1]) + n[2] * (avg(fp)[2] - c0[2])) < 0) n = n.map((v) => -v);
      if (n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2] <= 1e-6) continue;
      out.push(...face(fp, (o.colors && o.colors(n)) || color, n, o));
    }
    return out;
  }
  const boxSolid = (x, y, z, w, d, h, color, o = {}) => solid(
    [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z], [x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]],
    [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]], color, o);
  // world circle points (ground ellipse)
  const ring = (x, y, z, r, n = 32, a0 = 0, a1 = Math.PI * 2, ry = r) => Array.from({ length: n }, (_, i) => { const t = a0 + ((a1 - a0) * i) / (a1 - a0 === Math.PI * 2 ? n : n - 1); return [x + r * Math.cos(t), y + ry * Math.sin(t), z]; });
  function cylinder(x, y, z, r, h, color0, o = {}) {
    const color = F(color0);
    const out = [], [top, mid, dark] = soft ? [faceColor(color, [0, 0, 1]), hexOf(color), darken(hexOf(color), 0.3)] : tones3(color);
    const a0 = -Math.PI / 4, a1 = (3 * Math.PI) / 4; // silhouette extremes in screen x
    const bot = ring(x, y, z, r, 20, a0, a1).map(P), topArc = ring(x, y, z + h, r, 20, a0, a1).map(P).reverse();
    const side = [...bot, ...topArc];
    if (h > 0.5) {
      if (soft) {
        const L = P([x, y, z]), xl = L[0] - r * 1.2247 * s, xr = L[0] + r * 1.2247 * s;
        const [g, defs] = grad([[0, lighten(mid, 0.12)], [0.35, mid], [1, darken(mid, 0.32)]], xl, 0, xr, 0);
        out.push(raw(`${defs}<path d="${dpath(side)}" fill="url(#${g})" stroke="url(#${g})" stroke-width="0.9"/>`, side));
      } else {
        out.push(shape2(side, mid, { smooth: true, weight: o.weight ?? lw }));
        const [cx, cy] = P([x, y, z]), [, ty] = P([x, y, z + h]), rx = r * 1.2247 * s, ry = r * 0.7071 * s;
        if (o.hatch !== false && (cy - ty) > 14) out.push(hatch2([[cx + rx * 0.35, ty], [cx + rx, ty], [cx + rx, cy], ...Array.from({ length: 6 }, (_, i) => { const a = (i / 5) * (Math.PI / 2.4); return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; }).reverse(), [cx + rx * 0.35, cy + ry * 0.9]], { color: dark === 'ink' ? 'blue' : 'ink' }));
      }
    }
    const tp = ring(x, y, z + h, r, 28).map(P);
    out.push(soft ? shape2(tp, top, { grad: { stops: [[0, lighten(top, 0.08)], [1, top]], v: [tp[0][0], Math.min(...tp.map((p) => p[1])), tp[0][0], Math.max(...tp.map((p) => p[1]))] } }) : shape2(tp, top, { smooth: true, weight: o.weight ?? lw }));
    return out;
  }
  // a sphere (tree crown, lamp globe): circle with a lit side and a shaded crescent
  function ball(cx3, r, color0, o = {}) {
    const color = F(color0);
    const [cx, cy] = P(cx3), R = r * 1.2247 * s * (o.squash ?? 1), Ry = r * 1.2247 * s;
    const pts = Array.from({ length: 30 }, (_, i) => { const t = (i / 30) * Math.PI * 2; return [cx + R * Math.cos(t), cy + Ry * Math.sin(t)]; });
    if (soft) {
      const g = id('r'), h = hexOf(color);
      return [raw(`<radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${f1(cx - R * 0.35)}" cy="${f1(cy - Ry * 0.4)}" r="${f1(R * 1.45)}"><stop offset="0" stop-color="${lighten(h, 0.3)}"/><stop offset="0.45" stop-color="${h}"/><stop offset="1" stop-color="${darken(h, 0.38)}"/></radialGradient><path d="${dpath(pts)}" fill="url(#${g})"/>`, pts)];
    }
    const t = tones3(color), out = [shape2(pts, o.lit ?? t[0], { smooth: true, weight: o.weight ?? lw })];
    if (o.hatch !== false) {
      const cres = [];
      for (let i = 0; i <= 12; i++) { const a = -0.55 + (i / 12) * 2.9; cres.push([cx + R * 0.97 * Math.cos(a), cy + Ry * 0.97 * Math.sin(a)]); }
      for (let i = 12; i >= 0; i--) { const a = -0.55 + (i / 12) * 2.9; cres.push([cx - R * 0.18 + R * 0.78 * Math.cos(a), cy - Ry * 0.2 + Ry * 0.78 * Math.sin(a)]); }
      out.push(hatch2(cres, { color: 'ink', gap: Math.max(4, 6 * s), weight: 1.6 }));
    }
    return out;
  }
  function cone(x, y, z, r, h, color0, o = {}) {
    const color = F(color0);
    const [cx, cy] = P([x, y, z]), [ax, ay] = P([x, y, z + h]), rx = r * 1.2247 * s, ry = r * 0.7071 * s;
    const arc = Array.from({ length: 17 }, (_, i) => { const t = (i / 16) * Math.PI; return [cx + rx * Math.cos(t), cy + ry * Math.sin(t)]; });
    const pts = [[ax, ay], ...arc];
    if (soft) {
      const h2 = hexOf(color);
      const [g, defs] = grad([[0, lighten(h2, 0.2)], [0.45, h2], [1, darken(h2, 0.36)]], cx - rx, 0, cx + rx, 0);
      return [raw(`${defs}<path d="${dpath(pts)}" fill="url(#${g})"/>`, pts)];
    }
    const t = tones3(color);
    const out = [shape2(pts, t[0], { weight: o.weight ?? lw, smooth: true })];
    const right = [[ax, ay], ...arc.slice(0, 7)];
    out.push(shape2(right.concat([[ax + (arc[6][0] - ax) * 0.02, ay]]), t[1] === 'green' ? '#2E8A4E' : t[1], { outline: false, smooth: true }));
    out.push(shape2(pts, 'none', { weight: o.weight ?? lw, smooth: true }));
    return out;
  }

  // ---- shadow and light batches (drawn on the ground, before every standing thing)
  const shadows = [], glows = [];
  const contact = (pts3, o = {}) => shadows.push({ pts: pts3.map(P), blur: o.blur ?? 5, opacity: o.opacity ?? (soft ? 0.32 : 0.28) });
  const footShadow = (x, y, z, w, d, h) => {
    if (z > 0.5) return;
    const m = Math.min(10, 4 + h * 0.06);
    contact([[x - m * 0.4, y - m * 0.4, 0], [x + w + m, y - m * 0.2, 0], [x + w + m, y + d + m, 0], [x - m * 0.2, y + d + m, 0]], { blur: 3 + Math.min(6, h * 0.05) });
    if (h > 10) {
      // a cast shadow toward +x (light from the upper left), soft and faint
      const k = Math.min(0.5, 0.35);
      shadows.push({ pts: [[x + w, y, 0], [x + w + h * k, y + h * 0.1, 0], [x + w + h * k, y + d + h * 0.1, 0], [x + w, y + d, 0]].map(P), blur: soft ? 6 : 0, opacity: soft ? 0.16 : 0.45, cast: true });
    }
  };

  // ---- the ground layer and the sortable units
  const ground = [], units = [], walls = objects.filter((o) => o.kind === 'wall');
  const unit = (bx, draw, o = {}) => units.push({ b: bx, draw, i: units.length, ...o });
  const mounted = new Map(); // wall object -> items hung on it

  const findWall = (o) => {
    const ax = o.wall === 'y' ? 'y' : 'x';
    const cands = walls.filter((w) => (w.axis ?? 'x') === ax);
    if (!cands.length) return { axis: ax, x: 0, y: 0, z: 0, w: 1e4, d: 1e4, h: 1e4, _virtual: true };
    const u = ax === 'x' ? o.x : o.y;
    return cands.find((w) => (ax === 'x' ? u >= w.x && u <= w.x + (w.w ?? 0) : u >= w.y && u <= w.y + (w.d ?? 0))) || cands[0];
  };
  // a point on a wall's inner face: along u, height v, pushed `off` toward the room
  const onWall = (w, u, v, off = 0.6) => ((w.axis ?? 'x') === 'y' ? [w.x + off, u, v] : [u, w.y + off, v]);
  // along-wall unit vector in the "reading right" direction as seen from the room
  const wallRight = (w) => ((w.axis ?? 'x') === 'y' ? [0, -1, 0] : [1, 0, 0]);

  for (const o0 of objects) {
    const o = o0, k = o.kind, z = o.z ?? 0;
    if ((o.wall && (k === 'prop' || k === 'draw' || k === 'frame' || k === 'clock' || k === 'board')) || k === 'frame' || k === 'clock' || k === 'board') {
      const w = findWall(o);
      if (!mounted.has(w)) mounted.set(w, []);
      mounted.get(w).push(o);
      if (w._virtual) unit(o.wall === 'y' ? [0, 1, o.y - 40, o.y + 40, 0, 300] : [o.x - 40, o.x + 40, 0, 1, 0, 300], () => drawMounted(w, [o]));
      continue;
    }
    switch (k) {
      case 'floor': case 'rug': case 'decal': case 'road': case 'path': case 'pond': case 'water':
        ground.push(o); break;
      case 'wall': {
        const t = o.t ?? 14, ax = o.axis ?? 'x';
        const bx = ax === 'y' ? [o.x - t, o.x, o.y - (o.corner === false ? 0 : 0), o.y + o.d, z, z + o.h] : [o.x - (o.corner === false ? 0 : t), o.x + o.w, o.y - t, o.y, z, z + o.h];
        unit(bx, () => drawWall(o));
        for (const win of normWindows(o)) if (win.light) glows.push(() => windowLight(o, win));
        if (ao) wallAO(o);
        break;
      }
      case 'box': case 'building': case 'house': {
        const h = o.h ?? 60;
        unit([o.x, o.x + o.w, o.y, o.y + o.d, z, z + h + ((o.roof ?? (k === 'house' ? 'gable' : null)) && o.roof !== 'flat' ? (o.roofH ?? Math.min(o.w, o.d) * 0.55) : 0)], () => drawBox(o));
        if (o.shadow !== false) footShadow(o.x, o.y, z, o.w, o.d, h);
        break;
      }
      case 'cylinder': case 'stool': case 'pot': {
        const r = o.r ?? 20, h = o.h ?? 40;
        unit([o.x - r, o.x + r, o.y - r, o.y + r, z, z + h], () => (k === 'pot' ? drawPot(o) : cylinder(o.x, o.y, z, r, h, o.color ?? (k === 'stool' ? pal.wood : 'paper'), { weight: o.weight ?? (r < 8 ? lw * 0.45 : r < 16 ? lw * 0.7 : undefined), hatch: r >= 8 })));
        if (z < 0.5) contact(ring(o.x + 2, o.y + 2, 0, r * 1.15, 20), { blur: 3 });
        break;
      }
      case 'stairs': case 'ramp': {
        unit([o.x, o.x + o.w, o.y, o.y + o.d, z, z + o.h], () => (k === 'stairs' ? drawStairs(o) : drawRamp(o)));
        footShadow(o.x, o.y, z, o.w, o.d, o.h * 0.5);
        break;
      }
      case 'roof': unit([o.x, o.x + o.w, o.y, o.y + o.d, z, z + (o.h ?? 40)], () => drawRoof(o, o.x, o.y, z, o.w, o.d)); break;
      case 'fence': case 'lowwall': case 'hedge': {
        const ax = o.axis ?? 'x', L = o.w ?? o.d ?? 100, t = o.t ?? (k === 'fence' ? 4 : k === 'hedge' ? 18 : 12), h = o.h ?? (k === 'fence' ? 26 : k === 'hedge' ? 24 : 22);
        const bx = ax === 'x' ? [o.x, o.x + L, o.y, o.y + t, z, z + h] : [o.x, o.x + t, o.y, o.y + L, z, z + h];
        unit(bx, () => drawRun(o, k, ax, L, t, h));
        if (k !== 'fence') footShadow(bx[0], bx[2], z, bx[1] - bx[0], bx[3] - bx[2], h * 0.6);
        break;
      }
      case 'tree': case 'bush': {
        const r = o.r ?? (k === 'bush' ? 16 : 26), h = o.h ?? (k === 'bush' ? r * 1.6 : 90);
        unit([o.x - r * 0.6, o.x + r * 0.6, o.y - r * 0.6, o.y + r * 0.6, z, z + h], () => drawTree(o, k, r, h));
        if (z < 0.5) contact(ring(o.x + r * 0.25, o.y + r * 0.25, 0, r * (k === 'bush' ? 1.1 : 0.85), 20), { blur: 5, opacity: soft ? 0.26 : 0.22 });
        break;
      }
      case 'lamp': case 'lamppost': {
        const h = o.h ?? 110;
        unit([o.x - 4, o.x + 4, o.y - 4, o.y + 4, z, z + h + 12], () => drawLamp(o, h));
        contact(ring(o.x + 2, o.y + 2, 0, 9, 14), { blur: 2.5 });
        if (o.glow !== false) glows.push(() => pool(o.x, o.y, z, o.glowR ?? 55, o.glowColor ?? pal.light));
        break;
      }
      case 'bench': case 'chair': case 'table': case 'desk': case 'sofa': case 'shelf': case 'counter': case 'bed': case 'car': {
        const dims = FURNITURE[k](o, pal);
        unit([o.x, o.x + dims.w, o.y, o.y + dims.d, z, z + dims.h], () => drawFurniture(o, k, dims));
        if (z < 0.5) footShadow(o.x, o.y, 0, dims.w, dims.d, Math.min(dims.h, 30) * (k === 'chair' || k === 'table' ? 0.4 : 1));
        break;
      }
      case 'person': {
        const h = o.h ?? 120;
        unit([o.x - 6, o.x + 6, o.y - 6, o.y + 6, z, z + h], () => drawPerson(o, h), { sprite: true, bias: o.bias ?? (o.pose === 'sitting' ? 60 : 0) });
        if (z < 0.5) contact(ring(o.x + 1, o.y + 1, 0, h * 0.16, 16), { blur: 2.5, opacity: soft ? 0.3 : 0.25 });
        break;
      }
      case 'prop': case 'draw': {
        const size = o.size ?? 120, fr = (o.foot ?? size * 0.22);
        unit([o.x - fr, o.x + fr, o.y - fr, o.y + fr, z, z + size * 0.8], () => drawProp(o), { sprite: true });
        if (o.contact !== false && z < 0.5) contact(ring(o.x + 3, o.y + 3, 0, fr * 0.9, 18), { blur: 4, opacity: soft ? 0.26 : 0.2 });
        break;
      }
      default:
    }
  }

  // ---------------------------------------------------------------- kinds
  function normWindows(o) {
    const list = [];
    if (o.window) { const [u, v, w, h] = o.window; list.push({ u, v, w, h, light: o.light }); }
    if (Array.isArray(o.windows)) for (const win of o.windows) list.push(Array.isArray(win) ? { u: win[0], v: win[1], w: win[2], h: win[3], light: o.light } : { light: o.light, ...win });
    // fractions (a legacy habit: [0.55, 0.25, 0.3, 0.4]) mean a share of the wall
    const L = (o.axis ?? 'x') === 'y' ? o.d : o.w;
    return list.map((w) => (w.u <= 1 && w.w <= 1 ? { ...w, u: w.u * L, w: w.w * L, v: w.v * o.h, h: w.h * o.h } : w));
  }
  function wallAO(o) {
    const ax = o.axis ?? 'x', L = ax === 'y' ? o.d : o.w, z = o.z ?? 0, m = 26;
    if (z > 0.5) return;
    const a = ax === 'y' ? [[o.x, o.y, 0], [o.x, o.y + L, 0], [o.x + m, o.y + L, 0], [o.x + m, o.y, 0]] : [[o.x, o.y, 0], [o.x + L, o.y, 0], [o.x + L, o.y + m, 0], [o.x, o.y + m, 0]];
    shadows.push({ pts: a.map(P), blur: 0, opacity: 1, gradTo: ax === 'y' ? P([o.x + m, o.y + L / 2, 0]) : P([o.x + L / 2, o.y + m, 0]), from: ax === 'y' ? P([o.x, o.y + L / 2, 0]) : P([o.x + L / 2, o.y, 0]) });
  }
  function windowLight(o, win) {
    // sunlight through a window: the window rectangle projected along the light onto the floor
    const ax = o.axis ?? 'x', kx = 0.45, ky = 0.95, z0 = o.z ?? 0;
    const corners = [[win.u, win.v], [win.u + win.w, win.v], [win.u + win.w, win.v + win.h], [win.u, win.v + win.h]];
    const pts = corners.map(([u, v]) => {
      const zz = z0 + v;
      return ax === 'y' ? [o.x + zz * ky, o.y + u + zz * kx, 0] : [o.x + u + zz * kx, o.y + zz * ky, 0];
    });
    return pool(null, null, 0, 0, pal.light, pts);
  }
  function pool(x, y, z, r, color, pts3) {
    const pts = (pts3 || ring(x, y, z, r, 32)).map(P);
    if (pts3) {
      // a window's patch of sunlight: flat, a little blurred at the edges
      if (!soft) return raw(`<path d="${dpath(pts)}" fill="${hexOf(F('tone-mustard'))}" opacity="0.6" style="mix-blend-mode:multiply"/>`, pts);
      const fid = id('w');
      return raw(`<filter id="${fid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f1(Math.max(1, 2.5 * s))}"/></filter><path d="${dpath(pts)}" fill="${lighten(hexOf(F(color)), 0.45)}" opacity="0.55" filter="url(#${fid})"/>`, pts);
    }
    const [cx, cy] = P([x, y, z]), R = r * 1.2247 * s, g = id('p'), h = hexOf(F(color)), tm = hexOf(F('tone-mustard'));
    return raw(`<radialGradient id="${g}" gradientUnits="userSpaceOnUse" cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(R)}" gradientTransform="translate(0 ${f1(cy)}) scale(1 0.5774) translate(0 ${f1(-cy)})"><stop offset="0" stop-color="${soft ? lighten(h, 0.35) : tm}" stop-opacity="${soft ? 0.7 : 0.75}"/><stop offset="0.6" stop-color="${soft ? h : tm}" stop-opacity="${soft ? 0.35 : 0.45}"/><stop offset="1" stop-color="${h}" stop-opacity="0"/></radialGradient><path d="${dpath(pts)}" fill="url(#${g})"${soft ? '' : ' style="mix-blend-mode:multiply"'}/>`, pts);
  }
  function drawGround(o) {
    const k = o.kind, z = o.z ?? 0, out = [];
    const rectPts = (x, y, w, d) => [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
    const shapePts = (inset = 0) => (o.shape === 'round'
      ? ring(o.x + o.w / 2, o.y + o.d / 2, z, Math.max(1, o.w / 2 - inset), 36, 0, Math.PI * 2, Math.max(1, o.d / 2 - inset))
      : rectPts(o.x + inset, o.y + inset, o.w - inset * 2, o.d - inset * 2));
    if (k === 'floor') {
      const pts = rectPts(o.x, o.y, o.w, o.d);
      const col = o.color ?? pal.floor;
      out.push(...face(pts, col, [0, 0, 1], { rim: false }));
      const step = o.step ?? 40, lc = soft ? darken(hexOf(col), 0.07) : (tones3(col)[1] === col ? 'tone' : tones3(col)[1]);
      const lwp = soft ? Math.max(0.8, 1.6 * s) : 3;
      if (o.pattern === 'boards' || o.pattern === 'tiles')
        for (let q = step; q < o.d - 1; q += step) out.push(line2([P([o.x, o.y + q, z]), P([o.x + o.w, o.y + q, z])], lc, lwp));
      if (o.pattern === 'tiles')
        for (let q = step; q < o.w - 1; q += step) out.push(line2([P([o.x + q, o.y, z]), P([o.x + q, o.y + o.d, z])], lc, lwp));
      if (o.pattern === 'checker') {
        for (let i = 0; i * step < o.w; i++) for (let j = 0; j * step < o.d; j++) if ((i + j) % 2) {
          const q = rectPts(o.x + i * step, o.y + j * step, Math.min(step, o.w - i * step), Math.min(step, o.d - j * step)).map(P);
          out.push(shape2(q, o.color2 ?? (soft ? darken(hexOf(col), 0.08) : tones3(col)[1]), { outline: false }));
        }
      }
      if (o.pattern === 'hatch') out.push(hatch2(pts.map(P), { color: o.hatchColor ?? 'tone', gap: 12, angle: -0.5, weight: 2.2 }));
    } else if (k === 'rug' || k === 'decal') {
      const col = o.color ?? 'coral';
      out.push(shape2(shapePts().map(P), soft ? lighten(hexOf(col), 0.06) : col, { weight: lw * 0.7, smooth: o.shape === 'round' }));
      if (o.border !== false && k === 'rug') out.push(shape2(shapePts(Math.min(o.w, o.d) * 0.1).map(P), o.border ?? (soft ? lighten(hexOf(col), 0.3) : tones3(col)[0]), { weight: lw * 0.45, outline: !soft, smooth: o.shape === 'round' }));
      if (o.pattern === 'stripes' && o.shape !== 'round') for (let q = 1; q < 5; q++) {
        const xx = o.x + (o.w * q) / 5;
        out.push(line2([P([xx, o.y + o.d * 0.18, z]), P([xx, o.y + o.d * 0.82, z])], o.stripe ?? (soft ? darken(hexOf(col), 0.15) : 'paper'), Math.max(1.5, 3 * s)));
      }
    } else if (k === 'road') {
      const ax = o.axis ?? 'x', col = o.color ?? pal.road;
      out.push(shape2(rectPts(o.x, o.y, o.w, o.d).map(P), soft ? hexOf(col) : col, { weight: lw * 0.6 }));
      if (o.dashes !== false) {
        const L = ax === 'x' ? o.w : o.d, dl = o.dash ?? 22, n = Math.floor(L / (dl * 2));
        for (let q = 0; q < n; q++) {
          const a = (L - n * dl * 2) / 2 + q * dl * 2 + dl / 2;
          const pts = ax === 'x' ? rectPts(o.x + a, o.y + o.d / 2 - 2.5, dl, 5) : rectPts(o.x + o.d / 2 - 2.5 + (o.w - o.d) / 2, o.y + a, 5, dl);
          const ptsC = ax === 'x' ? pts : rectPts(o.x + o.w / 2 - 2.5, o.y + a, 5, dl);
          out.push(shape2(ptsC.map(P), o.line ?? (soft ? '#F2EEDF' : 'paper'), { outline: false }));
        }
      }
      if (o.crossing != null) {
        const c0 = o.crossing, wd = ax === 'x' ? o.d : o.w;
        for (let q = 0; q < 5; q++) {
          const a = wd * 0.1 + q * (wd * 0.8) / 5;
          const pts = ax === 'x' ? rectPts(o.x + c0, o.y + a, 40, wd * 0.1) : rectPts(o.x + a, o.y + c0, wd * 0.1, 40);
          out.push(shape2(pts.map(P), soft ? '#F2EEDF' : 'paper', { outline: false }));
        }
      }
    } else if (k === 'path') {
      const col = o.color ?? pal.path ?? 'stone';
      out.push(shape2(shapePts().map(P), soft ? hexOf(col) : col, { weight: lw * 0.5, outline: o.outline ?? !soft, smooth: o.shape === 'round' }));
      if (o.stones) {
        const r2 = rng((o.seed ?? 7) + Math.round(o.x * 3 + o.y));
        const ax = o.axis ?? (o.w >= o.d ? 'x' : 'y'), L = ax === 'x' ? o.w : o.d, wd = ax === 'x' ? o.d : o.w;
        for (let a = 10; a < L - 14; a += 26) {
          const sw = 14 + r2.next() * 6, sd = wd * 0.5;
          const off = (wd - sd) / 2 + r2.jitter(wd * 0.08);
          const pts = ax === 'x' ? rectPts(o.x + a, o.y + off, sw, sd) : rectPts(o.x + off, o.y + a, sd, sw);
          out.push(shape2(pts.map(P), soft ? darken(hexOf(col), 0.12) : tones3(col)[1], { outline: false }));
        }
      }
    } else if (k === 'pond' || k === 'water') {
      const round = o.shape !== 'rect';
      const r0 = (inset, zz = z) => (round ? ring(o.x + o.w / 2, o.y + o.d / 2, zz, o.w / 2 - inset, 40, 0, Math.PI * 2, o.d / 2 - inset) : rectPts(o.x + inset, o.y + inset, o.w - 2 * inset, o.d - 2 * inset).map(([a, b]) => [a, b, zz]));
      const rim = o.rim ?? 7, wc = o.color ?? pal.water;
      if (rim > 0) out.push(shape2(r0(0).map(P), soft ? hexOf(pal.stone) : pal.stone, { weight: lw * 0.6, smooth: round }));
      const bank = r0(rim).map(P);
      out.push(shape2(bank, soft ? darken(hexOf(pal.stone), 0.25) : tones3(pal.stone)[2], { outline: false, smooth: round }));
      const wpts = r0(rim + 1, z - 5).map(P);
      const top = Math.min(...wpts.map((p) => p[1])), bot = Math.max(...wpts.map((p) => p[1]));
      const sw = clipPoly(wpts, bank);
      out.push(soft
        ? shape2(sw, wc, { grad: { stops: [[0, darken(hexOf(wc), 0.22)], [1, lighten(hexOf(wc), 0.22)]], v: [0, top, 0, bot] } })
        : shape2(sw, soft ? wc : (TONES[wc] ? tones3(wc)[0] : wc), { outline: false, smooth: true }));
      // ripples: thin arcs in ground-plane circles
      const cx = o.x + o.w * 0.55, cy = o.y + o.d * 0.5, rr = Math.min(o.w, o.d) * 0.16;
      for (const [k2, a0, a1] of [[1, 0.2, 2.4], [1.9, 0.5, 2.0]]) {
        const arc = ring(cx, cy, z - 5, rr * k2, 14, a0, a1).map(P);
        out.push(line2(arc, soft ? lighten(hexOf(wc), 0.6) : 'paper', Math.max(1.2, 2.6 * s)));
      }
      const arc2 = ring(o.x + o.w * 0.3, o.y + o.d * 0.35, z - 5, rr * 0.7, 10, 3.6, 5.4).map(P);
      out.push(line2(arc2, soft ? lighten(hexOf(wc), 0.6) : 'paper', Math.max(1, 2.2 * s)));
      if (o.lily !== false) {
        const lp = ring(o.x + o.w * 0.32, o.y + o.d * 0.62, z - 5, Math.min(o.w, o.d) * 0.08, 14).map(P);
        out.push(shape2(lp, soft ? hexOf(pal.grass) : 'green', { weight: lw * 0.4, smooth: true }));
      }
    }
    return out;
  }

  function drawWall(o) {
    const ax = o.axis ?? 'x', t = o.t ?? 14, z = o.z ?? 0, col = o.color ?? pal.wall, out = [];
    const L = ax === 'y' ? o.d : o.w;
    // the wall as a thick slab: inner face, top, and the end that faces the viewer
    const x0 = ax === 'y' ? o.x - t : o.x - (o.corner === false ? 0 : t), y0 = ax === 'y' ? o.y : o.y - t;
    const w = ax === 'y' ? t : L + (o.corner === false ? 0 : t), d = ax === 'y' ? L : t;
    out.push(...boxSolid(x0, y0, z, w, d, o.h, col, { colors: (n) => (n[2] > 0.9 ? (o.cap ?? pal.wallCap ?? col) : null), hatch: false, rim: false }));
    // the inner face again in its own (lighter) tone: walls of a corner read as a volume
    const inner = ax === 'y' ? [[o.x, o.y, z], [o.x, o.y + L, z], [o.x, o.y + L, z + o.h], [o.x, o.y, z + o.h]] : [[o.x, o.y, z], [o.x + L, o.y, z], [o.x + L, o.y, z + o.h], [o.x, o.y, z + o.h]];
    out.push(...face(inner, col, ax === 'y' ? [0.6, 0, 0.8] : [0, 1, 0], { hatch: false, aoBottom: 0.16 }));
    // base board or AO along the floor, and a soft corner shadow
    if (ao) {
      const aoH = Math.min(36, o.h * 0.2);
      const a = inner[0], b = inner[1];
      const band = [a, b, [b[0], b[1], z + aoH], [a[0], a[1], z + aoH]].map(P);
      const [g, defs] = grad([[0, '#1A2547', soft ? 0.18 : 0.22], [1, '#1A2547', 0]], ...P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z]), ...P([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z + aoH]));
      out.push(raw(`${defs}<path d="${dpath(band)}" fill="url(#${g})"/>`, band));
      const corner = walls.some((w2) => w2 !== o && (w2.axis ?? 'x') !== ax && (ax === 'x' ? Math.abs(w2.x - o.x) < 2 : Math.abs(w2.y - o.y) < 2));
      if (corner) {
        const cw = 30, c0 = inner[0], c1 = ax === 'y' ? [o.x, o.y + cw, z] : [o.x + cw, o.y, z];
        const strip = [c0, c1, [c1[0], c1[1], z + o.h], [c0[0], c0[1], z + o.h]].map(P);
        const [g2, defs2] = grad([[0, '#1A2547', soft ? 0.16 : 0.2], [1, '#1A2547', 0]], ...P(c0), ...P(c1));
        out.push(raw(`${defs2}<path d="${dpath(strip)}" fill="url(#${g2})"/>`, strip));
      }
    }
    // openings: door / arch (to the floor) and windows; each shows its reveal (the wall's thickness)
    const openings = [];
    if (o.door) { const [u, ww, hh] = o.door; openings.push({ u, v: 0, w: ww, h: hh, kind: 'door', color: o.doorColor }); }
    if (o.arch) { const [u, ww, hh] = o.arch; openings.push({ u, v: 0, w: ww, h: hh, kind: 'arch', color: o.archColor }); }
    for (const win of normWindows(o)) openings.push({ ...win, kind: 'window' });
    for (const op of openings) out.push(...drawOpening(o, op, t));
    out.push(...drawMounted(o, mounted.get(o) || []));
    return out;
  }
  function openingOutline(o, op, off) {
    // 2D outline in wall coords (u along, v up), arch gets a half-circle top
    const pts = [[op.u, op.v], [op.u + op.w, op.v]];
    if (op.kind === 'arch' || op.round) {
      const r = op.w / 2, spring = op.v + op.h - r;
      pts.push([op.u + op.w, spring]);
      for (let i = 1; i < 12; i++) { const a = (i / 12) * Math.PI; pts.push([op.u + r + r * Math.cos(a), spring + r * Math.sin(a)]); }
      pts.push([op.u, spring]);
    } else pts.push([op.u + op.w, op.v + op.h], [op.u, op.v + op.h]);
    const ax = o.axis ?? 'x', z = o.z ?? 0;
    return pts.map(([u, v]) => (ax === 'y' ? [o.x - off, o.y + u, z + v] : [o.x + u, o.y - off, z + v]));
  }
  function drawOpening(o, op, t) {
    const out = [], col = o.color ?? pal.wall;
    const near = openingOutline(o, op, -0.3).map(P), far = openingOutline(o, op, t).map(P);
    const reveal = soft ? darken(hexOf(col), 0.32) : tones3(col)[2];
    out.push(shape2(near, reveal, { weight: lw * 0.75, outline: !soft, smooth: op.kind === 'arch' }));
    const beyond = op.kind === 'window' ? (op.glass ?? pal.glass) : (op.color ?? pal.beyond ?? pal.glass);
    const vis = clipPoly(far, near);
    if (vis.length > 2) {
      out.push(soft
        ? shape2(vis, beyond, { grad: { stops: [[0, lighten(hexOf(beyond), 0.25)], [1, hexOf(beyond)]], v: [0, Math.min(...vis.map((p) => p[1])), 0, Math.max(...vis.map((p) => p[1]))] } })
        : shape2(vis, beyond, { outline: false, smooth: true }));
    }
    if (op.kind === 'window') {
      // mullions and a sill
      const ax = o.axis ?? 'x', z = o.z ?? 0;
      const W = (u, v, off = -0.5) => P(ax === 'y' ? [o.x - off, o.y + u, z + v] : [o.x + u, o.y - off, z + v]);
      const mc = soft ? lighten(hexOf(col), 0.5) : 'paper', mw = Math.max(1.6, 3.6 * s);
      if (op.mullions !== false) {
        out.push(line2([W(op.u + op.w / 2, op.v, -1), W(op.u + op.w / 2, op.v + op.h, -1)], mc, mw));
        out.push(line2([W(op.u, op.v + op.h * 0.55, -1), W(op.u + op.w, op.v + op.h * 0.55, -1)], mc, mw));
      }
      if (!soft) out.push(shape2(near, 'none', { weight: lw * 0.75 }));
      const sx0 = op.u - 6, sx1 = op.u + op.w + 6, sv = op.v;
      const sill = ax === 'y'
        ? boxSolid(o.x, o.y + sx0, (o.z ?? 0) + sv - 5, 9, sx1 - sx0, 5, o.sill ?? 'paper', { hatch: false })
        : boxSolid(o.x + sx0, o.y, (o.z ?? 0) + sv - 5, sx1 - sx0, 9, 5, o.sill ?? 'paper', { hatch: false });
      out.push(...sill.map((el) => (el.weight ? { ...el, weight: lw * 0.6 } : el)));
    } else if (!soft) out.push(shape2(near, 'none', { weight: lw * 0.75, smooth: op.kind === 'arch' }));
    return out;
  }
  // posters, frames, clocks, boards and props hung on a wall: drawn in the wall's plane (a skew, not standing up)
  function drawMounted(w, items) {
    const out = [], right = wallRight(w);
    for (const it of items) {
      const u = (w.axis ?? 'x') === 'y' ? it.y : it.x, v = it.z ?? 120;
      const at = (du, dv, off = 0.8) => { const b = onWall(w, u, v, off); return [b[0] + right[0] * du, b[1] + right[1] * du, b[2] + dv]; };
      if (it.kind === 'frame' || it.kind === 'board') {
        const fw = it.w ?? (it.kind === 'board' ? 150 : 60), fh = it.h ?? (it.kind === 'board' ? 80 : 46), bw = it.border ?? (it.kind === 'board' ? 7 : 5);
        const rect = (a, b, c2, d2, off) => [at(a, b, off), at(c2, b, off), at(c2, d2, off), at(a, d2, off)].map(P);
        const frameCol = it.frameColor ?? (it.kind === 'board' ? pal.wood : 'ink');
        const inner = it.color ?? (it.kind === 'board' ? (it.chalk === false ? 'white' : 'chalk') : 'paper');
        out.push(shape2(rect(-fw / 2, -fh / 2, fw / 2, fh / 2, 1), soft ? hexOf(frameCol) : frameCol, { weight: lw * 0.6 }));
        out.push(shape2(rect(-fw / 2 + bw, -fh / 2 + bw, fw / 2 - bw, fh / 2 - bw, 1.4), soft ? hexOf(inner) : inner, { weight: lw * 0.4, outline: !soft }));
        const art = it.art ?? (it.kind === 'board' ? 'chalk' : 'hills');
        const ar = rng((it.seed ?? 3) + Math.round(u));
        const iw = fw / 2 - bw - 3, ih = fh / 2 - bw - 3;
        if (art === 'hills') {
          out.push(shape2([at(-iw, -ih, 1.8), at(-iw * 0.2, ih * 0.2, 1.8), at(iw * 0.25, -ih * 0.25, 1.8), at(iw * 0.6, ih * 0.35, 1.8), at(iw, -ih, 1.8)].map(P), it.accent ?? 'green', { outline: false }));
          out.push(shape2(ring(0, 0, 0, Math.min(iw, ih) * 0.22, 14).map(([a, b]) => P(at(-iw * 0.45 + a, ih * 0.5 + b, 1.8))), 'mustard', { outline: false, smooth: true }));
        } else if (art === 'chalk' || art === 'lines') {
          const cc = art === 'chalk' ? (soft ? '#E8F0EA' : 'paper') : 'tone';
          for (let q = 0; q < 3; q++) { const yy = ih * 0.55 - q * ih * 0.5, l = iw * (0.5 + ar.next() * 0.45); out.push(line2([P(at(-iw * 0.8, yy, 2)), P(at(-iw * 0.8 + l * 1.5, yy + ar.jitter(2), 2))], cc, Math.max(1.4, 2.8 * s))); }
          if (art === 'chalk') out.push(line2(ring(0, 0, 0, ih * 0.35, 14).map(([a, b]) => P(at(iw * 0.6 + a, b, 2))), cc, Math.max(1.4, 2.8 * s)));
        } else if (art === 'chart') {
          for (let q = 0; q < 4; q++) { const hh = ih * (0.4 + ar.next() * 1.4); out.push(shape2([at(-iw * 0.75 + q * iw * 0.42, -ih, 2), at(-iw * 0.5 + q * iw * 0.42, -ih, 2), at(-iw * 0.5 + q * iw * 0.42, -ih + hh, 2), at(-iw * 0.75 + q * iw * 0.42, -ih + hh, 2)].map(P), ['coral', 'mustard', 'blue', 'green'][q], { outline: false })); }
        } else if (art === 'blob') {
          out.push(shape2(ring(0, 0, 0, Math.min(iw, ih) * 0.6, 16).map(([a, b]) => P(at(a, b, 1.8))), it.accent ?? 'coral', { outline: false, smooth: true }));
        }
      } else if (it.kind === 'clock') {
        const r = it.r ?? 16, face2 = ring(0, 0, 0, r, 24).map(([a, b]) => P(at(a, b, 1.2)));
        out.push(shape2(face2, it.color ?? 'white', { weight: lw * 0.6, smooth: true }));
        out.push(line2([P(at(0, 0, 1.6)), P(at(0, r * 0.62, 1.6))], 'ink', Math.max(1.6, 3 * s)));
        out.push(line2([P(at(0, 0, 1.6)), P(at(r * 0.45, -r * 0.2, 1.6))], 'ink', Math.max(1.6, 3 * s)));
      } else if (it.kind === 'prop' || it.kind === 'draw') {
        // flatten the drawing's paths and map every point into the wall plane
        const size = it.size ?? 60, k = size / 100;
        const dr = it.kind === 'prop' ? expandProp({ type: 'prop', name: it.name, variant: it.variant, palette: it.palette ?? (e.palette === 'blue' ? 'blue' : undefined), recolor: it.recolor }) : { paths: it.paths };
        if (!dr.paths?.length) continue;
        const ks = k * s;
        const paths = dr.paths.map((p) => {
          const polys = flattenPath(p.d, 2);
          const d = polys.map((poly) => 'M' + poly.map(([a, b]) => { const q = P(at((it.flip ? 50 - a : a - 50) * k, (50 - b) * k, 1.6)); return `${f1(q[0])},${f1(q[1])}`; }).join(' L') + (poly.closed ? 'Z' : '')).join(' ');
          return { ...p, d, weight: (p.weight ?? 10) * ks, dash: p.dash ? (Array.isArray(p.dash) ? p.dash.map((v) => v * ks) : p.dash * ks) : undefined };
        });
        out.push({ type: 'draw', paths, x: 50, y: 50, size: 100, name: it.name });
      }
    }
    return out;
  }

  function drawBox(o) {
    const z = o.z ?? 0, { x, y, w, d } = o, h = o.h ?? 60, col = o.color ?? (o.kind === 'house' || o.kind === 'building' ? pick(pal.buildings, x * 7 + y * 3 + h) : 'paper'), out = [];
    out.push(...boxSolid(x, y, z, w, d, h, col, { hatch: o.hatch }));
    const fy = y + d, fx = x + w;
    // window grid on both visible faces: [cols, rows]
    const grid = o.windows && !Array.isArray(o.windows[0]) ? o.windows : o.kind === 'building' ? [Math.max(2, Math.round(w / 34)), Math.max(2, Math.round(h / 40))] : null;
    if (grid) {
      const [cols, rows] = grid, wc = o.windowColor ?? (soft ? pal.glass : col === 'paper' || col === 'white' ? 'tone' : 'paper');
      const lit = rng(Math.round(x * 7 + y * 13 + h));
      for (let r2 = 0; r2 < rows; r2++) for (let c2 = 0; c2 < cols; c2++) {
        const zz = z + h * (0.15 + (0.75 * r2) / rows), hh = (h * 0.75) / rows * 0.55;
        const ux = x + w * (0.12 + (0.8 * c2) / cols), uw = (w * 0.8) / cols * 0.55;
        const on = o.lights && lit.chance(0.35);
        out.push(...face([[ux, fy, zz], [ux + uw, fy, zz], [ux + uw, fy, zz + hh], [ux, fy, zz + hh]], on ? 'mustard' : wc, [0, 1, 0], { weight: lw * 0.5, hatch: false }));
      }
      const cy2 = Math.max(1, Math.round((cols * d) / w));
      for (let r2 = 0; r2 < rows; r2++) for (let c2 = 0; c2 < cy2; c2++) {
        const zz = z + h * (0.15 + (0.75 * r2) / rows), hh = (h * 0.75) / rows * 0.55;
        const vy = y + d * (0.12 + (0.8 * c2) / cy2), vd = (d * 0.8) / cy2 * 0.55;
        out.push(...face([[fx, vy, zz], [fx, vy + vd, zz], [fx, vy + vd, zz + hh], [fx, vy, zz + hh]], wc, [1, 0, 0], { weight: lw * 0.5, hatch: false }));
      }
    }
    if (o.stripe) out.push(...face([[x, fy, z + h * 0.45], [x + w, fy, z + h * 0.45], [x + w, fy, z + h * 0.6], [x, fy, z + h * 0.6]], o.stripe, [0, 1, 0], { weight: lw * 0.6, hatch: false }));
    if (o.door || o.kind === 'house') {
      const dw = Math.min(26, w * 0.3), dh = Math.min(42, h * 0.62), du = (o.doorAt ?? 0.5) * w - dw / 2;
      out.push(...face([[x + du, fy, z], [x + du + dw, fy, z], [x + du + dw, fy, z + dh], [x + du, fy, z + dh]], o.doorColor ?? pal.door ?? 'coral', [0, 1, 0], { weight: lw * 0.6, hatch: false }));
      if (o.kind === 'house' && !o.windows && w > 60) for (const fu of [0.2, 0.8]) {
        const ww = Math.min(16, w * 0.14), wh = Math.min(18, h * 0.28), cu = fu * w;
        if (Math.abs(cu - (du + dw / 2)) < dw / 2 + ww / 2 + 4) continue;
        out.push(...face([[x + cu - ww / 2, fy, z + h * 0.42], [x + cu + ww / 2, fy, z + h * 0.42], [x + cu + ww / 2, fy, z + h * 0.42 + wh], [x + cu - ww / 2, fy, z + h * 0.42 + wh]], pal.glass, [0, 1, 0], { weight: lw * 0.5, hatch: false }));
      }
      if (o.kind === 'house' && !o.windows) {
        const ww = Math.min(22, d * 0.3), wh = Math.min(22, h * 0.35);
        out.push(...face([[fx, y + d / 2 - ww / 2, z + h * 0.45], [fx, y + d / 2 + ww / 2, z + h * 0.45], [fx, y + d / 2 + ww / 2, z + h * 0.45 + wh], [fx, y + d / 2 - ww / 2, z + h * 0.45 + wh]], pal.glass, [1, 0, 0], { weight: lw * 0.5, hatch: false }));
      }
    }
    const roof = o.roof ?? (o.kind === 'house' ? 'gable' : o.kind === 'building' ? 'flat' : null);
    if (roof) out.push(...drawRoof({ wallColor: col, type: roof === true ? 'gable' : roof, color: o.roofColor ?? (o.kind === 'house' ? pick(pal.roofs, x * 3 + y) : col), h: o.roofH, ridge: o.ridge, overhang: o.overhang, parapet: o.parapet }, x, y, z + h, w, d));
    if (o.ac || (o.kind === 'building' && o.ac !== false && w > 60 && (Math.round(x + y) % 3 === 0))) out.push(...boxSolid(x + w * 0.2, y + d * 0.25, z + h, w * 0.25, d * 0.25, 10, 'paper', { hatch: false, weight: lw * 0.5 }));
    return out;
  }
  function drawRoof(o, x, y, z, w, d) {
    const type = o.type ?? o.roof ?? 'gable', col = o.color ?? pick(pal.roofs, x + y), out = [];
    if (type === 'flat') {
      const p = o.parapet ?? 8, t = 5;
      out.push(...face([[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], soft ? darken(hexOf(col), 0.06) : col, [0, 0, 1], { rim: false }));
      if (p > 0) {
        const pc = o.parapetColor ?? col;
        out.push(...boxSolid(x, y, z, w, t, p, pc, { hatch: false, weight: lw * 0.6 }));
        out.push(...boxSolid(x, y + t, z, t, d - t, p, pc, { hatch: false, weight: lw * 0.6 }));
        out.push(...boxSolid(x + w - t, y + t, z, t, d - t, p, pc, { hatch: false, weight: lw * 0.6 }));
        out.push(...boxSolid(x + t, y + d - t, z, w - 2 * t, t, p, pc, { hatch: false, weight: lw * 0.6 }));
      }
      return out;
    }
    const ov = o.overhang ?? 6, rh = o.h ?? Math.min(w, d) * 0.55;
    const ridge = o.ridge ?? (w >= d ? 'x' : 'y');
    const X0 = x - ov, X1 = x + w + ov, Y0 = y - ov, Y1 = y + d + ov;
    let V;
    if (ridge === 'x') {
      const hipIn = type === 'hip' ? Math.min(w, d) * 0.45 : 0;
      V = [[X0, Y0, z], [X1, Y0, z], [X1, Y1, z], [X0, Y1, z], [X0 + hipIn, (Y0 + Y1) / 2, z + rh], [X1 - hipIn, (Y0 + Y1) / 2, z + rh]];
    } else {
      const hipIn = type === 'hip' ? Math.min(w, d) * 0.45 : 0;
      V = [[X0, Y0, z], [X1, Y0, z], [X1, Y1, z], [X0, Y1, z], [(X0 + X1) / 2, Y0 + hipIn, z + rh], [(X0 + X1) / 2, Y1 - hipIn, z + rh]];
    }
    const F = ridge === 'x' ? [[0, 1, 5, 4], [3, 2, 5, 4], [0, 3, 4], [1, 2, 5], [0, 1, 2, 3]] : [[0, 3, 5, 4], [1, 2, 5, 4], [0, 1, 4], [3, 2, 5], [0, 1, 2, 3]];
    // gable ends are walls (house colour), slopes are roof colour
    const gableCol = type === 'gable' ? o.wallColor : null;
    out.push(...solid(V, F, col, { colors: (n) => (gableCol && Math.abs(n[2]) < 0.05 ? gableCol : null), hatch: !soft }));
    return out;
  }
  function drawStairs(o) {
    const n = o.steps ?? 5, dir = o.dir ?? '-x', z = o.z ?? 0, out = [], col = o.color ?? 'paper', boxes = [];
    for (let i = 0; i < n; i++) {
      const hh = (o.h * (i + 1)) / n;
      let b;
      if (dir === '+x') b = [o.x + (o.w * i) / n, o.y, o.w / n, o.d];
      else if (dir === '-x') b = [o.x + (o.w * (n - 1 - i)) / n, o.y, o.w / n, o.d];
      else if (dir === '+y') b = [o.x, o.y + (o.d * i) / n, o.w, o.d / n];
      else b = [o.x, o.y + (o.d * (n - 1 - i)) / n, o.w, o.d / n];
      boxes.push({ b, hh });
    }
    boxes.sort((a, b) => (a.b[0] + a.b[1]) - (b.b[0] + b.b[1]));
    for (const { b, hh } of boxes) out.push(...boxSolid(b[0], b[1], z, b[2], b[3], hh, col, { hatch: false, weight: lw * 0.8 }));
    return out;
  }
  function drawRamp(o) {
    // built in a local frame (a: along the climb 0..L, b: across 0..W, up), then turned to `dir`
    const dir = o.dir ?? '-x', z = o.z ?? 0, { x, y, w, d, h } = o;
    const along = dir.endsWith('x'), L = along ? w : d, Wd = along ? d : w, neg = dir.startsWith('-');
    const M = ([a, b, c]) => { const aa = neg ? L - a : a; return along ? [x + aa, y + b, z + c] : [x + b, y + aa, z + c]; };
    const V = [[0, 0, 0], [L, 0, 0], [L, Wd, 0], [0, Wd, 0], [L, 0, h], [L, Wd, h]].map(M);
    return solid(V, [[0, 1, 2, 3], [1, 2, 5, 4], [0, 3, 5, 4], [0, 1, 4], [3, 2, 5]], o.color ?? 'paper', { hatch: !soft });
  }
  const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  function drawRun(o, k, ax, L, t, h) {
    const z = o.z ?? 0, out = [], col = o.color ?? (k === 'fence' ? 'white' : k === 'hedge' ? pal.foliage[0] : pal.stone);
    const B = (a, len, tt, hh, zz, c) => (ax === 'x' ? boxSolid(o.x + a, o.y + (t - tt) / 2, zz, len, tt, hh, c, { hatch: false, weight: lw * 0.55 }) : boxSolid(o.x + (t - tt) / 2, o.y + a, zz, tt, len, hh, c, { hatch: false, weight: lw * 0.55 }));
    if (k === 'lowwall') { out.push(...B(0, L, t, h, z, col), ...B(-2, L + 4, t + 4, 5, z + h, o.cap ?? (soft ? lighten(hexOf(col), 0.15) : 'paper'))); return out; }
    if (k === 'hedge') {
      out.push(...B(0, L, t, h, z, col));
      return out;
    }
    const gap = o.gap ?? 12, n = Math.max(2, Math.round(L / gap));
    out.push(...B(0, L, 2, 3, z + h * 0.3, col), ...B(0, L, 2, 3, z + h * 0.72, col));
    for (let i = 0; i <= n; i++) out.push(...B(Math.min(L - 3.5, (L * i) / n - 1.75 + (i === 0 ? 1.75 : 0)), 3.5, t, h, z, col));
    return out;
  }
  function drawTree(o, k, r, h) {
    const z = o.z ?? 0, out = [], col = o.color ?? pick(pal.foliage, o.x * 3 + o.y * 7), shp = o.shape ?? (k === 'bush' ? 'ball' : 'ball');
    if (k === 'bush') {
      out.push(...ball([o.x - r * 0.35, o.y + r * 0.2, z + r * 0.55], r * 0.62, col, { weight: lw * 0.7 }));
      out.push(...ball([o.x + r * 0.3, o.y - r * 0.2, z + r * 0.65], r * 0.7, col, { weight: lw * 0.7 }));
      out.push(...ball([o.x + r * 0.1, o.y + r * 0.45, z + r * 0.5], r * 0.55, col, { weight: lw * 0.7 }));
      return out;
    }
    const trunkH = o.trunk ?? (shp === 'ball' ? h * 0.42 : h * 0.18);
    out.push(...cylinder(o.x, o.y, z, Math.max(2.5, r * 0.13), trunkH + (shp === 'ball' ? r * 0.3 : 0), o.trunkColor ?? pal.trunk, { hatch: false, weight: lw * 0.6 }));
    if (shp === 'cone') out.push(...cone(o.x, o.y, z + trunkH, r, h - trunkH, col, { weight: lw * 0.8 }));
    else if (shp === 'pine') {
      const tiers = 3;
      for (let i = 0; i < tiers; i++) { const zz = z + trunkH + ((h - trunkH) * i * 0.28); out.push(...cone(o.x, o.y, zz, r * (1 - i * 0.22), (h - trunkH) * (0.55 - i * 0.05), col, { weight: lw * 0.75 })); }
    } else out.push(...ball([o.x, o.y, z + trunkH + r * 0.85], r, col, { weight: lw * 0.8 }));
    return out;
  }
  function drawLamp(o, h) {
    const z = o.z ?? 0, out = [], col = o.color ?? pal.metal ?? 'ink';
    out.push(...cylinder(o.x, o.y, z, 5, 4, col, { hatch: false, weight: lw * 0.5 }));
    out.push(...cylinder(o.x, o.y, z, 2.2, h, col, { hatch: false, weight: lw * 0.45 }));
    out.push(...ball([o.x, o.y, z + h + 6], 7, o.light ?? 'mustard', { hatch: false, weight: lw * 0.55, lit: o.light ?? (soft ? undefined : '#FFE08A') }));
    return out;
  }
  function drawPot(o) {
    const z = o.z ?? 0, r = o.r ?? 12, h = o.h ?? 16, out = [];
    out.push(...cylinder(o.x, o.y, z, r, h, o.color ?? 'coral', { hatch: false, weight: lw * 0.6 }));
    out.push(...ball([o.x, o.y, z + h + r * 0.9], r * 1.15, o.plant ?? pick(pal.foliage, o.x + o.y), { weight: lw * 0.6 }));
    return out;
  }
  function drawFurniture(o, k, dm) {
    const z = o.z ?? 0, { x, y } = o, out = [], wood = o.color ?? dm.color;
    const B = (a, b, c2, w, d, h, col, op = {}) => out.push(...boxSolid(x + a, y + b, z + c2, w, d, h, col, { hatch: false, weight: lw * (op.wk ?? 0.65), ...op }));
    const { w, d, h } = dm, facing = o.facing ?? (k === 'chair' || k === 'bench' || k === 'sofa' ? '+y' : '+y');
    const legs = (lh, lt, col) => { for (const [a, b] of [[0, 0], [w - lt, 0], [0, d - lt], [w - lt, d - lt]]) B(a, b, 0, lt, lt, lh, col); };
    if (k === 'table' && o.shape === 'round') {
      const r = w / 2;
      out.push(...cylinder(x + r, y + r, z, r * 0.3, 2, wood, { hatch: false, weight: lw * 0.4 }));
      out.push(...cylinder(x + r, y + r, z, 2.5, h - 3, wood, { hatch: false, weight: lw * 0.45 }));
      out.push(...cylinder(x + r, y + r, z + h - 3, r, 3, wood, { hatch: false, weight: lw * 0.6 }));
    } else if (k === 'table' || k === 'desk') {
      const lt = 4;
      if (k === 'desk' && o.drawers !== false) { B(0, 0, 0, lt, lt, h - 4, wood); B(0, d - lt, 0, lt, lt, h - 4, wood); B(w - w * 0.32, 0, 0, w * 0.32, d, h - 4, wood, { wk: 0.6 }); }
      else legs(h - 4, lt, wood);
      B(-2, -2, h - 4, w + 4, d + 4, 4, o.top ?? wood, { wk: 0.65 });
    } else if (k === 'counter') {
      B(0, 0, 0, w, d, h - 5, wood, { wk: 0.75, hatch: !soft });
      B(-3, -3, h - 5, w + 6, d + 6, 5, o.top ?? 'paper', { wk: 0.6 });
    } else if (k === 'chair' || k === 'bench' || k === 'sofa') {
      const seat = dm.seat, back = facing === '+y' ? [0, 0, w, 4] : facing === '-y' ? [0, d - 4, w, 4] : facing === '+x' ? [0, 0, 4, d] : [w - 4, 0, 4, d];
      if (k === 'sofa') {
        // back (far side first when it is far), seat, far arm, cushions, near arm
        const alongX = facing === '+y' || facing === '-y', bt = 14, cush = o.cushion ?? lighten(hexOf(wood), 0.25);
        const backBox = alongX ? [0, facing === '+y' ? 0 : d - bt, 0, w, bt, h] : [facing === '+x' ? 0 : w - bt, 0, 0, bt, d, h];
        const farBack = facing === '+y' || facing === '+x';
        if (farBack) B(...backBox, wood, { wk: 0.7 });
        B(0, 0, 0, w, d, seat, wood, { wk: 0.7 });
        if (alongX) B(0, 0, 0, 12, d, seat + 12, wood, { wk: 0.65 }); else B(0, 0, 0, w, 12, seat + 12, wood, { wk: 0.65 });
        if (alongX) { const y0 = facing === '+y' ? bt : 2; B(13, y0, seat, w / 2 - 14, d - bt - 3, 6, cush, { wk: 0.5 }); B(w / 2 + 1, y0, seat, w / 2 - 14, d - bt - 3, 6, cush, { wk: 0.5 }); }
        else { const x0 = facing === '+x' ? bt : 2; B(x0, 13, seat, w - bt - 3, d / 2 - 14, 6, cush, { wk: 0.5 }); B(x0, d / 2 + 1, seat, w - bt - 3, d / 2 - 14, 6, cush, { wk: 0.5 }); }
        if (alongX) B(w - 12, 0, 0, 12, d, seat + 12, wood, { wk: 0.65 }); else B(0, d - 12, 0, w, 12, seat + 12, wood, { wk: 0.65 });
        if (!farBack) B(...backBox, wood, { wk: 0.7 });
        return out;
      }
      const backFirst = facing === '+y' || facing === '+x';
      if (backFirst) B(back[0], back[1], seat, back[2], back[3], h - seat, wood);
      legs(seat - 3, 3, wood);
      B(0, 0, seat - 3, w, d, 3, wood);
      if (!backFirst) B(back[0], back[1], seat, back[2], back[3], h - seat, wood);
    } else if (k === 'shelf') {
      // a bookcase: open toward +y (or +x), shelves with coloured book spines
      const fx = (o.facing ?? '+y') === '+x';
      B(0, 0, 0, w, d, h, wood, { wk: 0.7 });
      const rows = Math.max(2, Math.round(h / 32)), br = rng(Math.round(x * 5 + y * 11));
      const cols = ['coral', 'mustard', 'blue', 'green', 'paper', 'tone'];
      const L = fx ? d : w;
      for (let r2 = 0; r2 < rows; r2++) {
        const z0 = z + 4 + (r2 * (h - 6)) / rows, z1 = z0 + (h - 6) / rows - 5;
        const cav = fx ? [[x + w, y + 4, z0], [x + w, y + L - 4, z0], [x + w, y + L - 4, z1], [x + w, y + 4, z1]] : [[x + 4, y + d, z0], [x + L - 4, y + d, z0], [x + L - 4, y + d, z1], [x + 4, y + d, z1]];
        out.push(...face(cav, soft ? darken(hexOf(wood), 0.35) : tones3(wood)[2], fx ? [1, 0, 0] : [0, 1, 0], { hatch: false, weight: lw * 0.45 }));
        let a = 6;
        while (a < L - 10) {
          const bw = 4 + br.next() * 5, bh = (z1 - z0) * (0.6 + br.next() * 0.35), c2 = br.pick(cols);
          const pts = fx ? [[x + w, y + a, z0], [x + w, y + a + bw, z0], [x + w, y + a + bw, z0 + bh], [x + w, y + a, z0 + bh]] : [[x + a, y + d, z0], [x + a + bw, y + d, z0], [x + a + bw, y + d, z0 + bh], [x + a, y + d, z0 + bh]];
          out.push(...face(pts, c2, fx ? [1, 0, 0] : [0, 1, 0], { hatch: false, weight: lw * 0.3, outline: soft ? undefined : true }));
          a += bw + 1 + (br.chance(0.15) ? 8 : 0);
        }
      }
    } else if (k === 'bed') {
      B(0, 0, 0, w, d, 14, wood, { wk: 0.7 });
      B(3, 3, 14, w - 6, d - 6, 10, 'white', { wk: 0.6 });
      B(0, 0, 0, 8, d, h, wood, { wk: 0.7 });
      B(10, d * 0.15, 24, 26, d * 0.7, 6, 'paper', { wk: 0.5 });
      B(w * 0.45, 2, 24, w * 0.55 - 3, d - 4, 5, o.blanket ?? 'coral', { wk: 0.55 });
    } else if (k === 'car') {
      const ax = o.axis ?? 'x', body = o.color ?? 'coral';
      const L = ax === 'x' ? w : d, Wd = ax === 'x' ? d : w;
      const BB = (a, b, c2, l, wd, hh, col, op) => (ax === 'x' ? B(a, b, c2, l, wd, hh, col, op) : B(b, a, c2, wd, l, hh, col, op));
      // wheels: dark discs on the visible side, drawn first so the body overlaps them
      const wheel = (a) => {
        const side = ax === 'x' ? [x + a, y + Wd, z + 6.5] : [x + Wd, y + a, z + 6.5];
        const pts = ring(0, 0, 0, 6.5, 16).map(([p, q]) => P(ax === 'x' ? [side[0] + p, side[1] + 0.5, side[2] + q] : [side[0] + 0.5, side[1] - p, side[2] + q]));
        out.push(shape2(pts, 'dark', { weight: lw * 0.4, smooth: true }));
      };
      BB(0, 0, 4, L, Wd, 14, body, { wk: 0.6 });
      BB(L * 0.25, 2, 18, L * 0.48, Wd - 4, 12, pal.glass, { wk: 0.55, colors: (n) => (n[2] > 0.9 ? body : null) });
      wheel(L * 0.22); wheel(L * 0.78);
    }
    return out;
  }
  function drawPerson(o, h) {
    const z = o.z ?? 0, [sx, sy] = P([o.x, o.y, z]);
    const col = o.color ?? pick(pal.people, o.x * 5 + o.y * 3);
    return [{ type: 'person', x: sx, y: sy, size: h * s, pose: o.pose ?? 'standing', color: col, facing: o.facing, accent: o.accent, accentKind: o.accentKind, hold: o.hold, itemColor: o.itemColor, outline: o.outline ?? (soft ? darken(hexOf(col), 0.55) : undefined) }];
  }
  function drawProp(o) {
    const z = o.z ?? 0, [sx, sy] = P([o.x, o.y, z]), size = (o.size ?? 120) * s;
    const found = o.kind === 'prop' ? findProp(o.name) : null;
    const paths = o.kind === 'draw' ? o.paths : found ? found.variants[Math.min(found.variants.length - 1, o.variant ?? 0)].paths : null;
    const b = paths ? baseOf(paths) : 92, cy = sy - ((b - 50) / 100) * size;
    const common = { x: sx, y: cy, size, flip: o.flip, rot: o.rot, recolor: o.recolor, palette: o.palette ?? (e.palette === 'blue' ? 'blue' : undefined), shade: o.shade, extrude: o.extrude, shadow: o.shadow };
    return [o.kind === 'draw' ? { type: 'draw', paths: o.paths, name: o.name, tags: o.tags, ...common } : { type: 'prop', name: o.name, variant: o.variant, ...common }];
  }

  // ---------------------------------------------------------------- assemble
  const out = [];
  if (B) out.push(...drawBase(B));
  // ground: floors (lowest first), then decals in order
  const gsorted = ground.map((g, i) => ({ g, i })).sort((a, b) => ((a.g.kind === 'floor' ? 0 : 1) - (b.g.kind === 'floor' ? 0 : 1)) || ((a.g.z ?? 0) - (b.g.z ?? 0)) || a.i - b.i);
  for (const { g } of gsorted) out.push(...drawGround(g));
  // light pools, then occlusion and shadows, all on the ground
  for (const gl of glows) out.push(gl());
  if (shadows.length) out.push(drawShadows());
  for (const u of sortUnits(units)) out.push(...u.draw());
  return out;

  // ---------------------------------------------------------------- shadows
  function drawShadows() {
    const fid = id('b'), fid2 = id('b');
    const blurAmt = (b) => f1(Math.max(0.5, b * s));
    let svg = '', all = [];
    const groups = new Map();
    for (const sh of shadows) {
      all.push(...sh.pts);
      if (!ao && !sh.cast) continue;
      if (sh.gradTo) {
        const [g, defs] = grad([[0, '#1A2547', soft ? 0.2 : 0.24], [1, '#1A2547', 0]], ...sh.from, ...sh.gradTo);
        svg += `${defs}<path d="${dpath(sh.pts)}" fill="url(#${g})"/>`;
        continue;
      }
      if (sh.cast && !soft) { svg += `<path d="${dpath(sh.pts)}" fill="${KIT_HEX.tone}" opacity="${sh.opacity}" style="mix-blend-mode:multiply"/>`; continue; }
      const key = blurAmt(sh.blur);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(sh);
    }
    let n = 0;
    for (const [b, list] of groups) {
      const fidB = `${fid}_${n++}`;
      svg += `<filter id="${fidB}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${b}"/></filter><g filter="url(#${fidB})">`;
      for (const sh of list) svg += `<path d="${dpath(sh.pts)}" fill="#1A2547" opacity="${sh.opacity}"/>`;
      svg += '</g>';
    }
    void fid2;
    return raw(svg, all.length ? all : null);
  }

  // ---------------------------------------------------------------- base slab
  function drawBase(Bs) {
    const res = [], { shape, depth, top, edge, layers, pts: outline, lift } = Bs;
    // floating shadow: a soft ellipse under the slab
    const sp = outline.map(([x, y]) => P([x, y, 0]));
    const xs = sp.map((p) => p[0]), ys = sp.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, wdt = Math.max(...xs) - Math.min(...xs);
    const by = Math.max(...ys) + depth * s + lift * s;
    if (Bs.shadow !== false) {
      const sid = id('f'), rx = wdt * (shape === 'island' ? 0.34 : 0.48), ry = Math.max(8, rx * 0.12);
      res.push(raw(`<filter id="${sid}" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${f1(Math.max(3, 9 * s))}"/></filter><ellipse cx="${f1(cx)}" cy="${f1(by)}" rx="${f1(rx)}" ry="${f1(ry)}" fill="#1A2547" opacity="${soft ? 0.22 : 0.2}" filter="url(#${sid})"/>`, [[cx - rx, by - ry], [cx + rx, by + ry]]));
    }
    // sides: one band per layer, each the hull of its top and bottom rings (the island tapers to a rounded keel);
    // drawn deepest first so every band covers the lower part of the one before
    const n = outline.length, edges = [];
    for (let i = 0; i < n; i++) {
      const a = outline[i], b = outline[(i + 1) % n];
      edges.push({ vis: (b[1] - a[1]) - (b[0] - a[0]) > 1e-6 });
    }
    if (polyArea(outline) < 0) for (const ed of edges) ed.vis = !ed.vis;
    const taper = shape === 'island', c = Bs.center, L0 = layers[0].h;
    const kAt = (zz) => (taper ? 1 - 0.34 * Math.max(0, (zz - L0) / (depth - L0)) ** 1.5 : 1);
    const ringAt = (zz) => outline.map((p) => P([c[0] + (p[0] - c[0]) * kAt(zz), c[1] + (p[1] - c[1]) * kAt(zz), -zz]));
    const bands = [];
    let zTop = 0;
    for (const L of layers) {
      const z0 = zTop, z1 = zTop + L.h, sub = taper ? Math.max(1, Math.round(L.h / 8)) : 1;
      const rings = Array.from({ length: sub + 1 }, (_, q) => ringAt(z0 + ((z1 - z0) * q) / sub));
      bands.push({ L, poly: hull(rings.flat()) });
      zTop = z1;
    }
    for (const { L, poly } of bands.reverse()) {
      if (soft) {
        const ys2 = poly.map((p) => p[1]);
        res.push(shape2(poly, L.color, { grad: { stops: [[0, lighten(hexOf(L.color), 0.05)], [1, darken(hexOf(L.color), 0.18)]], v: [0, Math.min(...ys2), 0, Math.max(...ys2)] } }));
      } else {
        res.push(shape2(poly, L.color, { outline: false, smooth: shape !== 'square' }));
        if (L.hatch) res.push(hatch2(poly, { color: 'ink', gap: Math.max(5, 7 * s), weight: 1.5, angle: -1.1, smooth: shape !== 'square' }));
      }
    }
    if (!soft) res.push(shape2(hull([...ringAt(0), ...ringAt(depth)]), 'none', { weight: lw, smooth: shape !== 'square' }));
    // the top surface
    const topPts = outline.map(([x, y]) => P([x, y, 0]));
    res.push(soft
      ? shape2(topPts, top, { grad: { stops: [[0, lighten(hexOf(top), 0.1)], [1, darken(hexOf(top), 0.02)]], v: [0, Math.min(...topPts.map((p) => p[1])), 0, Math.max(...topPts.map((p) => p[1]))] } })
      : shape2(topPts, TONES[top] ? tones3(top)[0] : top, { weight: lw, smooth: shape !== 'square' }));
    // grass lip: a scalloped band hanging over the visible edge; tile edge: a row of small slabs
    if (edge === 'grass') {
      const chains = splitChains(edges.map((ed) => ed.vis), outline);
      for (const ch of chains) {
        const dense3 = densify3(ch, 16);
        const topC = dense3.map((p) => P([p[0], p[1], 0]));
        const bot = dense3.map((p, i) => { const dz = 5 + (i % 2 ? 6 : 1.5); return P([p[0], p[1], -dz]); }).reverse();
        res.push(shape2([...topC, ...bot], soft ? hexOf(Bs.grass) : Bs.grass, { outline: false, smooth: true }));
      }
    } else if (edge === 'tile') {
      const chains = splitChains(edges.map((ed) => ed.vis), outline);
      for (const ch of chains) {
        const band = [...ch.map((p) => P([p[0], p[1], 0])), ...ch.slice().reverse().map((p) => P([p[0], p[1], -6]))];
        res.push(shape2(band, soft ? lighten(hexOf(Bs.tile), 0.05) : Bs.tile, { outline: !soft, weight: lw * 0.5 }));
      }
    }
    return res;
  }
}

// ---------------------------------------------------------------- helpers outside the closure
const pick = (arr, k) => (Array.isArray(arr) ? arr[Math.abs(Math.round(k)) % arr.length] : arr);
function polyArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a / 2; }
// convex hull (monotone chain), screen space
function hull(pts) {
  const p = pts.map((q) => [q[0], q[1]]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (const q of p.slice().reverse()) { while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
// visible edges as continuous chains of points
function splitChains(visFlags, outline) {
  const n = outline.length, chains = [];
  let start = visFlags.findIndex((v, i) => v && !visFlags[(i - 1 + n) % n]);
  if (start < 0) { if (visFlags.every(Boolean)) return [[...outline, outline[0]]]; return []; }
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (visFlags[i] && !visFlags[(i - 1 + n) % n]) chains.push([outline[i]]);
    if (visFlags[i]) chains[chains.length - 1].push(outline[(i + 1) % n]);
  }
  return chains;
}
function densify3(ch, step) {
  const out = [];
  for (let i = 0; i < ch.length - 1; i++) {
    const a = ch[i], b = ch[i + 1], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  out.push(ch[ch.length - 1]);
  return out;
}

// furniture sizes (world units) and default colours
const FURNITURE = {
  bench: (o, pal) => ({ w: o.w ?? ((o.facing ?? '+y').includes('y') ? 100 : 30), d: o.d ?? ((o.facing ?? '+y').includes('y') ? 30 : 100), h: o.h ?? 52, seat: o.seat ?? 28, color: pal.wood }),
  chair: (o, pal) => ({ w: o.w ?? 34, d: o.d ?? 34, h: o.h ?? 68, seat: o.seat ?? 34, color: pal.wood }),
  sofa: (o, pal) => ({ w: o.w ?? ((o.facing ?? '+y').includes('y') ? 150 : 62), d: o.d ?? ((o.facing ?? '+y').includes('y') ? 62 : 150), h: o.h ?? 62, seat: o.seat ?? 30, color: pal.sofa ?? 'coral' }),
  table: (o, pal) => ({ w: o.w ?? (o.shape === 'round' ? 56 : 80), d: o.d ?? (o.shape === 'round' ? 56 : 56), h: o.h ?? 58, color: pal.wood }),
  desk: (o, pal) => ({ w: o.w ?? 120, d: o.d ?? 58, h: o.h ?? 60, color: pal.wood }),
  counter: (o, pal) => ({ w: o.w ?? 160, d: o.d ?? 44, h: o.h ?? 78, color: pal.counter ?? 'coral' }),
  shelf: (o, pal) => ({ w: o.w ?? ((o.facing ?? '+y') === '+x' ? 28 : 80), d: o.d ?? ((o.facing ?? '+y') === '+x' ? 80 : 28), h: o.h ?? 140, color: pal.wood }),
  bed: (o, pal) => ({ w: o.w ?? 150, d: o.d ?? 100, h: o.h ?? 50, color: pal.wood }),
  car: (o) => ({ w: o.w ?? ((o.axis ?? 'x') === 'x' ? 64 : 30), d: o.d ?? ((o.axis ?? 'x') === 'x' ? 30 : 64), h: o.h ?? 30, color: 'coral' }),
};

function objBox(o) {
  const z = o.z ?? 0, k = o.kind;
  if (k === 'wall') { const t = o.t ?? 14; return (o.axis ?? 'x') === 'y' ? [o.x - t, o.x, o.y - t, o.y + o.d, z, z + o.h] : [o.x - t, o.x + o.w, o.y - t, o.y, z, z + o.h]; }
  if (FURNITURE[k]) { const dm = FURNITURE[k](o, {}); return [o.x, o.x + dm.w, o.y, o.y + dm.d, z, z + dm.h]; }
  if (['cylinder', 'stool', 'pot'].includes(k)) { const r = o.r ?? 20; return [o.x - r, o.x + r, o.y - r, o.y + r, z, z + (o.h ?? 40)]; }
  if (k === 'tree' || k === 'bush') { const r = o.r ?? 26; return [o.x - r, o.x + r, o.y - r, o.y + r, z, z + (o.h ?? 90)]; }
  if (k === 'person') return [o.x - 8, o.x + 8, o.y - 8, o.y + 8, z, z + (o.h ?? 64)];
  if (k === 'lamp' || k === 'lamppost') return [o.x - 6, o.x + 6, o.y - 6, o.y + 6, z, z + (o.h ?? 110) + 14];
  if (k === 'prop' || k === 'draw') { if (o.wall) return null; const sz = o.size ?? 120; return [o.x - sz * 0.2, o.x + sz * 0.2, o.y - sz * 0.2, o.y + sz * 0.2, z, z + sz * 0.8]; }
  if (k === 'fence' || k === 'lowwall' || k === 'hedge') { const L = o.w ?? o.d ?? 100; return (o.axis ?? 'x') === 'x' ? [o.x, o.x + L, o.y, o.y + 12, z, z + (o.h ?? 26)] : [o.x, o.x + 12, o.y, o.y + L, z, z + (o.h ?? 26)]; }
  if (o.w != null && o.d != null) {
    const roof = o.roof ?? (k === 'house' ? 'gable' : k === 'building' ? 'flat' : null);
    const rh = !roof ? 0 : roof === 'flat' ? 14 : (o.roofH ?? Math.min(o.w, o.d) * 0.55) + 4;
    return [o.x - (roof && roof !== 'flat' ? 6 : 0), o.x + o.w + 6, o.y - 6, o.y + o.d + 6, z, z + (o.h ?? (k === 'house' || k === 'box' || k === 'building' ? 60 : 0)) + rh];
  }
  return null;
}
function worldBounds(objects) {
  let b = null;
  for (const o of objects) {
    const q = objBox(o);
    if (!q || !q.every(Number.isFinite)) continue;
    b = b ? [Math.min(b[0], q[0]), Math.max(b[1], q[1]), Math.min(b[2], q[2]), Math.max(b[3], q[3]), Math.min(b[4], q[4]), Math.max(b[5], q[5])] : q;
  }
  return b || [0, 300, 0, 300, 0, 100];
}
function boundsPoints(objects, wb, B) {
  const pts = [];
  for (const o of objects) {
    const q = objBox(o);
    if (!q || !q.every(Number.isFinite)) continue;
    for (const x of [q[0], q[1]]) for (const y of [q[2], q[3]]) for (const z of [q[4], q[5] + (o.kind === 'person' || o.kind === 'prop' ? 6 : 0)]) pts.push([x, y, z]);
  }
  if (B) for (const [x, y] of B.pts) { pts.push([x, y, 0]); pts.push([x, y, -B.depth - B.lift - 6]); }
  if (!pts.length) pts.push([wb[0], wb[2], 0], [wb[1], wb[3], wb[5]]);
  return pts;
}

// resolve the `base` option into an outline (counter-clockwise in world x/y), depth and layers
function resolveBase(base, wb, pal, seed, preset) {
  const o = base === true ? {} : base;
  const m = o.margin ?? 26;
  const x0 = o.x ?? wb[0] - m, y0 = o.y ?? wb[2] - m, x1 = o.w != null ? x0 + o.w : wb[1] + m, y1 = o.d != null ? y0 + o.d : wb[3] + m;
  const shape = o.shape ?? 'square';
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2, ry = (y1 - y0) / 2;
  let pts;
  // a round base encloses the corners of its box (an ellipse through them is √2 wider than the box)
  const k = 1.32;
  if (shape === 'round') pts = Array.from({ length: 48 }, (_, i) => { const t = (i / 48) * Math.PI * 2; return [cx + rx * k * Math.cos(t), cy + ry * k * Math.sin(t)]; });
  else if (shape === 'island') {
    const r = rng(seed * 13 + 5), n = 40, ph = [r.next() * 6, r.next() * 6, r.next() * 6];
    pts = Array.from({ length: n }, (_, i) => {
      const t = (i / n) * Math.PI * 2;
      const k = 1.1 + 0.03 * Math.sin(3 * t + ph[0]) + 0.02 * Math.sin(5 * t + ph[1]) + 0.012 * Math.sin(9 * t + ph[2]);
      // a squarish blob: superellipse so corners of the world stay on the island
      const c = Math.cos(t), s2 = Math.sin(t), p = 0.42;
      return [cx + rx * k * Math.sign(c) * Math.abs(c) ** p, cy + ry * k * Math.sign(s2) * Math.abs(s2) ** p];
    });
  } else pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const depth = o.depth ?? (shape === 'island' ? Math.max(60, 0.3 * (rx + ry)) : 36);
  const outdoor = ['street', 'city'].includes(preset) || o.top === 'grass';
  const top = o.top ?? o.color ?? (outdoor ? pal.grass : pal.baseTop ?? pal.grass);
  const edge = o.edge ?? (top === pal.grass || top === 'grass' ? 'grass' : 'tile');
  const soil = o.soil ?? pal.soil, soil2 = o.soil2 ?? pal.soil2;
  const layers = o.layers ?? (shape === 'island'
    ? [{ h: 10, color: edge === 'grass' ? pal.grass2 ?? pal.grass : pal.stone }, { h: depth * 0.4, color: soil }, { h: depth * 0.6 - 10, color: soil2, hatch: true }]
    : [{ h: 8, color: edge === 'grass' ? pal.grass2 ?? pal.grass : (o.tileColor ?? pal.stone) }, { h: (depth - 8) * 0.55, color: soil }, { h: (depth - 8) * 0.45, color: soil2, hatch: true }]);
  return { shape, depth: layers.reduce((a, l) => a + l.h, 0), top, edge, layers, pts, lift: o.lift ?? (o.float === false ? 0 : 18), center: [cx, cy], grass: pal.grass2 ?? pal.grass, tile: o.tileColor ?? pal.stone, shadow: o.shadow };
}

// painter's order for boxes in an isometric view from (+1, +1, +1): A is behind B when it is fully on the far side
// of B along x, y or z, and only pairs whose screen hexagons overlap are ordered. Topological sort, nearest last.
export function sortUnits(units) {
  const n = units.length, edges = Array.from({ length: n }, () => []), indeg = new Array(n).fill(0), eps = 0.01;
  const range = (b) => [[b[0] - b[3], b[1] - b[2]], [b[2] - b[5], b[3] - b[4]], [b[0] - b[5], b[1] - b[4]]];
  const R = units.map((u) => range(u.b));
  const over = (i, j) => R[i].every((r, k) => r[0] < R[j][k][1] - eps && R[j][k][0] < r[1] - eps);
  const depth = (b) => (b[0] + b[1]) / 2 + (b[2] + b[3]) / 2 + (b[4] + b[5]) * 0.25;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    if (!over(i, j)) continue;
    const a = units[i].b, b = units[j].b;
    let first = 0;
    if (a[1] <= b[0] + eps) first = -1; else if (b[1] <= a[0] + eps) first = 1;
    else if (a[3] <= b[2] + eps) first = -1; else if (b[3] <= a[2] + eps) first = 1;
    else if (a[5] <= b[4] + eps) first = -1; else if (b[5] <= a[4] + eps) first = 1;
    else { const dd = depth(a) + (units[i].bias ?? 0) - depth(b) - (units[j].bias ?? 0); first = dd <= 0 ? -1 : 1; }
    if (first < 0) { edges[i].push(j); indeg[j]++; } else { edges[j].push(i); indeg[i]++; }
  }
  const done = new Array(n).fill(false), order = [];
  const key = (i) => depth(units[i].b) * 1e3 + i * 1e-3;
  for (let step = 0; step < n; step++) {
    let best = -1;
    for (let i = 0; i < n; i++) if (!done[i] && indeg[i] === 0 && (best < 0 || key(i) < key(best))) best = i;
    if (best < 0) for (let i = 0; i < n; i++) if (!done[i] && (best < 0 || indeg[i] < indeg[best] || (indeg[i] === indeg[best] && key(i) < key(best)))) best = i; // a cycle: break it at the least-blocked unit
    done[best] = true; order.push(units[best]);
    for (const j of edges[best]) indeg[j]--;
  }
  return order;
}
