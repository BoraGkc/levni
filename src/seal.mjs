// Text on a circle, seals and stickers.
//  - `ringtext`: mono text set along a circle (SVG textPath), optionally repeated with a separator to fill the ring.
//  - `seal`: a badge: edge (scallop / perforated / zigzag / plain), ring text, centre slot (a word/number or a `prop`).
//  - `stub`: a ticket with half-round notches and a dotted perforation.
// Die-cut sticker outlines are a field on `draw` / `prop` (`diecut`), see compose.mjs.
import { ellipse } from './pen.mjs';

const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f = (n) => Math.round(n * 100) / 100;
const ADV = 0.602; // Menlo Bold advance in em
const num = (v, d, lo = -Infinity, hi = Infinity) => (Number.isFinite(+v) && v !== null && v !== '' ? Math.min(hi, Math.max(lo, +v)) : d);
// Turkish dotted/dotless i only change case correctly under the "tr" locale: pick it when the text is clearly Turkish
const upperOf = (t, locale) => String(t).toLocaleUpperCase(locale || (/[ıİğĞşŞ]/.test(t) ? 'tr' : 'en'));

// Ring text. Angles in degrees, 0 = 12 o'clock, clockwise. side "out": glyph tops point away from the centre (reads
// along the top); side "in": glyph tops point to the centre and the text runs counter-clockwise (reads along the bottom).
// `r` is the baseline radius. Every glyph is centred on its own slot (so wide letters like M, W and Turkish Ğ Ş İ ö ü ç
// sit even), slots are one advance + spacing apart, and `repeat` stretches the spacing so the units close the ring exactly.
export function ringText({ x, y, r, text, size = 18, start = 0, spacing = 2, side = 'out', repeat = false, sep = '✦', align = 'start', color, upper = true, locale, spin = 0, t = 0 }) {
  r = num(r, 100, 4, 5000); size = num(size, 18, 4, 400); spacing = num(spacing, 2, -size * 0.3, size * 3);
  let s = String(text ?? '').slice(0, 600);
  if (upper) s = upperOf(s, locale);
  const circ = 2 * Math.PI * r;
  let adv = size * ADV, sp = spacing;
  if (repeat) {
    const unit = `${s} ${sep} `, min = size * 0.12;
    let n = Math.max(1, Math.round(circ / (unit.length * (adv + sp))));
    if (n > 1 && circ / (n * unit.length) - adv < min) n -= 1; // never let the stretched spacing collapse into overlap
    if (circ / (n * unit.length) - adv < min) { size = Math.max(4, circ / (n * unit.length * (ADV + 0.12))); adv = size * ADV; } // even one unit is too long: shrink the type
    n = Math.min(n, Math.max(1, Math.floor(2000 / unit.length)));
    sp = circ / (n * unit.length) - adv;
    s = unit.repeat(n);
  }
  const arc = s.length * (adv + sp); // px along the path
  const step = ((adv + sp) / r) * (180 / Math.PI); // degrees per glyph slot
  const half = (arc / r) * (90 / Math.PI);
  const turn = num(spin, 0, -20, 20) * 360 * num(t, 0, 0, 1);
  const origin = num(start, 0) + turn;
  // librsvg has no textPath: every glyph is placed and rotated by hand
  let svg = '', x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  [...s].forEach((ch, i) => {
    if (ch === ' ') return;
    const a = side === 'out' ? (align === 'center' && !repeat ? origin - half : origin) + (i + 0.5) * step : (align === 'center' && !repeat ? origin + half : origin) - (i + 0.5) * step;
    const rot = side === 'out' ? a : a + 180, rd = ((a - 90) * Math.PI) / 180;
    const gx = x + r * Math.cos(rd), gy = y + r * Math.sin(rd);
    // the glyph box (cap height up from the baseline, pointing out for "out", in for "in") for the critic
    const ux = Math.cos(rd) * (side === 'out' ? 1 : -1), uy = Math.sin(rd) * (side === 'out' ? 1 : -1);
    for (const q of [[gx - adv / 2 * -uy, gy - adv / 2 * ux], [gx + adv / 2 * -uy, gy + adv / 2 * ux], [gx + ux * size * 0.78 - adv / 2 * -uy, gy + uy * size * 0.78 - adv / 2 * ux], [gx + ux * size * 0.78 + adv / 2 * -uy, gy + uy * size * 0.78 + adv / 2 * ux]]) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); x1 = Math.max(x1, q[0]); y1 = Math.max(y1, q[1]); }
    svg += `<text ${MONO} font-size="${f(size)}" fill="${color}" text-anchor="middle" transform="translate(${f(gx)} ${f(gy)}) rotate(${f(rot)})">${esc(ch)}</text>`;
  });
  if (!Number.isFinite(x0)) { x0 = x - r; y0 = y - r; x1 = x + r; y1 = y + r; }
  return { svg, bbox: [x0, y0, x1 - x0, y1 - y0], size };
}

