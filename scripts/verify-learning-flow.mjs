const baseUrl = (process.env.LEARNLOOP_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text.slice(0, 300) }; }
  return { response, body };
}

async function api(path, options, expectedStatus = 200) {
  const result = await request(path, options);
  assert(result.response.status === expectedStatus, `${options?.method || "GET"} ${path}: expected HTTP ${expectedStatus}, got ${result.response.status}: ${JSON.stringify(result.body)}`);
  return result.body;
}

async function createSession(kind) {
  const body = await api("/api/learn/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind }),
  }, 201);
  assert(body.data?.kind === kind, `Expected a ${kind} session.`);
  const questions = body.data.questions;
  assert(questions.length === 6, `${kind} should contain six questions, got ${questions.length}.`);
  for (const question of questions) {
    assert(!Object.hasOwn(question, "correctOptionId"), "Active session exposed a private correct answer.");
    assert(!Object.hasOwn(question, "explanation"), "Active session exposed a private explanation.");
    assert(typeof question.hint === "string" && question.hint.length > 0, "An active question is missing its safe hint.");
  }
  return body.data;
}

async function answerEveryQuestion(session) {
  for (const question of session.questions) {
    await api(`/api/learn/sessions/${session.id}/answers/${question.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedOptionId: "b", confidence: "somewhat" }),
    });
  }
  const refreshed = await api(`/api/learn/sessions/${session.id}`);
  assert(refreshed.data.answeredCount === session.questions.length, "A refreshed session did not recover every saved answer.");
  assert(refreshed.data.questions.every((question) => question.selectedOptionId === "b"), "Refreshed session answers differ from successful saves.");
  return refreshed.data;
}

async function finishSession(session) {
  const completed = await api(`/api/learn/sessions/${session.id}/complete`, { method: "POST" });
  assert(completed.data.status === "completed", "Session did not transition to completed.");
  assert(completed.data.result, "Completed session did not return a score.");
  const questions = completed.data.questions;
  const expectedCorrect = questions.filter((question) => question.selectedOptionId === question.correctOptionId).length;
  const expectedScore = Math.round((expectedCorrect / questions.length) * 100);
  assert(completed.data.result.correctCount === expectedCorrect, "Server score does not match revealed post-completion answers.");
  assert(completed.data.result.scorePercent === expectedScore, "Server percentage does not match the question-level score.");
  const again = await api(`/api/learn/sessions/${session.id}/complete`, { method: "POST" });
  assert(again.data.result.scorePercent === expectedScore, "Repeated completion changed the score.");
  const lateSave = await request(`/api/learn/sessions/${session.id}/answers/${questions[0].id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedOptionId: "a" }),
  });
  assert(lateSave.response.status === 409, "A completed session accepted a later answer update.");
  return completed.data;
}

async function main() {
  const health = await api("/api/health");
  assert(health.mode === "local_demo", `Expected an explicitly labelled local demo, got ${health.mode}.`);
  const manifest = await api("/manus-routes.json");
  for (const route of ["/", "/learn", "/learn/diagnostic", "/learn/practice", "/learn/reassess", "/learn/history", "/assess", "/teacher"]) {
    assert(manifest.routes.some((entry) => entry.path === route), `Route manifest is missing ${route}.`);
  }
  for (const route of ["/", "/learn", "/learn/diagnostic", "/learn/practice", "/learn/reassess", "/learn/history", "/assess", "/teacher"]) {
    const result = await request(route);
    assert(result.response.status === 200, `${route} should render (got ${result.response.status}).`);
    assert((result.response.headers.get("content-type") || "").includes("text/html"), `${route} did not return HTML.`);
  }

  const diagnostic = await createSession("diagnostic");
  const active = await api(`/api/learn/sessions?kind=diagnostic`);
  assert(active.data.id === diagnostic.id, "Active-session lookup did not resume the diagnostic.");
  const duplicate = await api("/api/learn/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "diagnostic" }),
  });
  assert(duplicate.data.id === diagnostic.id, "Starting again did not reuse the existing active diagnostic.");
  const savedDiagnostic = await answerEveryQuestion(diagnostic);
  const finishedDiagnostic = await finishSession(savedDiagnostic);
  assert(finishedDiagnostic.result.gaps.length === 6, "The all-incorrect baseline should flag all six concepts for practice.");

  const practice = await createSession("practice");
  const diagnosticIds = new Set(diagnostic.questions.map((question) => question.id));
  assert(practice.questions.every((question) => !diagnosticIds.has(question.id)), "Practice reused a diagnostic question.");
  assert(practice.questions.every((question) => finishedDiagnostic.result.gaps.includes(question.concept)), "Practice included a concept outside the identified gaps.");
  const finishedPractice = await finishSession(await answerEveryQuestion(practice));

  const reassessment = await createSession("reassessment");
  const usedIds = new Set([...diagnostic.questions, ...practice.questions].map((question) => question.id));
  assert(reassessment.comparisonSessionId === diagnostic.id, "Reassessment did not link to its actual diagnostic baseline.");
  assert(reassessment.questions.every((question) => !usedIds.has(question.id)), "Reassessment reused a previously attempted question.");
  const finishedReassessment = await finishSession(await answerEveryQuestion(reassessment));
  const baseline = await api(`/api/learn/sessions/${diagnostic.id}`);
  const expectedDelta = finishedReassessment.result.scorePercent - baseline.data.result.scorePercent;
  const progress = await api("/api/learn/progress");
  assert(progress.data.completedSessions === 3, `Expected three completed sessions, got ${progress.data.completedSessions}.`);
  assert(progress.data.scoreChange === expectedDelta, "Dashboard comparison does not match the linked saved attempts.");
  assert(progress.data.recommendedConcepts.length === 6, "Progress did not preserve the diagnostic concept gaps.");

  console.log(JSON.stringify({
    result: "PASS",
    mode: health.mode,
    pages: 8,
    diagnostic: { score: finishedDiagnostic.result.scorePercent, gaps: finishedDiagnostic.result.gaps.length },
    practice: { score: finishedPractice.result.scorePercent, questions: finishedPractice.questions.length },
    reassessment: { score: finishedReassessment.result.scorePercent, linkedBaseline: finishedReassessment.comparisonSessionId, scoreChange: progress.data.scoreChange },
    persistence: "answer recovery, idempotent completion, and post-completion write rejection verified",
  }, null, 2));
}

main().catch((error) => {
  console.error("Learning flow verification failed:", error);
  process.exitCode = 1;
});
