---
title: "Introducing Levni: illustrations from a JSON scene"
description: "Levni is an open-source engine that turns a short JSON scene into a hand-inked, riso-printed illustration. Made for agents and publishers, free per image."
date: 2026-11-22
updated: 2026-11-24
og: /og/introducing-levni.png
category: stories
kind: Story
coverAlt: "An illustration drawn by Levni for its launch post"
faq:
  - q: "What is Levni?"
    a: "Levni is an open-source engine that draws hand-inked illustrations from a short JSON scene. It also ships a library of drawn props, a layout critic and an MCP server, so an AI agent can draw, check and export pictures."
  - q: "How do I install Levni?"
    a: "Run `npm install @levni/levni`, or call the CLI with `npx @levni/levni`. It needs Node 20 or newer. There is no API key and no GPU."
  - q: "Does Levni use an image model?"
    a: "No. The same scene and seed always give the same picture. The engine composes drawn props, shapes and type, so there is no per-image cost and no invented text."
  - q: "Can I use the drawings commercially?"
    a: "Yes. The code is MIT and the Levni Folio drawings are CC BY 4.0, so you can use them in commercial work if you credit Ortak Alan."
---

Every article needs a picture, and most publishers solve that the same way: a stock photo nobody remembers, or an image model that draws something different every time. [Ortak Alan](https://ortakalan.io) tried both. Then we wrote an engine instead. Levni is an open-source tool for illustrations from JSON.

**Levni** draws illustrations from a scene description. A scene is a short JSON file: a blue panel here, a rocket from the prop library there, a faceless crowd along the bottom. Levni does the hand: pressure-brush ink lines, riso plates that never quite line up, the tooth of crayon on paper.

```json
{ "seed": 5, "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "prop", "name": "rocket", "x": 780, "y": 300, "size": 380 },
  { "type": "crowd", "x": 90, "y": 560, "w": 520, "rows": 2, "size": 130 }
] }
```

```bash
npm install @levni/levni
npx @levni/levni render scene.json cover.png
```

## Why a scene and not a prompt

- **The same seed draws the same picture.** You can fix one element and re-render without losing the rest.
- **One look across hundreds of images.** Ortak Alan has drawn about 500 article images with it, and they read as one publication.
- **Agents can direct it.** JSON in, image out, plus a layout critic that reports problems (an object cut by the frame, lopsided weight, no clear focus) before a person looks. That loop maps directly onto an MCP tool.
- **No per-image cost.** It runs on your machine or in CI with Node and sharp. No API key, no GPU.

## The Levni Folio

The engine ships with the **Levni Folio**: 1,577 drawn props, from tulips to server racks, each stored as SVG path data in a 0–100 box and released under CC BY 4.0. Anyone can [submit to the Folio](/#folio) with one JSON file. The rules are short: your own drawing, no faces, no logos.

## Open source

Code is MIT, the Folio is CC BY 4.0. Levni is made and used by Ortak Alan, and named after the Tulip Era painter whose colours still look alive three centuries later.

## Where to go next

Draw your first cover with [Claude Code and the MCP server](/blog/generate-blog-covers-claude-code/), see [how Ortak Alan kept one style across 500 articles](/blog/one-style-500-articles/), or read how [the layout critic](/blog/agent-layout-critic/) checks a scene before a person looks. Licence questions are answered in [the commercial use guide](/blog/free-illustrations-commercial-use/).

**Reference and examples.** Read the [Getting started](/docs/getting-started/) (install and a first render), the [MCP guide](/docs/mcp/) (every tool and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
