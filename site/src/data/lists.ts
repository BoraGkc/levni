// The No FOMO lists: open-source design lists curated by Levni-Dev on GitHub.
// Entries are copied from each repo's data/entries.json (github.com/Levni-Dev/<repo>); refresh by copying them again.
import openDesign from './lists/open-design.json';
import designMcp from './lists/design-mcp.json';
import lettering from './lists/lettering.json';

export type ListEntry = { name: string; url: string; repo?: string | null; desc: string; license?: string | null; stars?: number | null; official?: boolean; category: string };
export type FomoList = {
  slug: string;
  repo: string;
  title: string;
  short: string;
  description: string;
  intro: string;
  entries: ListEntry[];
};

export const LISTS: FomoList[] = [
  {
    slug: 'open-design',
    repo: 'Levni-Dev/awesome-open-design',
    title: 'Awesome Open Design',
    short: 'Open design tools, icon sets, illustrations, fonts, colour and creative code',
    description: 'A curated list of open-source design tools and openly licensed design resources: editors, icon sets, illustrations, fonts, colour tools and creative code. Free, no FOMO.',
    intro: 'Every week a new design tool launches with a waitlist and a credit card form. You do not need it. Most of what a designer needs is already open, free and runs on your own machine. This list is that shelf.',
    entries: openDesign.entries as ListEntry[],
  },
  {
    slug: 'design-mcp',
    repo: 'Levni-Dev/awesome-design-mcp',
    title: 'Awesome Design MCP',
    short: 'Open-source MCP servers that let AI agents do design work',
    description: 'A curated list of open-source MCP servers for design: Figma, Penpot, Blender, Inkscape, diagrams, icons, fonts and UI components for Claude, Codex and Cursor.',
    intro: 'Your agent can already write code. With the right MCP server it can also open a design file, draw a diagram, pick a palette or render a poster. These servers are open source and work today.',
    entries: designMcp.entries as ListEntry[],
  },
  {
    slug: 'lettering',
    repo: 'Levni-Dev/awesome-lettering',
    title: 'Awesome Lettering',
    short: 'Open type design tools, open fonts, lettering and kinetic type',
    description: 'A curated list of open-source type design tools, open fonts, lettering and calligraphy resources, kinetic type and the libraries that put letters on screen.',
    intro: 'Beautiful letters should not sit behind a licence wall. This list collects the open tools to design type, the open fonts to use it, and the code to animate it.',
    entries: lettering.entries as ListEntry[],
  },
];

export const groupByCategory = (entries: ListEntry[]) => {
  const out = new Map<string, ListEntry[]>();
  for (const e of entries) out.set(e.category, [...(out.get(e.category) ?? []), e]);
  return [...out.entries()];
};
export const total = LISTS.reduce((n, l) => n + l.entries.length, 0);
