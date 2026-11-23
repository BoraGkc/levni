// Data charts drawn with the hand pen: bars, linechart, pie / donut, isochart.
// Numbers come only from the data; every value is scaled to pixels here and nothing else is invented.
// Elements get the same pen, rng and colour resolver as the other assets (see assets.mjs).
// On a dark panel pass "ink": "paper" so axes and labels stay visible.
import { box, ellipse } from './pen.mjs';
import { peep } from './glyphs.mjs';
import { findProp } from './props.mjs';

const f = (n) => Math.round(n * 10) / 10;
const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (v) => (Number.isFinite(+v) && v !== null && v !== '' && typeof v !== 'boolean' ? +v : 0);
const nums = (a) => (Array.isArray(a) ? a : a == null ? [] : [a]).map(num);
const CYCLE = ['coral', 'blue', 'mustard', 'green', 'tone'];

// "1.0" -> "1", 12.345 -> "12.3"; prefix / suffix / decimals come from the element
function fmt(v, e) {
  const d = e.decimals;
  const s = d != null ? v.toFixed(Math.max(0, Math.min(6, d | 0))) : String(Math.round(v * 100) / 100);
  return `${e.prefix ?? ''}${s}${e.suffix ?? ''}`;
}
const text = (x, y, t, { size, color, anchor = 'middle' }) =>
  `<text x="${f(x)}" y="${f(y)}" ${MONO} font-size="${size}" fill="${color}" text-anchor="${anchor}" letter-spacing="0.6">${esc(t)}</text>`;

// a domain [lo, hi] that always contains zero (unless min/max say otherwise) and never has zero width
function domain(values, e, includeZero = true) {
  const all = values.length ? values : [0];
  let lo = e.min != null ? num(e.min) : Math.min(...all, includeZero ? 0 : Infinity);
  let hi = e.max != null ? num(e.max) : Math.max(...all, includeZero ? 0 : -Infinity);
  if (hi <= lo) hi = lo + 1;
  return [lo, hi];
}
const clampTo = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function colorsOf(e, c, n, { highlightDefault = ['blue'], focus = 'coral', base = 'tone' } = {}) {
  const list = e.colors && e.colors.length ? e.colors : null;
  return Array.from({ length: n }, (_, i) => {
    if (list) return c(list[i % list.length]);
    if (e.highlight != null) return c(i === e.highlight ? focus : base);
    return c(highlightDefault[i % highlightDefault.length]);
  });
}

// dense straight edge so smoothing keeps corners crisp
const edge = (ax, ay, bx, by, step = 12) => {
  const k = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step));
  return Array.from({ length: k }, (_, i) => [ax + ((bx - ax) * i) / k, ay + ((by - ay) * i) / k]);
};
const BAR_OPTS = { offset: 2.6, amp: 0.9 };

