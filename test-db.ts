import { supabaseAdmin } from './src/server/config/supabase';

async function test() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('email')
    .limit(1);

  console.log('Data:', data);
  console.log('Error:', error);
}

test();
