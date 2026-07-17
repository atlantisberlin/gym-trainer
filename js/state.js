// ─── State: Datenmodell v5, Persistenz, Migration, Abfragen ────────────────
import { LIBRARY } from './data/exercises.js';
import { TEMPLATES } from './data/templates.js';
import { uid, todayISO, toISO, fromISO, addDays, weekdayIdx, e1rm, stepFor } from './util.js';

const KEY = 'gymtrainer_v5';
const OLD_KEYS = ['gymtrainer_v4', 'gymtrainer_v3'];

function defaultState() {
  return {
    version: 5,
    createdAt: todayISO(),
    settings: { theme: 'dark', rest: 90, vibrate: true, wakeLock: true, barWeight: 20, exported: false },
    customExercises: [],   // eigene Übungen {id,n,m,eq,bw,t,custom:true}
    plans: [],             // {id,name,byUser,days:[{id,name,weekday,entries:[{id,exId,sets,rMin,rMax,rest}]}]}
    activePlanId: null,
    logs: [],              // neueste zuerst: {id,date,planId,dayId,dayName,duration,vol,entries:[{exId,name,sets:[{w,r,done}]}],prs:[]}
    prs: {},               // exId → {w,r,e1rm,date}
    bodyLog: [],           // neueste zuerst: {date,weight}
    height: null,
    achievements: {},      // achId → ISO-Datum
    legacyCount: 0,        // Workouts aus alter App, die nicht als Detail-Log vorliegen
    session: null,         // laufendes Training
  };
}

export let S = defaultState();

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* voll/privat */ }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      S = { ...defaultState(), ...JSON.parse(raw) };
      S.settings = { ...defaultState().settings, ...S.settings };
      return;
    }
    for (const ok of OLD_KEYS) {
      const old = localStorage.getItem(ok);
      if (old) {
        migrateOld(JSON.parse(old));
        save();
        return;
      }
    }
  } catch (e) { S = defaultState(); }
}

