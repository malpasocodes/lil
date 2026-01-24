import { defineMiddleware } from "astro:middleware";
import { validateApiKey } from "./lib/auth/api-key";

// Routes that don't require API key authentication
const PUBLIC_ROUTES = ["/api/health", "/"];

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  // Allow public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return next();
  }

  // All API routes require authentication
  if (pathname.startsWith("/api/")) {
    const apiKey = context.request.headers.get("X-API-Key");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Missing X-API-Key header" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const app = await validateApiKey(apiKey);

    if (!app) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Attach authenticated app to locals for use in API handlers
    context.locals.app = app;
  }

  return next();
});
