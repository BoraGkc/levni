# Zine

`levni zine` turns one JSON file into a small magazine: the pages as images, a PDF to read or print, and the classic eight-page fold-up on one A4 sheet.

```bash
npx @levni/levni zine examples/zine-01.json zine-01/
```

Out come `p01.png` … `p08.png`, `zine.pdf` (A5 pages) and, when the zine has eight pages, `fold.pdf` and `fold.png`: one A4 sheet you fold, cut once and fold again into a booklet. Issue No. 01 is at [levni.dev/zine](https://levni.dev/zine/).

## A zine file

```json
{
  "name": "LEVNI ZINE",
  "issue": "01",
  "date": "Winter 2026",
  "pages": [
    { "kind": "cover", "title": "Drawn, not generated.", "subtitle": "…", "mark": "tulip" },
    { "kind": "text", "kicker": "Editor's note", "title": "Why a zine?", "body": "First paragraph.\nSecond paragraph.", "quote": "…", "mark": "pencil" },
    { "kind": "grid", "kicker": "From the Folio", "title": "Twelve of 1,628", "props": ["tea-glass", "simit", "cezve"] },
    { "kind": "list", "kicker": "Wanted", "title": "Nobody has drawn these yet", "items": ["whisk", "ladle"], "body": "…" },
    { "kind": "code", "title": "A picture is a file", "code": "{ … }", "body": "…" },
    { "kind": "scene", "scene": { "elements": [ … ] }, "caption": "…" },
    { "kind": "text", "title": "Fold this zine", "body": "1. …\n2. …" },
    { "kind": "back", "title": "Thanks for reading", "lines": ["…"], "mark": "pencil", "sign": "levni.dev" }
  ]
}
```

Each page is 874 × 1240 px (A5 proportions). The foot shows the zine's name, issue and page number.

## Page kinds

| Kind | Fields | What it draws |
| --- | --- | --- |
| `cover` | `title`, `subtitle`?, `mark`?, `date`? | a riso cover: a coloured panel with halftone, a drawing in a sun, the big title |
| `text` | `kicker`?, `title`?, `body`, `quote`?, `mark`?, `size`? | paragraphs wrapped to the page (a new line starts a paragraph), a pull quote and a drawing |
| `grid` | `kicker`?, `title`?, `props` (up to 12), `cols`?, `body`? | drawings from the Folio in tiles, each with its name |
| `list` | `kicker`?, `title`?, `items` (up to 80), `cols`?, `size`?, `body`? | a list in columns |
| `code` | `kicker`?, `title`?, `code`, `body`? | code on a tinted panel, then a note |
| `scene` | `scene`, `caption`? | any Levni scene on the page; the caption and foot sit on a paper band |
| `back` | `kicker`?, `title`?, `lines`, `mark`?, `sign`? | the colophon |

`look` on the zine or on a page (`riso` or `indigo`) changes the inks; `style` and `finish` work as in any scene.

## The fold-up

With exactly eight pages, `fold.pdf` puts them on one landscape A4 sheet: the top row upside down (5, 4, 3, 2), the bottom row 6, 7, 8 and the cover. Dashed lines are the folds and the red line is the one cut.

1. Print `fold.pdf` at 100%.
2. Fold it in half the long way, then open it.
3. Fold it in half the short way, twice, and open it: eight panels.
4. Fold it in half the short way and cut along the red line, from the fold to the middle.
5. Open it, fold it the long way, push the ends together so the cut opens into a diamond, and flatten it into a booklet.

## From code

```js
import { renderZine } from '@levni/levni';
const { pages, notes, files } = await renderZine(zine, 'out/');
```

`zineScenes(zine)` returns the page scenes without drawing them, and `jpegPdf(pages)` is the small PDF writer the zine uses.
