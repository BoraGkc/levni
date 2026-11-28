// Design Router: one search over everything open that Levni can draw with. Folio drawings, Tabler icons, the four OFL
// fonts, palettes, pattern generators, motion presets and shots, ranked together. Every result carries its licence and
// a snippet to paste into a scene; routeScene() draws it in your colours.
// Browser-safe: no file system here. src/route.mjs builds the catalogue from disk for the CLI and MCP; the site builds
// it from /props-index.json.
import { MOTIONS } from './motion.mjs';
import { SHOTS, shotScene } from './shots.mjs';
import { STYLES } from './styles.mjs';

export const ROUTE_KINDS = ['drawing', 'icon', 'font', 'palette', 'pattern', 'motion', 'shot'];

// words that ask for a kind rather than a thing
const KIND_WORDS = {
  drawing: ['drawing', 'drawings', 'illustration', 'object', 'prop', 'çizim'],
  icon: ['icon', 'icons', 'ikon', 'symbol', 'glyph'],
  font: ['font', 'fonts', 'type', 'typeface', 'typography', 'yazı', 'letter', 'letters'],
  palette: ['palette', 'palettes', 'colour', 'colours', 'color', 'colors', 'renk', 'inks', 'ink'],
  pattern: ['pattern', 'patterns', 'texture', 'textures', 'background', 'desen', 'doku'],
  motion: ['motion', 'animation', 'animate', 'loop', 'move', 'moving', 'hareket', 'animasyon'],
  shot: ['shot', 'shots', 'template', 'video', 'reel', 'intro', 'clip'],
};

export const FONT_LIST = [
  { id: 'grotesk', title: 'Space Grotesk', tags: ['sans', 'grotesk', 'text', 'body', 'ui', 'modern', 'variable'], license: 'OFL 1.1', credit: 'Florian Karsten' },
  { id: 'black', title: 'Archivo Black', tags: ['headline', 'display', 'heavy', 'bold', 'poster', 'title'], license: 'OFL 1.1', credit: 'Omnibus-Type' },
  { id: 'mono', title: 'JetBrains Mono', tags: ['mono', 'monospace', 'code', 'terminal', 'label', 'technical'], license: 'OFL 1.1', credit: 'JetBrains' },
  { id: 'pixel', title: 'Departure Mono', tags: ['pixel', 'bitmap', 'retro', '8-bit', 'game', 'lcd'], license: 'OFL 1.1', credit: 'Helena Zhang' },
];

// palettes as ink maps: any house colour name → hex
export const PALETTE_LIST = [
  { id: 'riso', title: 'Riso (house)', tags: ['riso', 'blue', 'coral', 'print', 'bright', 'default'], inks: {} },
  { id: 'miniature', title: 'Miniature', tags: ['miniature', 'ottoman', 'warm', 'earth', 'manuscript', 'gold'], inks: STYLES.miniature },
  { id: 'night', title: 'Night', tags: ['night', 'dark', 'neon', 'evening'], inks: { paper: '#14122B', white: '#1E1B3D', ink: '#F4F2EC', blue: '#7A5CFF', coral: '#FF7A59', mustard: '#F2C230', green: '#38D6A0', tone: '#3A2F7A', 'tone-coral': '#7A3D4A', 'tone-mustard': '#6B5A2A', 'tone-green': '#1F5A4A' } },
  { id: 'forest', title: 'Forest', tags: ['forest', 'green', 'nature', 'calm', 'garden', 'eco'], inks: { blue: '#1E5B3A', coral: '#C2572B', mustard: '#D9A441', green: '#2F8F4E', ink: '#17301F', tone: '#9CC9A5', 'tone-coral': '#E6A98A', 'tone-mustard': '#EBD08F', 'tone-green': '#B7DDB0' } },
  { id: 'sunset', title: 'Sunset', tags: ['sunset', 'warm', 'orange', 'pink', 'summer', 'beach'], inks: { blue: '#5B3FA8', coral: '#F2603F', mustard: '#F7A531', green: '#E8558A', ink: '#2B1846', tone: '#C9B6F2', 'tone-coral': '#FFB49A', 'tone-mustard': '#FFD58A', 'tone-green': '#F7B3CB' } },
  { id: 'mono', title: 'Mono', tags: ['mono', 'black', 'white', 'grey', 'gray', 'minimal', 'newspaper'], inks: { blue: '#1A1A1A', coral: '#1A1A1A', mustard: '#8A8A8A', green: '#5A5A5A', ink: '#111111', tone: '#CFCFCF', 'tone-coral': '#D8D8D8', 'tone-mustard': '#E4E4E4', 'tone-green': '#C4C4C4', paper: '#F5F4F0' } },
  { id: 'pastel', title: 'Pastel', tags: ['pastel', 'soft', 'baby', 'light', 'spring', 'kids'], inks: { blue: '#7BA7E8', coral: '#F29A8E', mustard: '#F4D27A', green: '#8FD0A6', ink: '#3A4466', tone: '#CFE0FA', 'tone-coral': '#FBD3CC', 'tone-mustard': '#FBEBC0', 'tone-green': '#CFEEDB' } },
];

