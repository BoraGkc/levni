// Brand kit: four fields (name, tagline, mark, inks) become a whole consistent folder of brand assets:
// mark, favicons, palette, social cards, story, README banner, brand board, posters, a loop and a one-page index.
// A kit is plain Levni scenes drawn with ONE set of inks, ONE mark and ONE finish, so everything looks like one family.
//   import { renderKit, expandKit, brandFromUrl } from 'levni';
//   const brand = await brandFromUrl('https://example.com');            // optional: name, tagline, inks from a site
//   await renderKit({ brand: { name: 'Kumru', tagline: 'Slow coffee', inks: ['#14181F', '#1F3BE0'] } }, 'kit/');
// brandFromHtml / brandFromUrl read a page (meta tags and the colours in its own inline CSS); nothing else is fetched.
import { mkdirSync, writeFileSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose, critique, COLORS } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { loadProps, findProp } from './props.mjs';
import { pickMark, repoTerms, FALLBACK_MARKS, hashSeed, bannerScene } from './banner.mjs';
import { expandBrand, renderBoard } from './board.mjs';
import { expandPosters, renderPosters, TEMPLATES } from './poster.mjs';
import { animate } from './animate.mjs';
import { layoutType } from './type.mjs';

const HEX = /^#[0-9a-f]{6}$/i;

// ---------------------------------------------------------------------------------------------
// colour helpers
// ---------------------------------------------------------------------------------------------

const rgbOf = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const hexOf = (a) => '#' + a.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
function lum(hex) { // relative luminance 0..1
  const [r, g, b] = rgbOf(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const mixHex = (a, b, t) => { const x = rgbOf(a), y = rgbOf(b); return hexOf(x.map((v, i) => v + (y[i] - v) * t)); };
function hsl2hex(h, s, l) {
  h = ((h % 360) + 360) % 360; s /= 100; l /= 100;
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return hexOf([f(0) * 255, f(8) * 255, f(4) * 255]);
}
function hueOf(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (!d) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}
const dist = (a, b) => { const x = rgbOf(a), y = rgbOf(b); return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); };

function rgb2hsl(hex) {
  const [r, g, b] = rgbOf(hex).map((v) => v / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  return [hueOf(hex), d ? (d / (1 - Math.abs(2 * l - 1))) * 100 : 0, l * 100];
}
// curated four-ink sets (deep, accent, highlight, paper) that already sit well together
const PALETTES = [
  ['#14213D', '#E4572E', '#F2B134', '#F4EFE6'], ['#1B3A2F', '#E07A5F', '#F2CC8F', '#F4F1DE'], ['#2B2D42', '#EF476F', '#FFD166', '#F7F3EA'],
  ['#1F2A44', '#2E86AB', '#F6AE2D', '#F5F1E8'], ['#3D1C2E', '#D1495B', '#EDAE49', '#F6EFE4'], ['#0F2D40', '#00A896', '#F0A202', '#F3EFE3'],
  ['#2F2A24', '#C8553D', '#88A09E', '#F2EBDD'], ['#25264D', '#7B5CFA', '#FFB84D', '#F4F0FA'],
];
// a seeded, pleasant four-ink set: deep, accent, highlight, paper. `hue` turns the whole set toward that hue (the found colour of a site)
export function seededInks(seed, hue) {
  const base = PALETTES[Math.abs(Math.round(Number(seed) || 1)) % PALETTES.length];
  if (hue == null) return [...base];
  const shift = hue - rgb2hsl(base[1])[0];
  return base.map((hex, i) => { const [h, s, l] = rgb2hsl(hex); return i === 3 ? hsl2hex(hue, Math.min(s, 40), l) : hsl2hex(h + shift, s, l); });
}

// ---------------------------------------------------------------------------------------------
// brandFromHtml / brandFromUrl
// ---------------------------------------------------------------------------------------------

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', middot: '·', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', copy: '©', reg: '®', trade: '™', bull: '•', raquo: '»', laquo: '«' };
const unent = (s) => String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ' '; }
  return ENT[e.toLowerCase()] ?? m;
});
const squash = (s) => unent(s).replace(/\s+/g, ' ').trim();

// every <meta ...> as { key (name/property/http-equiv, lowercase): content }; the first one wins
function metaTags(html) {
  const out = {};
  for (const m of html.matchAll(/<meta\b([^>]*)>/gi)) {
    const attrs = {};
    for (const a of m[1].matchAll(/([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/gi)) attrs[a[1].toLowerCase()] = a[2] ?? a[3] ?? a[4] ?? '';
    const key = (attrs.property || attrs.name || attrs['http-equiv'] || '').toLowerCase();
    if (key && attrs.content != null && !(key in out)) out[key] = attrs.content;
  }
  return out;
}

const GENERIC = /^(home|home ?page|ana ?sayfa|hoş ?geldiniz|hos ?geldiniz|giriş|accueil|startseite|inicio|welcome|index|main|official( web)?site|untitled|just a moment\.*|access denied|403 forbidden|404|page not found|loading\.*)$/i;
// "Home | Kumru", "Kumru – Slow coffee", "Kumru: roasters in Izmir" -> the brand part and the rest
function splitTitle(title) {
  const parts = title.split(/\s+(?:[|·•–—:»«]|-{1,2}|::)\s+|\s*[|·•»«]\s*/).map((p) => p.trim()).filter(Boolean);
  const good = parts.filter((p) => !GENERIC.test(p));
  if (!good.length) return { name: '', rest: '' };
  const name = [...good].sort((a, b) => a.length - b.length)[0];
  const rest = good.filter((p) => p !== name).sort((a, b) => b.length - a.length)[0] || '';
  return { name, rest };
}
const hostName = (url) => {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '').split('.');
    const base = h.length > 2 && h.at(-2).length <= 3 ? h.at(-3) : h.length > 1 ? h.at(-2) : h[0];
    return base ? base[0].toUpperCase() + base.slice(1) : '';
  } catch { return ''; }
};

