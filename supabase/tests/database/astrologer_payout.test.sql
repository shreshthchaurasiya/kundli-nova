begin;
select plan(19);

-- 1. Setup users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'astro1@test.com'),
  ('00000000-0000-0000-0000-000000000002', 'astro2@test.com'),
  ('00000000-0000-0000-0000-000000000003', 'admin@test.com');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'Astro 1'),
  ('00000000-0000-0000-0000-000000000002', 'Astro 2'),
  ('00000000-0000-0000-0000-000000000003', 'Admin');

insert into public.account_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000001', 'astrologer'),
  ('00000000-0000-0000-0000-000000000002', 'astrologer'),
  ('00000000-0000-0000-0000-000000000003', 'admin');

insert into public.astrologers (id, user_id, status, is_published, bio, experience_years) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ONLINE', true, 'Bio', 5),
  ('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'ONLINE', true, 'Bio', 5);

-- Test 1: Submit payout account (Astro 1)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

select lives_ok(
  $$ select public.submit_my_payout_account('John Doe', 'HDFC', '123456789012', 'HDFC0001234') $$,
  'Astrologer 1 can submit payout account'
);

-- Test 2: Cannot submit duplicate (it updates instead, since we use the RPC)
select throws_like(
  $$ select public.submit_my_payout_account('John Doe', 'HDFC', '123456789012', 'HDFC0001234') $$,
  '%Cannot update an account that is PENDING%',
  'Astrologer 1 cannot update while PENDING'
);

-- Test 3: Fetching returns masked info
declare
  v_res jsonb;
begin
  v_res := public.get_my_payout_account();
  select is(v_res->>'account_number_last4', '9012', 'Account number is masked');
  select is(v_res->>'account_holder_name', 'John Doe', 'Holder name is correct');
  select is(v_res->>'status', 'PENDING', 'Status is PENDING');
  select ok(not (v_res ? 'account_number_secret_id'), 'Secret ID is not exposed to frontend');
end;

-- Test 4: Cannot view Astro 1's account from Astro 2
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);

declare
  v_res2 jsonb;
begin
  v_res2 := public.get_my_payout_account();
  select is(v_res2, null, 'Astro 2 gets null for their own account since not submitted');
end;

select is_empty(
  $$ select id from public.astrologer_payout_accounts where astrologer_id = 'a0000000-0000-0000-0000-000000000001' $$,
  'Astro 2 cannot select Astro 1 account due to RLS'
);

-- Test 5: Admin verification
-- Switch to Admin
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000003"}', true);

declare
  v_account_id uuid;
  v_res jsonb;
begin
  select id into v_account_id from public.astrologer_payout_accounts where astrologer_id = 'a0000000-0000-0000-0000-000000000001';
  
  -- Admin can see it
  select is(count(*)::int, 1, 'Admin can see account through RLS')
  from public.astrologer_payout_accounts;

  -- Admin can verify
  v_res := public.admin_verify_payout_account(v_account_id, 'VERIFIED');
  select is(v_res->>'status', 'VERIFIED', 'Admin verified the account successfully');
end;

-- Test 6: Non-admin cannot verify
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);

declare
  v_account_id uuid;
begin
  select id into v_account_id from public.astrologer_payout_accounts where astrologer_id = 'a0000000-0000-0000-0000-000000000001';
  
  select throws_like(
    $$ select public.admin_verify_payout_account('$$ || coalesce(v_account_id, '00000000-0000-0000-0000-000000000000'::uuid)::text || $$', 'VERIFIED') $$,
    '%Unauthorized%',
    'Non-admin cannot call verify RPC'
  );
end;

-- Test 7: Astrologer cannot edit VERIFIED account
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

select throws_like(
  $$ select public.submit_my_payout_account('John Doe', 'HDFC', '123456789012', 'HDFC0001234') $$,
  '%Cannot update an account that is VERIFIED%',
  'Astrologer 1 cannot update while VERIFIED'
);

-- Test 8: Admin rejection requires reason
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000003"}', true);

-- We need a second account to reject
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);
select public.submit_my_payout_account('Jane Doe', 'ICICI', '9876543210', 'ICIC0001234');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000003"}', true);

declare
  v_account_id uuid;
  v_res jsonb;
begin
  select id into v_account_id from public.astrologer_payout_accounts where astrologer_id = 'a0000000-0000-0000-0000-000000000002';
  
  -- Missing reason
  select throws_like(
    $$ select public.admin_verify_payout_account('$$ || v_account_id::text || $$', 'REJECTED') $$,
    '%Rejection reason is required%',
    'Rejection requires a reason'
  );

  -- Valid reason
  v_res := public.admin_verify_payout_account(v_account_id, 'REJECTED', 'Invalid IFSC code');
  select is(v_res->>'status', 'REJECTED', 'Admin rejected the account successfully');
  select is(v_res->>'rejection_reason', 'Invalid IFSC code', 'Rejection reason is saved');
end;

-- Test 9: Resubmitting REJECTED resets to PENDING
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000002"}', true);

declare
  v_res jsonb;
begin
  v_res := public.submit_my_payout_account('Jane Doe Updated', 'ICICI', '9876543211', 'ICIC0001234');
  select is(v_res->>'status', 'PENDING', 'Resubmitted account is PENDING');
  select is(v_res->>'account_holder_name', 'Jane Doe Updated', 'Details were updated');
  select is(v_res->>'rejection_reason', null, 'Rejection reason is cleared');
end;

-- Test 10: IFSC code format constraint
select throws_like(
  $$ select public.submit_my_payout_account('Jane Doe', 'ICICI', '12345678', 'INVALIDIFSC') $$,
  '%Invalid IFSC code format%',
  'Invalid IFSC format is blocked'
);

-- Test 11: Vault secret actually stored
set local role postgres; -- elevated
select ok(
  exists (
    select 1 from vault.secrets 
    join public.astrologer_payout_accounts p on p.account_number_secret_id = vault.secrets.id
  ),
  'Vault secret was created successfully'
);

select * from finish();
rollback;
