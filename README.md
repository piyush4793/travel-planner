# Roamwise

A personal, map-based travel planner with a catalog of 197 world countries, 44 curated seed destinations with rich data, and offline day-by-day itineraries for all 198 rule-backed destinations. Filter by season, budget, travel style, and experience type — then explore itineraries with real costs, hotel picks, and transport connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **🧭 Plan** (default landing) | Luxury emerald/ivory **guided planning wizard** (the app's landing view) — a streamlined **Trip basics** (who's going + what you're into) → **Which places?** (a *decision surface* built around a consolidated **header card** — country identity (a dropdown **country switcher** with a place-count badge on a multi-stop route, scaling to any count / long names; a static name for a single stop), trip stats (days · places · countries · budget) and a trip-scoped **"Who's going"** dropdown; shown only when a stop has cities. Below it, rich **decision cards** (design "D3": a ✓/+ affordance, the city name + a one-line "known for" brief + experience chips with the traveller's focus lit and a few others muted on the left; a stay/season rail — ≈recommended nights · ☀best window · ⚠avoid window — on the right; plus a sparse "Top for X" signal; each card also carries an **ⓘ** that opens a responsive **city detail** — a bottom-sheet on mobile / centered modal on desktop — with the full "known for" brief, every experience tag, and the ≈stay · ☀best · ⚠avoid windows) laid out two-up on wide screens; non-included cities collapse behind a "Show N more" tail. A single per-country **Filters** control (anchored popover on desktop, bottom-sheet on mobile) hosts that stop's **experiences** — Basics seeds a trip-wide vibe and each country inherits it until you diverge it here — alongside an inline **Sort** dropdown (Best match / Most iconic / Fewest days); an overflow-safe subline summarizes the active focus and, once a stop is hand-picked, gains a compact inline **↺ Reset to suggested** pill) → **Your trip** funnel. The header carries a **travel-style badge** (🏃/🔭/🌿) and a **Visited** toggle. The "Your trip" step is a **two-rail planning workspace**: a left **"Shape your trip"** rail (focus experiences, city picker, trip-length slider — the levers that regenerate the plan live), a centre **itinerary** (a slim route-label bar with a jump-to-top control, clickable jump-to-city route strip — wrapped pills on desktop, a compact dropdown on mobile — day-by-day plan, and a slim action toolbar: **📤 Share** · **🎬 Cinematic** fly-through · **📄 PDF** · **✨ AI plan**), and a right **"Good to know"** rail (**Trip readiness** checklist, per-party-size budget with clickable basis, when-to-go heatmap, stopover/watch-outs/pairs-with, private **Notes**, and learn/visa/links). Rails are collapsible on desktop and open as bottom-sheet drawers on tablet/mobile. Pick a destination from your list or the popular set to begin — a **labeled step progress** (Basics · Places · Review) is tappable to revisit any step, your device Back button walks back one step at a time, and progress is saved so a refresh returns you to the same step. When you reach the plan, it's **saved to My Trips automatically** (as a self-contained snapshot) so it's never lost, and stays fresh as you keep tuning it; a compact **"✓ Saved" + ★ Favorite** control in the header stars that saved trip (one consistent meaning of "favorite" — the Plan journey no longer adds countries to My List), and a modest **Plan another** sits in the footer as a secondary restart. |
| **🧳 Trips** | **My Trips** — a lightweight gallery of the trips you've planned. Each trip is saved automatically when you reach the wizard's Review step and kept fresh as you tune it; the tab lists them newest-first with ★ favorites pinned on top. Each card shows the ordered route (with flags), city chips, total days · places · cost (for the trip's saved budget basis), and when it was saved. **Tap a card to reopen that route in the Plan wizard** (jumps straight to Review); favorite ★ or delete (with confirm) any trip. Empty state offers a "Plan a trip" CTA. Saved trips are self-contained snapshots — independent of My List and rule data — and are included in backups. |
| **📅 Calendar** | Heatmap grid — rows are **every destination in My List** (it has its own Month filter), columns are months. Emerald = best, red = avoid, blue = current month. |
| **🌍 Discover** | Browse all 197 world countries. Filter by region and list status. Add countries to your list or remove them. One-click **creator's wishlist** starter pack and **reset to starter list** (both confirm first). |

View persists in the URL hash (`#plan`, `#trips`, `#calendar`, `#discover`) — refresh returns to the same view. **Plan is the default landing view** (the brand/Home button routes there too).

### Responsive Design
Mobile-first responsive layout — works on phones (375px+), tablets (768px+), and desktops (1024px+):
- **Navigation**: desktop uses a slim **luxury ivory/emerald** top bar (emerald wordmark + centered view pills — active pill emerald-filled — + Install/Share + Settings); **mobile uses a fixed bottom tab bar** (🗺️ Plan · 🧳 Trips · 📅 Calendar · 🧭 Discover, active tab an emerald-tinted pill) with a minimal ivory top strip for brand + Install/Share + Settings (no hamburger menu). The PWA `theme-color`/manifest match the ivory bar for a seamless status-bar blend
- **Country detail panel**: full-screen overlay on mobile; resizable side panel on desktop
- **All modals**: full-screen on mobile (no rounded corners, full height); centered cards on desktop
- **Saved-trip cards grid**: 1 col mobile → 2 col tablet → 3 col desktop
- **Plan comparison**: stacked columns on mobile; side-by-side on desktop
- **Touch targets**: minimum 44px on all interactive elements

---

### My List & Discover
- **197 countries** in the world catalog (`data/worldCatalog.json`), organized by 6 regions
- **5 curated seed destinations** (Japan, Thailand, Switzerland, France, Italy — the `inSeed` set) pre-added to your list — and **all 198 itinerary-backed destinations** now have offline planning data available on demand
- **Creator's wishlist** — 43 famous rule-backed destinations (`creatorPick`) offered as a one-click starter pack in Discover (preview + confirm before filling My List); plus **reset to starter list** to return to the curated seed (confirmed via dialog)
- Only countries in **My List** appear on Calendar and in the hidden cinematic Map
- Add from Discover → creates a minimal Country entry that can be enriched via edit
- Remove from list without losing custom data — re-add anytime
- **Favorites always sort to the top** across all views

---

### Filters (Calendar and Discover have their own)
The **Calendar** view has its own Month filter over the full My List; **Discover** has its own region + list-status filter bar. Budget tiering (used in Discover and cost badges) buckets a `₹`-range string by its **midpoint** using the active budget basis: ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+).

The `popularityScore` in `data/rules/index.json` (a 1–100 **leisure-only** composite: experiences 35%, city depth 20%, seasonality 20%, affordability/value 15%, combo breadth 5%, landmark presence 5%) still backs Discover/plan ordering.

---

### Country Detail Panel
Slides in from the right with a compact, decluttered layout:
- **Refreshed panel layout** — sticky header, card-based sections, enhanced slider, and calendar-style month grid
- **Compact header** — country name, visited toggle, favorite ★, dedicated edit/delete actions, close
- **Country flag support** — panel header now resolves flags for all manifest destinations (including naming variants like Czech Republic/Czechia, Ivory Coast/Côte d’Ivoire, St./Saint forms)
- **Travel style badge** — single research-backed recommendation per country (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive). Editing it (single-select) sets the default trip length: Touch & Go ≈ 60% of recommended, Explorer = recommended, Immersive = maximum
- **Single-input budget** — the edit form takes one per-person (solo) estimate; couple and family-of-4 totals are derived automatically from data-calibrated ratios and shown as read-only hints, so the member budget chips stay consistent with no chance of contradictory entries; edits update the panel in place with no reload
- **Collapsible sections** — Cities, Stopover tips, Watch out for, Combine with, Links collapse by default with item counts
- **Three tabs (Overview · Plan · Notes)** — the former *Info* tab is folded into **Overview**: after the at-a-glance decision info come the research sections (Learn about, Planning resources, Useful links), all lazy collapsibles so nothing loads until expanded
- **Combine-with navigation** — country pills in “Combine with” are clickable and open that country panel directly
- **"When to go"** — best + avoid months merged in one row
- **Trip planner** — days slider with **optimal DP-based city selection** (bounded knapsack over popularity + day bounds) + Generate/AI buttons
- **Panel-scoped Plan filters** — the Plan tab hosts a **Focus experiences** multi-select and a **Cities to visit** picker that only shape *this country's* offline itinerary (never any global/Calendar view). Each city is tagged with the experiences it satisfies — a fixed **35-tag catalog** of generic categories (Beaches, Mountains, Skiing, History, Food, UNESCO Sites, etc.) authored and web-verified for every city across all 198 destinations (with per-city best/worst travel months), or derived from its itinerary content when unauthored; selecting experiences boosts matching cities in auto-selection, surfaces matching cities first in the picker (with highlighted tags), and orders experience-matching activities first within each day. The **days slider** starts at the rule's recommended length (matching the "Recommended Xd" marker) and re-seeds as you shape the plan: picking cities sums their recommended days, focus experiences sum their matching cities' days, and travel style sets the pristine default — all clamped to the rule's max useful days. A budget-tier nudge (premium longer, budget shorter) applies only **once you've scoped** the plan, so a fresh panel never diverges from the marker. Until you touch it, the slider shows an **"✨ Auto-tuned to your style, budget & focus"** hint. Once you drag it, the value is **pinned** ("Custom length") and the other knobs stop overriding your chosen length; a one-tap **"↺ Reset to recommended (Xd)"** button re-links it, and switching country also clears the pin
- **Multi-plan selector** — dropdown to switch between Default and saved AI plans, with full day-wise itinerary for each
- **Plan comparison** — side-by-side modal with summary cards (duration, cost, cities, activities/day, hotels), city overlap analysis (shared/unique badges), and independent day-by-day scroll
- **Cinematic for any plan** — saved AI plans can also run cinematic mode; button disabled per-plan when city coordinates don't match
- **Share** — the panel Share action opens the phone's **native share sheet with the itinerary PDF attached** (generated in-browser via a lazy-loaded jsPDF chunk — no download step). **Multi-country routes render as a single PDF with per-country sections** (route title + "Stop N" bands with each stop's day range, cost and best months, plus that country's own **practical notes** — SIM/apps/connections/tips), themed in the app's emerald/ivory palette with serif display titles, the **Roamwise brand logo** stamped as a letterhead (header top-right + footer), **real country flags** (rasterised from the same source the app uses — beside the title for a single country, in each Stop band for a route) and crisp vector icons on every stat pill; the footer carries a **shareable "Plan your own trip" link** back to the app; it scales to any number of stops. It falls back to a native text share where file sharing isn't supported, and to copying a rich text summary + app link on desktop. The separate **Export PDF** button prints via the browser's print dialog with the same sections, theme, logo, flags/icons, per-country notes and link
- **Country facts stay in sync** — lazily loaded overview/facts discard stale responses if you switch destinations mid-fetch

---

### Day-by-Day Itinerary Planner
Custom trip planner with a days slider — set your duration and the engine builds the best itinerary:

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
| 📅 Offline | Generate Plan button | Static rule engine + generic algorithm — instant, no API needed |
| ✨ AI-Powered | Plan with AI button | Chat with LLM to build a plan conversationally, then view as itinerary |

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with styled transport markers, easing, city pulse, route glow |
| 📋 Itinerary | All countries (offline + AI) | Scrollable modal with expandable day cards, activities with cost highlighting, quick links (📍 Maps, 🔍 Search), meal recommendations, hotel booking links, and per-day 🗺️ Route button that opens a Google Maps Directions link with all stops plotted in walking/transit order |
| 📄 PDF Export | All countries (paid) | Browser print dialog → Save as PDF with clean formatted layout |

---

### AI Trip Planner (✨)
Bring-your-own-key integration with OpenAI and Claude. Chat with an AI assistant to plan trips for any destination.

- **Multi-provider support** — OpenAI, Claude (Anthropic), and Gemini (Google), switchable in Settings with per-provider keys
- **Central chat modal** — describe your trip in natural language ("Plan 10 days in Japan for 2, mid-range budget")
- **Pre-seed from country panel** — click "✨ Plan with AI" on any country to pre-fill a rich prompt with budget, best months, cities, experiences, and combo destinations (editable before sending — no auto-send, no wasted tokens)
- **Smart defaults** — origin from home country, 2 travelers, 7 days, mid-range budget when not specified
- **Context condensation** — maintains a structured trip brief + recent messages to save tokens
- **Finish & Generate** — extracts a structured JSON plan from the conversation; engaging splash screen with rotating progress messages during generation
- **Cost breakdowns** — per-day cost estimates for flights, hotels, excursions, and transfers
- **Booking suggestions** — Klook/Viator-style tour recommendations with price, duration, and ratings
- **Save to My List** — save AI-generated destinations to your list with instant feedback (saved / already exists)
- **Import plans from external AI** — paste a ChatGPT/Claude conversation or share link; multi-strategy parser extracts day-by-day itinerary with prompt improvement suggestions
- **Save AI plans** — persist up to 3 AI-generated itineraries per destination in localStorage with compare-and-replace flow
- **Rename-safe replacements** — replacing a saved AI plan now works even if the regenerated itinerary changes the destination label
- **Plan comparison** — when saving, view existing plans side-by-side with diff summary (duration, budget, cities, cost) and choose to add or replace
- **Token usage tracking** — running token counter with cost estimate in chat footer (color-coded: green <4K, amber 4K-12K, red >12K); hover for detailed breakdown (input/output tokens, per-provider pricing, estimated USD cost)
- **Pre-finalization cost estimate** — "Finish & Generate" button shows estimated cost before generating; tooltip with expected additional token usage
- **Provider pricing reference** — collapsible pricing table in Settings showing per-model input/output rates for all providers
- **Quota-aware error handling** — provider-specific error messages for rate limits, billing exhaustion, and free tier caps with links to billing pages
- **Settings modal** — provider selector, API key management with validation, explicit localStorage warning for unencrypted keys, security notice, setup guides
- **Feature-gated** — behind `llmPlanning` feature flag (enabled by default)

---

### Cinematic Itinerary (🎬)
Full-screen animated experience for rule-based countries:
1. World overview with complete route drawn on map
2. Departure arc from home city with ✈️ animation
3. City-by-city transit with transport emoji riding route lines
4. City photo slideshows (Wikipedia images, cross-fade, slide dots)
5. Staggered activity cards on resizable right panel
6. Return arc with "Welcome back!" screen
7. Pause/resume, close to restore original camera
8. Pause/resume stays reliable across re-renders because playback control is state-driven
9. **Prev / Skip stops** — ⏮ replays to the previous stop (forward-only engine replays from start and fast-forwards to the target), ⏭ fast-forwards the current segment to the next stop; **playback speed** toggle cycles 1× → 1.5× → 2× and scales every fly-through, sleep, and route-draw segment

---

### My Trips (saved trips)
Every trip you plan in the guided wizard is **saved automatically** the moment you reach the Review step, and kept fresh as you tune it — no explicit "save" needed. The **🧳 Trips** tab is a lightweight gallery of these saved trips.

- **Self-contained snapshots** — each saved trip records its ordered route, per-stop days/cities, budget basis, total length and cost at save time. Snapshots are independent of My List and the rule data, so a saved trip stays viewable even if you later edit or remove the underlying destinations.
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
A Header pill (👤 solo / 👫 couple / 👨‍👩‍👧‍👦 family4) sets your **persisted default** party size; the Plan wizard's "Who's going" control is a **temporary override** for quick what-if exploration (resets to your default on refresh). The active basis drives every cost/budget figure — Country Panel budget chips, Plan-tab and itinerary cost, saved-trip cost, and the Calendar budget cue — so all surfaces stay linked. Plan cost equals that basis's chip at the recommended length and scales with trip length.

### Backup & Restore
All travel data lives in localStorage. The Settings modal (⚙️) includes a full backup section:

| Action | Format | Scope |
|---|---|---|
| **Full Backup** | JSON | All localStorage data — countries, trips, AI plans, visited/favorites, settings |
| **Export Countries** | CSV or XLSX | Flat table of My List countries with all fields (human-editable) |
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
- **Share the app** — an always-available header/menu **Share** action: the header copies the app link (clipboard, avoiding the off-position desktop native share popover) while the mobile menu opens the native Web Share sheet, falling back to a WhatsApp deep link (`wa.me`) then clipboard — so people can pass Roamwise around and install it
- **Rich link previews** — Open Graph + Twitter Card meta with a 1200×630 image render a proper card when the link is shared on WhatsApp/social
- **Auto-updates** — service worker updates silently on new deploys

> **Roadmap — Google Play:** the PWA can be wrapped as a Trusted Web Activity (TWA) for the Play Store. This requires hosting at an origin root (custom domain or root host) so `/.well-known/assetlinks.json` verifies — see `DESIGN.md`.

---

### First Run Experience (FRE)
Guided 8-step onboarding tour for new users:
- **Hero cards** — full-screen gradient cards with floating emoji decorations for immersive steps (Welcome, Cinematic, Finale)
- **Spotlight cards** — positioned tooltips with blue glow highlight on target elements (Trips, Discover, Calendar, Settings)
- **Install card** — PWA install prompt with platform-specific instructions (Chrome/Edge programmatic, iOS manual, fallback text)
- **Mobile-responsive** — spotlight steps render as centered hero cards on mobile (<768px) since nav items have no room for tooltips
- **Dismiss anytime** — ✕ button on every card + Escape key closes tour; progress bar shows step count
- **One-time** — stored in localStorage (`tp_fre_done`), never shown again after completion or dismissal

### Lifecycle nudges
Soft, non-blocking prompts that appear at the right moment as a bottom-centre toast (never a modal, never steals focus). At most one shows at a time, priority-ordered, and each is debounced so it never flashes:
- **Add to list** — the first time you search with an empty My List, inviting you to add a destination
- **Favorite** — after you save an AI plan for a place that isn't already a favorite, offering a one-tap ★
- **Back up** — once your data has grown a few changes past your last backup, offering a one-click backup
Onboarding nudges (add-to-list / favorite) dismiss **permanently**; the backup nudge **snoozes** and returns only after more changes accumulate (a completed backup re-baselines it). Suppressed while any panel or modal is open.

---

### Country Info & Planning Resources
- **Learn about country** — collapsible section in country detail panel with Wikipedia summary, thumbnail image, capital, currency, and language (fetched on demand from Wikipedia/Wikidata APIs, cached per session)
- **Planning resources** — 3 curated external links per country: Wikivoyage travel guide, Lonely Planet destination page, and a home-country-aware visa/entry requirements search (uses the selected home country as the passport base)

---

### Feature Flags
Stored in `tp_features` localStorage key. On localhost, use the 🛠 dev panel in the header to toggle flags live.

**Two-tier gating:**
- `paidFeatures` — master gate for premium features (default: `false`)
- Individual flags — fine-grained control within each tier
- A paid feature requires BOTH `paidFeatures=true` AND its own flag enabled

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate — enables all premium features. Set to `true` after payment. |
| `llmPlanning` | `true` | paid | AI trip planning (chat, itinerary generation, save plans). Hidden unless `paidFeatures=true`. |
| `pdfExport` | `true` | paid | Export itineraries as PDF from country panel. Hidden unless `paidFeatures=true`. |
| `searchableHomeCountry` | `false` | free | Searchable dropdown with all 197 countries for home country selection |
| `multiCountryPlanning` | `true` | free | Multi-country planning on `#plan`: the destination picker becomes multi-select (up to `MAX_TRIP_UNITS` = 4) with a "Plan trip →" tray. Every wizard surface **molds itself from the selection** — Basics shows a route timeline (per-stop *recommended* days with the longest stop badged **Anchor**) and vibe pills unioned from every chosen country; **Which places?** presents a consolidated **header card** (a **dropdown country switcher** with a place-count badge — one stop at a time, scaling to any count / long names — trip-wide stats *days · places · countries · budget*, and a **"Who's going"** basis dropdown) over rich per-stop *decision cards* (design "D3": name + "known for" brief + focus-lit experience chips, and a ≈nights · ☀best window · ⚠avoid-window rail, plus a "Top for X" signal, and an **ⓘ** opening a responsive **city detail** — bottom-sheet on mobile / centered modal on desktop — with the full brief, all experience tags and the stay/season windows) in a two-up grid; a single per-country **Filters** control (experiences, popover/bottom-sheet) plus an inline **Sort** dropdown sit above them. Experiences are **per-country** — Basics seeds the trip vibe and each stop inherits it until diverged in Filters; the header stats span the whole route.; the header names the first stops and reveals the full route from a **+N** pill. Enabled by default. The **Your trip** review composes and renders **every** stop as a segmented **"Route Canvas"**: a cross-route jump nav over per-country segments (each with its full rich day-by-day itinerary, an **Adjust drawer** (Shape · Details) for that stop, a cumulative day range, and a collapsible body — the **anchor** stop opens by default while the rest fold into a scannable overview). A single trip-level **levers bar** sits above the stops so each stop header stays clean: a **Route order** control (reorder stops by **drag-and-drop** or keyboard, promote any stop to **anchor**, or one-tap **✨ Auto-arrange** into a sensible nearest-neighbour route from the anchor), the **jump-to-city** dropdown inline on the same row, and a **↑ Top** jump (the route label already lives in the header; total trip length is a header stat you retune per stop, not a whole-trip lever). Transitions between countries render as **honest border-hop rows** that expand to an informational mode picker (a distance-derived indicative flight time, rail/road marked "varies" since we don't fake per-pair transit data, and a note that hops cost no itinerary days). The cross-route **jump-to-city** menu groups cities by country and, on a dense route, jumping into a collapsed country expands it first so it always lands. The trip-level **"Good to know"** rail carries a **Trip readiness** checklist (border-crossing count + honest visa reminder), an **honest budget ledger** (per-country ×nights line items, an italic inter-country legs estimate, and a "flights extra" subtotal caveat) with a who's-going switch, per-country seasonality and watch-outs, and a **Notes** scratchpad. |

**Payment flow (future):** A payment page will set `paidFeatures=true` in localStorage upon successful purchase, unlocking all premium features for the user.

---

### Map Markers
- **Blue** — unvisited | **Green** — visited | **Purple** — combo/linked
- Hover for Wikipedia photo card with budget

---

## Tech Stack

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL JS. Zero runtime dependencies beyond React + MapLibre, no backend, and no routing or state libraries. The codebase is split into a platform-agnostic `src/core/` layer (types, storage ports/adapters, feature flags, pure trip/data utilities), web-only `src/hooks/` layer for React state/hooks, and `src/data/` / `src/utils/` for app-specific loaders and browser helpers. Async UI loaders use stale-request guards before committing fetched data so fast panel/view switches cannot overwrite the current selection. Offline itinerary content lives in `data/rules/` as 199 JSON files (198 country rule chunks + `index.json`) that lazy-load on demand, while Vitest + `@testing-library/react` cover the app with unit tests for hooks/utils/providers and P0 integration tests for key component flows (view rendering, filtering, country CRUD, trip management).

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
- Total statement coverage is ~90% (840 tests across 92 files). The `ai` folder, country-detail surfaces (`CountryForm`, `ItineraryModal`, `PlanCompareModal`, `CountryPanel`), shared components, the Trips/Discover/Calendar views (incl. trip creation/edit flows), and the platform-backup stack (`core/platform/*`, `core/adapters/backup/*`, `StorageLocationCard`) are now covered. `importParser`, `usePanelDrag`, `useChatSession`, `core/storage`, and `App.tsx` orchestration are unit/integration-covered.
- Reusable test helpers for localStorage seeding, hash navigation setup, and deterministic timer control (`src/test/testUtils.ts`)
- Remaining lower-coverage surfaces: maplibre-heavy `ItineraryCinematic` / `MapView` / `HoverCard` and `App.tsx` orchestration — with these covered, the `src/components/**` thresholds can be tightened.

Coverage-improvement agent loop (recommended):
1. Plan in phases (critical integration flows -> targeted unit/component gaps -> threshold hardening).
2. Implement in small test batches (unit + integration + regression/progression cases).
3. Run gates each batch: `npx tsc --noEmit && npm test && npm run build`.
4. Re-run `npm run test:coverage` and pick next lowest-covered high-risk surface.

Reusable slash command:
- Run `/tc-improvement <scope>` to invoke the phased workflow from the local Copilot skill `tc-improvement`.
- Example: `/tc-improvement Improve CountryPanel and ItineraryModal coverage in phased slices`.

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
| CountryForm | — | — | Lazy — on add/edit country |
| ItineraryModal | — | — | Lazy — on itinerary view |
| PlanCompareModal | — | — | Lazy — on plan compare |
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
| 🟡 Medium | ⭐⭐⭐ | Multi-country trip builder | Core | String countries into a single trip with total cost/days |
| 🟡 Medium | ⭐⭐ | Calendar sync | Export | Export itinerary as `.ics` file |
| 🟡 Medium | ⭐⭐ | Enriched AI response schema | AI | lat/lng per city, transport type per leg in LLM output |
| 🔴 Long | ⭐⭐⭐⭐ | Visited stats page | Analytics | Continents, total days, spend, heatmap timeline |
| 🔴 Long | ⭐⭐⭐ | Community itineraries | Social | Import/export rule data for sharing |
| 🔴 Long | ⭐⭐ | Seasonal flight cost hints | Data | Rough fare ranges from public sources |
| 🔴 Long | ⭐⭐ | Voice input for chat | AI | Speak trip requests instead of typing |
| 🔴 Long | ⭐⭐ | Reopen a saved trip in the wizard | UX | Rehydrate the Plan wizard from a saved-trip snapshot |
| 🔴 Long | ⭐ | Real-time pricing | Integration | Flights/hotels API integration |
| 🔴 Long | ⭐ | Social layer | Social | Follow friends, see where they've been |
