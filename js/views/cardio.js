// ─── Cardio: Wochenziel, Schnellstart, Vorlagen, Live-Timer, Apple-Watch-Kurzbefehle ──
import { ic } from '../icons.js';
import { S, save, cardioMinutesSince } from '../state.js';
import { uid, esc, todayISO, toISO, fromISO, addDays, weekdayIdx, fmtDate, fmtClock } from '../util.js';
import { openSheet, closeSheet, toast, confirmSheet, vibrate } from '../components.js';
import { A } from '../actions.js';

export const DEVICES = [
  { id: 'laufband',     label: 'Laufband',     icon: 'run' },
  { id: 'ergometer',    label: 'Ergometer',    icon: 'bike' },
  { id: 'crosstrainer', label: 'Crosstrainer', icon: 'walk' },
  { id: 'rudern',       label: 'Rudern',       icon: 'rowing' },
  { id: 'stepper',      label: 'Stepper',      icon: 'stairs_up' },
  { id: 'draussen',     label: 'Draußen',      icon: 'route' },
];
const dev = id => DEVICES.find(d => d.id === id) || DEVICES[0];

const fmtNum = (v, digits = 1) => v == null ? '' : String(Math.round(v * 10 ** digits) / 10 ** digits).replace('.', ',');
const mondayISO = () => toISO(addDays(new Date(), -weekdayIdx()));

