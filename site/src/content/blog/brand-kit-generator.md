---
title: "Generate a Whole Brand Kit from One Name"
description: "Generate a brand kit from a name, or from a website: mark, favicons, palette, social cards, story, README banner, board, posters and a loop, in one folder."
date: 2026-11-28
category: brand
kind: Guide
coverAlt: "A green board with a yellow folder holding brand pieces: a blue card with a stack of books in a white circle, a strip of blue, coral and yellow swatches, a coral card with a round seal that says KIT, and a tall cream card with books on blue and grey text lines"
faq:
  - q: "What is in a Levni brand kit?"
    a: "A transparent mark as PNG and SVG, two favicons, a palette, a link preview, a cover, a square, a story, a README banner, a nine-tile brand board, four or eight posters, a short loop, the resolved brand as JSON, a list of every file and one HTML page that shows them all."
  - q: "What do I have to give it?"
    a: "Only a name. A tagline, a mark from the library, up to five colours and four headline words make it yours. Without them Levni picks a mark from the name and tagline and a seeded set of colours, the same ones every time."
  - q: "Can it read my brand from my website?"
    a: "Yes. Give `levni brand` a URL instead of a JSON file. It fetches that one page and reads the name, the description and the colours it can see in the HTML. Colours that live only in external stylesheets are not seen, so check the result and pass your inks when needed."
  - q: "How long does it take, and how big is it?"
    a: "My kit took about 9 seconds on a Mac and came to 15 MB in 20 files. The board and the posters are most of it. `--only` renders just the assets you name."
  - q: "Can an AI agent make the kit?"
    a: "Yes. The `render_brand_kit` tool in the Levni MCP server takes the same spec, or a URL, writes the folder and returns the brand board as a preview. Without an output folder it returns the list of assets it would make."
---

A new project needs a pile of small images before anyone sees it: a favicon, a link preview, a social card, a README banner, something for a story, a poster for the launch. Making them one at a time is slow, and they drift apart: a slightly different blue here, a different drawing there. Asking an image model for each one makes the drift worse.

This guide makes all of them in one go with **Levni**, an open-source design engine. You give it a brand, as small as a name, and it writes one folder: a mark, favicons, a palette, social cards, a story, a README banner, a brand board, posters and a short loop, in the same inks, the same mark and the same finish. It runs on your machine. There is no image model, no network call unless you give it a website, and no account.

You need Node 20 or newer. The brand here is made up: **Pervaz**, a second-hand bookshop with a coffee bar. Nothing here is a real company. If you only need the one-image overview, [the brand board guide](/blog/brand-board-generator/) covers it in more depth.

## Install

```bash
npm install @levni/levni
```

Brand kits arrived in Levni 0.5.0. When I wrote this, `npm view @levni/levni version` still printed 0.4.0, so until 0.5.0 is published, install the repository version with `npm install github:Levni-Dev/levni`.

The command is `levni brand <brand.json | https://url> <out-dir>`. It is deterministic: the same spec gives the same files.

## Write the brand

Save this as `pervaz.json`:

```json
{
  "brand": {
    "name": "Pervaz",
    "tagline": "Second-hand books, strong coffee and a quiet room upstairs",
    "mark": "books",
    "inks": ["#1D2B53", "#FF6B4A", "#FFC94A", "#F7F1E5"],
    "words": ["Read", "Swap", "Stay", "Return"]
  },
  "seed": 8
}
```

Only `name` is required. The rest:

| field | default | meaning |
| --- | --- | --- |
| `brand.tagline` | none | one short line, up to 90 characters |
| `brand.mark` | picked | a library drawing. Without it one is picked from the name and tagline, the same one every time |
| `brand.inks` | seeded set | 1 to 5 colours as hex. The darkest becomes the primary, a very light one the paper |
| `brand.words` | from the tagline | up to four headline words for the posters |
| `seed` | from the name | the texture seed |
| `only` | all | asset names to make |
| `posters` | 4 | `8` renders every poster layout |

The name can be up to 40 characters. Short names suit the brand board best (more on that below).

## Make the kit

```bash
npx @levni/levni brand pervaz.json pervaz-kit
```

```text
20 files -> pervaz-kit  (Pervaz, mark books, 8518 ms)
```

That run took about 9 seconds on the Mac I used, and the folder came to 15 MB. This is what landed in it:

```text
pervaz-kit/board.png
pervaz-kit/brand.json
pervaz-kit/cover.webp
pervaz-kit/favicon-180.png
pervaz-kit/favicon-32.png
pervaz-kit/index.html
pervaz-kit/kit.json
pervaz-kit/loop.webp
pervaz-kit/mark.png
pervaz-kit/mark.svg
pervaz-kit/og.png
pervaz-kit/palette.png
pervaz-kit/posters/poster-01-split.png
pervaz-kit/posters/poster-02-echo.png
pervaz-kit/posters/poster-03-launch.png
pervaz-kit/posters/poster-04-summit.png
pervaz-kit/posters/series.png
pervaz-kit/readme-banner.png
pervaz-kit/social-square.png
pervaz-kit/story.png
```

