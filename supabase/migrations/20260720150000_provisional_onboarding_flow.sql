-- Google OAuth must create an Auth identity to verify the provider. Treat that
-- identity as provisional: the public profile and wallet are created only when
-- all required birth details are submitted.

alter table public.profiles
add column if not exists onboarding_completed_at timestamptz;

update public.profiles
set onboarding_completed_at = coalesce(onboarding_completed_at, now())
where name is not null and gender is not null and dob is not null and tob is not null
  and birth_state is not null and birth_district is not null and birth_city is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Auth identity only. complete_onboarding() creates application records.
  return new;
end;
$$;

create or replace function public.complete_onboarding(
  p_name text,
  p_phone text,
  p_gender text,
  p_dob date,
  p_tob time,
  p_state text,
  p_district text,
  p_city text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_auth_user auth.users;
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if nullif(trim(p_name), '') is null
    or nullif(trim(p_gender), '') is null
    or p_dob is null or p_tob is null
    or nullif(trim(p_state), '') is null
    or nullif(trim(p_district), '') is null
    or nullif(trim(p_city), '') is null then
    raise exception 'All birth profile fields are required';
  end if;
  if p_dob > current_date then
    raise exception 'Date of birth cannot be in the future';
  end if;

  select * into v_auth_user from auth.users where id = v_user_id;
  if v_auth_user.id is null then
    raise exception 'Authenticated identity not found';
  end if;

  insert into public.profiles (
    id, phone, email, name, gender, dob, tob,
    birth_state, birth_district, birth_city, created_at, onboarding_completed_at
  ) values (
    v_user_id, nullif(trim(p_phone), ''), v_auth_user.email, trim(p_name), trim(p_gender), p_dob, p_tob,
    trim(p_state), trim(p_district), trim(p_city), v_auth_user.created_at, now()
  )
  on conflict (id) do update set
    phone = excluded.phone,
    email = excluded.email,
    name = excluded.name,
    gender = excluded.gender,
    dob = excluded.dob,
    tob = excluded.tob,
    birth_state = excluded.birth_state,
    birth_district = excluded.birth_district,
    birth_city = excluded.birth_city,
    onboarding_completed_at = coalesce(public.profiles.onboarding_completed_at, now())
  returning * into v_profile;

  insert into public.wallets (user_id, balance)
  values (v_user_id, 0.00)
  on conflict (user_id) do nothing;

  return v_profile;
end;
$$;

revoke execute on function public.complete_onboarding(text, text, text, date, time, text, text, text) from public, anon;
grant execute on function public.complete_onboarding(text, text, text, date, time, text, text, text) to authenticated;
