---
title: "Recolour an Illustration Library in Your Brand Colours"
description: "Make on-brand illustrations: recolour a whole SVG-style illustration library with one style object, then pick ink and paper pairs with enough contrast."
date: 2026-11-19
updated: 2026-11-24
category: brand
kind: Guide
coverAlt: "A large paint palette on a coral sun over a blue panel, with a potted plant on the left and a pencil on the right"
faq:
  - q: "How do I recolour illustrations to match my brand?"
    a: "Give the scene a `style` object that maps Levni's house colour names to your hex values, for example `{ \"blue\": \"#6A1B9A\" }`. Every prop, panel and texture in the scene follows it. Colours you leave out keep the house hex."
  - q: "Can I recolour just one drawing instead of the whole scene?"
    a: "Yes. A prop takes a `recolor` map from one colour name to another, such as `{ \"coral\": \"blue\" }`. Only that drawing changes, and the rest of the scene keeps its inks."
  - q: "Which colour pairs are safe for contrast?"
    a: "Keep `ink` (the outlines) much darker than `paper` (the background), or the other way round for a dark theme. A pair that passes WCAG 2.2 contrast for normal text, 4.5 to 1, is a safe floor for line art. Check the pair with any contrast checker before you commit it."
  - q: "Do I need to edit the SVG files by hand?"
    a: "No. Levni draws from JSON and recolours at render time, so there is no SVG to edit. Change the `style` object and render again."
  - q: "Can I try colours before writing any JSON?"
    a: "Yes. The Library page has a Colours row with presets and six colour pickers. Pick colours and the scene JSON underneath the drawing updates, ready to copy into a scene."
---

Most illustration libraries come in one palette. Your brand has its own. So you either accept a purple site with orange drawings, or you open every file in a vector editor and recolour it by hand, and then do it again after the next rebrand.

There is a shorter route. In **Levni**, an open-source engine that draws hand-inked illustrations from a JSON scene, colours are names, not hex values. A drawing says "coral" and the scene decides what coral means. Change that meaning once and every drawing follows.

This guide shows how to print one scene in three sets of inks, how to recolour a single drawing, how to choose pairs that stay readable, and how to try colours in the browser first. It costs nothing: no image model, no API key. You need Node 20 or newer and a scene file.

## Start from one scene

Install Levni from npm:

```bash
npm install @levni/levni
```

Here is a small scene: a laptop on a sun, a coffee cup and a plant. It has no `style` field, so it prints in the default `riso` inks.

```json
{ "seed": 8, "clip": [60, 52, 1080, 569], "style": "riso", "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "disc", "x": 600, "y": 340, "r": 210, "color": "mustard" },
  { "type": "prop", "name": "laptop", "variant": 0, "x": 600, "y": 350, "size": 420, "shadow": true },
  { "type": "prop", "name": "coffee-cup", "variant": 1, "x": 240, "y": 420, "size": 280 },
  { "type": "prop", "name": "potted-plant", "variant": 0, "x": 960, "y": 420, "size": 300 },
  { "type": "prop", "name": "pencil", "variant": 0, "x": 880, "y": 170, "size": 160, "rot": -10 }
] }
```

Save it as `scene.json` and render it:

```bash
npx levni render scene.json riso.webp
```

![A laptop on a yellow sun between a coffee cup and a potted plant, on a blue panel](/blog/brand-colour-illustrations/fig-1a.webp)
*The scene in the default riso inks.*

## Know the house colour names

Every drawing in the library uses a fixed set of colour names. These twelve are the ones a `style` object can change:

| Name | Role |
| --- | --- |
| `paper` | the page behind everything |
| `white` | light fills inside drawings |
| `ink` | outlines and line detail, the darkest colour |
| `blue` | the main panel colour |
| `coral`, `green`, `mustard` | the accent inks |
| `dark` | deep fills |
| `tone`, `tone-coral`, `tone-green`, `tone-mustard` | light versions of each ink |

The roles matter more than the hues. `ink` must stay the darkest colour on a light page, and each `tone-*` should stay a lighter version of its accent. Break those roles and drawings stop reading, even if each colour looks fine alone.

## Add a style object

`style` is either a pack name (`"riso"` or `"miniature"`) or an object of your own inks. Colours you leave out keep the house value, so you can change as little as one. A rebrand to a deep green looks like this:

```json
"style": {
  "ink": "#1F3B2C", "blue": "#2F6B4F", "coral": "#D9783A", "mustard": "#E8B64C",
  "green": "#6E9B3A", "tone": "#9CC5A8", "tone-coral": "#F0B892",
  "tone-mustard": "#F3D9A0", "paper": "#F3EFE3"
}
```

Put it in the scene where `"style": "riso"` was, render again, and you get the same drawing in new inks. The names are checked: a typo such as `"corall"` or a value that is not a six-digit hex colour stops the render with an error, so a wrong colour cannot slip through quietly.

