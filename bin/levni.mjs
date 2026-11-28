#!/usr/bin/env node
// Levni CLI.
//   levni render <scene.json> <out.png|out.webp|out.svg> [--preview] [--format cover|og|square|story|youtube]
//   levni animate <scene.json> <out.gif|out.webp> [--frames 24] [--fps 12] [--boil 3] [--width 800] [--strip frames.png]
//   levni storyboard <spec.json> <out.png> [--frames-dir dir]
//   levni brand <brand.json | url> <out-dir>
//   levni print <scene.json> <out-dir>
//   levni shot <name> <out> [--title …]   (levni shot --list)
//   levni reel <reel.json> <out.mp4>
//   levni zine <zine.json> <out-dir>   (pages, zine.pdf, fold.pdf)
//   levni desk [dir] [--port 4747]   (local panel for a folder of scenes)
//   levni open | remix <image.png> …
//   levni sheet <out.png> [prop ...] [--recolor coral=blue,mustard=tone]
//   levni board <spec.json> <out.png>
//   levni list [query]
//   levni poster <spec.json> <out-dir>
//   levni ghost drafts|attach ...   (Ghost adapter, see docs/ghost.md)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';
import { rasterize } from '../src/raster.mjs';
import { score as judgeScore, pick as judgePick, openrouter } from '../src/judge/index.mjs';
import { render, compose, loadProps, findProp, addPropDir, LIBRARY_DIR, validateProp, lintProp, parseProps, measureVariant } from '../src/index.mjs';

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => rest.includes(`--${name}`);
const opt = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const positional = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && ['--recolor', '--port', '--dir', '--sheet', '--brief', '--model', '--format', '--frames', '--fps', '--boil', '--width', '--strip', '--colours', '--frames-dir', '--sprite', '--columns', '--crf', '--loops', '--tile', '--posters', '--only', '--scale', '--plates', '--halftone', '--shift', '--paper', '--title', '--subtitle', '--kicker', '--mark', '--inks', '--items', '--values', '--cta', '--seed', '--by', '--from', '--repo', '--repo-json', '--theme'].includes(rest[i - 1])));

