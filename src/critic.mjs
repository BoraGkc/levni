// Cheap layout critic: things a director should fix before a human looks.
// Takes the `used` boxes compose() returns and gives back at most six short notes.
import { W, H } from './style.mjs';

export function critique(used) {
  const notes = [];
  const area = (b) => Math.max(0, b.w) * Math.max(0, b.h);
  for (const b of used) {
    if (!b.crop && (b.x < -20 || b.y < -20 || b.x + b.w > W + 20 || b.y + b.h > H + 20)) {
      if (!['panel', 'crowd', 'skyline', 'draw'].includes(b.type)) notes.push(`${b.type} at (${Math.round(b.x)},${Math.round(b.y)}) runs off the canvas`);
    }
  }
  // objects (not grounds) touching the frame edge by accident: an object cut by < 6 % of its size looks like a mistake
  for (const b of used) {
    if (!['draw', 'icon', 'sheet', 'window', 'disc'].includes(b.type) || b.crop) continue;
    const cutL = -b.x, cutR = b.x + b.w - W, cutT = -b.y, cutB = b.y + b.h - H;
    const worst = Math.max(cutL, cutR, cutT, cutB);
    if (worst > 0 && worst < Math.max(b.w, b.h) * 0.12) notes.push(`${b.type}${b.name ? ` "${b.name}"` : ''} (ink box ${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.w)}×${Math.round(b.h)}) is cut ${Math.round(worst)}px by the frame: pull it in or crop it boldly (set "crop": true)`);
  }
  const ink = used.filter((b) => b.type !== 'panel');
  const mass = (x0, x1) => ink.reduce((s, b) => s + Math.max(0, Math.min(b.x + b.w, x1) - Math.max(b.x, x0)) * b.h, 0);
  const L = mass(0, W / 2), R = mass(W / 2, W);
  if (L + R > 0 && Math.min(L, R) / Math.max(L, R) < 0.35) notes.push(`weight is lopsided (${L > R ? 'left' : 'right'} heavy): balance it or make the empty side intentional`);
  const big = ink.filter((b) => ['icon', 'draw', 'ascii', 'disc', 'shape', 'sheet', 'window', 'crowd', 'isotype', 'skyline'].includes(b.type)).sort((a, b) => area(b) - area(a))[0];
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
