import type { Context } from '@netlify/functions';
import { neon } from '@neondatabase/serverless';

export default async (req: Request, context: Context) => {
  const sql = neon(process.env.DATABASE_URL!);
  const url = new URL(req.url);

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  try {
    // GET - Fetch missions
    if (req.method === 'GET') {
      const current = url.searchParams.get('current');
      const id = url.searchParams.get('id');

      if (id) {
        // Get single mission with submissions
        const missions = await sql`
          SELECT * FROM missions WHERE id = ${parseInt(id)}
        `;
        if (missions.length === 0) {
          return new Response(JSON.stringify({ error: 'Mission not found' }), {
            status: 404,
            headers,
          });
        }
        const submissions = await sql`
          SELECT * FROM submissions WHERE mission_id = ${parseInt(id)} ORDER BY submitted_at DESC
        `;
        return new Response(JSON.stringify({ ...missions[0], submissions }), { headers });
      }

      if (current === 'true') {
        // Get current mission (most recent without a submission)
        const missions = await sql`
          SELECT m.* FROM missions m
          LEFT JOIN submissions s ON m.id = s.mission_id
          WHERE s.id IS NULL
          ORDER BY m.created_at DESC
          LIMIT 1
        `;
        if (missions.length === 0) {
          // If all missions have submissions, return the most recent one
          const allMissions = await sql`
            SELECT * FROM missions ORDER BY created_at DESC LIMIT 1
          `;
          if (allMissions.length === 0) {
            return new Response(JSON.stringify(null), { headers });
          }
          return new Response(JSON.stringify(allMissions[0]), { headers });
        }
        return new Response(JSON.stringify(missions[0]), { headers });
      }

      // Get all missions with their submissions
      const missions = await sql`
        SELECT * FROM missions ORDER BY created_at DESC
      `;
      const submissions = await sql`
        SELECT * FROM submissions ORDER BY submitted_at DESC
      `;

      // Group submissions by mission
      const missionsWithSubmissions = missions.map((mission) => ({
        ...mission,
        submissions: submissions.filter((s) => s.mission_id === mission.id),
      }));

      return new Response(JSON.stringify(missionsWithSubmissions), { headers });
    }

    // POST - Create mission
    if (req.method === 'POST') {
      const body = await req.json();
      const {
        title,
        story,
        objective,
        constraints,
        success_criteria,
        difficulty,
        banner_image_url,
        setup_image_url,
        hint1,
        hint2,
      } = body;

      const result = await sql`
        INSERT INTO missions (title, story, objective, constraints, success_criteria, difficulty, banner_image_url, setup_image_url, hint1, hint2)
        VALUES (${title}, ${story}, ${objective}, ${constraints}, ${success_criteria}, ${difficulty}, ${banner_image_url || null}, ${setup_image_url || null}, ${hint1 || null}, ${hint2 || null})
        RETURNING *
      `;

      return new Response(JSON.stringify(result[0]), { status: 201, headers });
    }

    // PATCH - Update mission
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, ...updates } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Mission ID required' }), {
          status: 400,
          headers,
        });
      }

      // Build dynamic update query
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const allowedFields = [
        'title',
        'story',
        'objective',
        'constraints',
        'success_criteria',
        'difficulty',
        'banner_image_url',
        'setup_image_url',
        'hint1',
        'hint2',
      ];

      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          setClauses.push(`${field} = $${paramIndex}`);
          values.push(updates[field]);
          paramIndex++;
        }
      }

      if (setClauses.length === 0) {
        return new Response(JSON.stringify({ error: 'No valid fields to update' }), {
          status: 400,
          headers,
        });
      }

      values.push(id);
      const query = `UPDATE missions SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
      const result = await sql(query, values);

      if (result.length === 0) {
        return new Response(JSON.stringify({ error: 'Mission not found' }), {
          status: 404,
          headers,
        });
      }

      return new Response(JSON.stringify(result[0]), { headers });
    }

    // DELETE - Delete mission
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      if (!id) {
        return new Response(JSON.stringify({ error: 'Mission ID required' }), {
          status: 400,
          headers,
        });
      }

      await sql`DELETE FROM missions WHERE id = ${id}`;
      return new Response(JSON.stringify({ success: true }), { headers });
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

