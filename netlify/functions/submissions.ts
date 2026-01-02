import type { Context } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export default async (req: Request, context: Context) => {
  const sql = neon(process.env.DATABASE_URL!);
  const url = new URL(req.url);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // GET - Fetch submissions
    if (req.method === 'GET') {
      const missionId = url.searchParams.get('mission_id');
      const unreviewed = url.searchParams.get('unreviewed');

      if (missionId) {
        const submissions = await sql`
          SELECT s.*, m.title as mission_title
          FROM submissions s
          JOIN missions m ON s.mission_id = m.id
          WHERE s.mission_id = ${parseInt(missionId)}
          ORDER BY s.submitted_at DESC
        `;
        return new Response(JSON.stringify(submissions), { headers });
      }

      if (unreviewed === 'true') {
        const submissions = await sql`
          SELECT s.*, m.title as mission_title
          FROM submissions s
          JOIN missions m ON s.mission_id = m.id
          WHERE s.reviewed = false
          ORDER BY s.submitted_at DESC
        `;
        return new Response(JSON.stringify(submissions), { headers });
      }

      // Get all submissions
      const submissions = await sql`
        SELECT s.*, m.title as mission_title
        FROM submissions s
        JOIN missions m ON s.mission_id = m.id
        ORDER BY s.submitted_at DESC
      `;
      return new Response(JSON.stringify(submissions), { headers });
    }

    // POST - Create submission
    if (req.method === 'POST') {
      const body = await req.json();
      const { mission_id, what_happened, what_was_hard, link_url, media_url } = body;

      if (!mission_id || !what_happened) {
        return new Response(
          JSON.stringify({ error: 'mission_id and what_happened are required' }),
          { status: 400, headers }
        );
      }

      const result = await sql`
        INSERT INTO submissions (mission_id, what_happened, what_was_hard, link_url, media_url)
        VALUES (${mission_id}, ${what_happened}, ${what_was_hard || null}, ${link_url || null}, ${media_url || null})
        RETURNING *
      `;

      return new Response(JSON.stringify(result[0]), { status: 201, headers });
    }

    // PATCH - Review submission
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, reviewed, review_notes } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Submission ID required' }), {
          status: 400,
          headers,
        });
      }

      const result = await sql`
        UPDATE submissions
        SET reviewed = ${reviewed ?? false}, review_notes = ${review_notes || null}
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Submission not found' }), {
          status: 404,
          headers,
        });
      }

      return new Response(JSON.stringify(result[0]), { headers });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers,
    });
  } catch (error) {
    console.error('Database error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers }
    );
  }
};

