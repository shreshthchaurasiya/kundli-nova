-- Dedicated RPC for the new Financial Ledger view
-- This returns strict sums directly from tables to provide a completely accurate picture 
-- of money flow, ensuring no disruption to existing dashboard queries.

CREATE OR REPLACE FUNCTION public.get_financial_ledger()
RETURNS jsonb AS $$
DECLARE
    v_total_recharges numeric;
    v_total_unspent_wallets numeric;
    v_ai_subscription_revenue numeric;
    v_company_commission numeric;
    v_astrologer_earnings numeric;
    v_total_paid_to_astrologers numeric;
BEGIN
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
    SELECT COALESCE(SUM(platform_share), 0) INTO v_company_commission
    FROM public.astrologer_billing_ledger
    WHERE status IN ('active', 'completed');

    -- 5. Where is it? Astrologer Earnings
    SELECT COALESCE(SUM(astrologer_share), 0) INTO v_astrologer_earnings
    FROM public.astrologer_billing_ledger
    WHERE status IN ('active', 'completed');

    -- 6. Payouts (Money Out to Astrologers)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid_to_astrologers
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'paid';

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
