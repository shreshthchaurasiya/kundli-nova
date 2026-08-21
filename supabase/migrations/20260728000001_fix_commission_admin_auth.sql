-- Fix Admin Auth in Commission RPCs
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
    SET status = 'inactive', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE status = 'active';

    -- Insert new active rule
    INSERT INTO public.commission_rules (
        id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_company_percentage, p_astrologer_percentage, p_effective_from, 'active', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
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
    SET status = 'inactive', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'active';

    -- Insert new active override
    INSERT INTO public.astrologer_commission_overrides (
        id, astrologer_id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_astrologer_id, p_company_percentage, p_astrologer_percentage, p_effective_from, 'active', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
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
    SET status = 'inactive', effective_to = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'active';

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
