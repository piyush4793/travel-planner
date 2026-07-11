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
│   │   ├── useSavedTrips.ts       # Saved-trip snapshot store (My Trips)
│   │   ├── useAiPlanStore.ts      # AI plan persistence (max 3 per destination)
│   │   └── usePersistedSet.ts     # Reusable Set<string> + storage persistence
│   ├── data/
│   │   ├── itineraryRules.ts      # Rule-backed itinerary types/data
│   │   └── consolidatedCountry.ts # Lazy country-rule loader shared by hooks
│   └── utils/
│       ├── savedTrips.ts          # Saved-trip snapshot types + pure builder
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
│   │   ├── MyTripsView.tsx        # Saved-trip gallery (My Trips) + SavedTripCard
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
| `useSavedTrips` | Saved-trip snapshot store (My Trips): upsert by route, favorite, remove |
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

User edits stored as full objects in `tp_customs`. On load, customs override seed entries by name; `tp_deleted` tombstones removed seeds. Applied to countries (this pattern no longer covers trips — saved trips are independent snapshots keyed by route signature; see the Saved Trips section).

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
| `multiCountryPlanning` | `true` | free | Multi-select destination picker + trip tray on `#plan` (up to `MAX_TRIP_UNITS`); enabled by default |

### Guided planning wizard (`#plan`)

Flag-gated (`guidedPlanning`, on by default) one-way planning funnel, distinct from the Country Panel's Plan tab. Lives in `src/components/views/plan/` and is orchestrated by `PlanView.tsx` + `usePlanBuilder`. **It is the app's default landing view** when the flag is on — `App` passes `useHashView(guidedPlanning ? "plan" : "trips")` and the brand/Home button routes to the same landing.

