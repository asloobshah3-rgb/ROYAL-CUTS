const test = require('node:test');
const assert = require('node:assert/strict');
const { slotKeys, availableTimes } = require('../utils/schedule');
const Appointment = require('../models/Appointment');
const {
  cleanString, isEmail, isPhone, validDateString, timeToMinutes, localDateTimeToUtc, isValidTimeZone,
} = require('../utils/validation');

const setting = { openTime: '09:00', closeTime: '11:00', slotIntervalMinutes: 30 };

test('available times fit the service inside opening hours', () => {
  assert.deepEqual(availableTimes('2030-01-02', 45, setting, new Set()), ['09:00', '09:30', '10:00']);
});

test('occupied intervals prevent overlapping booking starts', () => {
  const occupied = new Set(slotKeys('2030-01-02', 540, 45, 30));
  assert.deepEqual(availableTimes('2030-01-02', 45, setting, occupied), ['10:00']);
});

test('slot keys represent all intervals touched by an appointment', () => {
  assert.deepEqual(slotKeys('2030-01-02', 570, 45, 30), ['2030-01-02T09:30', '2030-01-02T10:00']);
});

test('request validation trims bounded strings and rejects malformed dates and times', () => {
  assert.equal(cleanString('  hello\u0000  ', 10), 'hello');
  assert.equal(isEmail('guest@example.com'), true);
  assert.equal(isEmail('not-an-email'), false);
  assert.equal(isPhone('+1 (202) 555-0114'), true);
  assert.equal(isPhone('letters only'), false);
  assert.equal(validDateString('2030-01-02'), true);
  assert.equal(validDateString('2030-02-31'), false);
  assert.equal(timeToMinutes('09:30'), 570);
  assert.equal(timeToMinutes('27:90'), -1);
});

test('studio wall-clock appointments convert to UTC and reject daylight-saving gaps', () => {
  assert.equal(localDateTimeToUtc('2030-01-02', '09:00', 'America/New_York').toISOString(), '2030-01-02T14:00:00.000Z');
  assert.equal(localDateTimeToUtc('2030-03-10', '02:30', 'America/New_York'), null);
  assert.equal(isValidTimeZone('Europe/London'), true);
  assert.equal(isValidTimeZone('not-a-time-zone'), false);
});

test('active booking slot keys are uniquely constrained while released slots can be reused', () => {
  const reservationIndex = Appointment.schema.indexes().find(([fields]) => fields.slotKeys);
  assert.ok(reservationIndex);
  assert.equal(reservationIndex[1].unique, true);
  assert.deepEqual(reservationIndex[1].partialFilterExpression, { slotReserved: true });
});