// Tempo in min/km als "6:06"
function fmtPace(min, km) {
  if (!min || !km) return '';
  const secs = Math.round(min * 60 / km);
  return `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
}

// ═══ Tab ════════════════════════════════════════════════════════════════════
export function render() {
  const el = document.getElementById('v-cardio');
  const c = S.cardio;
  const html = [];

  if (c.session) {
    html.push(`
      <div class="hero-card" style="border-color:var(--acc-text)">
        <div class="hero-eyebrow">Cardio läuft</div>
        <div class="hero-title">${esc(c.session.name)}</div>
        <button class="btn btn-acc full" onclick="A.cardioResume()">${ic('player_play')} Fortsetzen</button>
      </div>`);
  } else if (c.pending) {
    html.push(`
      <div class="hero-card" style="border-color:var(--acc-text)">
        <div class="hero-eyebrow">Einheit beendet · ${c.pending.min} min</div>
        <div class="hero-title">${esc(c.pending.name)}</div>
        <button class="btn btn-acc full" onclick="A.cardioLog()">${ic('check')} Werte eintragen &amp; speichern</button>
      </div>`);
  }

  html.push(goalCardHTML());

  html.push(`<div class="slbl">Schnellstart</div>
    <div class="dev-grid">${DEVICES.map(d => `
      <button class="dev-tile" onclick="A.cardioQuick('${d.id}')">${ic(d.icon)}<b>${d.label}</b></button>`).join('')}
    </div>`);

  html.push(`<div class="slbl">Meine Vorlagen</div>`);
  html.push(c.templates.map(t => `
    <div class="row" style="padding:12px 12px 12px 14px">
      <button class="row-main flex" style="gap:12px;text-align:left" onclick="A.cardioStartTpl('${t.id}')">
        <span class="dev-ic">${ic(t.mode === 'interval' ? 'bolt' : dev(t.device).icon)}</span>
        <span class="row-main">
          <span class="row-title" style="display:block">${esc(t.name)} · ${dev(t.device).label}</span>
          <span class="row-sub" style="display:block">${tplSummary(t)}</span>
        </span>
      </button>
      <button class="iconbtn" style="width:36px;height:36px" onclick="A.cardioEditTpl('${t.id}')" aria-label="Vorlage bearbeiten">${ic('pencil')}</button>
    </div>`).join(''));
  html.push(`<button class="btn full" onclick="A.cardioEditTpl()">${ic('plus')} Neue Vorlage</button>`);

  html.push(`<div class="slbl">Zuletzt</div>`);
  if (c.logs.length) html.push(c.logs.slice(0, 3).map(logRowHTML).join(''));
  else html.push(`<div class="empty">${ic('heartbeat')}<br>Noch keine Cardio-Einheit.<br>Starte oben oder trag eine nach.</div>`);
  html.push(`<button class="btn full" onclick="A.cardioLog(true)">${ic('pencil')} Einheit nachtragen</button>`);

  html.push(`<div class="slbl">Apple Watch</div>
    <button class="row" onclick="A.cardioWatchSetup()">
      <span class="dev-ic">${ic('device_watch')}</span>
      <div class="row-main">
        <div class="row-title">${c.watch.enabled ? 'Verbunden über Kurzbefehle' : 'Mit Apple Watch verbinden'}</div>
        <div class="row-sub">${c.watch.enabled ? 'Training startet automatisch auf der Uhr' : 'Training auf der Uhr mitstarten, Puls & kcal übernehmen'}</div>
      </div>
      <div class="row-end">${c.watch.enabled ? `<span class="chip chip-acc">${ic('check')} Aktiv</span>` : ''}${ic('chevron_right')}</div>
    </button>`);

  el.innerHTML = html.join('');
}

function goalCardHTML() {
  const c = S.cardio;
  const monday = mondayISO();
  const weekLogs = c.logs.filter(l => l.date >= monday);
  const min = cardioMinutesSince(monday);
  const km = weekLogs.reduce((n, l) => n + (l.km || 0), 0);
  const goal = c.goalMin || 150;
  const frac = Math.min(1, min / goal);
  const circ = 2 * Math.PI * 46;
  const rest = Math.max(0, goal - min);
  return `
    <div class="card cring">
      <svg width="108" height="108" viewBox="0 0 108 108" role="img" aria-label="Wochenziel: ${min} von ${goal} Minuten">
        <circle cx="54" cy="54" r="46" fill="none" stroke="var(--s3)" stroke-width="10"/>
        ${frac > 0 ? `<circle cx="54" cy="54" r="46" fill="none" stroke="var(--acc)" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${(circ * frac).toFixed(1)} ${circ.toFixed(1)}" transform="rotate(-90 54 54)"/>` : ''}
        <text x="54" y="56" text-anchor="middle" fill="var(--t1)" font-size="26" font-weight="800" style="font-variation-settings:'wdth' 118">${min}</text>
        <text x="54" y="73" text-anchor="middle" fill="var(--t2)" font-size="11" font-weight="600">von ${goal} min</text>
      </svg>
      <div style="flex:1;min-width:0">
        <div class="hero-eyebrow" style="margin-bottom:4px">Wochenziel</div>
        <div class="num" style="font-size:22px;line-height:1.1;margin-bottom:10px">${rest ? `Noch ${rest} min` : 'Geschafft!'}</div>
        <div class="flex" style="flex-wrap:wrap;gap:6px">
          <span class="chip chip-acc">${weekLogs.length} Einheit${weekLogs.length === 1 ? '' : 'en'}</span>
          ${km ? `<span class="chip">${fmtNum(km)} km</span>` : ''}
          <button class="chip chip-line" onclick="A.cardioGoal()" aria-label="Wochenziel ändern">${ic('pencil')} Ziel</button>
        </div>
      </div>
    </div>`;
}

function tplSummary(t) {
  const parts = [];
  if (t.mode === 'interval') {
    parts.push(`${t.rounds} × ${t.workSec} s / ${t.restSec} s`);
    parts.push(`${Math.round((t.rounds * t.workSec + (t.rounds - 1) * t.restSec) / 60)} min`);
  } else if (t.targetMin) parts.push(`${t.targetMin} min`);
  if (t.note) parts.push(esc(t.note));
  return parts.join(' · ') || 'Freies Training';
}

function logRowHTML(l) {
  const sub = [fmtDate(l.date), `${l.min} min`];
  if (l.km) sub.push(`${fmtNum(l.km, 2)} km`);
  if (l.hr) sub.push(`Ø ${l.hr} bpm`);
  if (l.kcal) sub.push(`${l.kcal} kcal`);
  const pace = (l.device === 'laufband' || l.device === 'draussen') ? fmtPace(l.min, l.km) : '';
  return `
    <div class="row" style="cursor:default">
      <span class="dev-ic">${ic(dev(l.device).icon)}</span>
      <div class="row-main">
        <div class="row-title">${esc(l.name || dev(l.device).label)}</div>
        <div class="row-sub">${sub.join(' · ')}</div>
      </div>
      <div class="row-end">${pace ? `<span class="t2" style="font-size:13px;font-weight:650">${pace}/km</span>` : ''}</div>
    </div>`;
}

A.cardioGoal = () => {
  let g = S.cardio.goalMin;
  openSheet({
    title: 'Wochenziel',
    body: `
      <div class="mstp-row">
        <span class="mstp-lbl">Cardio pro Woche</span>
        <div class="mstp">
          <button data-d="-15" aria-label="Weniger">${ic('minus')}</button>
          <b id="cg-v">${g} min</b>
          <button data-d="15" aria-label="Mehr">${ic('plus')}</button>
        </div>
      </div>
      <div class="field-hint" style="margin-bottom:14px">Die WHO empfiehlt 150 min moderat oder 75 min intensiv pro Woche.</div>
      <button class="btn btn-acc full" data-ok>Speichern</button>`,
    onOpen(sheet) {
      sheet.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => {
        g = Math.min(600, Math.max(15, g + parseInt(b.dataset.d)));
        sheet.querySelector('#cg-v').textContent = g + ' min';
      }));
      sheet.querySelector('[data-ok]').addEventListener('click', () => {
        S.cardio.goalMin = g; save(); closeSheet(); render();
      });
    },
  });
};

// ═══ Vorlagen ═══════════════════════════════════════════════════════════════
A.cardioEditTpl = id => {
  const existing = id && S.cardio.templates.find(t => t.id === id);
  const t = existing ? { ...existing } : { name: '', device: 'laufband', mode: 'free', targetMin: 30, workSec: 30, restSec: 90, rounds: 8, note: '' };
  openSheet({
    title: existing ? 'Vorlage bearbeiten' : 'Neue Vorlage',
    body: `
      <div class="field"><label for="ct-name">Name</label><input class="inp" id="ct-name" value="${esc(t.name)}" placeholder="z. B. Zone 2"></div>
      <div class="field"><label>Gerät</label><div class="pills" style="flex-wrap:wrap">
        ${DEVICES.map(d => `<button class="pill${d.id === t.device ? ' on' : ''}" data-dev="${d.id}">${d.label}</button>`).join('')}
      </div></div>
      <div class="seg" style="margin-bottom:14px">
        <button data-mode="free" class="${t.mode === 'free' ? 'on' : ''}">${ic('stopwatch')} Dauer</button>
        <button data-mode="interval" class="${t.mode === 'interval' ? 'on' : ''}">${ic('bolt')} Intervall</button>
      </div>
      <div data-free ${t.mode === 'interval' ? 'hidden' : ''}>
        <div class="field"><label for="ct-min">Zieldauer (min, optional)</label><input class="inp" id="ct-min" type="number" inputmode="numeric" value="${t.targetMin || ''}"></div>
      </div>
      <div data-int ${t.mode === 'free' ? 'hidden' : ''}>
        <div class="field-row">
          <div class="field"><label for="ct-w">Belastung (s)</label><input class="inp" id="ct-w" type="number" inputmode="numeric" value="${t.workSec}"></div>
          <div class="field"><label for="ct-r">Pause (s)</label><input class="inp" id="ct-r" type="number" inputmode="numeric" value="${t.restSec}"></div>
          <div class="field"><label for="ct-n">Runden</label><input class="inp" id="ct-n" type="number" inputmode="numeric" value="${t.rounds}"></div>
        </div>
      </div>
      <div class="field"><label for="ct-note">Hinweis (optional)</label><input class="inp" id="ct-note" value="${esc(t.note || '')}" placeholder="z. B. Puls 125–140, 6° Steigung"></div>
      <button class="btn btn-acc full" data-save>${ic('check')} Speichern</button>
      ${existing ? `<button class="btn btn-danger full mt8" data-del>${ic('trash')} Löschen</button>` : ''}`,
    onOpen(sheet) {
      const $ = s => sheet.querySelector(s);
      sheet.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => {
        t.device = b.dataset.dev;
        sheet.querySelectorAll('[data-dev]').forEach(x => x.classList.toggle('on', x === b));
      }));
      sheet.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => {
        t.mode = b.dataset.mode;
        sheet.querySelectorAll('[data-mode]').forEach(x => x.classList.toggle('on', x === b));
        $('[data-free]').hidden = t.mode !== 'free';
        $('[data-int]').hidden = t.mode !== 'interval';
      }));
      $('[data-save]').addEventListener('click', () => {
        const int = (sel, def) => { const v = parseInt($(sel).value); return v > 0 ? v : def; };
        const out = {
          id: existing ? existing.id : uid(),
          name: $('#ct-name').value.trim() || dev(t.device).label,
          device: t.device, mode: t.mode,
          note: $('#ct-note').value.trim(),
        };
        if (t.mode === 'interval') Object.assign(out, { workSec: int('#ct-w', 30), restSec: int('#ct-r', 90), rounds: int('#ct-n', 8) });
        else out.targetMin = int('#ct-min', null);
        if (existing) S.cardio.templates[S.cardio.templates.indexOf(existing)] = out;
        else S.cardio.templates.push(out);
        save(); closeSheet(); render();
      });
      if (existing) $('[data-del]').addEventListener('click', async () => {
        closeSheet();
        if (!(await confirmSheet('Vorlage löschen?', `„${esc(existing.name)}“ wird entfernt.`))) return;
        S.cardio.templates = S.cardio.templates.filter(x => x !== existing);
        save(); render();
      });
    },
  });
};

// ═══ Live-Einheit ═══════════════════════════════════════════════════════════
let tick = null;
let wakeLock = null;
let lastPhase = -1;

A.cardioQuick = deviceId => startSession({ device: deviceId, name: dev(deviceId).label, mode: 'free' });

A.cardioStartTpl = id => {
  const t = S.cardio.templates.find(x => x.id === id);
  if (t) startSession({ ...t, templateId: t.id, name: t.name });
};

A.cardioResume = () => openPlayer();

function startSession(t) {
  if (S.cardio.session) { openPlayer(); return; }
  S.cardio.session = {
    device: t.device, name: t.name, templateId: t.templateId || null,
    mode: t.mode || 'free', targetMin: t.targetMin || null,
    workSec: t.workSec, restSec: t.restSec, rounds: t.rounds, note: t.note || '',
    start: Date.now(), pausedAt: null, pausedMs: 0,
  };
  save();
  openPlayer();
  if (S.cardio.watch.enabled) runShortcut(S.cardio.watch.startName, dev(t.device).label);
}

// Kurzbefehl über das URL-Schema der Kurzbefehle-App starten (iOS).
// Die App wechselt dabei kurz in „Kurzbefehle“; die Zeit läuft über Zeitstempel weiter.
function runShortcut(name, text) {
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${encodeURIComponent(text)}`;
  setTimeout(() => { location.href = url; }, 250);
}

