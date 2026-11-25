// Vite plugin: inside Levni's src/, swap node:fs, node:path, node:url, node:module and sharp for the browser shims
// in the client build. Server-side (SSR) builds keep the real modules.
//   import levni from '@levni/levni/vite';  export default { plugins: [levni()] }   (Astro: vite: { plugins: [...] })
import { fileURLToPath } from 'node:url';

const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const SRC = fileURLToPath(new URL('..', import.meta.url));
const MAP = { 'node:fs': 'fs.mjs', fs: 'fs.mjs', 'node:path': 'path.mjs', path: 'path.mjs', 'node:url': 'url.mjs', 'node:module': 'module.mjs', sharp: 'sharp.mjs' };

export default function levniBrowser() {
  return {
    name: 'levni-browser',
    enforce: 'pre',
    resolveId(id, importer, opts) {
      if (opts?.ssr || !importer || !MAP[id]) return null;
      const from = importer.replace(/^\/@fs/, '').split('?')[0];
      return from.startsWith(SRC) ? here(MAP[id]) : null;
    },
  };
}
