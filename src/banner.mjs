// README banners: a repo (name, description, topics, language, stars) becomes a 1280 × 640 scene, the size GitHub
// uses for a social preview. Pure: no files, no network, so it runs in Node, in the browser and in a Worker.
//   import { bannerScene, pickMark } from '@levni/levni/banner';
//   const mark = pickMark(['cli', 'markdown'], index)[0];   // index: [{ name, tags, aliases?, variants? }]
//   const scene = bannerScene({ name: 'levni', owner: 'BoraGkc', description: '…', mark, stars: 120, language: 'JavaScript' });

export const BANNER_SIZE = [1280, 640];

// palettes: ground, panel, disc behind the mark, text, muted text, accent inks for the marks
export const BANNER_THEMES = {
  riso: { ground: 'paper', panel: 'blue', disc: 'mustard', text: '#14181F', muted: '#4A5160', marks: ['coral', 'mustard', 'paper'] },
  coral: { ground: 'paper', panel: 'coral', disc: 'tone-mustard', text: '#14181F', muted: '#4A5160', marks: ['blue', 'mustard', 'paper'] },
  green: { ground: 'paper', panel: 'green', disc: 'tone-mustard', text: '#14181F', muted: '#4A5160', marks: ['coral', 'mustard', 'paper'] },
  night: { ground: 'dark', panel: 'blue', disc: 'coral', text: '#F1EEE6', muted: '#AEB6C6', marks: ['mustard', 'coral', 'tone'] },
};

const STOP = new Set(('a an the and or of for to in on with by from into your you our its it is are be as at this that these those ' +
  'using use used via based simple fast small tiny modern open source library framework tool tools app apps project ' +
  'written made make built easy lightweight minimal new best awesome powerful collection official plugin support ' +
  'get up run running other more any all just like every bir ve ile için de da bu').split(' '));

const words = (s) => String(s || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .split(/[^a-z0-9ığüşöç]+/).filter((w) => w.length > 1 && !STOP.has(w));

// Candidate marks for a repo, best first. `terms` are ordered strongest first (topics, then name and description words,
// then the language); `index` is the Folio index. Exact name > alias > tag > a part of a hyphenated name.
// Drawings beat line icons redrawn from Tabler: they make a better hero.
export function pickMark(terms, index, { limit = 12 } = {}) {
  const score = new Map();
  const add = (name, s) => score.set(name, (score.get(name) || 0) + s);
  const list = [...new Set(terms.flatMap((t) => [String(t).toLowerCase(), ...words(t)]))].filter(Boolean);
  list.forEach((t, i) => {
    const weight = Math.max(1, 10 - i * 0.6); // earlier terms count more
    const sing = t.endsWith('s') && t.length > 3 ? t.slice(0, -1) : t;
    for (const p of index) {
      const tags = (p.tags || []).map((x) => String(x).toLowerCase());
      if (p.name === t || p.name === sing) add(p.name, 6 * weight);
      else if ((p.aliases || []).includes(t)) add(p.name, 5 * weight);
      else if (tags.includes(t) || tags.includes(sing)) add(p.name, 3 * weight);
      else if (t.length > 3 && p.name.split('-').includes(sing)) add(p.name, 2 * weight);
    }
  });
  const isIcon = (p) => (p.variants || []).every((v) => /line icon|pixel/i.test(typeof v === 'string' ? v : v.note || ''));
  const byName = new Map(index.map((p) => [p.name, p]));
  return [...score.entries()]
    .map(([name, s]) => [name, s * (isIcon(byName.get(name)) ? 0.35 : 1)])
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit).map(([name]) => name);
}

// The terms pickMark reads for a repo, strongest first.
export const repoTerms = ({ topics = [], name = '', description = '', language = '' }) =>
  [...topics.flatMap((t) => [t, ...t.split('-')]), ...words(name.replace(/[-_.]/g, ' ')), ...words(description), String(language).toLowerCase()].filter(Boolean);

export const FALLBACK_MARKS = ['rocket', 'lightbulb', 'toolbox', 'compass', 'paper-plane', 'key'];

// a stable number from a string, for the seed
export const hashSeed = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return (h >>> 0) % 9973 + 1; };

