# Scene format

A Levni scene is one JSON object. Elements are drawn **in order**, each on top of the previous one.

```json
{ "seed": 5, "background": "paper", "elements": [ { "type": "prop", "name": "rocket", "x": 600, "y": 336, "size": 360 } ] }
```

Render it: `npx levni render scene.json out.png` (or `.webp`, `.svg`). The command prints the layout critic's notes; fix them or ignore them on purpose.

A machine-readable outline is in [`scene.schema.json`](scene.schema.json).

## Scene fields

| field | type | default | meaning |
| --- | --- | --- | --- |
| `elements` | array | `[]` | what to draw, in order |
| `seed` | integer | `1` | all randomness (hand wobble, ink, crowds) follows it; same seed, same picture |
| `background` | colour | `paper` | canvas colour; `blue`, `ink` or `dark` turn line art to paper automatically |
| `clip` | `[x, y, w, h]` | none | everything stays inside this hand-drawn card |
| `hand` | boolean | `true` | `false` draws plain SVG strokes instead of pressure-brush ink |
| `plateShift` | number | `3.2` | riso misregistration: how far each ink colour's plate drifts |
| `boil` | integer | `seed` | seed of the crayon filter only (animate it for a hand-drawn shimmer) |
| `t` | 0..1 | `0` | animation time; trees sway, clouds drift, flags wave |
| `locale` | string | `en` | locale used to upper-case `label` text (`tr` gives dotted İ) |
| `style` | string or object | `riso` | style pack: `riso` or `miniature`, or your own inks as `{ "blue": "#123456", "coral": "#FF8800" }` (house colour names: paper, white, ink, blue, coral, green, mustard, dark, tone, tone-coral, tone-green, tone-mustard; the rest keep the house hex). Recolours every prop, panel and texture. |
| `finish` | string | `crayon` | `crayon`: hand-inked lines, riso plates, paper grain. `soft`: clean edges and a fine film grain, for the ribbon look |
| `grain` | number | `0.16` | strength of the film grain in the `soft` finish |
| `format` | string | `cover` | canvas preset: `cover` 1200×673, `og` 1200×630, `square` 1080×1080, `story` 1080×1920, `youtube` 1280×720 |
| `canvas` | `[w, h]` | none | explicit canvas size (64..8192 each); wins over `format` |
| `reflow` | boolean | `false` | recompose a scene authored for 1200×673 onto the chosen canvas (below). `levni render --format <name>` sets `format` and `reflow` |
| `reflowFrom` | `[w, h]` | `[1200, 673]` | the canvas the scene was authored for |
| `title` | object | none | headline layer drawn above everything (below) |

## Canvas and colours

The default canvas is **1200 × 673** px (`cover`). Other sizes: see "Formats and reflow". Coordinates are pixels from the top left. Without `format` or `canvas` a scene renders exactly as before.

Colour names: `blue` (panels), `ink` (lines), `coral`, `mustard`, `green`, `paper` (cream), `white`, `dark`, `tone` (light blue), `tone-coral`, `tone-green`, `tone-mustard`, `none`. Any `#rrggbb` also works.

House rule: at most **two main inks plus paper** per scene; a third colour only as a small accent. For sensitive subjects use only `blue`, `tone` and `paper` (props take `"palette": "blue"`).

## Composition rules that work

- **One focus.** One element clearly the largest (≥ 220 px); everything else serves it.
- **Full but breathing.** Fill the frame, keep air around the focus.
- **Bleeding off the edge is fine** when bold (a giant symbol cropped by a panel, a crowd cut at the bottom); set `"crop": true` so the critic knows it is on purpose.
- **No faces, no hands.** People appear only as faceless pictograms (`crowd`, `isotype`, `person`, `people`). Do not draw real people; draw an object that stands for them.
- **Scale contrast.** Giant object with small people, or a big panel with small stickers.
- **Rhythm.** Waves, glyph fields and pictogram rows fill empty space.
- **Pick an idea first.** Before drawing, write three object metaphors for the story ("a dumbbell whose weights are hearts") and keep the sharpest. Alone, a heart, bulb, gear, globe, handshake or rocket is a cliché.

## Elements

### Objects

