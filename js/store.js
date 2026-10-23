import { dateKey, hasDoctorVisitToday, hasTempToday, isDischargeEligible, isFever, validateTemperature } from './rules.js';

const STORAGE_KEY = 'orbitcare-demo-v1';
export const DATA_VERSION = 3;
const today = dateKey();
const yesterday = dateKey(new Date(Date.now() - 86400000));
const activeNames = ['Aarav Mehta', 'Ananya Sharma', 'Arjun Nair', 'Diya Iyer', 'Kabir Singh', 'Meera Patel', 'Rohan Das', 'Ishita Rao', 'Vikram Joshi', 'Sana Khan', 'Aditya Verma', 'Nisha Menon', 'Kunal Shah', 'Pooja Desai', 'Reyansh Gupta', 'Tara Kapoor', 'Dev Malhotra', 'Mira Kulkarni', 'Neil Bhatia', 'Aisha Reddy', 'Riya Chawla', 'Karan Sethi', 'Zoya Mirza', 'Manav Pillai', 'Ira Fernandes', 'Dhruv Sood', 'Sara Thomas', 'Yash Oberoi', 'Avni Kapoor', 'Bharat Vyas', 'Charu Bansal', 'Dinesh Yadav', 'Esha Mukherjee', 'Farhan Qureshi', 'Gauri Dutta', 'Harsh Vora', 'Jhanvi Suri', 'Krish Tandon', 'Lavanya Shetty', 'Madhav Rao', 'Navya Bedi', 'Om Prakash', 'Pari Saxena', 'Qasim Ali', 'Radhika Bose', 'Sahil Anand', 'Tanvi Kaur', 'Uday Hegde', 'Vanshika Jain', 'Varun Bedi', 'Wamiqa Noor', 'Xavier Dsouza', 'Yamini Ghosh', 'Zubin Contractor', 'Aditi Saran', 'Bhavesh Naik', 'Chitra Nanda', 'Eshan Borkar', 'Falguni Roy', 'Gautam Arora', 'Hina Sethi', 'Imran Sheikh', 'Jaya Nambiar', 'Keshav Batra', 'Leena Paul', 'Mohit Wadhwa', 'Nandita Sen', 'Pranav Walia', 'Rashmi Tripathi', 'Samarjeet Gill', 'Trisha Bhat', 'Vivek Nanda', 'Zara Merchant', 'Zeenat Merchant'];
const closedNames = ['Abhay Khanna', 'Bela Sinha', 'Chetan Puri', 'Deepa Salvi', 'Eklavya Rane', 'Firoz Memon', 'Geetika Lal', 'Hemant Ahuja', 'Indu Batra', 'Jatin Kohli', 'Kavita Arora', 'Lalit Bansal', 'Mansi Goyal', 'Naveen Rathi', 'Ojasvi Menon', 'Pankaj Suri', 'Rajiv Seth', 'Seema Bahl', 'Tushar Jain', 'Uma Iyer', 'Vikas Dhingra', 'Yogita Das', 'Zaid Khan', 'Alka Joshi', 'Brijesh Shah', 'Chetna Rao', 'Darpan Mehta', 'Ekta Nair', 'Girish Pillai', 'Heena Kapoor', 'Ishwar Rao', 'Juhi Malik', 'Kartik Desai', 'Lata Verma', 'Mukul Bose', 'Neelam Roy', 'Pritam Sen', 'Renu Bedi', 'Suresh Naik', 'Usha Sood'];

export const users = [
  { id: 'nurse-01', name: 'Nurse Kavya Rao', role: 'nurse', initials: 'KR' },
  { id: 'nurse-02', name: 'Nurse Arjun Das', role: 'nurse', initials: 'AD' },
  { id: 'doctor-01', name: 'Dr. Neha Iyer', role: 'doctor', initials: 'NI' },
  { id: 'doctor-02', name: 'Dr. Vikram Shah', role: 'doctor', initials: 'VS' },
  { id: 'admin-01', name: 'Aditi Menon', role: 'admin', initials: 'AM' }
];

function pastDate(daysAgo) { return dateKey(new Date(Date.now() - daysAgo * 86400000)); }
function reading(id, daysAgo, tempC, recordedBy = 'Nurse Kavya Rao') {
  return { id, date: pastDate(daysAgo), time: daysAgo === 0 ? '08:15' : '09:00', tempC, recordedBy };
}

