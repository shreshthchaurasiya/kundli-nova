-- 20260727140000_astrologer_payout_accounts.sql

create extension if not exists supabase_vault with schema vault;

create table public.astrologer_payout_accounts (
  id uuid primary key default gen_random_uuid(),
  astrologer_id uuid not null unique references public.astrologers(id) on delete cascade,
  account_holder_name text not null,
  bank_name text not null,
  account_number_secret_id uuid not null,
  account_number_last4 text not null check (length(account_number_last4) = 4),
  ifsc_code text not null check (ifsc_code ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  status text not null default 'PENDING' check (status in ('PENDING', 'VERIFIED', 'REJECTED')),
  rejection_reason text check (
    (status = 'REJECTED' and rejection_reason is not null) or
    (status <> 'REJECTED' and rejection_reason is null)
  ),
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.astrologer_payout_accounts enable row level security;

-- Astrologers can view their own masked account info.
create policy "Astrologers can view their own payout account"
  on public.astrologer_payout_accounts
  for select
  to authenticated
  using (
    astrologer_id in (select id from public.astrologers where user_id = auth.uid())
  );

-- Admins can view all
create policy "Admins can view all payout accounts"
  on public.astrologer_payout_accounts
  for select
  to authenticated
  using (
    exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin')
  );

revoke all on public.astrologer_payout_accounts from public, anon;
grant select on public.astrologer_payout_accounts to authenticated;

-- RPC for fetching my account safely
create or replace function public.get_my_payout_account()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_account public.astrologer_payout_accounts;
begin
  select id into v_astrologer_id from public.astrologers where user_id = (select auth.uid());
  if not found then
    return null;
  end if;

  select * into v_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id;

  if not found then
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'id', v_account.id,
    'account_holder_name', v_account.account_holder_name,
    'bank_name', v_account.bank_name,
    'account_number_last4', v_account.account_number_last4,
    'ifsc_code', v_account.ifsc_code,
    'status', v_account.status,
    'rejection_reason', v_account.rejection_reason,
    'submitted_at', v_account.submitted_at,
    'verified_at', v_account.verified_at
  );
end;
$$;

-- RPC for submitting an account
create or replace function public.submit_my_payout_account(
  p_account_holder_name text,
  p_bank_name text,
  p_account_number text,
  p_ifsc_code text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer_id uuid;
  v_account public.astrologer_payout_accounts;
  v_secret_id uuid;
  v_last4 text;
  v_now timestamptz := pg_catalog.now();
  v_uppercase_ifsc text;
begin
  select id into v_astrologer_id from public.astrologers where user_id = (select auth.uid());
  if not found then
    raise exception 'Astrologer profile not found';
  end if;

  if pg_catalog.length(p_account_number) < 4 then
    raise exception 'Account number is too short';
  end if;

  v_uppercase_ifsc := pg_catalog.upper(p_ifsc_code);
  if v_uppercase_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
    raise exception 'Invalid IFSC code format';
  end if;

  v_last4 := pg_catalog.right(p_account_number, 4);
  v_secret_id := vault.create_secret(p_account_number, 'astrologer_payout_' || v_astrologer_id::text, 'Payout account number');

  select * into v_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id
  for update;

  if found then
    if v_account.status in ('PENDING', 'VERIFIED') then
      raise exception 'Cannot update an account that is %', v_account.status;
    end if;

    -- Replace the submitted details securely
    update public.astrologer_payout_accounts
    set account_holder_name = p_account_holder_name,
        bank_name = p_bank_name,
        account_number_secret_id = v_secret_id,
        account_number_last4 = v_last4,
        ifsc_code = v_uppercase_ifsc,
        status = 'PENDING',
        rejection_reason = null,
        verified_at = null,
        verified_by = null,
        submitted_at = v_now,
        updated_at = v_now
    where id = v_account.id;
  else
    insert into public.astrologer_payout_accounts (
      astrologer_id, account_holder_name, bank_name, account_number_secret_id,
      account_number_last4, ifsc_code, status, submitted_at, updated_at
    ) values (
      v_astrologer_id, p_account_holder_name, p_bank_name, v_secret_id,
      v_last4, v_uppercase_ifsc, 'PENDING', v_now, v_now
    );
  end if;

  return public.get_my_payout_account();
end;
$$;

-- Admin RPC
create or replace function public.admin_verify_payout_account(
  p_account_id uuid,
  p_status text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_account public.astrologer_payout_accounts;
  v_now timestamptz := pg_catalog.now();
  v_admin_id uuid := (select auth.uid());
begin
  if not exists (select 1 from public.account_roles where user_id = v_admin_id and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if p_status not in ('VERIFIED', 'REJECTED') then
    raise exception 'Status must be VERIFIED or REJECTED';
  end if;

  if p_status = 'REJECTED' and (p_reason is null or pg_catalog.trim(p_reason) = '') then
    raise exception 'Rejection reason is required';
  end if;

  select * into v_account
  from public.astrologer_payout_accounts
  where id = p_account_id
  for update;

  if not found then
    raise exception 'Payout account not found';
  end if;

  if v_account.status = 'VERIFIED' then
    raise exception 'Account is already verified';
  end if;

  update public.astrologer_payout_accounts
  set status = p_status,
      rejection_reason = case when p_status = 'REJECTED' then p_reason else null end,
      verified_at = case when p_status = 'VERIFIED' then v_now else null end,
      verified_by = case when p_status = 'VERIFIED' then v_admin_id else null end,
      updated_at = v_now
  where id = p_account_id
  returning * into v_account;

  return pg_catalog.jsonb_build_object(
    'id', v_account.id,
    'status', v_account.status,
    'rejection_reason', v_account.rejection_reason
  );
end;
$$;

revoke all on function public.get_my_payout_account() from public, anon;
grant execute on function public.get_my_payout_account() to authenticated;

revoke all on function public.submit_my_payout_account(text, text, text, text) from public, anon;
grant execute on function public.submit_my_payout_account(text, text, text, text) to authenticated;

revoke all on function public.admin_verify_payout_account(uuid, text, text) from public, anon;
grant execute on function public.admin_verify_payout_account(uuid, text, text) to authenticated;
