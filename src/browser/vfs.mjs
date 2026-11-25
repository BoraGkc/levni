// A tiny in-memory file system for the browser build. Levni's modules read the Folio and the fonts with node:fs;
// in the browser those reads come from here, filled ahead of time by registerProps() / registerFont().
// Paths are matched on their last two segments ("props/rocket.json", "fonts/X.ttf"), because a bundler moves the
// modules around and the absolute paths they compute differ from build to build.
const files = new Map(); // key: last two segments -> { data, dir }

const norm = (p) => String(p).replace(/\\/g, '/').replace(/\/+$/, '');
const tail = (p, n = 2) => norm(p).split('/').filter(Boolean).slice(-n).join('/');

export function writeVirtual(path, data) { files.set(tail(path), { data, dir: tail(path).split('/')[0] }); }
export const hasVirtual = (path) => files.has(tail(path));
export function readVirtual(path) {
  const f = files.get(tail(path));
  if (!f) throw new Error(`levni (browser): ${tail(path)} is not loaded`);
  return f.data;
}
// file names in a folder, matched on the folder's last segment ("props", "fonts")
export const listVirtual = (dir) => [...files.keys()].filter((k) => k.split('/')[0] === tail(dir, 1)).map((k) => k.split('/')[1]);
