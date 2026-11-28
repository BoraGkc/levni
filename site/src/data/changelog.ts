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
    version: '0.5.0',
    date: '2026-11-28',
    title: 'Motion: loops, moving README banners, storyboards and brand kits',
    note: 'In the repository now; it reaches npm and the MCP Registry with 0.5.0.',
    summary: 'Any scene becomes a looping GIF, animated WebP or MP4, drawn on your machine. Plus a whole brand kit from one brand, and a storyboard from a shot list.',
    items: [
      { text: 'levni animate: a scene’s time runs from 0 to 1 and the picture moves. Clouds drift, flags wave, mesh gradients breathe, ASCII globes and soft 3D turn. Output is a looping GIF, an animated WebP or an MP4 (with ffmpeg). Same seed, same frames.', links: [{ text: 'Animation guide', href: 'https://github.com/Levni-Dev/levni/blob/main/docs/animate.md' }] },
      { text: 'Motion on any element: float, drift, orbit, sway, wiggle, pulse, spin and blink loop on their own; pop, fade, slide, wipe and typewriter play once and hold. Seventeen easing curves, stagger across elements, and a camera that pushes in and comes back.' },
      { text: 'README banners that move: the repo name types itself, the mark pops in and floats. The banner maker has a new Animated GIF button, drawn frame by frame in your browser.', links: [{ text: 'Make a banner', href: '/banner/' }] },
      { text: 'Smaller GIFs: Levni now writes GIFs with its own encoder, which stores only the pixels that change between frames. A moving banner is about 0.25 MB; the same frames through the old path were about three times that.' },
      { text: 'levni brand: one brand (a name, or a website to read the name and colours from) becomes a folder with the mark, favicons, palette, link preview, cover, square, story, README banner, brand board, posters and a loop, all in the same inks, with one page to look at them.', links: [{ text: 'Brand kit guide', href: 'https://github.com/Levni-Dev/levni/blob/main/docs/brandkit.md' }] },
      { text: 'levni storyboard: a shot list becomes a numbered sheet with titles, durations, timecodes and notes, plus full-size frames and a shots.json for your video tool.', links: [{ text: 'Storyboard guide', href: 'https://github.com/Levni-Dev/levni/blob/main/docs/storyboard.md' }] },
      { text: 'More ways out: frame sequences for Remotion, sprite sheets with an atlas, transparent PNGs (--transparent) and seamless square textures (--tile). New sizes: hd (1920 × 1080) and readme (1280 × 640).', links: [{ text: 'Export guide', href: 'https://github.com/Levni-Dev/levni/blob/main/docs/export.md' }] },
      { text: 'For agents: three new MCP tools, render_animation, render_storyboard and render_brand_kit. The critic now measures link previews, squares and stories against their own canvas (it used the cover size before).', links: [{ text: 'MCP tools', href: '/mcp/#tools' }] },
      { text: 'Fixes: the sunburst and the rose now close their loops.' },
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-25',
    title: 'The editor, the README banner maker and Levni in the browser',
    note: 'The editor and the banner maker are live on levni.dev now. The browser build reaches npm with 0.4.0.',
    summary: 'Levni runs in the browser: a free online design editor and a README banner maker, with no install and no sign-up.',
    items: [
      { text: 'A new header with three menus (Make, Resources, Community) that fold into a full-screen menu on phones, and a way to join: the Levni letter and the Folio crew Wanted list, kept in our own database.', links: [{ text: 'Join the crew', href: '/join/' }] },
      { text: 'The No FOMO lists: three open lists on GitHub with 240+ open design tools, open-source MCP servers for design and open type resources, now also browsable on levni.dev.', links: [{ text: 'No FOMO lists', href: '/lists/' }, { text: 'The story', href: '/blog/no-fomo-open-design-lists/' }] },
      { text: 'A new look for levni.dev: indigo, lime and red riso inks, a pixel tulip mark, a live ASCII tulip on the homepage, new share cards drawn by Levni itself, and a few easter eggs (try the Konami code). New pages: the manifesto, a post-AI center for designers, and the community page with six ways to add to the commons.', links: [{ text: 'The manifesto', href: '/manifesto/' }, { text: 'Community', href: '/community/' }] },
      { text: 'The Levni editor: drag drawings, shapes and type onto a canvas, edit what you select from a toolbar, turn a drawing into a 3D icon, ASCII, a dot matrix or an echo, add shadows and sticker edges, arrange layers, pick a size and a look, and download PNG, SVG or JSON. A share link holds the whole design.', links: [{ text: 'Open the editor', href: '/editor/' }, { text: 'The tour', href: '/blog/free-online-design-editor/' }] },
      { text: 'Editor polish: small labels can be selected on the canvas, double-click any text (or press Edit text) to change the words, eleven text styles and combinations with live previews (kicker and headline, light and heavy, outline over solid, big number, quote and more), a clear Any colour picker, and drag handles on layers.' },
      { text: 'Editor handling: parts snap to the page centre and margins while you drag (Alt moves freely), ⌘C and ⌘V copy a part to another page at the same place, new parts no longer land on your words, and the toolbar fits on phones.' },
      { text: 'Resize that keeps the design: backgrounds stretch, the rest keeps its shape, and a wide design turned tall (story, poster, square) puts the picture on top and the words under it. Look now pairs inks (Riso, Miniature, Mono, Forest, Night or your own five colours) with a finish (crayon or soft); templates have a search box, and 3D parts offer the soft finish in one click.' },
      { text: 'Settings that match each part: every element type (dither, mesh gradients, 3D shapes, little worlds, seals, tickets, terrain and more) shows its real options, with presets and palettes as menus, ink lists you can add to, and a Shuffle for a new layout. The most used ones sit in the toolbar above the canvas, next to one Settings button and Arrange.' },
      { text: 'Shapes: 63 ready-made parts in nine groups: basics, things, badges and labels, textures, ASCII and dots, 3D (glossy balls, rings, ribbons, knots, blocks, little streets and cities), charts, lines and etching, people.' },
      { text: 'Pages in the editor: make a carousel or a poster series in one design. Add, duplicate, reorder and delete pages in the strip under the canvas; download every page as PNG or JSON; a share link holds them all. One click turns a design into every size (link preview, square, story, YouTube, poster) as pages, and Brand → 8 posters draws a whole branding series from a name, a mark and four inks.', links: [{ text: 'Open the editor', href: '/editor/' }] },
      { text: 'Templates: 139 finished scenes from the gallery (posters, stickers, 3D icons, little worlds, charts, covers and more) open in the editor, on this page or as a new one. Draw all as… turns every drawing on a page into ink, 3D, ASCII, dots or echo at once.' },
      { text: 'Editor logic: a new drawing comes in the style the picture already uses (add one to an ASCII card and it arrives as ASCII, in the same inks), new colours are picked to read on the background, chart data (labels, numbers, colours, highlight) is edited in a table, and the Layers list no longer scrolls sideways. The library shows every drawing as ink, a 3D icon, ASCII, a dot matrix and an echo, and opens any of them in the editor.', links: [{ text: 'The library', href: '/library/' }] },
      { text: 'Free makers: twelve pages, each with the editor built in and an example loaded (stickers and seals, brand boards, branding posters, dither, mesh gradients, ASCII art, terrain and etching, 3D icons, isometric worlds, hand-drawn charts, blog covers, pixel icons). Pick an example, change it, download it, or open it in the full editor.', links: [{ text: 'All free makers', href: '/make/' }] },
      { text: 'The README banner maker: paste a GitHub link and get a 1280 × 640 banner for the README and the social preview, with the drawing picked from the repo’s topics.', links: [{ text: 'Make a banner', href: '/banner/' }] },
      { text: 'For developers: @levni/levni/browser runs compose() in the browser, with a Vite plugin (@levni/levni/vite) that swaps node:fs and sharp for small shims; @levni/levni/banner builds banner scenes.' },
      { text: 'Site: Editor in the header, and every page now ends on the same three steps: open the editor, add Levni to your agent, star it on GitHub. The MCP page shows Codex setup.', links: [{ text: 'MCP setup', href: '/mcp/#setup' }] },
    ],
    posts: [{ text: 'A free online design editor with hand-inked drawings', href: '/blog/free-online-design-editor/' }],
  },
  {
    version: '0.3.0',
    date: '2026-11-24',
    title: 'Type engine and branding posters',
    note: 'Not on npm yet: 0.2.0 is the published version. To try 0.3.0 now, run npm install github:Levni-Dev/levni.',
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
      { text: 'Folio for contributors: renamed props keep their old names as aliases, a JSON schema for prop files, a test that refuses brand names, automatic checks on every pull request, a Code of Conduct and a no-logos statement.', links: [{ text: 'Why no logos', href: 'https://github.com/Levni-Dev/levni/blob/main/BRAND_LOGOS.md' }] },
      { text: 'Library: each drawing shows its tags (click one to search), credit, related drawings, Copy and Download SVG buttons and its own link (/library/?p=name); a search with no results offers to ask for the drawing.', links: [{ text: 'Library', href: '/library/' }] },
      { text: 'Better search: about 7,500 new tags, English and Turkish, on 1,090 drawings (the redrawn Tabler icons now carry Tabler’s own search words). Search for a brand to learn why the Folio has no logos.', links: [{ text: 'Library', href: '/library/' }] },
      { text: '31 drawings with numbered names were renamed for what they show (armchair-2 is now armchair-padded, settings-2 is hex-nut); the old names still work in scenes.' },
      { text: 'Library code tabs (Scene, JavaScript, CLI), variant notes under each drawing, an Improve this drawing link, and the / key to jump to search.' },
      { text: 'Landing, features, MCP page, docs (CLI, API, MCP, library, getting started), footer and README updated for the new Library and the naming rules.' },
      { text: 'Folio guide: how to draw, name and tag a prop, and how to use drawings accessibly; levni add now prints style hints.', links: [{ text: 'Folio guide', href: 'https://github.com/Levni-Dev/levni/blob/main/docs/folio-guide.md' }] },
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
