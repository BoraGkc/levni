// Levni in the browser. Same scenes, same pictures; the drawings and fonts a scene uses are loaded first.
//   import { compose, registerProps, registerFont, toCanvas } from '@levni/levni/browser';
//   registerProps([await (await fetch('/props/rocket.json')).json()]);
//   registerFont('black', await (await fetch('/fonts/ArchivoBlack-Regular.ttf')).arrayBuffer());
//   const { svg } = await compose(scene);  const blob = await toBlob(svg);
// Bundle it with the Vite plugin (src/browser/vite.mjs), which swaps node:fs, node:path and sharp for small shims.
// Not available here: the elements that need sharp (glyph masks, dither, print screens) and the `icon` set.
import './browser/env.mjs';
import { writeVirtual } from './browser/vfs.mjs';
import { resetProps } from './props.mjs';
import { FONTS } from './type.mjs';

export { compose, critique, COLORS } from './compose.mjs';
export { PALETTE, rng } from './style.mjs';
export { findProp, expandProp, loadProps } from './props.mjs';
export { FORMATS, resolveCanvas } from './formats.mjs';
export { STYLES, applyStyle } from './styles.mjs';
export { FONTS } from './type.mjs';
export { stampPng, readStamp, remix } from './stamp.mjs';
export { youStats, youScene, youTerms, YOU_THEMES } from './you.mjs';
export { bannerScene, pickMark, repoTerms, hashSeed, BANNER_SIZE, BANNER_THEMES, FALLBACK_MARKS } from './banner.mjs';

// Add Folio drawings (the parsed JSON of library/props/<name>.json) so `prop` elements can use them.
export function registerProps(list) {
  for (const p of [].concat(list)) writeVirtual(`props/${p.name}.json`, JSON.stringify(p));
  resetProps();
}

// Add a bundled font by its name in FONTS (grotesk, black, mono, pixel) so `type` elements can use it.
export function registerFont(name, bytes) {
  const spec = FONTS[name];
  if (!spec) throw new Error(`unknown font ${name}: use ${Object.keys(FONTS).join(', ')}`);
  writeVirtual(`fonts/${spec.file}`, new Uint8Array(bytes));
}

// Add any other file a scene reads by path, such as the `src` of an `image` element ("examples/badge.svg").
export function registerFile(path, bytes) {
  writeVirtual(path, typeof bytes === 'string' ? bytes : new Uint8Array(bytes));
}

// The fonts a scene needs (bundled names only), so a page can fetch just those.
export function fontsFor(scene) {
  const alias = { sans: 'grotesk', display: 'grotesk', serif: 'grotesk', heavy: 'black', code: 'mono', bitmap: 'pixel' };
  const out = new Set();
  const walk = (els) => {
    for (const e of els || []) {
      if (e.type === 'type') for (const f of [e.font || 'grotesk', e.boldFont, e.lightFont]) if (f) out.add(alias[f] || f);
      if (e.elements) walk(e.elements);
    }
  };
  walk(scene.elements);
  return [...out].filter((f) => FONTS[f]);
}

// The `prop` names a scene uses, so a page can fetch just those drawings.
export function propsFor(scene) {
  const out = new Set();
  const walk = (els) => { for (const e of els || []) { if (e.type === 'prop' && e.name) out.add(e.name); if (e.elements) walk(e.elements); } };
  walk(scene.elements);
  return [...out];
}

// SVG -> canvas, drawn by the browser itself (its SVG filters do the crayon finish). scale 2 for a retina PNG.
export async function toCanvas(svg, { scale = 1 } = {}) {
  const w = Number(/<svg[^>]*\swidth="([\d.]+)"/.exec(svg)?.[1]), h = Number(/<svg[^>]*\sheight="([\d.]+)"/.exec(svg)?.[1]);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally { URL.revokeObjectURL(url); }
}

// A scene as a looping GIF, made in the page: each frame is drawn by the browser, then packed by src/gif.mjs.
// opts: frames (24), fps (12), width (px, default the canvas width), colours (128), onProgress(done, total).
// Returns a Blob (image/gif). The same loop from Node: animate() in src/animate.mjs.
export async function animateBlob(spec, { frames = 24, fps = 12, width, colours = 128, onProgress } = {}) {
  const { compose } = await import('./compose.mjs');
  const { encodeGif } = await import('./gif.mjs');
  const n = Math.max(1, Math.min(240, Math.round(frames) || 24));
  const raws = [];
  let w = 0, h = 0, last = null, lastSvg = null;
  for (let i = 0; i < n; i++) {
    const { svg, canvas } = await compose({ ...spec, t: i / n });
    if (svg !== lastSvg) { // identical frames are drawn once
      const c = await toCanvas(svg, { scale: width ? Math.min(1, width / canvas.w) : 1 });
      w = c.width; h = c.height;
      last = c.getContext('2d').getImageData(0, 0, w, h).data;
      lastSvg = svg;
    }
    raws.push(last);
    onProgress?.(i + 1, n);
    await new Promise((r) => setTimeout(r)); // let the page paint its progress
  }
  return new Blob([encodeGif(raws, w, h, { delay: Math.round(1000 / (Math.round(fps) || 12)), colours })], { type: 'image/gif' });
}

export const toBlob = async (svg, { type = 'image/png', quality, scale } = {}) =>
  new Promise(async (ok, fail) => (await toCanvas(svg, { scale })).toBlob((b) => (b ? ok(b) : fail(new Error('canvas export failed'))), type, quality));
