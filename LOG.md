# LIL Development Log

## 2026-01-31 — shadcn/ui Dashboard

### What changed

Replaced the inline-styled `dashboard.astro` page with a full shadcn/ui React dashboard.

**New stack added**: React 19, Tailwind CSS v4, shadcn/ui, Recharts, TanStack React Table.

**New files**:
- `src/styles/globals.css` — Tailwind v4 + shadcn CSS variables (scoped to dashboard only)
- `src/lib/utils.ts` — `cn()` utility
- `src/lib/db/dashboard-queries.ts` — four query functions for dashboard data
- `src/components/ui/` — shadcn components (card, chart, table, badge, button, separator, tooltip)
- `src/components/dashboard/` — dashboard-specific components:
  - `DashboardShell.tsx` — root layout with collapsible sidebar (Overview / Learners / Apps)
  - `MetricCards.tsx` — 4 KPI cards with trend indicators (% change vs previous period)
  - `ActivityChart.tsx` — 30-day area chart of daily logins + learning events
  - `ActiveLearnersTable.tsx` — sortable, paginated table of today's active learners
  - `AppBreakdownCards.tsx` — per-app stat cards with event type badges

**Architecture**: Single React island (`DashboardShell`) rendered via `client:load`. Astro frontmatter queries the DB server-side with Drizzle, passes serialized props to the island. No API auth needed (middleware skips non-`/api/` routes).

### Timezone anchoring

All "today" and "this week" boundaries are anchored to **US Eastern (America/New_York)**, not server UTC. This affects KPI metrics, the active learners table, and the time-series chart date bucketing.

Implementation: `midnightEastern()` helper computes the UTC instant corresponding to midnight Eastern for a given date, using `Intl.DateTimeFormat` to detect the DST offset. SQL `date()` calls use `AT TIME ZONE 'America/New_York'` via `sql.raw()` to avoid Drizzle parameterization issues with GROUP BY.

### Gotcha: Drizzle `sql` templates and GROUP BY

Drizzle's `sql` tag parameterizes every `${value}`. If you create a `sql` expression with a parameterized value and use it in both SELECT and GROUP BY, PostgreSQL may see different `$N` placeholders and reject the query. Fix: use `sql.raw()` for constant literals (like timezone names) so they're inlined into the SQL string.

### Commits

- `fe7bfbe` — Replace inline-styled dashboard with shadcn/ui React dashboard
- `1f4f2eb` — Anchor dashboard day boundaries to US Eastern timezone
- `2d56d7f` — Fix: Reuse SQL expression instances in time-series GROUP BY
- `ccc95c9` — Fix: Use sql.raw() for timezone literal in GROUP BY expressions