The quickest way to see everything is `index.html`: one static page that shows the whole kit in the brand's own colours. The quickest way to judge it is `board.png`:

![A brand board for Pervaz in navy, coral, yellow and cream: three books in a yellow circle on navy, a serif italic wordmark with the tagline in spaced capitals, a palette strip with hex values, a web page in a browser with the name and the books, a yellow social card with the tagline in mono type, a tote bag, a round coral sticker, a pattern of books on navy dots and a tilted business card](/blog/brand-kit-generator/fig-1.webp)
*`board.png` from the kit: nine tiles, one mark, four inks.*

## What each file is for

The sizes below are the ones my kit came out at.

| file | size | use it for |
| --- | --- | --- |
| `mark.png`, `mark.svg` | 1024 px, transparent | the logo slot anywhere; the SVG scales |
| `favicon-32.png`, `favicon-180.png` | 32 and 180 px | the browser tab and the home screen icon |
| `palette.png` | 1200 x 360 | the colours with their hex values, for a style guide |
| `og.png` | 1200 x 630 | the link preview card |
| `cover.webp` | 1200 x 673 | a blog or article cover |
| `social-square.png` | 1080 x 1080 | a square post |
| `story.png` | 1080 x 1920 | a story; the type stays out of the app bars |
| `readme-banner.png` | 1280 x 640 | the top of a README |
| `board.png` | 1800 x 1200 | the nine-tile brand board |
| `posters/` | four posters and `series.png` | a launch series |
| `loop.webp` | 600 px, 12 frames | a small moving version of the cover |

The link preview is the one people see most, so here it is at full width:

![The Pervaz link preview card: a yellow left side with the name Pervaz in heavy black type and the tagline below it, and a navy right side with the three books drawn in navy inside a yellow circle](/blog/brand-kit-generator/fig-2.webp)
*`og.png`, 1200 by 630. The mark on cards is drawn in one ink so it reads on any ground.*

The posters use the four `words` as headlines. With the default `posters: 4` you get four layouts and a `series.png` that sets them side by side:

![Four portrait posters for Pervaz: a coral halftone poster with the books in navy dots and SWAP in pixel type, a cream poster with SWAP and STAY around a navy panel where the books repeat in grey steps, a navy poster with the books in a yellow halftone circle above STAY, and a cream poster with return in red pixel type above a yellow slanted panel with a dark texture](/blog/brand-kit-generator/fig-3.webp)
*`posters/series.png`. The full set of eight is in the [branding poster guide](/blog/branding-poster-generator/).*

`loop.webp` is the cover as a 12-frame loop. In this kit the colours inside the circle behind the mark move and everything else holds still, so it is a quiet loop. If nothing in the cover moves at all, the loop is skipped with a note. For louder motion, see [how to animate an illustration from JSON](/blog/animate-illustrations-json/).

## The two JSON files

`brand.json` is the brand as Levni resolved it. Keep it in your repository; it is the spec you give the next tool.

```json
{
  "name": "Pervaz",
  "tagline": "Second-hand books, strong coffee and a quiet room upstairs",
  "mark": "books",
  "inks": ["#1D2B53", "#FF6B4A", "#FFC94A", "#F7F1E5"],
  "words": ["Read", "Swap", "Stay", "Return"],
  "seed": 8,
  "roles": {
    "primary": "#1D2B53",
    "accent": "#FF6B4A",
    "highlight": "#FFC94A",
    "paper": "#F7F1E5",
    "ink": "#161E33"
  }
}
```

The `roles` show what each colour became: the darkest is the primary, the very light one is the paper, and the others are the accent and the highlight. The `ink`, used for text and lines, is a deeper shade of the primary.

`kit.json` lists every file with its bytes, its pixel size and the scene that drew it. That last part matters: every PNG is a normal Levni scene (or a board or poster spec), so you can copy one out of `kit.json`, change it and render it again with `levni render`, `levni board` or `levni poster`. The kit is a starting point you can edit, not a set of flat pictures.

## Change the inks and the mark

To try another direction, change the fields and render again. You do not need the whole kit for a look; `--only` makes just the assets you name. Same name and tagline, new inks and a new mark:

```json
{
  "brand": {
    "name": "Pervaz",
    "tagline": "Second-hand books, strong coffee and a quiet room upstairs",
    "mark": "coffee-cup",
    "inks": ["#16302B", "#E9724C", "#C5D86D", "#FAF3E3"],
    "words": ["Read", "Swap", "Stay", "Return"]
  },
  "seed": 8
}
```

```bash
npx @levni/levni brand pervaz-green.json pervaz-green --only board,og
```

```text
5 files -> pervaz-green  (Pervaz, mark coffee-cup, 1827 ms)
```

![The same Pervaz brand board in dark green, orange, lime and cream with a coffee cup as the mark: the cup in a lime circle, the serif wordmark, a new palette strip, the web page, a lime social card, a tote, an orange sticker, a cup pattern and a business card](/blog/brand-kit-generator/fig-4.webp)
*New inks and mark, two assets, under two seconds. `brand.json`, `kit.json` and `index.html` are always written.*

