---
title: "Make Seals, Badges and Stickers from a JSON Scene"
description: "Generate a seal, badge, die-cut sticker or ticket stub from a JSON scene: ring text that closes, four edge styles, a loyalty card, and no image model."
date: 2026-11-23
category: brand
kind: Guide
coverAlt: "A red scalloped seal with a coffee cup in the middle on a blue panel, with a heart, a rocket and a star as white-edged stickers and a yellow ticket stub around it"
faq:
  - q: "How do I put text around a circle in a badge?"
    a: "Give a `seal` a `text` and it repeats the words around the ring and closes the loop exactly. Or give it `top` and `bottom` for two centred arcs. For a ring with no seal, use the `ringtext` element."
  - q: "What is a die-cut sticker in Levni?"
    a: "It is any `prop` or `draw` with a `diecut` field. The engine adds a thick paper outline around the whole shape, a thin ink edge and a soft shadow, so it looks like a sticker peeled off a sheet."
  - q: "Can the seal text use Turkish letters?"
    a: "Yes. Glyphs are set one by one, so Ğ, Ş, İ, ö, ü and ç sit evenly on the ring. The engine picks Turkish casing on its own when it sees ı, İ, ğ or ş, or you can set `locale` to `tr`."
  - q: "Can I use the badges and stickers commercially?"
    a: "The engine is MIT. The drawings in the library are CC BY 4.0, so you can use them in a product or a shop with the credit line `drawings by Ortak Alan`."
  - q: "Does this need an image model or an API key?"
    a: "No. The scene is plain JSON and the image is drawn on your machine. There is no account, no key and no cost per image."
---

A badge is the small thing that makes a brand feel finished. A scalloped seal on a package, a sticker on a laptop lid, a ticket stub on a loyalty card: each one is a few circles, a ring of type and a drawing in the middle. They are tedious to draw by hand and awkward to prompt for, because image models cannot spell a word around a circle.

You can write them as a JSON scene instead. This guide makes seals, stamps, die-cut stickers and ticket stubs with **Levni**, an open-source illustration engine. You describe what you want, render a PNG and get the same image every time. There is no image model, no API key and no cost per image.

You need Node 20 or newer and about ten minutes. The finished piece is a coffee shop loyalty card with a seal on it. If you have not met Levni yet, the [launch post for the brand asset tools](/blog/levni-brand-assets/) shows the whole set.

## Install Levni and render a first seal

Install the package and render a file:

```bash
npm install @levni/levni
npx levni render seal.json seal.png
```

The seal is one element. Put this in `seal.json`:

```json
{ "seed": 5, "background": "paper", "elements": [
  { "type": "seal", "x": 600, "y": 336, "size": 440, "edge": "scallop", "fill": "coral",
    "text": "small studio", "prop": "coffee-cup" }
] }
```

The scene is 1200 by 673 pixels, so `x: 600, y: 336` is the centre. `size` is the width of the whole seal. The `prop` is a drawing from the library, which has 1,577 drawings; search it with `npx levni list coffee`. A seal takes either a `prop` or a `word` in the middle, not both.

## Choose an edge

The edge is what gives a seal its character. Levni has four, set with `edge`: `scallop` (the default, a round stamp), `perforated` (a postage-stamp border), `zigzag` (a sharp, medal-like rim) and `plain` (a clean disc). `bumps` sets how many teeth the edge has, and `depth` how deep they cut, as a share of the radius.

![Four seals in a row, each with a different edge: red scalloped, yellow perforated, green zigzag and blue plain, each with a number in the middle and the words made by hand around the ring](/blog/seal-badge-sticker-generator/fig-1.webp)
*The same seal in four edges. Only `edge`, `fill` and the centre word change.*

This is the scene behind it. Each seal has a `word` in the middle and a smaller `sub` line under it:

```json
{ "seed": 9, "background": "paper", "elements": [
 {"type":"seal","x":170,"y":300,"size":250,"edge":"scallop","fill":"coral","word":"01","sub":"scallop","wordColor":"paper","text":"made by hand"},
 {"type":"seal","x":440,"y":300,"size":250,"edge":"perforated","fill":"mustard","word":"02","sub":"perforated","text":"made by hand"},
 {"type":"seal","x":710,"y":300,"size":250,"edge":"zigzag","fill":"tone-green","word":"03","sub":"zigzag","text":"made by hand"},
 {"type":"seal","x":980,"y":300,"size":250,"edge":"plain","fill":"blue","word":"04","sub":"plain","wordColor":"paper","textColor":"paper","text":"made by hand"},
 {"type":"label","x":170,"y":500,"text":"edge scallop","anchor":"middle","size":16},
 {"type":"label","x":440,"y":500,"text":"edge perforated","anchor":"middle","size":16},
 {"type":"label","x":710,"y":500,"text":"edge zigzag","anchor":"middle","size":16},
 {"type":"label","x":980,"y":500,"text":"edge plain","anchor":"middle","size":16}
]}
```

On a dark fill such as `blue`, set `wordColor` and `textColor` to `paper` so the type stays readable. Fills accept the house colour names, the `tone-` tints, or your own colours if you set a `style`. That is covered in [brand colour illustrations](/blog/brand-colour-illustrations/).

## Set the ring text

Text on a circle is where most tools fall over. Levni sets each glyph on its own slot on the curve, centred, so a wide M and a narrow I take the same visual space and the Turkish letters Ğ, Ş and İ sit as evenly as any other. You have two ways to use it on a seal.

`text` repeats your words around the whole ring. The spacing is stretched so the loop closes with no gap and no overlap, and the type shrinks if one copy of the phrase does not fit. `sep` sets the mark between repeats. `top` and `bottom` place two arcs instead, centred, which suits a word like "approved" above and a serial number below.

![Two seals on blue: a white scalloped one with a rocket and the words small studio repeating around the ring, and a yellow perforated one with a star, the word approved on top and no. 07 below](/blog/seal-badge-sticker-generator/fig-2.webp)
*Left: `text` repeats and closes the ring. Right: `top` and `bottom` give two centred arcs.*

```json
{ "seed": 14, "background": "blue", "elements": [
 {"type":"seal","x":330,"y":336,"size":420,"edge":"scallop","fill":"paper","prop":"rocket","text":"small studio","sep":"*","ringColor":"ink"},
 {"type":"seal","x":850,"y":336,"size":420,"edge":"perforated","fill":"mustard","prop":"star","top":"approved","bottom":"no. 07","spacing":4},
 {"type":"label","x":330,"y":590,"text":"text: repeats and closes the ring","anchor":"middle","size":15,"color":"paper"},
 {"type":"label","x":850,"y":590,"text":"top + bottom: two centred arcs","anchor":"middle","size":15,"color":"paper"}
]}
```

If you want type on a circle without a seal, use the `ringtext` element. It takes a centre, a radius `r`, the `text`, and `repeat: true` to fill the ring. `side: "in"` makes it read along the bottom of the circle the right way up. Keep ring text at least its own `size` away from other marks, because the critic measures where the glyphs really sit, not a full square around the circle.

## Cut a sticker

A sticker is any drawing with a `diecut` field. The engine traces the shape, grows a thick paper outline around it, fills any holes, rounds the joins and adds a thin ink edge and a soft shadow. Set `diecut: true` for the defaults, or pass `{ "offset": 16, "color": "mustard" }` to change the border width and colour. The offset is clamped between 0 and 60 pixels.

It works on `prop` and on `draw`, your own path drawing, so a logo you draw as SVG path data can become a sticker too.

## Tear a ticket stub

A `stub` is a ticket body: a rounded rectangle with a half-round notch cut in each side and an evenly dotted perforation. `split` sets where the perforation falls, from 0.1 to 0.95. The main text sits in the left part and shrinks to fit. `stubText` runs rotated in the right part, which is where a serial number goes.

![Two ticket stubs, white and green, above four die-cut stickers: a rocket, a heart, a coffee cup and a light bulb, all on a yellow ground](/blog/seal-badge-sticker-generator/fig-3.webp)
*Two stubs with different splits above four die-cut stickers. The light bulb has a coral outline.*

```json
{ "seed": 5, "background": "mustard", "elements": [
 {"type":"stub","x":90,"y":90,"w":420,"h":170,"fill":"paper","split":0.72,"rot":-4,"text":"admit one","stubText":"no. 0412"},
 {"type":"stub","x":640,"y":120,"w":440,"h":170,"fill":"tone-green","split":0.6,"rot":3,"text":"free refill","stubText":"row b"},
 {"type":"prop","name":"rocket","x":220,"y":480,"size":230,"rot":15,"diecut":{"offset":16}},
 {"type":"prop","name":"heart","x":470,"y":490,"size":190,"rot":-14,"diecut":true},
 {"type":"prop","name":"coffee-cup","x":720,"y":480,"size":220,"rot":8,"diecut":{"offset":14}},
 {"type":"prop","name":"lightbulb","x":980,"y":480,"size":210,"rot":-6,"diecut":{"offset":12,"color":"coral"}}
]}
```

