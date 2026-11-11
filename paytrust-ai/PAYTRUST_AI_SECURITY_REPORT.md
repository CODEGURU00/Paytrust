# PayTrust AI — Security Assessment Report

**Report date:** 10 November 2026
**Assessment type:** Authenticated security testing, authorization/RLS review, input and file-handling review, secrets and dependency audit
**Application:** PayTrust AI (Next.js 16 + Supabase)
**Overall security verdict:** **No exploitable critical finding in the tested application paths; production security sign-off NOT granted** due to missing rate limiting/CSP, upload content-validation gaps, and unresolved dependency advisories.

**Companion documents:** `PAYTRUST_AI_QA_REPORT.md`, `PAYTRUST_AI_REPAIR_REPORT.md`, `PAYTRUST_AI_FINAL_QA_REPORT.md`, `PAYTRUST_AI_FEATURE_MATRIX.md`

---

## 1. Scope and method

### 1.1 In scope

- Authentication and session handling (`@supabase/ssr`, middleware/proxy, auth callback, login/logout).
- Authorization for buyer, seller, witness and anonymous roles across API routes and pages.
- Supabase Row Level Security (RLS), policies, triggers, RPCs and private storage bucket.
- IDOR / object-level authorization on transactions, evidence, passports and disputes.
- Input validation and error handling on all exercised routes.
- File upload validation, storage access and signed URLs.
- PayPal webhook signature verification and idempotency.
- Privacy controls (Trust Passport, private evidence).
- Secret handling in tracked files and client bundles.
- Dependency vulnerabilities (`npm audit`).
- Security headers, CSP, rate limiting and CSRF posture.

### 1.2 Out of scope / limitations

- No destructive penetration testing, load testing or fuzzing at scale.
- No live PayPal capture/webhook success path (credentials invalid) — signature logic reviewed and negative cases tested.
- No live Gemini testing (invalid key).
- No independent database migration execution (no local Postgres/psql/Docker/Supabase CLI); schema/RLS reviewed statically and exercised through the hosted project.
- No mobile app, infrastructure, DNS, WAF or cloud IAM assessment.
- No supply-chain provenance review beyond `npm audit`.

### 1.3 Test identities

| Role | Email | Purpose |
|---|---|---|
| Buyer | `buyer@paytrust.demo` | Owner of seeded transaction; allowed party actions |
| Seller | `seller@paytrust.demo` | Counterparty; allowed party actions; private-object probe |
| Witness | `witness@paytrust.demo` | Read-only participant; forbidden party actions |
| Anonymous | — | Unauthenticated probes |

All testing used seeded demo accounts and **simulated payments only**. No real funds, cards, crypto or loans were involved.

---

## 2. Authentication and session security

### 2.1 Implementation

- Supabase Auth with `@supabase/ssr` cookie-based sessions.
- `src/proxy.ts` invokes `updateSession` on all non-static routes to refresh cookies.
- Auth pages redirect authenticated users to `/dashboard`.
- `/auth/callback` is allowed to exchange codes even with a partial session.
- API route handlers call `getAuthContext()` and return `401` when no user is present.
- The UUID workspace server component explicitly refuses to render without a user.

### 2.2 Executed evidence

| Check | Result |
|---|---|
| Anonymous `GET /api/transactions` | `401` |
| Anonymous `GET /api/transactions/:id` | `401` |
| Anonymous `GET /api/transactions/:id/timeline` | `401` |
| Anonymous `POST /api/messages` | `401` |
| Anonymous `GET /api/trust-passport` | `401` |
| Anonymous `GET /api/disputes` | `401` |
| Invalid password login | stays on `/auth/login`, error shown |
| Valid seeded login | session established; profile menu shows identity |
| Signed-in user visiting auth page | redirected to `/dashboard` |

### 2.3 Demo-first public pages — informational, by design

