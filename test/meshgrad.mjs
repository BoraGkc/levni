// meshgrad: defaults and edge values compose cleanly, are deterministic, and stay fast.
// Usage: node test/meshgrad.mjs
import { compose } from '../src/index.mjs';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const scene = (elements, extra = {}) => ({ finish: 'soft', seed: 2, background: '#14122B', elements, ...extra });

const cases = [
  { type: 'meshgrad', x: 0, y: 0, w: 600, h: 400 },
  { type: 'meshgrad', x: 300, y: 300, r: 120 },
  { type: 'meshgrad', x: 100, y: 100, w: 300, h: 200, shape: 'squircle' },
  { type: 'meshgrad', x: 300, y: 300, r: 100, preset: 'orb' },
  { type: 'meshgrad', x: 300, y: 300, r: 100, preset: 'poster' },
  { type: 'meshgrad', x: 0, y: 0, w: 600, h: 400, bands: 5, lines: true, count: 6 },
  { type: 'meshgrad', x: 0, y: 0, w: 600, h: 400, calm: [0, 0.5, 0.6, 0.5], mask: [{ x: 0.1, y: 0.1, w: 0.4, h: 0.4, shape: 'circle' }, { x: 0.5, y: 0.5, w: 0.4, h: 0.4, shape: 'squircle' }] },
  { type: 'meshgrad', x: 0, y: 0, w: 600, h: 400, stops: [{ x: 0.2, y: 0.2, color: '#FF7A59' }, { x: 0.8, y: 0.8, color: '#2FD4FF', r: 0.8, opacity: 0.8 }], grain: 0 },
  // silly values
  { type: 'meshgrad', x: 0, y: 0, w: -5, h: 0, blur: 1e9, grain: 99, bands: 1e6, count: 1e6, drift: NaN },
  { type: 'meshgrad', x: NaN, y: Infinity, r: -3, colors: [], stops: [{ x: NaN, r: -1 }], calm: [NaN, 0, 1, 1] },
];
for (const [i, e] of cases.entries()) {
  for (const finish of ['soft', 'crayon']) {
    for (const t of [0, 0.5]) {
      const where = `case ${i} ${finish} t=${t}`;
      try {
        const t0 = performance.now();
        const a = (await compose(scene([e], { finish, t }))).svg;
        const b = (await compose(scene([e], { finish, t }))).svg;
        if (/NaN|undefined|Infinity/.test(a)) fail(where, 'SVG contains NaN/undefined/Infinity');
        if (a !== b) fail(where, 'not deterministic');
        if (performance.now() - t0 > 2000) fail(where, 'too slow');
      } catch (err) { fail(where, err.message); }
    }
  }
}
// t moves the blobs
const svgOf = async (e, extra) => (await compose(scene([e], extra))).svg;
const s0 = await svgOf(cases[0], { t: 0 }), s5 = await svgOf(cases[0], { t: 0.5 });
if (s0 === s5) fail('motion', 't has no effect');
// bands really posterise, lines add contour pass
if (!(await svgOf(cases[5])).includes('type="discrete"')) fail('bands', 'no posterise step');
if (!(await svgOf(cases[5])).includes('mode="difference"')) fail('lines', 'no contour step');
// squircle is a real superellipse: many points, not four cubic corners
if (((await svgOf(cases[2])).match(/L/g) || []).length < 100) fail('squircle', 'path is not a sampled superellipse');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('meshgrad ok');
