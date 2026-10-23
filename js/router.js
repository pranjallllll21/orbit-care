const permissions = {
  nurse: ['temperature', 'ward-map'],
  doctor: ['doctor-rounds', 'ward-map', 'patient-detail'],
  admin: ['ward-map', 'admissions', 'discharge-queue', 'analytics']
};

export const routeMeta = {
  temperature: { label: 'Temperature Round', icon: '◉' }, 'doctor-rounds': { label: 'Doctor Rounds', icon: '✦' }, 'ward-map': { label: 'Ward Map', icon: '⌘' },
  'patient-detail': { label: 'Patient Detail', icon: '○' }, admissions: { label: 'Admissions', icon: '+' }, 'discharge-queue': { label: 'Discharge Queue', icon: '↗' }, analytics: { label: 'Analytics', icon: '▥' }
};

export function canAccess(role, route) { return permissions[role]?.includes(route) || (route.startsWith('patient/') && ['doctor', 'admin'].includes(role)); }
export function routesForRole(role) { return permissions[role] || []; }
export function currentRoute() { return window.location.hash.replace(/^#\/?/, '') || 'login'; }
export function patientIdFromRoute(route = currentRoute()) { return route.startsWith('patient/') ? route.split('/')[1] : null; }
export function navigate(route) { window.location.hash = `#/${route}`; }
export function startRouter(onRouteChange) {
  window.addEventListener('hashchange', () => onRouteChange(currentRoute()));
  onRouteChange(currentRoute());
}