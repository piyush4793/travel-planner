# Design & Architecture

Technical documentation for Roamwise — code structure, design patterns, data model, and implementation details.

For features, setup, and user-facing docs, see [README.md](./README.md).

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, static output |
| UI | **React 18 + TypeScript** | Component model + type safety |
| Styling | **Tailwind CSS** | Utility-first, zero runtime |
| Map | **MapLibre GL JS** | Free OSM fork, no token |
| Tiles | **Carto Voyager** | Free vector tiles, no API key |
| Images | **Wikimedia Commons API** | Free, CORS-enabled |
| State | **Custom hooks + localStorage** | No external state library |
| Routing | **URL hash** | Zero deps, back/forward works |
| Data | **Local JSON** | Ships with app, works offline |
| Tests | **Vitest** | Unit + integration coverage with Testing Library |

**Zero runtime dependencies** beyond React + MapLibre. No routing library, no state management library.

---

## Project Structure

```
src/
├── App.tsx                        # Root layout, view orchestration, state wiring
├── index.css                      # Tailwind + keyframe animations
│
├── core/                          # Platform-agnostic logic (no DOM/component deps)
│   ├── types.ts                   # Shared TypeScript types
│   ├── lsKeys.ts                  # Centralized localStorage key constants
│   ├── featureFlags.ts            # Two-tier feature gate (free + paid)
│   ├── storage.ts                 # StoragePort-backed load/save helpers
│   ├── ports/
│   │   └── StoragePort.ts         # Storage interface
│   ├── adapters/
│   │   └── WebStorageAdapter.ts   # localStorage implementation
│   ├── hooks/
│   │   ├── useCountryStore.ts     # Country CRUD, My List, seed + lazy enrichment
│   │   ├── useTripStore.ts        # Trip group CRUD + seed merging
│   │   ├── useAiPlanStore.ts      # AI plan persistence (max 3 per destination)
│   │   └── usePersistedSet.ts     # Reusable Set<string> + storage persistence
│   ├── data/
│   │   ├── itineraryRules.ts      # Rule-backed itinerary types/data
│   │   ├── tripGroups.ts          # Trip group seeds + merge helpers
│   │   └── consolidatedCountry.ts # Lazy country-rule loader shared by hooks
│   └── utils/
│       ├── ai/
│       │   ├── llmPrompts.ts      # System prompts + context condensation
│       │   ├── llmSettings.ts     # LLM key/provider persistence helpers
│       │   └── llmTransform.ts    # LLM JSON → TripPlan extraction + validation
│       ├── tripPlans.ts           # Itinerary generation (rule engine + generic)
│       ├── citySelection.ts       # DP city selection + day allocation (bounded knapsack)
│       ├── filterLogic.ts         # Pure filter functions (month/budget/experience/visited)
│       ├── transport.ts           # TransportType enum, emoji map, detection
│       ├── travelStyles.ts        # Travel style metadata + defaultDaysForStyle()
│       ├── googleMapsRoute.ts     # Google Maps Directions URL builder
│       ├── planDiff.ts            # Plan summary + diff labels
│       └── months.ts              # Month constants
│
├── hooks/                         # Web/browser hooks
│   ├── useChatSession.ts          # LLM chat state machine
│   ├── useCountryRule.ts          # React wrapper around consolidated-country loader
│   ├── useHashView.ts             # Hash-based routing
│   ├── useBreakpoint.ts           # Reactive breakpoint (mobile/tablet/desktop)
│   ├── useInstallPrompt.ts        # PWA beforeinstallprompt + getInstalledRelatedApps + iOS detection
│   ├── useAppShare.ts             # App-level share (Web Share → wa.me → clipboard)
│   ├── useItineraryShare.ts       # Country/itinerary share (native PDF file → text → clipboard)
│   └── usePanelDrag.ts            # Resizable panel drag behavior
│
├── utils/                         # Web/browser utilities
│   ├── ai/
│   │   └── llmProvider.ts         # LLM provider abstraction (OpenAI/Claude/Gemini)
│   ├── pdfExport.ts               # Print-to-PDF via hidden iframe (mobile: new tab)
│   ├── pdfDocument.ts             # Styled PDF Blob via jsPDF (lazy chunk) for native file share; pdfSafe() sanitizes to Latin-1; notes reuse parseNoteItems (practicalNotes.ts)
│   ├── importParser.ts            # Multi-strategy text/link plan parser
│   ├── wikiImages.ts              # Wikimedia Commons image fetch + cache
│   ├── vehicleMarkers.ts          # Cinematic vehicle SVG assets + DOMParser-based node builder (no innerHTML)
│   ├── mapMarkers.ts              # Pure MapView marker element + hover-geometry helpers (unit-tested)
│   ├── countryInfo.ts            # Wikipedia/Wikidata country facts fetch + cache
│   ├── planningLinks.ts           # Curated external planning links per country
│   └── backup.ts                  # Full backup/restore, CSV/XLSX export, Save As dialog
│
├── components/
│   ├── views/
│   │   ├── TripsView.tsx          # Trip cards + progress ring (orchestrates trips/*)
│   │   ├── trips/                 # Memoized TripsView subcomponents (render isolation)
│   │   │   ├── types.ts           # Trip type + buildTrips()
│   │   │   ├── TripCard.tsx       # memo'd card (+ memo'd ImageCollage, getSharedExperiences)
│   │   │   ├── TripEditor.tsx     # memo'd inline trip editor
│   │   │   └── TripSection.tsx    # collapsible + paginated section wrappers
│   │   ├── CalendarView.tsx       # Month × destination heatmap grid
│   │   └── DiscoverView.tsx       # 197-country catalog browser
│   ├── country/
│   │   ├── CountryPanel.tsx       # Right-side detail panel
│   │   ├── CountryForm.tsx        # Add/edit modal form
│   │   ├── ItineraryModal.tsx     # Day-by-day itinerary modal
│   │   ├── ItineraryCinematic.tsx # Animated map fly-through (React shell — lifecycle + render)
│   │   ├── cinematic/
│   │   │   └── engine.ts          # Pure fly-through engine: path/bezier/bearing math, city-stop grouping, marker builders, rAF loop (unit-tested)
│   │   └── PlanCompareModal.tsx   # Side-by-side plan comparison
│   ├── ai/
│   │   ├── ChatModal.tsx          # LLM chat + import interface
│   │   ├── AiItineraryModal.tsx   # AI-generated itinerary display
│   │   ├── SettingsModal.tsx      # Sidebar-nav settings shell (General / AI / Backup)
│   │   └── settings/
│   │       ├── SettingsNav.tsx    # Responsive tablist rail (vertical desktop / scroll mobile)
│   │       ├── GeneralSettings.tsx # Home country + default budget basis + About
│   │       ├── ProviderPicker.tsx # Visual radiogroup LLM provider picker (cards)
│   │       └── SettingsUI.tsx     # Shared primitives: SectionCard / StatusBanner / FieldLabel
│   ├── map/
│   │   └── HoverCard.tsx          # Wikipedia photo card on map hover
│   └── shared/
│       ├── Filters.tsx            # Shared filter primitives (legacy/global wiring reference)
│       ├── PillGroup.tsx          # Segmented pill toggle
│       ├── FilterChip.tsx         # Portal-based dropdown chip
│       ├── ExperienceDropdown.tsx # Experience tag multi-select
│       ├── HomeCountrySelector.tsx# Home country dropdown
│       ├── DevFlagPanel.tsx       # Dev-only feature flag panel
│       ├── AppInstallShare.tsx    # Header/menu Install / Open-app / Share controls
│       ├── FreTour.tsx            # First-run guided tour (hero/spotlight/install cards)
│       └── Tooltip.tsx            # Portal-based tooltip

data/
├── rules/
│   ├── index.json                 # Manifest: 198 itinerary-backed destinations
│   └── {country}.json             # 198 lazy-loaded per-country rule files
├── worldCatalog.json              # 197-country sovereign catalog for Discover
└── wishlist.md                    # Product backlog / scratchpad

public/
├── manifest.json                  # PWA manifest (name, PNG+SVG icons, display mode)
├── sw.js                          # Service worker (cache-first statics, network-first HTML)
├── icon-192.png / icon-512.png    # PNG app icons (Android/Chrome install criteria)
├── icon-maskable.png              # Maskable PNG icon for Android adaptive icons
├── icon-*.svg                     # SVG icon sources (also listed in manifest)
└── og-image.png                   # 1200×630 Open Graph image for link previews
```

