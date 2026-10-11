# Vercel deployment

## Scope

This configuration describes the current LearnLoop prototype as a **fictional disposable demo**, not a production multi-user service. The intended Supabase project and RLS schema exist (14 public tables, four recorded migrations), but application services remain SQLite-backed, authenticated RLS tests have not passed, and one live migration's source is missing from the repository.

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
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: do not enable cloud sign-in for learner data until the missing migration source, app repositories, trusted membership provisioning and authenticated policy tests are resolved.
- `GEMINI_API_KEY`: not needed for this demo; live Gemini calls are not implemented.

Never store real learner data or secrets in the demo. Do not describe this configuration as production-ready persistence or authentication. To run a real multi-user service, implement and verify Supabase auth, database migrations/RLS, the cloud persistence adapter, and appropriate authorization tests first.
