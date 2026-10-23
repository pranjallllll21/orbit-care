import { getStore, recordTemperature } from '../store.js';
import { dateKey, feverFreeDays, hasTempToday, isFever, validateTemperature } from '../rules.js';

const today = dateKey();

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function initials(name) { return name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }
function latestReading(patient) { return [...patient.readings].sort((first, second) => `${second.date}${second.time}`.localeCompare(`${first.date}${first.time}`))[0] || null; }

function moons(patient) {
  const litCount = patient.readings.some((reading) => reading.date === today && isFever(reading.tempC)) ? 0 : Math.min(3, feverFreeDays(patient));
  return [0, 1, 2].map((index) => `<span class="round-moon ${index < litCount ? 'lit' : ''}" style="--moon-index:${index}"></span>`).join('');
}

function roundRow(patient, recorded, user) {
  const latest = latestReading(patient);
  if (recorded) return `<div class="round-row recorded-row" data-patient-id="${patient.id}"><div class="round-avatar">${initials(patient.name)}<span class="round-moons">${moons(patient)}</span></div><span class="round-bed">${patient.bedNumber}</span><div class="round-patient"><strong>${escapeHtml(patient.name)}</strong><small>Recorded ${latest?.date === today ? 'today' : latest?.date} at ${latest?.time || '—'}${latest && isFever(latest.tempC) ? ' · Fever flagged' : ''}</small></div><strong class="round-temperature ${latest && isFever(latest.tempC) ? 'fever-text' : ''}">${latest ? `${latest.tempC.toFixed(1)}°C` : '—'}</strong><span class="round-nurse">${escapeHtml(latest?.recordedBy || user.name)}</span><button class="amend-button" type="button" disabled>Amend</button></div>`;
  return `<div class="round-row pending-row ${patient.doctorWaiting ? 'doctor-waiting' : ''}" data-patient-id="${patient.id}"><div class="round-avatar">${initials(patient.name)}<span class="round-moons">${moons(patient)}</span></div><span class="round-bed">${patient.bedNumber}</span><div class="round-patient"><strong>${escapeHtml(patient.name)}</strong><small>Last ${latest ? `${latest.tempC.toFixed(1)}°C · ${latest.date}` : 'No reading yet'}</small>${patient.doctorWaiting ? '<b class="waiting-badge">Doctor waiting</b>' : ''}</div><label class="round-input-wrap"><input class="round-input" type="number" step="0.1" min="34" max="42" placeholder="36.8" inputmode="decimal" aria-label="Temperature for ${escapeHtml(patient.name)}"><span class="inline-error"></span></label><button class="button button-primary round-save" type="button">Save</button></div>`;
}

function progressRing(recorded, total) {
  const circumference = 2 * Math.PI * 46;
  const offset = circumference - (recorded / total) * circumference;
  return `<div class="round-progress"><svg viewBox="0 0 110 110" aria-label="${recorded} of ${total} temperatures recorded"><circle class="progress-track" cx="55" cy="55" r="46"></circle><circle class="progress-value" cx="55" cy="55" r="46" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"></circle></svg><strong>${recorded}<small>/ ${total}</small></strong><span>recorded today</span></div>`;
}

export function mountTemperatureRound(container, user, utilities) {
  let store = getStore();
  const activePatients = () => store.patients.filter((patient) => patient.status === 'admitted').sort((first, second) => first.bedNumber - second.bedNumber);
  const render = (tab = 'pending', query = '') => {
    const patients = activePatients();
    const recorded = patients.filter((patient) => hasTempToday(patient));
    const pending = patients.filter((patient) => !hasTempToday(patient)).sort((first, second) => Number(second.doctorWaiting) - Number(first.doctorWaiting) || first.bedNumber - second.bedNumber);
    const visible = (tab === 'recorded' ? recorded : tab === 'all' ? patients : pending).filter((patient) => !query || patient.name.toLowerCase().includes(query) || String(patient.bedNumber) === query.replace(/^bed\s*/, ''));
    const feverCount = recorded.filter((patient) => patient.readings.some((reading) => reading.date === today && isFever(reading.tempC))).length;
    container.innerHTML = `<section class="temperature-round-screen"><div class="round-header"><div><p class="eyebrow">NURSE WORKFLOW</p><h2>Temperature Round</h2><p>One trusted reading per patient, every day.</p></div>${progressRing(recorded.length, patients.length)}<div class="round-counts"><span><strong>${pending.length}</strong>Pending</span><span class="recorded"><strong>${recorded.length}</strong>Recorded</span><span class="fever"><strong>${feverCount}</strong>Fever flagged</span></div></div><div class="round-controls"><div class="round-tabs"><button class="round-tab ${tab === 'pending' ? 'active' : ''}" data-tab="pending" type="button">Pending</button><button class="round-tab ${tab === 'recorded' ? 'active' : ''}" data-tab="recorded" type="button">Recorded</button><button class="round-tab ${tab === 'all' ? 'active' : ''}" data-tab="all" type="button">All</button></div><label class="round-search"><span>⌕</span><input type="search" value="${escapeHtml(query)}" placeholder="Search by name or bed" aria-label="Search by name or bed"></label></div><div class="round-list">${visible.map((patient) => roundRow(patient, hasTempToday(patient), user)).join('') || '<div class="round-empty">No patients match this view.</div>'}</div></section>`;
    bind(tab, query);
  };
  function bind(tab, query) {
    const screen = container.querySelector('.temperature-round-screen');
    screen.querySelectorAll('[data-tab]').forEach((button) => { button.onclick = () => render(button.dataset.tab, screen.querySelector('.round-search input').value.trim().toLowerCase()); });
    const search = screen.querySelector('.round-search input');
    search.oninput = () => render(tab, search.value.trim().toLowerCase());
    screen.querySelectorAll('.round-save').forEach((button) => {
      button.onclick = () => saveRow(button.closest('.round-row'), tab, query);
      button.closest('.round-row').querySelector('.round-input').onkeydown = (event) => { if (event.key === 'Enter') { event.preventDefault(); saveRow(button.closest('.round-row'), tab, query); } };
    });
  }
  function saveRow(row, tab, query) {
    const patient = store.patients.find((item) => item.id === row.dataset.patientId);
    const input = row.querySelector('.round-input');
    const validation = validateTemperature(input.value);
    row.querySelector('.inline-error').textContent = validation.valid ? '' : validation.error;
    if (!validation.valid) return;
    const save = () => {
      const result = recordTemperature(patient.id, validation.value, user.name);
      if (!result.ok) { row.querySelector('.inline-error').textContent = result.error; return; }
      row.classList.add('row-saving');
      utilities.toast(`${patient.name}: temperature recorded`, 'success');
      setTimeout(() => { store = getStore(); render(tab, query); requestAnimationFrame(() => container.querySelector(`.pending-row[data-patient-id="${patient.id}"]`)?.querySelector('.round-input')?.focus()); }, 250);
    };
    if (isFever(validation.value)) utilities.confirmModal('Fever detected', `Fever detected, ${validation.value.toFixed(1)} C. Confirm reading?`, save);
    else save();
  }
  render();
}