# Vercel deployment

## Current status

The application remains a **fictional disposable demo**, not a production multi-user service. The intended Supabase project/schema exists, but app services remain SQLite-backed; authenticated RLS behavior tests have not passed and migration 004 source is not yet restored into the repository.

A PR preview for commit `bf00ef57288f7222a16f15335baf57e4b2714f46` completed successfully on Vercel project `learn-loop-ai` in `READY` state. Preview: [learn-loop-ai preview](https://learn-loop-6vy56fpsw-wprofile2007-8440.vercel.app). Vercel Authentication protects it. Unauthenticated requests to `/`, `/api/health`, `/manus-routes.json`, `/student/quizzes`, and `/teacher` returned HTTP 302 to Vercel Authentication. The configured Vercel connector's attempt to fetch via a temporary deployment-scoped auth bypass was denied (403; connector not authorized for that Vercel project/team). Therefore **the deployment build is verified ready, but deployed runtime behavior was not smoke-tested**. No production promotion was made.

## Demo deployment configuration

The demo adapter uses Node's built-in `node:sqlite`. Vercel functions are ephemeral and may run in multiple instances, so use in-memory storage for this demo. Data may disappear on cold starts, and different instances may show different sessions. Use fictional data only.

1. Import `https://github.com/awakenedarpit/LearnLoop-AI` into Vercel.
2. Keep framework as Next.js and root directory as repository root.
3. For a demo-only deployment, set the following for Production, Preview and Development:
   - `DEMO_MODE=true`
   - `DEMO_DB_PATH=:memory:`
4. Deploy. The repository pins Node 22.x and pnpm 11.x and includes `pnpm-lock.yaml`.
5. Check homepage and `/api/health`; the expected fictional-demo response is `{"status":"ok","mode":"local_demo"}`. If Vercel Authentication is enabled, perform this through an authorized account.

## Environment variables

- `DEMO_MODE=true`: enables the fictional demo adapter in a production runtime.
- `DEMO_DB_PATH=:memory:`: keeps SQLite in memory instead of writing to the deployment filesystem.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: do not enable cloud sign-in for learner data until migrations are reconciled, app repositories/trusted membership provisioning are implemented, and authenticated policy tests pass.
- `GEMINI_API_KEY`: not needed for the demo; live Gemini calls are not implemented.

Never store real learner data or secrets in the demo. Do not describe this configuration as production-ready persistence or authentication. Production deployment/promotion should follow the production Supabase auth, migrations/RLS, cloud persistence adapter, authorization tests and explicit release review.
