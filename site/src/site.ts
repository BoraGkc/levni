// One place for links and facts the pages repeat.
import folio from './data/props.json';
export const SITE = {
  name: 'Levni',
  url: 'https://levni.dev',
  tagline: 'Open-source design studio for AI agents',
  description:
    'Open-source design engine for AI agents: covers, icons, brand boards and poster series from JSON, drawn on your machine with 1,600+ CC BY drawings. MCP server, no image model, $0.',
  github: 'https://github.com/Levni-Dev/levni',
  githubReady: true,
  npm: 'https://www.npmjs.com/package/@levni/levni',
  version: '0.5',
  ortakAlan: 'https://ortakalan.io',
  props: folio.length,
  variants: folio.reduce((n, p) => n + p.variants.length, 0),
};
