---
title: "Style packs: one scene, many inks"
description: "Levni style packs print the same scene with a different set of inks and paper. The first two: Ortak Alan riso and a miniature pack inspired by Tulip Era painting."
date: 2026-11-22
og: /og/style-packs.png
---

A Levni scene says *what* is in the picture. A **style pack** says how it is printed: which inks, which paper. Switch the pack and every panel, prop and texture follows, without touching the scene.

```json
{ "style": "miniature", "seed": 7, "elements": [ ... ] }
```

| Riso (default) | Miniature |
| --- | --- |
| ![A study desk drawn in the riso pack](/gallery/spot-riso.webp) | ![The same study desk in the miniature pack](/gallery/spot-miniature.webp) |
| ![An isometric room in the riso pack](/gallery/room-riso.webp) | ![The same room in the miniature pack](/gallery/room-miniature.webp) |

## Riso

The house look of Ortak Alan: cobalt blue panels, coral and mustard accents, ink lines that swell and taper like a real pen, and each colour printed from its own slightly misaligned plate.

## Miniature

Inspired by the court painting of the Ottoman Tulip Era (1718–1730) and its best-known painter, Levni: aged paper, gold ochre, vermilion, turquoise and lapis, with a warm sepia line. The pack comes with motifs drawn for it: tulips, carnations, blossom sprigs, cypresses and a gilded medallion.

These are new drawings in that spirit, not copies of historical works. That is the idea behind style packs: Levni can take inspiration from a tradition and then produce in it consistently, image after image.

## Make your own

A style pack is a map from Levni's colour names to hex values. See `src/styles.mjs` in the repository; contributions are welcome.
