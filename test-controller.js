import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Let's just run the exact query that listKundliProfiles runs, but with a dummy user.
async function run() {
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const userId = '11111111-1111-1111-1111-111111111111';
  const { data, error } = await supabaseAdmin
      .from('kundli_profiles')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false });
      
  console.log('Query result:', { data, error });
}
run();
