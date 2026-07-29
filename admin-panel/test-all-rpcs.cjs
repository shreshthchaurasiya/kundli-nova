const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const from = '2020-01-01T00:00:00Z';
  const to = '2030-01-01T00:00:00Z';

  const tests = [
    ['get_admin_dashboard_summary', { p_from: from, p_to: to, p_timezone: 'Asia/Kolkata' }],
    ['get_admin_dashboard_timeseries', { p_from: from, p_to: to, p_timezone: 'Asia/Kolkata', p_granularity: 'month' }],
    ['get_admin_users', { p_filters: {}, p_limit: 3, p_offset: 0 }],
    ['get_admin_astrologers', { p_filters: {}, p_limit: 3, p_offset: 0 }],
    ['get_admin_payments', { p_filters: {}, p_limit: 3, p_offset: 0 }],
    ['get_admin_payments_summary', { p_time_filter: 'lifetime' }],
  ];

  console.log('\n===== RPC STATUS CHECK =====');
  let allOk = true;
  for (const [name, args] of tests) {
    const result = await supabase.rpc(name, args);
    const status = result.error ? `❌ FAIL: ${result.error.message}` : `✅ OK`;
    console.log(`${name}: ${status}`);
    if (result.error) allOk = false;
  }
  console.log('============================');
  console.log(allOk ? '\n✅ ALL RPCS WORKING!' : '\n❌ SOME RPCS FAILING');
}
test().catch(console.error);
