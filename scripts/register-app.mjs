#!/usr/bin/env node

/**
 * Register a new app with LIL and generate an API key.
 *
 * Usage:
 *   node scripts/register-app.mjs <app-name> [description]
 *
 * Example:
 *   node scripts/register-app.mjs ai-atelier-pro "AI Product Manager certification portal"
 *
 * The script will output the API key - store it securely as it cannot be retrieved later.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";

// Schema definition (duplicated here to avoid import issues with .ts files)
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
    console.error(
      "Usage: node scripts/register-app.mjs <app-name> [description]",
    );
    console.error(
      "Example: node scripts/register-app.mjs ai-atelier-pro 'AI PM certification portal'",
    );
    process.exit(1);
  }

  const appName = args[0];
  const description = args[1] || null;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  // Generate API key
  const apiKey = `lil_${randomBytes(24).toString("base64url")}`;
  const apiKeyHash = await bcrypt.hash(apiKey, 10);

  // Connect to database
  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    // Insert new app
    const [newApp] = await db
      .insert(apps)
      .values({
        name: appName,
        apiKeyHash,
        description,
      })
      .returning();

    console.log("\n✅ App registered successfully!\n");
    console.log("App Details:");
    console.log(`  ID: ${newApp.id}`);
    console.log(`  Name: ${newApp.name}`);
    console.log(`  Description: ${newApp.description || "(none)"}`);
    console.log(`  Created: ${newApp.createdAt.toISOString()}`);
    console.log(
      "\n🔑 API Key (store this securely - it cannot be retrieved later):",
    );
    console.log(`\n  ${apiKey}\n`);
    console.log("Add this to your app's environment variables as LIL_API_KEY");
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      console.error(`Error: An app with name "${appName}" already exists`);
    } else {
      console.error("Error registering app:", error.message);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
