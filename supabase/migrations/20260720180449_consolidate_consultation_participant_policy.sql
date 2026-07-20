-- A single participant policy avoids duplicate permissive policy evaluation
-- while preserving customer access and adding assigned-astrologer access.

drop policy if exists "Select sessions"
  on public.consultation_sessions;

drop policy if exists "Astrologer reads assigned sessions"
  on public.consultation_sessions;

create policy "Participants read consultation sessions"
  on public.consultation_sessions
  for select
  to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1
      from public.astrologers as assigned_astrologer
      where assigned_astrologer.id = consultation_sessions.astrologer_id
        and assigned_astrologer.user_id = (select auth.uid())
        and assigned_astrologer.is_published = true
    )
  );
