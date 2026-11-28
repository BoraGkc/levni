// lens: a liquid-glass pill (or circle, or rounded box) laid over the finished picture. It is a raster pass like
// spec.screen: the frame is rendered, then every lens re-samples the pixels under it. The core magnifies (`zoom`),
// the rim bends the picture inward (`bend`) and splits it into red and blue fringes (`aberration`), then a tint,
// a top sheen, a bright rim and a soft drop shadow make it read as a thick piece of glass. A lens can carry its own
// search chrome (`icon`, `label`, `kbd`), drawn sharp on top. `move` [dx, dy] slides it with t (one sine cycle, so
// loops close). Applied by export (PNG / WebP), animate (GIF / WebP) and the MCP preview; SVG output has no lens.
import sharp from 'sharp';
import { layoutType } from './type.mjs';
import { PALETTE } from './style.mjs';

const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const hexOk = (v) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const col = (v, d) => (hexOk(v) ? v : hexOk(PALETTE[v]) ? PALETTE[v] : d);
const rgb = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
const r1 = (n) => Math.round(n * 10) / 10;

export function lensList(lens) {
  if (!lens) return [];
  return (Array.isArray(lens) ? lens : [lens]).filter((l) => l && typeof l === 'object').slice(0, 8);
}

// one lens, resolved for time t: geometry in px plus look
export function resolveLens(l, t = 0, cw = 1200, ch = 673) {
  const shape = ['pill', 'circle', 'rect'].includes(l.shape) ? l.shape : 'pill';
  let w = num(l.w, 760, 8, 8000), h = num(l.h, shape === 'circle' ? w : 190, 8, 8000);
  if (shape === 'circle') h = w = Math.min(w, h);
  const half = Math.min(w, h) / 2;
  const r = shape === 'rect' ? num(l.radius, half * 0.35, 0, half) : half;
  const mv = Array.isArray(l.move) ? l.move : [0, 0], s = Math.sin(2 * Math.PI * num(t, 0, 0, 1));
  const cx = num(l.x, cw / 2, -1e5, 1e5) + num(mv[0], 0, -1e4, 1e4) * s, cy = num(l.y, ch / 2, -1e5, 1e5) + num(mv[1], 0, -1e4, 1e4) * s;
  return {
    shape, cx, cy, w, h, r, half, k: 1,
    zoom: num(l.zoom, 1.18, 0.5, 4),
    bend: num(l.bend, half * 0.55, 0, 2000),
    aberration: num(l.aberration, Math.max(3, half * 0.09), 0, 200),
    blur: num(l.blur, 0, 0, 40),
    tint: rgb(col(l.tint, '#000000')), tintLevel: num(l.tintLevel, 0.22, 0, 1),
    sheen: num(l.sheen, 0.12, 0, 1), rim: num(l.rim, 0.55, 0, 1.5),
    shadow: num(l.shadow, 0.45, 0, 1), shadowSize: num(l.shadowSize, half * 0.35, 0, 400),
    icon: l.icon, label: l.label, kbd: l.kbd,
  };
}

