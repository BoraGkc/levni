import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import levniBrowser from '../src/browser/vite.mjs';
import llmsFull from './scripts/llms-full.mjs';
import { readdirSync, readFileSync } from 'node:fs';

// lastmod per post: `updated`, else `date`, from the frontmatter of each blog post
const lastmod = new Map();
for (const f of readdirSync('./src/content/blog').filter((n) => n.endsWith('.md'))) {
  const fm = readFileSync(`./src/content/blog/${f}`, 'utf8').split('---')[1] ?? '';
  const pick = (k) => fm.match(new RegExp(`^${k}: *(\\S+)`, 'm'))?.[1];
  const d = pick('updated') ?? pick('date');
  if (d && !/^draft: *true/m.test(fm)) lastmod.set(`https://levni.dev/blog/${f.replace(/\.md$/, '')}/`, new Date(d).toISOString());
}

// Static site for Cloudflare Pages: build command `npm run build`, output directory `dist`, root directory `site`.
export default defineConfig({
  site: 'https://levni.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/embed/'), // the iframe demo is not a page of its own
      serialize(item) {
        const m = lastmod.get(item.url);
        if (m) item.lastmod = m;
        return item;
      },
    }),
    llmsFull(), // dist/llms-full.txt from the built docs pages
  ],
  build: { inlineStylesheets: 'always' },
  // plain <pre> blocks styled by the site (no Shiki theme, no extra CSS)
  markdown: { syntaxHighlight: false },
  // /banner/ runs Levni itself in the browser: the plugin swaps node:fs, sharp and friends for small shims
  vite: { plugins: [levniBrowser()], server: { fs: { allow: ['..'] } } },
});
