


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


CREATE OR REPLACE FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_user_id uuid;
    v_type text;
    v_transaction_id uuid;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email LIMIT 1;
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email % not found', p_user_email;
    END IF;

    IF p_amount = 0 THEN
        RAISE EXCEPTION 'Amount cannot be zero';
    END IF;

    IF p_amount > 0 THEN
        v_type := 'credit';
    ELSE
        v_type := 'debit';
        p_amount := ABS(p_amount);
    END IF;

    -- Adjust balance
    IF v_type = 'credit' THEN
        UPDATE public.wallets SET balance = balance + p_amount, updated_at = NOW() WHERE user_id = v_user_id;
    ELSE
        UPDATE public.wallets SET balance = balance - p_amount, updated_at = NOW() WHERE user_id = v_user_id;
    END IF;

    -- Create transaction log
    INSERT INTO public.wallet_transactions (
        id, user_id, type, amount, title, description, status, reference_type, created_at
    ) VALUES (
        gen_random_uuid(), v_user_id, v_type, p_amount, p_title, p_description, 'completed', 'promo', NOW()
    ) RETURNING id INTO v_transaction_id;

    RETURN jsonb_build_object('success', true, 'transaction_id', v_transaction_id);
END;
$$;


ALTER FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'REQUESTED' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'APPROVED', approved_at = now(), approved_by = auth.uid(), updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;


ALTER FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Failure reason is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'PROCESSING' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'FAILED', failed_at = now(), failure_reason = p_reason, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;


ALTER FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_payout_reference, '')) = '' then
    raise exception 'Payout reference is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status <> 'PROCESSING' then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'PAID', paid_at = now(), paid_by = auth.uid(), payout_reference = p_payout_reference, bank_reference = p_bank_reference, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;


ALTER FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status not in ('APPROVED', 'FAILED') then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'PROCESSING', processing_at = now(), updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;


ALTER FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_withdrawal public.astrologer_withdrawal_requests;
begin
  if not exists (select 1 from public.account_roles where user_id = auth.uid() and role = 'admin') then
    raise exception 'Unauthorized';
  end if;

  if trim(coalesce(p_reason, '')) = '' then
    raise exception 'Rejection reason is required';
  end if;

  select * into v_withdrawal
  from public.astrologer_withdrawal_requests
  where id = p_withdrawal_id
  for update;

  if not found then raise exception 'Not found'; end if;
  if v_withdrawal.status not in ('REQUESTED', 'APPROVED') then raise exception 'Invalid transition'; end if;

  update public.astrologer_withdrawal_requests
  set status = 'REJECTED', rejected_at = now(), rejected_by = auth.uid(), rejection_reason = p_reason, updated_at = now()
  where id = p_withdrawal_id
  returning * into v_withdrawal;

  return pg_catalog.to_jsonb(v_withdrawal);
end;
$$;


ALTER FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_verify_payout_account"("p_account_id" "uuid", "p_status" "text", "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_account public.astrologer_payout_accounts;
  v_now timestamptz := now();
  v_admin_id uuid := auth.uid();
BEGIN
  PERFORM public.assert_current_user_is_admin();

  IF UPPER(p_status) NOT IN ('VERIFIED', 'REJECTED') THEN
    RAISE EXCEPTION 'Status must be VERIFIED or REJECTED';
  END IF;

  IF UPPER(p_status) = 'REJECTED' AND (p_reason IS NULL OR TRIM(p_reason) = '') THEN
    RAISE EXCEPTION 'Rejection reason is required when rejecting a bank account';
  END IF;

  SELECT * INTO v_account
  FROM public.astrologer_payout_accounts
  WHERE id = p_account_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payout account not found';
  END IF;

  UPDATE public.astrologer_payout_accounts
  SET status = UPPER(p_status),
      rejection_reason = CASE WHEN UPPER(p_status) = 'REJECTED' THEN p_reason ELSE NULL END,
      verified_at = CASE WHEN UPPER(p_status) = 'VERIFIED' THEN v_now ELSE NULL END,
      verified_by = CASE WHEN UPPER(p_status) = 'VERIFIED' THEN v_admin_id ELSE NULL END,
      updated_at = v_now
  WHERE id = p_account_id
  RETURNING * INTO v_account;

  RETURN jsonb_build_object(
    'id', v_account.id,
    'status', v_account.status,
    'rejection_reason', v_account.rejection_reason
  );
END;
$$;


