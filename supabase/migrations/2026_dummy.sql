


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "private";


ALTER SCHEMA "private" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."accept_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_now timestamptz := pg_catalog.now();
  v_elapsed_seconds integer;
  v_expected_minutes integer;
  v_minute integer;
  v_billing_id uuid;
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status = 'ENDED' then
    return pg_catalog.jsonb_build_object('status', 'already_ended', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status not in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') or v_session.started_at is null then
    return pg_catalog.jsonb_build_object('status', 'not_active', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  select * into v_settings from public.consultation_settings where id = true;
  select * into v_wallet from public.wallets where user_id = v_session.user_id for update;

  v_elapsed_seconds := greatest(0, pg_catalog.floor(extract(epoch from (v_now - v_session.started_at)))::integer);
  v_expected_minutes := 1 + pg_catalog.floor(v_elapsed_seconds::numeric / v_settings.billing_interval_seconds)::integer;

  for v_minute in (v_session.billed_minutes + 1)..v_expected_minutes loop
    if v_wallet.balance < v_session.rate_per_minute then
      if v_session.recharge_deadline_at is not null and v_now >= v_session.recharge_deadline_at then
        update public.consultation_sessions
        set status = 'ENDED', ended_at = v_now, elapsed_seconds = v_elapsed_seconds
        where id = p_session_id
        returning * into v_session;
        return pg_catalog.jsonb_build_object('status', 'ended_insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
      end if;

      update public.consultation_sessions
      set status = 'RECHARGING',
          recharge_deadline_at = coalesce(recharge_deadline_at, v_now + pg_catalog.make_interval(secs => v_settings.recharge_grace_seconds)),
          elapsed_seconds = v_elapsed_seconds
      where id = p_session_id
      returning * into v_session;
      return pg_catalog.jsonb_build_object('status', 'recharge_required', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
    end if;

    v_billing_id := null;
    insert into public.consultation_billing_entries(session_id, user_id, minute_number, amount, billed_at)
    values (p_session_id, v_session.user_id, v_minute, v_session.rate_per_minute, v_now)
    on conflict (session_id, minute_number) do nothing
    returning id into v_billing_id;

    if v_billing_id is not null then
      update public.wallets
      set balance = balance - v_session.rate_per_minute, updated_at = v_now
      where user_id = v_session.user_id
      returning * into v_wallet;

      insert into public.wallet_transactions (
        user_id, type, amount, title, description, status, reference_type, reference_id, created_at
      ) values (
        v_session.user_id, 'debit', v_session.rate_per_minute, 'Consultation Charge',
        'Minute ' || v_minute, 'completed', 'consultation', v_billing_id, v_now
      );

      v_session.billed_minutes := v_minute;
      v_session.total_charged := v_session.total_charged + v_session.rate_per_minute;
    end if;
  end loop;

  update public.consultation_sessions
  set billed_minutes = v_session.billed_minutes,
      total_charged = v_session.total_charged,
      last_billed_at = case when v_session.billed_minutes > 0 then v_now else last_billed_at end,
      elapsed_seconds = v_elapsed_seconds,
      recharge_deadline_at = null,
      status = case
        when v_wallet.balance < v_session.rate_per_minute then 'RECHARGING'
        when v_wallet.balance <= v_session.rate_per_minute * v_settings.low_balance_minutes then 'LOW_BALANCE'
        else 'ACTIVE'
      end
  where id = p_session_id
  returning * into v_session;

  if v_session.status = 'RECHARGING' then
    update public.consultation_sessions
    set recharge_deadline_at = v_now + pg_catalog.make_interval(secs => v_settings.recharge_grace_seconds)
    where id = p_session_id
    returning * into v_session;
  end if;

  return pg_catalog.jsonb_build_object('status', 'up_to_date', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
end;
$$;


ALTER FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_customer_consultation"("p_session_id" "uuid", "p_customer_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."cancel_customer_consultation"("p_session_id" "uuid", "p_customer_user_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "phone" "text",
    "email" "text",
    "name" "text" NOT NULL,
    "gender" "text",
    "dob" "date",
    "tob" time without time zone,
    "birth_state" "text",
    "birth_district" "text",
    "birth_city" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "onboarding_completed_at" timestamp with time zone,
    "welcome_chat_started_at" timestamp with time zone
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") RETURNS "public"."profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    status,
    rate_per_minute
  )
  values (
    p_user_id,
    p_astrologer_id,
    'WAITING_FOR_ASTROLOGER',
    v_astrologer.price_per_minute
  )
  returning * into v_session;

  insert into public.system_events(user_id, type, payload)
  values (
    p_user_id,
    'CONSULTATION_REQUESTED',
    pg_catalog.jsonb_build_object('session_id', v_session.id, 'astrologer_id', p_astrologer_id)
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


ALTER FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid", "p_kundli_profile_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid", "p_kundli_profile_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "user_id" "uuid" NOT NULL,
    "balance" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "wallets_balance_check" CHECK (("balance" >= 0.00))
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") RETURNS "public"."wallets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := (select auth.uid());
  v_wallet public.wallets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not coalesce((select enabled from private.app_config where key = 'demo_wallet_enabled'), false) then
    raise exception 'Demo wallet is disabled';
  end if;
  if p_amount <= 0 or p_amount > 10000 then
    raise exception 'Debit amount must be between 0 and 10000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0));

  if exists (
    select 1 from public.wallet_transactions
    where user_id = v_user_id and reference_id = p_idempotency_key
  ) then
    select * into v_wallet from public.wallets where user_id = v_user_id;
    return v_wallet;
  end if;

  update public.wallets
  set balance = balance - p_amount, updated_at = now()
  where user_id = v_user_id and balance >= p_amount
  returning * into v_wallet;

  if v_wallet.user_id is null then
    raise exception 'Insufficient wallet balance';
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, title, description, status, reference_type, reference_id)
  values
    (v_user_id, 'debit', p_amount, 'Consultation Session Charge', 'Demo consultation billing', 'completed', 'consultation', p_idempotency_key);

  return v_wallet;
end;
$$;


ALTER FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") RETURNS "public"."wallets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_user_id uuid := (select auth.uid());
  v_wallet public.wallets;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if not coalesce((select enabled from private.app_config where key = 'demo_wallet_enabled'), false) then
    raise exception 'Demo wallet is disabled';
  end if;
  if p_amount < 1 or p_amount > 10000 then
    raise exception 'Recharge amount must be between 1 and 10000';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user_id::text || p_idempotency_key::text, 0));

  if exists (
    select 1 from public.wallet_transactions
    where user_id = v_user_id and reference_id = p_idempotency_key
  ) then
    select * into v_wallet from public.wallets where user_id = v_user_id;
    return v_wallet;
  end if;

  update public.wallets
  set balance = balance + p_amount, updated_at = now()
  where user_id = v_user_id
  returning * into v_wallet;

  if v_wallet.user_id is null then
    raise exception 'Wallet not found';
  end if;

  insert into public.wallet_transactions
    (user_id, type, amount, title, description, status, reference_type, reference_id)
  values
    (v_user_id, 'credit', p_amount, 'Wallet Recharge (Demo)', 'Demo mode — no payment captured', 'completed', 'recharge', p_idempotency_key);

  return v_wallet;
end;
$$;


ALTER FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_self_kundli_profile"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_user_id  uuid := auth.uid();
  v_profile  public.profiles;
  v_kundli   public.kundli_profiles;
BEGIN
  -- 1. Require authenticated session
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- 2. Serialise concurrent calls for the same user+relation to eliminate
  --    the race between the existence check and the INSERT.
  --    The lock is released automatically at transaction end.
  PERFORM pg_advisory_xact_lock(
    pg_catalog.hashtext(v_user_id::text || ':self-kundli')
  );

  -- 3. Read onboarding birth details (never accept from client)
  SELECT *
  INTO   v_profile
  FROM   public.profiles
  WHERE  id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found for uid %', v_user_id;
  END IF;

  -- 4. Return null if birth details are incomplete
  --    (normal product state — not an error condition)
  IF v_profile.dob            IS NULL
  OR v_profile.tob            IS NULL
  OR v_profile.birth_state    IS NULL OR pg_catalog.length(pg_catalog.trim(v_profile.birth_state))    = 0
  OR v_profile.birth_district IS NULL OR pg_catalog.length(pg_catalog.trim(v_profile.birth_district)) = 0
  OR v_profile.birth_city     IS NULL OR pg_catalog.length(pg_catalog.trim(v_profile.birth_city))     = 0
  OR v_profile.name           IS NULL OR pg_catalog.length(pg_catalog.trim(v_profile.name))           = 0
  OR v_profile.gender         IS NULL OR pg_catalog.length(pg_catalog.trim(v_profile.gender))         = 0
  THEN
    RETURN pg_catalog.jsonb_build_object(
      'profile', NULL,
      'reason',  'INCOMPLETE_BIRTH_DETAILS'
    );
  END IF;

  -- 5. Return existing self profile unchanged (never overwrite user edits)
  SELECT *
  INTO   v_kundli
  FROM   public.kundli_profiles
  WHERE  owner_id = v_user_id
    AND  relation = 'self'
  LIMIT 1;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object(
      'profile', pg_catalog.to_jsonb(v_kundli),
      'reason',  'EXISTING'
    );
  END IF;

  -- 6. Create the canonical self profile.
  --    All place fields are stored structured (no concatenation).
  --    The partial unique index catches any duplicate that somehow bypasses the
  --    advisory lock (belt-and-suspenders).
  INSERT INTO public.kundli_profiles (
    owner_id,
    name,
    relation,
    gender,
    dob,
    tob,
    birth_state,
    birth_district,
    birth_city,
    is_default
  ) VALUES (
    v_user_id,
    pg_catalog.trim(v_profile.name),
    'self',
    pg_catalog.trim(v_profile.gender),
    v_profile.dob,
    v_profile.tob,
    pg_catalog.trim(v_profile.birth_state),
    pg_catalog.trim(v_profile.birth_district),
    pg_catalog.trim(v_profile.birth_city),
    true
  )
  RETURNING * INTO v_kundli;

  RETURN pg_catalog.jsonb_build_object(
    'profile', pg_catalog.to_jsonb(v_kundli),
    'reason',  'CREATED'
  );
END;
$$;


ALTER FUNCTION "public"."ensure_self_kundli_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."expire_waiting_consultation"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
  v_settings public.consultation_settings;
begin
  select * into v_settings from public.consultation_settings where id = true;
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status = 'EXPIRED' then
    return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Session is not waiting';
  end if;
  if pg_catalog.now() < v_session.requested_at + pg_catalog.make_interval(secs => v_settings.request_timeout_seconds) then
    raise exception 'Request timeout has not elapsed';
  end if;

  update public.consultation_sessions
  set status = 'EXPIRED', ended_at = pg_catalog.now()
  where id = p_session_id
  returning * into v_session;
  return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
end;
$$;


ALTER FUNCTION "public"."expire_waiting_consultation"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finish_consultation_session"("p_session_id" "uuid", "p_reason" "text" DEFAULT 'user_ended'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
  v_billing jsonb;
  v_now timestamptz := pg_catalog.now();
begin
  v_billing := public.bill_consultation_session(p_session_id);

  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if v_session.status <> 'ENDED' then
    update public.consultation_sessions
    set status = 'ENDED',
        ended_at = v_now,
        elapsed_seconds = case
          when started_at is null then elapsed_seconds
          else greatest(0, pg_catalog.floor(extract(epoch from (v_now - started_at)))::integer)
        end
    where id = p_session_id
    returning * into v_session;
  end if;

  insert into public.system_events(user_id, type, payload)
  values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;


ALTER FUNCTION "public"."finish_consultation_session"("p_session_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  -- Auth identity only. complete_onboarding() creates application records.
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") RETURNS "public"."wallets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_order public.payment_orders;
  v_wallet public.wallets;
  v_amount_rupees numeric(10,2);
begin
  -- Ensure only service_role can execute this
  if current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' then
    raise exception 'Unauthorized: Only backend proxy can process razorpay payments';
  end if;

  -- 1. Lock the order row
  select * into v_order
  from public.payment_orders
  where id = p_order_id
  for update;

  if v_order is null then
    raise exception 'Payment order not found';
  end if;

  -- 2. Verify idempotency and state transitions
  if v_order.status = 'credited' then
    if v_order.razorpay_payment_id = p_razorpay_payment_id then
      -- Idempotent success
      select * into v_wallet from public.wallets where user_id = v_order.user_id;
      return v_wallet;
    else
      raise exception 'Payment order already credited with a different payment ID';
    end if;
  end if;

  if v_order.status in ('refunded', 'partially_refunded') then
    raise exception 'Payment order already refunded, cannot credit.';
  end if;

  -- 3. Insert wallet if missing, then lock it
  insert into public.wallets (user_id, balance)
  values (v_order.user_id, 0.00)
  on conflict (user_id) do nothing;

  select * into v_wallet
  from public.wallets
  where user_id = v_order.user_id
  for update;

  if v_wallet is null then
    raise exception 'Wallet could not be locked or found';
  end if;

  -- 4. Credit the wallet
  v_amount_rupees := v_order.amount_paise / 100.0;
  
  update public.wallets
  set balance = balance + v_amount_rupees,
      updated_at = now()
  where user_id = v_order.user_id
  returning * into v_wallet;

  -- 5. Insert wallet transaction
  insert into public.wallet_transactions (
    user_id, type, amount, title, description, status, reference_type, reference_id
  ) values (
    v_order.user_id, 'credit', v_amount_rupees, 'Wallet Recharge', 'Razorpay recharge (Test)', 'completed', 'recharge', v_order.id
  );

  -- 6. Update order status
  update public.payment_orders
  set status = 'credited',
      razorpay_payment_id = p_razorpay_payment_id,
      updated_at = now()
  where id = v_order.id;

  return v_wallet;
end;
$$;


ALTER FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text" DEFAULT NULL::"text", "p_ref_type" "text" DEFAULT 'recharge'::"text", "p_ref_id" "uuid" DEFAULT NULL::"uuid") RETURNS "public"."wallets"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog', 'public'
    AS $$
declare
  v_wallet public.wallets;
begin
  -- Enforce service role (backend only)
  if current_setting('request.jwt.claims', true)::json->>'role' != 'service_role' then
    raise exception 'Unauthorized: Only backend proxy can recharge wallet';
  end if;

  if p_amount <= 0 then
    raise exception 'Recharge amount must be greater than zero';
  end if;

  -- 1. Update wallet balance
  insert into public.wallets (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
  set balance = public.wallets.balance + p_amount,
      updated_at = now()
  returning * into v_wallet;

  -- 2. Log transaction history ledger
  insert into public.wallet_transactions (user_id, type, amount, title, description, status, reference_type, reference_id, created_at)
  values (p_user_id, 'credit', p_amount, p_title, p_description, 'completed', p_ref_type, p_ref_id, now());

  -- 3. Log Audit Event
  insert into public.system_events (user_id, type, payload)
  values (p_user_id, 'WALLET_RECHARGE', jsonb_build_object('amount', p_amount, 'title', p_title));

  return v_wallet;
end;
$$;


ALTER FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text", "p_ref_type" "text", "p_ref_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_consultation_customer_snapshot"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."set_consultation_customer_snapshot"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_row_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at := now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_row_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
  v_billing_id uuid;
  v_now timestamptz := pg_catalog.now();
begin
  select * into v_session
  from public.consultation_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found';
  end if;
  if v_session.status in ('ACTIVE', 'LOW_BALANCE', 'RECHARGING') then
    return pg_catalog.jsonb_build_object('status', 'already_started', 'session', pg_catalog.to_jsonb(v_session));
  end if;
  if v_session.status <> 'WAITING_FOR_ASTROLOGER' then
    raise exception 'Session cannot be started from status %', v_session.status;
  end if;

  select * into v_settings from public.consultation_settings where id = true;
  if v_now >= v_session.requested_at + pg_catalog.make_interval(secs => v_settings.request_timeout_seconds) then
    update public.consultation_sessions
    set status = 'EXPIRED', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'expired', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  select * into v_wallet
  from public.wallets
  where user_id = v_session.user_id
  for update;

  if v_wallet.balance < v_session.rate_per_minute then
    update public.consultation_sessions
    set status = 'INSUFFICIENT_BALANCE', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
  end if;

  insert into public.consultation_billing_entries(session_id, user_id, minute_number, amount, billed_at)
  values (p_session_id, v_session.user_id, 1, v_session.rate_per_minute, v_now)
  on conflict (session_id, minute_number) do nothing
  returning id into v_billing_id;

  if v_billing_id is not null then
    update public.wallets
    set balance = balance - v_session.rate_per_minute, updated_at = v_now
    where user_id = v_session.user_id;

    insert into public.wallet_transactions (
      user_id, type, amount, title, description, status, reference_type, reference_id, created_at
    ) values (
      v_session.user_id, 'debit', v_session.rate_per_minute, 'Consultation Charge',
      'Minute 1', 'completed', 'consultation', v_billing_id, v_now
    );
  end if;

  update public.consultation_sessions
  set status = 'ACTIVE',
      started_at = coalesce(started_at, v_now),
      last_billed_at = v_now,
      billed_minutes = 1,
      total_charged = v_session.rate_per_minute,
      elapsed_seconds = 0
  where id = p_session_id
  returning * into v_session;

  select * into v_wallet from public.wallets where user_id = v_session.user_id;
  return pg_catalog.jsonb_build_object('status', 'started', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
end;
$$;


ALTER FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_welcome_chat"() RETURNS "public"."profiles"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."start_welcome_chat"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_astrologer_consultation_availability"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."sync_astrologer_consultation_availability"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
begin
  if p_target_status = 'ACTIVE' then
    return public.start_consultation_session(p_session_id);
  end if;
  if p_target_status not in ('REJECTED', 'EXPIRED') then
    raise exception 'Unsupported consultation transition';
  end if;

  update public.consultation_sessions
  set status = p_target_status, ended_at = pg_catalog.now()
  where id = p_session_id and status = 'WAITING_FOR_ASTROLOGER'
  returning * into v_session;

  if not found then
    raise exception 'Waiting session not found';
  end if;
  return pg_catalog.jsonb_build_object('status', pg_catalog.lower(p_target_status), 'session', pg_catalog.to_jsonb(v_session));
end;
$$;


ALTER FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "private"."app_config" (
    "key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "private"."app_config" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."account_roles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "account_roles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'astrologer'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."account_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "legal_name" "text",
    "display_name" "text",
    "email" "text",
    "phone" "text",
    "pan_number" "text",
    "experience_years" smallint,
    "languages" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "skills" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "qualification" "text",
    "consultation_modes" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "about" "text",
    "requested_price_per_minute" numeric(10,2),
    "profile_photo_url" "text",
    "pan_document_path" "text",
    "certificate_paths" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "rejection_reason" "text",
    "submitted_at" timestamp with time zone,
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "astrologer_application_pending_is_complete" CHECK ((("status" <> 'pending'::"text") OR ((NULLIF("btrim"("legal_name"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("display_name"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("email"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("phone"), ''::"text") IS NOT NULL) AND ("pan_number" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::"text") AND ("experience_years" IS NOT NULL) AND ("cardinality"("languages") > 0) AND ("cardinality"("skills") > 0) AND ("cardinality"("consultation_modes") > 0) AND (NULLIF("btrim"("about"), ''::"text") IS NOT NULL) AND ("requested_price_per_minute" IS NOT NULL) AND (NULLIF("btrim"("profile_photo_url"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("pan_document_path"), ''::"text") IS NOT NULL) AND ("submitted_at" IS NOT NULL)))),
    CONSTRAINT "astrologer_applications_experience_years_check" CHECK ((("experience_years" >= 0) AND ("experience_years" <= 80))),
    CONSTRAINT "astrologer_applications_requested_price_per_minute_check" CHECK ((("requested_price_per_minute" >= (0)::numeric) AND ("requested_price_per_minute" <= (10000)::numeric))),
    CONSTRAINT "astrologer_applications_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."astrologer_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."astrologer_applications" IS 'Private partner applications. Public profile data is copied to astrologers only after approval.';



CREATE TABLE IF NOT EXISTS "public"."astrologers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "image" "text",
    "experience" "text" NOT NULL,
    "languages" "text"[] NOT NULL,
    "skills" "text"[] NOT NULL,
    "rating" numeric(3,2) DEFAULT 5.00 NOT NULL,
    "consultations" integer DEFAULT 0 NOT NULL,
    "price_per_minute" numeric(10,2) NOT NULL,
    "status" "text" DEFAULT 'OFFLINE'::"text" NOT NULL,
    "next_available_at" timestamp with time zone,
    "last_seen" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "about" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "user_id" "uuid",
    "application_id" "uuid",
    "is_published" boolean DEFAULT true NOT NULL,
    CONSTRAINT "astrologers_price_per_minute_check" CHECK (("price_per_minute" >= 0.00)),
    CONSTRAINT "astrologers_status_check" CHECK (("status" = ANY (ARRAY['ONLINE'::"text", 'BUSY'::"text", 'OFFLINE'::"text"])))
);


ALTER TABLE "public"."astrologers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_astrologer_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."consultation_astrologer_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_billing_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "minute_number" integer NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "billed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consultation_billing_entries_amount_check" CHECK (("amount" > (0)::numeric)),
    CONSTRAINT "consultation_billing_entries_minute_number_check" CHECK (("minute_number" > 0))
);


ALTER TABLE "public"."consultation_billing_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "sender" "text" NOT NULL,
    "message_text" "text",
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "attachment_url" "text",
    "attachment_name" "text",
    "status" "text" DEFAULT 'sent'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "edited_at" timestamp with time zone,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "client_message_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_user_id" "uuid",
    CONSTRAINT "consultation_messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'pdf'::"text", 'voice'::"text", 'system'::"text", 'kundli-card'::"text"]))),
    CONSTRAINT "consultation_messages_sender_check" CHECK (("sender" = ANY (ARRAY['astrologer'::"text", 'user'::"text", 'system'::"text"]))),
    CONSTRAINT "consultation_messages_status_check" CHECK (("status" = ANY (ARRAY['sent'::"text", 'delivered'::"text", 'read'::"text"])))
);


ALTER TABLE "public"."consultation_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "astrologer_id" "uuid",
    "status" "text" NOT NULL,
    "rate_per_minute" numeric(10,2) NOT NULL,
    "requested_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "started_at" timestamp with time zone,
    "ended_at" timestamp with time zone,
    "last_billed_at" timestamp with time zone,
    "billed_minutes" integer DEFAULT 0 NOT NULL,
    "total_charged" numeric(10,2) DEFAULT 0.00 NOT NULL,
    "elapsed_seconds" integer DEFAULT 0 NOT NULL,
    "recharge_deadline_at" timestamp with time zone,
    "customer_display_name" "text",
    "kundli_profile_id" "uuid",
    CONSTRAINT "consultation_sessions_rate_per_minute_check" CHECK (("rate_per_minute" >= 0.00)),
    CONSTRAINT "consultation_sessions_status_check" CHECK (("status" = ANY (ARRAY['CHECKING_WALLET'::"text", 'INSUFFICIENT_BALANCE'::"text", 'PREPARING_KUNDLI'::"text", 'WAITING_FOR_ASTROLOGER'::"text", 'REJECTED'::"text", 'EXPIRED'::"text", 'CANCELLED'::"text", 'ACTIVE'::"text", 'LOW_BALANCE'::"text", 'RECHARGING'::"text", 'ENDED'::"text"])))
);


ALTER TABLE "public"."consultation_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."consultation_settings" (
    "id" boolean DEFAULT true NOT NULL,
    "minimum_minutes" integer NOT NULL,
    "billing_interval_seconds" integer NOT NULL,
    "heartbeat_interval_seconds" integer NOT NULL,
    "request_timeout_seconds" integer NOT NULL,
    "recharge_grace_seconds" integer NOT NULL,
    "low_balance_minutes" integer NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "consultation_settings_billing_interval_seconds_check" CHECK (("billing_interval_seconds" > 0)),
    CONSTRAINT "consultation_settings_heartbeat_interval_seconds_check" CHECK (("heartbeat_interval_seconds" > 0)),
    CONSTRAINT "consultation_settings_id_check" CHECK ("id"),
    CONSTRAINT "consultation_settings_low_balance_minutes_check" CHECK (("low_balance_minutes" > 0)),
    CONSTRAINT "consultation_settings_minimum_minutes_check" CHECK (("minimum_minutes" > 0)),
    CONSTRAINT "consultation_settings_recharge_grace_seconds_check" CHECK (("recharge_grace_seconds" > 0)),
    CONSTRAINT "consultation_settings_request_timeout_seconds_check" CHECK (("request_timeout_seconds" > 0))
);


ALTER TABLE "public"."consultation_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kundli_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "relation" "text" DEFAULT 'self'::"text" NOT NULL,
    "gender" "text" NOT NULL,
    "dob" "date" NOT NULL,
    "tob" time without time zone NOT NULL,
    "birth_state" "text" NOT NULL,
    "birth_district" "text" NOT NULL,
    "birth_city" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "timezone" "text"
);


ALTER TABLE "public"."kundli_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."kundli_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "profile_id" "uuid" NOT NULL,
    "engine" "text" DEFAULT 'VedAstro'::"text" NOT NULL,
    "version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "report_json" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."kundli_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "package_id" "text" NOT NULL,
    "amount_paise" integer NOT NULL,
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "razorpay_order_id" "text",
    "razorpay_payment_id" "text",
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "payment_orders_amount_paise_check" CHECK (("amount_paise" > 0)),
    CONSTRAINT "payment_orders_currency_check" CHECK (("currency" = 'INR'::"text")),
    CONSTRAINT "payment_orders_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'authorized'::"text", 'captured'::"text", 'failed'::"text", 'credited'::"text", 'refunded'::"text", 'partially_refunded'::"text"])))
);


ALTER TABLE "public"."payment_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payment_refunds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "payment_order_id" "uuid" NOT NULL,
    "razorpay_refund_id" "text" NOT NULL,
    "razorpay_payment_id" "text" NOT NULL,
    "amount_paise" integer NOT NULL,
    "status" "text" DEFAULT 'processed'::"text" NOT NULL,
    "reconciliation_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "payment_refunds_amount_paise_check" CHECK (("amount_paise" > 0))
);


ALTER TABLE "public"."payment_refunds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."support_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "topic" "text" NOT NULL,
    "subject" "text" NOT NULL,
    "message" "text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "support_requests_message_check" CHECK ((("char_length"("btrim"("message")) >= 10) AND ("char_length"("btrim"("message")) <= 2000))),
    CONSTRAINT "support_requests_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"]))),
    CONSTRAINT "support_requests_subject_check" CHECK ((("char_length"("btrim"("subject")) >= 3) AND ("char_length"("btrim"("subject")) <= 120))),
    CONSTRAINT "support_requests_topic_check" CHECK (("topic" = ANY (ARRAY['payment-wallet'::"text", 'consultation'::"text", 'account-profile'::"text", 'kundli-report'::"text", 'become-astrologer'::"text", 'business-partnership'::"text", 'technical-problem'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."support_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "payload" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."system_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "fcm_token" "text" NOT NULL,
    "device_type" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."user_devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallet_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "wallet_transactions_amount_check" CHECK (("amount" > 0.00)),
    CONSTRAINT "wallet_transactions_reference_type_check" CHECK (("reference_type" = ANY (ARRAY['recharge'::"text", 'consultation'::"text", 'refund'::"text", 'bonus'::"text"]))),
    CONSTRAINT "wallet_transactions_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'failed'::"text", 'pending'::"text"]))),
    CONSTRAINT "wallet_transactions_type_check" CHECK (("type" = ANY (ARRAY['credit'::"text", 'debit'::"text"])))
);


ALTER TABLE "public"."wallet_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "private"."app_config"
    ADD CONSTRAINT "app_config_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."account_roles"
    ADD CONSTRAINT "account_roles_pkey" PRIMARY KEY ("user_id", "role");



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_application_id_key" UNIQUE ("application_id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."consultation_astrologer_notes"
    ADD CONSTRAINT "consultation_astrologer_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_astrologer_notes"
    ADD CONSTRAINT "consultation_astrologer_notes_session_id_astrologer_id_key" UNIQUE ("session_id", "astrologer_id");



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_session_id_minute_number_key" UNIQUE ("session_id", "minute_number");



ALTER TABLE ONLY "public"."consultation_messages"
    ADD CONSTRAINT "consultation_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_sessions"
    ADD CONSTRAINT "consultation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."consultation_settings"
    ADD CONSTRAINT "consultation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kundli_profiles"
    ADD CONSTRAINT "kundli_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kundli_reports"
    ADD CONSTRAINT "kundli_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_razorpay_order_id_key" UNIQUE ("razorpay_order_id");



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_razorpay_payment_id_key" UNIQUE ("razorpay_payment_id");



ALTER TABLE ONLY "public"."payment_refunds"
    ADD CONSTRAINT "payment_refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_refunds"
    ADD CONSTRAINT "payment_refunds_razorpay_refund_id_key" UNIQUE ("razorpay_refund_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_phone_key" UNIQUE ("phone");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_events"
    ADD CONSTRAINT "system_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_fcm_token_key" UNIQUE ("fcm_token");



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "astrologer_applications_status_submitted_idx" ON "public"."astrologer_applications" USING "btree" ("status", "submitted_at" DESC) WHERE ("status" = 'pending'::"text");



CREATE INDEX "idx_consultation_billing_entries_user" ON "public"."consultation_billing_entries" USING "btree" ("user_id", "billed_at" DESC);



CREATE INDEX "idx_consultation_messages_sender_user" ON "public"."consultation_messages" USING "btree" ("sender_user_id");



CREATE INDEX "idx_consultations_astrologer" ON "public"."consultation_sessions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_consultations_user" ON "public"."consultation_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_kundli_reports_profile" ON "public"."kundli_reports" USING "btree" ("profile_id");



CREATE INDEX "idx_messages_session" ON "public"."consultation_messages" USING "btree" ("session_id");



CREATE INDEX "idx_payment_orders_rzp_order" ON "public"."payment_orders" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_payment_orders_user" ON "public"."payment_orders" USING "btree" ("user_id");



CREATE INDEX "idx_payment_refunds_order" ON "public"."payment_refunds" USING "btree" ("payment_order_id");



CREATE INDEX "idx_user_devices_user" ON "public"."user_devices" USING "btree" ("user_id");



CREATE INDEX "idx_wallet_tx_user" ON "public"."wallet_transactions" USING "btree" ("user_id");



CREATE INDEX "support_requests_user_created_idx" ON "public"."support_requests" USING "btree" ("user_id", "created_at" DESC);



CREATE UNIQUE INDEX "uidx_kundli_profiles_owner_self" ON "public"."kundli_profiles" USING "btree" ("owner_id") WHERE ("relation" = 'self'::"text");



CREATE UNIQUE INDEX "uq_consultation_message_client_id" ON "public"."consultation_messages" USING "btree" ("session_id", "client_message_id");



CREATE UNIQUE INDEX "uq_consultation_open_session_per_user" ON "public"."consultation_sessions" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['CHECKING_WALLET'::"text", 'PREPARING_KUNDLI'::"text", 'WAITING_FOR_ASTROLOGER'::"text", 'ACTIVE'::"text", 'LOW_BALANCE'::"text", 'RECHARGING'::"text"]));



CREATE UNIQUE INDEX "uq_wallet_tx_user_reference" ON "public"."wallet_transactions" USING "btree" ("user_id", "reference_id") WHERE ("reference_id" IS NOT NULL);



CREATE OR REPLACE TRIGGER "set_astrologer_application_updated_at" BEFORE UPDATE ON "public"."astrologer_applications" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "set_astrologer_profile_updated_at" BEFORE UPDATE ON "public"."astrologers" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "set_consultation_astrologer_notes_updated_at" BEFORE UPDATE ON "public"."consultation_astrologer_notes" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "set_consultation_customer_snapshot" BEFORE INSERT ON "public"."consultation_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_consultation_customer_snapshot"();



CREATE OR REPLACE TRIGGER "set_support_request_updated_at" BEFORE UPDATE ON "public"."support_requests" FOR EACH ROW EXECUTE FUNCTION "public"."set_row_updated_at"();



CREATE OR REPLACE TRIGGER "sync_astrologer_consultation_availability" AFTER UPDATE OF "status" ON "public"."consultation_sessions" FOR EACH ROW WHEN (("old"."status" IS DISTINCT FROM "new"."status")) EXECUTE FUNCTION "public"."sync_astrologer_consultation_availability"();



ALTER TABLE ONLY "public"."account_roles"
    ADD CONSTRAINT "account_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."astrologer_applications"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_astrologer_notes"
    ADD CONSTRAINT "consultation_astrologer_notes_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_astrologer_notes"
    ADD CONSTRAINT "consultation_astrologer_notes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consultation_messages"
    ADD CONSTRAINT "consultation_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_messages"
    ADD CONSTRAINT "consultation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_sessions"
    ADD CONSTRAINT "consultation_sessions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_sessions"
    ADD CONSTRAINT "consultation_sessions_kundli_profile_id_fkey" FOREIGN KEY ("kundli_profile_id") REFERENCES "public"."kundli_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."consultation_sessions"
    ADD CONSTRAINT "consultation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kundli_profiles"
    ADD CONSTRAINT "kundli_profiles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kundli_reports"
    ADD CONSTRAINT "kundli_reports_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "public"."kundli_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_orders"
    ADD CONSTRAINT "payment_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_refunds"
    ADD CONSTRAINT "payment_refunds_payment_order_id_fkey" FOREIGN KEY ("payment_order_id") REFERENCES "public"."payment_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."support_requests"
    ADD CONSTRAINT "support_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_events"
    ADD CONSTRAINT "system_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Astrologer manages own notes" ON "public"."consultation_astrologer_notes" TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = ( SELECT "astrologers"."user_id"
   FROM "public"."astrologers"
  WHERE ("astrologers"."id" = "consultation_astrologer_notes"."astrologer_id"))) AND ("astrologer_id" = ( SELECT "consultation_sessions"."astrologer_id"
   FROM "public"."consultation_sessions"
  WHERE ("consultation_sessions"."id" = "consultation_astrologer_notes"."session_id"))))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = ( SELECT "astrologers"."user_id"
   FROM "public"."astrologers"
  WHERE ("astrologers"."id" = "consultation_astrologer_notes"."astrologer_id"))) AND ("astrologer_id" = ( SELECT "consultation_sessions"."astrologer_id"
   FROM "public"."consultation_sessions"
  WHERE ("consultation_sessions"."id" = "consultation_astrologer_notes"."session_id")))));



