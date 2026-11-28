// Client helpers shared by the /tools/ pages: Levni in the browser (fonts and Folio drawings loaded on demand),
// preview, downloads, clipboard and the URL-hash state that makes a link reproduce the picture.
import { compose, registerProps, registerFont, fontsFor, propsFor, toBlob } from '../../../../src/browser.mjs';

const propFiles = import.meta.glob('../../../../library/props/*.json', { import: 'default' });
const fontUrls = import.meta.glob('../../../../fonts/*.{ttf,otf}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const FONT_FILES: Record<string, string> = { grotesk: 'SpaceGrotesk-Variable.ttf', black: 'ArchivoBlack-Regular.ttf', mono: 'JetBrainsMono-Variable.ttf', pixel: 'DepartureMono-Regular.otf' };

const loadedFonts = new Set<string>(), loadedProps = new Set<string>();
async function ensureFonts(names: string[]) {
  await Promise.all(names.filter((n) => !loadedFonts.has(n)).map(async (n) => {
    const url = Object.entries(fontUrls).find(([k]) => k.endsWith(FONT_FILES[n]))?.[1];
    if (!url) return;
    registerFont(n, await (await fetch(url)).arrayBuffer());
    loadedFonts.add(n);
  }));
}
export async function ensureProp(name: string) {
  if (loadedProps.has(name)) return true;
  const load = propFiles[`../../../../library/props/${name}.json`];
  if (!load) return false;
  registerProps((await load()) as object);
  loadedProps.add(name);
  return true;
}

// scene -> SVG string, after loading the fonts and drawings it uses
export async function render(scene: any): Promise<string> {
  await Promise.all([ensureFonts(fontsFor(scene)), ...propsFor(scene).map(ensureProp)]);
  return (await compose(scene)).svg;
}

// The Folio index the banner page uses: [name, title, tags, variants, aliases]
let index: { name: string; tags: string[]; aliases: string[]; variants: string[] }[] = [];
export async function getIndex() {
  if (index.length) return index;
  const rows = await (await fetch('/props-index.json')).json();
  index = rows.map(([name, , tags, variants, aliases]: [string, string, string[], string[], string[]]) => ({ name, tags, variants, aliases }));
  return index;
}

// show an SVG string in an <img>, replacing the previous object URL
export function showSvg(img: HTMLImageElement, svg: string, prev: { url: string }) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  img.src = url;
  if (prev.url) { const old = prev.url; setTimeout(() => URL.revokeObjectURL(old), 2000); }
  prev.url = url;
  return url;
}

export function save(blob: Blob, file: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}
export const saveSvg = (svg: string, file: string) => save(new Blob([svg], { type: 'image/svg+xml' }), file);
export async function savePng(svg: string, file: string, scale = 1) { save(await toBlob(svg, { scale }), file); }

export async function copy(text: string, btn: HTMLElement) {
  const label = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = 'Copied'; }
  catch { btn.textContent = 'Copy failed'; }
  setTimeout(() => (btn.textContent = label), 1400);
}

// state <-> URL hash (#k=v&k=v): a link reproduces the picture
// (pasting another tool link into the address bar of an open page changes only the hash: start over from it)
window.addEventListener('hashchange', () => location.reload());
export function readHash(): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
}
export function writeHash(state: Record<string, unknown>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(state)) if (v !== undefined && v !== null && v !== '') p.set(k, (Array.isArray(v) ? v.join(',') : String(v)).replace(/#/g, ''));
  history.replaceState(null, '', `#${p.toString()}`);
}

export const debounce = <A extends unknown[]>(fn: (...a: A) => void, ms: number) => {
  let t = 0;
  return (...a: A) => { clearTimeout(t); t = window.setTimeout(() => fn(...a), ms); };
};
export const newSeed = () => Math.floor(Math.random() * 9998) + 1;
export const clampInt = (v: unknown, d: number, lo: number, hi: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export const isHex = (s: unknown) => typeof s === 'string' && /^#?[0-9a-f]{6}$/i.test(s);
export const hex = (s: string) => (s.startsWith('#') ? s : `#${s}`).toUpperCase();
// colours go into the hash without '#', so links stay readable
export const hexList = (v: unknown) => String(v ?? '').split(',').filter(isHex).map(hex);

export { SIZES } from '../../data/tools';

// time a draw and keep a note in the page (dev check of the ~100 ms budget)
export async function timed<T>(fn: () => Promise<T>) {
  const t0 = performance.now();
  const out = await fn();
  (window as any).__levniLastDraw = Math.round(performance.now() - t0);
  return out;
}
