// Small hand-drawn helpers shared by elements: a sketched icon, filler marks, wave lines and arrows.
import { icon } from './icon.mjs';

// Icon with a second, thinner pass slightly off: reads as a quick hand sketch.
export function sketch(name, o) {
  return icon(name, o) + `<g opacity="0.55">${icon(name, { ...o, x: o.x + 2.5, y: o.y + 2, lineWidth: o.lineWidth * 0.42, under: null })}</g>`;
}

// Small hand marks that fill space between objects.
export function marks(pen, r, x, y, color, kind = r.pick(['spark', 'dot', 'squiggle', 'star', 'plus'])) {
  const s = r.range(16, 30);
  if (kind === 'spark') return [0, 1, 2, 3, 4].map((k) => { const a = (k / 5) * Math.PI * 2 + r.jitter(0.2); return pen.line([[x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5], [x + Math.cos(a) * s, y + Math.sin(a) * s]], { color, w: 4, amp: 0.4 }); }).join('');
  if (kind === 'dot') return pen.dot(x, y, s * 0.28, color);
  if (kind === 'squiggle') return pen.line(Array.from({ length: 6 }, (_, k) => [x - s + k * s * 0.45, y + (k % 2 ? -s * 0.3 : s * 0.3)]), { color, w: 4.5, amp: 0.6 });
  if (kind === 'plus') return pen.line([[x - s * 0.5, y], [x + s * 0.5, y]], { color, w: 5 }) + pen.line([[x, y - s * 0.5], [x, y + s * 0.5]], { color, w: 5 });
  return pen.shape(Array.from({ length: 10 }, (_, k) => { const a = (k / 10) * Math.PI * 2 - Math.PI / 2; const rr = k % 2 ? s * 0.4 : s; return [x + Math.cos(a) * rr, y + Math.sin(a) * rr]; }), { fill: color, stroke: null, offset: 0, amp: 0.5 });
}

// Wavy horizontal line, the house shorthand for water, wind and fields.
export const wave = (pen, x0, x1, y, amp, len, color, w = 6) => {
  const pts = [];
  for (let x = x0, k = 0; x <= x1; x += len / 2, k++) pts.push([x, y + (k % 2 ? -amp : amp)]);
  return pen.line(pts, { color, w, amp: 1 });
};

// Hand-drawn arrow along a gentle curve.
export function arrow(pen, r, [x0, y0], [x1, y1], color, bend = 40) {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 - bend;
  const pts = Array.from({ length: 7 }, (_, k) => { const t = k / 6; return [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * mx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * my + t * t * y1]; });
  const [ax, ay] = pts[5], a = Math.atan2(y1 - ay, x1 - ax);
  return pen.line(pts, { color, w: 7 }) + pen.line([[x1 - Math.cos(a - 0.5) * 26, y1 - Math.sin(a - 0.5) * 26], [x1, y1], [x1 - Math.cos(a + 0.5) * 26, y1 - Math.sin(a + 0.5) * 26]], { color, w: 7, amp: 0.6 });
}