Asset names for `--only` are `mark`, `favicon`, `palette`, `og`, `cover`, `social-square`, `story`, `readme-banner`, `board`, `posters` and `loop`.

The mark is the field to choose with care, because it is on every file. Search the library first:

```bash
npx @levni/levni list book
```

Pick a drawing with a clear silhouette that still reads at 32 pixels. Shape matters too. My first try used a wide stack of books, and on the board's web page tile the name ran into the drawing. A narrower drawing (three books standing, or a cup) left room. When a tile looks crowded, try a narrower mark before anything else.

## Start from a website

If a project already has a website, `levni brand` takes the URL in place of the JSON file and reads the name, tagline and colours from that page. It fetches exactly the one URL you give (redirects followed, 10 second timeout, HTML only, at most 2 MB, no cookies) and nothing else: no stylesheets, no images, no other pages.

The reading part is a pure function, `brandFromHtml`, which you can try without any network. Here it reads a small page for Pervaz:

```js
import { brandFromHtml } from '@levni/levni';

const html = `<html><head>
  <title>Pervaz | Books and coffee</title>
  <meta property="og:site_name" content="Pervaz">
  <meta name="description" content="Second-hand books, strong coffee and a quiet room upstairs">
  <meta name="theme-color" content="#1D2B53">
  <style>:root { --accent: #FF6B4A; --sun: #FFC94A; --paper: #F7F1E5; }</style>
</head><body></body></html>`;

console.log(brandFromHtml(html, 'https://pervaz.example'));
```

```text
{
  name: 'Pervaz',
  tagline: 'Second-hand books, strong coffee and a quiet room upstairs',
  inks: [ '#1D2B53', '#FF6B4A', '#FFC94A' ],
  source: {
    url: 'https://pervaz.example',
    name: 'og:site_name',
    tagline: 'meta description',
    inks: 'theme-color',
    colours: [ [Object], [Object], [Object] ],
    notes: []
  }
}
```

It took the name from `og:site_name`, the tagline from the meta description and the colours from `theme-color` and the CSS custom properties. The cream was dropped, because whites, blacks and greys are left out on purpose; the kit adds a paper colour of its own. `source` says where each value came from. With fewer than two real colours on a page, it falls back to a seeded palette and says so in `source.notes`.

The weak spot is stylesheets. Colours that live only in an external CSS file are not seen. Check `brand.json` after a URL run, and pass `inks` yourself when the site hides its palette that way.

## Ask an agent to make the kit

The `render_brand_kit` tool in the Levni MCP server takes the same spec as `spec`, an `out_dir`, and an optional `url`. It writes the folder and returns the brand board as a preview image, plus the critic's notes for each asset. Without `out_dir` nothing is written and the tool returns the list of assets it would make, which is a cheap first step. `guide: true` returns the brand kit format. Add the server from [the MCP page](/mcp/#setup); until 0.5.0 is on npm, point it at `github:Levni-Dev/levni`, because the tool is new in 0.5.0.

The tool fetches a URL only when you pass one, so say so in the prompt if you want it:

```text
Use the Levni tools. Call render_brand_kit with guide: true
and read the format. Then search list_props for a simple,
narrow drawing for a bookshop called "Pervaz" that also serves
coffee. Make the kit with render_brand_kit into brand/, with
the tagline "Second-hand books, strong coffee and a quiet room
upstairs", the inks #1D2B53, #FF6B4A, #FFC94A and #F7F1E5, and
the words Read, Swap, Stay and Return. Look at the board
preview. If a tile is crowded or a colour pair is hard to
read, change the mark or the inks and make the kit again. Tell
me which files to use for the favicon, the link preview and
the README.
```

The agent ends with a folder and a `brand.json` you can keep in the repository, so the next person makes the same kit with one command.

## Limits

The brand board is tuned for names up to about 14 characters. A longer name is shortened to its first words there, and the notes say so; every other asset sets the full name. The mark is one library drawing in the brand's inks, and it looks best when you choose it rather than let Levni pick. On cards it is drawn in a single ink so it reads on any ground; `mark.png` and the README banner keep its colours.

## Check the result

Open `index.html` and look at every file at its real size. Four things can go wrong. A wide mark crowds the name on the web page tile, so try a narrower drawing. A favicon of a detailed drawing turns to mush at 32 pixels, so check `favicon-32.png` up close. Two inks that are too close flatten the palette and the posters, so make the darkest very dark and the lightest very light. And a long tagline wraps onto many lines on the story and the link preview, so keep it to one short sentence.

When a file is wrong, change the spec and render again, not the image. Because the render is deterministic, the files you were happy with stay as they were.

## What to do next

Make the banner in the kit move with [an animated README banner](/blog/animated-readme-banner/). Plan a launch video with [a storyboard from a shot list](/blog/storyboard-generator/). For more control over single pieces, read [the brand board guide](/blog/brand-board-generator/) and [the branding poster guide](/blog/branding-poster-generator/), open a kit file in [the editor](/editor/), or try [the free tools](/tools/). Browse the [Levni library](/library/) for a mark.

**Reference and examples.** Read the [brand kit reference](/docs/brand-kits/) (fields, assets, limits) and the [MCP tools](/mcp/#tools); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
