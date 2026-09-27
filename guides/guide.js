const guideEscape = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

function renderInline(value) {
  return guideEscape(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderBody(markdown = "", options = {}) {
  const lines = markdown.replace(/\r/g, "").split("\n");
  let html = "";
  let listType = null;
  let promptLines = null;
  let promptNumber = 0;
  let sectionNumber = 0;
  let sectionTitle = "Study setup";
  const closeList = () => {
    if (listType) html += `</${listType}>`;
    listType = null;
  };
  const closePrompt = () => {
    const id = `prompt-${++promptNumber}`;
    html += `<section class="prompt-card" aria-label="Prompt: ${guideEscape(sectionTitle)}">
      <div class="prompt-toolbar"><span>${guideEscape(options.prompt_toolbar || "Copy, customize, practice")}</span><button class="copy-prompt" type="button" data-copy-prompt="${id}" data-copy-success="${guideEscape(options.prompt_copy_success || '')}" aria-label="Copy prompt: ${guideEscape(sectionTitle)}">Copy prompt</button></div>
      <pre class="prompt-text" id="${id}" tabindex="0">${guideEscape(promptLines.join("\n").trim())}</pre>
      <p class="prompt-status" role="status" aria-live="polite"></p>
    </section>`;
    promptLines = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (promptLines !== null) {
      if (trimmed === "```") closePrompt();
      else promptLines.push(line);
      continue;
    }
    if (trimmed === "```prompt") {
      closeList();
      promptLines = [];
      continue;
    }
    if (!trimmed) { closeList(); continue; }
    const ordered = trimmed.match(/^\d+\.\s+(.+)/);
    const unordered = trimmed.match(/^[-*]\s+(.+)/);
    if (ordered || unordered) {
      const nextType = ordered ? "ol" : "ul";
      if (listType !== nextType) { closeList(); html += `<${nextType}>`; listType = nextType; }
      html += `<li>${renderInline((ordered || unordered)[1])}</li>`;
      continue;
    }
    closeList();
    if (trimmed.startsWith("### ")) html += `<h3>${renderInline(trimmed.slice(4))}</h3>`;
    else if (trimmed.startsWith("## ")) {
      sectionTitle = trimmed.slice(3);
      html += `<h2 id="section-${++sectionNumber}" tabindex="-1">${renderInline(sectionTitle)}</h2>`;
    }
    else html += `<p>${renderInline(trimmed)}</p>`;
  }
  closeList();
  if (promptLines !== null) closePrompt();
  return html;
}

async function copyPrompt(button) {
  const card = button.closest(".prompt-card");
  const prompt = card.querySelector(".prompt-text");
  const status = card.querySelector(".prompt-status");
  try {
    await navigator.clipboard.writeText(prompt.textContent);
    if (typeof window !== 'undefined') window.Bramble?.track('prompt_copy');
    status.textContent = button.dataset?.copySuccess || "Prompt copied. Replace the [brackets] before you send it.";
  } catch (error) {
    const range = document.createRange();
    range.selectNodeContents(prompt);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    prompt.focus();
    status.textContent = "Copy unavailable. The prompt is selected; use your device’s Copy command.";
  }
}

async function loadGuide(slug) {
  const items = await Bramble.load();
  return items.find(item => item.slug === slug);
}

function guideActions(item, hasPrompts, position) {
  const e = guideEscape;
  let html = '';
  if (item.slug === 'automation-opportunity-audit') html += '<a class="button button-primary" href="#scorecard">Score your tasks ↓</a>';
  if (item.download_url) html += `<a class="button button-primary" data-event="download" data-slug="${e(item.slug)}" href="${e(Bramble.url(item.download_url))}" download>${e(item.download_label || 'Download the resource')} ↓</a>`;
  if (item.action_url) html += `<a class="button ${html ? 'button-quiet' : 'button-primary'}" href="${e(Bramble.url(item.action_url))}" target="_blank" rel="noopener noreferrer">${e(item.action_label || 'Open the tool')} ↗</a>`;
  if (!html) html = `<a class="button button-primary" href="${hasPrompts ? '#prompt-1' : '#guide-content'}">${hasPrompts ? 'Get the prompts' : 'Start the guide'} ↓</a>`;
  return `<div class="guide-actions ${position}">${html}</div>`;
}
function scorecardMarkup() {
  return `<section class="scorecard" id="scorecard" aria-labelledby="scorecard-title"><h2 id="scorecard-title">Find the task worth automating.</h2><p>For each task, score frequency, frustration and business impact from 1 (low) to 5 (high). Its opportunity score is <strong>frequency × frustration × impact</strong>, out of 125. Compare tasks using the same scale.</p><details><summary>How to choose a score</summary><p>Frequency: 1 = monthly or less; 2 = weekly; 3 = several times a week; 4 = daily; 5 = several times a day. Frustration: 1 = easy; 3 = annoying; 5 = draining. Impact: 1 = minor convenience; 3 = meaningful time saved; 5 = directly affects customers or revenue.</p></details><div id="scorecard-rows">${[1,2,3].map(n=>`<div class="score-row"><label class="task-name">Task ${n}<input name="task" maxlength="100" placeholder="e.g. Following up on leads"></label>${['Frequency','Frustration','Impact'].map(label=>`<label>${label}<select aria-label="Task ${n} ${label}" name="${label.toLowerCase()}">${[1,2,3,4,5].map(v=>`<option value="${v}" ${v===3?'selected':''}>${v}</option>`).join('')}</select></label>`).join('')}<output aria-label="Task ${n} score">27 / 125</output></div>`).join('')}</div><p id="score-result" role="status">Name at least one task to find your highest-scoring opportunity.</p><button class="button button-quiet" type="button" id="copy-scores">Copy my scorecard</button><p class="score-note">A starting point for choosing a task. Check data access, exceptions and time saved before building.</p><a class="work-link" href="https://mtnautomations.com/start?utm_source=bramblemanagement&utm_medium=resource&utm_campaign=automation_audit" data-event="work_with_nic" target="_blank" rel="noopener noreferrer">Want help building it? ↗</a></section>`;
}
function guideMarkup(item) {
  const e = guideEscape;
  const hasPrompts = /^```prompt\s*$/m.test(item.body || '');
  const image = Bramble.assetURL(item.image_url,'image');
  // Work links live in the footer. Resource-specific educational CTAs stay compact.
  const educationalCTA = item.cta_url && !/mtnautomations\.com/.test(item.cta_url);
  return `<article><header class="guide-header"><div class="guide-meta"><span>${e(Bramble.category(item.category))}</span>${item.is_latest_reel ? '<span class="badge">From the latest Reel</span>' : ''}${item.badge ? `<span class="badge">${e(item.badge)}</span>` : ''}<span>${e(item.format || 'Guide')} · ${e(Bramble.reading(item))}</span></div><h1>${e(item.title)}</h1><p class="guide-dek">${e(item.description)}</p>${guideActions(item,hasPrompts,'top-action')}<div class="share-controls"><button class="share-button" type="button" data-share>Share ↗</button><button class="share-button" type="button" data-copy-link>Copy link</button><span class="share-status" role="status"></span></div></header>
  ${item.slug === 'automation-opportunity-audit' ? scorecardMarkup() : ''}
  ${hasPrompts ? `<details class="guide-toc"><summary>${e(item.toc_title || 'Jump to a section')}</summary><p>${e(item.toc_description || 'Choose a prompt and make it yours.')}</p><nav class="guide-toc-links" aria-label="Guide sections">${[...(item.body || '').matchAll(/^## (.+)$/gm)].map((m,i)=>`<a href="#section-${i+1}">${e(m[1])}</a>`).join('')}</nav></details>` : ''}
  ${image ? `<details class="guide-artwork"><summary>View resource artwork</summary><img class="guide-cover" src="${e(image)}" alt="${e(item.image_alt || '')}" loading="lazy" width="740" height="740"></details>` : ''}
  <div class="guide-content" id="guide-content">${renderBody(item.body,item)}
  ${item.sources?.length ? `<aside class="guide-sources" aria-label="Sources"><h3>Sources & further reading</h3><p>${e(item.sources_intro || 'References and further reading for this resource.')}</p><ul>${item.sources.map(source=>`<li><a href="${e(Bramble.url(source.url))}" target="_blank" rel="noopener noreferrer">${e(source.label)}</a></li>`).join('')}</ul></aside>` : ''}
  ${guideActions(item,hasPrompts,'bottom-action')}
  ${educationalCTA ? `<aside class="resource-cta"><p class="eyebrow">${e(item.cta_eyebrow || 'Keep exploring')}</p>${item.cta_heading ? `<h2>${e(item.cta_heading)}</h2>` : ''}${item.cta_description ? `<p>${e(item.cta_description)}</p>` : ''}<a href="${e(Bramble.url(item.cta_url))}">${e(item.cta_label || 'Explore more resources')} →</a></aside>` : ''}
  </div></article><aside class="guide-newsletter"><h2>Don’t miss the next resource.</h2><p>Free, useful things. Sent when there’s something worth sharing.</p><a class="button button-primary" href="${e(Bramble.attributed('/#newsletter'))}">Get the next useful thing →</a></aside>`;
}
function updateGuideMetadata(item) {
  document.title = `${item.title} — Nic Bramble`;
  const values = {'description':item.description,'og:title':document.title,'og:description':item.description,'og:url':`https://www.bramblemanagement.com${Bramble.publicPath(item)}`,'og:image':document.querySelector('meta[property="og:image"]')?.content || 'https://www.bramblemanagement.com/assets/social-preview.jpg'};
  for (const [key,value] of Object.entries(values)) {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    let tag = document.querySelector(`meta[${attr}="${key}"]`);
    if (!tag) { tag = document.createElement('meta');tag.setAttribute(attr,key);document.head.append(tag); }
    tag.content = value;
  }
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical);}
  canonical.href = values['og:url'];
}
function renderGuide(item,{metadata = true} = {}) {
  if (metadata) updateGuideMetadata(item);
  const root = document.querySelector('#guide-root');
  root.className = /^```prompt\s*$/m.test(item.body || '') ? 'prompt-guide' : '';
  root.innerHTML = guideMarkup(item);
  bindScorecard(root);
}
function bindScorecard(root) {
  const scorecard=root.querySelector('#scorecard'); if(!scorecard) return;
  const rows=[...scorecard.querySelectorAll('.score-row')];
  const values=()=>rows.map(row=>({task:row.querySelector('input').value.trim(),score:[...row.querySelectorAll('select')].reduce((a,s)=>a*Number(s.value),1),values:[...row.querySelectorAll('select')].map(s=>s.value)}));
  const update=()=>{const results=values();results.forEach((r,i)=>rows[i].querySelector('output').textContent=`${r.score} / 125`);const named=results.filter(r=>r.task);const max=Math.max(...named.map(r=>r.score));const winners=named.filter(r=>r.score===max);scorecard.querySelector('#score-result').textContent=named.length ? `${winners.length>1?'Tied highest':'Start here'}: ${winners.map(r=>r.task).join(' and ')} — ${max}/125. Choose a small, repeatable first step.` : 'Name at least one task to find your highest-scoring opportunity.';};
  scorecard.addEventListener('input',update);
  scorecard.querySelector('#copy-scores').addEventListener('click',async()=>{try{await navigator.clipboard.writeText('My automation opportunities\n'+values().filter(r=>r.task).map(r=>`${r.task}: ${r.values.join(' × ')} = ${r.score}/125`).join('\n'));scorecard.querySelector('#score-result').textContent='Scorecard copied.';Bramble.track('scorecard_copy');}catch{scorecard.querySelector('#score-result').textContent='Copy unavailable. Your scores remain visible; select and copy them manually.';}});
}
async function initGuide() {
  if (document.body.dataset.preview === 'true') return;
  const slug = new URLSearchParams(window.location.search).get('slug') || window.location.pathname.match(/^\/guides\/([^/]+)\//)?.[1];
  const root = document.querySelector('#guide-root');
  try {
    const item = slug && await loadGuide(slug);
    if (!item) throw Error('Not found');
    renderGuide(item);
    const anchor=document.getElementById(window.location.hash.slice(1));if(anchor)anchor.scrollIntoView();
  } catch {
    if(root.dataset.prerendered) {bindScorecard(root);return;}
    root.className='guide-error';root.innerHTML='<p>That guide is not available yet. <a href="/#resources">Browse all resources</a>.</p>';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  initGuide();
  document.querySelector('#guide-root')?.addEventListener('click',async event=>{
    const button=event.target.closest('button[data-copy-prompt]'); if(button)copyPrompt(button);
    const share=event.target.closest('[data-share], [data-copy-link]');if(!share)return;
    const feedback=share.closest('.share-controls').querySelector('.share-status');
    try {
      if(share.hasAttribute('data-share') && navigator.share) {await navigator.share({title:document.title,url:window.location.href});feedback.textContent='Shared.';}
      else {await navigator.clipboard.writeText(window.location.href);feedback.textContent='Link copied.';}
      Bramble.track('share');
    } catch(error) {feedback.textContent=error.name==='AbortError'?'Sharing canceled.':'Copy unavailable. Copy the address from your browser.';}
  });
});
