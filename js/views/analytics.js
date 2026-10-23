import { getStore } from '../store.js';
import { bedsOccupied, mortalityRate } from '../rules.js';

export function mountAnalytics(container) {
  const patients = getStore().patients;
  const admitted = patients.filter((patient) => patient.status === 'admitted').length;
  const cured = patients.filter((patient) => patient.status === 'discharged' && patient.outcome === 'cured').length;
  const deceased = patients.filter((patient) => patient.status === 'deceased').length;
  const closed = cured + deceased;
  const mortality = mortalityRate(patients);
  const mortalityPercentage = Math.floor(mortality.rate * 100);
  const success = closed ? Math.round((cured / closed) * 100) : 0;
  const circumference = 2 * Math.PI * 55;
  const offset = circumference - (success / 100) * circumference;
  const max = Math.max(cured, deceased, 1);
  container.innerHTML = `<section class="admin-screen analytics-screen"><div class="admin-intro"><div><p class="eyebrow">ADMIN WORKFLOW</p><h2>Analytics</h2><p>Facility outcomes against the 85% success benchmark.</p></div><span class="occupancy-summary">${bedsOccupied(patients)}/74 occupied</span></div><div class="analytics-cards"><div><strong>${admitted}</strong><span>Admitted</span></div><div><strong>${cured}</strong><span>Discharged cured</span></div><div class="danger-card"><strong>${deceased}</strong><span>Deceased</span></div><div><strong>${admitted}/74</strong><span>Occupancy</span></div></div><div class="analytics-grid"><section class="success-card"><div class="success-ring"><svg viewBox="0 0 130 130"><circle class="progress-track" cx="65" cy="65" r="55"></circle><circle class="progress-value" cx="65" cy="65" r="55" style="stroke-dasharray:${circumference};stroke-dashoffset:${offset}"></circle></svg><strong>${success}%</strong><span>success rate</span></div><div><p class="eyebrow">OUTCOME BENCHMARK</p><h3>${success}% vs 85% benchmark</h3><p>Cured patients as a share of all closed cases.</p></div></section><section class="outcome-chart"><div class="section-heading"><h3>Closed outcomes</h3><span>${closed} cases</span></div><svg viewBox="0 0 360 190" role="img" aria-label="Cured versus deceased outcomes"><line x1="55" y1="155" x2="330" y2="155"></line><rect x="100" y="${155 - (cured / max) * 115}" width="62" height="${(cured / max) * 115}"></rect><rect class="deceased-bar" x="220" y="${155 - (deceased / max) * 115}" width="62" height="${(deceased / max) * 115}"></rect><text x="131" y="174" text-anchor="middle">Cured</text><text x="251" y="174" text-anchor="middle">Deceased</text><text x="131" y="${150 - (cured / max) * 115}" text-anchor="middle">${cured}</text><text x="251" y="${150 - (deceased / max) * 115}" text-anchor="middle">${deceased}</text></svg></section></div><div class="mortality-banner ${mortality.aboveBenchmark ? 'mortality-alert' : 'mortality-ok'}">${mortality.aboveBenchmark ? `Mortality ${mortalityPercentage}% is above the 15% benchmark` : 'Within benchmark'}</div></section>`;
}