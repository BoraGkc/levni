---
title: "Animate an Illustration from a JSON Scene"
description: "Turn a JSON scene into a looping GIF, WebP or MP4: eight loops, five entrances, stagger, a camera and easing, drawn locally with the same frames every time."
date: 2026-11-28
category: covers
kind: Guide
coverAlt: "A yellow board with a white rocket flying up and to the right across a blue panel, leaving a trail of paler copies behind it, and a cream strip on the right with three pink frames where a red ball drops lower in each"
faq:
  - q: "Do I need a browser, a video tool or an image model?"
    a: "No. Levni draws each frame from the scene on your machine and joins the frames into a GIF or an animated WebP with its own code. Only MP4 needs one extra program, ffmpeg, on your PATH."
  - q: "Will the same scene give the same animation next time?"
    a: "Yes. The same scene, the same seed and the same moment `t` give the same frame, so the whole loop is reproducible. I rendered one banner from a script and from the command line and got byte-identical GIFs."
  - q: "Which elements move without any setup?"
    a: "Clouds with `drift`, trees, plants, flags, confetti, the sunburst, the rose, flow fields, halftone and dither, mesh gradients, ASCII globes, soft 3D shapes with `spin` and ribbons. Everything else moves when you give it a `motion` field."
  - q: "Should I export GIF, WebP or MP4?"
    a: "GIF for a README, chat or email, because it plays wherever an image does. WebP for a web page. MP4 for a video editor or a social post. For the sample scene in this guide they came out at 270 KB, 265 KB and 146 KB."
  - q: "Can I use the frames in Remotion?"
    a: "Yes. `--frames-dir` writes numbered PNGs and a frames.json with the fps, size and file list. The export reference has a short Remotion component that steps through them."
---

A still illustration is a good start. A small loop, where a cloud drifts, a headline types itself or a drawing pops in and floats, says a little more and still fits in an image tag. Most ways to make one need a motion tool, a timeline and an export dialog. Asking an image model for one gives you a different picture in every frame.

This guide uses **Levni**, an open-source illustration engine, to turn a JSON scene into a loop. The scene format already carries time: `t` runs from 0 to 1 over the loop, and the elements that know how to move follow it. One command draws the scene at a number of moments and joins the frames into a GIF, an animated WebP or an MP4. There is no browser, no video tool and no image model, and the same scene gives the same frames every time.

You need Node 20 or newer. If you want the moving version of a README banner only, [the animated README banner guide](/blog/animated-readme-banner/) is shorter.

## Install

```bash
npm install @levni/levni
```

Motion arrived in Levni 0.5.0. When I wrote this, `npm view @levni/levni version` still printed 0.4.0, so until 0.5.0 is published, install the repository version with `npm install github:Levni-Dev/levni`.

The command is `levni animate <scene.json> <out.gif | out.webp | out.mp4>`. Frame `i` of `N` is drawn at `t = i / N`, so `t = 1` is never drawn: the frame after the last one is the first one again, and the loop closes.

## A complete scene to copy

This is a whole scene. A blue panel with a sun, two clouds and a rocket on the right; a headline, a coral rule and a line of text on the left. Save it as `ship-it.json`:

```json
{
  "seed": 7,
  "background": "paper",
  "stagger": 0.05,
  "elements": [
    { "type": "panel", "x": 660, "y": -10, "w": 560, "h": 700,
      "color": "blue" },
    { "type": "disc", "x": 930, "y": 350, "r": 190,
      "color": "mustard", "motion": "pulse" },
    { "type": "cloud", "x": 850, "y": 130, "size": 170,
      "color": "paper", "drift": 50 },
    { "type": "cloud", "x": 1060, "y": 585, "size": 120,
      "color": "tone", "drift": 30 },
    { "type": "prop", "name": "rocket", "x": 930, "y": 355,
      "size": 300,
      "motion": ["pop", { "type": "float", "amp": 12 }] },
    { "type": "type", "text": "Ship it", "x": 80, "y": 200,
      "w": 500, "h": 160, "fit": "box", "font": "black",
      "color": "#14181F",
      "motion": { "type": "typewriter", "cursor": "_" } },
    { "type": "block", "x": 84, "y": 392, "w": 140, "h": 14,
      "color": "coral", "radius": 7,
      "motion": { "type": "wipe", "from": "left", "delay": 0.1 } },
    { "type": "type", "text": "One JSON file, one loop.", "x": 84,
      "y": 450, "size": 36, "color": "#14181F",
      "motion": { "type": "slide", "from": "down", "delay": 0.15 } }
  ]
}
```

