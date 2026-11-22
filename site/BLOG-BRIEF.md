# How to write a Levni blog post

Read this whole file before writing. Posts live in `site/src/content/blog/<slug>.md`; their images are Levni scenes in `site/scenes/blog/<slug>/`.
(This brief lives in `site/BLOG-BRIEF.md`, outside the content folder.)

## Facts: only these sources
Read before writing, and claim nothing they do not support: `README.md`, `docs/scene.md`, `CONTRIBUTING.md`, `docs/prop-prompt.md`, `src/mcp.mjs` (MCP tool names and fields), `site/src/pages/index.astro`, `site/src/pages/library/index.astro`, the existing posts in this folder.
- Install: `npm install github:BoraGkc/levni` (not on npm yet). CLI: `levni render | sheet | list | add | check | mcp`.
- MCP tools: `scene_guide`, `list_props`, `show_props`, `render_scene`, `critique_scene`. Claude Code: `claude mcp add levni -- npx -y github:BoraGkc/levni mcp`.
- Library: 1,039 props (481 pixel icons), 2,792 variants, 15 categories, CC BY 4.0 (“drawings by Ortak Alan”). Code MIT. No image model, no API key, zero cost per image.
- `style` is `"riso"`, `"miniature"` or your own inks `{ "blue": "#…", … }`.
- Ortak Alan drew about 500 article covers with it. Do not invent other numbers, customers, quotes, benchmarks or prices. For other products (Midjourney, DALL·E, Canva…) describe only general, well-known traits; no prices, no feature claims you cannot back.

## Shape (copy it)
Frontmatter:
```yaml
---
title: "Verb-first title with the main keyword, under 65 characters"
description: "One sentence, 140-165 characters, keyword early. It is the meta description and the subtitle."
date: 2026-11-22
category: agents | covers | library | brand | stories
kind: Guide | Explainer | Comparison | Story
coverAlt: "What the cover shows, plainly"
faq:
  - q: "A question people search for?"
    a: "Two or three plain sentences."
---
```
Body, 1,400–2,000 words:
1. Intro: 3–4 short paragraphs, no heading. The problem, what the reader will make, what it costs (nothing), what they need.
2. 5–8 H2 sections with verb-first headings (“Write the scene”, “Read the critic’s notes”). Guides are a linear procedure; each step has a code block, a table or an image.
3. At least one prompt box for agents: a fenced `text` block with a prompt someone can paste into Claude or Codex.
4. A check step (render, read the critic, fix) and a “what to do next” closing paragraph with 2–3 internal links.
5. FAQ: 3–5 entries in frontmatter only (the page renders them and adds FAQ schema). No FAQ heading in the body.

Style: plain English, British spelling (colour), short sentences, second person. No hype words (revolutionary, seamless, unlock, game-changer, leverage, delve). No em dashes; use commas, colons or full stops. Headings in sentence case. Every code block must be real: scene JSON that renders, commands that exist.

Links: internal to `/library/`, `/library/?c=<category>`, `/#agents`, and other posts by slug: generate-blog-covers-claude-code, illustration-mcp-server-setup, brand-colour-illustrations, open-graph-images-json, draw-svg-icons-json, ai-images-vs-programmatic-illustration, agent-layout-critic, one-style-500-articles, isometric-illustrations-json, free-illustrations-commercial-use, style-packs, introducing-levni. External only to official docs (modelcontextprotocol.io, docs.anthropic.com, creativecommons.org, ogp.me…).

## Images: the whole point
Every post has a cover and 2–4 inline images, all drawn by Levni.
- `site/scenes/blog/<slug>/cover.json`: the cover. 1200 × 673 canvas, one clear focal subject that says what the post is about, house riso style unless the post is about colour. No text in the image.
- `site/scenes/blog/<slug>/fig-1.json`, `fig-2.json`…: inline images that SHOW the step: the scene before and after a fix, the same drawing in three palettes, a contact sheet of props, a cover next to its social card crop. Prefer images that teach over decoration.
- Write scenes with `docs/scene.md`. Find props with `node bin/levni.mjs list <word>` (run from the repo root). Use real prop names and variants.
- In the post: `![Alt text that describes the image](/blog/<slug>/fig-1.webp)` then on the next line an italic caption: `*The scene above, rendered with the riso pack.*`
- Render and check: from `site/`, run `node scripts/render-blog.mjs`. It prints the critic's notes for each scene; fix every note unless the post is showing a bad layout on purpose. Then LOOK at each image with your image-reading tool (`site/public/blog/<slug>/*.webp`) and fix what reads badly: crowded, tiny subject, empty half, clashing colours.
- When a post shows a scene's JSON, the image next to it must be that exact scene.

## Do not
Edit anything outside `site/src/content/blog/<your slugs>.md` and `site/scenes/blog/<your slugs>/`. Run builds or test suites. Commit.
