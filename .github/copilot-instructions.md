# Travel Planner — Copilot Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner — no backend, no server, purely client-side. All state lives in localStorage.

---

## Build & Validate

```bash
npx tsc --noEmit                          # type-check
npm test                                   # Vitest suite
npm test -- --testPathPattern=tripPlans    # single test file
npm run lint:unused                        # knip — dead code / unused exports
npm run build                              # tsc && vite build
npm run validate                           # all of the above in one command
```

Run `npm run validate` before and after every change set. For quick iteration, `npx tsc --noEmit` is the fastest feedback loop.

---

## Post-task: update docs

After a clean build, update these **three files** before reporting complete:

### README.md
1. **Features** — add any new feature or UI behaviour
2. **Future Scope** — remove checkbox lines for anything just implemented
3. **Tech Stack / Architecture / Design Notes** — update if patterns changed

### CHANGELOG.md
- Add an entry under `[Unreleased]` for every user-facing change
- Format: `### Added` / `### Changed` / `### Fixed` / `### Removed`
- CI blocks PR merge if CHANGELOG.md is not updated

### DESIGN.md
- Update if architecture, data model, or technical patterns changed
- Keep in sync with actual code — remove outdated sections

---

## Git

- **Always ask user confirmation before `git commit` and `git push`**
- Feature branches; conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`)

---

## Features & Views

5 hash-routed views (`#trips`, `#calendar`, `#map`, `#list`, `#discover`):

| View | Purpose |
|---|---|
| **Trips** (default) | Dashboard — progress ring, stats, "Next trip" highlight. Trip cards with image collages, budget, best months. Sections: ⭐ Favorites → 📋 Planning → ✅ Completed. List/grid toggle, pagination. |
| **Calendar** | Heatmap grid — rows = destinations, columns = months. Green = best, red = avoid, blue = current month. |
| **Map** | MapLibre GL world map with country markers. Click marker → open country detail panel. |
| **List** | Compact sortable table of My List countries. |
| **Discover** | Browse all 197 world countries by region. Add/remove from My List. Has its own filter bar (not global filters). |

**Country Detail Panel** — slides in from right (full-screen on mobile):
- Header: name, visited toggle, favorite ★, overflow menu (Edit/Delete)
- Travel style badge (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive)
- Collapsible sections: Experiences, Cities, Stopover tips, Watch out for, Combine with, Links, Notes
- Trip planner: days slider → Generate (offline) or Plan with AI
- Multi-plan selector: switch between Default and saved AI plans
- Plan comparison: side-by-side modal with summary cards, city overlap analysis
- Cinematic mode: animated fly-through of itinerary on map

**Responsive design** — mobile-first (375px+). Breakpoints: mobile / tablet (768px) / desktop (1024px). `useBreakpoint()` hook for reactive layout.

---

## Architecture

### Component tree

```
App.tsx  (thin orchestrator — wires hooks to views)
├── Header (nav pills, home country selector, settings)
├── Filters (month, budget, experiences, visited — portal-based dropdowns)
├── Views
│   ├── TripsView
│   ├── CalendarView
│   ├── MapView (MapLibre GL)
│   ├── ListView
│   └── DiscoverView (own filter bar, hides global filters)
├── CountryPanel (right sidebar / mobile overlay)
│   ├── CountryForm (edit modal)
│   ├── ItineraryModal (day-by-day plan display)
│   ├── PlanCompareModal (side-by-side comparison)
│   └── ItineraryCinematic (map fly-through animation)
├── ChatModal (AI chat interface)
├── AiItineraryModal (view/save AI-generated plans)
└── SettingsModal (LLM provider + API key config)
```

### Component directory layout

```
src/components/
  ai/       — AiItineraryModal, ChatModal, SettingsModal
  country/  — CountryPanel, CountryForm, ItineraryCinematic, ItineraryModal, PlanCompareModal
  map/      — MapView internals
  shared/   — PillGroup, FilterChip, Filters, Tooltip, HomeCountrySelector, DevFlagPanel, ExperienceDropdown
  views/    — CalendarView, DiscoverView, MapView, TripsView
```

### Hooks (state management)

All state is hooks-based — no Redux, no context providers. `App.tsx` calls hooks and passes results as props.

