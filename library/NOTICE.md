# Levni Folio: where the props come from

Every prop is stored as SVG path data in a 0–100 box (`library/props/*.json`).

## Origin

- **Miniature motifs** (`tulip`, `carnation`, `blossom-sprig`, `cypress`, `rosette`, 6 variants, Nov 2026): new drawings for the miniature style pack, inspired by Tulip Era motifs, not traced from any painting or photograph.

- **The other 702 variants were authored for Ortak Alan as path code** inside its illustration engine, between July and November 2026: 342 written directly as prop files, 360 "harvested" from `draw` elements that composers (Ortak Alan editors working with an AI agent) wrote for article illustrations and later promoted into the library. Harvested variants keep a `note` such as `harvested from <scene>`.
- **No prop was found to be traced or copied from Tabler Icons or another icon set.** Checked: no prop file mentions Tabler or another source, and none uses the 24-unit Tabler grid. Tabler Icons (MIT) are only used at runtime by the optional `icon` and `ascii` elements and are not shipped here.
- **To check before publishing:** much of the path data was written by an AI agent under editorial direction. Whether CC BY 4.0 can be enforced on such drawings depends on the jurisdiction; the license still states the terms of use clearly. If enforceable attribution matters, consider CC0 for the library instead (see the research note in the Ortak Alan repo).

## Pixel icons

- **`pixel-*` props** (481 props, 1,924 variants, Nov 2026): pixel icons supplied by the project owner, who confirmed they hold the rights to release them in the Folio. Each icon comes in four cuts, stored as variants: 0 regular, 1 thin, 2 solid, 3 glyph. Converted with `tools/pixel-to-prop.mjs`: rasterised on a quarter-pixel grid and written back as rectangles so the pixels stay crisp; outline cuts get a riso fill in their enclosed areas, filled cuts print over an off-register accent copy. Categories were assigned by keyword and are worth a second look. Left out: brand logos in the source set (GitHub, Mastodon, Android, the set's own logo). Three misspelt names were fixed (dashboard, receipt, text-columns). The mood-happy, mood-neutral, mood-sad and camera-face icons are simple smileys: check them against the no-faces rule.

## Redrawn from open icon sets

Some props are line icons from open sets, converted with `tools/icon-to-prop.mjs` (rescaled to the 0–100 box, inked in the house line, given a riso fill) and reviewed by eye. Their variant `note` names the source.

- **Tabler Icons**, MIT License, Copyright (c) 2020-2026 Paweł Kuna. https://github.com/tabler/tabler-icons
  Props (Nov 2026): anchor, atom, backpack, calculator, fingerprint, flask, gift, hammer, leaf, microscope, paperclip, paw, printer, router, ruler, scissors, shopping-cart, tag, telescope, trash.

The MIT notice for these drawings:

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.

Sets checked and fine to convert the same way: Lucide (ISC), Phosphor (MIT), Heroicons (MIT), Iconoir (MIT), Twemoji graphics (CC BY 4.0), Humaaans, Open Peeps and Open Doodles (CC0). Not usable: unDraw, Remix Icon, Blush, Streamline free sets, OpenMoji (share-alike).

## Flagged for review before a public release

These follow the house rules on paper but sit close to the contribution rules (no faces, no logos):

| prop | why |
| --- | --- |
| `apple` (variant 1) | green apple with a bite out of the side: reads close to a well-known logo. Suggest removing variant 1. |
| `book-bitten-apple` | bitten apple silhouette; lower risk, check. |
| `half-comedy-half-tragedy-mask`, `keyhole-mask`, `pulcinella-question`, `redacted-horse-mask` | masks with eyes and mouths (theatre motifs). Stylised, not portraits; decide whether masks count as faces. |
| `telefon-yuzu` | frowning face drawn on a phone screen. |
| `matryoshka-reel`, `reel-eyed-pumpkin`, `clapper-dolls` | doll or pumpkin faces. |

Other naming notes: some prop names are Turkish slugs (`anahtar-deligi`, `defter-sehir`, `mahkeme-yuzu` …) and many tags are Turkish. Lookup works in both languages; renaming to English slugs (keeping the Turkish ones as tags) would help an international library.

A few line-only props drawn in `blue` (for example `mahkeme-yuzu`, `profil-karti`) disappear on a blue panel because only `ink` lines switch to paper on dark grounds. Not a bug in the drawing; worth a recolour rule later.
