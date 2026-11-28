// animate: the frame plan closes its loop, frames are deterministic, files really hold N frames, still scenes say so.
// Usage: node test/animate.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { animate, renderFrames, framePlan, frameStrip } from '../src/index.mjs';

const moving = { seed: 4, elements: [{ type: 'cloud', x: 300, y: 200, size: 200, drift: 40 }, { type: 'flag', x: 700, y: 260, w: 220, h: 120 }] };
const still = { seed: 4, elements: [{ type: 'panel', x: 100, y: 100, w: 400, h: 300, color: 'blue' }] };

// plan: t = i / frames (never 1, so the frame after the last is the first); boil textures take turns
const plan = framePlan({ seed: 9 }, { frames: 8, fps: 12, boil: 3 });
assert.equal(plan.length, 8);
assert.equal(plan[0].t, 0);
assert.equal(plan[7].t, 7 / 8);
assert.deepEqual([...new Set(plan.map((p) => p.boil))], [9, 10, 11]);
assert.equal(framePlan({}, { frames: 4 })[0].boil, undefined); // steady paper unless asked
assert.equal(framePlan({}, { frames: 1e9 }).length, 240); // silly values are clamped
assert.equal(framePlan({}, { frames: 'x', fps: NaN, boil: -3 }).length, 24);

const dir = mkdtempSync(join(tmpdir(), 'levni-animate-'));
try {
  for (const ext of ['gif', 'webp']) {
    const out = join(dir, `loop.${ext}`);
    const r = await animate(moving, out, { frames: 4, width: 300 });
    const meta = await sharp(out, { animated: true }).metadata();
    assert.equal(meta.pages, 4, `${ext}: 4 frames in the file`);
    assert.equal(meta.width, 300);
    assert.equal(meta.loop, 0, `${ext}: loops forever`);
    assert.ok(meta.delay.length === 4 && meta.delay.every((d) => Math.abs(d - 83) <= 4), `${ext}: 12 fps (GIF rounds to 1/100 s)`);
    assert.equal(r.moving, true);
    assert.equal(r.frames, 4);
    assert.ok(r.bytes > 1000);
  }
  // same scene, same frames
  const a = await renderFrames(moving, { frames: 3, width: 200 }), b = await renderFrames(moving, { frames: 3, width: 200 });
  a.frames.forEach((f, i) => assert.ok(f.equals(b.frames[i]), `frame ${i} is deterministic`));
  assert.ok(!a.frames[0].equals(a.frames[1]), 'frames differ over t');
  // a still scene is drawn once and reported
  const s = await renderFrames(still, { frames: 6, width: 200 });
  assert.equal(s.moving, false);
  assert.equal(s.distinct, 1);
  assert.ok(s.notes.some((n) => n.startsWith('animation:')));
  // boil alone makes a still scene shimmer
  assert.equal((await renderFrames(still, { frames: 6, boil: 3, width: 200 })).distinct, 3);
  // the strip is one PNG of evenly spaced frames
  const strip = await sharp(await frameStrip(a.frames, { count: 3, width: 100 })).metadata();
  assert.equal(strip.width, 3 * 100 + 4 * 8);
  await assert.rejects(() => animate(moving, join(dir, 'x.png')), /\.gif or \.webp/);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log('animate: plan, gif/webp output, determinism and still-scene note ok');
