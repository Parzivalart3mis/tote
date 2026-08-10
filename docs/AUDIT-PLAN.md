# Tote — Audit Plan

## Executive Summary

Tote is a solo-built, personally-used grocery app (per-store shopping lists + a
pantry inventory, AI categorization, and self-hosted push reminders) live on
Vercel with one real user. It has been heavily and recently worked on, and it
shows: every data API route is authenticated and `userId`-scoped, the image
proxy has an SSRF guard with a test, the push/cron path was smoke-verified live,
and the test suite (93 tests) and production build are both green. There is no
multi-tenant scoping bug, no exposed secret, and no broken core journey. Given
the stated calibration (1 user, ~3 in six months, 2 hrs/week, reliability over
everything), most of what a generic audit would flag simply does not apply here.

The real problems are the **quality gates**, not the product. `npm run typecheck`
exits 1 with 5 errors and `npm run lint` exits 1 with 6 errors — both entirely
in test files or from React-Compiler lint rules, none blocking the build, but a
red gate is exactly the "needs attention later" liability the owner wants to
avoid. A future CI would be born broken, and real new type/lint regressions
would hide in the existing noise. The second gap is observability on the one
**unattended** path: `sendToUser` swallows every non-404/410 push failure with
no log, so if delivery silently breaks (VAPID rotation, push-service 5xx),
cron-job.org still reports 200 and the owner gets no signal.

The safe, high-value pass is small on purpose: make `typecheck` green (test-only
type fixes, zero app-behaviour risk), remove one unsafe test import, and add
server-side logging for unexpected push errors. The lint errors that live in
daily-used UI components (theme load, search, the pantry list animations) are
deferred — they are cosmetic React-Compiler rules, and rewriting behaviour the
owner sees every day to appease a linter is the wrong trade at this scale and
against this app's history of subtle animation regressions. Dependency CVEs and
a real README are deferred as package-bump / P3 work.

## Ground Truth

Captured 2026-08-10 on branch `main` (Step 0 skipped — already `main`).

| Command | Result |
|---|---|
| install | skipped — `node_modules` present |
| `npm run build` | **exit 0** — Compiled successfully |
| `npm test` | **exit 0** — 8 files, **93 tests pass** |
| `npm run typecheck` (`tsc --noEmit`) | **exit 1 — 5 errors** (1 in `pantry-sort.test.ts`, 4 in `pantry-to-store.test.ts`) |
| `npm run lint` | **exit 1 — 6 errors, 9 warnings** |
| `npm audit` | 20 vulns (2 low, 6 moderate, 12 high) |
| `git remote -v` | `origin` → github.com/Parzivalart3mis/tote |

Baseline bar every commit must clear: **build green, 93 tests green.** Typecheck
and lint are red at baseline; the bar is "no worse", and this pass makes
typecheck green.

No `.github/workflows` (no CI) — the gates are run by hand / pre-commit only.
No error-tracking or analytics dependency.

## Findings

### TEST-01 — `npm run typecheck` fails (5 errors, all in test files)
**Status:** [verified]
**Evidence:** `tsc --noEmit` exit 1. `pantry-sort.test.ts:119` — `const seen = [mode]` is inferred as `'manual'[]` (control-flow narrowing) so `seen.push(mode)` rejects a widened `PantrySortMode`. `pantry-to-store.test.ts:50-52` — `const entry = plan.entries[0]` is `T | undefined`, so `.kind`/`.source` access errors.
**Problem:** The typecheck gate is red, so it cannot catch real regressions and any future CI starts broken.
**Impact:** Maintainability — type errors hide in the noise; the owner can't trust `typecheck`.
**Fix:** Annotate `const seen: PantrySortMode[]`; guard the array access (`const entry = plan.entries[0]!` after asserting length, or narrow with a definedness check). Test code only — no app behaviour touched.
**Priority:** P1  **Effort:** S  **Depends on:** —
**Action:** IMPLEMENT

### TEST-02 — `require()` import in a test trips lint (`no-require-imports`)
**Status:** [verified]
**Evidence:** `tests/unit/schemas.test.ts:75` — `const { z } = require('zod')` → eslint error `@typescript-eslint/no-require-imports`.
**Problem:** One of the 6 lint errors; test-only, trivially fixable.
**Impact:** Contributes to the red lint gate.
**Fix:** Replace with a top-level `import { z } from 'zod'`. Behaviour identical.
**Priority:** P2  **Effort:** S  **Depends on:** —
**Action:** IMPLEMENT

### DEPLOY-01 — push send failures are swallowed with no server-side signal
**Status:** [verified]
**Evidence:** `lib/push.ts` `sendToUser` — the `catch` prunes on 404/410 and otherwise does nothing (`// Other errors … are swallowed`). The cron returns 200 regardless.
**Problem:** On the one path that runs unattended, a systemic delivery failure (expired/rotated VAPID, push-service 5xx) is invisible: cron-job.org sees 200, no Vercel log, no notification.
**Impact:** Reliability — reminders could silently stop and the owner would not know. Directly against "keep working on its own."
**Fix:** `console.error` (or `console.warn`) the endpoint + status on unexpected (non-404/410) failures. Purely additive — no control-flow or response change; the run still succeeds and stays idempotent.
**Priority:** P2  **Effort:** S  **Depends on:** —
**Action:** IMPLEMENT

