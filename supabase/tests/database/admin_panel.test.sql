begin;
select plan(11);

-- 0. Setup Context
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'astro1@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'cust1@test.com'),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com');

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Astro 1'),
  ('22222222-2222-2222-2222-222222222222', 'Cust 1'),
  ('33333333-3333-3333-3333-333333333333', 'Admin');

insert into public.account_roles (user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'astrologer'),
  ('22222222-2222-2222-2222-222222222222', 'customer'),
  ('33333333-3333-3333-3333-333333333333', 'admin');

-- 1. Test Admin Authorization Helper
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "11111111-1111-1111-1111-111111111111"}', true);
select throws_ok(
  'SELECT public.assert_current_user_is_admin()',
  'Unauthorized: Requires admin privileges',
  'Non-admin should be rejected by assert_current_user_is_admin'
);

select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333"}', true);
select lives_ok(
  'SELECT public.assert_current_user_is_admin()',
  'Admin should pass assert_current_user_is_admin'
);

-- 2. Test Commission Check Constraint
select throws_ok(
  $$ INSERT INTO public.commission_rules (company_percentage, astrologer_percentage, effective_from) VALUES (40.0, 50.0, now()) $$,
  'new row for relation "commission_rules" violates check constraint "valid_percentages"',
  'Commission percentages must total 100'
);

select lives_ok(
  $$ INSERT INTO public.commission_rules (company_percentage, astrologer_percentage, effective_from) VALUES (40.0, 60.0, now()) $$,
  'Valid commission percentages insert correctly'
);

-- 3. Test Dashboard Summary (No Data)
select set_config('request.jwt.claims', '{"sub": "33333333-3333-3333-3333-333333333333"}', true);
select ok(
  (SELECT (public.get_admin_dashboard_summary('2020-01-01'::timestamptz, '2030-01-01'::timestamptz))->>'total_users')::int = 3,
  'Dashboard summary returns correct total users'
);

-- 4. Test Timeseries Granularity Validation
select throws_ok(
  $$ SELECT public.get_admin_dashboard_timeseries('2020-01-01', '2030-01-01', 'Asia/Kolkata', 'invalid_granularity') $$,
  'Invalid granularity. Must be day, week, or month.',
  'Timeseries rejects invalid granularity'
);

select lives_ok(
  $$ SELECT * FROM public.get_admin_dashboard_timeseries('2020-01-01', '2030-01-01', 'Asia/Kolkata', 'month') $$,
  'Timeseries accepts valid granularity'
);

-- 5. Test List Pagination Parameters
select throws_ok(
  $$ SELECT public.get_admin_users('{}'::jsonb, 0, 0) $$,
  'Limit must be between 1 and 100',
  'get_admin_users enforces limit boundaries'
);

select throws_ok(
  $$ SELECT public.get_admin_users('{}'::jsonb, 25, -1) $$,
  'Offset must be >= 0',
  'get_admin_users enforces offset boundaries'
);

select ok(
  (SELECT (public.get_admin_users('{"search": "Admin"}'::jsonb))->>'total_count')::int = 1,
  'get_admin_users search filter works'
);

-- 6. Non-admin accessing dashboard
select set_config('request.jwt.claims', '{"sub": "22222222-2222-2222-2222-222222222222"}', true);
select throws_ok(
  $$ SELECT public.get_admin_dashboard_summary('2020-01-01'::timestamptz, '2030-01-01'::timestamptz) $$,
  'Unauthorized: Requires admin privileges',
  'Non-admin cannot access dashboard summary'
);

select * from finish();
rollback;
