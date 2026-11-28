# Export extras

Code from `src/sequence.mjs`. All take a normal scene. Frame i of N is drawn at `t = i / N`, so the loop closes.

```js
import { writeFrames, spriteSheet, toMp4, ffmpegAvailable, transparent, tileable, tileCheck } from '@levni/levni';
```

## writeFrames
Writes `frame-0001.png` ... and `frames.json` (`{ fps, frames, width, height, loop: true, files }`). Returns that manifest.
```js
const m = await writeFrames(scene, 'public/hero', { frames: 24, fps: 12, boil: 3, width: 960 });
// m.files -> ['frame-0001.png', ...]
```

## spriteSheet
One PNG grid of all frames plus `<out>.json` in the TexturePacker JSON-hash layout (`frames` keyed by name, each with `frame {x,y,w,h}`, `rotated`, `trimmed`, `spriteSourceSize`, `sourceSize`; and `meta`). Phaser's `load.atlas()` takes it; Pixi and Godot importers read the same layout.
```js
await spriteSheet(scene, 'hero-sheet.png', { frames: 8, fps: 12, width: 256, columns: 4 });
// writes hero-sheet.png and hero-sheet.png.json
```
Phaser: `this.load.atlas('hero', 'hero-sheet.png', 'hero-sheet.png.json')`.

## toMp4
Pipes PNG frames to the `ffmpeg` on PATH: H.264, yuv420p, even size, `+faststart`. Without ffmpeg it throws an Error that says so (`brew install ffmpeg`); nothing else is affected.
```js
if (ffmpegAvailable()) await toMp4(scene, 'hero.mp4', { frames: 48, fps: 24, loops: 3, crf: 20 });
```
Transparent WebM is not supported.

## transparent
Returns a copy of the scene that renders on a clear ground: `background: "none"`, `finish: "soft"`, `grain: 0`. The default crayon finish cannot be fully clear: it always adds a faint paper layer, so even with `background: "none"` the empty area stays at about 3 % alpha (measured: 8 of 255). Do not combine it with `screen`.
```js
await render(transparent(scene), 'sticker.png');
```

## tileCheck and tileable
`tileCheck(png)` returns `{ seamX, seamY }`: the colour step across the wrap edge divided by the typical step between neighbouring columns/rows. About 1 or below tiles; above 1.5 shows a seam.
`tileable(scene, { size: 512 })` renders a square, wraps it by half and cross-fades the seam band. It suits textures (mesh gradients, dither fields, hatch, grain), not pictures with objects: those come out ghosted.
```js
const png = await tileable(scene, { size: 512 });
console.log(await tileCheck(png)); // { seamX: ~1, seamY: ~1 }
```

## Recipe: Levni frames in Remotion
Write the frames into `public/`, then step through them with the frame counter ([`<Img>`](https://www.remotion.dev/docs/img), [`useCurrentFrame`](https://www.remotion.dev/docs/use-current-frame)). Use `<Img>`, not `<img>`, so Remotion waits for the image before it renders.
```bash
node -e "import('@levni/levni').then(m => m.writeFrames(JSON.parse(require('fs').readFileSync('scene.json')), 'public/levni', { frames: 24, fps: 12 }))"
```
```tsx
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import manifest from '../public/levni/frames.json';

export const LevniLoop: React.FC = () => {
  const frame = useCurrentFrame();
  // Levni's fps is 12; the composition may run at 30. Hold each image for fps_comp / 12 frames.
  const i = Math.floor(frame / (30 / manifest.fps)) % manifest.frames;
  return (
    <AbsoluteFill>
      <Img src={staticFile(`levni/${manifest.files[i]}`)} />
    </AbsoluteFill>
  );
};
```
Set the composition's `width`/`height` to the manifest's.

## Recipe: a Levni texture in Blender or three.js
Render a seamless square, save it, use it as a repeating colour map.
```js
import { writeFileSync } from 'node:fs';
writeFileSync('paper.png', await tileable(scene, { size: 1024 }));
```
three.js:
```js
const tex = new THREE.TextureLoader().load('paper.png');
tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
tex.colorSpace = THREE.SRGBColorSpace;
tex.repeat.set(4, 4);
```
Blender: Image Texture node (Extension: Repeat) into Base Color, with a Mapping node to scale.
