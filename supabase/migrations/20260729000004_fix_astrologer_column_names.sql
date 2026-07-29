-- Fix column names in get_admin_astrologers RPC (a.experience instead of a.experience_years, a.image for photo)
CREATE OR REPLACE FUNCTION public.get_admin_astrologers(
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_search text;
    v_tab text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_tab := COALESCE(NULLIF(TRIM(p_filters->>'tab'), ''), 'live');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_tab = 'applications' THEN
        SELECT COUNT(*) INTO v_total_count
        FROM public.astrologer_applications app
        WHERE (v_search IS NULL OR app.name ILIKE '%' || v_search || '%' OR app.phone ILIKE '%' || v_search || '%' OR app.email ILIKE '%' || v_search || '%');

        WITH items AS (
            SELECT 
                app.id AS application_id,
                app.name,
                app.phone,
                app.email,
                app.experience_years,
                app.skills,
                app.languages,
                app.bio AS about,
                app.status AS application_status,
                app.submitted_at,
                app.created_at,
                app.pan_document_path,
                app.certificate_paths
            FROM public.astrologer_applications app
            WHERE (v_search IS NULL OR app.name ILIKE '%' || v_search || '%' OR app.phone ILIKE '%' || v_search || '%' OR app.email ILIKE '%' || v_search || '%')
            ORDER BY 
                CASE WHEN v_sort_direction = 'ASC' THEN app.created_at END ASC,
                CASE WHEN v_sort_direction = 'DESC' THEN app.created_at END DESC
            LIMIT p_limit
            OFFSET p_offset
        )
        SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;
    ELSE
        SELECT COUNT(*) INTO v_total_count
        FROM public.astrologers a
        LEFT JOIN public.profiles p ON a.user_id = p.id
        WHERE (v_search IS NULL OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%');

        WITH items AS (
            SELECT 
                a.id AS astrologer_id,
                COALESCE(a.name, p.name) AS name,
                p.phone,
                p.email,
                a.status AS availability_status,
                a.is_published,
                a.experience AS experience_years,
                a.skills,
                a.languages,
                a.about,
                a.image AS profile_photo_url,
                a.price_per_minute,
                a.created_at,
                (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.astrologer_id = a.id AND cs.status = 'ENDED') AS completed_consultations,
                (SELECT COALESCE(SUM(gross_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id) AS gross_billing,
                (SELECT COALESCE(SUM(astrologer_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS astrologer_earnings,
                (public.calculate_astrologer_withdrawable_balance(a.id)->>'available_balance')::numeric AS withdrawable_balance,
                (
                    SELECT row_to_json(pa)::jsonb
                    FROM public.astrologer_payout_accounts pa
                    WHERE pa.astrologer_id = a.id
                    ORDER BY pa.submitted_at DESC
                    LIMIT 1
                ) AS payout_account
            FROM public.astrologers a
            LEFT JOIN public.profiles p ON a.user_id = p.id
            WHERE (v_search IS NULL OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%')
            ORDER BY 
                CASE WHEN v_sort_direction = 'ASC' THEN a.created_at END ASC,
                CASE WHEN v_sort_direction = 'DESC' THEN a.created_at END DESC
            LIMIT p_limit
            OFFSET p_offset
        )
        SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;
    END IF;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_astrologers(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_astrologers(jsonb, integer, integer) TO authenticated;
