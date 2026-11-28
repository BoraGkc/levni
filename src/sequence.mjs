// Export extras: frame sequences, sprite sheets, MP4, transparent grounds, tileable textures.
//   import { writeFrames, spriteSheet, toMp4, transparent, tileable, tileCheck } from './sequence.mjs';
// Frames come from renderFrames() (same loop plan as animate): frame i is drawn at t = i / frames.
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import sharp from 'sharp';
import { renderFrames } from './animate.mjs';
import { compose } from './compose.mjs';
import { rasterize } from './raster.mjs';

/**
 * Write frame-0001.png ... and frames.json for Remotion's <Img src={staticFile(...)}> or any encoder.
 * Returns the manifest { fps, frames, width, height, loop: true, files }.
 */
export async function writeFrames(spec, dir, opts = {}) {
  const { prefix = 'frame-' } = opts;
  const r = await renderFrames(spec, opts);
  mkdirSync(dir, { recursive: true });
  const pad = Math.max(4, String(r.frames.length).length);
  const files = r.frames.map((buf, i) => {
    const name = `${prefix}${String(i + 1).padStart(pad, '0')}.png`;
    writeFileSync(join(dir, name), buf);
    return name;
  });
  const manifest = { fps: Math.round(1000 / r.delay), frames: r.frames.length, width: r.width, height: r.height, loop: true, files };
  writeFileSync(join(dir, 'frames.json'), JSON.stringify(manifest, null, 2));
  return manifest;
}

/**
 * One PNG atlas of all frames in a grid, plus <out>.json next to it in the TexturePacker "JSON hash" layout
 * (frames keyed by file name, each { frame {x,y,w,h}, rotated, trimmed, spriteSourceSize, sourceSize }, and a meta block).
 * Phaser loads this layout with load.atlas() ("JSON Hash or JSON Array format"):
 *   https://docs.phaser.io/api-documentation/class/loader-loaderplugin
 * The per-frame field names follow TexturePacker's export (https://www.codeandweb.com/texturepacker); the official
 * Phaser/Pixi pages fetched did not spell the field names out, so they are from the TexturePacker layout, not re-verified there.
 * Returns the JSON object. `columns` defaults to ceil(sqrt(frames)).
 */
export async function spriteSheet(spec, out, opts = {}) {
  if (!/\.png$/i.test(String(out))) throw new Error('spriteSheet: out must end in .png');
  const r = await renderFrames(spec, opts);
  const n = r.frames.length, w = r.width, h = r.height;
  const cols = Math.min(n, Math.max(1, Math.round(opts.columns ?? Math.ceil(Math.sqrt(n))))), rows = Math.ceil(n / cols);
  const base = String(out).split('/').pop();
  const frames = {};
  r.frames.forEach((_, i) => {
    frames[`frame-${String(i + 1).padStart(4, '0')}`] = {
      frame: { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h },
      rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w, h },
      sourceSize: { w, h },
    };
  });
  const sheet = await sharp({ create: { width: cols * w, height: rows * h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(r.frames.map((input, i) => ({ input, left: (i % cols) * w, top: Math.floor(i / cols) * h }))).png().toBuffer();
  writeFileSync(out, sheet);
  const json = { frames, meta: { app: 'levni', version: '1', image: base, format: 'RGBA8888', size: { w: cols * w, h: rows * h }, scale: '1', fps: Math.round(1000 / r.delay) } };
  writeFileSync(`${out}.json`, JSON.stringify(json, null, 2));
  return json;
}

export function ffmpegAvailable() {
  try { return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0; } catch { return false; }
}

/** Pipe PNG frames to ffmpeg: H.264, yuv420p, even dimensions, +faststart. `loops` repeats the loop. */
export async function toMp4(spec, out, opts = {}) {
  if (!/\.mp4$/i.test(String(out))) throw new Error('toMp4: out must end in .mp4');
  if (!ffmpegAvailable()) throw new Error('toMp4: ffmpeg was not found on PATH. Install it (macOS: `brew install ffmpeg`) and try again.');
  const r = await renderFrames(spec, opts);
  const fps = Math.round(1000 / r.delay);
  const loops = Math.min(1000, Math.max(1, Math.round(Number(opts.loops) || 1)));
  const crf = Math.min(51, Math.max(0, Math.round(Number(opts.crf ?? 20))));
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', 'pipe:0',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(crf), '-movflags', '+faststart', String(out)];
  const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
  let err = '';
  p.stderr.on('data', (d) => { err += d; });
  const done = new Promise((resolve, reject) => {
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`toMp4: ffmpeg exited with ${code}: ${err.trim().slice(0, 400)}`))));
  });
  p.stdin.on('error', () => {}); // ffmpeg failure surfaces through `done`
  for (let l = 0; l < loops; l++) for (const f of r.frames) if (!p.stdin.write(f)) await new Promise((res) => p.stdin.once('drain', res));
  p.stdin.end();
  await done;
  return { frames: r.frames.length * loops, fps, width: r.width - (r.width % 2), height: r.height - (r.height % 2) };
}

