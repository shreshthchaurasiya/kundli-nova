import { spawn } from 'node:child_process';
import { strictEqual, ok } from 'node:assert';

async function wait(ms = 1000) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, options: any, retries = 10): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err: any) {
      if (err.cause?.code === 'ECONNREFUSED' || err.code === 'ECONNREFUSED') {
        await wait(1000);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries reached');
}

async function runTests() {
  const env = { 
    ...process.env, 
    SUPABASE_URL: 'http://localhost:54321', 
    SUPABASE_ANON_KEY: 'dummy',
    SUPABASE_SERVICE_ROLE_KEY: 'dummy',
    RAZORPAY_WEBHOOK_SECRET: 'my_webhook_secret'
  };

  const createOrderP = spawn('/home/shreshthchaurasiya/.deno/bin/deno', ['run', '--allow-net', '--allow-env', 'supabase/functions/razorpay-create-order/index.ts'], { env, stdio: 'inherit' });
  await wait(2000); // let server start (port 8000 default)

  console.log('Testing razorpay-create-order');
  try {
    const res1 = await fetchWithRetry('http://localhost:8000', {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:5173' }
    });
    strictEqual(res1.status, 200);
    strictEqual(res1.headers.get('Access-Control-Allow-Origin'), 'http://localhost:5173');
    console.log('✅ CORS OPTIONS passed');

    const res2 = await fetchWithRetry('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId: 'recharge_100' })
    });
    strictEqual(res2.status, 400);
    const data2 = await res2.json();
    ok(data2.error.includes('Missing Authorization header'));
    console.log('✅ Missing JWT passed (handled by function)');

    const res3 = await fetchWithRetry('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer DUMMY' },
      body: JSON.stringify({ packageId: 'invalid_package' })
    });
    // Will fail at getUser() because DUMMY is invalid, or if that passes, invalid package.
    strictEqual(res3.status, 400);
    const data3 = await res3.json();
    console.log('✅ Invalid JWT/Package passed (rejected by Supabase API or function)');
  } finally {
    createOrderP.kill();
  }

  await wait(1000);

  const webhookP = spawn('/home/shreshthchaurasiya/.deno/bin/deno', ['run', '--allow-net', '--allow-env', 'supabase/functions/razorpay-webhook/index.ts'], { env, stdio: 'inherit' });
  await wait(2000);

  console.log('\nTesting razorpay-webhook');
  try {
    const res4 = await fetchWithRetry('http://localhost:8000', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-razorpay-signature': 'invalid_signature' },
      body: JSON.stringify({ event: 'payment.captured' })
    });
    strictEqual(res4.status, 400);
    const data4 = await res4.json();
    ok(data4.error.includes('Invalid webhook signature'));
    console.log('✅ Invalid webhook signature passed');
  } finally {
    webhookP.kill();
  }

  console.log('\nAll tests completed successfully!');
}

runTests();
