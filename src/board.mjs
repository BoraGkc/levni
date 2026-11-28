// Brand boards: one image, many tiles (mark, wordmark, palette, pattern, OG card ...), optionally framed
// as a mockup (browser window, business card, tote bag, phone). See docs/board.md.
//   import { renderBoard, expandBrand } from 'levni';
//   await renderBoard({ brand: { name, tagline, mark, inks } }, 'board.png');   // one small spec, nine tiles
//   await renderBoard(fullSpec, 'board.png', { baseDir });                       // or place every tile yourself
// Every tile that holds a scene is rendered by the normal compose() at the tile's own pixel size, so a board is
// deterministic exactly like a scene is. A scene authored for any canvas or format is reflowed into its tile.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { rasterize } from './raster.mjs';
import { compose, COLORS } from './compose.mjs';
import { resolveCanvas } from './formats.mjs';
import { findProp } from './props.mjs';

const MOCKUPS = ['none', 'browser', 'card', 'tote', 'phone'];

// librsvg ignores @font-face, so only fonts installed on the machine render. Each stack lists what ships with
// macOS first, then Windows, then the usual Linux packages (fonts-dejavu, fonts-liberation), then the generic name.
const FONTS = {
  serif: "Georgia, 'Times New Roman', 'Liberation Serif', 'DejaVu Serif', serif",
  sans: "'Helvetica Neue', Helvetica, Arial, 'Liberation Sans', 'DejaVu Sans', sans-serif",
  mono: "Menlo, Consolas, 'Liberation Mono', 'DejaVu Sans Mono', 'Courier New', monospace",
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clampN = (v, lo, hi, d) => (Number.isFinite(+v) && v !== null && v !== '' && v !== undefined ? Math.min(hi, Math.max(lo, +v)) : d);
const HEX = /^#([0-9a-f]{6})$/i;
const col = (c, fb = '#F4F2EC') => (c == null ? fb : COLORS[c] ?? (HEX.test(c) ? c : fb));
const INK = '#1C1A16';

const rgb = (hex) => { const m = HEX.exec(hex); return m ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [128, 128, 128]; };
const toHex = (a) => '#' + a.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
function luminance(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const onColor = (bg) => (luminance(col(bg)) > 0.4 ? INK : '#FFFFFF');
const fam = (f = 'serif') => FONTS[f] ?? `'${String(f).replace(/['"<>&]/g, '')}', ${FONTS.sans}`;
const svgDoc = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const roundMask = (w, h, r) => svgDoc(w, h, `<rect width="${w}" height="${h}" rx="${r}" fill="#000"/>`);
const blank = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } });

async function rounded(png, w, h, r) {
  return sharp(png).composite([{ input: roundMask(w, h, r), blend: 'dest-in' }]).png().toBuffer();
}

function loadScene(s, baseDir) {
  if (typeof s === 'string') return JSON.parse(readFileSync(resolve(baseDir, s), 'utf8'));
  return s;
}

