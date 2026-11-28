// Cheap layout critic: things a director should fix before a human looks.
// Takes the `used` boxes compose() returns and gives back at most six short notes.
import { W as W0, H as H0 } from './style.mjs';

// soft 3D shapes bleed on purpose (their boxes are clipped to the canvas) and count as focal objects
const SOFT3D = ['soft3d', 'ribbon3d', 'tube3d', 'torus3d', 'sphere3d', 'capsule3d', 'blob3d', 'cubes3d', 'extrude3d'];

export function critique(used, canvas = { w: W0, h: H0 }) {
  const W = canvas.w, H = canvas.h;
  const notes = [];
  const area = (b) => Math.max(0, b.w) * Math.max(0, b.h);
  // the frame is the clip card when the scene has one, else the canvas
  const [fx, fy, fw, fh] = used.frame || [0, 0, W, H];
  const OBJECTS = ['draw', 'icon', 'sheet', 'window', 'disc'];
  for (const b of used) {
    if (b.crop || OBJECTS.includes(b.type) || ['panel', 'crowd', 'skyline', 'ribbon', 'tube', ...SOFT3D].includes(b.type)) continue;
    if (b.x < fx - 20 || b.y < fy - 20 || b.x + b.w > fx + fw + 20 || b.y + b.h > fy + fh + 20) notes.push(`${b.type} at (${Math.round(b.x)},${Math.round(b.y)}) runs off the ${used.frame && (fx || fy) ? 'card' : 'canvas'}`);
  }
  // objects cut by the frame without "crop": true. A sliver looks like a mistake; a big cut hides the subject.
  for (const b of used) {
    if (!OBJECTS.includes(b.type) || b.crop || !(b.w > 0 && b.h > 0)) continue;
    const cutL = fx - b.x, cutR = b.x + b.w - (fx + fw), cutT = fy - b.y, cutB = b.y + b.h - (fy + fh);
    const worst = Math.max(cutL, cutR, cutT, cutB);
    if (worst <= 0) continue;
    const vw = Math.max(0, Math.min(b.x + b.w, fx + fw) - Math.max(b.x, fx)), vh = Math.max(0, Math.min(b.y + b.h, fy + fh) - Math.max(b.y, fy));
    const shown = Math.round((100 * vw * vh) / area(b));
    const what = `${b.type}${b.name ? ` "${b.name}"` : ''} (ink box ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)})`;
    if (worst < Math.max(b.w, b.h) * 0.12) notes.push(`${what} is cut ${Math.round(worst)}px by the frame: pull it in or crop it boldly (set "crop": true)`);
    else if (shown < 60) notes.push(`${what} is mostly outside the frame, only ${shown}% shows: move it in, or set "crop": true if the cut is the idea`);
    else notes.push(`${what} is cut by the frame, ${shown}% shows: pull it in, or set "crop": true if the cut is deliberate`);
  }
  const ink = used.filter((b) => b.type !== 'panel');
  const mass = (x0, x1) => ink.reduce((s, b) => s + Math.max(0, Math.min(b.x + b.w, x1) - Math.max(b.x, x0)) * b.h, 0);
  const L = mass(0, W / 2), R = mass(W / 2, W);
  if (L + R > 0 && Math.min(L, R) / Math.max(L, R) < 0.35) notes.push(`weight is lopsided (${L > R ? 'left' : 'right'} heavy): balance it or make the empty side intentional`);
  const big = ink.filter((b) => ['icon', 'draw', 'ascii', 'disc', 'shape', 'sheet', 'window', 'crowd', 'isotype', 'dotline', 'skyline', 'bars', 'linechart', 'pie', 'donut', 'isochart', ...SOFT3D].includes(b.type)).sort((a, b) => area(b) - area(a))[0];
  if (!big || area(big) < 200 * 200) notes.push('no clear focal symbol: one element should be at least ~220px');
  const icons = used.filter((b) => b.type === 'icon');
  for (let i = 0; i < icons.length; i++) for (let j = i + 1; j < icons.length; j++) {
    const a = icons[i], b = icons[j];
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (ox > 0 && oy > 0 && (ox * oy) / Math.min(area(a), area(b)) > 0.35) notes.push(`two icons overlap heavily near (${Math.round(a.x)},${Math.round(a.y)})`);
  }
  // group repeats (trees in a loop) and cap, so the director reads a short list
  const counts = new Map();
  for (const n of notes) { const key = n.replace(/\(\-?\d+,\-?\d+\)/g, '(…)'); counts.set(key, (counts.get(key) || 0) + 1); }
  return [...counts].slice(0, 6).map(([n, k]) => (k > 1 ? `${n} ×${k}` : n));
}
