# Travel Planner

A personal, map-based travel planner pre-loaded with 50+ destinations. Filter by season, budget, travel style, and experience type — then explore day-by-day itineraries with real costs, hotel picks, and travel connections. Built entirely free with no paid APIs or backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **Map** | Interactive world map with color-coded pins. Click any pin to open the detail panel. Combo destinations highlight in purple when a country is selected. |
| **Calendar** | Heatmap grid — rows are destinations, columns are months. Emerald = best time to visit, red = avoid, blue column = current month. |
| **List** | Paginated table with search, sort by name / budget / visited, and inline visited/favorite toggles. Favorites always sort to the top. |
| **Trips** | Shows all countries organized into optimal trip combinations (max 3 per trip). Each trip has a main destination plus add-on countries. Inline editing, create, and delete for trip groups. Summary shows total trips needed, combo vs solo breakdown, and visited progress. |
| **Discover** | Browse all 197 world countries. Filter by region and list status (in my list / not added). Add countries to your list or remove them. |

View selection persists in the URL hash (`#map`, `#calendar`, `#list`, `#trips`, `#discover`) — refreshing the page returns you to the same view.

---

### My List & Discover
- **197 countries** available in the world catalog, organized by region
- **44 curated seed countries** with rich data (budget, best months, experiences, cities) are pre-added to your list
- Only countries in **My List** appear on Map, Calendar, List, and Trips views
- Add any country from the Discover tab — new additions start with basic data and can be enriched via the edit form
- Remove countries from your list without losing custom data — re-add anytime
- **Favorites always sort to the top** across all views for quick access

---

### Filters (always visible, top bar)
All filters combine with AND logic:

| Filter | Behaviour |
|---|---|
| **Month** | Multi-select — shows countries with best-time overlap with any selected month |
| **Style** | Multi-select — Touch & Go / Explorer / Month Long |
| **Budget** | ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+) |
| **Experiences** | Multi-select tag picker — AND logic (country must have all selected tags) |
| **Bucket list / Visited** | Show only unvisited or only visited destinations |

---

### Country Detail Panel
Slides in from the right when a destination is selected. Contains:
- Budget estimate from your home country (selectable — see header)
- Travel style recommendation badges
- Best months and months to avoid
- Experience tags (click any tag to instantly filter)
- City breakdown — each city with its own seasons and highlights
- Stopover tips for hub airports (Singapore, Dubai, Istanbul, etc.)
- "Watch out for" notes and "Combine with" suggestions (highlights linked destinations in purple on the map)
- Useful links (e.g. booking links, visa sites)
- Mark as visited / Add to favorites / Edit / Delete
- Personal notes textarea (auto-saved)

---

### Day-by-Day Itinerary Planner
Accessible inside the Country Panel via "Plan your trip". For rule-based countries, selecting a travel style auto-selects the default cities for that style — cities can then be toggled individually.

**Travel styles:**
| Style | Days | Description |
|---|---|---|
| 🏃 **Touch & Go** | 3–4 days | Quick stopover, cover key highlights |
| 🔭 **Explorer** | 7–12 days | Full proper holiday |
| 🌿 **Month Long** | 30 days | Slow travel, live like a local |
| ✏️ **Custom** | 1–90 days | Set any duration |

**Rule-based engine (countries with detailed data):**

Two countries currently have real per-day itineraries with actual costs, hotel recommendations, and city-by-city routing:

**Vietnam** — built from a personal 15-day trip (Dec 2023):
- Ho Chi Minh City → Da Nang → Hoi An → Hanoi → Ninh Binh → Ha Long Bay → Sapa
- Real costs: Cu Chi + Mekong ₹4–4.5k pp, Bana Hills ₹3.5k pp, Fansipan ₹3k pp
- Hotel picks at each city with budget range
- Transport connections: internal flights, overnight trains, bus routes

**Norway** — built from research + personal trip planning:
- Oslo → Bergen → Flåm → Voss → Ålesund → Geirangerfjord → Tromsø
- Flåm Railway ₹8,800 pp RT, Nærøyfjord UNESCO ferry ₹5,000–6,300 pp, Geirangerfjord cruise ₹7,500–12,500 pp
- Northern Lights guided tours ₹19,000–26,000 pp, dog sledding ₹32,000–36,000 pp, snowmobile ₹16,000–21,000 pp
- Day 2 Alesund: self-drive loop — Eagle Road → Dalsnibba → Flydalsjuvet → Geiranger → Hellesylt ferry back
- Season guidance: Feb–Mar for Northern Lights + stable snow, May–Sept for fjords and roads
- Stalheim Gorge, Trolltunga and Voss adventure sports (paragliding, rafting, skydiving) included

