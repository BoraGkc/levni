// Prop names: aliases resolve old names, brand names are refused, the JSON schema stays in step with the validator.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addPropDir, findProp } from '../src/props.mjs';
import { validateProp, lintProp, CATEGORIES } from '../src/validate.mjs';
import { COLORS } from '../src/compose.mjs';

const paths = [{ d: 'M20 20 L80 80', stroke: 'ink', weight: 9 }, { d: 'M20 80 L80 20', stroke: 'ink', weight: 9 }];
const ok = { name: 'test-kettle', aliases: ['test-teapot-old'], tags: ['test-kettle-tag'], category: 'home', variants: [{ paths }] };

assert.deepEqual(validateProp(ok), []);
assert.match(validateProp({ ...ok, aliases: 'x' }).join(), /aliases must be an array/);
assert.match(validateProp({ ...ok, aliases: ['test-kettle'] }).join(), /not the current name/);
assert.match(validateProp({ ...ok, aliases: ['Bad Name'] }).join(), /alias "Bad Name"/);
assert.match(validateProp({ ...ok, name: 'youtube-play' }).join(), /brand name "YouTube"/);
assert.match(validateProp({ ...ok, aliases: ['instagram-camera'] }).join(), /brand name "Instagram"/);
assert.deepEqual(validateProp({ ...ok, tags: ['tiktok'] }), [], 'tags may mention a brand');
assert.deepEqual(validateProp({ ...ok, name: 'apple' }), [], 'everyday words are not brands');

// tags: lowercase, no duplicates, at least one (Turkish capitals count as capitals)
assert.match(validateProp({ ...ok, tags: ['İstanbul'] }).join(), /must be lowercase/);
assert.match(validateProp({ ...ok, tags: ['çay', 'çay'] }).join(), /listed twice/);
assert.match(validateProp({ ...ok, tags: [] }).join(), /at least one/);
// style hints from docs/folio-guide.md
const good = { ...ok, tags: ['kettle', 'tea', 'çay', 'mutfak'], variants: [{ note: 'side view, spout to the right', paths }] };
assert.deepEqual(lintProp(good), []);
const hints = lintProp({ ...good, name: 'book-2', tags: ['book-2', 'icon'], variants: [{ note: 'a book.', paths }] }).join('\n');
for (const re of [/repeat the name/, /only 2 tag/, /ends in a number/, /generic tags/, /final full stop/]) assert.match(hints, re);
assert.deepEqual(lintProp({ ...good, name: 'clock-3', variants: [{ note: 'hands at 3 o\'clock', paths }] }), [], 'a number the drawing shows is fine');

const dir = mkdtempSync(join(tmpdir(), 'levni-props-'));
writeFileSync(join(dir, 'test-kettle.json'), JSON.stringify(ok));
addPropDir(dir);
assert.equal(findProp('test-teapot-old')?.name, 'test-kettle', 'alias finds the renamed prop');
assert.equal(findProp('test-kettle-tag')?.name, 'test-kettle', 'tags still work');
assert.equal(findProp('test-kettle')?.name, 'test-kettle');

const schema = JSON.parse(readFileSync(new URL('../docs/prop.schema.json', import.meta.url), 'utf8'));
assert.deepEqual(schema.properties.category.enum, Object.keys(CATEGORIES), 'schema categories match the validator');
assert.deepEqual(schema.$defs.color.anyOf[0].enum, Object.keys(COLORS), 'schema colours match compose');

console.log('props: aliases, brand words and schema ok');