Draw it:

```bash
npx @levni/levni animate ship-it.json ship-it.webp --width 800 --frames 24
```

```text
ship-it.webp  24 frames, 800 x 449, 265 KB
- weight is lopsided (right heavy): balance it or make the empty side intentional
```

![A looping illustration: on the left the words Ship it type themselves with an underscore caret, a short coral rule wipes in under them and a line of small text slides up; on the right a white rocket pops into a yellow circle on a blue panel and floats, while two clouds drift](/blog/animate-illustrations-json/fig-1.webp)
*`ship-it.json` as a loop: 24 frames at 12 frames a second, so two seconds.*

It took about 4 seconds on the Mac I used. The second line is the layout critic. It looks at the picture and reports what a designer would; here the empty paper on the left is on purpose, so I left it.

Read the scene from the top and you see both kinds of motion. The clouds move because a `cloud` with `drift` already knows how to. The disc, the rocket, the headline, the rule and the line of text move because they carry a `motion` field. The next two sections cover each.

## What moves by itself

Some elements follow `t` without any extra field. This is the list from the [animation reference](/docs/animation/):

| element | motion over one loop |
| --- | --- |
| `cloud` with `drift` (px) | slides that far to one side, back, and the same to the other |
| `tree`, `plant` | sway |
| `flag` | one wave travels along it |
| `confetti` | one full fall (`kind`: confetti, rain, stars) |
| `sunburst` | rays turn two steps |
| `rose` | turns one petal |
| `flowfield`, `halftone`, `dither` | the field shifts in a small circle |
| `meshgrad` | each blob moves on its own small circle (`drift`, default 0.06) |
| `glyphfill` (sphere, globe) | turns once |
| `soft3d`, `extrude3d` with `spin` | `spin` turns per loop |
| `ribbon` | the twist travels along the ribbon |
| `spiro` with `animate: true` | draws itself on (a reveal, not a loop) |

A landscape made only of these needs no `motion` at all. Two clouds, two trees, a flag, a plant and a sun on hills:

![A looping landscape on a light blue sky: two white clouds drift, two thin trees with yellow, green and coral leaves sway on green hills, a striped yellow and white flag waves on its pole, and a potted plant and a sun stand still](/blog/animate-illustrations-json/fig-2.webp)
*Nothing here has a `motion` field. The clouds, trees, flag and plant follow `t` on their own. 357 KB as a WebP.*

Props, panels, type and charts stand still unless you give them motion. When no frame differs from the first, the notes say so, so you never ship a "loop" that is really a still.

## Motion on any element

Every element takes `motion`: a name, an object with fields, or a list of both. In `ship-it.json` the rocket has a list, `["pop", { "type": "float", "amp": 12 }]`: it pops in, then floats.

There are two kinds. **Loops** run whole cycles, so the last frame meets the first:

| motion | what it does | fields |
| --- | --- | --- |
| `float` | rises and falls | `amp` (px, 10) |
| `drift` | slides left and right | `amp` (px, 16) |
| `orbit` | moves on a small circle | `amp` (px, 10) |
| `sway` | rocks about its base | `amp` (degrees, 3), `pivot` (`bottom`, `center`, `top`) |
| `wiggle` | shakes, four times a loop | `amp` (degrees, 2.5) |
| `pulse` | breathes in size | `amp` (share, 0.05) |
| `spin` | turns | `turns` (1), `reverse` |
| `blink` | fades and returns | `amp` (0 to 1, 0.6) |

All eight also take `turns` (whole cycles per loop) and `phase` (0 to 1), so two floating drawings can move out of step.

**Entrances** play once and hold. Their times are shares of the loop, so `"delay": 0.15` starts 15 percent of the way in:

| motion | what it does | fields |
| --- | --- | --- |
| `pop` | grows from nothing with a small overshoot | `delay` (0), `dur` (0.25), `ease` |
| `fade` | fades in | `delay`, `dur`, `ease` |
| `slide` | slides in and fades | `from` (`down`, `up`, `left`, `right`), `distance` (px, 60) |
| `wipe` | is uncovered from one side | `from` (`left`, `right`, `up`, `down`) |
| `typewriter` | text is typed, with a caret | `cursor` (a character, `false`, or `"stay"`), `dur` |