**After selecting a style, the sidebar shows a compact plan summary (duration, cost, city route) and two action buttons — keeping the panel uncluttered:**

| Mode | When available | What it does |
|---|---|---|
| **🎬 Cinematic** | Rule-based countries only | Full-screen animated journey |
| **📋 Itinerary** | All countries | Scrollable modal with full day-by-day details |

---

### 📋 Itinerary Modal

Opens as a centered full-screen overlay. Shows:
- Dark header with country, style, duration, cost, and city route with transport emoji separators
- City sections with day cards — each card shows the day label, theme badge, activities (name and cost split visually), and hotel chips
- Transport separators between cities with method, route, and cost
- Practical notes footer (SIM, apps, connections)
- Click backdrop to close

---

### Cinematic Itinerary (🎬)

Available for rule-based countries (Norway, Vietnam). Opens a full-screen animated experience:

1. **World overview** — on open, the complete journey route (home → all cities → home) draws instantly on the world map; combo/linked destinations get purple glow dots; trip summary and duration shown while city photos are pre-fetched in the background
2. **Departure arc** — after the overview hold, map zooms into the departure city (e.g. New Delhi for India, London for UK), then an ✈️ emoji rides a bezier arc to the first destination city
3. **City-by-city transit** — for each leg:
   - Previous city dot stays lit (blue); next city dot activates with a glow ring
   - Route line draws itself with a transport emoji (✈️ 🚂 ⛴️ 🚌 🚡 🚗) riding in real time; flights use a bezier arc, ground transport uses a straight line
   - Camera flies to each city at zoom 9.5
4. **City photo slideshow** — while stopped at each city:
   - A **curated photo card** (rounded, inset from the map edges) fades in over the transparent left area
   - Multiple Wikipedia photos per city (from `cityImages` in `itineraryRules.ts`) cross-fade as a slideshow every 3.8s
   - Slide dots (top-right) and day-progress pills (top-left) track position
   - City name + day theme captioned over a gradient at the card bottom
5. **Activities stagger in** on the right panel one by one (520ms apart); hotel chips appear after all activities
6. **Return arc** — after all cities, another ✈️ bezier arc flies back to home, then "Welcome back!" screen
7. **Pause / Resume** at any point; close button exits and restores the original map camera
8. **Resizable panel** — drag the left edge of the right panel to any width between 300px and 50% of the screen
9. **Panel auto-hide** — the Country Panel slides away when cinematic mode opens and slides back in automatically when it closes

**Technical implementation:**
- Full-screen `createPortal` overlay (z-200); **left side is transparent** — the main MapLibre instance shows through. No second map instance.
- `MapView` exposes the map via `onMapReady` → stored in `mainMapRef` in `App` → passed as prop to `ItineraryCinematic`
- On mount: user interaction disabled (`dragPan`, `scrollZoom`, etc.) and original camera saved; restored on close
- Two GeoJSON sources (`cinematic-route-done` / `cinematic-route-current`) added to the main map at open, removed at close
- `flyAndWait` uses MapLibre's `moveend` event (not a fixed sleep) for precise camera sequencing
- City photos pre-fetched **sequentially** at startup (avoids Wikipedia rate limits); fetching happens during departure arc so no visible delay
- Photos upscaled to 1200px via URL rewrite before display
- `cityImages?: Record<string, string[]>` field on `CountryRule` — each value is an array of Wikipedia article titles to fetch in order
- `HOME_COORDS` map: 16 supported home countries — each entry is the main international airport/hub city (e.g. IGI Delhi for India, JFK for USA, Heathrow for UK), not the geographic centre
- `HOME_CITY` map: display name of the departure city shown in status messages and the route trail

**Adding cinematic support to a new country:** add to `ITINERARY_RULES` with a `cityImages` field mapping city names to Wikipedia article title arrays. The engine reads `connections` for transport types and `country.cities` for coordinates automatically.

---

### Home Country Selection
The "📍 India" button in the header lets you set your departure country. This updates the "from X" label on every destination's budget estimate. Persists in localStorage.

Supported: India, United States, United Kingdom, Germany, France, Australia, Canada, Singapore, UAE, Japan, South Korea, Netherlands, Italy, Spain, Brazil, South Africa.

---

### Map Markers
- **Blue** — unvisited destination
- **Green** — visited destination
- **Purple** — combo/linked destination (highlighted when a country panel is open)
- Hover over any marker to see a Wikipedia photo card with the budget estimate
- No decorative route lines are drawn in the regular map view — the map stays clean

---

### CRUD
- Add new destinations via a full form (name, coordinates, months, budget, experiences, travel style, etc.)
- Edit any existing destination
- Delete destinations (seed data is tombstoned; custom additions are removed)
- All changes persist across sessions via localStorage

