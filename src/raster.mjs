// Fast rasteriser for Levni SVGs.
// librsvg spends ~90 % of a render applying the crayon filter (two displacement maps and two masks over the full
// canvas). The noise itself is cheap. So: render the picture in three unfiltered layers (ground, inked body, crisp
// top), render the filter's four noise fields once per seed and size (cached), apply the same filter math to the body
// pixels in JavaScript, and composite. Same look, a fraction of the time. SVGs without the markers fall back to sharp.
//   import { rasterize } from './raster.mjs';  const png = await rasterize(svg, { density: 72 });
import sharp from 'sharp';

const BODY = '<!--levni:body-->', END = '<!--/levni:body-->';
const GRAIN = '<!--levni:grain-->', GRAIN_END = '<!--/levni:grain-->';
const noiseCache = new Map(); // key -> Promise<{ wobble, tooth, grain, mot }> (raw RGBA buffers)
const CACHE_MAX = 12;

const svgSize = (svg) => {
  const w = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]), h = Number(/<svg[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1]);
  return { w, h };
};

// the four fields of filterDefs(), rendered by librsvg itself so values match the SVG filter exactly
function noiseFields(seed, W, H, k) {
  const key = `${seed}:${W}x${H}@${k}`;
  if (noiseCache.has(key)) return noiseCache.get(key);
  const pw = Math.round(W * k), ph = Math.round(H * k);
  const field = (bf, s) => sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${W} ${H}"><filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${bf}" numOctaves="2" seed="${s}"/></filter><rect width="${W}" height="${H}" filter="url(#f)"/></svg>`))
    .ensureAlpha().raw().toBuffer();
  const p = Promise.all([field('0.018', seed), field('0.55', seed + 7), field('1.1 0.8', seed + 13), field('0.003 0.035', seed + 31)])
    .then(([wobble, tooth, grain, mot]) => ({ wobble, tooth, grain, mot }));
  noiseCache.set(key, p);
  if (noiseCache.size > CACHE_MAX) noiseCache.delete(noiseCache.keys().next().value);
  return p;
}

// feDisplacementMap: out(x, y) = in(x + scale * (R - .5), y + scale * (G - .5)), bilinear sample on premultiplied
// colour (as librsvg does), transparent outside. Input and output are unpremultiplied RGBA.
function displace(src, map, pw, ph, scale) {
  const out = new Uint8ClampedArray(src.length);
  for (let y = 0; y < ph; y++) {
    for (let x = 0; x < pw; x++) {
      const i = (y * pw + x) * 4;
      const fx = x + scale * (map[i] / 255 - 0.5), fy = y + scale * (map[i + 1] / 255 - 0.5);
      const x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      let r = 0, g = 0, b = 0, a = 0;
      for (let q = 0; q < 4; q++) {
        const sx = x0 + (q & 1), sy = y0 + (q >> 1);
        if (sx < 0 || sy < 0 || sx >= pw || sy >= ph) continue;
        const wgt = ((q & 1) ? tx : 1 - tx) * ((q >> 1) ? ty : 1 - ty);
        const j = (sy * pw + sx) * 4, al = src[j + 3] * wgt;
        if (!al) continue;
        r += src[j] * al; g += src[j + 1] * al; b += src[j + 2] * al; a += al;
      }
      if (a > 0) { out[i] = r / a; out[i + 1] = g / a; out[i + 2] = b / a; out[i + 3] = a; }
    }
  }
  return out;
}

// the crayon filter on unpremultiplied RGBA: wobble 5, tooth 3.2, speckle mask, drum mottle mask
function crayon(body, n, pw, ph, k) {
  const w2 = displace(displace(body, n.wobble, pw, ph, 5 * k), n.tooth, pw, ph, 3.2 * k);
  for (let i = 3; i < w2.length; i += 4) {
    if (!w2[i]) continue;
    const speck = Math.min(1, Math.max(0, -2.0 * (n.grain[i] / 255) + 2.3));
    const mot = Math.min(1, Math.max(0, 0.55 * (n.mot[i - 3] / 255) + 0.74));
    w2[i] = Math.round(w2[i] * speck * mot);
  }
  return w2;
}

/**
 * Rasterise a Levni SVG to a PNG buffer (or raw RGBA with { raw: true }).
 * density: like sharp's (72 = 1 px per unit). Falls back to plain sharp when the SVG has no body markers.
 */
export async function rasterize(svg, { density = 72, raw = false } = {}) {
  const s = String(svg);
  const a = s.indexOf(BODY), b = s.indexOf(END);
  const plain = () => { const img = sharp(Buffer.from(s), { density }); return raw ? img.ensureAlpha().raw().toBuffer({ resolveWithObject: true }) : img.png().toBuffer(); };
  if (process.env.LEVNI_RASTER === 'rsvg') return plain();
  if (s.includes(GRAIN)) return softGrain(s, { density, raw });
  if (a < 0 || b < a) return plain();
  const { w: W, h: H } = svgSize(s);
  if (!(W > 0 && H > 0)) return plain();
  const k = density / 72;
  const pw = Math.round(W * k), ph = Math.round(H * k);
  const seed = Number(/<feTurbulence[^>]*seed="(\d+)"[^>]*result="wobble"/.exec(s)?.[1] ?? 1);
  const defsEnd = s.indexOf('</defs>') + 7;
  const open = s.slice(0, defsEnd);
  const inner = s.slice(a + BODY.length, b).replace(/^\s*<g filter="url\(#crayon\)">/, '').replace(/<\/g>\s*$/, '');
  const ground = s.slice(0, a) + '</svg>';
  const top = open + s.slice(b + END.length);
  const body = `${open}${inner}</svg>`;
  const render = (x) => sharp(Buffer.from(x), { density }).ensureAlpha().raw().toBuffer();
  const [g, bd, tp, n] = await Promise.all([render(ground), render(body), render(top), noiseFields(seed, W, H, k)]);
  const inked = crayon(bd, n, pw, ph, k);
  const opts = { raw: { width: pw, height: ph, channels: 4 } };
  const img = sharp(g, opts).composite([{ input: Buffer.from(inked.buffer), raw: opts.raw }, { input: tp, raw: opts.raw }]);
  return raw ? img.raw().toBuffer({ resolveWithObject: true }) : img.png().toBuffer();
}

// soft finish: the picture without its film-grain rect, then the grain (cached per seed and size) laid on in JS.
// grain filter: fractalNoise 0.95 x2 octaves; alpha = clamp(-1.6 A + 1.05), black, times the rect's opacity.
async function softGrain(s, { density, raw }) {
  const g0 = s.indexOf(GRAIN), g1 = s.indexOf(GRAIN_END);
  const rect = s.slice(g0 + GRAIN.length, g1);
  const opacity = Number(/opacity="([\d.]+)"/.exec(rect)?.[1] ?? 0.16);
  const seed = Number(/<filter id="grain"[\s\S]*?seed="(\d+)"/.exec(s)?.[1] ?? 1);
  const { w: W, h: H } = svgSize(s);
  const k = density / 72, pw = Math.round(W * k), ph = Math.round(H * k);
  const key = `grain:${seed}:${W}x${H}@${k}`;
  if (!noiseCache.has(key)) {
    noiseCache.set(key, sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${pw}" height="${ph}" viewBox="0 0 ${W} ${H}"><filter id="f" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="${seed}"/></filter><rect width="${W}" height="${H}" filter="url(#f)"/></svg>`)).ensureAlpha().raw().toBuffer());
    if (noiseCache.size > CACHE_MAX) noiseCache.delete(noiseCache.keys().next().value);
  }
  const [pic, field] = await Promise.all([sharp(Buffer.from(s.slice(0, g0) + s.slice(g1 + GRAIN_END.length)), { density }).ensureAlpha().raw().toBuffer(), noiseCache.get(key)]);
  const over = Buffer.alloc(pw * ph * 4);
  for (let i = 3; i < over.length; i += 4) over[i] = Math.round(255 * opacity * Math.min(1, Math.max(0, -1.6 * (field[i] / 255) + 1.05)));
  const opts = { raw: { width: pw, height: ph, channels: 4 } };
  const img = sharp(pic, opts).composite([{ input: over, raw: opts.raw }]);
  return raw ? img.raw().toBuffer({ resolveWithObject: true }) : img.png().toBuffer();
}
