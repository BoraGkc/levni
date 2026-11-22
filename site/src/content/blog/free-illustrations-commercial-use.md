---
title: "Free Illustrations for Commercial Use: What CC BY 4.0 Allows"
description: "Free illustrations for commercial use: what CC BY 4.0 permits, what it requires, and an attribution example for a blog, a site footer and a slide."
date: 2026-11-12
category: library
kind: Explainer
coverAlt: "A stack of banknotes on a yellow sun, a small shop on the left and a book on the right, on a blue panel"
faq:
  - q: "Can I use CC BY 4.0 illustrations commercially?"
    a: "Yes. CC BY 4.0 allows you to share and adapt the work for any purpose, including commercial use, as long as you give credit. The Levni drawing library uses this licence. This is a summary, not legal advice."
  - q: "What does a CC BY 4.0 attribution look like?"
    a: "Name the creator, link the licence, say if you changed the work and do not imply the creator endorses you. For Levni drawings a suggested line is: Illustration made with Levni, drawings by Ortak Alan (CC BY 4.0)."
  - q: "Do I have to credit a Levni illustration on every page?"
    a: "You need to give appropriate credit in a way that suits the medium. A caption under the image, a credits line on the page or a footer on a site that uses the drawings are all common. The licence is the authority, so read it for your case."
  - q: "Can I recolour or crop the drawings?"
    a: "Yes. CC BY 4.0 allows adaptations, and Levni is built to recolour drawings with style packs. The licence asks you to indicate that you made changes, and you may not suggest the creator endorsed your version."
  - q: "Is the Levni code under the same licence?"
    a: "No. The code is MIT licensed. The drawings in the library are CC BY 4.0, credited to Ortak Alan, and contributors are credited in their prop files."
---

You need a picture for a landing page, a newsletter or a pitch deck. The search box says "free", but free can mean many things. Some images are free to look at. Some are free only for personal projects. Some are free for anything, if you say who made them. Mixing those up is how a small business ends up with an awkward email.

This guide explains one common licence, **Creative Commons Attribution 4.0 (CC BY 4.0)**, in plain English. It is the licence on the Levni library, a set of 538 hand-drawn props in 848 variants across 15 categories. You will see what it permits and requires, how to credit a drawing in a blog, a footer and a slide, and a checklist you can apply to any free illustration source.

One thing first: this is a plain-language summary, not legal advice. The licence text is the authority, and if a lot rides on your use, ask a lawyer.

## Read what CC BY 4.0 permits

