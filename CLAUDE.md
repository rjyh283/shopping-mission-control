# CLAUDE.md — Shopping Mission Control
> Created 2026-05-24. Chrome extension + dashboard for parallel shopping decision tracking.
> Shared router: ~/.claude/shared/router.py
> Protocol mirrors imjustvibin — same devlog, routing, and cost-tracking discipline.

---

## Project overview

A "mission control" dashboard for tracking parallel shopping decisions across multiple projects.
Industrial/utilitarian aesthetic — dense, dark, monospaced data, trading-terminal feel.
Built as a Chrome extension (manifest v3) with a standalone dashboard that talks to chrome.storage.local.

**Two phases:**
1. Dashboard — standalone HTML/JS, storage wrapper, full UI, buildCheckoutUrl logic
2. Extension wiring — manifest, content script (Open Graph / JSON-LD capture), popup → storage bridge

**Current phase:** 1 — Dashboard

---

## Orchestration philosophy

- Claude Code CLI is the **sole orchestrator**.
- All model calls go through `~/.claude/shared/router.py`.
- Every call logs to `costs.jsonl` in this directory.
- Same routing rules as imjustvibin — route before you code.

---

## Standing instructions

**Step 0 — Devlog entry first.** Before anything else, check if `devlog.md` has an entry
for today's session. If not, write the opening block now.

Before responding to any request, check if it matches a task type below.
If it does, ALWAYS use the shared router instead of handling directly:

- Repo exploration → `python ~/.claude/shared/router.py scan "..."`
- Planning / breakdown → `python ~/.claude/shared/router.py plan "..."`
- UI components → `python ~/.claude/shared/router.py ui "..."`
- Implementation → `python ~/.claude/shared/router.py execute "..."`
- Brainstorming → `python ~/.claude/shared/router.py brainstorm "..."`
- Bug / broken behavior (simple: < 5 files, isolated) → execute → review
- Bug / broken behavior (complex: auth, data integrity, external APIs) → plan first, then handle directly with Sonnet

Before routing any execute task, classify it as simple or complex:
- Simple → `router.py execute` → `router.py review`
- Complex → `router.py plan` first, then handle execution directly with Sonnet

**Mid-session routing rule:** Bug or issue discovered during QA? STOP. Classify it,
route it, return to original task. No inline fixes — they bypass cost tracking and skip review.

---

## Devlog — pre-session requirement

At the start of every session, append to `devlog.md`:

```markdown
## [YYYY-MM-DD] Session N

**Goal:** [one sentence]
**Context loaded:** tasks/current.md ✓ / tasks/repo-map.json ✓ / missing: [list]
**Starting state:** [brief: working / broken / unknown]
**Plan:** [bullet list, max 5]
```

At session end, append closing block to same entry:

```markdown
**Outcome:** [shipped / blocked / partial]
**Changed files:** [list]
**Blockers / notes:** [anything that needs follow-up]
**Next session goal:** [single next action]
```

`devlog.md` is append-only. Never edit past entries.

---

## Data model

### Project
```js
{ id, name, createdAt, items: Item[] }
```

### Item
```js
{
  id,
  title,
  url,
  retailer,        // derived from URL hostname
  price,           // number | null
  priceSavedAt,    // price at save time — enables drift detection
  imageUrl,        // string | null
  status,          // 'open' | 'bought' | 'dropped'
  notes,           // string
}
```

---

## Screen layout

**Left rail:** project list — name + progress fraction (e.g. "4/7 bought"). "+ new project" at bottom.
**Main panel:** selected project's items as dense rows — title, retailer tag, price, status pill, launch button.
  Sticky header: item count, open total $, bought total $, remaining $.
**Top bar:** "Save current page" button (stub → captureCurrentTab()), "+ add item" manual form.

---

## buildCheckoutUrl spec

```js
function buildCheckoutUrl(item) → { url: string, tier: 'checkout' | 'product' | 'open' }
```

| Retailer | Detection | URL | Tier | Button label |
|---|---|---|---|---|
| Shopify | `/products/` path | `/cart/{variantId}:1` if variant known, else product URL | checkout / product | "Checkout →" / "Open →" |
| Amazon | `amazon.com` | canonical `/dp/{ASIN}` or raw URL | product | "Open →" |
| Target | `target.com` | product URL | product | "Open →" |
| Walmart | `walmart.com` | product URL | product | "Open →" |
| Best Buy | `bestbuy.com` | product URL | product | "Open →" |
| Unknown | — | stored URL as-is | open | "Open →" |

Button label is driven by tier enum — never overpromise.

---

## Storage wrapper contract

```js
// src/store.js
store.get(key)           → Promise<any>
store.set(key, value)    → Promise<void>
store.subscribe(fn)      → unsubscribe fn

// Primary: chrome.storage.local (when running as extension)
// Fallback: in-memory Map (standalone dashboard dev)
// Swap backend: one-file change in src/store.js only
```

---

## Visual spec

- Monospace for all data (prices, counts, retailer tags)
- Display face with edges (not Inter) for project names and headers
- Status pills: open = neutral, bought = green, dropped = muted + strikethrough
- Retailer tags: small uppercase chips
- One accent color on interactive elements and totals strip
- Row hover reveals launch + status-change controls (resting state stays calm)
- Single staggered fade on project-switch — no other animation

---

## Build order

1. `src/store.js` — storage wrapper
2. `src/data.js` — data model + seed data (2 fake projects)
3. Static three-region layout (`index.html` + `src/app.js`)
4. Add/edit/status-change interactions
5. `src/checkout.js` — buildCheckoutUrl + launch button logic
6. Totals strip (pure derived state)
7. `captureCurrentTab()` stub in top bar
8. [Phase 2] Extension: manifest.json, content script, popup

---

## Cost tracking

Every router call appends to `costs.jsonl` in this directory.
Review after sessions. Model strings live in `~/.claude/shared/router.py` — change there, both projects update.

---

## Routing decision tree

```
Session start
      |
      v
Write devlog.md opening entry  ← REQUIRED
      |
      v
Load tasks/current.md
      |
      v
Visual / presentation layer only?
  YES → ui (Kimi K2.6)
  NO  ↓
"What should we build / how to approach"?
  YES → brainstorm → plan
  NO  ↓
Map or understand codebase?
  YES → scan → write tasks/repo-map.json
  NO  ↓
Write / edit / implement code?
  YES → classify complexity:
          simple → execute → review
          complex/uncertain → plan → Sonnet direct
  NO  ↓
Warning / error / abort decision?
  YES → abort_check
  NO  ↓
Default → claude-sonnet-4-6
```
