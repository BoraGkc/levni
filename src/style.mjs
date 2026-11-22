// The house style Levni ships with: the Ortak Alan palette and its crayon / riso paper finish.
// Canvas, palette, deterministic RNG and the SVG frame every scene is wrapped in.

export const PALETTE = {
  paper: '#F4F2EC',
  ink: '#0A3FB0', // outlines
  blue: '#0B57D0', // fills, panels
  coral: '#F2603F',
  green: '#1E783F',
  mustard: '#F2C230',
  dark: '#14181F', // small face details on coral/blue skin
  white: '#FBFAF6',
};

export const W = 1200;
export const H = 673;

// Deterministic RNG (mulberry32) so the same seed always draws the same picture.
export function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (lo, hi) => lo + next() * (hi - lo),
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    jitter: (amp) => (next() - 0.5) * 2 * amp,
    chance: (p) => next() < p,
  };
}

// Crayon look. Applied once per layer, not per path:
// - low-frequency displacement: the hand wobble of a long line,
// - high-frequency displacement: the fuzzy, torn edge of wax on paper,
// - sparse speckle: paper showing through the pigment.
export function filterDefs(seed = 1) {
  return `
  <filter id="crayon" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${seed}" result="wobble"/>
    <feDisplacementMap in="SourceGraphic" in2="wobble" scale="5" xChannelSelector="R" yChannelSelector="G" result="w1"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="${seed + 7}" result="tooth"/>
    <feDisplacementMap in="w1" in2="tooth" scale="3.2" xChannelSelector="R" yChannelSelector="G" result="w2"/>
    <feTurbulence type="fractalNoise" baseFrequency="1.1 0.8" numOctaves="2" seed="${seed + 13}" result="grain"/>
    <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.0 2.3" result="speckle"/>
    <feComposite in="w2" in2="speckle" operator="in" result="inked"/>
    <!-- ink mottle: faint horizontal streaks where the drum laid down a little less ink, as on a riso print -->
    <feTurbulence type="fractalNoise" baseFrequency="0.003 0.035" numOctaves="2" seed="${seed + 31}" result="mot"/>
    <feColorMatrix in="mot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0.55 0 0 0 0.74" result="mota"/>
    <feComposite in="inked" in2="mota" operator="in"/>
  </filter>
  <filter id="paper" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" seed="${seed + 21}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.45  0 0 0 0 0.42  0 0 0 0 0.36  0 0 0 0.06 0"/>
  </filter>`;
}

// "Karma" look: flat colour areas are filled with monospace characters in that colour,
// drawn in a lighter or darker tone over the solid colour, while outlines, faces and white areas stay hand-drawn.
const ASCII_SETS = {
  blue: '/\\/\\|/',
  coral: '%$&%#',
  green: '+=+:=',
  mustard: '*:.*',
  ink: '#@',
};
const ASCII_COLORS = { blue: PALETTE.blue, coral: PALETTE.coral, green: PALETTE.green, mustard: PALETTE.mustard };
// characters are a tone of the block colour, so the block stays bold and the glyphs read as texture
const ASCII_TONES = { blue: '#4F86E8', coral: '#FF9A78', green: '#4FA466', mustard: '#D49A12' };
const esc = (c) => c.replace('&', '&amp;').replace('<', '&lt;');

export function asciiPatterns(seed = 1) {
  const r = rng(seed + 99);
  const cw = 9, lh = 15, cols = 16, rows = 8;
  return Object.entries(ASCII_COLORS)
    .map(([name, color]) => {
      const set = ASCII_SETS[name];
      const lines = Array.from({ length: rows }, (_, y) => {
        const row = Array.from({ length: cols }, () => esc(set[Math.floor(r.next() * set.length)])).join('');
        return `<text x="0" y="${(y + 0.8) * lh}" xml:space="preserve">${row}</text>`;
      }).join('');
      return `<pattern id="a-${name}" patternUnits="userSpaceOnUse" width="${cols * cw}" height="${rows * lh}">
  <rect width="${cols * cw}" height="${rows * lh}" fill="${color}"/>
  <g fill="${ASCII_TONES[name]}" font-family="Menlo, 'Courier New', monospace" font-weight="700" font-size="15">${lines}</g>
</pattern>`;
    })
    .join('\n');
}

export function toAscii(body) {
  let out = body;
  for (const [name, color] of Object.entries(ASCII_COLORS)) out = out.split(`fill="${color}"`).join(`fill="url(#a-${name})"`);
  return out;
}

export function frame(body, { seed = 1, background = PALETTE.paper, ascii = false, finish = 'crayon', grain = 0.16 } = {}) {
  if (ascii) body = toAscii(body);
  if (finish === 'soft') {
    // soft finish: clean shapes, only a fine film grain over the whole picture (no wobble, no crayon edge)
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="grain" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}" color-interpolation-filters="sRGB">
  <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="${seed}" result="n"/>
  <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.6 1.05"/>
</filter></defs>
<rect width="${W}" height="${H}" fill="${background}"/>
${body}
<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${grain}"/>
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>${filterDefs(seed)}${ascii ? asciiPatterns(seed) : ''}</defs>
<rect width="${W}" height="${H}" fill="${background}"/>
<rect width="${W}" height="${H}" filter="url(#paper)"/>
<g filter="url(#crayon)">
${body}
</g>
</svg>`;
}