With `"out": true` an entrance also leaves the same way at the end of the loop, which makes an intro that loops cleanly. A headline set with `fit: "box"` keeps the size of its finished text while it is typed, so the letters do not grow as they arrive.

`ease` takes the usual names: `linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`, `inQuart`, `outQuart`, `inOutQuart`, `inExpo`, `outExpo`, `inOutSine`, `inBack`, `outBack`, `outElastic` and `outBounce`. Without one, `pop` uses `outBack` (that is the overshoot), `typewriter` and `wipe` run at an even pace, and the rest use `outCubic`.

## Stagger and the camera

Two fields on the scene, not on an element, change the whole loop.

`"stagger": 0.1` delays each moving element by that much more than the one before it. Entrances arrive one after another, and loops fall out of step. `"camera": { "zoom": 1.1 }` pushes in and comes back within the loop. `zoom`, `x` and `y` take a number or `[from, to]`, and `"once": true` plays it one way only. A scene's title layer stays put while the drawing moves under it.

```json
{
  "seed": 4,
  "background": "paper",
  "stagger": 0.1,
  "camera": { "zoom": 1.1 },
  "elements": [
    { "type": "panel", "x": 60, "y": 230, "w": 1080, "h": 370,
      "color": "blue" },
    { "type": "prop", "name": "coffee-cup", "x": 205, "y": 415,
      "size": 200, "diecut": true,
      "motion": ["pop", { "type": "float", "amp": 10 }] },
    { "type": "prop", "name": "book", "x": 465, "y": 415,
      "size": 200, "diecut": true,
      "motion": ["pop", { "type": "float", "amp": 10 }] },
    { "type": "prop", "name": "lightbulb", "x": 725, "y": 415,
      "size": 200, "diecut": true,
      "motion": ["pop", { "type": "float", "amp": 10 }] },
    { "type": "prop", "name": "compass", "x": 985, "y": 415,
      "size": 200, "diecut": true,
      "motion": ["pop", { "type": "float", "amp": 10 }] },
    { "type": "type", "text": "stagger 0.1, camera zoom 1.1",
      "x": 70, "y": 110, "size": 46, "font": "mono",
      "weight": 700, "color": "#14181F" }
  ]
}
```

```bash
npx @levni/levni animate stagger.json stagger.webp --width 720 --frames 16
```

![Four die-cut stickers on a blue band, a coffee cup, a book, a light bulb and a compass, pop in one after another from left to right and then float slightly out of step, while the whole picture slowly zooms in and out](/blog/animate-illustrations-json/fig-3.webp)
*All four stickers carry the same motion. `stagger` spreads them out; the camera adds a slow push.*

All four elements have the same `motion`, and the stagger alone puts them in order. That is usually what you want: write the motion once, and let the order of the elements set the timing.

A camera move changes every pixel in every frame, so it costs the most in file size. At 800 pixels and 24 frames this loop was 436 KB as a WebP; at 720 pixels and 16 frames it is 246 KB.

## The rule that makes loops reproducible

Levni keeps one rule for motion: **the same scene, the same seed and the same `t` give the same frame.** A loop is as reproducible as a still. You can commit the scene, render it again in CI next month and get the same file.

Two smaller rules follow from it. Identical frames are drawn once, so a still scene with `--boil 3` (a hand-drawn shimmer, where three crayon textures take turns) costs three renders, not 24. And because frame `N` is never drawn, a loop built only from loops (`float`, `pulse`, a drifting cloud) has no seam.

## What the critic sees

Every `animate` run returns the layout critic's notes, the same checks `levni render` runs on a still. A scene with entrances has a problem here: its first frame is half empty, because nothing has popped in yet. So when a scene has entrances, the critic reads the settled picture at mid-loop instead.

To look for yourself, add `--strip`. It writes four frames side by side:

```bash
npx @levni/levni animate ship-it.json ship-it.webp --width 800 --strip frames.png
```

![Four frames of the Ship it loop side by side: an empty left side with only a caret and an empty yellow disc, then the full headline with the rocket in place, then the coral rule and the small line added, then the same settled picture](/blog/animate-illustrations-json/fig-4.webp)
*`--strip frames.png`: frame 0 is nearly empty on purpose; by the middle the picture has settled.*

Read a strip with two questions. Is the middle frame a good still on its own? That is what most people see, and what the critic judged. And does something visibly move? If every frame looks the same, the notes will tell you, and you can add a moving element or `--boil`.

