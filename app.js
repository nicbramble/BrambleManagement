const LOCAL_RESOURCE_URL = "data/resources.json";

const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
})[character]);

async function getResources() {
  const config = window.BRAMBLE_CONFIG || {};
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      const endpoint = `${config.supabaseUrl}/rest/v1/resources?published=eq.true&select=*&order=sort_order.asc,created_at.desc`;
      const response = await fetch(endpoint, {
        headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
      });
      if (response.ok) return await response.json();
    } catch (error) {
      console.warn("Using local resources while the resource service is unavailable.", error);
    }
  }
  const browserResources = localStorage.getItem("bramble_resources");
  if (browserResources) return JSON.parse(browserResources).filter(item => item.published !== false);
  const response = await fetch(LOCAL_RESOURCE_URL);
  if (!response.ok) throw new Error("Resources could not be loaded.");
  return response.json();
}

function renderFilters(resources) {
  const target = document.querySelector("#resource-filters");
  if (!target) return;
  const categories = ["All", ...new Set(resources.map(item => item.category).filter(Boolean))];
  target.innerHTML = categories.map((category, index) => `
    <button class="filter-button${index === 0 ? " active" : ""}" type="button" data-filter="${escapeHtml(category)}">${escapeHtml(category)}</button>
  `).join("");
  target.addEventListener("click", event => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    target.querySelectorAll("button").forEach(item => item.classList.toggle("active", item === button));
    renderResources(resources, button.dataset.filter);
  });
}

function renderResources(resources, filter = "All") {
  const target = document.querySelector("#resource-grid");
  if (!target) return;
  const visible = filter === "All" ? resources : resources.filter(item => item.category === filter);
  if (!visible.length) {
    target.innerHTML = '<div class="empty-state">New resources are being built. Check back soon.</div>';
    return;
  }
  target.innerHTML = visible.map(item => `
    <a class="resource-card${item.featured ? " featured" : ""}" href="guides/?slug=${encodeURIComponent(item.slug)}">
      <span class="tag">${escapeHtml(item.category || "Guide")}</span>
      <h3>${escapeHtml(item.title)}</h3>
      <p>${escapeHtml(item.description)}</p>
    </a>
  `).join("");
}

async function initHome() {
  const year = document.querySelector("#year");
  if (year) year.textContent = new Date().getFullYear();
  const adminTrigger = document.querySelector("#admin-trigger");
  if (adminTrigger) {
    let clickCount = 0;
    let resetTimer;
    adminTrigger.addEventListener("click", () => {
      clickCount += 1;
      clearTimeout(resetTimer);
      if (clickCount >= 10) {
        sessionStorage.setItem("bramble-admin-unlocked", "true");
        window.location.href = "admin/?v=2";
        return;
      }
      resetTimer = setTimeout(() => { clickCount = 0; }, 2500);
    });
  }
  const target = document.querySelector("#resource-grid");
  if (!target) return;
  try {
    const resources = await getResources();
    renderFilters(resources);
    renderResources(resources);
  } catch (error) {
    target.innerHTML = '<div class="empty-state">The resource shelf is getting an upgrade. Try again shortly.</div>';
  }
}

document.addEventListener("DOMContentLoaded", initHome);
