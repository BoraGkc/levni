---
title: "Generate Grainy Mesh Gradient Backgrounds from JSON"
description: "Generate grainy mesh gradient backgrounds from JSON with Levni: colour stops, grain, glowing orbs, feature tiles and a calm zone that keeps room for your title."
date: 2026-11-23
updated: 2026-11-24
category: brand
kind: Guide
coverAlt: "A dark mesh gradient in coral, violet and cyan with a large glowing orange orb and two smaller orbs"
faq:
  - q: "What is a mesh gradient?"
    a: "A mesh gradient blends several colours across a surface, each one spreading from its own point. It looks softer and more organic than a two-colour linear gradient. Levni builds one from colour stops, blurs them together and adds film grain on top."
  - q: "How do I add grain to a gradient?"
    a: "Set `grain` on the `meshgrad` element, from 0 (none) to 1 (heavy). The default is 0.35. `grainSize` changes how coarse the grain is."
  - q: "How do I keep room for a title on a gradient?"
    a: "Use the `calm` field: a list of `[x, y, w, h]` boxes in 0 to 1 units. The field is quietened inside those boxes, so text placed there stays readable."
  - q: "Can I make orbs and app tiles with the same element?"
    a: "Yes. A `meshgrad` with `x`, `y` and `r` draws an orb. `shape: \"squircle\"` gives a rounded app-style tile, and `preset: \"poster\"` gives hard colour bands."
  - q: "Do mesh gradients need an image editor or a model?"
    a: "No. They are drawn from numbers, so the same scene gives the same gradient every time, and you can change a colour in the JSON and render again."
---

Soft, grainy gradients are everywhere in product pages and launch posts: a dark field with a glow of coral in one corner and violet in another. They are quick to look at and hard to get right in a design tool, because every new post needs a new background and every background needs a quiet corner for the headline.

Levni draws them from a short JSON element called `meshgrad`. You give it colours, it blurs them into a field, adds grain, and keeps a zone calm so your title has somewhere to sit. The same scene gives the same picture every time, so a set of covers can share one look.

This guide builds a hero background, shows what grain does, and then makes orbs and feature tiles from the same element. It costs nothing and needs no image model. You need Node 20 or later. If you are new to Levni, start with [the introduction](/blog/introducing-levni/).

## Start with a field and five stops

A `meshgrad` is a box filled with colour. The simplest version is a list of `stops`: each has a position in 0 to 1 box units (`x`, `y`), a `color` and a radius `r` for how far it spreads. A `base` colour sits underneath, and `blur` softens the stops into each other.

```json
{ "seed": 4, "finish": "soft", "background": "#14122B", "elements": [
  { "type": "meshgrad", "x": 0, "y": 0, "w": 1200, "h": 673, "base": "#1B1745", "blur": 90, "grain": 0.14,
    "stops": [
      { "x": 0.12, "y": 0.2, "color": "#FF7A59", "r": 0.75 },
      { "x": 0.45, "y": 0.95, "color": "#7A5CFF", "r": 0.8 },
      { "x": 0.9, "y": 0.15, "color": "#2FD4FF", "r": 0.6 },
      { "x": 0.85, "y": 0.9, "color": "#FF4FA3", "r": 0.55 },
      { "x": 0.5, "y": 0.4, "color": "#3B2BB5", "r": 0.5 } ],
    "calm": [[0.0, 0.52, 0.62, 0.48]] },
  { "type": "label", "text": "levni / gradients", "x": 70, "y": 82, "size": 18, "color": "#F4EFE4", "anchor": "start" }
], "title": { "text": "Soft colour fields, made from code", "kicker": "Backgrounds", "brand": "levni.dev", "position": "bottom" } }
```

The scene sets `"finish": "soft"`, which gives clean edges instead of the hand-inked wobble. That suits gradients. Colours here are plain hex values, so use your own brand colours as you like.

## Reserve a calm zone for the title

A busy gradient behind a headline is a readability problem. The `calm` field solves it. It takes a list of boxes, each as `[x, y, w, h]` in 0 to 1 units of the element, and the field is kept quiet inside them, so type placed there stays legible.

In the scene above, `[0.0, 0.52, 0.62, 0.48]` is the bottom-left of the picture, which is exactly where the `title` layer puts its text.

![A dark gradient with coral at the top left, violet at the bottom and cyan at the top right, and a title in the calm lower left](/blog/mesh-gradient-backgrounds/fig-1.webp)
*The scene above. The headline sits in the quiet zone at the bottom left while the colour stays bright elsewhere.*

Plan the calm zone before you pick the stops. Decide where the title goes, mark that box in `calm`, and then put your brightest colours on the opposite side. For a left-aligned title, bright stops go to the right and top.

## Tune the grain

Grain is what makes a mesh gradient feel printed and not just blurred. It also hides banding, the visible steps that show up in smooth dark gradients. `grain` runs from 0 to 1, and `grainSize` changes how coarse each speck is.

![Three vertical gradient panels with the same colours and grain of 0, 0.35 and 0.8](/blog/mesh-gradient-backgrounds/fig-2.webp)
*The same stops with grain 0, 0.35 and 0.8. Zero is clean and a little plastic. High grain reads as film.*

The scene for that comparison:

