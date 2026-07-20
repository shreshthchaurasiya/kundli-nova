import { createClient } from "@supabase/supabase-js"
import { getCorsHeaders, handleOptions } from "../_shared/cors.ts"

async function verifyWebhookSignature(bodyText: string, signature: string, secret: string) {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )
  const signatureBytes = new Uint8Array(signature.match(/[\da-f]{2}/gi)?.map(h => parseInt(h, 16)) || [])
  return crypto.subtle.verify('HMAC', key, signatureBytes, enc.encode(bodyText))
}

Deno.serve(async (req: Request) => {
  const optionsRes = handleOptions(req)
  if (optionsRes) return optionsRes

  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 })

  try {
    const signature = req.headers.get('x-razorpay-signature')
    if (!signature) throw new Error('Missing webhook signature')

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')
    if (!webhookSecret) throw new Error('Webhook secret not configured')

    const bodyText = await req.text()
    const isValid = await verifyWebhookSignature(bodyText, signature, webhookSecret)
    
    if (!isValid) throw new Error('Invalid webhook signature')

    const payload = JSON.parse(bodyText)
    const event = payload.event
    const payment = payload.payload.payment?.entity
    const refund = payload.payload.refund?.entity

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (event === 'payment.captured' && payment) {
      const { data: order, error: orderError } = await supabaseAdmin
        .from('payment_orders')
        .select('id, amount_paise, currency, status')
        .eq('razorpay_order_id', payment.order_id)
        .single()
      
      if (orderError || !order) return new Response('Order not found', { status: 200 })

      if (payment.amount !== order.amount_paise) throw new Error('Amount mismatch')
      if (payment.currency !== order.currency) throw new Error('Currency mismatch')
      if (payment.status !== 'captured') throw new Error('Payment status not captured')

      const { error: rpcError } = await supabaseAdmin.rpc('process_razorpay_payment', {
        p_order_id: order.id,
        p_razorpay_payment_id: payment.id
      })
      
      if (rpcError) console.error('Webhook atomic credit failed:', rpcError)
    } 
    else if (event === 'payment.failed' && payment) {
      const { data: order } = await supabaseAdmin
        .from('payment_orders')
        .select('id, status')
        .eq('razorpay_order_id', payment.order_id)
        .single()
      
      if (order && !['credited', 'refunded', 'partially_refunded'].includes(order.status)) {
        await supabaseAdmin.from('payment_orders').update({ status: 'failed' }).eq('id', order.id)
      }
    }
    else if (event === 'refund.processed' && refund && payment) {
      const { data: order } = await supabaseAdmin
        .from('payment_orders')
        .select('id')
        .eq('razorpay_order_id', payment.order_id)
        .single()

      if (order) {
        await supabaseAdmin.from('payment_refunds').insert({
          payment_order_id: order.id,
          razorpay_refund_id: refund.id,
          razorpay_payment_id: payment.id,
          amount_paise: refund.amount,
          status: refund.status,
          reconciliation_status: 'pending',
          metadata: refund
        })

        const newStatus = (refund.amount === payment.amount) ? 'refunded' : 'partially_refunded'
        await supabaseAdmin.from('payment_orders').update({ status: newStatus }).eq('id', order.id)
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...getCorsHeaders(req) }, status: 400 })
  }
})
