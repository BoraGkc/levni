// The /tools/ pages: free generators that run Levni in the browser (no server, no sign-up, no watermark).
// Slugs are final: lowercase ASCII, hyphens; never renamed without a redirect.
export type Tool = { href: string; name: string; text: string };

export const TOOLS: Tool[] = [
  { href: '/tools/mesh-gradient-generator/', name: 'Mesh gradient generator', text: 'Grainy mesh gradient backgrounds in your colours, sized for OG cards, stories, YouTube or a 1920 × 1080 hero. PNG at 1× or 2×, or SVG.' },
  { href: '/tools/svg-pattern-generator/', name: 'SVG pattern generator', text: 'Brand patterns from Levni textures: confetti, dot grids, shape grids, waves, hatching and more, in two or three of your inks.' },
  { href: '/tools/blob-wave-generator/', name: 'Blob and wave generator', text: 'Smooth blobs, waves and section dividers as clean single-path SVG. Copy the code or download SVG and PNG.' },
  { href: '/tools/og-image-generator/', name: 'OG image generator', text: 'A 1200 × 630 Open Graph image with your title and a hand-drawn picture from the Folio. Ready-made meta tag snippet.' },
];

export const MORE_TOOLS: Tool[] = [
  { href: '/banner/', name: 'README banner maker', text: 'Paste a GitHub link and get a hand-inked 1280 × 640 banner for your README and social preview.' },
  { href: '/editor/', name: 'Levni editor', text: 'Open any scene, move things around, change words, drawings and colours, then download PNG or SVG.' },
];

// The answers every tool page shares. Plain facts only.
export const FREE_FAQ = {
  q: 'Is it really free?',
  a: 'Yes. No account, no sign-up, no watermark and no limit. The picture is drawn in your browser by Levni, the same open-source engine as the npm package, so nothing is uploaded and there is no server to pay for.',
};
export const JSON_FAQ = {
  q: 'What is the scene JSON for?',
  a: 'It is the whole picture as a Levni scene. Save it as scene.json and run npx @levni/levni render scene.json out.png to draw the same image on your machine, or hand it to an agent with the Levni MCP server and ask for changes. Same seed, same picture.',
};

export const toolJsonLd = (name: string, url: string, faq: { q: string; a: string }[]) => [
  { '@type': 'WebApplication', name, applicationCategory: 'DesignApplication', operatingSystem: 'Any (web browser)', url, offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@id': 'https://ortakalan.io/#organization' } },
  { '@type': 'FAQPage', mainEntity: faq.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
];

// Canvas size presets shared by the tool pages
export const SIZES: Record<string, { label: string; w: number; h: number }> = {
  og: { label: 'OG card 1200 × 630', w: 1200, h: 630 },
  square: { label: 'Square 1080 × 1080', w: 1080, h: 1080 },
  story: { label: 'Story 1080 × 1920', w: 1080, h: 1920 },
  youtube: { label: 'YouTube 1280 × 720', w: 1280, h: 720 },
  hd: { label: 'Desktop 1920 × 1080', w: 1920, h: 1080 },
};

