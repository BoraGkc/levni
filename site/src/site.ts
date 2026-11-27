// One place for links and facts the pages repeat.
import folio from './data/props.json';
export const SITE = {
  name: 'Levni',
  url: 'https://levni.dev',
  tagline: 'Open-source design studio for AI agents',
  description:
    'Open-source design engine for AI agents: covers, icons, brand boards and posters from a short JSON scene, drawn on your machine. No image model, no API key, $0 per image; code MIT, drawings CC BY 4.0.',
  github: 'https://github.com/Levni-Dev/levni',
  githubReady: true,
  npm: 'https://www.npmjs.com/package/@levni/levni',
  version: '0.4',
  ortakAlan: 'https://ortakalan.io',
  props: folio.length,
  variants: folio.reduce((n, p) => n + p.variants.length, 0),
};
