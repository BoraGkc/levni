---
title: "Make an Animated README Banner for GitHub, Free"
description: "Make a README banner that moves: the repo name types itself and the drawing floats. One click in the free banner maker, or a few lines of code and a GIF."
date: 2026-11-28
category: agents
kind: Guide
coverAlt: "A coral board with a README window: a blue banner reads tiny-queue next to a box in a yellow circle, with grey text lines below, and a cream strip on the right with three blue frames typing t, tiny and tiny-queue"
faq:
  - q: "Why a GIF and not a video or WebP?"
    a: "A GIF plays wherever an image does, including a GitHub README, chat and email, so you can reference it with plain Markdown. Animated WebP plays in browsers and is the better choice for a web page. Levni writes both."
  - q: "How big is the file?"
    a: "The banner in this guide is 231 KB as a GIF: 36 frames at 800 by 400 pixels. The Levni docs give about 0.2 MB for a moving banner. Levni's own GIF encoder stores only the pixels that change between frames, which keeps it small."
  - q: "Does the maker upload my repo anywhere?"
    a: "No. The page reads the public repo details from GitHub and draws every frame in your browser with the same engine as the npm package. Nothing is sent to a Levni server."
  - q: "Can I change what moves?"
    a: "Yes. `bannerScene` with `motion: true` returns a plain scene. Every moving part carries a `motion` field (typewriter, pop, float, slide, fade), so you can edit the JSON, change the timing or remove a motion before you render it."
  - q: "Can an AI agent make the banner?"
    a: "Yes. The `render_animation` tool in the Levni MCP server takes a scene, writes a .gif or .webp and returns a strip of four frames for the agent to check."
---

A README banner is the first thing people see on a repository. A still one is fine. One that moves, where the name types itself and the drawing floats in, catches the eye for a second longer, and it still works as an ordinary image in Markdown.

This guide makes one two ways with **Levni**, an open-source illustration engine. The first way is one click in the free banner maker at [levni.dev/banner](/banner/). The second is a few lines of code and one command, for when you want the banner in a script or a CI job, or want an agent to make it. Both draw locally. There is no image model, no account and no cost per image.

