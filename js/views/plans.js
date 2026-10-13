// ─── Pläne: Liste, Plan-Editor, Tag-Editor, Übungs-Picker ───────────────────
import { ic } from '../icons.js';
import { S, save, getPlan, getEx, allExercises, instantiateTemplate, addCustomExercise, refreshExMap, checkAchievements } from '../state.js';
import { TEMPLATES } from '../data/templates.js';
import { EQUIPMENT } from '../data/exercises.js';
import { DAYS, DAYS_LONG, MUSCLES, uid, esc, todayISO } from '../util.js';
import { openSheet, closeSheet, toast, confirmSheet } from '../components.js';
import { unavailableBadgeHTML, markButtonHTML, toggleUnavailableExercise } from './altswap.js';
import { A } from '../actions.js';

let mode = { view: 'list' };

export function render() {
  const el = document.getElementById('v-plans');
  if (mode.view === 'plan') {
    const p = getPlan(mode.planId);
    if (!p) mode = { view: 'list' };
    else { el.innerHTML = renderPlan(p); return; }
  }
  if (mode.view === 'day') {
    const p = getPlan(mode.planId);
    const d = p && p.days.find(x => x.id === mode.dayId);
    if (!d) mode = { view: 'list' };
    else { el.innerHTML = renderDay(p, d); return; }
  }
  el.innerHTML = renderList();
  const fileInput = document.getElementById('ai-import-file');
  if (fileInput) fileInput.addEventListener('change', () => A.aiImportFile(fileInput));
}

// ── Ebene 1: Plan-Liste ──
function isActivePlan(p) {
  return p.id === (p.kind === 'home' ? S.activeHomePlanId : S.activePlanId);
}

function renderList() {
  const rows = S.plans.map(p => {
    const active = isActivePlan(p);
    return `
      <button class="row${active ? ' row-acc' : ''}" onclick="A.planOpen('${p.id}')">
        <div class="row-main">
          <div class="row-title">${esc(p.name)}</div>
          <div class="row-sub">${p.days.length} Trainingstage</div>
        </div>
        <div class="row-end">
          ${p.kind === 'home' ? '<span class="chip">Zuhause</span>' : ''}
          ${active ? '<span class="chip chip-acc">Aktiv</span>' : ''}${ic('chevron_right')}
        </div>
      </button>`;
  }).join('');

  return `
    ${S.plans.length ? rows : `<div class="empty">${ic('clipboard_list')}<br>Noch keine Pläne.<br>Starte mit einer Vorlage oder baue deinen eigenen.</div>`}
    <button class="btn btn-acc full mt8" onclick="A.planNew('gym')">${ic('plus')} Neuer Gym-Plan</button>
    <button class="btn full mt8" onclick="A.planNew('home')">${ic('home')} Neuer Zuhause-Plan</button>

    <div class="slbl">KI-Unterstützung</div>
    <button class="btn full" onclick="A.aiExport()">${ic('download')} Für KI exportieren</button>
    <button class="btn full mt8" onclick="document.getElementById('ai-import-file').click()">${ic('upload')} Plan importieren</button>
    <input type="file" id="ai-import-file" accept=".json,application/json" hidden>
    <div class="row-sub" style="margin-top:10px">Exportiere den App-Kontext, gib ihn zusammen mit deinem Wunsch einer KI (z. B. Claude oder ChatGPT), importiere die Antwort als neuen Gym- oder Zuhause-Plan.</div>`;
}

