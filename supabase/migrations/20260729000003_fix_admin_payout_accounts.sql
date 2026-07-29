-- ===================================================================
-- COMPREHENSIVE FIX: Admin Payout Accounts & Astrologer Bank Verification
-- 1. Fix get_admin_payout_accounts RPC (correct join astrologers -> profiles, include balance & name)
-- 2. Fix admin_verify_payout_account RPC (use assert_current_user_is_admin)
-- 3. Enhance get_admin_astrologers to include bank account details & withdrawable balance
-- ===================================================================

-- 1. Fix get_admin_payout_accounts
CREATE OR REPLACE FUNCTION public.get_admin_payout_accounts(
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
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'submitted_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_payout_accounts pa
    JOIN public.astrologers a ON pa.astrologer_id = a.id
    LEFT JOIN public.profiles p ON a.user_id = p.id
    WHERE (v_search IS NULL 
        OR pa.id::text ILIKE '%' || v_search || '%' 
        OR pa.account_holder_name ILIKE '%' || v_search || '%' 
        OR pa.bank_name ILIKE '%' || v_search || '%' 
        OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR UPPER(pa.status) = UPPER(v_status));

    WITH items AS (
        SELECT 
            pa.id AS payout_account_id,
            pa.astrologer_id,
            COALESCE(a.name, p.name, 'Astrologer') AS astrologer_name,
            p.email AS astrologer_email,
            p.phone AS astrologer_phone,
            pa.account_holder_name,
            pa.bank_name,
            RIGHT(pa.account_number_last4, 4) AS account_number_last4,
            pa.ifsc_code,
            pa.status,
            pa.rejection_reason,
            pa.submitted_at,
            pa.verified_at,
            (public.calculate_astrologer_withdrawable_balance(pa.astrologer_id)->>'available_balance')::numeric AS withdrawable_balance
        FROM public.astrologer_payout_accounts pa
        JOIN public.astrologers a ON pa.astrologer_id = a.id
        LEFT JOIN public.profiles p ON a.user_id = p.id
        WHERE (v_search IS NULL 
            OR pa.id::text ILIKE '%' || v_search || '%' 
            OR pa.account_holder_name ILIKE '%' || v_search || '%' 
            OR pa.bank_name ILIKE '%' || v_search || '%' 
            OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR UPPER(pa.status) = UPPER(v_status))
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN pa.submitted_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN pa.submitted_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_payout_accounts(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_payout_accounts(jsonb, integer, integer) TO authenticated;


-- 2. Fix admin_verify_payout_account
CREATE OR REPLACE FUNCTION public.admin_verify_payout_account(
    p_account_id uuid,
    p_status text,
    p_reason text DEFAULT NULL
)
RETURNS jsonb AS $$
DECLARE
  v_account public.astrologer_payout_accounts;
  v_now timestamptz := pg_catalog.now();
  v_admin_id uuid := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
BEGIN
  PERFORM public.assert_current_user_is_admin();

  IF UPPER(p_status) NOT IN ('VERIFIED', 'REJECTED') THEN
    RAISE EXCEPTION 'Status must be VERIFIED or REJECTED';
  END IF;

  IF UPPER(p_status) = 'REJECTED' AND (p_reason IS NULL OR pg_catalog.trim(p_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required when rejecting a bank account';
  END IF;

  SELECT * INTO v_account
  FROM public.astrologer_payout_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout account not found';
  END IF;

  UPDATE public.astrologer_payout_accounts
  SET status = UPPER(p_status),
      rejection_reason = CASE WHEN UPPER(p_status) = 'REJECTED' THEN p_reason ELSE NULL END,
      verified_at = CASE WHEN UPPER(p_status) = 'VERIFIED' THEN v_now ELSE NULL END,
      verified_by = CASE WHEN UPPER(p_status) = 'VERIFIED' THEN v_admin_id ELSE NULL END,
      updated_at = v_now
  WHERE id = p_account_id
  RETURNING * INTO v_account;

  RETURN pg_catalog.jsonb_build_object(
    'id', v_account.id,
    'status', v_account.status,
    'rejection_reason', v_account.rejection_reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_verify_payout_account(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_verify_payout_account(uuid, text, text) TO authenticated;


-- 3. Update get_admin_astrologers to include payout account details & withdrawable balance
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
                a.experience_years,
                a.skills,
                a.languages,
                a.bio AS about,
                a.profile_photo_url,
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
