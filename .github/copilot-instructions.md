# Travel Planner — Agent Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner. No backend, no paid APIs, static site. Deploy to Netlify/Vercel free tier.

---

## Workflow — do this before every task

```bash
npx tsc --noEmit        # type check before touching anything
npm run build           # verify build is clean before and after changes
```

No test framework is configured. Validation is type check + build.

---

## Workflow — do this after every task (once build is clean)

After `npm run build` succeeds with no errors, update the three docs below before reporting the task complete. Do all three in the same response — do NOT skip if the build passed.

### 1. Update `README.md` → Features section
- Add any new feature or UI behaviour introduced in this task
- Keep the table/section structure consistent with what's already there
- Do not duplicate entries already documented

### 2. Update `README.md` → Future Scope section
- If this task implemented something listed under Future Scope, remove the checkbox line for it
- Do not move it to a "Done" section — just delete it so the list stays clean and forward-looking

### 3. Update `README.md` → Tech Stack / Architecture / Design Notes (if applicable)
- If a new technical pattern was introduced (e.g. a new utility, a new architectural invariant, a new portal use), add a short entry to the relevant section
- If an existing design note is now outdated, update or remove it

---

## Git Workflow

- **Always ask for user confirmation before `git commit` and `git push`**. Never auto-commit or auto-push.
- Use feature branches for new work, merge to `main` only after confirmation.
- Commit messages: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).

---

## Architecture — hooks-based state management

State is organized into domain-specific custom hooks (Single Responsibility):

| Hook | Responsibility |
|---|---|
| `useCountryStore` | Country CRUD, My List, seed+overrides merging, favorites, visited |
| `useTripStore` | Trip group CRUD, seed+overrides merging for trip groups |
| `usePersistedSet` | DRY reusable Set<string> with auto-localStorage persistence |
| `useHashView` | Hash-based URL routing (no router library) |
| `usePanelDrag` | Resizable panel drag behavior |

`App.tsx` is a thin orchestrator (~200 lines) that wires hooks to views.

---

## Key files — go here first

| What you need | File |
|---|---|
| Root layout, view orchestration | `src/App.tsx` |
| Country CRUD, My List, seed+overrides | `src/hooks/useCountryStore.ts` |
| Trip group CRUD + merging | `src/hooks/useTripStore.ts` |
| Reusable persisted Set hook | `src/hooks/usePersistedSet.ts` |
| Hash-based routing (AppView type) | `src/hooks/useHashView.ts` |
| Right sidebar, itinerary card, timeline UI | `src/components/CountryPanel.tsx` |
| Itinerary generation (rule engine + generic fallback) | `src/utils/tripPlans.ts` |
| Per-country, per-city, per-day rule data | `src/data/itineraryRules.ts` |
| Style colors, badge and form button classes | `src/utils/travelStyles.ts` |
| 44 curated seed destinations | `data/countries.json` |
| 197-country world catalog | `data/worldCatalog.json` |
| Trip group definitions + merge logic | `src/data/tripGroups.ts` |
| TypeScript types (Country, CatalogEntry, etc.) | `src/types.ts` |
| localStorage read/write | `src/utils/storage.ts` |
| Feature flags system | `src/utils/featureFlags.ts` |
| Transport emoji + detection (shared) | `src/utils/transport.ts` |
| Resizable panel drag (shared hook) | `src/hooks/usePanelDrag.ts` |
| Shared segmented pill toggle | `src/components/PillGroup.tsx` |
| Home country selector (feature-gated) | `src/components/HomeCountrySelector.tsx` |
| CSS keyframe animations | `src/index.css` |

---

## Data Model — two-tier country system

### Tier 1: World Catalog (`data/worldCatalog.json`)
197 countries with basic data: `{ name, lat, lng, region }`. Regions: Asia, Europe, Middle East, Africa, Americas, Oceania. Used by the Discover view.

### Tier 2: Rich Seed (`data/countries.json`)
44 curated countries with full data: bestMonths, budget, experiences, cities, etc. Pre-added to user's My List.

### My List
Only countries in the user's **My List** (`tp_my_list`) appear on Map, Calendar, List, and Trips views. Users add countries from Discover → creates minimal Country entry. Favorites always sort to top.

4 special non-sovereign destinations exist in seed only (not in catalog): Hawaii, Scotland, Dubai, Antarctica.

---

## Architecture — invariants, never break these

**Seed + Overrides pattern (applies to both countries and trip groups):**
- `tp_customs` holds full Country objects for user edits (overrides seed entries)
- `tp_deleted` tombstones removed seed entries
- `tp_trip_customs` / `tp_trip_deleted` — same pattern for trip groups
- Never mutate the seed JSON at runtime

