import { getStore } from '../store.js';
import { feverFreeDays, hasTempToday, isFever } from '../rules.js';
import { navigate } from '../router.js';

const esc = (value) => String(value).replace(/[&<>\'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const initials = (name) => name.split(' ').slice(0, 2).map((part) => part[0]).join('').toUpperCase();

export function mountPatientDirectory(container) {
  const patients = getStore().patients.filter((patient) => patient.status === 'admitted').sort((first, second) => first.bedNumber - second.bedNumber);
  container.innerHTML = `<section class="patient-directory"><div class="directory-intro"><div><p class="eyebrow">CLINICAL RECORDS</p><h2>Patient Detail</h2><p>Choose a patient to review their clinical record and daily care checklist.</p></div><span class="directory-count">${patients.length} admitted</span></div><div class="directory-list">${patients.map((patient) => { const latest = [...patient.readings].sort((first, second) => `${second.date}${second.time}`.localeCompare(`${first.date}${first.time}`))[0]; const fever = latest && isFever(latest.tempC) && latest.date === new Date().toISOString().slice(0, 10); return `<article class="directory-row"><span class="directory-avatar ${fever ? 'fever' : ''}">${initials(patient.name)}</span><span class="directory-bed">Bed ${patient.bedNumber}</span><span class="directory-patient"><strong>${esc(patient.name)}</strong><small>${patient.age} years · ${patient.gender} · ${feverFreeDays(patient)} fever-free days</small></span><span class="directory-reading ${fever ? 'fever-text' : ''}">${hasTempToday(patient) ? `${latest.tempC.toFixed(1)}°C today` : 'Temperature pending'}</span><button class="button button-primary open-directory-record" data-patient-id="${patient.id}" type="button">Open record</button></article>`; }).join('')}</div></section>`;
  container.querySelectorAll('.open-directory-record').forEach((button) => { button.onclick = () => navigate(`patient/${button.dataset.patientId}`); });
}
