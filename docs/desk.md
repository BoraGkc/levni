# Desk

`levni desk` opens a local panel for a folder of scenes. Every Levni scene in the folder shows as a card, drawn on your machine. Pick one to scrub its motion, play the loop, read the critic, see its git history and write files next to it.

```bash
npx @levni/levni desk my-designs
```

It prints the address (`http://localhost:4747/`, or the next free port) and opens it in your browser. Ctrl+C stops it.

## It watches the folder

Save a scene, in your editor or from your agent, and the drawing redraws within two seconds. That is the point: ask Claude or Codex to change a scene, and watch the change land on the Desk without running a command.

## What a card shows

- **The drawing.** Moving scenes get a `t` slider and Play, which draws the whole loop.
- **Critic.** The same notes `levni render` prints: anything off the canvas, too small, or crowding.
- **History.** The last commits that touched the file, when the folder is a git repository.
- **Files next to it.** The PNG, GIF and WebP already written for this scene.
- **Remix chain.** The names in the scene's `credits`, added by `levni remix` and the editor.

## Writing files

**PNG with scene** writes `name.png` with the scene inside it (see [Stamp](stamp.md)): drop it on the editor or the Pen to change it again. **GIF** and **WebP** write the loop, 24 frames at 12 fps. Files go next to the scene and replace an older export of the same name.

**Open in the Pen** sends the scene to levni.dev/pen in the link itself; nothing is uploaded.

## Which files count

Any `.json` up to two folders deep that has an `elements` list. `package.json`, lock files, reels, storyboards, `node_modules`, `.git` and build folders are skipped. A file that is not valid JSON shows at the end of the list, marked.

## Options

| Option | What it does |
| --- | --- |
| `--port 4747` | first port to try; the next free one is used if it is taken |
| `--no-open` | do not open the browser |

## Safety

The Desk listens on `127.0.0.1` only and answers only requests addressed to `localhost`, so a web page elsewhere cannot reach it. It reads and writes only inside the folder you gave it.

## From code

```js
import { startDesk } from '@levni/levni';
const desk = await startDesk({ dir: 'my-designs', port: 4747 });
console.log(desk.url);
// later: await desk.close();
```
