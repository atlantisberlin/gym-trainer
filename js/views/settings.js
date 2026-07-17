// ─── Einstellungen: Theme, Timer, Backup, Scheibenrechner, Reset ────────────
import { ic } from '../icons.js';
import { S, save, checkAchievements } from '../state.js';
import { todayISO, fmtKg, esc } from '../util.js';
import { openSheet, closeSheet, toast, confirmSheet } from '../components.js';
import { A } from '../actions.js';
import { applyTheme, rerender } from '../app.js';

export function open() {
  openSheet({
    title: 'Einstellungen',
    body: bodyHTML(),
    onOpen: wire,
  });
}

function bodyHTML() {
  const s = S.settings;
  const sw = (key, on) => `<button class="switch${on ? ' on' : ''}" data-sw="${key}" role="switch" aria-checked="${on}"></button>`;
  return `
    <div class="set-item">
      ${ic(s.theme === 'light' ? 'sun' : 'moon')}
      <div class="set-main"><div class="set-name">Helles Design</div><div class="set-sub">Standard ist dunkel – fürs Studio</div></div>
      ${sw('theme', s.theme === 'light')}
    </div>
    <div class="set-item">
      ${ic('stopwatch')}
      <div class="set-main"><div class="set-name">Standard-Pause</div><div class="set-sub">Für neue Übungen im Plan</div></div>
      <div class="mstp">
        <button data-rest="-15">${ic('minus')}</button>
        <b id="st-rest">${s.rest}s</b>
        <button data-rest="15">${ic('plus')}</button>
      </div>
    </div>
    <div class="set-item">
      ${ic('activity')}
      <div class="set-main"><div class="set-name">Vibration</div><div class="set-sub">Beim Abhaken &amp; Pausen-Ende</div></div>
      ${sw('vibrate', s.vibrate)}
    </div>
    <div class="set-item">
      ${ic('target')}
      <div class="set-main"><div class="set-name">Display anlassen</div><div class="set-sub">Bildschirm bleibt im Training an</div></div>
      ${sw('wakeLock', s.wakeLock)}
    </div>
    <div class="set-item">
      ${ic('barbell')}
      <div class="set-main"><div class="set-name">Langhantel-Gewicht</div><div class="set-sub">Für den Scheibenrechner</div></div>
      <div class="mstp">
        <button data-bar="-2.5">${ic('minus')}</button>
        <b id="st-bar">${fmtKg(s.barWeight)} kg</b>
        <button data-bar="2.5">${ic('plus')}</button>
      </div>
    </div>
    <button class="set-item" data-plates>
      ${ic('weight')}
      <div class="set-main"><div class="set-name">Scheibenrechner</div><div class="set-sub">Welche Scheiben auf die Stange?</div></div>
      ${ic('chevron_right')}
    </button>

    <div class="slbl">Daten</div>
    <button class="set-item" data-export>
      ${ic('download')}
      <div class="set-main"><div class="set-name">Backup exportieren</div><div class="set-sub">Alle Daten als JSON-Datei sichern</div></div>
      ${ic('chevron_right')}
    </button>
    <button class="set-item" data-import>
      ${ic('upload')}
      <div class="set-main"><div class="set-name">Backup importieren</div><div class="set-sub">Ersetzt die aktuellen Daten</div></div>
      ${ic('chevron_right')}
    </button>
    <input type="file" id="import-file" accept=".json,application/json" hidden>
    <button class="set-item" data-reset>
      ${ic('trash')}
      <div class="set-main"><div class="set-name" style="color:var(--danger)">Alles zurücksetzen</div><div class="set-sub">Löscht sämtliche Daten unwiderruflich</div></div>
      ${ic('chevron_right')}
    </button>
    <div class="tc mt16" style="font-size:11.5px;color:var(--t3)">Gym Trainer 2.0 · Daten bleiben auf diesem Gerät</div>`;
}

