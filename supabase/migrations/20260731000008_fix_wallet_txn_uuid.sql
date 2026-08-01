-- Fix wallet_transactions reference_id type cast

CREATE OR REPLACE FUNCTION public.upgrade_subscription_wallet(
  p_user_id uuid,
  p_plan text,
  p_amount numeric,
  p_duration_months integer
)
RETURNS jsonb AS $$
DECLARE
  v_wallet_balance numeric;
  v_subscription_id uuid;
  v_expiry timestamp with time zone;
  v_plan_exists boolean;
BEGIN
  -- Verify plan exists
  SELECT EXISTS(SELECT 1 FROM public.subscription_plans WHERE name = p_plan AND is_active = true) INTO v_plan_exists;
  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'Invalid or inactive plan for upgrade';
  END IF;

  -- Check wallet balance
  SELECT COALESCE(SUM(
    CASE
      WHEN type = 'credit' THEN amount
      WHEN type = 'debit' THEN -amount
      ELSE 0
    END
  ), 0) INTO v_wallet_balance
  FROM public.wallet_transactions
  WHERE user_id = p_user_id AND status = 'completed';

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Wallet Balance';
  END IF;

  -- Calculate Expiry
  v_expiry := now() + (p_duration_months || ' months')::interval;

  -- Cancel old active
  UPDATE public.subscriptions
  SET status = 'CANCELLED'
  WHERE user_id = p_user_id AND status = 'ACTIVE';

  -- Create Subscription
  INSERT INTO public.subscriptions (user_id, plan, status, start_date, expiry_date, payment_method, amount)
  VALUES (p_user_id, p_plan, 'ACTIVE', now(), v_expiry, 'WALLET', p_amount)
  RETURNING id INTO v_subscription_id;

  -- Deduct wallet
  INSERT INTO public.wallet_transactions (user_id, type, amount, title, description, status, reference_type, reference_id)
  VALUES (p_user_id, 'debit', p_amount, 'Subscription', 'Upgraded to ' || p_plan || ' plan', 'completed', 'subscription', v_subscription_id);

  RETURN jsonb_build_object(
    'success', true,
    'subscription_id', v_subscription_id,
    'plan', p_plan,
    'expiry', v_expiry
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