The repositories here are made up: **tiny-queue**, a small job queue, and **moonlog**, a log viewer. For the still version of the same banner, see [the online editor tour](/blog/free-online-design-editor/#make-a-readme-banner-from-a-repo-link).

Motion arrived in Levni 0.5.0. When I wrote this, `npm view @levni/levni version` still printed 0.4.0, which has no `animate` command. Until 0.5.0 is on npm, install the repository version with `npm install github:Levni-Dev/levni`. The banner maker on the website already has the new button.

## What the banner does

The banner is 1280 by 640 pixels with the text on the left and a drawing on the right, the same layout as the still banner. With motion on, five things happen in one loop:

- the owner fades in,
- the repo name types itself, with a caret,
- the drawing pops in, then floats up and down,
- the circle behind it breathes,
- the description slides up, and the stars and language fade in last.

Everything has settled by the middle of the loop and holds to the end, so most of the time people see the finished banner. Then it plays again.

![An animated README banner on cream and blue: the owner YOU fades in, the name tiny-queue types itself with a caret, a cardboard box pops into a yellow circle and floats, and the description and a 1.2k stars line appear](/blog/animated-readme-banner/fig-1.webp)
*The tiny-queue banner as a loop: 36 frames. This is the WebP version, for the web; the README gets the GIF.*

## Way one: the banner maker

Open [levni.dev/banner](/banner/) and paste a GitHub link. The page reads the repository's name, description, topics, language and stars, and picks a drawing from the topics. If the pick is wrong, choose another one under the preview or search the library. You can also pick one of four palettes (Riso, Coral, Green and Night), edit the name and the description, and press **New hand** for a different seed.

When the still banner looks right, press **Animated GIF**. The page draws 36 frames at 800 pixels wide, shows a counter while it works, then plays the result in the preview and saves the file as `<repo>-banner.gif`. The Markdown snippet under the preview switches from `banner.png` to `banner.gif` at the same time. **Download PNG** still gives you the still, and you will want it too (see the last section).

The frames are drawn in your browser by the same engine as the npm package. The repository details come from GitHub's public API; the drawing never leaves your machine.

## Way two: from code

The maker is built on one function, `bannerScene`. It takes the repo fields and returns a Levni scene: plain JSON you can print, edit and render anywhere. Set `motion: true` and the scene carries the moves listed above.

Save this as `banner.mjs`:

```js
import { writeFileSync } from 'node:fs';
import { bannerScene } from '@levni/levni/banner';
import { animate } from '@levni/levni';

const scene = bannerScene({
  owner: 'you',
  name: 'tiny-queue',
  description: 'A small job queue for Node that keeps jobs in one SQLite file.',
  mark: 'package',
  stars: 1200,
  language: 'TypeScript',
  languageColor: '#3178c6',
  motion: true,
});
writeFileSync('banner.json', JSON.stringify(scene, null, 2));
const { bytes, frames } = await animate(scene, 'banner.gif', { frames: 36, width: 800 });
console.log(frames, 'frames', Math.round(bytes / 1024), 'KB');
```

Run it with `node banner.mjs`. On the Mac I used it printed `36 frames 231 KB` and took about 13 seconds. Note the two imports: `bannerScene` lives in `@levni/levni/banner`, and `animate` in the main package.

The fields are the ones the maker fills in. `name` is required. `owner`, `description`, `stars`, `language` and `languageColor` are optional, and a missing one simply leaves its line out. `mark` is any drawing from the library (search with `npx @levni/levni list box`), `theme` is `riso`, `coral`, `green` or `night`, and `seed` changes the hand-drawn texture and the scattered marks. Without `motion` you get the still banner, and it stays byte for byte the same as before.

The script also saved the scene as `banner.json`. That file is enough on its own. The command line draws it:

```bash
npx @levni/levni animate banner.json banner.gif --frames 36 --width 800
```

```text
banner.gif  36 frames, 800 x 400, 231 KB
- critic: no layout problems found
```

The GIF from the command line was byte for byte the same file as the one from the script. That is the rule Levni keeps for motion: the same scene, the same seed and the same moment in the loop give the same frame. You can commit `banner.json`, change one field months later and get the same banner with that one change.

## Look at the frames before you commit

A loop is hard to judge while it plays. Add `--strip` and Levni also writes four frames side by side:

```bash
npx @levni/levni animate banner.json banner.gif --frames 36 --width 800 --strip frames.png
```

![Four frames of the banner side by side: an empty cream side with only a caret, the name half typed as tiny-que with a box in the circle, the full name with the description, and the finished banner with the stars line](/blog/animated-readme-banner/fig-2.webp)
*The strip from `--strip`: the start, the name being typed, the description in, and the settled banner.*

Check three things. The first frame is nearly empty on purpose: the name has not been typed yet. By the middle frame everything should be in place. And the name should not run into the panel: a long name gets a smaller size, but check the strip when your name is long. The layout critic reads the settled picture at mid-loop, not the half-empty first frame, so its notes are about the finished banner.

## Pick a palette that reads in the README

The four palettes all move the same way. Night suits a repo whose own colours are dark. This is the same code with `theme: 'night'`, another made-up repo and a crescent moon as the mark:

![An animated banner in the night palette: a dark left side where the name moonlog types itself in cream letters, and a blue panel where a yellow crescent moon pops into a coral circle and floats, with stars scattered around](/blog/animated-readme-banner/fig-3.webp)
*`theme: 'night'`, `mark: 'crescent-moon'`. 204 KB as a WebP.*

A short name types fast and sits large. A long name (more than 16 characters) is set smaller, and the description wraps to at most three lines of about 34 characters, so keep it to one sentence.

## Why GIF, and why it stays small

A README is Markdown, and Markdown shows images. A GIF plays wherever an image does, so the banner needs no player, no script and no special syntax. That is why the maker writes GIF. Animated WebP plays in browsers and is a fine choice for your own website; for this banner it was 269 KB, a little larger than the GIF, because the banner is mostly flat colour, which GIF handles well.

GIF has a reputation for large files. Levni writes GIFs with its own encoder, in plain JavaScript, and it stores only the pixels that change from one frame to the next. In this banner most pixels never change: the panel, the paper, the description once it has arrived. To see the difference I rendered the same 36 frames with `encoder: 'sharp'`, the general-purpose path. That file was 702 KB, about three times the 231 KB from Levni's encoder.

GIF is weak at gradients and grain, which turn into bands and noise. A banner made of flat panels and line drawings avoids both. If you add a mesh gradient behind your banner, the [animation guide](/docs/animation/) suggests WebP, a smaller width or fewer frames.

## Put it in the README

Commit the GIF to your repository. The maker suggests the `.github` folder, which keeps it out of the root:

```text
.github/banner.gif
```

Then put this at the top of `README.md`:

```markdown
[![you/tiny-queue](./.github/banner.gif)](https://levni.dev/banner/)
```

This is the snippet the maker gives you. The link around the image is optional; point it at your docs or your website, or drop the brackets and keep the image alone. Write real alt text, the `owner/name` in the first brackets, so people who cannot see the banner still know what it is.

Keep the still PNG as well. The repository's social preview, the card that shows up when someone shares the link, is a still image, and the maker's notes say to upload the 1280 by 640 PNG in the repository settings for it. The README gets the moving version and the link card gets the still one.

## Ask an agent to make it

The Levni MCP server has a `render_animation` tool. It takes a scene and an `out` path ending in `.gif` or `.webp`, writes the loop and returns the critic's notes with a strip of four frames, so the agent can look at its own work. Add the server once (see [the MCP page](/mcp/#setup) for Codex and other clients):

```bash
claude mcp add levni -- npx -y @levni/levni mcp
```

Until 0.5.0 is on npm, use `npx -y github:Levni-Dev/levni mcp` in that line instead, because `render_animation` is new in 0.5.0. Then paste a prompt like this into Claude Code or Codex, inside your repository:

```text
Read package.json and the README. Write a script that builds a
README banner with bannerScene from @levni/levni/banner, using
this repo's name, owner, description and language, motion:
true, and a library drawing that fits the project (search with
list_props). Render it with render_animation to
.github/banner.gif, 36 frames, width 800. Look at the strip.
If the name runs into the panel or the drawing reads badly,
change the mark or the description and render again. Then add
the banner to the top of the README with alt text.
```

The agent keeps the script, so the next person can change the description and render the banner again.

## Check the result

Look at the GIF in your README preview before you push. Four things can go wrong. A wrong drawing makes the banner look generic, so search the library for something more specific. A long description wraps to three lines and ends with an ellipsis, so cut it to one sentence. A long name gets small, so drop a prefix if you can. And a GIF with a gradient grows large, so keep the banner flat or use WebP on the web.

When something is wrong, fix the scene, not the image. Because the render is deterministic, you can change one field and everything else stays where it was.

## What to do next

To move other pictures, not just banners, read [how to animate an illustration from JSON](/blog/animate-illustrations-json/): the eight loops, the five entrances, stagger and the camera. To give a project a whole set of matching assets, including a README banner, see [the brand kit generator](/blog/brand-kit-generator/). To plan a launch video before you render it, see [storyboards from a shot list](/blog/storyboard-generator/). For other free makers, browse [the tools](/tools/), or open [the editor](/editor/) to change a banner by hand.

**Reference and examples.** Read the [animation reference](/docs/animation/) (loops, entrances, sizes) and the [CLI reference](/docs/cli/); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
