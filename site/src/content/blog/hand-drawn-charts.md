---
title: "Hand-Drawn Charts from Data: Bars, Lines, Pies, Isotype"
description: "Make hand-drawn charts from your own numbers: bar, line, pie, donut and isotype charts in a sketchy riso style, from a few lines of JSON, free and offline."
date: 2026-11-23
updated: 2026-11-24
category: covers
kind: Guide
featured: true
coverAlt: "A blue card with hand-drawn white bars, a coral and white donut chart on a yellow disc and a small line chart with dots"
faq:
  - q: "How do I make a hand-drawn chart from data?"
    a: "Write a Levni scene with a chart element, such as `{ \"type\": \"bars\", \"x\": 100, \"y\": 120, \"w\": 1000, \"h\": 460, \"values\": [120, 180, 150] }`, and render it. The bars, axis and labels are drawn with the same hand pen as the rest of the Levni library."
  - q: "Which chart types are there?"
    a: "`bars` (vertical or horizontal), `linechart` (one or more series, optional area fill), `pie`, `donut` and `isochart`, a pictogram chart where each icon stands for a unit."
  - q: "Does Levni make up any numbers?"
    a: "No. Charts draw only the values you give them. Values are scaled to the box, negative bars hang below the baseline, and anything that is not a number counts as 0."
  - q: "Can I put a chart on a dark background?"
    a: "Yes. Set `\"ink\": \"paper\"` on the chart so the axis, outlines and labels turn light, and pick `colors` that show on the dark panel."
  - q: "Is a sketchy chart accurate enough for real data?"
    a: "The values are scaled exactly; only the line has a hand wobble. For a precise reading, set `showValues` to print the numbers on the chart, and always cite the source of the data in your article."
---

A clean chart from a spreadsheet looks like a report. A hand-drawn chart looks like part of the story. That is why magazines and newsletters sketch their charts: the numbers are the same, but the picture belongs to the article instead of to the software that drew it.

Levni draws hand-drawn charts from your numbers. Its chart elements, `bars`, `linechart`, `pie`, `donut` and `isochart`, use the same pressure-brush pen and riso inks as its illustration library, so a chart can sit inside a cover, next to a drawing, or on an old TV screen. You give the values; nothing else is invented.

This guide draws each chart type from a short JSON scene, then shows how to put a chart on a dark card and inside another drawing. It runs on your machine, needs no account and costs nothing per chart. You need Node 20 or newer. All the numbers in the examples are sample data, labelled as such in the pictures.

## Draw a bar chart

Install Levni from npm:

```bash
npm install @levni/levni
```

Save this as `bars.json`:

```json
{ "seed": 7, "elements": [
  { "type": "label", "text": "Visitors per day (sample data)", "x": 100, "y": 80, "size": 18 },
  { "type": "bars", "x": 100, "y": 120, "w": 1000, "h": 460,
    "values": [120, 180, 150, 210, 260, 90, 70],
    "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    "highlight": 4, "showValues": true, "labelSize": 16 }
] }
```

Render it:

```bash
npx levni render bars.json bars.png
```

![A hand-drawn bar chart titled Visitors per day (sample data): seven light blue bars for Monday to Sunday with their values printed on top, Friday's bar in coral](/blog/hand-drawn-charts/fig-1.webp)
*`bars` with labels, printed values and one highlighted bar.*

`x`, `y`, `w` and `h` are the box the chart fills on the 1200 by 673 canvas. `highlight` takes an index (here 4, Friday) and paints that bar coral with the rest in a light tone. That is the most useful option for an article: one bar is the story, the rest is context.

Bars start from a zero baseline. Add `"horizontal": true` for a ranking, `gap` (0 to 0.9) to change the space between bars, and `min` or `max` to fix the scale; a value outside them is clipped to the limit.

## Draw a line chart with two series

`linechart` takes `values` for one line or `series` for several:

```json
{ "seed": 8, "elements": [
  { "type": "label", "text": "Two series, sample data", "x": 100, "y": 80, "size": 18 },
  { "type": "linechart", "x": 100, "y": 120, "w": 1000, "h": 460,
    "series": [[4, 6, 5, 8, 9, 12, 11, 14], [3, 3, 4, 4, 6, 5, 7, 8]],
    "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    "colors": ["coral", "blue"], "dots": true, "area": true, "labelSize": 16 }
] }
```

![A hand-drawn line chart with two lines from January to August: a coral line with dots on top of a filled light blue area, and a blue line with dots below it](/blog/hand-drawn-charts/fig-2.webp)
*Two series with dots. `area` fills under the first series.*

The scale includes zero by default, which keeps the chart honest about size. For data that never comes near zero, such as a temperature or an index, set `"zero": false` so the lines use the full height. `"axis": true` adds a vertical axis line, and `areaColor` sets the fill.

## Draw a pie and a donut

`pie` and `donut` take a centre and a radius instead of a box:

```json
{ "seed": 9, "elements": [
  { "type": "pie", "x": 280, "y": 336, "r": 180, "values": [45, 30, 25], "labels": ["Search", "Social", "Direct"], "colors": ["coral", "tone", "blue"], "labelSize": 18 },
  { "type": "donut", "x": 920, "y": 336, "r": 180, "values": [62, 38], "labels": ["Read", "Skimmed"], "colors": ["mustard", "tone"], "showValues": true, "suffix": "%", "labelSize": 18 }
] }
```

![A hand-drawn pie chart with coral, light blue and blue slices labelled Search, Social and Direct, next to a yellow and light blue donut labelled Read 62% and Skimmed 38%](/blog/hand-drawn-charts/fig-3.webp)
*A pie with three slices and a donut with printed percentages.*

The values do not need to add up to 100: slices are drawn as shares of the total. `hole` sets the donut's hole (0 to 0.8, 0.55 by default), `start` turns the first slice (degrees, -90 is twelve o'clock), and `highlight` with `explode` pulls one slice out. Negative values count as 0, and all zeros draw an empty outline rather than failing.