| type | fields | notes |
| --- | --- | --- |
| `prop` | `id`?, `in`?, `name` (name or tag, any language), `variant`?, `x`, `y` (centre), `size`, `flip`?, `rot`?, `overprint`?, `crop`?, `recolor`? (`{"coral":"blue"}`), `palette`? (`"blue"`), `fit`? | **Use this first.** A drawing from the prop library (`levni list`, `levni sheet`). Takes every `draw` option, including depth. Unknown names fall back to `icon`. |
| `draw` | `x`, `y` (centre of the box), `size`, `paths` [{`d`, `fill`?, `stroke`?, `weight`?, `dash`?, `taper`?, `rule`?}], `rot`?, `flip`?, `overprint`?, `crop`?, `fit`?, `name`? | **Your own drawing** in a 0..100 box as SVG path data. `weight` is output pixels (does not grow with `size`). `dash: [on, off]` for seams and routes; `taper: false` keeps line ends blunt; `rule: "evenodd"` for holes (rings, frames); a zero-length stroke (`M x y h.1`) is a round dot; `fit: true` scales the visible ink to `size` and centres it on `x, y`. |
| depth on `draw`/`prop` | `extrude: {dx, dy, color, steps}` · `shade: {lx, ly, depth, gap, angle, color}` · `shadow: {dx, dy, color, opacity}` (each may be `true`) | Cut-paper thickness, pencil hatching on the side away from the light, a cast shadow. Best on the focal object. |
| `icon` | `name` (English concept), `x`, `y`, `size`, `color`, `under`?, `overprint`?, `rot`?, `weight`? | A Tabler icon redrawn in the house line. **Needs `@tabler/icons`** (optional peer dependency). |
| `ascii` | `name`, `x`, `y`, `w`, `h`, `color`, `font`? | An icon drawn in characters (good inside a `window`). Needs `@tabler/icons`. |
| `iso` | `x`, `y` (world origin on the canvas), `scale`, `weight`?, `projection` (`iso` / `oblique`), `objects` [] | **A small 3D world.** Object kinds: `floor` {x, y, w, d, color, pattern: `boards`/`tiles`/`hatch`}, `wall` {axis `x`/`y`, x, y, w or d, h, color, window: [u, v, w, h]}, `box` {x, y, z?, w, d, h, color, windows: [cols, rows], stripe?}, `cylinder` {x, y, z?, r, h, color}, `prop` {name, x, y, z?, size, variant?}, `draw` {paths, x, y, z?, size}. World axes: x to the lower right, y to the lower left, z up; a room has its two walls at x = 0 and y = 0. Objects stand on their lowest drawn point; to put one on a table set `z` to the table height. One projection per scene. |

### Grounds and textures

| type | fields | notes |
| --- | --- | --- |
| `panel` | `x`, `y`, `w`, `h`, `color`, `rot`?, `outline`? | colour block; dark panels flip line art to paper |
| `disc` | `x`, `y`, `r`, `ry`?, `color`, `outline`? | sun, highlight circle |
| `glyphs` | `x`, `y`, `w`, `h`, `color`, `mode` (`flat`/`radial`/`fade-down`/`fade-up`), `level`, `cx`?, `cy`?, `ramp`? | character texture, glow |
| `waves` | `x`, `y`, `w`, `h`, `gap`?, `amp`?, `color` | water, wind, fields, text lines |
| `hills` | `base`, `height`, `color`, `x`?, `w`?, `step`?, `period`? | hills, mountains |
| `skyline` | `x0`, `x1`, `base`, `minH`, `maxH`, `colors`? | procedural buildings (40–160 heights read calmer) |
| `halftone` | `x`, `y`, `w`, `h`, `color`, `mode` (`radial`/`linear`), `gap`?, `level`? | riso halftone dots |
| `flowfield` | `x`, `y`, `w`, `h`, `colors`?, `spacing`?, `length`?, `scale`?, `turn`?, `weight`? | noise flow lines (wind, water, data) |
| `hatch` | `x, y, w, h` or `x, y, r` or `points`; `color`, `angle`?, `gap`?, `cross`?, `outline`? | hand hatching instead of a flat fill |
| `confetti` | `x`, `y`, `w`, `h`, `kind` (`confetti`/`rain`/`stars`), `spacing`?, `colors`? | Poisson-spread confetti, rain, stars |
| `marks` | `area` [x, y, w, h], `count`, `colors` | stars, sparks, squiggles, plus signs |

### People (faceless only)

