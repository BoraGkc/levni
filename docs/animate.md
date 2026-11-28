# Animation

Levni draws a scene as a short loop. The scene format already carries time: `t` runs from 0 to 1, and the elements
that know how to move follow it. `animate` draws the scene at N moments of `t` and joins the frames into an animated
GIF or WebP. No browser, no video tool, no new dependency.

![An ASCII globe turning, drawn by Levni](img/animate-globe.gif)

```bash
npx @levni/levni animate scene.json loop.gif --width 800
npx @levni/levni animate scene.json loop.webp --frames 36 --fps 12 --boil 3 --strip frames.png
npx @levni/levni animate scene.json loop.mp4            # needs ffmpeg
```

```js
import { animate } from '@levni/levni';
const { notes, bytes } = await animate(scene, 'loop.gif', { frames: 24, fps: 12, width: 800 });
```

From an agent: the MCP tool `render_animation` takes the same scene and options, writes the file and returns the
critic's notes with a strip of four frames to look at.

## Options

| option | default | meaning |
| --- | --- | --- |
| `frames` | `24` | frames in the loop (1..240); frame `i` is drawn at `t = i / frames` |
| `fps` | `12` | frames per second (GIF stores delays in 1/100 s, so 12 becomes 12.5) |
| `boil` | `0` | hand-drawn shimmer: this many crayon textures (2..8) take turns, about six changes a second. `0` keeps the paper steady |
| `width` | canvas width | output width in px; 800 suits a README |
| `loop` | `0` | repeat count, `0` = forever |
| `colours` | `128` | GIF palette size (2..255); more colours for gradients, fewer for line art |
| `quality` | `80` | WebP quality |

`--format og|square|story|youtube` works as in `render`. `--strip out.png` writes a few frames side by side.

## What moves

| element | motion over one loop |
| --- | --- |
| `cloud` with `drift` (px) | slides `drift` px to one side, back, and the same to the other |
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

Props, panels, type and charts stand still; `iso` scenes move through the trees and clouds they hold. When no frame differs from the first, the notes say so; add one of the
elements above, or set `boil` to make a still drawing shimmer.

## Motion on any element

