// diff: added, removed and changed elements are found, moves are not mistaken for changes, scene fields are listed.
// Usage: node test/diff.mjs
import assert from 'node:assert/strict';
import { sceneDiff } from '../src/index.mjs';

const a = { seed: 1, background: 'paper', elements: [
  { type: 'prop', name: 'rocket', x: 600, y: 300, size: 300 },
  { type: 'type', text: 'Hello', x: 80, y: 100, size: 60 },
  { type: 'disc', x: 600, y: 300, r: 120, color: 'mustard' },
] };
const b = { seed: 1, background: 'blue', credits: [{ by: 'Ada' }], elements: [
  { type: 'disc', x: 600, y: 300, r: 140, color: 'mustard' },
  { type: 'prop', name: 'rocket', x: 640, y: 300, size: 300 },
  { type: 'label', text: 'new', x: 80, y: 600 },
] };
const d = sceneDiff(a, b);
assert.deepEqual(d.scene.map((c) => c.key), ['background'], 'credits are not a change');
assert.deepEqual(d.summary, { added: 1, removed: 1, changed: 2, same: 0, scene: 1 });
const rocket = d.elements.find((r) => r.label === 'rocket');
assert.deepEqual(rocket.changes, [{ key: 'x', from: 600, to: 640 }], 'the rocket moved, matched by name across a reorder');
assert.equal(d.elements.find((r) => r.type === 'type').status, 'removed');
assert.equal(d.elements.find((r) => r.type === 'label').status, 'added');
assert.equal(sceneDiff(a, a).summary.changed, 0);
assert.deepEqual(sceneDiff(null, { elements: [{ type: 'disc' }] }).summary.added, 1);
console.log('diff: added, removed, changed, moved and scene fields ok');
