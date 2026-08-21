-- Update RPC for Admin AI Subscription Stats to include all plans (even with 0 subscribers)

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

  -- Group by all active plans
  WITH all_plans AS (
    SELECT name as plan
    FROM public.subscription_plans
    WHERE is_active = true
  ),
  stats AS (
    SELECT p.plan, COUNT(s.id) as count
    FROM all_plans p
    LEFT JOIN public.subscriptions s ON s.plan = p.plan AND s.status = 'ACTIVE'
    GROUP BY p.plan
  )
  SELECT COALESCE(jsonb_agg(row_to_json(stats)), '[]'::jsonb) INTO v_plan_stats FROM stats;

  RETURN jsonb_build_object(
    'total_revenue', v_total_revenue,
    'plan_counts', v_plan_stats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
