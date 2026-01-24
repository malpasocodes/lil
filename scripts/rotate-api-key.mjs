#!/usr/bin/env node

/**
 * Rotate the API key for an existing app.
 *
 * Usage:
 *   node scripts/rotate-api-key.mjs <app-name>
 *
 * Example:
 *   node scripts/rotate-api-key.mjs ai-atelier-pro
 *
 * The script will generate a new API key and invalidate the old one.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { eq } from "drizzle-orm";
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  apiKeyHash: text("api_key_hash").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Usage: node scripts/rotate-api-key.mjs <app-name>");
    console.error("Example: node scripts/rotate-api-key.mjs ai-atelier-pro");
    process.exit(1);
  }

  const appName = args[0];

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Find the app
    const [app] = await db.select().from(apps).where(eq(apps.name, appName));

    if (!app) {
      console.error(`Error: App "${appName}" not found`);
      process.exit(1);
    }

    // Generate new API key
    const newApiKey = `lil_${randomBytes(24).toString("base64url")}`;
    const newApiKeyHash = await bcrypt.hash(newApiKey, 10);

    // Update the app
    await db
      .update(apps)
      .set({ apiKeyHash: newApiKeyHash })
      .where(eq(apps.id, app.id));

    console.log("\n✅ API key rotated successfully!\n");
    console.log(`App: ${appName}`);
    console.log(
      "\n🔑 New API Key (store this securely - it cannot be retrieved later):",
    );
    console.log(`\n  ${newApiKey}\n`);
    console.log(
      "Update your app's LIL_API_KEY environment variable with this new key.",
    );
    console.log("The old API key is now invalid.\n");
  } catch (error) {
    console.error("Error rotating API key:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
