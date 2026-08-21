-- ===================================================================
-- COMPREHENSIVE FIX: Astro Commission System
-- 1. get_admin_commission_overview RPC for UI
-- 2. Fix process_commission_for_ledger matching for active rules
-- ===================================================================

-- 1. Create Overview RPC for Admin Commission Screen
CREATE OR REPLACE FUNCTION public.get_admin_commission_overview()
RETURNS jsonb AS $$
DECLARE
    v_global_rule jsonb;
    v_overrides jsonb;
    v_pending_count bigint;
    v_pending_amount numeric;
    v_astrologers jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- Fetch active global rule (case-insensitive status check)
    SELECT row_to_json(r)::jsonb INTO v_global_rule
    FROM public.commission_rules r
    WHERE UPPER(r.status) = 'ACTIVE'
    ORDER BY r.effective_from DESC
    LIMIT 1;

    -- Fetch active overrides with astrologer names
    WITH active_overrides AS (
        SELECT 
            o.id,
            o.astrologer_id,
            o.company_percentage,
            o.astrologer_percentage,
            o.effective_from,
            o.status,
            COALESCE(a.name, p.name, 'Astrologer') AS astrologer_name
        FROM public.astrologer_commission_overrides o
        JOIN public.astrologers a ON a.id = o.astrologer_id
        LEFT JOIN public.profiles p ON p.id = a.user_id
        WHERE UPPER(o.status) = 'ACTIVE'
        ORDER BY o.effective_from DESC
    )
    SELECT COALESCE(jsonb_agg(row_to_json(active_overrides)), '[]'::jsonb) INTO v_overrides
    FROM active_overrides;

    -- Fetch pending commission count & amount
    SELECT 
        COUNT(*),
        COALESCE(SUM(gross_amount), 0)
    INTO 
        v_pending_count,
        v_pending_amount
    FROM public.astrologer_billing_ledger
    WHERE calculation_status = 'awaiting_commission';

    -- Fetch astrologers list for dropdown
    WITH astro_list AS (
        SELECT 
            a.id,
            COALESCE(a.name, p.name, 'Astrologer') AS name
        FROM public.astrologers a
        LEFT JOIN public.profiles p ON p.id = a.user_id
        ORDER BY name ASC
    )
    SELECT COALESCE(jsonb_agg(row_to_json(astro_list)), '[]'::jsonb) INTO v_astrologers
    FROM astro_list;

    RETURN jsonb_build_object(
        'global_rule', v_global_rule,
        'overrides', v_overrides,
        'pending_count', v_pending_count,
        'pending_amount', v_pending_amount,
        'astrologers', v_astrologers
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_commission_overview() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_commission_overview() TO authenticated;


-- 2. Fix process_commission_for_ledger to match active rules (including current rule with null effective_to)
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
    SELECT * INTO v_ledger 
    FROM public.astrologer_billing_ledger 
    WHERE consultation_id = p_ledger_id 
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN 'LEDGER_NOT_FOUND_OR_LOCKED';
    END IF;

    IF v_ledger.calculation_status != 'awaiting_commission' THEN
        RETURN 'LEDGER_ALREADY_PROCESSED';
    END IF;

    -- 1. Try to find active astrologer override
    SELECT * INTO v_active_override
    FROM public.astrologer_commission_overrides
    WHERE astrologer_id = v_ledger.astrologer_id
      AND UPPER(status) = 'ACTIVE'
      AND (
        (effective_from <= v_ledger.earned_at AND (effective_to IS NULL OR effective_to > v_ledger.earned_at))
        OR (effective_to IS NULL)
      )
    ORDER BY effective_from DESC
    LIMIT 1;

    IF FOUND THEN
        v_company_pct := v_active_override.company_percentage;
        v_astro_pct := v_active_override.astrologer_percentage;
        v_source := 'astrologer_override';
        v_rule_id := v_active_override.id;
    ELSE
        -- 2. Try to find active global rule
        SELECT * INTO v_active_global
        FROM public.commission_rules
        WHERE UPPER(status) = 'ACTIVE'
          AND (
            (effective_from <= v_ledger.earned_at AND (effective_to IS NULL OR effective_to > v_ledger.earned_at))
            OR (effective_to IS NULL)
          )
        ORDER BY effective_from DESC
        LIMIT 1;

        IF FOUND THEN
            v_company_pct := v_active_global.company_percentage;
            v_astro_pct := v_active_global.astrologer_percentage;
            v_source := 'global_rule';
            v_rule_id := v_active_global.id;
        ELSE
            RETURN 'COMMISSION_NOT_CONFIGURED';
        END IF;
    END IF;

    -- 3. Calculate exact split
    v_astro_amount := ROUND((v_ledger.gross_amount * v_astro_pct) / 100.0, 2);
    v_company_amount := v_ledger.gross_amount - v_astro_amount;

    -- 4. Update the ledger row
    UPDATE public.astrologer_billing_ledger
    SET 
        company_percentage = v_company_pct,
        astrologer_percentage = v_astro_pct,
        commission_source = v_source,
        commission_rule_id = v_rule_id,
        company_amount = v_company_amount,
        astrologer_amount = v_astro_amount,
        calculation_status = 'calculated',
        commission_calculated_at = pg_catalog.now()
    WHERE consultation_id = p_ledger_id;

    RETURN 'SUCCESS';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
