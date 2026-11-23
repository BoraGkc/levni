---
title: "Levni 0.2: Brand Assets, Dither, Seals and Boards"
description: "Levni 0.2 adds brand assets: dither and screen prints, mesh gradients, ASCII fills, seals and stickers, wireframe terrain, engravings and one-call brand boards."
date: 2026-11-23
updated: 2026-11-24
category: brand
kind: Story
coverAlt: "A blue dithered background with a coral scalloped seal holding a star, a perforated coffee seal, die-cut rocket and heart stickers and a ticket"
faq:
  - q: "What is new in Levni 0.2?"
    a: "New elements for brand assets: `dither` and a scene-level `screen` print pass, `meshgrad` gradients, `glyphfill` ASCII and dot-matrix fills, `ringtext`, `seal`, `stub` and `diecut` stickers, `terrain`, `ridgelines` and `engrave`. There is also a brand board command and a `render_board` MCP tool."
  - q: "Is Levni still free?"
    a: "Yes. The code is MIT and the drawings are CC BY 4.0. There is no image model, no account and no API key, so each image costs nothing."
  - q: "How do I install it?"
    a: "Run `npm install @levni/levni`, or use `npx @levni/levni` for the CLI. For an AI assistant, add the MCP server with `claude mcp add levni -- npx -y @levni/levni mcp`."
  - q: "Do my old scenes still render?"
    a: "The new features are new element types and a new scene field (`screen`), so a scene only changes if you add them. A scene is deterministic: same seed, same picture."
  - q: "Where are the full docs?"
    a: "The element tables and the recipes for each new feature are in `docs/scene.md`. Brand boards are in `docs/board.md`. Both are in the repository, and `scene_guide` and `render_board` with `guide: true` return them through MCP."
---

Levni began as a way to draw article covers in one hand-inked style. Version 0.2 widens that to the other pictures a small brand needs: a pixel background for a landing page, a grainy gradient for a launch post, a badge for a loyalty scheme, a hero for a developer tool, and the board that shows it all together.

Everything in this release is still a JSON element. There is no image model, no account and no API key, so each image costs nothing, and the same scene with the same seed draws the same picture. The code is MIT and the drawings are CC BY 4.0.

This post is a tour. Each section is short and links to a longer guide. You need Node 20 or later.

## Install or update

```bash
npm install @levni/levni
npx levni render scene.json out.png
```

To let an assistant drive it, add the MCP server to Claude Code:

```bash
claude mcp add levni -- npx -y @levni/levni mcp
```

The library now holds 1,577 drawings in 3,356 variants. The element reference and the recipes for everything below are in `docs/scene.md`.

## Dither and the screen pass

The `dither` element draws an ordered (Bayer) dither field. It has four cell shapes (square, dot, line, plus), four ramps (linear, radial, noise, flat) and can walk through several inks. It is made for pixel skies, 1-bit fades and dithered suns.

![A dithered sunset: a blue-to-coral pixel sky, a mustard half sun and line-dithered water](/blog/levni-brand-assets/fig-1.webp)
*A sunset from three `dither` elements and a panel.*

The scene-level `screen` field is a second tool. Add `"screen": "1bit"` to any scene and the finished picture is printed through a dither pass. The presets are `1bit`, `riso`, `blueprint`, `gameboy` and `newsprint`, or you can give your own cell size, matrix, inks and paper. In the MCP server, `render_scene` previews include the screen pass, so the assistant sees what you will get.

Read the full guide: [dithered pixel art backgrounds](/blog/dither-pixel-art-backgrounds/).

## Mesh gradients

`meshgrad` draws grainy mesh gradients from colour stops or a list of colours. It also draws orbs, squircle feature tiles and banded posters, and a `calm` field reserves a quiet zone for the title so headlines stay readable. It looks best with `"finish": "soft"`.

The guide covers the hero background, grain, orbs and tiles: [mesh gradient backgrounds](/blog/mesh-gradient-backgrounds/).

## ASCII and dot-matrix fills

`glyphfill` fills a silhouette with characters, blocks or dots whose density follows tone. The silhouette can be a library drawing or a primitive, and a `sphere` gets real lighting and continents you can spin.

![A globe drawn in text characters beside the headline one planet, all in text](/blog/levni-brand-assets/fig-2.webp)
*A shaded globe made of characters, with a lit side and a shadow side.*

