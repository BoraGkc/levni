// "You" card: a GitHub profile drawn as a moving, shareable square card. Public numbers only, nothing stored.
//   youStats(user, repos)  -> the numbers the card shows (from GET /users/{login} and /users/{login}/repos)
//   youScene(stats, { mark, theme }) -> a 1080 x 1080 scene that moves (levni.dev/you)
// looks: colours, finish, fonts and a little decoration each. House colour names (ink, coral…) follow style packs.
const LOOKS = {
  riso: { label: 'Riso', finish: 'crayon', ground: 'paper', text: 'ink', accent: 'coral', bar: 'blue', muted: '#6B6680', disc: 'mustard', num: 'black' },
  clean: { label: 'Clean', finish: 'soft', ground: '#4B2FD6', text: '#F4F2EC', accent: '#D6E521', bar: '#D6E521', muted: '#C9C2F5', disc: '#D6E521', num: 'black' },
  night: { label: 'Night', finish: 'soft', ground: '#14122B', text: '#F4F2EC', accent: '#FF7A59', bar: '#7A5CFF', muted: '#A7A3C9', disc: '#FF7A59', num: 'black', glow: true },
  dots: { label: 'Dots', finish: 'crayon', ground: 'paper', text: 'ink', accent: 'coral', bar: 'coral', muted: '#6B6680', disc: 'tone-coral', num: 'black', dots: true },
  ascii: { label: 'ASCII', finish: 'soft', ground: '#0E1A12', text: '#8CFFA8', accent: '#F2C230', bar: '#3FBF6A', muted: '#5FA874', disc: null, num: 'mono', font: 'mono', globe: true },
  pixel: { label: 'Pixel', finish: 'soft', ground: '#9BBC0F', text: '#0F380F', accent: '#306230', bar: '#306230', muted: '#306230', disc: '#8BAC0F', num: 'pixel', font: 'pixel', style: { blue: '#0F380F', ink: '#0F380F', coral: '#306230', mustard: '#8BAC0F', green: '#306230', paper: '#C5D88A', white: '#C5D88A', tone: '#8BAC0F' } },
  miniature: { label: 'Miniature', finish: 'crayon', ground: 'paper', text: 'ink', accent: 'coral', bar: 'blue', muted: '#6B5A4A', disc: 'mustard', num: 'black', style: 'miniature' },
};
// old theme names still work
const ALIAS = { indigo: 'clean', ink: 'night', paper: 'riso', coral: 'dots' };
export const YOU_LOOKS = Object.entries(LOOKS).map(([id, l]) => ({ id, label: l.label }));
export const YOU_THEMES = Object.keys(LOOKS);

const fmt = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M` : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}k` : String(n));

export function youStats(user, repos = []) {
  const own = repos.filter((r) => r && !r.fork);
  const stars = own.reduce((a, r) => a + (r.stargazers_count || 0), 0);
  const langs = new Map();
  for (const r of own) if (r.language) langs.set(r.language, (langs.get(r.language) || 0) + 1 + (r.stargazers_count || 0) * 0.01);
  const top = own.slice().sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0, 5);
  return {
    login: user.login, name: user.name || user.login, followers: user.followers || 0, repos: user.public_repos ?? own.length,
    since: user.created_at ? Number(String(user.created_at).slice(0, 4)) : null, stars,
    language: [...langs.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    topics: [...new Set(own.flatMap((r) => r.topics || []))].slice(0, 12),
    top: top.map((r) => ({ name: r.name, stars: r.stargazers_count || 0 })),
  };
}

// the words a mark is picked from: topics, then the top repos' names, then the language
const NOISE = new Set(['test', 'tests', 'demo', 'example', 'examples', 'config', 'dotfiles', 'github', 'io', 'app', 'lib', 'api', 'tool', 'tools', 'tlb', 'the', 'my', 'and', 'for', 'js', 'ts']);
const clean = (t) => t.split(' ').filter((w) => w.length > 2 && !NOISE.has(w.toLowerCase())).join(' ');
export const youTerms = (s) => [...(s.topics || []), ...(s.top || []).map((r) => r.name.replace(/[-_.]/g, ' ')), String(s.language || '').toLowerCase()].map((t) => clean(String(t))).filter(Boolean);

// a crisp five-point star in the look's accent (the Folio star is drawn in house inks, which vanish on dark grounds)
const STAR = 'M50 4 L61.8 36.6 L96.6 37.6 L69.1 58.9 L78.8 92.4 L50 72.8 L21.2 92.4 L30.9 58.9 L3.4 37.6 L38.2 36.6 Z';
const starShape = (x, y, size, color, motion) => ({ type: 'draw', x, y, size, paths: [{ d: STAR, fill: color, stroke: 'none' }], ...(motion ? { motion } : {}) });

