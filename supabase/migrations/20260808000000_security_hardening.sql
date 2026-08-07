-- 20260808000000_security_hardening.sql

-- ==========================================
-- 1. P0 - Admin Authorization
-- ==========================================
CREATE OR REPLACE FUNCTION public.assert_current_user_is_admin()
RETURNS void AS $$
DECLARE
    v_role text;
BEGIN
    SELECT role INTO v_role 
    FROM public.account_roles 
    WHERE user_id = auth.uid();
    
    IF v_role IS NULL OR v_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: Requires admin privileges';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.assert_current_user_is_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assert_current_user_is_admin() TO authenticated, service_role;


-- ==========================================
-- 2. P0 - Security Definer Execute Grants
-- ==========================================

-- Admin Withdrawals
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_processing(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_processing(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_paid(uuid, text, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_mark_withdrawal_failed(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_withdrawal_failed(uuid, text) TO authenticated, service_role;

-- Admin Payout
REVOKE EXECUTE ON FUNCTION public.admin_verify_payout_account(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_payout_account(uuid, text, text) TO authenticated, service_role;

-- Admin Subscriptions
REVOKE EXECUTE ON FUNCTION public.admin_create_subscription_plan(text, text, numeric, integer, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_subscription_plan(text, text, numeric, integer, jsonb, boolean) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.admin_update_subscription_plan(uuid, text, text, numeric, integer, jsonb, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_subscription_plan(uuid, text, text, numeric, integer, jsonb, boolean, boolean) TO authenticated, service_role;

-- Other Admin functions
DO $$ 
DECLARE
  v_func text;
BEGIN
  FOR v_func IN (SELECT proname FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND (proname LIKE 'get_admin_%' OR proname LIKE 'approve_%' OR proname LIKE 'reject_%' OR proname LIKE 'set_%' OR proname LIKE 'process_pending_%')) LOOP
    BEGIN
      EXECUTE 'REVOKE EXECUTE ON FUNCTION public.' || quote_ident(v_func) || ' FROM PUBLIC, anon, authenticated';
      EXECUTE 'GRANT EXECUTE ON FUNCTION public.' || quote_ident(v_func) || ' TO authenticated, service_role';
    EXCEPTION WHEN OTHERS THEN
      -- Ignore if function signature missing or complex
    END;
  END LOOP;
END $$;


-- ==========================================
-- 3. P0 - Wallet Security (admin_adjust_wallet)
-- ==========================================
CREATE OR REPLACE FUNCTION public.admin_adjust_wallet(
    p_user_email text,
    p_amount numeric,
    p_title text,
    p_description text
) RETURNS jsonb AS $$
DECLARE
    v_user_id uuid;
    v_old_balance numeric;
    v_new_balance numeric;
    v_txn_id uuid;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- lock wallet
    SELECT balance INTO v_old_balance FROM public.wallets WHERE user_id = v_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    v_new_balance := v_old_balance + p_amount;
    
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Wallet balance cannot be negative';
    END IF;

    UPDATE public.wallets SET balance = v_new_balance WHERE user_id = v_user_id;

    INSERT INTO public.wallet_transactions (
        user_id, amount, type, title, description, balance_after
    ) VALUES (
        v_user_id, p_amount, 
        CASE WHEN p_amount >= 0 THEN 'CREDIT' ELSE 'DEBIT' END, 
        p_title, p_description, v_new_balance
    ) RETURNING id INTO v_txn_id;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_balance,
        'transaction_id', v_txn_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_adjust_wallet(text, numeric, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_wallet(text, numeric, text, text) TO authenticated, service_role;


-- ==========================================
-- 4. P0 - Subscriptions Security
-- ==========================================
REVOKE EXECUTE ON FUNCTION public.process_razorpay_subscription(uuid, text, numeric, integer, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_razorpay_subscription(uuid, text, numeric, integer, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.upgrade_subscription_wallet(
    p_user_id uuid, 
    p_plan text,
    p_amount numeric, 
    p_duration_months integer 
) RETURNS jsonb AS $$
DECLARE
    v_real_user_id uuid;
    v_plan_id text;
    v_price numeric;
    v_duration integer;
    v_features jsonb;
    v_old_balance numeric;
    v_new_balance numeric;
    v_sub_id uuid;
BEGIN
    IF auth.role() = 'service_role' THEN
        v_real_user_id := p_user_id;
    ELSE
        v_real_user_id := auth.uid();
        IF v_real_user_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized';
        END IF;
    END IF;

    SELECT id, price_inr, duration_months, features 
    INTO v_plan_id, v_price, v_duration, v_features
    FROM public.subscription_plans 
    WHERE id = p_plan AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive subscription plan';
    END IF;

    SELECT balance INTO v_old_balance FROM public.wallets WHERE user_id = v_real_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_old_balance < v_price THEN
        RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;

    v_new_balance := v_old_balance - v_price;
    UPDATE public.wallets SET balance = v_new_balance WHERE user_id = v_real_user_id;

    INSERT INTO public.wallet_transactions (
        user_id, amount, type, title, description, balance_after
    ) VALUES (
        v_real_user_id, -v_price, 'DEBIT', 'Subscription Upgrade', 'Paid for ' || v_plan_id || ' plan', v_new_balance
    );

    INSERT INTO public.subscriptions (
        user_id, plan_id, status, current_period_start, current_period_end, features, payment_method
    ) VALUES (
        v_real_user_id, v_plan_id, 'active', now(), now() + (v_duration || ' months')::interval, v_features, 'wallet'
    ) RETURNING id INTO v_sub_id;

    RETURN jsonb_build_object('success', true, 'subscription_id', v_sub_id, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.upgrade_subscription_wallet(uuid, text, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upgrade_subscription_wallet(uuid, text, numeric, integer) TO authenticated, service_role;


-- ==========================================
-- 5. P0 - Consultation Session Auth
-- ==========================================
-- Backend edge functions/server use service_role. 
-- We ensure clients cannot freely call this on behalf of other users.
REVOKE EXECUTE ON FUNCTION public.create_consultation_session(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_consultation_session(uuid, uuid, uuid) TO service_role;


-- ==========================================
-- 6. P0 - Broken RLS Service Role Policies
-- ==========================================
-- ai_chat_sessions
DROP POLICY IF EXISTS "Service role full access on ai chat sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can manage their own ai chat sessions" ON public.ai_chat_sessions;

CREATE POLICY "Users can manage their own ai chat sessions" 
ON public.ai_chat_sessions FOR ALL 
TO authenticated 
USING (user_id = (select auth.uid()))
WITH CHECK (user_id = (select auth.uid()));

-- daily_transit_cache
DROP POLICY IF EXISTS "Service role full access on transit_cache" ON public.daily_transit_cache;
DROP POLICY IF EXISTS "Users can view their own transit cache" ON public.daily_transit_cache;
DROP POLICY IF EXISTS "Users can manage their own transit cache" ON public.daily_transit_cache;

CREATE POLICY "Users can view their own transit cache"
ON public.daily_transit_cache
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.kundli_profiles kp
    WHERE kp.id = daily_transit_cache.profile_id
      AND kp.owner_id = (SELECT auth.uid())
  )
);


-- ==========================================
-- 7. P1 - Indexes (Performance & Integrity)
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_astrologer_comm_override_astrologer ON public.astrologer_commission_overrides(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_astrologer_payout_verified_by ON public.astrologer_payout_accounts(verified_by);
CREATE INDEX IF NOT EXISTS idx_consultation_astrologer_notes_astrologer ON public.consultation_astrologer_notes(astrologer_id);
CREATE INDEX IF NOT EXISTS idx_consultation_sessions_kundli_profile ON public.consultation_sessions(kundli_profile_id);
CREATE INDEX IF NOT EXISTS idx_kundli_matching_boy ON public.kundli_matching_reports(boy_profile_id);
CREATE INDEX IF NOT EXISTS idx_kundli_matching_girl ON public.kundli_matching_reports(girl_profile_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_subscription ON public.subscription_payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_user ON public.subscription_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_system_events_user ON public.system_events(user_id);
