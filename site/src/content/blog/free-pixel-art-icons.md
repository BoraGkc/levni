---
title: "Free Pixel Art Icons: 481 Icons in Four Cuts, CC BY 4.0"
description: "Free pixel art icons for commercial use: 481 icons in four cuts each (regular, thin, solid, glyph), CC BY 4.0, recolourable and ready to use in scenes."
date: 2026-11-23
updated: 2026-11-24
category: library
kind: Guide
featured: true
coverAlt: "A big blue pixel heart on a yellow disc in the middle of a blue card, with small pixel icons of a gamepad, a light bulb, a letter and a coffee cup around it"
faq:
  - q: "Are these pixel art icons free for commercial use?"
    a: "Yes. They are part of the Levni Folio, which is licensed CC BY 4.0. You can use them in commercial work as long as you credit \"drawings by Ortak Alan (CC BY 4.0)\"."
  - q: "How many pixel icons are there?"
    a: "481 icons, each in four cuts stored as variants: 0 regular, 1 thin, 2 solid and 3 glyph. That makes 1,924 pixel variants in all."
  - q: "How do I find a pixel icon?"
    a: "Every pixel icon's name starts with `pixel-`, for example `pixel-heart` or `pixel-calendar`, and each carries English and Turkish tags (magnify, yakınlaştır). Run `npx @levni/levni list pixel` for all of them, or search the library page for a word plus pixel."
  - q: "Can I change the colours of the pixel icons?"
    a: "Yes. They use the house colour names, so `recolor` on one icon, `\"palette\": \"blue\"`, or a scene-wide `style` with your own hex values recolours them like every other drawing."
  - q: "Can I get the icons as SVG?"
    a: "Yes. Open the icon in the Library and press Download SVG, in any style pack or your own colours, or render a scene to a `.svg` file. The pixels are stored as rectangles on a quarter-pixel grid, so they stay crisp at any size."
---

Pixel art icons have a warmth that thin line icons do not: they look like a game, a handheld screen, a sticker sheet. They suit newsletters, indie products, changelogs and any page that wants to feel a little playful. Most free sets, though, come in one colour, one weight and a licence you have to read twice.

The Levni Folio, the open illustration library behind Levni, includes **481 free pixel art icons**, each in four cuts: regular, thin, solid and glyph. They are licensed CC BY 4.0, so you can use them commercially with a credit line. Because they are stored in the same format as every other Levni drawing, you can recolour them to your brand, mix them into illustrations and even [extrude them into 3D icons](/blog/free-3d-icons/).

This guide shows how to find the icons, pick a cut, recolour them and place them in a scene. Everything runs on your machine with Node 20 or newer. There is no account and no cost.

## Find free pixel art icons by name

Every pixel icon's name starts with `pixel-`: `pixel-heart`, `pixel-calendar`, `pixel-chart-bar`, `pixel-git-merge`. Install Levni and search from the terminal:

```bash
npm install @levni/levni
npx @levni/levni list pixel
npx @levni/levni list pixel calendar
```

`list` prints each match with its number of variants (4 for every pixel icon) and its tags. To see them, draw a contact sheet:

```bash
npx @levni/levni sheet pixel-sheet.png pixel-home pixel-mail pixel-calendar pixel-camera
```

The sheet shows every variant numbered, on paper and on blue, so you can check how an icon reads on a dark card before you use it. You can also browse them on [the library page](/library/): type a word and "pixel" in the search box.

The set covers interface and everyday subjects: arrows and chevrons, calendars, files and folders, mail and messages, devices, charts, weather, money, buildings, transport, games and more. A few of the source icons were left out on purpose: brand logos are never added to the Folio.

## Pick one of the four cuts

Each icon has four variants, always in the same order:

