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
- **Plan comparison** — side-by-side modal comparing any two plans (default or AI) with duration, cost, cities, and day-by-day diff
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
| 📋 Itinerary | All countries (offline + AI) | Scrollable modal with day cards, activities, costs, transport |
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
- **Save AI plans** — persist up to 3 AI-generated itineraries per destination in localStorage with compare-and-replace flow
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

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, static output |
| UI | **React 18 + TypeScript** | Component model + type safety |
| Styling | **Tailwind CSS** | Utility-first, zero runtime |
| Map | **MapLibre GL JS** | Free OSM fork, no token |
| Tiles | **Carto Voyager** | Free vector tiles, no API key, reliable CORS |
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
│   └── useAiPlanStore.ts        # AI plan persistence (save/replace/compare, max 3 per dest)
├── components/
│   ├── views/                   # Top-level view components
│   │   ├── TripsView.tsx        # Trip cards + inline editor (home view)
│   │   ├── CalendarView.tsx     # Month heatmap grid
│   │   ├── DiscoverView.tsx     # 197-country catalog browser
│   │   └── MapView.tsx          # MapLibre map (hidden, used for Cinematic)
│   ├── country/                 # Country-specific components
│   │   ├── CountryPanel.tsx     # Right-side detail + multi-plan selector + itinerary planner
│   │   ├── CountryForm.tsx      # Add/edit modal form
│   │   ├── ItineraryCinematic.tsx # Full-screen animated journey
│   │   ├── ItineraryModal.tsx   # Scrollable itinerary modal
│   │   └── PlanCompareModal.tsx # Side-by-side plan comparison modal
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
│       ├── DevFlagPanel.tsx     # Dev-only (localhost) feature flag tree panel
│       └── Tooltip.tsx          # Portal-based info tooltip
├── data/
│   ├── itineraryRules.ts        # Per-country/city/day rule data
│   └── tripGroups.ts            # Trip group seeds (addOns derived from combo at runtime)
├── utils/
│   ├── ai/                      # LLM integration utilities
│   │   ├── llmProvider.ts       # Provider abstraction (OpenAI, extensible)
│   │   ├── llmPrompts.ts        # System prompts, TripBrief, context condensation
│   │   └── llmTransform.ts      # LLM JSON → TripPlan extraction + validation
│   ├── tripPlans.ts             # Itinerary generation (rule engine + generic)
│   ├── travelStyles.ts          # STYLE_META (icons, colors, classes)
│   ├── filterLogic.ts           # Pure filter functions
│   ├── transport.ts             # TransportType, emoji, detection
│   ├── pdfExport.ts             # Print-to-PDF via hidden iframe (zero deps)
│   ├── planDiff.ts              # Plan summary + diff labels
│   ├── wikiImages.ts            # Wikipedia image fetch + cache
│   ├── months.ts                # Month constants
│   ├── lsKeys.ts                # Centralized localStorage key constants (DRY)
│   ├── featureFlags.ts          # Two-tier feature gate (free + paid)
│   └── storage.ts               # localStorage read/write helpers
├── App.tsx                      # Root layout + view orchestration
├── types.ts                     # Shared TypeScript types
└── index.css                    # Tailwind + keyframe animations
data/
├── countries.json               # 43 curated seed destinations
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

| Priority | Feature | Category | Description |
|----------|---------|----------|-------------|
| 🔴 P0 | More rule-based countries | Content | Thailand, Japan, New Zealand, Iceland — per-day itineraries with costs |
| 🔴 P0 | Enriched AI response schema | AI | lat/lng per city, transport type per leg — enables cinematic for AI plans |
| 🟠 P1 | Day-level detail expansion | UX | Tap a day row for full tips, map coords, booking links |
| 🟠 P1 | Budget currency toggle | UX | Convert ₹ to USD / EUR / AUD |
| 🟠 P1 | Pre-finalization cost estimate | AI | Warn user about token cost before generating plan |
| 🟡 P2 | Multi-country trip builder | Core | String countries into a single trip with total cost/days |
| 🟡 P2 | First run experience | UX | Onboarding walkthrough for new users |
| 🟡 P2 | Calendar sync | Export | Export itinerary as `.ics` file |
| 🟡 P2 | Provider cost reference table | AI | Show token pricing per provider in Settings |
| 🟢 P3 | Visited stats page | Analytics | Continents, total days, spend, heatmap timeline |
| 🟢 P3 | PWA / offline mode | Infra | Installable, works without internet |
| 🟢 P3 | Seasonal flight cost hints | Data | Rough fare ranges from public sources |
| 🟢 P3 | "Learn about country" section | Content | Historical facts, culture, safety tips, visa implications |
| 🟢 P3 | Voice input for chat | AI | Speak trip requests instead of typing |
| 🟢 P3 | Drag-and-drop trip reorder | UX | Reorder trip group add-ons |
| 🔵 P4 | Community itineraries | Social | Import/export rule data for sharing |
| 🔵 P4 | Real-time pricing | Integration | Flights/hotels API integration |
| 🔵 P4 | Social layer | Social | Follow friends, see where they've been |
