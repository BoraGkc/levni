// Critic test: cuts are measured against the card (clip) or the canvas, and big cuts are reported too.
import assert from 'node:assert/strict';
import { compose, critique } from '../src/index.mjs';

const notes = async (scene) => critique((await compose(scene)).used);
const card = [60, 52, 1080, 569];

// a prop mostly off the card, still partly on the canvas
let n = await notes({ seed: 4, clip: card, elements: [{ type: 'prop', name: 'rocket', x: 1170, y: 120, size: 520 }] });
assert.ok(n.some((x) => /"rocket".*mostly outside the frame/.test(x)), n.join('\n'));

// the same cut, declared: no crop note
n = await notes({ seed: 4, clip: card, elements: [{ type: 'prop', name: 'rocket', x: 1170, y: 120, size: 520, crop: true }] });
assert.ok(!n.some((x) => /rocket/.test(x)), n.join('\n'));

// inside the canvas but past the card edge: still caught
n = await notes({ seed: 4, clip: card, elements: [{ type: 'prop', name: 'globe', x: 600, y: 600, size: 200 }] });
assert.ok(n.some((x) => /"globe".*frame/.test(x)), n.join('\n'));

// centred and whole: no frame notes
n = await notes({ seed: 4, clip: card, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 380 }] });
assert.ok(!n.some((x) => /frame|off the/.test(x)), n.join('\n'));

console.log('critic: frame and crop checks ok');