// ─── Migration aus gymtrainer_v3/v4 ─────────────────────────────────────────
function deToISO(de) {
  // "17.07.2026" → "2026-07-17"
  const p = String(de || '').split('.');
  if (p.length !== 3) return todayISO();
  return `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
}

function migrateOld(o) {
  S = defaultState();

  // Die 3 Phasen des alten Programms als Pläne anlegen
  for (const tid of ['ppl-1', 'ppl-2', 'ppl-3']) {
    S.plans.push(instantiateTemplate(tid));
  }
  // Aktiven Plan anhand der alten Programmwoche wählen
  let week = 1;
  if (o.startDate) {
    const diff = Math.floor((new Date() - new Date(o.startDate)) / 86400000);
    week = Math.min(12, Math.max(1, Math.floor(diff / 7) + 1));
  }
  S.activePlanId = S.plans[week <= 4 ? 0 : week <= 8 ? 1 : 2].id;

  const nameToId = new Map(LIBRARY.map(x => [x.n, x.id]));
  const repsMin = s => { const m = String(s ?? '').match(/\d+/); return m ? parseInt(m[0]) : 10; };

  // Historie: alte Einträge kennen nur Zielwerte → synthetische Sätze
  const hist = Array.isArray(o.workoutHistory) ? o.workoutHistory : [];
  S.logs = hist.map(h => {
    const entries = (h.exercises || []).map(e => {
      const exId = nameToId.get(e.name) || null;
      const w = (e.weight && e.weight !== 'Bodyweight') ? (parseFloat(e.weight) || 0) : 0;
      const r = repsMin(e.reps);
      const sets = Array.from({ length: e.sets || 3 }, () => ({ w, r, done: true }));
      return { exId, name: e.name, sets };
    });
    return {
      id: uid(),
      date: deToISO(h.date),
      planId: null, dayId: null,
      dayName: h.day || 'Training',
      duration: h.duration || 0,
      vol: calcVol(entries),
      entries,
      prs: h.prs || [],
    };
  });

  // PRs
  for (const [name, rec] of Object.entries(o.personalRecords || {})) {
    const exId = nameToId.get(name);
    if (exId) S.prs[exId] = { w: rec.weight, r: rec.reps, e1rm: rec.est1rm, date: deToISO(rec.date) };
  }

  // Körperdaten
  S.bodyLog = (o.weightLog || []).map(x => ({ date: deToISO(x.date), weight: x.weight }));
  S.height = parseFloat(o.bodyHeight) || null;
  S.legacyCount = Math.max(0, (o.totalWorkouts || 0) - S.logs.length);
  if (o.startDate) S.createdAt = o.startDate;

  checkAchievements();
}

// ─── Übungen ────────────────────────────────────────────────────────────────
let _exMap = null;

export function allExercises() {
  return [...LIBRARY, ...S.customExercises];
}

export function getEx(id) {
  if (!_exMap) refreshExMap();
  return _exMap.get(id) || null;
}

export function refreshExMap() {
  _exMap = new Map(allExercises().map(x => [x.id, x]));
}

export function addCustomExercise(ex) {
  ex.id = 'custom-' + uid();
  ex.custom = true;
  S.customExercises.push(ex);
  refreshExMap();
  save();
  return ex;
}

// ─── Pläne ──────────────────────────────────────────────────────────────────
export function instantiateTemplate(tid) {
  const t = TEMPLATES.find(x => x.id === tid);
  if (!t) return null;
  return {
    id: uid(),
    name: t.name,
    byUser: false,
    days: t.days.map(d => ({
      id: uid(),
      name: d.name,
      weekday: d.weekday ?? null,
      entries: d.entries.map(([exId, sets, rMin, rMax, rest]) => ({ id: uid(), exId, sets, rMin, rMax, rest })),
    })),
  };
}

export function activePlan() {
  return S.plans.find(p => p.id === S.activePlanId) || null;
}

export function getPlan(id) { return S.plans.find(p => p.id === id) || null; }

export function todaysDay() {
  const p = activePlan();
  if (!p) return null;
  const wd = weekdayIdx();
  return p.days.find(d => d.weekday === wd) || null;
}

// ─── Performance-Abfragen ───────────────────────────────────────────────────
export function calcVol(entries) {
  let v = 0;
  for (const en of entries) for (const s of en.sets) {
    if (s.done && s.w > 0 && s.r > 0) v += s.w * s.r;
  }
  return Math.round(v);
}

// Letzte Leistung für eine Übung (aus Logs, neueste zuerst)
export function lastPerf(exId) {
  for (const log of S.logs) {
    const en = log.entries.find(e => e.exId === exId);
    if (en && en.sets.some(s => s.done)) return { entry: en, date: log.date };
  }
  return null;
}

// Doppelte Progression: oberes Rep-Ziel in allen Sätzen erreicht → Gewicht hoch
export function suggestFor(exId, planEntry) {
  const ex = getEx(exId);
  const last = lastPerf(exId);
  if (!last) return { w: 0, r: planEntry.rMin, up: false, first: true };
  const done = last.entry.sets.filter(s => s.done);
  const topW = Math.max(0, ...done.map(s => s.w));
  if (ex && ex.bw) {
    // Körpergewicht: Wiederholungen steigern
    const topR = Math.max(planEntry.rMin, ...done.map(s => s.r));
    const up = done.length >= planEntry.sets && done.every(s => s.r >= planEntry.rMax);
    return { w: 0, r: up ? planEntry.rMax : topR, up, first: false };
  }
  const up = topW > 0 && done.length >= planEntry.sets && done.every(s => s.r >= planEntry.rMax);
  const step = stepFor(ex ? ex.eq : null);
  return { w: up ? topW + step : topW, r: planEntry.rMin, up, first: false, lastW: topW, step };
}

// Streak: geplante Trainingstage in Folge (ungeplante Tage überspringen)
export function calcStreak() {
  if (!S.logs.length) return 0;
  const dates = new Set(S.logs.map(l => l.date));
  const p = activePlan();
  const planned = new Set(p ? p.days.map(d => d.weekday).filter(w => w != null) : []);
  let d = new Date();
  if (!dates.has(toISO(d))) d = addDays(d, -1);
  let streak = 0;
  for (let i = 0; i < 366; i++) {
    const iso = toISO(d);
    if (dates.has(iso)) {
      streak++;
    } else if (planned.size === 0 || planned.has(weekdayIdx(d))) {
      break; // geplanter Tag ohne Training → Streak endet
    }
    d = addDays(d, -1);
  }
  return streak;
}

export function totalWorkouts() {
  return S.logs.length + S.legacyCount;
}

export function totalVolume() {
  return S.logs.reduce((s, l) => s + (l.vol || 0), 0);
}

// Sätze pro Muskelgruppe in Zeitraum [fromIso, toIso]
export function muscleSets(fromIso, toIso) {
  const counts = {};
  for (const log of S.logs) {
    if (log.date < fromIso || log.date > toIso) continue;
    for (const en of log.entries) {
      const ex = getEx(en.exId);
      if (!ex) continue;
      const n = en.sets.filter(s => s.done).length;
      if (!n) continue;
      ex.m.forEach((mus, i) => {
        counts[mus] = (counts[mus] || 0) + (i === 0 ? n : n * 0.5); // Sekundärmuskeln halb
      });
    }
  }
  return counts;
}

// e1RM-Verlauf einer Übung: [{date, v}] chronologisch
export function e1rmHistory(exId) {
  const out = [];
  for (let i = S.logs.length - 1; i >= 0; i--) {
    const log = S.logs[i];
    const en = log.entries.find(e => e.exId === exId);
    if (!en) continue;
    let best = 0;
    for (const s of en.sets) if (s.done && s.w > 0) best = Math.max(best, e1rm(s.w, s.r));
    if (best > 0) out.push({ date: log.date, v: best });
  }
  return out;
}

// PR-Prüfung nach Satz: true wenn neuer Rekord
export function checkPR(exId, w, r) {
  if (!w || w <= 0 || !r) return false;
  const est = e1rm(w, r);
  const prev = S.prs[exId];
  if (!prev || est > prev.e1rm) {
    S.prs[exId] = { w, r, e1rm: est, date: todayISO() };
    return true;
  }
  return false;
}

// ─── Achievements ───────────────────────────────────────────────────────────
export const ACH = [
  { id: 'w1',    icon: 'barbell',  name: 'Erster Schritt',  desc: '1 Workout absolviert',        check: () => totalWorkouts() >= 1 },
  { id: 'w10',   icon: 'activity', name: 'Zehnkämpfer',     desc: '10 Workouts',                 check: () => totalWorkouts() >= 10 },
  { id: 'w25',   icon: 'activity', name: 'Dauerbrenner',    desc: '25 Workouts',                 check: () => totalWorkouts() >= 25 },
  { id: 'w50',   icon: 'trophy',   name: 'Halbes Hundert',  desc: '50 Workouts',                 check: () => totalWorkouts() >= 50 },
  { id: 'w100',  icon: 'trophy',   name: 'Century Club',    desc: '100 Workouts',                check: () => totalWorkouts() >= 100 },
  { id: 's7',    icon: 'flame',    name: 'Feuer gefangen',  desc: '7 Trainingstage in Folge',    check: () => calcStreak() >= 7 },
  { id: 's30',   icon: 'flame',    name: 'Unaufhaltsam',    desc: '30 Trainingstage in Folge',   check: () => calcStreak() >= 30 },
  { id: 'pr1',   icon: 'trophy',   name: 'Erster Rekord',   desc: 'Ersten PR gesetzt',           check: () => Object.keys(S.prs).length >= 1 },
  { id: 'pr10',  icon: 'target',   name: 'PR-Sammler',      desc: '10 Übungs-Rekorde',           check: () => Object.keys(S.prs).length >= 10 },
  { id: 'pr25',  icon: 'target',   name: 'Rekordmaschine',  desc: '25 Übungs-Rekorde',           check: () => Object.keys(S.prs).length >= 25 },
  { id: 'v10',   icon: 'weight',   name: '10 Tonnen',       desc: '10 t Gesamtvolumen bewegt',   check: () => totalVolume() >= 10000 },
  { id: 'v100',  icon: 'weight',   name: '100 Tonnen',      desc: '100 t Gesamtvolumen bewegt',  check: () => totalVolume() >= 100000 },
  { id: 'plan1', icon: 'pencil',   name: 'Plan-Architekt',  desc: 'Eigenen Plan erstellt',       check: () => S.plans.some(p => p.byUser) },
  { id: 'bkup',  icon: 'download', name: 'Auf Nummer sicher', desc: 'Erstes Backup exportiert',  check: () => !!S.settings.exported },
  { id: 'wk12',  icon: 'calendar', name: 'Zwölf Wochen',    desc: '12 Wochen dabei',             check: () => {
    if (!S.logs.length) return false;
    const first = S.logs[S.logs.length - 1].date;
    return (fromISO(todayISO()) - fromISO(first)) / 86400000 >= 84;
  } },
];

// Gibt neu freigeschaltete Achievements zurück
export function checkAchievements() {
  const fresh = [];
  for (const a of ACH) {
    if (!S.achievements[a.id] && a.check()) {
      S.achievements[a.id] = todayISO();
      fresh.push(a);
    }
  }
  if (fresh.length) save();
  return fresh;
}