// ── Ebene 2: Plan-Detail ──
function renderPlan(p) {
  const active = isActivePlan(p);
  const days = p.days.map(d => `
    <button class="row" onclick="A.dayOpen('${p.id}','${d.id}')">
      <div class="row-main">
        <div class="row-title">${esc(d.name)}</div>
        <div class="row-sub">${d.weekday != null ? DAYS_LONG[d.weekday] : 'Kein fester Tag'} · ${d.entries.length} Übungen</div>
      </div>
      <div class="row-end">${ic('chevron_right')}</div>
    </button>`).join('');

  return `
    <div class="flex" style="margin-bottom:14px">
      <button class="iconbtn" onclick="A.plansBack()" aria-label="Zurück">${ic('chevron_left')}</button>
      <div class="grow">
        <div style="font-size:18px;font-weight:750">${esc(p.name)}</div>
        <div class="row-sub">${active ? 'Aktiver Plan' : 'Nicht aktiv'}</div>
      </div>
      <button class="iconbtn" onclick="A.planRename('${p.id}')" aria-label="Umbenennen">${ic('pencil')}</button>
    </div>
    ${active ? '' : `<button class="btn btn-acc full" style="margin-bottom:12px" onclick="A.planActivate('${p.id}')">${ic('check')} Als aktiven Plan setzen</button>`}
    <div class="slbl">Trainingstage</div>
    ${days || `<div class="empty">Noch keine Trainingstage.</div>`}
    <button class="btn full mt8" onclick="A.dayAdd('${p.id}')">${ic('plus')} Trainingstag hinzufügen</button>
    <button class="btn btn-danger full mt16" onclick="A.planDelete('${p.id}')">${ic('trash')} Plan löschen</button>`;
}

// ── Ebene 3: Tag-Detail ──
function renderDay(p, d) {
  const entries = d.entries.map(en => {
    const ex = getEx(en.exId);
    const ctx = { mode: 'plan', planId: p.id, dayId: d.id, entryId: en.id };
    return `
      <div class="entry-row">
        <div class="entry-main">
          <div class="entry-name">${esc(ex ? ex.n : en.exId)}</div>
          <div class="entry-sub">${en.sets}×${en.rMin}${en.rMax !== en.rMin ? '–' + en.rMax : ''}${ex && ex.t ? ' Sek' : ''} · Pause ${en.rest}s</div>
        </div>
        <div class="entry-actions">
          ${markButtonHTML(en.exId, ctx)}
          <button class="iconbtn" onclick="A.entrySettings('${p.id}','${d.id}','${en.id}')" aria-label="Einstellungen">${ic('settings')}</button>
          <button class="iconbtn" onclick="A.entryDelete('${p.id}','${d.id}','${en.id}')" aria-label="Entfernen">${ic('trash')}</button>
        </div>
      </div>
      ${unavailableBadgeHTML(en.exId, ctx)}`;
  }).join('');

  return `
    <div class="flex" style="margin-bottom:14px">
      <button class="iconbtn" onclick="A.planOpen('${p.id}')" aria-label="Zurück">${ic('chevron_left')}</button>
      <div class="grow">
        <div style="font-size:18px;font-weight:750">${esc(d.name)}</div>
        <div class="row-sub">${esc(p.name)}</div>
      </div>
      <button class="iconbtn" onclick="A.dayRename('${p.id}','${d.id}')" aria-label="Umbenennen">${ic('pencil')}</button>
    </div>
    <button class="btn full" style="margin-bottom:12px" onclick="A.dayWeekday('${p.id}','${d.id}')">
      ${ic('calendar')} ${d.weekday != null ? DAYS_LONG[d.weekday] : 'Kein fester Wochentag'}
    </button>
    <div class="slbl">Übungen</div>
    ${entries || `<div class="empty">Noch keine Übungen.<br>Füge welche aus der Bibliothek hinzu.</div>`}
    <button class="btn btn-acc full mt8" onclick="A.entryAdd('${p.id}','${d.id}')">${ic('plus')} Übung hinzufügen</button>
    <button class="btn btn-danger full mt16" onclick="A.dayDelete('${p.id}','${d.id}')">${ic('trash')} Tag löschen</button>`;
}

// ── Navigation ──
A.planOpen = id => { mode = { view: 'plan', planId: id }; render(); };
A.plansBack = () => { mode = { view: 'list' }; render(); };
A.dayOpen = (planId, dayId) => { mode = { view: 'day', planId, dayId }; render(); };

