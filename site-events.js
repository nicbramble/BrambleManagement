(() => {
  try {
    const params = new URLSearchParams(location.search);
    const old = JSON.parse(sessionStorage.getItem('bramble-attribution') || '{}');
    if (!old.landing_page) old.landing_page = location.pathname;
    for (const key of ['utm_source','utm_medium','utm_campaign','utm_content']) if (!old[key] && params.has(key)) old[key] = params.get(key).slice(0,200);
    if (!old.resource) old.resource = params.get('slug') || location.pathname.match(/^\/guides\/([^/]+)\//)?.[1] || '';
    sessionStorage.setItem('bramble-attribution',JSON.stringify(old));
  } catch { /* Restricted browser storage must not block access or signup. */ }
  document.addEventListener('click', event => {
    const action = event.target.closest('[data-event]');
    if (action) Bramble.track(action.dataset.event,{slug:action.dataset.slug || ''});
    const focusLink = event.target.closest('[data-focus-signup]');
    if (focusLink && document.querySelector('#newsletter-email')) {
      event.preventDefault(); history.replaceState(null,'','#newsletter');
      document.querySelector('#newsletter').scrollIntoView(); document.querySelector('#newsletter-email').focus({preventScroll:true});
    }
  });
  document.addEventListener('DOMContentLoaded',()=> {
    if (location.hash === '#newsletter') document.querySelector('#newsletter-email')?.focus({preventScroll:true});
    document.querySelectorAll('a[href="/#newsletter"]').forEach(a=>{a.href=Bramble.attributed('/#newsletter');});
  });
})();
