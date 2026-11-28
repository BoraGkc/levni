---
title: "Open Source Design Skills for AI Agents: What They Are and Why"
description: "Agents write code well because coding knowledge is open. Design knowledge is not. Here is what open design skills for AI agents are and how to write one."
date: 2026-11-25
updated: 2026-11-28
category: agents
kind: Explainer
coverAlt: "A brain drawn in ASCII characters on a white card, beside a lime block with a pixel tulip, on indigo"
faq:
  - q: "What is a design skill for an AI agent?"
    a: "A short, readable file that tells an agent when to use it, what to read, what to do and how to check the result for one design task, such as art-directing a poster series or picking a palette from a logo. It is knowledge, not a model."
  - q: "How is a skill different from a prompt?"
    a: "A prompt asks for one output. A skill encodes a repeatable method with checks, so the agent can verify its own work, for example by reading Levni's layout critic and fixing what it reports before a person looks."
  - q: "What is Levni Skills?"
    a: "The open set of design skills for Levni: recipes, critics and art-direction rules written in the open and tested on real renders. The first two skills, levni-taste and levni-motion, are in the levni-skills repository on GitHub with sixteen recipe cards; proposals for more are open."
  - q: "Do I need Levni to use a design skill?"
    a: "The skills are written for agents that drive Levni through its MCP server or CLI, because Levni gives them something exact to render and check. The thinking inside a good skill is useful to anyone who designs."
  - q: "How can I contribute a skill?"
    a: "Open a design skill proposal on GitHub with when the agent should use it, the steps and checks, and an example. Rough ideas are welcome."
---

Ask an agent to build a login form and it will do a decent job. Ask it to art-direct a launch poster series for a small coffee roaster and it will produce something, but you will not know why it made the choices it made, and neither will it.

The difference is not intelligence. It is what the agent has read. Coding knowledge is open: decades of documentation, tutorials, open-source repositories, code review threads and style guides, all public. Design knowledge mostly is not. It lives in studios, in critiques that happen out loud, in brand books under NDA, and in the heads of people who learned it by doing.

