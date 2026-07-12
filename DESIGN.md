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
│   │   ├── useCountryStore.ts     # Country catalog, Recents/MRU, seed + lazy enrichment
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
│       ├── filterLogic.ts         # Pure filter functions (budget/experience)
│       ├── monthFit.ts            # Plan landing month-fit ranking (best → neutral → avoid)
│       ├── transport.ts           # TransportType enum, emoji map, detection
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
│
├── utils/                         # Web/browser utilities
│   ├── ai/
│   │   └── llmProvider.ts         # LLM provider abstraction (OpenAI/Claude/Gemini)
│   ├── pdfExport.ts               # Print-to-PDF via hidden iframe (mobile: new tab); emerald/serif theme; brand logo letterhead; multi-stop section bands with per-country practical notes; emoji flags + icons in header/section titles; footer "Plan your own trip" app link. Also exports buildItineraryHtml() — the single source-of-truth itinerary document reused by the Share PDF
│   ├── pdfModel.ts                # Pure shared model both PDF paths consume: slices composed days into per-stop sections carrying each stop's own note (scope-agnostic, unbounded)
│   ├── pdfDocument.ts             # Styled PDF Blob for native file share (lazy chunk): rasterises the SAME buildItineraryHtml() the Export path prints via html2canvas → jsPDF addImage, so the shared PDF is pixel-identical to Export; paginate() breaks pages at card boundaries so a day/section/notes card never splits across a page (a card taller than a page is hard-split). Trade-off: rasterised text isn't selectable/searchable. Retired the old hand-drawn renderer (drawIcon/pdfSafe/Latin-1) + flagImage.ts
│   ├── brandLogo.ts              # Roamwise brand mark (src/assets/brandMark.png) as an inlined base64 data URL for the PDF letterhead; force-inlined by vite.config assetsInlineLimit (Vite 5 has no ?inline query)
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
│   │   └── plan/                  # Guided #plan wizard (grouped by responsibility)
│   │       ├── PlanView.tsx       # Entry orchestrator (auto-save, engagement, useReviewRoute)
│   │       ├── shell/             # PlanWorkspaceShell, PlanTripHeader, PlanCountrySwitcher, planActions, planDraft
│   │       ├── steps/             # PlanBasicsStep, PlanPlacesStep, DestinationPicker, PlanRouteSummary
│   │       ├── review/            # Route Canvas: TripReviewWorkspace/Canvas, TripContextRail, RailSection, PlanNotesSection, BorderHop, RouteLeversBar, RouteOrderEditor, SegmentAdjustDrawer, useReviewRoute
│   │       ├── save/              # TripSaveBar, PlanReviewReveal, PlanSavedToast, PlanShareButton
│   │       ├── controls/          # CityPicker, ExperiencePicker, FocusChips, DayLengthControl, BasisMenu, PlanFilters, PlanCityJumpNav, CityDetailModal
│   │       └── ui/                # PlanPopover, PlanMenu, sheetChrome, ItineraryToolbar
│   ├── country/
│   │   ├── ItineraryCinematic.tsx # Animated map fly-through (React shell — lifecycle + render)
│   │   ├── cinematic/
│   │   │   └── engine.ts          # Pure fly-through engine: path/bezier/bearing math, city-stop grouping, marker builders, rAF loop (unit-tested)
│   │   ├── itinerary/ItineraryView.tsx # Shared day renderer
│   │   └── panel/                # Surviving Plan rail atoms: CityCard, PanelSection, InfoSections, MonthHeatmap, ShareButton/shareText
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
│       ├── PillGroup.tsx          # Segmented pill toggle
│       ├── FilterChip.tsx         # Portal-based dropdown chip
│       ├── ExperienceDropdown.tsx # Experience tag multi-select
│       ├── HomeCountrySelector.tsx# Home country dropdown
│       ├── DevFlagPanel.tsx       # Dev-only feature flag panel
│       ├── AppInstallShare.tsx    # Header/menu Install / Open-app / Share controls
│       ├── FreTour.tsx            # First-run guided tour (luxury emerald/ivory hero·spotlight·install cards; Plan-first nav walkthrough incl. Trips)
│       └── Tooltip.tsx            # Portal-based tooltip

data/
├── rules/
│   ├── index.json                 # Manifest: 198 itinerary-backed destinations
│   └── {country}.json             # 198 lazy-loaded per-country rule files
└── worldCatalog.json              # 197-country sovereign coordinate/region fallback used by catalog seed builders

public/
├── manifest.json                  # PWA manifest (name, PNG+SVG icons, display mode)
├── sw.js                          # Service worker (cache-first statics, network-first HTML)
├── icon-192.png / icon-512.png    # PNG app icons (Android/Chrome install criteria)
├── icon-maskable.png              # Maskable PNG icon for Android adaptive icons
├── icon-*.svg                     # SVG icon sources (also listed in manifest)
└── og-image.png                   # 1200×630 Open Graph image for link previews
```

**Module boundaries.** A `@/*` path alias resolves to `src/*` (`tsconfig.json` `paths` + `vite.config.ts` `resolve.alias`; vitest inherits it). Convention: imports **within** a cohesive module stay **relative** (`./`, `../`); imports **reaching outside** it use the **`@/` alias**, so relocating a file never churns `../../../` chains.

**Test layout.** `src/test/` mirrors the source tree (e.g. `src/test/components/views/plan/review/…` covers `src/components/views/plan/review/…`); shared helpers stay at the root (`testUtils.ts`, `setup.ts`, `support/`). Tests import source via `@/…` only, so a test file can move without breaking imports; Vitest discovers `*.test.*` anywhere and coverage globs key on **source** paths, so relocating a test never affects the coverage gate.

---

## Key Design Patterns

### Hooks own state domains

| Hook | Domain |
|---|---|
| `useCountryStore` | Country catalog, implicit Recents/MRU (`recordPlanned`), notes, reload, and lazy enrichment |
| `useSavedTrips` | Saved-trip snapshot store (My Trips): upsert by route, favorite, remove |
| `useAiPlanStore` | AI plan persistence (save/replace/compare) |
| `useChatSession` | LLM chat state machine (messages, finalize, tokens) |
| `useCountryRule` | Lazy-loading and caching consolidated per-country rule JSON |
| `usePersistedSet` | Reusable `Set<string>` + localStorage (DRY); reconciles cross-tab via `storage` events |
| `useHashView` | URL hash routing |
| `usePlanBuilder` | Guided planning funnel: rule loading, day auto-seed + pin, live plan (via the shared per-stop `stopPlan.ts` engine), auto→explicit city materialization |
| `useBreakpoint` | Responsive breakpoint state |
| `useInstallPrompt` | PWA install prompt capture, installed-in-browser detection (`getInstalledRelatedApps`) + `openApp`, iOS detection |
| `useItineraryShare` | Country/itinerary share: native PDF file (lazy, rasterised Export HTML) → native text → clipboard. Builds + caches the PDF Blob on prefetch (pointer/focus), keyed by a content signature, so `navigator.share` stays inside the user gesture (iOS transient-activation) |
| `useLifecyclePrompts` | Soft backup nudge — debounced, one at a time, snoozed by backup baseline |

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

Default trip length now starts from rule `recDays`; travel style was removed for now (it may return later). The day slider then feeds `planItinerary`.

### Feature flags

Two-tier gating lives in `src/core/featureFlags.ts`. Paid features require both `paidFeatures=true` and the individual flag to be enabled.

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate for premium features |
| `llmPlanning` | `true` | paid | AI trip planning flow |
| `pdfExport` | `true` | paid | PDF export from itinerary views |
| `searchableHomeCountry` | `false` | free | Searchable home-country picker |
| `multiCountryPlanning` | `true` | free | Multi-select destination picker + trip tray on `#plan` (up to `MAX_TRIP_UNITS`); enabled by default |

### Guided planning wizard (`#plan`)

One-way planning funnel and the app's primary planning surface. Lives in `src/components/views/plan/` and is orchestrated by `PlanView.tsx` + `usePlanBuilder`. **It is the app's default landing view** — `App` passes `useHashView("plan")` and the brand/Home button routes to the same landing.

- **Steps**: **Basics** (party size via `PillGroup` + vibe/experience chips, with a live `PlanRouteSummary` route timeline that molds N=1) → **Which places?** (`PlanPlacesStep` — a *decision surface*: a consolidated dark **header card** carrying country identity + trip stats + a trip-scoped **"Who's going"** basis, then decluttered decision cards in a two-up grid on wide screens, a single per-country **Filters** control and **Sort**; shown only when a stop has cities) → **Your trip** (the unified **Route Canvas** review workspace — single and multi share one path). Steps are `["basics", ...(anyUnitHasCities ? ["cities"] : []), "review"]` — the Places step is conditional (skipped when no stop has cities) and the primary stop shares the same `usePlanBuilder` city state as the Review canvas's Adjust drawer, so picks stay in lock-step whether edited in the step or in Review; additional stops are curated via `useTripPlanner` and composed into the header stats. On desktop **Basics + Places sit on an elevated "stage"** — a bordered white panel centred in the canvas (`lg:my-auto` + card styling in `PlanView`) at `max-w-5xl` — so short steps read as an intentional luxe focal surface instead of floating on empty ivory (Review keeps its own `max-w-[1400px]` full-width workspace; mobile is full-bleed). Basics also swaps its centred hero for a **left editorial header** + **two-column layout** (questions left, live summary right) from `lg` up.
- **Header actions**: the wizard header carries route identity, stats, the active party-size basis, the Plan share action, and the saved-trip ★ favorite control. The redundant duration·cost chip is hidden on the Review step because `PlanTripHeader` already carries days·cost.
- **Unified Review workspace** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail`, laid out by the shared `PlanWorkspaceShell`): the "Your trip" step is **one path for single- and multi-country trips**. It normalises the primary funnel (`usePlanBuilder`) + each additional stop (`useTripPlanner`) into one ordered `ReviewSegment[]`, folds them into a single plan (`composeTripPlan`, **N=1 byte-identical**), and lays out a **segmented composed itinerary** in the centre beside a trip-level **"Insights"** rail (`TripContextRail`). Each stop is shaped **inline** via its own ✏️ Adjust drawer (`SegmentAdjustDrawer`) — there is no separate Shape rail. On **desktop** the rail renders inline and collapses to a slim reopen tab (state persisted to `LS_KEYS.PLAN_UI`); on **tablet/mobile** the itinerary fills the screen and the rail opens as a bottom-sheet drawer from a sticky "Insights" bar (`useBackDismiss` + Escape close). Editing a stop's levers regenerates the composed plan live, so the traveller never steps back through the funnel. At N=1 the reorder/anchor levers mold away and the single itinerary renders full-width with one reference rail (full detail in the multi-country section below).
- **Step navigation & Back** (`PlanView`): a labeled, tappable **stepper** (`Basics · Places · Review`) in the header is the back affordance — tap an earlier step to revisit it (no "Step N of M" caption). Device/gesture **Back walks one step at a time** before leaving `#plan`, via a **persistent** `useBackDismiss` guard (a single `open` window spanning multiple dismissable levels that re-arms its history sentinel each Back). Rail drawers register on top, so Back dismisses an open drawer first, then steps. **On mobile the header compacts** (`PlanTripHeader` via `useBreakpoint`): first-stop-only route title + **+N** pill (full route in the `aria-label`), an **icon-only** basis control (`BasisMenu iconOnly`), and the **stepper is hidden on the Review canvas** (`hideStepperOnCompact`) to maximise itinerary space. The review footer is hidden below `lg`, so the workspace's mobile bottom bar (`PlanWorkspaceShell` `nav`) owns the wizard nav there as **one unified segmented toolbar** (a single rounded-full bar with hairline `divide-x` dividers — flanking `← Back` / `＋ Plan another` icon cells frame two labelled action cells — so it reads as a cohesive bar echoing the app tab bar below, not four mismatched floating buttons): `← Back` · a **Insights** cell (the `TripContextRail` bottom-sheet) · a **Tools** cell (the PDF/AI/Cinematic toolbar bottom-sheet) · `＋ Plan another`. The two middle cells share one `text-ink-1` weight and were renamed from the vague "Good to know"/"⋯ More" to content-indicating **Insights** / **Tools**. The primary **📤 Share** lives in the header (`PlanShareButton`, left of the ★ favourite) so it is never buried. Route Canvas levers shorten on mobile too (`Route`, `Jump`; aria-labels unchanged).
- **Itinerary actions** (`ItineraryToolbar`, built in `TripReviewWorkspace`): a single **slim, low-emphasis secondary action toolbar** (icon + tiny label ghost buttons, evenly distributed — matching the app's icon-control convention, not a wall of CTAs) with **🎬 Cinematic** (shown when the wizard is given a `mainMapRef` and the composed route has ≥2 mappable stops), **📄 PDF** (gated by `pdfExport`) and **✨ AI plan** (gated by `llmPlanning`), each control self-gated by capability/flag (the bar renders nothing when none is available). The primary **📤 Share** action is **promoted to the wizard header** (`PlanShareButton`, left of the ★ favourite) so it is never buried; it reads the same **order-aware composed plan** the canvas renders (via the shared `useReviewRoute` hook — see below), so a reordered route shares exactly what's on screen. The secondary toolbar node is built once and handed to **both** surfaces so it renders exactly once per breakpoint: on **desktop** the `TripReviewCanvas` pins it as a foot below the itinerary (`pinToolbar = useBreakpoint() === "desktop"`); on **tablet/mobile** it moves into a neutral **"Tools" bottom-sheet** (`PlanWorkspaceShell` `actions` prop) opened from the mobile bottom bar — reusing the same bottom-sheet pattern as the "Insights" rail. Cinematic now works for **single- and multi-country** Plan routes (see the scope-agnostic cinematic route model below).
- **`useReviewRoute`** (`src/components/views/plan/review/useReviewRoute.ts`): the order-aware composed route is owned by one hook (in `PlanView`), not buried inside the workspace, so **both** the header Share and the `TripReviewWorkspace` read the *same* model. It normalises the primary funnel + each additional stop into one ordered `ReviewSegment[]`, owns the visit `order` + `anchorName` display layers and all derivations (`orderedSegments`/`orderedCountries`/`orderedComposed`/`perCountryCost`/`routeStops`/`cinematicRoute`/`canCinematic`/`reorderStop`/`autoArrange`), and returns safe empty defaults on non-Review steps (`composeTripPlan([])` is empty-safe) so it obeys the rules of hooks. `TripReviewWorkspace` is now presentational (takes the `route` object).
- **Unified sheet chrome** (`sheetChrome.tsx`): every Plan overlay (`PlanWorkspaceShell` "Insights" / "Tools" sheets, `PlanPopover`, `PlanMenu`, `PlanFilters`, `PlanCityJumpNav`, and the `SegmentAdjustDrawer`) shares two atoms — **`SheetGrip`** (an emerald-tint band so the sheet colour reaches the rounded top edge — the bare grip left a white gap above the header gradient) and **`SheetCloseButton`** (a crisp round **SVG ✕**). This retired the two drifted chrome styles (generic text-✕ sheets vs the SVG-✕ branded Adjust drawer) so all drawers read as one family; mobile sheet radius is unified to `rounded-t-3xl`.
- **Rail Notes** (`PlanNotesSection`, in `TripContextRail`): mirrors the previous destination-notes behaviour (400ms debounce + blur flush, 4,000-char cap, "✓ Saved" flash) in the luxury theme; re-seeds on destination change; only renders when `onSaveNotes` is wired (i.e. `App` passed `store.updateNotes`). Has a header row ("Auto-saved as you type" + an **Expand** button) — the header gives the focus outline top-clearance so it isn't clipped by `RailSection`'s `overflow-hidden` — and an **expand-to-fullscreen** editor (bottom-sheet on mobile, centered dialog on `sm+`, Escape/backdrop/× to close) that shares the same value + handlers.
- **Inferred length, tuned per stop**: there is no standalone "how many days" step — length is inferred (`recommendedDaysForSelection`) and adjusted by `DayLengthControl` (in each stop's ✏️ Adjust drawer), a slider that commits on release, previews consequences inline (`projectCities`), and only opens a confirm dialog when shortening would drop a *hand-picked* city.
- **Auto→explicit city materialization**: while `selectedCities` is empty the plan auto-selects cities (DP fit); the Adjust drawer's `CityPicker` shows those as checked via `autoSelectedCities` (the country's real cities the auto plan visits, filtered from route labels). The first `toggleCity` **materializes** the auto set and applies the toggle (so tapping a pre-checked city removes it) and **pins the day count** so curating doesn't silently inflate length. "Reset to auto" clears the picks and unpins. The picker caps its height and scrolls locally, so a many-city country never makes the drawer endless.
- **Insights** (`TripContextRail`): the trip-level reference rail — an **honest budget ledger** (per-country ×nights line items + inter-country legs estimate + "flights extra" caveat, labelled with the active basis), a **Trip readiness** checklist, per-country `MonthHeatmap` "When to go", stopover/watch-outs/pairs-with tips, per-country **Before you go** (lazy `LearnAboutSection`/`PlanningResourcesSection`/`UsefulLinksSection`), and the **Notes** scratchpad (above). Each section renders only when a country carries that data, so the rail never shows empty chrome. The who's-going basis + headline stats live once in `PlanTripHeader`; the rail only reflects the active basis in the ledger. Sections use `RailSection`'s `variant`: on **desktop** each is a discrete bordered **`card`**; inside the tablet/mobile **"Insights" bottom-sheet** they switch to a **`flat`**, hairline-divided variant (no border/shadow) so the sheet body matches the Adjust/Filters sheets instead of nesting cards-inside-a-card. `TripContextRail` picks the variant by breakpoint.
- **Self-contained, no Country-Panel coupling**: the Plan page owns all destination detail and itinerary shaping; the former single-country panel was removed, so combine-with pills render as plain informational chips and there is no panel handoff.
- **Landing picker ordering** (`DestinationPicker`): the **Jump back in** board shows implicit Recents in MRU order (recorded when a destination enters Basics via `recordPlanned`, or when a saved trip is reopened, capped by `MAX_RECENTS=24`). Fresh users have no recents, so the board falls back to **Popular destinations** sorted by `popularityScore` desc. The picker is now the only destination-entry path: its own ordered multi-select tray (`onStart(countries)`) starts single- or multi-stop plans. It searches all 198 rule-backed destinations. Its chrome is an **editorial gradient hero** (shown on all breakpoints) over a **search row** (search box + an inline **month dropdown** reusing `PlanPopover` — anchored popover desktop / bottom-sheet mobile) and a **horizontally-scrollable region tab strip** (`Popular` (=All), `Asia`, `Europe`, `Middle East`, `Africa`, `Americas`, `Oceania`; `aria-pressed` toggles, **Popular default**). This keeps destinations above the fold on 375px rather than two always-on pill rows. Region **filters** the explore board; the month dropdown re-ranks the entire board by seasonality via `monthFit(country, month)` and `rankByMonthFit(list, month|null)` (stable best → neutral → avoid; best-window destinations get a ☀ cue, avoid-window destinations a muted ⚠ cue but remain visible). Region never touches the **Jump back in** recents (a filter must not empty recents); month may reorder them.
- **Resumable draft**: the funnel persists to `LS_KEYS.PLAN_DRAFT` via `planDraft.ts` (`load/save/clearPlanDraft`) — the ordered **`countries`** selection, step, cities, experiences, days, and pin survive refresh (`loadPlanDraft` migrates the legacy single-`country` shape to `countries: [name]`). `usePlanBuilder` takes an optional `initial` seed and guards its reset-on-country-change effect (skips first mount) so a hydrated draft isn't wiped. Backing out of destination selection clears the draft. Desktop rail collapse persists separately to `LS_KEYS.PLAN_UI`.
- **Multi-country selection (flag `multiCountryPlanning`, on by default)**: with the flag on, `DestinationPicker` chips toggle into an ordered selection (capped at `MAX_TRIP_UNITS` from `core/utils/multiCountry.ts`; pure `toggleTripSelection` helper) confirmed via a sticky **"Plan trip →"** tray; `onStart(countries)` seeds `PlanView`'s `selection` state (`picked = selection[0]`). With the flag off, a chip tap starts a single-country trip immediately (`onStart([c])`) — unchanged behaviour. The multi-country **Review** step composes and renders every stop as a segmented "Route Canvas" (see below).
- **Surfaces mold from the selection via the `DestinationSource` seam** (`src/core/trip/destinationSource.ts`): a scope-keyed port `{scope, unitNoun(Plural), popular(), resolveUnit(), comboRecommendations(), dayBounds(), experiencesFor(names), loadUnit(name)}`. `getDestinationSource(scope)` returns the registered source — only `international` today (`internationalSource.ts`); a future `domestic`/India scope implements the same port over cities and every wizard surface renders unchanged. Nothing in the surfaces assumes "country". Key molded surfaces:
  - **`PlanRouteSummary`** — a read-only route timeline built purely from `selection` + a live per-stop `stopDays` map (`PlanView.routeStopDays`, each stop's *rendered* `plan.days.length`), falling back to `source.dayBounds(name).rec` only for stops whose rules haven't loaded yet. Because it mirrors the composed plan's per-stop lengths, the `~N days` total **matches the header's composed total** and updates as vibe/experience focus changes (rather than drifting from a static recommended baseline). It **molds to any stop count** — a single-destination selection (N=1) renders the one stop with no Anchor badge; a route badges the single longest stop **Anchor** (`Math.max` of the leg days) and draws a dot/connector rail. Titled **"Your trip"** for both.
  - **`PlanBasicsStep`** — party size always; **vibe pills** whenever the selection offers experience tags. For one unit these are its own tags; for a route they are the union of every chosen unit's experiences, loaded via `useTripExperiences(names, source)` (a stale-guarded hook over `source.experiencesFor`). Vibe overflow is handled by a **height-bounded scroll container as the base safeguard** (never a hard cap) plus a UX-only `visibleCap` prop (default `DEFAULT_VIBE_CAP=10`, `Infinity` disables) with a "+N more"/"Show less" toggle that sits outside the scroll area; any *selected* tag stays visible past the cap. The **Clear (N)** control sits on the "What are you into?" label row (right-aligned on desktop), only when a vibe is selected. On desktop it renders as a **two-column layout** (questions left, the live `PlanRouteSummary` as a companion card right); labels + pills left-align from `lg` up via `ExperiencePicker`'s `align="start"` prop while staying centred on mobile.
  - **`PlanPlacesStep`** — a *decision surface* over normalised `PlacesUnit[]`, Design D layout regardless of stop count. A consolidated dark **header card** carries: country identity (a static flag + name for one stop; a **dropdown country switcher** with a place-count badge for a multi-stop route — one stop at a time, scaling to any count / long names via `line-clamp`), trip **stats** (days · places · countries[multi only] · budget) and a trip-scoped **"Who's going"** dropdown (`budgetBasis`). Below it a section title (`Cities in {name}`) with an overflow-safe **focus subline** (`summarizeFocus`), a single per-country **`PlanFilters`** control (hosts that stop's **experiences**; anchored popover on desktop / bottom-sheet on mobile via `useBreakpoint`; count badge; hidden when the stop offers no tags) and a **Sort** dropdown. **Decision cards** follow design **"D3"** — a two-column card: the left column carries a ✓/+ affordance, city name, a one-line "known for" **brief** (`city.notes`) and **experience chips** (the traveller's `focusMatches` lit emerald, a few `otherExperiences` muted, capped at `MAX_CHIPS`); the right rail carries ≈recommended nights · ☀best window · ⚠**avoid window** (`worstMonths`) · a sparse "Top for X" signal — laid out in a two-column grid on `lg`; non-included cities collapse behind a "Show N more" tail. Each card carries an **ⓘ** affordance (non-nested — a full-card toggle still adds/drops the stop) that opens **`CityDetailModal`**, a responsive detail surface (bottom-sheet on mobile / centered modal on tablet+desktop via `useBreakpoint`, over the shared `ModalShell`) with the full `city.notes` brief, uncapped experience tags (focus lit), the ≈recommended stay and full ☀best/⚠avoid windows, and an add/remove action mirroring the card. Once a stop is hand-picked the **focus subline** (`summarizeFocus`) gains a compact inline **↺ Reset to suggested** pill (`onClearCities`). All popovers/switchers reuse the portal `PlanMenu`, which is **breakpoint-aware** (`useBreakpoint`): an anchored dropdown on desktop, a scrimmed `rounded-t-3xl` bottom-sheet with a branded header on mobile — so Sort/basis/switcher match the Filters/city-detail/rail sheets instead of floating over undimmed content. Experiences are **per-country** (see below); the header stats span the whole composed route.
  - **Header route summary** — long multi-country routes name the first `HEADER_ROUTE_STOPS` (2) stops, then a **+N** pill (wrapped in the shared portal `Tooltip`) reveals the full ordered route on hover/focus/tap; the `<h1 aria-label>` gives screen readers the complete route. No silent truncation.
- **Multi-unit trip funnel** (Basics · Places · Review all composed). The primary stop stays on `usePlanBuilder`; every *additional* stop is loaded and curated together, then all stops are composed into one plan:
  - **`source.loadUnit(name)`** resolves a unit name to a plan-ready `{country, rule}` (`LoadedUnit`) — the seed merged with detail data plus its rule chunk (the international impl uses `loadConsolidatedCountry` + `mergeCountryData`, falling back to `consolidatedToCountry` when there's no seed).
  - **`useTripRules(names, source)`** — a stale-guarded loader that resolves an array of units via `loadUnit` (mirrors `useTripExperiences`; unknown units are dropped).
  - **`useTripPlanner(units, seedExperiences, basis)`** — one hook owning `Record<name, {selectedCities, customDays, pinned, experiences}>` for the additional stops (never `usePlanBuilder` in a loop, so the rules of hooks hold as the route grows/shrinks). It derives each stop's itinerary and auto-picked cities, exposes per-unit `toggleCity`/`clearCities`, prunes dropped stops, and `composedPlan(primarySegment)` folds primary + additional stops into one plan. **Experiences are per-country**: `experiences: null` inherits the trip `seedExperiences` (from Basics), a non-null array is an explicit per-stop override (incl. `[]` = "deliberately none here"); `effectiveExperiences(name) = override ?? seed` drives that stop's city ordering, day recommendation and plan, and `toggleExperience`/`clearExperiences` diverge one stop without touching its siblings. Each `UnitPlan` exposes its effective `experiences` and its distinct `experienceOptions` (for `PlanFilters`). The primary stop's experiences stay owned by `usePlanBuilder`.
  - **`deriveStop` / `projectStopCities` / `orderCitiesByExperience`** (`core/utils/stopPlan.ts`, pure) — **the single per-stop derivation engine both hooks delegate to**, so a stop plans identically wherever it sits on a route (single-country is the N=1 case). Given a stop's `{country, rule, selectedCities, days, experiences, basis}` it returns its vibe-first `orderedCities`, `plan` (via `generateTripPlan`), `planCities`, and auto-picked `autoSelectedCities`. `usePlanBuilder` (primary) and `useTripPlanner` (additional stops) are now thin React state wrappers — rule loading + draft/seed restore differ, but the derivation math lives once here. Both also compute `recommendedDays` via the same `recommendedDaysForSelection` call (folding in the stop's hand-picked cities), so the auto-seed and "reset to recommended" target match across single and multi.
  - **`composeTripPlan(segments, basis)`** (`tripPlans.ts`, pure) — concatenates per-unit `days[]` and **renumbers them continuously across the route** (via `shiftPlanDays`/`shiftDayNumbers`, which shift the `Day N`/`Day N–M` numbers in each label + activity by the count of preceding days) so the composed plan reads Day 1..N end-to-end; `days.length` stays an honest count (labels only are rewritten). Sums cost ranges, names the route in the note, and aggregates warnings. **A single segment returns its plan unchanged, so the single-destination path is byte-for-byte identical.** Scope-agnostic — the same composition will serve a future domestic route of cities.
  - **Review "Route Canvas"** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail`, laid out by the shared `PlanWorkspaceShell`). Review (single & multi) normalises the primary funnel (`usePlanBuilder`) + each additional stop (`useTripPlanner`) into one ordered `ReviewSegment[]`, then renders the whole route as one **segmented** itinerary: a composed emerald summary strip + a cross-route jump nav (`groupDays` across every stop) over per-segment blocks. **Route order and anchor are independent display layers** over the pick-ordered segments, tuned from a trip-level **`RouteLeversBar`** that sits once above the segments (so each stop header stays uncluttered — identity · ✏️ Adjust · collapse only (the whole emerald-tinted `bg-emerald-50/70` header band — a branded per-country "section" title bar — is a full-bleed collapse toggle via an `absolute inset-0` button behind pointer-events-inert content; **no numeric stop badge** (order reads from name + cumulative day range + the route bar); row 1 is flag · bold emerald name (the clear hero) · ✏️ Adjust · collapse chevron, and row 2 carries the stats line — places · day range on the left, per-stop budget pushed to the right so neither row is empty. The **anchor cue is a slim amber left accent bar** on the header band (not an inline pill competing with the name); the status is exposed to assistive tech via an `sr-only` "— anchor stop" on the heading)): the workspace owns an `order` index permutation (reordered from the levers bar's **Route order** popover — a `RouteOrderEditor` with **drag-and-drop** (⠿ grip, pointer-capture drag with a live drop indicator for desktop mouse + mobile touch) plus **keyboard Arrow Up/Down** reorder on the focused grip (focus restored to the moved stop), delegating to a pure `moveIndex(from,to)` in `core/utils/routeOrder.ts` — or one-tap **✨ Auto-arrange** — a nearest-neighbour chain from the anchor via pure `orderByProximity`/`haversineKm` in `core/utils/routeOrder.ts`, gated on ≥3 stops with finite coords) and an `anchorName` (importance ★, promotable per stop from the same popover). The **Route order** popover opens through the shared **`PlanPopover`** (portaled, anchored on desktop / bottom-sheet on mobile, Escape-restores-focus), and the compact **jump-to-city** dropdown (`PlanCityJumpNav embedded`) sits **inline on the same levers-bar row** so the toolbar is one line. **Total trip length is no longer an editable lever** — it is a read-only header stat, retuned per stop via each stop's ✏️ Adjust drawer. Reordering **never unpicks** the primary stop — `composeTripPlan` is re-run in visit order to drive the summary/jump-nav/ledger/toolbar — so the byte-identical N=1 path is untouched. Both reset only when the pick *set* changes. Each block keeps its stop's **own rich `ItineraryView(seg.plan, seg.rule, "luxury")`** (transport separators, route/search/maps links, eat/hotel pills) because the composed plan concatenates days but loses per-country rule association; blocks are **collapsible** (the anchor opens by default, the rest fold to a scannable overview) and show a **cumulative route-relative day range** ("Days 4–8"); each block's **day cards renumber to the route timeline** (via `shiftPlanDays`), so a second stop's cards continue at "Day 4" rather than restarting at "Day 1". Transitions between countries render as **honest border-hop rows** (`BorderHop`): collapsed it is a single "Travel from X to Y" row (no invented transit time); expanded it is an informational **mode picker** — a great-circle-distance-derived indicative **flight** estimate (`~Nh`, from `haversineKm`) plus rail/road honestly marked "varies", since no per-pair transit data exists — and every mode notes hops cost no itinerary days. Each stop's shaping levers open in a focused **Adjust drawer** (`SegmentAdjustDrawer`, a `ModalShell` bottom-sheet on mobile / centered modal on desktop) via the stop's **✏️ Adjust** trigger — a **Shape** tab with the shared `FocusChips` (experience focus) + `CityPicker` (auto → hand-picked cities) + `DayLengthControl` (per-stop length) — these presentational components consume `usePlanBuilder` (the primary stop) or `useTripPlanner` (an additional stop) levers, so every stop shapes identically regardless of position — DRY), plus a read-only **Details** tab (per-stop reference: best/avoid windows, watch-outs, stopover tip, pairs-with) that only appears when the country carries that data. This replaced the old cramped inline expansion so a segment card never grows unboundedly. The right **`TripContextRail`** is trip-level reference only: a **Trip readiness** checklist (pure honest fallback + border-crossing count via `core/utils/tripReadiness.ts`), an **honest budget ledger** (per-country ×nights line items, an italic inter-country legs estimate, and a "flights extra" subtotal caveat) labelled with the active basis, per-country `MonthHeatmap` seasonality, per-country watch-outs/stopover tips, and a **Notes** scratchpad (`PlanNotesSection`) — sections render only when a country carries the data. The **who's-going basis and headline stats (days/countries/cost) live once in the persistent `PlanTripHeader`** — the rail and levers bar never duplicate the basis switch or the trip totals (the rail only reflects the active basis in the ledger). Each stop's **planning warning** (e.g. length auto-expanded) renders **inside that stop's own segment block**, prefixed with a ⚠️ and attributed to the country, rather than in an ambiguous route-level banner. The **cross-route jump nav** (`PlanCityJumpNav`) shows scannable pills on desktop for short routes but **collapses to a compact, country-grouped, portaled dropdown on every breakpoint once a route exceeds 5 cities** (bottom-sheet on mobile), so dense multi-country routes never crowd the strip; jumping to a city inside a **collapsed** country first expands that country (via `onJump`/`handleJump` + a `requestAnimationFrame` scroll once the day nodes exist) so the target is never a dead anchor. There is **no Shape rail** — every stop is shaped in its own Adjust drawer, so `PlanWorkspaceShell` renders the itinerary with a single reference rail for **both single- and multi-country trips**. **Single- and multi-country trips both render through this canvas** — at N=1 the segment list is just the primary stop, the reorder/anchor levers mold away, and `composeTripPlan` returns the plan unchanged, so the single itinerary stays byte-identical.
  - **Shared itinerary atoms**: `ItineraryToolbar` (Share/Cinematic/PDF/AI, each control self-gated by capability/flag) is extracted so the toolbar reads identically wherever it renders (DRY). `TripReviewCanvas` reuses the toolbar; there is no separate "back to top" control because the `RouteLeversBar` (with its inline Jump) is pinned above the itinerary scroll area on every breakpoint, so Jump is always reachable. Authoritative days·cost·places live once in `PlanTripHeader`, so no summary band repeats them. (Cinematic is wired into the toolbar but not enabled from the Plan wizard yet.)
  - **Unified `PlanTripHeader`**: the persistent Plan-journey header (eyebrow + route identity with a single-name style badge or a multi-stop `+N` overflow pill, a slotted **Save-trip** control, and the labeled tappable stepper that doubles as back-nav) is one component shared across Basics/Places/Review, so the header reads consistently at every step. It molds to the selection (single name vs ordered route) and **sizes to each step via a `width` prop** (`narrow`/`wide`/`review`) so the header aligns to the step body (Basics + Places share `wide`/`max-w-5xl`; Review is the wide breakout). On Places/Review it also carries a **progressive stats strip** (whole-route days · places · countries · budget, computed from the composed plan) and a single **"who's going" basis pill** (`BasisMenu`, light variant), and on multi-stop Places it hosts the **country switcher** (`PlanCountrySwitcher`) as its `identitySlot` — so identity/stats/basis render once in the header instead of a per-step dark card (Places dropped its standalone stats card into this header). The header stays layout-only: the save control is slotted in (`saveSlot`), keeping save logic in `PlanView`.
  - **`TripSaveBar`** (header cluster, Review only): saving a trip is fully **decoupled from any destination-list mutation** — the wizard **auto-saves the composed trip to My Trips** the moment the traveller reaches Review (and keeps it fresh as they tune it), via a content-signature-guarded effect (`onSaveTrip`, wired in `App.tsx` to `useSavedTrips.upsert`). `TripSaveBar` is now a **single refined ★ Favourite icon toggle** rendered in the `PlanTripHeader` top-right cluster beside the who's-going basis pill, styled to match the header's other circular icon controls. The old **always-on "✓ Saved" tick was removed** — a permanent badge for invisible plumbing read as noise and clashed with the pill beside it. Save confirmation is instead **transient + first-run**: a one-time **`PlanReviewReveal`** celebration ("Your trip is ready ✨", persisted `LS_KEYS.PLAN_REVEAL_SEEN`, skipped for reopened trips) and a brief **`PlanSavedToast`** ("Trip/Route saved to My Trips", auto-dismissed via a cleaned-up 4s timer plus a ✕ for immediate dismissal, and lifted clear of the bottom nav/tab-bar chrome so it never overlaps the Back/Plan-another controls) **only when the traveller actually edits a settled plan** — merely arriving at Review, reopening a saved trip, or a page refresh's async hydration (lazy rules + auto-city/day settling) is absorbed silently within a short `SAVE_SETTLE_MS` grace window, while an explicit budget-basis switch always counts as an edit. The ★ toggle acts on the *saved trip snapshot* (`onToggleTripFavorite` → `useSavedTrips.toggleFavoriteByName`, keyed by the route signature) — the **same meaning of "favourite" as the My Trips ★**. The Plan journey no longer adds countries to My List or favourites countries (that duality was removed). On Review the sticky footer's **"Plan another"** is a **modest secondary** (compact ghost button — never the dominant primary), so the completed itinerary stays the focus and an accidental restart is unlikely. See **Saved Trips** below for the snapshot data model.
- **Luxury emerald/ivory theme**: the whole Plan surface (wizard chrome, `DestinationPicker`, `CityCard`, `ItineraryView`, `TripReviewCanvas`, app header) uses an emerald/ivory palette. `CityCard`, `ItineraryView`, `PillGroup`, the AI modals (`ChatModal`, `AiItineraryModal`) and the country research/rail parts (`InfoSections`, `PanelSection`, `MonthHeatmap`) are all emerald-only — the legacy slate/blue variants and accents were removed once every caller moved to the luxury theme (the dead dual-variant `variant` prop on `CityCard`/`ItineraryView` was deleted).

### Portal pattern

Filter dropdowns, tooltips, and experience picker use `createPortal` to avoid clipping from scroll/overflow containers in header and panel layouts.

### App navigation & header layout

- **Desktop**: a slim **luxury ivory/emerald** top bar (`bg-[#fbf9f3]/90` + backdrop-blur + `border-b border-[#e7e1d2]`) carrying an emerald wordmark + centered view pills (`Plan · Trips`, in an `#efe9db` track — the active pill is `bg-emerald-700 text-white`) + a right cluster of **Install/Open app · Share · Settings (⚙️) · Dev flag panel (dev-only)** (all restyled to the ivory palette: `#efe9db` chips, emerald-filled Install). The PWA `theme-color` (`index.html`) + manifest `theme_color`/`background_color` were aligned to the ivory bar so the mobile status bar/splash blend seamlessly.
- **Mobile**: a **fixed bottom tab bar** (ivory `bg-[#fbf9f3]`, `border-[#e7e1d2]`) owns primary navigation (the 2 views, Plan · Trips, icon-over-label with an emerald-tinted active pill behind the icon, `safe-bottom`); the top strip shrinks to brand + a compact **Install/Share + Settings** cluster (no hamburger menu / slide-down drawer — both retired). The bottom bar sits in the flex column so content scrolls above it.
- The install slot is context-aware: it shows **Install app** when the browser offers `beforeinstallprompt` (or iOS A2HS guidance), and swaps to a best-effort **Open app** action once `navigator.getInstalledRelatedApps()` reports the PWA is already installed but running in a browser tab. Nothing shows when running standalone.
- App-wide defaults (home country, default budget party size) live inside **Settings → General**, not in the header.
- `FreTour` is the **luxury emerald/ivory** first-run guided tour: immersive emerald-gradient **hero/install** cards (Welcome → Cinematic → Install → Ready) interleaved with light **ivory spotlight** tooltips (`bg-surface-1` + emerald accents + emerald pulsing target ring) that walk the remaining nav/settings targets in Plan-first order — **Plan → Trips → Settings**. Spotlight targets (`data-tour="nav-plan"`, `data-tour="nav-trips"`, `data-tour="settings"`) resolve to whichever element is visible per breakpoint (desktop pills vs. bottom bar tabs); its mobile positioning places a card above targets in the lower half of the viewport (e.g. the bottom tab bar).

### Saved Trips (My Trips)

- **Snapshot model** (`src/core/utils/savedTrips.ts`): a `SavedTrip` is a **self-contained snapshot** — `{id, name, stops: SavedTripStop[], basis, totalDays, costPerPerson, savedAt, favorite?}`, where each `SavedTripStop` is `{country, days, cities}`. It captures the composed plan at save time and is **independent of Recents and rule data**, so a saved trip stays viewable even if the underlying destinations later change or are removed. Pure `buildTripSnapshot(input, now?)` (time injected for testability) builds the persistable fields from the wizard's live plan state; `tripSignature(countries)` joins the ordered route with `" → "` and is the trip's `name`/identity.
- **Store** (`src/hooks/useSavedTrips.ts`): `{savedTrips, upsert, remove, toggleFavorite, reload}` backed by `LS_KEYS.SAVED_TRIPS`. `upsert` is **keyed by route signature** — re-saving the same ordered route updates the existing record in place (preserving its `id`, `favorite` and original `savedAt`) rather than duplicating; new trips prepend (newest-first). `PlanView` builds the snapshot from the ordered `selection` (attaching each stop's own loaded plan where the destination has rule data, so the route identity stays honest even for rule-less secondary stops) and calls `upsert` behind a content-signature guard so identical renders don't re-write storage.
- **View** (`src/components/views/MyTripsView.tsx`): a lightweight gallery — a **search box** (filters by route name / country / city, with a "clear search" no-results state) over the ★ favorites section then newest-first, each `SavedTripCard` showing flags + route name, city chips, `days · places · cost` (with the trip's saved basis icon) and a relative "saved" label; favorite ★ and delete (with `useConfirm`) actions; an empty state with a "Plan a trip" CTA. Both **+ New trip** and the empty-state CTA call `App.startNewPlan` (a `startNewNonce` bump) which lands a **fresh Plan landing picker** — the in-progress wizard draft (`tp_plan_draft`) is cleared, saved snapshots untouched — rather than resuming the last draft step. Each card is a **stretched-action** pattern — a full-card overlay `<button aria-label="Open {name}">` (z-10) reopens the route in the Plan wizard (`onOpen` → `App` seeds `PlanView` via `openTrip={stops,basis,nonce}` and switches to `#plan`, jumping to Review); the favorite/delete controls sit above it (z-20) as siblings so nested-interactive HTML is avoided. Lazy-loaded in `App` like the other views. Backup-recoverable via `BACKUP_KEYS`.
- **Reopen rehydration**: reopening a saved trip **fully restores its snapshot**, not just the country list. `App.openSavedTrip` builds an `OpenTripRequest` via pure `toOpenRequest(trip, nonce)` — the ordered `stops` (each `{country, days, cities, experiences}`) + `basis`. `PlanView`'s nonce-guarded restore effect snaps the active budget basis back to the saved one (via the `setBudgetBasis` prop → `setActiveBasis`, transient — the persisted default is untouched) and stages a `restoreSeed`, which feeds `usePlanBuilder` (primary stop, via `PlanBuilderSeed`) and `useTripPlanner` (additional stops, via `TripPlannerSeed`): each stop is pinned to its snapshot **cities + tuned length + experience focus**. Each stop's snapshot `days` is the **honest rendered length** (`plan.days.length`), not the pre-expansion pin the traveller last requested — the DP planner may expand a tight day count to fit the picked cities (e.g. 8 cities → 11 days, with a warning), so persisting `plan.days.length` means a reopened Norway that renders "Day 1-11" restores to 11d, not the stale 8d pin. Experience focus is captured per stop (primary = the builder's selected experiences, secondary = each unit's effective experiences) and restored as an explicit per-stop override, so the rehydrated plan reproduces exactly what was saved (a previously *inherited* stop becomes an *override* post-restore — accepted for snapshot fidelity). Restores are applied **once per nonce** (idempotent, so a stale prop never clobbers in-progress edits), are aligned to the *resolved* stop order, drop cities that no longer exist in current rule data, and — for the multi-stop path — wait until every seeded stop's rules have loaded before applying (mirroring the primary's rule-load gate), so a late-loading stop still gets its snapshot. The primary seed effect is deliberately declared **after** the recommendation re-seed effect so the restored length wins the mount flush instead of being clobbered by the still-unpinned recommendation. Both the My-Trips reopen (`openTrip` prop) and the landing **resume prompt** feed one shared `pendingOpen` restore pipeline (DRY); the restore effect **records the reopened route into Recents** (`onRecordPlanned`) and — via `reopenedRef` — keeps the auto-save effect **silent through hydration** (no `PlanSavedToast`, no reveal) until the plan settles, since a resume is not a user edit. (Trips saved before honest-days shipped still carry the old pin until their next reopen→Review, which auto-saves the corrected `plan.days.length`.)
- **Resume vs start fresh**: when the landing `DestinationPicker` selection matches a saved trip (pure `findSavedTripForCountries(trips, names)` — exact ordered `tripSignature` first, else newest order-insensitive set match), `PlanView` shows an **emerald** `useConfirm` prompt: **Resume saved plan** (primary → rehydrates via `toOpenRequest` + `pendingOpen`, jumps to Review) or **Start fresh** (secondary → normal Basics). Dismissing the prompt (Escape / click-outside / device Back) is distinct from "Start fresh": it leaves the traveller on the landing picker with nothing started. That three-way outcome relies on `useConfirm`'s optional `onDismiss` side-channel (fired only on Escape/backdrop/Back, never the cancel button; the promise still resolves `false`, so boolean callers are unchanged).
- **Retired**: the old editable **trip-groups** subsystem (`useTripStore`, `tripGroups.ts` seeds/`Region`/`ALL_REGIONS`/`buildMergedTripGroups`, `TripsView` + `views/trips/*` incl. `buildTrips`, the `tripGroups` flag, and the `tp_trip_customs`/`tp_trip_deleted` keys) was removed in favour of this snapshot store. Combos ("Combine with" pills) come from Country rule data, not trip groups, so they're unaffected.

### Budget basis (party size)

- **Single source of truth**: `src/core/utils/budget.ts` owns the `BudgetBasis` type (`solo`/`couple`/`family4`), `DEFAULT_BUDGET_BASIS` (`couple`), basis meta (icon/label/long), `budgetForBasis(country, basis)` (per-basis lookup with fallback to the single `budget` string), `parseBudgetRange(str)` (the canonical `₹XL/₹XK` range parser reused by tiering and trip-cost scaling), and `deriveBudgetBreakdown(solo)` (scales a per-person range into couple/family totals via `BASIS_MULTIPLIER` — couple 1.77×, family4 3.45×, calibrated from the median ratios across all 198 rule-backed destinations). `filterLogic` re-exports `BudgetBasis` and reuses the helpers.
- **Budget tiering**: `getBudgetTier` classifies a budget string by its **range midpoint** — `parseBudgetRange` averages low+high so a `₹1.5L–₹3L` band reads as `mid` (₹2.25L) rather than `budget` off the lower bound alone. Buckets: midpoint ≤₹1.5L `budget`, ≤₹3L `mid`, else `premium`; unparseable strings fall back to `budget` (inclusive). Drives both the Trips budget filter and the Plan-tab day nudge (`BUDGET_DAY_FACTOR`).
- **Two-layer state** (`useBudgetBasis`): a persisted **global default** (`tp_budget_basis`) plus a transient in-session **active** value seeded from it. `setGlobalBasis` persists and resets active to it; `setActiveBasis` is temporary (not persisted). A corrupt stored value is guarded by `isBudgetBasis` and falls back to `couple`.
- **Controls**: **Settings → General** hosts the app-wide defaults — the home-country selector and a `BudgetBasisPills` segmented control (`variant="light"`, with label) bound to the **global** default. The Plan wizard's "who's going" basis pill (`PlanTripHeader` / `PlanPlacesStep`) edits only the **active** value (quick "play around") for the in-session itinerary cost.
- **Consumers of active basis**: `PlanView`/Route Canvas cost figures, PDF/share output, and `MyTripsView` (each trip's *saved* basis, captured in the snapshot, not the live active basis). The App threads `activeBasis` to each planning surface.
- **Cost model**: `generateTripPlan(..., basis)` computes plan cost from `budgetForBasis(country, basis)` scaled by `days / recommendedDays` (floor 0.2), so at the recommended length the plan cost equals that basis's budget chip. The resulting `TripPlan.costBasis` records the party basis; `planCostBasisIcon` renders the basis icon (👤/👫/👨‍👩‍👧‍👦) beside the cost, with `planCostBasisLabel` supplying an accessible `title`/`aria-label` (never shown as visible text). AI plans omit `costBasis` and fall back to the 👤 (per-person) icon.

### Destination detail surfaces

The former destination drawer, edit form, tabs, and panel-based AI-plan browse/compare UI were removed in the plan-first cleanup. Destination detail now lives in the Plan wizard: Places cards and `CityDetailModal` cover city choice, while the Route Canvas `TripContextRail` hosts `MonthHeatmap`, watch-outs, stopover tips, notes, and lazy `InfoSections` (`LearnAboutSection`, `PlanningResourcesSection`, `UsefulLinksSection`). Manual per-country editing is not currently exposed.

### Cinematic map

Reuses the main MapLibre instance via `mainMapRef`. Disables user interaction on mount, adds GeoJSON route sources, animates fly-through with rAF, restores on close.

**Scope-agnostic route model** (`cinematic/engine.ts`): the animation consumes a pure, prebuilt **`CinematicRoute`** rather than a single `country`+`rule`, so single-country, multi-country, and a future domestic (India states/cities) scope all play through the same shell — a data swap, not a rewrite. Key pieces:
- `buildSegmentStops(plan, cities, rule)` — the lower-level primitive that groups one unit's days into ordered `CityStop`s, resolving coordinates from the supplied city list. It knows nothing about "country", so any `LoadedUnit`-shaped source flows through unchanged. `buildCityStops(plan, country, rule)` is a thin single-country wrapper.
- `CinematicSegment` — one plannable unit (`name`, `center`, `plan`, `cities`, `rule?`); `CinematicOrigin` — an optional departure gateway (`coords`, `city`, `label`); `CinematicRoute` — the flattened, ordered stop list + composed `plan` + merged `cityImages` + `overviewCenter`.
- `buildCinematicRoute(segments, { title, plan, origin, comboCountries? })` — composes N units into one route: concatenates each unit's stops in visit order, stamps a distance-derived **border hop** (`interUnitTransport`: ≥300 km → flight, else rail/road) onto the previous stop's `transportToNext`, merges city images, and frames the overview between the origin and the units' centroid. **N=1 is byte-identical to the legacy single-country path.** Units whose stops resolve to no coordinates are skipped so a rule-less secondary stop can't break the route.
- `resolveHomeOrigin(homeCountry)` — the international departure gateway (with the same fallbacks the single-country path always used). International trips pass this; a **domestic** scope passes `origin: null`, so the intro/return flight arcs are omitted and the route starts at the first city — the shell already gates every origin arc on `route.origin`.
- `buildSingleCountryRoute(plan, country, rule, homeCountry, comboCountries?)` — convenience wrapper used by the single-country wizard path.

The Plan wizard builds the route from `TripReviewWorkspace`'s ordered segments (so it respects the current visit order/anchor) and lifts a single `cinematicRoute` state in `PlanView` that both single and multi feed; the overlay is gated on a `mainMapRef` and a route of ≥2 mappable stops (`canCinematic`), and `onCinematicChange` reveals the always-mounted `MapView`. Multi-country cinematic plays origin arc → stop → border-hop → stop … with honest per-leg transport. All camera jumps pass through `cleanJumpOptions()` (strips undefined `bearing`/`pitch` → no NaN "failed to invert matrix").

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
| **Catalog** | `data/worldCatalog.json` | 197 | `{ name, lat, lng, region }` — coordinate/region fallback for seed builders |
| **Manifest** | `data/rules/index.json` | 198 | Browse metadata + `inSeed`, `hasItinerary`, `recDays`, `maxDays`, `popularityScore`, `bestMonths`, `worstMonths` |
| **Rule JSON** | `data/rules/{name}.json` | 198 | Consolidated country data + day-by-day itinerary rules |

`data/worldCatalog.json` remains a 197-country sovereign coordinate/region fallback used internally by catalog seed builders; it is not a top-level view. The manifest expands coverage to 198 itinerary-backed destinations and now bakes `bestMonths`/`worstMonths` into every entry, enabling fully offline full-catalog month-fit ranking on the Plan landing without lazy rule loads. `ManifestEntry` and seed builders surface those windows onto `Country` objects. The **`inSeed`** flag still identifies 5 richer seed entries (Japan, Thailand, Switzerland, France, Italy) for catalog/enrichment, but fresh users no longer receive an auto-populated visible list.

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
| `tp_my_list` | Recents/MRU country names recorded when a destination enters Plan Basics (`MAX_RECENTS=24`) |
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
| `tp_plan_reveal_seen` | First-Review celebration (`PlanReviewReveal`) shown flag — one-time, never re-shows |
| `tp_lifecycle_dismissed` | Permanently dismissed lifecycle nudge ids (reserved for non-backup nudges) |
| `tp_lifecycle_baseline` | Backup-nudge baseline `{ backupAt, fingerprint }` — resets on backup, advances on snooze |
| `tp_schema_version` | Persisted-data schema version (current: 3; see Schema migrations) |

### Schema migrations

`src/core/migrations.ts` owns forward-compatible persistence upgrades:

- `SCHEMA_VERSION` is the current on-disk shape version (`3`).
- `MIGRATIONS` is an **append-only, ordered** registry of `{ version, description, migrate }`. Each entry upgrades data _to_ its `version`.
- `runMigrations()` is called once in `main.tsx` **before any hook reads storage**. It applies every pending migration in ascending order, then stamps `tp_schema_version`. It never throws — a failed migration is logged and boot continues (hooks still fall back to defaults via `loadLS`).
- Pre-versioning stores (data present, no version key) are treated as the v1 baseline; the v2 migration deletes legacy country-level `tp_visited` and `tp_favorites` keys; the v3 migration clears the legacy `tp_my_list` so the reused key starts as an honest empty Recents ledger (the old hand-curated/seeded list was never planning history). Then it stamps the current version.
- To evolve a shape: bump `SCHEMA_VERSION`, append a `Migration` with the new version, and add tests in `src/test/core/migrations.test.ts`.

### Platform-aware backup targets

Auto-backup is routed to a **capability-based** destination so app data stays findable and restorable per device (one PWA codebase, no desktop/mobile fork):

- `src/core/platform/platformProfile.ts` — pure `detectPlatformProfile(env)` (OS, form-factor, surface, capability flags: File System Access / OPFS / share-files / persistent-storage) + memoized `getPlatformProfile()`. iPadOS (desktop UA + touch points) is classified as iOS.
- `src/core/platform/defaults.ts` — `resolvePlatformDefaults()` chooses a `BackupTargetKind`: desktop prefers `filesystem` (a folder the user picks once, browsable in the OS file manager); mobile prefers silent `opfs`; both fall back to `download`. `autoImport` is enabled only for readable targets.
- `src/core/ports/BackupTargetPort.ts` + `src/core/adapters/backup/*` — swappable targets implementing `write` / `readLatest` / `configure` / `location`. Every persistent target stores data inside a dedicated `Roamwise/` app folder (created on demand via the shared `appDir.ts` helper) as a stable `roamwise-backup-latest.json`, so backups are grouped and re-readable. Filesystem persists the chosen `FileSystemDirectoryHandle` in IndexedDB (`handleStore.ts`) and re-verifies read/write permission.
- `src/utils/backup.ts` — `backupToTarget()` requests `navigator.storage.persist()` then writes via the active target (falling back to a download if not ready); `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and `getBackupTargetKind`/`setBackupTargetKind` support the flow. The serialized `BACKUP_KEYS` set covers all recoverable trip data — Recents (`tp_my_list`), custom destinations + tombstones, home country, **budget basis (party size)**, **saved trips (My Trips, including their saved-trip favorites)**, feature flags, LLM provider selection, and saved AI plans — each shape-validated on restore; sensitive `LLM_KEYS` are intentionally excluded. Saved trips therefore survive backup/restore and re-appear in the My Trips dashboard.
- `App.tsx` — on mount, backs up overdue data, or on a fresh/empty device **offers** (never silently applies) a one-click restore when a backup is readable. Settings → Backup shows the active location and controls via `StorageLocationCard`.

### Lifecycle prompts

Soft, non-blocking backup nudges surface at natural moments, at most one at a time and never focus-stealing. `useLifecyclePrompts` (`src/hooks/useLifecyclePrompts.ts`) computes the backup candidate and debounces it (default 600 ms) so nothing flashes during rapid state changes; `LifecyclePromptToast` (`src/components/shared/LifecyclePromptToast.tsx`) renders it as a bottom-centre `role=status` toast. `App.tsx` gates the toast off whenever any overlay (settings/chat/AI result/sheet) is open.

- **backup** — fires when the data fingerprint has grown ≥ `backupThreshold` (6) past a persisted baseline; its action runs a backup.

The backup nudge **snoozes** by advancing its baseline fingerprint (`tp_lifecycle_baseline`), so it returns only once enough *new* changes accumulate. A completed backup (new `tp_last_backup`) re-baselines automatically.

---

## Code Flows

### Offline plan generation
```
PlanView / stopPlan.ts → generateTripPlan(country, cities, days, rule, basis, experiences)
  → rule engine (experience-aware: boosts matching cities + orders day activities) or generic fallback
  → TripPlan { duration, costPerPerson, days[], note }
  → Route Canvas → Cinematic / PDF / Share / 🗺️ Route
```

### AI plan flow
```
PlanView "AI plan" → ChatModal (pre-filled prompt from active route)
  → LLM conversation → "Finish & Generate" → extract JSON
  → AiItineraryModal → save/replace
  → useAiPlanStore persists generated plans
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
- **Hard commit gate:** a global floor of **90% statements/lines** is enforced by `vitest run --coverage` (thresholds in `vite.config.ts`), wired into both the pre-commit hook and `npm run validate`. Commits are blocked below 90%. Backup targets are tested against a reusable fake File System (`src/test/support/fakeFileSystem.ts`) covering permissions, the dedicated `Roamwise/` app folder, and read/write round-trips.

### Testing expansion plan (Phase 2 complete)

- Expanded App orchestration integration tests to cover:
  - default-hash landing (Plan) and route switching across the two top-level views
  - Plan landing destination selection, region filtering, and month-fit ranking (`monthFit` / `rankByMonthFit`)
  - feature-flag-driven AI prop wiring at the top shell boundary

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

- **Code-splitting**: Heavy modals/overlays are lazy-loaded via `React.lazy()` + `Suspense` (~123 KB deferred from initial bundle): `ChatModal`, `ItineraryCinematic`, `SettingsModal`, `AiItineraryModal`, `FreTour`
- **Idle-time enrichment**: `useCountryStore` enriches seed countries in `requestIdleCallback` chunks of 10 — first paint renders instantly with minimal seed objects, cards progressively hydrate. Any destination recorded in Recents (e.g. India, `inSeed: false`) is enriched on demand from its rule JSON, so tracked destinations show real budget/months/experiences — Recents are independent of the seed set. Bare catalog stubs are transparently upgraded to enriched data without discarding user edits.
- **Rule lazy-loading**: 199 JSON files in `data/rules/` loaded on demand via `import.meta.glob`, cached at module level in `useCountryRule`
- **Memoization**: `useMemo` across `App.tsx`, `useCountryStore`, `MyTripsView`, Plan Route Canvas derivations, and itinerary day grouping
- **Stale update guards**: `useCountryRule` + `fetchCountryInfo` discard results when selection changes before the fetch resolves

---

## Tailwind Conventions

- **Color tokens (source of truth in `tailwind.config.js`)** — the luxury warm-ivory neutral ramp is centralized as semantic tokens; **use these, never raw `[#hex]` neutrals** (they had drifted into ~40 near-duplicate hexes across the Plan journey; components now carry **zero raw `[#hex]` class literals**): ink `ink-1` (headings) / `ink-body` / `ink-2` (muted) / `ink-3` / `ink-4`; borders `line` / `line-strong`; surfaces `surface-1` / `surface-2` / `surface-3` / `surface-track` (sunken well / pill track / button fill); deep-emerald brand gradient tails `brand-900` / `brand-950`. Accents stay Tailwind palette: **emerald = primary** (`emerald-800` CTA text, `emerald-700` links/values, `emerald-200` hairlines), **amber = anchor/warnings**. Add a token rather than a bespoke hex when a new neutral is needed.
- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config
