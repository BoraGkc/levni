// Display type as vector paths. librsvg cannot load web fonts, so every glyph is drawn from a bundled font file
// (fontkit: kerning, variable weights) and written as a <path>. The picture looks the same on every machine.
//   { "type": "type", "text": "BRIDGE.", "x": 60, "y": 1500, "size": 220, "font": "pixel", "color": "paper" }
// Fonts (SIL OFL 1.1, in fonts/): grotesk = Space Grotesk 300–700, black = Archivo Black, mono = JetBrains Mono 100–800,
// pixel = Departure Mono. `font` may also be a path to your own .ttf/.otf.
// Inline weight: **bold** and __light__ switch the weight (or `boldFont` / `lightFont`) inside a line: "SMART**CONTRACTS**".
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const fontkit = require('fontkit');
const DIR = new URL('../fonts/', import.meta.url).pathname;

export const FONTS = {
  grotesk: { file: 'SpaceGrotesk-Variable.ttf', weight: 500, bold: 700, light: 300 },
  black: { file: 'ArchivoBlack-Regular.ttf' },
  mono: { file: 'JetBrainsMono-Variable.ttf', weight: 400, bold: 800, light: 200 },
  pixel: { file: 'DepartureMono-Regular.otf' },
};
const ALIAS = { sans: 'grotesk', display: 'grotesk', serif: 'grotesk', heavy: 'black', code: 'mono', bitmap: 'pixel' };

const cache = new Map();
function load(name) {
  const key = String(name || 'grotesk');
  if (cache.has(key)) return cache.get(key);
  const spec = FONTS[ALIAS[key] || key];
  let file = spec ? join(DIR, spec.file) : resolve(key); // join: bundlers may drop DIR's trailing slash
  if (!existsSync(file)) throw new Error(`unknown font "${key}": use ${Object.keys(FONTS).join(', ')} or a .ttf/.otf path`);
  const font = fontkit.create(readFileSync(file));
  const out = { font, spec: spec || {}, variants: new Map() };
  cache.set(key, out);
  return out;
}

// a fontkit font at one weight (variable fonts only; static fonts ignore it)
function atWeight(f, w) {
  const axes = f.font.variationAxes || {};
  if (!axes.wght || w == null) return f.font;
  const wt = Math.max(axes.wght.min, Math.min(axes.wght.max, Number(w)));
  if (!f.variants.has(wt)) f.variants.set(wt, f.font.getVariation({ wght: wt }));
  return f.variants.get(wt);
}

const r1 = (n) => Math.round(n * 10) / 10;

// split a line into runs by **bold** / __light__ markers
function runs(line) {
  const out = [];
  const re = /(\*\*|__)/g;
  let style = 'base', last = 0, m;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push({ text: line.slice(last, m.index), style });
    const s = m[1] === '**' ? 'bold' : 'light';
    style = style === s ? 'base' : s;
    last = re.lastIndex;
  }
  if (last < line.length) out.push({ text: line.slice(last), style });
  return out;
}

// Shape one line at size 1 (units per em = 1): glyph paths with x offsets, and the advance width.
function shapeLine(line, o) {
  const pieces = [];
  let x = 0;
  for (const run of runs(line)) {
    const fname = run.style === 'bold' ? o.boldFont || o.font : run.style === 'light' ? o.lightFont || o.font : o.font;
    const f = load(fname);
    const w = run.style === 'bold' ? o.boldWeight ?? f.spec.bold ?? o.weight : run.style === 'light' ? o.lightWeight ?? f.spec.light ?? o.weight : o.weight ?? f.spec.weight;
    const font = atWeight(f, w);
    const s = 1 / font.unitsPerEm;
    const glyphs = font.layout(run.text, o.features || {});
    glyphs.glyphs.forEach((g, i) => {
      const p = glyphs.positions[i];
      pieces.push({ path: g.path, s, x: x + p.xOffset * s, y: p.yOffset * s });
      x += p.xAdvance * s + o.tracking;
    });
  }
  if (pieces.length) x -= o.tracking; // no tracking after the last glyph
  const f0 = atWeight(load(o.font), o.weight ?? load(o.font).spec.weight);
  return { pieces, width: Math.max(0, x), ascent: f0.ascent / f0.unitsPerEm, capHeight: (f0.capHeight || f0.ascent * 0.7) / f0.unitsPerEm, descent: -f0.descent / f0.unitsPerEm };
}

