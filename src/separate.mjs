// Levni Print: split a scene into riso plates, one grayscale image per ink, ready for a stencil printer.
// A Levni picture is already printed in a few flat inks plus their tints, so each pixel is read as
// "this much of one ink on paper": inks closer than `merge` share a drum (ink and blue outlines become one blue),
// and a pale colour on the line from paper to an ink is that ink at a lower density (tone is blue at ~30 %).
//   import { separate } from '@levni/levni';
//   const r = await separate(scene, 'print/', { scale: 3, plates: 4 });   // plate-1-mustard.png … proof.png sheet.png print.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { PALETTE } from './style.mjs';

const hex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const rgb = (h) => [1, 3, 5].map((i) => parseInt(String(h).replace('#', '').padEnd(6, '0').slice(i - 1, i + 1), 16));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const luma = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
// house names, so a plate is called "mustard", not "#F2C230", when it is one
const NAMES = Object.entries({ ...PALETTE, tone: '#9DB8F0', 'tone-coral': '#F7B6A4', 'tone-green': '#9FC9A9', 'tone-mustard': '#F8DE8A' }).map(([n, h]) => [n, rgb(h)]);
const nameOf = (c) => { const [n, d] = NAMES.map(([n0, v]) => [n0, dist(c, v)]).sort((a, b) => a[1] - b[1])[0]; return d < 40 ? n : hex(c).slice(1).toLowerCase(); };

// two translucent inks printed over each other: paper times each ink at its density (a riso overprint)
const over = (paper, a, ta, b, tb) => paper.map((p, ch) => p * (1 - ta * (1 - a[ch] / 255)) * (1 - tb * (1 - b[ch] / 255)));
// the best pair of plates (and densities) that prints colour c, or null when one ink explains it well enough
function overprint(c, paper, plates) {
  let best = null;
  for (let a = 0; a < plates.length; a++) for (let b = a + 1; b < plates.length; b++) {
    for (let ta = 0.1; ta <= 1.001; ta += 0.1) for (let tb = 0.1; tb <= 1.001; tb += 0.1) {
      const d = dist(c, over(paper, plates[a].ink, ta, plates[b].ink, tb));
      if (!best || d < best.d) best = { a, b, ta, tb, d };
    }
  }
  return best;
}

// how much of `ink` on `paper` makes colour c: t along the line paper -> ink, and how far c is from that line
function along(c, paper, ink) {
  const d = [ink[0] - paper[0], ink[1] - paper[1], ink[2] - paper[2]], len2 = d[0] ** 2 + d[1] ** 2 + d[2] ** 2 || 1;
  const t = Math.min(1, Math.max(0, ((c[0] - paper[0]) * d[0] + (c[1] - paper[1]) * d[1] + (c[2] - paper[2]) * d[2]) / len2));
  return [t, Math.hypot(c[0] - paper[0] - t * d[0], c[1] - paper[1] - t * d[1], c[2] - paper[2] - t * d[2])];
}

/**
 * Find the plates of a picture. px: raw RGBA. Returns { paper: [r,g,b], plates: [{ ink: [r,g,b], share }] }.
 * opts: plates (max drums, default 4), merge (inks closer than this share a drum, default 48), min (share of the picture a
 * colour needs to count, default 0.004), paper (a colour to treat as the paper; default the most common light colour).
 */
