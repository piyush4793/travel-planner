# Roamwise

A personal, map-based travel planner with a catalog of 197 world countries, 44 curated seed destinations with rich data, and offline day-by-day itineraries for all 198 rule-backed destinations. Filter by season, budget, travel style, and experience type — then explore itineraries with real costs, hotel picks, and transport connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **✈ Trips** (home) | Dashboard with progress ring, stats, and "Next trip" highlight. **One card per My List country** (so card count always matches list size), with image collages, budget, and best months. Grouped sections: ⭐ Favorites → 📋 Planning → ✅ Completed. Tablet/desktop now use a collapsible left filter rail + right results workspace (icon-only view toggle + sort in results toolbar). Mobile defaults to list (grid toggle appears only on wider phones). Paginated. Click any card to open country detail. |
| **📅 Calendar** | Heatmap grid — rows are destinations, columns are months. Emerald = best, red = avoid, blue = current month. |
| **🌍 Discover** | Browse all 197 world countries. Filter by region and list status. Add countries to your list or remove them. |

View persists in the URL hash (`#trips`, `#calendar`, `#discover`) — refresh returns to the same view. Trips is the default home view.

### Responsive Design
Mobile-first responsive layout — works on phones (375px+), tablets (768px+), and desktops (1024px+):
- **Header**: hamburger menu on mobile with slide-down drawer for settings/actions; full pill nav on tablet+
- **Trips view controls**: mobile uses compact icon-triggered filter panels; tablet/desktop uses persistent left filter rail + right results toolbar
- **Country detail panel**: full-screen overlay on mobile; resizable side panel on desktop
- **All modals**: full-screen on mobile (no rounded corners, full height); centered cards on desktop
- **Trip cards grid**: 1 col mobile → 2 col tablet → 3 col desktop
- **Plan comparison**: stacked columns on mobile; side-by-side on desktop
- **Touch targets**: minimum 44px on all interactive elements

---

### My List & Discover
- **197 countries** in the world catalog (`data/worldCatalog.json`), organized by 6 regions
- **44 curated seed destinations** with rich data (budget, best months, experiences, cities) pre-added to your list — and **all 198 itinerary-backed destinations** now have offline planning data available on demand
- Only countries in **My List** appear on Map, Calendar, List, and Trips views
- Add from Discover → creates a minimal Country entry that can be enriched via edit
- Remove from list without losing custom data — re-add anytime
- **Favorites always sort to the top** across all views

---

### Filters (Trips + Calendar; hidden on Discover)
All filters combine with AND logic:

| Filter | Behaviour |
|---|---|
| **Month** | Multi-select — shows countries with best-time overlap |
| **Budget** | Choose **basis** first (Solo / Couple / Family), then tier: ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+) |
| **Experiences** | Multi-select tag picker — AND logic (applies to non-Trips filtered views) |
| **Visited** | Dropdown: All Countries / Not Visited / ✓ Visited — on Trips, filters country cards directly |
| **Sort (Trips)** | Popularity / A to Z / Z to A. Popularity uses `popularityScore` from `data/rules/index.json` (tie-break: favorites, then name), seeded from 2024 international tourist-arrival rankings (WorldData/UN Tourism references). When a search query is active, relevance ranking takes precedence. |

On **mobile Trips view**, filter controls are grouped behind two icon toggles:
- **Primary filters panel**: Month, Budget, Visited
- **Secondary filters panel**: View mode, Status, Region

On **tablet/desktop Trips view**, these controls live in a **left filter rail** (collapsible), with search + icon-only list/grid toggle + sort + result count in the **right results toolbar**.

---

