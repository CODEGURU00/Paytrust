# PayTrust AI — Honest Completion Remediation Plan

Status as of 2026-11-10. Target: **Option B — Honest Completion**.
Baseline feature register: `PAYTRUST_AI_FEATURE_MATRIX.md` (118 features).
Rule: a feature is PASS only when an executed check proves it. `FAIL` must stay 0.

Baseline distribution: **PASS 41 · FAIL 0 · PARTIAL 25 · MOCKED 26 · NOT IMPLEMENTED 16 · BLOCKED 10**.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Baseline commit, CI gate, evidence freeze | **Done** — `6ebb8a6`, `bb883ae`; `.github/workflows/ci.yml` |
| 1 | Dependency upgrades (zod 4, vitest 5, ESLint) | **Done** — `a3a19ee`…`f0094dc`; audit 11 → **0** |
| 2 | Security baseline (CSP, 503 semantics, magic bytes, CI) | **Done** — verified below; rate limiting still open |
| 3 | Unblock AI/PayPal (10 BLOCKED) | **Partial** — PayPal sandbox now authenticates (token 200, `create-order` 200); Gemini works via `AI_PROVIDER=gemini` + `gemini-3.5-flash` (summarize 200, deal-dna 201, dispute-report 201); NVIDIA NIM unreachable from this machine since 2026-11-11 |
| 4 | Test-gap PARTIALs → PASS (F005, F024, F073, F113) | Not started |
| 5 | Wire demo pages to real APIs (F009, F010, F080, F097) | Not started |
| 6 | MOCKED → real backend (10 features) | Not started |
| 7 | PARTIAL feature builds (10 features) | Not started |
| 8 | Build 3 absent features; descope 12 regulated | Not started |
| 9 | Matrix regeneration from executed evidence | Not started |

## Phase 1 evidence (executed)

Executed on branch `chore/phase1-dependency-upgrades` (commits `a3a19ee` → `f0094dc`).
Baseline recorded in `docs/remediation/phase1-baseline.txt`.

| Gate | Before | After |
|---|---|---|
| `npm audit --audit-level=moderate` | 11 vulnerabilities (2 critical, 1 high, 8 moderate) | **0 vulnerabilities** |
| `npm run typecheck` | 0 errors | 0 errors |
| `npm run test:unit` | 109/109 | **125/125** (8 → 9 files) |
| `npm run lint` | **3 errors** / 72 warnings | **0 errors** / 72 warnings |
| `npm run build` | exit 0 | exit 0 |

### What was done, and why it was done in three lanes

`npm audit fix --force` was deliberately not used: it performs the zod, vitest and
minimatch upgrades in one unrecoverable diff and destroys attribution between them.

1. **`minimatch` override** (`018458e`). The advisory is not auto-reachable because
   the vulnerable copy is nested under `@typescript-eslint/typescript-estree`, so
   `package.json` needs an explicit `overrides.minimatch: ^11.0.1`.
2. **zod v3 → v4** (`54a00ef`). v4 removed `ZodError.errors`; the 24 call sites
   reading `parsed.error.errors[0]?.message` would have thrown
   `TypeError: Cannot read properties of undefined (reading '0')` in every
   validation error path, turning 400s into 500s. The RED gate was exactly 24
   `TS2339` errors across 20 files — a 1:1 match with the grep of call sites.
   `tests/unit/validation-error-messages.test.ts` was added because
   `validations.test.ts` only asserted `.success` booleans, so the previous suite
   passed 109/109 against a fully broken app. The new guard was verified RED by
   reverting `failZod` to `.errors` (the `TypeError` reproduced), then restored.
3. **vitest 3 → 5 + `@types/node` 20 → 22** (`ca62c77`). The `@types/node` bump is
   mandatory, not cosmetic: vitest 5 declares
   `peerOptional @types/node@^22 || >=24`, and with `^20` pinned `npm install` dies
   with `ERESOLVE`. `^22` also matches the CI runtime.

### Collateral fixes made in the same window

- **Lint errors → 0** (`f0094dc`): three `react-hooks/set-state-in-effect` errors
  were failing `npm run lint` and therefore CI. The loading flags are now derived
  (`loading = !fromContext && !directTx && directLoading`) instead of synchronised
  in an effect body. Browser-verified: `/transactions/:id` and `/deals/:id` still
  resolve to the workspace, `Record not found`, or `Deal not found`.