function activeSecs(s) {
  const now = s.pausedAt || Date.now();
  return Math.max(0, Math.floor((now - s.start - s.pausedMs) / 1000));
}

// Intervall-Ablauf: Belastung/Pause im Wechsel, nach der letzten Belastung Schluss
function phases(s) {
  const list = [];
  for (let r = 1; r <= s.rounds; r++) {
    list.push({ kind: 'work', sec: s.workSec, round: r });
    if (r < s.rounds) list.push({ kind: 'rest', sec: s.restSec, round: r });
  }
  return list;
}

function phaseAt(s, t) {
  const list = phases(s);
  let acc = 0;
  for (let i = 0; i < list.length; i++) {
    if (t < acc + list[i].sec) return { ...list[i], index: i, left: acc + list[i].sec - t, list };
    acc += list[i].sec;
  }
  return { kind: 'done', index: list.length, left: 0, list };
}

function openPlayer() {
  const el = document.getElementById('cardio-player');
  el.classList.add('open');
  lastPhase = -1;
  renderPlayer();
  clearInterval(tick);
  tick = setInterval(updatePlayer, 1000);
  requestWakeLock();
}

function closePlayer() {
  document.getElementById('cardio-player').classList.remove('open');
  clearInterval(tick); tick = null;
  if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  A.rerender();
}

