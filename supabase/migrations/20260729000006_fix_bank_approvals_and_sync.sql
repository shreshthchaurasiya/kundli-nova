-- Make payout accounts save directly as VERIFIED, allow updates anytime
CREATE OR REPLACE FUNCTION public.save_payout_account(
  p_account_holder_name text,
  p_bank_name text,
  p_account_number text,
  p_ifsc_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

-- Also update `approve_astrologer_application` to move application bank details to `astrologer_payout_accounts` if present
CREATE OR REPLACE FUNCTION public.approve_astrologer_application(p_application_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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
