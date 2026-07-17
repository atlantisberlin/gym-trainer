// ─── UI-Bausteine: Sheet, Toast, Confirm ────────────────────────────────────
import { ic } from './icons.js';
import { S } from './state.js';

let sheetEls = null;

export function openSheet({ title, body, onOpen, onClose }) {
  closeSheet(true);
  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.innerHTML = `
    <div class="sheet-grip"></div>
    <div class="sheet-head">
      <div class="sheet-title">${title}</div>
      <button class="iconbtn" data-close aria-label="Schließen">${ic('x')}</button>
    </div>
    <div class="sheet-body"><div class="sheet-inner">${body}</div></div>`;
  document.body.append(backdrop, sheet);
  sheetEls = { backdrop, sheet, onClose };
  backdrop.addEventListener('click', () => closeSheet());
  sheet.querySelector('[data-close]').addEventListener('click', () => closeSheet());
  requestAnimationFrame(() => { backdrop.classList.add('open'); sheet.classList.add('open'); });
  if (onOpen) onOpen(sheet);
  return sheet;
}

export function closeSheet(instant = false) {
  if (!sheetEls) return;
  const { backdrop, sheet, onClose } = sheetEls;
  sheetEls = null;
  if (onClose) onClose();
  if (instant) { backdrop.remove(); sheet.remove(); return; }
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  setTimeout(() => { backdrop.remove(); sheet.remove(); }, 260);
}

export function isSheetOpen() { return !!sheetEls; }

// ── Toast ──
let toastTimer = null;
export function toast(msg, icon = 'check') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    document.body.append(el);
  }
  el.innerHTML = `${ic(icon)}<span>${msg}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── Confirm als Sheet ──
export function confirmSheet(title, text, confirmLabel = 'Löschen') {
  return new Promise(resolve => {
    let done = false;
    openSheet({
      title,
      body: `
        <p style="font-size:14px;color:var(--t2);line-height:1.6;margin-bottom:18px">${text}</p>
        <button class="btn btn-danger full" data-yes>${confirmLabel}</button>
        <button class="btn btn-ghost full mt8" data-no>Abbrechen</button>`,
      onOpen(sheet) {
        sheet.querySelector('[data-yes]').addEventListener('click', () => { done = true; closeSheet(); resolve(true); });
        sheet.querySelector('[data-no]').addEventListener('click', () => { done = true; closeSheet(); resolve(false); });
      },
      onClose() { if (!done) resolve(false); },
    });
  });
}

// ── Vibration (respektiert Einstellung) ──
export function vibrate(pattern = 30) {
  if (S.settings.vibrate && navigator.vibrate) {
    try { navigator.vibrate(pattern); } catch (e) {}
  }
}
