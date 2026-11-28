// Scene diff: what changed between two versions of a scene, field by field. The visual half (the pixels that changed)
// lives in the Hub page; this is the half you can read and test.
//   sceneDiff(a, b) -> { scene: [{ key, from, to }], elements: [{ status, a, b, type, label, changes }], summary }
const SKIP = new Set(['credits']);
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const label = (e) => (e?.name || (typeof e?.text === 'string' ? `“${e.text.slice(0, 24)}”` : '') || e?.shot || '');
const sig = (e) => `${e?.type}|${e?.name ?? ''}|${typeof e?.text === 'string' ? e.text : ''}`;

function fieldChanges(x = {}, y = {}) {
  const keys = [...new Set([...Object.keys(x), ...Object.keys(y)])].filter((k) => !SKIP.has(k) && k !== 'elements');
  return keys.filter((k) => !same(x[k], y[k])).map((k) => ({ key: k, from: x[k], to: y[k] }));
}

export function sceneDiff(a, b) {
  const A = Array.isArray(a?.elements) ? a.elements : [], B = Array.isArray(b?.elements) ? b.elements : [];
  // pair elements: exact signature first (in order), then same type at the nearest free index
  const pairOfA = new Array(A.length).fill(-1), usedB = new Set();
  A.forEach((e, i) => { const j = B.findIndex((f, k) => !usedB.has(k) && sig(f) === sig(e)); if (j >= 0) { pairOfA[i] = j; usedB.add(j); } });
  A.forEach((e, i) => {
    if (pairOfA[i] >= 0) return;
    let best = -1;
    B.forEach((f, k) => { if (!usedB.has(k) && f?.type === e?.type && (best < 0 || Math.abs(k - i) < Math.abs(best - i))) best = k; });
    if (best >= 0) { pairOfA[i] = best; usedB.add(best); }
  });
  const rows = [];
  A.forEach((e, i) => {
    const j = pairOfA[i];
    if (j < 0) rows.push({ status: 'removed', a: i, b: null, type: e?.type, label: label(e), changes: [] });
    else { const ch = fieldChanges(e, B[j]); rows.push({ status: ch.length ? 'changed' : 'same', a: i, b: j, type: e?.type, label: label(B[j]) || label(e), changes: ch }); }
  });
  B.forEach((f, k) => { if (!usedB.has(k)) rows.push({ status: 'added', a: null, b: k, type: f?.type, label: label(f), changes: [] }); });
  rows.sort((x, y) => (x.b ?? x.a + 0.5) - (y.b ?? y.a + 0.5));
  const scene = fieldChanges(a || {}, b || {});
  const count = (s) => rows.filter((r) => r.status === s).length;
  return { scene, elements: rows, summary: { added: count('added'), removed: count('removed'), changed: count('changed'), same: count('same'), scene: scene.length } };
}