async function requestWakeLock() {
  if (!S.settings.wakeLock || !('wakeLock' in navigator)) return;
  try { wakeLock = await navigator.wakeLock.request('screen'); } catch (e) {}
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && tick) { requestWakeLock(); updatePlayer(); }
});

function renderPlayer() {
  const s = S.cardio.session;
  const el = document.getElementById('cardio-player');
  if (!s) { el.innerHTML = ''; return; }
  const sub = s.mode === 'interval' ? `${s.rounds} × ${s.workSec} s / ${s.restSec} s` : (s.targetMin ? `Ziel ${s.targetMin} min` : 'Freies Training');
  el.innerHTML = `
    <div class="player-head">
      <div class="ph-top">
        <button class="iconbtn" onclick="A.cardioMinimize()" aria-label="Minimieren">${ic('chevron_down')}</button>
        <div class="ph-info">
          <div class="ph-title">${esc(s.name)}</div>
          <div class="ph-meta">${dev(s.device).label} · ${sub}</div>
        </div>
        <span class="chip chip-acc" id="cp-chip"></span>
      </div>
      <div class="cp-segs" id="cp-segs"></div>
    </div>
    <div class="cp-main">
      <div class="cp-phase" id="cp-phase"></div>
      <div class="num cp-clock" id="cp-clock">0:00</div>
      <div class="cp-sub" id="cp-sub"></div>
      ${s.note ? `<div class="cp-note">${esc(s.note)}</div>` : ''}
      ${S.cardio.watch.enabled ? `<div class="cp-note">${ic('device_watch')} Puls &amp; Kalorien zeichnet die Apple Watch auf</div>` : ''}
    </div>
    <div class="cp-actions">
      <button class="btn btn-danger" style="flex:1" onclick="A.cardioEnd()">${ic('player_stop')} Beenden</button>
      <button class="btn btn-acc" style="flex:1.6" id="cp-pause" onclick="A.cardioPause()"></button>
    </div>`;
  updatePlayer();
}

