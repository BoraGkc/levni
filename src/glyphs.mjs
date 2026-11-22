// Glyph fields (characters whose density follows a function), icon masks for ASCII symbols,
// and the faceless isotype pictogram used by `crowd` and `isotype`.
import { existsSync } from 'node:fs';
import sharp from 'sharp';
import { ellipse } from './pen.mjs';
import { inner, iconFile } from './icon.mjs';

const MONO = `font-family="Menlo, 'Courier New', monospace" font-weight="700"`;
const RAMP = ' .:-=+*#%@';
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Characters whose density follows density(x, y) in 0..1, one <text> per row.
export function glyphField(r, { x0, y0, x1, y1, cw = 9, lh = 16, size = 15, color, density, ramp = RAMP, jitter = 0.07 }) {
  const rows = [];
  for (let y = y0; y < y1; y += lh) {
    let line = '';
    for (let x = x0; x < x1 - cw / 2; x += cw) {
      const d = Math.max(0, Math.min(0.999, density(x, y) + r.jitter(jitter)));
      line += esc(ramp[Math.floor(d * ramp.length)]);
    }
    rows.push(`<text x="${x0}" y="${y + lh * 0.8}" xml:space="preserve">${line}</text>`);
  }
  return `<g ${MONO} font-size="${size}" fill="${color}">${rows.join('')}</g>`;
}

// Raster masks of an icon for ASCII rendering: the thickened outline, and the filled interior.
export async function iconMask(name, n = 220) {
  const raster = async (body) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${n}" height="${n}" viewBox="0 0 24 24"><rect width="24" height="24" fill="#fff"/>${body}</svg>`;
    const px = await sharp(Buffer.from(svg)).greyscale().raw().toBuffer();
    return (u, v) => {
      const x = Math.max(0, Math.min(n - 1, Math.round(u * (n - 1))));
      const y = Math.max(0, Math.min(n - 1, Math.round(v * (n - 1))));
      return 1 - px[y * n + x] / 255;
    };
  };
  const line = await raster(`<g fill="none" stroke="#000" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${inner(iconFile(name))}</g>`);
  const fill = existsSync(iconFile(name, 'filled')) ? await raster(`<g fill="#000">${inner(iconFile(name, 'filled'))}</g>`) : () => 0;
  // outline reads as dense glyphs, the inside as a light tint of dots
  return (u, v) => Math.max(line(u, v) * 0.95, fill(u, v) * 0.32);
}

// Isotype pictogram: head + shoulders, standing on (x, y), h tall.
// `below` extends the body under the ground line (for cropped audiences).
export function peep(pen, x, y, h, color, stroke = null, below = 0) {
  const hr = h * 0.17;
  const o = { fill: color, stroke, w: Math.max(4, h * 0.045), offset: 0, amp: 0.8 };
  return (
    pen.shape([[x - h * 0.27, y + h * below], [x - h * 0.27, y - h * 0.42], [x - h * 0.16, y - h * 0.58], [x + h * 0.16, y - h * 0.58], [x + h * 0.27, y - h * 0.42], [x + h * 0.27, y + h * below]], o) +
    pen.shape(ellipse(x, y - h + hr, hr, hr, 9), o)
  );
}
