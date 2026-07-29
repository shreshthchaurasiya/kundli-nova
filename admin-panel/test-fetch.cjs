const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log(await supabase.from('wallet_transactions').select('*').limit(1));
  console.log(await supabase.from('payment_orders').select('*').limit(1));
}
test();
