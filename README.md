# Minnoware — Shopping Mission Control

A Chrome extension + standalone dashboard for tracking parallel shopping decisions across multiple projects. Built for the kind of person who has four browser tabs open comparing standing desks while also pricing out a kitchen renovation.

![Dashboard screenshot placeholder](https://via.placeholder.com/800x450/0d0d0d/00ff88?text=dashboard)

---

## What it does

- **Projects** — group purchases by initiative (home office, kitchen reno, etc.)
- **Item rows** — retailer tag, title, price, status, one-click launch
- **Status pipeline** — cycle items through `open → bought → dropped` with a single click
- **Totals strip** — live open $, bought $, and remaining $ per project
- **Popup quick-save** — click the extension icon on any product page to capture title + price and save to a project in seconds
- **Open Graph + JSON-LD extraction** — automatically pulls product name and price from Amazon, Target, Shopify stores, and most structured product pages

---

## Install (developer mode)

No Chrome Web Store listing yet. Load unpacked:

1. Clone the repo
   ```
   git clone https://github.com/rjyh283/shopping-mission-control.git
   ```
2. Open `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select the cloned folder
5. Pin the extension icon to your toolbar

---

## Usage

**Saving from any product page**

1. Navigate to any product page (Amazon, Best Buy, Target, Shopify stores, etc.)
2. Click the Minnoware icon in your toolbar
3. The popup extracts title and price automatically
4. Pick a project from the dropdown → **Save item**

**Opening the dashboard**

Click **Open dashboard ↗** in the popup, or navigate directly to the extension page. The dashboard shows all your projects and items with full status management.

**Managing items**

- Click the **status pill** on any row to cycle its status
- Hover a row to reveal the **Open →** launch button and the **✕** remove button
- Click **+ Add item** to manually enter a URL, price, and notes

---

## Stack

- Vanilla JS ES modules — no build step, no framework
- Chrome Extension Manifest V3
- `chrome.storage.local` for persistence (in-memory Map fallback for standalone dev)
- Open Graph + JSON-LD parsing for product data extraction

---

## Project structure

```
├── manifest.json        # MV3 extension manifest
├── index.html           # Standalone dashboard
├── popup.html           # Extension toolbar popup
├── icons/               # Extension icons (16, 32, 48, 128px)
└── src/
    ├── store.js         # Storage wrapper (chrome.storage.local + in-memory fallback)
    ├── data.js          # Data model + seed data
    ├── app.js           # Dashboard logic
    ├── popup.js         # Popup logic
    └── content.js       # Content script — OG/JSON-LD extraction
```

---

## Local dev (dashboard only)

```
python3 -m http.server 8742 --directory .
open http://localhost:8742
```

Note: the standalone dev server uses an in-memory store. To test the full save-from-popup flow, load the extension in Chrome and open the dashboard via the popup's **Open dashboard ↗** link.

---

Built by [Minnoware](https://github.com/rjyh283)
