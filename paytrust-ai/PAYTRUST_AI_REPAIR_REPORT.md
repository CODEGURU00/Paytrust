# PayTrust AI — Repair and Remediation Report

**Report date:** 10 November 2026
**Scope:** Defects found during the 118-feature QA audit, their root causes, fixes and regression evidence
**Companion documents:** `PAYTRUST_AI_QA_REPORT.md`, `PAYTRUST_AI_FINAL_QA_REPORT.md`, `PAYTRUST_AI_FEATURE_MATRIX.md`, `PAYTRUST_AI_SECURITY_REPORT.md`

---

## 1. Summary

Three real defects were found through executed UI/API flows and fixed. All three affected the **DB-backed transaction workspace** or its **timeline**, not the demo-only pages.

| ID | Severity | Area | Defect | Fix status | Regression test |
|---|---|---|---|---|---|
| BUG-001 | Medium | Audit timeline | Transaction creation could sort after participant rows when timestamps tied | **Fixed** | `tests/unit/timeline.test.ts` → “keeps transaction creation first when participants share its timestamp” |
| BUG-002 | High | UUID transaction workspace | `counterparty` was `undefined` for DB transactions, crashing the workspace | **Fixed** | Playwright → “seeded UUID transaction renders the real database workspace” |
| BUG-003 | Medium | UUID transaction workspace | Hardcoded demo identity and `₹` rendered for a USD DB transaction | **Fixed** | Playwright same test asserts `$2,400.00` and zero `₹` |

**Verification after fixes:**

- Vitest: **79/79 passed**
- Playwright: **35/35 passed**
- Live API: **115/115 passed**
- Typecheck / lint / build: **passed** (0 lint errors)
- Production smoke: `/dashboard` 200, anonymous API 401

No tests were weakened, no security checks were disabled, and no unimplemented feature was marked complete to make the suite pass.

---

## 2. BUG-001 — Timeline tie-ordering put “Participant joined” before “Transaction created”

### 2.1 Symptom

The transaction timeline is assembled from multiple sources (transaction row, participants, messages, payments, agreements, commitments, milestones, evidence, disputes, audit events). When the transaction and its participant rows share the same `created_at`/`joined_at` timestamp, the first timeline item could be a participant event instead of “Transaction created”. The record then opened with the wrong event, which is misleading in an audit context.

### 2.2 Impact

- Medium: no data loss or authorization bypass, but audit chronology is a core trust claim.
- Reproducible in unit tests with equal timestamps; could appear on freshly created transactions where all rows are written in the same request.

### 2.3 Root cause

`buildTransactionTimeline` in `src/lib/server/timeline.ts` sorted by `occurred_at` and then by event `id` lexicographically. The transaction-created event had no priority, so a participant event with a lexicographically smaller ID could win the tie.

### 2.4 Fix

Before sorting, compute the transaction-created event ID:

```ts
const transactionCreatedId = `transaction:${input.transaction.id}:created`;
```

Then in the comparator, after comparing timestamps:

```ts
if (a.id === transactionCreatedId) return -1;
if (b.id === transactionCreatedId) return 1;
return a.id.localeCompare(b.id);
```

This guarantees the transaction opens the timeline at its own timestamp while keeping deterministic ordering for all other ties.

### 2.5 Files changed

- `src/lib/server/timeline.ts`

### 2.6 Regression tests

Added in `tests/unit/timeline.test.ts`:

- **“keeps transaction creation first when participants share its timestamp”** — constructs a transaction and participant rows with identical timestamps and asserts the transaction event is first.
- Existing **“sorts entries with equal timestamps by stable id”** continues to verify deterministic ordering for non-transaction ties.

### 2.7 Verification

- `npm run test:unit` — 79/79, including the new tie-order test.
- Live API timeline checks (`TIMELINE-buyer`, `TIMELINE-seller`, `TIMELINE-witness`) — 200 and correct participant scoping.
- Playwright UUID workspace test renders the timeline without errors.

### 2.8 Guardrail

Any future timeline source must either supply a unique `id` and timestamp or be folded into an existing event. The transaction-created event remains pinned first at equal timestamps by design.

---

## 3. BUG-002 — DB-backed workspace crashed because `counterparty` was undefined

### 3.1 Symptom

Opening a real seeded transaction at `/transactions/86a86553-60a3-4a19-a7dd-c8a10d0459ab` produced a runtime error / failed render. The page did not show the counterparty or the workspace sections reliably.

### 3.2 Impact

- High: the UUID workspace is the primary real-data surface. A crash blocks chat, evidence, commitments, milestones, agreements and payment actions for DB transactions.
- The defect did not affect demo transactions because those carry a `counterpartyId` that resolves in the demo people map.

### 3.3 Root cause

`src/components/legacy/transaction-detail-client.tsx` assumed the demo adapter’s person map always contained the transaction counterparty. DB transactions from `getTransactionById` do not carry `counterpartyId`; they carry joined `buyer`/`seller` profiles. The lookup returned `undefined`, and subsequent `counterparty.name` / avatar rendering crashed.

### 3.4 Fix

