// Turkish guides on Ortak Alan (ortakalan.io/atolye/), the publication that makes Levni.
// <TurkishGuides path="/mcp/" /> shows the guides picked for that page; a page not listed here shows nothing.
// Before a deploy, check every href still returns 200 and drop any that do not.
const OA = 'https://ortakalan.io/atolye';

export const TR_GUIDES = {
  'free-ai-images': { href: `${OA}/yapay-zeka-ile-ucretsiz-gorsel-uretme/`, title: 'Yapay zekâ ile ücretsiz görsel üretme', en: 'Free ways to make images with AI' },
  'blog-covers': { href: `${OA}/blog-kapak-gorseli-nasil-yapilir/`, title: 'Blog kapak görseli nasıl yapılır?', en: 'How to make a blog cover image' },
  'what-is-mcp': { href: `${OA}/mcp-nedir/`, title: 'MCP nedir, nasıl kurulur?', en: 'What MCP is and how to set it up' },
  'design-mcp': { href: `${OA}/tasarim-icin-mcp-sunuculari/`, title: 'Tasarım için MCP sunucuları', en: 'MCP servers for design work' },
  'social-sizes': { href: `${OA}/sosyal-medya-gorsel-boyutlari/`, title: 'Sosyal medya görsel boyutları 2026', en: 'Social media image sizes, 2026' },
  'free-illustration': { href: `${OA}/ucretsiz-illustrasyon-ve-lisanslar/`, title: 'Ücretsiz illüstrasyon ve lisanslar', en: 'Free illustrations and how to read their licences' },
  'open-design-tools': { href: `${OA}/acik-kaynak-tasarim-araclari/`, title: 'Açık kaynak tasarım araçları', en: 'Open-source design tools, by job' },
} as const;

export type TrGuideKey = keyof typeof TR_GUIDES;

// Two or three per page, the closest matches only.
export const TR_GUIDES_BY_PATH: Record<string, TrGuideKey[]> = {
  '/': ['free-ai-images', 'blog-covers', 'what-is-mcp'],
  '/manifesto/': ['open-design-tools', 'free-illustration', 'free-ai-images'],
  '/mcp/': ['what-is-mcp', 'design-mcp'],
  '/docs/getting-started/': ['what-is-mcp', 'free-ai-images', 'blog-covers'],
  '/make/blog-covers-og-images/': ['blog-covers', 'social-sizes'],
  '/lists/': ['open-design-tools', 'design-mcp', 'free-illustration'],
  '/blog/one-style-500-articles/': ['blog-covers', 'free-ai-images', 'social-sizes'],
};
