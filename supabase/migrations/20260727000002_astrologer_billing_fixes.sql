-- Fix 7: Preserve financial records (ON DELETE RESTRICT instead of CASCADE if applicable, wait, I already used RESTRICT on consultation_id. For astrologer_id, I didn't specify, so it defaults to RESTRICT? Let's alter it to be explicitly RESTRICT just in case).
-- Wait, let's just DROP the FK and ADD it back with RESTRICT.

alter table public.astrologer_billing_ledger
  drop constraint if exists astrologer_billing_ledger_astrologer_id_fkey;

alter table public.astrologer_billing_ledger
  add constraint astrologer_billing_ledger_astrologer_id_fkey
  foreign key (astrologer_id) references public.astrologers(id) on delete restrict;

-- Fix 8: Use proper timestamptz defaults
alter table public.astrologer_billing_ledger
  alter column earned_at set default now(),
  alter column created_at set default now(),
  alter column updated_at set default now();

-- Fix 3 and 4: Harden timezone handling and verify real approval
create or replace function public.get_my_astrologer_dashboard_summary(p_timezone text default 'Asia/Kolkata')
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_summary json;
  v_total_consults_today integer;
  v_billed_minutes_today integer;
begin
  -- Harden timezone handling
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  begin
    perform pg_catalog.now() at time zone p_timezone;
  exception when others then
    p_timezone := 'Asia/Kolkata';
  end;

  -- Resolve currently authenticated astrologer internally with actual approval check
  select a.id into v_astrologer_id
  from public.astrologers a
  left join public.astrologer_applications app on a.application_id = app.id
  where a.user_id = auth.uid() 
    and (app.id is null or app.status = 'approved');

  if not found then
    raise exception 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  end if;

  select count(id), coalesce(sum(billed_minutes), 0)
  into v_total_consults_today, v_billed_minutes_today
  from public.consultation_sessions
  where astrologer_id = v_astrologer_id
    and status = 'ENDED'
    and (ended_at at time zone 'utc' at time zone p_timezone)::date = (pg_catalog.now() at time zone 'utc' at time zone p_timezone)::date;

  select pg_catalog.json_build_object(
    'todayGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone 'utc' at time zone p_timezone)::date = (pg_catalog.now() at time zone 'utc' at time zone p_timezone)::date), 0),
    'yesterdayGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone 'utc' at time zone p_timezone)::date = (pg_catalog.now() at time zone 'utc' at time zone p_timezone)::date - interval '1 day'), 0),
    'weekGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone 'utc' at time zone p_timezone) >= pg_catalog.date_trunc('week', pg_catalog.now() at time zone 'utc' at time zone p_timezone)), 0),
    'monthGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone 'utc' at time zone p_timezone) >= pg_catalog.date_trunc('month', pg_catalog.now() at time zone 'utc' at time zone p_timezone)), 0),
    'lifetimeGrossBilling', coalesce(sum(gross_amount), 0),
    'pendingSettlement', null,
    'withdrawableBalance', null,
    'processingPayout', null,
    'lastSettlementAt', null,
    'settlementSystemConfigured', false,
    'totalConsultsToday', v_total_consults_today,
    'billedMinutesToday', v_billed_minutes_today,
    'generatedAt', pg_catalog.now()
  ) into v_summary
  from public.astrologer_billing_ledger
  where astrologer_id = v_astrologer_id;

  return coalesce(v_summary, '{}'::json);
end;
$$;

-- Fix 5 and 6: Re-check finish_consultation_session and prevent duplicate end events
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
  v_auth_uid uuid := auth.uid();
begin
  -- Call the billing function as per original logic
  v_billing := public.bill_consultation_session(p_session_id);

  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;

  -- Authorization check: caller must be the user who started the session, or the assigned astrologer.
  if v_session.user_id <> v_auth_uid and not exists (
    select 1 from public.astrologers where id = v_session.astrologer_id and user_id = v_auth_uid
  ) then
    raise exception 'Unauthorized to finish this session';
  end if;

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

    -- Prevent duplicate events: only insert event when transitioning to ENDED
    insert into public.system_events(user_id, type, payload)
    values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));

    -- Insert into billing ledger
    if v_session.total_charged > 0 and v_session.astrologer_id is not null then
      insert into public.astrologer_billing_ledger (
        astrologer_id,
        consultation_id,
        gross_amount,
        astrologer_amount,
        company_amount,
        commission_rule_id,
        calculation_status,
        earned_at
      )
      values (
        v_session.astrologer_id,
        v_session.id,
        v_session.total_charged,
        null,
        null,
        null,
        'awaiting_commission',
        v_now
      )
      on conflict (consultation_id) do nothing;
    end if;
  end if;

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;
