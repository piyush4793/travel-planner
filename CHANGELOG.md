# Changelog

All notable changes to Travel Planner are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/).

---

## [Unreleased]

### Added
- **Navigation simplified** — 5 views → 3 (Trips home, Calendar, Discover). Map removed from nav, kept for Cinematic. List removed.
- **PDF export** — export any itinerary as PDF via browser print dialog (zero dependencies, paid feature gated)
- **Two-tier feature gating** — `paidFeatures` master gate for premium features; individual flags for fine-grained control
- **Dev flag panel** — localhost-only 🛠 panel with dependency tree UI for toggling feature flags
- **Norway expanded** — 11 cities: Gudvangen (Viking village), Loen (Skylift), Trollstigen, Lofoten (Arctic islands + aurora)
- **Smart city selection** — algorithm picks best city subset when days < total available; prioritizes by importance
- **Custom-only planner** — removed 3 preset styles, single days slider with recommended/max limits
- **Travel style badges** — research-backed single badge per country (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive); "Month Long" renamed to "Immersive"
- **Trips sorting** — favorites pinned to top, visited pushed to bottom
- **Token usage tracking** — running counter in chat footer, quota-aware error messages
- **Rich prompt prefill** — "Plan with AI" builds context-aware prompt without auto-sending
- **Chat modal light theme** — matches app theme, larger input area

### Changed
- `LLMProvider.chat()` returns `LLMChatResult { content, usage? }` instead of plain string
- Default view is `#trips` (was `#map`)
- `paidFeatures` defaults to `false` — AI and PDF hidden until payment
- MapView hidden by default, shown only during Cinematic mode

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
