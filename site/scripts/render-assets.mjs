// Renders every image the site uses with Levni itself, into public/. Run once after a scene changes:
//   LEVNI_ICONS=/path/to/tabler/icons npm run assets     (gallery covers use Tabler icons)
// The output is committed, so the Cloudflare Pages build only runs `astro build` and needs no sharp.
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { compose } from '../../src/index.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const scene = (p) => JSON.parse(readFileSync(here(p), 'utf8'));
const png = async (spec) => sharp(Buffer.from((await compose(spec)).svg)).png().toBuffer();
for (const d of ['public/img', 'public/og', 'public/gallery']) mkdirSync(here(d), { recursive: true });

async function webp(buf, out, width) {
  await sharp(buf).resize(width).webp({ quality: 82, effort: 6, smartSubsample: true }).toFile(here(out));
  console.log(out);
}

// OG card: a Levni scene with a serif title set over a paper band (1200 x 630)
async function og(spec, title, out) {
  const base = await sharp(await png(spec)).resize(1200, 630, { fit: 'cover', position: 'top' }).png().toBuffer();
  const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const band = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
    <rect x="80" y="438" width="1040" height="128" fill="#F1E4C8" stroke="#C9962B" stroke-width="6"/>
    <rect x="92" y="450" width="1016" height="104" fill="none" stroke="#C8402E" stroke-width="2"/>
    <text x="600" y="518" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="46" fill="#3B2415">${esc(title)}</text></svg>`);
  await sharp(base).composite([{ input: band }]).png({ compressionLevel: 9, palette: true, quality: 90 }).toFile(here(out));
  console.log(out);
}

// 1. Hero (miniature style pack) and the default OG card
const hero = scene('scenes/hero.json');
await webp(await png(hero), 'public/img/hero.webp', 1200);
await webp(await png(hero), 'public/img/hero-640.webp', 640);
await og(hero, 'Levni · illustrations from a JSON scene', 'public/og/default.png');

// 2. Same scene, two style packs
const spot = scene('../examples/spot.json');
await webp(await png(spot), 'public/gallery/spot-riso.webp', 800);
await webp(await png({ ...spot, style: 'miniature' }), 'public/gallery/spot-miniature.webp', 800);
const room = scene('../examples/room.json');
await webp(await png(room), 'public/gallery/room-riso.webp', 800);
await webp(await png({ ...room, style: 'miniature' }), 'public/gallery/room-miniature.webp', 800);
await webp(await png(scene('../examples/cover.json')), 'public/gallery/cover-riso.webp', 800);

// 3. Real Ortak Alan article covers
for (const f of readdirSync(here('scenes/gallery')).filter((n) => n.endsWith('.json'))) {
  await webp(await png({ ...scene(`scenes/gallery/${f}`), locale: 'tr' }), `public/gallery/oa-${f.replace('.json', '')}.webp`, 800);
}

// 4. Motifs cut out of a miniature sheet, for page ornaments (the paper colour matches the page)
const motifs = [['rosette', 0], ['tulip', 0], ['blossom-sprig', 0], ['carnation', 0], ['cypress', 0]];
const sheet = await png({ seed: 9, style: 'miniature', elements: motifs.map(([name, variant], k) => ({ type: 'prop', name, variant, x: 120 + k * 240, y: 336, size: 200 })) });
for (const [k, [name]] of motifs.entries()) {
  // key out the paper (and its grain) so the motif sits on any page colour
  const { data, info } = await sharp(sheet).extract({ left: k * 240, top: 216, width: 240, height: 240 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.hypot(data[i] - 0xf1, data[i + 1] - 0xe4, data[i + 2] - 0xc8);
    data[i + 3] = d < 22 ? 0 : d < 44 ? Math.round(((d - 22) / 22) * 255) : 255;
  }
  await sharp(data, { raw: info }).webp({ quality: 85, alphaQuality: 90 }).toFile(here(`public/img/motif-${name}.webp`));
  console.log(`public/img/motif-${name}.webp`);
}

// 5. Blog post OG cards: scenes/og-<slug>.json
for (const f of readdirSync(here('scenes')).filter((n) => n.startsWith('og-') && n.endsWith('.json'))) {
  const s = scene(`scenes/${f}`);
  await og(s, s.ogTitle, `public/og/${f.slice(3, -5)}.png`);
}
