// Iso kit: diorama bases, the new object kinds, presets, the soft style, painter's order, and that
// first-generation iso scenes still take the old code path (their output must not change).
// Usage: node test/iso.mjs
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { compose } from '../src/index.mjs';
import { expandIso } from '../src/iso.mjs';
import { wantsKit, expandKit, sortUnits } from '../src/iso-kit.mjs';
import { buildPreset, PALETTES, PRESET_NAMES } from '../src/iso-presets.mjs';

const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);
const ok = (cond, where, msg) => { if (!cond) fail(where, msg); };
const clean = (svg, where) => {
  ok(!/NaN|undefined|Infinity/.test(svg), where, 'SVG contains NaN/undefined/Infinity');
  const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  ok(new Set(ids).size === ids.length, where, 'duplicate SVG ids');
};

// 1. first-generation scenes keep the first renderer
const room = JSON.parse(readFileSync(new URL('../examples/room.json', import.meta.url), 'utf8'));
const iso0 = room.elements.find((e) => e.type === 'iso');
ok(!wantsKit(iso0), 'legacy', 'examples/room.json must not route to the kit');
ok(!expandIso(iso0).some((e) => e.type === 'iso-svg'), 'legacy', 'legacy expansion emits kit elements');
ok(wantsKit({ ...iso0, base: true }) && wantsKit({ objects: [{ kind: 'tree', x: 0, y: 0 }] }) && wantsKit({ preset: 'room' }), 'routing', 'kit features must route to the kit');

// 2. every preset, a few seeds, both styles, every palette: clean SVG, deterministic
for (const name of PRESET_NAMES) for (const seed of [1, 2, 3]) for (const style of [undefined, 'soft']) {
  const palette = Object.keys(PALETTES)[(seed + (style ? 1 : 0)) % Object.keys(PALETTES).length];
  const scene = { seed: 3, finish: style === 'soft' ? 'soft' : undefined, elements: [{ type: 'iso', preset: name, seed, style, palette }] };
  const where = `${name}#${seed}${style ? ' soft' : ''} ${palette}`;
  try {
    const { svg, used } = await compose(scene);
    clean(svg, where);
    ok(used.length > 10, where, 'too few drawn elements');
    // hatch clip ids come from a process-wide counter (assets.mjs), so compare with them normalised
    const norm = (t) => t.replace(/\bh\d+\b/g, 'h');
    if (seed === 1 && !style) ok(norm((await compose(scene)).svg) === norm(svg), where, 'not deterministic');
  } catch (err) { fail(where, `compose threw: ${err.message}`); }
}

// 3. presets can be overridden and trimmed by id
{
  const ids = buildPreset('room', { seed: 1, palette: PALETTES.house }).objects.map((o) => o.id);
  ok(ids.includes('rug') && new Set(ids).size === ids.length, 'preset ids', 'room needs unique ids incl. rug');
  const base = expandKit({ type: 'iso', preset: 'room', seed: 1 });
  const less = expandKit({ type: 'iso', preset: 'room', seed: 1, objects: [{ id: 'rug', remove: true }] });
  ok(less.length < base.length, 'override', 'remove: true should drop the rug');
  const recol = expandKit({ type: 'iso', preset: 'room', seed: 1, objects: [{ id: 'rug', color: '#123456' }] });
  ok(JSON.stringify(recol).includes('#123456'), 'override', 'an override by id should change the object');
  const more = expandKit({ type: 'iso', preset: 'room', seed: 1, objects: [{ kind: 'tree', x: 300, y: 300 }] });
  ok(more.length > base.length, 'override', 'extra objects are added');
  let threw = false;
  try { expandKit({ type: 'iso', preset: 'castle' }); } catch { threw = true; }
  ok(threw, 'preset', 'an unknown preset should throw with the list of names');
}

// 4. painter's order: far before near, under before on top, wall before what stands in front of it
{
  const u = (b, name) => ({ b, name });
  const order = sortUnits([
    u([100, 160, 100, 160, 0, 40], 'near'), u([0, 60, 0, 60, 0, 40], 'far'),
    u([100, 160, 100, 160, 40, 50], 'on-top'), u([0, 400, -14, 0, 0, 200], 'wall'),
  ]).map((x) => x.name);
  ok(order.indexOf('far') < order.indexOf('near'), 'order', `far must come first: ${order}`);
  ok(order.indexOf('near') < order.indexOf('on-top'), 'order', `stacked must come after: ${order}`);
  ok(order.indexOf('wall') < order.indexOf('near'), 'order', `wall must come first: ${order}`);
}

