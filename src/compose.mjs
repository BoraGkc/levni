// Composition: a scene is an ordered list of elements placed by a director (a person or an agent),
// drawn with the engine's brushes, palette and crayon finish.
// Canvas 1200x673 by default (formats.mjs has the other sizes). Colours by name: blue, ink, coral, mustard, green, paper, white, tone (light blue), dark.
// Element reference: docs/scene.md
import { applyMotion, typedElement, cameraTransform, motionList } from './motion.mjs';
import { PALETTE as P, rng, frame } from './style.mjs';
import { resolveCanvas, planLayout, safeInsets } from './formats.mjs';
import { layoutTitle } from './title.mjs';
import { makePen, box, ellipse } from './pen.mjs';
import { icon, resolveIcon, iconsAvailable } from './icon.mjs';
import { glyphField, iconMask, peep } from './glyphs.mjs';
import { sketch, marks, wave, arrow } from './brushes.mjs';
import { ASSETS, makeNoise } from './assets.mjs';
import { expandProp } from './props.mjs';
import { expandSeal } from './seal.mjs';
import { expandIso } from './iso.mjs';
import { flattenPath, inkLine, plateOffsets } from './ink.mjs';
import { applyStyle } from './styles.mjs';
import { resolveSlots } from './slots.mjs';
import { printScreen } from './print.mjs';

