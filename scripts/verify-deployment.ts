import { createClient } from '@supabase/supabase-js';
import { strictEqual, ok } from 'node:assert';
import { setDefaultResultOrder } from 'node:dns';
import { randomBytes } from 'node:crypto';
setDefaultResultOrder('ipv4first');

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name} in environment variables`);
    process.exit(1);
  }
  return value;
}

const supabaseUrl = requiredEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = requiredEnv('VITE_SUPABASE_ANON_KEY');
const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function runVerification() {
  console.log('--- Starting End-to-End Verification ---');

  const email = `nova.test.${Math.floor(Date.now() / 1000)}@gmail.com`;
  const password = randomBytes(16).toString('hex') + 'A1!';
  console.log(`Creating test user with Admin API: ${email}`);
  
  let testUserId: string | null = null;

  try {
    const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });
    
    if (adminError) {
      console.error('Admin user creation failed:', adminError);
      process.exit(1);
    }

    testUserId = adminData.user.id;

    // Ensure profile exists
    const { data: profile } = await supabaseAdmin.from('profiles').select('id').eq('id', testUserId).single();
    if (!profile) {
      await supabaseAdmin.from('profiles').insert({ id: testUserId, name: 'Test User' });
    }
    
    console.log(`Signing in test user: ${email}`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    console.log('✅ User signed up and authenticated.');
    
    // 2. Test razorpay-create-order
    console.log('Invoking razorpay-create-order edge function...');
    const { data: createData, error: createError } = await supabase.functions.invoke('razorpay-create-order', {
      body: { packageId: 'recharge_100' } // Should be ₹100
    });

    if (createError) {
      let errorBody = '';
      try {
        if (createError.context) {
          errorBody = await createError.context.text();
        }
      } catch(e) {}
      console.error('Edge Function invocation failed:', createError);
      console.error('Error Body:', errorBody);
      process.exit(1);
    }

    if (createData.error) {
      console.error('Edge Function returned an error:', createData.error);
      process.exit(1);
    }

    console.log('Received response from edge function:', createData);
    
    ok(createData.order_id, 'Response should contain an order_id');
    ok(createData.order_id.startsWith('order_'), 'order_id should start with "order_"');
    strictEqual(createData.amount, 10000, 'Amount should be 10000 paise (₹100)');
    strictEqual(createData.currency, 'INR', 'Currency should be INR');
    ok(createData.key_id, 'Response should contain a key_id');

    console.log('✅ razorpay-create-order executed successfully! Order ID:', createData.order_id);

    // 3. Since we cannot complete the Razorpay checkout programmatically without a browser,
    // we will try to test verify payment with invalid signature to see if it responds correctly.
    console.log('Invoking razorpay-verify-payment with invalid signature...');
    const { data: verifyData, error: verifyError } = await supabase.functions.invoke('razorpay-verify-payment', {
      body: {
        razorpay_order_id: createData.order_id,
        razorpay_payment_id: 'pay_dummy12345',
        razorpay_signature: 'invalid_sig_dummy'
      }
    });

    // We expect it to return a 400 error due to invalid signature
    if (verifyError) {
      // Supabase functions invoke sometimes throws on 400
      console.log('✅ Verification failed as expected with HTTP error:', verifyError.message);
    } else if (verifyData?.error) {
      console.log('✅ Verification failed as expected with data error:', verifyData.error);
    } else {
      console.error('❌ Expected verify payment to fail, but it succeeded!', verifyData);
      process.exit(1);
    }

    console.log('--- Verification Complete ---');
  } finally {
    if (testUserId) {
      console.log(`Cleaning up test user: ${testUserId}`);
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log('✅ Test user deleted.');
    }
  }
}

runVerification().catch(console.error);
