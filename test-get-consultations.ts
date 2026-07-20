import { createClient } from '@supabase/supabase-js';
import "dotenv/config";

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  if (!users || users.users.length === 0) {
    console.log("No users found");
    return;
  }
  
  const user = users.users[0];
  console.log("User:", user.id);

  // Since we don't have user password, we can generate a short lived token?
  // Or just call the API... 
  // Let's check why GET /api/v1/consultations is failing.
}
run();
