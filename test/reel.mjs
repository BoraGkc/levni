// reel: clips join with each transition, lengths add up, outputs are valid, bad specs fail clearly.
// Usage: node test/reel.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { reelFrames, renderReel, TRANSITIONS } from '../src/index.mjs';

const clips = [{ shot: 'mark-float', fields: { title: 'A' }, seconds: 1 }, { shot: 'error-wiggle', fields: { title: 'B' }, seconds: 1 }];
for (const transition of TRANSITIONS) {
  const r = await reelFrames({ format: 'square', fps: 8, width: 96, transition, transitionSeconds: 0.25, clips });
  const overlap = transition === 'cut' ? 0 : 2;
  assert.equal(r.frames.length, 16 - overlap, `${transition}: clips overlap by the transition`);
  assert.equal(r.width, 96);
  if (transition !== 'cut') assert.ok(!r.frames[7].equals(r.frames[6]), `${transition}: the transition frames change`);
}
const dir = mkdtempSync(join(tmpdir(), 'levni-reel-'));
try {
  const r = await renderReel({ format: 'square', fps: 6, width: 80, clips: [...clips, { scene: { elements: [{ type: 'disc', x: 600, y: 336, r: 200, color: 'coral', motion: 'pulse' }] }, seconds: 0.5, transition: 'iris' }] }, join(dir, 'r.gif'));
  const meta = await sharp(join(dir, 'r.gif'), { animated: true }).metadata();
  assert.equal(meta.pages, r.frames, 'every frame is in the GIF');
  assert.ok(r.seconds > 1.5 && r.seconds < 2.5, `about 2.5 s minus the overlaps: ${r.seconds}`);
  await assert.rejects(() => renderReel({ clips }, join(dir, 'r.png')), /\.mp4, \.gif or \.webp/);
  await assert.rejects(() => reelFrames({ clips: [] }), /no clips/);
} finally { rmSync(dir, { recursive: true, force: true }); }
console.log(`reel: ${TRANSITIONS.length} transitions, lengths, gif output and errors ok`);
