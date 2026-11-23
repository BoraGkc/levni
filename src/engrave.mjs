// Line-art landscapes, three ways.
//  `terrain`    wireframe hills in perspective (the synthwave / tech-hero look), hidden lines removed by painting
//               strips far to near, optional glowing `flow` lines running over the mesh.
//  `ridgelines` stacked profile lines (Joy Division), each line occludes the ones behind it.
//  `engrave`    pen-hatch engraving: parallel lines whose thickness follows a tone field, so dark areas get fat
//               lines and light areas thin or none. Modes: `landscape` (sky, sun, three mountain layers),
//               `globe` (a moon or planet, hatched along latitude lines), `radial` and `noise` (plain tone fields).
// All of it is drawn from math (seeded noise), no randomness outside the element's own rng.

const f = (n) => Math.round(n * 10) / 10;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth01 = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
const num = (v, d, a, b) => (Number.isFinite(+v) && v !== null && v !== '' ? clamp(+v, a, b) : d);
// ids come from a hash of the element, not a global counter, so the same scene always gives the same SVG
const hash = (e) => { let h = 5381; for (const ch of JSON.stringify(e)) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
let uid = 0, ctxHash = '';

// Fractal noise in roughly 0..1.
const fbm = (noise, x, y, oct = 3) => {
  let s = 0, a = 1, tot = 0, fr = 1;
  for (let k = 0; k < oct; k++) { s += noise(x * fr + k * 17.3, y * fr + k * 5.1) * a; tot += a; a *= 0.5; fr *= 2; }
  return clamp(0.5 + (s / tot) * 1.4);
};

// ---------- terrain ----------

function terrainAsset(e, { r, c, noise }) {
  const x0 = num(e.x, 0, -1e5, 1e5), y0 = num(e.y, 0, -1e5, 1e5), W = num(e.w, 1200, 20, 1e5), H = num(e.h, 673, 20, 1e5);
  const rows = Math.round(num(e.rows, 26, 4, 80)), cols = Math.round(num(e.cols, 44, 6, 120));
  const hy = y0 + H * num(e.horizon, 0.4, 0.05, 0.9), yb = y0 + H * num(e.bottom, 1.02, 1, 1.3);
  const color = c(e.color, '#7FA6F2'), ground = c(e.ground, '#14181F');
  const converge = num(e.converge, 0.4, 0.05, 1), amp = num(e.height, 0.3, 0, 1.5) * H, freq = num(e.freq, 1.7, 0.2, 8), valley = num(e.valley, 0.45, 0, 1);
  const fogMin = num(e.fog, 0.18, 0, 1), wmax = num(e.weight, 2.2, 0.3, 12);
  const cx = x0 + W / 2, halfW = (W / 2) * num(e.spread, 1.5, 0.5, 6);
  const zoff = num(e.seed, 0, -1e4, 1e4) * 3.1;

  // vertex grid: depth index i = 0 (horizon) .. rows (near), world x index j = 0..cols
  const P = [];
  for (let i = 0; i <= rows; i++) {
    const v = i / rows, s = Math.pow(v, 1.9), ys = lerp(hy, yb, s), sc = lerp(Math.max(converge, (W / 2 * 1.08) / halfW), 1, s);
    const row = [];
    for (let j = 0; j <= cols; j++) {
      const wx = (j / cols) * 2 - 1;
      const hgt = fbm(noise, wx * freq + zoff, v * freq * 2.3 + zoff) - 0.38;
      const mask = lerp(valley, 1, smooth01(Math.abs(wx) * 1.15)) ;
      // far rows keep a share of the height so the horizon is a ridge against the sky, not a ruler line
      const ridgeN = Math.max(0, fbm(noise, wx * freq * 1.6 + zoff + 40, 3.7, 3) - 0.3);
      const far = (1 - smooth01(v * 4)) * ridgeN * 1.1 * amp * (num(e.skyline, 0.45, 0, 2));
      const elev = Math.max(0, hgt) * 2.2 * mask * amp * (0.2 + 0.8 * Math.pow(s, 0.85)) + far;
      row.push([cx + wx * halfW * sc, ys - elev, s, elev]);
    }
    P.push(row);
  }

  // glowing streams: each starts near the horizon and runs down the valleys (lowest neighbouring column per row)
  const flows = [];
  const nFlow = Math.round(num(e.flow, 0, 0, 12));
  const used = [];
  for (let k = 0; k < nFlow; k++) {
    let j = 0, tries = 0;
    do { j = Math.round(r.range(0.14, 0.86) * cols); tries++; } while (used.some((u) => Math.abs(u - j) < 4) && tries < 30);
    used.push(j);
    const a = Math.round(r.range(0, 0.18) * rows), b = Math.min(rows, a + Math.round(rows * r.range(0.6, 0.85)));
    // fractional column, steered gently downhill so the stream bends smoothly instead of hopping columns
    const at = (i, jf) => { const j0 = clamp(Math.floor(jf), 0, cols - 1), t = jf - j0, A = P[i][j0], B = P[i][j0 + 1]; return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[3], B[3], t)]; };
    const path = [];
    let jf = j;
    for (let i = a; i <= b; i++) {
      path.push(at(i, jf));
      const g = at(i, clamp(jf + 1.5, 0, cols - 0.01))[2] - at(i, clamp(jf - 1.5, 0, cols - 0.01))[2];
      jf = clamp(jf - Math.sign(g) * Math.min(0.45, Math.abs(g) / (amp * 0.15)), 2, cols - 2);
    }
    flows.push({ a, b, path });
  }
  const flowCol = c(e.flowColor, '#F2C230');

  let out = '';
  const gid = `tg${ctxHash}${++uid}`;
  if (e.glow) {
    const gcol = c(e.glow);
    const gh = H * (e.glowHeight ?? 0.32);
    out += `<defs><linearGradient id="${gid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="${gcol}" stop-opacity="${e.glowLevel ?? 0.55}"/><stop offset="1" stop-color="${gcol}" stop-opacity="0"/></linearGradient></defs><rect x="${f(x0)}" y="${f(hy - gh)}" width="${f(W)}" height="${f(gh)}" fill="url(#${gid})"/>`;
  }
  const rowLine = (row) => row.map(([x, y], k) => `${k ? 'L' : 'M'}${f(x)},${f(y)}`).join('');
  // far to near: each strip covers whatever lies behind it, then its own lines go on top
  for (let i = 0; i < rows; i++) {
    const far = P[i], near = P[i + 1], s = near[0][2];
    const poly = [...far, ...near.slice().reverse()].map(([x, y]) => `${f(x)},${f(y)}`).join(' ');
    out += `<polygon points="${poly}" fill="${ground}"/>`;
    let d = '';
    // row line on the near edge (and the horizon line on the first strip)
    if (i === 0) d += rowLine(far);
    d += rowLine(near);
    for (let j = 0; j <= cols; j++) d += `M${f(far[j][0])},${f(far[j][1])}L${f(near[j][0])},${f(near[j][1])}`;
    const op = lerp(fogMin, 1, Math.pow(s, 0.8));
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(lerp(0.9, wmax, s))}" stroke-opacity="${f(op * 100) / 100}" stroke-linejoin="round"/>`;
    if (i === 0) out += `<path d="${rowLine(far)}" fill="none" stroke="${color}" stroke-width="1.1" stroke-opacity="0.75" stroke-linejoin="round"/>`;
    for (const fl of flows) {
      if (i < fl.a || i >= fl.b) continue;
      const k = i - fl.a, u = (k + 0.5) / (fl.b - fl.a);
      const p0 = fl.path[k], p1 = fl.path[k + 1];
      const taper = Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.6, wd = (0.7 + 2.2 * s) * (0.35 + 0.65 * taper);
      const seg = `M${f(p0[0])},${f(p0[1])}L${f(p1[0])},${f(p1[1])}`;
      const st = (w, o) => `<path d="${seg}" stroke="${flowCol}" stroke-width="${f(w)}" stroke-opacity="${Math.round(o * 100) / 100}" stroke-linecap="round" fill="none"/>`;
      out += st(wd * 10, 0.12 * taper) + st(wd * 4.5, 0.28 * taper) + st(wd * 1.5, 0.9 * taper + 0.05) + st(wd * 0.5, 0.7 * taper);
    }
  }
  return { svg: out, bbox: [x0, hy - amp * 0.4, W, yb - hy + amp * 0.4] };
}

