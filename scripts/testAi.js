const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function testAi() {
  const env = fs.readFileSync('.env', 'utf8');
  const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
  const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
  const supabase = createClient(urlMatch[1], keyMatch[1]);
  
  // Get an existing user
  const { data: userRecord } = await supabase.from('profiles').select('id').limit(1).single();
  const userId = userRecord.id;

  // We need to simulate the auth token, or just mock the request
  // Let's call the API over HTTP if it's running, or we can just import the AI service.
  // Actually, since this project runs via `npm run dev`, it's easier to just fetch it locally.
  
  console.log('Got user id:', userId);
}

testAi();
