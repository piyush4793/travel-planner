# Rule JSON Schema Contract

A consolidated **rule JSON** is the single per-destination data file. The same shape
serves an international country and a domestic Indian state — the app loads it through
the scope-agnostic `DestinationSource` seam, so authoring one is identical for both.

- International: `data/rules/<country>.json`, manifested in `data/rules/index.json`.
- Domestic India: `data/domestic/india/rules/<state>.json`, manifested in `data/domestic/india/index.json`.

The TypeScript types that consume the itinerary live in
`src/core/data/itineraryRules.ts` (`CountryRule`, `CityRule`, `RuleDayPlan`, `RuleActivity`)
and `src/core/utils/tripPlans.ts` (`DayEntry`, `ActivityDetail`, `HotelStay`).

## Top-level shape

```jsonc
{
  "name": "Norway",
  "seed": false,
  "lat": 60.47, "lng": 8.47,
  "region": "Europe",
  "bestMonths": ["February", "March", "May", "June", "August", "September"],
  "worstMonths": ["July"],
  "budget": "₹1.5L–₹3L",
  "experiences": ["Fjords", "Northern Lights", "Hiking", "Scenic Rail"],
  "avoid": ["…optional caveats…"],
  "combo": ["Iceland", "Denmark"],       // "combine with" suggestions
  "landmark": "Geirangerfjord",
  "travelStyle": "…one-line positioning…",
  "stopoverNote": "…optional layover tip…",

  "pricesAsOf": "2026-07",               // MONTH prices were verified — MANDATORY
  "diet": { … },                          // see below — MANDATORY for gold standard
  "links": [ { "label": "…", "url": "…" } ],   // useful live links — MANDATORY

  "cities": [                             // lightweight catalog list (coords for feasibility)
    { "name": "Oslo", "lat": 59.91, "lng": 10.75, "notes": "…", "bestMonths": [], "worstMonths": [] }
  ],

  "itinerary": { … }                      // the plannable rule (see below)
}
```

## `itinerary` (the plannable `CountryRule`)

```jsonc
"itinerary": {
  "sim": "…eSIM / connectivity tip…",
  "apps": ["Entur", "Vy", "Yr"],
  "cityOrder": ["Oslo", "Bergen", "Flåm", "…"],   // canonical visiting order
  "cities": {                                      // Record<cityName, CityRule>
    "Oslo": {
      "name": "Oslo",
      "minDays": 1, "recDays": 2, "maxDays": 4,    // min <= rec <= max, min >= 1
      "note": "…optional city note…",
      "experiences": ["City", "Museums"],          // optional override
      "signatureExperiences": ["Fjords"],          // this city is THE place for these
      "days": [ RuleDayPlan, … ]
    }
  },
  "connections": [ Connection, … ],
  "extras": ["…optional country-wide tips…"],
  "cityImages": { "Oslo": ["https://…"] }          // optional
}
```

### `RuleDayPlan`

```jsonc
{
  "theme": "Fjord gateway & Bryggen",
  "pace": "moderate",                 // "relaxed" | "moderate" | "packed"  — always set
  "note": "Base in Bergen; ferries fill mid-day, so do Fløyen early.",  // one-line logistics — always set
  "activities": [ RuleActivity, … ],
  "meals": ["Local seafood at the fish market"],
  "hotels": [ { "name": "…", "budget": "₹…", "tier": "budget|mid|premium" } ]  // ONLY on day[0] of each city; 2/2/2
}
```

### `RuleActivity`

```jsonc
{
  "name": "Bryggen Hanseatic Wharf",
  "priority": "must-see",             // "must-see" | "recommended" | "optional"  — drives feasible trimming
  "duration": "1.5–2h",               // rough on-the-ground time — keeps a day feasible
  "cost": "₹0",                       // always ₹ for numeric prices; "Free"/"Included" allowed
  "tip": "Go before the cruise crowds arrive ~10am."
}
```

### `Connection` (intercity transport)

```jsonc
{
  "from": "Oslo", "to": "Bergen",
  "method": "Bergen Line scenic train (7 hrs)",       // human summary (back-compat)
  "cost": "₹1,500–5,000 pp (book vy.no 90 days out)", // summary cost (back-compat)
  "modes": [                                           // VIABLE modes only, each duration + cost
    { "mode": "train", "duration": "6.5–7 hrs", "cost": "₹2,500–12,000 pp", "note": "book minipris ~90 days out" },
    { "mode": "flight", "duration": "55 min", "cost": "₹3,400–7,600 pp", "note": "OSL–BGO, many daily" },
    { "mode": "drive", "duration": "~7 hrs (456 km)", "cost": "₹5,000–7,000 fuel+tolls", "note": "winter tyres Oct–Apr" }
  ],
  "skipped": "Bus (9–13 hrs) is slower and pricier than the train — not worth it."
}
```

- `mode` ∈ `flight | train | ferry | bus | cable-car | drive` (matches `MODE_LABELS`/`TRANSPORT_EMOJI`).
- **Every consecutive `cityOrder` pair must have a connection** (either direction) — a missing
  one is the "how do I get there?" gap the traveller hit (e.g. Loen→Geirangerfjord).
- Don't fabricate volatile figures. Live, always-current transit is surfaced separately via
  `src/core/utils/transitLinks.ts` (Rome2Rio / Google Maps / Google Flights deep-links) in the
  itinerary separators and cross-country `BorderHop`; curated `modes` add stable context on top.

## `diet`

```jsonc
"diet": {
  "vegetarian": "…where it's easy, supermarket labels, dedicated cafés…",
  "vegan": "…strongholds, plant-milk norms, apps to use…",
  "phrases": [
    "Jeg er vegetarianer / veganer — I'm vegetarian / vegan",
    "Uten kjøtt og fisk, takk — without meat and fish, please",
    "Har dere veganske retter? — do you have vegan dishes?"
  ]
}
```

Renders as the "Food & diet" card in `TripContextRail` — only when present (data-gated).

## `links`

Flat list of `{ label, url }`. Cover these categories (Norway shipped 14):
transport booking (rail/bus/ferry), national weather, ride-hailing, car hire,
online groceries + supermarket names, veg/vegan finder (HappyCow), official tourism /
adventure booking, and — for Arctic destinations — an aurora forecast.
Labels should be self-describing (e.g. "Entur — plan & book all buses, trains & ferries").

## Manifest (`index.json`)

Array of lightweight entries used for search/ranking/slider bounds:

```jsonc
{ "name": "Norway", "lat": 60.47, "lng": 8.47, "region": "Europe",
  "inSeed": false, "hasItinerary": true, "recDays": 19, "maxDays": 24,
  "popularityScore": 73, "bestMonths": [...], "worstMonths": [...], "combo": ["Iceland", "Denmark"] }
```

Keep `recDays`/`maxDays` in sync with the sum/bounds implied by the rule's cities when they change.

## The additive / graceful-degradation invariant (critical)

`DayEntry` keeps canonical **string** fields (`activities: string[]`, `hotels?: string[]`) used by
share text, `extractPlanCities`, tests and AI/generic fallbacks. The rich fields
(`details: ActivityDetail[]`, `stays: HotelStay[]`, `pace`, `planNote`) are **optional parallel
enrichments**. The renderer (`ItineraryView`) and `pdfExport` prefer the structured fields when
present and fall back to strings otherwise. **This is why the ~un-enriched destinations still work.**
Never make a rich field mandatory in code; always gate on its presence.