const USAGE = `levni: hand-inked illustrations from JSON scenes

  levni render <scene.json> <out.png|out.webp|out.svg> [--preview] [--format cover|og|square|story|youtube|hd|readme]
                [--transparent] [--tile 512]
      Draw a scene. Prints the layout critic's notes. --preview also writes <out>.prev.jpg (560 px).
      --transparent: a clear ground (soft finish). --tile N: a seamless N px square texture (PNG).
      --format recomposes a 1200x673 scene for another canvas (sets "format" and "reflow": see docs/scene.md).
  levni animate <scene.json> <out.gif|out.webp|out.mp4> [--frames 24] [--fps 12] [--boil 3] [--width 800] [--strip frames.png]
                [--frames-dir dir] [--sprite sheet.png --columns 6] [--crf 20 --loops 1]
      Draw a scene as a loop: the scene's \`t\` runs 0..1 (clouds drift, flags wave, mesh gradients breathe, soft 3D spins).
      --boil N lets N crayon textures take turns for a hand-drawn shimmer. --strip also writes a few frames side by side.
      Elements move with "motion": float, sway, pulse, spin, pop, fade, slide, wipe, typewriter; the scene with "camera".
      .mp4 needs ffmpeg on the PATH. --frames-dir writes frame-0001.png… and frames.json; --sprite writes a sprite sheet
      and its atlas JSON. docs/animate.md, docs/export.md
  levni shot <name> <out.gif|out.webp|out.mp4|out.png|out.json> [--title ..] [--subtitle ..] [--kicker ..] [--mark rocket]
             [--inks "#1F3A5F,#E4572E"] [--format square|story|youtube|…] [--items "a,b,c"] [--values "3,5,8"]
      A ready-made motion shot with your words, drawing and inks. levni shot --list shows them all. docs/shots.md
  levni banner <out.gif|out.png|out.webp> [--repo owner/name | --repo-json repo.json] [--theme riso|coral|green|night]
              [--mark name] [--still]
      A README banner for a GitHub repo (read from the GitHub API, GITHUB_TOKEN if set): moving unless --still or .png.
  levni reel <reel.json> <out.mp4|out.gif|out.webp>
  levni zine <zine.json> <out-dir>   a zine: page images, zine.pdf and an 8-page fold-up on one A4 sheet
  levni desk [dir] [--port 4747] [--no-open]   a local panel: every scene in the folder, drawn and watched
      Shots or scenes one after another with transitions (cut, fade, wipe, slide, push, iris): { format, fps,
      transition, clips: [{ shot, fields, seconds, transition } | { scene, seconds }] }. docs/reel.md
  levni open <image.png> [scene.json]
      Every PNG Levni writes carries its scene. This prints it, or writes it to scene.json, with its remix credits.
  levni remix <image.png|scene.json> <out.png|out.json> [--by "Your name"] [--from url]
      Add your name to the remix chain and write the picture (stamped) or the scene. docs/stamp.md
  levni print <scene.json> <out-dir> [--scale 3] [--plates 4] [--halftone 4] [--paper #F4F2EC] [--shift 3]
      Riso plates: one grayscale PNG per ink (black = full ink; lightest ink first, the key line last), proof.png
      (the plates multiplied back on the paper), sheet.png and print.json. Ready for a stencil printer. docs/print.md
  levni brand <brand.json | https://url> <out-dir> [--posters 8] [--only a,b]
      Brand kit: { "brand": { name, tagline?, mark?, inks?, words? } } (or a website URL, read once for name, tagline and
      colours) makes mark, favicons, palette, og, cover, square, story, README banner, board, posters, loop, brand.json,
      kit.json and index.html in one folder. docs/brandkit.md
  levni storyboard <spec.json> <out.png> [--frames-dir dir] [--columns n]
      Storyboard sheet from a shot list: numbered frames with title, duration, timecode and note. A bare
      [{ id, desc, frames }] list works. --frames-dir also writes shot-NN.png and shots.json. docs/storyboard.md
  levni sheet <out.png> [prop ...] [--recolor coral=blue,mustard=tone]
      Contact sheet of props (all when none named): every variant on paper and on blue.
  levni board <spec.json> <out.png>
      Brand board: { "brand": { name, tagline, mark, inks } } makes nine tiles in one call, or place scene/palette/type tiles yourself, with browser/card/tote/phone mockups. docs/board.md
  levni poster <spec.json> <out-dir>
      Branding posters: { "brand": { name, tagline, mark, inks, words } } makes a series of portrait posters (split, map, bauhaus, echo, camo, vertical, summit, launch) plus series.png. docs/poster.md
  levni list [query]
      List props (name, variants, tags); with a query, only names or tags that contain it.
  levni add <file> [--dir <props folder>] [--sheet out.png]
      Import props written elsewhere (one prop, an array, or a chat answer with \`\`\`json blocks).
      Checks each one, writes new props, adds new variants to existing ones, skips broken ones.
      Default folder: the library in this checkout. --sheet draws the imported props for a look.
  levni mcp
      Run Levni as an MCP server over stdio (tools: scene_guide, list_props, render_scene,
      critique_scene, render_animation, show_props, render_board, render_poster, render_storyboard,
      render_brand_kit, render_print, render_shot, render_reel). Add it to an MCP client as: npx levni mcp
  levni check [prop ...]
      Measure props without looking at them (for agents that cannot see images): how much of the
      box each variant fills, its centre, colours, and what to fix. All props when none named.
  levni judge score <image> --brief "..." [--model <id>]
  levni judge pick <image> <image> [...] --brief "..." [--model <id>]
      Ask a judge model (OpenRouter, needs OPENROUTER_API_KEY) to rate images 0..3 for a brief, JSON out.
      pick scores every image twice in shuffled order and averages; gaps under 0.15 are ties. docs/judge.md

  levni ghost drafts [--dir <folder>] [--apply]
  levni ghost attach <plan.json> [--apply]
      Ghost adapter: pull imageless drafts, attach a cover and inline images (dry run unless --apply).
      Needs GHOST_ADMIN_API_URL and GHOST_ADMIN_API_KEY in the environment. See docs/ghost.md.

Scene format: docs/scene.md`;

