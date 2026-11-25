// Vite plugin: inside Levni's src/, swap node:fs, node:path, node:url, node:module and sharp for the browser shims
// in the client build. Server-side (SSR) builds keep the real modules.
//   import levni from '@levni/levni/vite';  export default { plugins: [levni()] }   (Astro: vite: { plugins: [...] })
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const here = (f) => fileURLToPath(new URL(f, import.meta.url));
const SRC = fileURLToPath(new URL('..', import.meta.url));
const ENV = here('env.mjs');
const MAP = { 'node:fs': 'fs.mjs', fs: 'fs.mjs', 'node:path': 'path.mjs', path: 'path.mjs', 'node:url': 'url.mjs', 'node:module': 'module.mjs', sharp: 'sharp.mjs' };

export default function levniBrowser() {
  return {
    name: 'levni-browser',
    enforce: 'pre',
    async resolveId(id, importer, opts) {
      if (opts?.ssr || !importer) return null;
      const from = importer.replace(/^\/@fs/, '').split('?')[0];
      if (!from.startsWith(SRC)) return null;
      if (MAP[id]) return here(MAP[id]);
      // fontkit: resolve it from the site that bundles Levni, which may install it on its own (a Pages build
      // installs only the site's packages, not Levni's), then fall back to Levni's own install
      if (id === 'fontkit') return (await this.resolve(id, join(process.cwd(), 'package.json'), { skipSelf: true })) || null;
      return null;
    },
    // a Levni module that reads `process` at load time imports the browser's empty `process` first, so the shim is
    // in place however the bundler splits and orders the chunks (src/browser/env.mjs)
    transform(code, id, opts) {
      if (opts?.ssr) return null;
      const file = id.replace(/^\/@fs/, '').split('?')[0];
      if (!file.startsWith(SRC) || file === ENV || !/\bprocess\./.test(code)) return null;
      return { code: `import ${JSON.stringify(ENV)};\n${code}`, map: null };
    },
  };
}
