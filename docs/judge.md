# Judge

A judge rates an image against a brief. It is optional and separate from rendering: Levni draws, a judge says how well the picture answers the brief, and an agent decides what to do with that.

```bash
export OPENROUTER_API_KEY=...             # from your environment, never a file in the repo
npx levni judge score cover.png --brief "why remote teams stall"
npx levni judge pick a.png b.png c.png --brief "why remote teams stall"
```

Both print JSON. Optional: `--model <id>` or `LEVNI_JUDGE_MODEL` (default `~typesafe/jev-latest`).

```js
import { score, pick } from 'levni/judge';
const { score: s, notes } = await score('cover.png', { brief: '...' });
const { index, tie, tied, scores, notes: n } = await pick(['a.png', 'b.png'], { brief: '...' });
```

## Interface

An adapter is a plain object:

```js
{
  name: 'my-judge',                                  // optional, for logs
  async score(image, { brief }) { return { score, notes } },   // required. score: number 0..3
  async scoreMany(images, { brief }) { return [{ score, notes }, ...] } // optional batch, same order as input
}
```

- `image` is a file path, a `Buffer`, or a `data:` URL.
- `score` is 0 (weak) to 3 (very good); values outside are clamped. `notes` is free text (empty is fine).
- `scoreMany` is used by `pick` when present (one request budget, concurrency inside the adapter). Without it, `pick` calls `score` one image at a time.
- `score(image, { brief, adapter })` and `pick(images, { brief, adapter, passes = 2, tie = 0.15, rng })` accept your adapter; the default is `openrouter()`.
- `pick` returns `{ index, tie, tied, scores, notes }`. `scores` are averages per image, in input order.

## Write an adapter

```js
// my-judge.mjs
export const myJudge = () => ({
  name: 'my-judge',
  async score(image, { brief }) {
    const res = await fetch(process.env.MY_JUDGE_URL, { method: 'POST', body: /* image + brief */ });
    const { rating, why } = await res.json();
    return { score: rating, notes: why };
  },
});
// await pick(images, { brief, adapter: myJudge() })
```

Read keys from the environment, never print them, and throw on HTTP errors so a failed call is never mistaken for a low score. Test with a mocked `fetch`, as `test/judge.mjs` does.

## OpenRouter adapter

`src/judge/openrouter.mjs` calls OpenRouter's typed decision endpoint with one `score` question whose four criteria are ordered levels (weak, middling, good, very good). Options: `model`, `style` (house-style text in the prompt), `levels`, `concurrency` (batch, default 3), `endpoint`, `apiKey`, `fetch`. Images are sent as 800 px JPEG data URLs. The default style text is generic; set `style` to describe your own house look, because the judge is only as good as that description.

## Lessons

- **A direct "which is best" prompt has position bias.** Models lean toward the first or the last image. So `pick` never asks it. It scores each image on its own, twice, in two independently shuffled orders, and averages.
- **Noise is about 0.15.** Repeated scores of the same image move by that much. `pick` treats anything within 0.15 of the top score as a tie, sets `tie: true`, lists the `tied` indexes, and says so in `notes`. Do not read a winner into a tie; break it with a rule of your own (cheaper, newer, an art director). If the two passes of one image differ by more than 1, `notes` flags that score as unreliable.
- **Judges score calm or sensitive-topic images low.** Quiet, restrained pictures for grief, health, law or finance stories come out as "ordinary". A low score there is not a reject signal. Do not auto-reject on score alone; use it to rank among candidates, and send low scorers on sensitive topics to a human.
- A score is relative to the brief and the style text. Compare scores only within one brief and one model.
