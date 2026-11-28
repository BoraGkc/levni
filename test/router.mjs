// Design Router: one ranked search over drawings, icons, fonts, palettes, patterns, motion and shots, with licences,
// paste-ready snippets and previews in your colours.
import assert from 'node:assert/strict';
import { catalog, route, routeScene, inksFrom, ROUTE_KINDS, PATTERN_LIST } from '../src/router.mjs';
import { routeDesign } from '../src/route.mjs';
import { compose } from '../src/compose.mjs';

const props = [
  { name: 'coffee-cup', category: 'food', tags: ['coffee', 'kahve', 'cup'], variants: ['cup, hand drawn'] },
  { name: 'cat', category: 'nature', tags: ['cat', 'kedi', 'pet'], variants: ['line icon redrawn from Tabler Icons (MIT)'] },
  { name: 'cathedral', category: 'places', tags: ['cathedral', 'church'], variants: [''] },
];
const cat = catalog({ props, icons: ['coffee', 'cat'] });
assert.deepEqual([...new Set(cat.map((e) => e.kind))], ROUTE_KINDS, 'every kind is in the catalogue');

// a thing: the drawing first, with its licence and a snippet that names it
let r = route('coffee', cat);
assert.equal(r.results[0].kind, 'drawing');
assert.equal(r.results[0].id, 'coffee-cup');
assert.equal(r.results[0].license, 'CC BY 4.0');
assert.deepEqual(r.results[0].snippet.name, 'coffee-cup');
assert.equal(route('cat', cat).results.find((x) => x.kind === 'drawing').license, 'MIT (redrawn from Tabler Icons)');
assert.ok(!route('cat', cat).results.some((x) => x.id === 'cathedral'), 'a short word does not prefix-match longer names');
assert.equal(route('kedi', cat).results[0].id, 'cat', 'Turkish tags work');

// a kind word narrows the search; alone, it lists the kind
assert.deepEqual(route('headline font', cat).results.map((x) => x.id), ['black']);
assert.equal(route('patterns', cat).results.length, PATTERN_LIST.length);
assert.ok(route('dots', cat).results.some((x) => x.id === 'halftone'));
assert.equal(route('float', cat).results[0].kind, 'motion');
assert.deepEqual(route('coffee', cat, { kinds: ['icon'] }).results.map((x) => x.kind), ['icon']);
assert.equal(route('zzzz', cat).results.length, 0);

// your colours become inks: blue, coral, mustard, green in order, each with a light tone
const inks = inksFrom(['#E8522F', '1E1466']);
assert.equal(inks.blue, '#E8522F');
assert.equal(inks.coral, '#1E1466');
assert.match(inks.tone, /^#[0-9A-F]{6}$/);
assert.equal(inksFrom(['nope']), null);

// every kind's preview draws (icons need Tabler installed, so they are left to the CLI)
for (const e of cat.filter((x) => x.kind !== 'icon')) {
  const { svg } = await compose(routeScene(e, { colors: ['#E8522F', '#1E1466'] }));
  assert.ok(svg.startsWith('<svg') && !/NaN|undefined/.test(svg), `${e.kind} ${e.id}`);
}
// a palette shows its own inks even when you pass colours
assert.equal(routeScene(cat.find((x) => x.id === 'forest'), { colors: ['#000000'] }).style.green, '#2F8F4E');

// on disk: the real Folio
const disk = routeDesign('rocket', { limit: 3 });
assert.equal(disk.results[0].id, 'rocket');
assert.ok(disk.results[0].scene.elements.length);
console.log(`router: ${cat.length} entries in the test catalogue, ranking, kind words, inks and previews ok`);
