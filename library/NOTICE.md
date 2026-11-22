# Where the props come from

469 props, 702 variants, every one stored as SVG path data in a 0–100 box (`library/props/*.json`).

## Origin

- **All 702 variants were authored for Ortak Alan as path code** inside its illustration engine, between July and November 2026: 342 written directly as prop files, 360 "harvested" from `draw` elements that composers (Ortak Alan editors working with an AI agent) wrote for article illustrations and later promoted into the library. Harvested variants keep a `note` such as `harvested from <scene>`.
- **No prop was found to be traced or copied from Tabler Icons or another icon set.** Checked: no prop file mentions Tabler or another source, and none uses the 24-unit Tabler grid. Tabler Icons (MIT) are only used at runtime by the optional `icon` and `ascii` elements and are not shipped here.
- **To check before publishing:** much of the path data was written by an AI agent under editorial direction. Whether CC BY 4.0 can be enforced on such drawings depends on the jurisdiction; the license still states the terms of use clearly. If enforceable attribution matters, consider CC0 for the library instead (see the research note in the Ortak Alan repo).

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
