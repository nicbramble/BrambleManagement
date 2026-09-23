const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'google-apps-script/Code.gs'), 'utf8');
const headers = ['email', 'subscribed_at', 'source', 'consent_version', 'status', 'unsubscribed_at', 'bounce_type'];

function harness({locked = false, failWrite = false, missingConfig = false} = {}) {
  const rows = [headers.slice()];
  const props = missingConfig ? {} : {SPREADSHEET_ID: 'unit-test-only'};
  let released = 0;
  const sheet = {
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    getRange(row, col, height = 1, width = 1) {
      return {
        setNumberFormat() { return this; },
        getValues: () => rows.slice(row - 1, row - 1 + height).map(r => r.slice(col - 1, col - 1 + width)),
        getValue: () => rows[row - 1]?.[col - 1],
        setValues(values) { if (failWrite) throw Error('test failure'); rows[row - 1] = Array.from(values[0]); },
        createTextFinder(email) {
          return {
            matchEntireCell() { return this; }, matchCase() { return this; }, useRegularExpression() { return this; },
            findNext() {
              const index = rows.findIndex((r, i) => i > 0 && String(r[0]).toLowerCase() === email);
              return index < 0 ? null : {getRow: () => index + 1};
            }
          };
        }
      };
    }
  };
  const ctx = vm.createContext({
    console: {error() {}},
    PropertiesService: {getScriptProperties: () => ({getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; }})},
    LockService: {getScriptLock: () => ({tryLock: () => !locked, releaseLock: () => { released++; }})},
    SpreadsheetApp: {openById: () => ({getSheetByName: () => sheet}), flush() {}},
    ContentService: {createTextOutput: text => text},
    HtmlService: {XFrameOptionsMode: {ALLOWALL: 'ALLOWALL'}, createHtmlOutput: html => ({html, setXFrameOptionsMode() { return this; }})}
  });
  vm.runInContext(code, ctx);
  function submit(overrides = {}) {
    const parameter = Object.assign({email: 'QA.Test@example.com', consent: 'yes', consent_version: '2026-09-v1', company: '', started_at: String(Date.now() - 5000), request_id: 'a'.repeat(64)}, overrides);
    const response = ctx.doPost({parameter, postData: {length: 300}});
    const payload = JSON.parse(response.html.match(/postMessage\((\{.*?\}), /)[1]);
    return {response: response.html, ...payload};
  }
  return {ctx, rows, props, submit, released: () => released};
}

test('valid signup saves normalized email and server date exactly once', () => {
  const h = harness();
  assert.equal(h.submit({email: '  QA.Test@EXAMPLE.COM  '}).status, 'success');
  assert.equal(h.rows.length, 2);
  assert.equal(h.rows[1][0], 'qa.test@example.com');
  assert.ok(Math.abs(h.rows[1][1].getTime() - Date.now()) < 2000);
  assert.deepEqual(h.rows[1].slice(2), ['website', '2026-09-v1', 'active', '', '']);
  assert.equal(h.submit().status, 'duplicate');
  assert.equal(h.rows.length, 2);
  assert.equal(h.released(), 2);
});

test('case-insensitive duplicates do not reactivate suppressed records', () => {
  for (const status of ['unsubscribed', 'bounced', 'blocked']) {
    const h = harness();
    h.rows.push(['QA.TEST@EXAMPLE.COM', new Date(), 'website', '2026-09-v1', status, '', '']);
    assert.equal(h.submit().status, 'unavailable');
    assert.equal(h.rows.length, 2);
    assert.equal(h.rows[1][4], status);
  }
});

test('malformed, excessive and formula-leading email values are rejected', () => {
  const h = harness();
  for (const email of ['', 'not-an-email', 'a@@example.com', 'a..b@example.com', '.a@example.com', 'a@-bad.com', 'a@bad-.com', 'a@local', '=cmd@example.com', '+cmd@example.com', '-cmd@example.com', 'a'.repeat(65) + '@example.com', 'a\n@example.com']) {
    assert.equal(h.submit({email}).status, 'invalid');
  }
  assert.equal(h.rows.length, 1);
});