See [ASCII art illustrations](/blog/ascii-art-illustrations/) for the globe, a dot-matrix rocket and a developer-tool Open Graph card.

## Seals, tickets and stickers

`seal` draws a stamp or badge with a scalloped, perforated, zigzag or plain edge, ring text around it and a word or a prop in the middle. `ringtext` sets text on any circle. `stub` is a ticket with a perforation and exact half-round notches. And a `diecut` field on any `prop` or `draw` turns it into a sticker with a thick paper outline, a hairline ink edge and a soft shadow.

They are the building blocks of the cover of this post. The guide shows how to build a loyalty badge and a sticker sheet: [seal, badge and sticker generator](/blog/seal-badge-sticker-generator/).

## Terrain and engraving

`terrain` draws wireframe hills in perspective, with hidden lines removed, a glowing horizon and streams that follow the valleys. `ridgelines` stacks profile lines, each hiding the ones behind it. `engrave` draws pen-hatch landscapes, radial and noise fields, and a hatched moon.

![Wireframe terrain at dusk with glowing mustard streams, a coral horizon and a small rocket](/blog/levni-brand-assets/fig-3.webp)
*A `terrain` hero on a dark ground: five glowing streams and a small rocket on the horizon.*

For the details, read [wireframe terrain and engraving](/blog/wireframe-terrain-engraving/).

## Brand boards in one call

The last piece ties the others together. `levni board` turns a short spec into one image with a whole identity on it. The one-call version needs four things:

```json
{ "brand": { "name": "Feneri", "tagline": "Slow ferries across the Bosphorus", "mark": "lighthouse",
             "inks": ["#14213D", "#FCA311", "#3A86A8", "#EFEAE0"] } }
```

That makes nine tiles: the mark, a wordmark, a web page in a browser window, a palette, a social card, a tote bag, a sticker, a pattern and a tilted business card. You can also place every tile yourself, with browser, card, tote and phone mockups.

![A brand board for a ferry company called Feneri: lighthouse mark, wordmark, web page, palette, social card, tote bag, sticker, pattern and business card](/blog/levni-brand-assets/feneri.webp)
*The Feneri board. The scene specs behind it are plain JSON.*

The board in the picture used a few more fields than the four above (a font, a URL and a person for the business card), written next to `brand`. Render one yourself:

```bash
npx levni board board.json board.png
```

The board guide covers every tile and field: [brand board generator](/blog/brand-board-generator/).

## Ask your assistant

The MCP server now has six tools: `scene_guide`, `list_props`, `show_props`, `render_scene`, `critique_scene` and the new `render_board`. It takes a `spec` (or just `{ "brand": ... }`) and an `out` path, and returns a preview. With `guide: true` it returns the board docs, so the assistant can read how to place tiles first.

```text
Use Levni to build a brand kit for "<name>", "<tagline>". Call render_board with
a brand spec (mark: "<prop name>", inks: [<four hex colours>]) and show me the
preview. Then read the board guide with guide: true and fix whatever looks weak.
After that, use render_scene to make a 1200 x 673 hero for the landing page:
a `meshgrad` background with a calm zone for the headline, and a `seal` as an
accent. Read scene_guide first and fix every critic note.
```

## Check what you made

Render each piece at full size and read the critic's notes. Dither and glyph work should be judged up close, because they look fine in a thumbnail and fall apart if the cell size is wrong. Gradients should be judged with the title on them. Boards should be judged tile by tile: does the mark read at small size, does the palette work for the text on the web page, does the sticker look like a sticker?

If something is off, change one number and render again. Because the output is deterministic, you can see exactly what that number did.

## What to do next

Pick the piece you need first. For a landing page start with [mesh gradient backgrounds](/blog/mesh-gradient-backgrounds/) or [dithered pixel art backgrounds](/blog/dither-pixel-art-backgrounds/). For a shop or a community, try [seals and stickers](/blog/seal-badge-sticker-generator/). For a developer tool, [ASCII art illustrations](/blog/ascii-art-illustrations/) and [terrain and engraving](/blog/wireframe-terrain-engraving/) give you a hero. Then pull it together with [a brand board](/blog/brand-board-generator/). If you are new here, [the introduction](/blog/introducing-levni/) and [the MCP setup guide](/blog/illustration-mcp-server-setup/) come first.

**Reference and examples.** Read the [Getting started](/docs/getting-started/) (install and a first render), the [brand board reference](/docs/boards/) (tiles, mockups and specs); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
