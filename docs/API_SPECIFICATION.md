# API Specification — LearnLoop AI

**Status:** Local demo health/learning route handlers are implemented and exercised by `scripts/verify-learning-flow.mjs`. Supabase authentication, teacher, timed assessment, report, and Gemini route contracts below remain planned until those features exist. Page paths are separately synchronized with `public/manus-routes.json`.

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
| `GET /api/teacher/quizzes` | Authorized teacher | Teacher's quizzes/drafts. |
| `POST /api/teacher/quizzes` | Authorized teacher | Validated draft creation; protected answer keys remain server-side. |
| `PATCH /api/teacher/quizzes/:id` | Owning/authorized teacher | Edit draft; reject changes to published/active records according to lifecycle. |
| `POST /api/teacher/quizzes/:id/ai-draft` | Authorized teacher | Validated request to Gemini; returns editable draft, never publishes. Uses fallback/error if key unavailable. |
| `POST /api/teacher/quizzes/:id/publish` | Authorized teacher | Validates quiz, availability and authorized class assignments; changes status. |
| `GET /api/teacher/assessments/:id/submissions` | Teacher authorized for assigned class | Filtered submission/denial/integrity summaries for that assessment. |
| `GET /api/teacher/analytics` | Teacher authorized for selected class/assessment | Real aggregate metrics, question correctness and concept gaps. |
| `GET /api/teacher/reports/:id.csv` | Authorized teacher | CSV for authorized assessment and class records; safe escaping. |
| `GET /api/teacher/reports/:id/print` | Authorized teacher | Print-friendly report based on the same authorized data. |

## Lifecycle and errors

Quiz states: `draft → published → archived`; attempt states: `in_progress → submitted|expired|terminated`. State transitions are server-owned. Attempt deadlines are computed/stored server-side. Expired attempt finalization uses latest successful saved answers. Finalization must be idempotent, with one score/submission per attempt. Late answer saves and all answer modifications after finalization are rejected. A pre-start denial is logged distinctly and creates no attempt/submission. Only authorized teachers can read class/submission/review routes, and students cannot access another student's records.

## Supabase/Gemini mode boundaries

When Supabase is unavailable, demo routes use the explicitly labelled local server-side adapter; this does not confer production auth or cloud sync. Production Supabase auth/RLS and Gemini behavior remain unverified until the provider resources are configured and tests are run. Secrets are never accepted in route payloads.

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
