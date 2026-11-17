(() => {
  'use strict';

  const CFG = Object.assign(
    { sheetCsvUrl: '', season: 2026, leagueName: "Family Pick'em", tieCountsAsWin: true },
    window.PICKEM_CONFIG || {}
  );
  const QS = new URLSearchParams(location.search);
  const DEMO = QS.has('demo') || !CFG.sheetCsvUrl;
  const ME_KEY = 'pickem.me';

  // ── Teams ────────────────────────────────────────────────────
  // code: [nickname, city, ...other spellings people might type]
  const TEAMS = {
    ARI: ['Cardinals', 'Arizona', 'Cards', 'AZ'],
    ATL: ['Falcons', 'Atlanta'],
    BAL: ['Ravens', 'Baltimore'],
    BUF: ['Bills', 'Buffalo'],
    CAR: ['Panthers', 'Carolina'],
    CHI: ['Bears', 'Chicago'],
    CIN: ['Bengals', 'Cincinnati', 'Cincy'],
    CLE: ['Browns', 'Cleveland'],
    DAL: ['Cowboys', 'Dallas'],
    DEN: ['Broncos', 'Denver'],
    DET: ['Lions', 'Detroit'],
    GB: ['Packers', 'Green Bay', 'GNB', 'Pack'],
    HOU: ['Texans', 'Houston'],
    IND: ['Colts', 'Indianapolis', 'Indy'],
    JAX: ['Jaguars', 'Jacksonville', 'Jags', 'JAC'],
    KC: ['Chiefs', 'Kansas City', 'KAN'],
    LV: ['Raiders', 'Las Vegas', 'LVR', 'OAK'],
    LAC: ['Chargers', 'LA Chargers', 'Los Angeles Chargers', 'Bolts'],
    LAR: ['Rams', 'LA Rams', 'Los Angeles Rams'],
    MIA: ['Dolphins', 'Miami', 'Fins'],
    MIN: ['Vikings', 'Minnesota', 'Vikes'],
    NE: ['Patriots', 'New England', 'Pats', 'NWE'],
    NO: ['Saints', 'New Orleans', 'NOR'],
    NYG: ['Giants', 'NY Giants', 'New York Giants'],
    NYJ: ['Jets', 'NY Jets', 'New York Jets'],
    PHI: ['Eagles', 'Philadelphia', 'Philly'],
    PIT: ['Steelers', 'Pittsburgh'],
    SF: ['49ers', 'San Francisco', 'Niners', 'SFO'],
    SEA: ['Seahawks', 'Seattle', 'Hawks'],
    TB: ['Buccaneers', 'Tampa Bay', 'Bucs', 'Tampa', 'TAM'],
    TEN: ['Titans', 'Tennessee'],
    WSH: ['Commanders', 'Washington', 'WAS', 'Commies'],
  };
  // Tile colors for each team: [background, text, stripe].
  const TEAM_COLORS = {
    ARI: ['#97233F', '#FFFFFF', '#FFB612'], ATL: ['#A71930', '#FFFFFF', '#000000'],
    BAL: ['#241773', '#FFFFFF', '#9E7C0C'], BUF: ['#00338D', '#FFFFFF', '#C60C30'],
    CAR: ['#0085CA', '#FFFFFF', '#101820'], CHI: ['#0B162A', '#FFFFFF', '#C83803'],
    CIN: ['#FB4F14', '#000000', '#000000'], CLE: ['#311D00', '#FFFFFF', '#FF3C00'],
    DAL: ['#003594', '#FFFFFF', '#869397'], DEN: ['#FB4F14', '#002244', '#002244'],
    DET: ['#0076B6', '#FFFFFF', '#B0B7BC'], GB: ['#203731', '#FFB612', '#FFB612'],
    HOU: ['#03202F', '#FFFFFF', '#A71930'], IND: ['#002C5F', '#FFFFFF', '#A2AAAD'],
    JAX: ['#006778', '#FFFFFF', '#D7A22A'], KC: ['#E31837', '#FFFFFF', '#FFB81C'],
    LV: ['#000000', '#A5ACAF', '#A5ACAF'], LAC: ['#0080C6', '#FFFFFF', '#FFC20E'],
    LAR: ['#003594', '#FFD100', '#FFA300'], MIA: ['#008E97', '#FFFFFF', '#FC4C02'],
    MIN: ['#4F2683', '#FFFFFF', '#FFC62F'], NE: ['#002244', '#FFFFFF', '#C60C30'],
    NO: ['#101820', '#D3BC8D', '#D3BC8D'], NYG: ['#0B2265', '#FFFFFF', '#A71930'],
    NYJ: ['#125740', '#FFFFFF', '#000000'], PHI: ['#004C54', '#FFFFFF', '#A5ACAF'],
    PIT: ['#101820', '#FFB612', '#FFB612'], SF: ['#AA0000', '#FFFFFF', '#B3995D'],
    SEA: ['#002244', '#FFFFFF', '#69BE28'], TB: ['#D50A0A', '#FFFFFF', '#34302B'],
    TEN: ['#0C2340', '#FFFFFF', '#4B92DB'], WSH: ['#5A1414', '#FFB612', '#FFB612'],
  };
  const teamTile = (t) => {
    const c = TEAM_COLORS[t];
    const style = c ? ` style="--tc:${c[0]};--tt:${c[1]};--ts:${c[2]}"` : '';
    return `<span class="abbr${c ? ' colored' : ''}"${style} aria-hidden="true">${esc(t)}</span>`;
  };
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const ALIAS = {};
  for (const [code, names] of Object.entries(TEAMS)) {
    ALIAS[norm(code)] = code;
    names.forEach((n) => (ALIAS[norm(n)] = code));
    ALIAS[norm(names[1] + names[0])] = code; // "Baltimore Ravens"
  }
  function teamCode(text) {
    const k = norm(text);
    if (!k) return null;
    if (ALIAS[k]) return ALIAS[k];
    for (const [code, names] of Object.entries(TEAMS)) {
      if (k.includes(norm(names[0]))) return code; // "Ravens!" or "Balt Ravens"
    }
    // Small typos: "Brocnos", "cowobys"
    let best = null, bestD = 3, tie = false;
    for (const [code, names] of Object.entries(TEAMS)) {
      for (const n of names) {
        const d = editDistance(k, norm(n));
        if (d < bestD) { best = code; bestD = d; tie = false; }
        else if (d === bestD && best !== code) tie = true;
      }
    }
    return best && !tie && bestD <= (k.length > 5 ? 2 : 1) ? best : null;
  }
  // Edit distance where swapping two neighboring letters counts as one typo.
  function editDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
    return d[a.length][b.length];
  }

  const teamName = (c) => (TEAMS[c] ? TEAMS[c][0] : c);

  // ── Helpers ──────────────────────────────────────────────────
  const $ = (s) => document.querySelector(s);
  const esc = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;
  function listNames(arr) {
    if (arr.length <= 1) return arr.join('');
    if (arr.length === 2) return arr.join(' and ');
    return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
  }
  function kickoffText(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  function parseCSV(text) {
    const rows = [];
    let row = [], f = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.map((r) => r.map((s) => s.trim()));
  }

  // ── Read the sheet tab ───────────────────────────────────────
  function parseSheet(rows) {
    const settings = {}, warnings = [], people = [], games = [], guesses = {};
    let header = null, ovCol = -1;
    for (const r of rows) {
      const first = r[0] || '';
      const key = first.toLowerCase().replace(/[:\s]+$/, '');
      if (!header) {
        if (key === 'away') {
          header = r;
          r.forEach((h, j) => {
            if (j < 2 || !h) return;
            if (/winner|override|result/i.test(h)) ovCol = j;
            else people.push({ name: h, col: j });
          });
        } else if (first) settings[key] = r[1] || '';
        continue;
      }
      if (r.every((c) => !c)) continue;
      if (/^(tie\s*-?\s*break|mnf)/i.test(first)) {
        people.forEach((p) => {
          const v = parseFloat(String(r[p.col] || '').replace(/[^0-9.]/g, ''));
          if (!isNaN(v)) guesses[p.name] = v;
        });
        continue;
      }
      const away = teamCode(r[0]), home = teamCode(r[1]);
      if (!away || !home || away === home) {
        warnings.push(`Couldn't read the teams in the row “${r[0]} / ${r[1]}”, so that row is skipped.`);
        continue;
      }
      const g = { away, home, picks: {}, override: null };
      if (ovCol >= 0 && r[ovCol]) {
        const o = /^tie[d]?$/i.test(r[ovCol]) ? 'TIE' : teamCode(r[ovCol]);
        if (o === 'TIE' || o === away || o === home) g.override = o;
        else warnings.push(`Winner override “${r[ovCol]}” for ${teamName(away)} @ ${teamName(home)} isn't one of those two teams, so it's ignored.`);
      }
      people.forEach((p) => {
        const raw = r[p.col] || '';
        if (!raw) return;
        const t = teamCode(raw);
        if (t === away || t === home) g.picks[p.name] = t;
        else warnings.push(`${p.name}'s pick “${raw}” for ${teamName(away)} @ ${teamName(home)} isn't one of those two teams, so it isn't counted.`);
      });
      games.push(g);
    }
    if (!header) throw new Error('The sheet tab needs a header row that starts with “Away” in column A.');
    if (!games.length) throw new Error('No games found under the “Away / Home” header row.');
    people.forEach((p) => {
      const missing = games.filter((g) => !g.picks[p.name]);
      if (missing.length && missing.length < games.length)
        warnings.push(`${p.name} has no pick for ${listNames(missing.map((g) => `${teamName(g.away)} @ ${teamName(g.home)}`))}.`);
      else if (missing.length === games.length) warnings.push(`${p.name} has no picks entered yet.`);
    });
    const week = parseInt(settings.week, 10);
    const rule = /same/i.test(settings['tiebreaker rule'] || '') ? 'same' : 'closest';
    const tbTotal = parseFloat(settings['tiebreaker total']);
    const weekWinner = (settings['week winner'] || '').split(/\s*(?:,|&|\band\b)\s*/i).filter(Boolean);
    return { week: isNaN(week) ? null : week, rule, weekWinner, provisional: settings.provisional || '', tbTotalOverride: isNaN(tbTotal) ? null : tbTotal, people: people.map((p) => p.name), games, guesses, warnings };
  }

  // ── Live scores (ESPN public scoreboard) ─────────────────────
  function normalizeEspn(json) {
    return (json.events || []).map((ev) => {
      const comp = (ev.competitions || [])[0] || {};
      const cs = comp.competitors || [];
      const a = cs.find((c) => c.homeAway === 'away') || cs[0] || {};
      const h = cs.find((c) => c.homeAway === 'home') || cs[1] || {};
      const st = ((comp.status || ev.status || {}).type) || {};
      return {
        away: teamCode(a.team && a.team.abbreviation),
        home: teamCode(h.team && h.team.abbreviation),
        awayScore: Number(a.score) || 0,
        homeScore: Number(h.score) || 0,
        state: st.state === 'post' && st.completed === false ? 'pre' : st.state || 'pre',
        detail: st.shortDetail || st.detail || '',
        date: ev.date || comp.date || null,
      };
    });
  }
  function demoEvents() {
    return window.PICKEM_DEMO.games.map(([away, home, as, hs, state, date, detail]) => ({
      away, home, awayScore: as, homeScore: hs, state, date, detail,
    }));
  }

  function merge(sheet, events, liveOk) {
    const warnings = [];
    const games = sheet.games.map((g, i) => {
      const ev = events.find((e) => (e.away === g.away && e.home === g.home) || (e.away === g.home && e.home === g.away));
      const m = { ...g, idx: i, state: 'pre', awayScore: null, homeScore: null, winner: null, tie: false, detail: '', date: null, manual: false };
      if (ev) {
        const flip = ev.away !== g.away;
        m.awayScore = flip ? ev.homeScore : ev.awayScore;
        m.homeScore = flip ? ev.awayScore : ev.homeScore;
        m.state = ev.state;
        m.detail = ev.detail;
        m.date = ev.date;
        if (m.state === 'post') {
          if (m.awayScore > m.homeScore) m.winner = g.away;
          else if (m.homeScore > m.awayScore) m.winner = g.home;
          else m.tie = true;
        }
      } else if (liveOk) {
        warnings.push(`${teamName(g.away)} @ ${teamName(g.home)} isn't on the NFL schedule for Week ${sheet.week}. Check the teams in that row.`);
      }
      if (g.override) {
        m.winner = g.override === 'TIE' ? null : g.override;
        m.tie = g.override === 'TIE';
        if (m.state !== 'post') { m.state = 'post'; m.manual = true; }
      }
      return m;
    });
    const covered = new Set(games.flatMap((g) => [g.away, g.home]));
    const byes = liveOk && events.length ? Object.keys(TEAMS).filter((c) => !covered.has(c) && !events.some((e) => e.away === c || e.home === c)) : [];
    const missingFromSheet = liveOk ? events.filter((e) => !covered.has(e.away) && !covered.has(e.home)) : [];
    missingFromSheet.forEach((e) => warnings.push(`${teamName(e.away)} @ ${teamName(e.home)} is on this week's schedule but not in the sheet.`));
    return { games, byes, warnings };
  }

  // ── Scoring ──────────────────────────────────────────────────
  function score(people, games) {
    return people.map((name) => {
      const s = { name, w: 0, l: 0, upNow: 0, downNow: 0, open: 0 };
      for (const g of games) {
        const p = g.picks[name];
        if (g.state === 'post') {
          if (!p) continue;
          if ((g.winner && p === g.winner) || (g.tie && CFG.tieCountsAsWin)) s.w++; else s.l++;
        } else {
          if (!p) continue;
          s.open++;
          if (g.state === 'in') {
            const lead = g.awayScore > g.homeScore ? g.away : g.homeScore > g.awayScore ? g.home : null;
            if (lead === p) s.upNow++;
            else if (lead) s.downNow++;
          }
        }
      }
      s.max = s.w + s.open;
      return s;
    });
  }

  // Tries every possible outcome of the games still to finish.
  function analyze(people, games, stats, rule, guesses, tbTotal) {
    const tbIdx = games.length - 1;
    const tb = games[tbIdx];
    const open = games.map((g, i) => i).filter((i) => games[i].state !== 'post').slice(0, 16);
    const n = open.length, N = 1 << n, P = people.length;
    const res = people.map(() => ({ win: 0, maybe: 0, lose: 0, seen: new Array(n).fill(0) }));
    const base = stats.map((s) => s.w);
    const scores = new Array(P);
    for (let s = 0; s < N; s++) {
      for (let p = 0; p < P; p++) scores[p] = base[p];
      let mnfWinner = tb.state === 'post' ? tb.winner : null;
      for (let k = 0; k < n; k++) {
        const g = games[open[k]];
        const w = (s >> k) & 1 ? g.home : g.away;
        if (open[k] === tbIdx) mnfWinner = w;
        for (let p = 0; p < P; p++) if (g.picks[people[p]] === w) scores[p]++;
      }
      let top = -1;
      for (let p = 0; p < P; p++) if (scores[p] > top) top = scores[p];
      let set = [];
      for (let p = 0; p < P; p++) if (scores[p] === top) set.push(p);
      if (set.length > 1 && rule === 'same' && mnfWinner) {
        const f = set.filter((p) => tb.picks[people[p]] === mnfWinner);
        if (f.length) set = f;
      }
      let outcome; // per person: 'win' | 'maybe' | 'lose'
      if (set.length > 1 && tbTotal != null && set.every((p) => guesses[people[p]] != null)) {
        const d = set.map((p) => (guesses[people[p]] != null ? Math.abs(guesses[people[p]] - tbTotal) : Infinity));
        const best = Math.min(...d);
        set = set.filter((p, i) => d[i] === best);
        outcome = 'win';
      } else outcome = set.length === 1 ? 'win' : 'maybe';
      for (const p of set) {
        res[p][outcome]++;
        for (let k = 0; k < n; k++) res[p].seen[k] |= (s >> k) & 1 ? 2 : 1;
      }
      for (let p = 0; p < P; p++) if (!set.includes(p)) res[p].lose++;
    }
    return people.map((name, p) => {
      const r = res[p];
      const alive = r.win + r.maybe > 0;
      const needs = [];
      if (alive) r.seen.forEach((v, k) => { const g = games[open[k]]; if (v === 1) needs.push(g.away); if (v === 2) needs.push(g.home); });
      return {
        name,
        alive,
        clinched: alive && r.lose === 0 && r.maybe === 0,
        tbOnly: alive && r.win === 0,
        needs,
        outcomes: N,
        openCount: n,
        shareOfOutcomes: (r.win + r.maybe) / N,
      };
    });
  }

  function scoreWeek(sheet, events, liveOk) {
    const merged = merge(sheet, events, liveOk);
    const tb = merged.games[merged.games.length - 1];
    const tbTotal = sheet.tbTotalOverride != null ? sheet.tbTotalOverride
      : tb.state === 'post' && !tb.manual && tb.awayScore != null ? tb.awayScore + tb.homeScore : null;
    const stats = score(sheet.people, merged.games);
    const paths = analyze(sheet.people, merged.games, stats, sheet.rule, sheet.guesses, tbTotal);
    return { ...merged, stats, paths, tbTotal };
  }

  // One line per week for the season table.
  function summarize(sheet, r) {
    const done = r.games.every((g) => g.state === 'post');
    let winners = [], tied = [];
    if (sheet.weekWinner.length) winners = sheet.weekWinner;
    else if (done) {
      winners = r.paths.filter((p) => p.clinched).map((p) => p.name);
      if (!winners.length) tied = r.paths.filter((p) => p.alive).map((p) => p.name);
    }
    return { week: sheet.week, done, winners, tied, stats: r.stats, provisional: /^y/i.test(sheet.provisional || '') };
  }

  // Finished weeks stored in the repo (listed in config.js). Loaded once.
  let pastCache = null;
  async function loadPast() {
    if (pastCache) return pastCache;
    const out = [];
    for (const path of CFG.pastWeeks || []) {
      try {
        const r = await fetch(path, { cache: 'no-store' });
        if (!r.ok) throw new Error(r.status);
        out.push(parseSheet(parseCSV(await r.text())));
      } catch { /* a missing week just drops out of the season table */ }
    }
    pastCache = out;
    return out;
  }

  // ── State ────────────────────────────────────────────────────
  let last = null;
  let me = store.get(ME_KEY) || '';
  let timer = null;

  async function load() {
    const btn = $('#refresh');
    btn.disabled = true;
    btn.textContent = 'Updating…';
    const errors = [];
    try {
      let csvText;
      if (DEMO) csvText = window.PICKEM_DEMO.csv;
      else {
        const url = CFG.sheetCsvUrl + (CFG.sheetCsvUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) throw new Error(`Google Sheet returned ${r.status}`);
        csvText = await r.text();
        if (/^\s*</.test(csvText)) throw new Error('The sheet link returned a web page, not CSV. Re-publish the tab as “Comma-separated values (.csv)”.');
      }
      const sheet = parseSheet(parseCSV(csvText));
      let events = [], liveOk = false;
      if (DEMO) { events = demoEvents(); liveOk = true; }
      else if (sheet.week) {
        try {
          const u = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${sheet.week}&dates=${CFG.season}`;
          const r = await fetch(u, { cache: 'no-store' });
          if (!r.ok) throw new Error(`status ${r.status}`);
          events = normalizeEspn(await r.json());
          liveOk = true;
        } catch (e) {
          errors.push(`Live scores aren't loading right now (${e.message}). Results entered by hand in the sheet still count.`);
        }
      } else errors.push('Put the week number next to “Week” at the top of the sheet tab so live scores can load.');
      const cur = scoreWeek(sheet, events, liveOk);
      const past = await loadPast();
      const season = past
        .filter((p) => p.week !== sheet.week)
        .map((p) => summarize(p, scoreWeek(p, [], false)))
        .concat(sheet.week ? [summarize(sheet, cur)] : [])
        .sort((a, b) => a.week - b.week);
      last = { sheet, ...cur, season, errors, warnings: [...sheet.warnings, ...cur.warnings], updated: new Date() };
    } catch (e) {
      if (last) last.errors = [`Couldn't refresh: ${e.message}. Showing the last update.`];
      else last = { fatal: e.message, errors: [] };
    }
    render();
    btn.disabled = false;
    btn.textContent = 'Refresh';
    schedule();
  }

  function schedule() {
    clearTimeout(timer);
    if (DEMO || !last || last.fatal) return;
    const g = last.games || [];
    const live = g.some((x) => x.state === 'in');
    const soon = g.some((x) => x.state === 'pre' && x.date && new Date(x.date) - Date.now() < 20 * 60e3);
    const allDone = g.length && g.every((x) => x.state === 'post');
    const delay = live || soon ? 60e3 : allDone ? 30 * 60e3 : 5 * 60e3;
    timer = setTimeout(() => { if (!document.hidden) load(); }, delay);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && last && !DEMO && Date.now() - last.updated > 60e3) load();
  });

  // ── Render ───────────────────────────────────────────────────
  function render() {
    $('#league').textContent = CFG.leagueName;
    document.title = CFG.leagueName;
    $('#demo').hidden = !DEMO;
    if (DEMO) $('#demo-text').textContent = window.PICKEM_DEMO.label + '.';
    const errBox = $('#errors');
    if (last.fatal) {
      $('#week').textContent = '';
      $('#hero').innerHTML = `<h2>Couldn't load the picks</h2><p class="sub">${esc(last.fatal)}</p>`;
      $('#main').innerHTML = '';
      errBox.hidden = true;
      return;
    }
    errBox.hidden = !last.errors.length;
    errBox.innerHTML = last.errors.map((e) => `<p>⚠️ ${esc(e)}</p>`).join('');
    $('#week').textContent = last.sheet.week ? `Week ${last.sheet.week}` : '';
    $('#updated').textContent = DEMO ? 'Demo data' : `Updated ${last.updated.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

    const sel = $('#me');
    const opts = ['<option value="">Everyone</option>', ...last.sheet.people.map((p) => `<option${p === me ? ' selected' : ''}>${esc(p)}</option>`)];
    sel.innerHTML = opts.join('');
    if (me && !last.sheet.people.includes(me)) me = '';

    const wasOpen = !!document.querySelector('details.finals[open]');
    $('#hero').innerHTML = renderHero();
    $('#main').innerHTML = [renderBoard(), renderGames(), renderTiebreak(), renderSeason(), renderGrid(), renderWarnings()].join('');
    if (wasOpen) document.querySelector('details.finals')?.setAttribute('open', '');
  }

  const chip = (name) => `<span class="chip${name === me ? ' me' : ''}">${esc(name)}</span>`;

  function renderHero() {
    const { games, stats, paths } = last;
    const done = games.filter((g) => g.state === 'post').length;
    const live = games.filter((g) => g.state === 'in').length;
    const left = games.length - done;
    const top = Math.max(...stats.map((s) => s.w));
    const leaders = stats.filter((s) => s.w === top).map((s) => s.name);
    let headline, sub;
    if (left === 0) {
      const winners = paths.filter((p) => p.clinched).map((p) => p.name);
      const maybes = paths.filter((p) => p.alive && !p.clinched).map((p) => p.name);
      if (winners.length) headline = `🏆 ${listNames(winners)} ${winners.length > 1 ? 'share' : 'wins'} Week ${last.sheet.week || ''}`;
      else headline = `${listNames(maybes)} tied. Tiebreaker needed`;
      sub = `All ${games.length} games are final. ${listNames(leaders)} finished with ${top} wins.`;
    } else if (done === 0 && live === 0) {
      const next = games.filter((g) => g.date).sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      headline = `Week ${last.sheet.week || ''} hasn't started yet`;
      sub = next ? `First game: ${teamName(next.away)} @ ${teamName(next.home)}, ${kickoffText(next.date)}.` : `${games.length} games this week.`;
    } else {
      headline = leaders.length === 1 ? `${leaders[0]} leads with ${top} wins` : `${listNames(leaders)} tied with ${top} wins`;
      const bits = [`${done} of ${games.length} games final`];
      if (live) bits.push(`${plural(live, 'game')} live now`);
      const alive = paths.filter((p) => p.alive).length;
      bits.push(`${plural(alive, 'person', 'people')} can still win`);
      sub = bits.join(' · ') + '.';
      if (live) {
        const proj = stats.map((s) => ({ name: s.name, v: s.w + s.upNow }));
        const pt = Math.max(...proj.map((x) => x.v));
        const pl = proj.filter((x) => x.v === pt).map((x) => x.name);
        if (pl.join() !== leaders.join()) sub += ` If the live scores hold, ${listNames(pl)} would be on top with ${pt}.`;
      }
    }
    const order = [...games].sort((a, b) => (new Date(a.date || 0) - new Date(b.date || 0)) || a.idx - b.idx);
    const segs = order.map((g) => `<span class="seg ${g.state}" title="${esc(g.away)} @ ${esc(g.home)}"></span>`).join('');
    const prog = `${done} of ${games.length} final${live ? ` · ${live} live` : ''}`;
    const eyebrow = left === 0 ? 'Final results' : live ? 'Live now' : done === 0 ? 'Up next' : 'In progress';
    return `<p class="eyebrow">${eyebrow}</p>
      <h2>${esc(headline)}</h2><p class="sub">${esc(sub)}</p>
      <div class="progress" role="img" aria-label="${esc(prog)}"><div class="segs">${segs}</div><span class="lbl">${esc(prog)}</span></div>`;
  }

  function statusCell(path, s) {
    const finished = last.games.every((g) => g.state === 'post');
    if (path.clinched) return `<span class="badge good">🏆 ${finished ? 'Winner' : 'Clinched'}</span>`;
    if (!path.alive) return `<span class="badge out">✕ Out</span>`;
    if (finished) return `<span class="badge alive">⚖️ Tiebreaker</span>`;
    let need = '';
    const tbNote = path.tbOnly ? ' + win the tiebreaker' : '';
    if (path.needs.length && path.needs.length <= 4) need = `Needs ${listNames(path.needs.map(teamName))}${tbNote}`;
    else if (path.needs.length) need = `Needs ${path.needs.length} specific results${tbNote}`;
    else if (path.tbOnly) need = 'Needs to win the tiebreaker';
    return `<span class="badge alive"><span class="dot" aria-hidden="true"></span>Still alive</span>${need ? `<span class="need">${esc(need)}</span>` : ''}`;
  }

  function renderBoard() {
    const { stats, paths, games } = last;
    const anyLive = games.some((g) => g.state === 'in');
    const rows = stats
      .map((s, i) => ({ s, p: paths[i] }))
      .sort((a, b) => b.s.w - a.s.w || b.s.upNow - a.s.upNow || b.s.max - a.s.max || a.s.name.localeCompare(b.s.name));
    let rank = 0, prev = null;
    const body = rows.map(({ s, p }, i) => {
      const key = `${s.w}`;
      if (key !== prev) { rank = i + 1; prev = key; }
      const live = anyLive ? `<td class="num live-col">${s.upNow ? `<span class="up">▲${s.upNow}</span>` : ''}${s.downNow ? ` <span class="down">▼${s.downNow}</span>` : ''}${!s.upNow && !s.downNow ? '<span class="muted">–</span>' : ''}</td>` : '';
      return `<tr class="${s.name === me ? 'me-row ' : ''}${p.alive ? '' : 'is-out'}">
        <td class="num rank"><span class="rk${rank === 1 ? ' r1' : ''}">${rank}</span></td>
        <td class="who">${esc(s.name)}</td>
        <td class="num rec"><strong>${s.w}</strong><span class="muted">-${s.l}</span></td>
        ${live}
        <td class="num">${s.max}</td>
        <td class="stat">${statusCell(p, s)}</td>
      </tr>`;
    }).join('');
    return `<section class="card">
      <h2>Standings</h2>
      <div class="scroll"><table class="board">
        <thead><tr><th class="num">#</th><th>Player</th><th class="num">W-L</th>${anyLive ? '<th class="num" title="Picks winning / losing in games being played right now">Live</th>' : ''}<th class="num" title="Most wins still possible">Best</th><th>Status</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="foot">W-L counts finished games. ${anyLive ? '<b>Live</b> shows picks winning ▲ or losing ▼ in games being played now. ' : ''}<b>Best</b> is the most wins still possible. “Still alive” means they can still win the week, checking every possible result of the games left${last.sheet.rule === 'same' ? ', with the tiebreaker rule below' : ''}.</p>
    </section>`;
  }

  function gameCard(g) {
    const tbGame = g.idx === last.games.length - 1;
    const pickers = (t) => last.sheet.people.filter((p) => g.picks[p] === t);
    const lead = g.state === 'in' ? (g.awayScore > g.homeScore ? g.away : g.homeScore > g.awayScore ? g.home : null) : null;
    let status;
    if (g.state === 'post') status = g.manual ? 'Final (entered by hand)' : g.detail || 'Final';
    else if (g.state === 'in') status = `<span class="live-dot" aria-hidden="true"></span>LIVE · ${esc(g.detail)}`;
    else status = esc(kickoffText(g.date) || 'Not started');
    const side = (t, sc) => {
      const names = pickers(t);
      const won = g.state === 'post' && (g.winner === t || (g.tie && CFG.tieCountsAsWin));
      const lost = g.state === 'post' && g.winner && g.winner !== t;
      const cls = won ? 'won' : lost ? 'lost' : lead === t ? 'leading' : '';
      const mark = won ? '<span class="mark good-ink" aria-label="won">✓</span>' : '';
      const showScore = g.state !== 'pre' && sc != null && !g.manual;
      return `<div class="side ${cls}">
        <div class="team"><span class="tname">${teamTile(t)}${esc(teamName(t))}${mark}</span>${showScore ? `<span class="score">${sc}</span>` : ''}</div>
        <div class="pickers">${names.length ? names.map(chip).join('') : '<span class="muted small">No one</span>'}<span class="count">${names.length}</span></div>
      </div>`;
    };
    return `<article class="game ${g.state}${me && g.picks[me] ? '' : ''}">
      <header><span class="gstatus">${status}</span>${tbGame ? '<span class="tag">Tiebreaker game</span>' : ''}</header>
      ${side(g.away, g.awayScore)}
      ${side(g.home, g.homeScore)}
    </article>`;
  }

  function renderGames() {
    const { games, byes } = last;
    const byTime = (a, b) => (new Date(a.date || 0) - new Date(b.date || 0)) || a.idx - b.idx;
    const live = games.filter((g) => g.state === 'in').sort(byTime);
    const next = games.filter((g) => g.state === 'pre').sort(byTime);
    const fin = games.filter((g) => g.state === 'post').sort((a, b) => byTime(b, a));
    const block = (title, list) => list.length ? `<h3>${title} <span class="muted">${list.length}</span></h3><div class="games">${list.map(gameCard).join('')}</div>` : '';
    // Finished games fold away while anything is still to play, so the live game stays near the top.
    const finals = !fin.length ? '' : live.length || next.length
      ? `<details class="finals"><summary>Final <span class="muted">${fin.length}</span><span class="show">Show</span></summary><div class="games">${fin.map(gameCard).join('')}</div></details>`
      : block('Final', fin);
    return `<section class="card">
      <h2>Games</h2>
      ${block('Live now', live)}${block('Coming up', next)}${finals}
      ${byes.length ? `<p class="foot">On bye: ${esc(listNames(byes.map(teamName)))}.</p>` : ''}
    </section>`;
  }

  function renderTiebreak() {
    const { games, sheet, tbTotal } = last;
    const tb = games[games.length - 1];
    const hasScore = tb.state !== 'pre' && tb.awayScore != null && !tb.manual;
    const total = tbTotal != null ? tbTotal : hasScore ? tb.awayScore + tb.homeScore : null;
    const final = tbTotal != null;
    const rows = sheet.people
      .map((p) => ({ p, guess: sheet.guesses[p], pick: tb.picks[p] }))
      .sort((a, b) => (a.guess ?? 1e9) - (b.guess ?? 1e9));
    const body = rows.map((r) => {
      let off = '<span class="muted">–</span>';
      if (r.guess != null && total != null) {
        const d = Math.abs(r.guess - total);
        off = final ? `${d}` : r.guess < total ? `<span class="muted">passed</span>` : `${r.guess - total} to go`;
      }
      const pickMark = tb.state === 'post' && tb.winner ? (r.pick === tb.winner ? ' <span class="good-ink">✓</span>' : r.pick ? ' <span class="bad-ink">✕</span>' : '') : '';
      return `<tr class="${r.p === me ? 'me-row' : ''}"><td class="who">${esc(r.p)}</td><td>${r.pick ? esc(teamName(r.pick)) + pickMark : '<span class="muted">–</span>'}</td><td class="num">${r.guess ?? '<span class="muted">–</span>'}</td><td class="num">${off}</td></tr>`;
    }).join('');
    const ruleText = sheet.rule === 'same'
      ? 'If people are tied on wins, whoever picked the right winner of this game wins. If they picked the same winner, the closest guess at the combined score wins.'
      : 'If people are tied on wins, the closest guess at the combined score of this game wins.';
    return `<section class="card">
      <h2>Tiebreaker: ${esc(teamName(tb.away))} @ ${esc(teamName(tb.home))}</h2>
      <p class="hero-num">${total != null ? `<strong>${total}</strong> <span class="muted">${final ? 'total points (final)' : 'points so far'}</span>` : `<span class="muted">${tb.state === 'pre' ? esc(kickoffText(tb.date) || 'Not started yet') : 'Score not available'}</span>`}</p>
      <div class="scroll"><table class="board">
        <thead><tr><th>Player</th><th>Picked</th><th class="num">Guess</th><th class="num">${final ? 'Off by' : 'Points to go'}</th></tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="foot"><b>Rule:</b> ${esc(ruleText)}</p>
    </section>`;
  }

  function renderGrid() {
    const { games, sheet, stats } = last;
    const head = sheet.people.map((p) => `<th class="${p === me ? 'me-col' : ''}">${esc(p)}</th>`).join('');
    const rows = games.map((g) => {
      const lead = g.state === 'in' ? (g.awayScore > g.homeScore ? g.away : g.homeScore > g.awayScore ? g.home : null) : null;
      const cells = sheet.people.map((p) => {
        const t = g.picks[p];
        if (!t) return `<td class="${p === me ? 'me-col' : ''}"><span class="muted">–</span></td>`;
        let cls = 'pend', icon = '';
        if (g.state === 'post') { const ok = g.winner === t || (g.tie && CFG.tieCountsAsWin); cls = ok ? 'ok' : 'no'; icon = ok ? '✓' : '✕'; }
        else if (lead) { cls = lead === t ? 'up' : 'down'; icon = lead === t ? '▲' : '▼'; }
        return `<td class="pick ${cls}${p === me ? ' me-col' : ''}">${t}${icon ? ` <span aria-hidden="true">${icon}</span>` : ''}</td>`;
      }).join('');
      const res = g.state === 'post' ? (g.winner ? `<span class="good-ink">${g.winner}</span>` : 'Tie') : g.state === 'in' ? 'Live' : '';
      return `<tr><th class="gm">${g.away} @ ${g.home}</th><td class="res">${res}</td>${cells}</tr>`;
    }).join('');
    const tot = stats.map((s) => `<td class="num${s.name === me ? ' me-col' : ''}"><strong>${s.w}</strong></td>`).join('');
    return `<section class="card">
      <h2>Everyone's picks</h2>
      <div class="scroll grid-wrap"><table class="grid">
        <thead><tr><th class="gm">Game</th><th>Winner</th>${head}</tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><th class="gm">Wins</th><td></td>${tot}</tr></tfoot>
      </table></div>
      <p class="foot">✓ right · ✕ wrong · ▲ winning now · ▼ losing now. Wins are counted from the actual scores, not cell colors.</p>
    </section>`;
  }

  function renderSeason() {
    const weeks = (last.season || []).filter((w) => w.week);
    if (weeks.length < 2) return '';
    const names = [];
    weeks.forEach((w) => w.stats.forEach((s) => { if (!names.includes(s.name)) names.push(s.name); }));
    const rows = names.map((name) => {
      let W = 0, L = 0, trophies = 0, played = 0;
      const cells = weeks.map((w) => {
        const s = w.stats.find((x) => x.name === name);
        if (!s || s.w + s.l + s.open === 0) return '<td class="num"><span class="muted">·</span></td>';
        played++; W += s.w; L += s.l;
        const won = w.winners.includes(name);
        if (won) trophies++;
        const tie = w.tied.includes(name);
        return `<td class="num${won ? ' wk-win' : ''}">${s.w}${won ? ' 🏆' : tie ? '<sup>*</sup>' : ''}</td>`;
      }).join('');
      return { name, W, L, trophies, played, pct: W + L ? W / (W + L) : 0, cells };
    }).sort((a, b) => b.pct - a.pct || b.W - a.W || a.name.localeCompare(b.name));
    const anyTie = weeks.some((w) => w.tied.length);
    const live = weeks.find((w) => !w.done);
    const head = weeks.map((w) => `<th class="num">Wk ${w.week}${w.done ? '' : '*'}${w.provisional ? '†' : ''}</th>`).join('');
    const prov = weeks.filter((w) => w.provisional).map((w) => w.week);
    const body = rows.map((r) => `<tr class="${r.name === me ? 'me-row' : ''}">
        <th class="who gm">${esc(r.name)}</th>
        <td class="num"><strong>${(r.pct * 100).toFixed(1)}%</strong></td>
        <td class="num">${r.W}-${r.L}</td>
        <td class="num">${r.trophies ? '🏆'.repeat(r.trophies) : '<span class="muted">–</span>'}</td>
        ${r.cells}</tr>`).join('');
    return `<section class="card">
      <h2>Season bragging rights</h2>
      <div class="scroll"><table class="board season">
        <thead><tr><th class="gm">Player</th><th class="num">Win %</th><th class="num">W-L</th><th class="num" title="Weeks won">🏆</th>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table></div>
      <p class="foot">Ranked by win %, so missing a week doesn't count against anyone. Every week is re-scored from the official final scores, not the sheet colors. 🏆 = won the week. A dot means the player didn't play that week.${live ? ` Wk ${live.week}* is still being played.` : ''}${anyTie ? ' <sup>*</sup> Tied for first, but the tiebreaker isn’t on record yet.' : ''}${prov.length ? ` † Wk ${prov.join(', ')} still needs to be double-checked against the sheet.` : ''}</p>
    </section>`;
  }

  function renderWarnings() {
    if (!last.warnings.length) return '';
    return `<section class="card notes"><h2>Things to check in the sheet</h2><ul>${last.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>`;
  }

  // ── Wire up ──────────────────────────────────────────────────
  $('#refresh').addEventListener('click', load);

  // Light by default; the toggle switches to dark and remembers it on this device.
  const THEME_KEY = 'pickem.theme';
  const ICONS = {
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  };
  function applyTheme(t) {
    const dark = t === 'dark';
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    const btn = $('#theme');
    const label = dark ? 'Switch to light mode' : 'Switch to dark mode';
    btn.innerHTML = dark ? ICONS.sun : ICONS.moon;
    btn.setAttribute('aria-label', label);
    btn.title = label;
    $('#theme-color')?.setAttribute('content', dark ? '#0f281d' : '#17402e');
  }
  applyTheme(store.get(THEME_KEY) === 'dark' ? 'dark' : 'light');
  $('#theme').addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    store.set(THEME_KEY, next === 'dark' ? 'dark' : '');
    applyTheme(next);
  });
  $('#me').addEventListener('change', (e) => { me = e.target.value; store.set(ME_KEY, me); if (last) render(); });

  // Exposed for testing in Node.
  window.PICKEM_INTERNALS = { parseCSV, parseSheet, teamCode, merge, score, analyze, demoEvents };
  if (!window.PICKEM_NO_AUTOLOAD) load();
})();
