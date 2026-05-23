# Travel Planner

A personal, map-based travel planner with a catalog of 197 world countries, 44 curated seed destinations with rich data, and a rule-based day-by-day itinerary engine. Filter by season, budget, travel style, and experience type — then explore itineraries with real costs, hotel picks, and transport connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **🗺 Map** | Interactive world map with color-coded pins. Click any pin to open the detail panel. Combo destinations highlight in purple. |
| **📅 Calendar** | Heatmap grid — rows are destinations, columns are months. Emerald = best, red = avoid, blue = current month. |
| **☰ List** | Paginated table with search, sort by name / budget / visited, inline toggles. Favorites always sort to the top. |
| **✈ Trips** | Countries organized into trip combinations (max 3 per trip). Inline edit/create/delete for trip groups. Progress tracking per trip. |
| **🌍 Discover** | Browse all 197 world countries. Filter by region and list status. Add countries to your list or remove them. Listed countries appear first by default. |

View persists in the URL hash (`#map`, `#calendar`, `#list`, `#trips`, `#discover`) — refresh returns to the same view.

**Navigation:** Map and Trips are primary nav items always visible in the header. Calendar, List, and Discover are accessible via the ☰ hamburger menu for a cleaner top bar.

---

### My List & Discover
- **197 countries** in the world catalog (`data/worldCatalog.json`), organized by 6 regions
- **44 curated seed countries** with rich data (budget, best months, experiences, cities) pre-added to your list
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
| **Bucket list / Visited** | Show only unvisited or only visited |

---

### Country Detail Panel
Slides in from the right. Contains:
- Budget estimate from configurable home country
- Travel style recommendation badges
- Best months and months to avoid
- Experience tags (click to filter)
- City breakdown with per-city seasons and highlights
- Stopover tips, combo suggestions (purple map highlights)
- Useful links, visited/favorite toggles, edit/delete
- Personal notes (auto-saved)

---

### Day-by-Day Itinerary Planner
In-panel trip planner with 4 travel styles:

| Style | Days | Description |
|---|---|---|
| 🏃 Touch & Go | 3–4 | Quick stopover |
| 🔭 Explorer | 7–12 | Full holiday |
| 🌿 Month Long | 30 | Slow travel |
| ✏️ Custom | 1–90 | Any duration |

**Rule-based countries** (Vietnam, Norway) have per-day itineraries with real costs, hotel picks, and city-by-city routing.

**Two planning modes:**
| Mode | Trigger | Description |
|---|---|---|
| 📋 Offline | Style buttons in panel | Static rule engine + generic algorithm — instant, no API needed |
| ✨ AI-Powered | "Plan with AI" in header | Chat with OpenAI to build a plan conversationally, then view as itinerary |

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with map flyovers and city photo slideshows |
| 📋 Itinerary | All countries (offline + AI) | Scrollable modal with day cards, activities, costs, transport |

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
- **Save AI plans** — persist up to 4 AI-generated itineraries per destination in localStorage with compare-and-replace flow
- **Plan comparison** — when saving, view existing plans side-by-side with diff summary (duration, budget, cities, cost) and choose to add or replace
- **Token usage tracking** — running token counter in chat footer (color-coded: green <4K, amber 4K-12K, red >12K), session total shown on plan completion
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
Stored in `tp_features` localStorage key. Toggle via browser console:
```js
localStorage.setItem('tp_features', JSON.stringify({ searchableHomeCountry: true }));
location.reload();
```

| Flag | Default | Description |
|---|---|---|
| `searchableHomeCountry` | `false` | Searchable dropdown with all 197 countries for home country selection |

---

### Map Markers
- **Blue** — unvisited | **Green** — visited | **Purple** — combo/linked
- Hover for Wikipedia photo card with budget

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, static output |
| UI | **React 18 + TypeScript** | Component model + type safety |
| Styling | **Tailwind CSS** | Utility-first, zero runtime |
| Map | **MapLibre GL JS** | Free OSM fork, no token |
| Tiles | **OpenFreeMap** (`liberty`) | Free vector tiles, no API key |
| Images | **Wikimedia Commons API** | Free, CORS-enabled |
| State | **Custom hooks + localStorage** | No external state library |
| Routing | **URL hash** | Zero deps, back/forward works |
| Data | **Local JSON** | Ships with app, works offline |

**Zero runtime dependencies** beyond React + MapLibre. No routing library, no state management library.

---

## Architecture

