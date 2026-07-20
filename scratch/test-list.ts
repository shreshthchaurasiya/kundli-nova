import { createClient } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import "dotenv/config";

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const email = `test.${randomBytes(4).toString('hex')}@example.com`;
  const password = 'Password123!';

  // Create user
  const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  });
  if (adminError) throw adminError;
  const userId = adminData.user.id;

  try {
    await supabaseAdmin.from('profiles').insert({ id: userId, name: 'Test User' });
    
    // add balance
    await supabaseAdmin.from('wallets').insert({ user_id: userId, balance: 500 });

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) throw authError;

    const token = authData.session!.access_token;
    
    let res = await fetch("http://localhost:5173/api/v1/consultations", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ astrologerId: "11111111-1111-1111-1111-111111111111" })
    });
    console.log(`POST Create: ${res.status} ${await res.text()}`);

    res = await fetch("http://localhost:5173/api/v1/consultations", {
      headers: { "Authorization": `Bearer ${token}` }
    });
    console.log(`GET List: ${res.status} ${await res.text()}`);

  } finally {
    await supabaseAdmin.auth.admin.deleteUser(userId);
  }
}

run().catch(console.error);
