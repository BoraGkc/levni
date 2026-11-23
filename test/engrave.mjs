// Line-art landscapes: terrain, ridgelines, engrave. Usage: node test/engrave.mjs
import { compose } from '../src/index.mjs';

const errors = [];
const ok = (cond, where, msg) => { if (!cond) errors.push(`${where}: ${msg}`); };
const cases = {
  terrain: [{}, { x: 0, y: 0, w: 1200, h: 673, flow: 4, glow: 'coral' }, { w: -5, h: NaN, rows: 9999, cols: 1e9, flow: 99, height: 'x', seed: 5 }, { rows: 0, cols: 0, flow: -3 }],
  ridgelines: [{ x: 60, y: 100, w: 1000, h: 400 }, { x: 60, y: 100, w: 1000, h: 400, lines: 1e6, points: 1e9, peaks: 'noise' }, { x: 0, y: 0, w: 0, h: 0, lines: NaN }],
  engrave: [
    { x: 70, y: 70, w: 1000, h: 500 },
    { x: 70, y: 70, w: 1000, h: 500, gap: 0, layers: 99, rays: 1e6, seed: 4 },
    { mode: 'globe', x: 600, y: 336, r: 200 },
    { mode: 'globe', x: 600, y: 336, r: 0, gap: -1, craters: 1e6 },
    { mode: 'radial', x: 0, y: 0, w: 400, h: 300 },
    { mode: 'noise', x: 0, y: 0, w: 400, h: 300, gap: 0, bend: 1 },
  ],
};
let n = 0;
for (const [type, list] of Object.entries(cases)) for (const [k, extra] of list.entries()) for (const finish of [undefined, 'soft']) {
  const where = `${type}#${k}${finish ? '/soft' : ''}`;
  const scene = { seed: 3, finish, background: type === 'engrave' ? 'paper' : 'dark', elements: [{ type, color: type === 'engrave' ? 'ink' : 'paper', ground: type === 'engrave' ? 'paper' : 'dark', ...extra }] };
  const t0 = performance.now();
  const a = (await compose(scene)).svg;
  const ms = performance.now() - t0;
  const b = (await compose(scene)).svg;
  n++;
  ok(!/NaN|undefined|Infinity/.test(a), where, 'SVG contains NaN/undefined/Infinity');
  ok(a === b, where, 'not deterministic');
  ok(ms < 2000, where, `slow: ${Math.round(ms)} ms`);
  ok(a.length < 3e6, where, `SVG too big: ${a.length}`);
  const ids = [...a.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, where, 'duplicate ids');
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`engrave: ${n} renders ok`);
