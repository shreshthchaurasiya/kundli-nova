import { supabase } from '../../lib/supabase';

export type EmailAuthError = {
  code: 'LOGIN_FAILED' | 'SIGNUP_FAILED' | 'RESET_FAILED' | 'UPDATE_FAILED';
  message: string;
};

export async function signInWithEmail(email: string, password: string): Promise<{ error: EmailAuthError | null }> {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: {
        code: 'LOGIN_FAILED',
        message: error.message || 'Invalid email or password.',
      }
    };
  }

  return { error: null };
}

export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<{ error: EmailAuthError | null, needsVerification: boolean }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        name: fullName
      }
    }
  });

  if (error) {
    return {
      error: {
        code: 'SIGNUP_FAILED',
        message: error.message || 'Failed to create account.',
      },
      needsVerification: false
    };
  }

  // If session is null, email confirmation might be required
  return { error: null, needsVerification: !data.session };
}

export async function resetPasswordForEmail(email: string): Promise<{ error: EmailAuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Optionally redirect back to app after reset: redirectTo: window.location.origin
  });

  if (error) {
    return {
      error: {
        code: 'RESET_FAILED',
        message: error.message || 'Failed to send reset link.',
      }
    };
  }

  return { error: null };
}
