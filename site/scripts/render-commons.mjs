// The Folio commons (/commons/): what is in the open library, where it came from, who drew it, and what is wanted.
// Reads library/props/*.json; writes src/data/commons.json. Usage numbers come from the public npm API and are kept
// from the last run when the network is down.
//   node scripts/render-commons.mjs
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const DIR = here('../library/props/');
const OUT = here('src/data/commons.json');

// common objects people reach for, by theme; the ones the library lacks become the Wanted list
const THEMES = [
  { id: 'kitchen', title: 'The kitchen drawer', text: 'Recipes, menus and food blogs keep asking for the tools, not only the food.', words: ['whisk', 'grater', 'ladle', 'colander', 'toaster', 'blender', 'spatula', 'oven mitt', 'mortar', 'apron', 'rolling pin', 'kettle', 'teapot', 'cutting board', 'frying pan', 'jar'] },
  { id: 'music', title: 'The band room', text: 'Posters for gigs, podcasts and music lessons. We have a guitar and a mic; the rest of the band is missing.', words: ['drum', 'accordion', 'harp', 'trumpet', 'saxophone', 'ukulele', 'metronome', 'violin', 'flute', 'xylophone', 'cello', 'maracas', 'piano', 'guitar', 'headphones', 'vinyl'] },
  { id: 'nature', title: 'Small animals, forest floor', text: 'Children’s books, garden shops and climate stories. Fewer than half of these exist yet.', words: ['fern', 'acorn', 'pinecone', 'seashell', 'coral', 'bee', 'snail', 'hedgehog', 'fox', 'owl', 'whale', 'octopus', 'turtle', 'frog', 'squirrel', 'mushroom', 'cactus', 'butterfly', 'rabbit', 'deer'] },
  { id: 'studio', title: 'The print studio', text: 'Riso, screen print and the desk around it: the tools of the people Levni is made for.', words: ['brayer', 'squeegee', 'cutting mat', 'protractor', 'paint tube', 'stapler', 'tape', 'glue', 'sketchbook', 'easel', 'palette', 'ruler', 'scissors', 'eraser'] },
  { id: 'turkish', title: 'From Istanbul', text: 'The objects of the city Levni comes from: tea, games, instruments.', words: ['backgammon', 'samovar', 'ney', 'baglama', 'fez', 'tea glass', 'simit', 'cezve', 'evil eye', 'pomegranate', 'ferry', 'seagull'] },
];

const props = readdirSync(DIR).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(DIR + f, 'utf8')));
const words = new Set();
for (const p of props) for (const w of [p.name, ...(p.tags || []).slice(0, 3), ...(p.aliases || [])]) words.add(String(w).toLowerCase().replace(/-/g, ' '));
const has = (w) => words.has(w) || words.has(w.replace(/ /g, ''));
// the drawing that answers a word: its name first, then a tag or alias
const norm = (w) => String(w).toLowerCase().replace(/-/g, ' ');
const drawingFor = (w) => (props.find((p) => norm(p.name) === w) || props.find((p) => [...(p.tags || []).slice(0, 3), ...(p.aliases || [])].some((t) => norm(t) === w)))?.name;

// where each drawing came from: credited, redrawn from an open set, or drawn by the studio
const source = (p) => {
  const note = (p.variants?.[0]?.note || '') + ' ' + (p.author || '');
  if (/Tabler Icons/i.test(note)) return 'tabler';
  if (/AI-assisted/i.test(note)) return 'assisted';
  return 'studio';
};
const sources = { studio: 0, tabler: 0, assisted: 0 };
for (const p of props) sources[source(p)]++;

// a drawing that reads at 40 px: several shapes and at least two of them filled with colour
const solid = (p) => { const ps = p.variants?.[0]?.paths || []; return ps.length >= 3 && ps.filter((x) => x.fill && !['none', 'paper', 'white'].includes(x.fill)).length >= 2; };
const cats = {};
for (const p of props) cats[p.category] = (cats[p.category] || 0) + 1;
const categories = Object.entries(cats).map(([id, n]) => {
  const mine = props.filter((p) => p.category === id), drawn = mine.filter((p) => source(p) !== 'tabler' && !p.name.startsWith('pixel-') && solid(p));
  const sample = drawn.length >= 6 ? drawn : mine;
  const pick = sample.filter((_, i) => i % Math.max(1, Math.floor(sample.length / 6)) === 0).slice(0, 6).map((p) => p.name);
  return { id, n, sample: pick };
}).sort((a, b) => b.n - a.n);

const variants = props.reduce((a, p) => a + (p.variants?.length || 0), 0);
const themes = THEMES.map((t) => {
  const missing = t.words.filter((w) => !has(w));
  const present = t.words.filter((w) => has(w)).map((w) => ({ word: w, name: drawingFor(w) })).filter((x, i, all) => x.name && all.findIndex((y) => y.name === x.name) === i); // one tile per drawing
  return { ...t, words: undefined, missing, present, total: t.words.length };
});

let usage = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).usage : null;
try {
  const r = await fetch('https://api.npmjs.org/downloads/point/last-month/@levni/levni');
  if (r.ok) { const j = await r.json(); usage = { npmMonth: j.downloads, from: j.start, to: j.end }; }
} catch { /* keep the last numbers */ }

const out = { at: new Date().toISOString().slice(0, 10), drawings: props.length, variants, categories, sources, themes, wanted: themes.reduce((a, t) => a + t.missing.length, 0), usage };
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`commons: ${out.drawings} drawings, ${out.wanted} wanted across ${themes.length} calls, npm ${usage?.npmMonth ?? '?'} / month`);
