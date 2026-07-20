-- Harden backend-only RPCs and trigger helpers without changing their behavior.

alter function public.handle_new_user()
  set search_path = pg_catalog, public;

alter function public.recharge_wallet(uuid, numeric, text, text, text, uuid)
  set search_path = pg_catalog, public;

alter function public.bill_consultation_session(uuid)
  set search_path = pg_catalog, public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.recharge_wallet(uuid, numeric, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.bill_consultation_session(uuid) from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

grant execute on function public.recharge_wallet(uuid, numeric, text, text, text, uuid) to service_role;
grant execute on function public.bill_consultation_session(uuid) to service_role;

-- service_role bypasses RLS. This policy adds no protection and its always-true
-- WITH CHECK is correctly reported as unsafe by the database advisor.
drop policy if exists "Service role modify sessions" on public.consultation_sessions;