// pattern generators, each a ready element for a 480 × 300 box
export const PATTERN_LIST = [
  { id: 'halftone', title: 'Halftone dots', tags: ['dots', 'halftone', 'riso', 'comic', 'print', 'gradient'], el: { type: 'halftone', x: 0, y: 0, w: 480, h: 300, color: 'blue', mode: 'radial', gap: 14 } },
  { id: 'waves', title: 'Waves', tags: ['waves', 'water', 'sea', 'lines', 'wind', 'stripes'], el: { type: 'waves', x: 0, y: 40, w: 480, h: 220, color: 'blue', gap: 22, amp: 8 } },
  { id: 'hatch', title: 'Hatching', tags: ['hatch', 'hatching', 'lines', 'shade', 'engraving', 'cross'], el: { type: 'hatch', x: 20, y: 20, w: 440, h: 260, color: 'ink', angle: 35, gap: 12, cross: true } },
  { id: 'shapegrid', title: 'Shape grid', tags: ['grid', 'shapes', 'geometric', 'tiles', 'bauhaus', 'modular'], el: { type: 'shapegrid', x: 20, y: 20, w: 440, h: 260, cols: 6, rows: 4, gap: 10 } },
  { id: 'dotmatrix', title: 'Dot matrix', tags: ['dots', 'matrix', 'grid', 'led', 'pixel', 'screen'], el: { type: 'dotmatrix', x: 20, y: 20, w: 440, h: 260, cell: 16 } },
  { id: 'confetti', title: 'Confetti', tags: ['confetti', 'party', 'celebration', 'launch', 'festive'], el: { type: 'confetti', x: 0, y: 0, w: 480, h: 300, kind: 'confetti' } },
  { id: 'stars', title: 'Starfield', tags: ['stars', 'night', 'sky', 'space', 'sparkle'], el: { type: 'confetti', x: 0, y: 0, w: 480, h: 300, kind: 'stars', colors: ['mustard', 'blue'] } },
  { id: 'rain', title: 'Rain', tags: ['rain', 'weather', 'drops', 'storm'], el: { type: 'confetti', x: 0, y: 0, w: 480, h: 300, kind: 'rain', colors: ['blue', 'tone'] } },
  { id: 'meshgrad', title: 'Mesh gradient', tags: ['gradient', 'mesh', 'blur', 'aurora', 'glow', 'soft'], el: { type: 'meshgrad', x: 0, y: 0, w: 480, h: 300, colors: ['#FF7A59', '#7A5CFF', '#38D6E8'] } },
  { id: 'flowfield', title: 'Flow field', tags: ['flow', 'field', 'generative', 'lines', 'noise', 'hair'], el: { type: 'flowfield', x: 0, y: 0, w: 480, h: 300, colors: ['blue', 'coral'], spacing: 18 } },
  { id: 'ridgelines', title: 'Ridgelines', tags: ['ridgelines', 'mountains', 'joy division', 'lines', 'data', 'terrain'], el: { type: 'ridgelines', x: 20, y: 20, w: 440, h: 260, lines: 22 } },
  { id: 'hills', title: 'Hills', tags: ['hills', 'landscape', 'mountains', 'field', 'nature'], el: { type: 'hills', base: 300, height: 210, color: 'green' } },
  { id: 'skyline', title: 'City skyline', tags: ['city', 'skyline', 'buildings', 'urban', 'town'], el: { type: 'skyline', x0: 0, x1: 480, base: 300, minH: 60, maxH: 180 } },
  { id: 'grain', title: 'Paper grain', tags: ['grain', 'noise', 'paper', 'texture', 'film'], el: { type: 'grain', x: 0, y: 0, w: 480, h: 300, density: 14 } },
];