CC BY is one of the most open Creative Commons licences. The summary page at [creativecommons.org](https://creativecommons.org/licenses/by/4.0/) says you may:

- **Share**: copy and redistribute the work in any medium or format.
- **Adapt**: remix, transform and build on it.
- **Do so for any purpose, including commercially.**

So a drawing under CC BY 4.0 can go on a product page, in a paid course, on a printed flyer or inside a client's website. You do not need to ask permission or pay a fee, and the licence cannot be taken back for the people who already received the work under it, as long as they follow the terms.

## Know what it requires

The condition is attribution. The licence asks you to:

1. **Give appropriate credit.** Name the creator, or whoever they asked to be credited.
2. **Provide a link to the licence.**
3. **Indicate if you made changes.** Cropping, recolouring or combining counts.
4. **Not suggest that the creator endorses you or your use.**
5. **Not add legal terms or technology that stop others doing what the licence allows.**

Read those as a short list of manners. Say who made it, point to the rules, mention that you altered it, and do not pretend the artist backs your product.

## Know what it does not cover

CC BY 4.0 licenses the creator's copyright in the drawing. It does not hand you everything. The licence does not give you trademark rights, so a drawing is not a licence to use someone's logo. It does not cover other people's rights in a work, such as privacy or publicity rights, and it does not remove the rules of the place you publish. If a drawing shows something that looks like a brand, check the brand's rules too.

That is also why the Levni library excludes logos and trademarks, and draws people only as faceless pictograms. There is less to clear.

## Credit the drawings in a blog post

The Levni library suggests this credit line:

```text
Illustration made with Levni, drawings by Ortak Alan (CC BY 4.0)
```

Put it where a reader can find it. For a blog, a short line under the image or at the end of the post works:

```html
<figcaption>
  Illustration made with <a href="https://levni.dev">Levni</a>,
  drawings by Ortak Alan
  (<a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>).
</figcaption>
```

If you recoloured or cropped the drawing, add that. "Recoloured to our brand palette" is enough to indicate a change.

Many blogs show a credit area below the article body rather than under every image. The scene below shows that layout: the cover at the top left, the article text, and a small credit strip at the bottom.

![A browser window showing an article with a rocket illustration, lines of text and a small coral credit strip at the bottom, with an arrow pointing to it](/blog/free-illustrations-commercial-use/fig-1.webp)
*A sample article layout. The credit strip at the bottom holds the attribution line, so the page stays clean.*

## Credit the drawings in a site footer and a slide

On a site that uses the same drawings on many pages, one credit in the footer, linked from a page of credits, is a common way to give appropriate credit without repeating it under every image:

```html
<footer>
  <p>
    Illustrations: <a href="https://levni.dev">Levni</a>, drawings by Ortak Alan,
    <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>.
    Colours adapted to our palette.
  </p>
</footer>
```

On a slide, put a small line at the bottom of the slide that uses the drawing, or on a final credits slide for a long deck: "Drawings by Ortak Alan (CC BY 4.0), recoloured." Keep it readable, not hidden in a tint that disappears on a projector.

Whatever the medium, the test is the same: could a person who wants to know where the picture came from find out in a few seconds?

## Check the licence of any free illustration source

Use this checklist before you use a free illustration from anywhere, not just the Levni library:

| Question | Why it matters |
| --- | --- |
| Is the licence named, with a link? | "Free" without a licence is not permission. |
| Does it allow commercial use? | Some free licences are non-commercial only. |
| Is attribution required, and how? | Decide where the credit goes before you publish. |
| May you modify it? | Recolouring and cropping need adaptation rights. Some licences forbid it. |
| Does it contain logos, brands or real people? | The licence rarely covers those rights. |
| Who made it, and did they have the right to license it? | A site cannot give you rights it does not hold. |
| Is the licence for the image only or for the code too? | A site may split them. Levni does: drawings CC BY 4.0, code MIT. |

Keep a note of the source URL and the licence version for each image you use. It takes a minute and settles any later question.

## Ask an agent to credit your images

If an AI agent builds your pages, give it the rule once. This prompt works in Claude Code or Codex:

```text
Every page in this project that shows a Levni drawing needs a credit.
1. Find all images under public/ that were drawn with Levni.
2. For each page that uses one, add this line to the page footer or the image caption:
   Illustration made with Levni, drawings by Ortak Alan (CC BY 4.0)
   Link "CC BY 4.0" to https://creativecommons.org/licenses/by/4.0/
3. If the image was recoloured or cropped, add "Recoloured." or "Cropped."
4. List the pages you changed and any image whose source you could not confirm.
```

Keep the rule in your project instructions so new pages get the credit automatically.

## Pick drawings from many categories

The library covers 15 categories, so one source can fill a whole site: film, tv, stage, music, books, tech, money, law, sport, home, food, nature, places, health and symbols. All of them carry the same licence and the same credit line, which keeps the footer simple.

![A grid of fifteen small drawings: a film camera, radio, curtain, guitar, book, gear, bank, scales, trophy, house, apple, fir tree, bridge, stethoscope and clock](/blog/free-illustrations-commercial-use/fig-2.webp)
*Fifteen props from fifteen different shelves of the library, one from each category.*

Browse them on the [Library page](/library/), or jump to one shelf, for example [`/library/?c=money`](/library/?c=money).

## Check the result

Before you publish, read the page once as a visitor. Is the credit findable? Does it name the creator and link the licence? Did you say that you changed the drawing, if you did? If the answer to all three is yes, you have done what CC BY 4.0 asks. If something is unclear, read the [legal code](https://creativecommons.org/licenses/by/4.0/legalcode) or ask a lawyer.

## What to do next

Browse the [Levni library](/library/) and pick a shelf. To make a cover from those drawings in minutes, read [generate blog covers with Claude Code](/blog/generate-blog-covers-claude-code/). To match the drawings to your brand colours, see [brand colour illustrations](/blog/brand-colour-illustrations/), and to add your own, read [draw SVG icons as JSON](/blog/draw-svg-icons-json/).
