// Release notes for /changelog/. Newest first. Links are site paths or full URLs.
export type Link = { text: string; href: string };
export type Release = {
  version: string;
  date: string; // ISO
  title: string;
  note?: string;
  summary: string;
  items: { text: string; links?: Link[] }[];
  posts?: Link[];
};

export const RELEASES: Release[] = [
  {
    version: '0.3.0',
    date: '2026-11-24',
    title: 'Type engine and branding posters',
    note: 'Not on npm yet: 0.2.0 is the published version. To try 0.3.0 now, run npm install github:BoraGkc/levni.',
    summary: 'Levni can set type itself and turns one brand spec into a series of eight posters.',
    items: [
      { text: 'Faster renders: the crayon finish is now applied to the pixels in JavaScript instead of by the SVG renderer, about seven times faster for the default look (about 1 s down to 0.15 s for a cover), with the same picture. Set LEVNI_RASTER=rsvg to use the old path.', links: [{ text: 'How it works', href: '/blog/faster-renders/' }, { text: 'rasterize() in the API', href: '/docs/api/#export' }] },
      { text: 'The type element draws text as paths from bundled open fonts (Space Grotesk, Archivo Black, JetBrains Mono, Departure Mono), so a poster looks the same on every machine.' },
      { text: 'The block element, for tight stacks of big words.' },
      { text: 'Poster formats, so a scene can start from a portrait poster size.' },
      { text: 'Print textures: amtone halftone, camo blobs, grain and a per-element screen pass.' },
      { text: 'Shapes and furniture: shapegrid, echo, dotmatrix and furniture elements.' },
      { text: 'levni poster and the render_poster MCP tool: one brand spec becomes eight posters (split, map, bauhaus, echo, camo, vertical, summit, launch) and a series sheet.', links: [{ text: 'Poster guide', href: '/blog/branding-poster-generator/' }] },
      { text: 'Site: branding posters in the gallery, features page and MCP page; a new header, footer and this changelog.', links: [{ text: 'Gallery', href: '/gallery/#posters' }] },
      { text: 'Folio for contributors: renamed props keep their old names as aliases, a JSON schema for prop files, a test that refuses brand names, automatic checks on every pull request, a Code of Conduct and a no-logos statement.', links: [{ text: 'Why no logos', href: 'https://github.com/BoraGkc/levni/blob/main/BRAND_LOGOS.md' }] },
      { text: 'Library: each drawing shows its tags (click one to search), credit, related drawings, Copy and Download SVG buttons and its own link (/library/?p=name); a search with no results offers to ask for the drawing.', links: [{ text: 'Library', href: '/library/' }] },
      { text: 'Better search: about 7,500 new tags, English and Turkish, on 1,090 drawings (the redrawn Tabler icons now carry Tabler’s own search words). Search for a brand to learn why the Folio has no logos.', links: [{ text: 'Library', href: '/library/' }] },
      { text: '31 drawings with numbered names were renamed for what they show (armchair-2 is now armchair-padded, settings-2 is hex-nut); the old names still work in scenes.' },
      { text: 'Library code tabs (Scene, JavaScript, CLI), variant notes under each drawing, an Improve this drawing link, and the / key to jump to search.' },
      { text: 'Landing, features, MCP page, docs (CLI, API, MCP, library, getting started), footer and README updated for the new Library and the naming rules.' },
      { text: 'Folio guide: how to draw, name and tag a prop, and how to use drawings accessibly; levni add now prints style hints.', links: [{ text: 'Folio guide', href: 'https://github.com/BoraGkc/levni/blob/main/docs/folio-guide.md' }] },
    ],
    posts: [{ text: 'Branding poster generator', href: '/blog/branding-poster-generator/' }, { text: 'Search a free illustration library in English and Turkish', href: '/blog/search-free-illustration-library/' }],
  },
  {
    version: '0.2.0',
    date: '2026-11-23',
    title: 'Brand assets and brand boards',
    summary: 'Levni learns the look of brand work: print grain, gradients, stickers, line art and whole boards.',
    items: [
      { text: 'dither elements and a scene-level screen print pass (gameboy, blueprint and more).', links: [{ text: 'Dither guide', href: '/blog/dither-pixel-art-backgrounds/' }] },
      { text: 'meshgrad: grainy mesh gradients with a calm zone for a headline.', links: [{ text: 'Mesh gradient guide', href: '/blog/mesh-gradient-backgrounds/' }] },
      { text: 'glyphfill: ASCII and dot-matrix fills from any drawing.', links: [{ text: 'ASCII guide', href: '/blog/ascii-art-illustrations/' }] },
      { text: 'seal, ringtext, stub and diecut: seals, tickets and stickers.', links: [{ text: 'Seal and sticker guide', href: '/blog/seal-badge-sticker-generator/' }] },
      { text: 'terrain, ridgelines and engrave: wireframe landscapes and etched plates.', links: [{ text: 'Terrain and engraving guide', href: '/blog/wireframe-terrain-engraving/' }] },
      { text: 'Brand boards: levni board and the render_board MCP tool turn one brand spec into nine tiles.', links: [{ text: 'Brand board guide', href: '/blog/brand-board-generator/' }] },
      { text: 'Site: gallery and features pages for the new brand assets, seven posts.', links: [{ text: 'Gallery', href: '/gallery/#brand' }] },
    ],
    posts: [
      { text: 'Levni 0.2: brand assets', href: '/blog/levni-brand-assets/' },
      { text: 'Brand board generator', href: '/blog/brand-board-generator/' },
    ],
  },
  {
    version: '0.1.0',
    date: '2026-11-22',
    title: 'First release',
    summary: 'The illustration engine and the Levni Folio library, extracted from Ortak Alan and opened up.',
    items: [
      { text: 'The Levni Folio: an open library of hand-inked props, CC BY 4.0, with a community path to add more.', links: [{ text: 'Library', href: '/library/' }] },
      { text: 'Scenes from JSON, with the layout critic that reports crops, lopsided weight and missing focal points.' },
      { text: 'Style packs and your own inks, including a miniature pack.' },
      { text: 'Soft 3D covers and 3D icons, isometric worlds and faceless people.', links: [{ text: 'Features', href: '/features/#soft' }] },
      { text: 'Fusion slots, hand-inked charts, pixel icons and every social format.', links: [{ text: 'Charts', href: '/features/#charts' }] },
      { text: 'An MCP server so agents can search, look, draw and check, plus optional Ghost tools for drafts.', links: [{ text: 'MCP', href: '/mcp/' }] },
    ],
    posts: [{ text: 'Introducing Levni', href: '/blog/introducing-levni/' }],
  },
];
