-- Keep profile and wallet data available for accounts created before the auth trigger,
-- and publish their changes to authenticated Realtime subscribers.

insert into public.profiles (id, phone, email, name, created_at)
select
  u.id,
  u.phone,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'name', u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1), 'Guest'),
  u.created_at
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

insert into public.wallets (user_id, balance)
select p.id, 150.00
from public.profiles p
where not exists (select 1 from public.wallets w where w.user_id = p.id);

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
  values (new.id, 150.00);

  return new;
end;
$$;

grant select, update on public.profiles to authenticated;
grant select on public.wallets, public.wallet_transactions to authenticated;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles') then
    alter publication supabase_realtime add table public.profiles;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallets') then
    alter publication supabase_realtime add table public.wallets;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'wallet_transactions') then
    alter publication supabase_realtime add table public.wallet_transactions;
  end if;
end;
$$;
