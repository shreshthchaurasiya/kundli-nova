revoke all on public.astrologer_applications from anon, authenticated;
grant select, insert, update on public.astrologer_applications to authenticated;

revoke all on public.account_roles from anon, authenticated;
grant select on public.account_roles to authenticated;

revoke all on public.support_requests from anon, authenticated;
grant select, insert on public.support_requests to authenticated;

revoke all on public.astrologers from anon, authenticated;
grant select on public.astrologers to anon, authenticated;
grant update (name, image, experience, languages, skills, about)
  on public.astrologers to authenticated;
