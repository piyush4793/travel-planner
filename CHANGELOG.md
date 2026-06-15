# Changelog

All notable changes to Roamwise are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- **Navigation simplified** — 5 views → 3 (Trips home, Calendar, Discover). Map removed from nav, kept for Cinematic. List removed.

### Changed
- **Save As dialog for manual exports** — manual JSON/CSV/XLSX exports open native "Save As" file picker (Chrome/Edge) so you can choose where to save; auto-backups silently download to the browser's default folder
- **Download location tip in Settings** — Backup tab now shows default download path (OS-aware) and how to change it
- **Shareable route links** — 📋 copy button next to every 🗺️ Route link for sharing day routes with travel companions
- **Country panel close button** — moved from toolbar to header row for better visibility
- **PWA / offline mode** — installable as a standalone app from browser, works without internet via service worker caching
- **Smarter auto-backup** — first launch no longer triggers backup; default frequency changed from weekly to monthly; backup only nags when user has actual custom data
- **Cinematic animation uses requestAnimationFrame** — arc/transit animations now use rAF instead of setTimeout loops for jank-free 60fps motion on all devices
- **Wiki image fetch timeout** — city photo loading capped at 5 seconds to prevent animation from stalling on slow networks
- **Better cinematic loading UX** — progressive status messages ("Plotting route…", "Loading city photos…"), animated pulsing loader dots during intro, and clearer "Switch to Map view" guidance
- **3D SVG vehicle icons** — top-down/bird's-eye plane, car, train, bus, ferry, cable-car SVGs with CSS perspective tilt, ground shadow, specular highlights, and pulsing glow — replaces flat emoji-in-circle markers
- **Plane rotates along arc** — flight icons continuously rotate to face the travel direction using bezier tangent heading, like mult.dev's path-following animation. Ground vehicles also orient along their travel bearing
- **Clean plane silhouette** — plane marker redesigned as a large white airplane SVG with blue contrail trail, no circular orb — inspired by mult.dev's cinematic flight visuals
- **All vehicle icons upgraded** — car, train, bus, ferry, cable-car SVGs enlarged to 64×64 with drop shadows, removed glass orb backgrounds, added motion trails behind ground vehicles
- **Road-like zig-zag movement** — car and bus transit follows winding S-curve paths between cities instead of straight lines, with camera bearing tracking the road direction
- **Railroad track route style** — train transit shows dark rail lines with cross-tie dashes instead of the default blue glow, visually distinct from road and flight paths
- **Transport-specific route lines** — flight arcs use thick blue contrail glow, car/bus use dashed road lines, train shows railroad tracks — each mode has a unique visual identity
- **Camera chase-cam during transit** — camera tracks the moving vehicle in real-time: flights zoom out at midpoint and back in on approach; ground transit uses tight follow-cam with bearing sway. Inspired by mult.dev style
- **Tile-aware pacing** — animation waits for map tiles to load (`waitForIdle`) before starting each phase, preventing rushed transitions over blurry/unloaded terrain
- **Cinematic city arrival** — two-stage descent: swoop in at 50° pitch with a unique bearing per city, then settle to flat overhead view
- **City dots hide when not relevant** — dots start hidden and are progressively revealed only for the current/next city; visited ones dim; future ones stay invisible to avoid map clutter when zoomed in
- **Cinematic pitch & bearing** — map tilts and rotates to face the travel direction during transit for a dramatic fly-through feel
- **Enhanced route glow** — active route trail now uses a triple-layer glow (outer halo + inner glow + core line) for a neon trail effect
- **Multi-plan view & selector** — PillGroup tabs to switch between Default and saved AI plans with full day-wise itinerary for each
- **Side-by-side plan comparison** — modal comparing any two plans with dropdowns, stat diffs (days, cities, cost), and independent scrolling columns
- **Per-plan cinematic check** — cinematic button always visible but disabled/greyed when plan lacks matching city coordinates
- **Import parser improvements** — better destination name derivation (looks for "trip to Norway" patterns), city name cleaning (strips "ARRIVE IN", "RETURN"), activity noise filtering ("Stay:", "Activities:", "Time required:")
- **PDF export** — export any itinerary as PDF via browser print dialog (zero dependencies, paid feature gated)
- **Two-tier feature gating** — `paidFeatures` master gate for premium features; individual flags for fine-grained control
- **Dev flag panel** — localhost-only 🛠 panel with dependency tree UI for toggling feature flags
- **Norway expanded** — 11 cities: Gudvangen (Viking village), Loen (Skylift), Trollstigen, Lofoten (Arctic islands + aurora)
- **Smart city selection** — algorithm picks best city subset when days < total available; prioritizes by importance
- **Custom-only planner** — removed 3 preset styles, single days slider with recommended/max limits
- **Travel style badges** — research-backed single badge per country (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive); "Month Long" renamed to "Immersive"
- **Trips sorting** — favorites pinned to top, visited pushed to bottom
- **Trips dashboard** — progress ring (% complete), quick stats (countries, visited, regions), "Next trip" highlight
- **Trip card image collages** — up to 3 Wikipedia images per card (landmark/travel photos, lazy loaded, cached)
- **Grouped trip sections** — ⭐ Favorites → 📋 Planning → ✅ Completed with section headers and counts
- **List/grid toggle** — ☰ list (1 column) / ▦ grid (3 columns) with compact card layout in grid mode
- **Paginated sections** — "Show more (N remaining)" per section (5/page list, 6/page grid)
- **Clickable trip cards** — click anywhere on card to open country panel; inner buttons use stopPropagation
- **Empty state** — welcoming CTA when no trips exist
- **Token usage tracking** — running counter in chat footer, quota-aware error messages
- **Rich prompt prefill** — "Plan with AI" builds context-aware prompt without auto-sending
- **Chat modal light theme** — matches app theme, larger input area

