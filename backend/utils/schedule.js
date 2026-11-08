const { timeToMinutes } = require('./validation');

function slotKeys(date, startMinutes, duration, interval) {
  const keys = [];
  const first = Math.floor(startMinutes / interval) * interval;
  const end = startMinutes + duration;
  for (let minute = first; minute < end; minute += interval) {
    keys.push(`${date}T${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`);
  }
  return keys;
}

function availableTimes(date, serviceDuration, setting, occupiedKeys) {
  const open = timeToMinutes(setting.openTime);
  const close = timeToMinutes(setting.closeTime);
  const interval = setting.slotIntervalMinutes;
  const slots = [];
  if (open < 0 || close <= open || !Number.isInteger(interval) || interval < 1) return slots;

  for (let start = open; start + serviceDuration <= close; start += interval) {
    const time = `${String(Math.floor(start / 60)).padStart(2, '0')}:${String(start % 60).padStart(2, '0')}`;
    const keys = slotKeys(date, start, serviceDuration, interval);
    if (!keys.some((key) => occupiedKeys.has(key))) slots.push(time);
  }
  return slots;
}

module.exports = { slotKeys, availableTimes };
