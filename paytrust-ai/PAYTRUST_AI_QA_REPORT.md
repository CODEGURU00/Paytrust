# PayTrust AI — Quality Assurance Audit Report

**Report date:** 10 November 2026
**Audit type:** Full feature, integration, security and usability QA
**Application:** PayTrust AI
**Repository:** `C:\Users\Chandan Yaduvanshi\Downloads\new paypal-20261108T051554Z-1-001\new paypal\paytrust-ai`
**Audit basis:** 118-feature audit prompt (`F001`–`F118`)
**Companion documents:** `PAYTRUST_AI_FEATURE_MATRIX.md`, `PAYTRUST_AI_REPAIR_REPORT.md`, `PAYTRUST_AI_FINAL_QA_REPORT.md`, `PAYTRUST_AI_SECURITY_REPORT.md`

---

## 1. Executive summary

PayTrust AI is a demo-first Next.js transaction platform with a real Supabase-backed transaction core. The QA pass exercised the application — it did not stop at static review. The executed suites were:

| Suite | Result | Evidence |
|---|---:|---|
| Vitest unit/regression tests | **79 / 79 passed** | Console output; `tests/unit/` |
| Playwright browser tests | **35 / 35 passed** (1 setup + 34 UI) | `scripts/qa/results/playwright.json` |
| Live authenticated API checks | **115 / 115 passed** | `scripts/qa/results/live-api.json`, run `20261110060054` |
| TypeScript typecheck | **PASS** | `npm run typecheck` |
| ESLint | **PASS**, 0 errors / 64 warnings | `npm run lint` |
| Production build | **PASS**, all routes compiled | `npm run build` |
| Production smoke | **PASS**, `/dashboard` 200, anonymous API 401 | `prod-server.log` |

The 118-feature matrix resolves to:

| Status | Count |
|---|---:|
| PASS | 41 |
| FAIL | 0 |
| PARTIAL | 25 |
| MOCKED | 26 |
| NOT IMPLEMENTED | 16 |
| BLOCKED | 10 |
| **Total** | **118** |

**Key conclusion:** the transaction, agreement, commitment, milestone, evidence, dispute, timeline, privacy and simulated-payment core is genuinely implemented and passes end-to-end tests. The wider 118-feature product is **not complete**: 26 features are demo/mock-only, 16 are absent, 25 are partial, and 10 cannot be verified because PayPal/Gemini credentials are missing or invalid.

**Readiness verdict:** suitable for controlled demo and staging review of the transaction core. **Not ready for production or real-money use.** Three fixed defects were found in the DB-backed workspace/timeline; no failing tests remain. AI and PayPal provider paths are **BLOCKED**, not passing.

---

## 2. Scope and method

### 2.1 In scope

- All 118 features listed in the audit prompt, grouped A–J.
- 38 API route handlers under `src/app/api/` and auth callback.
- 33 pages under `src/app/` (product pages, auth pages, public QR/transaction routes).
- Supabase schema, RLS, triggers, RPCs and storage policies in `supabase/setup-all.sql`.
- Buyer/seller/witness permissions and privacy boundaries.
- PayPal sandbox integration, webhook verification, and simulated payment fallback.
- Gemini prompt construction, structured-JSON handling, and live AI routes.
- UI behaviour at desktop and mobile widths; console/page errors and horizontal overflow.
- Secret handling, dependency vulnerabilities, and residual security risks.

### 2.2 Out of scope / not executable in this environment

- Real money movement, card capture, crypto, loans or securities — **intentionally never executed**.
- Live PayPal order/capture/webhook success — credentials absent/invalid.
- Live Gemini generation — API key invalid (`502`).
- New-user signup through email confirmation — requires Supabase admin confirmation.
- Independent local SQL migration execution — no local Postgres/psql/Docker/Supabase CLI available; SQL reviewed statically and exercised through the hosted project.
- Camera-based QR scanning in headless CI — parser and manual path tested; camera permission path not automated.