const MOTION_TEXT = {
  float: 'rises and falls', drift: 'slides left and right', sway: 'rocks from its base', wiggle: 'shakes for attention', pulse: 'breathes in and out',
  spin: 'turns round', orbit: 'moves on a small circle', blink: 'blinks on and off', pop: 'pops in with a bounce', fade: 'fades in', slide: 'slides in',
  wipe: 'wipes in from one side', typewriter: 'types itself', draw: 'is drawn on line by line', print: 'prints like a riso plate',
};

const norm = (s) => String(s || '').toLowerCase().replace(/[-_]/g, ' ').trim();
const licenseOf = (p) => (/tabler/i.test(`${p.note || ''} ${(p.variants || []).join(' ')}`) ? 'MIT (redrawn from Tabler Icons)' : 'CC BY 4.0');

/**
 * Build the catalogue. props: [{ name, category, tags, aliases, author, variants (notes) }]; icons: ['name', …].
 */
export function catalog({ props = [], icons = [] } = {}) {
  const out = [];
  for (const p of props) out.push({ kind: 'drawing', id: p.name, title: norm(p.name), tags: [...(p.tags || []), ...(p.aliases || []), p.category].filter(Boolean).map(norm), license: licenseOf(p), credit: p.author || 'Levni studio', snippet: { type: 'prop', name: p.name, x: 600, y: 336, size: 260 } });
  for (const name of icons) out.push({ kind: 'icon', id: name, title: norm(name), tags: norm(name).split(' '), license: 'MIT', credit: 'Tabler Icons', snippet: { type: 'icon', name, x: 600, y: 336, size: 160, color: 'blue', under: 'tone-coral' } });
  for (const f of FONT_LIST) out.push({ kind: 'font', id: f.id, title: f.title.toLowerCase(), tags: f.tags, license: f.license, credit: f.credit, name: f.title, snippet: { type: 'type', text: 'Your headline', x: 80, y: 80, size: 72, font: f.id, color: 'ink' } });
  for (const p of PALETTE_LIST) out.push({ kind: 'palette', id: p.id, title: p.title.toLowerCase(), tags: p.tags, license: 'CC0', credit: 'Levni', name: p.title, inks: p.inks, snippet: { style: Object.keys(p.inks).length ? p.inks : 'riso' } });
  for (const p of PATTERN_LIST) out.push({ kind: 'pattern', id: p.id, title: p.title.toLowerCase(), tags: p.tags, license: 'MIT', credit: 'Levni engine', name: p.title, snippet: p.el });
  for (const m of MOTIONS) out.push({ kind: 'motion', id: m, title: m, tags: [MOTION_TEXT[m] || '', 'motion', 'animation'].map(norm), license: 'MIT', credit: 'Levni engine', text: MOTION_TEXT[m], snippet: { motion: { type: m } } });
  for (const s of SHOTS) out.push({ kind: 'shot', id: s.id, title: norm(s.id), tags: [s.group, ...norm(s.text).split(' ')].map(norm), license: 'MIT', credit: 'Levni engine', text: s.text, snippet: { shot: s.id, fields: { title: 'Your words' } } });
  return out;
}

/** Rank the catalogue for a query. Returns { results, counts, kinds } (kinds: the kinds the query asked for by name). */
export function route(query, cat, { kinds, limit = 24 } = {}) {
  const words = norm(query).split(/[\s,]+/).filter(Boolean);
  const asked = new Set(Object.entries(KIND_WORDS).filter(([, ws]) => words.some((w) => ws.includes(w))).map(([k]) => k));
  const terms = words.filter((w) => !Object.values(KIND_WORDS).some((ws) => ws.includes(w)));
  const only = kinds?.length ? new Set(kinds) : asked.size ? asked : null;
  const phrase = terms.join(' ');
  const scored = [];
  for (const e of cat) {
    if (only && !only.has(e.kind)) continue;
    let s = 0;
    if (!terms.length) s = 1; // "fonts", "patterns": list the kind
    else {
      if (phrase && e.title === phrase) s += 14;
      else if (phrase && e.tags.includes(phrase)) s += 8;
      for (const t of terms) {
        if (e.id === t || e.title === t) s += 10;
        else if (t.length > 3 && e.title.startsWith(t)) s += 6;
        else if (e.title.split(' ').includes(t)) s += 5;
        if (e.tags.includes(t)) s += 5;
        else if (t.length > 3 && e.tags.some((g) => g.startsWith(t))) s += 2;
        else if (t.length > 3 && e.title.includes(t)) s += 1;
      }
      if (!s) continue;
    }
    // Folio drawings are inked in the house style: they come before a plain icon of the same thing
    scored.push([(e.kind === 'icon' ? s * 0.6 : s) + (e.kind === 'drawing' ? 0.3 : 0) - (e.id.startsWith('pixel-') ? 1.5 : 0), e]);
  }
  scored.sort((a, b) => b[0] - a[0] || ROUTE_KINDS.indexOf(a[1].kind) - ROUTE_KINDS.indexOf(b[1].kind) || a[1].id.localeCompare(b[1].id));
  const counts = {};
  for (const [, e] of scored) counts[e.kind] = (counts[e.kind] || 0) + 1;
  return { results: scored.slice(0, Math.max(1, Math.min(200, limit))).map(([score, e]) => ({ ...e, score: Math.round(score * 10) / 10 })), counts, kinds: [...asked] };
}

