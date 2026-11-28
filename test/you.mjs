// you: stats from GitHub JSON, a scene that composes and moves, themes, and odd input.
// Usage: node test/you.mjs
import assert from 'node:assert/strict';
import { compose, youStats, youScene, youTerms, YOU_THEMES } from '../src/index.mjs';

const user = { login: 'ada', name: 'Ada L', followers: 1234, public_repos: 3, created_at: '2015-04-01T00:00:00Z' };
const repos = [
  { name: 'engine', stargazers_count: 900, language: 'Rust', topics: ['rocket'] },
  { name: 'notes', stargazers_count: 10, language: 'Rust' },
  { name: 'forked', stargazers_count: 5000, fork: true, language: 'Go' },
];
const s = youStats(user, repos);
assert.equal(s.stars, 910, 'forks do not count');
assert.equal(s.language, 'Rust');
assert.equal(s.since, 2015);
assert.deepEqual(s.top.map((r) => r.name), ['engine', 'notes']);
assert.ok(youTerms(s).includes('rocket'));
for (const theme of YOU_THEMES) {
  const scene = youScene(s, { theme, mark: 'rocket' });
  const a = (await compose({ ...scene, t: 0.1 })).svg, b = (await compose({ ...scene, t: 0.9 })).svg;
  assert.ok(!/NaN|undefined/.test(b), theme);
  assert.notEqual(a, b, `${theme}: moves`);
}
const empty = youScene(youStats({ login: 'x' }, []), {});
assert.ok(!/NaN|undefined/.test((await compose({ ...empty, t: 0.9 })).svg), 'a brand-new account still draws');
console.log('you: stats, themes, motion and an empty account ok');
