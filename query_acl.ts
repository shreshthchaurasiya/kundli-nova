import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function check() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT proname, proacl FROM pg_proc WHERE proname = 'get_admin_dashboard_summary'"
  });
  console.log(data, error);
}
check();
