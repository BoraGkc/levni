# Folio guide: drawing, naming and tagging props

The Levni Folio is one set, not a pile of drawings: every prop should look like it belongs next to the others and be easy to find by search. This page is the rule book for new props and for reviews. [CONTRIBUTING.md](../CONTRIBUTING.md) covers how to submit; [`prop.schema.json`](prop.schema.json) is the file format.

**Must** rules are checked by `npm test` and `levni add`, and a prop that breaks one is refused. **Should** rules are printed as `note` hints by `levni add` and `levni check <name>`; break one only on purpose.

## 1. Drawing

### Canvas
- **Must:** draw in a 0–100 box, y grows downward. Colours are names (`ink`, `blue`, `tone`, `coral`…), never hex, so style packs can recolour the drawing.
- **Should:** the object fills 70–85 of the box, centred near (50, 50), inside 4..96. `levni check <name>` measures size and centre for you.
- **Should:** symmetrical objects sit exactly on the centre line; lopsided ones (a watering can) may shift a little so they *look* centred.

### Line
- **Should:** outlines `weight` 8–10, details 4–6. Do not mix many weights in one drawing.
- **Should:** keep at least one outline-width of paper between separate parts. If two lines nearly touch at 120 px they read as a smudge.
- **Should:** fill with one tone (`tone`, `tone-coral`…) and at most two accent colours. Two inks plus paper is the house style.

### Detail
- **Should:** 2–24 paths. Keep what makes the object recognisable, drop the rest. Shrink the sheet to 120 px and squint: areas that go dark are too busy.
- **Should:** use simple curves (`Q`, `A`) where they work; avoid long chains of tiny `C` segments.
- **Should:** a variant reuses the base drawing. `phone` variant 1 is the same phone turned, not a new phone.

### Never
No faces, no hands (people only as faceless pictograms), no text inside the drawing, no scenes (one object, one idea), no logos or anything that reads as one ([BRAND_LOGOS.md](../BRAND_LOGOS.md)), nothing traced.

## 2. Naming

- **Must:** lowercase English kebab-case, `a-z0-9` and hyphens, same as the file name. No brand names.
- **Should:** name what the drawing **shows**, not what it is used for: `floppy-disk`, not `save`; `circle-slash`, not `ban`. A drawing means different things in different stories; the name stays true in all of them.
- **Should:** related props share the group word first: `book-open`, `book-closed`, `book-stack`, not `open-book`.
- **Should:** modifiers come after the thing they describe: `heart-broken`, `glass-empty`.
- **Should:** with two objects, the bigger one comes first (`moon-star`); same size, the front one first, else top-to-bottom then left-to-right (`pencil-ruler`).
- **Should:** numbers only when the drawing shows them (`clock-3` points at three). Not `book-2`, `send-alt`, `phone-new`: name what makes it different. A second angle of the same object is a **variant**, not a new name.
- **Renaming:** keep the old name in `"aliases": ["old-name"]` so saved scenes and agents still find it. Add an alias only for a rename, never as a second name.

## 3. Tags

Tags are how people and agents find a prop. The Library search, `levni list <word>` and the MCP `list_props` tool all read them.

- **Must:** at least one, lowercase, no duplicates.
- **Should:** 4–8 tags. Mix English synonyms and the Turkish word(s): `watering-can` → `garden`, `water`, `plant`, `sulama`, `bahçe`.
- **Should:** do not repeat the name: it is already searchable. Do not add `icon`, `drawing`, `prop`: every entry is one.
- **Should:** short words; a phrase only when it is clearer (`magnifying glass`, `antep fıstığı`).
- **Should:** add the stories the prop fits (`law`, `election`, `faiz`), not loose neighbours to catch more searches.
- **Should:** tags of a variant family describe what differs (`battery-low`: `low`, `empty`, `şarj azaldı`).
- Brand or event names are fine as **tags** (`tiktok` on a generic phone, `oscar` on a film reel), never as names.
- Look at similar props first (`levni list garden`) and reuse their words.

## 4. Variant notes

Each variant has a `note`: what this variant **shows**, in a short phrase, so a model that cannot see images can pick the right one.

- **Should:** 3–12 words, a phrase without a final full stop: `side view, spout to the right`.
- **Should:** say what differs from the other variants (angle, state, colour), not how it was made.
- No Markdown, emoji or pull request references.

## 5. Checklist before a pull request

- [ ] `npx levni add my-props.json --sheet check.png` prints no `skip` lines; `note` lines are fixed or explained
- [ ] `check.png` looks right on paper and on the blue panel, also at small size
- [ ] Name says what it shows; related props share the group word; no numbers it does not show
- [ ] 4–8 lowercase tags with English and Turkish words, not repeating the name
- [ ] Every variant has a short note
- [ ] Own work, no logos, faces, hands or text
- [ ] `npm test` passes

## 6. Using drawings well

For people placing Levni images in articles, pages and apps:

- **Alt text.** A drawing that carries meaning gets alt text that says what it shows in the story ("a cracked piggy bank next to a falling chart"), not "illustration". A purely decorative image gets `alt=""` so screen readers skip it.
- **Do not rely on colour alone.** Recolouring by style pack is fine, but if red vs. green carries the meaning (loss vs. gain), add a shape or a word too.
- **Contrast.** On dark or busy backgrounds put the drawing on a paper panel or pick a style pack whose ink stays clearly visible against it.
- **Same drawing, same meaning.** Within one page, use one prop for one idea; do not reuse a prop for two unrelated things.
- **Clear symbols over puns.** Pick objects most readers recognise; idioms and wordplay travel badly between languages.
- **Sensitive stories** (loss, illness, disaster): set `"palette": "blue"` on the prop and pick from props tagged `sensitive`. See [sensitive.md](sensitive.md).
