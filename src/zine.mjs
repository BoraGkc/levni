// Levni Zine: a small magazine made of Levni scenes. Pages come from a few templates (cover, text, grid, list, code,
// scene, back) or any scene you write; out come the pages as images, a PDF to read or print, and the classic
// eight-page fold-up zine on one A4 sheet (fold, one cut, fold again).
//   import { renderZine } from '@levni/levni';
//   await renderZine(JSON.parse(readFileSync('examples/zine-01.json')), 'zine-01');
//   -> zine-01/p01.png … , zine-01/zine.pdf (A5 pages), zine-01/fold.pdf + fold.png (one A4 sheet, 8 pages)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose, critique } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { layoutType } from './type.mjs';

export const ZINE_PAGE = [874, 1240]; // A5 proportions (1 : √2), 150 dpi
const [W, H] = ZINE_PAGE, M = 64;
export const ZINE_KINDS = ['cover', 'text', 'grid', 'list', 'code', 'scene', 'back'];

// inks per look: a zine is printed in two or three riso colours
const INKS = {
  riso: { ground: 'paper', ink: 'ink', accent: 'coral', second: 'blue', tone: 'tone-mustard', soft: '#6B6680' },
  indigo: { ground: '#4B2FD6', ink: '#F4F2EC', accent: '#D6E521', second: '#F4F2EC', tone: '#3A22B8', soft: '#C9C2F5' },
};

// break a paragraph into lines that fit a width, measured with the real font
export function wrap(text, { size, font = 'grotesk', width, weight, gap = false }) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && layoutType({ text: next, size, font, weight, fit: 'none' }).w > width) { out.push(line); line = word; } else line = next;
    }
    out.push(line);
    if (gap) out.push('');
  }
  if (gap) out.pop();
  return out.join('\n');
}

const T = (text, x, y, o) => ({ type: 'type', text: String(text), x, y, ...o });

// the running foot: issue name left, page number right
const foot = (z, n, c) => [
  T(`${z.name || 'LEVNI ZINE'} ${z.issue ? `NO. ${z.issue}` : ''}`.trim(), M, H - 52, { size: 16, font: 'mono', weight: 700, tracking: 0.08, color: c.soft }),
  T(String(n).padStart(2, '0'), W - M, H - 52, { size: 16, font: 'mono', weight: 700, align: 'right', color: c.soft }),
];
const head = (p, c, y = 96) => {
  const els = [];
  if (p.kicker) els.push(T(String(p.kicker).toUpperCase(), M, y, { size: 18, font: 'mono', weight: 700, tracking: 0.1, color: c.accent }));
  if (p.title) {
    const t = wrap(p.title, { size: 64, font: 'black', width: W - 2 * M });
    els.push(T(t, M - 2, y + 44, { size: 64, font: 'black', color: c.ink, leading: 0.98 }));
    return { els, y: y + 44 + t.split('\n').length * 63 + 34 };
  }
  return { els, y: y + 44 };
};

