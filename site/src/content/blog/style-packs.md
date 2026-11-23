---
title: "Style packs: one scene, many inks"
description: "Levni style packs print one scene with a different set of inks and paper. The first two are Ortak Alan riso and a miniature pack inspired by Tulip Era painting."
date: 2026-11-22
updated: 2026-11-24
og: /og/style-packs.png
category: brand
kind: Explainer
faq:
  - q: "What is a Levni style pack?"
    a: "A style pack is a map from Levni's colour names to hex values, plus paper and texture settings. Switching the pack reprints the same scene in different inks."
  - q: "Which style packs ship with Levni?"
    a: "Two: riso, the Ortak Alan house look of cobalt, coral and mustard, and miniature, inspired by Ottoman Tulip Era court painting."
  - q: "How do I use a style pack?"
    a: "Set `style` on the scene to the pack name, for example `\"style\": \"miniature\"`. You can also pass your own inks as an object of colour names and hex values."
  - q: "Do style packs change the scene itself?"
    a: "No. The elements, positions and seed stay as written. Only the inks, paper and textures change, so you can compare packs on the same layout."
coverAlt: "A small isometric room drawn by Levni"
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

Next, see how [brand colour illustrations](/blog/brand-colour-illustrations/) swap in your own inks, how [one style held across 500 articles](/blog/one-style-500-articles/), and the [launch post](/blog/introducing-levni/).

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
