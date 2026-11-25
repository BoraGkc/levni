// One place for links and facts the pages repeat.
import folio from './data/props.json';
export const SITE = {
  name: 'Levni',
  url: 'https://levni.dev',
  tagline: 'Your agent’s design studio',
  description:
    'Levni is an open library of hand-inked illustrations and the engine that composes them: covers, icons, spot illustrations and social images from a JSON scene, in one consistent style. Free for agents and publishers.',
  github: 'https://github.com/BoraGkc/levni',
  githubReady: true,
  npm: 'https://www.npmjs.com/package/@levni/levni',
  version: '0.4',
  ortakAlan: 'https://ortakalan.io',
  props: folio.length,
  variants: folio.reduce((n, p) => n + p.variants.length, 0),
};
