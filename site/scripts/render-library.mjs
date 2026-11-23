// Draws every Folio prop variant as a small tile for the /library/ page, and writes the index the page reads.
//   npm run library            (only draws tiles that are missing)
//   npm run library -- --force (redraws all)
// Props are laid out 18 to a canvas, rendered once at 2x and cut into tiles: ~40 renders instead of 700.
// Output is committed (public/props/*.webp, src/data/props.json), so the Pages build needs no sharp.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import { compose, loadProps, CATEGORIES, STYLES } from '../../src/index.mjs';
import { HOUSE } from '../../src/styles.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
mkdirSync(here('public/props'), { recursive: true });
mkdirSync(here('src/data'), { recursive: true });

const props = Object.values(loadProps()).sort((a, b) => a.name.localeCompare(b.name));
const index = props.map((p) => ({
  name: p.name,
  category: p.category || 'other',
  tags: p.tags || [],
  variants: p.variants.map((v) => v.note || ''),
}));
writeFileSync(here('src/data/props.json'), JSON.stringify(index));
writeFileSync(here('src/data/categories.json'), JSON.stringify(CATEGORIES));
writeFileSync(here('src/data/inks.json'), JSON.stringify({ house: HOUSE, packs: STYLES }));
writeFileSync(here('public/inks.json'), JSON.stringify({ house: HOUSE, packs: STYLES }));

// SVG of every variant, cropped to the drawing, in house colours: the Library recolours it live in the browser
mkdirSync(here('public/props-svg'), { recursive: true });
let svgs = 0;
for (const p of props) for (const i of p.variants.keys()) {
  const out = `public/props-svg/${p.name}-${i}.svg`;
  if (!force && existsSync(here(out))) continue;
  const { svg } = await compose({ seed: 3, elements: [{ type: 'prop', name: p.name, variant: i, x: 600, y: 336, size: 460 }] });
  writeFileSync(here(out), svg.replace(/width="1200" height="673" viewBox="0 0 1200 673"/, 'width="520" height="520" viewBox="340 76 520 520"'));
  svgs++;
}
console.log(`${svgs} svg written`);

const tiles = props.flatMap((p) => p.variants.map((_, i) => ({ name: p.name, i, out: `public/props/${p.name}-${i}.webp` })));
const todo = force ? tiles : tiles.filter((t) => !existsSync(here(t.out)));
console.log(`${tiles.length} variants, ${todo.length} to draw`);

const COLS = 6, ROWS = 3, CELL = 200, SIZE = 150, DENSITY = 144; // 2x
const k2 = DENSITY / 72;
for (let s = 0; s < todo.length; s += COLS * ROWS) {
  const batch = todo.slice(s, s + COLS * ROWS);
  const elements = batch.map((t, k) => ({
    type: 'prop', name: t.name, variant: t.i, size: SIZE,
    x: CELL / 2 + (k % COLS) * CELL, y: 136 + Math.floor(k / COLS) * CELL,
  }));
  const { svg } = await compose({ seed: 3, style: 'riso', elements });
  // decode the sheet once, then cut tiles from the raw pixels
  const { data, info } = await sharp(Buffer.from(svg), { density: DENSITY }).raw().toBuffer({ resolveWithObject: true });
  await Promise.all(batch.map((t, k) => {
    const left = (k % COLS) * CELL * k2, top = (36 + Math.floor(k / COLS) * CELL) * k2;
    return sharp(data, { raw: info }).extract({ left, top, width: CELL * k2, height: CELL * k2 })
      .resize(240).webp({ quality: 80, effort: 6 }).toFile(here(t.out));
  }));
  console.log(`${Math.min(s + batch.length, todo.length)}/${todo.length}`);
}
