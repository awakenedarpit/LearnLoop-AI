# Security — LearnLoop AI

## Current status

The dedicated `LearnLoop` Supabase project (`rlglcgtamqwqzmkitdtn`, `ap-south-1`) is provisioned in the user-approved `RajArpit` organization. Three migrations were applied. Live inspection confirmed 14/14 public application tables have RLS enabled; default API grants were revoked and restored from a least-privilege allowlist; students cannot directly update attempt lifecycle/results or write/delete submissions; and a miscorrelated class/quiz policy was corrected. Assessment API handlers now use a validated Supabase Auth user plus an organization-membership role in cloud mode. Internal security-definer authorization and auth-trigger functions reside in the non-exposed `private` schema. The only Supabase security-advisor warning is the intentional signed-in-only `public.get_assigned_quiz` DTO RPC, which emits quiz content without answer keys/explanations after checking assignment and availability ([advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)).

**This is not production-ready authentication or persistence.** Assessment and learning service implementations still call the fictional SQLite demo adapter; cloud API handlers can authorize a role but do not yet load/save records through Postgres. Allowed/denied role-scoped RLS tests, trusted organization/class membership management, initial-admin bootstrap, email delivery/redirect verification, end-to-end cloud attempts/scoring, and deployed environment configuration remain unverified. Local demo routes continue to use one fixed fictional identity; integration checks verified the local student flow only. No Gemini key is configured.

## Identity and authorization

Cloud-mode assessment route gates validate Supabase Auth with `auth.getUser()` and resolve roles from trusted `organization_memberships` rows. Never accept a client-supplied `role`, `student_id`, class ownership or teacher authorization at face value. These role gates do not yet make underlying demo-backed services production-secure or implement tenant-scoped data operations; do not enable them for real learner data. Each future cloud handler must check identity, tenant, class membership, quiz assignment, attempt owner, and lifecycle before accessing data. The database RLS policy must repeat the intended row boundary. Students must not access another student's private results or unreleased answer keys. Teachers must see only authorized class data. Organization admins must remain organization-scoped.

Demo-mode access is explicit and fictional, never a substitute for real sign-in. Disable demo identity switching when running in production. A visible demo banner identifies local data/auth and instructs users not to enter real learner records.

## Assessment integrity and privacy

The server owns the authoritative attempt, latest successfully saved answer, deadline, scoring and final state. A browser's unsaved local changes are never treated as saved. Expired attempts reject late saves and finalize from latest successful server saves; duplicate finalization cannot create duplicate scoring; finalized answers cannot change. If policy terminates an attempt, persist latest saved answers and the reason. A denied pre-start access is an access-denial event, not a fake attempt. Focus/fullscreen events are reviewable integrity signals and not proof of cheating. Record only minimal event metadata and avoid unnecessary surveillance.

Correct answers and answer explanations are stored server-side and are returned only when the configured release policy permits. Never serialize answer keys into public route data, static HTML, browser bundles or logs.

## Database/RLS

All 14 current public application tables have RLS enabled, with grants constrained by the corrective migrations. Live catalog checks verified table flags, grants, migration records, and corrected policy expressions; **they did not simulate allowed and denied student/teacher sessions**, so effective row-level behavior is not yet verified. Initial admin/membership provisioning and protected score finalization are not implemented. Do not use a service-role key in client code; do not run migrations or test writes against unrelated existing projects.

## Secrets and AI

`GEMINI_API_KEY`, Supabase privileged credentials, passwords, signing keys and `.env` values are secret. Use protected configuration input and runtime environment variables; never request secrets in chat or place them in Git, docs, browser code, screenshots or logs. `.env.example` includes names and blank safe placeholders only. AI inputs are bounded to necessary content; outputs are validated; generated teacher quizzes remain untrusted drafts and cannot publish themselves. On missing/failed AI, use curated fallback or a safe error.

## Transport, errors, and logs

Use relative browser-facing URLs in Preview. Do not use frame-denying headers that break the embedded Preview. Do not leak stack traces, provider response bodies, hidden answers, auth cookies or tokens in errors/logs. Apply no-store/private caching to authenticated responses; never cache private assessment state as shared public content.

## Setup blocker and residual risk

A local SQLite demo may persist fictional test answers on the server, but it lacks production-grade shared hosting, account identity and cloud/RLS guarantees. Do not use real student or organization data. Before public release, implement cloud repositories and atomic server-side scoring/finalization, create trusted membership/admin provisioning, verify allowed and denied authorization tests, configure email/Auth URLs and deployment secrets, provide the Gemini key only through protected server configuration, and complete deployment verification.

 
## Supabase auth foundation follow-up

The auth scaffold includes server/browser clients, session-refresh proxy, email magic-link page/callback, and `GET /api/auth/me`. Three migrations are live, including profiles/organization and class memberships, quiz/assignment/attempt persistence, access-denial/integrity-event storage, RLS, minimal grants, and a key-free student quiz DTO. The `profiles` table intentionally has no role column; `lib/auth/guards.ts` resolves roles from organization membership. Assessment API routes invoke role guards in cloud mode. **The database has no users/data, there is no admin bootstrap or organization/class management API, app services remain SQLite-only, and RLS session behavior/cloud persistence are not verified.**