function wire(sheet) {
  sheet.querySelectorAll('[data-sw]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sw;
      if (key === 'theme') {
        S.settings.theme = S.settings.theme === 'light' ? 'dark' : 'light';
        applyTheme();
        btn.classList.toggle('on', S.settings.theme === 'light');
      } else {
        S.settings[key] = !S.settings[key];
        btn.classList.toggle('on', S.settings[key]);
      }
      btn.setAttribute('aria-checked', btn.classList.contains('on'));
      save();
    });
  });

  sheet.querySelectorAll('[data-rest]').forEach(btn => btn.addEventListener('click', () => {
    S.settings.rest = Math.min(300, Math.max(15, S.settings.rest + parseInt(btn.dataset.rest)));
    save();
    sheet.querySelector('#st-rest').textContent = S.settings.rest + 's';
  }));

  sheet.querySelectorAll('[data-bar]').forEach(btn => btn.addEventListener('click', () => {
    S.settings.barWeight = Math.min(30, Math.max(0, S.settings.barWeight + parseFloat(btn.dataset.bar)));
    save();
    sheet.querySelector('#st-bar').textContent = fmtKg(S.settings.barWeight) + ' kg';
  }));

  sheet.querySelector('[data-plates]').addEventListener('click', () => A.plates(60));
  sheet.querySelector('[data-export]').addEventListener('click', exportData);

  const fileInput = sheet.querySelector('#import-file');
  sheet.querySelector('[data-import]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => importData(fileInput));

  sheet.querySelector('[data-reset]').addEventListener('click', async () => {
    closeSheet();
    if (!(await confirmSheet('Wirklich alles löschen?', 'Pläne, Historie, Rekorde und Körperdaten werden unwiderruflich gelöscht. Exportiere vorher ein Backup!', 'Alles löschen'))) return;
    localStorage.removeItem('gymtrainer_v5');
    localStorage.removeItem('gymtrainer_v4');
    localStorage.removeItem('gymtrainer_v3');
    location.reload();
  });
}

// ── Export / Import ──
function exportData() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gym-trainer-backup-${todayISO()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  S.settings.exported = true;
  save();
  checkAchievements();
  toast('Backup exportiert');
}

function importData(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || data.version !== 5 || !Array.isArray(data.logs)) {
        toast('Keine gültige Backup-Datei', 'info_circle');
        return;
      }
      closeSheet();
      if (!(await confirmSheet('Backup einspielen?', `${data.logs.length} Trainings, ${data.plans.length} Pläne. Die aktuellen Daten werden ersetzt.`, 'Importieren'))) return;
      localStorage.setItem('gymtrainer_v5', JSON.stringify(data));
      location.reload();
    } catch (e) {
      toast('Datei konnte nicht gelesen werden', 'info_circle');
    }
  };
  reader.readAsText(file);
}

// ── Scheibenrechner ──
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];

A.plates = target => {
  let w = Math.max(S.settings.barWeight, parseFloat(target) || 60);
  openSheet({
    title: 'Scheibenrechner',
    body: `
      <div class="mstp-row">
        <span class="mstp-lbl">Zielgewicht</span>
        <div class="mstp">
          <button onclick="A.platesAdj(-2.5)">${ic('minus')}</button>
          <b id="pl-w">${fmtKg(w)} kg</b>
          <button onclick="A.platesAdj(2.5)">${ic('plus')}</button>
        </div>
      </div>
      <div id="pl-out"></div>`,
    onOpen() {
      platesState = w;
      renderPlates();
    },
  });
};

let platesState = 60;

A.platesAdj = d => {
  platesState = Math.max(S.settings.barWeight, Math.round((platesState + d) * 100) / 100);
  const el = document.getElementById('pl-w');
  if (el) el.textContent = fmtKg(platesState) + ' kg';
  renderPlates();
};

function renderPlates() {
  const out = document.getElementById('pl-out');
  if (!out) return;
  const bar = S.settings.barWeight;
  let side = (platesState - bar) / 2;
  const used = [];
  for (const p of PLATES) {
    while (side >= p - 0.001) { used.push(p); side -= p; }
  }
  const rest = Math.round(side * 2 * 100) / 100;
  const plateDiv = p => `<div class="plate p${String(p).replace('.', '_')}">${fmtKg(p)}</div>`;
  out.innerHTML = `
    <div class="plate-viz">
      ${[...used].reverse().map(plateDiv).join('')}
      <div class="plate-bar"></div>
      ${used.map(plateDiv).join('')}
    </div>
    <p class="tc" style="font-size:13.5px;color:var(--t2)">
      Stange ${fmtKg(bar)} kg · pro Seite: <b style="color:var(--t1)">${used.length ? used.map(fmtKg).join(' + ') : 'keine Scheiben'}</b>
      ${rest > 0 ? `<br><span style="color:var(--danger)">${fmtKg(rest)} kg nicht steckbar</span>` : ''}
    </p>`;
}