// A scene drawn at the tile's pixel size. A scene authored for another canvas (its own `canvas` or `format`,
// else the normal 1200x673) is reflowed into the tile (formats.mjs), so changing the grid needs no scene edits.
// fit: "none" (or scene.reflow === false) draws the scene on the tile canvas as written instead.
async function sceneAt(scene, w, h, tileSeed, overrides = {}, fit = 'auto') {
  const W = Math.max(64, Math.round(w)), H = Math.max(64, Math.round(h));
  const authored = resolveCanvas(scene);
  const spec = { seed: tileSeed, ...scene, ...overrides, canvas: [W, H] };
  delete spec.format;
  if (fit !== 'none' && scene.reflow !== false && (authored.w !== W || authored.h !== H)) {
    spec.reflow = true;
    spec.reflowFrom = scene.reflowFrom ?? [authored.w, authored.h];
  }
  const { svg } = await compose(spec);
  const img = sharp(await rasterize(svg));
  const [ow, oh] = [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
  return (ow === W && oh === H ? img : img.resize(ow, oh)).png().toBuffer(); // tiny tiles: the 64 px floor is scaled down
}

// --- text measuring: the real rasteriser tells how wide a line is, so any font fits ---------------

const measured = new Map();
async function inkBox(text, family, weight, italic, spacing) {
  const key = [text, family, weight, italic, spacing].join('|');
  if (measured.has(key)) return measured.get(key);
  const W = Math.min(8000, Math.round(text.length * 90 + 400)), H = 260, base = 170;
  const svg = svgDoc(W, H, `<text x="100" y="${base}" font-family="${family}" font-size="100" font-weight="${weight}" font-style="${italic ? 'italic' : 'normal'}" letter-spacing="${spacing}" fill="#000">${esc(text)}</text>`);
  const { data, info } = await sharp(svg).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, x1 = -1, y0 = info.height, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const box = x1 < 0 ? { l: 0, r: 100, t: 20, b: 0 } : { l: x0 - 100, r: x1 + 1 - 100, t: base - y0, b: y1 + 1 - base }; // t above baseline, b below, at 100 px
  measured.set(key, box);
  return box;
}

// --- built-in tile types, each draws an SVG body for a (w, h) tile ------------------------------

function paletteTile(t, w, h) {
  const list = (Array.isArray(t.colors) ? t.colors : []).slice(0, 12).map((c) => (typeof c === 'string' ? { hex: c } : c)).filter((c) => c && (HEX.test(c.hex) || COLORS[c.hex]));
  if (!list.length) throw new Error('palette tile needs "colors": a list of "#RRGGBB" or { hex, name?, weight? }');
  const vertical = (t.layout ?? (w >= h ? 'strip' : 'stack')) === 'stack';
  const pad = clampN(t.pad, 0, Math.min(w, h) / 4, 0);
  const weights = list.map((c) => clampN(c.weight, 0.1, 20, 1)), total = weights.reduce((a, b) => a + b, 0);
  let pos = 0, out = '';
  const span = (vertical ? h : w) - pad * 2;
  list.forEach((c, i) => {
    const len = (span * weights[i]) / total;
    const x = vertical ? pad : pad + pos, y = vertical ? pad + pos : pad;
    const rw = vertical ? w - pad * 2 : len, rh = vertical ? len : h - pad * 2;
    const hex = col(c.hex), fg = onColor(hex);
    out += `<rect x="${x}" y="${y}" width="${rw + 0.5}" height="${rh + 0.5}" fill="${hex}"/>`;
    const fs = Math.max(11, Math.min(15, Math.min(rw, rh) * 0.14));
    const label = String(c.hex).toUpperCase();
    if (vertical) {
      out += `<text x="${x + 18}" y="${y + rh / 2 + fs * 0.35}" font-family="${FONTS.mono}" font-size="${fs}" fill="${fg}">${esc(label)}</text>`;
      if (c.name) out += `<text x="${x + rw - 18}" y="${y + rh / 2 + fs * 0.35}" text-anchor="end" font-family="${FONTS.mono}" font-size="${fs}" fill="${fg}" opacity=".7">${esc(c.name)}</text>`;
    } else {
      const bx = x + 14, by = y + rh - 16;
      out += `<text x="${bx}" y="${by}" font-family="${FONTS.mono}" font-size="${fs}" fill="${fg}" transform="rotate(${rw < 90 ? -90 : 0} ${bx} ${by})">${esc(label)}</text>`;
      if (c.name && rw >= 120) out += `<text x="${bx}" y="${by - fs * 1.6}" font-family="${FONTS.mono}" font-size="${fs}" fill="${fg}" opacity=".7">${esc(c.name)}</text>`;
    }
    pos += len;
  });
  return out;
}

async function typeTile(t, w, h) {
  const bg = col(t.bg, '#F4F2EC'), fg = col(t.color, onColor(bg));
  const lines = String(t.text ?? 'Brand').slice(0, 300).split('\n').slice(0, 6).map((l) => l.trim()).filter(Boolean);
  if (!lines.length) lines.push('Brand');
  const family = fam(t.family), serif = (t.family ?? 'serif') === 'serif';
  const wt = clampN(t.weight, 100, 900, serif ? 400 : t.family === 'mono' ? 500 : 700);
  const track = clampN(t.tracking, -10, 60, 0); // thousandths... as hundredths of an em
  const spacing = (track / 100) * 100;
  const boxes = await Promise.all(lines.map((l) => inkBox(l, family, wt, !!t.italic, spacing)));
  const left = t.align === 'left';
  const leading = 1.08;
  const maxW = Math.max(...boxes.map((b) => b.r - b.l)); // at 100 px
  const hasSub = !!t.sub;
  const subSize = Math.max(11, Math.min(15, w * 0.022));
  const subSpace = hasSub ? subSize * 3.2 : 0;
  const availW = w * (left ? 0.78 : 0.8), availH = Math.max(40, h - subSpace) * 0.62;
  const blockAt100 = (lines.length - 1) * 100 * leading + boxes[0].t + boxes[boxes.length - 1].b;
  const fit = Math.min((availW / maxW) * 100, (availH / blockAt100) * 100);
  const size = clampN(t.size, 8, 900, Math.max(8, fit));
  const k = size / 100;
  const blockH = blockAt100 * k;
  const total = blockH + subSpace;
  let y = (h - total) / 2 + boxes[0].t * k;
  let out = `<rect width="${w}" height="${h}" fill="${bg}"/>`;
  lines.forEach((l, i) => {
    const b = boxes[i];
    const x = left ? w * 0.1 - b.l * k : w / 2 - ((b.l + b.r) / 2) * k;
    out += `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-family="${family}" font-size="${size.toFixed(2)}" font-weight="${wt}" font-style="${t.italic ? 'italic' : 'normal'}" letter-spacing="${(spacing * k).toFixed(2)}" fill="${fg}">${esc(l)}</text>`;
    y += size * leading;
  });
  if (hasSub) {
    const sy = (h - total) / 2 + blockH + subSize * 2.1;
    const anchor = left ? 'start' : 'middle';
    out += `<text x="${left ? w * 0.1 : w / 2}" y="${sy.toFixed(2)}" text-anchor="${anchor}" font-family="${FONTS.mono}" font-size="${subSize}" letter-spacing="1.5" fill="${fg}" opacity=".72">${esc(String(t.sub).slice(0, 120).toUpperCase())}</text>`;
  }
  return out;
}

// --- mockups ------------------------------------------------------------------------------------
// Each returns { frame (svg body under the content), over? (svg body above the content), rect: {x,y,w,h} of the content,
// radius, clipBottom? }. `sc` carries the shadow colour and the outline ink.

// Two soft layers: a tight contact shadow and a wide ambient one, tinted from the tile colour so it never looks grey-dirty.
const shadowDefs = (id, sc, k = 1) => `<filter id="${id}a" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="${(16 * k).toFixed(1)}" stdDeviation="${(15 * k).toFixed(1)}" flood-color="${sc}" flood-opacity=".30"/></filter>
  <filter id="${id}b" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="${(2.5 * k).toFixed(1)}" stdDeviation="${(2.4 * k).toFixed(1)}" flood-color="${sc}" flood-opacity=".30"/></filter>`;
const shadowed = (id, shape) => `<g filter="url(#${id}a)">${shape}</g><g filter="url(#${id}b)">${shape}</g>`;

function fitAspect(aw, ah, ratio) {
  let w = aw, h = aw / ratio;
  if (h > ah) { h = ah; w = ah * ratio; }
  return { w: Math.max(8, Math.floor(w)), h: Math.max(8, Math.floor(h)) };
}

function mockBrowser(area, m, sc) {
  const chrome = 34, pad = Math.round(Math.min(area.w, area.h) * 0.07) + Math.round(Math.abs(m.tilt || 0) * 1.5);
  const W = area.w - pad * 2, H = area.h - pad * 2;
  const x = area.x + pad, y = area.y + pad;
  const url = String(m.url ?? 'example.com').slice(0, 60);
  const win = `<rect x="${x}" y="${y}" width="${W}" height="${H}" rx="12" fill="#FFFFFF"/>`;
  const frame = `<defs>${shadowDefs('sh', sc.shadow)}</defs>${shadowed('sh', win)}
    <path d="M${x} ${y + chrome} V${y + 12} Q${x} ${y} ${x + 12} ${y} H${x + W - 12} Q${x + W} ${y} ${x + W} ${y + 12} V${y + chrome} Z" fill="#ECE9E1"/>
    <rect x="${x}" y="${y + chrome - 1}" width="${W}" height="1" fill="#D3CFC4"/>
    ${['#F26B5B', '#F2C14E', '#6DBE7A'].map((c, i) => `<circle cx="${x + 18 + i * 17}" cy="${y + chrome / 2}" r="5" fill="${c}"/>`).join('')}
    <rect x="${x + 78}" y="${y + 7}" width="${Math.max(40, Math.min(W - 98, 340))}" height="${chrome - 14}" rx="${(chrome - 14) / 2}" fill="#FFFFFF" stroke="#D3CFC4"/>
    <text x="${x + 94}" y="${y + chrome / 2 + 4}" font-family="${FONTS.mono}" font-size="11.5" fill="#6b675d">${esc(url)}</text>`;
  const over = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="#D3CFC4"/>`;
  return { frame, over, rect: { x, y: y + chrome, w: W, h: H - chrome }, radius: 0, clipBottom: 12 };
}

function mockCard(area, m, sc) {
  const tilt = m.tilt || 0;
  const pad = Math.round(Math.min(area.w, area.h) * 0.08 * (1 + Math.abs(tilt) * 0.06));
  const { w, h } = fitAspect(area.w - pad * 2, area.h - pad * 2, clampN(m.ratio, 1, 3, 1.75));
  const x = Math.round(area.x + (area.w - w) / 2), y = Math.round(area.y + (area.h - h) / 2);
  const back = m.stack !== false
    ? shadowed('sh', `<g transform="rotate(-7 ${x + w / 2} ${y + h / 2})"><rect x="${x + 6}" y="${y + 6}" width="${w}" height="${h}" rx="6" fill="${col(m.backColor, '#E8E2D2')}"/></g>`) : '';
  const frame = `<defs>${shadowDefs('sh', sc.shadow, 0.9)}</defs>${back}${shadowed('sh', `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="#FFFFFF"/>`)}`;
  const over = `<rect x="${x + 0.5}" y="${y + 0.5}" width="${w - 1}" height="${h - 1}" rx="6" fill="none" stroke="#000" stroke-opacity=".08"/>`;
  return { frame, over, rect: { x, y, w, h }, radius: 6 };
}

function mockPhone(area, m, sc) {
  const pad = Math.round(Math.min(area.w, area.h) * 0.07) + Math.round(Math.abs(m.tilt || 0) * 1.5);
  const { w, h } = fitAspect(area.w - pad * 2, area.h - pad * 2, 9 / 19);
  const x = Math.round(area.x + (area.w - w) / 2), y = Math.round(area.y + (area.h - h) / 2);
  const bez = Math.max(8, Math.round(w * 0.035)), r = Math.round(w * 0.14);
  const frame = `<defs>${shadowDefs('sh', sc.shadow, 1.1)}</defs>${shadowed('sh', `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#1C1A16"/>`)}
    <rect x="${x + 1}" y="${y + 1}" width="${w - 2}" height="${h - 2}" rx="${r - 1}" fill="none" stroke="#FFFFFF" stroke-opacity=".14"/>`;
  const over = `<rect x="${x + w / 2 - w * 0.17}" y="${y + bez + 4}" width="${w * 0.34}" height="${Math.max(10, w * 0.055)}" rx="${Math.max(5, w * 0.027)}" fill="#1C1A16"/>
    <rect x="${x + w / 2 - w * 0.17}" y="${y + h - bez - 9}" width="${w * 0.34}" height="4" rx="2" fill="#1C1A16" opacity=".55"/>`;
  return { frame, over, rect: { x: x + bez, y: y + bez, w: w - bez * 2, h: h - bez * 2 }, radius: Math.max(4, r - bez) };
}

function mockTote(area, m, sc) {
  const bagCol = col(m.bagColor, '#EFE7D4');
  const pad = Math.round(Math.min(area.w, area.h) * 0.06);
  const handle = Math.round(area.h * 0.22);
  const { w, h } = fitAspect(area.w - pad * 2, area.h - pad * 2 - handle, 0.92);
  const x = Math.round(area.x + (area.w - w) / 2), y = Math.round(area.y + pad + handle + (area.h - pad * 2 - handle - h) / 2);
  const hx1 = x + w * 0.27, hx2 = x + w * 0.73, hw = w * 0.2;
  const strap = `M${hx1} ${y + 4} C${hx1 - hw * 0.1} ${y - handle * 1.25} ${hx2 + hw * 0.1} ${y - handle * 1.25} ${hx2} ${y + 4}`;
  const ink = sc.ink;
  const handles = `<path d="${strap}" fill="none" stroke="${ink}" stroke-width="${Math.max(10, w * 0.04)}" stroke-linecap="round" opacity=".9"/>
    <path d="${strap}" fill="none" stroke="${bagCol}" stroke-width="${Math.max(5, w * 0.02)}" stroke-linecap="round"/>`;
  const outline = `M${x} ${y} H${x + w} L${x + w + 4} ${y + h} H${x - 4} Z`;
  const body = `<path d="${outline}" fill="url(#bag)" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${x} ${y + 10} H${x + w}" stroke="${ink}" stroke-width="1.4" stroke-dasharray="5 4" opacity=".45"/>
    <path d="M${x - 4} ${y + h - 10} H${x + w + 4}" stroke="${ink}" stroke-width="1.4" stroke-dasharray="5 4" opacity=".45"/>`;
  const defs = `${shadowDefs('sh', sc.shadow, 0.9)}<linearGradient id="bag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${mix(bagCol, '#FFFFFF', 0.28)}"/><stop offset=".55" stop-color="${bagCol}"/><stop offset="1" stop-color="${mix(bagCol, '#6b5a3c', 0.14)}"/></linearGradient>`;
  const frame = `<defs>${defs}</defs>${handles}${shadowed('sh', body)}`;
  const ps = Math.round(Math.min(w, h) * 0.78);
  return { frame, rect: { x: Math.round(x + (w - ps) / 2), y: Math.round(y + (h - ps) / 2 + 6), w: ps, h: ps }, radius: 0, bare: true, bagCol };
}

const MOCK = { browser: mockBrowser, card: mockCard, phone: mockPhone, tote: mockTote };

// --- board --------------------------------------------------------------------------------------

export function resolveBoardGrid(spec) {
  const cv = Array.isArray(spec.canvas) ? spec.canvas : [1800, 1200];
  const W = Math.round(clampN(cv[0], 200, 6000, 1800)), H = Math.round(clampN(cv[1], 200, 6000, 1200));
  const g = spec.grid ?? {};
  const cols = Math.round(clampN(g.cols, 1, 12, 4)), rows = Math.round(clampN(g.rows, 1, 12, 3));
  const gap = clampN(spec.gap, 0, 200, 24), margin = clampN(spec.margin, 0, 400, gap);
  const cw = (W - margin * 2 - gap * (cols - 1)) / cols, ch = (H - margin * 2 - gap * (rows - 1)) / rows;
  if (cw < 24 || ch < 24) throw new Error('board grid leaves tiles under 24 px: use fewer cols/rows, a smaller gap, or a bigger canvas');
  return { W, H, cols, rows, gap, margin, rect(at) {
    const [c, r, cs = 1, rs = 1] = at.map((n) => Math.floor(+n));
    if (![c, r, cs, rs].every(Number.isFinite) || c < 0 || r < 0 || cs < 1 || rs < 1 || c + cs > cols || r + rs > rows) throw new Error(`tile at [${at}] is outside the ${cols}x${rows} grid`);
    return { x: Math.round(margin + c * (cw + gap)), y: Math.round(margin + r * (ch + gap)), w: Math.round(cw * cs + gap * (cs - 1)), h: Math.round(ch * rs + gap * (rs - 1)) };
  } };
}

async function renderTile(t, rect, i, spec, baseDir) {
  const { w, h } = rect;
  const radius = clampN(t.radius ?? spec.radius, 0, Math.min(w, h) / 2, 18);
  const mock = t.mockup ?? 'none';
  if (!MOCKUPS.includes(mock)) throw new Error(`tile ${i}: unknown mockup "${mock}" (use ${MOCKUPS.join(', ')})`);
  const type = t.type ?? 'scene';
  if (!['scene', 'palette', 'type'].includes(type)) throw new Error(`tile ${i}: unknown type "${type}" (scene, palette, type)`);
  const scene = type === 'scene' ? loadScene(t.scene, baseDir) : null;
  if (type === 'scene' && (!scene || typeof scene !== 'object')) throw new Error(`tile ${i}: scene tile needs "scene" (an object or a path to a scene JSON)`);
  const tileBg = col(t.bg, mock === 'none' && type === 'scene' ? col(scene.background, '#F4F2EC') : '#EDE8DB');
  const overlay = type === 'scene' && mock === 'none';
  const capH = t.caption && !overlay ? 30 : 0;
  const parts = [];
  let base = `<rect width="${w}" height="${h}" fill="${tileBg}"/>`;

  if (type === 'palette') {
    base = `<rect width="${w}" height="${h}" fill="${tileBg}"/>${paletteTile(t, w, h - capH)}`;
  } else if (type === 'type') {
    const bg = col(t.bg, '#F4F2EC');
    base = `<rect width="${w}" height="${h}" fill="${bg}"/>${await typeTile({ ...t, bg }, w, h - capH)}`;
  } else {
    const seed = (scene.seed ?? spec.seed ?? 1) + Math.round(clampN(t.seedOffset, -1e6, 1e6, 0));
    const ov = {};
    if (spec.style && !scene.style) ov.style = spec.style;
    if (spec.finish && !scene.finish) ov.finish = spec.finish;
    if (Number.isFinite(spec.t) && scene.t == null) ov.t = spec.t;
    if (mock === 'none') {
      parts.push({ input: await sceneAt(scene, w, h, seed, ov, t.fit), left: 0, top: 0 });
    } else {
      const area = { x: 0, y: 0, w, h: h - capH };
      const tilt = clampN(t.tilt, -12, 12, 0);
      const sc = { shadow: mix(tileBg, '#000000', 0.62), ink: col(spec.ink, INK) };
      const m = MOCK[mock](area, { ...t, tilt }, sc);
      const tiny = m.rect.w < 16 || m.rect.h < 16; // a mockup squeezed to nothing: frame only
      const content = tiny ? null : await sceneAt(scene, m.rect.w, m.rect.h, seed, { ...ov, ...(m.bagCol && !scene.background ? { background: 'none' } : {}) }, t.fit);
      let c = content;
      if (tiny) c = null;
      else if (m.radius) c = await rounded(c, m.rect.w, m.rect.h, m.radius);
      else if (m.clipBottom) {
        const r = m.clipBottom;
        c = await sharp(c).composite([{ input: svgDoc(m.rect.w, m.rect.h, `<path d="M0 0H${m.rect.w}V${m.rect.h - r}Q${m.rect.w} ${m.rect.h} ${m.rect.w - r} ${m.rect.h}H${r}Q0 ${m.rect.h} 0 ${m.rect.h - r}Z" fill="#000"/>`), blend: 'dest-in' }]).png().toBuffer();
      }
      // the mockup is its own transparent layer so it can be tilted as one piece
      // (it spans the whole tile, caption strip included, so shadows and the tilt are never cut off)
      const layers = [{ input: svgDoc(w, h, m.frame), left: 0, top: 0 }, ...(c ? [{ input: c, left: m.rect.x, top: m.rect.y }] : [])];
      if (m.over) layers.push({ input: svgDoc(w, h, m.over), left: 0, top: 0 });
      let layer = await blank(w, h).composite(layers).png().toBuffer();
      if (tilt) {
        const rot = await sharp(layer).rotate(tilt, { background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' }).png().toBuffer({ resolveWithObject: true });
        const left = Math.max(0, Math.floor((rot.info.width - w) / 2)), top = Math.max(0, Math.floor((rot.info.height - h) / 2));
        layer = await sharp(rot.data).extract({ left, top, width: Math.min(w, rot.info.width - left), height: Math.min(h, rot.info.height - top) }).png().toBuffer();
      }
      parts.push({ input: layer, left: 0, top: 0 });
    }
  }
  if (t.caption) {
    const bgForCap = type === 'scene' ? (overlay ? col(t.captionBg ?? scene.background, '#F4F2EC') : tileBg) : col(t.bg, '#F4F2EC');
    const fg = t.captionColor ? col(t.captionColor) : onColor(bgForCap);
    const ch = capH || 30, cy = overlay ? h - ch : h - capH;
    parts.push({ input: svgDoc(w, ch, `<text x="18" y="${ch - 10}" font-family="${FONTS.mono}" font-size="11" letter-spacing="1.4" fill="${fg}" opacity=".7">${esc(String(t.caption).slice(0, 60).toUpperCase())}</text>`), left: 0, top: cy });
  }
  const png = await sharp(svgDoc(w, h, base)).composite(parts).png().toBuffer();
  return rounded(png, w, h, radius);
}

// spec: { canvas:[w,h], background, gap, margin, radius, seed, style?, finish?, ink?, t?, quantize?, grid:{cols,rows}, tiles:[{at:[col,row,cs,rs] | rect:[x,y,w,h], ...}] }
// or { brand: { name, tagline, mark, inks, ... } }: expandBrand() fills in the whole board (fields you add next to `brand` win).
export async function renderBoard(spec, out, { baseDir = process.cwd() } = {}) {
  if (spec?.brand) spec = { ...expandBrand(spec.brand), ...Object.fromEntries(Object.entries(spec).filter(([k]) => k !== 'brand')) };
  if (!Array.isArray(spec?.tiles) || !spec.tiles.length) throw new Error('board needs "tiles" (or a "brand": { name, mark, inks })');
  if (spec.tiles.length > 60) throw new Error('a board holds at most 60 tiles');
  const grid = resolveBoardGrid(spec);
  const bg = col(spec.background, '#E4DECF');
  const comps = [];
  for (const [i, t] of spec.tiles.entries()) {
    const rect = Array.isArray(t.rect)
      ? { x: Math.round(clampN(t.rect[0], 0, grid.W, 0)), y: Math.round(clampN(t.rect[1], 0, grid.H, 0)), w: Math.round(clampN(t.rect[2], 24, grid.W, 200)), h: Math.round(clampN(t.rect[3], 24, grid.H, 200)) }
      : grid.rect(t.at ?? [0, 0, 1, 1]);
    comps.push({ input: await renderTile(t, rect, i, spec, baseDir), left: rect.x, top: rect.y });
  }
  let img = sharp(svgDoc(grid.W, grid.H, `<rect width="${grid.W}" height="${grid.H}" fill="${bg}"/>`)).composite(comps);
  // quantize: a 256-colour PNG (about a third of the size, grain and edges stay clean at quality 100)
  const sheet = await (spec.quantize ? sharp(await img.png().toBuffer()).png({ palette: true, quality: 100, colours: 256, effort: 10 }) : img.png()).toBuffer();
  if (out) writeFileSync(out, sheet);
  return { bytes: sheet.length, width: grid.W, height: grid.H, png: sheet };
}

// --- brand shortcut -----------------------------------------------------------------------------
// expandBrand({ name, tagline, mark, inks, ... }) -> a full 9-tile board spec (a plain JSON object you can edit):
// mark, wordmark, web (browser), palette, social card, tote, sticker, pattern, business card.
//   name      brand name (required)
//   tagline   one line, shown on the wordmark, web hero, social card and card
//   mark      a prop name or tag (see `levni list`), the symbol of the brand (required)
//   inks      1-5 colours as "#RRGGBB" (or a house colour name). The first is the signature; the darkest
//             becomes the ground, a very light one becomes the paper. Missing accents get a house default
//   font      wordmark face: "serif" (default, italic), "sans" or "mono"
//   url       shown in the browser bar, social card and business card (default: name.com)
//   person    { name, role }: the business card is for a person instead of the brand
//   props     up to 3 more prop names for the web page's product row (default: the mark in three colourways)
//   seed, finish ("crayon" | "soft"), captions (false hides the tile labels)

const slug = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/ı/g, 'i').replace(/[^a-z0-9]+/g, '') || 'brand';
const hashSeed = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return (h >>> 0) % 900 + 20; };
function wrapWords(text, maxChars, maxLines = 3) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = [];
  let cur = '';
  for (const wd of words) {
    if (cur && (cur + ' ' + wd).length > maxChars) { lines.push(cur); cur = wd; } else cur = cur ? cur + ' ' + wd : wd;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const rest = lines.splice(maxLines - 1).join(' '); lines.push(rest); }
  return lines;
}
// the label face is mono: one glyph is 0.6 em wide plus the 1 px letter-spacing
const labelW = (n, size) => n * (size * 0.6 + 1);
const fitSize = (text, avail, max, min = 12) => Math.max(min, Math.min(max, Math.floor((avail / Math.max(1, String(text).length) - 1) / 0.6)));
function fitLines(text, avail, max, min, maxLines) {
  for (let size = max; size >= min; size -= 2) {
    const lines = wrapWords(text, Math.max(4, Math.floor(avail / (size * 0.6 + 1))), maxLines);
    if (lines.length <= maxLines && lines.every((l) => labelW(l.length, size) <= avail)) return { lines, size };
  }
  return { lines: wrapWords(text, Math.max(4, Math.floor(avail / (min * 0.6 + 1))), maxLines), size: min };
}
const MONO_PAPER = { blue: 'paper', coral: 'paper', mustard: 'paper', green: 'paper', tone: 'paper', 'tone-coral': 'paper', 'tone-green': 'paper', 'tone-mustard': 'paper', dark: 'ink' };
const MONO_DEEP = { coral: 'blue', mustard: 'blue', green: 'blue', tone: 'blue', 'tone-coral': 'blue', 'tone-green': 'blue', 'tone-mustard': 'blue', dark: 'ink' };

export function expandBrand(brand = {}) {
  const name = String(brand.name ?? '').trim().slice(0, 40);
  if (!name) throw new Error('brand needs a "name"');
  if (!brand.mark) throw new Error('brand needs a "mark": a prop name (see: levni list)');
  const prop = findProp(brand.mark);
  if (!prop) throw new Error(`brand mark "${brand.mark}" is not a prop (see: levni list ${String(brand.mark).slice(0, 20)})`);
  const mark = prop.name;
  const extra = (Array.isArray(brand.props) ? brand.props : []).slice(0, 3).map((n) => {
    const p = findProp(n);
    if (!p) throw new Error(`brand prop "${n}" is not a prop (see: levni list)`);
    return p.name;
  });
  const tagline = String(brand.tagline ?? '').trim().slice(0, 90);
  const inksIn = (Array.isArray(brand.inks) ? brand.inks : []).slice(0, 5).map((c) => {
    const hex = HEX.test(c) ? c.toUpperCase() : COLORS[c] && COLORS[c] !== 'none' ? COLORS[c].toUpperCase() : null;
    if (!hex) throw new Error(`brand inks: "${c}" is not a #RRGGBB colour`);
    return hex;
  });
  // roles: deep (grounds, text), accent, highlight, paper
  const light = inksIn.filter((c) => luminance(c) > 0.7), rest = inksIn.filter((c) => luminance(c) <= 0.7);
  const paper = light[0] ?? '#F6F0E4';
  const sig = rest[0] ?? '#2D4A7C';
  const darkest = [...rest].sort((a, b) => luminance(a) - luminance(b))[0] ?? sig;
  const deep = luminance(darkest) <= 0.2 ? darkest : mix(darkest, '#10100E', 0.55);
  const others = rest.filter((c) => c !== deep);
  const defaults = ['#E8734A', '#F0B84A'];
  const accent = others[0] ?? defaults[0];
  const highlight = others[1] ?? (accent === defaults[1] ? defaults[0] : defaults[1]);
  const green = others[2] ?? '#2F7D57';
  const inkC = mix(deep, '#0E0E0C', 0.45);
  const tone = mix(deep, paper, 0.58);
  const style = { blue: deep, coral: accent, mustard: highlight, green, paper, ink: inkC, tone, white: mix(paper, '#FFFFFF', 0.6) };
  const seed = Math.round(clampN(brand.seed, 1, 1e6, hashSeed(name + mark)));
  const finish = brand.finish === 'soft' ? 'soft' : undefined;
  const url = String(brand.url ?? `${slug(name)}.com`).slice(0, 50);
  const font = ['serif', 'sans', 'mono'].includes(brand.font) ? brand.font : 'serif';
  const cap = (s) => (brand.captions === false ? undefined : s);
  const person = brand.person && typeof brand.person === 'object' ? { name: String(brand.person.name ?? '').slice(0, 30), role: String(brand.person.role ?? '').slice(0, 30) } : null;

  const markEl = (x, y, size, to, extraEl = {}) => ({ type: 'prop', name: mark, x, y, size, recolor: to, ...extraEl });
  const lbl = (text, x, y, size, color, o = {}) => ({ type: 'label', text, x, y, size, color, ...o });
  const upperName = name.toUpperCase();

  // mark: ground, sun, symbol (800 x 800)
  const markScene = { canvas: [800, 800], seed: seed + 1, background: 'blue', elements: [
    { type: 'disc', x: 400, y: 400, r: 290, color: 'mustard' },
    markEl(400, 408, 500, MONO_PAPER),
  ] };

  // social card (og 1200 x 630)
  const { lines, size: hs } = fitLines(tagline || name, 660, 76, 34, 3);
  const ogScene = { format: 'og', seed: seed + 2, background: 'mustard', elements: [
    { type: 'panel', x: 790, y: 0, w: 410, h: 630, color: 'blue' },
    markEl(995, 305, 330, MONO_PAPER),
    lbl(upperName, 64, 96, 26, 'ink'),
    ...lines.map((l, i) => lbl(l, 64, 315 + (i - (lines.length - 1) / 2) * hs * 1.24, hs, i === lines.length - 1 && lines.length > 1 ? 'blue' : 'ink', { upper: false })),
    lbl(url.toUpperCase(), 64, 560, 18, 'ink'),
  ] };

  // landing page (1100 x 1000): a hero card on paper and a row of products
  // the mark sits at x 770 and can be 350 wide (left edge 595): words start at 160 and must end before it
  const hero = fitLines(tagline || name, 410, 34, 22, 2), heroLines = hero.lines, heroSize = hero.size;
  const prods = [0, 1, 2].map((i) => extra[i] ?? null);
  const landing = { canvas: [1100, 1000], seed: seed + 3, background: 'paper', elements: [
    { type: 'panel', x: 115, y: 60, w: 870, h: 520, color: 'blue' }, // under 80% of the width: part of the page, not a full-bleed ground
    markEl(770, 320, 350, MONO_PAPER),
    ...heroLines.map((l, i) => lbl(l, 160, 150 + i * 42, heroSize, 'paper')),
    lbl(name, 160, 345, fitSize(name, 410, 130, 56), 'paper', { upper: false }),
    lbl('Discover  ->', 160, 470, 32, 'coral'),
    ...[200, 550, 900].flatMap((x, i) => [
      { type: 'disc', x, y: 800, r: 118, color: ['coral', 'mustard', 'blue'][i] },
      prods[i] ? { type: 'prop', name: prods[i], x, y: 800, size: 170 } : markEl(x, 804, 140, i === 1 ? MONO_DEEP : MONO_PAPER),
    ]),
  ] };

  // tote print (800 x 800), soft and printed in the deep ink
  const toteScene = { canvas: [800, 800], seed: seed + 4, finish: 'soft', grain: 0, elements: [
    markEl(400, 310, 540, MONO_DEEP),
    lbl(name, 400, 660, fitSize(name, 700, 96, 36), 'blue', { anchor: 'middle', upper: false }),
  ] };

  const stickerScene = { canvas: [800, 800], seed: seed + 5, background: 'paper', elements: [
    { type: 'disc', x: 400, y: 375, r: 305, color: 'coral', outline: 'ink' },
    { type: 'badge', x: 400, y: 375, size: 545, color: 'paper' },
    markEl(400, 372, 350, MONO_PAPER),
  ] };

  const sx = [150, 400, 650], sy = [150, 370, 590];
  const patternMarks = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    if ((r + c) % 2) continue; // a checker of five marks: room to breathe, same rhythm at any tile size
    patternMarks.push(markEl(sx[c], sy[r], 210, MONO_PAPER, c === 2 ? { flip: true } : {}));
  }
  const patternScene = { canvas: [800, 800], seed: seed + 6, background: 'blue', elements: [
    { type: 'halftone', x: 0, y: 0, w: 800, h: 800, color: 'tone', mode: 'linear', gap: 22 },
    ...patternMarks,
  ] };

  // business card (1.75:1)
  const who = person?.name
    ? [lbl(person.name, 400, 275, fitSize(person.name, 600, 62, 30), 'ink', { upper: false }), lbl((person.role || name).toUpperCase(), 400, 335, 28, 'blue')]
    : [lbl(name, 400, 285, fitSize(name, 600, 84, 36), 'ink', { upper: false }), ...(tagline ? [lbl(tagline, 400, 350, fitSize(tagline, 600, 28, 14), 'blue')] : [])];
  const cardScene = { canvas: [1050, 600], seed: seed + 7, background: 'paper', finish: 'soft', grain: 0, elements: [
    { type: 'panel', x: 0, y: 0, w: 330, h: 600, color: 'blue' },
    markEl(165, 300, 230, MONO_PAPER),
    ...who,
    lbl(person?.name ? `${slug(person.name).slice(0, 14)}@${url}`.toUpperCase() : url.toUpperCase(), 400, 520, 26, 'ink'),
  ] };

  const fontOpts = font === 'serif' ? { family: 'serif', italic: true } : font === 'sans' ? { family: 'sans', weight: 800, tracking: -2 } : { family: 'mono', weight: 600 };
  const palette = [
    { hex: deep, name: 'Primary', weight: 2 },
    { hex: paper, name: 'Paper', weight: 1.5 },
    { hex: accent, name: 'Accent', weight: 1.3 },
    { hex: highlight, name: 'Highlight', weight: 1.3 },
    { hex: inkC, name: 'Ink', weight: 0.7 },
  ];
  const bg = mix(paper, '#000000', 0.12);
  return {
    canvas: [1800, 1200], background: bg, gap: 24, grid: { cols: 6, rows: 4 }, seed,
    style, ink: inkC, ...(finish ? { finish } : {}),
    tiles: [
      { at: [0, 0, 2, 2], scene: markScene, caption: cap('Mark') },
      { at: [2, 0, 2, 1], type: 'type', text: name, ...fontOpts, sub: tagline || undefined, bg: paper, color: deep, caption: cap('Wordmark') },
      { at: [4, 0, 2, 2], scene: landing, mockup: 'browser', url, bg: accent, caption: cap('Web') },
      { at: [2, 1, 2, 1], type: 'palette', layout: 'strip', colors: palette },
      { at: [0, 2, 3, 2], scene: ogScene, caption: cap('Social card') },
      { at: [3, 2, 1, 2], scene: toteScene, mockup: 'tote', bagColor: mix(paper, '#D8C9A6', 0.35), bg: highlight, caption: cap('Tote') },
      { at: [4, 2, 1, 1], scene: stickerScene, bg: paper, caption: cap('Sticker') },
      { at: [5, 2, 1, 1], scene: patternScene, caption: cap('Pattern') },
      { at: [4, 3, 2, 1], scene: cardScene, mockup: 'card', tilt: -3, bg: deep, caption: cap('Card') },
    ],
  };
}