// a short single line: first sentence if it fits, else cut at a word boundary
function shortLine(text, max = 90) {
  let t = squash(text);
  if (!t) return '';
  const first = /^(.{12,}?[.!?])(\s|$)/.exec(t);
  if (first && first[1].length <= max) t = first[1];
  if (t.length > max) t = t.slice(0, max + 1).replace(/\s+\S*$/, '');
  return t.replace(/[\s,;:–—-]+$/, '').replace(/\.$/, '');
}

// "#abc", "#aabbcc", "#aabbccdd", "rgb(1,2,3)", "rgba(1 2 3 / .5)", "hsl(200 50% 40%)" -> "#AABBCC" or null
function parseColour(s) {
  s = String(s).trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(s);
  if (m) {
    const h = m[1];
    if (h.length === 3 || h.length === 4) return '#' + [...h.slice(0, 3)].map((c) => c + c).join('').toUpperCase();
    if (h.length === 6 || h.length === 8) return '#' + h.slice(0, 6).toUpperCase();
    return null;
  }
  m = /^rgba?\(\s*([\d.]+%?)[\s,]+([\d.]+%?)[\s,]+([\d.]+%?)/.exec(s);
  if (m) {
    const v = [m[1], m[2], m[3]].map((x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : parseFloat(x)));
    return v.every(Number.isFinite) ? hexOf(v) : null;
  }
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(s);
  if (m) return hsl2hex(+m[1], +m[2], +m[3]);
  return null;
}
// near-white, near-black and greys carry no brand: drop them
function chromatic(hex) {
  const [r, g, b] = rgbOf(hex), mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mn > 232) return false; // near white
  if (mx < 36) return false; // near black
  if (mx - mn < 24) return false; // grey
  return true;
}
const COLOUR_RE = /#[0-9a-f]{8}\b|#[0-9a-f]{6}\b|#[0-9a-f]{3,4}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/gi;

/**
 * Read a page's own words and colours. PURE: html in, plain object out, no network.
 * Returns { name, tagline, inks: ['#RRGGBB', ...3-4], source } where `source` says where each part came from
 * ({ url, name, tagline, inks: 'theme-color' | 'css' | 'seeded', colours: [{ hex, from, score }], notes: [] }).
 */
