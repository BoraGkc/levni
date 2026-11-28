---
title: "Draw a Storyboard from a Shot List Before You Render"
description: "Turn a shot list into a numbered storyboard sheet with timecodes, plus full-size frames and a shots.json your video tool can read, before you render a frame."
date: 2026-11-28
category: agents
kind: Guide
coverAlt: "A cream contact sheet on a blue board with six frames in two rows: an hourglass on yellow, a database and a laptop on pink, a box on mustard, a terminal on blue, a coffee cup on green and a rocket on coral, each with a small number and a caption line"
faq:
  - q: "What is a storyboard sheet?"
    a: "One image with a numbered frame for every shot of a video, each with its title, length, running timecode and a note. You read the whole video at a glance and catch a missing or overlong shot before anything is rendered."
  - q: "Can I use the shot list my agent already wrote?"
    a: "Yes. A bare array of `{ id, desc, frames }` works as it is. `desc` becomes the title, `frames` the length at 24 frames a second, and a word in the text that names a library drawing picks the picture."
  - q: "What does my video tool get from it?"
    a: "With `--frames-dir` Levni also writes every shot as a full-size PNG and a shots.json with the id, title, note, duration, start time and file of each shot. Remotion, Blender or an editor can place the frames on a timeline from that file."
  - q: "What happens when a drawing is not in the library?"
    a: "Nothing breaks. The frame becomes a placeholder, an outlined box crossed out with the shot text, and the command prints a warning that names the shot."
  - q: "Can an AI agent draw the storyboard?"
    a: "Yes. The `render_storyboard` tool in the Levni MCP server takes the same spec or a bare shot list, writes the sheet and returns a preview for the agent to check."
---

A short video starts as a list: this shot, then that one, three seconds each. Rendering the video is the slow and costly part, so a mistake in the list (a shot that runs too long, two shots that say the same thing, a missing ending) is cheapest to fix before any rendering starts. That is what a storyboard is for: the picture of the shot list.

This guide uses **Levni**, an open-source design engine, to draw one. You give it the shots, a drawing and a few words each, and it draws one contact sheet with a numbered frame per shot, its title, length, running timecode and note. It can also write each shot as a full-size frame and a `shots.json`, so the video tool reads the same plan instead of guessing. It runs locally: no image model, no account, no cost per frame.

You need Node 20 or newer. The product here is made up: **tiny-queue**, a small job queue for Node, and its 20-second launch video. For the README banner of the same made-up repo, see [the animated README banner guide](/blog/animated-readme-banner/).

## Install

```bash
npm install @levni/levni
```

Storyboards arrived in Levni 0.5.0. When I wrote this, `npm view @levni/levni version` still printed 0.4.0, so until 0.5.0 is published, install the repository version with `npm install github:Levni-Dev/levni`.

The command is `levni storyboard <spec.json> <out.png>`. Like a scene, it is deterministic: the same spec and seed give the same image.

## Write the shot list

Each shot has an id, a title, a drawing, a camera, the words on screen, a note for whoever makes it, and a length. Save this as `launch.json`:

```json
{
  "title": "tiny-queue launch, 20 s",
  "brand": { "name": "tiny-queue", "mark": "package",
    "inks": ["#14181F", "#F2603F", "#F2C230", "#F1EEE6"] },
  "format": "youtube",
  "seed": 5,
  "shots": [
    { "id": "hook", "title": "Jobs go missing",
      "prop": "hourglass", "camera": "close",
      "text": "Where did that job go?",
      "note": "Slow push in on the hourglass. No music yet.",
      "duration": 3 },
    { "id": "problem", "title": "Three services for one queue",
      "props": ["database", "terminal", "laptop"],
      "background": "tone-coral",
      "text": "Redis, a worker, a dashboard...",
      "note": "Cut fast between the three.", "duration": 3 },
    { "id": "answer", "title": "One file", "prop": "package",
      "camera": "left", "text": "Every job in one SQLite file.",
      "note": "The box drops in from the top.", "duration": 4 },
    { "id": "code", "title": "Five lines", "prop": "terminal",
      "camera": "left", "background": "blue",
      "text": "npm install tiny-queue",
      "note": "Screen recording, typed live.", "duration": 4 },
    { "id": "proof", "title": "Nothing lost", "prop": "checklist",
      "camera": "wide", "background": "tone-green",
      "text": "Restart it. The jobs are still there.",
      "note": "Kill the process on screen, start it again.",
      "duration": 3 },
    { "id": "end", "title": "Star it", "prop": "package",
      "camera": "left", "background": "tone-mustard",
      "text": "Star tiny-queue on GitHub.",
      "note": "Logo and link, held for two seconds.",
      "duration": 3 }
  ]
}
```