function pageScene(p, z, n) {
  const c = INKS[p.look || z.look] || INKS.riso;
  const base = { canvas: [W, H], seed: (z.seed || 7) + n, finish: p.finish || z.finish || 'crayon', background: c.ground, ...(z.style ? { style: z.style } : {}) };
  const els = [];
  const kind = p.kind || (p.scene ? 'scene' : 'text');
  if (kind === 'scene') {
    const band = p.caption ? [{ type: 'panel', x: 0, y: H - 200, w: W, h: 200, color: 'paper' }, T(wrap(p.caption, { size: 22, width: W - 2 * M }), M, H - 166, { size: 22, color: 'ink', leading: 1.3 })] : [];
    return { ...base, ...p.scene, canvas: [W, H], elements: [...(p.scene.elements || []), ...band, ...foot(z, n, p.caption ? INKS.riso : c)] };
  }
  if (kind === 'cover') {
    els.push({ type: 'panel', x: 0, y: 0, w: W, h: 560, color: c.second === 'blue' ? 'blue' : c.tone });
    els.push({ type: 'halftone', x: 420, y: 120, w: 454, h: 440, color: c.second === 'blue' ? 'tone' : c.accent, mode: 'radial', gap: 18 });
    els.push(T(`${z.name || 'LEVNI ZINE'}`, M, 72, { size: 22, font: 'mono', weight: 700, tracking: 0.14, color: c.second === 'blue' ? 'paper' : c.accent }));
    els.push(T(`NO. ${z.issue || '01'}`, W - M, 72, { size: 22, font: 'mono', weight: 700, align: 'right', color: c.second === 'blue' ? 'paper' : c.accent }));
    els.push({ type: 'disc', x: W / 2, y: 420, r: 190, color: 'mustard' });
    els.push({ type: 'prop', name: p.mark || 'tulip', x: W / 2, y: 410, size: 330, shadow: true });
    const t = wrap(p.title || z.title || '', { size: 96, font: 'black', width: W - 2 * M });
    els.push(T(t, M - 4, 700, { size: 96, font: 'black', color: c.ink, leading: 0.94 }));
    const ty = 700 + t.split('\n').length * 90 + 40;
    if (p.subtitle) els.push(T(wrap(p.subtitle, { size: 28, width: W - 2 * M }), M, ty, { size: 28, color: c.soft, leading: 1.25 }));
    els.push({ type: 'block', x: M, y: H - 120, w: W - 2 * M, h: 4, color: c.accent });
    els.push(T(p.date || z.date || '', M, H - 82, { size: 20, font: 'mono', weight: 700, tracking: 0.06, color: c.ink }));
    els.push(T('levni.dev/zine', W - M, H - 82, { size: 20, font: 'mono', weight: 700, align: 'right', color: c.accent }));
    return { ...base, elements: els };
  }
  const h = head(p, c);
  els.push(...h.els);
  let y = h.y;
  if (kind === 'text') {
    const size = p.size || 27;
    const body = wrap(p.body || '', { size, width: W - 2 * M, gap: true });
    els.push(T(body, M, y, { size, color: c.ink, leading: 1.38 }));
    y += body.split('\n').length * size * 1.38 + 30;
    if (p.mark) els.push({ type: 'prop', name: p.mark, x: W - M - 110, y: Math.min(H - 220, Math.max(y + 110, H - 300)), size: 200, shadow: true });
    if (p.quote) els.push(T(wrap(p.quote, { size: 34, font: 'black', width: W - 2 * M - 240 }), M, Math.max(y, H - 400), { size: 34, font: 'black', color: c.accent, leading: 1.08 }));
  } else if (kind === 'grid') {
    const names = (p.props || []).slice(0, 12), cols = p.cols || 3, gap = 18, cw = (W - 2 * M - (cols - 1) * gap) / cols;
    const rows = Math.ceil(names.length / cols), ch = Math.min(cw + 40, (H - 130 - y) / Math.max(1, rows) - gap);
    names.forEach((name, i) => {
      const x = M + (i % cols) * (cw + gap), yy = y + Math.floor(i / cols) * (ch + gap);
      els.push({ type: 'panel', x, y: yy, w: cw, h: ch, color: i % 4 === 0 ? c.tone : 'white' });
      els.push({ type: 'prop', name, x: x + cw / 2, y: yy + (ch - 40) / 2, size: Math.min(cw, ch - 40) * 0.72 });
      els.push(T(name.replace(/-/g, ' '), x + 14, yy + ch - 30, { size: 16, font: 'mono', weight: 700, color: c.soft }));
    });
    if (p.body) els.push(T(wrap(p.body, { size: 22, width: W - 2 * M }), M, y + rows * (ch + gap) + 10, { size: 22, color: c.ink, leading: 1.3 }));
  } else if (kind === 'list') {
    const items = (p.items || []).slice(0, 80), cols = p.cols || 3, cw = (W - 2 * M) / cols, size = p.size || 22, row = size * 1.7;
    const per = Math.ceil(items.length / cols);
    items.forEach((it, i) => {
      const x = M + Math.floor(i / per) * cw, yy = y + (i % per) * row;
      els.push({ type: 'block', x, y: yy + size * 0.3, w: 12, h: 12, color: c.accent });
      els.push(T(it, x + 24, yy, { size, font: 'mono', color: c.ink }));
    });
    if (p.body) els.push(T(wrap(p.body, { size: 24, width: W - 2 * M }), M, y + per * row + 30, { size: 24, color: c.ink, leading: 1.35 }));
  } else if (kind === 'code') {
    const code = String(p.code || '').split('\n').slice(0, 30).join('\n'), size = p.size || 20;
    const n2 = code.split('\n').length, bh = n2 * size * 1.45 + 48;
    els.push({ type: 'panel', x: M, y, w: W - 2 * M, h: bh, color: c.tone });
    els.push(T(code, M + 26, y + 30, { size, font: 'mono', color: c.ink, leading: 1.45 }));
    if (p.body) els.push(T(wrap(p.body, { size: 25, width: W - 2 * M }), M, y + bh + 36, { size: 25, color: c.ink, leading: 1.38 }));
  } else if (kind === 'back') {
    const lines = (p.lines || []).join('\n');
    els.push(T(wrap(lines, { size: 24, width: W - 2 * M }), M, y, { size: 24, color: c.ink, leading: 1.45 }));
    els.push({ type: 'disc', x: W / 2, y: H - 360, r: 120, color: c.tone });
    els.push({ type: 'prop', name: p.mark || 'pencil', x: W / 2, y: H - 370, size: 200, shadow: true });
    els.push(T(p.sign || 'levni.dev', W / 2, H - 150, { size: 30, font: 'black', align: 'center', color: c.accent }));
    return { ...base, elements: els };
  }
  return { ...base, elements: [...els, ...foot(z, n, c)] };
}

/** The scenes of every page, in reading order. */
export function zineScenes(z) {
  if (!Array.isArray(z?.pages) || !z.pages.length) throw new Error('zine: needs "pages": [ { "kind": "cover", … }, … ]');
  return z.pages.slice(0, 64).map((p, i) => pageScene(p, z, i + 1));
}

