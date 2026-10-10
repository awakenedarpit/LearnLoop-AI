# Vercel deployment

## Scope

This configuration deploys the current LearnLoop student-learning prototype as a **disposable demo**, not a production multi-user service. Production authentication, Supabase migrations/RLS, and a cloud persistence adapter are not implemented.

The app's demo adapter uses Node's built-in `node:sqlite`. Vercel functions are ephemeral and may run in multiple instances, so use in-memory storage for this demo. Data may disappear on cold starts, and different instances may show different sessions. Use fictional data only.

## Deploy

1. Import `https://github.com/awakenedarpit/LearnLoop-AI` into Vercel.
2. Keep the framework as Next.js and the root directory as the repository root.
3. Set these environment variables in Vercel for Production, Preview, and Development:
   - `DEMO_MODE=true`
   - `DEMO_DB_PATH=:memory:`
4. Deploy. The repository pins Node 22.x and pnpm 10.x and includes `pnpm-lock.yaml`.
5. Check the homepage and `/api/health`. The health response should be `{"status":"ok","mode":"local_demo"}`.

## Environment variables

- `DEMO_MODE=true`: explicitly enables the fictional demo adapter in production runtime.
- `DEMO_DB_PATH=:memory:`: keeps SQLite in memory instead of writing to the deployment filesystem.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: leave unset until a dedicated LearnLoop Supabase project and cloud adapter are ready.
- `GEMINI_API_KEY`: not needed for this demo; live Gemini calls are not implemented.

Never store real learner data or secrets in the demo. Do not describe this configuration as production-ready persistence or authentication. To run a real multi-user service, implement and verify Supabase auth, database migrations/RLS, the cloud persistence adapter, and appropriate authorization tests first.
