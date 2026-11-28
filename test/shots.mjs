// shots: every shot draws in every format, moves, takes its fields and inks, and rejects an unknown name.
// Usage: node test/shots.mjs
import assert from 'node:assert/strict';
import { compose, shotScene, SHOTS } from '../src/index.mjs';

assert.ok(SHOTS.length >= 25);
for (const s of SHOTS) for (const format of ['cover', 'square', 'story', 'youtube']) {
  const scene = shotScene(s.id, { format });
  const a = (await compose({ ...scene, t: 0.15 })).svg, b = (await compose({ ...scene, t: 0.7 })).svg;
  assert.ok(!/NaN|undefined|Infinity/.test(b), `${s.id} ${format}: clean SVG`);
  assert.notEqual(a, b, `${s.id} ${format}: moves`);
}
const sc = shotScene('typed-headline', { title: 'Merhaba dünya', mark: 'cat', inks: ['#123456', '#ABCDEF'] });
assert.ok(JSON.stringify(sc).includes('Merhaba dünya'));
assert.ok(sc.elements.some((e) => e.name === 'cat'));
assert.deepEqual(sc.style, { blue: '#123456', coral: '#ABCDEF' });
assert.equal(shotScene('typed-headline', { inks: ['nope'] }).style, undefined, 'bad hex is ignored');
assert.equal(shotScene('list-stagger', { items: ['a', 'b'] }).elements.filter((e) => e.text === 'a' || e.text === 'b').length, 2);
assert.throws(() => shotScene('nope'), /unknown shot/);
console.log(`shots: ${SHOTS.length} shots x 4 formats draw and move; fields, inks and errors ok`);
