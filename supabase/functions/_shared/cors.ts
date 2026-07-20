export const corsHeaders = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin');
  const isLocalhost = origin && (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
  const isProd = origin === 'https://kundli-nova.com';
  
  // Reject unknown origins by returning an empty or null origin, or just the origin if allowed
  const allowedOrigin = (isLocalhost || isProd) ? origin : '';

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': corsHeaders['Access-Control-Allow-Headers'],
    'Access-Control-Allow-Methods': corsHeaders['Access-Control-Allow-Methods'],
  };
}

export function handleOptions(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(req) });
  }
  return null;
}
