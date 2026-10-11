# API Specification — LearnLoop AI

**Status (2026-10-11):** Teacher quiz authoring, timed attempts, teacher review/analytics, and CSV export are integrated for fictional SQLite demo mode. In cloud mode, all current teacher/student assessment API handlers now run server-side Supabase Auth and organization-membership role gates. Their underlying data services still use the demo SQLite adapter rather than PostgreSQL, so cloud operations/persistence are not implemented. The database and RLS policy metadata exist, but authenticated allowed/denied RLS tests have not been run. Class/org-admin APIs, access-denial/integrity event workflows, and Gemini are incomplete. Page paths are synchronized with `public/manus-routes.json`.

## Conventions

Same-origin relative requests. JSON responses use `{ "data": ... }` on success and `{ "error": { "code": "...", "message": "..." } }` on failure. Validate inputs with explicit schemas, bound payload sizes, return `401` for unauthenticated access, `403` for unauthorized roles/ownership, `404` for missing/inaccessible resources, `409` for invalid assessment lifecycle or duplicate transition, `422` for invalid input, and safe `5xx` errors without secret/provider detail. Identity and role are derived server-side, never from submitted JSON.

## Planned route contracts

| Method/path | Actor | Contract |
|---|---|---|
| `GET /api/health` | Public | Readiness response; no credentials or private state. |
| `GET /api/session` | Signed in/demo session | Current actor, trusted role and demo/cloud mode; no privileged fields. |
| `GET /api/learn/questions?kind=diagnostic` | Student | Returns eligible MCQs with concept tags and safe options; never returns hidden keys before result release. |
| `POST /api/learn/sessions` | Student | Starts diagnostic/practice/reassessment with eligible question ids; server stores session. |
| `PUT /api/learn/sessions/:id/answers/:questionId` | Owning student | Validated answer/confidence save; persists and returns saved timestamp. |
| `POST /api/learn/sessions/:id/complete` | Owning student | Finalizes learning session and returns actual score/gap summary. |
| `GET /api/learn/progress` | Student | Own learning history, scores, concept indicators and recommendations only. |
| `GET /api/learn/explanations/:questionId` | Student | Curated explanation, optionally enhanced by validated server-side Gemini; never leaks API key. |
| `GET /api/assess/assignments` | Student | Only currently authorized assignments and safe quiz content. |
| `POST /api/assess/attempts` | Assigned student | Starts attempt after server availability/attempt-limit validation; a denial creates a denial record and no attempt. |
| `GET /api/assess/attempts/:id` | Owning student or authorized teacher | Returns lifecycle, latest saved answers and timing, not protected keys before allowed release. |
| `PUT /api/assess/attempts/:id/answers/:questionId` | Owning student | Server-backed autosave; rejects expired/finalized attempts; returns confirmed save timestamp/version. |
| `POST /api/assess/attempts/:id/submit` | Owning student | Idempotent server finalization, score, submitted timestamp. |
| `POST /api/assess/attempts/:id/integrity-events` | Owning student | Accepts bounded known event types; stored as reviewable signal, not adjudication. |
| `GET /api/teacher/quizzes` | Demo-only; no auth yet | List fictional demo quizzes and drafts. Not production-secure until auth/authorization is added. |
| `POST /api/teacher/quizzes` | Demo-only; no auth yet | Validated fictional demo quiz draft creation; answer keys are returned to the teacher UI only by this demo API. Not production-secure until auth/authorization is added. |
| `PATCH /api/teacher/quizzes/:id` | Demo-only; no auth yet | Edit a draft; published quizzes are locked. Ownership is not enforced in this demo-only milestone. |
| `POST /api/teacher/quizzes/:id/ai-draft` | Authorized teacher | Validated request to Gemini; returns editable draft, never publishes. Uses fallback/error if key unavailable. |
| `POST /api/teacher/quizzes/:id/publish` | Demo-only; no auth yet | Changes a saved draft to published and locks editing. Does not create class assignments or deliver quizzes to students. |
| `GET /api/teacher/assessments/:id/submissions` | Teacher authorized for assigned class | Filtered submission/denial/integrity summaries for that assessment. |
| `GET /api/teacher/analytics` | Demo-only; no auth yet | Aggregate quiz counts, submission scores, pass rate, recent submissions and per-question accuracy from fictional SQLite records. No class/individual identity or authorization scope exists yet. |
| `GET /api/teacher/reports/:id.csv` | Authorized teacher | CSV for authorized assessment and class records; safe escaping. |
| `GET /api/teacher/reports/:id/print` | Authorized teacher | Print-friendly report based on the same authorized data. |

## Lifecycle and errors

Quiz states: `draft → published → archived`; attempt states: `in_progress → submitted|expired|terminated`. State transitions are server-owned. Attempt deadlines are computed/stored server-side. Expired attempt finalization uses latest successful saved answers. Finalization must be idempotent, with one score/submission per attempt. Late answer saves and all answer modifications after finalization are rejected. A pre-start denial is logged distinctly and creates no attempt/submission. Only authorized teachers can read class/submission/review routes, and students cannot access another student's records.

## Supabase/Gemini mode boundaries

In explicitly enabled local demo mode, demo routes use the fictional local SQLite adapter without real-user auth; this is not production authentication or cloud sync. In cloud mode, teacher/student assessment routes require `auth.getUser()` plus a trusted organization membership role, but their backing services still attempt demo storage and do not yet provide cloud persistence. Learn APIs are still local-demo-only. Supabase schema/policy catalog checks passed, but session-level RLS behavior is unverified. Gemini is not integrated/live; secrets are never accepted in route payloads.

