# Travel Planner

A personal, map-based travel planner pre-loaded with your wishlist of 44 destinations. Filter by season, budget, travel style, and experience type — then explore each destination's best months, stopover strategy, city breakdowns, and trip combinations.

Built web-first with an entirely free stack. No paid APIs, no tokens, no backend.

---

## Features

### Views
| View | What it does |
|---|---|
| **Map** | Interactive world map with color-coded pins. Click any pin to open the detail panel. Combo destinations highlight in purple when a country is selected. |
| **Calendar** | Heatmap grid — rows are destinations, columns are months. Emerald cells = best time to visit, red = avoid, blue column = current month. |
| **List** | Paginated table with search, sort by name / budget / visited status, and inline visited/favorite toggles. |

### Filters (always visible, top bar)
All filters combine with AND logic:

| Filter | Behaviour |
|---|---|
| **Month** | Multi-select — pick one or more months; shows countries with best-time overlap with any selected month |
| **Style** | Multi-select — Touch & Go / Explorer / Month Long; matches countries supporting any selected style |
| **Budget** | Single-select — ₹ Budget (< ₹1.5L) / ₹₹ Mid (₹1.5L–₹3L) / ₹₹₹ Premium (₹3L+) |
| **Experiences** | Multi-select tag picker — AND logic (country must have all selected tags) |
| **Bucket list** | Shows only unvisited destinations |
| **Visited** | Shows only visited destinations |

Each filter chip shows its current selection in the label and opens a clean dropdown panel. Active filters show a count badge in the header.

### Country Detail Panel
Slides in from the right when a destination is selected. Contains:
- Budget estimate (from India)
- Travel style badges
- Best months and months to avoid
- Experience tags (click any tag to instantly filter by it)
- City breakdown (e.g. Russia: Moscow, St Petersburg, Sochi, Krasnodar, Murmansk — each with their own best months and notes)
- Stopover tips (for hub airports — Singapore, Dubai, Istanbul, etc.)
- "Watch out for" notes
- "Combine with" suggestions (highlights linked destinations in purple on the map)
- Useful links (e.g. Hobbiton tour booking for New Zealand)
- Mark as visited / Add to favorites / Edit / Delete

### Map Markers
- **Blue** — unvisited destination
- **Green** — visited destination
- **Purple** — combo/linked destination (when a country panel is open)
- Hover over a marker to see a photo card (fetched from Wikipedia) with budget info

### CRUD
- Add new destinations via a full form (name, coordinates, months, budget, experiences, travel style, etc.)
- Edit any existing destination
- Delete destinations (seed data is tombstoned; custom additions are removed)
- All changes persist across sessions via localStorage

### Persistence (localStorage)
| Key | What is stored |
|---|---|
| `tp_visited` | Set of visited country names |
| `tp_favorites` | Set of favorited country names |
| `tp_customs` | Added/edited countries |
| `tp_deleted` | Tombstone list for deleted seed entries |

---

## Travel Styles

| Style | Description |
|---|---|
| 🏃 **Touch & Go** | Cover as many countries as possible with very little time in each. Great for stopovers and quick highlights. |
| 🔭 **Explorer** | 7–14 days to properly tour a country. See the highlights without rushing. |
| 🌿 **Month Long** | Slow travel — living like a local and going deep into the culture. |

---

## Destinations (44 pre-loaded)

Pre-filled from a personal wishlist with research-backed data:

**Asia** — Japan, South Korea, China, Thailand, Malaysia, Singapore, Cambodia, Laos, Vietnam, Nepal, Bhutan, Indonesia, Philippines, Maldives

**Middle East & Africa** — Egypt, Dubai, South Africa

**Europe** — Greece, Iceland, Turkey, Georgia, Russia, Belarus, Poland, Czech Republic, Hungary, Romania, Austria, Germany, Switzerland, France, Spain, Netherlands, Scotland, UK, Denmark, Greenland, Norway, Italy

**Americas & Oceania** — Argentina, Antarctica, Australia, New Zealand, Hawaii

Each entry includes: best months, avoid months, budget range, experience tags, travel style classification, combo suggestions, avoid notes, and landmark for the hover card image.

Russia includes a city-level breakdown (Moscow, St Petersburg, Sochi, Krasnodar, Murmansk) each with their own seasonal windows.

### Stopover Hubs

| Hub | Airline | Best for |
|---|---|---|
| Singapore (Changi) | Singapore Airlines Suites | India ↔ Australia / NZ / Japan |
| Dubai (DXB) | Emirates | India ↔ Europe / Africa / Americas |
| Istanbul (IST) | Turkish Airlines | India ↔ Europe (cheapest option) |
| Kuala Lumpur (KLIA) | AirAsia / Malaysia Airlines | SE Asia budget connections |

