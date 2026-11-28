---
title: "Draw Dot Matrix Line Art and a Glass Lens from JSON"
description: "Turn any drawing or isometric scene into dot matrix line art with Levni's dotline, show hidden edges in grey, and lay a glass search bar over it."
date: 2026-11-28
category: brand
kind: Guide
coverAlt: "Three stacked isometric boxes drawn as violet dots on near-black, with the edges hidden by the upper boxes in grey"
faq:
  - q: "What is dot matrix line art?"
    a: "Line art redrawn as evenly spaced dots on a square grid, like an LED sign. Every stroke becomes a row of dots, one per grid cell, so curves and diagonals turn into small steps."
  - q: "How does Levni find the hidden lines of an isometric scene?"
    a: "An iso scene is drawn back to front as flat faces. dotline records which face is on top at every grid cell; a line that falls under a nearer face is a hidden line and is drawn in the muted grey. There is no 3D model, only the order of the faces."
  - q: "Can the glass lens be used without dots?"
    a: "Yes. lens is a scene-level pass, like screen: it works over any picture Levni draws. It is applied when you export PNG, WebP or GIF, not in SVG."
  - q: "Is it free to use the drawings this way?"
    a: "Yes. The engine is MIT and the drawings are CC BY 4.0: use them in any project, commercial too, with the credit “drawings by Ortak Alan”. There is no paid tier."
---

Dot matrix line art is everywhere in product design right now: isometric icons redrawn as dots, a soft grey where the back edges would be, and often a glass search bar lying across the picture and bending it. It looks like it took a 3D tool and a shader to make. It mostly takes a grid and some patience.

Levni can draw it from a few lines of JSON. The `dotline` element takes any drawing in the library, or a whole isometric scene, and redraws it as dots. A scene-level `lens` lays a glass pill over the finished picture. Both run on your machine, with no image model and no API key, and cost nothing per image.

This guide makes three things: a library drawing as dots, an isometric scene whose hidden edges show through in grey, and a glass search bar over a dot drawing. You need Node 20 or newer, or an AI agent with the Levni MCP server connected. `dotline` and `lens` are in the repository now and reach npm with 0.6.0; until then, install with `npm install github:Levni-Dev/levni`.

## Redraw a drawing as dots

Start with one drawing from the [library](/library/). `dotline` walks every stroke of it, one third of a cell at a time, and puts a dot in each grid cell the stroke passes through. Filled areas become muted dots in a checkerboard, so the shape still reads without turning into a solid block.

```json
{ "background": "#0B0B0C", "finish": "soft", "elements": [
  { "type": "dotline", "prop": "globe", "x": 600, "y": 330, "size": 300, "cell": 8, "color": "#D6E521", "muted": "#4E4E57" }
]}
```

![The globe drawing three ways: in ink on paper, as lime dots, and as dots in its own colours](/blog/dot-matrix-line-art/fig-1.webp)
*The same drawing in ink, as `dotline`, and as `dotline` with `"paint": true`.*

The fields that change the look most:

| field | default | what it does |
| --- | --- | --- |
| `cell` | 12 | the grid pitch in pixels; smaller cells keep more detail |
| `color` | violet | the colour of the line dots |
| `muted` | grey | fills, hidden lines and the shadow |
| `paint` | false | use the drawing's own stroke and fill colours |
| `fillEvery` | 2 | 1 fills every cell, 2 a checkerboard, 3 one in four |
| `line` | 1 | line width in dots |

The grid is tied to the canvas, not to the drawing. Two `dotline` elements with the same `cell` share one grid, so their dots line up even when the drawings sit side by side.

## Show the hidden edges of an isometric scene

This is where it gets interesting. Give `dotline` an `iso` scene instead of a drawing, and it reads the faces the [isometric engine](/blog/isometric-illustrations-json/) draws, back to front. At every grid cell it remembers which face is on top. A line that falls under a nearer face is a hidden line, and it comes out in the muted grey instead of disappearing.

```json
{ "background": "#0B0B0C", "finish": "soft", "elements": [
  { "type": "dotline", "cell": 9, "color": "#8F7DFF", "muted": "#4E4E57",
    "iso": { "x": 600, "y": 330, "objects": [
      { "kind": "floor", "x": -170, "y": -170, "w": 440, "d": 440 },
      { "kind": "box", "x": -70, "y": -70, "w": 240, "d": 240, "h": 130, "hatch": false },
      { "kind": "box", "x": -10, "y": -10, "w": 120, "d": 120, "h": 110, "z": 130, "hatch": false } ] } }
]}
```

![The same two stacked boxes twice: on the left only the visible edges, on the right the edges under the top box in grey](/blog/dot-matrix-line-art/fig-2.webp)
*Left: `"hiddenLines": false`. Right: the default, where the edges under the upper box show through in grey.*

