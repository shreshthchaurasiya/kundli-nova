import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function test() {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const realId = users.users[0].id;
  
  console.log('Testing upsert with real id...', realId);
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id: realId,
        name: 'Ashim Jedia',
        gender: 'Male',
        dob: '1995-07-30',
        tob: '20:45:00',
        birth_state: 'Delhi',
        birth_district: 'delhi',
        birth_city: 'delhi'
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    console.error('Upsert failed:', error);
  } else {
    console.log('Upsert succeeded:', data);
  }
}

test();
