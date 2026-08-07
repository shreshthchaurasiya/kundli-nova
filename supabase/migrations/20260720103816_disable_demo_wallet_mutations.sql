-- Razorpay verification is the only supported wallet-credit path. The guards
-- keep this migration safe in a fresh database where the legacy demo objects
-- are introduced by a later historical migration.
do $$
begin
  if pg_catalog.to_regclass('private.app_config') is not null then
    execute 'update private.app_config set enabled = false, updated_at = now() where key = ''demo_wallet_enabled''';
  end if;
  if pg_catalog.to_regprocedure('public.demo_recharge_wallet(numeric,uuid)') is not null then
    execute 'revoke execute on function public.demo_recharge_wallet(numeric, uuid) from public, anon, authenticated';
  end if;
  if pg_catalog.to_regprocedure('public.demo_debit_wallet(numeric,uuid)') is not null then
    execute 'revoke execute on function public.demo_debit_wallet(numeric, uuid) from public, anon, authenticated';
  end if;
end;
$$;
