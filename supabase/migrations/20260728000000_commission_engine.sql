-- ==========================================
-- PHASE 3: PRODUCTION COMMISSION ENGINE
-- ==========================================

-- 1. Schema Additions
ALTER TABLE public.astrologer_billing_ledger
  ADD COLUMN IF NOT EXISTS company_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS astrologer_percentage numeric(5,2),
  ADD COLUMN IF NOT EXISTS commission_source text,
  ADD COLUMN IF NOT EXISTS commission_calculated_at timestamptz;

ALTER TABLE public.commission_rules
  ADD CONSTRAINT chk_commission_rules_sum CHECK (company_percentage + astrologer_percentage = 100);

ALTER TABLE public.astrologer_commission_overrides
  ADD CONSTRAINT chk_astro_overrides_sum CHECK (company_percentage + astrologer_percentage = 100);

-- 2. Internal Core Processor
CREATE OR REPLACE FUNCTION public.process_commission_for_ledger(p_ledger_id uuid)
RETURNS text AS $$
DECLARE
    v_ledger record;
    v_active_override record;
    v_active_global record;
    v_company_pct numeric;
    v_astro_pct numeric;
    v_source text;
    v_rule_id uuid;
    v_astro_amount numeric;
    v_company_amount numeric;
BEGIN
    -- FOR UPDATE SKIP LOCKED to prevent concurrent processing
    SELECT * INTO v_ledger 
    FROM public.astrologer_billing_ledger 
    WHERE consultation_id = p_ledger_id 
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN 'LEDGER_NOT_FOUND_OR_LOCKED';
    END IF;

    -- Only process 'awaiting_commission' rows. 
    -- 'reversed' or already processed rows must be skipped.
    IF v_ledger.calculation_status != 'awaiting_commission' THEN
        RETURN 'ALREADY_PROCESSED_OR_INVALID_STATUS';
    END IF;

    IF v_ledger.gross_amount IS NULL OR v_ledger.gross_amount < 0 THEN
        RETURN 'INVALID_GROSS_AMOUNT';
    END IF;

    -- Rule Resolution
    -- 1. Astrologer Override
    SELECT * INTO v_active_override
    FROM public.astrologer_commission_overrides
    WHERE astrologer_id = v_ledger.astrologer_id
      AND status = 'active'
      AND effective_from <= v_ledger.earned_at
      AND (effective_to IS NULL OR effective_to > v_ledger.earned_at)
    ORDER BY effective_from DESC LIMIT 1;

    IF FOUND THEN
        v_company_pct := v_active_override.company_percentage;
        v_astro_pct := v_active_override.astrologer_percentage;
        v_source := 'ASTROLOGER_OVERRIDE';
        v_rule_id := v_active_override.id;
    ELSE
        -- 2. Global Rule
        SELECT * INTO v_active_global
        FROM public.commission_rules
        WHERE status = 'active'
          AND effective_from <= v_ledger.earned_at
          AND (effective_to IS NULL OR effective_to > v_ledger.earned_at)
        ORDER BY effective_from DESC LIMIT 1;

        IF FOUND THEN
            v_company_pct := v_active_global.company_percentage;
            v_astro_pct := v_active_global.astrologer_percentage;
            v_source := 'GLOBAL';
            v_rule_id := v_active_global.id;
        ELSE
            -- No rule matches, fail safely
            RETURN 'COMMISSION_NOT_CONFIGURED';
        END IF;
    END IF;

    -- Safe Calculation
    v_astro_amount := ROUND((v_ledger.gross_amount * v_astro_pct) / 100, 2);
    v_company_amount := v_ledger.gross_amount - v_astro_amount;

    -- Immutability validation: Ensure we don't overwrite already calculated amounts by accident
    UPDATE public.astrologer_billing_ledger
    SET 
        company_percentage = v_company_pct,
        astrologer_percentage = v_astro_pct,
        commission_source = v_source,
        commission_rule_id = v_rule_id,
        astrologer_amount = v_astro_amount,
        company_amount = v_company_amount,
        commission_calculated_at = pg_catalog.now(),
        calculation_status = 'calculated',
        updated_at = pg_catalog.now()
    WHERE consultation_id = p_ledger_id;

    RETURN 'SUCCESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Revoke execute from public to keep this secure and internal-only