The product is deliberately demo-first: marketing/demo workspace pages are readable without an account so reviewers can explore seeded, **PII-free simulation data**. The middleware comment documents this intent, and the anonymous E2E tests verify the demo dashboard and transaction list render.

- Real writes and real records still require a session at the API layer.
- The DB-backed UUID workspace requires sign-in and uses RLS-scoped reads.
- **Risk:** users may confuse demo pages with real data. Keep the “Demo workspace / All payments are simulated” labels and avoid placing real customer data in the demo provider.

**Finding:** informational, accepted for demo/staging. Not acceptable if real customer data is ever loaded into the public demo surface.

---

## 3. Authorization and object-level access (IDOR)

### 3.1 Model

- Buyer and seller have full party access to their transaction.
- Witness access is explicit and read-only for party-only actions.
- Non-participants receive `403`/`404`.
- Private evidence and private Trust Passports are hidden by RLS, producing `404` to avoid confirming existence.
- Route handlers combine `requireTransactionAccess` checks with database RLS as defence in depth.

### 3.2 Executed evidence

| Test | Probe | Expected | Actual | Result |
|---|---|---|---:|---:|---|
| VAL-02 | Buyer requests unknown UUID transaction | 404 | 404 | PASS |
| FLOW-03 | Uninvited witness reads QA transaction | 403/404 | 404 | PASS |
| FLOW-06 | Witness posts in party chat | 403 | 403 | PASS |
| FLOW-12 | Witness approves agreement | 403 | 403 | PASS |
| VAL-05 | Witness creates commitment | 403 | 403 | PASS |
| VAL-07 | Witness invites participant | 403 | 403 | PASS |
| VAL-10 | Seller creates PayPal order (buyer-only) | 403 | 403 | PASS |
| FLOW-31 | Non-uploader opens private evidence | 403/404 | 404 | PASS |
| PASSPORT-05 | Seller reads buyer’s private passport | 404 | 404 | PASS |
| AUTH-01..06 | Anonymous access to protected resources | 401 | 401 | PASS |

Unit tests (`tests/unit/transactions-access.test.ts`, 9/9) independently verify:

- buyer full access, seller full access, witness explicit permission,
- non-participant `403`, missing transaction `404`, query failure `500`,
- witness minimum permission and party-only rejection,
- unknown permission defaults to view.

### 3.3 Assessment

- **No IDOR found.** Object identifiers are validated as UUIDs, and access is checked against the authenticated user and participant rows, with RLS as a second layer.
- Returning `404` for private objects is correct existence-hiding. The unreachable `403` branch is not a vulnerability.
- Duplicate agreement approval before the counterparty acts is an intentional decision change, not an authorization flaw. After final approval it is rejected with `409`.

---

## 4. Database and RLS controls

### 4.1 Static review of `supabase/setup-all.sql`

- **18 tables** have `enable row level security`.
- **42 policies** define participant/owner access.
- **26 functions/RPCs** encapsulate privileged transitions.
- Immutability triggers protect dispute identity fields, commitment identity fields, milestone identity fields and approved agreement versions.
- Audit events are append-only; clients cannot write them directly.
- The `attachments` storage bucket is private, with storage policies and signed-URL access.
- Realtime publication is scoped to transaction messages.

### 4.2 Coverage

RLS is enabled on profiles, transactions, participants, messages, payment events, attachments, AI summaries, disputes, QR payloads, agreement versions/approvals/change requests, commitments, milestones, evidence access log, dispute statements, Trust Passport settings and audit events.

### 4.3 Limitations

- RLS policies were not executed against an independently provisioned local database; they were exercised through the hosted project’s API/RLS path.
- Service-role code bypasses RLS by design; it is restricted to server-only modules and must never be imported into client components.

**Assessment:** strong defence-in-depth design. Independent migration/policy testing is recommended before production.

---

## 5. Input validation and error handling

### 5.1 Controls

