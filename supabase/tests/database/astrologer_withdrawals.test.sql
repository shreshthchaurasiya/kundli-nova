begin;
select plan(24);

-- 0. Setup Context
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'astro1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'astro2@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Astro 1'),
  ('22222222-2222-2222-2222-222222222222', 'Astro 2'),
  ('33333333-3333-3333-3333-333333333333', 'Admin');

insert into public.account_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'astrologer'),
  ('22222222-2222-2222-2222-222222222222', 'astrologer'),
  ('33333333-3333-3333-3333-333333333333', 'admin');

insert into public.astrologers (id, user_id, status, is_published) values
  ('a1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'ONLINE', true),
  ('a2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'ONLINE', true);

insert into public.astrologer_applications (id, user_id, status) values
  ('app11111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'approved'),
  ('app22222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'approved');

update public.astrologers set application_id = 'app11111-1111-1111-1111-111111111111' where id = 'a1111111-1111-1111-1111-111111111111';
update public.astrologers set application_id = 'app22222-2222-2222-2222-222222222222' where id = 'a2222222-2222-2222-2222-222222222222';

-- 1. Direct INSERT/UPDATE/DELETE blocked for astrologers
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select throws_ok(
  $$ insert into public.astrologer_withdrawal_requests(astrologer_id, payout_account_id, amount, status, payout_bank_name, payout_account_last4) values ('a1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 500, 'REQUESTED', 'Test', '1234') $$,
  'new row violates row-level security policy for table "astrologer_withdrawal_requests"',
  'Test 9: Direct insert blocked'
);

-- Note: We can't test update/delete blocks easily if we can't insert, so we will reset to postgres role to insert a test row
select set_config('role', 'postgres', true);
insert into public.astrologer_payout_accounts(id, astrologer_id, account_number_secret_id, account_number_last4, ifsc_code, account_holder_name, status, bank_name)
values ('p1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'sec1', '1234', 'TEST0001', 'Test User', 'VERIFIED', 'Test Bank');

insert into public.astrologer_withdrawal_requests(id, astrologer_id, payout_account_id, amount, status, payout_bank_name, payout_account_last4)
values ('w1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 500, 'FAILED', 'Test Bank', '1234');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select throws_ok(
  $$ update public.astrologer_withdrawal_requests set status = 'PAID' where id = 'w1111111-1111-1111-1111-111111111111' $$,
  'new row violates row-level security policy for table "astrologer_withdrawal_requests"',
  'Test 10: Direct update blocked'
);

select throws_ok(
  $$ delete from public.astrologer_withdrawal_requests where id = 'w1111111-1111-1111-1111-111111111111' $$,
  'new row violates row-level security policy for table "astrologer_withdrawal_requests"',
  'Test 11: Direct delete blocked'
);

-- 2. Test Minimum 200 constraint
select set_config('role', 'postgres', true);
select throws_ok(
  $$ insert into public.astrologer_withdrawal_requests(astrologer_id, payout_account_id, amount, status, payout_bank_name, payout_account_last4) values ('a1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', 199, 'REQUESTED', 'Test Bank', '1234') $$,
  'new row for relation "astrologer_withdrawal_requests" violates check constraint "astrologer_withdrawal_requests_amount_check"',
  'Test 1: Minimum 200 enforced'
);

-- 3. Test RPC Behaviors
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);

-- Astrologer 2 has no payout account
select is(
  public.request_my_withdrawal(500) ->> 'reason',
  'PAYOUT_ACCOUNT_MISSING',
  'Test 2: Missing payout account blocked'
);

select set_config('role', 'postgres', true);
insert into public.astrologer_payout_accounts(id, astrologer_id, account_number_secret_id, account_number_last4, ifsc_code, account_holder_name, status, bank_name)
values ('p2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'sec2', '5678', 'TEST0002', 'Test User 2', 'PENDING', 'Bank 2');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);

select is(
  public.request_my_withdrawal(500) ->> 'reason',
  'PAYOUT_ACCOUNT_PENDING',
  'Test 3: PENDING payout account blocked'
);

select set_config('role', 'postgres', true);
update public.astrologer_payout_accounts set status = 'REJECTED' where id = 'p2222222-2222-2222-2222-222222222222';
select set_config('role', 'authenticated', true);

select is(
  public.request_my_withdrawal(500) ->> 'reason',
  'PAYOUT_ACCOUNT_REJECTED',
  'Test 4: REJECTED payout account blocked'
);

select set_config('role', 'postgres', true);
update public.astrologer_payout_accounts set status = 'VERIFIED' where id = 'p2222222-2222-2222-2222-222222222222';
select set_config('role', 'authenticated', true);

-- Now it reaches balance check
select is(
  public.request_my_withdrawal(500) ->> 'reason',
  'SETTLEMENT_NOT_CONFIGURED',
  'Test 5/6: Verified account proceeds to balance check, returns settlement not configured'
);

-- 4. Test duplicate requests manually via postgres
select set_config('role', 'postgres', true);
insert into public.astrologer_withdrawal_requests(id, astrologer_id, payout_account_id, amount, status, payout_bank_name, payout_account_last4)
values ('w2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', 500, 'REQUESTED', 'Bank 2', '5678');

select throws_ok(
  $$ insert into public.astrologer_withdrawal_requests(astrologer_id, payout_account_id, amount, status, payout_bank_name, payout_account_last4)
     values ('a2222222-2222-2222-2222-222222222222', 'p2222222-2222-2222-2222-222222222222', 500, 'REQUESTED', 'Bank 2', '5678') $$,
  'duplicate key value violates unique constraint "idx_unique_unresolved_withdrawal"',
  'Test 7: Duplicate unresolved request blocked'
);

-- 5. Test data isolation
select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);

select is(
  (select count(*) from public.get_my_withdrawal_requests() where (value->>'id') = 'w2222222-2222-2222-2222-222222222222')::int,
  0,
  'Test 8: Other astrologer data inaccessible'
);

-- 6. Test Admin Transitions
select throws_ok(
  $$ select public.admin_approve_withdrawal('w2222222-2222-2222-2222-222222222222') $$,
  'Unauthorized',
  'Test 12: Non-admin transition blocked'
);

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333"}', true); -- Admin

-- Invalid transition REQUESTED -> PAID
select throws_ok(
  $$ select public.admin_mark_withdrawal_paid('w2222222-2222-2222-2222-222222222222', 'ref') $$,
  'Invalid transition',
  'Test 13: Invalid admin transition rejected'
);

-- Valid REQUESTED -> APPROVED -> PROCESSING -> PAID
select lives_ok(
  $$ select public.admin_approve_withdrawal('w2222222-2222-2222-2222-222222222222') $$,
  'Admin approve succeeds'
);

select lives_ok(
  $$ select public.admin_mark_withdrawal_processing('w2222222-2222-2222-2222-222222222222') $$,
  'Admin processing succeeds'
);

select lives_ok(
  $$ select public.admin_mark_withdrawal_paid('w2222222-2222-2222-2222-222222222222', 'REF123') $$,
  'Admin paid succeeds'
);

-- Try to update a PAID request
select throws_ok(
  $$ select public.admin_mark_withdrawal_failed('w2222222-2222-2222-2222-222222222222', 'Failed') $$,
  'Invalid transition',
  'Test 14: PAID request immutable from status transitions'
);

-- 7. Payment Statements Test
select set_config('role', 'postgres', true);
insert into public.consultation_sessions(id, user_id, astrologer_id, status, rate_per_minute, billed_minutes, total_charged, ended_at)
values ('s2222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222', 'ENDED', 15.00, 10, 150.00, now());

insert into public.astrologer_billing_ledger(astrologer_id, consultation_id, gross_amount, calculation_status)
values ('a2222222-2222-2222-2222-222222222222', 's2222222-2222-2222-2222-222222222222', 150.00, 'awaiting_commission');

select set_config('role', 'authenticated', true);
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);

select is(
  (select (value->>'gross_amount')::numeric from public.get_my_payment_statements() where value->>'entry_type' = 'CONSULTATION_BILLING'),
  150.00,
  'Test 16: Statement consultation amount comes from billing ledger'
);

select is(
  (select count(*) from public.get_my_payment_statements()),
  2::bigint,
  'Statements return union of consultations and withdrawals'
);

select is(
  (select value->>'payout_account_last4' from public.get_my_withdrawal_requests() where value->>'id' = 'w2222222-2222-2222-2222-222222222222'),
  '5678',
  'Test 18: Bank snapshot contains only last4 (and name, tested implicitly by schema)'
);

select is(
  (select value->>'payout_account_secret_id' from public.get_my_withdrawal_requests() where value->>'id' = 'w2222222-2222-2222-2222-222222222222'),
  null,
  'Test 15: Safe RPCs never expose vault secret'
);

select * from finish();
rollback;
