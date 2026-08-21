-- 20260727160000_astrologer_withdrawals_and_statements.sql

-- 1. Withdrawal table
create table public.astrologer_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  astrologer_id uuid not null references public.astrologers(id) on delete restrict,
  payout_account_id uuid not null references public.astrologer_payout_accounts(id) on delete restrict,

  amount numeric(12,2) not null check (amount >= 200),
  currency text not null default 'INR' check (currency = 'INR'),
  
  status text not null check (status in ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'REJECTED', 'FAILED', 'CANCELLED')),

  payout_bank_name text not null,
  payout_account_last4 text not null check (length(payout_account_last4) = 4),

  rejection_reason text check (status <> 'REJECTED' or rejection_reason is not null),
  failure_reason text check (status <> 'FAILED' or failure_reason is not null),

  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  processing_at timestamptz,
  paid_at timestamptz check (status <> 'PAID' or paid_at is not null),
  paid_by uuid references auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id),
  failed_at timestamptz,

  payout_reference text check (status <> 'PAID' or payout_reference is not null),
  bank_reference text,
  admin_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial unique index for at most one unresolved request per astrologer
create unique index idx_unique_unresolved_withdrawal 
on public.astrologer_withdrawal_requests (astrologer_id) 
where status in ('REQUESTED', 'APPROVED', 'PROCESSING');

-- RLS and Grants
alter table public.astrologer_withdrawal_requests enable row level security;

create policy "Select own withdrawal requests" 
on public.astrologer_withdrawal_requests for select 
using (
  astrologer_id in (
    select id from public.astrologers where user_id = auth.uid()
  )
);

-- 2. Authoritative Withdrawable Balance Abstraction
create or replace function public.calculate_astrologer_withdrawable_balance(p_astrologer_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- For MVP, settlement is not configured.
  return pg_catalog.json_build_object(
    'is_configured', false,
    'available_balance', null,
    'reason', 'SETTLEMENT_NOT_CONFIGURED'
  );
end;
$$;

-- 3. Earnings Summary RPC
create or replace function public.get_my_earnings_payout_summary(p_timezone text default 'Asia/Kolkata')
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_summary json;
  v_today_gross numeric;
  v_yesterday_gross numeric;
  v_week_gross numeric;
  v_month_gross numeric;
  v_lifetime_gross numeric;
  v_local_now timestamp;
  v_today date;
  v_yesterday date;
  v_balance_calc json;
  v_active_withdrawal text;
  v_processing_payout numeric := 0;
begin
  -- Harden timezone handling
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  begin
    v_local_now := pg_catalog.now() at time zone p_timezone;
  exception when others then
    p_timezone := 'Asia/Kolkata';
    v_local_now := pg_catalog.now() at time zone p_timezone;
  end;

  v_today := v_local_now::date;
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

  -- Gross billing strictly from billing ledger joined with sessions for timezone anchoring
  select 
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_local_now)), 0),
    coalesce(sum(bl.gross_amount) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_local_now)), 0),
    coalesce(sum(bl.gross_amount), 0)
  into 
    v_today_gross,
    v_yesterday_gross,
    v_week_gross,
    v_month_gross,
    v_lifetime_gross
  from public.consultation_sessions cs
  left join public.astrologer_billing_ledger bl on cs.id = bl.consultation_id and bl.calculation_status <> 'reversed'
  where cs.astrologer_id = v_astrologer_id
    and cs.status = 'ENDED';

  -- Check for active withdrawal
  select status, amount into v_active_withdrawal, v_processing_payout
  from public.astrologer_withdrawal_requests
  where astrologer_id = v_astrologer_id
    and status in ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_processing_payout := coalesce(v_processing_payout, 0);

  -- Calculate withdrawable balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);

  select pg_catalog.json_build_object(
    'gross_billing_today', v_today_gross,
    'gross_billing_yesterday', v_yesterday_gross,
    'gross_billing_week', v_week_gross,
    'gross_billing_month', v_month_gross,
    'gross_billing_lifetime', v_lifetime_gross,
    
    'withdrawable_balance', (v_balance_calc->>'available_balance')::numeric,
    'pending_settlement', null,
    'processing_payout', v_processing_payout,
    'last_settlement_amount', null,
    'last_settlement_at', null,

    'can_request_withdrawal', false,
    'withdrawal_disabled_reason', v_balance_calc->>'reason',
    'minimum_withdrawal_amount', 200,
    'active_withdrawal_status', v_active_withdrawal
  ) into v_summary;

  return coalesce(v_summary, '{}'::json);
