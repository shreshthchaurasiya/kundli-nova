-- Create RPC for Admin AI Subscription Stats

CREATE OR REPLACE FUNCTION public.get_admin_subscription_stats()
RETURNS jsonb AS $$
DECLARE
  v_total_revenue numeric;
  v_plan_stats jsonb;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  -- Total revenue from AI Subscriptions
  SELECT COALESCE(SUM(amount), 0) INTO v_total_revenue 
  FROM public.subscriptions 
  WHERE plan != 'FREE';

  -- Group by plan
  WITH stats AS (
    SELECT plan, COUNT(*) as count
    FROM public.subscriptions
    WHERE status = 'ACTIVE'
    GROUP BY plan
  )
  SELECT COALESCE(jsonb_agg(row_to_json(stats)), '[]'::jsonb) INTO v_plan_stats FROM stats;

  RETURN jsonb_build_object(
    'total_revenue', v_total_revenue,
    'plan_counts', v_plan_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
