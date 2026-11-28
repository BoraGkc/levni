// Renders the repository's own markdown (docs/scene.md, board.md, poster.md) at build time, so the site never
// drifts from the source. The build runs from site/, so the repo root is one level up.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { markdownToHtml } from 'satteri';
import { SITE } from '../../site';

export interface Heading { id: string; text: string; level: 2 | 3 }
export interface Section { title: string; id: string; md: string }

const strip = (s: string) => s.replace(/`/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').trim();
export const slugify = (s: string) =>
  strip(s).toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, '').trim().replace(/\s+/g, '-');

/** Split a markdown file into its intro (before the first ##) and its ## sections. */
export function readDoc(file: string): { intro: string; sections: Section[] } {
  const raw = readFileSync(resolve(process.cwd(), '..', 'docs', file), 'utf8').replace(/^# .*\n+/, '');
  const parts = raw.split(/^## /m);
  const intro = parts.shift() ?? '';
  const sections = parts.map((p) => {
    const nl = p.indexOf('\n');
    const title = p.slice(0, nl).trim();
    return { title, id: slugify(title), md: p.slice(nl + 1) };
  });
  return { intro, sections };
}

/** Split the "Known limits" section: its bullets stay, the ### recipes go on their own. */
export function splitAt(md: string, marker: string): [string, string] {
  const i = md.indexOf(marker);
  return i < 0 ? [md, ''] : [md.slice(0, i), md.slice(i)];
}

const used = new Set<string>();
export function resetIds() { used.clear(); }
function uniqueId(base: string) {
  let id = base || 'section';
  for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
  used.add(id);
  return id;
}

const link = (href: string) => {
  const ex = href.match(/^\.\.\/examples\/(.+)$/);
  if (ex) return `${SITE.github}/blob/main/examples/${ex[1]}`;
  if (href === 'scene.schema.json') return `${SITE.github}/blob/main/docs/scene.schema.json`;
  if (href === 'scene.md') return '/docs/elements/';
  if (href === 'animate.md') return '/docs/animation/';
  if (href === 'export.md') return '/docs/export/';
  if (href === 'brandkit.md') return '/docs/brand-kits/';
  if (href === 'storyboard.md') return '/docs/storyboards/';
  return href;
};

export interface Rendered { html: string; toc: Heading[] }

/**
 * Markdown to HTML. `h2` is the heading to emit for a section title (so a page can add its own h2 and still
 * keep the markdown's ### headings below it); headings get ids, tables scroll inside their own box.
 */
export function render(md: string, opts: { title?: string; id?: string; shift?: number } = {}): Rendered {
  const toc: Heading[] = [];
  const shift = opts.shift ?? 0;
  let html = (markdownToHtml(md) as { html: string }).html;
  html = html.replace(/<h([1-6])>([\s\S]*?)<\/h\1>/g, (_m, lv, inner) => {
    const level = Math.min(Number(lv) + shift, 4);
    const text = inner.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    const id = uniqueId(slugify(text));
    if (level === 2 || level === 3) toc.push({ id, text, level });
    return `<h${level} id="${id}">${inner}<a class="anchor" href="#${id}" aria-label="Link to ${text.replace(/"/g, '')}">#</a></h${level}>`;
  });
  // each cell carries its column name, so a narrow screen can show a row as a labelled card
  html = html.replace(/<table>([\s\S]*?)<\/table>/g, (whole, body) => {
    const heads = [...String(body).matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => m[1].replace(/<[^>]+>/g, '').replace(/"/g, '&quot;').trim());
    if (!heads.length) return whole;
    return whole.replace(/<tr>([\s\S]*?)<\/tr>/g, (row, cells) => {
      let i = 0;
      return `<tr>${String(cells).replace(/<td(\s[^>]*)?>/g, (_t, attrs) => `<td${attrs || ''} data-label="${heads[i++] ?? ''}">`)}</tr>`;
    });
  });
  html = html
    .replace(/<table>/g, '<div class="table-wrap" tabindex="0" role="region" aria-label="Table, scrolls sideways"><table>')
    .replace(/<\/table>/g, '</table></div>')
    .replace(/href="([^"]+)"/g, (_m, h) => `href="${link(h)}"`);
  if (opts.title) {
    const id = uniqueId(opts.id ?? slugify(opts.title));
    toc.unshift({ id, text: opts.title.replace(/`/g, ''), level: 2 });
    html = `<h2 id="${id}">${renderInline(opts.title)}<a class="anchor" href="#${id}" aria-label="Link to ${strip(opts.title)}">#</a></h2>\n${html}`;
  }
  return { html, toc };
}

function renderInline(t: string) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/`([^`]+)`/g, '<code>$1</code>');
}

/** Render several sections in order and collect one table of contents. */
export function renderSections(secs: Section[], extra: { title: string; md: string; id?: string }[] = []): Rendered {
  const out = [...secs.map((s) => ({ title: s.title, md: s.md, id: s.id })), ...extra].map((s) => render(s.md, { title: s.title, id: s.id }));
  return { html: out.map((o) => o.html).join('\n'), toc: out.flatMap((o) => o.toc) };
}
