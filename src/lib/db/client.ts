import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create postgres client
const client = postgres(connectionString, {
  max: 1, // Serverless-friendly: use single connection
  idle_timeout: 20,
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });
