// Faceless pictogram people: `person` (one figure in a named pose) and `people` (a row of them).
// The body is a skeleton in unit space (1 = full height, feet on y = 0, facing +x). Limbs are drawn as
// thick rounded tubes with the engine's pen, so they carry the same hand-inked outline as `peep`.
// Head: a plain circle floating above the shoulders. No face, no fingers (round mitten ends only).
import { ellipse } from './pen.mjs';
import { expandProp } from './props.mjs';

const f = (n) => Math.round(n * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => (/^#[0-9a-f]{6}$/i.test(a) && /^#[0-9a-f]{6}$/i.test(b)
  ? '#' + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * t).toString(16).padStart(2, '0')).join('')
  : a);

// Limb lengths (unit space, total height about 1.03 with the head floating above the shoulders)
const THIGH = 0.235, SHANK = 0.235, UPPER = 0.185, FORE = 0.175, TORSO = 0.27, HEAD = 0.09;
const LIMB = 0.09, BODY = 0.235;

// Pose table. Angles are degrees from "straight down", positive toward the facing direction.
// lean tilts the torso (+ forward); hip moves the hip [dx, dy] (dy up is negative); head nudges the head.
// armN / legN are the limbs nearest the viewer, armF / legF the far ones: [upper, lower] angles.
export const POSES = {
  standing:    { lean: 0,  armN: [14, 8],     armF: [-12, -6],   legN: [8, 0],     legF: [-8, 0] },
  walking:     { lean: 5,  armN: [-32, -18],  armF: [30, 50],    legN: [30, 8],    legF: [-26, -48] },
  running:     { lean: 16, armN: [45, 140],   armF: [-52, -118], legN: [72, -8],   legF: [-38, -100], head: [0.01, 0.01] },
  sitting:     { lean: 0,  armN: [18, 78],    armF: [10, 62],    legN: [88, 2],    legF: [96, 8] },
  pointing:    { lean: 3,  armN: [88, 90],    armF: [-10, -4],   legN: [6, 0],     legF: [-6, 0] },
  waving:      { lean: 0,  armN: [108, 176],  armF: [-9, -5],    legN: [4, 0],     legF: [-4, 0], marks: 'wave' },
  'raising-arm': { lean: 0, armN: [142, 162], armF: [-9, -5],    legN: [4, 0],     legF: [-4, 0] },
  holding:     { lean: 0,  armN: [32, 104],   armF: [24, 98],    legN: [5, 0],     legF: [-5, 0], item: 'hold' },
  carrying:    { lean: -5, armN: [26, 92],    armF: [20, 86],    legN: [8, 0],     legF: [-6, 0], item: 'box' },
  reading:     { lean: 3,  armN: [36, 112],   armF: [28, 106],   legN: [5, 0],     legF: [-5, 0], head: [0.02, 0.03], item: 'book' },
  phone:       { lean: 0,  armN: [82, 198],   armF: [-8, -4],    legN: [5, 0],     legF: [-5, 0], item: 'phone' },
  thinking:    { lean: 0,  armN: [64, 178],   armF: [-8, -4],    legN: [5, 0],     legF: [-6, 0], head: [0.04, 0.025] },
  cheering:    { lean: -3, armN: [138, 152],  armF: [-138, -152], legN: [12, 0],    legF: [-12, 0] },
  kneeling:    { lean: 4,  armN: [30, 70],    armF: [18, 60],    legN: [88, 0],    legF: [-4, -96] },
  leaning:     { lean: -13, hip: [-0.1, 0],   armN: [12, -18],   armF: [-6, 20],    legN: [20, 4],    legF: [14, 0] },
};
export const POSE_NAMES = Object.keys(POSES);

const at = (o, len, deg) => [o[0] + len * Math.sin(rad(deg)), o[1] + len * Math.cos(rad(deg))];