// ── Plan-Aktionen ──
A.planNew = (kind = 'gym') => {
  const templates = TEMPLATES.filter(t => (t.kind || 'gym') === kind);
  openSheet({
    title: kind === 'home' ? 'Neuer Zuhause-Plan' : 'Neuer Plan',
    body: `
      <button class="row" onclick="A.planCreate(null,'${kind}')">
        <div class="row-main">
          <div class="row-title">Leerer Plan</div>
          <div class="row-sub">Von Grund auf selbst bauen</div>
        </div>
        <div class="row-end">${ic('plus')}</div>
      </button>
      ${templates.length ? `<div class="slbl">Vorlagen</div>` : ''}
      ${templates.map(t => `
        <button class="row" onclick="A.planCreate('${t.id}','${kind}')">
          <div class="row-main">
            <div class="row-title">${esc(t.name)}</div>
            <div class="row-sub">${esc(t.desc)}</div>
          </div>
          <div class="row-end">${ic('chevron_right')}</div>
        </button>`).join('')}`,
  });
};

A.planCreate = (tid, kind = 'gym') => {
  closeSheet();
  let plan;
  if (tid) {
    plan = instantiateTemplate(tid);
    plan.byUser = true;
  } else {
    plan = { id: uid(), name: kind === 'home' ? 'Mein Zuhause-Plan' : 'Mein Plan', byUser: true, kind, days: [] };
  }
  S.plans.push(plan);
  if (plan.kind === 'home') { if (!S.activeHomePlanId) S.activeHomePlanId = plan.id; }
  else if (!S.activePlanId) S.activePlanId = plan.id;
  save();
  checkAchievements();
  mode = { view: 'plan', planId: plan.id };
  render();
  toast('Plan erstellt');
};

A.planActivate = id => {
  const p = getPlan(id);
  if (p.kind === 'home') S.activeHomePlanId = id; else S.activePlanId = id;
  save();
  render();
  toast('Plan ist jetzt aktiv');
};

A.planRename = id => renameSheet('Plan umbenennen', getPlan(id).name, name => {
  getPlan(id).name = name;
  save(); render();
});

A.planDelete = async id => {
  const p = getPlan(id);
  if (!(await confirmSheet('Plan löschen?', `„${esc(p.name)}" wird dauerhaft gelöscht. Deine Trainings-Historie bleibt erhalten.`))) return;
  S.plans = S.plans.filter(x => x.id !== id);
  if (S.activePlanId === id) S.activePlanId = S.plans.find(x => x.kind !== 'home')?.id || null;
  if (S.activeHomePlanId === id) S.activeHomePlanId = S.plans.find(x => x.kind === 'home')?.id || null;
  save();
  mode = { view: 'list' };
  render();
};

// ── Tag-Aktionen ──
A.dayAdd = planId => {
  const p = getPlan(planId);
  const d = { id: uid(), name: 'Trainingstag ' + (p.days.length + 1), weekday: null, entries: [] };
  p.days.push(d);
  save();
  mode = { view: 'day', planId, dayId: d.id };
  render();
};

A.dayRename = (planId, dayId) => {
  const d = getPlan(planId).days.find(x => x.id === dayId);
  renameSheet('Tag umbenennen', d.name, name => { d.name = name; save(); render(); });
};

A.dayWeekday = (planId, dayId) => {
  const d = getPlan(planId).days.find(x => x.id === dayId);
  openSheet({
    title: 'Wochentag festlegen',
    body: `
      <p style="font-size:13px;color:var(--t2);margin-bottom:12px">An diesem Tag erscheint das Training automatisch unter „Heute".</p>
      <div class="pills" style="flex-wrap:wrap">
        ${DAYS.map((day, i) => `<button class="pill${d.weekday === i ? ' on' : ''}" onclick="A.setWeekday('${planId}','${dayId}',${i})">${DAYS_LONG[i]}</button>`).join('')}
        <button class="pill${d.weekday == null ? ' on' : ''}" onclick="A.setWeekday('${planId}','${dayId}',null)">Kein fester Tag</button>
      </div>`,
  });
};

A.setWeekday = (planId, dayId, wd) => {
  const p = getPlan(planId);
  const d = p.days.find(x => x.id === dayId);
  if (wd != null) {
    // Ein Tag pro Wochentag: bestehende Zuordnung lösen
    p.days.forEach(x => { if (x.weekday === wd && x.id !== dayId) x.weekday = null; });
  }
  d.weekday = wd;
  save();
  closeSheet();
  render();
};

