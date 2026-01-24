import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// Registry of client applications that can send events to LIL
export const apps = pgTable("apps", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(), // e.g., "ai-atelier-pro"
  apiKeyHash: text("api_key_hash").notNull(), // bcrypt hash of API key
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Learner registry - unified across all apps
export const learners = pgTable("learners", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerId: text("provider_id").notNull().unique(), // Clerk/GitLab user ID (shared across apps)
  email: text("email"), // Optional, for lookup
  name: text("name"),
  firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// Login activity from all apps
export const loginEvents = pgTable(
  "login_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id),
    loggedInAt: timestamp("logged_in_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    metadata: jsonb("metadata").default({}).notNull(), // IP, user agent, etc.
  },
  (table) => [
    index("login_events_learner_idx").on(table.learnerId),
    index("login_events_app_idx").on(table.appId),
    index("login_events_time_idx").on(table.loggedInAt),
  ],
);

// Activity/assessment events from all apps
export const learningEvents = pgTable(
  "learning_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    learnerId: uuid("learner_id")
      .notNull()
      .references(() => learners.id),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id),
    eventType: text("event_type").notNull(), // 'activity_completed', 'assessment_passed', etc.
    scopeType: text("scope_type"), // 'activity', 'module', 'program'
    scopeId: text("scope_id"), // ID within the source app
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    payload: jsonb("payload").default({}).notNull(), // Flexible event data
    metadata: jsonb("metadata").default({}).notNull(), // App-specific metadata
  },
  (table) => [
    index("learning_events_learner_idx").on(table.learnerId),
    index("learning_events_type_idx").on(table.eventType),
    index("learning_events_time_idx").on(table.occurredAt),
    index("learning_events_app_idx").on(table.appId),
  ],
);

// Type exports for use in application code
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
export type Learner = typeof learners.$inferSelect;
export type NewLearner = typeof learners.$inferInsert;
export type LoginEvent = typeof loginEvents.$inferSelect;
export type NewLoginEvent = typeof loginEvents.$inferInsert;
export type LearningEvent = typeof learningEvents.$inferSelect;
export type NewLearningEvent = typeof learningEvents.$inferInsert;
