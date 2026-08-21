-- Fix RPC get_admin_subscriptions column name error

CREATE OR REPLACE FUNCTION public.get_admin_subscriptions(
  p_filters jsonb DEFAULT '{}'::jsonb,
  p_limit integer DEFAULT 25,
  p_offset integer DEFAULT 0
)
RETURNS jsonb AS $$
DECLARE
  v_search text;
  v_status text;
  v_total_count bigint;
  v_items jsonb;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  v_search := NULLIF(TRIM(p_filters->>'search'), '');
  v_status := NULLIF(TRIM(p_filters->>'status'), '');

  SELECT COUNT(*) INTO v_total_count
  FROM public.subscriptions s
  JOIN public.profiles p ON s.user_id = p.id
  WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%')
    AND (v_status IS NULL OR s.status = v_status);

  WITH items AS (
    SELECT
      s.id,
      s.user_id,
      p.name as user_name,
      p.email as user_email,
      p.phone as user_phone,
      s.plan,
      s.status,
      s.start_date,
      s.expiry_date,
      s.payment_method,
      s.amount
    FROM public.subscriptions s
    JOIN public.profiles p ON s.user_id = p.id
    WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR s.status = v_status)
    ORDER BY s.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
