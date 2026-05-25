import store from './store.js';
import { createItem } from './data.js';

let pageData = null;   // extracted from content script
let projects = [];

async function init() {
  document.getElementById('open-dashboard').addEventListener('click', openDashboard);
  document.getElementById('save-btn').addEventListener('click', saveItem);

  // Load projects from storage
  const saved = await store.get('projects');
  projects = saved ?? [];
  populateProjectSelect();

  // Query active tab and extract page data
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) throw new Error('No active tab');

    pageData = await chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' });
    showContent(tab);
  } catch (err) {
    showError(err.message?.includes('Receiving end does not exist')
      ? 'No product data on this page.'
      : 'Could not read page data.');
  }
}

function populateProjectSelect() {
  const sel = document.getElementById('f-project');
  sel.innerHTML = '';
  if (projects.length === 0) {
    sel.innerHTML = '<option disabled>No projects yet — open dashboard first</option>';
    document.getElementById('save-btn').disabled = true;
    return;
  }
  projects.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
}

function showContent(tab) {
  document.getElementById('loading-msg').style.display = 'none';
  document.getElementById('main-content').style.display = '';

  const url      = pageData?.url || tab.url || '';
  const retailer = extractRetailer(url);
  const title    = pageData?.title || tab.title || url || '—';
  const price    = pageData?.price ?? null;

  document.getElementById('preview-title').textContent    = title;
  document.getElementById('preview-retailer').textContent = retailer || '—';

  const priceEl = document.getElementById('preview-price');
  if (price != null) {
    priceEl.textContent = '$' + price.toFixed(2);
  } else {
    priceEl.innerHTML = '<span id="no-price">no price found</span>';
  }

  // Price drift: check if this page is already saved
  const match = findSavedMatch(url);
  if (match && price != null && match.item.price != null) {
    const delta = price - match.item.price;
    if (Math.abs(delta) >= 0.01) showDrift(match, delta, price);
  }
}

function showDrift(match, delta, currentPrice) {
  const isDown  = delta < 0;
  const color   = isDown ? 'var(--green)' : '#ff6b6b';
  const arrow   = isDown ? '↓' : '↑';
  const absDelta = Math.abs(delta).toFixed(2);

  document.getElementById('drift-label').innerHTML =
    `<span style="color:${color}">${arrow} $${absDelta}</span>` +
    `<span class="drift-was"> · was $${match.item.price.toFixed(2)} in ${esc(match.proj.name)}</span>`;

  const btn = document.getElementById('update-price-btn');
  btn.onclick = () => updateSavedPrice(match, currentPrice);
  document.getElementById('drift-section').style.display = '';
}

async function updateSavedPrice(match, currentPrice) {
  match.item.price       = currentPrice;
  match.item.priceSavedAt = new Date().toISOString();
  await store.set('projects', projects);
  document.getElementById('drift-section').style.display = 'none';
  document.getElementById('saved-msg').textContent =
    `Price updated to $${currentPrice.toFixed(2)}`;
}

function showError(msg) {
  document.getElementById('loading-msg').style.display = 'none';
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.style.display = '';
}

function extractRetailer(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

function normalizeUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, '');
  } catch (_) { return url.trim(); }
}

function findSavedMatch(url) {
  const norm = normalizeUrl(url);
  if (!norm) return null;
  for (const proj of projects) {
    for (const item of proj.items) {
      if (normalizeUrl(item.url) === norm) return { proj, item };
    }
  }
  return null;
}

function findItemInProject(proj, url) {
  const norm = normalizeUrl(url);
  if (!norm) return null;
  return proj.items.find(i => normalizeUrl(i.url) === norm) ?? null;
}

async function saveItem() {
  const projId = document.getElementById('f-project').value;
  const notes  = document.getElementById('f-notes').value.trim();
  const proj   = projects.find(p => p.id === projId);
  if (!proj) return;

  const url      = pageData?.url || '';
  const retailer = extractRetailer(url);
  const existing = url ? findItemInProject(proj, url) : null;

  if (existing) {
    // Update in place — preserve user-set fields (notes, status)
    if (pageData?.title)    existing.title    = pageData.title;
    if (pageData?.imageUrl) existing.imageUrl = pageData.imageUrl;
    if (retailer)           existing.retailer = retailer;
    if (pageData?.price != null) {
      existing.price        = pageData.price;
      existing.priceSavedAt = new Date().toISOString();
    }
    await store.set('projects', projects);
    document.getElementById('save-btn').disabled = true;
    document.getElementById('drift-section').style.display = 'none';
    document.getElementById('saved-msg').textContent = `Updated in "${proj.name}"`;
  } else {
    const item = createItem({
      title:        pageData?.title || '',
      url,
      retailer,
      price:        pageData?.price ?? null,
      priceSavedAt: pageData?.price != null ? new Date().toISOString() : null,
      imageUrl:     pageData?.imageUrl || null,
      notes,
    });
    proj.items.push(item);
    await store.set('projects', projects);
    document.getElementById('save-btn').disabled = true;
    document.getElementById('saved-msg').textContent = `Saved to "${proj.name}"`;
  }
}

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  window.close();
}

init();