export function brandFromHtml(html, url) {
  const src = typeof html === 'string' ? html : '';
  const notes = [];
  const clean = src.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');
  const meta = metaTags(clean);
  const title = squash((/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(clean) || [])[1] || '');
  const split = splitTitle(title);

  let name = '', nameFrom = '';
  const cands = [['og:site_name', meta['og:site_name']], ['application-name', meta['application-name']], ['apple-mobile-web-app-title', meta['apple-mobile-web-app-title']], ['title', split.name], ['host', url ? hostName(url) : '']];
  for (const [from, v] of cands) {
    const t = squash(v || '');
    if (t && !GENERIC.test(t)) { name = t.slice(0, 40); nameFrom = from; break; }
  }
  if (name.length > 40) name = name.slice(0, 40);

  let tagline = '', taglineFrom = '';
  for (const [from, v] of [['meta description', meta.description], ['og:description', meta['og:description']], ['twitter:description', meta['twitter:description']], ['title', split.rest]]) {
    const t = shortLine(v || '');
    if (t) { tagline = t; taglineFrom = from; break; }
  }
  if (!name) notes.push('no name found in og:site_name, application-name or <title>');

  // colours: [hex, score, from]
  const found = new Map();
  const add = (hex, score, from) => {
    if (!hex || !chromatic(hex)) return;
    const cur = found.get(hex);
    if (cur) { cur.score += score; if (score > cur.best) { cur.best = score; cur.from = from; } } else found.set(hex, { hex, score, best: score, from });
  };
  for (const key of ['theme-color', 'msapplication-tilecolor', 'msapplication-navbutton-color']) add(parseColour(meta[key] || ''), key === 'theme-color' ? 100 : 80, key);
  for (const m of clean.matchAll(/<meta\b[^>]*name\s*=\s*["']theme-color["'][^>]*>/gi)) { const c = /content\s*=\s*["']([^"']+)/i.exec(m[0]); if (c) add(parseColour(c[1]), 60, 'theme-color'); }
  const css = [...clean.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)].map((m) => m[1]).join('\n');
  for (const m of css.matchAll(/--([a-z0-9_-]+)\s*:\s*([^;}\n]+)/gi)) {
    const colour = (m[2].match(COLOUR_RE) || [])[0];
    const hex = colour && parseColour(colour);
    if (!hex) continue;
    const brandy = /brand|primary|accent|theme|main|key|highlight|secondary/i.test(m[1]);
    add(hex, brandy ? 45 : 8, `--${m[1]}`);
  }
  const rest = css.replace(/--[a-z0-9_-]+\s*:[^;}\n]+/gi, ' ') + '\n' + [...clean.matchAll(/\sstyle\s*=\s*"([^"]*)"|\sstyle\s*=\s*'([^']*)'/gi)].map((m) => m[1] ?? m[2]).join('\n');
  for (const m of rest.matchAll(COLOUR_RE)) add(parseColour(m[0]), 1, 'css');

  // distinct: a colour close to a stronger one folds into it (its score counts for the stronger one)
  const ranked = [...found.values()].sort((a, b) => b.score - a.score || a.hex.localeCompare(b.hex));
  const picked = [];
  for (const c of ranked) {
    const twin = picked.find((p) => dist(p.hex, c.hex) < 52);
    if (twin) twin.score += c.score * 0.25; else picked.push({ ...c });
  }
  picked.sort((a, b) => b.score - a.score || a.hex.localeCompare(b.hex));
  let inks = picked.slice(0, 4).map((c) => c.hex);
  let inkSource = picked[0] ? (picked[0].from === 'theme-color' || /tilecolor/.test(picked[0].from) ? 'theme-color' : 'css') : 'seeded';
  if (inks.length < 2) {
    const seed = hashSeed(name || url || 'brand');
    const fill = seededInks(seed, inks[0] ? hueOf(inks[0]) : undefined).slice(1);
    notes.push(inks.length ? 'only one colour found: the rest is a seeded palette' : 'no brand colours found: seeded palette');
    inks = [...inks, ...fill.filter((h) => !inks.some((x) => dist(x, h) < 40))].slice(0, 4);
    inkSource = 'seeded';
  }
  return {
    name, tagline, inks,
    source: {
      url: url || null, name: nameFrom || null, tagline: taglineFrom || null, inks: inkSource,
      colours: picked.slice(0, 6).map((c) => ({ hex: c.hex, from: c.from, score: Math.round(c.score) })), notes,
    },
  };
}

/**
 * Fetch ONE page (the URL given, redirects followed) and run brandFromHtml on it. Never fetches anything else.
 * 10 s timeout, text/html only, at most 2 MB, no cookies. Throws a clear error on failure.
 */
export async function brandFromUrl(url, { timeoutMs = 10000, maxBytes = 2 * 1024 * 1024, fetchImpl = globalThis.fetch } = {}) {
  let u;
  try { u = new URL(String(url)); } catch { throw new Error(`brand url: "${url}" is not a valid URL`); }
  if (!/^https?:$/.test(u.protocol)) throw new Error(`brand url: only http and https are fetched (got ${u.protocol})`);
  if (typeof fetchImpl !== 'function') throw new Error('brand url: this runtime has no global fetch (Node 18+ needed)');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let res;
    try {
      res = await fetchImpl(u.href, { redirect: 'follow', credentials: 'omit', signal: ctl.signal, headers: { 'user-agent': 'levni-brandkit/1.0 (+https://levni.dev)', accept: 'text/html,application/xhtml+xml;q=0.9' } });
    } catch (e) {
      throw new Error(ctl.signal.aborted ? `brand url: ${u.host} did not answer within ${timeoutMs / 1000} s` : `brand url: could not reach ${u.host} (${e?.cause?.code || e?.message || e})`);
    }
    if (!res.ok) throw new Error(`brand url: ${u.host} answered ${res.status}`);
    const type = String(res.headers.get('content-type') || '');
    if (!/text\/html|application\/xhtml/i.test(type)) throw new Error(`brand url: ${u.host} did not return HTML (${type || 'no content-type'})`);
    const len = Number(res.headers.get('content-length'));
    let html = '';
    if (res.body?.getReader) {
      const reader = res.body.getReader(), dec = new TextDecoder('utf-8');
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        html += dec.decode(value, { stream: true });
        if (total >= maxBytes) { await reader.cancel().catch(() => {}); break; }
      }
    } else {
      html = (await res.text()).slice(0, maxBytes);
    }
    if (len > maxBytes) html = html.slice(0, maxBytes);
    const out = brandFromHtml(html, res.url || u.href);
    out.source.truncated = len > maxBytes || html.length >= maxBytes;
    return out;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------------------------
// resolving a brand
// ---------------------------------------------------------------------------------------------

const FILL_WORDS = ['NEW', 'BUILD', 'SHIP', 'CONNECT'];
const TAG_STOP = new Set('a an the and or of for to in on with by from your you our its is are be as at this that bir ve ile için de da bu'.split(' '));
// poster headline words from the tagline (then the name, then a plain default), up to four, 2..12 letters
function deriveWords(name, tagline) {
  const seen = new Set(), out = [];
  const take = (s) => { for (const w of String(s).split(/[^\p{L}\p{N}]+/u)) {
    const up = w.toLocaleUpperCase(/[ğĞşŞıİ]/.test(w) ? 'tr' : 'en');
    if (w.length >= 4 && w.length <= 12 && !TAG_STOP.has(w.toLowerCase()) && !seen.has(up) && out.length < 4) { seen.add(up); out.push(up); }
  } };
  take(tagline); take(name);
  for (const w of FILL_WORDS) if (out.length < 4 && !seen.has(w)) { seen.add(w); out.push(w); }
  return out;
}

function pickKitMark(name, tagline, seed) {
  const index = Object.values(loadProps());
  const terms = repoTerms({ name: String(name).replace(/[-_.]/g, ' '), description: tagline });
  const hit = pickMark(terms, index)[0];
  return hit && findProp(hit) ? findProp(hit).name : FALLBACK_MARKS[seed % FALLBACK_MARKS.length];
}

/** The resolved brand and the colour roles every asset uses. Plain data. */
export function resolveBrand(spec = {}) {
  const b = spec.brand ?? spec;
  const name = String(b.name ?? '').trim().slice(0, 40);
  if (!name) throw new Error('brand kit needs a brand "name"');
  const seed = Math.round(Number(spec.seed ?? b.seed ?? hashSeed(name))) || 1;
  const tagline = String(b.tagline ?? '').trim().slice(0, 90);
  let mark;
  if (b.mark) {
    const p = findProp(b.mark);
    if (!p) throw new Error(`brand mark "${b.mark}" is not a prop (see: levni list ${String(b.mark).slice(0, 20)})`);
    mark = p.name;
  } else mark = pickKitMark(name, tagline, seed);
  const given = (Array.isArray(b.inks) ? b.inks : []).slice(0, 5).map((c) => {
    const hex = HEX.test(c) ? c.toUpperCase() : COLORS[c] && COLORS[c] !== 'none' ? COLORS[c].toUpperCase() : null;
    if (!hex) throw new Error(`brand inks: "${c}" is not a #RRGGBB colour`);
    return hex;
  });
  const inksIn = given.length ? given : seededInks(seed);
  const extras = {};
  for (const k of ['url', 'font', 'person', 'props']) if (b[k] != null) extras[k] = b[k];
  const probe = expandBrand({ name, tagline, mark, inks: inksIn, seed, finish: 'soft', ...extras });
  const st = probe.style; // house colour name -> this brand's hex
  const inks = [st.blue, st.coral, st.mustard, st.paper]; // deep, accent, highlight, paper
  const words = (Array.isArray(b.words) && b.words.length ? b.words : deriveWords(name, tagline)).map((w) => String(w).slice(0, 14));
  return { brand: { name, tagline, mark, inks, words, seed, ...extras }, style: st, board: probe, inputInks: inksIn };
}

// ---------------------------------------------------------------------------------------------
// the scenes
// ---------------------------------------------------------------------------------------------

// the board's own mono recolour: a one-ink mark that reads on any ground
const MONO_TO = (to) => Object.fromEntries(['blue', 'coral', 'mustard', 'green', 'tone', 'tone-coral', 'tone-green', 'tone-mustard', 'white', 'paper'].map((k) => [k, to]).concat([['dark', to === 'paper' ? 'ink' : 'blue']]));

function nameLines(name) {
  const words = name.split(/\s+/).filter(Boolean);
  const n = Math.min(words.length, name.length > 26 ? 3 : name.length > 11 ? 2 : 1);
  if (n < 2) return [name];
  let best = null, cost = Infinity;
  const cuts = (from, left, acc) => {
    if (left === 1) { const l = words.slice(from).join(' '); const all = [...acc, l]; const c = Math.max(...all.map((x) => x.length)); if (c < cost) { cost = c; best = all; } return; }
    for (let k = from + 1; k <= words.length - left + 1; k++) cuts(k, left - 1, [...acc, words.slice(from, k).join(' ')]);
  };
  cuts(0, n, []);
  return best;
}
function wrapLines(text, per, max) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const greedy = (w) => {
    const out = [];
    let cur = '';
    for (const word of words) {
      if (!cur) cur = word; else if ((cur + ' ' + word).length <= w) cur += ' ' + word; else { out.push(cur); cur = word; }
    }
    if (cur) out.push(cur);
    return out;
  };
  let out = greedy(per);
  // balance: the same number of lines at the narrowest width that still fits, so no one-word last line
  for (let w = per - 1; w >= per * 0.6 && out.length > 1; w--) {
    const t = greedy(w);
    if (t.length > out.length) break;
    out = t;
  }
  if (out.length > max) { out = out.slice(0, max); out[max - 1] = out[max - 1].replace(/[\s,;:.]*\S*$/, '') + '…'; }
  return out;
}