| Hook | File | Responsibility |
|---|---|---|
| `useCountryStore` | `src/hooks/useCountryStore.ts` | Country CRUD, My List, seed+overrides merging, favorites, visited. Returns `allCountries`, `myListCountries`, `saveCountry`, `deleteCountry`, `addToList`, etc. |
| `useTripStore` | `src/hooks/useTripStore.ts` | Trip group CRUD. Merges seed groups with customs/deletions. Returns `mergedTripGroups`, `saveTrip`, `deleteTrip`. |
| `useAiPlanStore` | `src/hooks/useAiPlanStore.ts` | Save/load/delete AI-generated plans. Max 3 per destination. Keyed by normalized destination name. |
| `useChatSession` | `src/hooks/useChatSession.ts` | LLM chat state machine. Manages message history, API calls, finalization, token tracking. Max 20 messages/session guardrail. |
| `useCountryRule` | `src/hooks/useCountryRule.ts` | Lazy-loads consolidated country data from `data/rules/*.json`. Returns `{ data, rule, loading }`. Module-level cache. |
| `usePersistedSet` | `src/hooks/usePersistedSet.ts` | Reusable `Set<string>` backed by localStorage. Used for `visited`, `favorites`, `myList`. |
| `useHashView` | `src/hooks/useHashView.ts` | Hash-based URL routing. Defines `AppView` type and `VALID_VIEWS`. |
| `useBreakpoint` | `src/hooks/useBreakpoint.ts` | Reactive breakpoint: `mobile` / `tablet` / `desktop` via `matchMedia`. |
| `usePanelDrag` | `src/hooks/usePanelDrag.ts` | Resizable panel drag behavior for CountryPanel. |

### Shared UI components — reuse, don't recreate

| Component | File | Usage |
|---|---|---|
| `PillGroup` | `shared/PillGroup.tsx` | Segmented pill toggle (Trips, Discover, filters) |
| `FilterChip` | `shared/FilterChip.tsx` | Portal-based dropdown chip |
| `Tooltip` | `shared/Tooltip.tsx` | Portal-based info tooltip |
| `HomeCountrySelector` | `shared/HomeCountrySelector.tsx` | Feature-gated searchable dropdown |
| `DevFlagPanel` | `shared/DevFlagPanel.tsx` | Dev-mode feature flag toggle |

---

## Data Model

### Three-tier country system

```
Tier 1: World Catalog (data/worldCatalog.json)
  197 countries: { name, lat, lng, region }
  Regions: Asia, Europe, Middle East, Africa, Americas, Oceania
  Used by: Discover view, catalog lookups

Tier 2: Rich Seed (data/countries.json)
  44 curated countries with full data: bestMonths, budget, experiences, cities, etc.
  Pre-added to user's My List on first load

Tier 3: Consolidated Rules (data/rules/*.json)
  ~44 per-country JSON files with itinerary rule data
  Lazy-loaded via import.meta.glob in useCountryRule
  Contains: seed data + itinerary rules in one file
```

4 special non-sovereign destinations exist in seed only (not in catalog): Hawaii, Scotland, Dubai, Antarctica.

### Trip groups

Defined in `src/data/tripGroups.ts`. Group multiple countries into a trip (e.g. "Southeast Asia"). Same seed+overrides pattern as countries — `tp_trip_customs` / `tp_trip_deleted`.

### TypeScript types

All in `src/types.ts`: `Country`, `CityEntry`, `CatalogEntry`, `TravelStyle`, `TripBrief`, `ChatMessage`, `LLMProviderType`, `TokenUsage`, `LLMChatResult`, `BudgetBreakdown`, etc.

---

## Data Flow

### Country lifecycle (seed → UI)

```
1. data/rules/index.json  ← manifest of all countries (name, inSeed flag)
2. useCountryStore.buildSeedCountry()  ← creates minimal Country from manifest
3. useCountryRule.loadConsolidatedCountry()  ← async loads full data/rules/{name}.json
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
- `addToList()` for deleted seeds: removes from `DELETED` (restores). For new: creates minimal entry from catalog.

### Filter composition

`src/utils/filterLogic.ts` — filters compose with AND logic in this order:
1. `filterByMonth()` — expands abbreviations, matches `country.bestMonths`
2. `filterByExperiences()` — requires ALL selected tags present
3. `filterByVisited()` — `all` / `visited` / `unvisited`
4. Budget tiering — parses `₹150K`/`₹2L` strings → `budget` (≤₹1.5L) / `mid` (≤₹3L) / `premium`

Filter dropdowns use `createPortal()` because the filter bar has `overflow-x: auto` which clips `position: absolute` children.

---

## AI Planning Flow

### Full trace: user click → saved plan

```
1. User clicks "Plan with AI" in CountryPanel
2. App.handlePlanWithAi(countryName) builds prompt from country data
3. ChatModal opens with initialPrompt
4. useChatSession manages the conversation:
   a. Builds system prompt on first message (buildSystemPrompt)
   b. Condenses history to stay within token limits (condenseMessages)
   c. Calls selected LLM provider (OpenAI / Claude / Gemini)
   d. On "finalize", sends finalization prompt → parses JSON response
   e. extractTripPlanResult() validates and structures the output
