const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setupAdmin() {
  const email = 'kunlinova@gmail.com';
  const password = 'kundlinova@123';
  
  console.log('1. Creating admin user in Supabase...');
  const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  
  let userId;
  if (userError) {
    if (userError.code === 'email_exists' || userError.message.includes('already exists')) {
      console.log('User already exists, finding ID...');
      const authClient = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      const { data: loginData, error: loginError } = await authClient.auth.signInWithPassword({ email, password });
      
      if (loginError) {
        console.error('Could not login as existing user. Did you change the password?');
        throw loginError;
      }
      
      if (loginData.user) {
        userId = loginData.user.id;
        console.log('Found user ID via login:', userId);
      } else {
        throw new Error('Failed to find existing user ID');
      }
    } else {
      throw userError;
    }
  } else {
    userId = user.user.id;
    console.log(`Created user: ${userId}`);
  }

  console.log('2. Creating profile (upsert)...');
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert([{ id: userId, name: 'Admin' }]);
  if (profileError) throw profileError;

  console.log('3. Assigning admin role...');
  await supabaseAdmin.from('account_roles').delete().eq('user_id', userId);
  const { error: roleError } = await supabaseAdmin
    .from('account_roles')
    .insert([{ user_id: userId, role: 'admin' }]);
    
  if (roleError) throw roleError;
  
  console.log('Setup complete! Real authentication is ready.');
}

setupAdmin().catch(console.error);
