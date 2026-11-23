// Title layer: headline text drawn in SVG above everything (outside the crayon filter), so it stays crisp and
// editable. Layout is a cheap model: greedy word-wrap with an average character width per font family,
// at most 3 lines, the largest font size that fits the block. No font is shipped; the stacks below use fonts
// most systems have, and `font: { "file": "/path/to/font.ttf" }` embeds your own (base64 @font-face).
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const FONTS = {
  serif: { stack: "Georgia, 'Times New Roman', serif", weight: 700, cw: 0.63 },
  sans: { stack: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 800, cw: 0.62 },
  mono: { stack: "Menlo, 'Courier New', monospace", weight: 700, cw: 0.62 },
};
const MIME = { '.ttf': ['font/ttf', 'truetype'], '.otf': ['font/otf', 'opentype'], '.woff': ['font/woff', 'woff'], '.woff2': ['font/woff2', 'woff2'] };
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const POSITIONS = ['bottom', 'top', 'left', 'band'];
const f1 = (n) => Math.round(n * 100) / 100;

function wrap(text, fs, cw, width) {
  const per = fs * cw, max = Math.max(1, Math.floor(width / per));
  const lines = [];
  let cur = '';
  for (let word of String(text).trim().split(/\s+/).filter(Boolean)) {
    while (word.length > max) { // a word longer than a line is cut
      if (cur) { lines.push(cur); cur = ''; }
      lines.push(word.slice(0, max)); word = word.slice(max);
    }
    if (!cur) cur = word;
    else if ((cur + ' ' + word).length <= max) cur += ' ' + word;
    else { lines.push(cur); cur = word; }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Largest size whose wrap fits in <= 3 lines and the height budget; then narrow the measure while the line count
// stays the same, so two lines come out even instead of one long and one short.
function fit(text, cw, width, maxH, maxFS, minFS) {
  for (let fs = maxFS; fs >= minFS; fs -= 2) {
    const lines = wrap(text, fs, cw, width);
    if (lines.length <= 3 && lines.length * fs * 1.12 <= maxH) {
      let best = lines;
      for (let k = 0.96; k >= 0.55 && lines.length > 1; k -= 0.04) {
        const l2 = wrap(text, fs, cw, width * k);
        if (l2.length !== lines.length) break;
        best = l2;
      }
      return { fs, lines: best };
    }
  }
  const fs = minFS;
  let lines = wrap(text, fs, cw, width);
  if (lines.length > 3) { // still too long at the smallest size: keep three lines and end with an ellipsis
    lines = lines.slice(0, 3);
    const max = Math.max(2, Math.floor(width / (fs * cw)));
    lines[2] = lines[2].slice(0, Math.max(1, max - 1)).trimEnd() + '…';
  }
  return { fs, lines };
}

const lum = (hex) => {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return 1;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// layoutTitle(title, canvas, insets) -> { rect, draw(c, bg) }.
//   rect: the area the title (and its band) takes, for the reflow to keep objects out of it.
//   draw(c, bg): the SVG fragment; c resolves a colour name, bg is the scene background hex.
export function layoutTitle(title, canvas, insets) {
  if (!title || !String(title.text ?? '').trim()) throw new Error('title needs a "text"');
  const pos = title.position ?? 'bottom';
  if (!POSITIONS.includes(pos)) throw new Error(`title.position must be one of ${POSITIONS.join(', ')}`);
  const { w, h } = canvas, m = insets.x, short = Math.min(w, h);
  let fontDef, family, fontFace = '';
  const fontSpec = title.font ?? 'serif';
  if (typeof fontSpec === 'object' && fontSpec.file) {
    const ext = extname(fontSpec.file).toLowerCase();
    if (!MIME[ext]) throw new Error('title.font.file must be .ttf, .otf, .woff or .woff2');
    const b64 = readFileSync(fontSpec.file).toString('base64');
    fontFace = `<style>@font-face{font-family:'LevniTitle';src:url(data:${MIME[ext][0]};base64,${b64}) format('${MIME[ext][1]}');font-weight:normal;font-style:normal}</style>`;
    fontDef = { weight: fontSpec.weight ?? 700, cw: fontSpec.width ?? 0.6 };
    family = `'LevniTitle', ${FONTS.serif.stack}`;
  } else {
    if (!FONTS[fontSpec]) throw new Error('title.font must be serif, sans, mono or { "file": path }');
    fontDef = FONTS[fontSpec]; family = fontDef.stack;
  }
  const left = pos === 'left';
  const width = left ? Math.max(300, Math.round(w * 0.42) - m) : w - 2 * m;
  const maxH = left ? h * 0.7 : h * (h / w > 1.25 ? 0.2 : 0.3);
  const maxFS = Math.round(Math.min(short * (left ? 0.1 : 0.105), 140));
  const { fs, lines } = fit(title.text, fontDef.cw, width, maxH, maxFS, 18);
  const ks = Math.max(13, Math.round(fs * 0.34)), bs = Math.max(13, Math.round(short * 0.021));
  const lh = fs * 1.12;
  const kickH = title.kicker ? ks * 1.25 + ks * 0.7 : 0;
  const brandH = title.brand ? bs * 1.1 + bs : 0;
  const blockH = kickH + lines.length * lh + brandH;
  const pad = Math.round(m * 0.7);
  const bandColour = title.band ?? (pos === 'band' ? 'blue' : null);
  // block position
  let bx = m, by;
  if (pos === 'top') by = insets.top;
  else if (left) by = (h - blockH) / 2;
  else by = h - insets.bottom - blockH;
  const textW = Math.max(...lines.map((l) => l.length)) * fs * fontDef.cw;
  let rect;
  let back = null;
  if (bandColour) {
    if (left) { rect = { x: 0, y: 0, w: Math.min(w, Math.round(Math.max(textW, ks * 14) + m + pad)), h }; back = rect; }
    else if (pos === 'top') { rect = { x: 0, y: 0, w, h: Math.round(by + blockH + pad) }; back = rect; }
    else { const y0 = Math.round(by - pad); rect = { x: 0, y: y0, w, h: h - y0 }; back = rect; }
  } else rect = { x: bx, y: by, w: left ? width : Math.min(width, Math.round(textW)), h: blockH };

  return {
    rect, lines, fontSize: fs,
    draw(c, bg) {
      const bandHex = bandColour ? c(bandColour, '#0B57D0') : null;
      const onDark = bandHex ? lum(bandHex) < 0.5 : lum(bg) < 0.5;
      const text = title.color ? c(title.color, '#0A3FB0') : onDark ? c('paper') : c('ink');
      const kick = title.kickerColor ? c(title.kickerColor) : onDark ? c('mustard') : c('coral');
      const halo = bandHex ? '' : ` paint-order="stroke" stroke="${bg}" stroke-width="${f1(fs * 0.14)}" stroke-linejoin="round"`;
      const haloS = bandHex ? '' : ` paint-order="stroke" stroke="${bg}" stroke-width="${f1(ks * 0.5)}" stroke-linejoin="round"`;
      let s = `<g id="levni-title">${fontFace}`;
      if (back) s += `<rect x="${back.x}" y="${back.y}" width="${back.w}" height="${back.h}" fill="${bandHex}"/>`;
      let y = by;
      if (title.kicker) {
        y += ks * 1.0;
        s += `<text x="${bx}" y="${f1(y)}" font-family="${FONTS.mono.stack}" font-weight="700" font-size="${ks}" letter-spacing="${f1(ks * 0.14)}" fill="${kick}"${haloS}>${esc(String(title.kicker).toLocaleUpperCase(title.locale || 'en'))}</text>`;
        y += ks * 0.95;
      }
      for (const line of lines) {
        s += `<text x="${bx}" y="${f1(y + fs * 0.8)}" font-family="${esc(family)}" font-weight="${fontDef.weight}" font-size="${fs}" fill="${text}"${halo}>${esc(line)}</text>`;
        y += lh;
      }
      if (title.brand) {
        y += bs * 1.1;
        s += `<text x="${bx}" y="${f1(y)}" font-family="${FONTS.mono.stack}" font-weight="700" font-size="${bs}" letter-spacing="${f1(bs * 0.08)}" fill="${text}" fill-opacity="0.72"${haloS}>${esc(title.brand)}</text>`;
      }
      return s + '</g>';
    },
  };
}
