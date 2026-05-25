# Design & Architecture

Technical documentation for Travel Planner — code structure, design patterns, data model, and implementation details.

For features, setup, and user-facing docs, see [README.md](./README.md).

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

## Project Structure

```
src/
├── hooks/
│   ├── useCountryStore.ts       # Country CRUD, My List, seed+overrides merging
│   ├── useTripStore.ts          # Trip group CRUD + seed merging
│   ├── usePersistedSet.ts       # DRY Set<string> + localStorage persistence
│   ├── useHashView.ts           # Hash-based routing (no router library)
│   ├── usePanelDrag.ts          # Resizable panel drag behavior
│   ├── useBreakpoint.ts         # Reactive breakpoint hook (mobile/tablet/desktop)
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
│   ├── tripPlans.ts             # Itinerary generation (rule engine + generic) + city extraction utils
│   ├── travelStyles.ts          # STYLE_META (icons, colors, classes)
│   ├── filterLogic.ts           # Pure filter functions
│   ├── transport.ts             # TransportType, emoji, detection
│   ├── pdfExport.ts             # Print-to-PDF via hidden iframe (zero deps)
│   ├── planDiff.ts              # Plan summary + diff labels
│   ├── importParser.ts          # Multi-strategy text/link parser for importing plans
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

---

## Key Design Patterns

### Custom hooks for state domains (SRP)
State is organized into domain-specific hooks rather than a monolithic App component:
- `useCountryStore` — all country data, CRUD, My List, favorites, visited
- `useTripStore` — trip group management
- `useAiPlanStore` — AI-generated plan persistence (save, replace, compare)
- `usePersistedSet` — reusable Set<string> with auto-persistence (DRY)
- `useChatSession` — AI chat state machine (messages, finalize, clear, token accumulation)
- `useHashView` — URL routing

### Seed + Overrides pattern
User edits stored as full objects in `tp_customs`. On load, seed entries are overridden by matching customs; `tp_deleted` tombstones seed entries. New additions are appended. Applied to both countries and trip groups.

### Rule engine flow
```
generateTripPlan() in tripPlans.ts
  └─ getRuledItinerary()  ← checks ITINERARY_RULES[country.name]
       ├─ found → per-day plan from rule data
       └─ not found → generic algorithm from experience tags
```

### Portal pattern
Filter dropdowns, tooltips, and experience picker use `createPortal` because the filter bar has `overflow-x: auto` which clips absolute children.

### Cinematic map
Reuses the main MapLibre instance via `mainMapRef` (no second map). Disables user interaction on mount, adds GeoJSON route sources, restores on close.

### Smart city selection
When user sets fewer days than total cities, algorithm sorts cities by `recDays` (importance) and greedily fills the day budget, dropping lowest-priority cities first. Preserves original route order.

### Import parser (multi-strategy)
```
parseImportedText()
  ├─ Strategy 1: JSON (our LLM schema)
  ├─ Strategy 2: Structured day-by-day text parsing
  └─ Strategy 3: Chat conversation extraction (find densest "Day N" section)
```
City name cleaning strips prefixes ("ARRIVE IN", "RETURN"). Noise filtering removes "Stay:", "Activities:", "Time required:" lines. Destination derived from context patterns ("trip to Norway").

---

## Data Model

### Two-tier country system

**Tier 1: World Catalog** (`data/worldCatalog.json`)
197 countries with basic data: `{ name, lat, lng, region }`. Regions: Asia, Europe, Middle East, Africa, Americas, Oceania. Used by the Discover view.

**Tier 2: Rich Seed** (`data/countries.json`)
43 curated countries with full data. Pre-added to user's My List.

4 special non-sovereign destinations exist in seed only: Antarctica (standalone), Scotland/Hawaii/Dubai merged into UK/US/UAE as cities.

### Types

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
  combo?: string[];           // max 2 per country
  landmark?: string;          // Wikipedia title for hover image
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;             // personal notes
};

type TripGroupDef = {
  main: string;
  addOns: string[];           // derived from combo at runtime for seeds
  region: Region;
};
```

---

## Persistence (localStorage)

All keys centralized in `src/utils/lsKeys.ts`.

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
| `tp_features` | Feature flag overrides |
| `tp_llm_keys` | LLM API keys — stored locally, never sent to any server except the provider |
| `tp_llm_provider` | Active LLM provider (`"openai"`, `"claude"`, or `"gemini"`) |
| `tp_ai_plans` | Saved AI-generated itineraries (`Record<destinationKey, SavedAiPlan[]>`), max 3 per destination |

---

## Code Flows

### Plan generation flow
```
User clicks Generate (CountryPanel)
  → generateTripPlan(country, "custom", selectedCities, customDays)
  → getRuledItinerary() checks ITINERARY_RULES
  → Returns TripPlan { duration, costPerPerson, days[], note }
  → PlanPreview renders summary + action buttons (Cinematic / Itinerary / PDF)
```

### AI plan flow
```
User clicks "Plan with AI" (CountryPanel)
  → Opens ChatModal with pre-filled prompt (budget, months, cities, experiences)
  → User chats with LLM → "Finish & Generate" extracts JSON
  → AiItineraryModal shows plan with save/replace comparison
  → Saved to useAiPlanStore → appears in CountryPanel dropdown selector
```

### Import plan flow
```
User pastes text or shares link (ChatModal ImportView)
  → parseImportedText() tries 3 strategies (JSON → structured → chat)
  → Preview shown with warnings + prompt suggestions
  → "Review & Save" → opens AiItineraryModal for save/replace flow
```

### Multi-plan view flow
```
CountryPanel builds planOptions[] (default + saved AI plans)
  → Dropdown selector switches active plan
  → PlanPreview shows for whichever plan is active
  → Per-plan cinematic check (needs ≥2 matching city coordinates)
  → "Compare" opens PlanCompareModal (side-by-side, independent scroll)
```

---

## Validation

```bash
npx tsc --noEmit    # type check
npm test            # run all tests (vitest, 160 tests across 15 files)
npm run build       # production build (tsc + vite)
```

All three must pass before committing. No test framework beyond Vitest.

---

## Tailwind Conventions

- Text sizes: section labels `text-[10px]`, body `text-[11px]` or `text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card gaps `space-y-3.5`
- Custom keyframes go in `src/index.css`, not Tailwind config

---

## Rule Countries

| Country | Cities |
|---|---|
| Vietnam | Ho Chi Minh City, Da Nang, Hoi An, Hanoi, Ninh Binh, Ha Long Bay, Sapa |
| Norway | Oslo, Bergen, Flåm, Voss, Alesund, Geirangerfjord, Tromsø, Gudvangen, Loen, Trollstigen, Lofoten |