// 5. every kind, both styles, with a base of every shape
const kinds = [
  { kind: 'floor', x: 0, y: 0, w: 200, d: 200, pattern: 'checker' },
  { kind: 'wall', axis: 'x', x: 0, y: 0, w: 200, h: 150, arch: [120, 50, 100], windows: [[20, 60, 60, 50]], light: true },
  { kind: 'wall', axis: 'y', x: 0, y: 0, d: 200, h: 150, door: [130, 40, 90] },
  { kind: 'prop', name: 'clock', wall: 'y', y: 60, z: 100, size: 40 }, { kind: 'frame', wall: 'x', x: 160, z: 120 }, { kind: 'board', wall: 'y', y: 60, z: 60, w: 80, h: 40, art: 'chart' }, { kind: 'clock', wall: 'x', x: 100, z: 130 },
  { kind: 'rug', x: 40, y: 60, w: 100, d: 80, shape: 'round' }, { kind: 'decal', x: 10, y: 160, w: 30, d: 30 },
  { kind: 'stairs', x: 220, y: 20, w: 80, d: 50, h: 60, dir: '+y' }, { kind: 'ramp', x: 220, y: 90, w: 80, d: 40, h: 30, dir: '-y' },
  { kind: 'house', x: 330, y: 20, w: 90, d: 70, h: 60 }, { kind: 'box', x: 330, y: 120, w: 70, d: 60, h: 50, roof: 'hip' }, { kind: 'box', x: 330, y: 200, w: 50, d: 40, h: 40, roof: 'flat' },
  { kind: 'building', x: 440, y: 20, w: 70, d: 70, h: 140, lights: true }, { kind: 'roof', x: 440, y: 120, w: 60, d: 40, z: 0, h: 30 },
  { kind: 'fence', axis: 'y', x: 220, y: 220, d: 100 }, { kind: 'lowwall', axis: 'x', x: 380, y: 300, w: 100 }, { kind: 'hedge', axis: 'x', x: 420, y: 120, w: 90 },
  { kind: 'pond', x: 230, y: 250, w: 120, d: 80 }, { kind: 'water', x: 0, y: 420, w: 80, d: 40, shape: 'rect' },
  { kind: 'road', x: 0, y: 340, w: 520, d: 60, axis: 'x', crossing: 100 }, { kind: 'road', x: 540, y: 0, w: 60, d: 400, axis: 'y' }, { kind: 'path', x: 420, y: 160, w: 40, d: 180, stones: true },
  { kind: 'tree', x: 470, y: 230, shape: 'cone' }, { kind: 'tree', x: 500, y: 300, shape: 'pine' }, { kind: 'tree', x: 30, y: 260 }, { kind: 'bush', x: 90, y: 290 },
  { kind: 'lamp', x: 160, y: 300 }, { kind: 'bench', x: 100, y: 230, facing: '-y' }, { kind: 'chair', x: 60, y: 120, facing: '+x' }, { kind: 'table', x: 100, y: 120, shape: 'round' },
  { kind: 'desk', x: 20, y: 20 }, { kind: 'sofa', x: 120, y: 20, facing: '-y' }, { kind: 'shelf', x: 10, y: 60, facing: '+x' }, { kind: 'counter', x: 250, y: 160 }, { kind: 'bed', x: 600, y: 420 },
  { kind: 'car', x: 300, y: 352, axis: 'x' }, { kind: 'car', x: 550, y: 100, axis: 'y' }, { kind: 'stool', x: 150, y: 180 }, { kind: 'pot', x: 180, y: 180 }, { kind: 'cylinder', x: 200, y: 160, r: 10, h: 30 },
  { kind: 'person', x: 120, y: 120, pose: 'waving', h: 90 }, { kind: 'person', x: 140, y: 140, pose: 'sitting', h: 80 }, { kind: 'prop', name: 'bike', x: 200, y: 320, size: 70 },
];
for (const shape of ['square', 'round', 'island']) for (const style of [undefined, 'soft']) {
  const where = `kinds ${shape}${style ? ' soft' : ''}`;
  try {
    const els = expandKit({ type: 'iso', base: { shape }, style, objects: kinds });
    if (style === 'soft') ok(!els.some((x) => x.type === 'shape' && x.stroke === 'ink'), where, 'soft style should not ink faces');
    else ok(els.some((x) => x.type === 'hatch'), where, 'riso style should hatch shaded faces');
    const wallProp = els.find((x) => x.type === 'draw' && x.size === 100 && x.name === 'clock');
    ok(wallProp, where, 'a wall prop is drawn in the wall plane (size-100 draw)');
    const person = els.find((x) => x.type === 'person');
    ok(person && person.size > 0, where, 'people are placed');
    const { svg } = await compose({ seed: 1, finish: style === 'soft' ? 'soft' : undefined, elements: [{ type: 'iso', base: { shape }, style, objects: kinds }] });
    clean(svg, where);
    if (shape === 'island' && !style) {
      const { width } = await sharp(Buffer.from(svg), { density: 36 }).metadata();
      ok(width > 0, where, 'raster failed');
    }
  } catch (err) { fail(where, `threw: ${err.message}`); }
}

if (errors.length) { console.error(errors.join('\n')); console.error(`iso: ${errors.length} problem(s)`); process.exit(1); }
console.log('iso: presets, kinds, styles, order and legacy routing ok');
