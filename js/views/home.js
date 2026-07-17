// ─── Heute: Heutiges Training, Schnellstart, Schnell-Statistik ──────────────
import { ic } from '../icons.js';
import { S, activePlan, todaysDay, getEx, calcStreak, totalWorkouts, suggestFor } from '../state.js';
import { DAYS_LONG, toISO, addDays, weekdayIdx, fmtKg, esc } from '../util.js';
import { A } from '../actions.js';
import * as player from './player.js';

export function render() {
  const el = document.getElementById('v-home');
  const plan = activePlan();
  const today = todaysDay();

  const html = [];

  // Laufendes Training fortsetzen
  if (S.session) {
    const done = S.session.entries.reduce((n, e) => n + e.sets.filter(s => s.done).length, 0);
    const total = S.session.entries.reduce((n, e) => n + e.sets.length, 0);
    html.push(`
      <div class="hero-card" style="border-color:var(--acc-text)">
        <div class="hero-eyebrow">Training läuft</div>
        <div class="hero-title">${esc(S.session.dayName)}</div>
        <div class="hero-meta">
          <span class="chip chip-acc">${ic('check')} ${done} / ${total} Sätze</span>
        </div>
        <button class="btn btn-acc full" onclick="A.resumeSession()">${ic('player_play')} Fortsetzen</button>
      </div>`);
  } else if (!plan) {
    html.push(`
      <div class="empty">
        ${ic('clipboard_list')}<br>
        Noch kein Trainingsplan aktiv.<br>Leg unter <b>Pläne</b> los – mit einer Vorlage oder einem eigenen Plan.
        <div class="mt16"><button class="btn btn-acc" onclick="A.tab('plans')">Zu den Plänen</button></div>
      </div>`);
  } else if (today) {
    html.push(heroCard(today, plan));
  } else {
    html.push(`
      <div class="card rest-day">
        ${ic('moon')}
        <p><b>Heute ist Ruhetag.</b><br>Erhol dich gut – Muskeln wachsen in der Pause.</p>
      </div>`);
  }

  // Andere Trainingstage des aktiven Plans (Schnellstart)
  // Häkchen = so oft wurde dieser Trainingstag diese Woche abgeschlossen –
  // egal an welchem Wochentag (Mittwoch-Training am Donnerstag zählt mit).
  if (plan && !S.session) {
    const monday = toISO(addDays(new Date(), -weekdayIdx()));
    const doneCount = d => S.logs.filter(l => l.dayId === d.id && l.date >= monday).length;
    const others = plan.days.filter(d => d !== today);
    if (others.length) {
      html.push(`<div class="slbl">Frei starten · ${esc(plan.name)}</div>`);
      html.push(others.map(d => {
        const n = doneCount(d);
        const checks = n > 0 ? `<span class="chip chip-acc" title="Diese Woche ${n}× absolviert">${'✓'.repeat(Math.min(n, 4))}</span>` : '';
        return `
        <button class="row" onclick="A.startDay('${plan.id}','${d.id}')">
          <div class="row-main">
            <div class="row-title">${esc(d.name)}</div>
            <div class="row-sub">${d.weekday != null ? DAYS_LONG[d.weekday] + ' · ' : ''}${d.entries.length} Übungen</div>
          </div>
          <div class="row-end">${checks}${ic('chevron_right')}</div>
        </button>`;
      }).join(''));
    }
  }

  // Schnell-Statistik
  const streak = calcStreak();
  html.push(`
    <div class="slbl">Dein Stand</div>
    <div class="stat-grid">
      <div class="stat">
        <div class="stat-lbl">${ic('flame')} Streak</div>
        <div class="stat-val num">${streak}<small>Tage</small></div>
      </div>
      <div class="stat">
        <div class="stat-lbl">${ic('barbell')} Workouts</div>
        <div class="stat-val num">${totalWorkouts()}</div>
      </div>
    </div>`);

  el.innerHTML = html.join('');
}

function heroCard(day, plan) {
  const list = day.entries.slice(0, 6).map(en => {
    const ex = getEx(en.exId);
    const sug = suggestFor(en.exId, en);
    const w = ex && ex.bw ? 'BW' : (sug.w > 0 ? fmtKg(sug.w) + ' kg' : '–');
    return `<div class="hero-ex"><b>${esc(ex ? ex.n : en.exId)}</b><span class="sets">${en.sets}×${en.rMin}${en.rMax !== en.rMin ? '–' + en.rMax : ''} · ${w}</span></div>`;
  }).join('');
  const more = day.entries.length > 6 ? `<div class="hero-ex t3">+ ${day.entries.length - 6} weitere</div>` : '';
  return `
    <div class="hero-card">
      <div class="hero-eyebrow">Heutiges Training · ${esc(plan.name)}</div>
      <div class="hero-title">${esc(day.name)}</div>
      <div class="hero-list">${list}${more}</div>
      <button class="btn btn-acc full" onclick="A.startDay('${plan.id}','${day.id}')">${ic('player_play')} Training starten</button>
    </div>`;
}

// ── Aktionen ──
A.startDay = (planId, dayId) => player.start(planId, dayId);
A.resumeSession = () => player.resume();
