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

  -- Subtract any requested/approved/processing/paid withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_active_withdrawal_amount
  FROM public.astrologer_withdrawal_requests
  WHERE astrologer_id = p_astrologer_id AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING', 'PAID');

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