![The same scene in deep greens with orange and ochre accents](/blog/brand-colour-illustrations/fig-1b.webp)
*The same scene with the green style object above.*

A dark theme is the same idea turned round. Make `ink` light and `paper` dark, and also set `white` and `dark` so fills and deep shapes follow:

```json
"style": {
  "ink": "#F4F2EC", "blue": "#3D5AFE", "coral": "#FF6B8A", "mustard": "#FFD166",
  "green": "#06D6A0", "tone": "#5468C9", "tone-coral": "#B3536A",
  "tone-mustard": "#B39548", "paper": "#14181F", "white": "#232A36", "dark": "#F4F2EC"
}
```

![The same scene on a near-black page with white outlines and pink and mint accents](/blog/brand-colour-illustrations/fig-1c.webp)
*Same elements, same seed, a night palette.*

The seed is the same in all three, so the hand wobble is identical. Only the inks changed, which is what you want when a brand has a light and a dark mode.

## Recolour one drawing with recolor

Sometimes the scene should keep its inks and a single drawing should differ: a plant pot in your accent colour, say. A prop takes a `recolor` map from one colour name to another:

```json
{ "type": "prop", "name": "potted-plant", "variant": 0, "x": 880, "y": 340, "size": 380,
  "recolor": { "coral": "blue", "tone-coral": "tone" } }
```

Map the dark and light version together. If you move `coral` to `blue` and forget `tone-coral`, the pot rim stays pink and looks like a mistake.

![Two panels: a plant in a coral pot, an arrow, then the same plant in a blue pot](/blog/brand-colour-illustrations/fig-2.webp)
*Before and after: the right-hand plant uses the recolor map above, the left one is untouched.*

`recolor` works on names, so it changes one drawing while `style` changes the meaning of the names for the whole scene. They combine: recolour first, then the style object maps what is left.

## Pick pairs that stay readable

Line art lives on contrast. The outline colour against the paper colour does most of the work, so check that pair first. Three rules keep it safe:

1. **Ink against paper.** Aim for at least 4.5 to 1, the WCAG 2.2 threshold for normal text. Line art has no hard requirement, but thin hand-drawn lines benefit from the same margin.
2. **Accents against paper.** Mustard on cream is the usual trap. Accents carry fills, not detail, so 3 to 1 is enough, but test it.
3. **Tones lighter than their accent.** Each `tone-*` should clearly sit between its accent and paper. If it matches either, shading disappears.

Use any contrast checker, or the one in your browser's developer tools. Check ink on paper, then your darkest accent on paper, and last the accent on your panel colour.

Keep the house limit too: at most two main inks plus paper per scene, and a third colour only as a small accent. A brand with five colours is fine in the style object, but each scene should use two of them.

## Try colours on the Library page

You do not have to write JSON to find out. Open the [Library](/library/), click any drawing, and look for the Colours row. It has presets (Riso, Miniature, Mono, Forest, Night) and a Your brand option with six colour pickers: ink, blue, coral, mustard, green and paper. Pick your colours and the drawing recolours live. Underneath it, the page shows the scene JSON for that drawing, including the `style` object, ready to copy.

That makes the Library a quick palette test: choose five or six drawings from different shelves, such as [`/library/?c=tech`](/library/?c=tech), and see how your inks hold up on each.

## Ask an agent to apply your brand

If an AI agent writes your scenes, give it the palette once. This prompt works in Claude Code or Codex with the Levni MCP server connected:

```text
Use the levni MCP server. Here is our brand palette:
ink #1B1B3A, blue #6A1B9A, coral #FF7043, mustard #FFC857, paper #FBF7F0.

1. Call scene_guide and read the style section.
2. Draw a 1200 x 673 cover for the article in posts/launch.md.
3. Put these inks in the scene's "style" object. Leave unnamed colours alone.
4. Render with render_scene and read the critic's notes. Fix every note.
5. Tell me the contrast ratio of ink on paper before you save the file.
```

Keep the palette in a project file such as `BRAND.md` so every new session starts from the same inks.

## Check the result

Render, read the critic, and look at the picture. The critic checks layout, not colour, so look at the colours yourself. Do outlines stay visible? Does the accent still read as the accent? Is the focal object still the strongest thing in the frame? If a drawing disappears into the panel, move one ink and render again. It takes a second.

## What to do next

Browse the [Levni library](/library/) and try your palette on a few shelves. To make the first cover, follow [generate blog covers with Claude Code](/blog/generate-blog-covers-claude-code/). To keep a whole publication in one look, read [style packs](/blog/style-packs/), and to use the drawings commercially, see [free illustrations for commercial use](/blog/free-illustrations-commercial-use/).

Related: to recolour 3D icons, see [free 3D icons](/blog/free-3d-icons/). For 3D covers in your own colours, see [3D cover images without a 3D tool](/blog/3d-cover-images-json/).

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
