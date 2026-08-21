begin;
select plan(5);

-- 1. Setup users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'astro_dash@test.com');

insert into public.profiles (id, display_name) values
  ('00000000-0000-0000-0000-000000000001', 'Astro Dash');

insert into public.account_roles (user_id, role) values
  ('00000000-0000-0000-0000-000000000001', 'astrologer');

insert into public.astrologers (id, user_id, status, is_published, bio, experience_years) values
  ('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'ONLINE', true, 'Bio', 5);

insert into public.astrologer_applications (id, user_id, status) values
  ('app00000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'approved');

update public.astrologers set application_id = 'app00000-0000-0000-0000-000000000001' where id = 'a0000000-0000-0000-0000-000000000001';

-- 2. Setup Sessions (Scenario A and B)
-- We'll insert two sessions manually.
insert into public.consultation_sessions (
  id, user_id, astrologer_id, status, rate_per_minute,
  billed_minutes, total_charged, started_at, ended_at
) values
  ('sess0000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ENDED', 15.00,
   14, 210.00, now() - interval '20 minutes', now() - interval '5 minutes'),
  ('sess0000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'ENDED', 15.00,
   6, 90.00, now() - interval '10 minutes', now() - interval '2 minutes');

-- Insert ledger only for session 1 (Scenario A)
insert into public.astrologer_billing_ledger (
  astrologer_id, consultation_id, gross_amount, calculation_status, earned_at
) values
  ('a0000000-0000-0000-0000-000000000001', 'sess0000-0000-0000-0000-000000000001', 210.00, 'awaiting_commission', now() - interval '5 minutes');

-- 3. Run backfill migration manually for test (since we want to test its effect)
insert into public.astrologer_billing_ledger (
  astrologer_id,
  consultation_id,
  gross_amount,
  calculation_status,
  earned_at
)
select 
  cs.astrologer_id,
  cs.id,
  cs.total_charged,
  'awaiting_commission',
  cs.ended_at
from public.consultation_sessions cs
left join public.astrologer_billing_ledger bl on cs.id = bl.consultation_id
where cs.status = 'ENDED' 
  and cs.total_charged > 0 
  and cs.astrologer_id is not null
  and bl.id is null
on conflict (consultation_id) do nothing;

select is(
  (select count(*) from public.astrologer_billing_ledger where astrologer_id = 'a0000000-0000-0000-0000-000000000001')::int,
  2,
  'Backfill successfully inserts missing ledger'
);

-- 4. Test duplicate backfill (Scenario C)
insert into public.astrologer_billing_ledger (
  astrologer_id,
  consultation_id,
  gross_amount,
  calculation_status,
  earned_at
)
select 
  cs.astrologer_id,
  cs.id,
  cs.total_charged,
  'awaiting_commission',
  cs.ended_at
from public.consultation_sessions cs
left join public.astrologer_billing_ledger bl on cs.id = bl.consultation_id
where cs.status = 'ENDED' 
  and cs.total_charged > 0 
  and cs.astrologer_id is not null
  and bl.id is null
on conflict (consultation_id) do nothing;

select is(
  (select count(*) from public.astrologer_billing_ledger where astrologer_id = 'a0000000-0000-0000-0000-000000000001')::int,
  2,
  'Repeated backfill does not duplicate records'
);

-- 5. Test unified RPC returns 300
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001"}', true);

declare
  v_res json;
begin
  v_res := public.get_my_astrologer_dashboard_summary();
  
  select is(
    (v_res->>'totalConsultsToday')::int,
    2,
    'Total consults is correct (2)'
  );
  
  select is(
    (v_res->>'billedMinutesToday')::int,
    20,
    'Billed minutes is correct (20)'
  );
  
  select is(
    (v_res->>'todayGrossBilling')::numeric,
    300.00,
    'Today gross billing correctly aggregates both sessions (300)'
  );
end;

select * from finish();
rollback;