### Project Structure
```
src/
├── hooks/
│   ├── useCountryStore.ts       # Country CRUD, My List, seed+overrides merging
│   ├── useTripStore.ts          # Trip group CRUD + seed merging
│   ├── usePersistedSet.ts       # DRY Set<string> + localStorage persistence
│   ├── useHashView.ts           # Hash-based routing (no router library)
│   ├── usePanelDrag.ts          # Resizable panel drag behavior
│   ├── useChatSession.ts        # AI chat state, send/finish/clear
│   └── useAiPlanStore.ts        # AI plan persistence (save/replace/compare, max 4 per dest)
├── components/
│   ├── views/                   # Top-level view components
│   │   ├── MapView.tsx          # MapLibre map, markers, hover card
│   │   ├── CalendarView.tsx     # Month heatmap grid
│   │   ├── ListView.tsx         # Paginated sortable table
│   │   ├── TripsView.tsx        # Trip cards + inline editor
│   │   └── DiscoverView.tsx     # 197-country catalog browser
│   ├── country/                 # Country-specific components
│   │   ├── CountryPanel.tsx     # Right-side detail + itinerary planner
│   │   ├── CountryForm.tsx      # Add/edit modal form
│   │   ├── ItineraryCinematic.tsx # Full-screen animated journey
│   │   └── ItineraryModal.tsx   # Scrollable itinerary modal
│   ├── ai/                      # AI/LLM integration
│   │   ├── ChatModal.tsx        # Central chat modal for AI trip planning
│   │   ├── AiItineraryModal.tsx # AI-generated itinerary display
│   │   └── SettingsModal.tsx    # API key management + security
│   ├── map/                     # Map-related components
│   │   ├── FlightRoutes.tsx     # Animated flight arcs
│   │   └── HoverCard.tsx        # Wikipedia photo card on map hover
│   └── shared/                  # Reusable UI components
│       ├── Filters.tsx          # Global filter bar
│       ├── PillGroup.tsx        # Segmented pill toggle
│       ├── FilterChip.tsx       # Portal-based dropdown chip
│       ├── ExperienceDropdown.tsx # Experience tag multi-select
│       ├── HomeCountrySelector.tsx # Home country dropdown
│       └── Tooltip.tsx          # Portal-based info tooltip
├── data/
│   ├── itineraryRules.ts        # Per-country/city/day rule data
│   └── tripGroups.ts            # Trip group definitions + merge logic
├── utils/
│   ├── ai/                      # LLM integration utilities
│   │   ├── llmProvider.ts       # Provider abstraction (OpenAI, extensible)
│   │   ├── llmPrompts.ts        # System prompts, TripBrief, context condensation
│   │   └── llmTransform.ts      # LLM JSON → TripPlan extraction + validation
│   ├── tripPlans.ts             # Itinerary generation (rule engine + generic)
│   ├── travelStyles.ts          # STYLE_META (icons, colors, classes)
│   ├── filterLogic.ts           # Pure filter functions
│   ├── transport.ts             # TransportType, emoji, detection
│   ├── wikiImages.ts            # Wikipedia image fetch + cache
│   ├── months.ts                # Month constants
│   ├── featureFlags.ts          # Feature gate system (tp_features localStorage)
│   └── storage.ts               # localStorage read/write helpers
├── App.tsx                      # Root layout + view orchestration
├── types.ts                     # Shared TypeScript types
└── index.css                    # Tailwind + keyframe animations
data/
├── countries.json               # 44 curated seed destinations
└── worldCatalog.json            # 197 world countries (name, lat, lng, region)
```

### Key Design Patterns

**Custom hooks for state domains (SRP)**
State is organized into domain-specific hooks rather than a monolithic App component:
- `useCountryStore` — all country data, CRUD, My List, favorites, visited
- `useTripStore` — trip group management
- `useAiPlanStore` — AI-generated plan persistence (save, replace, compare)
- `usePersistedSet` — reusable Set<string> with auto-persistence (DRY)
- `useChatSession` — AI chat state machine (messages, finalize, clear, token accumulation)
- `useHashView` — URL routing

**Seed + Overrides pattern**
User edits stored as full objects in `tp_customs`. On load, seed entries are overridden by matching customs; `tp_deleted` tombstones seed entries. New additions are appended. Applied to both countries and trip groups.

**Rule engine flow**
```
generateTripPlan() in tripPlans.ts
  └─ getRuledItinerary()  ← checks ITINERARY_RULES[country.name]
       ├─ found → per-day plan from rule data
       └─ not found → generic algorithm from experience tags
```

**Portal pattern** — filter dropdowns, tooltips, and experience picker use `createPortal` because the filter bar has `overflow-x: auto` which clips absolute children.

**Cinematic map** — reuses the main MapLibre instance via `mainMapRef` (no second map). Disables user interaction on mount, adds GeoJSON route sources, restores on close.

---

## Data Model

```ts
type CatalogEntry = {
  name: string; lat: number; lng: number; region: string;
};

type Country = {
  name: string;
  lat: number; lng: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;             // "₹3L–₹5L" — from home country
  experiences: string[];
  avoid?: string[];
  combo?: string[];
  landmark?: string;          // Wikipedia title for hover image
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;             // personal notes
};

type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};
```

---

## Persistence (localStorage)

