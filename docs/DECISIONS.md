# Architecture and Product Decisions

## Accepted decisions

### Next.js and managed server — 2026-10-10

**Decision:** Use Next.js App Router with TypeScript and Tailwind in the initialized managed Webdev workspace. The project needs server routes for authenticated workflows and protected Gemini calls; server capability is enabled. The managed database was intentionally not enabled because the requested database is Supabase PostgreSQL, not the platform's separate database product.

**Alternatives considered:** A managed MySQL database would not satisfy the explicitly requested Supabase/PostgreSQL/RLS stack. Static-only hosting cannot enforce active-test server persistence/deadlines.

### Supabase project quota and local demo — 2026-10-10

**Decision:** Keep Supabase/PostgreSQL/Auth/RLS as the requested cloud target, but use clearly labelled local SQLite mode with fictional data while a dedicated project is unavailable. Do not use or mutate unrelated existing projects.

**Observed blocker:** Creating a dedicated LearnLoop project was denied because the selected organization reached the free-tier limit of two active projects. No LearnLoop project was created and no existing project changed. After the user resolves the limit, recheck current project quota and cost before retrying.

### Local test data — 2026-10-10

**Decision:** The fallback uses server-side Node built-in `node:sqlite` (`DatabaseSync`), not browser local storage, for active learning answers. Seeded records are fictional; the adapter is disabled in production and does not imply production authentication or cloud synchronization. The module is experimental in the pinned Node 22 runtime.

**Driver adjustment:** `better-sqlite3` was removed after a direct database-open/read probe reproducibly segfaulted in the current environment. Node built-in SQLite create/read/transaction probes, the app build, and a disposable HTTP integration run passed. Do not reintroduce the native package without diagnosing and verifying the binary on the target runtime.

### Gemini API — 2026-10-10

**Decision:** Keep Gemini calls server-side behind a protected `GEMINI_API_KEY`; use curated explanation fallback if unavailable. Google currently labels the Interactions API as recommended for new projects and describes the official JavaScript SDK as `@google/genai`. Generated questions remain teacher-reviewed drafts.

**Official references:**

- Supabase Next.js SSR client/cookies and verified claims: [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client).
- Supabase exposed-table policy/grant guidance: [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Gemini key secrecy and server-side use: [Using Gemini API keys](https://ai.google.dev/gemini-api/docs/api-key).
- Gemini current text generation: [Text generation](https://ai.google.dev/gemini-api/docs/text-generation).
- Gemini Interactions API status and SDK versions: [Interactions API overview](https://ai.google.dev/gemini-api/docs/interactions-overview).

### Git remotes — 2026-10-10

**Decision:** Preserve the initialized managed Git `origin`; add a separate GitHub remote named `github` for the user-approved public repository. Push milestone commits to both without force-push and verify both branch refs. Do not change the canonical provider through a separate platform flow without its required confirmation.

### Visual design — 2026-10-10

**Decision:** Use the user-directed neutral/blue/lavender palette and a calm editorial learning-console layout. Search results were evaluated as reference candidates; no third-party logo/image is selected for reuse. Build a simple ownable double-loop `LL` SVG mark as source-controlled interface artwork. Internal product screens do not need unrelated stock-photo decoration.

## Current unverified items

- Teacher assessments are implemented only as a fictional SQLite demo. Production auth/role authorization, app-to-Postgres persistence, authenticated RLS/RPC behavior tests, Gemini calls, and deployment remain unverified.
- The intended Supabase project now exists and is healthy (`rlglcgtamqwqzmkitdtn`, `ap-south-1`), with four ledger migrations and 14 RLS-enabled public tables. The fourth migration source is missing from the current checkout. Security Advisor reports five authenticated-callable SECURITY DEFINER RPC warnings; direct authenticated tests remain outstanding.
- Gemini key and provider behavior remain unverified.
