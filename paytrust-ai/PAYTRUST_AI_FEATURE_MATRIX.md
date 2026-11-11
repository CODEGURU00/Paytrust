# PayTrust AI — Feature Matrix

All 118 planned features are listed with exactly one status. Status definitions:

- **PASS** — implemented and exercised by an executed test.
- **FAIL** — implemented but an executed test fails.
- **PARTIAL** — some functionality works; important parts are missing or unverified.
- **MOCKED** — only a simulation, demo or local-state implementation exists.
- **NOT IMPLEMENTED** — no working implementation exists.
- **BLOCKED** — cannot be verified because an external dependency or configuration is unavailable.

## Summary

| Status | Count |
|---|---:|
| PASS | 41 |
| FAIL | 0 |
| PARTIAL | 25 |
| MOCKED | 26 |
| NOT IMPLEMENTED | 16 |
| BLOCKED | 10 |
| **Total** | **118** |

Executed evidence: **79/79 Vitest unit tests**, **35/35 Playwright tests** (1 setup + 34 UI), **115/115 live API checks**, TypeScript typecheck, production build, and ESLint 0 errors. AI/PayPal paths that returned provider errors are recorded as BLOCKED or PARTIAL, never PASS. Bug IDs are defined in `PAYTRUST_AI_REPAIR_REPORT.md`.

## A. Payments and Financial Infrastructure

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F001 | Send Money | PASS | live-api FLOW-01 (201) and FLOW-40 (201); e2e "seeded UUID transaction renders the real database workspace" | BUG-002 | DB-backed path is /transactions/new plus the UUID workspace. /payments/send is demo-backed. Simulated rails only. |
| F002 | Receive Money | PARTIAL | live-api TX-LIST-seller (200), PASSPORT-seller (200); e2e "renders /payments without errors or overflow" | — | Seller can see incoming transactions and payment state, but there is no receive/payout endpoint or settlement rail. |
| F003 | UPI Integration | PARTIAL | unit qr.test.ts "parses UPI payment addresses and amounts", "flags PayTrust and UPI payloads without a recipient/reference" | — | UPI QR detection and validation only. No UPI settlement or VPA payment rail exists. |
| F004 | QR Code Generation | PASS | live-api QR-01 (200), QR-03 anonymous (401); unit qr.test.ts | — | Generates a QR data URL for an authenticated transaction. |
| F005 | QR Code Scanner | PARTIAL | source /qr-scan uses BrowserQRCodeReader plus manual decode; unit qr.test.ts parser coverage | — | Camera permission and live decode were not exercised in headless CI; manual path is covered by parser tests only. |
| F006 | Universal QR Recognition | PASS | unit qr.test.ts 9 tests (PayTrust, PayPal, UPI, EMVCo, unknown); live-api QR-02 (201) | — | Recognizes all documented formats and stores validated payloads. |
| F007 | Payment Request | MOCKED | e2e "renders /payments/send without errors or overflow"; source demo-provider request mode | — | Creates a local demo request only; no API or persistence. |
| F008 | Payment Links | MOCKED | e2e "renders /payments/links without errors or overflow"; page uses local state | — | UI can create/copy links locally; no public link resolver or payment endpoint. |
| F009 | Payment History | PARTIAL | live-api TX-LIST-buyer/seller/witness (200); e2e "renders /payments without errors or overflow" | BUG-003 | DB transaction history API is real; the primary /payments UI is demo-backed. USD workspace regression checks $2,400.00 and no rupee symbol. |
| F010 | Transaction Receipts | PARTIAL | live-api EVIDENCE-KIND-FILTER kind=receipt (200), FLOW-26 upload (201) | — | Receipt evidence can be uploaded and filtered; no generated/downloadable receipt document. |
| F011 | Multi-currency Payments | PASS | unit validations.test.ts "rejects unsupported currency and malformed seller email"; e2e USD $2,400.00 with no ₹; live USD transaction | — | Multiple ISO currencies are stored and formatted per transaction. No FX conversion. |
| F012 | Currency Conversion | NOT IMPLEMENTED | static review: no exchange-rate, quote or conversion service; formatCurrency is display-only | — | No conversion feature exists. |
| F013 | Split Payments | MOCKED | e2e "renders /payments/split without errors or overflow"; page uses local state | — | Demo split calculator only. No ledger, invitations or settlement. |
| F014 | Recurring Payments | MOCKED | e2e "renders /payments/subscriptions without errors or overflow"; page uses local state | — | No scheduler or recurring charge execution. |
| F015 | Subscription Management | MOCKED | e2e "renders /payments/subscriptions without errors or overflow"; local add/pause/cancel state | — | Demo subscription list only. |
| F016 | Refund Management | PASS | live-api FLOW-42 refund (201), FLOW-43 duplicate refund (409) | — | Simulated refunds and duplicate prevention work. PayPal refund webhooks remain BLOCKED. |
| F017 | Business Wallet | MOCKED | e2e "renders /payments without errors or overflow"; demo balance and "PayTrust demo wallet" labels | — | No wallet ledger, top-up, withdrawal or balance reconciliation. |
| F018 | Milestone Payments | PASS | live-api FLOW-40 (201), MILESTONES-buyer/seller/witness (200), FLOW-22/24 | — | Milestone approval and simulated payment are enforced server-side. |
| F019 | Multi-party Approval | PASS | live-api FLOW-11/13/14/15; FLOW-12 witness approval (403) | — | Buyer and seller must both approve; witnesses cannot approve. |
| F020 | Payment Confirmation | PASS | live-api FLOW-41 duplicate release (409), FLOW-44 payment event in timeline | BUG-003 | Simulated confirmation is idempotent and shown in the timeline. PayPal capture/confirmation is BLOCKED. |