function updatePlayer() {
  const s = S.cardio.session;
  if (!s) return;
  const t = activeSecs(s);
  const $ = id => document.getElementById(id);
  if (!$('cp-clock')) return;
  $('cp-pause').innerHTML = s.pausedAt ? `${ic('player_play')} Weiter` : `${ic('player_pause')} Pause`;

  if (s.mode === 'interval') {
    const p = phaseAt(s, t);
    if (p.index !== lastPhase) {
      if (lastPhase !== -1) vibrate(p.kind === 'work' ? [200, 100, 200] : p.kind === 'done' ? [300, 120, 300, 120, 300] : 250);
      lastPhase = p.index;
    }
    const total = p.list.reduce((n, x) => n + x.sec, 0);
    $('cp-chip').textContent = p.kind === 'done' ? 'Fertig' : `Runde ${p.round}/${s.rounds}`;
    $('cp-phase').textContent = p.kind === 'work' ? 'Belastung' : p.kind === 'rest' ? 'Locker' : 'Geschafft';
    $('cp-phase').className = 'cp-phase' + (p.kind === 'work' ? ' on' : '');
    $('cp-clock').textContent = p.kind === 'done' ? fmtClock(t) : fmtClock(p.left);
    const next = p.list[p.index + 1];
    $('cp-sub').textContent = p.kind === 'done'
      ? 'Alle Runden durch – jetzt beenden'
      : `${next ? `danach ${fmtClock(next.sec)} ${next.kind === 'work' ? 'Belastung' : 'locker'} · ` : 'letzte Runde · '}gesamt ${fmtClock(Math.min(t, total))} / ${fmtClock(total)}`;
    // Rundensegmente: gefüllt = Belastung erledigt
    $('cp-segs').innerHTML = p.list.filter(x => x.kind === 'work').map(w => {
      const startIdx = p.list.indexOf(w);
      const startT = p.list.slice(0, startIdx).reduce((n, x) => n + x.sec, 0);
      const f = Math.min(1, Math.max(0, (t - startT) / w.sec));
      return `<span><i style="width:${(f * 100).toFixed(0)}%"></i></span>`;
    }).join('');
  } else {
    $('cp-chip').textContent = s.pausedAt ? 'Pausiert' : 'Läuft';
    $('cp-phase').textContent = s.pausedAt ? 'Pausiert' : 'Dauer';
    $('cp-phase').className = 'cp-phase' + (s.pausedAt ? '' : ' on');
    $('cp-clock').textContent = fmtClock(t);
    if (s.targetMin) {
      const left = s.targetMin * 60 - t;
      if (left <= 0 && lastPhase !== 1) { if (lastPhase === 0) vibrate([300, 120, 300]); lastPhase = 1; }
      else if (left > 0) lastPhase = 0;
      $('cp-sub').textContent = left > 0 ? `noch ${fmtClock(left)} bis ${s.targetMin} min` : `Ziel von ${s.targetMin} min erreicht`;
      $('cp-segs').innerHTML = `<span><i style="width:${Math.min(100, t / (s.targetMin * 60) * 100).toFixed(1)}%"></i></span>`;
    } else {
      $('cp-sub').textContent = '';
      $('cp-segs').innerHTML = '';
    }
  }
}

A.cardioMinimize = () => closePlayer();

A.cardioPause = () => {
  const s = S.cardio.session;
  if (!s) return;
  if (s.pausedAt) { s.pausedMs += Date.now() - s.pausedAt; s.pausedAt = null; }
  else s.pausedAt = Date.now();
  save();
  updatePlayer();
};

A.cardioEnd = async () => {
  const s = S.cardio.session;
  if (!s) return;
  const secs = activeSecs(s);
  if (secs < 60) {
    if (!(await confirmSheet('Einheit verwerfen?', 'Unter einer Minute – die Einheit wird nicht gespeichert.', 'Verwerfen'))) return;
    S.cardio.session = null; save(); closePlayer(); return;
  }
  S.cardio.pending = { device: s.device, name: s.name, min: Math.max(1, Math.round(secs / 60)), date: todayISO() };
  S.cardio.session = null;
  save();
  closePlayer();
  A.cardioLog();
};

