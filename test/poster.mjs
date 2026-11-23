// poster series: every template composes clean and deterministic; inks, words, only/count, errors.
import assert from 'node:assert/strict';
import { compose, expandPosters, POSTER_TEMPLATES, renderPosters } from '../src/index.mjs';
import { brandInks } from '../src/poster.mjs';
import { mkdtempSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const brand = { name: 'Kumru', tagline: 'Slow coffee for fast mornings', mark: 'dove', inks: ['#14181F', '#1F3BE0', '#F0573A', '#F1EEE6'], words: ['Roast', 'Şişli'] };
const list = expandPosters({ brand });
assert.deepEqual(list.map((p) => p.template), POSTER_TEMPLATES);
for (const p of list) {
  const a = (await compose(p.scene)).svg;
  assert.doesNotMatch(a, /NaN|undefined|Infinity/, p.template);
  assert.equal(a, (await compose(p.scene)).svg, `${p.template} deterministic`);
}
assert.equal(expandPosters({ brand, only: ['map', 'echo'], count: 5 }).length, 5);
assert.equal(expandPosters({ brand: { name: 'X' } }).length, 8); // no mark, no inks: still works
const k = brandInks(['#EDE6D6', '#2E8B57', '#1B1A1F', '#F3A6B5']);
assert.equal(k.ink, '#1B1A1F'); assert.equal(k.paper, '#EDE6D6');
assert.throws(() => expandPosters({ brand: {} }), /name/);
assert.throws(() => expandPosters({ brand: { name: 'X', mark: 'no-such-prop' } }), /not a prop/);
assert.throws(() => expandPosters({ brand, only: ['nope'] }), /unknown templates/);
const dir = mkdtempSync(join(tmpdir(), 'levni-poster-'));
const r = await renderPosters({ brand, only: ['split', 'launch'] }, dir);
assert.equal(r.files.length, 2); assert.ok(existsSync(join(dir, 'series.png')));
rmSync(dir, { recursive: true });
console.log('poster ok');
