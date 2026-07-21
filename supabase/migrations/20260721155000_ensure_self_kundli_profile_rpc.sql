-- Migration: Add canonical self Kundli profile RPC
-- Timestamp: 20260721155000
--
-- Changes:
--   1. Preflight check: abort if duplicate (owner_id, relation='self') rows exist
--   2. Partial unique index: enforce one self profile per owner at DB level
--   3. ensure_self_kundli_profile() RPC: atomic, idempotent, SECURITY DEFINER
--      Uses pg_advisory_xact_lock to eliminate INSERT race conditions.
--      Derives user identity from auth.uid() — never trusts client input.

-- ── 1. Preflight: abort if any owner already has duplicate self profiles ───────
DO $$
DECLARE
  v_dup_count integer;
BEGIN
  SELECT COUNT(*)
  INTO   v_dup_count
  FROM (
    SELECT owner_id
    FROM   public.kundli_profiles
    WHERE  relation = 'self'
    GROUP  BY owner_id
    HAVING COUNT(*) > 1
  ) AS dupes;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION
      'Migration aborted: % owner(s) have duplicate self kundli_profiles rows. '
      'Resolve duplicates manually before applying this migration.',
      v_dup_count;
  END IF;
END;
$$;

-- ── 2. Partial unique index: one self profile per owner ────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS uidx_kundli_profiles_owner_self
  ON public.kundli_profiles(owner_id)
  WHERE relation = 'self';

-- ── 3. RPC: ensure_self_kundli_profile ────────────────────────────────────────
--
-- Authentication: called via authenticated user JWT (createAuthClient),
--   so auth.uid() correctly resolves to the customer's UUID.
--
-- Concurrency: pg_advisory_xact_lock(hashtext(owner_id::text || ':self-kundli'))
--   serialises concurrent calls for the same user within the transaction.
--   The partial unique index acts as a second-layer guard against unique violations.
--
-- Idempotency: if a self profile already exists, it is returned unchanged.
--   User edits made after initial creation are never overwritten.
--
-- Returns jsonb:
--   { profile: <kundli_profiles row | null>, reason: 'CREATED'|'EXISTING'|'INCOMPLETE_BIRTH_DETAILS' }

CREATE OR REPLACE FUNCTION public.ensure_self_kundli_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

-- Restrict execution: only authenticated users may call this function.
-- auth.uid() is populated from their JWT when called via createAuthClient.
REVOKE EXECUTE ON FUNCTION public.ensure_self_kundli_profile() FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.ensure_self_kundli_profile() TO authenticated;
