-- Astrologer partner onboarding and self-managed public profiles.
-- Applications and verification documents stay private; only approved,
-- published astrologer profiles are visible in the customer application.

create table public.astrologer_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'pending', 'approved', 'rejected', 'suspended')),
  legal_name text,
  display_name text,
  email text,
  phone text,
  pan_number text,
  experience_years smallint check (experience_years between 0 and 80),
  languages text[] not null default '{}',
  skills text[] not null default '{}',
  qualification text,
  consultation_modes text[] not null default '{}',
  about text,
  requested_price_per_minute numeric(10,2)
    check (requested_price_per_minute between 0 and 10000),
  profile_photo_url text,
  pan_document_path text,
  certificate_paths text[] not null default '{}',
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint astrologer_application_pending_is_complete check (
    status <> 'pending' or (
      nullif(btrim(legal_name), '') is not null and
      nullif(btrim(display_name), '') is not null and
      nullif(btrim(email), '') is not null and
      nullif(btrim(phone), '') is not null and
      pan_number ~ '^[A-Z]{5}[0-9]{4}[A-Z]$' and
      experience_years is not null and
      cardinality(languages) > 0 and
      cardinality(skills) > 0 and
      cardinality(consultation_modes) > 0 and
      nullif(btrim(about), '') is not null and
      requested_price_per_minute is not null and
      nullif(btrim(profile_photo_url), '') is not null and
      nullif(btrim(pan_document_path), '') is not null and
      submitted_at is not null
    )
  )
);

comment on table public.astrologer_applications is
  'Private partner applications. Public profile data is copied to astrologers only after approval.';

create index astrologer_applications_status_submitted_idx
  on public.astrologer_applications(status, submitted_at desc)
  where status = 'pending';

alter table public.astrologer_applications enable row level security;

create policy "Read own astrologer application"
  on public.astrologer_applications for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own astrologer application draft"
  on public.astrologer_applications for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'draft'
    and rejection_reason is null
    and reviewed_at is null
  );

create policy "Update editable astrologer application"
  on public.astrologer_applications for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status in ('draft', 'rejected')
  )
  with check (
    (select auth.uid()) = user_id
    and status in ('draft', 'pending')
    and rejection_reason is null
    and reviewed_at is null
  );

revoke all on public.astrologer_applications from anon, authenticated;
grant select, insert, update on public.astrologer_applications to authenticated;

create table public.account_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('user', 'astrologer', 'admin')),
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

alter table public.account_roles enable row level security;

create policy "Read own account roles"
  on public.account_roles for select
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.account_roles from anon, authenticated;
grant select on public.account_roles to authenticated;

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  topic text not null check (topic in (
    'payment-wallet', 'consultation', 'account-profile', 'kundli-report',
    'become-astrologer', 'business-partnership', 'technical-problem', 'other'
  )),
  subject text not null check (char_length(btrim(subject)) between 3 and 120),
  message text not null check (char_length(btrim(message)) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index support_requests_user_created_idx
  on public.support_requests(user_id, created_at desc);

alter table public.support_requests enable row level security;

create policy "Read own support requests"
  on public.support_requests for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Create own support request"
  on public.support_requests for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'open');

revoke all on public.support_requests from anon, authenticated;
grant select, insert on public.support_requests to authenticated;

alter table public.astrologers
  add column user_id uuid unique references public.profiles(id) on delete set null,
  add column application_id uuid unique references public.astrologer_applications(id) on delete set null,
  add column is_published boolean not null default true;

drop policy if exists "Select astrologers" on public.astrologers;
create policy "Select published astrologers"
  on public.astrologers for select
  to anon, authenticated
  using (is_published = true);

create policy "Astrologer updates own public profile"
  on public.astrologers for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- An astrologer may edit only customer-facing profile fields. Rating,
-- consultations, approved price, ownership and publication remain admin-owned.
revoke all on public.astrologers from anon, authenticated;
grant select on public.astrologers to anon, authenticated;
grant update (name, image, experience, languages, skills, about, updated_at)
  on public.astrologers to authenticated;

create or replace function public.set_row_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_astrologer_application_updated_at
before update on public.astrologer_applications
for each row execute function public.set_row_updated_at();

create trigger set_support_request_updated_at
before update on public.support_requests
for each row execute function public.set_row_updated_at();

create trigger set_astrologer_profile_updated_at
before update on public.astrologers
for each row execute function public.set_row_updated_at();

create or replace function public.approve_astrologer_application(
  p_application_id uuid,
  p_approved_price_per_minute numeric
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_application public.astrologer_applications;
  v_astrologer_id uuid;
begin
  if p_approved_price_per_minute < 0 or p_approved_price_per_minute > 10000 then
    raise exception 'Approved price is outside the allowed range';
  end if;

  select * into v_application
  from public.astrologer_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Astrologer application not found';
  end if;

  if v_application.status = 'approved' then
    select id into v_astrologer_id
    from public.astrologers
    where application_id = p_application_id;
    return v_astrologer_id;
  end if;

  if v_application.status <> 'pending' then
    raise exception 'Only pending applications can be approved';
  end if;

  insert into public.astrologers (
    user_id,
    application_id,
    name,
    image,
    experience,
    languages,
    skills,
    price_per_minute,
    status,
    about,
    is_published
  ) values (
    v_application.user_id,
    v_application.id,
    v_application.display_name,
    v_application.profile_photo_url,
    v_application.experience_years::text || ' Years',
    v_application.languages,
    v_application.skills,
    p_approved_price_per_minute,
    'OFFLINE',
    v_application.about,
    true
  )
  on conflict (user_id) do update set
    application_id = excluded.application_id,
    name = excluded.name,
    image = excluded.image,
    experience = excluded.experience,
    languages = excluded.languages,
    skills = excluded.skills,
    price_per_minute = excluded.price_per_minute,
    about = excluded.about,
    is_published = true,
    updated_at = now()
  returning id into v_astrologer_id;

  insert into public.account_roles (user_id, role)
  values (v_application.user_id, 'astrologer')
  on conflict (user_id, role) do nothing;

  update public.astrologer_applications
  set status = 'approved', reviewed_at = now(), rejection_reason = null
  where id = p_application_id;

  return v_astrologer_id;
end;
$$;

revoke all on function public.approve_astrologer_application(uuid, numeric)
  from public, anon, authenticated;
grant execute on function public.approve_astrologer_application(uuid, numeric)
  to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'astrologer-profile-photos',
    'astrologer-profile-photos',
    true,
    5242880,
    array['image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'astrologer-verification',
    'astrologer-verification',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Upload own astrologer profile photo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'astrologer-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Update own astrologer profile photo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'astrologer-profile-photos'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'astrologer-profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Read own astrologer profile photo metadata"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'astrologer-profile-photos'
    and owner_id = (select auth.uid())::text
  );

create policy "Delete own astrologer profile photo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'astrologer-profile-photos'
    and owner_id = (select auth.uid())::text
  );

create policy "Upload own astrologer verification document"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'astrologer-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Read own astrologer verification document"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'astrologer-verification'
    and owner_id = (select auth.uid())::text
  );

create policy "Update own astrologer verification document"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'astrologer-verification'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'astrologer-verification'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Delete own astrologer verification document"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'astrologer-verification'
    and owner_id = (select auth.uid())::text
  );

alter publication supabase_realtime add table public.astrologer_applications;
alter publication supabase_realtime add table public.astrologers;
