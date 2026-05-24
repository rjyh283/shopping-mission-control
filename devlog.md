# Shopping Mission Control — Devlog

## [2026-05-24] Session 1

**Goal:** Scaffold the shopping mission-control dashboard — storage wrapper, data model, three-region layout.
**Context loaded:** tasks/current.md — N/A (session 1, no prior state)
**Starting state:** Blank repo. Spec fully defined in conversation. Router live at ~/.claude/shared/router.py.
**Plan:**
- Storage wrapper (store.get/set interface, chrome.storage.local target, in-memory fallback)
- Data model + seed data (2 fake projects, several items each)
- Three-region static layout (left rail, main panel, top bar)
- Wire add/edit/status-change interactions
- buildCheckoutUrl + launch button labels
- Totals strip (derived state, pure computation)

**Outcome:** shipped
**Changed files:** src/store.js, src/data.js, src/app.js, index.html
**Blockers / notes:** router.py `ui` task has a React+Tailwind system prompt — mismatches vanilla JS spec; built UI directly with Sonnet. Kimi K2.6 returned `None` on first long prompt. `execute` + `review` loop worked well for store.js and app.js.
**Next session goal:** Open `index.html` in browser, verify all interactions (project switch, status cycling, add item, totals). Then extension phase: manifest.json + content script.

## [2026-05-24] Session 2

**Goal:** Phase 2 — Chrome extension wiring (manifest, content script, popup, captureCurrentTab).
**Context loaded:** tasks/current.md ✓
**Starting state:** Dashboard working. Seed data URL 404s fixed (Best Buy/Target → search URLs).
**Plan:**
- manifest.json (MV3, permissions, content_scripts, popup)
- src/content.js (OG + JSON-LD extraction, message listener)
- popup.html + src/popup.js (quick-save interface, project dropdown)
- Update captureCurrentTab() in src/app.js

**Outcome:** shipped
**Changed files:** manifest.json, src/content.js, popup.html, src/popup.js, src/app.js, src/data.js
**Blockers / notes:** Added "tabs" permission — captureCurrentTab() queries all tabs by URL which requires it beyond activeTab. router ui still unusable for vanilla JS (React system prompt). execute+review loop worked well for content.js + popup.js.
**Next session goal:** Load extension in Chrome (chrome://extensions → Load unpacked), test popup on a real product page (amazon/target), verify save → dashboard flow end-to-end.

**Bug fix (same session):** Popup project dropdown empty — `init()` in app.js never called `persist()` when falling back to SEED_DATA, so `chrome.storage.local` stayed empty. Fixed: `if (!saved) persist()` after seed fallback. Also: popup requires dashboard to be open as extension page (`chrome-extension://…/index.html`), not localhost, to share the same storage backend.