### 2.3 Method

1. Inventory of pages, route handlers, server actions, schema, RLS and environment contract.
2. Existing-defect triage and root-cause repair (see `PAYTRUST_AI_REPAIR_REPORT.md`).
3. Unit/regression tests for pure logic, prompts, validation, access decisions, timeline and passport privacy.
4. Authenticated live API suite using an `@supabase/ssr` cookie jar with seeded buyer/seller/witness sessions.
5. Playwright UI suite using installed Google Chrome (`channel: 'chrome'`), a saved auth state, and real seeded data.
6. Production build, production server smoke test, lint, typecheck and `npm audit`.
7. Status classification per executed evidence. Any feature without an executed success is not marked PASS.

### 2.4 Test identities and data

| Role | Email | User ID |
|---|---|---|
| Buyer | `buyer@paytrust.demo` | `0b142de1-8a4c-47fa-b33e-555a833229b6` |
| Seller | `seller@paytrust.demo` | `a8bc9a77-a5d7-48ba-bc15-29374735cf00` |
| Witness | `witness@paytrust.demo` | `cffd6e02-b958-45bc-98f4-49b2fb30b226` |

- Password is supplied by `DEMO_PASSWORD` (documented demo value only; not reproduced here).
- Seeded transaction: `86a86553-60a3-4a19-a7dd-c8a10d0459ab` — `$2,400.00` USD.
- Live-suite QA transaction: `c0e53bcc-6b96-4f08-868f-21687910cec0`.
- All payments were **simulated**. No provider order was captured.

---

## 3. System under test

### 3.1 Technology stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.4.5 App Router, React 19.3.0, TypeScript, Tailwind CSS 4 |
| Backend | Next.js route handlers/server actions (Node runtime) |
| Database/Auth | Supabase Postgres, Supabase Auth (`@supabase/ssr` cookie sessions), Storage, Realtime |
| Payments | PayPal Orders v2 (server-only client id/secret), webhook signature verification; simulated payment rail for QA |
| AI | Google Gemini via `@google/genai`, Zod-validated structured output |
| QR | `qrcode` generation, `@zxing/browser` camera decode, custom PayTrust/PayPal/UPI/EMVCo parser |
| Tests | Vitest 3.2.7, Playwright 1.65 (Chrome channel), custom live API runner |

### 3.2 Architecture notes

- The product is **demo-first**: most `(app)` pages read from a localStorage-backed `useDemo` provider. These features are classified MOCKED where the UI is the only implementation.
- The UUID route `/transactions/[id]` uses the **DB-backed legacy workspace** and real APIs. This is the primary end-to-end surface.
- The API layer authenticates with Supabase cookies, validates input with Zod, and enforces participant permissions in route handlers, backed by RLS.
- 18 tables have RLS enabled; `supabase/setup-all.sql` defines 42 policies, 26 functions/RPCs, triggers, storage policies and realtime publication entries.
- Payment writes prefer real PayPal when configured; simulated release/refund/milestone settlement is available for demos/tests.

### 3.3 Surface inventory

- **38** API route handlers.
- **33** pages (including `/`, auth pages, 23 authenticated product routes, UUID workspace, public QR scan and dispute routes).
- **7** test files / **79** unit tests.
- **12** Playwright test blocks expanding to **34** UI tests plus 1 auth setup.

---

## 4. Executed test results

### 4.1 Unit and regression suite (Vitest)

| File | Tests | Focus |
|---|---:|---|
| `tests/unit/ai.test.ts` | 15 | Prompt neutrality, untrusted-data labelling, empty/long input, JSON extraction/normalization, schema acceptance |
| `tests/unit/attachments.test.ts` | 10 | MIME allowlist, size cap, filename sanitization/traversal |
| `tests/unit/qr.test.ts` | 9 | PayTrust, PayPal, UPI, EMVCo, unknown, amount/reference validation |
| `tests/unit/timeline.test.ts` | 7 | Chronology, dedupe, truncation, tie ordering (BUG-001 regression), AI-review labels |
| `tests/unit/transactions-access.test.ts` | 9 | Buyer/seller/witness permissions, 403/404/500, party-only actions |
| `tests/unit/trust-passport.test.ts` | 5 | Totals/rates/milestones, privacy gating, owner view, empty history, errors |
| `tests/unit/validations.test.ts` | 24 | Transactions, messages, agreements, commitments, milestones, disputes, payments, privacy, extraction, UUID/QR |
| **Total** | **79** | **All passed** |

