#!/usr/bin/env bash
# check-new-coverage.sh — Flag new/changed .ts/.tsx files that lack test coverage.
# Usage:  ./scripts/check-new-coverage.sh [base-branch]
# Defaults to comparing against main.

set -euo pipefail

BASE="${1:-main}"
THRESHOLD=50  # minimum statement coverage % for new files

# 1. Generate JSON summary if not present
if [ ! -f coverage/coverage-summary.json ]; then
  echo "⏳ Generating coverage report..."
  npx vitest run --coverage --reporter=verbose 2>/dev/null || true
fi

if [ ! -f coverage/coverage-summary.json ]; then
  echo "❌ Could not generate coverage/coverage-summary.json"
  exit 1
fi

# 2. Get changed .ts/.tsx files (excluding tests, types, config)
CHANGED=$(git diff --name-only --diff-filter=ACMR "$BASE"...HEAD 2>/dev/null || \
          git diff --name-only --diff-filter=ACMR HEAD~5 2>/dev/null || \
          git diff --name-only --diff-filter=ACMR HEAD 2>/dev/null || echo "")

if [ -z "$CHANGED" ]; then
  echo "✅ No changed files to check."
  exit 0
fi

FLAGGED=0
CHECKED=0

echo ""
echo "🔍 Checking test coverage for changed source files..."
echo "   Base: $BASE | Threshold: ${THRESHOLD}%"
echo "   ─────────────────────────────────────────────────"

while IFS= read -r file; do
  # Skip non-source files
  [[ "$file" != src/*.ts && "$file" != src/*.tsx ]] && continue
  # Skip test files, types, configs
  [[ "$file" == *test* || "$file" == *spec* ]] && continue
  [[ "$file" == *vite-env* || "$file" == *setup.ts ]] && continue
  [[ "$file" == src/main.tsx ]] && continue

  CHECKED=$((CHECKED + 1))

  # Look up in coverage JSON
  ABS_PATH="$(pwd)/$file"
  COVERAGE=$(node -e "
    const data = require('./coverage/coverage-summary.json');
    const entry = data['$ABS_PATH'];
    if (!entry) { console.log('NONE'); process.exit(0); }
    const stmts = entry.statements;
    const pct = stmts.total === 0 ? 100 : Math.round(stmts.covered / stmts.total * 100);
    console.log(pct);
  " 2>/dev/null || echo "NONE")

  if [ "$COVERAGE" = "NONE" ]; then
    echo "   ⚠️  $file — no coverage data (not imported by any test)"
    FLAGGED=$((FLAGGED + 1))
  elif [ "$COVERAGE" -lt "$THRESHOLD" ]; then
    echo "   ⚠️  $file — ${COVERAGE}% coverage (below ${THRESHOLD}%)"
    FLAGGED=$((FLAGGED + 1))
  else
    echo "   ✅ $file — ${COVERAGE}%"
  fi
done <<< "$CHANGED"

echo ""
echo "   ─────────────────────────────────────────────────"
echo "   Checked: $CHECKED files | Flagged: $FLAGGED"

if [ "$FLAGGED" -gt 0 ]; then
  echo ""
  echo "   💡 Consider adding tests for flagged files."
  echo "   Run: npm run test:coverage to see the full HTML report."
  exit 1
fi

echo "   ✅ All changed files meet coverage threshold."
exit 0
