# Travel Planner — Copilot Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner — no backend, no server, purely client-side. All state lives in localStorage. The app currently spans 20+ components, 9 custom hooks, and offline itinerary coverage for all 198 rule-backed destinations.

---

## Build & Validate

```bash
npx tsc --noEmit        # fastest type-check loop
npm test                # Vitest suite (805 tests across 90 files)
npm run test:coverage   # coverage report (must stay ≥ 86% total statements/lines)
npm run build           # tsc && vite build
npm run validate        # tsc + tests(+coverage) + knip + build
```

Run `npx tsc --noEmit` and `npm run build` before and after every change set. Use `npm test` whenever behavior changes or when documentation references current suite counts. `npm run validate` is the full confidence pass.
Before committing, ensure adequate test coverage for the behavior you changed (add or update TCs so regressions are caught).

**Coverage gate (hard):** the pre-commit hook and `npm run validate` run `vitest run --coverage`, which enforces a **global floor of 86% statements/lines** (set in `vite.config.ts` `coverage.thresholds`). A commit is blocked if total coverage drops below 86%. Per-directory thresholds also apply (`src/utils/**` 60/50/60, `src/core/utils/**` 80/70/80, etc.). Raise the floor when coverage rises; never lower it to force a commit through.

Current testing priority:
- Total statement coverage is ~86% (805 tests). Country-detail and itinerary surfaces (`CountryForm`, `ItineraryModal`, `PlanCompareModal`, `CountryPanel`) and the `ai` folder are now covered; the cinematic pure engine (`cinematic/engine.ts`) is unit-tested; `importParser` (incl. `fetchChatLink`), `usePanelDrag`, `useChatSession`, `core/storage`, and `App.tsx` orchestration handlers are covered; the platform-backup stack (`core/platform/*`, `core/adapters/backup/*`, `StorageLocationCard`) is covered via a reusable fake File System helper (`src/test/support/fakeFileSystem.ts`); remaining gaps are the maplibre-heavy `ItineraryCinematic` React shell / `MapView` / `HoverCard` (need a real WebGL context).
- Reuse `src/test/testUtils.ts` helpers for localStorage seeding, route setup, and deterministic timers in timing-sensitive UI tests.
- Prefer `fireEvent` over `userEvent.tab()` for focus-trap/timing-sensitive assertions (jsdom focus timing is flaky).
- `src/components/**` thresholds remain intentionally low in `vite.config.ts`; tighten them now that broad integration coverage exists.

## TC Coverage Agent Workflow

Use this whenever the task is "improve coverage/testing quality":

- Reusable slash command: `/tc-improvement <scope>`
- Backed by local Copilot skill: `tc-improvement`

1. **Plan in phases first**
   - Phase A: high-risk regressions (critical integration paths)
   - Phase B: component/unit gaps in touched modules
   - Phase C: threshold hardening and cleanup
2. **Implement in thin slices**
   - Add a small batch of tests per phase (unit + integration + regression/progression checks).
   - Keep tests deterministic (mock I/O, timers, network, random/time).
3. **Gate each slice**
   - `npx tsc --noEmit`
   - `npm test`
   - `npm run build`
4. **Measure + rebalance**
   - Run `npm run test:coverage` and move next batch to the lowest-value/highest-risk uncovered areas.
5. **Keep quality bar**
   - Prefer behavior assertions over implementation details.
   - Avoid brittle timing/DOM structure coupling.
   - Add regression tests for every bug fix path.

---

## Post-task: update docs

After a clean build, update these three files before reporting complete:

1. `README.md` — user-facing features, flags, and future scope
2. `DESIGN.md` — architecture, data model, persistence, and validation notes
3. `.github/copilot-instructions.md` — agent guidance and repo-specific workflows

Keep the three docs in sync; if one changes terminology or counts, the others should reflect it.

---

## Git

- **Always ask user confirmation before `git commit` and `git push`**
- Feature branches; conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)

---

## Key files

