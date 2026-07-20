-- Server-authoritative consultation lifecycle and idempotent minute billing.

create table public.consultation_settings (
  id boolean primary key default true check (id),
  minimum_minutes integer not null check (minimum_minutes > 0),
  billing_interval_seconds integer not null check (billing_interval_seconds > 0),
  heartbeat_interval_seconds integer not null check (heartbeat_interval_seconds > 0),
  request_timeout_seconds integer not null check (request_timeout_seconds > 0),
  recharge_grace_seconds integer not null check (recharge_grace_seconds > 0),
  low_balance_minutes integer not null check (low_balance_minutes > 0),
  updated_at timestamptz not null default now()
);

insert into public.consultation_settings (
  id,
  minimum_minutes,
  billing_interval_seconds,
  heartbeat_interval_seconds,
  request_timeout_seconds,
  recharge_grace_seconds,
  low_balance_minutes
)
values (true, 5, 60, 10, 60, 30, 2);

alter table public.consultation_settings enable row level security;

alter table public.consultation_sessions
  add column recharge_deadline_at timestamptz;

create table public.consultation_billing_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.consultation_sessions(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  minute_number integer not null check (minute_number > 0),
  amount numeric(10, 2) not null check (amount > 0),
  billed_at timestamptz not null default now(),
  unique (session_id, minute_number)
);

create index idx_consultation_billing_entries_user
  on public.consultation_billing_entries(user_id, billed_at desc);

alter table public.consultation_billing_entries enable row level security;

create policy "Select own consultation billing entries"
on public.consultation_billing_entries
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Insert session requests" on public.consultation_sessions;

create unique index uq_consultation_open_session_per_user
on public.consultation_sessions(user_id)
where status in ('CHECKING_WALLET', 'PREPARING_KUNDLI', 'WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING');

