import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const { data, error } = await supabaseAdmin
    .from('kundli_profiles')
    .select('*')
    .limit(1);
    
  console.log('Query Error:', error);
}
run();
