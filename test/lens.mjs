// lens: the glass pass changes only the pixels around the lens, moves with t, loops, scales with density, survives silly input.
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { lensRaster, resolveLens, lensList } from '../src/lens.mjs';

const W = 400, H = 300;
// a striped test card: vertical bars so refraction and colour fringes show
const raw = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 3, on = x % 20 < 4; raw[k] = on ? 140 : 12; raw[k + 1] = on ? 120 : 12; raw[k + 2] = on ? 255 : 14; }
const card = await sharp(raw, { raw: { width: W, height: H, channels: 3 } }).png().toBuffer();
const px = async (png) => (await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })).data;

const lens = { x: 200, y: 150, w: 240, h: 80, move: [0, 40] };
const base = await px(card), out = await px(await lensRaster(card, lens, 0));
const at = (b, x, y) => [0, 1, 2].map((c) => b[(y * W + x) * 3 + c]);
assert.deepEqual(at(out, 5, 5), at(base, 5, 5), 'far from the lens nothing changes');
let changed = 0;
for (let x = 90; x < 310; x++) if (at(out, x, 150).join() !== at(base, x, 150).join()) changed++;
assert.ok(changed > 150, 'the glass re-samples the pixels under it');
// colour fringes: somewhere near the rim red and blue disagree more than on the plain card
let fringe = 0;
for (let x = 82; x < 120; x++) { const [r, , b] = at(out, x, 150); fringe = Math.max(fringe, Math.abs(r - b)); }
assert.ok(fringe > 150, 'red and blue split at the rim');

// moves with t, and t = 1 is t = 0 (one sine cycle)
const a0 = await lensRaster(card, lens, 0), a1 = await lensRaster(card, lens, 1), aq = await lensRaster(card, lens, 0.25);
assert.ok((await px(a0)).equals(await px(a1)), 'the move loops');
assert.ok(!(await px(a0)).equals(await px(aq)), 'the lens moves with t');
assert.equal(Math.round(resolveLens(lens, 0.25).cy), 190);

// chrome (icon, label, kbd) is drawn on top
const chrome = await px(await lensRaster(card, { ...lens, icon: true, label: 'Stack', kbd: '⌘K' }, 0));
assert.ok(!chrome.equals(out), 'chrome adds pixels');

// density scale: a 2x frame gets the lens at 2x
const big = await sharp(card).resize(W * 2, H * 2).png().toBuffer();
const bigPx = await px(big), b2 = await px(await lensRaster(big, lens, 0, 2));
const at2 = (b, x, y) => [0, 1, 2].map((c) => b[(y * W * 2 + x) * 3 + c]).join();
assert.equal(at2(b2, 20, 20), at2(bigPx, 20, 20), 'outside stays the same at 2x');
let moved2 = 0;
for (let x = 300; x < 500; x++) if (at2(b2, x, 360) !== at2(bigPx, x, 360)) moved2++;
assert.ok(moved2 > 100, 'at 2x the lens covers twice the area (row y = 360 is inside)');

// no x / y: the lens sits on the canvas centre, whatever the canvas
assert.equal(resolveLens({}, 0, 400, 300).cx, 200);
assert.equal(resolveLens({}, 0, 1080, 1920).cy, 960);
// an explicit label size scales with the density: the 2x frame is the 1x frame, enlarged (compare a downscaled copy)
const chromeOf = async (k, img) => px(await lensRaster(img, { ...lens, label: { text: 'Stack', size: 30 } }, 0, k));
const one = await chromeOf(1, card), two = await sharp(await lensRaster(big, { ...lens, label: { text: 'Stack', size: 30 } }, 0, 2)).resize(W, H).removeAlpha().raw().toBuffer();
// measured over the label area: a correct 2x label differs by ~7, a label left at 1x size by ~26
let diff = 0, cnt = 0;
for (let y = 130; y < 170; y++) for (let x = 110; x < 290; x++) for (let c = 0; c < 3; c++) { const i = (y * W + x) * 3 + c; diff += Math.abs(one[i] - two[i]); cnt++; }
assert.ok(diff / cnt < 15, `2x chrome matches 1x (mean diff ${(diff / cnt).toFixed(1)} in the label area)`);


assert.equal(lensList(null).length, 0);
assert.equal(lensList([{}, null, 5, {}]).length, 2);
for (const l of [{}, { shape: 'circle', w: 1e9 }, { shape: 'rect', radius: -4, blur: 3 }, { x: 'a', y: NaN, w: -5, zoom: 99, bend: 1e9, aberration: -1, move: ['x', 1e9] }, { x: -5000 }]) {
  const o = await lensRaster(card, l, 0.3);
  const m = await sharp(o).metadata();
  assert.equal(m.width, W, JSON.stringify(l));
}
assert.equal(await lensRaster(card, null), card, 'no lens returns the input');
console.log('lens ok');
