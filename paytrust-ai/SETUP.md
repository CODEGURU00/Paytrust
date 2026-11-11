# PayTrust AI — Setup Guide

This guide takes a clean machine to a running PayTrust AI instance, including the
database, storage, realtime chat, and PayPal webhook.

## 1. Prerequisites

- **Node.js 20+** — <https://nodejs.org/>
- A **Supabase** project (or a local Supabase stack)
- A **PayPal** app from <https://developer.paypal.com/> (sandbox is enough to start)
- A **Gemini API key** from <https://aistudio.google.com/apikey>

## 2. Install dependencies

```bash
cd paytrust-ai
npm install
```

## 3. Configure environment variables

Copy the example file and edit it:

```bash
cp .env.example .env.local
```

Fill in every placeholder:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PayPal
PAYPAL_ENV=sandbox
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
PAYPAL_WEBHOOK_ID=your-paypal-webhook-id
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your-paypal-client-id

# AI provider (nvidia | gemini)
AI_PROVIDER=nvidia
NVIDIA_API_KEY=your-nvidia-nim-api-key
NVIDIA_MODEL=mistralai/mistral-large-4-1t-a52b

# Alternative: Gemini
# AI_PROVIDER=gemini
# GEMINI_API_KEY=your-gemini-api-key
# GEMINI_MODEL=gemini-3.5-flash

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Notes:

- `SUPABASE_SERVICE_ROLE_KEY` and `PAYPAL_CLIENT_SECRET` are **server-only**.
  Never import them into client components and never commit them.
- New Supabase projects use publishable/secret keys (`sb_publishable_…`,
  `sb_secret_…`) instead of legacy JWT keys. Use the **secret** key for
  `SUPABASE_SERVICE_ROLE_KEY`. If privileged server requests return `401` while
  the anon key works, the secret key is wrong, revoked, or from another project.
- `PAYPAL_ENV` accepts `sandbox` or `live`. Anything other than `live` is treated
  as sandbox.
- `AI_PROVIDER` selects `nvidia` or `gemini`. When unset, a configured
  `NVIDIA_API_KEY` wins, then `GEMINI_API_KEY`.
- The default NVIDIA model is a **reasoning model**: it spends output tokens on
  hidden reasoning before writing an answer, so a call takes 70–250s and the
  `NVIDIA_MAX_TOKENS_*` budgets are deliberately large. A budget that is too
  small fails with an error naming the variable to raise rather than returning
  empty text. Calls stream, so long extractions are not cut off by the 300s
  response-header limit.
- `GEMINI_MODEL` and `NVIDIA_MODEL` are optional overrides.
- Placeholder values are intentionally not real credentials. Payments and AI
  calls will fail with a clear configuration error until real values are added.
- The `DEMO_*` variables are optional and only used by `npm run seed`.

## 4. Set up the database

1. Open your Supabase project → **SQL Editor**.
2. Paste the entire contents of [`supabase/setup-all.sql`](./supabase/setup-all.sql).
3. Run it.

The script is idempotent and safe to re-run. It creates:

- `profiles`, `transactions`, `transaction_participants`
- `transaction_messages`, `payment_events`, `attachments`, `ai_summaries`
- `disputes`, `dispute_statements`, `qr_payloads`
- `agreement_versions`, `agreement_approvals`, `agreement_change_requests`
- `commitments`, `milestones`
- `evidence_access_log`, `trust_passport_settings`, `audit_events`
- Constraints, indexes, triggers, and participant-scoped RLS policies
- Immutable transaction financial fields and validated status transitions
- Agreement versioning, mutual-approval, and change-request RPCs
- The `find_seller_by_email`, `find_user_by_email`, and
  `add_transaction_participant` security-definer RPCs
- The private `attachments` storage bucket and its policies
- Realtime publication entries for chat, agreements, commitments, milestones,
  and audit events

`supabase/schema.sql` is a byte-for-byte copy of `setup-all.sql`; use
`setup-all.sql` as the canonical file. The blueprint extension is also kept as
a standalone, idempotent migration at
`supabase/migrations/202611080001_blueprint_backend.sql`. Do not run it
separately on a database that was just created from `setup-all.sql`.