export const CHART_ASSETS = {
  // { x, y, w, h, values, labels?, colors?, highlight?, baseline?, gap?, horizontal?, max?, min?, showValues?, ink? }
  bars(e, { pen, c }) {
    const vals = nums(e.values), n = vals.length;
    const ink = c(e.ink, '#0A3FB0'), size = e.labelSize ?? 13, wt = e.weight ?? 4;
    const [x, y, w, h] = [num(e.x), num(e.y), Math.max(1, num(e.w) || 400), Math.max(1, num(e.h) || 240)];
    const [lo, hi] = domain(vals, e), range = hi - lo;
    const cols = colorsOf(e, c, n, { highlightDefault: ['blue'] });
    const labels = (e.labels || []).map(String), gap = clampTo(e.gap ?? 0.28, 0, 0.9);
    let s = '';
    if (!n) return { svg: pen.line([[x, y + h], [x + w, y + h]], { color: ink, w: wt }), bbox: [x, y, w, h] };

    if (!e.horizontal) {
      const labelH = labels.length ? size * 2 : 0, top = e.showValues ? size * 1.8 : 0, bot = e.showValues && lo < 0 ? size * 1.8 : 0;
      const py0 = y + top, ph = Math.max(10, h - labelH - top - bot);
      const zeroY = py0 + ((hi - 0) / range) * ph, slot = w / n, bw = slot * (1 - gap);
      const yOf = (v) => py0 + ((hi - clampTo(v, lo, hi)) / range) * ph;
      vals.forEach((v, i) => {
        const cx = x + slot * (i + 0.5), x0 = cx - bw / 2, x1 = cx + bw / 2, yv = yOf(v);
        const [t, b] = [Math.min(yv, zeroY), Math.max(yv, zeroY)];
        if (b - t < 2) s += pen.line([[x0, zeroY], [x1, zeroY]], { color: cols[i], w: wt + 2, amp: 0.4 });
        else s += pen.shape(box(x0, t, x1, b, 11), { fill: cols[i], stroke: ink, w: wt, ...BAR_OPTS });
        if (e.showValues) s += text(cx, v >= 0 ? t - size * 0.5 : b + size * 1.6, fmt(v, e), { size, color: ink });
        if (labels[i] != null && labels.length) s += text(cx, y + h - size * 0.4, labels[i], { size, color: ink });
      });
      if (e.baseline !== false) s += pen.line([[x - 4, zeroY], [x + w + 4, zeroY]], { color: ink, w: wt + 1, amp: 0.8 });
    } else {
      const labelW = labels.length ? Math.max(...labels.map((l) => l.length)) * size * 0.64 + 14 : 0, valW = e.showValues ? size * 4 : 0;
      const px0 = x + labelW, pw = Math.max(10, w - labelW - valW), slot = h / n, bh = slot * (1 - gap);
      const zeroX = px0 + ((0 - lo) / range) * pw;
      const xOf = (v) => px0 + ((clampTo(v, lo, hi) - lo) / range) * pw;
      vals.forEach((v, i) => {
        const cy = y + slot * (i + 0.5), y0 = cy - bh / 2, y1 = cy + bh / 2, xv = xOf(v);
        const [l, r] = [Math.min(xv, zeroX), Math.max(xv, zeroX)];
        if (r - l < 2) s += pen.line([[zeroX, y0], [zeroX, y1]], { color: cols[i], w: wt + 2, amp: 0.4 });
        else s += pen.shape(box(l, y0, r, y1, 11), { fill: cols[i], stroke: ink, w: wt, ...BAR_OPTS });
        if (e.showValues) s += text(v >= 0 ? r + 8 : l - 8, cy + size * 0.35, fmt(v, e), { size, color: ink, anchor: v >= 0 ? 'start' : 'end' });
        if (labels.length) s += text(x, cy + size * 0.35, labels[i] ?? '', { size, color: ink, anchor: 'start' });
      });
      if (e.baseline !== false) s += pen.line([[zeroX, y - 4], [zeroX, y + h + 4]], { color: ink, w: wt + 1, amp: 0.8 });
    }
    return { svg: s, bbox: [x, y, w, h] };
  },

  // { x, y, w, h, series: [[..], [..]] | values, colors?, dots?, area?, labels?, max?, min?, showValues?, ink? }
  linechart(e, { pen, c }) {
    let series = Array.isArray(e.series) && e.series.length && Array.isArray(e.series[0]) ? e.series.map(nums) : [nums(e.series ?? e.values)];
    series = series.filter((a) => a.length);
    if (!series.length) series = [[]];
    const ink = c(e.ink, '#0A3FB0'), size = e.labelSize ?? 13, wt = e.weight ?? 4;
    const [x, y, w, h] = [num(e.x), num(e.y), Math.max(1, num(e.w) || 400), Math.max(1, num(e.h) || 240)];
    const labels = (e.labels || []).map(String), labelH = labels.length ? size * 2 : 0, top = e.showValues ? size * 1.8 : size * 0.6;
    const py0 = y + top, ph = Math.max(10, h - labelH - top);
    const all = series.flat();
    const [lo, hi] = domain(all, e, e.zero !== false), range = hi - lo;
    const n = Math.max(1, ...series.map((a) => a.length)), inset = Math.min(14, w / 8);
    const xAt = (i) => (n > 1 ? x + inset + (i / (n - 1)) * (w - inset * 2) : x + w / 2);
    const yAt = (v) => py0 + ((hi - clampTo(v, lo, hi)) / range) * ph;
    const cols = (e.colors && e.colors.length ? e.colors : ['coral', 'blue', 'green', 'mustard']).map((k) => c(k));
    let s = '';
    const baseY = py0 + ph, zeroY = clampTo(yAt(0), py0, baseY);
    if (lo < 0 && hi > 0) s += pen.line([[x, zeroY], [x + w, zeroY]], { color: ink, w: 2.5, amp: 0.5 });
    if (e.area && series[0].length > 1) {
      const pts = series[0].map((v, i) => [xAt(i), yAt(v)]);
      const [p0, p1] = [pts[0], pts[pts.length - 1]];
      s += pen.shape([...edge(p0[0], zeroY, p0[0], p0[1]), ...pts, ...edge(p1[0], p1[1], p1[0], zeroY), ...edge(p1[0], zeroY, p0[0], zeroY)], { fill: c(e.areaColor || 'tone'), stroke: null, offset: 2.4, amp: 0.4 });
    }
    series.forEach((a, k) => {
      const pts = a.map((v, i) => [xAt(i), yAt(v)]);
      if (pts.length > 1) s += pen.line(pts, { color: cols[k % cols.length], w: wt + 3, amp: 0.7 });
      if (e.dots !== false && (e.dots || pts.length === 1)) for (const [px, py] of pts) s += pen.shape(ellipse(px, py, 7, 7, 9), { fill: c('paper'), stroke: cols[k % cols.length], w: wt, offset: 0, amp: 0.4 });
      if (e.showValues) a.forEach((v, i) => (s += text(pts[i][0], pts[i][1] - 14, fmt(v, e), { size: size - 1, color: ink })));
    });
    labels.forEach((l, i) => { if (i < n) s += text(xAt(i), y + h - size * 0.4, l, { size, color: ink }); });
    if (e.baseline !== false) s += pen.line([[x - 4, baseY], [x + w + 4, baseY]], { color: ink, w: wt + 1, amp: 0.8 });
    if (e.axis) s += pen.line([[x, py0 - 2], [x, baseY]], { color: ink, w: wt, amp: 0.8 });
    return { svg: s, bbox: [x, y, w, h] };
  },

  // { x, y, r, values, colors?, hole?, highlight?, explode?, labels?, showValues?, start?, ink? }
  pie(e, ctx) { return pieChart(e, ctx, e.hole ?? 0); },
  donut(e, ctx) { return pieChart(e, ctx, e.hole ?? 0.55); },

  // { x, y, values, unit, icon: "person" | prop name, size, labels?, colors?, showValues?, ink? }
  // (x, y) is the top-left corner of the first row.
  isochart(e, { pen, r, c }) {
    const vals = nums(e.values).map((v) => Math.max(0, v)), n = vals.length;
    const ink = c(e.ink, '#0A3FB0'), size = Math.max(8, num(e.size) || 60), lsz = e.labelSize ?? 13;
    const [x, y] = [num(e.x), num(e.y)];
    const labels = (e.labels || []).map(String);
    const maxv = Math.max(0, ...vals);
    const maxIcons = e.maxIcons ?? 24;
    let unit = num(e.unit);
    if (unit <= 0) unit = maxv > 0 ? Math.max(1e-9, maxv / 10) : 1;
    if (maxv / unit > maxIcons) unit = maxv / maxIcons; // never an unreadable row of hundreds of icons
    const step = size * 0.68, rowH = size * 1.28, labelW = labels.length ? Math.max(...labels.map((l) => l.length)) * lsz * 0.64 + 16 : 0;
    const cols = colorsOf(e, c, n, { highlightDefault: ['coral'] });
    const prop = e.icon && e.icon !== 'person' ? findProp(e.icon) : null;
    const v0 = prop ? prop.variants[0] : null;
    let s = '', right = x + labelW;
    vals.forEach((v, i) => {
      const base = y + i * rowH + size, count = v / unit, full = Math.floor(count + 1e-9), part = count - full;
      if (labels.length) s += text(x, base - size * 0.35, labels[i] ?? '', { size: lsz, color: ink, anchor: 'start' });
      const icon = (cx, col) => {
        if (!v0) return peep(pen, cx, base, size, col, ink);
        const k = size / 100;
        const sw = f(Math.min(8, Math.max(...v0.paths.map((p) => p.weight ?? 8))));
        const fillOf = (p) => (!p.fill || p.fill === 'none' ? 'none' : ['paper', 'white'].includes(p.fill) ? c(p.fill) : col);
        return `<g transform="translate(${f(cx - size / 2)} ${f(base - size)}) scale(${k})">` + v0.paths.map((p) => `<path d="${esc(p.d)}" fill="${fillOf(p)}" stroke="${p.stroke === 'none' ? 'none' : ink}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`).join('') + '</g>';
      };
      for (let k = 0; k < full; k++) s += icon(x + labelW + step * (k + 0.5), cols[i]);
      let end = x + labelW + step * full;
      if (part > 0.04) {
        const cx = x + labelW + step * (full + 0.5), id = `iso${Math.floor(r.next() * 1e9)}`;
        const cut = cx - step / 2 + step * part;
        s += `<clipPath id="${id}"><rect x="${f(cx - size)}" y="${f(base - size * 1.2)}" width="${f(cut - (cx - size))}" height="${f(size * 1.6)}"/></clipPath><g clip-path="url(#${id})">${icon(cx, cols[i])}</g>`;
        end = cut;
      }
      if (e.showValues) s += text(end + size * 0.3, base - size * 0.3, fmt(v, e), { size: lsz, color: ink, anchor: 'start' });
      right = Math.max(right, end + (e.showValues ? size * 0.3 + lsz * 5 : 0));
    });
    if (e.showUnit !== false && n) s += text(x, y + n * rowH + lsz * 0.6, `1 ${prop ? e.icon : 'icon'} = ${fmt(unit, e)}`.toUpperCase(), { size: lsz - 2, color: ink, anchor: 'start' });
    return { svg: s, bbox: [x, y, Math.max(right - x, step), n * rowH + lsz * 1.4] };
  },
};