5. ChatModal.handleViewItinerary() → onPlanReady callback
6. AiItineraryModal displays the plan, allows save/replace
7. useAiPlanStore persists to localStorage (max 3 plans per destination)
```

### LLM provider abstraction

`src/utils/ai/llmProvider.ts` — three providers behind a common `LLMProvider` interface:
- `OpenAIProvider` — `gpt-4o-mini` default
- `ClaudeProvider` — Anthropic API
- `GeminiProvider` — Google Generative AI API
- `createProvider(type, apiKey)` factory function
- All use direct browser `fetch` — no SDK dependencies

### Import/export

`src/utils/importParser.ts` — `parseImportedText(text)` tries three strategies:
1. Direct JSON matching `LLMTripPlanResult` schema
2. Structured day-by-day text parsing
3. Full chat conversation extraction

Also supports fetching shared ChatGPT/Claude URLs via CORS proxy (`fetchChatLink()`).

---

## State Persistence (localStorage)

All persistence uses `loadLS()` / `saveLS()` from `src/utils/storage.ts` (JSON parse/stringify with error swallowing). Keys centralized in `src/utils/lsKeys.ts` — always use `LS_KEYS.X`, never hardcode strings.

| Key constant | localStorage key | Content |
|---|---|---|
| `MY_LIST` | `tp_my_list` | Country names in user's active list |
| `VISITED` | `tp_visited` | Visited country names |
| `FAVORITES` | `tp_favorites` | Favorited country names |
| `CUSTOMS` | `tp_customs` | `Country[]` — user-added/edited destinations |
| `DELETED` | `tp_deleted` | `string[]` — tombstoned seed country names |
| `HOME_COUNTRY` | `tp_home_country` | Departure country label (default: `"India"`) |
| `TRIP_CUSTOMS` | `tp_trip_customs` | `TripGroupDef[]` — user-edited/created trip groups |
| `TRIP_DELETED` | `tp_trip_deleted` | `string[]` — tombstoned seed trip groups |
| `FEATURES` | `tp_features` | `FeatureFlags` — feature flag overrides |
| `LLM_KEYS` | `tp_llm_keys` | LLM API keys per provider |
| `LLM_PROVIDER` | `tp_llm_provider` | Active LLM provider selection |
| `AI_PLANS` | `tp_ai_plans` | `Record<string, SavedAiPlan[]>` — saved AI plans |

No server sync — refresh survival is purely localStorage. `usePersistedSet` provides a reusable hook for Set-based keys (visited, favorites, myList).

---

## Performance

- **Lazy loading**: per-country rule JSON files (~44 files) are lazy-loaded via `import.meta.glob` in `useCountryRule`. Only loaded when a country is selected or eagerly during initial mount.
- **Module-level caching**: `useCountryRule` maintains a `Map<string, ConsolidatedCountry | null>` cache — each country loaded at most once per session.
- **Memoization**: `useMemo` used extensively:
  - `App.tsx` — filtered lists, unique experiences
  - `useCountryStore` — `allCountries`, `myListCountries`, `myListNames`, combo map
  - `TripsView` — trip grouping, assigned names, filtered results
  - `CountryPanel` — plan options
- **Stale update guards**: `useCountryRule` uses a `nameRef` to prevent stale async updates when country selection changes rapidly
- **No virtualization** — lists render all items (acceptable for ~200 max countries)
- **No React.lazy/Suspense** — all components are bundled together
- **Wiki image caching**: `getWikiImage()` caches Wikimedia Commons lookups in module-level map

---

## Security

- **LLM API keys** are stored in localStorage (`tp_llm_keys`). They are sent directly in browser `fetch` requests to provider APIs. The Settings UI shows an explicit warning that keys are visible to browser extensions and devtools.
- **HTML sanitization**: `pdfExport.ts` escapes HTML via `esc()` before injecting into print iframe. `importParser.ts` strips HTML tags and chat artifacts from imported text.
- **No CSP headers** — `index.html` and `vite.config.ts` don't set Content-Security-Policy.
- **JSON validation**: `extractTripPlanResult()` validates parsed LLM output shape before accepting it.
- **No authentication** — fully client-side, no user accounts.

---

## Itinerary Rule Engine

### Flow

```
generateTripPlan() in src/utils/tripPlans.ts
  └─ getRuledItinerary()  ← checks rule data from useCountryRule cache
       ├─ found → per-day plan from rule data (activities, hotels, transport, costs)
       └─ not found → generic algorithm fallback
