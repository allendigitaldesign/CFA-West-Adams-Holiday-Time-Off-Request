/*
 * Backend for the holiday time-off page. Lives inside the Google Sheet
 * (Extensions > Apps Script) next to Rules.gs, which is a copy of rules.js.
 * It can also be a standalone project at script.google.com: then set SHEET_ID
 * to the ID in the Sheet's address (docs.google.com/spreadsheets/d/<ID>/edit).
 *
 * Every request becomes one row on the "Requests" tab. Leaders approve or deny
 * by changing the Status column. A person can have only one request that is
 * Pending or Approved; if theirs is Denied they may submit a new one.
 */

var SHEET_ID = '';
var SHEET_NAME = 'Requests';
var HEADERS = ['Submitted', 'First Name', 'Last Name', 'Pod', 'Holiday', 'Dates', 'Status', 'Leader Notes'];
var COL = { submitted: 1, first: 2, last: 3, pod: 4, holiday: 5, dates: 6, status: 7, notes: 8 };
var STATUSES = ['Pending', 'Approved', 'Denied'];

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'The request could not be read. Refresh the page and try again.' });
  }

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var result = validateRequest(body, today_());
    if (!result.ok) return json_(result);
    var req = result.request;

    var sheet = getSheet_();
    var existing = findOpenRequest_(sheet, req.first, req.last);
    if (existing) {
      return json_({
        ok: false,
        code: 'duplicate',
        error: 'You already have a ' + existing.status.toLowerCase() + ' request for ' + existing.holiday +
          ' (' + existing.dates + '). Each team member can request one holiday. Talk to a leader if you need to change it.'
      });
    }

    sheet.appendRow([new Date(), req.first, req.last, req.pod, req.holidayName, req.datesLabel, 'Pending', '']);
    return json_({ ok: true, request: req });
  } finally {
    lock.releaseLock();
  }
}

// ?action=status&first=Jane&last=Doe  -> that person's requests and their status
function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.action !== 'status') return json_({ ok: true, service: 'holiday-time-off' });

  if (!cleanName(p.first) || !cleanName(p.last)) {
    return json_({ ok: false, error: 'Enter your first and last name.' });
  }
  var key = nameKey(p.first, p.last);
  var requests = readRows_(getSheet_())
    .filter(function (r) { return nameKey(r.first, r.last) === key; })
    .map(function (r) {
      return { holiday: r.holiday, dates: r.dates, pod: r.pod, status: r.status, submitted: r.submitted };
    });
  return json_({ ok: true, requests: requests });
}

function findOpenRequest_(sheet, first, last) {
  var key = nameKey(first, last);
  var rows = readRows_(sheet);
  for (var i = 0; i < rows.length; i++) {
    if (nameKey(rows[i].first, rows[i].last) === key && rows[i].status.toLowerCase() !== 'denied') {
      return rows[i];
    }
  }
  return null;
}

function readRows_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var tz = Session.getScriptTimeZone();
  return sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues().map(function (v) {
    return {
      submitted: v[COL.submitted - 1] instanceof Date
        ? Utilities.formatDate(v[COL.submitted - 1], tz, 'M/d/yyyy') : String(v[COL.submitted - 1]),
      first: String(v[COL.first - 1]),
      last: String(v[COL.last - 1]),
      pod: String(v[COL.pod - 1]),
      holiday: String(v[COL.holiday - 1]),
      dates: String(v[COL.dates - 1]),
      status: String(v[COL.status - 1] || 'Pending')
    };
  });
}

// Creates and formats the Requests tab the first time it's needed.
function getSheet_() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  sheet = ss.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.getRange('B:F').setNumberFormat('@');
  sheet.getRange(2, COL.status, sheet.getMaxRows() - 1, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build()
  );
  return sheet;
}

// Run once from the Apps Script editor to create the tab and grant permissions.
function setup() {
  getSheet_();
}

function today_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
