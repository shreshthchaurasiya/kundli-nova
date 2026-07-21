import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // create a dummy user
  const email = `test-${Date.now()}@example.com`;
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  });
  
  if (createError) {
    console.log('failed to create user', createError);
    return;
  }
  
  // login
  const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  
  if (loginError) {
    console.log('failed to login', loginError);
    return;
  }
  
  const token = sessionData.session.access_token;
  
  console.log('Calling POST http://localhost:3000/api/v1/kundli-profiles/sync-self');
  const res = await fetch('http://localhost:3000/api/v1/kundli-profiles/sync-self', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const text = await res.text();
  console.log('Response:', res.status, text);
  
  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
}
run();
