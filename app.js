(() => {
  'use strict';

  const CFG = Object.assign(
    { sheetCsvUrl: '', season: 2026, leagueName: "Family Pick'em" },
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
    return null;
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
        const o = teamCode(r[ovCol]);
        if (o === away || o === home) g.override = o;
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
    return { week: isNaN(week) ? null : week, rule, tbTotalOverride: isNaN(tbTotal) ? null : tbTotal, people: people.map((p) => p.name), games, guesses, warnings };
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
        m.winner = g.override;
        m.tie = false;
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
          if (g.winner && p === g.winner) s.w++; else s.l++;
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
      if (set.length > 1 && tbTotal != null) {
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
      const merged = merge(sheet, events, liveOk);
      const tb = merged.games[merged.games.length - 1];
      const tbTotal = sheet.tbTotalOverride != null ? sheet.tbTotalOverride
        : tb.state === 'post' && !tb.manual && tb.awayScore != null ? tb.awayScore + tb.homeScore : null;
      const stats = score(sheet.people, merged.games);
      const paths = analyze(sheet.people, merged.games, stats, sheet.rule, sheet.guesses, tbTotal);
      last = { sheet, ...merged, stats, paths, tbTotal, errors, warnings: [...sheet.warnings, ...merged.warnings], updated: new Date() };
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
      $('#main').innerHTML = `<section class="card"><h2>Couldn't load the picks</h2><p>${esc(last.fatal)}</p></section>`;
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

    $('#main').innerHTML = [renderHero(), renderBoard(), renderGames(), renderTiebreak(), renderGrid(), renderWarnings()].join('');
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
    return `<section class="hero"><h2>${esc(headline)}</h2><p>${esc(sub)}</p></section>`;
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
    return `<span class="badge alive">● Still alive</span>${need ? `<span class="need">${esc(need)}</span>` : ''}`;
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
        <td class="num rank">${rank}</td>
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
      const won = g.state === 'post' && g.winner === t;
      const lost = g.state === 'post' && g.winner && g.winner !== t;
      const cls = won ? 'won' : lost ? 'lost' : lead === t ? 'leading' : '';
      const mark = won ? '<span class="mark good-ink" aria-label="won">✓</span>' : '';
      const showScore = g.state !== 'pre' && sc != null && !g.manual;
      return `<div class="side ${cls}">
        <div class="team"><span class="tname">${esc(teamName(t))}${mark}</span>${showScore ? `<span class="score">${sc}</span>` : ''}</div>
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
    return `<section class="card">
      <h2>Games</h2>
      ${block('Live now', live)}${block('Coming up', next)}${block('Final', fin)}
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
        if (g.state === 'post') { const ok = g.winner === t; cls = ok ? 'ok' : 'no'; icon = ok ? '✓' : '✕'; }
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

  function renderWarnings() {
    if (!last.warnings.length) return '';
    return `<section class="card notes"><h2>Things to check in the sheet</h2><ul>${last.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul></section>`;
  }

  // ── Wire up ──────────────────────────────────────────────────
  $('#refresh').addEventListener('click', load);
  $('#me').addEventListener('change', (e) => { me = e.target.value; store.set(ME_KEY, me); if (last) render(); });

  // Exposed for testing in Node.
  window.PICKEM_INTERNALS = { parseCSV, parseSheet, teamCode, merge, score, analyze, demoEvents };
  if (!window.PICKEM_NO_AUTOLOAD) load();
})();
