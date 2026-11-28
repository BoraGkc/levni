// Levni Desk: a local panel for a folder of scenes. `levni desk [dir]` serves it on 127.0.0.1 only.
//   Every scene JSON in the folder shows as a card, drawn on this machine. Pick one to scrub its motion, play the loop,
//   read the critic, see its git history and write PNG (with the scene inside), GIF or WebP next to it.
//   The panel watches the folder: when you or your agent save a scene, the drawing redraws.
// No dependencies beyond the engine's own; nothing leaves the machine except the "Open in the Pen" link you click.
import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, sep, extname, basename, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { compose, critique } from './compose.mjs';
import { rasterize } from './raster.mjs';
import { animate } from './animate.mjs';
import { stampPng } from './stamp.mjs';

const FONTS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'fonts');
const SKIP = new Set(['node_modules', '.git', 'dist', '.astro', '.next', 'build']);

const isScene = (v) => v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.elements) && !v.shots && !v.clips;

/** Scene files under dir (two levels deep), newest first: [{ file, mtime, size, canvas? , error? }]. */
export function listScenes(dir, { depth = 2 } = {}) {
  const out = [];
  const walk = (d, level) => {
    let names = [];
    try { names = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of names) {
      if (e.name.startsWith('.') || SKIP.has(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) { if (level < depth) walk(p, level + 1); continue; }
      if (extname(e.name).toLowerCase() !== '.json' || e.name === 'package.json' || e.name.endsWith('-lock.json')) continue;
      const st = statSync(p);
      if (st.size > 2_000_000) continue;
      let v;
      try { v = JSON.parse(readFileSync(p, 'utf8')); } catch { out.push({ file: relative(dir, p), mtime: st.mtimeMs, size: st.size, error: 'not valid JSON' }); continue; }
      if (isScene(v)) out.push({ file: relative(dir, p), mtime: st.mtimeMs, size: st.size, elements: v.elements.length, motion: JSON.stringify(v).includes('"motion"') || !!v.camera });
    }
  };
  walk(dir, 0);
  return out.sort((a, b) => !!a.error - !!b.error || b.mtime - a.mtime); // broken files last
}

// the last commits that touched a file, when the folder is a git repo
function history(dir, file) {
  try {
    const log = execFileSync('git', ['log', '-n', '8', '--date=short', '--format=%h\t%ad\t%an\t%s', '--', file], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 4000 });
    return log.trim().split('\n').filter(Boolean).map((l) => { const [hash, date, author, ...s] = l.split('\t'); return { hash, date, author, subject: s.join('\t') }; });
  } catch { return []; }
}

const pack = (scene) => deflateRawSync(Buffer.from(JSON.stringify(scene))).toString('base64url');

