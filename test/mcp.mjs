// MCP server test: starts `levni mcp` as a client would and walks the handshake and every tool.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { existsSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const bin = new URL('../bin/levni.mjs', import.meta.url).pathname;
const child = spawn(process.execPath, [bin, 'mcp'], { stdio: ['pipe', 'pipe', 'inherit'] });
const waiting = new Map();
createInterface({ input: child.stdout }).on('line', (line) => {
  const m = JSON.parse(line); // every stdout line must be JSON-RPC
  waiting.get(m.id)?.(m);
});
let next = 1;
const rpc = (method, params) => new Promise((res) => {
  const id = next++;
  waiting.set(id, res);
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
});
const tool = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result;

const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } });
assert.equal(init.result.protocolVersion, '2025-06-18');
assert.equal(init.result.serverInfo.name, 'levni');
child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);

const names = (await rpc('tools/list')).result.tools.map((t) => t.name);
assert.deepEqual(names, ['scene_guide', 'list_props', 'render_scene', 'critique_scene', 'show_props']);

assert.match((await tool('scene_guide')).content[0].text, /# Scene format/);
assert.match((await tool('list_props', { query: 'cat' })).content[0].text, /^cat \(/m);
const food = (await tool('list_props', { category: 'food' })).content[0].text;
assert.match(food, /^bread \(.*\[food\]/m);
assert.doesNotMatch(food, /^cat \(/m);

const dir = mkdtempSync(join(tmpdir(), 'levni-mcp-'));
const scene = { seed: 5, elements: [{ type: 'prop', name: 'rocket', x: 600, y: 336, size: 360 }] };
const r = await tool('render_scene', { scene, out: join(dir, 'cover.webp') });
assert.ok(!r.isError, r.content[0].text);
assert.equal(r.content.at(-1).type, 'image');
assert.ok(existsSync(join(dir, 'cover.webp')));
rmSync(dir, { recursive: true });

assert.equal((await tool('critique_scene', { scene: JSON.stringify(scene) })).content.length, 1);
const sheet = await tool('show_props', { names: ['apple', 'no-such-prop'] });
assert.ok(!sheet.isError, sheet.content[0].text);
assert.match(sheet.content[0].text, /Unknown: no-such-prop/);
assert.equal((await tool('render_scene', { scene: '{oops' })).isError, true);
assert.equal((await rpc('nope')).error.code, -32601);

child.kill();
console.log('mcp: handshake and 5 tools ok');