A.dayDelete = async (planId, dayId) => {
  const p = getPlan(planId);
  const d = p.days.find(x => x.id === dayId);
  if (!(await confirmSheet('Tag löschen?', `„${esc(d.name)}" mit ${d.entries.length} Übungen löschen?`))) return;
  p.days = p.days.filter(x => x.id !== dayId);
  save();
  mode = { view: 'plan', planId };
  render();
};

// ── Übungs-Picker ──
let pickCtx = null;
let pickFilter = { q: '', muscle: null };

A.entryAdd = (planId, dayId) => {
  pickCtx = { planId, dayId };
  pickFilter = { q: '', muscle: null };
  openSheet({
    title: 'Übung hinzufügen',
    body: `
      <div class="search-wrap">${ic('search')}<input class="inp" id="pick-q" placeholder="Übung suchen …" autocomplete="off"></div>
      <div class="pills" id="pick-pills"></div>
      <div id="pick-list"></div>
      <button class="btn btn-ghost full mt8" onclick="A.customExForm()">${ic('plus')} Eigene Übung anlegen</button>`,
    onOpen(sheet) {
      sheet.querySelector('#pick-q').addEventListener('input', e => {
        pickFilter.q = e.target.value.toLowerCase();
        renderPickList();
      });
      renderPickPills();
      renderPickList();
    },
  });
};

function renderPickPills() {
  const el = document.getElementById('pick-pills');
  if (!el) return;
  el.innerHTML = `<button class="pill${!pickFilter.muscle ? ' on' : ''}" onclick="A.pickMuscle(null)">Alle</button>` +
    MUSCLES.map(m => `<button class="pill${pickFilter.muscle === m ? ' on' : ''}" onclick="A.pickMuscle('${m}')">${m}</button>`).join('');
}

A.pickMuscle = m => { pickFilter.muscle = m; renderPickPills(); renderPickList(); };

// Verfügbarkeit direkt im Picker umschalten (nur die offene Liste neu zeichnen)
A.pickToggleUnavailable = exId => {
  const turningOn = toggleUnavailableExercise(exId);
  renderPickList();
  toast(turningOn ? 'Als nicht verfügbar markiert' : 'Wieder verfügbar');
};

function renderPickList() {
  const el = document.getElementById('pick-list');
  if (!el) return;
  let list = allExercises();
  const plan = pickCtx && getPlan(pickCtx.planId);
  if (plan && plan.kind === 'home') {
    list = list.filter(x => x.eq === 'Körpergewicht' || S.settings.homeEquipment.includes(x.eq));
  }
  if (pickFilter.muscle) list = list.filter(x => x.m.includes(pickFilter.muscle));
  if (pickFilter.q) list = list.filter(x => x.n.toLowerCase().includes(pickFilter.q));
  list = list.slice().sort((a, b) => a.n.localeCompare(b.n));
  el.innerHTML = list.length
    ? list.map(x => {
      const unavailable = S.settings.unavailableExercises.includes(x.id);
      return `
      <div class="lib-item">
        <button class="grow" style="text-align:left;display:flex;gap:12px;align-items:center" onclick="A.entryPick('${x.id}')">
          <div class="grow">
            <div class="lib-name">${esc(x.n)}${x.custom ? ' <span class="chip" style="font-size:10px">Eigene</span>' : ''}${unavailable ? ' <span class="chip chip-danger" style="font-size:10px">Nicht verfügbar</span>' : ''}</div>
            <div class="lib-sub">${x.m.join(' · ')} · ${x.eq}</div>
          </div>
          ${ic('plus')}
        </button>
        <button class="iconbtn${unavailable ? ' active' : ''}" onclick="A.pickToggleUnavailable('${x.id}')" aria-label="Verfügbarkeit umschalten" title="Mein Gym hat das nicht">${ic('ban')}</button>
      </div>`;
    }).join('')
    : (plan && plan.kind === 'home'
      ? `<div class="chart-empty">Nichts gefunden. Passe dein Zuhause-Equipment in den Einstellungen an.</div>`
      : `<div class="chart-empty">Nichts gefunden.</div>`);
}

