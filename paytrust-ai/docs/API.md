# PayTrust AI — Backend API

PayTrust AI exposes a Supabase-backed REST API through Next.js Route Handlers.
The browser frontend is demo-first, but every write below requires a signed-in
Supabase user and is authorized on the server.

- Base URL: `http://localhost:3000` (or your deployed origin)
- Content type: `application/json` unless noted
- Auth: Supabase session cookies (`@supabase/ssr`)
- Service-only credentials (`SUPABASE_SERVICE_ROLE_KEY`, PayPal secret, Gemini
  key) never leave the server

## Response shape

Success:

```json
{ "data": { } }
```

List endpoints may also return metadata:

```json
{ "data": [], "meta": { "counts": { "receipt": 2 } } }
```

Error:

```json
{ "error": "Human-readable message" }
```

Common status codes:

| Status | Meaning |
|---|---|
| `400` | Invalid input or an invalid state transition |
| `401` | No authenticated Supabase user |
| `403` | Authenticated, but not a participant or missing permission |
| `404` | Resource not found, or hidden by row-level security |
| `409` | Conflict (duplicate pending agreement, closed dispute, already paid) |
| `500` | Server/database failure |
| `502` | AI provider failure or invalid AI response |

All IDs are UUIDs unless explicitly noted.

## Authorization model

Transaction-scoped access is enforced twice:

1. **Application layer** — `requireTransactionAccess()` loads the transaction
   and verifies the caller is the buyer, seller, or an explicit participant.
   Permission levels are `full`, `comment`, and `view`.
2. **Database layer** — RLS policies use `is_transaction_participant()` and
   `transaction_permission_level()`.

| Action | Buyer / seller | Witness (`comment`) | Witness (`view`) |
|---|---|---|---|
| Read transaction, chat, timeline | Yes | Yes | Yes |
| Send chat message | Yes | Yes | No (client/DB policy) |
| Upload evidence | Yes | Yes | No |
| Edit/delete own evidence | Yes | Yes | No |
| Create commitments | Yes | No | No |
| Update commitments | Yes | No | No |
| Create/edit agreements | Yes | No | No |
| Approve agreements | Yes | No | No |
| Create/update milestones | Yes | No | No |
| Open a dispute | Yes | No | No |
| Submit a dispute statement | Yes | No | No |
| Change dispute status | Yes | No | No |
| Simulate payment | Yes (release: buyer) | No | No |

Only the buyer and seller can approve an agreement. A witness can never make an
agreement binding.

## Transactions

### `GET /api/transactions`

List transactions visible to the caller, newest first, with buyer and seller
public profiles.

### `POST /api/transactions`

```json
{
  "title": "Website redesign",
  "description": "Optional",
  "amount": 2400,
  "currency": "USD",
  "seller_email": "seller@example.com"
}
```

Creates the transaction and both primary participant rows. The seller must
already have an account.

### `GET /api/transactions/:id`

Full workspace payload: buyer/seller profiles, participants, messages, payment
events, AI summaries, evidence, disputes with statements, agreement versions
with approvals and change requests, commitments, milestones, and audit events.

### `PATCH /api/transactions/:id`

Requires `full` permission.

```json
{ "title": "Updated title", "description": "Updated description" }
```

Financial fields, primary parties, and status are not editable through this
endpoint.

### `GET /api/transactions/:id/timeline`

Chronological timeline assembled from messages, payments, agreements,
approvals, change requests, commitments, milestones, evidence, disputes,
statements, participants, and audit events.

```json
{
  "data": {
    "transaction": { "id": "…", "status": "APPROVED" },
    "entries": [
      {
        "id": "agreement:…:created",
        "type": "agreement",
        "title": "Deal DNA v1 (draft)",
        "description": "AI-assisted draft — requires review and mutual approval",
        "actor_id": "…",
        "occurred_at": "2026-11-08T10:00:00.000Z",
        "metadata": { "agreement_id": "…", "version": 1 }
      }
    ]
  }
}
```

### `GET /api/transactions/:id/participants`

List explicit participants with public profiles.

### `POST /api/transactions/:id/participants`

Buyer or seller only.

```json
{
  "email": "witness@example.com",
  "role": "witness",
  "permission_level": "comment"
}
```

Adds/updates a witness. `permission_level` is `full`, `comment`, or `view`.

## Deal DNA / agreements

Agreement statuses: `draft`, `pending_approval`, `approved`,
`changes_requested`, `superseded`, `cancelled`.

Terms are validated server-side and may include: `purpose`, `amount`,
`currency`, `deliverables`, `deadline`, `responsibilities`,
`revision_policy`, `cancellation_policy`, `milestones`, `open_questions`,
`summary`, `missing_terms`, `uncertainties`.

