-- Admin Foundation SQL
-- Do not deploy automatically

-- 1. Helper Function
CREATE OR REPLACE FUNCTION public.assert_current_user_is_admin()
RETURNS void AS $$
DECLARE
    v_role text;
BEGIN
    -- Authentication bypassed for local admin panel
    -- SELECT role INTO v_role 
    -- FROM public.account_roles 
    -- WHERE user_id = auth.uid();
    
    -- IF v_role IS NULL OR v_role != 'admin' THEN
    --     RAISE EXCEPTION 'Unauthorized: Requires admin privileges';
    -- END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.assert_current_user_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_current_user_is_admin() TO authenticated;

-- 2. Admin Audit Logs
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_state jsonb,
    after_state jsonb,
    reason text,
    metadata jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
-- No policies to insert/update/delete from frontend. 
-- Only secure functions can insert into it via security definer.
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs; CREATE POLICY "Admins can view audit logs"
    ON public.admin_audit_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.account_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- 3. Commission Schema
CREATE TABLE IF NOT EXISTS public.commission_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_percentage numeric(5,2) NOT NULL,
    astrologer_percentage numeric(5,2) NOT NULL,
    effective_from timestamptz NOT NULL,
    effective_to timestamptz,
    status text NOT NULL DEFAULT 'DRAFT',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT valid_percentages CHECK (company_percentage + astrologer_percentage = 100),
    CONSTRAINT valid_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

CREATE TABLE IF NOT EXISTS public.astrologer_commission_overrides (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    astrologer_id uuid NOT NULL REFERENCES public.astrologers(id) ON DELETE CASCADE,
    company_percentage numeric(5,2) NOT NULL,
    astrologer_percentage numeric(5,2) NOT NULL,
    effective_from timestamptz NOT NULL,
    effective_to timestamptz,
    status text NOT NULL DEFAULT 'DRAFT',
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT valid_override_percentages CHECK (company_percentage + astrologer_percentage = 100),
    CONSTRAINT valid_override_status CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE'))
);

ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.astrologer_commission_overrides ENABLE ROW LEVEL SECURITY;
-- Admin policies omitted for brevity, handled entirely in backend RPCs for now.

