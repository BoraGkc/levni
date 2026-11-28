// Storyboards: a shot list becomes one contact sheet of drawn frames before anyone renders a video.
//   levni storyboard <spec.json> <out.png> [--frames-dir dir] [--columns n]
//   import { expandStoryboard, renderStoryboard } from 'levni/storyboard';
//   const shots = expandStoryboard(spec);                    // [{ id, title, note, duration, scene }], plain JSON
//   await renderStoryboard(spec, 'board.png', { framesDir }); // sheet + shot-NN.png + shots.json for a video tool
// A shot with `scene` is drawn as written. Otherwise a simple scene is built from prop(s), background, camera and
// on-screen text. Unknown props never throw: the frame becomes a neutral placeholder and `warnings` says so.
// Every frame is a normal compose() scene and every label is drawn from the repo fonts (type.mjs), so the same
// spec and seed give the same bytes on every machine. See docs/storyboard.md.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { compose, COLORS } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { resolveCanvas, FORMATS } from './formats.mjs';
import { findProp } from './props.mjs';
import { layoutType } from './type.mjs';

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (v, lo, hi, d) => (Number.isFinite(+v) && v !== null && v !== '' && v !== undefined ? Math.min(hi, Math.max(lo, +v)) : d);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r1 = (n) => Math.round(n * 10) / 10;
const CAMERAS = ['wide', 'close', 'left', 'right'];

