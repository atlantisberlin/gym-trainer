// ─── App-Kern: Init, Navigation, Theme ──────────────────────────────────────
import { A } from './actions.js';
import { ic } from './icons.js';
import { S, load, save, refreshExMap } from './state.js';
import { fmtDateLong } from './util.js';
import * as home from './views/home.js';
import * as plans from './views/plans.js';
import * as stats from './views/stats.js';
import * as history from './views/history.js';
import * as player from './views/player.js';
import * as settings from './views/settings.js';

const TABS = [
  { id: 'home',    label: 'Heute',       icon: 'barbell',        title: 'Heute' },
  { id: 'plans',   label: 'Pläne',       icon: 'clipboard_list', title: 'Pläne' },
  { id: 'stats',   label: 'Fortschritt', icon: 'chart_line',     title: 'Fortschritt' },
  { id: 'history', label: 'Verlauf',     icon: 'history',        title: 'Verlauf' },
];

const VIEWS = { home, plans, stats, history };
let current = 'home';

export function switchTab(id) {
  current = id;
  document.querySelectorAll('.bnav-item').forEach(b =>
    b.classList.toggle('active', b.dataset.tab === id));
  document.querySelectorAll('.view').forEach(v =>
    v.classList.toggle('active', v.id === 'v-' + id));
  const tab = TABS.find(t => t.id === id);
  document.getElementById('tb-title').textContent = tab.title;
  document.getElementById('tb-sub').textContent = id === 'home' ? fmtDateLong() : '';
  VIEWS[id].render();
}
A.tab = switchTab;

// Aktuellen Tab neu zeichnen (nach Datenänderungen)
export function rerender() {
  VIEWS[current].render();
}
A.rerender = rerender;

export function applyTheme() {
  document.documentElement.dataset.theme = S.settings.theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = S.settings.theme === 'light' ? '#f2f2ef' : '#0c0c0d';
}

function renderNav() {
  document.getElementById('bottomnav').innerHTML = TABS.map(t => `
    <button class="bnav-item${t.id === current ? ' active' : ''}" data-tab="${t.id}" onclick="A.tab('${t.id}')">
      ${ic(t.icon)}<span>${t.label}</span>
    </button>`).join('');
}

// ─── Start ──────────────────────────────────────────────────────────────────
load();
refreshExMap();
applyTheme();
renderNav();

document.getElementById('btn-settings').innerHTML = ic('settings');
document.getElementById('btn-settings').addEventListener('click', () => settings.open());

switchTab('home');

// Laufende Session wiederherstellen? Der Player bleibt geschlossen,
// die Heute-Ansicht zeigt eine "Fortsetzen"-Karte (bewusste Entscheidung).

// Bei Rückkehr in den Tag (Mitternacht überschritten) Heute-Ansicht aktualisieren
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && current === 'home' && !player.isOpen()) rerender();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
