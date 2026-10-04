// Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { validateRequest, formatDay } = require('../rules.js');

const base = { first: 'Jane', last: 'Doe', pod: 'FOH Day Care' };
const TODAY = '2026-10-01';
const ok = (holiday, dates) => validateRequest({ ...base, holiday, dates }, TODAY);

test('formats dates with weekday', () => {
  assert.strictEqual(formatDay('2026-10-30'), 'Fri 10/30');
  assert.strictEqual(formatDay('2026-11-26'), 'Thu 11/26');
  assert.strictEqual(formatDay('2026-12-25'), 'Fri 12/25');
});

test('allows 1 or 2 back-to-back days', () => {
  for (const [h, d] of [
    ['halloween', ['2026-10-30']], ['halloween', ['2026-10-31', '2026-10-30']],
    ['thanksgiving', ['2026-11-24', '2026-11-25']], ['thanksgiving', ['2026-11-27', '2026-11-28']],
    ['thanksgiving', ['2026-11-25']], ['christmas', ['2026-12-23', '2026-12-24']], ['christmas', ['2026-12-26']],
  ]) assert.ok(ok(h, d).ok, `${h} ${d}`);
});

test('rejects days on both sides of a closed holiday', () => {
  assert.match(ok('thanksgiving', ['2026-11-25', '2026-11-27']).error, /back to back/);
  assert.match(ok('christmas', ['2026-12-24', '2026-12-26']).error, /back to back/);
});

test('rejects non-adjacent days, more than 2 days, and closed days', () => {
  assert.ok(!ok('thanksgiving', ['2026-11-24', '2026-11-28']).ok);
  assert.match(ok('thanksgiving', ['2026-11-24', '2026-11-25', '2026-11-27']).error, /up to 2/);
  assert.match(ok('christmas', ['2026-12-25']).error, /closed/);
});

test('rejects mixing holidays and missing fields', () => {
  assert.ok(!ok('halloween', ['2026-11-24']).ok);
  assert.ok(!ok('halloween', []).ok);
  assert.ok(!validateRequest({ ...base, pod: 'Drive Thru', holiday: 'halloween', dates: ['2026-10-30'] }, TODAY).ok);
  assert.ok(!validateRequest({ ...base, first: ' ', holiday: 'halloween', dates: ['2026-10-30'] }, TODAY).ok);
  assert.ok(!validateRequest({ ...base, first: '=HYPERLINK("x")', holiday: 'halloween', dates: ['2026-10-30'] }, TODAY).ok);
});

test('rejects days that have passed', () => {
  assert.match(validateRequest({ ...base, holiday: 'halloween', dates: ['2026-10-30'] }, '2026-10-31').error, /passed/);
});

test('cleans up names', () => {
  const r = validateRequest({ ...base, first: '  Mary  Ann ', last: "O'Neil-Smith", holiday: 'halloween', dates: ['2026-10-30'] }, TODAY);
  assert.strictEqual(r.request.first, 'Mary Ann');
  assert.strictEqual(r.request.datesLabel, 'Fri 10/30');
});