| What you need | File |
|---|---|
| Root layout, view orchestration | `src/App.tsx` |
| Country CRUD, My List, lazy seed enrichment | `src/hooks/useCountryStore.ts` |
| Per-country rule loading + cache | `src/hooks/useCountryRule.ts` |
| Trip group CRUD + merging | `src/hooks/useTripStore.ts` |
| AI plan persistence | `src/hooks/useAiPlanStore.ts` |
| LLM chat state machine | `src/hooks/useChatSession.ts` |
| Hash-based routing | `src/hooks/useHashView.ts` |
| Breakpoint detection | `src/hooks/useBreakpoint.ts` |
| Resizable panel behavior | `src/hooks/usePanelDrag.ts` |
| Shared Back-button overlay stack (mobile: closes topmost overlay first) | `src/hooks/useBackDismiss.ts` |
| Country detail panel | `src/components/country/CountryPanel.tsx` |
| Itinerary modal | `src/components/country/ItineraryModal.tsx` |
| Cinematic map experience (React shell) | `src/components/country/ItineraryCinematic.tsx` |
| Cinematic pure engine (paths, bearings, markers, rAF) | `src/components/country/cinematic/engine.ts` |
| Plan comparison modal | `src/components/country/PlanCompareModal.tsx` |
| AI chat/settings modals | `src/components/ai/ChatModal.tsx`, `src/components/ai/SettingsModal.tsx` |
| Trip planner engine | `src/utils/tripPlans.ts` |
| City selection + day allocation (DP) | `src/core/utils/citySelection.ts` |
| Budget basis (party size) source of truth | `src/core/utils/budget.ts` |
| Feature flags | `src/utils/featureFlags.ts` |
| Platform capability profile | `src/core/platform/platformProfile.ts` |
| Platform backup defaults + target selection | `src/core/platform/defaults.ts`, `src/core/platform/selectBackupTarget.ts` |
| Backup target port + adapters | `src/core/ports/BackupTargetPort.ts`, `src/core/adapters/backup/*` |
| localStorage keys | `src/utils/lsKeys.ts` |
| Trip group seeds | `src/data/tripGroups.ts` |
| Rule manifest + lazy JSON chunks | `data/rules/index.json`, `data/rules/*.json` |
| Discover catalog | `data/worldCatalog.json` |

---

## Features & Views

3 hash-routed views (`#trips`, `#calendar`, `#discover`):

| View | Purpose |
|---|---|
| **Trips** (default) | Dashboard — progress ring, stats, “Next trip” highlight. **One card per My List country** (card count should match list size) with image collages, budget, best months. Sections: ⭐ Favorites → 📋 Planning → ✅ Completed. Tablet/desktop use a collapsible left filter rail + right results toolbar (icon-only list/grid toggle + sort); the rail's secondary "Trip filters" (type/status/region) collapse behind a disclosure by default (auto-expand when active) for a lighter default density; mobile defaults to list (grid toggle on wider phones). Popularity sort uses per-country `popularityScore` metadata (1-100 **leisure-only** composite over all 198 destinations: experiences 35%, city depth 20%, seasonality 20%, affordability/value 15%, combo breadth 5%, landmark presence 5%; then favorites, then name). |
| **Calendar** | Heatmap grid — rows = destinations, columns = months. Green = best, red = avoid, blue = current month. |
| **Discover** | Browse the 197-country sovereign catalog by region. Add/remove destinations from My List. Uses its own filter bar. |

**MapView** is not a standalone route anymore — it stays mounted behind the UI and becomes visible for Cinematic mode.

