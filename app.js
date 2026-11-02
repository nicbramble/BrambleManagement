'use strict';
function matchingResources(resources, filter = 'All', query = '') {
  const term = query.trim().toLocaleLowerCase();
  return resources.filter(item => {
    const collection = BrambleLibrary.collectionFor(item);
    return (filter === 'All' || (filter === 'Latest Reel' ? item.is_latest_reel : collection.id === filter)) &&
      (!term || [item.title, item.description, item.category, Bramble.category(item.category), item.format || '', collection.title].join(' ').toLocaleLowerCase().includes(term));
  });
}
function renderResources(resources, filter = 'All', query = '') {
  const matches = matchingResources(resources, filter, query);
  const latest = filter === 'All' && !query.trim() ? matches.find(item => item.is_latest_reel) : null;
  const remaining = matches.filter(item => !latest || item.slug !== latest.slug);
  const latestRoot = document.querySelector('#latest-reel');
  latestRoot.hidden = !latest;
  latestRoot.innerHTML = latest ? `<h3 class="latest-heading">From the latest Reel</h3>${Bramble.card(latest,{latest:true,collection:BrambleLibrary.collectionFor(latest)})}` : '';
  const groups = BrambleLibrary.collections.map(collection => {
    const items = remaining.filter(item => BrambleLibrary.collectionFor(item).id === collection.id);
    if (!items.length) return '';
    return `<section class="guide-collection" data-collection="${collection.id}" aria-labelledby="collection-${collection.id}"><header class="collection-heading"><div><h3 id="collection-${collection.id}">${Bramble.escape(collection.title)} <span>${items.length}</span></h3><p>${Bramble.escape(collection.description)}</p></div></header><div class="collection-guides">${items.map(item => Bramble.card(item,{collection})).join('')}</div></section>`;
  }).join('');
  document.querySelector('#resource-grid').innerHTML = groups || (latest ? '' : '<p class="empty-state">No matches just yet. Try another search, or clear your filters to see every guide.</p>');
  const label = BrambleLibrary.collections.find(item => item.id === filter)?.title || filter;
  document.querySelector('#filter-status').textContent = `${label}: ${matches.length} ${matches.length === 1 ? 'resource' : 'resources'}.${query.trim() ? ` Matching “${query.trim()}”.` : ''}`;
  const clear = document.querySelector('#clear-filters');
  if (clear) clear.hidden = filter === 'All' && !query.trim();
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
    let activeFilter = 'All', query = '';
    const target = document.querySelector('#resource-filters');
    const search = document.querySelector('#resource-search');
    const filters = [{id:'All',title:'All guides'}, ...BrambleLibrary.collections.filter(collection => resources.some(item => BrambleLibrary.collectionFor(item).id === collection.id))];
    if (resources.some(item => item.is_latest_reel)) filters.push({id:'Latest Reel',title:'Latest Reel'});
    target.innerHTML = filters.map(({id,title},index) => `<button class="filter-button${index === 0 ? ' active' : ''}" type="button" aria-pressed="${index === 0}" data-filter="${Bramble.escape(id)}">${Bramble.escape(title)}<span class="filter-count">${matchingResources(resources,id).length}</span></button>`).join('');
    const refresh = () => {
      target.querySelectorAll('button').forEach(button => {
        const active = button.dataset.filter === activeFilter;
        button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));
      });
      renderResources(resources,activeFilter,query);
    };
    target.addEventListener('click', event => {
      const button = event.target.closest('[data-filter]'); if (!button) return;
      activeFilter = button.dataset.filter;refresh();
    });
    search?.addEventListener('input', () => { query = search.value;refresh(); });
    document.querySelector('#clear-filters')?.addEventListener('click', () => {
      activeFilter = 'All';query = '';search.value = '';refresh();search.focus({preventScroll:true});
    });
    refresh();
  } catch {
    document.querySelector('#resource-grid').innerHTML = '<p class="empty-state">Resources couldn’t load. Please refresh to try again.</p>';
  }
}
document.addEventListener('DOMContentLoaded', initHome);
