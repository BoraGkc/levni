// The /make/<slug>/ pages: one search intent each, the same funnel on every page
// (try it in the embedded editor -> open the full editor -> add Levni to your agent -> star on GitHub).
// Facts follow docs/scene.md, docs/board.md, docs/poster.md and the gallery; no invented numbers.
// Slugs: lowercase ASCII, 2-5 words; never renamed without a redirect.
// examples: gallery items as "group/id" (public/g/<group>/<id>.json + .webp). Every example loads into the embedded
// editor, except groups that are not scenes (boards: they render in Node with `levni board`).
export type MakePage = {
  slug: string;
  title: string; // <title>, 60 characters or fewer with " · Levni"
  description: string; // 140-160 characters
  eyebrow: string; // short name, also used in menus and "more free makers"
  h1: string;
  lede: string;
  demo: { src: string; note: string }; // the embedded editor's first scene: "group/id"
  examples: string[];
  uses: { title: string; text: string }[];
  prompt: string; // for an agent with the Levni MCP server
  code: string; // a small scene (or spec) that renders
  codeCmd: string;
  faq: { q: string; a: string }[];
  guide: { text: string; href: string };
  docs: { text: string; href: string };
};

const FREE_FAQ = (what: string) => ({
  q: `Is it free to make ${what}?`,
  a: 'Yes. No account, no sign-up and no limit. Levni runs in your browser here, and on your own machine through npm or MCP, so there is no image model and no cost per picture. The drawings are CC BY 4.0: use them commercially with credit “drawings by Ortak Alan”.',
});
const AGENT_FAQ = {
  q: 'Can my AI assistant make these for me?',
  a: 'Yes. Add the Levni MCP server to Claude Code, Claude Desktop, Codex or Cursor and describe what you want in plain words. It draws on your machine, so the plan you already pay for is enough: no image credits.',
};

