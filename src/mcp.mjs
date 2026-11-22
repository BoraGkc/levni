// Levni as an MCP server over stdio (newline-delimited JSON-RPC 2.0). No SDK dependency: the protocol
// surface Levni needs is small (initialize, ping, tools/list, tools/call).
//   npx levni mcp
// Tools: scene_guide, list_props, render_scene, critique_scene, show_props.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { createInterface } from 'node:readline';
import sharp from 'sharp';
import { compose } from './compose.mjs';
import { critique } from './critic.mjs';
import { loadProps, findProp } from './props.mjs';
import { toPng, toWebp } from './export.mjs';
import { CATEGORIES } from './validate.mjs';

const PROTOCOLS = ['2025-06-18', '2025-03-26', '2024-11-05'];
const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const GUIDE = new URL('../docs/scene.md', import.meta.url);

const scene = { type: 'object', description: 'A Levni scene: { seed?, style?, background?, elements: [...] }. Canvas is 1200 x 673. `style` is \"riso\", \"miniature\" or your own inks, e.g. {\"blue\":\"#6A1B9A\",\"mustard\":\"#00BFA5\"}. Call scene_guide for every element type.' };
export const TOOLS = [
  {
    name: 'scene_guide',
    description: 'The Levni scene format: canvas, every element type and its fields, colours, style packs. Read it once before writing scenes.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_props',
    description: 'Search the Levni Folio, a library of hand-inked drawings (props) that scenes place by name. Matches names, tags (English and Turkish) and variant notes. Returns name, variant count, tags and what each variant shows.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'One or more words, e.g. "cat", "money", "film camera". Empty lists everything.' },
        category: { type: 'string', enum: Object.keys(CATEGORIES), description: 'Only one shelf of the library.' },
        limit: { type: 'integer', description: 'Maximum results (default 40).' },
      },
    },
  },
  {
    name: 'render_scene',
    description: 'Draw a scene. Returns the layout critic\'s notes (off-canvas elements, accidental crops, lopsided weight, missing focal point) and a small preview image. With `out`, also writes the full-size file (.png, .webp under a size budget, or .svg).',
    inputSchema: {
      type: 'object',
      properties: {
        scene,
        out: { type: 'string', description: 'File path to write, relative to the server\'s working directory. Extension picks the format.' },
        preview: { type: 'boolean', description: 'Return a 560 px preview image (default true). Set false for agents that cannot see images.' },
      },
      required: ['scene'],
    },
  },
  {
    name: 'critique_scene',
    description: 'Only the layout critic\'s notes for a scene, without writing or returning an image. Fast check while iterating.',
    inputSchema: { type: 'object', properties: { scene }, required: ['scene'] },
  },
  {
    name: 'show_props',
    description: 'Contact image of up to 12 props with every variant numbered, to choose a drawing by eye.',
    inputSchema: {
      type: 'object',
      properties: { names: { type: 'array', items: { type: 'string' }, description: 'Prop names from list_props.' } },
      required: ['names'],
    },
  },
];

const text = (t) => ({ type: 'text', text: t });
const image = (buf) => ({ type: 'image', data: buf.toString('base64'), mimeType: 'image/png' });
const asScene = (s) => (typeof s === 'string' ? JSON.parse(s) : s);
const notesText = (notes) => (notes.length ? notes.map((n) => `- ${n}`).join('\n') : '- critic: no layout problems found');
const preview = async (svg, width = 560) => sharp(Buffer.from(svg)).resize(width).png({ compressionLevel: 9, palette: true }).toBuffer();

