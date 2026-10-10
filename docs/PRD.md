# Product Requirements — LearnLoop AI

## Project identity

LearnLoop AI is an Education-track hackathon prototype for Team Data Alchemists at HackOverflow 10.0 — Aarohan, NIT Durgapur. Tagline: **From Learning Gaps to Lasting Growth.** The product vision is an AI-assisted education platform that connects personalized learning with meaningful assessment.

The central cycle is **Diagnose → Understand → Practice → Reassess → Track Improvement**. A student should discover weak concepts, receive targeted explanations, practice relevant questions, reassess using fresh questions, and track actual progress. A teacher should author assessments, manage classes, review student work, analyze performance, and generate useful reports.

## Product goals

1. Make concept-level learning gaps understandable and actionable.
2. Show only evidence-backed progress; never fabricate mastery or improvement.
3. Give teachers safe, reviewable assessment workflows and useful class-level feedback.
4. Keep AI assistance optional, server-side, teacher-reviewed where it drafts questions, and usable with curated fallback explanations.
5. Provide a reproducible fictional-data demo while cloud credentials are unavailable.

## Roles and journeys

### Student

A student enters a Python Fundamentals diagnostic, optionally rates confidence, answers questions, and sees score plus concept gaps. They open explanations and worked examples, practice recommended concepts, then take a reassessment with fresh questions where available. The dashboard shows actual attempts and scores over time. The student can access only assessments assigned to them and feedback/results permitted by the assessment settings. During a timed assessment, the student sees instructions, a countdown, navigation and answer state; successfully saved answers recover after refresh, and submission/finalization happens on the server.

### Teacher

A teacher creates an assessment by adding questions/options, correct answers, explanations and concept tags. They set title/instructions/duration/availability and attempt limit where supported, assign authorized classes, preview/edit/save/publish, then monitor attempts and review individual responses. AI-drafted items remain editable drafts until the teacher publishes. Teacher analytics include class scores, question correctness, concept gaps and individual history. Reports can be printed or exported as CSV.

### Organization Admin

An admin manages organization users and classes, assigns permitted roles, and oversees organization activity. Admin access is organization-bounded and must not be inferred from client-supplied role values.

## Functional requirements

### LearnLoop Learn

- Diagnostic questions are multiple choice and mapped to variables, data types, conditionals, loops, functions, or lists.
- Score and concept gaps come from actual responses; confidence ratings are optional.
- Wrong answers can show beginner-friendly explanations, examples/code and optional hints. Curated explanations remain available if Gemini is missing or failing.
- Practice recommendations are based on recorded gaps, provide feedback, avoid unnecessary repetition and may vary difficulty.
- Reassessment covers previous weak concepts with fresh questions when available. Comparisons use real diagnostic/reassessment scores and concept changes. Unattempted questions are not mastered; improvement is never invented.
- Student history, scores, concept indicators, recommendations, recent sessions and progress are based on actual stored attempts. Estimated mastery is explicitly described as an indicator.

### LearnLoop Assess

- Teacher authoring supports manual questions/options, correct answers, explanations, concept tags, quiz title/instructions/duration/availability, class assignment, attempt limits where supported, preview/edit/save/publish.
- The student test interface supports instructions, countdown, question navigation, answer selection, answered/unanswered status, continuous server autosave, recovery from the latest successful save, and manual submission confirmation.
- The interface visibly distinguishes saved answers from unsaved local edits.
- Server logic validates availability and attempt state, enforces deadlines, finalizes from the latest successfully saved answers, scores on the server, prevents duplicate finalization/scoring and disallows edits after finalization.
- Policy termination finalizes latest saved answers and records its reason. Pre-start denial records access denial, not a fake submission. Focus/fullscreen changes are reviewable signals, not proof of cheating.
- Teacher review includes assessment-specific submissions, question-by-question responses, score/timestamp, unanswered summary, access denials/reasons, integrity events, and filters by assessment/class/student.
- Analytics include class score summaries, clearly defined leaderboards, question correctness rates, concept performance/common gaps and individual history. Reports are printable and CSV-exportable. Teacher sees only authorized data.

## Non-functional requirements

- Responsive desktop/tablet/mobile UI with semantic structure, keyboard operation, visible focus, accessible form labels and reduced-motion support.
- Server-side validation and authorization; database row policies enforce tenant/class/user boundaries.
- Secrets and private answer keys remain server-side. No `.env` secrets or real learner data in Git.
- Attempt data persists server-side; browser storage is never authoritative for an active assessment.
- Deadlines use server time and finalization is idempotent.
- Loading, empty, success, and error states are explicit.
- Local demo mode uses fictional records and clearly states that cloud authentication/sync is not active.

## Acceptance criteria

The product supports the complete student learning loop and the teacher assessment lifecycle described above; stored scores/recommendations/reports match real responses; students cannot access another student's private results or protected answer keys; unauthorized access is denied server-side and at the database layer; expired attempts cannot accept late changes and are finalized from the latest saved responses; duplicate submissions cannot score twice; pre-start denial remains distinct from submission; the demo data is clearly fictional; and product state is never misrepresented.

## MVP boundary and exclusions

The first student MVP centers on Python Fundamentals and the six named concepts. The prototype does not claim general-purpose course authoring, proctoring-grade cheating detection, high-stakes examination certification, real institutional onboarding, production scale, or deployed cloud synchronization before integrations are configured. AI can help explain/draft but does not autonomously publish teacher assessments or make definitive judgments about student ability.