// the colour name (house) that reads best on `groundName`, given a style map name -> hex
function readable(style, groundName, a = 'ink', b = 'paper') {
  const g = lum(style[groundName] ?? '#FFFFFF');
  const ratio = (x) => (Math.max(lum(style[x]), g) + 0.05) / (Math.min(lum(style[x]), g) + 0.05);
  return ratio(a) >= ratio(b) ? a : b;
}
const apart = (style, ground, ...opts) => opts.find((o) => Math.abs(lum(style[o]) - lum(style[ground])) > 0.12 && dist(style[o], style[ground]) > 60) ?? 'paper';

// the name set in the black face: the size that fits `w` (and `maxH`), and the height it really takes
function nameBlock(lines, w, maxH) {
  const text = lines.join('\n');
  const t = layoutType({ text, w, fit: 'width', font: 'black', leading: 1.08 });
  const k = Math.min(1, maxH / t.h);
  return { text, size: Math.round(t.size * k * 10) / 10, h: Math.round(t.h * k) };
}

/** Hero scene for any canvas: landscape puts the text left and the mark on a panel right, portrait stacks them. */
function heroScene(brand, style, [W, H], o = {}) {
  const { name, tagline, mark, seed } = brand;
  const landscape = W / H > 1.15;
  const ground = o.ground ?? 'paper', panel = o.panel ?? 'blue';
  const txt = readable(style, ground);
  const lines = nameLines(name);
  const nl = lines.length;
  const base = { canvas: [W, H], finish: 'soft', seed: seed + (o.seedOffset ?? 0), style, background: ground };
  const els = [];
  const live = (cx, cy, r, color) => (o.moving
    ? { type: 'meshgrad', x: cx, y: cy, r, shape: 'circle', colors: [color, 'tone-mustard', 'paper', color], base: color, drift: 0.2, grain: 0.25 }
    : { type: 'disc', x: cx, y: cy, r, color });
  // o.animate (the kit's loop only): the name types itself, the mark pops in and floats, the tagline slides in
  const mo = (m) => (o.animate ? { motion: m } : {});
  const markEl = (cx, cy, r, disc) => ({ type: 'prop', name: mark, fit: true, x: cx, y: cy, size: r * 1.15, ...(o.mono === false ? {} : { recolor: MONO_TO(readable(style, disc, 'blue', 'paper')) }), ...mo([{ type: 'pop', delay: 0.06, dur: 0.16 }, { type: 'float', amp: Math.max(3, r * 0.05) }]) });
  if (landscape) {
    const split = Math.round(W * 0.64), m = Math.round(W * 0.07), colW = split - m - Math.round(W * 0.06);
    const cx = split + (W - split) / 2, cy = H / 2, r = Math.min((W - split) * 0.42, H * 0.3);
    const disc = apart(style, panel, 'mustard', 'paper', 'coral');
    els.push({ type: 'panel', x: split, y: -20, w: W - split + 40, h: H + 40, color: panel });
    els.push(live(cx, cy, r, disc));
    els.push(markEl(cx, cy, r, disc));
    const nm = nameBlock(lines, colW, H * [0, 0.3, 0.38, 0.46][nl]);
    const tagLines = wrapLines(tagline, 30, 3), tagSize = Math.round(H * 0.052), lead = 1.3;
    const g = Math.round(H * 0.075), tagH = tagLines.length ? Math.round(tagLines.length * tagSize * lead) : 0;
    const block = nm.h + (tagH ? g + tagH : 0), top = Math.round((H - block) / 2) + 24;
    els.push({ type: 'block', x: m, y: Math.round(top - H * 0.073), w: Math.round(W * 0.053), h: Math.round(H * 0.014), color: o.bar ?? 'coral', ...mo({ type: 'wipe', delay: 0.02, dur: 0.1 }) });
    els.push({ type: 'type', text: nm.text, x: m, y: top, w: colW, size: nm.size, font: 'black', leading: 1.08, color: txt, ...mo({ type: 'typewriter', delay: 0.1, dur: 0.28, cursor: '_' }) });
    if (tagLines.length) els.push({ type: 'type', text: tagLines.join('\n'), x: m, y: top + nm.h + g, size: tagSize, leading: lead, weight: 500, color: txt, ...mo({ type: 'slide', from: 'down', distance: Math.round(H * 0.04), delay: 0.44, dur: 0.14 }) });
  } else {
    const tall = H / W > 1.5;
    const disc = apart(style, ground, 'mustard', 'paper', 'coral');
    const boxW = Math.round(W * 0.8), nm = nameBlock(lines, boxW, W * [0, 0.17, 0.25, 0.33][nl]);
    const tagLines = wrapLines(tagline, tall ? 26 : 34, 3), tagSize = Math.round(W * (tall ? 0.046 : 0.04));
    const tagH = tagLines.length ? Math.round(tagLines.length * tagSize * 1.3) : 0;
    const g1 = Math.round(H * (tall ? 0.05 : 0.06)), g2 = Math.round(H * (nl > 1 ? 0.045 : 0.035)), barH = tall ? Math.round(H * 0.05) : 0;
    const avail = H * (tall ? 0.72 : 0.86), rest = g1 + nm.h + (tagH ? g2 + tagH : 0) + barH;
    const r = Math.round(Math.min(W * (tall ? 0.33 : 0.27), (avail - rest) / 2));
    const stack = 2 * r + rest;
    const top = Math.round(tall ? H * 0.1 + (H * 0.76 - stack) / 2 : (H - stack) / 2);
    const cx = W / 2, cy = top + r, nameY = cy + r + g1;
    if (tall) els.push({ type: 'halftone', x: 0, y: 0, w: W, h: nameY - Math.round(H * 0.012), color: o.tint ?? 'tone', mode: 'radial', gap: 26, cx, cy, radius: W * 0.9 });
    els.push(live(cx, cy, r, disc));
    els.push(markEl(cx, cy, r, disc));
    els.push({ type: 'type', text: nm.text, x: Math.round((W - boxW) / 2), y: nameY, w: boxW, size: nm.size, align: 'center', font: 'black', leading: 1.08, color: txt });
    if (tagLines.length) els.push({ type: 'type', text: tagLines.join('\n'), x: Math.round((W - boxW) / 2), y: nameY + nm.h + g2, w: boxW, size: tagSize, align: 'center', leading: 1.3, weight: 500, color: txt });
    if (tall) els.push({ type: 'block', x: Math.round(W / 2 - W * 0.03), y: nameY + nm.h + (tagH ? g2 + tagH : 0) + Math.round(H * 0.025), w: Math.round(W * 0.06), h: Math.round(H * 0.005),  color: o.bar ?? 'coral' });
  }
  return { ...base, elements: els };
}