## B. Transaction-Linked Communication

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F021 | Transaction Chat | PASS | live-api MESSAGES-buyer/seller/witness (200), FLOW-06 witness (403), FLOW-07 buyer (201); e2e send/persist test | BUG-002 | Participant-only chat is persisted and survives reload. |
| F022 | Text Messaging | PASS | live-api VAL-03 empty (400), FLOW-07 (201), FLOW-08 refetch (200); e2e message persistence | — | Trimmed, length/UUID validated text messages. |
| F023 | Image Sharing | PARTIAL | live-api FLOW-26 PNG upload (201), FLOW-28 evidence listed (200); unit attachments allowlist | — | Images are shared through the Evidence Vault, not inline chat messages. |
| F024 | Document Sharing | PARTIAL | unit attachments.test.ts accepts PDF/DOC/DOCX; live-api EVIDENCE-SIGNED-URL (200), FLOW-29 seller signed URL (200) | — | Document types and signed URLs are implemented; the executed upload used PNG, not a PDF/DOC end-to-end. |
| F025 | Payment Notifications | PARTIAL | live-api FLOW-44 payment event appears in timeline; e2e /dashboard notification center | — | In-app demo notifications plus timeline events; no email, push or webhook-driven notification delivery. |
| F026 | Transaction Timeline | PASS | live-api TIMELINE-buyer/seller/witness (200), FLOW-44; unit timeline.test.ts 7 tests; e2e workspace | BUG-001, BUG-002 | Chronological, participant-scoped timeline with stable tie ordering. |
| F027 | Message References | NOT IMPLEMENTED | static review: no reply, quote or message-reference field/UI | — | Messages cannot reference another message. |
| F028 | Group Transaction Rooms | PASS | live-api FLOW-04 witness invite (201), FLOW-05 witness read (200), PARTICIPANTS-buyer/seller/witness (200) | — | Buyer, seller and witness share a scoped room; witness is read-only in party chat by design. |
| F029 | Transaction Summaries | PARTIAL | live-api AI-SUMMARIZE (502); unit ai.test.ts summary prompt tests; deterministic timeline available | — | AI summary is blocked by the invalid Gemini key; only the deterministic timeline works. |
| F030 | Financial Memory | MOCKED | e2e "renders /memory without errors or overflow"; demo localStorage notes | — | Memory notes are local demo state, not persisted to the database or used by a live assistant. |