export function findPlates(px, { plates: max = 4, merge = 48, min = 0.004, paper } = {}) {
  const bins = new Map(), n = px.length / 4;
  for (let i = 0; i < px.length; i += 16) { // every 4th pixel is plenty for proportions
    const k = ((px[i] >> 4) << 8) | ((px[i + 1] >> 4) << 4) | (px[i + 2] >> 4);
    const b = bins.get(k) || bins.set(k, [0, 0, 0, 0]).get(k);
    b[0] += px[i]; b[1] += px[i + 1]; b[2] += px[i + 2]; b[3]++;
  }
  const total = n / 4;
  const cols = [...bins.values()].map((b) => ({ c: [b[0] / b[3], b[1] / b[3], b[2] / b[3]], share: b[3] / total })).filter((x) => x.share >= min);
  const pap = paper ? rgb(paper) : (cols.filter((x) => luma(x.c) > 190).sort((a, b) => b.share - a.share)[0] || { c: [244, 242, 236] }).c;
  // strongest colours first, so a full ink becomes a plate before its own tints are seen
  const cand = cols.filter((x) => dist(x.c, pap) > 28).sort((a, b) => dist(b.c, pap) * Math.sqrt(b.share) - dist(a.c, pap) * Math.sqrt(a.share));
  const out = [];
  for (const x of cand) {
    const same = out.find((p) => dist(p.ink, x.c) < merge);
    if (same) { same.share += x.share; continue; }
    const tint = out.find((p) => { const [t, off] = along(x.c, pap, p.ink); return t > 0.08 && t < 0.97 && off < 26; });
    if (tint) { tint.share += x.share; continue; }
    // a colour two plates already print over each other (a shadow on a panel) is not a plate of its own
    if (out.length >= 2) { const o = overprint(x.c, pap, out); if (o && o.d < 16) { out[o.a].share += x.share / 2; out[o.b].share += x.share / 2; continue; } }
    out.push({ ink: x.c, share: x.share });
  }
  // a plate that is only a paler version of another (a tone-mustard panel next to mustard) prints as that ink, lighter
  for (let changed = true; changed;) {
    changed = false;
    for (const p of out) {
      const deeper = out.find((q) => q !== p && dist(q.ink, pap) > dist(p.ink, pap) && (() => { const [t, off] = along(p.ink, pap, q.ink); return t > 0.15 && t < 0.97 && off < 26; })());
      if (deeper) { deeper.share += p.share; out.splice(out.indexOf(p), 1); changed = true; break; }
    }
  }
  // more inks than drums: fold the least used into the plate nearest in colour
  while (out.length > max) {
    out.sort((a, b) => b.share - a.share);
    const small = out.pop(), near = out.slice().sort((a, b) => dist(a.ink, small.ink) - dist(b.ink, small.ink))[0];
    near.share += small.share;
  }
  // print order: lightest ink first, the darkest (usually the key line) last
  out.sort((a, b) => luma(b.ink) - luma(a.ink));
  return { paper: pap, plates: out };
}

// per pixel: the one plate whose paper->ink line passes closest, and how much of that ink
export function splitPixels(px, paper, plates) {
  const n = px.length / 4, dens = plates.map(() => new Float32Array(n));
  const pairs = new Map(); // colour -> [a, ta, b, tb] when two inks print it
  const cache = new Map();
  for (let i = 0, j = 0; j < n; i += 4, j++) {
    const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2];
    let hit = cache.get(k);
    if (hit === undefined) {
      const c = [px[i], px[i + 1], px[i + 2]];
      hit = -1;
      if (dist(c, paper) > 18) {
        let best = Infinity, bt = 0, bp = -1;
        plates.forEach((p, q) => { const [t, off] = along(c, paper, p.ink); const score = off - t * 6; if (score < best) { best = score; bt = t; bp = q; } });
        hit = bp < 0 ? -1 : bp * 1000 + Math.round(bt * 999);
        // one ink leaves it far off: read it as two inks printed over each other
        if (bp >= 0 && plates.length > 1 && along(c, paper, plates[bp].ink)[1] > 20) {
          const o = overprint(c, paper, plates);
          if (o && o.d < along(c, paper, plates[bp].ink)[1]) { pairs.set(k, [o.a, o.ta, o.b, o.tb]); hit = -2; }
        }
      }
      cache.set(k, hit);
    }
    if (hit >= 0) dens[Math.floor(hit / 1000)][j] = (hit % 1000) / 999;
    else if (hit === -2) { const [a, ta, b, tb] = pairs.get(k); dens[a][j] = ta; dens[b][j] = tb; }
  }
  return dens;
}

const BAYER = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21].map((v) => (v + 0.5) / 64);

/**
 * Split a scene into riso plates and write them to `dir`:
 *   plate-1-<ink>.png …  one grayscale image per drum, black = full ink (lightest ink first, the key line last)
 *   proof.png            the plates multiplied back together on the paper colour: what the print should look like
 *   sheet.png            every plate in its own ink beside the proof, for a quick look or a post
 *   print.json           size, paper, and per plate its ink, coverage and print order
 * opts: scale (1 = canvas pixels, default 3), plates (max drums, 4), merge, halftone (cell px: screen the plates here
 * instead of leaving the tints in gray for the printer to screen), paper (colour treated as paper), shift (proof
 * misregistration px, default 0).
 */
