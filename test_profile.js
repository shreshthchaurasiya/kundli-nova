require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('kundli_profiles').select('*').eq('name', 'Shreshth');
  console.log(JSON.stringify(data, null, 2));
}
run();
