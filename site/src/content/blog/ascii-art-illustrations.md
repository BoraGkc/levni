---
title: "Draw ASCII Art Illustrations and Globes from JSON"
description: "Draw ASCII art illustrations from JSON with Levni's glyphfill: a shaded ASCII globe, a dot-matrix rocket and a developer-tool Open Graph card from short scenes."
date: 2026-11-23
updated: 2026-11-24
category: brand
kind: Guide
coverAlt: "A globe drawn entirely in text characters, with a lit side, a shadow side and a few coral accent characters"
faq:
  - q: "How do I turn an image into ASCII art?"
    a: "In Levni you do not convert a picture. You fill a shape or a library drawing with characters using the `glyphfill` element. The density of the characters follows the tone of the shape, so lit areas and shadows come out as lighter and heavier characters."
  - q: "Can glyphfill make dots or blocks instead of letters?"
    a: "Yes. Set `mode` to `glyph` (the default), `block` or `dot`. Dot matrix looks like an LED sign and block gives a chunky pixel look."
  - q: "How do I draw an ASCII globe?"
    a: "Use `glyphfill` with `shape: \"sphere\"`, a `light` angle, and `land` between 0 and 1 for continents. `spin` rotates the land and `t` animates it."
  - q: "Which characters does it use?"
    a: "A ramp from light to dense, by default ` .:-=+*#%@`. You can change it with `chars`. Outlines use `- \\ | /` along the stroke angle."
  - q: "Is the text real text?"
    a: "It is drawn as glyphs above the hand-inked filter, so the grid stays exact at any zoom. It is an image, so search engines and screen readers need alt text, as with any picture."
---

ASCII art has a particular charm for developer products. A globe made of characters says "terminal" without a single word, and it prints the same on a dark background or a light one. The catch is that good ASCII art is fiddly. You need a tool that converts pictures, you need to pick a monospace font, and the result is a block of text that does not scale or recolour.

Levni has an element for it called `glyphfill`. It fills a silhouette with characters, blocks or dots whose density follows the tone of the shape. The silhouette can be a circle, a sphere with real lighting, or any drawing in the library. Everything is drawn as an image from JSON, so you get the same result each time and it costs nothing.

In this guide you will draw an ASCII globe, compare the character and dot-matrix looks on a rocket, and build a developer-tool Open Graph card. You need Node 20 or later. If you are new to Levni, start with [the introduction](/blog/introducing-levni/).

## Install Levni

```bash
npm install @levni/levni
npx levni render scene.json out.png
```

The `glyphfill` element is synchronous and needs no extra packages.

## Draw an ASCII globe

The shaded globe is the quickest way to see what `glyphfill` does. Set `shape` to `sphere`, give it a position and a `size`, and tell it where the light comes from.

```json
{ "seed": 3, "background": "paper", "finish": "soft", "grain": 0.008, "elements": [
  { "type": "glyphfill", "shape": "sphere", "x": 850, "y": 336, "size": 540, "cell": 7, "color": "ink", "accent": "coral", "land": 0.42, "light": { "angle": 215, "elev": 28 } },
  { "type": "label", "x": 70, "y": 110, "text": "ortakalan / world", "size": 18, "color": "blue" },
  { "type": "label", "x": 70, "y": 330, "text": "one planet,", "size": 64, "color": "ink", "upper": false },
  { "type": "label", "x": 70, "y": 402, "text": "all in text.", "size": 64, "color": "ink", "upper": false },
  { "type": "label", "x": 70, "y": 590, "text": "$ npx levni render globe.json", "size": 16, "color": "ink", "upper": false }
]}
```

![A globe drawn in text characters on the right, with a headline reading one planet, all in text on the left](/blog/ascii-art-illustrations/fig-1.webp)
*A `glyphfill` sphere next to a headline. Light, sparse characters mark the lit side and dense ones the shadow.*

Here is what each field does:

- `cell` is the size of one character cell in pixels. Seven gives fine detail. Raise it for a chunkier look and fewer characters.
- `color` is the ink. A dark colour like `ink` draws dense characters as shadow. A light colour on a dark background glows instead, with dense characters as the brightest parts. You can force either with `shade`.
- `light` has an `angle` in degrees (where the light comes from, with 270 straight from above) and an `elev`. On a sphere this gives a terminator, a core shadow and a rim of light.
- `land` is a number from 0 to 1 that carves continents into the sphere. At 0 you get a plain ball. `spin` turns the land and `t` (0 to 1) spins it over time, which matters if you render frames.
- `accent` and `accentShare` scatter a few characters in a second colour. Here it is coral, which gives the globe a small pop without breaking the one-ink look.

The default character ramp runs from light to dense: ` .:-=+*#%@`. Change it with `chars` if you want another feel, for example only dots and colons. Because the characters are drawn as glyphs above the hand-inked filter, the grid stays exact at any zoom.

## Fill a drawing with characters

A sphere is a primitive. The same element also takes any prop from the library as its silhouette with `prop`. The drawing's own shading, strokes and fills set the density, so a rocket with a dark body gives heavy characters there and light ones on its fins.

