---
title: "Generate Blog Cover Images with Claude Code and Levni"
description: "Generate a blog cover image with Claude Code: add Levni as an MCP server, let the agent draw, read the layout critic and export a small WebP. No API key needed."
date: 2026-11-22
category: agents
kind: Guide
featured: true
coverAlt: "A small robot beside a laptop, with a finished rocket cover pinned next to the screen"
faq:
  - q: "Can Claude Code generate a blog cover image?"
    a: "Yes, if it has a tool that draws. Add Levni as an MCP server and Claude Code can search a library of hand-inked props, write a JSON scene, render it, read the layout critic's notes and save a WebP. Levni is not an image model, so there is no API key and no cost per image."
  - q: "Do I need an image model or an API key?"
    a: "No. Levni draws from a JSON scene on your machine with Node and sharp. The agent only writes the scene, so the only usage you pay for is the agent's own."
  - q: "How does Claude know if a cover looks wrong?"
    a: "Every render returns the layout critic's notes: elements running off the canvas, objects cut by the frame, lopsided weight, no clear focal point. Claude can also read the preview image the render tool returns. Fix what the critic reports, then look at the picture."
  - q: "Can I keep the same look across many posts?"
    a: "Yes. Every scene uses the same style pack and the same prop library, so covers read as one publication. Ortak Alan drew about 500 article covers this way. Change one setting, `style`, to reprint every cover in new inks."
  - q: "Can I use the covers commercially?"
    a: "Yes. The code is MIT and the prop library is CC BY 4.0, so commercial use is fine. Credit the drawings as \"drawings by Ortak Alan (CC BY 4.0)\" when a cover contains library props."
---

Every article needs a cover. Writing the post takes an afternoon, and then someone still has to find, buy or generate a picture that fits. Stock photos look the same everywhere. Image models draw something different each time, so the next cover never matches the last.

There is a calmer way. You can ask Claude Code to draw the cover for you with **Levni**, an open-source engine that turns a short JSON scene into a hand-inked, riso-printed illustration. Claude chooses the drawings, writes the scene, reads a layout critic and saves a small WebP. Nothing calls an image model, so there is no API key and no cost per image.

This guide takes you from an empty project to a finished cover, then to a whole blog of them. You need Node 20 or newer and Claude Code. It takes about ten minutes.

## Install Levni in your project

Levni is not on npm yet, so install it from GitHub:

```bash
npm install github:BoraGkc/levni
```

That gives you the `levni` command and the engine. You can already draw by hand: write a scene file and render it.

```bash
npx levni list laptop
npx levni render scene.json cover.webp
```

`levni list` searches the prop library by name or tag, and `levni render` draws a scene to `.png`, `.webp` or `.svg`. You will rarely type these yourself once the agent has the tools, but they are handy for checking a single drawing. The other commands are `sheet`, `add`, `check` and `mcp`.

## Add the MCP server to Claude Code

