# PayTrust AI

**A trust-first transaction workspace for buyer/seller deals.** Every payment gets
one shared record: the agreement, the conversation, the commitments, the evidence
and the disputes — so both parties can check the same facts before money moves.

PayTrust does not decide who is right in a dispute. It keeps a verifiable record
of what each party said and did, and shows plain facts instead of hidden
reputation scores.

---

## Status (verified, not aspirational)

| Area | State | Evidence |
|---|---|---|
| Build, types, lint | ✅ | `npm run build` exit 0 · `tsc --noEmit` 0 errors · ESLint **0 errors** (74 warnings) |
| Unit / regression suite | ✅ | `npm run test:unit` — **171 assertions**, 16 files |
| Browser E2E | ✅ | `npm run test:e2e` — 36 Playwright tests |
| Authenticated API suite | ✅ | `npm run test:live` — 116 checks against the real Supabase project |
| Dependency audit | ✅ | `npm audit --audit-level=moderate` → **0 vulnerabilities** |
| Supabase (Postgres/Auth/Storage/Realtime) | ✅ | 18 tables, RLS on all of them, 37 policies, 39 triggers |
| PayPal Orders v2 (sandbox) | ✅ | Order creation returns a live `sandbox.paypal.com` approval URL, bound to the transaction |
| Gemini AI | ⚠️ | Works, but the free tier allows only 5 requests/minute and 20/day |
| NVIDIA NIM (production provider) | ⚠️ | Configured; unreachable from the build machine's network |
| Rate limiting | ❌ | Not implemented — see [Known limitations](#known-limitations) |

---

## Quick start

```bash
npm install
cp .env.example .env.local      # then fill in the values
```

### 1. Database

Run **one** script in the Supabase SQL editor (Dashboard → SQL Editor → New
query → paste → Run):

```
supabase/setup-all.sql
```

It is idempotent and creates everything: tables, constraints, indexes, RLS
policies, triggers, RPCs, the private `attachments` storage bucket and the
realtime publication. `supabase/schema.sql` is a byte-identical copy kept for
reference.

### 2. Environment

Fill in `.env.local` — see [Environment variables](#environment-variables). At
minimum you need the three Supabase values; `PAYPAL_*` and one AI provider key
enable the payment and AI features.

### 3. Seed the demo record

```bash
npm run seed
```

This creates three demo accounts and one complete demo transaction (chat,
Deal DNA with mutual approval, commitments, milestones, shared + private
evidence, and a dispute with statements from both parties). It is idempotent.

### 4. Run it

```bash
npm run dev
```

Open <http://localhost:3000>. Sign in with `buyer@paytrust.demo` /
`PayTrustDemo123!` (or any of the seeded accounts) to see the full record.
The workspace is also readable without an account.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Project URL, e.g. `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Publishable key — safe in the browser |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Secret key — server-only, bypasses RLS. Needed for webhooks, the seed script and privileged writes |
| `PAYPAL_ENV` | for PayPal | `sandbox` (default) or `live` |
| `PAYPAL_CLIENT_ID` | for PayPal | From developer.paypal.com → Apps & Credentials → Sandbox |
| `PAYPAL_CLIENT_SECRET` | for PayPal | Server-only |
| `PAYPAL_WEBHOOK_ID` | for webhooks | From the webhook you create in the PayPal dashboard |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | optional | Only if you render PayPal buttons client-side |
| `AI_PROVIDER` | optional | `gemini` or `nvidia`. Unset = auto-detect |
| `GEMINI_API_KEY` | for AI | From aistudio.google.com/apikey |
| `GEMINI_MODEL` | optional | Defaults to `gemini-3.5-flash` |
| `GEMINI_TIMEOUT_MS` | optional | Defaults to `240000`. **Must stay below the AI routes' `maxDuration` of 300s** |
| `NVIDIA_API_KEY` | for AI | NVIDIA NIM key |
| `NVIDIA_MODEL` | optional | Defaults to `mistralai/mistral-large-4-1t-a52b` (a reasoning model) |
| `NVIDIA_TIMEOUT_MS` | optional | Defaults to `240000` |
| `AI_RETRY_BACKOFF_MS` | optional | Backoff before retrying a transient provider spike |
| `NEXT_PUBLIC_APP_URL` | ✅ | Public base URL, no trailing slash. Used for auth redirects and PayPal return URLs |
| `DEMO_PASSWORD`, `DEMO_*_EMAIL` | optional | Seeded account credentials (`npm run seed`) |
| `QA_APP_URL`, `QA_AI_SPACING_MS`, `QA_TRANSACTION_ID` | optional | Test-harness configuration |

`.env.local` is git-ignored. **Never commit credentials.**

---

## PayPal Sandbox setup

1. Sign in at [developer.paypal.com](https://developer.paypal.com/dashboard/applications/sandbox).
2. **My Apps & Credentials → Sandbox → Create App** → copy the Client ID and Secret.
3. Put them in `.env.local` as `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET`, and keep `PAYPAL_ENV=sandbox`.
4. Add a sandbox **buyer** account (Personal → Sandbox → Accounts) to approve payments.
5. Optional but recommended: create a webhook (Sandbox → Webhooks → Add Webhook) with the URL
   `https://<your-domain>/api/payments/webhook` and subscribe to
   `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.COMPLETED`, `PAYMENT.CAPTURE.REFUNDED`.
   Put the webhook ID in `PAYPAL_WEBHOOK_ID`.

**How the flow works**

1. The buyer starts a payment from the transaction page.
2. `POST /api/payments/create-order` reads the amount and currency **from the
   database** (never from the request body), creates a PayPal order and stores
   `paypal_order_id` on the transaction.
3. The buyer approves at PayPal and is returned to `/api/payments/return`,
   which captures the order and redirects back to the transaction.
4. `POST /api/payments/webhook` verifies the PayPal signature and reconciles
   order/capture/refund events. Payment status is only ever changed by
   server-side code using the service role.

**Capture is buyer-only, and the order must be bound to the transaction.** An
order whose amount, currency, `paypal_order_id` or `reference_id` does not match
the transaction is rejected; the seller cannot capture; and escrow can only be
released after the funds are captured.

**Simulated payments** (`POST /api/payments/simulate`) never call PayPal and
never accept card, UPI or bank credentials. They write a payment event marked
`simulated: true` and a note that no funds moved. They are for demos and tests
only.

---

## AI provider setup

### Google Gemini (easiest)

1. Get a key at <https://aistudio.google.com/apikey>.
2. Set `GEMINI_API_KEY` and `AI_PROVIDER=gemini`.
3. `GEMINI_MODEL` defaults to `gemini-3.5-flash`.

> The free tier allows **5 generate-content requests per minute and 20 per day**.
> When the quota is exhausted the app answers `503` with a `Retry-After` header
> and the message `ai_provider_quota_exhausted`. That is a provider limit, not an
> application error — use a paid tier for anything beyond a demo.

### NVIDIA NIM (the production provider)

1. Get an API key from [build.nvidia.com](https://build.nvidia.com).
2. Set `NVIDIA_API_KEY` and `AI_PROVIDER=nvidia`.
3. The default model is a **reasoning** model: hidden reasoning tokens count
   against `max_tokens`, so `NVIDIA_MAX_TOKENS_SUMMARY` /
   `NVIDIA_MAX_TOKENS_STRUCTURED` must be several times the expected answer
   length or the response comes back empty with `finish_reason=length`.
4. Expect 70–250s per call.

### What the AI is allowed to do

It is advisory and neutral. It never decides a dispute, never approves an
agreement, and never moves money. Deal DNA is always created as a **draft**
that a human edits and both parties approve. The provider guardrail is sent as
a real `systemInstruction`, outside the untrusted record text.

---

## Feature status

| Feature | State | Notes |
|---|---|---|
| Dashboard, workspace, transactions list | ✅ working | Reads live rows through the Supabase session |
| Sign up / sign in / sign out | ✅ working | Supabase email + password, real `/auth/callback` |
| Transaction record (chat, commitments, milestones, evidence, timeline) | ✅ working | Realtime on `transaction_messages` |
| Deal DNA (draft → mutual approval) | ✅ working | AI drafts it; humans approve it |
| Evidence vault | ✅ working | Private bucket, magic-byte validation, access log |
| Disputes + statements | ✅ working | State machine enforced in the database |
| Trust passport with privacy switches | ✅ working | Public read respects the owner's toggles |
| QR scan + validation | ✅ working | Camera scan via `@zxing/browser`, manual entry, server-side validation |
| PayPal sandbox order + capture | ✅ working | Verified against the live sandbox API |
| Amounts shown in the transaction's own currency | ✅ working | The workspace and the transactions list render the recorded currency |
| Mobile workspace header | ✅ working | The title has its own line on narrow screens; no horizontal scroll |
| PayPal webhook reconciliation | ⚠️ | Code path verified; needs a real webhook round-trip to be signed off |
| Gemini AI (summary, Deal DNA, mediation, dispute report) | ⚠️ | Works; free-tier quota is the limit |
| NVIDIA NIM | ⚠️ | Configured; unreachable from this machine's network |
| Live transaction feed | ✅ working | `transactions` is in the realtime publication |
| Rate limiting | ❌ | Not implemented (SEC-01) |

---

## Security model

- RLS is participant-scoped: only the buyer, seller and explicit participants
  can read a transaction and its related rows.
- Every transaction-scoped Route Handler calls `requireTransactionAccess()`
  before using any client, so a service-role client can never accidentally
  bypass participant authorization.
- Transaction financial fields are immutable after creation; status transitions
  are constrained and terminal states cannot be downgraded.
- Only the buyer can create a PayPal order, capture a payment or release escrow.
- Payment event IDs are unique **per event type**, so webhook retries are safe
  and refunds are recorded instead of silently dropped.
- Agreement approval requires both the buyer and the seller. Witnesses cannot
  approve. AI can only create a `draft`.
- Evidence has separate `participants` / `private` visibility, enforced in both
  `attachments` RLS and the Storage read policy. Access is logged.
- `audit_events` is append-only for clients and scoped to participants.
- Disputes and AI mediation never assign fault or decide an outcome.
- `profiles.email` is not selectable by client roles. Seller lookup uses the
  `find_seller_by_email` security-definer RPC.
- `security definer` functions set an explicit safe `search_path`.
- Webhooks are verified server-side before any database change.
- A nonce-based CSP plus `nosniff`, `frame DENY`, HSTS, `Referrer-Policy` and
  `Permissions-Policy` are set on every response.
- Auth uses a real `/auth/callback` route. `src/proxy.ts` refreshes the Supabase
  session and redirects signed-in users away from the auth pages. The product is
  demo-first: workspace pages are readable without an account, but every write
  API and server action requires an authenticated user.

The full residual-risk register is in
[`PAYTRUST_AI_SECURITY_REPORT.md`](./PAYTRUST_AI_SECURITY_REPORT.md).

---

## Testing and quality gates

```bash
# Fast, hermetic checks - no server or credentials needed.
npm run test:unit
npm run typecheck
npm run lint
npm run build

# Browser E2E. Starts or reuses http://localhost:3000.
npx playwright install chromium   # once
npm run test:e2e

# Authenticated API checks against the real Supabase project.
npm run dev
npm run seed
npm run test:live
```

`test:live` and Playwright read `QA_APP_URL` (default `http://localhost:3000`).
Evidence is written to `scripts/qa/results/`.

**How results are reported.** A check is only counted as **PASS** when an
executed check proves it. A provider that refuses because its quota is
exhausted is recorded as **BLOCKED** — neither a pass nor a failure — so the
evidence can never be mistaken for a working feature.

---

## Deployment

The app is a standard Next.js 16 App Router project.

1. **Vercel** (recommended): import the repository, add every variable from
   `.env.example` in *Project Settings → Environment Variables*, and deploy.
   Set `NEXT_PUBLIC_APP_URL` to the deployed origin (no trailing slash).
2. **Any Node host**: `npm ci && npm run build && npm run start`.
3. **Database**: apply `supabase/setup-all.sql` to the production project
   before the first request. It is safe to re-run.
4. **Callbacks**: point PayPal's return/cancel URLs at
   `https://<your-domain>/api/payments/return` and `/api/payments/cancel`, and
   the webhook at `https://<your-domain>/api/payments/webhook`.

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests, build and a
**blocking** `npm audit --audit-level=moderate` on every push and pull request.

---

## Known limitations

- **No rate limiting.** Any authenticated user can call the AI, upload and
  payment endpoints in a loop. SEC-01 in the security report; it needs a shared
  store (Redis or DB-backed), not an in-process counter.
- **The AI free tier is the real ceiling**: 5 requests/minute and 20/day on the
  Gemini free tier. Exceeding it returns `503` with `Retry-After`.
- **The PayPal webhook has not been signed off end to end** — it needs a real
  webhook round-trip with a valid signature.
- **NVIDIA NIM was unreachable from the build machine**, so the production AI
  path is configured but unverified here.
- **The workspace is demo-first.** Pages render without an account; writes
  require one.
- **Simulated payments are not real payments.** No real funds move.
- **AI output is advisory.** It never decides outcomes, approves agreements, or
  moves money.
- There is no automated test for the browser-permission path of the QR scanner
  (the camera needs a human grant).

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint over the repository |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run seed` | Seed demo accounts and a complete demo transaction |
| `npm run test:unit` | Vitest unit and regression suite |
| `npm run test:e2e` | Playwright browser suite |
| `npm run test:live` | Authenticated API suite against a running server |
| `npm run test:ai-live` | Real AI provider calls (skipped without a provider) |
| `npm run qa:api` | Alias of `test:live` |

---

## Project layout

```
paytrust-ai/
├── supabase/setup-all.sql     # canonical database setup (run this)
├── src/app/                    # App Router: (app) workspace, auth, api
├── src/actions/                # typed server actions
├── src/components/             # ui, shell, demo, auth
├── src/lib/                    # supabase, payments, paypal, ai, server
├── src/proxy.ts                # Next 16 session refresh + CSP
├── scripts/seed-demo.mjs       # demo record seed
├── scripts/qa/live-api.mjs     # authenticated API suite
└── tests/                      # unit (vitest) and e2e (playwright)
```

The full API reference is in [`docs/API.md`](./docs/API.md); the environment
walkthrough is in [`SETUP.md`](./SETUP.md).
