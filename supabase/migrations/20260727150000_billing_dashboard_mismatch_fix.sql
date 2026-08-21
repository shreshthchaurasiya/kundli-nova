-- 20260727150000_billing_dashboard_mismatch_fix.sql

-- 1. Fix finish_consultation_session to ALWAYS insert the ledger row if missing
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

    -- Prevent duplicate events: only insert event when transitioning to ENDED
    insert into public.system_events(user_id, type, payload)
    values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));
  else
    -- Session was already ended (e.g. by bill_consultation_session)
    -- We still want to ensure billing records exist, but skip duplicate system events.
    v_billing := pg_catalog.jsonb_build_object('status', 'already_ended', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  -- Ensure ledger row exists for any ENDED session with charges
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
      coalesce(v_session.ended_at, v_now)
    )
    on conflict (consultation_id) do nothing;
  end if;

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;


-- 2. Safe Backfill for missing ledger records
insert into public.astrologer_billing_ledger (
  astrologer_id,
  consultation_id,
  gross_amount,
  calculation_status,
  earned_at
)
select 
  cs.astrologer_id,
  cs.id,
  cs.total_charged,
  'awaiting_commission',
  cs.ended_at
from public.consultation_sessions cs
left join public.astrologer_billing_ledger bl on cs.id = bl.consultation_id
where cs.status = 'ENDED' 
  and cs.total_charged > 0 
  and cs.astrologer_id is not null
  and bl.id is null
on conflict (consultation_id) do nothing;


-- 3. Unified Dashboard RPC based on consultation_sessions ended_at
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
  v_today_gross numeric;
  v_yesterday_gross numeric;
  v_week_gross numeric;
  v_month_gross numeric;
  v_lifetime_gross numeric;
  v_now_tz timestamptz;
  v_today date;
  v_yesterday date;
begin
  -- Harden timezone handling
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  begin
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  exception when others then
    p_timezone := 'Asia/Kolkata';
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  end;

  v_today := v_now_tz::date;
  v_yesterday := v_today - interval '1 day';

  -- Resolve currently authenticated astrologer internally with actual approval check
  select a.id into v_astrologer_id
  from public.astrologers a
  left join public.astrologer_applications app on a.application_id = app.id
  where a.user_id = auth.uid() 
    and (app.id is null or app.status = 'approved');

  if not found then
    raise exception 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  end if;

  -- Unified query joining consultation_sessions with astrologer_billing_ledger
  select 
    count(cs.id), 
    coalesce(sum(cs.billed_minutes), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_now_tz)), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_now_tz)), 0),
    coalesce(sum(bl.gross_amount), 0)
  into 
    v_total_consults_today, 
    v_billed_minutes_today,
    v_today_gross,
    v_yesterday_gross,
    v_week_gross,
    v_month_gross,
    v_lifetime_gross
  from public.consultation_sessions cs
  left join public.astrologer_billing_ledger bl on cs.id = bl.consultation_id and bl.calculation_status <> 'reversed'
  where cs.astrologer_id = v_astrologer_id
    and cs.status = 'ENDED';

  select pg_catalog.json_build_object(
    'todayGrossBilling', v_today_gross,
    'yesterdayGrossBilling', v_yesterday_gross,
    'weekGrossBilling', v_week_gross,
    'monthGrossBilling', v_month_gross,
    'lifetimeGrossBilling', v_lifetime_gross,
    'pendingSettlement', null,
    'withdrawableBalance', null,
    'processingPayout', null,
    'lastSettlementAt', null,
    'settlementSystemConfigured', false,
    'totalConsultsToday', v_total_consults_today,
    'billedMinutesToday', v_billed_minutes_today,
    'generatedAt', pg_catalog.now()
  ) into v_summary;

  return coalesce(v_summary, '{}'::json);
end;
$$;
