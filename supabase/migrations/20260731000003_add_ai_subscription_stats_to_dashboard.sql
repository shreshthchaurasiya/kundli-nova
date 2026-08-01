-- Add AI Subscription Stats to Admin Dashboard

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
    
    -- AI Subscription Stats
    v_ai_subscription_revenue numeric;
    v_active_ai_subscriptions bigint;
    
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

    -- AI Subscriptions Stats
    SELECT COALESCE(SUM(amount), 0) INTO v_ai_subscription_revenue 
    FROM public.subscriptions 
    WHERE created_at >= p_from AND created_at < p_to;

    SELECT COUNT(*) INTO v_active_ai_subscriptions 
    FROM public.subscriptions 
    WHERE status = 'ACTIVE' AND plan != 'FREE';

    -- Payout & Withdrawals
    SELECT COUNT(*) INTO v_pending_payout_accounts FROM public.astrologer_payout_accounts WHERE status = 'PENDING';
    
    SELECT COUNT(*) INTO v_pending_withdrawals FROM public.astrologer_withdrawal_requests WHERE status = 'REQUESTED';
    SELECT COUNT(*) INTO v_processing_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('APPROVED', 'PROCESSING');
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_withdrawals_amount
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'PAID' AND processed_at >= p_from AND processed_at < p_to;

    SELECT COUNT(*) INTO v_failed_withdrawals
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'FAILED' AND processed_at >= p_from AND processed_at < p_to;

    -- Health Check
    SELECT COUNT(*) INTO v_negative_wallet_count
    FROM (
        SELECT user_id, SUM(CASE WHEN type = 'credit' THEN amount ELSE -amount END) as bal
        FROM public.wallet_transactions
        WHERE status = 'completed'
        GROUP BY user_id
    ) w WHERE w.bal < 0;

    SELECT COUNT(*) INTO v_missing_billing_ledger_count
    FROM public.consultation_sessions cs
    LEFT JOIN public.astrologer_billing_ledger abl ON cs.id = abl.consultation_id
    WHERE cs.status = 'ENDED' AND cs.charge_amount > 0 AND abl.id IS NULL;

    SELECT COUNT(*) INTO v_stale_active_consultation_count
    FROM public.consultation_sessions
    WHERE status = 'ACTIVE' AND started_at < (now() - interval '24 hours');

    -- Build Result JSON
    v_result := jsonb_build_object(
        'users', jsonb_build_object(
            'total', v_total_users
        ),
        'astrologers', jsonb_build_object(
            'total', v_total_astrologers,
            'online', v_online_astrologers
        ),
        'consultations', jsonb_build_object(
            'active', v_active_consultations,
            'completed', v_completed_consultations
        ),
        'reconciliation', jsonb_build_object(
            'successful_payment_count', v_successful_payment_count,
            'razorpay_payment_volume', v_razorpay_payment_volume,
            'wallet_recharge_volume', v_wallet_recharge_volume,
            'payment_wallet_mismatch_amount', v_payment_wallet_mismatch_amount,
            'payment_wallet_mismatch_count', v_payment_wallet_mismatch_count
        ),
        'billing', jsonb_build_object(
            'gross_billing', v_consultation_gross_billing,
            'company_revenue', v_company_commission_revenue,
            'astrologer_earnings', v_astrologer_earnings,
            'awaiting_commission', v_awaiting_commission_amount
        ),
        'ai_subscriptions', jsonb_build_object(
            'revenue', v_ai_subscription_revenue,
            'active_count', v_active_ai_subscriptions
        ),
        'payouts', jsonb_build_object(
            'pending_accounts', v_pending_payout_accounts,
            'pending_withdrawals', v_pending_withdrawals,
            'processing_withdrawals', v_processing_withdrawals,
            'paid_withdrawals_amount', v_paid_withdrawals_amount,
            'failed_withdrawals', v_failed_withdrawals
        ),
        'health', jsonb_build_object(
            'negative_wallets', v_negative_wallet_count,
            'missing_billing_ledgers', v_missing_billing_ledger_count,
            'stale_active_consultations', v_stale_active_consultation_count
        )
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
