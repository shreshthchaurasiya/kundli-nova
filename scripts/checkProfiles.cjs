require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: users } = await sb.from('profiles').select('*').in('id', ['6e013c14-e75e-45a6-a11e-7a45e5423670', '68ad3172-7a00-43bc-b21b-816d641a14bb']);
  console.log("Profiles (users):", JSON.stringify(users, null, 2));
  
  const { data: kundliProfiles } = await sb.from('kundli_profiles').select('*').in('owner_id', ['6e013c14-e75e-45a6-a11e-7a45e5423670', '68ad3172-7a00-43bc-b21b-816d641a14bb']);
  console.log("Kundli Profiles:", JSON.stringify(kundliProfiles, null, 2));
}
run();
