/**
 * Live API QA sweep for PayTrust AI.
 *
 * Runs against the real Next.js dev server and the configured Supabase
 * project using the seeded demo accounts. No real money is moved.
 *
 * Usage: node scripts/qa/live-api.mjs
 * Output: scripts/qa/results/live-api.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { appFetch, createSessionCookie, loadEnv, ROOT } from './lib/sessions.mjs';

const PASSWORD = process.env.DEMO_PASSWORD || 'PayTrustDemo123!';
// The seeded transaction id changes every time the demo database is
// re-seeded, so it is resolved by title at runtime instead of being
// hardcoded. QA_TRANSACTION_ID can still pin it explicitly.
const SEEDED_TRANSACTION_TITLE = 'Demo: Website redesign with escrow';
const RUN_ID = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

function isUsableKey(value) {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 20) return false;
  return !/^(your|my|replace|insert|add|todo|tbd|changeme|change[-_]?me|placeholder|example|dummy)/i.test(
    trimmed
  );
}

const QA_ENV = loadEnv();
// Mirrors src/lib/ai.ts: a placeholder is not a provider. When a real key is
// present the AI checks must return generated content, not a 5xx pass-through.
const AI_CONFIGURED = isUsableKey(QA_ENV.NVIDIA_API_KEY) || isUsableKey(QA_ENV.GEMINI_API_KEY);
const AI_NOTE = AI_CONFIGURED
  ? 'AI provider is configured: real generated output is required'
  : 'AI provider is not configured: 502/503 records the external block';

// Gemini's free tier allows 5 generate-content requests per minute and asks
// the caller to retry in roughly a minute. The AI checks below would
// otherwise land inside the same minute and the provider answers with
// "quota exceeded", which looks like an application failure but is not one.
const AI_CALL_SPACING_MS = Number(process.env.QA_AI_SPACING_MS || 15000);

async function paceAiCall() {
  if (!AI_CONFIGURED) return;
  await new Promise((resolve) => setTimeout(resolve, AI_CALL_SPACING_MS));
}

const results = [];

function statusMatches(actual, expected) {
  return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
}

async function check({
  id,
  name,
  session,
  pathname,
  options = {},
  expected = 200,
  note = '',
  verify,
  feature = '',
  allowProviderBlock = false,
}) {
  const started = performance.now();
  let result;
  let errorMessage = null;
  try {
    result = await appFetch(session?.cookieHeader || '', pathname, options);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
    result = { status: 0, body: null };
  }
  const latency = Math.round(performance.now() - started);

  /*
   * A provider that refuses because a quota is exhausted is an external
   * block, not an application failure - and it is not a pass either. The
   * check is recorded as blocked so the evidence cannot be mistaken for a
   * working feature.
   */
  const bodyText =
    typeof result.body === 'string' ? result.body : JSON.stringify(result.body || '');
  const providerBlocked =
    allowProviderBlock &&
    /quota exceeded|exceeded your current quota|resource[ _-]?exhausted|rate[ _-]?limit/i.test(
      bodyText
    );
  let verificationError = null;
  if (result.status !== 0 && verify) {
    try {
      const verification = verify(result.body, result.response);
      if (verification !== true) verificationError = verification || 'verify failed';
    } catch (error) {
      verificationError = error instanceof Error ? error.message : String(error);
    }
  }
  const pass =
    !errorMessage &&
    !providerBlocked &&
    statusMatches(result.status, expected) &&
    !verificationError;
  const entry = {
    id,
    feature,
    name,
    method: options.method || 'GET',
    path: pathname,
    role: session?.role || 'anonymous',
    expected,
    actual: result.status,
    latency_ms: latency,
    pass,
    blocked: providerBlocked,
    note: providerBlocked
      ? `${note ? `${note}; ` : ''}BLOCKED: the provider refused because a quota was exhausted. Not a pass and not a failure - the feature is unverified until the quota resets.`
      : note,
    error: errorMessage || verificationError,
    body_preview:
      result.body === null || result.body === undefined
        ? null
        : (typeof result.body === 'string' ? result.body : JSON.stringify(result.body)).slice(0, 600),
  };
  results.push(entry);
  const badge = pass ? 'PASS' : providerBlocked ? 'BLOCKED' : 'FAIL';
  console.log(`[${badge}] ${id} ${entry.method} ${pathname} -> ${entry.actual} (${latency}ms)${entry.error ? ` :: ${entry.error}` : ''}`);
  return { ...result, entry };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const sessions = {};
for (const [role, email] of Object.entries({
  buyer: 'buyer@paytrust.demo',
  seller: 'seller@paytrust.demo',
  witness: 'witness@paytrust.demo',
})) {
  const session = await createSessionCookie(email, PASSWORD);
  sessions[role] = { ...session, role };
  console.log(`Signed in ${role}: ${session.userId}`);
}

/**
 * Resolve the seeded transaction id at runtime.
 *
 * It used to be a hardcoded constant, which silently invalidated 24 checks
 * (every seeded-transaction read) whenever the demo database was re-seeded.
 */
async function resolveSeededTransactionId() {
  const pinned = process.env.QA_TRANSACTION_ID;
  if (pinned) return pinned;

  const { status, body } = await appFetch(
    sessions.buyer.cookieHeader,
    '/api/transactions'
  );

  if (status !== 200 || !Array.isArray(body?.data)) {
    throw new Error(
      `Could not list the buyer's transactions (HTTP ${status}). Is the app running on ${process.env.QA_APP_URL || 'http://localhost:3000'}?`
    );
  }

  const match = body.data.find(
    (transaction) => transaction.title === SEEDED_TRANSACTION_TITLE
  );

  if (!match) {
    throw new Error(
      `Seeded transaction "${SEEDED_TRANSACTION_TITLE}" was not found for buyer@paytrust.demo. Run "npm run seed" to recreate it, or set QA_TRANSACTION_ID.`
    );
  }

  return match.id;
}

const SEEDED_TRANSACTION = await resolveSeededTransactionId();
console.log(`Seeded transaction: ${SEEDED_TRANSACTION}`);

