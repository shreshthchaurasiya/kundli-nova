begin;
select plan(27);

-- Setup: Create users
select set_config('role', 'postgres', true);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000004', 'customer_bill@test.com'),
  ('00000000-0000-0000-0000-000000000005', 'astro_bill@test.com');

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-000000000004', 'customer_bill@test.com', 'Customer Bill'),
  ('00000000-0000-0000-0000-000000000005', 'astro_bill@test.com', 'Astro Bill');

-- Initial wallet balance for start eligibility tests
insert into public.wallets (user_id, balance) values
  ('00000000-0000-0000-0000-000000000004', 74.00);

insert into public.astrologer_applications (id, user_id, status) values
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000005', 'approved');

-- Insert Astrologer
insert into public.astrologers (id, name, experience, languages, skills, price_per_minute, user_id, application_id, is_published) values
  ('55555555-5555-5555-5555-555555555555', 'Astro Bill', '5 years', '{"English"}', '{"Vedic"}', 15.00, '00000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', true);

-- 1. ₹74 balance at ₹15/min (req 75) -> session must not start
insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status) values
  ('b0000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'WAITING_FOR_ASTROLOGER');

select lives_ok(
  $$ select start_consultation_session('b0000000-0000-0000-0000-000000000000') $$,
  'start_consultation_session executes for insufficient balance'
);

select results_eq(
  $$ select status from public.consultation_sessions where id = 'b0000000-0000-0000-0000-000000000000' $$,
  $$ values ('INSUFFICIENT_BALANCE'::text) $$,
  '₹74 balance at ₹15/min → session must not start'
);

-- 2. ₹75 balance at ₹15/min -> session starts and balance remains ₹75, no billing entry
update public.wallets set balance = 75.00 where user_id = '00000000-0000-0000-0000-000000000004';

insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status) values
  ('b1111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'WAITING_FOR_ASTROLOGER');

select lives_ok(
  $$ select start_consultation_session('b1111111-1111-1111-1111-111111111111') $$,
  'start_consultation_session executes successfully for 75 balance'
);

select results_eq(
  $$ select status, billed_minutes, total_charged, elapsed_seconds from public.consultation_sessions where id = 'b1111111-1111-1111-1111-111111111111' $$,
  $$ values ('ACTIVE'::text, 0, 0.00::numeric, 0) $$,
  'start begins at 0 billed minutes and ₹0'
);

select results_eq(
  $$ select balance from public.wallets where user_id = '00000000-0000-0000-0000-000000000004' $$,
  $$ values (75.00::numeric) $$,
  'starting with ₹75 → balance remains ₹75'
);

select is(
  (select count(*) from public.consultation_billing_entries where session_id = 'b1111111-1111-1111-1111-111111111111'),
  0::bigint,
  'no billing entry is created at start'
);

select is(
  (select count(*) from public.wallet_transactions where reference_id = 'b1111111-1111-1111-1111-111111111111'::text),
  0::bigint,
  'no wallet transaction is created at start'
);

-- Update balance for rest of tests
update public.wallets set balance = 100.00 where user_id = '00000000-0000-0000-0000-000000000004';

-- 3. 59 seconds bills ₹0
update public.consultation_sessions set started_at = now() - interval '59 seconds' where id = 'b1111111-1111-1111-1111-111111111111';
select lives_ok($$ select bill_consultation_session('b1111111-1111-1111-1111-111111111111') $$, 'bill at 59s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b1111111-1111-1111-1111-111111111111' $$,
  $$ values (0, 0.00::numeric) $$,
  '59 seconds bills ₹0'
);

-- 4. 60 seconds bills 1 minute
update public.consultation_sessions set started_at = now() - interval '60 seconds' where id = 'b1111111-1111-1111-1111-111111111111';
select lives_ok($$ select bill_consultation_session('b1111111-1111-1111-1111-111111111111') $$, 'bill at 60s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b1111111-1111-1111-1111-111111111111' $$,
  $$ values (1, 15.00::numeric) $$,
  '60 seconds bills 1 minute'
);

-- 5. 119 seconds bills 1 minute
update public.consultation_sessions set started_at = now() - interval '119 seconds' where id = 'b1111111-1111-1111-1111-111111111111';
select lives_ok($$ select bill_consultation_session('b1111111-1111-1111-1111-111111111111') $$, 'bill at 119s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b1111111-1111-1111-1111-111111111111' $$,
  $$ values (1, 15.00::numeric) $$,
  '119 seconds bills 1 minute'
);

-- 6. 120 seconds bills 2 minutes
update public.consultation_sessions set started_at = now() - interval '120 seconds' where id = 'b1111111-1111-1111-1111-111111111111';
select lives_ok($$ select bill_consultation_session('b1111111-1111-1111-1111-111111111111') $$, 'bill at 120s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b1111111-1111-1111-1111-111111111111' $$,
  $$ values (2, 30.00::numeric) $$,
  '120 seconds bills 2 minutes'
);

-- 7. delayed heartbeat catches up multiple minutes
insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status, started_at, billed_minutes, total_charged) values
  ('b2222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'ACTIVE', now() - interval '240 seconds', 0, 0);
select lives_ok($$ select bill_consultation_session('b2222222-2222-2222-2222-222222222222') $$, 'bill catch-up 240s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b2222222-2222-2222-2222-222222222222' $$,
  $$ values (4, 60.00::numeric) $$,
  'delayed heartbeat catches up multiple minutes'
);

-- 8. duplicate heartbeat does not double-charge
select lives_ok($$ select bill_consultation_session('b2222222-2222-2222-2222-222222222222') $$, 'duplicate bill');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b2222222-2222-2222-2222-222222222222' $$,
  $$ values (4, 60.00::numeric) $$,
  'duplicate heartbeat does not double-charge'
);

