// Blog shelves. Slugs are the URL of the category page: /blog/category/<slug>/
// `title` is the <title> (before the site suffix) and `description` the meta description (140-160 characters), unique per shelf.
export const CATEGORIES = {
  agents: { label: 'Agents & MCP', blurb: 'Let Claude, Codex and other agents draw, check and ship illustrations.',
    title: 'Illustration MCP server guides for AI agents', description: 'Guides for giving Claude, Codex, Cursor and VS Code an illustrator: MCP server setup, the layout critic, blog covers and Ghost drafts, all from JSON scenes.' },
  covers: { label: 'Covers & publishing', blurb: 'Article covers, social cards and spot art for blogs and newsletters.',
    title: 'Blog cover and social image guides', description: 'How to make blog covers, Open Graph cards, social media image sizes, charts and 3D covers from JSON scenes, in one consistent style, with no image model.' },
  library: { label: 'Library & drawing', blurb: 'The Levni Folio: finding, drawing and contributing props.',
    title: 'Free illustration and icon library guides', description: 'Guides to the Levni Folio: free CC BY 4.0 illustrations, 481 pixel art icons, 3D icons, faceless people, and how to draw and contribute your own SVG props.' },
  brand: { label: 'Style & brand', blurb: 'Style packs, brand colours and keeping one look across hundreds of images.',
    title: 'Brand asset and style guides', description: 'Make brand assets from JSON: brand boards, branding posters, seals and stickers, dither, mesh gradients, terrain and style packs in your own colours.' },
  stories: { label: 'Stories', blurb: 'How Levni is made and used.',
    title: 'Levni stories and release notes', description: 'How Levni is made and used: the launch story, release tours and how Ortak Alan illustrated about 500 articles in one hand-inked style, with style packs.' },
} as const;

export type Category = keyof typeof CATEGORIES;

// ~230 words a minute, code blocks count half
export function readMinutes(body: string) {
  const code = (body.match(/```[\s\S]*?```/g) || []).join(' ');
  const prose = body.replace(/```[\s\S]*?```/g, ' ');
  const words = prose.split(/\s+/).filter(Boolean).length + code.split(/\s+/).filter(Boolean).length / 2;
  return Math.max(1, Math.round(words / 230));
}

export const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
