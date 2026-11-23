---
title: "Make Dithered Pixel Art Backgrounds from JSON"
description: "Make dithered pixel art backgrounds from JSON with Levni: Bayer dither fields, four cell patterns and a screen pass for 1-bit, riso or Game Boy prints."
date: 2026-11-23
updated: 2026-11-24
category: brand
kind: Guide
coverAlt: "A rocket flying over a dithered sunset: a blue-to-coral pixel sky, a mustard sun and line-dithered water"
faq:
  - q: "What is ordered dithering?"
    a: "It is a way to show many tones with few colours. The image is compared with a repeating grid of thresholds (a Bayer matrix), and each cell is painted or left empty depending on its tone. The result is the regular, crisp pattern you know from old games and 1-bit Mac art."
  - q: "How do I make a dithered gradient in Levni?"
    a: "Add a `dither` element with a `color` (or a list of `colors`), a `mode` such as `linear` or `radial`, and `from` and `to` values between 0 and 1. A bigger `cell` makes bigger pixels."
  - q: "Can I turn a whole scene into 1-bit or Game Boy art?"
    a: "Yes. Add a `screen` field to the scene with one of the presets: `1bit`, `riso`, `blueprint`, `gameboy` or `newsprint`. The finished picture is averaged into cells and dithered to the preset's inks."
  - q: "Does the screen pass work on every output format?"
    a: "It is applied when you write a .png or .webp file with `levni render`. An .svg file is left as drawn. In the MCP server, the preview from `render_scene` includes the screen pass too."
  - q: "Do I need an image editor or a dithering app?"
    a: "No. The dither is part of the scene, so the same JSON gives the same pixels every time. You change a number and render again."
---

Dithering is the trick behind a lot of pixel art. You have two or three inks and you want a smooth sky, so you scatter dots in a regular pattern and let the eye blend them. It looks crisp, a little retro, and it survives being shrunk to a thumbnail better than a soft gradient does.

Doing it by hand in an image editor is slow, and a dithering app gives you a flat file you cannot change later. With Levni you write the dither into the scene instead. A `dither` element draws an ordered (Bayer) dither field, and a scene-level `screen` field prints the whole picture through a dither pass.

In this guide you will build a dithered sunset, compare the four cell patterns, and then turn one scene into 1-bit, riso and Game Boy prints with a single line each. It costs nothing, needs no image model and no account. You need Node 20 or later and a text editor. If you have not used Levni before, [the introduction](/blog/introducing-levni/) takes five minutes.

## Install Levni

Add it to a project, or run it straight from `npx`:

```bash
npm install @levni/levni
npx levni render scene.json out.png
```

The same scene always gives the same picture, so a dithered background is safe to commit and regenerate. If you drive Levni from an assistant instead, see [the MCP setup guide](/blog/illustration-mcp-server-setup/).

## Draw a dithered sky

A `dither` element is a field of cells. Each cell is either filled with an ink or left empty, and the share of filled cells follows a ramp you choose. Give it a box (`x`, `y`, `w`, `h`), one or more inks, and a direction for the ramp.

The sunset on this page uses three of them. The sky is a linear ramp from top to bottom, going through two inks:

```json
{ "type": "dither", "x": 0, "y": 0, "w": 1200, "h": 470, "colors": ["blue", "coral"],
  "mode": "linear", "angle": 90, "from": 0.05, "to": 1.05, "cell": 8, "matrix": 8 }
```

With several `colors` the coverage walks through them in order: paper first, then the first ink, then the second. So the top of the sky is mostly bare paper with a few blue cells, the middle is solid blue, and the bottom gives way to coral. `angle: 90` runs the ramp from top to bottom. `cell` is the size of one pixel in output pixels, and `matrix` (2, 4 or 8) is the size of the Bayer grid. A bigger matrix gives more distinct steps in the ramp.

The sun is a disc with a radial ramp, and the water is a band of line-dithered blue over a dark panel. Here is the whole cover scene:

```json
{ "seed": 11, "background": "dark", "elements": [
  { "type": "dither", "x": 0, "y": 0, "w": 1200, "h": 470, "colors": ["blue", "coral"], "mode": "linear", "angle": 90, "from": 0.05, "to": 1.05, "cell": 8, "matrix": 8 },
  { "type": "dither", "x": 760, "y": 400, "r": 190, "colors": ["coral", "mustard"], "mode": "radial", "cx": 760, "cy": 260, "radius": 330, "from": 1, "to": 0.42, "cell": 8, "matrix": 8 },
  { "type": "panel", "x": 0, "y": 470, "w": 1200, "h": 203, "color": "dark" },
  { "type": "dither", "x": 0, "y": 470, "w": 1200, "h": 203, "color": "blue", "mode": "linear", "angle": 90, "from": 0.55, "to": 0, "cell": 8, "matrix": 8, "pattern": "line" },
  { "type": "prop", "name": "rocket", "x": 420, "y": 290, "size": 330, "rot": 24, "shadow": true }
]}
```

The sun uses `x`, `y` and `r` for a disc, and `cx`, `cy` and `radius` to place the centre of its ramp. Because the ramp is centred above the disc and the disc is cut by the horizon panel, you get a half sun sinking behind the water. The rocket is an ordinary drawing from the library, placed on top.

## Pick a cell pattern

The default cell is a square, which gives the classic pixel look. The `pattern` field changes the shape of each filled cell. There are four: `square`, `dot`, `line` and `plus`.

![Four dither swatches side by side: blue squares, coral dots, blue lines and mustard and green plus signs](/blog/dither-pixel-art-backgrounds/fig-1.webp)
*The four cell patterns on one sheet: square, dot, line and plus. The last swatch walks through two inks.*

Here is the scene behind that sheet:

```json
{ "seed": 4, "background": "paper", "elements": [
  { "type": "dither", "x": 50, "y": 90, "w": 255, "h": 430, "color": "blue", "mode": "linear", "angle": 90, "from": 1, "to": 0, "cell": 12, "matrix": 4, "pattern": "square" },
  { "type": "dither", "x": 345, "y": 90, "w": 255, "h": 430, "color": "coral", "mode": "radial", "from": 1, "to": 0, "cell": 14, "matrix": 4, "pattern": "dot" },
  { "type": "dither", "x": 640, "y": 90, "w": 255, "h": 430, "color": "blue", "mode": "linear", "angle": 90, "from": 0.9, "to": 0, "cell": 12, "matrix": 4, "pattern": "line" },
  { "type": "dither", "x": 935, "y": 90, "w": 215, "h": 430, "colors": ["mustard", "green"], "mode": "noise", "scale": 0.008, "from": 0, "to": 2, "cell": 12, "matrix": 4, "pattern": "plus" },
  { "type": "label", "text": "01 / square", "x": 50, "y": 568, "size": 17 },
  { "type": "label", "text": "02 / dot", "x": 345, "y": 568, "size": 17 },
  { "type": "label", "text": "03 / line", "x": 640, "y": 568, "size": 17 },
  { "type": "label", "text": "04 / plus", "x": 935, "y": 568, "size": 17 }
]}
```

Use squares for skies and fades where you want hard pixels. Use dots for a halftone feel. Lines suit water, rain and scan-line textures. Plus signs are a good decoration for a background that should read as a pattern, not a gradient. The four ramp modes are `linear`, `radial`, `noise` (a soft random field, set with `scale`) and `flat` (an even fill at one coverage).

Dither goes through the same hand-inked finish as everything else, so edges are slightly rough. If you want razor-sharp pixels, set `"finish": "soft"` on the scene.

## Print a whole scene with the screen pass

Dither elements put dither where you ask for it. The `screen` field does something different: it takes the finished picture and prints all of it through a dither pass. Every drawing, label and gradient is averaged into cells and snapped to a small set of inks.