### Country Detail Panel
Slides in from the right with a compact, decluttered layout:
- **Refreshed panel layout** — sticky header, card-based sections, enhanced slider, and calendar-style month grid
- **Compact header** — country name, visited toggle, favorite ★, dedicated edit/delete actions, close
- **Country flag support** — panel header now resolves flags for all manifest destinations (including naming variants like Czech Republic/Czechia, Ivory Coast/Côte d’Ivoire, St./Saint forms)
- **Travel style badge** — single research-backed recommendation per country (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive)
- **Collapsible sections** — Experiences, Cities, Stopover tips, Watch out for, Combine with, Links, Notes collapse by default with item counts
- **Combine-with navigation** — country pills in “Combine with” are clickable and open that country panel directly
- **"When to go"** — best + avoid months merged in one row
- **Trip planner** — days slider with smart city selection + Generate/AI buttons
- **Multi-plan selector** — dropdown to switch between Default and saved AI plans, with full day-wise itinerary for each
- **Plan comparison** — side-by-side modal with summary cards (duration, cost, cities, activities/day, hotels), city overlap analysis (shared/unique badges), and independent day-by-day scroll
- **Cinematic for any plan** — saved AI plans can also run cinematic mode; button disabled per-plan when city coordinates don't match
- **Country facts stay in sync** — lazily loaded overview/facts discard stale responses if you switch destinations mid-fetch

---

### Day-by-Day Itinerary Planner
Custom trip planner with a days slider — set your duration and the engine builds the best itinerary:

- **198 countries covered** — every country in the world catalog has a day-wise offline itinerary
- **Range slider** from 1 to max available days (based on rule data)
- **Recommended days** shown for guidance (e.g. "Recommended: 12 days")
- **Smart city selection** — when days are fewer than total cities, the algorithm prioritizes by importance and drops lowest-priority cities first
- **Optional city override** — manually pick which cities to include
- **Real data** — each country's rule file includes real hotel names, restaurant picks, attraction fees (in ₹), transport connections, SIM/app tips, and city images
- **Lazy-loaded** — rule files are separate JSON chunks loaded on demand, keeping the initial bundle small

**Two planning modes:**
| Mode | Trigger | Description |
|---|---|---|
| 📅 Offline | Generate Plan button | Static rule engine + generic algorithm — instant, no API needed |
| ✨ AI-Powered | Plan with AI button | Chat with LLM to build a plan conversationally, then view as itinerary |

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with styled transport markers, easing, city pulse, route glow |
| 📋 Itinerary | All countries (offline + AI) | Scrollable modal with expandable day cards, activities with cost highlighting, quick links (📍 Maps, 🔍 Search), meal recommendations, hotel booking links, and per-day 🗺️ Route button that opens a Google Maps Directions link with all stops plotted in walking/transit order |
| 📄 PDF Export | All countries (paid) | Browser print dialog → Save as PDF with clean formatted layout |

---

### AI Trip Planner (✨)
Bring-your-own-key integration with OpenAI and Claude. Chat with an AI assistant to plan trips for any destination.

- **Multi-provider support** — OpenAI, Claude (Anthropic), and Gemini (Google), switchable in Settings with per-provider keys
- **Central chat modal** — describe your trip in natural language ("Plan 10 days in Japan for 2, mid-range budget")
- **Pre-seed from country panel** — click "✨ Plan with AI" on any country to pre-fill a rich prompt with budget, best months, cities, experiences, and combo destinations (editable before sending — no auto-send, no wasted tokens)
- **Smart defaults** — origin from home country, 2 travelers, 7 days, mid-range budget when not specified
- **Context condensation** — maintains a structured trip brief + recent messages to save tokens
- **Finish & Generate** — extracts a structured JSON plan from the conversation; engaging splash screen with rotating progress messages during generation
- **Cost breakdowns** — per-day cost estimates for flights, hotels, excursions, and transfers
- **Booking suggestions** — Klook/Viator-style tour recommendations with price, duration, and ratings
- **Save to My List** — save AI-generated destinations to your list with instant feedback (saved / already exists)
- **Import plans from external AI** — paste a ChatGPT/Claude conversation or share link; multi-strategy parser extracts day-by-day itinerary with prompt improvement suggestions
- **Save AI plans** — persist up to 3 AI-generated itineraries per destination in localStorage with compare-and-replace flow
- **Rename-safe replacements** — replacing a saved AI plan now works even if the regenerated itinerary changes the destination label
- **Plan comparison** — when saving, view existing plans side-by-side with diff summary (duration, budget, cities, cost) and choose to add or replace
- **Token usage tracking** — running token counter with cost estimate in chat footer (color-coded: green <4K, amber 4K-12K, red >12K); hover for detailed breakdown (input/output tokens, per-provider pricing, estimated USD cost)
- **Pre-finalization cost estimate** — "Finish & Generate" button shows estimated cost before generating; tooltip with expected additional token usage
- **Provider pricing reference** — collapsible pricing table in Settings showing per-model input/output rates for all providers
- **Quota-aware error handling** — provider-specific error messages for rate limits, billing exhaustion, and free tier caps with links to billing pages
- **Settings modal** — provider selector, API key management with validation, explicit localStorage warning for unencrypted keys, security notice, setup guides
- **Feature-gated** — behind `llmPlanning` feature flag (enabled by default)

