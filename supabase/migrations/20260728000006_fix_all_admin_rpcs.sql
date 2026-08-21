-- ===================================================================
-- COMPREHENSIVE FIX: All Admin RPCs - Match actual DB schema
-- profiles: id, phone, email, name (NOT display_name)
-- consultation_sessions: user_id (NOT customer_id), no created_at
-- astrologers: price_per_minute (NOT rate_per_minute)
-- ===================================================================

-- 5. Dashboard timeseries - fix consultation_sessions.ended_at
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_timeseries(
    p_from timestamptz,
    p_to timestamptz,
    p_timezone text DEFAULT 'Asia/Kolkata',
    p_granularity text DEFAULT 'day'
)
RETURNS TABLE (
    bucket timestamptz,
    successful_payment_volume numeric,
    wallet_recharge_volume numeric,
    consultation_gross_billing numeric,
    company_commission_revenue numeric,
    astrologer_earnings numeric,
    consultation_count bigint,
    new_users bigint,
    new_astrologers bigint
) AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_granularity NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'Invalid granularity. Must be day, week, or month.';
    END IF;

    RETURN QUERY
    WITH buckets AS (
        SELECT generate_series(
            date_trunc(p_granularity, p_from AT TIME ZONE p_timezone) AT TIME ZONE p_timezone,
            date_trunc(p_granularity, p_to AT TIME ZONE p_timezone) AT TIME ZONE p_timezone,
            ('1 ' || p_granularity)::interval
        ) AS bucket
    ),
    pay AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(amount_paise / 100.0) AS vol
        FROM public.payment_orders
        WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    wall AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(amount) AS vol
        FROM public.wallet_transactions
        WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge'
          AND created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    bill AS (
        SELECT 
            date_trunc(p_granularity, earned_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(gross_amount) AS gross,
            SUM(company_amount) AS comp,
            SUM(astrologer_amount) AS astro
        FROM public.astrologer_billing_ledger
        WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
          AND earned_at >= p_from AND earned_at < p_to
        GROUP BY 1
    ),
    cons AS (
        SELECT 
            date_trunc(p_granularity, ended_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.consultation_sessions
        WHERE status = 'ENDED' AND ended_at >= p_from AND ended_at < p_to
        GROUP BY 1
    ),
    usr AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.profiles
        WHERE created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    astr AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.astrologers
        WHERE created_at >= p_from AND created_at < p_to
        GROUP BY 1
    )
    SELECT 
        b.bucket,
        COALESCE(p.vol, 0) AS successful_payment_volume,
        COALESCE(w.vol, 0) AS wallet_recharge_volume,
        COALESCE(bl.gross, 0) AS consultation_gross_billing,
        COALESCE(bl.comp, 0) AS company_commission_revenue,
        COALESCE(bl.astro, 0) AS astrologer_earnings,
        COALESCE(c.cnt, 0) AS consultation_count,
        COALESCE(u.cnt, 0) AS new_users,
        COALESCE(a.cnt, 0) AS new_astrologers
    FROM buckets b
    LEFT JOIN pay p ON b.bucket = p.bkt
    LEFT JOIN wall w ON b.bucket = w.bkt
    LEFT JOIN bill bl ON b.bucket = bl.bkt
    LEFT JOIN cons c ON b.bucket = c.bkt
    LEFT JOIN usr u ON b.bucket = u.bkt
    LEFT JOIN astr a ON b.bucket = a.bkt
    WHERE b.bucket >= date_trunc(p_granularity, p_from AT TIME ZONE p_timezone) AT TIME ZONE p_timezone
      AND b.bucket <= date_trunc(p_granularity, p_to AT TIME ZONE p_timezone) AT TIME ZONE p_timezone
    ORDER BY b.bucket ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_timeseries(timestamptz, timestamptz, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_timeseries(timestamptz, timestamptz, text, text) TO authenticated;


-- 7.1 Users - fix display_name -> name, customer_id -> user_id
CREATE OR REPLACE FUNCTION public.get_admin_users(
    p_filters jsonb DEFAULT '{}'::jsonb,
    p_limit integer DEFAULT 25,
    p_offset integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
    v_search text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('created_at', 'name', 'phone') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.profiles p
    WHERE (v_search IS NULL 
        OR p.name ILIKE '%' || v_search || '%' 
        OR p.phone ILIKE '%' || v_search || '%'
        OR p.email ILIKE '%' || v_search || '%');

    WITH items AS (
        SELECT 
            p.id AS user_id,
            p.name,
            p.phone,
            p.email,
            p.created_at AS joined_at,
            w.balance AS wallet_balance,
            (SELECT COALESCE(SUM(amount_paise / 100.0), 0) FROM public.payment_orders po WHERE po.user_id = p.id AND po.status IN ('captured', 'credited')) AS total_recharge_volume,
            (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.user_id = p.id AND cs.status = 'ENDED') AS total_consultations,
            'active' AS account_status
        FROM public.profiles p
        LEFT JOIN public.wallets w ON w.user_id = p.id
        WHERE (v_search IS NULL 
            OR p.name ILIKE '%' || v_search || '%' 
            OR p.phone ILIKE '%' || v_search || '%'
            OR p.email ILIKE '%' || v_search || '%')
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'name' THEN p.name END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'name' THEN p.name END DESC,
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'created_at' THEN p.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'created_at' THEN p.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_users(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users(jsonb, integer, integer) TO authenticated;


-- 7.2 Astrologers - fix display_name -> name, rate_per_minute -> price_per_minute, customer_id -> user_id
CREATE OR REPLACE FUNCTION public.get_admin_astrologers(
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
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('created_at', 'name', 'gross_billing') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologers a
    JOIN public.profiles p ON a.user_id = p.id
    WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR a.status = v_status);

    WITH items AS (
        SELECT 
            a.id AS astrologer_id,
            a.user_id,
            COALESCE(a.name, p.name) AS name,
            a.is_published,
            a.status AS availability_status,
            a.price_per_minute AS rate_per_minute,
            (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.astrologer_id = a.id AND cs.status = 'ENDED') AS completed_consultations,
            (SELECT COALESCE(SUM(gross_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id) AS gross_billing,
            (SELECT COALESCE(SUM(astrologer_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS astrologer_earnings,
            (SELECT COALESCE(SUM(company_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS company_revenue,
            (SELECT status FROM public.astrologer_payout_accounts pa WHERE pa.astrologer_id = a.id ORDER BY submitted_at DESC LIMIT 1) AS payout_account_status,
            (SELECT status FROM public.astrologer_withdrawal_requests w WHERE w.astrologer_id = a.id AND w.status IN ('REQUESTED', 'APPROVED', 'PROCESSING') LIMIT 1) AS active_withdrawal_status,
            a.created_at
        FROM public.astrologers a
        JOIN public.profiles p ON a.user_id = p.id
        WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR a.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'created_at' THEN a.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'created_at' THEN a.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_astrologers(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_astrologers(jsonb, integer, integer) TO authenticated;


-- 7.3 Consultations - fix display_name -> name, customer_id -> user_id
CREATE OR REPLACE FUNCTION public.get_admin_consultations(
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

    IF v_sort_by NOT IN ('requested_at', 'started_at', 'ended_at') THEN v_sort_by := 'requested_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.consultation_sessions cs
    LEFT JOIN public.profiles p1 ON cs.user_id = p1.id
    LEFT JOIN public.astrologers a ON cs.astrologer_id = a.id
    WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR cs.status = v_status);

    WITH items AS (
        SELECT 
            cs.id AS session_id,
            cs.user_id AS customer_id,
            p1.name AS customer_name,
            cs.astrologer_id,
            a.name AS astrologer_name,
            cs.status,
            cs.requested_at,
            cs.started_at,
            cs.ended_at,
            cs.billed_minutes,
            cs.rate_per_minute,
            cs.total_charged AS session_total_charged,
            bl.gross_amount AS ledger_gross_amount,
            bl.calculation_status AS ledger_status,
            (cs.status = 'ENDED' AND bl.id IS NULL) AS has_missing_ledger,
            (cs.status = 'ENDED' AND cs.total_charged != COALESCE(bl.gross_amount, -1)) AS has_amount_mismatch
        FROM public.consultation_sessions cs
        LEFT JOIN public.profiles p1 ON cs.user_id = p1.id
        LEFT JOIN public.astrologers a ON cs.astrologer_id = a.id
        LEFT JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = cs.id
        WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR cs.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'requested_at' THEN cs.requested_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'requested_at' THEN cs.requested_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_consultations(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_consultations(jsonb, integer, integer) TO authenticated;


-- 7.4 Payments - fix display_name -> name
CREATE OR REPLACE FUNCTION public.get_admin_payments(
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
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('created_at') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.payment_orders po
    LEFT JOIN public.profiles p ON po.user_id = p.id
    WHERE (v_search IS NULL 
        OR po.razorpay_order_id ILIKE '%' || v_search || '%' 
        OR po.razorpay_payment_id ILIKE '%' || v_search || '%' 
        OR po.id::text ILIKE '%' || v_search || '%' 
        OR p.name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR po.status = v_status);

    WITH items AS (
        SELECT 
            po.id AS internal_order_id,
            po.razorpay_order_id,
            po.razorpay_payment_id,
            po.user_id,
            p.name AS user_name,
            p.phone AS user_phone,
            (po.amount_paise / 100.0) AS amount,
            po.status AS payment_status,
            w.status AS wallet_credit_status,
            w.id AS wallet_transaction_reference,
            po.created_at,
            po.updated_at AS verified_at,
            (po.status IN ('captured', 'credited') AND w.id IS NULL) AS has_mismatch
        FROM public.payment_orders po
        LEFT JOIN public.profiles p ON po.user_id = p.id
        LEFT JOIN public.wallet_transactions w ON w.reference_id = po.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        WHERE (v_search IS NULL 
            OR po.razorpay_order_id ILIKE '%' || v_search || '%' 
            OR po.razorpay_payment_id ILIKE '%' || v_search || '%' 
            OR po.id::text ILIKE '%' || v_search || '%' 
            OR p.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR po.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN po.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN po.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_payments(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_payments(jsonb, integer, integer) TO authenticated;
