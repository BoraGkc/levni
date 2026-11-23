// Pluggable image judge. An adapter is { name?, score(image, {brief}) -> {score 0..3, notes},
// scoreMany?(images, {brief}) -> [{score, notes}] }. `image` is a file path, a Buffer or a data: URL.
// pick() never asks a model "which is best" (position bias): it scores each image twice, in two
// independently shuffled orders, and averages. Gaps under TIE are noise and reported as ties.
import { openrouter } from './openrouter.mjs';

export const TIE = 0.15;
export const PASSES = 2;

const round = (n) => Math.round(n * 1000) / 1000;

function shuffled(n, rng) {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function check(adapter) {
  if (!adapter || typeof adapter.score !== 'function') throw new Error('judge adapter needs a score(image, {brief}) function');
  return adapter;
}

function clean(r) {
  if (!r || !Number.isFinite(r.score)) throw new Error('judge adapter returned no numeric score');
  return { score: Math.min(3, Math.max(0, r.score)), notes: r.notes ?? '' };
}

export async function score(image, { brief = '', adapter = openrouter() } = {}) {
  const r = clean(await check(adapter).score(image, { brief }));
  return { score: r.score, notes: r.notes };
}

export async function pick(images, { brief = '', adapter = openrouter(), passes = PASSES, tie = TIE, rng = Math.random } = {}) {
  check(adapter);
  if (!Array.isArray(images) || images.length < 2) throw new Error('pick needs at least two images');
  const runs = images.map(() => []); // runs[i] = [{score, notes}, ...]
  for (let p = 0; p < passes; p++) {
    const order = shuffled(images.length, rng);
    const batch = order.map((i) => images[i]);
    const res = typeof adapter.scoreMany === 'function'
      ? await adapter.scoreMany(batch, { brief })
      : await sequential(adapter, batch, brief);
    if (!Array.isArray(res) || res.length !== batch.length) throw new Error('scoreMany must return one result per image');
    order.forEach((i, k) => runs[i].push(clean(res[k])));
  }
  const scores = runs.map((r) => round(r.reduce((s, x) => s + x.score, 0) / r.length));
  const best = Math.max(...scores);
  const index = scores.indexOf(best);
  const tied = scores.map((s, i) => (best - s <= tie ? i : -1)).filter((i) => i >= 0);
  const spread = runs.map((r) => Math.max(...r.map((x) => x.score)) - Math.min(...r.map((x) => x.score)));
  const notes = [];
  if (tied.length > 1) notes.push(`tie: images ${tied.join(', ')} are within ${tie} of the top score (${best}); the difference is noise, choose by other means. index ${index} is only the first of them`);
  else notes.push(`image ${index} leads by ${round(best - Math.max(...scores.filter((_, i) => i !== index)))} (ties are under ${tie})`);
  spread.forEach((s, i) => { if (s > 1) notes.push(`image ${i}: the two passes disagree by ${round(s)}; treat its score as unreliable`); });
  runs.forEach((r, i) => { const t = r.map((x) => x.notes).filter(Boolean).join(' | '); if (t) notes.push(`image ${i}: ${t}`); });
  return { index, tie: tied.length > 1, tied, scores, notes };
}

async function sequential(adapter, batch, brief) {
  const out = [];
  for (const img of batch) out.push(await adapter.score(img, { brief }));
  return out;
}

export { openrouter };
