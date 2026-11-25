// node:path for the browser build: the few helpers Levni uses, POSIX style.
export const sep = '/', delimiter = ':';
const clean = (parts) => {
  const out = [];
  for (const p of parts) { if (!p || p === '.') continue; if (p === '..') out.pop(); else out.push(p); }
  return out;
};
export const join = (...a) => { const s = a.filter(Boolean).join('/'); return (s.startsWith('/') ? '/' : '') + clean(s.split('/')).join('/'); };
export const resolve = (...a) => { let s = ''; for (const p of a) s = String(p).startsWith('/') ? String(p) : `${s}/${p}`; return join('/', s); };
export const dirname = (p) => { const s = String(p).replace(/\/+$/, ''); const i = s.lastIndexOf('/'); return i <= 0 ? (i === 0 ? '/' : '.') : s.slice(0, i); };
export const basename = (p, ext) => { const b = String(p).replace(/\/+$/, '').split('/').pop(); return ext && b.endsWith(ext) ? b.slice(0, -ext.length) : b; };
export const extname = (p) => { const b = basename(p); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; };
export default { sep, delimiter, join, resolve, dirname, basename, extname };