## Implemented local demo routes

| Method/path | Current behavior | Verified boundary |
|---|---|---|
| `GET /api/health` | Returns readiness and `mode: "local_demo"`. | No secret or database records are returned. |
| `GET /api/learn/sessions?kind=...` | Resumes the current fictional student's active session of a validated learning kind. | Fixed demo identity; not user authentication. |
| `POST /api/learn/sessions` | Creates an eligible diagnostic, gap-targeted practice, or fresh reassessment session; reuses an active session. | Server selects question IDs; private answers/explanations are withheld until completion. |
| `GET /api/learn/sessions/:sessionId` | Returns that demo student's saved session and answer state. | Active responses do not include correct keys/explanations; completed responses may include them. |
| `PUT /api/learn/sessions/:sessionId/answers/:questionId` | Validates the assigned question/option and saves the response/confidence with a server timestamp. | Refresh recovery is tested; rejects an unassigned question or a completed session. |
| `POST /api/learn/sessions/:sessionId/complete` | Finalizes once and calculates score/gaps from stored responses. | Repeat completion preserves the score; later answer writes return `409`. |
| `GET /api/learn/progress` | Returns actual local session history, concept indicators and baseline-linked comparison. | No cloud synchronization; fixed fictional student only. |

These endpoints currently serve only the non-production SQLite demo adapter. They must not be described as authenticated or multi-tenant until Supabase identity and database policies are configured and verified.

## Teacher and student quiz demo routes

| Method/path | Current behavior | Verified boundary |
|---|---|---|
| `GET /api/teacher/quizzes` | Lists fictional teacher-authored quizzes. | Demo adapter only; no teacher authorization. |
| `POST /api/teacher/quizzes` | Validates and creates a draft quiz. | Zod validation; demo storage only. |
| `PUT /api/teacher/quizzes/:quizId` | Updates an editable draft. | Published quizzes are locked. |
| `POST /api/teacher/quizzes/:quizId/publish` | Publishes a quiz draft. | Publishing does not assign a class or authenticate students. |
| `GET /api/student/quizzes` | Lists currently available published quizzes and attempt counts. | Fixed fictional demo student identity. |
| `GET /api/student/quizzes/:quizId` | Returns a published quiz without correct-answer keys or explanations. | Availability windows are checked server-side. |
| `POST /api/student/quizzes/:quizId/attempts` | Grades submitted MCQ answers on the server and returns score plus explanations. | Validates question IDs and option indexes; enforces configured attempt limit. |

Student attempts are stored in the local SQLite demo adapter. No authentication, role authorization or shared cloud persistence is implemented. Use fictional data only; run typecheck, lint, tests, build and preview checks before merging.

 
## Supabase identity scaffold (project configuration required)

| Method/path | Behavior | Boundary |
|---|---|---|
| `GET /api/auth/me` | Returns the signed-in profile role or `data: null`. | Requires configured Supabase environment to return an authenticated profile; response is private/no-store. |
| `GET /auth/callback?code=...` | Exchanges the Supabase email-link code for a session and redirects to a safe same-origin path. | Invalid/missing code returns to sign-in. |
| `POST /auth/session` | Provider-owned browser calls establish password sign-in, signup, email-link, and recovery sessions; the server receives refreshed cookies through Supabase SSR middleware. | Signup never accepts a role or organization; protected API routes still require a trusted membership. |
| `GET /reset-password` | Completes a recovery session by validating the current Supabase user and calling `auth.updateUser({ password })`. | Expired or invalid recovery sessions cannot submit the form. |
| `GET /sign-in` | Sends a Supabase email magic link. | Unavailable until project URL/key and email redirect settings are configured. |

Server auth helpers expose role checks for route handlers. They do not automatically protect every route. The existing quiz routes still use demo SQLite; do not treat the Supabase schema/client scaffold as completed cloud persistence.

## Timed student quiz attempts (fictional SQLite demo)

| Method/path | Behavior | Boundary |
|---|---|---|
| `POST /api/student/quizzes/:quizId/attempts/start` | Starts an attempt or resumes the student's existing active attempt, returning server start/deadline timestamps and saved answers. | Fixed fictional demo identity; configured attempt limit applies. |
| `PATCH /api/student/quizzes/:quizId/attempts/:attemptId` | Validates and persists answer changes. | Rejects unknown question IDs, inactive attempts and expired attempts. |
| `POST /api/student/quizzes/:quizId/attempts` | Finalizes an active attempt and returns graded feedback. | Requires the server-issued attempt ID; after deadline, only previously saved answers are graded. |

The browser countdown is a display and submission trigger only; the server checks the authoritative deadline on save/finalization. The local SQLite adapter is not durable/shared on serverless deployments, and there is still no authenticated student identity. Use fictional data only.


## Teacher analytics demo route (verification pending)

| Method/path | Current behavior | Boundary |
|---|---|---|
| `GET /api/teacher/analytics` | Returns aggregate quiz/submission counts, average/highest scores, a 60% pass-rate indicator, recent finalized attempts and per-question accuracy for the fixed demo student. | Values are calculated from local SQLite attempt records; no fabricated seed analytics are used. No teacher authentication, class membership, multi-learner comparison, or production authorization exists. Empty score metrics are `null` when there are no submissions. |

The `/teacher/analytics` page is a demo-only results view. Do not describe it as a class dashboard or production-secure teacher report until class assignments, trusted identity and server-side authorization are implemented and tested.
