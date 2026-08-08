const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: roles, error } = await supabaseAdmin.from('account_roles').select('*').eq('role', 'admin');
  if (error) throw error;
  console.log('Admins:', roles);
}

check().catch(console.error);
