-- Fix admin withdrawal transitions to use assert_current_user_is_admin()

-- 1. Approve
CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(p_withdrawal_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_withdrawal public.astrologer_withdrawal_requests;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  SELECT * INTO v_withdrawal
  FROM public.astrologer_withdrawal_requests
  WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_withdrawal.status != 'REQUESTED' THEN RAISE EXCEPTION 'Invalid transition'; END IF;

  UPDATE public.astrologer_withdrawal_requests
  SET status = 'APPROVED', approved_at = now(), approved_by = auth.uid(), updated_at = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_withdrawal;

  RETURN pg_catalog.to_jsonb(v_withdrawal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 2. Reject
CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(p_withdrawal_id uuid, p_reason text)
RETURNS jsonb AS $$
DECLARE
  v_withdrawal public.astrologer_withdrawal_requests;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  IF TRIM(COALESCE(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.astrologer_withdrawal_requests
  WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_withdrawal.status NOT IN ('REQUESTED', 'APPROVED') THEN RAISE EXCEPTION 'Invalid transition'; END IF;

  UPDATE public.astrologer_withdrawal_requests
  SET status = 'REJECTED', rejected_at = now(), rejected_by = auth.uid(), rejection_reason = p_reason, updated_at = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_withdrawal;

  RETURN pg_catalog.to_jsonb(v_withdrawal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 3. Processing
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_processing(p_withdrawal_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_withdrawal public.astrologer_withdrawal_requests;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  SELECT * INTO v_withdrawal
  FROM public.astrologer_withdrawal_requests
  WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_withdrawal.status NOT IN ('APPROVED', 'FAILED') THEN RAISE EXCEPTION 'Invalid transition'; END IF;

  UPDATE public.astrologer_withdrawal_requests
  SET status = 'PROCESSING', processing_at = now(), updated_at = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_withdrawal;

  RETURN pg_catalog.to_jsonb(v_withdrawal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 4. Paid
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_paid(
  p_withdrawal_id uuid,
  p_payout_reference text,
  p_bank_reference text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_withdrawal public.astrologer_withdrawal_requests;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  IF TRIM(COALESCE(p_payout_reference, '')) = '' THEN
    RAISE EXCEPTION 'Payout reference is required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.astrologer_withdrawal_requests
  WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_withdrawal.status != 'PROCESSING' THEN RAISE EXCEPTION 'Invalid transition'; END IF;

  UPDATE public.astrologer_withdrawal_requests
  SET status = 'PAID', paid_at = now(), payout_reference = p_payout_reference, bank_reference = p_bank_reference, updated_at = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_withdrawal;

  RETURN pg_catalog.to_jsonb(v_withdrawal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- 5. Failed
CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_failed(
  p_withdrawal_id uuid,
  p_failure_reason text,
  p_payout_reference text DEFAULT NULL,
  p_bank_reference text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_withdrawal public.astrologer_withdrawal_requests;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  IF TRIM(COALESCE(p_failure_reason, '')) = '' THEN
    RAISE EXCEPTION 'Failure reason is required';
  END IF;

  SELECT * INTO v_withdrawal
  FROM public.astrologer_withdrawal_requests
  WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  IF v_withdrawal.status != 'PROCESSING' THEN RAISE EXCEPTION 'Invalid transition'; END IF;

  UPDATE public.astrologer_withdrawal_requests
  SET status = 'FAILED', failed_at = now(), failure_reason = p_failure_reason, payout_reference = COALESCE(p_payout_reference, payout_reference), bank_reference = COALESCE(p_bank_reference, bank_reference), updated_at = now()
  WHERE id = p_withdrawal_id RETURNING * INTO v_withdrawal;

  RETURN pg_catalog.to_jsonb(v_withdrawal);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
