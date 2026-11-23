import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
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
      serialize(item) {
        const m = lastmod.get(item.url);
        if (m) item.lastmod = m;
        return item;
      },
    }),
  ],
  build: { inlineStylesheets: 'always' },
  // plain <pre> blocks styled by the site (no Shiki theme, no extra CSS)
  markdown: { syntaxHighlight: false },
});
