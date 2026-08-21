CREATE OR REPLACE FUNCTION public.get_admin_withdrawals(
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_search text;
    v_status text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_status := NULLIF(TRIM(p_filters->>'status'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'requested_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('requested_at') THEN v_sort_by := 'requested_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_withdrawal_requests w
    JOIN public.astrologers a ON w.astrologer_id = a.id
    LEFT JOIN public.profiles p ON a.user_id = p.id
    LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
    WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR w.status = v_status);

    WITH items AS (
        SELECT 
            w.id AS withdrawal_id,
            w.astrologer_id,
            COALESCE(a.name, p.name, 'Astrologer') AS astrologer_name,
            w.amount,
            w.status,
            pa.bank_name AS payout_bank_name,
            RIGHT(pa.account_number_last4, 4) AS payout_account_last4,
            w.requested_at,
            w.approved_at,
            w.processing_at,
            w.paid_at,
            w.rejected_at,
            w.failed_at,
            w.payout_reference,
            w.bank_reference,
            w.rejection_reason,
            w.failure_reason
        FROM public.astrologer_withdrawal_requests w
        JOIN public.astrologers a ON w.astrologer_id = a.id
        LEFT JOIN public.profiles p ON a.user_id = p.id
        LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
        WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR w.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN w.requested_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN w.requested_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
