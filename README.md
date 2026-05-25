# Travel Planner

A personal, map-based travel planner with a catalog of 197 world countries, 43 curated seed destinations with rich data, and a rule-based day-by-day itinerary engine. Filter by season, budget, travel style, and experience type — then explore itineraries with real costs, hotel picks, and transport connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **✈ Trips** (home) | Dashboard with progress ring, stats, and "Next trip" highlight. Trip cards with image collages, budget, best months. Grouped sections: ⭐ Favorites → 📋 Planning → ✅ Completed. List/grid toggle, paginated. Click any card to open country detail. |
| **📅 Calendar** | Heatmap grid — rows are destinations, columns are months. Emerald = best, red = avoid, blue = current month. |
| **🌍 Discover** | Browse all 197 world countries. Filter by region and list status. Add countries to your list or remove them. |

View persists in the URL hash (`#trips`, `#calendar`, `#discover`) — refresh returns to the same view. Trips is the default home view.

### Responsive Design
Mobile-first responsive layout — works on phones (375px+), tablets (768px+), and desktops (1024px+):
- **Header**: hamburger menu on mobile with slide-down drawer for settings/actions; full pill nav on tablet+
- **Country detail panel**: full-screen overlay on mobile; resizable side panel on desktop
- **All modals**: full-screen on mobile (no rounded corners, full height); centered cards on desktop
- **Trip cards grid**: 1 col mobile → 2 col tablet → 3 col desktop
- **Plan comparison**: stacked columns on mobile; side-by-side on desktop
- **Touch targets**: minimum 44px on all interactive elements

---

### My List & Discover
- **197 countries** in the world catalog (`data/worldCatalog.json`), organized by 6 regions
- **43 curated seed destinations** with rich data (budget, best months, experiences, cities) pre-added to your list — includes United States, United Arab Emirates, and Antarctica as full destinations
- Only countries in **My List** appear on Map, Calendar, List, and Trips views
- Add from Discover → creates a minimal Country entry that can be enriched via edit
- Remove from list without losing custom data — re-add anytime
- **Favorites always sort to the top** across all views

---

### Filters (top bar, hidden on Discover)
All filters combine with AND logic:

| Filter | Behaviour |
|---|---|
| **Month** | Multi-select — shows countries with best-time overlap |
| **Budget** | ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+) |
| **Experiences** | Multi-select tag picker — AND logic |
| **Visited** | Dropdown: All Countries / Not Visited / ✓ Visited — on Trips, filters at trip-card level (shows card if any country matches) |

---

### Country Detail Panel
Slides in from the right with a compact, decluttered layout:
- **Compact header** — country name, visited toggle, favorite ★, overflow menu (⋯ for Edit/Delete), close
- **Travel style badge** — single research-backed recommendation per country (🏃 Touch & Go / 🔭 Explorer / 🌿 Immersive)
- **Collapsible sections** — Experiences, Cities, Stopover tips, Watch out for, Combine with, Links, Notes collapse by default with item counts
- **"When to go"** — best + avoid months merged in one row
- **Trip planner** — days slider with smart city selection + Generate/AI buttons
- **Multi-plan selector** — dropdown to switch between Default and saved AI plans, with full day-wise itinerary for each
- **Plan comparison** — side-by-side modal with summary cards (duration, cost, cities, activities/day, hotels), city overlap analysis (shared/unique badges), and independent day-by-day scroll
- **Cinematic for any plan** — saved AI plans can also run cinematic mode; button disabled per-plan when city coordinates don't match

---

### Day-by-Day Itinerary Planner
Custom trip planner with a days slider — set your duration and the engine builds the best itinerary:

- **Range slider** from 1 to max available days (based on rule data)
- **Recommended days** shown for guidance (e.g. "Recommended: 12 days")
- **Smart city selection** — when days are fewer than total cities, the algorithm prioritizes by importance (recDays) and drops lowest-priority cities first
- **Optional city override** — manually pick which cities to include

**Rule-based countries** (Vietnam, Norway) have per-day itineraries with real costs, hotel picks, and city-by-city routing. Norway covers 11 cities including Lofoten, Gudvangen Viking village, Trollstigen, and Loen.

