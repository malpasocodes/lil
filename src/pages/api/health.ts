import type { APIRoute } from "astro";
import { db } from "../../lib/db/client";
import { sql } from "drizzle-orm";

export const GET: APIRoute = async () => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);

    return new Response(
      JSON.stringify({
        status: "healthy",
        service: "lil",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        service: "lil",
        error:
          error instanceof Error ? error.message : "Database connection failed",
        timestamp: new Date().toISOString(),
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
