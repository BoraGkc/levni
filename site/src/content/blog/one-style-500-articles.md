---
title: "How Ortak Alan Illustrated 500 Articles in One Style"
description: "Ortak Alan drew about 500 article covers in one hand-inked style with Levni. Here is the approach: a house palette, a growing prop library, a critic and style packs."
date: 2026-11-10
category: stories
kind: Story
coverAlt: "A stack of books on a yellow sun, on a blue panel between a coral card with scales and a green card with a camera"
faq:
  - q: "How many article covers did Ortak Alan make with Levni?"
    a: "About 500. They were drawn for Ortak Alan, a Turkish publication, from JSON scenes in one house style."
  - q: "How do you keep 500 illustrations in one style?"
    a: "By building them from the same parts. Every cover uses the same hand-inked prop library, the same small set of inks and the same print texture, so the look is part of the system rather than something each cover has to be steered into."
  - q: "Where do the props come from?"
    a: "The library grew from the metaphors the articles needed. When a story called for an object that did not exist yet, someone drew it and added it, so later covers could reuse it. The library now has 538 props in 848 variants."
  - q: "Can I use the same approach for my own publication?"
    a: "Yes. Levni is open source (MIT) and the drawings are CC BY 4.0, so you can build a house style of your own. Install it from npm (`@levni/levni`), pick your inks with a style pack, and add props as your stories need them."
---

