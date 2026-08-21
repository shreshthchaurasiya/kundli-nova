-- Real astrologer request decisions, participant chat access, and chat history
-- metadata. All lifecycle mutations remain server-authoritative.

alter table public.consultation_sessions
  drop constraint if exists consultation_sessions_status_check;

alter table public.consultation_sessions
  add constraint consultation_sessions_status_check
  check (status in (
    'CHECKING_WALLET', 'INSUFFICIENT_BALANCE', 'PREPARING_KUNDLI',
    'WAITING_FOR_ASTROLOGER', 'REJECTED', 'EXPIRED', 'CANCELLED',
    'ACTIVE', 'LOW_BALANCE', 'RECHARGING', 'ENDED'
  ));

alter table public.consultation_sessions
  add column if not exists customer_display_name text;

update public.consultation_sessions as session
set customer_display_name = nullif(pg_catalog.btrim(profile.name), '')
from public.profiles as profile
where profile.id = session.user_id
  and session.customer_display_name is null;

create or replace function public.set_consultation_customer_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.customer_display_name is null then
    select nullif(pg_catalog.btrim(profile.name), '')
    into new.customer_display_name
    from public.profiles as profile
    where profile.id = new.user_id;
  end if;
  return new;
end;
$$;

revoke all on function public.set_consultation_customer_snapshot()
  from public, anon, authenticated;

drop trigger if exists set_consultation_customer_snapshot
  on public.consultation_sessions;

create trigger set_consultation_customer_snapshot
before insert on public.consultation_sessions
for each row execute function public.set_consultation_customer_snapshot();

alter table public.consultation_messages
  add column if not exists client_message_id uuid,
  add column if not exists sender_user_id uuid references auth.users(id) on delete set null;

update public.consultation_messages
set client_message_id = id
where client_message_id is null;

alter table public.consultation_messages
  alter column client_message_id set not null,
  alter column client_message_id set default gen_random_uuid();

create unique index if not exists uq_consultation_message_client_id
  on public.consultation_messages(session_id, client_message_id);

drop policy if exists "Select messages" on public.consultation_messages;
drop policy if exists "Insert messages" on public.consultation_messages;
drop policy if exists "Participants read consultation messages" on public.consultation_messages;
drop policy if exists "Participants send consultation messages" on public.consultation_messages;

create policy "Participants read consultation messages"
  on public.consultation_messages
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.consultation_sessions as session
      where session.id = consultation_messages.session_id
        and (
          session.user_id = (select auth.uid())
          or exists (
            select 1
            from public.astrologers as assigned_astrologer
            where assigned_astrologer.id = session.astrologer_id
              and assigned_astrologer.user_id = (select auth.uid())
              and assigned_astrologer.is_published = true
          )
        )
    )
  );

create policy "Participants send consultation messages"
  on public.consultation_messages
  for insert
  to authenticated
  with check (
    sender_user_id = (select auth.uid())
    and message_type in ('text', 'image', 'pdf', 'voice')
    and exists (
      select 1
      from public.consultation_sessions as session
      where session.id = consultation_messages.session_id
        and session.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING')
        and (
          (session.user_id = (select auth.uid()) and consultation_messages.sender = 'user')
          or exists (
            select 1
            from public.astrologers as assigned_astrologer
            where assigned_astrologer.id = session.astrologer_id
              and assigned_astrologer.user_id = (select auth.uid())
              and assigned_astrologer.is_published = true
              and consultation_messages.sender = 'astrologer'
          )
        )
    )
  );

revoke all on public.consultation_messages from public, anon;
grant select, insert on public.consultation_messages to authenticated;

