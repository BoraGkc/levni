// Canvas formats and layout-aware reflow.
// A scene is authored for 1200x673 ("cover"). `format` or `canvas` picks another size; with `reflow: true`
// (the CLI's --format sets it) the scene is recomposed for that size instead of cropped:
//   grounds (full-bleed panels, glyph fields, hills, waves, textures) are stretched to the new canvas;
//   everything else is one object cluster that keeps its internal layout, scales by min(sx, sy), and is
//   placed in the free area (see docs/scene.md, "Formats and reflow").
import { layoutTitle } from './title.mjs';

export const SOURCE = [1200, 673];
export const FORMATS = { cover: [1200, 673], og: [1200, 630], square: [1080, 1080], story: [1080, 1920], youtube: [1280, 720] };

export function resolveCanvas(spec) {
  if (spec.canvas != null) {
    const ok = Array.isArray(spec.canvas) && spec.canvas.length === 2 && spec.canvas.every((n) => Number.isFinite(n) && n >= 64 && n <= 8192);
    if (!ok) throw new Error('canvas must be [width, height], each 64..8192');
    return { w: Math.round(spec.canvas[0]), h: Math.round(spec.canvas[1]), name: 'custom' };
  }
  const name = spec.format ?? 'cover';
  if (!FORMATS[name]) throw new Error(`unknown format "${name}": use ${Object.keys(FORMATS).join(', ')} or "canvas": [w, h]`);
  return { w: FORMATS[name][0], h: FORMATS[name][1], name };
}

// Safe margins: ~5.5 % of the short side; tall canvases (stories) also keep clear of the app's top and bottom bars.
export function safeInsets(canvas) {
  const m = Math.round(Math.min(canvas.w, canvas.h) * 0.055);
  const tall = canvas.h / canvas.w >= 1.5;
  return { x: m, top: tall ? Math.round(canvas.h * 0.1) : m, bottom: tall ? Math.round(canvas.h * 0.14) : m };
}

const GROUND_TYPES = new Set(['panel', 'glyphs', 'waves', 'halftone', 'flowfield', 'hatch', 'confetti']);

function extraBox(e) {
  if (e.type === 'label') {
    const size = e.size ?? 16, w = String(e.text ?? '').length * (size * 0.6 + 1), x = e.anchor === 'middle' ? e.x - w / 2 : e.anchor === 'end' ? e.x - w : e.x;
    return { x, y: e.y - size * 0.8, w, h: size };
  }
  const pts = e.points || (e.from && e.to ? [e.from, e.to] : null);
  if (pts?.length) {
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]), pad = (e.weight ?? 8) / 2;
    return { x: Math.min(...xs) - pad, y: Math.min(...ys) - pad, w: Math.max(...xs) - Math.min(...xs) + pad * 2, h: Math.max(...ys) - Math.min(...ys) + pad * 2 };
  }
  return null;
}