// "#E8522F" + white → lighter tone
const mix = (hex, to, k) => {
  const a = hex.replace('#', ''), b = to.replace('#', '');
  return '#' + [0, 2, 4].map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('').toUpperCase();
};

/** Your colours as Levni inks. ['#hex', …] fills blue, coral, mustard, green in order (with light tones); an object is used as is. */
export function inksFrom(colors) {
  if (!colors) return null;
  if (!Array.isArray(colors)) return typeof colors === 'object' ? colors : null;
  const hex = colors.map(String).filter((c) => /^#?[0-9a-f]{6}$/i.test(c)).map((c) => (c.startsWith('#') ? c : `#${c}`).toUpperCase());
  if (!hex.length) return null;
  const names = ['blue', 'coral', 'mustard', 'green'], tones = { blue: 'tone', coral: 'tone-coral', mustard: 'tone-mustard', green: 'tone-green' };
  const inks = {};
  names.forEach((n, i) => { const c = hex[i % hex.length]; inks[n] = c; inks[tones[n]] = mix(c, '#FFFFFF', 0.55); });
  inks.ink = mix(hex[0], '#000000', 0.55);
  return inks;
}

/** A small scene that shows one result, in your colours. */
export function routeScene(r, { colors, w = 480, h = 300 } = {}) {
  const inks = inksFrom(colors);
  const style = r.kind === 'palette' ? r.inks : inks; // a palette shows its own inks
  const base = { canvas: [w, h], seed: 5, background: 'paper', ...(style && Object.keys(style).length ? { style } : {}) };
  const cx = w / 2, cy = h / 2;
  if (r.kind === 'drawing') return { ...base, elements: [{ type: 'disc', x: cx, y: cy + 6, r: h * 0.42, color: 'tone-mustard' }, { ...r.snippet, x: cx, y: cy, size: h * 0.8, shadow: true }] };
  if (r.kind === 'icon') return { ...base, elements: [{ ...r.snippet, x: cx, y: cy, size: h * 0.5 }] };
  if (r.kind === 'font') return { ...base, elements: [{ type: 'type', text: 'Aa Bb Çç', x: 28, y: 40, w: w - 56, h: h * 0.42, fit: 'box', font: r.id, color: 'ink' }, { type: 'type', text: r.name, x: 30, y: h - 64, size: 22, font: r.id, color: 'coral' }, { type: 'type', text: r.license, x: 30, y: h - 32, size: 14, font: 'mono', color: '#6B6680' }] };
  if (r.kind === 'palette') {
    const sw = ['blue', 'coral', 'mustard', 'green', 'ink'];
    return { ...base, elements: [...sw.map((c, i) => ({ type: 'block', x: 24 + i * ((w - 48) / 5), y: 24, w: (w - 48) / 5 - 8, h: h * 0.42, color: c })), { type: 'prop', name: 'tulip', x: w * 0.3, y: h * 0.74, size: h * 0.42 }, { type: 'prop', name: 'rocket', x: w * 0.7, y: h * 0.74, size: h * 0.42 }] };
  }
  if (r.kind === 'pattern') return { ...base, elements: [{ ...r.snippet }] };
  if (r.kind === 'motion') return { ...base, t: 0.35, elements: [{ type: 'disc', x: cx, y: cy + 6, r: h * 0.34, color: 'tone' }, { type: 'prop', name: 'rocket', x: cx, y: cy, size: h * 0.6, motion: { type: r.id } }] };
  if (r.kind === 'shot') return { ...shotScene(r.id, { canvas: [w, h], title: 'Your words' }), t: 0.7, ...(style ? { style } : {}) };
  return base;
}