create or replace function public.accept_astrologer_consultation(
  p_session_id uuid,
  p_astrologer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
  v_astrologer public.astrologers;
  v_result jsonb;
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Consultation session not found';
  end if;

  select * into v_astrologer
  from public.astrologers
  where id = v_session.astrologer_id
    and user_id = p_astrologer_user_id
    and is_published = true
  for update;

  if not found then
    raise exception 'Only the assigned astrologer can accept this consultation';
  end if;

  if v_session.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') then
    return pg_catalog.jsonb_build_object(
      'status', 'already_accepted',
      'session', pg_catalog.to_jsonb(v_session)
    );
  end if;

  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Consultation cannot be accepted from status %', v_session.status;
  end if;

  v_result := public.start_consultation_session(p_session_id);

  if v_result->'session'->>'status' in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') then
    update public.astrologers
    set status = 'BUSY', last_seen = pg_catalog.now()
    where id = v_astrologer.id;
  end if;

  return v_result;
end;
$$;

create or replace function public.reject_astrologer_consultation(
  p_session_id uuid,
  p_astrologer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
begin
  select session.* into v_session
  from public.consultation_sessions as session
  join public.astrologers as assigned_astrologer
    on assigned_astrologer.id = session.astrologer_id
  where session.id = p_session_id
    and assigned_astrologer.user_id = p_astrologer_user_id
    and assigned_astrologer.is_published = true
  for update of session;

  if not found then
    raise exception 'Only the assigned astrologer can reject this consultation';
  end if;

  if v_session.status = 'REJECTED' then
    return pg_catalog.jsonb_build_object('status', 'already_rejected', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Consultation cannot be rejected from status %', v_session.status;
  end if;

  update public.consultation_sessions
  set status = 'REJECTED', ended_at = pg_catalog.now()
  where id = p_session_id
  returning * into v_session;

  return pg_catalog.jsonb_build_object('status', 'rejected', 'session', pg_catalog.to_jsonb(v_session));
end;
$$;

create or replace function public.cancel_customer_consultation(
  p_session_id uuid,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.consultation_sessions;
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
    and user_id = p_customer_user_id
  for update;

  if not found then
    raise exception 'Consultation session not found';
  end if;

  if v_session.status = 'CANCELLED' then
    return pg_catalog.jsonb_build_object('status', 'already_cancelled', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Only a waiting consultation can be cancelled';
  end if;

  update public.consultation_sessions
  set status = 'CANCELLED', ended_at = pg_catalog.now()
  where id = p_session_id
  returning * into v_session;

  return pg_catalog.jsonb_build_object('status', 'cancelled', 'session', pg_catalog.to_jsonb(v_session));
end;
$$;

create or replace function public.sync_astrologer_consultation_availability()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.astrologer_id is null then
    return new;
  end if;

  if new.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') then
    update public.astrologers
    set status = 'BUSY', last_seen = pg_catalog.now()
    where id = new.astrologer_id;
  elsif old.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING')
    and new.status not in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING')
    and not exists (
      select 1
      from public.consultation_sessions as other_session
      where other_session.astrologer_id = new.astrologer_id
        and other_session.id <> new.id
        and other_session.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING')
    ) then
    update public.astrologers
    set status = 'ONLINE', last_seen = pg_catalog.now()
    where id = new.astrologer_id
      and is_published = true;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_astrologer_consultation_availability()
  from public, anon, authenticated;

drop trigger if exists sync_astrologer_consultation_availability
  on public.consultation_sessions;

create trigger sync_astrologer_consultation_availability
after update of status on public.consultation_sessions
for each row
when (old.status is distinct from new.status)
execute function public.sync_astrologer_consultation_availability();

revoke all on function public.accept_astrologer_consultation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.reject_astrologer_consultation(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.cancel_customer_consultation(uuid, uuid)
  from public, anon, authenticated;

grant execute on function public.accept_astrologer_consultation(uuid, uuid)
  to service_role;
grant execute on function public.reject_astrologer_consultation(uuid, uuid)
  to service_role;
grant execute on function public.cancel_customer_consultation(uuid, uuid)
  to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'consultation_messages'
  ) then
    alter publication supabase_realtime add table public.consultation_messages;
  end if;
end;
$$;