// ---------- ridgelines ----------

function ridgeAsset(e, { c, noise }) {
  const x0 = num(e.x, 0, -1e5, 1e5), y0 = num(e.y, 0, -1e5, 1e5), W = num(e.w, 1080, 20, 1e5), H = num(e.h, 440, 20, 1e5), n = Math.round(num(e.lines, 34, 3, 120)), pts = Math.round(num(e.points, 110, 20, 400));
  const color = c(e.color, '#FBFAF6'), ground = c(e.ground, '#14181F'), wt = e.weight ?? 2;
  const amp = (e.height ?? 0.42) * H, gapY = (H - amp * 0.35) / n, freq = e.freq ?? 3.2;
  const pk = e.peaks ?? 'center';
  const zoff = (e.seed ?? 0) * 2.7;
  let out = '';
  const bottom = y0 + H + 6;
  for (let i = 0; i < n; i++) {
    const base = y0 + amp * 0.35 + i * gapY + gapY, depth = i / (n - 1);
    const line = [];
    for (let k = 0; k <= pts; k++) {
      const u = k / pts, x = x0 + u * W;
      // envelope: tall in the middle, flat at both ends (classic), or free noise
      const env = pk === 'noise' ? 1 : Math.exp(-(((u - (e.center ?? 0.5)) / (e.spreadX ?? 0.22)) ** 2));
      const edge = Math.min(1, u * 14, (1 - u) * 14);
      const nz = fbm(noise, u * freq * 3 + zoff, i * (e.drift ?? 0.17) + zoff, 3) - 0.34;
      const jag = noise(u * 40 + i * 3.3, i * 1.7) * 0.1;
      const hh = Math.max(0, nz * 2 * env + jag * env * 0.6 + (e.floor ?? 0.02)) * amp * (0.75 + 0.25 * depth) * edge;
      line.push([x, base - hh]);
    }
    const d = line.map(([x, y], k) => `${k ? 'L' : 'M'}${f(x)},${f(y)}`).join('');
    out += `<path d="${d}L${f(x0 + W)},${f(bottom)}L${f(x0)},${f(bottom)}Z" fill="${ground}"/>`;
    out += `<path d="${d}" fill="none" stroke="${color}" stroke-width="${f(lerp(wt * 0.7, wt * 1.15, depth))}" stroke-linejoin="round"${e.fade === false ? '' : ` stroke-opacity="${f(lerp(0.55, 1, depth) * 100) / 100}"`}/>`;
  }
  return { svg: out, bbox: [x0, y0, W, H] };
}

