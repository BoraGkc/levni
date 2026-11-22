// Checks one prop object (the JSON format of library/props/*.json). Returns a list of problems, empty when fine.
import { COLORS } from './compose.mjs';

export function validateProp(p) {
  const errs = [];
  const name = p?.name;
  if (typeof name !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) errs.push(`name "${name}" must be lowercase a-z0-9 and hyphens`);
  if (!Array.isArray(p?.tags)) errs.push('tags must be an array');
  if (!Array.isArray(p?.variants) || !p.variants.length) return [...errs, 'needs at least one variant'];
  p.variants.forEach((v, i) => {
    const at = `variant ${i}`;
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
