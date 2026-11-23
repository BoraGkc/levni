---
title: "3D Cover Images Without a 3D Tool: Write One Line of JSON"
description: "Make 3D cover images for blog posts from one line of JSON: soft 3D ribbons, rings and blobs, five palettes, a seed per layout, a title and a badge."
date: 2026-11-23
category: covers
kind: Guide
featured: true
coverAlt: "A glossy knot of tube in peach, coral and violet on a warm cream background"
faq:
  - q: "How do I make a 3D cover image without Blender?"
    a: "Write a Levni scene with `\"finish\": \"soft\"` and one `soft3d` element with `\"preset\": \"auto\"`. Levni has a small 3D renderer written in plain JavaScript, so the glossy shapes, the lighting and the soft shadow come from the JSON. There is no 3D software, no GPU and no image model."
  - q: "How do I get a different layout?"
    a: "Change the `seed`. With the `auto` preset, seeds 1 to 9 walk through all nine layouts, so neighbouring seeds always differ. The same seed always gives the same picture."
  - q: "Can I use my brand colours for a 3D cover?"
    a: "Yes. Instead of a palette name, give `palette` an object with a `background` pair and a list of `stops`, for example three of your brand colours. Spheres, rings and cubes can take their own colours with `solids` and `cubes`."
  - q: "Where does the title go?"
    a: "The preset leaves room for it. `titleSpace` is `bottom` by default, or `top`, `left` or `none`, and the scene's `title` layer draws the headline, a kicker and a brand line in that space."
  - q: "Does it cost anything per image?"
    a: "No. Levni runs on your machine with Node and sharp. There is no account and no API key, and the code is MIT licensed."
---

A 3D cover image makes a post look finished. Glossy ribbons, soft rings and pebbles on a pale gradient are everywhere on product blogs right now. The usual way to get one is a 3D tool, a lighting setup and an export, or an image model that gives you a different style every time.

You can make 3D cover images from one line of JSON instead. **Levni**, an open-source illustration engine, has a small 3D renderer written in plain JavaScript. It builds the shapes, lights them, sorts them back to front and writes an SVG. A `soft3d` preset lays out a whole cover: a studio gradient, one or two hero shapes bleeding off the edge, a clear space for your title and a corner for a badge.

This guide builds that cover, then shows how to change the layout with a seed, switch palettes, use your own colours and add a title and a logo badge. It costs nothing per image and needs no account. You need Node 20 or newer and about ten minutes.

## Render your first 3D cover image

Install Levni from npm:

```bash
npm install @levni/levni
```

Make a file called `cover.json`. This is the whole scene:

```json
{ "finish": "soft", "background": "#E4EEF9",
  "elements": [{ "type": "soft3d", "preset": "auto", "seed": 4, "palette": "aqua", "badge": "badge.svg" }],
  "title": { "text": "How we rebuilt our onboarding in six weeks", "kicker": "Case study", "brand": "levni.dev" } }
```

Put a small square logo next to it as `badge.svg` (or remove the `badge` field for now), then render:

```bash
npx levni render cover.json cover.webp
```

![A soft 3D cover: a glossy blue and teal ribbon curling down the right edge, a tulip badge top left and the title How we rebuilt our onboarding in six weeks at the bottom left](/blog/3d-cover-images-json/fig-1.webp)
*The scene above: one soft3d element, a title layer and a badge. 1200 by 673 pixels.*

Three things make it work. `"finish": "soft"` switches the whole scene from the hand-inked riso look to clean edges and a fine film grain. The `soft3d` element with a `preset` draws the gradient background, the glow and the hero shape. And the `title` layer writes the headline as plain SVG text above everything, in the space the preset left free.

## Know what the renderer draws

The 3D part is real geometry, not a flat gradient pretending. Each shape is cut into small quads, lit by a key light from the upper left with ambient light, a glossy highlight and a rim, coloured through a ramp per material (cool shadow, base, pale highlight) and painted back to front. A ribbon can pass behind itself, and interlocking rings really interlock. There is no GPU and no dependency beyond sharp, which turns the SVG into PNG or WebP.

These are the presets you can name:

| preset | what it draws |
| --- | --- |
| `auto` | picks one of the nine layouts below from the seed |
| `ribbon`, `wave`, `mobius`, `spiral` | a wide glossy band in different paths |
| `knot` | a round tube tied in a knot |
| `rings` | interlocking glossy rings |
| `orbit` | a sphere with a ring around it |
| `pebbles` | soft, lumpy blobs |
| `stack` | stacked rounded blocks |

Start with `auto`. Name a preset only when you know the shape you want, for example `rings` for a post about integrations or `stack` for one about growth.

## Change the seed to change the layout

The `seed` is the whole layout. With `auto`, seeds 1 to 9 walk through all nine layouts, so the next seed always gives you something different. Change only the seed from 4 to 5:

```json
{ "type": "soft3d", "preset": "auto", "seed": 5, "palette": "aqua", "badge": "badge.svg" }
```

![The same cover with seed 5: a pale blue blob and a capsule in the upper right instead of the ribbon, the badge and title unchanged](/blog/3d-cover-images-json/fig-2.webp)
*Seed 5 with the same palette and title: pebbles instead of a ribbon.*