-- 9. ending at 80 seconds performs final 1-minute charge
insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status, started_at, billed_minutes, total_charged) values
  ('b3333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'ACTIVE', now() - interval '80 seconds', 0, 0);
select lives_ok($$ select finish_consultation_session('b3333333-3333-3333-3333-333333333333') $$, 'finish session at 80s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b3333333-3333-3333-3333-333333333333' $$,
  $$ values (1, 15.00::numeric) $$,
  'ending at 80 seconds performs final 1-minute charge'
);

-- 10. ending before 60 seconds charges ₹0
insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status, started_at, billed_minutes, total_charged) values
  ('b4444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'ACTIVE', now() - interval '45 seconds', 0, 0);
select lives_ok($$ select finish_consultation_session('b4444444-4444-4444-4444-444444444444') $$, 'finish session at 45s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b4444444-4444-4444-4444-444444444444' $$,
  $$ values (0, 0.00::numeric) $$,
  'ending before 60 seconds charges ₹0'
);

-- 11. insufficient wallet never becomes negative & transitions properly
-- Ensure wallet is at 10.00
update public.wallets set balance = 10.00 where user_id = '00000000-0000-0000-0000-000000000004';

insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status, started_at, billed_minutes, total_charged) values
  ('b5555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'ACTIVE', now() - interval '60 seconds', 0, 0);
select lives_ok($$ select bill_consultation_session('b5555555-5555-5555-5555-555555555555') $$, 'bill when wallet is insufficient');
select results_eq(
  $$ select status from public.consultation_sessions where id = 'b5555555-5555-5555-5555-555555555555' $$,
  $$ values ('RECHARGING'::text) $$,
  'insufficient wallet triggers RECHARGING transition'
);
select results_eq(
  $$ select balance from public.wallets where user_id = '00000000-0000-0000-0000-000000000004' $$,
  $$ values (10.00::numeric) $$,
  'insufficient wallet never becomes negative'
);

-- 12. existing billed session values are preserved
insert into public.consultation_sessions (id, user_id, astrologer_id, rate_per_minute, status, started_at, billed_minutes, total_charged) values
  ('b6666666-6666-6666-6666-666666666666', '00000000-0000-0000-0000-000000000004', '55555555-5555-5555-5555-555555555555', 15.00, 'ACTIVE', now() - interval '30 seconds', 1, 15.00);
select lives_ok($$ select bill_consultation_session('b6666666-6666-6666-6666-666666666666') $$, 'bill existing pre-billed session at 30s');
select results_eq(
  $$ select billed_minutes, total_charged from public.consultation_sessions where id = 'b6666666-6666-6666-6666-666666666666' $$,
  $$ values (1, 15.00::numeric) $$,
  'existing billed session values are preserved until new threshold reached'
);

select * from finish();
rollback;
