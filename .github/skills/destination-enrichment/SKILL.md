---
name: destination-enrichment
description: Use when the user asks to enrich, improve, or level-up destination/itinerary data quality — day-by-day feasibility, priority/duration activities, tiered hotels, veg/vegan diet tips, per-mode intercity transport, useful booking links, and verified recent prices — for countries in the world catalog or for Indian states, applying the "Norway gold standard" depth. Also use to audit which destinations still need enrichment so none are missed.
---

# Destination Enrichment Skill

## Objective

Bring every destination's itinerary data to the **Norway gold standard**: amazing,
slightly-dynamic itineraries that are feasible, honest, current, and inclusive —
consistently, across all ~198 countries and all Indian states/UTs, without missing any.

This skill captures the richness pattern proven on Norway (then Denmark/Finland/Sweden)
so it can be **re-run for any destination** and enforced **mechanically**, not from memory.

## When to use

- "Improve/enrich the itinerary data for `<country/state>`."
- "Do the same detailing we did for Norway for the other countries / Indian states."
- "Which destinations still need enrichment?" / "Audit destination data quality."

## Two scopes, one shape

Both use the identical consolidated rule JSON shape, so this skill is scope-agnostic:

| Scope | Rule files | Manifest | Unit |
|---|---|---|---|
| International | `data/rules/<country>.json` | `data/rules/index.json` | a **country** |
| Domestic India | `data/domestic/india/rules/<state>.json` | `data/domestic/india/index.json` | a **state/UT** |

Read [`reference/schema.md`](reference/schema.md) for the exact field contract and the
critical **additive / back-compatible / data-gated** design that lets un-enriched
destinations degrade gracefully.

## The runnable core (use these every time)

The bar is enforced by two dependency-free scripts — **run them, don't eyeball**:

```bash
# 1. Find the next targets (least-complete first) — so nothing is missed.
python3 <skill>/assets/coverage_report.py data/rules --below 90
python3 <skill>/assets/coverage_report.py data/domestic/india/rules --below 90

# 2. Audit one destination before and after editing it.
python3 <skill>/assets/validate_rule.py data/rules/<country>.json
python3 <skill>/assets/validate_rule.py data/rules/<country>.json --strict   # exit 1 if score < 90
```

`validate_rule.py` scores 0–100 across weighted criteria (metadata, price freshness,
diet, links, structure, day depth, feasibility, tiered hotels, transport modes,
connection coverage, currency) and lists actionable FAIL/WARN findings.
`coverage_report.py` ranks a whole directory using the **same** battery (DRY).

Norway scores 99/100 — that is the target for each destination you touch.

## Workflow (phased, batched, gated)

Follow [`reference/workflow.md`](reference/workflow.md). In short:

1. **Pick targets** with `coverage_report.py` (lowest scores / user's requested set).
2. **Research current facts** (prices, times, links) — web-verify; nothing older than
   6 months. Set `pricesAsOf` to the month you verified.
3. **Author in independent batches.** One destination per rule file = one self-contained
   unit of work; batches never share state, so they parallelise safely (this is how the
   Nordics were done — one background agent per country).
4. **Reconcile currency** to a single verified rate table (all prices in **INR / ₹**).
5. **Reconcile the manifest** (`index.json`) if `recDays`/`maxDays`/coverage changed.
6. **Gate every batch**: `validate_rule.py --strict` on each file, then the repo gates
   (`npx tsc --noEmit && npm test && npm run build`).

## The quality bar (what "gold standard" means)

Full checklist in [`reference/quality-bar.md`](reference/quality-bar.md). The essentials:

- **Feasibility first** — a day holds **≤ 3 must-see** sights; don't chain places that are
  far apart; order by priority *and* logistics; every day carries a `pace` + one-line `note`.
- **Honest, current prices** — verified within 6 months, in ₹, with `pricesAsOf` stamped.
  If a figure can't be verified, don't invent it.
- **Tiered hotels** — exactly **2 budget / 2 mid / 2 premium** on each stop's arrival day.
- **Inclusive diet block** — vegetarian + vegan guidance + ≥ 3 local ordering phrases.
- **Per-mode intercity transport** — each connection lists **only genuinely viable modes**
  (duration + cost) plus a short `skipped` note on why others are omitted; **every
  consecutive stop pair has a connection** (no "how do I get there?" gaps).
- **Useful live links** — booking (rail/bus/ferry), weather, ride-hail, car hire, groceries,
  veg/vegan (HappyCow), adventure/official tourism (+ aurora forecast for the Arctic).
- **Dynamic transit, not stale numbers** — for anything volatile (cross-country hops,
  city-to-city fares/times), hand off to live search deep-links (`src/core/utils/transitLinks.ts`)
  rather than baking in figures that rot. Curated notes stay as context.

## Engineering principles (for any NEW code the enrichment needs)

Data authoring is most of the work, but when a new capability is required (a renderer,
an engine, a hook), build it to **scale and last** — the app is heading to the Play/App
stores. See [`reference/quality-bar.md`](reference/quality-bar.md) §Engineering. Non-negotiables:

- **Generic engines, not per-destination code.** Anything you add must work for all 198
  countries + all states from data alone. The `DestinationSource` seam already proves this:
  the whole wizard/Route Canvas/PDF/cinematic stack is scope-agnostic — never special-case a country.
- **Additive & data-gated** — new fields are optional; the renderer prefers them when present
  and falls back cleanly, so un-enriched destinations never break (graceful degradation).
- **SOLID / DRY** — one source of truth per concept (`LS_KEYS`, `palette.ts` tokens,
  `transitLinks.ts`, `pdfModel.ts`). Reuse shared UI primitives; don't duplicate logic.
- **No dead code / exports / imports.** Run `npx knip`.
- **Performance & memory** — lazy-load rule chunks (`import.meta.glob`), memoise derivations,
  guard against stale async updates and race conditions, clean up every timer/subscription.
- **Accessibility & responsive** — focus rings, ARIA on popups/icon buttons, ≥ 32px touch
  targets, keyboard nav, Escape-to-close, viewport-collision-safe portals, `prefers-reduced-motion`,
  works at 375px → desktop. External links get `rel="noopener noreferrer"`.
- **Tests** — behavior-first, deterministic (mock time/network/random), one regression test
  per bug path. Keep total statement coverage ≥ 90%.

## Output format

Report back:
1. Destinations enriched (with before → after `validate_rule.py` scores).
2. What was added per destination (activities/hotels/diet/links/transport).
3. Prices' `pricesAsOf` and the currency rate table used.
4. Manifest (`index.json`) changes, if any.
5. Gate results (validator scores, tsc/test/build).
6. Remaining lowest-scoring destinations (next targets) from `coverage_report.py`.

## Hard constraints (repo-specific)

- **Never commit or push without explicit user confirmation** — the user reviews visually first.
- Update docs only after sign-off: `README.md`, `DESIGN.md`, `.github/copilot-instructions.md`.
- Node toolchain may not be on PATH: prefix with `export PATH="/opt/homebrew/bin:$PATH"` and
  run via `./node_modules/.bin/tsc` / `./node_modules/.bin/vitest` / `./node_modules/.bin/vite`.
