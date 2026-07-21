import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
  const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  // login
  const email = `shreshthchaurasiya@example.com`; // or any dummy user
  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: 'password123',
    email_confirm: true
  });
  
  const { data: sessionData, error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: 'password123'
  });
  
  if (loginError) {
    console.log('login error:', loginError);
    return;
  }
  
  const token = sessionData.session.access_token;
  
  console.log('Calling GET http://localhost:5173/api/v1/kundli-profiles');
  const res1 = await fetch('http://localhost:5173/api/v1/kundli-profiles', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text1 = await res1.text();
  console.log('GET Response:', res1.status, text1);
  
  console.log('\nCalling POST http://localhost:5173/api/v1/kundli-profiles/sync-self');
  const res2 = await fetch('http://localhost:5173/api/v1/kundli-profiles/sync-self', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const text2 = await res2.text();
  console.log('POST Response:', res2.status, text2);
  
  // Cleanup
  await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
}
run();