- **QA harness drift** (`f0094dc`): `scripts/qa/live-api.mjs` hardcoded
  `SEEDED_TRANSACTION`, which changes on every re-seed. The stale id made 24
  checks fail with 404s — including the `VAL-04`…`VAL-12` authorization checks
  that expect `403` but hit the "transaction not found" branch first. The harness
  now resolves the transaction by title through the buyer's own session.
- **AI timeout** (`f0094dc`): the provider request timeout default was 600s while
  the AI routes declare `maxDuration = 300`, so the app's own timeout could never
  fire — the platform killed the request first and the client saw an opaque
  `fetch failed` at ~304s. Default lowered to 240s.
- **CI audit is now blocking** at `--audit-level=moderate`.

## Phase 2 evidence (executed)

- Unit: **92/92** across 8 files (`npm run test:unit`).
- Live authenticated API: **115/115** (`npm run test:live`, `scripts/qa/results/live-api.json`).
- Playwright: **36/36**, including security-header assertions (`scripts/qa/results/playwright.json`).
- Typecheck pass; lint **0 errors / 71 warnings**; production build exit 0.
- Live header probe: CSP with nonce, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `X-Frame-Options: DENY`, `Permissions-Policy`; nonce present in served HTML.

### Deliberate CSP decisions

- `style-src 'unsafe-inline'` retained: Tailwind/React style attributes cannot carry a nonce.
- `'unsafe-eval'` only when `NODE_ENV=development`.
- `upgrade-insecure-requests` only in production.
- Nonce CSP forces dynamic rendering (`export const dynamic = 'force-dynamic'` in `src/app/layout.tsx`); all routes build as `ƒ`.

## Phase 3 blockers (external)

| Provider | Probe | Result |
|---|---|---|
| NVIDIA NIM | `POST /v1/chat/completions` | TCP 443 connects, but the HTTPS request **never returns** from this machine (90s timeout, no response). Unreachable since 2026-11-11. |
| Gemini | `POST /v1beta/models/gemini-3.5-flash:generateContent` | **200 in ~5.8s** — `gemini-3.5-flash` is the working model for this key |
| Gemini (retired model) | `POST /v1beta/models/gemini-2.5-flash:generateContent` | `404` — "no longer available to new users" |
| Gemini (model the API recommends) | `POST /v1beta/models/gemini-3.8-flash:generateContent` | never returns from this machine (45s timeout, no response) |
| PayPal | `POST /v1/oauth2/token` sandbox | **200** — sandbox credentials work; `POST /api/payments/create-order` returns 200 |

AI features are graded from real provider evidence. Because NVIDIA is unreachable
from this machine, `AI_PROVIDER=gemini` with `GEMINI_MODEL=gemini-3.5-flash` is
the working local configuration; the NVIDIA path remains the intended production
provider and must be re-probed when its egress is fixed. Re-run
`scripts/qa/live-api.mjs` after replacing credentials. Nothing may be marked PASS
until the provider returns 200 with real output.

The live provider suite is separate from the hermetic unit gate:

```bash
npm run test:unit      # 125 hermetic tests, no network
npm run test:ai-live   # real provider calls, skipped when no provider is configured
```

### AI provider defects found and fixed (2026-11-11)