### 4.2 Playwright browser suite

**35/35 passed** (1 auth setup + 34 tests), duration ≈ 96.6 s.

Coverage:

- Anonymous demo dashboard and transaction list.
- Invalid-login rejection; recovery/signup links.
- 23 product routes return HTTP 200, render the expected heading, produce no page errors/console errors, and have no horizontal overflow.
- Signed-in identity/verified badge in the profile menu.
- Command palette open/close with `Ctrl+K`.
- **Seeded real UUID workspace** renders and displays USD `$2,400.00` with **no `₹`** (BUG-002/BUG-003 regression).
- UI chat send persists across reload.
- Trust passport privacy switches change state.
- Mobile drawer navigation and mobile workspace without horizontal scroll.

Evidence: `scripts/qa/results/playwright.json` (JSON reporter) and Playwright HTML report output.

### 4.3 Live authenticated API suite

**115/115 passed** against the real dev server and hosted Supabase project, run `20261110060054`, started `2026-11-10T06:01:54Z`.

Verified end-to-end:

- Anonymous rejection on transactions, detail, timeline, messages, passport and disputes (`401`).
- Participant reads for buyer/seller/witness; non-participant hidden (`404`).
- Witness restrictions on chat, commitments, approvals and participant invites (`403`).
- Transaction creation, witness invite, participant listing.
- Message validation and persistence; party-only chat.
- Agreement draft → submit → buyer/seller approval; witness rejection; silent edit after approval (`409`); invalid decision (`400`).
- Commitments create/update/complete; milestone create/submit/approve; invalid transitions rejected.
- Evidence upload (PNG), listing, signed URL, access log, private evidence hidden from non-uploader (`404`), invalid action (`400`).
- Dispute draft → open → statement → resolve; witness denial.
- QR generation and payload storage; malformed QR input rejected.
- Simulated milestone payment (`201`), duplicate release (`409`), refund (`201`), duplicate refund (`409`), payment event in timeline.
- Public/private Trust Passport, privacy toggles and restoration; private passport `404`.
- Webhook malformed JSON (`400`) and unsigned event rejected (`500`); no data mutation.
- Input validation: bad UUID (`400`), bad kind (`400`), bad currency/email/amount.

### 4.4 Build, lint, typecheck, production smoke

| Check | Result |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS, 0 errors / 64 warnings |
| `npm run build` | PASS; 28 static pages generated, all route handlers compiled |
| `npm start` + `/dashboard` | `200` |
| Anonymous `GET /api/transactions` | `401` |
| `npm audit` | 11 vulnerabilities (8 moderate, 1 high, 2 critical) — see security report |

### 4.5 Performance observations (live API)

| Metric | Value |
|---|---:|
| Checks measured | 115 |
| Min | 31 ms |
| Median | 312 ms |
| Average | 505 ms |
| p95 | 1,564 ms |
| Max | 1,873 ms |
| Total suite wall time | ≈ 58 s |

Slowest calls were writes (milestone update, agreement submit, dispute update, commitment update), signed-URL generation, message listing and passport reads. These are acceptable for a demo/dev server but include cold-start/compile effects and should not be treated as production SLOs.

---

## 5. Feature coverage by category

Status counts are identical to `PAYTRUST_AI_FEATURE_MATRIX.md`.

