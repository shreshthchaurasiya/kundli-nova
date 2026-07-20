-- Scope ownership policies to authenticated users and evaluate auth.uid() once.
-- The service role bypasses RLS, so separate service-role policies are unnecessary.

drop policy if exists "Select profile" on public.profiles;
drop policy if exists "Update profile" on public.profiles;
drop policy if exists "Select wallet" on public.wallets;
drop policy if exists "Service role modify wallets" on public.wallets;
drop policy if exists "Select wallet transactions" on public.wallet_transactions;
drop policy if exists "Service role modify wallet tx" on public.wallet_transactions;

create policy "Select profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Update profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Select wallet"
on public.wallets for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Select wallet transactions"
on public.wallet_transactions for select
to authenticated
using ((select auth.uid()) = user_id);