Here is one rocket in two modes side by side:

```json
{ "seed": 5, "background": "dark", "finish": "soft", "grain": 0.025, "elements": [
  { "type": "glyphfill", "prop": "rocket", "x": 300, "y": 336, "size": 440, "mode": "glyph", "cell": 9, "color": "mustard", "accent": "paper" },
  { "type": "glyphfill", "prop": "rocket", "x": 900, "y": 336, "size": 440, "mode": "dot", "cell": 11, "color": "tone", "accent": "coral", "light": { "mode": "linear", "angle": 60, "from": 1, "to": 0.4 } },
  { "type": "label", "x": 300, "y": 600, "text": "mode: glyph", "size": 18, "color": "paper", "upper": false, "anchor": "middle" },
  { "type": "label", "x": 900, "y": 600, "text": "mode: dot", "size": 18, "color": "paper", "upper": false, "anchor": "middle" }
]}
```

![The same rocket twice on a dark background: on the left in mustard text characters, on the right as blue dots with a few coral ones](/blog/ascii-art-illustrations/fig-2.webp)
*One drawing, two looks. Left: characters, with the outline drawn as slashes and dashes. Right: a dot matrix.*

`mode: "glyph"` is the classic ASCII look, with outlines drawn using `-`, `\`, `|` and `/` along the direction of each stroke. `mode: "dot"` replaces characters with round dots whose size follows the density, like an LED sign or a receipt printer. `mode: "block"` gives solid squares. For dots and blocks, `gap` sets the space between cells.

Lighting is different for anything that is not a sphere. Instead of an angle and elevation you give a ramp: `{ "mode": "linear", "angle": 60, "from": 1, "to": 0.4 }` fades the fill from full to 40 percent across the drawing. A `radial` ramp with `cx`, `cy` and `radius` gives a spotlight. If a drawing has parts you do not want filled, `paths` takes a list of path indices to keep.

## Build a developer-tool Open Graph card

Put the dot-matrix rocket next to a headline and a command and you have the kind of Open Graph card a developer tool would use. Set `"format": "og"` so the canvas is 1200 by 630:

```json
{ "seed": 9, "format": "og", "background": "dark", "finish": "soft", "grain": 0.025, "elements": [
  { "type": "glyphfill", "prop": "rocket", "x": 930, "y": 315, "size": 420, "mode": "dot", "cell": 11, "color": "tone", "accent": "coral", "light": { "mode": "linear", "angle": 60, "from": 1, "to": 0.4 } },
  { "type": "label", "x": 70, "y": 110, "text": "levni", "size": 28, "color": "coral" },
  { "type": "label", "x": 70, "y": 285, "text": "JSON in.", "size": 60, "color": "paper", "upper": false },
  { "type": "label", "x": 70, "y": 360, "text": "illustration out.", "size": 60, "color": "paper", "upper": false },
  { "type": "label", "x": 70, "y": 560, "text": "$ levni render scene.json out.png", "size": 18, "color": "tone", "upper": false }
]}
```

![A dark Open Graph card with a dot-matrix rocket on the right, the headline JSON in, illustration out on the left and a terminal command at the bottom](/blog/ascii-art-illustrations/fig-3.webp)
*A 1200 by 630 card. The rocket is the focal point, and the headline and the command sit on the left in text.*

The layout follows the usual rule for a social card: one big subject, one headline, and one small detail. Here the detail is a command in a monospace label, which suits the ASCII look. For more on card sizes and the title layer, read [Open Graph images from JSON](/blog/open-graph-images-json/) and [social media image sizes](/blog/social-media-image-sizes/).

## Ask an agent to draw one

With the Levni MCP server connected, you can ask for the whole card:

```text
Use Levni to make a 1200 x 630 Open Graph card for my command-line tool "<name>".
Read scene_guide first. Fill the "<prop>" drawing with `glyphfill` in dot mode on
a dark background, put the headline "<headline>" on the left in a large label,
and add the install command in a small monospace label at the bottom.
Render it with render_scene, read the critic's notes and fix them. Use my brand
colour as the `accent`.
```

If you have not connected the server yet, see [the MCP setup guide](/blog/illustration-mcp-server-setup/).

## Check the result

Render the scene and look at it at full size:

```bash
npx levni render scene.json out.png --preview
```

Check these things:

- Is the silhouette still recognisable? If it dissolves into noise, lower `cell` or raise `lines` (the extra density given to inked lines).
- Is the contrast right? On a dark background use a light `color`, on paper a dark one.
- Is the headline competing with the art? Keep the art on one side and text on the other.
- Does the layout critic complain? It may say the weight is lopsided or that there is no clear focal symbol, because the filled shape is made of many small cells. On a card where the art deliberately sits to one side, that note is expected and you can ignore it.

## What to do next

Browse [the library](/library/) for silhouettes worth filling: simple, bold shapes work best. If you want a crisper, pixel-style look, try [dithered backgrounds](/blog/dither-pixel-art-backgrounds/). For the full list of what arrived with this element, see [the Levni 0.2 tour](/blog/levni-brand-assets/).

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