**Rule engine flow:**
```
generateTripPlan() in tripPlans.ts
  └─ getRuledItinerary()  ← checks ITINERARY_RULES[country.name]
       ├─ found → per-day plan from rule data, returns TripPlan
       └─ not found → falls through to generic algorithm
```
- `itineraryRules.ts` must NOT import from `tripPlans.ts` (circular dep)
- City names in `ITINERARY_RULES` **must exactly match** names in `data/countries.json` — mismatches silently fail

**Views and routing — no library:**
- 5 views: `map | calendar | list | trips | discover`
- `AppView` type defined in `src/hooks/useHashView.ts`
- `VIEW_LABELS` map in `App.tsx` for display names
- Hash-based: `#map` / `#calendar` / `#list` / `#trips` / `#discover`
- Do NOT install react-router or any routing library

**Home country:**
- Stored as `tp_home_country` in localStorage (default `"India"`)
- When `searchableHomeCountry` feature flag is off: static "India" label
- When on: searchable dropdown with all 197 countries
- Do NOT hardcode "India" anywhere except the disabled-flag static label

**Feature flags:**
- System in `src/utils/featureFlags.ts`
- Stored in `tp_features` localStorage key
- Use `isEnabled('flagName')` to check
- Add new flags to `FeatureFlags` type and `DEFAULTS` object

**Animations:**
- `itinerary-card` class → CSS keyframe on mount
- `itinerary-day` class + inline `animationDelay: i * 75ms` → stagger
- Re-mount `TripPlanCard` by keying it on `${style}-${cities}-${days}`

**Filter dropdowns use `createPortal()`** — the filter bar has `overflow-x: auto` which clips `position: absolute` children per CSS spec.

---

## localStorage keys

| Key | Content |
|---|---|
| `tp_my_list` | Country names in user's active list (init from seed + customs) |
| `tp_visited` | Visited country names |
| `tp_favorites` | Favorited country names |
| `tp_customs` | `Country[]` — user-added/edited destinations |
| `tp_deleted` | `string[]` — tombstoned seed country names |
| `tp_home_country` | `string` — departure country label |
| `tp_trip_customs` | `TripGroupDef[]` — user-edited/created trip groups |
| `tp_trip_deleted` | `string[]` — tombstoned seed trip group mains |
| `tp_features` | `FeatureFlags` — feature flag overrides |

---

## Shared UI components — reuse these, don't recreate

| Component | Usage |
|---|---|
| `PillGroup` | Segmented pill toggle (used in Trips, Discover, filters) |
| `FilterChip` | Portal-based dropdown chip (used in Filters) |
| `HomeCountrySelector` | Feature-gated home country dropdown |
| `Tooltip` | Portal-based info tooltip |

---

## How to add a new country to the rule engine

**Step 1** — Add cities to `data/countries.json` if not already there:
```bash
python3 -c "
import json
with open('data/countries.json') as f: d = json.load(f)
country = next(c for c in d if c['name'] == 'CountryName')
country['cities'].append({
    'name': 'CityName', 'lat': 0.0, 'lng': 0.0,
    'bestMonths': ['March'], 'notes': 'Short highlight note'
})
with open('data/countries.json', 'w') as f: json.dump(d, f, indent=2, ensure_ascii=False)
"
```

**Step 2** — Add the rule entry to `src/data/itineraryRules.ts` (see existing Vietnam/Norway structure).

**Step 3** — Verify: `npx tsc --noEmit && npm run build`

---

## How to add a new view

1. Add to `AppView` type in `src/hooks/useHashView.ts`
2. Add to `VALID_VIEWS` array in same file
3. Add label to `VIEW_LABELS` in `src/App.tsx`
4. Add the view component render branch in `App.tsx`
5. Hide global filters if the view has its own (see Discover pattern)

---

## How to add a new feature flag

1. Add to `FeatureFlags` type in `src/utils/featureFlags.ts`
2. Add default value to `DEFAULTS` object
3. Use `isEnabled('flagName')` to gate the feature
4. Document in README under Feature Flags section

---

## Tailwind conventions

- Text sizes: section labels `text-[10px]`, body `text-[11px]` or `text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card gaps `space-y-3.5`
- Custom keyframes go in `src/index.css`, not Tailwind config — keep config clean

---

## Rule countries currently implemented

| Country | Cities |
|---|---|
| Vietnam | Ho Chi Minh City, Da Nang, Hoi An, Hanoi, Ninh Binh, Ha Long Bay, Sapa |
| Norway | Oslo, Bergen, Flam, Voss, Alesund, Geirangerfjord, Tromso |

---

## Do NOT

- Install npm packages — zero runtime deps beyond React + MapLibre is intentional
- Add a routing library — hash routing is intentional
- Hardcode "India" — use `homeCountry` prop (except static label when flag is off)
- Add city names to `ITINERARY_RULES` that don't exist in `data/countries.json` — they silently fail
- Add comments explaining WHAT code does — only add comments for non-obvious WHY
- Create new abstraction layers without a concrete need (3+ repeated patterns)
- Touch `settings.local.json` — that's the user's local permission overrides
- Commit or push without asking the user for confirmation first
