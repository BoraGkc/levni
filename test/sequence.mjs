// sequence: frame files + manifest, sprite atlas json, transparent ground, tileCheck/tileable, mp4 (when ffmpeg exists).
// Usage: node test/sequence.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, existsSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { writeFrames, spriteSheet, toMp4, ffmpegAvailable, transparent, tileCheck, tileable } from '../src/sequence.mjs';
import { render } from '../src/index.mjs';
import { FORMATS } from '../src/formats.mjs';

const moving = { seed: 4, elements: [{ type: 'cloud', x: 300, y: 200, size: 200, drift: 40 }, { type: 'flag', x: 700, y: 260, w: 220, h: 120 }] };
const tex = { seed: 3, finish: 'soft', grain: 0, elements: [{ type: 'meshgrad', x: 0, y: 0, w: 1200, h: 673, base: '#101010', blur: 160, grain: 0, stops: [{ x: 0, y: 0.5, color: 'coral', r: 0.8 }, { x: 1, y: 0.5, color: 'blue', r: 0.8 }, { x: 0.5, y: 0, color: 'mustard', r: 0.6 }, { x: 0.5, y: 1, color: 'green', r: 0.6 }] }] };
const dir = mkdtempSync(join(tmpdir(), 'levni-seq-'));
try {
  // frames + manifest
  const m = await writeFrames(moving, join(dir, 'f'), { frames: 3, fps: 10, width: 200 });
  assert.deepEqual(m.files, ['frame-0001.png', 'frame-0002.png', 'frame-0003.png']);
  assert.equal(m.fps, 10); assert.equal(m.frames, 3); assert.equal(m.width, 200); assert.equal(m.loop, true);
  const disk = JSON.parse(readFileSync(join(dir, 'f', 'frames.json'), 'utf8'));
  assert.deepEqual(disk, m);
  const meta = await sharp(join(dir, 'f', m.files[2])).metadata();
  assert.equal(meta.width, 200); assert.equal(meta.height, m.height);

  // sprite sheet
  const out = join(dir, 'sheet.png');
  const j = await spriteSheet(moving, out, { frames: 5, width: 100, columns: 3 });
  const keys = Object.keys(j.frames);
  assert.equal(keys.length, 5);
  const sz = await sharp(out).metadata();
  assert.equal(sz.width, 3 * 100); assert.equal(sz.height, 2 * j.frames[keys[0]].frame.h);
  assert.deepEqual(j.meta.size, { w: sz.width, h: sz.height });
  assert.equal(j.meta.image, 'sheet.png');
  const f4 = j.frames[keys[4]];
  assert.deepEqual(f4.frame, { x: 100, y: f4.frame.h, w: 100, h: f4.frame.h });
  assert.equal(f4.rotated, false); assert.equal(f4.trimmed, false);
  assert.deepEqual(JSON.parse(readFileSync(`${out}.json`, 'utf8')), j);

  // transparent ground: corner alpha 0
  const tp = join(dir, 't.png');
  await render(transparent({ seed: 2, elements: [{ type: 'cloud', x: 600, y: 330, size: 200 }] }), tp);
  const px = await sharp(tp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(px.data[3], 0, 'top-left corner is transparent');
  assert.equal(px.data[px.data.length - 1], 0, 'bottom-right corner is transparent');
  assert.ok(px.data.some((v, i) => i % 4 === 3 && v > 200), 'the drawing itself is opaque');

  // tiling
  await render({ ...tex, canvas: [256, 256] }, join(dir, 'plain.png'));
  const plain = readFileSync(join(dir, 'plain.png'));
  const tiled = await tileable(tex, { size: 256 });
  assert.equal((await sharp(tiled).metadata()).width, 256);
  const a = await tileCheck(plain), b = await tileCheck(tiled);
  assert.ok(a.seamX > 1.5 || a.seamY > 1.5, `plain render shows a seam (${JSON.stringify(a)})`);
  console.log('tileCheck plain', JSON.stringify(a), 'tileable', JSON.stringify(b));
  assert.ok(b.seamX < 1.5 && b.seamY < 1.5, `tileable passes (${JSON.stringify(b)})`);

  // mp4
  if (ffmpegAvailable()) {
    const mp4 = join(dir, 'loop.mp4');
    const r = await toMp4(moving, mp4, { frames: 4, fps: 12, width: 201, loops: 2 });
    assert.ok(existsSync(mp4) && statSync(mp4).size > 500);
    assert.equal(r.width % 2, 0); assert.equal(r.frames, 8);
    assert.equal(readFileSync(mp4).subarray(4, 8).toString(), 'ftyp');
    console.log('mp4: exercised');
  } else console.log('mp4: SKIPPED (ffmpeg not on PATH; brew install ffmpeg)');
  assert.ok(FORMATS.hd && FORMATS.readme);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('sequence: frames, sprite sheet, transparent, tileable and mp4 ok');