ALTER FUNCTION "public"."admin_verify_payout_account"("p_account_id" "uuid", "p_status" "text", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_app public.astrologer_applications;
    v_astrologer_id uuid;
    v_now timestamptz := pg_catalog.now();
BEGIN
    PERFORM public.assert_current_user_is_admin();

    SELECT * INTO v_app FROM public.astrologer_applications WHERE id = p_application_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Application not found'; END IF;
    IF v_app.status != 'pending' THEN RAISE EXCEPTION 'Application is not in pending state'; END IF;

    UPDATE public.astrologer_applications
    SET status = 'approved', reviewed_at = v_now, rejection_reason = null
    WHERE id = p_application_id;

    INSERT INTO public.astrologers (user_id, status, is_published, experience_years, skills, languages, bio, profile_photo_url, price_per_minute, created_at, updated_at)
    VALUES (v_app.user_id, 'OFFLINE', false, v_app.experience_years, v_app.skills, v_app.languages, v_app.about, v_app.profile_photo_url, v_app.requested_price_per_minute, v_now, v_now)
    RETURNING id INTO v_astrologer_id;

    -- Update user role
    INSERT INTO public.account_roles (user_id, role)
    VALUES (v_app.user_id, 'astrologer')
    ON CONFLICT (user_id, role) DO NOTHING;

    -- If bank details exist in the application, save them to astrologer_payout_accounts
    IF v_app.bank_account_number IS NOT NULL AND v_app.bank_ifsc_code IS NOT NULL THEN
        INSERT INTO public.astrologer_payout_accounts (
            astrologer_id, account_holder_name, bank_name, 
            account_number_secret_id, account_number_last4, ifsc_code, status, 
            submitted_at, updated_at, verified_at, verified_by
        ) VALUES (
            v_astrologer_id, 
            v_app.bank_account_holder_name, 
            v_app.bank_name, 
            vault.create_secret(v_app.bank_account_number, 'astrologer_payout_' || v_astrologer_id::text, 'Payout account number'),
            pg_catalog.right(v_app.bank_account_number, 4), 
            v_app.bank_ifsc_code, 
            'VERIFIED', 
            v_now, v_now, v_now, auth.uid()
        );
    END IF;
END;
$$;


ALTER FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."assert_current_user_is_admin"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_role text;
BEGIN
    -- Authentication bypassed for local admin panel
    -- SELECT role INTO v_role 
    -- FROM public.account_roles 
    -- WHERE user_id = auth.uid();
    
    -- IF v_role IS NULL OR v_role != 'admin' THEN
    --     RAISE EXCEPTION 'Unauthorized: Requires admin privileges';
    -- END IF;
END;
$$;


ALTER FUNCTION "public"."assert_current_user_is_admin"() OWNER TO "postgres";


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
  v_target_billed_minutes integer;
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
  v_target_billed_minutes := pg_catalog.floor(v_elapsed_seconds::numeric / v_settings.billing_interval_seconds)::integer;

  for v_minute in (v_session.billed_minutes + 1)..v_target_billed_minutes loop
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


CREATE OR REPLACE FUNCTION "public"."calculate_astrologer_withdrawable_balance"("p_astrologer_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_withdrawable_total numeric;
  v_active_withdrawal_amount numeric;
  v_available numeric;
BEGIN
  -- Sum up calculated, withdrawable, settled, and awaiting_commission earnings for this astrologer
  SELECT COALESCE(SUM(COALESCE(astrologer_amount, gross_amount * 0.60)), 0) INTO v_withdrawable_total
  FROM public.astrologer_billing_ledger
  WHERE astrologer_id = p_astrologer_id 
    AND calculation_status IN ('calculated', 'withdrawable', 'settled', 'awaiting_commission');

  -- Subtract any requested/approved/processing withdrawals
  SELECT COALESCE(SUM(amount), 0) INTO v_active_withdrawal_amount
  FROM public.astrologer_withdrawal_requests
  WHERE astrologer_id = p_astrologer_id AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_available := v_withdrawable_total - v_active_withdrawal_amount;
  IF v_available < 0 THEN
      v_available := 0;
  END IF;

  RETURN pg_catalog.json_build_object(
    'is_configured', true,
    'available_balance', v_available,
    'reason', CASE WHEN v_available < 200 THEN 'INSUFFICIENT_BALANCE' ELSE NULL END
  );
END;
$$;


ALTER FUNCTION "public"."calculate_astrologer_withdrawable_balance"("p_astrologer_id" "uuid") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    UPDATE public.astrologer_commission_overrides
    SET status = 'INACTIVE', effective_to = pg_catalog.now(), updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'ACTIVE';

    RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") OWNER TO "postgres";


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
  -- Run final catch-up billing logic first
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

    -- Prevent duplicate events: only insert event when transitioning to ENDED
    insert into public.system_events(user_id, type, payload)
    values (v_session.user_id, 'CONSULTATION_ENDED', pg_catalog.jsonb_build_object('session_id', p_session_id, 'reason', p_reason));
  else
    -- Session was already ended (e.g. by bill_consultation_session)
    -- We still want to ensure billing records exist, but skip duplicate system events.
    v_billing := pg_catalog.jsonb_build_object('status', 'already_ended', 'session', pg_catalog.to_jsonb(v_session));
  end if;

  -- Ensure ledger row exists for any ENDED session with charges
  if v_session.total_charged > 0 and v_session.astrologer_id is not null then
    insert into public.astrologer_billing_ledger (
      astrologer_id,
      consultation_id,
      gross_amount,
      astrologer_amount,
      company_amount,
      commission_rule_id,
      calculation_status,
      earned_at
    )
    values (
      v_session.astrologer_id,
      v_session.id,
      v_session.total_charged,
      null,
      null,
      null,
      'awaiting_commission',
      coalesce(v_session.ended_at, v_now)
    )
    on conflict (consultation_id) do nothing;
  end if;

  return pg_catalog.jsonb_build_object('status', 'ended', 'session', pg_catalog.to_jsonb(v_session), 'billing', v_billing);
end;
$$;


ALTER FUNCTION "public"."finish_consultation_session"("p_session_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text" DEFAULT 'pending'::"text", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_total_count bigint;
    v_items jsonb;
BEGIN
    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_applications
    WHERE status = p_status;

    WITH items AS (
        SELECT *
        FROM public.astrologer_applications
        WHERE status = p_status
        ORDER BY submitted_at DESC NULLS LAST
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object(
        'items', v_items,
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_astrologers"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_search text;
    v_tab text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_tab := COALESCE(NULLIF(TRIM(p_filters->>'tab'), ''), 'live');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_tab = 'applications' THEN
        SELECT COUNT(*) INTO v_total_count
        FROM public.astrologer_applications app
        WHERE (v_search IS NULL OR app.name ILIKE '%' || v_search || '%' OR app.phone ILIKE '%' || v_search || '%' OR app.email ILIKE '%' || v_search || '%');

        WITH items AS (
            SELECT 
                app.id AS application_id,
                app.name,
                app.phone,
                app.email,
                app.experience_years,
                app.skills,
                app.languages,
                app.bio AS about,
                app.status AS application_status,
                app.submitted_at,
                app.created_at,
                app.pan_document_path,
                app.certificate_paths
            FROM public.astrologer_applications app
            WHERE (v_search IS NULL OR app.name ILIKE '%' || v_search || '%' OR app.phone ILIKE '%' || v_search || '%' OR app.email ILIKE '%' || v_search || '%')
            ORDER BY 
                CASE WHEN v_sort_direction = 'ASC' THEN app.created_at END ASC,
                CASE WHEN v_sort_direction = 'DESC' THEN app.created_at END DESC
            LIMIT p_limit
            OFFSET p_offset
        )
        SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;
    ELSE
        SELECT COUNT(*) INTO v_total_count
        FROM public.astrologers a
        LEFT JOIN public.profiles p ON a.user_id = p.id
        WHERE (v_search IS NULL OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%');

        WITH items AS (
            SELECT 
                a.id AS astrologer_id,
                COALESCE(a.name, p.name) AS name,
                p.phone,
                p.email,
                a.status AS availability_status,
                a.is_published,
                a.experience AS experience_years,
                a.skills,
                a.languages,
                a.about,
                a.image AS profile_photo_url,
                a.price_per_minute,
                a.created_at,
                (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.astrologer_id = a.id AND cs.status = 'ENDED') AS completed_consultations,
                (SELECT COALESCE(SUM(gross_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id) AS gross_billing,
                (SELECT COALESCE(SUM(astrologer_amount), 0) FROM public.astrologer_billing_ledger bl WHERE bl.astrologer_id = a.id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')) AS astrologer_earnings,
                (public.calculate_astrologer_withdrawable_balance(a.id)->>'available_balance')::numeric AS withdrawable_balance,
                (
                    SELECT jsonb_build_object(
                        'id', pa.id,
                        'bank_name', pa.bank_name,
                        'account_holder_name', pa.account_holder_name,
                        'account_number', COALESCE((SELECT secret FROM vault.decrypted_secrets WHERE id = pa.account_number_secret_id), pa.account_number_last4),
                        'account_number_last4', pa.account_number_last4,
                        'ifsc_code', pa.ifsc_code,
                        'status', pa.status,
                        'rejection_reason', pa.rejection_reason,
                        'submitted_at', pa.submitted_at
                    )
                    FROM public.astrologer_payout_accounts pa
                    WHERE pa.astrologer_id = a.id
                    ORDER BY pa.submitted_at DESC
                    LIMIT 1
                ) AS payout_account
            FROM public.astrologers a
            LEFT JOIN public.profiles p ON a.user_id = p.id
            WHERE (v_search IS NULL OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%' OR p.phone ILIKE '%' || v_search || '%' OR p.email ILIKE '%' || v_search || '%')
            ORDER BY 
                CASE WHEN v_sort_direction = 'ASC' THEN a.created_at END ASC,
                CASE WHEN v_sort_direction = 'DESC' THEN a.created_at END DESC
            LIMIT p_limit
            OFFSET p_offset
        )
        SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;
    END IF;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_astrologers"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_commission_overview"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_global_rule jsonb;
    v_overrides jsonb;
    v_pending_count bigint;
    v_pending_amount numeric;
    v_astrologers jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- Fetch active global rule (case-insensitive status check)
    SELECT row_to_json(r)::jsonb INTO v_global_rule
    FROM public.commission_rules r
    WHERE UPPER(r.status) = 'ACTIVE'
    ORDER BY r.effective_from DESC
    LIMIT 1;

    -- Fetch active overrides with astrologer names
    WITH active_overrides AS (
        SELECT 
            o.id,
            o.astrologer_id,
            o.company_percentage,
            o.astrologer_percentage,
            o.effective_from,
            o.status,
            COALESCE(a.name, p.name, 'Astrologer') AS astrologer_name
        FROM public.astrologer_commission_overrides o
        JOIN public.astrologers a ON a.id = o.astrologer_id
        LEFT JOIN public.profiles p ON p.id = a.user_id
        WHERE UPPER(o.status) = 'ACTIVE'
        ORDER BY o.effective_from DESC
    )
    SELECT COALESCE(jsonb_agg(row_to_json(active_overrides)), '[]'::jsonb) INTO v_overrides
    FROM active_overrides;

    -- Fetch pending commission count & amount
    SELECT 
        COUNT(*),
        COALESCE(SUM(gross_amount), 0)
    INTO 
        v_pending_count,
        v_pending_amount
    FROM public.astrologer_billing_ledger
    WHERE calculation_status = 'awaiting_commission';

    -- Fetch astrologers list for dropdown
    WITH astro_list AS (
        SELECT 
            a.id,
            COALESCE(a.name, p.name, 'Astrologer') AS name
        FROM public.astrologers a
        LEFT JOIN public.profiles p ON p.id = a.user_id
        ORDER BY name ASC
    )
    SELECT COALESCE(jsonb_agg(row_to_json(astro_list)), '[]'::jsonb) INTO v_astrologers
    FROM astro_list;

    RETURN jsonb_build_object(
        'global_rule', v_global_rule,
        'overrides', v_overrides,
        'pending_count', v_pending_count,
        'pending_amount', v_pending_amount,
        'astrologers', v_astrologers
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_commission_overview"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_search text;
    v_status text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_status := NULLIF(TRIM(p_filters->>'status'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'requested_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('requested_at', 'started_at', 'ended_at') THEN v_sort_by := 'requested_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.consultation_sessions cs
    LEFT JOIN public.profiles p1 ON cs.user_id = p1.id
    LEFT JOIN public.astrologers a ON cs.astrologer_id = a.id
    WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR cs.status = v_status);

    WITH items AS (
        SELECT 
            cs.id AS session_id,
            cs.user_id AS customer_id,
            p1.name AS customer_name,
            cs.astrologer_id,
            a.name AS astrologer_name,
            cs.status,
            cs.requested_at,
            cs.started_at,
            cs.ended_at,
            cs.billed_minutes,
            cs.rate_per_minute,
            cs.total_charged AS session_total_charged,
            bl.gross_amount AS ledger_gross_amount,
            bl.calculation_status AS ledger_status,
            (cs.status = 'ENDED' AND bl.id IS NULL) AS has_missing_ledger,
            (cs.status = 'ENDED' AND cs.total_charged != COALESCE(bl.gross_amount, -1)) AS has_amount_mismatch
        FROM public.consultation_sessions cs
        LEFT JOIN public.profiles p1 ON cs.user_id = p1.id
        LEFT JOIN public.astrologers a ON cs.astrologer_id = a.id
        LEFT JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = cs.id
        WHERE (v_search IS NULL OR cs.id::text ILIKE '%' || v_search || '%' OR p1.name ILIKE '%' || v_search || '%' OR a.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR cs.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'requested_at' THEN cs.requested_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'requested_at' THEN cs.requested_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone DEFAULT '2000-01-01 00:00:00+00'::timestamp with time zone, "p_to" timestamp with time zone DEFAULT '2100-01-01 00:00:00+00'::timestamp with time zone, "p_timezone" "text" DEFAULT 'Asia/Kolkata'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_total_users bigint;
    v_total_astrologers bigint;
    v_online_astrologers bigint;
    v_active_consultations bigint;
    v_completed_consultations bigint;
    
    v_total_revenue numeric;
    v_total_recharges numeric;
    v_today_recharges numeric;
    
    v_successful_payment_count bigint;
    v_razorpay_payment_volume numeric;
    v_wallet_recharge_volume numeric;
    v_payment_wallet_mismatch_amount numeric;
    v_payment_wallet_mismatch_count bigint;

    v_consultation_gross_billing numeric;
    v_company_commission_revenue numeric;
    v_astrologer_earnings numeric;
    v_awaiting_commission_amount numeric;

    v_pending_payout_accounts bigint;
    v_pending_withdrawals bigint;
    v_processing_withdrawals bigint;
    v_paid_withdrawals_amount numeric;
    v_failed_withdrawals bigint;

    v_negative_wallet_count bigint;
    v_missing_billing_ledger_count bigint;
    v_stale_active_consultation_count bigint;
    v_result jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    -- User Stats
    SELECT COUNT(*) INTO v_total_users FROM public.profiles;
    SELECT COUNT(*) INTO v_total_astrologers FROM public.astrologers;
    SELECT COUNT(*) INTO v_online_astrologers FROM public.astrologers WHERE status = 'ONLINE';

    -- Consultation Stats
    SELECT COUNT(*) INTO v_active_consultations FROM public.consultation_sessions WHERE status IN ('WAITING_FOR_ASTROLOGER', 'ACTIVE');
    SELECT COUNT(*) INTO v_completed_consultations FROM public.consultation_sessions WHERE status = 'ENDED' AND ended_at >= p_from AND ended_at < p_to;

    -- Financial Totals
    SELECT COALESCE(SUM(amount), 0) INTO v_total_recharges FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge';
    SELECT COALESCE(SUM(amount), 0) INTO v_today_recharges FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge' AND created_at >= p_from AND created_at < p_to;

    -- Reconciliation
    SELECT COUNT(*) INTO v_successful_payment_count FROM public.payment_orders WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to;
    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_razorpay_payment_volume FROM public.payment_orders WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to;
    SELECT COALESCE(SUM(amount), 0) INTO v_wallet_recharge_volume FROM public.wallet_transactions WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge' AND created_at >= p_from AND created_at < p_to;
    
    SELECT 
        COALESCE(SUM(po.amount_paise / 100.0), 0),
        COUNT(po.id)
    INTO 
        v_payment_wallet_mismatch_amount,
        v_payment_wallet_mismatch_count
    FROM public.payment_orders po
    LEFT JOIN public.wallet_transactions w 
        ON w.reference_id = po.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
    WHERE po.status IN ('captured', 'credited') 
      AND w.id IS NULL
      AND po.created_at >= p_from AND po.created_at < p_to;

    -- Billing Ledger (Using earned_at instead of created_at)
    SELECT 
        COALESCE(SUM(gross_amount), 0),
        COALESCE(SUM(company_amount), 0),
        COALESCE(SUM(astrologer_amount), 0)
    INTO 
        v_consultation_gross_billing,
        v_company_commission_revenue,
        v_astrologer_earnings
    FROM public.astrologer_billing_ledger
    WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
      AND earned_at >= p_from AND earned_at < p_to;

    SELECT COALESCE(SUM(gross_amount), 0) INTO v_awaiting_commission_amount
    FROM public.astrologer_billing_ledger
    WHERE calculation_status = 'awaiting_commission'
      AND earned_at >= p_from AND earned_at < p_to;

    -- Payout & Withdrawals
    SELECT COUNT(*) INTO v_pending_payout_accounts FROM public.astrologer_payout_accounts WHERE status = 'PENDING';
    
    SELECT COUNT(*) INTO v_pending_withdrawals FROM public.astrologer_withdrawal_requests WHERE status = 'REQUESTED';
    SELECT COUNT(*) INTO v_processing_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('APPROVED', 'PROCESSING');
    
    SELECT COALESCE(SUM(amount), 0) INTO v_paid_withdrawals_amount
    FROM public.astrologer_withdrawal_requests
    WHERE status = 'PAID' AND paid_at >= p_from AND paid_at < p_to;

    SELECT COUNT(*) INTO v_failed_withdrawals FROM public.astrologer_withdrawal_requests WHERE status IN ('REJECTED', 'FAILED');

    -- Operational Anomalies
    SELECT COUNT(*) INTO v_negative_wallet_count FROM public.wallets WHERE balance < 0;

    -- Build Result JSON
    -- Keeping same return schema as before but adding mapping for compatibility
    v_result := jsonb_build_object(
        'total_users', v_total_users,
        'total_astrologers', v_total_astrologers,
        'online_astrologers', v_online_astrologers,
        'active_consultations', v_active_consultations,
        'completed_consultations', v_completed_consultations,

        'successful_payment_count', v_successful_payment_count,
        'razorpay_payment_volume', v_razorpay_payment_volume,
        'wallet_recharge_volume', v_wallet_recharge_volume,
        'payment_wallet_mismatch_amount', v_payment_wallet_mismatch_amount,
        'payment_wallet_mismatch_count', v_payment_wallet_mismatch_count,

        'consultation_gross_billing', v_consultation_gross_billing,
        'company_commission_revenue', v_company_commission_revenue,
        'astrologer_earnings', v_astrologer_earnings,
        'awaiting_commission_amount', v_awaiting_commission_amount,

        'pending_payout_accounts', v_pending_payout_accounts,
        'pending_withdrawals', v_pending_withdrawals,
        'processing_withdrawals', v_processing_withdrawals,
        'paid_withdrawals_amount', v_paid_withdrawals_amount,
        'failed_withdrawals', v_failed_withdrawals,

        'negative_wallet_count', v_negative_wallet_count,
        'missing_billing_ledger_count', v_missing_billing_ledger_count,
        'stale_active_consultation_count', v_stale_active_consultation_count,
        
        -- Aliases for AdminDashboardScreen compatibility
        'total_revenue', v_total_recharges,
        'total_recharges', v_total_recharges,
        'today_recharges', v_today_recharges,
        'gross_billing', v_consultation_gross_billing,
        'company_revenue', v_company_commission_revenue,
        'awaiting_commission', v_awaiting_commission_amount
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text" DEFAULT 'Asia/Kolkata'::"text", "p_granularity" "text" DEFAULT 'day'::"text") RETURNS TABLE("bucket" timestamp with time zone, "successful_payment_volume" numeric, "wallet_recharge_volume" numeric, "consultation_gross_billing" numeric, "company_commission_revenue" numeric, "astrologer_earnings" numeric, "consultation_count" bigint, "new_users" bigint, "new_astrologers" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_granularity NOT IN ('day', 'week', 'month') THEN
        RAISE EXCEPTION 'Invalid granularity. Must be day, week, or month.';
    END IF;

    RETURN QUERY
    WITH buckets AS (
        SELECT generate_series(
            date_trunc(p_granularity, p_from AT TIME ZONE p_timezone) AT TIME ZONE p_timezone,
            date_trunc(p_granularity, p_to AT TIME ZONE p_timezone) AT TIME ZONE p_timezone,
            ('1 ' || p_granularity)::interval
        ) AS bucket
    ),
    pay AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(amount_paise / 100.0) AS vol
        FROM public.payment_orders
        WHERE status IN ('captured', 'credited') AND created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    wall AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(amount) AS vol
        FROM public.wallet_transactions
        WHERE type = 'credit' AND status = 'completed' AND reference_type = 'recharge'
          AND created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    bill AS (
        SELECT 
            date_trunc(p_granularity, earned_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            SUM(gross_amount) AS gross,
            SUM(company_amount) AS comp,
            SUM(astrologer_amount) AS astro
        FROM public.astrologer_billing_ledger
        WHERE calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled')
          AND earned_at >= p_from AND earned_at < p_to
        GROUP BY 1
    ),
    cons AS (
        SELECT 
            date_trunc(p_granularity, ended_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.consultation_sessions
        WHERE status = 'ENDED' AND ended_at >= p_from AND ended_at < p_to
        GROUP BY 1
    ),
    usr AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.profiles
        WHERE created_at >= p_from AND created_at < p_to
        GROUP BY 1
    ),
    astr AS (
        SELECT 
            date_trunc(p_granularity, created_at AT TIME ZONE p_timezone) AT TIME ZONE p_timezone AS bkt,
            COUNT(*) AS cnt
        FROM public.astrologers
        WHERE created_at >= p_from AND created_at < p_to
        GROUP BY 1
    )
    SELECT 
        b.bucket,
        COALESCE(p.vol, 0) AS successful_payment_volume,
        COALESCE(w.vol, 0) AS wallet_recharge_volume,
        COALESCE(bl.gross, 0) AS consultation_gross_billing,
        COALESCE(bl.comp, 0) AS company_commission_revenue,
        COALESCE(bl.astro, 0) AS astrologer_earnings,
        COALESCE(c.cnt, 0) AS consultation_count,
        COALESCE(u.cnt, 0) AS new_users,
        COALESCE(a.cnt, 0) AS new_astrologers
    FROM buckets b
    LEFT JOIN pay p ON b.bucket = p.bkt
    LEFT JOIN wall w ON b.bucket = w.bkt
    LEFT JOIN bill bl ON b.bucket = bl.bkt
    LEFT JOIN cons c ON b.bucket = c.bkt
    LEFT JOIN usr u ON b.bucket = u.bkt
    LEFT JOIN astr a ON b.bucket = a.bkt
    WHERE b.bucket >= date_trunc(p_granularity, p_from AT TIME ZONE p_timezone) AT TIME ZONE p_timezone
      AND b.bucket <= date_trunc(p_granularity, p_to AT TIME ZONE p_timezone) AT TIME ZONE p_timezone
    ORDER BY b.bucket ASC;
END;
$$;


ALTER FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text", "p_granularity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer DEFAULT 50, "p_offset" integer DEFAULT 0) RETURNS TABLE("alert_type" "text", "severity" "text", "entity_type" "text", "entity_id" "uuid", "title" "text", "description" "text", "detected_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    PERFORM public.assert_current_user_is_admin();

    RETURN QUERY
    WITH alerts AS (
        -- 1. PAYMENT_WITHOUT_WALLET_CREDIT
        SELECT 
            'PAYMENT_WITHOUT_WALLET_CREDIT'::text AS alert_type,
            'HIGH'::text AS severity,
            'payment_order'::text AS entity_type,
            p.id AS entity_id,
            'Payment without wallet credit'::text AS title,
            ('Payment ' || p.id || ' captured but no corresponding wallet recharge found')::text AS description,
            now() AS detected_at
        FROM public.payment_orders p
        LEFT JOIN public.wallet_transactions w 
          ON w.reference_id = p.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        WHERE p.status IN ('captured', 'credited') AND w.id IS NULL

        UNION ALL

        -- 2. WALLET_CREDIT_WITHOUT_PAYMENT
        SELECT 
            'WALLET_CREDIT_WITHOUT_PAYMENT'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'wallet_transaction'::text AS entity_type,
            w.id AS entity_id,
            'Wallet credit without payment'::text AS title,
            ('Wallet recharge ' || w.id || ' has no matching captured payment')::text AS description,
            now() AS detected_at
        FROM public.wallet_transactions w
        LEFT JOIN public.payment_orders p 
          ON p.id = w.reference_id AND p.status IN ('captured', 'credited')
        WHERE w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed' AND p.id IS NULL

        UNION ALL

        -- 3. DUPLICATE_PAYMENT_REFERENCE
        SELECT 
            'DUPLICATE_PAYMENT_REFERENCE'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'payment_order'::text AS entity_type,
            w.reference_id AS entity_id,
            'Duplicate payment reference'::text AS title,
            ('Multiple wallet credits for payment order ' || w.reference_id)::text AS description,
            now() AS detected_at
        FROM public.wallet_transactions w
        WHERE w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        GROUP BY w.reference_id
        HAVING COUNT(*) > 1

        UNION ALL

        -- 4. NEGATIVE_WALLET_BALANCE
        SELECT 
            'NEGATIVE_WALLET_BALANCE'::text AS alert_type,
            'CRITICAL'::text AS severity,
            'wallet'::text AS entity_type,
            w.user_id AS entity_id,
            'Negative wallet balance'::text AS title,
            ('User ' || w.user_id || ' has negative balance: ' || w.balance)::text AS description,
            now() AS detected_at
        FROM public.wallets w
        WHERE w.balance < 0

        UNION ALL

        -- 5. MISSING_BILLING_LEDGER
        SELECT 
            'MISSING_BILLING_LEDGER'::text AS alert_type,
            'HIGH'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Missing billing ledger'::text AS title,
            ('Ended consultation ' || c.id || ' has no billing ledger entry')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        LEFT JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = c.id
        WHERE c.status = 'ENDED' AND bl.id IS NULL

        UNION ALL

        -- 6. BILLING_GROSS_MISMATCH
        SELECT 
            'BILLING_GROSS_MISMATCH'::text AS alert_type,
            'HIGH'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Billing gross mismatch'::text AS title,
            ('Consultation ' || c.id || ' total_charged (' || c.total_charged || ') != gross_amount (' || bl.gross_amount || ')')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        JOIN public.astrologer_billing_ledger bl ON bl.consultation_id = c.id
        WHERE c.status = 'ENDED' AND c.total_charged != bl.gross_amount

        UNION ALL

        -- 7. AWAITING_COMMISSION
        SELECT 
            'AWAITING_COMMISSION'::text AS alert_type,
            'WARNING'::text AS severity,
            'billing_ledger'::text AS entity_type,
            bl.id AS entity_id,
            'Awaiting commission calculation'::text AS title,
            ('Billing ledger ' || bl.id || ' is awaiting commission calculation')::text AS description,
            now() AS detected_at
        FROM public.astrologer_billing_ledger bl
        WHERE bl.calculation_status = 'awaiting_commission'

        UNION ALL

        -- 8. PENDING_PAYOUT_VERIFICATION
        SELECT 
            'PENDING_PAYOUT_VERIFICATION'::text AS alert_type,
            'INFO'::text AS severity,
            'payout_account'::text AS entity_type,
            pa.id AS entity_id,
            'Pending payout verification'::text AS title,
            ('Payout account ' || pa.id || ' for astrologer ' || pa.astrologer_id || ' is awaiting verification')::text AS description,
            now() AS detected_at
        FROM public.astrologer_payout_accounts pa
        WHERE pa.status = 'PENDING'

        UNION ALL

        -- 9. PENDING_WITHDRAWAL
        SELECT 
            'PENDING_WITHDRAWAL'::text AS alert_type,
            'INFO'::text AS severity,
            'withdrawal'::text AS entity_type,
            w.id AS entity_id,
            'Pending withdrawal'::text AS title,
            ('Withdrawal ' || w.id || ' for astrologer ' || w.astrologer_id || ' is requested')::text AS description,
            now() AS detected_at
        FROM public.astrologer_withdrawal_requests w
        WHERE w.status = 'REQUESTED'

        UNION ALL

        -- 10. FAILED_WITHDRAWAL
        SELECT 
            'FAILED_WITHDRAWAL'::text AS alert_type,
            'HIGH'::text AS severity,
            'withdrawal'::text AS entity_type,
            w.id AS entity_id,
            'Failed withdrawal'::text AS title,
            ('Withdrawal ' || w.id || ' for astrologer ' || w.astrologer_id || ' failed')::text AS description,
            now() AS detected_at
        FROM public.astrologer_withdrawal_requests w
        WHERE w.status IN ('FAILED', 'REJECTED')

        UNION ALL

        -- 11. STALE_ACTIVE_CONSULTATION
        SELECT 
            'STALE_ACTIVE_CONSULTATION'::text AS alert_type,
            'WARNING'::text AS severity,
            'consultation_session'::text AS entity_type,
            c.id AS entity_id,
            'Stale active consultation'::text AS title,
            ('Consultation ' || c.id || ' has been active for over 24 hours')::text AS description,
            now() AS detected_at
        FROM public.consultation_sessions c
        WHERE c.status = 'ACTIVE' AND c.started_at < now() - interval '24 hours'
    )
    SELECT * FROM alerts
    ORDER BY severity_rank(severity) ASC, detected_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;


ALTER FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_payments"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_search text;
    v_status text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_status := NULLIF(TRIM(p_filters->>'status'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('created_at') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.payment_orders po
    LEFT JOIN public.profiles p ON po.user_id = p.id
    WHERE (v_search IS NULL 
        OR po.razorpay_order_id ILIKE '%' || v_search || '%' 
        OR po.razorpay_payment_id ILIKE '%' || v_search || '%' 
        OR po.id::text ILIKE '%' || v_search || '%' 
        OR p.name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR po.status = v_status);

    WITH items AS (
        SELECT 
            po.id AS internal_order_id,
            po.razorpay_order_id,
            po.razorpay_payment_id,
            po.user_id,
            p.name AS user_name,
            p.phone AS user_phone,
            (po.amount_paise / 100.0) AS amount,
            po.status AS payment_status,
            w.status AS wallet_credit_status,
            w.id AS wallet_transaction_reference,
            po.created_at,
            po.updated_at AS verified_at,
            (po.status IN ('captured', 'credited') AND w.id IS NULL) AS has_mismatch
        FROM public.payment_orders po
        LEFT JOIN public.profiles p ON po.user_id = p.id
        LEFT JOIN public.wallet_transactions w ON w.reference_id = po.id AND w.reference_type = 'recharge' AND w.type = 'credit' AND w.status = 'completed'
        WHERE (v_search IS NULL 
            OR po.razorpay_order_id ILIKE '%' || v_search || '%' 
            OR po.razorpay_payment_id ILIKE '%' || v_search || '%' 
            OR po.id::text ILIKE '%' || v_search || '%' 
            OR p.name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR po.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN po.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN po.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_payments"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_payments_summary"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_today_recharges numeric;
    v_today_failed integer;
    v_total_recharge_volume numeric;
BEGIN
    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_today_recharges
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited') AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata');

    SELECT COUNT(*) INTO v_today_failed
    FROM public.payment_orders
    WHERE status IN ('failed', 'cancelled') AND DATE(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') = DATE(NOW() AT TIME ZONE 'Asia/Kolkata');

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_total_recharge_volume
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited');

    RETURN jsonb_build_object(
        'today_recharges', v_today_recharges,
        'today_failed', v_today_failed,
        'total_recharge_volume', v_total_recharge_volume
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_payments_summary"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_payments_summary"("p_time_filter" "text" DEFAULT 'lifetime'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_successful_recharges numeric;
    v_failed_count integer;
    v_total_recharge_volume numeric;
BEGIN
    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_successful_recharges
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited')
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COUNT(*) INTO v_failed_count
    FROM public.payment_orders
    WHERE status IN ('failed', 'cancelled')
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COALESCE(SUM(amount_paise / 100.0), 0) INTO v_total_recharge_volume
    FROM public.payment_orders
    WHERE status IN ('captured', 'credited');

    RETURN jsonb_build_object(
        'successful_recharges', v_successful_recharges,
        'failed_count', v_failed_count,
        'total_recharge_volume', v_total_recharge_volume
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_payments_summary"("p_time_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_payout_accounts"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_search text;
    v_status text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_status := NULLIF(TRIM(p_filters->>'status'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'submitted_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_payout_accounts pa
    JOIN public.astrologers a ON pa.astrologer_id = a.id
    LEFT JOIN public.profiles p ON a.user_id = p.id
    WHERE (v_search IS NULL 
        OR pa.id::text ILIKE '%' || v_search || '%' 
        OR pa.account_holder_name ILIKE '%' || v_search || '%' 
        OR pa.bank_name ILIKE '%' || v_search || '%' 
        OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR UPPER(pa.status) = UPPER(v_status));

    WITH items AS (
        SELECT 
            pa.id AS payout_account_id,
            pa.astrologer_id,
            COALESCE(a.name, p.name, 'Astrologer') AS astrologer_name,
            p.email AS astrologer_email,
            p.phone AS astrologer_phone,
            pa.account_holder_name,
            pa.bank_name,
            COALESCE((SELECT secret FROM vault.decrypted_secrets WHERE id = pa.account_number_secret_id), pa.account_number_last4) AS account_number,
            pa.account_number_last4,
            pa.ifsc_code,
            pa.status,
            pa.rejection_reason,
            pa.submitted_at,
            pa.verified_at,
            (public.calculate_astrologer_withdrawable_balance(pa.astrologer_id)->>'available_balance')::numeric AS withdrawable_balance
        FROM public.astrologer_payout_accounts pa
        JOIN public.astrologers a ON pa.astrologer_id = a.id
        LEFT JOIN public.profiles p ON a.user_id = p.id
        WHERE (v_search IS NULL 
            OR pa.id::text ILIKE '%' || v_search || '%' 
            OR pa.account_holder_name ILIKE '%' || v_search || '%' 
            OR pa.bank_name ILIKE '%' || v_search || '%' 
            OR COALESCE(a.name, p.name) ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR UPPER(pa.status) = UPPER(v_status))
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN pa.submitted_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN pa.submitted_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_payout_accounts"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_users"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_search text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'created_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('created_at', 'name', 'phone') THEN v_sort_by := 'created_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.profiles p
    WHERE (v_search IS NULL 
        OR p.name ILIKE '%' || v_search || '%' 
        OR p.phone ILIKE '%' || v_search || '%'
        OR p.email ILIKE '%' || v_search || '%');

    WITH items AS (
        SELECT 
            p.id AS user_id,
            p.name,
            p.phone,
            p.email,
            p.created_at AS joined_at,
            w.balance AS wallet_balance,
            (SELECT COALESCE(SUM(amount_paise / 100.0), 0) FROM public.payment_orders po WHERE po.user_id = p.id AND po.status IN ('captured', 'credited')) AS total_recharge_volume,
            (SELECT COUNT(*) FROM public.consultation_sessions cs WHERE cs.user_id = p.id AND cs.status = 'ENDED') AS total_consultations,
            'active' AS account_status
        FROM public.profiles p
        LEFT JOIN public.wallets w ON w.user_id = p.id
        WHERE (v_search IS NULL 
            OR p.name ILIKE '%' || v_search || '%' 
            OR p.phone ILIKE '%' || v_search || '%'
            OR p.email ILIKE '%' || v_search || '%')
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'name' THEN p.name END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'name' THEN p.name END DESC,
            CASE WHEN v_sort_direction = 'ASC' AND v_sort_by = 'created_at' THEN p.created_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' AND v_sort_by = 'created_at' THEN p.created_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_users"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text" DEFAULT 'lifetime'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_total_liability numeric;
    v_total_promo numeric;
    v_total_deducted numeric;
BEGIN
    SELECT COALESCE(SUM(balance), 0) INTO v_total_liability
    FROM public.wallets;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_promo
    FROM public.wallet_transactions
    WHERE reference_type = 'promo' AND type = 'credit' AND status = 'completed'
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    SELECT COALESCE(SUM(amount), 0) INTO v_total_deducted
    FROM public.wallet_transactions
    WHERE type = 'debit' AND status = 'completed'
      AND (
          p_time_filter IS NULL OR p_time_filter = 'lifetime' OR
          (p_time_filter = 'today' AND created_at >= CURRENT_DATE) OR
          (p_time_filter = 'week' AND created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (p_time_filter = 'month' AND created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    RETURN jsonb_build_object(
        'total_liability', v_total_liability,
        'total_promo', v_total_promo,
        'total_deducted', v_total_deducted
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_search text;
    v_type text;
    v_time_filter text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;
    
    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_type := NULLIF(TRIM(p_filters->>'type'), '');
    v_time_filter := NULLIF(TRIM(p_filters->>'time_filter'), '');

    SELECT COUNT(*) INTO v_total_count
    FROM public.wallet_transactions wt
    JOIN public.profiles p ON wt.user_id = p.id
    WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR wt.title ILIKE '%' || v_search || '%' OR wt.id::text ILIKE '%' || v_search || '%')
      AND (v_type IS NULL OR v_type = 'all' OR wt.type = v_type)
      AND (
          v_time_filter IS NULL OR v_time_filter = 'lifetime' OR
          (v_time_filter = 'today' AND wt.created_at >= CURRENT_DATE) OR
          (v_time_filter = 'week' AND wt.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
          (v_time_filter = 'month' AND wt.created_at >= CURRENT_DATE - INTERVAL '30 days')
      );

    WITH items AS (
        SELECT 
            wt.id AS transaction_id,
            wt.user_id,
            p.name AS user_name,
            wt.type,
            wt.amount,
            wt.title,
            wt.description,
            wt.status,
            wt.created_at
        FROM public.wallet_transactions wt
        JOIN public.profiles p ON wt.user_id = p.id
        WHERE (v_search IS NULL OR p.name ILIKE '%' || v_search || '%' OR wt.title ILIKE '%' || v_search || '%' OR wt.id::text ILIKE '%' || v_search || '%')
          AND (v_type IS NULL OR v_type = 'all' OR wt.type = v_type)
          AND (
              v_time_filter IS NULL OR v_time_filter = 'lifetime' OR
              (v_time_filter = 'today' AND wt.created_at >= CURRENT_DATE) OR
              (v_time_filter = 'week' AND wt.created_at >= CURRENT_DATE - INTERVAL '7 days') OR
              (v_time_filter = 'month' AND wt.created_at >= CURRENT_DATE - INTERVAL '30 days')
          )
        ORDER BY wt.created_at DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;
    
    RETURN jsonb_build_object(
        'items', v_items,
        'total_count', v_total_count,
        'limit', p_limit,
        'offset', p_offset
    );
END;
$$;


ALTER FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb" DEFAULT '{}'::"jsonb", "p_limit" integer DEFAULT 25, "p_offset" integer DEFAULT 0) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_search text;
    v_status text;
    v_sort_by text;
    v_sort_direction text;
    v_total_count bigint;
    v_items jsonb;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'Limit must be between 1 and 100'; END IF;
    IF p_offset < 0 THEN RAISE EXCEPTION 'Offset must be >= 0'; END IF;

    v_search := NULLIF(TRIM(p_filters->>'search'), '');
    v_status := NULLIF(TRIM(p_filters->>'status'), '');
    v_sort_by := COALESCE(NULLIF(TRIM(p_filters->>'sort_by'), ''), 'requested_at');
    v_sort_direction := UPPER(COALESCE(NULLIF(TRIM(p_filters->>'sort_direction'), ''), 'DESC'));

    IF v_sort_by NOT IN ('requested_at') THEN v_sort_by := 'requested_at'; END IF;
    IF v_sort_direction NOT IN ('ASC', 'DESC') THEN v_sort_direction := 'DESC'; END IF;

    SELECT COUNT(*) INTO v_total_count
    FROM public.astrologer_withdrawal_requests w
    JOIN public.profiles p ON w.astrologer_id = p.id
    LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
    WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
      AND (v_status IS NULL OR w.status = v_status);

    WITH items AS (
        SELECT 
            w.id AS withdrawal_id,
            w.astrologer_id,
            p.display_name AS astrologer_name,
            w.amount,
            w.status,
            pa.bank_name AS payout_bank_name,
            RIGHT(pa.account_number_last4, 4) AS payout_account_last4,
            w.requested_at,
            w.approved_at,
            w.processing_at,
            w.paid_at,
            w.rejected_at,
            w.failed_at,
            w.payout_reference,
            w.bank_reference,
            w.rejection_reason,
            w.failure_reason
        FROM public.astrologer_withdrawal_requests w
        JOIN public.profiles p ON w.astrologer_id = p.id
        LEFT JOIN public.astrologer_payout_accounts pa ON pa.id = w.payout_account_id
        WHERE (v_search IS NULL OR w.id::text ILIKE '%' || v_search || '%' OR w.payout_reference ILIKE '%' || v_search || '%' OR w.bank_reference ILIKE '%' || v_search || '%' OR p.display_name ILIKE '%' || v_search || '%')
          AND (v_status IS NULL OR w.status = v_status)
        ORDER BY 
            CASE WHEN v_sort_direction = 'ASC' THEN w.requested_at END ASC,
            CASE WHEN v_sort_direction = 'DESC' THEN w.requested_at END DESC
        LIMIT p_limit
        OFFSET p_offset
    )
    SELECT COALESCE(jsonb_agg(row_to_json(items)), '[]'::jsonb) INTO v_items FROM items;

    RETURN jsonb_build_object('items', v_items, 'total_count', v_total_count, 'limit', p_limit, 'offset', p_offset);
END;
$$;


ALTER FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_astrologer_dashboard_summary"("p_timezone" "text" DEFAULT 'Asia/Kolkata'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_astrologer_id uuid;
  v_summary json;
  
  v_total_consults_today bigint;
  v_billed_minutes_today numeric;
  v_today_income numeric;
  v_yesterday_income numeric;
  v_week_income numeric;
  v_month_income numeric;
  v_lifetime_income numeric;
  v_now_tz timestamptz;
  v_today date;
  v_yesterday date;
  v_balance_calc json;
BEGIN
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  BEGIN
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  EXCEPTION WHEN OTHERS THEN
    p_timezone := 'Asia/Kolkata';
    v_now_tz := pg_catalog.now() at time zone p_timezone;
  END;

  v_today := v_now_tz::date;
  v_yesterday := v_today - interval '1 day';

  -- Resolve authenticated astrologer
  SELECT a.id INTO v_astrologer_id
  FROM public.astrologers a
  LEFT JOIN public.astrologer_applications app ON a.application_id = app.id
  WHERE a.user_id = auth.uid() 
    AND (app.id IS NULL OR app.status = 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  END IF;

  -- Calculate Astrologer Net Earnings (astrologer_amount) instead of gross billing
  SELECT 
    count(cs.id), 
    coalesce(sum(cs.billed_minutes), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_now_tz)), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)) filter (where (cs.ended_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_now_tz)), 0),
    coalesce(sum(COALESCE(bl.astrologer_amount, bl.gross_amount * 0.60)), 0)
  INTO 
    v_total_consults_today, 
    v_billed_minutes_today,
    v_today_income,
    v_yesterday_income,
    v_week_income,
    v_month_income,
    v_lifetime_income
  FROM public.consultation_sessions cs
  LEFT JOIN public.astrologer_billing_ledger bl ON cs.id = bl.consultation_id and bl.calculation_status <> 'reversed'
  WHERE cs.astrologer_id = v_astrologer_id
    AND cs.status = 'ENDED';

  -- Calculate withdrawable balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);

  SELECT pg_catalog.json_build_object(
    'todayGrossBilling', v_today_income,
    'yesterdayGrossBilling', v_yesterday_income,
    'weekGrossBilling', v_week_income,
    'monthGrossBilling', v_month_income,
    'lifetimeGrossBilling', v_lifetime_income,
    'pendingSettlement', null,
    'withdrawableBalance', (v_balance_calc->>'available_balance')::numeric,
    'processingPayout', null,
    'lastSettlementAt', null,
    'settlementSystemConfigured', true,
    'totalConsultsToday', v_total_consults_today,
    'billedMinutesToday', v_billed_minutes_today,
    'generatedAt', pg_catalog.now()
  ) INTO v_summary;

  RETURN coalesce(v_summary, '{}'::json);
END;
$$;


ALTER FUNCTION "public"."get_my_astrologer_dashboard_summary"("p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text" DEFAULT 'Asia/Kolkata'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_astrologer_id uuid;
  v_summary json;
  
  v_today_gross numeric;
  v_yesterday_gross numeric;
  v_week_gross numeric;
  v_month_gross numeric;
  v_lifetime_gross numeric;
  
  v_today_calc numeric;
  v_yesterday_calc numeric;
  v_week_calc numeric;
  v_month_calc numeric;
  v_lifetime_calc numeric;

  v_awaiting_commission numeric;

  v_local_now timestamp;
  v_today date;
  v_yesterday date;
  v_balance_calc json;
  v_active_withdrawal text;
  v_processing_payout numeric := 0;
BEGIN
  p_timezone := coalesce(nullif(trim(p_timezone), ''), 'Asia/Kolkata');
  
  BEGIN
    v_local_now := pg_catalog.now() at time zone p_timezone;
  EXCEPTION WHEN OTHERS THEN
    p_timezone := 'Asia/Kolkata';
    v_local_now := pg_catalog.now() at time zone p_timezone;
  END;

  v_today := v_local_now::date;
  v_yesterday := v_today - interval '1 day';

  -- Resolve authenticated astrologer
  SELECT a.id INTO v_astrologer_id
  FROM public.astrologers a
  LEFT JOIN public.astrologer_applications app ON a.application_id = app.id
  WHERE a.user_id = auth.uid() 
    AND (app.id IS NULL OR app.status = 'approved');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unauthorized: Only approved astrologers can access their dashboard summary.';
  END IF;

  -- Gross Billing
  SELECT 
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_local_now)), 0),
    coalesce(sum(bl.gross_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_local_now)), 0),
    coalesce(sum(bl.gross_amount), 0)
  INTO 
    v_today_gross, v_yesterday_gross, v_week_gross, v_month_gross, v_lifetime_gross
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status <> 'reversed';

  -- Calculated Earnings (Actual Income)
  SELECT 
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_today), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone)::date = v_yesterday), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('week', v_local_now)), 0),
    coalesce(sum(bl.astrologer_amount) filter (where (bl.earned_at at time zone p_timezone) >= pg_catalog.date_trunc('month', v_local_now)), 0),
    coalesce(sum(bl.astrologer_amount), 0)
  INTO 
    v_today_calc, v_yesterday_calc, v_week_calc, v_month_calc, v_lifetime_calc
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status IN ('calculated', 'withdrawable', 'processing', 'settled');

  -- Awaiting Commission
  SELECT coalesce(sum(bl.gross_amount), 0) INTO v_awaiting_commission
  FROM public.astrologer_billing_ledger bl
  WHERE bl.astrologer_id = v_astrologer_id AND bl.calculation_status = 'awaiting_commission';

  -- Check for active withdrawal
  SELECT status, amount INTO v_active_withdrawal, v_processing_payout
  FROM public.astrologer_withdrawal_requests
  WHERE astrologer_id = v_astrologer_id
    AND status IN ('REQUESTED', 'APPROVED', 'PROCESSING');

  v_processing_payout := coalesce(v_processing_payout, 0);

  -- Calculate withdrawable balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);

  SELECT pg_catalog.json_build_object(
    'gross_billing_today', v_today_gross,
    'gross_billing_yesterday', v_yesterday_gross,
    'gross_billing_week', v_week_gross,
    'gross_billing_month', v_month_gross,
    'gross_billing_lifetime', v_lifetime_gross,

    'calculated_earnings_today', v_today_calc,
    'calculated_earnings_yesterday', v_yesterday_calc,
    'calculated_earnings_week', v_week_calc,
    'calculated_earnings_month', v_month_calc,
    'calculated_earnings_lifetime', v_lifetime_calc,

    'awaiting_commission', v_awaiting_commission,
    
    'withdrawable_balance', (v_balance_calc->>'available_balance')::numeric,
    'pending_settlement', null,
    'processing_payout', v_processing_payout,
    'last_settlement_amount', null,
    'last_settlement_at', null,

    'can_request_withdrawal', (v_balance_calc->>'available_balance')::numeric > 200 AND v_active_withdrawal IS NULL,
    'withdrawal_disabled_reason', v_balance_calc->>'reason',
    'minimum_withdrawal_amount', 200,
    'active_withdrawal_status', v_active_withdrawal
  ) INTO v_summary;

  RETURN coalesce(v_summary, '{}'::json);
END;
$$;


ALTER FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_payment_statements"() RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_astrologer_id uuid;
begin
  select id into v_astrologer_id
  from public.astrologers
  where user_id = auth.uid();

  if not found then
    return;
  end if;

  return query
  with statements as (
    -- Consultation Branch
    select 
      bl.id as id,
      'CONSULTATION_BILLING' as entry_type,
      'Consultation with ' || coalesce(cs.customer_display_name, 'Customer') as title,
      cs.billed_minutes::text || ' minutes' as description,
      bl.gross_amount,
      bl.astrologer_amount,
      bl.company_amount,
      'Completed' as status,
      cs.id as consultation_id,
      cs.customer_display_name,
      cs.billed_minutes,
      cs.rate_per_minute,
      coalesce(cs.ended_at, bl.earned_at) as occurred_at
    from public.astrologer_billing_ledger bl
    join public.consultation_sessions cs on bl.consultation_id = cs.id
    where bl.astrologer_id = v_astrologer_id

    union all

    -- Withdrawal Branch
    select
      wr.id as id,
      'WITHDRAWAL_REQUEST' as entry_type,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then 'Withdrawal Request'
        when wr.status = 'PAID' then 'Payout to ' || wr.payout_bank_name || ' •••• ' || wr.payout_account_last4
        when wr.status = 'REJECTED' then 'Withdrawal Rejected'
        when wr.status = 'FAILED' then 'Payout Failed'
        else 'Withdrawal'
      end as title,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then '₹' || wr.amount::text || ' Reserved'
        when wr.status = 'PAID' then coalesce('Bank Ref: ' || wr.bank_reference, 'Paid')
        when wr.status = 'REJECTED' then coalesce(wr.rejection_reason, 'Rejected by admin')
        when wr.status = 'FAILED' then coalesce(wr.failure_reason, 'Failed to process')
        else wr.status
      end as description,
      wr.amount as gross_amount,
      null as astrologer_amount,
      null as company_amount,
      case 
        when wr.status in ('REQUESTED', 'APPROVED', 'PROCESSING') then 'Requested'
        when wr.status = 'PAID' then 'Paid'
        when wr.status = 'REJECTED' then 'Rejected'
        when wr.status = 'FAILED' then 'Failed'
        else wr.status
      end as status,
      null as consultation_id,
      null as customer_display_name,
      null as billed_minutes,
      null as rate_per_minute,
      wr.requested_at as occurred_at
    from public.astrologer_withdrawal_requests wr
    where wr.astrologer_id = v_astrologer_id
  )
  select pg_catalog.jsonb_build_object(
    'id', id,
    'entry_type', entry_type,
    'title', title,
    'description', description,
    'gross_amount', gross_amount,
    'astrologer_amount', astrologer_amount,
    'company_amount', company_amount,
    'status', status,
    'consultation_id', consultation_id,
    'customer_display_name', customer_display_name,
    'billed_minutes', billed_minutes,
    'rate_per_minute', rate_per_minute,
    'occurred_at', occurred_at
  )
  from statements
  order by occurred_at desc;
end;
$$;


ALTER FUNCTION "public"."get_my_payment_statements"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_payout_account"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_astrologer_id uuid;
  v_account public.astrologer_payout_accounts;
begin
  select id into v_astrologer_id from public.astrologers where user_id = (select auth.uid());
  if not found then
    return null;
  end if;

  select * into v_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id;

  if not found then
    return null;
  end if;

  return pg_catalog.jsonb_build_object(
    'id', v_account.id,
    'account_holder_name', v_account.account_holder_name,
    'bank_name', v_account.bank_name,
    'account_number_last4', v_account.account_number_last4,
    'ifsc_code', v_account.ifsc_code,
    'status', v_account.status,
    'rejection_reason', v_account.rejection_reason,
    'submitted_at', v_account.submitted_at,
    'verified_at', v_account.verified_at
  );
end;
$$;


ALTER FUNCTION "public"."get_my_payout_account"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_withdrawal_requests"() RETURNS SETOF "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_astrologer_id uuid;
begin
  select id into v_astrologer_id
  from public.astrologers
  where user_id = auth.uid();

  if not found then
    return;
  end if;

  return query
  select pg_catalog.jsonb_build_object(
    'id', id,
    'amount', amount,
    'currency', currency,
    'status', status,
    'requested_at', requested_at,
    'approved_at', approved_at,
    'processing_at', processing_at,
    'paid_at', paid_at,
    'rejected_at', rejected_at,
    'failed_at', failed_at,
    'payout_reference', payout_reference,
    'bank_reference', bank_reference,
    'rejection_reason', rejection_reason,
    'failure_reason', failure_reason,
    'payout_bank_name', payout_bank_name,
    'payout_account_last4', payout_account_last4
  )
  from public.astrologer_withdrawal_requests
  where astrologer_id = v_astrologer_id
  order by requested_at desc;
end;
$$;


ALTER FUNCTION "public"."get_my_withdrawal_requests"() OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."handle_pending_commission_ledger"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Only process when a row is newly inserted OR its status transitions to awaiting_commission
    IF (TG_OP = 'INSERT' AND NEW.calculation_status = 'awaiting_commission') OR 
       (TG_OP = 'UPDATE' AND NEW.calculation_status = 'awaiting_commission' AND OLD.calculation_status != 'awaiting_commission') THEN
        
        -- Call internal processor. We don't care about the return value for the trigger,
        -- if it fails to configure, it just returns 'COMMISSION_NOT_CONFIGURED' and the row stays awaiting.
        PERFORM public.process_commission_for_ledger(NEW.consultation_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_pending_commission_ledger"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_ledger record;
    v_active_override record;
    v_active_global record;
    v_company_pct numeric;
    v_astro_pct numeric;
    v_source text;
    v_rule_id uuid;
    v_astro_amount numeric;
    v_company_amount numeric;
BEGIN
    SELECT * INTO v_ledger 
    FROM public.astrologer_billing_ledger 
    WHERE consultation_id = p_ledger_id 
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN 'LEDGER_NOT_FOUND_OR_LOCKED';
    END IF;

    IF v_ledger.calculation_status != 'awaiting_commission' THEN
        RETURN 'LEDGER_ALREADY_PROCESSED';
    END IF;

    -- 1. Try to find active astrologer override
    SELECT * INTO v_active_override
    FROM public.astrologer_commission_overrides
    WHERE astrologer_id = v_ledger.astrologer_id
      AND UPPER(status) = 'ACTIVE'
      AND (
        (effective_from <= v_ledger.earned_at AND (effective_to IS NULL OR effective_to > v_ledger.earned_at))
        OR (effective_to IS NULL)
      )
    ORDER BY effective_from DESC
    LIMIT 1;

    IF FOUND THEN
        v_company_pct := v_active_override.company_percentage;
        v_astro_pct := v_active_override.astrologer_percentage;
        v_source := 'astrologer_override';
        v_rule_id := v_active_override.id;
    ELSE
        -- 2. Try to find active global rule
        SELECT * INTO v_active_global
        FROM public.commission_rules
        WHERE UPPER(status) = 'ACTIVE'
          AND (
            (effective_from <= v_ledger.earned_at AND (effective_to IS NULL OR effective_to > v_ledger.earned_at))
            OR (effective_to IS NULL)
          )
        ORDER BY effective_from DESC
        LIMIT 1;

        IF FOUND THEN
            v_company_pct := v_active_global.company_percentage;
            v_astro_pct := v_active_global.astrologer_percentage;
            v_source := 'global_rule';
            v_rule_id := v_active_global.id;
        ELSE
            RETURN 'COMMISSION_NOT_CONFIGURED';
        END IF;
    END IF;

    -- 3. Calculate exact split
    v_astro_amount := ROUND((v_ledger.gross_amount * v_astro_pct) / 100.0, 2);
    v_company_amount := v_ledger.gross_amount - v_astro_amount;

    -- 4. Update the ledger row
    UPDATE public.astrologer_billing_ledger
    SET 
        company_percentage = v_company_pct,
        astrologer_percentage = v_astro_pct,
        commission_source = v_source,
        commission_rule_id = v_rule_id,
        company_amount = v_company_amount,
        astrologer_amount = v_astro_amount,
        calculation_status = 'calculated',
        commission_calculated_at = pg_catalog.now()
    WHERE consultation_id = p_ledger_id;

    RETURN 'SUCCESS';
END;
$$;


ALTER FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."process_pending_commissions"("p_limit" integer DEFAULT 100) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_row record;
    v_processed integer := 0;
    v_calculated integer := 0;
    v_not_configured integer := 0;
    v_failed integer := 0;
    v_result text;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_limit > 500 THEN
        p_limit := 500;
    END IF;

    FOR v_row IN 
        SELECT consultation_id FROM public.astrologer_billing_ledger
        WHERE calculation_status = 'awaiting_commission'
        ORDER BY earned_at ASC
        LIMIT p_limit
    LOOP
        v_processed := v_processed + 1;
        BEGIN
            v_result := public.process_commission_for_ledger(v_row.consultation_id);
            IF v_result = 'SUCCESS' THEN
                v_calculated := v_calculated + 1;
            ELSIF v_result = 'COMMISSION_NOT_CONFIGURED' THEN
                v_not_configured := v_not_configured + 1;
            ELSE
                v_failed := v_failed + 1;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_failed := v_failed + 1;
        END;
    END LOOP;

    RETURN jsonb_build_object(
        'processed_count', v_processed,
        'calculated_count', v_calculated,
        'not_configured_count', v_not_configured,
        'failed_count', v_failed
    );
END;
$$;


ALTER FUNCTION "public"."process_pending_commissions"("p_limit" integer) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_app public.astrologer_applications%ROWTYPE;
BEGIN
    SELECT * INTO v_app FROM public.astrologer_applications WHERE id = p_application_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;
    IF v_app.status != 'pending' THEN
        RAISE EXCEPTION 'Application is not pending';
    END IF;

    UPDATE public.astrologer_applications
    SET status = 'rejected',
        rejection_reason = p_reason,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = p_application_id;
END;
$$;


ALTER FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_astrologer_id uuid;
  v_payout_account public.astrologer_payout_accounts;
  v_balance_calc json;
  v_active_withdrawal text;
  v_withdrawal_id uuid;
BEGIN
  -- 1. Authenticate and resolve astrologer
  select a.id into v_astrologer_id
  from public.astrologers a
  left join public.astrologer_applications app on a.application_id = app.id
  where a.user_id = auth.uid() 
    and (app.id is null or app.status = 'approved')
  for update; -- Lock astrologer row

  if not found then
    raise exception 'Unauthorized: Only approved astrologers can request withdrawals.';
  end if;

  -- 2. Validate amount >= 200
  if p_amount < 200 then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'MINIMUM_WITHDRAWAL_NOT_MET');
  end if;

  -- 3. Resolve payout account status
  select * into v_payout_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id;

  if not found then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_MISSING');
  end if;

  if v_payout_account.status = 'PENDING' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_PENDING');
  end if;

  if v_payout_account.status = 'REJECTED' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_REJECTED');
  end if;

  if v_payout_account.status <> 'VERIFIED' then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'PAYOUT_ACCOUNT_NOT_VERIFIED');
  end if;

  -- 4. Detect active withdrawal
  select status into v_active_withdrawal
  from public.astrologer_withdrawal_requests
  where astrologer_id = v_astrologer_id
    and status in ('REQUESTED', 'APPROVED', 'PROCESSING')
  for update;

  if found then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'ACTIVE_WITHDRAWAL_EXISTS');
  end if;

  -- 5. Evaluate balance
  v_balance_calc := public.calculate_astrologer_withdrawable_balance(v_astrologer_id);
  
  if p_amount > (v_balance_calc->>'available_balance')::numeric then
    return pg_catalog.jsonb_build_object('status', 'error', 'reason', 'INSUFFICIENT_BALANCE');
  end if;

  -- 6. Insert REQUESTED
  insert into public.astrologer_withdrawal_requests (
    astrologer_id, payout_account_id, amount, currency, status, 
    payout_bank_name, payout_account_last4, requested_at
  ) values (
    v_astrologer_id, v_payout_account.id, p_amount, 'INR', 'REQUESTED',
    v_payout_account.bank_name, v_payout_account.account_number_last4, pg_catalog.now()
  ) returning id into v_withdrawal_id;

  -- Add a negative ledger entry immediately so balance is reduced while pending
  insert into public.astrologer_billing_ledger (
    astrologer_id, session_id, gross_amount, platform_fee, astrologer_amount, 
    calculation_status, created_at, updated_at
  ) values (
    v_astrologer_id, null, 0, 0, -p_amount, 
    'processing', pg_catalog.now(), pg_catalog.now()
  );

  return pg_catalog.jsonb_build_object('status', 'success', 'withdrawal_id', v_withdrawal_id);
END;
$$;


ALTER FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."save_kundli_matching_report"("p_owner_id" "uuid", "p_idempotency_key" "text", "p_input_fingerprint" "text", "p_boy_snapshot" "jsonb", "p_girl_snapshot" "jsonb", "p_compatibility_result" "jsonb", "p_total_score" numeric, "p_boy_profile_id" "uuid" DEFAULT NULL::"uuid", "p_boy_profile_usage" "text" DEFAULT NULL::"text", "p_girl_profile_id" "uuid" DEFAULT NULL::"uuid", "p_girl_profile_usage" "text" DEFAULT NULL::"text", "p_create_boy_profile" "jsonb" DEFAULT NULL::"jsonb", "p_create_girl_profile" "jsonb" DEFAULT NULL::"jsonb", "p_provider" "text" DEFAULT 'KundliNova'::"text", "p_engine_version" "text" DEFAULT 'v1'::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_report_id UUID;
  v_lock_key BIGINT;
  v_boy_profile_id UUID := p_boy_profile_id;
  v_girl_profile_id UUID := p_girl_profile_id;
  v_boy_scope TEXT;
  v_boy_relation TEXT;
  v_boy_owner UUID;
  v_girl_scope TEXT;
  v_girl_relation TEXT;
  v_girl_owner UUID;
BEGIN
  -- Strict Hardened Validations
  IF char_length(p_idempotency_key) < 8 OR char_length(p_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Invalid idempotency_key length';
  END IF;
  IF char_length(p_input_fingerprint) < 16 OR char_length(p_input_fingerprint) > 200 THEN
    RAISE EXCEPTION 'Invalid input_fingerprint length';
  END IF;
  IF p_total_score < 0 OR p_total_score > 36 THEN
    RAISE EXCEPTION 'Invalid total_score';
  END IF;
  IF p_boy_snapshot IS NULL OR p_girl_snapshot IS NULL OR p_compatibility_result IS NULL THEN
    RAISE EXCEPTION 'Mandatory snapshots and result cannot be null';
  END IF;

  -- Usage valid checks
  IF p_boy_profile_usage IS NOT NULL AND p_boy_profile_usage NOT IN ('self', 'matching_saved') THEN
    RAISE EXCEPTION 'Invalid boy profile usage';
  END IF;
  IF p_girl_profile_usage IS NOT NULL AND p_girl_profile_usage NOT IN ('self', 'matching_saved') THEN
    RAISE EXCEPTION 'Invalid girl profile usage';
  END IF;

  IF p_boy_profile_id IS NOT NULL AND p_boy_profile_usage IS NULL THEN
    RAISE EXCEPTION 'boy profile id provided without usage';
  END IF;
  IF p_girl_profile_id IS NOT NULL AND p_girl_profile_usage IS NULL THEN
    RAISE EXCEPTION 'girl profile id provided without usage';
  END IF;

  -- Race-safe Idempotency Lock
  v_lock_key := hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0);
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  SELECT id INTO v_report_id FROM public.kundli_matching_reports 
  WHERE owner_id = p_owner_id AND idempotency_key = p_idempotency_key;
  IF v_report_id IS NOT NULL THEN RETURN v_report_id; END IF;

  -- Conflict Checks
  IF v_boy_profile_id IS NOT NULL AND p_create_boy_profile IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot provide both an existing boy profile ID and data to create one';
  END IF;
  IF v_girl_profile_id IS NOT NULL AND p_create_girl_profile IS NOT NULL THEN
    RAISE EXCEPTION 'Cannot provide both an existing girl profile ID and data to create one';
  END IF;

  -- Verify Ownership & Usage
  IF v_boy_profile_id IS NOT NULL THEN
    SELECT owner_id, relation, profile_scope INTO v_boy_owner, v_boy_relation, v_boy_scope FROM public.kundli_profiles WHERE id = v_boy_profile_id;
    IF v_boy_owner IS NULL THEN
      RAISE EXCEPTION 'Boy profile not found';
    END IF;
    IF v_boy_owner != p_owner_id THEN
      RAISE EXCEPTION 'Boy profile does not belong to owner';
    END IF;
    IF p_boy_profile_usage = 'self' THEN
      IF v_boy_relation != 'self' OR v_boy_scope != 'personal' THEN
        RAISE EXCEPTION 'Boy profile usage self constraint failed';
      END IF;
    ELSIF p_boy_profile_usage = 'matching_saved' THEN
      IF v_boy_scope != 'matching_only' THEN
        RAISE EXCEPTION 'Boy profile usage matching_saved constraint failed';
      END IF;
    END IF;
  END IF;

  IF v_girl_profile_id IS NOT NULL THEN
    SELECT owner_id, relation, profile_scope INTO v_girl_owner, v_girl_relation, v_girl_scope FROM public.kundli_profiles WHERE id = v_girl_profile_id;
    IF v_girl_owner IS NULL THEN
      RAISE EXCEPTION 'Girl profile not found';
    END IF;
    IF v_girl_owner != p_owner_id THEN
      RAISE EXCEPTION 'Girl profile does not belong to owner';
    END IF;
    IF p_girl_profile_usage = 'self' THEN
      IF v_girl_relation != 'self' OR v_girl_scope != 'personal' THEN
        RAISE EXCEPTION 'Girl profile usage self constraint failed';
      END IF;
    ELSIF p_girl_profile_usage = 'matching_saved' THEN
      IF v_girl_scope != 'matching_only' THEN
        RAISE EXCEPTION 'Girl profile usage matching_saved constraint failed';
      END IF;
    END IF;
  END IF;

  -- Whitelisted Profile Creation
  IF p_create_boy_profile IS NOT NULL THEN
    INSERT INTO public.kundli_profiles (owner_id, profile_scope, relation, name, gender, dob, tob, birth_city, birth_district, birth_state, latitude, longitude, timezone)
    VALUES (
      p_owner_id, 'matching_only', 'partner',
      p_create_boy_profile->>'name', p_create_boy_profile->>'gender', 
      (p_create_boy_profile->>'dob')::DATE, (p_create_boy_profile->>'tob')::TIME,
      p_create_boy_profile->>'birth_city', p_create_boy_profile->>'birth_district', p_create_boy_profile->>'birth_state',
      (p_create_boy_profile->>'latitude')::FLOAT, (p_create_boy_profile->>'longitude')::FLOAT, p_create_boy_profile->>'timezone'
    ) RETURNING id INTO v_boy_profile_id;
  END IF;

  IF p_create_girl_profile IS NOT NULL THEN
    INSERT INTO public.kundli_profiles (owner_id, profile_scope, relation, name, gender, dob, tob, birth_city, birth_district, birth_state, latitude, longitude, timezone)
    VALUES (
      p_owner_id, 'matching_only', 'partner',
      p_create_girl_profile->>'name', p_create_girl_profile->>'gender', 
      (p_create_girl_profile->>'dob')::DATE, (p_create_girl_profile->>'tob')::TIME,
      p_create_girl_profile->>'birth_city', p_create_girl_profile->>'birth_district', p_create_girl_profile->>'birth_state',
      (p_create_girl_profile->>'latitude')::FLOAT, (p_create_girl_profile->>'longitude')::FLOAT, p_create_girl_profile->>'timezone'
    ) RETURNING id INTO v_girl_profile_id;
  END IF;

  -- Insert Immutable Report
  INSERT INTO public.kundli_matching_reports (
    owner_id, idempotency_key, input_fingerprint,
    boy_snapshot, girl_snapshot,
    boy_profile_id, girl_profile_id,
    compatibility_result, total_score,
    provider, engine_version
  ) VALUES (
    p_owner_id, p_idempotency_key, p_input_fingerprint,
    p_boy_snapshot, p_girl_snapshot,
    v_boy_profile_id, v_girl_profile_id,
    p_compatibility_result, p_total_score,
    p_provider, p_engine_version
  ) RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;


ALTER FUNCTION "public"."save_kundli_matching_report"("p_owner_id" "uuid", "p_idempotency_key" "text", "p_input_fingerprint" "text", "p_boy_snapshot" "jsonb", "p_girl_snapshot" "jsonb", "p_compatibility_result" "jsonb", "p_total_score" numeric, "p_boy_profile_id" "uuid", "p_boy_profile_usage" "text", "p_girl_profile_id" "uuid", "p_girl_profile_usage" "text", "p_create_boy_profile" "jsonb", "p_create_girl_profile" "jsonb", "p_provider" "text", "p_engine_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
DECLARE
  v_astrologer_id uuid;
  v_uppercase_ifsc text;
  v_last4 text;
  v_secret_id uuid;
  v_account public.astrologer_payout_accounts;
  v_now timestamptz := pg_catalog.now();
BEGIN
  v_astrologer_id := public.require_astrologer_auth();
  
  -- Basic validation
  if pg_catalog.length(p_account_number) < 4 then
    raise exception 'Account number must be at least 4 digits';
  end if;

  v_uppercase_ifsc := pg_catalog.upper(pg_catalog.trim(p_ifsc_code));
  if v_uppercase_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
    raise exception 'Invalid IFSC code format';
  end if;

  v_last4 := pg_catalog.right(p_account_number, 4);
  v_secret_id := vault.create_secret(p_account_number, 'astrologer_payout_' || v_astrologer_id::text, 'Payout account number');

  select * into v_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id
  for update;

  if found then
    -- Replace the submitted details securely
    update public.astrologer_payout_accounts
    set account_holder_name = p_account_holder_name,
        bank_name = p_bank_name,
        account_number_secret_id = v_secret_id,
        account_number_last4 = v_last4,
        ifsc_code = v_uppercase_ifsc,
        status = 'VERIFIED',
        rejection_reason = null,
        verified_at = v_now,
        verified_by = null,
        submitted_at = v_now,
        updated_at = v_now
    where id = v_account.id;
  else
    insert into public.astrologer_payout_accounts (
      astrologer_id, account_holder_name, bank_name, account_number_secret_id,
      account_number_last4, ifsc_code, status, submitted_at, updated_at, verified_at
    ) values (
      v_astrologer_id, p_account_holder_name, p_bank_name, v_secret_id,
      v_last4, v_uppercase_ifsc, 'VERIFIED', v_now, v_now, v_now
    );
  end if;

  return public.get_my_payout_account();
END;
$_$;


ALTER FUNCTION "public"."save_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_new_id uuid;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active override for this astrologer
    UPDATE public.astrologer_commission_overrides
    SET status = 'INACTIVE', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE astrologer_id = p_astrologer_id AND status = 'ACTIVE';

    -- Insert new active override
    INSERT INTO public.astrologer_commission_overrides (
        id, astrologer_id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_astrologer_id, p_company_percentage, p_astrologer_percentage, p_effective_from, 'ACTIVE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'override_id', v_new_id);
END;
$$;


ALTER FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    v_new_id uuid;
BEGIN
    PERFORM public.assert_current_user_is_admin();

    IF p_company_percentage + p_astrologer_percentage != 100 THEN
        RAISE EXCEPTION 'Percentages must total exactly 100.';
    END IF;

    -- Deactivate current active rule and set effective_to
    UPDATE public.commission_rules
    SET status = 'INACTIVE', effective_to = p_effective_from, updated_at = pg_catalog.now()
    WHERE status = 'ACTIVE';

    -- Insert new active rule
    INSERT INTO public.commission_rules (
        id, company_percentage, astrologer_percentage, effective_from, status, created_by
    ) VALUES (
        gen_random_uuid(), p_company_percentage, p_astrologer_percentage, p_effective_from, 'ACTIVE', COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'rule_id', v_new_id);
END;
$$;


ALTER FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."severity_rank"("p_severity" "text") RETURNS integer
    LANGUAGE "plpgsql" IMMUTABLE
    AS $$
BEGIN
    RETURN CASE p_severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'WARNING' THEN 3
        WHEN 'INFO' THEN 4
        ELSE 5
    END;
END;
$$;


ALTER FUNCTION "public"."severity_rank"("p_severity" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_session public.consultation_sessions;
  v_wallet public.wallets;
  v_settings public.consultation_settings;
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

  if v_wallet.balance < (v_session.rate_per_minute * v_settings.minimum_minutes) then
    update public.consultation_sessions
    set status = 'INSUFFICIENT_BALANCE', ended_at = v_now
    where id = p_session_id
    returning * into v_session;
    return pg_catalog.jsonb_build_object('status', 'insufficient_balance', 'session', pg_catalog.to_jsonb(v_session), 'balance', v_wallet.balance);
  end if;

  update public.consultation_sessions
  set status = 'ACTIVE',
      started_at = coalesce(started_at, v_now),
      last_billed_at = null,
      billed_minutes = 0,
      total_charged = 0,
      elapsed_seconds = 0
  where id = p_session_id
  returning * into v_session;

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


CREATE OR REPLACE FUNCTION "public"."submit_my_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $_$
declare
  v_astrologer_id uuid;
  v_account public.astrologer_payout_accounts;
  v_secret_id uuid;
  v_last4 text;
  v_now timestamptz := pg_catalog.now();
  v_uppercase_ifsc text;
begin
  select id into v_astrologer_id from public.astrologers where user_id = (select auth.uid());
  if not found then
    raise exception 'Astrologer profile not found';
  end if;

  if pg_catalog.length(p_account_number) < 4 then
    raise exception 'Account number is too short';
  end if;

  v_uppercase_ifsc := pg_catalog.upper(p_ifsc_code);
  if v_uppercase_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
    raise exception 'Invalid IFSC code format';
  end if;

  v_last4 := pg_catalog.right(p_account_number, 4);
  v_secret_id := vault.create_secret(p_account_number, 'astrologer_payout_' || v_astrologer_id::text, 'Payout account number');

  select * into v_account
  from public.astrologer_payout_accounts
  where astrologer_id = v_astrologer_id
  for update;

  if found then
    if v_account.status in ('PENDING', 'VERIFIED') then
      raise exception 'Cannot update an account that is %', v_account.status;
    end if;

    -- Replace the submitted details securely
    update public.astrologer_payout_accounts
    set account_holder_name = p_account_holder_name,
        bank_name = p_bank_name,
        account_number_secret_id = v_secret_id,
        account_number_last4 = v_last4,
        ifsc_code = v_uppercase_ifsc,
        status = 'PENDING',
        rejection_reason = null,
        verified_at = null,
        verified_by = null,
        submitted_at = v_now,
        updated_at = v_now
    where id = v_account.id;
  else
    insert into public.astrologer_payout_accounts (
      astrologer_id, account_holder_name, bank_name, account_number_secret_id,
      account_number_last4, ifsc_code, status, submitted_at, updated_at
    ) values (
      v_astrologer_id, p_account_holder_name, p_bank_name, v_secret_id,
      v_last4, v_uppercase_ifsc, 'PENDING', v_now, v_now
    );
  end if;

  return public.get_my_payout_account();
end;
$_$;


ALTER FUNCTION "public"."submit_my_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") OWNER TO "postgres";


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


CREATE OR REPLACE FUNCTION "public"."sync_self_kundli_profile"("p_owner_id" "uuid", "p_name" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_birth_state" "text", "p_birth_district" "text", "p_birth_city" "text", "p_latitude" double precision, "p_longitude" double precision, "p_timezone" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_self_id uuid;
  v_self_count integer;
  v_reason text;
BEGIN
  -- 1. Verify the account profile exists. Fail fast before any mutation.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_owner_id
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_PROFILE_NOT_FOUND: no profiles row for owner %', p_owner_id;
  END IF;

  -- 2. Serialise concurrent self-kundli operations for this user.
  PERFORM pg_advisory_xact_lock(
    pg_catalog.hashtext(p_owner_id::text || ':sync-self-kundli')
  );

  -- 3. Count existing self rows.
  SELECT COUNT(*) INTO v_self_count
  FROM public.kundli_profiles
  WHERE owner_id = p_owner_id AND relation = 'self';

  -- 4. Integrity guard: more than one self row is a data error. Do not commit.
  IF v_self_count > 1 THEN
    RAISE EXCEPTION 'DUPLICATE_SELF_PROFILES: owner % has % self kundli rows',
      p_owner_id, v_self_count;
  END IF;

  -- 5. Update profiles table first (the account source of truth).
  UPDATE public.profiles SET
    name           = pg_catalog.trim(p_name),
    gender         = pg_catalog.trim(p_gender),
    dob            = p_dob,
    tob            = p_tob,
    birth_state    = pg_catalog.trim(p_birth_state),
    birth_district = pg_catalog.trim(p_birth_district),
    birth_city     = pg_catalog.trim(p_birth_city)
  WHERE id = p_owner_id;

  -- 6a. Insert self row when none exists.
  IF v_self_count = 0 THEN
    INSERT INTO public.kundli_profiles (
      owner_id, name, relation, gender,
      dob, tob,
      birth_state, birth_district, birth_city,
      latitude, longitude, timezone,
      is_default
    ) VALUES (
      p_owner_id,
      pg_catalog.trim(p_name),
      'self',
      pg_catalog.trim(p_gender),
      p_dob, p_tob,
      pg_catalog.trim(p_birth_state),
      pg_catalog.trim(p_birth_district),
      pg_catalog.trim(p_birth_city),
      p_latitude, p_longitude, p_timezone,
      true
    )
    RETURNING id INTO v_self_id;
    v_reason := 'CREATED';

  -- 6b. Update the one existing self row.
  ELSE
    UPDATE public.kundli_profiles SET
      name           = pg_catalog.trim(p_name),
      gender         = pg_catalog.trim(p_gender),
      dob            = p_dob,
      tob            = p_tob,
      birth_state    = pg_catalog.trim(p_birth_state),
      birth_district = pg_catalog.trim(p_birth_district),
      birth_city     = pg_catalog.trim(p_birth_city),
      latitude       = p_latitude,
      longitude      = p_longitude,
      timezone       = p_timezone
    WHERE owner_id = p_owner_id AND relation = 'self'
    RETURNING id INTO v_self_id;
    v_reason := 'UPDATED';
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'self_profile_id', v_self_id,
    'reason',          v_reason
  );
END;
$$;


ALTER FUNCTION "public"."sync_self_kundli_profile"("p_owner_id" "uuid", "p_name" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_birth_state" "text", "p_birth_district" "text", "p_birth_city" "text", "p_latitude" double precision, "p_longitude" double precision, "p_timezone" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    UPDATE public.astrologers
    SET status = p_status
    WHERE id = p_astrologer_id;
END;
$$;


ALTER FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."admin_audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_user_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "before_state" "jsonb",
    "after_state" "jsonb",
    "reason" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_audit_logs" OWNER TO "postgres";


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
    "bank_account_holder_name" "text",
    "bank_name" "text",
    "bank_account_number" "text",
    "bank_ifsc_code" "text",
    CONSTRAINT "astrologer_application_pending_is_complete" CHECK ((("status" <> 'pending'::"text") OR ((NULLIF("btrim"("legal_name"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("display_name"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("email"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("phone"), ''::"text") IS NOT NULL) AND ("pan_number" ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::"text") AND ("experience_years" IS NOT NULL) AND ("cardinality"("languages") > 0) AND ("cardinality"("skills") > 0) AND ("cardinality"("consultation_modes") > 0) AND (NULLIF("btrim"("about"), ''::"text") IS NOT NULL) AND ("requested_price_per_minute" IS NOT NULL) AND (NULLIF("btrim"("profile_photo_url"), ''::"text") IS NOT NULL) AND (NULLIF("btrim"("pan_document_path"), ''::"text") IS NOT NULL) AND ("submitted_at" IS NOT NULL)))),
    CONSTRAINT "astrologer_applications_experience_years_check" CHECK ((("experience_years" >= 0) AND ("experience_years" <= 80))),
    CONSTRAINT "astrologer_applications_requested_price_per_minute_check" CHECK ((("requested_price_per_minute" >= (0)::numeric) AND ("requested_price_per_minute" <= (10000)::numeric))),
    CONSTRAINT "astrologer_applications_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending'::"text", 'approved'::"text", 'rejected'::"text", 'suspended'::"text"])))
);


ALTER TABLE "public"."astrologer_applications" OWNER TO "postgres";


COMMENT ON TABLE "public"."astrologer_applications" IS 'Private partner applications. Public profile data is copied to astrologers only after approval.';



CREATE TABLE IF NOT EXISTS "public"."astrologer_billing_ledger" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "consultation_id" "uuid" NOT NULL,
    "gross_amount" numeric(10,2) NOT NULL,
    "astrologer_amount" numeric(10,2),
    "company_amount" numeric(10,2),
    "commission_rule_id" "uuid",
    "calculation_status" "text" DEFAULT 'awaiting_commission'::"text" NOT NULL,
    "earned_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "available_at" timestamp with time zone,
    "settled_at" timestamp with time zone,
    "payout_reference" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "company_percentage" numeric(5,2),
    "astrologer_percentage" numeric(5,2),
    "commission_source" "text",
    "commission_calculated_at" timestamp with time zone,
    CONSTRAINT "astrologer_billing_ledger_astrologer_amount_check" CHECK ((("astrologer_amount" IS NULL) OR ("astrologer_amount" >= (0)::numeric))),
    CONSTRAINT "astrologer_billing_ledger_calculation_status_check" CHECK (("calculation_status" = ANY (ARRAY['awaiting_commission'::"text", 'calculated'::"text", 'withdrawable'::"text", 'processing'::"text", 'settled'::"text", 'reversed'::"text"]))),
    CONSTRAINT "astrologer_billing_ledger_company_amount_check" CHECK ((("company_amount" IS NULL) OR ("company_amount" >= (0)::numeric))),
    CONSTRAINT "astrologer_billing_ledger_gross_amount_check" CHECK (("gross_amount" >= (0)::numeric))
);


ALTER TABLE "public"."astrologer_billing_ledger" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_commission_overrides" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "company_percentage" numeric(5,2) NOT NULL,
    "astrologer_percentage" numeric(5,2) NOT NULL,
    "effective_from" timestamp with time zone NOT NULL,
    "effective_to" timestamp with time zone,
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_astro_overrides_sum" CHECK ((("company_percentage" + "astrologer_percentage") = (100)::numeric)),
    CONSTRAINT "valid_override_percentages" CHECK ((("company_percentage" + "astrologer_percentage") = (100)::numeric)),
    CONSTRAINT "valid_override_status" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."astrologer_commission_overrides" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_payout_accounts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "account_holder_name" "text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "account_number_secret_id" "uuid" NOT NULL,
    "account_number_last4" "text" NOT NULL,
    "ifsc_code" "text" NOT NULL,
    "status" "text" DEFAULT 'PENDING'::"text" NOT NULL,
    "rejection_reason" "text",
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "astrologer_payout_accounts_account_number_last4_check" CHECK (("length"("account_number_last4") = 4)),
    CONSTRAINT "astrologer_payout_accounts_check" CHECK (((("status" = 'REJECTED'::"text") AND ("rejection_reason" IS NOT NULL)) OR (("status" <> 'REJECTED'::"text") AND ("rejection_reason" IS NULL)))),
    CONSTRAINT "astrologer_payout_accounts_ifsc_code_check" CHECK (("ifsc_code" ~ '^[A-Z]{4}0[A-Z0-9]{6}$'::"text")),
    CONSTRAINT "astrologer_payout_accounts_status_check" CHECK (("status" = ANY (ARRAY['PENDING'::"text", 'VERIFIED'::"text", 'REJECTED'::"text"])))
);


ALTER TABLE "public"."astrologer_payout_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."astrologer_withdrawal_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "astrologer_id" "uuid" NOT NULL,
    "payout_account_id" "uuid" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" "text" DEFAULT 'INR'::"text" NOT NULL,
    "status" "text" NOT NULL,
    "payout_bank_name" "text" NOT NULL,
    "payout_account_last4" "text" NOT NULL,
    "rejection_reason" "text",
    "failure_reason" "text",
    "requested_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "processing_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "paid_by" "uuid",
    "rejected_at" timestamp with time zone,
    "rejected_by" "uuid",
    "failed_at" timestamp with time zone,
    "payout_reference" "text",
    "bank_reference" "text",
    "admin_note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "astrologer_withdrawal_requests_amount_check" CHECK (("amount" >= (200)::numeric)),
    CONSTRAINT "astrologer_withdrawal_requests_check" CHECK ((("status" <> 'REJECTED'::"text") OR ("rejection_reason" IS NOT NULL))),
    CONSTRAINT "astrologer_withdrawal_requests_check1" CHECK ((("status" <> 'FAILED'::"text") OR ("failure_reason" IS NOT NULL))),
    CONSTRAINT "astrologer_withdrawal_requests_check2" CHECK ((("status" <> 'PAID'::"text") OR ("paid_at" IS NOT NULL))),
    CONSTRAINT "astrologer_withdrawal_requests_check3" CHECK ((("status" <> 'PAID'::"text") OR ("payout_reference" IS NOT NULL))),
    CONSTRAINT "astrologer_withdrawal_requests_currency_check" CHECK (("currency" = 'INR'::"text")),
    CONSTRAINT "astrologer_withdrawal_requests_payout_account_last4_check" CHECK (("length"("payout_account_last4") = 4)),
    CONSTRAINT "astrologer_withdrawal_requests_status_check" CHECK (("status" = ANY (ARRAY['REQUESTED'::"text", 'APPROVED'::"text", 'PROCESSING'::"text", 'PAID'::"text", 'REJECTED'::"text", 'FAILED'::"text", 'CANCELLED'::"text"])))
);


ALTER TABLE "public"."astrologer_withdrawal_requests" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."commission_rules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "company_percentage" numeric(5,2) NOT NULL,
    "astrologer_percentage" numeric(5,2) NOT NULL,
    "effective_from" timestamp with time zone NOT NULL,
    "effective_to" timestamp with time zone,
    "status" "text" DEFAULT 'DRAFT'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "chk_commission_rules_sum" CHECK ((("company_percentage" + "astrologer_percentage") = (100)::numeric)),
    CONSTRAINT "valid_percentages" CHECK ((("company_percentage" + "astrologer_percentage") = (100)::numeric)),
    CONSTRAINT "valid_status" CHECK (("status" = ANY (ARRAY['DRAFT'::"text", 'ACTIVE'::"text", 'INACTIVE'::"text"])))
);


ALTER TABLE "public"."commission_rules" OWNER TO "postgres";


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


CREATE TABLE IF NOT EXISTS "public"."kundli_matching_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "boy_profile_id" "uuid",
    "girl_profile_id" "uuid",
    "boy_snapshot" "jsonb" NOT NULL,
    "girl_snapshot" "jsonb" NOT NULL,
    "compatibility_result" "jsonb" NOT NULL,
    "total_score" numeric NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL,
    "provider" "text" DEFAULT 'KundliNova'::"text" NOT NULL,
    "engine_version" "text" DEFAULT 'v1'::"text" NOT NULL,
    "idempotency_key" character varying(255) NOT NULL,
    "input_fingerprint" character varying(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kundli_matching_reports_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "kundli_matching_reports_total_score_check" CHECK ((("total_score" >= (0)::numeric) AND ("total_score" <= 36.0)))
);


ALTER TABLE "public"."kundli_matching_reports" OWNER TO "postgres";


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
    "timezone" "text",
    "rashi" "text",
    "nakshatra" "text",
    "lagna" "text",
    "mahadasha" "text",
    "profile_scope" "text" DEFAULT 'personal'::"text" NOT NULL,
    CONSTRAINT "kundli_profiles_profile_scope_check" CHECK (("profile_scope" = ANY (ARRAY['personal'::"text", 'matching_only'::"text"])))
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



ALTER TABLE ONLY "public"."admin_audit_logs"
    ADD CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."astrologer_billing_ledger"
    ADD CONSTRAINT "astrologer_billing_ledger_consultation_id_key" UNIQUE ("consultation_id");



ALTER TABLE ONLY "public"."astrologer_billing_ledger"
    ADD CONSTRAINT "astrologer_billing_ledger_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_commission_overrides"
    ADD CONSTRAINT "astrologer_commission_overrides_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_payout_accounts"
    ADD CONSTRAINT "astrologer_payout_accounts_astrologer_id_key" UNIQUE ("astrologer_id");



ALTER TABLE ONLY "public"."astrologer_payout_accounts"
    ADD CONSTRAINT "astrologer_payout_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_application_id_key" UNIQUE ("application_id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."astrologers"
    ADD CONSTRAINT "astrologers_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."commission_rules"
    ADD CONSTRAINT "commission_rules_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."kundli_matching_reports"
    ADD CONSTRAINT "kundli_matching_reports_owner_id_idempotency_key_key" UNIQUE ("owner_id", "idempotency_key");



ALTER TABLE ONLY "public"."kundli_matching_reports"
    ADD CONSTRAINT "kundli_matching_reports_pkey" PRIMARY KEY ("id");



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



CREATE INDEX "idx_astrologer_billing_ledger_astrologer_earned_at" ON "public"."astrologer_billing_ledger" USING "btree" ("astrologer_id", "earned_at");



CREATE INDEX "idx_astrologer_billing_ledger_astrologer_status" ON "public"."astrologer_billing_ledger" USING "btree" ("astrologer_id", "calculation_status");



CREATE INDEX "idx_consultation_billing_entries_user" ON "public"."consultation_billing_entries" USING "btree" ("user_id", "billed_at" DESC);



CREATE INDEX "idx_consultation_messages_sender_user" ON "public"."consultation_messages" USING "btree" ("sender_user_id");



CREATE INDEX "idx_consultations_astrologer" ON "public"."consultation_sessions" USING "btree" ("astrologer_id");



CREATE INDEX "idx_consultations_user" ON "public"."consultation_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_kundli_matching_reports_owner_created" ON "public"."kundli_matching_reports" USING "btree" ("owner_id", "created_at" DESC);



CREATE INDEX "idx_kundli_reports_profile" ON "public"."kundli_reports" USING "btree" ("profile_id");



CREATE INDEX "idx_messages_session" ON "public"."consultation_messages" USING "btree" ("session_id");



CREATE INDEX "idx_payment_orders_rzp_order" ON "public"."payment_orders" USING "btree" ("razorpay_order_id");



CREATE INDEX "idx_payment_orders_user" ON "public"."payment_orders" USING "btree" ("user_id");



CREATE INDEX "idx_payment_refunds_order" ON "public"."payment_refunds" USING "btree" ("payment_order_id");



CREATE UNIQUE INDEX "idx_unique_unresolved_withdrawal" ON "public"."astrologer_withdrawal_requests" USING "btree" ("astrologer_id") WHERE ("status" = ANY (ARRAY['REQUESTED'::"text", 'APPROVED'::"text", 'PROCESSING'::"text"]));



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



CREATE OR REPLACE TRIGGER "trigger_commission_ledger_process" AFTER INSERT OR UPDATE ON "public"."astrologer_billing_ledger" FOR EACH ROW EXECUTE FUNCTION "public"."handle_pending_commission_ledger"();



ALTER TABLE ONLY "public"."account_roles"
    ADD CONSTRAINT "account_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_applications"
    ADD CONSTRAINT "astrologer_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_billing_ledger"
    ADD CONSTRAINT "astrologer_billing_ledger_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."astrologer_billing_ledger"
    ADD CONSTRAINT "astrologer_billing_ledger_consultation_id_fkey" FOREIGN KEY ("consultation_id") REFERENCES "public"."consultation_sessions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."astrologer_commission_overrides"
    ADD CONSTRAINT "astrologer_commission_overrides_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_payout_accounts"
    ADD CONSTRAINT "astrologer_payout_accounts_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."astrologer_payout_accounts"
    ADD CONSTRAINT "astrologer_payout_accounts_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_astrologer_id_fkey" FOREIGN KEY ("astrologer_id") REFERENCES "public"."astrologers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_payout_account_id_fkey" FOREIGN KEY ("payout_account_id") REFERENCES "public"."astrologer_payout_accounts"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."astrologer_withdrawal_requests"
    ADD CONSTRAINT "astrologer_withdrawal_requests_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "auth"."users"("id");



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



ALTER TABLE ONLY "public"."kundli_matching_reports"
    ADD CONSTRAINT "kundli_matching_reports_boy_profile_id_fkey" FOREIGN KEY ("boy_profile_id") REFERENCES "public"."kundli_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kundli_matching_reports"
    ADD CONSTRAINT "kundli_matching_reports_girl_profile_id_fkey" FOREIGN KEY ("girl_profile_id") REFERENCES "public"."kundli_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."kundli_matching_reports"
    ADD CONSTRAINT "kundli_matching_reports_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



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



CREATE POLICY "Admins can view all payout accounts" ON "public"."astrologer_payout_accounts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."account_roles"
  WHERE (("account_roles"."user_id" = "auth"."uid"()) AND ("account_roles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view audit logs" ON "public"."admin_audit_logs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."account_roles"
  WHERE (("account_roles"."user_id" = "auth"."uid"()) AND ("account_roles"."role" = 'admin'::"text")))));



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



CREATE POLICY "Astrologers can view their own payout account" ON "public"."astrologer_payout_accounts" FOR SELECT TO "authenticated" USING (("astrologer_id" IN ( SELECT "astrologers"."id"
   FROM "public"."astrologers"
  WHERE ("astrologers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Create own astrologer application draft" ON "public"."astrologer_applications" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'draft'::"text") AND ("rejection_reason" IS NULL) AND ("reviewed_at" IS NULL)));



CREATE POLICY "Create own support request" ON "public"."support_requests" FOR INSERT TO "authenticated" WITH CHECK (((( SELECT "auth"."uid"() AS "uid") = "user_id") AND ("status" = 'open'::"text")));



CREATE POLICY "Delete devices" ON "public"."user_devices" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Delete kundli_profiles" ON "public"."kundli_profiles" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Delete matching reports" ON "public"."kundli_matching_reports" FOR DELETE USING (("auth"."uid"() = "owner_id"));



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



CREATE POLICY "Select billing ledger" ON "public"."astrologer_billing_ledger" FOR SELECT USING (("astrologer_id" IN ( SELECT "astrologers"."id"
   FROM "public"."astrologers"
  WHERE ("astrologers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Select devices" ON "public"."user_devices" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Select kundli_profiles" ON "public"."kundli_profiles" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Select kundli_reports" ON "public"."kundli_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."kundli_profiles"
  WHERE (("kundli_profiles"."id" = "kundli_reports"."profile_id") AND ("kundli_profiles"."owner_id" = "auth"."uid"())))));



CREATE POLICY "Select matching reports" ON "public"."kundli_matching_reports" FOR SELECT USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "Select own consultation billing entries" ON "public"."consultation_billing_entries" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Select own withdrawal requests" ON "public"."astrologer_withdrawal_requests" FOR SELECT USING (("astrologer_id" IN ( SELECT "astrologers"."id"
   FROM "public"."astrologers"
  WHERE ("astrologers"."user_id" = "auth"."uid"()))));



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


ALTER TABLE "public"."admin_audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_billing_ledger" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_commission_overrides" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_payout_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologer_withdrawal_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."astrologers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_rules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_astrologer_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_billing_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."consultation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."kundli_matching_reports" ENABLE ROW LEVEL SECURITY;


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



REVOKE ALL ON FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_adjust_wallet"("p_user_email" "text", "p_amount" numeric, "p_title" "text", "p_description" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_approve_withdrawal"("p_withdrawal_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_failed"("p_withdrawal_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_paid"("p_withdrawal_id" "uuid", "p_payout_reference" "text", "p_bank_reference" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_mark_withdrawal_processing"("p_withdrawal_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_reject_withdrawal"("p_withdrawal_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_verify_payout_account"("p_account_id" "uuid", "p_status" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_verify_payout_account"("p_account_id" "uuid", "p_status" "text", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_astrologer_application"("p_application_id" "uuid", "p_approved_price_per_minute" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_current_user_is_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_current_user_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."assert_current_user_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_current_user_is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bill_consultation_session"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_astrologer_withdrawable_balance"("p_astrologer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_astrologer_withdrawable_balance"("p_astrologer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_astrologer_withdrawable_balance"("p_astrologer_id" "uuid") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_astrologer_commission_override"("p_astrologer_id" "uuid") TO "service_role";



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



REVOKE ALL ON FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_astrologer_applications"("p_status" "text", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_astrologers"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_astrologers"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_astrologers"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_commission_overview"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_commission_overview"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_commission_overview"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_commission_overview"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_consultations"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_summary"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text", "p_granularity" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text", "p_granularity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text", "p_granularity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_dashboard_timeseries"("p_from" timestamp with time zone, "p_to" timestamp with time zone, "p_timezone" "text", "p_granularity" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_financial_alerts"("p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_payments"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_payments"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_payments"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_payments"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_payments_summary"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"("p_time_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"("p_time_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_payments_summary"("p_time_filter" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_admin_payout_accounts"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_payout_accounts"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_payout_accounts"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_users"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_users"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_users"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_users"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_wallet_summary"("p_time_filter" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_wallet_transactions"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_admin_withdrawals"("p_filters" "jsonb", "p_limit" integer, "p_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_astrologer_dashboard_summary"("p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_astrologer_dashboard_summary"("p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_astrologer_dashboard_summary"("p_timezone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_earnings_payout_summary"("p_timezone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_payment_statements"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_payment_statements"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_payment_statements"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_payment_statements"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_payout_account"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_payout_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_payout_account"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_my_withdrawal_requests"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_my_withdrawal_requests"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_withdrawal_requests"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_withdrawal_requests"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_pending_commission_ledger"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_pending_commission_ledger"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_pending_commission_ledger"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_commission_for_ledger"("p_ledger_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_pending_commissions"("p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_pending_commissions"("p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."process_pending_commissions"("p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_pending_commissions"("p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."process_razorpay_payment"("p_order_id" "uuid", "p_razorpay_payment_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text", "p_ref_type" "text", "p_ref_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recharge_wallet"("p_user_id" "uuid", "p_amount" numeric, "p_title" "text", "p_description" "text", "p_ref_type" "text", "p_ref_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_astrologer_application"("p_application_id" "uuid", "p_reason" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reject_astrologer_consultation"("p_session_id" "uuid", "p_astrologer_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."request_my_withdrawal"("p_amount" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_kundli_matching_report"("p_owner_id" "uuid", "p_idempotency_key" "text", "p_input_fingerprint" "text", "p_boy_snapshot" "jsonb", "p_girl_snapshot" "jsonb", "p_compatibility_result" "jsonb", "p_total_score" numeric, "p_boy_profile_id" "uuid", "p_boy_profile_usage" "text", "p_girl_profile_id" "uuid", "p_girl_profile_usage" "text", "p_create_boy_profile" "jsonb", "p_create_girl_profile" "jsonb", "p_provider" "text", "p_engine_version" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_kundli_matching_report"("p_owner_id" "uuid", "p_idempotency_key" "text", "p_input_fingerprint" "text", "p_boy_snapshot" "jsonb", "p_girl_snapshot" "jsonb", "p_compatibility_result" "jsonb", "p_total_score" numeric, "p_boy_profile_id" "uuid", "p_boy_profile_usage" "text", "p_girl_profile_id" "uuid", "p_girl_profile_usage" "text", "p_create_boy_profile" "jsonb", "p_create_girl_profile" "jsonb", "p_provider" "text", "p_engine_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."save_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_astrologer_commission_override"("p_astrologer_id" "uuid", "p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_consultation_customer_snapshot"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_consultation_customer_snapshot"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_global_commission_rule"("p_company_percentage" numeric, "p_astrologer_percentage" numeric, "p_effective_from" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_row_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."severity_rank"("p_severity" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."severity_rank"("p_severity" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."severity_rank"("p_severity" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_consultation_session"("p_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."start_welcome_chat"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_welcome_chat"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."submit_my_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."submit_my_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."submit_my_payout_account"("p_account_holder_name" "text", "p_bank_name" "text", "p_account_number" "text", "p_ifsc_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_astrologer_consultation_availability"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_astrologer_consultation_availability"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."sync_self_kundli_profile"("p_owner_id" "uuid", "p_name" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_birth_state" "text", "p_birth_district" "text", "p_birth_city" "text", "p_latitude" double precision, "p_longitude" double precision, "p_timezone" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."sync_self_kundli_profile"("p_owner_id" "uuid", "p_name" "text", "p_gender" "text", "p_dob" "date", "p_tob" time without time zone, "p_birth_state" "text", "p_birth_district" "text", "p_birth_city" "text", "p_latitude" double precision, "p_longitude" double precision, "p_timezone" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_astrologer_status"("p_astrologer_id" "uuid", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."transition_waiting_consultation"("p_session_id" "uuid", "p_target_status" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."account_roles" TO "service_role";
GRANT SELECT ON TABLE "public"."account_roles" TO "authenticated";



GRANT ALL ON TABLE "public"."admin_audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_applications" TO "service_role";
GRANT SELECT,INSERT,UPDATE ON TABLE "public"."astrologer_applications" TO "authenticated";



GRANT ALL ON TABLE "public"."astrologer_billing_ledger" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_billing_ledger" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_billing_ledger" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_commission_overrides" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_commission_overrides" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_commission_overrides" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_payout_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_payout_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."astrologer_withdrawal_requests" TO "anon";
GRANT ALL ON TABLE "public"."astrologer_withdrawal_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."astrologer_withdrawal_requests" TO "service_role";



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



GRANT ALL ON TABLE "public"."commission_rules" TO "anon";
GRANT ALL ON TABLE "public"."commission_rules" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_rules" TO "service_role";



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



GRANT ALL ON TABLE "public"."kundli_matching_reports" TO "anon";
GRANT ALL ON TABLE "public"."kundli_matching_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."kundli_matching_reports" TO "service_role";



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



































