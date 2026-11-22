#!/usr/bin/env node
// Turns filled pixel icons (24-unit grid, black evenodd paths and rects, in four cuts: <name>, thin-, solid-, glyph-)
// into Levni props, one prop per icon with the cuts as variants.
//   node tools/pixel-to-prop.mjs <icons dir> <props dir> [name ...]
// The icon is rasterised on a quarter-pixel grid and written back as merged rectangles, so the pixels stay crisp:
//  - outline cuts (regular, thin): pixels in ink, enclosed areas get a riso fill printed slightly off the line;
//  - filled cuts (solid, glyph): the silhouette in ink over an off-register accent copy, like a misprinted plate.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, outDir, ...only] = process.argv.slice(2);
if (!dir || !outDir) {
  console.error('usage: node tools/pixel-to-prop.mjs <icons dir> <props dir> [name ...]');
  process.exit(1);
}

const S = 4, N = 24 * S;                 // raster: 4 cells per icon pixel
const K = 3.5, OFF = 8;                  // icon 0..24 -> prop 8..92
const ACCENTS = ['coral', 'mustard', 'tone', 'green', 'tone-coral', 'tone-mustard'];
const CUTS = [['', 'regular'], ['thin-', 'thin'], ['solid-', 'solid'], ['glyph-', 'glyph']];
const r2 = (n) => Math.round(n * 100) / 100;

// polygon groups of an icon, one per element (even-odd inside a group, union across groups): path subpaths (absolute M/H/V/L/Z, plus relative h/v/l just in case) and rects (with rotate)
function polygons(svg) {
  const groups = [];
  for (const m of svg.matchAll(/<path\b[^>]*\sd="([^"]*)"/g)) {
    const polys = [];
    let x = 0, y = 0, cur = null;
    for (const [, c, args] of m[1].matchAll(/([MmHhVvLlZz])([^MmHhVvLlZz]*)/g)) {
      const n = (args.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/g) || []).map(Number);
      if (/[Zz]/.test(c)) { if (cur) polys.push(cur); cur = null; continue; }
      const step = /[HhVv]/.test(c) ? 1 : 2;
      for (let i = 0; i < n.length; i += step) {
        if (c === 'M' || c === 'L') { x = n[i]; y = n[i + 1]; }
        else if (c === 'm' || c === 'l') { x += n[i]; y += n[i + 1]; }
        else if (c === 'H') x = n[i]; else if (c === 'h') x += n[i];
        else if (c === 'V') y = n[i]; else if (c === 'v') y += n[i];
        if (/[Mm]/.test(c) && i === 0) { if (cur) polys.push(cur); cur = []; }
        cur.push([x, y]);
      }
    }
    if (cur) polys.push(cur);
    groups.push(polys);
  }
  for (const m of svg.matchAll(/<rect\b([^>]*)>/g)) {
    const a = (k) => { const v = m[1].match(new RegExp(`\\s${k}="([^"]*)"`)); return v ? parseFloat(v[1]) : 0; };
    if (/fill="white"/.test(m[1])) continue; // the clip frame
    const x = a('x'), y = a('y'), w = a('width'), h = a('height');
    let pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    const rot = m[1].match(/rotate\(([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\)/);
    if (rot) {
      const t = (+rot[1] * Math.PI) / 180, cx = +rot[2], cy = +rot[3];
      pts = pts.map(([px, py]) => [cx + (px - cx) * Math.cos(t) - (py - cy) * Math.sin(t), cy + (px - cx) * Math.sin(t) + (py - cy) * Math.cos(t)]);
    }
    groups.push([pts]);
  }
  return groups;
}

// even-odd raster of all polygons, sampled at cell centres
function raster(groups) {
  const g = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) {
    const py = (j + 0.5) / S;
    for (let i = 0; i < N; i++) {
      const px = (i + 0.5) / S;
      let any = 0;
      for (const polys of groups) {
        let inside = 0;
        for (const p of polys) for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
          const [xa, ya] = p[a], [xb, yb] = p[b];
          if ((ya > py) !== (yb > py) && px < ((xb - xa) * (py - ya)) / (yb - ya) + xa) inside ^= 1;
        }
        any |= inside;
      }
      g[j * N + i] = any;
    }
  }
  return g;
}

// enclosed empty cells (not reachable from the border), split into components; keep those of 4+ icon pixels
function holes(g) {
  const seen = new Uint8Array(N * N), out = [];
  const flood = (start) => {
    const stack = [start], cells = [];
    seen[start] = 1;
    while (stack.length) {
      const k = stack.pop(), x = k % N, y = (k - x) / N;
      cells.push(k);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const nk = ny * N + nx;
        if (!seen[nk] && !g[nk]) { seen[nk] = 1; stack.push(nk); }
      }
    }
    return cells;
  };
  for (let i = 0; i < N; i++) for (const k of [i, (N - 1) * N + i, i * N, i * N + N - 1]) if (!g[k] && !seen[k]) flood(k);
  for (let k = 0; k < N * N; k++) if (!g[k] && !seen[k]) {
    const cells = flood(k);
    if (cells.length >= 4 * S * S) out.push(cells);
  }
  return out;
}