end;
$$;
-- 4. Withdrawal Request RPC
create or replace function public.request_my_withdrawal(p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_payout_account public.astrologer_payout_accounts;
  v_balance_calc json;
  v_active_withdrawal text;
begin
  -- 1. Authenticate and resolve astrologer
  select a.id into v_astrologer_id
  from public.astrologers a
  left join public.astrologer_applications app on a.application_id = app.id
  where a.user_id = auth.uid() 
    and (app.id is null or app.status = 'approved')
  for update; -- Lock astrologer row

  if not found then
    raise exception 'Unauthorized: Only approved astrologers can request withdrawals.';
  end if;

  -- 2. Validate amount >= 200
  if p_amount < 200 then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'MINIMUM_WITHDRAWAL_NOT_MET');
  end if;

  -- 3. Resolve payout account status
  select * into v_payout_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_MISSING');
  end if;

  if v_payout_account.status = 'PENDING' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_PENDING');
  end if;

  if v_payout_account.status = 'REJECTED' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_REJECTED');
  end if;

  if v_payout_account.status <> 'VERIFIED' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_NOT_VERIFIED');
  end if;

  -- 4. Detect active withdrawal
  select status into v_active_withdrawal
  from public.astrologer_withdrawal_requests
  where astrologer_id = v_astrologer_id
    and status in ('REQUESTED', 'APPROVED', 'PROCESSING')
  for update;

  if found then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'ACTIVE_WITHDRAWAL_EXISTS');
  end if;

  -- 5. Evaluate settlement configuration & balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);
  
  if not (v_balance_calc->>'is_configured')::boolean then
    return pg_catalog.jsonb_build_object(
      'status', 'error',
      'reason', coalesce(v_balance_calc->>'reason', 'SETTLEMENT_NOT_CONFIGURED'),
      'message', 'Withdrawal is not available yet because commission and settlement processing has not been configured.'
    );
  end if;

  if p_amount > (v_balance_calc->>'available_balance')::numeric then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'INSUFFICIENT_BALANCE');
  end if;

  -- 6. Insert REQUESTED
  -- This won't execute in MVP.
  return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'SETTLEMENT_NOT_CONFIGURED');
end;
$$;

-- 5. Withdrawal History RPC
create or replace function public.get_my_withdrawal_requests()
returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
begin
  select id into v_astrologer_id
  from public.astrologers
  where user_id = auth.uid();

  if not found then
    return;
  end if;

  return query
  select pg_catalog.jsonb_build_object(
    'id', id,
    'amount', amount,
    'currency', currency,
    'status', status,
    'requested_at', requested_at,
    'approved_at', approved_at,
    'processing_at', processing_at,
    'paid_at', paid_at,
    'rejected_at', rejected_at,
    'failed_at', failed_at,
    'payout_reference', payout_reference,
    'bank_reference', bank_reference,
    'rejection_reason', rejection_reason,
    'failure_reason', failure_reason,
    'payout_bank_name', payout_bank_name,
    'payout_account_last4', payout_account_last4
  )
  from public.astrologer_withdrawal_requests
  where astrologer_id = v_astrologer_id
  order by requested_at desc;
end;
$$;