/**
 * A copy of the scene that renders on a transparent ground. What makes the empty area transparent today:
 *  - `background: "none"` (the ground rect is drawn with fill="none"),
 *  - `finish: "soft"` (its only extra layer is a film grain, whose opacity is `grain`: 0 switches it off),
 *  - `grain: 0`.
 * The default crayon finish cannot be fully transparent: it always lays a faint paper-noise layer (about 6 % alpha)
 * over the whole canvas, so the empty area is nearly, not exactly, clear. transparent() therefore switches to soft.
 * Do not combine with `screen` (the print pass paints paper) or an opaque `panel` ground.
 */
export function transparent(spec) {
  return { ...spec, background: 'none', finish: 'soft', grain: 0 };
}

const lum = (px, i, ch) => (ch === 1 ? px[i] : px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114);

/**
 * How well a texture tiles. seamX / seamY = mean absolute colour difference across the wrap edge (last vs first
 * column / row) divided by the mean difference between neighbouring interior columns / rows.
 * About 1 or less: the seam looks like any other pixel step (tiles). Well above 1 (say > 1.5): a visible seam.
 */
export async function tileCheck(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const diff = (a, b) => { let s = 0; for (let k = 0; k < C; k++) s += Math.abs(data[a + k] - data[b + k]); return s / C; };
  const col = (x0, x1) => { let s = 0; for (let y = 0; y < H; y++) s += diff((y * W + x0) * C, (y * W + x1) * C); return s / H; };
  const row = (y0, y1) => { let s = 0; for (let x = 0; x < W; x++) s += diff((y0 * W + x) * C, (y1 * W + x) * C); return s / W; };
  let ix = 0; for (let x = 0; x < W - 1; x++) ix += col(x, x + 1); ix /= W - 1;
  let iy = 0; for (let y = 0; y < H - 1; y++) iy += row(y, y + 1); iy /= H - 1;
  const r = (v) => Math.round(v * 1000) / 1000;
  const eps = 1e-6;
  return { seamX: r(col(W - 1, 0) / Math.max(ix, eps)), seamY: r(row(H - 1, 0) / Math.max(iy, eps)) };
}

/**
 * Render the scene as a square and make it seamless: the picture is wrapped by half in both directions (the old
 * edges now cross the middle, the old middle sits on the edges), then the original is cross-faded back over the
 * middle, so the seam band is blended away. Suits textures (mesh gradients, dither fields, hatch, grain); a picture
 * with objects gets ghosted copies of them. Returns a PNG buffer.
 */
export async function tileable(spec, { size = 512 } = {}) {
  const n = Math.min(4096, Math.max(16, Math.round(size)));
  const s = { ...spec, canvas: [n, n], reflow: false };
  delete s.format;
  const { svg } = await compose(s);
  const a = await sharp(await rasterize(svg)).resize(n, n).ensureAlpha().raw().toBuffer();
  const out = Buffer.alloc(a.length), half = n >> 1, last = n - 1;
  for (let y = 0; y < n; y++) {
    const wy = 1 - Math.abs((2 * y) / last - 1); // 0 at the edges, 1 in the middle
    const y2 = (y + half) % n;
    for (let x = 0; x < n; x++) {
      const t = Math.min(1, Math.min(wy, 1 - Math.abs((2 * x) / last - 1)) / 0.7);
      const w = t * t * (3 - 2 * t); // smoothstep: weight of the original
      const i = (y * n + x) * 4, j = (y2 * n + ((x + half) % n)) * 4;
      for (let k = 0; k < 4; k++) out[i + k] = a[i + k] * w + a[j + k] * (1 - w);
    }
  }
  return sharp(out, { raw: { width: n, height: n, channels: 4 } }).png().toBuffer();
}
