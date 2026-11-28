// Branding posters: one brand spec becomes a series of portrait posters that share inks, type and a mark.
//   levni poster <spec.json> <out-dir>        writes poster-01.png … and series.png (a contact sheet)
//   { "brand": { "name": "Kumru", "tagline": "Slow coffee, fast mornings", "mark": "dove",
//                "inks": ["#14181F", "#1F3BE0", "#F0573A", "#F1EEE6"], "words": ["ROAST", "POUR", "SHARE"] } }
// Every poster is a normal Levni scene (expandPosters returns them), so an agent can print one, edit it and render it.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose } from './compose.mjs';
import { findProp } from './props.mjs';
import { rasterize } from './raster.mjs';

export const TEMPLATES = ['split', 'map', 'bauhaus', 'echo', 'camo', 'vertical', 'summit', 'launch'];
const W = 1200, H = 1600;
const HEX = /^#[0-9a-f]{6}$/i;

const lum = (h) => { const n = parseInt(h.slice(1), 16); const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255]; return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// inks: the darkest is the ink, the lightest the paper, the rest accents (house defaults fill gaps)
export function brandInks(list) {
  const given = (Array.isArray(list) ? list : []).filter((c) => HEX.test(c)).slice(0, 6);
  const all = given.length >= 3 ? given : [...given, '#14181F', '#1F3BE0', '#F0573A', '#F1EEE6'].slice(0, Math.max(4, given.length));
  const sorted = [...new Set(all.map((c) => c.toUpperCase()))].sort((a, b) => lum(a) - lum(b));
  const ink = sorted[0], paper = lum(sorted.at(-1)) > 200 ? sorted.at(-1) : '#F1EEE6';
  const accents = sorted.slice(1).filter((c) => c !== paper);
  const a1 = accents[0] || '#1F3BE0', a2 = accents[1] || '#F0573A', a3 = accents[2] || a1;
  // the accent that reads best as type on paper (pale accents stay for grounds)
  const strong = [a2, a1, a3].sort((x, y) => lum(x) - lum(y))[0];
  return { ink, paper, a1, a2, a3, strong: lum(strong) < 150 ? strong : ink, pale: mix(paper, a1, 0.18) };
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const T = (text, x, y, o = {}) => ({ type: 'type', text, x, y, ...o });
const code = (name, i) => {
  let h = 7;
  for (const ch of `${name}${i}`) h = (h * 31 + ch.codePointAt(0)) % 9973;
  const letters = (name.replace(/[^A-Za-z]/g, '').toUpperCase() + 'XX').slice(0, 2);
  return `${letters}${String(1000 + (h % 9000))}`;
};
// split a word for a two-weight kicker: SMART**CONTRACTS**
const kicker = (a, b) => `+ ${a}**${b}**`;
// a name shortened for a one-line kicker: whole words only, so nothing is cut mid-word ("YAVAŞ SAYFA", not "YAVAŞ SAYF")
const brief = (s, n) => (s.length <= n ? s : s.slice(0, n + 1).replace(/\s+\S*$/, '') || s.slice(0, n));

function scenes(b) {
  const k = brandInks(b.inks);
  const name = String(b.name || 'Levni').slice(0, 24);
  const tag = String(b.tagline || '').slice(0, 120);
  const words = (Array.isArray(b.words) && b.words.length ? b.words : ['NEW', 'BUILD', 'SHIP', 'CONNECT', 'GROW', 'SHARE', 'MAKE', 'GO'])
    .map((w) => String(w).toLocaleUpperCase(/[ğĞşŞıİ]/.test(w) ? 'tr' : 'en').slice(0, 14));
  const word = (i) => words[i % words.length];
  const mark = b.mark && findProp(b.mark) ? findProp(b.mark).name : null;
  const year = String(b.year || 2026);
  const credits = (color, i) => ({ type: 'furniture', color, credits: { left: `© ${year}`, centre: name, right: b.url || `${name.toLowerCase().replace(/[^a-z0-9]+/g, '')}.com` }, tag: { text: code(name, i), corner: 'tr', box: 'outline' } });
  const wrapTag = (s, n) => { const out = []; let line = ''; for (const w of s.split(/\s+/)) { if ((line + ' ' + w).trim().length > n) { out.push(line.trim()); line = w; } else line += ' ' + w; } if (line.trim()) out.push(line.trim()); return out.slice(0, 4).join('\n'); };
  const base = (bg, els) => ({ canvas: [W, H], finish: 'soft', seed: b.seed ?? 11, background: bg, elements: els });

  return {
    // top visual, bottom colour block with a two-weight kicker and a pixel headline
    split: (i) => base(k.pale, [
      { type: 'amtone', x: 0, y: 0, w: W, h: 1150, source: 'radial', cx: 820, cy: 330, radius: 900, from: 0.9, to: 0.05, cell: 14, angle: 45, colors: [k.a1] },
      ...(mark ? [{ type: 'amtone', source: 'prop', prop: mark, x: 560, y: 600, size: 760, cell: 10, angle: 15, colors: [k.ink] }] : []),
      { type: 'block', x: 0, y: 1150, w: W, h: 450, color: k.a2 },
      T(wrapTag(tag || name, 40), 70, 1205, { size: 22, leading: 1.35, color: k.paper }),
      T(kicker(brief(name.toUpperCase(), 16), word(i).slice(0, 10)), 70, 1300, { size: 40, weight: 300, boldFont: 'mono', boldWeight: 800, color: k.paper }),
      T(`${word(i + 1)}.`, 70, 1380, { w: 840, font: 'pixel', tracking: -0.04, color: k.paper }),
      T(code(name, i), 1130, 1535, { size: 20, font: 'mono', weight: 800, align: 'right', color: k.ink }),
      T('+', 1130, 1200, { size: 34, font: 'mono', weight: 800, align: 'right', color: k.paper }),
    ]),
    // dark header, dot-matrix world on the brand blue, big two-line name
    map: (i) => base(k.a1, [
      { type: 'block', x: 0, y: 0, w: W, h: 300, color: k.ink },
      { type: 'block', x: 70, y: 70, w: 44, h: 26, radius: 13, color: k.paper }, { type: 'block', x: 100, y: 70, w: 26, h: 26, radius: 13, outline: true, weight: 6, color: k.paper },
      T('What is new?', 70, 150, { size: 104, weight: 400, color: k.paper }),
      { type: 'dotmatrix', x: 70, y: 380, w: 1060, h: 620, mask: 'world', cell: 15, dot: 0.6, hollow: 0, filled: k.paper, faint: { color: mix(k.a1, k.paper, 0.25), size: 0.5 } },
      T(kicker(word(i), word(i + 1)), 70, 1080, { size: 34, font: 'mono', weight: 300, boldWeight: 800, color: k.paper }),
      T(name, 70, 1150, { w: 1060, h: 200, fit: 'box', weight: 400, tracking: -0.03, color: k.paper }),
      T(wrapTag(tag || 'Made with Levni.', 46), 70, 1400, { size: 26, font: 'mono', weight: 300, leading: 1.4, color: k.paper }),
    ]),
    // Bauhaus module grid with a slot for one heavy word
    bauhaus: (i) => base(k.paper, [
      { type: 'shapegrid', x: 50, y: 50, w: 1100, h: 1320, cols: 3, rows: 4, gap: 50, seed: (b.seed ?? 3) + i, modules: ['pill-left', 'pill-right', 'half-circle', 'quarter', 'square'], colors: [k.ink, k.a2], weights: [7, 1], spans: [{ col: 1, row: 2, cols: 2, rows: 1, module: 'blank' }], round: 1 },
      // the blank span is cells (1..2, 2): x 433..1150, y 734..1026 with these sizes
      T(word(i), 463, 760, { w: 660, h: 240, fit: 'box', font: 'black', color: k.ink }),
      T(wrapTag(tag || name, 70), 50, 1430, { size: 30, weight: 400, leading: 1.3, color: k.ink }),
    ]),
    // huge words above and below an echoed mark in a dark panel
    echo: (i) => base(k.paper, [
      T(word(i), 70, 80, { w: 1060, fit: 'box', h: 250, font: 'black', color: k.ink }),
      { type: 'block', x: 70, y: 400, w: 1060, h: 820, color: k.ink },
      { type: 'echo', ...(mark ? { prop: mark } : { shape: 'circle' }), x: 560, y: 810, size: 460, n: 9, dx: -26, dy: 0, from: mix(k.ink, k.paper, 0.25), to: k.paper, top: k.paper, outline: k.ink, weight: 4, solid: true },
      T(word(i + 1), 70, 1290, { w: 620, h: 220, fit: 'box', font: 'black', color: k.ink }),
      T(wrapTag(tag || name, 22), 1130, 1300, { size: 24, weight: 400, leading: 1.3, align: 'right', color: k.ink }),
    ]),
    // camouflage half, dithered half, a colour band with the headline
    camo: (i) => base(k.paper, [
      { type: 'camo', x: 0, y: 0, w: 590, h: 1150, colors: [k.a2], ground: k.ink, threshold: 0.48, scale: 0.008 },
      { type: 'dither', x: 600, y: 0, w: 600, h: 1150, colors: [k.a1, mix(k.a1, k.ink, 0.4)], mode: 'radial', cx: 700, cy: 450, radius: 700, from: 2, to: 0.1, cell: 7, matrix: 8 },
      { type: 'block', x: 0, y: 1150, w: W, h: 450, color: k.a3 === k.a1 ? '#2E8B57' : k.a3 },
      T(wrapTag(tag || name, 46), 70, 1205, { size: 22, leading: 1.35, color: k.ink }),
      T(kicker(name.toUpperCase().slice(0, 10), word(i)), 70, 1300, { size: 40, weight: 300, boldFont: 'mono', boldWeight: 800, color: k.ink }),
      T(`${word(i + 2)}.`, 70, 1380, { w: 900, font: 'pixel', tracking: -0.04, color: k.ink }),
      T('++++', 1130, 1205, { size: 30, font: 'mono', weight: 800, align: 'right', color: k.ink }),
    ]),
    // rotated heavy words over faint orbits, pill stripes at the foot
    vertical: (i) => base(k.a2, [
      { type: 'spiro', x: 600, y: 760, size: 1300, R: 5, r: 3, d: 5, turns: 3, color: mix(k.a2, k.paper, 0.35), weight: 2.5 },
      ...[0, 1, 2, 3].map((j) => T(`${word(i + j)}.`, 170 + j * 240, 1240 - (j % 2) * 160, { size: 150, font: 'black', rotate: -90, color: k.ink })),
      { type: 'block', x: -40, y: 1330, w: 820, h: 110, radius: 55, color: mix(k.a2, k.paper, 0.45) },
      { type: 'block', x: 340, y: 1450, w: 900, h: 110, radius: 55, color: mix(k.a2, k.paper, 0.3) },
      T(name.toUpperCase(), 1130, 1370, { size: 22, font: 'mono', weight: 700, tracking: 0.3, align: 'right', color: k.ink }),
    ]),
    // framed poster: pixel word, mono lines, a slanted block with a halftone landscape
    summit: (i) => base(k.paper, [
      { type: 'furniture', color: k.a2, border: { inset: 36, gap: 18, dot: 4, fade: 'down' }, corners: { style: 'squares', size: 18, inset: 56 } },
      T('what’s new?', 110, 120, { size: 24, font: 'mono', weight: 500, color: k.strong }),
      T(word(i).toLocaleLowerCase(/[ğĞşŞıİ]/.test(word(i)) ? 'tr' : 'en'), 110, 175, { w: 880, h: 190, fit: 'box', font: 'pixel', tracking: -0.04, color: k.strong }),
      T(wrapTag(tag ? tag.toUpperCase() : name.toUpperCase(), 18), 110, 420, { size: 64, font: 'mono', weight: 500, leading: 1.15, color: k.ink }),
      { type: 'block', x: 110, y: 800, w: 980, h: 620, skew: -20, color: k.a2 },
      // inside the parallelogram (skew -20 shifts the top edge right and the bottom edge left by ~113 px)
      { type: 'amtone', x: 240, y: 830, w: 720, h: 560, source: 'terrain', cell: 11, angle: 45, colors: [k.ink] },
      T(`© ${year}`, 110, 1480, { size: 20, font: 'mono', color: k.ink }),
    ]),
    // dark launch poster: a halftone glow and the mark, toner grain
    launch: (i) => base(k.ink, [
      { type: 'amtone', x: 600, y: 700, r: 470, source: 'radial', cell: 12, angle: 30, colors: [k.a2] },
      ...(mark ? [{ type: 'amtone', source: 'prop', prop: mark, x: 600, y: 700, size: 560, cell: 9, angle: 75, colors: [k.paper] }] : []),
      T(word(i), 70, 1230, { w: 760, h: 150, fit: 'box', font: 'black', color: k.paper }),
      T(wrapTag(tag || name, 40), 70, 1455, { size: 26, font: 'mono', weight: 300, leading: 1.4, color: k.paper }),
      credits(k.paper, i),
      { type: 'grain', mode: 'toner', colors: [k.paper, k.a2], opacity: 0.5, density: 1.2 },
    ]),
  };
}

// brand → list of scenes. `only` picks templates; `count` repeats with the next words.
export function expandPosters(spec = {}) {
  const b = spec.brand || spec;
  if (!b.name) throw new Error('poster needs a brand "name"');
  if (b.mark && !findProp(b.mark)) throw new Error(`brand mark "${b.mark}" is not a prop (see: levni list)`);
  const t = scenes(b);
  const pick = (Array.isArray(spec.only) && spec.only.length ? spec.only : TEMPLATES).filter((n) => t[n]);
  if (!pick.length) throw new Error(`unknown templates: use ${TEMPLATES.join(', ')}`);
  const n = Math.max(1, Math.min(24, Number(spec.count) || pick.length));
  return Array.from({ length: n }, (_, i) => ({ template: pick[i % pick.length], scene: clean(t[pick[i % pick.length]](i)) }));
}
// drop undefined fields so the scene prints as clean JSON
const clean = (o) => JSON.parse(JSON.stringify(o));

// render a series: files in outDir, plus series.png (contact sheet). Returns { files, sheet }.
export async function renderPosters(spec, outDir) {
  const list = expandPosters(spec);
  mkdirSync(outDir, { recursive: true });
  const files = [], thumbs = [];
  for (const [i, p] of list.entries()) {
    const { svg } = await compose(p.scene);
    const png = await rasterize(svg);
    const file = join(outDir, `poster-${String(i + 1).padStart(2, '0')}-${p.template}.png`);
    writeFileSync(file, png);
    files.push(file);
    thumbs.push(await sharp(png).resize(360).png().toBuffer());
  }
  const cols = Math.min(4, thumbs.length), rows = Math.ceil(thumbs.length / cols), tw = 360, th = 480, g = 24;
  const sheet = await sharp({ create: { width: cols * tw + (cols + 1) * g, height: rows * th + (rows + 1) * g, channels: 3, background: '#E9E6DE' } })
    .composite(thumbs.map((input, i) => ({ input, left: g + (i % cols) * (tw + g), top: g + Math.floor(i / cols) * (th + g) }))).png().toBuffer();
  writeFileSync(join(outDir, 'series.png'), sheet);
  return { files, sheet, scenes: list };
}
