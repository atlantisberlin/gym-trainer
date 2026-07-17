// ─── Workout-Player: Vollbild-Trainingsmodus ────────────────────────────────
import { ic } from '../icons.js';
import { S, save, getPlan, getEx, suggestFor, lastPerf, checkPR, checkAchievements, calcVol } from '../state.js';
import { todayISO, fmtKg, fmtClock, fmtVol, fmtDate, esc, stepFor, e1rm } from '../util.js';
import { openSheet, closeSheet, toast, confirmSheet, vibrate } from '../components.js';
import { exerciseLink } from '../data/exercises.js';
import { A } from '../actions.js';

let clockInterval = null;
let wakeLock = null;
let open = false;

export function isOpen() { return open; }

// ── Session starten / fortsetzen ──
export function start(planId, dayId) {
  if (S.session) { resume(); return; }
  const plan = getPlan(planId);
  const day = plan && plan.days.find(d => d.id === dayId);
  if (!day || !day.entries.length) { toast('Dieser Tag hat keine Übungen', 'info_circle'); return; }

  S.session = {
    planId, dayId,
    dayName: day.name,
    start: Date.now(),
    entries: day.entries.map(en => {
      const ex = getEx(en.exId);
      const sug = suggestFor(en.exId, en);
      const startR = (ex && ex.bw) ? (sug.r || en.rMin) : en.rMin;
      return {
        exId: en.exId,
        name: ex ? ex.n : en.exId,
        rest: en.rest || S.settings.rest,
        rMin: en.rMin, rMax: en.rMax,
        bw: !!(ex && ex.bw), time: !!(ex && ex.t),
        eq: ex ? ex.eq : null,
        pr: false,
        sets: Array.from({ length: en.sets }, () => ({ w: sug.w || 0, r: startR, done: false })),
      };
    }),
  };
  save();
  openPlayer();
}

export function resume() {
  if (!S.session) return;
  openPlayer();
}

function openPlayer() {
  open = true;
  renderPlayer();
  document.getElementById('player').classList.add('open');
  startClock();
  requestWakeLock();
}

function closePlayer() {
  open = false;
  document.getElementById('player').classList.remove('open');
  stopClock();
  releaseWakeLock();
  stopRest(true);
  A.rerender();
}

// ── Rendering ──
function renderPlayer() {
  const s = S.session;
  const el = document.getElementById('player');
  if (!s) { el.innerHTML = ''; return; }

  const cards = s.entries.map((en, ei) => exCard(en, ei)).join('');

  el.innerHTML = `
    <div class="player-head">
      <div class="ph-top">
        <button class="iconbtn" onclick="A.playerExit()" aria-label="Beenden">${ic('x')}</button>
        <div class="ph-info">
          <div class="ph-title">${esc(s.dayName)}</div>
          <div class="ph-meta"><span id="p-progress-text"></span></div>
        </div>
        <div class="num ph-clock" id="p-clock">00:00</div>
      </div>
      <div class="ph-bar"><div class="ph-fill" id="p-fill" style="width:0%"></div></div>
    </div>
    <div class="player-body"><div class="player-inner">
      ${cards}
      <div class="player-finish">
        <button class="btn btn-acc full" onclick="A.playerFinish()">${ic('trophy')} Workout abschließen</button>
      </div>
    </div></div>`;
  updateProgress();
  updateClock();
}