```

### Adding a new ruled country

1. Ensure country exists in `data/countries.json` with cities
2. Create `data/rules/<country-name>.json` (see existing files for structure — includes seed data + itinerary field)
3. City names **must exactly match** `data/countries.json` — mismatches silently fail
4. Verify: `npx tsc --noEmit && npm test && npm run build`

### PDF export

`src/utils/pdfExport.ts` — "print to PDF" approach. Builds a full HTML document with inline CSS, writes to a hidden iframe, calls `window.print()`, then cleans up. Not a PDF library.

### Wiki images

`src/utils/wikiImages.ts` — `getWikiImage(query)` queries Wikimedia Commons API for JPEG/PNG/WebP ≥600px. Returns URLs directly if input is already a URL. Module-level cache.

---

## Feature Flags

System in `src/utils/featureFlags.ts`. Stored in `tp_features` localStorage key.

**Adding a new flag:**
1. Add to `FeatureFlags` type in `featureFlags.ts`
2. Add default to `DEFAULTS` object
3. Use `isEnabled('flagName')` to check
4. Document in README under Feature Flags section

---

## Routing

Hash-based, no library. `AppView` type + `VALID_VIEWS` in `src/hooks/useHashView.ts`. Display names in `VIEW_LABELS` map in `App.tsx`.

**Adding a new view:**
1. Add to `AppView` type in `useHashView.ts`
2. Add to `VALID_VIEWS` array
3. Add label to `VIEW_LABELS` in `App.tsx`
4. Add render branch in `App.tsx`
5. Hide global filters if view has its own (see Discover pattern)

---

## Tailwind conventions

- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes in `src/index.css`, not Tailwind config

---

## Do NOT

- Install npm packages — zero runtime deps beyond React + MapLibre is intentional
- Add a routing library — hash routing is intentional
- Hardcode `"India"` — use `homeCountry` prop (except static label when flag is off)
- Add city names to rule data that don't exist in `data/countries.json` — they silently fail
- Hardcode localStorage key strings — use `LS_KEYS` from `lsKeys.ts`
- Add comments explaining WHAT code does — only comment non-obvious WHY
- Create new abstraction layers without concrete need (3+ repeated patterns)
- Touch `settings.local.json` — user's local permission overrides
- Commit or push without asking the user for confirmation first

---

## Code Quality Standards

### SOLID principles — how they apply here

| Principle | Rule in this codebase |
|---|---|
| **Single Responsibility** | Each hook owns one domain (countries, trips, AI plans, chat). Each util file does one thing. Don't add country logic to trip hooks. |
| **Open/Closed** | Extend via new rule JSON files in `data/rules/`, new feature flags, new view components. Don't modify existing hook APIs to add unrelated features. |
| **Liskov Substitution** | All LLM providers implement the same `LLMProvider` interface. Any provider must be swappable without UI changes. |
| **Interface Segregation** | Components receive only the props they need. Don't pass the entire country store to a component that only needs `myListNames`. |
| **Dependency Inversion** | Views depend on hook return types, not on localStorage or JSON directly. All persistence goes through `loadLS`/`saveLS`. |

### DRY — patterns already established

- `usePersistedSet` — reuse for any `Set<string>` backed by localStorage (don't hand-roll)
- `LS_KEYS` — single source for all localStorage key strings
- `PillGroup` / `FilterChip` / `Tooltip` — shared UI primitives
- `loadLS` / `saveLS` — all localStorage access goes through these
- `applyFilters()` — single composable filter pipeline, don't duplicate filter logic in views

### Component design patterns

- **Composition over wrappers** — pass children or render props, don't create wrapper components that just forward props
- **Hooks extract logic, components render UI** — if a component has >30 lines of non-render logic, extract a hook
- **Key-based remounting** — use composite keys (`${style}-${cities}-${days}`) to force re-render with fresh animations instead of imperative state resets
- **Portal for overlays** — any dropdown, tooltip, or modal that escapes parent overflow must use `createPortal`
- **Controlled + lifted state** — `App.tsx` owns cross-cutting state, views are controlled components

### Anti-patterns — never introduce these

- ❌ `any` type — use proper types or `unknown` with type guards
- ❌ `useEffect` for derived state — use `useMemo` instead
- ❌ Prop drilling >3 levels — extract a hook or restructure
- ❌ Inline styles for reusable patterns — use Tailwind classes
- ❌ `setTimeout`/`setInterval` for state sync — use React state + effects
- ❌ Mutating props or state directly — always use immutable updates
- ❌ Barrel files (`index.ts` re-exports) — import from specific files
- ❌ God components >300 lines — split into sub-components or extract hooks
- ❌ Unused imports, unused exports, dead files — `knip` catches these in CI

### Performance rules

- Memoize expensive derived data with `useMemo` (filtered lists, sorted arrays, computed maps)
- Use `useCallback` for handlers passed to memoized children
- Lazy-load per-country data (never eagerly import all `data/rules/*.json`)
- Cache API/network results at module level (wiki images, country rules)
- Guard async hooks against stale updates (ref-based cancellation pattern in `useCountryRule`)

### Security rules

- Never log or expose API keys in UI (beyond the settings modal)
- Always escape HTML before injecting into iframes or `innerHTML` (see `esc()` in pdfExport)
- Validate all external data shapes before using (LLM responses, imported text)
- Don't trust imported JSON structure — validate with type guards
