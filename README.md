# Levni

![Levni: a garden in miniature colours, drawn by Levni](docs/img/banner.png)

**Hand-inked, riso-printed illustrations from a JSON scene.** Design assets for agents and publishers: covers, spot illustrations, icons and social images, drawn by code in one consistent house style, with no image model, no API key and no per-image cost.

Website: **[levni.dev](https://levni.dev)** · Powered by [Ortak Alan](https://ortakalan.io). Named after Levni, the 18th-century Ottoman miniaturist of the Tulip Era, whose colours were famously alive.

| cover | spot | little 3D world |
| --- | --- | --- |
| ![Cover: a rocket in front of a sun on a blue panel, an audience below](examples/cover.png) | ![Spot: books, a coffee cup and a light bulb on a mustard disc](examples/spot.png) | ![Isometric room with a desk, laptop, lamp and stool](examples/room.png) |
| [`cover.json`](examples/cover.json) | [`spot.json`](examples/spot.json) | [`room.json`](examples/room.json) |

The same room in the `miniature` style pack:

![The isometric room in miniature colours](examples/room-miniature.png)

The `soft` finish:

| | | |
| --- | --- | --- |
| ![A blue-teal gradient ribbon arching across a pale background](examples/ribbon-loop.png) | ![An orange ribbon folding into an S, violet on its back side](examples/ribbon-s.png) | ![Three mint tube rings on deep purple](examples/ribbon-rings.png) |

## Why

- **Agents can draw.** A scene is plain JSON: an agent (or a person) places props, panels and textures; Levni does the hand. Same seed, same picture.
- **One look across hundreds of images.** Ortak Alan made ~500 article images with it: pressure-brush ink, riso plate misregistration, crayon paper grain.
- **A shared library: the Levni Folio.** 1,428 drawn props (3,181 variants, 481 of them pixel icons), CC BY 4.0, open to contributions.
- **A critic built in.** Every render returns layout notes (off-canvas, accidental crops, lopsided weight, no focal point) an agent can act on before a human looks.
- **Style packs.** The same scene printed with other inks and paper: `riso` (Ortak Alan's house look, default) and `miniature`, inspired by Tulip Era Ottoman painting, with its own tulips, carnations, cypresses and gilded medallion. Levni does not have to invent every look itself: it can take a tradition as its reference and then draw in it consistently. Set `"style": "miniature"` on a scene; a pack is a colour map in `src/styles.mjs`.
- **A soft 3D finish.** `"finish": "soft"` swaps the crayon for clean edges and film grain, with twisting gradient `ribbon`s, shaded `tube`s and an `image` badge for a logo you own. Good for tech and guide covers. Examples: [`ribbon-loop`](examples/ribbon-loop.json), [`ribbon-s`](examples/ribbon-s.json), [`ribbon-rings`](examples/ribbon-rings.json).
- **An MCP server.** `npx levni mcp` gives assistants five tools: read the scene guide, search the Folio, see props, render a scene and read the critic. See [Use it from an agent](#use-it-from-an-agent-mcp).
- **Data charts.** `bars`, `linechart`, `pie`, `donut` and `isochart` take plain numbers and draw them with the same wobbly ink, flat riso fills and plate misregistration as everything else; values print only with `showValues`. Example: [`chart-inflation`](examples/chart-inflation.json) (sample data).
- **Faceless people.** `person` draws a full-body pictogram in 15 poses (walking, pointing, reading, on the phone, cheering, ...), `people` a row of them; round head with nothing on it, limbs in hand-inked tubes. Example: [`people`](examples/people.json).
- **Fusion slots.** Props can declare named anchors (`screen`, `lens`, `top`, ...) and any element can sit inside one: `{ "type": "prop", "name": "tulip", "in": { "ref": "glass", "slot": "lens" } }` puts a tulip in a magnifier, scaled and rotated with it. 64 hosts (TVs, phones, bags, frames, lenses...) have slots; rect slots fill, point slots stand. Examples: [`slots-tv`](examples/slots-tv.json), [`slots-lens`](examples/slots-lens.json); reference in [`docs/scene.md`](docs/scene.md#slots-fusion).

## Install and use

```bash
npm install github:BoraGkc/levni   # not on npm yet; `npm install levni` once it is
```

```bash
npx levni render scene.json out.png        # or out.webp / out.svg; --preview also writes a 560 px JPEG
npx levni sheet props.png rocket phone     # contact sheet of props (all variants, on paper and on blue)
npx levni list coffee                      # find props by name or tag
npx levni add batch.txt --sheet batch.png  # import props a chat model wrote, check them, draw them
```

```js
import { compose, critique, render } from 'levni';

const scene = { seed: 4, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 360, shadow: true }] };
const { notes } = await render(scene, 'rocket.png');   // writes the file, returns the critic's notes
const { svg, used } = await compose(scene);            // or just the SVG string
```

Requires Node 20+. The only dependency is [sharp](https://sharp.pixelplumbing.com) for rasterizing. The `icon` and `ascii` elements use [Tabler Icons](https://tabler.io/icons) (MIT, ~5,500 icons) when installed: `npm install @tabler/icons`, or point `LEVNI_ICONS` at a folder holding `outline/` and `filled/`.

Your own prop folders: set `LEVNI_PROPS=/path/to/props` (several, separated by `:`), or call `addPropDir()`.

## Use it from an agent (MCP)

`levni mcp` runs an MCP server over stdio. Tools:

| tool | what it does |
| --- | --- |
| `scene_guide` | the scene format (this repo's `docs/scene.md`); read it once |
| `list_props` | search the Folio by word or tag (English and Turkish) |
| `show_props` | a contact image of chosen props, every variant numbered |
| `render_scene` | draw a scene: critic notes, a 560 px preview, and with `out` the full file (.png/.webp/.svg) |
| `critique_scene` | only the critic's notes, for quick iterations |

Claude Code:

```bash
claude mcp add levni -- npx -y github:BoraGkc/levni mcp
```

Claude Desktop, Cursor and other clients (`claude_desktop_config.json`, `.cursor/mcp.json`, …):

```json
{ "mcpServers": { "levni": { "command": "npx", "args": ["-y", "github:BoraGkc/levni", "mcp"] } } }
```

From a checkout, use `"command": "node", "args": ["/path/to/levni/bin/levni.mjs", "mcp"]`. Files from `render_scene` are written relative to the client's working directory. Agents without MCP can call the CLI the same way.

## Ghost adapter

Draw covers and inline images for imageless Ghost drafts: `levni ghost drafts` finds them, a plan file lists a cover scene plus inline scenes after named `h2` headings, `levni ghost attach plan.json` prints the planned edits and `--apply` uploads and places them. Drafts only, never two images in one section, never a newsletter. Needs `GHOST_ADMIN_API_URL` and `GHOST_ADMIN_API_KEY` in the environment. Details and the plan format: [`docs/ghost.md`](docs/ghost.md).

## Scene format

```json
{ "seed": 5, "clip": [60, 52, 1080, 569], "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "prop", "name": "rocket", "x": 780, "y": 300, "size": 380, "rot": 20 },
  { "type": "crowd", "x": 90, "y": 560, "w": 520, "rows": 2, "size": 130, "highlight": "coral" }
] }
```

Canvas 1200 × 673. 46 element types: library props and your own path drawings (with extrusion, hatch shading and cast shadows), small isometric worlds, panels, glyph fields, halftones, flow fields, faceless crowds and isotype grids, full-body pictogram people in 15 poses (`person`, `people`), bubbles, trees, flags, arrows, labels. Full reference: [`docs/scene.md`](docs/scene.md); JSON Schema: [`docs/scene.schema.json`](docs/scene.schema.json).

## Judge

An optional, pluggable judge rates renders against a brief, so an agent can pick the best of several seeds. `levni judge score cover.png --brief "why remote work stalls"` prints `{score 0..3, notes}`; `levni judge pick a.png b.png c.png --brief "..."` scores every image twice in shuffled order, averages, and calls gaps under 0.15 ties. The first adapter uses OpenRouter (`OPENROUTER_API_KEY`, model via `--model` or `LEVNI_JUDGE_MODEL`); writing your own is a single function. Details and lessons: [`docs/judge.md`](docs/judge.md).

## Formats and titles

One scene, several canvases: `levni render scene.json out.png --format og|square|story|youtube` (or `"format"` / `"canvas": [w, h]` in the scene). A scene written for 1200×673 is recomposed, not cropped: grounds stretch, objects keep their shape and move as one cluster into the free area (upper part on `story`). A `"title": { "text", "kicker", "position", "font", "band", "brand" }` adds a crisp headline layer above the art. Rules and limits: [docs/scene.md](docs/scene.md#formats-and-reflow).

## Licensing

- **Code** (`src/`, `bin/`, `test/`): [MIT](LICENSE).
- **Levni Folio**, the prop library (`library/`): [CC BY 4.0](library/LICENSE). Use it anywhere, commercially too; credit "drawings by Ortak Alan (CC BY 4.0)". Where the drawings come from and which ones are flagged: [`library/NOTICE.md`](library/NOTICE.md).
- **Tabler Icons** are MIT (Paweł Kuna), an optional peer dependency, not shipped in this package.
- Images you render are yours; the CC BY credit applies when they contain library props.

Sensitive stories (loss, disaster, illness, courts, grief): a calm blue-palette prop pack and how to use it is in [`docs/sensitive.md`](docs/sensitive.md).

## Submit to the Folio

Short version below; the full guide is [CONTRIBUTING.md](CONTRIBUTING.md).

The Levni Folio grows by contribution. A prop is one JSON file in `library/props/` (to write many at once with any chat model, see [`docs/prop-prompt.md`](docs/prop-prompt.md) and `levni add`):

```json
{
  "name": "watering-can",
  "tags": ["garden", "water", "sulama"],
  "author": "Your Name",
  "variants": [
    { "note": "side view, spout to the right", "paths": [
      { "d": "M20 40 L70 40 L66 86 L24 86 Z", "fill": "tone", "stroke": "ink", "weight": 9 },
      { "d": "M70 52 L92 30", "stroke": "ink", "weight": 9 },
      { "d": "M30 40 Q45 18 60 40", "stroke": "ink", "weight": 8 }
    ] }
  ]
}
```

- **Format.** `name` is the file name: lowercase `a-z0-9` and hyphens, English. `tags` in any language. Draw in a 0–100 box, roughly centred, the object filling 70–90 of it. Paths use colour **names** (`ink`, `blue`, `tone`, `coral`, `mustard`, `green`, `paper`, `white`), not hex, so palettes can be swapped. `weight` is the line width in output pixels (6–10 reads well). A second angle or state of the same object is another variant, not another prop.
- **Inspired by, not copied from.** Drawing in the spirit of a style or tradition (a miniature tulip, a riso poster) is welcome; tracing a specific work is not.
- **Check it.** `npx levni sheet check.png watering-can` shows every variant on paper and on blue; `npm test` validates and renders the whole Folio.
- **Review rules.**
  - **Own work only.** Drawn by you, not traced from photos, icon sets, stock or other illustrations. AI-assisted path code is accepted when you directed and checked it; say so in the pull request.
  - **No faces.** No human faces, portraits or hands; people only as faceless pictograms.
  - **No logos or trademarks**, and nothing that reads as one (a bitten apple, a swoosh, a real flag by accident).
  - **One object, one idea.** No text inside drawings, no scenes (compose those in a scene file).
  - **House style.** Simple shapes, two inks plus paper, readable at 120 px.
- **License.** By submitting to the Folio you release the drawing under CC BY 4.0 and are credited in its `author` field.

## Website

`site/` is the levni.dev site (Astro, static, Cloudflare Pages). Its images are drawn by Levni: `npm run assets` in `site/` re-renders them, `npm run build` builds `site/dist`.

## Tests

```bash
npm test   # validates every prop file, composes each variant alone, rasterizes every variant once (~30 s)
```

---

Levni is made and used by [Ortak Alan](https://ortakalan.io).