---

### Cinematic Itinerary (🎬)
Full-screen animated experience for rule-based countries:
1. World overview with complete route drawn on map
2. Departure arc from home city with ✈️ animation
3. City-by-city transit with transport emoji riding route lines
4. City photo slideshows (Wikipedia images, cross-fade, slide dots)
5. Staggered activity cards on resizable right panel
6. Return arc with "Welcome back!" screen
7. Pause/resume, close to restore original camera
8. Pause/resume stays reliable across re-renders because playback control is state-driven

---

### Trip Groups (Editable)
- Curated seed groups define optimal multi-country combinations
- Inline editor: change main country, add-ons (max 2), region
- Create custom trip groups from the + New Trip button
- Delete trips (seed trips are tombstoned, custom trips removed)
- One-trip-per-country invariant enforced in editor
- Trips view still renders one card per My List country even when country is part of a trip group (group metadata no longer hides standalone cards)
- **Collapsible sections** — Favorites, Planning, and Completed sections can be toggled open/closed for quick scanning
- **Skeleton loading** — image collages show a shimmer placeholder while wiki images load (no layout jump)
- **Mobile FAB** — floating "+" button to create new trips on mobile (since header button is hidden)
- **Always-visible edit** — ✏️ button visible on mobile (hover-only on desktop)
- **Combo suggestions** — solo trip cards show "Pair with…" hints when available, or a "No combo yet" placeholder chip to preserve layout rhythm
- **Search intent priority** — search prioritizes the card’s primary country name (including word-prefix matches like `kore`/`swit`) over combine/related hits, and active search keeps relevance order instead of re-sorting by popularity
- **Grid alignment consistency** — compact cards reserve the combo-row slot so progress rows align even when no combo/suggestion pills exist
- **No duplicate combine labels** — list cards show combine countries once (as chips only), without repeating them inline next to the main country
- **Budget basis clarity** — list card budget chips show traveler-basis icons (👤 solo / 👫 couple / 👨‍👩‍👧‍👦 family4) matching the active Trips budget basis filter

---

### Home Country
📍 button in header — changes budget "from X" labels. Persists in localStorage.

Default: static "India" label. With `searchableHomeCountry` feature flag enabled: searchable dropdown with all 197 countries (max 10 visible, scroll-enabled).

### Backup & Restore
All travel data lives in localStorage. The Settings modal (⚙️) includes a full backup section:

| Action | Format | Scope |
|---|---|---|
| **Full Backup** | JSON | All localStorage data — countries, trips, AI plans, visited/favorites, settings |
| **Export Countries** | CSV or XLSX | Flat table of My List countries with all fields (human-editable) |
| **Restore Backup** | JSON | Replaces all localStorage data from a previously exported JSON backup |
| **Import Countries** | CSV | Merges imported countries into your customs (existing entries updated, new ones added) |

