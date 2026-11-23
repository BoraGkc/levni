# Illustrating sensitive stories

News about loss, disaster, illness, courts and grief needs calm pictures: no faces, no crowds in distress, no injury, no religious symbols. Levni's answer is one quiet object with a lot of space around it.

## How

- **One object, lots of space.** A single prop at 35-50% of the canvas height, centred or on a third, on a plain panel. Resist adding a second idea.
- **Palette "blue".** Set `"palette": "blue"` on the prop element; every accent folds into the blue family (coral becomes blue, mustard and green become tone). The whole image then reads as one cool ink.
- **Calm panel.** `blue` or `tone` panel, `paper` ground, no halftone or glyph fields behind it.
- **Absence over presence.** An empty chair says more than a crowd. Prefer objects that point to a person (a candle, a bench, a lit window) over the person.
- **No text in the picture**, no flags of real countries, no logos.
- Tag filter: every prop of the pack carries the tag `sensitive`; `npx @levni/levni list sensitive`.

```json
{ "seed": 3, "elements": [
  { "type": "panel", "x": 0, "y": 0, "w": 1200, "h": 673, "color": "tone" },
  { "type": "prop", "name": "memorial-candle", "x": 600, "y": 340, "size": 300, "palette": "blue" }
] }
```

Check any prop in blue only: `npx @levni/levni sheet out.png <names> --recolor coral=blue,mustard=tone,green=tone`.

## Note on automatic image judges

Automatic image scorers (including LLM judges) tend to rate these calm, sparse images low: they reward energy, colour and detail. Do not auto-reject them. For this topic, empty space and restraint are the intent.

## The pack

`memorial-candle`, `candle-group`, `tealight-bowl`, `wreath`, `single-flower`, `flowers-on-step`, `empty-chair`, `empty-bench`, `door-light-under`, `window-night-light`, `court-bench`, `hospital-bed-empty`, `iv-stand`, `stretcher-empty`, `folded-flag`, `dove`, `olive-branch`, `white-ribbon`, `hourglass-calm`, `rain-cloud`, `umbrella-closed`, `lantern-glow`, `stone-cairn`, `stone-single`, `path-into-distance`, `open-book-blank`, `cracked-earth`, `mended-pot`, `tea-glass-alone`, `envelope-black-edge`
