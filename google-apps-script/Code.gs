/* Newsletter intake only. Never deploy subscriber-reading functions. */
const NEWSLETTER = Object.freeze({
  origin: 'https://www.bramblemanagement.com',
  consentVersion: '2026-09-v1',
  headers: ['email', 'subscribed_at', 'source', 'consent_version', 'status', 'unsubscribed_at', 'bounce_type']
});

// Run only in the bound editor. Trailing underscore prevents public RPC access.
function setupNewsletter_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (!book) throw new Error('Run setup from the spreadsheet-bound editor.');
  const sheet = book.getSheetByName('Subscribers');
  if (!sheet) throw new Error('Create the Subscribers worksheet first.');
  const headers = sheet.getRange(1, 1, 1, 7).getValues()[0];
  if (headers.join('|') !== NEWSLETTER.headers.join('|')) throw new Error('Check the header names before setup.');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', book.getId());
  sheet.setFrozenRows(1);
  sheet.getRange('A:A').setNumberFormat('@');
  sheet.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('F:F').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  sheet.getRange('A1:G1').setFontWeight('bold').setBackground('#171512').setFontColor('#ffffff');
  sheet.setColumnWidth(1, 280);
  sheet.setColumnWidths(2, 6, 165);
  SpreadsheetApp.flush();
}

function doGet() {
  return ContentService.createTextOutput('Newsletter signup service is running.');
}

function doPost(event) {
  const params = event && event.parameter || {};
  // Restrict the echoed value before embedding it in any HTML/JavaScript.
  const requestId = /^[a-f0-9]{64}$/.test(params.request_id || '') ? params.request_id : '';
  let status = 'invalid';
  try {
    if (requestId && event.postData && event.postData.length <= 4096) {
      status = subscribe_(params);
    }
  } catch (_) {
    console.error('Newsletter submission failed. Check configuration and service quotas.');
    status = 'error';
  }
  return reply_(status, requestId);
}

function subscribe_(params) {
  const now = Date.now();
  const email = String(params.email || '').trim().toLowerCase();
  const started = Number(params.started_at);
  if (params.consent !== 'yes' || params.consent_version !== NEWSLETTER.consentVersion || !validEmail_(email)) return 'invalid';
  // Timing and honeypots deter simple bots; they are not authentication.
  if (params.company || !Number.isFinite(started) || now - started < 2500 || now - started > 86400000) return 'rejected';
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return 'busy';
  try {
    const properties = PropertiesService.getScriptProperties();
    const bookId = properties.getProperty('SPREADSHEET_ID');
    if (!bookId) throw new Error('Configuration missing.');
    // Global admission limits are deliberate: Apps Script does not expose client IPs.
    const day = new Date(now).toISOString().slice(0, 10);
    const minute = String(Math.floor(now / 60000));
    const quota = JSON.parse(properties.getProperty('INTAKE_QUOTA') || '{}');
    const daily = quota.day === day ? Number(quota.daily) || 0 : 0;
    const recent = quota.minute === minute ? Number(quota.recent) || 0 : 0;
    if (daily >= 500 || recent >= 30) return 'busy';
    properties.setProperty('INTAKE_QUOTA', JSON.stringify({day: day, daily: daily + 1, minute: minute, recent: recent + 1}));
    const sheet = SpreadsheetApp.openById(bookId).getSheetByName('Subscribers');
    if (!sheet || sheet.getRange(1, 1, 1, 7).getValues()[0].join('|') !== NEWSLETTER.headers.join('|')) throw new Error('Worksheet unavailable.');
    const last = sheet.getLastRow();
    if (last > 1) {
      const match = sheet.getRange(2, 1, last - 1, 1).createTextFinder(email).matchEntireCell(true).matchCase(false).useRegularExpression(false).findNext();
      if (match) {
        // Never undo an unsubscribe, bounce or other suppression via a public form.
        return sheet.getRange(match.getRow(), 5).getValue() === 'active' ? 'duplicate' : 'unavailable';
      }
    }
    const next = last + 1;
    if (next > sheet.getMaxRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 100);
    sheet.getRange(next, 1).setNumberFormat('@');
    sheet.getRange(next, 1, 1, 7).setValues([[email, new Date(now), 'website', NEWSLETTER.consentVersion, 'active', '', '']]);
    SpreadsheetApp.flush();
    return 'success';
  } finally {
    lock.releaseLock();
  }
}

function validEmail_(email) {
  // Conservative ASCII intake. Reject formula-leading characters even in valid local parts.
  if (!email || email.length > 254 || /^[=+\-@]/.test(email) || /[\s\x00-\x1f\x7f]/.test(email)) return false;
  const parts = email.split('@');
  if (parts.length !== 2 || parts[0].length > 64 || !/^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+$/.test(parts[0])) return false;
  if (parts[0].startsWith('.') || parts[0].endsWith('.') || parts[0].includes('..')) return false;
  const labels = parts[1].split('.');
  return labels.length >= 2 && labels.every(function(label) {
    return label.length <= 63 && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label);
  }) && /^[a-z]{2,63}$/.test(labels[labels.length - 1]);
}

function reply_(status, requestId) {
  const payload = JSON.stringify({type: 'bramble-newsletter', status: status, requestId: requestId});
  // HtmlService nests its own sandbox frame. top reaches the website through both frames.
  // Only minimal status + a random request ID leave this response; never email addresses.
  return HtmlService.createHtmlOutput('<!doctype html><html><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"></head><body><script>window.top.postMessage(' + payload + ', ' + JSON.stringify(NEWSLETTER.origin) + ');</script></body></html>')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
