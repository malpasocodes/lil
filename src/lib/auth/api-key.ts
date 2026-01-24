import bcrypt from "bcrypt";
import { db } from "../db/client";
import { apps } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AuthenticatedApp {
  id: string;
  name: string;
}

/**
 * Validate an API key and return the associated app if valid.
 * Returns null if the key is invalid or the app is inactive.
 */
export async function validateApiKey(
  apiKey: string
): Promise<AuthenticatedApp | null> {
  if (!apiKey) {
    return null;
  }

  // Get all active apps and check the API key against each
  // In production with many apps, you might want to use a key prefix for lookup
  const activeApps = await db
    .select()
    .from(apps)
    .where(eq(apps.isActive, true));

  for (const app of activeApps) {
    const isValid = await bcrypt.compare(apiKey, app.apiKeyHash);
    if (isValid) {
      return {
        id: app.id,
        name: app.name,
      };
    }
  }

  return null;
}

/**
 * Generate a new API key and its bcrypt hash.
 * Returns both the plain key (to give to the app owner) and the hash (to store).
 */
export async function generateApiKey(): Promise<{
  key: string;
  hash: string;
}> {
  // Generate a random API key
  const key = `lil_${generateRandomString(32)}`;
  const hash = await bcrypt.hash(key, 10);

  return { key, hash };
}

function generateRandomString(length: number): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
