import store from './store.js';
import { SEED_DATA, createProject, createItem } from './data.js';

let projects = [];
let activeId = null;

// ─── Init ───

async function init() {
  const saved = await store.get('projects');
  projects = saved ?? SEED_DATA;
  if (!saved) persist(); // write seed data into storage so popup can read it
  activeId = projects[0]?.id ?? null;
  renderRail();
  renderPanel(false);
  bindEvents();
}

function persist() {
  store.set('projects', projects);
}

function activeProject() {
  return projects.find(p => p.id === activeId) ?? null;
}

// ─── buildCheckoutUrl ───

function buildCheckoutUrl(item) {
  const url = item.url || '';
  let tier = 'open';
  if (url) {
    try {
      const { hostname, pathname } = new URL(url);
      const host = hostname.replace(/^www\./, '');
      if (
        host.includes('amazon.') ||
        host === 'target.com' ||
        host === 'walmart.com' ||
        host === 'bestbuy.com' ||
        host.endsWith('.myshopify.com') ||
        pathname.includes('/products/')
      ) {
        tier = 'product';
      }
    } catch (_) {}
  }
  return { url, tier };
}

// ─── Rail ───

function renderRail() {
  const list = document.getElementById('project-list');
  list.innerHTML = '';
  for (const p of projects) {
    const bought = p.items.filter(i => i.status === 'bought').length;
    const row = document.createElement('div');
    row.className = 'project-row' + (p.id === activeId ? ' active' : '');
    row.innerHTML = `
      <span class="project-name">${esc(p.name)}</span>
      <span class="project-fraction">${bought}/${p.items.length}</span>
    `;
    row.addEventListener('click', () => switchProject(p.id));
    list.appendChild(row);
  }
}

function switchProject(id) {
  if (id === activeId) return;
  activeId = id;
  renderRail();
  renderPanel(true);
}

// ─── Totals ───

function renderTotals() {
  const proj = activeProject();
  const items = proj?.items ?? [];
  const openItems   = items.filter(i => i.status === 'open');
  const boughtItems = items.filter(i => i.status === 'bought');
  const openTotal   = openItems.reduce((s, i)   => s + (i.price ?? 0), 0);
  const boughtTotal = boughtItems.reduce((s, i) => s + (i.price ?? 0), 0);

  document.getElementById('total-count').textContent     = items.length;
  document.getElementById('total-open').textContent      = fmtUsd(openTotal);
  document.getElementById('total-bought').textContent    = fmtUsd(boughtTotal);
  document.getElementById('total-remaining').textContent = fmtUsd(openTotal);
}

