// The docs sitemap: one list drives the sidebar, prev/next links and the overview cards.
export interface DocPage { href: string; title: string; short?: string; blurb: string }
export interface DocGroup { label: string; pages: DocPage[] }

export const DOC_GROUPS: DocGroup[] = [
  {
    label: 'Start',
    pages: [
      { href: '/docs/', title: 'Overview', blurb: 'What Levni is and three ways to use it.' },
      { href: '/docs/getting-started/', title: 'Getting started', short: 'Getting started', blurb: 'Install it and draw your first image in two minutes.' },
    ],
  },
  {
    label: 'Use Levni',
    pages: [
      { href: '/docs/mcp/', title: 'MCP server', blurb: 'Connect an agent: setup, every tool, a sample session.' },
      { href: '/docs/cli/', title: 'Command line', blurb: 'Every levni command and its flags.' },
      { href: '/docs/api/', title: 'Node API', blurb: 'compose, render, critique and friends, from code.' },
    ],
  },
  {
    label: 'Reference',
    pages: [
      { href: '/docs/scenes/', title: 'Scenes', blurb: 'The scene format: canvas, colours, formats, slots, the critic.' },
      { href: '/docs/elements/', title: 'Elements', blurb: 'Every element type with its fields, and recipes.' },
      { href: '/docs/boards/', title: 'Brand boards', blurb: 'One image with mark, palette, mockups and more.' },
      { href: '/docs/posters/', title: 'Branding posters', blurb: 'A series of eight posters from one brand spec.' },
    ],
  },
  {
    label: 'Library',
    pages: [
      { href: '/docs/library/', title: 'The Levni Folio', blurb: 'Find drawings, recolour them, name and tag them, submit your own.' },
    ],
  },
];

export const DOC_PAGES: DocPage[] = DOC_GROUPS.flatMap((g) => g.pages);
export const docPage = (href: string) => DOC_PAGES.find((p) => p.href === href);
