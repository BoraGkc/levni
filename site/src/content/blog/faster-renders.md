---
title: "How Levni Draws a Cover in 0.15 Seconds"
description: "Levni renders are seven times faster: the crayon filter moved from librsvg to JavaScript. See the profile, the trick and the numbers, and how to switch back."
date: 2026-11-24
category: agents
kind: Explainer
coverAlt: "A white stopwatch with a coral play triangle on a yellow disc, on a blue panel with a small lightning bolt and two sparkles"
faq:
  - q: "How much faster are Levni renders now?"
    a: "On an M4 Mac at normal priority, a cover takes about 0.13 to 0.17 seconds instead of 1.0 to 1.1 seconds, and an isometric city about 0.2 seconds instead of 1.06. That is roughly seven times faster. The soft finish gains about 20 per cent, because its cost is the drawing itself."
  - q: "Does the picture change?"
    a: "Not in a way you can see. We compared old and new renders and the mean channel difference was between 0.07 and 0.4 on a scale of 0 to 255. The filter is the same maths, applied in JavaScript instead of inside librsvg."
  - q: "How do I get the old renderer back?"
    a: "Set the environment variable `LEVNI_RASTER=rsvg`. Levni then rasterises the whole SVG with librsvg, filter included, exactly as before. Unset it to return to the fast path."
  - q: "Which version has the faster renderer?"
    a: "It ships in 0.3.0. The npm package is still 0.2.0, so until 0.3.0 is published, install with `npm install github:Levni-Dev/levni`."
  - q: "Can I call the new renderer from my own code?"
    a: "Yes. Import `rasterize` from `@levni/levni` and call `rasterize(svg, { density, raw })`. It returns a PNG buffer, or raw RGBA pixels with `raw: true`."
---

Levni used to take about a second to draw one cover. That is fine for a single picture and slow for a loop: a gallery build, a preview inside an agent's chat, or a batch of hundreds of article covers. So we profiled a render, found where the second went, and moved that work out of librsvg. A cover now takes about 0.15 seconds.

This post explains what was slow, the trick that fixed it, and how we checked that the pictures stay the same. It also shows the numbers and what they change if an agent or a script calls Levni. You do not need to change anything to benefit. The faster renderer is the default.

The change ships in Levni 0.3.0. The npm package is still 0.2.0, so until it is published, install the repository version with `npm install github:Levni-Dev/levni`.

## Find what was slow

Levni draws a scene as an SVG, then turns that SVG into pixels. Our first guess was the drawing: hundreds of hand-wobbled strokes, riso plates and a paper texture. It was not.

We timed the two steps separately on a typical cover. The drawing, with the crayon finish switched off, rasterises in about 20 milliseconds. The full render took about a second. Roughly 90 per cent of the time went into one step: applying the crayon filter.

## See why the filter cost so much

The crayon finish is what makes a Levni picture look hand-inked instead of vector-clean. In the SVG it is a filter with two displacement passes, which push pixels sideways by a noise field so edges wobble, and two masks, which add speckle and the mottled texture of a printing drum.

Each of those steps touches every pixel of the full canvas, and librsvg runs them one after another on a general-purpose filter pipeline. It does that correctly, but it does not know that most of the canvas is flat paper. We measured the noise fields themselves too. Four of them cost about 120 milliseconds, and they depend only on the seed and the size, so they can be reused.

## Draw in layers and filter in JavaScript

The fix has two parts.

First, `rasterize()` splits the scene into three plain SVG layers. The ground is the paper and anything that should stay untouched. The inked body is everything the crayon filter should roughen. The crisp top is what sits above the filter. Without the filter, each layer rasterises in a few milliseconds.

Second, `rasterize()` applies the crayon filter to the body layer in JavaScript, with the same maths the SVG filter used: a bilinear displacement, then the speckle and drum-mottle masks. The noise fields come from librsvg once per seed and size, and are cached. Then the three layers are composited in order.

In outline:

```text
ground  ──────────────┐
body  ─▶ displace ─▶ mask ─▶ composite ─▶ PNG
top  ─────────────────┘
```

The soft finish, which adds film grain instead of the crayon wobble, gets the same cached grain overlay. It gains about 20 per cent, not seven times, because its cost is the drawing itself.

## Check that the picture stays the same

A faster renderer is only useful if the pictures do not change. We checked in two ways.

The first check is numerical. We rendered the same scenes with both paths and compared them pixel by pixel. The mean difference per colour channel was between 0.07 and 0.4 on a scale of 0 to 255. That is below what a monitor can show.

