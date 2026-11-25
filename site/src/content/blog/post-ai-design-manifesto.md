---
title: "A Post-AI Center for Designers: Why Levni Is Open Source"
description: "Why we built Levni as an open design commons: the Tulip Era, the FOMO stack of the generative age, and why design should be open source like code."
date: 2026-11-25
category: stories
kind: Story
featured: true
coverAlt: "A tulip drawn in ASCII characters on a white card, beside a lime block with a pixel tulip, on indigo"
faq:
  - q: "What does 'a post-AI center for designers' mean?"
    a: "It means we use AI every day but do not hand our taste to it. Levni is an open design commons for the generative age: drawings, palettes, brand kits and design skills that anyone can read, fork and reuse, with no image model and no per-image bill."
  - q: "Is Levni against AI?"
    a: "No. Agents write Levni scenes, read its layout critic and fix the result. What Levni avoids is an image model deciding what good looks like. The drawings are made by people, the rules are written down, and the same scene always gives the same picture."
  - q: "Why is Levni named after a painter?"
    a: "Abdülcelil Levni was the court painter of the Ottoman Tulip Era (1718–1730). That period looked like a golden age of art and pleasure and ended in a revolt. We think the generative age looks similar, and we named the project after the painter who signed his work and drew people as people."
  - q: "Is Levni related to Zero Bytes Foundation?"
    a: "It is inspired by it, not a continuation. Zero Bytes Foundation is a design and media collective that our friend Berk Boz wrote about in 2023. Its mantra, consume, curate, cogitate, create, became the map for Levni's community."
  - q: "How do I join?"
    a: "Draw one thing for the Levni Folio, request a drawing, share a style pack, show a brand kit or propose a design skill. Every path is on levni.dev/community and every contribution is credited by name."
---

Every week there is a new image model, a new free trial and a new reason to feel late. Every week a client asks why a cover costs anything at all, now that "AI can just make it". And every week, to make one small picture, someone signs up for another service, pastes another API key and pays for another credit.

We think this is backwards, so we built the opposite. [Levni](/) is an open-source design engine and a library of hand-inked drawings that an agent can drive. It draws covers, icons, brand boards and poster series from a few lines of JSON, on your own machine, with no image model inside. This post is about why. The short version is on the [manifesto page](/manifesto/). This is the long one.

## We are living in a Tulip Era

Between 1718 and 1730 the Ottoman court fell in love with tulips. Gardens, palaces on the Bosphorus, night festivals with candles on the backs of tortoises, single bulbs traded for the price of a house. Art bloomed with it. Abdülcelil Levni, the court painter, broke a few rules of miniature painting: he signed his work, he painted people who looked like people, and he used colours that still look wet three hundred years later.

Then a revolt in 1730 ended the party. Historians still argue about what the Tulip Era was: a renaissance cut short, or a feast before the fall. It was probably both. The bloom was real, and so was the bill.

![Five Tulip Era motifs drawn by Levni in the miniature style pack: a cypress, a tulip, a rosette, a carnation and a second cypress on aged paper](/blog/post-ai-design-manifesto/tulip-era.webp)

The generative age feels a lot like that. Everything blooms. Every tool generates. Every product page has a new hero image made in seconds. It looks like a golden age for images, and in volume it is. For the creative process it might be the end of one: when anyone can produce a picture, the picture stops being where the value lives. The value moves to taste, to rules, to the decisions behind the picture. Those are exactly the parts the tools keep for themselves.

We would like to keep the tulips and lose the illusion.

## The FOMO stack

Here is what it takes, today, to put one small illustration on a blog post with a typical generative tool:

- a credit card, for one cover
- an API key, for one sticker
- a subscription, for one palette
- a waitlist, for one poster
- a model that is in a good mood today, for the same picture you made yesterday

None of these are bad on their own. Together they are a stack of small rents on something that used to be a craft and is now mostly a meter. And they come with a strange side effect: the more images get made, the less anyone owns them. You cannot diff a prompt. You cannot fork a model's taste. You cannot render the same picture again in ten years and get the same result.

Meanwhile every other layer of the web went the other way. Code went open source decades ago. Fonts followed, with the SIL Open Font License. Icon sets followed: whole teams now ship thousands of open icons that anyone can use. The one layer that stayed closed is the picture: the cover, the spot illustration, the social card, the poster. That is the layer Levni opens.

