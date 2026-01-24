import type { APIRoute } from "astro";
import { db } from "../../../../lib/db/client";
import {
  learners,
  loginEvents,
  learningEvents,
} from "../../../../lib/db/schema";
import { eq, count } from "drizzle-orm";

export const GET: APIRoute = async ({ params, locals }) => {
  const app = locals.app;
  if (!app) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { providerId } = params;

  if (!providerId) {
    return new Response(
      JSON.stringify({ error: "Missing providerId parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Find learner
    const learner = await db
      .select()
      .from(learners)
      .where(eq(learners.providerId, providerId))
      .then((rows) => rows[0]);

    if (!learner) {
      return new Response(JSON.stringify({ error: "Learner not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get login count
    const [loginCount] = await db
      .select({ count: count() })
      .from(loginEvents)
      .where(eq(loginEvents.learnerId, learner.id));

    // Get learning events count
    const [eventCount] = await db
      .select({ count: count() })
      .from(learningEvents)
      .where(eq(learningEvents.learnerId, learner.id));

    return new Response(
      JSON.stringify({
        learner: {
          id: learner.id,
          provider_id: learner.providerId,
          email: learner.email,
          name: learner.name,
          first_seen_at: learner.firstSeenAt.toISOString(),
          last_seen_at: learner.lastSeenAt.toISOString(),
        },
        stats: {
          total_logins: loginCount.count,
          total_events: eventCount.count,
          last_seen: learner.lastSeenAt.toISOString(),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching learner:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

// Handle OPTIONS for CORS preflight
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    },
  });
};