| Defect | Fix |
|---|---|
| `gemini-2.5-flash` is retired for new keys; the recommended `gemini-3.8-flash` hangs from this machine | default is now `gemini-3.5-flash`, verified 200 in ~5.8s |
| API key travelled in the query string (`?key=…`), where proxies and log collectors capture it | key now travels in the `x-goog-api-key` header |
| The Gemini call had **no timeout**, so a hung provider pinned the request until the platform's `maxDuration` and the client saw an opaque `fetch failed` | bounded timeout (240s default, `GEMINI_TIMEOUT_MS`), below the routes' `maxDuration` of 300s so our own timeout can fire |
| The whole prompt, guardrails included, was one user turn — a counterparty-controlled title or description could talk past the fence | guardrail moved into a real `systemInstruction`, outside the untrusted channel |
| A provider capacity spike ("This model is currently experiencing high demand … please try again later") failed the request on the first attempt | both provider paths retry a transient failure up to twice (1.5s then 4s backoff); the abort signal is created once so the total still fits inside the routes' `maxDuration` of 300s |
| **Quota errors were being retried**, which multiplied each AI call into up to 3 requests and broke the provider's own limit — the sweep was failing itself | quota and rate-limit answers are classified as **not** transient: `429`, `quota`, `rate limit`, `resource exhausted` and `too many requests` are surfaced instead of retried. The provider asks for a ~56s wait, which does not fit inside a request budget |
| A quota-blocked provider was reported as a generic 502, indistinguishable from the provider being down | quota exhaustion is now **503 with a `Retry-After` header** (honouring the provider's own "retry in 18h50m" hint) and a `ai_provider_quota_exhausted` code; the harness records such a check as **BLOCKED**, never as a pass |

### Environment note: intermittent egress from this machine (2026-11-11)

Several failures during this session were **transport errors from this machine's
network**, not application defects. Each was proven by a direct probe that
succeeded moments later:

| Symptom | Probe result |
|---|---|
| NVIDIA NIM "no response" | TCP 443 connects, but the HTTPS request never returns (90s timeout) |
| `gemini-3.8-flash` "no response" | same; `gemini-3.5-flash` on the same key answers in 5.8s |
| `Sign-in failed … fetch failed` (the whole sweep aborted before any check ran) | the same auth call succeeded 439ms later |

Two consequences, both handled in the harness rather than papered over:

- The harness **retries the sign-in** on transport errors only (fetch failed, socket
  hang up, ECONNRESET, ETIMEDOUT), so a blip cannot abort a 116-check sweep. A
  wrong password still fails immediately.
- Long-running sweeps should be read with this in mind: a transport error in the
  middle of a run is an environment event, not a regression. Re-run before
  treating it as one.

The application itself is not affected by the NVIDIA path (it is not the
configured provider) and its own timeouts are bounded, so a provider blip
surfaces as a clean 502/503 rather than a hang.

### Provider quota constraints (measured 2026-11-11)

Gemini's free tier applies **two** limits to this key:

| Limit | Value | Provider message |
|---|---|---|
| Per minute | 5 `generate_content` requests | `Generate content requests per minute limit exceeded on Free Tier. Please retry in 55.8s.` |
| Per day | 20 `generate_content` requests | `Generate content requests per day limit exceeded on Free Tier. Please retry in 18h50m.` |

Both are enforced as `Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests`.

Three consequences, all handled:

- The application must not retry a quota error inside a request — that multiplies
  the request count and deepens the breach. See the classification rule above.
- The app reports quota exhaustion as **503 with a `Retry-After` header** (honouring
  the provider's own "retry in 18h50m" hint, capped at one day) instead of a
  generic 502, so a caller can tell "come back later" from "the provider is down".
- The live harness paces its AI checks **15s apart** (`QA_AI_SPACING_MS`) and
  records a quota-blocked check as **BLOCKED** — neither a pass nor a failure — so
  the evidence can never be mistaken for a working feature.

The daily limit also bounds production: the AI routes are not rate limited at
the application layer (SEC-01 is still open), so 20 requests per day per key is
the real ceiling until a paid tier or an application-level limit is added.

## Remaining security work

- **SEC-01/SEC-04** rate limiting and upload quotas — needs a shared store (Upstash Redis or DB-backed); in-memory counters are not acceptable for multi-instance.
- **SEC-05** dependency advisories — **resolved in Phase 1**: `npm audit --audit-level=moderate` reports 0 vulnerabilities and the CI audit step is now blocking.
- **SEC-08** valid-signature webhook — still requires a real PayPal webhook round-trip (sandbox credentials now authenticate; the webhook ID still has not been exercised end to end).

## Non-negotiable constraints

- Sandbox/mock payments only; never initiate real payments, crypto, or loans.
- Never print, commit, or log secrets; `.env.local` stays ignored.
- Do not weaken, skip, or delete a test to raise PASS.
- Regulated features (crypto, lending, KYC, cross-border, succession) are descoped, not faked.