The second check is by eye, which is the one that counts for an illustration. Below is the same 400 by 300 pixel region of an isometric city, cut from the old librsvg render on the left and the new `rasterize()` render on the right.

![Two crops of the same isometric city, side by side: the librsvg render on the left and the rasterize render on the right, with the same wobbly blue outlines, speckle and paper grain](/blog/faster-renders/fig-2.webp)
*The same region, old path left, new path right. The right-hand crop went through a lossy WebP encode, which adds a little noise of its own.*

The outlines wobble in the same places, the speckle sits in the same spots and the drum mottle on the roofs matches. If you flip between the two you will not find a difference worth naming.

## Read the numbers

All timings are from one M4 Mac at normal priority. They are samples, not a benchmark suite, so treat them as the size of the change and not as a promise for your machine.

![Hand-drawn bar charts. Left: one render in milliseconds, cover 1050 before and 150 after, city 1060 before and 200 after. Right: smoke test in minutes, about 3.5 before and 0.75 after](/blog/faster-renders/fig-1.webp)
*Before in blue, after in coral. The chart is a Levni `bars` scene with your numbers, nothing invented.*

| What | librsvg | `rasterize()` |
| --- | --- | --- |
| A cover | about 1.0 to 1.1 s | about 0.13 to 0.17 s |
| An isometric city | about 1.06 s | about 0.2 s |
| Smoke test, 3,409 variants | about 3 to 4 minutes | about 41 to 49 s |

The smoke test renders every variant of every drawing in the library. The chart uses the mid-points of those ranges, which is why it says "about".

## Use the speed in agents and batches

Speed matters most where a render sits inside a loop.

- **MCP previews.** When an agent calls `render_scene`, it waits for the picture before it can critique it. A preview that comes back in a fraction of a second makes a draft, critique and fix loop feel immediate. See the [MCP guide](/docs/mcp/).
- **Gallery and blog builds.** The scripts that draw this site's images now use `rasterize()`. A full redraw of every figure is a coffee break shorter.
- **Large batches.** Ortak Alan drew about 500 article covers with Levni. At about a second each that is roughly eight minutes of rendering. At 0.15 seconds it is closer to a minute and a quarter, so re-drawing the lot after changing one colour is something you can just do. [One style across 500 articles](/blog/one-style-500-articles/) explains that workflow.
- **Tests and CI.** The smoke test that checks every library variant went from minutes to under a minute.

A prompt you can paste into Claude Code or Codex to feel the difference:

```text
Render the same scene twice and print the time of each. First run
`LEVNI_RASTER=rsvg npx @levni/levni render scene.json old.png`, then run
`npx @levni/levni render scene.json new.png`. Compare the two images with the
critic notes and tell me if anything looks different. Do not change the scene.
```

## Call it from your own code

The renderer is part of the public API. Pass it an SVG from `compose()`:

```js
import { compose, rasterize } from '@levni/levni';

const { svg } = await compose({ seed: 7, elements: [
  { type: 'prop', name: 'stopwatch', x: 600, y: 330, size: 360 }
] });
const png = await rasterize(svg, { density: 72 });   // PNG buffer
const { data, info } = await rasterize(svg, { raw: true }); // raw RGBA pixels
```

`density` works like sharp's: 72 gives one pixel per unit. The CLI, the MCP server, posters, boards and the `sheet` command all use it already. The [API reference](/docs/api/) lists the options, and the [CLI guide](/docs/cli/) covers the commands.

## Switch back to librsvg

Keep the old path when you want to compare, or when you suspect a difference:

```bash
LEVNI_RASTER=rsvg npx @levni/levni render scene.json out.png
```

With that variable set, `rasterize()` hands the whole SVG to librsvg, filter included, as in 0.2.0. Unset it to use the fast path again. If you ever see a picture that differs from the old one in a way that matters, that is a bug, and the scene JSON plus both renders is all we need.

## What to do next

Install the repository version, run your slowest script and watch the timer. The [changelog](/changelog/) lists what else is in 0.3.0. For the scene format behind every render, read the [Getting started](/docs/getting-started/) page.

Related: [Let an agent check a layout with the critic](/blog/agent-layout-critic/) shows the loop that benefits most from quick previews, and [Draw hand-drawn charts from data](/blog/hand-drawn-charts/) explains the `bars` chart used in the figure above.

**Reference and examples.** Read the [API reference](/docs/api/), [CLI guide](/docs/cli/) and [MCP guide](/docs/mcp/); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
