import {
  dateKey,
  feverFreeDays,
  hasDoctorVisitToday,
  hasTempToday,
  isDischargeEligible,
  isFever
} from '../rules.js';
import { navigate } from '../router.js';

const today = dateKey();
const dateLabel = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function initials(name) {
  return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function latestReading(patient) {
  return [...patient.readings].sort((first, second) => `${second.date}${second.time}`.localeCompare(`${first.date}${first.time}`))[0] || null;
}

function feverToday(patient) {
  return patient.readings.some((reading) => reading.date === today && isFever(reading.tempC));
}

function patientState(patient) {
  const freeDays = feverFreeDays(patient);
  if (feverToday(patient)) return 'fever';
  if (isDischargeEligible(patient)) return 'ready';
  if (freeDays >= 1) return 'recovering';
  return patient.readings.length ? 'stable' : 'no-data';
}

function stateLabel(state) {
  return { fever: 'Fever today', recovering: 'Recovering', ready: 'Discharge-ready', stable: 'Stable', 'no-data': 'No data yet' }[state];
}

function heartbeatPath(patient, fever) {
  return fever ? 'M0 16h10l4-12 5 24 5-18 4 6h12' : 'M0 16h12l4-3 4 6 4-3 4 1h14';
}

function moons(patient) {
  const litCount = feverToday(patient) ? 0 : Math.min(3, feverFreeDays(patient));
  return [0, 1, 2].map((index) => `<span class="orbit-moon ${index < litCount ? 'lit' : ''}" style="--moon-index:${index}"></span>`).join('');
}

function tile(patient) {
  const state = patientState(patient);
  const latest = latestReading(patient);
  const tempDone = hasTempToday(patient);
  const visitDone = hasDoctorVisitToday(patient);
  const ready = isDischargeEligible(patient);
  const fever = feverToday(patient);
  return `<button class="bed-tile state-${state}" data-patient-id="${patient.id}" data-name="${escapeHtml(patient.name.toLowerCase())}" data-bed="${patient.bedNumber}" data-status="${state}" type="button"><div class="bed-tile-top"><span class="bed-number">BED ${patient.bedNumber}</span><span class="planet-state">${stateLabel(state)}</span></div><div class="planet-wrap"><svg class="care-gap-ring" viewBox="0 0 100 100" aria-label="Temperature ${tempDone ? 'taken' : 'pending'}, doctor visit ${visitDone ? 'complete' : 'pending'}"><path class="gap-arc gap-temp ${tempDone ? 'done' : ''}" d="M 47 7 A 43 43 0 0 0 47 93"></path><path class="gap-arc gap-visit ${visitDone ? 'done' : ''}" d="M 53 7 A 43 43 0 0 1 53 93"></path></svg><div class="planet">${initials(patient.name)}<span class="planet-glow"></span></div><div class="orbit-orbit">${moons(patient)}</div></div><div class="bed-patient"><strong>${escapeHtml(patient.name)}</strong><span>${patient.age} yrs · ${patient.gender}</span></div><div class="bed-reading"><span class="temperature-value">${latest ? `${latest.tempC.toFixed(1)}°C` : '—'}</span><svg class="ecg ${fever ? 'ecg-fever' : ''}" viewBox="0 0 55 32" aria-hidden="true"><path d="${heartbeatPath(patient, fever)}"></path></svg></div><div class="ready-slot">${patient.dischargeApproval ? '<span class="pending-discharge-chip">Discharge pending admin</span>' : ready ? '<span class="ready-chip">Ready for discharge</span>' : ''}</div></button>`;
}

function chart(patient) {
  const readings = [...patient.readings].sort((first, second) => first.date.localeCompare(second.date)).slice(-7);
  const values = readings.length ? readings : [{ date: today, tempC: 0 }];
  const points = values.map((reading, index) => `${16 + index * (268 / Math.max(1, values.length - 1))},${112 - Math.max(0, Math.min(8, reading.tempC - 34)) * 10}`).join(' ');
  const labels = values.map((reading, index) => `<text x="${16 + index * (268 / Math.max(1, values.length - 1))}" y="145" text-anchor="middle">${dateLabel.format(new Date(`${reading.date}T12:00:00`))}</text>`).join('');
  return `<svg class="temperature-chart" viewBox="0 0 300 160" role="img" aria-label="Seven day temperature chart"><line class="chart-threshold" x1="16" x2="284" y1="72" y2="72"></line><text class="threshold-label" x="282" y="67" text-anchor="end">38.0°C fever</text><polyline points="${points}"></polyline>${values.map((reading, index) => `<circle cx="${16 + index * (268 / Math.max(1, values.length - 1))}" cy="${112 - Math.max(0, Math.min(8, reading.tempC - 34)) * 10}" r="3" class="${isFever(reading.tempC) ? 'fever-point' : ''}"></circle>`).join('')}${labels}</svg>`;
}

function drawer(patient, role) {
  const tempDone = hasTempToday(patient);
  const visitDone = hasDoctorVisitToday(patient);
  const latest = latestReading(patient);
  const action = role === 'nurse' ? '<button class="button button-primary drawer-action" disabled>Record temperature</button>' : role === 'doctor' ? '<button class="button button-primary drawer-action drawer-open-patient">Open patient</button>' : '';
  const recommendation = patient.dischargeApproval ? '<div class="drawer-recommendation">Discharge pending admin</div>' : '';
  return `<aside class="ward-drawer" aria-label="Patient details"><div class="drawer-head"><div><p class="eyebrow">PATIENT PROFILE</p><h2>${escapeHtml(patient.name)}</h2><p>${patient.age} years · ${patient.gender} · Bed ${patient.bedNumber}</p></div><button class="drawer-close" type="button" aria-label="Close patient details">×</button></div>${recommendation}<div class="drawer-status state-${patientState(patient)}"><span class="drawer-planet">${initials(patient.name)}</span><span><strong>${stateLabel(patientState(patient))}</strong><small>${latest ? `Latest reading ${latest.tempC.toFixed(1)}°C` : 'No temperature data yet'}</small></span></div><section class="drawer-section"><div class="drawer-section-title"><strong>Temperature history</strong><span>Last 7 days</span></div>${chart(patient)}</section><section class="drawer-section"><div class="drawer-section-title"><strong>Readings</strong><span>${patient.readings.length} logged</span></div><div class="reading-list">${patient.readings.slice().reverse().slice(0, 7).map((reading) => `<div class="reading-row"><span>${dateLabel.format(new Date(`${reading.date}T12:00:00`))}<small>${reading.time} · ${escapeHtml(reading.recordedBy)}</small></span><strong class="${isFever(reading.tempC) ? 'fever-text' : ''}">${reading.tempC.toFixed(1)}°C</strong></div>`).join('') || '<p class="drawer-empty">No readings recorded.</p>'}</div></section><section class="drawer-section"><div class="drawer-section-title"><strong>Today’s checklist</strong></div><div class="checklist"><div><span class="check-icon ${tempDone ? 'complete' : ''}">${tempDone ? '✓' : '·'}</span><span>Temperature taken</span><b>${tempDone ? 'Done' : 'Pending'}</b></div><div><span class="check-icon ${visitDone ? 'complete' : ''}">${visitDone ? '✓' : '·'}</span><span>Doctor visited</span><b>${visitDone ? 'Done' : 'Pending'}</b></div></div></section>${action}</aside>`;
}

function renderSummary(patients) {
  const active = patients.filter((patient) => patient.status === 'admitted');
  const count = (predicate) => active.filter(predicate).length;
  return `<div class="ward-summary"><div class="summary-chip"><strong>${active.length}/74</strong><span>Beds</span></div><div class="summary-chip warning"><strong>${count((patient) => !hasTempToday(patient))}</strong><span>Temp pending</span></div><div class="summary-chip violet"><strong>${count((patient) => !hasDoctorVisitToday(patient))}</strong><span>Visit pending</span></div><div class="summary-chip danger"><strong>${count(feverToday)}</strong><span>Fever today</span></div><div class="summary-chip healthy"><strong>${count((patient) => isDischargeEligible(patient))}</strong><span>Discharge-ready</span></div></div>`;
}

function renderLegend() {
  return '<div class="ward-legend"><span><i class="legend-planet legend-teal"></i>Healthy / ready</span><span><i class="legend-moon"></i>Fever-free day</span><span><i class="legend-ring"></i>Care gap ring</span></div>';
}

export function mountWardMap(container, patients, role) {
  const active = patients.filter((patient) => patient.status === 'admitted').sort((first, second) => first.bedNumber - second.bedNumber);
  container.innerHTML = `<section class="ward-map-screen"><div class="ward-map-toolbar">${renderLegend()}</div>${renderSummary(active)}<div class="ward-controls"><div class="filter-chips"><button class="filter-chip active" data-filter="all" type="button">All</button><button class="filter-chip" data-filter="temp" type="button">Temp pending</button><button class="filter-chip" data-filter="visit" type="button">Visit pending</button><button class="filter-chip" data-filter="fever" type="button">Fever</button><button class="filter-chip" data-filter="ready" type="button">Discharge-ready</button></div><label class="ward-search"><span>⌕</span><input type="search" placeholder="Search patient or bed" aria-label="Search patient or bed"></label></div><div class="bed-grid">${active.map(tile).join('')}</div><div class="drawer-backdrop"></div><div class="drawer-slot"></div></section>`;
  const screen = container.querySelector('.ward-map-screen');
  const grid = screen.querySelector('.bed-grid');
  const search = screen.querySelector('.ward-search input');
  let filter = 'all';

  function applyFilters() {
    const query = search.value.trim().toLowerCase();
    screen.querySelectorAll('.bed-tile').forEach((bed) => {
      const matchesFilter = filter === 'all' || bed.dataset.status === filter || (filter === 'temp' && !bed.querySelector('.gap-temp.done')) || (filter === 'visit' && !bed.querySelector('.gap-visit.done'));
      const matchesSearch = !query || bed.dataset.name.includes(query) || bed.dataset.bed === query.replace(/^bed\s*/, '');
      bed.classList.toggle('filtered-out', !(matchesFilter && matchesSearch));
    });
  }

  function closeDrawer() { screen.classList.remove('drawer-open'); screen.querySelector('.drawer-slot').innerHTML = ''; }
  function openDrawer(patient) { screen.querySelector('.drawer-slot').innerHTML = drawer(patient, role); screen.querySelector('.drawer-head')?.insertAdjacentHTML('afterend', `<div class="drawer-admission-info">${patient.age} yrs · ${patient.gender} · Day ${Math.max(1, Math.floor((Date.now() - new Date(`${patient.symptomsStarted || patient.admittedAt}T12:00:00`).getTime()) / 86400000) + 1)} of illness</div>`); screen.classList.add('drawer-open'); screen.querySelector('.drawer-close').onclick = closeDrawer; screen.querySelector('.drawer-open-patient')?.addEventListener('click', () => navigate(`patient/${patient.id}`)); }

  screen.addEventListener('click', (event) => {
    const filterButton = event.target.closest('.filter-chip');
    if (filterButton) { filter = filterButton.dataset.filter; screen.querySelectorAll('.filter-chip').forEach((button) => button.classList.toggle('active', button === filterButton)); applyFilters(); return; }
    if (event.target.closest('.drawer-backdrop')) { closeDrawer(); return; }
    const bed = event.target.closest('.bed-tile');
    if (bed) openDrawer(active.find((patient) => patient.id === bed.dataset.patientId));
  });
  search.addEventListener('input', applyFilters);
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && screen.classList.contains('drawer-open')) closeDrawer(); }, { once: false });
  grid.setAttribute('aria-label', '74 bed tiles');
}