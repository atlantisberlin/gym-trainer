// ─── Fortschritt: Statistiken, Charts, Heatmaps, PRs, Achievements ──────────
import { ic } from '../icons.js';
import { S, save, getEx, allExercises, calcStreak, totalWorkouts, muscleSets, e1rmHistory, ACH } from '../state.js';
import { toISO, todayISO, addDays, fmtVol, fmtKg, fmtDate, esc, MUSCLES } from '../util.js';
import { lineChart, wireCharts } from '../charts.js';
import { toast } from '../components.js';
import { A } from '../actions.js';

let selectedEx = null;

export function render() {
  const el = document.getElementById('v-stats');
  const today = todayISO();
  const weekAgo = toISO(addDays(new Date(), -6));

  const vol7 = S.logs.filter(l => l.date >= weekAgo).reduce((s, l) => s + (l.vol || 0), 0);

  const html = [`
    <div class="stat-grid">
      <div class="stat"><div class="stat-lbl">${ic('flame')} Streak</div><div class="stat-val num">${calcStreak()}<small>Tage</small></div></div>
      <div class="stat"><div class="stat-lbl">${ic('barbell')} Workouts</div><div class="stat-val num">${totalWorkouts()}</div></div>
      <div class="stat"><div class="stat-lbl">${ic('trophy')} Rekorde</div><div class="stat-val num">${Object.keys(S.prs).length}</div></div>
      <div class="stat"><div class="stat-lbl">${ic('weight')} Volumen · 7 Tage</div><div class="stat-val num" style="font-size:24px">${fmtVol(vol7)}</div></div>
    </div>`];

  // ── Trainingskonsistenz (letzte 26 Wochen) ──
  html.push(`<div class="slbl">Konsistenz · Letzte 6 Monate</div><div class="card">${calHeatmap()}</div>`);

  // ── Muskelfokus diese Woche ──
  const monday = toISO(addDays(new Date(), -((new Date().getDay() + 6) % 7)));
  const mCounts = muscleSets(monday, today);
  html.push(`<div class="slbl">Muskelfokus · Diese Woche</div><div class="card">`);
  html.push(`<div class="body-heat">
    <figure>${bodySVG(true, mCounts)}<figcaption>Vorderseite</figcaption></figure>
    <figure>${bodySVG(false, mCounts)}<figcaption>Rückseite</figcaption></figure>
  </div>`);
  const maxSets = Math.max(1, ...Object.values(mCounts));
  const bars = MUSCLES.filter(m => mCounts[m]).sort((a, b) => mCounts[b] - mCounts[a]);
  if (bars.length) {
    html.push(`<div class="mt8">` + bars.map(m => `
      <div class="vbar-row">
        <span class="vbar-lbl">${m}</span>
        <div class="vbar-track"><div class="vbar-fill" style="width:${Math.round(mCounts[m] / maxSets * 100)}%"></div></div>
        <span class="vbar-val">${Math.round(mCounts[m])} Sätze</span>
      </div>`).join('') + `</div>`);
  } else {
    html.push(`<div class="chart-empty">Diese Woche noch kein Training erfasst.</div>`);
  }
  html.push(`</div>`);

  // ── Kraftverlauf (e1RM) ──
  const withHistory = allExercises().filter(x => !x.bw && e1rmHistory(x.id).length >= 1);
  if (!selectedEx || !withHistory.some(x => x.id === selectedEx)) {
    selectedEx = withHistory.length ? bestDefault(withHistory) : null;
  }
  html.push(`<div class="slbl">Kraftverlauf</div><div class="card chart-card">`);
  if (withHistory.length) {
    html.push(`
      <select class="inp" style="margin-bottom:10px" onchange="A.statsSelEx(this.value)">
        ${withHistory.sort((a, b) => a.n.localeCompare(b.n)).map(x =>
          `<option value="${x.id}"${x.id === selectedEx ? ' selected' : ''}>${esc(x.n)}</option>`).join('')}
      </select>
      <div class="chart-sub">Geschätztes 1RM (Epley) über deine Einheiten</div>
      ${lineChart(e1rmHistory(selectedEx), { unit: 'kg', id: 'e1rm' })}`);
  } else {
    html.push(`<div class="chart-empty">Absolviere Trainings mit Gewichten – dann siehst du hier, wie deine Kraft wächst.</div>`);
  }
  html.push(`</div>`);

  // ── Körperdaten ──
  const lastW = S.bodyLog[0];
  html.push(`
    <div class="slbl">Körperdaten</div>
    <div class="card">
      <div class="field-row">
        <div class="field"><label>Größe (cm)</label><input class="inp" id="bd-h" type="number" inputmode="decimal" placeholder="175" value="${S.height || ''}"></div>
        <div class="field"><label>Gewicht (kg)</label><input class="inp" id="bd-w" type="number" inputmode="decimal" step="0.1" placeholder="75,0" value="${lastW ? lastW.weight : ''}"></div>
      </div>
      ${bmiRow()}
      <button class="btn full mt8" onclick="A.saveBody()">${ic('check')} Eintragen</button>
    </div>
    <div class="card chart-card">
      <div class="chart-title">Gewichtsverlauf</div>
      <div class="chart-sub">Letzte ${Math.min(30, S.bodyLog.length)} Einträge</div>
      ${lineChart([...S.bodyLog].slice(0, 30).reverse().map(x => ({ date: x.date, v: x.weight })), { unit: 'kg', id: 'weight' })}
      ${S.bodyLog.slice(0, 5).map((x, i) => `
        <div class="flex" style="padding:7px 0;border-top:1px solid var(--line);font-size:13px">
          <span class="t2 grow">${fmtDate(x.date)}</span>
          <b>${fmtKg(x.weight)} kg</b>
          <button class="iconbtn" style="width:34px;height:34px;border:none;background:none" onclick="A.delWeight(${i})" aria-label="Löschen">${ic('x')}</button>
        </div>`).join('')}
    </div>`);

  // ── Persönliche Rekorde ──
  const prs = Object.entries(S.prs)
    .map(([exId, r]) => ({ ex: getEx(exId), ...r }))
    .filter(p => p.ex)
    .sort((a, b) => b.e1rm - a.e1rm);
  html.push(`<div class="slbl">Persönliche Rekorde</div>`);
  if (prs.length) {
    html.push(prs.slice(0, 12).map(p => `
      <div class="row" style="cursor:default">
        <div class="row-main">
          <div class="row-title">${esc(p.ex.n)}</div>
          <div class="row-sub">${fmtKg(p.w)} kg × ${p.r} · ${fmtDate(p.date)}</div>
        </div>
        <div class="row-end"><div style="text-align:right"><span class="num" style="font-size:22px">${fmtKg(p.e1rm)}</span><div class="row-sub">e1RM</div></div></div>
      </div>`).join(''));
  } else {
    html.push(`<div class="empty">Noch keine Rekorde – hak Sätze mit Gewicht ab, den Rest macht die App.</div>`);
  }

  // ── Achievements ──
  html.push(`<div class="slbl">Achievements · ${Object.keys(S.achievements).length}/${ACH.length}</div>
    <div class="ach-grid">${ACH.map(a => `
      <div class="ach ${S.achievements[a.id] ? 'on' : 'off'}">
        ${ic(a.icon)}
        <div class="ach-name">${a.name}</div>
        <div class="ach-desc">${a.desc}</div>
      </div>`).join('')}</div>`);

  el.innerHTML = html.join('');
  wireCharts(el);
}

