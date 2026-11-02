'use strict';
function matchingResources(resources, filter = 'All', query = '') {
  const term = query.trim().toLocaleLowerCase();
  return resources.filter(item =>
    (filter === 'All' || (filter === 'Latest Reel' ? item.is_latest_reel : Bramble.category(item.category) === filter)) &&
    (!term || [item.title, item.description, Bramble.category(item.category), item.format || ''].join(' ').toLocaleLowerCase().includes(term))
  );
}
function renderResources(resources, filter = 'All', query = '', limit = Infinity) {
  const matches = matchingResources(resources, filter, query);
  const latest = filter === 'All' && !query.trim() ? matches.find(item => item.is_latest_reel) : null;
  const remaining = matches.filter(item => !latest || item.slug !== latest.slug);
  const visible = remaining.slice(0, limit);
  const latestRoot = document.querySelector('#latest-reel');
  latestRoot.hidden = !latest;
  latestRoot.innerHTML = latest ? Bramble.card(latest, {latest:true}) : '';
  document.querySelector('#resource-grid').innerHTML = visible.length ? visible.map(item => Bramble.card(item)).join('') : latest ? '' : '<p class="empty-state">No matches just yet. Try another search or category.</p>';
  document.querySelector('#filter-status').textContent = `${filter}: ${matches.length} ${matches.length === 1 ? 'resource' : 'resources'}.${query.trim() ? ` Matching “${query.trim()}”.` : ''}`;
  const more = document.querySelector('#load-more');
  if (more) more.hidden = visible.length >= remaining.length;
  const count = document.querySelector('#resource-count');
  if (count) count.textContent = matches.length ? `Showing ${visible.length + (latest ? 1 : 0)} of ${matches.length} free resources` : '';
  // Keep the shared guide/admin renderer, while choosing appropriate homepage image sizes.
  document.querySelectorAll?.('.home .resource-thumb img').forEach(img => img.setAttribute('sizes', '(max-width: 359px) 82px, (max-width: 699px) 100px, (max-width: 1049px) 110px, 368px'));
}
async function initHome() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  const menu = document.querySelector('.mobile-menu');
  document.addEventListener('click', event => {
    if (menu?.open && (!menu.contains(event.target) || event.target.closest('a'))) menu.open = false;
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.open) { menu.open = false; menu.querySelector('summary').focus(); }
  });
  try {
    const resources = await Bramble.load();
    let activeFilter = 'All', query = '', limit = 6;
    const filters = ['All', ...(resources.some(r => r.is_latest_reel) ? ['Latest Reel'] : []), ...new Set(resources.map(r => Bramble.category(r.category)))];
    const target = document.querySelector('#resource-filters');
    const search = document.querySelector('#resource-search');
    const more = document.querySelector('#load-more');
    const refresh = () => renderResources(resources, activeFilter, query, limit);
    target.innerHTML = filters.map((name, i) => `<button class="filter-button${i === 0 ? ' active' : ''}" type="button" aria-pressed="${i === 0}" data-filter="${Bramble.escape(name)}">${name === 'All' ? 'All resources' : Bramble.escape(name)}</button>`).join('');
    target.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]'); if (!button) return;
      activeFilter = button.dataset.filter; limit = 6;
      target.querySelectorAll('button').forEach(b => { b.classList.toggle('active', b === button); b.setAttribute('aria-pressed', String(b === button)); });
      refresh();
    });
    search?.addEventListener('input', () => { query = search.value; limit = 6; refresh(); });
    more?.addEventListener('click', () => {
      const previousCount = document.querySelectorAll('#resource-grid .resource-card').length;
      limit += 6; refresh();
      document.querySelectorAll('#resource-grid .resource-card')[previousCount]?.focus({preventScroll:true});
    });
    refresh();
  } catch {
    document.querySelector('#resource-grid').innerHTML = '<p class="empty-state">Resources couldn’t load. Please refresh to try again.</p>';
  }
}
document.addEventListener('DOMContentLoaded', initHome);
