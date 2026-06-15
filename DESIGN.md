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
| Tiles | **Carto Voyager** | Free vector tiles, no API key |
| Images | **Wikimedia Commons API** | Free, CORS-enabled |
| State | **Custom hooks + localStorage** | No external state library |
| Routing | **URL hash** | Zero deps, back/forward works |
| Data | **Local JSON** | Ships with app, works offline |
| Tests | **Vitest** | 169 tests across 16 files |

**Zero runtime dependencies** beyond React + MapLibre. No routing library, no state management library.

---

## Project Structure

```
src/
├── App.tsx                        # Root layout, view orchestration, state wiring
├── types.ts                       # Shared TypeScript types
├── index.css                      # Tailwind + 8 keyframe animations
│
├── hooks/
│   ├── useCountryStore.ts         # Country CRUD, My List, seed + lazy enrichment
│   ├── useTripStore.ts            # Trip group CRUD + seed merging
│   ├── useAiPlanStore.ts          # AI plan persistence (max 3 per destination)
│   ├── useChatSession.ts          # LLM chat state machine
│   ├── useCountryRule.ts          # Async per-country JSON loader + cache
│   ├── usePersistedSet.ts         # Reusable Set<string> + localStorage
│   ├── useHashView.ts             # Hash-based routing
│   ├── useBreakpoint.ts           # Reactive breakpoint (mobile/tablet/desktop)
│   └── usePanelDrag.ts            # Resizable panel drag behavior
│
├── components/
│   ├── views/
│   │   ├── TripsView.tsx          # Trip cards + progress ring (home view)
│   │   ├── CalendarView.tsx       # Month × destination heatmap grid
│   │   └── DiscoverView.tsx       # 197-country catalog browser
│   ├── country/
│   │   ├── CountryPanel.tsx       # Right-side detail panel; legacy + panelV2 inline
│   │   ├── CountryForm.tsx        # Add/edit modal form
│   │   ├── ItineraryModal.tsx     # Day-by-day itinerary modal
│   │   ├── ItineraryCinematic.tsx # Animated map fly-through
│   │   └── PlanCompareModal.tsx   # Side-by-side plan comparison
│   ├── ai/
│   │   ├── ChatModal.tsx          # LLM chat + import interface
│   │   ├── AiItineraryModal.tsx   # AI-generated itinerary display
│   │   └── SettingsModal.tsx      # LLM keys + backup/restore
│   ├── map/
│   │   └── HoverCard.tsx          # Wikipedia photo card on map hover
│   └── shared/
│       ├── Filters.tsx            # Global filter bar
│       ├── PillGroup.tsx          # Segmented pill toggle
│       ├── FilterChip.tsx         # Portal-based dropdown chip
│       ├── ExperienceDropdown.tsx # Experience tag multi-select
│       ├── HomeCountrySelector.tsx# Home country dropdown
│       ├── DevFlagPanel.tsx       # Dev-only feature flag panel
│       └── Tooltip.tsx            # Portal-based tooltip
│
├── data/
│   └── tripGroups.ts              # Trip group seeds
│
└── utils/
    ├── ai/
    │   ├── llmProvider.ts         # LLM provider abstraction (OpenAI/Claude/Gemini)
    │   ├── llmPrompts.ts          # System prompts + context condensation
    │   └── llmTransform.ts        # LLM JSON → TripPlan extraction + validation
    ├── tripPlans.ts               # Itinerary generation (rule engine + generic)
    ├── filterLogic.ts             # Pure filter functions (month/budget/experience/visited)
    ├── transport.ts               # TransportType enum, emoji map, detection
    ├── travelStyles.ts            # Travel style metadata (icons, colors)
    ├── googleMapsRoute.ts         # Google Maps Directions URL builder
    ├── pdfExport.ts               # Print-to-PDF via hidden iframe
    ├── planDiff.ts                # Plan summary + diff labels
    ├── importParser.ts            # Multi-strategy text/link plan parser
    ├── wikiImages.ts              # Wikimedia Commons image fetch + cache
    ├── backup.ts                  # Full backup/restore, CSV/XLSX export/import
    ├── months.ts                  # Month constants
    ├── lsKeys.ts                  # Centralized localStorage key constants
    ├── featureFlags.ts            # Two-tier feature gate (free + paid)
    └── storage.ts                 # localStorage read/write helpers

data/
├── rules/
│   ├── index.json                 # Manifest: 198 itinerary-backed destinations
│   └── {country}.json             # 198 lazy-loaded per-country rule files
├── worldCatalog.json              # 197-country sovereign catalog for Discover
└── wishlist.md                    # Product backlog / scratchpad
```

---

## Key Design Patterns

### Hooks own state domains

| Hook | Domain |
|---|---|
| `useCountryStore` | Country CRUD, My List, favorites, visited |
| `useTripStore` | Trip group management |
| `useAiPlanStore` | AI plan persistence (save/replace/compare) |
| `useChatSession` | LLM chat state machine (messages, finalize, tokens) |
| `useCountryRule` | Lazy-loading and caching consolidated per-country rule JSON |
| `usePersistedSet` | Reusable `Set<string>` + localStorage (DRY) |
| `useHashView` | URL hash routing |
| `useBreakpoint` | Responsive breakpoint state |
| `usePanelDrag` | Resizable country panel behavior |

