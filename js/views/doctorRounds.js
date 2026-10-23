import { getStore, requestTemperature } from '../store.js';
import { dateKey, feverFreeDays, hasDoctorVisitToday, hasTempToday, isDischargeEligible, isFever } from '../rules.js';
import { navigate } from '../router.js';

const today = dateKey();

function escapeHtml(value) {
  return String(value).replace(/[&<>\'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}
function initials(name) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function latest(patient) { return [...patient.readings].sort((first, second) => `${second.date}${second.time}`.localeCompare(`${first.date}${first.time}`))[0]; }
function feverToday(patient) { return patient.readings.some((reading) => reading.date === today && isFever(reading.tempC)); }
function moons(patient) {
  const lit = feverToday(patient) ? 0 : Math.min(3, feverFreeDays(patient));
  return [0, 1, 2].map((index) => `<span class="round-moon ${index < lit ? 'lit' : ''}" style="--moon-index:${index}"></span>`).join('');
}
function row(patient, canVisit) {
  const reading = latest(patient);
  const fever = feverToday(patient);
  const visited = hasDoctorVisitToday(patient);
  const waiting = patient.doctorWaiting;
  const requestAction = waiting ? `<button class="request-temp requested-temp" type="button" disabled>Requested ${escapeHtml(patient.doctorWaitingAt || 'now')}</button>` : '<button class="request-temp" type="button" title="Temperature not recorded yet">Request temperature</button>';
  return `<div class="doctor-row ${fever ? 'fever-row' : ''} ${waiting ? 'doctor-waiting' : ''}" data-patient-id="${patient.id}"><div class="round-avatar">${initials(patient.name)}<span class="round-moons">${moons(patient)}</span></div><span class="round-bed">${patient.bedNumber}</span><div class="round-patient"><strong>${escapeHtml(patient.name)}</strong><small>${reading ? `${reading.tempC.toFixed(1)}°C today` : 'Not measured yet'} · ${feverFreeDays(patient)} fever-free days</small>${waiting ? '<b class="waiting-badge">Doctor waiting</b>' : ''}</div><span class="doctor-temp ${fever ? 'fever-text' : ''}">${reading && reading.date === today ? `${reading.tempC.toFixed(1)}°C` : 'Not measured yet'}</span><div class="doctor-row-action">${visited ? '<span class="visited-label">Visited</span>' : canVisit ? `<button class="button button-primary open-patient" type="button">Start visit</button>` : `<button class="button button-primary disabled-visit" type="button" disabled title="Temperature not recorded yet">Start visit</button>${requestAction}`}</div></div>`;
}

export function mountDoctorRounds(container, user, utilities) {
  let store = getStore();
  let tab = 'to-visit';
  let query = '';
  function render() {
    const patients = store.patients.filter((patient) => patient.status === 'admitted');
    const visited = patients.filter((patient) => hasDoctorVisitToday(patient));
    const measured = patients.filter((patient) => hasTempToday(patient));
    const waiting = patients.filter((patient) => !hasTempToday(patient)).sort((first, second) => first.bedNumber - second.bedNumber);
    const ready = patients.filter((patient) => isDischargeEligible(patient)).length;
    const fever = patients.filter(feverToday).length;
    const list = patients.filter((patient) => !query || patient.name.toLowerCase().includes(query) || String(patient.bedNumber) === query.replace(/^bed\s*/, ''));
    const toVisit = list.filter((patient) => !hasDoctorVisitToday(patient) && hasTempToday(patient)).sort((first, second) => Number(feverToday(second)) - Number(feverToday(first)) || Number(isDischargeEligible(second)) - Number(isDischargeEligible(first)) || first.bedNumber - second.bedNumber);
    const shown = tab === 'visited' ? list.filter((patient) => hasDoctorVisitToday(patient)).sort((first, second) => first.bedNumber - second.bedNumber) : tab === 'all' ? list : toVisit;
    container.innerHTML = `<section class="doctor-rounds-screen"><div class="doctor-round-header"><div><p class="eyebrow">DOCTOR WORKFLOW</p><h2>Doctor Rounds</h2><p>Temperature context first, visit decisions second.</p></div><div class="doctor-progress"><svg viewBox="0 0 110 110"><circle class="progress-track" cx="55" cy="55" r="46"></circle><circle class="progress-value" cx="55" cy="55" r="46" style="stroke-dasharray:${2 * Math.PI * 46};stroke-dashoffset:${2 * Math.PI * 46 - visited.length / patients.length * 2 * Math.PI * 46}"></circle></svg><strong>${visited.length}<small>/ ${patients.length}</small></strong><span>visited today</span></div><div class="doctor-counts"><span><strong>${patients.length - measured.length}</strong>Awaiting temperature</span><span class="ready"><strong>${measured.length - visited.length}</strong>Ready to visit</span><span class="visited"><strong>${visited.length}</strong>Visited</span><span class="fever"><strong>${fever}</strong>Fever priority</span><span class="discharge"><strong>${ready}</strong>Discharge-ready</span></div></div><div class="round-controls"><div class="round-tabs"><button class="round-tab ${tab === 'to-visit' ? 'active' : ''}" data-tab="to-visit" type="button">To visit</button><button class="round-tab ${tab === 'visited' ? 'active' : ''}" data-tab="visited" type="button">Visited</button><button class="round-tab ${tab === 'all' ? 'active' : ''}" data-tab="all" type="button">All</button></div><label class="round-search"><span>⌕</span><input type="search" value="${escapeHtml(query)}" placeholder="Search by name or bed" aria-label="Search by name or bed"></label></div><div class="doctor-list">${shown.map((patient) => row(patient, hasTempToday(patient) && !hasDoctorVisitToday(patient))).join('') || '<div class="round-empty">No patients match this view.</div>'}</div>${tab === 'to-visit' && waiting.length ? `<details class="awaiting-group" open><summary>Awaiting temperature <b>(${waiting.length})</b></summary><div class="doctor-list">${waiting.filter((patient) => !query || patient.name.toLowerCase().includes(query) || String(patient.bedNumber) === query.replace(/^bed\s*/, '')).map((patient) => row(patient, false)).join('')}</div></details>` : ''}</section>`;
    bind();
  }
  function bind() {
    const screen = container.querySelector('.doctor-rounds-screen');
    screen.querySelectorAll('[data-tab]').forEach((button) => { button.onclick = () => { tab = button.dataset.tab; render(); }; });
    screen.querySelector('.round-search input').oninput = (event) => { query = event.target.value.trim().toLowerCase(); render(); };
    screen.querySelectorAll('.open-patient').forEach((button) => { button.onclick = () => navigate(`patient/${button.closest('[data-patient-id]').dataset.patientId}`); });
    screen.querySelectorAll('.request-temp:not(:disabled)').forEach((button) => { button.onclick = () => { const result = requestTemperature(button.closest('[data-patient-id]').dataset.patientId); if (result.ok) { utilities.toast('Nurse notified', 'warning'); store = getStore(); render(); } }; });
  }
  render();
}