**Country Detail Panel** — slides in from right (full-screen on mobile):
- Header: name, visited toggle, favorite ★, dedicated edit/delete actions
- Header flag rendering: explicit aliases + locale region-name lookup with full manifest-country coverage
- Travel style badge (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive). In the edit form travel style is **single-select** and sets the default day count via `defaultDaysForStyle()` (touch-and-go ≈ 60% recDays / explorer = recDays / immersive = maxDays)
- Edit form budget is a **single per-person (solo) input** → couple/family4 derived via `deriveBudgetBreakdown` (data-calibrated `BASIS_MULTIPLIER`: couple 1.77×, family4 3.45×) → `Country.budgetBreakdown`; the single `budget` string is kept synced to the derived couple value. `getBudgetBadges` must prefer `country.budgetBreakdown` over raw rule data so edits show in member chips
- Saving edits is an **in-place** panel update (no reload): identity-reset effect keys on `country.name`; a separate effect re-seeds the day slider from `travelStyle`/rule bounds. Editing budget alone preserves an in-progress plan
- Collapsible sections: Experiences, Cities, Stopover tips, Watch out for, Combine with, Links, Notes
- Combine-with pills are clickable and should open that country panel when available in My List
- Trips search should prioritize primary-country matches (including word-prefix matches) over combine/related hits; combine matches can appear but not at the top, and active search should preserve relevance order (do not re-sort by popularity)
- Desktop results toolbar should show context (sort + budget basis) and include a one-click clear-all reset for Trips controls
- Compact Trips cards should keep progress-row alignment; show a low-emphasis "No combo yet" placeholder when combo suggestions are absent
- In list cards, avoid duplicating combine values: do not repeat add-ons inline in the header when add-on chips are shown
- In list cards, budget chips should include a traveler-basis icon (solo/couple/family4) that matches the active Trips budget basis
- `PanelHeader`'s "Typical budget" strip is a **static full-trip reference** (all three party sizes, independent of day slider / active basis) — it carries an ⓘ tooltip saying so; the live day/basis-aware figure is the Plan tab cost. Do not wire the header strip to the slider
- Trip planner: days slider → Generate (offline) or Plan with AI
- Multi-plan selector: switch between Default and saved AI plans
- Plan comparison: side-by-side modal with summary cards, city overlap analysis
- Cinematic mode: animated fly-through of itinerary on map. Icon-only controls with tooltips: **prev stop ⏮**, **pause ⏯**, **skip to next stop ⏭**, and **playback speed** 1×/1.5×/2×. Skip/speed are ref-backed so they steer the imperative animation without restarting it; **prev stop replays from the start (via a `runId` effect bump) and fast-forwards to the target stop**. All camera jumps go through `cleanJumpOptions()` which strips undefined `bearing`/`pitch` (passing `undefined` sets them to NaN → "failed to invert matrix").

**Responsive design** — mobile-first (375px+). Breakpoints: mobile / tablet (768px) / desktop (1024px). `useBreakpoint()` drives reactive layout choices.

---

## Architecture

### Component tree

```
App.tsx  (thin orchestrator — wires hooks to views)
├── Header (brand, nav pills, home country selector, settings/menu only)
├── TripsView / CalendarView / DiscoverView
├── CountryPanel
│   ├── default panel render path
│   ├── CountryForm
│   ├── ItineraryModal
│   ├── PlanCompareModal
│   └── ItineraryCinematic
├── ChatModal
├── AiItineraryModal
├── SettingsModal
└── MapView (hidden unless cinematic mode is active)
```

### Component directory layout

```
src/components/
  ai/       — AiItineraryModal, ChatModal, SettingsModal
  country/  — CountryPanel, CountryForm, ItineraryCinematic, ItineraryModal, PlanCompareModal, cinematic/engine.ts (pure fly-through engine)
  map/      — HoverCard and map internals
  shared/   — PillGroup, FilterChip, Filters, Tooltip, HomeCountrySelector, DevFlagPanel, ExperienceDropdown, AppInstallShare, FreTour
  views/    — CalendarView, DiscoverView, TripsView
  views/trips/ — TripsView subcomponents: types (Trip + buildTrips), TripCard (memo'd), TripEditor (memo'd), TripSection (collapsible + paginated wrappers)
```

### Hooks (state management)

All state is hooks-based — no Redux, no context providers. `App.tsx` calls hooks and passes results as props.