## C. AI Transaction Intelligence

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F031 | AI Deal DNA | BLOCKED | live-api AI-DEAL-DNA (502); unit ai.test.ts buildDealDnaPrompt, normalizeDealDnaPayload and schema tests | — | Prompt/schema/draft-only safeguards pass unit tests; live Gemini key is invalid. |
| F032 | AI Transaction Analyzer | MOCKED | e2e "renders /ai without errors or overflow"; canned reply() over demo data | — | No live model call; answers are deterministic demo strings. |
| F033 | AI Transaction Risk Radar | MOCKED | e2e "renders /risk without errors or overflow"; static demo alerts | — | Advisory UI only; no risk model or backend scoring. |
| F034 | AI Promise Tracker | PASS | live-api COMMITMENTS-buyer/seller/witness, FLOW-18 create, FLOW-19 in progress, FLOW-20 complete | — | Deterministic commitment tracker works and is permission-scoped; the AI label is aspirational. |
| F035 | AI Commitment Forecast | NOT IMPLEMENTED | static review: no forecast model, projection or forecast endpoint | — | Only current/overdue commitment status exists. |
| F036 | Voice-to-Agreement | NOT IMPLEMENTED | static review: no audio, speech-to-text or transcription code | — | No voice capture or extraction path. |
| F037 | Agreement Change Detector | PARTIAL | live-api FLOW-16b silent change (409), FLOW-17 invalid decision (400); agreement version history | — | Version changes are blocked/tracked, but there is no AI term-diff detector. |
| F038 | AI Transaction Summarizer | BLOCKED | live-api AI-SUMMARIZE (502); unit ai.test.ts buildSummaryPrompt (neutrality, empty input, 20k truncation) | — | Code and prompt safety are tested; live generation is unavailable. |
| F039 | AI Financial Assistant | MOCKED | e2e "renders /ai without errors or overflow"; canned answers only | — | No live assistant backend. |
| F040 | Transaction Relationship Graph | NOT IMPLEMENTED | static review: no graph/network data model, API or visualization | — | No relationship graph exists. |
| F041 | AI Payment Confirmation Guardian | MOCKED | e2e "renders /guardian without errors or overflow"; demo checks and toast | — | No real pre-payment check engine. |
| F042 | AI Invoice Generator | NOT IMPLEMENTED | static review: invoice page is manual/local; no AI generation endpoint | — | Invoice text is generated from a local template, not AI. |
| F043 | AI Commitment Reminders | PARTIAL | live-api FLOW-19/20 status changes; unit validations commitment due-date tests | — | Deadlines and overdue state exist; no reminder scheduling or delivery. |
| F044 | AI Natural Language Search | MOCKED | e2e "command palette opens with the keyboard shortcut"; client-side demo search | — | No natural-language or AI search; command palette filters demo data only. |

## D. Trust and Reputation

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F045 | Trust Badges | PARTIAL | e2e "renders /trust without errors or overflow"; seeded verified badges | — | Badges render from seeded/demo verification state; no badge assignment engine. |
| F046 | Transaction Reputation | PASS | unit trust-passport.test.ts "computes totals, rates and milestones"; live PASSPORT-buyer/seller/witness | — | Reputation is derived from stored transactions, disputes and commitments. |
| F047 | Completed Transaction Count | PASS | unit trust-passport.test.ts; live PASSPORT-buyer (200) | — | Completed-deal count is computed from transaction status. |
| F048 | Account Age Indicator | PASS | unit trust-passport.test.ts account-age assertions; live PASSPORT-* | — | Account age is derived from profile/transaction history. |
| F049 | Dispute History | PASS | unit trust-passport.test.ts privacy-gated dispute stats; live PASSPORT-* | — | Dispute count and resolution rate are returned and privacy-gated. |
| F050 | Cancellation History | PASS | unit trust-passport.test.ts cancelled_deals; live PASSPORT-* | — | Cancelled-deal count is computed and privacy-gated. |
| F051 | Verified Identity | PARTIAL | e2e "signed-in identity is shown in the profile menu" (Verified); seeded verification_status | — | Verification state is displayed, but no KYC/document verification workflow exists. |
| F052 | Living Trust Passport | PASS | live PASSPORT-buyer/seller/witness; unit trust-passport.test.ts 5 tests; e2e /trust | — | Live passport stats and privacy settings are implemented. |
| F053 | Portable Trust Passport | PASS | live PASSPORT-03 public (200), PASSPORT-05 private (404); e2e share modal | — | Public/private sharing works without exposing private activity. |
| F054 | Freelancer Portfolio | NOT IMPLEMENTED | static review: no portfolio data model or page | — | No portfolio feature exists. |
| F055 | Trust Milestones | MOCKED | e2e /trust renders the milestone list; demo data | — | Visual milestone progress only; no persisted trust-milestone records. |
| F056 | Reputation Privacy Controls | PASS | live PASSPORT-01/02/04; e2e "trust passport privacy switches change state" | — | Owner can hide completed deals, disputes, milestones, evidence and response time. |

