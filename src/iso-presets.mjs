// One-line iso worlds: `"preset": "room" | "desk" | "street" | "city" | "cafe" | "office" | "classroom"`.
// Each preset is a small seeded generator that lays out a plausible scene as ordinary iso objects (with ids, so a
// scene can override or remove any of them), plus a default diorama base. `palette` picks the colour roles.
import { rng } from './style.mjs';

// Colour roles. House colour names stay names (style packs recolour them); the rest are hex or kit names.
export const PALETTES = {
  house: {
    floor: 'paper', walls: [['tone', 'blue'], ['paper', 'tone'], ['tone-coral', 'paper'], ['white', 'tone-green']], wall: 'tone', wallCap: 'paper',
    accent: ['coral', 'mustard', 'blue', 'green'], rugs: ['coral', 'mustard', 'tone', 'tone-green'], sofa: 'coral', counter: 'coral',
    wood: 'wood', trunk: 'soil-dark', grass: 'grass', grass2: '#5DB277', soil: 'soil', soil2: 'soil-dark', stone: 'stone', path: 'stone',
    road: 'asphalt', water: 'tone', glass: 'glass', beyond: 'tone', light: 'light', metal: 'ink', door: 'coral', baseTop: 'grass',
    foliage: ['green', '#5DB277', 'grass'], roofs: ['coral', 'blue', 'mustard'], buildings: ['paper', 'tone', 'white', 'tone-mustard', 'tone-coral'],
    pots: ['coral', 'mustard', 'blue', 'paper'], people: ['paper', 'tone', 'coral', 'mustard', 'white'], cars: ['coral', 'mustard', 'blue', 'white'],
  },
  pastel: {
    floor: '#F5ECDF', walls: [['#C9DDF0', '#F7D3C9'], ['#F3E6C8', '#CFE7D6'], ['#E6DDF7', '#F7D3C9']], wall: '#C9DDF0', wallCap: '#FFF9F0',
    accent: ['#F4A38C', '#F7D57A', '#9ED3B0', '#A8B8F0'], rugs: ['#F4A38C', '#F7D57A', '#A8B8F0', '#9ED3B0'], sofa: '#A8B8F0', counter: '#F4A38C',
    wood: '#E3B98F', trunk: '#B98B6A', grass: '#A9DDA0', grass2: '#8CCB86', soil: '#E8B08A', soil2: '#C98E6B', stone: '#E9E1D3', path: '#EFE6D6',
    road: '#8C93A8', water: '#9CC9F0', glass: '#DCEBFB', beyond: '#DCEBFB', light: '#FFF0B8', metal: '#6C7A99', door: '#F4A38C', baseTop: '#A9DDA0',
    foliage: ['#8FD19E', '#A9DDA0', '#7FC4A0'], roofs: ['#F4A38C', '#A8B8F0', '#F7D57A'], buildings: ['#FBEFE3', '#CFE3F3', '#F8D9CF', '#FFF1C9', '#DDF0E2'],
    pots: ['#F4A38C', '#F7D57A', '#A8B8F0', '#FFFFFF'], people: ['#FFFFFF', '#F7D57A', '#F4A38C', '#A8B8F0', '#9ED3B0'], cars: ['#F4A38C', '#A8B8F0', '#F7D57A'],
  },
  // calm, blue only: for hard news (props switch to their blue palette too)
  blue: {
    floor: 'paper', walls: [['tone', 'blue'], ['#A9C3F5', 'tone']], wall: 'tone', wallCap: 'paper',
    accent: ['blue', 'tone', '#A9C3F5'], rugs: ['tone', '#A9C3F5'], sofa: 'blue', counter: 'blue',
    wood: '#A9C3F5', trunk: '#2D63C9', grass: '#A9C3F5', grass2: '#7FA6F2', soil: '#5B8DEB', soil2: '#2D63C9', stone: '#D8E2F5', path: '#D8E2F5',
    road: '#2D63C9', water: 'tone', glass: '#D8E2F5', beyond: '#D8E2F5', light: '#D8E2F5', metal: 'ink', door: 'blue', baseTop: '#A9C3F5',
    foliage: ['tone', '#5B8DEB', '#A9C3F5'], roofs: ['blue', 'ink'], buildings: ['paper', 'tone', '#A9C3F5', 'white'],
    pots: ['blue', 'paper', 'tone'], people: ['paper', 'tone', 'white'], cars: ['tone', 'blue', 'white'],
  },
  // warm evening light
  warm: {
    floor: '#F3DFC1', walls: [['#F2B880', '#E9806B'], ['#F6D5A7', '#E9A17B']], wall: '#F2B880', wallCap: '#FFF1DC',
    accent: ['coral', 'mustard', '#7A9E7E', '#4A6FA5'], rugs: ['#4A6FA5', 'coral', '#7A9E7E'], sofa: '#4A6FA5', counter: '#7A9E7E',
    wood: '#B97A4E', trunk: '#7A4A2E', grass: '#9CC77A', grass2: '#7DAF5E', soil: '#C77B4B', soil2: '#8E5232', stone: '#E6D3B8', path: '#EADBC4',
    road: '#6B5E73', water: '#6FA8DC', glass: '#FFE2A6', beyond: '#FFE2A6', light: '#FFD27A', metal: '#4A3B52', door: '#4A6FA5', baseTop: '#9CC77A',
    foliage: ['#7DAF5E', '#9CC77A', '#5E9150'], roofs: ['#E9806B', '#4A6FA5', '#B97A4E'], buildings: ['#F6E3C6', '#F2B880', '#F6D5A7', '#E9C7A5'],
    pots: ['coral', 'mustard', '#4A6FA5', '#FFF4E2'], people: ['#FFF4E2', 'mustard', 'coral', '#7A9E7E'], cars: ['coral', '#4A6FA5', 'mustard'],
  },
};
export const PRESET_NAMES = ['room', 'desk', 'street', 'city', 'cafe', 'office', 'classroom'];