// ---------- engrave ----------

// One set of parallel hatch lines, drawn as variable-thickness ribbons. `lines` is an array of point arrays
// (so a globe can bring its own curved lines); `tone(x, y)` is 0 (paper) .. 1 (full ink).
function ribbons(lines, tone, { color, wmax, gap, gamma = 1.1, minW = 0.45 }) {
  let d = '';
  for (const line of lines) {
    const th = line.map(([x, y]) => { const t = tone(x, y); return t > 0 ? wmax * Math.pow(clamp(t), gamma) * gap : 0; });
    let run = [];
    const flush = () => {
      if (run.length > 1) {
        const top = [], bot = [];
        for (let k = 0; k < run.length; k++) {
          const a = run[Math.max(0, k - 1)], b = run[Math.min(run.length - 1, k + 1)], dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len, h = run[k].w / 2;
          top.push([run[k].p[0] + nx * h, run[k].p[1] + ny * h]);
          bot.push([run[k].p[0] - nx * h, run[k].p[1] - ny * h]);
        }
        d += 'M' + [...top, ...bot.reverse()].map(([x, y]) => `${f(x)},${f(y)}`).join('L') + 'Z';
      }
      run = [];
    };
    line.forEach((p, k) => { if (th[k] >= minW) run.push({ p, w: th[k] }); else flush(); });
    flush();
  }
  return d ? `<path d="${d}" fill="${color}"/>` : '';
}

// Straight parallel lines at `angle` (degrees) across a box, pushed vertically by `warp(x, y)` so they can bend with a contour.
function straightLines([x, y, w, h], angle, gap, step, warp) {
  const a = (angle * Math.PI) / 180, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
  const cx = x + w / 2, cy = y + h / 2, diag = Math.hypot(w, h) / 2 + 20, lines = [];
  for (let dd = -diag; dd <= diag; dd += gap) {
    const line = [];
    for (let t = -diag; t <= diag; t += step) {
      const px = cx + nx * dd + ux * t, py = cy + ny * dd + uy * t;
      if (px < x - 8 || px > x + w + 8 || py < y - 30 || py > y + h + 30) continue;
      line.push([px, py + (warp ? warp(px, py) : 0)]);
    }
    if (line.length > 1) lines.push(line);
  }
  return lines;
}

