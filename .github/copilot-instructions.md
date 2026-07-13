# Travel Planner — Copilot Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner — no backend, no server, purely client-side. All state lives in localStorage. The app currently spans 20+ components, 9 custom hooks, and offline itinerary coverage for all 198 rule-backed destinations.

---

## Build & Validate

```bash
npx tsc --noEmit        # fastest type-check loop
npm test                # Vitest suite (1159 tests)
npm run test:coverage   # coverage report (must stay ≥ 90% total statements/lines)
npm run build           # tsc && vite build
npm run validate        # tsc + tests(+coverage) + knip + build
```

Run `npx tsc --noEmit` and `npm run build` before and after every change set. Use `npm test` whenever behavior changes or when documentation references current suite counts. `npm run validate` is the full confidence pass.
Before committing, ensure adequate test coverage for the behavior you changed (add or update TCs so regressions are caught).

**Coverage gate (hard):** the pre-commit hook and `npm run validate` run `vitest run --coverage`, which enforces a **global floor of 90% statements/lines** (set in `vite.config.ts` `coverage.thresholds`). A commit is blocked if total coverage drops below 90%. Per-directory thresholds also apply (`src/utils/**` 60/50/60, `src/core/utils/**` 80/70/80, etc.). Raise the floor when coverage rises; never lower it to force a commit through.