| type | fields | notes |
| --- | --- | --- |
| `crowd` | `x`, `y`, `w`, `rows`, `size`, `color`?, `back`?, `highlight`?, `share`? | audience from behind. `y` is the back row's base; each row steps `size × 0.45` down, so to sit on the bottom use `y ≈ 673 − (rows − 1) × size × 0.45` |
| `isotype` | `x`, `y`, `cols`, `rows`, `size`, `color`, `highlight`, `share` | pictogram grid; take the share from the story, never invent numbers |
| `person` | `x`, `y` (feet, centre), `size` (height), `pose`, `facing`? (`right` default, `left` flips), `color`? (body, default white), `outline`?, `accent`? (colour of a scarf, or a bag with `accentKind: "bag"`), `hold`?, `itemColor`?, `phone`? | one full-body faceless figure: round head with nothing on it, rounded torso, limbs as thick inked tubes, mitten ends. Poses: `standing`, `walking`, `running`, `sitting` (on an implied seat: the hip floats, draw the chair yourself), `pointing`, `waving`, `raising-arm`, `holding` (give `hold` a prop name to draw it small at the hands), `carrying` (a box, coloured by `itemColor`), `reading` (a book), `phone` (arm to the ear; `phone: false` hides the handset), `thinking` (hand at the chin), `cheering`, `kneeling`, `leaning` (leans back on an implied wall; draw the wall yourself). Feet always land on `y`. On a blue panel use `color: "paper"` or a tone; the far arm and leg are tinted so the pose reads. Weakest at small sizes: `leaning`, `thinking` |
| `people` | `x`, `y` (baseline), `w`, `n`, `size`, `poses`? (list, cycled), `colors`? (cycled), `accents`?, `facing`? (`left`/`right`/`alternate`; default: left half faces right, right half faces left, so they face each other), `hold`?, `vary`? | `n` persons spread along a line from `x` to `x + w` with slight height and position variation; use for groups, queues, conversations. Reads best at `size` 160–320 |

### Things and marks

| type | fields | notes |
| --- | --- | --- |
| `sheet` | `x`, `y`, `w`, `h`, `color`, `rot`?, `content` (`lines`)?, `pin`? | paper, note, document |
| `window` | `x`, `y`, `w`, `h`, `title`? | screen or browser window |
| `bubble` | `x`, `y`, `w`, `h`, `tail` (`left`/`right`), `content` (`lines`/`dots`/`heart`/`none`), `color`?, `accent`? | speech bubble |
| `stack` | `x`, `y`, `w`, `h`, `count`?, `colors`? | pile of papers |
| `tree` | `x`, `y` (root), `size`, `depth`?, `leaves`?, `leafColors`?, `weight`? | recursive branching tree |
| `plant` | `x`, `y` (pot rim), `size`, `leaves`?, `leafColor`?, `pot`?, `potColor`? | potted plant |
| `cloud` | `x`, `y` (base), `size`, `bumps`?, `color`?, `drift`? | cloud |
| `sunburst` | `x`, `y`, `size`, `rays`?, `color`?, `rayColor`? | rayed sun |
| `rose` | `x`, `y`, `size`, `petals`?, `fill`?, `center`? | rose-curve flower or emblem |
| `spiro` | `x`, `y`, `size`, `R`?, `r`?, `d`?, `turns`? | hypotrochoid ornament (money, seals) |
| `flag` | `x`, `y`, `w`, `h`, `stripes` [], `canton`? | waving striped flag; must not imitate a real country's flag by accident |
| `badge` | `x`, `y`, `size`, `color`?, `fill`?, `weight`? | round badge frame |
| `ticks` | `x`, `y` (corner of an object), `angle`?, `spread`?, `size`?, `colors`?, `count`? | three short coloured dashes radiating from an object; once or twice per scene |
| `arrow` | `from` [x, y], `to` [x, y], `bend`, `color` | hand-drawn arrow |
| `line` / `shape` | `points` [[x, y] …], `color` / `fill`, `stroke`, `weight`, `closed`? | free line or shape |
| `brush` | `points` [[x, y] …], `width`?, `taper`?, `color` | brush stroke that swells in the middle |
| `label` | `text`, `x`, `y`, `size`?, `color`?, `anchor`?, `upper`? | small mono label (section / topic). Not for headlines. |

### Data charts

Charts are drawn with the hand pen from numbers you give; nothing else is invented. Values are scaled to the box, zero and negative values are handled (negative bars hang below the baseline), and bad numbers count as 0. Common options: `labels` [text …], `colors`, `highlight` (index, painted `coral` with the rest `tone`), `showValues` (prints the numbers, with `prefix`, `suffix`, `decimals`), `labelSize`, `weight`, and `ink` (axis, outline and label colour; on a dark panel set `"ink": "paper"` and pick `colors` that show on it).

