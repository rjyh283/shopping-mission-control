## Active task
Load extension in Chrome and test end-to-end: popup save → dashboard display.

## Relevant files
- manifest.json — MV3, permissions: storage/activeTab/scripting/tabs
- src/content.js — OG + JSON-LD extraction, responds to 'extractPageData' message
- popup.html / src/popup.js — quick-save popup: extracts page data, project dropdown, Save button
- src/app.js — captureCurrentTab() now queries tabs and pre-fills modal (extension context only)
- index.html / src/store.js / src/data.js — unchanged dashboard

## Last 3 actions taken
1. Built manifest.json + src/content.js (execute → review, PASS)
2. Built popup.html + src/popup.js (Sonnet direct, review PASS)
3. Updated captureCurrentTab() in src/app.js

## Known blockers
- Extension not yet loaded in Chrome — needs manual load via chrome://extensions
- captureCurrentTab() from dashboard is best-effort: queries http/https tabs, picks first. Will not work if user is only in extension pages.
- Popup ES module (type="module") — verify Chrome handles this correctly in popup context (it should, MV3 supports it)

## Next step
1. Open chrome://extensions → enable Developer mode → Load unpacked → select /Users/Master/shopping-mission-control
2. Navigate to a product page (amazon.com, target.com)
3. Click extension icon → verify popup shows title + price
4. Save to a project → open dashboard → verify item appears