Current testing priority:
- Total statement coverage is 90.01% (1159 tests). Plan/itinerary surfaces and the `ai` folder (`ChatModal` import/link/finalize flows, `SettingsModal` backup/restore/CSV flows) are now covered; the Trips view covers sort/filter plus saved-trip open/favorite/delete flows; the cinematic pure engine (`cinematic/engine.ts`) is unit-tested; `importParser` (incl. `fetchChatLink`), `useChatSession`, `core/storage`, and `App.tsx` orchestration handlers are covered; the platform-backup stack (`core/platform/*`, `core/adapters/backup/*`, `StorageLocationCard`) is covered via a reusable fake File System helper (`src/test/support/fakeFileSystem.ts`); remaining gaps are the maplibre-heavy `ItineraryCinematic` React shell / `MapView` / `HoverCard` (need a real WebGL context).
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
| Country catalog, implicit Recents/MRU, lazy seed enrichment | `src/hooks/useCountryStore.ts` |
| Per-country rule loading + cache | `src/hooks/useCountryRule.ts` |
| Saved-trip snapshot store (My Trips) | `src/hooks/useSavedTrips.ts` |
| AI plan persistence | `src/hooks/useAiPlanStore.ts` |
| LLM chat state machine | `src/hooks/useChatSession.ts` |
| Hash-based routing | `src/hooks/useHashView.ts` |
| Breakpoint detection | `src/hooks/useBreakpoint.ts` |
| Shared Back-button overlay stack (closes topmost overlay first; **persistent mode** lets one `open` window guard a multi-step flow so Back walks steps) | `src/hooks/useBackDismiss.ts` |
| Cinematic map experience (React shell) | `src/components/country/ItineraryCinematic.tsx` |
| Cinematic pure engine (paths, bearings, markers, rAF) | `src/components/country/cinematic/engine.ts` |
| AI chat/settings modals | `src/components/ai/ChatModal.tsx`, `src/components/ai/SettingsModal.tsx` |
| Guided planning wizard (view) | `src/components/views/plan/PlanView.tsx` |
| Guided planning funnel hook | `src/hooks/usePlanBuilder.ts` |
| Plan wizard subcomponents | `src/components/views/plan/steps/{DestinationPicker,PlanBasicsStep,PlanRouteSummary}.tsx · controls/{DayLengthControl,PlanCityJumpNav}.tsx` |
| Multi-country selection config + helpers | `src/core/utils/multiCountry.ts` (`MAX_TRIP_UNITS`, `toggleTripSelection`) |
| Destination scope seam (int'l + domestic India live) | `src/core/trip/{destinationSource,internationalSource,domesticIndiaSource,getDestinationSource,domesticScope,unitFlag}.ts` (`experiencesFor`, `dayBounds`, `comboRecommendations`, `loadUnit`, `ruleStore`); `TripScope` = `"international" \| "domestic"`; `hasDomesticScope()` gates the toggle |
| Multi-country vibe union loader | `src/hooks/useTripExperiences.ts` |
| Multi-unit rule loader + funnel | `src/hooks/{useTripRules,useTripPlanner}.ts`; compose engine `composeTripPlan` in `src/core/utils/tripPlans.ts` |
| Shared per-stop derivation engine (single = N=1) | `src/core/utils/stopPlan.ts` (`deriveStop`, `projectStopCities`, `orderCitiesByExperience`) — both `usePlanBuilder` + `useTripPlanner` delegate to it |
| Multi-country Places step (Design D decision surface) | `src/components/views/plan/steps/PlanPlacesStep.tsx` |
| Per-country Filters (experiences) popover/sheet | `src/components/views/plan/controls/PlanFilters.tsx` |
| Route Canvas reference-rail atoms | `src/components/views/plan/review/{RailSection,PlanNotesSection}.tsx` (`RailSection` has a `variant`: `card` for the desktop rail, `flat` — no border/shadow — inside the "Insights" bottom-sheet so it matches the Adjust/Filters sheets; `TripContextRail` picks the variant by breakpoint) |
| Plan workspace shell (shared single+multi layout) | `src/components/views/plan/shell/PlanWorkspaceShell.tsx` |
| Multi-country Review "Route Canvas" | `src/components/views/plan/review/{TripReviewWorkspace,TripReviewCanvas,TripContextRail,BorderHop,RouteLeversBar,RouteOrderEditor,SegmentAdjustDrawer}.tsx` |
| Order-aware composed route model (shared by header Share + Route Canvas) | `src/components/views/plan/review/useReviewRoute.ts` |
| Header Share chip (Plan wizard) | `src/components/views/plan/save/PlanShareButton.tsx` |
| Shared bottom-sheet/drawer chrome atoms (grip band + SVG close) | `src/components/views/plan/ui/sheetChrome.tsx` |
| Trip-level levers (route order DnD + inline jump-to-city) | `src/components/views/plan/review/{RouteLeversBar,RouteOrderEditor}.tsx` (via shared `PlanPopover`; drag/keyboard reorder → pure `moveIndex` in `core/utils/routeOrder.ts`; the compact `PlanCityJumpNav embedded` sits inline on the same row) |
| Shared portal popover (anchored desktop / bottom-sheet mobile) | `src/components/views/plan/ui/PlanPopover.tsx` |
| Cross-route city jump nav (grouped, portaled) | `src/components/views/plan/controls/PlanCityJumpNav.tsx` |
| Route order/anchor + honest readiness (pure) | `src/core/utils/{routeOrder,tripReadiness}.ts` |
| Shared itinerary atoms (composed toolbar) | `src/components/views/plan/ui/ItineraryToolbar.tsx` |
| Unified Plan-journey header (identity + stats + basis + stepper) | `src/components/views/plan/shell/{PlanTripHeader,PlanCountrySwitcher}.tsx · controls/{BasisMenu}.tsx` |
| Popular destinations (Plan picker) | `src/core/data/popularDestinations.ts` |
| Plan landing month-fit ranking | `src/core/utils/monthFit.ts` |
| Trip planner engine | `src/core/utils/tripPlans.ts` |
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
| World catalog fallback | `data/worldCatalog.json` |

---

## Features & Views

2 hash-routed views (`#plan`, `#trips`). **`#plan` is the default landing view** (`useHashView("plan")`; the brand/Home button routes to the same landing):

| View | Purpose |
|---|---|
| **Plan** (default landing) | Luxury emerald/ivory guided planning wizard — a streamlined funnel **Basics → Places (conditional) → Your trip** (`src/components/views/plan/`, orchestrated by `PlanView` + `usePlanBuilder`; steps are `["basics", ...(anyUnitHasCities ? ["cities"] : []), "review"]`). Basics = party size (`PillGroup`) + vibe/experience chips + live `PlanRouteSummary`. On desktop Basics + Places sit on an elevated **"stage"** — a bordered white panel centred in the canvas (`lg:my-auto` + card styling in `PlanView`), so short steps read as an intentional luxe focal surface instead of floating on empty ivory (mobile stays full-bleed; Basics still centres its hero vertically, Places top-aligns). Basics also swaps its centred hero for a **left editorial header** ("Trip basics" eyebrow → "Who's going & what you love?" → subline) and a **two-column layout** (questions left, live summary as a companion card right) from `lg` up; the shared `PlanTripHeader` `width` prop (`narrow`/`wide`/`review`) keeps the header aligned to each step's body (Basics + Places share `wide`/`max-w-5xl`). **Places** (`PlanPlacesStep`) is a conditional step (skipped when no stop has cities) rendered as a **Design D decision surface**: a consolidated dark **header card** (country identity — a dropdown **country switcher** with a place-count badge for a multi-stop route via `PlanMenu` (breakpoint-aware: anchored dropdown desktop / scrimmed bottom-sheet mobile — same for Sort + basis), static name for one stop — trip stats *days · places · countries[multi] · budget*, and a trip-scoped **"Who's going"** basis dropdown) over rich **D3 decision cards** (a two-column card: ✓/+ affordance · name · one-line "known for" brief · experience chips with focus lit + a few muted [capped at `MAX_CHIPS`] on the left; a ≈nights · ☀best window · ⚠avoid-window rail + sparse "Top for X" signal on the right; plus an **ⓘ** opening `CityDetailModal` — a responsive detail surface [bottom-sheet mobile / centered modal desktop via `ModalShell`] with the full brief, uncapped tags and stay/season windows) in a two-up grid on `lg`; a single per-country **`PlanFilters`** control (experiences, anchored popover desktop / bottom-sheet mobile via `useBreakpoint`, count badge, hidden when the stop has no tags) and a **Sort** dropdown sit above them. The header is editorial: a single-row, truncating **"Which places in {Country}?"** question (country name lit emerald; `whitespace-nowrap` + `truncate` so long names stay one line with the trailing `?` preserved) + a short subline — pristine **"Suggested picks — add or drop any."**, flipping to an inline **Edited · ↺ Reset to suggested** affordance once a stop is hand-picked (no separate Reset pill). The selected/total count renders as an **`{N} of {M}`** badge beside the body's **"In your plan"** row (no "places" word — deduped, since the heading + top stat already read as places/stops). The primary stop shares the same `usePlanBuilder` city state as the Review canvas's per-stop Adjust drawer (lock-step); a multi-stop route loads additional stops via `useTripRules` + `useTripPlanner` and the header stats span the whole composed route. **Experiences are per-country** — Basics seeds the trip vibe; each stop inherits it until diverged in Filters. On desktop the step breaks out to `max-w-5xl`. The shared `PlanTripHeader` carries route identity, stats, party-size basis, Share, and the saved-trip ★ favorite control; the redundant duration·cost chip is hidden on Review. **"Your trip" is one unified Route Canvas** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail`, laid out by `PlanWorkspaceShell`) for **both single- and multi-country trips**: it normalises the primary funnel (`usePlanBuilder`) + each additional stop (`useTripPlanner`) into one ordered `ReviewSegment[]` and folds them into a single plan (`composeTripPlan`, **N=1 byte-identical**). The centre renders a **segmented composed itinerary** — a composed summary strip + cross-route `PlanCityJumpNav` over per-country segment blocks, each keeping its own rich `ItineraryView(seg.plan, seg.rule, "luxury")` (transport separators, route/search/maps links, eat/hotel pills), collapsible (anchor open by default) with route-relative day ranges (`shiftPlanDays`), and honest `BorderHop` rows between countries (great-circle flight estimate; rail/road "varies"; hops cost no days). Route order + anchor are display layers tuned from a single trip-level `RouteLeversBar` (drag-and-drop `RouteOrderEditor` via pure `moveIndex`/`orderByProximity`, keyboard reorder, ✨ Auto-arrange) with the inline jump-to-city dropdown on the same row. Each stop is shaped in its own ✏️ **Adjust drawer** (`SegmentAdjustDrawer`, `ModalShell` bottom-sheet mobile / centered modal desktop) — a Shape tab (`FocusChips`/`CityPicker`/`DayLengthControl` over `usePlanBuilder`|`useTripPlanner`) + a data-gated Details tab — so there is **no Shape rail**. Each segment header is a full-bleed collapse toggle: row 1 = flag · bold emerald name (hero) · ✏️ Adjust · collapse chevron; row 2 = places · day range · budget; the **anchor cue is a slim amber left accent bar** (sr-only "— anchor stop"), never a competing pill. The single right **`TripContextRail`** is trip-level reference only (Trip readiness, honest budget ledger with active basis, per-country `MonthHeatmap`/watch-outs/stopover tips, `PlanNotesSection` notes; sections render only when data exists); on desktop it renders inline + collapses to a reopen tab (persisted to `LS_KEYS.PLAN_UI`), on tablet/mobile it opens as a bottom-sheet drawer from a sticky "Insights" bar (`useBackDismiss` + Escape). Editing a stop’s levers regenerates the composed plan live — no stepping back. The composed toolbar (`ItineraryToolbar`, built once in `TripReviewWorkspace`) carries **📄 PDF** (`pdfExport`), **✨ AI plan** (`llmPlanning`); **📤 Share** is promoted to the wizard header (`PlanShareButton`, left of the ★ favourite) reading the order-aware composed plan from the shared `useReviewRoute` hook, so it is never buried and always shares the on-screen route order; **Cinematic launches from the Plan wizard** using the cinematic-only `MapView` backdrop. The toolbar node is handed to **both** surfaces so it mounts exactly once per breakpoint: on **desktop** `TripReviewCanvas` pins it as a foot below the itinerary (`pinToolbar = useBreakpoint() === "desktop"`); on **tablet/mobile** it lives in a neutral **"Tools" bottom-sheet** (`PlanWorkspaceShell` `actions` prop, reusing the "Insights" sheet pattern) opened from the mobile bottom bar. The funnel persists to `LS_KEYS.PLAN_DRAFT` (`planDraft.ts`) so refresh resumes the same step/selections. **Step navigation**: the header shows a **labeled, tappable stepper** (`Basics · Places · Review`, active/done/upcoming states) that doubles as back-nav — tap an earlier step to revisit it; there is no separate "Step N of M" caption. Device/gesture **Back walks one step back** at a time before leaving `#plan`, via a **persistent** `useBackDismiss` guard registered in `PlanView` (kept above the early return). Any open rail drawer registers on top of that guard, so Back closes the drawer first (LIFO), then steps. **On mobile the shared header compacts** (`PlanTripHeader`, `useBreakpoint`): the route title names only the first stop + a **+N** pill (full route in the `aria-label`), the "who's going" basis collapses to an **icon-only** `BasisMenu` (`iconOnly`, party size kept in the accessible name), and the **stepper is dropped on the Review canvas** (`hideStepperOnCompact`) to free itinerary real-estate. Since the review footer is hidden below `lg` (`hidden lg:block`), the workspace's mobile bottom bar (`PlanWorkspaceShell` `nav`) carries the wizard nav there as **one unified segmented toolbar** (a single rounded-full bar with hairline `divide-x` dividers so it reads as a cohesive bar echoing the app tab bar below it, not four floating buttons) — `[← Back] [Insights] [Tools] [＋ Plan another]` (flanking icon cells frame the two labelled action cells; the middle cells share one `text-ink-1` weight; renamed from the vague "Good to know"/"⋯ More" to content-indicating **Insights** / **Tools**; the primary 📤 Share now lives in the header; ＋ Plan another is neutral so they don't compete). The Route Canvas levers also shorten on mobile (`Route order`→`Route`, `Jump to country / city…`→`Jump`, aria-labels unchanged). The Plan page is self-contained — the former single-country panel was removed; Cinematic is the shared overlay it reuses, and combine-with pills are plain informational chips. |
| **Trips** (My Trips) | Gallery of **saved-trip snapshots** built when a plan reaches the Review step (`useSavedTrips` over `LS_KEYS.SAVED_TRIPS`). A **search box** (`tripMatchesQuery` — name/country/city, with a clear-search no-results state) sits above the ★ favorites section then newest-first; a scope **filter dropdown** (shared `FilterChip`, All / `🏠 {homeCountry}` / `🌍 International` with live counts, molded from `homeCountry` — no "India" literal) appears **only when the library spans both scopes** (`tripScopeOf` per `SavedTrip.scope`) and narrows the gallery by trip scope. Each `SavedTripCard` shows flags (scope-aware via `unitFlag`) + a scope badge (`🏠 {homeCountry}` / `🌍 International`) + route name (`tripSignature`, e.g. "Japan → Thailand"), city chips, `days · places · cost` (with the trip's *saved* basis icon) and a relative "saved" label, plus favorite ★ and delete (`useConfirm`) actions. **Each card is a stretched-action** — a full-card overlay `<button aria-label="Open {name}">` (z-10) reopens the route in the Plan wizard (`onOpen` → `App` sets `planSeed` via `toOpenRequest(trip, nonce)` (an `OpenTripRequest`), passes it as `PlanView openTrip` and switches to `#plan`; a nonce-guarded restore effect snaps the active budget basis back to the saved one, reseeds `selection`, jumps to Review, **records the route into Recents** (`onRecordPlanned`), stays **save-toast-silent** during hydration (`reopenedRef`), and **rehydrates each stop's snapshot cities + tuned length + experience focus, pinned** — primary via `usePlanBuilder`'s `PlanBuilderSeed`, additional stops via `useTripPlanner`'s `TripPlannerSeed`; applied once per nonce, aligned to resolved order, dropping cities absent from current rules, and — multi-stop — waiting for every seeded stop's rules to load first). Each stop's snapshot `days` is the **honest rendered length** (`plan.days.length`), not the pre-expansion pin, so a stop the DP planner expanded (e.g. 8→11 days) reopens to 11d.; favorite/delete sit above it (z-20) as **siblings** (not nested) to keep valid interactive HTML. **+ New trip** and the empty-state "Plan a trip" CTA call `App.startNewPlan` (`startNewNonce` bump → nonce-guarded reset effect clears `selection`/step/`restoreSeed` + `clearPlanDraft()`), landing a **fresh Plan landing picker** (discards the in-progress draft, keeps saved snapshots) → `#plan`. Snapshots are **self-contained** (independent of Recents + rule data), so a saved trip stays viewable even if destinations change. Backup-recoverable via `BACKUP_KEYS`. |

**MapView** is not a standalone route anymore — it stays mounted behind the UI and becomes visible for Cinematic mode.

**Multi-country Plan (`multiCountryPlanning`, default ON)** — `DestinationPicker` chips toggle an ordered `selection` (≤ `MAX_TRIP_UNITS`=4, `toggleTripSelection`), confirmed via a sticky "Plan trip →" tray → `onStart(countries)` seeds `PlanView.selection` (`picked = selection[0]`). Every wizard surface **molds from that selection via the `DestinationSource` seam** (`core/trip/`), so switching to a future `domestic`/India scope is a source swap, not a rewrite — no surface assumes "country". Molded surfaces: (1) **`PlanRouteSummary`** (Basics summary for single + multi; molds N=1) — route timeline summing each stop's *live rendered* days (`PlanView.routeStopDays`, `plan.days.length` per stop; falls back to `source.dayBounds(name).rec` only until a stop's rules load), so the `~N days` total tracks the header's composed plan and reacts to vibe/experience changes instead of drifting from a static baseline; longest stop badged **Anchor** (a single anchor — the first stop reaching the max via `findIndex`, since domestic city routes commonly tie on length); single selections render the same `PlanRouteSummary`, molded to N=1 (no Anchor badge). (2) **`PlanBasicsStep`** vibe pills — single unit's tags, or the **union** across the route via `useTripExperiences(names, source)` (stale-guarded, over `source.experiencesFor`); overflow base-safeguarded by a height-bounded scroll container (NOT a hard cap) + UX-only `visibleCap` (default 10, `Infinity` disables) with "+N more" toggle outside the scroll; selected tags always visible. (3) **Header** — names first `HEADER_ROUTE_STOPS`=2 stops + a **+N** pill (shared portal `Tooltip`) revealing the full ordered route; `<h1 aria-label>` carries the complete route for SR. Basics subhead avoids promising controls the step lacks (no "how long" — length is auto-recommended). (4) **`PlanPlacesStep`** — a **Design D decision surface** molded from the units handed to it: a consolidated dark **header card** (a **dropdown country switcher** with a place-count badge for a multi-stop route / static name for one, trip stats *days · places · countries[multi] · budget*, and a trip-scoped **"Who's going"** basis) over rich **D3 decision cards** (two-column: name · "known for" brief · focus-lit experience chips on the left; ≈nights · ☀best window · ⚠avoid-window rail · "Top for X" signal on the right; plus an **ⓘ** opening a responsive `CityDetailModal` [bottom-sheet mobile / centered modal desktop] with the full brief, all tags and stay/season windows) in a two-up grid on `lg`; a single per-country **`PlanFilters`** control (experiences; anchored popover desktop / bottom-sheet mobile via `useBreakpoint`; count badge; hidden when the stop has no tags) and a **Sort** dropdown sit above them, with a single-row truncating **"Which places in {Country}?"** heading (emerald country name, long names truncate) + a short **"Suggested picks"** subline that flips to an inline **Edited · ↺ Reset to suggested** affordance when hand-picked, and an **`{N} of {M}`** count beside the "In your plan" row. The **additional stops** are loaded via `useTripRules(names, source)` (stale-guarded, over `source.loadUnit`) and curated by **`useTripPlanner(units, seedExperiences, basis)`** (one hook owning per-unit `{selectedCities, customDays, pinned, experiences}` state — never `usePlanBuilder` in a loop; prunes dropped stops; per-stop derivation delegated to the shared pure `deriveStop`/`projectStopCities` engine in `core/utils/stopPlan.ts` (the same engine `usePlanBuilder` uses, so a stop plans identically at any route position — single-country is its N=1 case)); the primary stop stays on `usePlanBuilder`. **Experiences are per-country**: `experiences: null` inherits the trip seed (from Basics), a non-null array overrides just that stop (`effectiveExperiences = override ?? seed`); `toggleExperience`/`clearExperiences` diverge one stop without touching its siblings. All stops fold into one plan via pure **`composeTripPlan(segments, basis)`** (concatenates `days[]` (renumbering them continuously across the route via `shiftPlanDays` while keeping honest `days.length`), sums cost ranges, names the route, aggregates warnings; **N=1 returns the plan unchanged** so single-country is byte-identical), which drives the header stats. The wizard's **Review** step composes and renders **all** stops as a segmented **"Route Canvas"** (`TripReviewWorkspace` → `TripReviewCanvas` + `TripContextRail` via the shared `PlanWorkspaceShell`): one composed, cross-route jump nav over per-segment blocks (the route label + who's-going + stats live once in the shared `PlanTripHeader`, so the canvas drops any duplicate summary band; the levers bar (with its inline Jump) is pinned above the itinerary scroll area on every breakpoint, so there is no separate back-to-top control), each keeping its own rich `ItineraryView(seg.plan, seg.rule, "luxury")` (composed plans lose per-country rule association, so render per-segment) with **per-stop shaping in a focused Adjust drawer** (`SegmentAdjustDrawer` — a `ModalShell` bottom-sheet mobile / centered modal desktop, opened by the stop's **✏️ Adjust** trigger; a **Shape** tab with the shared `FocusChips` + `CityPicker` + `DayLengthControl` (over `usePlanBuilder`/`useTripPlanner`, so every stop shapes identically) plus a read-only **Details** tab of per-stop reference [best/avoid windows, watch-outs, stopover tip, pairs-with] shown only when the country carries that data; replaced the old cramped inline expansion so a segment card never grows unboundedly), a **cumulative day-range** label, and **collapsible** bodies (anchor open by default). **Route order + anchor are independent display layers** the workspace owns (`order` index permutation + `anchorName`), tuned from a **trip-level `RouteLeversBar`** above the segments (so each stop header stays uncluttered — identity · ✏️ Adjust · collapse (the whole emerald-tinted `bg-emerald-50/70` header band — a branded per-country "section" title bar — is a full-bleed collapse toggle; row 1 is flag · bold emerald name (hero) · ✏️ Adjust · collapse chevron, with **no numeric stop badge** (order reads from name + day range + route bar); row 2 is places · cumulative day range · per-stop budget; the **anchor cue is a slim amber left accent bar** (sr-only "— anchor stop"), never an inline pill competing with the name)): a **Route order** popover (a `RouteOrderEditor` with **drag-and-drop** — ⠿ grip, pointer-capture drag + live drop indicator, mobile touch — and **keyboard Arrow Up/Down** reorder on the focused grip, delegating to pure `moveIndex(from,to)` in `core/utils/routeOrder.ts` · promote anchor ★ · one-tap **✨ Auto-arrange** = `orderByProximity`/`haversineKm` nearest-neighbour from the anchor, gated ≥3 stops + finite coords) opening through the shared **`PlanPopover`** (portaled, anchored desktop / bottom-sheet mobile, Escape-restores-focus), with the compact **jump-to-city** dropdown (`PlanCityJumpNav embedded`) rendered **inline on the same row** so the toolbar stays one line. **Total trip length is no longer an editable lever** — it's a read-only header stat, retuned per stop via each stop's Adjust drawer. `composeTripPlan` re-runs in visit order and **never unpicks** the primary stop (N=1 stays byte-identical); both reset only when the pick set changes. Between countries render **honest `BorderHop` rows** — collapsed "Travel from X to Y", expandable to an informational mode picker (distance-derived indicative ✈ flight `~Nh`, rail/road "varies", hops cost no days). The right rail is trip-level reference only: **Trip readiness** (pure, honest, **scope-aware** fallback via `core/utils/tripReadiness.ts` — international shows a visa caveat + derived border-crossing count; domestic shows a "no visa or border checks" line + "N legs between stops"), an **honest budget ledger** (×nights line items + italic legs estimate — labelled "Inter-city legs" domestic / "Inter-country legs" international — + "flights extra" caveat) **labelled with the active basis — no duplicate basis switch or trip totals in the rail or levers bar** (the who's-going basis + headline stats live once in the persistent `PlanTripHeader`), per-country `MonthHeatmap` + watch-outs, a per-country **Food & diet** card (veg/vegan availability + local ordering phrases; renders only when the rule carries a `diet` block — domestic India today, scope-agnostic), and **Notes** (`PlanNotesSection`); **no Shape rail** in multi (stops shaped in the Adjust drawer). Each stop's **planning warning** (e.g. length auto-expanded) renders **inside that stop's own segment block** (⚠️-prefixed, country-attributed), never as an ambiguous route-level banner. The cross-route **`PlanCityJumpNav`** shows desktop pills for short routes but **collapses to a portaled, country-grouped dropdown on every breakpoint past 5 cities** (bottom-sheet mobile) so dense routes don't crowd the strip; jumping into a **collapsed** country first expands it (`onJump`/`handleJump` + rAF scroll) so the target anchor exists. **Cinematic works for single + multi** — `TripReviewWorkspace` builds a scope-agnostic `CinematicRoute` (via `buildCinematicRoute`/`resolveHomeOrigin` in `cinematic/engine.ts`) from the ordered segments, `PlanView` lifts one `cinematicRoute` state both paths feed (guarded by `mainMapRef` + ≥2 mappable stops → `canCinematic`), and `onCinematicChange` reveals the always-mounted `MapView`; inter-country legs animate as distance-derived border hops, and a future domestic scope passes `origin: null` (no international arc) — a data swap, not a shell change. **Single- and multi-country trips both render through this canvas** — at N=1 the segment list is just the primary stop, the reorder/anchor levers mold away, and `composeTripPlan` returns the plan unchanged, so the single itinerary stays byte-identical. Shared `ItineraryToolbar` keeps the composed itinerary's action row identical across single + multi (the canvas carries its route label in the shared header); a shared `PlanTripHeader` (a subtle leading **scope marker** 🏠 {home} / 🌍 International + route identity + progressive stats strip + `BasisMenu` who's-going pill + `PlanCountrySwitcher` on multi Places + stepper) reads consistently across Basics/Places/Review, so identity/stats/basis render once in the header rather than a per-step dark card. Saving is a **decoupled `TripSaveBar`** rendered in the `PlanTripHeader` top-right cluster (beside the who's-going basis pill), shown **only on Review** as a **single refined ★ favourite icon toggle** (styled to match the header's other circular icon controls — no persistent "✓ Saved" tick, which read as noise for invisible plumbing): the wizard **auto-saves the whole composed route to My Trips immediately** (`onSaveTrip` → `useSavedTrips.upsert`, guarded by a content signature so identical renders don't re-write and re-saving the same ordered route updates in place — preserving id/favorite/savedAt — rather than duplicating). Save confirmation is instead **transient + first-run**: a one-time **`PlanReviewReveal`** celebration the first time Review is ever reached (persisted `LS_KEYS.PLAN_REVEAL_SEEN`; skipped for reopened trips), and a brief **`PlanSavedToast`** ("Trip/Route saved to My Trips", auto-dismissed via a cleaned-up 4s timer plus a ✕ for immediate dismissal, and lifted clear of the bottom nav/tab-bar chrome so it never overlaps the Back/Plan-another controls) **only when the traveller actually edits a settled plan** — merely arriving at Review, reopening a saved trip, or a page refresh's async hydration (lazy rules + auto-city/day settling) is absorbed silently within a short `SAVE_SETTLE_MS` grace window, while an explicit budget-basis switch always counts as an edit. The ★ toggle acts on the *saved trip snapshot* (`onToggleTripFavorite` → `useSavedTrips.toggleFavoriteByName`, keyed by the route signature) — the same "favourite" meaning as the My Trips ★; the toggle only affects the saved-trip snapshot. The snapshot (`buildTripSnapshot` in `savedTrips.ts`) is built from the ordered `selection` (attaching each stop's own loaded plan where rule data exists, so route identity stays honest even for rule-less secondary stops) and is **self-contained** (independent of Recents + rule data). On Review the sticky footer's **"Plan another"** is a **modest secondary** (compact ghost, not the dominant primary). The old editable trip-groups subsystem (`useTripStore`/`tripGroups.ts`/`buildTrips`/grouped `TripGroupDef` cards) was retired in favour of this snapshot store.