-- 6. Payment Statements RPC
create or replace function public.get_my_payment_statements()
returns setof jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
begin
  select id into v_astrologer_id
  from public.astrologers
  where user_id = auth.uid();

  if not found then
    return;
  end if;

  return query
  with statements as (
    -- Consultation Branch
    select 
      bl.id as id,
      'CONSULTATION_BILLING' as entry_type,
      'Consultation with ' || coalesce(cs.customer_display_name, 'Customer') as title,
      cs.billed_minutes::text || ' minutes' as description,
      bl.gross_amount,
      bl.astrologer_amount,
      bl.company_amount,
      'Completed' as status,
      cs.id as consultation_id,
      cs.customer_display_name,
      cs.billed_minutes,
      cs.rate_per_minute,
      coalesce(cs.ended_at, bl.earned_at) as occurred_at
    from public.astrologer_billing_ledger bl
    join public.consultation_sessions cs on bl.consultation_id = cs.id
    where bl.astrologer_id = v_astrologer_id

    union all

    -- Withdrawal Branch
    select
      wr.id as id,
      'WITHDRAWAL_REQUEST' as entry_type,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then 'Withdrawal Request'
        when wr.status = 'PAID' then 'Payout to ' || wr.payout_bank_name || ' •••• ' || wr.payout_account_last4
        when wr.status = 'REJECTED' then 'Withdrawal Rejected'
        when wr.status = 'FAILED' then 'Payout Failed'
        else 'Withdrawal'
      end as title,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then '₹' || wr.amount::text || ' Reserved'
        when wr.status = 'PAID' then coalesce('Bank Ref: ' || wr.bank_reference, 'Paid')
        when wr.status = 'REJECTED' then coalesce(wr.rejection_reason, 'Rejected by admin')
        when wr.status = 'FAILED' then coalesce(wr.failure_reason, 'Failed to process')
        else wr.status
      end as description,
      wr.amount as gross_amount,
      null as astrologer_amount,
      null as company_amount,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then 'Requested'
        when wr.status = 'PAID' then 'Paid'
        when wr.status = 'REJECTED' then 'Rejected'
        when wr.status = 'FAILED' then 'Failed'
        else wr.status
      end as status,
      null as consultation_id,
      null as customer_display_name,
      null as billed_minutes,
      null as rate_per_minute,
      wr.requested_at as occurred_at
    from public.astrologer_withdrawal_requests wr
    where wr.astrologer_id = v_astrologer_id
  )
  select pg_catalog.jsonb_build_object(
    'id', id,
    'entry_type', entry_type,
    'title', title,
    'description', description,
    'gross_amount', gross_amount,
    'astrologer_amount', astrologer_amount,
    'company_amount', company_amount,
    'status', status,
    'consultation_id', consultation_id,
    'customer_display_name', customer_display_name,
    'billed_minutes', billed_minutes,
    'rate_per_minute', rate_per_minute,
    'occurred_at', occurred_at
  )
  from statements
  order by occurred_at desc;
end;
$$;

-- 7. Admin Transitions
-- Request -> Approved
create or replace function public.admin_approve_withdrawal(
  p_withdrawal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'REQUESTED' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'APPROVED', approved_at = now(), approved_by = auth.uid(), updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;

-- Request/Approved -> Rejected
create or replace function public.admin_reject_withdrawal(
  p_withdrawal_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Rejection reason is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status not in ('REQUESTED', 'APPROVED') then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'REJECTED', rejected_at = now(), rejected_by = auth.uid(), rejection_reason = p_reason, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;

-- Approved/Failed -> Processing
create or replace function public.admin_mark_withdrawal_processing(
  p_withdrawal_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status not in ('APPROVED', 'FAILED') then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'PROCESSING', processing_at = now(), updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;

-- Processing -> Paid
create or replace function public.admin_mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_payout_reference text,
  p_bank_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_payout_reference, '')) = '' then
    raise exception 'Payout reference is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'PROCESSING' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'PAID', paid_at = now(), paid_by = auth.uid(), payout_reference = p_payout_reference, bank_reference = p_bank_reference, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;

-- Processing -> Failed
create or replace function public.admin_mark_withdrawal_failed(
  p_withdrawal_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Failure reason is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'PROCESSING' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'FAILED', failed_at = now(), failure_reason = p_reason, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;

-- 8. Explicit Function Privilege Hardening
revoke execute on function public.get_my_earnings_payout_summary(text) from public;
grant execute on function public.get_my_earnings_payout_summary(text) to authenticated;

revoke execute on function public.request_my_withdrawal(numeric) from public;
grant execute on function public.request_my_withdrawal(numeric) to authenticated;

revoke execute on function public.get_my_withdrawal_requests() from public;
grant execute on function public.get_my_withdrawal_requests() to authenticated;

revoke execute on function public.get_my_payment_statements() from public;
grant execute on function public.get_my_payment_statements() to authenticated;

revoke execute on function public.admin_approve_withdrawal(uuid) from public;
grant execute on function public.admin_approve_withdrawal(uuid) to authenticated;

revoke execute on function public.admin_reject_withdrawal(uuid, text) from public;
grant execute on function public.admin_reject_withdrawal(uuid, text) to authenticated;

revoke execute on function public.admin_mark_withdrawal_processing(uuid) from public;
grant execute on function public.admin_mark_withdrawal_processing(uuid) to authenticated;

revoke execute on function public.admin_mark_withdrawal_paid(uuid, text, text) from public;
grant execute on function public.admin_mark_withdrawal_paid(uuid, text, text) to authenticated;

revoke execute on function public.admin_mark_withdrawal_failed(uuid, text) from public;
grant execute on function public.admin_mark_withdrawal_failed(uuid, text) to authenticated;

revoke execute on function public.calculate_astrologer_withdrawable_balance(uuid) from public;
grant execute on function public.calculate_astrologer_withdrawable_balance(uuid) to authenticated;