A.entryPick = exId => {
  if (!pickCtx) return;
  const p = getPlan(pickCtx.planId);
  const d = p.days.find(x => x.id === pickCtx.dayId);
  const ex = getEx(exId);
  d.entries.push({
    id: uid(), exId,
    sets: 3,
    rMin: ex && ex.t ? 30 : 8,
    rMax: ex && ex.t ? 30 : 12,
    rest: S.settings.rest,
  });
  save();
  closeSheet();
  render();
  toast(`${ex ? ex.n : 'Übung'} hinzugefügt`);
};

// ── Eigene Übung ──
A.customExForm = () => {
  openSheet({
    title: 'Eigene Übung',
    body: `
      <div class="field"><label>Name</label><input class="inp" id="cx-name" placeholder="z. B. Landmine Press"></div>
      <div class="field"><label>Hauptmuskel</label>
        <select class="inp" id="cx-muscle">${MUSCLES.map(m => `<option>${m}</option>`).join('')}</select></div>
      <div class="field"><label>Equipment</label>
        <select class="inp" id="cx-eq">${EQUIPMENT.map(e => `<option>${e}</option>`).join('')}</select></div>
      <button class="btn btn-acc full" data-save>Anlegen</button>`,
    onOpen(sheet) {
      sheet.querySelector('[data-save]').addEventListener('click', () => {
        const name = sheet.querySelector('#cx-name').value.trim();
        if (!name) { toast('Bitte Namen eingeben', 'info_circle'); return; }
        const eq = sheet.querySelector('#cx-eq').value;
        const ex = addCustomExercise({
          n: name,
          m: [sheet.querySelector('#cx-muscle').value],
          eq,
          bw: eq === 'Körpergewicht',
        });
        refreshExMap();
        closeSheet();
        if (pickCtx) A.entryPick(ex.id);
      });
    },
  });
};

// ── Eintrag: Einstellungen (Sätze/Reps/Pause + Reihenfolge) ──
A.entrySettings = (planId, dayId, entryId) => {
  const p = getPlan(planId);
  const d = p.days.find(x => x.id === dayId);
  const en = d.entries.find(x => x.id === entryId);
  const ex = getEx(en.exId);
  const unit = ex && ex.t ? 'Sek' : 'Wdh';

  const stp = (key, label, min, max, step) => `
    <div class="mstp-row">
      <span class="mstp-lbl">${label}</span>
      <div class="mstp">
        <button onclick="A.entryStep('${planId}','${dayId}','${entryId}','${key}',${-step},${min},${max})">${ic('minus')}</button>
        <b id="es-${key}">${en[key]}${key === 'rest' ? 's' : ''}</b>
        <button onclick="A.entryStep('${planId}','${dayId}','${entryId}','${key}',${step},${min},${max})">${ic('plus')}</button>
      </div>
    </div>`;

  openSheet({
    title: ex ? ex.n : 'Übung',
    body: `
      ${stp('sets', 'Sätze', 1, 10, 1)}
      ${stp('rMin', `${unit} min`, 1, 100, 1)}
      ${stp('rMax', `${unit} max`, 1, 100, 1)}
      ${stp('rest', 'Pause', 15, 300, 15)}
      <div class="flex mt16">
        <button class="btn sm grow" onclick="A.entryMove('${planId}','${dayId}','${entryId}',-1)">${ic('chevron_up')} Nach oben</button>
        <button class="btn sm grow" onclick="A.entryMove('${planId}','${dayId}','${entryId}',1)">${ic('chevron_down')} Nach unten</button>
      </div>`,
    onClose() { render(); },
  });
};

A.entryStep = (planId, dayId, entryId, key, delta, min, max) => {
  const en = getPlan(planId).days.find(x => x.id === dayId).entries.find(x => x.id === entryId);
  en[key] = Math.min(max, Math.max(min, en[key] + delta));
  if (key === 'rMin' && en.rMin > en.rMax) en.rMax = en.rMin;
  if (key === 'rMax' && en.rMax < en.rMin) en.rMin = en.rMax;
  save();
  const el = document.getElementById('es-' + key);
  if (el) el.textContent = en[key] + (key === 'rest' ? 's' : '');
  const elMin = document.getElementById('es-rMin'), elMax = document.getElementById('es-rMax');
  if (elMin) elMin.textContent = en.rMin;
  if (elMax) elMax.textContent = en.rMax;
};