**Destination details are Plan-first** — the former single-country island was removed. Manual per-country editing and panel-based AI-plan browse/compare are not currently available. City choice and per-stop shaping live in Plan Places/Route Canvas; trip reference lives in `TripContextRail` using surviving `panel/InfoSections`, `PanelSection`, `MonthHeatmap`, `CityCard`, and share text helpers. Travel style was removed for now and may return later.

**Navigation** — desktop uses a slim **luxury ivory/emerald** top bar (`bg-surface-2/95` warm ivory `#f7f4ec` + backdrop-blur + `border-b border-line-strong` + a soft warm drop shadow for presence; emerald wordmark + centered view pills in a `surface-track` `#efe9db` well, active = `bg-emerald-700 text-white` + Install/Share/Settings cluster restyled to the ivory palette); mobile uses a **fixed bottom tab bar** (`md:hidden`, `pb-safe`, matching `bg-surface-2` ivory, the 2 views (Plan · Trips) icon-over-label with an emerald-tinted active pill) with the top strip shrunk to brand + compact Install/Share + Settings. `AppInstallShare` header variant is styled for the light bar (ivory `#efe9db` share chip, emerald-filled Install — not the old dark `white/10`/blue). The PWA `theme-color` + manifest `theme_color` match the ivory bar (`#f7f4ec`). The hamburger menu / slide-down drawer were retired. `FreTour` is the **luxury emerald/ivory** first-run tour (emerald-gradient hero/install cards + ivory spotlight tooltips) that walks the nav in Plan-first order — Plan → Trips → Settings; its targets (`data-tour="nav-plan"`/`"nav-trips"`/`"settings"`) resolve to whichever element is visible per breakpoint.

