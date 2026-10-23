import { getStore, getUser, resetDemoData, users } from './store.js';
import { bedsOccupied, bedsFree } from './rules.js';
import { canAccess, currentRoute, navigate, patientIdFromRoute, routeMeta, routesForRole, startRouter } from './router.js';
import { mountWardMap } from './views/wardMap.js';
import { mountTemperatureRound } from './views/temperatureRound.js';
import { mountDoctorRounds } from './views/doctorRounds.js';
import { mountPatientDetail } from './views/patientDetail.js';
import { mountDischargeQueue } from './views/dischargeQueue.js';
import { mountAdmissions } from './views/admissions.js';
import { mountAnalytics } from './views/analytics.js';
import { mountPatientDirectory } from './views/patientDirectory.js';

const app = document.querySelector('#app');
let session = JSON.parse(sessionStorage.getItem('orbitcare-session') || 'null');
window.addEventListener('orbitcare:store-updated', () => {
  const occupancy = document.querySelector('.occupancy-chip strong');
  if (!occupancy) return;
  const store = getStore();
  occupancy.innerHTML = `${bedsOccupied(store.patients)}/74 <em>${bedsFree(store.patients)} free</em>`;
});

const icon = (symbol, extra = '') => `<span class="nav-symbol ${extra}">${symbol}</span>`;
const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

function toast(message, type = 'success') {
  const item = document.createElement('div'); item.className = `toast toast-${type}`;
  item.innerHTML = `<span class="toast-dot"></span><span>${message}</span><button aria-label="Dismiss">×</button>`;
  document.querySelector('#toast-region').append(item);
  item.querySelector('button').onclick = () => item.remove();
  setTimeout(() => item.remove(), 4200);
}

function confirmModal(title, message, onConfirm) {
  const region = document.querySelector('#modal-region');
  region.innerHTML = `<div class="modal-backdrop"><section class="modal-card" role="dialog" aria-modal="true"><div class="modal-icon">!</div><h2>${title}</h2><p>${message}</p><div class="modal-actions"><button class="button button-quiet" data-close>Cancel</button><button class="button button-primary" data-confirm>Confirm</button></div></section></div>`;
  region.querySelector('[data-close]').onclick = () => { region.innerHTML = ''; };
  region.querySelector('[data-confirm]').onclick = () => { onConfirm(); region.innerHTML = ''; };
}

function promptConfirm(title, message, fields, onConfirm) {
  const region = document.querySelector('#modal-region');
  region.innerHTML = `<div class="modal-backdrop"><section class="modal-card prompt-modal" role="dialog" aria-modal="true"><div class="modal-icon">!</div><h2>${title}</h2><p>${message}</p><div class="prompt-fields">${fields.map((field) => `<label>${field.label}<${field.multiline ? 'textarea' : 'input'} data-prompt="${field.name}" placeholder="${field.placeholder || ''}" ${field.required === false ? '' : 'required'}>${field.multiline ? '' : ''}</${field.multiline ? 'textarea' : 'input'}></label>`).join('')}</div><div class="modal-actions"><button class="button button-quiet" data-close>Cancel</button><button class="button button-primary" data-confirm>Confirm</button></div></section></div>`;
  region.querySelector('[data-close]').onclick = () => { region.innerHTML = ''; };
  region.querySelector('[data-confirm]').onclick = () => { const values = Object.fromEntries([...region.querySelectorAll('[data-prompt]')].map((field) => [field.dataset.prompt, field.value])); onConfirm(values); region.innerHTML = ''; };
}