async function call(name, args = {}) {
  if (name === 'scene_guide') return [text(readFileSync(GUIDE, 'utf8'))];

  if (name === 'list_props') {
    const words = String(args.query || '').toLowerCase().split(/\s+/).filter(Boolean);
    const all = Object.values(loadProps()).sort((a, b) => a.name.localeCompare(b.name));
    const hits = all.filter((p) => !args.category || p.category === args.category).filter((p) => {
      const hay = [p.name, ...(p.tags || []), ...p.variants.map((v) => v.note || '')].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const limit = Math.max(1, Math.min(Number(args.limit) || 40, 500));
    const lines = hits.slice(0, limit).map((p) =>
      `${p.name} (${p.variants.length} variant${p.variants.length > 1 ? 's' : ''}) [${p.category || 'other'}] tags: ${(p.tags || []).join(', ')}\n` +
      p.variants.map((v, i) => `   ${i}: ${v.note || ''}`).join('\n'));
    const more = hits.length > limit ? `\n…and ${hits.length - limit} more; narrow the query.` : '';
    return [text(`${hits.length} of ${all.length} props match.\n${lines.join('\n')}${more}\nPlace one with { "type": "prop", "name": "<name>", "variant": <n>, "x": 600, "y": 336, "size": 300 }.`)];
  }

  if (name === 'render_scene' || name === 'critique_scene') {
    const { svg, used } = await compose(asScene(args.scene));
    const notes = critique(used);
    const out = [text(notesText(notes))];
    if (name === 'critique_scene') return out;
    if (args.out) {
      const file = resolve(String(args.out));
      const ext = extname(file).toLowerCase();
      if (!['.png', '.webp', '.svg'].includes(ext)) throw new Error('out must end in .png, .webp or .svg');
      mkdirSync(dirname(file), { recursive: true });
      if (ext === '.svg') writeFileSync(file, svg);
      else if (ext === '.webp') await toWebp(svg, file);
      else await toPng(svg, file);
      out.push(text(`wrote ${file}`));
    }
    if (args.preview !== false) out.push(image(await preview(svg)));
    return out;
  }

  if (name === 'show_props') {
    const names = (args.names || []).slice(0, 12);
    const cells = [];
    const missing = [];
    for (const n of names) {
      const p = findProp(n);
      if (!p) { missing.push(n); continue; }
      p.variants.forEach((_, i) => cells.push({ name: p.name, i }));
    }
    if (!cells.length) throw new Error(`no such props: ${missing.join(', ')}`);
    const shown = cells.slice(0, 18); // one 6 x 3 canvas
    const elements = shown.flatMap((c, k) => {
      const x = 100 + (k % 6) * 200, y = 120 + Math.floor(k / 6) * 210;
      return [
        { type: 'prop', name: c.name, variant: c.i, x, y, size: 140 },
        { type: 'label', text: `${c.name} ${c.i}`, x, y: y + 92, size: 17, color: 'ink', anchor: 'middle' },
      ];
    });
    const { svg } = await compose({ seed: 3, elements }).catch(() =>
      compose({ seed: 3, elements: elements.filter((e) => e.type === 'prop') }));
    const extra = cells.length > shown.length ? ` (first 18 of ${cells.length} variants shown)` : '';
    const miss = missing.length ? ` Unknown: ${missing.join(', ')}.` : '';
    return [text(`${shown.map((c) => `${c.name} ${c.i}`).join(', ')}${extra}.${miss}`), image(await preview(svg, 900))];
  }

  throw new Error(`unknown tool: ${name}`);
}

export async function handle(msg) {
  const { id, method, params = {} } = msg;
  const ok = (result) => ({ jsonrpc: '2.0', id, result });
  if (method === 'initialize') {
    const v = PROTOCOLS.includes(params.protocolVersion) ? params.protocolVersion : PROTOCOLS[0];
    return ok({
      protocolVersion: v,
      capabilities: { tools: {} },
      serverInfo: { name: 'levni', version: VERSION },
      instructions: 'Levni draws hand-inked illustrations from a JSON scene. Read scene_guide once, find drawings with list_props, then render_scene and fix what the critic reports.',
    });
  }
  if (method === 'ping') return ok({});
  if (method === 'tools/list') return ok({ tools: TOOLS });
  if (method === 'tools/call') {
    try {
      return ok({ content: await call(params.name, params.arguments) });
    } catch (err) {
      return ok({ content: [text(`levni: ${err.message}`)], isError: true });
    }
  }
  if (id === undefined) return null; // notifications (initialized, cancelled, …) need no answer
  return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } };
}

export function serve() {
  // stdout carries the protocol only; anything the engine logs goes to stderr
  console.log = (...a) => console.error(...a);
  const send = (m) => m && process.stdout.write(`${JSON.stringify(m)}\n`);
  const rl = createInterface({ input: process.stdin });
  rl.on('line', async (line) => {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); }
    send(await handle(msg));
  });
}
