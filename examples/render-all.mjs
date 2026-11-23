// Re-render the README examples: node examples/render-all.mjs
import { readFileSync } from 'node:fs';
import { render } from '../src/index.mjs';

for (const name of ['cover', 'spot', 'room', 'chart-inflation', 'people', 'slots-tv', 'slots-lens', 'soft3d-auto-aqua', 'soft3d-auto-night', 'soft3d-mobius', 'soft3d-tori', 'soft3d-icons']) {
  const url = new URL(`./${name}.json`, import.meta.url);
  const { notes } = await render(JSON.parse(readFileSync(url, 'utf8')), new URL(`./${name}.png`, import.meta.url).pathname);
  console.log(`${name}.png`, notes.length ? notes.join('; ') : 'ok');
}