- **Save As dialog** — manual exports open native "Save As" file picker (Chrome/Edge) so you can choose where to save; auto-backups silently download to browser's default folder
- **XLSX export** uses manual Office Open XML construction — no npm dependencies
- **API keys are excluded** from backup files for security
- **Backup reminders** — configurable (daily / weekly / monthly / never). Default: monthly. Overdue backups show a dismissible amber banner at the top
- **Smart first-launch** — won't nag for backup until user has actual custom data (not just seed data)

---

### PWA & Offline Mode
Roamwise is a Progressive Web App — installable on desktop (Chrome/Edge) and mobile (Add to Home Screen):
- **Service worker** — cache-first for static assets (JS/CSS/SVG), network-first for HTML with cache fallback
- **Works offline** — all 198 country itineraries, trip data, and the full UI work without internet
- **Installable** — shows native install prompt on supported browsers; manual instructions for iOS Safari
- **Auto-updates** — service worker updates silently on new deploys

---

### First Run Experience (FRE)
Guided 8-step onboarding tour for new users:
- **Hero cards** — full-screen gradient cards with floating emoji decorations for immersive steps (Welcome, Cinematic, Finale)
- **Spotlight cards** — positioned tooltips with blue glow highlight on target elements (Trips, Discover, Calendar, Settings)
- **Install card** — PWA install prompt with platform-specific instructions (Chrome/Edge programmatic, iOS manual, fallback text)
- **Mobile-responsive** — spotlight steps render as centered hero cards on mobile (<768px) since nav items have no room for tooltips
- **Dismiss anytime** — ✕ button on every card + Escape key closes tour; progress bar shows step count
- **One-time** — stored in localStorage (`tp_fre_done`), never shown again after completion or dismissal

---

### Country Info & Planning Resources
- **Learn about country** — collapsible section in country detail panel with Wikipedia summary, thumbnail image, capital, currency, and language (fetched on demand from Wikipedia/Wikidata APIs, cached per session)
- **Planning resources** — 3 curated external links per country: Wikivoyage travel guide, Lonely Planet destination page, and Passport Index visa/entry requirements

---

### Feature Flags
Stored in `tp_features` localStorage key. On localhost, use the 🛠 dev panel in the header to toggle flags live.

**Two-tier gating:**
- `paidFeatures` — master gate for premium features (default: `false`)
- Individual flags — fine-grained control within each tier
- A paid feature requires BOTH `paidFeatures=true` AND its own flag enabled

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate — enables all premium features. Set to `true` after payment. |
| `llmPlanning` | `true` | paid | AI trip planning (chat, itinerary generation, save plans). Hidden unless `paidFeatures=true`. |
| `pdfExport` | `true` | paid | Export itineraries as PDF from country panel. Hidden unless `paidFeatures=true`. |
| `searchableHomeCountry` | `false` | free | Searchable dropdown with all 197 countries for home country selection |

**Payment flow (future):** A payment page will set `paidFeatures=true` in localStorage upon successful purchase, unlocking all premium features for the user.

---

### Map Markers
- **Blue** — unvisited | **Green** — visited | **Purple** — combo/linked
- Hover for Wikipedia photo card with budget

---

## Tech Stack

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL JS. Zero runtime dependencies beyond React + MapLibre, no backend, and no routing or state libraries. The codebase is split into a platform-agnostic `src/core/` layer (types, storage ports/adapters, feature flags, pure trip/data utilities), web-only `src/hooks/` layer for React state/hooks, and `src/data/` / `src/utils/` for app-specific loaders and browser helpers. Async UI loaders use stale-request guards before committing fetched data so fast panel/view switches cannot overwrite the current selection. Offline itinerary content lives in `data/rules/` as 199 JSON files (198 country rule chunks + `index.json`) that lazy-load on demand, while Vitest + `@testing-library/react` cover the app with 305 tests across 38 files, including unit tests for hooks/utils/providers and P0 integration tests for key component flows (view rendering, filtering, country CRUD, trip management).

### Testing & Coverage