---

## Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite 5** | Fast HMR, minimal config, static output |
| UI | **React 18 + TypeScript** | Component model + full type safety |
| Styling | **Tailwind CSS** | Utility-first, zero runtime |
| Map | **MapLibre GL JS** | Free open-source Mapbox fork, no token required |
| Tiles | **OpenFreeMap** (`liberty` style) | Free OSM vector tiles, no API key |
| Images | **Wikipedia REST API** | Free, CORS-enabled, no key needed |
| State | **React hooks + localStorage** | No external state library needed |
| Data | **Local JSON** in `/data` | Ships with app, easy to edit, works offline |

---

## Project Structure

```
travel-planner/
├── data/
│   ├── countries.json          # 44-destination seed dataset
│   └── wishlist.md             # raw personal wishlist + stopover strategy notes
├── src/
│   ├── components/
│   │   ├── App.tsx             # composition root, all state lives here
│   │   ├── MapView.tsx         # MapLibre map, markers, hover card
│   │   ├── HoverCard.tsx       # Wikipedia photo card shown on map hover
│   │   ├── CalendarView.tsx    # month heatmap table
│   │   ├── ListView.tsx        # paginated sortable table
│   │   ├── Filters.tsx         # top filter bar (month/style/budget/status)
│   │   ├── FilterChip.tsx      # reusable portal dropdown chip
│   │   ├── ExperienceDropdown.tsx  # experience tag multi-select
│   │   ├── CountryPanel.tsx    # right-side detail panel
│   │   ├── CountryForm.tsx     # add/edit modal form
│   │   └── Tooltip.tsx         # portal-based info tooltip
│   ├── utils/
│   │   ├── filterLogic.ts      # pure filter functions
│   │   ├── months.ts           # MONTHS array + expandMonth helper
│   │   ├── travelStyles.ts     # STYLE_META (icons, colors, descriptions)
│   │   ├── wikiImages.ts       # Wikipedia image fetch + module-level cache
│   │   └── storage.ts          # localStorage helpers
│   ├── types.ts                # Country, TravelStyle, VisitedFilter, CityEntry
│   ├── main.tsx
│   └── index.css               # Tailwind + custom marker/animation CSS
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

---

## Data Model

```ts
type Country = {
  name: string;
  lat: number;
  lng: number;
  bestMonths: string[];          // ["March", "April"]
  worstMonths?: string[];        // months to avoid
  budget: string;                // "₹3L–₹5L" (from India)
  experiences: string[];         // ["Cherry Blossoms", "Food", "Culture"]
  avoid?: string[];              // watch-out notes
  combo?: string[];              // suggested trip combinations
  landmark?: string;             // Wikipedia title or direct image URL for hover card
  travelStyle?: TravelStyle[];   // ["explorer", "month-long"]
  cities?: CityEntry[];          // sub-destinations (e.g. Russia)
  stopoverNote?: string;         // hub airport tips
  links?: { label: string; url: string }[];  // booking links etc.
};

type TravelStyle = "touch-and-go" | "explorer" | "month-long";
type VisitedFilter = "all" | "visited" | "unvisited";

type CityEntry = {
  name: string;
  lat: number;
  lng: number;
  bestMonths?: string[];
  notes?: string;
};
```

---

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static output in dist/
```

---

## Design Notes

**Portal pattern** — filter dropdowns, the experience picker, and tooltips all use `createPortal(content, document.body)` with `position: fixed` coordinates computed from `getBoundingClientRect()`. This is necessary because the filter bar uses `overflow-x: auto`, which per CSS spec implicitly clips `overflow-y` and would cut off any `position: absolute` children.

**Stale closure fix** — MapLibre marker click handlers capture `onSelect` at creation time. A `useRef` keeps the latest callback without triggering marker recreation: `onSelectRef.current = onSelect` in a separate `useEffect`.

**Wikipedia images** — fetched via `https://en.wikipedia.org/api/rest_v1/page/summary/{title}`, which is free, CORS-enabled, and requires no API key. Results are cached in a module-level `Map` so repeated hovers don't re-fetch.

**Seed + overrides pattern** — user edits are stored in `tp_customs` (a list of full Country objects). On load, seed entries are overridden by any matching custom entry; seed entries in `tp_deleted` are tombstoned. New additions (not in seed) are appended. This means the seed can be updated without losing user data.
