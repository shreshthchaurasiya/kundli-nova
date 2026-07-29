-- Fix Admin Auth in Commission RPCs to use uppercase status
CREATE OR REPLACE FUNCTION public.set_global_commission_rule(
    p_company_percentage numeric,
    p_astrologer_percentage numeric,
    p_effective_from timestamptz
)
RETURNS jsonb AS $$
DECLARE
    v_new_id uuid;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active rule and set effective_to
    UPDATE public.commission_rules
    SET status = 'INACTIVE', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE status = 'ACTIVE';

    -- Insert new active rule
    INSERT INTO public.commission_rules (
        id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_company_percentage, p_astrologer_percentage, p_effective_from, 'ACTIVE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'rule_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.set_astrologer_commission_override(
    p_astrologer_id uuid,
    p_company_percentage numeric,
    p_astrologer_percentage numeric,
    p_effective_from timestamptz
)
RETURNS jsonb AS $$
DECLARE
    v_new_id uuid;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active override for this astrologer
    UPDATE public.astrologer_commission_overrides
    SET status = 'INACTIVE', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'ACTIVE';

    -- Insert new active override
    INSERT INTO public.astrologer_commission_overrides (
        id, astrologer_id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_astrologer_id, p_company_percentage, p_astrologer_percentage, p_effective_from, 'ACTIVE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'override_id', v_new_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

CREATE OR REPLACE FUNCTION public.deactivate_astrologer_commission_override(
    p_astrologer_id uuid
)
RETURNS jsonb AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    UPDATE public.astrologer_commission_overrides
    SET status = 'INACTIVE', effective_to = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'ACTIVE';

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Also need to update the trigger process_commission_for_ledger to check 'ACTIVE' instead of 'active'
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

    -- Only process awaiting_commission
    IF v_ledger.calculation_status != 'awaiting_commission' THEN
        RETURN 'LEDGER_ALREADY_PROCESSED';
    END IF;

    -- 1. Try to find active astrologer override effective at the time of earning
    SELECT * INTO v_active_override
    FROM public.astrologer_commission_overrides
    WHERE astrologer_id = v_ledger.astrologer_id
      AND status = 'ACTIVE'
      AND effective_from <= v_ledger.earned_at
      AND (effective_to IS NULL OR effective_to > v_ledger.earned_at)
    ORDER BY effective_from DESC
    LIMIT 1;

    IF FOUND THEN
        v_company_pct := v_active_override.company_percentage;
        v_astro_pct := v_active_override.astrologer_percentage;
        v_source := 'astrologer_override';
        v_rule_id := v_active_override.id;
    ELSE
        -- 2. Try to find active global rule effective at the time of earning
        SELECT * INTO v_active_global
        FROM public.commission_rules
        WHERE status = 'ACTIVE'
          AND effective_from <= v_ledger.earned_at
          AND (effective_to IS NULL OR effective_to > v_ledger.earned_at)
        ORDER BY effective_from DESC
        LIMIT 1;

        IF FOUND THEN
            v_company_pct := v_active_global.company_percentage;
            v_astro_pct := v_active_global.astrologer_percentage;
            v_source := 'global_rule';
            v_rule_id := v_active_global.id;
        ELSE
            -- No matching rule found for this timestamp. Leave as awaiting_commission.
            RETURN 'COMMISSION_NOT_CONFIGURED';
        END IF;
    END IF;

    -- 3. Calculate exact split using precise rounding
    v_astro_amount := ROUND((v_ledger.gross_amount * v_astro_pct) / 100.0, 2);
    v_company_amount := v_ledger.gross_amount - v_astro_amount;

    -- 4. Update the ledger row
    UPDATE public.astrologer_billing_ledger
    SET 
        company_percentage = v_company_pct,
        astrologer_percentage = v_astro_pct,
        commission_source = v_source,
        company_amount = v_company_amount,
        astrologer_amount = v_astro_amount,
        calculation_status = 'calculated',
        commission_calculated_at = pg_catalog.now()
    WHERE consultation_id = p_ledger_id;

    RETURN 'SUCCESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