const fmtStars = (n) => n == null ? '' : n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k` : String(n);

// greedy wrap to at most `max` lines of `per` characters, ellipsis on overflow
function wrap(text, per, max) {
  const out = [];
  let cur = '';
  for (const w of String(text || '').trim().split(/\s+/).filter(Boolean)) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= per) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  if (out.length > max) { out.length = max; out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '…'; }
  return out.map((l) => l.length > per + 2 ? l.slice(0, per) + '…' : l);
}

// bannerScene(repo) -> a Levni scene (plain JSON: print it, edit it, render it anywhere).
//   name (required), owner, description, stars, language, languageColor ('#rrggbb'),
//   mark (a Folio name), variant, theme (riso | coral | green | night), seed, credit (default true: "levni.dev")
//   motion (true: the banner becomes a loop for `animate()`: the name types itself, the mark pops in and floats,
//   the lines slide in, the disc breathes; everything is settled by mid-loop and held to the end)
export function bannerScene(repo) {
  const name = String(repo.name || '').trim();
  if (!name) throw new Error('banner needs a repo name');
  const th = BANNER_THEMES[repo.theme] || BANNER_THEMES.riso;
  const [W, H] = BANNER_SIZE;
  const seed = repo.seed ?? hashSeed(`${repo.owner || ''}/${name}`);
  const split = 790; // text column | art panel
  const cx = split + (W - split) / 2, cy = H / 2 + 6;
  const lines = wrap(repo.description, 34, 3);
  const meta = [repo.stars ? `${fmtStars(repo.stars)} ${repo.stars === 1 ? 'star' : 'stars'}` : '', repo.language || ''].filter(Boolean).join('   ');
  const nameH = name.length > 16 ? 96 : 124;
  const top = lines.length ? 150 : 210;

  const mo = (m) => (repo.motion ? { motion: m } : {}); // motion only when asked: a still banner stays byte-identical
  const el = [
    { type: 'panel', x: split, y: -20, w: W - split + 40, h: H + 40, color: th.panel },
    { type: 'disc', x: cx, y: cy, r: 178, color: th.disc, ...mo([{ type: 'pop', delay: 0, dur: 0.14 }, { type: 'pulse', amp: 0.03 }]) },
    { type: 'marks', area: [split + 30, 40, W - split - 60, H - 80], count: 7, colors: th.marks },
    { type: 'prop', name: repo.mark || FALLBACK_MARKS[seed % FALLBACK_MARKS.length], variant: repo.variant ?? 0, x: cx, y: cy, size: 330, shadow: true, ...mo([{ type: 'pop', delay: 0.08, dur: 0.16 }, { type: 'float', amp: 9 }]) },
  ];
  if (repo.owner) el.push({ type: 'type', text: `${repo.owner} /`.toUpperCase(), x: 84, y: top - 52, size: 24, font: 'mono', weight: 700, tracking: 0.04, color: th.muted, ...mo({ type: 'fade', delay: 0.02, dur: 0.1 }) });
  el.push({ type: 'type', text: name, x: 80, y: top, w: split - 150, h: nameH, fit: 'box', font: 'black', color: th.text, ...mo({ type: 'typewriter', delay: 0.08, dur: Math.min(0.3, 0.06 + name.length * 0.014), cursor: '_' }) });
  if (lines.length) el.push({ type: 'type', text: lines.join('\n'), x: 84, y: top + nameH + 48, size: 32, weight: 400, leading: 1.32, color: th.text, ...mo({ type: 'slide', from: 'down', distance: 26, delay: 0.42, dur: 0.14 }) });
  if (meta) {
    if (repo.languageColor && repo.language) el.push({ type: 'disc', x: 92, y: H - 92, r: 9, color: repo.languageColor, ...mo({ type: 'fade', delay: 0.56, dur: 0.12 }) });
    el.push({ type: 'type', text: meta, x: repo.languageColor && repo.language ? 112 : 84, y: H - 102, size: 22, font: 'mono', weight: 700, color: th.muted, ...mo({ type: 'fade', delay: 0.56, dur: 0.12 }) });
  }
  if (repo.credit !== false) el.push({ type: 'type', text: 'levni.dev', x: W - 36, y: H - 44, size: 15, font: 'mono', weight: 700, align: 'right', color: '#F1EEE6' });
  return { canvas: [W, H], seed, background: th.ground, elements: el };
}