The same seed always gives the same picture, on any machine. That matters when a cover is part of a build: you can commit the JSON and know the image will not drift. If you publish a series, give each post its own seed and keep everything else the same, and the covers look related without being copies.

Each preset also tries several placements and keeps the most balanced one, so the shape bleeds off one or two edges and stays out of the title space and the badge corner. You do not position anything by hand.

## Pick one of five palettes

The `palette` field takes a name:

| palette | look |
| --- | --- |
| `aqua` | pale blue ground, teal to indigo |
| `sunset` | peach ground, amber to violet |
| `mint-night` | deep purple ground, mint |
| `lilac` | pale lilac ground, violet |
| `mono-blue` | royal blue ground, pale blues |

On the two dark palettes, also set the scene's `background` to the palette's dark colour: `#140A35` for `mint-night` and `#071A5C` for `mono-blue`. The title layer reads that colour, so it switches to light text and a matching halo by itself.

```json
{ "finish": "soft", "background": "#140A35",
  "elements": [{ "type": "soft3d", "preset": "auto", "seed": 4, "palette": "mint-night", "badge": "badge.svg" }],
  "title": { "text": "How we rebuilt our onboarding in six weeks", "kicker": "Case study", "brand": "levni.dev" } }
```

![The seed 4 cover in the mint-night palette: a mint ribbon on deep purple, the title in cream letters](/blog/3d-cover-images-json/fig-3.webp)
*Same seed, mint-night palette and a dark background: the title turns light on its own.*

## Use your brand colours

A named palette is a starting point. For your own colours, give `palette` an object instead: a `background` pair for the gradient and a list of `stops` that the shapes run through. This one also uses the `rings` preset and moves the title to the left:

```json
{ "finish": "soft", "background": "#F2EEE6",
  "elements": [{ "type": "soft3d", "preset": "rings", "seed": 2, "titleSpace": "left",
    "palette": { "background": ["#F2EEE6", "#E4DCCD"], "stops": ["#FFB36B", "#FF5E62", "#8E3BC9"] } }],
  "title": { "text": "Our pricing, explained in one page", "kicker": "Guide", "position": "left" } }
```

![Two interlocking glossy rings in orange, coral and violet on a warm cream ground, the title Our pricing, explained in one page set in a column on the left](/blog/3d-cover-images-json/fig-4.webp)
*A custom palette, the rings preset and a left title column.*

The custom palette also takes `solids` (colour pairs for spheres and rings), `cubes`, `shadowTint` and `dark` when you need finer control. Keep it to three or four stops: the gradient reads as one material, and too many colours make it look like a test pattern.

## Place the title and the badge

The title and the shapes are set up to agree. `titleSpace` on the preset says where the free space is: `bottom` (the default), `top`, `left` or `none`. The `title` layer then fills it:

| title field | what it does |
| --- | --- |
| `text` | the headline, wrapped to at most three lines at the largest size that fits |
| `kicker` | a small upper-case line above it |
| `brand` | a small line below it, such as your domain |
| `position` | `bottom`, `top`, `left` or `band` |
| `font` | `serif`, `sans`, `mono` or a font file |

Match the two: `"titleSpace": "left"` on the preset with `"position": "left"` on the title. The cover at the top of this post uses `"titleSpace": "none"`, because the blog page prints its own headline.

The `badge` is an image path (PNG, JPG, SVG or WebP) or the fields of an `image` element. The preset keeps a corner clear for it, and `badgeCorner` picks the corner if you care. Use it for a logo you have the right to show. Logos never go into the Levni library itself.

One note on fonts: the title is SVG text, and the PNG and WebP renderer uses the fonts installed on your machine. The default stacks use fonts most systems have. If you pass your own font file, install it on the machine that renders too.

## Read the critic and check the picture

Every render prints the layout critic's notes. It measures geometry: elements running off the canvas by accident, lopsided weight, no clear focal point. Soft 3D presets bleed off the edge on purpose and keep their balance, so they usually come back clean. Then look at the picture yourself, because the critic cannot tell whether a ribbon fights with your headline.

If you work with an AI assistant, let it do the loop. With the Levni MCP server added (setup on [the MCP page](/mcp/)), paste this:

```text
Use the levni MCP server to make a 3D cover for my post "<title>".
Call scene_guide once. Use "finish": "soft" and one soft3d element with
"preset": "auto" and the "aqua" palette. Try seeds 1 to 4 with
render_scene, show me the previews, and keep the one where the shape
and the title do not compete. Add the title layer with a kicker.
Save it as cover.webp.
```

The assistant calls `render_scene`, reads the notes and shows you small previews before writing the full file.

## What to do next

See every preset and palette side by side in [the soft 3D gallery](/gallery/#soft3d), and the rest of the engine on [the features page](/features/). To turn a library drawing into a 3D object instead of an abstract shape, read [turn any icon into a 3D icon](/blog/free-3d-icons/). To reuse this cover as a social card, square post and story, read [one illustration, every social image size](/blog/social-media-image-sizes/). The code is on [GitHub](https://github.com/BoraGkc/levni), and the hand-inked side of Levni is in [the library](/library/) and the guide to [generating blog covers with Claude Code](/blog/generate-blog-covers-claude-code/).