- Zod schemas validate UUIDs, enums, amounts, currencies, email addresses, field lengths and strict object shapes (unknown fields rejected).
- Route handlers return `400` for invalid input and avoid leaking stack traces.
- Message content is trimmed/length-limited; empty messages rejected.
- Agreement, commitment, milestone, dispute and payment schemas enforce domain rules.
- Webhook JSON parse failures return `400`.

### 5.2 Executed evidence

| Test | Probe | Result |
|---|---|---|
| VAL-01 | Invalid transaction UUID | 400 |
| VAL-03 | Empty chat message | 400 |
| VAL-11 | Unknown passport settings field | 400 |
| VAL-12 | Invalid evidence kind | 400 |
| VAL-13 | Invalid signed-URL action | 400 |
| VAL-14 | Malformed webhook JSON | 400 |
| FLOW-17 | Invalid approval decision | 400 |
| Unit `validations.test.ts` | 24 schema tests | 24/24 PASS |

### 5.3 Assessment

Validation coverage is good on the exercised paths. No injection vector was found: Supabase queries are parameterized, and no `eval`, `new Function` or `dangerouslySetInnerHTML` usage exists in `src/`.

---

## 6. File upload and storage security

### 6.1 Controls verified

- Private Supabase Storage bucket; no public object URLs.
- Signed URLs with explicit `view`/`download` actions; invalid action rejected.
- 10 MB size cap.
- MIME allowlist: JPEG, PNG, GIF, WebP, PDF, plain text, DOC, DOCX.
- Filename sanitization: path separators/traversal stripped, unsafe characters collapsed, leading dots/dashes removed, 120-char cap.
- SHA-256 checksum recorded for uploaded bytes.
- Evidence metadata: kind, visibility, description, role-scoped listing.
- Private evidence hidden from non-uploaders (`404`).
- Access log records upload/view/download actions.
- Upload cleanup on metadata failure (best-effort removal).

### 6.2 Executed evidence

| Test | Result |
|---|---|
| FLOW-26 PNG upload → 201 | PASS |
| FLOW-28 evidence listed for buyer/seller/witness | PASS |
| EVIDENCE-SIGNED-URL buyer/seller/witness | PASS |
| FLOW-29 seller signed URL | PASS |
| FLOW-30 uploader marks private → 200 | PASS |
| FLOW-31 non-uploader private URL → 404 | PASS |
| EVIDENCE-ACCESS-LOG → 200 | PASS |
| Unit `attachments.test.ts` 10/10 | PASS |

### 6.3 Weakness: client-declared MIME type

**Severity: Medium — Open**

The server trusts the multipart `Content-Type` supplied by the client. A malicious file can be labelled `image/png` or `application/pdf` and pass the allowlist. There is no magic-byte/structure validation and no malware scan.

**Impact:** stored malicious content in a private bucket; risk depends on downstream rendering. SVG is not allowed, which reduces direct XSS risk, but PDF/DOC/HTML-like polyglots remain a concern.

**Recommendation:** validate file signatures (magic bytes), decode images server-side, scan with an AV engine, and serve downloads with `Content-Disposition: attachment` and a restrictive `Content-Type`.

### 6.4 Weakness: no per-user upload quota/rate limit

**Severity: Medium — Open**

An authenticated user can upload repeatedly up to individual size limits, consuming storage and bandwidth. Add per-user/IP quotas and rate limits.

---

## 7. Payment and webhook security

### 7.1 Controls

- PayPal credentials are server-only (`PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`); no `NEXT_PUBLIC_*` secret.
- Orders are created server-side with validated amount/currency/transaction.
- Capture is server-side; client cannot set arbitrary capture amounts.
- Webhook handler reads the **raw body**, parses JSON, verifies the PayPal signature using `PAYPAL_WEBHOOK_ID`, and rejects invalid signatures with `401`.
- Provider event IDs are recorded with a unique constraint for idempotency (`23505` treated as already-processed).
- Simulated release/refund/milestone payments are buyer-gated, status-gated and idempotent (`409` on duplicates).
- Seller cannot create a PayPal order (`403`).
- No real funds are moved by the simulated rail.