## Draw the sheet

```bash
npx @levni/levni storyboard launch.json board.png --frames-dir frames
```

```text
board.png  (1192x818, 6 shots, 20s)
```

![A storyboard sheet titled tiny-queue launch, 20 s: six numbered frames in two rows, an hourglass with the caption Where did that job go, a database, a terminal and a laptop on pink, a box with Every job in one SQLite file, a terminal on black with npm install tiny-queue, a clipboard with a check mark on green, and a box with Star tiny-queue on GitHub, each with a title, a length in seconds, a timecode range and a note](/blog/storyboard-generator/fig-1.webp)
*The sheet: six shots, 20 seconds, with running timecodes from 00:00 to 00:20.*

It took about a second on the Mac I used. Read the sheet the way an editor would. The timecodes add up, so you see at once that the video is 20 seconds and that the code shot gets four of them. Each frame carries the words that will be on screen, so you can check that they fit and that no two shots repeat each other.

The `brand` inks re-ink every frame and the sheet itself, which is why the code shot sits on near-black: the brand's first ink took the place of the house blue. The labels use the fonts that ship with Levni, so Turkish letters such as ğ, ş and İ draw correctly on every machine.

## The fields

For the sheet:

| field | default | meaning |
| --- | --- | --- |
| `title` | brand name | the sheet title |
| `brand` | none | `{ name, inks, mark }`; `inks` (1 to 5 colours) re-ink every frame and the sheet |
| `style` | from `brand` | any Levni style, such as `"riso"` or `"miniature"`; wins over `brand.inks` |
| `format` | `youtube` | `youtube` (1280 x 720), `hd` (1920 x 1080), `story` (1080 x 1920), `square`, or `[w, h]` |
| `fps` | `24` | used to turn `frames` into seconds |
| `seed` | from the title | the crayon texture; each shot adds its own offset |

For each shot:

| field | meaning |
| --- | --- |
| `id`, `title` (or `desc`), `note` | the label, the headline and the longer text under the frame |
| `duration` (seconds) or `frames` | the length; `duration` wins; 3 seconds by default |
| `prop` / `props` | a library drawing by name or tag, or up to four of them |
| `camera` | `wide` (centred, text below), `close` (big and cropped, caption on a block), `left` or `right` (drawing on that side, text opposite) |
| `background` | a colour name such as `paper`, `blue` or `tone-coral`; by default the shots cycle through soft grounds |
| `text` | the words drawn into the frame |
| `scene` | a full Levni scene, used as it is, when you want to draw the frame yourself |

One tip on cameras. My first draft set the code shot to `camera: "right"`, and the terminal drawing came out mirrored, with its prompt pointing the wrong way. The `right` camera flips the drawing so it faces into the frame. That suits a bird or a car, not a drawing with text or arrows in it. I switched that shot to `left`.

## Full-size frames and shots.json

The sheet is for people. `--frames-dir` writes the same plan for tools: every shot at the full format size, plus a `shots.json`.

```text
frames/shot-01.png
frames/shot-02.png
frames/shot-03.png
frames/shot-04.png
frames/shot-05.png
frames/shot-06.png
frames/shots.json
```

![Shot three at full size, 1280 by 720: a cardboard box drawn in black line on a yellow circle, on the left of a cream frame, with Every job in one SQLite file set in heavy type on the right](/blog/storyboard-generator/fig-2.webp)
*`frames/shot-03.png`, the "One file" shot at 1280 by 720.*

This is the start of `shots.json` from that run:

```json
[
  {
    "id": "hook",
    "title": "Jobs go missing",
    "note": "Slow push in on the hourglass. No music yet.",
    "duration": 3,
    "start": 0,
    "file": "shot-01.png"
  },
  {
    "id": "problem",
    "title": "Three services for one queue",
    "note": "Cut fast between the three.",
    "duration": 3,
    "start": 3,
    "file": "shot-02.png"
  }
]
```

(The real file has all six shots.) `start` is the running time in seconds, so a video tool can place every frame on a timeline without adding up durations itself. Shots that came with `frames` also keep that count.

## Why draw the board before the video

If you make videos in code, with Remotion or a similar tool, or ask an agent to make one, the render is the slow step and the one that burns time and credits. A storyboard moves the cheap decisions in front of it.

- **The timing is visible.** The sheet adds up the lengths and prints a timecode under every frame. A video that runs over its slot shows up before anything is rendered.
- **The words are tested.** On-screen text is drawn into each frame at the real format, so a line that is too long for the frame is obvious on the sheet.
- **The tool and the people read the same plan.** `shots.json` gives the id, length, start and placeholder frame of every shot. In Remotion, each shot becomes a sequence that starts at `start` times the frame rate and lasts `duration` times the frame rate, showing its frame until the real footage or animation replaces it.
- **Frames are scenes.** `expandStoryboard(spec)` returns every shot as a plain Levni scene. Print one, add [motion to its elements](/blog/animate-illustrations-json/) and render it with `levni animate`, and the placeholder becomes a loop in the same style.

