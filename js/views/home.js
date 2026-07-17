// ─── Heute: Wochenübersicht, heutiges Training, Schnellstart ────────────────
import { ic } from '../icons.js';
import { S, activePlan, todaysDay, getEx, calcStreak, totalWorkouts, suggestFor } from '../state.js';
import { DAYS, DAYS_LONG, toISO, addDays, weekdayIdx, fmtKg, esc } from '../util.js';
import { A } from '../actions.js';
import * as player from './player.js';

export function render() {
  const el = document.getElementById('v-home');
  const plan = activePlan();
  const today = todaysDay();
  const wd = weekdayIdx();

  // Wochen-Strip: Mo–So der aktuellen Woche
  const monday = addDays(new Date(), -wd);
  const logDates = new Set(S.logs.map(l => l.date));
  const plannedDays = new Set(plan ? plan.days.map(d => d.weekday).filter(w => w != null) : []);
  const strip = DAYS.map((d, i) => {
    const date = addDays(monday, i);
    const iso = toISO(date);
    const done = logDates.has(iso);
    const cls = ['ws-day', done ? 'done' : '', i === wd ? 'today' : '', plannedDays.has(i) && !done ? 'planned' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}"><span>${d}</span><b>${date.getDate()}</b><span class="ws-dot"></span></div>`;
  }).join('');

  const html = [`<div class="week-strip">${strip}</div>`];

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
  if (plan && !S.session) {
    const others = plan.days.filter(d => d !== today);
    if (others.length) {
      html.push(`<div class="slbl">Frei starten · ${esc(plan.name)}</div>`);
      html.push(others.map(d => `
        <button class="row" onclick="A.startDay('${plan.id}','${d.id}')">
          <div class="row-main">
            <div class="row-title">${esc(d.name)}</div>
            <div class="row-sub">${d.weekday != null ? DAYS_LONG[d.weekday] + ' · ' : ''}${d.entries.length} Übungen</div>
          </div>
          <div class="row-end">${ic('chevron_right')}</div>
        </button>`).join(''));
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
