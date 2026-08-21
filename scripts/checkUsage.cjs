require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const today = new Date().toISOString().split('T')[0];
  // Check all AI usage today
  const { data, error } = await sb.from('ai_usage').select('*').eq('usage_date', today);
  console.log("AI Usage today:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
  
  // Check subscription plans
  const { data: plans } = await sb.from('subscription_plans').select('name, ai_limit_per_day, is_active');
  console.log("\nSubscription Plans:", JSON.stringify(plans, null, 2));
  
  // Check kundli profiles
  const { data: profiles } = await sb.from('kundli_profiles').select('id, name, owner_id, is_default, dob').limit(10);
  console.log("\nKundli Profiles:", JSON.stringify(profiles, null, 2));
}
run();
