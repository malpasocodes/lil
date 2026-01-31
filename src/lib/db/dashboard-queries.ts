import { db } from "./client";
import { apps, loginEvents, learningEvents, learners } from "./schema";
import { eq, count, countDistinct, sql, desc, and, gte, type AnyColumn } from "drizzle-orm";

// ── Types ──────────────────────────────────────────────────────────

export type KpiMetrics = {
  totalLearners: number;
  loginsToday: number;
  loginsThisWeek: number;
  totalEvents: number;
  loginsTodayChange: number | null;
  loginsWeekChange: number | null;
};

export type TimeSeriesPoint = {
  date: string;
  logins: number;
  events: number;
};

export type ActiveLearner = {
  id: string;
  name: string | null;
  email: string | null;
  providerId: string;
  appName: string;
  lastLogin: string;
};

export type AppBreakdown = {
  appId: string;
  appName: string;
  description: string | null;
  totalLearners: number;
  loginsToday: number;
  loginsThisWeek: number;
  totalEvents: number;
  eventTypes: Record<string, number>;
};

// ── Helpers (all day boundaries are US Eastern) ───────────────────

const TZ = "America/New_York";

/** YYYY-MM-DD for `d` in Eastern time */
function easternDateStr(d: Date = new Date()): string {
  return d.toLocaleDateString("en-CA", { timeZone: TZ });
}

/** UTC Date representing midnight Eastern on the given YYYY-MM-DD */
function midnightEastern(yyyy_mm_dd: string): Date {
  // Use noon UTC on that date to safely determine the Eastern UTC offset
  const noonUtc = new Date(yyyy_mm_dd + "T12:00:00Z");
  const easternHour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "2-digit",
      hour12: false,
    }).format(noonUtc),
  );
  const offsetHours = easternHour - 12; // e.g. -5 for EST, -4 for EDT
  return new Date(
    new Date(yyyy_mm_dd + "T00:00:00Z").getTime() - offsetHours * 3_600_000,
  );
}

function todayStart(): Date {
  return midnightEastern(easternDateStr());
}

