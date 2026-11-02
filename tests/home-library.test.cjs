const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Bramble = require('../resource-core.js');

const code = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const resource = (slug, overrides = {}) => ({
  slug, title: `Useful idea ${slug}`, category: 'Creator Tools',
  description: 'Make something useful.', body: 'Private searchable-body sentinel.',
  format: 'Prompt pack', published: true, ...overrides
});

function harness(resources) {
  const documentListeners = {};
  let focused = null;
  function node() {
    return {
      hidden: false, innerHTML: '', textContent: '', value: '', attributes: {}, listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; },
      setAttribute(name, value) { this.attributes[name] = value; },
      focus(options) { focused = {node: this, options}; }
    };
  }
  const nodes = Object.fromEntries([
    '#year', '#latest-reel', '#resource-grid', '#filter-status', '#resource-filters',
    '#resource-search', '#load-more', '#resource-count'
  ].map(selector => [selector, node()]));
  let cards = [], buttons = [], gridHTML = '', filterHTML = '';
  Object.defineProperty(nodes['#resource-grid'], 'innerHTML', {
    get: () => gridHTML,
    set(value) {
      gridHTML = value;
      cards = [...value.matchAll(/data-slug="([^"]*)"/g)].map(([, slug]) => Object.assign(node(), {dataset: {slug}}));
    }
  });
  Object.defineProperty(nodes['#resource-filters'], 'innerHTML', {
    get: () => filterHTML,
    set(value) {
      filterHTML = value;
      buttons = [...value.matchAll(/data-filter="([^"]*)"/g)].map(([, filter]) => {
        const button = Object.assign(node(), {dataset: {filter}});
        button.classList = {toggle() {}};
        button.closest = selector => selector === '[data-filter]' ? button : null;
        return button;
      });
    }
  });
  nodes['#resource-filters'].querySelectorAll = () => buttons;
  const document = {
    addEventListener(type, listener) { documentListeners[type] = listener; },
    querySelector: selector => nodes[selector] || null,
    querySelectorAll: selector => selector === '#resource-grid .resource-card' ? cards : []
  };
  const context = vm.createContext({document, Bramble: {...Bramble, load: async () => resources}});
  vm.runInContext(code, context);
  return {
    nodes, context,
    start: () => documentListeners.DOMContentLoaded(),
    gridSlugs: () => cards.map(card => card.dataset.slug),
    focused: () => focused,
    search(value) {
      nodes['#resource-search'].value = value;
      nodes['#resource-search'].listeners.input();
    },
    filter(value) {
      const button = buttons.find(item => item.dataset.filter === value);
      assert.ok(button, `Expected a ${value} filter`);
      nodes['#resource-filters'].listeners.click({target: button});
      return button;
    },
    more() { nodes['#load-more'].listeners.click(); }
  };
}

test('homepage search combines category filtering with trimmed, case-insensitive queries', async () => {
  const h = harness([
    resource('planner', {title: 'Plan your week', category: 'Study Smarter'}),
    resource('video', {title: 'Plan a video', category: 'Creator Tools'}),
    resource('travel', {title: 'A new destination', description: 'Plan your next trip.', category: 'Travel Smarter'})
  ]);
  await h.start();
  h.search('  PLAN  ');
  assert.deepEqual(h.gridSlugs(), ['planner', 'video', 'travel']);
  const selected = h.filter('Study');
  assert.deepEqual(h.gridSlugs(), ['planner']);
  assert.equal(selected.attributes['aria-pressed'], 'true');
  assert.match(h.nodes['#filter-status'].textContent, /Study: 1 resource\. Matching “PLAN”\./);
  h.search('video');
  assert.deepEqual(h.gridSlugs(), []);
  assert.match(h.nodes['#resource-grid'].innerHTML, /No matches/);
  assert.equal(h.nodes['#load-more'].hidden, true);
  assert.equal(h.nodes['#resource-count'].textContent, '');
  h.filter('All');
  assert.deepEqual(h.gridSlugs(), ['video']);
});

