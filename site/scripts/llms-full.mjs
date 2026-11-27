// Writes dist/llms-full.txt after `astro build`: the summary from public/llms.txt, then every docs page
// (in sidebar order) and the MCP page, turned from the built HTML into plain Markdown. No dependencies.
// Used as an Astro integration in astro.config.mjs; also runs on its own: `node scripts/llms-full.mjs [dist]`.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://levni.dev';

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rarr: '→', larr: '←', middot: '·', mdash: '—', ndash: '–', hellip: '…', times: '×', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITIES[e.toLowerCase()] ?? m;
  });
const strip = (s) => s.replace(/<[^>]+>/g, '');
const abs = (href) => (href.startsWith('/') ? SITE + href : href.startsWith('#') ? '' : href);

/** One page's main column as Markdown. */
export function htmlToMarkdown(html) {
  const blocks = [];
  const keep = (s) => `\u0000${blocks.push(s) - 1}\u0000`;
  let s = html
    .replace(/<(script|style|svg|button|template|noscript)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<(img|source|input)\b[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  // code blocks first, kept verbatim
  s = s.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, c) => keep('\n\n```\n' + decode(strip(c)).replace(/\n+$/, '') + '\n```\n\n'));
  s = s
    .replace(/<code\b[^>]*>([\s\S]*?)<\/code>/gi, (_, c) => keep('`' + decode(strip(c)) + '`'))
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_, h, t) => {
      // flatten nested markup (cards with a title and a note) into one plain line
      const text = decode(strip(t.replace(/<\/(b|strong|small|span|em)>/gi, ' '))).replace(/→/g, '').replace(/\s+/g, ' ').trim();
      const url = abs(decode(h));
      return url && text ? `[${text}](${url})` : text;
    })
    .replace(/<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, n, t) => `\n\n${'#'.repeat(+n)} ${strip(t).trim()}\n\n`)
    .replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<dt\b[^>]*>/gi, '\n- ')
    .replace(/<dd\b[^>]*>/gi, ': ')
    .replace(/<summary\b[^>]*>([\s\S]*?)<\/summary>/gi, '\n\n**$1**\n\n')
    .replace(/<tr\b[^>]*>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?(p|div|section|ul|ol|dl|table|figure|figcaption|details|aside|header|blockquote)\b[^>]*>/gi, '\n\n');
  s = decode(strip(s))
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[+i]);
  return s.replace(/\n{3,}/g, '\n\n').trim();
}

const pick = (html, re) => html.match(re)?.[1] ?? '';

export function buildLlmsFull(dist, publicDir) {
  const read = (route) => {
    const f = join(dist, route, 'index.html');
    return existsSync(f) ? readFileSync(f, 'utf8') : '';
  };
  const docsIndex = read('docs');
  const side = pick(docsIndex, /<aside class="docs-side"[\s\S]*?>([\s\S]*?)<\/aside>/);
  const routes = [...new Set([...side.matchAll(/href="(\/docs\/[^"#]*)"/g)].map((m) => m[1]))];
  if (!routes.includes('/docs/')) routes.unshift('/docs/');
  routes.push('/mcp/');

  const intro = readFileSync(join(publicDir, 'llms.txt'), 'utf8').split('\n## ')[0].trim();
  const out = [intro, '', `This file holds the full text of the Levni docs, one section per page, generated at build time from ${SITE}/docs/. The short index is ${SITE}/llms.txt.`];
  for (const route of routes) {
    const html = read(route.replace(/^\/|\/$/g, ''));
    if (!html) continue;
    const body = pick(html, /<article class="prose" id="docs-article">([\s\S]*?)<\/article>/) || pick(html, /<main\b[^>]*>([\s\S]*?)<\/main>/);
    if (!body) continue;
    out.push('', '---', '', `Source: ${SITE}${route}`, '', htmlToMarkdown(body));
  }
  const text = out.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
  writeFileSync(join(dist, 'llms-full.txt'), text);
  return { pages: routes.length, bytes: Buffer.byteLength(text) };
}

export default function llmsFull() {
  return {
    name: 'levni-llms-full',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const { pages, bytes } = buildLlmsFull(dist, fileURLToPath(new URL('../public/', import.meta.url)));
        logger.info(`llms-full.txt: ${pages} pages, ${(bytes / 1024).toFixed(0)} KB`);
      },
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = process.argv[2] ?? fileURLToPath(new URL('../dist/', import.meta.url));
  console.log(buildLlmsFull(dist, fileURLToPath(new URL('../public/', import.meta.url))));
}