function pieChart(e, { pen, c }, holeIn) {
  const vals = nums(e.values).map((v) => Math.max(0, v)), n = vals.length, total = vals.reduce((a, b) => a + b, 0);
  const ink = c(e.ink, '#0A3FB0'), size = e.labelSize ?? 13, wt = e.weight ?? 4;
  const [cx, cy, R] = [num(e.x), num(e.y), Math.max(4, num(e.r) || 120)];
  const hole = clampTo(num(holeIn), 0, 0.8), labels = (e.labels || []).map(String);
  const cols = colorsOf(e, c, n, { highlightDefault: CYCLE });
  const start = ((e.start ?? -90) * Math.PI) / 180;
  let s = '';
  if (total <= 0) { // nothing to show: an empty outline, no NaN
    s += pen.shape(ellipse(cx, cy, R, R, 24), { fill: null, stroke: ink, w: wt, offset: 0 });
    if (hole > 0) s += pen.shape(ellipse(cx, cy, R * hole, R * hole, 18), { fill: null, stroke: ink, w: wt, offset: 0 });
    return { svg: s, bbox: [cx - R, cy - R, R * 2, R * 2] };
  }
  let a = start;
  const pad = e.labels || e.showValues ? size * 6 : 0;
  vals.forEach((v, i) => {
    if (v <= 0) return;
    const sweep = (v / total) * Math.PI * 2, a0 = a, a1 = a + sweep, mid = (a0 + a1) / 2;
    a = a1;
    const ex = e.explode != null ? num(e.explode) : e.highlight != null ? 0.07 : 0;
    const push = (e.highlight == null || e.highlight === i) && ex ? R * ex : 0;
    const ox = Math.cos(mid) * push, oy = Math.sin(mid) * push;
    const arcPts = (rad, from, to) => { const k = Math.max(3, Math.ceil((Math.abs(to - from) * rad) / 18)); return Array.from({ length: k + 1 }, (_, j) => [cx + ox + Math.cos(from + ((to - from) * j) / k) * rad, cy + oy + Math.sin(from + ((to - from) * j) / k) * rad]); };
    let pts;
    if (sweep >= Math.PI * 2 - 1e-6) pts = ellipse(cx, cy, R, R, 28); // a single slice is a full disc
    else if (hole > 0) {
      const outer = arcPts(R, a0, a1), inner = arcPts(R * hole, a1, a0);
      pts = [...outer, ...edge(...outer[outer.length - 1], ...inner[0]), ...inner, ...edge(...inner[inner.length - 1], ...outer[0])];
    } else {
      const outer = arcPts(R, a0, a1);
      pts = [...outer, ...edge(...outer[outer.length - 1], cx + ox, cy + oy), ...edge(cx + ox, cy + oy, ...outer[0])];
    }
    s += pen.shape(pts, { fill: cols[i], stroke: ink, w: wt, offset: 2.4, amp: 0.7 });
    if (labels[i] != null || e.showValues) {
      const lx = cx + ox + Math.cos(mid) * (R + 16), ly = cy + oy + Math.sin(mid) * (R + 16) + size * 0.35;
      const t = [labels[i], e.showValues ? fmt(vals[i], e) : null].filter((q) => q != null && q !== '').join(' ');
      s += text(lx, ly, t, { size, color: ink, anchor: Math.cos(mid) >= 0.15 ? 'start' : Math.cos(mid) <= -0.15 ? 'end' : 'middle' });
    }
  });
  return { svg: s, bbox: [cx - R - pad, cy - R, R * 2 + pad * 2, R * 2] };
}
