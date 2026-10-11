# LearnLoop AI

**From Learning Gaps to Lasting Growth.**

LearnLoop AI is an Education-track prototype for HackOverflow 10.0 — Aarohan, NIT Durgapur, built by Team Data Alchemists. It connects personalized learning with meaningful assessment through **Diagnose → Understand → Practice → Reassess → Track Improvement**.

> **Current milestone:** The Python Fundamentals learning flow and demo-only teacher assessment workflow pass local unit/HTTP checks using isolated fictional SQLite data. The expanded test verifies authoring, publish, answer-key withholding, autosave/recovery, deadlines, server scoring, idempotence, review, analytics, and CSV formula neutralization. Supabase cloud persistence/RLS and verified real-user authentication remain incomplete; Phase 1 now includes a server-only Gemini integration with safe fallbacks and mocked tests. PR #9 has a Vercel `READY` preview, but Vercel Authentication blocked an authorized smoke test; no production deployment was made. See [`docs/COMPLETION_AUDIT.md`](docs/COMPLETION_AUDIT.md).

## Product scope

- **LearnLoop Learn:** Python Fundamentals diagnostics for variables, data types, conditionals, loops, functions and lists; concept-based feedback; targeted practice; fresh reassessment; evidence-based progress/history.
- **LearnLoop Assess (fictional demo):** teacher quiz authoring/publishing, student timed attempts with SQLite-backed autosave/recovery/deadlines, individual response review, quiz/question analytics, print-friendly review and filtered CSV export. The prototype uses one fictional learner identity; it has no class assignment or production authorization.
- **Intended production roles:** Student, Teacher and Organization Admin, with server-side authorization and PostgreSQL Row Level Security. These are not yet production-ready.

## Technology and data boundary

Next.js App Router 16.4, React 19, TypeScript 5.9, Tailwind CSS 4, Node `>=22.13.0`, pnpm `10.12.1`. The intended cloud target is Supabase Auth/PostgreSQL/RLS; the Google GenAI SDK powers a server-only provider for explanations, recommendations, and teacher-reviewed quiz drafts. The app's only implemented data adapter is fictional local SQLite using Node's experimental `node:sqlite`; local/demo persistence is not shared production storage and may reset or differ across serverless instances. Never enter real learner data in demo mode.

### Supabase project status

The intended LearnLoop project `rlglcgtamqwqzmkitdtn` in `ap-south-1` is now confirmed and healthy. Read-only inspection found four recorded migrations and 14 public application tables with RLS enabled, currently empty. No authenticated-user RLS behavior tests have been run. One recorded live migration, `secure_assessment_attempt_lifecycle`, is missing from the checked-out repository source. Five public assessment RPCs also remain flagged by Security Advisor for authenticated `SECURITY DEFINER` execution; the functions were inspected but warnings remain open pending direct authenticated tests. No live database changes were made in this task. See [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) and [`docs/COMPLETION_AUDIT.md`](docs/COMPLETION_AUDIT.md).

## Local setup

```bash
pnpm install
pnpm dev
```

With no cloud credentials configured, development uses the clearly labelled fictional demo. The local SQLite file is written under `data/` and ignored by Git. Optional local environment configuration may be copied from `.env.example`; keep `.env.local` private and do not add real learner data.

To reset the default local demo data, stop the dev server first, then run:

```bash
pnpm demo:reset
pnpm dev
```

The reset command only removes a database path inside the project’s `data/` directory. Restart the server for the reset to take effect.

## Verification commands

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
pnpm test:integration
```

`pnpm test:integration` starts a temporary Next.js development server with a disposable SQLite database, checks the main page routes and route manifest, and executes the student learning journey and teacher/student assessment lifecycle. The tests use synthetic fictional records and clean up their temporary database. The deadline case advances the test database clock directly to make expiry deterministic; it is not a live cloud/database test. Run when port `3000` is available.

## Current boundaries

- Demo learning and assessment records use local SQLite and one fictional student. This is not multi-user identity, shared cloud storage, or suitable for real student data.
- Supabase auth/client scaffolding and trusted-membership role lookup exist in source, but the project/account configuration used in historical work is unavailable in the current connector session. Application services still use SQLite; no authenticated RLS/persistence journey is verified.
- Class/organization administration, assignment-based eligibility, trusted initial-admin/membership provisioning, access-denial and integrity-event workflows, and cross-user/class isolation remain incomplete.
- Gemini integration is implemented behind `GEMINI_API_KEY`: completed learning answers can request a labeled explanation, recommendations have a bounded provider path, and teacher quiz drafts remain review-only. This checkout has no protected key, so local tests exercise mocked responses and curated fallbacks; no live Gemini request is claimed.
- No Vercel project was found linked to this repository in the current Vercel connector, and no successful deployment is verified.

## Project documentation

Start with [`AGENTS.md`](AGENTS.md), [`MEMORY.md`](MEMORY.md), [`TODO.md`](TODO.md), [`tasks/PROGRESS.md`](tasks/PROGRESS.md), and [`docs/COMPLETION_AUDIT.md`](docs/COMPLETION_AUDIT.md). Product, technical, schema, API, security, testing, demo, decision and known-issue documents are under `docs/`.

## Repository and delivery

Public GitHub project (user-approved): https://github.com/awakenedarpit/LearnLoop-AI. Preserve the managed Git origin and use the authorized GitHub integration for feature branches and pull requests. Do not force-push or commit secrets/local data. A public deployment URL will be added only after a deployment is verified.

## License

No project license has been selected yet. All rights remain with the project owner unless a license is added.