The `mcp` command runs Levni as an [MCP server](https://modelcontextprotocol.io) over stdio. Register it with one line:

```bash
claude mcp add levni -- npx -y github:BoraGkc/levni mcp
```

Start a new Claude Code session in the project and ask it to list its tools. You should see five from Levni. If you use another client, the same server works there too: see [the MCP server setup guide](/blog/illustration-mcp-server-setup/).

## Ask Claude to illustrate an article

Give Claude the article and a clear job. This prompt works as a template:

```text
Read posts/why-we-moved-to-weekly-releases.md.
Draw a cover image for it with the levni MCP server.

1. Call scene_guide once to learn the scene format.
2. Think of three object metaphors for the story and keep the sharpest.
3. Use list_props and show_props to pick drawings by eye.
4. Write a scene: 1200 x 673 canvas, one large focal object, no text, no faces.
5. Call render_scene, read the critic's notes and fix every one.
6. When the critic is clean and the preview reads well, save it with
   render_scene to public/covers/why-we-moved-to-weekly-releases.webp.
```

The steps matter. Asking for three metaphors first stops the agent reaching for the first cliché, and telling it to fix the critic's notes turns one render into a short loop.

## Know what the five tools do

Each tool has one job, and the agent uses them in a rough order.

| Tool | What it does |
| --- | --- |
| `scene_guide` | Returns the scene format: canvas, every element type, colours and style packs. Read once per session. |
| `list_props` | Searches the library by name, tag or variant note, in English and Turkish. Returns variant counts and what each variant shows. |
| `show_props` | Draws a contact image of up to 12 props with every variant numbered, so the agent can choose by eye. |
| `render_scene` | Draws the scene. Returns the critic's notes and a small preview image. With `out`, it also writes the full file. |
| `critique_scene` | Returns only the critic's notes, with no image. A fast check while iterating. |

The library behind `list_props` has 538 props in 848 variants across 15 categories. A prop is a drawing placed by name, for example `{ "type": "prop", "name": "rocket", "variant": 1 }`. Because the agent picks from drawings that already exist, it never has to invent a shape.

## Write the first scene

A scene is plain JSON. Elements are drawn in order, each on top of the last. Here is a first draft Claude might write for an article about shipping a launch:

```json
{ "seed": 4, "clip": [60, 52, 1080, 569], "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "sunburst", "x": 820, "y": 300, "size": 420, "color": "mustard", "rayColor": "tone-mustard" },
  { "type": "prop", "name": "rocket", "variant": 1, "x": 1170, "y": 120, "size": 520, "rot": 15 },
  { "type": "prop", "name": "globe", "x": 300, "y": 560, "size": 300 },
  { "type": "prop", "name": "sparkle", "x": 560, "y": 300, "size": 120 }
] }
```

Rendered, it looks like this:

![A blue panel with a sun, a globe cut by the bottom edge and a rocket almost entirely outside the frame at the top right](/blog/generate-blog-covers-claude-code/fig-1.webp)
*The first draft: the rocket, the focal object, sits mostly outside the card, and the globe is clipped.*

The idea is right and the layout is wrong. The rocket was placed near the corner of the canvas, so most of it falls outside the card. This is the kind of mistake a quick model makes, and it is easy to miss when you only read the JSON.

## Read the critic's notes

The render result starts with the layout critic's notes. For the draft above it reported:

```text
- draw "rocket" (ink box 987,-101 304×393) is mostly outside the frame, only 31% shows: move it in, or set "crop": true if the cut is the idea
- draw "globe" (ink box 181,446 218×237) is cut by the frame, 74% shows: pull it in, or set "crop": true if the cut is deliberate
- weight is lopsided (right heavy): balance it or make the empty side intentional
```

The critic is cheap and blind to meaning. It checks geometry: elements off the canvas or the card, objects cut by the frame without `"crop": true`, lopsided weight, no clear focal symbol, overlapping icons. It reports at most six notes. Treat them as a to-do list.

All three notes point at the same mistake from different sides: the rocket is mostly outside the card, the globe is clipped, and the weight piles up in one corner. The critic measures against the card when the scene has a `clip`, so a prop that falls off the card is caught even while it is still on the canvas. It still cannot tell whether the picture means anything, which is why the prompt asks Claude to look at the preview as well. The notes tell you where to look, and the picture tells you whether it reads.

## Fix the scene and render again

Claude moves the rocket onto the sun, pulls the globe in and makes it larger, and gives the rocket a cast shadow so it sits forward of the panel:

```json
{ "seed": 4, "clip": [60, 52, 1080, 569], "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "sunburst", "x": 700, "y": 320, "size": 420, "color": "mustard", "rayColor": "tone-mustard" },
  { "type": "prop", "name": "rocket", "variant": 1, "x": 700, "y": 320, "size": 380, "rot": 15, "shadow": true },
  { "type": "prop", "name": "globe", "x": 250, "y": 400, "size": 300 },
  { "type": "prop", "name": "sparkle", "x": 470, "y": 160, "size": 90 }
] }
```

![The same blue panel with the rocket in front of a sunburst in the middle right, a globe at the left and a sparkle between them](/blog/generate-blog-covers-claude-code/fig-2.webp)
*The fixed scene: one clear focal object, the rocket, with the globe and sparkle in support.*

This time the critic reports nothing. The rocket is the largest element, there is air around it, and the weight sits across the frame instead of in one corner. If a note ever stays on purpose, such as a giant symbol cropped by the panel, set `"crop": true` on that element so the critic knows it is intended.

Keep the seed. The same seed draws the same picture, so fixing one element does not reshuffle the hand wobble of the rest.

## Export a WebP under a size budget

Once the scene is clean, ask for the file. `render_scene` takes an `out` path, and the extension picks the format:

```json
{ "scene": { "...": "the scene above" }, "out": "public/covers/launch.webp" }
```

For `.webp` the engine writes the image under a size budget: it lowers the quality step by step until the file is small enough, so a cover stays light on the page. `.png` and `.svg` work the same way if you need them. Files are written relative to the working directory of the Claude Code session, so run it from your project root.

Then wire the cover into your post the way your site expects it, as a front matter field or a plain image tag. Add a descriptive alt text. The picture has no text in it, so the alt text is the place to say what it shows.

## Use it for many posts

One cover is nice. The real gain is the tenth. Every scene shares the same prop library and the same style pack, so covers made on different days still look like one publication. Ortak Alan drew about 500 article covers this way.

Here are three covers for three unrelated topics: savings, travel and health. They use different panel colours and different props, and they still belong together.

![Three tall panels side by side: a piggy bank on a blue panel, a tent on a coral panel and a stethoscope on a green panel](/blog/generate-blog-covers-claude-code/fig-3.webp)
*Three finished covers for different article topics, drawn in one style.*

To run this across a backlog, put the instructions in a project file such as `CLAUDE.md` so every session starts from the same brief, then hand Claude a folder of drafts:

```text
For each markdown file in posts/ that has no cover:
- draw a cover with the levni MCP server, following the steps in COVERS.md
- save it to public/covers/<file-name>.webp
- keep the same style and seed rules for every cover
- list any critic note you left unfixed, and why
```

Want the whole set in other colours, say your brand's? A scene takes one `style` field, either `"riso"`, `"miniature"` or your own inks such as `{ "blue": "#6A1B9A" }`, and every panel and prop follows. That is how a rebrand becomes a one-line change: see [brand-colour illustrations](/blog/brand-colour-illustrations/).

## What to do next

Browse the [Levni library](/library/) to see the drawings your agent will choose from, or jump to a shelf such as [`/library/?c=tech`](/library/?c=tech). To see how the critic works in more detail, read [the agent layout critic](/blog/agent-layout-critic/). To make the matching social card for each post, see [Open Graph images from JSON](/blog/open-graph-images-json/).

Related: for glossy 3D covers with a title and a badge, read [3D cover images without a 3D tool](/blog/3d-cover-images-json/). To let the assistant add covers straight to Ghost drafts, read [add featured images to Ghost drafts](/blog/ghost-featured-images-ai/).