### 7.2 Executed evidence

| Test | Result |
|---|---|
| VAL-14 malformed webhook JSON → 400 | PASS |
| VAL-15 unsigned webhook rejected → 500 | PASS (no mutation) |
| VAL-10 seller create-order → 403 | PASS |
| FLOW-40 milestone payment → 201 | PASS |
| FLOW-41 duplicate release → 409 | PASS |
| FLOW-42 refund → 201 | PASS |
| FLOW-43 duplicate refund → 409 | PASS |
| FLOW-44 payment event in timeline | PASS |

### 7.3 Weaknesses

| Finding | Severity | Status | Note |
|---|---|---|---|
| Missing webhook config returns `500`, not `503` | Low | Open | No data mutation; improve monitoring semantics and avoid stack leakage |
| Valid-signature webhook path unverified | High (verification gap) | BLOCKED | No valid `PAYPAL_WEBHOOK_ID`; cannot claim end-to-end signature success |
| No replay-window/event-age check documented | Low | Review | Idempotency prevents duplicate records; verify signature timestamp tolerance |
| No negative-amount/currency tamper test against live PayPal | — | BLOCKED | Server validates before provider call; live path unavailable |

**Assessment:** the design is sound (raw-body verification, server-side capture, idempotency). The provider success path remains unverified and must be tested with real sandbox credentials before launch.

---

## 8. Privacy controls

### 8.1 Verified controls

- Trust Passport privacy toggles: completed deals, disputes, milestones, evidence, response time and verification details.
- Public passport respects settings; owner view ignores them.
- Private passport returns `404` to other users.
- Private evidence returns `404` to non-uploaders.
- Evidence access log records who viewed what.
- Timeline and chat are participant-scoped.
- Demo pages use seeded, non-PII simulation data.

### 8.2 Executed evidence

| Test | Result |
|---|---|
| PASSPORT-01/02/04 toggles and restore | PASS |
| PASSPORT-03 public passport | 200 |
| PASSPORT-05 private passport as another user | 404 |
| FLOW-30/31 private evidence | 200 / 404 |
| E2E privacy switches | PASS |
| Unit trust-passport privacy tests | 5/5 PASS |

### 8.3 Assessment

Privacy boundaries work as designed. No private message, receipt or evidence content appeared in the public passport during testing.

---

## 9. Secrets management

| Check | Result |
|---|---|
| `.env.local` tracked by Git? | **No** — ignored by `.gitignore` (`.env*`) |
| Real provider keys in tracked source? | **None found** — grep for `sk-`, `AIza`, private keys, JWTs returned no matches |
| `.env.example` contains placeholders only? | **Yes** |
| Service-role key exposed to client? | **No** — only read in server-only `src/lib/supabase/server.ts` / env helper |
| PayPal secret prefixed `NEXT_PUBLIC_`? | **No** |
| Passwords/secrets printed in test logs? | **No** — suite prints emails/user IDs and status codes, not credentials |
| Seed password in docs? | Demo-only value, configurable via `DEMO_PASSWORD`; acceptable for seeded demo accounts, not for production users |

**Residual:** `.env.local` contains real test credentials on the development machine. It is ignored, but rotate those credentials if the machine or archive is shared. Never attach `.env.local` to a report or commit.

**Assessment:** no secret leakage found in tracked files or client bundles.

---

## 10. Transport, headers, CSRF and rate limiting

### 10.1 Missing security headers / CSP

**Severity: Medium — Open**

`next.config.ts` does not define `headers()`, and no middleware adds security headers. The app therefore lacks:

- Content-Security-Policy
- Strict-Transport-Security (depends on hosting)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `X-Frame-Options` / `frame-ancestors`
- Permissions-Policy

