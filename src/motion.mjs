// Per-element motion: any element (a prop, a panel, type, a chart) can carry `motion`, and the scene can carry `camera`.
// Everything here is a pure function of the scene's `t` (0..1), so a frame is as reproducible as a still.
//   { "type": "prop", "name": "rocket", ..., "motion": "float" }
//   { ..., "motion": { "type": "pop", "delay": 0.2, "dur": 0.25, "ease": "outBack" } }
//   { ..., "motion": ["pop", { "type": "sway", "amp": 4 }] }
// Loops: float, drift, sway, wiggle, pulse, spin, orbit, blink run whole cycles per loop, so the last frame meets the first.
// Entrances: pop, fade, slide, wipe, typewriter play once from `delay` for `dur` and then hold. With "out": true they
// leave the same way at the end of the loop, so an intro can loop cleanly.
const { sin, cos, PI, pow, min, max, abs, round } = Math;
const clamp01 = (v) => min(1, max(0, v));
const num = (v, d) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : d);
const f = (v) => String(round(v * 1000) / 1000);

// Penner's easing set, the names every animation tool uses
const outBounce = (x) => { const n = 7.5625, d = 2.75; if (x < 1 / d) return n * x * x; if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75; if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375; return n * (x -= 2.625 / d) * x + 0.984375; };
export const EASE = {
  linear: (x) => x,
  inQuad: (x) => x * x, outQuad: (x) => 1 - (1 - x) * (1 - x), inOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - pow(-2 * x + 2, 2) / 2),
  inCubic: (x) => x * x * x, outCubic: (x) => 1 - pow(1 - x, 3), inOutCubic: (x) => (x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2),
  inQuart: (x) => pow(x, 4), outQuart: (x) => 1 - pow(1 - x, 4), inOutQuart: (x) => (x < 0.5 ? 8 * pow(x, 4) : 1 - pow(-2 * x + 2, 4) / 2),
  inExpo: (x) => (x === 0 ? 0 : pow(2, 10 * x - 10)), outExpo: (x) => (x === 1 ? 1 : 1 - pow(2, -10 * x)),
  inOutSine: (x) => -(cos(PI * x) - 1) / 2,
  inBack: (x) => 2.70158 * x * x * x - 1.70158 * x * x, outBack: (x) => 1 + 2.70158 * pow(x - 1, 3) + 1.70158 * pow(x - 1, 2),
  outElastic: (x) => (x === 0 || x === 1 ? x : pow(2, -10 * x) * sin((x * 10 - 0.75) * ((2 * PI) / 3)) + 1),
  outBounce,
};
export const ease = (name, x) => (EASE[name] || EASE.outCubic)(clamp01(x));

const LOOPS = new Set(['float', 'drift', 'sway', 'wiggle', 'pulse', 'spin', 'orbit', 'blink']);
const ENTRANCES = new Set(['pop', 'fade', 'slide', 'wipe', 'typewriter']);
export const MOTIONS = [...LOOPS, ...ENTRANCES];

// "float" | { type, ... } | [ ... ]  ->  [{ type, ... }], unknown types dropped
export function motionList(m) {
  if (!m) return [];
  return (Array.isArray(m) ? m : [m]).map((x) => (typeof x === 'string' ? { type: x } : x)).filter((x) => x && (LOOPS.has(x.type) || ENTRANCES.has(x.type)));
}

// progress of an entrance at time t: 0 before `delay`, eased 0..1 over `dur`, then 1; with `out`, mirrored at the loop's end
function entered(m, t, stagger) {
  const delay = num(m.delay, 0) + stagger, dur = max(0.001, num(m.dur, 0.25));
  const name = m.ease || (m.type === 'pop' ? 'outBack' : m.type === 'typewriter' || m.type === 'wipe' ? 'linear' : 'outCubic');
  const tin = (t - delay) / dur;
  if (!m.out) return { p: ease(name, tin), raw: clamp01(tin) };
  const tout = (1 - t - num(m.outDelay, 0)) / dur;
  return { p: ease(name, min(tin, tout)), raw: clamp01(min(tin, tout)) };
}

// Typewriter changes the text itself, before the element is drawn. Returns the element to draw (or null for "nothing yet").
export function typedElement(e, t, index = 0, stagger = 0) {
  const m = motionList(e.motion).find((x) => x.type === 'typewriter');
  if (!m || typeof e.text !== 'string') return e;
  const chars = Array.from(e.text);
  const { raw } = entered({ ...m, dur: num(m.dur, min(0.6, chars.length * 0.02)) }, t, index * stagger);
  const n = round(raw * chars.length);
  const cursor = m.cursor === false || raw >= 1 && m.cursor !== 'stay' ? '' : (typeof m.cursor === 'string' && m.cursor !== 'stay' ? m.cursor : '|');
  // the caret blinks while it waits; a fixed number of blinks per loop keeps frames deterministic
  const blinkOn = raw > 0 && raw < 1 ? true : Math.floor(t * num(m.blinks, 8)) % 2 === 0;
  const text = chars.slice(0, n).join('') + (cursor && blinkOn ? cursor : '');
  if (!text) return null;
  // `fit: "box"` would re-size the text as it grows: lay it out once at full length and keep that size
  return { ...e, text, _typed: e.text };
}

/**
 * Wrap an element's SVG in the transform its motions ask for at time t.
 * box: [x, y, w, h] of what was drawn (pivot and wipe area); index: the element's place among moving elements (stagger).
 */
