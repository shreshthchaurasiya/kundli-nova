import { createClient } from '@supabase/supabase-js';

const isProcessDefined = typeof process !== 'undefined';
const envSupabaseUrl = isProcessDefined ? process.env.VITE_SUPABASE_URL : '';
const envSupabaseAnonKey = isProcessDefined ? process.env.VITE_SUPABASE_ANON_KEY : '';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || envSupabaseUrl || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || envSupabaseAnonKey || '';

if (!supabaseUrl || !supabaseAnonKey) {
  // In test environments env vars may not be present — warn but don't crash
  if (isProcessDefined && process.env.NODE_ENV !== 'test') {
    console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
  }
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