Derive the viewer and counterparty from the authenticated user and the joined profiles instead of assuming demo data:

```ts
const isBuyer = transaction.buyer_id === currentUserId;
const selfProfile = isBuyer ? transaction.buyer : transaction.seller;
const counterpartyProfile = isBuyer ? transaction.seller : transaction.buyer;

const demoCounterparty =
  people[tx.counterpartyId || ''] || demoPeople[tx.counterpartyId || ''];

const counterparty = demoCounterparty || {
  name: counterpartyProfile?.display_name || 'Counterparty',
  avatar: isBuyer ? 'priya' : 'rahul',
  verified: counterpartyProfile?.verification_status === 'verified',
};
```

- Demo transactions keep their richer demo identity.
- DB transactions now resolve the real profile display name and verification state.
- The fallback prevents a crash if a profile is missing.

`getTransactionById` in `src/actions/transactions.ts` already selects `buyer:profiles!transactions_buyer_id_fkey(...)` and `seller:profiles!transactions_seller_id_fkey(...)`, so no server change was required.

### 3.5 Files changed

- `src/components/legacy/transaction-detail-client.tsx`

### 3.6 Regression tests

Playwright `tests/e2e/ui.spec.ts`:

- **“seeded UUID transaction renders the real database workspace”** — signs in as the buyer, opens the seeded USD transaction, asserts the H1 title, transaction-linked chat, Evidence Vault and Promise Tracker are visible, and no page errors occurred.
- Helper `openDatabaseWorkspace` retries once if the dev server hits a transient compile/auth timeout. It does **not** relax assertions; a genuine product failure still fails the test.

### 3.7 Verification

- Playwright 35/35 passed.
- Live API transaction detail/participants/timeline/messages/evidence checks passed for all three roles.
- No console/page errors on the workspace test.

### 3.8 Guardrail

The workspace must never assume demo-only fields for DB records. Any new person/identity display must use joined profiles with a safe fallback.

---

## 4. BUG-003 — Hardcoded demo identity and rupee symbol in a USD transaction

### 4.1 Symptom

The DB-backed USD transaction (`$2,400.00`) displayed the current user as **“Arjun Sharma (you)”** and used the rupee symbol (`₹`) in amount/description rendering. The data is USD and the authenticated user is not Arjun Sharma.

### 4.2 Impact

- Medium: incorrect financial formatting and false identity are trust-breaking in a payment product.
- Could misstate amounts/currency during review or dispute.
- Detected by a targeted Playwright assertion after the workspace was fixed.

### 4.3 Root cause

The legacy workspace was adapted from the demo UI and retained two demo assumptions:

1. A hardcoded self name (`Arjun Sharma (you)`) instead of the authenticated profile.
2. `formatINR`/literal `₹` instead of the transaction’s `currency`.

### 4.4 Fix

- Derive the self name from the joined `buyer`/`seller` profile:
  ```ts
  const selfName = selfProfile?.display_name || demoPeople.arjun.name;
  ```
  and render it with the “(you)” suffix where appropriate.
- Replace rupee formatting with `formatCurrency(transaction.amount, transaction.currency)` for:
  - agreement description
  - main amount
  - released amount
  - held amount
- Keep demo avatars as a visual fallback only.

### 4.5 Files changed

- `src/components/legacy/transaction-detail-client.tsx`

### 4.6 Regression tests

Playwright **“seeded UUID transaction renders the real database workspace”**:

```ts
await expect(page.getByText('$2,400.00').first()).toBeVisible();
await expect(page.getByText(/₹/)).toHaveCount(0);
```

This makes the currency regression explicit: a USD transaction must never render a rupee symbol.

### 4.7 Verification

- Playwright 35/35 passed, including the USD assertion.
- Live API created and read USD transactions successfully.
- Unit `validations.test.ts` confirms only supported ISO currencies are accepted.

### 4.8 Guardrail

All money display must go through `formatCurrency(amount, currency)`. No literal currency symbols or demo identities in DB-backed views.

---

## 5. Test infrastructure added during repair

The project previously had no automated suite. The following was added to make the fixes verifiable and prevent regressions:

| Asset | Purpose |
|---|---|
| `vitest.config.ts` | Node-environment Vitest config with `@/` alias |
| `tests/unit/ai.test.ts` | Prompt neutrality, untrusted-data fencing, JSON/schema handling |
| `tests/unit/attachments.test.ts` | Upload allowlist, size, filename sanitization |
| `tests/unit/qr.test.ts` | QR format detection and validation |
| `tests/unit/timeline.test.ts` | Chronology + BUG-001 regression |
| `tests/unit/transactions-access.test.ts` | Buyer/seller/witness authorization |
| `tests/unit/trust-passport.test.ts` | Stats and privacy gating |
| `tests/unit/validations.test.ts` | Zod schemas across all domains |
| `playwright.config.ts` | Chrome channel, web-server reuse, JSON/HTML evidence |
| `tests/e2e/auth.setup.ts` | Buyer session storage state |
| `tests/e2e/ui.spec.ts` | 34 UI/route/workspace/regression tests |
| `scripts/qa/live-api.mjs` | 115 authenticated API checks with cookie jar |
| `scripts/qa/lib/sessions.mjs` | Supabase cookie-session login helper |
| `npm` scripts | `test`, `test:unit`, `test:watch`, `test:e2e`, `test:live`, `qa:api` |