### `GET /api/transactions/:id/agreements`

List all versions newest first, with approvals and change requests.

### `POST /api/transactions/:id/agreements`

Requires `full` permission. Creates a manual draft (version is allocated by the
database under a transaction lock).

```json
{
  "terms": {
    "purpose": "Five-page marketing site redesign",
    "amount": 2400,
    "currency": "USD",
    "deliverables": ["Home", "Pricing", "About", "Features", "Contact"],
    "deadline": "Three weeks",
    "responsibilities": [
      { "owner": "seller", "description": "Design and build" },
      { "owner": "buyer", "description": "Copy, brand assets, feedback" }
    ],
    "revision_policy": "Two rounds included",
    "cancellation_policy": "Completed work is billed",
    "milestones": [
      { "title": "Design concepts", "amount": 1200, "due_date": "Week 1" }
    ],
    "open_questions": [],
    "summary": "Two equal milestones"
  }
}
```

### `GET /api/transactions/:id/agreements/:agreementId`

Agreement detail with approvals and change requests.

### `PATCH /api/transactions/:id/agreements/:agreementId`

Edit a `draft` or `changes_requested` version. Editing resets the version to
`draft` and marks open change requests as incorporated.

```json
{ "terms": { "purpose": "Updated purpose" } }
```

The body requires the complete `terms` object.

### `POST /api/transactions/:id/agreements/:agreementId/submit`

Moves a draft to `pending_approval` and clears prior approvals for that version.
Buyer or seller only.

### `GET /api/transactions/:id/agreements/:agreementId/approvals`

List approvals with public profiles.

### `POST /api/transactions/:id/agreements/:agreementId/approvals`

Buyer or seller only. Both primary parties must approve; a witness cannot
approve. When both approve, the database marks the version `approved` and
supersedes older approved versions.

Approve:

```json
{ "decision": "approved", "comment": "Matches what we agreed" }
```

Request changes / reject (comment required, minimum 3 characters):

```json
{ "decision": "changes_requested", "comment": "Add a revision limit" }
```

`decision` is `approved`, `changes_requested`, or `rejected`. Requesting
changes creates a change request and moves the agreement to
`changes_requested`; the draft must be edited and resubmitted.

## Commitments

Statuses: `open`, `in_progress`, `completed`, `overdue`, `cancelled`.

### `GET /api/transactions/:id/commitments`

List commitments with owner and creator profiles.

### `POST /api/transactions/:id/commitments`

Requires `full` permission.

```json
{
  "description": "Send final handoff files",
  "due_at": "2026-11-20T17:00:00.000Z",
  "owner_id": "optional-uuid",
  "agreement_id": "optional-uuid"
}
```

`owner_id` defaults to the caller. The owner must be a transaction participant.

### `PATCH /api/transactions/:id/commitments/:commitmentId`

Requires `full` permission.

```json
{ "status": "completed", "due_at": null, "description": "Updated" }
```

Completing sets `completed_at`; re-opening clears it.

## Milestones

Statuses: `pending`, `in_progress`, `submitted`, `approved`, `paid`,
`cancelled`.

### `GET /api/transactions/:id/milestones`

List milestones ordered by position.

### `POST /api/transactions/:id/milestones`

Requires `full` permission. Currency is taken from the transaction. The sum of
non-cancelled milestone amounts cannot exceed the transaction amount.

```json
{
  "title": "Design concepts",
  "description": "Initial concepts and one revision",
  "amount": 1200,
  "due_at": "2026-11-14T17:00:00.000Z",
  "position": 0
}
```

### `PATCH /api/transactions/:id/milestones/:milestoneId`

Requires `full` permission. Allowed transitions are enforced by the database:

```
pending      → in_progress | submitted | approved | cancelled
in_progress  → submitted | approved | cancelled
submitted    → in_progress | approved | cancelled
approved     → cancelled        (paid is set by the payment service)
```

`status: "approved"` records `approved_by` and `completed_at`. `paid` cannot be
set through this endpoint; use the simulated payment endpoint.

## Evidence Vault

Evidence metadata lives on `attachments`; files live in the private
`attachments` Supabase Storage bucket. Kinds: `file`, `image`, `receipt`,
`document`. Visibility: `participants` or `private`.

### `POST /api/attachments/upload`

`multipart/form-data`:

| Field | Required | Notes |
|---|---|---|
| `transaction_id` | Yes | UUID |
| `file` | Yes | Max 10 MB, allow-listed MIME types |
| `kind` | No | Inferred from MIME when omitted |
| `description` | No | Max 1000 chars |
| `visibility` | No | Defaults to `participants` |
| `commitment_id` | No | Must belong to the same transaction |
| `milestone_id` | No | Must belong to the same transaction |
| `supersedes_id` | No | Same transaction; increments `version` |

