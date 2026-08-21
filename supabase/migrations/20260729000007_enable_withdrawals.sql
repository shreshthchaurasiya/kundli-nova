-- Enable actual withdrawal insertions
CREATE OR REPLACE FUNCTION public.request_my_withdrawal(p_amount numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_astrologer_id uuid;
  v_payout_account public.astrologer_payout_accounts;
  v_balance_calc json;
  v_active_withdrawal text;
  v_withdrawal_id uuid;
BEGIN
  -- 1. Authenticate and resolve astrologer
  select a.id into v_astrologer_id
  from public.astrologers a
  left join public.astrologer_applications app on a.application_id = app.id
  where a.user_id = auth.uid() 
    and (app.id is null or app.status = 'approved')
  for update of a; -- Lock astrologer row

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

  -- 5. Evaluate balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);
  
  if p_amount > (v_balance_calc->>'available_balance')::numeric then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'INSUFFICIENT_BALANCE');
  end if;

  -- 6. Insert REQUESTED
  insert into public.astrologer_withdrawal_requests (
    astrologer_id, payout_account_id, amount, currency, status, 
    payout_bank_name, payout_account_last4, requested_at
  ) values (
    v_astrologer_id, v_payout_account.id, p_amount, 'INR', 'REQUESTED',
    v_payout_account.bank_name, v_payout_account.account_number_last4, pg_catalog.now()
  ) returning id into v_withdrawal_id;

  return pg_catalog.jsonb_build_object('status', 'success', 'withdrawal_id', v_withdrawal_id);
END;
$$;