| type | fields | notes |
| --- | --- | --- |
| `bars` | `x`, `y`, `w`, `h`, `values`, `horizontal`?, `gap`? (0..0.9), `baseline`? (false hides it), `min`?, `max`? | bars from a zero baseline; a value outside `min`/`max` is clipped to it |
| `linechart` | `x`, `y`, `w`, `h`, `series` [[…], […]] or `values`, `dots`?, `area`? (fills under the first series), `areaColor`?, `axis`?, `zero`? (false: do not force the scale to include 0), `min`?, `max`? | one line per series; a single value becomes a dot |
| `pie` / `donut` | `x`, `y` (centre), `r`, `values`, `hole`? (0..0.8; donut default 0.55), `explode`? (fraction of r), `start`? (degrees, default -90) | negatives count as 0; all zeros draws an empty outline; `highlight` also pulls that slice out |
| `isochart` | `x`, `y` (top-left of first row), `values`, `unit` (value per icon), `icon`? ("person" or a prop name), `size`?, `maxIcons`?, `showUnit`? | one row per value, a part icon is cropped to the remainder (12.5 at unit 10 is 1.25 icons); `unit` is raised if a row would exceed `maxIcons` (24) |

### Soft 3D look (use with `"finish": "soft"`)

| type | fields | notes |
| --- | --- | --- |
| `ribbon` | `points` [[x, y] …] or `circle` [cx, cy, r], `width`, `colors` [a, b, …] (gradient along the length), `back`?, `twists`?, `phase`?, `closed`?, `highlight`? | a wide band swept along a smooth line; where it twists it narrows and shows its `back` side. 5–7 points that run off the canvas read best |
| `tube` | `points` or `circle` [cx, cy, r] (or [cx, cy, rx, ry, rotation]), `width`, `color`, `light`? | a round tube shaded from a dark rim to a light core; three circles make interlocking rings |
| `image` | `src` (local png, jpg, svg or webp), `x`, `y` (centre), `size`, `card`?, `cardColor`?, `radius`? | a picture on a rounded card, e.g. a product logo you have the right to show. Logos never go into the Folio |

## Formats and reflow

`format` / `canvas` set the canvas; the frame, filters and critic follow it. A scene whose coordinates are written for another size simply sets `format` and uses its own coordinates. To **reuse** a 1200×673 scene on another canvas set `"reflow": true` (or `levni render scene.json out.png --format story`). It is a recomposition, not a crop:

1. **Grounds stretch.** Full-bleed elements (`panel`, `glyphs`, `waves`, `halftone`, `flowfield`, `hatch`, `confetti` spanning at least 80 % of the width or height, and `hills`) and `clip` are stretched to the new canvas. Hills stay on the bottom edge and keep their proportions. A radial `glyphs` glow follows the moved objects.
2. **Everything else is one object cluster.** Its internal layout and relative positions are kept; it scales by `min(sx, sy)` (never distorted, never cropped: it is shrunk further if it does not fit), and keeps ink widths and the hand look.
3. **Placement.** Wide canvases (`og`, `youtube`) keep the cluster's relative position. Square and tall canvases centre it in the free area; on a tall canvas (`story`) that area is the upper part (top 10 % and bottom 26 % kept clear of app bars and for the title).
4. **Title-aware.** With a `title`, the free area excludes the title block or band (plus a gap), so objects never sit under the text.