/** Start the panel. Returns { url, port, server, close }. */
export async function startDesk({ dir = '.', port = 4747, host = '127.0.0.1', log = () => {} } = {}) {
  const root = resolve(dir);
  if (!existsSync(root) || !statSync(root).isDirectory()) throw new Error(`desk: ${dir} is not a folder`);
  const cache = new Map(); // key -> Buffer, small LRU
  const remember = (k, v) => { cache.set(k, v); if (cache.size > 160) cache.delete(cache.keys().next().value); return v; };

  // a path from the page, kept inside the folder
  const inside = (f) => {
    const p = resolve(root, String(f || ''));
    if (p !== root && !p.startsWith(root + sep)) throw Object.assign(new Error('outside the folder'), { status: 403 });
    if (!existsSync(p)) throw Object.assign(new Error('no such file'), { status: 404 });
    return p;
  };
  const sceneOf = (p) => { let v; try { v = JSON.parse(readFileSync(p, 'utf8')); } catch (e) { throw Object.assign(new Error(`not valid JSON: ${e.message}`), { status: 422 }); } if (!isScene(v)) throw Object.assign(new Error('not a Levni scene (needs "elements")'), { status: 422 }); return v; };

  async function still(p, t, width) {
    const st = statSync(p), k = `still|${p}|${st.mtimeMs}|${t}|${width}`;
    if (cache.has(k)) return cache.get(k);
    const scene = sceneOf(p);
    const { svg, used, canvas } = await compose({ ...scene, t });
    let png = await rasterize(svg);
    if (width) png = await sharp(png).resize(width, null, { withoutEnlargement: true }).png({ compressionLevel: 6 }).toBuffer();
    return remember(k, { png, notes: critique(used, canvas), canvas });
  }
  async function loop(p) {
    const st = statSync(p), k = `loop|${p}|${st.mtimeMs}`;
    if (cache.has(k)) return cache.get(k);
    const r = await animate(sceneOf(p), null, { format: 'webp', frames: 24, fps: 12, width: 720 });
    return remember(k, r.buffer);
  }

  const send = (res, status, body, type = 'application/json; charset=utf-8') => {
    res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://desk');
    // only this machine, by its own name: a page elsewhere cannot point a DNS name at the panel
    const h = String(req.headers.host || '').replace(/:\d+$/, '');
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(h)) return send(res, 403, { error: 'Levni Desk answers on localhost only' });
    try {
      const q = url.searchParams;
      if (url.pathname === '/') return send(res, 200, PAGE, 'text/html; charset=utf-8');
      if (url.pathname.startsWith('/fonts/')) {
        const name = basename(url.pathname);
        if (!/^[\w.-]+\.(ttf|otf)$/.test(name) || !existsSync(join(FONTS_DIR, name))) return send(res, 404, { error: 'no font' });
        res.writeHead(200, { 'content-type': name.endsWith('.otf') ? 'font/otf' : 'font/ttf', 'cache-control': 'max-age=86400' });
        return res.end(readFileSync(join(FONTS_DIR, name)));
      }
      if (url.pathname === '/api/list') return send(res, 200, { dir: root, name: basename(root), scenes: listScenes(root) });
      if (url.pathname === '/api/still') {
        const t = Math.min(1, Math.max(0, Number(q.get('t') ?? 0.95) || 0)), w = Math.min(1600, Math.max(120, Number(q.get('w')) || 720));
        return send(res, 200, (await still(inside(q.get('f')), t, w)).png, 'image/png');
      }
      if (url.pathname === '/api/loop') return send(res, 200, await loop(inside(q.get('f'))), 'image/webp');
      if (url.pathname === '/api/scene') {
        const p = inside(q.get('f')), scene = sceneOf(p), { notes, canvas } = await still(p, 0.95, 720);
        const rel = relative(root, p), stem = rel.replace(/\.json$/i, '');
        const outputs = ['png', 'gif', 'webp'].map((x) => `${stem}.${x}`).filter((o) => existsSync(join(root, o))).map((o) => ({ file: o, bytes: statSync(join(root, o)).size }));
        return send(res, 200, { file: rel, canvas, notes, credits: scene.credits || [], history: history(root, rel), outputs, pen: `https://levni.dev/pen/#s=${pack(scene)}` });
      }
      if (url.pathname === '/api/export' && req.method === 'POST') {
        const p = inside(q.get('f')), as = String(q.get('as')), scene = sceneOf(p);
        const out = p.replace(/\.json$/i, `.${as}`);
        if (as === 'png') { const { svg } = await compose({ ...scene, t: 0.95 }); writeFileSync(out, stampPng(await rasterize(svg), scene)); }
        else if (as === 'gif' || as === 'webp') await animate(scene, out, { frames: 24, fps: 12 });
        else return send(res, 400, { error: 'as must be png, gif or webp' });
        log(`wrote ${relative(root, out)}`);
        return send(res, 200, { file: relative(root, out), bytes: statSync(out).size });
      }
      send(res, 404, { error: 'not found' });
    } catch (e) { send(res, e.status || 500, { error: e.message }); }
  });

  // the first free port from the one asked for
  let at = Number(port) || 4747;
  for (;;) {
    try { await new Promise((ok, fail) => { server.once('error', fail); server.listen(at, host, () => { server.off('error', fail); ok(); }); }); break; }
    catch (e) { if (e.code !== 'EADDRINUSE' || at > Number(port) + 20) throw e; at++; }
  }
  const addr = server.address();
  return { url: `http://localhost:${addr.port}/`, port: addr.port, server, close: () => new Promise((ok) => server.close(ok)) };
}

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Levni Desk</title>
<style>
@font-face { font-family: G; src: url(/fonts/SpaceGrotesk-Variable.ttf); font-weight: 300 700; }
@font-face { font-family: M; src: url(/fonts/JetBrainsMono-Variable.ttf); font-weight: 100 800; }
:root { --indigo: #4B2FD6; --deep: #1E1466; --lime: #D6E521; --paper: #F4F2EC; --ink: #1A1633; --soft: #5B5675; --rule: #DCD8CC; --coral: #E8522F; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body { font: 15px/1.45 G, system-ui, sans-serif; color: var(--ink); background: var(--paper); display: grid; grid-template-rows: auto 1fr; }
button, a.btn { font: 600 11px/1 M, ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; padding: 10px 12px; border: 0; cursor: pointer; background: #fff; color: var(--ink); box-shadow: 0 0 0 1px var(--rule); text-decoration: none; display: inline-block; }
button:hover, a.btn:hover { box-shadow: 0 0 0 2px var(--ink); }
button:focus-visible, a:focus-visible, input:focus-visible { outline: 3px solid var(--lime); outline-offset: 2px; }
button.go { background: var(--indigo); color: #fff; box-shadow: none; }
button[disabled] { opacity: .6; cursor: progress; }
header { display: flex; align-items: center; gap: 14px; padding: 12px 18px; background: var(--indigo); color: #fff; flex-wrap: wrap; }
header b { font: 700 15px/1 M, monospace; color: var(--lime); }
header .dir { font: 13px/1.2 M, monospace; color: #D9D3FF; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 46vw; }
header .grow { flex: 1; }
header .live { font: 600 11px/1 M, monospace; letter-spacing: .06em; text-transform: uppercase; color: #D9D3FF; display: flex; align-items: center; gap: 8px; }
header .live i { width: 8px; height: 8px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 3px rgba(214,229,33,.25); }
header input { font: 13px/1 M, monospace; padding: 8px 10px; border: 0; width: 200px; }
main { display: grid; grid-template-columns: minmax(260px, 340px) minmax(0, 1fr); min-height: 0; }
.list { overflow: auto; padding: 14px; display: grid; gap: 10px; align-content: start; border-right: 1px solid var(--rule); }
.card { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 12px; align-items: center; padding: 8px; background: #fff; box-shadow: 0 0 0 1px var(--rule); cursor: pointer; text-align: left; text-transform: none; letter-spacing: 0; font: inherit; }
.card[aria-current="true"] { box-shadow: 0 0 0 2px var(--indigo); }
.card img { width: 96px; height: 72px; object-fit: contain; background: var(--paper); display: block; }
.card .n { font-weight: 700; overflow-wrap: anywhere; line-height: 1.25; }
.card .m { font: 11px/1.4 M, monospace; color: var(--soft); margin-top: 4px; }
.card .moves { color: var(--indigo); }
.card.bad { cursor: default; opacity: .7; }
.stage { overflow: auto; padding: 22px clamp(16px, 3vw, 36px) 40px; display: grid; gap: 16px; align-content: start; }
.stage h1 { font: 700 clamp(1.4rem, 2.4vw, 2rem)/1.1 G, sans-serif; margin: 0; letter-spacing: -.02em; overflow-wrap: anywhere; }
.meta { font: 12px/1.4 M, monospace; color: var(--soft); }
.frame { background: #fff; padding: 10px; box-shadow: 0 0 0 1px var(--rule); }
.frame img { display: block; width: 100%; height: auto; max-height: 62vh; object-fit: contain; background: repeating-conic-gradient(#EEEAE0 0 25%, #F7F5EF 0 50%) 0 0/16px 16px; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.row input[type=range] { flex: 1; min-width: 160px; accent-color: var(--indigo); }
.t { font: 600 12px/1 M, monospace; min-width: 3.5ch; }
.cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
@media (max-width: 1000px) { .cols { grid-template-columns: minmax(0, 1fr); } }
.box { background: #fff; box-shadow: 0 0 0 1px var(--rule); padding: 14px 16px; }
.box h2 { font: 600 11px/1 M, monospace; letter-spacing: .06em; text-transform: uppercase; margin: 0 0 10px; }
.box ul { margin: 0; padding-left: 18px; font-size: 14px; color: var(--soft); }
.box li + li { margin-top: 4px; }
.box code { font: 12px/1.4 M, monospace; }
.say { font: 12px/1.4 M, monospace; color: var(--indigo); min-height: 1.4em; margin: 0; }
.empty { max-width: 560px; margin: 8vh auto; text-align: center; color: var(--soft); }
.empty h1 { color: var(--ink); }
.empty pre { text-align: left; background: var(--deep); color: #fff; padding: 14px; font: 13px/1.6 M, monospace; overflow-x: auto; }
@media (max-width: 760px) { main { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; } .list { grid-auto-flow: column; grid-auto-columns: 240px; overflow-x: auto; border-right: 0; border-bottom: 1px solid var(--rule); } header .dir { max-width: 60vw; } header input { width: 100%; } }
@media (prefers-reduced-motion: reduce) { #play { display: none; } }
</style></head>
<body>
<header><b>Levni Desk</b><span class="dir" id="dir"></span><span class="grow"></span><input id="q" type="search" placeholder="Filter scenes" aria-label="Filter scenes"><span class="live" title="The panel redraws when a scene file changes"><i></i>Watching</span></header>
<main>
  <nav class="list" id="list" aria-label="Scenes"></nav>
  <section class="stage" id="stage" aria-live="polite"></section>
</main>
<script>
const $ = (s) => document.querySelector(s);
let scenes = [], cur = null, curMtime = 0, playing = false;
const ago = (ms) => { const s = (Date.now() - ms) / 1000; return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : s < 86400 ? Math.round(s / 3600) + ' h ago' : new Date(ms).toISOString().slice(0, 10); };
const kb = (b) => b < 1024 ? b + ' B' : Math.round(b / 1024) + ' KB';
const enc = encodeURIComponent;
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids.filter((k) => k != null)); return e; };

async function refresh() {
  let data;
  try { data = await (await fetch('/api/list')).json(); } catch { return; }
  $('#dir').textContent = data.dir; document.title = 'Levni Desk · ' + data.name;
  const sig = (l) => l.map((s) => s.file + s.mtime).join('|');
  const changed = sig(data.scenes) !== sig(scenes);
  scenes = data.scenes;
  if (changed) renderList();
  if (!cur && scenes.find((s) => !s.error)) open(scenes.find((s) => !s.error).file);
  if (!scenes.length) showEmpty();
  const now = scenes.find((s) => s.file === cur);
  if (cur && now && now.mtime !== curMtime) open(cur, true);
}
function renderList() {
  const f = $('#q').value.trim().toLowerCase();
  $('#list').replaceChildren(...scenes.filter((s) => !f || s.file.toLowerCase().includes(f)).map((s) => {
    const b = el('button', { className: 'card' + (s.error ? ' bad' : ''), type: 'button' });
    b.setAttribute('aria-current', String(s.file === cur));
    if (s.error) b.disabled = true; else b.onclick = () => open(s.file);
    b.append(s.error ? el('span', { className: 'm', textContent: 'JSON error' }) : el('img', { src: '/api/still?w=240&f=' + enc(s.file) + '&v=' + s.mtime, alt: '', loading: 'lazy' }),
      el('span', {}, el('span', { className: 'n', textContent: s.file }), el('div', { className: 'm' }, s.error ? s.error : ago(s.mtime) + ' · ' + s.elements + ' elements'), s.motion ? el('div', { className: 'm moves', textContent: 'moves' }) : null));
    return b;
  }));
}
function showEmpty() {
  cur = null;
  $('#stage').replaceChildren(el('div', { className: 'empty' }, el('h1', { textContent: 'No scenes in this folder yet' }),
    el('p', { textContent: 'Save a Levni scene here (any .json with "elements") and it appears at once. Start from a shot:' }),
    el('pre', { textContent: 'npx @levni/levni shot logo-sting hello.gif --title "Hello"\\n# or ask your agent: "Make a Levni scene in this folder"' })));
}
async function open(file, quiet, note) {
  const s = scenes.find((x) => x.file === file); if (!s) return;
  cur = file; curMtime = s.mtime; playing = false;
  document.querySelectorAll('.card').forEach((c) => c.setAttribute('aria-current', String(c.querySelector('.n')?.textContent === file)));
  const d = await (await fetch('/api/scene?f=' + enc(file))).json();
  if (d.error) { $('#stage').replaceChildren(el('p', { className: 'say', textContent: d.error })); return; }
  const t = quiet && $('#t') ? $('#t').value : (s.motion ? '0.6' : '0.95');
  const img = el('img', { id: 'img', alt: 'The drawing of ' + file });
  const range = el('input', { id: 't', type: 'range', min: 0, max: 1, step: 0.01, value: t, ariaLabel: 'Time in the loop' });
  const tv = el('span', { className: 't', textContent: Number(t).toFixed(2) });
  const draw = () => { img.src = '/api/still?w=1200&t=' + range.value + '&f=' + enc(file) + '&v=' + curMtime; };
  range.oninput = () => { tv.textContent = Number(range.value).toFixed(2); playing = false; play.textContent = 'Play'; draw(); };
  const play = el('button', { id: 'play', type: 'button', className: 'go', textContent: 'Play' });
  play.onclick = () => { playing = !playing; play.textContent = playing ? 'Pause' : 'Play'; if (playing) { play.disabled = true; say.textContent = 'Drawing the loop…'; img.onload = () => { play.disabled = false; say.textContent = ''; img.onload = null; }; img.src = '/api/loop?f=' + enc(file) + '&v=' + curMtime; } else draw(); };
  const say = el('p', { className: 'say', id: 'say' });
  const exp = (as, label) => { const b = el('button', { type: 'button', textContent: label }); b.onclick = async () => { b.disabled = true; say.textContent = 'Writing ' + as.toUpperCase() + '…'; try { const r = await (await fetch('/api/export?as=' + as + '&f=' + enc(file), { method: 'POST' })).json(); say.textContent = r.error ? r.error : 'Wrote ' + r.file + ' (' + kb(r.bytes) + ')'; if (!r.error) open(file, true, say.textContent); } finally { b.disabled = false; } }; return b; };
  const copy = el('button', { type: 'button', textContent: 'Copy path' }); copy.onclick = async () => { await navigator.clipboard.writeText(file); say.textContent = 'Copied ' + file; };
  const list = (items, empty, fn) => items.length ? el('ul', {}, ...items.map((x) => el('li', {}, ...[].concat(fn(x))))) : el('ul', {}, el('li', { textContent: empty }));
  $('#stage').replaceChildren(...[
    el('div', {}, el('h1', { textContent: file }), el('div', { className: 'meta', textContent: (d.canvas ? d.canvas.w + ' × ' + d.canvas.h + ' px · ' : '') + 'changed ' + ago(curMtime) + (s.motion ? ' · moves' : ' · still') })),
    el('figure', { className: 'frame', style: 'margin:0' }, img),
    s.motion ? el('div', { className: 'row' }, play, el('span', { className: 't', textContent: 't' }), range, tv) : null,
    el('div', { className: 'row' }, exp('png', 'PNG with scene'), s.motion ? exp('gif', 'GIF') : null, s.motion ? exp('webp', 'WebP') : null, el('a', { className: 'btn', href: d.pen, target: '_blank', rel: 'noopener', textContent: 'Open in the Pen' }), copy),
    say,
    el('div', { className: 'cols' },
      el('div', { className: 'box' }, el('h2', { textContent: 'Critic' }), list(d.notes, 'No notes: everything sits inside the canvas and reads clearly.', (n) => n)),
      el('div', { className: 'box' }, el('h2', { textContent: 'History' }), list(d.history, 'Not in git yet: commit the folder and every change shows here.', (h) => [el('code', { textContent: h.hash + ' ' + h.date + ' ' }), h.subject + ' · ' + h.author])),
      el('div', { className: 'box' }, el('h2', { textContent: 'Files next to it' }), list(d.outputs, 'Nothing written yet.', (o) => [el('code', { textContent: o.file }), ' · ' + kb(o.bytes)])),
      el('div', { className: 'box' }, el('h2', { textContent: 'Remix chain' }), list(d.credits, 'No credits yet. levni remix adds your name.', (c) => [c.at || '', ' ', c.by || '', c.from ? ' from ' + c.from : '']))),
  ].filter(Boolean));
  if (note) say.textContent = note;
  else if (quiet) say.textContent = 'Redrawn: the file changed ' + new Date().toLocaleTimeString();
  draw();
}
$('#q').oninput = renderList;
refresh(); setInterval(refresh, 1500);
</script>
</body></html>`;
