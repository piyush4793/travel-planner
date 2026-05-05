# Travel Planner — Agent Instructions

Vite 5 + React 18 + TypeScript + Tailwind CSS + MapLibre GL. Personal travel planner. No backend, no paid APIs, static site. Deploy to Netlify/Vercel free tier.

---

## Workflow — do this before every task

```bash
npx tsc --noEmit        # type check before touching anything
npm run build           # verify build is clean before and after changes
```

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

## Key files — go here first

| What you need | File |
|---|---|
| Global state, routing, home country, layout | `src/App.tsx` |
| Right sidebar, itinerary card, timeline UI | `src/components/CountryPanel.tsx` |
| Itinerary generation (rule engine + generic fallback) | `src/utils/tripPlans.ts` |
| Per-country, per-city, per-day rule data | `src/data/itineraryRules.ts` |
| Style colors, badge and form button classes | `src/utils/travelStyles.ts` |
| All 50+ destination seed data | `data/countries.json` |
| TypeScript types | `src/types.ts` |
| localStorage read/write | `src/utils/storage.ts` |
| Transport emoji + detection (shared) | `src/utils/transport.ts` |
| Resizable panel drag (shared hook) | `src/hooks/usePanelDrag.ts` |
| CSS keyframe animations | `src/index.css` |

---

## Architecture — invariants, never break these

**Rule engine flow:**
```
generateTripPlan() in tripPlans.ts
  └─ getRuledItinerary()  ← checks ITINERARY_RULES[country.name]
       ├─ found → per-day plan from rule data, returns TripPlan
       └─ not found → falls through to generic algorithm
```
- `itineraryRules.ts` must NOT import from `tripPlans.ts` (circular dep)
- City names in `ITINERARY_RULES` **must exactly match** names in `data/countries.json` — mismatches silently fail (no TypeScript error)

**URL routing — no library:**
- Hash-based: `#map` / `#calendar` / `#list`
- `getViewFromHash()` reads hash on init
- `pushState` on view change, `popstate` listener for back/forward
- Do NOT install react-router or any routing library

**Home country:**
- Stored as `tp_home_country` in localStorage (default `"India"`)
- Passed as `homeCountry: string` prop to `CountryPanel`
- Do NOT hardcode "India" anywhere in the codebase

**Animations:**
- `itinerary-card` class → CSS keyframe on mount
- `itinerary-day` class + inline `animationDelay: i * 75ms` → stagger
- Re-mount `TripPlanCard` by keying it on `${style}-${cities}-${days}`

**Filter dropdowns use `createPortal()`** — the filter bar has `overflow-x: auto` which clips `position: absolute` children per CSS spec.

**Seed + overrides pattern:**
- `tp_customs` holds full Country objects for user edits
- `tp_deleted` tombstones removed seed entries
- Never mutate the seed JSON at runtime

---

## How to add a new country to the rule engine

**Step 1** — Add cities to `data/countries.json` if not already there:
```python
# Use python3 to edit JSON cleanly
python3 << 'EOF'
import json
with open('data/countries.json') as f: data = json.load(f)
country = next(c for c in data if c['name'] == 'CountryName')
country['cities'].append({
    "name": "CityName", "lat": 0.0, "lng": 0.0,
    "bestMonths": ["March"], "notes": "Short highlight note"
})
with open('data/countries.json', 'w') as f: json.dump(data, f, indent=2, ensure_ascii=False)
EOF
```

**Step 2** — Add the rule entry to `src/data/itineraryRules.ts`:
```typescript
"CountryName": {
  sim?: string,                   // e.g. "Viettel"
  apps?: string[],                // e.g. ["Grab", "Klook"]
  cityOrder: string[],            // travel order, must match countries.json names exactly
  styleDefaults: {
    "touch-and-go": string[],     // 2-3 cities max
    "explorer":     string[],     // 4-6 cities
    "month-long":   string[],     // all cities
    "custom":       string[],     // sensible default
  },
  cities: {
    "CityName": {
      name: string,
      minDays: number, recDays: number, maxDays: number,
      note?: string,              // shown as tip, e.g. "Day trip from X"
      days: RuleDayPlan[],        // one per recDays (can have more for maxDays)
    }
  },
  connections: [{ from, to, method, cost? }],
  extras?: string[],
}
```

**Step 3** — Verify:
```bash
npx tsc --noEmit && npm run build
```

---

## How to update countries.json safely

Always use Python to avoid JSON syntax errors:
```bash
python3 -c "
import json
with open('data/countries.json') as f: d = json.load(f)
country = next(c for c in d if c['name'] == 'X')
# ... make changes ...
with open('data/countries.json', 'w') as f: json.dump(d, f, indent=2, ensure_ascii=False)
"
```

Budget format: `"₹3L–₹5L"` — Indian Rupees, en-dash (–), no spaces around dash.

---

## DayEntry type (itinerary cards)

```typescript
type DayEntry = {
  label: string;       // "Day 3 — Da Nang"
  activities: string[];
  theme?: string;      // badge e.g. "Bana Hills Full Day"
  hotels?: string[];   // chips e.g. "Grand Gold Hotel — under ₹3,000/night"
};
```

---

## StyleMeta type (colors per travel style)

Each style has: `icon`, `label`, `description`, `badge`, `activePill`, `activeForm`, `dot` (timeline dot border), `themeBadge` (day theme pill). Defined in `src/utils/travelStyles.ts`. Add all fields when adding a new style.

---

## Tailwind conventions

- Text sizes: section labels `text-[10px]`, body `text-[11px]` or `text-xs`, headings `text-sm`/`text-base`
- Rounded: cards `rounded-xl`, chips `rounded-full`, inputs `rounded-lg`
- Spacing: section gaps `space-y-5`, inner card gaps `space-y-3.5`
- Custom keyframes go in `src/index.css`, not Tailwind config — keep config clean

---

## localStorage keys

| Key | Content |
|---|---|
| `tp_customs` | `Country[]` — user-added/edited destinations |
| `tp_deleted` | `string[]` — tombstoned seed country names |
| `tp_visited` | `string[]` — visited country names |
| `tp_favorites` | `string[]` — favorited country names |
| `tp_home_country` | `string` — departure country label |

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
- Hardcode "India" — use `homeCountry` prop
- Add city names to `ITINERARY_RULES` that don't exist in `data/countries.json` — they silently fail
- Add comments explaining WHAT code does — only add comments for non-obvious WHY
- Create new abstraction layers without a concrete need (3+ repeated patterns)
- Touch `settings.local.json` — that's the user's local permission overrides
