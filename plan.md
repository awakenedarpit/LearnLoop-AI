# LearnLoop AI — Implementation & Design Plan

**Status:** Phase 1 student-learning MVP is implemented and verified locally. The first source/docs milestone is ready for its user-approved public GitHub push. Teacher assessments, production identity/auth, cloud persistence, Gemini, and deployment remain incomplete. Supabase project provisioning is blocked by the selected organization's active-project free-tier limit.

## Product and delivery scope

LearnLoop AI is an Education-track prototype for Team Data Alchemists at HackOverflow 10.0 — Aarohan, NIT Durgapur. Its tagline is “From Learning Gaps to Lasting Growth.” The product joins personalized student learning and meaningful assessment through **Diagnose → Understand → Practice → Reassess → Track Improvement**. The attached requirements remain the source of truth; unimplemented features are clearly identified below and in `TODO.md`.

The student Python Fundamentals loop is now functional in explicitly labelled local demo mode. Teacher authoring/assessments, role-based production auth, cloud Supabase persistence/RLS, live Gemini, and production deployment are still future work. Each meaningful verified milestone will be tested, documented, committed and pushed to the user-approved public repository. Failed or unavailable checks will be reported honestly. No secrets or real student data enter Git.

## Implementation approach

- **Application:** Next.js App Router, TypeScript, Tailwind CSS, accessible reusable UI components and a server listener on port 3000. The complete page route manifest is served at `/manus-routes.json`.
- **Current persistence boundary:** `lib/services/learning.ts` separates learning workflows from `lib/db/demo-store.ts`. In local development, fictional demo records and answers are persisted server-side using Node's built-in `node:sqlite` (`DatabaseSync`) under `data/`. The pinned Node 22.13 runtime marks this module experimental. This local database is not shared production storage; demo mode is disabled in `NODE_ENV=production`. Browser storage is not authoritative for saved answers.
- **Cloud target (blocked):** Supabase Auth/PostgreSQL/RLS through `@supabase/ssr` and `@supabase/supabase-js`, after a dedicated project is available. Project creation was rejected because the selected organization had reached its two-active-project free-tier limit. **No LearnLoop project was created, and no existing project was changed.** Re-check project availability and current cost before retrying after the user resolves the limit.
- **AI target (not live):** Gemini server-only routes with a protected `GEMINI_API_KEY`, schema validation and curated fallbacks. No key is configured and no live request has been made. Official references: [Gemini key security](https://ai.google.dev/gemini-api/docs/api-key), [text generation](https://ai.google.dev/gemini-api/docs/text-generation), [Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview).
- **Supabase security target:** validated server claims, trusted role records, RLS enabled on every exposed table, least-privilege grants and role-scoped tests. Official references: [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- **Learn:** Python concepts are variables, data types, conditionals, loops, functions and lists. Actual answers drive session scores, concept gaps and recommendations. Targeted practice and reassessment choose fresh variants where available; comparisons are linked to the actual diagnostic. Mastery is an indicator, not definitive ability.
- **Assess (not yet implemented):** teacher-created/AI-assisted quizzes; authorized classes and assignments; timed student assessments; continuous server autosave, deadline finalization, review, reports, analytics and CSV. Assess routes, roles and permissions must be server-side; focus/fullscreen events are reviewable signals only.
- **Deployment:** Keep source Vercel-compatible, but do not claim a deployment URL unless a real deployment succeeds.

## Product design

- **Design movement:** Contemporary editorial learning console: calm, precise and human, borrowing Swiss information-design clarity without a generic admin template.
- **Core principles:** (1) Make the next learning action obvious. (2) Show evidence and saved state rather than decorative metrics. (3) Keep assessments focused and distraction-light. (4) Make accessibility/responsiveness foundational.
- **Color philosophy:** Warm paper/soft neutral surfaces reduce fatigue; deep ink preserves legibility; blue signals trustworthy progress and lavender marks reflection/help. Use green/amber/red only for meaningful states.
- **Layout paradigm:** A compact persistent navigation rail frames a wide task-focused workspace. On small screens, collapse navigation and stack the active task before supporting context; avoid an all-cards dashboard grid.
- **Signature elements:** Continuous loop/checkpoint motif; concept chips tied to evidence; visible saved/submitted state markers.
- **Interaction and animation:** Progressive disclosure for hints/explanations; direct feedback; clear saved/unsaved distinction. Use restrained transitions, avoid distraction during timed work, honor reduced-motion.
- **Typography:** Manrope for display/section headings, Inter for body/interface, with system fallbacks and a compact high-legibility assessment scale.
- **Brand essence:** A learning workspace that turns a real concept gap into a visible next step; **encouraging, precise, curious**.
- **Brand voice:** Clear, supportive, non-judgmental. “Find the next concept to unlock.” “Your answer is saved; your score becomes final when you submit.”
- **Wordmark/logo concept:** A custom double-loop “LL” mark with a checkpoint point, paired with the LearnLoop name; signature blue-violet.

## Project structure

```text
app/                    Implemented Next.js pages, API handlers, layout, loading/error states
components/             Implemented app shell, learner dashboard, launchers and quiz session
lib/learning/            Concept catalog and pure scoring logic
lib/db/                  Fictional local Node SQLite demo store; Supabase adapter pending
lib/services/            Implemented learning workflow/scoring/progress service
features/assess/         Planned quiz authoring, attempts, teacher review and analytics
lib/auth/                Planned Supabase identity/role checks
lib/ai/                  Planned Gemini client/schema/fallback integration
supabase/migrations/     Planned PostgreSQL schema and RLS policies
supabase/tests/          Planned database policy tests; require a dedicated project
scripts/                 Local reset and integration-verification helpers
public/                  Brand mark and route manifest
app/api/learn/            Implemented local learning endpoints
 tests/                  Deterministic unit tests; HTTP integration verifier
 docs/                    Product, architecture, schema, API, security, test and demo docs
 tasks/                   Backlog and dated progress handoffs
```

Adjust structure only when actual tooling or a verified environment constraint requires it; record changes in `docs/DECISIONS.md`.

## Ordered implementation phases

1. **Phase 0 — Foundation:** project docs/memory/backlog; public repository setup; server/toolchain/diagnostics; route manifest; responsive shell and honest system states. The app/source/docs are verified; the first public remote push is pending.
2. **Phase 1 — Student learning MVP — DONE:** Python diagnostics, six-concept scoring/gaps, confidence capture, curated explanations/hints, gap-targeted unseen practice, fresh reassessment, actual linked score comparison, progress/history, server-side saved answers. `pnpm typecheck`, four unit tests, `pnpm lint`, `pnpm build` and the eight-page HTTP student-flow integration run passed.
3. **Phase 2 — Teacher assessment MVP — NEXT:** teacher quiz authoring/review/publish and class assignment; student timed test, server-backed autosave/recovery, deadlines, idempotent finalization/scoring, individual review, access-denial and integrity records. Keep demo identity distinct from real production auth.
4. **Phase 3 — AI and analytics:** Gemini server route only when a protected key exists; validate teacher-editable AI drafts/fallbacks; class/question/concept/individual analytics, CSV and printable reports. No AI/provider call or analytics is presently implemented.
5. **Phase 4 — Hardening and deployment:** after the Supabase quota is resolved, create/configure the dedicated project, apply migrations, inspect RLS/security advisories and role boundaries. Test timeout/refresh/idempotency/reporting, document and rehearse the full fictional-data demo, prepare/deploy only with actual verification.

## Repository and session notes

The user-approved public repository is [awakenedarpit/LearnLoop-AI](https://github.com/awakenedarpit/LearnLoop-AI). The initialized Webdev project is `/home/ubuntu/learnloop`, branch `main`, with a Manus-managed `origin`. Preserve `origin`; add the GitHub repository as a separate `github` remote only after verifying current Git state. The initial managed scaffold is `f594498`. Supabase provisioning is blocked by the organization's two-active-project free-tier limit. Gemini credentials are not configured; never request them in chat or place them in files.

## Delivery and verification discipline

Maintain `AGENTS.md`, `MEMORY.md`, `CHANGELOG.md`, `.gitignore`, `.env.example`, all project docs and tasks. On each new session read project memory/status first and inspect source and Git changes. Mark implementation tasks `DONE` only with behavior and verification evidence. For each milestone run relevant checks, inspect diffs, update docs, commit, push to the managed origin and user-approved GitHub mirror, verify remote refs/SHA, and record the result. Never force-push, commit secrets or real learner data, overwrite unrelated work, or claim an unverified push.