async function main() {
  if (cmd === 'render') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni render <scene.json> <out.png|out.webp|out.svg>');
    let scene = JSON.parse(readFileSync(file, 'utf8'));
    if (opt('format')) Object.assign(scene, { format: opt('format'), reflow: true });
    if (opt('tile')) {
      const { tileable } = await import('../src/sequence.mjs');
      writeFileSync(out, await tileable(scene, { size: Number(opt('tile')) || 512 }));
      console.log(`${out}  (seamless ${Number(opt('tile')) || 512} px tile)`);
      return;
    }
    if (flag('transparent')) { const { transparent } = await import('../src/sequence.mjs'); scene = transparent(scene); }
    const { notes } = await render(scene, out, { preview: flag('preview') });
    console.log(out);
    console.log(notes.length ? notes.map((n) => `- ${n}`).join('\n') : '- critic: no layout problems found');
  } else if (cmd === 'animate') {
    const [file, out] = positional;
    if (!file || !/\.(gif|webp|mp4)$/i.test(out || '')) throw new Error('usage: levni animate <scene.json> <out.gif|out.webp|out.mp4> [--frames 24] [--fps 12] [--boil 3] [--width 800]');
    const scene = JSON.parse(readFileSync(file, 'utf8'));
    if (opt('format')) Object.assign(scene, { format: opt('format'), reflow: true });
    const { animate, frameStrip } = await import('../src/animate.mjs');
    const o = { frames: opt('frames'), fps: opt('fps'), boil: opt('boil'), width: opt('width') && Number(opt('width')), colours: opt('colours') };
    if (opt('frames-dir')) { const { writeFrames } = await import('../src/sequence.mjs'); const m = await writeFrames(scene, resolve(opt('frames-dir')), o); console.log(`${opt('frames-dir')}  ${m.files.length} frames + frames.json`); }
    if (opt('sprite')) { const { spriteSheet } = await import('../src/sequence.mjs'); await spriteSheet(scene, opt('sprite'), { ...o, columns: opt('columns') && Number(opt('columns')) }); console.log(`${opt('sprite')}  + atlas JSON`); }
    if (/\.mp4$/i.test(out)) {
      const { toMp4 } = await import('../src/sequence.mjs');
      await toMp4(scene, out, { ...o, crf: opt('crf') && Number(opt('crf')), loops: opt('loops') && Number(opt('loops')) });
      console.log(out);
      return;
    }
    const r = await animate(scene, out, o);
    console.log(`${out}  ${r.frames} frames, ${r.width} x ${r.height}, ${Math.round(r.bytes / 1024)} KB`);
    if (opt('strip')) { writeFileSync(opt('strip'), await frameStrip(r.stills)); console.log(opt('strip')); }
    console.log(r.notes.length ? r.notes.map((n) => `- ${n}`).join('\n') : '- critic: no layout problems found');
  } else if (cmd === 'banner') {
    const [out] = positional;
    if (!out) throw new Error('usage: levni banner <out.gif|out.png> --repo owner/name');
    let gh;
    if (opt('repo-json')) gh = JSON.parse(readFileSync(opt('repo-json'), 'utf8'));
    else {
      const repo = opt('repo') || process.env.GITHUB_REPOSITORY;
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo || '')) throw new Error('banner: pass --repo owner/name (or run inside GitHub Actions)');
      const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { accept: 'application/vnd.github+json', 'user-agent': 'levni-banner', ...(process.env.GITHUB_TOKEN ? { authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) } });
      if (!res.ok) throw new Error(`banner: GitHub answered ${res.status} for ${repo}`);
      gh = await res.json();
    }
    const { repoBanner } = await import('../src/banner.mjs');
    const still = flag('still') || /\.(png|svg)$/i.test(out);
    const scene = repoBanner(gh, Object.values(loadProps()), { theme: opt('theme'), mark: opt('mark'), motion: !still });
    if (still) await render(scene, out);
    else { const { animate } = await import('../src/animate.mjs'); await animate(scene, out, { frames: 36, fps: 12, width: 800 }); }
    console.log(`${out}  ${gh.full_name || gh.name}, mark ${scene.elements.find((e) => e.type === 'prop')?.name}`);
  } else if (cmd === 'zine') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni zine <zine.json> <out-dir>');
    const { renderZine } = await import('../src/zine.mjs');
    const r = await renderZine(JSON.parse(readFileSync(file, 'utf8')), out, { onPage: (k, n) => process.stdout.write(`\rpage ${k}/${n}`) });
    console.log(`\r${out}  ${r.pages} pages: ${r.files.map((f) => f.split('/').pop()).filter((f) => !/^p\d/.test(f)).join(', ')}`);
    console.log(r.notes.length ? r.notes.map((n) => `- ${n}`).join('\n') : '- critic: no layout problems found');
  } else if (cmd === 'desk') {
    const { startDesk } = await import('../src/desk.mjs');
    const d = await startDesk({ dir: positional[0] || '.', port: opt('port') && Number(opt('port')), log: (m) => console.log(`- ${m}`) });
    console.log(`Levni Desk: ${d.url}  (${resolve(positional[0] || '.')})`);
    console.log('Watching the folder; Ctrl+C to stop.');
    if (!flag('no-open')) { const { spawn } = await import('node:child_process'); const o = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'; spawn(o, [d.url], { stdio: 'ignore', detached: true }).on('error', () => {}).unref(); }
    await new Promise(() => {});
  } else if (cmd === 'reel') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni reel <reel.json> <out.mp4|out.gif|out.webp>');
    const { renderReel } = await import('../src/reel.mjs');
    const r = await renderReel(JSON.parse(readFileSync(file, 'utf8')), out, { onClip: (k, n) => process.stderr.write(`clip ${k}/${n}\r`) });
    console.log(`${out}  ${r.seconds} s, ${r.frames} frames at ${r.fps} fps, ${r.width} x ${r.height}${r.bytes ? `, ${Math.round(r.bytes / 1024)} KB` : ''}`);
  } else if (cmd === 'open' || cmd === 'remix') {
    const { readStamp, remix } = await import('../src/stamp.mjs');
    const [src, out] = positional;
    if (!src) throw new Error(`usage: levni ${cmd} <image.png|scene.json> [out]`);
    const raw = readFileSync(src);
    const scene = /\.json$/i.test(src) ? JSON.parse(raw.toString('utf8')) : readStamp(raw)?.scene;
    if (!scene) throw new Error(`${src} carries no Levni scene (only PNGs written by Levni 0.5 or newer do)`);
    const next = cmd === 'remix' ? remix(scene, { by: opt('by'), from: opt('from') || (/\.json$/i.test(src) ? undefined : src.split('/').pop()) }) : scene;
    if (!out) { console.log(JSON.stringify(next, null, 2)); return; }
    if (/\.json$/i.test(out)) writeFileSync(out, JSON.stringify(next, null, 2) + '\n');
    else await render(next, out);
    console.log(out);
    for (const c of next.credits || []) console.log(`- ${c.at || ''} ${c.by || 'someone'}${c.from ? ` from ${c.from}` : ''}`);
  } else if (cmd === 'shot') {
    const { shotScene, SHOTS } = await import('../src/shots.mjs');
    const [name, out] = positional;
    if (flag('list') || !name) { for (const s of SHOTS) console.log(`${s.id.padEnd(16)} ${s.group.padEnd(6)} ${s.text}`); return; }
    if (!out) throw new Error('usage: levni shot <name> <out.gif|out.webp|out.mp4|out.png|out.json> [--title …] (levni shot --list)');
    const list = (k) => (opt(k) ? opt(k).split(',').map((x) => x.trim()).filter(Boolean) : undefined);
    const scene = shotScene(name, { title: opt('title'), subtitle: opt('subtitle'), kicker: opt('kicker'), mark: opt('mark'), cta: opt('cta'), inks: list('inks'), items: list('items'), values: list('values'), format: opt('format'), seed: opt('seed') && Number(opt('seed')) });
    if (/\.json$/i.test(out)) { writeFileSync(out, JSON.stringify(scene, null, 2) + '\n'); console.log(out); return; }
    if (/\.(png|svg)$/i.test(out) || flag('still')) { // a still: the finished picture, mid-loop
      const { notes } = await render({ ...scene, t: 0.62 }, out); console.log(out); if (notes.length) console.log(notes.map((n) => `- ${n}`).join('\n')); return;
    }
    const o = { frames: opt('frames') ? Number(opt('frames')) : 36, fps: opt('fps') ? Number(opt('fps')) : 12, width: opt('width') ? Number(opt('width')) : undefined };
    if (/\.mp4$/i.test(out)) { const { toMp4 } = await import('../src/sequence.mjs'); await toMp4(scene, out, o); console.log(out); return; }
    const { animate } = await import('../src/animate.mjs');
    const r = await animate(scene, out, o);
    console.log(`${out}  ${name}, ${r.frames} frames, ${r.width} x ${r.height}, ${Math.round(r.bytes / 1024)} KB`);
  } else if (cmd === 'print') {
    const [file, dir] = positional;
    if (!file || !dir) throw new Error('usage: levni print <scene.json> <out-dir> [--scale 3] [--plates 4] [--halftone 4]');
    const { separate } = await import('../src/separate.mjs');
    const num = (k) => (opt(k) != null ? Number(opt(k)) : undefined);
    const r = await separate(JSON.parse(readFileSync(file, 'utf8')), dir, { scale: num('scale'), plates: num('plates'), halftone: num('halftone'), shift: num('shift'), paper: opt('paper') });
    console.log(`${dir}  ${r.plates.length} plates, ${r.width} x ${r.height} px (A4 at ${r.dpi.a4} dpi, A3 at ${r.dpi.a3} dpi), paper ${r.paper}, ${r.ms} ms`);
    for (const p of r.plates) console.log(`- ${p.order}. ${p.ink} ${p.hex}  ${p.coverage}% cover  ${p.file}`);
  } else if (cmd === 'brand') {
    const [src, outDir] = positional;
    if (!src || !outDir) throw new Error('usage: levni brand <brand.json | https://url> <out-dir> [--posters 8] [--only a,b]');
    const { renderKit, brandFromUrl } = await import('../src/brandkit.mjs');
    const spec = /^https?:\/\//i.test(src) ? { brand: await brandFromUrl(src) } : JSON.parse(readFileSync(src, 'utf8'));
    if (opt('posters')) spec.posters = Number(opt('posters'));
    if (opt('only')) spec.only = opt('only').split(',').map((x) => x.trim()).filter(Boolean);
    const r = await renderKit(spec, outDir);
    console.log(`${r.files.length} files -> ${outDir}  (${r.brand.name}, mark ${r.brand.mark}, ${r.ms} ms)`);
    for (const [k, v] of Object.entries(r.notes)) for (const n of v) console.log(`- ${k}: ${n}`);
  } else if (cmd === 'storyboard') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni storyboard <spec.json> <out.png> [--frames-dir dir] [--columns n]');
    const { renderStoryboard } = await import('../src/storyboard.mjs');
    const r = await renderStoryboard(JSON.parse(readFileSync(file, 'utf8')), out, { framesDir: opt('frames-dir') ? resolve(opt('frames-dir')) : undefined, columns: opt('columns') ? Number(opt('columns')) : undefined });
    console.log(`${out}  (${r.width}x${r.height}, ${r.shots.length} shots, ${r.total}s)`);
    if (r.warnings.length) console.log(r.warnings.map((w) => `- ${w}`).join('\n'));
  } else if (cmd === 'sheet') {
    const [out, ...names] = positional;
    if (!out) throw new Error('usage: levni sheet <out.png> [prop ...]');
    const recolor = opt('recolor') ? Object.fromEntries(opt('recolor').split(',').map((kv) => kv.split('='))) : undefined;
    const n = await sheet(out, names, recolor);
    console.log(`${n} prop variants -> ${out}`);
  } else if (cmd === 'board') {
    const [file, out] = positional;
    if (!file || !out) throw new Error('usage: levni board <spec.json> <out.png>');
    const { renderBoard } = await import('../src/board.mjs');
    const r = await renderBoard(JSON.parse(readFileSync(file, 'utf8')), out, { baseDir: resolve(file, '..') });
    console.log(`${out}  (${r.width}x${r.height}, ${Math.round(r.bytes / 1024)} KB)`);
  } else if (cmd === 'poster') {
    const [file, outDir] = positional;
    if (!file || !outDir) throw new Error('usage: levni poster <spec.json> <out-dir>');
    const { renderPosters } = await import('../src/poster.mjs');
    const r = await renderPosters(JSON.parse(readFileSync(file, 'utf8')), outDir);
    console.log(`${r.files.length} posters + series.png -> ${outDir}`);
  } else if (cmd === 'list') {
    const q = (positional[0] || '').toLowerCase();
    const all = Object.values(loadProps()).sort((a, b) => a.name.localeCompare(b.name));
    const hits = q ? all.filter((p) => p.name.includes(q) || (p.aliases || []).some((a) => a.includes(q)) || (p.tags || []).some((t) => t.toLocaleLowerCase('tr').includes(q))) : all;
    for (const p of hits) console.log(`${p.name}  (${p.variants.length})  ${(p.tags || []).join(', ')}`);
    console.log(`${hits.length} props`);
  } else if (cmd === 'check') {
    const all = loadProps();
    const names = positional.length ? positional : Object.keys(all).sort();
    let bad = 0;
    for (const n of names) {
      const p = findProp(n);
      if (!p) { console.log(`${n}: unknown prop`); bad++; continue; }
      for (const e of validateProp(p)) { console.log(`${p.name}: ${e}`); bad++; }
      if (positional.length) for (const hint of lintProp(p)) console.log(`${p.name}: note: ${hint}`);
      p.variants.forEach((v, i) => {
        const m = measureVariant(v);
        const head = `${p.name}#${i}  size ${m.size ?? '-'}  centre (${m.cx ?? '-'},${m.cy ?? '-'})  colours ${(m.colors || []).join(',')}`;
        if (m.warnings.length) { bad++; console.log(`${head}\n   fix: ${m.warnings.join('; ')}`); } else if (positional.length) console.log(`${head}  ok`);
      });
    }
    console.log(bad ? `${bad} thing(s) to fix` : 'all ok');
  } else if (cmd === 'add') {
    const [file] = positional;
    if (!file) throw new Error('usage: levni add <file> [--dir <props folder>] [--sheet out.png]');
    const dir = resolve(opt('dir') || LIBRARY_DIR);
    mkdirSync(dir, { recursive: true });
    const done = [];
    let skipped = 0;
    for (const p of parseProps(readFileSync(file, 'utf8'))) {
      const errs = validateProp(p);
      if (!errs.length) {
        // every variant must also draw: a finite, non-empty ink box
        for (const [i, v] of p.variants.entries()) {
          try {
            const { svg, used } = await compose({ elements: [{ type: 'draw', paths: v.paths, x: 600, y: 336, size: 300 }] });
            const b = used[0];
            if (/NaN|undefined|Infinity/.test(svg) || !b || !(b.w > 0 && b.h > 0)) errs.push(`variant ${i}: draws nothing usable`);
          } catch (err) { errs.push(`variant ${i}: ${err.message}`); }
        }
      }
      if (errs.length) { skipped++; console.log(`skip ${p?.name ?? '(no name)'}: ${errs.join('; ')}`); continue; }
      for (const hint of lintProp(p)) console.log(`note ${p.name}: ${hint}`);
      const target = join(dir, `${p.name}.json`);
      const clean = { name: p.name, ...(p.category ? { category: p.category } : {}), tags: p.tags.map(String), ...(p.author ? { author: p.author } : {}), variants: p.variants.map((v) => ({ ...(v.note ? { note: v.note } : {}), paths: v.paths })) };
      if (existsSync(target)) {
        const cur = JSON.parse(readFileSync(target, 'utf8'));
        const seen = new Set(cur.variants.map((v) => JSON.stringify(v.paths)));
        const fresh = clean.variants.filter((v) => !seen.has(JSON.stringify(v.paths)));
        if (!fresh.length) { console.log(`same ${p.name}: already in the library`); continue; }
        cur.tags = [...new Set([...(cur.tags || []), ...clean.tags])];
        if (!cur.category && clean.category) cur.category = clean.category;
        cur.variants.push(...fresh);
        writeFileSync(target, JSON.stringify(cur, null, 1) + '\n');
        console.log(`more ${p.name}: +${fresh.length} variant(s)`);
      } else {
        writeFileSync(target, JSON.stringify(clean, null, 1) + '\n');
        console.log(`new  ${p.name}: ${clean.variants.length} variant(s)`);
      }
      clean.variants.forEach((v, i) => { const w = measureVariant(v).warnings; if (w.length) console.log(`   warn ${p.name}#${i}: ${w.join('; ')}`); });
      done.push(p.name);
    }
    console.log(`${done.length} added, ${skipped} skipped -> ${dir}`);
    if (opt('sheet') && done.length) {
      if (dir !== resolve(LIBRARY_DIR)) addPropDir(dir);
      const n = await sheet(opt('sheet'), [...new Set(done)]);
      console.log(`look at: ${opt('sheet')} (${n} variants)`);
    }
    if (skipped) process.exitCode = 1;
  } else if (cmd === 'judge') {
    const [sub, ...imgs] = positional;
    const adapter = opt('model') ? openrouter({ model: opt('model') }) : undefined;
    const brief = opt('brief') || '';
    if (sub === 'score' && imgs.length === 1) console.log(JSON.stringify(await judgeScore(imgs[0], { brief, adapter }), null, 2));
    else if (sub === 'pick' && imgs.length >= 2) console.log(JSON.stringify(await judgePick(imgs, { brief, adapter }), null, 2));
    else throw new Error('usage: levni judge score <image> --brief "..." | levni judge pick <image> <image> [...] --brief "..."');
  } else if (cmd === 'ghost') {
    const { ghostCli } = await import('../adapters/ghost/index.mjs');
    process.exitCode = await ghostCli(rest);
  } else if (cmd === 'mcp') {
    const { serve } = await import('../src/mcp.mjs');
    serve();
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
    tiles.push(await rasterize(svg));
  }
  if (!tiles.length) throw new Error('no props found');
  await sharp({ create: { width: 1200, height: 673 * tiles.length, channels: 3, background: '#F4F2EC' } })
    .composite(tiles.map((input, i) => ({ input, top: i * 673, left: 0 })))
    .png()
    .toFile(out);
  return list.length;
}

main().catch((err) => { console.error(`levni: ${err.message}`); process.exit(1); });