test('consent/version, honeypot and time checks fail without writing', () => {
  const h = harness();
  assert.equal(h.submit({consent: ''}).status, 'invalid');
  assert.equal(h.submit({consent_version: 'wrong'}).status, 'invalid');
  assert.equal(h.submit({company: 'bot'}).status, 'rejected');
  assert.equal(h.submit({started_at: String(Date.now())}).status, 'rejected');
  assert.equal(h.submit({started_at: 'not-a-time'}).status, 'rejected');
  assert.equal(h.submit({started_at: String(Date.now() + 10000)}).status, 'rejected');
  assert.equal(h.rows.length, 1);
});

test('failed writes, configuration errors and lock contention never claim success', () => {
  for (const options of [{failWrite: true}, {missingConfig: true}]) {
    const h = harness(options);
    assert.equal(h.submit().status, 'error');
    assert.equal(h.rows.length, 1);
    assert.equal(h.released(), 1);
  }
  assert.equal(harness({locked: true}).submit().status, 'busy');
});

test('admission limit survives requests and rejects excess writes', () => {
  const h = harness();
  const now = Date.now();
  h.props.INTAKE_QUOTA = JSON.stringify({day: new Date(now).toISOString().slice(0, 10), daily: 500, minute: String(Math.floor(now / 60000)), recent: 0});
  assert.equal(h.submit().status, 'busy');
  assert.equal(h.rows.length, 1);
});

test('responses expose only status and request correlation, not subscriber data', () => {
  const h = harness();
  const result = h.submit();
  assert.ok(!result.response.includes('qa.test') && !result.response.includes('SPREADSHEET_ID'));
  assert.ok(result.response.includes('https://www.bramblemanagement.com'));
  assert.equal(h.ctx.doGet(), 'Newsletter signup service is running.');
  const forged = h.ctx.doPost({parameter: {request_id: '</script><script>alert(1)</script>'}, postData: {length: 100}});
  assert.ok(!forged.html.includes('alert(1)'));
});

test('resource URLs reject executable schemes, credentials and unsafe image data', () => {
  const ctx = vm.createContext({URL, window: {location: {href: 'https://www.bramblemanagement.com/guides/', origin: 'https://www.bramblemanagement.com'}}});
  vm.runInContext(fs.readFileSync(path.join(root, 'safe-url.js'), 'utf8'), ctx);
  const safe = ctx.window.brambleSafeUrl;
  assert.equal(safe('javascript:alert(1)'), '#');
  assert.equal(safe('https://user:pass@example.com'), '#');
  assert.equal(safe('http://external.example'), '#');
  assert.equal(safe('data:image/svg+xml,<svg onload="alert(1)"/>', {image: true}), '#');
  assert.equal(safe('/downloads/chatgpt-image-codes.pdf'), 'https://www.bramblemanagement.com/downloads/chatgpt-image-codes.pdf');
});

test('local HTML and resource references resolve', () => {
  for (const file of ['index.html', 'privacy.html', 'admin/index.html', 'guides/index.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      const ref = match[1].split(/[?#]/)[0];
      if (/^[a-z]+:/i.test(ref)) continue;
      const target = ref.startsWith('/') ? path.join(root, ref) : path.resolve(root, path.dirname(file), ref);
      assert.ok(fs.existsSync(target), `${file} references missing ${ref}`);
    }
  }
  for (const item of JSON.parse(fs.readFileSync(path.join(root, 'data/resources.json'), 'utf8'))) {
    for (const key of ['image_url', 'download_url']) {
      if (item[key]?.startsWith('/')) assert.ok(fs.existsSync(path.join(root, item[key])), `Missing resource ${key}`);
    }
  }
});