// cells -> path of merged rectangles (runs per row, then stacked while identical)
function rects(mask, dx = 0) {
  const rows = [];
  for (let y = 0; y < N; y++) {
    const runs = [];
    for (let x = 0; x < N; x++) if (mask[y * N + x]) { const s = x; while (x + 1 < N && mask[y * N + x + 1]) x++; runs.push([s, x + 1]); }
    rows.push(runs);
  }
  const d = [], open = new Map();
  const close = (key, r) => {
    const [x0, x1] = key.split(',').map(Number);
    d.push(`M${r2((x0 / S) * K + OFF + dx)} ${r2((r.y0 / S) * K + OFF + dx)}h${r2(((x1 - x0) / S) * K)}v${r2(((r.y1 - r.y0) / S) * K)}h${r2((-(x1 - x0) / S) * K)}Z`);
  };
  for (let y = 0; y <= N; y++) {
    const keys = new Set((rows[y] || []).map((r) => r.join(',')));
    for (const [key, r] of open) if (!keys.has(key)) { close(key, r); open.delete(key); }
    for (const key of keys) if (open.has(key)) open.get(key).y1 = y + 1; else open.set(key, { y0: y, y1: y + 1 });
  }
  return d.join('');
}

const CATS = [
  ['money', /money|card|coin|dollar|euro|wallet|bank|briefcase|cart|shop|store|tag|receipt|chart|analytics|trending|percent|gift|bag/],
  ['music', /music|audio|volume|headphone|speaker|mic|radio|play|pause|stop|next|prev|skip|shuffle|repeat|record/],
  ['film', /video|film|movie|camera|clapper/],
  ['tv', /tv|cast|monitor|antenna/],
  ['books', /book|article|text|file|note|edit|pen|pencil|paint|draw|bookmark|clipboard|calendar|align|font|heading|bold|italic|underline|list|quote/],
  ['sport', /game|gamepad|trophy|dice|ball|flag|chess|puzzle|target/],
  ['nature', /sun|moon|cloud|rain|snow|leaf|tree|flower|drop|fire|bug|paw|cat|dog|weather|lightning|wind|planet|earth/],
  ['places', /home|house|building|map|pin|location|car|bus|train|plane|ship|anchor|bike|road|compass|globe|direction|route|garage|store/],
  ['health', /heart|health|human|user|avatar|mood|eye|hand|body|pill|first-aid|medical|accessibility|baby|face/],
  ['home', /lock|key|door|bed|lamp|bulb|light|chair|cup|coffee|trash|delete|archive|box|cut|scissors|glasses|umbrella|bell|clock|alarm|watch|battery|plug|power/],
  ['tech', /device|phone|mobile|laptop|computer|desktop|tablet|mouse|keyboard|wifi|bluetooth|signal|server|database|code|terminal|debug|bug|android|cloud|download|upload|share|link|layout|window|image|frame|grid|layer|cursor|zoom|search|settings|sliders|toggle|mail|message|chat|comment|inbox|send|reload|sync|login|logout|shield|4g|5g|4k|usb|sd|cpu|ram|qr|scan|print|save|copy|paste|ab-testing|at|attachment/],
];
const category = (name) => (CATS.find(([, re]) => re.test(name)) || ['symbols'])[0];

const files = new Set(readdirSync(dir));
const names = only.length ? only : [...files].filter((f) => f.endsWith('.svg') && !/^(thin|solid|glyph)-/.test(f)).map((f) => f.slice(0, -4)).sort();
let n = 0, variants = 0;
names.forEach((name, idx) => {
  const accent = ACCENTS[idx % ACCENTS.length];
  const words = name.replace(/-/g, ' ');
  const vs = [];
  for (const [pre, cut] of CUTS) {
    // the source spells one icon two ways (sort-alphabetic / sort-alpabetic)
    const file = [`${pre}${name}.svg`, `${pre}${name.replace('alphabetic', 'alpabetic')}.svg`].find((f) => files.has(f));
    if (!file) continue;
    const g = raster(polygons(readFileSync(join(dir, file), 'utf8')));
    const paths = [];
    if (cut === 'regular' || cut === 'thin') {
      const hs = holes(g);
      if (hs.length) {
        const m = new Uint8Array(N * N);
        for (const h of hs) for (const k of h) m[k] = 1;
        paths.push({ d: rects(m, 3), fill: accent, stroke: 'none' });
      }
    } else paths.push({ d: rects(g, 4), fill: accent, stroke: 'none' });
    paths.push({ d: rects(g), fill: 'ink', stroke: 'none' });
    vs.push({ note: `${words}, ${cut} pixel icon`, paths });
  }
  if (!vs.length) return;
  const prop = { name: `pixel-${name}`, category: category(name), tags: [words, `pixel ${words}`, 'pixel'], variants: vs };
  writeFileSync(join(outDir, `pixel-${name}.json`), JSON.stringify(prop, null, 1) + '\n');
  n++; variants += vs.length;
});
console.log(`${n} props, ${variants} variants -> ${outDir}`);
