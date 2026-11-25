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
// Blog posts and docs pages -> the maker that lets a reader try the topic at once. A maker's own guide post maps
// to it automatically (data/make.ts guide); these are the other posts. Not listed: the editor.
const POSTS: Record<string, string> = {
  '3d-cover-images-json': '3d-icons', 'open-graph-images-json': 'blog-covers-og-images', 'social-media-image-sizes': 'blog-covers-og-images',
  'ghost-featured-images-ai': 'blog-covers-og-images', 'one-style-500-articles': 'blog-covers-og-images', 'isometric-diorama-illustrations': 'isometric-illustrations',
  'draw-svg-icons-json': '3d-icons', 'levni-brand-assets': 'stickers-seals-tickets',
};
export const MAKE_FOR_DOC: Record<string, string> = { boards: 'brand-board', posters: 'branding-posters', 'getting-started': 'blog-covers-og-images' };
export function makerForPost(slug: string) {
  const own = MAKE.find((m) => m.guide.href === `/blog/${slug}/`);
  return own || MAKE.find((m) => m.slug === POSTS[slug]) || null;
}
for (const slug of [...Object.values(MAKE_FOR_FEATURE), ...Object.values(MAKE_FOR_GROUP), ...Object.values(POSTS), ...Object.values(MAKE_FOR_DOC)])
  if (!MAKE.some((m) => m.slug === slug)) throw new Error(`no /make/ page ${slug}`);

// "Sticker maker" -> "sticker maker", but "3D icon maker" and "ASCII art maker" keep their capitals
export const lowerName = (s: string) => (/^[A-Z0-9]{2}/.test(s) ? s : s[0].toLowerCase() + s.slice(1));
