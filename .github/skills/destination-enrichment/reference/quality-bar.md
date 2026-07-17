# Quality Bar — what "Norway gold standard" means

Every criterion below is scored by `assets/validate_rule.py`. Aim for **≥ 90/100**
(Norway = 99). Use the validator's findings as your task list.

## 1. Day-by-day feasibility (the heart of it)

- **≤ 3 must-see sights per day.** A real day cannot absorb more. Tag the rest
  `recommended` / `optional` so a tight day trims sensibly.
- **≤ ~6 activities per day** total — beyond that it reads as a dump, not a plan.
- **Don't chain far-apart places in one day.** Use city coordinates (top-level `cities[]`)
  and local geography to keep a day's stops clustered; split when they aren't.
- **Order by priority *and* logistics** — e.g. do the hilltop viewpoint early before
  cruise crowds/afternoon cloud; leave flexible/indoor options for weather buffers.
- **Every day has `pace`** (`relaxed`/`moderate`/`packed`) **and a one-line `note`**
  giving the day's logistics rationale (where to base, what fills up, transfer timing).
- **Rich activities**: give the headline sights a `priority`, a `duration`, and a `cost`;
  add a `tip` where it materially helps.

## 2. Honest, current prices

- **Nothing older than 6 months.** Web-verify current figures (or re-check your own) and
  stamp `pricesAsOf: "YYYY-MM"` with the month you verified.
- **All numeric prices in ₹ (INR).** Qualitative costs (`Free`, `Included`, `Varies`) are fine.
- **One verified rate table per batch.** When converting foreign prices, use a single
  agreed rate for all destinations in the batch and record it (the Nordics used
  1 EUR=₹110.25, 1 DKK=₹14.75, 1 SEK=₹9.99, 1 NOK=₹9.96 for July 2026). A single wrong rate
  silently skews a whole country — reconcile before gating.
- **If a figure can't be verified, don't invent it.** Prefer a live link (below) over a guess.

## 3. Where to stay — tiered hotels

- **Exactly 2 budget / 2 mid / 2 premium** on **day[0] of each city** (arrival day), tiered via
  `tier`. Not on later days (redundant). Research real, currently-operating properties from
  reputable sources (official tourism, Booking/Agoda/MMT/Trivago, well-known travel blogs).

## 4. Inclusive diet guidance

- `diet.vegetarian` and `diet.vegan` paragraphs: where it's easy vs hard, supermarket/label
  cues, dedicated spots in the main cities, plant-milk norms, apps.
- `diet.phrases`: **≥ 3** local ordering phrases with English glosses.

## 5. Intercity transport — per mode, honest, gap-free

- Each `connection` lists **only genuinely viable modes** with `duration` + `cost`, plus a
  short `skipped` note on why others are omitted (the user's explicit choice over listing all).
- **Every consecutive `cityOrder` pair has a connection** — no missing legs.
- Volatile fares/times are **not** frozen: the UI already hands off to live search
  (`transitLinks.ts`) in the itinerary separators and `BorderHop`. Author `modes` for stable
  context (typical duration band, booking tip), not as a price the app must keep current.

## 6. Useful live links

Cover: transport booking (rail/bus/ferry), national weather, ride-hailing, car hire, online
groceries + supermarket names, veg/vegan finder (HappyCow), official tourism / adventure
booking, and an aurora forecast for Arctic destinations. Self-describing labels. Floor: 8.
All external links open safely (`rel="noopener noreferrer"` in any rendering code).

## 7. Accessibility & responsive (for any UI the enrichment touches)

- Focus-visible rings on every interactive element; ARIA on popups (`aria-expanded`/`role`)
  and icon-only buttons (`aria-label`).
- Touch targets ≥ 32px (prefer 44px on mobile); keyboard-reachable; Escape closes overlays
  and restores focus; portal popups are viewport-collision-safe and go bottom-sheet on mobile.
- Respect `prefers-reduced-motion`; animate only `transform`/`opacity`; works 375px → desktop.
- Colour is never the only signal (priority word + pace word are always text; dots are secondary).

## Engineering (for any NEW code — the app is heading to Play/App stores)

- **Generic engines, not per-destination branches.** New capability must work for all 198
  countries + all states from data alone. Extend behind the `DestinationSource` seam; never
  hard-code a country name in logic.
- **Additive, data-gated, back-compatible** — optional fields, renderer prefers-then-falls-back
  (see schema §invariant). Un-enriched destinations must keep working.
- **SOLID + DRY** — one source of truth per concept (`LS_KEYS`, `palette.ts` tokens,
  `transitLinks.ts`, `pdfModel.ts`, `stopPlan.ts`). Reuse shared primitives; no copy-paste logic.
- **No dead code / exports / imports** — verify with `npx knip`.
- **Performance / memory / async** — lazy-load rule chunks; memoise; guard stale async updates
  and race conditions; clean up every timer/interval/subscription on unmount.
- **String literals** — no magic strings/keys; centralise constants; keep user-facing copy
  consistent and typo-free.
- **Tests** — behavior-first, deterministic (mock time/network/random), a regression test per
  bug path, total statement coverage ≥ 90%.

## Gate sequence (each batch)

```bash
# per file
python3 <skill>/assets/validate_rule.py <rule.json> --strict     # score >= 90, no FAIL
# repo
export PATH="/opt/homebrew/bin:$PATH"
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
```
