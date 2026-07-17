// ─── Allgemeine Helfer ──────────────────────────────────────────────────────

export const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
export const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export const MUSCLES = ['Brust', 'Schultern', 'Rücken', 'Lats', 'Bizeps', 'Trizeps', 'Core', 'Quadrizeps', 'Beinbeuger', 'Gesäß', 'Waden', 'Unterarme'];

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Heute als ISO-Datum (lokale Zeitzone)
export function todayISO() {
  return toISO(new Date());
}

export function toISO(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Wochentag-Index: Mo=0 … So=6
export function weekdayIdx(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

export function addDays(d, n) {
  const nd = new Date(d);
  nd.setDate(nd.getDate() + n);
  return nd;
}

// "17.07.2026"
export function fmtDate(iso) {
  const d = fromISO(iso);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// "Do., 17. Juli"
export function fmtDateShort(iso) {
  const d = fromISO(iso);
  return d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long' });
}

// "Donnerstag, 17. Juli 2026"
export function fmtDateLong(d = new Date()) {
  return d.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Sekunden → "42 Min" / "1:12 Std"
export function fmtDur(secs) {
  if (!secs || secs <= 0) return '–';
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} Min`;
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')} Std`;
}

// Sekunden → "12:34"
export function fmtClock(secs) {
  const m = Math.floor(secs / 60), s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// kg-Volumen → "3,4 t" / "850 kg"
export function fmtVol(kg) {
  if (!kg) return '0 kg';
  if (kg >= 1000) return (kg / 1000).toFixed(1).replace('.', ',') + ' t';
  return Math.round(kg) + ' kg';
}

export function fmtKg(w) {
  if (w == null) return '0';
  return (Math.round(w * 100) / 100).toString().replace('.', ',');
}

// Epley-Formel für geschätztes 1RM
export function e1rm(w, r) {
  if (!w || w <= 0 || !r) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

// Gewichtsschritt je Equipment
export function stepFor(equip) {
  switch (equip) {
    case 'Maschine': return 5;
    case 'Kurzhantel': return 2;
    default: return 2.5; // Langhantel, Kabel, EZ-Stange, Sonstiges
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