export function applyMotion(svg, motion, t, box, { index = 0, stagger = 0, id = 'm' } = {}) {
  const list = motionList(motion);
  if (!list.length || !svg) return svg;
  const [bx, by, bw, bh] = box;
  const cx = bx + bw / 2, cy = by + bh / 2;
  const tf = []; // applied outermost first
  let opacity = 1, clip = null;
  const TAU = PI * 2;
  for (const m of list) {
    const turns = max(1, round(num(m.turns, m.type === 'wiggle' ? 4 : 1))); // whole cycles only: the loop must close
    const ph = (num(m.phase, 0) + index * stagger) * TAU, a = t * turns * TAU + ph;
    const px = m.pivot === 'bottom' || (m.type === 'sway' && !m.pivot) ? cx : cx, py = m.pivot === 'bottom' || (m.type === 'sway' && !m.pivot) ? by + bh : m.pivot === 'top' ? by : cy;
    if (m.type === 'float') tf.push(`translate(0 ${f(-num(m.amp, 10) * sin(a))})`);
    else if (m.type === 'drift') tf.push(`translate(${f(num(m.amp, 16) * sin(a))} 0)`);
    else if (m.type === 'orbit') tf.push(`translate(${f(num(m.amp, 10) * cos(a))} ${f(num(m.amp, 10) * sin(a))})`);
    else if (m.type === 'sway') tf.push(`rotate(${f(num(m.amp, 3) * sin(a))} ${f(px)} ${f(py)})`);
    else if (m.type === 'wiggle') tf.push(`rotate(${f(num(m.amp, 2.5) * sin(a))} ${f(px)} ${f(py)})`);
    else if (m.type === 'spin') tf.push(`rotate(${f(((t * turns + num(m.phase, 0) + index * stagger) * 360 * (m.reverse ? -1 : 1)) % 360)} ${f(cx)} ${f(cy)})`);
    else if (m.type === 'pulse') { const s = 1 + num(m.amp, 0.05) * sin(a); tf.push(`translate(${f(cx)} ${f(cy)}) scale(${f(s)}) translate(${f(-cx)} ${f(-cy)})`); }
    else if (m.type === 'blink') opacity *= 1 - clamp01(num(m.amp, 0.6)) * (0.5 - 0.5 * cos(a));
    else {
      const { p, raw } = entered(m, t, index * stagger);
      if (raw >= 1 && Math.abs(p - 1) < 1e-6) continue; // arrived: the element is drawn exactly as a still would draw it
      if (m.type === 'pop') { if (raw <= 0) return ''; tf.push(`translate(${f(cx)} ${f(cy)}) scale(${f(max(0.001, p))}) translate(${f(-cx)} ${f(-cy)})`); }
      else if (m.type === 'fade') { if (raw <= 0) return ''; opacity *= clamp01(p); }
      else if (m.type === 'slide') {
        if (raw <= 0) return '';
        const d = num(m.distance, 60), from = m.from || 'down';
        const [dx, dy] = from === 'left' ? [-d, 0] : from === 'right' ? [d, 0] : from === 'up' ? [0, -d] : [0, d];
        tf.push(`translate(${f(dx * (1 - p))} ${f(dy * (1 - p))})`);
        opacity *= clamp01(raw * 2.5);
      } else if (m.type === 'wipe') {
        if (raw <= 0) return '';
        const pad = 12, from = m.from || 'left', W = bw + pad * 2, H = bh + pad * 2;
        clip = from === 'right' ? [bx - pad + W * (1 - p), by - pad, W * p, H] : from === 'up' ? [bx - pad, by - pad, W, H * p] : from === 'down' ? [bx - pad, by - pad + H * (1 - p), W, H * p] : [bx - pad, by - pad, W * p, H];
      }
    }
  }
  if (!tf.length && opacity === 1 && !clip) return svg;
  let s = svg;
  if (clip) s = `<clipPath id="${id}"><rect x="${f(clip[0])}" y="${f(clip[1])}" width="${f(max(0, clip[2]))}" height="${f(max(0, clip[3]))}"/></clipPath><g clip-path="url(#${id})">${s}</g>`;
  return `<g${tf.length ? ` transform="${tf.join(' ')}"` : ''}${opacity < 1 ? ` opacity="${f(opacity)}"` : ''}>${s}</g>`;
}

// spec.camera: { zoom: 1.12 | [from, to], x: [from, to], y: [from, to], ease, once }. The whole drawing (not the title layer)
// moves under a fixed frame. By default the move goes out and comes back within the loop; `once: true` plays it one way.
export function cameraTransform(cam, t, canvas) {
  if (!cam || typeof cam !== 'object') return '';
  const pair = (v, d) => (Array.isArray(v) ? [num(v[0], d), num(v[1], d)] : [d, num(v, d)]);
  const k = ease(cam.ease || 'inOutSine', cam.once ? t : 1 - abs(2 * t - 1));
  const [z0, z1] = pair(cam.zoom, 1), [x0, x1] = pair(cam.x, 0), [y0, y1] = pair(cam.y, 0);
  const z = max(0.05, z0 + (z1 - z0) * k), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k;
  if (z === 1 && x === 0 && y === 0) return '';
  const cx = canvas.w / 2, cy = canvas.h / 2;
  return `translate(${f(cx)} ${f(cy)}) scale(${f(z)}) translate(${f(-cx - x)} ${f(-cy - y)})`;
}
