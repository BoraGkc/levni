#!/usr/bin/env node
// Turns outline icons from an open set (24-unit grid, stroke-based SVG: Tabler, Lucide, Iconoir…) into Levni props.
//   node tools/icon-to-prop.mjs <icons dir> <out.json> name[:category] ...
// Each icon becomes a prop in the 0..100 box: every stroke is inked in "ink", and closed shapes get a riso
// fill (an accent colour printed slightly off the line, like a misregistered plate). Review with `levni add --sheet`.
// The source set's licence must allow derivatives; record it in library/NOTICE.md.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { flattenPath } from '../src/ink.mjs';

const [dir, out, ...specs] = process.argv.slice(2);
if (!dir || !out || !specs.length) {
  console.error('usage: node tools/icon-to-prop.mjs <icons dir> <out.json> name[:category] ...');
  process.exit(1);
}

const GRID = 24, LO = 2, HI = 22;          // icon content lives in 2..22
const K = 84 / (HI - LO), OFF = 8 - LO * K; // map it to 8..92
const ACCENTS = ['coral', 'mustard', 'tone', 'green', 'tone-coral', 'tone-mustard'];
const r1 = (n) => Math.round(n * 10) / 10;

// Rewrite path data: scale every coordinate, translate absolute ones; arcs keep flags and rotation.
function transform(d, dx = 0, dy = 0) {
  const toks = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
  const outT = [];
  let cmd = '', argi = 0;
  const arity = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
  for (const t of toks) {
    if (/[a-zA-Z]/.test(t)) { cmd = t; argi = 0; outT.push(t); continue; }
    const C = cmd.toUpperCase(), rel = cmd !== C, n = parseFloat(t);
    const k = argi % arity[C];
    argi++;
    let v;
    if (C === 'A') {
      if (k === 0 || k === 1) v = n * K;                     // radii
      else if (k === 2 || k === 3 || k === 4) v = n;          // rotation, flags
      else v = rel ? n * K : n * K + OFF + (k === 5 ? dx : dy);
    } else if (C === 'H') v = rel ? n * K : n * K + OFF + dx;
    else if (C === 'V') v = rel ? n * K : n * K + OFF + dy;
    else { const isX = k % 2 === 0; v = rel ? n * K : n * K + OFF + (isX ? dx : dy); }
    outT.push(String(r1(v)));
  }
  return outT.join(' ').replace(/ ([a-zA-Z]) /g, ' $1').replace(/([a-zA-Z]) /g, '$1');
}

// Shapes Tabler and friends use besides <path>
function shapes(svg) {
  const ds = [];
  const attr = (tag, a) => { const m = tag.match(new RegExp(`\\s${a}="([^"]*)"`)); return m ? parseFloat(m[1]) : 0; };
  for (const tag of svg.match(/<(path|circle|ellipse|rect|line|polyline|polygon)\b[^>]*>/g) || []) {
    if (/stroke="none"/.test(tag)) continue; // the transparent 24x24 frame
    const kind = tag.match(/^<(\w+)/)[1];
    if (kind === 'path') ds.push(tag.match(/\sd="([^"]*)"/)[1]);
    else if (kind === 'circle' || kind === 'ellipse') {
      const cx = attr(tag, 'cx'), cy = attr(tag, 'cy'), rx = attr(tag, kind === 'circle' ? 'r' : 'rx'), ry = kind === 'circle' ? rx : attr(tag, 'ry');
      ds.push(`M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`);
    } else if (kind === 'rect') {
      const x = attr(tag, 'x'), y = attr(tag, 'y'), w = attr(tag, 'width'), h = attr(tag, 'height');
      ds.push(`M${x} ${y}H${x + w}V${y + h}H${x}Z`);
    } else if (kind === 'line') ds.push(`M${attr(tag, 'x1')} ${attr(tag, 'y1')}L${attr(tag, 'x2')} ${attr(tag, 'y2')}`);
    else {
      const pts = tag.match(/points="([^"]*)"/)[1].trim().split(/[\s,]+/);
      ds.push(`M${pts.slice(0, 2).join(' ')}L${pts.slice(2).join(' ')}${kind === 'polygon' ? 'Z' : ''}`);
    }
  }
  return ds;
}

// rough size of a closed shape, to fill the big ones only
const span = (d) => {
  const n = (d.match(/-?\d*\.?\d+/g) || []).map(Number);
  const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
  return Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};

const props = specs.map((spec, idx) => {
  const [name, category = 'symbols'] = spec.split(':');
  const svg = readFileSync(join(dir, `${name}.svg`), 'utf8');
  const ds = shapes(svg);
  const accent = ACCENTS[idx % ACCENTS.length];
  const fills = [], lines = [];
  for (const d of ds) {
    // closed when it ends with Z or comes back to where it started (Tabler rarely writes Z)
    const polys = flattenPath(d, 0.5);
    const p = polys[0];
    const closed = polys.length === 1 && p && p.length > 2 && (p.closed || Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < 0.6);
    if (closed && span(d) >= 5) fills.push({ d: transform(d, 3, 3), fill: fills.length ? 'paper' : accent, stroke: 'none' });
    lines.push({ d: transform(d), fill: 'none', stroke: 'ink', weight: 8 });
  }
  return {
    name,
    category,
    tags: [name.replace(/-/g, ' ')],
    variants: [{ note: `${name.replace(/-/g, ' ')}, line icon redrawn from Tabler Icons (MIT)`, paths: [...fills, ...lines] }],
    source: 'Tabler Icons (MIT)',
  };
});
writeFileSync(out, JSON.stringify(props, null, 1));
console.log(`${props.length} props -> ${out}`);
