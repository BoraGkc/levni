// motion: presets are pure functions of t, loops close, entrances hold, typewriter keeps its size, stills are untouched.
// Usage: node test/motion.mjs
import assert from 'node:assert/strict';
import { compose } from '../src/index.mjs';
import { applyMotion, typedElement, cameraTransform, motionList, ease, EASE, MOTIONS } from '../src/motion.mjs';
import { layoutType } from '../src/type.mjs';
import { bannerScene } from '../src/banner.mjs';
import { encodeGif } from '../src/gif.mjs';

const box = [100, 100, 200, 100], g = '<path d="M0 0"/>';
// easing: every curve starts at 0 and ends at 1, and input is clamped
for (const [name, fn] of Object.entries(EASE)) { assert.ok(Math.abs(fn(0)) < 1e-9, `${name}(0)`); assert.ok(Math.abs(fn(1) - 1) < 1e-9, `${name}(1)`); }
assert.equal(ease('nope', 2), 1);
// shorthand forms; unknown types are dropped, not thrown
assert.deepEqual(motionList('float'), [{ type: 'float' }]);
assert.equal(motionList(['pop', { type: 'sway' }, 'nonsense', null]).length, 2);
assert.equal(applyMotion(g, 'nonsense', 0.3, box), g);
// loops: t = 0 and t = 1 give the same transform, and the middle differs
for (const type of ['float', 'drift', 'sway', 'wiggle', 'pulse', 'spin', 'orbit', 'blink']) {
  const at = (t) => applyMotion(g, { type, turns: 1.4 /* rounded to whole turns */ }, t, box);
  assert.equal(at(0), at(1), `${type} closes its loop`);
  assert.notEqual(at(0.3), at(0), `${type} moves`);
  assert.equal(at(0.3), at(0.3), `${type} is deterministic`);
}
// entrances: nothing before the delay, the finished element afterwards
for (const type of ['pop', 'fade', 'slide', 'wipe']) {
  const m = { type, delay: 0.2, dur: 0.2 };
  assert.equal(applyMotion(g, m, 0.1, box), '', `${type} is hidden before its delay`);
  assert.ok(applyMotion(g, m, 0.3, box).includes(g), `${type} draws while entering`);
  assert.equal(applyMotion(g, m, 0.9, box), g, `${type} holds untouched`);
  assert.equal(applyMotion(g, { ...m, out: true }, 1, box), '', `${type} with out leaves at the end`);
}
// stagger delays the next element
assert.equal(applyMotion(g, { type: 'fade', dur: 0.1 }, 0.05, box, { index: 3, stagger: 0.1 }), '');
// typewriter: text grows, nothing before the delay (cursor off), the full text at the end without a cursor
const e = { type: 'type', text: 'Levni', motion: { type: 'typewriter', delay: 0.2, dur: 0.4, cursor: false } };
assert.equal(typedElement(e, 0.1), null);
assert.equal(typedElement(e, 0.4).text, 'Lev');
assert.equal(typedElement(e, 0.9).text, 'Levni');
assert.equal(typedElement({ ...e, motion: 'float' }, 0.4).text, 'Levni');
// a fitted headline keeps the size of its finished text while it is typed
const fit = { text: 'Levni', w: 600, h: 200, fit: 'box', font: 'black' };
assert.equal(layoutType({ ...fit, text: 'Le', _typed: 'Levni' }).size, layoutType(fit).size);
// camera: out and back by default, one way with once
const cv = { w: 1200, h: 673 };
assert.equal(cameraTransform({ zoom: 1.2 }, 0, cv), '');
assert.equal(cameraTransform({ zoom: 1.2 }, 0, cv), cameraTransform({ zoom: 1.2 }, 1, cv));
assert.match(cameraTransform({ zoom: 1.2 }, 0.5, cv), /scale\(1\.2\)/);
assert.match(cameraTransform({ zoom: [1, 1.2], once: true }, 1, cv), /scale\(1\.2\)/);
assert.equal(cameraTransform(null, 0.5, cv), '');