function loginView() {
  const selectedRole = 'nurse';
  app.innerHTML = `<main class="login-shell"><div class="login-orbit orbit-one"></div><div class="login-orbit orbit-two"></div><section class="login-panel"><div class="brand-lockup"><div class="brand-mark">◎</div><div><strong>OrbitCare</strong><span>Clinical mission control</span></div></div><div class="login-copy"><p class="eyebrow">SECURE FACILITY ACCESS</p><h1>Care, in<br><em>orbit.</em></h1><p>One clear view of every temperature, visit, and recovery milestone across the ward.</p></div><form id="login-form" class="login-form"><label>Choose your role<select id="role-select">${['nurse', 'doctor', 'admin'].map((role) => `<option value="${role}">${role[0].toUpperCase() + role.slice(1)}</option>`).join('')}</select></label><label>Choose your profile<select id="user-select"></select></label><button class="button button-primary button-wide" type="submit">Enter OrbitCare <span>→</span></button></form><p class="login-footnote">Demo environment · Facility OC-74 · All data stays in this browser</p></section><aside class="login-visual"><div class="visual-top"><span>ORBITCARE / 01</span><span>LIVE FACILITY FEED</span></div><div class="radar"><div class="radar-ring ring-a"></div><div class="radar-ring ring-b"></div><div class="radar-sweep"></div><span class="radar-point point-a"></span><span class="radar-point point-b"></span><span class="radar-point point-c"></span><div class="radar-center">74<span>BEDS</span></div></div><div class="visual-caption"><span>WARD CAPACITY</span><strong>74 / 74 <small>occupied</small></strong></div></aside></main>`;
  const roleSelect = document.querySelector('#role-select'); const userSelect = document.querySelector('#user-select');
  function populateUsers() { userSelect.innerHTML = users.filter((user) => user.role === roleSelect.value).map((user) => `<option value="${user.id}">${user.name}</option>`).join(''); }
  roleSelect.onchange = populateUsers; populateUsers();
  document.querySelector('#login-form').onsubmit = (event) => { event.preventDefault(); session = getUser(userSelect.value); sessionStorage.setItem('orbitcare-session', JSON.stringify(session)); navigate(routesForRole(session.role)[0]); toast(`Welcome back, ${session.name.split(' ').slice(-1)[0]}.`, 'success'); };
  setTimeout(() => toast('Demo ready · 74 beds currently occupied', 'warning'), 700);
}

function shellView(route) {
  const store = getStore(); const occupied = bedsOccupied(store.patients); const patientRoute = patientIdFromRoute(route); const meta = patientRoute ? { label: 'Patient Detail', icon: '○' } : routeMeta[route] || { label: 'Overview', icon: '○' }; const roleRoutes = routesForRole(session.role);
  const pendingDischarges = store.patients.filter((patient) => patient.status === 'admitted' && patient.dischargeApproval).length;
  app.innerHTML = `<div class="app-shell"><aside class="sidebar"><div class="sidebar-brand"><div class="brand-mark">◎</div><span>OrbitCare<small>MISSION CONTROL</small></span></div><div class="sidebar-label">Workspace</div><nav>${roleRoutes.map((item) => `<a href="#/${item}" class="nav-link ${item === route ? 'active' : ''}">${icon(routeMeta[item].icon)}<span>${routeMeta[item].label}</span>${item === 'discharge-queue' && pendingDischarges ? `<b class="nav-badge">${pendingDischarges}</b>` : ''}</a>`).join('')}</nav><div class="sidebar-bottom"><div class="sidebar-status"><span class="status-pulse"></span><span><strong>Facility online</strong><small>All systems operational</small></span></div><button class="logout-link" id="reset-demo">↻ <span>Reset demo data</span></button><button class="logout-link" id="logout">↪ <span>Switch role</span></button></div></aside><div class="main-shell"><header class="topbar"><button class="mobile-menu" id="mobile-menu">☰</button><div class="breadcrumbs"><span>OrbitCare</span><b>/</b><strong>${meta.label}</strong></div><div class="topbar-actions"><div class="date-chip">◷ <span>${todayLabel}</span></div><div class="occupancy-chip"><span class="occupancy-icon">⌂</span><span><small>Bed occupancy</small><strong>${occupied}/74 <em>${bedsFree(store.patients)} free</em></strong></span></div><div class="user-chip"><span class="avatar">${session.initials}</span><span><strong>${session.name}</strong><small class="role-badge role-${session.role}">${session.role}</small></span><span class="chevron">⌄</span></div></div></header><main class="content"><div class="page-header"><div><p class="eyebrow">${session.role.toUpperCase()} WORKSPACE</p><h1>${meta.label}</h1><p class="page-subtitle">A focused view of today's care coordination.</p></div><span class="role-badge role-${session.role}">${session.role} access</span></div>${pagePlaceholder(route, store)}</main></div></div>`;
  if (route === 'ward-map' && canAccess(session.role, route)) mountWardMap(document.querySelector('.ward-map-view'), store.patients, session.role);
  if (route === 'temperature' && canAccess(session.role, route)) mountTemperatureRound(document.querySelector('.temperature-round-view'), session, { toast, confirmModal });
  if (route === 'doctor-rounds' && canAccess(session.role, route)) mountDoctorRounds(document.querySelector('.doctor-rounds-view'), session, { toast });
  if (patientRoute && canAccess(session.role, route)) mountPatientDetail(document.querySelector('.patient-detail-view'), patientRoute, session, { toast, confirmModal, promptConfirm });
  if (route === 'discharge-queue' && canAccess(session.role, route)) mountDischargeQueue(document.querySelector('.discharge-queue-view'), { toast, confirmModal });
  if (route === 'admissions' && canAccess(session.role, route)) mountAdmissions(document.querySelector('.admissions-view'), { toast });
  if (route === 'analytics' && canAccess(session.role, route)) mountAnalytics(document.querySelector('.analytics-view'));
  if (route === 'patient-detail' && canAccess(session.role, route)) mountPatientDirectory(document.querySelector('.patient-directory-view'));
  document.querySelector('#logout').onclick = () => confirmModal('Switch role?', 'Your current demo session will be ended.', () => { session = null; sessionStorage.removeItem('orbitcare-session'); window.location.hash = '#/login'; toast('Session ended', 'warning'); });
  document.querySelector('#reset-demo').onclick = () => confirmModal('Reset demo data?', 'All local demo readings will return to the seeded facility state.', () => { resetDemoData(); window.location.reload(); });
  document.querySelector('#mobile-menu').onclick = () => document.querySelector('.sidebar').classList.toggle('open');
}

