// sharp is native; the browser build has none. The elements that need it (glyph masks, dither, print screens) throw.
export default function sharp() { throw new Error('levni (browser): this element needs sharp, which runs in Node only'); }