The order matters: list, sheet, review, then render. Each step is cheaper than the next.

## The bare shot list

Agents and scripts often write a shot list as a plain array of `{ id, desc, frames }`. Levni reads that form as it is. Save this as `shotlist.json`:

```json
[
  { "id": "s1", "desc": "A rocket on the launch pad at dawn", "frames": 72 },
  { "id": "s2", "desc": "Coffee while the build runs", "frames": 48 },
  { "id": "s3", "desc": "A truck carries the release to users", "frames": 96 },
  { "id": "s4", "desc": "Confetti over the changelog", "frames": 60 }
]
```

```bash
npx @levni/levni storyboard shotlist.json shotlist.png --columns 2
```

```text
shotlist.png  (806x764, 4 shots, 11.5s)
```

![A storyboard sheet titled Storyboard with four frames in a two by two grid: a rocket and a pixel launch icon on yellow, a coffee cup and a person at a laptop on blue, a delivery truck and a person icon on cream, and a party popper with sparks on pink, each with a title, a length and a timecode](/blog/storyboard-generator/fig-3.webp)
*A bare shot list, no other fields. The words rocket, coffee, truck and confetti picked the drawings.*

`desc` became each title, and `frames` became the length at 24 frames a second, so 72 frames is 3 seconds and the four shots add up to 11.5. No drawing was named, so Levni looked for words in the text that name a library drawing or tag: `rocket`, `coffee`, `truck`, `confetti`. When nothing matches, or a name is not in the library, the frame becomes a placeholder and the command says which shot:

```json
[{ "id": "s1", "desc": "A hovercraft crosses the bay", "frames": 48 }, { "id": "s2", "title": "Ending", "prop": "zeppelin-xyz", "duration": 2 }]
```

```bash
npx @levni/levni storyboard odd.json odd.png
```

```text
odd.png  (1192x477, 2 shots, 4s)
- shot s1: no scene, prop or text, drew a placeholder
- shot s2: unknown prop "zeppelin-xyz", drew a placeholder
```

A placeholder is an outlined frame crossed out, with the shot text in the middle. The board still renders, so a long list is never blocked by one odd shot. To find a drawing that exists, search the library with `npx @levni/levni list truck`, or browse [the library](/library/).

## Ask an agent to draw it

The `render_storyboard` tool in the Levni MCP server takes `spec` (the full form or a bare shot list), an `out` path ending in `.png`, `frames_dir` for the full-size frames and `shots.json`, `columns`, `preview` (on by default, a 900-pixel image) and `guide: true` to return the storyboard format. Add the server from [the MCP page](/mcp/#setup); until 0.5.0 is on npm, point it at `github:Levni-Dev/levni`, because the tool is new in 0.5.0.

A prompt for an agent that is about to make a video:

```text
Before writing any Remotion code, plan the video. Call
render_storyboard with guide: true and read the format. Write
a shot list for a 20-second launch video of this project: six
shots, a title, a library drawing (search with list_props), a
camera, the on-screen text and a note each. Render it with
render_storyboard to storyboard/board.png with frames_dir
storyboard/frames. Look at the preview. Fix shots whose text
is too long or whose lengths do not add up to 20 seconds,
render again, and show me the sheet. Wait for my OK before you
build the video from storyboard/frames/shots.json.
```

The last line is the point. The agent stops at the cheap step, and you approve the plan before it spends time on the expensive one.

## Check the result

Look at the sheet before you hand it on. Four things can go wrong. A long title is cut with an ellipsis on the sheet, so keep titles to a few words and put the rest in `note`. Long notes are cut at four lines. A `right` camera mirrors the drawing, which reads badly when the drawing holds text or arrows. And a shot with no drawing becomes a placeholder, so read the warnings. A sheet holds up to 60 shots.

When a frame is wrong, fix the shot in the spec, not the image. Because the render is deterministic, every other frame stays as it was.

## What to do next

Turn a shot into a loop with [how to animate an illustration from JSON](/blog/animate-illustrations-json/), make the matching set of brand images with [the brand kit generator](/blog/brand-kit-generator/), or give the repo a [README banner that moves](/blog/animated-readme-banner/). To draw a single frame by hand, open [the editor](/editor/), and for other free makers see [the tools](/tools/).

**Reference and examples.** Read the [storyboard reference](/docs/storyboards/) (fields, cameras, outputs) and the [MCP tools](/mcp/#tools); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