We think that should change, and the way to change it is the same way code changed: write the knowledge down, put it in the open, and let anyone improve it. We call the result **design skills**, and the Levni version of them is **Levni Skills**. This post explains what they are, why we think they matter, and how to write the first ones with us. When this post was first written Levni Skills was planned, not shipped. The first two skills are out now (see [the update below](#the-first-two-skills-are-out)); the invitation stands.

## What a design skill is

A design skill is a short, readable file that tells an agent how to do one design task well. It has five parts:

- **When:** the situation it is for. "A brand needs a launch poster series."
- **Read:** what it needs to know. "The brand.json: name, inks, mark, four words."
- **Do:** the method, in steps. "One word per poster. The mark halftoned on two of the eight."
- **Check:** how it knows the result is good, in terms a machine can test. "The critic reports no missing focal point. Text contrast is at least 4.5."
- **Ship:** what it hands back. "posters/01..08.png, plus the two strongest."

![A skill file outline on a white card over lime: when a brand needs a launch series, read brand.json, one word per poster, check the critic and contrast, ship eight posters, status planned and open for proposals](/blog/open-source-design-skills/skill-card.webp)

That is it. No model weights, no fine-tuning, no secret sauce. A skill is closer to a recipe card in a professional kitchen than to software: it captures a method that a skilled person would follow, written so that someone else, or something else, can follow it too.

## Why "check" is the important part

Most prompts for images stop at "make it look good". A skill has to say what good means in a way that can be checked, and that is where Levni helps.

Levni renders from an exact scene file, so the same input always gives the same picture. Every render returns the **layout critic's notes**: elements off the canvas, accidental crops, lopsided weight, no clear focal point. An agent following a skill can render, read the notes, fix the scene and render again, all before a person looks. Read more in [how the layout critic works](/blog/agent-layout-critic/).

That loop is what turns taste into something teachable. "Make it balanced" is an opinion. "The critic reports no lopsided weight, and the focal symbol is at least 220 px" is a rule you can argue with, improve and test. Open rules can be reviewed the way code is reviewed.

## Why open, and why now

We wrote a whole [manifesto](/blog/post-ai-design-manifesto/) about this, but the short version is this. The generative age made pictures cheap. It did not make good decisions cheap. If the decisions stay locked inside closed tools, everyone rents taste from whoever owns the model. If the decisions are written down in the open, everyone can learn them, check them and change them, the way open-source code made programming knowledge common.

Design is also unusually suited to this. A lot of design knowledge is already rule-shaped, even if it is rarely written as rules: hierarchy, contrast, grids, how many inks a series can carry, when a mark should be halftoned and when it should be solid. Studios teach these rules in critiques. Skills can teach them in files.

## The first skills we want to write

These are the ideas on our list. None of them exist yet. Each one is open for a proposal or a better idea.

- **Poster art direction.** Turn a brand.json into a coherent series of eight posters: which layouts carry the mark, how the words are spread, how the inks repeat. Builds on the [branding poster generator](/blog/branding-poster-generator/).
- **Palette from a logo.** Read a mark's colours and produce a Levni style pack with enough contrast for text and two accents that do not fight. Builds on [style packs](/blog/share-style-pack-palette/).
- **Cover for hard news.** Calm, dignified covers for loss, disaster and illness: one object, lots of space, blue only, nothing that reads as a joke.
- **Brand board review.** Read a nine-tile [brand board](/blog/brand-board-generator/) and point out what breaks the identity: a tile with the wrong ink, a wordmark that is too small to read.
- **Series consistency.** Keep 500 article covers in one hand: same inks, same weight of detail, the same distance from the edge. This is how [Ortak Alan keeps one style across 500 articles](/blog/one-style-500-articles/).

## How to write one

You do not need code. A good first proposal answers four questions in plain words:

1. **When** should an agent reach for this skill, and when should it not?
2. **What** does it read before it starts?
3. **What steps** does it take, in order?
4. **How** does it know the result is good, and what does it do when it is not?

Add an example if you can: a before and after, a render, or a scene it would produce. Then open a [design skill proposal](https://github.com/Levni-Dev/levni/issues/new?template=skill.yml) on GitHub. Rough ideas are welcome. The best skills will come from people who do the work every day and are tired of explaining the same rules in every critique.

## The first two skills are out

*Added on 28 November 2026.* The first two skills are in their own repository, [Levni-Dev/levni-skills](https://github.com/Levni-Dev/levni-skills):

- **levni-taste**: art direction for drawn assets. When not to draw, one style family per brand, icon sets that look like one hand, a small palette, safe areas, text on art, and a list of patterns to avoid. It ends in a loop: render, read the critic, fix, render again.
- **levni-motion**: loops and motion from Levni scenes, and which format plays where.

They come with sixteen recipe cards, one per kind of asset an agent is asked for: a blog cover, a link preview, a README banner, an icon set, a sticker, a poster and more. Each card has the scene, the fields worth changing, the pitfalls and the critic notes to expect. A script renders every card and fails when a card and its scene disagree.

![Sixteen recipe cards drawn by Levni: a lighthouse cover, a link preview, a README banner, a thumbnail, a social square, a story, a favicon, an icon set, a seal, a dithered sunset, an ASCII globe, an isometric desk, a 3D trophy, a mesh gradient title, a bar chart and a poster](/blog/open-source-design-skills/recipes.webp)

Install them with the skills CLI, or as a Claude Code plugin:

```bash
npx skills add Levni-Dev/levni-skills
```

```bash
claude plugin marketplace add Levni-Dev/levni-skills
claude plugin install levni-skills@levni-skills
```

The skills drive Levni, so the agent needs it too: `claude mcp add levni -- npx -y @levni/levni mcp`. The motion skill uses commands from Levni 0.5.0 and says how to check that the installed version has them.

Proposals for the next skills go the same way as before: open a [design skill proposal](https://github.com/Levni-Dev/levni/issues/new?template=skill.yml).

## What happens next

As proposals come in, we will turn the strongest into files in the repository, test them against real renders, and make them available to agents that use the Levni [MCP server](/mcp/). Each skill will carry its author's name, the same way every drawing in the Folio does.

Until then, the quickest way to help is to write down one rule you know is true about design and that nobody ever wrote down for you. That is a skill waiting to happen. The other ways to contribute are on the [community page](/community/).
