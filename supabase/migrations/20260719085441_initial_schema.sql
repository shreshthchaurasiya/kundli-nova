-- Migration: Initial Schema for Kundli Nova
-- Incorporating strict RLS, atomic RPCs, and user_devices table for FCM

-- 1. Profiles Table (Auth Linked)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  phone text unique,
  email text,
  name text not null,
  gender text,
  dob date,
  tob time,
  birth_state text,
  birth_district text,
  birth_city text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Astrologers Table
create table public.astrologers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  image text,
  experience text not null,
  languages text[] not null,
  skills text[] not null,
  rating numeric(3, 2) default 5.00 not null,
  consultations integer default 0 not null,
  price_per_minute numeric(10, 2) not null check (price_per_minute >= 0.00),
  status text not null default 'OFFLINE' check (status in ('ONLINE', 'BUSY', 'OFFLINE')),
  next_available_at timestamp with time zone,
  last_seen timestamp with time zone default timezone('utc'::text, now()) not null,
  about text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Wallets Table
create table public.wallets (
  user_id uuid references public.profiles on delete cascade primary key,
  balance numeric(10, 2) not null default 0.00 check (balance >= 0.00),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Wallet Transactions Table
create table public.wallet_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  type text not null check (type in ('credit', 'debit')),
  amount numeric(10, 2) not null check (amount > 0.00),
  title text not null,
  description text,
  status text not null default 'completed' check (status in ('completed', 'failed', 'pending')),
  reference_type text check (reference_type in ('recharge', 'consultation', 'refund', 'bonus')),
  reference_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Saved Kundli Profiles
create table public.kundli_profiles (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references public.profiles on delete cascade not null,
  name text not null,
  relation text not null default 'self',
  gender text not null,
  dob date not null,
  tob time not null,
  birth_state text not null,
  birth_district text not null,
  birth_city text not null,
  is_default boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Kundli Reports (Normalized Cache)
create table public.kundli_reports (
  id uuid default gen_random_uuid() primary key,
  profile_id uuid references public.kundli_profiles on delete cascade not null,
  engine text not null default 'VedAstro',
  version text not null default 'v1',
  report_json jsonb not null,
  generated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Consultation Sessions
create table public.consultation_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  astrologer_id uuid references public.astrologers on delete set null,
  status text not null check (status in (
    'CHECKING_WALLET', 'INSUFFICIENT_BALANCE', 'PREPARING_KUNDLI', 
    'WAITING_FOR_ASTROLOGER', 'REJECTED', 'EXPIRED', 
    'ACTIVE', 'LOW_BALANCE', 'RECHARGING', 'ENDED'
  )),
  rate_per_minute numeric(10, 2) not null check (rate_per_minute >= 0.00),
  requested_at timestamp with time zone default timezone('utc'::text, now()) not null,
  started_at timestamp with time zone,
  ended_at timestamp with time zone,
  last_billed_at timestamp with time zone,
  billed_minutes integer not null default 0,
  total_charged numeric(10, 2) not null default 0.00,
  elapsed_seconds integer not null default 0
);

-- 8. Consultation Messages
create table public.consultation_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.consultation_sessions on delete cascade not null,
  sender text not null check (sender in ('astrologer', 'user', 'system')),
  message_text text,
  message_type text not null default 'text' check (message_type in (
    'text', 'image', 'pdf', 'voice', 'system', 'kundli-card'
  )),
  attachment_url text,
  attachment_name text,
  status text not null default 'sent' check (status in ('sent', 'delivered', 'read')),
  metadata jsonb default '{}'::jsonb not null,
  edited_at timestamp with time zone,
  deleted_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. System Events (Audit Table)
create table public.system_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade,
  type text not null,
  payload jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. User Devices (FCM tokens for multiple devices)
create table public.user_devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  fcm_token text not null unique,
  device_type text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INDEXES
create index idx_wallet_tx_user on public.wallet_transactions(user_id);
create index idx_consultations_user on public.consultation_sessions(user_id);
create index idx_consultations_astrologer on public.consultation_sessions(astrologer_id);
create index idx_messages_session on public.consultation_messages(session_id);
create index idx_kundli_reports_profile on public.kundli_reports(profile_id);
create index idx_user_devices_user on public.user_devices(user_id);


-- TRIGGERS
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, phone, name, created_at)
  values (
    new.id,
    new.phone,
    coalesce(new.raw_user_meta_data->>'name', 'Guest'),
    new.created_at
  );
  
  -- Automatically initialize a wallet for the new user (Service Role operation implicitly)
  insert into public.wallets (user_id, balance)
  values (new.id, 150.00);
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- RPC: Atomic Wallet Recharge (Service Role Only)
create or replace function public.recharge_wallet(
  p_user_id uuid,
  p_amount numeric,
  p_title text,
  p_description text default null,
  p_ref_type text default 'recharge',
  p_ref_id uuid default null
)
returns public.wallets as $$
declare
  v_wallet public.wallets;
begin
  -- Enforce service role (backend only)
  if current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' then
    raise exception 'Unauthorized: Only backend proxy can recharge wallet';
  end if;

  if p_amount <= 0 then
    raise exception 'Recharge amount must be greater than zero';
  end if;

  -- 1. Update wallet balance
  insert into public.wallets (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
  set balance = public.wallets.balance + p_amount,
      updated_at = now()
  returning * into v_wallet;

  -- 2. Log transaction history ledger
  insert into public.wallet_transactions (user_id, type, amount, title, description, status, reference_type, reference_id, created_at)
  values (p_user_id, 'credit', p_amount, p_title, p_description, 'completed', p_ref_type, p_ref_id, now());

  -- 3. Log Audit Event
  insert into public.system_events (user_id, type, payload)
  values (p_user_id, 'WALLET_RECHARGE', jsonb_build_object('amount', p_amount, 'title', p_title));

  return v_wallet;
end;
$$ language plpgsql security definer;

-- RPC: Bill Consultation Session (Idempotent, Transactional)
-- Computes elapsed time, bills for due minutes, and updates the session and wallet atomically
create or replace function public.bill_consultation_session(p_session_id uuid)
returns jsonb as $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_elapsed_seconds integer;
  v_expected_billed_minutes integer;
  v_minutes_to_bill integer;
  v_amount_to_debit numeric;
  v_now timestamp with time zone = now();
begin
  -- Enforce service role (backend only)
  if current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' then
    raise exception 'Unauthorized: Only backend proxy can bill consultations';
  end if;

  -- 1. Lock the session row for update
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  if v_session.status = 'ENDED' then
    -- Already ended, idempotent
    return jsonb_build_object('status', 'already_ended', 'session', row_to_json(v_session));
  end if;

  if v_session.started_at is null then
    return jsonb_build_object('status', 'not_started', 'session', row_to_json(v_session));
  end if;

  -- Calculate actual elapsed seconds
  v_elapsed_seconds := floor(extract(epoch from (v_now - v_session.started_at)));
  
  -- Calculate total minutes that should have been billed (1 minute minimum, plus 1 for every started 60s)
  v_expected_billed_minutes := 1 + floor(v_elapsed_seconds / 60);
  
  v_minutes_to_bill := v_expected_billed_minutes - v_session.billed_minutes;

  if v_minutes_to_bill <= 0 then
    -- Already up to date
    return jsonb_build_object('status', 'up_to_date', 'session', row_to_json(v_session));
  end if;

  v_amount_to_debit := v_minutes_to_bill * v_session.rate_per_minute;

  -- 2. Lock and update wallet
  select * into v_wallet
  from public.wallets
  where user_id = v_session.user_id
  for update;

  if v_wallet is null or v_wallet.balance < v_amount_to_debit then
    -- INSUFFICIENT BALANCE logic
    -- We can set status to ENDED or LOW_BALANCE. For now, mark ENDED.
    update public.consultation_sessions
    set status = 'ENDED',
        ended_at = v_now,
        elapsed_seconds = v_elapsed_seconds
    where id = p_session_id
    returning * into v_session;
    
    insert into public.system_events (user_id, type, payload)
    values (v_session.user_id, 'SESSION_FORCE_ENDED', jsonb_build_object('session_id', p_session_id, 'reason', 'insufficient_balance'));
    
    return jsonb_build_object('status', 'insufficient_balance', 'session', row_to_json(v_session));
  end if;

  -- 3. Deduct balance
  update public.wallets
  set balance = balance - v_amount_to_debit,
      updated_at = v_now
  where user_id = v_session.user_id;

  -- 4. Log ledger
  insert into public.wallet_transactions (user_id, type, amount, title, description, status, reference_type, reference_id, created_at)
  values (v_session.user_id, 'debit', v_amount_to_debit, 'Consultation Charge', 'Billing for ' || v_minutes_to_bill || ' min', 'completed', 'consultation', p_session_id, v_now);

  -- 5. Update session
  update public.consultation_sessions
  set billed_minutes = billed_minutes + v_minutes_to_bill,
      total_charged = total_charged + v_amount_to_debit,
      last_billed_at = v_now,
      elapsed_seconds = v_elapsed_seconds
  where id = p_session_id
  returning * into v_session;

  -- 6. Log audit event
  insert into public.system_events (user_id, type, payload)
  values (v_session.user_id, 'SESSION_BILLED', jsonb_build_object('session_id', p_session_id, 'minutes_billed', v_minutes_to_bill, 'amount', v_amount_to_debit));

  return jsonb_build_object('status', 'billed', 'session', row_to_json(v_session));
end;
$$ language plpgsql security definer;


-- STRICT ROW LEVEL SECURITY POLICIES

alter table public.profiles enable row level security;
alter table public.astrologers enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.kundli_profiles enable row level security;
alter table public.kundli_reports enable row level security;
alter table public.consultation_sessions enable row level security;
alter table public.consultation_messages enable row level security;
alter table public.system_events enable row level security;
alter table public.user_devices enable row level security;

-- Profiles: Users can view and update their own profile
create policy "Select profile" on public.profiles for select using (auth.uid() = id);
create policy "Update profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Astrologers: Anyone can read
create policy "Select astrologers" on public.astrologers for select using (true);
create policy "Admin modify astrologers" on public.astrologers for all using (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Wallets: Select only. Modifications via RPC/Backend only
create policy "Select wallet" on public.wallets for select using (auth.uid() = user_id);
create policy "Service role modify wallets" on public.wallets for all using (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Wallet Transactions: Select only
create policy "Select wallet transactions" on public.wallet_transactions for select using (auth.uid() = user_id);
create policy "Service role modify wallet tx" on public.wallet_transactions for all using (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Kundli Profiles: Full management by owner
create policy "Select kundli_profiles" on public.kundli_profiles for select using (auth.uid() = owner_id);
create policy "Insert kundli_profiles" on public.kundli_profiles for insert with check (auth.uid() = owner_id);
create policy "Update kundli_profiles" on public.kundli_profiles for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Delete kundli_profiles" on public.kundli_profiles for delete using (auth.uid() = owner_id);

-- Kundli Reports: Managed by backend, users can view
create policy "Select kundli_reports" on public.kundli_reports for select using (
  exists (
    select 1 from public.kundli_profiles
    where id = kundli_reports.profile_id and owner_id = auth.uid()
  )
);
create policy "Service role insert kundli_reports" on public.kundli_reports for insert with check (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Consultation Sessions: View and Create requests. Updates strictly via backend.
create policy "Select sessions" on public.consultation_sessions for select using (auth.uid() = user_id);
create policy "Insert session requests" on public.consultation_sessions for insert with check (auth.uid() = user_id and status = 'CHECKING_WALLET');
create policy "Service role modify sessions" on public.consultation_sessions for update using (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role') with check (true);

-- Consultation Messages: Users can read and append text/image to their own sessions
create policy "Select messages" on public.consultation_messages for select using (
  exists (
    select 1 from public.consultation_sessions
    where id = consultation_messages.session_id and user_id = auth.uid()
  )
);
create policy "Insert messages" on public.consultation_messages for insert with check (
  exists (
    select 1 from public.consultation_sessions
    where id = consultation_messages.session_id and user_id = auth.uid()
  )
  and sender = 'user'
);

-- User Devices: Full management of own tokens
create policy "Select devices" on public.user_devices for select using (auth.uid() = user_id);
create policy "Insert devices" on public.user_devices for insert with check (auth.uid() = user_id);
create policy "Delete devices" on public.user_devices for delete using (auth.uid() = user_id);

-- System Events: Select only for backend.
create policy "Service role manage system events" on public.system_events for all using (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Storage Bucket Policies
insert into storage.buckets (id, name, public) values ('profile-photos', 'profile-photos', true);
insert into storage.buckets (id, name, public) values ('chat-attachments', 'chat-attachments', true);
insert into storage.buckets (id, name, public) values ('compiled-reports', 'compiled-reports', true);

-- Enable RLS on storage objects
create policy "Profile photos insert" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'profile-photos');
create policy "Profile photos select" on storage.objects for select using (bucket_id = 'profile-photos');

create policy "Chat attachments insert" on storage.objects for insert with check (auth.role() = 'authenticated' and bucket_id = 'chat-attachments');
create policy "Chat attachments select" on storage.objects for select using (bucket_id = 'chat-attachments');

create policy "Compiled reports select" on storage.objects for select using (bucket_id = 'compiled-reports');
create policy "Compiled reports insert (backend)" on storage.objects for insert with check (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role' and bucket_id = 'compiled-reports');