REVOKE EXECUTE ON FUNCTION public.process_commission_for_ledger(uuid) FROM PUBLIC;

-- 3. Row-level Trigger
CREATE OR REPLACE FUNCTION public.handle_pending_commission_ledger()
RETURNS trigger AS $$
BEGIN
    -- Only process when a row is newly inserted OR its status transitions to awaiting_commission
    IF (TG_OP = 'INSERT' AND NEW.calculation_status = 'awaiting_commission') OR 
       (TG_OP = 'UPDATE' AND NEW.calculation_status = 'awaiting_commission' AND OLD.calculation_status != 'awaiting_commission') THEN
        
        -- Call internal processor. We don't care about the return value for the trigger,
        -- if it fails to configure, it just returns 'COMMISSION_NOT_CONFIGURED' and the row stays awaiting.
        PERFORM public.process_commission_for_ledger(NEW.consultation_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_commission_ledger_process ON public.astrologer_billing_ledger;
CREATE TRIGGER trigger_commission_ledger_process
    AFTER INSERT OR UPDATE ON public.astrologer_billing_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_pending_commission_ledger();

-- 4. Admin Catch-up Function
CREATE OR REPLACE FUNCTION public.process_pending_commissions(p_limit integer DEFAULT 100)
RETURNS jsonb AS $$
DECLARE
    v_admin boolean;
    v_row record;
    v_result text;
    v_processed integer := 0;
    v_calculated integer := 0;
    v_not_configured integer := 0;
    v_failed integer := 0;
BEGIN
    -- Validate admin
    SELECT EXISTS (
        SELECT 1 FROM public.account_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_admin;
    
    IF NOT v_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can process batch commissions.';
    END IF;

    IF p_limit > 500 THEN
        p_limit := 500;
    END IF;

    FOR v_row IN 
        SELECT consultation_id FROM public.astrologer_billing_ledger
        WHERE calculation_status = 'awaiting_commission'
        ORDER BY earned_at ASC
        LIMIT p_limit
    LOOP
        v_processed := v_processed + 1;
        BEGIN
            v_result := public.process_commission_for_ledger(v_row.consultation_id);
            IF v_result = 'SUCCESS' THEN
                v_calculated := v_calculated + 1;
            ELSIF v_result = 'COMMISSION_NOT_CONFIGURED' THEN
                v_not_configured := v_not_configured + 1;
            ELSE
                v_failed := v_failed + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed_count', v_processed,
        'calculated_count', v_calculated,
        'not_configured_count', v_not_configured,
        'failed_count', v_failed
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.process_pending_commissions(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_pending_commissions(integer) TO authenticated;

-- 5. Admin Settings RPCs
CREATE OR REPLACE FUNCTION public.set_global_commission_rule(
    p_company_percentage numeric,
    p_astrologer_percentage numeric,
    p_effective_from timestamptz
)
RETURNS jsonb AS $$
DECLARE
    v_admin boolean;
    v_new_id uuid;
BEGIN
    -- Validate admin
    SELECT EXISTS (
        SELECT 1 FROM public.account_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_admin;
    
    IF NOT v_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can set global commission rules.';
    END IF;

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active rule and set effective_to
    UPDATE public.commission_rules
    SET status = 'inactive', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE status = 'active';

    -- Insert new active rule
    INSERT INTO public.commission_rules (
        id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_company_percentage, p_astrologer_percentage, p_effective_from, 'active', auth.uid()
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'rule_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.set_global_commission_rule(numeric, numeric, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_global_commission_rule(numeric, numeric, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_astrologer_commission_override(
    p_astrologer_id uuid,
    p_company_percentage numeric,
    p_astrologer_percentage numeric,
    p_effective_from timestamptz
)
RETURNS jsonb AS $$
DECLARE
    v_admin boolean;
    v_new_id uuid;
BEGIN
    -- Validate admin
    SELECT EXISTS (
        SELECT 1 FROM public.account_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_admin;
    
    IF NOT v_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can set overrides.';
    END IF;

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active override for this astrologer
    UPDATE public.astrologer_commission_overrides
    SET status = 'inactive', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'active';

    -- Insert new active override
    INSERT INTO public.astrologer_commission_overrides (
        id, astrologer_id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_astrologer_id, p_company_percentage, p_astrologer_percentage, p_effective_from, 'active', auth.uid()
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'override_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.set_astrologer_commission_override(uuid, numeric, numeric, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_astrologer_commission_override(uuid, numeric, numeric, timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.deactivate_astrologer_commission_override(
    p_astrologer_id uuid
)
RETURNS jsonb AS $$
DECLARE
    v_admin boolean;
BEGIN
    -- Validate admin
    SELECT EXISTS (
        SELECT 1 FROM public.account_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ) INTO v_admin;
    
    IF NOT v_admin THEN
        RAISE EXCEPTION 'Unauthorized: Only admins can deactivate overrides.';
    END IF;

    UPDATE public.astrologer_commission_overrides
    SET status = 'inactive', effective_to = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'active';

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.deactivate_astrologer_commission_override(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_astrologer_commission_override(uuid) TO authenticated;

-- 6. Dashboard Updates

-- Update Admin Dashboard Summary RPC
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS jsonb AS $$
DECLARE
    v_total_users bigint;
    v_total_astrologers bigint;
    v_total_consultations bigint;
    
    v_total_revenue numeric;
    v_total_recharges numeric;
    v_total_promo numeric;
    v_today_recharges numeric;
    v_today_promo numeric;
    
    v_gross_billing numeric;
    v_company_revenue numeric;
    v_astro_earnings numeric;
    v_awaiting_commission numeric;
BEGIN
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_total_astrologers FROM public.astrologers;
    SELECT COUNT(*) INTO v_total_consultations FROM public.consultation_sessions WHERE status = 'ENDED';
    
    -- Recharges (Real Money In)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_recharges 
    FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type != 'promo';
    
    SELECT COALESCE(SUM(amount), 0) INTO v_today_recharges 
    FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type != 'promo' AND created_at >= CURRENT_DATE;

    -- Promos (Free Money Given)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_promo 
    FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'promo';
    
    SELECT COALESCE(SUM(amount), 0) INTO v_today_promo 
    FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'promo' AND created_at >= CURRENT_DATE;

    -- Gross Billing (Total Charged to users)
    SELECT COALESCE(SUM(gross_amount), 0) INTO v_gross_billing 
    FROM public.astrologer_billing_ledger WHERE calculation_status != 'reversed';

    -- Company Revenue (Strictly from calculated/withdrawable/processing/settled)
    SELECT COALESCE(SUM(company_amount), 0) INTO v_company_revenue 
    FROM public.astrologer_billing_ledger 
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

    -- Astrologer Earnings (Strictly from calculated/withdrawable/processing/settled)
    SELECT COALESCE(SUM(astrologer_amount), 0) INTO v_astro_earnings 
    FROM public.astrologer_billing_ledger 
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

    -- Awaiting Commission
    SELECT COALESCE(SUM(gross_amount), 0) INTO v_awaiting_commission 
    FROM public.astrologer_billing_ledger 
    WHERE calculation_status = 'awaiting_commission';

    v_total_revenue := v_total_recharges;

    RETURN jsonb_build_object(
        'total_users', v_total_users,
        'total_astrologers', v_total_astrologers,
        'total_consultations', v_total_consultations,
        'total_revenue', v_total_revenue,
        'total_recharges', v_total_recharges,
        'today_recharges', v_today_recharges,
        'total_promo', v_total_promo,
        'today_promo', v_today_promo,
        'gross_billing', v_gross_billing,
        'company_revenue', v_company_revenue,
        'astrologer_earnings', v_astro_earnings,
        'awaiting_commission', v_awaiting_commission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary() TO authenticated;


-- Update Astrologer Earnings Summary RPC
CREATE OR REPLACE FUNCTION public.get_my_earnings_payout_summary(p_timezone text DEFAULT 'Asia/Kolkata')
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_astrologer_id uuid;
  v_summary json;
  
  v_today_gross numeric;
  v_yesterday_gross numeric;
  v_week_gross numeric;
  v_month_gross numeric;
  v_lifetime_gross numeric;
  
  v_today_calc numeric;
  v_yesterday_calc numeric;
  v_week_calc numeric;
  v_month_calc numeric;
  v_lifetime_calc numeric;

  v_awaiting_commission numeric;

  v_local_now timestamp;
  v_today date;
  v_yesterday date;
  v_balance_calc json;
  v_active_withdrawal text;
  v_processing_payout numeric := 0;
BEGIN
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  BEGIN
    v_local_now := pg_catalog.now() at time zone p_timezone;
  EXCEPTION WHEN OTHERS THEN
    p_timezone := 'Asia/Kolkata';
    v_local_now := pg_catalog.now() at time zone p_timezone;
  END;

  v_today := v_local_now::date;
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

  -- Gross Billing
  SELECT 
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_local_now)), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_local_now)), 0),
    coalesce(sum(bl.gross_amount), 0)
  INTO 
    v_today_gross, v_yesterday_gross, v_week_gross, v_month_gross, v_lifetime_gross
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status <> 'reversed';

  -- Calculated Earnings (Actual Income)
  SELECT 
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_local_now)), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_local_now)), 0),
    coalesce(sum(bl.astrologer_amount), 0)
  INTO 
    v_today_calc, v_yesterday_calc, v_week_calc, v_month_calc, v_lifetime_calc
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

  -- Awaiting Commission
  SELECT coalesce(sum(bl.gross_amount), 0) INTO v_awaiting_commission
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status = 'awaiting_commission';

  -- Check for active withdrawal
  SELECT status, amount INTO v_active_withdrawal, v_processing_payout
  FROM public.astrologer_withdrawal_requests
  WHERE astrologer_id = v_astrologer_id
    AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_processing_payout := coalesce(v_processing_payout, 0);

  -- Calculate withdrawable balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);

  SELECT pg_catalog.json_build_object(
    'gross_billing_today', v_today_gross,
    'gross_billing_yesterday', v_yesterday_gross,
    'gross_billing_week', v_week_gross,
    'gross_billing_month', v_month_gross,
    'gross_billing_lifetime', v_lifetime_gross,

    'calculated_earnings_today', v_today_calc,
    'calculated_earnings_yesterday', v_yesterday_calc,
    'calculated_earnings_week', v_week_calc,
    'calculated_earnings_month', v_month_calc,
    'calculated_earnings_lifetime', v_lifetime_calc,

    'awaiting_commission', v_awaiting_commission,
    
    'withdrawable_balance', (v_balance_calc->>'available_balance')::numeric,
    'pending_settlement', null,
    'processing_payout', v_processing_payout,
    'last_settlement_amount', null,
    'last_settlement_at', null,

    'can_request_withdrawal', (v_balance_calc->>'available_balance')::numeric > 200 AND v_active_withdrawal IS NULL,
    'withdrawal_disabled_reason', v_balance_calc->>'reason',
    'minimum_withdrawal_amount', 200,
    'active_withdrawal_status', v_active_withdrawal
  ) INTO v_summary;

  RETURN coalesce(v_summary, '{}'::json);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_earnings_payout_summary(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_earnings_payout_summary(text) TO authenticated;

-- Update Withdrawable balance calculation
CREATE OR REPLACE FUNCTION public.calculate_astrologer_withdrawable_balance(p_astrologer_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_withdrawable_total numeric;
  v_active_withdrawal_amount numeric;
  v_available numeric;
BEGIN
  -- Sum up rows explicitly marked as withdrawable (calculated != withdrawable in this phase)
  SELECT COALESCE(SUM(astrologer_amount), 0) INTO v_withdrawable_total
  FROM public.astrologer_billing_ledger
  WHERE astrologer_id = p_astrologer_id AND calculation_status = 'withdrawable';

  -- Subtract any requested/processing withdrawals
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
$$;
REVOKE EXECUTE ON FUNCTION public.calculate_astrologer_withdrawable_balance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_astrologer_withdrawable_balance(uuid) TO authenticated;
