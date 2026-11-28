// Share cards for the drawing pages: one 1200 × 630 JPEG per Folio drawing into public/og/library/<name>.jpg,
// in the brand of the other OG cards (indigo ground, white stage, lime kicker), with the drawing itself on the stage.
//   node scripts/render-library-og.mjs            (only draws cards that are missing)
//   node scripts/render-library-og.mjs --force    (redraws all)
//   node scripts/render-library-og.mjs coffee-cup (just these)
// Output is committed, like public/props/, so the Pages build needs no sharp.
import { existsSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { rasterize } from '../../src/raster.mjs';
import { compose, loadProps } from '../../src/index.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
mkdirSync(here('public/og/library'), { recursive: true });
const args = process.argv.slice(2), force = args.includes('--force'), only = args.filter((a) => !a.startsWith('--'));

const C = { indigo: '#4B2FD6', lime: '#D6E521', red: '#FF3A44', white: '#FFFFFF', on: '#E9F2D9', mute: '#C3B9F7' };
const human = (name) => { const s = name.replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };
// greedy wrap at ~13 characters, at most 3 lines
function lines(text, max = 13) {
  const out = [];
  for (const w of text.split(' ')) {
    const last = out[out.length - 1];
    if (last && (last + ' ' + w).length <= max) out[out.length - 1] = last + ' ' + w; else out.push(w);
  }
  return out.length > 3 ? [...out.slice(0, 2), out.slice(2).join(' ')] : out;
}

export function card(p) {
  const L = lines(human(p.name)), size = L.length >= 3 ? 62 : L.some((l) => l.length > 11) ? 66 : 76;
  const n = p.variants.length;
  return {
    canvas: [1200, 630], finish: 'soft', grain: 0.06, background: C.indigo, seed: 7, style: 'riso',
    elements: [
      { type: 'block', x: 690, y: 70, w: 450, h: 490, color: C.white },
      { type: 'prop', name: p.name, x: 915, y: 315, size: 380 },
      { type: 'block', x: 640, y: 470, w: 110, h: 110, color: C.lime },
      { type: 'type', text: '{the levni folio · cc by 4.0}', x: 64, y: 66, size: 22, font: 'mono', weight: 500, color: C.lime, upper: true, tracking: 0.04 },
      { type: 'type', text: L.join('\n'), x: 62, y: 150, size, font: 'grotesk', weight: 400, tracking: -0.045, leading: 0.98, color: C.on },
      { type: 'type', text: `free svg${n > 1 ? ` · ${n} variants` : ''} · dots, ascii, 3d`, x: 64, y: 510, size: 21, font: 'mono', weight: 400, color: C.mute },
      { type: 'type', text: 'LEVNI**.DEV/LIBRARY**', x: 64, y: 568, size: 22, font: 'mono', weight: 400, boldWeight: 700, color: C.white },
    ],
  };
}

const props = Object.values(loadProps()).sort((a, b) => a.name.localeCompare(b.name)).filter((p) => !only.length || only.includes(p.name));
const todo = props.filter((p) => force || only.length || !existsSync(here(`public/og/library/${p.name}.jpg`)));
console.log(`${props.length} drawings, ${todo.length} cards to draw`);
const t0 = Date.now();
let done = 0;
for (const p of todo) {
  const png = await rasterize((await compose(card(p))).svg);
  await sharp(png).jpeg({ quality: 80, mozjpeg: true }).toFile(here(`public/og/library/${p.name}.jpg`));
  if (++done % 100 === 0) console.log(`${done}/${todo.length}  ${((Date.now() - t0) / done).toFixed(0)} ms each`);
}
console.log(`done: ${done} cards in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