The server sanitizes the file name, uploads to a transaction-scoped path,
computes a SHA-256 checksum, validates links, and records an `uploaded` access
event. Failed metadata inserts remove the uploaded object.

### `GET /api/transactions/:id/evidence`

List visible evidence with uploader profiles. Optional filters:
`kind`, `commitment_id`, `milestone_id`. Other users' private evidence is
excluded, and `meta.counts` reports totals by kind.

### `GET /api/evidence/:id/url?action=view|download`

Creates a 10-minute signed URL and records a `viewed`/`downloaded` access event.
Private evidence is readable only by its uploader.

### `GET /api/evidence/:id/access`

Returns the last 100 view/download/upload/share events for the evidence, with
public user profiles. Transaction participants only; private evidence is
visible only to its uploader.

### `PATCH /api/evidence/:id`

Uploader only.

```json
{
  "description": "Updated description",
  "visibility": "private",
  "kind": "receipt",
  "commitment_id": null,
  "milestone_id": null
}
```

Setting `supersedes_id` increments the version from the superseded item.

### `DELETE /api/evidence/:id`

Uploader only. Deletes the metadata row and removes the storage object. The
metadata delete is authoritative; a storage failure is logged but does not
restore the row.

## Disputes and mediation

Dispute statuses: `draft`, `open`, `under_review`, `resolved`, `closed`.

Allowed transitions:

```
draft        → open | closed
open         → under_review | resolved | closed
under_review → resolved | closed
resolved     → closed
closed       → (terminal)
```

### `GET /api/disputes`

List disputes visible to the caller. Optional filters: `transaction_id`,
`status`.

### `POST /api/disputes`

Buyer or seller only. Creates a `draft`.

```json
{
  "transaction_id": "uuid",
  "reason": "Final delivery did not match the approved scope",
  "report": "Optional factual account"
}
```

### `GET /api/disputes/:id`

Dispute detail with the transaction, opener, party statements, and the metadata
of evidence referenced by those statements.

### `PATCH /api/disputes/:id`

Buyer or seller only.

```json
{
  "status": "resolved",
  "resolution": "Seller refunded the second milestone."
}
```

A `resolution` is required when moving to `resolved`. The database records
`resolved_at` and `resolved_by`. AI mediation summaries are server-managed and
cannot be edited through this endpoint.

### `GET /api/disputes/:id/statements`

List party statements in chronological order.

### `POST /api/disputes/:id/statements`

Buyer or seller only. Rejected for resolved/closed disputes.

```json
{
  "statement": "The final build was due one week ago…",
  "evidence_ids": ["uuid"]
}
```

Referenced evidence must belong to the same transaction.

## AI

AI output is advisory. It never approves an agreement, changes a dispute
outcome, or moves money. Prompts treat chat and source text as untrusted data,
instruct the model not to invent facts, and abstain when information is
missing.

### `POST /api/ai/summarize`

```json
{
  "transaction_id": "uuid",
  "type": "conversation"
}
```

`type` is `conversation`, `commitments`, `evidence_report`, or
`missing_evidence`. Stores the result in `ai_summaries`.

### `POST /api/ai/dispute-report`

```json
{
  "transaction_id": "uuid",
  "reason": "Scope mismatch",
  "report": "Optional factual account"
}
```

Generates a neutral draft dispute report. It does not create a dispute or
decide fault.

### `POST /api/ai/deal-dna`

Requires `full` permission. Extracts **draft** agreement terms from the chat
(and optional source text), validates the JSON with Zod, and creates a `draft`
agreement version with `source = "ai"`, the model name, confidence, and
`source_context` (summary, missing terms, uncertainties).

```json
{
  "transaction_id": "uuid",
  "source_text": "Optional pasted scope or email"
}
```

Response:

```json
{
  "data": {
    "agreement": { "id": "…", "version": 1, "status": "draft", "source": "ai" },
    "extraction": {
      "summary": "…",
      "terms": { },
      "missing_terms": ["Cancellation policy"],
      "uncertainties": ["Revision limit is ambiguous"],
      "confidence": 0.82
    },
    "model": "gemini-2.5-flash"
  }
}
```

The AI can never submit, approve, or sign the agreement. A human must edit,
submit, and obtain both-party approval.

### `POST /api/ai/mediator`

Any participant can request a neutral mediation summary.

```json
{ "dispute_id": "uuid" }
```

Reads party statements and evidence metadata visible to the caller, produces a
neutral summary (claims attributed by party, agreed/conflicting points,
available evidence, missing evidence, disclaimer), stores it in
`disputes.ai_summary` and `ai_summaries` (`dispute_mediation`), and records an
audit event.

