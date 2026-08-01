require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await sb.auth.signInWithPassword({
    email: 'gyantrackerf@gmail.com',
    password: 'password123'
  });
  if (error) return console.log('Login failed:', error.message);
  
  const token = data.session.access_token;
  
  const axios = require('axios');
  try {
    const res = await axios.post('http://localhost:5173/api/chat', {
      messages: [{ sender: 'user', text: 'what is my dob?' }],
      profileId: '4ec9ff31-e10d-42e1-9b34-7b1c1bf5a525'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('AI Response:', res.data);
    const fs = require('fs');
    if (fs.existsSync('/tmp/latest_prompt.txt')) {
      console.log('--- PROMPT ---');
      console.log(fs.readFileSync('/tmp/latest_prompt.txt', 'utf8'));
    }
  } catch (err) {
    console.log('API Error:', err.response ? err.response.data : err.message);
  }
}
run();
