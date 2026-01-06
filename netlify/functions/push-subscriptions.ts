import type { Context } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export default async (req: Request, _context: Context) => {
  const sql = neon(process.env.DATABASE_URL!);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // POST - Subscribe to push notifications
    if (req.method === 'POST') {
      const body = await req.json();
      const { endpoint, keys } = body;

      if (!endpoint || !keys?.p256dh || !keys?.auth) {
        return new Response(
          JSON.stringify({ error: 'Invalid subscription: endpoint and keys required' }),
          { status: 400, headers }
        );
      }

      // Upsert subscription (update if endpoint exists, insert if not)
      const result = await sql`
        INSERT INTO push_subscriptions (endpoint, p256dh, auth)
        VALUES (${endpoint}, ${keys.p256dh}, ${keys.auth})
        ON CONFLICT (endpoint)
        DO UPDATE SET p256dh = ${keys.p256dh}, auth = ${keys.auth}
        RETURNING id
      `;

      return new Response(
        JSON.stringify({ success: true, id: result[0].id }),
        { status: 201, headers }
      );
    }

    // DELETE - Unsubscribe from push notifications
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { endpoint } = body;

      if (!endpoint) {
        return new Response(
          JSON.stringify({ error: 'Endpoint required' }),
          { status: 400, headers }
        );
      }

      await sql`
        DELETE FROM push_subscriptions WHERE endpoint = ${endpoint}
      `;

      return new Response(
        JSON.stringify({ success: true }),
        { headers }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers }
    );
  } catch (error) {
    console.error('Push subscription error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers }
    );
  }
};

