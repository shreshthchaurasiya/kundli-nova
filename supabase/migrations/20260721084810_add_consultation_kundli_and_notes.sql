alter table public.consultation_sessions
  add column kundli_profile_id uuid references public.kundli_profiles(id) on delete set null;

create table public.consultation_astrologer_notes (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.consultation_sessions(id) on delete cascade not null,
  astrologer_id uuid references public.astrologers(id) on delete cascade not null,
  notes text not null default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (session_id, astrologer_id)
);

alter table public.consultation_astrologer_notes enable row level security;

create policy "Astrologer manages own notes"
  on public.consultation_astrologer_notes
  for all
  to authenticated
  using (
    (select auth.uid()) = (
      select user_id 
      from public.astrologers 
      where id = astrologer_id
    )
    and
    astrologer_id = (
      select astrologer_id
      from public.consultation_sessions
      where id = session_id
    )
  )
  with check (
    (select auth.uid()) = (
      select user_id 
      from public.astrologers 
      where id = astrologer_id
    )
    and
    astrologer_id = (
      select astrologer_id
      from public.consultation_sessions
      where id = session_id
    )
  );

revoke all on public.consultation_astrologer_notes from anon, authenticated;
grant select, insert, update on public.consultation_astrologer_notes to authenticated;

create trigger set_consultation_astrologer_notes_updated_at
before update on public.consultation_astrologer_notes
for each row execute function public.set_row_updated_at();

create or replace function public.create_consultation_session(
  p_user_id uuid,
  p_astrologer_id uuid,
  p_kundli_profile_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_astrologer public.astrologers;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_session public.consultation_sessions;
  v_minimum_required numeric(10, 2);
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text, 0));

  select * into v_settings from public.consultation_settings where id = true;
  if not found then
    raise exception 'Consultation settings are not configured';
  end if;
  
  if p_kundli_profile_id is not null then
    if not exists (
      select 1 
      from public.kundli_profiles 
      where id = p_kundli_profile_id 
        and owner_id = p_user_id
    ) then
      raise exception 'Kundli profile not found or not owned by user';
    end if;
  end if;

  select * into v_session
  from public.consultation_sessions
  where user_id = p_user_id
    and status in ('CHECKING_WALLET', 'PREPARING_KUNDLI', 'WAITING_FOR_ASTROLOGER', 'ACTIVE', 'LOW_BALANCE', 'RECHARGING')
  order by requested_at desc
  limit 1;

  if found then
    return pg_catalog.jsonb_build_object(
      'outcome', 'existing_session',
      'session', pg_catalog.to_jsonb(v_session),
      'minimum_minutes', v_settings.minimum_minutes,
      'minimum_required', v_session.rate_per_minute * v_settings.minimum_minutes,
      'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
      'request_timeout_seconds', v_settings.request_timeout_seconds,
      'recharge_grace_seconds', v_settings.recharge_grace_seconds
    );
  end if;

  select * into v_astrologer
  from public.astrologers
  where id = p_astrologer_id;

  if not found then
    raise exception 'Astrologer not found';
  end if;
  if v_astrologer.status <> 'ONLINE' then
    raise exception 'Astrologer is not available';
  end if;

  insert into public.wallets(user_id, balance)
  values (p_user_id, 0)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = p_user_id
  for update;

  v_minimum_required := v_astrologer.price_per_minute * v_settings.minimum_minutes;
  if v_wallet.balance < v_minimum_required then
    return pg_catalog.jsonb_build_object(
      'outcome', 'insufficient_balance',
      'session', null,
      'balance', v_wallet.balance,
      'rate_per_minute', v_astrologer.price_per_minute,
      'minimum_minutes', v_settings.minimum_minutes,
      'minimum_required', v_minimum_required,
      'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
      'request_timeout_seconds', v_settings.request_timeout_seconds,
      'recharge_grace_seconds', v_settings.recharge_grace_seconds
    );
  end if;

  insert into public.consultation_sessions (
    user_id,
    astrologer_id,
    kundli_profile_id,
    status,
    rate_per_minute
  )
  values (
    p_user_id,
    p_astrologer_id,
    p_kundli_profile_id,
    'WAITING_FOR_ASTROLOGER',
    v_astrologer.price_per_minute
  )
  returning * into v_session;

  insert into public.system_events(user_id, type, payload)
  values (
    p_user_id,
    'CONSULTATION_REQUESTED',
    pg_catalog.jsonb_build_object('session_id', v_session.id, 'astrologer_id', p_astrologer_id, 'kundli_profile_id', p_kundli_profile_id)
  );

  return pg_catalog.jsonb_build_object(
    'outcome', 'created',
    'session', pg_catalog.to_jsonb(v_session),
    'balance', v_wallet.balance,
    'minimum_minutes', v_settings.minimum_minutes,
    'minimum_required', v_minimum_required,
    'heartbeat_interval_seconds', v_settings.heartbeat_interval_seconds,
    'request_timeout_seconds', v_settings.request_timeout_seconds,
    'recharge_grace_seconds', v_settings.recharge_grace_seconds
  );
end;
$$;
