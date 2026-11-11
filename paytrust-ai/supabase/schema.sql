-- ============================================================
-- PayTrust AI — COMPLETE DATABASE SETUP
-- Run this ONE script in the Supabase SQL Editor.
-- It is idempotent and safe to re-run.
-- Covers: tables, constraints, RLS, triggers, RPCs, indexes,
--         storage bucket/policies, and realtime.
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  display_name text not null,
  email text,
  avatar_url text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'verified')),
  created_at timestamptz not null default now(),
  transaction_count integer not null default 0 check (transaction_count >= 0)
);

create table if not exists public.transactions (
  id uuid default uuid_generate_v4() primary key,
  buyer_id uuid references public.profiles(id) on delete restrict not null,
  seller_id uuid references public.profiles(id) on delete restrict not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD'
    check (currency in ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD')),
  status text not null default 'CREATED'
    check (status in ('CREATED', 'PENDING', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),
  paypal_order_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id <> seller_id)
);

-- Add the PayPal order column when upgrading an older database.
alter table public.transactions
  add column if not exists paypal_order_id text;

create table if not exists public.transaction_participants (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  role text not null check (role in ('buyer', 'seller', 'witness')),
  joined_at timestamptz not null default now(),
  unique (transaction_id, user_id)
);

create table if not exists public.transaction_messages (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  provider text not null check (provider in ('paypal', 'paytrust')),
  provider_event_id text,
  event_type text not null,
  payload_summary jsonb not null default '{}',
  amount numeric(12, 2),
  currency text,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  uploaded_by uuid references public.profiles(id) on delete cascade not null,
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_summaries (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  summary_type text not null
    check (summary_type in ('conversation', 'commitments', 'evidence_report', 'missing_evidence')),
  summary text not null,
  source_version text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  opened_by uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'draft'
    check (status in ('draft', 'open', 'under_review', 'resolved', 'closed')),
  reason text not null check (length(trim(reason)) > 0),
  report text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_payloads (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null
    check (type in ('paytrust', 'paypal', 'upi', 'emvco', 'unknown')),
  raw text not null,
  parsed jsonb not null default '{}',
  is_valid boolean not null default false,
  validation_message text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Safe UUID cast used by storage policies. Returns null instead of raising.
create or replace function public.safe_uuid(value text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return value::uuid;
exception
  when others then
    return null;
end;
$$;

-- Returns true when the current user is the buyer, seller, or an explicitly
-- added participant (witness) of the transaction.
create or replace function public.is_transaction_participant(check_transaction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    check_transaction_id is not null
    and exists (
      select 1
      from public.transactions t
      where t.id = check_transaction_id
        and (
          t.buyer_id = auth.uid()
          or t.seller_id = auth.uid()
          or exists (
            select 1
            from public.transaction_participants tp
            where tp.transaction_id = t.id
              and tp.user_id = auth.uid()
          )
        )
    );
$$;

-- Seller lookup for transaction creation. Profiles.email is not exposed to
-- clients, so this security-definer RPC performs the exact-match lookup.
create or replace function public.find_seller_by_email(seller_email text)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and lower(p.email) = lower(trim(seller_email))
  limit 1;
$$;

-- ============================================================
-- TRIGGER FUNCTIONS
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Create the buyer/seller participant rows automatically. This removes the
-- need for an insecure "insert participants" policy.
create or replace function public.create_transaction_participants()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.transaction_participants (transaction_id, user_id, role)
  values
    (new.id, new.buyer_id, 'buyer'),
    (new.id, new.seller_id, 'seller')
  on conflict (transaction_id, user_id) do nothing;

  return new;
end;
$$;

-- Ordinary users may edit descriptive fields only. Amount, currency, parties,
-- creation time, PayPal order binding, and status are controlled by the
-- server-side payment layer using the service role.
create or replace function public.enforce_transaction_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_role text := coalesce(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if request_role = 'service_role' then
    return new;
  end if;

  if new.amount is distinct from old.amount
    or new.currency is distinct from old.currency
    or new.buyer_id is distinct from old.buyer_id
    or new.seller_id is distinct from old.seller_id
    or new.created_at is distinct from old.created_at
    or new.paypal_order_id is distinct from old.paypal_order_id then
    raise exception
      'Only the payment service may change amount, currency, parties, creation time, or PayPal order binding';
  end if;

  if new.status is distinct from old.status then
    raise exception 'Only the payment service may change transaction status';
  end if;

  return new;
end;
$$;

-- Dispute status must move forward through the workflow.
create or replace function public.enforce_dispute_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_role text := coalesce(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if request_role = 'service_role' then
    return new;
  end if;

  if new.transaction_id is distinct from old.transaction_id
    or new.opened_by is distinct from old.opened_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Dispute identity fields are immutable';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('open', 'closed'))
      or (old.status = 'open' and new.status in ('under_review', 'resolved', 'closed'))
      or (old.status = 'under_review' and new.status in ('resolved', 'closed'))
      or (old.status = 'resolved' and new.status = 'closed')
    ) then
      raise exception 'Invalid dispute status transition from % to %', old.status, new.status;
    end if;
  end if;

  if old.status <> 'draft'
    and (new.reason is distinct from old.reason or new.report is distinct from old.report) then
    raise exception 'Dispute reason and report may only be edited while in draft';
  end if;

  return new;
end;
$$;

-- Keep profiles.transaction_count accurate for trust indicators.
create or replace function public.sync_transaction_counts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status = 'COMPLETED' and old.status is distinct from 'COMPLETED' then
    update public.profiles
      set transaction_count = transaction_count + 1
      where id in (new.buyer_id, new.seller_id);
  elsif old.status = 'COMPLETED' and new.status is distinct from 'COMPLETED' then
    update public.profiles
      set transaction_count = greatest(transaction_count - 1, 0)
      where id in (old.buyer_id, old.seller_id);
  end if;

  return new;
end;
$$;

-- Create the profile row when a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.email
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_participants enable row level security;
alter table public.transaction_messages enable row level security;
alter table public.payment_events enable row level security;
alter table public.attachments enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.disputes enable row level security;
alter table public.qr_payloads enable row level security;

drop policy if exists "profiles_select" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "transactions_select" on public.transactions;
drop policy if exists "transactions_insert" on public.transactions;
drop policy if exists "transactions_update" on public.transactions;
drop policy if exists "participants_select" on public.transaction_participants;
drop policy if exists "messages_select" on public.transaction_messages;
drop policy if exists "messages_insert" on public.transaction_messages;
drop policy if exists "payment_events_select" on public.payment_events;
drop policy if exists "attachments_select" on public.attachments;
drop policy if exists "attachments_insert" on public.attachments;
drop policy if exists "attachments_delete" on public.attachments;
drop policy if exists "ai_summaries_select" on public.ai_summaries;
drop policy if exists "disputes_select" on public.disputes;
drop policy if exists "disputes_insert" on public.disputes;
drop policy if exists "disputes_update" on public.disputes;
drop policy if exists "qr_select" on public.qr_payloads;
drop policy if exists "qr_insert" on public.qr_payloads;
drop policy if exists "qr_delete" on public.qr_payloads;

-- Public profile data only. Email is deliberately excluded from the column
-- grants below, so it cannot be read by anon/authenticated clients.
create policy "profiles_select"
  on public.profiles for select
  to anon, authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "transactions_select"
  on public.transactions for select
  to authenticated
  using (public.is_transaction_participant(id));

create policy "transactions_insert"
  on public.transactions for insert
  to authenticated
  with check (auth.uid() = buyer_id and buyer_id <> seller_id);

create policy "transactions_update"
  on public.transactions for update
  to authenticated
  using (public.is_transaction_participant(id))
  with check (public.is_transaction_participant(id));

create policy "participants_select"
  on public.transaction_participants for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "messages_select"
  on public.transaction_messages for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "messages_insert"
  on public.transaction_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and public.is_transaction_participant(transaction_id)
  );

create policy "payment_events_select"
  on public.payment_events for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "attachments_select"
  on public.attachments for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "attachments_insert"
  on public.attachments for insert
  to authenticated
  with check (
    auth.uid() = uploaded_by
    and public.is_transaction_participant(transaction_id)
  );

create policy "attachments_delete"
  on public.attachments for delete
  to authenticated
  using (
    auth.uid() = uploaded_by
    and public.is_transaction_participant(transaction_id)
  );

create policy "ai_summaries_select"
  on public.ai_summaries for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "disputes_select"
  on public.disputes for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

create policy "disputes_insert"
  on public.disputes for insert
  to authenticated
  with check (
    auth.uid() = opened_by
    and public.is_transaction_participant(transaction_id)
  );

create policy "disputes_update"
  on public.disputes for update
  to authenticated
  using (public.is_transaction_participant(transaction_id))
  with check (public.is_transaction_participant(transaction_id));

create policy "qr_select"
  on public.qr_payloads for select
  to authenticated
  using (auth.uid() = user_id);

create policy "qr_insert"
  on public.qr_payloads for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "qr_delete"
  on public.qr_payloads for delete
  to authenticated
  using (auth.uid() = user_id);

-- Column-level privileges: hide profiles.email from client roles while still
-- allowing public profile reads and self-service profile editing.
revoke all on public.profiles from anon, authenticated;
grant select (id, display_name, avatar_url, verification_status, created_at, transaction_count)
  on public.profiles to anon, authenticated;
grant update (display_name, avatar_url)
  on public.profiles to authenticated;

-- Internal RPCs.
revoke all on function public.find_seller_by_email(text) from public, anon;
grant execute on function public.find_seller_by_email(text) to authenticated;
grant execute on function public.is_transaction_participant(uuid) to authenticated;
grant execute on function public.safe_uuid(text) to authenticated;

-- ============================================================
-- TRIGGERS
-- ============================================================

drop trigger if exists update_transactions_updated_at on public.transactions;
create trigger update_transactions_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

drop trigger if exists enforce_transactions_update on public.transactions;
create trigger enforce_transactions_update
  before update on public.transactions
  for each row
  execute function public.enforce_transaction_update();

drop trigger if exists sync_transactions_counts on public.transactions;
create trigger sync_transactions_counts
  after update on public.transactions
  for each row
  execute function public.sync_transaction_counts();

drop trigger if exists create_transaction_participants on public.transactions;
create trigger create_transaction_participants
  after insert on public.transactions
  for each row
  execute function public.create_transaction_participants();

drop trigger if exists update_disputes_updated_at on public.disputes;
create trigger update_disputes_updated_at
  before update on public.disputes
  for each row
  execute function public.set_updated_at();

drop trigger if exists enforce_disputes_update on public.disputes;
create trigger enforce_disputes_update
  before update on public.disputes
  for each row
  execute function public.enforce_dispute_update();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_transactions_buyer_id on public.transactions(buyer_id);
create index if not exists idx_transactions_seller_id on public.transactions(seller_id);
create index if not exists idx_transactions_status on public.transactions(status);
create unique index if not exists uniq_transactions_paypal_order
  on public.transactions(paypal_order_id)
  where paypal_order_id is not null;

create index if not exists idx_participants_transaction_id on public.transaction_participants(transaction_id);
create index if not exists idx_participants_user_id on public.transaction_participants(user_id);
create index if not exists idx_messages_transaction_id on public.transaction_messages(transaction_id);
create index if not exists idx_messages_created_at on public.transaction_messages(transaction_id, created_at);

create index if not exists idx_payment_events_transaction_id on public.payment_events(transaction_id);
-- The idempotency key includes event_type on purpose. The same PayPal object
-- is referenced by several event types (an order is both created and
-- approved; a capture is captured and later refunded), so a key without
-- event_type made the second insert collide and the ledger silently lost
-- rows - including every refund.
drop index if exists public.uniq_payment_provider_event;
create unique index if not exists uniq_payment_provider_event
  on public.payment_events(provider, provider_event_id, event_type)
  where provider_event_id is not null;

create index if not exists idx_attachments_transaction_id on public.attachments(transaction_id);
create index if not exists idx_ai_summaries_transaction_id on public.ai_summaries(transaction_id);
create index if not exists idx_disputes_transaction_id on public.disputes(transaction_id);
create index if not exists idx_qr_user_id on public.qr_payloads(user_id);

-- ============================================================
-- STORAGE (private attachments bucket)
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'attachments',
  'attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "attachments_read_participants" on storage.objects;
drop policy if exists "attachments_write_participants" on storage.objects;
drop policy if exists "attachments_delete_participants" on storage.objects;

create policy "attachments_read_participants"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_transaction_participant(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

create policy "attachments_write_participants"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and public.is_transaction_participant(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

create policy "attachments_delete_participants"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and public.is_transaction_participant(
      public.safe_uuid((storage.foldername(name))[1])
    )
  );

-- ============================================================
-- REALTIME (live chat)
-- ============================================================

do $$
begin
  alter publication supabase_realtime add table public.transaction_messages;
exception
  when duplicate_object then null;
end $$;

-- ============================================================
-- DONE
-- ============================================================

-- ============================================================
-- PayTrust AI — Blueprint backend extension
-- Adds the missing product data model from the project blueprint:
--   agreements + versions + approvals + change requests
--   commitments / promises
--   milestones
--   evidence metadata / access / versioning
--   dispute party statements + AI mediation summaries
--   audit events and Trust Passport privacy settings
--
-- This file is idempotent and can be run on an existing database.
-- It is also appended to supabase/schema.sql (the full setup script).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Participant permission levels
-- ------------------------------------------------------------

alter table public.transaction_participants
  add column if not exists permission_level text not null default 'full';

alter table public.transaction_participants
  drop constraint if exists transaction_participants_permission_level_check;
alter table public.transaction_participants
  add constraint transaction_participants_permission_level_check
  check (permission_level in ('full', 'comment', 'view'));

-- ------------------------------------------------------------
-- 2. Membership and permission helpers
-- ------------------------------------------------------------

create or replace function public.is_transaction_member(
  check_transaction_id uuid,
  check_user_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    check_transaction_id is not null
    and check_user_id is not null
    and exists (
      select 1
      from public.transactions t
      where t.id = check_transaction_id
        and (
          t.buyer_id = check_user_id
          or t.seller_id = check_user_id
          or exists (
            select 1
            from public.transaction_participants tp
            where tp.transaction_id = t.id
              and tp.user_id = check_user_id
          )
        )
    );
$$;

create or replace function public.is_transaction_participant(check_transaction_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_transaction_member(check_transaction_id, auth.uid());
$$;

create or replace function public.transaction_permission_level(
  check_transaction_id uuid,
  check_user_id uuid
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when t.buyer_id = check_user_id or t.seller_id = check_user_id then 'full'
    else (
      select tp.permission_level
      from public.transaction_participants tp
      where tp.transaction_id = t.id
        and tp.user_id = check_user_id
      limit 1
    )
  end
  from public.transactions t
  where t.id = check_transaction_id;
$$;

-- Lookup used when adding a witness/observer participant by email.
create or replace function public.find_user_by_email(lookup_email text)
returns table (id uuid, display_name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id, p.display_name
  from public.profiles p
  where auth.uid() is not null
    and lower(p.email) = lower(trim(lookup_email))
  limit 1;
$$;

-- Add a non-party participant. Only the buyer or seller may do this.
create or replace function public.add_transaction_participant(
  p_transaction_id uuid,
  p_user_id uuid,
  p_role text default 'witness',
  p_permission_level text default 'comment'
)
returns public.transaction_participants
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tx public.transactions;
  v_row public.transaction_participants;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_tx
  from public.transactions
  where id = p_transaction_id;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if auth.uid() not in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'Only the buyer or seller may add participants';
  end if;

  if p_user_id in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'User is already a primary party';
  end if;

  if p_role <> 'witness' then
    raise exception 'Only witness participants can be added';
  end if;

  if p_permission_level not in ('full', 'comment', 'view') then
    raise exception 'Invalid permission level';
  end if;

  insert into public.transaction_participants (
    transaction_id,
    user_id,
    role,
    permission_level
  )
  values (
    p_transaction_id,
    p_user_id,
    p_role,
    p_permission_level
  )
  on conflict (transaction_id, user_id) do update
    set role = excluded.role,
        permission_level = excluded.permission_level
  returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- 3. Agreements (Deal DNA)
-- ------------------------------------------------------------

create table if not exists public.agreement_versions (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  version integer not null check (version > 0),
  terms jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in (
      'draft',
      'pending_approval',
      'approved',
      'changes_requested',
      'superseded',
      'cancelled'
    )),
  source text not null default 'manual'
    check (source in ('manual', 'ai')),
  source_context jsonb not null default '{}'::jsonb,
  ai_model text,
  ai_confidence numeric(4, 3)
    check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),
  created_by uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (transaction_id, version)
);

create table if not exists public.agreement_approvals (
  id uuid default uuid_generate_v4() primary key,
  agreement_id uuid references public.agreement_versions(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  decision text not null
    check (decision in ('approved', 'changes_requested', 'rejected')),
  comment text,
  decided_at timestamptz not null default now(),
  unique (agreement_id, user_id)
);

create table if not exists public.agreement_change_requests (
  id uuid default uuid_generate_v4() primary key,
  agreement_id uuid references public.agreement_versions(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  requested_by uuid references public.profiles(id) on delete cascade not null,
  description text not null check (length(trim(description)) > 0),
  status text not null default 'open'
    check (status in ('open', 'incorporated', 'declined')),
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- Record an approval decision. The trigger below owns status transitions.
create or replace function public.record_agreement_approval(
  p_agreement_id uuid,
  p_decision text,
  p_comment text default null
)
returns public.agreement_approvals
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_agreement public.agreement_versions;
  v_tx public.transactions;
  v_row public.agreement_approvals;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Invalid approval decision';
  end if;

  select * into v_agreement
  from public.agreement_versions
  where id = p_agreement_id;

  if not found then
    raise exception 'Agreement not found';
  end if;

  select * into v_tx
  from public.transactions
  where id = v_agreement.transaction_id;

  if auth.uid() not in (v_tx.buyer_id, v_tx.seller_id) then
    raise exception 'Only the buyer and seller may approve an agreement';
  end if;

  -- Allow a party to change their decision before the other party acts.
  delete from public.agreement_approvals
  where agreement_id = p_agreement_id
    and user_id = auth.uid();

  insert into public.agreement_approvals (
    agreement_id,
    transaction_id,
    user_id,
    decision,
    comment
  )
  values (
    p_agreement_id,
    v_agreement.transaction_id,
    auth.uid(),
    p_decision,
    nullif(trim(p_comment), '')
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.handle_agreement_approval()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction_id uuid;
  v_status text;
  v_buyer uuid;
  v_seller uuid;
  v_approved_count integer;
begin
  select
    a.transaction_id,
    a.status,
    t.buyer_id,
    t.seller_id
  into
    v_transaction_id,
    v_status,
    v_buyer,
    v_seller
  from public.agreement_versions a
  join public.transactions t on t.id = a.transaction_id
  where a.id = new.agreement_id;

  if v_transaction_id is null then
    raise exception 'Agreement not found';
  end if;

  if new.user_id <> v_buyer and new.user_id <> v_seller then
    raise exception 'Only the buyer and seller may approve an agreement';
  end if;

  if v_status <> 'pending_approval' then
    raise exception 'Agreement is not awaiting approval';
  end if;

  new.transaction_id := v_transaction_id;
  new.decided_at := coalesce(new.decided_at, now());

  if new.decision in ('changes_requested', 'rejected') then
    update public.agreement_versions
      set status = 'changes_requested',
          updated_at = now()
      where id = new.agreement_id;

    insert into public.agreement_change_requests (
      agreement_id,
      transaction_id,
      requested_by,
      description
    )
    values (
      new.agreement_id,
      v_transaction_id,
      new.user_id,
      case
        when new.decision = 'rejected' then
          coalesce(nullif(trim(new.comment), ''), 'Agreement rejected')
        else
          coalesce(nullif(trim(new.comment), ''), 'Changes requested')
      end
    );

    return new;
  end if;

  select count(*) into v_approved_count
  from public.agreement_approvals aa
  where aa.agreement_id = new.agreement_id
    and aa.decision = 'approved'
    and aa.user_id in (v_buyer, v_seller);

  -- The new row is not visible to the query above inside a BEFORE INSERT
  -- trigger, so count it explicitly.
  v_approved_count := v_approved_count + 1;

  if v_approved_count >= 2 then
    update public.agreement_versions
      set status = 'approved',
          approved_at = now(),
          updated_at = now()
      where id = new.agreement_id;

    update public.agreement_versions
      set status = 'superseded',
          updated_at = now()
      where transaction_id = v_transaction_id
        and id <> new.agreement_id
        and status = 'approved';
  end if;

  return new;
end;
$$;

-- Create a new agreement version. Version numbers are allocated safely under
-- a transaction row lock. AI-generated drafts use the same path and can never
-- approve themselves.
create or replace function public.create_agreement_version(
  p_transaction_id uuid,
  p_terms jsonb,
  p_source text default 'manual',
  p_source_context jsonb default '{}'::jsonb,
  p_ai_model text default null,
  p_ai_confidence numeric default null
)
returns public.agreement_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction public.transactions;
  v_version integer;
  v_row public.agreement_versions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if p_source not in ('manual', 'ai') then
    raise exception 'Invalid agreement source';
  end if;

  if public.transaction_permission_level(p_transaction_id, auth.uid()) is distinct from 'full' then
    raise exception 'Full participant permission required';
  end if;

  select * into v_transaction
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaction not found';
  end if;

  if v_transaction.status in ('CANCELLED', 'REFUNDED') then
    raise exception 'Cannot create an agreement for a closed transaction';
  end if;

  if exists (
    select 1
    from public.agreement_versions
    where transaction_id = p_transaction_id
      and status = 'pending_approval'
  ) then
    raise exception 'An agreement is already awaiting approval';
  end if;

  select coalesce(max(version), 0) + 1 into v_version
  from public.agreement_versions
  where transaction_id = p_transaction_id;

  insert into public.agreement_versions (
    transaction_id,
    version,
    terms,
    status,
    source,
    source_context,
    ai_model,
    ai_confidence,
    created_by
  )
  values (
    p_transaction_id,
    v_version,
    p_terms,
    'draft',
    p_source,
    coalesce(p_source_context, '{}'::jsonb),
    p_ai_model,
    p_ai_confidence,
    auth.uid()
  )
  returning * into v_row;

  return v_row;
end;
$$;

-- Edit a draft (or a draft that received change requests). Editing resets the
-- version to draft and records open change requests as incorporated.
create or replace function public.update_agreement_draft(
  p_agreement_id uuid,
  p_terms jsonb
)
returns public.agreement_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.agreement_versions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.agreement_versions
  where id = p_agreement_id;

  if not found then
    raise exception 'Agreement not found';
  end if;

  if v_row.status not in ('draft', 'changes_requested') then
    raise exception 'Only draft agreements can be edited';
  end if;

  if public.transaction_permission_level(v_row.transaction_id, auth.uid()) is distinct from 'full' then
    raise exception 'Full participant permission required';
  end if;

  update public.agreement_change_requests
    set status = 'incorporated',
        resolved_by = auth.uid(),
        resolved_at = now()
    where agreement_id = p_agreement_id
      and status = 'open';

  update public.agreement_versions
    set terms = p_terms,
        status = 'draft',
        updated_at = now()
    where id = p_agreement_id
    returning * into v_row;

  return v_row;
end;
$$;

-- Submit the draft for both-party approval. Any previous approvals for this
-- version are cleared, because the terms may have changed.
create or replace function public.submit_agreement_for_approval(p_agreement_id uuid)
returns public.agreement_versions
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.agreement_versions;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_row
  from public.agreement_versions
  where id = p_agreement_id;

  if not found then
    raise exception 'Agreement not found';
  end if;

  if v_row.status not in ('draft', 'changes_requested') then
    raise exception 'Only draft agreements can be submitted';
  end if;

  if public.transaction_permission_level(v_row.transaction_id, auth.uid()) is distinct from 'full' then
    raise exception 'Full participant permission required';
  end if;

  delete from public.agreement_approvals
  where agreement_id = p_agreement_id;

  update public.agreement_versions
    set status = 'pending_approval',
        updated_at = now()
    where id = p_agreement_id
    returning * into v_row;

  return v_row;
end;
$$;

-- ------------------------------------------------------------
-- 4. Commitments / promises
-- ------------------------------------------------------------

create table if not exists public.commitments (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  agreement_id uuid references public.agreement_versions(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete restrict not null,
  created_by uuid references public.profiles(id) on delete cascade not null,
  description text not null check (length(trim(description)) > 0),
  due_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'overdue', 'cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.validate_commitment()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_transaction_member(new.transaction_id, new.owner_id) then
    raise exception 'Commitment owner must be a transaction participant';
  end if;

  if not public.is_transaction_member(new.transaction_id, new.created_by) then
    raise exception 'Commitment creator must be a transaction participant';
  end if;

  if new.agreement_id is not null and not exists (
    select 1
    from public.agreement_versions a
    where a.id = new.agreement_id
      and a.transaction_id = new.transaction_id
  ) then
    raise exception 'Agreement must belong to the same transaction';
  end if;

  if tg_op = 'UPDATE' then
    if new.transaction_id is distinct from old.transaction_id
      or new.created_by is distinct from old.created_by then
      raise exception 'Commitment identity fields are immutable';
    end if;
  end if;

  if new.status = 'completed' then
    if tg_op = 'INSERT' then
      new.completed_at := coalesce(new.completed_at, now());
    elsif old.status is distinct from 'completed' then
      new.completed_at := coalesce(new.completed_at, now());
    end if;
  else
    new.completed_at := null;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 5. Milestones
-- ------------------------------------------------------------

create table if not exists public.milestones (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  title text not null check (length(trim(title)) > 0),
  description text,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'USD'
    check (currency in ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD')),
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'submitted', 'approved', 'paid', 'cancelled')),
  position integer not null default 0,
  due_at timestamptz,
  created_by uuid references public.profiles(id) on delete cascade not null,
  approved_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.validate_milestone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric;
  v_currency text;
  v_total numeric;
  v_role text := coalesce(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  select amount, currency into v_amount, v_currency
  from public.transactions
  where id = new.transaction_id;

  if v_amount is null then
    raise exception 'Transaction not found';
  end if;

  if new.currency is null then
    new.currency := v_currency;
  end if;

  if new.currency <> v_currency then
    raise exception 'Milestone currency must match the transaction currency';
  end if;

  if tg_op = 'UPDATE' then
    if new.transaction_id is distinct from old.transaction_id
      or new.created_by is distinct from old.created_by then
      raise exception 'Milestone identity fields are immutable';
    end if;

    if v_role <> 'service_role' then
      if new.status = 'paid' and old.status is distinct from 'paid' then
        raise exception 'Milestone payments are recorded by the payment service';
      end if;

      if new.status is distinct from old.status and not (
        (old.status = 'pending' and new.status in ('in_progress', 'submitted', 'approved', 'cancelled'))
        or (old.status = 'in_progress' and new.status in ('submitted', 'approved', 'cancelled'))
        or (old.status = 'submitted' and new.status in ('in_progress', 'approved', 'cancelled'))
        or (old.status = 'approved' and new.status in ('paid', 'cancelled'))
      ) then
        raise exception 'Invalid milestone status transition from % to %', old.status, new.status;
      end if;
    end if;
  end if;

  if new.status <> 'cancelled' then
    select coalesce(sum(amount), 0) into v_total
    from public.milestones
    where transaction_id = new.transaction_id
      and status <> 'cancelled'
      and id <> new.id;

    if v_total + new.amount > v_amount + 0.01 then
      raise exception 'Milestone total cannot exceed the transaction amount';
    end if;
  end if;

  if new.status = 'paid' then
    if tg_op = 'INSERT' then
      new.paid_at := coalesce(new.paid_at, now());
    elsif old.status is distinct from 'paid' then
      new.paid_at := coalesce(new.paid_at, now());
    end if;
  elsif new.status <> 'paid' then
    new.paid_at := null;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 6. Evidence metadata, access log and versioning
--    (the existing private attachments bucket remains the file store)
-- ------------------------------------------------------------

alter table public.attachments
  add column if not exists kind text not null default 'file',
  add column if not exists description text,
  add column if not exists visibility text not null default 'participants',
  add column if not exists commitment_id uuid references public.commitments(id) on delete set null,
  add column if not exists milestone_id uuid references public.milestones(id) on delete set null,
  add column if not exists version integer not null default 1,
  add column if not exists supersedes_id uuid references public.attachments(id) on delete set null,
  add column if not exists checksum text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.attachments
  drop constraint if exists attachments_kind_check;
alter table public.attachments
  add constraint attachments_kind_check
  check (kind in ('file', 'image', 'receipt', 'document'));

alter table public.attachments
  drop constraint if exists attachments_visibility_check;
alter table public.attachments
  add constraint attachments_visibility_check
  check (visibility in ('participants', 'private'));

alter table public.attachments
  drop constraint if exists attachments_version_check;
alter table public.attachments
  add constraint attachments_version_check
  check (version > 0);

create or replace function public.validate_attachment_links()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.commitment_id is not null and not exists (
    select 1 from public.commitments
    where id = new.commitment_id
      and transaction_id = new.transaction_id
  ) then
    raise exception 'Commitment must belong to the same transaction';
  end if;

  if new.milestone_id is not null and not exists (
    select 1 from public.milestones
    where id = new.milestone_id
      and transaction_id = new.transaction_id
  ) then
    raise exception 'Milestone must belong to the same transaction';
  end if;

  if new.supersedes_id is not null and not exists (
    select 1 from public.attachments
    where id = new.supersedes_id
      and transaction_id = new.transaction_id
  ) then
    raise exception 'Superseded evidence must belong to the same transaction';
  end if;

  return new;
end;
$$;

create table if not exists public.evidence_access_log (
  id uuid default uuid_generate_v4() primary key,
  attachment_id uuid references public.attachments(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  action text not null check (action in ('viewed', 'downloaded', 'uploaded', 'shared')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 7. Dispute statements and AI mediation
-- ------------------------------------------------------------

alter table public.disputes
  add column if not exists ai_summary text,
  add column if not exists resolution text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null;

create table if not exists public.dispute_statements (
  id uuid default uuid_generate_v4() primary key,
  dispute_id uuid references public.disputes(id) on delete cascade not null,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  author_id uuid references public.profiles(id) on delete cascade not null,
  statement text not null check (length(trim(statement)) > 0),
  evidence_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create or replace function public.validate_dispute_statement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction_id uuid;
  v_status text;
begin
  select transaction_id, status into v_transaction_id, v_status
  from public.disputes
  where id = new.dispute_id;

  if v_transaction_id is null then
    raise exception 'Dispute not found';
  end if;

  if new.transaction_id is distinct from v_transaction_id then
    raise exception 'Dispute transaction mismatch';
  end if;

  if not public.is_transaction_member(new.transaction_id, new.author_id) then
    raise exception 'Statement author must be a transaction participant';
  end if;

  if v_status in ('resolved', 'closed') then
    raise exception 'Cannot add statements to a closed dispute';
  end if;

  if exists (
    select 1
    from unnest(new.evidence_ids) as evidence_id
    where not exists (
      select 1
      from public.attachments a
      where a.id = evidence_id
        and a.transaction_id = new.transaction_id
    )
  ) then
    raise exception 'Evidence must belong to the same transaction';
  end if;

  return new;
end;
$$;

-- Replace the original dispute update guard with the blueprint-aware version.
create or replace function public.enforce_dispute_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_role text := coalesce(
    auth.role(),
    current_setting('request.jwt.claim.role', true),
    ''
  );
begin
  if request_role = 'service_role' then
    return new;
  end if;

  if new.transaction_id is distinct from old.transaction_id
    or new.opened_by is distinct from old.opened_by
    or new.created_at is distinct from old.created_at then
    raise exception 'Dispute identity fields are immutable';
  end if;

  if new.ai_summary is distinct from old.ai_summary then
    raise exception 'AI mediation summaries are server-managed';
  end if;

  if new.status is distinct from old.status then
    if not (
      (old.status = 'draft' and new.status in ('open', 'closed'))
      or (old.status = 'open' and new.status in ('under_review', 'resolved', 'closed'))
      or (old.status = 'under_review' and new.status in ('resolved', 'closed'))
      or (old.status = 'resolved' and new.status = 'closed')
    ) then
      raise exception 'Invalid dispute status transition from % to %', old.status, new.status;
    end if;
  end if;

  if old.status <> 'draft'
    and (new.reason is distinct from old.reason or new.report is distinct from old.report) then
    raise exception 'Dispute reason and report may only be edited while in draft';
  end if;

  if (new.resolution is distinct from old.resolution
      or new.resolved_by is distinct from old.resolved_by)
    and new.status not in ('resolved', 'closed') then
    raise exception 'A resolution may only be recorded when resolving or closing a dispute';
  end if;

  if new.status in ('resolved', 'closed')
    and old.status not in ('resolved', 'closed') then
    new.resolved_at := coalesce(new.resolved_at, now());
    new.resolved_by := coalesce(new.resolved_by, auth.uid());
  end if;

  return new;
end;
$$;

-- Allow the dispute mediation summary type.
alter table public.ai_summaries
  drop constraint if exists ai_summaries_summary_type_check;
alter table public.ai_summaries
  add constraint ai_summaries_summary_type_check
  check (summary_type in (
    'conversation',
    'commitments',
    'evidence_report',
    'missing_evidence',
    'dispute_mediation'
  ));

-- ------------------------------------------------------------
-- 8. Trust Passport privacy settings
-- ------------------------------------------------------------

create table if not exists public.trust_passport_settings (
  user_id uuid references public.profiles(id) on delete cascade primary key,
  is_public boolean not null default false,
  headline text check (headline is null or length(headline) <= 160),
  location text check (location is null or length(location) <= 120),
  show_completed_deals boolean not null default true,
  show_milestones boolean not null default true,
  show_response_time boolean not null default true,
  show_in_community boolean not null default true,
  show_dispute_history boolean not null default false,
  share_evidence boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.create_trust_passport_settings()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.trust_passport_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Ensure existing profiles have settings too.
insert into public.trust_passport_settings (user_id)
select p.id from public.profiles p
on conflict (user_id) do nothing;

-- ------------------------------------------------------------
-- 9. Audit events (append-only transaction timeline)
-- ------------------------------------------------------------

create table if not exists public.audit_events (
  id uuid default uuid_generate_v4() primary key,
  transaction_id uuid references public.transactions(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (length(trim(event_type)) > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_transaction_id uuid;
  v_actor_id uuid := auth.uid();
  v_record_id uuid;
  v_status_from text;
  v_status_to text;
  v_metadata jsonb := '{}'::jsonb;
  v_entity text := coalesce(nullif(tg_argv[0], ''), tg_table_name);
begin
  if tg_op = 'DELETE' then
    v_transaction_id := old.transaction_id;
    v_record_id := old.id;
  else
    v_transaction_id := new.transaction_id;
    v_record_id := new.id;
  end if;

  if v_transaction_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_status_from := to_jsonb(old) ->> 'status';
    v_status_to := to_jsonb(new) ->> 'status';
    if v_status_from is distinct from v_status_to then
      v_metadata := v_metadata || jsonb_build_object(
        'status_from', v_status_from,
        'status_to', v_status_to
      );
    end if;
  end if;

  insert into public.audit_events (
    transaction_id,
    actor_id,
    event_type,
    metadata
  )
  values (
    v_transaction_id,
    v_actor_id,
    v_entity || '.' || lower(tg_op),
    v_metadata || jsonb_build_object('record_id', v_record_id)
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 10. Row Level Security
-- ------------------------------------------------------------

alter table public.agreement_versions enable row level security;
alter table public.agreement_approvals enable row level security;
alter table public.agreement_change_requests enable row level security;
alter table public.commitments enable row level security;
alter table public.milestones enable row level security;
alter table public.evidence_access_log enable row level security;
alter table public.dispute_statements enable row level security;
alter table public.trust_passport_settings enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "agreement_versions_select" on public.agreement_versions;
create policy "agreement_versions_select"
  on public.agreement_versions for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "agreement_approvals_select" on public.agreement_approvals;
create policy "agreement_approvals_select"
  on public.agreement_approvals for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "agreement_change_requests_select" on public.agreement_change_requests;
create policy "agreement_change_requests_select"
  on public.agreement_change_requests for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "commitments_select" on public.commitments;
create policy "commitments_select"
  on public.commitments for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "commitments_insert" on public.commitments;
create policy "commitments_insert"
  on public.commitments for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.transaction_permission_level(transaction_id, auth.uid()) = 'full'
    and public.is_transaction_member(transaction_id, owner_id)
  );

drop policy if exists "commitments_update" on public.commitments;
create policy "commitments_update"
  on public.commitments for update
  to authenticated
  using (public.transaction_permission_level(transaction_id, auth.uid()) = 'full')
  with check (
    public.transaction_permission_level(transaction_id, auth.uid()) = 'full'
    and public.is_transaction_member(transaction_id, owner_id)
  );

drop policy if exists "milestones_select" on public.milestones;
create policy "milestones_select"
  on public.milestones for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "milestones_insert" on public.milestones;
create policy "milestones_insert"
  on public.milestones for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and public.transaction_permission_level(transaction_id, auth.uid()) = 'full'
  );

drop policy if exists "milestones_update" on public.milestones;
create policy "milestones_update"
  on public.milestones for update
  to authenticated
  using (public.transaction_permission_level(transaction_id, auth.uid()) = 'full')
  with check (public.transaction_permission_level(transaction_id, auth.uid()) = 'full');

drop policy if exists "evidence_access_log_select" on public.evidence_access_log;
create policy "evidence_access_log_select"
  on public.evidence_access_log for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "evidence_access_log_insert" on public.evidence_access_log;
create policy "evidence_access_log_insert"
  on public.evidence_access_log for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and public.is_transaction_participant(transaction_id)
  );

drop policy if exists "dispute_statements_select" on public.dispute_statements;
create policy "dispute_statements_select"
  on public.dispute_statements for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

drop policy if exists "dispute_statements_insert" on public.dispute_statements;
create policy "dispute_statements_insert"
  on public.dispute_statements for insert
  to authenticated
  with check (
    auth.uid() = author_id
    and public.is_transaction_participant(transaction_id)
  );

drop policy if exists "trust_passport_settings_select" on public.trust_passport_settings;
create policy "trust_passport_settings_select"
  on public.trust_passport_settings for select
  to anon, authenticated
  using (is_public or auth.uid() = user_id);

drop policy if exists "trust_passport_settings_insert" on public.trust_passport_settings;
create policy "trust_passport_settings_insert"
  on public.trust_passport_settings for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "trust_passport_settings_update" on public.trust_passport_settings;
create policy "trust_passport_settings_update"
  on public.trust_passport_settings for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "audit_events_select" on public.audit_events;
create policy "audit_events_select"
  on public.audit_events for select
  to authenticated
  using (public.is_transaction_participant(transaction_id));

-- Private evidence is visible only to its uploader. Shared evidence remains
-- visible to every transaction participant.
drop policy if exists "attachments_select" on public.attachments;
create policy "attachments_select"
  on public.attachments for select
  to authenticated
  using (
    public.is_transaction_participant(transaction_id)
    and (visibility <> 'private' or uploaded_by = auth.uid())
  );

drop policy if exists "attachments_update" on public.attachments;
create policy "attachments_update"
  on public.attachments for update
  to authenticated
  using (
    auth.uid() = uploaded_by
    and public.is_transaction_participant(transaction_id)
  )
  with check (
    auth.uid() = uploaded_by
    and public.is_transaction_participant(transaction_id)
  );

-- Table privileges: reads go through RLS, sensitive writes are restricted to
-- security-definer functions or the service role.
revoke all on public.agreement_versions from anon, authenticated;
revoke all on public.agreement_approvals from anon, authenticated;
revoke all on public.agreement_change_requests from anon, authenticated;
revoke all on public.commitments from anon, authenticated;
revoke all on public.milestones from anon, authenticated;
revoke all on public.evidence_access_log from anon, authenticated;
revoke all on public.dispute_statements from anon, authenticated;
revoke all on public.trust_passport_settings from anon, authenticated;
revoke all on public.audit_events from anon, authenticated;

grant select on public.agreement_versions to authenticated;
grant select on public.agreement_approvals to authenticated;
grant select on public.agreement_change_requests to authenticated;
grant select, insert, update on public.commitments to authenticated;
grant select, insert, update on public.milestones to authenticated;
grant select, insert on public.evidence_access_log to authenticated;
grant select, insert on public.dispute_statements to authenticated;
grant select on public.trust_passport_settings to anon, authenticated;
grant insert, update on public.trust_passport_settings to authenticated;
grant select on public.audit_events to authenticated;

revoke update on public.attachments from authenticated;
grant update (kind, description, visibility, commitment_id, milestone_id, version, supersedes_id, checksum)
  on public.attachments to authenticated;

-- ------------------------------------------------------------
-- 11. Functions: permissions
-- ------------------------------------------------------------

revoke all on function public.is_transaction_member(uuid, uuid) from public, anon;
revoke all on function public.transaction_permission_level(uuid, uuid) from public, anon;
revoke all on function public.find_user_by_email(text) from public, anon;
revoke all on function public.add_transaction_participant(uuid, uuid, text, text) from public, anon;
revoke all on function public.create_agreement_version(uuid, jsonb, text, jsonb, text, numeric) from public, anon;
revoke all on function public.update_agreement_draft(uuid, jsonb) from public, anon;
revoke all on function public.submit_agreement_for_approval(uuid) from public, anon;
revoke all on function public.record_agreement_approval(uuid, text, text) from public, anon;

grant execute on function public.is_transaction_member(uuid, uuid) to authenticated;
grant execute on function public.transaction_permission_level(uuid, uuid) to authenticated;
grant execute on function public.find_user_by_email(text) to authenticated;
grant execute on function public.add_transaction_participant(uuid, uuid, text, text) to authenticated;
grant execute on function public.create_agreement_version(uuid, jsonb, text, jsonb, text, numeric) to authenticated;
grant execute on function public.update_agreement_draft(uuid, jsonb) to authenticated;
grant execute on function public.submit_agreement_for_approval(uuid) to authenticated;
grant execute on function public.record_agreement_approval(uuid, text, text) to authenticated;

-- ------------------------------------------------------------
-- 12. Triggers
-- ------------------------------------------------------------

drop trigger if exists update_agreement_versions_updated_at on public.agreement_versions;
create trigger update_agreement_versions_updated_at
  before update on public.agreement_versions
  for each row execute function public.set_updated_at();

drop trigger if exists update_commitments_updated_at on public.commitments;
create trigger update_commitments_updated_at
  before update on public.commitments
  for each row execute function public.set_updated_at();

drop trigger if exists update_milestones_updated_at on public.milestones;
create trigger update_milestones_updated_at
  before update on public.milestones
  for each row execute function public.set_updated_at();

drop trigger if exists update_attachments_updated_at on public.attachments;
create trigger update_attachments_updated_at
  before update on public.attachments
  for each row execute function public.set_updated_at();

drop trigger if exists update_trust_passport_settings_updated_at on public.trust_passport_settings;
create trigger update_trust_passport_settings_updated_at
  before update on public.trust_passport_settings
  for each row execute function public.set_updated_at();

drop trigger if exists create_trust_passport_settings on public.profiles;
create trigger create_trust_passport_settings
  after insert on public.profiles
  for each row execute function public.create_trust_passport_settings();

drop trigger if exists handle_agreement_approval on public.agreement_approvals;
create trigger handle_agreement_approval
  before insert on public.agreement_approvals
  for each row execute function public.handle_agreement_approval();

drop trigger if exists validate_commitment on public.commitments;
create trigger validate_commitment
  before insert or update on public.commitments
  for each row execute function public.validate_commitment();

drop trigger if exists validate_milestone on public.milestones;
create trigger validate_milestone
  before insert or update on public.milestones
  for each row execute function public.validate_milestone();

drop trigger if exists validate_attachment_links on public.attachments;
create trigger validate_attachment_links
  before insert or update on public.attachments
  for each row execute function public.validate_attachment_links();

drop trigger if exists validate_dispute_statement on public.dispute_statements;
create trigger validate_dispute_statement
  before insert on public.dispute_statements
  for each row execute function public.validate_dispute_statement();

-- Audit trail triggers.
drop trigger if exists audit_transactions on public.transactions;
create trigger audit_transactions
  after insert or update on public.transactions
  for each row execute function public.log_audit_event('transaction');

drop trigger if exists audit_participants on public.transaction_participants;
create trigger audit_participants
  after insert or update on public.transaction_participants
  for each row execute function public.log_audit_event('participant');

drop trigger if exists audit_agreement_versions on public.agreement_versions;
create trigger audit_agreement_versions
  after insert or update on public.agreement_versions
  for each row execute function public.log_audit_event('agreement');

drop trigger if exists audit_agreement_approvals on public.agreement_approvals;
create trigger audit_agreement_approvals
  after insert on public.agreement_approvals
  for each row execute function public.log_audit_event('agreement_approval');

drop trigger if exists audit_agreement_change_requests on public.agreement_change_requests;
create trigger audit_agreement_change_requests
  after insert or update on public.agreement_change_requests
  for each row execute function public.log_audit_event('agreement_change_request');

drop trigger if exists audit_commitments on public.commitments;
create trigger audit_commitments
  after insert or update on public.commitments
  for each row execute function public.log_audit_event('commitment');

drop trigger if exists audit_milestones on public.milestones;
create trigger audit_milestones
  after insert or update on public.milestones
  for each row execute function public.log_audit_event('milestone');

drop trigger if exists audit_attachments on public.attachments;
create trigger audit_attachments
  after insert or update on public.attachments
  for each row execute function public.log_audit_event('evidence');

drop trigger if exists audit_disputes on public.disputes;
create trigger audit_disputes
  after insert or update on public.disputes
  for each row execute function public.log_audit_event('dispute');

drop trigger if exists audit_dispute_statements on public.dispute_statements;
create trigger audit_dispute_statements
  after insert on public.dispute_statements
  for each row execute function public.log_audit_event('dispute_statement');

drop trigger if exists audit_payment_events on public.payment_events;
create trigger audit_payment_events
  after insert on public.payment_events
  for each row execute function public.log_audit_event('payment');

-- ------------------------------------------------------------
-- 13. Storage read policy: respect private evidence visibility
-- ------------------------------------------------------------

drop policy if exists "attachments_read_participants" on storage.objects;
create policy "attachments_read_participants"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1
      from public.attachments a
      where a.storage_path = storage.objects.name
        and public.is_transaction_participant(a.transaction_id)
        and (a.visibility <> 'private' or a.uploaded_by = auth.uid())
    )
  );

-- ------------------------------------------------------------
-- 14. Indexes
-- ------------------------------------------------------------

create index if not exists idx_agreement_versions_transaction
  on public.agreement_versions(transaction_id, version desc);
create index if not exists idx_agreement_versions_status
  on public.agreement_versions(transaction_id, status);
create unique index if not exists uniq_agreement_one_pending
  on public.agreement_versions(transaction_id)
  where status = 'pending_approval';

create index if not exists idx_agreement_approvals_agreement
  on public.agreement_approvals(agreement_id);
create index if not exists idx_agreement_approvals_transaction
  on public.agreement_approvals(transaction_id);

create index if not exists idx_agreement_change_requests_agreement
  on public.agreement_change_requests(agreement_id, status);

create index if not exists idx_commitments_transaction
  on public.commitments(transaction_id, status);
create index if not exists idx_commitments_owner_due
  on public.commitments(owner_id, due_at);

create index if not exists idx_milestones_transaction
  on public.milestones(transaction_id, position);

create index if not exists idx_attachments_transaction_kind
  on public.attachments(transaction_id, kind);
create index if not exists idx_attachments_commitment
  on public.attachments(commitment_id)
  where commitment_id is not null;
create index if not exists idx_attachments_milestone
  on public.attachments(milestone_id)
  where milestone_id is not null;

create index if not exists idx_evidence_access_log_attachment
  on public.evidence_access_log(attachment_id, created_at desc);

create index if not exists idx_dispute_statements_dispute
  on public.dispute_statements(dispute_id, created_at);

create index if not exists idx_audit_events_transaction
  on public.audit_events(transaction_id, created_at);

create index if not exists idx_trust_passport_public
  on public.trust_passport_settings(is_public)
  where is_public = true;

-- ------------------------------------------------------------
-- 15. Realtime publication
-- ------------------------------------------------------------

do $$
begin
  alter publication supabase_realtime add table public.agreement_versions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.commitments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.milestones;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.audit_events;
exception when duplicate_object then null;
end $$;

-- The workspace subscribes to transaction changes for its live feed, so the
-- table has to be replicated. Without this the subscription silently never
-- fires.
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- DONE
-- ============================================================