// ═══ Eintragen / Nachtragen ═════════════════════════════════════════════════
// manual = true → leeres Formular (Nachtragen), sonst die gerade beendete Einheit
A.cardioLog = manual => {
  const pending = !manual && S.cardio.pending;
  const d = pending ? { ...pending } : { device: 'laufband', name: '', min: '', date: todayISO() };
  const w = S.cardio.watch;
  openSheet({
    title: pending ? 'Einheit speichern' : 'Einheit nachtragen',
    body: `
      ${w.enabled ? `
        <div class="card" style="background:var(--s2)">
          <div class="row-title" style="display:flex;align-items:center;gap:8px">${ic('device_watch')} Werte von der Apple Watch</div>
          <div class="row-sub" style="margin:4px 0 12px">Erst das Training auf der Uhr beenden. Dann Werte holen, zurück in die App wechseln und einfügen.</div>
          <div class="flex" style="gap:8px">
            <button class="btn sm" style="flex:1" data-fetch>${ic('download')} 1. Holen</button>
            <button class="btn sm btn-acc" style="flex:1" data-paste>${ic('clipboard_check')} 2. Einfügen</button>
          </div>
          <textarea class="inp" data-pastebox hidden rows="3" style="margin-top:10px" placeholder="Zwischenablage hier einfügen (lange tippen → Einsetzen)"></textarea>
        </div>` : ''}
      <div class="field"><label>Gerät</label><div class="pills" style="flex-wrap:wrap">
        ${DEVICES.map(x => `<button class="pill${x.id === d.device ? ' on' : ''}" data-dev="${x.id}">${x.label}</button>`).join('')}
      </div></div>
      <div class="field-row">
        <div class="field"><label for="cl-min">Dauer (min)</label><input class="inp" id="cl-min" type="number" inputmode="numeric" value="${d.min}"></div>
        <div class="field"><label for="cl-km">Distanz (km)</label><input class="inp" id="cl-km" type="text" inputmode="decimal" placeholder="optional"></div>
      </div>
      <div class="field-row">
        <div class="field"><label for="cl-hr">Ø Puls (bpm)</label><input class="inp" id="cl-hr" type="number" inputmode="numeric" placeholder="optional"></div>
        <div class="field"><label for="cl-kcal">Kalorien</label><input class="inp" id="cl-kcal" type="number" inputmode="numeric" placeholder="optional"></div>
      </div>
      <div class="field"><label for="cl-date">Datum</label><input class="inp" id="cl-date" type="date" value="${d.date}" max="${todayISO()}"></div>
      <div class="field"><label>Anstrengung (optional)</label>
        <div class="rpe-row">${Array.from({ length: 10 }, (_, i) => `<button class="rpe" data-rpe="${i + 1}">${i + 1}</button>`).join('')}</div>
        <div class="flex" style="justify-content:space-between;font-size:11px;color:var(--t3);margin-top:5px"><span>locker</span><span>maximal</span></div>
      </div>
      <button class="btn btn-acc full" data-save>${ic('check')} Speichern</button>
      ${pending ? `<button class="btn btn-ghost full mt8" data-discard>Verwerfen</button>` : ''}`,
    onOpen(sheet) {
      const $ = s => sheet.querySelector(s);
      let device = d.device, rpe = null;
      sheet.querySelectorAll('[data-dev]').forEach(b => b.addEventListener('click', () => {
        device = b.dataset.dev;
        sheet.querySelectorAll('[data-dev]').forEach(x => x.classList.toggle('on', x === b));
      }));
      sheet.querySelectorAll('[data-rpe]').forEach(b => b.addEventListener('click', () => {
        rpe = rpe === +b.dataset.rpe ? null : +b.dataset.rpe;
        sheet.querySelectorAll('[data-rpe]').forEach(x => x.classList.toggle('on', +x.dataset.rpe === rpe));
      }));

      const fill = text => {
        const v = parseHealthText(text);
        if (!v) { toast('Keine Werte erkannt', 'info_circle'); return false; }
        if (v.hr) $('#cl-hr').value = Math.round(v.hr);
        if (v.kcal) $('#cl-kcal').value = Math.round(v.kcal);
        if (v.km) $('#cl-km').value = fmtNum(v.km, 2);
        if (v.min && !$('#cl-min').value) $('#cl-min').value = Math.round(v.min);
        toast('Watch-Werte übernommen');
        return true;
      };
      if (w.enabled) {
        $('[data-fetch]').addEventListener('click', () => {
          const min = parseInt($('#cl-min').value) || 60;
          runShortcut(w.importName, String(min));
        });
        const box = $('[data-pastebox]');
        $('[data-paste]').addEventListener('click', async () => {
          try {
            const text = await navigator.clipboard.readText();
            if (fill(text)) box.hidden = true;
          } catch (e) {
            // Kein Zugriff auf die Zwischenablage → manuelles Einfügen anbieten
            box.hidden = false;
            box.focus();
          }
        });
        box.addEventListener('input', () => { if (fill(box.value)) box.hidden = true; });
      }

      $('[data-save]').addEventListener('click', () => {
        const min = parseInt($('#cl-min').value);
        if (!(min > 0)) { toast('Bitte Dauer eintragen', 'info_circle'); return; }
        const num = s => { const v = parseLocaleNum($(s).value); return v > 0 ? v : null; };
        const log = {
          id: uid(),
          date: $('#cl-date').value || todayISO(),
          device,
          name: pending ? pending.name : dev(device).label,
          min, km: num('#cl-km'), hr: num('#cl-hr') && Math.round(num('#cl-hr')),
          kcal: num('#cl-kcal') && Math.round(num('#cl-kcal')), rpe,
        };
        S.cardio.logs.push(log);
        S.cardio.logs.sort((a, b) => b.date.localeCompare(a.date));
        if (pending) S.cardio.pending = null;
        save(); closeSheet(); A.rerender();
        toast('Cardio gespeichert');
      });
      if (pending) $('[data-discard]').addEventListener('click', async () => {
        closeSheet();
        if (!(await confirmSheet('Einheit verwerfen?', 'Die beendete Einheit wird nicht gespeichert.', 'Verwerfen'))) { A.cardioLog(); return; }
        S.cardio.pending = null; save(); A.rerender();
      });
    },
  });
};

