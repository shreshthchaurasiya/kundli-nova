-- 20260727100000_post_billing_flow.sql
-- Implements Model A: Post-billing per completed minute

-- 1. start_consultation_session
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

  if v_wallet.balance < (v_session.rate_per_minute * v_settings.minimum_minutes) then
    update public.consultation_sessions
    set status = 'INSUFFICIENT_BALANCE', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
  end if;

  update public.consultation_sessions
  set status = 'ACTIVE',
      started_at = coalesce(started_at, v_now),
      last_billed_at = null,
      billed_minutes = 0,
      total_charged = 0,
      elapsed_seconds = 0
  where id = p_session_id
  returning * into v_session;

  return pg_catalog.jsonb_build_object('status', 'started', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
end;
$$;


-- 2. bill_consultation_session (heartbeat catch-up)
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
  v_target_billed_minutes integer;
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
  v_target_billed_minutes := pg_catalog.floor(v_elapsed_seconds::numeric / v_settings.billing_interval_seconds)::integer;

  for v_minute in (v_session.billed_minutes + 1)..v_target_billed_minutes loop
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


-- 3. finish_consultation_session (calls bill_consultation_session for final catch up)
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
  -- Run final catch-up billing logic first
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
