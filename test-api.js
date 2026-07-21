import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  // Get any user
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({ perPage: 1 });
  if (authError || !users.length) {
    console.error('No users found', authError);
    return;
  }
  const user = users[0];
  
  // We can't easily generate a JWT without signing it, but wait, the Supabase Admin API can generate a link or we can sign in.
  // Actually, we can just hit the RPC directly via supabase-js using the service role key just to see if it exists!
  const { data, error } = await supabase.rpc('ensure_self_kundli_profile');
  console.log('RPC Response:', { data, error });
}
run();
