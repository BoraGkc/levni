# Writing props with any chat model

The Levni Folio grows fastest when drawings are written in batches by a chat model (ChatGPT, Claude, Gemini, a local model) and then checked by Levni on your machine. The checking is free: no model, no tokens.

## The loop

1. List the objects you want in a spreadsheet: [`props-template.csv`](props-template.csv) (name, tags, what it looks like). 15–20 rows per batch works best.
2. Open a chat, paste **the prompt below**, then paste your rows under it.
3. Save the answer as a file (for example `batch-01.txt`). The whole answer is fine, code fences included.
4. Import and look:
   ```bash
   npx @levni/levni add batch-01.txt --sheet batch-01.png
   ```
   `add` checks every prop, writes the good ones to `library/props/`, adds new variants to props that already exist, and lists the broken ones. Open `batch-01.png` to see them all, on paper and on blue.
5. Send the broken or ugly ones back to the same chat with what is wrong ("the handle floats", "too thin"), import the fix the same way. Delete what you do not want (`library/props/<name>.json`).
6. `npm test` before committing.

Expect a few drawings per batch to need a second try: chat models handle simple objects well and complex ones (animals, vehicles, hands) poorly. Ask for the simple side view of a thing.

## The prompt

Copy everything inside the box.

````text
You draw objects for Levni, an illustration engine. Each object is a JSON "prop": SVG path data in a 0..100 box, using colour NAMES, which Levni then inks by hand (wobbly pressure-brush lines, riso print). Draw like a confident editorial illustrator: simple, bold, flat shapes, few details, readable at 120 px.

OUTPUT: one ```json code block holding a JSON array of props, nothing else. One prop per object I list. Format:

{ "name": "kebab-case-english", "category": "one of: film tv stage music books tech money law sport home food nature places health symbols", "tags": ["english tag", "türkçe etiket", ...],
  "variants": [ { "note": "short description of the view", "paths": [ { "d": "...", "fill": "...", "stroke": "...", "weight": 8 } ] } ] }

RULES
- Box: x and y from 0 to 100, y grows downward. Centre the object; keep it inside 8..92. It should fill about 70-85 of the box on its longer side.
- Paths are drawn in order: back shapes first, details last.
- A filled shape: closed path ending in Z, with "fill" and usually "stroke": "ink". A detail line: only "stroke" (no fill).
- Use only these commands: M L H V Q C A Z (absolute, uppercase). Round numbers to whole numbers or one decimal.
- Colours (names only): ink (outline, dark blue), blue, tone (light blue), coral, tone-coral, mustard, tone-mustard, green, tone-green, paper (cream), white, dark. Use at most two accent colours per object plus paper/tone; outlines are "ink".
- "weight" is the line width in pixels: 8-10 for outlines, 4-6 for inner details. "stroke": "none" for fill-only shapes.
- A small round dot: "d": "M x y h.1" with "stroke" and a weight of 6-10.
- Holes (rings, frames): add "rule": "evenodd" and put both outlines in one d.
- Draw one object, not a scene. No text or letters, no faces or eyes, no hands, no logos or brand shapes, no flags of real countries.
- If an object has an obvious second view or state (open/closed, side/front), add it as a second variant of the same prop.

EXAMPLES

```json
[
{
 "name": "phone",
 "tags": [
  "telefon",
  "smartphone",
  "mobile",
  "cep telefonu"
 ],
 "variants": [
  {
   "note": "front, screen with two text bars",
   "paths": [
    {
     "d": "M32 8 Q30 8 30 12 L30 88 Q30 92 34 92 L66 92 Q70 92 70 88 L70 12 Q70 8 66 8 Z",
     "fill": "paper",
     "stroke": "ink",
     "weight": 9
    },
    {
     "d": "M36 18 L64 18 L64 76 L36 76 Z",
     "fill": "tone",
     "stroke": "none"
    },
    {
     "d": "M40 30 L58 30 M40 40 L54 40",
     "stroke": "ink",
     "weight": 6
    },
    {
     "d": "M46 84 L54 84",
     "stroke": "ink",
     "weight": 7
    }
   ]
  }
 ]
},
{
 "name": "tulip",
 "tags": [
  "lale",
  "flower",
  "ottoman",
  "miniature",
  "spring"
 ],
 "variants": [
  {
   "note": "Ottoman tulip, needle petals, two lancet leaves",
   "paths": [
    {
     "d": "M50 94 Q48 72 50 50",
     "stroke": "green",
     "weight": 7
    },
    {
     "d": "M50 88 Q28 72 34 48 Q44 66 50 80 Z",
     "fill": "green",
     "stroke": "ink",
     "weight": 5
    },
    {
     "d": "M50 80 Q70 64 66 44 Q58 62 50 72 Z",
     "fill": "green",
     "stroke": "ink",
     "weight": 5
    },
    {
     "d": "M50 50 Q35 44 37 26 Q39 14 43 6 Q46 20 50 22 Q54 20 57 6 Q61 14 63 26 Q65 44 50 50 Z",
     "fill": "coral",
     "stroke": "ink",
     "weight": 7
    },
    {
     "d": "M50 48 Q44 34 50 10 Q56 34 50 48 Z",
     "fill": "tone-coral",
     "stroke": "ink",
     "weight": 5
    }
   ]
  }
 ]
}
]
```

MY OBJECTS (name, tags, description):
````

Paste your rows right after the last line, for example:

```text
watering-can, "garden; sulama; water", metal watering can from the side, spout to the right
tea-glass, "tea; çay; ince belli", tulip-shaped Turkish tea glass on a small saucer
```

## Style packs

A style pack is only a colour map, so a chat model can write one too. Ask for:

```text
Write a Levni style pack: a JSON object mapping these colour names to hex values for the look "<describe the look>":
paper, white, ink, blue, coral, green, mustard, dark, tone, tone-coral, tone-green, tone-mustard.
Keep the roles: paper = background, ink = outlines (darkest), blue = main panel colour, tone* = light versions of their accent.
```

Add the result to `STYLES` in `src/styles.mjs` under a short name, then render any scene with `"style": "<name>"`.
