# Stamp and remix

Every PNG Levni writes carries the scene that drew it. Drop the PNG on the [editor](https://levni.dev/editor/) and it
opens with every part editable. The stamp also says what made the picture: drawn from JSON, no image model.

```bash
npx @levni/levni render scene.json cover.png          # stamped
npx @levni/levni open cover.png scene.json            # the scene back out
npx @levni/levni remix cover.png mine.png --by "Ada"  # your name joins its remix chain
```

```js
import { stampPng, readStamp, remix } from '@levni/levni';
const { scene, credits } = readStamp(pngBytes);
const next = remix(scene, { by: 'Ada', from: 'levni.dev/gallery' });
```

## The remix chain

A scene's `credits` is a list of links, oldest first: `{ by, from, at }`. `remix()` adds one; nothing else in the
scene changes. The chain travels inside the file, so it needs no account and no server: whoever opens the picture sees
who made it and who changed it after.

- In the editor, the Download menu has a field for your name. Every PNG you download carries it.
- In the [gallery](https://levni.dev/gallery/), "Remix it in the editor" opens a piece with a link back to it.
- Dropping a stamped PNG on the editor shows its chain, for example "remixed by Ada → Bora".

## Format

Two PNG text chunks before `IEND`: an `iTXt` chunk with the keyword `levni` holding `{ "v": 1, "scene": … }` as
UTF-8 JSON, and a `tEXt` `Software` chunk. A new stamp replaces an old one. `render(scene, out, { stamp: false })`
writes a plain PNG.
