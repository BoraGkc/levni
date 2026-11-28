// "You" card: a GitHub profile drawn as a moving, shareable square card. Public numbers only, nothing stored.
//   youStats(user, repos)  -> the numbers the card shows (from GET /users/{login} and /users/{login}/repos)
//   youScene(stats, { mark, theme }) -> a 1080 x 1080 scene that moves (levni.dev/you)
const THEMES = {
  indigo: { ground: '#4B2FD6', text: '#F4F2EC', accent: '#D6E521', bar: '#D6E521', muted: '#C9C2F5', disc: '#D6E521' },
  ink: { ground: '#14122B', text: '#F4F2EC', accent: '#FF3A44', bar: '#FF7A59', muted: '#A7A3C9', disc: '#FF7A59' },
  paper: { ground: '#F4F2EC', text: '#1B1340', accent: '#4B2FD6', bar: '#4B2FD6', muted: '#6B6680', disc: '#F2C230' },
  coral: { ground: '#F2603F', text: '#FFF6EC', accent: '#14122B', bar: '#FFE08A', muted: '#FFD9C9', disc: '#FFE08A' },
};
export const YOU_THEMES = Object.keys(THEMES);

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
export const youTerms = (s) => [...(s.topics || []), ...(s.top || []).map((r) => r.name.replace(/[-_.]/g, ' ')), String(s.language || '').toLowerCase()].filter(Boolean);

export function youScene(s, { mark = 'rocket', theme = 'indigo', year = new Date().getFullYear(), credit = true } = {}) {
  const th = THEMES[theme] || THEMES.indigo, W = 1080, H = 1080;
  const T = (text, x, y, o) => ({ type: 'type', text: String(text), x, y, ...o });
  const top = (s.top || []).slice(0, 5), max = Math.max(1, ...top.map((r) => r.stars));
  const stats = [[fmt(s.stars), s.stars === 1 ? 'star' : 'stars'], [fmt(s.repos), 'repos'], [fmt(s.followers), 'followers']];
  const els = [
    T(`${year} · IN CODE`, 72, 86, { size: 26, font: 'mono', weight: 700, tracking: 0.08, color: th.accent, motion: { type: 'fade', delay: 0, dur: 0.08 } }),
    T(`@${s.login}`, 68, 150, { w: 640, h: 120, fit: 'box', font: 'black', color: th.text, motion: { type: 'typewriter', delay: 0.04, dur: 0.2, cursor: '_' } }),
    ...(s.name && s.name !== s.login ? [T(s.name, 72, 296, { size: 34, color: th.muted, motion: { type: 'fade', delay: 0.2, dur: 0.1 } })] : []),
    { type: 'disc', x: 880, y: 230, r: 140, color: th.disc, motion: [{ type: 'pop', delay: 0.06, dur: 0.14 }, { type: 'pulse', amp: 0.03 }] },
    { type: 'prop', name: mark, x: 880, y: 225, size: 230, shadow: true, motion: [{ type: 'pop', delay: 0.12, dur: 0.14 }, { type: 'float', amp: 10 }] },
    ...stats.flatMap(([n, label], k) => [
      T(n, 72 + k * 320, 420, { w: 290, h: 120, fit: 'box', font: 'black', color: th.text, motion: { type: 'pop', delay: 0.24 + k * 0.06, dur: 0.12 } }),
      T(label.toUpperCase(), 76 + k * 320, 560, { size: 24, font: 'mono', weight: 700, tracking: 0.06, color: th.muted, motion: { type: 'fade', delay: 0.28 + k * 0.06, dur: 0.1 } }),
    ]),
    ...(top.length ? [T('TOP REPOS', 72, 650, { size: 22, font: 'mono', weight: 700, tracking: 0.08, color: th.accent, motion: { type: 'fade', delay: 0.42, dur: 0.08 } }), T('STARS', 1008, 650, { size: 22, font: 'mono', weight: 700, tracking: 0.08, align: 'right', color: th.accent, motion: { type: 'fade', delay: 0.42, dur: 0.08 } })] : []),
    ...top.flatMap((r, k) => {
      const y = 700 + k * 60, w = Math.max(14, Math.round((r.stars / max) * 520));
      return [
        { type: 'block', x: 72, y, w, h: 38, color: th.bar, motion: { type: 'wipe', from: 'left', delay: 0.44 + k * 0.05, dur: 0.16 } },
        T(r.name.length > 26 ? `${r.name.slice(0, 25)}…` : r.name, 72 + w + 18, y + 6, { size: 26, color: th.text, motion: { type: 'fade', delay: 0.5 + k * 0.05, dur: 0.1 } }),
        T(fmt(r.stars), 1008, y + 6, { size: 24, font: 'mono', weight: 700, align: 'right', color: th.muted, motion: { type: 'fade', delay: 0.5 + k * 0.05, dur: 0.1 } }),
      ];
    }),
    ...(s.language || s.since ? [T([s.language && `mostly ${s.language}`, s.since && `on GitHub since ${s.since}`].filter(Boolean).join(' · '), 72, 1012, { size: 24, color: th.muted, motion: { type: 'fade', delay: 0.62, dur: 0.1 } })] : []),
    ...(credit ? [T('levni.dev/you', 1008, 1012, { size: 22, font: 'mono', weight: 700, align: 'right', color: th.accent })] : []),
  ];
  return { canvas: [W, H], seed: [...String(s.login)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7) + 1, finish: 'soft', grain: 0.04, background: th.ground, elements: els };
}
