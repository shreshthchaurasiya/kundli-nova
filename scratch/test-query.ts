import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  const { data, error } = await supabaseAdmin
    .from('consultation_sessions')
    .select('*')
    .order('requested_at', { ascending: false })
    .limit(10);
    
  if (error) {
    console.log(`Error:`, error);
  } else {
    console.log(`Total sessions in DB: ${data.length}`);
    if (data.length > 0) console.log(data);
  }
}
run();
