# Ghost adapter

Attach Levni images to [Ghost](https://ghost.org) **drafts**: a cover (feature image) and inline images placed after chosen `h2` headings. Dry run by default.

```bash
export GHOST_ADMIN_API_URL=https://your-site.example
export GHOST_ADMIN_API_KEY=<id>:<secret>      # Ghost Admin > Settings > Integrations > Custom integration

npx levni ghost drafts                 # list drafts that have no images at all
npx levni ghost drafts --apply         # also pull them to ./levni-drafts/<name>/ (article.md + meta.json)
npx levni ghost attach plan.json       # dry run: print the planned edits
npx levni ghost attach plan.json --apply
```

Credentials come from the environment only; nothing is read from or written to files. Without them the command prints usage and exits 1.

## What it will and will not touch

- Only posts with `status: draft`. Published and scheduled posts are skipped.
- A draft that already has a feature image or any inline image is left alone (`drafts` does not even list it).
- Deleted or missing posts are skipped with a note.
- The update sends only `lexical`, `feature_image`, `feature_image_alt` and `updated_at` (so a concurrent edit makes Ghost refuse the write). It never changes the status, never publishes and never sends a newsletter or email.
- Never two images in one section (a section runs from one `h2` to the next). A plan that asks for it, or names a heading that is not found or is ambiguous, is **refused for that post**: nothing is uploaded or written for it, and the CLI exits 1.
- Each inline image goes after its heading and that heading's first paragraph, and never past the end of the section.

## Heading match

The `after` text is compared with the post's `h2` headings ignoring case and extra whitespace, and treating curly and straight quotes as equal. If there is no exact match, a unique heading that starts with the same first 20 characters is accepted (when `after` has at least 8 characters).

## Plan file

```json
{
  "posts": [
    {
      "id": "64f0c0ffee0123456789abcd",
      "cover": { "scene": "scenes/rocket-cover.json", "alt": "A rocket over a blue panel" },
      "inline": [
        { "scene": "scenes/audience.json", "alt": "An audience seen from behind", "after": "Why people watch" },
        { "image": "art/chart.webp", "alt": "Hand-drawn chart", "after": "What the numbers say" }
      ]
    }
  ]
}
```

| field | meaning |
| --- | --- |
| `posts[].id` | Ghost post id (`meta.json` from `levni ghost drafts --apply` has it) |
| `cover` | optional; `scene` is a Levni scene file (or an inline scene object) rendered to WebP on `--apply`; `image` is a ready webp/png/jpg instead. `alt` becomes `feature_image_alt` |
| `inline[]` | optional; same `scene` or `image`, plus `alt` and `after`, the text of the `h2` it follows |

Relative paths are resolved from the plan file's folder. A scene is rendered with the normal Levni engine, so the critic and styles work as usual. Give every image alt text.

## From code

```js
import { createClient, attachPost, attachPlan, pullDrafts } from 'levni/adapters/ghost';
```

`attachPost(client, entry, { apply, baseDir })` returns `{ status, edits, notes }` where status is `planned`, `applied`, `skipped` or `refused`. `createClient({ url, key, fetch })` accepts a custom `fetch` (the tests use a mock; `npm run test:ghost`).

## Not verified against a live site

The adapter is tested against a mocked Ghost API (Admin API v5, Lexical editor format). Try a dry run on a test site first. Posts written with the older mobiledoc editor have no `lexical` and are not supported.