---

## Key Design Patterns

### Hooks own state domains

| Hook | Domain |
|---|---|
| `useCountryStore` | Country CRUD, My List, favorites, visited |
| `useTripStore` | Trip group management |
| `useAiPlanStore` | AI plan persistence (save/replace/compare) |
| `useChatSession` | LLM chat state machine (messages, finalize, tokens) |
| `useCountryRule` | Lazy-loading and caching consolidated per-country rule JSON |
| `usePersistedSet` | Reusable `Set<string>` + localStorage (DRY); reconciles cross-tab via `storage` events |
| `useHashView` | URL hash routing |
| `usePlanBuilder` | Guided planning funnel: rule loading, day auto-seed + pin, live plan, auto→explicit city materialization |
| `useBreakpoint` | Responsive breakpoint state |
| `useInstallPrompt` | PWA install prompt capture, installed-in-browser detection (`getInstalledRelatedApps`) + `openApp`, iOS detection |
| `useItineraryShare` | Country/itinerary share: native PDF file (lazy jsPDF) → native text → clipboard |
| `usePanelDrag` | Resizable country panel behavior |
| `useLifecyclePrompts` | Soft lifecycle nudges (favorite/backup/add-to-list) — one at a time by priority, debounced, permanent dismissal or backup snooze-by-baseline |

No Redux, no context providers. `App.tsx` calls hooks and passes results as props.

### Core/web split

`src/core/` owns reusable domain logic, storage-backed state, and pure utilities. Web-facing code depends on core via relative imports, while adapter seams (`StoragePort` + `WebStorageAdapter`) isolate browser persistence from the rest of the application.

### Seed + Overrides

User edits stored as full objects in `tp_customs`. On load, customs override seed entries by name; `tp_deleted` tombstones removed seeds. Applied to both countries and trip groups.

### Rule engine

```
useCountryRule(name) → import.meta.glob → data/rules/{name}.json (lazy, cached)
generateTripPlan(country, style, cities, days, rule)
  ├─ rule found → per-day activities, costs, hotels, routes from rule data
  └─ no rule   → generic algorithm fallback for resilience/custom entries
```

All 198 manifest destinations currently ship with offline rule JSON coverage, but the generic fallback remains as a safety net.

### City selection & day allocation (`citySelection.ts`)

When a rule-backed itinerary is generated for **D** days, the engine must decide
*which* cities to include and *how many* days each gets. This is solved optimally
with a **bounded-knapsack dynamic program**, not greedy heuristics:

```
scoreCities(rule)            → per-city importance from real signals:
                               recDays (0.5) + content depth days.length (0.3)
                               + route prominence (0.2)   [popularity proxy]
cityDayValue(bounds, days)   → concave satisfaction: 0 below min, 0.7× at min,
                               1.0× at recDays, 1.15× at max (diminishing returns)
planItinerary(cities, D, …)  → DP over dp[t] = best value using exactly t days;
                               reconstructs allocation, fills exactly D when
                               feasible, else the fullest reachable trip
```

