// Seals, ring text, ticket stubs, die-cut stickers: defaults and silly values stay finite, deterministic and fast.
// Usage: node test/seal.mjs
import { compose } from '../src/index.mjs';
import { ringText } from '../src/seal.mjs';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const scene = (elements, extra = {}) => ({ seed: 4, background: 'paper', elements, ...extra });

const cases = [
  { type: 'ringtext', x: 400, y: 300, r: 150, text: 'hello' },
  { type: 'ringtext', x: 400, y: 300, r: 150, text: 'MWMW ĞŞİıöüç', size: 30, align: 'center', side: 'in' },
  { type: 'ringtext', x: 400, y: 300, r: 150, text: 'made by hand', repeat: true, sep: '•' },
  { type: 'ringtext', x: 400, y: 300, r: 30, text: 'a very long text that cannot fit on a tiny ring', size: 40, repeat: true },
  { type: 'ringtext', x: 400, y: 300, r: -5, text: '', size: 0, spacing: 'x', start: NaN },
  { type: 'ringtext', x: 400, y: 300, r: 1e9, text: 'x'.repeat(5000), size: 1e6, repeat: true },
  { type: 'seal', x: 400, y: 300 },
  { type: 'seal', x: 400, y: 300, size: 300, word: '42', sub: 'ok' },
  { type: 'seal', x: 400, y: 300, size: 300, edge: 'zigzag', top: 'top text', bottom: 'bottom', prop: 'star', rot: 10 },
  { type: 'seal', x: 400, y: 300, size: 300, edge: 'perforated', text: 'çıtır şişli ğ', word: 'İĞŞ' },
  { type: 'seal', x: 400, y: 300, size: 300, edge: 'plain', fill: 'none', text: 'plain', spin: 2 },
  { type: 'seal', x: 400, y: 300, size: -50, bumps: 1e9, depth: 99, inner: 5, weight: 1e4, textSize: 1e5, text: 'x', word: 'toolongwordtofit' },
  { type: 'seal', x: 400, y: 300, size: Infinity, bumps: 'a', edge: 'nope' },
  { type: 'stub', x: 100, y: 100 },
  { type: 'stub', x: 100, y: 100, w: 400, h: 150, text: 'admit one', stubText: 'no. 07', split: 0.5, notch: 12, rot: 5 },
  { type: 'stub', x: 100, y: 100, w: 0, h: -1, split: 9, notch: 1e6, text: 'x'.repeat(200), stubText: 'y'.repeat(200) },
  { type: 'prop', name: 'rocket', x: 400, y: 300, size: 200, diecut: true },
  { type: 'prop', name: 'anchor', x: 400, y: 300, size: 200, diecut: { offset: 1e6, color: 'mustard' } },
  { type: 'prop', name: 'balloon', x: 400, y: 300, size: 200, diecut: { offset: 'x', shadow: false, line: 'none' } },
  { type: 'draw', x: 400, y: 300, size: 200, diecut: true, paths: [{ d: 'M20 20 L80 20 L80 80 L20 80 Z M40 40 L60 40 L60 60 L40 60 Z', fill: 'coral', rule: 'evenodd' }] },
];

for (const e of cases) {
  const at = `${e.type}${e.edge ? ' ' + e.edge : ''}${e.name ? ' ' + e.name : ''}${e.size === Infinity || e.size < 0 ? ' silly' : ''}`;
  for (const finish of ['crayon', 'soft']) {
    for (const t of [0, 0.5]) {
      const t0 = Date.now();
      try {
        const { svg } = await compose(scene([e], { finish, t }));
        if (/NaN|undefined|Infinity/.test(svg)) fail(at, `SVG contains NaN/undefined/Infinity (${finish}, t=${t})`);
        if (Date.now() - t0 > 3000) fail(at, `slow: ${Date.now() - t0} ms`);
        const again = (await compose(scene([e], { finish, t }))).svg;
        if (again !== svg) fail(at, `not deterministic (${finish}, t=${t})`);
      } catch (err) { fail(at, `threw: ${err.message}`); }
    }
  }
}

// ring text geometry: a repeated ring closes (equal slots, no overlap), the box follows the glyphs
for (const [txt, size, r] of [['ortak alan', 18, 270], ['MWMW ĞŞİ', 26, 120], ['a', 18, 40], ['a longer sentence for a small ring', 20, 60]]) {
  const o = ringText({ x: 0, y: 0, r, text: txt, size, repeat: true, color: '#000' });
  const ang = [...o.svg.matchAll(/translate\(([-\d.]+) ([-\d.]+)\)/g)].map((m) => Math.atan2(+m[2], +m[1]));
  const gaps = ang.slice(1).map((a, i) => ((a - ang[i]) + 4 * Math.PI) % (2 * Math.PI)).filter((g) => g < 0.9 * Math.PI);
  const min = Math.min(...gaps), glyphArc = o.size * 0.602 / r;
  if (min < glyphArc * 0.999) fail(`ring "${txt}"`, `glyphs overlap: slot ${min.toFixed(4)} rad < advance ${glyphArc.toFixed(4)}`);
  const wrap = ((ang[0] - ang.at(-1)) + 4 * Math.PI) % (2 * Math.PI);
  const step = Math.max(...gaps);
  if (wrap > step * 2.6 + 1e-6) fail(`ring "${txt}"`, `gap at the seam: ${wrap.toFixed(4)} rad vs slot ${step.toFixed(4)}`); // a separator space slot may be skipped
  if (!(o.bbox[2] > 0 && o.bbox[3] > 0)) fail(`ring "${txt}"`, 'empty bbox');
}
const arc = ringText({ x: 0, y: 0, r: 100, text: 'top', align: 'center', color: '#000' });
if (arc.bbox[3] > 90) fail('arc bbox', `a 3-letter arc should not box the whole circle (h ${arc.bbox[3].toFixed(0)})`);
if (ringText({ x: 0, y: 0, r: 100, text: 'iıİI', upper: true, color: '#000' }).svg.match(/>İ</g)?.length !== 1 && !/>İ</.test(ringText({ x: 0, y: 0, r: 100, text: 'ıi', color: '#000' }).svg)) fail('turkish upper', 'i did not become İ with a Turkish text');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`seal tests passed (${cases.length} cases x crayon/soft x t 0/0.5, ring geometry)`);