---

## Architecture

### Component tree

```
App.tsx  (thin orchestrator — wires hooks to views)
├── Header (brand, desktop nav pills / mobile bottom tab bar, app actions only)
├── PlanView / MyTripsView
├── ItineraryCinematic (Plan overlay)
├── ChatModal
├── AiItineraryModal
├── SettingsModal
└── MapView (hidden unless cinematic mode is active)
```

### Component directory layout

```
src/components/
  ai/       — AiItineraryModal, ChatModal, SettingsModal
  country/  — ItineraryCinematic, cinematic/engine.ts (pure fly-through engine), cinematic/{CinematicOverview,CinematicControls,CinematicDayPanel,CinematicIntro,CinematicDone,CinematicPhotoCard,CinematicHeader} (pure phase/control/chrome leaves — reduced-motion summary, playback footer, city-phase day card, intro + done phases, map photo slideshow, title + route-trail header — extracted from the shell + unit-tested), itinerary/ItineraryView (shared day renderer, emerald/ivory), panel/CityCard, panel/PanelSection, panel/InfoSections, panel/MonthHeatmap, panel/ShareButton/shareText
  map/      — HoverCard and map internals
  shared/   — PillGroup, FilterChip, Tooltip, HomeCountrySelector, DevFlagPanel, ExperienceDropdown, AppInstallShare, FreTour, ConfirmDialog (useConfirm)
  views/    — MyTripsView (saved-trip gallery + SavedTripCard) + views/plan guided wizard
  views/plan/ — Guided wizard, grouped into cohesive subfolders (PlanView stays at the folder root as the entry orchestrator):
    PlanView.tsx           — entry orchestrator (wires draft/steps/header; delegates open-resume-reset to usePlanTripRestore, auto-save + engagement to usePlanAutoSave, and the composed route to useReviewRoute)
    shell/    — PlanWorkspaceShell (shared single+multi layout), PlanTripHeader (shared identity + stats + basis + stepper; save/Share slotted via `saveSlot`/`shareSlot`), PlanCountrySwitcher, planActions.ts, planDraft.ts
    steps/    — PlanBasicsStep, PlanPlacesStep, DestinationPicker (landing board), PlanRouteSummary
    review/   — Route Canvas: TripReviewWorkspace (presentational, consumes useReviewRoute), TripReviewCanvas, TripContextRail (RailSection/PlanNotesSection), BorderHop, RouteLeversBar, RouteOrderEditor (drag/keyboard reorder), SegmentAdjustDrawer (per-stop Shape·Details drawer), useReviewRoute.ts (order-aware composed route model)
    save/     — TripSaveBar (Review-only ★ favourite → `useSavedTrips.toggleFavoriteByName`), PlanReviewReveal (one-time first-Review celebration), PlanSavedToast (transient save confirmation), PlanShareButton (header Share chip, order-aware), usePlanTripRestore.ts (open/resume/reset lifecycle + per-stop restore seeds), usePlanAutoSave.ts (Review auto-save signature guard + first-run reveal/toast)
    controls/ — CityPicker, ExperiencePicker, FocusChips, DayLengthControl, BasisMenu, PlanFilters, PlanCityJumpNav, CityDetailModal
    ui/       — PlanPopover (shared portal popover), PlanMenu, sheetChrome (SheetGrip + SheetCloseButton), ItineraryToolbar (shared itinerary atoms)
```

