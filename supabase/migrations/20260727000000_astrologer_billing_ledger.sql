-- 1. Create the billing ledger table
create table public.astrologer_billing_ledger (
  id uuid primary key default gen_random_uuid(),
  astrologer_id uuid not null references public.astrologers(id) on delete cascade,
  consultation_id uuid not null references public.consultation_sessions(id) on delete restrict unique,
  gross_amount numeric(10,2) not null check (gross_amount >= 0),
  astrologer_amount numeric(10,2) check (astrologer_amount is null or astrologer_amount >= 0),
  company_amount numeric(10,2) check (company_amount is null or company_amount >= 0),
  commission_rule_id uuid,
  calculation_status text not null default 'awaiting_commission' check (
    calculation_status in (
      'awaiting_commission',
      'calculated',
      'withdrawable',
      'processing',
      'settled',
      'reversed'
    )
  ),
  earned_at timestamptz not null default timezone('utc'::text, now()),
  available_at timestamptz,
  settled_at timestamptz,
  payout_reference text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

-- 2. Add Indexes
create index idx_astrologer_billing_ledger_astrologer_earned_at on public.astrologer_billing_ledger(astrologer_id, earned_at);
create index idx_astrologer_billing_ledger_astrologer_status on public.astrologer_billing_ledger(astrologer_id, calculation_status);

-- 3. Enable RLS
alter table public.astrologer_billing_ledger enable row level security;

create policy "Select billing ledger" 
on public.astrologer_billing_ledger for select 
using (
  astrologer_id in (
    select id from public.astrologers where user_id = auth.uid()
  )
);

-- 4. Replace finish_consultation_session to insert into ledger
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

  insert into public.system_events(user_id, type, payload)
  values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;

-- 5. Create RPC for Dashboard Summary
create or replace function public.get_my_astrologer_dashboard_summary(p_timezone text default 'Asia/Kolkata')
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_summary json;
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
    'generatedAt', pg_catalog.now()
  ) into v_summary
  from public.astrologer_billing_ledger
  where astrologer_id = v_astrologer_id
    and calculation_status != 'reversed';

  return v_summary;
end;
$$;

grant execute on function public.get_my_astrologer_dashboard_summary(text) to authenticated;
