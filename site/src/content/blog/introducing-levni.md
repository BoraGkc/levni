---
title: "Introducing Levni: illustrations from a JSON scene"
description: "Levni is an open-source engine that turns a short JSON scene into a hand-inked, riso-printed illustration. Built for agents and publishers, with zero cost per image."
date: 2026-11-22
og: /og/introducing-levni.png
---

Every article needs a picture, and most publishers solve that the same way: a stock photo nobody remembers, or an image model that draws something different every time. [Ortak Alan](https://ortakalan.io) tried both. Then we wrote an engine instead.

**Levni** draws illustrations from a scene description. A scene is a short JSON file: a blue panel here, a rocket from the prop library there, a faceless crowd along the bottom. Levni does the hand: pressure-brush ink lines, riso plates that never quite line up, the tooth of crayon on paper.

```json
{ "seed": 5, "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "prop", "name": "rocket", "x": 780, "y": 300, "size": 380 },
  { "type": "crowd", "x": 90, "y": 560, "w": 520, "rows": 2, "size": 130 }
] }
```

```bash
npx levni render scene.json cover.png
```

## Why a scene and not a prompt

- **The same seed draws the same picture.** You can fix one element and re-render without losing the rest.
- **One look across hundreds of images.** Ortak Alan has drawn about 500 article images with it, and they read as one publication.
- **Agents can direct it.** JSON in, image out, plus a layout critic that reports problems (an object cut by the frame, lopsided weight, no clear focus) before a person looks. That loop maps directly onto an MCP tool.
- **No per-image cost.** It runs on your machine or in CI with Node and sharp. No API key, no GPU.

## The Levni Folio

The engine ships with the **Levni Folio**: 474 drawn props, from tulips to server racks, each stored as SVG path data in a 0–100 box and released under CC BY 4.0. Anyone can [submit to the Folio](/#folio) with one JSON file. The rules are short: your own drawing, no faces, no logos.

## Open source

Code is MIT, the Folio is CC BY 4.0. Levni is made and used by Ortak Alan, and named after the Tulip Era painter whose colours still look alive three centuries later.
