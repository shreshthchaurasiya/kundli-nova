alter table public.profiles
add column if not exists welcome_chat_started_at timestamptz;

create or replace function public.start_welcome_chat()
returns public.profiles
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.profiles
  set welcome_chat_started_at = coalesce(welcome_chat_started_at, now())
  where id = v_user_id
    and onboarding_completed_at is not null
  returning * into v_profile;

  if v_profile.id is null then
    raise exception 'Complete your profile before starting the welcome chat';
  end if;

  return v_profile;
end;
$$;

revoke execute on function public.start_welcome_chat() from public, anon;
grant execute on function public.start_welcome_chat() to authenticated;
