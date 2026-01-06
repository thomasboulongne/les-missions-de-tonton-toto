import type { Context } from "@netlify/functions";
import { neon } from "@neondatabase/serverless";
import webpush from "web-push";

// Module-level log - if you don't see this, imports are failing
console.log("📦 Submissions module loaded", {
  hasDbUrl: !!process.env.DATABASE_URL,
  hasVapidPublic: !!process.env.VAPID_PUBLIC_KEY,
  hasVapidPrivate: !!process.env.VAPID_PRIVATE_KEY,
  hasVapidSubject: !!process.env.VAPID_SUBJECT,
});

// Configure web-push with VAPID keys
if (
  process.env.VAPID_PUBLIC_KEY &&
  process.env.VAPID_PRIVATE_KEY &&
  process.env.VAPID_SUBJECT
) {
  console.log("🔑 Configuring VAPID...");
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
    console.log("✅ VAPID configured successfully");
  } catch (err) {
    console.error("❌ VAPID configuration failed:", err);
  }
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

async function sendPushNotifications(
  sql: ReturnType<typeof neon<false, false>>,
  title: string,
  body: string
) {
  // Skip if VAPID not configured
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.log("VAPID keys not configured, skipping push notifications");
    return;
  }

  try {
    const subscriptions = (await sql`
      SELECT endpoint, p256dh, auth FROM push_subscriptions
    `) as PushSubscription[];

    const payload = JSON.stringify({ title, body });

    const sendPromises = subscriptions.map(async (sub: PushSubscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        );
      } catch (error: unknown) {
        // If subscription is expired or invalid, remove it
        if (error instanceof Error && "statusCode" in error) {
          const statusCode = (error as { statusCode: number }).statusCode;
          if (statusCode === 404 || statusCode === 410) {
            console.log("Removing expired subscription:", sub.endpoint);
            await sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`;
          }
        }
        console.error("Error sending push to", sub.endpoint, error);
      }
    });

    await Promise.all(sendPromises);
  } catch (error) {
    console.error("Error fetching push subscriptions:", error);
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default async (req: Request, _context: Context) => {
  const startTime = performance.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  const log = (message: string, data?: Record<string, unknown>) => {
    const elapsed = (performance.now() - startTime).toFixed(1);
    console.log(
      `[${requestId}] [${elapsed}ms] ${message}`,
      data ? JSON.stringify(data) : ""
    );
  };

  const url = new URL(req.url);
  log("📥 Request received", {
    method: req.method,
    path: url.pathname,
    query: url.search,
  });

  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  // Handle preflight
  if (req.method === "OPTIONS") {
    log("✅ OPTIONS preflight");
    return new Response(null, { status: 204, headers });
  }

  // Check DATABASE_URL
  if (!process.env.DATABASE_URL) {
    log("❌ DATABASE_URL not configured");
    return new Response(JSON.stringify({ error: "Database not configured" }), {
      status: 500,
      headers,
    });
  }

  log("🔌 Connecting to database...");
  const sql = neon(process.env.DATABASE_URL);

  try {
    // GET - Fetch submissions
    if (req.method === "GET") {
      const missionId = url.searchParams.get("mission_id");
      const unreviewed = url.searchParams.get("unreviewed");
      const reviewedSince = url.searchParams.get("reviewed_since");

      log("📖 GET submissions", { missionId, unreviewed, reviewedSince });

      if (missionId) {
        log("🔍 Fetching by mission_id");
        const submissions = await sql`
          SELECT s.*, m.title as mission_title
          FROM submissions s
          JOIN missions m ON s.mission_id = m.id
          WHERE s.mission_id = ${parseInt(missionId)}
          ORDER BY s.submitted_at DESC
        `;
        log("✅ Found submissions", { count: submissions.length });
        return new Response(JSON.stringify(submissions), { headers });
      }

      if (unreviewed === "true") {
        log("🔍 Fetching unreviewed (pending)");
        const submissions = await sql`
          SELECT s.*, m.title as mission_title
          FROM submissions s
          JOIN missions m ON s.mission_id = m.id
          WHERE s.status = 'pending'
          ORDER BY s.submitted_at DESC
        `;
        log("✅ Found pending submissions", { count: submissions.length });
        return new Response(JSON.stringify(submissions), { headers });
      }

      if (reviewedSince) {
        log("🔍 Fetching reviewed since", { reviewedSince });
        const submissions = await sql`
          SELECT s.*, m.title as mission_title
          FROM submissions s
          JOIN missions m ON s.mission_id = m.id
          WHERE s.reviewed_at > ${reviewedSince}
          ORDER BY s.reviewed_at DESC
        `;
        log("✅ Found reviewed submissions", { count: submissions.length });
        return new Response(JSON.stringify(submissions), { headers });
      }

      // Get all submissions
      log("🔍 Fetching all submissions");
      const submissions = await sql`
        SELECT s.*, m.title as mission_title
        FROM submissions s
        JOIN missions m ON s.mission_id = m.id
        ORDER BY s.submitted_at DESC
      `;
      log("✅ Found all submissions", { count: submissions.length });
      return new Response(JSON.stringify(submissions), { headers });
    }

    // POST - Create submission
    if (req.method === "POST") {
      log("📝 POST - Creating submission");
      const body = await req.json();
      log("📦 Request body", {
        mission_id: body.mission_id,
        hasWhatHappened: !!body.what_happened,
      });
      const {
        mission_id,
        what_happened,
        what_was_hard,
        link_url,
        media_url,
        media_url_2,
      } = body;

      if (!mission_id || !what_happened) {
        log("❌ Validation failed - missing required fields");
        return new Response(
          JSON.stringify({
            error: "mission_id and what_happened are required",
          }),
          { status: 400, headers }
        );
      }

      log("💾 Inserting submission...");
      const result = await sql`
        INSERT INTO submissions (mission_id, what_happened, what_was_hard, link_url, media_url, media_url_2, status)
        VALUES (${mission_id}, ${what_happened}, ${what_was_hard || null}, ${
        link_url || null
      }, ${media_url || null}, ${media_url_2 || null}, 'pending')
        RETURNING *
      `;
      log("✅ Submission created", { id: result[0]?.id });

      return new Response(JSON.stringify(result[0]), { status: 201, headers });
    }

    // PATCH - Review submission
    if (req.method === "PATCH") {
      log("✏️ PATCH - Reviewing submission");
      const body = await req.json();
      log("📦 Request body", { id: body.id, status: body.status });
      const { id, status, review_notes } = body;

      if (!id) {
        log("❌ Validation failed - missing id");
        return new Response(
          JSON.stringify({ error: "Submission ID required" }),
          {
            status: 400,
            headers,
          }
        );
      }

      // Validate status if provided
      if (status && !["pending", "approved", "needs_work"].includes(status)) {
        log("❌ Validation failed - invalid status", { status });
        return new Response(
          JSON.stringify({
            error: "Invalid status. Must be pending, approved, or needs_work",
          }),
          { status: 400, headers }
        );
      }

      // Build update based on what's provided
      const isReviewing = status === "approved" || status === "needs_work";
      const reviewed = isReviewing;
      const reviewedAt = isReviewing ? new Date().toISOString() : null;

      log("💾 Updating submission...", { id, status, reviewed, reviewedAt });
      const result = await sql`
        UPDATE submissions
        SET
          reviewed = ${reviewed},
          review_notes = ${review_notes || null},
          status = ${status || "pending"},
          reviewed_at = ${reviewedAt}
        WHERE id = ${id}
        RETURNING *, (SELECT title FROM missions WHERE id = submissions.mission_id) as mission_title
      `;

      if (result.length === 0) {
        log("❌ Submission not found", { id });
        return new Response(JSON.stringify({ error: "Submission not found" }), {
          status: 404,
          headers,
        });
      }

      const submission = result[0];
      log("✅ Submission updated", {
        id: submission.id,
        status: submission.status,
      });

      // Send push notification if status changed to approved or needs_work
      if (isReviewing) {
        const notificationTitle =
          status === "approved"
            ? "🎉 Mission validée !"
            : "💪 Tonton Toto a répondu";

        const notificationBody =
          status === "approved"
            ? `Bravo pour "${submission.mission_title}" !`
            : `Jette un œil aux conseils pour "${submission.mission_title}"`;

        log("📣 Sending push notification...", { title: notificationTitle });
        // Send push notification in the background (don't await)
        sendPushNotifications(sql, notificationTitle, notificationBody).catch(
          (err) => {
            log("❌ Push notification failed", { error: String(err) });
          }
        );
      }

      return new Response(JSON.stringify(submission), { headers });
    }

    log("❌ Method not allowed", { method: req.method });
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  } catch (error) {
    log("❌ Error in handler", {
      error: String(error),
      stack: (error as Error).stack,
    });
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: String(error),
      }),
      { status: 500, headers }
    );
  }
};
