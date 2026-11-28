// Levni Reel: several shots or scenes one after another, joined with transitions, as one video or loop.
//   import { renderReel } from '@levni/levni';
//   await renderReel({ format: 'story', fps: 24, transition: 'wipe', clips: [
//     { shot: 'logo-sting', fields: { title: 'Lale Studio', mark: 'tulip' }, seconds: 3 },
//     { shot: 'list-stagger', fields: { title: 'New', items: ['Prints', 'Posters'] }, seconds: 3 },
//     { scene: { …any Levni scene… }, seconds: 2 },
//   ] }, 'reel.mp4');
// Each clip plays its own loop once over its seconds (t runs 0..1), so entrances arrive and loops come round.
import { writeFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import sharp from 'sharp';
import { compose } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { shotScene } from './shots.mjs';
import { encodeGif } from './gif.mjs';
import { ffmpegAvailable } from './sequence.mjs';
import { ease } from './motion.mjs';

export const TRANSITIONS = ['cut', 'fade', 'wipe', 'slide', 'push', 'iris'];
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// the scene of one clip, sized to the reel
function clipScene(c, reel) {
  const base = c.shot ? shotScene(c.shot, { ...(c.fields || {}), format: reel.format, canvas: reel.canvas }) : { ...c.scene };
  if (!c.shot) { if (reel.format && !base.format && !base.canvas) base.format = reel.format; if (reel.canvas && !base.canvas) base.canvas = reel.canvas; }
  if (reel.inks && c.shot) Object.assign(base, shotScene(c.shot, { ...(c.fields || {}), inks: reel.inks, format: reel.format, canvas: reel.canvas }));
  return base;
}

// blend two RGBA frames into a third for a transition at progress p (0..1)
function mix(a, b, W, H, kind, p, dir) {
  const out = Buffer.alloc(W * H * 4);
  if (kind === 'fade') { for (let i = 0; i < out.length; i++) out[i] = a[i] + (b[i] - a[i]) * p; return out; }
  if (kind === 'iris') { // b opens from the centre in a growing circle
    const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy) * p, edge = Math.max(1, W * 0.004);
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
      const k = clamp((R - Math.hypot(x - cx, y - cy)) / edge + 0.5, 0, 1);
      for (let ch = 0; ch < 4; ch++) out[i + ch] = a[i + ch] + (b[i + ch] - a[i + ch]) * k;
    }
    return out;
  }
  // wipe: b uncovered from the left (or top); slide: b comes in over a; push: b pushes a out
  const horiz = dir !== 'up', n = horiz ? W : H, edge = Math.round(n * p);
  for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i += 4) {
    const pos = horiz ? x : y;
    let src, si;
    if (kind === 'wipe') { src = pos < edge ? b : a; si = i; }
    else if (kind === 'slide') {
      if (pos < edge) { src = b; const off = n - edge; si = horiz ? (y * W + (x + off)) * 4 : ((y + off) * W + x) * 4; } else { src = a; si = i; }
    } else { // push
      if (pos < edge) { src = b; const off = n - edge; si = horiz ? (y * W + (x + off)) * 4 : ((y + off) * W + x) * 4; }
      else { src = a; si = horiz ? (y * W + (x - edge)) * 4 : ((y - edge) * W + x) * 4; }
    }
    out[i] = src[si]; out[i + 1] = src[si + 1]; out[i + 2] = src[si + 2]; out[i + 3] = src[si + 3];
  }
  return out;
}

/**
 * Render every frame of a reel as raw RGBA. reel: { clips: [{ shot, fields } | { scene }, seconds?, transition?],
 * format?, canvas?, inks?, fps (24), seconds (default per clip, 3), transition ('fade'), transitionSeconds (0.4), width }.
 * A clip's own `transition` is how it comes in. Returns { frames, width, height, fps, seconds }.
 */