// a minimal PDF: one JPEG per page, nothing else (any reader, any printer)
export function jpegPdf(pages, { width, height } = {}) {
  const objs = [], add = (o) => objs.push(o) && objs.length;
  const kids = [];
  const parts = [];
  add(null); add(null); // 1 catalog, 2 pages
  for (const pg of pages) {
    const w = pg.w ?? width, h = pg.h ?? height;
    const img = add({ head: `<< /Type /XObject /Subtype /Image /Width ${pg.px[0]} /Height ${pg.px[1]} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpg.length} >>`, stream: pg.jpg });
    const draw = Buffer.from(`q ${w} 0 0 ${h} 0 0 cm /Im Do Q`);
    const content = add({ head: `<< /Length ${draw.length} >>`, stream: draw });
    kids.push(add({ head: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im ${img} 0 R >> >> /Contents ${content} 0 R >>` }));
  }
  objs[0] = { head: '<< /Type /Catalog /Pages 2 0 R >>' };
  objs[1] = { head: `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>` };
  const offsets = [];
  let len = 0;
  const push = (b) => { const buf = Buffer.isBuffer(b) ? b : Buffer.from(b, 'binary'); parts.push(buf); len += buf.length; };
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  objs.forEach((o, i) => {
    offsets.push(len);
    push(`${i + 1} 0 obj\n${o.head}\n`);
    if (o.stream) { push('stream\n'); push(o.stream); push('\nendstream\n'); }
    push('endobj\n');
  });
  const xref = len;
  push(`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`);
  push(`trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return Buffer.concat(parts);
}

// the eight-page fold-up on one landscape sheet: top row upside down (5 4 3 2), bottom row 6 7 8 1
const FOLD = [[5, 4, 3, 2], [6, 7, 8, 1]];

/**
 * Render a zine. Writes pNN.png per page, zine.pdf (A5 pages) and, for eight pages, fold.png + fold.pdf (one A4 sheet).
 * Returns { pages, notes, files }.
 */
export async function renderZine(z, outDir, { onPage } = {}) {
  mkdirSync(outDir, { recursive: true });
  const scenes = zineScenes(z);
  const pngs = [], notes = [], files = [];
  for (const [i, scene] of scenes.entries()) {
    const { svg, used, canvas } = await compose(scene);
    const png = await rasterize(svg);
    pngs.push(png);
    const f = join(outDir, `p${String(i + 1).padStart(2, '0')}.png`);
    writeFileSync(f, png); files.push(f);
    const kind = z.pages[i].kind || (z.pages[i].scene ? 'scene' : 'text');
    for (const n of critique(used, canvas)) if (!(/focal/.test(n) && !['cover', 'scene'].includes(kind))) notes.push(`page ${i + 1}: ${n}`);
    onPage?.(i + 1, scenes.length);
  }
  const A5 = [419.53, 595.28];
  const jpgs = await Promise.all(pngs.map((p) => sharp(p).flatten({ background: '#ffffff' }).jpeg({ quality: 88 }).toBuffer()));
  writeFileSync(join(outDir, 'zine.pdf'), jpegPdf(jpgs.map((jpg) => ({ jpg, px: [W, H], w: A5[0], h: A5[1] }))));
  files.push(join(outDir, 'zine.pdf'));
  if (pngs.length === 8) {
    // A4 landscape at 150 dpi: 1754 x 1240, eight 438 x 620 panels
    const SW = 1754, SH = 1240, pw = SW / 4, ph = SH / 2;
    const tiles = [];
    for (const [r, row] of FOLD.entries()) for (const [col, n] of row.entries()) {
      let tile = sharp(pngs[n - 1]).resize(Math.round(pw), Math.round(ph), { fit: 'fill' });
      if (r === 0) tile = tile.rotate(180);
      tiles.push({ input: await tile.png().toBuffer(), left: Math.round(col * pw), top: Math.round(r * ph) });
    }
    // fold and cut guides, light enough to vanish in the fold
    const guides = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="${SH}"><g stroke="#bbb" stroke-width="1" stroke-dasharray="6 8">${[1, 2, 3].map((k) => `<line x1="${k * pw}" y1="0" x2="${k * pw}" y2="${SH}"/>`).join('')}<line x1="0" y1="${ph}" x2="${SW}" y2="${ph}"/></g><line x1="${pw}" y1="${ph}" x2="${3 * pw}" y2="${ph}" stroke="#E8522F" stroke-width="3"/></svg>`);
    const sheet = await sharp({ create: { width: SW, height: SH, channels: 3, background: '#ffffff' } }).composite([...tiles, { input: guides }]).png().toBuffer();
    writeFileSync(join(outDir, 'fold.png'), sheet); files.push(join(outDir, 'fold.png'));
    const jpg = await sharp(sheet).jpeg({ quality: 90 }).toBuffer();
    writeFileSync(join(outDir, 'fold.pdf'), jpegPdf([{ jpg, px: [SW, SH], w: 841.89, h: 595.28 }]));
    files.push(join(outDir, 'fold.pdf'));
  }
  return { pages: scenes.length, notes, files };
}
