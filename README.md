# Roamwise

A personal, map-based travel planner with a catalog of 197 world countries, an MRU-powered Recents board, and offline day-by-day itineraries for all 198 rule-backed destinations. The Plan landing lets you search the full catalog, re-rank by best season for a month, and browse by region — then explore itineraries with real costs, hotel picks, and transport connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **🧭 Plan** (default landing) | Luxury emerald/ivory **guided planning wizard** (the app's landing view) — a streamlined **Trip basics** (who's going + what you're into) → **Which places?** (a *decision surface* built around a consolidated **header card** — country identity (a dropdown **country switcher** with a place-count badge on a multi-stop route, scaling to any count / long names; a static name for a single stop), trip stats (days · places · countries · budget) and a trip-scoped **"Who's going"** dropdown; shown only when a stop has cities. Below it, rich **decision cards** (design "D3": a ✓/+ affordance, the city name + a one-line "known for" brief + experience chips with the traveller's focus lit and a few others muted on the left; a stay/season rail — ≈recommended nights · ☀best window · ⚠avoid window — on the right; plus a sparse "Top for X" signal; each card also carries an **ⓘ** that opens a responsive **city detail** — a bottom-sheet on mobile / centered modal on desktop — with the full "known for" brief, every experience tag, and the ≈stay · ☀best · ⚠avoid windows) laid out two-up on wide screens; non-included cities collapse behind a "Show N more" tail. A single per-country **Filters** control (anchored popover on desktop, bottom-sheet on mobile) hosts that stop's **experiences** — Basics seeds a trip-wide vibe and each country inherits it until you diverge it here — alongside an inline **Sort** dropdown (Best match / Most iconic / Fewest days); an overflow-safe subline summarizes the active focus and, once a stop is hand-picked, gains a compact inline **↺ Reset to suggested** pill) → **Your trip** funnel. The **landing picker** is the app's single destination-discovery surface: a fast search over all 198 rule-backed destinations, a **"When are you going?"** month row that re-ranks the board by seasonality (best-window destinations first with a ☀ cue, off-season ones greyed with a ⚠ cue but never hidden), and a **region** row that folds in browse-by-region. The "Your trip" step is a unified **Route Canvas** for single- and multi-country trips: each stop renders as a collapsible itinerary segment with its own **Adjust** drawer (focus experiences, city picker, trip-length slider), a cross-route jump nav, honest border-hop rows between countries, and a slim action toolbar for **🎬 Cinematic** fly-through · **📄 PDF** · **✨ AI plan**. A single **Insights** rail covers trip readiness, active-basis budget ledger, when-to-go heatmaps, stopover/watch-outs/pairs-with, private **Notes**, and learn/visa/links; it collapses on desktop and opens as a bottom-sheet drawer on tablet/mobile. Pick a destination from **Jump back in** recents or the popular set to begin — a **labeled step progress** (Basics · Places · Review) is tappable to revisit any step, your device Back button walks back one step at a time, and progress is saved so a refresh returns you to the same step. **On phones the review screen streamlines its chrome** — a compact one-line header (first stop + a **+N** pill, an icon-only "who's going" control, no step bar) hands most of the screen to the itinerary, with **← Back** and **＋ Plan another** moving into the bottom action bar beside **Insights** and a **Tools** button that opens the PDF/AI/Cinematic toolbar in a bottom-sheet (on desktop that toolbar stays pinned below the itinerary). The primary **📤 Share** action sits in the header itself (left of the ★ favourite), so sharing your trip is always one tap away. When you reach the plan, it's **saved to My Trips automatically** (as a self-contained snapshot) so it's never lost, and stays fresh as you keep tuning it. The **first time** you reach a finished plan a short **"Your trip is ready ✨"** celebration appears (once), and thereafter — **only when you actually change something** in a finished plan — a brief **"Saved to My Trips"** toast quietly confirms the update (it fades on its own after a few seconds, or dismiss it with ✕); merely arriving at the plan, refreshing the page, **or reopening a saved trip** never triggers it — so there's no permanent status badge cluttering the header. A single refined **★ Favorite** icon in the header stars that saved trip (one consistent meaning of "favorite" for saved trips), and a modest **Plan another** sits in the footer as a secondary restart. |
| **🧳 Trips** | **My Trips** — a lightweight gallery of the trips you've planned. Each trip is saved automatically when you reach the wizard's Review step and kept fresh as you tune it; the tab lists them newest-first with ★ favorites pinned on top. A **search box** filters trips by route name, country, or city (with a clear-search empty state), and — when your library spans both **home-country (domestic)** and **international** trips — a scope **filter dropdown** (All / 🏠 *your home country* / 🌍 International, with live counts) narrows the gallery. Each card shows the ordered route (with flags), a scope badge (🏠 home / 🌍 International), city chips, total days · places · cost (for the trip's saved budget basis), and when it was saved. **Tap a card to reopen that route in the Plan wizard** (jumps straight to Review, and the reopened route joins your Recents); **+ New trip** (or the empty-state "Plan a trip") always starts a **fresh Plan landing picker** — it discards the in-progress wizard draft, never your saved snapshots. Favorite ★ or delete (with confirm) any trip. Saved trips are self-contained snapshots — independent of Recents and rule data — and are included in backups. |

The app is a focused **two-tab** experience (Plan / Trips). The Plan landing picker is the single discovery surface — full-catalog browse-by-region and month-seasonality re-ranking both live there (search + "When?" month re-rank + region browse).

View persists in the URL hash (`#plan`, `#trips`) — refresh returns to the same view. **Plan is the default landing view** (the brand/Home button routes there too).

### Responsive Design
Mobile-first responsive layout — works on phones (375px+), tablets (768px+), and desktops (1024px+):
- **Navigation**: desktop uses a slim **luxury ivory/emerald** top bar (emerald wordmark + centered view pills — active pill emerald-filled — + Install/Share + Settings); **mobile uses a fixed bottom tab bar** (🧭 Plan · 🧳 Trips, active tab an emerald-tinted pill) with a minimal ivory top strip for brand + Install/Share + Settings (no hamburger menu). The PWA `theme-color`/manifest match the ivory bar for a seamless status-bar blend
- **All modals**: full-screen on mobile (no rounded corners, full height); centered cards on desktop
- **Saved-trip cards grid**: 1 col mobile → 2 col tablet → 3 col desktop
- **Touch targets**: minimum 44px on all interactive elements

---

### Recents & the Plan landing picker
- **197 countries** in the world catalog (`data/worldCatalog.json`), organized by 6 regions
- **All 198 itinerary-backed destinations** have offline planning data available on demand; the 5 `inSeed` manifest entries hydrate richer seed data, and fresh users start with an empty Recents board
- **Recents** are implicit: a destination is recorded when it enters the Plan wizard's Basics step **or when you reopen a saved trip** (`MAX_RECENTS=24`), stored in the existing `tp_my_list` key in MRU order
- Fresh users start with an empty Recents board; the Plan landing header is **Jump back in**, and its empty state falls back to Popular destinations
- The landing picker is the single discovery surface: full-catalog search, a **"When?" month** seasonality re-rank, and **region** browse; Cinematic uses the active Plan route as its map backdrop
- **Domestic (within-country) planning**: where a domestic dataset exists for your home country (India today — **all 36 states & UTs** authored, with research-backed, feasibility-aware, price-checked offline itineraries), the landing picker shows a **scope toggle** (International ↔ 🏠 *home country*). Domestic plans flow through the **same wizard, engine, Route Canvas, PDF, cinematic, and My Trips** — the only difference is a data-source swap behind the `DestinationSource` seam (nothing hardcodes "India"). Domestic states show your home-country flag, the readiness/budget copy drops visas/border-crossings, and the region strip is hidden. "Jump back in" for domestic surfaces states you've previously planned (from saved domestic trips)

---

### The Plan landing picker's filters
The landing picker opens on an **editorial gradient hero** (eyebrow + headline + subline, shown on all breakpoints) over a **search row** — a full-catalog search box plus an inline **month dropdown** (`📅 Anytime ▾`, reusing `PlanPopover`: an anchored popover on desktop / bottom-sheet on mobile) — and a **horizontally-scrollable region tab strip** (`Popular` (=All), `Asia`, `Europe`, `Middle East`, `Africa`, `Americas`, `Oceania`; `aria-pressed` toggle buttons, **Popular is the default**). This keeps destinations above the fold on mobile. Selecting a month re-ranks the whole board by seasonality via `monthFit`/`rankByMonthFit` (`src/core/utils/monthFit.ts`), reading `bestMonths`/`worstMonths` baked into `data/rules/index.json` so it works offline over the full 198 with no lazy rule loads. Region **filters** the explore board (never the "Jump back in" recents); month **re-ranks** (never hides — off-season stays visible with a muted ⚠ cue). Budget tiering (used in cost badges) buckets a `₹`-range string by its **midpoint** using the active budget basis: ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+).

The `popularityScore` in `data/rules/index.json` (a 1–100 **leisure-only** composite: experiences 35%, city depth 20%, seasonality 20%, affordability/value 15%, combo breadth 5%, landmark presence 5%) backs the popular/plan ordering.

---

### Destination planning
All itinerary shaping happens inside the Plan wizard. Start planning from the Plan landing picker (search / "When?" month / region browse / multi-select tray) or a saved trip; destination detail and itinerary shaping live in the Plan wizard's Places step and Route Canvas.

---

### Day-by-Day Itinerary Planner
Plan-first trip planner with per-stop day controls — tune your duration and the engine builds the best itinerary:

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
| 📅 Offline | Plan wizard | Static rule engine + generic algorithm — instant, no API needed |
| ✨ AI-Powered | Plan wizard AI action | Chat with LLM to build a plan conversationally, then view as itinerary |

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with styled transport markers, easing, city pulse, route glow |
| 📋 Itinerary | All countries (offline + AI) | Scrollable Route Canvas with expandable day cards, activities with cost highlighting, quick links (📍 Maps, 🔍 Search), meal recommendations, hotel booking links, and per-day 🗺️ Route button that opens a Google Maps Directions link with all stops plotted in walking/transit order |
| 📄 PDF Export | All countries (paid) | Browser print dialog → Save as PDF with clean formatted layout |

---

### AI Trip Planner (✨)
Bring-your-own-key integration with OpenAI and Claude. Chat with an AI assistant to plan trips for any destination.

- **Multi-provider support** — OpenAI, Claude (Anthropic), and Gemini (Google), switchable in Settings with per-provider keys
- **Central chat modal** — describe your trip in natural language ("Plan 10 days in Japan for 2, mid-range budget")
- **Pre-seed from Plan** — click "✨ AI plan" in the Plan wizard to pre-fill a rich prompt from the active route context (editable before sending — no auto-send, no wasted tokens)
- **Smart defaults** — origin from home country, 2 travelers, 7 days, mid-range budget when not specified
- **Context condensation** — maintains a structured trip brief + recent messages to save tokens
- **Finish & Generate** — extracts a structured JSON plan from the conversation; engaging splash screen with rotating progress messages during generation
- **Cost breakdowns** — per-day cost estimates for flights, hotels, excursions, and transfers
- **Booking suggestions** — Klook/Viator-style tour recommendations with price, duration, and ratings
- **Import plans from external AI** — paste a ChatGPT/Claude conversation or share link; multi-strategy parser extracts day-by-day itinerary with prompt improvement suggestions
- **Save AI plans** — persist generated itineraries in localStorage
- **Token usage tracking** — running token counter with cost estimate in chat footer (color-coded: green <4K, amber 4K-12K, red >12K); hover for detailed breakdown (input/output tokens, per-provider pricing, estimated USD cost)
- **Pre-finalization cost estimate** — "Finish & Generate" button shows estimated cost before generating; tooltip with expected additional token usage
- **Provider pricing reference** — collapsible pricing table in Settings showing per-model input/output rates for all providers
- **Quota-aware error handling** — provider-specific error messages for rate limits, billing exhaustion, and free tier caps with links to billing pages
- **Settings modal** — provider selector, API key management with validation, explicit localStorage warning for unencrypted keys, security notice, setup guides
- **Feature-gated** — behind `llmPlanning` feature flag (enabled by default)

---

### Cinematic Itinerary (🎬)
Full-screen animated experience — works for **single- and multi-country** trips (and is domestic-ready), driven by a scope-agnostic route model:
1. World overview with the complete route drawn on the map
2. Departure arc from your home city with ✈️ animation (skipped for domestic scopes with no international gateway)
3. City-by-city transit with transport emoji riding route lines; between countries an honest **border hop** (flight for long legs, rail/road otherwise)
4. City photo slideshows (Wikipedia images, cross-fade, slide dots) merged across every stop
5. Staggered activity cards on resizable right panel
6. Return arc with "Welcome back!" screen (international trips)
7. Pause/resume, close to restore original camera
8. Pause/resume stays reliable across re-renders because playback control is state-driven
9. **Prev / Skip stops** — ⏮ replays to the previous stop (forward-only engine replays from start and fast-forwards to the target), ⏭ fast-forwards the current segment to the next stop; **playback speed** toggle cycles 1× → 1.5× → 2× and scales every fly-through, sleep, and route-draw segment

---

### My Trips (saved trips)
Every trip you plan in the guided wizard is **saved automatically** the moment you reach the Review step, and kept fresh as you tune it — no explicit "save" needed. The **🧳 Trips** tab is a lightweight gallery of these saved trips.

- **Self-contained snapshots** — each saved trip records its ordered route, per-stop days/cities, budget basis, total length and cost at save time. Snapshots are independent of Recents and the rule data, so a saved trip stays viewable even if you later edit or remove the underlying destinations.
- **Keyed by route** — re-planning the same ordered route (e.g. `Japan → Thailand`) updates the existing saved trip in place (preserving its favourite and original save time) rather than piling up duplicates.
- **Favorites float to the top** — star a trip to pin it into a ★ Favorites section; everything else is newest-first.
- **Delete with confirm** — removing a trip asks for confirmation (can't be undone).
- **Empty state** — a friendly prompt with a "Plan a trip" call-to-action when nothing is saved yet.
- **Backup-recoverable** — saved trips are part of the JSON backup set, so they restore with the rest of your travel data.
- **Responsive** — a card grid on desktop/tablet, single column on mobile; reachable from the mobile bottom tab bar.

---

### Home Country
📍 button in header — changes budget "from X" labels. Persists in localStorage.

Default: static "India" label. With `searchableHomeCountry` feature flag enabled: searchable dropdown with all 197 countries (max 10 visible, scroll-enabled).

### Budget basis (party size)
A Header pill (👤 solo / 👫 couple / 👨‍👩‍👧‍👦 family4) sets your **persisted default** party size; the Plan wizard's "Who's going" control is a **temporary override** for quick what-if exploration (resets to your default on refresh). The active basis drives every cost/budget figure — Plan itinerary cost and saved-trip cost — so all surfaces stay linked. Plan cost equals that basis's chip at the recommended length and scales with trip length.

### Backup & Restore
All travel data lives in localStorage. The Settings modal (⚙️) includes a full backup section:

| Action | Format | Scope |
|---|---|---|
| **Full Backup** | JSON | Recoverable localStorage data — Recents, country customizations, trips, AI plans, and settings |
| **Export Countries** | CSV or XLSX | Flat table of stored destination/custom country data with all fields (human-editable) |
| **Restore Backup** | JSON | Replaces all localStorage data from a previously exported JSON backup |
| **Import Countries** | CSV | Merges imported countries into your customs (existing entries updated, new ones added) |

- **Save As dialog** — manual exports open native "Save As" file picker (Chrome/Edge) so you can choose where to save; auto-backups silently download to browser's default folder
- **XLSX export** uses manual Office Open XML construction — no npm dependencies
- **API keys are excluded** from backup files for security
- **Backup reminders** — configurable (daily / weekly / monthly / never). Default: monthly. Overdue backups show a dismissible amber banner at the top
- **Smart first-launch** — won't nag for backup until user has actual custom data (not just seed data)

**Platform-aware backup location** — auto-backups pick the best destination for your device so they're easy to find and restore:
- **Desktop (Chrome/Edge):** choose a folder once (Settings → Backup → Storage location); backups then write silently into a dedicated `Roamwise/` app folder inside it as a stable `roamwise-backup-latest.json` (created automatically if absent, so all app data stays grouped and findable)
- **Mobile / other browsers:** silent app-private storage (OPFS); restore reads it back in-app
- **Fallback:** browsers without those APIs download a dated JSON to the Downloads folder
- **Fresh-device restore** — open the app on a new device with the same backup location and it *offers* (never auto-overwrites) a one-click restore of your travel data
- **Persistent storage** — the app asks the browser to protect your data from eviction where supported

---

### PWA & Offline Mode
Roamwise is a Progressive Web App — installable on desktop (Chrome/Edge) and mobile (Add to Home Screen):
- **Service worker** — cache-first for static assets (JS/CSS/SVG/PNG), network-first for HTML with cache fallback; shell precaches PNG icons + manifest
- **Works offline** — all 198 country itineraries, trip data, and the full UI work without internet
- **Installable** — PNG icons (192/512 + maskable) satisfy Android/Chrome install criteria; onboarding-oriented **Install app** pill in the header/menu (in addition to the first-run tour) triggers the native prompt, with manual Add-to-Home-Screen guidance on iOS Safari
- **Open app when installed** — once the PWA is installed, the header/menu detects it (`navigator.getInstalledRelatedApps()`) and swaps **Install** for a best-effort **Open app** action, so browser-tab users can jump to the installed app instead of re-installing
- **Share the app** — an always-available header **Share** action (🔗 link icon + "Share app" tooltip — differentiated from the Plan header's itinerary **Share** 📤 by icon, since both keep the short "Share" label) that adapts to the device: on a **phone/tablet** it opens the **native share sheet** (Web Share → WhatsApp deep link `wa.me` → clipboard), so you can send Roamwise straight to WhatsApp, Messages, etc.; on **desktop** it copies the app link to the clipboard (the desktop native-share popover is mispositioned, so a clean copy is friendlier there) — either way people can pass Roamwise around and install it
- **Rich link previews** — Open Graph + Twitter Card meta with a 1200×630 image render a proper card when the link is shared on WhatsApp/social
- **Auto-updates** — service worker updates silently on new deploys

> **Roadmap — Google Play:** the PWA can be wrapped as a Trusted Web Activity (TWA) for the Play Store. This requires hosting at an origin root (custom domain or root host) so `/.well-known/assetlinks.json` verifies — see `DESIGN.md`.

---

### First Run Experience (FRE)
Guided 7-step onboarding tour for new users:
- **Hero cards** — full-screen gradient cards with floating emoji decorations for immersive steps (Welcome, Cinematic, Finale)
- **Spotlight cards** — positioned tooltips with an emerald glow highlight on target elements (Plan, Trips, Settings)
- **Install card** — PWA install prompt with platform-specific instructions (Chrome/Edge programmatic, iOS manual, fallback text)
- **Mobile-responsive** — spotlight steps render as centered hero cards on mobile (<768px) since nav items have no room for tooltips
- **Dismiss anytime** — ✕ button on every card + Escape key closes tour; progress bar shows step count
- **One-time** — stored in localStorage (`tp_fre_done`), never shown again after completion or dismissal

### Lifecycle nudges
Soft, non-blocking backup prompts appear as a bottom-centre toast (never a modal, never steals focus). The backup nudge fires once your data has grown a few changes past your last backup, offers a one-click backup, **snoozes** when dismissed, and returns only after more changes accumulate (a completed backup re-baselines it). Suppressed while any modal, sheet, or overlay is open.

---

### Destination Info & Planning Resources
- **Learn about destination** — lazy collapsibles in the Plan Insights rail with Wikipedia summary, thumbnail image, capital, currency, and language where available (fetched on demand from Wikipedia/Wikidata APIs, cached per session)
- **Planning resources** — curated external links per destination: Wikivoyage travel guide, Lonely Planet destination page, and a home-country-aware visa/entry requirements search (uses the selected home country as the passport base)

---

### Feature Flags
Stored in `tp_features` localStorage key. On localhost, use the 🛠 dev panel in the header to toggle flags live.

**Two-tier gating:**
- `paidFeatures` — master gate for premium features (default: `true`)
- Individual flags — fine-grained control within each tier
- A paid feature requires BOTH `paidFeatures=true` AND its own flag enabled

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `true` | system | Master gate — enables all premium features. |
| `llmPlanning` | `true` | paid | AI trip planning (chat, itinerary generation, save plans). Hidden unless `paidFeatures=true`. |
| `pdfExport` | `true` | paid | Export Plan itineraries as PDF. Hidden unless `paidFeatures=true`. |
| `searchableHomeCountry` | `false` | free | Searchable dropdown with all 197 countries for home country selection |
| `multiCountryPlanning` | `true` | free | Multi-country planning on `#plan`: the destination picker becomes multi-select (up to `MAX_TRIP_UNITS` = 4) with a "Plan trip →" tray. Every wizard surface **molds itself from the selection** — Basics shows a route timeline (per-stop *recommended* days with the longest stop badged **Anchor**) and vibe pills unioned from every chosen country; **Which places?** presents a consolidated **header card** (a **dropdown country switcher** with a place-count badge — one stop at a time, scaling to any count / long names — trip-wide stats *days · places · countries · budget*, and a **"Who's going"** basis dropdown) over rich per-stop *decision cards* (design "D3": name + "known for" brief + focus-lit experience chips, and a ≈nights · ☀best window · ⚠avoid-window rail, plus a "Top for X" signal, and an **ⓘ** opening a responsive **city detail** — bottom-sheet on mobile / centered modal on desktop — with the full brief, all experience tags and the stay/season windows) in a two-up grid; a single per-country **Filters** control (experiences, popover/bottom-sheet) plus an inline **Sort** dropdown sit above them. Experiences are **per-country** — Basics seeds the trip vibe and each stop inherits it until diverged in Filters; the header stats span the whole route.; the header names the first stops and reveals the full route from a **+N** pill. Enabled by default. The **Your trip** review composes and renders **every** stop as a segmented **"Route Canvas"**: a cross-route jump nav over per-country segments (each with its full rich day-by-day itinerary, an **Adjust drawer** (Shape · Details) for that stop, a cumulative day range, and a collapsible body — the **anchor** stop opens by default while the rest fold into a scannable overview). A single trip-level **levers bar** sits above the stops so each stop header stays clean: a **Route order** control (reorder stops by **drag-and-drop** or keyboard, promote any stop to **anchor**, or one-tap **✨ Auto-arrange** into a sensible nearest-neighbour route from the anchor) and the **jump-to-city** dropdown inline on the same row (the route label already lives in the header; total trip length is a header stat you retune per stop, not a whole-trip lever). Transitions between countries render as **honest border-hop rows** that expand to an informational mode picker (a distance-derived indicative flight time, rail/road marked "varies" since we don't fake per-pair transit data, and a note that hops cost no itinerary days). The cross-route **jump-to-city** menu groups cities by country and, on a dense route, jumping into a collapsed country expands it first so it always lands. The trip-level **"Insights"** rail carries a **Trip readiness** checklist (**scope-aware**: international shows a border-crossing count + honest visa reminder; domestic shows "no visa or border checks" + a "legs between stops" reminder), an **honest budget ledger** (per-country ×nights line items, an italic inter-country/inter-city legs estimate, and a "flights extra" subtotal caveat) with a who's-going switch, per-country seasonality and watch-outs, and a **Notes** scratchpad. |

**Payment flow (future):** A payment page will set `paidFeatures=true` in localStorage upon successful purchase, unlocking all premium features for the user.

---

### Map Markers
- **Emerald route/city markers** — active Plan route stops and transport context; cinematic mode owns map visibility
- Hover for Wikipedia photo card with budget

---

## Tech Stack

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL JS. Zero runtime dependencies beyond React + MapLibre, no backend, and no routing or state libraries. The codebase is split into a platform-agnostic `src/core/` layer (types, storage ports/adapters, feature flags, pure trip/data utilities), web-only `src/hooks/` layer for React state/hooks, and `src/data/` / `src/utils/` for app-specific loaders and browser helpers. Async UI loaders use stale-request guards before committing fetched data so fast panel/view switches cannot overwrite the current selection. Offline itinerary content lives in `data/rules/` as 199 JSON files (198 country rule chunks + `index.json`) that lazy-load on demand, while Vitest + `@testing-library/react` cover the app with unit tests for hooks/utils/providers and P0 integration tests for key component flows (view rendering, filtering, trip planning and saved-trip management).

### Testing & Coverage

| Command | Description |
|---|---|
| `npm test` | Run all tests (unit + integration) |
| `npm run test:watch` | Watch mode |
| `npm run test:coverage` | V8 coverage → terminal + `coverage/index.html` (HTML report) |
| `npm run test:ui` | Vitest browser UI |
| `npm run check:coverage` | Flag changed files below 50% coverage threshold |

Coverage thresholds are enforced in `vite.config.ts`:
- `src/core/utils/**` — 80% statements, 70% branches, 80% functions
- `src/core/data/**` — 60% across the board
- `src/hooks/**` — 60% statements/functions, 55% branches
- `src/utils/**` — 60% statements/functions, 50% branches
- `src/components/**` — 4% statements/functions, 2% branches (temporary floor while UI integration coverage is expanded)

Current testing status:
- Total statement coverage is ~90% (1159 tests). The `ai` folder, shared Plan/itinerary components, the Trips view, the Plan landing picker (search + "When?" month re-rank + region browse), and the platform-backup stack (`core/platform/*`, `core/adapters/backup/*`, `StorageLocationCard`) are now covered. `importParser`, `useChatSession`, `core/storage`, and `App.tsx` orchestration (incl. pull-to-refresh, cross-tab storage sync, mobile nav) are unit/integration-covered.
- Reusable test helpers for localStorage seeding, hash navigation setup, and deterministic timer control (`src/test/testUtils.ts`)
- Remaining lower-coverage surfaces: maplibre-heavy `ItineraryCinematic` / `MapView` / `HoverCard` and `App.tsx` orchestration — with these covered, the `src/components/**` thresholds can be tightened.

Coverage-improvement agent loop (recommended):
1. Plan in phases (critical integration flows -> targeted unit/component gaps -> threshold hardening).
2. Implement in small test batches (unit + integration + regression/progression cases).
3. Run gates each batch: `npx tsc --noEmit && npm test && npm run build`.
4. Re-run `npm run test:coverage` and pick next lowest-covered high-risk surface.

Reusable slash command:
- Run `/tc-improvement <scope>` to invoke the phased workflow from the local Copilot skill `tc-improvement`.
- Example: `/tc-improvement Improve Plan Route Canvas and itinerary toolbar coverage in phased slices`.

The `scripts/check-new-coverage.sh` script compares changed files against the coverage report and flags any new/modified source file below 50% — run it before merging to catch untested code.

### Bundle Optimization

The build uses manual chunk splitting and `React.lazy()` code-splitting to keep the initial load fast:

| Chunk | Size | Gzipped | Loading |
|---|---|---|---|
| App code | ~217 KB | ~62 KB | Initial |
| MapLibre GL | 802 KB | 217 KB | Initial, cached across deploys |
| React vendor | 141 KB | 45 KB | Initial, cached across deploys |
| ChatModal | 38 KB | 13 KB | Lazy — on first AI chat open |
| ItineraryCinematic | 42 KB | 11 KB | Lazy — on cinematic mode |
| SettingsModal | 15 KB | 4 KB | Lazy — on settings open |
| AiItineraryModal | 14 KB | 4 KB | Lazy — on AI plan result |
| FreTour | 14 KB | 4 KB | Lazy — on first-run tour |
| 198 country rules | ~10 KB each | ~4 KB | Lazy — on country select |
| CSS | 123 KB | 19 KB | Initial |

MapLibre and React are split into separate vendor chunks that cache independently. Heavy modals and overlays are lazy-loaded via `React.lazy()` + `Suspense`, moving ~123 KB out of the initial bundle. Seed country enrichment uses `requestIdleCallback` chunking (10 per batch) so the first paint is never blocked by data hydration.

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
| 🟡 Medium | ⭐⭐ | Calendar sync | Export | Export itinerary as `.ics` file |
| 🟡 Medium | ⭐⭐ | Enriched AI response schema | AI | lat/lng per city, transport type per leg in LLM output |
| 🔴 Long | ⭐⭐⭐⭐ | Travel stats page | Analytics | Continents, total days, spend, heatmap timeline |
| 🔴 Long | ⭐⭐⭐ | Community itineraries | Social | Import/export rule data for sharing |
| 🔴 Long | ⭐⭐ | Seasonal flight cost hints | Data | Rough fare ranges from public sources |
| 🔴 Long | ⭐⭐ | Voice input for chat | AI | Speak trip requests instead of typing |
| 🔴 Long | ⭐ | Real-time pricing | Integration | Flights/hotels API integration |
| 🔴 Long | ⭐ | Social layer | Social | Follow friends, see where they've been |
