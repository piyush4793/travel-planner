# Workflow — enriching destinations at scale

A repeatable, batched, parallel loop. The goal is to lift every world-catalog country and
every Indian state to the gold standard (`reference/quality-bar.md`) without missing any and
without regressing the app.

## 0. Pick a scope

| Scope | Rules dir | Manifest |
|---|---|---|
| International | `data/rules/` | `data/rules/index.json` |
| Domestic India | `data/domestic/india/rules/` | `data/domestic/india/index.json` |

Both use the identical schema (`reference/schema.md`), so the loop is the same.

## 1. Triage — least complete first

```bash
python3 <skill>/assets/coverage_report.py data/rules --below 90
# or India:
python3 <skill>/assets/coverage_report.py data/domestic/india/rules --below 90
```

The report ranks ascending and shows each file's weakest criteria. Work the lowest scores
first (highest marginal value). `--json` if you want to drive batching programmatically.

## 2. Batch (parallel-friendly, self-contained)

- Group ~3–6 destinations per batch, ideally regional neighbours (shared currency, shared
  transit, "combine with" pairings) so research compounds — the Nordics were one batch.
- Each destination's JSON is **self-contained at the file level**, so batches (and background
  agents, one per destination) don't conflict.
- **Fix one verified currency rate table per batch** and record the rates + `pricesAsOf`
  month before authoring, so every file in the batch converts consistently.

## 3. Research (per destination)

Use current, reputable sources — official tourism boards / state portals, Booking·Agoda·MMT·
Trivago, and well-known travel blogs — nothing older than 6 months. Gather:

1. City list + rough coords + a feasible visiting order (for gap-free connections).
2. Per-day, feasibility-first activities (≤3 must-see/day, clustered, priced, timed, tipped).
3. 2/2/2 real hotels per city arrival day.
4. Viable intercity modes with duration + cost + a skip note; every consecutive pair covered.
5. Diet guidance + ≥3 local phrases.
6. ≥8 self-describing live links (+ aurora for Arctic).

Do **not** freeze volatile fares/times as the source of truth — the app hands those off to
live search (`transitLinks.ts`). Author `modes` for stable context.

## 4. Author

Edit the destination JSON to the schema. Keep enrichment **additive and data-gated** — never
break the string fallbacks (`activities: string[]`, `hotels?: string[]`) the renderer/share/AI
paths rely on. If a code change is needed, build a **generic engine** behind the
`DestinationSource` seam — no per-country branches, works from data for all destinations.

## 5. Validate (per file, then reconcile the manifest)

```bash
python3 <skill>/assets/validate_rule.py data/rules/<c>.json --strict
```

Iterate until score ≥ 90 with no FAIL. Then reconcile the manifest (`index.json`): update
`recDays`/`maxDays`/`hasItinerary`/`combo` for any changed destination so search, ranking, and
slider bounds stay correct.

## 6. Repo gate (per batch, not per file)

```bash
export PATH="/opt/homebrew/bin:$PATH"
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
npx knip           # no new dead code/exports/imports
```

If any rich field required a code change, add/extend deterministic tests (behavior-first,
mock time/network/random) and keep total statement coverage ≥ 90%. Add a regression test for
every bug path.

## 7. Re-triage & repeat

Re-run `coverage_report.py` to confirm the batch moved and to pick the next lowest cohort.
Continue until the whole scope clears the bar, then switch scope (international → India).

## 8. Docs & commit (only after the user's visual sign-off)

Update `README.md`, `DESIGN.md`, `.github/copilot-instructions.md` to reflect new coverage or
any new engine/field. Run `npm run validate`. **Never commit or push without explicit user
confirmation** — the user reviews the itineraries visually first.

## Loop summary

```
coverage_report (triage) → batch → research → author → validate_rule (≥90)
   → reconcile index.json → tsc+vitest+build+knip → re-triage → next batch
```