## E. AI Dispute Resolution and Protection

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F057 | AI Neutral Mediator | BLOCKED | live AI-MEDIATOR (502); unit ai.test.ts neutrality, missing-statement and empty-record tests | — | Mediator prompt/route exist and are non-binding; live Gemini key is invalid. |
| F058 | Dispute Creation | PASS | live FLOW-33 draft (201), FLOW-34 open (200), VAL-08 witness (403) | — | Disputes are party-only and follow draft → open → resolved/closed. |
| F059 | Evidence Collection | PASS | live FLOW-26 upload (201), FLOW-35 statement (201), FLOW-28 evidence list | — | Party statements and evidence metadata are persisted. |
| F060 | Evidence Vault | PASS | live EVIDENCE-buyer/seller/witness, FLOW-28; e2e /evidence | — | Role-scoped evidence listing with kinds and visibility. |
| F061 | Evidence Timeline | PASS | live EVIDENCE-ACCESS-LOG (200), FLOW-32 upload action logged | — | Access log records uploads and views. |
| F062 | AI Evidence Summarizer | BLOCKED | route /api/ai/dispute-report exists; live AI-MEDIATOR (502); provider key invalid | — | No successful live evidence summary was produced. |
| F063 | Conflicting Claim Detection | BLOCKED | unit ai.test.ts mediator prompt "names missing statements"; live mediator 502 | — | Prompt supports claims comparison; live verification blocked. |
| F064 | Resolution Suggestions | BLOCKED | mediator route exists; live AI-MEDIATOR 502 | — | No successful live suggestion generation. |
| F065 | Tamper-Evident Transaction Timeline | PARTIAL | live TIMELINE-buyer/seller/witness; append-only audit_events in setup-all.sql; SHA-256 attachment checksums; unit timeline tests | BUG-001 | Append-only rows and checksums exist, but there is no per-event hash chain; /audit itself is labelled a visual demo. |
| F066 | Agreement Version History | PASS | live AGREEMENTS-buyer/seller/witness (200), FLOW-16 approved version | — | Versions are stored and returned with approvals. |
| F067 | Payment Protection Alerts | MOCKED | e2e /guardian and /risk render; demo alerts | — | No live alert engine or notification delivery. |
| F068 | Transaction Verification | PARTIAL | live QR-01 generation, QR-02 payload storage; participant access checks | — | QR/participant verification exists; no independent verification certificate or audit proof. |

## F. Agreement and Contract Management

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F069 | Digital Agreement Creation | PASS | live FLOW-10 manual draft (201); unit agreement schema tests | — | Draft creation validates strict terms and starts unapproved. |
| F070 | AI Agreement Extraction | BLOCKED | live AI-DEAL-DNA (502); unit ai.test.ts extraction prompt/schema | — | Live extraction unavailable due to invalid Gemini key. |
| F071 | Mutual Agreement Approval | PASS | live FLOW-11 submit, FLOW-13 buyer, FLOW-15 seller, FLOW-12 witness (403) | — | Two-party approval required; changes after final approval rejected. |
| F072 | Agreement Version Control | PASS | live FLOW-16 approved version, FLOW-16b silent change (409), AGREEMENTS-* | — | Version increments and approved versions are immutable to silent edits. |
| F073 | Agreement Change Requests | PARTIAL | unit validations "requires a comment when requesting changes"; live FLOW-17 invalid decision (400) | — | Change-request decision/comment schema exists; no dedicated end-to-end change-request success test. |
| F074 | Deliverable Tracking | PASS | live FLOW-22 create milestone (201), FLOW-23 submit (200), FLOW-24 approve (200) | — | Deliverables are tracked through milestone status transitions. |
| F075 | Deadline Tracking | PARTIAL | unit commitment/milestone date validation; live FLOW-18 commitment due date | — | Dates and overdue status are stored; no scheduler or reminder delivery. |
| F076 | Revision Policy | PARTIAL | agreementTermsShape includes revision_policy; unit agreement schema accepts it | — | Policy text is stored but not enforced by a revision counter/workflow. |
| F077 | Cancellation Policy | PARTIAL | agreementTermsShape includes cancellation_policy; PayPal cancel route exists | — | Policy text is stored; no agreement-level cancellation enforcement. |
| F078 | Contract-to-Payment | PASS | live FLOW-40 milestone payment (201), FLOW-41 duplicate (409) | — | Payment is tied to an approved milestone in the transaction. |
| F079 | Milestone Management | PASS | live MILESTONES-* (200), FLOW-22/23/24 | — | Create, submit and approve transitions are validated and permissioned. |
| F080 | Digital Agreement Archive | PARTIAL | live AGREEMENTS-* returns versions/approvals; workspace agreement timeline | — | Data is retained and retrievable; no standalone archive/search screen. |

