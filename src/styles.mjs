// Style packs: the same scene, printed with a different set of inks and paper.
// A pack maps every house colour to its own hex, so props, assets and textures all follow.
// riso (default): the Ortak Alan riso/ink look. miniature: inspired by Tulip Era Ottoman miniatures
// (aged paper, gold ochre, vermilion, turquoise, lapis, sepia line).
import { PALETTE } from './style.mjs';

const HOUSE = {
  paper: PALETTE.paper, white: PALETTE.white, ink: PALETTE.ink, blue: PALETTE.blue, coral: PALETTE.coral,
  green: PALETTE.green, mustard: PALETTE.mustard, dark: PALETTE.dark,
  tone: '#7FA6F2', 'tone-coral': '#FFB49A', 'tone-green': '#86C796', 'tone-mustard': '#FFE08A',
};

export const STYLES = {
  riso: {},
  miniature: {
    paper: '#F1E4C8', white: '#FBF3E0', ink: '#3B2415', blue: '#1F3F8F', coral: '#C8402E',
    green: '#2A8C80', mustard: '#C9962B', dark: '#2A1A10',
    tone: '#9CCFC6', 'tone-coral': '#E9A089', 'tone-green': '#A9D3B4', 'tone-mustard': '#E6C67E',
  },
};

// Recolour a finished SVG for a style pack (one pass, case-insensitive on the house hex values).
// `name` is a pack name, or an object of your own inks: { "blue": "#123456", "coral": "#FF8800", ... }
// (any house colour name; the ones left out keep the house hex). Hex values only.
export function applyStyle(svg, name) {
  const pack = typeof name === 'object' && name ? brandPack(name) : name && STYLES[name];
  if (!pack || !Object.keys(pack).length) return svg;
  const map = new Map(Object.entries(pack).filter(([k]) => HOUSE[k]).map(([k, hex]) => [HOUSE[k].toLowerCase(), hex]));
  const re = new RegExp(`(${[...map.keys()].join('|')})(?![0-9a-f])`, 'gi');
  return svg.replace(re, (m) => map.get(m.toLowerCase()) || m);
}

// A custom ink set, checked: unknown names and non-hex values are an error, so a typo does not pass silently.
export function brandPack(inks) {
  const out = {};
  for (const [k, v] of Object.entries(inks)) {
    if (!(k in HOUSE)) throw new Error(`style: unknown colour "${k}" (use ${Object.keys(HOUSE).join(', ')})`);
    if (!/^#[0-9a-f]{6}$/i.test(v)) throw new Error(`style: "${k}" must be a hex colour like #0B57D0`);
    out[k] = v;
  }
  return out;
}

export { HOUSE };
