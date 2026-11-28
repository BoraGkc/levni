// Storyboards: spec shapes expand, unknown props warn instead of throwing, output is deterministic, the sheet and
// shots.json carry the numbers a video tool needs. Small frames keep it fast. Usage: node test/storyboard.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { expandStoryboard, renderStoryboard, timecode } from '../src/storyboard.mjs';

const bad = (s) => /NaN|undefined|Infinity/.test(s);
const dir = mkdtempSync(join(tmpdir(), 'levni-storyboard-'));
try {
  // bare array: the shotlist.json shape { id, desc, frames } (24 fps default)
  const bare = expandStoryboard([{ id: 'a', desc: 'Close on the coffee cup', frames: 48 }, { id: 'b', desc: 'Wide of the street', frames: 72 }]);
  assert.equal(bare.length, 2);
  assert.deepEqual(bare.map((s) => s.id), ['a', 'b']);
  assert.equal(bare[0].duration, 2);
  assert.equal(bare[1].duration, 3);
  assert.equal(bare[0].title, 'Close on the coffee cup');
  assert.ok(bare[0].scene.elements.some((e) => e.type === 'prop' && /^coffee/.test(e.name)), 'prop word in the desc was not picked up');
  assert.equal(bare[0].scene.canvas.join('x'), '1280x720');
  assert.ok(!bad(JSON.stringify(bare)), 'bad numbers in expanded shots');
  assert.equal(JSON.parse(JSON.stringify(bare))[0].scene.elements.length, bare[0].scene.elements.length, 'not plain JSON');

  // frames + fps, formats
  const fps = expandStoryboard({ fps: 30, format: 'story', shots: [{ frames: 45, prop: 'rocket', text: 'Go' }, { duration: 1.5, frames: 999 }] });
  assert.equal(fps[0].duration, 1.5);
  assert.equal(fps[1].duration, 1.5, 'duration must win over frames');
  assert.deepEqual(fps[0].scene.canvas, [1080, 1920]);
  assert.deepEqual(expandStoryboard({ format: [640, 360], shots: [{ prop: 'dove' }] })[0].scene.canvas, [640, 360]);
  assert.throws(() => expandStoryboard({ format: 'nope', shots: [{}] }));
  assert.throws(() => expandStoryboard({ shots: [] }));

  // full spec: scene used as is, props, cameras, text, brand style
  const own = { canvas: [800, 450], elements: [{ type: 'disc', x: 400, y: 225, r: 100, color: 'coral' }] };
  const spec = {
    title: 'Çağrı: ığşğ İstanbul', seed: 4, format: [480, 270], brand: { name: 'Kumru', inks: ['#14213D', '#E8734A', '#F0B84A', '#F6F0E4'] },
    shots: [
      { id: 'one', title: 'Fincan', prop: 'coffee-cup', camera: 'close', text: 'Güne yavaş başla.', note: 'Yakın plan, buhar. Ses: kaşık.', duration: 2 },
      { id: 'two', title: 'İki', props: ['package', 'calendar'], background: 'blue', camera: 'left', text: 'Her ay kapında', duration: 3.5 },
      { id: 'three', title: 'Kendi sahnem', scene: own, duration: 1 },
      { id: 'four', title: 'Sağ', prop: 'phone', camera: 'right', duration: 2 },
    ],
  };
  const full = expandStoryboard(spec);
  assert.equal(full[2].scene, own, 'a given scene must be used as is');
  for (const cam of ['wide', 'close', 'left', 'right']) {
    const s = expandStoryboard({ shots: [{ prop: 'dove', text: 'Hi', camera: cam }] })[0].scene.elements.find((e) => e.type === 'prop');
    assert.ok(s && Number.isFinite(s.x) && Number.isFinite(s.size), `camera ${cam} gives bad prop numbers`);
  }
  const left = full[1].scene.elements.filter((e) => e.type === 'prop'), solo = expandStoryboard({ shots: [{ prop: 'phone', camera: 'left', text: 'x' }] })[0].scene.elements.find((e) => e.type === 'prop');
  assert.ok(solo.x < 640, 'camera left puts the prop on the left half');
  assert.ok(true, 'camera left puts the prop on the left half');
  assert.ok(left.length === 2, 'props list gives one prop each');
  assert.deepEqual(full.warnings, []);

  // unknown prop: a warning, never a throw, and the frame still renders
  const unk = expandStoryboard({ shots: [{ id: 'x', prop: 'zzz-no-such-prop', text: 'Hello' }, { id: 'y', props: ['dove', 'zzz-also-nope'] }] });
  assert.equal(unk.length, 2);
  assert.ok(unk[0].warnings.length === 1 && /zzz-no-such-prop/.test(unk[0].warnings[0]), 'unknown prop did not warn');
  assert.ok(unk.warnings.length === 2, 'array warnings missing');
  assert.ok(unk[0].scene.elements.length > 0 && !unk[0].scene.elements.some((e) => e.type === 'prop'), 'placeholder expected');
  assert.ok(unk[1].scene.elements.some((e) => e.type === 'prop' && e.name === 'dove'), 'known prop beside an unknown one was dropped');

  // timecodes
  assert.equal(timecode(0), '00:00');
  assert.equal(timecode(65), '01:05');
  assert.equal(timecode(3.5), '00:03.5');

  // render: dimensions, determinism, shots.json
  const opts = { frameWidth: 160, columns: 2 };
  const t0 = Date.now();
  const a = await renderStoryboard(spec, join(dir, 'a.png'), { ...opts, framesDir: join(dir, 'frames') });
  const b = await renderStoryboard(spec, null, opts);
  assert.ok(a.png.equals(b.png), 'same spec renders different bytes');
  const two = { ...spec, shots: spec.shots.slice(0, 2) }; // a fresh draw (no frame cache) must give the same bytes as the cached one
  assert.ok((await renderStoryboard(two, null, opts)).png.equals((await renderStoryboard(two, null, { ...opts, cache: false })).png), 'fresh draw differs from the cached frames');
  const meta = await sharp(a.png).metadata();
  assert.equal(meta.width, a.width);
  assert.equal(meta.height, a.height);
  assert.ok(a.width >= 2 * 160 && a.width <= 2 * 160 + 200, `sheet width ${a.width} does not hold two 160 px columns`);
  const one = await renderStoryboard({ ...spec, shots: spec.shots.slice(0, 2) }, null, opts), four = a;
  assert.ok(four.height > one.height, 'more rows must make a taller sheet');
  assert.equal(a.total, 8.5);
  assert.equal(a.shots.length, 4);
  assert.equal(a.warnings.length, 0);
  const wide = await renderStoryboard(spec, null, { frameWidth: 160, columns: 4 });
  assert.ok(wide.width > a.width && wide.height < a.height, 'columns option ignored');
  const files = readdirSync(join(dir, 'frames')).sort();
  assert.deepEqual(files, ['shot-01.png', 'shot-02.png', 'shot-03.png', 'shot-04.png', 'shots.json']);
  const m1 = await sharp(join(dir, 'frames', 'shot-01.png')).metadata();
  assert.equal(`${m1.width}x${m1.height}`, '480x270', 'frames are written at the storyboard size, not the thumbnail size');
  const list = JSON.parse(readFileSync(join(dir, 'frames', 'shots.json'), 'utf8'));
  assert.deepEqual(list.map((s) => s.id), ['one', 'two', 'three', 'four']);
  assert.deepEqual(list.map((s) => s.start), [0, 2, 5.5, 6.5], 'running start times');
  assert.deepEqual(list.map((s) => s.duration), [2, 3.5, 1, 2]);
  assert.deepEqual(list.map((s) => s.file), ['shot-01.png', 'shot-02.png', 'shot-03.png', 'shot-04.png']);
  assert.equal(list[0].title, 'Fincan');
  assert.equal(list[0].note, 'Yakın plan, buhar. Ses: kaşık.');
  assert.equal(JSON.stringify(Object.keys(list[0])), JSON.stringify(['id', 'title', 'note', 'duration', 'start', 'file']));

  // edge values must not break the sheet: long text, one shot, a bare shotlist, unknown everything
  const edge = await renderStoryboard({ title: 'x '.repeat(80), format: [240, 135], shots: [{ title: 'Very long title '.repeat(10), note: 'word '.repeat(300), text: 'on screen '.repeat(30), prop: 'dove', camera: 'sideways' }, { prop: 'zzz' }, {}, 'just a string'] }, null, opts);
  assert.ok(edge.png.length > 5000 && !bad(JSON.stringify(edge.shots)));
  assert.ok(edge.warnings.length >= 2);
  const solo2 = await renderStoryboard({ format: [240, 135], shots: [{ id: 'a', desc: 'A single shot', frames: 24 }] }, null, opts);
  assert.equal(solo2.shots.length, 1);

  console.log(`ok storyboard: bare/full/unknown shapes, determinism, ${a.width}x${a.height} sheet, shots.json, timecodes (${Date.now() - t0} ms)`);
} finally {
  rmSync(dir, { recursive: true, force: true });
}