## G. Business and Freelancer Ecosystem

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F081 | Client CRM | MOCKED | e2e "renders /clients without errors or overflow"; local demo client data | — | No persisted CRM records, notes or client APIs. |
| F082 | Business Analytics | MOCKED | e2e "renders /analytics without errors or overflow"; static demo charts | — | Charts are computed from demo data only. |
| F083 | Automatic Reconciliation | NOT IMPLEMENTED | static review: invoice mark-paid is manual; no bank/ledger reconciliation | — | No automatic matching of payments to invoices. |
| F084 | Invoice Management | MOCKED | e2e "renders /invoices without errors or overflow"; local state plus plain-text download | — | Invoices are not persisted and cannot be sent or paid. |
| F085 | Business Payment Dashboard | MOCKED | e2e /payments renders; demo balance and recent payments | — | No business-scoped backend aggregation. |
| F086 | Freelancer Profile | MOCKED | e2e /settings and /trust render; demo identity and bio | — | Profile is seeded/demo, not a live freelancer profile service. |
| F087 | Verified Work Portfolio | NOT IMPLEMENTED | static review: no portfolio or verified-work records | — | No portfolio feature exists. |
| F088 | Customer Transaction History | MOCKED | e2e /clients renders; demo transaction rows | — | Customer history is demo data, not a client-scoped API. |
| F089 | Group Business Payments | MOCKED | e2e /payments/split renders; local split state | — | No group payment execution or ledger. |
| F090 | Business Notifications | MOCKED | e2e /dashboard notification center; demo notifications | — | No business notification delivery or preferences. |

## H. Advanced Financial Features

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F091 | Cryptocurrency Wallet | NOT IMPLEMENTED | static review: no crypto wallet, keys or custody code | — | Not built. |
| F092 | Crypto Payments | NOT IMPLEMENTED | static review: no crypto payment rail or asset handling | — | Not built. |
| F093 | Loan Management | NOT IMPLEMENTED | static review: no loan, interest or amortization code | — | Not built. |
| F094 | Trust-Based Lending Concept | NOT IMPLEMENTED | static review: no lending concept, eligibility or underwriting code | — | Not built. |
| F095 | Repayment Tracking | NOT IMPLEMENTED | static review: no repayment schedule or tracking model | — | Not built. |
| F096 | Cross-Border Transaction Assistant | NOT IMPLEMENTED | static review: currency display only; no cross-border assistant, FX or compliance guidance | — | Not built. |
| F097 | Financial Obligation Dashboard | PARTIAL | live commitments API + workspace promise tracker (FLOW-18/19/20) | — | Obligations are visible per transaction; no aggregated dashboard across deals. |
| F098 | Digital Financial Continuity | NOT IMPLEMENTED | static review: no continuity, succession or recovery-transfer feature | — | Not built. |

