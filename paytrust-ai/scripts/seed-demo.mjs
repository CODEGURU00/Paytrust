#!/usr/bin/env node
/**
 * Seed a complete PayTrust AI demo transaction.
 *
 * Requirements:
 *   - supabase/schema.sql (or supabase/setup-all.sql) has been applied
 *   - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured
 *
 * Run:
 *   npm run seed
 *
 * The script is idempotent: it removes and recreates the demo transaction for
 * the seeded buyer/seller accounts. Auth users are reused if they already exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const contents = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    if (process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile(path.join(root, '.env.local'));
loadEnvFile(path.join(root, '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.'
  );
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'PayTrustDemo123!';
const DEMO_TITLE = 'Demo: Website redesign with escrow';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(
  /\/+$/,
  ''
);

const PEOPLE = [
  {
    email: process.env.DEMO_BUYER_EMAIL || 'buyer@paytrust.demo',
    display_name: 'Arjun Mehta',
    avatar_url: '/avatars/arjun.jpg',
    verification_status: 'verified',
  },
  {
    email: process.env.DEMO_SELLER_EMAIL || 'seller@paytrust.demo',
    display_name: 'Priya Sharma',
    avatar_url: '/avatars/priya.jpg',
    verification_status: 'verified',
  },
  {
    email: process.env.DEMO_WITNESS_EMAIL || 'witness@paytrust.demo',
    display_name: 'Rahul Verma',
    avatar_url: '/avatars/rahul.jpg',
    verification_status: 'verified',
  },
];

function log(message) {
  console.log(`  ${message}`);
}

function fail(step, error) {
  console.error(`\n✗ ${step}: ${error?.message || error}`);
  process.exit(1);
}

async function listAllUsers() {
  const users = [];
  let page = 1;

  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });

    if (error) throw error;
    users.push(...(data?.users || []));
    if (!data?.users || data.users.length < 200) break;
    page += 1;
  }

  return users;
}

async function ensureUsers() {
  const existingUsers = await listAllUsers();
  const byEmail = new Map(
    existingUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user])
  );

  const resolved = [];

  for (const person of PEOPLE) {
    const email = person.email.toLowerCase();
    let user = byEmail.get(email);

    if (!user) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: person.display_name },
      });

      if (error) throw error;
      user = data.user;
      log(`created auth user ${email}`);
    } else {
      /*
       * Reuse the existing account WITHOUT touching its password.
       *
       * Updating the password invalidates every active session for that
       * user (Supabase signs the user out on a password change), so
       * re-seeding used to log out anyone who was signed in - including the
       * Playwright session, which then failed with a 401.
       *
       * Set SEED_RESET_PASSWORD=true to force the documented demo password
       * back, accepting that it signs the account out.
       */
      log(`reusing auth user ${email}`);
      if (process.env.SEED_RESET_PASSWORD === 'true') {
        const { error: passwordError } = await admin.auth.admin.updateUserById(
          user.id,
          { password: DEMO_PASSWORD, email_confirm: true }
        );
        if (passwordError) throw passwordError;
        log(`reset the password for ${email} (its sessions were invalidated)`);
      }
    }

    const { error: profileError } = await admin.from('profiles').upsert(
      {
        id: user.id,
        display_name: person.display_name,
        avatar_url: person.avatar_url,
        verification_status: person.verification_status,
        email,
      },
      { onConflict: 'id' }
    );

    if (profileError) throw profileError;

    resolved.push({ ...person, id: user.id, email });
  }

  return {
    buyer: resolved[0],
    seller: resolved[1],
    witness: resolved[2],
  };
}

async function removeExistingDemoTransaction(buyerId) {
  const { data, error } = await admin
    .from('transactions')
    .select('id, title')
    .eq('buyer_id', buyerId)
    .eq('title', DEMO_TITLE);

  if (error) throw error;
  if (!data || data.length === 0) return;

  for (const transaction of data) {
    const { data: files } = await admin.storage
      .from('attachments')
      .list(transaction.id);

    if (files && files.length > 0) {
      const paths = files.map((file) => `${transaction.id}/${file.name}`);
      const { error: removeError } = await admin.storage
        .from('attachments')
        .remove(paths);
      if (removeError) {
        console.warn(`  warning: could not remove old evidence: ${removeError.message}`);
      }
    }

    const { error: deleteError } = await admin
      .from('transactions')
      .delete()
      .eq('id', transaction.id);

    if (deleteError) throw deleteError;
    log(`removed previous demo transaction ${transaction.id}`);
  }
}

