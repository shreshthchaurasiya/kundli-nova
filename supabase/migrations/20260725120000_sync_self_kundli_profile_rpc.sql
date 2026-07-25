-- Migration: sync_self_kundli_profile RPC
-- Timestamp: 20260725120000
--
-- Purpose:
--   Called from the backend (supabaseAdmin, server-side trusted code) whenever
--   the authenticated user edits their account profile. Atomically updates the
--   profiles row and the kundli_profiles self row within a single PG transaction.
--
-- Design:
--   • Accepts pre-geocoded coordinates so geocoding happens BEFORE the transaction.
--   • Uses an advisory lock to serialise concurrent calls for the same user.
--   • Enforces the one-self-row invariant: errors on >1, inserts if 0, updates if 1.
--   • Never touches partner/friend rows.
--   • Runs as SECURITY DEFINER so it operates with elevated table access, but
--     accepts p_owner_id from trusted backend code (supabaseAdmin), NOT from
--     client JWT. This is intentional: the profile controller validates the JWT
--     before calling, then passes the confirmed userId as p_owner_id.
--   • Returns jsonb: { self_profile_id: uuid, reason: 'UPDATED'|'CREATED' }
--
-- Pre-conditions:
--   • uidx_kundli_profiles_owner_self already exists (created in 20260721155000)
--   • No duplicate self rows exist (enforced by that index)

CREATE OR REPLACE FUNCTION public.sync_self_kundli_profile(
  p_owner_id       uuid,
  p_name           text,
  p_gender         text,
  p_dob            date,
  p_tob            time without time zone,
  p_birth_state    text,
  p_birth_district text,
  p_birth_city     text,
  p_latitude       double precision,
  p_longitude      double precision,
  p_timezone       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Only the service role (backend) may call this function.
-- It is NOT granted to authenticated or anon — this is intentional:
-- the backend validates the JWT and passes p_owner_id from the confirmed userId.
REVOKE EXECUTE ON FUNCTION public.sync_self_kundli_profile(
  uuid, text, text, date, time without time zone,
  text, text, text, double precision, double precision, text
) FROM public, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_self_kundli_profile(
  uuid, text, text, date, time without time zone,
  text, text, text, double precision, double precision, text
) TO service_role;