| Key | Content |
|---|---|
| `tp_my_list` | Country names in user's active list |
| `tp_visited` | Visited country names |
| `tp_favorites` | Favorited country names |
| `tp_customs` | User-added/edited Country objects |
| `tp_deleted` | Tombstoned seed country names |
| `tp_home_country` | Departure country (default: "India") |
| `tp_trip_customs` | User-edited/created trip groups |
| `tp_trip_deleted` | Tombstoned seed trip group mains |
| `tp_features` | Feature flag overrides (`{ searchableHomeCountry: true, llmPlanning: true }`) |
| `tp_llm_keys` | LLM API keys (`{ openai?: string, claude?: string, gemini?: string }`) — stored locally, never sent to any server except the provider |
| `tp_llm_provider` | Active LLM provider (`"openai"` or `"claude"`) |
| `tp_ai_plans` | Saved AI-generated itineraries (`Record<destinationKey, SavedAiPlan[]>`), max 4 per destination |

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

### Near-term
- [ ] More rule-based countries — Thailand, Japan, New Zealand, Iceland
- [ ] Itinerary export — PDF / shareable link for a planned trip
- [ ] Day-level detail expansion — tap a day row for full tips, map coords, booking links
- [ ] Budget currency toggle — convert ₹ to USD / EUR / AUD with approximate rates
- [ ] Drag-and-drop reorder for trip group add-ons
- [ ] Home country as trip origin — use the selected home country as the starting point for itineraries, show it as origin on maps, and factor it into flight/budget suggestions
- [ ] First run experience — onboarding walkthrough for new users (highlight key views, filters, and how to add countries)

### Medium-term
- [ ] Multi-country trip builder — string countries into a single trip with total cost/days
- [ ] Calendar sync — export itinerary as `.ics` file
- [ ] Seasonal flight cost hints — rough fare ranges from public sources
- [ ] Visited stats page — continents, total days, spend, heatmap timeline
- [ ] PWA / offline mode — installable, works without internet
- [ ] Bulk add to My List from Discover (select multiple + add)
- [ ] Animated itinerary showcase — globe zoom into country, then 15–30s animated day-wise itinerary transitions with transport mode icons showing movement on map (start with Norway, keep extensible)
- [ ] "Learn about country" section — historical facts, modern culture, safety tips, best/worst travel months, combinable nearby countries with budget/visa implications

### Longer-term
- [ ] Community itineraries — import/export rule data for sharing
- [ ] Real-time pricing — flights/hotels API integration
- [ ] Social layer — follow friends, see where they've been

### LLM Integration (longer-term, multi-phase)

Bring-your-own-key architecture — users supply their own API keys for OpenAI, Claude, or other providers. The app stays free with no backend.

**Phase 1 — Key management & extensible provider layer** ✅
- [x] Settings modal for adding/removing API keys (stored in localStorage, never transmitted elsewhere)
- [x] Provider abstraction — pluggable interface so adding a new LLM provider is a single adapter file
- [x] Walkthrough guide in settings explaining how to obtain and add an API key

**Phase 2 — AI-powered trip planning** ✅
- [x] Central chat modal with natural language conversation
- [x] System prompt engineering with smart defaults and structured output
- [x] Context condensation via TripBrief to save tokens
- [x] Finalization flow — extracts structured JSON plan from conversation

**Phase 3 — Rich AI itinerary response** ✅
- [x] LLM response transformation — parse structured LLM output into the existing `TripPlan` UI format
- [x] Dedicated AI itinerary modal with city grouping, transport, hotel suggestions, day-by-day cards
- [x] Hybrid mode — static rule engine as fallback when no API key is configured; LLM results when available

**Phase 4 — Enhancements** ✅
- [x] Multi-provider support — OpenAI + Claude + Gemini with provider selector and per-provider keys
- [x] Per-day cost breakdowns: flights, hotels, excursions, transfers with totals
- [x] Booking suggestions — Klook/Viator-style tour recommendations with price, duration, ratings
- [x] Save AI-generated destinations to My List (resolves against seed/catalog)
- [x] Pre-seed chat from CountryPanel with "Plan with AI" button

**Phase 5 — Token awareness & UX polish** ✅
- [x] Token usage tracking — parse from all 3 providers, accumulate per session, display in chat
- [x] Color-coded token counter (green/amber/red thresholds)
- [x] Quota-aware error messages with billing page links
- [x] Rich prompt prefill from country context (no auto-send)

**Phase 6 — Future enhancements**
- [ ] Enriched AI response schema — best/worst months, things to avoid, visa tips, combo countries, lat/lng per city, transport type per leg (enables cinematic animation for AI plans)
- [ ] Cinematic mode for AI plans — reuse ItineraryCinematic with AI-provided city coordinates and transport types
- [ ] Export AI plans as PDF / shareable link
- [ ] Voice input for chat
