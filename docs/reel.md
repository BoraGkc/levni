# Reel

`levni reel` plays shots or scenes one after another, joined with transitions, as one video or loop.

```bash
npx @levni/levni reel examples/reel.json reel.mp4
```

```json
{
  "format": "square",
  "fps": 20,
  "transition": "fade",
  "transitionSeconds": 0.5,
  "clips": [
    { "shot": "logo-sting", "fields": { "title": "Lale Studio", "mark": "tulip" }, "seconds": 2.6 },
    { "shot": "mark-print", "fields": { "title": "Every ink, one plate at a time.", "mark": "lighthouse" }, "seconds": 2.4, "transition": "wipe" },
    { "scene": { "elements": [] }, "seconds": 2 }
  ]
}
```

```js
import { renderReel } from '@levni/levni';
await renderReel(reel, 'reel.mp4');   // or .gif / .webp
```

From an agent: the MCP tool `render_reel` takes the same spec and returns a strip of frames.

## Fields

| field | default | meaning |
| --- | --- | --- |
| `clips` | | each clip is `{ shot, fields }` (see [shots.md](shots.md)) or `{ scene }`, plus `seconds` and its own `transition` in |
| `format` / `canvas` | `cover` | one size for the whole reel |
| `fps` | `24` | frames per second |
| `seconds` | `3` | length of a clip that does not say |
| `transition` | `fade` | `cut`, `fade`, `wipe`, `slide`, `push` or `iris` |
| `transitionSeconds` | `0.4` | how long two clips overlap |
| `direction` | left to right | `up` makes wipe, slide and push vertical |
| `inks` | none | up to five hex colours for every shot clip |
| `width` | canvas width | output width in px |

Each clip plays its own motion once over its seconds: entrances arrive, loops come round once. A transition overlaps
the end of one clip with the start of the next, so the reel is a little shorter than the sum of its clips.

## Output

`.mp4` needs ffmpeg on the PATH (H.264, plays on X, Instagram and in slides). `.gif` uses Levni's own encoder and
plays in READMEs and chat. `.webp` is smallest for web pages. The example reel (four square clips, 540 px, 20 fps)
is 8.5 seconds.