function createPatient(index, admitted = true) {
  const name = admitted ? activeNames[index] : closedNames[index - 74];
  const phone = `98${String(10000000 + index * 137).slice(-8)}`;
  const cities = ['Mumbai', 'Pune', 'Bengaluru', 'Delhi', 'Hyderabad', 'Chennai', 'Kochi', 'Jaipur'];
  const feverIndexes = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
  const readyIndexes = new Set([8, 9, 10, 11, 12, 13]);
  const twoDayIndexes = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  const oneDayIndexes = new Set([24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35]);
  const todayIndexes = new Set(Array.from({ length: 33 }, (_, item) => item));
  const visitIndexes = new Set(Array.from({ length: 22 }, (_, item) => item));
  const readings = [];
  if (admitted && feverIndexes.has(index)) {
    readings.push(reading(`r-${index}-1`, 1, 36.7));
    if (todayIndexes.has(index)) readings.push(reading(`r-${index}-today`, 0, 38.3 + (index % 3) * 0.2));
  } else if (admitted && readyIndexes.has(index)) {
    [2, 1, 0].forEach((daysAgo) => readings.push(reading(`r-${index}-${daysAgo}`, daysAgo, 36.4 + (index % 3) * 0.1)));
  } else if (admitted && twoDayIndexes.has(index)) {
    [1, 0].forEach((daysAgo) => readings.push(reading(`r-${index}-${daysAgo}`, daysAgo, 36.5 + (index % 3) * 0.1)));
  } else if (admitted && oneDayIndexes.has(index)) {
    if (todayIndexes.has(index)) readings.push(reading(`r-${index}-today`, 0, 36.6 + (index % 3) * 0.1));
    else readings.push(reading(`r-${index}-1`, 1, 36.7));
  } else if (admitted && index % 4 === 0) {
    readings.push(reading(`r-${index}-2`, 2, 36.7));
  } else if (!admitted) {
    [3, 2, 1, 0].forEach((daysAgo) => readings.push(reading(`r-${index}-${daysAgo}`, daysAgo + 5, index % 6 === 0 && daysAgo === 0 ? 38.6 : 36.5 + (index % 3) * 0.2)));
  }
  return {
    id: `OC-${String(index + 1).padStart(3, '0')}`,
    name, age: 19 + ((index * 7) % 63), gender: index % 2 === 0 ? 'Female' : 'Male', bedNumber: admitted ? index + 1 : null,
    admittedAt: pastDate(3 + index % 5), status: admitted ? 'admitted' : (index - 74) % 6 === 0 ? 'deceased' : 'discharged', readings,
    doctorVisits: admitted && todayIndexes.has(index) && visitIndexes.has(index) ? [{ date: today, time: '10:30', doctorName: 'Dr. Neha Iyer', notes: 'Stable; continue observation.', treatment: 'Supportive care' }] : [],
    phone, emergencyContact: { name: `Family contact ${index + 1}`, phone: `97${String(10000000 + index * 173).slice(-8)}` }, address: `${cities[index % cities.length]}, India`, bloodGroup: ['A+', 'B+', 'O+', 'AB+', 'A-', 'O-'][index % 6], symptomsStarted: pastDate(2 + index % 7), allergies: index % 9 === 0 ? 'Penicillin' : '',
    dischargeApproval: null, doctorWaiting: false, outcomeDate: admitted ? null : pastDate(index % 20 + 2), outcome: admitted ? null : (index - 74) % 6 === 0 ? 'deceased' : 'cured'
  };
}

function makeSeedData() {
  const patients = Array.from({ length: 74 }, (_, index) => createPatient(index));
  const closedCases = Array.from({ length: 40 }, (_, index) => createPatient(index + 74, false));
  [8, 9, 10].forEach((index) => {
    patients[index].dischargeApproval = { recommendedBy: 'Dr. Neha Iyer', date: today, time: '10:45' };
  });
  return { version: DATA_VERSION, patients: [...patients, ...closedCases], createdAt: new Date().toISOString() };
}

export function getStore() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (parsed.version === DATA_VERSION) return parsed;
  }
  const seeded = makeSeedData();
  saveStore(seeded);
  return seeded;
}

