// The Library's search index: [name, category, tags, variant notes] per drawing, fetched by /library/ for
// search, shelves and pagination (the page itself ships only the first page of tiles).
import props from '../data/props.json';

export const GET = () =>
  new Response(JSON.stringify(props.map((p) => [p.name, p.category, p.tags, p.variants])), {
    headers: { 'Content-Type': 'application/json' },
  });
