#!/usr/bin/env python3
"""Audit a consolidated destination rule JSON against the "gold standard" bar.

Scope-agnostic: works for an international country rule (``data/rules/<c>.json``)
or a domestic Indian state rule (``data/domestic/india/rules/<s>.json``) — both
share the same consolidated shape. The check battery is data-driven, so it scales
to any new destination without edits.

Usage:
    python3 validate_rule.py <path-to-rule.json> [--json] [--strict]

Exit code: 0 if no FAIL-level findings (WARN allowed), 1 otherwise, or with
``--strict`` also 1 when the completeness score is below 90.

Dependency-free (stdlib only), so it runs anywhere.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date

# Weighted criteria. Each returns a 0..1 fraction of how well the bar is met;
# the completeness score is the weighted average. Keeping weights here (not
# scattered) makes the bar auditable and easy to retune in one place.
REQUIRED_META = [
    "name", "region", "budget", "experiences", "bestMonths",
    "combo", "travelStyle", "stopoverNote", "landmark", "lat", "lng",
]
MIN_LINKS = 8            # Norway shipped 14; 8 is the floor across booking/weather/ride/car/grocery/veg/adventure.
MAX_MUST_SEE_PER_DAY = 3  # Feasibility: a day realistically absorbs <=3 headline sights.
MAX_ACTS_PER_DAY = 6      # Beyond this a day reads as a dump, not a plan.
HOTELS_PER_TIER = 2       # 2 budget / 2 mid / 2 premium on each stop's arrival day.
PRICE_FRESH_MONTHS = 6    # Nothing older than 6 months (verified or re-checked).
INR = "\u20b9"           # The app renders every price in INR.


def _months_since(as_of: str) -> float | None:
    m = re.match(r"^(\d{4})-(\d{2})$", str(as_of).strip())
    if not m:
        return None
    y, mo = int(m.group(1)), int(m.group(2))
    today = date.today()
    return (today.year - y) * 12 + (today.month - mo)


def _itin_cities(rule: dict) -> dict:
    return (rule.get("itinerary") or {}).get("cities") or {}


def _city_order(rule: dict) -> list:
    return (rule.get("itinerary") or {}).get("cityOrder") or []


def _connections(rule: dict) -> list:
    return (rule.get("itinerary") or {}).get("connections") or []


def _all_days(rule: dict):
    for city in _itin_cities(rule).values():
        for day in city.get("days", []) or []:
            yield day


def _all_costs(rule: dict):
    for day in _all_days(rule):
        for act in day.get("activities", []) or []:
            if isinstance(act, dict) and act.get("cost"):
                yield act["cost"]
    for conn in _connections(rule):
        if conn.get("cost"):
            yield conn["cost"]
        for mode in conn.get("modes", []) or []:
            if mode.get("cost"):
                yield mode["cost"]


# ── Criteria ─────────────────────────────────────────────────────────────────

def c_metadata(rule, notes):
    present = [f for f in REQUIRED_META if rule.get(f) not in (None, "", [], {})]
    missing = [f for f in REQUIRED_META if f not in present]
    if missing:
        notes.append(("WARN", "metadata", f"missing top-level fields: {', '.join(missing)}"))
    return len(present) / len(REQUIRED_META)


def c_prices_fresh(rule, notes):
    as_of = rule.get("pricesAsOf")
    if not as_of:
        notes.append(("FAIL", "prices", "pricesAsOf missing — prices are unverifiable"))
        return 0.0
    months = _months_since(as_of)
    if months is None:
        notes.append(("WARN", "prices", f"pricesAsOf '{as_of}' is not YYYY-MM"))
        return 0.5
    if months > PRICE_FRESH_MONTHS:
        notes.append(("WARN", "prices", f"pricesAsOf {as_of} is {months} months old (> {PRICE_FRESH_MONTHS}); re-verify"))
        return 0.4
    return 1.0


def c_diet(rule, notes):
    diet = rule.get("diet") or {}
    got = 0
    for key in ("vegetarian", "vegan"):
        if diet.get(key):
            got += 1
        else:
            notes.append(("WARN", "diet", f"diet.{key} missing"))
    phrases = diet.get("phrases") or []
    if len(phrases) >= 3:
        got += 1
    else:
        notes.append(("WARN", "diet", f"diet.phrases has {len(phrases)} (want >= 3 local ordering phrases)"))
    return got / 3


def c_links(rule, notes):
    links = rule.get("links") or []
    if len(links) < MIN_LINKS:
        notes.append(("WARN", "links", f"{len(links)} useful links (want >= {MIN_LINKS}: transport booking, weather, ride-hail, car hire, groceries, veg/vegan, adventure/official)"))
    return min(1.0, len(links) / MIN_LINKS)


def c_structure(rule, notes):
    order = _city_order(rule)
    cities = _itin_cities(rule)
    if not order:
        notes.append(("FAIL", "structure", "itinerary.cityOrder is empty"))
        return 0.0
    ok = 0
    for name in order:
        city = cities.get(name)
        if not city:
            notes.append(("FAIL", "structure", f"cityOrder lists '{name}' but itinerary.cities has no such entry"))
            continue
        mn, rc, mx = city.get("minDays", 0), city.get("recDays", 0), city.get("maxDays", 0)
        if not (mn <= rc <= mx and mn >= 1):
            notes.append(("WARN", "structure", f"{name}: implausible day bounds min={mn} rec={rc} max={mx}"))
            ok += 0.5
        elif not city.get("days"):
            notes.append(("FAIL", "structure", f"{name}: no authored days[]"))
        else:
            ok += 1
    return ok / len(order)


def c_day_depth(rule, notes):
    days = list(_all_days(rule))
    if not days:
        return 0.0
    total = 0.0
    thin = []
    for i, day in enumerate(days):
        sub = 0.0
        if day.get("theme"):
            sub += 0.2
        if day.get("pace"):
            sub += 0.2
        if day.get("note"):
            sub += 0.2
        acts = [a for a in day.get("activities", []) or [] if isinstance(a, dict)]
        if acts:
            enriched = [a for a in acts if a.get("priority") and a.get("duration")]
            sub += 0.4 * (len(enriched) / len(acts))
        total += sub
        if sub < 0.6:
            thin.append(day.get("theme") or f"day#{i+1}")
    if thin:
        notes.append(("WARN", "day-depth", f"{len(thin)} day(s) lack pace/note/priority+duration (e.g. {', '.join(thin[:3])})"))
    return total / len(days)


def c_feasibility(rule, notes):
    days = list(_all_days(rule))
    if not days:
        return 0.0
    ok = 0
    for i, day in enumerate(days):
        acts = [a for a in day.get("activities", []) or [] if isinstance(a, dict)]
        must = sum(1 for a in acts if a.get("priority") == "must-see")
        if must > MAX_MUST_SEE_PER_DAY:
            notes.append(("WARN", "feasibility", f"{day.get('theme', 'day#'+str(i+1))}: {must} must-see (> {MAX_MUST_SEE_PER_DAY}) — not feasible in a day"))
        elif len(acts) > MAX_ACTS_PER_DAY:
            notes.append(("WARN", "feasibility", f"{day.get('theme', 'day#'+str(i+1))}: {len(acts)} activities (> {MAX_ACTS_PER_DAY}) — trim or split"))
        else:
            ok += 1
    return ok / len(days)


def c_hotels(rule, notes):
    cities = _itin_cities(rule)
    order = _city_order(rule)
    if not order:
        return 0.0
    ok = 0
    for name in order:
        city = cities.get(name) or {}
        days = city.get("days") or []
        hotels = (days[0].get("hotels") if days else None) or []
        tiers = {"budget": 0, "mid": 0, "premium": 0}
        for h in hotels:
            t = h.get("tier")
            if t in tiers:
                tiers[t] += 1
        good = sum(1 for t in tiers.values() if t >= HOTELS_PER_TIER)
        if good == 3:
            ok += 1
        else:
            ok += good / 3
            notes.append(("WARN", "hotels", f"{name}: hotels are {tiers} on arrival day (want {HOTELS_PER_TIER}/{HOTELS_PER_TIER}/{HOTELS_PER_TIER} budget/mid/premium)"))
    return ok / len(order)


def c_connection_modes(rule, notes):
    conns = _connections(rule)
    if not conns:
        notes.append(("WARN", "transport", "no itinerary.connections authored"))
        return 0.0
    ok = 0
    for conn in conns:
        modes = conn.get("modes") or []
        viable = [m for m in modes if m.get("duration") and m.get("cost")]
        if viable:
            ok += 1
        else:
            notes.append(("WARN", "transport", f"{conn.get('from')}->{conn.get('to')}: no modes[] with duration+cost"))
    return ok / len(conns)


def c_connection_coverage(rule, notes):
    order = _city_order(rule)
    if len(order) < 2:
        return 1.0
    conns = _connections(rule)
    pairs = {(c.get("from"), c.get("to")) for c in conns}
    pairs |= {(b, a) for (a, b) in pairs}
    covered = 0
    for a, b in zip(order, order[1:]):
        if (a, b) in pairs:
            covered += 1
        else:
            notes.append(("WARN", "transport", f"no connection for consecutive stops {a} -> {b} (a 'how do I get there' gap)"))
    return covered / (len(order) - 1)


def c_currency(rule, notes):
    costs = list(_all_costs(rule))
    # Only numeric prices must carry the INR symbol; qualitative costs like
    # "Free", "Included" or "Varies" legitimately have no figure.
    priced = [c for c in costs if re.search(r"\d", str(c))]
    if not priced:
        return 1.0
    with_inr = [c for c in priced if INR in str(c)]
    if len(with_inr) < len(priced):
        offenders = [c for c in priced if INR not in str(c)][:5]
        notes.append(("WARN", "currency", f"{len(priced) - len(with_inr)}/{len(priced)} numeric costs lack the {INR} the app renders in (e.g. {offenders})"))
    return len(with_inr) / len(priced)


CRITERIA = [
    ("metadata", 1, c_metadata),
    ("prices_fresh", 1, c_prices_fresh),
    ("diet", 1, c_diet),
    ("links", 1, c_links),
    ("structure", 2, c_structure),
    ("day_depth", 3, c_day_depth),
    ("feasibility", 2, c_feasibility),
    ("hotels", 2, c_hotels),
    ("connection_modes", 2, c_connection_modes),
    ("connection_coverage", 2, c_connection_coverage),
    ("currency", 1, c_currency),
]


def audit(rule: dict):
    notes: list[tuple[str, str, str]] = []
    scores = {}
    wsum = 0.0
    acc = 0.0
    for name, weight, fn in CRITERIA:
        frac = max(0.0, min(1.0, fn(rule, notes)))
        scores[name] = round(frac * 100)
        acc += frac * weight
        wsum += weight
    return round(acc / wsum * 100), scores, notes


def main() -> int:
    ap = argparse.ArgumentParser(description="Audit a destination rule JSON against the gold standard.")
    ap.add_argument("path", help="Path to a consolidated rule JSON")
    ap.add_argument("--json", action="store_true", help="Emit machine-readable JSON")
    ap.add_argument("--strict", action="store_true", help="Also fail (exit 1) when score < 90")
    args = ap.parse_args()

    try:
        with open(args.path, encoding="utf-8") as fh:
            rule = json.load(fh)
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: cannot read {args.path}: {exc}", file=sys.stderr)
        return 1

    score, scores, notes = audit(rule)
    name = rule.get("name", args.path)
    has_fail = any(level == "FAIL" for level, _, _ in notes)

    if args.json:
        print(json.dumps({"name": name, "score": score, "criteria": scores,
                          "findings": [{"level": l, "area": a, "message": m} for l, a, m in notes]}, indent=2))
    else:
        print(f"\n{name} — completeness {score}/100")
        print("  " + "  ".join(f"{k}:{v}" for k, v in scores.items()))
        if notes:
            print("  findings:")
            for level, area, msg in notes:
                print(f"    [{level}] {area}: {msg}")
        else:
            print("  no findings — meets the bar.")

    if has_fail:
        return 1
    if args.strict and score < 90:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
