// A small GIF89a encoder in plain JavaScript, for Node and the browser alike (no dependency).
// Tuned for Levni's pictures: flat inks, few colours, and loops where most of the canvas holds still.
//   - one global palette, picked by how often each colour appears across all frames;
//   - each frame stores only the rectangle that changed, and inside it unchanged pixels are transparent;
//   - LZW with a generation-stamped table, so nothing is cleared between dictionary resets.
//   const bytes = encodeGif(frames, width, height, { delay: 83, loop: 0, colours: 128 });   // frames: RGBA Uint8Array[]

const bin = (r, g, b) => ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); // 15-bit colour cell

// up to `max` colours: the fullest 15-bit cells, each represented by its mean colour
function buildPalette(frames, max) {
  const count = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (const f of frames) {
    // every pixel of small pictures, a stride on big ones: the palette needs proportions, not a census
    const step = f.length > 4e6 ? 8 : 4;
    for (let i = 0; i < f.length; i += step) { const k = bin(f[i], f[i + 1], f[i + 2]); count[k]++; sr[k] += f[i]; sg[k] += f[i + 1]; sb[k] += f[i + 2]; }
  }
  const cells = [];
  for (let k = 0; k < 32768; k++) if (count[k]) cells.push(k);
  cells.sort((a, b) => count[b] - count[a]);
  // greedy pick: skip a cell that sits right next to one already chosen until the palette has room to spare
  const chosen = [];
  const near = (k, d) => chosen.some((c) => Math.abs((c >> 10) - (k >> 10)) <= d && Math.abs(((c >> 5) & 31) - ((k >> 5) & 31)) <= d && Math.abs((c & 31) - (k & 31)) <= d);
  for (const d of [1, 0]) for (const k of cells) { if (chosen.length >= max) break; if (!chosen.includes(k) && !near(k, d)) chosen.push(k); }
  return chosen.map((k) => [Math.round(sr[k] / count[k]), Math.round(sg[k] / count[k]), Math.round(sb[k] / count[k])]);
}

function lzw(indices, minCode, out) {
  const CLEAR = 1 << minCode, END = CLEAR + 1;
  const table = new Uint32Array(1 << 20); // key: prefix (12 bits) << 8 | byte; value: generation << 12 | code
  let gen = 1, next = END + 1, size = minCode + 1;
  let acc = 0, bits = 0;
  const block = new Uint8Array(255); let bn = 0;
  const flush = () => { if (bn) { out.push(bn); for (let i = 0; i < bn; i++) out.push(block[i]); bn = 0; } };
  const emit = (code) => {
    acc |= code << bits; bits += size;
    while (bits >= 8) { block[bn++] = acc & 255; if (bn === 255) flush(); acc >>>= 8; bits -= 8; }
  };
  out.push(minCode);
  emit(CLEAR);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k, v = table[key];
    if (v >>> 12 === gen) { prefix = v & 4095; continue; }
    emit(prefix);
    if (next < 4096) { table[key] = (gen << 12) | next; if (next === 1 << size && size < 12) size++; next++; }
    else { emit(CLEAR); gen++; next = END + 1; size = minCode + 1; }
    prefix = k;
  }
  emit(prefix); emit(END);
  if (bits > 0) { block[bn++] = acc & 255; if (bn === 255) flush(); }
  flush();
  out.push(0);
}

/**
 * frames: RGBA byte arrays (width * height * 4), all the same size. Returns a Uint8Array.
 * opts: delay (ms per frame, or an array), loop (0 = forever, n = play n times), colours (2..255, default 128).
 */
export function encodeGif(frames, width, height, { delay = 83, loop = 0, colours = 128 } = {}) {
  if (!frames.length) throw new Error('encodeGif: no frames');
  const palette = buildPalette(frames, Math.min(255, Math.max(2, Math.round(colours) || 128)));
  const TRANSPARENT = palette.length; // one index past the colours
  let depth = 1; while ((1 << depth) < palette.length + 1) depth++;
  const minCode = Math.max(2, depth);
  // nearest palette colour per 15-bit cell, found once
  const nearest = new Int16Array(32768).fill(-1);
  const pick = (r, g, b) => {
    const k = bin(r, g, b); let v = nearest[k];
    if (v >= 0) return v;
    let best = 0, bd = Infinity;
    for (let i = 0; i < palette.length; i++) { const p = palette[i], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3; if (d < bd) { bd = d; best = i; } }
    return (nearest[k] = best);
  };
  const out = [];
  const u16 = (v) => out.push(v & 255, (v >> 8) & 255);
  for (const ch of 'GIF89a') out.push(ch.charCodeAt(0));
  u16(width); u16(height); out.push(0x80 | 0x70 | (depth - 1), 0, 0);
  for (let i = 0; i < 1 << depth; i++) { const p = palette[i] || [0, 0, 0]; out.push(p[0], p[1], p[2]); }
  out.push(0x21, 0xff, 11); for (const ch of 'NETSCAPE2.0') out.push(ch.charCodeAt(0));
  out.push(3, 1); u16(loop === 0 ? 0 : Math.max(0, loop - 1)); out.push(0); // a loop count of n-1 repeats = n plays
  const n = width * height;
  let prev = null;
  frames.forEach((f, fi) => {
    const cur = new Uint8Array(n);
    for (let i = 0, j = 0; i < n; i++, j += 4) cur[i] = pick(f[j], f[j + 1], f[j + 2]);
    // the rectangle that differs from the frame before
    let x0 = 0, y0 = 0, x1 = width - 1, y1 = height - 1;
    if (prev) {
      x0 = width; y0 = height; x1 = -1; y1 = -1;
      for (let y = 0, i = 0; y < height; y++) for (let x = 0; x < width; x++, i++) if (cur[i] !== prev[i]) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; } // nothing changed: a 1 px frame that only carries the delay
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1, idx = new Uint8Array(w * h);
    for (let y = 0, q = 0; y < h; y++) for (let x = 0, i = (y + y0) * width + x0; x < w; x++, i++, q++) idx[q] = prev && cur[i] === prev[i] ? TRANSPARENT : cur[i];
    const d = Math.max(2, Math.round((Array.isArray(delay) ? delay[fi] ?? delay[0] : delay) / 10)); // 1/100 s; under 2 browsers slow it down
    out.push(0x21, 0xf9, 4, 0x04 | (prev ? 1 : 0)); u16(d); out.push(TRANSPARENT, 0); // disposal 1: keep what is drawn
    out.push(0x2c); u16(x0); u16(y0); u16(w); u16(h); out.push(0);
    lzw(idx, minCode, out);
    prev = cur;
  });
  out.push(0x3b);
  return Uint8Array.from(out);
}