- **Steps**: **Basics** (party size via `PillGroup accent="emerald"` + vibe/experience chips, with a live `PlanProgressSummary`) → **Which places?** (`PlanPlacesStep` — a *decision surface*: a consolidated dark **header card** carrying country identity + trip stats + a trip-scoped **"Who's going"** basis, then decluttered decision cards in a two-up grid on wide screens, a single per-country **Filters** control and **Sort**; shown only when a stop has cities) → **Your trip** (the two-rail workspace). Steps are `["basics", ...(anyUnitHasCities ? ["cities"] : []), "review"]` — the Places step is conditional (skipped when no stop has cities) and the primary stop shares the same `usePlanBuilder` city state as the workspace's left rail, so picks stay in lock-step whether edited in the step or beside the itinerary; additional stops are curated via `useTripPlanner` and composed into the header stats. On desktop the Places step breaks out to `max-w-5xl` (vs. `max-w-2xl` for other steps) for the two-column workspace.
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
- **Itinerary + share + jump-nav** (`PlanPreviewPane`): a pinned slim emerald bar carrying the **destination label + a "↑ Top" jump-to-top** control (trip stats live authoritatively in `PlanTripHeader`, so the bar no longer repeats duration/cost), then the jump-to-city nav (`PlanCityJumpNav`), then the day-by-day `ItineraryView variant="luxury"`, then a pinned "📤 Share my plan" button reusing `useItineraryShare` (native-PDF-file → native-text → clipboard; needs `homeCountry`, threaded App → PlanView → workspace → pane). **`PlanCityJumpNav`** mirrors the Itinerary Modal: **desktop** shows wrapping clickable pills (built from `groupDays(plan.days, rule)`, separated by `TRANSPORT_EMOJI` legs); once a route grows past 5 cities (or spans multiple countries) it **collapses to a compact, country-grouped "Jump to city…" dropdown** (per-city day counts + transport icons, `role="listbox"` with `role="group"` country headers). The dropdown is **portaled to `document.body`** (never clipped by an `overflow-hidden` canvas ancestor) with viewport-collision + flip-up on desktop and a **bottom-sheet on mobile** (Escape/outside-click close). An optional `onJump(city)` callback lets a host expand a collapsed country segment before scrolling; the default scrolls straight to the `city-<name>` anchor.
- **Self-contained, no Country-Panel coupling**: the Plan page never opens the single-country `CountryPanel` — that artifact can't represent the roadmap's multi-country (≤4) trips, so combine-with pills render as plain informational chips (they become "add to trip" in the multi-country phase) and there is no "open full details" link out to the panel.
- **Landing picker ordering** (`DestinationPicker`): the "From your list" board is ordered **favorites → remaining (unvisited) → visited**, each group sorted by `popularityScore` desc (tie-break by name via `byPopularity`); "Popular to explore" follows, also popularity desc. Chips carry a ★ (favorite) and ✓ (visited) marker.
- **Resumable draft**: the funnel persists to `LS_KEYS.PLAN_DRAFT` via `planDraft.ts` (`load/save/clearPlanDraft`) — the ordered **`countries`** selection, step, cities, experiences, days, and pin survive refresh (`loadPlanDraft` migrates the legacy single-`country` shape to `countries: [name]`). `usePlanBuilder` takes an optional `initial` seed and guards its reset-on-country-change effect (skips first mount) so a hydrated draft isn't wiped. Backing out of destination selection clears the draft. Desktop rail collapse persists separately to `LS_KEYS.PLAN_UI`.
- **Multi-country selection (flag `multiCountryPlanning`, on by default)**: with the flag on, `DestinationPicker` chips toggle into an ordered selection (capped at `MAX_TRIP_UNITS` from `core/utils/multiCountry.ts`; pure `toggleTripSelection` helper) confirmed via a sticky **"Plan trip →"** tray; `onStart(countries)` seeds `PlanView`'s `selection` state (`picked = selection[0]`). With the flag off, a chip tap starts a single-country trip immediately (`onStart([c])`) — unchanged behaviour. The multi-country **Review** step composes and renders every stop as a segmented "Route Canvas" (see below).
- **Surfaces mold from the selection via the `DestinationSource` seam** (`src/core/trip/destinationSource.ts`): a scope-keyed port `{scope, unitNoun(Plural), popular(), resolveUnit(), comboRecommendations(), dayBounds(), experiencesFor(names), loadUnit(name)}`. `getDestinationSource(scope)` returns the registered source — only `international` today (`internationalSource.ts`); a future `domestic`/India scope implements the same port over cities and every wizard surface renders unchanged. Nothing in the surfaces assumes "country". Key molded surfaces:
  - **`PlanRouteSummary`** (multi only) — a read-only route timeline built purely from `selection` + `source.dayBounds(name).rec`. Sums per-stop *recommended* baseline days (`~N days`, explicitly labelled **recommended** with an ⓘ tooltip, since real per-stop tuning happens downstream), badges the single longest stop **Anchor** (`Math.max` of the leg days), and draws a dot/connector rail. Single-destination selections skip it and show the live `PlanProgressSummary` instead.
  - **`PlanBasicsStep`** — party size always; **vibe pills** whenever the selection offers experience tags. For one unit these are its own tags; for a route they are the union of every chosen unit's experiences, loaded via `useTripExperiences(names, source)` (a stale-guarded hook over `source.experiencesFor`). Vibe overflow is handled by a **height-bounded scroll container as the base safeguard** (never a hard cap) plus a UX-only `visibleCap` prop (default `DEFAULT_VIBE_CAP=10`, `Infinity` disables) with a "+N more"/"Show less" toggle that sits outside the scroll area; any *selected* tag stays visible past the cap.
  - **`PlanPlacesStep`** — a *decision surface* over normalised `PlacesUnit[]`, Design D layout regardless of stop count. A consolidated dark **header card** carries: country identity (a static flag + name for one stop; a **dropdown country switcher** with a place-count badge for a multi-stop route — one stop at a time, scaling to any count / long names via `line-clamp`), trip **stats** (days · places · countries[multi only] · budget) and a trip-scoped **"Who's going"** dropdown (`budgetBasis`). Below it a section title (`Cities in {name}`) with an overflow-safe **focus subline** (`summarizeFocus`), a single per-country **`PlanFilters`** control (hosts that stop's **experiences**; anchored popover on desktop / bottom-sheet on mobile via `useBreakpoint`; count badge; hidden when the stop offers no tags) and a **Sort** dropdown. **Decision cards** follow design **"D3"** — a two-column card: the left column carries a ✓/+ affordance, city name, a one-line "known for" **brief** (`city.notes`) and **experience chips** (the traveller's `focusMatches` lit emerald, a few `otherExperiences` muted, capped at `MAX_CHIPS`); the right rail carries ≈recommended nights · ☀best window · ⚠**avoid window** (`worstMonths`) · a sparse "Top for X" signal — laid out in a two-column grid on `lg`; non-included cities collapse behind a "Show N more" tail. Each card carries an **ⓘ** affordance (non-nested — a full-card toggle still adds/drops the stop) that opens **`CityDetailModal`**, a responsive detail surface (bottom-sheet on mobile / centered modal on tablet+desktop via `useBreakpoint`, over the shared `ModalShell`) with the full `city.notes` brief, uncapped experience tags (focus lit), the ≈recommended stay and full ☀best/⚠avoid windows, and an add/remove action mirroring the card. Once a stop is hand-picked the **focus subline** (`summarizeFocus`) gains an **Edited** flag + an inline **↺ Reset to suggested** revert (`onClearCities`). All popovers/switchers reuse the portal `PlanMenu`. Experiences are **per-country** (see below); the header stats span the whole composed route.
  - **Header route summary** — long multi-country routes name the first `HEADER_ROUTE_STOPS` (2) stops, then a **+N** pill (wrapped in the shared portal `Tooltip`) reveals the full ordered route on hover/focus/tap; the `<h1 aria-label>` gives screen readers the complete route. No silent truncation.