function markScene(brand, style) {
  return { canvas: [1024, 1024], finish: 'soft', grain: 0, background: 'none', seed: brand.seed + 11, style,
    elements: [{ type: 'prop', name: brand.mark, fit: true, x: 512, y: 512, size: 860 }] };
}
function faviconScene(brand, style) {
  return { canvas: [512, 512], finish: 'soft', grain: 0, background: 'none', seed: brand.seed + 12, style,
    elements: [
      { type: 'block', x: 0, y: 0, w: 512, h: 512, radius: 112, color: 'blue' },
      { type: 'disc', x: 256, y: 256, r: 204, color: 'paper' },
      { type: 'prop', name: brand.mark, fit: true, x: 256, y: 256, size: 280 },
    ] };
}

// ---------------------------------------------------------------------------------------------
// the asset list
// ---------------------------------------------------------------------------------------------

export const KIT_ASSETS = ['mark', 'favicon', 'palette', 'og', 'cover', 'social-square', 'story', 'readme-banner', 'board', 'posters', 'loop'];
const DEFAULT_POSTERS = ['split', 'echo', 'launch', 'summit'];

// the board's tiles are tuned for names up to about 14 characters: a longer name is shortened to its first words there
function boardName(name) {
  if (name.length <= 14) return name;
  const words = name.split(/\s+/);
  let out = words[0];
  for (const w of words.slice(1)) { if ((out + ' ' + w).length > 14) break; out += ' ' + w; }
  return out.slice(0, 14);
}

