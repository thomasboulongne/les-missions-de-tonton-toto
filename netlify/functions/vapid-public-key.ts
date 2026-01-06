import type { Context } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return new Response(
      JSON.stringify({ error: 'VAPID public key not configured' }),
      { status: 500, headers }
    );
  }

  return new Response(
    JSON.stringify({ publicKey: vapidPublicKey }),
    { headers }
  );
};

