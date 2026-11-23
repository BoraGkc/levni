// Ghost tools for the MCP server. They appear only when GHOST_ADMIN_API_URL and GHOST_ADMIN_API_KEY are set
// (in the MCP client's "env" block), so everyone else sees the five drawing tools and nothing more.
//   ghost_drafts   read-only: imageless drafts, or one draft's text and h2 headings
//   ghost_preview  dry run: where each image would go + preview images + a confirmation token
//   ghost_apply    writes, and only with the token from a preview of exactly the same plan on the unchanged draft
// Never publishes, never sends a newsletter, never touches a draft that already has images.
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { createClient, listImagelessDrafts, htmlToMarkdown, attachPost } from '../adapters/ghost/index.mjs';
import { compose } from './compose.mjs';

export const ghostEnabled = () => Boolean(process.env.GHOST_ADMIN_API_URL && process.env.GHOST_ADMIN_API_KEY);

const image = { type: 'object', description: 'Either { "scene": <Levni scene object>, "alt": "..." } or { "image": "path/to/file.webp", "alt": "..." }.' };
const plan = {
  id: { type: 'string', description: 'Ghost post id from ghost_drafts.' },
  cover: { ...image, description: 'Feature image. ' + image.description },
  inline: { type: 'array', items: { type: 'object', description: '{ "after": "<exact h2 heading text>", "scene" | "image", "alt" }' }, description: 'Inline images, each after an h2 heading (at most one per section; placed after the heading and its first paragraph).' },
};

export const GHOST_TOOLS = [
  {
    name: 'ghost_drafts',
    description: 'Ghost (read-only): list draft posts that have no images yet, with their h2 headings. With `id`, return that draft\'s full text so you can design its images.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' }, limit: { type: 'integer', description: 'Max drafts to list (default 20).' } } },
  },
  {
    name: 'ghost_preview',
    description: 'Ghost dry run: check a cover + inline image plan against a draft, render the images, and return where each one would go plus a `token`. Nothing is uploaded or changed. Show the previews to the user and get their OK before ghost_apply.',
    inputSchema: { type: 'object', properties: plan, required: ['id'] },
  },
  {
    name: 'ghost_apply',
    description: 'Ghost write: upload the images and insert them into the draft. Needs the `token` from ghost_preview for exactly the same id, cover and inline; if the plan or the draft changed, preview again. Only call after the user approved the preview. Does not publish or email.',
    inputSchema: { type: 'object', properties: { ...plan, token: { type: 'string' } }, required: ['id', 'token'] },
  },
];

const text = (t) => ({ type: 'text', text: t });
const h2s = (html) => [...String(html || '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => htmlToMarkdown(m[1]).trim());
const entryOf = (a) => ({ id: String(a.id), ...(a.cover ? { cover: a.cover } : {}), ...(a.inline?.length ? { inline: a.inline } : {}) });
const tokenOf = (entry, updatedAt) => createHash('sha256').update(JSON.stringify(entry) + '|' + updatedAt).digest('hex').slice(0, 16);

export async function callGhost(name, args = {}, { client = createClient() } = {}) {
  if (name === 'ghost_drafts') {
    if (args.id) {
      const { posts: [p] } = await client.api(`/posts/${args.id}/?formats=html&fields=id,slug,title,html,feature_image,status,updated_at`);
      const headings = h2s(p.html);
      return [text(`${p.title}\nid ${p.id} · ${p.status}${p.feature_image ? ' · HAS A COVER (will be skipped)' : ''}\nh2 headings:\n${headings.map((h) => `- ${h}`).join('\n') || '- (none)'}\n\n${htmlToMarkdown(p.html).slice(0, 12000)}`)];
    }
    const { total, imageless, withImages } = await listImagelessDrafts(client);
    const limit = Math.max(1, Math.min(Number(args.limit) || 20, 100));
    const lines = imageless.slice(0, limit).map((p) => `- ${p.title}\n  id ${p.id} · ${htmlToMarkdown(p.html).split(/\s+/).length} words · h2: ${h2s(p.html).join(' | ') || '(none)'}`);
    return [text(`${total} drafts: ${imageless.length} without images, ${withImages} with their own images (left alone).\n${lines.join('\n')}`)];
  }

  const entry = entryOf(args);
  if (!entry.cover && !entry.inline) throw new Error('give a cover, inline images, or both');
  const current = async () => (await client.api(`/posts/${entry.id}/?fields=id,updated_at`)).posts[0].updated_at;

  if (name === 'ghost_preview') {
    const r = await attachPost(client, entry, { apply: false });
    if (r.status !== 'planned') return [text(`${r.status}: ${r.notes.join('; ')}`)];
    const token = tokenOf(entry, await current());
    const out = [text(`Plan for ${entry.id}:\n${r.edits.map((e) => `- ${e}`).join('\n')}\n\ntoken: ${token}\nShow these images to the user. After they approve, call ghost_apply with the same id, cover and inline plus this token.`)];
    for (const spec of [entry.cover, ...(entry.inline || [])].filter(Boolean)) {
      if (!spec.scene) { out.push(text(`(file image: ${spec.image})`)); continue; }
      const { svg } = await compose(typeof spec.scene === 'string' ? JSON.parse(spec.scene) : spec.scene);
      out.push({ type: 'image', data: (await sharp(Buffer.from(svg)).resize(560).png({ palette: true }).toBuffer()).toString('base64'), mimeType: 'image/png' });
    }
    return out;
  }

  if (name === 'ghost_apply') {
    if (String(args.token || '') !== tokenOf(entry, await current())) throw new Error('token does not match: the plan or the draft changed since the preview. Run ghost_preview again and get the user\'s OK.');
    const r = await attachPost(client, entry, { apply: true });
    return [text(`${r.status}${r.edits.length ? `:\n${r.edits.map((e) => `- ${e}`).join('\n')}` : ''}${r.notes.length ? `\n${r.notes.join('\n')}` : ''}\nThe post stays a draft; nothing was published or emailed.`)];
  }
  throw new Error(`unknown tool: ${name}`);
}
