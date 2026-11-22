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

## Canvas and colours

The canvas is **1200 × 673** px (social / Open Graph ratio). Coordinates are pixels from the top left.

Colour names: `blue` (panels), `ink` (lines), `coral`, `mustard`, `green`, `paper` (cream), `white`, `dark`, `tone` (light blue), `tone-coral`, `tone-green`, `tone-mustard`, `none`. Any `#rrggbb` also works.

House rule: at most **two main inks plus paper** per scene; a third colour only as a small accent. For sensitive subjects use only `blue`, `tone` and `paper` (props take `"palette": "blue"`).

## Composition rules that work

- **One focus.** One element clearly the largest (≥ 220 px); everything else serves it.
- **Full but breathing.** Fill the frame, keep air around the focus.
- **Bleeding off the edge is fine** when bold (a giant symbol cropped by a panel, a crowd cut at the bottom); set `"crop": true` so the critic knows it is on purpose.
- **No faces, no hands.** People appear only as faceless pictograms (`crowd`, `isotype`). Do not draw real people; draw an object that stands for them.
- **Scale contrast.** Giant object with small people, or a big panel with small stickers.
- **Rhythm.** Waves, glyph fields and pictogram rows fill empty space.
- **Pick an idea first.** Before drawing, write three object metaphors for the story ("a dumbbell whose weights are hearts") and keep the sharpest. Alone, a heart, bulb, gear, globe, handshake or rocket is a cliché.

## Elements

### Objects

| type | fields | notes |
| --- | --- | --- |
| `prop` | `name` (name or tag, any language), `variant`?, `x`, `y` (centre), `size`, `flip`?, `rot`?, `overprint`?, `crop`?, `recolor`? (`{"coral":"blue"}`), `palette`? (`"blue"`), `fit`? | **Use this first.** A drawing from the prop library (`levni list`, `levni sheet`). Takes every `draw` option, including depth. Unknown names fall back to `icon`. |
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

### Soft 3D look (use with `"finish": "soft"`)

| type | fields | notes |
| --- | --- | --- |
| `ribbon` | `points` [[x, y] …] or `circle` [cx, cy, r], `width`, `colors` [a, b, …] (gradient along the length), `back`?, `twists`?, `phase`?, `closed`?, `highlight`? | a wide band swept along a smooth line; where it twists it narrows and shows its `back` side. 5–7 points that run off the canvas read best |
| `tube` | `points` or `circle` [cx, cy, r] (or [cx, cy, rx, ry, rotation]), `width`, `color`, `light`? | a round tube shaded from a dark rim to a light core; three circles make interlocking rings |
| `image` | `src` (local png, jpg, svg or webp), `x`, `y` (centre), `size`, `card`?, `cardColor`?, `radius`? | a picture on a rounded card, e.g. a product logo you have the right to show. Logos never go into the Folio |

## The critic

`compose()` also returns the box of everything it drew; `critique(used)` turns that into at most six notes: elements running off the canvas, objects cut by the frame by accident, lopsided weight, no clear focal symbol, icons overlapping. It is cheap and blind to meaning: look at the picture too.

## Known limits

- On a blue panel, `ink` lines and an `overprint` read almost black: use `paper` for lines and `coral`/`mustard` for the second ink.
- For a road in perspective use a thick `line` (weight 60–80), not a `shape`.
- To put the sun behind buildings, write the `disc` before the `skyline`.
