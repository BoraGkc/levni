// What the editor offers for each element type: its settings (from docs/scene.md), which of them sit in the
// context toolbar (`quick`), and the shapes panel (ready-made elements in categories).
// Field kinds: num, range, color, colors (a list of inks), enum, bool, text, seed (a number with a shuffle button).
export type Field = {
  k: string; label: string; kind: 'num' | 'range' | 'color' | 'colors' | 'enum' | 'bool' | 'text' | 'seed';
  opts?: [string, string][]; min?: number; max?: number; step?: number; def?: any; quick?: boolean; more?: boolean;
};
const n = (k: string, label: string, o: Partial<Field> = {}): Field => ({ k, label, kind: 'num', ...o });
const r = (k: string, label: string, min: number, max: number, step: number, def: number, o: Partial<Field> = {}): Field => ({ k, label, kind: 'range', min, max, step, def, ...o });
const c = (k: string, label = 'Colour', o: Partial<Field> = {}): Field => ({ k, label, kind: 'color', ...o });
const cs = (k = 'colors', label = 'Colours', o: Partial<Field> = {}): Field => ({ k, label, kind: 'colors', ...o });
const cap = (v: string) => v.replace(/-/g, ' ').replace(/^./, (m) => m.toUpperCase());
const e = (k: string, label: string, vals: (string | [string, string])[], o: Partial<Field> = {}): Field => ({ k, label, kind: 'enum', opts: vals.map((v) => (Array.isArray(v) ? v : [v, cap(v)])), ...o });
const b = (k: string, label: string, o: Partial<Field> = {}): Field => ({ k, label, kind: 'bool', ...o });
const t = (k: string, label: string, o: Partial<Field> = {}): Field => ({ k, label, kind: 'text', ...o });
const seed = (label = 'Layout', o: Partial<Field> = {}): Field => ({ k: 'seed', label, kind: 'seed', def: 1, quick: true, ...o });
const W = n('w', 'Width'), H = n('h', 'Height'), SIZE = n('size', 'Size'), ROT = r('rot', 'Rotation', -180, 180, 1, 0);

// room, desk, office and classroom also exist, but draw Tabler icons, which the browser build does not bundle
export const ISO_PRESETS = ['street', 'city', 'cafe'];
const SOFT_PALETTES = ['aqua', 'sunset', 'mint-night', 'lilac', 'mono-blue'];
const CURVES = ['loop', 's-curve', 'wave', 'spiral', 'mobius', 'knot', 'ring'];
const POSES = ['standing', 'walking', 'running', 'sitting', 'pointing', 'waving', 'raising-arm', 'holding', 'carrying', 'reading', 'phone', 'thinking', 'cheering', 'kneeling', 'leaning'];
const MAT = [r('gloss', 'Gloss', 0, 1, 0.05, 0.55, { more: true }), r('rim', 'Rim light', 0, 1, 0.05, 0, { more: true }), b('shadow', 'Drop shadow', { def: true, more: true })];
const ROT3 = { k: 'rotate', label: 'Turn (x, y, z degrees)', kind: 'text', more: true } as Field;