| Category | Features | PASS | PARTIAL | MOCKED | NOT IMPL. | BLOCKED |
|---|---:|---:|---:|---:|---:|---:|
| A. Payments and financial infrastructure | 20 | 8 | 4 | 5 | 1 | 2 |
| B. Transaction-linked communication | 10 | 5 | 3 | 1 | 1 | 0 |
| C. AI transaction intelligence | 14 | 1 | 2 | 6 | 4 | 1 |
| D. Trust and reputation | 12 | 6 | 2 | 1 | 2 | 0 |
| E. AI dispute resolution and protection | 12 | 4 | 2 | 1 | 0 | 4 |
| F. Agreement and contract management | 12 | 7 | 5 | 0 | 0 | 0 |
| G. Business and freelancer ecosystem | 10 | 0 | 0 | 7 | 3 | 0 |
| H. Advanced financial features | 8 | 0 | 1 | 0 | 7 | 0 |
| I. Ecosystem modules | 8 | 3 | 3 | 1 | 0 | 2 |
| J. Security, account and platform infrastructure | 12 | 7 | 3 | 1 | 0 | 1 |
| **Total** | **118** | **41** | **25** | **26** | **16** | **10** |

Category totals are derived from the matrix rows; the matrix is the authoritative per-feature record.

### 5.1 What genuinely works (PASS examples)

- Transaction creation, listing and UUID workspace; USD/format correctness.
- Buyer/seller/witness authorization and party-only chat.
- Agreement versioning and mutual approval; approved-version immutability.
- Commitments and milestones lifecycle.
- Evidence Vault: private storage, signed URLs, access logging, privacy controls, MIME allowlist, size cap, checksums.
- Dispute creation, statements and resolution workflow.
- Transaction timeline/audit events with stable ordering.
- Trust Passport stats and privacy toggles, public/private sharing.
- QR generation and multi-format recognition (parser).
- Simulated payment/refund/milestone settlement with idempotency.
- Auth session handling, API input validation, RLS-backed access.
- Webhook signature verification logic and idempotent provider-event recording.

### 5.2 What is only demo/mock (MOCKED examples)

Send/request UI, payment links, split payments, subscriptions, business wallet, financial memory, AI assistant/risk/guardian pages, client CRM, analytics, invoices, business dashboard/notifications, milestone badges, account recovery and data export. These render and respond in the browser but write only local demo state.

### 5.3 What is partial (PARTIAL examples)

- Seller receive/payout is visibility only.
- UPI recognition without UPI settlement.
- QR camera flow not exercised headlessly.
- Payment history UI is demo-backed although the API is real.
- Receipts exist as evidence, not generated receipts.
- Image/document sharing occurs through Evidence Vault rather than inline chat.
- AI summaries/reminders partly deterministic or blocked.
- Change requests, revision/cancellation policies and deadline tracking lack enforcement/schedulers.
- Trust badges/identity verification have no KYC workflow.
- Webhooks verify signatures but the valid-signature path is unverified.
- Notification/account recovery/data export are demo-only.

### 5.4 What is absent (NOT IMPLEMENTED)

Currency conversion, message references, commitment forecast, voice-to-agreement, relationship graph, AI invoice generation, freelancer portfolio/verified work, reconciliation, crypto wallet/payments, loans/lending/repayment, cross-border assistant, financial continuity.

### 5.5 What cannot be verified (BLOCKED)

AI Deal DNA, AI summarizer, neutral mediator, evidence summarizer, conflicting-claim detection, resolution suggestions, PayTrust AI as a live capability, external integrations, PayPal provider integration, and parts of webhook processing — all due to invalid/missing Gemini or PayPal credentials.

---

## 6. Defects found and fixed

| ID | Severity | Summary | Status |
|---|---|---|---|
| BUG-001 | Medium | Timeline could open with “Participant joined” before “Transaction created” when timestamps tie | **FIXED** + regression test |
| BUG-002 | High | DB-backed UUID workspace crashed because `counterparty` was undefined for non-demo transactions | **FIXED** + E2E regression |
| BUG-003 | Medium | Hardcoded `Arjun Sharma (you)` identity and `₹` symbol rendered in a USD DB transaction | **FIXED** + currency E2E assertion |