| Hook | File | Responsibility |
|---|---|---|
| `useCountryStore` | `src/hooks/useCountryStore.ts` | Country CRUD, My List, manifest enrichment, favorites, visited |
| `useTripStore` | `src/hooks/useTripStore.ts` | Trip group CRUD + seed merge |
| `useAiPlanStore` | `src/hooks/useAiPlanStore.ts` | Save/load/delete AI-generated plans (max 3 per destination) |
| `useChatSession` | `src/hooks/useChatSession.ts` | LLM chat state machine, token tracking, finalize flow |
| `useCountryRule` | `src/hooks/useCountryRule.ts` | Lazy-loads consolidated country data from `data/rules/*.json` |
| `usePersistedSet` | `src/hooks/usePersistedSet.ts` | Reusable `Set<string>` backed by localStorage |
| `useHashView` | `src/hooks/useHashView.ts` | Hash-based URL routing for the 3 top-level views |
| `useBreakpoint` | `src/hooks/useBreakpoint.ts` | Reactive `mobile` / `tablet` / `desktop` state |
| `usePanelDrag` | `src/hooks/usePanelDrag.ts` | Resizable desktop country panel drag behavior |
| `useBudgetBasis` | `src/hooks/useBudgetBasis.ts` | Two-layer budget party size: persisted global default + transient active |

### Shared UI components — reuse, don't recreate

| Component | File | Usage |
|---|---|---|
| `PillGroup` | `shared/PillGroup.tsx` | Segmented pill toggle |
| `FilterChip` | `shared/FilterChip.tsx` | Portal-based dropdown chip |
| `Tooltip` | `shared/Tooltip.tsx` | Portal-based info tooltip |
| `HomeCountrySelector` | `shared/HomeCountrySelector.tsx` | Feature-gated searchable dropdown |
| `DevFlagPanel` | `shared/DevFlagPanel.tsx` | Dev-mode feature flag toggle |
| `AppInstallShare` | `shared/AppInstallShare.tsx` | Header/menu Install + Share (via `useAppShare`). Install = onboarding-oriented white pill (labeled **"Install app"** at `lg`); shows only when `beforeinstallprompt` fired or on iOS (A2HS hint). When the PWA is already installed but viewed in a browser tab (`installedInBrowser`), Install is swapped for a best-effort **"Open app"** button (`onOpenApp` → opens the in-scope start URL; Chromium may focus the app via `launch_handler`). Share is always present: **header variant copies the link** (`copyLink`, labeled "Share" at `lg`) to avoid the off-position desktop native share popover; **menu variant uses the native share sheet** (`share`) with `wa.me` → clipboard fallback |

---

## Data Model

### Three-tier travel data system

```
Tier 1: World Catalog (data/worldCatalog.json)
  197 sovereign-country entries: { name, lat, lng, region }
  Used by: Discover view, catalog lookups for new additions

Tier 2: Rule Manifest (data/rules/index.json)
  198 itinerary-backed destinations
  Adds: inSeed, hasItinerary, recDays, maxDays, popularityScore
  Used by: initial My List population, slider bounds, lazy-load routing

Tier 3: Consolidated Rules (data/rules/*.json)
  198 per-country JSON files + index.json manifest (199 total JSON files in data/rules)
  Contains: country detail data + day-wise itinerary content
  Loaded lazily via import.meta.glob in useCountryRule
```

Curated starter destinations are controlled by the manifest's `inSeed` flag. Special non-catalog destinations live only in the rule system and still participate in offline itinerary generation.

### Trip groups

Defined in `src/data/tripGroups.ts`. Group multiple countries into a trip. Same seed+overrides pattern as countries — `tp_trip_customs` / `tp_trip_deleted`. In Trips UI, group metadata annotates cards, but every country in My List still gets its own card.

### TypeScript types

All in `src/types.ts`: `Country`, `CityEntry`, `CatalogEntry`, `TravelStyle`, `TripBrief`, `ChatMessage`, `LLMProviderType`, `TokenUsage`, `LLMChatResult`, `BudgetBreakdown`, etc.