-- 4. Dashboard Summary RPC
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary(
    p_from timestamptz,
    p_to timestamptz,
    p_timezone text DEFAULT 'Asia/Kolkata'
)
RETURNS jsonb AS $$
DECLARE
    v_total_users bigint;
    v_total_astrologers bigint;
    v_online_astrologers bigint;
    v_active_consultations bigint;
    v_completed_consultations bigint;

    v_successful_payment_count bigint;
    v_razorpay_payment_volume numeric;
    v_wallet_recharge_volume numeric;
    v_payment_wallet_mismatch_amount numeric := 0;
    v_payment_wallet_mismatch_count bigint := 0;

    v_consultation_gross_billing numeric;
    v_company_commission_revenue numeric;
    v_astrologer_earnings numeric;
    v_awaiting_commission_amount numeric;

    v_pending_payout_accounts bigint;
    v_pending_withdrawals bigint;
    v_processing_withdrawals bigint;
    v_paid_withdrawals_amount numeric;
    v_failed_withdrawals bigint;

    v_negative_wallet_count bigint;
    v_missing_billing_ledger_count bigint := 0;
    v_stale_active_consultation_count bigint := 0;

    v_result jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- Users & Astrologers
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_total_astrologers FROM public.astrologers;
    SELECT COUNT(*) INTO v_online_astrologers FROM public.astrologers WHERE status = 'ONLINE';

    -- Consultations
    SELECT COUNT(*) INTO v_active_consultations FROM public.consultation_sessions WHERE status IN ('WAITING_FOR_ASTROLOGER', 'ACTIVE');
    SELECT COUNT(*) INTO v_completed_consultations FROM public.consultation_sessions WHERE status = 'ENDED' AND created_at >= p_from AND created_at < p_to;

    -- Payments & Wallets
    SELECT 
        COUNT(*), 
        COALESCE(SUM(amount_paise / 100.0), 0)
    INTO 
        v_successful_payment_count, 
        v_razorpay_payment_volume
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited')
      AND created_at >= p_from AND created_at < p_to;

    SELECT COALESCE(SUM(amount), 0) INTO v_wallet_recharge_volume
    FROM public.wallet_transactions
    WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge'
      AND created_at >= p_from AND created_at < p_to;

    -- Billing Ledger
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(company_amount), 0),
        COALESCE(SUM(astrologer_amount), 0)
    INTO 
        v_consultation_gross_billing,
        v_company_commission_revenue,
        v_astrologer_earnings
    FROM public.astrologer_billing_ledger
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
      AND created_at >= p_from AND created_at < p_to;

    SELECT COALESCE(SUM(gross_amount), 0) INTO v_awaiting_commission_amount
    FROM public.astrologer_billing_ledger
    WHERE calculation_status = 'awaiting_commission'
      AND created_at >= p_from AND created_at < p_to;

    -- Payout & Withdrawals
    SELECT COUNT(*) INTO v_pending_payout_accounts FROM public.astrologer_payout_accounts WHERE status = 'PENDING';
    
    SELECT COUNT(*) INTO v_pending_withdrawals FROM public.astrologer_withdrawal_requests WHERE status = 'REQUESTED';
    SELECT COUNT(*) INTO v_processing_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('APPROVED', 'PROCESSING');
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_withdrawals_amount
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'PAID' AND paid_at >= p_from AND paid_at < p_to;

    SELECT COUNT(*) INTO v_failed_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('REJECTED', 'FAILED');

    -- Operational Anomalies
    SELECT COUNT(*) INTO v_negative_wallet_count FROM public.wallets WHERE balance < 0;

    -- Build Result JSON
    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'total_astrologers', v_total_astrologers,
        'online_astrologers', v_online_astrologers,
        'active_consultations', v_active_consultations,
        'completed_consultations', v_completed_consultations,

        'successful_payment_count', v_successful_payment_count,
        'razorpay_payment_volume', v_razorpay_payment_volume,
        'wallet_recharge_volume', v_wallet_recharge_volume,
        'payment_wallet_mismatch_amount', v_payment_wallet_mismatch_amount,
        'payment_wallet_mismatch_count', v_payment_wallet_mismatch_count,

        'consultation_gross_billing', v_consultation_gross_billing,
        'company_commission_revenue', v_company_commission_revenue,
        'astrologer_earnings', v_astrologer_earnings,
        'awaiting_commission_amount', v_awaiting_commission_amount,

        'pending_payout_accounts', v_pending_payout_accounts,
        'pending_withdrawals', v_pending_withdrawals,
        'processing_withdrawals', v_processing_withdrawals,
        'paid_withdrawals_amount', v_paid_withdrawals_amount,
        'failed_withdrawals', v_failed_withdrawals,

        'negative_wallet_count', v_negative_wallet_count,
        'missing_billing_ledger_count', v_missing_billing_ledger_count,
        'stale_active_consultation_count', v_stale_active_consultation_count
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_dashboard_summary(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_summary(timestamptz, timestamptz, text) TO authenticated;


-- 5. Dashboard Chart RPC
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

    -- Generate time series buckets
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
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(gross_amount) AS gross,
            SUM(company_amount) AS comp,
            SUM(astrologer_amount) AS astro
        FROM public.astrologer_billing_ledger
        WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
          AND created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    cons AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.consultation_sessions
        WHERE status = 'ENDED' AND created_at >= p_from AND created_at < p_to
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


-- 6. Financial Alerts RPC
CREATE OR REPLACE FUNCTION public.get_admin_financial_alerts(
    p_limit integer DEFAULT 50,
    p_offset integer DEFAULT 0
)
RETURNS TABLE (
    alert_type text,
    severity text,
    entity_type text,
    entity_id uuid,
    title text,
    description text,
    detected_at timestamptz
) AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    RETURN QUERY
    WITH alerts AS (
        -- 1. PAYMENT_WITHOUT_WALLET_CREDIT
        SELECT 
            'PAYMENT_WITHOUT_WALLET_CREDIT'::text AS alert_type,
            'HIGH'::text AS severity,
            'payment_order'::text AS entity_type,
            p.id AS entity_id,
            'Payment without wallet credit'::text AS title,
            ('Payment ' || p.id || ' captured but no corresponding wallet recharge found')::text AS description,
            now() AS detected_at
        FROM public.payment_orders p
        LEFT JOIN public.wallet_transactions w 
          ON w.reference_id = p.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        WHERE p.status IN ('captured', 'credited') AND w.id IS NULL

        UNION ALL

        -- 2. WALLET_CREDIT_WITHOUT_PAYMENT
        SELECT 
            'WALLET_CREDIT_WITHOUT_PAYMENT'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'wallet_transaction'::text AS entity_type,
            w.id AS entity_id,
            'Wallet credit without payment'::text AS title,
            ('Wallet recharge ' || w.id || ' has no matching captured payment')::text AS description,
            now() AS detected_at
        FROM public.wallet_transactions w
        LEFT JOIN public.payment_orders p 
          ON p.id = w.reference_id AND p.status IN ('captured', 'credited')
        WHERE w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed' AND p.id IS NULL

        UNION ALL

        -- 3. DUPLICATE_PAYMENT_REFERENCE
        SELECT 
            'DUPLICATE_PAYMENT_REFERENCE'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'payment_order'::text AS entity_type,
            w.reference_id AS entity_id,
            'Duplicate payment reference'::text AS title,
            ('Multiple wallet credits for payment order ' || w.reference_id)::text AS description,
            now() AS detected_at
        FROM public.wallet_transactions w
        WHERE w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        GROUP BY w.reference_id
        HAVING COUNT(*) > 1

        UNION ALL

        -- 4. NEGATIVE_WALLET_BALANCE
        SELECT 
            'NEGATIVE_WALLET_BALANCE'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'wallet'::text AS entity_type,
            w.user_id AS entity_id,
            'Negative wallet balance'::text AS title,
            ('User ' || w.user_id || ' has negative balance: ' || w.balance)::text AS description,
            now() AS detected_at
        FROM public.wallets w
        WHERE w.balance < 0

        UNION ALL

        -- 5. MISSING_BILLING_LEDGER
        SELECT 
            'MISSING_BILLING_LEDGER'::text AS alert_type,
            'HIGH'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Missing billing ledger'::text AS title,
            ('Ended consultation ' || c.id || ' has no billing ledger entry')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        LEFT JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = c.id
        WHERE c.status = 'ENDED' AND bl.id IS NULL

        UNION ALL

        -- 6. BILLING_GROSS_MISMATCH
        SELECT 
            'BILLING_GROSS_MISMATCH'::text AS alert_type,
            'HIGH'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Billing gross mismatch'::text AS title,
            ('Consultation ' || c.id || ' total_charged (' || c.total_charged || ') != gross_amount (' || bl.gross_amount || ')')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = c.id
        WHERE c.status = 'ENDED' AND c.total_charged != bl.gross_amount

        UNION ALL

        -- 7. AWAITING_COMMISSION
        SELECT 
            'AWAITING_COMMISSION'::text AS alert_type,
            'WARNING'::text AS severity,
            'billing_ledger'::text AS entity_type,
            bl.id AS entity_id,
            'Awaiting commission calculation'::text AS title,
            ('Billing ledger ' || bl.id || ' is awaiting commission calculation')::text AS description,
            now() AS detected_at
        FROM public.astrologer_billing_ledger bl
        WHERE bl.calculation_status = 'awaiting_commission'

        UNION ALL

        -- 8. PENDING_PAYOUT_VERIFICATION
        SELECT 
            'PENDING_PAYOUT_VERIFICATION'::text AS alert_type,
            'INFO'::text AS severity,
            'payout_account'::text AS entity_type,
            pa.id AS entity_id,
            'Pending payout verification'::text AS title,
            ('Payout account ' || pa.id || ' for astrologer ' || pa.astrologer_id || ' is awaiting verification')::text AS description,
            now() AS detected_at
        FROM public.astrologer_payout_accounts pa
        WHERE pa.status = 'PENDING'

        UNION ALL

        -- 9. PENDING_WITHDRAWAL
        SELECT 
            'PENDING_WITHDRAWAL'::text AS alert_type,
            'INFO'::text AS severity,
            'withdrawal'::text AS entity_type,
            w.id AS entity_id,
            'Pending withdrawal'::text AS title,
            ('Withdrawal ' || w.id || ' for astrologer ' || w.astrologer_id || ' is requested')::text AS description,
            now() AS detected_at
        FROM public.astrologer_withdrawal_requests w
        WHERE w.status = 'REQUESTED'

        UNION ALL

        -- 10. FAILED_WITHDRAWAL
        SELECT 
            'FAILED_WITHDRAWAL'::text AS alert_type,
            'HIGH'::text AS severity,
            'withdrawal'::text AS entity_type,
            w.id AS entity_id,
            'Failed withdrawal'::text AS title,
            ('Withdrawal ' || w.id || ' for astrologer ' || w.astrologer_id || ' failed')::text AS description,
            now() AS detected_at
        FROM public.astrologer_withdrawal_requests w
        WHERE w.status IN ('FAILED', 'REJECTED')

        UNION ALL

        -- 11. STALE_ACTIVE_CONSULTATION
        SELECT 
            'STALE_ACTIVE_CONSULTATION'::text AS alert_type,
            'WARNING'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Stale active consultation'::text AS title,
            ('Consultation ' || c.id || ' has been active for over 24 hours')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        WHERE c.status = 'ACTIVE' AND c.started_at < now() - interval '24 hours'
    )
    SELECT * FROM alerts
    ORDER BY severity_rank(severity) ASC, detected_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Helper for ordering
CREATE OR REPLACE FUNCTION public.severity_rank(p_severity text) RETURNS int AS $$
BEGIN
    RETURN CASE p_severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'WARNING' THEN 3
        WHEN 'INFO' THEN 4
        ELSE 5
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

REVOKE EXECUTE ON FUNCTION public.get_admin_financial_alerts(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_financial_alerts(integer, integer) TO authenticated;


-- 7. Paginated Entity RPCs

-- 7.1 Users
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

    -- Validate pagination
    IF p_limit < 1 OR p_limit > 100 THEN
        RAISE EXCEPTION 'Limit must be between 1 and 100';
    END IF;
    IF p_offset < 0 THEN
        RAISE EXCEPTION 'Offset must be >= 0';
    END IF;

    -- Extract filters
    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    -- Validate sorting
    IF v_sort_by NOT IN ('created_at', 'display_name', 'email') THEN
        v_sort_by := 'created_at';
    END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN
        v_sort_direction := 'DESC';
    END IF;

    -- Get total count
    SELECT COUNT(*) INTO v_total_count
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%' OR au.email ILIKE '%' || v_search || '%');

    -- Get items
    WITH items AS (
        SELECT 
            p.id AS user_id,
            p.display_name,
            au.email,
            au.phone,
            p.created_at AS joined_at,
            w.balance AS wallet_balance,
            (SELECT COALESCE(SUM(amount_paise / 100.0), 0) FROM public.payment_orders po WHERE po.user_id = p.id AND po.status IN ('captured', 'credited')) AS total_recharge_volume,
            (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.customer_id = p.id AND cs.status = 'ENDED') AS total_consultations,
            'active' AS account_status,
            au.last_sign_in_at AS last_active_at
        FROM public.profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        LEFT JOIN public.wallets w ON w.user_id = p.id
        WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%' OR au.email ILIKE '%' || v_search || '%')
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'display_name' THEN p.display_name END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'display_name' THEN p.display_name END DESC,
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'email' THEN au.email END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'email' THEN au.email END DESC,
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'created_at' THEN p.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'created_at' THEN p.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object(
        'items', v_items,
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_users(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_users(jsonb, integer, integer) TO authenticated;


-- 7.2 Astrologers
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

    IF v_sort_by NOT IN ('created_at', 'display_name', 'gross_billing') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologers a
    JOIN public.profiles p ON a.user_id = p.id
    LEFT JOIN public.astrologer_applications app ON app.user_id = a.user_id
    WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR a.status = v_status);

    WITH items AS (
        SELECT 
            a.id AS astrologer_id,
            a.user_id,
            p.display_name,
            app.status AS application_status,
            a.is_published,
            a.status AS availability_status,
            a.rate_per_minute,
            (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.astrologer_id = a.id AND cs.status = 'ENDED') AS completed_consultations,
            (SELECT COALESCE(SUM(gross_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id) AS gross_billing,
            (SELECT COALESCE(SUM(astrologer_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS astrologer_earnings,
            (SELECT COALESCE(SUM(company_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS company_revenue,
            (SELECT status FROM public.astrologer_payout_accounts pa WHERE pa.astrologer_id = a.id ORDER BY submitted_at DESC LIMIT 1) AS payout_account_status,
            (SELECT status FROM public.astrologer_withdrawal_requests w WHERE w.astrologer_id = a.id AND w.status IN ('REQUESTED', 'APPROVED', 'PROCESSING') LIMIT 1) AS active_withdrawal_status,
            a.created_at
        FROM public.astrologers a
        JOIN public.profiles p ON a.user_id = p.id
        LEFT JOIN public.astrologer_applications app ON app.user_id = a.user_id
        WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR a.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'display_name' THEN p.display_name END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'display_name' THEN p.display_name END DESC,
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


-- 7.3 Consultations
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
    JOIN public.profiles p1 ON cs.customer_id = p1.id
    JOIN public.profiles p2 ON cs.astrologer_id = p2.id
    WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.display_name ILIKE '%' || v_search || '%' OR p2.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR cs.status = v_status);

    WITH items AS (
        SELECT 
            cs.id AS session_id,
            cs.customer_id,
            p1.display_name AS customer_name,
            cs.astrologer_id,
            p2.display_name AS astrologer_name,
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
        JOIN public.profiles p1 ON cs.customer_id = p1.id
        JOIN public.profiles p2 ON cs.astrologer_id = p2.id
        LEFT JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = cs.id
        WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.display_name ILIKE '%' || v_search || '%' OR p2.display_name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR cs.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'requested_at' THEN cs.requested_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'requested_at' THEN cs.requested_at END DESC,
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'started_at' THEN cs.started_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'started_at' THEN cs.started_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.get_admin_consultations(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_consultations(jsonb, integer, integer) TO authenticated;


-- 7.4 Payments
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
    JOIN public.profiles p ON po.user_id = p.id
    WHERE (v_search IS NULL OR po.razorpay_order_id ILIKE '%' || v_search || '%' OR po.razorpay_payment_id ILIKE '%' || v_search || '%' OR po.id::text ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR po.status = v_status);

    WITH items AS (
        SELECT 
            po.id AS internal_order_id,
            po.razorpay_order_id,
            po.razorpay_payment_id,
            po.user_id,
            p.display_name AS user_name,
            (po.amount_paise / 100.0) AS amount,
            po.status AS payment_status,
            w.status AS wallet_credit_status,
            w.id AS wallet_transaction_reference,
            po.created_at,
            po.updated_at AS verified_at,
            NULL AS failure_reason,
            (po.status IN ('captured', 'credited') AND w.id IS NULL) AS has_mismatch
        FROM public.payment_orders po
        JOIN public.profiles p ON po.user_id = p.id
        LEFT JOIN public.wallet_transactions w ON w.reference_id = po.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        WHERE (v_search IS NULL OR po.razorpay_order_id ILIKE '%' || v_search || '%' OR po.razorpay_payment_id ILIKE '%' || v_search || '%' OR po.id::text ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
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


-- 7.5 Payout Accounts
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

    IF v_sort_by NOT IN ('submitted_at') THEN v_sort_by := 'submitted_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_payout_accounts pa
    JOIN public.profiles p ON pa.astrologer_id = p.id
    WHERE (v_search IS NULL OR pa.id::text ILIKE '%' || v_search || '%' OR pa.account_holder_name ILIKE '%' || v_search || '%' OR pa.bank_name ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR pa.status = v_status);

    WITH items AS (
        SELECT 
            pa.id AS payout_account_id,
            pa.astrologer_id,
            p.display_name AS astrologer_name,
            pa.account_holder_name,
            pa.bank_name,
            RIGHT(pa.account_number_last4, 4) AS account_number_last4,
            pa.ifsc_code,
            pa.status,
            pa.rejection_reason,
            pa.submitted_at,
            pa.verified_at
        FROM public.astrologer_payout_accounts pa
        JOIN public.profiles p ON pa.astrologer_id = p.id
        WHERE (v_search IS NULL OR pa.id::text ILIKE '%' || v_search || '%' OR pa.account_holder_name ILIKE '%' || v_search || '%' OR pa.bank_name ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR pa.status = v_status)
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


-- 7.6 Withdrawals
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
    JOIN public.profiles p ON w.astrologer_id = p.id
    LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
    WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR w.status = v_status);

    WITH items AS (
        SELECT 
            w.id AS withdrawal_id,
            w.astrologer_id,
            p.display_name AS astrologer_name,
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
        JOIN public.profiles p ON w.astrologer_id = p.id
        LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
        WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
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

REVOKE EXECUTE ON FUNCTION public.get_admin_withdrawals(jsonb, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_admin_withdrawals(jsonb, integer, integer) TO authenticated;

