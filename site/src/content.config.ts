import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(120).max(160),
    date: z.coerce.date(),
    og: z.string().optional(),
    draft: z.boolean().default(false),
    // shelf and label, like a magazine section: see src/blog.ts
    category: z.enum(['agents', 'covers', 'library', 'brand', 'stories']).default('stories'),
    kind: z.enum(['Guide', 'Explainer', 'Comparison', 'Story']).default('Guide'),
    author: z.string().default('Ortak Alan'),
    updated: z.coerce.date().optional(),
    // cover drawn by Levni from scenes/blog/<slug>/cover.json (render with `npm run blog`)
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
    featured: z.boolean().default(false),
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
  }),
});

export const collections = { blog };