CREATE POLICY "Astrologer updates own public profile" ON "public"."astrologers" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Create own astrologer application draft" ON "public"."astrologer_applications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'draft'::"text") AND ("rejection_reason" IS NULL) AND ("reviewed_at" IS NULL)));



CREATE POLICY "Create own support request" ON "public"."support_requests" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'open'::"text")));



CREATE POLICY "Delete devices" ON "public"."user_devices" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Delete kundli_profiles" ON "public"."kundli_profiles" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Insert devices" ON "public"."user_devices" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Insert kundli_profiles" ON "public"."kundli_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Participants read consultation messages" ON "public"."consultation_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."consultation_sessions" "session"
  WHERE (("session"."id" = "consultation_messages"."session_id") AND (("session"."user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
           FROM "public"."astrologers" "assigned_astrologer"
          WHERE (("assigned_astrologer"."id" = "session"."astrologer_id") AND ("assigned_astrologer"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("assigned_astrologer"."is_published" = true)))))))));



CREATE POLICY "Participants read consultation sessions" ON "public"."consultation_sessions" FOR SELECT TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."astrologers" "assigned_astrologer"
  WHERE (("assigned_astrologer"."id" = "consultation_sessions"."astrologer_id") AND ("assigned_astrologer"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("assigned_astrologer"."is_published" = true))))));



