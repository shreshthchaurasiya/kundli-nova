import { supabase } from '../../lib/supabase';

export async function signInWithOAuth(provider: 'google' | 'apple') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin
    }
  });

  if (error) {
    console.error(`OAuth ${provider} error:`, error);
  }
}