export function youScene(s, { mark = 'rocket', theme = 'clean', look, year = new Date().getFullYear(), credit = true } = {}) {
  const id = look || ALIAS[theme] || theme, L = LOOKS[id] || LOOKS.clean, W = 1080, H = 1080, M = 72;
  const T = (text, x, y, o) => ({ type: 'type', text: String(text), x, y, ...o });
  const font = (f) => L.font || f;
  const top = (s.top || []).slice(0, 5), max = Math.max(1, ...top.map((r) => r.stars));
  const els = [];
  // decoration first, behind everything
  if (L.glow) els.push({ type: 'meshgrad', x: 0, y: 0, w: W, h: H, base: '#14122B', drift: 0.14, colors: ['#FF7A59', '#7A5CFF', '#38D6E8'], grain: 0, stops: [{ x: 0.85, y: 0.15, color: '#7A5CFF', r: 0.55 }, { x: 0.15, y: 1, color: '#FF7A59', r: 0.5, opacity: 0.6 }] });
  if (L.dots) els.push({ type: 'halftone', x: 700, y: 0, w: 380, h: 380, color: 'tone-coral', mode: 'radial', gap: 16 });
  // header: year, handle, name; the drawing on the right
  els.push(T(`${year} · IN CODE`, M, 86, { size: 24, font: 'mono', weight: 700, tracking: 0.08, color: L.accent, motion: { type: 'fade', delay: 0, dur: 0.08 } }));
  els.push(T(`@${s.login}`, M - 4, 140, { w: 570, h: 104, fit: 'box', font: font('black'), color: L.text, motion: { type: 'typewriter', delay: 0.04, dur: 0.2, cursor: '_' } }));
  if (s.name && s.name !== s.login) els.push(T(s.name, M, 274, { size: 32, font: font('grotesk'), color: L.muted, motion: { type: 'fade', delay: 0.2, dur: 0.1 } }));
  if (L.globe) els.push({ type: 'glyphfill', shape: 'sphere', x: 878, y: 196, size: 260, cell: 9, color: L.bar, accent: L.accent, land: 0.42 });
  else {
    if (L.disc) els.push({ type: 'disc', x: 878, y: 196, r: 128, color: L.disc, motion: [{ type: 'pop', delay: 0.06, dur: 0.14 }, { type: 'pulse', amp: 0.03 }] });
    els.push({ type: 'prop', name: mark, x: 878, y: 192, size: 214, shadow: true, motion: [{ type: 'pop', delay: 0.12, dur: 0.14 }, { type: 'float', amp: 9 }] });
  }
  // the three numbers: equal cells, one size for all, a rule above each, the label under it
  const stats = [[fmt(s.stars), s.stars === 1 ? 'star' : 'stars', true], [fmt(s.repos), 'repos'], [fmt(s.followers), 'followers']];
  const gap = 28, cw = (W - 2 * M - 2 * gap) / 3, y0 = 372;
  const longest = Math.max(...stats.map(([n]) => n.length));
  const size = Math.round(Math.min(112, (cw - 12) / (longest * (L.num === 'black' ? 0.78 : 0.66))));
  stats.forEach(([n, label, star], k) => {
    const x = M + k * (cw + gap);
    els.push({ type: 'block', x, y: y0, w: Math.round(cw), h: 4, color: L.accent, motion: { type: 'wipe', from: 'left', delay: 0.22 + k * 0.05, dur: 0.12 } });
    els.push(T(n, x, y0 + 34, { size, font: L.num, color: L.text, motion: { type: 'pop', delay: 0.26 + k * 0.06, dur: 0.12 } }));
    const ly = y0 + 34 + size * 0.78 + 30;
    if (star) els.push(starShape(x + 14, ly + 9, 30, L.accent, [{ type: 'pop', delay: 0.32, dur: 0.12 }, { type: 'spin', turns: 1 }]));
    els.push(T(label.toUpperCase(), x + (star ? 36 : 0), ly, { size: 22, font: 'mono', weight: 700, tracking: 0.08, color: L.muted, motion: { type: 'fade', delay: 0.3 + k * 0.06, dur: 0.1 } }));
  });
  // top repos: a bar per repo, the name after it, its stars on the right with a small star
  if (top.length) {
    const ty = 600;
    els.push(T('TOP REPOS', M, ty, { size: 20, font: 'mono', weight: 700, tracking: 0.1, color: L.accent, motion: { type: 'fade', delay: 0.42, dur: 0.08 } }));
    top.forEach((r, k) => {
      const y = ty + 46 + k * 66, w = Math.max(12, Math.round((r.stars / max) * 440));
      const name = r.name.length > 24 ? `${r.name.slice(0, 23)}…` : r.name;
      els.push({ type: 'block', x: M, y, w, h: 40, color: L.bar, motion: { type: 'wipe', from: 'left', delay: 0.44 + k * 0.05, dur: 0.16 } });
      els.push(T(name, M + w + 16, y + 9, { size: 25, font: font('grotesk'), color: L.text, motion: { type: 'fade', delay: 0.5 + k * 0.05, dur: 0.1 } }));
      els.push(T(fmt(r.stars), W - M, y + 10, { size: 23, font: 'mono', weight: 700, align: 'right', color: L.text, motion: { type: 'fade', delay: 0.5 + k * 0.05, dur: 0.1 } }));
      els.push(starShape(W - M - fmt(r.stars).length * 14.5 - 20, y + 20, 26, L.accent, { type: 'fade', delay: 0.5 + k * 0.05, dur: 0.1 }));
    });
  }
  const foot = [s.language && `mostly ${s.language}`, s.since && `on GitHub since ${s.since}`].filter(Boolean).join(' · ');
  if (foot) els.push(T(foot, M, 1016, { size: 22, font: font('grotesk'), color: L.muted, motion: { type: 'fade', delay: 0.62, dur: 0.1 } }));
  if (credit) els.push(T('levni.dev/you', W - M, 1016, { size: 20, font: 'mono', weight: 700, align: 'right', color: L.accent }));
  return { canvas: [W, H], seed: [...String(s.login)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) + 1, finish: L.finish, grain: L.finish === 'soft' ? 0.04 : undefined, background: L.ground, ...(L.style ? { style: L.style } : {}), elements: els };
}
