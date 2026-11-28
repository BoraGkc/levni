// The motion catalogue (/motion/): one small loop per motion preset, camera move, easing and self-moving element.
// Every entry is a 640 x 400 scene built here; this script writes public/motion/<id>.webp (still), <id>-loop.webp
// and src/data/motion.json (id, group, title, text, the snippet that makes the motion, the full scene).
//   node scripts/render-motion.mjs            (only entries whose files are missing)
//   node scripts/render-motion.mjs --force    (all)      --only <id>
import { writeFileSync, existsSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { compose } from '../../src/index.mjs';
import { animate } from '../../src/animate.mjs';
import { rasterize } from '../../src/raster.mjs';
import { lensRaster } from '../../src/lens.mjs';

const here = (p) => new URL(`../${p}`, import.meta.url).pathname;
const force = process.argv.includes('--force');
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const W = 640, H = 400;
const GROUNDS = ['#F3F1EA', '#E8E2FF', '#FFF1D6', '#E2F2EA', '#FFE3DE', '#DDEBFF'];
const label = (t, color = 'ink') => ({ type: 'type', text: t, x: 30, y: 44, size: 15, font: 'mono', weight: 700, tracking: 0.06, color });
const base = (i, elements, extra = {}) => ({ canvas: [W, H], seed: 3 + i, finish: 'soft', grain: 0.01, background: GROUNDS[i % GROUNDS.length], elements, ...extra });
const disc = (color, r = 120, x = W / 2, y = H / 2 + 10) => ({ type: 'disc', x, y, r, color });
const prop = (name, motion, o = {}) => ({ type: 'prop', name, x: W / 2, y: H / 2 + 10, size: 190, shadow: true, ...(motion ? { motion } : {}), ...o });

// [id, group, title, text, snippet (what to copy), scene]
const E = [];
const add = (id, group, title, text, snippet, scene) => E.push({ id, group, title, text, snippet, scene });

// --- loops: whole cycles per loop, so the last frame meets the first
const loops = [
  ['float', 'rocket', 'mustard', { type: 'float', amp: 22 }, 'Rises and falls.'],
  ['drift', 'sailboat', 'blue', { type: 'drift', amp: 60 }, 'Slides left and right.'],
  ['orbit', 'bird', 'coral', { type: 'orbit', amp: 26 }, 'Moves on a small circle.'],
  ['sway', 'tulip', 'green', { type: 'sway', amp: 16 }, 'Rocks about its base.'],
  ['wiggle', 'bell', 'mustard', { type: 'wiggle', amp: 15 }, 'Shakes, four times a loop.'],
  ['pulse', 'heart', 'coral', { type: 'pulse', amp: 0.22 }, 'Breathes in size.'],
  ['spin', 'compass', 'blue', { type: 'spin' }, 'Turns once a loop.'],
  ['blink', 'lightbulb', 'mustard', { type: 'blink', amp: 0.85, turns: 2 }, 'Fades and returns.'],
];
loops.forEach(([m, name, ink, motion, text], i) => add(m, 'loops', m, text, { motion },
  base(i, [label(`"motion": "${m}"`), disc(ink), prop(name, motion)])));

// --- entrances: play once from `delay` for `dur`, then hold
const ent = [
  ['pop', 'gift', 'coral', { type: 'pop', delay: 0.1, dur: 0.3 }, 'Grows from nothing with a small overshoot.'],
  ['fade', 'moon', 'blue', { type: 'fade', delay: 0.1, dur: 0.35 }, 'Fades in.'],
  ['slide-up', 'trophy', 'mustard', { type: 'slide', from: 'down', distance: 90, delay: 0.1, dur: 0.3 }, 'Slides in from below.'],
  ['slide-left', 'bicycle', 'green', { type: 'slide', from: 'left', distance: 160, delay: 0.1, dur: 0.3 }, 'Slides in from the left.'],
  ['wipe', 'lighthouse', 'blue', { type: 'wipe', from: 'left', delay: 0.1, dur: 0.4 }, 'Is uncovered from one side.'],
];
ent.forEach(([id, name, ink, motion, text], i) => add(id, 'entrances', id.replace('-', ' '), text, { motion },
  base(i + 2, [label(`"type": "${motion.type}"`), disc(ink), prop(name, { ...motion, out: true, outDelay: 0.08 })])));
add('typewriter', 'entrances', 'typewriter', 'Text is typed, with a caret.', { motion: { type: 'typewriter', delay: 0.08, dur: 0.45, cursor: '_' } },
  base(5, [label('"type": "typewriter"'), { type: 'type', text: 'Hello, world.', x: 40, y: 150, w: 560, h: 120, fit: 'box', font: 'black', color: 'ink', motion: { type: 'typewriter', delay: 0.08, dur: 0.45, cursor: '_' } }]));

// --- combinations
add('pop-float', 'combos', 'pop + float', 'An entrance, then a loop: arrives, then keeps moving.', { motion: ['pop', { type: 'float', amp: 14 }] },
  base(0, [label('["pop", "float"]'), disc('blue'), prop('rocket', [{ type: 'pop', delay: 0.05, dur: 0.25 }, { type: 'float', amp: 14 }])]));
add('headline', 'combos', 'headline', 'The title types itself, the line under it slides in.', { motion: { type: 'typewriter' } },
  base(1, [label('typewriter + slide'), { type: 'type', text: 'Launch day', x: 40, y: 130, w: 560, h: 110, fit: 'box', font: 'black', color: 'ink', motion: { type: 'typewriter', delay: 0.05, dur: 0.35, cursor: '_' } },
    { type: 'type', text: 'Version 2 is out. Read what changed.', x: 44, y: 300, size: 24, color: 'ink', motion: { type: 'slide', from: 'down', distance: 30, delay: 0.5, dur: 0.18 } }]));
const row = ['coffee-cup', 'camera', 'headphones', 'pizza-slice', 'umbrella'];
add('stagger-in', 'combos', 'stagger in', 'Each element arrives a little after the one before.', { stagger: 0.08, motion: 'pop' },
  base(2, [label('"stagger": 0.08'), ...row.map((n, k) => prop(n, { type: 'pop', delay: 0.05, dur: 0.18, out: true, outDelay: 0.06 }, { x: 80 + k * 120, size: 100 }))], { stagger: 0.08 }));
add('stagger-wave', 'combos', 'stagger wave', 'The same loop out of step: a wave along a row.', { stagger: 0.1, motion: { type: 'float' } },
  base(3, [label('"stagger": 0.1 + float'), ...row.map((n, k) => prop(n, { type: 'float', amp: 20 }, { x: 80 + k * 120, size: 100 }))], { stagger: 0.1 }));
add('in-and-out', 'combos', 'in and out', 'With "out": true an entrance leaves the same way, so the loop restarts cleanly.', { motion: { type: 'slide', out: true } },
  base(4, [label('"out": true'), disc('coral'), prop('envelope', { type: 'slide', from: 'left', distance: 200, delay: 0.05, dur: 0.22, out: true, outDelay: 0.05 })]));

// --- camera: the drawing moves under a fixed frame; the title layer stays put
const city = (i, camera) => base(i, [{ type: 'panel', x: -20, y: 250, w: 700, h: 200, color: 'green' }, { type: 'cloud', x: 160, y: 110, size: 120 }, { type: 'cloud', x: 470, y: 80, size: 90 },
  prop('house', null, { x: 200, y: 240, size: 170 }), prop('tree', null, { x: 360, y: 250, size: 150 }), prop('lighthouse', null, { x: 500, y: 220, size: 190 })], { camera });
add('camera-zoom', 'camera', 'zoom', 'Pushes in and comes back within the loop.', { camera: { zoom: 1.25 } }, city(0, { zoom: 1.25 }));
add('camera-pan', 'camera', 'pan', 'Moves sideways and comes back.', { camera: { x: [-60, 60], zoom: 1.15 } }, city(1, { x: [-60, 60], zoom: 1.15 }));
add('camera-once', 'camera', 'zoom once', 'One way only, for an intro: starts wide, ends close.', { camera: { zoom: [1, 1.35], y: [0, -30], once: true } }, city(2, { zoom: [1, 1.35], y: [0, -30], once: true }));

// --- easing: the same slide with different curves, side by side
const EASES = ['linear', 'outCubic', 'inOutCubic', 'outBack', 'outElastic', 'outBounce'];
add('easing', 'easing', 'easing', 'The same slide, six curves. Pick one with "ease".', { motion: { type: 'slide', ease: 'outBack' } },
  base(0, [label('"ease": …'), ...EASES.flatMap((e, k) => [
    { type: 'type', text: e, x: 30, y: 98 + k * 50, size: 15, font: 'mono', color: 'ink' },
    { type: 'disc', x: 480, y: 92 + k * 50, r: 15, color: ['blue', 'coral', 'green', 'mustard', 'blue', 'coral'][k], motion: { type: 'slide', from: 'left', distance: 300, delay: 0.1, dur: 0.5, ease: e, out: true, outDelay: 0.05 } }])]));

// --- elements that move by themselves (they follow t)
const self = [
  ['cloud', 'clouds drift', { type: 'cloud', x: 320, y: 200, size: 230, drift: 150 }, 'A cloud with "drift" slides and comes back.'],
  ['flag', 'flag', { type: 'flag', x: 230, y: 110, w: 220, h: 130, canton: 'blue' }, 'One wave travels along it.'],
  ['confetti', 'confetti', { type: 'confetti', x: 0, y: 0, w: 640, h: 400, spacing: 40 }, 'One full fall per loop.'],
  ['rain', 'rain', { type: 'confetti', kind: 'rain', x: 0, y: 0, w: 640, h: 400, spacing: 30, colors: ['blue'] }, 'The same element as rain.'],
  ['sunburst', 'sunburst', { type: 'sunburst', x: 320, y: 210, size: 280, color: 'mustard' }, 'The rays turn.'],
  ['rose', 'rose', { type: 'rose', x: 320, y: 210, size: 260, petals: 5 }, 'Turns one petal a loop.'],
  ['flowfield', 'flowfield', { type: 'flowfield', x: 20, y: 60, w: 600, h: 320, colors: ['blue', 'coral'] }, 'The field shifts in a small circle.'],
  ['halftone', 'halftone', { type: 'halftone', x: 20, y: 60, w: 600, h: 320, color: 'coral', mode: 'radial' }, 'The dots breathe.'],
  ['meshgrad', 'mesh gradient', { type: 'meshgrad', x: 0, y: 0, w: 640, h: 400, drift: 0.2, colors: ['#FF7A59', '#7A5CFF', '#38D6E8', '#FF4FA3'], base: '#1B1745' }, 'Each blob moves on its own circle.'],
  ['globe', 'ASCII globe', { type: 'glyphfill', shape: 'sphere', x: 320, y: 215, size: 300, cell: 8, color: 'ink', accent: 'coral', land: 0.42 }, 'A glyph sphere turns once.'],
  ['extrude3d', '3D turn', { type: 'extrude3d', name: 'rocket', x: 320, y: 215, size: 240, depth: 0.2, spin: 1 }, 'A drawing as a 3D object, "spin": 1.'],
  ['ribbon', 'ribbon', { type: 'ribbon', circle: [320, 215, 130], width: 70, colors: ['#4B2FD6', '#FF3A44', '#D6E521'], twists: 2, closed: true }, 'The twist travels along the band.'],
  ['spiro', 'spiro draw-on', { type: 'spiro', x: 320, y: 215, size: 280, animate: true }, 'Draws itself in once.'],
  ['dotline', 'dot lines', { type: 'dotline', prop: 'rocket', x: 320, y: 220, size: 290, cell: 6, color: '#4B2FD6', muted: '#A7A2BE', shimmer: 0.6 }, 'A brightness wave runs over the dots, "shimmer": 0.6.'],
];
self.forEach(([id, title, el, text], i) => add(id, 'movers', title, text, el,
  base(i, [label(id, id === 'meshgrad' ? 'paper' : 'ink'), el], id === 'meshgrad' ? { background: '#1B1745', _opt: { quality: 94, cap: 520e3, frames: 24 } } : id === 'halftone' || id === 'rain' || id === 'flowfield' ? { _opt: { frames: 18 } } : {})));

// --- the glass lens: a scene-level raster pass that slides once up and back over t
const lensSpec = { x: 320, y: 215, w: 400, h: 92, move: [0, 80], icon: true, label: 'Rocket', kbd: '⌘K' };
add('lens', 'movers', 'glass lens', 'A glass search bar slides over the drawing and bends it.', { lens: lensSpec },
  { canvas: [W, H], seed: 11, finish: 'soft', grain: 0.01, background: '#0B0B0C', lens: lensSpec, elements: [label('lens', 'paper'),
    { type: 'dotline', prop: 'rocket', x: 320, y: 220, size: 300, cell: 7, color: '#D6E521', muted: '#4E4E57', faint: '#18181B', shimmer: 0.4 }] });

// --- boil: the crayon filter's seed steps, a hand-drawn shimmer on a still drawing
add('boil', 'boil', 'boil', 'A still drawing that shimmers: crayon textures take turns.', { boil: 3 },
  { canvas: [W, H], seed: 9, background: 'paper', elements: [label('--boil 3'), disc('mustard'), prop('cat')], _boil: 3 });

// render
const out = [];
for (const e of E) {
  if (only && e.id !== only) { out.push(e); continue; }
  const still = here(`public/motion/${e.id}.webp`), loop = here(`public/motion/${e.id}-loop.webp`);
  const { _boil, _opt = {}, ...scene } = e.scene;
  if (force || !existsSync(loop)) {
    const t0 = Date.now();
    const at = e.group === 'entrances' || e.group === 'combos' || e.id === 'spiro' || e.id === 'easing' ? 0.6 : 0;
    let png = await rasterize((await compose({ ...scene, t: at })).svg);
    if (scene.lens) png = await lensRaster(png, scene.lens, at);
    await sharp(png).resize(480).webp({ quality: 82 }).toFile(still);
    let q = _opt.quality ?? 80, r;
    for (;;) { r = await animate(scene, loop, { frames: _opt.frames ?? 30, fps: 15, width: 480, boil: _boil || 0, quality: q }); if (r.bytes < (_opt.cap ?? 300e3) || q <= 50) break; q -= 8; }
    console.log(`${e.id.padEnd(12)} ${Math.round(r.bytes / 1024)} KB ${r.moving ? '' : 'STILL!'} ${Date.now() - t0} ms ${r.notes.filter((n) => !/focal|lopsided/.test(n)).join('; ')}`);
  }
  out.push({ ...e, scene, kb: Math.round(statSync(loop).size / 1024) });
}
writeFileSync(here('src/data/motion.json'), JSON.stringify(out.map(({ id, group, title, text, snippet, scene, kb }) => ({ id, group, title, text, snippet, scene, kb })), null, 1));
console.log(`${out.length} entries`);