- **Multi-unit trip funnel** (Basics · Places · Review all composed). The primary stop stays on `usePlanBuilder`; every *additional* stop is loaded and curated together, then all stops are composed into one plan:
  - **`source.loadUnit(name)`** resolves a unit name to a plan-ready `{country, rule}` (`LoadedUnit`) — the seed merged with detail data plus its rule chunk (the international impl uses `loadConsolidatedCountry` + `mergeCountryData`, falling back to `consolidatedToCountry` when there's no seed).
  - **`useTripRules(names, source)`** — a stale-guarded loader that resolves an array of units via `loadUnit` (mirrors `useTripExperiences`; unknown units are dropped).
  - **`useTripPlanner(units, seedExperiences, basis)`** — one hook owning `Record<name, {selectedCities, customDays, pinned, experiences}>` for the additional stops (never `usePlanBuilder` in a loop, so the rules of hooks hold as the route grows/shrinks). It derives each stop's itinerary and auto-picked cities, exposes per-unit `toggleCity`/`clearCities`, prunes dropped stops, and `composedPlan(primarySegment)` folds primary + additional stops into one plan. **Experiences are per-country**: `experiences: null` inherits the trip `seedExperiences` (from Basics), a non-null array is an explicit per-stop override (incl. `[]` = "deliberately none here"); `effectiveExperiences(name) = override ?? seed` drives that stop's city ordering, day recommendation and plan, and `toggleExperience`/`clearExperiences` diverge one stop without touching its siblings. Each `UnitPlan` exposes its effective `experiences` and its distinct `experienceOptions` (for `PlanFilters`). The primary stop's experiences stay owned by `usePlanBuilder`.
  - **`composeTripPlan(segments, basis)`** (`tripPlans.ts`, pure) — concatenates per-unit `days[]` (each stop keeps its own day numbering; continuous renumbering + rendered inter-unit connectors are a Review-phase concern kept out of `days` so `days.length` stays an honest count), sums cost ranges, names the route in the note, and aggregates warnings. **A single segment returns its plan unchanged, so the single-destination path is byte-for-byte identical.** Scope-agnostic — the same composition will serve a future domestic route of cities.
  - **Review "Route Canvas"** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail`, laid out by the shared `PlanWorkspaceShell`). Multi-country Review normalises the primary funnel (`usePlanBuilder`) + each additional stop (`useTripPlanner`) into one ordered `ReviewSegment[]`, then renders the whole route as one **segmented** itinerary: a composed emerald summary strip + a cross-route jump nav (`groupDays` across every stop) over per-segment blocks. **Route order and anchor are independent display layers** over the pick-ordered segments, tuned from a trip-level **`RouteLeversBar`** that sits once above the segments (so each stop header stays uncluttered — identity · ✏️ Adjust · collapse only): the workspace owns an `order` index permutation (reordered from the levers bar's **Route order** popover — a `RouteOrderEditor` with **drag-and-drop** (⠿ grip, pointer-capture drag with a live drop indicator for desktop mouse + mobile touch) plus **keyboard Arrow Up/Down** reorder on the focused grip (focus restored to the moved stop), delegating to a pure `moveIndex(from,to)` in `core/utils/routeOrder.ts` — or one-tap **✨ Auto-arrange** — a nearest-neighbour chain from the anchor via pure `orderByProximity`/`haversineKm` in `core/utils/routeOrder.ts`, gated on ≥3 stops with finite coords) and an `anchorName` (importance ★, promotable per stop from the same popover). The levers bar's **Trip length** popover retunes the whole route's total nights, redistributing ±1 across unpinned, not-at-bound stops via pure `pickNightTarget`/`canAdjustLength` (`core/utils/tripLength.ts` — grow the shortest / drain the longest, ties→lowest index; pinned stops hold). Both levers open through the shared **`PlanPopover`** (portaled, anchored on desktop / bottom-sheet on mobile, Escape-restores-focus). Reordering **never unpicks** the primary stop — `composeTripPlan` is re-run in visit order to drive the summary/jump-nav/ledger/toolbar — so the byte-identical N=1 path is untouched. Both reset only when the pick *set* changes. Each block keeps its stop's **own rich `ItineraryView(seg.plan, seg.rule, "luxury")`** (transport separators, route/search/maps links, eat/hotel pills) because the composed plan concatenates days but loses per-country rule association; blocks are **collapsible** (the anchor opens by default, the rest fold to a scannable overview) and show a **cumulative route-relative day range** ("Days 4–8"). Transitions between countries render as **honest border-hop rows** (`BorderHop`): collapsed it is a single "Travel from X to Y" row (no invented transit time); expanded it is an informational **mode picker** — a great-circle-distance-derived indicative **flight** estimate (`~Nh`, from `haversineKm`) plus rail/road honestly marked "varies", since no per-pair transit data exists — and every mode notes hops cost no itinerary days. Each stop's shaping levers open in a focused **Adjust drawer** (`SegmentAdjustDrawer`, a `ModalShell` bottom-sheet on mobile / centered modal on desktop) via the stop's **✏️ Adjust** trigger — a **Shape** tab with the shared `FocusChips` (experience focus) + `CityPicker` (auto → hand-picked cities) + `DayLengthControl` (per-stop length), the *same* controls the single-country `ShapeRail` renders (both consume `usePlanBuilder`/`useTripPlanner` levers through the extracted `FocusChips`/`CityPicker` presentational components, so shaping reads identically single vs multi — DRY), plus a read-only **Details** tab (per-stop reference: best/avoid windows, watch-outs, stopover tip, pairs-with) that only appears when the country carries that data. This replaced the old cramped inline expansion so a segment card never grows unboundedly. The right **`TripContextRail`** is trip-level reference only: a **Trip readiness** checklist (pure honest fallback + border-crossing count via `core/utils/tripReadiness.ts`), an **honest budget ledger** (per-country ×nights line items, an italic inter-country legs estimate, and a "flights extra" subtotal caveat) labelled with the active basis, per-country `MonthHeatmap` seasonality, per-country watch-outs/stopover tips, and a **Notes** scratchpad (`PlanNotesSection`) — sections render only when a country carries the data. The **who's-going basis and headline stats (days/countries/cost) live once in the persistent `PlanTripHeader`** — the rail and levers bar never duplicate the basis switch or the trip totals (the rail only reflects the active basis in the ledger). Each stop's **planning warning** (e.g. length auto-expanded) renders **inside that stop's own segment block**, prefixed with a ⚠️ and attributed to the country, rather than in an ambiguous route-level banner. The **cross-route jump nav** (`PlanCityJumpNav`) shows scannable pills on desktop for short routes but **collapses to a compact, country-grouped, portaled dropdown on every breakpoint once a route exceeds 5 cities** (bottom-sheet on mobile), so dense multi-country routes never crowd the strip; jumping to a city inside a **collapsed** country first expands that country (via `onJump`/`handleJump` + a `requestAnimationFrame` scroll once the day nodes exist) so the target is never a dead anchor. There is **no Shape rail** in multi (each stop is shaped in its own Adjust drawer), so `PlanWorkspaceShell` renders the itinerary with a single reference rail; the shell is shared with the single-country workspace (which passes both a Shape and Context rail). Multi-country **cinematic** is intentionally omitted (cross-country fly-through isn't wired). N=1 never reaches the canvas — `PlanWorkspace` (single) + `PlanPreviewPane` own that byte-identical path.
  - **Shared itinerary atoms**: `ItinerarySummaryBar` (slim route/destination **label + a jump-to-top** control; authoritative days·cost·places live once in `PlanTripHeader` so the bar doesn't repeat them — shared `ITINERARY_TOP_ID` anchor) and `ItineraryToolbar` (Share/Cinematic/PDF/AI, each control self-gated by capability/flag) are extracted so the single-country preview (`PlanPreviewPane`) and the multi-country `TripReviewCanvas` read identically (DRY).
  - **Unified `PlanTripHeader`**: the persistent Plan-journey header (eyebrow + route identity with a single-name style badge or a multi-stop `+N` overflow pill, a slotted **Save-trip** control, and the labeled tappable stepper that doubles as back-nav) is one component shared across Basics/Places/Review, so the header reads consistently at every step. It molds to the selection (single name vs ordered route) and widens to match the Review breakout. On Places/Review it also carries a **progressive stats strip** (whole-route days · places · countries · budget, computed from the composed plan) and a single **"who's going" basis pill** (`BasisMenu`, light variant), and on multi-stop Places it hosts the **country switcher** (`PlanCountrySwitcher`) as its `identitySlot` — so identity/stats/basis render once in the header instead of a per-step dark card (Places dropped its standalone stats card into this header). The header stays layout-only: the save control is slotted in (`saveSlot`), keeping save logic in `PlanView`.
  - **`TripSaveBar`** (header cluster, Review only): saving a trip is fully **decoupled from any country add-to-list** — the wizard **auto-saves the composed trip to My Trips** the moment the traveller reaches Review (and keeps it fresh as they tune it), via a content-signature-guarded effect (`onSaveTrip`, wired in `App.tsx` to `useSavedTrips.upsert`). `TripSaveBar` is a **compact inline affordance** rendered in the `PlanTripHeader` top-right cluster beside the who's-going basis pill (never a full-width banner — it must not eat vertical space above the itinerary): a small **"✓ Saved"** status (details in a tooltip) + **one unambiguous ★ Favourite this trip toggle** that acts on the *saved trip snapshot* (`onToggleTripFavorite` → `useSavedTrips.toggleFavoriteByName`, keyed by the route signature) — the **same meaning of "favourite" as the My Trips ★**. The Plan journey no longer adds countries to My List or favourites countries (that duality was removed). On Review the sticky footer's **"Plan another"** is a **modest secondary** (compact ghost button, right-aligned with a "Trip saved to My Trips" note — never the dominant primary), so the completed itinerary stays the focus and an accidental restart is unlikely. See **Saved Trips** below for the snapshot data model.
- **Luxury emerald/ivory theme**: the whole Plan surface (wizard chrome, `DestinationPicker`, `CityCard variant="luxury"`, `ItineraryView variant="luxury"`, `PlanPreviewPane`, app header) uses an emerald/ivory palette. `CityCard` and `ItineraryView` take a `variant` prop (default = the Country Panel's slate/blue look, unchanged) so the shared renderers wear either skin without forking. `PillGroup` gained an `accent?: "blue" | "emerald"` prop (default blue preserves existing usages).

### Portal pattern

Filter dropdowns, tooltips, and experience picker use `createPortal` to avoid clipping from scroll/overflow containers in header and panel layouts.

### App navigation & header layout

- **Desktop**: a slim **luxury ivory/emerald** top bar (`bg-[#fbf9f3]/90` + backdrop-blur + `border-b border-[#e7e1d2]`) carrying an emerald wordmark + centered view pills (`Plan · Trips · Calendar · Discover`, in an `#efe9db` track — the active pill is `bg-emerald-700 text-white`) + a right cluster of **Install/Open app · Share · Settings (⚙️) · Dev flag panel (dev-only)** (all restyled to the ivory palette: `#efe9db` chips, emerald-filled Install). The PWA `theme-color` (`index.html`) + manifest `theme_color`/`background_color` were aligned to the ivory bar so the mobile status bar/splash blend seamlessly.
- **Mobile**: a **fixed bottom tab bar** (ivory `bg-[#fbf9f3]`, `border-[#e7e1d2]`) owns primary navigation (the 4 views, icon-over-label with an emerald-tinted active pill behind the icon, `safe-bottom`); the top strip shrinks to brand + a compact **Install/Share + Settings** cluster (no hamburger menu / slide-down drawer — both retired). The bottom bar sits in the flex column so content scrolls above it.
- The install slot is context-aware: it shows **Install app** when the browser offers `beforeinstallprompt` (or iOS A2HS guidance), and swaps to a best-effort **Open app** action once `navigator.getInstalledRelatedApps()` reports the PWA is already installed but running in a browser tab. Nothing shows when running standalone.
- App-wide defaults (home country, default budget party size) live inside **Settings → General**, not in the header.
- `FreTour` spotlight targets (`data-tour="nav-*"`, `data-tour="settings"`) resolve to whichever element is visible per breakpoint (desktop pills vs. bottom bar tabs); its mobile positioning places a card above targets in the lower half of the viewport (e.g. the bottom tab bar).

### Saved Trips (My Trips)

- **Snapshot model** (`src/core/utils/savedTrips.ts`): a `SavedTrip` is a **self-contained snapshot** — `{id, name, stops: SavedTripStop[], basis, totalDays, costPerPerson, savedAt, favorite?}`, where each `SavedTripStop` is `{country, days, cities}`. It captures the composed plan at save time and is **independent of My List and rule data**, so a saved trip stays viewable even if the underlying destinations later change or are removed. Pure `buildTripSnapshot(input, now?)` (time injected for testability) builds the persistable fields from the wizard's live plan state; `tripSignature(countries)` joins the ordered route with `" → "` and is the trip's `name`/identity.
- **Store** (`src/hooks/useSavedTrips.ts`): `{savedTrips, upsert, remove, toggleFavorite, reload}` backed by `LS_KEYS.SAVED_TRIPS`. `upsert` is **keyed by route signature** — re-saving the same ordered route updates the existing record in place (preserving its `id`, `favorite` and original `savedAt`) rather than duplicating; new trips prepend (newest-first). `PlanView` builds the snapshot from the ordered `selection` (attaching each stop's own loaded plan where the destination has rule data, so the route identity stays honest even for rule-less secondary stops) and calls `upsert` behind a content-signature guard so identical renders don't re-write storage.
- **View** (`src/components/views/MyTripsView.tsx`): a lightweight gallery — ★ favorites section then newest-first, each `SavedTripCard` showing flags + route name, city chips, `days · places · cost` (with the trip's saved basis icon) and a relative "saved" label; favorite ★ and delete (with `useConfirm`) actions; an empty state with a "Plan a trip" CTA. Each card is a **stretched-action** pattern — a full-card overlay `<button aria-label="Open {name}">` (z-10) reopens the route in the Plan wizard (`onOpen` → `App` seeds `PlanView` via `openTrip={countries,nonce}` and switches to `#plan`, jumping to Review); the favorite/delete controls sit above it (z-20) as siblings so nested-interactive HTML is avoided. Lazy-loaded in `App` like the other views. Backup-recoverable via `BACKUP_KEYS`.
- **Retired**: the old editable **trip-groups** subsystem (`useTripStore`, `tripGroups.ts` seeds/`Region`/`ALL_REGIONS`/`buildMergedTripGroups`, `TripsView` + `views/trips/*` incl. `buildTrips`, the `tripGroups` flag, and the `tp_trip_customs`/`tp_trip_deleted` keys) was removed in favour of this snapshot store. Combos ("Combine with" pills) come from Country rule data, not trip groups, so they're unaffected.

### Budget basis (party size)

- **Single source of truth**: `src/core/utils/budget.ts` owns the `BudgetBasis` type (`solo`/`couple`/`family4`), `DEFAULT_BUDGET_BASIS` (`couple`), basis meta (icon/label/long), `budgetForBasis(country, basis)` (per-basis lookup with fallback to the single `budget` string), `parseBudgetRange(str)` (the canonical `₹XL/₹XK` range parser reused by tiering and trip-cost scaling), and `deriveBudgetBreakdown(solo)` (scales a per-person range into couple/family totals via `BASIS_MULTIPLIER` — couple 1.77×, family4 3.45×, calibrated from the median ratios across all 198 rule-backed destinations). `filterLogic` re-exports `BudgetBasis` and reuses the helpers.
- **Budget tiering**: `getBudgetTier` classifies a budget string by its **range midpoint** — `parseBudgetRange` averages low+high so a `₹1.5L–₹3L` band reads as `mid` (₹2.25L) rather than `budget` off the lower bound alone. Buckets: midpoint ≤₹1.5L `budget`, ≤₹3L `mid`, else `premium`; unparseable strings fall back to `budget` (inclusive). Drives both the Trips budget filter and the Plan-tab day nudge (`BUDGET_DAY_FACTOR`).
- **Two-layer state** (`useBudgetBasis`): a persisted **global default** (`tp_budget_basis`) plus a transient in-session **active** value seeded from it. `setGlobalBasis` persists and resets active to it; `setActiveBasis` is temporary (not persisted). A corrupt stored value is guarded by `isBudgetBasis` and falls back to `couple`.
- **Controls**: **Settings → General** hosts the app-wide defaults — the home-country selector and a `BudgetBasisPills` segmented control (`variant="light"`, with label) bound to the **global** default. The Plan wizard's "who's going" basis pill (`PlanBudgetPanel` / `PlanPlacesStep`) edits only the **active** value (quick "play around") for the in-session itinerary cost.
- **Consumers of active basis**: `CountryPanel` (budget chips + plan generation), `CalendarView` budget cue, and the Plan wizard cost figures. The App threads `activeBasis` to each. (My Trips cards show each trip's *saved* basis, captured in the snapshot, not the live active basis.)
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

type SavedTrip = {
  id: string;
  name: string;              // route signature, e.g. "Japan → Thailand"
  stops: { country: string; days: number; cities: string[] }[];
  basis: BudgetBasis;
  totalDays: number;
  costPerPerson: string;
  savedAt: string;           // ISO
  favorite?: boolean;
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
| `tp_saved_trips` | Saved-trip snapshots (My Trips) |
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
- `src/utils/backup.ts` — `backupToTarget()` requests `navigator.storage.persist()` then writes via the active target (falling back to a download if not ready); `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and `getBackupTargetKind`/`setBackupTargetKind` support the flow. The serialized `BACKUP_KEYS` set covers all recoverable trip data — My List, visited, favorites, custom destinations + tombstones, home country, **budget basis (party size)**, **saved trips (My Trips)**, feature flags, LLM provider selection, and saved AI plans — each shape-validated on restore; sensitive `LLM_KEYS` are intentionally excluded. Saved trips (and their favorites) therefore survive backup/restore and re-appear in the My Trips dashboard.
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
  - default-hash landing (Plan when guided planning is on, else Trips) and route switching across top-level views
  - cross-view country selection wiring into `CountryPanel`
  - Calendar month-filter pipeline (fed the whole My List, independent of other views)
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
- **Memoization**: `useMemo` across `App.tsx`, `useCountryStore`, `MyTripsView`, `CountryPanel` (month sets/grid), and `ItineraryModal` (day grouping)
- **Stale update guards**: `useCountryRule` + `fetchCountryInfo` discard results when selection changes before the fetch resolves

---

## Tailwind Conventions

- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config
