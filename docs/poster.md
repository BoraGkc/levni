# Branding posters

One brand spec becomes a series of portrait posters (1200 × 1600) that share inks, type and a mark: the kind of
series a studio posts when it launches an identity. No image model: big type is drawn from bundled fonts as paths,
and the rest is halftone, dither, dot-matrix, noise blobs, module grids and grain, all from code.

Try it in your browser first: the [free poster maker](https://levni.dev/make/branding-posters/) opens a poster from a brand spec in the editor.

```
levni poster <spec.json> <out-dir>      # poster-01-split.png … poster-08-launch.png and series.png
```

MCP: `render_poster` (`spec`, `out_dir`, `scenes`, `preview`, `guide`). API: `import { renderPosters, expandPosters } from '@levni/levni'`.

## The spec

```json
{ "brand": { "name": "Kumru", "tagline": "Slow coffee for fast mornings, roasted in Izmir",
             "mark": "dove", "inks": ["#14181F", "#1F3BE0", "#F0573A", "#F1EEE6"],
             "words": ["Roast", "Pour", "Share", "Brew"] } }
```

| field | default | meaning |
| --- | --- | --- |
| `brand.name` | required | brand name (up to 24 characters) |
| `brand.tagline` | none | one sentence, wrapped and set small |
| `brand.mark` | none | a library prop (`levni list <word>`): halftoned, echoed and printed on the posters |
| `brand.inks` | ink, blue, coral, paper | up to 6 `#RRGGBB`: the darkest is the ink, the lightest the paper, the others accents |
| `brand.words` | NEW, BUILD, SHIP … | headline words, one per poster, in order (Turkish casing is automatic) |
| `brand.url`, `brand.year`, `brand.seed` | name.com, 2026, 11 | credits row and texture seed |
| `only` | all eight | template names to use, in order |
| `count` | number of templates | posters to make (cycles templates and words, max 24) |

## Templates

| name | what it is |
| --- | --- |
| `split` | halftone field and mark above, a colour block with a light/heavy kicker and a pixel headline below |
| `map` | dark header ("What is new?"), a dot-matrix world on the brand colour, the name set large |
| `bauhaus` | a pill, half-circle and quarter module grid with a slot for one heavy word |
| `echo` | huge words above and below the mark repeated in stepped tones inside a dark panel |
| `camo` | noise-blob camouflage beside a dithered orb, a colour band with the headline |
| `vertical` | rotated heavy words over faint orbits, pill stripes at the foot |
| `summit` | dotted frame, pixel word, mono lines, a slanted block with a halftone landscape |
| `launch` | dark poster: halftone glow, the halftoned mark, a heavy word, toner grain |

Every poster is a normal scene: `expandPosters(spec)` (or `render_poster` with `scenes: true`) returns them as JSON to edit
and render one by one. The building blocks are ordinary elements you can use in any scene: `type`, `block`, `amtone`,
`camo`, `grain`, `dither`, `dotmatrix`, `dotline`, `shapegrid`, `echo`, `furniture` (see [`scene.md`](scene.md)).

Fonts in `fonts/` are under the SIL Open Font License 1.1: Space Grotesk, Archivo Black, JetBrains Mono, Departure Mono.