A publication that runs hundreds of articles needs hundreds of pictures. Stock photos make every site look the same, and a fresh illustration for each story is slow and expensive, with a different hand every time. [Ortak Alan](https://ortakalan.io), a Turkish publication, wanted something else: a cover for every article, all recognisably theirs.

They drew about 500 article covers in one style. This is the story of how that worked, told from what the project and the tool show: the covers, the library and the scenes behind them. It does not give internal figures, because we have none to quote, and we will not guess them.

The tool that came out of it is Levni, an open-source engine that draws a picture from a short JSON scene. If you run a blog and want one look across all of it, the approach below carries over.

## Start from a house palette

The first decision was not a drawing. It was a rule about colour. The house style uses a small set of inks: blue, coral, green and mustard, on cream paper. A scene may use two main inks plus paper, and a third only as a small accent. For sensitive subjects it narrows further, to blue, a light tone of blue and paper.

That rule does a lot of quiet work. A cover about energy and a cover about film use different objects, but they draw from the same few inks, often on a blue panel with a mustard sun behind the main subject. A reader sees the family before they read the headline.

![A coral panel with a roulette wheel struck by a gavel and halftone dots](/blog/one-style-500-articles/fig-1.webp)
*A real cover for a story about prediction markets. Blue ink, a coral wheel and halftone dots on cream paper: the house palette at work.*

## Draw props from the stories

The library did not start with 538 drawings. It grew story by story. When an article needed an object that was not there, a drawing was made for it and added, and from then on every later cover could use it.

That is why many props are small metaphors rather than plain nouns. The gallery on the Levni homepage lists some of the topics the covers were made for: environment, a film festival, prediction markets, documentary, culture, energy, and cinema and fashion. A film festival became a golden gate with open doors and an audience in front of it. A story on prediction markets became a roulette wheel and a judge's gavel.

![A golden arched gate with open doors behind a row of faceless audience figures on a blue panel](/blog/one-style-500-articles/fig-2.webp)
*A real cover for a film festival story: one big symbol, one small audience.*

The rule behind these is in the scene guide: pick an idea first. Before drawing, write three object metaphors for the story and keep the sharpest. A heart or a light bulb alone is a cliché. A roulette wheel under a gavel says something.

## Choose one big symbol per cover

The second rule is about composition. Each cover has one focus, one object clearly larger than the rest, with everything else serving it. In the three covers on this page that is a wheel, a gate and a film camera. Smaller things, such as an audience, halftone dots or a few sparks, add scale and rhythm but never compete.

Scale contrast does most of the work. A giant object beside small figures tells you the subject is bigger than the people in it. It is also what keeps a cover legible when it shrinks to a thumbnail in a feed. Nobody has to design that again for article 300, because the rule is written down in the scene guide.

## Keep faces out of it

The covers show no faces and no hands. People appear only as faceless pictograms: an audience seen from behind, a grid of figures. For a publication this solves two problems at once. There is no real person to misrepresent, and every cover stays calm and readable at small sizes.

When a story is about a person or a group, the cover draws an object that stands for them. The gallery has a white jacket with a coral overprint shadow for a cinema and fashion story, and a microphone resting on a sofa for a culture story.

![A film camera projecting onto a city block, with an audience along the bottom](/blog/one-style-500-articles/fig-3.webp)
*A real cover for a documentary story. The audience is a row of faceless figures along the bottom edge.*

## Let a critic check the layout

With hundreds of covers, nobody can look at every one at length. Levni returns layout notes with every render: elements running off the canvas, objects cut by the frame by accident, lopsided weight, no clear focal point. The critic reads geometry, not meaning, so it never says whether the metaphor is good. It does catch the plain mistakes before a person looks.

If a crop is on purpose, such as a giant symbol bleeding off a panel, the scene marks it with `"crop": true` and the critic stays quiet. To see how the critic works in detail, read [the agent layout critic](/blog/agent-layout-critic/).

## Reuse beats reinvention

The payoff of a growing library is that the hundredth cover is faster than the first. Search for an object by name or tag, in English or Turkish, look at a contact sheet of the candidates, and place the one that fits. Only when nothing fits does someone draw a new prop, and the Levni command `levni add` validates it and draws it onto a check sheet before it joins the library.

The library is not a pile of clip art. It is the publication's visual memory, built one story at a time, and every new cover adds to what the next one can use.

## Store scenes, not pictures

Each cover is a JSON scene, not a locked image. A scene is a short list of elements, drawn in order, with a `seed` that makes it repeatable. Because it is text, it can be kept in git, reviewed and re-rendered later.

```json
{ "seed": 7, "clip": [60, 52, 1080, 569], "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "disc", "x": 600, "y": 320, "r": 220, "color": "mustard" },
  { "type": "prop", "name": "scales", "x": 600, "y": 330, "size": 380, "shadow": true }
] }
```

That is the whole idea in four lines: a panel, a sun, one symbol. Change the object and you have another cover that still belongs. The scenes behind the covers shown on this page are in the Levni repository, in `site/scenes/gallery`.

## Change the inks with a style pack

Once the scenes are data, the look is a setting. A `style` field takes `"riso"` for the house look, `"miniature"` for a pack inspired by Tulip Era painting, or your own inks as a colour map. Every panel, prop and texture follows, so a rebrand does not mean redrawing anything. [Style packs](/blog/style-packs/) explains how they work.

## Copy the approach for your own blog

You do not need 500 articles to use this. You need the same few decisions, made once.

1. Choose a small palette and write it down.
2. Start from an existing library instead of an empty page.
3. Pick an object metaphor for each story before you draw.
4. Add a drawing only when a story needs one.
5. Keep scenes in version control and re-render when the style changes.

If you work with an AI agent, this prompt sets the rules for a whole folder of drafts:

```text
For each markdown file in posts/ that has no cover, draw one with the
levni MCP server. Use only the house palette: blue, coral, green, mustard
and paper, two main inks per cover. One large focal object, no text, no
faces. Think of three object metaphors first and keep the sharpest.
Render, read the critic's notes and fix every one. Save to
public/covers/<file-name>.webp and list any note you left on purpose.
```

Then check the result the way the project does: render, read the critic's notes, and look at the picture before you publish.

## What to do next

Browse the [Levni library](/library/) to see the drawings behind these covers. To try the workflow yourself, follow [the Claude Code guide](/blog/generate-blog-covers-claude-code/). To read why we built the engine in the first place, see [introducing Levni](/blog/introducing-levni/).

Related: the people in these covers are always faceless; [faceless people illustrations](/blog/faceless-people-illustrations/) shows the poses, groups and crowds.
