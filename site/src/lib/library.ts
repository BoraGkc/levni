// Build-time helpers for the Library's own pages: /library/<name>/ (one per drawing) and /library/category/<key>/.
// Data comes from src/data/props.json and categories.json (written by scripts/render-library.mjs).
import { execSync } from 'node:child_process';
import props from '../data/props.json';
import CATEGORIES from '../data/categories.json';

export type Prop = { name: string; category: string; tags: string[]; variants: string[]; aliases?: string[]; author?: string };
export const PROPS = props as Prop[];
export const CATS = CATEGORIES as Record<string, string>;

// "coffee-cup" -> "Coffee cup"; the pixel set reads "Pixel arrow up"
export const human = (name: string) => { const s = name.replace(/-/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

// the variant note without the source line ("…, line icon redrawn from Tabler Icons (MIT)"); pixel icons keep their weight
export const cleanNote = (note: string) => {
  const px = /,? ?(regular|thin|solid|glyph) pixel icon/i.exec(note);
  if (px) return `${px[1].toLowerCase()} weight`;
  return note.replace(/,? ?line icon redrawn from Tabler Icons.*$/i, '').trim() || note;
};
// where a redrawn icon came from, for the credit line
export const sourceOf = (p: Prop) => (/Tabler Icons/i.test(p.variants.join(' ')) ? 'Redrawn from Tabler Icons (MIT).' : '');

// English tags read as words in the copy; Turkish ones stay as search chips only
const TR = /[çğıöşüÇĞİÖŞÜ]|^(kedi|köpek|ev|para|kitap|müzik|uçak|araba|yemek|kahve|dünya|harita|ayarlar)$/;
export const englishTags = (p: Prop) => p.tags.filter((t) => !TR.test(t));

// related: same shelf first, ranked by shared tags and the group word that leads the name (book-open, book-stack).
// Tags carried by a large share of the Folio ("pixel", "sensitive") say which set a drawing is in, not what it shows.
let common: Set<string> | null = null;
export function related(prop: Prop, n = 8) {
  if (!common) {
    const c = new Map<string, number>();
    PROPS.forEach((p) => new Set(p.tags.map((t) => t.toLowerCase())).forEach((t) => c.set(t, (c.get(t) || 0) + 1)));
    common = new Set([...c].filter(([, k]) => k > 60).map(([t]) => t));
  }
  const mine = new Set(prop.tags.map((t) => t.toLowerCase()).filter((t) => !common!.has(t)));
  const group = (s: string) => s.replace(/^pixel-/, '').split('-')[0];
  const g = group(prop.name);
  return PROPS
    .filter((p) => p.name !== prop.name)
    .map((p) => ({ p, s: p.tags.filter((t) => mine.has(t.toLowerCase())).length * 2 + (p.category === prop.category ? 1 : 0) + (group(p.name) === g ? 2 : 0) }))
    .filter((x) => x.s > 1)
    .sort((a, b) => b.s - a.s || a.p.name.localeCompare(b.p.name))
    .slice(0, n)
    .map((x) => x.p);
}

// the scene element for a drawing, as a short JSON line
export const sceneLine = (name: string, v = 0) => `{ "type": "prop", "name": "${name}"${v ? `, "variant": ${v}` : ''}, "x": 600, "y": 336, "size": 420 }`;

// added / updated per drawing, from one `git log` over library/props (newest first). Empty when there is no history.
let dates: Map<string, { added: string; updated: string }> | null = null;
export function datesOf(name: string) {
  if (!dates) {
    dates = new Map();
    try {
      // a shallow clone (some CI checkouts) knows only the last commit: every drawing would get that date, so show none
      if (execSync('git rev-parse --is-shallow-repository', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() === 'true') throw new Error('shallow');
      const out = execSync("git log --format=@%cs --name-only -- ':/library/props'", { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      let day = '';
      for (const line of out.split('\n')) {
        if (line.startsWith('@')) { day = line.slice(1); continue; }
        const m = /^library\/props\/(.+)\.json$/.exec(line.trim());
        if (!m || !day) continue;
        const d = dates.get(m[1]);
        if (!d) dates.set(m[1], { added: day, updated: day }); else d.added = day;
      }
    } catch { /* no git: the page leaves the dates out */ }
  }
  return dates.get(name) || null;
}
export const fmtDate = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// questions a drawing page answers from the drawing's own facts (also sent as FAQPage data)
export function faqOf(p: Prop, rel: Prop[]) {
  const t = human(p.name), low = t.toLowerCase(), cat = CATS[p.category] || 'the Folio';
  const words = englishTags(p).filter((w) => w !== 'pixel').slice(0, 6);
  const n = p.variants.length;
  const out = [
    { q: `What is the ${low} drawing for?`, a: `${t} is a hand-inked drawing on the ${cat} shelf of the Levni Folio.${words.length ? ` People find it as ${words.join(', ')}.` : ''} It is drawn in the same style as the other ${(PROPS.length - 1).toLocaleString('en')} drawings, so it sits next to them on a blog cover, a slide, a doc, an empty state or a social card.` },
    { q: `Can I use the ${low} drawing in commercial work?`, a: `Yes. The Folio is CC BY 4.0: use it in any project, commercial or personal, and credit "drawings by Ortak Alan". There is no paid tier and nothing is locked.${sourceOf(p) ? ` ${sourceOf(p)}` : ''}` },
    { q: `What styles does it come in?`, a: `As drawn (ink), and Levni can draw the same drawing as a 3D icon, ASCII art, a dot matrix, dot lines or an echo stack. Each one is a single line of JSON; the styles are shown on this page.` },
  ];
  if (n > 1) out.push({ q: `How many versions of the ${low} drawing are there?`, a: `${n}: ${p.variants.map((v, i) => `variant ${i}, ${cleanNote(v)}`).join('; ')}. Pick one with "variant" in the scene.` });
  if (rel.length) out.push({ q: `What drawings go with it?`, a: `${rel.slice(0, 6).map((r) => human(r.name).toLowerCase()).join(', ')}${rel.length > 6 ? ` and ${rel.length - 6} more` : ''}, all shown below. They share tags or a shelf with ${low}.` });
  out.push({ q: `How do I put it in a picture with an AI agent?`, a: `Connect Levni once (claude mcp add levni -- npx -y @levni/levni mcp), then ask for a cover with the "${p.name}" drawing. Levni draws it on your machine: no image model, no API key, no credits.` });
  return out;
}
