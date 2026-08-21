-- Add consultations and billed minutes to the summary
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
  -- Resolve currently authenticated astrologer internally
  select id into v_astrologer_id
  from public.astrologers
  where user_id = auth.uid() and is_published = true;

  if not found then
    raise exception 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  end if;

  -- Validate timezone (fallback if invalid)
  begin
    perform pg_catalog.now() at time zone p_timezone;
  exception when others then
    p_timezone := 'Asia/Kolkata';
  end;

  select count(id), coalesce(sum(billed_minutes), 0)
  into v_total_consults_today, v_billed_minutes_today
  from public.consultation_sessions
  where astrologer_id = v_astrologer_id
    and status = 'ENDED'
    and (ended_at at time zone p_timezone)::date = (pg_catalog.now() at time zone p_timezone)::date;

  select pg_catalog.json_build_object(
    'todayGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone p_timezone)::date = (pg_catalog.now() at time zone p_timezone)::date), 0),
    'yesterdayGrossBilling', coalesce(sum(gross_amount) filter (where (earned_at at time zone p_timezone)::date = (pg_catalog.now() at time zone p_timezone)::date - 1), 0),
    'weekGrossBilling', coalesce(sum(gross_amount) filter (where date_trunc('week', earned_at at time zone p_timezone)::date = date_trunc('week', pg_catalog.now() at time zone p_timezone)::date), 0),
    'monthGrossBilling', coalesce(sum(gross_amount) filter (where date_trunc('month', earned_at at time zone p_timezone)::date = date_trunc('month', pg_catalog.now() at time zone p_timezone)::date), 0),
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
  where astrologer_id = v_astrologer_id
    and calculation_status != 'reversed';

  return v_summary;
end;
$$;
