// ─── Leichte SVG-Charts (eine Serie, Marken-Akzent) ─────────────────────────
import { fmtDate, fmtKg } from './util.js';

// Linien-Chart: points = [{date:'YYYY-MM-DD', v:Number}] chronologisch
export function lineChart(points, { unit = '', id = 'lc' } = {}) {
  if (points.length < 2) return `<div class="chart-empty">Mindestens 2 Einträge nötig – dann erscheint hier der Verlauf.</div>`;

  const W = 520, H = 190, padL = 44, padR = 16, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;

  let min = Math.min(...points.map(p => p.v));
  let max = Math.max(...points.map(p => p.v));
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  min -= range * 0.08; max += range * 0.08;

  const x = i => padL + (i / (points.length - 1)) * iw;
  const y = v => padT + (1 - (v - min) / (max - min)) * ih;

  // 3 Gitterlinien + Achswerte
  const grid = [0, 0.5, 1].map(t => {
    const vy = padT + t * ih;
    const val = max - t * (max - min);
    return `<line x1="${padL}" y1="${vy}" x2="${W - padR}" y2="${vy}" stroke="var(--line)" stroke-width="1"/>
      <text x="${padL - 7}" y="${vy + 3.5}" text-anchor="end" font-size="10.5" fill="var(--t3)">${Math.round(val)}</text>`;
  }).join('');

  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(points.length - 1).toFixed(1)},${padT + ih} L${padL},${padT + ih} Z`;

  const markers = points.map((p, i) => `
    <circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="${i === points.length - 1 ? 4 : 3}" fill="var(--acc)"/>
    <circle cx="${x(i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="14" fill="transparent"
      data-tip="${fmtKg(p.v)}${unit ? ' ' + unit : ''} · ${fmtDate(p.date)}" data-x="${x(i).toFixed(0)}"/>`).join('');

  const last = points[points.length - 1];
  const lastLabel = `<text x="${x(points.length - 1).toFixed(1)}" y="${(y(last.v) - 10).toFixed(1)}"
    text-anchor="end" font-size="11.5" font-weight="700" fill="var(--t1)">${fmtKg(last.v)}${unit ? ' ' + unit : ''}</text>`;

  const xLabels = `
    <text x="${padL}" y="${H - 8}" font-size="10.5" fill="var(--t3)">${fmtDate(points[0].date)}</text>
    <text x="${W - padR}" y="${H - 8}" text-anchor="end" font-size="10.5" fill="var(--t3)">${fmtDate(last.date)}</text>`;

  return `
    <div class="chart-wrap" style="position:relative">
      <svg class="chart-svg" viewBox="0 0 ${W} ${H}" data-chart="${id}">
        ${grid}
        <path d="${area}" fill="var(--acc)" opacity="0.08"/>
        <path d="${path}" fill="none" stroke="var(--acc)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${markers}
        ${lastLabel}
        ${xLabels}
      </svg>
      <div class="chart-tip" data-tipbox hidden></div>
    </div>`;
}

// Tooltip-Verhalten für alle Charts in einem Container aktivieren
export function wireCharts(root) {
  root.querySelectorAll('.chart-wrap').forEach(wrap => {
    const tip = wrap.querySelector('[data-tipbox]');
    const svg = wrap.querySelector('svg');
    if (!tip || !svg) return;
    const show = target => {
      const t = target.closest('[data-tip]');
      if (!t) { tip.hidden = true; return; }
      tip.textContent = t.dataset.tip;
      tip.hidden = false;
      const frac = parseFloat(t.dataset.x) / 520;
      tip.style.left = Math.min(92, Math.max(8, frac * 100)) + '%';
    };
    svg.addEventListener('pointerdown', e => show(e.target));
    svg.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') show(e.target); });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  });
}