function fmtUsd(n) {
  if (!n) return '$0';
  return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── Panel ───

function renderPanel(animate) {
  const proj = activeProject();
  document.getElementById('active-project-label').textContent = proj?.name ?? '—';
  renderTotals();
  renderItems(proj, animate);
}

function renderItems(proj, animate) {
  const list = document.getElementById('item-list');
  list.innerHTML = '';

  if (!proj || proj.items.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'empty-state';
    empty.textContent = 'No items yet — add one above.';
    list.appendChild(empty);
    return;
  }

  proj.items.forEach((item, idx) => {
    const row = buildRow(item);
    list.appendChild(row);
    if (animate) {
      row.style.transitionDelay = `${idx * 30}ms`;
      // Double rAF: first frame paints opacity:0, second triggers the transition
      requestAnimationFrame(() => requestAnimationFrame(() => row.classList.add('visible')));
    } else {
      row.style.transition = 'none';
      row.classList.add('visible');
      // Restore CSS transitions so hover background still animates
      requestAnimationFrame(() => { row.style.transition = ''; });
    }
  });
}

function buildRow(item) {
  const { url } = buildCheckoutUrl(item);
  // tier is 'product' or 'open' in dashboard phase; 'checkout' is reserved for extension phase
  const btnLabel = 'Open →';
  const priceText = item.price != null ? fmtUsd(item.price) : '—';
  const retailerShort = item.retailer
    ? item.retailer.replace(/^www\./, '').split('.')[0]
    : '—';

  const row = document.createElement('div');
  row.className = 'item-row';
  row.dataset.status = item.status;
  row.innerHTML = `
    <span class="retailer-tag" title="${esc(item.retailer)}">${esc(retailerShort)}</span>
    <span class="item-title"   title="${esc(item.title)}">${esc(item.title)}</span>
    <span class="item-price${item.price == null ? ' none' : ''}">${priceText}</span>
    <span class="status-pill ${item.status}">${item.status}</span>
    <div class="item-actions">
      <button class="launch-btn"${!url ? ' disabled' : ''}>${btnLabel}</button>
      <button class="remove-btn" title="Remove">✕</button>
    </div>
  `;

  row.querySelector('.status-pill').addEventListener('click', () => cycleStatus(item.id));
  if (url) {
    row.querySelector('.launch-btn').addEventListener('click', () => {
      window.open(url, '_blank', 'noopener noreferrer');
    });
  }
  row.querySelector('.remove-btn').addEventListener('click', () => removeItem(item.id));

  return row;
}

// ─── Mutations ───

const STATUS_CYCLE = { open: 'bought', bought: 'dropped', dropped: 'open' };

function cycleStatus(itemId) {
  const proj = activeProject();
  if (!proj) return;
  const item = proj.items.find(i => i.id === itemId);
  if (!item) return;
  item.status = STATUS_CYCLE[item.status] ?? 'open';
  persist();
  renderRail();
  renderPanel(false);
}

function removeItem(itemId) {
  const proj = activeProject();
  if (!proj) return;
  proj.items = proj.items.filter(i => i.id !== itemId);
  persist();
  renderRail();
  renderPanel(false);
}

function addItem(fields) {
  const proj = activeProject();
  if (!proj) return;
  let retailer = '';
  if (fields.url) {
    try { retailer = new URL(fields.url).hostname.replace(/^www\./, ''); } catch (_) {}
  }
  const item = createItem({
    ...fields,
    retailer,
    priceSavedAt: fields.price != null ? new Date().toISOString() : null,
  });
  proj.items.push(item);
  persist();
  renderRail();
  renderPanel(false);
}

// ─── Events ───

function bindEvents() {
  document.getElementById('new-project-btn').addEventListener('click', () => {
    const name = prompt('Project name:');
    if (!name?.trim()) return;
    const p = createProject(name.trim());
    projects.push(p);
    activeId = p.id;
    persist();
    renderRail();
    renderPanel(false);
  });

  document.getElementById('capture-btn').addEventListener('click', captureCurrentTab);
  document.getElementById('add-item-btn').addEventListener('click', openModal);
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-submit').addEventListener('click', submitModal);

  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ─── Modal ───

function openModal() {
  if (!activeProject()) return;
  ['f-title', 'f-url', 'f-price', 'f-notes'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('f-title').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

function submitModal() {
  const title = document.getElementById('f-title').value.trim();
  if (!title) { document.getElementById('f-title').focus(); return; }
  const url      = document.getElementById('f-url').value.trim();
  const priceRaw = document.getElementById('f-price').value;
  const priceNum = priceRaw !== '' ? parseFloat(priceRaw) : null;
  const price    = (priceNum != null && !isNaN(priceNum) && priceNum >= 0) ? priceNum : null;
  const notes    = document.getElementById('f-notes').value.trim();
  addItem({ title, url, price, notes });
  closeModal();
}

// ─── captureCurrentTab ───

async function captureCurrentTab() {
  if (!chrome?.tabs) {
    alert('Save current page: not yet wired — extension phase.');
    return;
  }
  if (!activeProject()) return;

  // Dashboard occupies a tab, so we want the most recently active *other* tab.
  // Query all tabs and find the last focused non-extension one.
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
  const tab  = tabs.find(t => !t.url?.startsWith('chrome-extension://'));
  if (!tab) {
    alert('Navigate to a product page in another tab first.');
    return;
  }

  let data = null;
  try {
    data = await chrome.tabs.sendMessage(tab.id, { action: 'extractPageData' });
  } catch (_) {}

  // Pre-fill modal with whatever we got
  document.getElementById('f-title').value = data?.title || tab.title || '';
  document.getElementById('f-url').value   = data?.url   || tab.url   || '';
  document.getElementById('f-price').value = data?.price != null ? data.price : '';
  document.getElementById('f-notes').value = '';
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('f-title').focus();
}

// ─── Util ───

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

init();