function exCard(en, ei) {
  const ex = getEx(en.exId);
  const link = ex ? exerciseLink(ex) : null;
  const last = lastPerf(en.exId);

  // Zuletzt-Zeile + Progressions-Chip
  let prev;
  if (!last) {
    prev = `<span class="t3">Erster Einsatz – Gewicht herantasten</span>`;
  } else {
    const done = last.entry.sets.filter(x => x.done);
    const topW = Math.max(0, ...done.map(x => x.w));
    const topR = Math.max(0, ...done.map(x => x.r));
    const unit = en.time ? 'Sek' : 'Wdh';
    prev = en.bw
      ? `<span>Zuletzt: ${topR} ${unit} · ${fmtDate(last.date)}</span>`
      : `<span>Zuletzt: ${fmtKg(topW)} kg × ${topR} · ${fmtDate(last.date)}</span>`;
    const sug = suggestFor(en.exId, { sets: en.sets.length, rMin: en.rMin, rMax: en.rMax });
    if (sug.up) prev += en.bw
      ? `<span class="suggest">↑ Mehr ${unit}!</span>`
      : `<span class="suggest">↑ +${fmtKg(sug.step)} kg</span>`;
  }

  const unitLbl = en.time ? 'Sek.' : 'Wdh.';
  const rows = en.sets.map((set, si) => setRow(en, ei, set, si)).join('');

  return `
    <div class="exc" id="card-${ei}">
      <div class="exc-head">
        <div class="grow">
          <div class="exc-name">${esc(en.name)} <span id="pr-${ei}">${en.pr ? prBadge() : ''}</span></div>
          ${link ? `<a href="${link}" target="_blank" rel="noopener" style="font-size:12px">↗ Anleitung</a>` : ''}
        </div>
      </div>
      <div class="exc-meta">
        ${(ex ? ex.m : []).slice(0, 2).map(m => `<span class="chip">${m}</span>`).join('')}
        ${en.bw ? '<span class="chip chip-acc">Bodyweight</span>' : `<span class="chip chip-line">${esc(en.eq || '')}</span>`}
        <span class="chip chip-line">${ic('stopwatch')} ${en.rest}s</span>
      </div>
      <div class="exc-prev">${prev}</div>
      <div class="set-head"><span>#</span><span>${en.bw ? '' : 'Gewicht'}</span><span>${unitLbl}</span><span>✓</span></div>
      ${rows}
    </div>`;
}

function setRow(en, ei, set, si) {
  const wStep = stepFor(en.eq);
  const barType = en.eq === 'Langhantel' || en.eq === 'EZ-Stange';
  const weightCell = en.bw
    ? `<div class="stp"><span class="stp-bw">Körpergewicht</span></div>`
    : `<div class="stp">
        <button class="stp-btn" onclick="A.stepW(${ei},${si},${-wStep})">${ic('minus')}</button>
        <span class="stp-val num" id="w-${ei}-${si}"${barType ? ` onclick="A.platesFor(${ei},${si})" title="Scheibenrechner"` : ''}>${fmtKg(set.w)}<small>kg</small></span>
        <button class="stp-btn" onclick="A.stepW(${ei},${si},${wStep})">${ic('plus')}</button>
      </div>`;
  const rStep = en.time ? 5 : 1;
  return `
    <div class="set-row${set.done ? ' done' : ''}" id="row-${ei}-${si}">
      <span class="set-idx">${si + 1}</span>
      ${weightCell}
      <div class="stp">
        <button class="stp-btn" onclick="A.stepR(${ei},${si},${-rStep})">${ic('minus')}</button>
        <span class="stp-val num" id="r-${ei}-${si}">${set.r}</span>
        <button class="stp-btn" onclick="A.stepR(${ei},${si},${rStep})">${ic('plus')}</button>
      </div>
      <button class="set-check${set.done ? ' on' : ''}" id="chk-${ei}-${si}" onclick="A.toggleSet(${ei},${si})" aria-label="Satz ${si + 1} abhaken">${ic('check')}</button>
    </div>`;
}

function prBadge() {
  return `<span class="chip chip-acc" style="font-size:10.5px;padding:2px 8px">${ic('trophy')} PR</span>`;
}

// ── Fortschritt / Uhr ──
function updateProgress() {
  const s = S.session;
  if (!s) return;
  const total = s.entries.reduce((n, e) => n + e.sets.length, 0);
  const done = s.entries.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
  const fill = document.getElementById('p-fill');
  const txt = document.getElementById('p-progress-text');
  if (fill) fill.style.width = (total ? Math.round(done / total * 100) : 0) + '%';
  if (txt) txt.textContent = `${done} / ${total} Sätze`;
  s.entries.forEach((e, ei) => {
    const card = document.getElementById('card-' + ei);
    if (card) card.classList.toggle('done-all', e.sets.every(x => x.done));
  });
}

function startClock() {
  stopClock();
  clockInterval = setInterval(updateClock, 1000);
  updateClock();
}
function stopClock() {
  if (clockInterval) { clearInterval(clockInterval); clockInterval = null; }
}
function updateClock() {
  const el = document.getElementById('p-clock');
  if (el && S.session) el.textContent = fmtClock(Math.floor((Date.now() - S.session.start) / 1000));
}

