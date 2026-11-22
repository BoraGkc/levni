// Prop library: objects drawn once in a 0..100 box with colour names, stored as JSON (library/props/*.json).
// A scene uses { "type": "prop", "name": "phone", "variant": 1, "x", "y", "size", "flip"?, "rot"?, "overprint"?,
// "recolor"?: { "coral": "mustard" }, "palette"?: "blue" }.
// Extra libraries: set LEVNI_PROPS to one or more folders (path-delimited), or call addPropDir(dir).
// A prop in a later folder with the same name replaces the built-in one.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIBRARY_DIR = fileURLToPath(new URL('../library/props/', import.meta.url));
const dirs = [LIBRARY_DIR, ...(process.env.LEVNI_PROPS ? process.env.LEVNI_PROPS.split(delimiter).filter(Boolean) : [])];
let cache = null;

export function addPropDir(dir) {
  dirs.push(dir);
  cache = null;
}

export function loadProps() {
  if (cache) return cache;
  cache = {};
  for (const dir of dirs) if (existsSync(dir)) for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const p = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    cache[p.name] = p;
  }
  return cache;
}

// Find a prop by name or by any of its tags (tags are multilingual), e.g. "telefon" -> phone.
export function findProp(q) {
  const all = loadProps(), k = String(q).toLowerCase().trim();
  return all[k] || Object.values(all).find((p) => (p.tags || []).some((t) => t.toLowerCase() === k)) || null;
}

// palette "blue" folds every accent into the blue family (for sensitive subjects); recolor maps single colours
const BLUE = { coral: 'blue', mustard: 'tone', green: 'tone', 'tone-coral': 'tone', 'tone-mustard': 'tone', 'tone-green': 'tone', dark: 'ink' };

export function expandProp(e) {
  if (e.type !== 'prop') return e;
  const p = findProp(e.name);
  if (!p) return { ...e, type: 'icon' }; // fall back to the icon set (needs @tabler/icons)
  const v = p.variants[Math.min(p.variants.length - 1, e.variant ?? 0)];
  const map = { ...(e.palette === 'blue' ? BLUE : {}), ...(e.recolor || {}) };
  const re = (col) => (col && map[col]) || col;
  return { ...e, type: 'draw', paths: v.paths.map((x) => ({ ...x, fill: re(x.fill), stroke: re(x.stroke) })) };
}
