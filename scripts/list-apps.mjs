#!/usr/bin/env node

/**
 * List all registered apps in LIL.
 *
 * Usage:
 *   node scripts/list-apps.mjs
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";

const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  apiKeyHash: text("api_key_hash").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("Error: DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const client = postgres(databaseUrl);
  const db = drizzle(client);

  try {
    const allApps = await db.select().from(apps);

    if (allApps.length === 0) {
      console.log("\nNo apps registered yet.");
      console.log("Use 'node scripts/register-app.mjs <name>' to register an app.\n");
    } else {
      console.log("\nRegistered Apps:\n");
      console.log("─".repeat(80));

      for (const app of allApps) {
        console.log(`  ID: ${app.id}`);
        console.log(`  Name: ${app.name}`);
        console.log(`  Description: ${app.description || "(none)"}`);
        console.log(`  Active: ${app.isActive ? "Yes" : "No"}`);
        console.log(`  Created: ${app.createdAt.toISOString()}`);
        console.log("─".repeat(80));
      }

      console.log(`\nTotal: ${allApps.length} app(s)\n`);
    }
  } catch (error) {
    console.error("Error listing apps:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
