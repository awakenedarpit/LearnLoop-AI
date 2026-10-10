# Known Issues and Blockers

## Confirmed blockers

- **Supabase project creation is blocked by the organization quota.** On 2026-10-10, creation of a dedicated LearnLoop project was rejected because the selected organization had reached its two-active-project free-tier limit. No LearnLoop project was created and no unrelated project was modified. After the user resolves the limit, re-check quota and current cost before retrying. Cloud synchronization, production Supabase authentication, PostgreSQL persistence, and live RLS remain unavailable/unverified.
- **Gemini API key is not configured.** Current student explanations are curated. Future Gemini routes must use a protected configuration flow; never paste a key into chat or commit it. Do not claim live AI until a protected key is configured and a real provider request succeeds.
- **Managed workspace mirror is not verified here.** The approved public repository has the confirmed main commit `cefae2c777a2d3abcc140af749e46c29a45909fc`. Preserve managed `origin`; do not claim a second remote is synchronized until its refs are checked.

## Limitations to revisit

- The student Learn MVP works with one fixed fictional identity and local Node `node:sqlite`; this Node module is experimental in the pinned runtime. The local database is not production-grade shared storage and must not contain real learner data.
- Teacher quiz authoring, timed attempts/autosave/deadlines, individual demo review, print-friendly review, aggregate/question analytics and filtered CSV export are integrated into `main`. GitHub Actions passed typecheck, lint, unit tests and build on the combined assessment branch; full assessment HTTP integration and browser review remain unverified. Class assignment, authenticated access-denial/integrity records and multi-learner analytics remain unimplemented.
- No production identity/roles, Supabase migrations/RLS policies/tests, or Gemini calls are available while cloud resources/credentials are missing.
- Vercel reported `Deployment rate limited — retry in 24 hours`. No successful production deployment is verified; do not present a deployment URL as live.
