// Fusion slots: a prop variant may name anchors in its 0..100 box ("slots": {"screen": [x, y, w, h], "top": [x, y]}).
// A scene element with { "in": { "ref": "<id>" | "prop": "<name>", "slot": "<slot>" } } is then placed into that anchor:
// scaled to the rect (contain, times "fit", default 0.9) or standing with its bottom-centre on the point.
// Runs after props are expanded, before drawing. Docs: docs/scene.md ("Slots").
import { flattenPath } from './ink.mjs';

const CHILD_TYPES = new Set(['draw', 'icon', 'glyphs', 'label', 'panel']);

// the host's real geometry: a `fit: true` host is re-centred and re-scaled by compose.mjs, so predict it here
function hostGeometry(e) {
  let { x, y, size = 200 } = e;
  if (e.fit && e.paths?.length) {
    const b = inkBox(e.paths, e.flip, 0);
    const s1 = (size * 100) / Math.max(b.w, b.h, 1), k1 = s1 / 100;
    x -= (b.cx - 50) * k1; y -= (b.cy - 50) * k1; size = s1;
  }
  return { x, y, size };
}

// visible ink box in 0..100 space after rotating (about 50,50) and flipping, in the order the renderer applies them
function inkBox(paths, flip, rot) {
  const rad = ((rot || 0) * Math.PI) / 180, co = Math.cos(rad), si = Math.sin(rad);
  const pts = paths.flatMap((p) => flattenPath(p.d, 4).flat()).map(([px, py]) => {
    const dx = px - 50, dy = py - 50;
    const rx = 50 + dx * co - dy * si, ry = 50 + dx * si + dy * co;
    return [flip ? 100 - rx : rx, ry];
  });
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// a point of the host's 0..100 box on the canvas (rotate, then flip, then scale: same order as the renderer)
function toCanvas(h, rot, flip, px, py) {
  const rad = ((rot || 0) * Math.PI) / 180, dx = px - 50, dy = py - 50;
  let rx = 50 + dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = 50 + dx * Math.sin(rad) + dy * Math.cos(rad);
  if (flip) rx = 100 - rx;
  const k = h.size / 100;
  return [h.x - h.size / 2 + rx * k, h.y - h.size / 2 + ry * k];
}

export function resolveSlots(elements) {
  const byId = new Map(), lastByProp = new Map();
  const register = (e) => {
    if (e.id != null) byId.set(e.id, e);
    if (e._prop) lastByProp.set(e._prop, e);
  };
  return elements.map((e, i) => {
    let out = e;
    if (e.in) {
      const host = pickHost(e, i, byId, lastByProp);
      out = place(e, host);
    }
    register(out);
    return out;
  });
}

function pickHost(e, i, byId, lastByProp) {
  const { ref, prop } = e.in;
  const who = `element ${i}${e.name ? ` "${e.name}"` : ''}`;
  let host;
  if (ref != null) {
    host = byId.get(ref);
    if (!host) throw new Error(`${who}: in.ref "${ref}" matches no earlier element id (earlier ids: ${[...byId.keys()].join(', ') || 'none; give the host an "id"'})`);
  } else if (prop != null) {
    host = lastByProp.get(prop);
    if (!host) throw new Error(`${who}: in.prop "${prop}" matches no earlier prop element (earlier props: ${[...lastByProp.keys()].join(', ') || 'none'})`);
  } else throw new Error(`${who}: "in" needs "ref" (an element id) or "prop" (a prop name)`);
  if (!host._slots) throw new Error(`${who}: host "${ref ?? prop}" (variant used: ${host.variant ?? 0}) declares no slots; slots exist on some props, see "slots" in library/props/*.json`);
  return host;
}

function place(e, hostEl) {
  const who = `"${e.name ?? e.type}"`;
  if (!CHILD_TYPES.has(e.type)) throw new Error(`${who}: type "${e.type}" cannot go in a slot (use prop, draw, icon, glyphs, label or panel)`);
  const slots = hostEl._slots, name = e.in.slot;
  const s = slots[name];
  if (!s) throw new Error(`${who}: host "${hostEl._prop}" has no slot "${name}". Available slots: ${Object.keys(slots).map((n) => `${n} (${slots[n].length >= 4 ? 'rect' : 'point'})`).join(', ')}`);
  const h = hostGeometry(hostEl), k = h.size / 100;
  const hrot = hostEl.rot || 0, hflip = !!hostEl.flip;
  const ang = hflip ? -hrot : hrot; // rotate-then-mirror turns the content by -rot
  const fit = typeof e.fit === 'number' ? e.fit : 0.9;
  const o = { ...e };
  delete o.in; delete o.fit;
  const rot = (o.rot || 0) + ang;
  if (rot) o.rot = rot; else delete o.rot;
  const isRect = s.length >= 4;
  if (isRect && s[4]) { const r5 = (o.rot || 0) + (hflip ? -s[4] : s[4]); if (r5) o.rot = r5; else delete o.rot; } // a tilted rect slot (5th number, degrees)
  let cx, cy, sw = 0, sh = 0, bottom = null;
  if (isRect) {
    [cx, cy] = toCanvas(h, hrot, hflip, s[0] + s[2] / 2, s[1] + s[3] / 2);
    sw = s[2] * k * fit; sh = s[3] * k * fit;
  } else {
    [cx, cy] = toCanvas(h, hrot, hflip, s[0], s[1]);
    bottom = cy;
  }
  cx += o.dx ?? 0; cy += o.dy ?? 0; delete o.dx; delete o.dy;
  if (bottom != null) bottom = cy;

  if (o.type === 'draw') {
    if (!o.paths?.length) throw new Error(`${who}: nothing to draw in the slot`);
    const b0 = inkBox(o.paths, o.flip, o.rot || 0);
    let size;
    if (isRect) size = 100 * Math.min(sw / Math.max(b0.w, 1), sh / Math.max(b0.h, 1));
    else size = (o.size ?? h.size * 0.3) * (typeof e.fit === 'number' ? e.fit : 1);
    const kc = size / 100;
    o.size = size;
    o.x = cx - (b0.cx - 50) * kc;
    o.y = isRect ? cy - (b0.cy - 50) * kc : bottom - (b0.y1 - 50) * kc;
    return o;
  }
  if (!isRect) {
    if (o.type === 'label') return { ...o, x: cx, y: cy, anchor: o.anchor ?? 'middle' };
    if (o.type === 'icon') { const size = o.size ?? h.size * 0.3; return { ...o, x: cx, y: cy - size / 2, size }; }
    throw new Error(`${who}: "${o.type}" needs a rect slot, "${name}" is a point`);
  }
  if (o.type === 'icon') { o.size = Math.min(sw, sh); o.x = cx; o.y = cy; return o; }
  if (o.type === 'label') {
    const len = String(o.text ?? '').length || 1;
    o.size = o.size ?? Math.max(6, Math.min(sh * 0.6, sw / (len * 0.62 + 0.2)));
    return { ...o, x: cx, y: cy + o.size * 0.35, anchor: o.anchor ?? 'middle' };
  }
  // glyphs, panel
  return { ...o, x: cx - sw / 2, y: cy - sh / 2, w: sw, h: sh };
}