// Open polyline -> rounded (corner-cut) polyline
function chaikin(p, n = 2) {
  for (let k = 0; k < n; k++) {
    const q = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

// Closed outline of a fat rounded stroke along `pts` (width w)
export function tube(pts, w) {
  const s = chaikin(pts, 2), n = s.length, h = w / 2;
  const tan = s.map((_, i) => {
    const a = s[Math.max(0, i - 1)], b = s[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  });
  const nor = tan.map(([tx, ty]) => [-ty, tx]);
  const left = s.map((p, i) => [p[0] + nor[i][0] * h, p[1] + nor[i][1] * h]);
  const right = s.map((p, i) => [p[0] - nor[i][0] * h, p[1] - nor[i][1] * h]).reverse();
  const cap = (p, t, nn, sign) => Array.from({ length: 5 }, (_, k) => {
    const th = (Math.PI * (k + 1)) / 6;
    return [p[0] + (sign * Math.cos(th) * nn[0] + Math.sin(th) * t[0]) * h * (sign > 0 ? 1 : 1), p[1] + (sign * Math.cos(th) * nn[1] + Math.sin(th) * t[1]) * h];
  });
  // end cap sweeps left -> forward -> right; start cap right -> backward -> left
  const endCap = cap(s[n - 1], tan[n - 1], nor[n - 1], 1);
  const startCap = cap(s[0], tan[0].map((v) => -v), nor[0], -1).map((q) => q);
  return [...left, ...endCap, ...right, ...startCap];
}

// Solve a pose into joints (unit space, feet on the ground, facing +x)
export function skeleton(pose, over = {}) {
  const P = { ...POSES[pose], ...over };
  const hipDx = P.hip?.[0] ?? 0, hipDy = P.hip?.[1] ?? 0;
  const lean = P.lean ?? 0;
  const legs = (a) => { const hip = [hipDx, 0]; const knee = at(hip, THIGH, a[0]); const ankle = at(knee, SHANK, a[1]); return [hip, knee, ankle]; };
  const lN = legs(P.legN), lF = legs(P.legF);
  // the hip rests where the lower leg joints just touch the ground (y = 0, up is negative)
  const lowest = Math.max(...[...lN, ...lF].map((p) => p[1]));
  const hy = -lowest + hipDy; // hip height above ground (negative y)
  const shift = (pts) => pts.map(([x, y]) => [x, y + hy]);
  const legN = shift(lN), legF = shift(lF);
  legN.shankAngle = P.legN[1]; legF.shankAngle = P.legF[1];
  const hip = legN[0];
  const sh = [hip[0] + TORSO * Math.sin(rad(lean)), hip[1] - TORSO * Math.cos(rad(lean))];
  const arm = (a) => { const el = at(sh, UPPER, a[0]); return [sh, el, at(el, FORE, a[1])]; };
  const armN = arm(P.armN), armF = arm(P.armF);
  const ax = [Math.sin(rad(lean)), -Math.cos(rad(lean))], perp = [Math.cos(rad(lean)), Math.sin(rad(lean))];
  const gap = HEAD + BODY / 2 + 0.02;
  const head = [sh[0] + ax[0] * gap * 0.97 + (P.head?.[0] ?? 0), sh[1] + ax[1] * gap * 0.97 + (P.head?.[1] ?? 0)];
  // keep the head clear of the very top: normalise so total height is 1
  const top = Math.min(head[1] - HEAD, sh[1] - BODY / 2);
  return { P, hip, sh, head, armN, armF, legN, legF, ax, perp, top };
}

export function drawPerson(e, { pen, c }) {
  const pose = POSES[e.pose] ? e.pose : 'standing';
  const sk = skeleton(pose, e.override);
  const size = e.size ?? 200, u = size / -sk.top;
  const dir = e.facing === 'left' ? -1 : 1;
  const X = e.x, Y = e.y;
  const M = ([ux, uy]) => [f(X + dir * ux * u), f(Y + uy * u)];
  const body = c(e.color, '#FBFAF6'), line = c(e.outline, '#0A3FB0');
  const far = mix(body, line, 0.2);
  const ow = Math.max(3.4, size * 0.032);
  const o = (fill) => ({ fill, stroke: line, w: ow, offset: 0, amp: 0.45 });
  const out = [];
  const limb = (pts, fill, w = LIMB) => out.push(pen.shape(tube(pts.map(M), w * u), o(fill)));
  const legPts = (leg) => (Math.abs(leg.shankAngle) < 50 ? [leg[0], leg[1], leg[2], [leg[2][0] + 0.062, leg[2][1] + 0.004]] : leg);
  const P = sk.P;

  limb(sk.armF, far);
  limb(legPts(sk.legF), far);
  limb(legPts(sk.legN), body);
  // torso
  out.push(pen.shape(tube([sk.hip, sk.sh].map(M), BODY * u), o(body)));
  // accent: scarf (default) or bag
  if (e.accent) {
    const ac = c(e.accent), { sh, hip, ax, perp } = sk;
    const mk = (p, a, b) => [p[0] + perp[0] * a + ax[0] * b, p[1] + perp[1] * a + ax[1] * b];
    if (e.accentKind === 'bag') {
      out.push(pen.shape(tube([mk(sh, -0.07, 0), mk(hip, 0.08, 0.02)].map(M), 0.03 * u), { fill: ac, stroke: null, offset: 0, amp: 0.3 }));
      out.push(pen.shape(tube([mk(hip, 0.02, 0.03), mk(hip, 0.02, -0.1)].map(M), 0.13 * u), o(ac)));
    } else {
      out.push(pen.shape(tube([mk(sh, -0.095, 0.055), mk(sh, 0.095, 0.055)].map(M), 0.06 * u), o(ac)));
      out.push(pen.shape(tube([mk(sh, -0.07, 0.04), mk(sh, -0.115, -0.03)].map(M), 0.06 * u), o(ac)));
    }
  }
  // head: a plain circle, nothing on it
  out.push(pen.shape(ellipse(...M(sk.head), HEAD * u, HEAD * u, 14), o(body)));

  // items held in the hands (drawn between torso and the near arm, so the arm wraps over them)
  const hN = sk.armN[2], hF = sk.armF[2];
  const mid = [(hN[0] + hF[0]) / 2, (hN[1] + hF[1]) / 2];
  const itemColor = c(e.itemColor, '#F2C230');
  const rect = (cx, cy, w, h, rot, fill) => {
    const k = Math.cos(rad(rot)), s = Math.sin(rad(rot));
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].flatMap(([x, y]) => [[x, y]]);
    // dense edges so smoothing keeps the corners
    const dense = [];
    for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; for (let t = 0; t < 3; t++) dense.push([a[0] + ((b[0] - a[0]) * t) / 3, a[1] + ((b[1] - a[1]) * t) / 3]); }
    return pen.shape(dense.map(([x, y]) => M([cx + (x * k - y * s) * 1, cy + (x * s + y * k)])), o(fill));
  };
  if (P.item === 'box') out.push(rect(mid[0] + 0.04, mid[1] - 0.02, 0.22, 0.17, 0, itemColor));
  if (P.item === 'book') {
    const bx = mid[0] + 0.02, by = mid[1] - 0.05;
    out.push(rect(bx, by, 0.17, 0.2, -14, c(e.itemColor, '#FBFAF6')));
    out.push(pen.line([M([bx, by - 0.09]), M([bx - 0.02, by + 0.09])], { color: line, w: ow * 0.8, amp: 0.2 }));
  }
  if (P.item === 'hold' && e.hold) {
    const pe = expandProp({ type: 'prop', name: e.hold });
    if (pe.type === 'draw' && pe.paths?.length) {
      const sz = 0.36 * u, k = sz / 100, [cx, cy] = M([mid[0] + 0.07, mid[1] - 0.04]);
      const ps = pe.paths.map((p) => `<path d="${p.d}" fill="${p.fill && p.fill !== 'none' ? c(p.fill) : 'none'}" stroke="${p.stroke === 'none' ? 'none' : c(p.stroke, line)}" stroke-width="${(p.weight ?? 10)}" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
      out.push(`<g transform="translate(${f(cx - sz / 2)} ${f(cy - sz / 2)}) scale(${k.toFixed(4)})${dir < 0 ? ' translate(100 0) scale(-1 1)' : ''}">${ps}</g>`);
    }
  }
  limb(sk.armN, body);
  if (P.item === 'phone' && e.phone !== false) {
    out.push(rect(hN[0] + 0.012, hN[1] - 0.015, 0.06, 0.115, 0, c(e.itemColor, '#14181F')));
  }
  if (P.marks === 'wave') {
    const [wx, wy] = M([hN[0] + 0.055, hN[1] - 0.04]);
    for (const [dx, dy, a] of [[1, -0.2, -0.6], [1.3, 0.35, 0.1]]) out.push(pen.line([[wx + dir * dx * 0.05 * u, wy + dy * 0.12 * u], [wx + dir * (dx + 0.55) * 0.05 * u, wy + (dy + a) * 0.1 * u]], { color: line, w: ow * 0.8, amp: 0.2 }));
  }
  return { svg: out.join(''), bbox: [X - size * 0.38, Y - size, size * 0.76, size] };
}

// A row of people along a line: mixed poses, colours and heights, each facing a given way
export function drawPeople(e, ctx) {
  const { r, c } = ctx;
  const n = Math.max(1, e.n ?? 5), w = e.w ?? 600, size = e.size ?? 200;
  const poses = e.poses || ['standing', 'waving', 'walking', 'holding', 'cheering', 'pointing'];
  const colors = e.colors || ['paper', 'tone', 'coral', 'mustard'];
  let svg = '', box = null;
  for (let k = 0; k < n; k++) {
    const person = {
      x: e.x + (w / n) * (k + 0.5) + r.jitter(w / n * 0.06), y: (e.y ?? 560) + r.jitter(size * 0.03),
      size: size * (e.vary === false ? 1 : r.range(0.9, 1.06)), pose: poses[k % poses.length],
      color: colors[k % colors.length], outline: e.outline, accent: e.accents?.[k % e.accents.length],
      facing: e.facing === 'alternate' ? (k % 2 ? 'left' : 'right') : e.facing ?? (k < n / 2 ? 'right' : 'left'),
      hold: e.hold, itemColor: e.itemColor,
    };
    const res = drawPerson(person, ctx);
    svg += res.svg;
    box = box ? [Math.min(box[0], res.bbox[0]), Math.min(box[1], res.bbox[1]), 0, 0, Math.max(box[4] ?? 0, res.bbox[0] + res.bbox[2]), Math.max(box[5] ?? 0, res.bbox[1] + res.bbox[3])] : [...res.bbox.slice(0, 2), 0, 0, res.bbox[0] + res.bbox[2], res.bbox[1] + res.bbox[3]];
  }
  return { svg, bbox: [box[0], box[1], box[4] - box[0], box[5] - box[1]] };
}

export const PERSON_ASSETS = { person: drawPerson, people: drawPeople };