**Module boundaries & imports.** A `@/*` path alias maps to `src/*` (declared in `tsconfig.json` `paths` + `vite.config.ts` `resolve.alias`; vitest inherits the Vite alias). Convention: imports **within** a cohesive module (e.g. across `views/plan/*`) stay **relative** (`./`, `../`); imports **reaching outside** the module use the **`@/` alias** so moving a file never churns `../../../` chains. Test files import source exclusively via `@/…`, so a test can live anywhere without breaking its imports.

**Test layout mirrors source.** `src/test/` mirrors the source tree (e.g. `src/test/components/views/plan/review/TripReviewCanvas.test.tsx` covers `src/components/views/plan/review/TripReviewCanvas.tsx`); shared helpers stay at the root (`src/test/testUtils.ts`, `src/test/setup.ts`, `src/test/support/`). Vitest discovers `*.test.*` anywhere and coverage globs key on **source** paths, so relocating a test never affects the coverage gate.

### Hooks (state management)

All state is hooks-based — no Redux, no context providers. `App.tsx` calls hooks and passes results as props.

| Hook | File | Responsibility |
|---|---|---|
| `useCountryStore` | `src/hooks/useCountryStore.ts` | Country catalog, implicit Recents/MRU (`recordPlanned`), notes, reload, manifest enrichment |
| `useSavedTrips` | `src/hooks/useSavedTrips.ts` | Saved-trip snapshot store (My Trips): upsert-by-route, favorite (by id), favorite-by-route-name (Plan wizard), remove, reload |
| `useAiPlanStore` | `src/hooks/useAiPlanStore.ts` | Save/load/delete AI-generated plans (max 3 per destination) |
| `useChatSession` | `src/hooks/useChatSession.ts` | LLM chat state machine, token tracking, finalize flow |
| `useCountryRule` | `src/hooks/useCountryRule.ts` | Lazy-loads consolidated country data from `data/rules/*.json` |
| `usePersistedSet` | `src/hooks/usePersistedSet.ts` | Reusable `Set<string>` backed by localStorage |
| `useHashView` | `src/hooks/useHashView.ts` | Hash-based URL routing for the 2 top-level views (`plan`/`trips`) |
| `useBreakpoint` | `src/hooks/useBreakpoint.ts` | Reactive `mobile` / `tablet` / `desktop` state |
| `usePlanBuilder` | `src/hooks/usePlanBuilder.ts` | Guided `#plan` wizard funnel state (primary stop) — party/vibe/cities/length, `autoSelectedCities` materialization, inferred+pinned day count; per-stop derivation delegated to `core/utils/stopPlan.ts` |
| `useBudgetBasis` | `src/hooks/useBudgetBasis.ts` | Two-layer budget party size: persisted global default + transient active |
| `useLifecyclePrompts` | `src/hooks/useLifecyclePrompts.ts` | Soft, debounced backup nudge; snooze-by-baseline for backup |

