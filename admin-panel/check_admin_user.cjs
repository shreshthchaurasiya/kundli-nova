const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) throw error;
  
  const admin = users.users.find(u => u.email === 'kunlinova@gmail.com');
  if (admin) {
    console.log('User exists! ID:', admin.id);
    
    // Check if they have the admin role
    const { data: role } = await supabaseAdmin
      .from('account_roles')
      .select('*')
      .eq('user_id', admin.id)
      .single();
      
    console.log('Role:', role);
  } else {
    console.log('User DOES NOT exist in auth.users!');
  }
}

check().catch(console.error);