export const SPEC: Record<string, Field[]> = {
  // drawings
  prop: [SIZE, ROT, b('flip', 'Mirror'), b('overprint', 'Overprint', { more: true }), b('crop', 'Bleeds off the edge on purpose', { more: true })],
  draw: [SIZE, ROT, b('flip', 'Mirror')],
  extrude3d: [SIZE, r('depth', 'Depth', 0.02, 0.6, 0.02, 0.16), e('lines', 'Ink lines', ['raised', 'none']), b('sheen', 'Front gloss', { def: true }), ROT3],
  glyphfill: [SIZE, c('color', 'Colour', { quick: true }), e('mode', 'Made of', [['glyph', 'Characters'], ['block', 'Blocks'], ['dot', 'Dots']], { quick: true }), r('cell', 'Cell size', 3, 40, 1, 9), c('accent', 'Accent'), b('outline', 'Inked outline', { more: true }), t('chars', 'Characters, light to dense', { more: true }), r('field', 'Faint glyphs around', 0, 1, 0.05, 0, { more: true })],
  echo: [SIZE, r('n', 'Copies', 2, 30, 1, 8, { quick: true }), n('dx', 'Step x'), n('dy', 'Step y'), c('from', 'Back tone'), c('to', 'Front tone'), c('outline', 'Top outline'), c('top', 'Top fill', { more: true })],
  image: [SIZE, ROT, n('radius', 'Corners'), b('card', 'On a card'), c('cardColor', 'Card colour')],
  // type
  type: [t('text', 'Text'), e('font', 'Font', [['grotesk', 'Grotesk'], ['black', 'Heavy'], ['mono', 'Mono'], ['pixel', 'Pixel']]), n('size', 'Size', { def: 120 }), c('color', 'Colour'), e('align', 'Align', ['left', 'center', 'right']), r('tracking', 'Letter spacing', -0.1, 0.4, 0.01, 0), r('leading', 'Line height', 0.7, 2, 0.02, 0.92), b('upper', 'Capitals'), b('outline', 'Outline letters'), r('opacity', 'Opacity', 0.1, 1, 0.05, 1, { more: true }), n('w', 'Fit to width', { more: true }), n('rotate', 'Rotate (-90 reads up)', { more: true })],
  label: [t('text', 'Text'), n('size', 'Size', { def: 16 }), c('color', 'Colour'), e('anchor', 'Anchor', [['start', 'Left'], ['middle', 'Centre'], ['end', 'Right']]), b('upper', 'Capitals', { def: true })],
  ringtext: [t('text', 'Text'), n('r', 'Radius'), n('size', 'Type size'), c('color', 'Colour'), e('side', 'Reads', [['out', 'Along the top'], ['in', 'Along the bottom']]), b('repeat', 'Repeat round the ring'), t('sep', 'Separator', { more: true }), r('start', 'Start angle', -180, 180, 1, 0, { more: true })],
  // grounds
  panel: [W, H, c('color', 'Colour', { quick: true }), ROT, c('outline', 'Outline', { more: true })],
  block: [W, H, c('color', 'Colour', { quick: true }), n('radius', 'Corners'), r('rotate', 'Rotation', -180, 180, 1, 0), r('skew', 'Skew', -45, 45, 1, 0, { more: true }), r('opacity', 'Opacity', 0.1, 1, 0.05, 1, { more: true })],
  disc: [n('r', 'Radius'), c('color', 'Colour', { quick: true }), n('ry', 'Height radius (oval)', { more: true }), c('outline', 'Outline', { more: true })],
  dither: [W, H, n('r', 'Radius (a disc)'), cs('colors', 'Inks, light to dark', { quick: true }), e('mode', 'Fade', ['linear', 'radial', 'noise', 'flat'], { quick: true }), r('from', 'Coverage at start', 0, 1.2, 0.05, 1), r('to', 'Coverage at end', 0, 1.2, 0.05, 0), r('angle', 'Direction', 0, 360, 5, 90), r('cell', 'Pixel size', 3, 40, 1, 12), e('matrix', 'Bayer matrix', [['2', '2 × 2'], ['4', '4 × 4'], ['8', '8 × 8']]), e('pattern', 'Pixel shape', ['square', 'dot', 'line', 'plus'])],
  halftone: [W, H, c('color', 'Colour', { quick: true }), e('mode', 'Fade', ['radial', 'linear']), n('gap', 'Dot spacing'), r('level', 'Strength', 0, 1, 0.05, 1)],
  amtone: [W, H, cs('colors', 'Inks', { quick: true }), e('source', 'Tone from', ['linear', 'radial', 'noise', 'terrain', 'flat'], { quick: true }), e('shape', 'Screen', ['dot', 'square', 'line']), r('cell', 'Cell', 4, 40, 1, 14), r('angle', 'Screen angle', 0, 90, 1, 45), b('invert', 'Invert')],
  camo: [W, H, cs('colors', 'Inks', { quick: true }), c('ground', 'Ground'), r('threshold', 'Clear area', 0, 1, 0.02, 0.5), r('scale', 'Blob size', 0.001, 0.02, 0.0005, 0.006), r('speckle', 'Torn print', 0, 1, 0.05, 0), seed()],
  grain: [cs('colors', 'Inks'), e('mode', 'Kind', [['speck', 'Film grain'], ['toner', 'Photocopy toner']]), r('density', 'Density', 1, 30, 1, 8), r('opacity', 'Opacity', 0.05, 1, 0.05, 0.35)],
  meshgrad: [W, H, n('r', 'Radius (an orb)'), cs('colors', 'Colours', { quick: true }), e('shape', 'Shape', ['rect', 'circle', 'squircle']), r('count', 'Blobs', 2, 12, 1, 5), r('grain', 'Grain', 0, 1, 0.05, 0.35), r('bands', 'Hard steps (0 = smooth)', 0, 12, 1, 0), b('lines', 'Contour lines'), seed('Mix', { quick: true })],
  shapegrid: [W, H, r('cols', 'Columns', 1, 20, 1, 4), r('rows', 'Rows', 1, 20, 1, 4), n('gap', 'Gap'), cs('colors', 'Inks', { quick: true }), r('blank', 'Empty cells', 0, 0.9, 0.05, 0), seed('Arrangement', { quick: true })],
  dotmatrix: [W, H, e('mask', 'Shape', [['world', 'World map'], ['noise', 'Noise'], ['', 'All dots']], { quick: true }), r('cell', 'Cell', 6, 40, 1, 14), c('color', 'Dots'), r('hollow', 'Hollow share', 0, 1, 0.05, 0.2), c('faint', 'Dots outside'), c('accent', 'Accent')],
  glyphs: [W, H, c('color', 'Colour'), e('mode', 'Fade', ['flat', 'radial', 'fade-down', 'fade-up']), r('level', 'Strength', 0, 1, 0.05, 0.5)],
  waves: [W, H, c('color', 'Colour', { quick: true }), n('gap', 'Line gap'), n('amp', 'Wave height')],
  hills: [n('base', 'Base line'), n('height', 'Height'), c('color', 'Colour', { quick: true })],
  hatch: [W, H, c('color', 'Colour', { quick: true }), r('angle', 'Angle', 0, 180, 5, 45), n('gap', 'Gap'), b('cross', 'Cross hatch')],
  flowfield: [W, H, cs('colors', 'Colours', { quick: true }), n('spacing', 'Spacing'), n('length', 'Line length'), n('weight', 'Weight')],
  confetti: [W, H, e('kind', 'Kind', ['confetti', 'rain', 'stars'], { quick: true }), cs('colors', 'Colours'), n('spacing', 'Spacing')],
  marks: [r('count', 'How many', 1, 30, 1, 6, { quick: true }), cs('colors', 'Colours')],
  // lines and etching
  terrain: [W, H, c('color', 'Lines', { quick: true }), c('ground', 'Ground'), r('horizon', 'Horizon', 0.1, 0.9, 0.02, 0.4), r('rows', 'Rows', 6, 80, 1, 26), r('height', 'Mountain height', 0, 1, 0.02, 0.3), r('flow', 'Glowing streams', 0, 12, 1, 0), c('glow', 'Horizon glow'), seed('Landscape')],
  ridgelines: [W, H, c('color', 'Lines', { quick: true }), c('ground', 'Ground'), r('lines', 'Lines', 6, 120, 1, 34), r('height', 'Peak height', 0, 1, 0.02, 0.42), e('peaks', 'Peaks', [['center', 'In the middle'], ['noise', 'Anywhere']]), seed('Peaks')],
  engrave: [e('mode', 'Plate', ['landscape', 'globe', 'radial', 'noise'], { quick: true }), W, H, n('r', 'Radius (globe)'), c('color', 'Ink', { quick: true }), c('ground', 'Paper'), r('gap', 'Line gap', 3, 20, 1, 6), r('weight', 'Line weight', 0.2, 1, 0.02, 0.78), b('frame', 'Plate frame'), seed('Plate')],
  // things
  cloud: [SIZE, c('color', 'Colour', { quick: true }), r('bumps', 'Bumps', 3, 9, 1, 5)],
  tree: [SIZE, r('depth', 'Branching', 2, 8, 1, 5), cs('leafColors', 'Leaves'), seed('Shape')],
  plant: [SIZE, c('leafColor', 'Leaves', { quick: true }), c('potColor', 'Pot', { quick: true }), r('leaves', 'Leaves', 3, 14, 1, 7)],
  sunburst: [SIZE, c('color', 'Sun', { quick: true }), c('rayColor', 'Rays', { quick: true }), r('rays', 'Rays', 6, 40, 1, 16)],
  rose: [SIZE, r('petals', 'Petals', 3, 12, 1, 5, { quick: true }), c('fill', 'Fill', { quick: true }), c('center', 'Centre')],
  spiro: [SIZE, n('R', 'Outer ring'), n('r', 'Inner ring'), n('d', 'Pen offset'), r('turns', 'Turns', 1, 40, 1, 10)],
  flag: [W, H, cs('stripes', 'Stripes', { quick: true }), c('canton', 'Corner')],
  badge: [SIZE, c('color', 'Line', { quick: true }), c('fill', 'Fill', { quick: true }), n('weight', 'Weight')],
  seal: [SIZE, t('text', 'Ring text'), t('word', 'Centre word'), e('edge', 'Edge', ['scallop', 'perforated', 'zigzag', 'plain'], { quick: true }), c('fill', 'Fill', { quick: true }), c('color', 'Ink'), c('textColor', 'Text colour'), c('wordColor', 'Word colour'), t('prop', 'Centre drawing (instead of a word)', { more: true }), t('sep', 'Separator', { more: true }), ROT],
  stub: [W, H, t('text', 'Main text'), t('stubText', 'Stub text'), c('fill', 'Paper', { quick: true }), c('color', 'Ink'), c('textColor', 'Text colour'), r('split', 'Perforation', 0.1, 0.95, 0.01, 0.72), b('shadow', 'Shadow', { more: true }), ROT],
  ticks: [SIZE, r('angle', 'Angle', -180, 180, 5, 0), r('count', 'Dashes', 1, 6, 1, 3), cs('colors', 'Colours')],
  arrow: [r('bend', 'Bend', -1, 1, 0.05, 0.3, { quick: true }), c('color', 'Colour', { quick: true })],
  bubble: [W, H, e('tail', 'Tail', ['left', 'right'], { quick: true }), e('content', 'Inside', [['lines', 'Lines'], ['dots', 'Dots'], ['heart', 'Heart'], ['none', 'Empty']], { quick: true }), c('color', 'Colour'), c('accent', 'Accent')],
  window: [W, H, t('title', 'Title')],
  sheet: [W, H, c('color', 'Colour', { quick: true }), e('content', 'Inside', [['lines', 'Lines'], ['', 'Empty']]), b('pin', 'Pin'), ROT],
  stack: [W, H, r('count', 'Sheets', 2, 12, 1, 5), cs('colors', 'Colours')],
  // people
  person: [SIZE, e('pose', 'Pose', POSES, { quick: true }), e('facing', 'Facing', ['right', 'left'], { quick: true }), c('color', 'Body'), c('accent', 'Scarf or bag'), t('hold', 'Holding (a drawing name)', { more: true })],
  people: [W, r('n', 'How many', 1, 12, 1, 4, { quick: true }), SIZE, e('facing', 'Facing', [['', 'Face each other'], ['left', 'Left'], ['right', 'Right'], ['alternate', 'Alternate']]), cs('colors', 'Bodies')],
  crowd: [W, r('rows', 'Rows', 1, 6, 1, 3, { quick: true }), SIZE, c('color', 'Colour'), c('highlight', 'Highlight')],
  isotype: [r('cols', 'Columns', 1, 20, 1, 10), r('rows', 'Rows', 1, 10, 1, 2), SIZE, r('share', 'Highlighted share', 0, 1, 0.01, 0.3, { quick: true }), c('color', 'Colour'), c('highlight', 'Highlight')],
  // 3D
  iso: [e('preset', 'World', ISO_PRESETS, { quick: true }), seed('Layout'), e('palette', 'Colours', ['house', 'pastel', 'warm', 'blue'], { quick: true }), e('style', 'Shading', [['', 'Hand-inked'], ['soft', 'Soft']]), b('ao', 'Soft shadows in corners', { def: true, more: true })],
  soft3d: [e('preset', 'Shape', ['auto', 'ribbon', 'wave', 'mobius', 'spiral', 'knot', 'rings', 'orbit', 'pebbles', 'stack'], { quick: true }), seed('Layout'), e('palette', 'Colours', SOFT_PALETTES, { quick: true }), e('side', 'Shape on the', ['right', 'left']), e('titleSpace', 'Room for a title', ['bottom', 'top', 'left', 'none'])],
  ribbon3d: [e('preset', 'Curve', CURVES, { quick: true }), SIZE, n('width', 'Band width'), r('twist', 'Twists', 0, 3, 0.05, 1), cs('colors', 'Colours', { quick: true }), c('back', 'Back side'), seed('Bend'), ROT3, ...MAT],
  tube3d: [e('preset', 'Curve', CURVES, { quick: true }), SIZE, n('width', 'Thickness'), cs('colors', 'Colours', { quick: true }), seed('Bend'), ROT3, ...MAT],
  torus3d: [SIZE, r('thickness', 'Thickness', 0.05, 0.6, 0.01, 0.36), cs('colors', 'Colours', { quick: true }), ROT3, ...MAT],
  sphere3d: [SIZE, cs('colors', 'Colours', { quick: true }), ...MAT],
  capsule3d: [SIZE, r('radius', 'Roundness', 0.1, 1, 0.02, 0.42), cs('colors', 'Colours', { quick: true }), ROT3, ...MAT],
  blob3d: [SIZE, r('wobble', 'Wobble', 0, 0.6, 0.02, 0.22), cs('colors', 'Colours', { quick: true }), seed('Shape'), ...MAT],
  cubes3d: [SIZE, r('rows', 'Rows', 1, 8, 1, 3), r('cols', 'Columns', 1, 8, 1, 3), r('maxHeight', 'Tallest', 1, 10, 1, 4), r('round', 'Rounded corners', 0, 0.5, 0.02, 0.18), cs('colors', 'Colours', { quick: true }), e('colorBy', 'Colour by', [['', 'Block'], ['height', 'Height']]), seed('Stack'), ROT3, ...MAT],
  ribbon: [n('width', 'Band width'), cs('colors', 'Colours', { quick: true }), c('back', 'Back side'), r('twists', 'Twists', 0, 4, 0.1, 1), b('closed', 'Closed loop')],
  tube: [n('width', 'Thickness'), c('color', 'Colour', { quick: true })],
};