| variant | cut | looks like |
| --- | --- | --- |
| `0` | regular | a bold pixel outline with a light riso fill inside |
| `1` | thin | a one-step outline, lighter, with the same fill |
| `2` | solid | a filled shape printed over an off-register accent copy |
| `3` | glyph | the glyph version of the shape, also filled over an accent copy |

This scene draws `pixel-chat` in all four:

```json
{ "seed": 22, "elements": [
  { "type": "prop", "name": "pixel-chat", "variant": 0, "x": 180, "y": 320, "size": 220 },
  { "type": "prop", "name": "pixel-chat", "variant": 1, "x": 460, "y": 320, "size": 220 },
  { "type": "prop", "name": "pixel-chat", "variant": 2, "x": 740, "y": 320, "size": 220 },
  { "type": "prop", "name": "pixel-chat", "variant": 3, "x": 1020, "y": 320, "size": 220 },
  { "type": "label", "text": "0 regular", "x": 180, "y": 500, "anchor": "middle", "size": 18 },
  { "type": "label", "text": "1 thin", "x": 460, "y": 500, "anchor": "middle", "size": 18 },
  { "type": "label", "text": "2 solid", "x": 740, "y": 500, "anchor": "middle", "size": 18 },
  { "type": "label", "text": "3 glyph", "x": 1020, "y": 500, "anchor": "middle", "size": 18 }
] }
```

![The pixel chat bubble icon four times: a blue outline with a peach fill, a thinner outline with the same fill, a solid blue bubble and a solid glyph bubble, each over a coral offset](/blog/free-pixel-art-icons/fig-1.webp)
*`pixel-chat`, variants 0 to 3.*

Use one cut per page. Regular reads best at small sizes in body text; thin suits a light, airy layout; solid and glyph carry weight in a hero or a sticker. Mixing cuts in one row looks like a mistake.

## Lay out a set

Without a `variant`, a prop uses variant 0, the regular cut. A row of icons is just a list of props:

```json
{ "seed": 23, "elements": [
  { "type": "prop", "name": "pixel-home", "x": 150, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-mail", "x": 330, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-calendar", "x": 510, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-camera", "x": 690, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-cart", "x": 870, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-clock", "x": 1050, "y": 190, "size": 140 },
  { "type": "prop", "name": "pixel-lock", "x": 150, "y": 470, "size": 140 },
  { "type": "prop", "name": "pixel-map", "x": 330, "y": 470, "size": 140 },
  { "type": "prop", "name": "pixel-gift", "x": 510, "y": 470, "size": 140 },
  { "type": "prop", "name": "pixel-headphone", "x": 690, "y": 470, "size": 140 },
  { "type": "prop", "name": "pixel-coffee", "x": 870, "y": 470, "size": 140 },
  { "type": "prop", "name": "pixel-bug", "x": 1050, "y": 470, "size": 140 }
] }
```

![Twelve pixel icons in two rows: a house, an envelope, a calendar, a camera, a shopping cart, a clock, a padlock, a map, a gift, headphones, a coffee cup and a bug](/blog/free-pixel-art-icons/fig-2.webp)
*Twelve icons in the regular cut, same size, on an even grid.*

The pixels are stored as rectangles on a quarter-pixel grid, so they stay square at any size. Render to `.svg` for a web page or a design tool, or to `.png` or `.webp` for a fixed image. The critic will note that a grid like this has no single focal object; for an icon sheet that is the point.

## Recolour them to your brand

The icons use the house colour names: `ink` for the pixels, and tones such as `tone-mustard` for the fills. That means they follow every colour tool in Levni. A scene-wide `style` replaces the house colours with your own:

```json
{ "seed": 24, "style": { "ink": "#2B1B5A", "tone-mustard": "#9BE3C8", "mustard": "#3FBF9A" }, "elements": [
  { "type": "prop", "name": "pixel-home", "variant": 0, "x": 200, "y": 336, "size": 220 },
  { "type": "prop", "name": "pixel-mail", "variant": 2, "x": 470, "y": 336, "size": 220 },
  { "type": "prop", "name": "pixel-calendar", "variant": 0, "x": 740, "y": 336, "size": 220 },
  { "type": "prop", "name": "pixel-gift", "variant": 2, "x": 1010, "y": 336, "size": 220 }
] }
```

