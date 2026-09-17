const guideEscape = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

function renderInline(value) {
  return guideEscape(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

function renderBody(markdown = "") {
  const lines = markdown.replace(/\r/g, "").split("\n");
  let html = "";
  let listType = null;
  const closeList = () => {
    if (listType) html += `</${listType}>`;
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
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
    else if (trimmed.startsWith("## ")) html += `<h2>${renderInline(trimmed.slice(3))}</h2>`;
    else html += `<p>${renderInline(trimmed)}</p>`;
  }
  closeList();
  return html;
}

async function loadGuide(slug) {
  const config = window.BRAMBLE_CONFIG || {};
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      const safeSlug = encodeURIComponent(slug);
      const endpoint = `${config.supabaseUrl}/rest/v1/resources?slug=eq.${safeSlug}&published=eq.true&select=*&limit=1`;
      const response = await fetch(endpoint, { headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` } });
      if (response.ok) {
        const items = await response.json();
        if (items[0]) return items[0];
      }
    } catch (error) {
      console.warn("Using the local guide copy.", error);
    }
  }
  const browserResources = localStorage.getItem("bramble_resources");
  if (browserResources) {
    return JSON.parse(browserResources).find(item => item.slug === slug && item.published !== false);
  }
  const response = await fetch("../data/resources.json");
  const items = await response.json();
  return items.find(item => item.slug === slug && item.published !== false);
}

function renderGuide(item) {
  document.title = `${item.title} — Nic Bramble`;
  const root = document.querySelector("#guide-root");
  root.className = "";
  root.innerHTML = `
    <article>
      <header class="guide-header">
        <div class="guide-meta"><span>${guideEscape(item.category || "Guide")}</span><i></i><span>Free resource</span></div>
        <h1>${guideEscape(item.title)}</h1>
        <p class="guide-dek">${guideEscape(item.description)}</p>
      </header>
      <div class="guide-content">${renderBody(item.body)}</div>
    </article>
    <section class="guide-cta">
      <div class="guide-cta-inner">
        <div>
          <p class="eyebrow">Want the done-for-you version?</p>
          <h2>Let’s build it for your business.</h2>
          <p>Tell me where you’re stuck and what a win would look like. We’ll find the right system to build.</p>
        </div>
        <a class="button button-dark" href="${guideEscape(item.cta_url || "https://mtnautomations.com/start")}" target="_blank" rel="noopener">${guideEscape(item.cta_label || "Start a project")} <span aria-hidden="true">↗</span></a>
      </div>
    </section>`;
}

async function initGuide() {
  const root = document.querySelector("#guide-root");
  const slug = new URLSearchParams(window.location.search).get("slug");
  if (!slug) {
    root.className = "guide-error";
    root.innerHTML = '<p>That guide link is missing. <a href="../#resources">Browse all resources</a>.</p>';
    return;
  }
  try {
    const item = await loadGuide(slug);
    if (!item) throw new Error("Not found");
    renderGuide(item);
  } catch (error) {
    root.className = "guide-error";
    root.innerHTML = '<p>That guide is not available yet. <a href="../#resources">Browse all resources</a>.</p>';
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initGuide();
  document.querySelector("#share-button")?.addEventListener("click", async event => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      event.currentTarget.textContent = "Link copied";
    } catch (error) {
      event.currentTarget.textContent = "Copy the URL above";
    }
  });
});