// ── Wake Lock ──
async function requestWakeLock() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
function releaseWakeLock() {
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && open) requestWakeLock();
});

// ── Aktionen: Stepper & Satz-Check ──
A.stepW = (ei, si, delta) => {
  const en = S.session.entries[ei];
  const set = en.sets[si];
  set.w = Math.max(0, Math.round((set.w + delta) * 100) / 100);
  // Noch offene Folgesätze mitziehen
  for (let i = si + 1; i < en.sets.length; i++) {
    if (!en.sets[i].done) en.sets[i].w = set.w;
  }
  save();
  for (let i = si; i < en.sets.length; i++) {
    const el = document.getElementById(`w-${ei}-${i}`);
    if (el && !en.sets[i].done) el.innerHTML = `${fmtKg(en.sets[i].w)}<small>kg</small>`;
    else if (el && i === si) el.innerHTML = `${fmtKg(set.w)}<small>kg</small>`;
  }
};

A.platesFor = (ei, si) => {
  const set = S.session && S.session.entries[ei] && S.session.entries[ei].sets[si];
  if (set && set.w > 0) A.plates(set.w);
};

A.stepR = (ei, si, delta) => {
  const set = S.session.entries[ei].sets[si];
  set.r = Math.max(1, set.r + delta);
  save();
  const el = document.getElementById(`r-${ei}-${si}`);
  if (el) el.textContent = set.r;
};

A.toggleSet = (ei, si) => {
  const s = S.session;
  const en = s.entries[ei];
  const set = en.sets[si];
  set.done = !set.done;
  vibrate(20);

  const chk = document.getElementById(`chk-${ei}-${si}`);
  const row = document.getElementById(`row-${ei}-${si}`);
  if (chk) chk.classList.toggle('on', set.done);
  if (row) row.classList.toggle('done', set.done);

  if (set.done) {
    // PR-Check (nur mit Gewicht)
    if (!en.bw && checkPR(en.exId, set.w, set.r)) {
      en.pr = true;
      const badge = document.getElementById(`pr-${ei}`);
      if (badge) badge.innerHTML = prBadge();
      toast('Neuer Rekord! 🏆', 'trophy');
    }
    // Pause starten – außer es war der allerletzte Satz
    const allDone = s.entries.every(e => e.sets.every(x => x.done));
    if (!allDone) startRest(en.rest, nextLabel(ei, si));
  }
  save();
  updateProgress();
};

function nextLabel(ei, si) {
  const s = S.session;
  const en = s.entries[ei];
  if (si + 1 < en.sets.length && !en.sets[si + 1].done) return `Nächster Satz: ${en.name}`;
  for (let i = 0; i < s.entries.length; i++) {
    const e = s.entries[(ei + 1 + i) % s.entries.length];
    if (e.sets.some(x => !x.done)) return `Weiter mit: ${e.name}`;
  }
  return '';
}

// ── Pausen-Timer ──
let restInterval = null;
let restLeft = 0;
let restTotal = 0;

function startRest(secs, label) {
  stopRest(true);
  restLeft = restTotal = secs;
  const ov = document.getElementById('rest-overlay');
  ov.innerHTML = `
    <div class="rest-lbl">Pause</div>
    <div class="rest-ring-wrap">
      <svg width="190" height="190" viewBox="0 0 190 190">
        <circle cx="95" cy="95" r="86" fill="none" stroke="rgba(255,255,255,.12)" stroke-width="9"/>
        <circle id="rest-ring" cx="95" cy="95" r="86" fill="none" stroke="#c8f542" stroke-width="9"
          stroke-linecap="round" stroke-dasharray="540.35" stroke-dashoffset="0"/>
      </svg>
      <div class="rest-secs num" id="rest-secs">${secs}</div>
    </div>
    <div class="rest-next">${esc(label || '')}</div>
    <div class="rest-btns">
      <button class="btn sm" onclick="A.restPlus()">+15s</button>
      <button class="btn sm" onclick="A.restSkip()">Überspringen ${ic('chevron_right')}</button>
    </div>`;
  ov.classList.add('open');
  restInterval = setInterval(tickRest, 1000);
}

