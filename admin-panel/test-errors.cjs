const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

// Use admin user's JWT by first logging in  
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const adminSupabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  // Get admin user via service role to figure out who is admin
  const { data: users } = await adminSupabase.auth.admin.listUsers();
  console.log('Total users:', users?.users?.length);
  
  // Check user_metadata for admin flag
  const admins = users?.users?.filter(u => u.user_metadata?.is_admin === true || u.app_metadata?.is_admin === true);
  console.log('Admins found:', admins?.map(u => ({email: u.email, phone: u.phone, meta: u.user_metadata, app_meta: u.app_metadata})));
  
  // Check admin table
  const { data: adminData } = await adminSupabase.from('admin_users').select('*').limit(5);
  console.log('admin_users table:', adminData);
}
test().catch(e => console.error('Error:', e.message));