---

## Data Flow

### Country lifecycle (manifest → UI)

```
1. data/rules/index.json  ← manifest of all itinerary-backed destinations
2. useCountryStore.buildSeedCountry()  ← creates minimal Country from manifest
3. useCountryRule.loadConsolidatedCountry()  ← async loads data/rules/{name}.json
4. useCountryStore.enrichCountry()  ← converts consolidated data → Country shape
5. useCountryStore.buildCountryList()  ← overlays customs on enriched/seed, skips deleted
6. App.tsx: applyFilters()  ← narrows by month/budget/experience/visited
7. View component renders filtered list
8. CountryPanel shows selected country detail
```

### Seed + Overrides pattern (critical invariant)

This pattern applies to both countries and trip groups:
- **Seed data** = static JSON files, never mutated at runtime
- **Customs** (`tp_customs`) = full `Country[]` of user edits that override seed entries by `name` match
- **Deleted** (`tp_deleted`) = `string[]` tombstones for removed seed entries
- On merge: customs win over seed → deleted seeds are skipped → custom-only entries appended
- `deleteCountry()` for seed entries adds to `DELETED`; for custom entries, just removes from `CUSTOMS`
- `addToList()` for deleted seeds removes them from `DELETED`; new additions are bootstrapped from catalog data

### Filter composition

`src/utils/filterLogic.ts` — filters compose with AND logic in this order:
1. `filterByMonth()` — expands abbreviations, matches `country.bestMonths`
2. `filterByExperiences()` — requires ALL selected tags present
3. `filterByVisited()` — `all` / `visited` / `unvisited`
4. Budget tiering — parses `₹150K`/`₹2L` strings → `budget` / `mid` / `premium` using selected basis (`solo` / `couple` / `family4`) when available

Portal-based dropdowns/tooltips use `createPortal()` to prevent clipping in overflow/scroll containers (shared chips/tooltips and modal/panel overlays).
Trips view intentionally does not apply app-level experience tags, so Trips filtering always matches visible Trips controls.

---

## AI Planning Flow

### Full trace: user click → saved plan

```
1. User clicks "Plan with AI" in CountryPanel
2. App.handlePlanWithAi(countryName) builds prompt from country data
3. ChatModal opens with initialPrompt
4. useChatSession manages the conversation
5. Finalization extracts structured JSON via llmTransform
6. AiItineraryModal displays the plan, allows save/replace
7. useAiPlanStore persists to localStorage (max 3 plans per destination)
```

### LLM provider abstraction

`src/utils/ai/llmProvider.ts` — three providers behind a common `LLMProvider` interface:
- `OpenAIProvider`
- `ClaudeProvider`
- `GeminiProvider`
- `createProvider(type, apiKey)` factory function
- All use direct browser `fetch` — no SDK dependencies

### Import/export

`src/utils/importParser.ts` supports direct JSON, structured day-by-day text parsing, and full conversation extraction. Shared ChatGPT/Claude links are fetched via `fetchChatLink()`.

---

## State Persistence (localStorage)

All persistence uses `loadLS()` / `saveLS()` from `src/utils/storage.ts`. Keys are centralized in `src/utils/lsKeys.ts` — always use `LS_KEYS.X`, never hardcode strings.

