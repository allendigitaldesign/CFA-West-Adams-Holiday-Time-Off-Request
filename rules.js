/*
 * Holiday time-off rules. This one file is shared by the web page (index.html)
 * and the Google Apps Script backend (paste it into Apps Script as Rules.gs),
 * so the dates and rules only ever need to be changed here.
 *
 * To reuse next year: update the dates below, then re-paste into Apps Script
 * and deploy a new version (see README).
 */

var HOLIDAYS = [
  {
    id: 'halloween',
    name: 'Halloween',
    days: [
      { date: '2026-10-30' },
      { date: '2026-10-31' }
    ]
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving',
    days: [
      { date: '2026-11-24' },
      { date: '2026-11-25' },
      { date: '2026-11-26', closed: true },
      { date: '2026-11-27' },
      { date: '2026-11-28' }
    ]
  },
  {
    id: 'christmas',
    name: 'Christmas',
    days: [
      { date: '2026-12-23' },
      { date: '2026-12-24' },
      { date: '2026-12-25', closed: true },
      { date: '2026-12-26' }
    ]
  }
];

var POD_GROUPS = [
  { label: 'Front of House (FOH)', pods: ['FOH Day Care', 'FOH Day Production', 'FOH Night Care', 'FOH Night Production'] },
  { label: 'Back of House (BOH)', pods: ['BOH Day Production', 'BOH Day Prep', 'BOH Night Production', 'BOH Night Prep'] }
];

var MAX_DAYS = 2;

var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function allPods() {
  var pods = [];
  POD_GROUPS.forEach(function (g) { pods = pods.concat(g.pods); });
  return pods;
}

function findHoliday(id) {
  for (var i = 0; i < HOLIDAYS.length; i++) {
    if (HOLIDAYS[i].id === id) return HOLIDAYS[i];
  }
  return null;
}

function isoToUtc(iso) {
  var p = iso.split('-');
  return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

// "2026-10-30" -> "Fri 10/30"
function formatDay(iso) {
  var d = new Date(isoToUtc(iso));
  return WEEKDAYS[d.getUTCDay()] + ' ' + (d.getUTCMonth() + 1) + '/' + d.getUTCDate();
}

function cleanName(value) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
}

// Used to spot a second request from the same person.
function nameKey(first, last) {
  return (cleanName(first) + ' ' + cleanName(last)).toLowerCase();
}

// Letters, spaces, apostrophes, hyphens and periods; must start with a letter.
var NAME_PATTERN = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' .-]{0,39}$/;

/*
 * Checks one request against every rule except "one request per person",
 * which needs the sheet and is checked by the backend.
 *
 * input:    { first, last, pod, holiday, dates: ['2026-11-24', ...] }
 * todayIso: today's date as 'YYYY-MM-DD' (days before it can't be requested)
 * returns:  { ok: true, request } or { ok: false, error }
 */
function validateRequest(input, todayIso) {
  input = input || {};
  var first = cleanName(input.first);
  var last = cleanName(input.last);

  if (!first || !last) return fail('Enter your first and last name.');
  if (!NAME_PATTERN.test(first) || !NAME_PATTERN.test(last)) {
    return fail('Names can only use letters, spaces, hyphens, apostrophes and periods.');
  }

  var pod = input.pod;
  if (allPods().indexOf(pod) === -1) return fail('Choose your pod.');

  var holiday = findHoliday(input.holiday);
  if (!holiday) return fail('Choose one holiday.');

  var dates = Array.isArray(input.dates) ? input.dates.slice() : [];
  dates = dates.filter(function (d, i) { return dates.indexOf(d) === i; }).sort();

  if (dates.length === 0) return fail('Pick at least one day off.');
  if (dates.length > MAX_DAYS) return fail('You can request up to ' + MAX_DAYS + ' days off.');

  for (var i = 0; i < dates.length; i++) {
    var day = null;
    for (var j = 0; j < holiday.days.length; j++) {
      if (holiday.days[j].date === dates[i]) day = holiday.days[j];
    }
    if (!day) return fail(formatDay(dates[i]) + ' is not one of the ' + holiday.name + ' days.');
    if (day.closed) return fail('We are closed ' + formatDay(dates[i]) + ', so there is no need to request it.');
    if (todayIso && dates[i] < todayIso) return fail(formatDay(dates[i]) + ' has already passed.');
  }

  if (dates.length === 2) {
    var gapDays = (isoToUtc(dates[1]) - isoToUtc(dates[0])) / 86400000;
    if (gapDays !== 1) {
      return fail('Your 2 days must be back to back. ' + formatDay(dates[0]) + ' and ' +
        formatDay(dates[1]) + ' fall on both sides of the holiday.');
    }
  }

  return {
    ok: true,
    request: {
      first: first,
      last: last,
      pod: pod,
      holiday: holiday.id,
      holidayName: holiday.name,
      dates: dates,
      datesLabel: dates.map(formatDay).join(' + ')
    }
  };

  function fail(message) { return { ok: false, error: message }; }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    HOLIDAYS: HOLIDAYS, POD_GROUPS: POD_GROUPS, MAX_DAYS: MAX_DAYS,
    allPods: allPods, findHoliday: findHoliday, formatDay: formatDay,
    nameKey: nameKey, validateRequest: validateRequest, isoToUtc: isoToUtc
  };
}