const polyClip = (id, pts) => `<clipPath id="${id}"><path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L')}Z"/></clipPath>`;

function engraveLandscape(e, { c, noise }) {
  const x0 = num(e.x, 0, -1e5, 1e5), y0 = num(e.y, 0, -1e5, 1e5), W = num(e.w, 1060, 40, 1e5), H = num(e.h, 533, 40, 1e5), ink = c(e.color, '#14181F'), paper = c(e.ground, '#F4F2EC');
  const gap = Math.max(3, e.gap ?? 6), step = Math.max(4, gap * 1.1), wmax = e.weight ?? 0.78;
  const sun = e.sun || { x: x0 + W * 0.68, y: y0 + H * 0.3, r: H * 0.13 };
  const nLay = Math.round(num(e.layers, 3, 1, 5)), relief = (e.relief ?? 0.34) * H;
  const angles = e.angles || [-58, 52, -34, 60, -45];
  const zoff = (e.seed ?? 0) * 2.9;
  const clipId = `ek${ctxHash}${++uid}`;
  let out = `<clipPath id="${clipId}"><rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(H)}"/></clipPath><g clip-path="url(#${clipId})">`;
  const sunD = (x, y) => Math.hypot(x - sun.x, y - sun.y);

  // sky: horizontal lines, dark at the top, fading toward the sun and the horizon; lines ripple around the sun
  const horizon = y0 + H * 0.58;
  const skyTone = (x, y) => {
    const up = clamp((horizon - y) / (horizon - y0));
    const sd = clamp(sunD(x, y) / (sun.r * 5.2));
    if (sunD(x, y) < sun.r + gap * 0.6) return 0;
    return clamp((0.1 + 0.5 * up ** 1.3) * (0.18 + 0.82 * sd ** 1.2) + noise(x * 0.004, y * 0.02 + zoff) * 0.08);
  };
  const skyWarp = (x, y) => {
    const dx = x - sun.x, dy = y - sun.y, d2 = dx * dx + dy * dy, R = sun.r * 2.2;
    return Math.sign(dy || 1) * (e.ripple ?? 0.5) * sun.r * Math.exp(-d2 / (R * R)) * 0.9;
  };
  out += ribbons(straightLines([x0, y0, W, H], 0, gap, step, skyWarp), skyTone, { color: ink, wmax, gap });
  // sun: paper disc with an inked edge and short rays
  out += `<circle cx="${f(sun.x)}" cy="${f(sun.y)}" r="${f(sun.r)}" fill="${paper}" stroke="${ink}" stroke-width="${f(e.outline ?? 2.4)}"/>`;
  const rays = Math.round(num(e.rays, 28, 0, 120));
  for (let k = 0; k < rays; k++) {
    const a = (k / rays) * Math.PI * 2, r0 = sun.r * 1.12, r1 = sun.r * (k % 2 ? 1.34 : 1.5);
    out += `<path d="M${f(sun.x + Math.cos(a) * r0)},${f(sun.y + Math.sin(a) * r0)}L${f(sun.x + Math.cos(a) * r1)},${f(sun.y + Math.sin(a) * r1)}" stroke="${ink}" stroke-width="${f(1.6)}" stroke-linecap="round"/>`;
  }

  // mountains, far to near
  for (let L = 0; L < nLay; L++) {
    const u = nLay === 1 ? 1 : L / (nLay - 1);
    const baseY = y0 + H * lerp(0.6, 0.84, u), amp = relief * lerp(0.95, 0.58, u), fr = lerp(1.4, 2.5, u);
    const ridge = (x) => {
      const n1 = noise((x - x0) / W * fr * 2.2 + L * 7.7 + zoff, L * 3.1 + 0.5);
      const n2 = noise((x - x0) / W * fr * 5.5 + L * 2.3 + zoff, L * 1.9 + 9.1) * 0.35;
      const rid = 1 - Math.abs(n1 + n2) * 2.1; // ridged: sharp crests
      return baseY - Math.max(0, rid * 0.65 + 0.2) * amp;
    };
    const pts = [];
    for (let x = x0 - 4; x <= x0 + W + 4; x += 4) pts.push([x, ridge(x)]);
    const poly = [...pts, [x0 + W + 4, y0 + H + 4], [x0 - 4, y0 + H + 4]];
    const id = `el${ctxHash}${++uid}`;
    const dark = lerp(0.52, 0.95, u);
    const tone = (x, y) => {
      const r0 = ridge(x);
      if (y < r0 - 3) return 0;
      const below = clamp((y - r0) / (amp * 1.05));
      // facets: broad planes of light and shade that follow the crest direction near the top and break up below it
      const slope = (ridge(x + 3) - ridge(x - 3)) / 6;
      const crest = clamp(0.5 - slope * Math.sign(x - sun.x) * 0.5, 0, 1);
      const facet = fbm(noise, x * 0.011 + L * 5.3 + zoff, y * 0.018 + L * 2.1, 2);
      const lit = lerp(crest, facet, smooth01(below * 2.2) * 0.85);
      const mist = u < 1 ? (1 - below) * 0.22 : 0;
      return clamp(dark * (1.1 - lit * 0.9) + below * 0.12 - mist * (L === 0 ? 1.4 : 0.6));
    };
    out += polyClip(id, poly) + `<g clip-path="url(#${id})">`;
    out += `<path d="M${poly.map(([x, y]) => `${f(x)},${f(y)}`).join('L')}Z" fill="${paper}"/>`;
    const warp = (x, y) => (y > ridge(x) ? (e.bend ?? 0.16) * (ridge(x) - baseY) : 0);
    out += ribbons(straightLines([x0, y0 + H * 0.3, W, H * 0.7], angles[L % angles.length], gap * lerp(1.1, 0.95, u), step, warp), tone, { color: ink, wmax: wmax * 0.9, gap: gap });
    if (e.cross !== false && L === nLay - 1) {
      out += ribbons(straightLines([x0, y0 + H * 0.3, W, H * 0.7], angles[L % angles.length] + 78, gap * 1.05, step, null), (x, y) => clamp((tone(x, y) - 0.62) * 2.2), { color: ink, wmax: wmax * 0.7, gap });
    }
    out += `</g>`;
    // crisp inked silhouette
    out += `<path d="M${pts.map(([x, y]) => `${f(x)},${f(y)}`).join('L')}" fill="none" stroke="${ink}" stroke-width="${f(lerp(1.6, 2.4, u))}" stroke-linejoin="round"/>`;
  }
  out += '</g>';
  // a hairline frame hides the ragged line ends at the plate edge
  if (e.frame !== false) out += `<rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(H)}" fill="none" stroke="${ink}" stroke-width="${f(e.outline ?? 2.4) * 0.8}"/>`;
  return { svg: out, bbox: [x0, y0, W, H] };
}