Full root cause, files and verification: `PAYTRUST_AI_REPAIR_REPORT.md`.

**False positives / intentional behaviour (not defects):**

- Duplicate agreement approval by the same party before the counterparty acts changes that party's decision — intentional. After final approval it is rejected with `409`.
- Private passport/evidence returning `404` to another user is deliberate existence-hiding, not an IDOR.
- Witness read-only chat/party-only action failures (`403`) are policy, not bugs.
- `403` on private evidence is unreachable because RLS hides rows first; `404` is the secure outcome.

---

## 7. Security testing summary

Detailed findings and residual risk are in `PAYTRUST_AI_SECURITY_REPORT.md`. Headline results:

- Anonymous API access rejected (`401`) on all tested protected resources.
- Non-participant reads hidden (`404`); witness party-only actions rejected (`403`).
- Private evidence and private passports not disclosed; RLS enforces the boundary.
- Input validation rejects malformed UUIDs, unknown fields, bad enums/amounts/currencies and invalid webhook JSON.
- Uploads: allowlisted MIME, 10 MB cap, sanitized filenames, private bucket, signed URLs, SHA-256 checksum, access log.
- Webhooks: raw-body signature verification; unsigned/invalid events do not mutate data.
- No hardcoded provider secrets found in tracked source; `.env.local` is git-ignored.
- **Residual risks:** no application rate limiting, no CSP/security headers, client-declared MIME type (no magic-byte sniffing), missing webhook config returns `500` instead of `503`, and 11 dependency advisories including 2 critical (dev/test tooling) and 1 high (`zod`).

---

## 8. External dependency limitations

### 8.1 PayPal — BLOCKED

- `POST /api/payments/create-order` returns `500` because `PAYPAL_CLIENT_ID`/`PAYPAL_CLIENT_SECRET` are missing or invalid.
- No sandbox order was created or captured.
- Webhook valid-signature flow cannot run without `PAYPAL_WEBHOOK_ID`.
- The UI and server code paths exist; simulated payments were used for lifecycle testing.

### 8.2 Gemini — BLOCKED

- Live AI endpoints return `502` with an invalid-key error from the provider.
- Prompt construction, neutrality safeguards, untrusted-data fencing, JSON extraction/normalization and Zod schemas are unit-tested.
- No live AI output is claimed as verified.

### 8.3 Signup/email

- New accounts require email confirmation in the hosted Supabase project and cannot sign in until confirmed. Seeded accounts were used for all authenticated testing.
- Password recovery page is explicitly demo-only; no live reset email was tested.

### 8.4 Database tooling

- No local Postgres/psql/Docker/Supabase CLI was available to execute migrations independently. The hosted database was exercised through the application; SQL was reviewed statically (18 RLS tables, 42 policies, 26 functions).

---

## 9. Residual product risks

| Risk | Impact | Mitigation / recommendation |
|---|---|---|
| Demo-first UI vs real backend | Reviewers may believe demo actions are persisted | Keep “Demo workspace / simulated” labels; prioritize wiring the 26 MOCKED features or clearly scope them out |
| No rate limiting | Brute force/abuse of auth and write endpoints | Add edge/WAF and per-user/IP limits |
| No CSP/security headers | XSS/supply-chain exposure | Add CSP, HSTS, frame-ancestors, nosniff, referrer policy |
| Client-declared upload MIME | Malicious payload disguised as allowed type | Add magic-byte sniffing and malware scanning |
| Webhook config returns 500 | Monitoring noise; unclear unavailability semantics | Return `503` when provider config is absent; keep `401` for bad signatures |
| Dependency advisories | Known vulnerabilities in tooling/runtime validation | Upgrade `zod@4`, `vitest@5`, ESLint toolchain in a dedicated change |
| No hosted CI | Regressions can merge unnoticed | Add CI workflow running unit/typecheck/lint/build, then E2E/live in a protected environment |
| AI/PayPal unverified | Launch claims unsupported | Treat as BLOCKED until valid sandbox credentials and recorded success evidence exist |

