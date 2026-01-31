# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

LIL (Learning Intelligence Layer) is a centralized learning data warehouse service that aggregates learner activity data from multiple learning applications. It's deployed as an independent Astro SSR service on Netlify.

## Commands

```bash
npm run dev          # Start dev server on http://localhost:4321
npm run build        # Production build (SSR via @astrojs/netlify)
npm run typecheck    # Run TypeScript type checking
npm run lint         # Run astro check + eslint
npm run format       # Format code with Prettier

# Database (requires DATABASE_URL)
npm run db:generate  # Generate Drizzle migrations from schema
npm run db:migrate   # Run migrations against DATABASE_URL
npm run db:push      # Push schema directly to database (dev only)
npm run db:studio    # Open Drizzle Studio for database inspection

# Admin scripts
node scripts/register-app.mjs <name> [description]  # Register new app, get API key
node scripts/list-apps.mjs                          # List all registered apps
node scripts/rotate-api-key.mjs <name>              # Rotate an app's API key
```

## Architecture

### Tech Stack

- **Runtime**: Astro 5 SSR with Netlify adapter
- **Database**: PostgreSQL (Neon) with Drizzle ORM
- **Auth**: API key authentication (X-API-Key header)
- **Dashboard UI**: React 19, Tailwind CSS v4, shadcn/ui, Recharts, TanStack React Table

### Key Directories

- `src/pages/api/` - REST API endpoints
  - `events/` - Write endpoints (login, activity, assessment)
  - `learners/` - Read endpoints for learner data
  - `apps/` - Read endpoints for app statistics
  - `health.ts` - Health check endpoint
- `src/pages/dashboard.astro` - Dashboard page (React island with server-side data fetching)
- `src/components/ui/` - shadcn/ui primitives (card, chart, table, badge, button, etc.)
- `src/components/dashboard/` - Dashboard-specific React components
- `src/styles/globals.css` - Tailwind v4 + shadcn CSS variables (only imported by dashboard)
- `src/lib/` - Shared code
  - `db/` - Drizzle schema, client, and dashboard queries
  - `auth/` - API key validation
  - `utils.ts` - cn() utility for Tailwind class merging
- `src/middleware.ts` - API key authentication middleware
- `scripts/` - Admin utilities for app management
- `drizzle/` - Generated SQL migrations

### Data Model

**apps** - Registry of client applications (ai-atelier-pro, etc.)
**learners** - Unified learner registry across all apps (keyed by provider_id)
**login_events** - Login activity from all apps
**learning_events** - Activity/assessment events with flexible payload

### API Endpoints

**Write (POST)**

- `/api/events/login` - Record login event (upserts learner)
- `/api/events/activity` - Record activity completion
- `/api/events/assessment` - Record assessment result

**Read (GET)**

- `/api/learners/:providerId` - Get learner profile + stats
- `/api/learners/:providerId/events` - Get learner's events (filterable)
- `/api/apps/:appId/stats` - Get app aggregate statistics
- `/api/health` - Health check (no auth required)

### Dashboard

The dashboard (`/dashboard`) is a single React island rendered via `client:load`. Astro frontmatter queries the DB server-side with Drizzle and passes serialized JSON props to the `DashboardShell` component. All day boundaries (today, this week, time-series buckets) are anchored to **US Eastern (America/New_York)**.

When writing Drizzle `sql` template expressions used in both SELECT and GROUP BY, use `sql.raw()` for constant literals (e.g. timezone names) to avoid parameterization mismatches.

### Authentication

All endpoints (except health) require `X-API-Key` header with a valid app API key.

## Environment Variables

```
DATABASE_URL=postgresql://user:password@host.neon.tech/lil
```

## Client Integration

Apps integrate with LIL by:

1. Registering via `scripts/register-app.mjs` to get an API key
2. Setting `LIL_API_URL` and `LIL_API_KEY` env vars
3. POSTing events on login and activity completion (fire-and-forget)