// in a scene: motion changes frames, a scene without motion is byte-identical to before, silly values do not throw
const scene = (extra = {}) => ({ seed: 3, elements: [{ type: 'panel', x: 100, y: 100, w: 400, h: 300, color: 'blue', ...extra }, { type: 'label', text: 'hello', x: 120, y: 500, ...(extra.motion ? { motion: 'wipe' } : {}) }] });
const still = (await compose(scene())).svg;
assert.equal((await compose({ ...scene(), t: 0.4 })).svg, still, 'no motion: t changes nothing');
const a = (await compose({ ...scene({ motion: 'float' }), t: 0.25 })).svg, b = (await compose({ ...scene({ motion: 'float' }), t: 0.25 })).svg;
assert.equal(a, b);
assert.notEqual(a, still);
for (const motion of [{ type: 'float', amp: NaN, turns: -3, phase: 'x' }, { type: 'pop', delay: Infinity, dur: 0 }, [[]], 42, { type: 'wipe', from: 'sideways' }]) {
  const { svg } = await compose({ ...scene({ motion }), t: 0.5, stagger: 'x', camera: { zoom: ['a', NaN] } });
  assert.ok(!/NaN|undefined|Infinity/.test(svg), `no NaN for ${JSON.stringify(motion)}`);
}
// draw: nothing at the start, part of the line midway, the finished drawing (byte-identical to a still) at the end
{
  const d = (t, type) => compose({ seed: 4, t, elements: [{ type: 'prop', name: 'lighthouse', x: 600, y: 336, size: 400, shadow: true, motion: { type, delay: 0.1, dur: 0.4 } }] });
  const still = (await compose({ seed: 4, elements: [{ type: 'prop', name: 'lighthouse', x: 600, y: 336, size: 400, shadow: true }] })).svg;
  for (const type of ['draw', 'print']) {
    const a = (await d(0.05, type)).svg, m = (await d(0.3, type)).svg, z = (await d(0.9, type)).svg;
    assert.ok(a.length < m.length && m.length < z.length * 1.5, `${type}: grows from empty`);
    assert.notEqual(m, z, `${type}: midway differs from the end`);
    const flat = (x) => x.replace(/>\s+</g, "><"); // a moving element is joined without the newlines between its parts
    assert.equal(flat(z), flat(still), `${type}: ends as the still drawing`);
  }
}
// a seal's centre drawing moves with the seal: before a pop begins neither is drawn
const sealScene = (t) => compose({ seed: 2, t, elements: [{ type: 'seal', x: 600, y: 336, size: 300, text: 'OPEN SOURCE', prop: 'rocket', motion: { type: 'pop', delay: 0.5, dur: 0.2 } }] });
const hidden = (await sealScene(0.1)).svg, shown = (await sealScene(0.9)).svg, plain = (await compose({ seed: 2, elements: [{ type: 'seal', x: 600, y: 336, size: 300, text: 'OPEN SOURCE', prop: 'rocket' }] })).svg;
assert.ok(hidden.length < shown.length * 0.5, 'seal and its centre prop are both hidden before the pop');
assert.equal(shown, plain, 'and both are back, untouched, once it has arrived');
// the banner: a still by default, a loop with motion
const repo = { owner: 'levni-dev', name: 'levni', description: 'Design engine for agents.', mark: 'rocket' };
assert.ok(!JSON.stringify(bannerScene(repo)).includes('motion'));
const mb = bannerScene({ ...repo, motion: true });
assert.notEqual((await compose({ ...mb, t: 0.1 })).svg, (await compose({ ...mb, t: 0.6 })).svg);

// gif encoder: header, size, loop block, frame count; a frame equal to the last one costs a few bytes
const W = 16, H = 8, px = (r, gg, bb) => { const f = new Uint8Array(W * H * 4); for (let i = 0; i < f.length; i += 4) { f[i] = r; f[i + 1] = gg; f[i + 2] = bb; f[i + 3] = 255; } return f; };
const red = px(200, 30, 30), blue = px(20, 40, 200), half = px(200, 30, 30); half.set(blue.subarray(0, W * 4 * 4), 0);
const gif = encodeGif([red, half, half, blue], W, H, { delay: 100, loop: 0 });
assert.equal(String.fromCharCode(...gif.subarray(0, 6)), 'GIF89a');
assert.equal(gif[6] | (gif[7] << 8), W); assert.equal(gif[8] | (gif[9] << 8), H);
assert.equal(gif.at(-1), 0x3b);
assert.ok(String.fromCharCode(...gif).includes('NETSCAPE2.0'));
let frames = 0; for (let i = 0; i < gif.length - 1; i++) if (gif[i] === 0x21 && gif[i + 1] === 0xf9 && gif[i + 2] === 4) frames++;
assert.equal(frames, 4);
assert.ok(encodeGif([red, red, red, red], W, H).length < gif.length, 'still frames are nearly free');
assert.throws(() => encodeGif([], W, H));
console.log(`motion: ${MOTIONS.length} presets, ${Object.keys(EASE).length} easings, camera, typewriter, banner loop and gif encoder ok`);