**Impact:** increased XSS/supply-chain and clickjacking exposure; no defence-in-depth for injected content.

**Recommendation:** add a strict CSP (nonce/hash-based for Next.js), HSTS at the edge, `nosniff`, `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`, and a minimal Permissions-Policy.

### 10.2 No rate limiting

**Severity: Medium — Open**

No rate limiting or `429` handling exists in the application (`rate.?limit`, `429`, `Retry-After` searches returned no matches). Auth, AI, upload and payment routes are all unthrottled at the app layer.

**Impact:** credential stuffing, AI cost abuse, upload/storage abuse, payment endpoint probing, webhook floods.

**Recommendation:** enforce per-IP and per-user limits at the edge/WAF and in sensitive route handlers; add exponential backoff and alerting.

### 10.3 CSRF posture

**Severity: Low — Open (verify)**

There is no explicit CSRF token. The app relies on Supabase session cookies; Supabase’s cookie defaults are typically `SameSite=Lax`, which mitigates cross-site POSTs but does not eliminate all risk. State-changing routes require a session and validate JSON bodies, which raises the bar.

**Recommendation:** confirm cookie `SameSite`/`Secure` settings in production, require JSON content type for writes, and add origin checks for sensitive routes. Consider explicit CSRF tokens for cookie-authenticated mutations.

---

## 11. Dependency vulnerabilities (`npm audit`)

**Result at the time of the original scan:** **11 advisories** — 8 moderate, 1 high, 2 critical.

| Package | Severity | Direct | Fix | Notes |
|---|---|---:|---|---|
| `zod` | **High** | Yes | `zod@4.6.7` (major) | Runtime validation dependency; upgrade requires schema migration/testing |
| `vitest` | **Critical** | Yes | `vitest@5.1.0` (major) | Dev/test tooling |
| `tinypool` | **Critical** | No (via vitest) | `vitest@5.1.0` | Dev/test tooling |
| `@vitest/mocker` | Moderate | No | `vitest@5.1.0` | Dev/test tooling |
| `@typescript-eslint/*` (5 packages) | Moderate | No | available | Lint tooling |
| `minimatch` | Moderate | No | available | Transitive lint tooling |
| `typescript-eslint` | Moderate | No | available | Lint tooling |

**Exploitability assessment:** the two critical advisories are in **dev/test tooling**, not the production runtime. The high `zod` advisory is runtime-relevant and should be prioritized. The application’s use of Zod is schema validation, not untrusted schema compilation, which reduces practical exploitability — but it remains a known-vulnerable dependency.

**Status: RESOLVED (Phase 1, 2026-11-11).** `npm audit --audit-level=moderate` now reports **0 vulnerabilities**. Evidence: `docs/remediation/phase1-baseline.txt` (before) and commits `018458e`, `54a00ef`, `ca62c77` on `chore/phase1-dependency-upgrades`.

1. `minimatch` → `^11.0.1` via an explicit `overrides` entry (the advisory is not auto-reachable by `npm audit fix` because the vulnerable copy is nested under `@typescript-eslint/typescript-estree`).
2. `zod` → 4.6.7. The v4 removal of `ZodError.errors` required migrating 24 call sites across 20 files; the RED gate was exactly 24 `TS2339` errors. A new regression test (`tests/unit/validation-error-messages.test.ts`) was added because the previous suite asserted only `.success` booleans and would have passed against a fully broken app.
3. `vitest`/`tinypool`/`@vitest/mocker` → 5.1.0, with the mandatory `@types/node` 20 → 22 bump (vitest 5 declares `peerOptional @types/node@^22 || >=24`; `^20` makes `npm install` fail with `ERESOLVE`).
4. ESLint toolchain was **not** force-upgraded; `minimatch` was resolved by override and the lint result is byte-identical (0 errors / 72 warnings).
5. `npm audit` and the full regression suite were re-run: typecheck 0 errors, unit 125/125, build exit 0.

