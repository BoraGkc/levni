// Levni public API.
//   import { compose, critique, render } from 'levni';
//   const { svg, used, canvas } = await compose(scene);       // SVG string + boxes for the critic
//   await render(scene, 'out.png');                   // or out.webp / out.svg
export { compose, critique, COLORS } from './compose.mjs';
export { PALETTE, W, H, rng, frame } from './style.mjs';
export { loadProps, findProp, expandProp, addPropDir, LIBRARY_DIR } from './props.mjs';
export { expandIso } from './iso.mjs';
export { ASSETS } from './assets.mjs';
export { FORMATS, resolveCanvas } from './formats.mjs';
export { toWebp, toPng } from './export.mjs';
export { bayer, screenRaster, SCREEN_PRESETS } from './dither.mjs';
export { renderPosters, expandPosters, TEMPLATES as POSTER_TEMPLATES } from './poster.mjs';
export { FONTS, layoutType } from './type.mjs';
export { STYLES, applyStyle } from './styles.mjs';
export { validateProp, lintProp, parseProps, measureVariant, CATEGORIES } from './validate.mjs';
export { iconsAvailable, resolveIcon } from './icon.mjs';
export { renderBoard } from './board.mjs';
export { expandBrand } from './board.mjs';

import { writeFileSync } from 'node:fs';
import { compose } from './compose.mjs';
import { critique } from './critic.mjs';
import { toPng, toWebp } from './export.mjs';

// Compose a scene and write it as .png, .webp or .svg. Returns the critic's notes.
export async function render(scene, out, opts = {}) {
  const { svg, used, canvas } = await compose(scene);
  if (/\.svg$/i.test(out)) writeFileSync(out, svg);
  else if (/\.webp$/i.test(out)) await toWebp(svg, out, { ...opts.webp, screen: scene.screen });
  else await toPng(svg, out, { preview: !!opts.preview, screen: scene.screen });
  return { notes: critique(used, canvas), svg };
}
