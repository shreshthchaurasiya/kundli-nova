-- Migration: AI Subscription System MVP
-- Creates subscriptions, subscription_payments, ai_usage and related RPCs

CREATE TABLE public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  plan text NOT NULL CHECK (plan IN ('FREE', 'PRO', 'ELITE')),
  status text NOT NULL CHECK (status IN ('ACTIVE', 'CANCELLED', 'EXPIRED', 'SUSPENDED')),
  start_date timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expiry_date timestamp with time zone,
  payment_method text CHECK (payment_method IN ('WALLET', 'RAZORPAY', 'SYSTEM', 'ADMIN')),
  payment_reference text,
  amount numeric(10, 2) DEFAULT 0,
  auto_renew boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.subscription_payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id uuid REFERENCES public.subscriptions ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  amount numeric(10, 2) NOT NULL,
  payment_method text NOT NULL CHECK (payment_method IN ('WALLET', 'RAZORPAY', 'ADMIN')),
  transaction_reference text,
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'PENDING')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.ai_usage (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles ON DELETE CASCADE NOT NULL,
  usage_date date NOT NULL DEFAULT CURRENT_DATE,
  questions_used integer DEFAULT 0 NOT NULL,
  UNIQUE(user_id, usage_date)
);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription payments" ON public.subscription_payments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ai usage" ON public.ai_usage
  FOR SELECT USING (auth.uid() = user_id);

-- Trigger to auto-assign FREE plan on profile creation
CREATE OR REPLACE FUNCTION public.auto_assign_free_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, payment_method, amount)
  VALUES (NEW.id, 'FREE', 'ACTIVE', 'SYSTEM', 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_free_subscription();


-- Backfill FREE plan for existing users who don't have a subscription
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN SELECT id FROM public.profiles WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
  LOOP
    INSERT INTO public.subscriptions (user_id, plan, status, payment_method, amount)
    VALUES (rec.id, 'FREE', 'ACTIVE', 'SYSTEM', 0);
  END LOOP;
END;
$$;


-- RPC to handle Wallet upgrade
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
BEGIN
  -- Verify inputs
  IF p_plan NOT IN ('PRO', 'ELITE') THEN
    RAISE EXCEPTION 'Invalid plan for upgrade';
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

  -- Create / Update Subscription (Cancel old active)
  UPDATE public.subscriptions 
  SET status = 'CANCELLED' 
  WHERE user_id = p_user_id AND status = 'ACTIVE';

  INSERT INTO public.subscriptions (user_id, plan, status, start_date, expiry_date, payment_method, amount)
  VALUES (p_user_id, p_plan, 'ACTIVE', now(), v_expiry, 'WALLET', p_amount)
  RETURNING id INTO v_subscription_id;

  -- Log Payment
  INSERT INTO public.subscription_payments (subscription_id, user_id, amount, payment_method, status)
  VALUES (v_subscription_id, p_user_id, p_amount, 'WALLET', 'SUCCESS');

  RETURN jsonb_build_object('success', true, 'subscription_id', v_subscription_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC for Admin Subscriptions Fetch
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
  WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%')
    AND (v_status IS NULL OR s.status = v_status);

  WITH items AS (
    SELECT 
      s.id,
      s.user_id,
      p.display_name as user_name,
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
    WHERE (v_search IS NULL OR p.display_name ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR s.status = v_status)
    ORDER BY s.created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  )
  SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

  RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- RPC for Razorpay Success Flow
CREATE OR REPLACE FUNCTION public.process_razorpay_subscription(
  p_user_id uuid,
  p_plan text,
  p_amount numeric,
  p_duration_months integer,
  p_razorpay_payment_id text,
  p_razorpay_order_id text
)
RETURNS jsonb AS $$
DECLARE
  v_subscription_id uuid;
  v_expiry timestamp with time zone;
BEGIN
  -- Normally, backend validates razorpay signature before calling this.
  
  -- Calculate Expiry
  v_expiry := now() + (p_duration_months || ' months')::interval;

  -- Cancel old active
  UPDATE public.subscriptions 
  SET status = 'CANCELLED' 
  WHERE user_id = p_user_id AND status = 'ACTIVE';

  -- Create Subscription
  INSERT INTO public.subscriptions (user_id, plan, status, start_date, expiry_date, payment_method, payment_reference, amount)
  VALUES (p_user_id, p_plan, 'ACTIVE', now(), v_expiry, 'RAZORPAY', p_razorpay_order_id, p_amount)
  RETURNING id INTO v_subscription_id;

  -- Log Payment
  INSERT INTO public.subscription_payments (subscription_id, user_id, amount, payment_method, transaction_reference, status)
  VALUES (v_subscription_id, p_user_id, p_amount, 'RAZORPAY', p_razorpay_payment_id, 'SUCCESS');

  RETURN jsonb_build_object('success', true, 'subscription_id', v_subscription_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