| Key constant | localStorage key | Content |
|---|---|---|
| `MY_LIST` | `tp_my_list` | Country names in user's active list |
| `VISITED` | `tp_visited` | Visited country names |
| `FAVORITES` | `tp_favorites` | Favorited country names |
| `CUSTOMS` | `tp_customs` | `Country[]` — user-added/edited destinations |
| `DELETED` | `tp_deleted` | `string[]` — tombstoned seed country names |
| `HOME_COUNTRY` | `tp_home_country` | Departure country label |
| `BUDGET_BASIS` | `tp_budget_basis` | Persisted global budget party size (`solo`/`couple`/`family4`) |
| `TRIP_CUSTOMS` | `tp_trip_customs` | `TripGroupDef[]` — user-edited/created trip groups |
| `TRIP_DELETED` | `tp_trip_deleted` | `string[]` — tombstoned seed trip groups |
| `FEATURES` | `tp_features` | `FeatureFlags` — feature flag overrides |
| `LLM_KEYS` | `tp_llm_keys` | LLM API keys per provider |
| `LLM_PROVIDER` | `tp_llm_provider` | Active LLM provider selection |
| `AI_PLANS` | `tp_ai_plans` | `Record<string, SavedAiPlan[]>` — saved AI plans |
| `LAST_BACKUP` | `tp_last_backup` | ISO timestamp of last backup |
| `BACKUP_FREQUENCY` | `tp_backup_frequency` | Reminder cadence |
| `BACKUP_SCHEDULE` | `tp_backup_schedule` | Backup scheduling metadata |
| `BACKUP_TARGET` | `tp_backup_target` | Platform backup destination override (`filesystem`/`opfs`/`download`) |
| `FRE_DONE` | `tp_fre_done` | First-run experience completed/dismissed |
| `SCHEMA_VERSION` | `tp_schema_version` | Persisted-data schema version |

No server sync — refresh survival is purely localStorage. `usePersistedSet` backs the set-style keys (`visited`, `favorites`, `myList`).

**Schema migrations** (`src/core/migrations.ts`): `runMigrations()` runs once in `main.tsx` before any hook reads storage. Bump `SCHEMA_VERSION` and append an ordered `MIGRATIONS` entry to evolve a persisted shape; pre-versioning stores are stamped as the v1 baseline. The runner never throws so a bad migration can't block boot.

**Platform-aware backup targets** (`src/core/platform/`): auto-backup is routed to a capability-based target so data is findable + restorable per device. `detectPlatformProfile(env)` is pure (OS/form-factor/surface + capability flags); `resolvePlatformDefaults()` picks a `BackupTargetKind` (`filesystem` for desktop with File System Access → `opfs` for mobile → `download` fallback). Adapters implement `BackupTargetPort` (`write`/`readLatest`/`configure`/`location`); every persistent target stores data inside a dedicated `Roamwise/` app folder (created if absent, shared via `adapters/backup/appDir.ts`) as a stable `roamwise-backup-latest.json`, so backups are grouped and re-readable. The filesystem adapter persists a picked `FileSystemDirectoryHandle` in IndexedDB (`handleStore.ts`) and re-verifies read/write permission. `backup.ts` exposes `backupToTarget()`, `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and target-kind override helpers. On mount `App.tsx` backs up overdue data, or — on a fresh device with no local data — **offers** (never silently applies) a restore from the target. Settings → Backup surfaces the active location via `StorageLocationCard`.

---

## Performance

- **Lazy loading**: `data/rules/` contains 199 JSON files total (198 country chunks + `index.json`), loaded on demand via `import.meta.glob`
- **Code-splitting**: Heavy modals/overlays (`ChatModal`, `ItineraryCinematic`, `SettingsModal`, `AiItineraryModal`, `FreTour`, `CountryForm`, `ItineraryModal`, `PlanCompareModal`) are lazy-loaded via `React.lazy()` + `Suspense`, moving ~123 KB out of the initial bundle
- **Idle-time enrichment**: Seed country data enriches in `requestIdleCallback` chunks of 10, so the first paint renders instantly with minimal seed data and cards progressively hydrate
- **Module-level caching**: `useCountryRule` keeps each country loaded at most once per session
- **Memoization**: `useMemo` is used across `App.tsx`, `useCountryStore`, `TripsView`, `CountryPanel`, and `ItineraryModal`
- **Stale update guards**: `useCountryRule` prevents stale async updates when selection changes rapidly
- **No virtualization**: acceptable at current scale (~200 destinations)
- **Wiki image caching**: `getWikiImage()` memoizes Wikimedia lookups

---

## Security

- **LLM API keys** live in localStorage and are sent directly to provider APIs from the browser
- **HTML sanitization**: `pdfExport.ts` escapes HTML before injecting into the print iframe
- **No innerHTML sinks in imperative DOM**: MapView markers use `textContent`/`replaceChildren`; cinematic vehicle SVGs are built via `buildVehicleSvgNode` (DOMParser + cached node clone) in `utils/vehicleMarkers.ts`, not `innerHTML`
- **Validation**: transformed/imported AI output is shape-checked before use
- **No authentication**: fully client-side, no user accounts

---

## Itinerary Rule Engine

### Flow

```
generateTripPlan() in src/utils/tripPlans.ts
  └─ getRuledItinerary()
       ├─ found → planItinerary() (citySelection.ts) picks cities + allocates days
       │           via bounded-knapsack DP, then builds per-day plan from rule data
       └─ not found → generic algorithm fallback
