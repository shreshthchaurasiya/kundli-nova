import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data: users, error: err1 } = await supabaseAdmin.auth.admin.listUsers();
  console.log('Users count:', users?.users?.length);
  
  const { data: profiles, error: err2 } = await supabaseAdmin.from('profiles').select('id');
  console.log('Profiles count:', profiles?.length);
  
  // Find users without a profile
  const profileIds = new Set(profiles?.map(p => p.id));
  const missingProfiles = users?.users?.filter(u => !profileIds.has(u.id));
  console.log('Users without profile:', missingProfiles?.length);
}
run();
