const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
// use service role to bypass RLS
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const p = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles:", p.data ? Object.keys(p.data[0] || {}) : p.error?.message);
  
  const cs = await supabase.from('consultation_sessions').select('*').limit(1);
  console.log("consultation_sessions:", cs.data ? Object.keys(cs.data[0] || {}) : cs.error?.message);
  
  const po = await supabase.from('payment_orders').select('*').limit(1);
  console.log("payment_orders:", po.data ? Object.keys(po.data[0] || {}) : po.error?.message);
  
  const wt = await supabase.from('wallet_transactions').select('*').limit(1);
  console.log("wallet_transactions:", wt.data ? Object.keys(wt.data[0] || {}) : wt.error?.message);
  
  const bl = await supabase.from('astrologer_billing_ledger').select('*').limit(1);
  console.log("astrologer_billing_ledger:", bl.data ? Object.keys(bl.data[0] || {}) : bl.error?.message);
}
test();