// "1.234,5" / "4,1" / "4.1" → Zahl
function parseLocaleNum(str) {
  if (str == null) return null;
  const m = String(str).match(/-?\d[\d.,]*/);
  if (!m) return null;
  let s = m[0];
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ''); // "1.290" = deutsches Tausender-Format
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Text aus dem Import-Kurzbefehl: Zeilen "puls=138", "kcal=290", "km=4,1" (oder JSON)
export function parseHealthText(text) {
  if (!text) return null;
  const out = {};
  const keys = { hr: /^(puls|hr|herz\w*)$/, kcal: /^(kcal|kalorien|energie)$/, km: /^(km|distanz|distance)$/, min: /^(min|dauer)$/ };
  let pairs = [];
  try {
    const j = JSON.parse(text);
    if (j && typeof j === 'object') pairs = Object.entries(j);
  } catch (e) {
    pairs = text.split(/[\n;]+/).map(line => line.split(/[=:]/)).filter(p => p.length >= 2);
  }
  for (const [k, v] of pairs) {
    const key = Object.keys(keys).find(x => keys[x].test(String(k).trim().toLowerCase()));
    const n = parseLocaleNum(v);
    if (key && n > 0) out[key] = n;
  }
  if (out.km > 100) out.km /= 1000; // Kurzbefehl hat Meter geliefert
  return Object.keys(out).length ? out : null;
}

// ═══ Apple-Watch-Einrichtung ════════════════════════════════════════════════
A.cardioWatchSetup = () => {
  const w = S.cardio.watch;
  openSheet({
    title: 'Apple Watch',
    body: `
      <div class="set-item">
        ${ic('device_watch')}
        <div class="set-main"><div class="set-name">Über Kurzbefehle verbinden</div><div class="set-sub">Startet das Training auf der Uhr mit und holt danach Puls, kcal &amp; km</div></div>
        <button class="switch${w.enabled ? ' on' : ''}" data-sw role="switch" aria-checked="${w.enabled}" aria-label="Apple Watch verbinden"></button>
      </div>

      <div class="slbl">1 · Start-Kurzbefehl</div>
      <div class="guide">
        <ol>
          <li>In der App <b>Kurzbefehle</b> einen neuen Kurzbefehl anlegen.</li>
          <li>Aktion <b>Training starten</b> hinzufügen und die Trainingsart wählen (z. B. Indoor-Laufen).</li>
          <li>Optional für mehrere Geräte: vorher <b>Wenn</b> mit der <b>Kurzbefehleingabe</b> – die App übergibt den Gerätenamen, z. B. „Laufband“ oder „Ergometer“.</li>
          <li>Den Kurzbefehl exakt so benennen:</li>
        </ol>
        <input class="inp" id="cw-start" value="${esc(w.startName)}" aria-label="Name des Start-Kurzbefehls">
        <button class="btn sm full mt8" data-test-start>${ic('player_play')} Start testen</button>
      </div>

      <div class="slbl">2 · Import-Kurzbefehl</div>
      <div class="guide">
        <ol>
          <li>Neuer Kurzbefehl. Die App übergibt als Eingabe die Dauer in Minuten.</li>
          <li><b>Health-Beispiele suchen</b>: Typ <b>Herzfrequenz</b>, Startdatum <i>in den letzten</i> [Kurzbefehleingabe] Minuten. Danach <b>Statistik berechnen → Durchschnitt</b>.</li>
          <li>Dasselbe für <b>Aktive Energie</b> und <b>Gehen + Laufen Distanz</b> (bzw. Radfahren Distanz), jeweils <b>Summe</b>.</li>
          <li>Aktion <b>Text</b> mit drei Zeilen:<br><code>puls=[Durchschnitt]<br>kcal=[Summe Energie]<br>km=[Summe Distanz]</code></li>
          <li>Danach <b>In Zwischenablage kopieren</b>. Den Kurzbefehl so benennen:</li>
        </ol>
        <input class="inp" id="cw-import" value="${esc(w.importName)}" aria-label="Name des Import-Kurzbefehls">
        <div class="field-hint">Die Bezeichnungen der Aktionen können je nach iOS-Version leicht abweichen. Distanz in Metern erkennt die App automatisch.</div>
      </div>
      <button class="btn btn-acc full mt16" data-ok>Fertig</button>`,
    onOpen(sheet) {
      const $ = s => sheet.querySelector(s);
      const persist = () => {
        w.startName = $('#cw-start').value.trim() || 'Gym Cardio Start';
        w.importName = $('#cw-import').value.trim() || 'Gym Cardio Import';
        save();
      };
      $('[data-sw]').addEventListener('click', e => {
        w.enabled = !w.enabled;
        e.currentTarget.classList.toggle('on', w.enabled);
        e.currentTarget.setAttribute('aria-checked', w.enabled);
        save();
      });
      $('#cw-start').addEventListener('change', persist);
      $('#cw-import').addEventListener('change', persist);
      $('[data-test-start]').addEventListener('click', () => { persist(); runShortcut(w.startName, 'Laufband'); });
      $('[data-ok]').addEventListener('click', () => { persist(); closeSheet(); render(); });
    },
  });
};

