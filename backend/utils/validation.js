function cleanString(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isPhone(value) {
  return /^[+()\d.\-\s]{7,30}$/.test(value);
}

function validDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`))
    && new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`);
}

function timeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || '')) return -1;
  const [hours, minutes] = value.split(':').map(Number);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : -1;
}

function studioDate(now, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localDateTimeToUtc(date, time, timeZone) {
  const wallTime = Date.parse(`${date}T${time}:00.000Z`);
  if (!Number.isFinite(wallTime)) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(wallTime));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const localizedAsUtc = Date.UTC(
    Number(values.year), Number(values.month) - 1, Number(values.day),
    Number(values.hour), Number(values.minute)
  );
  const offset = localizedAsUtc - wallTime;
  const result = new Date(wallTime - offset);
  const check = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(result);
  const mapped = Object.fromEntries(check.map((part) => [part.type, part.value]));
  if (`${mapped.year}-${mapped.month}-${mapped.day}` !== date
    || `${mapped.hour}:${mapped.minute}` !== time) return null;
  return result;
}

function isValidTimeZone(value) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  cleanString, isEmail, isPhone, validDateString, dateOnly, timeToMinutes,
  studioDate, localDateTimeToUtc, isValidTimeZone,
};
