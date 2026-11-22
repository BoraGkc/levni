// Topic symbols from an open icon set (Tabler Icons, MIT, ~5,500 outline + ~1,000 filled),
// redrawn in the house style: thick crayon line plus an offset colour underlay (risograph misprint).
// Tabler is an OPTIONAL peer dependency: `icon`, `ascii` and the prop fallback need it, everything else does not.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

// Where the icons come from, in order: LEVNI_ICONS (a folder holding outline/ and filled/),
// @tabler/icons resolved from the current project, then from Levni's own install.
function findIcons() {
  if (process.env.LEVNI_ICONS) return process.env.LEVNI_ICONS;
  for (const base of [join(process.cwd(), 'package.json'), import.meta.url]) {
    try {
      const dir = join(dirname(createRequire(base).resolve('@tabler/icons/package.json')), 'icons');
      if (existsSync(dir)) return dir;
    } catch {}
  }
  return null;
}
export const ICON_DIR = findIcons() || join(process.cwd(), 'node_modules/@tabler/icons/icons');
export const iconsAvailable = () => existsSync(join(ICON_DIR, 'outline'));

export function inner(file) {
  const svg = readFileSync(file, 'utf8');
  return svg
    .slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'))
    .replace(/<path stroke="none"[^>]*\/>/g, '')
    .trim();
}

export const hasIcon = (name) => existsSync(join(ICON_DIR, 'outline', `${name}.svg`));

// Draws icon `name` centred at (x, y), `size` px wide. `line` is the outline colour,
// `under` the underlay colour (filled icon if one exists, otherwise a soft disc).
export function icon(name, { x, y, size = 300, line, under, lineWidth = 12, nudge = [9, 7], disc = true }) {
  const k = size / 24;
  const t = (dx = 0, dy = 0) => `translate(${x - size / 2 + dx} ${y - size / 2 + dy}) scale(${k})`;
  let out = '';
  const filled = join(ICON_DIR, 'filled', `${name}.svg`);
  if (under && existsSync(filled)) {
    out += `<g transform="${t(...nudge)}" fill="${under}" stroke="none">${inner(filled)}</g>`;
  } else if (under && disc) {
    out += `<circle cx="${x + nudge[0]}" cy="${y + nudge[1]}" r="${size * 0.42}" fill="${under}"/>`;
  }
  out += `<g transform="${t()}" fill="none" stroke="${line}" stroke-width="${lineWidth / k}" stroke-linecap="round" stroke-linejoin="round">${inner(join(ICON_DIR, 'outline', `${name}.svg`))}</g>`;
  return out;
}

export const iconFile = (name, kind = 'outline') => join(ICON_DIR, kind, `${name}.svg`);

// Concept -> icon name. Directors (Claude) write plain English concepts ("oil barrel", "court");
// this maps them onto Tabler names and tags, so a wrong guess degrades to a close icon instead of failing.
let index = null;
function loadIndex() {
  if (index) return index;
  const meta = join(ICON_DIR, '..', 'icons.json');
  const data = existsSync(meta) ? Object.values(JSON.parse(readFileSync(meta, 'utf8'))) : [];
  index = data.filter((d) => hasIcon(d.name)).map((d) => ({ name: d.name, parts: d.name.split('-'), tags: (d.tags || []).map(String), filled: existsSync(iconFile(d.name, 'filled')) }));
  return index;
}

export function resolveIcon(query) {
  const q = String(query).trim().toLowerCase();
  const slug = q.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (hasIcon(slug)) return slug;
  const tokens = slug.split('-').filter(Boolean);
  let best = null, bestScore = 0;
  for (const d of loadIndex()) {
    let score = 0;
    for (const t of tokens) {
      if (d.parts.includes(t)) score += 10;
      else if (d.tags.includes(t)) score += 6;
      else if (d.tags.some((g) => g.startsWith(t) && t.length > 3)) score += 2;
    }
    if (!score) continue;
    if (d.parts.includes('off') && !tokens.includes('off')) score -= 8;
    score += d.filled ? 1.5 : 0;
    score -= d.parts.length * 0.6;
    if (score > bestScore) (best = d.name), (bestScore = score);
  }
  return best;
}

// Resolve a director spec in place: `main` may be a concept or a list of fallbacks; extras drop what fails.
export function resolveSpec(spec) {
  // an exact icon name anywhere in the candidate list beats a fuzzy match on an earlier one
  const slug = (c) => String(c).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const pick = (v) => [].concat(v).map(slug).find(hasIcon) || [].concat(v).map(resolveIcon).find(Boolean);
  const main = pick(spec.main) || 'news';
  const extras = [...new Set([].concat(spec.extras || []).map((e) => pick(e)).filter((n) => n && n !== main))];
  return { ...spec, main, extras };
}
