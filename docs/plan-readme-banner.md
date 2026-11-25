# Plan: free README banner tool (levni.dev/banner/)

Status: phase 1 built on 25 Nov 2026 (/banner/ and the /editor/, Levni in the browser). Phase 2 (live image URL) not started.

## What it is

Paste a GitHub repo link, get a 1280 × 640 hand-inked banner (GitHub social preview size) for the README and the repo's social preview. No sign-up, no AI model. Every banner carries a small `levni.dev` mark, and the copy-ready snippet links back to the tool.

Goal: marketing. Every README that embeds a banner is a backlink and a Levni sample in front of developers, the people who install the MCP server.

Existing tool in this space: Socialify (socialify.git.ci, open source) makes flat text-and-logo cards. Levni's edge is the illustration: a drawing picked from the repo itself.

## How a banner is made (deterministic, $0 per image)

1. **Read the repo**: GitHub REST `GET /repos/{owner}/{repo}` gives name, description, topics, language, stars. In the browser, unauthenticated (60 requests/hour per visitor IP, enough for one person).
2. **Pick the mark**: search the Folio's ~11,800 tags (EN + TR) with the topics, then the description's words, then the language. Fall back to a fixed set (rocket, toolbox, lightbulb). No LLM.
3. **Pick the inks**: GitHub's language colour as the accent, house riso inks for the rest. The user can change them.
4. **Compose**: an `og`-style scene with the title layer (name = headline, description = subline, language · ★ stars = kicker), the mark as hero prop, seed from the repo name, so the same repo always gives the same picture.
5. **Controls**: shuffle (new seed), swap the drawing (Library search), style pack (riso / miniature / soft), light or dark, inks. Live preview.
6. **Export**: PNG 1280 × 640 and SVG, plus copy-ready snippets: README markdown (image linked to levni.dev/banner/) and a note to upload the PNG in Settings → Social preview.

## The one real piece of engineering: Levni without Node

`compose()` is nearly pure, but some modules read files or call sharp:

- `props.mjs`, `icon.mjs`: read the Folio from disk → give them a loader (a prebuilt JSON index the site already has, `props-index.json`, plus per-drawing fetch).
- `title.mjs`, `type.mjs`: read fonts with `node:fs` → load the font bytes through the same loader (`fetch` in the browser).
- `raster.mjs`: the crayon finish uses sharp for the noise field → in the browser, let the SVG's own `feTurbulence` filter do it and draw to a canvas. Slower than the Node path but fine for one image.
- `glyphs`, `dither`, `print`, `ribbon`: need sharp; leave them out of the browser build (the banner does not use them).

Result: `@levni/levni/browser`, an entry that runs in the browser (and later in a Worker). Node behaviour unchanged. Tests: existing render tests must give the same SVG.

## Phases

**Phase 1, browser only (recommended start).** The browser entry + the `/banner/` page on levni.dev. Static site, no server, no running cost. About 2–3 days of work: 1–1.5 for the browser entry, 1 for the page, half a day for the batch below.

**Phase 2, live image URL (later, needs approval).** `https://levni.dev/r/{owner}/{repo}.png`: a Worker that reads the repo and renders on request (resvg-wasm instead of sharp), cached at the edge for a day. The README always shows the current star count, and every README view loads from levni.dev. Before building it: measure CPU time per render on a Worker and work out the month's cost against the Workers Paid plan limits, then get the owner's yes (project rule for metered workloads).

## Shipping batch (one release, per the house rule)

- Tool page `/banner/` linked from the header, landing and MCP page.
- A `github` format (1280 × 640) in `formats.mjs`, also usable from the CLI and MCP (`--format github`).
- Gallery: ten banners from well-known open-source repos (only names and descriptions, no logos).
- Blog post with those banners; Levni's own README gets a Levni banner.
- Docs: `docs/scene.md` (format), README table line; changelog entry.
- npm + MCP Registry release once at the end.

## Next tools on the same engine (after this one)

Launch poster kit (one paragraph → X, LinkedIn, Product Hunt images; uses `poster`), brand board from a name (`board`), blog OG image from a URL, release card from a changelog.

## Open questions for the owner

1. Is a small `levni.dev` mark on every banner OK, or only in the snippet's link?
2. Default style: riso, or soft 3D (looks more "dev tool")?
3. Phase 2 live URL: worth the edge cost later?
