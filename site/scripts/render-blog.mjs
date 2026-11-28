// Draws every blog image with Levni: scenes/blog/<slug>/<name>.json -> public/blog/<slug>/<name>.webp
// cover.json also gives the post's social card, public/blog/<slug>/og.png (1200 x 630).
//   npm run blog            (only scenes newer than their image)
//   npm run blog -- --force
// File paths inside a scene (an `image` src, a soft3d `badge`) are read relative to the scene's own folder.
// Square and tall figures (format square/story) are kept at most 640 px wide so a story does not fill the page.
// A scene's `screen` print pass is applied. A file with `tiles` or `brand` is a brand board (docs/board.md).
// Scenes may sit one folder deeper (scenes/blog/<slug>/<group>/<name>.json); they still write public/blog/<slug>/<name>.webp.
// Prints the layout critic's notes per scene, so whoever wrote the scene can fix it.
import { readFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { rasterize } from '../../src/raster.mjs';
import { compose, critique, screenRaster, lensRaster } from '../../src/index.mjs';
import { renderBoard } from '../../src/board.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
const root = here('scenes/blog');
let drawn = 0;
for (const slug of readdirSync(root).filter((d) => !d.startsWith('.'))) {
  mkdirSync(here(`public/blog/${slug}`), { recursive: true });
  const dir = `${root}/${slug}`;
  const files = readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory()
    ? readdirSync(`${dir}/${d.name}`).filter((n) => n.endsWith('.json')).map((n) => `${d.name}/${n}`)
    : d.name.endsWith('.json') ? [d.name] : []))
    .filter((f) => !f.split('/').pop().startsWith('_')); // _name.json: a source scene for a figure made by hand
  for (const f of files) {
    const name = f.split('/').pop().slice(0, -5);
    const src = `${dir}/${f}`;
    const out = here(`public/blog/${slug}/${name}.webp`);
    if (!force && existsSync(out) && statSync(out).mtimeMs > statSync(src).mtimeMs) continue;
    const cwd = process.cwd();
    const spec = JSON.parse(readFileSync(src, 'utf8'));
    if (spec.tiles || spec.brand) {
      const { png } = await renderBoard(spec, null, { baseDir: src.slice(0, src.lastIndexOf('/')) });
      await sharp(png).resize(1200).webp({ quality: 82, effort: 6 }).toFile(out);
      console.log(`${slug}/${name}  board`);
      drawn++;
      continue;
    }
    process.chdir(src.slice(0, src.lastIndexOf('/')));
    let svg, used;
    try { ({ svg, used } = await compose(spec)); } finally { process.chdir(cwd); }
    let png = await rasterize(svg);
    if (spec.screen) png = await screenRaster(png, spec.screen);
    if (spec.lens) png = await lensRaster(png, spec.lens, spec.t ?? 0);
    const { width, height } = await sharp(png).metadata();
    await sharp(png).resize(height >= width ? Math.min(640, width) : 1200).webp({ quality: 82, effort: 6 }).toFile(out);
    if (name === 'cover') {
      await sharp(png).resize(1200, 630, { fit: 'cover', position: 'top' }).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(here(`public/blog/${slug}/og.png`));
    }
    const notes = critique(used, { w: width, h: height });
    console.log(`${slug}/${name}${notes.length ? `\n  - ${notes.join('\n  - ')}` : '  ok'}`);
    drawn++;
  }
}
console.log(`${drawn} drawn`);
