const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceKey);
const supabaseClient = createClient(supabaseUrl, anonKey);

async function test() {
  console.log('1. Creating test admin user...');
  const email = `admin_test_${Date.now()}@example.com`;
  const password = 'Password123!';
  
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  if (userError) throw userError;
  const userId = user.user.id;
  console.log(`Created user: ${userId}`);

  console.log('1.5 Creating profile...');
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{ id: userId, name: 'Admin Test' }]);
  if (profileError) throw profileError;

  console.log('2. Assigning admin role...');
  const { error: roleError } = await supabaseAdmin
    .from('account_roles')
    .insert([{ user_id: userId, role: 'admin' }]);
    
  if (roleError) throw roleError;

  console.log('3. Logging in as admin...');
  const { data: session, error: loginError } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });
  
  if (loginError) throw loginError;
  console.log('Logged in successfully!');

  console.log('4. Testing RPC...');
  const from = '2020-01-01T00:00:00Z';
  const to = '2030-01-01T00:00:00Z';

  const { data, error } = await supabaseClient.rpc('get_admin_dashboard_summary', {
    p_from: from,
    p_to: to,
    p_timezone: 'Asia/Kolkata'
  });
  
  console.log('RPC Result:', { data, error });

  console.log('5. Cleanup...');
  await supabaseAdmin.auth.admin.deleteUser(userId);
  console.log('Done.');
}

test().catch(console.error);
