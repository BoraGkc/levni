// The Levni stamp: every PNG carries the scene that drew it, so any Levni picture can be opened, changed and
// remixed, and it shows it was drawn from JSON, not generated. Plain PNG text chunks; no dependency; Node and browser.
//   stampPng(png, scene, { by })  -> PNG bytes with the scene inside (and its remix chain, `scene.credits`)
//   readStamp(png)                 -> { scene, credits, tool } or null
//   remix(scene, { by, from })     -> a copy of the scene with one more link in its credits
const SIG = [137, 80, 78, 71, 13, 10, 26, 10];
const KEY = 'levni';

let CRC;
const crc32 = (bytes) => {
  if (!CRC) CRC = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  let c = 0xffffffff;
  for (const b of bytes) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const u32 = (n) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const enc = (s) => new TextEncoder().encode(s);
const isPng = (b) => b && b.length > 8 && SIG.every((v, i) => b[i] === v);

function chunk(type, data) {
  const td = new Uint8Array(4 + data.length);
  td.set(enc(type), 0); td.set(data, 4);
  const out = new Uint8Array(12 + data.length);
  out.set(u32(data.length), 0); out.set(td, 4); out.set(u32(crc32(td)), 8 + data.length);
  return out;
}
// iTXt: keyword \0, compression flag 0, method 0, language \0, translated keyword \0, UTF-8 text
const itxt = (key, text) => { const k = enc(key), t = enc(text); const d = new Uint8Array(k.length + 5 + t.length); d.set(k, 0); d.set(t, k.length + 5); return chunk('iTXt', d); };
const textChunk = (key, text) => { const k = enc(key), t = enc(text); const d = new Uint8Array(k.length + 1 + t.length); d.set(k, 0); d.set(t, k.length + 1); return chunk('tEXt', d); };

// the chunks of a PNG as [type, start, end) of the whole chunk
function chunks(b) {
  const out = [];
  for (let i = 8; i + 12 <= b.length;) {
    const len = ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
    const type = String.fromCharCode(b[i + 4], b[i + 5], b[i + 6], b[i + 7]);
    out.push([type, i, i + 12 + len]);
    i += 12 + len;
    if (type === 'IEND') break;
  }
  return out;
}

/** Add one more link to a scene's remix chain: { by, from, at }. The rest of the scene is untouched. */
export function remix(scene, { by, from, at } = {}) {
  const credits = Array.isArray(scene?.credits) ? scene.credits.slice(-50) : [];
  const link = { ...(by ? { by: String(by).slice(0, 80) } : {}), ...(from ? { from: String(from).slice(0, 200) } : {}), at: at || new Date().toISOString().slice(0, 10) };
  return { ...scene, credits: [...credits, link] };
}

/** PNG bytes with the scene (and its credits) inside. Any earlier Levni stamp is replaced. */
export function stampPng(png, scene, { tool = 'Levni (levni.dev): drawn from JSON, no image model' } = {}) {
  const b = png instanceof Uint8Array ? png : new Uint8Array(png);
  if (!isPng(b)) throw new Error('stampPng: not a PNG');
  const parts = chunks(b).filter(([type, s]) => !((type === 'iTXt' || type === 'tEXt') && new TextDecoder().decode(b.subarray(s + 8, s + 8 + KEY.length + 1)).startsWith(KEY + '\0')));
  const iend = parts.findIndex(([t]) => t === 'IEND');
  const add = [itxt(KEY, JSON.stringify({ v: 1, scene })), textChunk('Software', tool)];
  const pieces = [b.subarray(0, 8), ...parts.slice(0, iend).map(([, s, e]) => b.subarray(s, e)), ...add, ...parts.slice(iend).map(([, s, e]) => b.subarray(s, e))];
  const out = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
  let o = 0; for (const p of pieces) { out.set(p, o); o += p.length; }
  return out;
}

/** The scene inside a stamped PNG, or null when the file carries none. */
export function readStamp(png) {
  const b = png instanceof Uint8Array ? png : new Uint8Array(png);
  if (!isPng(b)) return null;
  for (const [type, s, e] of chunks(b)) {
    if (type !== 'iTXt') continue;
    const d = b.subarray(s + 8, e - 4), z = d.indexOf(0);
    if (new TextDecoder().decode(d.subarray(0, z)) !== KEY) continue;
    let i = z + 3; // flag, method
    i = d.indexOf(0, i) + 1; i = d.indexOf(0, i) + 1; // language, translated keyword
    try {
      const j = JSON.parse(new TextDecoder().decode(d.subarray(i)));
      if (j && j.scene) return { scene: j.scene, credits: j.scene.credits || [], tool: 'levni' };
    } catch { return null; }
  }
  return null;
}