## GIF, WebP or MP4

The extension picks the format. I drew `ship-it.json` three ways at 800 pixels wide, 24 frames:

| format | size | where it plays |
| --- | --- | --- |
| `ship-it.gif` | 270 KB | anywhere an image does: GitHub READMEs, chat, email |
| `ship-it.webp` | 265 KB | browsers |
| `ship-it.mp4` | 146 KB | video players and editors; needs `ffmpeg` on your PATH |

```bash
npx @levni/levni animate ship-it.json ship-it.gif --width 800
npx @levni/levni animate ship-it.json ship-it.mp4 --width 800
```

GIFs are written by Levni's own encoder, which stores only the pixels that change between frames. GIF handles flat colour well and gradients badly, so for a mesh gradient or grain use WebP, a smaller width or fewer frames. The MP4 is H.264 at an even size (this one came out 800 by 448) and two seconds long; `--loops 3` repeats the loop inside the file, and `--crf` sets the quality.

The other options: `--frames` (24 by default, up to 240), `--fps` (12), `--width` (the canvas width by default; 800 suits a README) and `--colours` for the GIF palette size. `--format og`, `square`, `story` or `youtube` recomposes the scene for another canvas, as it does for `levni render`.

## Frames for Remotion and other tools

When a loop is one part of a longer video, you want the frames, not a finished file:

```bash
npx @levni/levni animate ship-it.json ship-it.webp --width 800 --frames-dir levni
```

This writes `frame-0001.png` to `frame-0024.png` into `levni/`, plus a `frames.json`:

```json
{
  "fps": 12,
  "frames": 24,
  "width": 800,
  "height": 449,
  "loop": true,
  "files": [
    "frame-0001.png",
    "frame-0002.png",
    "frame-0003.png"
  ]
}
```

(The real file lists all 24.) Put the folder in a Remotion project's `public/` and step through the files with the frame counter. The [export reference](/docs/export/) has a short component that does it, including how to hold each image when the composition runs at 30 frames a second and the loop at 12. The same page covers sprite sheets with an atlas for game engines, transparent PNGs and seamless tiles.

To plan which loops a video needs before you render any of them, draw a [storyboard from a shot list](/blog/storyboard-generator/) first.

## Ask an agent

The Levni MCP server has a `render_animation` tool. It takes a scene and an `out` path ending in `.gif` or `.webp`, plus `frames`, `fps`, `boil` and `width`. It returns the critic's notes and a strip of four frames, so the agent can look at the loop the way you would. Set it up once from [the MCP page](/mcp/#setup); until 0.5.0 is on npm, point the server at `github:Levni-Dev/levni`.

A prompt that works:

```text
Use the Levni tools. Call scene_guide and read how `motion`
and `t` work. Make a 1200 x 673 scene for a blog post about a
weekly newsletter: a headline that types itself, an envelope
drawing that pops in and floats, and one cloud with drift.
Render it with render_animation to newsletter.webp, 24 frames,
width 800. Look at the strip: the middle frame must be a good
still and something must visibly move. Fix the scene and
render again if not. Show me the scene.
```

## Check the result

Before you publish a loop, check four things. Entrances that start late leave the picture half empty for most of the loop, so keep delays and stagger small enough that everything has arrived by the middle. A camera move or a gradient makes the file large, so shrink the width or the frame count. Text that wipes or slides into a panel edge looks broken in the frames where it overlaps, so leave room. And a loop with only entrances jumps back to empty at the end; add `"out": true` if that jump bothers you.

When a frame is wrong, fix the scene and not the file. Because each frame is a pure function of the scene and `t`, you can change one field and everything else stays where it was.

## What to do next

Browse the [motion catalogue](/motion/): every preset, camera move, easing curve and self-moving element as its own loop, with the snippet to copy.

Make a [README banner that moves](/blog/animated-readme-banner/) with the same engine. To build the still picture first, read [how to make blog covers from JSON](/blog/generate-blog-covers-claude-code/) or try [mesh gradient backgrounds](/blog/mesh-gradient-backgrounds/), which drift on their own. Open [the editor](/editor/) to place elements by hand, or browse [the free tools](/tools/) and the [Levni library](/library/) for drawings.

**Reference and examples.** Read the [animation reference](/docs/animation/) (loops, entrances, camera, sizes) and the [export reference](/docs/export/) (frames, sprite sheets, MP4); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