| Command | Description |
|---|---|
| `npm test` | Run all 305 tests (unit + integration) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | V8 coverage → terminal + `coverage/index.html` (HTML report) |
| `npm run test:ui` | Vitest browser UI |
| `npm run check:coverage` | Flag changed files below 50% coverage threshold |

Coverage thresholds are enforced in `vite.config.ts`:
- `src/core/utils/**` — 80% statements, 70% branches, 80% functions
- `src/core/data/**` — 60% across the board
- `src/hooks/**` — 50% across the board

The `scripts/check-new-coverage.sh` script compares changed files against the coverage report and flags any new/modified source file below 50% — run it before merging to catch untested code.

### Bundle Optimization

The build uses manual chunk splitting to keep the initial load fast:

| Chunk | Size | Gzipped | Caching |
|---|---|---|---|
| App code | 319 KB | 88 KB | Changes per deploy |
| MapLibre GL | 802 KB | 217 KB | Cached across deploys |
| React vendor | 141 KB | 45 KB | Cached across deploys |
| 198 country rules | ~10 KB each | ~4 KB | Lazy-loaded on demand |
| CSS | 123 KB | 19 KB | Changes per deploy |

MapLibre and React are split into separate chunks that cache independently — users only re-download the app code on updates.

### Error Handling & Bug Reports

A global `ErrorBoundary` catches React render crashes and shows a recovery UI with:
- **Try Again** — resets error state and navigates to Trips view
- **Copy Info** — copies version, stack trace, viewport, and localStorage keys to clipboard
- **Report** — opens a pre-filled GitHub issue with debug context

Build metadata (`__APP_VERSION__`, `__BUILD_TIME__`) is injected at compile time for traceability.

For detailed architecture, code structure, design patterns, and data model, see [DESIGN.md](./DESIGN.md).

---

## Getting Started

```bash
npm install
npm run dev            # http://localhost:5173
npm test               # run all tests (vitest)
npm run test:coverage  # coverage report → coverage/index.html
npm run check:coverage # flag untested changed files
npm run build          # static output → dist/
npm run preview        # preview the build
npm run validate       # full check: tsc + tests + knip + build
```

Deploy `dist/` to Netlify, Vercel, or GitHub Pages (free tier — no server needed).

---

## Future Scope

| Duration | Wow Factor | Feature | Category | Description |
|----------|-----------|---------|----------|-------------|
| 🟢 Short | ⭐⭐⭐ | Cinematic for AI plans | AI | Fuzzy city name matching + AI lat/lng fallback so cinematic works for imported plans |
| 🟢 Short | ⭐⭐ | Budget currency toggle | UX | Convert ₹ to USD / EUR / AUD |
| 🟡 Medium | ⭐⭐⭐ | Import parser quality | AI | Better ChatGPT link extraction, React Router stream data, entity cleanup |
| 🟡 Medium | ⭐⭐⭐ | Multi-country trip builder | Core | String countries into a single trip with total cost/days |
| 🟡 Medium | ⭐⭐ | Calendar sync | Export | Export itinerary as `.ics` file |
| 🟡 Medium | ⭐⭐ | Enriched AI response schema | AI | lat/lng per city, transport type per leg in LLM output |
| 🔴 Long | ⭐⭐⭐⭐ | Visited stats page | Analytics | Continents, total days, spend, heatmap timeline |
| 🔴 Long | ⭐⭐⭐ | Community itineraries | Social | Import/export rule data for sharing |
| 🔴 Long | ⭐⭐ | Seasonal flight cost hints | Data | Rough fare ranges from public sources |
| 🔴 Long | ⭐⭐ | Voice input for chat | AI | Speak trip requests instead of typing |
| 🔴 Long | ⭐⭐ | Drag-and-drop trip reorder | UX | Reorder trip group add-ons |
| 🔴 Long | ⭐ | Real-time pricing | Integration | Flights/hotels API integration |
| 🔴 Long | ⭐ | Social layer | Social | Follow friends, see where they've been |
