import type { APIRoute } from "astro";
import { db } from "../../../lib/db/client";
import { learners, learningEvents } from "../../../lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const assessmentEventSchema = z.object({
  provider_id: z.string().min(1, "provider_id is required"),
  event_type: z
    .enum(["assessment_started", "assessment_passed", "assessment_failed"])
    .default("assessment_passed"),
  scope_type: z.literal("assessment").optional().default("assessment"),
  scope_id: z.string().optional(), // Assessment ID within the source app
  payload: z
    .object({
      assessment_title: z.string().optional(),
      score: z.number().optional(),
      max_score: z.number().optional(),
      passing_score: z.number().optional(),
      attempt_number: z.number().optional(),
      time_spent_seconds: z.number().optional(),
      module: z.string().optional(),
      program: z.string().optional(),
    })
    .passthrough()
    .optional(),
  metadata: z.record(z.unknown()).optional(),
  occurred_at: z.string().datetime().optional(),
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
    const parsed = assessmentEventSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const {
      provider_id,
      event_type,
      scope_type,
      scope_id,
      payload,
      metadata,
      occurred_at,
    } = parsed.data;

    // Find learner by provider_id
    const learner = await db
      .select()
      .from(learners)
      .where(eq(learners.providerId, provider_id))
      .then((rows) => rows[0]);

    if (!learner) {
      return new Response(
        JSON.stringify({
          error: "Learner not found",
          message: `No learner found with provider_id: ${provider_id}. Ensure a login event is recorded first.`,
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Update learner's last seen timestamp
    await db
      .update(learners)
      .set({ lastSeenAt: new Date() })
      .where(eq(learners.id, learner.id));

    // Record assessment event
    const [event] = await db
      .insert(learningEvents)
      .values({
        learnerId: learner.id,
        appId: app.id,
        eventType: event_type,
        scopeType: scope_type,
        scopeId: scope_id ?? null,
        payload: payload ?? {},
        metadata: metadata ?? {},
        occurredAt: occurred_at ? new Date(occurred_at) : new Date(),
      })
      .returning();

    return new Response(
      JSON.stringify({
        success: true,
        event_id: event.id,
        learner_id: learner.id,
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error recording assessment event:", error);
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
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-API-Key",
    },
  });
};
