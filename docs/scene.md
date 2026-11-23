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
| `iso` | `preset`? + `seed`?, or `objects` []; `base`?, `style`?, `palette`?, `x`, `y`, `scale`, `fit`?, `ao`?, `weight`?, `projection`? | **A small 3D world**: rooms, desks, streets, cities, floating dioramas. One line gives a whole scene (`{"type": "iso", "preset": "cafe", "seed": 2}`). Full reference: [Little 3D worlds](#little-3d-worlds-iso) below. |

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
| `meshgrad` | `x`, `y`, `w`, `h` (or `x`, `y`, `r` for an orb); `preset`? (`orb`/`poster`), `shape`? (`rect`/`circle`/`squircle`), `radius`? (rect corners, px), `exponent`? (squircle, default 5), `base`?, `colors`? (default blue, coral, mustard, tone), `count`? (2..12, default 5) or `stops`? [{`x`,`y`,`color`,`r`?,`opacity`?} in 0..1 box units], `blur`? (px, default 14% of the short side), `drift`? (t motion, default 0.06), `grain`? (0..1, default 0.35), `grainSize`?, `bands`? (2..12 hard colour steps), `lines`? (contour lines between bands), `calm`? [[x,y,w,h]] quiet zones for text, `mask`? [{x,y,w,h,shape?,radius?}] show the field only inside these shapes | grainy mesh-gradient / blurred-orb background, feature tile, avatar or posterised poster; best with `"finish": "soft"` |
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

### Soft 3D (v2): real 3D shapes, use with `"finish": "soft"`

A small 3D renderer in plain math: shapes are cut into small quads, lit (a key light from the upper left, ambient, a soft glossy highlight and a rim), coloured through a ramp per material (cool shadow, base, pale highlight) and painted back to front. A ribbon passes behind itself, interlocking rings really interlock, and quads are overdrawn with their own colour so no seam shows. Pure SVG, no dependency; a typical cover renders in about half a second.

**Coordinates.** Canvas pixels, as everywhere: x right, y down, plus z toward the viewer (z = 0 is the picture plane, where a point lands exactly on its x, y). One perspective camera looks at the canvas centre; `fov` (default 28) sets how strong the perspective is. A shape placed with `x`, `y`, `size` is built in a unit space (radius 1) and scaled so it is about `size` px across; `rotate: [rx, ry, rz]` (degrees, x first, then y, then z) turns it about its own centre. Each element is sorted on its own: shapes that must pass through each other go into one `soft3d` element.

**Materials.** `colors` (a gradient across the shape: around a torus, along a ribbon, top to bottom on a sphere) or `color`; `gloss` (0..1, default 0.55), `shine` (highlight tightness, default 34), `rim` (0..1), `rimColor`, `shadowTint` (default deep indigo), `highlight`, `shadowColor`. `shadow`: a soft drop shadow (default on; `false`, or `{ color, opacity, blur, dx, dy }`). `spin`: turns per animation loop.

| type | fields | notes |
| --- | --- | --- |
| `ribbon3d` | `preset` (`loop`, `s-curve`, `wave`, `spiral`, `mobius`, `knot`, `ring`) or `points` [[x, y, z] …] (canvas px), `x`, `y`, `size`, `width` (px), `twist` (turns along the length), `colors` (stops along the length), `back` (colour of the back side), `roll`, `curl`, `seed` | a band swept along a smooth 3D line with rotation-minimising frames. `mobius` (a closed band with `twist: 0.5`) has one side and no seam. `seed` bends a preset smoothly, so every seed is a slightly different ribbon. With `points` the line is in canvas pixels and `x`, `y`, `size` are not used |
| `tube3d` | same as `ribbon3d`, `width` is the diameter | a round tube along the line; `preset: "knot"` is a trefoil knot |
| `torus3d` | `x`, `y`, `size`, `thickness` (tube / ring radius, default 0.36), `rotate`, `colors` | a glossy ring |
| `sphere3d` | `x`, `y`, `size`, `colors` | |
| `capsule3d` | `x`, `y`, `size` (length), `radius` (0..1 of half the length, default 0.42), `rotate`, `colors` | a pill |
| `blob3d` | `x`, `y`, `size`, `wobble` (default 0.22), `seed`, `colors` | a smooth, softly lumpy sphere; the seed shapes it |
| `cubes3d` | `x`, `y`, `size`, `heights` [[…] rows] or `rows`/`cols`/`maxHeight` (seeded), or `blocks` [[i, level, j] …], `round` (corner radius, default 0.18), `gap`, `colors`, `colorBy` (`height`), `rotate`, `seed` | stacked rounded blocks, like a little building or a 3D bar chart; with two `colors` and `"colorBy": "height"` the stack shades from the first colour at the bottom to the last at the top |
| `extrude3d` | `name` (+ `variant`, `recolor`, `palette`) of a Folio prop, or `paths` (0..100 box), `x`, `y`, `size`, `depth` (fraction of size, default 0.16), `rotate` (default [-16, -26, 3]), `lines` (`raised` or `none`), `ink` (recolour the lines), `sheen` (`false` to switch off the front gloss) | every library drawing as a 3D icon: the filled shapes become one thick object with rounded, lit sides, the front keeps the prop's colours, the ink lines become a raised rim. Fits the visible ink to `size` |
| `soft3d` | `objects` [{ `type`: `torus`, `sphere`, `capsule`, `blob`, `cubes`, `ribbon`, `tube`, plus their fields, `x`, `y`, `z`, `size`, `rotate` }], `x`, `y` (pivot), `rotate` (turns the whole group about the pivot), `yaw`, `pitch`, `fov` | several shapes with one camera and one depth sort: chains of rings, a planet in its ring. Objects inside a scene have no default rotation |
| `soft3d` with `preset` | `preset`: `auto` or `ribbon`, `wave`, `mobius`, `spiral`, `knot`, `rings`, `orbit`, `pebbles`, `stack`; `seed`, `palette`, `titleSpace` (`bottom` default, `top`, `left`, `none`), `badge` (an image path or the `image` fields), `badgeCorner`, `side` (`right`/`left`), `background` (`false` keeps the scene's own) | a whole cover: a studio gradient background with a glow, one or two hero shapes bleeding off one or two edges, clear room for a left-aligned title, and a clear corner for a badge. The layout is chosen by trying several placements and keeping the most balanced one. With `auto`, seeds 1 to 9 walk through all nine layouts, so neighbouring seeds always differ |

**Palettes** for `soft3d` presets (`palette`): `aqua` (pale blue, teal to indigo), `sunset` (peach, amber to violet), `mint-night` (deep purple, mint), `lilac` (pale lilac, violet), `mono-blue` (royal blue, pale blues), or your own: `{ "background": ["#F2EEE6", "#E4DCCD"], "stops": ["#FFB36B", "#FF5E62", "#8E3BC9"] }` (optional `solids` [[a, b] …] for spheres and rings, `cubes`, `shadowTint`, `dark`). On the dark palettes set the scene `background` to the palette's dark colour (`#140A35` for mint-night, `#071A5C` for mono-blue) so the title picks light text and a matching halo.

```json
{ "finish": "soft", "background": "#E4EEF9",
  "elements": [{ "type": "soft3d", "preset": "auto", "seed": 4, "palette": "aqua", "badge": "logo.svg" }],
  "title": { "text": "Why every newsroom wants a data desk", "kicker": "Analysis" } }
```

Limits: painter's sorting is per quad, so two surfaces that actually cut through each other (not just pass close) show a slightly jagged meeting line; interlocking rings must not touch: with ring radius R and tube radius r (`thickness` = r / R, at most 0.33 for a chain), put chain links between R + r and 2 (R − r) apart (`size` 300 and `thickness` 0.3: 150 to 160 px); two links can simply sit R apart. Each element sorts only its own shapes. Shading is flat per quad (quads are a few pixels), so very large, very smooth shapes can show faint steps that the film grain hides. The old `ribbon` and `tube` above stay as they were.

## Little 3D worlds (`iso`)

An `iso` element is a small isometric world built from objects in world units (about a pixel at scale 1). World axes: **x** runs to the lower right, **y** to the lower left, **z** up. A room has its two walls at x = 0 (the left wall, along y) and y = 0 (the right wall, along x); the viewer looks from +x, +y, above. Every object stands on z = 0 unless you give `z` (put a laptop on a 60-high desk with `"z": 60`). Objects are drawn in painter's order from their 3D boxes (far before near, under before on top), so the order you list them in does not matter.

```json
{ "type": "iso", "preset": "room", "seed": 3 }
{ "type": "iso", "preset": "city", "seed": 2, "style": "soft", "palette": "pastel" }
{ "type": "iso", "base": { "shape": "round" }, "objects": [ { "kind": "tree", "x": 0, "y": 0 }, { "kind": "bench", "x": 30, "y": -20 } ] }
```

**World options**

| field | meaning |
| --- | --- |
| `preset` | `room`, `desk`, `street`, `city`, `cafe`, `office`, `classroom`: a seeded generator lays out a plausible scene (walls, windows with sunlight, furniture, props, trees, roads, people) on a diorama base. |
| `seed` | picks the preset's layout, colours and people (default 1). Same seed, same world. |
| `objects` | your own objects. With a preset they are **added**; an object with the `id` of a preset object **overrides** its fields (`{"id": "rug", "color": "mustard"}`), and `{"id": "rug", "remove": true}` drops it. Preset ids: `floor`, `wall-back`, `wall-left`, `rug`, `desk`, `sofa`, `shelf`, `plant`, `person`, `counter`, `menu`, `board`, `road`, `car-1`, … (ids follow the kind; see `src/iso-presets.mjs`). |
| `base` | `true` or `{ shape, depth?, top?, edge?, …}` with `shape` `square` / `round` / `island` and `edge` `grass` / `tile` / `none`; also `{ margin?, lift?, float?: false, shadow?: false, layers?: [{h, color, hatch?}], x?, y?, w?, d? }`: the world sits on a thick slab with visible soil layers and a grass lip (or a tile edge), floating over a soft contact shadow. `island` tapers into a rounded keel. Without `x/y/w/d` the slab follows the objects plus `margin` (26). |
| `style` | `soft`: smooth gradient shading, no ink outline, a light rim on top faces (pair it with the scene's `"finish": "soft"`). Default: hand-inked faces, three riso tones and hatching on the shaded side. Props and people keep their own line in both styles. |
| `palette` | colour roles for presets and default object colours: `house` (default), `pastel`, `warm`, `blue` (blue only, for hard news: every accent and every prop folds into the blue family). |
| `x`, `y`, `scale` | where the world origin lands and how big a world unit is. Leave all three out and the world is **fitted** to the canvas (`fit: [x, y, w, h]` fits it into a box instead). |
| `ao` | ambient occlusion (default on): a soft dark band where walls meet the floor and in room corners, contact shadows under every object, a faint cast shadow to the lower right. `false` keeps only the cast shadows. |
| `weight` | outline weight (default 7, thinner at small scales). |

**Object kinds** (all take `x`, `y`, `z`?, `color`?; sizes are `w` along x, `d` along y, `h` up)

| kind | fields | notes |
| --- | --- | --- |
| `floor` | `w`, `d`, `pattern`: `boards` / `tiles` / `checker` / `hatch`, `step`? | |
| `wall` | `axis` `x` / `y`, `w` or `d`, `h`, `t`? (thickness, 14), `windows`: [[u, v, w, h] or {u, v, w, h}], `light`?, `door`: [u, w, h], `arch`: [u, w, h], `cap`? | a thick slab with its cut top showing. Openings are cut in with their reveal (the wall's depth) and what lies beyond; windows get mullions and a sill; `light: true` throws the window's patch of sunlight on the floor. `window: [u, v, w, h]` (one) also works; values ≤ 1 are shares of the wall. |
| `box` | `w`, `d`, `h`, `windows`: [cols, rows], `stripe`?, `door`?, `roof`?: `gable` / `hip` / `flat`, `roofColor`?, `ridge`? `x`/`y` | |
| `house` | `w`, `d`, `h`, `ridge`?, `roofColor`?, `doorColor`? | a box with a gable roof, a door and windows |
| `building` | `w`, `d`, `h`, `lights`? | windows on both faces (`lights: true` lights some of them), a flat roof with a parapet and a roof unit |
| `roof` | `w`, `d`, `h`, `type` `gable` / `hip` / `flat`, `parapet`?, `overhang`? | on its own, e.g. on top of your own box |
| `stairs` | `w`, `d`, `h`, `steps`? (5), `dir`: `+x` / `-x` / `+y` / `-y` (the way up) | |
| `ramp` | `w`, `d`, `h`, `dir` | a wedge rising toward `dir` |
| `fence`, `lowwall`, `hedge` | `axis`, `w` or `d`, `h`?, `gap`? (fence pickets) | |
| `pond` / `water` | `w`, `d`, `shape` `round` / `rect`, `rim`?, `lily`? | stone rim, sunken water, ripples |
| `road` | `w`, `d`, `axis`, `dashes`?, `crossing`? (offset of a zebra crossing) | |
| `path` | `w`, `d`, `stones`?, `shape`? | pavement, sidewalk or garden path |
| `rug`, `decal` | `w`, `d`, `shape` `rect` / `round`, `pattern`? `stripes`, `border`? | flat on the floor |
| `tree` | `r`, `h`, `shape` `ball` / `cone` / `pine`, `trunk`? | |
| `bush` | `r` | |
| `lamp` | `h`, `glow`? | a lamp post with a pool of light |
| `bench`, `chair`, `sofa`, `table` (`shape: "round"`), `desk`, `counter`, `shelf` (with books), `bed` | `w`?, `d`?, `h`?, `facing` `+x` / `-x` / `+y` / `-y` | room-scale furniture (a desk is 60 high, a person 120) |
| `car` | `axis` | |
| `cylinder`, `stool`, `pot` | `r`, `h` | `pot` carries a round plant |
| `person` | `h` (120), `pose`, `facing`, `color`, `accent`? | a faceless `person` standing at a world point (sitting on a chair: same x, y as the chair) |
| `prop`, `draw` | `name` / `paths`, `size`, `variant`?, `contact`? | stands on its lowest drawn point |
| `prop` / `draw` with `wall` | `wall` `x` / `y`, along-wall position (`x` on an x wall, `y` on a y wall), `z` (centre height), `size` | **hung on the wall**: the drawing is mapped into the wall plane (a poster, a clock, a calendar) |
| `frame`, `board`, `clock` | `wall`, position, `z`, `w`, `h` / `r`, `art`: `hills` / `blob` / `chart` / `chalk` / `lines` | a framed picture, a chalk or white board, a wall clock |

The first-generation kinds (`floor`, `wall`, `box`, `cylinder`, `prop`, `draw`) with none of the options above keep the original renderer and draw exactly as before; `projection: "oblique"` works only there. Examples: [`iso-room`](../examples/iso-room.json) (a hand-built diorama), [`iso-city`](../examples/iso-city.json), [`iso-cafe`](../examples/iso-cafe.json) (a preset with an override), [`iso-soft`](../examples/iso-soft.json).

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

### Meshgrad recipes

Hero background with a quiet corner for the title (box units 0..1), a posterised orb and a gradient avatar:

```json
{ "finish": "soft", "background": "#14122B", "elements": [
  { "type": "meshgrad", "x": 0, "y": 0, "w": 1200, "h": 673, "base": "#1B1745", "blur": 90,
    "stops": [{ "x": 0.12, "y": 0.2, "color": "#FF7A59", "r": 0.75 }, { "x": 0.9, "y": 0.15, "color": "#2FD4FF", "r": 0.6 }],
    "calm": [[0, 0.52, 0.62, 0.48]] },
  { "type": "meshgrad", "x": 900, "y": 450, "r": 90, "preset": "poster", "colors": ["coral", "mustard"] },
  { "type": "meshgrad", "x": 1060, "y": 450, "r": 60, "preset": "orb", "colors": ["#7CF0D0", "#2A9DFF", "#2A2BA8"] }
] }
```

With no `colors` the field uses the engine inks, so it follows `style` packs. `mask` keeps the gradient to chosen shapes and leaves the rest of the box empty.