// ---------- shapes panel ----------
type Maker = (x: number, y: number, s: number) => any;
const R = Math.round;
export type ShapeDef = { id: string; label: string; cat: string; make: Maker; soft?: boolean };
export const SHAPE_CATS: [string, string][] = [['basic', 'Basics'], ['things', 'Things'], ['badges', 'Badges and labels'], ['textures', 'Textures and grounds'], ['ascii', 'ASCII and dots'], ['3d', '3D'], ['charts', 'Charts'], ['etch', 'Lines and etching'], ['people', 'People']];
export const SHAPES: ShapeDef[] = [
  // basics
  { id: 'panel', label: 'Panel', cat: 'basic', make: (x, y, s) => ({ type: 'panel', x: R(x - s), y: R(y - s * 0.7), w: R(s * 2), h: R(s * 1.4), color: 'blue' }) },
  { id: 'disc', label: 'Circle', cat: 'basic', make: (x, y, s) => ({ type: 'disc', x, y, r: R(s * 0.6), color: 'mustard' }) },
  { id: 'block', label: 'Pill', cat: 'basic', make: (x, y, s) => ({ type: 'block', x: R(x - s * 0.9), y: R(y - s * 0.3), w: R(s * 1.8), h: R(s * 0.6), radius: R(s * 0.3), color: 'coral' }) },
  { id: 'square', label: 'Crisp block', cat: 'basic', make: (x, y, s) => ({ type: 'block', x: R(x - s * 0.6), y: R(y - s * 0.6), w: R(s * 1.2), h: R(s * 1.2), color: 'ink' }) },
  { id: 'arrow', label: 'Arrow', cat: 'basic', make: (x, y, s) => ({ type: 'arrow', from: [R(x - s), R(y + s * 0.3)], to: [R(x + s), R(y - s * 0.3)], bend: 0.3, color: 'coral' }) },
  { id: 'bubble', label: 'Speech bubble', cat: 'basic', make: (x, y, s) => ({ type: 'bubble', x: R(x - s * 0.7), y: R(y - s * 0.45), w: R(s * 1.4), h: R(s * 0.9), tail: 'left', content: 'lines' }) },
  { id: 'window', label: 'Browser window', cat: 'basic', make: (x, y, s) => ({ type: 'window', x: R(x - s), y: R(y - s * 0.65), w: R(s * 2), h: R(s * 1.3), title: 'levni.dev' }) },
  { id: 'sheet', label: 'Paper sheet', cat: 'basic', make: (x, y, s) => ({ type: 'sheet', x: R(x - s * 0.5), y: R(y - s * 0.65), w: R(s), h: R(s * 1.3), color: 'paper', content: 'lines' }) },
  // things
  { id: 'sunburst', label: 'Sun rays', cat: 'things', make: (x, y, s) => ({ type: 'sunburst', x, y, size: R(s * 1.3), color: 'mustard', rayColor: 'tone-mustard' }) },
  { id: 'cloud', label: 'Cloud', cat: 'things', make: (x, y, s) => ({ type: 'cloud', x, y: R(y + s * 0.2), size: R(s * 1.2) }) },
  { id: 'tree', label: 'Tree', cat: 'things', make: (x, y, s) => ({ type: 'tree', x, y: R(y + s * 0.6), size: R(s * 1.3) }) },
  { id: 'plant', label: 'Plant', cat: 'things', make: (x, y, s) => ({ type: 'plant', x, y: R(y + s * 0.2), size: R(s * 0.9) }) },
  { id: 'rose', label: 'Flower', cat: 'things', make: (x, y, s) => ({ type: 'rose', x, y, size: R(s * 1.1), petals: 5, fill: 'coral' }) },
  { id: 'flag', label: 'Flag', cat: 'things', make: (x, y, s) => ({ type: 'flag', x: R(x - s * 0.7), y: R(y - s * 0.45), w: R(s * 1.4), h: R(s * 0.9), stripes: ['coral', 'paper', 'blue'] }) },
  { id: 'stack', label: 'Paper stack', cat: 'things', make: (x, y, s) => ({ type: 'stack', x: R(x - s * 0.6), y: R(y - s * 0.4), w: R(s * 1.2), h: R(s * 0.8), count: 5 }) },
  { id: 'marks', label: 'Sparkles', cat: 'things', make: (x, y, s) => ({ type: 'marks', area: [R(x - s), R(y - s * 0.6), R(s * 2), R(s * 1.2)], count: 6, colors: ['coral', 'mustard', 'blue'] }) },
  { id: 'confetti', label: 'Confetti', cat: 'things', make: (x, y, s) => ({ type: 'confetti', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), kind: 'confetti' }) },
  { id: 'ticks', label: 'Accent ticks', cat: 'things', make: (x, y, s) => ({ type: 'ticks', x, y, size: R(s * 0.5), colors: ['coral', 'mustard', 'blue'] }) },
  { id: 'waves', label: 'Waves', cat: 'things', make: (x, y, s) => ({ type: 'waves', x: R(x - s), y: R(y - s * 0.3), w: R(s * 2), h: R(s * 0.6), color: 'blue' }) },
  // badges
  { id: 'seal', label: 'Seal sticker', cat: 'badges', make: (x, y, s) => ({ type: 'seal', x, y, size: R(s * 1.2), edge: 'scallop', fill: 'coral', color: 'ink', textColor: 'ink', text: 'hand inked', sep: '✦', word: 'NEW', wordColor: 'paper' }) },
  { id: 'stamp', label: 'Stamp', cat: 'badges', make: (x, y, s) => ({ type: 'seal', x, y, size: R(s * 1.2), edge: 'perforated', fill: 'paper', color: 'blue', textColor: 'blue', top: 'approved', bottom: 'est. 2026', word: 'OK', wordColor: 'blue' }) },
  { id: 'stub', label: 'Ticket', cat: 'badges', make: (x, y, s) => ({ type: 'stub', x: R(x - s), y: R(y - s * 0.4), w: R(s * 2), h: R(s * 0.8), fill: 'paper', text: 'Admit one', stubText: 'no. 0412', color: 'ink' }) },
  { id: 'badge', label: 'Round badge', cat: 'badges', make: (x, y, s) => ({ type: 'badge', x, y, size: R(s * 1.1), color: 'ink', fill: 'mustard' }) },
  { id: 'ringtext', label: 'Text on a ring', cat: 'badges', make: (x, y, s) => ({ type: 'ringtext', x, y, r: R(s * 0.6), text: 'made with levni', repeat: true, size: R(Math.max(12, s * 0.09)), color: 'ink' }) },
  { id: 'spiro', label: 'Guilloche', cat: 'badges', make: (x, y, s) => ({ type: 'spiro', x, y, size: R(s * 1.1), color: 'green' }) },
  // textures
  { id: 'meshgrad', label: 'Gradient orb', cat: 'textures', make: (x, y, s) => ({ type: 'meshgrad', x, y, r: R(s * 0.7), preset: 'orb' }) },
  { id: 'meshrect', label: 'Mesh gradient', cat: 'textures', make: (x, y, s) => ({ type: 'meshgrad', x: R(x - s), y: R(y - s * 0.65), w: R(s * 2), h: R(s * 1.3), radius: R(s * 0.1) }) },
  { id: 'dither', label: 'Dither disc', cat: 'textures', make: (x, y, s) => ({ type: 'dither', x, y, r: R(s * 0.7), colors: ['coral', 'mustard'], mode: 'radial' }) },
  { id: 'dithersky', label: 'Dither fade', cat: 'textures', make: (x, y, s) => ({ type: 'dither', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), colors: ['blue', 'coral'], mode: 'linear', cell: 8, matrix: 8 }) },
  { id: 'halftone', label: 'Halftone', cat: 'textures', make: (x, y, s) => ({ type: 'halftone', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), color: 'tone', mode: 'radial' }) },
  { id: 'amtone', label: 'Riso screen', cat: 'textures', make: (x, y, s) => ({ type: 'amtone', x, y, r: R(s * 0.7), source: 'radial', colors: ['blue'], cell: 12 }) },
  { id: 'camo', label: 'Camo blobs', cat: 'textures', make: (x, y, s) => ({ type: 'camo', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), colors: ['green', 'tone-green'] }) },
  { id: 'shapegrid', label: 'Bauhaus grid', cat: 'textures', make: (x, y, s) => ({ type: 'shapegrid', x: R(x - s), y: R(y - s * 0.75), w: R(s * 2), h: R(s * 1.5), cols: 4, rows: 3, gap: 8, colors: ['ink', 'coral'] }) },
  { id: 'hatch', label: 'Hatching', cat: 'textures', make: (x, y, s) => ({ type: 'hatch', x: R(x - s * 0.8), y: R(y - s * 0.5), w: R(s * 1.6), h: R(s), color: 'blue', angle: 45 }) },
  { id: 'flowfield', label: 'Flow lines', cat: 'textures', make: (x, y, s) => ({ type: 'flowfield', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), colors: ['blue', 'coral'] }) },
  // ascii and dots
  { id: 'ascii-sphere', label: 'ASCII planet', cat: 'ascii', make: (x, y, s) => ({ type: 'glyphfill', shape: 'sphere', x, y, size: R(s * 1.4), land: 0.4, color: 'blue', cell: 9 }) },
  { id: 'ascii-ring', label: 'ASCII ring', cat: 'ascii', make: (x, y, s) => ({ type: 'glyphfill', shape: 'ring', x, y, size: R(s * 1.3), color: 'coral', cell: 9 }) },
  { id: 'ascii-star', label: 'ASCII star', cat: 'ascii', make: (x, y, s) => ({ type: 'glyphfill', shape: 'star', x, y, size: R(s * 1.3), color: 'mustard', cell: 9 }) },
  { id: 'dot-disc', label: 'Dot disc', cat: 'ascii', make: (x, y, s) => ({ type: 'glyphfill', shape: 'circle', mode: 'dot', x, y, size: R(s * 1.3), color: 'blue', cell: 12, light: { mode: 'radial', from: 1, to: 0.2 } }) },
  { id: 'worldmap', label: 'Dot world map', cat: 'ascii', make: (x, y, s) => ({ type: 'dotmatrix', x: R(x - s * 1.2), y: R(y - s * 0.6), w: R(s * 2.4), h: R(s * 1.2), mask: 'world', cell: 12, color: 'blue', faint: 'tone' }) },
  { id: 'echo-circle', label: 'Echo stack', cat: 'ascii', make: (x, y, s) => ({ type: 'echo', shape: 'circle', x, y, size: R(s * 0.9), n: 8, from: 'tone', to: 'blue', outline: 'ink' }) },
  // 3d (soft finish reads best)
  { id: 'sphere3d', label: 'Glossy ball', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'sphere3d', x, y, size: R(s * 1.1), colors: ['coral', 'mustard'] }) },
  { id: 'torus3d', label: 'Ring', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'torus3d', x, y, size: R(s * 1.3), colors: ['blue', 'tone'], rotate: [60, 0, 20] }) },
  { id: 'capsule3d', label: 'Pill', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'capsule3d', x, y, size: R(s * 1.4), colors: ['coral', 'paper'], rotate: [0, 0, -30] }) },
  { id: 'blob3d', label: 'Blob', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'blob3d', x, y, size: R(s * 1.1), colors: ['tone', 'blue'], seed: 3 }) },
  { id: 'cubes3d', label: 'Blocks', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'cubes3d', x, y, size: R(s * 1.3), rows: 3, cols: 3, maxHeight: 4, colors: ['blue', 'tone'], colorBy: 'height', seed: 2 }) },
  { id: 'ribbon3d', label: 'Ribbon', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'ribbon3d', preset: 'loop', x, y, size: R(s * 1.6), width: R(s * 0.3), colors: ['coral', 'mustard', 'blue'] }) },
  { id: 'tube3d', label: 'Knot', cat: '3d', soft: true, make: (x, y, s) => ({ type: 'tube3d', preset: 'knot', x, y, size: R(s * 1.3), width: R(s * 0.18), colors: ['blue', 'tone'] }) },
  { id: 'iso-street', label: 'Little street', cat: '3d', make: (x, y, s) => ({ type: 'iso', preset: 'street', seed: 2, fit: [R(x - s * 1.4), R(y - s), R(s * 2.8), R(s * 2)] }) },
  { id: 'iso-city', label: 'Little city', cat: '3d', make: (x, y, s) => ({ type: 'iso', preset: 'city', seed: 1, fit: [R(x - s * 1.4), R(y - s), R(s * 2.8), R(s * 2)] }) },
  // charts
  { id: 'bars', label: 'Bar chart', cat: 'charts', make: (x, y, s) => ({ type: 'bars', x: R(x - s), y: R(y - s * 0.7), w: R(s * 2), h: R(s * 1.4), values: [3, 5, 4, 7], labels: ['Q1', 'Q2', 'Q3', 'Q4'], highlight: 3, showValues: true }) },
  { id: 'donut', label: 'Donut', cat: 'charts', make: (x, y, s) => ({ type: 'donut', x, y, r: R(s * 0.55), values: [55, 30, 15], labels: ['Yes', 'No', 'Maybe'] }) },
  { id: 'pie', label: 'Pie', cat: 'charts', make: (x, y, s) => ({ type: 'pie', x, y, r: R(s * 0.55), values: [50, 30, 20] }) },
  { id: 'linechart', label: 'Line chart', cat: 'charts', make: (x, y, s) => ({ type: 'linechart', x: R(x - s), y: R(y - s * 0.6), w: R(s * 2), h: R(s * 1.2), values: [2, 4, 3, 6, 5, 8], area: true, dots: true }) },
  { id: 'isochart', label: 'Icon chart', cat: 'charts', make: (x, y, s) => ({ type: 'isochart', x: R(x - s), y: R(y - s * 0.4), values: [6, 3], labels: ['Tea', 'Coffee'], unit: 1, size: R(s * 0.3) }) },
  // etching
  { id: 'terrain', label: 'Wire terrain', cat: 'etch', make: (x, y, s) => ({ type: 'terrain', x: R(x - s * 1.4), y: R(y - s * 0.8), w: R(s * 2.8), h: R(s * 1.6), color: 'blue', ground: 'paper' }) },
  { id: 'ridgelines', label: 'Ridgelines', cat: 'etch', make: (x, y, s) => ({ type: 'ridgelines', x: R(x - s * 1.2), y: R(y - s * 0.8), w: R(s * 2.4), h: R(s * 1.6), color: 'ink', ground: 'paper', lines: 24 }) },
  { id: 'moon', label: 'Etched moon', cat: 'etch', make: (x, y, s) => ({ type: 'engrave', mode: 'globe', x, y, r: R(s * 0.65), color: 'ink', ground: 'paper' }) },
  { id: 'etch-land', label: 'Etched landscape', cat: 'etch', make: (x, y, s) => ({ type: 'engrave', mode: 'landscape', x: R(x - s * 1.2), y: R(y - s * 0.8), w: R(s * 2.4), h: R(s * 1.6), color: 'ink', ground: 'paper' }) },
  // people
  { id: 'person', label: 'Person', cat: 'people', make: (x, y, s) => ({ type: 'person', x, y: R(y + s * 0.7), size: R(s * 1.4), pose: 'walking' }) },
  { id: 'people', label: 'People', cat: 'people', make: (x, y, s) => ({ type: 'people', x: R(x - s), y: R(y + s * 0.6), w: R(s * 2), n: 4, size: R(s * 1.1) }) },
  { id: 'crowd', label: 'Crowd', cat: 'people', make: (x, y, s) => ({ type: 'crowd', x: R(x - s * 1.2), y: R(y), w: R(s * 2.4), rows: 3, size: R(s * 0.5) }) },
  { id: 'isotype', label: 'Pictogram grid', cat: 'people', make: (x, y, s) => ({ type: 'isotype', x: R(x - s), y: R(y - s * 0.3), cols: 10, rows: 2, size: R(s * 0.2), share: 0.3, color: 'tone', highlight: 'coral' }) },
];
