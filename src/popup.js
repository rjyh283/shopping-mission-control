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

  const retailer = extractRetailer(pageData?.url || tab.url || '');
  const title    = pageData?.title || tab.title || tab.url || '—';
  const price    = pageData?.price ?? null;

  document.getElementById('preview-title').textContent   = title;
  document.getElementById('preview-retailer').textContent = retailer || '—';

  const priceEl = document.getElementById('preview-price');
  if (price != null) {
    priceEl.textContent = '$' + price.toFixed(2);
  } else {
    priceEl.innerHTML = '<span id="no-price">no price found</span>';
  }
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

async function saveItem() {
  const projId = document.getElementById('f-project').value;
  const notes  = document.getElementById('f-notes').value.trim();
  const proj   = projects.find(p => p.id === projId);
  if (!proj) return;

  const url      = pageData?.url || '';
  const retailer = extractRetailer(url);

  const item = createItem({
    title:       pageData?.title || '',
    url,
    retailer,
    price:       pageData?.price ?? null,
    priceSavedAt: pageData?.price != null ? new Date().toISOString() : null,
    imageUrl:    pageData?.imageUrl || null,
    notes,
  });

  proj.items.push(item);
  await store.set('projects', projects);

  document.getElementById('save-btn').disabled = true;
  document.getElementById('saved-msg').textContent = `Saved to "${proj.name}"`;
}

function openDashboard() {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
  window.close();
}

init();
