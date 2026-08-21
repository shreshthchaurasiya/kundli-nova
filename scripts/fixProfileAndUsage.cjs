require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const shreshthUserId = '6e013c14-e75e-45a6-a11e-7a45e5423670';
  const today = new Date().toISOString().split('T')[0];
  
  // Fix 1: Reset today's AI usage for Shreshth's account
  const { error: usageError } = await sb.from('ai_usage')
    .update({ questions_used: 0 })
    .eq('user_id', shreshthUserId)
    .eq('usage_date', today);
  console.log("Usage reset:", usageError || "SUCCESS");
  
  // Fix 2: Set Shreshth Chaurasiya as default profile
  const shreshthProfileId = '4ec9ff31-e10d-42e1-9b34-7b1c1bf5a525';
  const { error: profileError } = await sb.from('kundli_profiles')
    .update({ is_default: true })
    .eq('id', shreshthProfileId);
  console.log("Profile set as default:", profileError || "SUCCESS");
  
  // Also fix other user (68ad3172) - set their Shreshth profile as default
  const otherUserId = '68ad3172-7a00-43bc-b21b-816d641a14bb';
  const { error: otherUsageError } = await sb.from('ai_usage')
    .update({ questions_used: 0 })
    .eq('user_id', otherUserId)
    .eq('usage_date', today);
  console.log("Other user usage reset:", otherUsageError || "SUCCESS");
  
  const otherProfileId = 'b57a127f-6f75-4969-a809-0484f6830249';
  const { error: otherProfileError } = await sb.from('kundli_profiles')
    .update({ is_default: true })
    .eq('id', otherProfileId);
  console.log("Other profile set as default:", otherProfileError || "SUCCESS");
  
  console.log("\n✅ Done! Both users' usage reset to 0 and default profiles set.");
}
run();

// Run this separately to increase FREE limit for testing
async function increaseLimit() {
  const sb2 = require('@supabase/supabase-js').createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await sb2.from('subscription_plans')
    .update({ ai_limit_per_day: 50 })
    .eq('name', 'FREE');
  console.log("FREE plan limit updated to 50:", error || "SUCCESS");
}
increaseLimit();
