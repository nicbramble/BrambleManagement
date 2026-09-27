/* Shared data contract, validation and card rendering. No imported code is evaluated. */
(function (global) {
  'use strict';
  const fields = {
    slug:'string', title:'string', category:'string', description:'string', body:'string',
    badge:'string', is_latest_reel:'boolean', published_at:'string', format:'string', read_time:'string',
    image_url:'string', image_alt:'string', download_url:'string', download_label:'string',
    action_url:'string', action_label:'string', cta_label:'string', cta_url:'string',
    cta_eyebrow:'string', cta_heading:'string', cta_description:'string', sources:'array',
    featured:'boolean', published:'boolean', sort_order:'number', id:'string', created_at:'string', updated_at:'string',
    toc_title:'string', toc_description:'string', prompt_toolbar:'string', prompt_copy_success:'string', sources_intro:'string'
  };
  const required = ['slug','title','category','description','body'];
  const escape = (value = '') => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const origin = () => global.location?.origin || 'https://www.bramblemanagement.com';
  const url = value => global.brambleSafeUrl ? global.brambleSafeUrl(value, {fallback:''}) : safeURL(value);
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try { const u = new URL(value, origin() + '/'); return !u.username && !u.password && (u.protocol === 'https:' || (u.protocol === 'http:' && u.origin === origin())) ? u.href : ''; } catch { return ''; }
  }
  function assetURL(value, kind) {
    const safe = safeURL(value);
    if (!safe) return '';
    const u = new URL(safe);
    const allowed = global.BRAMBLE_CONFIG?.allowedAssetOrigins || [];
    if (u.origin !== origin() && u.origin !== 'https://www.bramblemanagement.com' && !allowed.includes(u.origin)) return '';
    const ext = kind === 'image' ? /\.(png|jpe?g|webp|avif)$/i : /\.(pdf|txt|csv|json|zip)$/i;
    if (!ext.test(u.pathname)) return '';
    return u.href;
  }
  function validate(input, {draft = false} = {}) {
    const errors = [], warnings = [], item = {};
    if (!input || typeof input !== 'object' || Array.isArray(input)) return {errors:['Each resource must be a JSON object.'], warnings, item};
    for (const key of Object.keys(input)) {
      if (!Object.hasOwn(fields,key)) { warnings.push(`Unknown field “${key}” ignored.`); continue; }
      const value = input[key];
      if (value === null && !required.includes(key)) continue;
      const valid = fields[key] === 'array' ? Array.isArray(value) : typeof value === fields[key];
      if (!valid) { errors.push(`${key}: expected ${fields[key]}.`); continue; }
      item[key] = typeof value === 'string' ? value.trim() : value;
    }
    for (const key of required) if (!item[key]) errors.push(`${key}: required; provide a non-empty string.`);
    if (item.slug && (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.slug) || item.slug.length > 100)) errors.push('slug: use 1–100 lowercase letters, numbers and single hyphens.');
    for (const [key,limit] of Object.entries({title:160,category:60,description:500,body:100000,badge:60,read_time:40})) if (item[key]?.length > limit) errors.push(`${key}: maximum ${limit} characters.`);
    if (item.sort_order !== undefined && (!Number.isSafeInteger(item.sort_order) || Math.abs(item.sort_order) > 1000000)) errors.push('sort_order: use a whole number between -1000000 and 1000000.');
    for (const key of ['published_at','created_at','updated_at']) if (item[key] && Number.isNaN(Date.parse(item[key]))) errors.push(`${key}: use an ISO date such as 2026-09-28.`);
    for (const key of ['action_url','cta_url']) if (item[key] && !safeURL(item[key])) errors.push(`${key}: use a local path or HTTPS URL without credentials.`);
    for (const key of ['image_url','download_url']) if (item[key] && !assetURL(item[key], key === 'image_url' ? 'image' : 'download')) errors.push(`${key}: use an existing repository asset path with a supported extension (or an explicitly configured asset origin).`);
    if (item.sources) {
      if (item.sources.length > 30) errors.push('sources: maximum 30 references.');
      item.sources = item.sources.map((s,i) => {
        if (!s || typeof s.label !== 'string' || !s.label.trim() || !safeURL(s.url)) { errors.push(`sources[${i}]: supply a label and safe HTTPS URL.`); return {label:'',url:''}; }
        return {label:s.label.trim(),url:s.url};
      });
    }
    if (/<\/?[a-z][^>]*>/i.test(item.body || '')) warnings.push('HTML is displayed as plain text. Only supported Markdown is formatted.');
    item.published = draft ? false : item.published === true;
    item.is_latest_reel = item.is_latest_reel === true;
    item.sort_order ??= 100;
    return {item,errors,warnings};
  }
  function parseImport(text, {publish = false} = {}) {
    if (typeof text !== 'string' || text.length > 2000000) throw Error('Import must be text smaller than 2 MB.');
    let source = text.trim(), parsed;
    if (source.startsWith('---\n') || source.startsWith('---\r\n')) {
      const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      if (!match) throw Error('Close front matter with a line containing --- before the Markdown body.');
      parsed = {};
      for (const line of match[1].split(/\r?\n/)) {
        if (!line.trim()) continue;
        const pair = line.match(/^([a-z_]+):\s*(.*)$/);
        if (!pair) throw Error('Front matter supports only key: value lines. Use JSON for nested sources.');
        if (!Object.hasOwn(fields,pair[1])) throw Error(`Unsupported front-matter field: ${pair[1]}.`);
        let value = pair[2];
        if (/^(true|false|-?\d+)$/.test(value) || value.startsWith('"') || value.startsWith('[')) { try { value = JSON.parse(value); } catch { throw Error(`Invalid JSON value for ${pair[1]}.`); } }
        if (Object.hasOwn(parsed,pair[1])) throw Error(`Duplicate front-matter field: ${pair[1]}.`);
        parsed[pair[1]] = value;
      }
      parsed.body = match[2];
    } else {
      try { parsed = JSON.parse(source); }
      catch {
        const blocks = [...source.matchAll(/```(?:json)?\s*\n([\s\S]*?)\n```/g)];
        if (blocks.length !== 1) throw Error('Paste valid JSON or exactly one fenced JSON block.');
        try { parsed = JSON.parse(blocks[0][1]); } catch { throw Error('The JSON block is invalid. Check quotes, commas and escaped line breaks.'); }
      }
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    if (!list.length || list.length > 100) throw Error('Import 1–100 resources at a time.');
    const results = list.map(item => validate(item,{draft:!publish}));
    const seen = new Set();
    results.forEach((r,i) => { if (seen.has(r.item.slug)) r.errors.push('Duplicate slug within this import. Give each resource a unique slug.'); seen.add(r.item.slug); r.index = i + 1; });
    const errors = results.flatMap(r => r.errors.map(e => `Resource ${r.index}: ${e}`));
    if (errors.length) throw Error(errors.join('\n'));
    if (publish) results.forEach(r => { r.item.published = true; });
    return {items:results.map(r=>r.item),warnings:results.flatMap(r=>r.warnings.map(w=>`Resource ${r.index}: ${w}`))};
  }
  const category = value => ({'Travel Smarter':'Travel','Study Smarter':'Study','Free Prompt Pack':'Creator Tools'}[value] || value || 'Guide');
  const reading = item => item.read_time || `${Math.max(1,Math.ceil((item.body || '').split(/\s+/).length/200))} min read`;
  function sort(items) { return [...items].sort((a,b) => Number(!!b.is_latest_reel)-Number(!!a.is_latest_reel) || (a.sort_order ?? 100)-(b.sort_order ?? 100) || String(b.published_at || b.created_at || '').localeCompare(String(a.published_at || a.created_at || ''))); }
  function publicPath(item) { return global.BRAMBLE_CONFIG?.supabaseUrl ? `/guides/?slug=${encodeURIComponent(item.slug)}` : `/guides/${encodeURIComponent(item.slug)}/`; }
  function attributed(href) {
    const target = new URL(href,origin());
    try { const params = new URLSearchParams(global.location?.search || ''); const stored = JSON.parse(global.sessionStorage?.getItem('bramble-attribution') || '{}'); for (const k of ['utm_source','utm_medium','utm_campaign','utm_content']) if (params.get(k) || stored[k]) target.searchParams.set(k,params.get(k) || stored[k]); } catch {}
    return target.pathname + target.search + target.hash;
  }
  function imageAttributes(path) {
    const variants = global.BRAMBLE_ASSET_VARIANTS?.[path];
    return variants?.length ? `srcset="${variants.map(v=>`${escape(v.url)} ${v.width}w`).join(', ')}" sizes="(max-width: 699px) 88px, (max-width: 1049px) 160px, 360px"` : '';
  }
  function card(item,{latest = false} = {}) {
    const image = assetURL(item.image_url,'image');
    return `<a class="resource-card${latest ? ' latest-card' : ''}${image ? ' has-image' : ''}" href="${escape(attributed(publicPath(item)))}" data-event="${latest ? 'latest_reel_click' : 'resource_click'}" data-slug="${escape(item.slug)}">
      ${image ? `<div class="resource-thumb"><img src="${escape(image)}" alt="" ${imageAttributes(item.image_url)} loading="lazy" width="160" height="160"></div>` : `<div class="resource-symbol" aria-hidden="true">${category(item.category) === 'AI + Automation' ? '↗' : '✳'}</div>`}
      <div class="resource-card-body"><div class="card-labels"><span class="tag">${escape(category(item.category))}</span>${latest || item.is_latest_reel ? '<span class="badge">From the latest Reel</span>' : ''}${item.badge ? `<span class="badge secondary-badge">${escape(item.badge)}</span>` : ''}</div><h3>${escape(item.title)}</h3><p>${escape(item.description)}</p><span class="resource-detail">${escape(item.format || 'Guide')} · ${escape(reading(item))} <span aria-hidden="true">↗</span></span></div></a>`;
  }
  async function load({local = false} = {}) {
    const config = global.BRAMBLE_CONFIG || {};
    if (!local && config.supabaseUrl && config.supabaseAnonKey) {
      try { const r = await fetch(`${config.supabaseUrl}/rest/v1/resources?published=eq.true&select=*&order=sort_order.asc`,{headers:{apikey:config.supabaseAnonKey,Authorization:`Bearer ${config.supabaseAnonKey}`}}); if (r.ok) return sort((await r.json()).filter(r=>r.published !== false)); } catch {}
    }
    const response = await fetch('/data/resources.json', {cache:'no-store'});
    if (!response.ok) throw Error('Could not load resources. Please reload.');
    const starter = await response.json();
    // Local previews are isolated from public pages; a draft never leaks into the library.
    if (!local) return sort(starter.filter(r=>r.published !== false));
    let saved = null;
    try { saved = JSON.parse(global.localStorage.getItem('bramble_resources') || 'null'); } catch { throw Error('Saved browser data could not be read. Export or recover it before continuing.'); }
    return sort(Array.isArray(saved) ? saved : starter);
  }
  function upsert(items,item,{replaceSlug = item.slug,confirmOverwrite = false,confirmLatest = false} = {}) {
    const collision = items.find(r=>r.slug === item.slug && r.slug !== replaceSlug);
    if (collision && !confirmOverwrite) throw Error(`Slug “${item.slug}” already exists. Choose a different slug or confirm replacement.`);
    const previous = items.find(r=>r.published && r.is_latest_reel && r.slug !== replaceSlug && r.slug !== item.slug);
    if (item.published && item.is_latest_reel && previous && !confirmLatest) throw Error(`Latest Reel is currently “${previous.title}”. Confirm replacing it.`);
    const next = items.filter(r=>r.slug !== replaceSlug && r.slug !== item.slug).map(r => item.published && item.is_latest_reel ? {...r,is_latest_reel:false} : {...r});
    next.push(item); return sort(next);
  }
  function track(name,detail = {}) { if (global.dispatchEvent && global.CustomEvent) global.dispatchEvent(new global.CustomEvent('bramble:event',{detail:{name,...detail}})); }
  const api = {fields,required,escape,url,assetURL,validate,parseImport,category,reading,sort,card,imageAttributes,load,upsert,publicPath,attributed,track};
  global.Bramble = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