---

## 10. Readiness assessment

| Target | Verdict | Rationale |
|---|---|---|
| Controlled demo of transaction core | **Ready with conditions** | 115/115 live checks, 35/35 E2E, 79/79 unit; all payments simulated and labelled |
| Internal staging/UAT | **Conditionally ready** | Core works; 26 mock-only and 16 absent features must be scoped; add CI and rate limiting |
| Public beta | **Not ready** | Large unimplemented surface, demo/real ambiguity, no rate limiting/CSP, dependency advisories |
| Production / real-money | **Not ready** | PayPal and Gemini unverified; no real settlement, KYC, reconciliation or operational controls; security hardening incomplete |
| Security sign-off | **No** | No rate limiting, no CSP, MIME spoofing risk, unresolved dependency advisories |

**Overall:** 41 of 118 features are fully verified, with zero failing executed tests. The verified core is materially stronger than a prototype, but the product as a whole is incomplete and externally blocked on AI/payment credentials.

---

## 11. Evidence index

| Evidence | Path |
|---|---|
| Live API results (115 checks, run ID) | `scripts/qa/results/live-api.json` |
| Playwright results (35 tests) | `scripts/qa/results/playwright.json` |
| Playwright HTML report | `scripts/qa/results/` / `playwright-report/` |
| Live suite source | `scripts/qa/live-api.mjs` |
| Unit tests | `tests/unit/*.test.ts` |
| E2E tests and auth setup | `tests/e2e/ui.spec.ts`, `tests/e2e/auth.setup.ts` |
| Playwright config | `playwright.config.ts` |
| Production smoke log | `prod-server.log` |
| Development server log | `dev-server.log` |
| Feature status register | `PAYTRUST_AI_FEATURE_MATRIX.md` |
| Bug repairs | `PAYTRUST_AI_REPAIR_REPORT.md` |
| Security findings | `PAYTRUST_AI_SECURITY_REPORT.md` |
| Final verdict | `PAYTRUST_AI_FINAL_QA_REPORT.md` |

---

## 12. Reproduction instructions

### Prerequisites

- Node.js 20+ (tested with Node 24.11.0), npm.
- Google Chrome installed for Playwright (or change `channel` in `playwright.config.ts`).
- A Supabase project with `supabase/setup-all.sql` applied.
- `.env.local` copied from `.env.example` and filled in. Never commit it.

### Setup

```bash
npm install
npm run seed          # creates demo accounts/transaction; run once or after reset
npm run dev           # http://localhost:3000
```

### Quality gates

```bash
npm run test:unit     # 79 tests, no server required
npm run typecheck
npm run lint
npm run build
npm run test:e2e      # starts/reuses localhost:3000, installed Chrome
npm run test:live     # requires dev server + seeded accounts
```

### Environment variables

See `.env.example`. Required for the verified core: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`, `DEMO_PASSWORD`, `DEMO_*_EMAIL`. Optional/blocked: `PAYPAL_*`, `GEMINI_API_KEY`. Use `PAYPAL_ENV=sandbox` and never real payment credentials during QA.

### Notes

- `npm run test:e2e` uses `QA_APP_URL` (default `http://localhost:3000`).
- `npm run test:live` writes evidence to `scripts/qa/results/live-api.json`.
- Do not run payment tests against live PayPal. No real funds are moved by the simulated rail.

---

*Prepared from executed test evidence. No test is reported as passing unless it ran and passed.*

---

> **Superseded (2026-11-11).** This document records the QA pass of
> 10 November 2026. The release audit in
> [`docs/remediation/AUDIT.md`](./docs/remediation/AUDIT.md) supersedes it:
> it carries the current P0-P3 status, the verified baseline and the fixes
> applied since. Numbers quoted below reflect the state on 10 November.