**Two planning modes:**
| Mode | Trigger | Description |
|---|---|---|
| 📅 Offline | Generate Plan button | Static rule engine + generic algorithm — instant, no API needed |
| ✨ AI-Powered | Plan with AI button | Chat with LLM to build a plan conversationally, then view as itinerary |

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with styled transport markers, easing, city pulse, route glow |
| 📋 Itinerary | All countries (offline + AI) | Scrollable modal with expandable day cards, activities with cost highlighting, quick links (📍 Maps, 🔍 Search), meal recommendations, hotel booking links |
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
- **Plan comparison** — when saving, view existing plans side-by-side with diff summary (duration, budget, cities, cost) and choose to add or replace
- **Token usage tracking** — running token counter with cost estimate in chat footer (color-coded: green <4K, amber 4K-12K, red >12K); hover for detailed breakdown (input/output tokens, per-provider pricing, estimated USD cost)
- **Pre-finalization cost estimate** — "Finish & Generate" button shows estimated cost before generating; tooltip with expected additional token usage
- **Provider pricing reference** — collapsible pricing table in Settings showing per-model input/output rates for all providers
- **Quota-aware error handling** — provider-specific error messages for rate limits, billing exhaustion, and free tier caps with links to billing pages
- **Settings modal** — provider selector, API key management with validation, security notice, setup guides
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

---

### Trip Groups (Editable)
- Curated seed groups define optimal multi-country combinations
- Inline editor: change main country, add-ons (max 2), region
- Create custom trip groups from the + New Trip button
- Delete trips (seed trips are tombstoned, custom trips removed)
- One-trip-per-country invariant enforced in editor
- Unassigned countries appear as auto-generated solo trips (read-only)

---

### Home Country
📍 button in header — changes budget "from X" labels. Persists in localStorage.

Default: 16 curated countries. With `searchableHomeCountry` feature flag enabled: searchable dropdown with all 197 countries (max 10 visible, scroll-enabled).

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

**Payment flow (future):** A payment page will set `paidFeatures=true` in localStorage upon successful purchase, unlocking all premium features for the user.

---

### Map Markers
- **Blue** — unvisited | **Green** — visited | **Purple** — combo/linked
- Hover for Wikipedia photo card with budget

---

## Tech Stack

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL JS. Zero runtime dependencies beyond React + MapLibre. No routing library, no state management library. Static site — deploy to Netlify/Vercel free tier.

For detailed architecture, code structure, design patterns, and data model, see [DESIGN.md](./DESIGN.md).

---

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # run all tests (vitest)
npm run build    # static output → dist/
npm run preview  # preview the build
```

Deploy `dist/` to Netlify, Vercel, or GitHub Pages (free tier — no server needed).

---

## Future Scope

| Duration | Wow Factor | Feature | Category | Description |
|----------|-----------|---------|----------|-------------|
| 🟢 Short | ⭐⭐⭐ | Cinematic for AI plans | AI | Fuzzy city name matching + AI lat/lng fallback so cinematic works for imported plans |
| 🟢 Short | ⭐⭐ | Budget currency toggle | UX | Convert ₹ to USD / EUR / AUD |
| 🟡 Medium | ⭐⭐⭐⭐ | First run experience | UX | Guided onboarding tour highlighting key features (tooltip-based, one-time) |
| 🟡 Medium | ⭐⭐⭐⭐ | More rule-based countries | Content | Thailand, Japan, New Zealand, Iceland — per-day itineraries with costs |
| 🟡 Medium | ⭐⭐⭐ | Import parser quality | AI | Better ChatGPT link extraction, React Router stream data, entity cleanup |
| 🟡 Medium | ⭐⭐⭐ | Data backup — Spreadsheet sync | Export | Google Sheets / CSV export & import of all user data (My List, notes, AI plans) |
| 🟡 Medium | ⭐⭐⭐ | Multi-country trip builder | Core | String countries into a single trip with total cost/days |
| 🟡 Medium | ⭐⭐ | Calendar sync | Export | Export itinerary as `.ics` file |
| 🟡 Medium | ⭐⭐ | Enriched AI response schema | AI | lat/lng per city, transport type per leg in LLM output |
| 🔴 Long | ⭐⭐⭐⭐ | Visited stats page | Analytics | Continents, total days, spend, heatmap timeline |
| 🔴 Long | ⭐⭐⭐⭐ | PWA / offline mode | Infra | Installable, works without internet |
| 🔴 Long | ⭐⭐⭐ | "Learn about country" section | Content | Historical facts, culture, safety tips, visa implications |
| 🔴 Long | ⭐⭐⭐ | Community itineraries | Social | Import/export rule data for sharing |
| 🔴 Long | ⭐⭐ | Seasonal flight cost hints | Data | Rough fare ranges from public sources |
| 🔴 Long | ⭐⭐ | Voice input for chat | AI | Speak trip requests instead of typing |
| 🔴 Long | ⭐⭐ | Drag-and-drop trip reorder | UX | Reorder trip group add-ons |
| 🔴 Long | ⭐ | Real-time pricing | Integration | Flights/hotels API integration |
| 🔴 Long | ⭐ | Social layer | Social | Follow friends, see where they've been |