### Shared UI components — reuse, don't recreate

| Component | File | Usage |
|---|---|---|
| `PillGroup` | `shared/PillGroup.tsx` | Segmented pill toggle |
| `FilterChip` | `shared/FilterChip.tsx` | Portal-based dropdown chip |
| `Tooltip` | `shared/Tooltip.tsx` | Portal-based info tooltip |
| `HomeCountrySelector` | `shared/HomeCountrySelector.tsx` | Feature-gated searchable dropdown |
| `DevFlagPanel` | `shared/DevFlagPanel.tsx` | Dev-mode feature flag toggle |
| `LifecyclePromptToast` | `shared/LifecyclePromptToast.tsx` | Soft bottom-centre lifecycle nudge toast (`role=status`, non-focus-stealing); renders `useLifecyclePrompts().prompt`, gated off while any overlay is open |
| `AppInstallShare` | `shared/AppInstallShare.tsx` | Header/menu Install + Share (via `useAppShare`). Install = onboarding-oriented white pill (labeled **"Install app"** at `lg`); shows only when `beforeinstallprompt` fired or on iOS (A2HS hint). When the PWA is already installed but viewed in a browser tab (`installedInBrowser`), Install is swapped for a best-effort **"Open app"** button (`onOpenApp` → opens the in-scope start URL; Chromium may focus the app via `launch_handler`). Share is always present and **adapts to the surface via `useBreakpoint`**: on **touch surfaces** (`breakpoint !== "desktop"` — phone/tablet) and the Settings **menu** variant it uses the **native share sheet** (`share`) with `wa.me` → clipboard fallback (so the app can be shared to WhatsApp etc.); only on **desktop** does the header **copy the link** (`copyLink`) to avoid the off-position desktop native-share popover. It keeps the short **"Share"** label but uses a **🔗 icon** (+ "Share app" tooltip) on all breakpoints — the icon is deliberately distinct from the Plan header's itinerary **📤 Share** (`PlanShareButton`), so app-invite vs trip-share never collide on icon-only mobile (both reading "Share" + 📤 was the original confusion) |

---

## Data Model

### Three-tier travel data system

```
Tier 1: World Catalog (data/worldCatalog.json)
  197 sovereign-country entries: { name, lat, lng, region }
  Used internally as coordinate/region fallback for catalog seed builders

Tier 2: Rule Manifest (data/rules/index.json)
  198 itinerary-backed destinations
  Adds: inSeed, hasItinerary, recDays, maxDays, popularityScore, bestMonths, worstMonths
  Used by: Plan landing search/region/month-fit ranking, allCountries enrichment, slider bounds, lazy-load routing

Tier 3: Consolidated Rules (data/rules/*.json)
  198 per-country JSON files + index.json manifest (199 total JSON files in data/rules)
  Contains: country detail data + day-wise itinerary content
  Loaded lazily via import.meta.glob in useCountryRule
```

The **`inSeed`** manifest flag still marks 5 richer seed entries (Japan, Thailand, Switzerland, France, Italy) for catalog/enrichment, but fresh users start with an empty Recents list. The manifest's baked `bestMonths`/`worstMonths` cover all 198 entries; `ManifestEntry` plus seed builders populate those windows onto `Country` objects so the Plan landing's `monthFit`/`rankByMonthFit` seasonality re-rank works over the full catalog without loading rule chunks. Special non-catalog destinations live only in the rule system and still participate in offline itinerary generation.

### Saved trips (My Trips)

