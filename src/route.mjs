// Design Router on this machine: the catalogue built from the Folio on disk and the Tabler icons when they are installed.
//   import { routeDesign } from '@levni/levni';
//   routeDesign('coffee', { colors: ['#E8522F', '#1E1466'] })  -> { results: [{ kind, id, license, credit, snippet, scene }], counts }
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadProps } from './props.mjs';
import { ICON_DIR, iconsAvailable } from './icon.mjs';
import { catalog, route, routeScene } from './router.mjs';

let cached = null;
export function designCatalog() {
  if (cached) return cached;
  const props = Object.values(loadProps()).map((p) => ({ name: p.name, category: p.category, tags: p.tags, aliases: p.aliases, author: p.author, variants: (p.variants || []).map((v) => v.note || '') }));
  const dir = join(ICON_DIR, 'outline');
  const icons = iconsAvailable() && existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)) : [];
  return (cached = catalog({ props, icons }));
}

/** Search drawings, icons, fonts, palettes, patterns, motion and shots at once. Each result gets a preview scene in your colours. */
export function routeDesign(query, { kinds, limit = 12, colors } = {}) {
  const r = route(query, designCatalog(), { kinds, limit });
  return { ...r, results: r.results.map((x) => ({ ...x, scene: routeScene(x, { colors }) })) };
}
