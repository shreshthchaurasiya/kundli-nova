-- 3. Fix process_pending_commissions to use assert_current_user_is_admin
CREATE OR REPLACE FUNCTION public.process_pending_commissions(p_limit integer DEFAULT 100)
RETURNS jsonb AS $$
DECLARE
    v_row record;
    v_processed integer := 0;
    v_calculated integer := 0;
    v_not_configured integer := 0;
    v_failed integer := 0;
    v_result text;
BEGIN
    PERFORM public.assert_current_user_is_admin();

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
