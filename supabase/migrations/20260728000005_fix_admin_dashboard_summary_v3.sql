DROP FUNCTION IF EXISTS public.get_admin_dashboard_summary(timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.get_admin_dashboard_summary();

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary(
    p_from timestamptz DEFAULT '2000-01-01'::timestamptz,
    p_to timestamptz DEFAULT '2100-01-01'::timestamptz,
    p_timezone text DEFAULT 'Asia/Kolkata'
)
RETURNS jsonb AS $$
DECLARE
    v_total_users bigint;
    v_total_astrologers bigint;
    v_online_astrologers bigint;
    v_active_consultations bigint;
    v_completed_consultations bigint;
    
    v_total_revenue numeric;
    v_total_recharges numeric;
    v_today_recharges numeric;
    
    v_successful_payment_count bigint;
    v_razorpay_payment_volume numeric;
    v_wallet_recharge_volume numeric;
    v_payment_wallet_mismatch_amount numeric;
    v_payment_wallet_mismatch_count bigint;

    v_consultation_gross_billing numeric;
    v_company_commission_revenue numeric;
    v_astrologer_earnings numeric;
    v_awaiting_commission_amount numeric;

    v_pending_payout_accounts bigint;
    v_pending_withdrawals bigint;
    v_processing_withdrawals bigint;
    v_paid_withdrawals_amount numeric;
    v_failed_withdrawals bigint;

    v_negative_wallet_count bigint;
    v_missing_billing_ledger_count bigint;
    v_stale_active_consultation_count bigint;
    v_result jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- User Stats
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_total_astrologers FROM public.astrologers;
    SELECT COUNT(*) INTO v_online_astrologers FROM public.astrologers WHERE status = 'ONLINE';

    -- Consultation Stats
    SELECT COUNT(*) INTO v_active_consultations FROM public.consultation_sessions WHERE status IN ('WAITING_FOR_ASTROLOGER', 'ACTIVE');
    SELECT COUNT(*) INTO v_completed_consultations FROM public.consultation_sessions WHERE status = 'ENDED' AND ended_at >= p_from AND ended_at < p_to;

    -- Financial Totals
    SELECT COALESCE(SUM(amount), 0) INTO v_total_recharges FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge';
    SELECT COALESCE(SUM(amount), 0) INTO v_today_recharges FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge' AND created_at >= p_from AND created_at < p_to;

    -- Reconciliation
    SELECT COUNT(*) INTO v_successful_payment_count FROM public.payment_orders WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to;
    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_razorpay_payment_volume FROM public.payment_orders WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to;
    SELECT COALESCE(SUM(amount), 0) INTO v_wallet_recharge_volume FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge' AND created_at >= p_from AND created_at < p_to;
    
    SELECT 
        COALESCE(SUM(po.amount_paise / 100.0), 0),
        COUNT(po.id)
    INTO 
        v_payment_wallet_mismatch_amount,
        v_payment_wallet_mismatch_count
    FROM public.payment_orders po
    LEFT JOIN public.wallet_transactions w 
        ON w.reference_id = po.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
    WHERE po.status IN ('captured', 'credited') 
      AND w.id IS NULL
      AND po.created_at >= p_from AND po.created_at < p_to;

    -- Billing Ledger (Using earned_at instead of created_at)
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(company_amount), 0),
        COALESCE(SUM(astrologer_amount), 0)
    INTO 
        v_consultation_gross_billing,
        v_company_commission_revenue,
        v_astrologer_earnings
    FROM public.astrologer_billing_ledger
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
      AND earned_at >= p_from AND earned_at < p_to;

    SELECT COALESCE(SUM(gross_amount), 0) INTO v_awaiting_commission_amount
    FROM public.astrologer_billing_ledger
    WHERE calculation_status = 'awaiting_commission'
      AND earned_at >= p_from AND earned_at < p_to;

    -- Payout & Withdrawals
    SELECT COUNT(*) INTO v_pending_payout_accounts FROM public.astrologer_payout_accounts WHERE status = 'PENDING';
    
    SELECT COUNT(*) INTO v_pending_withdrawals FROM public.astrologer_withdrawal_requests WHERE status = 'REQUESTED';
    SELECT COUNT(*) INTO v_processing_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('APPROVED', 'PROCESSING');
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_withdrawals_amount
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'PAID' AND paid_at >= p_from AND paid_at < p_to;

    SELECT COUNT(*) INTO v_failed_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('REJECTED', 'FAILED');

    -- Operational Anomalies
    SELECT COUNT(*) INTO v_negative_wallet_count FROM public.wallets WHERE balance < 0;

    -- Build Result JSON
    -- Keeping same return schema as before but adding mapping for compatibility
    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'total_astrologers', v_total_astrologers,
        'online_astrologers', v_online_astrologers,
        'active_consultations', v_active_consultations,
        'completed_consultations', v_completed_consultations,

        'successful_payment_count', v_successful_payment_count,
        'razorpay_payment_volume', v_razorpay_payment_volume,
        'wallet_recharge_volume', v_wallet_recharge_volume,
        'payment_wallet_mismatch_amount', v_payment_wallet_mismatch_amount,
        'payment_wallet_mismatch_count', v_payment_wallet_mismatch_count,

        'consultation_gross_billing', v_consultation_gross_billing,
        'company_commission_revenue', v_company_commission_revenue,
        'astrologer_earnings', v_astrologer_earnings,
        'awaiting_commission_amount', v_awaiting_commission_amount,

        'pending_payout_accounts', v_pending_payout_accounts,
        'pending_withdrawals', v_pending_withdrawals,
        'processing_withdrawals', v_processing_withdrawals,
        'paid_withdrawals_amount', v_paid_withdrawals_amount,
        'failed_withdrawals', v_failed_withdrawals,

        'negative_wallet_count', v_negative_wallet_count,
        'missing_billing_ledger_count', v_missing_billing_ledger_count,
        'stale_active_consultation_count', v_stale_active_consultation_count,
        
        -- Aliases for AdminDashboardScreen compatibility
        'total_revenue', v_total_recharges,
        'total_recharges', v_total_recharges,
        'today_recharges', v_today_recharges,
        'gross_billing', v_consultation_gross_billing,
        'company_revenue', v_company_commission_revenue,
        'awaiting_commission', v_awaiting_commission_amount
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_summary(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary(timestamptz, timestamptz, text) TO authenticated;