const strHash = (s) => [...s].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function buildPreset(name, { seed = 1, palette }) {
  const gen = GENERATORS[name];
  if (!gen) throw new Error(`iso preset "${name}" is unknown (use ${PRESET_NAMES.join(', ')})`);
  const r = rng((seed * 7919 + strHash(name)) >>> 0);
  const pal = palette;
  let n = 0;
  const objects = [];
  const add = (o) => { const id = o.id ?? `${o.kind}-${++n}`; objects.push({ ...o, id }); return o; };
  const res = gen(r, pal, add) || {};
  return { objects, base: res.base ?? true };
}

const POSES_STAND = ['standing', 'waving', 'phone', 'reading', 'holding', 'pointing', 'thinking'];
const PROPS_DESK = ['laptop', 'monitor'];

// ------------------------------------------------------------------ indoor rooms
function room(r, pal, add, o = {}) {
  const W = o.W ?? 340, D = o.D ?? 320, H = o.H ?? 210;
  const [wa, wb] = o.walls ?? r.pick(pal.walls);
  add({ id: 'floor', kind: 'floor', x: 0, y: 0, w: W, d: D, color: o.floor ?? pal.floor, pattern: o.pattern ?? r.pick(['boards', 'boards', 'tiles']), step: o.step ?? 40 });
  const back = add({ id: 'wall-back', kind: 'wall', axis: 'x', x: 0, y: 0, w: W, h: H, color: wa, windows: o.backWindows ?? [{ u: r.range(112, 136), v: 70, w: 100, h: 90 }], light: true });
  const left = add({ id: 'wall-left', kind: 'wall', axis: 'y', x: 0, y: 0, d: D, h: H, color: wb, ...(o.leftOpening ?? (r.chance(0.5) ? { arch: [D - 110, 62, 140] } : { windows: [{ u: D - 140, v: 70, w: 80, h: 90 }] })) });
  return { W, D, H, back, left };
}