If your database predates the blueprint extension, run only the migration file
in the SQL editor, then re-run `setup-all.sql` if you want to be certain every
policy and grant matches.

### Auth settings

In Supabase → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` for development, your deployed origin
  for production.
- **Redirect URLs**: add
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

The app exchanges Supabase auth codes/tokens at `/auth/callback`. It also sends
password-reset and confirmation links there.

## 5. Configure the PayPal webhook

1. In the PayPal Developer Dashboard, open your app → **Webhooks**.
2. Create a webhook pointing to:

   ```
   https://your-domain.com/api/payments/webhook
   ```

   `/api/paypal-webhook` is an alias of the same handler if you prefer a shorter
   path.
3. Subscribe to at least:
   - `CHECKOUT.ORDER.APPROVED`
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
   - `PAYMENT.CAPTURE.REVERSED`
4. Copy the webhook ID into `PAYPAL_WEBHOOK_ID`.

For local development, expose your dev server with a tunnel (for example
`ngrok http 3000`) and use the public URL in the webhook configuration.

The webhook handler verifies the PayPal signature before touching the database,
and rejects unsigned or invalid requests.

## 6. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>. Sign up, create a transaction, then open it to use
chat, payments, AI summaries, and evidence upload.

## 7. Optional: seed the demo workspace

After the schema is applied and a valid service-role key is configured:

```bash
npm run seed
```

This creates or reuses three demo accounts and one complete transaction with
chat, an approved Deal DNA, commitments, milestones, shared and private
evidence, a dispute with statements from both parties, and a simulated payment
event. It is idempotent: the previous demo transaction is removed first.

Default password: `PayTrustDemo123!`. Override it with `DEMO_PASSWORD`.

The seed script uses the service-role key. If it fails with `401`, fix
`SUPABASE_SERVICE_ROLE_KEY` first.

## 8. Verify the build

```bash
npm run typecheck
npm run lint
npm run build
```

`npm run lint` reports warnings as warnings; errors should be fixed before
deploying.

## Project structure

```
paytrust-ai/
├── supabase/
│   ├── setup-all.sql           # Canonical full database setup (run this)
│   ├── schema.sql              # Identical copy for reference
│   └── migrations/
│       └── 202611080001_blueprint_backend.sql
├── scripts/
│   └── seed-demo.mjs           # Demo accounts + complete transaction
├── docs/
│   └── API.md                  # Full REST reference
├── src/
│   ├── proxy.ts                # Next 16 session-refresh entry point
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout
│   │   ├── auth/
│   │   │   ├── callback/route.ts
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── forgot-password/page.tsx
│   │   ├── (app)/              # Demo-first workspace shell
│   │   │   ├── layout.tsx      # App shell + demo provider
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── transactions/   # List and [id] workspace
│   │   │   ├── deals/[id]/
│   │   │   ├── messages/
│   │   │   ├── payments/       # send, links, split, subscriptions
│   │   │   └── ...             # trust, evidence, knowledge tools
│   │   ├── disputes/           # DB-backed dispute list and detail
│   │   ├── transactions/new/page.tsx
│   │   ├── qr-scan/page.tsx
│   │   └── api/                # REST endpoints (see docs/API.md)
│   ├── actions/                # Typed server actions
│   ├── components/
│   │   ├── auth/  dashboard/  demo/  shell/  ui/  legacy/
│   └── lib/
│       ├── supabase/
│       │   ├── client.ts       # Browser client
│       │   ├── server.ts       # Server client + service-role client
│       │   └── middleware.ts   # Session refresh
│       ├── server/             # Authorization, audit, timeline, passport
│       ├── demo/               # Seeded demo data, types, formatting
│       ├── ai.ts               # Gemini prompts, Deal DNA, mediation
│       ├── api.ts              # Auth/JSON/validation response helpers
│       ├── attachments.ts      # File validation and sanitisation
│       ├── env.ts              # Environment access
│       ├── errors.ts
│       ├── payments.ts         # Order/capture/webhook orchestration
│       ├── paypal.ts           # PayPal REST + webhook verification
│       ├── qr.ts               # QR parsing and validation
│       ├── selects.ts          # Shared safe column projections
│       ├── types.ts            # Domain types
│       ├── utils.ts
│       └── validations.ts      # Zod schemas
```

## Payment lifecycle

```
CREATED → PENDING → APPROVED → COMPLETED
                         ↘ FAILED
