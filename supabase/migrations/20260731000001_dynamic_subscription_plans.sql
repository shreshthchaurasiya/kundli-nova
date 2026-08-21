-- Migration: Dynamic Subscription Plans

CREATE TABLE public.subscription_plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  price numeric(10, 2) NOT NULL DEFAULT 0,
  ai_limit_per_day integer NOT NULL DEFAULT 5,
  features jsonb DEFAULT '[]'::jsonb,
  is_premium_ui boolean DEFAULT false,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- Insert default plans
INSERT INTO public.subscription_plans (name, description, price, ai_limit_per_day, features, is_premium_ui, is_default)
VALUES 
  ('FREE', 'For basic usage', 0, 5, '["5 AI Questions per day", "Basic Kundli", "Basic Chat History"]'::jsonb, false, true),
  ('PRO', 'For regular users', 199, 30, '["30 AI Questions per day", "Full Kundli Analysis", "Advanced relationship insights"]'::jsonb, false, false),
  ('ELITE', 'For astrology enthusiasts', 499, 100, '["100 AI Questions per day", "Premium AI Priority", "Detailed Transit (Gochar) Reports"]'::jsonb, true, false);

-- Modify subscriptions table to remove CHECK constraint on plan
-- Postgres doesn't easily drop a specific CHECK constraint without its name, so we must find it or alter type.
-- But wait, we can just do:
ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check;

-- Update the auto-assign trigger to use the default plan name instead of hardcoded 'FREE' (Though 'FREE' works since we inserted it)
CREATE OR REPLACE FUNCTION public.auto_assign_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
  v_default_plan text;
BEGIN
  SELECT name INTO v_default_plan FROM public.subscription_plans WHERE is_default = true LIMIT 1;
  IF v_default_plan IS NULL THEN
    v_default_plan := 'FREE';
  END IF;

  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, amount)
  VALUES (NEW.id, v_default_plan, 'ACTIVE', 'SYSTEM', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update upgrade RPC to not check against hardcoded plans
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
  FROM public.wallet_ledger
  WHERE user_id = p_user_id AND status = 'completed';

  IF v_wallet_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient Wallet Balance';
  END IF;

  -- Deduct wallet
  INSERT INTO public.wallet_ledger (user_id, type, amount, category, description, status)
  VALUES (p_user_id, 'debit', p_amount, 'Subscription', 'Upgraded to ' || p_plan || ' plan', 'completed');

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

  -- Log Payment
  INSERT INTO public.subscription_payments (subscription_id, user_id, amount, payment_method, status)
  VALUES (v_subscription_id, p_user_id, p_amount, 'WALLET', 'SUCCESS');

  RETURN jsonb_build_object('success', true, 'subscription_id', v_subscription_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Admin RPC to Create Plan
CREATE OR REPLACE FUNCTION public.admin_create_subscription_plan(
  p_name text,
  p_description text,
  p_price numeric,
  p_ai_limit_per_day integer,
  p_features jsonb,
  p_is_premium_ui boolean
)
RETURNS jsonb AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  INSERT INTO public.subscription_plans (name, description, price, ai_limit_per_day, features, is_premium_ui, is_active, is_default)
  VALUES (p_name, p_description, p_price, p_ai_limit_per_day, p_features, p_is_premium_ui, true, false)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'id', v_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Admin RPC to Update Plan
CREATE OR REPLACE FUNCTION public.admin_update_subscription_plan(
  p_id uuid,
  p_name text,
  p_description text,
  p_price numeric,
  p_ai_limit_per_day integer,
  p_features jsonb,
  p_is_premium_ui boolean,
  p_is_active boolean
)
RETURNS jsonb AS $$
BEGIN
  PERFORM public.assert_current_user_is_admin();

  UPDATE public.subscription_plans
  SET 
    name = p_name,
    description = p_description,
    price = p_price,
    ai_limit_per_day = p_ai_limit_per_day,
    features = p_features,
    is_premium_ui = p_is_premium_ui,
    is_active = p_is_active
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Admin RPC to fetch plans (including inactive ones)
CREATE OR REPLACE FUNCTION public.get_admin_subscription_plans()
RETURNS jsonb AS $$
DECLARE
  v_items jsonb;
BEGIN
  PERFORM public.assert_current_user_is_admin();

  SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb) INTO v_items
  FROM (
    SELECT * FROM public.subscription_plans ORDER BY price ASC
  ) p;

  RETURN jsonb_build_object('items', v_items);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