## What we are building instead

Levni is three things that work together.

**An engine.** A scene is a short JSON file: a panel here, a drawing there, a crowd along the bottom, a title on top. Levni inks every line with a pressure brush, prints each colour from a slightly misaligned riso plate and adds paper grain. Same seed, same picture, in about 0.15 seconds a cover on a laptop. It is MIT-licensed and runs on Node. See [how it draws a cover](/blog/faster-renders/).

**A library.** The [Levni Folio](/library/) holds more than 1,600 drawn objects, each one SVG path data in a 0–100 box with named colours, so any palette can recolour it. The drawings are CC BY 4.0: use them anywhere, commercially too, with credit.

**A way for agents to use it.** An [MCP server](/mcp/) lets Claude, Codex or Cursor search the library, write a scene, render it and read the layout critic's notes before a person looks. Your agent is the art director. Levni is the hand.

Here is the honest part about AI: we use it every day. Agents write our scenes, fix our layouts and read the critic. Some drawings in the Folio were drawn with a model's help, directed and checked by a person, and they say so in their files. What we do not do is let a model decide what good looks like. That part stays with people, written down where everyone can read it.

## Eight things we believe

The manifesto has eight articles. They are open for amendments, the way an open-source project is open for pull requests.

1. **Design is infrastructure.** The pictures on every page, README and launch post should be open, readable as text and owned by nobody.
2. **A cover should not need a credit card.** Most images on the web are covers, cards and icons. They deserve care, not a metered API.
3. **Taste is not rented.** AI can write the scene. People decide what good looks like.
4. **Same seed, same picture.** A design you cannot reproduce is a lottery ticket.
5. **Small, slow and finished beats big, fast and almost.**
6. **Credit travels.** Whoever draws a thing, their name stays in the file and goes wherever it goes.
7. **Clients are not wrong to want it free.** They are early. If the tools are open, the money can go to the people who decide, not the meters that count.
8. **The community is the product.** A library one studio draws is a portfolio. A library a thousand people draw is a commons.

## Who we are, and who we owe

Levni is made by the [Ortak Alan](https://ortakalan.io) crew. "Ortak alan" is Turkish for common ground. We are a publication that draws every article cover with Levni, and we build the engine in the open. We are also the people behind [cartcurt.xyz](https://cartcurt.xyz), our louder corner of the internet, so if this post sounds earnest, that one will balance it out.

We owe a large part of the idea to our friend Berk Boz. In 2023 he wrote ["What if we imagined a studio…"](https://medium.com/zero-bytes-foundation/what-if-we-imagined-a-studio-669f954a05f7) for [Zero Bytes Foundation](https://zerobytes.foundation), a collective for design and media that wanted to be "not just a studio but a movement." We have quoted that line at each other ever since, mostly as a joke, sometimes not.

Levni is not a continuation of Zero Bytes. It is what that idea looks like after AI arrived: a studio that is open source, a movement you join by drawing one thing. Its creative mantra became our map.

![A creative's journey after Zero Bytes Foundation: four nested pills reading consume, curate, cogitate and create, the last one in lime](/blog/post-ai-design-manifesto/journey.webp)

In Levni terms it reads like this:

- **Consume:** look at others' work. The [gallery](/gallery/) shows every image with the exact scene that drew it, and the [Library](/library/) shows every drawing with its code.
- **Curate:** collect and share it. [Style packs](/blog/share-style-pack-palette/) and showcases let you reprint and present what exists.
- **Cogitate:** find how you can contribute. Request a missing drawing, argue with the critic, propose a rule the critic should know.
- **Create:** make your own work. [Draw one thing for the Folio](/blog/contribute-drawing-open-library/).

## Signing is easy: draw one thing

There is no form and no newsletter. You sign this manifesto by adding something to the commons: a drawing, a palette, a brand kit, a design skill, or just a request for what is missing. Every path, with the real command or template behind it, is on the [community page](/community/).

So far one studio drew almost all of it. We would very much like to be the first name on a long list, not the only one.

If the Tulip Era taught anything, it is that a bloom does not last when only a few people own the garden. This time, let's plant it in public.