// --- colours ------------------------------------------------------------------------------------

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (a) => '#' + a.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
function lum(hex) {
  const [r, g, b] = rgb(hex).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const hexOf = (c) => (HEX.test(c) ? c.toUpperCase() : COLORS[c] && COLORS[c] !== 'none' ? COLORS[c].toUpperCase() : null);

// brand.inks (1-5 colours) -> a Levni style: darkest = blue (grounds), a very light one = paper, the rest accents
function brandStyle(inks) {
  const list = (Array.isArray(inks) ? inks : []).slice(0, 5).map((c) => {
    const h = hexOf(c);
    if (!h) throw new Error(`storyboard brand.inks: "${c}" is not a #RRGGBB colour`);
    return h;
  });
  if (!list.length) return null;
  const light = list.filter((c) => lum(c) > 0.7), rest = list.filter((c) => lum(c) <= 0.7);
  const paper = light[0] ?? '#F6F0E4';
  const sig = rest[0] ?? '#2D4A7C';
  const darkest = [...rest].sort((a, b) => lum(a) - lum(b))[0] ?? sig;
  const deep = lum(darkest) <= 0.2 ? darkest : mix(darkest, '#10100E', 0.55);
  const others = rest.filter((c) => c !== deep);
  const accent = others[0] ?? '#E8734A', highlight = others[1] ?? (accent === '#F0B84A' ? '#E8734A' : '#F0B84A'), green = others[2] ?? '#2F7D57';
  return {
    blue: deep, coral: accent, mustard: highlight, green, paper, white: mix(paper, '#FFFFFF', 0.6), ink: mix(deep, '#0E0E0C', 0.45), dark: mix(deep, '#0E0E0C', 0.3),
    tone: mix(deep, paper, 0.58), 'tone-coral': mix(accent, paper, 0.55), 'tone-green': mix(green, paper, 0.55), 'tone-mustard': mix(highlight, paper, 0.55),
  };
}

// --- text helpers (the repo's own fonts, drawn as paths) --------------------------------------------

// widths scale linearly with size, so one shaping per (text, font, weight) is enough
const widths = new Map();
function measure(text, size, font = 'grotesk', weight) {
  if (!text) return 0;
  const key = `${font}|${weight}|${text}`;
  if (!widths.has(key)) widths.set(key, layoutType({ text, size: 100, font, weight }).w / 100);
  return widths.get(key) * size;
}

function wrap(text, maxW, size, font, weight, maxLines = 99) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, size, font, weight) > maxW) { lines.push(cur); cur = w; } else cur = next;
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = ellipsis(`${kept[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxW, size, font, weight);
    return kept;
  }
  // a single word wider than the box (long unbroken string): cut it
  return lines.map((l) => (measure(l, size, font, weight) > maxW * 1.02 ? ellipsis(l, maxW, size, font, weight) : l));
}

function ellipsis(text, maxW, size, font, weight) {
  if (measure(text, size, font, weight) <= maxW) return text;
  let t = text;
  while (t.length > 1 && measure(`${t}...`, size, font, weight) > maxW) t = t.slice(0, -1);
  return `${t.trimEnd()}...`;
}

// a line of type as an SVG path, top of the capitals at y; align start | middle | end about x
function line(text, x, y, { size, font = 'grotesk', weight, color, align = 'start', opacity }) {
  if (!text) return '';
  const r = layoutType({ text, size, font, weight, align: 'left' });
  const sx = align === 'middle' ? x - r.w / 2 : align === 'end' ? x - r.w : x;
  return `<path transform="translate(${r1(sx)} ${r1(y)})" d="${r.d}" fill="${color}"${opacity != null ? ` opacity="${opacity}"` : ''}/>`;
}

// --- timing -------------------------------------------------------------------------------------

export function timecode(sec) {
  const s = Math.max(0, sec);
  const whole = Math.floor(s + 1e-6), frac = Math.round((s - whole) * 10) / 10;
  const mm = String(Math.floor(whole / 60)).padStart(2, '0'), ss = String(whole % 60).padStart(2, '0');
  return frac > 0 ? `${mm}:${ss}.${Math.round(frac * 10)}` : `${mm}:${ss}`;
}
const secs = (d) => (Number.isInteger(d * 10) || Math.abs(d * 10 - Math.round(d * 10)) < 1e-6 ? `${(Math.round(d * 10) / 10).toFixed(1)}s` : `${d.toFixed(2)}s`);

// --- expand -------------------------------------------------------------------------------------

function resolveFormat(f) {
  if (Array.isArray(f)) {
    if (f.length !== 2 || !f.every((n) => Number.isFinite(+n) && n >= 64 && n <= 4096)) throw new Error('storyboard format [w, h] needs two numbers, 64..4096');
    return [Math.round(f[0]), Math.round(f[1])];
  }
  const name = f ?? 'youtube';
  if (!FORMATS[name]) throw new Error(`storyboard format "${name}": use youtube, hd, story, square, cover, og, or [w, h]`);
  return [...FORMATS[name]];
}

const BACKGROUNDS = ['tone-mustard', 'tone', 'paper', 'tone-coral', 'tone-green', 'blue'];
const DARK = new Set(['blue', 'ink', 'dark']);
const DISC = { paper: 'tone-mustard', 'tone-mustard': 'paper', tone: 'paper', 'tone-coral': 'paper', 'tone-green': 'paper', blue: 'mustard', dark: 'blue', ink: 'blue', white: 'tone-mustard', coral: 'mustard', mustard: 'paper', green: 'paper' };
const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.codePointAt(0), 16777619); return (h >>> 0) % 900 + 20; };

// words of a shot list that describe the camera, not the subject
const SKIP = new Set(['close', 'wide', 'shot', 'scene', 'camera', 'view', 'with', 'from', 'into', 'over', 'next', 'then', 'this', 'that', 'cut', 'zoom', 'pan', 'open', 'opens', 'shows', 'show']);
function inferProps(text) {
  const words = [...new Set(String(text || '').toLowerCase().split(/[^\p{L}\p{N}-]+/u).filter((w) => w.length >= 4 && !SKIP.has(w)))];
  const hits = words.map((w) => findProp(w)).filter(Boolean);
  const names = [...new Set(hits.map((p) => p.name))];
  // a word that is a prop's own name beats one that only appears among its tags
  const direct = names.filter((n) => words.includes(n));
  return [...direct, ...names.filter((n) => !direct.includes(n))].slice(0, 2);
}

function onScreenText(shot) {
  const t = shot.text;
  return t == null || t === '' ? '' : String(t).slice(0, 120);
}

// Build the scene for one shot. W x H is the storyboard canvas.
function buildScene(shot, i, W, H, base, warnings) {
  const requested = [...(shot.prop ? [shot.prop] : []), ...(Array.isArray(shot.props) ? shot.props : [])].map(String).slice(0, 4);
  const names = [];
  for (const n of requested) {
    const p = findProp(n);
    if (p) names.push(p.name);
    else warnings.push(`shot ${shot._id}: unknown prop "${n}", drew a placeholder`);
  }
  const camera = CAMERAS.includes(shot.camera) ? shot.camera : 'wide';
  if (shot.camera != null && !CAMERAS.includes(shot.camera)) warnings.push(`shot ${shot._id}: unknown camera "${shot.camera}" (use ${CAMERAS.join(', ')}), used wide`);
  const bg = shot.background != null && (COLORS[shot.background] || HEX.test(shot.background)) ? shot.background : BACKGROUNDS[i % BACKGROUNDS.length];
  if (shot.background != null && bg !== shot.background) warnings.push(`shot ${shot._id}: unknown background "${shot.background}", used ${bg}`);
  const dark = DARK.has(bg) || (HEX.test(bg) && lum(bg) < 0.18);
  const fg = dark ? 'paper' : 'ink';
  const text = onScreenText(shot);
  const u = Math.min(W, H), portrait = H > W * 1.1;
  const els = [];
  const seed = base.seed + i * 17;
  const scene = { canvas: [W, H], seed, background: bg, finish: 'soft', elements: els, ...(base.style ? { style: base.style } : {}) };

  // text block: wrapped lines of the display face, fitted to a box
  const textBlock = (x, y, w, maxH, align, sizeMax, color) => {
    let size = sizeMax, lines = [];
    for (; size >= u * 0.028; size -= 2) {
      lines = wrap(text, w, size, 'grotesk', 700, 4);
      if (lines.length * size * 1.12 <= maxH && lines.every((l) => measure(l, size, 'grotesk', 700) <= w)) break;
    }
    lines = wrap(text, w, size, 'grotesk', 700, 4);
    const lh = size * 1.12, h = (lines.length - 1) * lh + size * 0.72;
    const ax = align === 'center' ? x + w / 2 : align === 'right' ? x + w : x;
    lines.forEach((l, k) => els.push({ type: 'type', text: l, x: r1(ax), y: r1(y + k * lh), size: r1(size), font: 'grotesk', weight: 700, align: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left', color, tracking: -0.01 }));
    return { w: Math.max(...lines.map((l) => measure(l, size, 'grotesk', 700))), h, size };
  };

  if (!names.length) {
    // nothing to draw: a title card when there is text, a neutral placeholder frame otherwise
    if (!requested.length && text) {
      els.push({ type: 'disc', x: r1(W * 0.84), y: r1(H * 0.2), r: r1(u * 0.2), color: DISC[bg] ?? 'paper' });
      textBlock(W * 0.1, H * 0.4, W * 0.8, H * 0.4, 'left', u * (portrait ? 0.12 : 0.14), fg);
      return scene;
    }
    if (!requested.length) warnings.push(`shot ${shot._id}: no scene, prop or text, drew a placeholder`);
    const ink = dark ? 'paper' : 'ink';
    const m = u * 0.08;
    scene.background = dark ? bg : 'paper';
    els.push({ type: 'block', x: r1(m), y: r1(m), w: r1(W - 2 * m), h: r1(H - 2 * m), color: ink, outline: true, weight: 3, radius: 10, opacity: 0.55 });
    els.push({ type: 'line', points: [[r1(m), r1(m)], [r1(W - m), r1(H - m)]], color: ink, weight: 2, opacity: 0.35 });
    els.push({ type: 'line', points: [[r1(W - m), r1(m)], [r1(m), r1(H - m)]], color: ink, weight: 2, opacity: 0.35 });
    const label = text || String(shot._title || '');
    if (label) {
      const size = u * 0.075;
      const lines = wrap(label, W * 0.62, size, 'grotesk', 700, 3);
      const lh = size * 1.15, bh = (lines.length - 1) * lh + size * 0.72, bw = Math.max(...lines.map((l) => measure(l, size, 'grotesk', 700))) + size * 1.2;
      const by = H / 2 - bh / 2 - size * 0.45;
      els.push({ type: 'block', x: r1(W / 2 - bw / 2), y: r1(by), w: r1(bw), h: r1(bh + size * 0.9), color: dark ? 'blue' : 'paper', radius: 8 });
      lines.forEach((l, k) => els.push({ type: 'type', text: l, x: r1(W / 2), y: r1(H / 2 - bh / 2 + k * lh), size: r1(size), font: 'grotesk', weight: 700, align: 'center', color: ink }));
    }
    return scene;
  }

  // layout rectangles by camera
  const n = names.length;
  let prop, tx;
  const pad = u * 0.07;
  if (portrait) {
    const upper = text ? 0.6 : 0.82;
    const shift = camera === 'left' ? -0.08 : camera === 'right' ? 0.08 : 0;
    prop = { x: W * (0.08 + shift), y: H * 0.07, w: W * 0.84, h: H * upper };
    tx = { x: W * 0.08, y: H * 0.7, w: W * 0.84, h: H * 0.2, align: camera === 'left' ? 'left' : camera === 'right' ? 'right' : 'center' };
    if (camera === 'close') prop = { x: -W * 0.1, y: H * 0.02, w: W * 1.2, h: H * (text ? 0.68 : 0.9) };
  } else if (camera === 'left') {
    prop = { x: pad, y: pad, w: W * 0.46, h: H - 2 * pad };
    tx = { x: W * 0.56, y: H * 0.26, w: W * 0.38, h: H * 0.5, align: 'left' };
  } else if (camera === 'right') {
    prop = { x: W - pad - W * 0.46, y: pad, w: W * 0.46, h: H - 2 * pad };
    tx = { x: W * 0.06, y: H * 0.26, w: W * 0.38, h: H * 0.5, align: 'left' };
  } else if (camera === 'close') {
    prop = { x: W * 0.08, y: -H * 0.08, w: W * 0.84, h: H * 1.16 };
    tx = { x: W * 0.07, y: H * 0.76, w: W * 0.6, h: H * 0.15, align: 'left' };
  } else {
    prop = { x: W * 0.08, y: H * 0.07, w: W * 0.84, h: text ? H * 0.62 : H * 0.86 };
    tx = { x: W * 0.1, y: H * 0.8, w: W * 0.8, h: H * 0.13, align: 'center' };
  }

  const cell = prop.w / n;
  const size = Math.min(cell, prop.h) * (camera === 'close' ? 0.96 : n > 1 ? 0.82 : 0.9);
  const cy = prop.y + prop.h / 2;
  names.forEach((name, k) => {
    const cx = prop.x + cell * (k + 0.5);
    if (camera !== 'close' || n > 1) els.push({ type: 'disc', x: r1(cx), y: r1(cy), r: r1(size * 0.56), color: DISC[bg] ?? 'paper' });
    els.push({ type: 'prop', name, variant: k % 3 === 2 ? 1 : 0, x: r1(cx), y: r1(cy), size: r1(size), fit: true, shadow: true, ...(camera === 'close' ? { extrude: true } : {}) }); // never mirrored: a flipped drawing reverses any writing on it
  });
  if (camera === 'close' && n === 1) els.unshift({ type: 'disc', x: r1(prop.x + prop.w / 2), y: r1(cy), r: r1(size * 0.5), color: DISC[bg] ?? 'paper' });

  if (text) {
    if (camera === 'close' && !portrait) {
      // overlay caption: a block under the words keeps them readable on top of the prop
      const lines0 = wrap(text, tx.w, u * 0.075, 'grotesk', 700, 2);
      const sz = u * 0.075, lh = sz * 1.12, bh = (lines0.length - 1) * lh + sz * 0.72;
      const bw = Math.max(...lines0.map((l) => measure(l, sz, 'grotesk', 700)));
      els.push({ type: 'block', x: r1(tx.x - sz * 0.5), y: r1(tx.y - sz * 0.5), w: r1(bw + sz), h: r1(bh + sz), color: dark ? 'paper' : 'ink', radius: 8 });
      lines0.forEach((l, k) => els.push({ type: 'type', text: l, x: r1(tx.x), y: r1(tx.y + k * lh), size: r1(sz), font: 'grotesk', weight: 700, color: dark ? 'ink' : 'paper', tracking: -0.01 }));
    } else {
      textBlock(tx.x, tx.y, tx.w, tx.h, tx.align, u * (portrait ? 0.1 : 0.095), fg);
    }
  }
  return scene;
}

function normalizeSpec(spec) {
  if (Array.isArray(spec)) return { shots: spec };
  if (!spec || typeof spec !== 'object') throw new Error('storyboard needs a spec object or a shot list array');
  return spec;
}

/**
 * Turn a storyboard spec (or a bare shot list: [{ id, desc, frames }]) into plain-JSON shots.
 * Returns [{ id, title, note, duration, scene, frames?, warnings }]; the array also carries `warnings` (all of them).
 */
export function expandStoryboard(specIn) {
  const spec = normalizeSpec(specIn);
  if (!Array.isArray(spec.shots) || !spec.shots.length) throw new Error('storyboard needs "shots": a non-empty array');
  if (spec.shots.length > 60) throw new Error('a storyboard holds at most 60 shots');
  const [W, H] = resolveFormat(spec.format);
  const brand = spec.brand && typeof spec.brand === 'object' ? spec.brand : null;
  const style = spec.style ?? (brand?.inks ? brandStyle(brand.inks) : null);
  const seed = Math.round(clamp(spec.seed, 1, 1e6, hash(`${spec.title ?? ''}${brand?.name ?? ''}${spec.shots.length}`)));
  const fpsDefault = clamp(spec.fps, 1, 240, 24);
  const base = { seed, style };
  const all = [];
  const out = spec.shots.map((raw, i) => {
    const s = raw && typeof raw === 'object' ? raw : { desc: String(raw ?? '') };
    const warnings = [];
    const id = String(s.id ?? `s${String(i + 1).padStart(2, '0')}`).slice(0, 24);
    const title = String(s.title ?? s.desc ?? s.id ?? `Shot ${i + 1}`).trim().slice(0, 120);
    const note = s.note != null ? String(s.note).trim().slice(0, 400) : s.title != null && s.desc != null ? String(s.desc).trim().slice(0, 400) : '';
    let duration, frames;
    if (s.duration != null) duration = clamp(s.duration, 0.1, 3600, 3);
    else if (s.frames != null) { frames = Math.round(clamp(s.frames, 1, 1e6, 72)); duration = clamp(frames / clamp(s.fps, 1, 240, fpsDefault), 0.04, 3600, 3); }
    else duration = 3;
    duration = Math.round(duration * 1000) / 1000;
    let scene;
    if (s.scene && typeof s.scene === 'object') {
      scene = s.scene;
    } else {
      const shot = { ...s, _id: id, _title: title };
      // a bare shot list names its subject in the text: look for a prop word when none was given
      if (!shot.prop && !(shot.props && shot.props.length) && !shot.text) {
        const found = inferProps(`${s.title ?? ''} ${s.desc ?? ''}`);
        if (found.length) shot.props = found;
      }
      scene = buildScene(shot, i, W, H, base, warnings);
    }
    const o = { id, title, note, duration, scene, ...(frames ? { frames } : {}), warnings };
    all.push(...warnings);
    return o;
  });
  Object.defineProperty(out, 'warnings', { value: all, enumerable: false });
  Object.defineProperty(out, 'canvas', { value: [W, H], enumerable: false });
  Object.defineProperty(out, 'seed', { value: seed, enumerable: false });
  Object.defineProperty(out, 'style', { value: style, enumerable: false });
  return out;
}

// --- render -------------------------------------------------------------------------------------

// A scene drawn at W x H. A scene authored for another canvas is reflowed into it (same rule as board tiles).
const frameCache = new Map(); // scene + size + seed -> PNG: re-rendering a sheet with other columns reuses the frames
async function drawScene(scene, W, H, seed, style, cache = true) {
  const key = cache ? JSON.stringify([scene, W, H, seed, style]) : null;
  if (key && frameCache.has(key)) return frameCache.get(key);
  const png = await drawSceneUncached(scene, W, H, seed, style);
  if (key) { frameCache.set(key, png); if (frameCache.size > 32) frameCache.delete(frameCache.keys().next().value); }
  return png;
}
async function drawSceneUncached(scene, W, H, seed, style) {
  const authored = resolveCanvas(scene);
  const spec = { seed, ...(style && !scene.style ? { style } : {}), ...scene, canvas: [W, H] };
  delete spec.format;
  if (scene.reflow !== false && (authored.w !== W || authored.h !== H)) { spec.reflow = true; spec.reflowFrom = scene.reflowFrom ?? [authored.w, authored.h]; }
  const { svg } = await compose(spec);
  return rasterize(svg);
}

const svgDoc = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);

/**
 * Render the storyboard sheet to a PNG: title row, then numbered frames in a grid with id/title, duration, running
 * timecode and wrapped note text. Returns { png, width, height, shots, total, warnings }.
 * opts: columns (3, or 4 for tall formats), frameWidth (360 px), framesDir (also write shot-NN.png at full size + shots.json),
 * cache (true: frames drawn earlier in this process are reused; false forces a fresh draw).
 */
export async function renderStoryboard(specIn, out, opts = {}) {
  const spec = normalizeSpec(specIn);
  const shots = expandStoryboard(spec);
  const [W, H] = shots.canvas;
  const tall = H / W > 1.3;
  const cols = Math.round(clamp(opts.columns, 1, 8, tall ? 4 : 3));
  const fw = Math.round(clamp(opts.frameWidth, 80, 1200, 360));
  const fh = Math.round((fw * H) / W);
  const ts = Math.max(0.6, Math.min(2.4, fw / 360)); // text scale
  const style = shots.style;
  const brand = spec.brand && typeof spec.brand === 'object' ? spec.brand : null;

  // sheet colours follow the brand inks when there are any
  const P = { paper: style?.paper ?? '#EFEADF', ink: style?.ink ?? '#1C1A16', accent: style?.coral ?? '#E8734A', deep: style?.blue ?? '#2D4A7C' };
  const soft = mix(P.paper, P.ink, 0.12), faint = mix(P.paper, P.ink, 0.55);

  const M = Math.round(30 * ts), G = Math.round(26 * ts);
  const sheetW = M * 2 + cols * fw + (cols - 1) * G;
  const headH = Math.round(150 * ts);
  const noteSize = 13.5 * ts, noteLH = noteSize * 1.42, titleSize = 15.5 * ts, tcSize = 11.5 * ts;
  const maxNote = 4;

  // timeline
  let t = 0;
  const entries = shots.map((s, i) => { const e = { ...s, index: i + 1, start: Math.round(t * 1000) / 1000, end: Math.round((t + s.duration) * 1000) / 1000 }; t += s.duration; return e; });
  const total = Math.round(t * 1000) / 1000;

  // per cell: wrapped note, so rows size to the longest note
  const badgeW = Math.round(30 * ts), badgeH = Math.round(22 * ts);
  const cellInfo = entries.map((e) => {
    const durText = secs(e.duration);
    const durW = measure(durText, titleSize * 0.9, 'mono', 600);
    const titleMax = fw - badgeW - 10 * ts - durW - 12 * ts;
    const title = ellipsis(e.title, titleMax, titleSize, 'grotesk', 700);
    const noteLines = e.note ? wrap(e.note, fw, noteSize, 'grotesk', 500, maxNote) : [];
    return { durText, title, noteLines };
  });
  const rowOf = (i) => Math.floor(i / cols);
  const rows = Math.ceil(entries.length / cols);
  const rowNotes = Array.from({ length: rows }, (_, r) => Math.max(0, ...cellInfo.filter((_, i) => rowOf(i) === r).map((c) => c.noteLines.length)));
  const frameBlock = Math.round(12 * ts) + badgeH; // frame bottom to the end of the title line
  const tcBlock = Math.round(tcSize + 12 * ts);
  const rowH = rowNotes.map((n) => Math.round(fh + frameBlock + tcBlock + (n ? Math.round(8 * ts) + n * noteLH : 0)));
  const rowTop = [];
  let y = headH;
  for (const h of rowH) { rowTop.push(y); y += h + G; }
  const footH = Math.round(36 * ts);
  const sheetH = Math.round(y - G + M + footH);

  let svg = `<rect width="${sheetW}" height="${sheetH}" fill="${P.paper}"/>`;
  const frames = [];

  // title row
  const titleText = String(spec.title ?? brand?.name ?? 'Storyboard').slice(0, 90);
  const bigSize = Math.round(40 * ts);
  const bigLines = wrap(titleText, sheetW - M * 2 - Math.round(260 * ts), bigSize, 'grotesk', 700, 1);
  svg += `<rect x="${M}" y="${M}" width="${Math.round(46 * ts)}" height="${Math.round(7 * ts)}" fill="${P.accent}"/>`;
  svg += line(bigLines[0] ?? '', M, M + Math.round(26 * ts), { size: bigSize, weight: 700, color: P.ink });
  const meta = `${entries.length} SHOT${entries.length === 1 ? '' : 'S'}  /  ${timecode(total)}  /  ${W}x${H}`;
  svg += line(meta, M, M + Math.round(26 * ts) + Math.round(bigSize * 0.95) + Math.round(8 * ts), { size: 12.5 * ts, font: 'mono', weight: 500, color: faint });
  if (brand?.name) svg += line(String(brand.name).toUpperCase().slice(0, 28), sheetW - M, M + Math.round(8 * ts), { size: 13 * ts, font: 'mono', weight: 700, color: P.deep, align: 'end' });
  svg += `<rect x="${M}" y="${headH - Math.round(22 * ts)}" width="${sheetW - M * 2}" height="${Math.max(1, Math.round(2 * ts))}" fill="${P.ink}"/>`;

  // cells
  const cellTop = (i) => rowTop[rowOf(i)];
  const cellLeft = (i) => M + (i % cols) * (fw + G);
  let borders = '';
  const warnings = [...shots.warnings];
  for (let i = 0; i < entries.length; i += 2) { // two at a time: faster, still calm on the machine
    frames.push(...await Promise.all(entries.slice(i, i + 2).map((e, k) => drawScene(e.scene, W, H, shots.seed + (i + k) * 17, style, opts.cache !== false))));
  }
  for (const [i, e] of entries.entries()) {
    const x = cellLeft(i), top = cellTop(i), c = cellInfo[i];
    const full = frames[i];
    const thumb = await sharp(full).resize(fw, fh, { fit: 'cover', kernel: 'lanczos3' }).png().toBuffer();
    const r = Math.max(3, Math.round(6 * ts));
    const rounded = await sharp(thumb).composite([{ input: svgDoc(fw, fh, `<rect width="${fw}" height="${fh}" rx="${r}" fill="#000"/>`), blend: 'dest-in' }]).png().toBuffer();
    e._thumb = { input: rounded, left: x, top };
    borders += `<rect x="${x + 0.5}" y="${top + 0.5}" width="${fw - 1}" height="${fh - 1}" rx="${r}" fill="none" stroke="${P.ink}" stroke-width="${Math.max(1.5, 2 * ts)}"/>`;
    // title line: number badge, title, duration
    const ty = top + fh + Math.round(12 * ts);
    svg += `<rect x="${x}" y="${ty}" width="${badgeW}" height="${badgeH}" rx="${Math.round(4 * ts)}" fill="${P.ink}"/>`;
    svg += line(String(e.index).padStart(2, '0'), x + badgeW / 2, ty + (badgeH - titleSize * 0.7) / 2, { size: titleSize * 0.82, font: 'mono', weight: 700, color: P.paper, align: 'middle' });
    svg += line(c.title, x + badgeW + 10 * ts, ty + (badgeH - titleSize * 0.7) / 2, { size: titleSize, weight: 700, color: P.ink });
    svg += line(c.durText, x + fw, ty + (badgeH - titleSize * 0.9 * 0.7) / 2, { size: titleSize * 0.9, font: 'mono', weight: 600, color: P.accent === P.ink ? P.ink : mix(P.accent, P.ink, 0.25), align: 'end' });
    // timecode
    const cy = ty + badgeH + Math.round(9 * ts);
    const idPart = e.id !== e.title && !/^s\d+$/.test(e.id) ? `  /  ${e.id}` : '';
    svg += line(ellipsis(`${timecode(e.start)} - ${timecode(e.end)}${idPart}`.toUpperCase(), fw, tcSize, 'mono', 500), x, cy, { size: tcSize, font: 'mono', weight: 500, color: faint });
    // note
    c.noteLines.forEach((l, k) => { svg += line(l, x, cy + tcSize + Math.round(11 * ts) + k * noteLH, { size: noteSize, weight: 500, color: mix(P.ink, P.paper, 0.18) }); });
  }
  // thin rules between rows' notes and footer
  svg += line(`LEVNI STORYBOARD  /  ${timecode(total)} TOTAL`, M, sheetH - M - Math.round(6 * ts), { size: 11 * ts, font: 'mono', weight: 500, color: faint });
  svg += `<rect x="${M}" y="${sheetH - M - Math.round(22 * ts)}" width="${sheetW - M * 2}" height="1" fill="${soft}"/>`;

  const png = await sharp(svgDoc(sheetW, sheetH, svg))
    .composite([...entries.map((e) => e._thumb), { input: svgDoc(sheetW, sheetH, borders), left: 0, top: 0 }])
    .png({ compressionLevel: 9 }).toBuffer();
  if (out) writeFileSync(out, png);

  const summary = entries.map(({ id, title, note, duration, start }, i) => ({ id, title, note, duration, start, ...(opts.framesDir ? { file: `shot-${String(i + 1).padStart(2, '0')}.png` } : {}) }));
  if (opts.framesDir) {
    mkdirSync(opts.framesDir, { recursive: true });
    for (const [i, f] of frames.entries()) writeFileSync(join(opts.framesDir, summary[i].file), f);
    const list = entries.map((e, i) => ({ ...summary[i], ...(e.frames ? { frames: e.frames } : {}) }));
    writeFileSync(join(opts.framesDir, 'shots.json'), `${JSON.stringify(list, null, 2)}\n`);
  }
  return { png, width: sheetW, height: sheetH, shots: summary, total, warnings };
}