- **Concavity** makes the DP spread days across more worthwhile cities rather than
  over-stuffing one, while still filling the requested trip length.
- **Experience anchoring**: when the user focuses one or more experiences (and has
  *not* hand-picked cities), auto-selection is narrowed to the top one or two
  cities that deliver those experiences best (`topExperienceCities()` in
  `tripPlans.ts` — ranked by number of experience matches, then `scoreCities`
  importance, capped at `EXPERIENCE_CITY_LIMIT`). This keeps an experience trip
  anchored on the strongest destinations instead of sweeping in every city that
  merely lists the tag; it falls back to the full pool if nothing matches.
- `includeAll: true` (used when the user hand-picks cities) keeps every city and
  only allocates days; auto mode may drop low-value cities to fit a tight budget.
- Below-minimum budgets fall back to the single most valuable city (or all cities
  at their minimum when inclusion is forced), so callers always get a usable plan.
- Complexity **O(n·D·R)** — trivial at real scale (n≈4–8, D≤~40). Correctness is
  guarded by a brute-force optimality test.

Editing a country's **travel style** re-seeds the default day count via
`defaultDaysForStyle()` (touch-and-go ≈ 60% recDays, explorer = recDays,
immersive = maxDays); the day slider then feeds `planItinerary`.

### Feature flags

Two-tier gating lives in `src/core/featureFlags.ts`. Paid features require both `paidFeatures=true` and the individual flag to be enabled.

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate for premium features |
| `llmPlanning` | `true` | paid | AI trip planning flow |
| `pdfExport` | `true` | paid | PDF export from itinerary views |
| `searchableHomeCountry` | `false` | free | Searchable home-country picker |
| `guidedPlanning` | `true` | free | Guided planning wizard (`#plan` view) |
| `tripGroups` | `false` | free | Multi-country trip group annotations |

### Guided planning wizard (`#plan`)

Flag-gated (`guidedPlanning`, on by default) one-way planning funnel, distinct from the Country Panel's Plan tab. Lives in `src/components/views/plan/` and is orchestrated by `PlanView.tsx` + `usePlanBuilder`. **It is the app's default landing view** when the flag is on — `App` passes `useHashView(guidedPlanning ? "plan" : "trips")` and the brand/Home button routes to the same landing.