CREATED/PENDING → CANCELLED
COMPLETED → REFUNDED
```

- Only the **buyer** can create an order.
- Amount and currency are always read from the transaction row, never from the
  client.
- The order ID is stored on the transaction so return/cancel/webhook events can
  be matched to the right record.
- Only server-side, service-role code changes payment status. Status changes are
  conditional updates, and terminal states are never downgraded.
- `POST /api/payments/simulate` is a separate sandbox-only path for the demo. It
  never calls PayPal and writes a clearly marked `simulated: true` payment
  event. It is not a substitute for the live payment lifecycle above.

## QR safety flow

1. **Decode** — camera via `@zxing/browser`, or manual entry.
2. **Validate** — parse PayTrust, PayPal, UPI, or EMVCo payloads.
3. **Preview** — show the parsed recipient, amount, currency, and reference.
4. **Confirm** — explicit user confirmation.
5. **Capture** — save the payload through `/api/qr-payloads`.

Supported formats:

- **PayTrust**: `paytrust://pay?tx=...` or `paytrust.ai/t/...`
- **PayPal**: `paypal.me/...` or `paypal.com/...`
- **UPI**: `upi://pay?pa=...&pn=...&am=...&cu=...`
- **EMVCo**: numeric TLV payloads

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| "Missing required environment variable" | `.env.local` is incomplete; compare with `.env.example` |
| Privileged requests return `401` | `SUPABASE_SERVICE_ROLE_KEY` is invalid, revoked, or from another project |
| `relation "agreement_versions" does not exist` | Blueprint migration/setup not applied; run `setup-all.sql` |
| `npm run seed` fails with `401` | Service-role key is invalid |
| PayPal order creation fails | Invalid `PAYPAL_CLIENT_ID`/`SECRET`, or wrong `PAYPAL_ENV` |
| Webhook returns 401 | `PAYPAL_WEBHOOK_ID` does not match the configured webhook |
| "Gemini AI is not configured" | `GEMINI_API_KEY` is missing or still a placeholder |
| Deal DNA returns `502` | Gemini is unavailable or returned JSON that did not match the schema |
| Empty dashboard | RLS is working and the user has no participant rows yet |
| Chat does not update live | Realtime publication or the `transaction_messages` table is disabled |
| Attachment upload fails | Storage bucket or policies missing; re-run `setup-all.sql` |
| Evidence download returns 403/404 | Private evidence is only visible to its uploader |

## Security checklist before deploying

- [ ] Rotate any credential that has ever been stored in plaintext or shared.
- [ ] Confirm `.env.local` is not tracked by Git.
- [ ] Use `PAYPAL_ENV=live` and live PayPal credentials in production.
- [ ] Set the Supabase Site URL and redirect URLs to the production origin.
- [ ] Keep the `attachments` bucket private.
- [ ] Run `npm run test:unit && npm run typecheck && npm run lint && npm run build`.
- [ ] Run `npm run test:e2e` against the deployed preview and `npm run test:live`
      against a seeded non-production project. (`npx playwright install chromium`
      once, if Google Chrome is not installed.)
- [ ] Keep the AI provider timeout **below** the AI routes' `maxDuration` of 300s
      (`GEMINI_TIMEOUT_MS` / `NVIDIA_TIMEOUT_MS`, default 240000). A larger value
      means the platform kills the request first and the client sees an opaque
      "fetch failed" instead of a clean timeout.
- [ ] Remember the Gemini free tier allows 5 generate-content requests per minute
      and 20 per day. Use a paid tier for anything beyond a demo; the app
      reports exhaustion as `503` with `Retry-After`.
- [ ] Add the production webhook URL in PayPal and update `PAYPAL_WEBHOOK_ID`.
- [ ] Change or disable the seeded demo accounts before going live.
- [ ] Keep simulated payments clearly labelled; never expose real card, UPI, or
      bank credentials to the simulation endpoint.