Keep pies to two to four slices. More than that and the labels crowd, by hand or not.

## Draw an isotype chart

An isotype chart counts with pictures: each icon is a unit. It is the clearest way to show a quantity of people or things to a general reader. `isochart` draws one row per value:

```json
{ "seed": 10, "elements": [
  { "type": "label", "text": "One icon = 10 people (sample data)", "x": 140, "y": 90, "size": 18 },
  { "type": "isochart", "x": 220, "y": 150, "values": [80, 55, 25], "unit": 10, "size": 110, "labels": ["Walk", "Bus", "Car"], "colors": ["blue", "coral", "mustard"], "labelSize": 18 }
] }
```

![An isotype chart with three rows of faceless figures: eight blue ones for Walk, five and a half coral ones for Bus and two and a half yellow ones for Car, with the note 1 icon = 10](/blog/hand-drawn-charts/fig-4.webp)
*`isochart` with a unit of 10. 55 becomes five and a half icons.*

Partial icons are cropped to the remainder, so 55 at a unit of 10 is five full figures and half of the sixth. `icon` is `person` by default or any library drawing, such as `coffee-cup` for a story about cafes. If a row would need more than 24 icons (`maxIcons`), Levni raises the unit for you. The key under the chart ("1 icon = 10") is printed unless you set `"showUnit": false`.

There is also an `isotype` element for a simple share, such as "3 in 10". It is covered in the guide to [faceless people illustrations](/blog/faceless-people-illustrations/).

## Put hand-drawn charts on a cover

Charts are ordinary elements, so they mix with everything else. On a dark panel, set `"ink": "paper"` so the axis, outlines and labels turn light, and choose `colors` that show on blue. The cover of this post is three charts on one blue card:

```json
{ "seed": 12, "clip": [60, 52, 1080, 569], "elements": [
  { "type": "panel", "x": 60, "y": 52, "w": 1080, "h": 569, "color": "blue" },
  { "type": "disc", "x": 860, "y": 250, "r": 150, "color": "mustard" },
  { "type": "bars", "x": 150, "y": 150, "w": 520, "h": 380, "values": [3, 5, 4, 7, 6, 9], "colors": ["paper"], "highlight": 5, "ink": "paper", "gap": 0.35 },
  { "type": "donut", "x": 860, "y": 250, "r": 110, "values": [55, 30, 15], "colors": ["coral", "paper", "tone"], "ink": "paper" },
  { "type": "linechart", "x": 720, "y": 420, "w": 340, "h": 140, "values": [2, 4, 3, 6, 5, 8], "colors": ["paper"], "ink": "paper", "dots": true, "axis": false }
] }
```

A chart can also go inside another drawing. Levni's slots let one drawing sit in a place inside another: a TV has a `screen`, a magnifier a `lens`. Here the library's chart board sits on an old TV:

```json
{ "seed": 11, "elements": [
  { "type": "prop", "id": "tv", "name": "old-crt-tv-long-shadow", "x": 600, "y": 340, "size": 640 },
  { "type": "prop", "name": "chart-board", "in": { "ref": "tv", "slot": "screen" }, "fit": 0.92 }
] }
```

![An old television drawn in blue line with a light blue screen showing a small easel with a coral bar chart](/blog/hand-drawn-charts/fig-5.webp)
*A chart drawing placed in the TV's screen slot.*

That is a good way to illustrate a story about data without showing the actual numbers in the picture.

## Check the numbers before you publish

The renderer draws what you give it, so the check is on you:

- **Use real, sourced numbers.** Name the source in the article. If the picture uses sample data, say so in the picture, as these examples do.
- **Print the values** with `showValues` (plus `prefix`, `suffix` and `decimals`) when readers need the exact figure.
- **Read the critic's notes.** The render prints them: a chart that runs off the canvas or a lopsided layout shows up there.

An AI assistant can do the drawing from a table. With the Levni MCP server added ([setup](/mcp/)), paste:

```text
Use the levni MCP server. Call scene_guide once. Draw this table as a
hand-drawn bar chart with labels and printed values, highlight the
largest bar, and add a small label with the source. Do not change or
round any number. Render with render_scene, fix the critic's notes and
save chart.png.

<paste your table here>
```

## What to do next

See more charts in [the data gallery](/gallery/#charts) and the other elements on [the features page](/features/). For a whole cover around a chart, read [generate blog covers with Claude Code](/blog/generate-blog-covers-claude-code/), and to resize a chart for social posts, read [one illustration, every social image size](/blog/social-media-image-sizes/). Browse [the library](/library/) for drawings to use as isotype icons.

**Reference and examples.** Read the [scene elements reference](/docs/elements/) (every element and field); see finished work on [the features page](/features/) and in [the gallery](/gallery/).
