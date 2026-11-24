// Checks one prop object (the JSON format of library/props/*.json). Returns a list of problems, empty when fine.
import { COLORS } from './compose.mjs';
import { flattenPath } from './ink.mjs';
import { readFileSync } from 'node:fs';

// Brand names a prop may not be named after (tags may still mention them, so "tiktok" can find a phone).
// Lowercase word -> how the brand writes it. Ambiguous everyday words (apple, windows, zoom) are left out on purpose.
export const BRAND_WORDS = JSON.parse(readFileSync(new URL('../library/brand-words.json', import.meta.url), 'utf8'));

// Library shelves. A prop names one in `category`; props without one still load and show under "other".
export const CATEGORIES = {
  film: 'Film & cinema', tv: 'TV & broadcast', stage: 'Stage & theatre', music: 'Music & audio',
  books: 'Books, writing & school', tech: 'Tech & internet', money: 'Money & work', law: 'Law & politics',
  sport: 'Sport & games', home: 'Home & everyday', food: 'Food & drink', nature: 'Nature & animals',
  places: 'Places & transport', health: 'Health & body', symbols: 'Signs, symbols & time',
};

export function validateProp(p) {
  const errs = [];
  const name = p?.name;
  if (typeof name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errs.push(`name "${name}" must be lowercase a-z0-9 and hyphens`);
  if (!Array.isArray(p?.tags)) errs.push('tags must be an array');
  else {
    if (!p.tags.length) errs.push('tags: add at least one search word');
    const low = p.tags.map((t) => String(t).toLocaleLowerCase('tr'));
    p.tags.forEach((t) => { if (typeof t !== 'string' || !t.trim()) errs.push('tags must be non-empty strings'); else if (/[A-ZÇĞİÖŞÜ]/.test(t)) errs.push(`tag "${t}" must be lowercase`); });
    const dup = low.find((t, i) => low.indexOf(t) !== i);
    if (dup) errs.push(`tag "${dup}" is listed twice`);
  }
  if (p?.aliases != null) {
    if (!Array.isArray(p.aliases)) errs.push('aliases must be an array of old names');
    else for (const a of p.aliases) if (typeof a !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a) || a === name) errs.push(`alias "${a}" must be an old name: lowercase a-z0-9 and hyphens, not the current name`);
  }
  const brand = typeof name === 'string' && [name, ...(Array.isArray(p?.aliases) ? p.aliases : [])].flatMap((n) => String(n).split('-')).find((w) => w in BRAND_WORDS);
  if (brand) errs.push(`name "${name}" uses the brand name "${BRAND_WORDS[brand]}": the Folio takes no logos or trademarks (see BRAND_LOGOS.md)`);
  if (p?.category != null && !(p.category in CATEGORIES)) errs.push(`category "${p.category}" must be one of: ${Object.keys(CATEGORIES).join(', ')}`);
  if (!Array.isArray(p?.variants) || !p.variants.length) return [...errs, 'needs at least one variant'];
  p.variants.forEach((v, i) => {
    const at = `variant ${i}`;
    if (v.slots != null) {
      if (typeof v.slots !== 'object' || Array.isArray(v.slots)) errs.push(`${at}: slots must be an object`);
      else for (const [n, s] of Object.entries(v.slots)) {
        const w = `${at} slot "${n}"`;
        if (!Array.isArray(s) || (s.length !== 2 && s.length !== 4 && s.length !== 5) || !s.every(Number.isFinite)) errs.push(`${w}: must be [x, y], [x, y, w, h] or [x, y, w, h, rotDegrees] numbers`);
        else if (s.slice(0, 4).some((q) => q < 0 || q > 100)) errs.push(`${w}: must stay inside 0..100`);
        else if (s.length >= 4 && (!(s[2] > 0) || !(s[3] > 0) || s[0] + s[2] > 100 || s[1] + s[3] > 100)) errs.push(`${w}: rect needs w, h > 0 and x+w, y+h <= 100`);
      }
    }
    if (!Array.isArray(v.paths) || !v.paths.length) return errs.push(`${at}: no paths`);
    v.paths.forEach((path, j) => {
      const w = `${at} path ${j}`;
      if (typeof path.d !== 'string' || !/^\s*[Mm]/.test(path.d)) errs.push(`${w}: d must start with M`);
      else if (/[^MmLlHhVvQqTtCcSsAaZz0-9.,\-\se]/.test(path.d)) errs.push(`${w}: d has characters that are not SVG path commands`);
      for (const k of ['fill', 'stroke']) if (path[k] != null && !(path[k] in COLORS) && !/^#[0-9a-f]{6}$/i.test(path[k])) errs.push(`${w}: unknown ${k} colour "${path[k]}"`);
      if (path.weight != null && !(path.weight >= 0)) errs.push(`${w}: weight must be a number >= 0`);
    });
  });
  return errs;
}

// Style notes from docs/folio-guide.md that are worth fixing but do not block a prop (older props break some of them).
// Returns a list of short hints, empty when the prop follows the guide.
export function lintProp(p) {
  const out = [];
  const name = String(p?.name || ''), spaced = name.replace(/-/g, ' ');
  const tags = (p?.tags || []).map((t) => String(t).toLowerCase());
  if (tags.some((t) => t === name || t === spaced)) out.push(`tags repeat the name "${name}": the name is already searchable, add synonyms and Turkish words instead`);
  if (tags.length < 3) out.push(`only ${tags.length} tag(s): add synonyms, related words and the Turkish word (aim for 4-8)`);
  if (/(^|-)\d+$/.test(name) && !/\d/.test((p?.variants || []).map((v) => v.note || '').join(' '))) out.push(`name "${name}" ends in a number the drawing does not show: name it for what makes it different (book-open, not book-2)`);
  if (/(^|-)(alt|new|v\d+|copy|final)(-|$)/.test(name)) out.push(`name "${name}" uses a version word: name it for what it shows`);
  if (tags.some((t) => ['icon', 'drawing', 'illustration', 'prop', 'çizim', 'ikon', 'simge'].includes(t))) out.push('generic tags (icon, drawing, prop): every Folio entry is one, drop them');
  (p?.variants || []).forEach((v, i) => {
    if (!v.note || !String(v.note).trim()) out.push(`variant ${i}: add a note that says what it shows ("side view, spout to the right")`);
    else if (/[.!]$/.test(String(v.note).trim())) out.push(`variant ${i}: notes are phrases, drop the final full stop`);
  });
  return out;
}

// Accepts what a chat model returns: one prop, an array of props, or either wrapped in a ```json fence.
export function parseProps(text) {
  const fenced = [...String(text).matchAll(/```(?:json)?\s*([\s\S]*?)```/g)].map((m) => m[1]);
  const chunks = fenced.length ? fenced : [text];
  return chunks.flatMap((c) => [].concat(JSON.parse(c)));
}

// Numbers a model that cannot see images can act on: how much of the 0..100 box the ink fills,
// how far it sits from the centre, and which colours it uses. Returns { size, cx, cy, box, colors, warnings }.

export function measureVariant(v) {
  const pts = (v.paths || []).flatMap((p) => flattenPath(p.d, 3).flat());
  if (!pts.length) return { warnings: ['draws nothing'] };
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const size = Math.round(Math.max(x1 - x0, y1 - y0)), cx = Math.round((x0 + x1) / 2), cy = Math.round((y0 + y1) / 2);
  const colors = [...new Set(v.paths.flatMap((p) => [p.fill, p.stroke]).filter((c) => c && c !== 'none'))];
  const warnings = [];
  if (size < 64) warnings.push(`too small: fills ${size} of 100, scale it up to 75-85`);
  if (size > 98) warnings.push(`too big: fills ${size} of 100, keep it inside 4..96`);
  if (Math.abs(cx - 50) > 10 || Math.abs(cy - 50) > 10) warnings.push(`off centre: centre is (${cx},${cy}), move it to about (50,50)`);
  if (x0 < 0 || y0 < 0 || x1 > 100 || y1 > 100) warnings.push('runs outside the 0..100 box');
  if (v.paths.length < 2) warnings.push('only one path: add an inner detail or a second shape');
  if (v.paths.length > 24) warnings.push(`${v.paths.length} paths: simplify, the house style is bold and simple`);
  const accents = colors.filter((c) => !['ink', 'paper', 'white', 'tone', 'none'].includes(c));
  if (accents.length > 3) warnings.push(`${accents.length} accent colours (${accents.join(', ')}): use at most two`);
  return { size, cx, cy, box: [Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1)], colors, warnings };
}