CREATE POLICY "Participants send consultation messages" ON "public"."consultation_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'pdf'::"text", 'voice'::"text"])) AND (EXISTS ( SELECT 1
   FROM "public"."consultation_sessions" "session"
  WHERE (("session"."id" = "consultation_messages"."session_id") AND ("session"."status" = ANY (ARRAY['ACTIVE'::"text", 'LOW_BALANCE'::"text", 'RECHARGING'::"text"])) AND ((("session"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("consultation_messages"."sender" = 'user'::"text")) OR (EXISTS ( SELECT 1
           FROM "public"."astrologers" "assigned_astrologer"
          WHERE (("assigned_astrologer"."id" = "session"."astrologer_id") AND ("assigned_astrologer"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("assigned_astrologer"."is_published" = true) AND ("consultation_messages"."sender" = 'astrologer'::"text"))))))))));



CREATE POLICY "Read own account roles" ON "public"."account_roles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Read own astrologer application" ON "public"."astrologer_applications" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Read own support requests" ON "public"."support_requests" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select devices" ON "public"."user_devices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select kundli_profiles" ON "public"."kundli_profiles" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Select kundli_reports" ON "public"."kundli_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."kundli_profiles"
  WHERE (("kundli_profiles"."id" = "kundli_reports"."profile_id") AND ("kundli_profiles"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Select own consultation billing entries" ON "public"."consultation_billing_entries" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select payment orders" ON "public"."payment_orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select payment refunds" ON "public"."payment_refunds" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payment_orders"
  WHERE (("payment_orders"."id" = "payment_refunds"."payment_order_id") AND ("payment_orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Select profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Select published astrologers" ON "public"."astrologers" FOR SELECT TO "authenticated", "anon" USING (("is_published" = true));



CREATE POLICY "Select wallet" ON "public"."wallets" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select wallet transactions" ON "public"."wallet_transactions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Service role insert kundli_reports" ON "public"."kundli_reports" FOR INSERT WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role manage system events" ON "public"."system_events" USING (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Update editable astrologer application" ON "public"."astrologer_applications" FOR UPDATE TO "authenticated" USING (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = ANY (ARRAY['draft'::"text", 'rejected'::"text"])))) WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = ANY (ARRAY['draft'::"text", 'pending'::"text"])) AND ("rejection_reason" IS NULL) AND ("reviewed_at" IS NULL)));



CREATE POLICY "Update kundli_profiles" ON "public"."kundli_profiles" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Update profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."account_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_astrologer_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_billing_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kundli_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kundli_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."support_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."astrologer_applications";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."astrologers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."consultation_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."consultation_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallet_transactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallets";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."accept_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cancel_customer_consultation"("p_session_id" "uuid", "p_customer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cancel_customer_consultation"("p_session_id" "uuid", "p_customer_user_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid", "p_kundli_profile_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid", "p_kundli_profile_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid", "p_kundli_profile_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



REVOKE ALL ON FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_self_kundli_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_self_kundli_profile"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_self_kundli_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."expire_waiting_consultation"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."expire_waiting_consultation"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."finish_consultation_session"("p_session_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."finish_consultation_session"("p_session_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text", "p_ref_type" "text", "p_ref_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text", "p_ref_type" "text", "p_ref_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_consultation_customer_snapshot"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_consultation_customer_snapshot"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_welcome_chat"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_astrologer_consultation_availability"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_astrologer_consultation_availability"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."account_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."account_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."astrologer_applications" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."astrologer_applications" TO "authenticated";



GRANT ALL ON TABLE "public"."astrologers" TO "service_role";
GRANT SELECT ON TABLE "public"."astrologers" TO "anon";
GRANT SELECT ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("name") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("image") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("experience") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("languages") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("skills") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("status") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("last_seen") ON TABLE "public"."astrologers" TO "authenticated";



GRANT UPDATE("about") ON TABLE "public"."astrologers" TO "authenticated";



GRANT ALL ON TABLE "public"."consultation_astrologer_notes" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."consultation_astrologer_notes" TO "authenticated";



GRANT ALL ON TABLE "public"."consultation_billing_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_billing_entries" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_messages" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."consultation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_settings" TO "service_role";



GRANT ALL ON TABLE "public"."kundli_profiles" TO "anon";
GRANT ALL ON TABLE "public"."kundli_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."kundli_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."kundli_reports" TO "anon";
GRANT ALL ON TABLE "public"."kundli_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."kundli_reports" TO "service_role";



GRANT ALL ON TABLE "public"."payment_orders" TO "anon";
GRANT ALL ON TABLE "public"."payment_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_orders" TO "service_role";



GRANT ALL ON TABLE "public"."payment_refunds" TO "anon";
GRANT ALL ON TABLE "public"."payment_refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_refunds" TO "service_role";



GRANT ALL ON TABLE "public"."support_requests" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."support_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."system_events" TO "anon";
GRANT ALL ON TABLE "public"."system_events" TO "authenticated";
GRANT ALL ON TABLE "public"."system_events" TO "service_role";



GRANT ALL ON TABLE "public"."user_devices" TO "anon";
GRANT ALL ON TABLE "public"."user_devices" TO "authenticated";
GRANT ALL ON TABLE "public"."user_devices" TO "service_role";



GRANT ALL ON TABLE "public"."wallet_transactions" TO "anon";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."wallet_transactions" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



