const GENERATORS = {
  room(r, pal, add) {
    const layout = r.pick(['lounge', 'study', 'bedroom']);
    const { W } = room(r, pal, add);
    const pot = () => r.pick(pal.pots);
    add({ id: 'rug', kind: 'rug', x: 120, y: 130, w: 170, d: 140, shape: r.pick(['rect', 'round']), color: r.pick(pal.rugs), pattern: 'stripes' });
    if (layout === 'lounge') {
      add({ id: 'sofa', kind: 'sofa', x: 16, y: 110, facing: '+x', color: r.pick([pal.sofa, ...pal.accent.slice(0, 2)]) });
      add({ id: 'table', kind: 'table', x: 120, y: 150, w: 70, d: 70, h: 30, shape: 'round' });
      add({ id: 'mug', kind: 'prop', name: r.pick(['mug', 'coffee-cup']), x: 150, y: 180, z: 30, size: 26, contact: false });
      add({ id: 'lamp', kind: 'prop', name: 'floor-lamp', x: 40, y: 60, size: 160 });
      add({ id: 'art', kind: 'frame', wall: 'x', x: 58, z: 140, w: 70, h: 50, art: r.pick(['hills', 'blob']) });
      add({ id: 'clock', kind: 'clock', wall: 'y', y: 90, z: 165, r: 14 });
    } else if (layout === 'study') {
      add({ id: 'desk', kind: 'desk', x: 28, y: 16, w: 120, d: 58 });
      add({ id: 'laptop', kind: 'prop', name: 'laptop', x: 78, y: 42, z: 60, size: 56, contact: false });
      add({ id: 'mug', kind: 'prop', name: 'mug', x: 124, y: 36, z: 60, size: 22, contact: false });
      add({ id: 'desk-lamp', kind: 'prop', name: 'lamp', x: 42, y: 30, z: 60, size: 50, contact: false });
      add({ id: 'chair', kind: 'chair', x: 70, y: 94, facing: '-y' });
      add({ id: 'art', kind: 'frame', wall: 'y', y: 110, z: 140, w: 70, h: 48, art: r.pick(['hills', 'blob', 'chart']) });
      add({ id: 'note', kind: 'prop', name: r.pick(['calendar', 'clock']), wall: 'x', x: 84, z: 132, size: 40 });
    } else {
      add({ id: 'bed', kind: 'bed', x: 16, y: 40, w: 150, d: 100, blanket: r.pick(pal.accent) });
      add({ id: 'nightstand', kind: 'box', x: 16, y: 150, w: 34, d: 34, h: 34, color: pal.wood, hatch: false });
      add({ id: 'bedside-lamp', kind: 'prop', name: 'lamp', x: 33, y: 167, z: 34, size: 40, contact: false });
      add({ id: 'art', kind: 'frame', wall: 'y', y: 90, z: 120, w: 80, h: 44, art: r.pick(['hills', 'blob']) });
      add({ id: 'clock', kind: 'clock', wall: 'x', x: 70, z: 165, r: 14 });
    }
    add({ id: 'shelf', kind: 'shelf', x: W - 96, y: 4, w: 80, d: 28, h: 150 });
    add({ id: 'plant', kind: 'pot', x: W - 34, y: 66, r: 14, h: 22, color: pot() });
    if (r.chance(0.75)) add({ id: 'person', kind: 'person', x: 215, y: 230, h: 118, pose: r.pick(POSES_STAND), facing: r.pick(['left', 'right']), color: r.pick(pal.people), accent: r.chance(0.5) ? r.pick(pal.accent) : undefined });
    return { base: { shape: 'square', depth: 30, edge: 'tile', top: pal.stone } };
  },

  desk(r, pal, add) {
    // the desk top is the world; the slab under it is the desk
    const W = 300, D = 200;
    add({ id: 'mat', kind: 'rug', x: 70, y: 50, w: 150, d: 100, color: r.pick(pal.rugs), border: false });
    const main = r.pick(PROPS_DESK);
    add({ id: 'screen', kind: 'prop', name: main, x: 140, y: 70, size: main === 'monitor' ? 120 : 110, contact: true });
    const items = [
      { kind: 'prop', name: r.pick(['mug', 'coffee-cup', 'coffee']), size: 40 },
      { kind: 'pot', r: 14, h: 20, color: r.pick(pal.pots) },
      { books: true },
      { kind: 'prop', name: r.pick(['lamp', 'lamp-2']), size: 90 },
      { kind: 'cylinder', r: 9, h: 24, color: r.pick(pal.accent), pens: true },
      { kind: 'prop', name: r.pick(['cactus', 'plant']), size: 64 },
      { phone: true },
    ];
    for (let i = items.length - 1; i > 0; i--) { const j = r.int(0, i); [items[i], items[j]] = [items[j], items[i]]; }
    const spots = [[50, 48], [246, 50], [56, 146], [236, 150], [258, 100]];
    spots.forEach(([x, y], i) => {
      const it = items[i];
      if (it.books) { add({ id: `books-${i}`, kind: 'box', x: x - 25, y: y - 17, w: 50, d: 34, h: 9, color: r.pick(pal.accent), hatch: false }); add({ id: `books-${i}b`, kind: 'box', x: x - 22, y: y - 14, z: 9, w: 44, d: 28, h: 8, color: r.pick(pal.accent), hatch: false }); return; }
      if (it.phone) { add({ id: `phone-${i}`, kind: 'box', x: x - 9, y: y - 16, w: 18, d: 32, h: 3, color: 'dark', hatch: false, shadow: false }); return; }
      if (it.pens) { add({ id: `pens-${i}`, kind: 'cylinder', x, y, r: 9, h: 22, color: it.color }); for (let k = 0; k < 3; k++) add({ id: `pen-${i}-${k}`, kind: 'cylinder', x: x - 3 + k * 3, y: y + (k - 1) * 2, z: 22, r: 1.6, h: 12 + k * 3, color: ['coral', 'mustard', 'blue'][k] }); return; }
      add({ id: `item-${i}`, ...it, x, y });
    });
    add({ id: 'notes', kind: 'decal', x: 196, y: 120, w: 22, d: 22, color: 'mustard' });
    return { base: { shape: r.pick(['square', 'round']), x: 0, y: 0, w: W, d: D, top: pal.wood, edge: 'none', depth: 26, layers: [{ h: 10, color: pal.wood }, { h: 16, color: pal.trunk, hatch: true }] } };
  },

  street(r, pal, add) {
    const W = 600, D = 330;
    add({ id: 'sidewalk-back', kind: 'path', x: 0, y: 112, w: W, d: 40, color: pal.path });
    add({ id: 'road', kind: 'road', x: 0, y: 152, w: W, d: 74, axis: 'x', crossing: r.int(2, 4) * 100 });
    add({ id: 'sidewalk-front', kind: 'path', x: 0, y: 226, w: W, d: 40, color: pal.path });
    let x = 16;
    for (let i = 0; x < W - 80; i++) {
      const w = r.int(84, 120), h = r.int(70, 110), tall = r.chance(0.3);
      if (tall) add({ id: `building-${i}`, kind: 'building', x, y: 20, w, d: 80, h: h + 50 });
      else add({ id: `house-${i}`, kind: 'house', x, y: 26, w, d: 74, h, ridge: 'x' });
      x += w + r.int(10, 24);
      if (r.chance(0.5) && x < W - 60) { add({ id: `tree-b${i}`, kind: 'tree', x: x - 6, y: 92, r: 15, h: 70, shape: r.pick(['ball', 'cone']) }); }
    }
    for (let i = 0; i < 4; i++) add({ id: `lamp-${i}`, kind: 'lamp', x: 70 + i * 150, y: 232, h: 92 });
    for (let i = 0; i < 5; i++) {
      const tx = 40 + i * 120 + r.jitter(16);
      add({ id: `tree-f${i}`, kind: 'tree', x: tx, y: 292 + r.jitter(8), r: r.range(17, 24), h: r.range(80, 105), shape: r.pick(['ball', 'ball', 'cone', 'pine']) });
    }
    add({ id: 'bench', kind: 'bench', x: 250, y: 280, w: 70, d: 22, h: 34, seat: 18, facing: '-y' });
    add({ id: 'car-1', kind: 'car', x: r.int(40, 200), y: 162, axis: 'x', color: r.pick(pal.cars) });
    if (r.chance(0.6)) add({ id: 'car-2', kind: 'car', x: r.int(330, 480), y: 192, axis: 'x', color: r.pick(pal.cars) });
    const n = r.int(3, 5);
    for (let i = 0; i < n; i++) {
      const front = r.chance(0.5);
      add({ id: `person-${i}`, kind: 'person', x: 40 + r.next() * (W - 80), y: front ? 246 : 132, h: 50, pose: r.pick(['walking', 'walking', 'standing', 'phone', 'waving']), facing: r.pick(['left', 'right']) });
    }
    return { base: { shape: 'square', depth: 34, edge: 'grass' } };
  },

  city(r, pal, add) {
    const S = 520, R0 = 230, R1 = 290;
    add({ id: 'road-x', kind: 'road', x: 0, y: R0, w: S, d: R1 - R0, axis: 'x', crossing: R1 + 12 });
    add({ id: 'road-y', kind: 'road', x: R0, y: 0, w: R1 - R0, d: S, axis: 'y', dashes: true });
    // cover the crossroads with a plain square so the dashes stop at the junction
    add({ id: 'junction', kind: 'decal', x: R0, y: R0, w: R1 - R0, d: R1 - R0, color: pal.road });
    const blocks = [[0, 0], [R1, 0], [0, R1], [R1, R1]];
    const types = ['towers', 'houses', 'park', 'towers', 'plaza', 'houses'];
    const pickTypes = [];
    while (pickTypes.length < 4) { const t = r.pick(types); if (t !== 'park' || !pickTypes.includes('park')) pickTypes.push(t); }
    if (!pickTypes.includes('park') && r.chance(0.7)) pickTypes[r.int(0, 3)] = 'park';
    blocks.forEach(([bx, by], bi) => {
      const bw = bi % 2 ? S - R1 : R0, bd = bi < 2 ? R0 : S - R1, m = 14;
      add({ id: `walk-${bi}`, kind: 'path', x: bx + 4, y: by + 4, w: bw - 8, d: bd - 8, color: pal.path, outline: true });
      const t = pickTypes[bi], x0 = bx + m + 4, y0 = by + m + 4, w0 = bw - 2 * m - 8, d0 = bd - 2 * m - 8;
      if (t === 'towers') {
        const two = r.chance(0.6);
        if (two) {
          add({ id: `tower-${bi}a`, kind: 'building', x: x0, y: y0, w: w0 * 0.48, d: d0 * 0.55, h: r.int(160, 240), lights: true });
          add({ id: `tower-${bi}b`, kind: 'building', x: x0 + w0 * 0.55, y: y0 + d0 * 0.1, w: w0 * 0.45, d: d0 * 0.5, h: r.int(100, 170), lights: true });
          add({ id: `tree-${bi}a`, kind: 'tree', x: x0 + 28, y: y0 + d0 * 0.8, r: 18, h: 74 });
          add({ id: `tree-${bi}b`, kind: 'tree', x: x0 + w0 * 0.75, y: y0 + d0 * 0.82, r: 18, h: 74, shape: 'cone' });
        } else {
          add({ id: `tower-${bi}`, kind: 'building', x: x0 + 10, y: y0 + 10, w: w0 * 0.7, d: d0 * 0.7, h: r.int(200, 280), lights: true });
          add({ id: `bush-${bi}`, kind: 'bush', x: x0 + w0 * 0.86, y: y0 + d0 * 0.86, r: 16 });
        }
      } else if (t === 'houses') {
        const ridge = r.pick(['x', 'y']);
        for (let k = 0; k < 4; k++) {
          const hx = x0 + 4 + (k % 2) * w0 * 0.54, hy = y0 + 4 + Math.floor(k / 2) * d0 * 0.54;
          if (r.chance(0.15)) { add({ id: `tree-${bi}-${k}`, kind: 'tree', x: hx + w0 * 0.22, y: hy + d0 * 0.22, r: 20, h: 86, shape: r.pick(['ball', 'pine']) }); continue; }
          add({ id: `house-${bi}-${k}`, kind: 'house', x: hx, y: hy, w: w0 * 0.38, d: d0 * 0.36, h: r.int(44, 60), ridge });
        }
      } else if (t === 'park') {
        add({ id: `lawn-${bi}`, kind: 'decal', x: x0, y: y0, w: w0, d: d0, color: pal.grass, shape: 'rect' });
        add({ id: `pond-${bi}`, kind: 'pond', x: x0 + w0 * 0.3, y: y0 + d0 * 0.3, w: w0 * 0.5, d: d0 * 0.42 });
        for (let k = 0; k < 4; k++) add({ id: `ptree-${bi}-${k}`, kind: 'tree', x: x0 + [16, w0 - 16, 18, w0 - 18][k], y: y0 + [18, 20, d0 - 16, d0 - 18][k], r: r.range(16, 22), h: r.range(70, 96), shape: r.pick(['ball', 'ball', 'cone', 'pine']) });
        add({ id: `pbench-${bi}`, kind: 'bench', x: x0 + w0 * 0.35, y: y0 + d0 * 0.82, w: 60, d: 20, h: 30, seat: 16, facing: '-y' });
      } else {
        add({ id: `plaza-${bi}`, kind: 'decal', x: x0, y: y0, w: w0, d: d0, color: pal.stone, shape: 'rect' });
        add({ id: `fountain-${bi}`, kind: 'pond', x: x0 + w0 * 0.3, y: y0 + d0 * 0.3, w: w0 * 0.4, d: d0 * 0.4, lily: false });
        add({ id: `kiosk-${bi}`, kind: 'house', x: x0 + 6, y: y0 + 6, w: 50, d: 40, h: 40, ridge: 'x' });
        for (let k = 0; k < 2; k++) add({ id: `pp-${bi}-${k}`, kind: 'person', x: x0 + w0 * (0.25 + k * 0.5), y: y0 + d0 * 0.85, h: 40, pose: r.pick(['standing', 'waving', 'phone', 'walking']), facing: k ? 'left' : 'right' });
      }
    });
    for (const [lx, ly] of [[R0 - 10, R0 - 10], [R1 + 10, R0 - 10], [R0 - 10, R1 + 10], [R1 + 10, R1 + 10]]) add({ id: `lamp-${lx}-${ly}`, kind: 'lamp', x: lx, y: ly, h: 70 });
    add({ id: 'car-1', kind: 'car', x: r.int(30, 140), y: R0 + 8, axis: 'x', color: r.pick(pal.cars) });
    add({ id: 'car-2', kind: 'car', x: R0 + 30, y: r.int(330, 430), axis: 'y', color: r.pick(pal.cars) });
    for (let k = 0; k < 4; k++) {
      const alongX = r.chance(0.5);
      add({ id: `walker-${k}`, kind: 'person', x: alongX ? r.range(20, S - 20) : (r.chance(0.5) ? R0 - 9 : R1 + 9), y: alongX ? (r.chance(0.5) ? R0 - 9 : R1 + 9) : r.range(20, S - 20), h: 40, pose: r.pick(['walking', 'walking', 'standing', 'phone']), facing: r.pick(['left', 'right']) });
    }
    return { base: { shape: 'island', edge: 'grass' } };
  },

  cafe(r, pal, add) {
    const { W } = room(r, pal, add, { pattern: 'checker', step: 40, leftOpening: { arch: [210, 62, 140] }, backWindows: [{ u: 196, v: 60, w: 110, h: 100 }] });
    add({ id: 'counter', kind: 'counter', x: 24, y: 20, w: 150, d: 44, color: pal.counter });
    add({ id: 'machine', kind: 'box', x: 40, y: 26, z: 78, w: 30, d: 24, h: 30, color: 'dark', hatch: false });
    add({ id: 'cups', kind: 'prop', name: r.pick(['coffee-cup', 'cup', 'mug']), x: 110, y: 40, z: 78, size: 26, contact: false });
    add({ id: 'cake', kind: 'cylinder', x: 148, y: 40, z: 78, r: 11, h: 10, color: 'tone-coral' });
    add({ id: 'barista', kind: 'person', x: 100, y: 8, h: 118, pose: r.pick(['standing', 'holding', 'waving']), facing: 'right', accent: 'coral', accentKind: 'bag' });
    add({ id: 'menu', kind: 'board', wall: 'x', x: 100, z: 150, w: 120, h: 50, art: 'chalk' });
    add({ id: 'sign', kind: 'frame', wall: 'y', y: 120, z: 140, w: 60, h: 60, art: 'blob', accent: 'mustard' });
    const tables = [[170, 130], [250, 220], [130, 240]];
    tables.forEach(([tx, ty], i) => {
      if (i === 2 && r.chance(0.4)) return;
      add({ id: `table-${i}`, kind: 'table', x: tx, y: ty, shape: 'round', w: 50, d: 50, h: 52 });
      add({ id: `cup-${i}`, kind: 'prop', name: r.pick(['coffee-cup', 'cup']), x: tx + 22, y: ty + 26, z: 52, size: 20, contact: false });
      add({ id: `chair-${i}`, kind: 'chair', x: tx - 38, y: ty + 8, facing: '+x', h: 60, seat: 30 });
      if (r.chance(0.75)) add({ id: `guest-${i}`, kind: 'person', x: tx - 20, y: ty + 25, h: 104, pose: 'sitting', facing: 'right', color: r.pick(pal.people), accent: r.chance(0.4) ? r.pick(pal.accent) : undefined });
      else add({ id: `stool-${i}`, kind: 'stool', x: tx + 25, y: ty + 70, r: 12, h: 30 });
    });
    add({ id: 'plant', kind: 'pot', x: W - 30, y: 50, r: 16, h: 26, color: r.pick(pal.pots) });
    add({ id: 'plant-2', kind: 'pot', x: 30, y: 290, r: 16, h: 24, color: 'paper' });
    return { base: { shape: 'square', depth: 30, edge: 'tile', top: pal.stone } };
  },

  office(r, pal, add) {
    const { W } = room(r, pal, add, { W: 380, D: 340, pattern: 'tiles', step: 38, floor: pal.floor, leftOpening: { door: [250, 54, 130], doorColor: pal.door }, backWindows: [{ u: 40, v: 70, w: 110, h: 90 }, { u: 210, v: 70, w: 110, h: 90 }] });
    add({ id: 'board', kind: 'board', wall: 'y', y: 120, z: 130, w: 140, h: 70, art: 'chart', color: 'white', chalk: false });
    add({ id: 'clock', kind: 'clock', wall: 'x', x: 175, z: 175, r: 14 });
    const desks = [[150, 90], [150, 200]];
    desks.forEach(([dx, dy], i) => {
      add({ id: `desk-${i}`, kind: 'desk', x: dx, y: dy, w: 120, d: 58, drawers: true });
      add({ id: `screen-${i}`, kind: 'prop', name: r.pick(['monitor', 'laptop']), x: dx + 50, y: dy + 22, z: 60, size: 58, contact: false });
      add({ id: `chair-${i}`, kind: 'chair', x: dx - 40, y: dy + 12, facing: '+x' });
      if (r.chance(0.8)) add({ id: `worker-${i}`, kind: 'person', x: dx - 22, y: dy + 30, h: 106, pose: 'sitting', facing: 'right', color: r.pick(pal.people), accent: r.chance(0.5) ? r.pick(pal.accent) : undefined });
      if (r.chance(0.5)) add({ id: `mug-${i}`, kind: 'prop', name: 'mug', x: dx + 96, y: dy + 34, z: 60, size: 20, contact: false });
    });
    add({ id: 'cooler', kind: 'cylinder', x: W - 34, y: 300, r: 14, h: 70, color: 'white' });
    add({ id: 'bottle', kind: 'cylinder', x: W - 34, y: 300, z: 70, r: 11, h: 26, color: 'tone' });
    add({ id: 'shelf', kind: 'shelf', x: 300, y: 4, w: 70, d: 28, h: 130 });
    add({ id: 'plant', kind: 'pot', x: 40, y: 300, r: 16, h: 26, color: r.pick(pal.pots) });
    if (r.chance(0.7)) add({ id: 'visitor', kind: 'person', x: 90, y: 300, h: 116, pose: r.pick(['pointing', 'standing', 'phone', 'holding']), facing: 'left' });
    return { base: { shape: 'square', depth: 30, edge: 'tile', top: pal.stone } };
  },

  classroom(r, pal, add) {
    room(r, pal, add, { W: 380, D: 340, pattern: 'boards', backWindows: [{ u: 250, v: 70, w: 100, h: 90 }], leftOpening: { windows: [{ u: 220, v: 70, w: 90, h: 90 }] } });
    add({ id: 'board', kind: 'board', wall: 'x', x: 120, z: 120, w: 170, h: 80, art: 'chalk' });
    add({ id: 'clock', kind: 'clock', wall: 'y', y: 80, z: 165, r: 14 });
    add({ id: 'teacher-desk', kind: 'desk', x: 40, y: 40, w: 100, d: 50, drawers: true });
    add({ id: 'globe', kind: 'prop', name: 'globe', x: 66, y: 60, z: 60, size: 46, contact: false });
    add({ id: 'teacher', kind: 'person', x: 190, y: 50, h: 116, pose: r.pick(['pointing', 'raising-arm', 'reading', 'standing']), facing: 'left', accent: r.pick(pal.accent) });
    let k = 0;
    for (let row = 0; row < 2; row++) for (let col = 0; col < 3; col++) {
      const dx = 120 + col * 80, dy = 150 + row * 90;
      add({ id: `sdesk-${k}`, kind: 'table', x: dx, y: dy, w: 54, d: 36, h: 44 });
      add({ id: `stool-${k}`, kind: 'stool', x: dx + 27, y: dy + 54, r: 11, h: 28 });
      if (r.chance(0.8)) add({ id: `student-${k}`, kind: 'person', x: dx + 27, y: dy + 56, h: 82, pose: r.pick(['sitting', 'sitting', 'raising-arm']), facing: r.pick(['left', 'right']), color: r.pick(pal.people), bias: 80 });
      if (r.chance(0.5)) add({ id: `book-${k}`, kind: 'box', x: dx + 14, y: dy + 10, z: 44, w: 22, d: 16, h: 4, color: r.pick(pal.accent), hatch: false });
      k++;
    }
    add({ id: 'shelf', kind: 'shelf', x: 2, y: 120, facing: '+x', w: 28, d: 80, h: 120 });
    add({ id: 'plant', kind: 'pot', x: 350, y: 300, r: 15, h: 22, color: r.pick(pal.pots) });
    return { base: { shape: 'square', depth: 30, edge: 'tile', top: pal.stone } };
  },
};
