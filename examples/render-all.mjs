// Re-render the README examples: node examples/render-all.mjs
import { readFileSync } from 'node:fs';
import { render } from '../src/index.mjs';

for (const name of ['cover', 'spot', 'room', 'chart-inflation', 'people']) {
  const url = new URL(`./${name}.json`, import.meta.url);
  const { notes } = await render(JSON.parse(readFileSync(url, 'utf8')), new URL(`./${name}.png`, import.meta.url).pathname);
  console.log(`${name}.png`, notes.length ? notes.join('; ') : 'ok');
}