`src/core/utils/savedTrips.ts` owns the snapshot model — `SavedTrip = {id, name, stops:{country,days,cities,experiences?}[], basis, totalDays, costPerPerson, savedAt, favorite?}` (each stop's `days` is the **honest rendered length** `plan.days.length`, not the pre-expansion pin; `experiences?` is the stop's saved focus, omitted when empty) — plus pure `buildTripSnapshot(input, now?)` (time injected for testability) and `tripSignature(countries)` (joins the ordered route with `" → "`; the trip's `name`/identity). `useSavedTrips` (`LS_KEYS.SAVED_TRIPS`) exposes `{savedTrips, upsert, remove, toggleFavorite, toggleFavoriteByName, reload}`; `upsert` is keyed by route signature — re-saving updates in place (preserves id/favorite/savedAt), new trips prepend. Snapshots are **self-contained** (independent of Recents + rule data). Reopening a saved trip **fully rehydrates** it — the ordered stops' cities + honest tuned lengths (pinned) + per-stop experience focus + saved basis — via `usePlanBuilder`/`useTripPlanner` seeds keyed by nonce; the restore effect also **records the route into Recents** and keeps the auto-save effect **silent** (no `PlanSavedToast`/reveal) through hydration via `reopenedRef`, since a resume is not an edit. `toOpenRequest(trip, nonce)` builds the `OpenTripRequest` and `findSavedTripForCountries(trips, names)` (exact ordered signature, else newest set match) powers the landing resume-vs-fresh prompt. The old editable trip-groups subsystem (`useTripStore`, `tripGroups.ts`, `TripsView`/`views/trips/*`, `buildTrips`, the `tripGroups` flag, `tp_trip_customs`/`tp_trip_deleted`) was retired in favour of this store. Combos ("Combine with" pills) come from Country rule data, not trip groups.

### TypeScript types

All in `src/types.ts`: `Country`, `CityEntry`, `CatalogEntry`, `TripBrief`, `ChatMessage`, `LLMProviderType`, `TokenUsage`, `LLMChatResult`, `BudgetBreakdown`, etc.

---

## Data Flow

### Country lifecycle (manifest → UI)

```
1. data/rules/index.json  ← manifest of all itinerary-backed destinations
2. useCountryStore.buildSeedCountry()  ← creates minimal Country from manifest
3. useCountryRule.loadConsolidatedCountry()  ← async loads data/rules/{name}.json
4. useCountryStore.enrichCountry()  ← converts consolidated data → Country shape
5. useCountryStore.buildCountryList()  ← overlays customs on enriched/seed, skips deleted
6. App.tsx / Plan landing render destination boards from Recents + manifest-backed popular/all destinations
7. DestinationPicker region/month controls filter or re-rank the board; its own `onStart(countries)` tray is the only start-a-plan path
```

### Seed + Overrides pattern (critical invariant)

This pattern applies to countries (saved trips use an independent snapshot store, not seed+overrides):
- **Seed data** = static JSON files, never mutated at runtime
- **Customs** (`tp_customs`) = full `Country[]` of user edits that override seed entries by `name` match
- **Deleted** (`tp_deleted`) = `string[]` tombstones for removed seed entries
- On merge: customs win over seed → deleted seeds are skipped → custom-only entries appended
- `deleteCountry()` for seed entries adds to `DELETED`; for custom entries, just removes from `CUSTOMS`

### Filter composition

`src/utils/filterLogic.ts` — shared destination filters compose with AND logic where still used:
1. `filterByExperiences()` — requires ALL selected tags present
2. Budget tiering — `getBudgetTier` parses a `₹150K`/`₹2L`/`₹1.5L–₹3L` string via the canonical `parseBudgetRange` (`budget.ts`) and buckets by the **range midpoint** (fairer than the lower bound): ≤₹1.5L `budget`, ≤₹3L `mid`, else `premium`. Uses the selected basis (`solo` / `couple` / `family4`) when available

Portal-based dropdowns/tooltips use `createPortal()` to prevent clipping in overflow/scroll containers (shared chips/tooltips and modal/sheet overlays).
Trips view intentionally does not apply app-level experience tags, so Trips filtering always matches visible Trips controls.
The Plan landing owns browse-style filtering: an editorial hero over a search row (search box + inline month dropdown reusing `PlanPopover`) and a scrollable **region tab strip** (`Popular` (=All) default, `aria-pressed` toggles) narrow the full 198-destination board, while `src/core/utils/monthFit.ts` re-ranks by selected month (best → neutral → avoid) without hiding off-season destinations. Region filters the explore board only — never the "Jump back in" recents; month may reorder recents. There is no cross-view Plan handoff seam; `DestinationPicker`'s own multi-select tray calls `onStart(countries)`. The hidden `MapView` is cinematic-only.

---

## AI Planning Flow

### Full trace: user click → saved plan

```
1. User clicks "AI plan" in the Plan wizard
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

All persistence uses `loadLS()` / `saveLS()` / `removeLS()` from `src/core/storage.ts`. Keys are centralized in `src/core/lsKeys.ts` — always use `LS_KEYS.X`, never hardcode strings. Never call `localStorage.*` directly (use `removeLS` to delete a key).

| Key constant | localStorage key | Content |
|---|---|---|
| `MY_LIST` | `tp_my_list` | Recents/MRU country names recorded when a destination enters Plan Basics (`MAX_RECENTS=24`) |
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
| `PLAN_REVEAL_SEEN` | `tp_plan_reveal_seen` | First-Review celebration (`PlanReviewReveal`) shown flag — one-time, never re-shows |
| `LIFECYCLE_DISMISSED` | `tp_lifecycle_dismissed` | `string[]` — permanently dismissed lifecycle nudge ids (reserved for non-backup nudges) |
| `LIFECYCLE_BASELINE` | `tp_lifecycle_baseline` | `{ backupAt, fingerprint }` — backup-nudge baseline (resets on backup, advances on snooze) |
| `SCHEMA_VERSION` | `tp_schema_version` | Persisted-data schema version (current: 3) |

No server sync — refresh survival is purely localStorage. `tp_my_list` now stores the implicit Recents/MRU list.

**Schema migrations** (`src/core/migrations.ts`): `runMigrations()` runs once in `main.tsx` before any hook reads storage. Current `SCHEMA_VERSION` is **3**; the v2 migration deletes the legacy country-level `tp_visited` and `tp_favorites` keys, and the v3 migration clears the legacy `tp_my_list` so the reused key starts as an honest empty Recents ledger (the old seeded/curated My List was never planning history). Bump the version and append an ordered `MIGRATIONS` entry to evolve a persisted shape. The runner never throws so a bad migration can't block boot.

**Platform-aware backup targets** (`src/core/platform/`): auto-backup is routed to a capability-based target so data is findable + restorable per device. `detectPlatformProfile(env)` is pure (OS/form-factor/surface + capability flags); `resolvePlatformDefaults()` picks a `BackupTargetKind` (`filesystem` for desktop with File System Access → `opfs` for mobile → `download` fallback). Adapters implement `BackupTargetPort` (`write`/`readLatest`/`configure`/`location`); every persistent target stores data inside a dedicated `Roamwise/` app folder (created if absent, shared via `adapters/backup/appDir.ts`) as a stable `roamwise-backup-latest.json`, so backups are grouped and re-readable. The filesystem adapter persists a picked `FileSystemDirectoryHandle` in IndexedDB (`handleStore.ts`) and re-verifies read/write permission. `backup.ts` exposes `backupToTarget()`, `autoBackupToTargetIfOverdue()`, `restoreFromTarget()`, `canAutoImport()`, `hasAnyLocalData()`, and target-kind override helpers. Its `BACKUP_KEYS` set (each shape-validated on restore) covers all recoverable trip data — Recents (`tp_my_list`), customs + tombstones, home country, **budget basis (party size)**, **saved trips (My Trips, including saved-trip favorites)**, feature flags, LLM provider, and saved AI plans — but never the sensitive `LLM_KEYS`; saved trips thus re-appear in My Trips on restore. On mount `App.tsx` backs up overdue data, or — on a fresh device with no local data — **offers** (never silently applies) a restore from the target. Settings → Backup surfaces the active location via `StorageLocationCard`.

---

## Performance

- **Lazy loading**: `data/rules/` contains 199 JSON files total (198 country chunks + `index.json`), loaded on demand via `import.meta.glob`
- **Code-splitting**: Heavy modals/overlays (`ChatModal`, `ItineraryCinematic`, `SettingsModal`, `AiItineraryModal`, `FreTour`) are lazy-loaded via `React.lazy()` + `Suspense`, moving ~123 KB out of the initial bundle
- **Idle-time enrichment**: Seed country data enriches in `requestIdleCallback` chunks of 10, so the first paint renders instantly with minimal seed data and cards progressively hydrate
- **Module-level caching**: `useCountryRule` keeps each country loaded at most once per session
- **Memoization**: `useMemo` is used across `App.tsx`, `useCountryStore`, `MyTripsView`, Plan Route Canvas derivations, and itinerary day grouping
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
generateTripPlan() in src/core/utils/tripPlans.ts
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

`src/utils/pdfExport.ts` uses a hidden iframe + `window.print()` flow (the "Export PDF" button) — it is not a PDF library. It builds print HTML from the shared model (route title + per-stop `.section-header` bands for multi), themed in the app's **emerald/ivory** palette with a **serif display** (`ui-serif, Georgia`) title. It also exports **`buildItineraryHtml(plan, country, homeCountry, stops?)`** — the full non-interactive document string — as the **single source of truth for the itinerary's visual layout**, reused by the Share path so both outputs are identical.

`src/utils/pdfDocument.ts` builds a real PDF `Blob` for the Plan **Share** action so the itinerary can be attached to the native share sheet without a download. It is a thin **rasteriser of the very same HTML the Export path prints**: it renders `buildItineraryHtml(...)` in an isolated off-screen iframe, snapshots it with **html2canvas**, and slices that canvas across A4 pages into a jsPDF (`addImage`), so the shared PDF is **pixel-identical to Export** (same emerald/ivory theme, serif titles, emoji, real country flags, brand-logo letterhead, per-country "Stop N" bands + practical notes, footer "Plan your own trip" app link). This retired the old hand-drawn jsPDF renderer (`drawIcon`/`pdfSafe`/Latin-1 sanitisation) and `src/utils/flagImage.ts` — **one HTML template now drives both outputs** (print for Export, Blob for Share). The deliberate trade-off: the shared PDF is **rasterised (image-based), so its text isn't selectable/searchable** (Export via `window.print()` keeps selectable text). jsPDF + html2canvas are heavy, so this module is only ever reached via dynamic `import()` — never import it statically. `useItineraryShare` (`src/hooks/useItineraryShare.ts`) owns the share flow (native PDF file → native text → clipboard) and **builds + caches the PDF Blob during `prefetch` (pointer/focus), keyed by a content signature**, so the click awaits an already-resolved promise and `navigator.share` stays within the user gesture (iOS requires transient activation, which a slow await would consume). `buildShareText` lives in `src/components/country/panel/shareText.ts` (re-exported from `ShareButton`).

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

Hash-based, no library. `AppView = "plan" | "trips"` and `VALID_VIEWS = ["plan", "trips"]` live in `src/hooks/useHashView.ts`. Current top-level routes are `#plan` and `#trips`. `useHashView(fallback)` takes the landing view for an empty/invalid hash; `App.tsx` passes `"plan"` so **Plan is the default landing**. The brand/Home button routes to that same landing. The navigation `pushState` runs in a **`useLayoutEffect`** (not passive) so it commits before any passive cleanup elsewhere — a view that owns a persistent `useBackDismiss` guard (e.g. `PlanView`) rewinds its history sentinel via `history.back()` in a passive unmount cleanup, and React runs all passive destroys before passive creates; a passive push would land after that rewind and get clobbered (nav bounced back). Regression: `src/test/hooks/navBackDismiss.test.tsx`.

**Adding a new view:**
1. Add to `AppView` type in `useHashView.ts`
2. Add to `VALID_VIEWS`
3. Add label to `VIEW_LABELS` in `App.tsx`
4. Add render branch in `App.tsx`
5. Keep filter ownership explicit (Trips view owns trip-header filter controls)

---

## Tailwind conventions

- **Color tokens (single source: `src/core/theme/palette.ts`)** — the accent ramps live in one shared JS module (`BRAND` + `ACCENT`), which **`tailwind.config.js` imports** to define the `brand-*` / `accent-*` utility classes, so classes and runtime hex share **one source**. Neutrals stay in `tailwind.config.js`: ink `ink-1` (headings) / `ink-body` / `ink-2` (muted) / `ink-3` / `ink-4`; borders `line` / `line-strong`; surfaces `surface-1` / `surface-2` / `surface-3` / `surface-track`. **Accents**: `brand-50…950` (**primary**, currently the exact emerald hex — `brand-800` CTA text + **section-eyebrow labels**, `brand-700` links/values, `brand-200` hairlines, `brand-900`/`brand-950` gradient tails) and `accent-50…950` (**anchor/warnings**, currently the exact amber hex). `brand`/`accent` mirror emerald/amber exactly, so the look is unchanged. **Never write raw `emerald-*`/`amber-*` classes or `[#hex]` literals** — use `brand-*`/`accent-*` classes, or import `BRAND`/`ACCENT` from `palette.ts` for the few runtime hex call-sites (maplibre paint in `ItineraryCinematic.tsx`, print-HTML theme in `pdfExport.ts`, the slider gradient in `DayLengthControl.tsx`). **A rebrand = editing the two ramps in `palette.ts`.** The only hand-edited leftovers: the `#047857` `.focus-ring-emerald` outline in `index.css` (CSS can't import JS) and a couple of bespoke non-ramp print tints; `vehicleMarkers.ts` SVG colors are intentional **illustration art**, not brand tokens. **Section-eyebrow principle**: uppercase section-heading eyebrows use `text-brand-800` (e.g. "What are you into?", RailSection titles, Notes, Experiences headers in `PlanFilters`/`CityDetailModal`/`SegmentAdjustDrawer`); muted `ink-3`/`ink-4` is reserved for label+value stat micro-labels and soft captions.
- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config

---

## Do NOT

- Install npm packages unless absolutely necessary
- Add a routing library — hash routing is intentional
- Hardcode localStorage key strings — use `LS_KEYS`
- Deep-import across modules with long `../../../` chains — use the `@/` alias for out-of-module imports (keep intra-module imports relative)
- Add a new `views/plan/` file at the folder root — place it in the matching subfolder (`shell`/`steps`/`review`/`save`/`controls`/`ui`); mirror its test under `src/test/components/views/plan/<subfolder>/`
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
- `loadLS` / `saveLS` / `removeLS` for all localStorage access
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
