const FEVER_THRESHOLD = 38.0;
const VALID_TEMP_RANGE = { min: 34.0, max: 42.0 };

const dateKey = (date = new Date()) => new Date(date).toISOString().slice(0, 10);

export function isValidTemperature(tempC) {
  return Number.isFinite(Number(tempC)) && Number(tempC) >= VALID_TEMP_RANGE.min && Number(tempC) <= VALID_TEMP_RANGE.max;
}

export function validateTemperature(tempC) {
  if (tempC === '' || tempC === null || tempC === undefined || !Number.isFinite(Number(tempC))) {
    return { valid: false, error: 'Enter a temperature in degrees Celsius' };
  }
  if (!isValidTemperature(tempC)) {
    return { valid: false, error: 'Value looks implausible. Check the thermometer and re-enter.' };
  }
  return { valid: true, value: Number(tempC) };
}

export function isFever(tempC) {
  return Number(tempC) >= FEVER_THRESHOLD;
}

export function hasTempToday(patient, today = new Date()) {
  return patient.readings.some((reading) => reading.date === dateKey(today));
}

export function hasDoctorVisitToday(patient, today = new Date()) {
  return patient.doctorVisits.some((visit) => visit.date === dateKey(today));
}

export function canStartDoctorVisit(patient, today = new Date()) {
  return hasTempToday(patient, today) && !hasDoctorVisitToday(patient, today) && patient.status === 'admitted';
}

export function feverFreeDates(patient, today = new Date()) {
  const dates = [];
  const cursor = new Date(today);
  while (dates.length < 3) {
    const day = dateKey(cursor);
    const readings = patient.readings.filter((reading) => reading.date === day);
    if (!readings.length || readings.some((reading) => isFever(reading.tempC))) break;
    dates.unshift({ date: day, tempC: Math.max(...readings.map((reading) => Number(reading.tempC))) });
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

export function dischargeRecommendationReason(patient, today = new Date()) {
  if (patient.readings.some((reading) => reading.date === dateKey(today) && isFever(reading.tempC))) return 'Fever recorded today';
  if (feverFreeDays(patient, today) < 3) return `${3 - feverFreeDays(patient, today)} more fever-free day needed`;
  if (!hasDoctorVisitToday(patient, today)) return 'Visit the patient today first';
  return '';
}

export function feverFreeDays(patient, today = new Date()) {
  const readingsByDate = new Map();
  patient.readings.forEach((reading) => {
    const existing = readingsByDate.get(reading.date) || [];
    existing.push(reading);
    readingsByDate.set(reading.date, existing);
  });

  let streak = 0;
  const cursor = new Date(today);
  while (true) {
    const day = dateKey(cursor);
    const readings = readingsByDate.get(day);
    if (!readings || readings.length === 0 || readings.some((reading) => isFever(reading.tempC))) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function isDischargeEligible(patient, today = new Date()) {
  return feverFreeDays(patient, today) >= 3;
}

export function mortalityRate(patients) {
  const closedCases = patients.filter((patient) => patient.status === 'deceased' || (patient.status === 'discharged' && patient.outcome === 'cured'));
  const deceased = closedCases.filter((patient) => patient.status === 'deceased').length;
  const rate = closedCases.length ? deceased / closedCases.length : 0;
  return { rate, percentage: Math.round(rate * 100), aboveBenchmark: rate > 0.15, deceased, recovered: closedCases.length - deceased };
}

export function bedsOccupied(patients) {
  return patients.filter((patient) => patient.status === 'admitted').length;
}

export function bedsFree(patients, capacity = 74) {
  return Math.max(0, capacity - bedsOccupied(patients));
}

export { FEVER_THRESHOLD, VALID_TEMP_RANGE, dateKey };