-- Migration: Razorpay Integration
-- Adds payment_orders, payment_refunds, and atomic process_razorpay_payment RPC.

-- 1. Payment Orders Table
create table public.payment_orders (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles on delete cascade not null,
  package_id text not null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  status text not null default 'created' check (status in ('created', 'authorized', 'captured', 'failed', 'credited', 'refunded', 'partially_refunded')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_payment_orders_user on public.payment_orders(user_id);
create index idx_payment_orders_rzp_order on public.payment_orders(razorpay_order_id);

alter table public.payment_orders enable row level security;
create policy "Select payment orders" on public.payment_orders for select using (auth.uid() = user_id);

-- 2. Payment Refunds Table
create table public.payment_refunds (
  id uuid default gen_random_uuid() primary key,
  payment_order_id uuid references public.payment_orders on delete cascade not null,
  razorpay_refund_id text unique not null,
  razorpay_payment_id text not null,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'processed',
  reconciliation_status text not null default 'pending',
  metadata jsonb default '{}'::jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_payment_refunds_order on public.payment_refunds(payment_order_id);

alter table public.payment_refunds enable row level security;
create policy "Select payment refunds" on public.payment_refunds for select using (
  exists (
    select 1 from public.payment_orders
    where id = payment_refunds.payment_order_id and user_id = auth.uid()
  )
);

-- 3. Atomic RPC for crediting wallet
create or replace function public.process_razorpay_payment(
  p_order_id uuid,
  p_razorpay_payment_id text
)
returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.payment_orders;
  v_wallet public.wallets;
  v_amount_rupees numeric(10,2);
begin
  -- Ensure only service_role can execute this
  if current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' then
    raise exception 'Unauthorized: Only backend proxy can process razorpay payments';
  end if;

  -- 1. Lock the order row
  select * into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if v_order is null then
    raise exception 'Payment order not found';
  end if;

  -- 2. Verify idempotency and state transitions
  if v_order.status = 'credited' then
    if v_order.razorpay_payment_id = p_razorpay_payment_id then
      -- Idempotent success
      select * into v_wallet from public.wallets where user_id = v_order.user_id;
      return v_wallet;
    else
      raise exception 'Payment order already credited with a different payment ID';
    end if;
  end if;

  if v_order.status in ('refunded', 'partially_refunded') then
    raise exception 'Payment order already refunded, cannot credit.';
  end if;

  -- 3. Insert wallet if missing, then lock it
  insert into public.wallets (user_id, balance)
  values (v_order.user_id, 0.00)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = v_order.user_id
  for update;

  if v_wallet is null then
    raise exception 'Wallet could not be locked or found';
  end if;

  -- 4. Credit the wallet
  v_amount_rupees := v_order.amount_paise / 100.0;
  
  update public.wallets
  set balance = balance + v_amount_rupees,
      updated_at = now()
  where user_id = v_order.user_id
  returning * into v_wallet;

  -- 5. Insert wallet transaction
  insert into public.wallet_transactions (
    user_id, type, amount, title, description, status, reference_type, reference_id
  ) values (
    v_order.user_id, 'credit', v_amount_rupees, 'Wallet Recharge', 'Razorpay recharge (Test)', 'completed', 'recharge', v_order.id
  );

  -- 6. Update order status
  update public.payment_orders
  set status = 'credited',
      razorpay_payment_id = p_razorpay_payment_id,
      updated_at = now()
  where id = v_order.id;

  return v_wallet;
end;
$$;

revoke all on function public.process_razorpay_payment(uuid, text) from public, anon, authenticated;
grant execute on function public.process_razorpay_payment(uuid, text) to service_role;
