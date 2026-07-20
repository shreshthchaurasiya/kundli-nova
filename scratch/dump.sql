


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
    CONSTRAINT "astrologers_price_per_minute_check" CHECK (("price_per_minute" >= 0.00)),
    CONSTRAINT "astrologers_status_check" CHECK (("status" = ANY (ARRAY['ONLINE'::"text", 'BUSY'::"text", 'OFFLINE'::"text"])))
);


ALTER TABLE "public"."astrologers" OWNER TO "postgres";


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
    CONSTRAINT "consultation_sessions_rate_per_minute_check" CHECK (("rate_per_minute" >= 0.00)),
    CONSTRAINT "consultation_sessions_status_check" CHECK (("status" = ANY (ARRAY['CHECKING_WALLET'::"text", 'INSUFFICIENT_BALANCE'::"text", 'PREPARING_KUNDLI'::"text", 'WAITING_FOR_ASTROLOGER'::"text", 'REJECTED'::"text", 'EXPIRED'::"text", 'ACTIVE'::"text", 'LOW_BALANCE'::"text", 'RECHARGING'::"text", 'ENDED'::"text"])))
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
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
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



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_consultation_billing_entries_user" ON "public"."consultation_billing_entries" USING "btree" ("user_id", "billed_at" DESC);



CREATE INDEX "idx_consultations_astrologer" ON "public"."consultation_sessions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_consultations_user" ON "public"."consultation_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_kundli_reports_profile" ON "public"."kundli_reports" USING "btree" ("profile_id");



CREATE INDEX "idx_messages_session" ON "public"."consultation_messages" USING "btree" ("session_id");



CREATE INDEX "idx_payment_orders_rzp_order" ON "public"."payment_orders" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_payment_orders_user" ON "public"."payment_orders" USING "btree" ("user_id");



CREATE INDEX "idx_payment_refunds_order" ON "public"."payment_refunds" USING "btree" ("payment_order_id");



CREATE INDEX "idx_user_devices_user" ON "public"."user_devices" USING "btree" ("user_id");



CREATE INDEX "idx_wallet_tx_user" ON "public"."wallet_transactions" USING "btree" ("user_id");



CREATE UNIQUE INDEX "uq_consultation_open_session_per_user" ON "public"."consultation_sessions" USING "btree" ("user_id") WHERE ("status" = ANY (ARRAY['CHECKING_WALLET'::"text", 'PREPARING_KUNDLI'::"text", 'WAITING_FOR_ASTROLOGER'::"text", 'ACTIVE'::"text", 'LOW_BALANCE'::"text", 'RECHARGING'::"text"]));



CREATE UNIQUE INDEX "uq_wallet_tx_user_reference" ON "public"."wallet_transactions" USING "btree" ("user_id", "reference_id") WHERE ("reference_id" IS NOT NULL);



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consultation_billing_entries"
    ADD CONSTRAINT "consultation_billing_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."consultation_messages"
    ADD CONSTRAINT "consultation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."consultation_sessions"
    ADD CONSTRAINT "consultation_sessions_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."system_events"
    ADD CONSTRAINT "system_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_devices"
    ADD CONSTRAINT "user_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallet_transactions"
    ADD CONSTRAINT "wallet_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin modify astrologers" ON "public"."astrologers" USING (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Delete devices" ON "public"."user_devices" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Delete kundli_profiles" ON "public"."kundli_profiles" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Insert devices" ON "public"."user_devices" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Insert kundli_profiles" ON "public"."kundli_profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Insert messages" ON "public"."consultation_messages" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."consultation_sessions"
  WHERE (("consultation_sessions"."id" = "consultation_messages"."session_id") AND ("consultation_sessions"."user_id" = "auth"."uid"())))) AND ("sender" = 'user'::"text")));



CREATE POLICY "Select astrologers" ON "public"."astrologers" FOR SELECT USING (true);



CREATE POLICY "Select devices" ON "public"."user_devices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select kundli_profiles" ON "public"."kundli_profiles" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Select kundli_reports" ON "public"."kundli_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."kundli_profiles"
  WHERE (("kundli_profiles"."id" = "kundli_reports"."profile_id") AND ("kundli_profiles"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Select messages" ON "public"."consultation_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."consultation_sessions"
  WHERE (("consultation_sessions"."id" = "consultation_messages"."session_id") AND ("consultation_sessions"."user_id" = "auth"."uid"())))));



CREATE POLICY "Select own consultation billing entries" ON "public"."consultation_billing_entries" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select payment orders" ON "public"."payment_orders" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select payment refunds" ON "public"."payment_refunds" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."payment_orders"
  WHERE (("payment_orders"."id" = "payment_refunds"."payment_order_id") AND ("payment_orders"."user_id" = "auth"."uid"())))));



CREATE POLICY "Select profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Select sessions" ON "public"."consultation_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select wallet" ON "public"."wallets" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select wallet transactions" ON "public"."wallet_transactions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Service role insert kundli_reports" ON "public"."kundli_reports" FOR INSERT WITH CHECK (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Service role manage system events" ON "public"."system_events" USING (((("current_setting"('request.jwt.claims'::"text", true))::json ->> 'role'::"text") = 'service_role'::"text"));



CREATE POLICY "Update kundli_profiles" ON "public"."kundli_profiles" FOR UPDATE USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Update profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."astrologers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_billing_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kundli_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kundli_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_orders" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payment_refunds" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."system_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallet_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."profiles";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallet_transactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."wallets";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_onboarding"("p_name" "text", "p_phone" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_state" "text", "p_district" "text", "p_city" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_consultation_session"("p_user_id" "uuid", "p_astrologer_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



REVOKE ALL ON FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."demo_debit_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."demo_recharge_wallet"("p_amount" numeric, "p_idempotency_key" "uuid") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_welcome_chat"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."astrologers" TO "anon";
GRANT ALL ON TABLE "public"."astrologers" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologers" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_billing_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."consultation_billing_entries" TO "service_role";



GRANT ALL ON TABLE "public"."consultation_messages" TO "anon";
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



