export async function separate(spec, dir, opts = {}) {
  const t0 = Date.now();
  const scale = Math.max(0.25, Math.min(8, Number(opts.scale) || 3));
  // a print is a still: motion, camera and time are dropped, so entrances show their finished state
  const still = { ...spec, t: 0, camera: undefined, elements: (spec.elements || []).map(({ motion, ...e }) => e) };
  const { svg, canvas } = await compose(still);
  const { data: px, info } = await rasterize(svg, { density: 72 * scale, raw: true });
  const W = info.width, H = info.height;
  // the paper is the scene's own background unless told otherwise (a big pale panel is ink, not paper)
  const bg = opts.paper ?? (spec.background && spec.background !== 'none' ? (PALETTE[spec.background] ?? (/^#[0-9a-f]{6}$/i.test(spec.background) ? spec.background : null)) : PALETTE.paper);
  const { paper, plates } = findPlates(px, { ...opts, paper: bg || undefined });
  if (!plates.length) throw new Error('separate: no ink found, the picture is all paper');
  const dens = splitPixels(px, paper, plates);
  if (dir) mkdirSync(dir, { recursive: true });
  const cell = Number(opts.halftone) > 0 ? Math.round(Number(opts.halftone)) : 0;
  const files = [], meta = [];
  const grays = plates.map((p, q) => {
    const g = Buffer.alloc(W * H);
    let cover = 0;
    for (let y = 0, j = 0; y < H; y++) for (let x = 0; x < W; x++, j++) {
      let d = dens[q][j];
      if (d < 0.12) d = 0; // faint edge ghosts (anti-aliasing between two inks) would print as a haze
      if (cell && d > 0) d = d >= 0.96 || d > BAYER[(Math.floor(y / cell) % 8) * 8 + (Math.floor(x / cell) % 8)] ? 1 : 0; // screened: every pixel is ink or paper
      cover += d;
      g[j] = 255 - Math.round(d * 255);
    }
    const name = nameOf(p.ink), file = `plate-${q + 1}-${name}.png`;
    meta.push({ order: q + 1, ink: name, hex: hex(p.ink), file, coverage: Math.round((cover / (W * H)) * 1000) / 10 });
    return g;
  });
  for (const [q, g] of grays.entries()) {
    const buf = await sharp(g, { raw: { width: W, height: H, channels: 1 } }).png({ compressionLevel: 9 }).toBuffer();
    if (dir) { writeFileSync(join(dir, meta[q].file), buf); files.push(join(dir, meta[q].file)); }
  }
  // proof: paper, then each plate multiplied on in print order (a riso ink is translucent, so overlaps darken)
  const shift = Math.round(Number(opts.shift) || 0);
  const proof = Buffer.alloc(W * H * 3);
  for (let j = 0; j < W * H; j++) { proof[j * 3] = paper[0]; proof[j * 3 + 1] = paper[1]; proof[j * 3 + 2] = paper[2]; }
  grays.forEach((g, q) => {
    const ink = plates[q].ink, dx = shift ? Math.round(Math.cos(q * 2.4) * shift) : 0, dy = shift ? Math.round(Math.sin(q * 2.4) * shift) : 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const sx = x - dx, sy = y - dy;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const a = 1 - g[sy * W + sx] / 255;
      if (!a) continue;
      const j = (y * W + x) * 3;
      for (let ch = 0; ch < 3; ch++) proof[j + ch] = Math.round(proof[j + ch] * (1 - a * (1 - ink[ch] / 255)));
    }
  });
  const proofPng = await sharp(proof, { raw: { width: W, height: H, channels: 3 } }).png({ compressionLevel: 9 }).toBuffer();
  // sheet: each plate printed alone in its ink, then the proof
  const tw = Math.min(W, 600), th = Math.round((tw * H) / W), gap = 16, cols = plates.length + 1;
  const tiles = await Promise.all(grays.map(async (g, q) => {
    const ink = plates[q].ink, t = Buffer.alloc(W * H * 3);
    for (let j = 0; j < W * H; j++) { const a = 1 - g[j] / 255; for (let ch = 0; ch < 3; ch++) t[j * 3 + ch] = Math.round(paper[ch] * (1 - a * (1 - ink[ch] / 255))); }
    return sharp(t, { raw: { width: W, height: H, channels: 3 } }).resize(tw).png().toBuffer();
  }));
  tiles.push(await sharp(proofPng).resize(tw).png().toBuffer());
  const sheetPng = await sharp({ create: { width: cols * tw + (cols + 1) * gap, height: th + gap * 2, channels: 3, background: '#1B1340' } })
    .composite(tiles.map((input, k) => ({ input, left: gap + k * (tw + gap), top: gap }))).png().toBuffer();
  const manifest = { width: W, height: H, canvas: [canvas.w, canvas.h], scale, dpi: { a4: Math.round(W / 11.69), a3: Math.round(W / 16.54) }, paper: hex(paper), halftone: cell || null, plates: meta };
  if (dir) {
    writeFileSync(join(dir, 'proof.png'), proofPng); writeFileSync(join(dir, 'sheet.png'), sheetPng);
    writeFileSync(join(dir, 'print.json'), JSON.stringify(manifest, null, 2) + '\n');
    files.push(join(dir, 'proof.png'), join(dir, 'sheet.png'), join(dir, 'print.json'));
  }
  return { ...manifest, files, proof: proofPng, sheet: sheetPng, ms: Date.now() - t0 };
}
