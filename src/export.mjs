// Raster export. WebP under a size budget with crisp colours (good for CMS uploads), or plain PNG.
// Grain and crayon noise do not compress well, so quality steps down until the budget is met (never below minQ).
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

export async function toWebp(input, out, { budgetKB = 110, startQ = 84, minQ = 68, step = 4 } = {}) {
  const src = typeof input === 'string' && input.trim().startsWith('<svg') ? Buffer.from(input) : input;
  const png = await sharp(src).png().toBuffer(); // render the SVG once
  let q = startQ, buf;
  for (;;) {
    // smartSubsample keeps thin saturated lines (blue on cream, coral on blue) from bleeding
    buf = await sharp(png).webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();
    if (buf.length / 1024 <= budgetKB || q - step < minQ) break;
    q -= step;
  }
  if (out) writeFileSync(out, buf);
  return { bytes: buf.length, quality: q };
}

// PNG export; `preview` also writes a small JPEG next to it (cheap for an agent to look at).
export async function toPng(input, out, { preview = false, previewWidth = 560 } = {}) {
  const src = typeof input === 'string' && input.trim().startsWith('<svg') ? Buffer.from(input) : input;
  const png = await sharp(src).png().toBuffer();
  if (out) writeFileSync(out, png);
  if (out && preview) await sharp(png).resize(previewWidth).jpeg({ quality: 80 }).toFile(out.replace(/\.png$/i, '') + '.prev.jpg');
  return { bytes: png.length, png };
}