Response:

```json
{
  "data": {
    "dispute_id": "uuid",
    "summary": "…",
    "disclaimer": "This is an informational summary…",
    "generated_at": "2026-11-08T12:00:00.000Z",
    "source": { "statements": 2, "evidence": 3 }
  }
}
```

## Trust Passport

### `GET /api/trust-passport`

Own passport: public profile fields, privacy settings, aggregate stats, and the
last 10 audit events where the caller was the actor.

Stats include deal counts, dispute counts/resolution rate, commitment totals,
milestone totals, shared evidence count, and account age.

### `PATCH /api/trust-passport`

```json
{
  "is_public": true,
  "headline": "Design and frontend partner",
  "location": "Mumbai, IN",
  "show_completed_deals": true,
  "show_milestones": true,
  "show_response_time": true,
  "show_in_community": true,
  "show_dispute_history": false,
  "share_evidence": false
}
```

### `GET /api/trust-passport/:userId`

Public passport. Returns `404` unless the owner enabled `is_public` (the owner
can always read their own). Gated fields are zeroed when the owner disabled that
section. Recent activity is only returned to the owner.

## Payments

### PayPal sandbox (existing)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/payments/create-order` | Buyer creates a server-side PayPal order |
| POST | `/api/payments/capture-order` | Server-side capture |
| GET | `/api/payments/return` | Approval return, captures, redirects |
| GET | `/api/payments/cancel` | Cancel return |
| GET/POST | `/api/payments/webhook` | Verified PayPal webhook |
| GET/POST | `/api/paypal-webhook` | Alias of the webhook |

Amounts and currencies are always read from the database. Transaction status
changes are server-side only.

### `POST /api/payments/simulate`

Buyer or seller only. **This route never contacts PayPal and never moves real
money.** It writes a `payment_events` row with `provider = "paytrust"`,
`payload_summary.simulated = true`, and a note that no funds moved.

```json
{
  "transaction_id": "uuid",
  "type": "release"
}
```

`type` is:

| Type | Effect |
|---|---|
| `release` | Buyer only; marks the transaction `COMPLETED` |
| `refund` | Marks the transaction `REFUNDED` |
| `milestone_payment` | Buyer only; requires an `approved` milestone and `milestone_id`; marks it `paid` and completes the transaction when every non-cancelled milestone is paid |

Response includes `simulated: true`, the updated transaction, the milestone (if
any), and the payment event.

Do not send card numbers, UPI PINs, bank credentials, or real payment
credentials to this endpoint.

## QR

### `POST /api/qr-payloads`

Saves a validated QR payload for the caller after the 5-step
decode → validate → preview → confirm → capture flow.

### `POST /api/qr/generate`

```json
{ "data": "paytrust://pay?tx=…" }
```

Returns a QR image data URL.

## Data model

| Table | Purpose |
|---|---|
| `profiles` | Public profile, verification, deal count |
| `transactions` | Buyer/seller deal, amount, currency, status |
| `transaction_participants` | Explicit witnesses and permission levels |
| `transaction_messages` | Realtime chat |
| `agreement_versions` | Deal DNA versions and AI/source metadata |
| `agreement_approvals` | Buyer/seller decisions per version |
| `agreement_change_requests` | Requested edits and resolution |
| `commitments` | Promise Tracker items |
| `milestones` | Milestone schedule and payment state |
| `attachments` | Evidence metadata (files in Storage) |
| `evidence_access_log` | View/download/upload/share events |
| `payment_events` | PayPal and simulated PayTrust events |
| `disputes` | Dispute record, resolution, AI mediation summary |
| `dispute_statements` | Party statements and referenced evidence |
| `ai_summaries` | Archived AI output by type |
| `trust_passport_settings` | Public profile/privacy toggles |
| `audit_events` | Append-only transaction audit trail |
| `qr_payloads` | Saved validated QR payloads |

## Audit trail

Database triggers append `audit_events` for changes to transactions,
participants, agreements, approvals, change requests, commitments, milestones,
evidence, disputes, statements, and payment events. The table is append-only:
clients have `SELECT` only, scoped to transaction participants. Server-side
actions that do not change a row (AI runs, evidence access, simulated payments)
also append explicit events through `logAuditEvent()`.

## Local verification

```bash
npm run typecheck
npm run lint
npm run build
npm run seed
```

`npm run seed` requires a valid `SUPABASE_SERVICE_ROLE_KEY` and the schema
applied. It creates/reuses three demo accounts and a complete transaction with
chat, an approved Deal DNA, commitments, milestones, shared/private evidence, a
dispute with statements, and a simulated payment event.

Demo password: `PayTrustDemo123!` (override with `DEMO_PASSWORD`).