### ARCH-01 — React-Compiler lint errors in daily-used UI components
**Status:** [verified]
**Evidence:** `lint` errors: `pantry-view.tsx:263` (`react-hooks/immutability` — `let seen` reassigned while computing section offsets), `pantry-view.tsx:594`/reads of `firstMount.current` during render (`react-hooks/refs`), `search-view.tsx:29`, `stores-grid.tsx:51`, `theme-toggle.tsx:19` (`set-state-in-effect`).
**Problem:** These are correctness-neutral React-Compiler style rules on code that works. Fixing them means rewriting how the theme loads, how search/stores sync, and how the pantry list staggers/animates.
**Impact:** Red lint gate — but no functional defect.
**Fix (deferred):** Restructure each to satisfy the rules without changing rendered behaviour.
**Priority:** P3  **Effort:** M  **Depends on:** —
**Action:** DEFERRED — touches behaviour the owner sees daily (theme load, search, pantry animations) to appease cosmetic lint rules; against the non-destructive/daily-behaviour autonomy rule and this component's history of subtle animation regressions.

### PERF-01 — 20 npm audit advisories (12 high)
**Status:** [verified]
**Evidence:** `npm audit` — 20 vulns; remediation needs `npm audit fix --force` (breaking bumps).
**Problem:** Transitive/dev advisories; none is a live exploit path at 1 user with no hostile traffic.
**Impact:** Low today; hygiene debt.
**Fix (deferred):** Review and bump packages deliberately.
**Priority:** P2  **Effort:** M  **Depends on:** —
**Action:** DEFERRED — requires package additions/removals/major bumps, which the autonomy rules place off-limits for this pass.

### FUNC-01 — AI categorize call has no client-side timeout
**Status:** [inferred]
**Evidence:** `app/api/stores/[id]/items/categorize/route.ts` awaits the Gemini call inside a try/catch that returns 502 on throw, but sets no timeout.
**Problem:** A hung provider request would hang the (user-initiated) categorize action until the platform timeout.
**Impact:** Minor; user-initiated, not unattended, and already error-guarded.
**Fix (deferred):** Wrap the provider call in an AbortController timeout.
**Priority:** P3  **Effort:** S  **Depends on:** —
**Action:** DEFERRED — P3; not additive-only (adds a new failure/abort path to a daily-used action).

### DOC-01 — README is create-next-app boilerplate
**Status:** [verified]
**Evidence:** `README.md` is the default template (Geist, `app/page.tsx`, etc.), describing nothing about Tote.
**Problem:** No real onboarding for future-you.
**Impact:** Low; solo project.
**Fix (deferred):** Replace with a real README (what it is, stack, env vars, scripts, cron/VAPID setup).
**Priority:** P3  **Effort:** S  **Depends on:** —
**Action:** DEFERRED — P3.

### SEC / UX / other categories
- **[SEC] No significant findings.** Every data route is authed and `userId`-scoped (20/20 reviewed); `/api/img` has an SSRF guard with a unit test; `/api/cron` is `CRON_SECRET`-gated and iterates users with proper scoping; no secret is committed (`.env.local` is git-ignored).
- **[UX] Branded splash — already implemented.** A theme-matched branded splash + route loading skeletons already exist and were browser-verified. No action; adding more would hurt perceived load.
- **[PERF] No significant runtime findings** beyond PERF-01.
- **[TEST] Pure logic is well covered** (sort, plan, reminders, schemas, SSRF). The cron route's auth guard is not unit-tested but was smoke-verified live; a module-mock test is P3 / deferred.

## Roadmap

| ID | Title | Priority | Effort | Depends on | Action |
|---|---|---|---|---|---|
| TEST-01 | typecheck green (test-file type errors) | P1 | S | — | IMPLEMENT |
| TEST-02 | remove `require()` import in test | P2 | S | — | IMPLEMENT |
| DEPLOY-01 | log unexpected push send failures | P2 | S | — | IMPLEMENT |
| ARCH-01 | React-Compiler lint in daily UI | P3 | M | — | DEFERRED |
| PERF-01 | npm audit advisories | P2 | M | — | DEFERRED |
| FUNC-01 | categorize timeout | P3 | S | — | DEFERRED |
| DOC-01 | real README | P3 | S | — | DEFERRED |

No dependency ordering between the three IMPLEMENT findings — they touch
disjoint files (two test files, one lib file).

## Deferred

- **ARCH-01** — behaviour-sensitive, cosmetic lint rules on daily-used components.
- **PERF-01** — needs off-limits package bumps.
- **FUNC-01** — P3, not additive-only.
- **DOC-01** — P3.
