# Security — LearnLoop AI

## Current status

No production authentication, multi-user role authorization, or database RLS policies have been implemented. The dedicated Supabase project is unavailable because the selected organization reached its two-active-project free-tier limit. Local demo routes use one fixed fictional student identity, store session answers server-side with Node `node:sqlite`, and clearly label the mode; this is not production authentication. Integration checks verified that active responses omit correct answers, saved answers recover on reload, scores are server-derived, repeat completion is idempotent, and completed answers reject later changes. No Gemini key is configured.

## Identity and authorization

Production identity comes from the validated Supabase Auth session. In Next.js server code, verify signed/verified claims and resolve roles from trusted profile and organization/class membership records. Never accept a client-supplied `role`, `student_id`, class ownership or teacher authorization at face value. Each server handler checks identity, tenant, class membership, quiz assignment, attempt owner, and lifecycle before accessing data. The database RLS policy repeats the intended row boundary. Students cannot access another student's private results or unreleased answer keys. Teachers see only authorized class data. Organization admins remain organization-scoped.

Demo-mode access is explicit and fictional, never a substitute for real sign-in. Disable demo identity switching when running in production. A visible demo banner identifies local data/auth and instructs users not to enter real learner records.

## Assessment integrity and privacy

The server owns the authoritative attempt, latest successfully saved answer, deadline, scoring and final state. A browser's unsaved local changes are never treated as saved. Expired attempts reject late saves and finalize from latest successful server saves; duplicate finalization cannot create duplicate scoring; finalized answers cannot change. If policy terminates an attempt, persist latest saved answers and the reason. A denied pre-start access is an access-denial event, not a fake attempt. Focus/fullscreen events are reviewable integrity signals and not proof of cheating. Record only minimal event metadata and avoid unnecessary surveillance.

Correct answers and answer explanations are stored server-side and are returned only when the configured release policy permits. Never serialize answer keys into public route data, static HTML, browser bundles or logs.

## Database/RLS

Enable RLS on all exposed Supabase tables. Revoke default `anon`/`authenticated` grants that are not needed, grant minimal actions, and write explicit policies for each operation. Test both allowed and denied operations. Do not use a service-role key in client code; keep any privileged secret server-only and avoid it where user-scoped SSR clients suffice. Do not run migrations or test writes against unrelated existing projects.

## Secrets and AI

`GEMINI_API_KEY`, Supabase privileged credentials, passwords, signing keys and `.env` values are secret. Use protected configuration input and runtime environment variables; never request secrets in chat or place them in Git, docs, browser code, screenshots or logs. `.env.example` includes names and blank safe placeholders only. AI inputs are bounded to necessary content; outputs are validated; generated teacher quizzes remain untrusted drafts and cannot publish themselves. On missing/failed AI, use curated fallback or a safe error.

## Transport, errors, and logs

Use relative browser-facing URLs in Preview. Do not use frame-denying headers that break the embedded Preview. Do not leak stack traces, provider response bodies, hidden answers, auth cookies or tokens in errors/logs. Apply no-store/private caching to authenticated responses; never cache private assessment state as shared public content.

## Setup blocker and residual risk

A local SQLite demo may persist fictional test answers on the server, but it lacks production-grade shared hosting, account identity and cloud/RLS guarantees. Do not use real student or organization data. Before public release, configure the dedicated Supabase project and Gemini key, verify authorization and policy tests, set deployment secrets, review provider advisories and document all remaining limitations.
