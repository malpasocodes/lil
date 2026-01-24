import type { APIRoute } from "astro";
import { db } from "../../../../lib/db/client";
import {
  apps,
  learners,
  loginEvents,
  learningEvents,
} from "../../../../lib/db/schema";
import { eq, count, countDistinct, gte, sql } from "drizzle-orm";

export const GET: APIRoute = async ({ params, locals }) => {
  const authenticatedApp = locals.app;
  if (!authenticatedApp) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { appId } = params;

  if (!appId) {
    return new Response(
      JSON.stringify({ error: "Missing appId parameter" }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Find app (can look up by ID or name)
    let app = await db
      .select()
      .from(apps)
      .where(eq(apps.id, appId))
      .then((rows) => rows[0]);

    // If not found by ID, try by name
    if (!app) {
      app = await db
        .select()
        .from(apps)
        .where(eq(apps.name, appId))
        .then((rows) => rows[0]);
    }

    if (!app) {
      return new Response(JSON.stringify({ error: "App not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Calculate time boundaries
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Get total unique learners for this app (from login events)
    const [totalLearnersResult] = await db
      .select({ count: countDistinct(loginEvents.learnerId) })
      .from(loginEvents)
      .where(eq(loginEvents.appId, app.id));

    // Get logins today
    const [loginsTodayResult] = await db
      .select({ count: count() })
      .from(loginEvents)
      .where(
        sql`${loginEvents.appId} = ${app.id} AND ${loginEvents.loggedInAt} >= ${todayStart}`
      );

    // Get logins this week
    const [loginsWeekResult] = await db
      .select({ count: count() })
      .from(loginEvents)
      .where(
        sql`${loginEvents.appId} = ${app.id} AND ${loginEvents.loggedInAt} >= ${weekAgo}`
      );

    // Get total learning events for this app
    const [totalEventsResult] = await db
      .select({ count: count() })
      .from(learningEvents)
      .where(eq(learningEvents.appId, app.id));

    // Get events this week
    const [eventsWeekResult] = await db
      .select({ count: count() })
      .from(learningEvents)
      .where(
        sql`${learningEvents.appId} = ${app.id} AND ${learningEvents.occurredAt} >= ${weekAgo}`
      );

    // Get events this month
    const [eventsMonthResult] = await db
      .select({ count: count() })
      .from(learningEvents)
      .where(
        sql`${learningEvents.appId} = ${app.id} AND ${learningEvents.occurredAt} >= ${monthAgo}`
      );

    // Get event type breakdown
    const eventTypeBreakdown = await db
      .select({
        event_type: learningEvents.eventType,
        count: count(),
      })
      .from(learningEvents)
      .where(eq(learningEvents.appId, app.id))
      .groupBy(learningEvents.eventType);

    return new Response(
      JSON.stringify({
        app: {
          id: app.id,
          name: app.name,
          description: app.description,
          is_active: app.isActive,
          created_at: app.createdAt.toISOString(),
        },
        stats: {
          total_learners: totalLearnersResult.count,
          logins_today: loginsTodayResult.count,
          logins_this_week: loginsWeekResult.count,
          total_events: totalEventsResult.count,
          events_this_week: eventsWeekResult.count,
          events_this_month: eventsMonthResult.count,
          event_types: eventTypeBreakdown.reduce(
            (acc, { event_type, count }) => {
              acc[event_type] = count;
              return acc;
            },
            {} as Record<string, number>
          ),
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching app stats:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
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
