const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Just call without auth (anon key only)
  const result = await supabase.rpc('get_admin_users', { p_filters: {}, p_limit: 3, p_offset: 0 });
  console.log('get_admin_users (anon):', result.error ? `${result.error.code}: ${result.error.message}` : 'OK');
  
  const result2 = await supabase.rpc('get_admin_astrologers', { p_filters: {}, p_limit: 3, p_offset: 0 });
  console.log('get_admin_astrologers (anon):', result2.error ? `${result2.error.code}: ${result2.error.message}` : 'OK');
  
  const result3 = await supabase.rpc('get_admin_payments', { p_filters: {}, p_limit: 3, p_offset: 0 });
  console.log('get_admin_payments (anon):', result3.error ? `${result3.error.code}: ${result3.error.message}` : 'OK');
  
  const result4 = await supabase.rpc('get_admin_dashboard_timeseries', { 
    p_from: '2020-01-01T00:00:00Z', 
    p_to: '2030-01-01T00:00:00Z', 
    p_timezone: 'Asia/Kolkata', 
    p_granularity: 'month' 
  });
  console.log('get_admin_dashboard_timeseries (anon):', result4.error ? `${result4.error.code}: ${result4.error.message}` : 'OK - rows: ' + result4.data?.length);
}
test();
