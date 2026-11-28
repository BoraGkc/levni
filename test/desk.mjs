// Levni Desk: the local panel lists scenes, draws them, writes stamped exports and stays inside its folder.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { startDesk, listScenes } from '../src/desk.mjs';
import { readStamp } from '../src/stamp.mjs';

const dir = mkdtempSync(join(tmpdir(), 'levni-desk-'));
const scene = { canvas: [320, 200], background: 'paper', elements: [{ type: 'disc', x: 160, y: 100, r: 60, color: 'coral' }] };
writeFileSync(join(dir, 'a.json'), JSON.stringify(scene));
writeFileSync(join(dir, 'broken.json'), '{"x":');
writeFileSync(join(dir, 'package.json'), '{"name":"x"}');
writeFileSync(join(dir, 'reel.json'), JSON.stringify({ clips: [] }));

const list = listScenes(dir);
assert.deepEqual(list.map((s) => s.file), ['a.json', 'broken.json'], 'scenes first, broken last, package.json and non-scenes skipped');

const d = await startDesk({ dir, port: 4790 });
const get = (path, { method = 'GET', host = 'localhost' } = {}) => new Promise((ok, fail) => {
  const r = request({ host: '127.0.0.1', port: d.port, path, method, headers: { host: `${host}:${d.port}` } }, (res) => { const c = []; res.on('data', (x) => c.push(x)); res.on('end', () => ok({ status: res.statusCode, type: res.headers['content-type'], body: Buffer.concat(c) })); });
  r.on('error', fail); r.end();
});
try {
  assert.match(String((await get('/')).body), /Levni Desk/);
  assert.equal(JSON.parse((await get('/api/list')).body).scenes.length, 2);
  const png = await get('/api/still?f=a.json&w=200');
  assert.equal(png.type, 'image/png');
  assert.equal(png.body.subarray(1, 4).toString(), 'PNG');
  const info = JSON.parse((await get('/api/scene?f=a.json')).body);
  assert.equal(info.canvas.w, 320);
  assert.match(info.pen, /^https:\/\/levni\.dev\/pen\/#s=/);
  const out = JSON.parse((await get('/api/export?f=a.json&as=png', { method: 'POST' })).body);
  assert.equal(out.file, 'a.png');
  assert.deepEqual(readStamp(readFileSync(join(dir, 'a.png'))).scene.elements, scene.elements, 'the PNG carries its scene');
  assert.equal((await get('/api/scene?f=../../etc/hosts')).status, 403, 'stays inside the folder');
  assert.equal((await get('/api/list', { host: 'evil.example' })).status, 403, 'answers on localhost only');
  assert.equal((await get('/api/scene?f=broken.json')).status, 422);
  console.log('desk: list, still, scene, stamped export, folder and host guards ok');
} finally { await d.close(); rmSync(dir, { recursive: true, force: true }); }
