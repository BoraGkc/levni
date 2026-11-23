// meshgrad: grainy mesh-gradient / blurred-orb backgrounds (hero fields, feature tiles, avatars).
// Pure SVG: a base fill, soft radial blobs inside one feGaussianBlur group, optional posterising (real
// colour steps, optional contour lines), a calm veil for text, and a soft film-grain overlay, all clipped to a
// rect / circle / superellipse squircle. Fine under finish "soft"; under the crayon finish keep `grain` low.

const f = (n) => Math.round(n * 10) / 10;
const num = (v, d, lo, hi) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); }

// Outline of the shape: rect (optional corner radius), circle, or a true superellipse |x/a|^n + |y/b|^n = 1.
function shapePath(x, y, w, h, shape, rad, expo) {
  if (shape === 'circle') { const r = Math.min(w, h) / 2, cx = x + w / 2, cy = y + h / 2; return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0z`; }
  if (shape === 'squircle') {
    const n = num(expo, 5, 2.5, 12), a = w / 2, b = h / 2, cx = x + a, cy = y + b, N = 160, p = [];
    for (let i = 0; i < N; i++) {
      const th = (i / N) * Math.PI * 2, ct = Math.cos(th), st = Math.sin(th);
      p.push(`${f(cx + a * Math.sign(ct) * Math.abs(ct) ** (2 / n))} ${f(cy + b * Math.sign(st) * Math.abs(st) ** (2 / n))}`);
    }
    return `M${p.join('L')}z`;
  }
  const k = Math.min(Math.min(w, h) / 2, rad ?? 0);
  return k ? `M${f(x + k)} ${f(y)}H${f(x + w - k)}Q${f(x + w)} ${f(y)} ${f(x + w)} ${f(y + k)}V${f(y + h - k)}Q${f(x + w)} ${f(y + h)} ${f(x + w - k)} ${f(y + h)}H${f(x + k)}Q${f(x)} ${f(y + h)} ${f(x)} ${f(y + h - k)}V${f(y + k)}Q${f(x)} ${f(y)} ${f(x + k)} ${f(y)}z` : `M${f(x)} ${f(y)}H${f(x + w)}V${f(y + h)}H${f(x)}z`;
}

const PRESETS = {
  // gradient-orb avatar: round, strongly blurred, a soft highlight and a faint rim
  orb: { shape: 'circle', count: 4, blurK: 0.22, grain: 0.3, highlight: true },
  // posterised poster look: hard colour steps with contour lines
  poster: { count: 5, bands: 7, lines: true, blurK: 0.18, grain: 0.3 },
};

function meshgrad(e, { c, r, t = 0 }) {
  const P = PRESETS[e.preset] || {};
  const circle = e.r != null;
  let x, y, w, h;
  if (circle) { const rr = num(e.r, 50, 1, 4000); x = num(e.x, 0, -1e5, 1e5) - rr; y = num(e.y, 0, -1e5, 1e5) - rr; w = h = rr * 2; }
  else { x = num(e.x, 0, -1e5, 1e5); y = num(e.y, 0, -1e5, 1e5); w = num(e.w, 300, 1, 8000); h = num(e.h, 200, 1, 8000); }
  const shape = e.shape || P.shape || (circle ? 'circle' : 'rect');
  const id = 'mg' + hash(JSON.stringify(e));
  const minD = Math.min(w, h);
  const named = e.colors && e.colors.length ? e.colors : ['blue', 'coral', 'mustard', 'tone'];
  const colors = named.map((n) => c(n, '#6B7CFF'));
  const base = c(e.base ?? e.fill, e.colors && e.colors.length ? colors[Math.floor(colors.length / 2)] : c('blue'));
  const bands = e.bands === false ? 0 : Math.min(12, Math.round(num(e.bands ?? P.bands, 0, 0, 12))) || 0;
  const bandN = bands >= 2 ? bands : 0;
  const lines = !!(e.lines ?? P.lines) && bandN > 0;
  const blur = num(e.blur, minD * (P.blurK ?? 0.14), 0, minD * 1.5);
  const drift = num(e.drift, 0.06, 0, 0.5) * minD;
  const T = num(t, 0, 0, 1);

  // blobs in box-relative units (0..1), radius relative to the shorter side
  let stops = Array.isArray(e.stops) && e.stops.length ? e.stops.slice(0, 24) : null;
  if (!stops) {
    const n = Math.round(num(e.count ?? P.count, 5, 2, 12));
    // jittered 3x3 cells, shuffled, so blobs spread over the box instead of piling up
    const cells = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => [k, r.next()]).sort((a, b) => a[1] - b[1]).map((a) => a[0]);
    stops = Array.from({ length: n }, (_, i) => { const k = cells[i % 9]; return { x: ((k % 3) + r.range(0.1, 0.9)) / 3, y: (Math.floor(k / 3) + r.range(0.1, 0.9)) / 3, color: named[i % named.length], r: r.range(0.45, 0.8) }; });
  }
  const blobs = stops.map((s, i) => {
    const ph = i * 2.4 + 1; // each blob drifts on its own small loop, so t=0 and t=1 match
    return { cx: x + num(s.x, 0.5, -1, 2) * w + Math.cos(T * Math.PI * 2 + ph) * drift, cy: y + num(s.y, 0.5, -1, 2) * h + Math.sin(T * Math.PI * 2 + ph) * drift, rad: Math.max(1, num(s.r, 0.45, 0.02, 3) * minD), color: c(s.color ?? named[i % named.length], '#6B7CFF'), a: num(s.opacity, 1, 0, 1) };
  });

  const defs = [], body = [];
  const pad = Math.max(40, blur * 3);
  body.push(`<rect x="${f(x - pad)}" y="${f(y - pad)}" width="${f(w + pad * 2)}" height="${f(h + pad * 2)}" fill="${base}"/>`);
  blobs.forEach((b, i) => {
    defs.push(`<radialGradient id="${id}g${i}" gradientUnits="userSpaceOnUse" cx="${f(b.cx)}" cy="${f(b.cy)}" r="${f(b.rad)}"><stop offset="0" stop-color="${b.color}" stop-opacity="${b.a}"/><stop offset="0.55" stop-color="${b.color}" stop-opacity="${f(b.a * 0.55)}"/><stop offset="1" stop-color="${b.color}" stop-opacity="0"/></radialGradient>`);
    body.push(`<circle cx="${f(b.cx)}" cy="${f(b.cy)}" r="${f(b.rad)}" fill="url(#${id}g${i})"/>`);
  });
  // calm zones: boxes (0..1) where the field fades toward the base colour, so text on top stays legible
  const calmList = (Array.isArray(e.calm?.[0]) ? e.calm : e.calm ? [e.calm] : []).slice(0, 6);
  calmList.forEach((z) => {
    const [zx, zy, zw, zh] = z.map((v) => num(v, 0, -1, 2));
    const gx = x + (zx + zw / 2) * w, gy = y + (zy + zh / 2) * h, rx = Math.max(1, (zw / 2) * w * 1.15), ry = Math.max(1, (zh / 2) * h * 1.15);
    const gid = `${id}z${body.length}`;
    defs.push(`<radialGradient id="${gid}" gradientUnits="userSpaceOnUse" cx="${f(gx)}" cy="${f(gy)}" r="1" gradientTransform="translate(${f(gx)} ${f(gy)}) scale(${f(rx)} ${f(ry)}) translate(${f(-gx)} ${f(-gy)})"><stop offset="0" stop-color="${base}" stop-opacity="0.92"/><stop offset="0.6" stop-color="${base}" stop-opacity="0.7"/><stop offset="1" stop-color="${base}" stop-opacity="0"/></radialGradient>`);
    body.push(`<ellipse cx="${f(gx)}" cy="${f(gy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${gid})"/>`);
  });

  // filter chain: blur, then (bands) hard colour steps, then (lines) thin contour lines between the steps
  const fx = `filterUnits="userSpaceOnUse" x="${f(x - pad)}" y="${f(y - pad)}" width="${f(w + pad * 2)}" height="${f(h + pad * 2)}" color-interpolation-filters="sRGB"`;
  let chain = `<feGaussianBlur stdDeviation="${f(blur)}" result="b"/>`;
  let fin = 'b';
  if (bandN) {
    const tv = Array.from({ length: bandN }, (_, k) => f(k / (bandN - 1) * 1000) / 1000).join(' ');
    chain += `<feComponentTransfer in="b" result="q"><feFuncR type="discrete" tableValues="${tv}"/><feFuncG type="discrete" tableValues="${tv}"/><feFuncB type="discrete" tableValues="${tv}"/></feComponentTransfer>`;
    fin = 'q';
    if (lines) {
      const o = Math.max(1, Math.round(minD / 260)); // line weight in px
      chain += `<feOffset in="q" dx="${o}" dy="${o}" result="o"/><feBlend in="q" in2="o" mode="difference" result="dm"/><feColorMatrix in="dm" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  60 60 60 0 0" result="ln"/><feComponentTransfer in="ln" result="ln2"><feFuncA type="linear" slope="0.55"/></feComponentTransfer><feMerge><feMergeNode in="q"/><feMergeNode in="ln2"/></feMerge>`;
    }
  }
  defs.push(`<filter id="${id}b" ${fx}>${chain}</filter>`);

  // mask: show the field only inside these shapes (box units), everything else stays transparent
  const maskList = Array.isArray(e.mask) ? e.mask.slice(0, 12) : [];
  let clip;
  if (maskList.length) {
    clip = maskList.map((m) => {
      const mx = x + num(m.x, 0, -1, 2) * w, my = y + num(m.y, 0, -1, 2) * h, mw = Math.max(1, num(m.w, 1, 0, 3) * w), mh = Math.max(1, num(m.h, 1, 0, 3) * h);
      return `<path d="${shapePath(mx, my, mw, mh, m.shape || 'rect', m.radius != null ? m.radius * Math.min(mw, mh) : undefined, m.exponent)}"/>`;
    }).join('');
  } else clip = `<path d="${shapePath(x, y, w, h, shape, e.radius, e.exponent)}"/>`;
  defs.push(`<clipPath id="${id}c">${clip}</clipPath>`);

  // grain: soft luminance film noise (proportional, slightly blurred), not hard speckle
  const grain = num(e.grain, P.grain ?? 0.35, 0, 1);
  let grainSvg = '';
  if (grain > 0) {
    const sd = Math.round(num(e.seed, 3, 0, 1e6) + (r.range(0, 50) | 0));
    const fq = num(e.grainSize, 0.8, 0.2, 2);
    defs.push(`<filter id="${id}n" filterUnits="userSpaceOnUse" x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="${fq}" numOctaves="3" seed="${sd}" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -2 0 0 0 1" result="dk"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  2 0 0 0 -1" result="lt"/><feMerge result="m"><feMergeNode in="dk"/><feMergeNode in="lt"/></feMerge><feGaussianBlur in="m" stdDeviation="0.7"/></filter>`);
    grainSvg = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" filter="url(#${id}n)" opacity="${f(0.15 + grain * 0.5)}"/>`;
  }

  // orb: soft top-left highlight and a faint darker rim for a lit, spherical feel
  let orb = '';
  if (e.highlight ?? P.highlight) {
    const hr = minD * 0.5, hx = x + w * 0.34, hy = y + h * 0.28;
    defs.push(`<radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="${f(hx)}" cy="${f(hy)}" r="${f(hr)}"><stop offset="0" stop-color="#fff" stop-opacity="0.28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><radialGradient id="${id}r" gradientUnits="userSpaceOnUse" cx="${f(x + w / 2)}" cy="${f(y + h / 2)}" r="${f(minD / 2)}"><stop offset="0.62" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient>`);
    orb = `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}h)"/><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="url(#${id}r)"/>`;
  }
  const svg = `<defs>${defs.join('')}</defs><g clip-path="url(#${id}c)"><g filter="url(#${id}b)">${body.join('')}</g>${orb}${grainSvg}</g>`;
  return { svg, bbox: [x, y, w, h] };
}

export const MESHGRAD_ASSETS = { meshgrad };
