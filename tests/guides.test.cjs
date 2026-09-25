const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const code = fs.readFileSync(path.join(root, 'guides/guide.js'), 'utf8');

function harness(overrides = {}) {
  const context = vm.createContext({document: {addEventListener() {}}, ...overrides});
  vm.runInContext(code, context);
  return context;
}

test('prompt blocks preserve literal content and cannot inject markup', () => {
  const context = harness();
  const html = context.renderBody('## A "topic"\n\n```prompt\nCompare x < y & y > z.\n\n**Keep this literal.**\n<script>alert(1)</script>\n```\n\n## Next\n- **A point**');
  assert.ok(html.includes('aria-label="Copy prompt: A &quot;topic&quot;"'));
  assert.ok(html.includes('Compare x &lt; y &amp; y &gt; z.\n\n**Keep this literal.**'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('id="section-2"'));
  assert.ok(html.includes('<ul><li><strong>A point</strong></li></ul>'));
  assert.ok(context.renderBody('```prompt\nUnclosed prompt').includes('Unclosed prompt</pre>'));
});

test('copy writes the complete prompt and acknowledges only clipboard success', async () => {
  let copied;
  let resolveCopy;
  const status = {textContent: ''};
  const prompt = {textContent: 'First paragraph.\n\n[Customize this] < x & y'};
  const button = {closest: () => ({querySelector: selector => selector === '.prompt-text' ? prompt : status})};
  const context = harness({navigator: {clipboard: {writeText: text => {
    copied = text;
    return new Promise(resolve => { resolveCopy = resolve; });
  }}}});
  const pending = context.copyPrompt(button);
  assert.equal(status.textContent, '');
  assert.equal(copied, prompt.textContent);
  resolveCopy();
  await pending;
  assert.match(status.textContent, /^Prompt copied/);
});

test('clipboard denial selects the prompt and provides honest manual-copy feedback', async () => {
  let selected;
  let focused = false;
  const status = {textContent: ''};
  const prompt = {textContent: 'Study prompt', focus: () => { focused = true; }};
  const button = {closest: () => ({querySelector: selector => selector === '.prompt-text' ? prompt : status})};
  const context = harness({
    navigator: {clipboard: {writeText: async () => { throw Error('Denied'); }}},
    document: {addEventListener() {}, createRange: () => ({selectNodeContents: node => { selected = node; }})},
    window: {getSelection: () => ({removeAllRanges() {}, addRange() {}})}
  });
  await context.copyPrompt(button);
  assert.equal(selected, prompt);
  assert.ok(focused);
  assert.match(status.textContent, /^Copy unavailable/);
  assert.ok(!status.textContent.includes('Prompt copied'));
});

test('the complete downloadable study guide matches the published resource body', () => {
  const resources = JSON.parse(fs.readFileSync(path.join(root, 'data/resources.json'), 'utf8'));
  const study = resources.find(item => item.slug === 'chatgpt-study-prompts');
  assert.equal(study.body, fs.readFileSync(path.join(root, study.download_url), 'utf8').trim());
  const html = harness().renderBody(study.body);
  assert.equal((html.match(/class="copy-prompt"/g) || []).length, 10);
  assert.equal(new Set([...html.matchAll(/id="([^"]+)"/g)].map(match => match[1])).size, 22);
});
