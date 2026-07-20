-- Realtime, least-privilege read access for an approved astrologer's own
-- dashboard. Customer sessions remain invisible to every other astrologer.

grant select on public.consultation_sessions to authenticated;

drop policy if exists "Astrologer reads assigned sessions"
  on public.consultation_sessions;

create policy "Astrologer reads assigned sessions"
  on public.consultation_sessions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.astrologers as assigned_astrologer
      where assigned_astrologer.id = consultation_sessions.astrologer_id
        and assigned_astrologer.user_id = (select auth.uid())
        and assigned_astrologer.is_published = true
    )
  );

-- Availability is the only operational field an approved astrologer can
-- change directly. Existing row ownership RLS still restricts the update to
-- the astrologer's own public profile.
grant update (status, last_seen) on public.astrologers to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'consultation_sessions'
  ) then
    alter publication supabase_realtime
      add table public.consultation_sessions;
  end if;
end;
$$;
