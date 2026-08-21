-- ===================================================================
-- FIX: Astrologer Earnings & Withdrawable Balance
-- 1. Fix calculate_astrologer_withdrawable_balance to include 'calculated', 'withdrawable', 'settled'
-- 2. Update get_my_astrologer_dashboard_summary to return astrologer net earnings
-- ===================================================================

DROP FUNCTION IF EXISTS public.calculate_astrologer_withdrawable_balance(uuid);

-- 1. Fix Withdrawable Balance Calculation
CREATE OR REPLACE FUNCTION public.calculate_astrologer_withdrawable_balance(p_astrologer_id uuid)
RETURNS json AS $$
DECLARE
  v_withdrawable_total numeric;
  v_active_withdrawal_amount numeric;
  v_available numeric;
BEGIN
  -- Sum up calculated, withdrawable, settled, and awaiting_commission earnings for this astrologer
  SELECT COALESCE(SUM(COALESCE(astrologer_amount, gross_amount * 0.60)), 0) INTO v_withdrawable_total
  FROM public.astrologer_billing_ledger
  WHERE astrologer_id = p_astrologer_id 
    AND calculation_status IN ('calculated', 'withdrawable', 'settled', 'awaiting_commission');

  -- Subtract any requested/approved/processing withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_active_withdrawal_amount
  FROM public.astrologer_withdrawal_requests
  WHERE astrologer_id = p_astrologer_id AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_available := v_withdrawable_total - v_active_withdrawal_amount;
  IF v_available < 0 THEN
      v_available := 0;
  END IF;

  RETURN pg_catalog.json_build_object(
    'is_configured', true,
    'available_balance', v_available,
    'reason', CASE WHEN v_available < 200 THEN 'INSUFFICIENT_BALANCE' ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';


-- 2. Update get_my_astrologer_dashboard_summary to calculate Astrologer Net Income
CREATE OR REPLACE FUNCTION public.get_my_astrologer_dashboard_summary(p_timezone text DEFAULT 'Asia/Kolkata')
RETURNS json AS $$
DECLARE
  v_astrologer_id uuid;
  v_summary json;
  
  v_total_consults_today bigint;
  v_billed_minutes_today numeric;
  v_today_income numeric;
  v_yesterday_income numeric;
  v_week_income numeric;
  v_month_income numeric;
  v_lifetime_income numeric;
  v_now_tz timestamptz;
  v_today date;
  v_yesterday date;
  v_balance_calc json;
BEGIN
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  BEGIN
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  EXCEPTION WHEN OTHERS THEN
    p_timezone := 'Asia/Kolkata';
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  END;

  v_today := v_now_tz::date;
  v_yesterday := v_today - interval '1 day';

  -- Resolve authenticated astrologer
  SELECT a.id INTO v_astrologer_id
  FROM public.astrologers a
  LEFT JOIN public.astrologer_applications app ON a.application_id = app.id
  WHERE a.user_id = auth.uid() 
    AND (app.id IS NULL OR app.status = 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  END IF;

  -- Calculate Astrologer Net Earnings (astrologer_amount) instead of gross billing
  SELECT 
    count(cs.id), 
    coalesce(sum(cs.billed_minutes), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_now_tz)), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_now_tz)), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)), 0)
  INTO 
    v_total_consults_today, 
    v_billed_minutes_today,
    v_today_income,
    v_yesterday_income,
    v_week_income,
    v_month_income,
    v_lifetime_income
  FROM public.consultation_sessions cs
  LEFT JOIN public.astrologer_billing_ledger bl ON cs.id = bl.consultation_id and bl.calculation_status <> 'reversed'
  WHERE cs.astrologer_id = v_astrologer_id
    AND cs.status = 'ENDED';

  -- Calculate withdrawable balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);

  SELECT pg_catalog.json_build_object(
    'todayGrossBilling', v_today_income,
    'yesterdayGrossBilling', v_yesterday_income,
    'weekGrossBilling', v_week_income,
    'monthGrossBilling', v_month_income,
    'lifetimeGrossBilling', v_lifetime_income,
    'pendingSettlement', null,
    'withdrawableBalance', (v_balance_calc->>'available_balance')::numeric,
    'processingPayout', null,
    'lastSettlementAt', null,
    'settlementSystemConfigured', true,
    'totalConsultsToday', v_total_consults_today,
    'billedMinutesToday', v_billed_minutes_today,
    'generatedAt', pg_catalog.now()
  ) INTO v_summary;

  RETURN coalesce(v_summary, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