create or replace function public.create_consultation_session(
  p_user_id uuid,
  p_astrologer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer public.astrologers;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_session public.consultation_sessions;
  v_minimum_required numeric(10, 2);
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  select * into v_settings from public.consultation_settings where id = true;
  if not found then
    raise exception 'Consultation settings are not configured';
  end if;

  select * into v_session
  from public.consultation_sessions
  where user_id = p_user_id
    and status in ('CHECKING_WALLET', 'PREPARING_KUNDLI', 'WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING')
  order by requested_at desc
  limit 1;

  if found then
    return pg_catalog.jsonb_build_object(
      'outcome', 'existing_session',
      'session', pg_catalog.to_jsonb(v_session),
      'minimum_minutes', v_settings.minimum_minutes,
      'minimum_required', v_session.rate_per_minute * v_settings.minimum_minutes,
      'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
      'request_timeout_seconds', v_settings.request_timeout_seconds,
      'recharge_grace_seconds', v_settings.recharge_grace_seconds
    );
  end if;

  select * into v_astrologer
  from public.astrologers
  where id = p_astrologer_id;

  if not found then
    raise exception 'Astrologer not found';
  end if;
  if v_astrologer.status <> 'ONLINE' then
    raise exception 'Astrologer is not available';
  end if;

  insert into public.wallets(user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  v_minimum_required := v_astrologer.price_per_minute * v_settings.minimum_minutes;
  if v_wallet.balance < v_minimum_required then
    return pg_catalog.jsonb_build_object(
      'outcome', 'insufficient_balance',
      'session', null,
      'balance', v_wallet.balance,
      'rate_per_minute', v_astrologer.price_per_minute,
      'minimum_minutes', v_settings.minimum_minutes,
      'minimum_required', v_minimum_required,
      'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
      'request_timeout_seconds', v_settings.request_timeout_seconds,
      'recharge_grace_seconds', v_settings.recharge_grace_seconds
    );
  end if;

  insert into public.consultation_sessions (
    user_id,
    astrologer_id,
    status,
    rate_per_minute
  )
  values (
    p_user_id,
    p_astrologer_id,
    'WAITING_FOR_ASTROLOGER',
    v_astrologer.price_per_minute
  )
  returning * into v_session;

  insert into public.system_events(user_id, type, payload)
  values (
    p_user_id,
    'CONSULTATION_REQUESTED',
    pg_catalog.jsonb_build_object('session_id', v_session.id, 'astrologer_id', p_astrologer_id)
  );

  return pg_catalog.jsonb_build_object(
    'outcome', 'created',
    'session', pg_catalog.to_jsonb(v_session),
    'balance', v_wallet.balance,
    'minimum_minutes', v_settings.minimum_minutes,
    'minimum_required', v_minimum_required,
    'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
    'request_timeout_seconds', v_settings.request_timeout_seconds,
    'recharge_grace_seconds', v_settings.recharge_grace_seconds
  );
end;
$$;

create or replace function public.start_consultation_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_billing_id uuid;
  v_now timestamptz := pg_catalog.now();
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') then
    return pg_catalog.jsonb_build_object('status', 'already_started', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Session cannot be started from status %', v_session.status;
  end if;

  select * into v_settings from public.consultation_settings where id = true;
  if v_now >= v_session.requested_at + pg_catalog.make_interval(secs => v_settings.request_timeout_seconds) then
    update public.consultation_sessions
    set status = 'EXPIRED', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = v_session.user_id
  for update;

  if v_wallet.balance < v_session.rate_per_minute then
    update public.consultation_sessions
    set status = 'INSUFFICIENT_BALANCE', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
  end if;

  insert into public.consultation_billing_entries(session_id, user_id, minute_number, amount, billed_at)
  values (p_session_id, v_session.user_id, 1, v_session.rate_per_minute, v_now)
  on conflict (session_id, minute_number) do nothing
  returning id into v_billing_id;

  if v_billing_id is not null then
    update public.wallets
    set balance = balance - v_session.rate_per_minute, updated_at = v_now
    where user_id = v_session.user_id;

    insert into public.wallet_transactions (
      user_id, type, amount, title, description, status, reference_type, reference_id, created_at
    ) values (
      v_session.user_id, 'debit', v_session.rate_per_minute, 'Consultation Charge',
      'Minute 1', 'completed', 'consultation', v_billing_id, v_now
    );
  end if;

  update public.consultation_sessions
  set status = 'ACTIVE',
      started_at = coalesce(started_at, v_now),
      last_billed_at = v_now,
      billed_minutes = 1,
      total_charged = v_session.rate_per_minute,
      elapsed_seconds = 0
  where id = p_session_id
  returning * into v_session;

  select * into v_wallet from public.wallets where user_id = v_session.user_id;
  return pg_catalog.jsonb_build_object('status', 'started', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
end;
$$;

create or replace function public.bill_consultation_session(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_now timestamptz := pg_catalog.now();
  v_elapsed_seconds integer;
  v_expected_minutes integer;
  v_minute integer;
  v_billing_id uuid;
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status = 'ENDED' then
    return pg_catalog.jsonb_build_object('status', 'already_ended', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status not in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') or v_session.started_at is null then
    return pg_catalog.jsonb_build_object('status', 'not_active', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  select * into v_settings from public.consultation_settings where id = true;
  select * into v_wallet from public.wallets where user_id = v_session.user_id for update;

  v_elapsed_seconds := greatest(0, pg_catalog.floor(extract(epoch from (v_now - v_session.started_at)))::integer);
  v_expected_minutes := 1 + pg_catalog.floor(v_elapsed_seconds::numeric / v_settings.billing_interval_seconds)::integer;

  for v_minute in (v_session.billed_minutes + 1)..v_expected_minutes loop
    if v_wallet.balance < v_session.rate_per_minute then
      if v_session.recharge_deadline_at is not null and v_now >= v_session.recharge_deadline_at then
        update public.consultation_sessions
        set status = 'ENDED', ended_at = v_now, elapsed_seconds = v_elapsed_seconds
        where id = p_session_id
        returning * into v_session;
        return pg_catalog.jsonb_build_object('status', 'ended_insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
      end if;

      update public.consultation_sessions
      set status = 'RECHARGING',
          recharge_deadline_at = coalesce(recharge_deadline_at, v_now + pg_catalog.make_interval(secs => v_settings.recharge_grace_seconds)),
          elapsed_seconds = v_elapsed_seconds
      where id = p_session_id
      returning * into v_session;
      return pg_catalog.jsonb_build_object('status', 'recharge_required', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
    end if;

    v_billing_id := null;
    insert into public.consultation_billing_entries(session_id, user_id, minute_number, amount, billed_at)
    values (p_session_id, v_session.user_id, v_minute, v_session.rate_per_minute, v_now)
    on conflict (session_id, minute_number) do nothing
    returning id into v_billing_id;

    if v_billing_id is not null then
      update public.wallets
      set balance = balance - v_session.rate_per_minute, updated_at = v_now
      where user_id = v_session.user_id
      returning * into v_wallet;

      insert into public.wallet_transactions (
        user_id, type, amount, title, description, status, reference_type, reference_id, created_at
      ) values (
        v_session.user_id, 'debit', v_session.rate_per_minute, 'Consultation Charge',
        'Minute ' || v_minute, 'completed', 'consultation', v_billing_id, v_now
      );

      v_session.billed_minutes := v_minute;
      v_session.total_charged := v_session.total_charged + v_session.rate_per_minute;
    end if;
  end loop;

  update public.consultation_sessions
  set billed_minutes = v_session.billed_minutes,
      total_charged = v_session.total_charged,
      last_billed_at = case when v_session.billed_minutes > 0 then v_now else last_billed_at end,
      elapsed_seconds = v_elapsed_seconds,
      recharge_deadline_at = null,
      status = case
        when v_wallet.balance < v_session.rate_per_minute then 'RECHARGING'
        when v_wallet.balance <= v_session.rate_per_minute * v_settings.low_balance_minutes then 'LOW_BALANCE'
        else 'ACTIVE'
      end
  where id = p_session_id
  returning * into v_session;

  if v_session.status = 'RECHARGING' then
    update public.consultation_sessions
    set recharge_deadline_at = v_now + pg_catalog.make_interval(secs => v_settings.recharge_grace_seconds)
    where id = p_session_id
    returning * into v_session;
  end if;

  return pg_catalog.jsonb_build_object('status', 'up_to_date', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
end;
$$;

create or replace function public.finish_consultation_session(
  p_session_id uuid,
  p_reason text default 'user_ended'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
  v_billing jsonb;
  v_now timestamptz := pg_catalog.now();
begin
  v_billing := public.bill_consultation_session(p_session_id);

  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if v_session.status <> 'ENDED' then
    update public.consultation_sessions
    set status = 'ENDED',
        ended_at = v_now,
        elapsed_seconds = case
          when started_at is null then elapsed_seconds
          else greatest(0, pg_catalog.floor(extract(epoch from (v_now - started_at)))::integer)
        end
    where id = p_session_id
    returning * into v_session;
  end if;

  insert into public.system_events(user_id, type, payload)
  values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;

create or replace function public.transition_waiting_consultation(
  p_session_id uuid,
  p_target_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
begin
  if p_target_status = 'ACTIVE' then
    return public.start_consultation_session(p_session_id);
  end if;
  if p_target_status not in ('REJECTED', 'EXPIRED') then
    raise exception 'Unsupported consultation transition';
  end if;

  update public.consultation_sessions
  set status = p_target_status, ended_at = pg_catalog.now()
  where id = p_session_id and status = 'WAITING_FOR_ASTROLOGER'
  returning * into v_session;

  if not found then
    raise exception 'Waiting session not found';
  end if;
  return pg_catalog.jsonb_build_object('status', pg_catalog.lower(p_target_status), 'session', pg_catalog.to_jsonb(v_session));
end;
$$;

create or replace function public.expire_waiting_consultation(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
  v_settings public.consultation_settings;
begin
  select * into v_settings from public.consultation_settings where id = true;
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status = 'EXPIRED' then
    return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Session is not waiting';
  end if;
  if pg_catalog.now() < v_session.requested_at + pg_catalog.make_interval(secs => v_settings.request_timeout_seconds) then
    raise exception 'Request timeout has not elapsed';
  end if;

  update public.consultation_sessions
  set status = 'EXPIRED', ended_at = pg_catalog.now()
  where id = p_session_id
  returning * into v_session;
  return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
end;
$$;

revoke all on table public.consultation_settings from public, anon, authenticated;
revoke all on table public.consultation_billing_entries from public, anon;
grant select on table public.consultation_billing_entries to authenticated;

revoke all on function public.create_consultation_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.start_consultation_session(uuid) from public, anon, authenticated;
revoke all on function public.bill_consultation_session(uuid) from public, anon, authenticated;
revoke all on function public.finish_consultation_session(uuid, text) from public, anon, authenticated;
revoke all on function public.transition_waiting_consultation(uuid, text) from public, anon, authenticated;
revoke all on function public.expire_waiting_consultation(uuid) from public, anon, authenticated;

grant execute on function public.create_consultation_session(uuid, uuid) to service_role;
grant execute on function public.start_consultation_session(uuid) to service_role;
grant execute on function public.bill_consultation_session(uuid) to service_role;
grant execute on function public.finish_consultation_session(uuid, text) to service_role;
grant execute on function public.transition_waiting_consultation(uuid, text) to service_role;
grant execute on function public.expire_waiting_consultation(uuid) to service_role;