/**
 * The assets of a kit with their scenes or specs, nothing rendered.
 * spec: { brand: { name, tagline?, mark?, inks?, words? }, seed?, only?: [asset names], posters?: 4 | 8 }
 * Returns { brand, assets: [{ name, kind: 'scene' | 'palette' | 'board' | 'posters' | 'loop', files: [{ file, width, height }], scene | spec | scenes }] }.
 */
export function expandKit(spec = {}) {
  const r = resolveBrand(spec);
  const { brand, style } = r;
  const want = Array.isArray(spec.only) && spec.only.length ? spec.only.map(String) : KIT_ASSETS;
  const bad = want.filter((n) => !KIT_ASSETS.includes(n));
  if (bad.length) throw new Error(`unknown kit assets: ${bad.join(', ')} (use ${KIT_ASSETS.join(', ')})`);
  const on = new Set(want);
  const brandForBoard = { name: boardName(brand.name), tagline: brand.tagline, mark: brand.mark, inks: brand.inks, seed: brand.seed, finish: 'soft', ...Object.fromEntries(['url', 'font', 'person', 'props'].filter((k) => brand[k] != null).map((k) => [k, brand[k]])) };
  const cover = heroScene(brand, style, [1200, 673], { ground: 'paper', panel: 'blue', seedOffset: 21, moving: true });
  const assets = [];
  const push = (name, kind, files, extra) => { if (on.has(name)) assets.push({ name, kind, files, ...extra }); };
  push('mark', 'scene', [{ file: 'mark.png', width: 1024, height: 1024 }, { file: 'mark.svg' }], { scene: markScene(brand, style) });
  push('favicon', 'scene', [{ file: 'favicon-32.png', width: 32, height: 32 }, { file: 'favicon-180.png', width: 180, height: 180 }], { scene: faviconScene(brand, style) });
  push('palette', 'palette', [{ file: 'palette.png', width: 1200, height: 360 }], {
    spec: { canvas: [1200, 360], margin: 0, gap: 0, grid: { cols: 1, rows: 1 }, tiles: [{ at: [0, 0, 1, 1], type: 'palette', layout: 'strip', radius: 0, colors: [
      { hex: style.blue, name: 'Primary', weight: 2 }, { hex: style.paper, name: 'Paper', weight: 1.5 }, { hex: style.coral, name: 'Accent', weight: 1.3 },
      { hex: style.mustard, name: 'Highlight', weight: 1.3 }, { hex: style.ink, name: 'Ink', weight: 0.7 }] }] },
  });
  push('og', 'scene', [{ file: 'og.png', width: 1200, height: 630 }], { scene: heroScene(brand, style, [1200, 630], { ground: 'mustard', panel: 'blue', seedOffset: 22, bar: 'blue' }) });
  push('cover', 'scene', [{ file: 'cover.webp', width: 1200, height: 673 }], { scene: cover });
  push('social-square', 'scene', [{ file: 'social-square.png', width: 1080, height: 1080 }], { scene: heroScene(brand, style, [1080, 1080], { ground: 'blue', seedOffset: 23, bar: 'mustard' }) });
  push('story', 'scene', [{ file: 'story.png', width: 1080, height: 1920 }], { scene: heroScene(brand, style, [1080, 1920], { ground: 'coral', seedOffset: 24, bar: 'ink', tint: 'tone-coral' }) });
  if (on.has('readme-banner')) {
    const sc = bannerScene({ name: brand.name, description: brand.tagline, mark: brand.mark, theme: 'riso', seed: brand.seed, credit: false });
    const th = { text: '#14181F', muted: '#4A5160' };
    sc.elements = sc.elements.map((e) => (e.type === 'type' && e.color === th.text ? { ...e, color: 'ink' } : e.type === 'type' && e.color === th.muted ? { ...e, color: mixHex(style.ink, style.paper, 0.35) } : e));
    push('readme-banner', 'scene', [{ file: 'readme-banner.png', width: 1280, height: 640 }], { scene: { ...sc, finish: 'soft', style } });
  }
  push('board', 'board', [{ file: 'board.png', width: 1800, height: 1200 }], { spec: { brand: brandForBoard }, ...(brandForBoard.name !== brand.name ? { note: `the board tiles are tuned for names up to 14 characters, so it shows "${brandForBoard.name}"` } : {}) });
  if (on.has('posters')) {
    const n = Number(spec.posters) === 8 ? 8 : 4;
    const only = n === 8 ? TEMPLATES : DEFAULT_POSTERS;
    const pspec = { brand: { name: brand.name, tagline: brand.tagline, mark: brand.mark, inks: brand.inks, words: brand.words, seed: brand.seed, ...(brand.url ? { url: brand.url } : {}) }, only };
    const list = expandPosters(pspec);
    push('posters', 'posters', list.map((p, i) => ({ file: `posters/poster-${String(i + 1).padStart(2, '0')}-${p.template}.png`, width: 1200, height: 1600 })).concat([{ file: 'posters/series.png' }]), { spec: pspec, scenes: list });
  }
  push('loop', 'loop', [{ file: 'loop.webp', width: 600, height: 338 }], { scene: heroScene(brand, style, [600, 338], { ground: 'paper', panel: 'blue', seedOffset: 21, moving: true, animate: true }), note: 'animated loop of the cover, drawn at 600 px; skipped when nothing in it moves' });
  return { brand, assets };
}

