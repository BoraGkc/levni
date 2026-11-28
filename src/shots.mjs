// Levni Shots: named, ready-made motion shots. A shot is a scene template with slots (title, subtitle, kicker, mark,
// inks, items, values) that lays itself out for any format and moves in its own way.
//   import { shotScene, SHOTS } from '@levni/levni';
//   const scene = shotScene('logo-sting', { title: 'Lale Studio', mark: 'tulip', format: 'square' });
//   await animate(scene, 'sting.gif');
import { resolveCanvas } from './formats.mjs';

const num = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);

// where things go on this canvas: an art spot, a text column, sizes that read at the format
function layout(W, H) {
  const m = Math.min(W, H), land = W / H > 1.2, tall = H / W > 1.2;
  if (land) return { W, H, m, land, tall, art: { x: W * 0.73, y: H * 0.5, s: H * 0.56 }, tx: { x: W * 0.07, y: H * 0.3, w: W * 0.5, h: H * 0.26 }, sub: H * 0.045, kick: { x: W * 0.07, y: H * 0.16 }, ky: H * 0.03 };
  if (tall) return { W, H, m, land, tall, art: { x: W * 0.5, y: H * 0.32, s: W * 0.62 }, tx: { x: W * 0.08, y: H * 0.58, w: W * 0.84, h: H * 0.12 }, sub: W * 0.042, kick: { x: W * 0.08, y: H * 0.08 }, ky: W * 0.03 };
  return { W, H, m, land, tall, art: { x: W * 0.5, y: H * 0.36, s: W * 0.44 }, tx: { x: W * 0.08, y: H * 0.64, w: W * 0.84, h: H * 0.15 }, sub: W * 0.038, kick: { x: W * 0.08, y: H * 0.08 }, ky: W * 0.026 };
}
const r1 = (v) => Math.round(v);
const T = (text, x, y, o = {}) => ({ type: 'type', text, x: r1(x), y: r1(y), ...o });
const P = (name, x, y, size, o = {}) => ({ type: 'prop', name, x: r1(x), y: r1(y), size: r1(size), ...o });
const D = (x, y, r, color, o = {}) => ({ type: 'disc', x: r1(x), y: r1(y), r: r1(r), color, ...o });
const POP = (delay = 0.06, dur = 0.16) => ({ type: 'pop', delay, dur });
const TYPE = (delay = 0.1, dur = 0.26) => ({ type: 'typewriter', delay, dur, cursor: '_' });
const SLIDE = (delay = 0.42, from = 'down', distance = 40) => ({ type: 'slide', from, distance, delay, dur: 0.14 });
const FADE = (delay = 0.5) => ({ type: 'fade', delay, dur: 0.12 });

// the text block every shot shares: kicker, headline, subtitle (each optional), placed by the layout
function words(L, f, color, o = {}) {
  const els = [];
  const tx = o.tx || L.tx;
  if (f.kicker) els.push(T(f.kicker.toUpperCase(), L.kick.x, L.kick.y, { size: r1(L.ky), font: 'mono', weight: 700, tracking: 0.06, color: o.kickColor || color, ...(o.kickMotion ? { motion: o.kickMotion } : {}) }));
  if (f.title) els.push(T(f.title, tx.x, tx.y, { w: r1(tx.w), h: r1(tx.h), fit: 'box', font: o.font || 'black', color, align: o.align, ...(o.titleMotion !== null ? { motion: o.titleMotion || TYPE() } : {}) }));
  if (f.subtitle) els.push(T(f.subtitle, o.align === 'center' ? L.W / 2 : tx.x + 4, tx.y + tx.h + L.sub * 1.2, { size: r1(L.sub), color, align: o.align, ...(o.subMotion !== null ? { motion: o.subMotion || SLIDE() } : {}) }));
  return els;
}

// slot defaults, used when a field is left out (and for the catalogue)
const SAMPLE = { title: 'Ship it today', subtitle: 'One JSON file, every format.', kicker: 'New', mark: 'rocket' };