- **Steps**: **Basics** (party size via `PillGroup accent="emerald"` + vibe/experience chips, with a live `PlanProgressSummary`) → **Which places?** (auto-picked `CityCard variant="luxury"` list you can add/drop) → **Your trip** (the two-rail workspace). Steps are `["basics", ...(cities.length ? ["cities"] : []), "review"]` — the Places step is conditional (skipped when the destination has no cities) and shares the same `usePlanBuilder` city state as the workspace's left rail, so picks stay in lock-step whether edited in the step or beside the itinerary.
- **Header actions**: the wizard header shows a **travel-style badge** (`STYLE_META[primaryStyle]` — 🏃/🔭/🌿), a **Favorite ★** toggle, and a **Visited** toggle (`aria-pressed`), all bound to the active destination via the shared `PlanActions` bundle (`planActions.ts`). The redundant duration·cost chip is hidden on the Review step (the pane's summary bar already carries it).
- **`PlanActions` bundle** (`planActions.ts`): a country-bound action set (visited, favorite, aiPlanCount, notes/onSaveNotes) that `PlanView` pre-binds to `displayCountry.name` and threads through `PlanWorkspace` to the rails/pane, so no child ever handles country names — a ready seam for the future multi-country trip composite.
- **Two-rail planning workspace** (`PlanWorkspace`): the "Your trip" step is a three-column responsive layout — left **"Shape your trip"** rail (`ShapeRail`: focus experiences, `CityCard variant="luxury"` picker, `DayLengthControl`), centre **itinerary** (`PlanPreviewPane`), right **"Good to know"** rail (`ContextRail`: **Trip readiness** checklist, budget, when-to-go, tips, **Notes** via `PlanNotesSection`, learn/visa/links). Mnemonic: *left = you change it, right = you read it, centre = the result*. Both rails share the luxury `RailSection` accordion (CSS-grid collapse, `useId` aria-controls). On **desktop** the rails render inline and each collapses to a slim reopen tab (state persisted to `LS_KEYS.PLAN_UI`); on **tablet/mobile** the itinerary fills the screen and each rail opens as a bottom-sheet drawer from a sticky "✏️ Shape trip" / "📌 Good to know" bar (`useBackDismiss` + Escape close). Editing a lever regenerates the centre plan live, so the traveller never steps back through the funnel.
- **Step navigation & Back** (`PlanView`): a labeled, tappable **stepper** (`Basics · Places · Review`) in the header is the back affordance — tap an earlier step to revisit it (no "Step N of M" caption). Device/gesture **Back walks one step at a time** before leaving `#plan`, via a **persistent** `useBackDismiss` guard (a single `open` window spanning multiple dismissable levels that re-arms its history sentinel each Back). Rail drawers register on top, so Back dismisses an open drawer first, then steps. The review footer is hidden below `lg` (the stepper + drawers own navigation); its mobile bar carries no redundant Back button.
- **Pane actions** (`PlanPreviewPane`): a single **slim, low-emphasis action toolbar** (icon + tiny label ghost buttons, evenly distributed — matching the app's icon-control convention, not a wall of CTAs) with **📤 Share** lightly emphasised (emerald) as the suggested action, plus **🎬 Cinematic** (only when `rule` data exists and ≥2 plan cities match the country's known cities — same guard as the Country Panel; lifts a `cinematicPlan` in `PlanView` that renders the lazy `ItineraryCinematic` overlay + toggles `onCinematicChange` so the always-mounted `MapView` flies behind the UI), **📄 PDF** (gated by `pdfExport`), and **✨ AI plan** (gated by `llmPlanning`). The cinematic overlay auto-closes when the destination changes.
- **Right-rail Notes** (`PlanNotesSection`): mirrors the Country Panel notes behaviour (400ms debounce + blur flush, 4,000-char cap, "✓ Saved" flash) in the luxury theme; re-seeds on destination change; only renders when `onSaveNotes` is wired (i.e. `App` passed `store.updateNotes`). Has a header row ("Auto-saved as you type" + an **Expand** button) — the header gives the focus outline top-clearance so it isn't clipped by `RailSection`'s `overflow-hidden` — and an **expand-to-fullscreen** editor (bottom-sheet on mobile, centered dialog on `sm+`, Escape/backdrop/× to close) that shares the same value + handlers.
- **Inferred length, tuned in the rail**: there is no standalone "how many days" step — length is inferred (`recommendedDaysForSelection`) and adjusted by `DayLengthControl` (in the Shape rail), a slider that commits on release, previews consequences inline (`projectCities`), and only opens a confirm dialog when shortening would drop a *hand-picked* city.
- **Auto→explicit city materialization**: while `selectedCities` is empty the plan auto-selects cities (DP fit); the Shape rail's city picker shows those as checked via `autoSelectedCities` (the country's real cities the auto plan visits, filtered from route labels). The first `toggleCity` **materializes** the auto set and applies the toggle (so tapping a pre-checked city removes it) and **pins the day count** so curating doesn't silently inflate length. "Reset to auto" clears the picks and unpins. The rail's city list caps its height (`max-h-[22rem]`) and scrolls locally, so a many-city country never makes the rail endless.
- **Per-party-size budget** (`PlanBudgetPanel`, in the Good-to-know rail): shows solo/couple/family totals side by side (via `getBudgetBadges(country, null)` + `BUDGET_BASIS_META/ORDER`) and lets the traveller switch the active basis inline (`setBudgetBasis`) so the itinerary's cost figure updates without stepping back. Totals are a static full-trip reference (an ⓘ tooltip says so); the centre summary carries the live figure. Falls back to a single figure when a country has no `budgetBreakdown`.
- **Good to know** (`ContextRail`): distills the Country Panel's reference surface into the luxury theme — budget (above), a `MonthHeatmap` "When to go", stopover/watch-outs/pairs-with tips, and the lazy `LearnAboutSection`/`PlanningResourcesSection`/`UsefulLinksSection` research links. Each section renders only when the destination carries that data, so the rail never shows empty chrome.
- **Itinerary + share + jump-nav** (`PlanPreviewPane`): a pinned emerald summary bar (duration·cost·basis), then the jump-to-city nav (`PlanCityJumpNav`), then the day-by-day `ItineraryView variant="luxury"`, then a pinned "📤 Share my plan" button reusing `useItineraryShare` (native-PDF-file → native-text → clipboard; needs `homeCountry`, threaded App → PlanView → workspace → pane). **`PlanCityJumpNav`** mirrors the Itinerary Modal: **desktop** shows wrapping clickable pills (built from `groupDays(plan.days, rule)`, separated by `TRANSPORT_EMOJI` legs); **mobile** shows a compact "Jump to city…" dropdown listbox (per-city day counts + transport icons, Escape/outside-click close) so the itinerary keeps its vertical space. Both scroll to the `city-<name>` anchor.
- **Self-contained, no Country-Panel coupling**: the Plan page never opens the single-country `CountryPanel` — that artifact can't represent the roadmap's multi-country (≤4) trips, so combine-with pills render as plain informational chips (they become "add to trip" in the multi-country phase) and there is no "open full details" link out to the panel.
- **Landing picker ordering** (`DestinationPicker`): the "From your list" board is ordered **favorites → remaining (unvisited) → visited**, each group sorted by `popularityScore` desc (tie-break by name via `byPopularity`); "Popular to explore" follows, also popularity desc. Chips carry a ★ (favorite) and ✓ (visited) marker.
- **Resumable draft**: the funnel persists to `LS_KEYS.PLAN_DRAFT` via `planDraft.ts` (`load/save/clearPlanDraft`) — picked country, step, cities, experiences, days, and pin survive refresh. `usePlanBuilder` takes an optional `initial` seed and guards its reset-on-country-change effect (skips first mount) so a hydrated draft isn't wiped. Backing out of destination selection clears the draft. Desktop rail collapse persists separately to `LS_KEYS.PLAN_UI`.
- **Luxury emerald/ivory theme**: the whole Plan surface (wizard chrome, `DestinationPicker`, `CityCard variant="luxury"`, `ItineraryView variant="luxury"`, `PlanPreviewPane`, app header) uses an emerald/ivory palette. `CityCard` and `ItineraryView` take a `variant` prop (default = the Country Panel's slate/blue look, unchanged) so the shared renderers wear either skin without forking. `PillGroup` gained an `accent?: "blue" | "emerald"` prop (default blue preserves existing usages).

### Portal pattern

Filter dropdowns, tooltips, and experience picker use `createPortal` to avoid clipping from scroll/overflow containers in header and panel layouts.

### App header layout

- Primary header keeps navigation + lightweight app actions only: brand, view navigation, and a slim right cluster of **Share app · Settings (⚙️) · Dev flag panel (dev-only)** plus a conditional **Install app** button.
- The install slot is context-aware: it shows **Install app** when the browser offers `beforeinstallprompt` (or iOS A2HS guidance), and swaps to a best-effort **Open app** action once `navigator.getInstalledRelatedApps()` reports the PWA is already installed but running in a browser tab. Nothing shows when running standalone.
- App-wide defaults (home country, default budget party size) live inside **Settings → General**, not in the header — this declutters the top bar and gives those controls a stable, discoverable home.
- Progress/count telemetry (favorites, visited, total) belongs to Trips page context instead of global top bar.
- Mobile keeps the same model via hamburger utility drawer with compact icon-based actions (Share/Install/Open + Settings + Dev).

### Trips responsive control layout

`TripsView` keeps one filter model but adapts presentation by breakpoint:
- **Mobile**: compact header row with icon-triggered primary/secondary filter panels
- **Tablet/Desktop**: left filter rail (primary Month/Budget/Visited + a collapsible **Trip filters** disclosure for secondary type/status/region + stats) that can itself be collapsed, with right-side results toolbar (filter toggle, search, icon-only list/grid, sort, count, new trip). The secondary disclosure is collapsed by default (auto-expands when any secondary filter is active) so the default rail stays scannable — progressive disclosure mirrors the mobile filter sheet
- **Card invariant**: Trips renders one card per country in My List (trip groups annotate cards but do not suppress standalone country cards)
- **Narrow mobile**: forced list view; wider phones can switch list/grid
- **Popularity sort**: driven by country `popularityScore` sourced from manifest metadata (calibrated to a 1-100 **leisure-only** composite across all 198 destinations: experiences 35% + city depth 20% + seasonality 20% + affordability/value 15% + combo breadth 5% + landmark presence 5%; no arrivals/receipts/work-business inputs), then favorites, then name
- **Experience tags**: experience selection is **panel-local only** — the country panel's Plan tab owns a `selectedExperiences` state that shapes just that country's offline itinerary (anchors auto-selection on the top one or two matching cities via `topExperienceCities()`, boosts those cities' value in the DP, orders matching cities first in the picker, and orders experience-relevant activities first per day). Each `CityEntry` carries an `experiences?: string[]` tag set — an authored override on the rule JSON when present, otherwise derived at enrichment time from the city's notes + itinerary content via the shared `src/core/utils/cityExperiences.ts` matcher (single source of truth, reused by both engine and panel UI). **Authored coverage is now complete**: all 198 rule-backed destinations carry hand-authored, web-verified per-city `experiences` drawn from a fixed **35-tag canonical taxonomy** (Beaches, Islands, Mountains, Hiking, Fjords, Lakes, Waterfalls, Deserts, Volcanoes, Glaciers, National Parks, Wildlife & Safari, Northern Lights, Diving & Snorkeling, Surfing, Water Sports, Skiing, Adventure Sports, Road Trips, Cruises & Boat Trips, History, Ancient Ruins, Museums, Architecture, Temples & Religious Sites, UNESCO Sites, Art & Design, Food, Wine & Vineyards, Nightlife, Markets & Shopping, Festivals, Coffee & Cafés, Hot Springs & Wellness, Luxury & Resorts) — generic, reusable categories rather than per-attraction strings. Every city also carries authored `bestMonths` / `worstMonths?` (full month names, hemisphere/monsoon-correct). There is no global/app-level experience filter; Trips and Calendar never filter by experience
- **Recommended-days slider**: the Plan tab's day slider re-seeds from `recommendedDaysForSelection()` (`tripPlans.ts`) — a pure function of travel style (pacing) and the panel-local city/experience focus (explicit cities → sum of their rec days; a focus experience → sum of the top one or two cities that deliver it best), clamped to `[1, maxDays]`. A ±15% budget-tier nudge (`BUDGET_DAY_FACTOR`) applies **only once the plan is scoped** (cities or experiences picked); a pristine, unscoped panel seeds to the style default so the thumb lines up with the static "Recommended" marker rather than diverging (e.g. Norway premium budget must not push a fresh 19-day baseline to 22). A focus experience sums the top one or two matching cities (`topExperienceCities`), not every match. It reacts whenever style/budget/focus change **until the user drags the slider**, which pins the value (`daysPinned` state) — the intent knobs then keep driving the plan output (auto-selected cities, cost, fit warning) but no longer override the chosen day count. The pin is made legible to the user: while live the slider shows an "✨ Auto-tuned to your style, budget & focus" hint; once pinned it shows a "Custom length" label plus a "↺ Reset to recommended (Xd)" button that clears the pin (letting the re-seed effect run again). Switching country also clears the pin. The static "Recommended Xd" marker is a separate concept: the system's fixed per-country baseline (`getRecRuleDays`), budget-blind, an anchor the user's experimentation deviates from — it never tracks the filters. Panel-local only — never touches App/Calendar state
- **Search ranking behavior**: primary-country matches (including word-prefix matches) rank above combine/related hits; fuzzy fallback is strict and only used when deterministic matching finds nothing; active search keeps relevance order (no popularity re-sort)
- **Results context strip**: desktop results toolbar shows sort + budget-basis context and provides a one-click clear-all reset
- **Compact card rhythm**: grid cards reserve combo-row space and render a low-emphasis "No combo yet" placeholder when suggestions are absent, keeping progress rows aligned
- **List card de-duplication**: combo cards no longer repeat add-ons inline in the header; add-on countries are shown once in the chip row
- **Budget-basis cue**: list card budget chips display the active basis icon (solo/couple/family4) so shown values are unambiguous

### Budget basis (party size)

- **Single source of truth**: `src/core/utils/budget.ts` owns the `BudgetBasis` type (`solo`/`couple`/`family4`), `DEFAULT_BUDGET_BASIS` (`couple`), basis meta (icon/label/long), `budgetForBasis(country, basis)` (per-basis lookup with fallback to the single `budget` string), `parseBudgetRange(str)` (the canonical `₹XL/₹XK` range parser reused by tiering and trip-cost scaling), and `deriveBudgetBreakdown(solo)` (scales a per-person range into couple/family totals via `BASIS_MULTIPLIER` — couple 1.77×, family4 3.45×, calibrated from the median ratios across all 198 rule-backed destinations). `filterLogic` re-exports `BudgetBasis` and reuses the helpers.
- **Budget tiering**: `getBudgetTier` classifies a budget string by its **range midpoint** — `parseBudgetRange` averages low+high so a `₹1.5L–₹3L` band reads as `mid` (₹2.25L) rather than `budget` off the lower bound alone. Buckets: midpoint ≤₹1.5L `budget`, ≤₹3L `mid`, else `premium`; unparseable strings fall back to `budget` (inclusive). Drives both the Trips budget filter and the Plan-tab day nudge (`BUDGET_DAY_FACTOR`).
- **Two-layer state** (`useBudgetBasis`): a persisted **global default** (`tp_budget_basis`) plus a transient in-session **active** value seeded from it. `setGlobalBasis` persists and resets active to it; `setActiveBasis` is temporary (not persisted). A corrupt stored value is guarded by `isBudgetBasis` and falls back to `couple`.
- **Controls**: **Settings → General** hosts the app-wide defaults — the home-country selector and a `BudgetBasisPills` segmented control (`variant="light"`, with label) bound to the **global** default. The Trips toolbar pill edits only the **active** value (quick "play around"), and the Trips clear-all resets active to the global default.
- **Consumers of active basis**: Trips filtering/cards, `CountryPanel` (budget chips + plan generation), `CalendarView` budget cue. The App threads `activeBasis` to each.
- **Header budget strip vs plan cost**: `PanelHeader`'s "Typical budget" strip (`getBudgetBadges`) is a **static full-trip reference** — it shows all three party sizes at once and does NOT react to the day slider or active basis (labeled with an ⓘ tooltip clarifying this). The **live** figure that follows selected days + active basis is the Plan tab cost from `generateTripPlan`.
- **Cost model**: `generateTripPlan(..., basis)` computes plan cost from `budgetForBasis(country, basis)` scaled by `days / recommendedDays` (floor 0.2), so at the recommended length the plan cost equals that basis's budget chip. The resulting `TripPlan.costBasis` records the party basis; `planCostBasisIcon` renders the basis icon (👤/👫/👨‍👩‍👧‍👦) beside the cost, with `planCostBasisLabel` supplying an accessible `title`/`aria-label` (never shown as visible text). AI plans omit `costBasis` and fall back to the 👤 (per-person) icon.

### Country panel interactions

- **Three tabs** (`PANEL_TABS`, `panelTab` state = `overview` | `plan` | `notes`). The former **Info tab is merged into Overview**: decision content (Trip readiness, When to go, Stopover tip, Watch out for, Combine with) is followed by the research group — `LearnAboutSection`, `PlanningResourcesSection`, `UsefulLinksSection` (all in `panel/InfoSections.tsx`). These are lazy collapsibles (`LearnAboutSection` fetches only on expand; the shared `ExternalLinkIcon` is reused across link rows), so the merge adds no eager network and keeps Overview short at rest.
- Header flag rendering uses explicit aliases plus locale region-name resolution and now covers all manifest country names.
- “Combine with” pills are interactive and open the selected country panel — resolving from My List, the seed/custom set, or the catalog — so related destinations open even when not yet added. The panel merges loaded rule data (`mergeCountryData`) over the resolved country, so a not-yet-tracked target still shows full budget/months/experiences/itinerary.
- **Edit form** (`CountryForm`): budget is edited as a **single per-person (solo) field**; couple and family4 totals are derived via `deriveBudgetBreakdown` and shown as read-only icon hints, then written to `Country.budgetBreakdown`. The single `budget` string stays synced to the derived couple value (enrichment convention). Travel style is **single-select** and drives the default day count. `getBudgetBadges` prefers the country's `budgetBreakdown` override over raw rule data, so edits are reflected in the member chips.
- **In-place refresh**: saving updates React state only (no reload). The panel's identity-reset effect keys on `country.name`, and a separate effect re-seeds the day slider from `travelStyle`/rule bounds — so editing budget alone preserves an in-progress plan, while editing style re-seeds the default pacing in place.

### Cinematic map

Reuses the main MapLibre instance via `mainMapRef`. Disables user interaction on mount, adds GeoJSON route sources, animates fly-through with rAF, restores on close.

Playback controls are ref-backed so the imperative animation reads live values without re-running the effect:
- **Pause** (`pausedRef`) — halts rAF ticks and dwell loops.
- **Speed** (`speedRef`, 1× / 1.5× / 2×) — divides every `rafAnimate` duration, `sleep`, `flyTo`/`flyAndWait` duration, and dwell hold, keeping camera flights and route-draw in sync.
- **Skip** (`skipActiveRef` flag) — fast-forwards every segment (`rafAnimate` snaps `onProgress(1)`, skip-aware `sleep`/hold loops resolve, `flyTo`→`jumpTo`) until the next city arrival, where it auto-clears and normal playback resumes. Idempotent, so rapid clicks simply advance more stops without state drift.
- **Prev** (`jumpToRef` target + `runId` replay) — the fly-through is forward-only, so stepping back re-runs the effect from the start with skip active and stops fast-forwarding only once the arrival index reaches the target. `savedViewRef` preserves the true pre-cinematic camera across replays, and `cityPhotoMap` is merged (not overwritten) so photos survive a replay.

---

## Data Model

### Country data tiers

| Tier | Source | Count | Content |
|---|---|---|---|
| **Catalog** | `data/worldCatalog.json` | 197 | `{ name, lat, lng, region }` — Discover view |
| **Manifest** | `data/rules/index.json` | 198 | Browse metadata + `inSeed`, `hasItinerary`, `recDays`, `maxDays`, `popularityScore` |
| **Rule JSON** | `data/rules/{name}.json` | 198 | Consolidated country data + day-by-day itinerary rules |

The Discover catalog remains a 197-country sovereign browse list (now including Antarctica for completeness). The manifest expands coverage to 198 itinerary-backed destinations. Two manifest flags drive starter population: **`inSeed`** identifies the small curated auto-seed (5 destinations — Japan, Thailand, Switzerland, France, Italy) added on first run, and **`creatorPick`** marks the 43-destination **creator's wishlist** offered as an opt-in one-click starter pack in Discover (`src/core/data/creatorWishlist.ts`). Discover also exposes a **reset to starter list** action; both wishlist-fill and reset confirm via dialog and go through `useCountryStore` (`onAddMany` / `onResetList`).

### Core types

```ts
type Country = {
  name: string;
  lat: number; lng: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;              // "₹3L–₹5L" (display fallback)
  budgetBreakdown?: { solo: string; couple: string; family4: string };
  experiences: string[];
  avoid?: string[];
  combo?: string[];
  landmark?: string;           // Wikipedia title for hover image
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;
};

type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};

type LLMTripPlanResult = {
  destinationName: string;
  originCountry: string;
  travelers: number;
  durationDays: number;
  budgetLevel: "budget" | "mid-range" | "luxury";
  assumptions: string[];
  cities: LLMCityInfo[];
  meta: LLMDestinationMeta;
  plan: LLMTripPlan;
};
```

---

## Persistence

All keys live in `src/core/lsKeys.ts` — never hardcode strings.

| Key | Content |
|---|---|
| `tp_my_list` | Country names in user's list |
| `tp_visited` | Visited country names |
| `tp_favorites` | Favorited country names |
| `tp_customs` | User-added/edited Country objects |
| `tp_deleted` | Tombstoned seed country names |
| `tp_home_country` | Departure country (default: "India") |
| `tp_budget_basis` | Persisted global budget party size (default: "couple") |
| `tp_trip_customs` | User-created/edited trip groups |
| `tp_trip_deleted` | Tombstoned seed trip groups |
| `tp_features` | Feature flag overrides |
| `tp_llm_keys` | LLM API keys per provider |
| `tp_llm_provider` | Active LLM provider |
| `tp_ai_plans` | Saved AI plans (max 3 per destination) |
| `tp_last_backup` | ISO timestamp of last backup |
| `tp_backup_frequency` | Reminder cadence: daily / weekly / never |
| `tp_backup_schedule` | Backup reminder schedule metadata |
| `tp_backup_target` | Platform backup destination override (`filesystem`/`opfs`/`download`) |
| `tp_fre_done` | First-run experience completed/dismissed flag |
| `tp_plan_draft` | Guided Plan wizard draft (country / step / cities / experiences / days / pinned) — restores the funnel on refresh |
| `tp_plan_ui` | Guided Plan workspace UI state — desktop left/right rail collapse |
| `tp_lifecycle_dismissed` | Permanently dismissed lifecycle nudge ids (`add-to-list`, `favorite:{country}`) |
| `tp_lifecycle_baseline` | Backup-nudge baseline `{ backupAt, fingerprint }` — resets on backup, advances on snooze |
| `tp_schema_version` | Persisted-data schema version (see Schema migrations) |

### Schema migrations

`src/core/migrations.ts` owns forward-compatible persistence upgrades:

- `SCHEMA_VERSION` is the current on-disk shape version (baseline `1`).
- `MIGRATIONS` is an **append-only, ordered** registry of `{ version, description, migrate }`. Each entry upgrades data _to_ its `version`.
- `runMigrations()` is called once in `main.tsx` **before any hook reads storage**. It applies every pending migration in ascending order, then stamps `tp_schema_version`. It never throws — a failed migration is logged and boot continues (hooks still fall back to defaults via `loadLS`).
- Pre-versioning stores (data present, no version key) are treated as the v1 baseline and simply stamped — no transform, because the shipped shapes _are_ v1.
- To evolve a shape: bump `SCHEMA_VERSION`, append a `Migration` with the new version, and add tests in `src/test/migrations.test.ts`.

### Platform-aware backup targets

Auto-backup is routed to a **capability-based** destination so app data stays findable and restorable per device (one PWA codebase, no desktop/mobile fork):

- `src/core/platform/platformProfile.ts` — pure `detectPlatformProfile(env)` (OS, form-factor, surface, capability flags: File System Access / OPFS / share-files / persistent-storage) + memoized `getPlatformProfile()`. iPadOS (desktop UA + touch points) is classified as iOS.
- `src/core/platform/defaults.ts` — `resolvePlatformDefaults()` chooses a `BackupTargetKind`: desktop prefers `filesystem` (a folder the user picks once, browsable in the OS file manager); mobile prefers silent `opfs`; both fall back to `download`. `autoImport` is enabled only for readable targets.
- `src/core/ports/BackupTargetPort.ts` + `src/core/adapters/backup/*` — swappable targets implementing `write` / `readLatest` / `configure` / `location`. Every persistent target stores data inside a dedicated `Roamwise/` app folder (created on demand via the shared `appDir.ts` helper) as a stable `roamwise-backup-latest.json`, so backups are grouped and re-readable. Filesystem persists the chosen `FileSystemDirectoryHandle` in IndexedDB (`handleStore.ts`) and re-verifies read/write permission.
- `src/utils/backup.ts` — `backupToTarget()` requests `navigator.storage.persist()` then writes via the active target (falling back to a download if not ready); `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and `getBackupTargetKind`/`setBackupTargetKind` support the flow.
- `App.tsx` — on mount, backs up overdue data, or on a fresh/empty device **offers** (never silently applies) a one-click restore when a backup is readable. Settings → Backup shows the active location and controls via `StorageLocationCard`.

### Lifecycle prompts

Soft, non-blocking nudges surfaced at natural moments, at most one at a time and never focus-stealing. `useLifecyclePrompts` (`src/hooks/useLifecyclePrompts.ts`) computes a single priority-ranked candidate (favorite → backup → add-to-list) and debounces it (default 600 ms) so nothing flashes during rapid state changes; `LifecyclePromptToast` (`src/components/shared/LifecyclePromptToast.tsx`) renders it as a bottom-centre `role=status` toast. `App.tsx` gates the toast off whenever any overlay (panel/settings/chat/AI result/form) is open.

- **add-to-list** — armed by `notifySearch()` (first non-empty search in Trips/Discover) when My List is empty; invites the traveller to add a destination.
- **favorite** — armed by `notifyPlanCreated(country)` after an AI plan save/replace, unless the country is already a favorite; its action toggles the favorite.
- **backup** — fires when the data fingerprint (`myList + favorites + visited + AI-plan destinations`) has grown ≥ `backupThreshold` (6) past a persisted baseline; its action runs a backup.

Dismissal semantics differ by intent: onboarding nudges (add-to-list / favorite) dismiss **permanently** via a persisted set (`tp_lifecycle_dismissed`); the backup nudge **snoozes** by advancing its baseline fingerprint (`tp_lifecycle_baseline`), so it returns only once enough *new* changes accumulate. A completed backup (new `tp_last_backup`) re-baselines automatically.

---

## Code Flows

### Offline plan generation
```
CountryPanel → generateTripPlan(country, style, cities, days, rule, basis, experiences)
  → rule engine (experience-aware: boosts matching cities + orders day activities) or generic fallback
  → TripPlan { duration, costPerPerson, days[], note }
  → PlanPreview → Cinematic / Itinerary / PDF / 🗺️ Route
```

### AI plan flow
```
CountryPanel "Plan with AI" → ChatModal (pre-filled prompt)
  → LLM conversation → "Finish & Generate" → extract JSON
  → AiItineraryModal → save/replace comparison
  → useAiPlanStore → appears in CountryPanel dropdown
```

### Import flow
```
ChatModal ImportView → paste text or share link
  → parseImportedText() (JSON → structured → chat extraction)
  → preview + prompt suggestions
  → AiItineraryModal → save/replace
```

---

## Validation

```bash
npx tsc --noEmit    # type check
npm test            # vitest
npm run build       # tsc + vite build
```

Reusable coverage slash command:
- `/tc-improvement <scope>` uses the local `tc-improvement` Copilot skill to execute phased coverage work (integration risk-first -> unit/component depth -> threshold hardening).

### Testing expansion plan (Phase 1)

- Added App-orchestration integration coverage for browser-state hydration and hash-route transitions.
- Added shared test utilities in `src/test/testUtils.ts` for:
  - deterministic localStorage seeding
  - hash-route setup
  - deterministic timer control for timing-sensitive UI tests
- Current threshold policy remains strict for domain logic (`core/utils`, hooks, utils) and intentionally permissive for broad UI shells (`src/components/**`) until additional integration coverage lands.
- **Hard commit gate:** a global floor of **89% statements/lines** is enforced by `vitest run --coverage` (thresholds in `vite.config.ts`), wired into both the pre-commit hook and `npm run validate`. Commits are blocked below 89%. Backup targets are tested against a reusable fake File System (`src/test/support/fakeFileSystem.ts`) covering permissions, the dedicated `Roamwise/` app folder, and read/write round-trips.

### Testing expansion plan (Phase 2 complete)

- Expanded App orchestration integration tests to cover:
  - default-hash fallback to Trips and route switching across top-level views
  - cross-view country selection wiring into `CountryPanel`
  - filter-state interaction effect on Calendar vs Trips pipelines
  - feature-flag-driven AI prop wiring at the top shell boundary
  - Discover add/remove callback wiring into country-store pathways

### Coverage-improvement agent model

Use a phased execution model for coverage work:
1. **Phase 1 (Integration risk-first):** lock critical journeys and known regression paths.
2. **Phase 2 (Component/unit depth):** cover branch-heavy logic inside touched modules.
3. **Phase 3 (Threshold hardening):** raise/verify thresholds only after stable behavioral coverage.

Per phase:
- add tests in small batches,
- keep deterministic mocks for timer/network/storage behavior,
- run full quality gates (`tsc`, `test`, `build`) before advancing.

---

## Performance

- **Code-splitting**: Heavy modals/overlays are lazy-loaded via `React.lazy()` + `Suspense` (~123 KB deferred from initial bundle): `ChatModal`, `ItineraryCinematic`, `SettingsModal`, `AiItineraryModal`, `FreTour`, `CountryForm`, `ItineraryModal`, `PlanCompareModal`
- **Idle-time enrichment**: `useCountryStore` enriches seed countries in `requestIdleCallback` chunks of 10 — first paint renders instantly with minimal seed objects, cards progressively hydrate. Non-seed countries added to My List (e.g. India, `inSeed: false`) are also enriched on demand from their rule JSON, so any tracked destination shows real budget/months/experiences — My List is the source of truth, independent of the seed set. Bare catalog stubs are transparently upgraded to enriched data in `buildCountryList` without discarding user edits.
- **Rule lazy-loading**: 199 JSON files in `data/rules/` loaded on demand via `import.meta.glob`, cached at module level in `useCountryRule`
- **Memoization**: `useMemo` across `App.tsx`, `useCountryStore`, `TripsView`, `CountryPanel` (month sets/grid), and `ItineraryModal` (day grouping)
- **Stale update guards**: `useCountryRule` + `fetchCountryInfo` discard results when selection changes before the fetch resolves

---

## Tailwind Conventions

- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config
