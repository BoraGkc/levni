// Draws one Folio drawing in every style (ink, 3D, ASCII, dot matrix, dot lines, echo) with the Levni engine in the
// browser, as small SVG previews. Used by the drawing pages; the engine, the drawing and fonts load on first use.
import { DRAW_STYLES } from './draw-styles';

const propFiles = import.meta.glob('../../../library/props/*.json', { import: 'default' });
const fontUrls = import.meta.glob('../../../fonts/*.{ttf,otf}', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
const FONT_FILES: Record<string, string> = { grotesk: 'SpaceGrotesk-Variable.ttf', black: 'ArchivoBlack-Regular.ttf', mono: 'JetBrainsMono-Variable.ttf', pixel: 'DepartureMono-Regular.otf' };
let engine: Promise<any> | null = null;
const loaded = new Set<string>();

// on a dark tile the dot styles read better; the rest sit on paper
const DARK = new Set(['dotline']);

const pending = new Map<string, Promise<void>>(); // a drawing being loaded, so two tiles do not register it twice
async function ready(name: string) {
  engine ||= import('../../../src/browser.mjs');
  const eng = await engine;
  const load = propFiles[`../../../library/props/${name}.json`];
  if (load && !loaded.has(name)) {
    if (!pending.has(name)) pending.set(name, load().then((p) => { if (!loaded.has(name)) { eng.registerProps([p]); loaded.add(name); } }));
    await pending.get(name);
  }
  return eng;
}
async function fontsFor(eng: any, scene: any) {
  await Promise.all(eng.fontsFor(scene).filter((f: string) => !loaded.has(`font:${f}`)).map(async (f: string) => {
    const url = Object.entries(fontUrls).find(([key]) => key.endsWith(FONT_FILES[f]))?.[1];
    if (url) { eng.registerFont(f, await (await fetch(url)).arrayBuffer()); loaded.add(`font:${f}`); }
  }));
}
/** The scene that draws `name` in style `id` on a 240 px square tile (dark ground for the dot styles). */
export function tileScene(name: string, variant: number, id: string, ink?: string) {
  const d = DRAW_STYLES.find((x) => x.id === id) || DRAW_STYLES[0];
  const el = d.to({ name, variant: variant || undefined, x: 120, y: d.id === 'echo' ? 80 : 120, size: d.id === 'echo' ? 120 : d.id === 'dotline' ? 180 : 170, color: ink });
  if (d.id === 'dotline') Object.assign(el, { cell: 5, color: ink || '#8F7DFF', muted: '#4E4E57' });
  return { canvas: [240, 240], seed: 4, finish: 'soft', ...(DARK.has(d.id) ? { background: '#0B0B0C' } : {}), elements: [el] };
}
// tiles are drawn on the main thread: at most three at a time, so a page of 120 does not freeze a phone
const tileCache = new Map<string, Promise<string>>();
let running = 0;
const queue: (() => void)[] = [];
const slot = () => new Promise<void>((go) => { if (running < 3) { running++; go(); } else queue.push(() => { running++; go(); }); });
const free = () => { running--; queue.shift()?.(); };
/** One drawing in one style as an SVG blob URL. Same key, same promise; clearTiles() lets them all go. */
export function styleTile(name: string, variant: number, id: string, ink?: string) {
  const key = `${name}|${variant}|${id}|${ink || ''}`;
  let p = tileCache.get(key);
  if (!p) {
    p = (async () => {
      await slot();
      try {
        const eng = await ready(name);
        const scene = tileScene(name, variant, id, ink);
        await fontsFor(eng, scene);
        const { svg } = await eng.compose(scene);
        return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      } finally { free(); }
    })();
    tileCache.set(key, p);
    p.catch(() => tileCache.delete(key));
  }
  return p;
}
/** Revoke every tile drawn so far (call when the style or ink changes; the images on screen are swapped right after). */
export function clearTiles() {
  for (const p of tileCache.values()) p.then((u) => URL.revokeObjectURL(u), () => {});
  tileCache.clear();
  queue.length = 0; // drop the tiles still waiting for a slot; they belong to the old look
}
/** The ink a style is drawn in when nobody picked one: violet dots on the dark tile, house ink elsewhere. */
export const defaultInk = (id: string) => (id === 'dotline' ? '#8F7DFF' : '#14181F');

/** Fill `pics` (one element per DRAW_STYLES entry, in order) with the drawing in that style. Returns false on failure. */
export async function drawStylePreviews(name: string, variant: number, pics: HTMLElement[], isCurrent: () => boolean = () => true) {
  const urls: string[] = [];
  try {
    engine ||= import('../../../src/browser.mjs');
    const eng = await engine;
    const load = propFiles[`../../../library/props/${name}.json`];
    if (load && !loaded.has(name)) { eng.registerProps([await load()]); loaded.add(name); }
    for (const [k, d] of DRAW_STYLES.entries()) {
      if (!isCurrent()) break;
      const el = d.to({ name, variant: variant || undefined, x: 120, y: d.id === 'echo' ? 80 : 120, size: d.id === 'echo' ? 120 : d.id === 'dotline' ? 180 : 170 });
      if (d.id === 'dotline') Object.assign(el, { cell: 5, color: '#8F7DFF', muted: '#4E4E57' });
      const scene = { canvas: [240, 240], seed: 4, finish: 'soft', ...(DARK.has(d.id) ? { background: '#0B0B0C' } : {}), elements: [el] };
      await Promise.all(eng.fontsFor(scene).filter((f: string) => !loaded.has(`font:${f}`)).map(async (f: string) => {
        const url = Object.entries(fontUrls).find(([key]) => key.endsWith(FONT_FILES[f]))?.[1];
        if (url) { eng.registerFont(f, await (await fetch(url)).arrayBuffer()); loaded.add(`font:${f}`); }
      }));
      const { svg } = await eng.compose(scene);
      if (!isCurrent()) break;
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      urls.push(url);
      pics[k]?.replaceChildren(Object.assign(document.createElement('img'), { src: url, alt: '', width: 240, height: 240 }));
    }
    return { ok: true, urls };
  } catch {
    return { ok: false, urls };
  }
}