Every preset below has its own small loop and the JSON that makes it in the [motion catalogue](https://levni.dev/motion/).

The elements above move on their own. Everything else (a prop, a panel, type, a label, a chart) moves when you give it
`motion`. A name, an object, or a list:

```json
{ "type": "prop", "name": "rocket", "x": 900, "y": 336, "size": 320, "motion": "float" }
{ "type": "type", "text": "Ship it", "x": 80, "y": 200, "w": 540, "h": 150, "fit": "box",
  "motion": { "type": "typewriter", "delay": 0.1, "cursor": "_" } }
{ "type": "prop", "name": "star", "x": 760, "y": 120, "size": 90, "motion": ["pop", { "type": "spin", "turns": 2 }] }
```

**Loops** run whole cycles, so the last frame meets the first.

| motion | what it does | fields |
| --- | --- | --- |
| `float` | rises and falls | `amp` (px, 10) |
| `drift` | slides left and right | `amp` (px, 16) |
| `orbit` | moves on a small circle | `amp` (px, 10) |
| `sway` | rocks about its base | `amp` (degrees, 3), `pivot` (`bottom`, `center`, `top`) |
| `wiggle` | shakes, four times a loop | `amp` (degrees, 2.5) |
| `pulse` | breathes in size | `amp` (share, 0.05) |
| `spin` | turns | `turns` (1), `reverse` |
| `blink` | fades and returns | `amp` (0..1, 0.6) |

All take `turns` (whole cycles per loop) and `phase` (0..1).

**Entrances** play once and hold. Times are shares of the loop.

| motion | what it does | fields |
| --- | --- | --- |
| `pop` | grows from nothing with a small overshoot | `delay` (0), `dur` (0.25), `ease` |
| `fade` | fades in | `delay`, `dur`, `ease` |
| `slide` | slides in and fades | `from` (`down`, `up`, `left`, `right`), `distance` (px, 60) |
| `wipe` | is uncovered from one side | `from` (`left`, `right`, `up`, `down`) |
| `typewriter` | text is typed, with a caret | `cursor` (a character, `false`, or `"stay"`), `dur` |

With `"out": true` an entrance leaves the same way at the end of the loop. A fitted headline (`fit: "box"`) keeps
the size of its finished text while it is typed.

`ease` takes the usual names: `linear`, `inQuad`, `outQuad`, `inOutQuad`, `inCubic`, `outCubic`, `inOutCubic`,
`inQuart`, `outQuart`, `inOutQuart`, `inExpo`, `outExpo`, `inOutSine`, `inBack`, `outBack`, `outElastic`, `outBounce`.

**Stagger.** `"stagger": 0.06` on the scene delays each moving element by that much more than the one before it
(entrances arrive one after another; loops fall out of step).

**Camera.** `"camera": { "zoom": 1.08 }` pushes in and comes back within the loop. `zoom`, `x` and `y` take a number
or `[from, to]`; `"once": true` plays one way. The title layer stays put.

When a scene has entrances, the critic reads the settled picture at mid-loop, not the half-empty first frame.

## A README banner that moves

```js
import { bannerScene, animate } from '@levni/levni';
const scene = bannerScene({ owner: 'you', name: 'your-repo', description: 'One line.', mark: 'rocket', motion: true });
await animate(scene, 'banner.gif', { frames: 36, width: 800 });   // about 0.25 MB
```

The name types itself, the mark pops in and floats, the lines slide in. [levni.dev/banner](https://levni.dev/banner/)
does the same in the browser: **Animated GIF**.

## Rules

1. **Same scene, same seed, same `t`: same frame.** A loop is as reproducible as a still.
2. **Loops close.** `t = 1` is never drawn; the frame after the last is the first.
3. **The critic reads the settled picture.** `animate` returns the same notes as `render`: for the first frame, or for mid-loop when the scene has entrances.
4. **Identical frames are drawn once.** A still scene with `boil: 3` costs three renders, not 24.

## Size and time

Measured on an Apple M4, 24 frames at 800 px wide:

| scene | GIF | WebP | time |
| --- | --- | --- | --- |
| README banner with motion (36 frames) | 0.25 MB | | |
| line art on paper (clouds, trees, flag) | 0.5 MB | 0.4 MB | 6 s |
| ASCII globe ([`examples/glyphfill-globe.json`](../examples/glyphfill-globe.json)) | 0.7 MB | 0.8 MB | 4 s |
| mesh gradient ([`examples/meshgrad-hero.json`](../examples/meshgrad-hero.json)) | 1.4 MB | | 15 s |

GIFs are written by Levni's own encoder (`src/gif.mjs`, plain JavaScript): it stores only the pixels that change
from one frame to the next, about half the size sharp writes for the same frames. `encoder: "sharp"` switches back.
`boil` changes every pixel of the drawing in every step, so it costs the most. GIF handles flat colour well and
gradients badly: for gradients and grain use WebP, a smaller `width`, or fewer frames. GIF plays wherever an image
does (GitHub READMEs, chat, email); animated WebP plays in browsers. For MP4, frame sequences and sprite sheets see
[export.md](export.md).

## In code

```js
import { renderFrames, framePlan, frameStrip } from '@levni/levni';

framePlan(scene, { frames: 4 });               // [{ t: 0 }, { t: 0.25 }, { t: 0.5 }, { t: 0.75 }]
const { frames, width, height, delay, moving } = await renderFrames(scene, { frames: 24, width: 800 }); // PNG buffers
const strip = await frameStrip(frames, { count: 6, width: 280 });   // one PNG to look at
```

`renderFrames` gives you the frames as PNG buffers, for a video encoder or a canvas of your own.
