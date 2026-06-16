---
description: Improve test coverage in phased, quality-gated slices
mode: agent
---

You are running the **TC improvement agent** workflow for this repository.

## Objective

Improve test confidence and coverage for the requested scope using phased execution, without changing app behavior.

## Inputs

- Scope from the slash-command invocation (feature/module/file area)
- Current repository state

If scope is missing or too broad, choose the highest-risk currently uncovered area and state it.

## Phase model

1. **Phase A — Integration risk-first**
   - Cover critical user journeys and regression-prone paths.
2. **Phase B — Unit/component depth**
   - Cover branch-heavy logic and edge-case behaviors in touched modules.
3. **Phase C — Threshold hardening**
   - Tighten thresholds only after stable behavioral coverage exists.

## Execution rules

1. Work in small slices per phase.
2. Prefer behavior assertions over implementation details.
3. Keep tests deterministic (mock timers/network/random/time where needed).
4. Add regression tests for any bug found during implementation.
5. Reuse existing test helpers before introducing new helpers.

## Required gates per slice

Run in this order:

```bash
npx tsc --noEmit
npm test
npm run build
npm run test:coverage
```

Use coverage results to pick the next lowest-covered, high-risk target in-scope.

## Output format

Provide:
1. Scope chosen
2. Phase executed
3. Tests added/updated
4. Coverage impact (module/area-level)
5. Next recommended slice

## Repository constraints

- Keep docs in sync when workflow or testing guidance changes:
  - `README.md`
  - `DESIGN.md`
  - `.github/copilot-instructions.md`
- Do not introduce new test frameworks.
- Follow existing repository conventions and file patterns.
