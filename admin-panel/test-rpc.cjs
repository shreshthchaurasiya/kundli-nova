const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const { data, error } = await supabase.rpc('get_admin_dashboard_summary', {
    p_from: new Date('2020-01-01').toISOString(),
    p_to: new Date('2030-01-01').toISOString(),
    p_timezone: 'Asia/Kolkata'
  });
  console.log("With args:");
  console.log(data);
  console.log(error);

  const { data: d2, error: e2 } = await supabase.rpc('get_admin_dashboard_summary');
  console.log("Without args:");
  console.log(d2);
  console.log(e2);
}
test();