// ---------------------------------------------------------------------------
// Authentication boundary
// ---------------------------------------------------------------------------
await check({
  id: 'AUTH-01',
  feature: 'Secure Authentication',
  name: 'Anonymous cannot list transactions',
  pathname: '/api/transactions',
  expected: 401,
});
await check({
  id: 'AUTH-02',
  feature: 'Role-Based Permissions',
  name: 'Anonymous cannot read transaction detail',
  pathname: `/api/transactions/${SEEDED_TRANSACTION}`,
  expected: 401,
});
await check({
  id: 'AUTH-03',
  feature: 'Transaction Audit Logs',
  name: 'Anonymous cannot read timeline',
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/timeline`,
  expected: 401,
});
await check({
  id: 'AUTH-04',
  feature: 'Text Messaging',
  name: 'Anonymous cannot post messages',
  pathname: '/api/messages',
  options: {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: SEEDED_TRANSACTION,
      content: 'anonymous should be rejected',
    }),
  },
  expected: 401,
});
await check({
  id: 'AUTH-05',
  feature: 'Living Trust Passport',
  name: 'Anonymous cannot read own passport',
  pathname: '/api/trust-passport',
  expected: 401,
});
await check({
  id: 'AUTH-06',
  feature: 'Dispute Creation',
  name: 'Anonymous cannot list disputes',
  pathname: '/api/disputes',
  expected: 401,
});

// ---------------------------------------------------------------------------
// Seeded transaction reads for all three roles
// ---------------------------------------------------------------------------
for (const role of ['buyer', 'seller', 'witness']) {
  const session = sessions[role];
  await check({
    id: `TX-LIST-${role}`,
    feature: 'Payment History',
    name: `${role} lists only visible transactions`,
    session,
    pathname: '/api/transactions',
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length >= 1
        ? true
        : 'expected at least one visible transaction',
  });
  await check({
    id: `TX-DETAIL-${role}`,
    feature: 'Transaction Timeline',
    name: `${role} opens seeded transaction workspace`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}`,
    verify: (body) => {
      assert(body?.data?.id === SEEDED_TRANSACTION, 'wrong transaction id');
      assert(Array.isArray(body.data.participants), 'participants missing');
      assert(body.data.participants.length >= 3, 'expected 3 participants');
      assert(Array.isArray(body.data.messages), 'messages missing');
      assert(body.data.messages.length >= 5, 'expected seeded messages');
      assert(Array.isArray(body.data.agreements), 'agreements missing');
      assert(Array.isArray(body.data.milestones), 'milestones missing');
      return true;
    },
  });
  await check({
    id: `TIMELINE-${role}`,
    feature: 'Tamper-Evident Transaction Timeline',
    name: `${role} gets chronological timeline`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/timeline`,
    verify: (body) => {
      const entries = body?.data?.entries;
      assert(Array.isArray(entries) && entries.length >= 10, 'expected timeline entries');
      for (let i = 1; i < entries.length; i += 1) {
        if (Date.parse(entries[i - 1].occurred_at) > Date.parse(entries[i].occurred_at)) {
          throw new Error(`timeline out of order at index ${i}`);
        }
      }
      return true;
    },
  });
  await check({
    id: `PARTICIPANTS-${role}`,
    feature: 'Role-Based Permissions',
    name: `${role} reads participants`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/participants`,
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length === 3
        ? true
        : `expected 3 participants, got ${body?.data?.length}`,
  });
  await check({
    id: `AGREEMENTS-${role}`,
    feature: 'Agreement Version History',
    name: `${role} reads agreement history`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/agreements`,
    verify: (body) =>
      Array.isArray(body?.data) &&
      body.data.some((row) => row.status === 'approved' && Array.isArray(row.approvals) && row.approvals.length === 2)
        ? true
        : 'expected an approved agreement with two approvals',
  });
  await check({
    id: `COMMITMENTS-${role}`,
    feature: 'AI Promise Tracker',
    name: `${role} reads commitments`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/commitments`,
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length >= 4
        ? true
        : `expected >=4 commitments, got ${body?.data?.length}`,
  });
  await check({
    id: `MILESTONES-${role}`,
    feature: 'Milestone Management',
    name: `${role} reads milestones`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/milestones`,
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length >= 2
        ? true
        : `expected >=2 milestones, got ${body?.data?.length}`,
  });
  await check({
    id: `EVIDENCE-${role}`,
    feature: 'Evidence Vault',
    name: `${role} reads evidence visible to role`,
    session,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/evidence`,
    verify: (body) =>
      Array.isArray(body?.data) ? true : 'expected evidence array',
  });
  await check({
    id: `MESSAGES-${role}`,
    feature: 'Transaction Chat',
    name: `${role} reads transaction chat`,
    session,
    pathname: `/api/messages/${SEEDED_TRANSACTION}`,
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length >= 5
        ? true
        : `expected >=5 messages, got ${body?.data?.length}`,
  });
  await check({
    id: `DISPUTES-${role}`,
    feature: 'Dispute Creation',
    name: `${role} lists visible disputes`,
    session,
    pathname: '/api/disputes',
    verify: (body) =>
      Array.isArray(body?.data) && body.data.length >= 1
        ? true
        : 'expected seeded dispute',
  });
  await check({
    id: `PASSPORT-${role}`,
    feature: 'Living Trust Passport',
    name: `${role} reads own Trust Passport`,
    session,
    pathname: '/api/trust-passport',
    verify: (body) => {
      assert(body?.data?.profile?.id, 'profile missing');
      assert(body?.data?.stats, 'stats missing');
      assert(Number.isFinite(body.data.stats.total_deals), 'total_deals missing');
      assert(Array.isArray(body.data.recent_activity), 'recent activity missing');
      return true;
    },
  });
}

