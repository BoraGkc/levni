// OpenRouter adapter: the Jev typed-decision endpoint. Scores are ordered levels, returned as 0..3.
// Env: OPENROUTER_API_KEY (never printed). Model: options.model, else LEVNI_JUDGE_MODEL, else ~typesafe/jev-latest.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';

export const ENDPOINT = 'https://openrouter.ai/api/alpha/decisions';
export const DEFAULT_MODEL = '~typesafe/jev-latest';

// level 0 -> 3; the order matters, the wording is yours to change via options.levels
export const LEVELS = [
  'weak: the idea does not read, or it is a cliche, or the craft is broken',
  'middling: it reads but is ordinary or flawed',
  'good: clear, specific to the brief, clean',
  'very good: strong at a glance, original, ready to publish',
];

const STYLE = 'Editorial illustration. A good image: the idea reads in a second, it is specific to the brief (not a pile of stock icons), the main object is large and fully visible, the craft is clean, the composition balanced.';

// small JPEG data URLs keep the request light; accepts a path, a Buffer or a data: URL
async function toDataUrl(image) {
  if (typeof image === 'string' && image.startsWith('data:')) return image;
  const buf = Buffer.isBuffer(image) ? image : await readFile(image);
  const jpg = await sharp(buf).resize(800, null, { withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
}

export function openrouter(options = {}) {
  const {
    model = process.env.LEVNI_JUDGE_MODEL || DEFAULT_MODEL,
    endpoint = ENDPOINT,
    style = STYLE,
    levels = LEVELS,
    concurrency = 3,
    fetch: fetchImpl = (...a) => globalThis.fetch(...a),
    apiKey,
  } = options;

  async function decide(state, questions) {
    const key = apiKey || process.env.OPENROUTER_API_KEY;
    if (!key) throw new Error('OPENROUTER_API_KEY is not set');
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ model, state, questions }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`openrouter ${res.status}: ${JSON.stringify(json).slice(0, 300)}`);
    return json;
  }

  async function score(image, { brief = '' } = {}) {
    const out = await decide(
      [`${style} Brief: ${brief}.`, { type: 'image_url', image_url: { url: await toDataUrl(image) } }],
      { score: { type: 'score', instructions: 'How good is this image for this brief?', criteria: levels } },
    );
    const a = out?.answers?.score;
    if (!a || !Number.isFinite(a.score)) throw new Error('openrouter: response has no answers.score');
    const parts = [];
    if (Number.isFinite(a.confidence)) parts.push(`confidence ${a.confidence.toFixed(2)}`);
    const why = a.reasoning ?? a.rationale ?? a.notes;
    if (why) parts.push(String(why));
    return { score: Math.min(3, Math.max(0, a.score)), notes: parts.join('; ') };
  }

  // batch: many images, a few requests in flight, results in input order
  async function scoreMany(images, opts = {}) {
    const results = new Array(images.length);
    let next = 0;
    const worker = async () => { while (next < images.length) { const i = next++; results[i] = await score(images[i], opts); } };
    await Promise.all(Array.from({ length: Math.min(concurrency, images.length) }, worker));
    return results;
  }

  return { name: `openrouter:${model}`, score, scoreMany };
}

export default openrouter;
