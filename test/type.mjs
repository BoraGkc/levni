// type and block: fonts load, Turkish casing, fitting, alignment, rotation, determinism, silly inputs.
import assert from 'node:assert/strict';
import { compose } from '../src/index.mjs';
import { layoutType, FONTS } from '../src/type.mjs';

for (const f of Object.keys(FONTS)) {
  const l = layoutType({ text: 'Ağ IĞDIR şişli ÇÖÜ', font: f, size: 40 });
  assert.ok(l.d.length > 200, `${f} draws`);
  assert.doesNotMatch(l.d, /NaN|undefined|Infinity/, f);
}
// Turkish upper case: i -> İ
assert.notEqual(layoutType({ text: 'şişli', upper: true }).d, layoutType({ text: 'SISLI' }).d);
// fit to width
const fit = layoutType({ text: 'BRIDGE.', w: 800, font: 'pixel' });
assert.ok(Math.abs(fit.w - 800) < 1 && fit.size > 100);
// anchors: right-aligned without a box shifts left by the width
const r = layoutType({ text: 'NT5642', size: 20, align: 'right' });
assert.ok(r.shift < 0);
// bold runs change the drawing
assert.notEqual(layoutType({ text: 'SMART**CONTRACTS**' }).d, layoutType({ text: 'SMARTCONTRACTS' }).d);

const els = [
  { type: 'type', text: 'Hello\nworld', x: 60, y: 100, size: 90 },
  { type: 'type', text: 'YOU. TURN.', x: 1100, y: 1000, size: 110, font: 'black', rotate: -90 },
  { type: 'type', text: '', x: 0, y: 0 },
  { type: 'type', text: 'x'.repeat(5000), x: 0, y: 0, size: 1e9, tracking: 'a', leading: -4 },
  { type: 'block', x: 0, y: 0, w: 300, h: 120, corners: [60, 0, 0, 60], skew: 12 },
  { type: 'block', x: 0, y: 0, w: -5, h: 'x', radius: 1e6 },
];
for (const e of els) {
  const a = (await compose({ format: 'poster', finish: 'soft', elements: [e] })).svg;
  assert.doesNotMatch(a, /NaN|undefined|Infinity/, JSON.stringify(e).slice(0, 80));
  assert.equal(a, (await compose({ format: 'poster', finish: 'soft', elements: [e] })).svg);
}
await assert.rejects(() => compose({ elements: [{ type: 'type', text: 'x', font: 'nope' }] }), /unknown font/);
console.log('type ok');
