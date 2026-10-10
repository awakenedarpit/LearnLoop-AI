# Known Issues and Blockers

## Confirmed blockers

- **Supabase project creation is blocked by the organization quota.** On 2026-10-10, creation of a dedicated LearnLoop project was rejected because the selected organization had reached its two-active-project free-tier limit. No LearnLoop project was created and no unrelated project was modified. After the user resolves the limit, re-check quota and current cost before retrying. Cloud synchronization, production Supabase authentication, PostgreSQL persistence, and live RLS remain unavailable/unverified.
- **Gemini API key is not configured.** Current student explanations are curated. Future Gemini routes must use a protected configuration flow; never paste a key into chat or commit it. Do not claim live AI until a protected key is configured and a real provider request succeeds.
- **First GitHub milestone push is pending.** The user-approved repository is public at https://github.com/awakenedarpit/LearnLoop-AI. Preserve managed `origin`; verify/configure a separate `github` remote and push only after final diff/secret checks. Do not claim a pushed commit until refs are confirmed.

## Limitations to revisit

- The student Learn MVP works with one fixed fictional identity and local Node `node:sqlite`; this Node module is experimental in the pinned runtime. The local database is not production-grade shared storage and must not contain real learner data.
- Teacher quiz authoring, timed attempt/autosave code and demo analytics have been added on feature branches but verification is pending. Class assignment, authenticated individual submission review, access-denial/integrity records, printable reports and exports remain unimplemented. Analytics currently cover one fixed fictional learner only.
- No production identity/roles, Supabase migrations/RLS policies/tests, or Gemini calls are available while cloud resources/credentials are missing.
- No production deployment has been attempted; do not present a deployment URL as live.
