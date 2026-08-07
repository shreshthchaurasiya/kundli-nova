/**
 * Phone Authentication Service for Kundli Nova.
 *
 * Development configuration:
 *   VITE_AUTH_MODE=development
 *   VITE_TEST_PHONE_NUMBER=+919999999999
 *   (Test OTP: 123456 — configured in Supabase Dashboard → Auth → Phone → Test numbers)
 *
 * IMPORTANT:
 *   - Test OTP is ONLY valid for the phone number configured in VITE_TEST_PHONE_NUMBER.
 *   - This is enforced server-side by Supabase — we do not fake the auth session.
 *   - Remove VITE_AUTH_MODE=development and the test number before production.
 */

import { supabase } from '../../lib/supabase';

export type PhoneAuthError = {
  code: 'INVALID_PHONE' | 'SEND_OTP_FAILED' | 'VERIFY_OTP_FAILED' | 'SIGN_OUT_FAILED';
  message: string;
};

/**
 * Validates and normalizes an Indian mobile number.
 * Accepts exactly 10 digits and returns +91XXXXXXXXXX.
 */
export function normalizeIndianPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length !== 10) return null;
  // Indian mobile numbers start with 6-9
  if (!/^[6-9]/.test(digits)) return null;
  return `+91${digits}`;
}

/**
 * Sends an OTP to the given normalized phone number via Supabase.
 * In development mode, bypasses real SMS and allows ANY number.
 */
export async function sendOtp(phone: string): Promise<{ error: PhoneAuthError | null }> {


  const { error } = await supabase.auth.signInWithOtp({ phone });

  if (error) {
    return {
      error: {
        code: 'SEND_OTP_FAILED',
        message: error.message || 'Failed to send OTP. Please try again.',
      },
    };
  }

  return { error: null };
}

/**
 * Verifies the OTP entered by the user against the phone number.
 * On success, Supabase creates a real JWT session.
 */
export async function verifyOtp(
  phone: string,
  token: string,
): Promise<{ error: PhoneAuthError | null }> {


  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });

  if (error) {
    return {
      error: {
        code: 'VERIFY_OTP_FAILED',
        message: error.message || 'Incorrect OTP. Please try again.',
      },
    };
  }

  return { error: null };
}

/**
 * Signs the current user out and clears the Supabase session.
 */
export async function signOut(): Promise<{ error: PhoneAuthError | null }> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    return {
      error: { code: 'SIGN_OUT_FAILED', message: error.message || 'Sign out failed.' },
    };
  }
  return { error: null };
}