function bestDefault(list) {
  // Übung mit den meisten Datenpunkten vorauswählen
  let best = list[0], n = 0;
  for (const x of list) {
    const c = e1rmHistory(x.id).length;
    if (c > n) { n = c; best = x; }
  }
  return best.id;
}

function bmiRow() {
  const w = S.bodyLog[0] ? S.bodyLog[0].weight : null;
  if (!S.height || !w) return '';
  const bmi = w / Math.pow(S.height / 100, 2);
  const cat = bmi < 18.5 ? 'Untergewicht' : bmi < 25 ? 'Normalgewicht' : bmi < 30 ? 'Übergewicht' : 'Adipositas';
  return `<div class="flex" style="padding:4px 0 10px;font-size:13.5px">
    <span class="t2">BMI</span><b class="num" style="font-size:19px">${bmi.toFixed(1).replace('.', ',')}</b>
    <span class="chip">${cat}</span></div>`;
}

// ── Kalender-Heatmap: 26 Wochen × 7 Tage ──
function calHeatmap() {
  const volByDate = {};
  for (const l of S.logs) volByDate[l.date] = (volByDate[l.date] || 0) + (l.vol || 0) + 1;

  const wd = (new Date().getDay() + 6) % 7;
  const end = addDays(new Date(), 6 - wd); // Ende dieser Woche
  const cols = [];
  for (let w = 25; w >= 0; w--) {
    const cells = [];
    for (let d = 6; d >= 0; d--) {
      const date = addDays(end, -(w * 7 + d));
      const iso = toISO(date);
      const v = volByDate[iso] || 0;
      const future = iso > todayISO();
      const lvl = v === 0 ? '' : v < 2500 ? ' l1' : v < 5000 ? ' l2' : ' l3';
      cells.push(`<div class="cal-cell${lvl}" title="${fmtDate(iso)}"${future ? ' style="opacity:.25"' : ''}></div>`);
    }
    cols.push(`<div class="cal-col">${cells.join('')}</div>`);
  }
  return `<div class="cal-heat">${cols.join('')}</div>
    <div class="flex" style="margin-top:8px;font-size:11px;color:var(--t3);gap:5px;justify-content:flex-end">
      Wenig <div class="cal-cell l1"></div><div class="cal-cell l2"></div><div class="cal-cell l3"></div> Viel
    </div>`;
}