Limits: a cluster that is wide and shallow leaves empty ground above and below on tall canvases (it is not re-spread); objects that sit on a ground edge on purpose (a crowd at the panel's bottom, `crop: true` bleeds) float or end short after scaling; `marks` and small satellites move with the cluster and can end close to the edge. For those scenes author the tall version directly (`"format": "story"` with its own coordinates). Cost: a reflow composes twice (measure, then draw).

## Title layer

```json
{ "title": { "text": "Why every newsroom wants a data desk", "kicker": "Analysis", "position": "bottom",
             "font": "serif", "brand": "levni.dev", "band": "blue", "color": "paper" } }
```

| field | meaning |
| --- | --- |
| `text` | the headline; word-wrapped, at most 3 lines (an ellipsis if it still does not fit), the largest font size that fits |
| `position` | `bottom` (default), `top`, `left` (a column, ~42 % of the width), `band` (a full-width colour band at the bottom, `blue` unless `band` is set) |
| `font` | `serif` (Georgia), `sans` (Helvetica Neue), `mono` (Menlo), or `{ "file": "/path/font.ttf" }` (also `.otf`, `.woff`, `.woff2`; optional `width` per-em character width, default 0.6) |
| `kicker` | small upper-case mono line above the title |
| `brand` | small mono line below it, e.g. `levni.dev` |
| `color`, `kickerColor` | text colours (names or `#rrggbb`); default ink on light grounds, paper on dark grounds or bands |
| `band` | colour of a backing band (full width for `top`/`bottom`, a column for `left`) |

The title is plain SVG text above everything, outside the crayon filter, with safe margins (about 5.5 % of the short side; on `story` also 10 % at the top and 14 % at the bottom for app bars). Without a band the text gets a thin halo in the background colour; on dark art use `band` or `color`. Line breaks come from an approximate character-width model (average width per family), so exotic fonts may need `width`. No font is shipped: the stacks use fonts most systems have. A `font.file` is embedded as a base64 `@font-face`, which browsers honour in `.svg` output; the PNG/WebP rasteriser (sharp/librsvg) uses system fonts and ignores `@font-face`, so for raster output install the font on the machine.

## Slots (fusion)

A prop can name places inside its own 0..100 box where something else belongs: a TV has a `screen`, a magnifier a `lens`, a trophy a `top`. Another element can then be put **in** that slot; Levni positions and scales it, whatever the host's `x`, `y`, `size`, `flip` and `rot`.

```json
{ "type": "prop", "id": "tv1", "name": "old-crt-tv-long-shadow", "x": 460, "y": 340, "size": 520 },
{ "type": "prop", "name": "chart-board", "in": { "ref": "tv1", "slot": "screen" }, "fit": 0.92 }
```

- **Host.** Give the host an `id` (any string on any element), or skip it and use `"in": { "prop": "radio", "slot": "dial" }`, which means the most recent earlier element of that prop name. The child must come **after** the host in `elements` (it is drawn on top).
- **Rect slots** `[x, y, w, h]` are areas to fill. A `prop` or `draw` child is scaled to fit inside (its visible ink, aspect kept) and centred; `fit` is the fill factor, default `0.9` (above 1 lets it overflow). `icon` is centred at the largest square that fits; `label` is centred and sized to the slot unless `size` is set; `glyphs` and `panel` get `x, y, w, h` from the slot. A fifth number tilts a rect slot (degrees, e.g. a credit card's number line).
- **Point slots** `[x, y]` are places where something stands. The child's bottom-centre lands on the point; its size is its own `size` (default 30 % of the host), times `fit` when given. `label` is centred on the point.
- **Children**: `prop`, `draw`, `icon`, `glyphs`, `label`, `panel`. Their own `x`, `y` are ignored; `dx`, `dy` nudge the result in pixels; `rot` adds to the host's rotation; `flip` is the child's own.
- A host can be a child too: put a TV in a TV by giving the inner one an `id` and an `in`.
- **Errors.** An unknown slot lists the host's slots (`host "phone" has no slot "lens". Available slots: screen (rect)`); an unknown `ref` lists the earlier ids; a host variant without slots says so.
- **Authoring slots.** Add `"slots": { "screen": [22, 23, 60, 36], "top": [50, 8] }` to a prop variant (any variant, coordinates in its 0..100 box, all inside 0..100; `npm test` checks this). To check the numbers, draw the host with a translucent rect on each slot and look at it. 64 library props have slots on their first variant: monitor, old-crt-tv-long-shadow, mini-flat-screen, tv-face, stage-tv, curtain-tv, falling-ratings-tv, spiral-tv, tv-planter-screen-leaves, tv-apple-antenna, phone, radio, laptop, book, pulse-hand-mirror, door, code-window, shopping-bag, coffee-cup, package, ticket, giant-ticket, warning-sign, dashboard, pill-bottle, stone-suitcase, magnifier, globe, envelope, newspaper, calendar, clapperboard, chart-board, easel, notebook, wallet, credit-card, trophy, trophy-tumbler, briefcase, money-bag, bucket, jug, pitch-deck, paper, stopwatch, clock, film-camera, microphone, lightbulb, sticky-notes, witness-stand-mic, vault-hatch, camera, receipt, map, ballot-box, server-rack, file-cabinet, bench, talk-desk-mic-chat, podium-black-ball, wine-bottle-price-tag, book-stack. Look up a prop's slots in `library/props/<name>.json`.

Examples: [`slots-tv`](../examples/slots-tv.json), [`slots-lens`](../examples/slots-lens.json).

## The critic

`compose()` also returns the box of everything it drew; `critique(used, canvas)` turns that into at most six notes: elements running off the canvas, objects cut by the frame by accident, lopsided weight, no clear focal symbol, icons overlapping. It is cheap and blind to meaning: look at the picture too.

## Known limits

- On a blue panel, `ink` lines and an `overprint` read almost black: use `paper` for lines and `coral`/`mustard` for the second ink.
- For a road in perspective use a thick `line` (weight 60–80), not a `shape`.
- To put the sun behind buildings, write the `disc` before the `skyline`.
