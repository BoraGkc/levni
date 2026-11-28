// separate: plates are found from the inks a scene uses, tints and overprints are read right, files are written.
// Usage: node test/separate.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { separate, findPlates } from '../src/index.mjs';

const dir = mkdtempSync(join(tmpdir(), 'levni-print-'));
try {
  // three flat inks plus a pale tint of one of them: three plates, the tint folds into its ink
  const scene = { seed: 2, finish: 'soft', grain: 0, background: 'paper', elements: [
    { type: 'panel', x: 40, y: 40, w: 300, h: 300, color: 'mustard' },
    { type: 'panel', x: 380, y: 40, w: 300, h: 300, color: 'tone-mustard' },
    { type: 'panel', x: 720, y: 40, w: 300, h: 300, color: 'coral' },
    { type: 'panel', x: 40, y: 380, w: 980, h: 200, color: 'blue' },
    { type: 'disc', x: 870, y: 190, r: 90, color: 'blue', motion: 'pop' }, // motion is dropped: the finished still is printed
  ] };
  const r = await separate(scene, dir, { scale: 0.5 });
  assert.deepEqual(r.plates.map((p) => p.ink), ['mustard', 'coral', 'blue'], 'lightest first, tint folded into mustard');
  for (const p of r.plates) assert.ok(existsSync(join(dir, p.file)), p.file);
  for (const f of ['proof.png', 'sheet.png', 'print.json']) assert.ok(existsSync(join(dir, f)), f);
  const man = JSON.parse(readFileSync(join(dir, 'print.json'), 'utf8'));
  assert.equal(man.plates.length, 3);
  assert.equal(man.paper, '#F4F2EC');
  // the tone-mustard panel is printed as mustard at part density: gray, not black, on the mustard plate
  const g = await sharp(join(dir, r.plates[0].file)).extractChannel(0).raw().toBuffer({ resolveWithObject: true });
  const at = (x, y) => g.data[Math.round(y * 0.5) * g.info.width + Math.round(x * 0.5)];
  assert.ok(at(190, 190) < 30, 'full mustard is near black');
  assert.ok(at(530, 190) > 60 && at(530, 190) < 230, `tone-mustard is a gray: ${at(530, 190)}`);
  assert.ok(at(870, 480) > 245, 'no mustard under the blue band');
  // the plate limit folds extra inks into the nearest plate
  const two = await separate(scene, null, { scale: 0.25, plates: 2 });
  assert.equal(two.plates.length, 2);
  // a halftone screen leaves only black and white
  const h = await separate(scene, join(dir, 'ht'), { scale: 0.5, halftone: 3 });
  const hg = await sharp(join(dir, 'ht', h.plates[0].file)).extractChannel(0).raw().toBuffer();
  assert.ok(hg.every((v) => v === 0 || v === 255), 'halftone plates are pure black and white');
  // all paper: a clear error
  await assert.rejects(() => separate({ background: 'paper', elements: [] }, null, { scale: 0.25 }), /no ink/);
  assert.equal(findPlates(new Uint8Array(16).fill(240)).plates.length, 0);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('separate: plates, tints, plate limit, halftone and manifest ok');