// ── Körper-Heatmap (SVG) ──
function heatColor(count) {
  if (!count) return 'var(--s3)';
  if (count < 3) return 'color-mix(in srgb, var(--acc) 35%, var(--s3))';
  if (count < 6) return 'color-mix(in srgb, var(--acc) 70%, var(--s3))';
  return 'var(--acc)';
}

function bodySVG(front, mc) {
  const c = m => heatColor(mc[m] || 0);
  const base = 'var(--s2)';
  const R = (x, y, w, h, fill, rx = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;
  const E = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;

  let parts = [
    E(60, 18, 12, 15, base),          // Kopf
    R(55, 31, 10, 8, base, 2),        // Hals
    R(32, 38, 56, 70, base),          // Torso
    R(16, 38, 16, 55, base),          // Oberarme
    R(88, 38, 16, 55, base),
    R(14, 93, 14, 38, front ? c('Unterarme') : base),  // Unterarme
    R(92, 93, 14, 38, front ? c('Unterarme') : base),
    R(34, 105, 52, 22, base),         // Hüfte
    R(34, 124, 22, 50, base),         // Oberschenkel
    R(64, 124, 22, 50, base),
    R(36, 172, 18, 42, base),         // Unterschenkel
    R(66, 172, 18, 42, base),
  ];

  if (front) {
    parts.push(
      R(35, 40, 50, 28, c('Brust'), 3),
      E(22, 48, 8, 12, c('Schultern')),
      E(98, 48, 8, 12, c('Schultern')),
      R(17, 57, 13, 25, c('Bizeps'), 3),
      R(90, 57, 13, 25, c('Bizeps'), 3),
      R(42, 70, 36, 34, c('Core'), 3),
      R(35, 126, 20, 45, c('Quadrizeps'), 3),
      R(65, 126, 20, 45, c('Quadrizeps'), 3),
      R(37, 174, 15, 35, c('Waden'), 3),
      R(67, 174, 15, 35, c('Waden'), 3),
    );
  } else {
    parts.push(
      R(38, 40, 44, 26, c('Rücken'), 3),
      E(22, 48, 8, 12, c('Schultern')),
      E(98, 48, 8, 12, c('Schultern')),
      R(34, 62, 22, 40, c('Lats'), 3),
      R(64, 62, 22, 40, c('Lats'), 3),
      R(17, 60, 13, 25, c('Trizeps'), 3),
      R(90, 60, 13, 25, c('Trizeps'), 3),
      R(35, 107, 22, 23, c('Gesäß'), 3),
      R(63, 107, 22, 23, c('Gesäß'), 3),
      R(35, 130, 20, 42, c('Beinbeuger'), 3),
      R(65, 130, 20, 42, c('Beinbeuger'), 3),
      R(37, 174, 15, 35, c('Waden'), 3),
      R(67, 174, 15, 35, c('Waden'), 3),
    );
  }
  return `<svg width="110" height="202" viewBox="0 0 120 220">${parts.join('')}</svg>`;
}

// ── Aktionen ──
A.statsSelEx = id => { selectedEx = id; render(); };

A.saveBody = () => {
  const h = parseFloat(document.getElementById('bd-h').value);
  const w = parseFloat(document.getElementById('bd-w').value);
  if (h) S.height = h;
  if (w) {
    const today = todayISO();
    const i = S.bodyLog.findIndex(x => x.date === today);
    if (i >= 0) S.bodyLog[i].weight = w;
    else S.bodyLog.unshift({ date: today, weight: w });
    S.bodyLog = S.bodyLog.slice(0, 200);
  }
  save();
  render();
  toast('Gespeichert');
};

A.delWeight = i => {
  S.bodyLog.splice(i, 1);
  save();
  render();
};
