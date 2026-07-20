import { createClient } from "@supabase/supabase-js"
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts"

const PACKAGES: Record<string, number> = {
  'recharge_100': 10000,
  'recharge_200': 20000,
  'recharge_500': 50000,
  'recharge_1000': 100000,
  'recharge_2000': 200000,
};

Deno.serve(async (req: Request) => {
  const optionsRes = handleOptions(req)
  if (optionsRes) return optionsRes

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const body = await req.json()
    const packageId = body.packageId
    const amountPaise = PACKAGES[packageId]
    if (!amountPaise) {
      throw new Error('Invalid package selected')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: order, error: insertError } = await supabaseAdmin
      .from('payment_orders')
      .insert({
        user_id: user.id,
        package_id: packageId,
        amount_paise: amountPaise,
        currency: 'INR',
        status: 'created'
      })
      .select('id')
      .single()

    if (insertError || !order) {
      console.error('Insert error details:', insertError)
      throw new Error(`Failed to create internal order: ${insertError?.message || 'unknown'}`)
    }

    const rzpKey = Deno.env.get('RAZORPAY_KEY_ID')
    const rzpSecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!rzpKey || !rzpSecret) throw new Error('Razorpay credentials not configured')

    const rzpAuth = btoa(`${rzpKey}:${rzpSecret}`)
    
    const rzpResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${rzpAuth}`
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: order.id
      })
    })
    
    const rzpData = await rzpResponse.json()
    if (!rzpResponse.ok) {
      await supabaseAdmin.from('payment_orders').update({ status: 'failed' }).eq('id', order.id)
      throw new Error(rzpData.error?.description || 'Razorpay order creation failed')
    }

    const { error: updateError } = await supabaseAdmin
      .from('payment_orders')
      .update({ razorpay_order_id: rzpData.id })
      .eq('id', order.id)

    if (updateError) {
      throw new Error('Failed to update internal order with Razorpay ID')
    }

    return new Response(
      JSON.stringify({
        key_id: rzpKey,
        order_id: rzpData.id,
        amount: amountPaise,
        currency: 'INR',
        brand_name: 'Kundli Nova',
        description: 'Simulated Wallet Top-up'
      }),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
