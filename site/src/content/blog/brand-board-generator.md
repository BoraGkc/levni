---
title: "Generate a Brand Board from Four Fields of JSON"
description: "Generate a brand board from a name, a tagline, a mark and inks: wordmark, palette, web page, tote, sticker and card. Place tiles by hand or ask an agent."
date: 2026-11-23
category: brand
kind: Guide
coverAlt: "A yellow board of tiles: a blue tile with a bicycle in a white circle, a cream tile with scattered marks, coral and green colour tiles with a sailboat, and a tilted cream tile with a red seal above a second bicycle"
faq:
  - q: "What is a brand board?"
    a: "It is one image that shows an identity as a set of tiles: the mark, the wordmark, the palette, a web page, a social card, merchandise and a business card. Designers post it to show how the pieces work together."
  - q: "How many fields do I need to generate one?"
    a: "Two are required, `name` and `mark`. Add a `tagline` and up to five `inks` as hex colours and you get a full board with nine tiles. Everything else has a default."
  - q: "Can I change the layout after using the shortcut?"
    a: "Yes. `expandBrand` turns the `brand` object into a plain board spec that you can print, edit and render. Fields you write next to `brand`, such as `canvas` or `background`, override the generated ones."
  - q: "Which marks can I use?"
    a: "Any prop name or tag from the library, which has 1,577 drawings. Run `npx levni list bicycle` to search. An unknown name throws an error instead of drawing something else."
  - q: "Can an AI agent make a board?"
    a: "Yes. The `render_board` tool in the Levni MCP server takes the same spec, writes a PNG and returns a preview. With `guide: true` it returns the board format so the agent can read it first."
---

A brand board is the picture a designer posts to show an identity: a mark, a wordmark, a palette, a web page, a tote bag, a business card, all in one frame. Making one by hand takes an afternoon, and most of it is nudging boxes. Asking an image model for one gives you invented words and colours that drift.

You can write one as JSON instead. This guide uses **Levni**, an open-source illustration engine, to make a brand board from a name, a tagline, a drawing and a few colours. You get nine tiles in one call, and then you place the tiles yourself when you want control. The same spec also works from an agent. There is no image model, no API key and no cost per image.

You need Node 20 or newer and about ten minutes. The brand is fictional: **Meltem**, a bike workshop by the sea. Nothing here is a real company. For the other pieces of the brand asset set, see the [launch post](/blog/levni-brand-assets/).

## Install Levni

```bash
npm install @levni/levni
```

The command you will use is `levni board <spec.json> <out.png>`. It is deterministic: the same spec gives the same image, down to the crayon texture.

## Pick a mark

The mark is a drawing from the library, and it is the one thing you must choose well, because it appears on every tile. Search by word:

```bash
npx levni list bicycle
```

Pick a prop with a clear silhouette that reads at small sizes: a bicycle, a lighthouse, a dove. A prop with fine detail turns to mush on a sticker or a business card. Meltem uses `bicycle`. Some props have several variants, and the `variant` field picks one.

## Make a board with the `brand` shortcut

Write the whole brand in one object. Save it as `meltem.json`:

```json
{
  "canvas": [1500, 1000],
  "quantize": true,
  "brand": {
    "name": "Meltem",
    "tagline": "Bikes for slow mornings by the sea",
    "mark": "bicycle",
    "inks": ["#1F3D2B", "#F2994A", "#7DB59A", "#F4EFE3"],
    "font": "serif",
    "url": "meltem.bike",
    "person": { "name": "Selin Arda", "role": "Workshop lead" }
  }
}
```

Render it:

```bash
npx levni board meltem.json meltem.png
```

![A brand board for Meltem in dark green, orange, sage and cream: a bicycle mark in a sage circle, a serif wordmark, a colour strip, a web page in a browser, a social card, a tote bag, a round sticker, a bicycle pattern and a tilted business card](/blog/brand-board-generator/fig-1.webp)
*The `brand` shortcut for a made-up bike workshop. Nine tiles from one object.*

The nine tiles are the mark, the wordmark, a web page in a browser, the palette, a social card at 1200 by 630, a tote, a sticker, a pattern and a business card at a slight tilt. `quantize` writes a 256-colour PNG, about a third of the size.