test('homepage search finds resource metadata without matching hidden guide body text', async () => {
  const h = harness([
    resource('one', {title: 'Better ideas', description: 'Make a film.', category: 'Free Prompt Pack', format: 'Download'}),
    resource('two', {title: 'Weekly planner', category: 'Study'})
  ]);
  await h.start();
  for (const term of ['better', 'film', 'creator tools', 'download']) {
    h.search(term);
    assert.deepEqual(h.gridSlugs(), ['one'], `Expected a metadata match for ${term}`);
  }
  h.search('searchable-body sentinel');
  assert.deepEqual(h.gridSlugs(), []);
  h.search('   ');
  assert.deepEqual(h.gridSlugs(), ['one', 'two']);
});

test('load more keeps resource order, avoids duplicates and focuses the first new result', async () => {
  const resources = Array.from({length: 14}, (_, i) => resource(`idea-${i + 1}`));
  const h = harness(resources);
  await h.start();
  assert.deepEqual(h.gridSlugs(), resources.slice(0, 6).map(item => item.slug));
  assert.equal(h.nodes['#resource-count'].textContent, 'Showing 6 of 14 free resources');
  assert.equal(h.nodes['#load-more'].hidden, false);
  h.more();
  assert.deepEqual(h.gridSlugs(), resources.slice(0, 12).map(item => item.slug));
  assert.equal(h.focused().node.dataset.slug, 'idea-7');
  assert.equal(h.nodes['#load-more'].hidden, false);
  h.more();
  assert.deepEqual(h.gridSlugs(), resources.map(item => item.slug));
  assert.equal(new Set(h.gridSlugs()).size, resources.length);
  assert.equal(h.focused().node.dataset.slug, 'idea-13');
  assert.equal(h.nodes['#load-more'].hidden, true);
  assert.equal(h.nodes['#resource-count'].textContent, 'Showing 14 of 14 free resources');
});

test('changing search or category resets pagination while keeping the other selection', async () => {
  const resources = Array.from({length: 16}, (_, i) => resource(`idea-${i + 1}`, {
    title: `Plan ${i + 1}`, category: i < 8 ? 'Study' : 'Travel'
  }));
  const h = harness(resources);
  await h.start();
  h.more();
  assert.equal(h.gridSlugs().length, 12);
  h.search('plan');
  assert.equal(h.gridSlugs().length, 6);
  h.more();
  assert.equal(h.gridSlugs().length, 12);
  h.filter('Travel');
  assert.deepEqual(h.gridSlugs(), resources.slice(8, 14).map(item => item.slug));
  assert.equal(h.nodes['#resource-count'].textContent, 'Showing 6 of 8 free resources');
  h.more();
  assert.deepEqual(h.gridSlugs(), resources.slice(8).map(item => item.slug));
  h.search('plan 16');
  assert.deepEqual(h.gridSlugs(), ['idea-16']);
  assert.match(h.nodes['#filter-status'].textContent, /^Travel: 1 resource/);
});

test('Latest Reel appears once across the featured area, search, category and pagination', async () => {
  const latest = resource('latest', {title: 'Latest video', is_latest_reel: true});
  const resources = [latest, ...Array.from({length: 7}, (_, i) => resource(`idea-${i + 1}`))];
  const h = harness(resources);
  await h.start();
  assert.equal(h.nodes['#latest-reel'].hidden, false);
  assert.match(h.nodes['#latest-reel'].innerHTML, /data-slug="latest"/);
  assert.ok(!h.gridSlugs().includes('latest'));
  assert.equal(h.nodes['#resource-count'].textContent, 'Showing 7 of 8 free resources');
  h.more();
  assert.equal(h.gridSlugs().length, 7);
  assert.ok(!h.gridSlugs().includes('latest'));
  assert.equal(h.nodes['#load-more'].hidden, true);
  h.search('latest');
  assert.equal(h.nodes['#latest-reel'].hidden, true);
  assert.equal(h.nodes['#latest-reel'].innerHTML, '');
  assert.deepEqual(h.gridSlugs(), ['latest']);
  h.search('');
  h.filter('Creator Tools');
  assert.equal(h.nodes['#latest-reel'].hidden, true);
  assert.equal(h.gridSlugs().filter(slug => slug === 'latest').length, 1);
  h.filter('Latest Reel');
  assert.deepEqual(h.gridSlugs(), ['latest']);
  assert.equal(h.nodes['#load-more'].hidden, true);
  h.search('not a matching resource');
  assert.deepEqual(h.gridSlugs(), []);
  assert.equal(h.nodes['#latest-reel'].hidden, true);
});
