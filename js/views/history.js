// ─── Verlauf: Trainings-Historie mit Detailansicht ──────────────────────────
import { ic } from '../icons.js';
import { S, save } from '../state.js';
import { fmtDate, fmtDur, fmtVol, fmtKg, fromISO, esc } from '../util.js';
import { openSheet, closeSheet, confirmSheet, toast } from '../components.js';
import { A } from '../actions.js';

export function render() {
  const el = document.getElementById('v-history');
  if (!S.logs.length) {
    el.innerHTML = `<div class="empty">${ic('history')}<br>Noch keine Trainings erfasst.<br>Deine abgeschlossenen Workouts landen hier.</div>`;
    return;
  }

  const html = [];
  let lastMonth = '';
  S.logs.forEach((log, i) => {
    const month = fromISO(log.date).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    if (month !== lastMonth) {
      html.push(`<div class="slbl">${month}</div>`);
      lastMonth = month;
    }
    const meta = [];
    if (log.duration) meta.push(fmtDur(log.duration));
    if (log.vol) meta.push(fmtVol(log.vol));
    if (log.prs && log.prs.length) meta.push(`${log.prs.length} PR${log.prs.length > 1 ? 's' : ''} 🏆`);
    html.push(`
      <button class="row" onclick="A.logDetail(${i})">
        <div class="row-main">
          <div class="row-title">${esc(log.dayName)}</div>
          <div class="row-sub">${fmtDate(log.date)}${meta.length ? ' · ' + meta.join(' · ') : ''}</div>
        </div>
        <div class="row-end">${ic('chevron_right')}</div>
      </button>`);
  });
  html.push(`<div class="tc mt16" style="font-size:12.5px;color:var(--t3)">${S.logs.length} Trainings${S.legacyCount ? ` + ${S.legacyCount} aus der alten App` : ''}</div>`);
  el.innerHTML = html.join('');
}

A.logDetail = i => {
  const log = S.logs[i];
  if (!log) return;
  const entries = log.entries.map(en => {
    const sets = en.sets.map(s => {
      const label = s.w > 0 ? `${fmtKg(s.w)}×${s.r}` : `${s.r}`;
      return `<span class="ld-set${s.done ? ' done' : ''}">${label}</span>`;
    }).join('');
    const isPR = (log.prs || []).includes(en.name);
    return `<div class="log-detail-ex">
      <div class="ld-name">${esc(en.name)}${isPR ? ' 🏆' : ''}</div>
      <div class="ld-sets">${sets}</div>
    </div>`;
  }).join('');

  openSheet({
    title: log.dayName,
    body: `
      <div class="chip" style="margin-bottom:12px">${fmtDate(log.date)}</div>
      <div class="summary-stats">
        <div class="summary-stat"><span class="num">${fmtDur(log.duration)}</span><span>Dauer</span></div>
        <div class="summary-stat"><span class="num">${log.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0)}</span><span>Sätze</span></div>
        <div class="summary-stat"><span class="num">${fmtVol(log.vol)}</span><span>Volumen</span></div>
      </div>
      ${entries}
      <button class="btn btn-danger full mt16" data-del>${ic('trash')} Training löschen</button>`,
    onOpen(sheet) {
      sheet.querySelector('[data-del]').addEventListener('click', async () => {
        closeSheet();
        if (await confirmSheet('Training löschen?', `Das Training „${esc(log.dayName)}" vom ${fmtDate(log.date)} wird dauerhaft gelöscht.`)) {
          S.logs.splice(i, 1);
          save();
          render();
          toast('Training gelöscht');
        }
      });
    },
  });
};