Take a scene with a dithered sky, a sunburst, a rocket and a crowd, and add one line:

```json
{ "seed": 5, "clip": [60, 52, 1080, 569], "screen": "1bit", "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "dither", "x": 60, "y": 52, "w": 1080, "h": 569, "colors": ["blue", "coral"], "mode": "linear", "angle": 90, "from": 0, "to": 1, "cell": 10, "matrix": 8 },
  { "type": "sunburst", "x": 780, "y": 300, "size": 420, "color": "mustard", "rayColor": "tone-mustard" },
  { "type": "prop", "name": "rocket", "x": 780, "y": 300, "size": 380, "rot": 20, "shadow": true },
  { "type": "crowd", "x": 90, "y": 560, "w": 520, "rows": 2, "size": 130, "highlight": "coral" }
]}
```

![The scene printed in 1-bit: black dither on off-white paper, the rocket and crowd as black shapes](/blog/dither-pixel-art-backgrounds/fig-2.webp)
*The scene with `"screen": "1bit"`: one dark ink on off-white paper.*

The 1-bit preset uses one ink and a paper colour, so every tone has to become a pattern of black and white. Flat paper and flat ink stay solid, so only the in-between tones get the dither. That is why the rocket keeps clean shapes while the sky turns into a fade.

## Switch the screen preset

There are five presets: `1bit`, `riso`, `blueprint`, `gameboy` and `newsprint`. Swapping one for another changes the whole mood and nothing else. The riso preset prints with two inks, a blue and an orange-red, on warm paper:

![The same scene printed in riso: blue and orange-red dither on warm paper](/blog/dither-pixel-art-backgrounds/fig-3.webp)
*The same scene with `"screen": "riso"`, only that one word changed from the previous image.*

The Game Boy preset uses the four greens of the old handheld screen:

![The same scene printed in four greens, like a Game Boy screen](/blog/dither-pixel-art-backgrounds/fig-4.webp)
*The same scene with `"screen": "gameboy"`.*

If the presets are close but not right, give `screen` an object. You can start from a preset and override what you need, or set everything yourself:

```json
"screen": { "cell": 5, "matrix": 4, "inks": ["#14181F", "#F2603F"], "paper": "#F4F2EC", "spread": 0.8 }
```

`cell` is the block size in pixels (a larger number gives a chunkier look), `matrix` is the Bayer grid size, `inks` is a list of up to eight hex colours, `paper` is the lightest colour, and `spread` controls how strongly the pattern pushes tones apart. Start with a `cell` of 4 to 6 for a screen-print look and go above 8 for obvious pixels.

## Ask an agent to do it

If you use Claude or Codex with the Levni MCP server, you can describe the look and let the assistant write the scene. Paste this:

```text
Use Levni to make a 1200 x 673 background for my blog post about retro hardware.
Read scene_guide first, then use `dither` elements for the sky and a `screen`
pass for the finish. Try the "gameboy" preset and then "riso", render both with
render_scene, and tell me which reads better. Keep a calm area on the left for
a title. Fix anything the critic reports.
```

## Check the result

Render the scene and read what the critic says:

```bash
npx levni render scene.json out.png --preview
```

Look at the image at full size, not just the thumbnail. Dither shows its flaws up close: a ramp that runs out too early leaves a hard band, and a `cell` that is too small turns into grey mush when the picture is shrunk. Raise `cell` before you raise `matrix`. If a text label gets lost in the pattern, put a flat `panel` under it, or make it larger. Remember that the screen pass averages everything, so thin lines and small text can vanish at a large `cell`.

## What to do next

Browse the library at [/library/](/library/) for props to put on your pixel sky, and see [the pixel icon guide](/blog/free-pixel-art-icons/) for the small ones. If you want grainy colour instead of crisp dots, read [the mesh gradient guide](/blog/mesh-gradient-backgrounds/). And [the Levni 0.2 tour](/blog/levni-brand-assets/) shows dither next to everything else that arrived in the same release.

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
