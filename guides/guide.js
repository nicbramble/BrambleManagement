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
      <div class="prompt-toolbar"><span>Copy, customize, practice</span><button class="copy-prompt" type="button" data-copy-prompt="${id}" aria-label="Copy prompt: ${guideEscape(sectionTitle)}">Copy prompt</button></div>
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
    status.textContent = "Prompt copied. Replace the [brackets] before you send it.";
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
    const savedItem = JSON.parse(browserResources).find(item => item.slug === slug && item.published !== false);
    if (savedItem) return savedItem;
  }
  const response = await fetch("../data/resources.json");
  const items = await response.json();
  return items.find(item => item.slug === slug && item.published !== false);
}

function renderGuide(item) {
  document.title = `${item.title} — Nic Bramble`;
  const root = document.querySelector("#guide-root");
  const hasPrompts = /^```prompt\s*$/m.test(item.body || "");
  root.className = hasPrompts ? "prompt-guide" : "";
  root.innerHTML = `
    <article>
      <header class="guide-header">
        <div class="guide-meta"><span>${guideEscape(item.category || "Guide")}</span><i></i><span>Free resource</span></div>
        <h1>${guideEscape(item.title)}</h1>
        <p class="guide-dek">${guideEscape(item.description)}</p>
        ${hasPrompts && item.download_url ? `<a class="guide-save" href="${guideEscape(window.brambleSafeUrl(item.download_url))}" download>${guideEscape(item.download_label || "Save this guide")} <span aria-hidden="true">↓</span></a>` : ""}
      </header>
      ${hasPrompts ? '<nav class="guide-toc" aria-labelledby="toc-title"><h2 id="toc-title">Choose your study session</h2><p>Start with the setup, then jump to the skill you want to practice.</p><div class="guide-toc-links"></div></nav>' : ""}
      ${item.image_url ? `<img class="guide-cover" src="${guideEscape(window.brambleSafeUrl(item.image_url, {image: true, fallback: ''}))}" alt="${guideEscape(item.title)} thumbnail">` : ""}
      <div class="guide-content">
        ${renderBody(item.body)}
        ${item.sources?.length ? `<aside class="guide-sources" aria-label="Product references"><h3>Product references</h3><p>These prompts and study routines are Nic.Buildz templates. For ChatGPT features and usage, see the official OpenAI documentation:</p><ul>${item.sources.map(source => `<li><a href="${guideEscape(window.brambleSafeUrl(source.url))}" target="_blank" rel="noopener noreferrer">${guideEscape(source.label)}</a></li>`).join("")}</ul></aside>` : ""}
        ${item.download_url ? `<a class="button button-primary guide-download" href="${guideEscape(window.brambleSafeUrl(item.download_url))}" ${hasPrompts ? "download" : 'target="_blank" rel="noopener noreferrer"'}>${guideEscape(item.download_label || "Download the resource")} <span aria-hidden="true">↓</span></a>` : ""}
      </div>
    </article>
    <section class="guide-cta">
      <div class="guide-cta-inner">
        <div>
          <p class="eyebrow">${guideEscape(item.cta_eyebrow || "Want the done-for-you version?")}</p>
          <h2>${guideEscape(item.cta_heading || "Let’s build it for your business.")}</h2>
          <p>${guideEscape(item.cta_description || "Tell me where you’re stuck and what a win would look like. We’ll find the right system to build.")}</p>
        </div>
        <a class="button button-dark" href="${guideEscape(window.brambleSafeUrl(item.cta_url, {fallback: 'https://mtnautomations.com/start'}))}" target="_blank" rel="noopener noreferrer">${guideEscape(item.cta_label || "Start a project")} <span aria-hidden="true">↗</span></a>
      </div>
    </section>`;
  if (hasPrompts) {
    const headings = root.querySelectorAll(".guide-content h2");
    root.querySelector(".guide-toc-links").innerHTML = Array.from(headings, heading => `<a href="#${heading.id}">${guideEscape(heading.textContent)}</a>`).join("");
    // Headings are inserted after loading the resource, so restore direct section links.
    const anchor = document.getElementById(window.location.hash.slice(1));
    if (anchor && root.contains(anchor)) anchor.scrollIntoView();
  }
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
  document.querySelector("#guide-root")?.addEventListener("click", event => {
    const button = event.target.closest("button[data-copy-prompt]");
    if (button) copyPrompt(button);
  });
  document.querySelector("#share-button")?.addEventListener("click", async event => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = "Link copied";
    } catch (error) {
      button.textContent = "Copy the URL above";
    }
  });
});
