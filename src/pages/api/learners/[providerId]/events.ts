import type { APIRoute } from "astro";
import { db } from "../../../../lib/db/client";
import {
  learners,
  loginEvents,
  learningEvents,
  apps,
} from "../../../../lib/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export const GET: APIRoute = async ({ params, url, locals }) => {
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

  // Parse query parameters
  const eventType = url.searchParams.get("event_type");
  const appFilter = url.searchParams.get("app");
  const fromDate = url.searchParams.get("from");
  const toDate = url.searchParams.get("to");
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
  const offset = parseInt(url.searchParams.get("offset") || "0");
  const includeLogins = url.searchParams.get("include_logins") !== "false";

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

    // Build conditions for learning events
    const learningConditions = [eq(learningEvents.learnerId, learner.id)];

    if (eventType) {
      learningConditions.push(eq(learningEvents.eventType, eventType));
    }

    if (fromDate) {
      learningConditions.push(
        gte(learningEvents.occurredAt, new Date(fromDate)),
      );
    }

    if (toDate) {
      learningConditions.push(lte(learningEvents.occurredAt, new Date(toDate)));
    }

    // If filtering by app name, we need to look up the app ID
    if (appFilter) {
      const filteredApp = await db
        .select()
        .from(apps)
        .where(eq(apps.name, appFilter))
        .then((rows) => rows[0]);

      if (filteredApp) {
        learningConditions.push(eq(learningEvents.appId, filteredApp.id));
      }
    }

    // Fetch learning events with app info
    const events = await db
      .select({
        id: learningEvents.id,
        event_type: learningEvents.eventType,
        scope_type: learningEvents.scopeType,
        scope_id: learningEvents.scopeId,
        occurred_at: learningEvents.occurredAt,
        payload: learningEvents.payload,
        metadata: learningEvents.metadata,
        app_name: apps.name,
      })
      .from(learningEvents)
      .innerJoin(apps, eq(learningEvents.appId, apps.id))
      .where(and(...learningConditions))
      .orderBy(desc(learningEvents.occurredAt))
      .limit(limit)
      .offset(offset);

    // Optionally include login events
    let logins: Array<{
      id: string;
      logged_in_at: Date;
      metadata: unknown;
      app_name: string;
    }> = [];

    if (includeLogins && !eventType) {
      const loginConditions = [eq(loginEvents.learnerId, learner.id)];

      if (fromDate) {
        loginConditions.push(gte(loginEvents.loggedInAt, new Date(fromDate)));
      }
      if (toDate) {
        loginConditions.push(lte(loginEvents.loggedInAt, new Date(toDate)));
      }

      logins = await db
        .select({
          id: loginEvents.id,
          logged_in_at: loginEvents.loggedInAt,
          metadata: loginEvents.metadata,
          app_name: apps.name,
        })
        .from(loginEvents)
        .innerJoin(apps, eq(loginEvents.appId, apps.id))
        .where(and(...loginConditions))
        .orderBy(desc(loginEvents.loggedInAt))
        .limit(limit);
    }

    // Format response
    const formattedEvents = events.map((e) => ({
      id: e.id,
      type: "learning_event",
      event_type: e.event_type,
      scope_type: e.scope_type,
      scope_id: e.scope_id,
      occurred_at: e.occurred_at.toISOString(),
      payload: e.payload,
      metadata: e.metadata,
      app: e.app_name,
    }));

    const formattedLogins = logins.map((l) => ({
      id: l.id,
      type: "login",
      event_type: "login",
      occurred_at: l.logged_in_at.toISOString(),
      metadata: l.metadata,
      app: l.app_name,
    }));

    // Combine and sort all events
    const allEvents = [...formattedEvents, ...formattedLogins].sort(
      (a, b) =>
        new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    return new Response(
      JSON.stringify({
        learner_id: learner.id,
        provider_id: learner.providerId,
        events: allEvents.slice(0, limit),
        pagination: {
          limit,
          offset,
          has_more: allEvents.length > limit,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error fetching learner events:", error);
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
