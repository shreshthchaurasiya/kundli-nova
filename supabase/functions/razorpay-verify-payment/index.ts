import { createClient } from "@supabase/supabase-js"
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts"

async function verifyHmac(message: string, signature: string, secret: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  
  const signatureBytes = new Uint8Array(signature.match(/[\da-f]{2}/gi)?.map(h => parseInt(h, 16)) || [])
  return crypto.subtle.verify('HMAC', key, signatureBytes, enc.encode(message))
}

Deno.serve(async (req: Request) => {
  const optionsRes = handleOptions(req)
  if (optionsRes) return optionsRes

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) throw new Error('Unauthorized')

    const body = await req.json()
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification details')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: order, error: orderError } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('razorpay_order_id', razorpay_order_id)
      .eq('user_id', user.id)
      .single()

    if (orderError || !order) throw new Error('Order not found or unauthorized')

    if (order.status === 'credited') {
      if (order.razorpay_payment_id === razorpay_payment_id) {
        return new Response(JSON.stringify({ success: true, message: 'Already credited' }), {
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        })
      } else {
        throw new Error('Order already credited with a different payment ID')
      }
    }

    const rzpSecret = Deno.env.get('RAZORPAY_KEY_SECRET')
    if (!rzpSecret) throw new Error('Razorpay secret not configured')

    const message = `${order.razorpay_order_id}|${razorpay_payment_id}`
    const isValid = await verifyHmac(message, razorpay_signature, rzpSecret)
    if (!isValid) throw new Error('Invalid payment signature')

    const rzpKey = Deno.env.get('RAZORPAY_KEY_ID')
    const rzpAuth = btoa(`${rzpKey}:${rzpSecret}`)
    const rzpResponse = await fetch(`https://api.razorpay.com/v1/payments/${razorpay_payment_id}`, {
      headers: { 'Authorization': `Basic ${rzpAuth}` }
    })
    
    if (!rzpResponse.ok) throw new Error('Failed to fetch payment details from Razorpay')
    const payment = await rzpResponse.json()

    if (payment.order_id !== order.razorpay_order_id) throw new Error('Payment order ID mismatch')
    if (payment.amount !== order.amount_paise) throw new Error('Payment amount mismatch')
    if (payment.currency !== 'INR') throw new Error('Payment currency mismatch')
    if (payment.status !== 'captured') throw new Error('Payment not captured')

    const { data: wallet, error: rpcError } = await supabaseAdmin.rpc('process_razorpay_payment', {
      p_order_id: order.id,
      p_razorpay_payment_id: razorpay_payment_id
    })

    if (rpcError) throw new Error(`Atomic credit failed: ${rpcError.message}`)

    return new Response(JSON.stringify({ success: true, balance: wallet.balance }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
