// Blog shelves. Slugs are the URL of the category page: /blog/category/<slug>/
export const CATEGORIES = {
  agents: { label: 'Agents & MCP', blurb: 'Let Claude, Codex and other agents draw, check and ship illustrations.' },
  covers: { label: 'Covers & publishing', blurb: 'Article covers, social cards and spot art for blogs and newsletters.' },
  library: { label: 'Library & drawing', blurb: 'The Levni Folio: finding, drawing and contributing props.' },
  brand: { label: 'Style & brand', blurb: 'Style packs, brand colours and keeping one look across hundreds of images.' },
  stories: { label: 'Stories', blurb: 'How Levni is made and used.' },
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