function engraveGlobe(e, { r, c, noise }) {
  const cx = num(e.x, 600, -1e5, 1e5), cy = num(e.y, 336, -1e5, 1e5), R = num(e.r, 250, 10, 5000), ink = c(e.color, '#14181F'), paper = c(e.ground, '#F4F2EC');
  const gap = Math.max(3, num(e.gap, 5.5, 3, 100)), wmax = e.weight ?? 0.8, tilt = ((e.tilt ?? -18) * Math.PI) / 180;
  const la = ((e.lightAngle ?? -135) * Math.PI) / 180;
  const L = [Math.cos(la) * 0.62, Math.sin(la) * 0.62, 0.78], ll = Math.hypot(...L), light = L.map((v) => v / ll);
  const zoff = (e.seed ?? 0) * 3.3;
  // craters: a few seeded rings that darken their far rim and lighten the floor
  const craters = [];
  for (let k = 0, tries = 0, want = clamp(Math.round(e.craters ?? 9), 0, 40); craters.length < want && tries < 400; tries++) {
    const rr = r.range(0.07, 0.19) * R, ang = r.range(0, 6.2832), d = Math.sqrt(r.range(0, 1)) * (R * 0.82 - rr);
    const q = [cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, rr];
    if (craters.every(([ax, ay, ar]) => Math.hypot(q[0] - ax, q[1] - ay) > (ar + rr) * 1.1)) craters.push(q);
  }
  const tone = (x, y) => {
    const nx = (x - cx) / R, ny = (y - cy) / R, d2 = nx * nx + ny * ny;
    if (d2 >= 1) return 0;
    const nz = Math.sqrt(1 - d2);
    // the globe is lit like a ball, with the terminator pushed a little past the middle
    let lam = nx * light[0] + ny * light[1] + nz * light[2];
    let t = 0.3 + 0.7 * clamp(1 - (lam + 0.05) * 0.95) ** 1.15;
    t += noise(x * 0.02 + zoff, y * 0.02) * 0.14 + noise(x * 0.07, y * 0.07 + zoff) * 0.07;
    for (const [qx, qy, qr] of craters) {
      const dx = x - qx, dy = y - qy, dd = Math.hypot(dx, dy) / qr;
      if (dd > 1.35) continue;
      const side = clamp((dx * light[0] + dy * light[1]) / (qr * Math.max(dd, 0.05)), -1, 1); // +1: toward the light
      if (dd < 1) {
        // bowl: floor a little darker, the wall nearest the light in deep shadow, the far wall catching the light
        const wall = smooth01((dd - 0.35) / 0.65);
        t += 0.06 + wall * side * 0.7;
      }
      // raised rim: a bright thin lip on the lit side, a dark cast shadow outside on the far side
      const rim = Math.exp(-(((dd - 1.0) / 0.17) ** 2));
      t -= rim * (0.22 + 0.2 * Math.max(0, -side));
      if (dd >= 1) t += (1 - smooth01((dd - 1) / 0.35)) * Math.max(0, -side) * 0.3;
    }
    return clamp(t) * clamp((1 - d2) * 14); // soft cut at the rim
  };
  // latitude lines on a tilted sphere: real great-circle-parallel arcs
  const lines = [], n = Math.floor((R * 2) / gap);
  for (let k = 0; k <= n; k++) {
    const sinLat = -1 + (2 * k) / n, cosLat = Math.sqrt(Math.max(0, 1 - sinLat * sinLat)), line = [];
    for (let s = 0; s <= 90; s++) {
      const lam = -Math.PI / 2 + (s / 90) * Math.PI;
      line.push([cx + R * cosLat * Math.sin(lam), cy + R * (sinLat * Math.cos(tilt) - cosLat * Math.cos(lam) * Math.sin(tilt))]);
    }
    lines.push(line);
  }
  let out = `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="${paper}"/>`;
  out += ribbons(lines, tone, { color: ink, wmax, gap, gamma: 1 });
  out += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="none" stroke="${ink}" stroke-width="${f(e.outline ?? 2.2)}"/>`;
  return { svg: out, bbox: [cx - R, cy - R, R * 2, R * 2] };
}

function engraveField(e, { c, noise }) {
  const x0 = num(e.x, 0, -1e5, 1e5), y0 = num(e.y, 0, -1e5, 1e5), W = num(e.w, 600, 40, 1e5), H = num(e.h, 400, 40, 1e5), ink = c(e.color, '#14181F');
  const gap = Math.max(3, num(e.gap, 6, 3, 100)), wmax = e.weight ?? 0.8, zoff = (e.seed ?? 0) * 2.3;
  const cxp = e.cx ?? x0 + W / 2, cyp = e.cy ?? y0 + H / 2, Rr = e.radius ?? Math.hypot(W, H) / 2;
  const sc = e.scale ?? 0.004;
  const tone = e.mode === 'noise'
    ? (x, y) => clamp(fbm(noise, x * sc + zoff, y * sc * 1.4, 3) * 1.3 - 0.25)
    : (x, y) => clamp(Math.hypot(x - cxp, y - cyp) / Rr) ** (e.falloff ?? 1.2);
  const warp = e.bend ? (x, y) => (fbm(noise, x * sc * 0.8 + zoff, y * sc * 0.8, 2) - 0.5) * e.bend * gap * 6 : null;
  const id = `ef${ctxHash}${++uid}`;
  let out = `<clipPath id="${id}"><rect x="${f(x0)}" y="${f(y0)}" width="${f(W)}" height="${f(H)}"/></clipPath><g clip-path="url(#${id})">`;
  out += ribbons(straightLines([x0, y0, W, H], e.angle ?? 0, gap, Math.max(3, gap * 0.8), warp), tone, { color: ink, wmax, gap });
  return { svg: out + '</g>', bbox: [x0, y0, W, H] };
}

function engraveAsset(e, ctx) {
  if (e.mode === 'globe') return engraveGlobe(e, ctx);
  if (e.mode === 'radial' || e.mode === 'noise') return engraveField(e, ctx);
  return engraveLandscape(e, ctx);
}

const scoped = (fn) => (e, ctx) => { uid = 0; ctxHash = hash(e); return fn(e, ctx); };
export const ENGRAVE_ASSETS = { terrain: scoped(terrainAsset), ridgelines: scoped(ridgeAsset), engrave: scoped(engraveAsset) };
