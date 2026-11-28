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
    label: 'Animate and export',
    pages: [
      { href: '/docs/shots/', title: 'Shots', blurb: 'Ready-made motion with your words, drawing and inks.' },
      { href: '/docs/reel/', title: 'Reel', blurb: 'Shots joined with transitions into one video.' },
      { href: '/docs/stamp/', title: 'Stamp and remix', blurb: 'Every PNG carries its scene and who made it.' },
      { href: '/docs/readme-action/', title: 'README Action', blurb: 'A moving banner on every release.' },
      { href: '/docs/animation/', title: 'Animation', blurb: 'Loop any scene as GIF, WebP or MP4: motion, stagger, camera, moving README banners.' },
      { href: '/docs/storyboards/', title: 'Storyboards', blurb: 'Draw a shot list as one contact sheet, plus full-size frames and shots.json.' },
      { href: '/docs/print/', title: 'Print', blurb: 'Split a scene into riso plates for a real print run.' },
      { href: '/docs/brand-kits/', title: 'Brand kits', blurb: 'One brand spec makes a folder of matching marks, cards, banners and posters.' },
      { href: '/docs/export/', title: 'Export extras', blurb: 'Frame sequences, sprite sheets, MP4, transparent PNG, seamless tiles, Remotion.' },
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
