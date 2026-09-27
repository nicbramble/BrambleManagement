'use strict';
function renderResources(resources, filter = 'All') {
  const latest = resources.find(item=>item.is_latest_reel);
  const visible = resources.filter(item => (filter === 'All' || (filter === 'Latest Reel' ? item.is_latest_reel : Bramble.category(item.category) === filter)) && !(filter === 'All' && latest && item.slug === latest.slug));
  const latestRoot = document.querySelector('#latest-reel');
  latestRoot.hidden = filter !== 'All' || !latest;
  latestRoot.innerHTML = latest ? Bramble.card(latest,{latest:true}) : '';
  document.querySelector('#resource-grid').innerHTML = visible.length ? visible.map(item=>Bramble.card(item)).join('') : '<p class="empty-state">No resources in this category yet. Try another filter.</p>';
  const count = visible.length + (filter === 'All' && latest ? 1 : 0);
  document.querySelector('#filter-status').textContent = `${filter}: ${count} ${count === 1 ? 'resource' : 'resources'}.`;
}
async function initHome() {
  document.querySelector('#year').textContent = new Date().getFullYear();
  try {
    const resources = await Bramble.load();
    const filters = ['All', ...(resources.some(r=>r.is_latest_reel) ? ['Latest Reel'] : []),...new Set(resources.map(r=>Bramble.category(r.category)))];
    const target = document.querySelector('#resource-filters');
    target.innerHTML = filters.map((name,i)=>`<button class="filter-button${i===0?' active':''}" type="button" aria-pressed="${i===0}" data-filter="${Bramble.escape(name)}">${Bramble.escape(name)}</button>`).join('');
    target.addEventListener('click',event=>{
      const button = event.target.closest('[data-filter]'); if (!button) return;
      target.querySelectorAll('button').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
      renderResources(resources,button.dataset.filter);
    });
    renderResources(resources);
  } catch { document.querySelector('#resource-grid').innerHTML='<p class="empty-state">Resources couldn’t load. Please refresh to try again.</p>'; }
}
document.addEventListener('DOMContentLoaded',initHome);