// Edge outline as polar points around (0, 0).
function edgePoints(kind, R, n, depth) {
  const pts = [], N = Math.max(360, n * 16);
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2, u = (i / N) * n; // u in 0..n, one bump per unit
    const ph = u - Math.floor(u);
    let rr = R;
    if (kind === 'scallop') rr = R - depth + depth * Math.abs(Math.sin(Math.PI * ph));
    else if (kind === 'zigzag') rr = R - depth + depth * (1 - Math.abs(2 * ph - 1));
    else if (kind === 'perforated') {
      const uu = ph < 0.5 ? ph : ph - 1; // notch centred on integer u
      const w = 0.3; // notch half-width in bump units
      rr = R - depth * Math.sqrt(Math.max(0, 1 - (uu / w) ** 2));
    }
    pts.push([Math.cos(th - Math.PI / 2) * rr, Math.sin(th - Math.PI / 2) * rr]);
  }
  return pts;
}

export const SEAL_ASSETS = {
  ringtext(e, { c, t }) {
    const out = ringText({ ...e, color: c(e.color, '#0B0B14'), t });
    return { svg: out.svg, bbox: out.bbox };
  },
  seal(e, { pen, c, t }) {
    const R = num(e.size, 300, 40, 2000) / 2, ink = c(e.color, '#0B0B14'), fill = e.fill === 'none' ? null : c(e.fill, '#F4EFE2');
    const edge = ['scallop', 'perforated', 'zigzag', 'plain'].includes(e.edge) ? e.edge : 'scallop';
    const n = Math.round(num(e.bumps, edge === 'zigzag' ? 28 : edge === 'perforated' ? 36 : 24, 6, 120));
    const depth = edge === 'plain' ? 0 : R * num(e.depth, edge === 'zigzag' ? 0.07 : edge === 'perforated' ? 0.06 : 0.055, 0, 0.2);
    let s = '';
    const outline = (edge === 'plain' ? ellipse(0, 0, R, R, 40) : edgePoints(edge, R, n, depth)).map(([px, py]) => [px + e.x, py + e.y]);
    if (e.shadow !== false) s += pen.shape(outline.map(([px, py]) => [px + R * 0.05, py + R * 0.06]), { fill: ink, stroke: null, offset: 0, amp: 0.6 });
    s += pen.shape(outline, { fill, stroke: ink, w: num(e.weight, 6, 1, 30), offset: 0, amp: 0.8 });
    const outer = R - depth - R * 0.05, inner = R * num(e.inner, 0.62, 0.3, 0.9);
    const ringCol = c(e.ringColor ?? e.color, '#0B0B14');
    const ringed = !!(e.text || e.top || e.bottom);
    if (e.ring !== false) {
      s += pen.line(ellipse(e.x, e.y, outer, outer, 48), { color: ringCol, w: 3, closed: true, amp: 0.6 });
      if (ringed) s += pen.line(ellipse(e.x, e.y, inner, inner, 48), { color: ringCol, w: 3, closed: true, amp: 0.6 });
    }
    if (ringed) {
      // the type must fit the band between the two rings (cap height + accents ~ 0.95 em) with air on both sides
      const band = outer - inner, size = Math.min(num(e.textSize, Math.max(10, R * 0.115), 6, 200), band * 0.62), mid = (outer + inner) / 2, tc = c(e.textColor ?? e.color, '#0B0B14');
      const base = size * 0.36; // baseline offset so the cap height is centred in the band
      const sep = e.sep ?? '✦', spin = e.spin;
      if (e.text) s += ringText({ x: e.x, y: e.y, r: mid - base, text: e.text, size, repeat: true, sep, color: tc, start: num(e.start, 0), locale: e.locale, upper: e.upper !== false, spin, t }).svg;
      else {
        const sp = num(e.spacing, size * 0.2, 0, size * 2);
        const turn = num(spin, 0, -20, 20) * 360 * num(t, 0, 0, 1);
        if (e.top) s += ringText({ x: e.x, y: e.y, r: mid - base, text: e.top, size, align: 'center', start: turn, spacing: sp, color: tc, locale: e.locale, upper: e.upper !== false }).svg;
        if (e.bottom) s += ringText({ x: e.x, y: e.y, r: mid + base, text: e.bottom, size, align: 'center', start: 180 + turn, side: 'in', spacing: sp, color: tc, locale: e.locale, upper: e.upper !== false }).svg;
        // the two marks between top and bottom text
        for (const a of [90, 270]) s += ringText({ x: e.x, y: e.y, r: mid - base, text: sep, size, align: 'center', start: a + turn, color: tc, upper: false }).svg;
      }
    }
    // centre slot: a big word/number (a `prop` is added by the macro)
    const cr = ringed ? inner : outer, wc = c(e.wordColor ?? e.color, '#0B0B14');
    if (e.word != null && e.word !== '') {
      const word = e.upper === false ? String(e.word) : upperOf(e.word, e.locale), fs = num(e.wordSize, Math.min(cr * 0.62, (cr * 1.7) / (Math.max(1, word.length) * (ADV + 0.04))), 6, R * 2);
      s += `<text ${MONO} font-size="${f(fs)}" fill="${wc}" x="${f(e.x)}" y="${f(e.y + fs * 0.35 - (e.sub ? fs * 0.18 : 0))}" text-anchor="middle" letter-spacing="1">${esc(word)}</text>`;
      if (e.sub) s += `<text ${MONO} font-size="${f(fs * 0.3)}" fill="${wc}" x="${f(e.x)}" y="${f(e.y + fs * 0.35 + fs * 0.34)}" text-anchor="middle" letter-spacing="2">${esc(upperOf(e.sub, e.locale))}</text>`;
    }
    // the critic sees the badge plus its shadow; the ring text sits inside it
    return { svg: s, bbox: [e.x - R, e.y - R, R * 2 + R * 0.05, R * 2 + R * 0.06] };
  },
  // Ticket: rounded body with exact half-round notches on the long edges at `split` and a dotted perforation between.
  stub(e, { pen, c }) {
    const x = num(e.x, 0), y = num(e.y, 0), w = num(e.w, 300, 60, 3000), h = num(e.h, 130, 40, 1500);
    const ink = c(e.color, '#0B0B14'), fill = e.fill === 'none' ? null : c(e.fill, '#F4EFE2');
    const rc = Math.min(16, h * 0.12), nr = num(e.notch, Math.min(20, h * 0.14), 2, h * 0.22);
    const sx = x + Math.min(w - rc - nr - 6, Math.max(rc + nr + 6, w * num(e.split, 0.72, 0.1, 0.95)));
    const pts = [];
    const arc = (cx, cy, r0, a0, a1, k) => { for (let i = 0; i <= k; i++) { const a = a0 + ((a1 - a0) * i) / k; pts.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]); } };
    const K = 28; // one notch = a 28-segment semicircle, mirrored top and bottom
    arc(x + rc, y + rc, rc, Math.PI, Math.PI * 1.5, 8);
    arc(sx, y, nr, Math.PI, 0, K); // top notch: left rim -> bottom of the cut -> right rim (centre on the edge)
    arc(x + w - rc, y + rc, rc, Math.PI * 1.5, Math.PI * 2, 8);
    arc(x + w - rc, y + h - rc, rc, 0, Math.PI * 0.5, 8);
    arc(sx, y + h, nr, 0, -Math.PI, K); // bottom notch, mirrored
    arc(x + rc, y + h - rc, rc, Math.PI * 0.5, Math.PI, 8);
    // arc(…, Math.PI, 0) walks sin(a) >= 0 downward in screen space = into the body, which is the cut we want
    let s = '';
    if (e.shadow !== false) s += pen.shape(pts.map(([px, py]) => [px + 7, py + 8]), { fill: ink, stroke: null, offset: 0, amp: 0.3 });
    s += pen.shape(pts, { fill, stroke: ink, w: num(e.weight, 6, 1, 30), offset: 0, amp: 0.35 });
    // dotted perforation: even pitch, centred between the two notches
    const pitch = 11, span = h - 2 * nr - 2 * pitch, dots = Math.max(2, Math.floor(span / pitch) + 1), used = (dots - 1) * pitch;
    for (let i = 0; i < dots; i++) s += `<circle cx="${f(sx)}" cy="${f(y + h / 2 - used / 2 + i * pitch)}" r="2.4" fill="${ink}"/>`;
    const tc = c(e.textColor, '#0B0B14'), leftW = sx - x - nr - 12;
    if (e.text) {
      const txt = upperOf(e.text, e.locale), ts = Math.min(num(e.textSize, h * 0.2, 6, 200), (leftW - 56) / (txt.length * (ADV + 0.14)));
      s += `<text ${MONO} font-size="${f(ts)}" fill="${tc}" x="${f(x + (sx - x) / 2)}" y="${f(y + h / 2 + ts * 0.35)}" text-anchor="middle" letter-spacing="${f(ts * 0.14)}">${esc(txt)}</text>`;
    }
    if (e.stubText) {
      const txt = upperOf(e.stubText, e.locale), ts = Math.min(h * 0.14, (h - 2 * nr - 16) / (txt.length * (ADV + 0.2)), (x + w - sx) * 0.45);
      s += `<text ${MONO} font-size="${f(Math.max(6, ts))}" fill="${tc}" transform="translate(${f(sx + (x + w - sx) / 2 + ts * 0.35)} ${f(y + h / 2)}) rotate(90)" text-anchor="middle" letter-spacing="${f(ts * 0.2)}">${esc(txt)}</text>`;
    }
    return { svg: s, bbox: [x, y, w + 7, h + 8] };
  },
};

// `seal` with `prop`: the macro adds the prop as the centre slot, sized to fit inside the ring.
// It turns with the seal (`rot`), on top of its own `propRot`, and moves with it (`motion`).
export function expandSeal(e) {
  if (e.type !== 'seal' || !e.prop) return e;
  const R = num(e.size, 300, 40, 2000) / 2, inner = e.text || e.top || e.bottom ? R * num(e.inner, 0.62, 0.3, 0.9) : R * 0.88;
  return [e, { type: 'prop', name: e.prop, variant: e.propVariant, x: e.x, y: e.y, fit: true, size: inner * 1.25, rot: (e.rot || 0) + (e.propRot || 0), recolor: e.recolor, ...(e.motion ? { motion: e.motion } : {}) }];
}