export const COLORS = { blue: P.blue, ink: P.ink, coral: P.coral, mustard: P.mustard, green: P.green, paper: P.paper, white: P.white, dark: P.dark, tone: '#7FA6F2', 'tone-coral': '#FFB49A', 'tone-green': '#86C796', 'tone-mustard': '#FFE08A', none: 'none' };
const c = (name, fallback = P.ink) => (name == null ? fallback : COLORS[name] || (/^#[0-9a-f]{6}$/i.test(name) ? name : fallback));
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;

const CHARTS = new Set(['bars', 'linechart', 'pie', 'donut', 'isochart']);

const DENSITY = {
  flat: (lv) => () => lv,
  radial: (lv, e) => (x, y) => Math.max(0.05, lv - Math.hypot(x - (e.cx ?? e.x + e.w / 2), (y - (e.cy ?? e.y + e.h / 2)) * 1.3) / (e.radius ?? 480)),
  'fade-down': (lv, e) => (x, y) => lv * (1 - (y - e.y) / e.h),
  'fade-up': (lv, e) => (x, y) => lv * ((y - e.y) / e.h),
};

// Canvas and layout: `format` / `canvas` pick the size; with `reflow` the scene (authored for 1200x673) is recomposed
// for it (formats.mjs). A reflow draws once to measure the object cluster, then again with its final place known.
export async function compose(spec) {
  const canvas = resolveCanvas(spec);
  let lay = planLayout(spec, canvas);
  if (lay) { await composeOnce(lay.spec, canvas, lay); lay = planLayout(spec, canvas, lay.xf); }
  return composeOnce(lay ? lay.spec : spec, canvas, lay);
}

async function composeOnce(spec, canvas, lay) {
  const seed = spec.seed ?? 1;
  const r = rng(seed);
  const soft = spec.finish === 'soft'; // soft finish: clean edges and film grain instead of crayon and riso plates
  const hand = spec.hand ?? !soft; // hand-inked lines for the pen and for drawn objects
  const pen = makePen(r, { hand });
  const noise = makeNoise(rng(seed + 3));
  const time = spec.t ?? 0; // 0..1, set by the animation renderer
  const plates = plateOffsets(rng(seed + 77), spec.plateShift ?? (soft ? 0 : 3.2)); // one misregistration per ink colour
  const out = [];
  const used = []; // bounding boxes for the critic
  // dark areas (blue/ink panels, dark background): line-only drawings inside them switch to paper so they stay visible
  const darkAreas = ['blue', 'ink', 'dark'].includes(spec.background) ? [[0, 0, lay ? 1e5 : canvas.w, lay ? 1e5 : canvas.h]] : [];
  const inDark = (x, y) => darkAreas.some(([ax, ay, aw, ah]) => x >= ax && x <= ax + aw && y >= ay && y <= ay + ah);
  let cur = null; // the element being drawn: its crop flag and name travel with its box to the critic
  const note = (type, x, y, w, h) => used.push({ type, x, y, w, h, crop: !!cur?.crop, name: cur?.name || null });
  let clip = 0;

  // props (library/props/*.json) are pre-drawn `draw` elements and `iso` is a macro: expand them first
  let moving = 0; // elements with `motion`, counted for stagger
  const stagger = Number.isFinite(Number(spec.stagger)) ? Number(spec.stagger) : 0;
  for (const e0 of resolveSlots((spec.elements || []).flatMap(expandIso).flatMap(expandSeal).map(expandProp))) {
    // motion (motion.mjs): typewriter changes the text before it is drawn; the rest wraps the finished element below
    const hasMotion = e0.motion ? motionList(e0.motion).length > 0 : false;
    const mi = hasMotion ? moving++ : 0;
    const e = hasMotion ? typedElement(e0, time, mi, stagger) : e0;
    if (!e) continue; // typewriter: nothing typed yet
    const t = e.type;
    cur = e;
    const m0 = lay?.start(out, used);
    const out0 = out.length, used0 = used.length; // for the element-level `screen`
    if ((t === 'icon' || t === 'ascii') && !iconsAvailable()) {
      throw new Error(`"${t}" element "${e.name}" needs Tabler icons: npm install @tabler/icons (or set LEVNI_ICONS). If you meant a prop, check its name with: levni list`);
    }
    // fit: true on a draw/prop scales the VISIBLE ink (not the 0..100 box) to `size` on its longer side, centred on x, y
    if (t === 'draw' && e.fit && e.paths?.length) {
      const pts = e.paths.flatMap((p) => flattenPath(p.d, 4).flat());
      const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
      const bx = Math.min(...xs), by = Math.min(...ys), bw = Math.max(...xs) - bx, bh = Math.max(...ys) - by;
      const s0 = e.size ?? 200, s1 = (s0 * 100) / Math.max(bw, bh, 1), k1 = s1 / 100;
      const cx = (e.flip ? 100 - (bx + bw / 2) : bx + bw / 2), cy = by + bh / 2;
      Object.assign(e, { size: s1, x: e.x - (cx - 50) * k1, y: e.y - (cy - 50) * k1 });
    }
    if (t === 'panel') {
      const [px, py, pw, ph] = e._orig || [e.x, e.y, e.w, e.h]; // a reflowed ground keeps its authored box for dark-area checks
      if (['blue', 'ink', 'dark'].includes(e.color ?? 'blue')) darkAreas.push([px, py, pw, ph]); else darkAreas.splice(0, darkAreas.length, ...darkAreas.filter(([ax, ay, aw, ah]) => !(px <= ax && py <= ay && px + pw >= ax + aw && py + ph >= ay + ah)));
      const pts = box(e.x, e.y, e.x + e.w, e.y + e.h, 40);
      const g = e.rot ? `<g transform="rotate(${e.rot} ${e.x + e.w / 2} ${e.y + e.h / 2})">` : '<g>';
      out.push(g + pen.shape(pts, { fill: c(e.color, P.blue), stroke: e.outline ? c(e.outline) : null, w: e.weight ?? 8, offset: 0 }) + '</g>');
      note(t, e.x, e.y, e.w, e.h);
    } else if (t === 'disc') {
      out.push(pen.shape(ellipse(e.x, e.y, e.r, e.ry ?? e.r, 18), { fill: c(e.color, P.coral), stroke: e.outline ? c(e.outline) : null, w: e.weight ?? 8, offset: 0 }));
      note(t, e.x - e.r, e.y - (e.ry ?? e.r), e.r * 2, (e.ry ?? e.r) * 2);
    } else if (t === 'icon') {
      const name = resolveIcon(e.name) || 'news';
      const o = { x: e.x, y: e.y, size: e.size ?? 200, line: c(e.color, P.ink), under: e.under ? c(e.under) : null, lineWidth: e.weight ?? Math.max(7, (e.size ?? 200) / 18), disc: false };
      let s = '';
      if (e.overprint) s += `<g style="mix-blend-mode:multiply">${icon(name, { ...o, x: o.x + 12, y: o.y + 10, line: c(e.overprint), lineWidth: o.lineWidth * 2.2, under: null })}</g>`;
      s += e.sketch === false ? icon(name, o) : sketch(name, o);
      out.push(e.rot ? `<g transform="rotate(${e.rot} ${e.x} ${e.y})">${s}</g>` : s);
      note(t, e.x - o.size / 2, e.y - o.size / 2, o.size, o.size);
    } else if (t === 'ascii') {
      const mask = await iconMask(resolveIcon(e.name) || 'news');
      out.push(glyphField(r, { x0: e.x, y0: e.y, x1: e.x + e.w, y1: e.y + e.h, color: c(e.color, P.blue), size: e.font ?? 19, cw: (e.font ?? 19) * 0.6, lh: e.font ?? 19, ramp: '  .:-=+*#%@', jitter: 0.05, density: (x, y) => mask((x - e.x) / e.w, (y - e.y) / e.h) }));
      note(t, e.x, e.y, e.w, e.h);
    } else if (t === 'glyphs') {
      const d = (DENSITY[e.mode] || DENSITY.flat)(e.level ?? 0.3, e);
      out.push(glyphField(r, { x0: e.x, y0: e.y, x1: e.x + e.w, y1: e.y + e.h, color: c(e.color, '#D9D4C7'), density: d, ramp: e.ramp, jitter: e.jitter ?? 0.07 }));
    } else if (t === 'crowd') {
      const rows = e.rows ?? 2, size = e.size ?? 140;
      for (let row = 0; row < rows; row++) {
        const h = size * (0.7 + 0.3 * (row / Math.max(1, rows - 1)));
        const n = Math.max(2, Math.round(e.w / (h * 0.62)));
        for (let k = 0; k < n; k++) {
          const x = e.x + (e.w / n) * (k + 0.5) + r.jitter(h * 0.08);
          const back = row < rows - 1;
          const col = !back && e.highlight && r.chance(e.share ?? 0.15) ? c(e.highlight) : back ? c(e.back ?? 'tone') : c(e.color, P.paper);
          out.push(peep(pen, x, e.y + row * size * 0.45, h, col, back ? null : c(e.outline ?? 'ink'), 0.4));
        }
      }
      note(t, e.x, e.y - size, e.w, size * (1 + rows * 0.45));
    } else if (t === 'isotype') {
      const cols = e.cols ?? 10, rows = e.rows ?? 3, size = e.size ?? 80, gap = size * 0.62;
      const total = cols * rows, lit = new Set();
      while (lit.size < Math.round(total * (e.share ?? 0.2))) lit.add(r.int(0, total - 1));
      for (let k = 0; k < total; k++) out.push(peep(pen, e.x + (k % cols) * gap, e.y + Math.floor(k / cols) * size * 1.25, size, lit.has(k) ? c(e.highlight, P.coral) : c(e.color, P.blue)));
      note(t, e.x - gap / 2, e.y - size, cols * gap, rows * size * 1.25);
    } else if (t === 'waves') {
      for (let y = e.y; y < e.y + e.h; y += e.gap ?? 26) out.push(wave(pen, e.x + r.range(-10, 30), e.x + e.w - r.range(0, 40), y + r.jitter(3), e.amp ?? 5, e.len ?? 64, c(e.color, P.blue), e.weight ?? 5));
      note(t, e.x, e.y, e.w, e.h);
    } else if (t === 'hills') {
      const pts = [[e.x ?? 0, canvas.h]];
      for (let x = e.x ?? 0; x <= (e.x ?? 0) + (e.w ?? canvas.w); x += e.step ?? 80) pts.push([x, e.base - e.height * (0.4 + 0.6 * Math.abs(Math.sin(x / (e.period ?? 170) + seed + e.base)))]);
      pts.push([(e.x ?? 0) + (e.w ?? canvas.w), canvas.h]);
      out.push(pen.shape(pts, { fill: c(e.color, P.green), stroke: e.outline ? c(e.outline) : null, w: 7, offset: 0, amp: 4 }));
    } else if (t === 'arrow') {
      out.push(arrow(pen, r, e.from, e.to, c(e.color, P.ink), e.bend ?? 40));
    } else if (t === 'line') {
      out.push(pen.line(e.points, { color: c(e.color, P.ink), w: e.weight ?? 8, closed: !!e.closed }));
    } else if (t === 'shape') {
      out.push(pen.shape(e.points, { fill: c(e.fill, P.paper), stroke: e.stroke === 'none' ? null : c(e.stroke, P.ink), w: e.weight ?? 8, offset: e.offset ?? 2, amp: e.amp ?? 1.4 }));
      const xs = e.points.map((p) => p[0]), ys = e.points.map((p) => p[1]);
      note(t, Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
    } else if (t === 'draw') {
      // A custom object drawn by the director in a 0..100 box, for things the icon set lacks.
      const k = (e.size ?? 200) / 100;
      // x, y is the centre of the 0..100 box. flip mirrors it; overprint adds an offset second-ink silhouette.
      // shadow / extrude / shade add depth while keeping the hand-drawn line (see docs/scene.md).
      const paths = (fillOver) => (e.paths || []).map((p) => `<path d="${esc(p.d)}" fill="${fillOver ?? (p.fill ? c(p.fill) : 'none')}" stroke="${fillOver ?? (p.stroke === 'none' ? 'none' : c(p.stroke, P.ink))}" stroke-width="${(p.weight ?? 10) / k}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      const tf = (dx = 0, dy = 0) => `translate(${e.x - (e.size ?? 200) / 2 + dx} ${e.y - (e.size ?? 200) / 2 + dy}) scale(${k})${e.flip ? ' translate(100 0) scale(-1 1)' : ''}${e.rot ? ` rotate(${e.rot} 50 50)` : ''}`;
      // die-cut sticker: a thick paper offset around the whole silhouette (holes filled), a hairline ink edge and a small shadow
      if (e.diecut) {
        const dcut = { offset: 14, color: 'paper', line: 'ink', shadow: true, ...(e.diecut === true ? {} : e.diecut) };
        dcut.offset = Math.min(60, Math.max(0, Number.isFinite(+dcut.offset) ? +dcut.offset : 14));
        const blob = (col, grow, dx = 0, dy = 0) => `<g transform="${tf(dx, dy)}">${(e.paths || []).map((p) => `<path d="${esc(p.d)}" fill="${col}" stroke="${col}" stroke-width="${(grow + (p.weight ?? 10)) / k}" stroke-linejoin="round" stroke-linecap="round"/>`).join('')}</g>`;
        if (dcut.shadow) out.push(`<g style="mix-blend-mode:multiply" opacity="0.25">${blob(c('ink'), dcut.offset * 2 + 3, 6, 8)}</g>`);
        if (dcut.line && dcut.line !== 'none') out.push(blob(c(dcut.line), dcut.offset * 2 + 6));
        out.push(blob(c(dcut.color), dcut.offset * 2));
      }
      if (e.overprint) out.push(`<g style="mix-blend-mode:multiply" transform="${tf(14, 12)}">${paths(c(e.overprint))}</g>`);
      // ---- depth (all optional): cast shadow, extrusion (thickness), hatch shading on the side away from the light
      const filled = (e.paths || []).filter((p) => p.fill && p.fill !== 'none');
      const silhouette = (col, w = 0) => (e.paths || []).map((p) => `<path d="${esc(p.d)}" fill="${p.fill && p.fill !== 'none' ? col : 'none'}" stroke="${p.stroke === 'none' && !w ? 'none' : col}" stroke-width="${((p.weight ?? 10) + w) / k}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
      if (e.shadow) {
        const sh = { dx: 18, dy: 16, color: 'ink', opacity: 0.22, ...(e.shadow === true ? {} : e.shadow) };
        out.push(`<g style="mix-blend-mode:multiply" opacity="${sh.opacity}" transform="${tf(sh.dx, sh.dy)}">${silhouette(c(sh.color))}</g>`);
      }
      if (e.extrude) {
        const ex = { dx: 12, dy: 10, steps: 7, color: 'tone', ...(e.extrude === true ? {} : e.extrude) };
        // back face outlined in ink, then solid layers stepping forward: reads as a cut-out with real thickness
        out.push(`<g transform="${tf(ex.dx, ex.dy)}">${silhouette(c('ink'), 6)}${silhouette(c(ex.color))}</g>`);
        for (let s2 = ex.steps - 1; s2 >= 1; s2--) out.push(`<g transform="${tf((ex.dx * s2) / ex.steps, (ex.dy * s2) / ex.steps)}">${silhouette(c(ex.color))}</g>`);
      }
      const shade = e.shade ? { lx: -1, ly: -1, depth: 10, gap: 4.2, angle: 0.8, color: 'ink', weight: 1.5, ...(e.shade === true ? {} : e.shade) } : null;
      let shadeSeq = 0;
      function shading(p) {
        if (!shade || !p.fill || p.fill === 'none' || p.shade === false) return '';
        const id = `sh${seed}-${used.length}-${++shadeSeq}`;
        const off = shade.depth, gap = shade.gap, a = shade.angle;
        const lines = [];
        for (let d2 = -150; d2 <= 150; d2 += gap) lines.push(`M${(50 + d2 * Math.cos(a) - 150 * Math.sin(a)).toFixed(1)},${(50 + d2 * Math.sin(a) + 150 * Math.cos(a)).toFixed(1)} L${(50 + d2 * Math.cos(a) + 150 * Math.sin(a)).toFixed(1)},${(50 + d2 * Math.sin(a) - 150 * Math.cos(a)).toFixed(1)}`);
        // mask = the shape minus a copy shifted toward the light: a crescent on the shadow side
        return `<mask id="${id}" maskUnits="userSpaceOnUse" x="-50" y="-50" width="200" height="200"><path d="${esc(p.d)}" fill="#fff"/><path d="${esc(p.d)}" fill="#000" transform="translate(${shade.lx * off} ${shade.ly * off})"/></mask><path mask="url(#${id})" d="${lines.join('')}" stroke="${c(shade.color)}" stroke-width="${(shade.weight / k) * 3.4}" stroke-linecap="round" opacity="0.6"/>`;
      }
      if (hand && e.hand !== false) {
        // per path, in order: colour fill on its riso plate, shading, then the outline as a pressure-brush shape
        const er = rng(seed * 17 + used.length + 3);
        // only pure line art (no paper/white areas its lines could sit on) flips to paper on a dark ground
        const lightFill = (e.paths || []).some((p) => ['paper', 'white', 'tone', 'mustard'].includes(p.fill));
        const lineArtOnDark = e.autoContrast !== false && !lightFill && !e.diecut && inDark(e.x, e.y);
        const parts = (e.paths || []).map((p) => {
          let s = '';
          if (p.fill && p.fill !== 'none') {
            const pl = plates[p.fill];
            s += `<path d="${esc(p.d)}" fill="${c(p.fill)}"${p.rule === 'evenodd' ? ' fill-rule="evenodd"' : ''}${pl ? ` transform="translate(${(pl[0] / k).toFixed(2)} ${(pl[1] / k).toFixed(2)})"` : ''}/>`;
            s += shading(p);
          }
          if (p.stroke !== 'none' && (p.stroke || !p.fill)) {
            const w = (p.weight ?? 10) / k;
            // a bare ink line on a dark panel disappears: print it in paper instead (fills keep their ink edge)
            const strokeCol = (!p.fill || p.fill === 'none') && (p.stroke ?? 'ink') === 'ink' && lineArtOnDark ? P.paper : c(p.stroke, P.ink);
            for (const poly of dashed(flattenPath(p.d, 2.2), p.dash)) {
              // a zero-length stroke ("M x y h.1") is meant as a dot: draw a round ink dot of the stroke width
              const len = poly.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - poly[i - 1][0], q[1] - poly[i - 1][1]) : 0), 0);
              if (len < 0.6) { s += `<circle cx="${poly[0][0].toFixed(2)}" cy="${poly[0][1].toFixed(2)}" r="${(w * 0.55).toFixed(2)}" fill="${strokeCol}"/>`; continue; }
              s += `<path d="${inkLine(poly, { width: w * 1.08, closed: !!poly.closed, r: er, jit: 1.1 / Math.sqrt(k), taper: p.taper === false ? 0.02 : p.taper })}" fill="${strokeCol}"/>`;
            }
          }
          return s;
        }).join('');
        out.push(`<g transform="${tf()}">${parts}</g>`);
      } else out.push(`<g transform="${tf()}">${paths()}</g>`);
      // the critic measures the visible ink, not the empty 0..100 box (flip and rot applied in box space)
      const sz = e.size ?? 200, rad = ((e.rot || 0) * Math.PI) / 180;
      const pts = (e.paths || []).flatMap((p) => flattenPath(p.d, 4).flat().map(([px, py]) => {
        if (e.flip) px = 100 - px;
        const dx = px - 50, dy = py - 50;
        return [50 + dx * Math.cos(rad) - dy * Math.sin(rad), 50 + dx * Math.sin(rad) + dy * Math.cos(rad)];
      }));
      if (pts.length) {
        const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), x0 = Math.min(...xs), y0 = Math.min(...ys);
        note(t, e.x - sz / 2 + x0 * (sz / 100), e.y - sz / 2 + y0 * (sz / 100), (Math.max(...xs) - x0) * (sz / 100), (Math.max(...ys) - y0) * (sz / 100));
      } else note(t, e.x - sz / 2, e.y - sz / 2, sz, sz);
    } else if (t === 'skyline') {
      let x = e.x0 ?? 40;
      const x1 = e.x1 ?? 1160, base = e.base ?? 600;
      const fills = (e.colors || ['paper', 'paper', 'blue', 'tone', 'coral']).map((n) => c(n));
      while (x < x1 - 40) {
        const w = Math.min(r.range(70, 140), x1 - x), h = r.range(e.minH ?? 140, e.maxH ?? 360), top = base - h, fill = r.pick(fills);
        out.push(pen.shape(box(x, top, x + w, base, 40), { fill, stroke: P.ink, w: 7, offset: 2 }));
        const cols = Math.max(2, Math.floor(w / 28)), rows = Math.floor((h - 30) / 34);
        for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) if (!r.chance(0.12)) out.push(`<rect x="${(x + 12 + cx * ((w - 24) / cols)).toFixed(1)}" y="${(top + 18 + cy * 34).toFixed(1)}" width="${((w - 24) / cols - 8).toFixed(1)}" height="18" fill="${r.chance(0.15) ? P.mustard : fill === P.blue ? P.paper : P.ink}"/>`);
        x += w + r.range(-6, 10);
      }
      out.push(pen.line([[(e.x0 ?? 40) - 20, base + 2], [x1 + 20, base]], { w: 9 }));
      note(t, e.x0 ?? 40, base - (e.maxH ?? 360), x1 - (e.x0 ?? 40), e.maxH ?? 360);
    } else if (t === 'sheet') {
      const id = `s${++clip}`;
      let s = pen.shape(box(e.x + 8, e.y + 10, e.x + e.w + 8, e.y + e.h + 10, 40), { fill: P.ink, stroke: null, offset: 0 });
      s += pen.shape(box(e.x, e.y, e.x + e.w, e.y + e.h, 40), { fill: c(e.color, P.paper), w: 6, offset: 0 });
      if (e.content === 'lines') for (let l = 0; l < Math.floor(e.h / 32) - 1; l++) s += wave(pen, e.x + 22, e.x + e.w - 22 - r.range(0, 50), e.y + 38 + l * 30, 2.5, 18, P.ink, 4);
      if (e.pin !== false) s += pen.dot(e.x + e.w / 2, e.y + 14, 10, c(e.pin || 'coral'));
      out.push(e.rot ? `<g id="${id}" transform="rotate(${e.rot} ${e.x + e.w / 2} ${e.y + e.h / 2})">${s}</g>` : s);
      note(t, e.x, e.y, e.w, e.h);
    } else if (t === 'window') {
      let s = pen.shape(box(e.x + 14, e.y + 14, e.x + e.w + 14, e.y + e.h + 14), { fill: P.ink, stroke: null, offset: 0 });
      s += pen.shape(box(e.x, e.y, e.x + e.w, e.y + e.h), { fill: c(e.color, P.paper), w: 9, offset: 0 });
      s += pen.line([[e.x, e.y + 48], [e.x + e.w, e.y + 48]], { w: 7 });
      [P.coral, P.mustard, P.green].forEach((col, k) => (s += pen.dot(e.x + 30 + k * 26, e.y + 25, 8, col)));
      if (e.title) s += `<text x="${e.x + 120}" y="${e.y + 31}" ${MONO} font-size="15" fill="${P.ink}">${esc(e.title)}</text>`;
      out.push(s);
      note(t, e.x, e.y, e.w, e.h);
    } else if (t === 'marks') {
      const [x0, y0, w, h] = e.area || [40, 40, 1120, 593];
      for (let k = 0; k < (e.count ?? 8); k++) out.push(marks(pen, r, x0 + r.next() * w, y0 + r.next() * h, c(r.pick(e.colors || ['mustard', 'coral', 'blue']))));
    } else if (ASSETS[t]) {
      // procedural assets get their own RNG per element, so animating one does not reshuffle the others
      const er = rng(seed * 31 + (e.seed ?? used.length + 1));
      // charts on a dark panel: paper axes and labels, light series colours, unless the scene says otherwise
      const onDark = CHARTS.has(t) && inDark(e.x ?? 0, e.y ?? 0);
      const ee = onDark ? { ...e, ink: e.ink ?? 'paper', colors: e.colors ?? ['tone', 'mustard', 'coral', 'paper'] } : e;
      const { svg, bbox } = ASSETS[t](ee, { pen: makePen(er, { hand }), r: er, c, noise, t: time, canvas });
      const [pvx, pvy] = t === 'stub' ? [e.x + (e.w ?? 0) / 2, e.y + (e.h ?? 0) / 2] : [e.x, e.y]; // a ticket turns about its centre
      out.push(e.rot ? `<g transform="rotate(${e.rot} ${pvx} ${pvy})">${svg}</g>` : svg);
      if (bbox) note(t, ...bbox);
    } else if (t === 'label') {
      // label colour follows the ground unless set: paper on dark panels, ink elsewhere
      out.push(`<text x="${e.x}" y="${e.y}" ${MONO} font-size="${e.size ?? 16}" fill="${e.color ? c(e.color) : inDark(e.x, e.y) ? P.paper : P.ink}" text-anchor="${e.anchor ?? 'start'}" letter-spacing="1">${esc(e.upper === false ? e.text : String(e.text).toLocaleUpperCase(spec.locale || 'en'))}</text>`);
    }
    // element-level screen: this element alone is printed as a dither (print.mjs), the rest of the scene is untouched
    if (e.screen && out.length > out0) {
      const bb = used.length > used0 ? used[used.length - 1] : null;
      const img = await printScreen(out.splice(out0).join(''), e.screen, canvas, bb ? [bb.x, bb.y, bb.w, bb.h] : null);
      if (img) out.push(img);
    }
    // element-level motion: wrap what this element drew in its transform at time `t`
    if (hasMotion && out.length > out0) {
      const bs = used.slice(used0);
      const box = bs.length
        ? [Math.min(...bs.map((b) => b.x)), Math.min(...bs.map((b) => b.y)), Math.max(...bs.map((b) => b.x + b.w)) - Math.min(...bs.map((b) => b.x)), Math.max(...bs.map((b) => b.y + b.h)) - Math.min(...bs.map((b) => b.y))]
        : t === 'label' // labels leave no box for the critic: estimate one from the mono font (x is the anchor, y the baseline)
          ? (() => { const fs = e.size ?? 16, w = String(e.text ?? '').length * (fs * 0.6 + 1); return [e.anchor === 'end' ? e.x - w : e.anchor === 'middle' ? e.x - w / 2 : e.x, e.y - fs, w, fs * 1.3]; })()
          : [e.x ?? canvas.w / 2, e.y ?? canvas.h / 2, e.w ?? 0, e.h ?? 0];
      const moved = applyMotion(out.splice(out0).join(''), e.motion, time, box, { index: mi, stagger, id: `mo${mi}` });
      if (moved) out.push(moved);
    }
    lay?.end(e, m0, out, used);
  }
  // spec.clip = [x, y, w, h]: everything stays inside the panel, like a printed card
  let body = lay ? lay.finish(out, used) : out.join('\n');
  // text that must stay exact (glyphfill grids) is marked <!--crisp-->…<!--/crisp--> and drawn above the crayon filter
  let crisp = '';
  if (!soft && !lay) body = body.replace(/<!--crisp-->[\s\S]*?<!--\/crisp-->/g, (m) => { crisp += m; return ''; });
  // spec.camera: the drawing pans and zooms under a fixed frame (motion.mjs); the title layer stays put
  const camT = cameraTransform(spec.camera, time, canvas);
  if (camT) body = `<g transform="${camT}">${body}</g>`;
  if (spec.clip) {
    const [x, y, w, h] = spec.clip;
    body = `<clipPath id="card"><path d="${pen.d(box(x, y, x + w, y + h, 40), { amp: 0, closed: true })}"/></clipPath><g clip-path="url(#card)">${body}</g>`;
    if (crisp) crisp = `<g clip-path="url(#card)">${crisp}</g>`;
  }
  // boil: the crayon filter's own seed; the animator steps it a few times a second for a hand-drawn shimmer
  // spec.style picks a style pack (styles.mjs): the same drawing printed with other inks
  // the critic measures crops against the card when there is one, else the canvas
  used.frame = spec.clip ? [...spec.clip] : [0, 0, canvas.w, canvas.h];
  let svg = frame(body, { seed: spec.boil ?? seed, background: c(spec.background, P.paper), finish: soft ? 'soft' : 'crayon', grain: spec.grain, w: canvas.w, h: canvas.h });
  if (crisp) svg = svg.replace(/<\/svg>\s*$/, `${crisp}\n</svg>`);
  // the title layer sits above everything, outside the crayon filter (title.mjs)
  if (spec.title) svg = svg.replace(/<\/svg>\s*$/, `${layoutTitle(spec.title, canvas, safeInsets(canvas)).draw(c, c(spec.background, P.paper))}\n</svg>`);
  return { svg: applyStyle(svg, spec.style), used, canvas, xf: lay?.xf };
}

// dash: [on, off] in 0..100 box units; cuts each polyline into short hand-inked strokes (marking lines, seams, paths)
function dashed(polys, dash) {
  if (!dash) return polys;
  const [on, off] = Array.isArray(dash) ? dash : [dash, dash];
  if (!(on > 0) || !(off > 0)) return polys; // a zero or negative dash would never advance: draw the line solid
  const out = [];
  for (const poly of polys) {
    const pts = poly.closed ? [...poly, poly[0]] : poly;
    let cur = [pts[0]], left = on, drawing = true;
    for (let i = 1; i < pts.length; i++) {
      let [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      let seg = Math.hypot(x1 - x0, y1 - y0);
      while (seg > left) {
        const t = left / seg, xm = x0 + (x1 - x0) * t, ym = y0 + (y1 - y0) * t;
        if (drawing) { cur.push([xm, ym]); if (cur.length > 1) out.push(cur); } else cur = [[xm, ym]];
        drawing = !drawing; seg -= left; [x0, y0] = [xm, ym]; left = drawing ? on : off;
      }
      left -= seg;
      if (drawing) cur.push([x1, y1]);
    }
    if (drawing && cur.length > 1) out.push(cur);
  }
  return out;
}

export { critique } from './critic.mjs';