// signed distance to a rounded box centred at 0 (half sizes hx, hy, corner radius r)
function sdBox(px, py, hx, hy, r) {
  const qx = Math.abs(px) - (hx - r), qy = Math.abs(py) - (hy - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  return Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - r;
}

// bilinear sample of one channel, clamped to the image
function sample(buf, W, H, x, y, ch) {
  x = Math.max(0, Math.min(W - 1.001, x)); y = Math.max(0, Math.min(H - 1.001, y));
  const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0, i = (y0 * W + x0) * 3 + ch;
  const a = buf[i], b = buf[i + 3], c = buf[i + W * 3], d = buf[i + W * 3 + 3];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

function glass(out, src, frost, W, H, L) {
  const hx = L.w / 2, hy = L.h / 2, pad = Math.ceil(L.shadowSize * 2 + 4);
  const x0 = Math.max(0, Math.floor(L.cx - hx - pad)), x1 = Math.min(W - 1, Math.ceil(L.cx + hx + pad));
  const y0 = Math.max(0, Math.floor(L.cy - hy - pad)), y1 = Math.min(H - 1, Math.ceil(L.cy + hy + pad));
  const look = frost || src;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5 - L.cx, py = y + 0.5 - L.cy;
    const d = sdBox(px, py, hx, hy, L.r), k = (y * W + x) * 3;
    if (d > 0) { // drop shadow, a little below the glass
      if (!L.shadow || !L.shadowSize) continue;
      const ds = sdBox(px, py - L.shadowSize * 0.45, hx, hy, L.r);
      if (ds >= L.shadowSize) continue;
      const f = 1 - L.shadow * 0.6 * (1 - Math.max(0, ds) / L.shadowSize) ** 2;
      out[k] *= f; out[k + 1] *= f; out[k + 2] *= f;
      continue;
    }
    // outward normal from the distance field
    const e = 0.75;
    let nx = sdBox(px + e, py, hx, hy, L.r) - sdBox(px - e, py, hx, hy, L.r);
    let ny = sdBox(px, py + e, hx, hy, L.r) - sdBox(px, py - e, hx, hy, L.r);
    const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const depth = clamp01(-d / (L.half * 0.9)), edge = 1 - depth;
    // magnify towards the centre, bend hard near the rim, split red and blue along the normal
    const bend = L.bend * edge ** 3;
    const sx = L.cx + px / L.zoom - nx * bend, sy = L.cy + py / L.zoom - ny * bend;
    const ca = L.aberration * (0.2 + edge * edge);
    let R = sample(look, W, H, sx + nx * ca, sy + ny * ca, 0);
    let G = sample(look, W, H, sx, sy, 1);
    let B = sample(look, W, H, sx - nx * ca, sy - ny * ca, 2);
    // tint, a sheen on the upper half, a bright rim
    const tl = L.tintLevel;
    R = R * (1 - tl) + L.tint[0] * tl; G = G * (1 - tl) + L.tint[1] * tl; B = B * (1 - tl) + L.tint[2] * tl;
    const sheen = L.sheen * 255 * clamp01(1 - (py + hy) / (L.h * 0.5)) * clamp01(depth * 3);
    const rim = L.rim * 255 * (edge ** 9 + 0.6 * clamp01(1 - Math.abs(d + 1.2) / 1.4) * (0.55 - 0.45 * ny));
    const a = clamp01(-d + 0.5); // antialiased edge
    out[k] = out[k] * (1 - a) + Math.min(255, R + sheen + rim) * a;
    out[k + 1] = out[k + 1] * (1 - a) + Math.min(255, G + sheen + rim) * a;
    out[k + 2] = out[k + 2] * (1 - a) + Math.min(255, B + sheen + rim) * a;
  }
}

// the search chrome as one transparent SVG: magnifier icon, label (bundled fonts, drawn as paths), keyboard chip
function chromeSvg(L, W, H) {
  const parts = [], hx = L.w / 2, padX = L.h * 0.34;
  let left = L.cx - hx + padX;
  const ink = (o, d) => col(o && o.color, d);
  if (L.icon) {
    const s = L.h * 0.26, cx0 = left + s * 0.42, cy0 = L.cy - s * 0.1, rr = s * 0.4, sw = Math.max(1.5 * L.k, s * 0.13);
    const c0 = ink(typeof L.icon === 'object' ? L.icon : null, '#F4F4F5');
    parts.push(`<circle cx="${r1(cx0)}" cy="${r1(cy0)}" r="${r1(rr)}" fill="none" stroke="${c0}" stroke-width="${r1(sw)}"/><path d="M${r1(cx0 + rr * 0.72)} ${r1(cy0 + rr * 0.72)}L${r1(cx0 + rr * 1.5)} ${r1(cy0 + rr * 1.5)}" stroke="${c0}" stroke-width="${r1(sw)}" stroke-linecap="round"/>`);
    left += s * 1.45;
  }
  let right = L.cx + hx - padX * 0.9;
  if (L.kbd) {
    const k = typeof L.kbd === 'object' ? L.kbd : { text: String(L.kbd) };
    const size = k.size != null ? num(k.size, 20, 6, 400) * L.k : L.h * 0.16;
    const t = layoutType({ text: String(k.text ?? '⌘K'), size, font: 'mono', weight: 700 });
    const cw = t.w + size * 1.6, ch = size * 2.3, x = right - cw, y = L.cy - ch / 2;
    parts.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(cw)}" height="${r1(ch)}" rx="${r1(ch / 2)}" fill="${col(k.fill, '#141418')}" fill-opacity="0.72" stroke="#FFFFFF" stroke-opacity="0.14" stroke-width="1.5"/>`);
    parts.push(`<path transform="translate(${r1(x + (cw - t.w) / 2 + t.shift)} ${r1(L.cy - t.h / 2)})" d="${t.d}" fill="${ink(k, '#F4F4F5')}"/>`);
    right = x - size;
  }
  if (L.label) {
    const o = typeof L.label === 'object' ? L.label : { text: String(L.label) };
    const size = o.size != null ? num(o.size, 40, 6, 800) * L.k : L.h * 0.3;
    const t = layoutType({ text: String(o.text ?? ''), size, font: o.font || 'grotesk', weight: num(o.weight, 600, 100, 900), tracking: o.tracking ?? -0.02 });
    const x = left + t.shift, y = L.cy - t.h / 2;
    // a soft shadow keeps the label readable over busy glass
    parts.push(`<path transform="translate(${r1(x)} ${r1(y + 2)})" d="${t.d}" fill="#000000" fill-opacity="0.45"/><path transform="translate(${r1(x)} ${r1(y)})" d="${t.d}" fill="${ink(o, '#F4F4F5')}"/>`);
  }
  if (!parts.length) return null;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${parts.join('')}</svg>`;
}

/** Apply every lens of `lens` (object or array) to a PNG buffer at time t; returns a PNG buffer.
 *  k: raster px per canvas unit, when the frame was rendered at a higher density (2 for a 2x export). */
export async function lensRaster(png, lens, t = 0, k = 1) {
  const s = num(k, 1, 0.05, 20);
  if (!lensList(lens).length) return png;
  const img = sharp(png).removeAlpha();
  const { data: src, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  // geometry is in canvas units; a frame drawn at a higher density (k) scales every length, chrome sizes too
  const list = lensList(lens).map((l) => resolveLens(l, t, W / s, H / s)).map((L) => {
    if (s === 1) return L;
    for (const key of ['cx', 'cy', 'w', 'h', 'r', 'half', 'bend', 'aberration', 'blur', 'shadowSize']) L[key] *= s;
    L.k = s;
    return L;
  });
  const out = Buffer.from(src);
  const sigma = Math.max(...list.map((L) => L.blur));
  const frost = sigma > 0.3 ? (await sharp(src, { raw: { width: W, height: H, channels: 3 } }).blur(sigma).raw().toBuffer()) : null;
  for (const L of list) glass(out, src, L.blur > 0.3 ? frost : null, W, H, L);
  let res = sharp(out, { raw: { width: W, height: H, channels: 3 } });
  const over = list.map((L) => chromeSvg(L, W, H)).filter(Boolean);
  if (over.length) res = sharp(await res.png().toBuffer()).composite(over.map((s) => ({ input: Buffer.from(s), top: 0, left: 0 })));
  return res.png().toBuffer();
}