export async function reelFrames(reel, { onClip } = {}) {
  const clips = (reel.clips || []).filter((c) => c && (c.shot || c.scene));
  if (!clips.length) throw new Error('reel: no clips. Each clip needs a "shot" (with "fields") or a "scene"');
  const fps = clamp(Math.round(Number(reel.fps) || 24), 1, 60);
  const tr = clamp(Number(reel.transitionSeconds ?? 0.4), 0, 3);
  let W = 0, H = 0;
  const rendered = [];
  for (const [k, c] of clips.entries()) {
    const scene = clipScene(c, reel);
    const n = Math.max(2, Math.round(clamp(Number(c.seconds ?? reel.seconds ?? 3), 0.2, 60) * fps));
    const frames = [];
    let last = null, lastSvg = '';
    for (let i = 0; i < n; i++) {
      const { svg } = await compose({ ...scene, t: i / n });
      if (svg !== lastSvg) {
        let png = await rasterize(svg);
        if (reel.width) png = await sharp(png).resize(Math.round(reel.width)).png().toBuffer();
        const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        if (!W) { W = info.width; H = info.height; }
        last = info.width === W && info.height === H ? data : await sharp(data, { raw: info }).resize(W, H, { fit: 'cover' }).raw().toBuffer();
        lastSvg = svg;
      }
      frames.push(last);
    }
    rendered.push({ frames, kind: TRANSITIONS.includes(c.transition) ? c.transition : TRANSITIONS.includes(reel.transition) ? reel.transition : 'fade', dir: c.direction || reel.direction });
    onClip?.(k + 1, clips.length);
  }
  // join: each transition overlaps the end of one clip with the start of the next
  const out = [...rendered[0].frames];
  for (let k = 1; k < rendered.length; k++) {
    const { frames, kind, dir } = rendered[k];
    const m = kind === 'cut' ? 0 : Math.min(Math.round(tr * fps), frames.length - 1, out.length - 1);
    for (let j = 0; j < m; j++) {
      const p = ease('inOutCubic', (j + 1) / (m + 1)), at = out.length - m + j;
      out[at] = mix(out[at], frames[j], W, H, kind, p, dir);
    }
    out.push(...frames.slice(m));
  }
  return { frames: out, width: W, height: H, fps, seconds: out.length / fps };
}

/** Render a reel to .mp4 (ffmpeg), .gif or .webp. Returns { frames, width, height, fps, seconds, bytes }. */
export async function renderReel(reel, out, opts = {}) {
  const r = await reelFrames(reel, opts);
  const ext = /\.(mp4|gif|webp)$/i.exec(String(out))?.[1]?.toLowerCase();
  if (!ext) throw new Error('reel: out must end in .mp4, .gif or .webp');
  let bytes = 0;
  if (ext === 'gif') { const buf = encodeGif(r.frames, r.width, r.height, { delay: Math.round(1000 / r.fps), loop: 0, colours: 160 }); writeFileSync(out, buf); bytes = buf.length; }
  else if (ext === 'webp') {
    const pngs = await Promise.all(r.frames.map((f) => sharp(f, { raw: { width: r.width, height: r.height, channels: 4 } }).png().toBuffer()));
    const buf = await sharp(pngs, { join: { animated: true } }).webp({ quality: 78, effort: 4, delay: pngs.map(() => Math.round(1000 / r.fps)), loop: 0 }).toBuffer();
    writeFileSync(out, buf); bytes = buf.length;
  } else {
    if (!ffmpegAvailable()) throw new Error('reel: .mp4 needs ffmpeg on the PATH (macOS: brew install ffmpeg). Or write .gif or .webp.');
    const args = ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${r.width}x${r.height}`, '-r', String(r.fps), '-i', 'pipe:0',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(clamp(Math.round(Number(opts.crf ?? 20)), 0, 51)), '-movflags', '+faststart', String(out)];
    const p = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    const done = new Promise((res, rej) => { p.on('error', rej); p.on('close', (code) => (code === 0 ? res() : rej(new Error(`reel: ffmpeg exited with ${code}: ${err.trim().slice(0, 300)}`)))); });
    p.stdin.on('error', () => {});
    for (const f of r.frames) if (!p.stdin.write(f)) await new Promise((res) => p.stdin.once('drain', res));
    p.stdin.end();
    await done;
    bytes = statSync(out).size;
  }
  return { frames: r.frames.length, width: r.width, height: r.height, fps: r.fps, seconds: Math.round(r.seconds * 10) / 10, bytes };
}