// ---------------------------------------------------------------------------------------------
// rendering
// ---------------------------------------------------------------------------------------------

const size = (f) => statSync(f).size;
async function drawScene(scene, file, { webp = false } = {}) {
  const { svg, used, canvas } = await compose(scene);
  const raw = await rasterize(svg);
  const buf = webp ? await sharp(raw).webp({ quality: 88, effort: 5, smartSubsample: true }).toBuffer() : raw;
  writeFileSync(file, buf);
  const hasProp = (scene.elements || []).some((e) => e.type === 'prop');
  return { svg, png: raw, notes: critique(used, canvas).filter((n) => !(hasProp && /no clear focal symbol/.test(n))) };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function indexHtml(brand, style, files) {
  const has = (f) => files.some((x) => x.file === f);
  const img = (f, cls, alt) => (has(f) ? `<figure class="${cls}"><img src="${f}" alt="${esc(alt)}" loading="lazy"><figcaption>${esc(f)}</figcaption></figure>` : '');
  const posters = files.filter((x) => /^posters\/poster-/.test(x.file)).map((x) => `<figure class="poster"><img src="${x.file}" alt="${esc(brand.name)} poster" loading="lazy"><figcaption>${esc(x.file.replace('posters/', ''))}</figcaption></figure>`).join('');
  const fg = lum(style.blue) < 0.4 ? style.paper : style.ink;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(brand.name)} brand kit</title>
<style>
:root{--deep:${style.blue};--accent:${style.coral};--hi:${style.mustard};--paper:${style.paper};--ink:${style.ink};--on-deep:${fg}}
*{box-sizing:border-box}
body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.45 'Helvetica Neue',Helvetica,Arial,sans-serif}
header{background:var(--deep);color:var(--on-deep);padding:20px 28px;display:flex;gap:20px;align-items:center;flex-wrap:wrap;border-bottom:8px solid var(--hi)}
header img{width:64px;height:64px}
h1{margin:0;font-size:28px;line-height:1.1}
header p{margin:2px 0 0;opacity:.85}
header .sw{margin-left:auto;display:flex;gap:8px}
.sw i{display:block;width:28px;height:28px;border-radius:50%;border:2px solid var(--on-deep)}
main{padding:24px 28px;display:grid;gap:18px;grid-template-columns:repeat(12,1fr);max-width:1500px;margin:0 auto}
figure{margin:0;background:#fff;border:2px solid var(--ink);border-radius:10px;overflow:hidden;display:flex;flex-direction:column}
figure img{display:block;width:100%;height:auto}
figcaption{font:12px/1 Menlo,Consolas,monospace;padding:8px 10px;border-top:2px solid var(--ink);background:var(--paper)}
.wide{grid-column:span 6}.c4{grid-column:span 4}.c3{grid-column:span 3}.c2{grid-column:span 2}.c1{grid-column:span 1}.full{grid-column:span 12}.poster{grid-column:span 3}
figcaption{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.checker{background:conic-gradient(#ddd 25%,#fff 0 50%,#ddd 0 75%,#fff 0) 0 0/20px 20px}
.checker img{width:80%;margin:auto;padding:8px}
footer{padding:0 28px 28px;font:12px Menlo,Consolas,monospace;opacity:.7;max-width:1500px;margin:0 auto}
@media(max-width:900px){.wide,.c4,.c3,.c2,.c1,.poster{grid-column:span 12}}
</style>
</head>
<body>
<header>
${has('mark.png') ? '<img src="mark.png" alt="">' : ''}
<div><h1>${esc(brand.name)}</h1>${brand.tagline ? `<p>${esc(brand.tagline)}</p>` : ''}</div>
<div class="sw" aria-label="inks">${[style.blue, style.coral, style.mustard, style.paper, style.ink].map((c) => `<i style="background:${c}" title="${c}"></i>`).join('')}</div>
</header>
<main>
${img('palette.png', 'full', 'Palette')}
${img('og.png', 'wide', 'Social card')}
${img('cover.webp', 'wide', 'Cover')}
${img('readme-banner.png', 'wide', 'README banner')}
${img('board.png', 'wide', 'Brand board')}
${img('social-square.png', 'c3', 'Square post')}
${img('story.png', 'c2', 'Story')}
${has('mark.png') ? `<figure class="c2 checker"><img src="mark.png" alt="Mark"><figcaption>mark.png, mark.svg</figcaption></figure>` : ''}
${has('loop.webp') ? img('loop.webp', 'c4', 'Loop') : ''}
${has('favicon-180.png') ? `<figure class="c1"><img src="favicon-180.png" alt="Favicon"><figcaption>favicon-180.png, favicon-32.png</figcaption></figure>` : ''}
${posters}
</main>
<footer>Made with Levni (levni.dev). Same inks, same mark, same finish in every file. Details in kit.json and brand.json.</footer>
</body>
</html>
`;
}

/**
 * Render a kit into `outDir` (created). Returns { files: [absolute paths], brand, notes: { asset: [critic notes] }, ms }.
 * Writes brand.json, kit.json and index.html next to the assets. Deterministic for a given spec.
 */
export async function renderKit(spec, outDir) {
  const t0 = Date.now();
  if (!outDir) throw new Error('renderKit needs an output folder');
  const kit = expandKit(spec);
  mkdirSync(outDir, { recursive: true });
  const { brand } = kit;
  const style = resolveBrand(spec).style;
  const notes = {}, report = [], written = [];
  const at = (f) => join(outDir, f);
  const note = (asset, list) => { if (list?.length) (notes[asset] ||= []).push(...list); };
  const log = async (file, asset, drawn, w, h) => {
    const meta = await sharp(at(file)).metadata().catch(() => ({}));
    written.push(at(file));
    report.push({ file, asset, bytes: size(at(file)), width: w ?? meta.width ?? null, height: h ?? meta.height ?? null, drawnBy: drawn });
  };

  for (const a of kit.assets) {
    if (a.name === 'mark') {
      const r = await drawScene(a.scene, at('mark.png'));
      writeFileSync(at('mark.svg'), r.svg);
      note('mark', r.notes);
      await log('mark.png', 'mark', { scene: a.scene });
      await log('mark.svg', 'mark', { scene: a.scene }, 1024, 1024);
    } else if (a.name === 'favicon') {
      const r = await drawScene(a.scene, at('favicon-180.png'));
      note('favicon', r.notes);
      await sharp(r.png).resize(180, 180, { kernel: 'lanczos3' }).png().toFile(at('favicon-180.png'));
      await sharp(r.png).resize(32, 32, { kernel: 'lanczos3' }).png().toFile(at('favicon-32.png'));
      await log('favicon-32.png', 'favicon', { scene: a.scene, note: 'drawn at 512 px, resized' });
      await log('favicon-180.png', 'favicon', { scene: a.scene, note: 'drawn at 512 px, resized' });
    } else if (a.name === 'palette') {
      await renderBoard(a.spec, at('palette.png'));
      await log('palette.png', 'palette', { board: a.spec });
    } else if (a.name === 'board') {
      await renderBoard(a.spec, at('board.png'));
      if (a.note) note('board', [a.note]);
      await log('board.png', 'board', { board: a.spec });
    } else if (a.name === 'posters') {
      mkdirSync(at('posters'), { recursive: true });
      const r = await renderPosters(a.spec, at('posters'));
      written.push(...r.files);
      for (const [i, p] of a.scenes.entries()) {
        const rel = a.files[i].file;
        report.push({ file: rel, asset: 'posters', bytes: size(at(rel)), width: 1200, height: 1600, drawnBy: { scene: p.scene, template: p.template } });
      }
      written.push(at('posters/series.png'));
      report.push({ file: 'posters/series.png', asset: 'posters', bytes: size(at('posters/series.png')), width: null, height: null, drawnBy: { note: 'contact sheet of the posters' } });
    } else if (a.name === 'loop') {
      const scene = a.scene;
      try {
        const r = await animate(scene, at('loop.webp'), { frames: 30, fps: 12, quality: 78 });
        if (!r.moving) { unlinkSync(at('loop.webp')); (notes.loop ||= []).push('skipped: the cover has nothing that follows t'); }
        else await log('loop.webp', 'loop', { scene, animate: { frames: 30, fps: 12 } }, r.width, r.height);
      } catch (e) { (notes.loop ||= []).push(`skipped: ${e.message}`); }
    } else {
      const webp = a.files[0].file.endsWith('.webp');
      const file = a.files[0].file;
      const r = await drawScene(a.scene, at(file), { webp });
      note(a.name, r.notes);
      await log(file, a.name, { scene: a.scene }, a.files[0].width, a.files[0].height);
    }
  }

  const bj = { name: brand.name, tagline: brand.tagline, mark: brand.mark, inks: brand.inks, words: brand.words, seed: brand.seed, roles: { primary: style.blue, accent: style.coral, highlight: style.mustard, paper: style.paper, ink: style.ink } };
  for (const k of ['url', 'font', 'person', 'props']) if (brand[k] != null) bj[k] = brand[k];
  writeFileSync(at('brand.json'), JSON.stringify(bj, null, 2) + '\n');
  writeFileSync(at('kit.json'), JSON.stringify({ brand: bj, files: report, notes }, null, 2) + '\n');
  writeFileSync(at('index.html'), indexHtml(brand, style, report));
  for (const f of ['brand.json', 'kit.json', 'index.html']) written.push(at(f));
  return { files: written, brand: bj, notes, ms: Date.now() - t0 };
}
