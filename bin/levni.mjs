#!/usr/bin/env node
// Levni CLI.
//   levni render <scene.json> <out.png|out.webp|out.svg> [--preview]
//   levni sheet <out.png> [prop ...] [--recolor coral=blue,mustard=tone]
//   levni list [query]
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { render, compose, loadProps, findProp } from '../src/index.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1] === '--recolor'));

const USAGE = `levni: hand-inked illustrations from JSON scenes

  levni render <scene.json> <out.png|out.webp|out.svg> [--preview]
      Draw a scene. Prints the layout critic's notes. --preview also writes <out>.prev.jpg (560 px).
  levni sheet <out.png> [prop ...] [--recolor coral=blue,mustard=tone]
      Contact sheet of props (all when none named): every variant on paper and on blue.
  levni list [query]
      List props (name, variants, tags); with a query, only names or tags that contain it.

Scene format: docs/scene.md`;

async function main() {
  if (cmd === 'render') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni render <scene.json> <out.png|out.webp|out.svg>');
    const scene = JSON.parse(readFileSync(file, 'utf8'));
    const { notes } = await render(scene, out, { preview: flag('preview') });
    console.log(out);
    console.log(notes.length ? notes.map((n) => `- ${n}`).join('\n') : '- critic: no layout problems found');
  } else if (cmd === 'sheet') {
    const [out, ...names] = positional;
    if (!out) throw new Error('usage: levni sheet <out.png> [prop ...]');
    const recolor = opt('recolor') ? Object.fromEntries(opt('recolor').split(',').map((kv) => kv.split('='))) : undefined;
    const n = await sheet(out, names, recolor);
    console.log(`${n} prop variants -> ${out}`);
  } else if (cmd === 'list') {
    const q = (positional[0] || '').toLowerCase();
    const all = Object.values(loadProps()).sort((a, b) => a.name.localeCompare(b.name));
    const hits = q ? all.filter((p) => p.name.includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q))) : all;
    for (const p of hits) console.log(`${p.name}  (${p.variants.length})  ${(p.tags || []).join(', ')}`);
    console.log(`${hits.length} props`);
  } else {
    console.log(USAGE);
    if (cmd && cmd !== 'help' && cmd !== '--help') process.exitCode = 1;
  }
}

// 4 variants per 1200x673 tile: two per row, each drawn on paper and on a blue panel.
export async function sheet(out, names = [], recolor) {
  const all = loadProps();
  const picked = names.length ? names.map((n) => { const p = findProp(n); if (!p) throw new Error(`unknown prop: ${n}`); return p.name; }) : Object.keys(all).sort();
  const list = picked.flatMap((n) => all[n].variants.map((_, v) => [n, v]));
  const tiles = [];
  for (let i = 0; i < list.length; i += 4) {
    const elements = [300, 900].map((x) => ({ type: 'panel', x, y: 0, w: 300, h: 673, color: 'blue' }));
    list.slice(i, i + 4).forEach(([name, variant], k) => {
      const y = 175 + Math.floor(k / 2) * 330;
      for (const half of [0, 1]) {
        const x = 150 + ((k % 2) * 2 + half) * 300;
        elements.push({ type: 'prop', name, variant, x, y, size: 220, recolor });
        elements.push({ type: 'label', text: `${name} ${variant}`, x, y: y + 140, size: 14, anchor: 'middle', upper: false });
      }
    });
    const { svg } = await compose({ seed: 3, elements });
    tiles.push(await sharp(Buffer.from(svg)).png().toBuffer());
  }
  if (!tiles.length) throw new Error('no props found');
  await sharp({ create: { width: 1200, height: 673 * tiles.length, channels: 3, background: '#F4F2EC' } })
    .composite(tiles.map((input, i) => ({ input, top: i * 673, left: 0 })))
    .png()
    .toFile(out);
  return list.length;
}

main().catch((err) => { console.error(`levni: ${err.message}`); process.exit(1); });
