// Which /make/ page a features section and a gallery group lead to. Checked at build time against data/make.ts.
import { MAKE } from './make';
export const MAKE_FOR_FEATURE: Record<string, string> = {
  scenes: 'blog-covers-og-images', boards: 'brand-board', posters: 'branding-posters', seals: 'stickers-seals-tickets',
  dither: 'dither-pixel-art', mesh: 'mesh-gradients', glyphfill: 'ascii-art', terrain: 'wireframe-terrain-etching',
  icons3d: '3d-icons', pixel: 'pixel-icons', iso: 'isometric-illustrations', charts: 'hand-drawn-charts',
};
export const MAKE_FOR_GROUP: Record<string, string> = {
  posters: 'branding-posters', boards: 'brand-board', stickers: 'stickers-seals-tickets', lines: 'wireframe-terrain-etching',
  pixel: 'pixel-icons', worlds: 'isometric-illustrations', charts: 'hand-drawn-charts', covers: 'blog-covers-og-images',
  icons: '3d-icons', formats: 'blog-covers-og-images',
};
for (const slug of [...Object.values(MAKE_FOR_FEATURE), ...Object.values(MAKE_FOR_GROUP)])
  if (!MAKE.some((m) => m.slug === slug)) throw new Error(`no /make/ page ${slug}`);