async function seed() {
  console.log('\nPayTrust AI demo seed\n');

  const { buyer, seller, witness } = await ensureUsers();

  await removeExistingDemoTransaction(buyer.id);

  const now = Date.now();
  const startedAt = new Date(now - 5 * 24 * 60 * 60 * 1000);
  const iso = (daysAgo, hoursAgo = 0) =>
    new Date(
      now - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000
    ).toISOString();

  const { data: transaction, error: transactionError } = await admin
    .from('transactions')
    .insert({
      buyer_id: buyer.id,
      seller_id: seller.id,
      title: DEMO_TITLE,
      description:
        'Five-page marketing website redesign, including responsive build, CMS handoff, and two revision rounds. Payment is held by PayTrust until the buyer confirms delivery.',
      amount: 2400,
      currency: 'USD',
      status: 'APPROVED',
      created_at: startedAt.toISOString(),
    })
    .select('*')
    .single();

  if (transactionError) fail('create transaction', transactionError);
  log(`created transaction ${transaction.id}`);

  const { error: participantError } = await admin
    .from('transaction_participants')
    .upsert(
      {
        transaction_id: transaction.id,
        user_id: witness.id,
        role: 'witness',
        permission_level: 'comment',
      },
      { onConflict: 'transaction_id,user_id' }
    );

  if (participantError) fail('add witness', participantError);

  const messages = [
    {
      sender_id: buyer.id,
      content:
        'Hi Priya — confirming the scope we discussed: five responsive pages, CMS setup, two revision rounds. Budget is $2,400 total.',
      created_at: iso(5),
    },
    {
      sender_id: seller.id,
      content:
        'Confirmed. I will share the first design concepts in three days, then build after your approval. Final handoff will include all source files.',
      created_at: iso(5, -2),
    },
    {
      sender_id: buyer.id,
      content:
        'Brand assets and copy are ready. I am uploading the content inventory as evidence so we both have the same reference.',
      created_at: iso(4),
    },
    {
      sender_id: seller.id,
      content:
        'Received, thank you. First concepts are in progress. One open question: should the pricing page include an annual/monthly toggle?',
      created_at: iso(3),
    },
    {
      sender_id: buyer.id,
      content:
        'Yes, include the toggle. Everything else matches the approved scope.',
      created_at: iso(3),
    },
  ];

  const { error: messagesError } = await admin
    .from('transaction_messages')
    .insert(messages.map((message) => ({ ...message, transaction_id: transaction.id })));

  if (messagesError) fail('create messages', messagesError);
  log(`added ${messages.length} chat messages`);

  const agreementTerms = {
    purpose:
      'Redesign the buyer’s marketing website with a five-page responsive build and CMS handoff.',
    amount: 2400,
    currency: 'USD',
    deliverables: [
      'Five responsive pages: home, pricing, about, features, contact',
      'CMS setup with editable page sections',
      'Two rounds of design revisions',
      'Source files and handoff documentation',
    ],
    deadline: 'Three weeks from approval',
    responsibilities: [
      { owner: 'seller', description: 'Design, build, CMS setup, handoff' },
      {
        owner: 'buyer',
        description: 'Provide brand assets, copy, and timely feedback',
      },
    ],
    revision_policy: 'Two revision rounds included; further changes quoted separately.',
    cancellation_policy:
      'Work completed before cancellation is billed at the milestone rate.',
    milestones: [
      { title: 'Design concepts', amount: 1200, due_date: 'Week 1' },
      { title: 'Final build and handoff', amount: 1200, due_date: 'Week 3' },
    ],
    open_questions: [],
    summary:
      'Website redesign with two equal milestones, two revision rounds, and a two-week feedback window.',
  };

  const { data: agreement, error: agreementError } = await admin
    .from('agreement_versions')
    .insert({
      transaction_id: transaction.id,
      version: 1,
      terms: agreementTerms,
      status: 'pending_approval',
      source: 'ai',
      source_context: {
        summary:
          'AI drafted these terms from the transaction chat. Both parties reviewed and approved the draft.',
        missing_terms: [],
        uncertainties: [],
        message_count: messages.length,
        generated_at: iso(2),
      },
      ai_model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      ai_confidence: 0.86,
      created_by: buyer.id,
      created_at: iso(2),
    })
    .select('*')
    .single();

  if (agreementError) fail('create agreement', agreementError);

  for (const party of [buyer, seller]) {
    const { error: approvalError } = await admin
      .from('agreement_approvals')
      .insert({
        agreement_id: agreement.id,
        transaction_id: transaction.id,
        user_id: party.id,
        decision: 'approved',
        comment: 'Terms match what we agreed in chat.',
      });

    if (approvalError) fail('record agreement approval', approvalError);
  }

  log('created Deal DNA v1 with mutual approval');

  const commitments = [
    {
      owner_id: seller.id,
      description: 'Share first design concepts',
      status: 'completed',
      due_at: iso(1),
      completed_at: iso(1, 2),
      created_at: iso(3),
    },
    {
      owner_id: buyer.id,
      description: 'Provide brand assets and final copy',
      status: 'completed',
      due_at: iso(2),
      completed_at: iso(2, 1),
      created_at: iso(4),
    },
    {
      owner_id: seller.id,
      description: 'Deliver final responsive pages and CMS handoff',
      status: 'in_progress',
      due_at: iso(-7),
      created_at: iso(1),
    },
    {
      owner_id: buyer.id,
      description: 'Review final build within two business days',
      status: 'open',
      due_at: iso(-5),
      created_at: iso(0, 6),
    },
  ];

  const { error: commitmentsError } = await admin.from('commitments').insert(
    commitments.map((commitment) => ({
      ...commitment,
      transaction_id: transaction.id,
      agreement_id: agreement.id,
      created_by: buyer.id,
    }))
  );

  if (commitmentsError) fail('create commitments', commitmentsError);
  log(`added ${commitments.length} commitments`);

  const { data: milestones, error: milestonesError } = await admin
    .from('milestones')
    .insert([
      {
        transaction_id: transaction.id,
        title: 'Design concepts',
        description: 'Initial concepts, one revision round, buyer sign-off.',
        amount: 1200,
        currency: 'USD',
        status: 'approved',
        position: 0,
        due_at: iso(-14),
        created_by: buyer.id,
        approved_by: buyer.id,
        completed_at: iso(1),
        created_at: iso(4),
      },
      {
        transaction_id: transaction.id,
        title: 'Final build and handoff',
        description: 'Responsive pages, CMS setup, source files, documentation.',
        amount: 1200,
        currency: 'USD',
        status: 'pending',
        position: 1,
        due_at: iso(-7),
        created_by: buyer.id,
        created_at: iso(4),
      },
    ])
    .select('*');

  if (milestonesError) fail('create milestones', milestonesError);
  log(`added ${milestones.length} milestones`);

  const receiptContent = [
    'PayTrust AI demo receipt',
    '------------------------',
    'Milestone: Design concepts (approved)',
    'Amount: 1,200.00 USD (simulated)',
    'This file is seeded demo evidence. No real payment was made.',
  ].join('\n');

  const receiptPath = `${transaction.id}/seed-design-receipt.txt`;
  const { error: uploadError } = await admin.storage
    .from('attachments')
    .upload(receiptPath, new Blob([receiptContent], { type: 'text/plain' }), {
      contentType: 'text/plain',
      upsert: true,
    });

  if (uploadError) fail('upload evidence', uploadError);

  const receiptChecksum = crypto
    .createHash('sha256')
    .update(receiptContent)
    .digest('hex');

  const { data: evidence, error: evidenceError } = await admin
    .from('attachments')
    .insert({
      transaction_id: transaction.id,
      uploaded_by: seller.id,
      file_name: 'design-milestone-receipt.txt',
      storage_path: receiptPath,
      mime_type: 'text/plain',
      size_bytes: Buffer.byteLength(receiptContent),
      kind: 'receipt',
      description:
        'Milestone receipt for the approved design concepts phase (simulated).',
      visibility: 'participants',
      milestone_id: milestones[0].id,
      version: 1,
      checksum: receiptChecksum,
      created_at: iso(1),
    })
    .select('*')
    .single();

  if (evidenceError) fail('create evidence metadata', evidenceError);

  const privateNote = Buffer.from(
    'Private buyer note: internal budget approval reference. Not shared with the seller.',
    'utf8'
  );
  const privatePath = `${transaction.id}/seed-private-budget-note.txt`;
  const { error: privateUploadError } = await admin.storage
    .from('attachments')
    .upload(privatePath, privateNote, {
      contentType: 'text/plain',
      upsert: true,
    });

  if (privateUploadError) fail('upload private evidence', privateUploadError);

  const { error: privateEvidenceError } = await admin
    .from('attachments')
    .insert({
      transaction_id: transaction.id,
      uploaded_by: buyer.id,
      file_name: 'private-budget-note.txt',
      storage_path: privatePath,
      mime_type: 'text/plain',
      size_bytes: privateNote.byteLength,
      kind: 'document',
      description: 'Private buyer note. Visible only to the uploader.',
      visibility: 'private',
      version: 1,
      checksum: crypto.createHash('sha256').update(privateNote).digest('hex'),
      created_at: iso(0, 12),
    });

  if (privateEvidenceError) fail('create private evidence', privateEvidenceError);
  log('added shared and private evidence');

  const { data: dispute, error: disputeError } = await admin
    .from('disputes')
    .insert({
      transaction_id: transaction.id,
      opened_by: buyer.id,
      status: 'under_review',
      reason:
        'Final delivery has not arrived by the agreed milestone date, and the seller has not confirmed a revised date.',
      report:
        'Buyer states the second milestone passed its due date without a handoff. Seller states one extra revision delayed the build. Both parties agreed to keep the record factual.',
      created_at: iso(0, 8),
    })
    .select('*')
    .single();

  if (disputeError) fail('create dispute', disputeError);

  const { error: statementsError } = await admin
    .from('dispute_statements')
    .insert([
      {
        dispute_id: dispute.id,
        transaction_id: transaction.id,
        author_id: buyer.id,
        statement:
          'The final build was due one week ago. I asked for a status update twice and received no revised delivery date. The design milestone was completed and approved.',
        evidence_ids: [evidence.id],
        created_at: iso(0, 7),
      },
      {
        dispute_id: dispute.id,
        transaction_id: transaction.id,
        author_id: seller.id,
        statement:
          'The buyer requested an additional revision outside the two included rounds. I offered a revised date in chat but have not yet sent the final files. I can deliver within three business days.',
        evidence_ids: [],
        created_at: iso(0, 6),
      },
    ]);

  if (statementsError) fail('create dispute statements', statementsError);
  log('created a neutral dispute record with statements from both parties');

  const { error: paymentError } = await admin.from('payment_events').insert({
    transaction_id: transaction.id,
    provider: 'paytrust',
    provider_event_id: `seed:${transaction.id}`,
    event_type: 'simulated_deposit',
    payload_summary: {
      simulated: true,
      type: 'deposit',
      note: 'Seeded sandbox payment record. No real funds moved.',
    },
    amount: 2400,
    currency: 'USD',
    created_at: iso(4, 6),
  });

  if (paymentError) fail('create payment event', paymentError);

  for (const person of [buyer, seller, witness]) {
    const { count, error: countError } = await admin
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${person.id},seller_id.eq.${person.id}`);

    if (countError) {
      console.warn(`  warning: could not recount deals: ${countError.message}`);
      continue;
    }

    const { error: countUpdateError } = await admin
      .from('profiles')
      .update({ transaction_count: count || 0 })
      .eq('id', person.id);

    if (countUpdateError) {
      console.warn(
        `  warning: could not update transaction_count: ${countUpdateError.message}`
      );
    }
  }

  console.log('\n✓ Demo seed complete\n');
  console.log('  Sign in with either account:');
  console.log(`    Buyer:   ${buyer.email}`);
  console.log(`    Seller:  ${seller.email}`);
  console.log(`    Witness: ${witness.email}`);
  console.log(`    Password: ${DEMO_PASSWORD}`);
  console.log('');
  console.log(`  Transaction: ${APP_URL}/transactions/${transaction.id}`);
  console.log('  Dispute:     ' + `${APP_URL}/disputes/${dispute.id}`);
  console.log('');
  console.log(
    '  All payment records are simulated. No real money or credentials are used.\n'
  );
}

seed().catch((error) => fail('seed', error));