A.entryMove = (planId, dayId, entryId, dir) => {
  const d = getPlan(planId).days.find(x => x.id === dayId);
  const i = d.entries.findIndex(x => x.id === entryId);
  const j = i + dir;
  if (j < 0 || j >= d.entries.length) return;
  [d.entries[i], d.entries[j]] = [d.entries[j], d.entries[i]];
  save();
  render();
  toast(dir < 0 ? 'Nach oben verschoben' : 'Nach unten verschoben');
};

A.entryDelete = async (planId, dayId, entryId) => {
  const d = getPlan(planId).days.find(x => x.id === dayId);
  const en = d.entries.find(x => x.id === entryId);
  const ex = getEx(en.exId);
  if (!(await confirmSheet('Übung entfernen?', `„${esc(ex ? ex.n : '')}" aus diesem Tag entfernen?`, 'Entfernen'))) return;
  d.entries = d.entries.filter(x => x.id !== entryId);
  delete S.tempSwaps[entryId];
  save();
  render();
};

// ── Umbenennen-Sheet (gemeinsam) ──
function renameSheet(title, value, onSave) {
  openSheet({
    title,
    body: `
      <div class="field"><input class="inp" id="rn-input" value="${esc(value)}" maxlength="40"></div>
      <button class="btn btn-acc full" data-save>Speichern</button>`,
    onOpen(sheet) {
      const inp = sheet.querySelector('#rn-input');
      inp.focus(); inp.select();
      sheet.querySelector('[data-save]').addEventListener('click', () => {
        const v = inp.value.trim();
        if (v) { onSave(v); closeSheet(); }
      });
    },
  });
}

// ─── KI-Export/Import ────────────────────────────────────────────────────────
const AI_INSTRUCTIONS = `Du bekommst hier den kompletten Kontext einer Fitness-App ("Gym Trainer 2.0"). Erstelle auf Wunsch des Nutzers einen Trainingsplan.

WICHTIG: Antworte AUSSCHLIESSLICH mit einem einzigen JSON-Objekt – kein Fließtext davor oder danach, keine Markdown-Codeblock-Zeichen.

Das Objekt braucht immer ein Feld "typ": "gym-plan" oder "home-plan". Beispiele für beide stehen unten in "formate".

Für "gym-plan"/"home-plan":
- "weekday": 0=Montag … 6=Sonntag, oder null für keinen festen Tag.
- "exId" muss exakt eine ID aus "uebungsbibliothek" unten sein (Name als Rückfalloption möglich, ID ist zuverlässiger).
- "home-plan" darf nur Übungen mit equipment "Körpergewicht" oder einem in "kontext.zuhauseEquipment" gelisteten Equipment verwenden.

Erfinde keine neuen Übungs-IDs — nutze ausschließlich das, was unten aufgeführt ist.`;

const GYM_PLAN_EXAMPLE = {
  typ: 'gym-plan', name: 'Push Pull Legs',
  days: [
    { name: 'Push', weekday: 0, entries: [
      { exId: 'barbell-bench-press', sets: 4, rMin: 6, rMax: 8, rest: 120 },
      { exId: 'military-press', sets: 3, rMin: 8, rMax: 10, rest: 90 },
    ] },
  ],
};
const HOME_PLAN_EXAMPLE = {
  typ: 'home-plan', name: 'Ganzkörper Zuhause',
  days: [
    { name: 'Ganzkörper A', weekday: null, entries: [
      { exId: 'push-up', sets: 4, rMin: 10, rMax: 20, rest: 60 },
      { exId: 'goblet-squat', sets: 3, rMin: 10, rMax: 12, rest: 90 },
    ] },
  ],
};
function buildAiExportPayload() {
  return {
    anleitung: AI_INSTRUCTIONS,
    formate: { gymPlanBeispiel: GYM_PLAN_EXAMPLE, homePlanBeispiel: HOME_PLAN_EXAMPLE },
    kontext: {
      ziel: S.goal,
      zuhauseEquipment: S.settings.homeEquipment,
    },
    uebungsbibliothek: allExercises().map(x => ({ id: x.id, name: x.n, muskeln: x.m, equipment: x.eq, koerpergewicht: !!x.bw, zeitbasiert: !!x.t })),
  };
}