There is no 3D model behind this, only the order of the faces. That keeps it fast: each scene in this post renders in under half a second on a laptop. Iso scenes do not fill their faces with dots by default, because a whole room of checkerboards gets noisy; set `"fill": true` if you want it.

For a library drawing there are no faces to read, so you choose the back edges yourself: `hidden` takes the indices of the drawing's paths to draw in grey.

## Lay a glass search bar over the picture

`lens` is not an element. Like the `screen` print pass, it belongs to the scene and works on the finished picture, so it bends whatever is under it: dots, a drawing, a gradient. The core magnifies (`zoom`), the rim pulls the picture inward (`bend`) and splits it into red and blue fringes (`aberration`). A tint, a sheen on the upper half, a bright rim and a soft shadow make it read as a thick piece of glass.

```json
{ "background": "#0B0B0C", "finish": "soft",
  "lens": { "x": 600, "y": 340, "w": 640, "h": 150, "icon": true, "label": "Globe", "kbd": "⌘K" },
  "elements": [
    { "type": "dotline", "prop": "globe", "x": 600, "y": 340, "size": 520, "cell": 10, "color": "#D6E521", "muted": "#4E4E57", "faint": "#151518" }
  ]}
```

![A lime dot globe with a glass search bar across it: the dots under the glass are magnified and split into red and blue at the ends](/blog/dot-matrix-line-art/fig-3.webp)
*The lens with a magnifier, a label and a ⌘K key. `faint` fills the empty grid around the drawing with very dark dots.*

`icon`, `label` and `kbd` are optional. Without them the lens is plain glass, which works well over a cover or a mesh gradient too. `shape` can be `pill` (the default), `circle` or `rect`, and a scene can carry up to eight lenses.

The lens is drawn when you export PNG, WebP or GIF. An SVG export has no lens, because SVG filters render differently from one program to the next.

## Make it move

Both pieces follow the scene's time `t`, so they loop. `shimmer` runs a brightness wave across the line dots, and `move` slides the lens out and back once per loop.

```json
{ "background": "#0B0B0C", "finish": "soft",
  "lens": { "w": 700, "h": 150, "move": [0, 110], "icon": true, "label": "Stack", "kbd": "⌘K" },
  "elements": [
    { "type": "dotline", "cell": 9, "color": "#8F7DFF", "muted": "#4E4E57", "shimmer": 0.5,
      "iso": { "x": 600, "y": 330, "objects": [
        { "kind": "box", "x": -70, "y": -70, "w": 240, "d": 240, "h": 130, "hatch": false },
        { "kind": "box", "x": -10, "y": -10, "w": 120, "d": 120, "h": 110, "z": 130, "hatch": false } ] } }
  ]}
```

Save it as `stack.json` and run:

```bash
npx @levni/levni animate stack.json stack.webp
```

A lens without `x` and `y` sits in the middle of the canvas. Both loops are in the [motion catalogue](/motion/), with the JSON that makes them, and the one above is in the [gallery](/gallery/).

## Ask your agent for it

With the MCP server connected once (`claude mcp add levni -- npx -y @levni/levni mcp`, see the [setup guide](/blog/illustration-mcp-server-setup/)), you can describe the picture instead of writing the JSON:

```text
Use Levni to make a 1200 × 673 cover for a post about our edge network:
the "globe" drawing as dotline dots in lime on a near-black background,
with a glass lens across the middle that reads "Edge network" and has a ⌘K key.
Render it to cover.png and fix anything the critic reports.
```

The agent reads the scene guide, writes the scene, renders a preview and reads the critic's notes. If the lens covers too much of the drawing, ask it to make the lens shorter or move it down.

## Check the result

Render the scene and look at it before you use it:

```bash
npx @levni/levni render cover.json cover.png
```

The command prints the critic's notes. For dot drawings, three things are worth checking by eye:

1. **The cell size.** At a `cell` of 12 small drawings lose their details; drop to 8 or 6. Very small cells on a big canvas make a lot of dots, and Levni coarsens the grid itself past about 90,000 cells.
2. **The contrast of `muted`.** Hidden lines should be visible but quieter than the main lines. On near-black, a grey around `#4E4E57` works; on paper, try a light grey-violet such as `#A7A2BE`.
3. **What the lens covers.** Glass reads best over busy dots. Over an empty area it is just a dark pill, so place it across the drawing.

## Where to go next

Every drawing in the library now has [its own page](/library/coffee-cup/), and you can [see the whole library in dot lines](/library/?style=dotline) from the bar at the bottom of the library. For more brand textures from JSON, read the [ASCII art guide](/blog/ascii-art-illustrations/) or the [dither and pixel art backgrounds](/blog/dither-pixel-art-backgrounds/) guide. And if this saved you a trip to a 3D tool, [keep Levni open](/support/): a star on GitHub helps more than you would think.