![Four pixel icons recoloured: a house, an envelope, a calendar and a gift drawn in deep purple with mint green fills](/blog/free-pixel-art-icons/fig-3.webp)
*The same icons with a three-colour `style`: deep purple pixels, mint fills.*

For one icon only, use `recolor`, for example `"recolor": { "ink": "paper" }` to make an icon light on a dark card. That is what the cover of this post does with its four small icons. `"palette": "blue"` folds every accent into blues for a calm page. The guide to [brand colour illustrations](/blog/brand-colour-illustrations/) explains the colour names in detail.

## Use pixel icons inside illustrations

Pixel icons are ordinary props, so they mix with the hand-inked drawings. A neat trick is to put one on a screen: many library drawings have slots, named places where another drawing fits, such as a laptop's `screen`.

```json
{ "seed": 25, "elements": [
  { "type": "disc", "x": 560, "y": 330, "r": 250, "color": "tone" },
  { "type": "prop", "id": "pc", "name": "laptop", "x": 560, "y": 350, "size": 520 },
  { "type": "prop", "name": "pixel-chart-bar", "variant": 2, "in": { "ref": "pc", "slot": "screen" }, "fit": 0.7 },
  { "type": "prop", "name": "pixel-heart", "variant": 2, "x": 920, "y": 170, "size": 110, "rot": 10 },
  { "type": "prop", "name": "pixel-check", "variant": 2, "x": 960, "y": 470, "size": 100 },
  { "type": "prop", "name": "pixel-coffee", "variant": 0, "x": 190, "y": 470, "size": 120 }
] }
```

![A hand-drawn laptop on a light blue disc with a pixel bar chart on its screen, a pixel heart and a pixel tick floating to the right and a pixel coffee cup to the left](/blog/free-pixel-art-icons/fig-4.webp)
*A pixel chart in the laptop's screen slot, with pixel stickers around it.*

The `in` field puts the chart in the slot and scales it to fit; `fit` is how much of the slot it fills. Small pixel icons around a big drawing also work as stickers on a cover.

## Credit them correctly

The pixel icons are part of the Folio, so the Folio's licence applies: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). You can use them in commercial products, client work and paid publications. Credit them once where credits go, for example in an image caption, a footer or an about page:

```text
Drawings by Ortak Alan (CC BY 4.0)
```

The project owner supplied the source icons and confirmed the right to release them in the Folio; the library's notice file records that. Images you render are yours; the credit applies when they contain library drawings. For more on what the licence allows, read [free illustrations for commercial use](/blog/free-illustrations-commercial-use/).

One caution from the same notice: a handful of icons (`pixel-mood-happy`, `pixel-mood-neutral`, `pixel-mood-sad` and `pixel-camera-face`) are simple smileys. The rest of the library has no faces by design, so check those against your own style before you use them.

## Let an assistant pick the icons

With the Levni MCP server added ([setup](/mcp/)), an assistant can search, choose and lay out a set:

```text
Use the levni MCP server. Find pixel icons for these features: search,
export, share, schedule, comments, settings. Use list_props with words
plus "pixel", then show_props to compare. Use one cut for all six,
lay them out in a row with render_scene and save icons.svg.
```

## What to do next

See the pixel icons on screens and stickers in [the pixel gallery](/gallery/#pixel), and everything else Levni draws on [the features page](/features/). Turn any of them into a 3D icon with [the 3D icon guide](/blog/free-3d-icons/), or draw your own icon as JSON and add it with [the SVG icon guide](/blog/draw-svg-icons-json/). Browse [the library](/library/) and star the project on [GitHub](https://github.com/BoraGkc/levni).

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