```json
{ "seed": 9, "finish": "soft", "background": "#14122B", "elements": [
  { "type": "meshgrad", "x": 40, "y": 40, "w": 360, "h": 593, "grain": 0, "blur": 80, "base": "#1B1745",
    "colors": ["#FF7A59", "#7A5CFF", "#2FD4FF"], "count": 4 },
  { "type": "meshgrad", "x": 420, "y": 40, "w": 360, "h": 593, "grain": 0.35, "blur": 80, "base": "#1B1745",
    "colors": ["#FF7A59", "#7A5CFF", "#2FD4FF"], "count": 4 },
  { "type": "meshgrad", "x": 800, "y": 40, "w": 360, "h": 593, "grain": 0.8, "blur": 80, "base": "#1B1745",
    "colors": ["#FF7A59", "#7A5CFF", "#2FD4FF"], "count": 4 },
  { "type": "label", "text": "grain 0", "x": 70, "y": 590, "size": 18, "color": "#F4EFE4", "anchor": "start" },
  { "type": "label", "text": "grain 0.35", "x": 450, "y": 590, "size": 18, "color": "#F4EFE4", "anchor": "start" },
  { "type": "label", "text": "grain 0.8", "x": 830, "y": 590, "size": 18, "color": "#F4EFE4", "anchor": "start" }
]}
```

This version uses `colors` and `count` instead of hand-placed stops. Give it a list of colours and a `count` of stops (2 to 12), and Levni scatters them for you, seeded so the result repeats. Use `stops` when you want to control where each colour lands, and `colors` when you just want a pleasant spread. A grain of 0.1 to 0.2 is usually enough for a background that carries text. Go higher for tiles and posters.

## Draw glowing orbs

With `x`, `y` and `r` instead of a box, a `meshgrad` becomes an orb: a round field of blended colour with a soft edge. Orbs make good avatars, buttons and glow accents. Set `preset: "orb"` for a smooth sphere, or `"poster"` for hard colour bands, like a risographed sunset.

![Five smooth orbs in a row above three banded poster discs on a dark background](/blog/mesh-gradient-backgrounds/fig-3.webp)
*Five smooth orbs, then three poster discs with hard colour bands, all from the `meshgrad` element.*

One orb in that scene looks like this:

```json
{ "type": "meshgrad", "x": 170, "y": 250, "r": 90, "grain": 0.45,
  "colors": ["#FF8A5C", "#FF3D8B", "#6A4CFF"], "preset": "orb", "count": 4 }
```

You can use `bands` (2 to 12) to turn any field into hard colour steps and `lines` to draw contour lines between them. Orbs also layer well: put a large one behind a small one on a gradient and you get a sun and a moon. The cover of this post does exactly that, with one big warm orb and two small cool ones on a mesh field.

## Make feature tiles

For a features grid, set `shape: "squircle"`. A squircle is the rounded square you know from app icons. `radius` rounds the corners and `exponent` shapes the curve. Six tiles with six colour stories make a tidy set:

![Six rounded gradient tiles in two rows: orange to purple, aqua to blue, yellow to green, pink to violet, amber to red, pale blue to navy](/blog/mesh-gradient-backgrounds/fig-4.webp)
*Six squircle tiles. Each has its own three colours, with labels on top.*

```json
{ "type": "meshgrad", "x": 90, "y": 90, "w": 300, "h": 230, "shape": "squircle", "radius": 56,
  "grain": 0.15, "blur": 40, "colors": ["#FFB36B", "#FF5E62", "#8E3BC9"], "count": 4 }
```

Check that the label colour works on each tile. White is fine on the dark ones, but on a pale yellow-green tile a dark green label reads better. Keep the same `blur` and `grain` across a set so the tiles feel related, and change only the colours.

You can also use `mask`, a list of shapes (`x`, `y`, `w`, `h`, `shape`, `radius`) that shows the field only inside them. It is a quick way to cut a gradient into a logo shape or a row of pills.

## Ask an agent for a set

With the Levni MCP server connected, you can describe the look and let the assistant choose colours. Paste this into Claude or Codex:

```text
Use Levni to make a 1200 x 673 hero background for a post called "<title>".
Read scene_guide first. Use one `meshgrad` with five stops from my brand colours
(<hex list>), grain around 0.15, `finish: "soft"`, and a `calm` zone on the left
where the title will go. Render it with render_scene, read the critic's notes
and fix them. Then make three orb avatars from the same colours.
```

## Check the result

Render and look:

```bash
npx levni render scene.json out.webp --preview
```

Check three things. First, is the title readable at thumbnail size? If not, enlarge the `calm` box or darken the `base`. Second, are there bands in the dark areas? Raise `grain` a little. Third, do the colours fight? Four hues is usually the limit. If the field looks muddy where two stops meet, pick colours that sit close on the wheel, or add a lighter stop between them.

## What to do next

Put a headline on your gradient with the title layer, as in [Open Graph images from JSON](/blog/open-graph-images-json/), and see [brand colour illustrations](/blog/brand-colour-illustrations/) for matching the drawings to your palette. For crisp dots instead of soft colour, read [dithered pixel art backgrounds](/blog/dither-pixel-art-backgrounds/). The whole 0.2 release is in [the launch tour](/blog/levni-brand-assets/).

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
