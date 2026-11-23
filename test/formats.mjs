// Formats and title: the five presets compose at their size, an old scene is unchanged, a title lays out.
import { readFileSync } from 'node:fs';
import { compose, FORMATS } from '../src/index.mjs';
import { critique } from '../src/critic.mjs';

const scene = JSON.parse(readFileSync(new URL('../examples/spot.json', import.meta.url), 'utf8'));
const errors = [];
const check = (ok, msg) => { if (!ok) errors.push(msg); };

// old scene: the default canvas, no reflow machinery in the output
const base = await compose(scene);
check(/width="1200" height="673" viewBox="0 0 1200 673"/.test(base.svg), 'default canvas is not 1200x673');
check(!base.svg.includes('levni-title') && !/scale\(/.test(base.svg.split('<g filter')[0]), 'default scene gained layout markup');
const again = await compose({ ...scene, format: 'cover' });
check(again.svg === base.svg, 'format "cover" is not byte-identical to no format');

for (const [name, [w, h]] of Object.entries(FORMATS)) {
  for (const reflow of [false, true]) {
    const r = await compose({ ...scene, format: name, reflow, title: { text: 'A headline that wraps over a couple of lines', kicker: 'Test', brand: 'levni.dev', position: name === 'story' ? 'band' : 'bottom' } });
    check(r.svg.includes(`width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"`), `${name}: wrong canvas`);
    check(!/NaN|undefined|Infinity/.test(r.svg), `${name}: bad number in svg`);
    check(r.svg.includes('levni-title'), `${name}: title missing`);
    check(Array.isArray(critique(r.used, r.canvas)), `${name}: critic failed`);
  }
}
const c = await compose({ ...scene, canvas: [800, 400] });
check(c.svg.includes('width="800" height="400"'), 'explicit canvas ignored');
let threw = false; try { await compose({ ...scene, format: 'nope' }); } catch { threw = true; }
check(threw, 'unknown format did not throw');

if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('formats ok');