// Returns null when no reflow applies, else { spec, start, end, finish, xf }.
// `xf` (from a first pass) lets glyph fields keep their glow centred on the moved cluster.
export function planLayout(spec, canvas, xf) {
  if (!spec.reflow) return null;
  const [sw, sh] = spec.reflowFrom || SOURCE;
  if (sw === canvas.w && sh === canvas.h) return null;
  const sx = canvas.w / sw, sy = canvas.h / sh, k0 = Math.min(sx, sy);
  const insets = safeInsets(canvas), m = insets.x, gap = Math.round(m * 0.6);
  const tall = canvas.h / canvas.w >= 1.25;
  const tl = spec.title ? layoutTitle(spec.title, canvas, insets) : null;

  // free area for the object cluster
  const free = { x0: m, y0: tall ? insets.top : m, x1: canvas.w - m, y1: canvas.h - (tall ? insets.bottom : m) };
  if (tall && !tl) free.y1 = Math.round(canvas.h * 0.74); // keep a title-safe band at the bottom
  if (tl) {
    const r = tl.rect;
    if (spec.title.position === 'left') free.x0 = Math.max(free.x0, r.x + r.w + gap); // left column
    else if (r.y + r.h / 2 > canvas.h / 2) free.y1 = Math.min(free.y1, r.y - gap); // bottom
    else free.y0 = Math.max(free.y0, r.y + r.h + gap); // top
  }
  const fw = free.x1 - free.x0, fh = free.y1 - free.y0;

  const stretch = (e) => {
    const g = { ...e, _ground: true };
    if (e.type === 'hills') {
      Object.assign(g, { x: (e.x ?? 0) * sx, w: (e.w ?? sw) * sx, base: canvas.h - (sh - e.base) * k0, height: e.height * k0 });
      return g;
    }
    g._orig = [e.x, e.y, e.w, e.h];
    for (const [key, f] of [['x', sx], ['y', sy], ['w', sx], ['h', sy]]) if (Number.isFinite(e[key])) g[key] = e[key] * f;
    if (e.type === 'glyphs' && e.mode === 'radial') {
      const cx = e.cx ?? e.x + e.w / 2, cy = e.cy ?? e.y + e.h / 2;
      [g.cx, g.cy] = xf ? [xf.tx + xf.k * (cx - xf.ax), xf.ty + xf.k * (cy - xf.ay)] : [cx * sx, cy * sy];
      g.radius = (e.radius ?? 480) * k0;
    }
    return g;
  };
  const isGround = (e) => e.type === 'hills' || (GROUND_TYPES.has(e.type) && ((e.w >= sw * 0.8) || (e.h >= sh * 0.8)));
  const spec2 = {
    ...spec,
    elements: (spec.elements || []).map((e) => (isGround(e) ? stretch(e) : e)),
    ...(spec.clip ? { clip: [spec.clip[0] * sx, spec.clip[1] * sy, spec.clip[2] * sx, spec.clip[3] * sy] } : {}),
  };

  const ranges = [];
  const lay = {
    spec: spec2, xf: null, title: tl,
    start: (out, used) => ({ o: out.length, u: used.length }),
    end(e, m0, out, used) {
      ranges.push({ o0: m0.o, o1: out.length, u0: m0.u, u1: used.length, ground: !!e._ground, extra: e._ground ? null : extraBox(e) });
    },
    finish(out, used) {
      const boxes = ranges.filter((r) => !r.ground).flatMap((r) => [...used.slice(r.u0, r.u1), r.extra].filter(Boolean));
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const b of boxes) { x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y); x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h); }
      if (!boxes.length) [x0, y0, x1, y1] = [0, 0, sw, sh];
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(sw, x1); y1 = Math.min(sh, y1);
      const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0), ax = x0 + bw / 2, ay = y0 + bh / 2;
      const k = Math.min(k0, fw / bw, fh / bh);
      let tx, ty;
      if (tall || (canvas.h / canvas.w > 0.8)) { tx = free.x0 + fw / 2; ty = free.y0 + fh / 2; } // tall and square: centre in the free area
      else { tx = ax * sx; ty = ay * sy; } // wide: keep the relative position
      tx = Math.min(Math.max(tx, free.x0 + (bw * k) / 2), free.x1 - (bw * k) / 2);
      ty = Math.min(Math.max(ty, free.y0 + (bh * k) / 2), free.y1 - (bh * k) / 2);
      lay.xf = { k, ax, ay, tx, ty };
      const r3 = (n) => Math.round(n * 1000) / 1000;
      const group = `<g transform="translate(${r3(tx - k * ax)} ${r3(ty - k * ay)}) scale(${r3(k)})">`;
      const parts = [];
      let open = false;
      for (const r of ranges) {
        const chunk = out.slice(r.o0, r.o1).join('\n');
        if (!r.ground) {
          if (!open) { parts.push(group); open = true; }
          parts.push(chunk);
          for (let i = r.u0; i < r.u1; i++) { const b = used[i]; used[i] = { ...b, x: tx + k * (b.x - ax), y: ty + k * (b.y - ay), w: b.w * k, h: b.h * k }; }
        } else {
          if (open) { parts.push('</g>'); open = false; }
          parts.push(chunk);
        }
      }
      if (open) parts.push('</g>');
      return parts.join('\n');
    },
  };
  return lay;
}
