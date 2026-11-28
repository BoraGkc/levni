// README banners: mark picking from repo words, and a scene that composes on the 1280 × 640 canvas.
import assert from 'node:assert/strict';
import { compose, loadProps } from '../src/index.mjs';
import { bannerScene, pickMark, repoTerms, hashSeed, BANNER_THEMES, repoBanner } from '../src/banner.mjs';

const index = Object.values(loadProps());

// topics win, plural topics match, stopwords never match
assert.equal(pickMark(['rocket'], index)[0], 'rocket');
assert.ok(pickMark(['rockets'], index).includes('rocket'));
assert.deepEqual(pickMark(['the', 'and', 'using'], index), []);
const terms = repoTerms({ topics: ['search-engine'], name: 'my_tool', description: 'Get up and running fast', language: 'Rust' });
assert.ok(terms.includes('search') && terms.includes('engine') && terms.includes('rust'));
assert.ok(!terms.includes('running') && !terms.includes('fast'));

// the scene: canvas, seed from the name, every theme composes, the credit can go
const repo = { owner: 'o', name: 'demo', description: 'A small demo of a very long description that has to wrap onto more than three lines so it ends with an ellipsis somewhere', stars: 12345, language: 'Go', languageColor: '#00ADD8', mark: 'rocket' };
const s = bannerScene(repo);
assert.deepEqual(s.canvas, [1280, 640]);
assert.equal(s.seed, hashSeed('o/demo'));
assert.equal(bannerScene(repo).seed, s.seed, 'same repo, same seed');
const desc = s.elements.find((e) => e.type === 'type' && e.size === 32);
assert.ok(desc.text.split('\n').length <= 3 && desc.text.endsWith('…'));
assert.ok(s.elements.some((e) => e.text === '12.3k stars   Go'));
assert.ok(!bannerScene({ ...repo, credit: false }).elements.some((e) => e.text === 'levni.dev'));
assert.ok(!bannerScene({ ...repo, stars: 0 }).elements.some((e) => /stars/.test(e.text || '')));
assert.throws(() => bannerScene({ name: ' ' }), /name/);
for (const theme of Object.keys(BANNER_THEMES)) {
  const { svg } = await compose(bannerScene({ ...repo, theme }));
  assert.match(svg, /width="1280" height="640"/);
}
console.log('banner ok');

// a repo straight from the GitHub API: owner, name, stars, a mark from its topics, motion on request
const gh = { full_name: 'acme/rocket-launcher', name: 'rocket-launcher', owner: { login: 'acme' }, description: 'Launch things', stargazers_count: 1200, language: 'Go', topics: ['rocket'] };
const rb = repoBanner(gh, index, { motion: true });
assert.equal(rb.elements.find((e) => e.type === 'prop').name, 'rocket');
assert.ok(JSON.stringify(rb).includes('ACME /') && JSON.stringify(rb).includes('motion'));
assert.ok(!JSON.stringify(repoBanner(gh, index)).includes('motion'));
console.log('repoBanner ok');