---

### Persistence (localStorage)
| Key | What is stored |
|---|---|
| `tp_visited` | Set of visited country names |
| `tp_favorites` | Set of favorited country names |
| `tp_customs` | Added/edited countries |
| `tp_deleted` | Tombstone list for deleted seed entries |
| `tp_home_country` | Selected departure country (default: "India") |
| `tp_my_list` | Country names in the user's active list (initialized from seed + customs) |
| `tp_trip_customs` | User-edited/created trip groups |
| `tp_trip_deleted` | Tombstone list for deleted seed trip groups |

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, static output, zero config |
| UI | **React 18 + TypeScript** | Component model + full type safety |
| Styling | **Tailwind CSS** | Utility-first, zero runtime |
| Map | **MapLibre GL JS** | Free open-source Mapbox fork, no token required |
| Tiles | **OpenFreeMap** (`liberty` style) | Free OSM vector tiles, no API key |
| Images | **Wikimedia Commons search API** | Free, CORS-enabled, no key needed — searches by keyword for actual photos (more reliable than article summaries) |
| State | **React hooks + localStorage** | No external state library needed |
| Routing | **URL hash** (`#map`, `#calendar`, `#list`) | Zero dependencies, browser back/forward works |
| Data | **Local JSON** in `/data` | Ships with app, works offline, easy to edit |

---

## Project Structure

```
travel-planner/
├── data/
│   └── countries.json              # 50+ destination seed dataset
├── src/
│   ├── data/
│   │   └── itineraryRules.ts       # Rule-based per-city/per-day itinerary data
│   ├── components/
│   │   ├── MapView.tsx             # MapLibre map, markers, hover card
│   │   ├── HoverCard.tsx           # Wikipedia photo card on map hover
│   │   ├── CalendarView.tsx        # Month heatmap table
│   │   ├── ListView.tsx            # Paginated sortable table
│   │   ├── Filters.tsx             # Top filter bar
│   │   ├── FilterChip.tsx          # Reusable portal dropdown chip
│   │   ├── ExperienceDropdown.tsx  # Experience tag multi-select
│   │   ├── CountryPanel.tsx        # Right-side detail panel + itinerary card
│   │   ├── CountryForm.tsx         # Add/edit modal form
│   │   └── Tooltip.tsx             # Portal-based info tooltip
│   ├── hooks/
│   │   └── usePanelDrag.ts         # Shared hook for resizable right-side panels
│   ├── utils/
│   │   ├── tripPlans.ts            # Itinerary generation (rule engine + generic fallback)
│   │   ├── travelStyles.ts         # STYLE_META (icons, colors, form button classes)
│   │   ├── filterLogic.ts          # Pure filter functions
│   │   ├── months.ts               # MONTHS array + expandMonth helper
│   │   ├── transport.ts            # TransportType, TRANSPORT_EMOJI, detectTransport
│   │   ├── wikiImages.ts           # Wikipedia image fetch + module-level cache
│   │   └── storage.ts              # localStorage helpers
│   ├── App.tsx                     # Root — all global state, routing, layout
│   ├── types.ts                    # Country, TravelStyle, VisitedFilter, CityEntry
│   ├── main.tsx
│   └── index.css                   # Tailwind + marker + itinerary animation keyframes
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Architecture

### Rule-based Itinerary Engine
`generateTripPlan()` in `tripPlans.ts` first looks up the country in `ITINERARY_RULES`. If a rule exists, it:
1. Selects cities based on travel style defaults (or the user's city selection)
2. Allocates days per city proportionally to `recDays`, clamped to `[minDays, maxDays]`
3. Picks per-day activity plans from the rule data, including costs, hotel chips, and themes
4. Builds transport connection notes and practical tips into the footer

If no rule exists, it falls back to a generic algorithm that uses the country's experience tags and landmark to synthesise a reasonable itinerary.

**Adding a new country to the rule engine:** Add an entry to `ITINERARY_RULES` in `src/data/itineraryRules.ts` following the existing Vietnam / Norway structure. Use the exact city names from `data/countries.json`.

### URL Routing
No router library — just `window.location.hash` and the native `popstate` event:
- View change → `window.history.pushState(null, "", "#view")`
- Browser back/forward → `popstate` listener → read hash → update React state
- Page refresh → `useState(getViewFromHash)` initialiser reads hash before first render

### Seed + Overrides Pattern
User edits are stored as full `Country` objects in `tp_customs`. On load, seed entries are overridden by matching custom entries; tombstoned entries (in `tp_deleted`) are filtered out. New additions are appended. The seed can be updated without losing user data.

---

## Data Model

```ts
type Country = {
  name: string;
  lat: number; lng: number;
  bestMonths: string[];
  worstMonths?: string[];
  budget: string;               // e.g. "₹3L–₹5L" — from selected home country
  experiences: string[];
  avoid?: string[];
  combo?: string[];
  landmark?: string;            // Wikipedia title for hover card image
  travelStyle?: TravelStyle[];
  cities?: CityEntry[];
  stopoverNote?: string;
  links?: { label: string; url: string }[];
  notes?: string;               // personal free-text notes
};

