---
title: "No FOMO Lists: 240+ Open Design Tools, MCP Servers and Type Picks"
description: "We curated three open lists on GitHub: open design tools, open-source MCP servers for design, and open lettering resources. Free to start, no FOMO."
date: 2026-11-26
category: stories
kind: Story
coverAlt: "A star drawn in ASCII characters on a white card, beside a lime block with a pixel tulip, on indigo"
faq:
  - q: "What are the No FOMO lists?"
    a: "Three curated lists on GitHub by Levni-Dev: Awesome Open Design (open design tools and resources), Awesome Design MCP (open-source MCP servers that let AI agents do design work) and Awesome Lettering (open type tools, fonts and lettering resources). Each entry is open, free to start and maintained."
  - q: "What does 'no FOMO, only open' mean?"
    a: "An entry needs an open licence (OSI for code, an open licence such as CC0, CC BY or OFL for assets), must be free to start with no credit card, paid key or waitlist, and must not be archived. Free for personal use is not enough."
  - q: "Is Levni promoting itself in these lists?"
    a: "Levni appears once in each list, as an ordinary entry next to the others. The lists exist to spotlight other people's open work."
  - q: "How do I add my project?"
    a: "Open a suggestion on the list's GitHub repository with the name, link, licence and one line about what it does. Your own project is welcome, and every accepted suggestion is credited."
  - q: "Can AI agents read these lists?"
    a: "Yes. Every list ships a data/entries.json file under CC0, and the pages on levni.dev carry ItemList structured data, so agents and search engines can use them directly."
---

Every week a new design tool launches with a waitlist, a free trial and a credit card form. Every week someone on your timeline says you are falling behind if you have not tried it yet. We would like to say something calmer: you are probably fine. Most of what a designer, or a designer's AI agent, needs is already open, free and running on someone's laptop right now.

So we made a shelf for it. Three curated lists on GitHub, under one rule: **no FOMO, only open**. Together they hold more than 240 entries, every one checked by hand. You can browse them on GitHub or on the new [lists page](/lists/).

## The rule

An entry gets in when it is:

1. **Open.** Code under an OSI licence, assets under an open licence such as CC0, CC BY or the SIL Open Font License. "Free for personal use" is not open, so it stays out.
2. **Free to start.** No credit card, no paid API key, no waitlist. Optional paid hosting is fine if the open version works on its own.
3. **Alive.** Not archived and still maintained.
4. **Useful today.** It does something real, described in one plain line.

When we built the lists, that rule removed a lot: icon sets that moved to custom licences, tools with no licence file at all, archived servers and a few repositories whose star counts looked bought. What is left is the open part of the design world, which turns out to be big.

## Awesome Open Design

![The Awesome Open Design banner: an ASCII palette on a white card over indigo, drawn by Levni](/blog/no-fomo-open-design-lists/open-design.webp)

[Awesome Open Design](/lists/open-design/) is the hub: 102 open design tools and resources in eleven sections. Editors like [Penpot](https://penpot.app), [Krita](https://krita.org) and [Graphite](https://graphite.rs). Icon sets like [Lucide](https://lucide.dev) and [Tabler Icons](https://tabler.io/icons). Illustration libraries such as [Open Peeps](https://www.openpeeps.com). Colour tools, creative code from [p5.js](https://p5js.org) to [Motion Canvas](https://motioncanvas.io), design systems, image processing, print and dithering tools, and a section on designing with agents.

[See it on GitHub](https://github.com/Levni-Dev/awesome-open-design).

## Awesome Design MCP

![The Awesome Design MCP banner: a robot drawn in ASCII on a white card with a red scan line, drawn by Levni](/blog/no-fomo-open-design-lists/design-mcp.webp)

[Awesome Design MCP](/lists/design-mcp/) collects 55 open-source MCP servers that give AI agents design abilities. MCP, the Model Context Protocol, is how Claude, Codex or Cursor plug into tools. With the right server an agent can read a Figma frame through [Framelink](https://github.com/GLips/Figma-Context-MCP), edit shapes in Penpot through its [official server](https://github.com/penpot/penpot/tree/develop/mcp), build a scene in [Blender](https://github.com/ahujasid/mcp-for-blender), draw a diagram with the [official draw.io server](https://github.com/jgraph/drawio-mcp) or screenshot its own work with [Playwright](https://github.com/microsoft/playwright-mcp).

Official servers are marked, every entry shows its language and licence, and a separate short section names the useful hosted servers that are not open source, so you know they exist. For MCP servers beyond design, the list points to [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers), the big map of the whole ecosystem. We keep the design corner.

[See it on GitHub](https://github.com/Levni-Dev/awesome-design-mcp).

## Awesome Lettering

![The Awesome Lettering banner: the letters Aa and Rr changing typeface on a white card, drawn by Levni](/blog/no-fomo-open-design-lists/lettering.webp)

[Awesome Lettering](/lists/lettering/) is for people who care about letters: 86 open type tools, fonts and resources. Font editors such as [Fontra](https://github.com/fontra/fontra) and FontForge. The build tools under almost every open font, starting with [fontTools](https://github.com/fonttools/fonttools). Open typefaces like [Inter](https://github.com/rsms/inter) and IBM Plex. Libraries that shape and draw text, kinetic type, pixel fonts, and hand lettering tools from [perfect-freehand](https://github.com/steveruizok/perfect-freehand) to stroke-order data for Chinese and Japanese characters.

[See it on GitHub](https://github.com/Levni-Dev/awesome-lettering).

## Why we spotlight other people

Levni is an open-source design engine, and it would have been easy to make lists that point at ourselves. We did the opposite on purpose. Levni appears once in each list, as an ordinary entry. The point of a commons is that it is common, and the fastest way to grow one is to make the people already building it more visible. It is the same idea as our [manifesto](/manifesto/): a post-AI center for designers is a place, not a product.

The format is borrowed with gratitude from [sindresorhus/awesome](https://github.com/sindresorhus/awesome), the list of lists that started it all.

## Suggest a project in one minute

Each list has a short suggestion form on GitHub: name, link, licence, one line about what it does. Your own project is welcome. A maintainer checks it against the rule, and a Claude helper can turn an accepted suggestion into a pull request that credits you.

- [Suggest for Awesome Open Design](https://github.com/Levni-Dev/awesome-open-design/issues/new?template=suggest.yml)
- [Suggest for Awesome Design MCP](https://github.com/Levni-Dev/awesome-design-mcp/issues/new?template=suggest.yml)
- [Suggest for Awesome Lettering](https://github.com/Levni-Dev/awesome-lettering/issues/new?template=suggest.yml)

## Made for people and for agents

Every list also ships its data as a CC0 file, `data/entries.json`, and the pages on levni.dev carry structured data. If your agent is looking for an open tool to do a design job, it can read the list directly, the same way you do. The banners on each list were drawn by Levni from a few lines of JSON, with no image model, which felt like the right way to decorate a list about open tools.

The other ways to add to the commons are on the [community page](/community/).
