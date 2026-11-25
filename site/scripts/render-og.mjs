// Draws the share cards with Levni itself, in the 2026 brand (indigo, lime, red, paper):
// one 1200 × 630 Open Graph card per page into public/og/, plus the README banner and the
// GitHub social preview into docs/img/. Run after a page title changes:  node scripts/render-og.mjs
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import { rasterize } from '../../src/raster.mjs';
import { compose } from '../../src/index.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
mkdirSync(here('public/og'), { recursive: true });

const C = { indigo: '#4B2FD6', lime: '#D6E521', red: '#FF3A44', paper: '#F3F1EA', white: '#FFFFFF', on: '#E9F2D9', mute: '#C3B9F7' };
const INKS = ['#E8522F', '#F3C2F5', '#58C4F6', '#F28C38', '#F7C744', '#E66BF0', '#F7C744'];
// the 7 × 9 pixel tulip of the mark
const TULIP = [[0, 0, 1, 1], [3, 0, 1, 1], [6, 0, 1, 1], [0, 1, 2, 1], [3, 1, 1, 1], [5, 1, 2, 1], [0, 2, 7, 2], [1, 4, 5, 1], [2, 5, 3, 1], [3, 6, 1, 3], [1, 7, 2, 1], [4, 6, 2, 1]];

const pixelTulip = (x, y, u, color) => TULIP.map(([a, b, w, h]) => ({ type: 'block', x: x + a * u, y: y + b * u, w: w * u, h: h * u, color }));
const dots = (x, y, cols, rows, gap, r) => {
  const out = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out.push({ type: 'block', x: x + i * gap, y: y + j * gap, w: r * 2, h: r * 2, radius: r, color: INKS[(j * cols + i) * 5 % 7] });
  return out;
};

// One card: kicker, a big headline, a mono line, and the art stage on the right
function card({ kicker, title, sub, w = 1200, h = 630, prop = 'tulip', mode = 'glyph' }) {
  const s = h / 630;
  const stageX = w - 470 * s, stageY = 150 * s, stageW = 410 * s, stageH = 380 * s;
  return {
    canvas: [w, h], finish: 'soft', grain: 0.06, background: C.indigo, seed: 7,
    elements: [
      ...dots(w - 300 * s, 54 * s, 7, 2, 34 * s, 8 * s),
      { type: 'block', x: stageX, y: stageY, w: stageW, h: stageH, color: C.white },
      { type: 'glyphfill', prop, x: stageX + stageW * 0.56, y: stageY + stageH * 0.48, size: 380 * s, mode, cell: 9 * s, color: C.indigo, accent: C.red, accentShare: 0.06 },
      { type: 'block', x: stageX - 50 * s, y: stageY + stageH - 140 * s, w: 170 * s, h: 170 * s, color: C.lime },
      ...pixelTulip(stageX - 50 * s + 32 * s, stageY + stageH - 140 * s + 22 * s, 15 * s, C.indigo),
      { type: 'block', x: stageX + 120 * s, y: stageY + stageH - 140 * s, w: 46 * s, h: 46 * s, color: C.indigo },
      { type: 'type', text: kicker, x: 64 * s, y: 66 * s, size: 22 * s, font: 'mono', weight: 500, color: C.lime, upper: true, tracking: 0.04 },
      { type: 'type', text: title, x: 62 * s, y: 150 * s, size: 74 * s, font: 'grotesk', weight: 400, tracking: -0.045, leading: 0.98, color: C.on },
      { type: 'type', text: sub, x: 64 * s, y: h - 120 * s, size: 21 * s, font: 'mono', weight: 400, color: C.mute },
      { type: 'type', text: 'LEVNI**.DEV**', x: 64 * s, y: h - 62 * s, size: 22 * s, font: 'mono', weight: 400, boldWeight: 700, color: C.white },
    ],
  };
}

async function out(spec, file) {
  const png = await rasterize((await compose(spec)).svg);
  await sharp(png).png({ compressionLevel: 9, palette: true, quality: 92 }).toFile(here(file));
  console.log(file);
}

const pages = [
  ['default', '{a post-AI center for designers}', 'Designed for agents,\ndrawn for people.', 'open-source design engine · no image model'],
  ['features', '{features}', 'Everything\nLevni draws.', 'covers, icons, boards, posters, from JSON'],
  ['gallery', '{gallery}', 'What one JSON\nscene becomes.', '229 images, every one with its scene'],
  ['library', '{the levni folio · cc by 4.0}', '1,600+ hand-inked\ndrawings, free.', 'search in English or Turkish'],
  ['mcp', '{mcp server}', 'Give your agent\na design studio.', 'claude mcp add levni -- npx -y @levni/levni mcp'],
  ['docs', '{documentation}', 'Learn Levni\nin two minutes.', 'MCP, CLI, Node API, the scene format'],
  ['blog', '{levni blog}', 'Illustration for agents\nand publishers.', 'guides, recipes, behind the drawings'],
  ['make', '{free makers}', 'Make it in your\nbrowser. Free.', 'no sign-up, no credits, download PNG or SVG'],
  ['community', '{open design · community}', 'Everything is open\nsource. Why not design?', 'draw, share, request, show your work'],
  ['manifesto', '{manifesto}', 'We are living in\na Tulip Era.', 'we use AI. we do not rent our taste from it.'],
  ['changelog', '{changelog}', 'What changed,\nrelease by release.', 'elements, commands, MCP tools'],
  ['editor', '{editor}', 'A design editor that\nruns on your laptop.', 'drag drawings, export PNG or SVG, free'],
  ['banner', '{readme banner maker}', 'A README banner\nfor your repo.', 'paste a GitHub link, get 1280 × 640'],
];
for (const [slug, kicker, title, sub] of pages) await out(card({ kicker, title, sub }), `public/og/${slug}.png`);

// README banner and the GitHub social preview (1280 × 640)
await out(card({ kicker: '{a post-AI center for designers}', title: 'Designed for agents,\ndrawn for people.', sub: 'open source · MCP · no image model · $0', w: 1280, h: 640 }), '../docs/img/social-preview.png');
await out(card({ kicker: '{levni · open-source design engine}', title: 'Your agent’s\ndesign studio.', sub: 'covers, icons, brand boards, posters, from JSON', w: 1200, h: 630 }), '../docs/img/banner.png');