Additional supporting changes:

- Exported `parseStructuredJson` and `normalizeDealDnaPayload` from `src/lib/ai.ts` so prompt/JSON logic is unit-testable.
- Updated `.env.example` with Supabase, PayPal, Gemini, app URL, seed and QA variables plus sandbox/no-secrets warnings.
- Updated `README.md` and `SETUP.md` with exact test commands, evidence locations and the verified baseline.
- Removed stale “no automated test suite” documentation.

---

## 6. Issues investigated and intentionally not “fixed”

These were reviewed and classified as correct behaviour or out of scope. They are documented so future audits do not re-open them as defects.

| Observation | Why it is not a defect |
|---|---|
| Duplicate agreement approval by the same party before the counterparty acts succeeds | It changes that party’s decision; the product intentionally allows a party to revise before both approvals are final. After final approval it is rejected with `409`. |
| Same party cannot approve twice after final approval (`409`) | Correct immutability of the approved version. |
| Witness cannot post in party chat / approve agreements / invite participants (`403`) | Witness is read-only by policy. |
| Private evidence returns `404` (not `403`) to a non-uploader | RLS hides the row; `404` avoids confirming existence. Secure behaviour. |
| Private Trust Passport returns `404` to another user | Same existence-hiding rationale. |
| Unsigned webhook returns `500` instead of `401` when config is missing | Data is not mutated and the request is rejected; the status-code semantics are recorded as a security hardening item, not a vulnerability. |
| PayPal create-order returns `500` | Credentials missing/invalid; classified BLOCKED, not a code bug. |
| Gemini routes return `502` | Invalid API key; classified BLOCKED. |
| New signup cannot sign in | Email confirmation required by the hosted project; seeded accounts used. Not a code defect. |

---

## 7. Regression and verification evidence

### 7.1 Commands run

```bash
npm run test:unit
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:live
```

### 7.2 Results

| Check | Result |
|---|---|
| Vitest | **79/79 passed** |
| Playwright | **35/35 passed** (1 setup + 34 UI) |
| Live API | **115/115 passed** |
| Typecheck | passed |
| ESLint | 0 errors / 64 warnings |
| Build | passed, all routes compiled |
| Production smoke | `/dashboard` 200; anonymous API 401 |

### 7.3 Evidence files

- `scripts/qa/results/live-api.json` — run `20261110060054`
- `scripts/qa/results/playwright.json` — 35 expected, 0 unexpected, 0 flaky
- `prod-server.log` — production smoke
- `dev-server.log` — development server evidence

---

## 8. Residual defects / known limitations

No failing executed test remains. The following are **known limitations**, not repaired in this pass because they require product decisions, external credentials or broader hardening:

1. **Demo-first UI** — 26 features are local-state simulations. Converting them to real backend features is a product roadmap item, not a bug fix.
2. **PayPal provider** — cannot be verified without valid sandbox credentials and webhook ID.
3. **Gemini provider** — cannot be verified without a valid API key.
4. **No rate limiting / CSP** — security hardening items documented in `PAYTRUST_AI_SECURITY_REPORT.md`.
5. **Upload MIME is client-declared** — magic-byte validation/malware scanning recommended.
6. **No hosted CI** — suites are CI-ready but no workflow is committed.
7. **Dependency advisories** — 11 npm advisories remain; fixes require major upgrades (`zod@4`, `vitest@5`, ESLint toolchain) and should be handled as a dedicated dependency-upgrade change with full regression.

---

## 9. Change log

| Date | Change | Files |
|---|---|---|
| 10 Nov 2026 | Fixed timeline tie ordering; added regression test | `src/lib/server/timeline.ts`, `tests/unit/timeline.test.ts` |
| 10 Nov 2026 | Fixed undefined counterparty for DB transactions | `src/components/legacy/transaction-detail-client.tsx` |
| 10 Nov 2026 | Replaced hardcoded identity/rupee formatting with profile + `formatCurrency` | `src/components/legacy/transaction-detail-client.tsx` |
| 10 Nov 2026 | Added Vitest/Playwright/live API suites and npm scripts | `vitest.config.ts`, `playwright.config.ts`, `tests/**`, `scripts/qa/**`, `package.json` |
| 10 Nov 2026 | Exported AI prompt/JSON helpers for testing | `src/lib/ai.ts` |
| 10 Nov 2026 | Updated environment contract and test documentation | `.env.example`, `README.md`, `SETUP.md` |

---

*All fixes were verified by executed tests after the change. No test result is inferred from code inspection.*

---

> **Superseded (2026-11-11).** This document records the QA pass of
> 10 November 2026. The release audit in
> [`docs/remediation/AUDIT.md`](./docs/remediation/AUDIT.md) supersedes it:
> it carries the current P0-P3 status, the verified baseline and the fixes
> applied since. Numbers quoted below reflect the state on 10 November.