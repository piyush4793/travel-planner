#!/usr/bin/env python3
"""Rank every destination rule in a directory by gold-standard completeness.

Use this to pick the next enrichment target and to guarantee no destination is
missed. Reuses the exact check battery from ``validate_rule.py`` (single source
of truth for the bar — DRY), so the ranking and the per-file audit never drift.

Usage:
    python3 coverage_report.py <rules-dir> [--json] [--below N] [--top N]

Examples:
    python3 coverage_report.py data/rules
    python3 coverage_report.py data/domestic/india/rules --below 90
"""
from __future__ import annotations

import argparse
import json
import os
import sys

# Import the shared audit so the bar is defined once.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from validate_rule import audit  # noqa: E402


def scan(rules_dir: str):
    rows = []
    for entry in sorted(os.listdir(rules_dir)):
        if not entry.endswith(".json") or entry == "index.json":
            continue
        path = os.path.join(rules_dir, entry)
        try:
            with open(path, encoding="utf-8") as fh:
                rule = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            rows.append({"name": entry, "score": 0, "criteria": {}, "error": str(exc)})
            continue
        score, scores, notes = audit(rule)
        rows.append({
            "name": rule.get("name", entry),
            "file": entry,
            "score": score,
            "criteria": scores,
            "fails": sum(1 for lvl, _, _ in notes if lvl == "FAIL"),
            "warns": sum(1 for lvl, _, _ in notes if lvl == "WARN"),
        })
    rows.sort(key=lambda r: r["score"])
    return rows


def weakest_areas(row):
    return ", ".join(k for k, v in sorted(row.get("criteria", {}).items(), key=lambda kv: kv[1])[:3] if v < 100)


def main() -> int:
    ap = argparse.ArgumentParser(description="Rank destination rules by completeness (least-complete first).")
    ap.add_argument("rules_dir", help="Directory of consolidated rule JSONs")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--below", type=int, default=None, help="Only list rules scoring below N")
    ap.add_argument("--top", type=int, default=None, help="Only list the first N (lowest) rows")
    args = ap.parse_args()

    if not os.path.isdir(args.rules_dir):
        print(f"FAIL: not a directory: {args.rules_dir}", file=sys.stderr)
        return 1

    all_rows = scan(args.rules_dir)
    rows = all_rows
    if args.below is not None:
        rows = [r for r in rows if r["score"] < args.below]
    if args.top is not None:
        rows = rows[: args.top]

    if args.json:
        print(json.dumps(rows, indent=2))
        return 0

    scanned = len(all_rows)
    shown = len(rows)
    avg = round(sum(r["score"] for r in all_rows) / scanned) if scanned else 0
    shown_note = "" if shown == scanned else f", showing {shown}"
    print(f"\n{args.rules_dir} — {scanned} rule(s){shown_note}, avg completeness {avg}/100 (least-complete first)\n")
    print(f"  {'score':>5}  {'F/W':>7}  {'destination':<32}  weakest areas")
    print("  " + "-" * 78)
    for r in rows:
        fw = f"{r.get('fails', 0)}/{r.get('warns', 0)}"
        print(f"  {r['score']:>5}  {fw:>7}  {r['name'][:32]:<32}  {weakest_areas(r)}")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