// Lay out a text block. Returns { d, box: [x, y, w, h], size } with the path data at final size.
export function layoutType(e) {
  const locale = e.locale || (/[ğĞşŞıİ]/.test(e.text || '') ? 'tr' : 'en');
  let text = String(e.text ?? '').slice(0, 2000);
  if (e.upper) text = text.toLocaleUpperCase(locale);
  const lines = text.split('\n').slice(0, 60);
  const o = { font: e.font || 'grotesk', boldFont: e.boldFont, lightFont: e.lightFont, weight: e.weight, boldWeight: e.boldWeight, lightWeight: e.lightWeight, tracking: Number(e.tracking) || 0, features: e.features };
  const shaped = lines.map((l) => shapeLine(l, o));
  const leading = Number(e.leading) || 0.92;
  const capTop = e.trim !== false; // block top at the cap height of the first line, so type sits exactly where it is put
  const m = shaped[0] || { ascent: 0.9, capHeight: 0.7, descent: 0.2 };
  const natW = Math.max(0.001, ...shaped.map((s) => s.width));
  const natH = (capTop ? m.capHeight : m.ascent) + (lines.length - 1) * leading + (e.descenders ? m.descent : 0);
  // size: explicit, or fitted to a box (fit "width" fills w, "box" fits w and h)
  let size = Number(e.size) || 120;
  if (e.w && (e.fit === 'width' || e.fit === 'box' || (e.fit == null && !e.size))) size = e.w / natW;
  if (e.h && e.fit === 'box') size = Math.min(size, e.h / natH);
  size = Math.max(4, Math.min(2400, size));
  const W = natW * size, H = natH * size;
  const align = e.align || 'left';
  const boxW = e.w || W;
  // without a box, x is the anchor: left edge, centre or right edge of the widest line
  const shift = e.w ? 0 : align === 'center' ? -W / 2 : align === 'right' ? -W : 0;
  const parts = [];
  shaped.forEach((s, i) => {
    const lx = shift + (align === 'center' ? (boxW - s.width * size) / 2 : align === 'right' ? boxW - s.width * size : 0);
    const base = ((capTop ? m.capHeight : m.ascent) + i * leading) * size;
    for (const p of s.pieces) {
      const k = p.s * size;
      parts.push(p.path.transform(k, 0, 0, -k, lx + p.x * size, base - p.y * size).toSVG());
    }
  });
  return { d: parts.join(''), w: boxW, h: e.h && e.fit === 'box' ? e.h : H, size, shift };
}

function typeAsset(e, { c }) {
  const { d, w, h, size, shift } = layoutType(e);
  const y = Number(e.y) || 0, x0 = Number(e.x) || 0, x = x0 + shift;
  const rot = Number(e.rotate) || 0;
  // vertical type: rotate the whole block about its top-left corner (-90 reads bottom to top)
  const tf = `translate(${r1(x0)} ${r1(y)})${rot ? ` rotate(${rot})` : ''}`;
  const fill = c(e.color, '#14181F');
  const stroke = e.outline ? ` fill="none" stroke="${c(e.outline === true ? e.color : e.outline, fill)}" stroke-width="${r1(e.outlineWeight ?? Math.max(1.5, size / 60))}" stroke-linejoin="round"` : ` fill="${fill}"`;
  let svg = `<path transform="${tf}" d="${d}"${stroke}${e.opacity != null ? ` opacity="${e.opacity}"` : ''}/>`;
  // type stays sharp: drawn above the crayon filter unless it asks to be inked like the drawings
  if (e.ink !== true) svg = `<!--crisp-->${svg}<!--/crisp-->`;
  // bounding box for the critic (rotation by quarter turns only)
  const q = ((Math.round(rot / 90) % 4) + 4) % 4;
  const bbox = q === 0 ? [x, y, w, h] : q === 1 ? [x - h, y, h, w] : q === 2 ? [x - w, y - h, w, h] : [x, y - w, h, w];
  return { svg, bbox };
}

// A crisp colour block (no hand wobble): poster panels, bars, stripes. `radius`, `skew` (degrees, x), `rotate`.
// `corners` [tl, tr, br, bl] rounds single corners (pills and half-pills: radius = half the short side).
function blockAsset(e, { c }) {
  const x = Number(e.x) || 0, y = Number(e.y) || 0, w = Math.max(0, Number(e.w) || 0), h = Math.max(0, Number(e.h) || 0);
  const rmax = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = (Array.isArray(e.corners) ? e.corners : [e.radius || 0, e.radius || 0, e.radius || 0, e.radius || 0]).map((v) => Math.max(0, Math.min(rmax, Number(v) || 0)));
  const d = `M${r1(x + tl)} ${r1(y)}H${r1(x + w - tr)}${tr ? `A${r1(tr)} ${r1(tr)} 0 0 1 ${r1(x + w)} ${r1(y + tr)}` : ''}V${r1(y + h - br)}${br ? `A${r1(br)} ${r1(br)} 0 0 1 ${r1(x + w - br)} ${r1(y + h)}` : ''}H${r1(x + bl)}${bl ? `A${r1(bl)} ${r1(bl)} 0 0 1 ${r1(x)} ${r1(y + h - bl)}` : ''}V${r1(y + tl)}${tl ? `A${r1(tl)} ${r1(tl)} 0 0 1 ${r1(x + tl)} ${r1(y)}` : ''}Z`;
  const cx = x + w / 2, cy = y + h / 2;
  const tf = [e.rotate ? `rotate(${Number(e.rotate)} ${r1(cx)} ${r1(cy)})` : '', e.skew ? `translate(${r1(cx)} ${r1(cy)}) skewX(${Number(e.skew)}) translate(${r1(-cx)} ${r1(-cy)})` : ''].filter(Boolean).join(' ');
  const paint = e.outline ? `fill="none" stroke="${c(e.color, '#14181F')}" stroke-width="${r1(Number(e.weight) || 3)}"` : `fill="${c(e.color, '#14181F')}"`;
  return { svg: `<path d="${d}" ${paint}${tf ? ` transform="${tf}"` : ''}${e.opacity != null ? ` opacity="${e.opacity}"` : ''}/>`, bbox: [x, y, w, h] };
}

export const TYPE_ASSETS = { type: typeAsset, block: blockAsset };
