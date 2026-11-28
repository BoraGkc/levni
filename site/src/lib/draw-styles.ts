// The six ways one Folio drawing can be drawn: ink, a 3D icon, ASCII, a dot matrix, dot lines or an echo.
// Shared by the editor (Effects, adding drawings) and the library dialog (style previews).
export type DrawBase = { name: string; variant?: number; x: number; y: number; size: number; color?: string };
export type DrawStyle = { id: 'ink' | '3d' | 'ascii' | 'dots' | 'dotline' | 'echo'; label: string; to: (b: DrawBase) => any };

export const DRAW_STYLES: DrawStyle[] = [
  { id: 'ink', label: 'Ink drawing', to: (b) => ({ type: 'prop', name: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size }) },
  { id: '3d', label: '3D icon', to: (b) => ({ type: 'extrude3d', name: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size }) },
  { id: 'ascii', label: 'ASCII', to: (b) => ({ type: 'glyphfill', prop: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size, mode: 'glyph', color: b.color ?? 'ink' }) },
  { id: 'dots', label: 'Dot matrix', to: (b) => ({ type: 'glyphfill', prop: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size, mode: 'dot', color: b.color ?? 'ink' }) },
  { id: 'dotline', label: 'Dot lines', to: (b) => ({ type: 'dotline', prop: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size, color: b.color ?? 'blue' }) },
  { id: 'echo', label: 'Echo', to: (b) => ({ type: 'echo', prop: b.name, variant: b.variant, x: b.x, y: b.y, size: b.size }) },
];

export const drawingName = (e: any): string | null =>
  e?.type === 'prop' || e?.type === 'extrude3d' ? e.name : (e?.type === 'glyphfill' || e?.type === 'echo' || e?.type === 'dotline') && typeof e.prop === 'string' ? e.prop : null;
export const styleOf = (e: any): DrawStyle['id'] =>
  e.type === 'extrude3d' ? '3d' : e.type === 'glyphfill' ? (e.mode === 'dot' ? 'dots' : 'ascii') : e.type === 'echo' ? 'echo' : e.type === 'dotline' ? 'dotline' : 'ink';

// `ref` drawn as another drawing: keeps its look (colours, cell, light, effects), takes the new drawing and place
export function likeDrawing(ref: any, b: DrawBase) {
  const o = structuredClone(ref);
  for (const k of ['x', 'y', 'size', 'variant', 'rot', 'flip', 'hidden', 'locked', 'id']) delete o[k];
  if (o.type === 'glyphfill' || o.type === 'echo' || o.type === 'dotline') o.prop = b.name; else o.name = b.name;
  if (b.variant != null) o.variant = b.variant;
  return { ...o, x: b.x, y: b.y, size: b.size };
}

// colour contrast, WCAG style
const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
export function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
}
export const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