## I. Ecosystem Modules

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F099 | PayTrust ID | PARTIAL | live passport APIs; e2e /trust and profile menu | — | Identity/reputation exists inside the passport; no standalone PayTrust ID or SSO. |
| F100 | PayTrust Resolve | PARTIAL | live dispute flow FLOW-33..39; AI mediator 502 | — | Dispute resolution workflow works; AI mediation is blocked. |
| F101 | PayTrust Business | MOCKED | e2e /analytics, /clients, /invoices render; demo data | — | Business module is UI/demo only. |
| F102 | PayTrust Chat | PASS | live MESSAGES-* and FLOW-06/07; e2e chat persistence | — | Transaction-scoped chat works against the real database. |
| F103 | PayTrust Pay | PASS | live FLOW-01/16/18/40/41/42/43; QR-01/02; e2e workspace | — | Simulated payment, refund, milestone and QR paths work end to end. Real PayPal is BLOCKED. |
| F104 | PayTrust AI | BLOCKED | live AI-DEAL-DNA and AI-SUMMARIZE 502; AI pages are canned demo | — | No live AI capability is verifiable. |
| F105 | External Integrations | BLOCKED | PAY-ORDER returned 500; AI endpoints returned 502; PAYPAL_* and GEMINI_API_KEY invalid | — | External providers are configured but unusable with current credentials. |
| F106 | API Infrastructure | PASS | live-api 115/115 checks across 30+ routes; typecheck/build pass | — | Validation, status codes and participant authorization are exercised. |

## J. Security, Account and Platform Infrastructure

| Feature ID | Feature Name | Status | Test Result | Bug Found | Notes |
|---|---|---|---|---|---|
| F107 | Secure Authentication | PASS | live AUTH-01..06 (401); e2e login success and invalid-password tests; auth callback route | — | Supabase cookie sessions, middleware refresh and redirects work. |
| F108 | Identity Verification | PARTIAL | e2e profile menu "Verified"; seeded verification_status in profiles | — | Status is displayed and RLS-protected; no KYC/document verification flow. |
| F109 | Role-Based Permissions | PASS | live AUTH-02 + 10 permission checks; unit transactions-access.test.ts 9 tests | — | Buyer/seller/witness permissions are enforced in route handlers and RLS. |
| F110 | Privacy Controls | PASS | live PASSPORT-01/02/04/05, FLOW-30/31 private evidence 404; unit trust-passport privacy tests | — | Passport and evidence privacy controls work. |
| F111 | Transaction Audit Logs | PASS | live AUTH-03, TIMELINE-*; append-only audit_events and RLS in setup-all.sql | — | Participants can read scoped audit events; clients cannot write them directly. |
| F112 | Secure File Storage | PASS | live EVIDENCE-SIGNED-URL, VAL-13 invalid action (400), FLOW-26/27/29; unit attachments 10 tests | — | Private bucket, signed URLs, MIME allowlist, size cap, filename sanitization and cleanup. |
| F113 | Payment Webhooks | PARTIAL | live VAL-14 malformed (400), VAL-15 unsigned (500); signature verifier implemented | — | Unsigned events never update data, but the valid-signature path is blocked without PAYPAL_WEBHOOK_ID. Missing config returns 500, not 503. |
| F114 | Idempotent Payment Processing | PASS | live FLOW-41 duplicate release (409), FLOW-43 duplicate refund (409); unique provider_event_id | — | Duplicate simulated and provider event records are rejected safely. |
| F115 | Payment Provider Integration | BLOCKED | live PAY-ORDER PayPal sandbox order (500); create-order/capture/webhook cannot complete | — | Invalid/missing PayPal credentials. No real order was created. |
| F116 | Notification System | MOCKED | e2e /dashboard notification center; demo notifications and toasts | — | No persisted notifications table, email or push delivery. |
| F117 | Account Recovery | MOCKED | e2e login links to /auth/forgot-password; page uses setTimeout, no email | — | Recovery UI is explicitly demo-only. Supabase callback supports recovery tokens, but no live reset is wired. |
| F118 | Data Export | MOCKED | e2e /settings renders; exportDemo downloads localStorage JSON | — | No user/account data export API or authorization model. |


---

> **Superseded (2026-11-11).** This document records the QA pass of
> 10 November 2026. The release audit in
> [`docs/remediation/AUDIT.md`](./docs/remediation/AUDIT.md) supersedes it:
> it carries the current P0-P3 status, the verified baseline and the fixes
> applied since. Numbers quoted below reflect the state on 10 November.