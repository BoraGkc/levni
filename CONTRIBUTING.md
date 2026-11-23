# Contributing to Levni

Two kinds of contributions: **drawings for the Levni Folio** (most welcome) and **code** (engine, CLI, style packs).

## Submit to the Folio

The Levni Folio is the shared library of drawn objects in `library/props/`. Each prop is one JSON file:

```json
{
  "name": "watering-can",
  "category": "home",
  "tags": ["garden", "water", "sulama"],
  "author": "Your Name",
  "variants": [
    { "note": "side view, spout to the right", "paths": [
      { "d": "M20 40 L70 40 L66 86 L24 86 Z", "fill": "tone", "stroke": "ink", "weight": 9 },
      { "d": "M70 52 L92 30", "stroke": "ink", "weight": 9 }
    ] }
  ]
}
```

### Format

- `name`: the file name, lowercase English, `a-z0-9` and hyphens. `tags` in any language. `category` is one shelf of the Library: film, tv, stage, music, books, tech, money, law, sport, home, food, nature, places, health, symbols.
- Draw in a 0–100 box (y grows downward), centred, the object filling 70–85 of it.
- Colours are **names**, never hex: `ink` (outlines), `blue`, `tone`, `coral`, `tone-coral`, `mustard`, `tone-mustard`, `green`, `tone-green`, `paper`, `white`, `dark`. Names let style packs recolour your drawing.
- `weight` is the line width in output pixels: 8–10 outlines, 4–6 details.
- A second angle or state of the same object is another **variant**, not another prop.
- Writing many at once with a chat model: [`docs/prop-prompt.md`](docs/prop-prompt.md) has a copy-paste prompt.

### Check it

```bash
npm install
npx levni add my-props.json --sheet check.png   # validates, writes to library/props/, draws them
npm test                                        # validates and renders the whole Folio
```

Look at `check.png`: every variant on paper and on a blue panel.

### Review rules

1. **Own work only.** Drawn by you. Drawing in the spirit of a style or tradition is welcome (a riso poster, a Tulip Era tulip); tracing a specific work, photo, stock image or icon set is not. AI-assisted path code is accepted when you directed and checked it: say so in the pull request.
2. **No faces, no hands.** People only as faceless pictograms.
3. **No logos or trademarks**, and nothing that reads as one (a bitten apple, a swoosh, a real country's flag by accident).
4. **One object, one idea.** No text inside drawings, no scenes.
5. **House style.** Simple shapes, two inks plus paper, readable at 120 px.

### License

By submitting you release your drawing under [CC BY 4.0](library/LICENSE) and are credited in its `author` field.

## Code

- Node 20+, one dependency (sharp). Keep it that way unless a feature truly needs more.
- `npm test` must pass. Keep changes small and focused; describe what you changed and why.
- New style packs go in `src/styles.mjs` as a colour map with a short comment on their inspiration.
- Code is MIT-licensed; by contributing you agree to release your code under it.
