import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Static site for Cloudflare Pages: build command `npm run build`, output directory `dist`, root directory `site`.
export default defineConfig({
  site: 'https://levni.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap()],
  build: { inlineStylesheets: 'always' },
  // plain <pre> blocks styled by the site (no Shiki theme, no extra CSS)
  markdown: { syntaxHighlight: false },
});