Note that a stub's `x` and `y` are its top-left corner, while a seal's are its centre. That trips people up once.

## Build a loyalty card

Put the pieces together. The card is a wide stub with the offer as its main text, a card number in the stub part, ten stamp circles (five filled, five empty) and a seal that says what the card is. A scatter of `marks` fills the yellow background and one die-cut star adds a corner of interest.

![A white ticket-style loyalty card on a yellow background: Every 10th coffee is on us, five filled and five empty stamp circles, a card number on the stub, a red scalloped seal with a coffee cup and a die-cut star](/blog/seal-badge-sticker-generator/fig-4.webp)
*A coffee shop loyalty card from one scene. Five coffees collected, five to go.*

```json
{ "seed": 12, "background": "mustard", "elements": [
 {"type":"marks","area":[40,40,1120,593],"count":9,"colors":["blue","coral","paper"]},
 {"type":"stub","x":80,"y":150,"w":700,"h":380,"split":0.8,"fill":"paper","text":"Every 10th coffee is on us","textSize":44,"stubText":"card no. 0412","color":"ink"},
 {"type":"label","x":124,"y":262,"text":"Kuru Fasulye Coffee · Kadıköy","size":17,"color":"blue"},
 {"type":"disc","x":145,"y":414,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":213,"y":414,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":281,"y":414,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":349,"y":414,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":417,"y":414,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":145,"y":472,"r":21,"color":"coral","outline":"ink","weight":5},
 {"type":"disc","x":213,"y":472,"r":21,"color":"paper","outline":"ink","weight":5},
 {"type":"disc","x":281,"y":472,"r":21,"color":"paper","outline":"ink","weight":5},
 {"type":"disc","x":349,"y":472,"r":21,"color":"paper","outline":"ink","weight":5},
 {"type":"disc","x":417,"y":472,"r":21,"color":"paper","outline":"ink","weight":5},
 {"type":"seal","x":985,"y":350,"size":340,"edge":"scallop","fill":"coral","color":"ink","top":"coffee card","bottom":"loyalty","textColor":"paper","prop":"coffee-cup","rot":8},
 {"type":"prop","name":"star","x":1100,"y":95,"size":100,"rot":14,"diecut":{"offset":12}}
]}
```

The circles are ordinary `disc` elements, so the card is a template: write a small script that prints the scene with the right number of filled circles for each customer and you have a personalised card per person. That is a loop over the same JSON, not a different tool.

## Let an agent do it

If you drive Levni from Claude Code or Codex, the agent can write, render and check all of this without you touching JSON. Add the MCP server once:

```bash
claude mcp add levni -- npx -y @levni/levni mcp
```

Then paste a prompt like this one:

```text
Use the Levni tools. Read scene_guide, especially the seal recipes at the end.
Make a 1200 x 673 loyalty card for "Kuru Fasulye Coffee": a wide stub with
"Every 10th coffee is on us" and a card number, ten stamp circles with five
filled, one scalloped coral seal with a coffee cup, and one die-cut star.
Render it with render_scene, read the critic's notes, fix every one, and save
the final scene as loyalty.json and loyalty.png.
Keep ring text and other marks at least their own size apart.
```

## Check the result

Render the scene and read what the critic says. The critic flags marks that leave the canvas, accidental crops and lopsided weight. For these scenes the usual fix is moving a label a few pixels so it clears a seal's rim.

Then look at the picture. Ring text that is too long for its ring shrinks, so very small type is the sign that the phrase is too long. Shorten it, or make the seal bigger.

## What to do next

Put the same seal into a full identity: [the brand board guide](/blog/brand-board-generator/) shows how one call turns a name and a drawing into a mark, a web page, a tote and a business card. For line-art backgrounds to put behind a badge, read [wireframe terrain and engraved landscapes](/blog/wireframe-terrain-engraving/). And browse the [Levni library](/library/) for drawings to put in the middle of a seal.
