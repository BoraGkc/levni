// Levni Zine on the site (/zine/): every examples/zine-*.json becomes public/zine/<issue>/ with page images (WebP),
// thumbnails, zine.pdf and fold.pdf, and src/data/zine.json lists the issues.
//   node scripts/render-zine.mjs          (issues whose folder is missing)
//   node scripts/render-zine.mjs --force
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { renderZine } from '../../src/zine.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const EX = here('../examples/');
const force = process.argv.includes('--force');
const issues = [];
for (const f of readdirSync(EX).filter((f) => /^zine-\d+\.json$/.test(f)).sort()) {
  const z = JSON.parse(readFileSync(EX + f, 'utf8'));
  const id = String(z.issue || f.match(/\d+/)[0]).padStart(2, '0');
  const out = here(`public/zine/${id}/`);
  if (force || !existsSync(join(out, 'zine.pdf'))) {
    const tmp = join(tmpdir(), `levni-zine-${id}`);
    const r = await renderZine(z, tmp, { onPage: (k, n) => process.stdout.write(`\r${id}: page ${k}/${n}`) });
    mkdirSync(out, { recursive: true });
    for (let i = 1; i <= r.pages; i++) {
      const png = join(tmp, `p${String(i).padStart(2, '0')}.png`);
      await sharp(png).webp({ quality: 84 }).toFile(join(out, `p${String(i).padStart(2, '0')}.webp`));
      await sharp(png).resize(300).webp({ quality: 80 }).toFile(join(out, `p${String(i).padStart(2, '0')}-s.webp`));
    }
    for (const k of ['zine.pdf', 'fold.pdf']) if (existsSync(join(tmp, k))) writeFileSync(join(out, k), readFileSync(join(tmp, k)));
    if (existsSync(join(tmp, 'fold.png'))) await sharp(join(tmp, 'fold.png')).resize(1200).webp({ quality: 82 }).toFile(join(out, 'fold.webp'));
    rmSync(tmp, { recursive: true, force: true });
    console.log(`\r${id}: ${r.pages} pages${r.notes.length ? `, ${r.notes.length} critic notes` : ''}`);
  }
  const kb = (k) => (existsSync(join(out, k)) ? Math.round(statSync(join(out, k)).size / 1024) : 0);
  issues.push({ id, title: z.pages[0]?.title || z.title || '', subtitle: z.pages[0]?.subtitle || '', date: z.date || '', pages: z.pages.length, source: `examples/${f}`, pdfKB: kb('zine.pdf'), foldKB: kb('fold.pdf'), fold: existsSync(join(out, 'fold.pdf')), titles: z.pages.map((p, i) => p.title || p.kicker || (i === 0 ? 'Cover' : `Page ${i + 1}`)) });
}
writeFileSync(here('src/data/zine.json'), JSON.stringify(issues.reverse(), null, 1) + '\n');
console.log(`zine: ${issues.length} issue(s)`);
