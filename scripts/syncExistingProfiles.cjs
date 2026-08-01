require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error: userError } = await sb.from('profiles').select('*');
  if (userError) return console.error(userError);
  
  for (const user of users) {
    const { error: syncError } = await sb.from('kundli_profiles')
      .update({
        name: user.name,
        gender: user.gender,
        dob: user.dob,
        tob: user.tob,
        birth_state: user.birth_state,
        birth_district: user.birth_district,
        birth_city: user.birth_city
      })
      .eq('owner_id', user.id)
      .eq('relation', 'self');
      
    if (syncError) {
      console.log(`Failed to sync ${user.id}:`, syncError);
    } else {
      console.log(`Synced ${user.id} -> ${user.name}`);
    }
  }
}
run();
