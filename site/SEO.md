# Blog SEO checklist

Every post in `src/content/blog/` must have this before it ships. The templates add the rest.

## Frontmatter
- `title`: 60 characters or fewer, main keyword early. The site adds ` · Levni`.
- `description`: 140 to 160 characters (the schema enforces 120 to 160), keyword early, one plain sentence. It is the meta description, the Open Graph text and the dek.
- `date`, and `updated` when a change is material. Slug never changes (add a redirect if one ever must).
- `category`, `kind`, `coverAlt` (describes the cover plainly), `faq` with 3 to 5 entries.
- `og` is optional: `public/blog/<slug>/og.png` is used by default.

## Body
- One H1 (the template draws it from `title`); H2 for sections, H3 only under an H2. No FAQ heading in the body.
- First paragraph names the main keyword naturally.
- Every image has descriptive alt text and an italic caption on the next line.
- At least three internal links: related posts, a `/docs/` page (`getting-started`, `mcp`, `cli`, `boards`, `posters`, `elements`) and `/features/` or `/gallery/`. The closing "Reference and examples" line carries the docs, features and gallery links.
- Install facts: live npm package is `@levni/levni` 0.2.0. Posters and `type` need 0.3.0 (`npm install github:BoraGkc/levni` until it is published): say so in any post that uses them.
- Plain British English, no hype words, no em dashes.

## Added by the templates
- Canonical URL, Open Graph and Twitter card (summary_large_image) with the post's `og.png`.
- JSON-LD: BlogPosting (headline, description, image, dates, author and publisher Ortak Alan, word count, reading time), BreadcrumbList, FAQPage from `faq`.
- Reading time, table of contents, author box, previous and next, and a related block (same category plus shared keywords).
- Category pages have their own title and description (`src/blog.ts`), CollectionPage and breadcrumb schema.
- Sitemap with `lastmod` per post (`updated`, else `date`); `robots.txt` points to `sitemap-index.xml`; RSS at `/blog/rss.xml`.
