// Checks one prop object (the JSON format of library/props/*.json). Returns a list of problems, empty when fine.
import { COLORS } from './compose.mjs';
import { flattenPath } from './ink.mjs';

export function validateProp(p) {
  const errs = [];
  const name = p?.name;
  if (typeof name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errs.push(`name "${name}" must be lowercase a-z0-9 and hyphens`);
  if (!Array.isArray(p?.tags)) errs.push('tags must be an array');
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