The CI audit step is now **blocking** at `--audit-level=moderate`.

---

## 12. Findings register

| ID | Finding | Severity | Status | Evidence / action |
|---|---|---|---|---|
| SEC-01 | No application rate limiting | Medium | Open | No matches for rate-limit/429; add edge + route limits |
| SEC-02 | No CSP/security headers | Medium | **Fixed** | `src/lib/security/csp.ts` nonce policy + `src/proxy.ts` wiring; `next.config.ts` adds HSTS, nosniff, frame DENY, Referrer-Policy, Permissions-Policy. Verified live: headers present, nonce in HTML, 36/36 E2E |
| SEC-03 | Upload MIME is client-declared | Medium | **Fixed** | `detectAttachmentMimeType` / `validateAttachmentContent` in `src/lib/attachments.ts`, enforced in upload route; 8 content tests + live PNG upload pass |
| SEC-04 | No per-user upload quota | Medium | Open | Add quotas/rate limits |
| SEC-05 | 11 dependency advisories (2 critical, 1 high) | High (aggregate) | **Fixed** | Resolved in Phase 1 (2026-11-11): `npm audit --audit-level=moderate` → **0 vulnerabilities**; zod 4.6.7, vitest 5.1.0, `minimatch` 11 override; CI audit step now blocking |
| SEC-06 | Webhook missing-config returns 500 | Low | **Fixed** | `src/lib/paypal.ts` returns `503` for missing credentials and webhook ID; live check `PAY-ORDER` records 503 |
| SEC-07 | No explicit CSRF token | Low | Open (verify) | Verify SameSite/Secure; add origin checks/tokens |
| SEC-08 | Valid-signature PayPal webhook unverified | High (verification gap) | BLOCKED | Configure sandbox webhook ID and record success |
| SEC-09 | Live AI provider unverified | — | BLOCKED | Invalid Gemini key; not a code vulnerability |
| SEC-10 | Demo pages readable anonymously | Informational | Accepted (demo) | PII-free seeded data; keep labels, never load real data |
| SEC-11 | No hosted CI security gates | Low | **Fixed** | `.github/workflows/ci.yml`: typecheck, lint, unit, build on Node 22; `npm audit --audit-level=moderate` **blocking** since Phase 1 (was non-blocking until SEC-05 landed) |
| SEC-12 | Service-role bypasses RLS | Informational | Accepted | Server-only usage; never import into client code |

### Authorization and escrow defects found and fixed (2026-11-11)

These were found by an independent review of every service-role write path and
verified against the live database. All four are fixed in `146281e`.