function tickRest() {
  restLeft--;
  const secsEl = document.getElementById('rest-secs');
  const ring = document.getElementById('rest-ring');
  if (secsEl) secsEl.textContent = Math.max(0, restLeft);
  if (ring) ring.style.strokeDashoffset = (540.35 * (1 - restLeft / restTotal)).toFixed(1);
  if (restLeft <= 0) {
    stopRest();
    vibrate([250, 120, 250]);
  }
}

function stopRest(silent = false) {
  if (restInterval) { clearInterval(restInterval); restInterval = null; }
  const ov = document.getElementById('rest-overlay');
  if (ov) ov.classList.remove('open');
}

A.restPlus = () => { restLeft += 15; restTotal = Math.max(restTotal, restLeft); tickRestDisplay(); };
A.restSkip = () => stopRest();

function tickRestDisplay() {
  const secsEl = document.getElementById('rest-secs');
  if (secsEl) secsEl.textContent = restLeft;
}

// ── Beenden / Verwerfen ──
A.playerExit = () => {
  openSheet({
    title: 'Training unterbrechen?',
    body: `
      <button class="btn full" data-later>${ic('player_pause')} Später fortsetzen</button>
      <button class="btn btn-danger full mt8" data-discard>${ic('trash')} Training verwerfen</button>
      <button class="btn btn-ghost full mt8" data-back>Zurück zum Training</button>`,
    onOpen(sheet) {
      sheet.querySelector('[data-later]').addEventListener('click', () => { closeSheet(); closePlayer(); });
      sheet.querySelector('[data-discard]').addEventListener('click', async () => {
        closeSheet();
        if (await confirmSheet('Training verwerfen?', 'Alle Sätze dieser Einheit gehen verloren.', 'Verwerfen')) {
          S.session = null;
          save();
          closePlayer();
        }
      });
      sheet.querySelector('[data-back]').addEventListener('click', () => closeSheet());
    },
  });
};

A.playerFinish = async () => {
  const s = S.session;
  if (!s) return;
  const doneSets = s.entries.reduce((n, e) => n + e.sets.filter(x => x.done).length, 0);
  if (doneSets === 0) {
    if (!(await confirmSheet('Nichts abgehakt', 'Du hast keinen Satz abgehakt. Training trotzdem beenden und verwerfen?', 'Beenden'))) return;
    S.session = null;
    save();
    closePlayer();
    return;
  }

  const duration = Math.floor((Date.now() - s.start) / 1000);
  const entries = s.entries.map(e => ({ exId: e.exId, name: e.name, sets: e.sets }));
  const vol = calcVol(entries);
  const prs = s.entries.filter(e => e.pr).map(e => e.name);

  S.logs.unshift({
    id: Math.random().toString(36).slice(2),
    date: todayISO(),
    planId: s.planId, dayId: s.dayId,
    dayName: s.dayName,
    duration, vol, entries, prs,
  });
  S.session = null;
  save();
  const fresh = checkAchievements();
  stopRest(true);

  // Zusammenfassung
  openSheet({
    title: 'Geschafft!',
    body: `
      <div class="summary-hero">
        ${ic('trophy')}
        <div class="summary-title">${esc(s.dayName)}</div>
      </div>
      <div class="summary-stats">
        <div class="summary-stat"><span class="num">${fmtClock(duration)}</span><span>Dauer</span></div>
        <div class="summary-stat"><span class="num">${doneSets}</span><span>Sätze</span></div>
        <div class="summary-stat"><span class="num">${fmtVol(vol)}</span><span>Volumen</span></div>
      </div>
      ${prs.length ? `<div class="slbl">Neue Rekorde</div>${prs.map(n => `<div class="chip chip-acc" style="margin:0 6px 6px 0">${ic('trophy')} ${esc(n)}</div>`).join('')}` : ''}
      ${fresh.length ? `<div class="slbl">Freigeschaltet</div>${fresh.map(a => `<div class="chip chip-acc" style="margin:0 6px 6px 0">${ic(a.icon)} ${esc(a.name)}</div>`).join('')}` : ''}
      <button class="btn btn-acc full mt16" data-done>Fertig</button>`,
    onOpen(sheet) {
      sheet.querySelector('[data-done]').addEventListener('click', () => { closeSheet(); closePlayer(); });
    },
    onClose() { if (open) closePlayer(); },
  });
};