### Changed
- `LLMProvider.chat()` returns `LLMChatResult { content, usage? }` instead of plain string
- Default view is `#trips` (was `#map`)
- `paidFeatures` defaults to `false` — AI and PDF hidden until payment
- MapView hidden by default, shown only during Cinematic mode
- Visited filter: two buttons → single dropdown (All / Not Visited / ✓ Visited)
- Visited filter on Trips works at trip-card level (shows card if ANY country matches)
- Default Trips layout is grid (3 columns)
- Collapsible filter panel on Trips — only search + 🔍 Filters button visible by default

### Removed
- Map and List from navigation (components kept for Cinematic/future use)
- Preset travel styles (touch-and-go/explorer/month-long) from plan generation
- `styleDefaults` from rule engine data
- `PLAN_STYLE_META`, `PLAN_STYLES` exports
- Hamburger menu (3 views fit as flat pills)

---

## [0.4.0] — 2026-05-24

### Added
- **Cinematic performance optimization** — parallelized wiki image fetches (`Promise.allSettled`), reduced sleep padding; startup ~6-8s → ~2-3s, total journey ~30-40% faster
- **Hamburger navigation** — Map & Trips primary in top bar; Calendar, List, Discover in ☰ dropdown; active secondary view shows its emoji
- **Multi-plan save** — persist up to 4 AI itineraries per destination with `useAiPlanStore` hook (localStorage, schema versioning, functional state updates)
- **Plan comparison** — when saving, view existing plans side-by-side with diff summary (duration, budget, cities, cost); choose to add or replace
- **Saved AI plans in country panel** — "Saved AI Plans (N)" section in detail drawer with View/Delete buttons
- **Splash loading screen** — rotating progress messages with emoji + dots during "Finish & Generate" (6-step animation)
- **28 new tests** — `aiPlanStore` (16), `planDiff` (7), `hashView` (5) covering save/replace/delete, cap enforcement, stale-state safety, malformed localStorage
- **`planDiff` utility** — `summarizePlan()` and `formatPlanLabel()` for compact plan descriptions

### Fixed
- **Premature AI itinerary modal** — no longer auto-opens behind chat modal; only opens on explicit "View Itinerary" click
- **Save to My List feedback** — button now shows "✅ Saved" or "Already in My List" instead of silently doing nothing
- **Map tiles** — switched from OpenFreeMap (intermittent CORS/403) to Carto Voyager (free, reliable)
- **Stale closure bug** in `useAiPlanStore` — rapid sequential saves now work correctly via functional `setStore` updates

### Changed
- **AI itinerary modal** — fully scrollable (meta sections + day cards scroll together); extracted `MetaSection`/`MetaChips` components (DRY)
- **Seamless navigation** — close/backdrop disabled during finalization; input hidden during plan generation
- **`useChatSession`** — added `finalizing` state to differentiate from regular `loading`

---

## [0.3.0] — 2026-05-23

### Added
- **AI Trip Planner** — multi-provider (OpenAI, Claude, Gemini) chat with bring-your-own-key model
- **AI itinerary modal** — city grouping, transport connections, hotel suggestions, cost breakdowns, booking recommendations
- **Context condensation** — TripBrief + recent messages strategy to manage tokens
- **Usage guardrails** — 20 messages per session cap with warning at 16
- **Settings modal** — provider selector, API key management with validation

---

## [0.2.0] — 2026-05-22

### Added
- **Rule engine itinerary** — Vietnam and Norway with per-city, per-day plans
- **Cinematic mode** — full-screen animated journey with map, transport arcs, city photos
- **Trip groups** — organize countries into combo trips (max 3 per group)
- **Discover view** — browse all 197 world countries, filter by region

---

## [0.1.0] — 2026-05-21

### Added
- Initial release — Map, Calendar, List views
- 44 curated seed countries with rich data
- 197-country world catalog
- Favorites, visited tracking, My List management
- Hash-based routing, localStorage persistence
- Feature flags system