The fields do what you would guess. `name` and `mark` are required, `tagline` is up to 90 characters, and `font` is `serif` (italic), `sans` (heavy) or `mono`. `person` makes the card a personal one; without it the card carries the brand. `url` fills the browser bar, the social card and the card.

The `inks` need a word. Give up to five colours as hex. The darkest becomes the ground and the text colour, a very light one becomes the paper, and the others become the accent and the highlight. Missing ones get house defaults. Here the pine green is the ground, the sand is the paper, the orange is the accent and the sage is the highlight. Marks are drawn in one ink on each ground, so the whole board holds to your colours without any re-colouring by you.

## Change one field and look again

The cheapest way to explore an identity is to keep the name and change the inks and the face. Same mark, same tagline:

```json
{
  "canvas": [1500, 1000],
  "quantize": true,
  "brand": {
    "name": "Meltem",
    "tagline": "Bikes for slow mornings by the sea",
    "mark": "bicycle",
    "inks": ["#2B1B3D", "#F5C542", "#D96C8A", "#FBF3E4"],
    "font": "sans",
    "url": "meltem.bike"
  }
}
```

![The same Meltem board in deep purple, yellow and pink: the bicycle sits in a pink circle, the wordmark is in heavy sans-serif type, and the sticker, pattern and tote follow the new colours](/blog/brand-board-generator/fig-3.webp)
*Plum, saffron and rose, with a heavy sans wordmark. Nothing else changed.*

Every tile follows. Because a board is just a file, you can keep a few of these side by side and show a client three directions in the time it takes to pour a coffee.

## Print the full spec and place tiles by hand

The shortcut is a starting point, not a wall. `expandBrand(brand)` turns it into a plain board spec: a grid and a list of tiles. You can print it, edit it and render it. From code:

```js
import { expandBrand, renderBoard } from '@levni/levni';
import { readFileSync, writeFileSync } from 'node:fs';

const { brand } = JSON.parse(readFileSync('meltem.json', 'utf8'));
const spec = expandBrand(brand);
writeFileSync('meltem-full.json', JSON.stringify(spec, null, 2));
await renderBoard(spec, 'meltem.png');
```

Open `meltem-full.json` and you will see every tile with its position and its scene. Delete the ones you do not want, and move the rest.

To write a board from scratch, set a `grid` and give each tile an `at: [col, row, colspan, rowspan]`. Tile types are `scene` (the default; a drawing, with an optional mockup), `palette` and `type`. This is a four-tile board for the same brand:

![A four-tile board: a large orange tile with a bicycle in a cream circle, a cream tile with the heavy word Meltem and a small tagline, a colour stack of pine, amber, sage and sand, and a phone showing a green sailboat panel above a bicycle](/blog/brand-board-generator/fig-2.webp)
*A board with a big mark, a wordmark, a palette stack and a phone mockup, placed by hand.*

```json
{
  "canvas": [1500, 1000],
  "background": "#E6E0D0",
  "grid": { "cols": 4, "rows": 2 },
  "quantize": true,
  "style": { "ink": "#1F3D2B", "blue": "#1F3D2B", "coral": "#F2994A", "mustard": "#7DB59A", "paper": "#F4EFE3", "tone": "#A9D0BC" },
  "tiles": [
    { "at": [0, 0, 2, 2], "bg": "#F2994A", "caption": "Mark", "fit": "none",
      "scene": { "seed": 3, "canvas": [714, 952], "background": "coral", "elements": [
        { "type": "disc", "x": 357, "y": 476, "r": 300, "color": "paper", "outline": "ink" },
        { "type": "prop", "name": "bicycle", "variant": 0, "x": 357, "y": 482, "size": 440 } ] } },
    { "at": [2, 0, 2, 1], "type": "type", "text": "Meltem", "family": "sans", "weight": 800, "sub": "Bikes for slow mornings by the sea", "bg": "#F4EFE3", "color": "#1F3D2B", "caption": "Wordmark" },
    { "at": [2, 1, 1, 1], "type": "palette", "layout": "stack", "colors": [
        { "hex": "#1F3D2B", "name": "Pine", "weight": 2 }, { "hex": "#F2994A", "name": "Amber" },
        { "hex": "#7DB59A", "name": "Sage" }, { "hex": "#F4EFE3", "name": "Sand" } ] },
    { "at": [3, 1, 1, 1], "mockup": "phone", "bg": "#7DB59A", "caption": "Story",
      "scene": { "seed": 8, "canvas": [360, 780], "background": "paper", "elements": [
        { "type": "panel", "x": 0, "y": 0, "w": 360, "h": 330, "color": "blue" },
        { "type": "prop", "name": "sailboat", "x": 180, "y": 170, "size": 220, "palette": "paper" },
        { "type": "prop", "name": "bicycle", "variant": 1, "x": 180, "y": 520, "size": 320 } ] } }
  ]
}
```

