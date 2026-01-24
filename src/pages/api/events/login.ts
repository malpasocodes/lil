import type { APIRoute } from "astro";
import { db } from "../../../lib/db/client";
import { learners, loginEvents } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const loginEventSchema = z.object({
  provider_id: z.string().min(1, "provider_id is required"),
  email: z.string().email().optional(),
  name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const app = locals.app;
  if (!app) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json();
    const parsed = loginEventSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { provider_id, email, name, metadata } = parsed.data;

    // Upsert learner (create if new, update last_seen if existing)
    let learner = await db
      .select()
      .from(learners)
      .where(eq(learners.providerId, provider_id))
      .then((rows) => rows[0]);

    if (learner) {
      // Update existing learner
      await db
        .update(learners)
        .set({
          lastSeenAt: new Date(),
          ...(email && { email }),
          ...(name && { name }),
        })
        .where(eq(learners.id, learner.id));
    } else {
      // Create new learner
      const [newLearner] = await db
        .insert(learners)
        .values({
          providerId: provider_id,
          email: email ?? null,
          name: name ?? null,
        })
        .returning();
      learner = newLearner;
    }

    // Record login event
    const [loginEvent] = await db
      .insert(loginEvents)
      .values({
        learnerId: learner.id,
        appId: app.id,
        metadata: metadata ?? {},
      })
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        event_id: loginEvent.id,
        learner_id: learner.id,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error recording login event:", error);
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    },
  });
};
