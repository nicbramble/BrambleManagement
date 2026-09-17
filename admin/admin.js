import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const config = window.BRAMBLE_CONFIG || {};
const useSharedDatabase = Boolean(config.supabaseUrl && config.supabaseAnonKey);
const supabase = useSharedDatabase ? createClient(config.supabaseUrl, config.supabaseAnonKey) : null;
const LOCAL_STORAGE_KEY = "bramble_resources";
let resources = [];
let currentResource = null;
let toastTimer;

const $ = selector => document.querySelector(selector);
const slugify = value => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

async function getBrowserResources() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) return JSON.parse(saved);
  const response = await fetch("../data/resources.json");
  if (!response.ok) throw new Error("Starter resources could not be loaded.");
  const items = await response.json();
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  return items;
}

function saveBrowserResources(items) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
}

async function refreshResources() {
  if (!useSharedDatabase) {
    resources = await getBrowserResources();
    renderResourceList();
    return;
  }
  const { data, error } = await supabase.from("resources").select("*").order("sort_order", { ascending: true }).order("created_at", { ascending: false });
  if (error) { showToast(error.message); return; }
  resources = data || [];
  renderResourceList();
}

function renderResourceList() {
  const list = $("#resource-list");
  if (!resources.length) {
    list.innerHTML = '<div class="list-empty">No resources yet. Hit the + button to publish your first one.</div>';
    return;
  }
  list.innerHTML = "";
  resources.forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.classList.toggle("active", currentResource?.id === item.id);
    const title = document.createElement("strong");
    title.textContent = item.title;
    const status = document.createElement("small");
    const dot = document.createElement("span");
    dot.className = `status-dot${item.published ? " live" : ""}`;
    status.append(dot, document.createTextNode(`${item.published ? "Published" : "Draft"} · ${item.category || "Uncategorized"}`));
    button.append(title, status);
    button.addEventListener("click", () => editResource(item));
    list.appendChild(button);
  });
}

function setField(selector, value) { $(selector).value = value ?? ""; }

function clearEditor() {
  currentResource = null;
  $("#resource-form").reset();
  setField("#resource-id", "");
  setField("#sort-order", 100);
  setField("#cta-label", "Build this for my business");
  setField("#cta-url", "https://mtnautomations.com/start");
  $("#published").checked = true;
  $("#editor-kicker").textContent = "New resource";
  $("#editor-title").textContent = "Untitled";
  $("#delete-button").hidden = true;
  $("#preview-link").hidden = true;
  $("#editor-message").textContent = "";
  delete $("#slug").dataset.edited;
  renderResourceList();
  $("#title").focus();
}

function editResource(item) {
  currentResource = item;
  setField("#resource-id", item.id);
  setField("#title", item.title);
  setField("#slug", item.slug);
  setField("#category", item.category);
  setField("#description", item.description);
  setField("#body", item.body);
  setField("#cta-label", item.cta_label);
  setField("#cta-url", item.cta_url);
  setField("#sort-order", item.sort_order ?? 100);
  $("#published").checked = Boolean(item.published);
  $("#featured").checked = Boolean(item.featured);
  $("#editor-kicker").textContent = item.published ? "Published resource" : "Draft resource";
  $("#editor-title").textContent = item.title;
  $("#delete-button").hidden = false;
  const preview = $("#preview-link");
  preview.hidden = !item.published;
  preview.href = `../guides/?slug=${encodeURIComponent(item.slug)}`;
  renderResourceList();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function fileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("That image could not be read."));
    reader.readAsDataURL(file);
  });
}

async function uploadCover(file) {
  if (!file) return currentResource?.image_url || null;
  if (!useSharedDatabase) return fileAsDataUrl(file);
  const extension = file.name.split(".").pop().toLowerCase();
  const safeName = `${Date.now()}-${slugify(file.name.replace(/\.[^.]+$/, ""))}.${extension}`;
  const path = `admin/${safeName}`;
  const { error } = await supabase.storage.from("resource-images").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return supabase.storage.from("resource-images").getPublicUrl(path).data.publicUrl;
}

function getPayload(imageUrl) {
  return {
    id: currentResource?.id || (crypto.randomUUID ? crypto.randomUUID() : `local-${Date.now()}`),
    title: $("#title").value.trim(),
    slug: slugify($("#slug").value),
    category: $("#category").value.trim(),
    description: $("#description").value.trim(),
    body: $("#body").value.trim(),
    cta_label: $("#cta-label").value.trim(),
    cta_url: $("#cta-url").value.trim(),
    image_url: imageUrl,
    sort_order: Number($("#sort-order").value) || 100,
    published: $("#published").checked,
    featured: $("#featured").checked,
    updated_at: new Date().toISOString(),
    created_at: currentResource?.created_at || new Date().toISOString()
  };
}

async function saveResource(event) {
  event.preventDefault();
  const submit = event.submitter;
  submit.disabled = true;
  $("#editor-message").textContent = "Saving…";
  try {
    const imageUrl = await uploadCover($("#cover-image").files[0]);
    const payload = getPayload(imageUrl);
    if (!useSharedDatabase) {
      const existingIndex = resources.findIndex(item => item.id === payload.id || item.slug === payload.slug);
      if (existingIndex >= 0) resources[existingIndex] = payload;
      else resources.push(payload);
      resources.sort((a, b) => (a.sort_order ?? 100) - (b.sort_order ?? 100));
      saveBrowserResources(resources);
    } else {
      const { data, error } = await supabase.from("resources").upsert(payload, { onConflict: "slug" }).select().single();
      if (error) throw error;
      Object.assign(payload, data);
    }
    await refreshResources();
    editResource(payload);
    $("#cover-image").value = "";
    $("#editor-message").textContent = "Saved.";
    showToast(useSharedDatabase ? "Resource saved." : "Saved in this browser.");
  } catch (error) {
    $("#editor-message").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
}

async function deleteResource() {
  if (!currentResource || !window.confirm(`Delete “${currentResource.title}”? This cannot be undone.`)) return;
  if (!useSharedDatabase) {
    resources = resources.filter(item => item.id !== currentResource.id && item.slug !== currentResource.slug);
    saveBrowserResources(resources);
  } else {
    const { error } = await supabase.from("resources").delete().eq("id", currentResource.id);
    if (error) { showToast(error.message); return; }
  }
  await refreshResources();
  clearEditor();
  showToast("Resource deleted.");
}

$("#title").addEventListener("input", event => {
  $("#editor-title").textContent = event.target.value || "Untitled";
  if (!currentResource && !$("#slug").dataset.edited) $("#slug").value = slugify(event.target.value);
});
$("#slug").addEventListener("input", event => { event.target.dataset.edited = "true"; event.target.value = slugify(event.target.value); });
$("#new-button").addEventListener("click", clearEditor);
$("#resource-form").addEventListener("submit", saveResource);
$("#delete-button").addEventListener("click", deleteResource);
$("#logout-button").addEventListener("click", () => {
  sessionStorage.removeItem("bramble-admin-unlocked");
  window.location.replace("../#top");
});

async function init() {
  $("#local-mode-notice").hidden = useSharedDatabase;
  await refreshResources();
  clearEditor();
}

init().catch(error => showToast(error.message));