Three details are worth knowing. The board's `style` re-inks every scene tile, using the house colour names (`blue`, `coral`, `mustard`, `paper`, `tone`, `ink`) as slots. Mapping them to your brand colours is how the drawings follow your palette. A scene's own `style` wins over the board's.

Second, a scene tile is reflowed into its tile, so a scene written for the normal 1200 by 673 canvas just fits. The reflow works best when the scene's canvas is close to the tile's shape. For the tall mark tile here, the scene gets its own `canvas` of 714 by 952, about the size of the tile, and `fit: "none"` draws it exactly as written. Third, fonts: the PNG renderer only sees installed fonts, so `serif`, `sans` and `mono` are stacks that fall back to what ships with macOS, Windows and Linux. A custom `family` that is not installed falls back to the sans stack.

## Choose a mockup

A scene tile can sit in a mockup with the `mockup` field:

| `mockup` | what it adds |
| --- | --- |
| `browser` | a chrome bar and an address, set with `url` |
| `card` | a business card with a spare behind it; `ratio`, `stack: false` and `backColor` adjust it |
| `tote` | a canvas bag; `bagColor` sets the cloth, and the print renders on a transparent ground |
| `phone` | a bezel and a notch |

`tilt` turns the whole mockup, from -12 to 12 degrees; about -3 suits a business card. `seedOffset` changes the crayon texture for one tile only. Tiles can have a `bg`, a `caption` and a `radius`, and `captions: false` on the shortcut hides the small labels.

## Ask an agent to make the board

The `render_board` tool in the Levni MCP server takes the same spec. Add the server once:

```bash
claude mcp add levni -- npx -y @levni/levni mcp
```

The tool takes `spec` (or `{ "brand": {...} }`), an `out` path ending in `.png`, `preview` to return a 900-pixel image, and `guide: true` to return the board format instead of rendering. A good agent reads the guide first, searches the library for a mark with `list_props`, renders, looks at the preview and fixes what it sees. Paste this into Claude or Codex:

```text
Use the Levni tools. First call render_board with guide: true and read the
board format. Then call list_props to find a simple, bold drawing for the mark
of a brand called "Tuz", a bakery in Ayvalik: try bread and bread-loaf. Make a brand board with render_board using the brand shortcut: the
tagline is "Bread baked slowly, by the sea", the inks are #243B53, #E8B04A,
#C8553D and #F7F1E3, the font is serif, and the url is tuz.bakery. Save it as
tuz-board.png. Look at the preview. If any tile reads badly, expand the brand
into a full spec, fix that tile, and render again. Tell me the final spec.
```

Tuz is made up too, like Meltem. The agent returns the spec at the end, so you can keep it in the repository and render it again later, which is the point of a board that is data and not a picture.

## Check the result

Look at the board before you show it. Four things can go wrong. A long name shrinks the wordmark, so shorten it or choose `sans`. A mark with thin detail disappears on the sticker and the card, so try another variant. Two inks that are too close give a flat palette tile, so make the darkest very dark and the lightest very light. And a long tagline wraps onto more lines on the social card, so keep it to one short line.

When a tile is wrong, fix it in the full spec and not in the image. Because the render is deterministic, you can change one field and everything else stays where it was.

## What to do next

Put a seal or a sticker on the board's pieces: [seals, badges and stickers from a JSON scene](/blog/seal-badge-sticker-generator/) covers both. For line-art landscapes behind a hero or a poster, read [wireframe terrain and engraved landscapes](/blog/wireframe-terrain-engraving/). To keep illustrations in your brand colours across a whole site, see [brand colour illustrations](/blog/brand-colour-illustrations/), and browse the [Levni library](/library/) for a mark.