export const MAKE: MakePage[] = [
  {
    slug: 'stickers-seals-tickets',
    title: 'Free sticker, seal and ticket maker',
    description: 'Make seals with ring text, die-cut stickers, ticket stubs and loyalty cards in your browser. Free, no sign-up, hand-inked drawings, PNG or SVG.',
    eyebrow: 'Sticker maker',
    h1: 'Stickers, seals and tickets, drawn by hand in seconds.',
    lede: 'A seal with words around the ring, a die-cut sticker from any of 1,600 drawings, a ticket stub with a real perforation. Change the words and colours right here, then download PNG or SVG.',
    demo: { src: 'stickers/01-seal-sheet', note: 'Click a seal or a sticker to select it. Double-click text to change the words; Replace swaps the drawing; the colour dot recolours it.' },
    examples: ['stickers/01-seal-sheet', 'stickers/02-seal-loyalty', 'stickers/03-seal-est', 'stickers/04-diecut-pack', 'stickers/05-seal-night', 'stickers/06-ringtext-badge'],
    uses: [
      { title: 'Seals with ring text', text: 'Scalloped, perforated, zigzag or plain edges. Words run around the ring and close the loop exactly, with a word, a number or a drawing in the middle.' },
      { title: 'Die-cut stickers', text: 'Any drawing in the library gets a thick paper edge and a soft shadow, like a sticker peeled off a sheet.' },
      { title: 'Ticket stubs', text: 'A ticket with a perforation and exact half-round notches: a main line, a small rotated line on the stub, your colours.' },
      { title: 'Loyalty cards and badges', text: 'Put a stub, a row of stamp circles and a seal together for a coffee card, an event badge or a launch sticker sheet.' },
    ],
    prompt: 'Make a sticker sheet for my café “Kumru” with Levni: a scalloped coral seal with “slow coffee · since 2026” around the ring and a coffee cup in the middle, a ticket stub reading “Her 10. kahve bizden”, and three die-cut stickers (a dove, a croissant, a heart) on a blue ground. Read the critic, fix what it reports, and save stickers.png.',
    code: `{ "seed": 3, "background": "blue", "elements": [
  { "type": "seal", "x": 420, "y": 336, "size": 380, "edge": "scallop", "fill": "coral",
    "color": "ink", "textColor": "ink", "text": "slow coffee", "sep": "✦", "prop": "coffee-cup" },
  { "type": "prop", "name": "heart", "x": 840, "y": 220, "size": 180, "rot": -12, "diecut": { "offset": 16 } },
  { "type": "stub", "x": 700, "y": 420, "w": 420, "h": 160, "fill": "paper", "text": "Admit one", "stubText": "no. 0412", "color": "ink" }
] }`,
    codeCmd: 'npx @levni/levni render scene.json stickers.png',
    faq: [
      FREE_FAQ('stickers'),
      { q: 'Can I print the stickers?', a: 'Download the SVG for print: it is vector, so it stays sharp at any size and opens in Illustrator, Inkscape or Figma. The PNG at 2× works for screens and small prints.' },
      { q: 'How do I put text around a circle?', a: 'Select the seal and edit its text: the words repeat around the ring and close the loop. In a scene, give a seal a text, or use top and bottom for two arcs.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: seals, badges and stickers from JSON', href: '/blog/seal-badge-sticker-generator/' },
    docs: { text: 'Seal recipes in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'brand-board',
    title: 'Free brand board generator from four fields',
    description: 'A brand board from a name, a tagline, a mark and your inks: logo, palette, web page, social card, tote, sticker and business card. Free and local.',
    eyebrow: 'Brand board generator',
    h1: 'A whole brand board from four fields.',
    lede: 'Give a name, a tagline, a mark from the library and up to five inks. Levni lays out the board designers post to show an identity: mark, wordmark, palette, web page, social card, tote, sticker, pattern and business card.',
    demo: { src: 'posters/01-kumru-split', note: 'Boards are drawn by the npm package and your agent. Here, edit a poster from the same kind of brand spec: change the words, the inks and the mark.' },
    examples: ['boards/01-feneri', 'boards/03-firin', 'boards/05-lale'],
    uses: [
      { title: 'Nine tiles in one image', text: 'Mark, wordmark, web page in a browser, palette, social card (1200 × 630), tote bag, sticker, pattern and a tilted business card.' },
      { title: 'Your colours everywhere', text: 'The darkest ink becomes the ground and text, a light one the paper, the others accents. Every drawing on the board follows them.' },
      { title: 'A mark from 1,600 drawings', text: 'Pick a lighthouse, a loaf, a tulip or any other drawing in the library as the symbol of the brand.' },
      { title: 'Editable, not a flat picture', text: 'The board is a spec you can print, edit and render again; every tile is a scene you can open on its own.' },
    ],
    prompt: 'Make a brand board with Levni for “Feneri”, slow ferries across the Bosphorus. Use a lighthouse as the mark and these inks: #14213D, #FCA311, #3A86A8, #EFEAE0. Render it with render_board, save board.png, and tell me which tile you would change.',
    code: `{ "brand": { "name": "Feneri", "tagline": "Slow ferries across the Bosphorus", "mark": "lighthouse",
             "inks": ["#14213D", "#FCA311", "#3A86A8", "#EFEAE0"] } }`,
    codeCmd: 'npx @levni/levni board brand.json board.png',
    faq: [
      FREE_FAQ('a brand board'),
      { q: 'What goes on the board?', a: 'Mark, wordmark, a web page in a browser window, the palette, a 1200 × 630 social card, a tote bag, a sticker, a pattern and a business card. Fields next to the brand override any of them.' },
      { q: 'Can I make posters in the same style?', a: 'Yes. The same brand spec with words added becomes a series of eight branding posters with `levni poster`, or the render_poster tool in your agent.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: a brand board generator', href: '/blog/brand-board-generator/' },
    docs: { text: 'Brand boards in the docs', href: '/docs/boards/' },
  },
  {
    slug: 'branding-posters',
    title: 'Free branding poster maker: eight posters',
    description: 'One brand spec becomes a series of eight branding posters: halftone, dot-matrix maps, module grids, camouflage and big type. Edit them in your browser.',
    eyebrow: 'Poster maker',
    h1: 'A poster series for your brand, from one spec.',
    lede: 'Name, tagline, mark, inks and four words. Levni draws eight portrait posters that share one look: big type from bundled fonts, halftone, dot-matrix maps, module grids, camouflage and grain. Edit one right here.',
    demo: { src: 'posters/10-bauhaus', note: 'Double-click a word to change it, pick another ink with the colour dot, or use Look to change the whole palette.' },
    examples: ['posters/01-kumru-split', 'posters/03-zeytin-map', 'posters/05-orbit-echo', 'posters/07-summit', 'posters/11-worldmap', 'posters/12-echo'],
    uses: [
      { title: 'Launch an identity', text: 'Eight posters in one series (split, map, bauhaus, echo, camo, vertical, summit, launch) plus a contact sheet to post.' },
      { title: 'Type that looks the same everywhere', text: 'Space Grotesk, Archivo Black, JetBrains Mono and Departure Mono, drawn as paths, so a poster never falls back to another font.' },
      { title: 'Print textures without a filter app', text: 'Halftone, ordered dither, dot-matrix world maps, noise blobs and grain are part of the scene.' },
      { title: 'One word per poster', text: 'Give four words and each poster leads with one; Turkish casing is automatic.' },
    ],
    prompt: 'Make a poster series for my brand “Kumru”, slow coffee for fast mornings. Use a dove as the mark, these inks: #14181F, #1F3BE0, #F0573A, #F1EEE6, and the words Roast, Pour, Share, Brew. Render it with render_poster into a folder called posters and tell me which two work best.',
    code: `{ "brand": { "name": "Kumru", "tagline": "Slow coffee for fast mornings, roasted in Izmir",
             "mark": "dove", "inks": ["#14181F", "#1F3BE0", "#F0573A", "#F1EEE6"],
             "words": ["Roast", "Pour", "Share", "Brew"] } }`,
    codeCmd: 'npx @levni/levni poster brand.json posters/',
    faq: [
      FREE_FAQ('branding posters'),
      { q: 'What size are the posters?', a: 'Portrait, 1200 × 1600. The editor can resize a poster to a square, a story or a cover, and everything on it moves with it.' },
      { q: 'Can I edit one poster?', a: 'Yes. Ask your agent for render_poster with scenes: true to get each poster as a scene, or open an example here and change it in the editor.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: a branding poster generator', href: '/blog/branding-poster-generator/' },
    docs: { text: 'Posters in the docs', href: '/docs/posters/' },
  },
  {
    slug: 'dither-pixel-art',
    title: 'Free dither and pixel art background maker',
    description: 'Make dithered pixel art backgrounds: Bayer skies, 1-bit fades, dithered suns and swatches in your inks. Free in the browser, PNG or SVG, no sign-up.',
    eyebrow: 'Dither maker',
    h1: 'Dithered pixel skies and suns, in your colours.',
    lede: 'Ordered (Bayer) dither in square, dot, line or plus cells, walking through as many inks as you like. Make a pixel sunset for a landing page or a 1-bit fade for a launch post, then download it.',
    demo: { src: 'brand/01-dither-sunset', note: 'Select the sky or the sun and change its colour; Re-ink gives the same layout a new hand.' },
    examples: ['brand/01-dither-sunset', 'brand/02-dither-swatches'],
    uses: [
      { title: 'Pixel skies', text: 'A sky that steps from one ink to the next in dither cells, with a dithered sun low on the horizon.' },
      { title: '1-bit fades', text: 'A flat colour that fades to paper in a clean ordered pattern, for headers and section breaks.' },
      { title: 'Four cell shapes', text: 'Square, dot, line or plus cells, in linear, radial, noise or flat ramps.' },
      { title: 'Print screens in Node', text: 'In the npm package and MCP, a whole scene can be printed through 1-bit, riso, blueprint, Game Boy or newsprint screens.' },
    ],
    prompt: 'Write a 1200 by 673 hero in ordered dither with Levni: a sky fading from blue to coral in square cells, a dithered sun low on the right, a dark band with line dither at the bottom. Keep the left third calm for a headline. Save hero.png.',
    code: `{ "seed": 4, "elements": [
  { "type": "dither", "x": 0, "y": 0, "w": 1200, "h": 673, "colors": ["coral", "blue"], "angle": 90, "cell": 12 },
  { "type": "dither", "x": 860, "y": 420, "r": 150, "color": "mustard", "mode": "radial" }
] }`,
    codeCmd: 'npx @levni/levni render scene.json hero.png',
    faq: [
      FREE_FAQ('dithered backgrounds'),
      { q: 'What is ordered dither?', a: 'A fixed pattern (a Bayer matrix) decides which cells take which ink, so a gradient becomes a clean grid of pixels instead of noise.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: dithered pixel art backgrounds', href: '/blog/dither-pixel-art-backgrounds/' },
    docs: { text: 'Dither recipes in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'mesh-gradients',
    title: 'Free mesh gradient generator with grain',
    description: 'Make grainy mesh gradients, glowing orbs and squircle tiles for hero backgrounds, with a calm zone for your headline. Free in your browser, PNG or SVG.',
    eyebrow: 'Mesh gradient maker',
    h1: 'Grainy mesh gradients, orbs and tiles.',
    lede: 'Soft colour fields with film grain, for a hero background, a launch post or a set of feature tiles. Keep a quiet zone for the headline, pick your colours, download it.',
    demo: { src: 'brand/07-meshgrad-hero', note: 'Select the gradient to change its size, or use Look to try the soft finish and another palette.' },
    examples: ['brand/07-meshgrad-hero', 'brand/08-meshgrad-orbs', 'brand/09-meshgrad-tiles'],
    uses: [
      { title: 'Hero backgrounds', text: 'A full-bleed field of blended colours with a calm side where the headline stays readable.' },
      { title: 'Glowing orbs', text: 'Round gradient orbs that sit behind a product, a number or a drawing.' },
      { title: 'Feature tiles', text: 'Squircle tiles, each a different blend, for a feature grid or app icons.' },
      { title: 'Your colours', text: 'Give a list of colours or exact stops; grain is part of the soft finish.' },
    ],
    prompt: 'Make a mesh gradient background for my landing page in coral, violet and cyan with Levni, with a calm zone on the left where the headline goes. Then draw six squircle tiles in matching blends on one sheet.',
    code: `{ "seed": 7, "finish": "soft", "elements": [
  { "type": "meshgrad", "x": 0, "y": 0, "w": 1200, "h": 673 },
  { "type": "meshgrad", "x": 900, "y": 336, "r": 180, "preset": "orb" }
] }`,
    codeCmd: 'npx @levni/levni render scene.json hero.png',
    faq: [
      FREE_FAQ('mesh gradients'),
      { q: 'Why does it look grainy?', a: 'Grain hides banding in smooth gradients and gives them a printed feel. The soft finish adds a fine film grain; its strength is the scene’s grain field.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: mesh gradient backgrounds', href: '/blog/mesh-gradient-backgrounds/' },
    docs: { text: 'Meshgrad recipes in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'ascii-art',
    title: 'Free ASCII art generator from drawings',
    description: 'Turn any of 1,600 drawings into ASCII art, block art or a dot-matrix silhouette: globes, icons and social cards. Free in your browser, PNG or SVG.',
    eyebrow: 'ASCII art maker',
    h1: 'ASCII art from any drawing.',
    lede: 'Pick a drawing from the library and Levni fills its silhouette with characters, blocks or dots. Strokes and rims follow their angle with - \\ | /, so it reads as the object, not as noise.',
    demo: { src: 'brand/12-glyphfill-og-card', note: 'Select the ASCII shape, open Effects to switch between ink, 3D, ASCII and dots, or Replace it with another drawing.' },
    examples: ['brand/10-glyphfill-globe', 'brand/11-glyphfill-coffee', 'brand/12-glyphfill-og-card'],
    uses: [
      { title: 'ASCII silhouettes', text: 'Any library drawing as text characters, with the strokes drawn by their angle.' },
      { title: 'Block and dot matrix', text: 'The same silhouette in blocks or round dots, like an LED sign.' },
      { title: 'Shaded globes and shapes', text: 'A globe with continents, circles, rings, stars and rectangles filled with glyphs.' },
      { title: 'Developer social cards', text: 'A dark card with an ASCII object and a command line, made for launch posts.' },
    ],
    prompt: 'Make an ASCII-style OG card with Levni on a dark ground: a rocket filled with dots on the right, “JSON in. Illustration out.” on the left, and a command line in small mono type at the bottom. Save og-ascii.png.',
    code: `{ "seed": 2, "background": "dark", "elements": [
  { "type": "glyphfill", "prop": "rocket", "x": 860, "y": 336, "size": 420, "mode": "glyph", "color": "paper" },
  { "type": "type", "text": "JSON in.\\nIllustration out.", "x": 80, "y": 230, "size": 64, "font": "black", "color": "paper" }
] }`,
    codeCmd: 'npx @levni/levni render scene.json og-ascii.png',
    faq: [
      FREE_FAQ('ASCII art'),
      { q: 'Which drawings work as ASCII?', a: 'Any drawing in the library: its filled shapes become the silhouette. In the editor, select a drawing, open Effects and pick ASCII or Dot matrix.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: ASCII art illustrations', href: '/blog/ascii-art-illustrations/' },
    docs: { text: 'Glyphfill recipes in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'wireframe-terrain-etching',
    title: 'Wireframe terrain, ridgelines and etching maker',
    description: 'Draw wireframe terrain heroes, stacked ridgelines and etched engravings of mountains and moons. Free in your browser, PNG or SVG, no image model.',
    eyebrow: 'Terrain and etching maker',
    h1: 'Wireframe terrain, ridgelines and etchings.',
    lede: 'A dark developer hero with wireframe hills and a glowing horizon, a stack of ridgelines like an album cover, an etched mountain or moon in pen lines. All from code, all in your colours.',
    demo: { src: 'lines/01-terrain-hero', note: 'Select the terrain to change its colour, or add a drawing above the ridge from Drawings.' },
    examples: ['lines/01-terrain-hero', 'lines/03-ridgelines-og', 'lines/05-engrave-poster', 'lines/06-engrave-moon', 'lines/07-engrave-night', 'lines/08-engrave-radial'],
    uses: [
      { title: 'Wireframe terrain', text: 'Rows of hills converging to a horizon, with a skyline ridge, valleys and a glow.' },
      { title: 'Ridgelines', text: 'Stacked profile lines where each one hides the ones behind it, with peaks in the centre or random.' },
      { title: 'Etched landscapes', text: 'Mountains and a sun in engraved lines whose thickness follows the light.' },
      { title: 'Globes and moons', text: 'Latitude hatching for globes and moons, radial and noise engravings for backgrounds.' },
    ],
    prompt: 'Draw a wireframe terrain hero with Levni for a developer tools site: dark ground, light lines, a coral glow on the horizon, a few mustard streams in the valleys and a small rocket above the ridge. Save terrain.png.',
    code: `{ "seed": 6, "background": "dark", "elements": [
  { "type": "terrain", "color": "tone", "ground": "dark" },
  { "type": "prop", "name": "rocket", "x": 900, "y": 150, "size": 140, "rot": 30 }
] }`,
    codeCmd: 'npx @levni/levni render scene.json terrain.png',
    faq: [
      FREE_FAQ('terrain and etching art'),
      { q: 'Are these vector?', a: 'Yes. Download SVG and every line stays a line, ready for a plotter, a laser cutter or a big print.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: wireframe terrain and engraving', href: '/blog/wireframe-terrain-engraving/' },
    docs: { text: 'Line-art recipes in the scene format', href: '/docs/elements/' },
  },
  {
    slug: '3d-icons',
    title: 'Free 3D icon maker: 1,600 drawings in 3D',
    description: 'Turn any of 1,600 library drawings into a thick, lit 3D icon, recolour it and download PNG or SVG. Free 3D icons for apps and sites, no sign-up.',
    eyebrow: '3D icon maker',
    h1: 'Every drawing as a 3D icon.',
    lede: 'Pick a drawing and Levni extrudes its filled shapes into one thick object with rounded edges, raised lines and a soft light. Recolour it to your brand and download it.',
    demo: { src: 'icons/row', note: 'Select an icon, then Replace it with any drawing in the library, or open Effects to switch it back to ink, ASCII or dots.' },
    examples: ['icons/01-rocket', 'icons/07-coffee-cup', 'icons/14-cat', 'icons/19-robot', 'icons/30-turkish-coffee-cup', 'icons/02-lightbulb'],
    uses: [
      { title: 'App and feature icons', text: 'A rocket, a bulb, a cup or a heart in 3D, all in the same light and depth.' },
      { title: 'Any drawing, not a fixed set', text: 'Every one of the 1,600 drawings can be extruded, from a tea glass to a lighthouse.' },
      { title: 'Your colours', text: 'Recolour the icon or use a palette; the lines can be raised or switched off.' },
      { title: 'Soft 3D covers', text: 'Put icons on a soft 3D cover with glossy ribbons, rings and knots behind them.' },
    ],
    prompt: 'Make five 3D icons with Levni in a row on paper: a rocket, a bulb, a coffee cup, a trophy and a heart, all the same size, in my inks #6A1B9A and #00BFA5. Save icons.png.',
    code: `{ "seed": 3, "finish": "soft", "elements": [
  { "type": "extrude3d", "name": "rocket", "x": 360, "y": 336, "size": 300 },
  { "type": "extrude3d", "name": "coffee-cup", "x": 840, "y": 336, "size": 300 }
] }`,
    codeCmd: 'npx @levni/levni render scene.json icons.png',
    faq: [
      FREE_FAQ('3D icons'),
      { q: 'Can I use the icons in an app?', a: 'Yes, commercially too, with credit “drawings by Ortak Alan”. Download PNG at 2× for screens or SVG for any size.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: free 3D icons', href: '/blog/free-3d-icons/' },
    docs: { text: '3D elements in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'isometric-illustrations',
    title: 'Free isometric illustration maker',
    description: 'Draw little isometric 3D worlds from one line: cities and streets on a floating slab with soft shadows. Free in your browser, PNG or SVG, no image model.',
    eyebrow: 'Isometric maker',
    h1: 'Little isometric worlds from one line.',
    lede: 'Say city or street and Levni lays out a seeded diorama on a floating slab: buildings, roads, trees, lamps and people, with soil layers and a soft shadow. Re-ink for a new layout.',
    demo: { src: 'worlds/city-riso-2', note: 'Press Re-ink to grow another city, or use Look to switch between riso and the soft toy-3D finish.' },
    examples: ['worlds/city-riso-2', 'worlds/city-soft', 'worlds/city-riso-5', 'worlds/street-riso-2', 'worlds/street-soft', 'worlds/street-blue'],
    uses: [
      { title: 'Cities and streets', text: 'Presets lay out a whole world; the seed changes it, so every cover can have its own.' },
      { title: 'Rooms, cafés and offices', text: 'Interiors with walls, windows, furniture and people are drawn by the npm package and your agent.' },
      { title: 'Riso or toy 3D', text: 'The same world in hand-inked riso or in a smooth soft style with pastel colours.' },
      { title: 'Calm blues for hard news', text: 'A blue-only palette for stories about loss, disaster or courts.' },
    ],
    prompt: 'Draw an isometric city on a floating slab with Levni, in the soft style, for the cover of my post “Cities that walk”. Try three seeds, show them to me and save the best as cover.png.',
    code: `{ "seed": 2, "elements": [
  { "type": "iso", "preset": "city", "seed": 2 }
] }`,
    codeCmd: 'npx @levni/levni render scene.json city.png',
    faq: [
      FREE_FAQ('isometric illustrations'),
      { q: 'Can I change what is in the world?', a: 'Change the seed for a new layout. For full control, the iso element takes a list of objects (walls, roofs, roads, trees, cars, people and more) in the scene code.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: isometric illustrations from JSON', href: '/blog/isometric-illustrations-json/' },
    docs: { text: 'Little 3D worlds in the docs', href: '/docs/elements/' },
  },
  {
    slug: 'hand-drawn-charts',
    title: 'Hand-drawn chart maker: bars, lines, donuts',
    description: 'Make hand-inked bar charts, line charts, pies, donuts and pictogram charts from plain numbers. Free in your browser, PNG or SVG, for articles and posts.',
    eyebrow: 'Chart maker',
    h1: 'Charts that look drawn by hand.',
    lede: 'Bars, lines, pies, donuts and pictogram rows from plain numbers, in the same inked style as the drawings. Made for articles and social posts where a spreadsheet chart looks out of place.',
    demo: { src: 'charts/dashboard', note: 'Open Code to change the numbers, or select a label and double-click it to change the words.' },
    examples: ['charts/bars', 'charts/donut', 'charts/lines', 'charts/isochart-people', 'charts/pie-blue', 'charts/dashboard'],
    uses: [
      { title: 'Bars and lines', text: 'Vertical or horizontal bars from a zero baseline; one line per series, with dots or a filled area.' },
      { title: 'Pies and donuts', text: 'Slices from values, one pulled out to highlight it, labels beside them.' },
      { title: 'Pictogram charts', text: 'Rows of people or any library drawing, a part icon cropped to the remainder.' },
      { title: 'Charts inside drawings', text: 'Put a chart on a TV screen or a laptop with fusion slots.' },
    ],
    prompt: 'Draw a hand-inked donut chart with Levni: 46% mobile, 28% desktop, 16% tablet, 10% other, with the mobile slice pulled out, and “46% of visits are mobile” beside it in big type. Save chart.png.',
    code: `{ "seed": 5, "elements": [
  { "type": "donut", "x": 420, "y": 336, "r": 230, "values": [46, 28, 16, 10], "highlight": 0 },
  { "type": "label", "text": "46%", "x": 760, "y": 300, "size": 64 }
] }`,
    codeCmd: 'npx @levni/levni render scene.json chart.png',
    faq: [
      FREE_FAQ('hand-drawn charts'),
      { q: 'Are the numbers real?', a: 'The chart draws exactly the values you give it. The examples here use sample data; replace the values with yours in Code.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: hand-drawn charts', href: '/blog/hand-drawn-charts/' },
    docs: { text: 'Chart elements in the scene format', href: '/docs/elements/' },
  },
  {
    slug: 'blog-covers-og-images',
    title: 'Free blog cover and Open Graph image maker',
    description: 'Make blog covers and Open Graph images in one hand-inked style: 1,600 drawings, your colours, every size from cover to story. Free, no sign-up, PNG.',
    eyebrow: 'Blog cover maker',
    h1: 'Blog covers and link previews in one style.',
    lede: 'Compose a cover from the library, put a headline on it and download it as a cover, a 1200 × 630 link preview, a square, a story or a YouTube thumbnail. Ortak Alan drew about 500 article covers this way.',
    demo: { src: 'formats/2-og', note: 'Change the headline with a double-click, swap the drawing with Replace, then use Size to make the same picture for another format.' },
    examples: ['covers/cover-riso', 'covers/mix-riso', 'covers/spot-riso', 'covers/slots-tv', 'covers/oa-delpy', 'covers/oa-ice'],
    uses: [
      { title: 'Article covers', text: 'One focal drawing, a panel and a few marks, in the same hand on every post.' },
      { title: 'Open Graph images', text: 'A 1200 × 630 card with the title as the headline, for X, LinkedIn and chat previews.' },
      { title: 'Every format at once', text: 'Cover, link preview, square, story and YouTube: the layout is recomposed, not cropped.' },
      { title: 'A layout critic', text: 'Levni flags crops, lopsided weight and pictures with no focus before you publish.' },
    ],
    prompt: 'Draw a cover for my article “Why every newsroom wants a data desk” with Levni. Search the library for two or three fitting drawings, compose a riso scene with room on the left for the title, fix every critic note and save it as cover.webp and og.png.',
    code: `{ "seed": 5, "format": "og", "elements": [
  { "type": "panel", "x": 640, "y": 0, "w": 560, "h": 630, "color": "blue" },
  { "type": "prop", "name": "rocket", "x": 920, "y": 315, "size": 320, "rot": 20, "shadow": true },
  { "type": "type", "text": "Launch day.", "x": 70, "y": 260, "size": 88, "font": "black", "color": "ink" }
] }`,
    codeCmd: 'npx @levni/levni render scene.json og.png',
    faq: [
      FREE_FAQ('blog covers'),
      { q: 'Which sizes can I make?', a: 'Cover 1200 × 673, link preview 1200 × 630, square 1080, story 1080 × 1920, YouTube 1280 × 720 and a 3:4 poster. In the editor, Size changes it and everything moves with it.' },
      { q: 'Can my CMS make covers automatically?', a: 'Yes. Levni has Ghost tools for agents that add covers and inline images to drafts, and the npm package can render covers in a build step.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: blog covers with Claude Code', href: '/blog/generate-blog-covers-claude-code/' },
    docs: { text: 'Getting started', href: '/docs/getting-started/' },
  },
  {
    slug: 'pixel-icons',
    title: 'Free pixel art icon maker: 481 icons',
    description: 'Use 481 pixel art icons in riso colours or your own brand inks: mail, cloud, search, power and more on a crisp pixel grid. Free, PNG or SVG, no sign-up.',
    eyebrow: 'Pixel icon maker',
    h1: 'Pixel art icons in your colours.',
    lede: 'The Folio holds 481 pixel icons drawn on a strict grid. Lay out a sheet, recolour it to your brand and download it for a game, an app or a retro landing page.',
    demo: { src: 'pixel/grid-riso', note: 'Select an icon to Replace it (search “pixel”), or use Look to switch the whole sheet to another palette.' },
    examples: ['pixel/grid-riso', 'pixel/grid-brand', 'pixel/grid-miniature'],
    uses: [
      { title: '481 icons', text: 'Interface, weather, media, files and objects, all on the same pixel grid.' },
      { title: 'Your inks', text: 'Every icon follows the palette: riso, miniature or your own brand colours.' },
      { title: 'Sharp at any size', text: 'Download SVG and the pixels stay square at any scale.' },
      { title: 'Pixel type to match', text: 'Departure Mono, a pixel font, is bundled for titles that fit the icons.' },
    ],
    prompt: 'Make a sheet of twelve pixel icons with Levni for my game menu: mail, search, cloud, power, star, heart, settings, play, pause, music, trophy and a key, in two rows, in my inks #1F3BE0 and #F0573A. Save icons.png.',
    code: `{ "seed": 2, "elements": [
  { "type": "prop", "name": "pixel-mail", "x": 300, "y": 336, "size": 160 },
  { "type": "prop", "name": "pixel-search", "x": 600, "y": 336, "size": 160 },
  { "type": "prop", "name": "pixel-power", "x": 900, "y": 336, "size": 160 }
] }`,
    codeCmd: 'npx @levni/levni render scene.json icons.png',
    faq: [
      FREE_FAQ('pixel icons'),
      { q: 'How do I find a pixel icon?', a: 'In the editor’s Drawings panel, search “pixel” plus a word, for example “pixel mail”. In the library page, search the same way and copy the code.' },
      AGENT_FAQ,
    ],
    guide: { text: 'Guide: free pixel art icons', href: '/blog/free-pixel-art-icons/' },
    docs: { text: 'The library', href: '/docs/library/' },
  },
];
