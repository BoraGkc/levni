// The Library's search index: [name, category, tags, variant notes, aliases, author] per drawing, fetched by /library/ for
// search, shelves and pagination (the page itself ships only the first page of tiles).
import props from '../data/props.json';

export const GET = () =>
  new Response(JSON.stringify(props.map((p: { name: string; category: string; tags: string[]; variants: string[]; aliases?: string[]; author?: string }) => [p.name, p.category, p.tags, p.variants, p.aliases || [], p.author || ''])), {
    headers: { 'Content-Type': 'application/json' },
  });
