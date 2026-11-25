// node:fs for the browser build (see vfs.mjs). Read-only; writes throw.
import { readVirtual, hasVirtual, listVirtual } from './vfs.mjs';

const enc = new TextEncoder(), dec = new TextDecoder();
function asBuffer(bytes) { // a Uint8Array that also answers toString('utf8' | 'base64') like a Buffer
  bytes.toString = (e) => e === 'base64' ? btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join('')) : dec.decode(bytes);
  return bytes;
}
export function readFileSync(path, encoding) {
  const d = readVirtual(path);
  if (encoding) return typeof d === 'string' ? d : dec.decode(d);
  return asBuffer(typeof d === 'string' ? enc.encode(d) : new Uint8Array(d));
}
export const existsSync = (path) => hasVirtual(path) || listVirtual(path).length > 0;
export const readdirSync = (dir) => listVirtual(dir).sort();
const nope = () => { throw new Error('levni (browser): writing files is not available in the browser'); };
export const writeFileSync = nope, mkdirSync = nope;
export default { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync };
