# Travel Planner — Copilot Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner — no backend, no server, purely client-side. All state lives in localStorage. The app currently spans 20+ components, 9 custom hooks, and offline itinerary coverage for all 198 rule-backed destinations.

---

## Build & Validate

```bash
npx tsc --noEmit        # fastest type-check loop
npm test                # Vitest suite (861 tests across 94 files)
npm run test:coverage   # coverage report (must stay ≥ 90% total statements/lines)
npm run build           # tsc && vite build
npm run validate        # tsc + tests(+coverage) + knip + build
```

Run `npx tsc --noEmit` and `npm run build` before and after every change set. Use `npm test` whenever behavior changes or when documentation references current suite counts. `npm run validate` is the full confidence pass.
Before committing, ensure adequate test coverage for the behavior you changed (add or update TCs so regressions are caught).

**Coverage gate (hard):** the pre-commit hook and `npm run validate` run `vitest run --coverage`, which enforces a **global floor of 90% statements/lines** (set in `vite.config.ts` `coverage.thresholds`). A commit is blocked if total coverage drops below 90%. Per-directory thresholds also apply (`src/utils/**` 60/50/60, `src/core/utils/**` 80/70/80, etc.). Raise the floor when coverage rises; never lower it to force a commit through.

Current testing priority:
- Total statement coverage is ~90% (840 tests). Country-detail and itinerary surfaces (`CountryForm`, `ItineraryModal`, `PlanCompareModal`, `CountryPanel`) and the `ai` folder (`ChatModal` import/link/finalize flows, `SettingsModal` backup/restore/CSV flows) are now covered; the Trips view covers sort/filter plus trip create/edit/delete flows; the cinematic pure engine (`cinematic/engine.ts`) is unit-tested; `importParser` (incl. `fetchChatLink`), `usePanelDrag`, `useChatSession`, `core/storage`, and `App.tsx` orchestration handlers are covered; the platform-backup stack (`core/platform/*`, `core/adapters/backup/*`, `StorageLocationCard`) is covered via a reusable fake File System helper (`src/test/support/fakeFileSystem.ts`); remaining gaps are the maplibre-heavy `ItineraryCinematic` React shell / `MapView` / `HoverCard` (need a real WebGL context).
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
| Saved-trip snapshot store (My Trips) | `src/hooks/useSavedTrips.ts` |
| AI plan persistence | `src/hooks/useAiPlanStore.ts` |
| LLM chat state machine | `src/hooks/useChatSession.ts` |
| Hash-based routing | `src/hooks/useHashView.ts` |
| Breakpoint detection | `src/hooks/useBreakpoint.ts` |
| Resizable panel behavior | `src/hooks/usePanelDrag.ts` |
| Shared Back-button overlay stack (closes topmost overlay first; **persistent mode** lets one `open` window guard a multi-step flow so Back walks steps) | `src/hooks/useBackDismiss.ts` |
| Country detail panel | `src/components/country/CountryPanel.tsx` |
| Itinerary modal | `src/components/country/ItineraryModal.tsx` |
| Cinematic map experience (React shell) | `src/components/country/ItineraryCinematic.tsx` |
| Cinematic pure engine (paths, bearings, markers, rAF) | `src/components/country/cinematic/engine.ts` |
| Plan comparison modal | `src/components/country/PlanCompareModal.tsx` |
| AI chat/settings modals | `src/components/ai/ChatModal.tsx`, `src/components/ai/SettingsModal.tsx` |
| Guided planning wizard (view) | `src/components/views/plan/PlanView.tsx` |
| Guided planning funnel hook | `src/hooks/usePlanBuilder.ts` |
| Plan wizard subcomponents | `src/components/views/plan/{DestinationPicker,DayLengthControl,PlanCityJumpNav,PlanBasicsStep,PlanRouteSummary}.tsx` |
| Multi-country selection config + helpers | `src/core/utils/multiCountry.ts` (`MAX_TRIP_UNITS`, `toggleTripSelection`) |
| Destination scope seam (int'l today, domestic next) | `src/core/trip/{destinationSource,internationalSource,getDestinationSource}.ts` (`experiencesFor`, `dayBounds`, `comboRecommendations`, `loadUnit`) |
| Multi-country vibe union loader | `src/hooks/useTripExperiences.ts` |
| Multi-unit rule loader + funnel | `src/hooks/{useTripRules,useTripPlanner}.ts`; compose engine `composeTripPlan` in `src/core/utils/tripPlans.ts` |
| Shared per-stop derivation engine (single = N=1) | `src/core/utils/stopPlan.ts` (`deriveStop`, `projectStopCities`, `orderCitiesByExperience`) — both `usePlanBuilder` + `useTripPlanner` delegate to it |
| Multi-country Places step (Design D decision surface) | `src/components/views/plan/PlanPlacesStep.tsx` |
| Per-country Filters (experiences) popover/sheet | `src/components/views/plan/PlanFilters.tsx` |
| Route Canvas reference-rail atoms | `src/components/views/plan/{RailSection,PlanNotesSection}.tsx` (the old two-rail "Your trip" workspace — `PlanWorkspace`/`ShapeRail`/`ContextRail`/`PlanBudgetPanel`/`PlanPreviewPane` — was retired when single+multi unified onto the Route Canvas) |
| Plan workspace shell (shared single+multi layout) | `src/components/views/plan/PlanWorkspaceShell.tsx` |
| Multi-country Review "Route Canvas" | `src/components/views/plan/{TripReviewWorkspace,TripReviewCanvas,TripContextRail,BorderHop,RouteLeversBar,RouteOrderEditor,SegmentAdjustDrawer}.tsx` |
| Trip-level levers (route order DnD + inline jump-to-city) | `src/components/views/plan/{RouteLeversBar,RouteOrderEditor}.tsx` (via shared `PlanPopover`; drag/keyboard reorder → pure `moveIndex` in `core/utils/routeOrder.ts`; the compact `PlanCityJumpNav embedded` sits inline on the same row) |
| Shared portal popover (anchored desktop / bottom-sheet mobile) | `src/components/views/plan/PlanPopover.tsx` |
| Cross-route city jump nav (grouped, portaled) | `src/components/views/plan/PlanCityJumpNav.tsx` |
| Route order/anchor + honest readiness (pure) | `src/core/utils/{routeOrder,tripReadiness}.ts` |
| Shared itinerary atoms (composed toolbar) | `src/components/views/plan/ItineraryToolbar.tsx` |
| Unified Plan-journey header (identity + stats + basis + stepper) | `src/components/views/plan/{PlanTripHeader,BasisMenu,PlanCountrySwitcher}.tsx` |
| Creator's wishlist (starter pack) | `src/core/data/creatorWishlist.ts` |
| Popular destinations (Plan picker) | `src/core/data/popularDestinations.ts` |
| Trip planner engine | `src/utils/tripPlans.ts` |
| City↔experience matching (shared) | `src/core/utils/cityExperiences.ts` |
| City selection + day allocation (DP) | `src/core/utils/citySelection.ts` |
| Budget basis (party size) source of truth | `src/core/utils/budget.ts` |
| Feature flags | `src/core/featureFlags.ts` |
| Platform capability profile | `src/core/platform/platformProfile.ts` |
| Platform backup defaults + target selection | `src/core/platform/defaults.ts`, `src/core/platform/selectBackupTarget.ts` |
| Backup target port + adapters | `src/core/ports/BackupTargetPort.ts`, `src/core/adapters/backup/*` |
| localStorage keys | `src/utils/lsKeys.ts` |
| Saved-trip snapshot model (types + pure builder) | `src/core/utils/savedTrips.ts` |
| My Trips gallery view | `src/components/views/MyTripsView.tsx` |
| Rule manifest + lazy JSON chunks | `data/rules/index.json`, `data/rules/*.json` |
| Discover catalog | `data/worldCatalog.json` |

---

## Features & Views

4 hash-routed views (`#plan`, `#trips`, `#calendar`, `#discover`). **`#plan` is the default landing view** (`useHashView("plan")`; the brand/Home button routes to the same landing):

| View | Purpose |
|---|---|
| **Plan** (default landing) | Luxury emerald/ivory guided planning wizard — a streamlined funnel **Basics → Places (conditional) → Your trip** (`src/components/views/plan/`, orchestrated by `PlanView` + `usePlanBuilder`; steps are `["basics", ...(anyUnitHasCities ? ["cities"] : []), "review"]`). Basics = party size (`PillGroup accent="emerald"`) + vibe/experience chips + live `PlanRouteSummary`. On desktop Basics + Places sit on an elevated **"stage"** — a bordered white panel centred in the canvas (`lg:my-auto` + card styling in `PlanView`), so short steps read as an intentional luxe focal surface instead of floating on empty ivory (mobile stays full-bleed; Basics still centres its hero vertically, Places top-aligns). Basics also swaps its centred hero for a **left editorial header** ("Trip basics" eyebrow → "Who's going & what you love?" → subline) and a **two-column layout** (questions left, live summary as a companion card right) from `lg` up; the shared `PlanTripHeader` `width` prop (`narrow`/`wide`/`review`) keeps the header aligned to each step's body (Basics + Places share `wide`/`max-w-5xl`). **Places** (`PlanPlacesStep`) is a conditional step (skipped when no stop has cities) rendered as a **Design D decision surface**: a consolidated dark **header card** (country identity — a dropdown **country switcher** with a place-count badge for a multi-stop route via `PlanMenu` (breakpoint-aware: anchored dropdown desktop / scrimmed bottom-sheet mobile — same for Sort + basis), static name for one stop — trip stats *days · places · countries[multi] · budget*, and a trip-scoped **"Who's going"** basis dropdown) over rich **D3 decision cards** (a two-column card: ✓/+ affordance · name · one-line "known for" brief · experience chips with focus lit + a few muted [capped at `MAX_CHIPS`] on the left; a ≈nights · ☀best window · ⚠avoid-window rail + sparse "Top for X" signal on the right; plus an **ⓘ** opening `CityDetailModal` — a responsive detail surface [bottom-sheet mobile / centered modal desktop via `ModalShell`] with the full brief, uncapped tags and stay/season windows) in a two-up grid on `lg`; a single per-country **`PlanFilters`** control (experiences, anchored popover desktop / bottom-sheet mobile via `useBreakpoint`, count badge, hidden when the stop has no tags) and a **Sort** dropdown sit above them. The header is editorial: a single-row, truncating **"Which places in {Country}?"** question (country name lit emerald; `whitespace-nowrap` + `truncate` so long names stay one line with the trailing `?` preserved) + a short subline — pristine **"Suggested picks — add or drop any."**, flipping to an inline **Edited · ↺ Reset to suggested** affordance once a stop is hand-picked (no separate Reset pill). The selected/total count renders as an **`{N} of {M}`** badge beside the body's **"In your plan"** row (no "places" word — deduped, since the heading + top stat already read as places/stops). The primary stop shares the same `usePlanBuilder` city state as the Review canvas's per-stop Adjust drawer (lock-step); a multi-stop route loads additional stops via `useTripRules` + `useTripPlanner` and the header stats span the whole composed route. **Experiences are per-country** — Basics seeds the trip vibe; each stop inherits it until diverged in Filters. On desktop the step breaks out to `max-w-5xl`. The **header** carries a travel-style badge (`STYLE_META[primaryStyle]`) + a **Favorite ★** toggle + a **Visited** toggle, all from the shared `PlanActions` bundle (`planActions.ts`, pre-bound to `displayCountry.name`); the redundant duration·cost chip is hidden on Review. **"Your trip" is one unified Route Canvas** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail`, laid out by `PlanWorkspaceShell`) for **both single- and multi-country trips**: it normalises the primary funnel (`usePlanBuilder`) + each additional stop (`useTripPlanner`) into one ordered `ReviewSegment[]` and folds them into a single plan (`composeTripPlan`, **N=1 byte-identical**). The centre renders a **segmented composed itinerary** — a composed summary strip + cross-route `PlanCityJumpNav` over per-country segment blocks, each keeping its own rich `ItineraryView(seg.plan, seg.rule, "luxury")` (transport separators, route/search/maps links, eat/hotel pills), collapsible (anchor open by default) with route-relative day ranges (`shiftPlanDays`), and honest `BorderHop` rows between countries (great-circle flight estimate; rail/road "varies"; hops cost no days). Route order + anchor are display layers tuned from a single trip-level `RouteLeversBar` (drag-and-drop `RouteOrderEditor` via pure `moveIndex`/`orderByProximity`, keyboard reorder, ✨ Auto-arrange) with the inline jump-to-city dropdown on the same row. Each stop is shaped in its own ✏️ **Adjust drawer** (`SegmentAdjustDrawer`, `ModalShell` bottom-sheet mobile / centered modal desktop) — a Shape tab (`FocusChips`/`CityPicker`/`DayLengthControl` over `usePlanBuilder`|`useTripPlanner`) + a data-gated Details tab — so there is **no Shape rail**. Each segment header is a full-bleed collapse toggle: row 1 = flag · bold emerald name (hero) · ✏️ Adjust · collapse chevron; row 2 = places · day range · budget; the **anchor cue is a slim amber left accent bar** (sr-only "— anchor stop"), never a competing pill. The single right **`TripContextRail`** is trip-level reference only (Trip readiness, honest budget ledger with active basis, per-country `MonthHeatmap`/watch-outs/stopover tips, `PlanNotesSection` notes; sections render only when data exists); on desktop it renders inline + collapses to a reopen tab (persisted to `LS_KEYS.PLAN_UI`), on tablet/mobile it opens as a bottom-sheet drawer from a sticky "📌 Good to know" bar (`useBackDismiss` + Escape). Editing a stop’s levers regenerates the composed plan live — no stepping back. The composed toolbar (`ItineraryToolbar`) carries **📤 Share** (`useItineraryShare`), **📄 PDF** (`pdfExport`), **✨ AI plan** (`llmPlanning`); **Cinematic is currently omitted from the Plan wizard** (kept in the Country Panel) until the cross-country fly-through is wired. The funnel persists to `LS_KEYS.PLAN_DRAFT` (`planDraft.ts`) so refresh resumes the same step/selections. **Step navigation**: the header shows a **labeled, tappable stepper** (`Basics · Places · Review`, active/done/upcoming states) that doubles as back-nav — tap an earlier step to revisit it; there is no separate "Step N of M" caption. Device/gesture **Back walks one step back** at a time before leaving `#plan`, via a **persistent** `useBackDismiss` guard registered in `PlanView` (kept above the early return). Any open rail drawer registers on top of that guard, so Back closes the drawer first (LIFO), then steps. **On mobile the shared header compacts** (`PlanTripHeader`, `useBreakpoint`): the route title names only the first stop + a **+N** pill (full route in the `aria-label`), the "who's going" basis collapses to an **icon-only** `BasisMenu` (`iconOnly`, party size kept in the accessible name), and the **stepper is dropped on the Review canvas** (`hideStepperOnCompact`) to free itinerary real-estate. Since the review footer is hidden below `lg` (`hidden lg:block`), the workspace's mobile bottom bar (`PlanWorkspaceShell` `nav`) carries the wizard nav there — `[← Back] [📌 Good to know] [＋ Plan another]` (one reference rail for both single- and multi-country trips). The Route Canvas levers also shorten on mobile (`Route order`→`Route`, `Jump to country / city…`→`Jump`, aria-labels unchanged). The Plan page is self-contained — it never opens the single-country `CountryPanel` (which can't represent the roadmap's multi-country trips); Cinematic is the one shared overlay it reuses, and combine-with pills are plain informational chips. |
| **Trips** (My Trips) | Gallery of **saved-trip snapshots** built when a plan reaches the Review step (`useSavedTrips` over `LS_KEYS.SAVED_TRIPS`). ★ favorites section then newest-first; each `SavedTripCard` shows flags + route name (`tripSignature`, e.g. "Japan → Thailand"), city chips, `days · places · cost` (with the trip's *saved* basis icon) and a relative "saved" label, plus favorite ★ and delete (`useConfirm`) actions. **Each card is a stretched-action** — a full-card overlay `<button aria-label="Open {name}">` (z-10) reopens the route in the Plan wizard (`onOpen` → `App` sets `planSeed` via `toOpenRequest(trip, nonce)` (an `OpenTripRequest`), passes it as `PlanView openTrip` and switches to `#plan`; a nonce-guarded restore effect snaps the active budget basis back to the saved one, reseeds `selection`, jumps to Review, and **rehydrates each stop's snapshot cities + tuned length + experience focus, pinned** — primary via `usePlanBuilder`'s `PlanBuilderSeed`, additional stops via `useTripPlanner`'s `TripPlannerSeed`; applied once per nonce, aligned to resolved order, dropping cities absent from current rules, and — multi-stop — waiting for every seeded stop's rules to load first). Each stop's snapshot `days` is the **honest rendered length** (`plan.days.length`), not the pre-expansion pin, so a stop the DP planner expanded (e.g. 8→11 days) reopens to 11d.; favorite/delete sit above it (z-20) as **siblings** (not nested) to keep valid interactive HTML. Empty state offers a "Plan a trip" CTA → `#plan`. Snapshots are **self-contained** (independent of My List + rule data), so a saved trip stays viewable even if destinations change. Backup-recoverable via `BACKUP_KEYS`. |
| **Calendar** | Heatmap grid — rows = **all My List destinations** (fed `store.myListCountries` directly, **not** the Trips-filtered `filtered`; it owns its own Month filter), columns = months. Green = best, red = avoid, blue = current month. |
| **Discover** | Browse the 197-country sovereign catalog by region. Add/remove destinations from My List. Uses its own filter bar. One-click **creator's wishlist** starter pack (`creatorWishlistNames()`, preview + confirm) and **reset to starter list** (confirm), wired via `onAddMany` / `onResetList`. |

**MapView** is not a standalone route anymore — it stays mounted behind the UI and becomes visible for Cinematic mode.

**Multi-country Plan (`multiCountryPlanning`, default ON)** — `DestinationPicker` chips toggle an ordered `selection` (≤ `MAX_TRIP_UNITS`=4, `toggleTripSelection`), confirmed via a sticky "Plan trip →" tray → `onStart(countries)` seeds `PlanView.selection` (`picked = selection[0]`). Every wizard surface **molds from that selection via the `DestinationSource` seam** (`core/trip/`), so switching to a future `domestic`/India scope is a source swap, not a rewrite — no surface assumes "country". Molded surfaces: (1) **`PlanRouteSummary`** (Basics summary for single + multi; molds N=1) — route timeline summing each stop's *live rendered* days (`PlanView.routeStopDays`, `plan.days.length` per stop; falls back to `source.dayBounds(name).rec` only until a stop's rules load), so the `~N days` total tracks the header's composed plan and reacts to vibe/experience changes instead of drifting from a static baseline; longest stop badged **Anchor** (`Math.max`); single selections render the same `PlanRouteSummary`, molded to N=1 (no Anchor badge). (2) **`PlanBasicsStep`** vibe pills — single unit's tags, or the **union** across the route via `useTripExperiences(names, source)` (stale-guarded, over `source.experiencesFor`); overflow base-safeguarded by a height-bounded scroll container (NOT a hard cap) + UX-only `visibleCap` (default 10, `Infinity` disables) with "+N more" toggle outside the scroll; selected tags always visible. (3) **Header** — names first `HEADER_ROUTE_STOPS`=2 stops + a **+N** pill (shared portal `Tooltip`) revealing the full ordered route; `<h1 aria-label>` carries the complete route for SR. Basics subhead avoids promising controls the step lacks (no "how long" — length is auto-recommended). (4) **`PlanPlacesStep`** — a **Design D decision surface** molded from the units handed to it: a consolidated dark **header card** (a **dropdown country switcher** with a place-count badge for a multi-stop route / static name for one, trip stats *days · places · countries[multi] · budget*, and a trip-scoped **"Who's going"** basis) over rich **D3 decision cards** (two-column: name · "known for" brief · focus-lit experience chips on the left; ≈nights · ☀best window · ⚠avoid-window rail · "Top for X" signal on the right; plus an **ⓘ** opening a responsive `CityDetailModal` [bottom-sheet mobile / centered modal desktop] with the full brief, all tags and stay/season windows) in a two-up grid on `lg`; a single per-country **`PlanFilters`** control (experiences; anchored popover desktop / bottom-sheet mobile via `useBreakpoint`; count badge; hidden when the stop has no tags) and a **Sort** dropdown sit above them, with a single-row truncating **"Which places in {Country}?"** heading (emerald country name, long names truncate) + a short **"Suggested picks"** subline that flips to an inline **Edited · ↺ Reset to suggested** affordance when hand-picked, and an **`{N} of {M}`** count beside the "In your plan" row. The **additional stops** are loaded via `useTripRules(names, source)` (stale-guarded, over `source.loadUnit`) and curated by **`useTripPlanner(units, seedExperiences, basis)`** (one hook owning per-unit `{selectedCities, customDays, pinned, experiences}` state — never `usePlanBuilder` in a loop; prunes dropped stops; per-stop derivation delegated to the shared pure `deriveStop`/`projectStopCities` engine in `core/utils/stopPlan.ts` (the same engine `usePlanBuilder` uses, so a stop plans identically at any route position — single-country is its N=1 case)); the primary stop stays on `usePlanBuilder`. **Experiences are per-country**: `experiences: null` inherits the trip seed (from Basics), a non-null array overrides just that stop (`effectiveExperiences = override ?? seed`); `toggleExperience`/`clearExperiences` diverge one stop without touching its siblings. All stops fold into one plan via pure **`composeTripPlan(segments, basis)`** (concatenates `days[]` (renumbering them continuously across the route via `shiftPlanDays` while keeping honest `days.length`), sums cost ranges, names the route, aggregates warnings; **N=1 returns the plan unchanged** so single-country is byte-identical), which drives the header stats. The wizard's **Review** step composes and renders **all** stops as a segmented **"Route Canvas"** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail` via the shared `PlanWorkspaceShell`): one composed, cross-route jump nav over per-segment blocks (the route label + who's-going + stats live once in the shared `PlanTripHeader`, so the canvas drops any duplicate summary band; the levers bar (with its inline Jump) is pinned above the itinerary scroll area on every breakpoint, so there is no separate back-to-top control), each keeping its own rich `ItineraryView(seg.plan, seg.rule, "luxury")` (composed plans lose per-country rule association, so render per-segment) with **per-stop shaping in a focused Adjust drawer** (`SegmentAdjustDrawer` — a `ModalShell` bottom-sheet mobile / centered modal desktop, opened by the stop's **✏️ Adjust** trigger; a **Shape** tab with the shared `FocusChips` + `CityPicker` + `DayLengthControl` (over `usePlanBuilder`/`useTripPlanner`, so every stop shapes identically) plus a read-only **Details** tab of per-stop reference [best/avoid windows, watch-outs, stopover tip, pairs-with] shown only when the country carries that data; replaced the old cramped inline expansion so a segment card never grows unboundedly), a **cumulative day-range** label, and **collapsible** bodies (anchor open by default). **Route order + anchor are independent display layers** the workspace owns (`order` index permutation + `anchorName`), tuned from a **trip-level `RouteLeversBar`** above the segments (so each stop header stays uncluttered — identity · ✏️ Adjust · collapse (the whole emerald-tinted `bg-emerald-50/70` header band — a branded per-country "section" title bar — is a full-bleed collapse toggle; row 1 is flag · bold emerald name (hero) · ✏️ Adjust · collapse chevron, with **no numeric stop badge** (order reads from name + day range + route bar); row 2 is places · cumulative day range · per-stop budget; the **anchor cue is a slim amber left accent bar** (sr-only "— anchor stop"), never an inline pill competing with the name)): a **Route order** popover (a `RouteOrderEditor` with **drag-and-drop** — ⠿ grip, pointer-capture drag + live drop indicator, mobile touch — and **keyboard Arrow Up/Down** reorder on the focused grip, delegating to pure `moveIndex(from,to)` in `core/utils/routeOrder.ts` · promote anchor ★ · one-tap **✨ Auto-arrange** = `orderByProximity`/`haversineKm` nearest-neighbour from the anchor, gated ≥3 stops + finite coords) opening through the shared **`PlanPopover`** (portaled, anchored desktop / bottom-sheet mobile, Escape-restores-focus), with the compact **jump-to-city** dropdown (`PlanCityJumpNav embedded`) rendered **inline on the same row** so the toolbar stays one line. **Total trip length is no longer an editable lever** — it's a read-only header stat, retuned per stop via each stop's Adjust drawer. `composeTripPlan` re-runs in visit order and **never unpicks** the primary stop (N=1 stays byte-identical); both reset only when the pick set changes. Between countries render **honest `BorderHop` rows** — collapsed "Travel from X to Y", expandable to an informational mode picker (distance-derived indicative ✈ flight `~Nh`, rail/road "varies", hops cost no days). The right rail is trip-level reference only: **Trip readiness** (pure honest fallback + border-crossing count via `core/utils/tripReadiness.ts`), an **honest budget ledger** (×nights line items + italic legs estimate + "flights extra" caveat) **labelled with the active basis — no duplicate basis switch or trip totals in the rail or levers bar** (the who's-going basis + headline stats live once in the persistent `PlanTripHeader`), per-country `MonthHeatmap` + watch-outs, and **Notes** (`PlanNotesSection`); **no Shape rail** in multi (stops shaped in the Adjust drawer). Each stop's **planning warning** (e.g. length auto-expanded) renders **inside that stop's own segment block** (⚠️-prefixed, country-attributed), never as an ambiguous route-level banner. The cross-route **`PlanCityJumpNav`** shows desktop pills for short routes but **collapses to a portaled, country-grouped dropdown on every breakpoint past 5 cities** (bottom-sheet mobile) so dense routes don't crowd the strip; jumping into a **collapsed** country first expands it (`onJump`/`handleJump` + rAF scroll) so the target anchor exists. Multi-country cinematic is intentionally omitted (cross-country fly-through not wired). **Single- and multi-country trips both render through this canvas** — at N=1 the segment list is just the primary stop, the reorder/anchor levers mold away, and `composeTripPlan` returns the plan unchanged, so the single itinerary stays byte-identical. Shared `ItineraryToolbar` keeps the composed itinerary's action row identical across single + multi (the canvas carries its route label in the shared header); a shared `PlanTripHeader` (route identity + progressive stats strip + `BasisMenu` who's-going pill + `PlanCountrySwitcher` on multi Places + stepper) reads consistently across Basics/Places/Review, so identity/stats/basis render once in the header rather than a per-step dark card. Saving is a **decoupled `TripSaveBar`** rendered in the `PlanTripHeader` top-right cluster (beside the who's-going basis pill), shown **only on Review** as a **compact inline affordance** (a small "✓ Saved" status with details in a tooltip + one ★ favourite pill — never a full-width banner, so it doesn't eat vertical space above the itinerary): the wizard **auto-saves the whole composed route to My Trips immediately** (`onSaveTrip` → `useSavedTrips.upsert`, guarded by a content signature so identical renders don't re-write and re-saving the same ordered route updates in place — preserving id/favorite/savedAt — rather than duplicating). The ★ toggle acts on the *saved trip snapshot* (`onToggleTripFavorite` → `useSavedTrips.toggleFavoriteByName`, keyed by the route signature) — the same "favourite" meaning as the My Trips ★; the Plan journey no longer adds/favourites countries (that duality was removed). The snapshot (`buildTripSnapshot` in `savedTrips.ts`) is built from the ordered `selection` (attaching each stop's own loaded plan where rule data exists, so route identity stays honest even for rule-less secondary stops) and is **self-contained** (independent of My List + rule data). On Review the sticky footer's **"Plan another"** is a **modest secondary** (compact ghost, not the dominant primary). The old editable trip-groups subsystem (`useTripStore`/`tripGroups.ts`/`buildTrips`/grouped `TripGroupDef` cards) was retired in favour of this snapshot store.

**Country Detail Panel** — slides in from right (full-screen on mobile):
- Header: name, visited toggle, favorite ★, dedicated edit/delete actions
- Header flag rendering: explicit aliases + locale region-name lookup with full manifest-country coverage
- Travel style badge (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive). In the edit form travel style is **single-select** and sets the default day count via `defaultDaysForStyle()` (touch-and-go ≈ 60% recDays / explorer = recDays / immersive = maxDays)
- Edit form budget is a **single per-person (solo) input** → couple/family4 derived via `deriveBudgetBreakdown` (data-calibrated `BASIS_MULTIPLIER`: couple 1.77×, family4 3.45×) → `Country.budgetBreakdown`; the single `budget` string is kept synced to the derived couple value. `getBudgetBadges` must prefer `country.budgetBreakdown` over raw rule data so edits show in member chips
- Saving edits is an **in-place** panel update (no reload): identity-reset effect keys on `country.name`; a separate effect re-seeds the day slider from `travelStyle`/rule bounds. Editing budget alone preserves an in-progress plan
- **Three panel tabs** (`PANEL_TABS`, `panelTab` = `overview` | `plan` | `notes`): the former **Info tab was merged into Overview**. Overview = decision info (Trip readiness, When to go, Stopover tip, Watch out for, Combine with) followed by the merged research group (`LearnAboutSection`, `PlanningResourcesSection`, `UsefulLinksSection` from `panel/InfoSections.tsx`). All research sections are lazy collapsibles (Learn fetches only on expand), so the merge adds no eager network. Cities info lives only in the Plan tab
- **Experience + City filters are panel-local only** — the Plan tab hosts a "Focus experiences" multi-select and a "Cities to visit" picker (both scoped via CountryPanel `selectedExperiences`/`selectedCities` state). They shape ONLY this country's offline itinerary and must never touch global/App state or Calendar. Each `CityEntry` carries structured `experiences?: string[]` tags (authored override on the rule JSON, else derived at enrichment from notes + itinerary content). **Authored coverage is complete across all 198 rule-backed destinations**: hand-authored, web-verified per-city `experiences` from a fixed **35-tag canonical taxonomy** (generic categories like Beaches, Mountains, Skiing, History, Food, UNESCO Sites — never per-attraction strings), plus per-city `bestMonths` / `worstMonths?` (full month names, hemisphere/monsoon-correct). Selecting experiences anchors auto city-selection on the top one or two cities that deliver them best (`topExperienceCities` in `tripPlans.ts`, ranked by match count then `scoreCities` importance, capped at `EXPERIENCE_CITY_LIMIT` — not every city that lists the tag), sorts matching cities first in the picker (highlighted tags), and reorders each day's activities so matches surface first. Matching logic lives in one place — `src/core/utils/cityExperiences.ts` (`experienceTokens`/`tokenHits`/`ruleCityText`/`matchCityExperiences`), reused by `tripPlans.ts` (engine) and `countryData.ts` (enrichment). There is no global experience filter in App.tsx
- **Days slider re-seeds from selection** — the Plan tab's `customDays` re-seeds via `recommendedDaysForSelection()` (`tripPlans.ts`), a pure function of travel style + panel-local city/experience focus, clamped to `[1, maxDays]`. A focus experience sums the **top one or two** cities that deliver it best (`topExperienceCities`, capped at `EXPERIENCE_CITY_LIMIT`), not every matching city. The budget-tier factor (`BUDGET_DAY_FACTOR` ±15%) applies **only once the plan is scoped** (cities or experiences picked) — a pristine panel seeds to the style default (`defaultDaysForStyle`) so it lines up with the static "Recommended Xd" marker instead of silently diverging (this fixed a Norway case where premium budget pushed a fresh slider to 22d against a 19d marker). It reacts to style/budget (edited via `CountryForm`) and to experience/city focus **until the user drags the slider**, which pins the value (`daysPinned` state); the other knobs still drive the plan output but no longer override the day count. The pin is legible + recoverable in-UI: an "✨ Auto-tuned…" hint when live, a "Custom length" label + "↺ Reset to recommended (Xd)" button when pinned (tapping it clears the pin so the effect re-seeds). Switching country also clears the pin. The static "Recommended Xd" marker is separate — the system's fixed per-country baseline (`getRecRuleDays`), budget-blind, never tracks the filters. Budget tier comes from `getBudgetTier(budgetForBasis(country, basis))`. Panel-local only
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

**Navigation** — desktop uses a slim **luxury ivory/emerald** top bar (`bg-[#fbf9f3]/90` + backdrop-blur + `border-b border-[#e7e1d2]`; emerald wordmark + centered view pills in an `#efe9db` track, active = `bg-emerald-700 text-white` + Install/Share/Settings cluster restyled to the ivory palette); mobile uses a **fixed bottom tab bar** (`md:hidden`, `pb-safe`, ivory bg, the 4 views icon-over-label with an emerald-tinted active pill) with the top strip shrunk to brand + compact Install/Share + Settings. `AppInstallShare` header variant is styled for the light bar (ivory `#efe9db` share chip, emerald-filled Install — not the old dark `white/10`/blue). The PWA `theme-color` + manifest `theme_color`/`background_color` match the ivory bar. The hamburger menu / slide-down drawer were retired. `FreTour` is the **luxury emerald/ivory** first-run tour (emerald-gradient hero/install cards + ivory spotlight tooltips) that walks the nav in Plan-first order — Plan → Trips → Discover → Calendar → Settings; its targets (`data-tour="nav-*"`/`"settings"`) resolve to whichever element is visible per breakpoint.

---

## Architecture

### Component tree

```
App.tsx  (thin orchestrator — wires hooks to views)
├── Header (brand, desktop nav pills / mobile bottom tab bar, app actions only)
├── PlanView / MyTripsView / CalendarView / DiscoverView
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
  country/  — CountryPanel, CountryForm, ItineraryCinematic, ItineraryModal, PlanCompareModal, cinematic/engine.ts (pure fly-through engine), itinerary/ItineraryView (shared day renderer, variant="default"|"luxury"), panel/CityCard (variant="default"|"luxury")
  map/      — HoverCard and map internals
  shared/   — PillGroup (accent="blue"|"emerald"), FilterChip, Filters, Tooltip, HomeCountrySelector, DevFlagPanel, ExperienceDropdown, AppInstallShare, FreTour, ConfirmDialog (useConfirm)
  views/    — CalendarView, DiscoverView, MyTripsView (saved-trip gallery + SavedTripCard)
  views/plan/ — Guided wizard: PlanView + PlanTripHeader (shared identity + stats + basis + stepper; save control slotted via `saveSlot`) + TripSaveBar (Review-only save confirmation + single trip-favorite toggle → `useSavedTrips.toggleFavoriteByName`) + DestinationPicker (landing board ordered favorites → remaining → visited, each popularity desc), DayLengthControl, PlanCityJumpNav, PlanBasicsStep, PlanRouteSummary; shared shaping levers (FocusChips, CityPicker) + shared itinerary atoms (ItineraryToolbar) + shared portal popover (PlanPopover); the unified "Your trip" Review renders through PlanWorkspaceShell + the Route Canvas (TripReviewWorkspace, TripReviewCanvas, TripContextRail with RailSection/PlanNotesSection, BorderHop, RouteLeversBar, RouteOrderEditor drag/keyboard reorder, SegmentAdjustDrawer per-stop Shape·Details drawer) for BOTH single- and multi-country trips (single = N=1) — all luxury emerald/ivory
  views/discover/ — DiscoverView subcomponents (CreatorWishlistDialog starter-pack preview)
```

### Hooks (state management)

All state is hooks-based — no Redux, no context providers. `App.tsx` calls hooks and passes results as props.

| Hook | File | Responsibility |
|---|---|---|
| `useCountryStore` | `src/hooks/useCountryStore.ts` | Country CRUD, My List, manifest enrichment, favorites, visited |
| `useSavedTrips` | `src/hooks/useSavedTrips.ts` | Saved-trip snapshot store (My Trips): upsert-by-route, favorite (by id), favorite-by-route-name (Plan wizard), remove, reload |
| `useAiPlanStore` | `src/hooks/useAiPlanStore.ts` | Save/load/delete AI-generated plans (max 3 per destination) |
| `useChatSession` | `src/hooks/useChatSession.ts` | LLM chat state machine, token tracking, finalize flow |
| `useCountryRule` | `src/hooks/useCountryRule.ts` | Lazy-loads consolidated country data from `data/rules/*.json` |
| `usePersistedSet` | `src/hooks/usePersistedSet.ts` | Reusable `Set<string>` backed by localStorage |
| `useHashView` | `src/hooks/useHashView.ts` | Hash-based URL routing for the 4 top-level views (`plan`/`trips`/`calendar`/`discover`) |
| `useBreakpoint` | `src/hooks/useBreakpoint.ts` | Reactive `mobile` / `tablet` / `desktop` state |
| `usePanelDrag` | `src/hooks/usePanelDrag.ts` | Resizable desktop country panel drag behavior |
| `usePlanBuilder` | `src/hooks/usePlanBuilder.ts` | Guided `#plan` wizard funnel state (primary stop) — party/vibe/cities/length, `autoSelectedCities` materialization, inferred+pinned day count; per-stop derivation delegated to `core/utils/stopPlan.ts` |
| `useBudgetBasis` | `src/hooks/useBudgetBasis.ts` | Two-layer budget party size: persisted global default + transient active |
| `useLifecyclePrompts` | `src/hooks/useLifecyclePrompts.ts` | Soft, debounced, one-at-a-time lifecycle nudges (favorite → backup → add-to-list); permanent dismissal (persisted set) for onboarding nudges, snooze-by-baseline for backup |

### Shared UI components — reuse, don't recreate

| Component | File | Usage |
|---|---|---|
| `PillGroup` | `shared/PillGroup.tsx` | Segmented pill toggle |
| `FilterChip` | `shared/FilterChip.tsx` | Portal-based dropdown chip |
| `Tooltip` | `shared/Tooltip.tsx` | Portal-based info tooltip |
| `HomeCountrySelector` | `shared/HomeCountrySelector.tsx` | Feature-gated searchable dropdown |
| `DevFlagPanel` | `shared/DevFlagPanel.tsx` | Dev-mode feature flag toggle |
| `LifecyclePromptToast` | `shared/LifecyclePromptToast.tsx` | Soft bottom-centre lifecycle nudge toast (`role=status`, non-focus-stealing); renders `useLifecyclePrompts().prompt`, gated off while any overlay is open |
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
  Adds: inSeed, creatorPick, hasItinerary, recDays, maxDays, popularityScore
  Used by: initial My List population, slider bounds, lazy-load routing

Tier 3: Consolidated Rules (data/rules/*.json)
  198 per-country JSON files + index.json manifest (199 total JSON files in data/rules)
  Contains: country detail data + day-wise itinerary content
  Loaded lazily via import.meta.glob in useCountryRule
```

Curated starter destinations are controlled by two manifest flags: **`inSeed`** (5 destinations auto-seeded into My List on first run — Japan, Thailand, Switzerland, France, Italy) and **`creatorPick`** (43-destination **creator's wishlist**, an opt-in one-click starter pack in Discover via `creatorWishlistNames()` in `src/core/data/creatorWishlist.ts`). Discover also offers a **reset to starter list** action. Special non-catalog destinations live only in the rule system and still participate in offline itinerary generation.

### Saved trips (My Trips)

`src/core/utils/savedTrips.ts` owns the snapshot model — `SavedTrip = {id, name, stops:{country,days,cities,experiences?}[], basis, totalDays, costPerPerson, savedAt, favorite?}` (each stop's `days` is the **honest rendered length** `plan.days.length`, not the pre-expansion pin; `experiences?` is the stop's saved focus, omitted when empty) — plus pure `buildTripSnapshot(input, now?)` (time injected for testability) and `tripSignature(countries)` (joins the ordered route with `" → "`; the trip's `name`/identity). `useSavedTrips` (`LS_KEYS.SAVED_TRIPS`) exposes `{savedTrips, upsert, remove, toggleFavorite, reload}`; `upsert` is keyed by route signature — re-saving updates in place (preserves id/favorite/savedAt), new trips prepend. Snapshots are **self-contained** (independent of My List + rule data). Reopening a saved trip **fully rehydrates** it — the ordered stops' cities + honest tuned lengths (pinned) + per-stop experience focus + saved basis — via `usePlanBuilder`/`useTripPlanner` seeds keyed by nonce; `toOpenRequest(trip, nonce)` builds the `OpenTripRequest` and `findSavedTripForCountries(trips, names)` (exact ordered signature, else newest set match) powers the landing resume-vs-fresh prompt. The old editable trip-groups subsystem (`useTripStore`, `tripGroups.ts`, `TripsView`/`views/trips/*`, `buildTrips`, the `tripGroups` flag, `tp_trip_customs`/`tp_trip_deleted`) was retired in favour of this store. Combos ("Combine with" pills) come from Country rule data, not trip groups.

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

This pattern applies to countries (saved trips use an independent snapshot store, not seed+overrides):
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
4. Budget tiering — `getBudgetTier` parses a `₹150K`/`₹2L`/`₹1.5L–₹3L` string via the canonical `parseBudgetRange` (`budget.ts`) and buckets by the **range midpoint** (fairer than the lower bound): ≤₹1.5L `budget`, ≤₹3L `mid`, else `premium`. Uses the selected basis (`solo` / `couple` / `family4`) when available

Portal-based dropdowns/tooltips use `createPortal()` to prevent clipping in overflow/scroll containers (shared chips/tooltips and modal/panel overlays).
Trips view intentionally does not apply app-level experience tags, so Trips filtering always matches visible Trips controls.
The **App-level filter bar (`selectedMonth`/`budgetFilter`/`visitedFilter`) belongs to Trips only.** Trips consumes `filteredForTrips`/`filtered`; **Calendar is fed `store.myListCountries` directly** (whole My List) and owns its own Month filter — never route the Trips-filtered list into Calendar or it silently drops rows the user can't see they filtered. The hidden cinematic `MapView` still uses `filtered`.

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
| `SAVED_TRIPS` | `tp_saved_trips` | `SavedTrip[]` — saved-trip snapshots (My Trips) |
| `FEATURES` | `tp_features` | `FeatureFlags` — feature flag overrides |
| `LLM_KEYS` | `tp_llm_keys` | LLM API keys per provider |
| `LLM_PROVIDER` | `tp_llm_provider` | Active LLM provider selection |
| `AI_PLANS` | `tp_ai_plans` | `Record<string, SavedAiPlan[]>` — saved AI plans |
| `LAST_BACKUP` | `tp_last_backup` | ISO timestamp of last backup |
| `BACKUP_FREQUENCY` | `tp_backup_frequency` | Reminder cadence |
| `BACKUP_SCHEDULE` | `tp_backup_schedule` | Backup scheduling metadata |
| `BACKUP_TARGET` | `tp_backup_target` | Platform backup destination override (`filesystem`/`opfs`/`download`) |
| `FRE_DONE` | `tp_fre_done` | First-run experience completed/dismissed |
| `PLAN_DRAFT` | `tp_plan_draft` | Guided Plan wizard draft (ordered `countries`/step/cities/experiences/days/pinned) — resumes the funnel on refresh; `loadPlanDraft` migrates the legacy single-`country` shape |
| `PLAN_UI` | `tp_plan_ui` | Guided Plan workspace UI state — desktop left/right rail collapse |
| `LIFECYCLE_DISMISSED` | `tp_lifecycle_dismissed` | `string[]` — permanently dismissed lifecycle nudge ids (`add-to-list`, `favorite:{country}`) |
| `LIFECYCLE_BASELINE` | `tp_lifecycle_baseline` | `{ backupAt, fingerprint }` — backup-nudge baseline (resets on backup, advances on snooze) |
| `SCHEMA_VERSION` | `tp_schema_version` | Persisted-data schema version |

No server sync — refresh survival is purely localStorage. `usePersistedSet` backs the set-style keys (`visited`, `favorites`, `myList`).

**Schema migrations** (`src/core/migrations.ts`): `runMigrations()` runs once in `main.tsx` before any hook reads storage. Bump `SCHEMA_VERSION` and append an ordered `MIGRATIONS` entry to evolve a persisted shape; pre-versioning stores are stamped as the v1 baseline. The runner never throws so a bad migration can't block boot.

**Platform-aware backup targets** (`src/core/platform/`): auto-backup is routed to a capability-based target so data is findable + restorable per device. `detectPlatformProfile(env)` is pure (OS/form-factor/surface + capability flags); `resolvePlatformDefaults()` picks a `BackupTargetKind` (`filesystem` for desktop with File System Access → `opfs` for mobile → `download` fallback). Adapters implement `BackupTargetPort` (`write`/`readLatest`/`configure`/`location`); every persistent target stores data inside a dedicated `Roamwise/` app folder (created if absent, shared via `adapters/backup/appDir.ts`) as a stable `roamwise-backup-latest.json`, so backups are grouped and re-readable. The filesystem adapter persists a picked `FileSystemDirectoryHandle` in IndexedDB (`handleStore.ts`) and re-verifies read/write permission. `backup.ts` exposes `backupToTarget()`, `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and target-kind override helpers. Its `BACKUP_KEYS` set (each shape-validated on restore) covers all recoverable trip data — My List, visited, favorites, customs + tombstones, home country, **budget basis (party size)**, **saved trips (My Trips)**, feature flags, LLM provider, and saved AI plans — but never the sensitive `LLM_KEYS`; saved trips (and their favorites) are thus recoverable and re-appear in My Trips on restore. On mount `App.tsx` backs up overdue data, or — on a fresh device with no local data — **offers** (never silently applies) a restore from the target. Settings → Backup surfaces the active location via `StorageLocationCard`.

---

## Performance

- **Lazy loading**: `data/rules/` contains 199 JSON files total (198 country chunks + `index.json`), loaded on demand via `import.meta.glob`
- **Code-splitting**: Heavy modals/overlays (`ChatModal`, `ItineraryCinematic`, `SettingsModal`, `AiItineraryModal`, `FreTour`, `CountryForm`, `ItineraryModal`, `PlanCompareModal`) are lazy-loaded via `React.lazy()` + `Suspense`, moving ~123 KB out of the initial bundle
- **Idle-time enrichment**: Seed country data enriches in `requestIdleCallback` chunks of 10, so the first paint renders instantly with minimal seed data and cards progressively hydrate
- **Module-level caching**: `useCountryRule` keeps each country loaded at most once per session
- **Memoization**: `useMemo` is used across `App.tsx`, `useCountryStore`, `MyTripsView`, `CountryPanel`, and `ItineraryModal`
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

Both PDF paths consume a single shared, pure model — **`src/utils/pdfModel.ts`** (`buildPdfModel(plan, country, homeCountry, stops?)` → `{ title, homeCountry, multi, meta, sections, note, warning }`). It slices the composed plan's continuously-numbered days back into per-stop **sections** by each stop's `dayCount`, so the PDF renders **per-country section bands** for a multi-stop route and a plain single-destination layout when there's one stop (title = country name). It's **scope-agnostic and unbounded** — any `PdfRouteStop[]` works, so a future domestic (states/cities) route or an N-country trip renders automatically with no renderer changes. Single-stop is byte-identical in structure to the old single-country PDF. `routeStops` is built from `segments` in `TripReviewCanvas` and threaded through `ItineraryToolbar` → `useItineraryShare` + `exportItineraryAsPdf`; at N=1 `segments` is the lone stop, so single-country builds a one-stop `routeStops` through the same canvas.

`src/utils/pdfExport.ts` uses a hidden iframe + `window.print()` flow (the "Export PDF" button) — it is not a PDF library. It builds print HTML from the shared model (route title + per-stop `.section-header` bands for multi), themed in the app's **emerald/ivory** palette with a **serif display** (`ui-serif, Georgia`) title.

`src/utils/pdfDocument.ts` builds a real PDF `Blob` with **jsPDF** for the Country Panel / Plan **Share** action, so the itinerary can be attached to the native share sheet without a download. It renders a styled layout (emerald header band with eyebrow + meta pills, per-stop **STOP N** section bands for multi-stop routes, summary/day cards with accent bars and drawn dot bullets, and a web-style "PRACTICAL NOTES" card that reuses `parseNoteItems()` from `src/core/utils/practicalNotes.ts` — the same parser the web `ItineraryModal` uses). Display titles + section names use jsPDF's built-in **Times** serif to echo the app's `font-display` (zero added bytes — no embedded font). jsPDF's built-in fonts are **Latin-1 only**, so all text passes through `pdfSafe()` which maps `₹`→"Rs ", `→`→">", smart quotes/dashes/ellipsis, and strips anything else (e.g. emoji) that would render as tofu — never feed raw `₹`/arrows/emoji to jsPDF. **Because font glyphs can't render emoji, richness comes from images/vectors instead:** a module-level `drawIcon()` library draws crisp line/fill icons (pin·calendar·money·sun·city·compass·warning) on the meta pills, summary card, day headers, section meta and warning block; **country flags are real images** — `src/utils/flagImage.ts` rasterises the same `getCountryFlag()` emoji the web uses to a PNG (via an offscreen canvas, memoised) which `drawImageTile()` embeds with `addImage` beside the title (single country) and in each **STOP N** band (multi); and the **Roamwise brand logo** is stamped as a letterhead mark in the header (top-right) and footer via `src/utils/brandLogo.ts` — the app's own icon (`src/assets/brandMark.png`) inlined as a base64 data URL so it embeds synchronously with no fetch. (The logo is force-inlined by `vite.config.ts` `assetsInlineLimit` because **Vite 5 has no `?inline` query** and the mark exceeds the default 4 KB threshold; sourcing it from `src/assets` — not `public/` — is what lets the bundler inline it.) **Multi-country routes render each stop's own practical notes** (`drawNotesCard`, titled "Practical notes · <Country>") — the composed plan's generic route note is skipped, and each `PdfSection` carries its stop's `note` (threaded from the segments via `PdfRouteStop.note`), so SIM/apps/connections/tips stay attributed per country and scale to any number of stops. The footer carries a clickable **"Plan your own trip → <app>" link** (`appUrl()`) so a shared PDF invites the recipient back into the app. Flags degrade to the vector pin when no canvas is available (e.g. jsdom tests) and to a 2-letter code on platforms without flag emoji (Windows) — so it's offline, asset-free, and scope-agnostic (works for any country, unbounded multi-country, and future domestic scopes). The print-HTML **Export** path (`pdfExport.ts`) mirrors all of this: brand-logo letterhead, per-country practical notes, and the footer app link. jsPDF is heavy (~130 KB gzip) so this module is only ever reached via dynamic `import()` — never import it statically. `useItineraryShare` (`src/hooks/useItineraryShare.ts`) owns the share flow (native PDF file → native text → clipboard), prefetches the jsPDF chunk on pointer/focus to keep the share within the user gesture, and reuses `appUrl()`. `buildShareText` lives in `src/components/country/panel/shareText.ts` (re-exported from `ShareButton`).

### Wiki images

`src/utils/wikiImages.ts` fetches Wikimedia Commons images and caches results at module scope.

---

## Feature Flags

System in `src/core/featureFlags.ts`. Stored in `tp_features` localStorage key.

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `true` | system | Master gate — enables premium features |
| `llmPlanning` | `true` | paid | AI trip planning flow |
| `pdfExport` | `true` | paid | Export itineraries as PDF |
| `searchableHomeCountry` | `false` | free | Searchable home-country dropdown |
| `multiCountryPlanning` | `true` | free | Multi-country planning on `#plan` (multi-select picker + tray, up to `MAX_TRIP_UNITS`=4); enabled by default. Wizard surfaces mold from the selection via the `DestinationSource` seam |

**Adding a new flag:**
1. Add to `FeatureFlags` type in `featureFlags.ts`
2. Add default to `DEFAULTS`
3. Use `isEnabled('flagName')` to check
4. Document in README, DESIGN, and this file

---

## Routing

Hash-based, no library. `AppView` + `VALID_VIEWS` live in `src/hooks/useHashView.ts`. Current top-level routes are `plan`, `trips`, `calendar`, and `discover`. `useHashView(fallback)` takes the landing view for an empty/invalid hash; `App.tsx` passes `"plan"` so **Plan is the default landing**. The brand/Home button routes to that same landing. The navigation `pushState` runs in a **`useLayoutEffect`** (not passive) so it commits before any passive cleanup elsewhere — a view that owns a persistent `useBackDismiss` guard (e.g. `PlanView`) rewinds its history sentinel via `history.back()` in a passive unmount cleanup, and React runs all passive destroys before passive creates; a passive push would land after that rewind and get clobbered (nav bounced back). Regression: `src/test/navBackDismiss.test.tsx`.

**Adding a new view:**
1. Add to `AppView` type in `useHashView.ts`
2. Add to `VALID_VIEWS`
3. Add label to `VIEW_LABELS` in `App.tsx`
4. Add render branch in `App.tsx`
5. Keep filter ownership explicit (Trips view owns trip-header filter controls)

---

## Tailwind conventions

- **Color tokens (source of truth in `tailwind.config.js`)** — the luxury warm-ivory neutral ramp is centralized as semantic tokens; **use these, never raw `[#hex]` neutrals** (they had drifted into ~40 near-duplicate hexes): ink `ink-1` (headings) / `ink-body` / `ink-2` (muted) / `ink-3` / `ink-4`; borders `line` / `line-strong`; surfaces `surface-1` / `surface-2` / `surface-3`. Accents stay Tailwind palette: **emerald = primary** (`emerald-800` CTA text, `emerald-700` links/values, `emerald-200` hairlines), **amber = anchor/warnings**. When a new neutral is genuinely needed, add a token rather than a bespoke hex.
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
- ❌ `setTimeout`/`setInterval` that calls `setState` without cleanup — store the id in a `useRef` and clear it in `useEffect(() => () => clearTimeout(ref.current), [])` (class components: clear in `componentWillUnmount`). This is the established convention; a `setCopied(false)` reset timer with no cleanup is a stale-setState bug.
- ❌ `window.open(url, "_blank")` or `<a target="_blank">` without `rel="noopener noreferrer"` / the `"noopener,noreferrer"` window feature — tab-nabbing vector. (Exception: an intentionally-retained same-origin window handle, e.g. the print window in `pdfExport.ts`.)
- ❌ Animating layout-triggering properties (`left`/`top`/`right`/`bottom`) — use `transition-transform` + `translate-*` instead. (Progress bars animating `width` are an accepted exception; `scaleX` distorts gradients/rounded ends.)

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
| **External links** | `<a target="_blank">` and `window.open(..., "_blank")` MUST set `rel="noopener noreferrer"` / the `"noopener,noreferrer"` feature string |
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
| **No layout animation** | Animate `transform`/`opacity`, never `left`/`top`/`right`/`bottom` (compositor-friendly). Progress-bar `width` is the one accepted exception |
| **Timers cleaned up** | Every `setTimeout`/`setInterval` is stored in a ref and cleared on unmount — no stale-setState after teardown |
| **No dead keyframes** | Remove unused `@keyframes` from index.css |

### Component quality gate — verify before PR

1. Tab through the component — can you see where focus is?
2. Shrink viewport to 375px — are all buttons tappable? Any overflow?
3. Enable reduced-motion in DevTools — do animations stop?
4. Screen reader: are interactive elements announced correctly?
5. Run `npx knip` — any dead exports introduced?