function daysAgo(n: number): Date {
  // Subtract days from today's Eastern date (not from UTC)
  const todayStr = easternDateStr();
  const d = new Date(todayStr + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return midnightEastern(d.toISOString().split("T")[0]);
}

// ── Queries ────────────────────────────────────────────────────────

export async function getKpiMetrics(): Promise<KpiMetrics> {
  const today = todayStart();
  const yesterday = daysAgo(1);
  const weekAgo = daysAgo(7);
  const twoWeeksAgo = daysAgo(14);

  const [
    [totalLearnersRow],
    [loginsTodayRow],
    [loginsYesterdayRow],
    [loginsThisWeekRow],
    [loginsPrevWeekRow],
    [totalEventsRow],
  ] = await Promise.all([
    db.select({ value: countDistinct(learners.id) }).from(learners),
    db
      .select({ value: count() })
      .from(loginEvents)
      .where(gte(loginEvents.loggedInAt, today)),
    db
      .select({ value: count() })
      .from(loginEvents)
      .where(
        and(
          gte(loginEvents.loggedInAt, yesterday),
          sql`${loginEvents.loggedInAt} < ${today.toISOString()}`,
        ),
      ),
    db
      .select({ value: count() })
      .from(loginEvents)
      .where(gte(loginEvents.loggedInAt, weekAgo)),
    db
      .select({ value: count() })
      .from(loginEvents)
      .where(
        and(
          gte(loginEvents.loggedInAt, twoWeeksAgo),
          sql`${loginEvents.loggedInAt} < ${weekAgo.toISOString()}`,
        ),
      ),
    db.select({ value: count() }).from(learningEvents),
  ]);

  const loginsToday = loginsTodayRow.value;
  const loginsYesterday = loginsYesterdayRow.value;
  const loginsThisWeek = loginsThisWeekRow.value;
  const loginsPrevWeek = loginsPrevWeekRow.value;

  return {
    totalLearners: totalLearnersRow.value,
    loginsToday,
    loginsThisWeek,
    totalEvents: totalEventsRow.value,
    loginsTodayChange:
      loginsYesterday > 0
        ? Math.round(((loginsToday - loginsYesterday) / loginsYesterday) * 100)
        : null,
    loginsWeekChange:
      loginsPrevWeek > 0
        ? Math.round(
            ((loginsThisWeek - loginsPrevWeek) / loginsPrevWeek) * 100,
          )
        : null,
  };
}

export async function getTimeSeries(days: number): Promise<TimeSeriesPoint[]> {
  const since = daysAgo(days);

  const dateSql = (col: AnyColumn) =>
    sql`date(${col} AT TIME ZONE ${TZ})`;

  const [loginRows, eventRows] = await Promise.all([
    db
      .select({
        date: sql<string>`${dateSql(loginEvents.loggedInAt)}`,
        count: count(),
      })
      .from(loginEvents)
      .where(gte(loginEvents.loggedInAt, since))
      .groupBy(dateSql(loginEvents.loggedInAt))
      .orderBy(dateSql(loginEvents.loggedInAt)),
    db
      .select({
        date: sql<string>`${dateSql(learningEvents.occurredAt)}`,
        count: count(),
      })
      .from(learningEvents)
      .where(gte(learningEvents.occurredAt, since))
      .groupBy(dateSql(learningEvents.occurredAt))
      .orderBy(dateSql(learningEvents.occurredAt)),
  ]);

  const loginMap = new Map(loginRows.map((r) => [r.date, r.count]));
  const eventMap = new Map(eventRows.map((r) => [r.date, r.count]));

  // Fill every day in range (Eastern dates)
  const result: TimeSeriesPoint[] = [];
  const startStr = easternDateStr(since);
  const endStr = easternDateStr();
  const cursor = new Date(startStr + "T12:00:00Z");
  const end = new Date(endStr + "T12:00:00Z");

  while (cursor <= end) {
    const dateStr = cursor.toISOString().split("T")[0];
    result.push({
      date: dateStr,
      logins: loginMap.get(dateStr) ?? 0,
      events: eventMap.get(dateStr) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return result;
}

export async function getActiveLearners(): Promise<ActiveLearner[]> {
  const today = todayStart();

  const rows = await db
    .selectDistinctOn([loginEvents.learnerId], {
      id: learners.id,
      name: learners.name,
      email: learners.email,
      providerId: learners.providerId,
      appName: apps.name,
      lastLogin: loginEvents.loggedInAt,
    })
    .from(loginEvents)
    .innerJoin(learners, eq(loginEvents.learnerId, learners.id))
    .innerJoin(apps, eq(loginEvents.appId, apps.id))
    .where(gte(loginEvents.loggedInAt, today))
    .orderBy(loginEvents.learnerId, desc(loginEvents.loggedInAt));

  return rows.map((r) => ({
    ...r,
    lastLogin: r.lastLogin.toISOString(),
  }));
}

export async function getAppBreakdowns(): Promise<AppBreakdown[]> {
  const today = todayStart();
  const weekAgo = daysAgo(7);

  const allApps = await db
    .select()
    .from(apps)
    .where(eq(apps.isActive, true));

  const breakdowns = await Promise.all(
    allApps.map(async (app) => {
      const [
        [totalLearnersRow],
        [loginsTodayRow],
        [loginsWeekRow],
        [totalEventsRow],
        eventTypeRows,
      ] = await Promise.all([
        db
          .select({ value: countDistinct(loginEvents.learnerId) })
          .from(loginEvents)
          .where(eq(loginEvents.appId, app.id)),
        db
          .select({ value: count() })
          .from(loginEvents)
          .where(
            and(eq(loginEvents.appId, app.id), gte(loginEvents.loggedInAt, today)),
          ),
        db
          .select({ value: count() })
          .from(loginEvents)
          .where(
            and(
              eq(loginEvents.appId, app.id),
              gte(loginEvents.loggedInAt, weekAgo),
            ),
          ),
        db
          .select({ value: count() })
          .from(learningEvents)
          .where(eq(learningEvents.appId, app.id)),
        db
          .select({
            eventType: learningEvents.eventType,
            count: count(),
          })
          .from(learningEvents)
          .where(eq(learningEvents.appId, app.id))
          .groupBy(learningEvents.eventType),
      ]);

      const eventTypes: Record<string, number> = {};
      for (const row of eventTypeRows) {
        eventTypes[row.eventType] = row.count;
      }

      return {
        appId: app.id,
        appName: app.name,
        description: app.description,
        totalLearners: totalLearnersRow.value,
        loginsToday: loginsTodayRow.value,
        loginsThisWeek: loginsWeekRow.value,
        totalEvents: totalEventsRow.value,
        eventTypes,
      };
    }),
  );

  return breakdowns;
}