// [id, group, one line, default fields, build(L, f) -> { background, elements, stagger?, camera?, finish? }]
const DEFS = [
  ['typed-headline', 'text', 'The headline types itself while the mark pops in and floats.', {}, (L, f) => ({ background: 'paper', elements: [
    D(L.art.x, L.art.y, L.art.s * 0.48, 'mustard', { motion: POP(0.02) }), P(f.mark, L.art.x, L.art.y, L.art.s * 0.78, { shadow: true, motion: [POP(0.08), { type: 'float', amp: L.m * 0.015 }] }),
    ...words(L, f, 'ink')] })],
  ['headline-slide', 'text', 'Headline and subtitle slide in from the left on a blue ground.', {}, (L, f) => ({ background: 'blue', elements: [
    D(L.art.x, L.art.y, L.art.s * 0.48, 'paper'), P(f.mark, L.art.x, L.art.y, L.art.s * 0.74, { motion: { type: 'sway', amp: 6 } }),
    ...words(L, f, 'paper', { titleMotion: SLIDE(0.06, 'left', L.W * 0.08), subMotion: SLIDE(0.3, 'left', L.W * 0.06) })] })],
  ['kicker-wipe', 'text', 'A coral bar wipes in, the headline is uncovered, the mark is drawn on.', {}, (L, f) => ({ background: 'paper', elements: [
    { type: 'block', x: r1(L.tx.x), y: r1(L.tx.y - L.ky * 2.6), w: r1(L.m * 0.1), h: r1(L.m * 0.018), color: 'coral', motion: { type: 'wipe', delay: 0.02, dur: 0.12 } },
    P(f.mark, L.art.x, L.art.y, L.art.s * 0.9, { motion: { type: 'draw', delay: 0.05, dur: 0.4 } }),
    ...words({ ...L }, { ...f, kicker: '' }, 'ink', { titleMotion: { type: 'wipe', delay: 0.12, dur: 0.22 }, subMotion: FADE(0.4) })] })],
  ['quote', 'text', 'A quote types itself in serif; the attribution fades in after.', { title: '“Make the thing you wish existed.”', subtitle: '— A note on the studio wall', mark: 'pencil' }, (L, f) => ({ background: '#F6EFE3', elements: [
    D(L.art.x, L.art.y, L.art.s * 0.34, 'blue'), P(f.mark, L.art.x, L.art.y, L.art.s * 0.5, { motion: { type: 'wiggle', amp: 6 } }),
    ...words(L, f, 'ink', { font: 'serif', titleMotion: TYPE(0.05, 0.42), subMotion: FADE(0.55) })] })],
  ['big-number', 'data', 'A number types itself; a row of drawings sways underneath.', { title: '12,480', subtitle: 'trees planted by readers', mark: 'tree', kicker: 'This year' }, (L, f) => ({ background: 'green', elements: [
    ...words(L, f, 'paper', { tx: { x: L.tx.x, y: L.land ? L.H * 0.22 : L.H * 0.2, w: L.land ? L.W * 0.6 : L.tx.w, h: L.land ? L.H * 0.3 : L.H * 0.18 } }),
    ...[0, 1, 2, 3, 4].map((k) => P(f.mark, L.W * (0.14 + k * 0.18), L.H * (L.tall ? 0.86 : 0.8), L.m * 0.2, { motion: { type: 'sway', amp: 6, phase: k * 0.15 } }))] })],
  ['list-stagger', 'text', 'A title, then a list whose lines slide in one after another.', { title: 'v2.0', kicker: 'Changelog', items: ['Dark mode', 'Faster search', 'Offline drafts', 'Fewer bugs'] }, (L, f) => {
    const items = (f.items || []).slice(0, 6), y0 = L.land ? L.H * 0.5 : L.H * 0.5, step = L.sub * 1.9;
    return { background: 'paper', elements: [
      ...words(L, { ...f, subtitle: '' }, 'ink', { tx: { x: L.tx.x, y: L.land ? L.H * 0.22 : L.H * 0.2, w: L.land ? L.W * 0.45 : L.W * 0.6, h: L.land ? L.H * 0.2 : L.H * 0.14 }, titleMotion: TYPE(0.04, 0.14) }),
      ...items.map((t, k) => D(L.tx.x + L.sub * 0.4, y0 + k * step - L.sub * 0.35, L.sub * 0.28, ['coral', 'blue', 'green', 'mustard'][k % 4], { motion: POP(0.24 + k * 0.08, 0.1) })),
      ...items.map((t, k) => T(t, L.tx.x + L.sub * 1.3, y0 + k * step - L.sub * 0.8, { size: r1(L.sub * 1.2), color: 'ink', motion: SLIDE(0.24 + k * 0.08, 'left', L.W * 0.05) })),
      P(f.mark || 'sparkle', L.land ? L.W * 0.8 : L.W * 0.82, L.land ? L.H * 0.3 : L.H * 0.16, L.m * 0.2, { motion: [POP(0.12), { type: 'spin' }] })] };
  }],
  ['cta-pop', 'text', 'A headline, then a button that pops in and pulses.', { title: 'Try it free', subtitle: 'No sign-up, no card.', cta: 'Get started →' }, (L, f) => {
    // on square and tall canvases the words sit a little higher, so the button has room under the subtitle
    const tx = L.land ? L.tx : { ...L.tx, y: L.H * (L.tall ? 0.52 : 0.56), h: L.H * (L.tall ? 0.1 : 0.12) };
    const bw = L.m * (L.land ? 0.42 : 0.6), bh = L.sub * 2.4, bx = tx.x, by = Math.min(tx.y + tx.h + L.sub * 3.4, L.H * 0.95 - bh);
    return { background: 'coral', elements: [
      D(L.art.x, L.art.y, L.art.s * 0.46, 'mustard'), P(f.mark, L.art.x, L.art.y, L.art.s * 0.72, { shadow: true, motion: { type: 'float', amp: L.m * 0.012 } }),
      ...words(L, f, 'paper', { tx }),
      { type: 'block', x: r1(bx), y: r1(by), w: r1(bw), h: r1(bh), color: 'ink', motion: [POP(0.5, 0.12), { type: 'pulse', amp: 0.03, turns: 3 }] },
      T(f.cta || 'Get started →', bx + bw / 2, by + bh * 0.3, { size: r1(L.sub * 0.95), font: 'mono', weight: 700, align: 'center', color: 'paper', motion: FADE(0.56) })] };
  }],
  ['logo-sting', 'mark', 'A disc and the mark pop in, the name types itself, a line fades in.', { title: 'Lale Studio', subtitle: 'Branding · type · print', mark: 'tulip' }, (L, f) => {
    const cy = L.H * (L.land ? 0.4 : 0.4), s = L.m * (L.land ? 0.42 : 0.5);
    return { background: '#4B2FD6', elements: [
      D(L.W / 2, cy, s * 0.62, '#D6E521', { motion: POP(0.03, 0.16) }), P(f.mark, L.W / 2, cy, s, { motion: [POP(0.1, 0.16), { type: 'sway', amp: 5 }] }),
      T(f.title, L.W * 0.1, cy + s * 0.75, { w: r1(L.W * 0.8), h: r1(L.m * 0.13), fit: 'box', font: 'black', align: 'center', color: 'paper', motion: TYPE(0.3, 0.22) }),
      ...(f.subtitle ? [T(f.subtitle.toUpperCase(), L.W / 2, cy + s * 0.75 + L.m * 0.17, { size: r1(L.ky), font: 'mono', weight: 700, tracking: 0.06, align: 'center', color: '#D6E521', motion: FADE(0.6) })] : [])] };
  }],
  ['mark-float', 'mark', 'The mark floats over a breathing disc, the title below.', {}, (L, f) => ({ background: '#E8E2FF', elements: [
    D(L.art.x, L.art.y, L.art.s * 0.5, 'coral', { motion: { type: 'pulse', amp: 0.05 } }), P(f.mark, L.art.x, L.art.y, L.art.s * 0.8, { shadow: true, motion: { type: 'float', amp: L.m * 0.02 } }),
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['mark-draw', 'mark', 'The mark is drawn on line by line, then coloured in.', {}, (L, f) => ({ background: 'paper', elements: [
    P(f.mark, L.art.x, L.art.y, L.art.s, { shadow: true, motion: { type: 'draw', delay: 0.04, dur: 0.42 } }),
    ...words(L, f, 'ink', { titleMotion: FADE(0.45), subMotion: FADE(0.55) })] })],
  ['mark-print', 'mark', 'The mark is printed like a riso run, one ink plate at a time.', {}, (L, f) => ({ background: 'paper', elements: [
    { type: 'panel', x: r1(L.land ? L.W * 0.5 : -20), y: r1(L.land ? -20 : L.H * 0.04), w: r1(L.land ? L.W * 0.52 : L.W + 40), h: r1(L.land ? L.H + 40 : L.H * 0.52), color: 'tone-mustard' },
    P(f.mark, L.art.x, L.art.y, L.art.s * 0.95, { shadow: true, motion: { type: 'print', delay: 0.03, dur: 0.36, shift: L.m * 0.2 } }),
    ...words(L, f, 'ink', { titleMotion: FADE(0.42), subMotion: FADE(0.5) })] })],
  ['seal-spin', 'mark', 'A seal with the mark at its centre turns slowly.', { title: 'Since 2026', subtitle: 'Hand-inked, open source.', mark: 'star' }, (L, f) => ({ background: 'coral', elements: [
    { type: 'seal', x: r1(L.art.x), y: r1(L.art.y), size: r1(L.art.s * 1.05), edge: 'scallop', fill: 'mustard', text: (f.kicker || 'open source').toLowerCase(), prop: f.mark, motion: { type: 'spin' } },
    ...words(L, { ...f, kicker: '' }, 'paper', { titleMotion: null, subMotion: null })] })],
  ['error-wiggle', 'mark', 'A big title and a mark that shakes: 404s, empty states.', { title: '404', subtitle: 'This page wandered off.', mark: 'compass' }, (L, f) => ({ background: 'mustard', elements: [
    D(L.art.x, L.art.y, L.art.s * 0.5, 'paper'), P(f.mark, L.art.x, L.art.y, L.art.s * 0.72, { shadow: true, motion: { type: 'wiggle', amp: 12, turns: 3 } }),
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['confetti-launch', 'scene', 'Confetti falls on a dark card; the mark pops in and the title types.', { title: 'v0.5 is out', kicker: 'Launch' }, (L, f) => ({ background: '#14122B', elements: [
    { type: 'confetti', x: 0, y: 0, w: L.W, h: L.H, spacing: r1(L.m * 0.07) },
    D(L.art.x, L.art.y, L.art.s * 0.48, 'blue', { motion: POP(0.02) }), P(f.mark, L.art.x, L.art.y, L.art.s * 0.76, { shadow: true, motion: [POP(0.08), { type: 'float', amp: L.m * 0.015 }] }),
    ...words(L, f, 'paper', { kickColor: 'mustard' })] })],
  ['rain', 'scene', 'Rain falls past a drifting cloud: weather, mood, a slow day.', { title: 'Rainy Monday', subtitle: 'Stay in, read something.', mark: 'umbrella' }, (L, f) => ({ background: '#DDEBFF', elements: [
    { type: 'confetti', kind: 'rain', x: 0, y: 0, w: L.W, h: L.H, spacing: r1(L.m * 0.05), colors: ['blue'] },
    { type: 'cloud', x: r1(L.art.x), y: r1(L.art.y - L.art.s * 0.45), size: r1(L.art.s * 0.6), drift: r1(L.m * 0.06) },
    P(f.mark, L.art.x, L.art.y + L.art.s * 0.12, L.art.s * 0.6, { motion: { type: 'sway', amp: 5 } }),
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['snow', 'scene', 'Snow falls over a still drawing on pale hills.', { title: '-4°', subtitle: 'Tuesday', mark: 'house' }, (L, f) => ({ background: '#DDEBFF', elements: [
    { type: 'hills', base: L.H, height: r1(L.H * 0.28), color: 'paper' },
    { type: 'confetti', kind: 'stars', x: 0, y: 0, w: L.W, h: L.H, spacing: r1(L.m * 0.08), colors: ['paper', 'blue'] },
    P(f.mark, L.art.x, L.art.y, L.art.s * 0.8, { shadow: true }),
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['night', 'scene', 'Stars blink out of step over dark hills; the moon floats.', { title: 'Good night.', mark: 'moon' }, (L, f) => ({ background: '#14122B', stagger: 0.13, elements: [
    ...[[0.12, 0.15], [0.35, 0.1], [0.55, 0.28], [0.25, 0.4], [0.68, 0.45], [0.9, 0.55], [0.45, 0.6]].map(([x, y], k) => P('star', L.W * x, L.H * y * (L.tall ? 0.7 : 1), L.m * (0.05 + (k % 3) * 0.015), { motion: { type: 'blink', amp: 0.8, turns: 2 } })),
    D(L.W * 0.8, L.H * 0.2, L.m * 0.08, 'paper'), P(f.mark, L.W * 0.8, L.H * 0.2, L.m * 0.13, { motion: { type: 'float', amp: L.m * 0.008 } }),
    { type: 'hills', base: L.H, height: r1(L.H * 0.22), color: 'blue' },
    ...words(L, f, 'paper', { titleMotion: null, subMotion: null, tx: { x: L.W * 0.07, y: L.H * (L.tall ? 0.62 : 0.62), w: L.W * 0.6, h: L.H * (L.land ? 0.14 : 0.07) } })] })],
  ['sunburst', 'scene', 'Rays turn behind the mark; a bright hero for good news.', { title: 'We did it', mark: 'trophy' }, (L, f) => ({ background: 'paper', elements: [
    { type: 'sunburst', x: r1(L.art.x), y: r1(L.art.y), size: r1(L.art.s * 1.4), color: 'mustard' },
    P(f.mark, L.art.x, L.art.y, L.art.s * 0.7, { shadow: true, motion: { type: 'float', amp: L.m * 0.012 } }),
    ...words(L, f, 'ink')] })],
  ['mesh-breathe', 'scene', 'A dark mesh gradient breathes behind a typed title.', { title: 'Calm, then loud.', kicker: 'Gradients' }, (L, f) => ({ background: '#14122B', finish: 'soft', elements: [
    { type: 'meshgrad', x: 0, y: 0, w: L.W, h: L.H, base: '#1B1745', drift: 0.18, colors: ['#FF7A59', '#7A5CFF', '#38D6E8', '#FF4FA3'], grain: 0.08 },
    ...words(L, f, 'paper', { tx: { x: L.tx.x, y: L.land ? L.H * 0.32 : L.H * 0.4, w: L.land ? L.W * 0.7 : L.tx.w, h: L.land ? L.H * 0.3 : L.H * 0.16 } })] })],
  ['ascii-globe', 'scene', 'A globe of text characters turns beside a typed title.', { title: 'One planet, all in text.', kicker: 'World' }, (L, f) => ({ background: 'paper', finish: 'soft', elements: [
    { type: 'glyphfill', shape: 'sphere', x: r1(L.art.x), y: r1(L.art.y), size: r1(L.art.s * 1.05), cell: Math.max(6, r1(L.m * 0.012)), color: 'ink', accent: 'coral', land: 0.42 },
    ...words(L, f, 'ink', { font: 'mono' })] })],
  ['turntable', 'scene', 'The mark as a 3D object, turning once a loop.', { title: 'Winner', mark: 'trophy' }, (L, f) => ({ background: '#FFE3DE', finish: 'soft', elements: [
    { type: 'meshgrad', x: r1(L.art.x), y: r1(L.art.y), r: r1(L.art.s * 0.6), colors: ['#FFB5A3', '#FFD9A0', '#FFE3DE'], grain: 0.06 },
    { type: 'extrude3d', name: f.mark, x: r1(L.art.x), y: r1(L.art.y), size: r1(L.art.s * 0.85), depth: 0.22, spin: 1 },
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['camera-push', 'scene', 'A cover where the view slowly pushes in while the mark floats.', { title: 'Ideas that last', kicker: 'Essay · 6 min', mark: 'lightbulb' }, (L, f) => ({ background: 'paper', camera: { zoom: 1.1 }, elements: [
    { type: 'panel', x: r1(L.art.x - L.art.s * 0.5), y: r1(L.art.y - L.art.s * 0.5), w: r1(L.art.s), h: r1(L.art.s), color: 'blue' },
    { type: 'sunburst', x: r1(L.art.x), y: r1(L.art.y), size: r1(L.art.s), color: 'tone' },
    P(f.mark, L.art.x, L.art.y, L.art.s * 0.66, { shadow: true, motion: { type: 'float', amp: L.m * 0.012 } }),
    ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] })],
  ['bars-grow', 'data', 'Bars rise one after another; the last one is the news.', { title: '+50%', subtitle: 'Signups by month · sample data', values: [3, 5, 4, 7, 6, 9] }, (L, f) => {
    const v = (f.values || [3, 5, 4, 7, 6, 9]).slice(0, 10).map((x) => num(x, 0)), mx = Math.max(1, ...v), n = v.length;
    const x0 = L.W * 0.08, w = L.W * (L.land ? 0.56 : 0.84), top = L.land ? L.H * 0.18 : L.H * 0.34, h = L.land ? L.H * 0.62 : L.H * 0.4, bw = (w / n) * 0.7;
    return { background: 'paper', elements: [
      ...v.map((val, k) => ({ type: 'bars', x: r1(x0 + (w / n) * k), y: r1(top), w: r1(bw), h: r1(h), values: [val], min: 0, max: mx * 1.05, baseline: false, colors: [k === n - 1 ? 'coral' : 'blue'], motion: { type: 'wipe', from: 'down', delay: 0.04 + k * 0.05, dur: 0.18 } })),
      { type: 'block', x: r1(x0 - L.m * 0.01), y: r1(top + h), w: r1(w), h: Math.max(3, r1(L.m * 0.005)), color: 'ink' },
      T(f.title, L.land ? L.W * 0.7 : L.W * 0.08, L.land ? L.H * 0.3 : L.H * 0.12, { w: r1(L.land ? L.W * 0.24 : L.W * 0.5), h: r1(L.land ? L.H * 0.2 : L.H * 0.1), fit: 'box', font: 'black', color: 'coral', motion: POP(0.5, 0.14) }),
      ...(f.subtitle ? [T(f.subtitle, L.land ? L.W * 0.7 : L.W * 0.08, L.land ? L.H * 0.56 : L.H * 0.25, { size: r1(L.sub * 0.8), color: 'ink', w: r1(L.land ? L.W * 0.25 : L.W * 0.84) })] : [])] };
  }],
  ['palette-rise', 'data', 'Brand colour swatches rise one after another, then their codes.', { title: 'Brand inks', inks: ['#1F3A5F', '#E4572E', '#F2C230', '#2E8B57', '#7A5CFF'] }, (L, f) => {
    const inks = (f.inks || []).slice(0, 6), n = Math.max(1, inks.length), x0 = L.W * 0.07, w = L.W * 0.86, gap = w * 0.02, sw = (w - gap * (n - 1)) / n;
    const top = L.H * (L.land ? 0.26 : 0.3), h = L.H * (L.land ? 0.5 : 0.45);
    return { background: 'paper', elements: [
      T((f.title || 'Brand inks').toUpperCase(), x0, L.H * (L.land ? 0.14 : 0.18), { size: r1(L.ky * 1.2), font: 'mono', weight: 700, tracking: 0.06, color: 'ink' }),
      ...inks.map((c, k) => ({ type: 'block', x: r1(x0 + k * (sw + gap)), y: r1(top), w: r1(sw), h: r1(h), color: c, motion: { type: 'wipe', from: 'down', delay: 0.04 + k * 0.07, dur: 0.18 } })),
      ...inks.map((c, k) => T(c.toUpperCase(), x0 + k * (sw + gap) + 4, top + h + L.sub * 0.9, { size: r1(Math.min(L.sub * 0.7, sw / 8)), font: 'mono', color: 'ink', motion: FADE(0.3 + k * 0.05) }))], noInks: true };
  }],
  ['print-run', 'mark', 'Three drawings printed like a riso run, one after another.', { title: 'Every ink, one plate at a time.', extra: ['sailboat', 'bird'], mark: 'lighthouse' }, (L, f) => {
    const ex = f.extra || ['sailboat', 'bird'];
    return { background: 'paper', stagger: 0.06, plateShift: 4, elements: [
      { type: 'panel', x: r1(L.land ? L.W * 0.5 : -20), y: r1(L.land ? -20 : -20), w: r1(L.land ? L.W * 0.52 : L.W + 40), h: r1(L.land ? L.H + 40 : L.H * 0.54), color: 'tone-mustard' },
      P(f.mark, L.art.x - L.art.s * 0.12, L.art.y, L.art.s * 0.9, { shadow: true, motion: { type: 'print', delay: 0.02, dur: 0.34, shift: L.m * 0.24 } }),
      P(ex[0], L.art.x + L.art.s * 0.42, L.art.y + L.art.s * 0.24, L.art.s * 0.45, { motion: { type: 'print', delay: 0.02, dur: 0.34, shift: L.m * 0.24 } }),
      P(ex[1], L.art.x + L.art.s * 0.38, L.art.y - L.art.s * 0.38, L.art.s * 0.3, { motion: { type: 'print', delay: 0.02, dur: 0.34, shift: L.m * 0.24 } }),
      ...words(L, f, 'ink', { titleMotion: null, subMotion: null })] };
  }],
];

export const SHOTS = DEFS.map(([id, group, text, defaults]) => ({ id, group, text, defaults }));
const BY = new Map(DEFS.map((d) => [d[0], d]));

/**
 * The scene for a shot. fields: title, subtitle, kicker, mark (a Folio name), items, values, cta, extra,
 * inks (up to five hex colours: they replace blue, coral, mustard, green and ink everywhere in the shot),
 * format ('cover' default, 'og', 'square', 'story', 'youtube', 'hd', 'readme') or canvas [w, h], seed.
 * Fields you leave out take the shot's own sample, so every shot draws something with no fields at all.
 */
export function shotScene(id, fields = {}) {
  const d = BY.get(id);
  if (!d) throw new Error(`unknown shot "${id}". Shots: ${[...BY.keys()].join(', ')}`);
  const f = { ...SAMPLE, ...d[3], ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v != null && v !== '')) };
  const base = { format: f.format, canvas: f.canvas };
  const cv = resolveCanvas(base);
  const L = layout(cv.w, cv.h);
  const { noInks, ...built } = d[4](L, f);
  const inks = Array.isArray(f.inks) && !noInks ? f.inks : null;
  const style = inks ? Object.fromEntries(['blue', 'coral', 'mustard', 'green', 'ink'].map((k, i) => [k, inks[i]]).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(v || ''))) : undefined;
  return { ...(f.format ? { format: f.format } : {}), ...(f.canvas ? { canvas: f.canvas } : {}), seed: num(f.seed, 7), ...built, ...(style && Object.keys(style).length ? { style } : {}) };
}