export function saveStore(store) { store.version = DATA_VERSION; localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); window.dispatchEvent(new CustomEvent('orbitcare:store-updated')); return store; }
export function resetDemoData() { const seeded = makeSeedData(); saveStore(seeded); return seeded; }
export function recordTemperature(patientId, tempC, recordedBy) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  const validation = validateTemperature(tempC);
  if (!patient) return { ok: false, error: 'Patient record not found.' };
  if (!validation.valid) return { ok: false, error: validation.error };
  if (hasTempToday(patient)) return { ok: false, error: 'A temperature is already recorded for this patient today.' };
  patient.readings.push({ id: `r-${patientId}-${Date.now()}`, date: today, time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), tempC: validation.value, recordedBy });
  patient.doctorWaiting = false;
  const recommendationCancelled = patient.dischargeApproval && isFever(validation.value);
  if (recommendationCancelled) { patient.dischargeApproval = null; patient.recommendationCancelledAt = today; patient.recommendationCancelledReason = 'Fever recorded after recommendation'; }
  saveStore(store);
  return { ok: true, patient, reading: patient.readings.at(-1), recommendationCancelled };
}
export function requestTemperature(patientId) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient) return { ok: false, error: 'Patient record not found.' };
  patient.doctorWaiting = true;
  patient.doctorWaitingAt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
  saveStore(store);
  return { ok: true, patient };
}
export function completeDischarge(patientId) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient || patient.status !== 'admitted' || !patient.dischargeApproval) return { ok: false, error: 'Discharge recommendation is not available.' };
  if (!isDischargeEligible(patient)) { patient.dischargeApproval = null; saveStore(store); return { ok: false, error: 'Fever recorded. Discharge cancelled.' }; }
  patient.status = 'discharged';
  patient.outcome = 'cured';
  patient.outcomeDate = today;
  patient.dischargedAt = today;
  patient.bedNumber = null;
  patient.dischargeApproval = null;
  saveStore(store);
  return { ok: true, patient };
}
export function admitPatient({ name, age, gender, phone, emergencyName, emergencyPhone, address, bloodGroup, symptomsStarted, allergies, admissionTemp }) {
  const store = getStore();
  const occupiedBeds = new Set(store.patients.filter((patient) => patient.status === 'admitted').map((patient) => patient.bedNumber));
  const bedNumber = Array.from({ length: 74 }, (_, index) => index + 1).find((bed) => !occupiedBeds.has(bed));
  if (!bedNumber) return { ok: false, error: 'Facility full. Discharge a patient to free a bed.' };
  const patient = { id: `OC-${Date.now()}`, name: name.trim(), age: Number(age), gender, bedNumber, phone, emergencyContact: { name: emergencyName, phone: emergencyPhone }, address, bloodGroup, symptomsStarted, allergies: allergies || '', admittedAt: today, status: 'admitted', readings: [{ id: `r-admission-${Date.now()}`, date: today, time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), tempC: Number(admissionTemp), recordedBy: 'Admission' }], doctorVisits: [], dischargeApproval: null, doctorWaiting: false, outcomeDate: null, outcome: null };
  store.patients.push(patient);
  saveStore(store);
  return { ok: true, patient };
}
export function recordDoctorVisit(patientId, doctorName, treatment, notes) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient || patient.status !== 'admitted') return { ok: false, error: 'Patient is not currently admitted.' };
  if (!hasTempToday(patient)) return { ok: false, error: 'Temperature not recorded yet.' };
  if (hasDoctorVisitToday(patient)) return { ok: false, error: 'A doctor visit is already recorded for this patient today.' };
  if (!notes || notes.trim().length < 10) return { ok: false, error: 'Clinical notes must be at least 10 characters.' };
  const visit = { date: today, time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()), doctorName, notes: notes.trim(), treatment, addenda: [] };
  patient.doctorVisits.push(visit);
  saveStore(store);
  return { ok: true, patient, visit, fever: patient.readings.some((reading) => reading.date === today && isFever(reading.tempC)) };
}
export function addVisitAddendum(patientId, doctorName, notes) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  const visit = patient?.doctorVisits.find((item) => item.date === today);
  if (!visit) return { ok: false, error: 'No visit found for today.' };
  if (!notes || notes.trim().length < 10) return { ok: false, error: 'Addendum must be at least 10 characters.' };
  visit.addenda = visit.addenda || [];
  visit.addenda.push({ date: today, time: new Date().toISOString(), doctorName, notes: notes.trim() });
  saveStore(store);
  return { ok: true, patient };
}
export function recommendDischarge(patientId, recommendedBy) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient || !isDischargeEligible(patient) || !hasDoctorVisitToday(patient)) return { ok: false, error: 'Patient is not eligible for discharge recommendation.' };
  patient.dischargeApproval = { recommendedBy, date: today, time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()) };
  saveStore(store);
  return { ok: true, patient };
}
export function withdrawDischargeRecommendation(patientId) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient) return { ok: false, error: 'Patient record not found.' };
  patient.dischargeApproval = null;
  saveStore(store);
  return { ok: true, patient };
}
export function recordDeceasedOutcome(patientId, notes, confirmedBed) {
  const store = getStore();
  const patient = store.patients.find((item) => item.id === patientId);
  if (!patient || patient.status !== 'admitted') return { ok: false, error: 'Patient is not currently admitted.' };
  if (!notes || notes.trim().length < 1) return { ok: false, error: 'Cause or notes are required.' };
  if (String(confirmedBed) !== String(patient.bedNumber)) return { ok: false, error: 'Bed number confirmation does not match.' };
  patient.status = 'deceased'; patient.outcome = 'deceased'; patient.outcomeDate = today; patient.outcomeNotes = notes.trim(); patient.dischargeApproval = null; patient.bedNumber = null;
  saveStore(store);
  return { ok: true, patient };
}
export function findPatient(id) { return getStore().patients.find((patient) => patient.id === id); }
export function getUser(id) { return users.find((user) => user.id === id); }
export function getToday() { return today; }
export function getYesterday() { return yesterday; }