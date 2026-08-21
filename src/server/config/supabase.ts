import { createClient } from '@supabase/supabase-js';
import { env } from './env';

// 1. Admin/Service Role Client (Strictly server-side for bypassing RLS & sensitive operations)
export const supabaseAdmin = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// 2. Helper to create an authenticated client on the fly using a user's JWT token
export const createAuthClient = (token: string) => {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

