// Draws every blog image with Levni: scenes/blog/<slug>/<name>.json -> public/blog/<slug>/<name>.webp
// cover.json also gives the post's social card, public/blog/<slug>/og.png (1200 x 630).
//   npm run blog            (only scenes newer than their image)
//   npm run blog -- --force
// File paths inside a scene (an `image` src, a soft3d `badge`) are read relative to the scene's own folder.
// Square and tall figures (format square/story) are kept at most 640 px wide so a story does not fill the page.
// Prints the layout critic's notes per scene, so whoever wrote the scene can fix it.
import { readFileSync, readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { compose, critique } from '../../src/index.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
const root = here('scenes/blog');
let drawn = 0;
for (const slug of readdirSync(root).filter((d) => !d.startsWith('.'))) {
  mkdirSync(here(`public/blog/${slug}`), { recursive: true });
  for (const f of readdirSync(`${root}/${slug}`).filter((n) => n.endsWith('.json'))) {
    const name = f.slice(0, -5);
    const src = `${root}/${slug}/${f}`;
    const out = here(`public/blog/${slug}/${name}.webp`);
    if (!force && existsSync(out) && statSync(out).mtimeMs > statSync(src).mtimeMs) continue;
    const cwd = process.cwd();
    process.chdir(`${root}/${slug}`);
    let svg, used;
    try { ({ svg, used } = await compose(JSON.parse(readFileSync(src, 'utf8')))); } finally { process.chdir(cwd); }
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
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
