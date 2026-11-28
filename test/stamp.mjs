// stamp: a PNG carries its scene, survives a round trip, keeps its remix chain, and stays a valid PNG.
// Usage: node test/stamp.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { render, stampPng, readStamp, remix } from '../src/index.mjs';

const dir = mkdtempSync(join(tmpdir(), 'levni-stamp-'));
try {
  const scene = { seed: 3, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 300 }, { type: 'label', text: 'Ölçü ığdır şşş', x: 80, y: 80 }] };
  await render(scene, join(dir, 'a.png'));
  const png = readFileSync(join(dir, 'a.png'));
  const got = readStamp(png);
  assert.deepEqual(got.scene, scene, 'the scene comes back exactly, Turkish letters included');
  const meta = await sharp(png).metadata();
  assert.equal(meta.width, 1200, 'still a valid PNG');
  // a second stamp replaces the first, it does not pile up
  const twice = stampPng(stampPng(png, { ...scene, seed: 9 }), { ...scene, seed: 10 });
  assert.equal(readStamp(twice).scene.seed, 10);
  assert.equal((new TextDecoder('latin1').decode(twice).match(/levni\0/g) || []).length, 1);
  // remix chain grows by one link each time, keeps the order, and never edits the drawing
  const r1 = remix(scene, { by: 'Ada', from: 'levni.dev/gallery', at: '2026-11-28' });
  const r2 = remix(r1, { by: 'Bora', at: '2026-11-29' });
  assert.deepEqual(r2.credits.map((c) => c.by), ['Ada', 'Bora']);
  assert.deepEqual(r2.elements, scene.elements);
  assert.equal(scene.credits, undefined, 'the original is not changed');
  // render with stamp: false writes a plain PNG; non-PNG input is refused; a plain PNG reads as null
  await render(scene, join(dir, 'b.png'), { stamp: false });
  assert.equal(readStamp(readFileSync(join(dir, 'b.png'))), null);
  assert.throws(() => stampPng(new Uint8Array([1, 2, 3]), scene), /not a PNG/);
  assert.equal(readStamp(new Uint8Array(4)), null);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('stamp: round trip, replace, remix chain, plain PNG and bad input ok');
