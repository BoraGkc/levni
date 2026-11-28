// Animation renderer: one scene, drawn at N moments of `t` (0..1), joined into a looping GIF or animated WebP.
// The scene format already carries time (`t`: trees sway, clouds drift, meshgrad blobs loop, soft3d spins) and the
// crayon filter's own seed (`boil`); this module is the loop that steps them. Same scene + seed + t = same frame.
//   import { animate } from '@levni/levni';
//   await animate(scene, 'hero.gif', { frames: 24, fps: 12, boil: 3 });
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { compose } from './compose.mjs';
import { critique } from './critic.mjs';
import { rasterize } from './raster.mjs';
import { screenRaster } from './dither.mjs';
import { lensRaster } from './lens.mjs';
import { encodeGif } from './gif.mjs';

const clampInt = (v, d, lo, hi) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

// The plan for a loop: frame i of `frames` is drawn at t = i / frames, so the frame after the last one is the first.
// `boil` textures take turns, each held for `hold` frames (about six changes a second, like animation drawn on twos).
export function framePlan(spec, { frames = 24, fps = 12, boil = 0 } = {}) {
  const n = clampInt(frames, 24, 1, 240), rate = clampInt(fps, 12, 1, 50), b = clampInt(boil, 0, 0, 8);
  const hold = Math.max(1, Math.round(rate / 6));
  const base = spec.boil ?? spec.seed ?? 1;
  return Array.from({ length: n }, (_, i) => ({ t: i / n, ...(b > 1 ? { boil: base + (Math.floor(i / hold) % b) } : {}) }));
}

/**
 * Draw every frame. Returns { frames: [PNG buffer], width, height, delay (ms), notes, moving }.
 * opts: frames (24), fps (12), boil (0: steady paper; 2..8: that many crayon textures take turns), width (px, scales down).
 * `moving` is false when no frame differs from the first: the scene has nothing that follows `t` and boil is off.
 */
export async function renderFrames(spec, opts = {}) {
  const plan = framePlan(spec, opts);
  const rate = clampInt(opts.fps, 12, 1, 50);
  const cache = new Map(); // identical SVG -> one raster (held boil frames, still scenes)
  const frames = [];
  let notes = [], canvas = null;
  for (const [i, step] of plan.entries()) {
    const { svg, used, canvas: cv } = await compose({ ...spec, ...step });
    if (i === 0) {
      canvas = cv;
      // entrances (pop, typewriter…) leave frame 0 half empty: the critic reads the settled picture at mid-loop instead
      const entering = (spec.elements || []).some((e) => e && e.motion);
      notes = entering ? critique((await compose({ ...spec, t: 0.5 })).used, cv) : critique(used, cv);
    }
    const ck = spec.lens ? svg + '|lens' + step.t : svg; // a moving lens changes the frame even when the SVG does not
    if (!cache.has(ck)) {
      let png = await rasterize(svg);
      if (spec.screen) png = await screenRaster(png, spec.screen);
      if (spec.lens) png = await lensRaster(png, spec.lens, step.t);
      if (opts.width && opts.width < cv.w) png = await sharp(png).resize(Math.round(opts.width)).png().toBuffer();
      cache.set(ck, png);
    }
    frames.push(cache.get(ck));
  }
  const moving = cache.size > 1;
  if (!moving && plan.length > 1) notes = [...notes, 'animation: every frame is the same. Nothing in this scene follows `t`; add a moving element (cloud with drift, flag, confetti, flowfield, meshgrad, soft3d with spin) or set boil'];
  const meta = await sharp(frames[0]).metadata();
  return { frames, width: meta.width, height: meta.height, delay: Math.round(1000 / rate), notes, moving, distinct: cache.size };
}

/**
 * Compose a scene over time and write a looping .gif or .webp. Returns { notes, bytes, frames, width, height, moving, buffer, stills }
 * (`stills`: the frames as PNG buffers, e.g. for frameStrip).
 * opts: frames, fps, boil, width (see renderFrames); loop (0 = forever); colours (GIF palette size, 2..255, default 128);
 * encoder: 'sharp' hands the GIF to sharp instead of Levni's own encoder (dithered, about twice the size).
 */
export async function animate(spec, out, opts = {}) {
  const ext = /\.(gif|webp)$/i.exec(String(out || ''))?.[1]?.toLowerCase();
  if (out && !ext) throw new Error('animate: out must end in .gif or .webp');
  const r = await renderFrames(spec, opts);
  const delay = r.frames.map(() => r.delay);
  const loop = clampInt(opts.loop, 0, 0, 65535);
  let buf;
  if ((ext ?? opts.format) === 'webp') {
    buf = await sharp(r.frames, { join: { animated: true } }).webp({ quality: clampInt(opts.quality, 80, 1, 100), effort: 4, smartSubsample: true, delay, loop }).toBuffer();
  } else if (opts.encoder === 'sharp') {
    buf = await sharp(r.frames, { join: { animated: true } }).gif({ colours: clampInt(opts.colours ?? opts.colors, 64, 2, 256), effort: 7, dither: 0.6, delay, loop }).toBuffer();
  } else {
    // Levni's own encoder (gif.mjs): only the pixels that change between frames are stored, about half the size of sharp's
    const raws = new Map(); // a held frame is decoded once
    for (const f of r.frames) if (!raws.has(f)) raws.set(f, await sharp(f).ensureAlpha().raw().toBuffer());
    buf = Buffer.from(encodeGif(r.frames.map((f) => raws.get(f)), r.width, r.height, { delay: r.delay, loop, colours: clampInt(opts.colours ?? opts.colors, 128, 2, 255) }));
  }
  if (out) writeFileSync(out, buf);
  return { notes: r.notes, bytes: buf.length, frames: r.frames.length, distinct: r.distinct, width: r.width, height: r.height, moving: r.moving, buffer: buf, stills: r.frames };
}

// A strip of evenly spaced frames in one PNG: how an agent (or a README) looks at a loop without playing it.
export async function frameStrip(frames, { count = 4, width = 280 } = {}) {
  const n = Math.min(count, frames.length);
  const picks = Array.from({ length: n }, (_, k) => frames[Math.floor((k * frames.length) / n)]);
  const thumbs = await Promise.all(picks.map((f) => sharp(f).resize(width).png().toBuffer()));
  const h = (await sharp(thumbs[0]).metadata()).height, gap = 8;
  return sharp({ create: { width: n * width + (n + 1) * gap, height: h + gap * 2, channels: 3, background: '#E9E6DE' } })
    .composite(thumbs.map((input, k) => ({ input, left: gap + k * (width + gap), top: gap }))).png({ compressionLevel: 9, palette: true }).toBuffer();
}
