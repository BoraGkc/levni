// Levni Zine: pages from templates, a readable PDF and the eight-page fold-up sheet.
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { zineScenes, renderZine, jpegPdf, wrap, ZINE_PAGE } from '../src/zine.mjs';
import { layoutType } from '../src/type.mjs';

// every template makes a page-sized scene with its number in the foot
const kinds = [{ kind: 'cover', title: 'Hello' }, { kind: 'text', title: 'Note', body: 'One.\nTwo.' }, { kind: 'grid', props: ['tulip', 'rocket'] }, { kind: 'list', items: ['a', 'b'] }, { kind: 'code', code: '{ }' }, { scene: { elements: [{ type: 'disc', x: 400, y: 600, r: 200, color: 'coral' }] } }, { kind: 'text', body: 'x' }, { kind: 'back', lines: ['bye'] }];
const scenes = zineScenes({ issue: '09', pages: kinds });
assert.equal(scenes.length, 8);
for (const s of scenes) assert.deepEqual(s.canvas, ZINE_PAGE);
assert.ok(JSON.stringify(scenes[1]).includes('NO. 09'), 'the foot names the issue');
assert.throws(() => zineScenes({ pages: [] }), /pages/);

// wrapped lines stay inside the width they were given
const w = wrap('Levni draws pictures from a few lines of JSON, on your own machine, with no image model at all.', { size: 27, width: 400 });
for (const line of w.split('\n')) assert.ok(layoutType({ text: line, size: 27, font: 'grotesk', fit: 'none' }).w <= 400, line);

// the PDF writer: a header, one page per image, a cross-reference table that points at real objects
const jpg = await sharp({ create: { width: 20, height: 28, channels: 3, background: '#4B2FD6' } }).jpeg().toBuffer();
const pdf = jpegPdf([{ jpg, px: [20, 28], w: 100, h: 140 }, { jpg, px: [20, 28], w: 100, h: 140 }]).toString('latin1');
assert.ok(pdf.startsWith('%PDF-1.4'));
assert.match(pdf, /\/Count 2/);
const xref = Number(/startxref\n(\d+)/.exec(pdf)[1]);
assert.equal(pdf.slice(xref, xref + 4), 'xref');
const first = Number(/xref\n0 \d+\n0000000000 65535 f \n(\d{10})/.exec(pdf)[1]);
assert.equal(pdf.slice(first, first + 7), '1 0 obj');

// eight plain pages render to pages, zine.pdf and the fold-up sheet
const dir = mkdtempSync(join(tmpdir(), 'levni-zine-'));
try {
  const flat = Array.from({ length: 8 }, (_, i) => ({ scene: { finish: 'soft', elements: [{ type: 'type', text: String(i + 1), x: 300, y: 500, size: 300, font: 'black', color: 'ink' }] } }));
  const r = await renderZine({ pages: flat }, dir);
  assert.equal(r.pages, 8);
  for (const f of ['p01.png', 'p08.png', 'zine.pdf', 'fold.pdf', 'fold.png']) assert.ok(existsSync(join(dir, f)), f);
  const m = await sharp(join(dir, 'fold.png')).metadata();
  assert.deepEqual([m.width, m.height], [1754, 1240], 'A4 landscape at 150 dpi');
  assert.match(readFileSync(join(dir, 'zine.pdf')).toString('latin1'), /\/Count 8/);
  console.log('zine: templates, wrapping, PDF writer, pages and the fold-up sheet ok');
} finally { rmSync(dir, { recursive: true, force: true }); }
