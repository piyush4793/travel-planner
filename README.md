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

**Two viewing modes:**
| Mode | Availability | Description |
|---|---|---|
| 🎬 Cinematic | Rule-based only | Full-screen animated journey with map flyovers and city photo slideshows |
| 📋 Itinerary | All countries | Scrollable modal with day cards, activities, costs, transport |

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
│   ├── useCountryStore.ts     # Country CRUD, My List, seed+overrides merging
│   ├── useTripStore.ts        # Trip group CRUD + seed merging
│   ├── usePersistedSet.ts     # DRY Set<string> + localStorage persistence
│   ├── useHashView.ts         # Hash-based routing (no router library)
│   └── usePanelDrag.ts        # Resizable panel drag behavior
├── components/
│   ├── MapView.tsx            # MapLibre map, markers, hover card
│   ├── CalendarView.tsx       # Month heatmap grid
│   ├── ListView.tsx           # Paginated sortable table
│   ├── TripsView.tsx          # Trip cards + inline editor
│   ├── DiscoverView.tsx       # 197-country catalog browser
│   ├── CountryPanel.tsx       # Right-side detail + itinerary planner
│   ├── CountryForm.tsx        # Add/edit modal form
│   ├── Filters.tsx            # Global filter bar
│   ├── PillGroup.tsx          # Shared segmented pill toggle
│   ├── HomeCountrySelector.tsx # Home country dropdown
│   ├── ItineraryCinematic.tsx # Full-screen animated journey
│   ├── ItineraryModal.tsx     # Scrollable itinerary modal
│   ├── FilterChip.tsx         # Reusable portal dropdown chip
│   ├── ExperienceDropdown.tsx # Experience tag multi-select
│   ├── HoverCard.tsx          # Wikipedia photo card on map hover
│   └── Tooltip.tsx            # Portal-based info tooltip
├── data/
│   ├── itineraryRules.ts      # Per-country/city/day rule data
│   └── tripGroups.ts          # Trip group definitions + merge logic
├── utils/
│   ├── tripPlans.ts           # Itinerary generation (rule engine + generic)
│   ├── travelStyles.ts        # STYLE_META (icons, colors, classes)
│   ├── filterLogic.ts         # Pure filter functions
│   ├── transport.ts           # TransportType, emoji, detection
│   ├── wikiImages.ts          # Wikipedia image fetch + cache
│   ├── months.ts              # Month constants
│   ├── featureFlags.ts        # Feature gate system (tp_features localStorage)
│   └── storage.ts             # localStorage read/write helpers
├── App.tsx                    # Root layout + view orchestration
├── types.ts                   # Shared TypeScript types
└── index.css                  # Tailwind + keyframe animations
data/
├── countries.json             # 44 curated seed destinations
└── worldCatalog.json          # 197 world countries (name, lat, lng, region)
```

### Key Design Patterns

**Custom hooks for state domains (SRP)**
State is organized into domain-specific hooks rather than a monolithic App component:
- `useCountryStore` — all country data, CRUD, My List, favorites, visited
- `useTripStore` — trip group management
- `usePersistedSet` — reusable Set<string> with auto-persistence (DRY)
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
| `tp_features` | Feature flag overrides (`{ searchableHomeCountry: true }`) |

---

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
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

### Medium-term
- [ ] Multi-country trip builder — string countries into a single trip with total cost/days
- [ ] Calendar sync — export itinerary as `.ics` file
- [ ] Seasonal flight cost hints — rough fare ranges from public sources
- [ ] Visited stats page — continents, total days, spend, heatmap timeline
- [ ] PWA / offline mode — installable, works without internet
- [ ] Bulk add to My List from Discover (select multiple + add)

### Longer-term
- [ ] Community itineraries — import/export rule data for sharing
- [ ] AI itinerary refinement — feed plans to an LLM for follow-up questions
- [ ] Real-time pricing — flights/hotels API integration
- [ ] Social layer — follow friends, see where they've been