```

### City selection (`src/core/utils/citySelection.ts`)

- `scoreCities(rule)` → per-city importance (recDays 0.5 + content depth 0.3 + route order 0.2); **popularity proxy — no per-city popularity in the data**, swap a real metric in here if one appears
- `cityDayValue(bounds, days)` → concave: 0 below min, 0.7× at min, 1.0× at recDays, 1.15× at max
- `planItinerary(cities, D, {includeAll})` → DP `dp[t]=best value with exactly t days`; fills exactly D when feasible, else fullest reachable; `includeAll:true` for user-picked cities (allocate only). O(n·D·R), guarded by a brute-force optimality test
- Never reintroduce the old greedy `selectCitiesForDays` / proportional+drift allocation — it was replaced by the DP

### Rule coverage

- All 198 manifest destinations currently have offline rule JSON coverage
- `data/rules/index.json` tracks coverage metadata and slider bounds
- Generic fallback still matters for resilience, partial edits, and custom destinations

### Updating rule data (reference)

You usually update an existing `data/rules/<country>.json` now rather than adding net-new coverage.

1. Edit the relevant per-country JSON and keep `cities`, itinerary day references, and transport legs internally consistent
2. Update `data/rules/index.json` if `recDays`, `maxDays`, or coverage metadata changes
3. Verify with `npx tsc --noEmit && npm test && npm run build`

### Batch content workflow

The 198-country ruleset was built with batched, parallel content passes. When doing large refreshes:
- split countries into independent batches
- keep each batch self-contained at the JSON-file level
- reconcile `index.json` after content edits
- validate a representative sample manually, then run the full test/build pass

### PDF export & sharing

`src/utils/pdfExport.ts` uses a hidden iframe + `window.print()` flow (the "Export PDF" button) — it is not a PDF library.

`src/utils/pdfDocument.ts` builds a real PDF `Blob` with **jsPDF** for the Country Panel **Share** action, so the itinerary can be attached to the native share sheet without a download. jsPDF is heavy (~128 KB gzip) so this module is only ever reached via dynamic `import()` — never import it statically. `useItineraryShare` (`src/hooks/useItineraryShare.ts`) owns the share flow (native PDF file → native text → clipboard), prefetches the jsPDF chunk on pointer/focus to keep the share within the user gesture, and reuses `appUrl()`. `buildShareText` lives in `src/components/country/panel/shareText.ts` (re-exported from `ShareButton`).

### Wiki images

`src/utils/wikiImages.ts` fetches Wikimedia Commons images and caches results at module scope.

---

## Feature Flags

System in `src/utils/featureFlags.ts`. Stored in `tp_features` localStorage key.

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate — enables premium features |
| `llmPlanning` | `true` | paid | AI trip planning flow |
| `pdfExport` | `true` | paid | Export itineraries as PDF |
| `searchableHomeCountry` | `false` | free | Searchable home-country dropdown |

**Adding a new flag:**
1. Add to `FeatureFlags` type in `featureFlags.ts`
2. Add default to `DEFAULTS`
3. Use `isEnabled('flagName')` to check
4. Document in README, DESIGN, and this file

---

## Routing

Hash-based, no library. `AppView` + `VALID_VIEWS` live in `src/hooks/useHashView.ts`. Current top-level routes are `trips`, `calendar`, and `discover`.

**Adding a new view:**
1. Add to `AppView` type in `useHashView.ts`
2. Add to `VALID_VIEWS`
3. Add label to `VIEW_LABELS` in `App.tsx`
4. Add render branch in `App.tsx`
5. Keep filter ownership explicit (Trips view owns trip-header filter controls)

---

## Tailwind conventions

- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config

---

## Do NOT

- Install npm packages unless absolutely necessary
- Add a routing library — hash routing is intentional
- Hardcode localStorage key strings — use `LS_KEYS`
- Split `CountryPanel` into a separate file without a concrete maintenance reason
- Add comments explaining WHAT code does — only comment non-obvious WHY
- Touch `settings.local.json` — user's local permission overrides
- Commit or push without asking the user for confirmation first

---

## Code Quality Standards

### SOLID principles — how they apply here

| Principle | Rule in this codebase |
|---|---|
| **Single Responsibility** | Each hook owns one domain; each util file does one thing |
| **Open/Closed** | Extend via new rule JSON updates, feature flags, or view components rather than unrelated API churn |
| **Liskov Substitution** | All LLM providers must remain swappable behind the same interface |
| **Interface Segregation** | Components receive only the props they need |
| **Dependency Inversion** | Views depend on hooks/util APIs, not directly on localStorage or raw JSON |

### DRY — patterns already established

- `usePersistedSet` for any `Set<string>` stored in localStorage
- `LS_KEYS` as the single source of truth for key names
- `PillGroup` / `FilterChip` / `Tooltip` as shared UI primitives
- `loadLS` / `saveLS` for all localStorage access
- `applyFilters()` as the single composable filter pipeline

### Anti-patterns — never introduce these

- ❌ `any` without a strong reason
- ❌ Derived state in `useEffect` when `useMemo` is enough
- ❌ Direct state mutation
- ❌ Eager importing of all rule JSON files
- ❌ Dead files / unused exports / unused imports

---

## UX & Accessibility Checklist (enforce on every new component/change)

### Interactive elements — MANDATORY

| Rule | How |
|---|---|
| **Focus-visible ring** | Every `<button>`, `<a>`, interactive `<span>` MUST have `focus-ring` class |
| **Min touch target** | All interactive elements: `min-h-[32px] min-w-[32px]` (prefer 44×44 on mobile) |
| **Text floor** | Interactive text minimum `text-[10px]`; prefer `text-[11px]` or `text-xs` for buttons |
| **ARIA on popups** | Trigger needs `aria-expanded` + `aria-haspopup`; popup needs `role` |
| **ARIA on icon buttons** | Icon-only buttons MUST have `aria-label` |
| **Keyboard nav** | Anything clickable must be reachable via Tab; custom widgets need arrow-key support |

### Portals & popups — MANDATORY

| Rule | How |
|---|---|
| **Viewport collision** | Portal popups MUST detect viewport edges and reposition (left, right, top, bottom) |
| **Mobile fallback** | Complex popups should go full-width or bottom-sheet on mobile viewports |
| **Escape to close** | All overlays/popups must close on Escape and return focus to trigger |

### Animations — MANDATORY

| Rule | How |
|---|---|
| **Reduced motion** | All animations respect `prefers-reduced-motion: reduce` (global rule in index.css) |
| **Consistent timing** | Use standard durations: 0.15s (fast), 0.25s (normal), 0.4s (slow) |
| **No transition-all** | Use specific properties (`transition-colors`, `transition-opacity`, `transition-transform`) |
| **No dead keyframes** | Remove unused `@keyframes` from index.css |

### Component quality gate — verify before PR

1. Tab through the component — can you see where focus is?
2. Shrink viewport to 375px — are all buttons tappable? Any overflow?
3. Enable reduced-motion in DevTools — do animations stop?
4. Screen reader: are interactive elements announced correctly?
5. Run `npx knip` — any dead exports introduced?
