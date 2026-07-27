import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data: cols, error } = await supabase.from('astrologer_dashboard_sessions').select('*').limit(1);
  console.log("Cols:", error ? error.message : (cols && cols.length > 0 ? Object.keys(cols[0]) : "No rows found"));
}
checkSchema();
