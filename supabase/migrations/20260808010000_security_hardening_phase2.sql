-- Phase 2 Security Hardening Migration

-- 1. Revoke PUBLIC and anon EXECUTE from all remaining unsafe SECURITY DEFINER functions identified in the audit.
REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_failed(uuid, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_astrologer_application(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_astrologer_application(uuid, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.auto_assign_free_subscription() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.calculate_astrologer_withdrawable_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.deactivate_astrologer_commission_override(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_payments_summary() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_payments_summary(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_financial_ledger() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_astrologer_dashboard_summary(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_earnings_payout_summary(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_payment_statements() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_my_withdrawal_requests() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_pending_commission_ledger() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.process_commission_for_ledger(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_my_withdrawal(numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.save_payout_account(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_my_payout_account(text, text, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_astrologer_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_astrologer_application(uuid, text) FROM PUBLIC, anon;

-- 2. Revoke `authenticated` EXECUTE from internal/service-only functions
REVOKE EXECUTE ON FUNCTION public.calculate_astrologer_withdrawable_balance(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_commission_for_ledger(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_pending_commissions(integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_pending_commission_ledger() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_assign_free_subscription() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.save_payout_account(text, text, text, text) FROM authenticated;

-- Explicitly ensure ONLY service_role has access to internal utilities
GRANT EXECUTE ON FUNCTION public.calculate_astrologer_withdrawable_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_commission_for_ledger(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_pending_commissions(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_pending_commission_ledger() TO service_role;
GRANT EXECUTE ON FUNCTION public.auto_assign_free_subscription() TO service_role;
GRANT EXECUTE ON FUNCTION public.save_payout_account(text, text, text, text) TO service_role;

-- 3. Preserve authenticated access for legitimate self-service functions (Group B)
GRANT EXECUTE ON FUNCTION public.get_my_astrologer_dashboard_summary(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_earnings_payout_summary(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_payment_statements() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_my_withdrawal_requests() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_my_withdrawal(numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_my_payout_account(text, text, text, text) TO authenticated, service_role;

-- Preserve authenticated for admin functions (the vulnerable ones will be patched in step 4)
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_failed(uuid, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_astrologer_application(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.approve_astrologer_application(uuid, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.deactivate_astrologer_commission_override(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_payments_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_payments_summary(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_financial_ledger() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reject_astrologer_application(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_astrologer_status(uuid, text) TO authenticated, service_role;

-- 4. Fix the unprotected admin RPCs by injecting PERFORM public.assert_current_user_is_admin();

CREATE OR REPLACE FUNCTION public.get_admin_payments_summary()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_today_recharges numeric;
    v_today_failed integer;
    v_total_recharge_volume numeric;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_today_recharges
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited') AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata');

    SELECT COUNT(*) INTO v_today_failed
    FROM public.payment_orders
    WHERE status IN ('failed', 'cancelled') AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata');

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_total_recharge_volume
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited');

    RETURN jsonb_build_object(
        'today_recharges', v_today_recharges,
        'today_failed', v_today_failed,
        'total_recharge_volume', v_total_recharge_volume
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_payments_summary(p_time_filter text DEFAULT 'lifetime'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_successful_recharges numeric;
    v_failed_count integer;
    v_total_recharge_volume numeric;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_successful_recharges
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited')
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COUNT(*) INTO v_failed_count
    FROM public.payment_orders
    WHERE status IN ('failed', 'cancelled')
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_total_recharge_volume
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited');

    RETURN jsonb_build_object(
        'successful_recharges', v_successful_recharges,
        'failed_count', v_failed_count,
        'total_recharge_volume', v_total_recharge_volume
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_financial_ledger()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_total_recharges numeric;
    v_total_unspent_wallets numeric;
    v_ai_subscription_revenue numeric;
    v_company_commission numeric;
    v_astrologer_earnings numeric;
    v_total_paid_to_astrologers numeric;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- 1. Total Money In (Razorpay)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_recharges
    FROM public.wallet_transactions
    WHERE type = 'credit' AND status = 'completed';

    -- 2. Where is it? Unspent Wallets Liability
    SELECT COALESCE(SUM(balance), 0) INTO v_total_unspent_wallets
    FROM public.wallets;

    -- 3. Where is it? Company Revenue (AI Subscriptions)
    SELECT COALESCE(SUM(amount), 0) INTO v_ai_subscription_revenue
    FROM public.subscriptions
    WHERE status IN ('ACTIVE', 'EXPIRED', 'CANCELLED'); -- Total historical revenue

    -- 4. Where is it? Company Revenue (Consultation Commission)
    SELECT COALESCE(SUM(company_amount), 0) INTO v_company_commission
    FROM public.astrologer_billing_ledger
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

    -- 5. Where is it? Astrologer Earnings
    SELECT COALESCE(SUM(astrologer_amount), 0) INTO v_astrologer_earnings
    FROM public.astrologer_billing_ledger
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

    -- 6. Payouts (Money Out to Astrologers)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid_to_astrologers
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'PAID';

    RETURN jsonb_build_object(
        'money_in', jsonb_build_object(
            'total_recharges', v_total_recharges
        ),
        'liabilities', jsonb_build_object(
            'unspent_wallets', v_total_unspent_wallets,
            'astrologer_unpaid_earnings', GREATEST(v_astrologer_earnings - v_total_paid_to_astrologers, 0)
        ),
        'profit', jsonb_build_object(
            'ai_subscriptions', v_ai_subscription_revenue,
            'consultation_commission', v_company_commission,
            'total_company_profit', v_ai_subscription_revenue + v_company_commission
        ),
        'money_out', jsonb_build_object(
            'paid_to_astrologers', v_total_paid_to_astrologers
        )
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.reject_astrologer_application(p_application_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_app public.astrologer_applications%ROWTYPE;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    SELECT * INTO v_app FROM public.astrologer_applications WHERE id = p_application_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    IF v_app.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not pending';
    END IF;

    UPDATE public.astrologer_applications
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_application_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.toggle_astrologer_status(p_astrologer_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    UPDATE public.astrologers
    SET status = p_status
    WHERE id = p_astrologer_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_mark_withdrawal_failed(p_withdrawal_id uuid, p_failure_reason text, p_payout_reference text DEFAULT NULL::text, p_bank_reference text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

-- 5. Add SET search_path = '' to the 10 verified-compatible functions

ALTER FUNCTION public.get_admin_subscription_stats() SET search_path = '';
ALTER FUNCTION public.severity_rank(text) SET search_path = '';
ALTER FUNCTION public.auto_assign_free_subscription() SET search_path = '';
ALTER FUNCTION public.admin_create_subscription_plan(text, text, numeric, integer, jsonb, boolean) SET search_path = '';
ALTER FUNCTION public.admin_update_subscription_plan(uuid, text, text, numeric, integer, jsonb, boolean, boolean) SET search_path = '';
ALTER FUNCTION public.get_financial_ledger() SET search_path = '';
ALTER FUNCTION public.get_admin_dashboard_summary(timestamp with time zone, timestamp with time zone, text) SET search_path = '';
ALTER FUNCTION public.get_admin_subscriptions(jsonb, integer, integer) SET search_path = '';
ALTER FUNCTION public.get_admin_subscription_plans() SET search_path = '';
ALTER FUNCTION public.process_razorpay_subscription(uuid, text, numeric, integer, text, text) SET search_path = '';