A.aiExport = () => {
  const blob = new Blob([JSON.stringify(buildAiExportPayload(), null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gym-trainer-ki-kontext-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  toast('KI-Kontext exportiert');
};

// Zahl robust einlesen (auch aus Strings), sonst null
function num(v) {
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function resolveExId(ref) {
  if (typeof ref !== 'string' || !ref) return null;
  if (getEx(ref)) return ref;
  const match = allExercises().find(x => x.n.toLowerCase() === ref.toLowerCase());
  return match ? match.id : null;
}

A.aiImportFile = input => {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    input.value = ''; // erlaubt erneuten Import derselben Datei
    let data;
    try { data = JSON.parse(reader.result); } catch (e) { toast('Datei konnte nicht gelesen werden', 'info_circle'); return; }
    if (!data || typeof data !== 'object' || !['gym-plan', 'home-plan'].includes(data.typ)) {
      toast('Unbekanntes Format', 'info_circle');
      return;
    }
    try {
      importGymHomePlan(data);
    } catch (e) {
      toast('Import fehlgeschlagen: ungültiges Format', 'info_circle');
    }
  };
  reader.readAsText(file);
};

async function importGymHomePlan(data) {
  const kind = data.typ === 'home-plan' ? 'home' : 'gym';
  const name = typeof data.name === 'string' && data.name.trim() ? data.name.trim() : (kind === 'home' ? 'KI-Zuhause-Plan' : 'KI-Plan');
  const srcDays = Array.isArray(data.days) ? data.days : [];
  let skippedEntries = 0, totalEntries = 0;

  const days = srcDays.map((d, i) => {
    const wd = Number.isInteger(d.weekday) && d.weekday >= 0 && d.weekday <= 6 ? d.weekday : null;
    const srcEntries = Array.isArray(d.entries) ? d.entries : [];
    const entries = [];
    srcEntries.forEach(en => {
      totalEntries++;
      const exId = resolveExId(en.exId) || resolveExId(en.name);
      if (!exId) { skippedEntries++; return; }
      const ex = getEx(exId);
      const sets = num(en.sets) > 0 ? Math.round(num(en.sets)) : 3;
      const rMin = num(en.rMin) > 0 ? Math.round(num(en.rMin)) : (ex && ex.t ? 30 : 8);
      const rMax = num(en.rMax) > 0 ? Math.round(num(en.rMax)) : (ex && ex.t ? 30 : 12);
      const rest = num(en.rest) > 0 ? Math.round(num(en.rest)) : S.settings.rest;
      entries.push({ id: uid(), exId, sets, rMin, rMax, rest });
    });
    const dayName = typeof d.name === 'string' && d.name.trim() ? d.name.trim() : `Tag ${i + 1}`;
    return { id: uid(), name: dayName, weekday: wd, entries };
  });

  const importedEntries = totalEntries - skippedEntries;
  let summary = `${days.length} Trainingstag${days.length === 1 ? '' : 'e'}, ${importedEntries} Übung${importedEntries === 1 ? '' : 'en'} importiert.`;
  if (skippedEntries) summary += ` ${skippedEntries} nicht gefunden und übersprungen.`;

  if (!(await confirmSheet('Plan importieren?', summary, 'Importieren'))) return;

  const plan = { id: uid(), name, byUser: true, kind, days };
  S.plans.push(plan);
  if (kind === 'home') { if (!S.activeHomePlanId) S.activeHomePlanId = plan.id; }
  else if (!S.activePlanId) S.activePlanId = plan.id;
  save();
  checkAchievements();
  mode = { view: 'plan', planId: plan.id };
  render();
  toast('Plan importiert');
}