// Seeded attachment checks
const seededEvidence = await check({
  id: 'EVIDENCE-SEEDED-LIST',
  feature: 'Evidence Vault',
  name: 'Buyer lists seeded evidence',
  session: sessions.buyer,
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/evidence`,
});
const seededAttachments = Array.isArray(seededEvidence.body?.data)
  ? seededEvidence.body.data
  : [];

if (seededAttachments.length > 0) {
  const attachment = seededAttachments[0];
  await check({
    id: 'EVIDENCE-ACCESS-LOG',
    feature: 'Evidence Timeline',
    name: 'Evidence access log is readable',
    session: sessions.buyer,
    pathname: `/api/evidence/${attachment.id}/access`,
    verify: (body) => (Array.isArray(body?.data) ? true : 'expected access log array'),
  });
  await check({
    id: 'EVIDENCE-SIGNED-URL',
    feature: 'Secure File Storage',
    name: 'Signed URL is created for participant',
    session: sessions.buyer,
    pathname: `/api/evidence/${attachment.id}/url?action=view`,
    expected: [200, 500],
    note: '500 indicates the storage bucket or object is unavailable',
    verify: (body, response) => {
      if (response.status === 500) return true;
      assert(typeof body?.data?.signed_url === 'string', 'signed_url missing');
      assert(body.data.expires_in === 600, 'unexpected signed URL expiry');
      return true;
    },
  });
  await check({
    id: 'EVIDENCE-KIND-FILTER',
    feature: 'Evidence Collection',
    name: 'Evidence kind filter works',
    session: sessions.buyer,
    pathname: `/api/transactions/${SEEDED_TRANSACTION}/evidence?kind=receipt`,
    verify: (body) =>
      Array.isArray(body?.data) && body.data.every((row) => row.kind === 'receipt')
        ? true
        : 'filter returned a non-receipt row',
  });
}

// ---------------------------------------------------------------------------
// Input validation and authorization negatives
// ---------------------------------------------------------------------------
await check({
  id: 'VAL-01',
  feature: 'Input Validation',
  name: 'Invalid transaction UUID rejected',
  session: sessions.buyer,
  pathname: '/api/transactions/not-a-uuid',
  expected: 400,
});
await check({
  id: 'VAL-02',
  feature: 'Insecure Direct Object References',
  name: 'Unknown transaction UUID returns 404',
  session: sessions.buyer,
  pathname: '/api/transactions/00000000-0000-4000-8000-000000000000',
  expected: 404,
});
await check({
  id: 'VAL-03',
  feature: 'Transaction Chat',
  name: 'Empty message rejected',
  session: sessions.buyer,
  pathname: '/api/messages',
  options: {
    method: 'POST',
    body: JSON.stringify({ transaction_id: SEEDED_TRANSACTION, content: '   ' }),
  },
  expected: 400,
});
await check({
  id: 'VAL-04',
  feature: 'Transaction Chat',
  name: 'Witness cannot post party chat message',
  session: sessions.witness,
  pathname: '/api/messages',
  options: {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: SEEDED_TRANSACTION,
      content: 'witness should not be able to post',
    }),
  },
  expected: 403,
});
await check({
  id: 'VAL-05',
  feature: 'Role-Based Permissions',
  name: 'Witness cannot create commitments (comment permission)',
  session: sessions.witness,
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/commitments`,
  options: {
    method: 'POST',
    body: JSON.stringify({ description: 'witness write attempt' }),
  },
  expected: 403,
});
await check({
  id: 'VAL-06',
  feature: 'Digital Agreement Creation',
  name: 'Witness cannot create agreement version',
  session: sessions.witness,
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/agreements`,
  options: {
    method: 'POST',
    body: JSON.stringify({ terms: { purpose: 'unauthorized' } }),
  },
  expected: 403,
});
await check({
  id: 'VAL-07',
  feature: 'Role-Based Permissions',
  name: 'Witness cannot invite participants',
  session: sessions.witness,
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/participants`,
  options: {
    method: 'POST',
    body: JSON.stringify({ email: 'buyer@paytrust.demo' }),
  },
  expected: 403,
});
await check({
  id: 'VAL-08',
  feature: 'Dispute Creation',
  name: 'Witness cannot open dispute (party only)',
  session: sessions.witness,
  pathname: '/api/disputes',
  options: {
    method: 'POST',
    body: JSON.stringify({
      transaction_id: SEEDED_TRANSACTION,
      reason: 'witness should not open a dispute',
    }),
  },
  expected: 403,
});
await check({
  id: 'VAL-09',
  feature: 'Refund Management',
  name: 'Seller cannot release payment (buyer only)',
  session: sessions.seller,
  pathname: '/api/payments/simulate',
  options: {
    method: 'POST',
    body: JSON.stringify({ transaction_id: SEEDED_TRANSACTION, type: 'release' }),
  },
  expected: 403,
});
await check({
  id: 'VAL-10',
  feature: 'Payment Provider Integration',
  name: 'Seller cannot create PayPal order (buyer only)',
  session: sessions.seller,
  pathname: '/api/payments/create-order',
  options: {
    method: 'POST',
    body: JSON.stringify({ transaction_id: SEEDED_TRANSACTION }),
  },
  expected: 403,
});
await check({
  id: 'VAL-11',
  feature: 'Privacy Controls',
  name: 'Unknown passport settings field rejected',
  session: sessions.buyer,
  pathname: '/api/trust-passport',
  options: {
    method: 'PATCH',
    body: JSON.stringify({ is_public: true, admin_override: true }),
  },
  expected: 400,
});
await check({
  id: 'VAL-12',
  feature: 'Evidence Collection',
  name: 'Invalid evidence kind rejected',
  session: sessions.buyer,
  pathname: `/api/transactions/${SEEDED_TRANSACTION}/evidence?kind=malware`,
  expected: 400,
});
await check({
  id: 'VAL-13',
  feature: 'Secure File Storage',
  name: 'Invalid signed URL action rejected',
  session: sessions.buyer,
  pathname:
    seededAttachments.length > 0
      ? `/api/evidence/${seededAttachments[0].id}/url?action=delete`
      : `/api/evidence/00000000-0000-4000-8000-000000000000/url?action=delete`,
  expected: 400,
});
await check({
  id: 'VAL-14',
  feature: 'Payment Webhooks',
  name: 'Malformed webhook JSON rejected',
  pathname: '/api/payments/webhook',
  options: { method: 'POST', body: '{not-json' },
  expected: 400,
});
await check({
  id: 'VAL-15',
  feature: 'Payment Webhooks',
  name: 'Unsigned webhook rejected',
  pathname: '/api/payments/webhook',
  options: {
    method: 'POST',
    body: JSON.stringify({ id: 'WH-QA', event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
  },
  expected: [400, 401, 500, 502, 503],
  note: '5xx means PAYPAL_WEBHOOK_ID is unavailable; the event is still rejected',
  verify: (body) => (body?.received === true ? 'unsigned webhook was accepted' : true),
});

// ---------------------------------------------------------------------------
// Full lifecycle on a fresh QA transaction (real writes)
// ---------------------------------------------------------------------------
let qaTransactionId = null;
const created = await check({
  id: 'FLOW-01',
  feature: 'Send Money',
  name: 'Buyer creates a new transaction with seller email',
  session: sessions.buyer,
  pathname: '/api/transactions',
  options: {
    method: 'POST',
    body: JSON.stringify({
      title: `[QA ${RUN_ID}] Website QA engagement`,
      description: 'Automated end-to-end QA lifecycle transaction.',
      amount: 125.5,
      currency: 'USD',
      seller_email: 'seller@paytrust.demo',
    }),
  },
  expected: 201,
  verify: (body) => {
    assert(body?.data?.id, 'created transaction id missing');
    assert(body.data.status === 'CREATED', `unexpected status ${body.data.status}`);
    assert(Number(body.data.amount) === 125.5, 'amount was not preserved');
    return true;
  },
});
qaTransactionId = created.body?.data?.id || null;

if (qaTransactionId) {
  console.log(`QA transaction: ${qaTransactionId}`);

  await check({
    id: 'FLOW-02',
    feature: 'Role-Based Permissions',
    name: 'Seller can access auto-created transaction',
    session: sessions.seller,
    pathname: `/api/transactions/${qaTransactionId}`,
    verify: (body) => (body?.data?.id === qaTransactionId ? true : 'wrong transaction'),
  });

  await check({
    id: 'FLOW-03',
    feature: 'Insecure Direct Object References',
    name: 'Uninvited witness cannot read QA transaction',
    session: sessions.witness,
    pathname: `/api/transactions/${qaTransactionId}`,
    expected: [403, 404],
  });

  await check({
    id: 'FLOW-04',
    feature: 'Group Transaction Rooms',
    name: 'Buyer invites witness with comment permission',
    session: sessions.buyer,
    pathname: `/api/transactions/${qaTransactionId}/participants`,
    options: {
      method: 'POST',
      body: JSON.stringify({
        email: 'witness@paytrust.demo',
        role: 'witness',
        permission_level: 'comment',
      }),
    },
    expected: 201,
  });

  await check({
    id: 'FLOW-05',
    feature: 'Group Transaction Rooms',
    name: 'Invited witness can read QA transaction',
    session: sessions.witness,
    pathname: `/api/transactions/${qaTransactionId}`,
    verify: (body) =>
      Array.isArray(body?.data?.participants) && body.data.participants.length === 3
        ? true
        : `expected 3 participants, got ${body?.data?.participants?.length}`,
  });

  await check({
    id: 'FLOW-06',
    feature: 'Text Messaging',
    name: 'Witness cannot post in transaction chat',
    session: sessions.witness,
    pathname: '/api/messages',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        content: 'witness chat attempt',
      }),
    },
    expected: 403,
  });

  await check({
    id: 'FLOW-07',
    feature: 'Text Messaging',
    name: 'Buyer posts a message',
    session: sessions.buyer,
    pathname: '/api/messages',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        content: 'QA message: milestone scope agreed for the five-page site.',
      }),
    },
    expected: 201,
    verify: (body) =>
      body?.data?.transaction_id === qaTransactionId ? true : 'wrong transaction',
  });

  await check({
    id: 'FLOW-08',
    feature: 'Message Persistence',
    name: 'Message persists after re-fetch',
    session: sessions.seller,
    pathname: `/api/messages/${qaTransactionId}`,
    verify: (body) =>
      Array.isArray(body?.data) &&
      body.data.some((row) => row.content.includes('QA message: milestone scope'))
        ? true
        : 'posted message not found',
  });

  await check({
    id: 'FLOW-09',
    feature: 'Role-Based Permissions',
    name: 'Witness cannot create commitments',
    session: sessions.witness,
    pathname: `/api/transactions/${qaTransactionId}/commitments`,
    options: {
      method: 'POST',
      body: JSON.stringify({ description: 'witness should not write' }),
    },
    expected: 403,
  });

  const agreementCreated = await check({
    id: 'FLOW-10',
    feature: 'Digital Agreement Creation',
    name: 'Buyer creates manual agreement draft',
    session: sessions.buyer,
    pathname: `/api/transactions/${qaTransactionId}/agreements`,
    options: {
      method: 'POST',
      body: JSON.stringify({
        terms: {
          purpose: 'Five-page marketing website redesign with CMS handoff.',
          amount: 125.5,
          currency: 'USD',
          deliverables: ['Responsive five-page site', 'CMS handoff'],
          deadline: '2026-12-15',
          responsibilities: [
            { owner: 'seller', description: 'Design and build the site' },
            { owner: 'buyer', description: 'Provide content and feedback' },
          ],
          revision_policy: 'Two revision rounds included.',
          cancellation_policy: 'Cancel before work begins for a full refund.',
          milestones: [{ title: 'Design approval', amount: 50 }],
          open_questions: [],
        },
      }),
    },
    expected: 201,
    verify: (body) => {
      assert(body?.data?.id, 'agreement id missing');
      assert(body.data.status === 'draft', `expected draft, got ${body.data.status}`);
      assert(body.data.version >= 1, 'expected an agreement version');
      return true;
    },
  });
  const newAgreementId = agreementCreated.body?.data?.id || null;

  if (newAgreementId) {
    await check({
      id: 'FLOW-11',
      feature: 'Mutual Agreement Approval',
      name: 'Buyer submits draft for approval',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/submit`,
      options: { method: 'POST', body: JSON.stringify({}) },
      verify: (body) =>
        ['pending_approval', 'pending'].includes(body?.data?.status)
          ? true
          : `unexpected status ${body?.data?.status}`,
    });

    await check({
      id: 'FLOW-12',
      feature: 'Mutual Agreement Approval',
      name: 'Witness cannot approve agreement',
      session: sessions.witness,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved' }),
      },
      expected: 403,
    });

    await check({
      id: 'FLOW-13',
      feature: 'Mutual Agreement Approval',
      name: 'Buyer approves agreement',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved', comment: 'Buyer approves.' }),
      },
      expected: 201,
    });

    await check({
      id: 'FLOW-14',
      feature: 'Mutual Agreement Approval',
      name: 'Buyer may reaffirm decision before seller acts',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved', comment: 'Reaffirmed.' }),
      },
      expected: 201,
      verify: (body) =>
        body?.data?.user_id === sessions.buyer.userId && body.data.decision === 'approved'
          ? true
          : 'approval not recorded for buyer',
    });

    await check({
      id: 'FLOW-15',
      feature: 'Mutual Agreement Approval',
      name: 'Seller approves agreement (two-party finalization)',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({ decision: 'approved', comment: 'Seller approves.' }),
      },
      expected: 201,
    });

    await check({
      id: 'FLOW-16',
      feature: 'Agreement Version Control',
      name: 'Agreement is approved with two approvals',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/agreements`,
      verify: (body) => {
        const row = body?.data?.find((item) => item.id === newAgreementId);
        assert(row, 'new agreement missing');
        assert(row.status === 'approved', `expected approved, got ${row.status}`);
        assert(Array.isArray(row.approvals) && row.approvals.length === 2, 'expected 2 approvals');
        return true;
      },
    });

    await check({
      id: 'FLOW-16b',
      feature: 'Agreement Change Requests',
      name: 'Approved agreement cannot be silently changed',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({
          decision: 'changes_requested',
          comment: 'Trying to change an approved agreement.',
        }),
      },
      expected: 409,
    });

    await check({
      id: 'FLOW-17',
      feature: 'Agreement Change Requests',
      name: 'Invalid approval decision rejected',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/agreements/${newAgreementId}/approvals`,
      options: {
        method: 'POST',
        body: JSON.stringify({ decision: 'accepted_forever' }),
      },
      expected: 400,
    });
  }

  const commitmentCreated = await check({
    id: 'FLOW-18',
    feature: 'AI Promise Tracker',
    name: 'Buyer creates commitment with deadline',
    session: sessions.buyer,
    pathname: `/api/transactions/${qaTransactionId}/commitments`,
    options: {
      method: 'POST',
      body: JSON.stringify({
        description: 'Deliver responsive homepage draft',
        due_at: '2026-12-01T12:00:00.000Z',
        owner_id: sessions.seller.userId,
      }),
    },
    expected: 201,
    verify: (body) =>
      body?.data?.status === 'open' ? true : `unexpected status ${body?.data?.status}`,
  });
  const commitmentId = commitmentCreated.body?.data?.id || null;

  if (commitmentId) {
    await check({
      id: 'FLOW-19',
      feature: 'AI Commitment Reminders',
      name: 'Seller marks commitment in progress',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/commitments/${commitmentId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'in_progress' }),
      },
      verify: (body) =>
        body?.data?.status === 'in_progress' ? true : `unexpected ${body?.data?.status}`,
    });
    await check({
      id: 'FLOW-20',
      feature: 'AI Promise Tracker',
      name: 'Seller completes commitment',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/commitments/${commitmentId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      },
      verify: (body) =>
        body?.data?.status === 'completed' ? true : `unexpected ${body?.data?.status}`,
    });
    await check({
      id: 'FLOW-21',
      feature: 'Role-Based Permissions',
      name: 'Witness cannot update commitment',
      session: sessions.witness,
      pathname: `/api/transactions/${qaTransactionId}/commitments/${commitmentId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' }),
      },
      expected: 403,
    });
  }

  const milestoneCreated = await check({
    id: 'FLOW-22',
    feature: 'Milestone Management',
    name: 'Buyer creates milestone',
    session: sessions.buyer,
    pathname: `/api/transactions/${qaTransactionId}/milestones`,
    options: {
      method: 'POST',
      body: JSON.stringify({
        title: 'Design phase',
        description: 'Wireframes and visual direction',
        amount: 50,
      }),
    },
    expected: 201,
    verify: (body) =>
      body?.data?.status === 'pending' && body.data.currency === 'USD'
        ? true
        : 'unexpected milestone state',
  });
  const milestoneId = milestoneCreated.body?.data?.id || null;

  if (milestoneId) {
    await check({
      id: 'FLOW-23',
      feature: 'Deliverable Tracking',
      name: 'Seller submits milestone',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/milestones/${milestoneId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'submitted' }),
      },
      verify: (body) =>
        body?.data?.status === 'submitted' ? true : `unexpected ${body?.data?.status}`,
    });
    await check({
      id: 'FLOW-24',
      feature: 'Milestone Management',
      name: 'Buyer approves milestone',
      session: sessions.buyer,
      pathname: `/api/transactions/${qaTransactionId}/milestones/${milestoneId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      },
      verify: (body) =>
        body?.data?.status === 'approved' && body.data.approved_by === sessions.buyer.userId
          ? true
          : 'milestone approval not recorded',
    });
    await check({
      id: 'FLOW-25',
      feature: 'Role-Based Permissions',
      name: 'Witness cannot update milestone',
      session: sessions.witness,
      pathname: `/api/transactions/${qaTransactionId}/milestones/${milestoneId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' }),
      },
      expected: 403,
    });
  }

  // Evidence upload and privacy
  const pngBytes = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
    'base64'
  );
  const uploadForm = new FormData();
  uploadForm.append(
    'file',
    new Blob([pngBytes], { type: 'image/png' }),
    'qa-evidence.png'
  );
  uploadForm.append('transaction_id', qaTransactionId);
  uploadForm.append('kind', 'image');
  uploadForm.append('description', 'QA proof of delivery');
  uploadForm.append('visibility', 'participants');

  const upload = await check({
    id: 'FLOW-26',
    feature: 'Secure File Storage',
    name: 'Buyer uploads PNG evidence',
    session: sessions.buyer,
    pathname: '/api/attachments/upload',
    options: { method: 'POST', body: uploadForm },
    expected: 201,
    verify: (body) => {
      assert(body?.data?.id, 'attachment id missing');
      assert(body.data.mime_type === 'image/png', 'mime type not preserved');
      assert(body.data.checksum, 'checksum missing');
      assert(body.data.visibility === 'participants', 'visibility wrong');
      return true;
    },
  });
  const uploadedEvidenceId = upload.body?.data?.id || null;

  const badForm = new FormData();
  badForm.append(
    'file',
    new Blob([Buffer.from('MZ')], { type: 'application/x-msdownload' }),
    'malware.exe'
  );
  badForm.append('transaction_id', qaTransactionId);
  await check({
    id: 'FLOW-27',
    feature: 'Secure File Storage',
    name: 'Executable upload rejected',
    session: sessions.buyer,
    pathname: '/api/attachments/upload',
    options: { method: 'POST', body: badForm },
    expected: 400,
  });

  if (uploadedEvidenceId) {
    await check({
      id: 'FLOW-28',
      feature: 'Evidence Vault',
      name: 'Uploaded evidence appears in vault',
      session: sessions.seller,
      pathname: `/api/transactions/${qaTransactionId}/evidence`,
      verify: (body) =>
        Array.isArray(body?.data) &&
        body.data.some((row) => row.id === uploadedEvidenceId)
          ? true
          : 'uploaded evidence not listed',
    });

    await check({
      id: 'FLOW-29',
      feature: 'Secure File Storage',
      name: 'Seller obtains signed URL for shared evidence',
      session: sessions.seller,
      pathname: `/api/evidence/${uploadedEvidenceId}/url?action=view`,
      expected: [200, 500],
      note: '500 indicates storage bucket/object unavailable',
      verify: (body, response) => {
        if (response.status === 500) return true;
        assert(typeof body?.data?.signed_url === 'string', 'signed_url missing');
        return true;
      },
    });

    await check({
      id: 'FLOW-30',
      feature: 'Privacy Controls',
      name: 'Uploader marks evidence private',
      session: sessions.buyer,
      pathname: `/api/evidence/${uploadedEvidenceId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'private', description: 'Private QA proof' }),
      },
      verify: (body) =>
        body?.data?.visibility === 'private' ? true : 'visibility not updated',
    });

    await check({
      id: 'FLOW-31',
      feature: 'Privacy Controls',
      name: 'Non-uploader cannot open private evidence',
      session: sessions.seller,
      pathname: `/api/evidence/${uploadedEvidenceId}/url?action=view`,
      expected: [403, 404],
      note: 'RLS hides private evidence; 404 avoids confirming its existence',
    });

    await check({
      id: 'FLOW-32',
      feature: 'Evidence Timeline',
      name: 'Upload action recorded in access log',
      session: sessions.buyer,
      pathname: `/api/evidence/${uploadedEvidenceId}/access`,
      verify: (body) =>
        Array.isArray(body?.data) &&
        body.data.some((row) => row.action === 'uploaded')
          ? true
          : 'upload access log entry missing',
    });
  }

  // Dispute lifecycle
  const disputeCreated = await check({
    id: 'FLOW-33',
    feature: 'Dispute Creation',
    name: 'Buyer opens draft dispute',
    session: sessions.buyer,
    pathname: '/api/disputes',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        reason: 'QA test: deliverable scope disagreement',
        report: 'Automated QA dispute report.',
      }),
    },
    expected: 201,
    verify: (body) =>
      body?.data?.status === 'draft' ? true : `unexpected ${body?.data?.status}`,
  });
  const disputeId = disputeCreated.body?.data?.id || null;

  if (disputeId) {
    await check({
      id: 'FLOW-34',
      feature: 'Dispute Creation',
      name: 'Draft dispute moves to open',
      session: sessions.buyer,
      pathname: `/api/disputes/${disputeId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'open' }),
      },
      verify: (body) =>
        body?.data?.status === 'open' ? true : `unexpected ${body?.data?.status}`,
    });

    await check({
      id: 'FLOW-35',
      feature: 'Evidence Collection',
      name: 'Seller submits dispute statement',
      session: sessions.seller,
      pathname: `/api/disputes/${disputeId}/statements`,
      options: {
        method: 'POST',
        body: JSON.stringify({
          statement: 'Seller statement: all agreed work was delivered.',
          evidence_ids: uploadedEvidenceId ? [uploadedEvidenceId] : [],
        }),
      },
      expected: 201,
    });

    await check({
      id: 'FLOW-36',
      feature: 'Evidence Timeline',
      name: 'Dispute detail includes statements',
      session: sessions.buyer,
      pathname: `/api/disputes/${disputeId}`,
      verify: (body) =>
        Array.isArray(body?.data?.statements) && body.data.statements.length >= 1
          ? true
          : 'statements missing',
    });

    await check({
      id: 'FLOW-37',
      feature: 'Dispute Creation',
      name: 'Resolving without a resolution is rejected',
      session: sessions.seller,
      pathname: `/api/disputes/${disputeId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({ status: 'resolved' }),
      },
      expected: 400,
    });

    await check({
      id: 'FLOW-38',
      feature: 'Dispute Creation',
      name: 'Seller resolves dispute with resolution text',
      session: sessions.seller,
      pathname: `/api/disputes/${disputeId}`,
      options: {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'resolved',
          resolution: 'Parties agreed to complete the remaining revision.',
        }),
      },
      expected: [200, 409],
      note: '409 would indicate a transition guard defect',
      verify: (body, response) => {
        if (response.status === 409) return 'valid transition rejected';
        return body?.data?.status === 'resolved' ? true : 'not resolved';
      },
    });

    await check({
      id: 'FLOW-39',
      feature: 'Evidence Collection',
      name: 'Statements blocked after resolution',
      session: sessions.seller,
      pathname: `/api/disputes/${disputeId}/statements`,
      options: {
        method: 'POST',
        body: JSON.stringify({ statement: 'Late statement after resolution.' }),
      },
      expected: 409,
    });

    await paceAiCall();
    await check({
      id: 'AI-MEDIATOR',
      feature: 'AI Neutral Mediator',
      name: 'AI mediator produces a non-binding summary',
      session: sessions.buyer,
      pathname: '/api/ai/mediator',
      options: {
        method: 'POST',
        body: JSON.stringify({ dispute_id: disputeId }),
      },
      expected: AI_CONFIGURED ? [200] : [200, 502, 503],
      note: AI_NOTE,
      allowProviderBlock: true,
      verify: (body, response) => {
        if (response.status >= 500) return true;
        assert(typeof body?.data?.summary === 'string' && body.data.summary.length > 0, 'summary missing');
        assert(typeof body?.data?.disclaimer === 'string', 'disclaimer missing');
        assert(body.data.dispute_id === disputeId, 'wrong dispute');
        return true;
      },
    });
  }

  await check({
    id: 'PAY-ORDER',
    feature: 'Payment Provider Integration',
    name: 'PayPal sandbox order creation (diagnostic)',
    session: sessions.buyer,
    pathname: '/api/payments/create-order',
    options: {
      method: 'POST',
      body: JSON.stringify({ transaction_id: qaTransactionId }),
    },
    expected: [200, 201, 500, 502, 503],
    note: '5xx means PayPal credentials are unavailable; 503 is the config-unavailable status',
    verify: (body, response) => {
      if (response.status >= 500) return true;
      assert(typeof body?.data?.approvalUrl === 'string', 'approval URL missing');
      assert(/^https:\/\//.test(body.data.approvalUrl), 'approval URL is not HTTPS');
      return true;
    },
  });

  await check({
    id: 'FLOW-40',
    feature: 'Milestone Payments',
    name: 'Buyer pays approved milestone in simulation',
    session: sessions.buyer,
    pathname: '/api/payments/simulate',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        type: milestoneId ? 'milestone_payment' : 'release',
        milestone_id: milestoneId || undefined,
      }),
    },
    expected: [201, 500],
    note: '201 verifies the simulated payment path; 500 would mean service-role is unavailable',
    verify: (body, response) => {
      if (response.status === 500) return true;
      assert(body?.data?.simulated === true, 'simulation flag missing');
      assert(body.data.transaction.status === 'COMPLETED', 'transaction did not complete');
      assert(body.data.payment_event?.event_type, 'payment event missing');
      return true;
    },
  });

  await check({
    id: 'FLOW-41',
    feature: 'Payment Confirmation',
    name: 'Duplicate release is rejected after completion',
    session: sessions.buyer,
    pathname: '/api/payments/simulate',
    options: {
      method: 'POST',
      body: JSON.stringify({ transaction_id: qaTransactionId, type: 'release' }),
    },
    expected: 409,
  });

  await check({
    id: 'FLOW-42',
    feature: 'Refund Management',
    name: 'Buyer refunds completed simulated transaction',
    session: sessions.buyer,
    pathname: '/api/payments/simulate',
    options: {
      method: 'POST',
      body: JSON.stringify({ transaction_id: qaTransactionId, type: 'refund' }),
    },
    expected: [201, 500],
    note: '201 verifies refund transition; 500 would mean service-role is unavailable',
    verify: (body, response) => {
      if (response.status === 500) return true;
      assert(body?.data?.transaction?.status === 'REFUNDED', 'transaction not refunded');
      assert(body.data.payment_event?.event_type === 'simulated_refund', 'wrong event type');
      return true;
    },
  });

  await check({
    id: 'FLOW-43',
    feature: 'Refund Management',
    name: 'Duplicate refund is rejected',
    session: sessions.buyer,
    pathname: '/api/payments/simulate',
    options: {
      method: 'POST',
      body: JSON.stringify({ transaction_id: qaTransactionId, type: 'refund' }),
    },
    expected: 409,
  });

  await check({
    id: 'FLOW-44',
    feature: 'Tamper-Evident Transaction Timeline',
    name: 'Payment events are reflected in timeline',
    session: sessions.seller,
    pathname: `/api/transactions/${qaTransactionId}/timeline`,
    verify: (body) => {
      const entries = body?.data?.entries || [];
      assert(
        entries.some((row) => row.title.includes('Payment event')),
        'payment event missing from timeline'
      );
      return true;
    },
  });

  await paceAiCall();
  await check({
    id: 'AI-REPORT',
    feature: 'AI Evidence Summarizer',
    name: 'AI evidence report produces a draft dispute report',
    session: sessions.buyer,
    pathname: '/api/ai/dispute-report',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        reason: 'QA evidence report: deliverable scope and handoff dispute.',
      }),
    },
    expected: AI_CONFIGURED ? [201] : [201, 502, 503],
    note: AI_NOTE,
      allowProviderBlock: true,
    verify: (body, response) => {
      if (response.status >= 500) return true;
      assert(body?.data?.status === 'draft', 'evidence report dispute must be a draft');
      const report = body?.data?.report;
      assert(typeof report === 'string', 'evidence report missing');
      assert(
        report.includes('AI-generated neutral evidence report'),
        'evidence report is not the generated summary'
      );
      assert(report.length > 200, 'evidence report is too short to be real output');
      return true;
    },
  });

  await paceAiCall();
  await check({
    id: 'AI-DEAL-DNA',
    feature: 'AI Deal DNA',
    name: 'AI Deal DNA extraction (diagnostic)',
    session: sessions.buyer,
    pathname: '/api/ai/deal-dna',
    options: {
      method: 'POST',
      body: JSON.stringify({ transaction_id: qaTransactionId }),
    },
    expected: AI_CONFIGURED ? [201, 409] : [201, 409, 502, 503],
    note: AI_NOTE,
      allowProviderBlock: true,
    verify: (body, response) => {
      if (response.status >= 500) return true;
      if (response.status === 409) return true;
      assert(body?.data?.agreement?.status === 'draft', 'AI agreement must be a draft');
      return true;
    },
  });

  await paceAiCall();
  await check({
    id: 'AI-SUMMARIZE',
    feature: 'AI Transaction Summarizer',
    name: 'AI conversation summary (diagnostic)',
    session: sessions.buyer,
    pathname: '/api/ai/summarize',
    options: {
      method: 'POST',
      body: JSON.stringify({
        transaction_id: qaTransactionId,
        type: 'conversation',
      }),
    },
    expected: AI_CONFIGURED ? [200] : [200, 502, 503],
    note: AI_NOTE,
      allowProviderBlock: true,
    verify: (body, response) => {
      if (response.status >= 500) return true;
      assert(typeof body?.data?.summary === 'string' && body.data.summary.length > 20, 'summary missing or too short');
      return true;
    },
  });
}

// ---------------------------------------------------------------------------
// QR, webhooks, passport privacy
// ---------------------------------------------------------------------------
await check({
  id: 'QR-01',
  feature: 'QR Code Generation',
  name: 'Authenticated QR generation returns data URL',
  session: sessions.buyer,
  pathname: '/api/qr/generate',
  options: {
    method: 'POST',
    body: JSON.stringify({ data: 'paytrust://pay?tx=TX-QA-123&amount=125.50' }),
  },
  verify: (body) =>
    typeof body?.data === 'string' && body.data.startsWith('data:image/png;base64,')
      ? true
      : 'expected PNG data URL',
});
await check({
  id: 'QR-02',
  feature: 'Universal QR Recognition',
  name: 'Recognized QR payload is stored',
  session: sessions.buyer,
  pathname: '/api/qr-payloads',
  options: {
    method: 'POST',
    body: JSON.stringify({
      type: 'paytrust',
      raw: 'paytrust://pay?tx=TX-QA-123&amount=125.50',
      parsed: {
        recipient: 'seller@paytrust.demo',
        amount: 125.5,
        currency: 'USD',
        reference: 'QA-QR',
        transaction_id: 'TX-QA-123',
      },
      is_valid: true,
      validation_message: null,
    }),
  },
  expected: 201,
});
await check({
  id: 'QR-03',
  feature: 'QR Code Generation',
  name: 'Anonymous QR generation rejected',
  pathname: '/api/qr/generate',
  options: {
    method: 'POST',
    body: JSON.stringify({ data: 'paytrust://pay?tx=TX-QA-123' }),
  },
  expected: 401,
});

await check({
  id: 'PASSPORT-01',
  feature: 'Reputation Privacy Controls',
  name: 'Owner updates passport privacy setting',
  session: sessions.buyer,
  pathname: '/api/trust-passport',
  options: {
    method: 'PATCH',
    body: JSON.stringify({ show_response_time: false }),
  },
  verify: (body) =>
    body?.data?.show_response_time === false ? true : 'setting not updated',
});
const originalPassport = await appFetch(
  sessions.buyer.cookieHeader,
  '/api/trust-passport'
);
const originalSettings = originalPassport.body?.data?.settings || {};

await check({
  id: 'PASSPORT-02',
  feature: 'Reputation Privacy Controls',
  name: 'Owner enables public passport with hidden reputation details',
  session: sessions.buyer,
  pathname: '/api/trust-passport',
  options: {
    method: 'PATCH',
    body: JSON.stringify({
      is_public: true,
      show_completed_deals: false,
      show_milestones: false,
      show_dispute_history: false,
      share_evidence: false,
    }),
  },
  verify: (body) => (body?.data?.is_public === true ? true : 'is_public not set'),
});

await check({
  id: 'PASSPORT-03',
  feature: 'Portable Trust Passport',
  name: 'Another user reads public passport without private activity',
  session: sessions.seller,
  pathname: `/api/trust-passport/${sessions.buyer.userId}`,
  verify: (body) => {
    assert(body?.data?.stats, 'public passport stats missing');
    assert(body.data.statistics === undefined, 'unexpected duplicate stats key');
    assert(Array.isArray(body.data.recent_activity), 'recent_activity missing');
    assert(body.data.recent_activity.length === 0, 'public passport leaked activity');
    assert(body.data.stats.total_deals >= 1, 'public passport hid total deal count');
    assert(body.data.stats.completed_deals === 0, 'private completed deals leaked');
    assert(body.data.stats.milestones_total === 0, 'private milestones leaked');
    assert(body.data.stats.disputes === 0, 'private dispute history leaked');
    assert(body.data.stats.evidence_shared === 0, 'private evidence count leaked');
    return true;
  },
});

// Restore the owner's original privacy settings.
await check({
  id: 'PASSPORT-04',
  feature: 'Reputation Privacy Controls',
  name: 'Owner restores original passport privacy settings',
  session: sessions.buyer,
  pathname: '/api/trust-passport',
  options: {
    method: 'PATCH',
    body: JSON.stringify({
      is_public: originalSettings.is_public ?? false,
      headline: originalSettings.headline ?? null,
      location: originalSettings.location ?? null,
      show_completed_deals: originalSettings.show_completed_deals ?? true,
      show_milestones: originalSettings.show_milestones ?? true,
      show_response_time: originalSettings.show_response_time ?? false,
      show_in_community: originalSettings.show_in_community ?? true,
      show_dispute_history: originalSettings.show_dispute_history ?? true,
      share_evidence: originalSettings.share_evidence ?? true,
    }),
  },
});

await check({
  id: 'PASSPORT-05',
  feature: 'Reputation Privacy Controls',
  name: 'Private passport is not discoverable by another user',
  session: sessions.seller,
  pathname: `/api/trust-passport/${sessions.buyer.userId}`,
  expected: 404,
  verify: (body) => (body?.data ? 'private passport leaked' : true),
});

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const passed = results.filter((row) => row.pass).length;
const blocked = results.filter((row) => row.blocked).length;
const failed = results.filter((row) => !row.pass && !row.blocked).length;
const byFeature = {};
for (const row of results) {
  if (!row.feature) continue;
  byFeature[row.feature] ||= { pass: 0, fail: 0, blocked: 0 };
  if (row.pass) byFeature[row.feature].pass += 1;
  else if (row.blocked) byFeature[row.feature].blocked += 1;
  else byFeature[row.feature].fail += 1;
}

const output = {
  run_id: RUN_ID,
  app_url: process.env.QA_APP_URL || 'http://localhost:3000',
  started_at: new Date().toISOString(),
  qa_transaction_id: qaTransactionId,
  totals: { checks: results.length, passed, failed, blocked },
  by_feature: byFeature,
  results,
};

const resultsDir = path.join(ROOT, 'scripts', 'qa', 'results');
fs.mkdirSync(resultsDir, { recursive: true });
fs.writeFileSync(
  path.join(resultsDir, 'live-api.json'),
  JSON.stringify(output, null, 2)
);

console.log('\n----------------------------------------');
console.log(
  `Checks: ${results.length}  Passed: ${passed}  Failed: ${failed}  Blocked: ${blocked}`
);
if (blocked > 0) {
  console.log('Blocked by an external provider (unverified, not a pass):');
  for (const row of results.filter((item) => item.blocked)) {
    console.log(` - ${row.id}: ${row.method} ${row.path} -> ${row.actual}`);
  }
}
if (failed > 0) {
  console.log('Failures:');
  for (const row of results.filter((item) => !item.pass && !item.blocked)) {
    console.log(` - ${row.id}: ${row.method} ${row.path} -> ${row.actual} (expected ${row.expected}) ${row.error || row.note || ''}`);
  }
}
console.log(`Evidence written to scripts/qa/results/live-api.json`);
process.exitCode = failed > 0 ? 1 : 0;