No Redux, no context providers. `App.tsx` calls hooks and passes results as props.

### Seed + Overrides

User edits stored as full objects in `tp_customs`. On load, customs override seed entries by name; `tp_deleted` tombstones removed seeds. Applied to both countries and trip groups.

### Rule engine

```
useCountryRule(name) → import.meta.glob → data/rules/{name}.json (lazy, cached)
generateTripPlan(country, style, cities, days, rule)
  ├─ rule found → per-day activities, costs, hotels, routes from rule data
  └─ no rule   → generic algorithm fallback for resilience/custom entries
```

All 198 manifest destinations currently ship with offline rule JSON coverage, but the generic fallback remains as a safety net.

### Feature flags

Two-tier gating lives in `src/utils/featureFlags.ts`. Paid features require both `paidFeatures=true` and the individual flag to be enabled.

| Flag | Default | Tier | Description |
|---|---|---|---|
| `paidFeatures` | `false` | system | Master gate for premium features |
| `llmPlanning` | `true` | paid | AI trip planning flow |
| `pdfExport` | `true` | paid | PDF export from itinerary views |
| `searchableHomeCountry` | `false` | free | Searchable home-country picker |
| `panelV2` | `false` | free | Refreshed country detail panel UI |

### Portal pattern

Filter dropdowns, tooltips, and experience picker use `createPortal` — the filter bar has `overflow-x: auto` which clips absolute children.

### Cinematic map

Reuses the main MapLibre instance via `mainMapRef`. Disables user interaction on mount, adds GeoJSON route sources, animates fly-through with rAF, restores on close.

---

## Data Model

### Country data tiers

| Tier | Source | Count | Content |
|---|---|---|---|
| **Catalog** | `data/worldCatalog.json` | 197 | `{ name, lat, lng, region }` — Discover view |
| **Manifest** | `data/rules/index.json` | 198 | Browse metadata + `inSeed`, `hasItinerary`, `recDays`, `maxDays` |
| **Rule JSON** | `data/rules/{name}.json` | 198 | Consolidated country data + day-by-day itinerary rules |

The Discover catalog remains a 197-country sovereign browse list. The manifest expands coverage to 198 itinerary-backed destinations, and curated starter destinations are identified via `inSeed` for first-run My List population.

### Core types

```ts
type Country = {
  name: string;
  lat: number; lng: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;              // "₹3L–₹5L"
  experiences: string[];
  avoid?: string[];
  combo?: string[];
  landmark?: string;           // Wikipedia title for hover image
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;
};

type TripGroupDef = {
  main: string;
  addOns: string[];
  region: Region;
};

type LLMTripPlanResult = {
  destinationName: string;
  originCountry: string;
  travelers: number;
  durationDays: number;
  budgetLevel: "budget" | "mid-range" | "luxury";
  assumptions: string[];
  cities: LLMCityInfo[];
  meta: LLMDestinationMeta;
  plan: LLMTripPlan;
};
```

---

## Persistence

All keys in `src/utils/lsKeys.ts` — never hardcode strings.

| Key | Content |
|---|---|
| `tp_my_list` | Country names in user's list |
| `tp_visited` | Visited country names |
| `tp_favorites` | Favorited country names |
| `tp_customs` | User-added/edited Country objects |
| `tp_deleted` | Tombstoned seed country names |
| `tp_home_country` | Departure country (default: "India") |
| `tp_trip_customs` | User-created/edited trip groups |
| `tp_trip_deleted` | Tombstoned seed trip groups |
| `tp_features` | Feature flag overrides |
| `tp_llm_keys` | LLM API keys per provider |
| `tp_llm_provider` | Active LLM provider |
| `tp_ai_plans` | Saved AI plans (max 3 per destination) |
| `tp_last_backup` | ISO timestamp of last backup |
| `tp_backup_frequency` | Reminder cadence: daily / weekly / never |
| `tp_backup_schedule` | Backup reminder schedule metadata |

---

## Code Flows

### Offline plan generation
```
CountryPanel → generateTripPlan(country, style, cities, days, rule)
  → rule engine or generic fallback
  → TripPlan { duration, costPerPerson, days[], note }
  → PlanPreview → Cinematic / Itinerary / PDF / 🗺️ Route
```

### AI plan flow
```
CountryPanel "Plan with AI" → ChatModal (pre-filled prompt)
  → LLM conversation → "Finish & Generate" → extract JSON
  → AiItineraryModal → save/replace comparison
  → useAiPlanStore → appears in CountryPanel dropdown
```

### Import flow
```
ChatModal ImportView → paste text or share link
  → parseImportedText() (JSON → structured → chat extraction)
  → preview + prompt suggestions
  → AiItineraryModal → save/replace
```

---

## Validation

```bash
npx tsc --noEmit    # type check
npm test            # vitest (169 tests, 16 files)
npm run build       # tsc + vite build
```

---

## Tailwind Conventions

- Text: labels `text-[10px]`, body `text-[11px]`/`text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card `space-y-3.5`
- Custom keyframes live in `src/index.css` (currently 8), not Tailwind config
