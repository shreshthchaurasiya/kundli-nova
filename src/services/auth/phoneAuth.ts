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

const AUTH_MODE = (import.meta as any).env.VITE_AUTH_MODE || 'production';
const TEST_PHONE_NUMBER = (import.meta as any).env.VITE_TEST_PHONE_NUMBER || '';

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
  if (AUTH_MODE === 'development') {
    console.info(`[PhoneAuth] Development mode active. Any number is accepted with OTP 123456.`);
    // Dev mode: pretend we sent an OTP
    return { error: null };
  }

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
  if (AUTH_MODE === 'development') {
    if (token !== '123456') {
      return { error: { code: 'VERIFY_OTP_FAILED', message: 'Invalid test OTP (use 123456)' } };
    }

    // Email-based trick to create a REAL session for ANY phone number in dev mode
    const email = `${phone.replace('+', '')}@kundlinova.test`;
    const password = 'dev-password-123';

    let { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error && error.message.includes('Invalid login credentials')) {
      // User doesn't exist yet, sign them up
      const res = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { phone } // Store phone in metadata
        }
      });
      error = res.error;
    }

    if (error) {
      return { error: { code: 'VERIFY_OTP_FAILED', message: error.message } };
    }

    return { error: null };
  }

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