// ═══ Fortschritt-Ansicht (wird von stats.js eingebunden) ═════════════════════
export function statsHTML() {
  const logs = S.cardio.logs;
  if (!logs.length) return `<div class="empty">${ic('heartbeat')}<br>Noch keine Cardio-Einheiten.<br>Starte im Tab <b>Cardio</b> oder trag eine nach.</div>`;

  const goal = S.cardio.goalMin || 150;
  const monday = mondayISO();
  const base = addDays(new Date(), -weekdayIdx());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const from = toISO(addDays(base, -(7 - i) * 7));
    const to = toISO(addDays(base, -(7 - i) * 7 + 6));
    return { from, min: logs.filter(l => l.date >= from && l.date <= to).reduce((n, l) => n + l.min, 0) };
  });
  const max = Math.max(goal * 1.15, ...weeks.map(w => w.min));
  const H = 120;
  const last4 = weeks.slice(4).reduce((n, w) => n + w.min, 0) / 4;
  const kw = iso => {
    const d = fromISO(iso); d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const w1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - w1) / 86400000 - 3 + (w1.getDay() + 6) % 7) / 7);
  };

  const bars = `
    <div class="wk-bars" style="height:${H + 18}px" role="img" aria-label="Cardio-Minuten der letzten 8 Wochen, Ziel ${goal} Minuten">
      <div class="wk-goal" style="bottom:${(goal / max * H + 18).toFixed(0)}px"><span>Ziel ${goal}</span></div>
      ${weeks.map(w => `
        <div class="wk-bar${w.min >= goal ? ' hit' : ''}${w.from === monday ? ' now' : ''}">
          <i style="height:${Math.max(2, w.min / max * H).toFixed(0)}px" title="${w.min} min"></i>
          <span>${kw(w.from)}</span>
        </div>`).join('')}
    </div>`;

  const withKm = logs.filter(l => l.km >= 1);
  const longest = logs.reduce((a, b) => (b.min > a.min ? b : a));
  const farthest = withKm.length ? withKm.reduce((a, b) => (b.km > a.km ? b : a)) : null;
  const fastest = withKm.filter(l => l.device === 'laufband' || l.device === 'draussen')
    .reduce((a, b) => (!a || b.min / b.km < a.min / a.km ? b : a), null);
  const totalMin = logs.reduce((n, l) => n + l.min, 0);
  const totalKm = logs.reduce((n, l) => n + (l.km || 0), 0);

  const pr = (lbl, val, l) => `<div class="stat"><div class="stat-lbl">${lbl}</div><div class="stat-val num" style="font-size:22px">${val}</div>${l ? `<div class="row-sub" style="margin-top:4px;font-size:11.5px">${dev(l.device).label} · ${fmtDate(l.date)}</div>` : ''}</div>`;

  return `
    <div class="stat-grid">
      <div class="stat"><div class="stat-lbl">${ic('heartbeat')} Diese Woche</div><div class="stat-val num">${cardioMinutesSince(monday)}<small>min</small></div></div>
      <div class="stat"><div class="stat-lbl">${ic('stopwatch')} Ø 4 Wochen</div><div class="stat-val num">${Math.round(last4)}<small>min</small></div></div>
    </div>
    <div class="slbl">Minuten pro Woche</div>
    <div class="card">${bars}</div>
    <div class="slbl">Bestwerte</div>
    <div class="stat-grid">
      ${pr('Längste Einheit', `${longest.min} min`, longest)}
      ${farthest ? pr('Weiteste Distanz', `${fmtNum(farthest.km, 2)} km`, farthest) : pr('Gesamt', `${totalMin} min`)}
      ${fastest ? pr('Schnellstes Tempo', `${fmtPace(fastest.min, fastest.km)}/km`, fastest) : ''}
      ${totalKm ? pr('Gesamt-Distanz', `${fmtNum(totalKm)} km`) : ''}
    </div>
    <div class="slbl">Verlauf</div>
    ${logs.slice(0, 30).map(l => logRowHTML(l).replace('<div class="row-end">', `<div class="row-end"><button class="iconbtn" style="width:34px;height:34px;border:none;background:none" onclick="A.cardioDel('${l.id}')" aria-label="Einheit löschen">${ic('x')}</button>`)).join('')}`;
}

A.cardioDel = async id => {
  const l = S.cardio.logs.find(x => x.id === id);
  if (!l) return;
  if (!(await confirmSheet('Einheit löschen?', `${dev(l.device).label} · ${fmtDate(l.date)} · ${l.min} min`))) return;
  S.cardio.logs = S.cardio.logs.filter(x => x !== l);
  save(); A.rerender();
};

// Beim App-Start: laufende Einheit direkt wieder öffnen
export function restore() {
  if (S.cardio.session) openPlayer();
}
