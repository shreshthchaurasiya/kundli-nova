const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // Check profiles columns
  const p = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles columns:", p.data ? Object.keys(p.data[0] || {}) : p.error?.message);
  
  // Check consultation_sessions columns
  const cs = await supabase.from('consultation_sessions').select('*').limit(1);
  console.log("consultation_sessions columns:", cs.data ? Object.keys(cs.data[0] || {}) : cs.error?.message);
  
  // Check payment_orders columns
  const po = await supabase.from('payment_orders').select('*').limit(1);
  console.log("payment_orders columns:", po.data ? Object.keys(po.data[0] || {}) : po.error?.message);
  
  // Check wallet_transactions columns
  const wt = await supabase.from('wallet_transactions').select('*').limit(1);
  console.log("wallet_transactions columns:", wt.data ? Object.keys(wt.data[0] || {}) : wt.error?.message);
  
  // Check astrologer_billing_ledger columns
  const bl = await supabase.from('astrologer_billing_ledger').select('*').limit(1);
  console.log("astrologer_billing_ledger columns:", bl.data ? Object.keys(bl.data[0] || {}) : bl.error?.message);

  // Check astrologers columns
  const a = await supabase.from('astrologers').select('*').limit(1);
  console.log("astrologers columns:", a.data ? Object.keys(a.data[0] || {}) : a.error?.message);
}
test();