type DayEntry = {
  label: string;                // "Day 3 — Da Nang"
  activities: string[];
  theme?: string;               // "Bana Hills Full Day" — shown as badge
  hotels?: string[];            // hotel chips at bottom of day card
};

type TripPlan = {
  duration: string;
  costPerPerson: string;
  days: DayEntry[];
  note: string;                 // transport connections + tips footer
  warning?: string;
};
```

---

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output → dist/
npm run preview  # preview the build locally
```

Deploy the `dist/` folder to Netlify, Vercel, or GitHub Pages (free tier — no server needed).

---

## Design Notes

**Portal pattern** — filter dropdowns, the experience picker, and tooltips all use `createPortal(content, document.body)` with `position: fixed` coordinates. Necessary because the filter bar uses `overflow-x: auto`, which per CSS spec clips `overflow-y` children.

**Stale closure fix** — MapLibre marker click handlers capture `onSelect` at creation time. A `useRef` keeps the latest callback without triggering marker recreation.

**Wikimedia Commons images** — fetched via the Commons search API (`commons.wikimedia.org/w/api.php?generator=search&gsrnamespace=6`), which searches the File namespace by keyword and returns actual photos rather than article thumbnails. Results filtered to JPEG/PNG ≥ 600px; thumbnail at 1200px requested via `iiurlwidth`. Cached in a module-level `Map` so repeated hovers don't re-fetch. `cityImages` in `itineraryRules.ts` stores descriptive photo search keywords per city (e.g. `"Bryggen Wharf Bergen Norway colorful"`).

**Itinerary animations** — `itinerary-card` uses a CSS `@keyframes` entrance animation. Each `itinerary-day` row has the same animation with an `animation-delay` set via inline style (`i * 75ms`), creating a stagger effect. The `TripPlanCard` is keyed by `${style}-${cities}-${days}` so switching any input remounts the card and replays all animations.

**Shared utilities** — `src/utils/transport.ts` exports `TransportType`, `TRANSPORT_EMOJI`, and `detectTransport()` used by both `ItineraryCinematic` and `ItineraryModal`. `src/hooks/usePanelDrag.ts` provides the resizable panel behaviour shared by `CountryPanel` and `ItineraryCinematic`.

**Trips view grouping** — `TripsView` uses curated trip groups from `src/data/tripGroups.ts` (max 3 countries per trip). Each group has a main destination and up to 2 add-on countries. All seed countries are assigned to exactly one trip. Countries added by the user that aren't in any curated group become solo trips automatically.

---

## Future Scope

### Near-term
- [ ] **More rule-based countries** — Thailand, Japan, New Zealand, Iceland (encode real trip data as it's gathered)
- [x] **Cinematic itinerary** — animated map + day card experience (Norway + Vietnam, extensible)
- [ ] **Itinerary export** — PDF / shareable link for a planned trip
- [ ] **Day-level detail expansion** — tap a day row to expand with full tip text, map coordinates, and booking links
- [ ] **Budget currency toggle** — convert ₹ estimates to USD / EUR / AUD using approximate exchange rates

### Medium-term
- [ ] **Trip builder** — string multiple countries into a single multi-country trip with total cost and day count
- [ ] **Calendar sync** — export the planned itinerary as an `.ics` file (Google Calendar / Apple Calendar)
- [ ] **Seasonal flight cost hints** — show rough fare ranges for common routes (scraped from public sources or Skyscanner deep links)
- [ ] **Visited country stats page** — continents visited, total days traveled, spend, a heatmap timeline
- [ ] **PWA / offline mode** — installable on mobile, works without internet

### Longer-term
- [ ] **Community itineraries** — import/export rule data so friends can share trip notes in the same format
- [ ] **AI itinerary refinement** — feed the rule-based plan to Claude API and let users ask follow-up questions ("swap Sapa for Phu Quoc", "what if I only have 8 days?")
- [ ] **Real-time pricing** — connect to a flights/hotels API (Amadeus, Booking.com affiliate) for live cost estimates
- [ ] **Social layer** — follow friends, see where they've been, get recommendations based on overlapping taste profiles