| ID | Defect | Severity | Fix |
|---|---|---|---|
| SEC-13 | `raiseTransactionDispute` checked only "is a user signed in", then wrote with the service role: any signed-in user could set **any** transaction to `FAILED` (defrauding the counterparty's public `transaction_count`) and inject a message into a chat they were not part of | **Critical** | `requireTransactionAccess(..., { partyOnly: true })` before the privileged write, on the RLS-scoped client; the reason is length-capped |
| SEC-14 | `assertAmountMatches` returned early when the amount was missing — the check was skipped entirely, and the simulated capture produced no amount at all, so any amount in any currency was accepted | **Critical** | fails closed; the simulated PayPal stubs now carry the real binding and amount so the same path is exercised |
| SEC-15 | The order-to-transaction binding was conditional (skipped when `paypal_order_id` was NULL or `reference_id` absent), and the capture route allowed the **seller** as well as the buyer — a seller could capture their own order against a victim's transaction and mark the escrow funded | **Critical** | both bindings are now mandatory; capture is buyer-only |
| SEC-16 | `releaseEscrowAndRecord` never required the funds to be captured, so escrow could be released on a `CREATED` transaction and the seller told they had been paid; separately, the `PAYMENT.CAPTURE.COMPLETED` webhook set `COMPLETED`, releasing escrow without the buyer asking | **Critical** | release requires `APPROVED`; the webhook now sets `APPROVED` and releasing stays an explicit buyer-initiated step |
| SEC-17 | Provider quota exhaustion was reported as a generic 502, indistinguishable from the provider being down | Low | 503 with a `Retry-After` header (parsed from the provider's own hint) and an `ai_provider_quota_exhausted` code |
| SEC-18 | A capacity spike failed the request on the first attempt; a quota error was then retried, which multiplied each call into 3 requests and broke the provider's own 5/minute limit | Medium | only genuine capacity errors are retried; quota errors are surfaced, because the provider asks for a ~56s wait that cannot fit inside a request |

Regression coverage: `tests/unit/payment-security.test.ts` (13 assertions) pins the
fail-closed amount check, the mandatory order binding and the escrow release
precondition.

**Positive controls (no finding):**

- No IDOR in tested object paths.
- No secret leakage in tracked files or client bundle.
- No SQL injection vector (parameterized Supabase client).
- No `eval`, `new Function` or `dangerouslySetInnerHTML`.
- Private objects hidden with `404`.
- RLS enabled on 18 tables; 42 policies; append-only audit events.
- Webhook signature verification and idempotency implemented.
- Upload filename sanitization, size cap, private bucket, signed URLs and access log verified.

---

## 13. Risk rating and sign-off

### 13.1 Residual risk summary

| Area | Rating | Rationale |
|---|---|---|
| Authentication | **Low** | Supabase sessions, 401 enforcement, invalid-login rejection |
| Authorization/IDOR | **Low** | Participant checks + RLS + 404 existence hiding |
| Data privacy | **Low–Medium** | Controls work; demo/real distinction needs discipline |
| Input handling | **Low** | Zod validation, parameterized queries, no dangerous sinks |
| File uploads | **Medium** | MIME spoofing, no AV, no quota |
| Payments | **High (unverified)** | Provider success path blocked; simulated rail verified |
| Platform hardening | **Medium** | No rate limiting/CSP; dependency advisories |
| Operational security | **Medium** | No CI security gates, no monitoring evidence |

### 13.2 Security sign-off

**Not granted for production.** There is no evidence of a critical exploitable vulnerability in the tested application paths, but the combination of missing rate limiting, missing CSP/headers, MIME-spoofing risk, unverified PayPal webhooks and 11 dependency advisories prevents a production security sign-off.

**Conditions for re-assessment:**

1. Valid PayPal sandbox credentials with recorded order/capture/refund/webhook success.
2. Valid Gemini key if AI is in launch scope.
3. Rate limiting and security headers deployed and verified.
4. Magic-byte/AV upload validation and quotas.
5. `npm audit` reduced to zero high/critical (or formally risk-accepted with compensating controls).
6. CSRF/SameSite configuration verified.
7. CI security gates (audit, secret scan, tests) in place.

---

## 14. Evidence index

| Evidence | Path |
|---|---|
| Live API security checks (AUTH, IDOR, VAL, FLOW, PASSPORT) | `scripts/qa/results/live-api.json` |
| E2E login/privacy/workspace tests | `scripts/qa/results/playwright.json`, `tests/e2e/ui.spec.ts` |
| Access-control unit tests | `tests/unit/transactions-access.test.ts` |
| Passport privacy unit tests | `tests/unit/trust-passport.test.ts` |
| Attachment validation unit tests | `tests/unit/attachments.test.ts` |
| Validation schema unit tests | `tests/unit/validations.test.ts` |
| RLS/policies/triggers | `supabase/setup-all.sql` |
| Environment contract | `.env.example` |
| Dependency audit | `npm audit` output (11 advisories) |

---

*This assessment reports only controls that were inspected or executed. Blocked provider paths are explicitly marked BLOCKED and are not treated as secure or passing.*
