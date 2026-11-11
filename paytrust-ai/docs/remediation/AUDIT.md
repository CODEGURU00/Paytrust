# PayTrust AI — Release Audit (2026-11-11)

Every row was found by running the app, the API and the test suites against the
real Supabase project and the real PayPal sandbox — not by reading the code
alone. The **Status** column says what was actually done, and the **Verified by**
column says how it was proven.

---

## P0 — the application cannot run, or a critical security hole

| # | Bug | Impact | Status | Verified by |
|---|---|---|---|---|
| P0-1 | 3 ESLint errors (`react-hooks/set-state-in-effect`) made `npm run lint` exit 1 | CI red on every push | **Fixed** | `eslint .` → 0 errors |
| P0-2 | 11 dependency advisories (2 critical via `tinypool`, 1 high via `zod`, 8 moderate) | Known-vulnerable runtime + tooling | **Fixed** | `npm audit --audit-level=moderate` → 0 vulnerabilities |
| P0-3 | zod v4 removed `ZodError.errors`; 24 call sites read `parsed.error.errors[0]` | Every validation error path would throw `TypeError` → 400s become 500s. The old suite asserted only `.success` booleans, so **109/109 tests passed against a fully broken app** | **Fixed** | 24 sites migrated; RED gate was exactly 24 `TS2339` errors; new guard test verified RED against the pre-fix code |
| P0-4 | `raiseTransactionDispute` checked only "signed in", then wrote with the **service role** | Any signed-in user could set **any** transaction to `FAILED` (defrauding the counterparty's public `transaction_count`) and inject a message into a chat they were not in | **Fixed** | `requireTransactionAccess(..., { partyOnly: true })`; 2 of 3 new assertions fail against the vulnerable action |
| P0-5 | `assertAmountMatches` returned early when the amount was missing | The amount check was skipped entirely — any amount in any currency was accepted, and the simulated capture produced no amount at all | **Fixed** | Fails closed now; 13 assertions in `tests/unit/payment-security.test.ts` |
| P0-6 | The order→transaction binding was conditional, and the capture route allowed the **seller** | A seller could capture their own PayPal order against a victim's transaction and mark the escrow funded | **Fixed** | Both bindings mandatory; capture is buyer-only; live check returns `403 Only the buyer can capture this payment` |
| P0-7 | `releaseEscrowAndRecord` never required captured funds; the `PAYMENT.CAPTURE.COMPLETED` webhook set `COMPLETED` | Escrow could be released on an unfunded transaction, and a real PayPal capture released escrow **without the buyer asking** | **Fixed** | Release requires `APPROVED`; the webhook sets `APPROVED` |
| P0-8 | ESLint linted the generated Playwright HTML report (third-party bundles) | 3027 problems / **133 errors** → CI red as soon as the browser suite ran | **Fixed** | `eslint .` → 0 errors |
| P0-9 | Open redirect in `/auth/callback`: `safeRedirectPath` rejects `//evil.com` but not `/\evil.com` | Post-login phishing: `new URL('/\\evil.com', origin)` → `https://evil.com/`. A second bypass (`/..//evil.com` → path `//evil.com`) survived the first version of the fix and was caught by the new test | **Fixed** | `src/lib/auth/redirect.ts`; 6 assertions, including the one that caught the second bypass |
| P1-15 | The database allows `INR`, but PayPal does not carry it | Every INR transaction produced a raw provider `422 UNPROCESSABLE_ENTITY :: Currency code is not currently supported`, surfaced to the user | **Fixed** | The supported set is checked before the order is created; verified live — USD/EUR/GBP/AUD/CAD return 201, INR returns 422 |
| P1-16 | Every amount was rendered with `formatINR`, and the demo type claimed `currency: 'INR'` while the mapper cast the real currency to `'INR'` | A USD transaction was shown as **₹2,400** — the wrong currency on the screen where the amount matters most. The type-level cast hid it from the compiler | **Fixed** | `formatMoney(value, currency)`; the transaction workspace and the transactions list now use the recorded currency; `DemoTransaction.currency` is `string` |
| P2-11 | At 390px the three header action buttons took 298px of a 390px viewport | The transaction title was **0px wide** (invisible on a phone) and the page **overflowed horizontally by 39px** | **Fixed** | Measured at 390px: title 0px → 273px, actions 298px → 134px, scrollWidth 429 → 390 |
| P2-12 | The sidebar's "Deal DNA" link pointed at a hardcoded transaction id | It led to "Deal not found" after every re-seed | **Fixed** | It now resolves to the first transaction in the workspace |

## P1 — core payment, authentication or database functionality broken

| # | Bug | Impact | Status | Verified by |
|---|---|---|---|---|
| P1-1 | The live API harness hardcoded a transaction id that changes on every re-seed | 24 checks failed with `404`, including the `VAL-04`…`VAL-12` authorization checks that expect `403` but hit "not found" first — so they were never testing authorization | **Fixed** | Resolved by title through the buyer's own session |
| P1-2 | `gemini-2.5-flash` is retired for this API key, and the model the API recommends (`gemini-3.8-flash`) never returns from this machine | **All four AI endpoints failed** | **Fixed** | `gemini-3.5-flash` answers in ~5.8s; live `summarize` 200, `deal-dna` 201, `dispute-report` 201 |
| P1-3 | The Gemini API key travelled in the query string (`?key=…`) | Captured by proxies, CDN logs and APM tools | **Fixed** | Now `x-goog-api-key` header |
| P1-4 | The Gemini call had **no timeout** | A hung provider pinned the request until the platform killed it; the client saw an opaque `fetch failed` | **Fixed** | Bounded by `GEMINI_TIMEOUT_MS` (240s) |
| P1-5 | The provider timeout (600s) exceeded the AI routes' `maxDuration` (300s) | Our own timeout could never fire; the platform killed the request first | **Fixed** | Default lowered to 240s, documented |
| P1-6 | Transient provider errors were retried — **including quota errors** | Each AI call became up to 3 requests and broke Gemini's own 5/minute limit: the harness was failing itself | **Fixed** | Quota and rate-limit answers are no longer classified as transient |
| P1-7 | Provider quota exhaustion was reported as a generic `502` | Indistinguishable from the provider being down, with no hint when to return | **Fixed** | `503` + `Retry-After` + `ai_provider_quota_exhausted` |
| P1-8 | The dashboard's Scan QR action pushed `/scan` — a route that does not exist | 404 on a primary dashboard action | **Fixed** | Now `/qr-scan` |
| P1-9 | The Playwright suite hardcoded the same stale transaction id and asserted `'Transaction-linked chat'` — a string that only existed in the unreachable legacy component | 4 browser tests failed against a working feature | **Fixed** | Resolves by title; asserts what the current UI renders |
| P1-10 | The transaction workspace had **no `h1`** — the title was a `<span>` | Screen-reader and navigation gap; also why the E2E heading assertion could never pass | **Fixed** | Title promoted to the page's single `h1` |
| P1-11 | `npm run seed` reset the demo password, and changing a password invalidates every active session | Re-seeding signed out anyone using the demo — including the Playwright session, which then failed with `401` | **Fixed** | The seed now reuses existing accounts untouched; `SEED_RESET_PASSWORD=true` opts into the old behaviour |
| P1-12 | `payment_events` idempotency key was `(provider, provider_event_id)` without `event_type` | The same PayPal object is referenced by several event types, so the second insert collided and was swallowed: the live ledger held **22 refunded transactions and 0 `payment_refunded` rows** | **Fixed** | Key is now 3-column; applied to the live database and to `setup-all.sql` |
| P1-13 | `public.transactions` was not in the `supabase_realtime` publication | The workspace's live transactions feed subscribed to a table that was never replicated and silently never fired | **Fixed** | Publication now lists 6 tables, verified live |
| P1-14 | The PayPal order → capture path had never been exercised end to end | Unknown state of the most important integration | **Verified** | 7/7 live checks: create-order returns a live `sandbox.paypal.com` approval URL, the order is bound to the transaction, the seller cannot capture, an unbound order is rejected, invalid input is rejected |

## P2 — important feature broken or incomplete

| # | Issue | Status |
|---|---|---|
| P2-1 | `getTrustIndicators(userId)` has no session check and accepts an arbitrary user id | **Open** |
| P2-2 | `GET /api/payments/cancel` is unauthenticated and leaks a transaction id from a caller-supplied token | Anyone holding an order token could resolve the transaction behind it | **Fixed** | The caller must be the buyer or the seller; otherwise it redirects to the dashboard. Verified live: an anonymous request now gets `/dashboard?payment=cancelled` |
| P2-3 | The Storage delete policy is broader than the metadata delete policy — a counterparty can delete another participant's evidence file | **Open** |
| P2-4 | `transactions_insert` does not constrain `status`, so a client can insert a transaction already marked `COMPLETED` and inflate the trust counter | **Open** |
| P2-5 | No application rate limiting (SEC-01/SEC-04) — one authenticated user can drive the AI, upload and payment endpoints in a loop | **Open** — needs a shared store, not an in-process counter |
| P2-6 | Raw database and provider error text is returned to clients in ~20 handlers | **Open** |
| P2-7 | The Gemini free tier allows 5 requests/minute and 20/day | **External** — needs a paid tier |
| P2-8 | NVIDIA NIM is unreachable from this machine (TCP connects, HTTPS never returns) | **External** — the production AI path is configured but unverified here |
| P2-9 | The PayPal webhook has no valid-signature round-trip | **Open** — needs a webhook configured in the PayPal dashboard |
| P2-10 | `forgot-password` simulates the reset instead of sending mail (no mail provider is connected) | **By design** — documented in the README |

## P3 — minor / cosmetic

| # | Issue | Status |
|---|---|---|
| P3-1 | `/trust` is a "focused" route with no sidebar, yet it is listed in the sidebar — its nav item is invisible on its own page | **Open** |
| P3-2 | 72 lint warnings (unused imports, one `<img>`, a `window.location.href` navigation) | **Open** — non-blocking |
| P3-3 | `src/lib/transactions/mapper.ts` falls back to `otherProfile?.email`, a column client roles can never read | **Open** |
| P3-4 | ~975 lines in `src/components/legacy/`, 3 files in `src/components/dashboard/`, 16 of 25 server actions and 6 demo fixtures are unreachable from the current route graph | **Open** — cleanup, not a defect |

---

## What was deliberately NOT changed

- **The demo-first model.** Workspace pages stay readable without an account; only
  writes require a session. The audit confirmed this is intentional and
  documented, not a regression from an earlier authenticated design.
- **The 118-feature specification.** No new features were added. The remaining
  scope is the release, not the spec.
- **The simulated payment rail.** It stays clearly labelled (`simulated: true`)
  and never touches PayPal. It is the only way to demo escrow release without
  moving money.
- **AI neutrality.** It still never decides a dispute, approves an agreement, or
  moves money.
