-- Demo wallet mode: use an authenticated, per-user database operation until a
-- payment gateway is connected. Disable private.app_config.demo_wallet_enabled
-- before production/payment launch.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.app_config (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into private.app_config (key, enabled)
values ('demo_wallet_enabled', true)
on conflict (key) do update set enabled = excluded.enabled, updated_at = now();

-- Remove only untouched welcome-seed balances. Wallets with a real transaction
-- history are deliberately left unchanged.
update public.wallets w
set balance = 0.00, updated_at = now()
where w.balance = 150.00
  and not exists (
    select 1 from public.wallet_transactions t where t.user_id = w.user_id
  );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, email, name, created_at)
  values (
    new.id,
    new.phone,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Guest'),
    new.created_at
  );

  insert into public.wallets (user_id, balance)
  values (new.id, 0.00);

  return new;
end;
$$;

create unique index if not exists uq_wallet_tx_user_reference
on public.wallet_transactions (user_id, reference_id)
where reference_id is not null;

create or replace function public.demo_recharge_wallet(
  p_amount numeric,
  p_idempotency_key uuid
)
returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_wallet public.wallets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not coalesce((select enabled from private.app_config where key = 'demo_wallet_enabled'), false) then
    raise exception 'Demo wallet is disabled';
  end if;
  if p_amount < 1 or p_amount > 10000 then
    raise exception 'Recharge amount must be between 1 and 10000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0));

  if exists (
    select 1 from public.wallet_transactions
    where user_id = v_user_id and reference_id = p_idempotency_key
  ) then
    select * into v_wallet from public.wallets where user_id = v_user_id;
    return v_wallet;
  end if;

  update public.wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = v_user_id
  returning * into v_wallet;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found';
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, title, description, status, reference_type, reference_id)
  values
    (v_user_id, 'credit', p_amount, 'Wallet Recharge (Demo)', 'Demo mode — no payment captured', 'completed', 'recharge', p_idempotency_key);

  return v_wallet;
end;
$$;

create or replace function public.demo_debit_wallet(
  p_amount numeric,
  p_idempotency_key uuid
)
returns public.wallets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_wallet public.wallets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not coalesce((select enabled from private.app_config where key = 'demo_wallet_enabled'), false) then
    raise exception 'Demo wallet is disabled';
  end if;
  if p_amount <= 0 or p_amount > 10000 then
    raise exception 'Debit amount must be between 0 and 10000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0));

  if exists (
    select 1 from public.wallet_transactions
    where user_id = v_user_id and reference_id = p_idempotency_key
  ) then
    select * into v_wallet from public.wallets where user_id = v_user_id;
    return v_wallet;
  end if;

  update public.wallets
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_user_id and balance >= p_amount
  returning * into v_wallet;

  if v_wallet.user_id is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, title, description, status, reference_type, reference_id)
  values
    (v_user_id, 'debit', p_amount, 'Consultation Session Charge', 'Demo consultation billing', 'completed', 'consultation', p_idempotency_key);

  return v_wallet;
end;
$$;

revoke execute on function public.demo_recharge_wallet(numeric, uuid) from public, anon;
revoke execute on function public.demo_debit_wallet(numeric, uuid) from public, anon;
grant execute on function public.demo_recharge_wallet(numeric, uuid) to authenticated;
grant execute on function public.demo_debit_wallet(numeric, uuid) to authenticated;