function pagePlaceholder(route, store) {
  const patientRoute = patientIdFromRoute(route);
  const copy = { temperature: ['Temperature Round', 'Capture one trusted reading for every patient today.', 'Nurse workflow'], 'doctor-rounds': ['Doctor Rounds', 'Review temperature context before each daily visit.', 'Doctor workflow'], 'ward-map': ['Ward Map', 'A live view of beds, care gaps, and patient status.', 'Shared view'], 'patient-detail': ['Patient Detail', 'Patient context and care timeline will live here.', 'Clinical record'], admissions: ['Admissions', 'Prepare incoming patients and assign the next available bed.', 'Admin workflow'], 'discharge-queue': ['Discharge Queue', 'Six patients are currently ready for approval.', 'Admin workflow'] , analytics: ['Analytics', 'Facility outcomes and the 85% success benchmark.', 'Admin workflow'] }[patientRoute ? 'patient-detail' : route] || ['No access', 'This workspace is not available for your role.', 'Permission required'];
  const noAccess = !canAccess(session.role, route);
  if (route === 'ward-map' && !noAccess) return '<div class="ward-map-view"></div>';
  if (route === 'temperature' && !noAccess) return '<div class="temperature-round-view"></div>';
  if (route === 'doctor-rounds' && !noAccess) return '<div class="doctor-rounds-view"></div>';
  if (patientRoute && !noAccess) return '<div class="patient-detail-view"></div>';
  if (route === 'discharge-queue' && !noAccess) return '<div class="discharge-queue-view"></div>';
  if (route === 'admissions' && !noAccess) return '<div class="admissions-view"></div>';
  if (route === 'analytics' && !noAccess) return '<div class="analytics-view"></div>';
  if (route === 'patient-detail' && !noAccess) return '<div class="patient-directory-view"></div>';
  return `<section class="placeholder-panel ${noAccess ? 'access-denied' : ''}"><div class="placeholder-orbit">${noAccess ? '⊘' : metaIcon(route)}</div><div><p class="eyebrow">${copy[2]}</p><h2>${noAccess ? 'No access here' : copy[0]}</h2><p>${noAccess ? 'Your role does not include this route. Choose an item from the sidebar to continue.' : copy[1]}</p>${noAccess ? '<a class="button button-primary" href="#/ward-map">Return to Ward Map</a>' : `<div class="placeholder-line"><span></span><span></span><span></span></div>`}</div></section>`;
}
function metaIcon(route) { return routeMeta[route]?.icon || '◎'; }

function render(route = currentRoute()) { if (!session || route === 'login') return loginView(); if (route.startsWith('patient/') && session.role === 'nurse') { navigate('ward-map'); toast('Nurses can view the Ward Map, but not patient records.', 'warning'); return; } shellView(route); }
startRouter(render);
window.orbitcare = { toast, confirmModal, promptConfirm, resetDemoData, getStore };