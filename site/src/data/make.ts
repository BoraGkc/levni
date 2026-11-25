// The /make/<slug>/ pages: one search intent each, the same funnel on every page
// (try it in the embedded editor -> open the full editor -> add Levni to your agent -> star on GitHub).
// Facts follow docs/scene.md and the gallery; no invented numbers. Slugs: lowercase ASCII, 2-5 words, never renamed
// without a redirect.
export type MakePage = {
  slug: string;
  title: string; // <title>, 60 characters or fewer with " · Levni"
  description: string; // 140-160 characters
  eyebrow: string;
  h1: string;
  lede: string;
  demo: { src?: string; tpl?: string; note: string }; // the embedded editor's first scene: a gallery scene path or an example id
  gallery: string; // gallery group in data/gallery.json
  uses: { title: string; text: string }[];
  prompt: string; // for an agent with the Levni MCP server
  code: string; // a small scene that renders
  faq: { q: string; a: string }[];
  guide: { text: string; href: string };
  docs: { text: string; href: string };
};

export const MAKE: MakePage[] = [
  {
    slug: 'stickers-seals-tickets',
    title: 'Free sticker, seal and ticket maker',
    description: 'Make seals with ring text, die-cut stickers, ticket stubs and loyalty cards in your browser. Free, no sign-up, hand-inked drawings, PNG or SVG.',
    eyebrow: 'Free sticker maker',
    h1: 'Stickers, seals and tickets, drawn by hand in seconds.',
    lede: 'A seal with words around the ring, a die-cut sticker from any of 1,600 drawings, a ticket stub with a real perforation. Change the words and colours right here, then download PNG or SVG.',
    demo: { src: '/g/stickers/01-seal-sheet.json', note: 'Click a seal or a sticker to select it. Double-click text to change the words; Replace swaps the drawing; the colour dot recolours it.' },
    gallery: 'stickers',
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
    faq: [
      { q: 'Is the sticker maker free?', a: 'Yes. No account, no sign-up and no limit. It runs the Levni engine in your browser, so nothing is uploaded. The drawings are CC BY 4.0, so you can print and sell what you make with credit “drawings by Ortak Alan”.' },
      { q: 'Can I print the stickers?', a: 'Download the SVG for print: it is vector, so it stays sharp at any size and opens in Illustrator, Inkscape or Figma. The PNG at 2× works for screens and small prints.' },
      { q: 'How do I put text around a circle?', a: 'Select the seal and edit its text: the words repeat around the ring and close the loop. In a scene, give a seal a text, or use top and bottom for two arcs.' },
      { q: 'Can my AI assistant make stickers for me?', a: 'Yes. Add the Levni MCP server to Claude Code, Claude Desktop, Codex or Cursor and describe the sheet you want. It draws on your machine, so the plan you already pay for is enough.' },
    ],
    guide: { text: 'Guide: seals, badges and stickers from JSON', href: '/blog/seal-badge-sticker-generator/' },
    docs: { text: 'Seal recipes in the scene format', href: '/docs/elements/' },
  },
];
