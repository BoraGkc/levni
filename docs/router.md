# Design Router

One search over everything open that Levni draws with: Folio drawings, Tabler icons, the four OFL fonts, palettes, pattern generators, motion presets and shots. Results are ranked together; each one shows its licence, its credit and a snippet to paste into a scene, and every preview can be drawn in your colours. In the browser at [levni.dev/router](https://levni.dev/router/), in the terminal as `levni route`, and for agents as the `route_design` MCP tool.

```bash
npx @levni/levni route kahve --colors '#E8522F,#1E1466' --sheet sheet.png
```

```
drawing  cezve        CC BY 4.0  ·  {"type":"prop","name":"cezve","x":600,"y":336,"size":260}
drawing  coffee       MIT (redrawn from Tabler Icons)  ·  {"type":"prop","name":"coffee",…}
…
style: {"blue":"#E8522F","tone":"#F5B1A1","coral":"#1E1466",…}
```

## What a query can be

- **A thing**, in English or Turkish: `coffee`, `kedi`, `rocket`, `music`. Drawings come first; a plain Tabler icon of the same thing comes after them.
- **A kind word** narrows it: `headline font`, `dots pattern`, `night palette`, `float motion`, `launch shot`, `coffee icon`. Kind words alone list the kind: `fonts`, `patterns`, `palettes`.
- `--kind drawing,font` (CLI) or `kinds` (MCP) picks kinds explicitly.

| Kind | What it is | Licence | Snippet |
| --- | --- | --- | --- |
| drawing | a Folio drawing | CC BY 4.0, or MIT when redrawn from Tabler Icons | a `prop` element |
| icon | a Tabler icon, inked (needs `@tabler/icons`) | MIT | an `icon` element |
| font | Space Grotesk, Archivo Black, JetBrains Mono, Departure Mono | OFL 1.1 | a `type` element |
| palette | riso, miniature, night, forest, sunset, mono, pastel | CC0 | a scene `style` |
| pattern | halftone, waves, hatching, shape grid, dot matrix, confetti, stars, rain, mesh gradient, flow field, ridgelines, hills, skyline, grain | MIT | the element |
| motion | every loop and entrance | MIT | a `motion` field |
| shot | the 25 shots | MIT | `{ "shot": id, "fields": {…} }` |

## Your colours

`--colors '#E8522F,#1E1466,#F2C230'` (CLI), `colors` (MCP) or the three swatches on the page turn your colours into Levni inks: blue, coral, mustard and green in that order, each with a light tone, and `ink` as a dark version of the first. The previews are drawn with them and you get the ink map to put in any scene's `style`. Palettes always show their own inks.

## For agents

```json
{ "name": "route_design", "arguments": { "query": "coffee", "colors": ["#E8522F", "#1E1466"], "limit": 8 } }
```

The tool answers with the ranked list (kind, id, licence, credit, snippet), your ink map, and a contact sheet of the previews.

## From code

```js
import { routeDesign } from '@levni/levni';
const { results, counts } = routeDesign('coffee', { colors: ['#E8522F'], limit: 6 });
// results[0].snippet → paste into a scene; results[0].scene → a small preview scene to render
```

`catalog`, `route`, `routeScene` and `inksFrom` (from `src/router.mjs`) work in the browser too, with any list of drawings you give them.
